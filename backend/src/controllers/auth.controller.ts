import { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';

// In-memory store for PKCE verifiers and Auth Tokens
export const authStore: Record<string, { verifier?: string; token?: string }> = {};

export const startLogin = async (req: Request, res: Response) => {
  const { hostId } = req.body;
  if (!hostId) {
    return res.status(400).json({ success: false, message: 'hostId is required' });
  }

  // Generate PKCE verifier and challenge
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

  // Store verifier for this host
  authStore[hostId] = { verifier };

  // Generate OAuth URL
  const redirectUri = encodeURIComponent('http://localhost:5000/api/auth/callback');
  const url = `https://mcp.swiggy.com/auth/authorize?response_type=code&client_id=swiggy-mcp&redirect_uri=${redirectUri}&state=${encodeURIComponent(hostId)}&code_challenge=${challenge}&code_challenge_method=S256&scope=mcp:tools mcp:resources mcp:prompts`;

  return res.status(200).json({ success: true, url });
};

export const oauthCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const hostId = String(state);

  if (!code || !hostId || !authStore[hostId]?.verifier) {
    return res.status(400).send("Invalid callback request");
  }

  try {
    const tokenRes = await axios.post('https://mcp.swiggy.com/auth/token', new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'swiggy-mcp',
      code: String(code),
      redirect_uri: 'http://localhost:5000/api/auth/callback',
      code_verifier: authStore[hostId].verifier
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    // Redirect back to frontend with the token
    res.redirect(`http://localhost:3000?authSuccess=true&hostId=${encodeURIComponent(hostId)}&token=${encodeURIComponent(tokenRes.data.access_token)}`);
  } catch (err: any) {
    console.error("Token exchange failed", err.response?.data || err.message);
    res.status(500).send("Failed to authenticate with Swiggy.");
  }
};

export const checkAuthStatus = async (req: Request, res: Response) => {
  const { hostId } = req.query;
  if (!hostId) return res.status(400).json({ success: false, message: 'hostId is required' });

  if (authStore[String(hostId)]?.token) {
    return res.status(200).json({ success: true, status: 'DONE' });
  }
  
  return res.status(200).json({ success: true, status: 'PENDING' });
};
