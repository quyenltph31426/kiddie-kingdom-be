import { Controller, Get, Post, Body, Delete, Put, UseGuards, Request } from '@nestjs/common';
import { CartService } from './cart.service';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { RemoveFromCartDto } from './dto/remove-from-cart.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  async addToCart(@Request() req, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(
      req.user.sub,
      addToCartDto.productId,
      addToCartDto.quantity,
      addToCartDto.variantId,
      addToCartDto.attributes,
    );
  }

  @Put()
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateCartItem(@Request() req, @Body() updateCartItemDto: UpdateCartItemDto) {
    return this.cartService.updateCartItemQuantity(
      req.user.sub,
      updateCartItemDto.productId,
      updateCartItemDto.quantity,
      updateCartItemDto.variantId,
    );
  }

  @Delete('item')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeFromCart(@Request() req, @Body() removeFromCartDto: RemoveFromCartDto) {
    return this.cartService.removeFromCart(req.user.sub, removeFromCartDto.productId, removeFromCartDto.variantId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.sub);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge guest cart with user cart after login' })
  async mergeCart(@Request() req, @Body() mergeCartDto: MergeCartDto) {
    return this.cartService.mergeGuestCart(req.user.sub, mergeCartDto.items);
  }
}
