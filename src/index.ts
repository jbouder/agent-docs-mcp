#! /usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
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
      resources: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_agent_docs",
        description:
          "Read agent documentation and coding guidelines from configured repositories. Use this when you need context about how to work with a codebase, understand coding patterns, architecture decisions, or get implementation guidelines. The documentation provides best practices, conventions, and important context for making code changes.",
        inputSchema: {
          type: "object",
          properties: {
            repository: {
              type: "string",
              description:
                "Optional: specific repository URL or name to get docs from. If not provided, returns all configured docs.",
            },
          },
        },
      },
      {
        name: "search_agent_docs",
        description:
          "Search through agent documentation for specific information about coding patterns, architecture, APIs, or implementation details. Use this when you need to find specific guidance before implementing a feature or fixing a bug.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "What to search for in the documentation (e.g., 'authentication pattern', 'error handling', 'API endpoints')",
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

// Resource handlers - make docs available as resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = config.baseUrls.map((url, index) => ({
    uri: `agents://docs/${index}`,
    mimeType: "text/markdown",
    name: `Agent Documentation: ${url}`,
    description: `Agent documentation and coding guidelines from ${url}`,
  }));

  return { resources };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const match = uri.match(/^agents:\/\/docs\/(\d+)$/);

  if (!match) {
    throw new Error(`Unknown resource: ${uri}`);
  }

  const index = parseInt(match[1]);
  if (index < 0 || index >= config.baseUrls.length) {
    throw new Error(`Invalid resource index: ${index}`);
  }

  const baseUrl = config.baseUrls[index];
  const content = await fetchAgentDoc(baseUrl);

  return {
    contents: [
      {
        uri,
        mimeType: "text/markdown",
        text: content,
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
        case "read_agent_docs": {
          if (config.baseUrls.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "No repositories configured. Please add repository URLs to REPO_URLS in your MCP client settings.",
                },
              ],
            };
          }

          const repository = args?.repository as string | undefined;

          // If specific repository requested, try to find it
          if (repository) {
            const matchingUrl = config.baseUrls.find(
              (url) =>
                url.includes(repository) ||
                url.toLowerCase().includes(repository.toLowerCase())
            );

            if (matchingUrl) {
              const content = await fetchAgentDoc(matchingUrl);
              return {
                content: [
                  {
                    type: "text",
                    text: `# Agent Documentation\n\n**Repository:** ${matchingUrl}\n\n${content}`,
                  },
                ],
              };
            } else {
              return {
                content: [
                  {
                    type: "text",
                    text: `Repository "${repository}" not found in configured URLs. Available repositories:\n${config.baseUrls
                      .map((u, i) => `${i + 1}. ${u}`)
                      .join("\n")}`,
                  },
                ],
              };
            }
          }

          // Otherwise, return all docs
          const results = await fetchAllAgentDocs(config.baseUrls);
          const successfulResults = results.filter((r) => !r.error);
          const errorResults = results.filter((r) => r.error);

          let responseText = "# Agent Documentation\n\n";
          responseText +=
            "This documentation provides coding guidelines, patterns, and context for working with the configured repositories.\n\n";

          if (successfulResults.length > 0) {
            for (const result of successfulResults) {
              responseText += `## 📚 ${result.baseUrl}\n\n`;
              responseText += result.content;
              responseText += "\n\n---\n\n";
            }
          }

          if (errorResults.length > 0) {
            responseText += "\n## ⚠️ Errors:\n";
            for (const result of errorResults) {
              responseText += `- ${result.baseUrl}: ${result.error}\n`;
            }
          }

          return {
            content: [
              {
                type: "text",
                text: responseText || "No documentation available.",
              },
            ],
          };
        }

        case "search_agent_docs": {
          if (config.baseUrls.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "No repositories configured. Please add repository URLs to REPO_URLS in your MCP client settings.",
                },
              ],
            };
          }

          const query = args?.query as string;
          if (!query) {
            throw new Error("query parameter is required");
          }

          const results = await fetchAllAgentDocs(config.baseUrls);
          const successfulResults = results.filter((r) => !r.error);

          let responseText = `# Search Results for: "${query}"\n\n`;
          let foundMatches = false;

          for (const result of successfulResults) {
            const lines = result.content.split("\n");
            const matches: {
              lineNum: number;
              line: string;
              context: string[];
            }[] = [];

            // Search for query in content
            lines.forEach((line, index) => {
              if (line.toLowerCase().includes(query.toLowerCase())) {
                const contextStart = Math.max(0, index - 2);
                const contextEnd = Math.min(lines.length, index + 3);
                matches.push({
                  lineNum: index + 1,
                  line,
                  context: lines.slice(contextStart, contextEnd),
                });
              }
            });

            if (matches.length > 0) {
              foundMatches = true;
              responseText += `## 📍 Found in: ${result.baseUrl}\n\n`;
              responseText += `**${matches.length} match(es) found**\n\n`;

              matches.forEach((match, idx) => {
                responseText += `### Match ${idx + 1} (Line ${
                  match.lineNum
                })\n\n`;
                responseText += "```\n";
                responseText += match.context.join("\n");
                responseText += "\n```\n\n";
              });

              responseText += "---\n\n";
            }
          }

          if (!foundMatches) {
            responseText += `No matches found for "${query}" in the configured documentation.\n\n`;
            responseText += "Try searching for:\n";
            responseText += "- Different keywords or phrases\n";
            responseText += "- More general terms\n";
            responseText +=
              "- Check the available documentation with read_agent_docs\n";
          }

          return {
            content: [
              {
                type: "text",
                text: responseText,
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
    `Agent Docs MCP server running with ${config.baseUrls.length} configured repository(ies)`
  );
}

main().catch((error) => {
  log("Server failed to start:", error);
  process.exit(1);
});
