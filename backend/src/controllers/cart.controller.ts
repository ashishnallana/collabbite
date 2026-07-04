import { Request, Response } from 'express';
import * as cartService from '../services/cart.service';

export const addItem = async (req: Request, res: Response) => {
  try {
    const { sessionId, participantId, restaurantId, restaurantName, itemId, itemName, price, quantity, customizations } = req.body;
    
    if (!sessionId || !participantId || !itemId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const item = await cartService.addItemToCart(
      sessionId, participantId, restaurantId, restaurantName, itemId, itemName, price, quantity, customizations
    );
    
    res.status(200).json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeItem = async (req: Request, res: Response) => {
  try {
    const { cartItemId } = req.params;
    const { participantId } = req.query;
    await cartService.removeItemFromCart(cartItemId as string, participantId as string);
    res.status(200).json({ success: true, message: "Item removed" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCart = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const cart = await cartService.getSessionCart(sessionId as string);
    res.status(200).json({ success: true, data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkout = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const swiggyCartData = await cartService.checkoutSession(sessionId);
    res.status(200).json({ success: true, data: swiggyCartData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
