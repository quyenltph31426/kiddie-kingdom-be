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
import { User, UserDocument } from '@/database/schemas/user.schema';
import { PAYMENT_METHOD, ShippingStatus } from '@/shared/enums';
import { EmailService } from '@/modules/email/email.service';
import crypto from 'crypto';
import querystring from 'qs';
import moment from 'moment';

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
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

      if (order.paymentStatus !== PaymentStatus.PENDING) {
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
          orderInfo: `Payment for order ${order.orderCode}`,
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
    const amount = Math.round(order.totalAmount * 100);
    const orderInfo = `Payment for order ${order.orderCode}`;

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'billpayment',
      vnp_Amount: amount.toString(),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const sortedParams = this.sortObject(vnpParams);

    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(signData, 'utf8').digest('hex');

    sortedParams['vnp_SecureHash'] = signed;

    const queryString = querystring.stringify(sortedParams, { encode: false });

    return `${vnpUrl}?${queryString}`;
  }

  private sortObject(obj: any): any {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
    }
    return sorted;
  }

  async handleVnpayReturn(query: any): Promise<any> {
    try {
      this.logger.log(`VNPay return received with params: ${JSON.stringify(query)}`);

      const vnpParams = { ...query };
      const secureHash = vnpParams['vnp_SecureHash'];

      delete vnpParams['vnp_SecureHash'];
      delete vnpParams['vnp_SecureHashType'];

      const sortedParams = this.sortObject(vnpParams);

      const signData = querystring.stringify(sortedParams, { encode: false });

      const hmac = crypto.createHmac('sha512', this.vnpayConfig.hashSecret);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      this.logger.log(`Generated signature: ${signed}`);
      this.logger.log(`Received signature: ${secureHash}`);

      if (secureHash !== signed) {
        throw new BadRequestException('Invalid signature');
      }

      // Get transaction reference
      const txnRef = vnpParams['vnp_TxnRef'];
      if (!txnRef || !txnRef.includes('_')) {
        throw new BadRequestException('Invalid transaction reference format');
      }

      const orderId = txnRef.split('_')[1]; // Extract order ID from txnRef
      this.logger.log(`Processing payment for order ID: ${orderId}`);

      // Get response code
      const responseCode = vnpParams['vnp_ResponseCode'];
      this.logger.log(`VNPay response code: ${responseCode}`);

      // Find payment history
      const paymentHistory = await this.paymentHistoryModel.findOne({
        orderId: new Types.ObjectId(orderId),
      });

      if (!paymentHistory) {
        this.logger.error(`Payment record not found for order ID: ${orderId}`);
        throw new NotFoundException('Payment record not found');
      }

      // Update payment history based on response code
      if (responseCode === '00') {
        // Payment successful
        this.logger.log(`Payment successful for order ID: ${orderId}`);

        // Update payment history
        paymentHistory.status = PaymentStatus.COMPLETED;
        paymentHistory.completedAt = new Date();
        paymentHistory.paymentDetails = {
          ...paymentHistory.paymentDetails,
          transactionNo: vnpParams['vnp_TransactionNo'],
          bankCode: vnpParams['vnp_BankCode'],
          cardType: vnpParams['vnp_CardType'],
          payDate: vnpParams['vnp_PayDate'],
        };

        const savedPaymentHistory = await paymentHistory.save();
        this.logger.log(`Payment history updated: ${JSON.stringify(savedPaymentHistory)}`);

        // Update order
        const order = await this.orderModel.findById(orderId);
        if (!order) {
          this.logger.error(`Order not found for ID: ${orderId}`);
          throw new NotFoundException('Order not found');
        }

        order.paymentStatus = PaymentStatus.COMPLETED;
        order.paidAt = new Date();

        const savedOrder = await order.save();
        this.logger.log(`Order updated: ${JSON.stringify(savedOrder)}`);

        // Get user information for email
        const user = await this.userModel.findById(order.userId);
        const userEmail = user ? user.email : 'user@example.com';
        const userName = user ? user.username : 'Customer';

        // Send confirmation email
        try {
          await this.emailService.sendOrderConfirmationEmail(userEmail, userName, {
            id: order._id.toString(),
            createdAt: order.createdAt,
            items: order.items,
            total: order.totalAmount,
            shippingAddress: order.shippingAddress,
          });
          this.logger.log(`Order confirmation email sent to: ${userEmail}`);
        } catch (emailError) {
          this.logger.error(`Failed to send order confirmation email: ${emailError.message}`);
        }

        // Redirect to success page
        return {
          success: true,
          redirectUrl: `${this.frontendUrl}/orders/${orderId}`,
          message: 'Payment successful',
        };
      } else {
        // Payment failed
        this.logger.log(`Payment failed for order ID: ${orderId} with code: ${responseCode}`);

        paymentHistory.status = PaymentStatus.FAILED;
        paymentHistory.failureReason = `VNPay error code: ${responseCode}`;

        const savedPaymentHistory = await paymentHistory.save();
        this.logger.log(`Payment history updated: ${JSON.stringify(savedPaymentHistory)}`);

        // Update order payment status to FAILED
        const order = await this.orderModel.findById(orderId);
        if (order) {
          order.paymentStatus = PaymentStatus.FAILED;
          order.shippingStatus = ShippingStatus.CANCELED;
          await order.save();
          this.logger.log(`Order status updated to payment failed`);
        }

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
        paymentStatus: order.paymentStatus,
        shippingStatus: order.shippingStatus,
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
        paymentStatus: order.paymentStatus,
        shippingStatus: order.shippingStatus,
        message: 'Payment was canceled',
      };
    } catch (error) {
      this.logger.error(`Cancel redirect handling failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Cancel handling failed: ${error.message}`);
    }
  }

  async processPaymentCallback(paymentData: any): Promise<any> {
    // Extract orderId from paymentData
    const orderId = paymentData.orderId;

    // Update payment history
    const paymentHistory = await this.paymentHistoryModel.findOne({
      orderId: new Types.ObjectId(orderId),
    });

    if (!paymentHistory) {
      this.logger.error(`Payment history not found for order ID: ${orderId}`);
      throw new NotFoundException('Payment history not found');
    }

    paymentHistory.status = PaymentStatus.COMPLETED;
    paymentHistory.transactionData = paymentData;
    paymentHistory.completedAt = new Date();

    const savedPaymentHistory = await paymentHistory.save();
    this.logger.log(`Payment history updated: ${JSON.stringify(savedPaymentHistory)}`);

    // Update order
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      this.logger.error(`Order not found for ID: ${orderId}`);
      throw new NotFoundException('Order not found');
    }

    order.paymentStatus = PaymentStatus.COMPLETED;
    order.paidAt = new Date();

    const savedOrder = await order.save();
    this.logger.log(`Order updated: ${JSON.stringify(savedOrder)}`);

    // Get user information for email
    const user = await this.userModel.findById(order.userId);
    const userEmail = user ? user.email : 'user@example.com';
    const userName = user ? user.username : 'Customer';

    // Send confirmation email
    try {
      await this.emailService.sendOrderConfirmationEmail(userEmail, userName, {
        id: order._id.toString(),
        createdAt: order.createdAt,
        items: order.items,
        total: order.totalAmount,
        shippingAddress: order.shippingAddress,
      });
      this.logger.log(`Order confirmation email sent to: ${userEmail}`);
    } catch (emailError) {
      this.logger.error(`Failed to send order confirmation email: ${emailError.message}`);
    }

    return {
      success: true,
      orderId: order._id,
      message: 'Payment processed successfully',
    };
  }
}
