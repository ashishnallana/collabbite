import { prisma } from '../utils/prisma';
import { swiggyService } from './mcp.service';

export const getUserAddresses = async (token: string) => {
  try {
    const addressesResponse = await swiggyService.callTool('get_addresses', {}, token);
    const addressData = JSON.parse(addressesResponse.content[0].text as string);
    let addresses = [];
    if (Array.isArray(addressData)) {
      addresses = addressData;
    } else {
      addresses = addressData.data?.addresses || addressData.addresses || [];
    }
    
    if (addresses.length === 0) {
      throw new Error("No addresses found for this Swiggy account. Add an address in Swiggy first.");
    }
    
    return addresses;
  } catch (err: any) {
    console.error("Fetch addresses error:", err.message);
    throw new Error(`Failed to fetch addresses: ${err.message}`);
  }
};

export const initializeSession = async (hostId: string, addressId?: string, swiggyToken?: string) => {
  // If no addressId provided, fetch the default address using MCP
  let selectedAddressId = addressId;
  let fullAddressDetails = "{}";

  if (swiggyToken) {
    try {
      const addressesResponse = await swiggyService.callTool('get_addresses', {}, swiggyToken);
      const addressData = JSON.parse(addressesResponse.content[0].text as string);
    
      let addresses = [];
      if (Array.isArray(addressData)) {
        addresses = addressData;
      } else {
        addresses = addressData.data?.addresses || addressData.addresses || [];
      }
    
      if (addresses.length === 0) {
        throw new Error("No addresses found for this Swiggy account. Add an address in Swiggy first.");
      }

      // If specific addressId is requested, find it, else use the first one
      const addressObj = selectedAddressId 
        ? addresses.find((a: any) => a.id === selectedAddressId)
        : addresses[0];

      if (!addressObj) {
        throw new Error("Specified address not found");
      }

      selectedAddressId = addressObj.id;
      
      // Inject hostToken so guests can use it!
      const addrObjWithToken = { ...addressObj, hostToken: swiggyToken };
      fullAddressDetails = JSON.stringify(addrObjWithToken); // Serialize for DB storage
    } catch (err: any) {
      console.log("Failed to fetch address details for session", err.message);
    }
  }

  // Create session in database
  const session = await prisma.session.create({
    data: {
      hostId,
      address: fullAddressDetails, // Store full serialized address object
      participants: {
        create: {
          nickname: hostId,
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

export const toggleParticipantReady = async (participantId: string) => {
  const participant = await prisma.participant.findUnique({
    where: { id: participantId }
  });
  if (!participant) throw new Error("Participant not found");

  return await prisma.participant.update({
    where: { id: participantId },
    data: { isReady: !participant.isReady }
  });
};
