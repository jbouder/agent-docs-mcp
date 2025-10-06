#! /usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { log } from "./utils.js";
import { fetchAgentDoc, fetchAllAgentDocs } from "./utils.js";

// Configuration interface
interface Config {
  baseUrls: string[];
}

// Get configuration from environment variable
function getConfig(): Config {
  let baseUrls: string[] = [];

  // Get base URLs from REPO_URLS environment variable
  if (process.env.REPO_URLS) {
    try {
      baseUrls = JSON.parse(process.env.REPO_URLS);
    } catch (error) {
      log("Error parsing REPO_URLS environment variable:", error);
    }
  }

  return { baseUrls };
}

const config = getConfig();

const server = new Server(
  {
    name: "agent-docs-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_docs",
        description:
          "Gets all AGENT.md documentation content from configured base URLs",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_doc_by_base_url",
        description:
          "Gets AGENT.md documentation content from a specific base URL",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description:
                "Base URL to fetch AGENT.md from (e.g., https://github.com/owner/repo/blob/main or https://github.com/owner/repo/blob/main/docs)",
            },
          },
          required: ["baseUrl"],
        },
      },
      {
        name: "list_configured_urls",
        description: "Lists all configured base URLs",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Tool implementations
server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_docs": {
          if (config.baseUrls.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "No base URLs configured. Please configure URLs in your MCP client settings.",
                },
              ],
            };
          }

          const results = await fetchAllAgentDocs(config.baseUrls);
          const successfulResults = results.filter((r) => !r.error);
          const errorResults = results.filter((r) => r.error);

          let responseText = "";

          if (successfulResults.length > 0) {
            responseText += "# AGENT.md Documentation Content\n\n";
            for (const result of successfulResults) {
              responseText += `## From: ${result.baseUrl}\n\n`;
              responseText += result.content;
              responseText += "\n\n---\n\n";
            }
          }

          if (errorResults.length > 0) {
            responseText += "\n## Errors:\n";
            for (const result of errorResults) {
              responseText += `- ${result.baseUrl}: ${result.error}\n`;
            }
          }

          return {
            content: [
              {
                type: "text",
                text: responseText || "No content available.",
              },
            ],
          };
        }

        case "get_doc_by_base_url": {
          const baseUrl = args?.baseUrl as string;
          if (!baseUrl) {
            throw new Error("baseUrl parameter is required");
          }

          const content = await fetchAgentDoc(baseUrl);
          return {
            content: [
              {
                type: "text",
                text: `# AGENT.md from: ${baseUrl}\n\n${content}`,
              },
            ],
          };
        }

        case "list_configured_urls": {
          const urlList =
            config.baseUrls.length > 0
              ? config.baseUrls
                  .map((url, index) => `${index + 1}. ${url}`)
                  .join("\n")
              : "No URLs configured.";

          return {
            content: [
              {
                type: "text",
                text: `# Configured Base URLs\n\n${urlList}\n\nNote: AGENT.md will be appended to each base URL.`,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log(
    `My Docs MCP server running on stdio with ${config.baseUrls.length} configured base URLs`
  );
}

main().catch((error) => {
  log("Server failed to start:", error);
  process.exit(1);
});
