# Salesforce MCP Integration

This project provides a Model Context Protocol (MCP) server for Salesforce integration, allowing you to execute SOQL queries, retrieve metadata, and interact with Salesforce data through a standardized interface.

## Features

- Connect to Salesforce orgs using environment variables
- Execute SOQL queries against Salesforce data
- Retrieve and process Salesforce records and metadata
- List and manage Salesforce Flows
- Secure credential management using environment variables

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Salesforce org with API access
- Salesforce credentials (username and password)

## Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your Salesforce credentials and API version:
   ```
   SF_LOGIN_URL=https://your-instance.salesforce.com/
   SF_USERNAME=your_username
   SF_PASSWORD=your_password
   SF_API_VERSION=58.0
   ```

   - For sandbox environments, use `https://test.salesforce.com/` as the login URL.
   - The `SF_API_VERSION` variable controls the Salesforce API version used by the integration. Update it as needed for your org.

## Usage

### Starting the MCP Server

Run the server using Node.js:

```
node server.js
```

The server will connect to Salesforce using the credentials in your `.env` file and start listening for MCP requests.

### Executing SOQL Queries

Once the server is running, you can execute SOQL queries through the MCP interface. The server provides a `soqlQuery` tool that accepts SOQL queries and returns the results.

Example SOQL query:
```sql
SELECT Id, Name, Status FROM Account LIMIT 5
```

### Listing Salesforce Flows

You can list all the flows in your Salesforce org using the `retrieveMetadata` tool with the `Flow` metadata type. This will return all available flows and their metadata.

## Configuring mcpServers in Cursor

To use this Salesforce MCP server with Cursor, add the following configuration to your `mcp.json` file in Cursor:

```
"mcpServers": {
  "mcp-salesforce": {
    "command": "node /absolute/path/to/your/project/root/server.js",
    "transport": "stdio",
    "args": []
  }
}
```

- Replace `/absolute/path/to/your/project/root/server.js` with the absolute path to your `server.js` file.
- Make sure the server is started from the correct directory so it can find the `.env` file and dependencies.

After adding this configuration to your `mcp.json`, you can connect to the Salesforce MCP server from within Cursor and use all the available tools.

## Project Structure

- `server.js` - Main MCP server implementation and Salesforce connection setup
- `tools.js` - All MCP tool definitions (SOQL, metadata, flows, etc.)
- `.env` - Environment variables for Salesforce credentials and API version
- `package.json` - Project dependencies and scripts

## Security Considerations

- Never commit your `.env` file to version control
- Add `.env` to your `.gitignore` file
- Use environment variables for all sensitive information
- Consider using a more secure authentication method for production environments

## Troubleshooting

### Connection Issues

If you encounter connection issues:
1. Verify your Salesforce credentials in the `.env` file
2. Check that your Salesforce org is accessible
3. Ensure your IP address is whitelisted in Salesforce (if required)
4. Verify that your Salesforce user has API access

### Query Errors

If your SOQL queries fail:
1. Check the SOQL syntax
2. Verify that the objects and fields exist in your org
3. Ensure your user has permission to access the objects and fields

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 