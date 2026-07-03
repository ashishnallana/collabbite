import { prisma } from '../utils/prisma';
import { swiggyService } from './mcp.service';

export const initializeSession = async (hostId: string, addressId?: string) => {
  // If no addressId provided, fetch the default address using MCP
  let selectedAddressId = addressId;
  let fullAddressDetails = "";

  try {
    const addressesResponse = await swiggyService.callTool('get_addresses', {});
    const addressData = JSON.parse(addressesResponse.content[0].text);
    
    const addresses = addressData.data?.addresses || [];
    
    if (!addresses || addresses.length === 0) {
      throw new Error("No addresses found for this Swiggy account");
    }

    // If specific addressId is requested, find it, else use the first one
    const addressObj = selectedAddressId 
      ? addresses.find((a: any) => a.id === selectedAddressId)
      : addresses[0];

    if (!addressObj) {
      throw new Error("Specified address not found");
    }

    selectedAddressId = addressObj.id;
    fullAddressDetails = JSON.stringify(addressObj); // Serialize for DB storage

  } catch (err: any) {
    throw new Error(`Failed to fetch address from Swiggy: ${err.message}`);
  }

  // Create session in database
  const session = await prisma.session.create({
    data: {
      hostId,
      address: selectedAddressId, // We'll just store the ID to be used for search/cart
      participants: {
        create: {
          nickname: 'Host',
          role: 'HOST',
          isReady: false
        }
      }
    },
    include: {
      participants: true
    }
  });

  return session;
};

export const addGuestToSession = async (sessionId: string, nickname: string) => {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw new Error('Session not found');
  }

  const participant = await prisma.participant.create({
    data: {
      sessionId,
      nickname,
      role: 'GUEST',
      isReady: false
    }
  });

  return participant;
};

export const getSessionDetails = async (sessionId: string) => {
  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      participants: {
        include: {
          items: true
        }
      },
      items: true
    }
  });
};
