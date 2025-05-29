import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  @ApiOperation({ summary: 'Send a test email' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendTestEmail(@Body() sendTestEmailDto: SendTestEmailDto) {
    const { to, subject, text, templateName, context } = sendTestEmailDto;

    let result: boolean;

    if (templateName) {
      result = await this.emailService.sendTemplateEmail(to, subject, templateName, context || {});
    } else {
      result = await this.emailService.sendEmail(to, subject, text);
    }

    return {
      success: result,
      message: result ? 'Email sent successfully' : 'Failed to send email',
    };
  }
}
