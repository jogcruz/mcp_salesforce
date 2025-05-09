import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import jsforce from 'jsforce';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerTools } from './tools.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file using absolute path
dotenv.config({ path: path.join(__dirname, '.env') });

// Get API version from environment variable with fallback
const apiVersion = process.env.SF_API_VERSION || '58.0';

// Salesforce connection setup
const conn = new jsforce.Connection({
    loginUrl: process.env.SF_LOGIN_URL, // Use environment variable for login URL
    version: apiVersion // Use environment variable with fallback
});

// Login to Salesforce
try {
    await conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD);
    console.error('Connected to Salesforce successfully');
} catch (err) {
    console.error('Failed to connect to Salesforce:', err);
    process.exit(1);
}

// Create MCP Server instance
const server = new McpServer({
    name: "salesforce-mcp",
    version: "1.0.0",
    description: "Salesforce MCP Server for SOQL queries"
});

// Register all tools with the API version
registerTools(server, conn, apiVersion);

const transport = new StdioServerTransport();
await server.connect(transport).catch(error => {
    console.error("Failed to connect to MCP server:", error);
    process.exit(1);
});


