import { Request, Response } from 'express';
import * as sessionService from '../services/session.service';

export const getAddresses = async (req: Request, res: Response) => {
  try {
    const { swiggyToken } = req.query;
    if (!swiggyToken) throw new Error("swiggyToken is required");
    const addresses = await sessionService.getUserAddresses(String(swiggyToken));
    res.status(200).json({ success: true, data: addresses });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { hostId, address, swiggyToken } = req.body;
    if (!hostId || !address || !swiggyToken) {
      return res.status(400).json({ success: false, message: "Missing required fields (hostId, address, swiggyToken)" });
    }
    const session = await sessionService.initializeSession(hostId, address, swiggyToken);
    res.status(201).json({ success: true, data: session });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const joinSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, nickname } = req.body;
    const guest = await sessionService.addGuestToSession(sessionId, nickname);
    res.status(200).json({ success: true, data: guest });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await sessionService.getSessionDetails(id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    res.status(200).json({ success: true, data: session });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
