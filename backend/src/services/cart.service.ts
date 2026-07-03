import { prisma } from '../utils/prisma';
import { swiggyService } from './mcp.service';

export const addItemToCart = async (
  sessionId: string,
  participantId: string,
  restaurantId: string,
  restaurantName: string,
  itemId: string,
  itemName: string,
  price: number,
  quantity: number,
  customizations?: any
) => {
  // Check if item already exists for this participant with same customizations
  // For simplicity, just create a new cart item, or increment quantity if basic item
  
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      sessionId,
      participantId,
      itemId,
      customizations: customizations ? JSON.stringify(customizations) : null
    }
  });

  if (existingItem) {
    return await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + quantity }
    });
  }

  return await prisma.cartItem.create({
    data: {
      sessionId,
      participantId,
      restaurantId,
      restaurantName,
      itemId,
      itemName,
      price,
      quantity,
      customizations: customizations ? JSON.stringify(customizations) : null
    }
  });
};

export const removeItemFromCart = async (cartItemId: string) => {
  return await prisma.cartItem.delete({
    where: { id: cartItemId }
  });
};

export const getSessionCart = async (sessionId: string) => {
  return await prisma.cartItem.findMany({
    where: { sessionId },
    include: {
      participant: true
    }
  });
};

export const checkoutSession = async (sessionId: string) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { items: true }
  });

  if (!session) throw new Error("Session not found");
  if (session.items.length === 0) throw new Error("Cart is empty");

  // Assuming all items are from the same restaurant for checkout
  const restaurantId = session.items[0].restaurantId;
  const restaurantName = session.items[0].restaurantName;
  const addressId = JSON.parse(session.address).id;

  // Format cart items for MCP
  const cartItemsFormatted = session.items.map(item => {
    let variants = undefined;
    let variantsV2 = undefined;
    let addons = undefined;

    if (item.customizations) {
      const cust = JSON.parse(item.customizations);
      variants = cust.variants;
      variantsV2 = cust.variantsV2;
      addons = cust.addons;
    }

    return {
      menu_item_id: item.itemId,
      quantity: item.quantity,
      variants,
      variantsV2,
      addons
    };
  });

  // 1. Call update_food_cart
  const updateRes = await swiggyService.callTool('update_food_cart', {
    restaurantId,
    addressId,
    restaurantName,
    cartItems: cartItemsFormatted
  });

  const cartData = JSON.parse(updateRes.content[0].text).data;

  // Update session status
  await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'ORDERING' }
  });

  return cartData;
};
