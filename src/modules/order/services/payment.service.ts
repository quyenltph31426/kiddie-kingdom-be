import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Order, OrderDocument } from '@/database/schemas/order.schema';
import {
  PaymentHistory,
  PaymentHistoryDocument,
  PaymentStatus,
  PaymentProvider,
} from '@/database/schemas/payment-history.schema';
import { OrderStatus, PAYMENT_METHOD } from '@/shared/enums';
import { EmailService } from '@/modules/email/email.service';
import * as crypto from 'crypto';
import * as querystring from 'querystring';
import * as moment from 'moment';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private vnpayConfig: {
    tmnCode: string;
    hashSecret: string;
    url: string;
    returnUrl: string;
  };
  private frontendUrl: string;

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(PaymentHistory.name) private paymentHistoryModel: Model<PaymentHistoryDocument>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    // Initialize VNPay configuration
    this.vnpayConfig = {
      tmnCode: this.configService.get<string>('VNPAY_TMN_CODE'),
      hashSecret: this.configService.get<string>('VNPAY_HASH_SECRET'),
      url: this.configService.get<string>('VNPAY_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      returnUrl:
        this.configService.get<string>('VNPAY_RETURN_URL') || 'http://localhost:3000/api/payments/vnpay-return',
    };

    if (!this.vnpayConfig.tmnCode || !this.vnpayConfig.hashSecret) {
      this.logger.warn('VNPay configuration not found. VNPay payments will not work.');
    }

    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  async createPaymentSession(orderId: string, userId: string): Promise<any> {
    try {
      // Find the order
      const order = await this.orderModel.findOne({
        _id: new Types.ObjectId(orderId),
        userId: new Types.ObjectId(userId),
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.TO_PAY) {
        throw new BadRequestException('Order is not in a payable state');
      }

      if (order.paymentMethod !== PAYMENT_METHOD.ONLINE_PAYMENT) {
        throw new BadRequestException('Order is not set for online payment');
      }

      // Create VNPay payment URL
      const vnpUrl = await this.createVnpayPaymentUrl(order);

      // Create payment history record
      const transactionId = `${moment().format('YYYYMMDDHHmmss')}_${orderId}`;
      await this.paymentHistoryModel.create({
        userId: order.userId,
        orderId: order._id,
        amount: order.totalAmount,
        currency: 'vnd',
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.VNPAY,
        transactionId: transactionId,
        paymentDetails: {
          orderId: order._id.toString(),
          orderInfo: `Payment for order ${order.orderNumber}`,
        },
      });

      return {
        transactionId: transactionId,
        url: vnpUrl,
      };
    } catch (error) {
      this.logger.error(`Payment session creation failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Payment processing failed: ${error.message}`);
    }
  }

  private async createVnpayPaymentUrl(order: OrderDocument): Promise<string> {
    const tmnCode = this.vnpayConfig.tmnCode;
    const secretKey = this.vnpayConfig.hashSecret;
    const returnUrl = this.vnpayConfig.returnUrl;
    const vnpUrl = this.vnpayConfig.url;

    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    const orderId = `${moment(date).format('YYYYMMDDHHmmss')}_${order._id.toString()}`;
    const amount = Math.round(order.totalAmount * 100); // Convert to smallest currency unit (VND doesn't have decimals)
    const bankCode = ''; // Leave blank for VNPay payment page with all methods
    const orderInfo = `Payment for order ${order.orderNumber}`;
    const orderType = 'billpayment';
    const locale = 'vn';
    const currCode = 'VND';

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: currCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: orderType,
      vnp_Amount: amount,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: '127.0.0.1', // Should be replaced with actual IP in production
      vnp_CreateDate: createDate,
    };

    if (bankCode) {
      vnpParams['vnp_BankCode'] = bankCode;
    }

    // Sort params by key
    const sortedParams = this.sortObject(vnpParams);

    // Create signature
    const signData = Object.entries(sortedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    sortedParams['vnp_SecureHash'] = signed;

    // Return full payment URL
    return `${vnpUrl}?${querystring.stringify(sortedParams)}`;
  }

  private sortObject(obj: any): any {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      if (obj[key] !== null && obj[key] !== undefined) {
        sorted[key] = obj[key];
      }
    }

    return sorted;
  }

  async handleVnpayReturn(query: any): Promise<any> {
    try {
      const vnpParams = { ...query };
      const secureHash = vnpParams['vnp_SecureHash'];

      // Remove hash from params
      delete vnpParams['vnp_SecureHash'];
      delete vnpParams['vnp_SecureHashType'];

      // Sort params
      const sortedParams = this.sortObject(vnpParams);

      // Verify signature
      const signData = querystring.stringify(sortedParams);
      const hmac = crypto.createHmac('sha512', this.vnpayConfig.hashSecret);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      // Check if signature is valid
      if (secureHash !== signed) {
        throw new BadRequestException('Invalid signature');
      }

      // Get transaction reference
      const txnRef = vnpParams['vnp_TxnRef'];
      const orderId = txnRef.split('_')[1]; // Extract order ID from txnRef

      // Get response code
      const responseCode = vnpParams['vnp_ResponseCode'];

      // Find payment history
      const paymentHistory = await this.paymentHistoryModel.findOne({
        orderId: new Types.ObjectId(orderId),
      });

      if (!paymentHistory) {
        throw new NotFoundException('Payment record not found');
      }

      // Update payment history based on response code
      if (responseCode === '00') {
        // Payment successful
        paymentHistory.status = PaymentStatus.COMPLETED;
        paymentHistory.completedAt = new Date();
        paymentHistory.paymentDetails = {
          ...paymentHistory.paymentDetails,
          transactionNo: vnpParams['vnp_TransactionNo'],
          bankCode: vnpParams['vnp_BankCode'],
          cardType: vnpParams['vnp_CardType'],
          payDate: vnpParams['vnp_PayDate'],
        };
        await paymentHistory.save();

        // Update order
        const order = await this.orderModel.findById(orderId);
        if (order) {
          order.status = OrderStatus.COMPLETED;
          order.paidAt = new Date();
          await order.save();

          // Send order confirmation email
          try {
            // Fetch user details and send email
            // This is a placeholder - implement according to your user model
            await this.emailService.sendOrderConfirmationEmail(
              'user@example.com', // Replace with actual user email
              'Customer', // Replace with actual username
              {
                id: order._id.toString(),
                createdAt: order.createdAt,
                items: order.items,
                total: order.totalAmount,
                shippingAddress: order.shippingAddress,
              },
            );
          } catch (emailError) {
            this.logger.error(`Failed to send order confirmation email: ${emailError.message}`);
          }
        }

        // Redirect to success page
        return {
          success: true,
          redirectUrl: `${this.frontendUrl}/payment/success?orderId=${orderId}`,
          message: 'Payment successful',
        };
      } else {
        // Payment failed
        paymentHistory.status = PaymentStatus.FAILED;
        paymentHistory.failureReason = `VNPay error code: ${responseCode}`;
        await paymentHistory.save();

        // Redirect to cancel page
        return {
          success: false,
          redirectUrl: `${this.frontendUrl}/payment/cancel?orderId=${orderId}`,
          message: 'Payment failed',
        };
      }
    } catch (error) {
      this.logger.error(`VNPay return handling failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Payment verification failed: ${error.message}`);
    }
  }

  async handleSuccessRedirect(orderId: string): Promise<any> {
    try {
      // Check if the order has been updated already
      const order = await this.orderModel.findById(orderId);
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Return success response with order details
      return {
        success: true,
        orderId: order._id,
        status: order.status,
        message: 'Payment processed successfully',
      };
    } catch (error) {
      this.logger.error(`Success redirect handling failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Payment verification failed: ${error.message}`);
    }
  }

  async handleCancelRedirect(orderId: string): Promise<any> {
    try {
      const order = await this.orderModel.findById(orderId);
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Return cancel response
      return {
        success: false,
        orderId: order._id,
        status: order.status,
        message: 'Payment was canceled',
      };
    } catch (error) {
      this.logger.error(`Cancel redirect handling failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Cancel handling failed: ${error.message}`);
    }
  }
}
