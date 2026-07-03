import axios from 'axios';

class SwiggyMCPService {
  private idCounter = 1;
  private sessionIds: Record<string, string> = {}; // hostId -> sessionId

  async callTool(name: string, args: Record<string, any>, token: string) {
    if (!token) {
      throw new Error("CLI Error: No token provided. Please authenticate.");
    }
    
    // We must pass a unique identifier for the user to store their session ID.
    // Since token is unique per user, we use a hash of it, or just use the token string itself as a key.
    const userKey = token.substring(0, 20);

    let sessionId = this.sessionIds[userKey];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-protocol-version': '2024-11-05',
      'Authorization': `Bearer ${token}`
    };

    // If we don't have a session ID, we MUST initialize first to get one.
    // Swiggy's server requires this to establish context and return structured JSON correctly.
    if (!sessionId) {
      try {
        const initRes = await axios.post("https://mcp.swiggy.com/food", {
          jsonrpc: "2.0",
          id: (this.idCounter++).toString(),
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            clientInfo: { name: "swiggy-cli", version: "0.1.3" }
          }
        }, { headers });

        if (initRes.headers['mcp-session-id']) {
          sessionId = initRes.headers['mcp-session-id'];
          this.sessionIds[userKey] = sessionId;
          
          // Send notifications/initialized (fire and forget)
          axios.post("https://mcp.swiggy.com/food", {
            jsonrpc: "2.0",
            method: "notifications/initialized",
            params: {}
          }, { headers: { ...headers, 'mcp-session-id': sessionId } }).catch(() => {});
        }
      } catch (err: any) {
        throw new Error(`MCP Initialization Error: ${err.message}`);
      }
    }

    if (sessionId) {
      headers['mcp-session-id'] = sessionId;
    }

    try {
      const response = await axios.post("https://mcp.swiggy.com/food", {
        jsonrpc: "2.0",
        id: (this.idCounter++).toString(),
        method: "tools/call",
        params: { name, arguments: args }
      }, { headers });

      // Update session ID if it changed
      if (response.headers['mcp-session-id']) {
        this.sessionIds[userKey] = response.headers['mcp-session-id'];
      }

      const data = response.data;
      if (data.error) {
        throw new Error(data.error.message || data.error.error_description || JSON.stringify(data.error));
      }
      if (!data.result) {
        throw new Error("Invalid response from Swiggy MCP");
      }

      // Sometimes Swiggy returns JSON parsed, sometimes as string content.
      // If it's structured content, return it directly
      if (data.result.structuredContent) {
         data.result.content = [{ type: "text", text: JSON.stringify(data.result.structuredContent) }];
      }

      return data.result;
    } catch (e: any) {
      if (e.response?.data) {
        const errData = typeof e.response.data === 'object' ? JSON.stringify(e.response.data) : e.response.data;
        throw new Error(`Swiggy Error: ${errData}`);
      }
      throw new Error(`MCP Error: ${e.message}`);
    }
  }
}

export const swiggyService = new SwiggyMCPService();
