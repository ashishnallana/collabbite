import { execSync } from 'child_process';

class SwiggyMCPService {
  async callTool(name: string, args: Record<string, any>) {
    try {
      // Escape for Windows cmd: wrap the whole JSON in double quotes, and escape internal double quotes.
      const escapedInput = JSON.stringify(args).replace(/"/g, '\\"');
      const cmd = `npx -y swiggy-cli call food ${name} --input "${escapedInput}" --json`;
      
      const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer for large menus
      
      return {
        content: [{ text: output }]
      };
    } catch (e: any) {
      let errStr = e.stdout ? e.stdout.toString() : e.message;
      throw new Error(`CLI Error: ${errStr}`);
    }
  }
}

export const swiggyService = new SwiggyMCPService();
