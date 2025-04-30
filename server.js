import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import jsforce from 'jsforce';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file using absolute path
dotenv.config({ path: path.join(__dirname, '.env') });

// Salesforce connection setup
const conn = new jsforce.Connection({
    loginUrl: process.env.SF_LOGIN_URL // Use environment variable for login URL
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

server.tool(
    "soqlQuery",
    "Execute a SOQL query on Salesforce",
    {
        soql: z.string().describe("The SOQL query to execute")
    },
    async (params) => {
        try {
            // Check if params is an object with soql property or if it's the direct string
            const query = typeof params === 'object' && params.soql ? params.soql : params;
            
            console.error(`Executing query: ${query}`);
            const result = await conn.query(query);
            console.error(`Query executed successfully`);
            
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result)
                    }
                ]
            };
        } catch (error) {
            console.error(`Query error: ${error.message}`);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ error: error.message })
                    }
                ]
            };
        }
    }
);

const transport = new StdioServerTransport();
await server.connect(transport).catch(error => {
    console.error("Failed to connect to MCP server:", error);
    process.exit(1);
});


