import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VoucherService } from '../../services/voucher.service';
import { VerifyVoucherDto } from '../../dto/verify-voucher.dto';

@ApiTags('Vouchers')
@Controller('vouchers')
export class VoucherClientController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get all active vouchers' })
  getActiveVouchers() {
    return this.voucherService.getActiveVouchers();
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify a voucher code' })
  @ApiResponse({
    status: 200,
    description: 'Returns voucher validity and discount amount',
    schema: {
      example: {
        valid: true,
        voucher: {
          id: '65f2d4a12345678901234567',
          code: 'SUMMER2023',
          name: 'Summer Sale 2023',
          type: 'PERCENTAGE',
          value: 20,
          minOrderValue: 100000,
          maxDiscountValue: 50000,
        },
        discountAmount: 30000,
      },
    },
  })
  verifyVoucher(@Body() verifyVoucherDto: VerifyVoucherDto) {
    return this.voucherService.verifyVoucher(verifyVoucherDto);
  }
}
