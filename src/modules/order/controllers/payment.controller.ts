import { Controller, Post, Body, Param, Headers, HttpCode, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Response } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('vnpay-return')
  @Public()
  @ApiOperation({ summary: 'VNPay return URL' })
  async handleVnpayReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentService.handleVnpayReturn(query);
    return res.redirect(result.redirectUrl);
  }

  @Get('success')
  @Public()
  @ApiOperation({ summary: 'Payment success redirect' })
  async handleSuccess(@Query('orderId') orderId: string) {
    return this.paymentService.handleSuccessRedirect(orderId);
  }

  @Get('cancel')
  @Public()
  @ApiOperation({ summary: 'Payment cancel redirect' })
  async handleCancel(@Query('orderId') orderId: string) {
    return this.paymentService.handleCancelRedirect(orderId);
  }
}
