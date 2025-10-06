# Agent Docs MCP

MCP Server that provides coding agents with automatic access to AGENTS.md documentation from GitHub repositories. This enables AI assistants to understand your codebase conventions, patterns, and guidelines without manual intervention.

## Why Use This?

When working with AI coding agents, they often need context about:

- Your coding standards and conventions
- Architecture decisions and patterns
- API usage and best practices
- Project-specific guidelines

This MCP server makes that documentation automatically available to agents, so they can:

- **Automatically reference** your coding guidelines when making changes
- **Search** for specific patterns or implementations
- **Understand context** before implementing features
- **Follow conventions** without being explicitly told

## Getting Started

Add the following to your MCP configuration to connect your AI assistant to the documentation:

### Configuration

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

This will automatically make AGENTS.md files available from:

- `https://github.com/jbouder/acolyte/blob/main/AGENTS.md`
- `https://github.com/MetroStar/comet/blob/main/AGENTS.md`

**Environment Variables:**

- `REPO_URLS`: JSON array of GitHub repository URLs
  - The server automatically adds `/blob/main` if not specified
  - You can specify branches: `https://github.com/owner/repo/blob/develop`
  - You can specify subdirectories: `https://github.com/owner/repo/blob/main/docs`

## How It Works

### Resources (Automatic)

The documentation is exposed as **MCP resources**, which means agents can automatically access it when working on your code. No manual tool calls needed!

### Tools (On-Demand)

| Tool                | When Agents Use It                                                                |
| ------------------- | --------------------------------------------------------------------------------- |
| `read_agent_docs`   | To read coding guidelines, patterns, and conventions before implementing features |
| `search_agent_docs` | To find specific information about APIs, patterns, or implementation details      |

**Agents will automatically use these tools when:**

- Starting work on a new feature
- Fixing bugs and needing context
- Implementing APIs or following patterns
- Understanding architecture decisions

## Supported URL Formats

The server intelligently handles various GitHub URL formats:

- `https://github.com/owner/repo` → auto-adds `/blob/main/AGENTS.md`
- `https://github.com/owner/repo/blob/branch` → adds `/AGENTS.md`
- `https://github.com/owner/repo/blob/branch/path` → adds `/AGENTS.md`
- `https://github.com/owner/repo/tree/branch` → converts to blob and adds `/AGENTS.md`

All URLs are automatically converted to raw content URLs for fetching.

## Creating AGENTS.md

Create an `AGENTS.md` file in your repository with coding guidelines, patterns, and context. Example:

```markdown
# Agent Guidelines for MyProject

## Architecture

- We use a microservices architecture
- API Gateway pattern for routing
- Event-driven communication between services

## Coding Standards

- TypeScript with strict mode enabled
- ESLint configuration in .eslintrc.json
- Jest for testing with >80% coverage requirement

## API Patterns

- All endpoints use RESTful conventions
- Authentication via JWT tokens
- Rate limiting: 100 requests per minute

## Common Tasks

### Adding a New API Endpoint

1. Create route in `src/routes/`
2. Add controller in `src/controllers/`
3. Write tests in `__tests__/`
4. Update OpenAPI spec

### Database Migrations

Use `npm run migrate` to run migrations...
```

## Example Agent Interactions

With this MCP server configured, agents can:

**Automatic Context:**

```
Agent: "I need to implement a new API endpoint for user profiles"
[Agent automatically reads documentation]
Agent: "Based on the guidelines, I'll create the route in src/routes/,
       add a controller, write tests, and update the OpenAPI spec..."
```

**Searching for Patterns:**

```
You: "Add authentication to the new endpoint"
Agent: [Searches docs for "authentication"]
Agent: "I found the JWT authentication pattern. I'll use the existing
       middleware from src/middleware/auth.ts..."
```

## Running Locally

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
