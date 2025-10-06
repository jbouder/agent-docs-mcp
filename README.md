# Agent Docs MCP

MCP Server providing access to AGENT.md files from GitHub repositories to support your AI code assisted environment.

## Getting Started

Add the following to your mcp.json to connect VS Code Copilot to the MCP server. The repository URLs are configured using the `REPO_URLS` environment variable, and the server will automatically append `/AGENT.md` to each URL:

## Example Configuration

Complete MCP configuration example:

```json
{
  "servers": {
    "agent-docs-mcp": {
      "command": "npx",
      "args": ["@jbouder/agent-docs-mcp"],
      "env": {
        "REPO_URLS": "[\"https://github.com/jbouder/acolyte\",\"https://github.com/metrostar/comet\"]"
      }
    }
  }
}
```

This configuration will automatically fetch:

- `https://github.com/jbouder/acolyte/blob/main/AGENT.md`
- `https://github.com/MetroStar/comet/blob/main/AGENT.md`

**Important**: The `REPO_URLS` environment variable expects a JSON array string containing GitHub repository URLs. The server will automatically:

- Add `/blob/main` if not specified (you can also specify other branches like `/blob/develop`)
- Append `/AGENT.md` to fetch the documentation

## Supported URL Formats

The server intelligently handles various GitHub URL formats:

- `https://github.com/owner/repo` → auto-adds `/blob/main/AGENT.md`
- `https://github.com/owner/repo/blob/branch` → adds `/AGENT.md`
- `https://github.com/owner/repo/blob/branch/path` → adds `/AGENT.md`
- `https://github.com/owner/repo/tree/branch` → converts to blob and adds `/AGENT.md`

All URLs are automatically converted to raw content URLs for fetching.

## Available Tools

| Tool                   | Description                                                  | Parameters                                                   |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `get_docs`             | Gets all AGENT.md documentation content from configured URLs | None                                                         |
| `get_doc_by_base_url`  | Gets AGENT.md documentation from a specific base URL         | `baseUrl` (string): GitHub base URL (AGENT.md will be added) |
| `list_configured_urls` | Lists all configured base URLs                               | None                                                         |

## Example Usage

Once configured, you can use the following tools in your AI assistant:

1. **Get all docs**: Use `get_docs` to fetch AGENT.md content from all configured repository URLs
2. **Get specific doc**: Use `get_doc_by_base_url` with a GitHub repository URL to fetch AGENT.md from a specific location
3. **List URLs**: Use `list_configured_urls` to see what repository URLs are currently configured

## Running the Project Locally

The MCP server is built using the official TypeScript MCP SDK and follows the existing project structure and patterns.

### Build the Server

```sh
npm run build
```

### Configuring MCP Client for your server

```json
{
  "mcpServers": {
    "agent-docs-mcp": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/YOUR/PROJECT/agent-docs-mcp/dist/index.js"],
      "env": {
        "REPO_URLS": "[\"https://github.com/jbouder/acolyte\"]"
      }
    }
  }
}
```
