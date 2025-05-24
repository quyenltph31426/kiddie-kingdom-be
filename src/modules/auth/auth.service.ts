import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAuthDto, SignInDto } from './dto/create-auth.dto';
import { User, UserDocument } from '@/database/schemas/user.schema';
import { Hash } from '@/utils/Hash';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthenData } from '@/shared/interfaces/google-authen-data';
import { TokenService } from './token.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
    private tokenService: TokenService,
    private emailService: EmailService,
  ) {}

  async signup(createAuthDto: CreateAuthDto) {
    const { email, password, username } = createAuthDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Generate verification token
    const verificationToken = this.tokenService.generateVerificationToken();
    const verificationTokenExpires = this.tokenService.getTokenExpirationDate(24); // 24 hours

    // Create new user
    const hashedPassword = Hash.make(password);
    const user = await this.userModel.create({
      email,
      username,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpires,
      isEmailVerified: false,
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(email, username, verificationToken);

    // Generate tokens
    const tokens = await this.tokenService.generateAuthTokens(user._id.toString(), user.email);

    return {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
      ...tokens,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async signin(signInDto: SignInDto) {
    const { email, password } = signInDto;

    // Find user
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isPasswordValid = Hash.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    // Generate tokens
    const tokens = await this.tokenService.generateAuthTokens(user._id.toString(), user.email);

    await this.userModel.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
    });

    return {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
      ...tokens,
    };
  }

  async handleGoogleAuth(googleData: GoogleAuthenData) {
    if (!googleData.email_verified) {
      throw new UnauthorizedException('Google email not verified');
    }

    // Find user by email
    let user = await this.userModel.findOne({ email: googleData.email });

    if (user) {
      // Update existing user's Google provider if not present
      const hasGoogleProvider = user.providers.some((p) => p.provider === 'google');
      if (!hasGoogleProvider) {
        user = await this.userModel.findByIdAndUpdate(
          user._id,
          {
            $push: {
              providers: {
                provider: 'google',
                providerId: googleData.email,
              },
            },
            // Mark email as verified since Google already verified it
            isEmailVerified: true,
          },
          { new: true },
        );
      }
    } else {
      // Create new user
      user = await this.userModel.create({
        email: googleData.email,
        username: googleData.name,
        avatar: googleData.picture,
        password: '', // Empty password for Google users
        providers: [
          {
            provider: 'google',
            providerId: googleData.email,
          },
        ],
        isEmailVerified: true, // Mark as verified since Google already verified it
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    // Generate tokens
    const tokens = await this.tokenService.generateAuthTokens(user._id.toString(), user.email);

    await this.userModel.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
    });

    return {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
      ...tokens,
    };
  }

  async verifyEmail(token: string) {
    // Find user with this verification token
    const user = await this.userModel.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user as verified
    user.isEmailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  async resendVerificationEmail(email: string) {
    // Find user
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = this.tokenService.generateVerificationToken();
    const verificationTokenExpires = this.tokenService.getTokenExpirationDate(24);

    // Update user with new token
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, user.username, verificationToken);

    return {
      success: true,
      message: 'Verification email sent successfully',
    };
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user._id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
    };
  }

  async forgotPassword(email: string) {
    // Find user
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate reset token
    const resetToken = this.tokenService.generateVerificationToken();
    const resetTokenExpires = this.tokenService.getTokenExpirationDate(1); // 1 hour

    // Update user with reset token
    user.resetPasswordToken = resetToken;
    user.resetPasswordTokenExpires = resetTokenExpires;
    await user.save();

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(user.email, user.username, resetToken);

    return {
      success: true,
      message: 'Password reset instructions sent to your email',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // Find user with this reset token
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Update password
    const hashedPassword = Hash.make(newPassword);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpires = null;
    await user.save();

    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  }
}
