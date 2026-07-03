import { Request, Response } from 'express';
import * as restaurantService from '../services/restaurant.service';
import { prisma } from '../utils/prisma';

export const searchRestaurants = async (req: Request, res: Response) => {
  try {
    const { sessionId, query, offset } = req.query;
    if (!sessionId || !query) {
      return res.status(400).json({ success: false, message: "Missing sessionId or query" });
    }

    // Get the addressId from the session
    const session = await prisma.session.findUnique({ where: { id: String(sessionId) } });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const addressJson = JSON.parse(session.address);
    const addressId = addressJson.id;
    const data = await restaurantService.searchRestaurants(addressJson.hostToken, addressId, String(query), Number(offset) || 0);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRestaurantMenu = async (req: Request, res: Response) => {
  try {
    const { sessionId, restaurantId } = req.params;
    if (!sessionId || !restaurantId) {
      return res.status(400).json({ success: false, message: "Missing sessionId or restaurantId" });
    }

    // Get the addressId from the session
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const addressJson = JSON.parse(session.address);
    const addressId = addressJson.id;
    const data = await restaurantService.getRestaurantMenu(addressJson.hostToken, addressId, restaurantId);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
