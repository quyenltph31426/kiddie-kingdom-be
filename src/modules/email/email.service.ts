import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { EmailConfig, EmailConfigName } from '../../config/email.config';

// Define the attachment interface based on nodemailer's structure
interface EmailAttachment {
  filename?: string;
  content?: string | Buffer | NodeJS.ReadableStream;
  path?: string;
  contentType?: string;
  cid?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly emailConfig: EmailConfig;

  constructor(private configService: ConfigService) {
    this.emailConfig = this.configService.get<EmailConfig>(EmailConfigName);
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const { host, port, user, password, secure } = this.emailConfig;

    if (!host || !port || !user || !password) {
      this.logger.warn('Email configuration is incomplete. Email service will not work properly.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: password,
      },
    });

    // Verify connection
    this.transporter
      .verify()
      .then(() => this.logger.log('Email service is ready'))
      .catch((err) => this.logger.error(`Email service error: ${err.message}`));
  }

  /**
   * Compile a Handlebars template with context data
   */
  private async compileTemplate(templateName: string, context: any): Promise<string> {
    try {
      const templatePath = path.join(process.cwd(), 'src/modules/email/templates/', `${templateName}.html`);
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);
      return template(context);
    } catch (error) {
      this.logger.error(`Failed to compile email template: ${error.message}`);
      throw new Error(`Failed to compile email template: ${error.message}`);
    }
  }

  /**
   * Send an email using a template
   */
  async sendTemplateEmail(
    to: string | string[],
    subject: string,
    templateName: string,
    context: any,
    options: {
      cc?: string | string[];
      bcc?: string | string[];
      attachments?: EmailAttachment[];
    } = {},
  ): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initializeTransporter();
        if (!this.transporter) {
          throw new Error('Email transporter not initialized');
        }
      }

      const html = await this.compileTemplate(templateName, context);
      const from = this.emailConfig.from;

      const mailOptions: nodemailer.SendMailOptions = {
        from,
        to,
        subject,
        html,
        ...options,
      } as any;

      this.logger.log(`Sending email from ${from} to ${to} with subject ${subject} using template ${templateName}, `);

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }

  /**
   * Send a simple text email
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    text: string,
    html?: string,
    options: {
      cc?: string | string[];
      bcc?: string | string[];
      attachments?: EmailAttachment[];
    } = {},
  ): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initializeTransporter();
        if (!this.transporter) {
          throw new Error('Email transporter not initialized');
        }
      }

      const from = this.emailConfig.from;

      const mailOptions: nodemailer.SendMailOptions = {
        from,
        to,
        subject,
        text,
        html: html || text,
        ...options,
      } as any;

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }

  /**
   * Send a welcome email to a new user
   */
  async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    const subject = 'Welcome to Our Platform';
    const context = {
      username,
      year: new Date().getFullYear(),
      appName: this.emailConfig.appName,
      loginUrl: `${this.emailConfig.frontendUrl}/login`,
    };

    return this.sendTemplateEmail(email, subject, 'welcome', context);
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(email: string, username: string, token: string): Promise<boolean> {
    const subject = 'Password Reset Request';
    const resetUrl = `${this.emailConfig.frontendUrl}/reset-password?token=${token}`;

    const context = {
      username,
      resetUrl,
      expiryTime: '1 hour',
      year: new Date().getFullYear(),
      appName: this.emailConfig.appName,
    };

    return this.sendTemplateEmail(email, subject, 'password-reset', context);
  }

  /**
   * Send an order confirmation email
   */
  async sendOrderConfirmationEmail(email: string, username: string, order: any): Promise<boolean> {
    const subject = 'Order Confirmation';

    // Register Handlebars helper for multiplication
    handlebars.registerHelper('multiply', function (a, b) {
      return (parseFloat(a) * parseFloat(b)).toFixed(2);
    });

    const context = {
      username,
      orderId: order.orderCode || order.id,
      orderDate: new Date(order.createdAt).toLocaleDateString(),
      items: order.items,
      total: order.total.toFixed(2),
      shippingAddress: order.shippingAddress,
      orderUrl: `${this.emailConfig.frontendUrl}/orders/${order.id}`,
      year: new Date().getFullYear(),
      appName: this.emailConfig.appName,
    };

    return this.sendTemplateEmail(email, subject, 'order-confirmation', context);
  }

  /**
   * Send an email verification email
   */
  async sendVerificationEmail(email: string, username: string, token: string): Promise<boolean> {
    const subject = 'Verify Your Email Address';
    const verificationUrl = `${this.emailConfig.frontendUrl}/verify-email?token=${token}`;

    const context = {
      username,
      verificationUrl,
      expiryTime: '24 hours',
      year: new Date().getFullYear(),
      appName: this.emailConfig.appName,
    };

    return this.sendTemplateEmail(email, subject, 'email-verification', context);
  }
}
