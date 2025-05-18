import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { RemoveCartItemsDto } from './dto/remove-cart-items.dto';
import { RemoveFromCartDto } from './dto/remove-from-cart.dto';
import { UpdateCartItemQuantityDto } from './dto/update-cart-item-quantity.dto';

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
    );
  }

  @Put(':cartItemId')
  @ApiOperation({ summary: 'Update cart item quantity by ID' })
  @ApiParam({ name: 'cartItemId', description: 'Cart item ID' })
  async updateCartItemById(
    @Request() req,
    @Param('cartItemId') cartItemId: string,
    @Body() updateCartItemQuantityDto: UpdateCartItemQuantityDto,
  ) {
    return this.cartService.updateCartItemById(req.user.sub, cartItemId, updateCartItemQuantityDto.quantity);
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

  @Delete('items')
  @ApiOperation({ summary: 'Remove multiple items from cart' })
  async removeCartItems(@Request() req, @Body() removeCartItemsDto: RemoveCartItemsDto) {
    return this.cartService.removeCartItems(req.user.sub, removeCartItemsDto.itemIds);
  }
}
