/* eslint-disable no-console */

export const log = console.error; // Use stderr for logging in MCP servers
export const error = console.error;

/**
 * Normalize GitHub repository URL to blob URL format
 * Handles various input formats and adds /blob/main if not present
 */
export function normalizeGitHubUrl(url: string): string {
  // Remove trailing slashes
  let normalized = url.endsWith("/") ? url.slice(0, -1) : url;

  // Pattern 1: https://github.com/owner/repo (add /blob/main)
  const simpleRepoPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)$/;
  if (simpleRepoPattern.test(normalized)) {
    return `${normalized}/blob/main`;
  }

  // Pattern 2: https://github.com/owner/repo/tree/branch -> convert to blob
  if (normalized.includes("/tree/")) {
    return normalized.replace("/tree/", "/blob/");
  }

  // Pattern 3: Already has /blob/ - return as is
  if (normalized.includes("/blob/")) {
    return normalized;
  }

  // Pattern 4: https://raw.githubusercontent.com/owner/repo/branch/path -> convert to blob
  if (normalized.includes("raw.githubusercontent.com")) {
    const parts = normalized
      .replace("https://raw.githubusercontent.com/", "")
      .split("/");
    if (parts.length >= 3) {
      const owner = parts[0];
      const repo = parts[1];
      const branch = parts[2];
      const path = parts.slice(3).join("/");
      return `https://github.com/${owner}/${repo}/blob/${branch}${
        path ? "/" + path : ""
      }`;
    }
  }

  // If none of the patterns match, assume it's a simple repo URL and add /blob/main
  return `${normalized}/blob/main`;
}

/**
 * Parse GitHub URL to get raw content URL
 */
export function parseGitHubUrl(url: string): string {
  // Handle different GitHub URL formats and convert to raw content URL
  if (url.includes("github.com") && url.includes("/blob/")) {
    return url
      .replace("github.com", "raw.githubusercontent.com")
      .replace("/blob/", "/");
  }

  if (url.includes("raw.githubusercontent.com")) {
    return url; // Already a raw URL
  }

  throw new Error(`Unsupported GitHub URL format: ${url}`);
}

/**
 * Build AGENT.md URL from a base URL
 */
export function buildAgentMdUrl(baseUrl: string): string {
  // First normalize the GitHub URL to ensure it has /blob/branch format
  const normalizedUrl = normalizeGitHubUrl(baseUrl);
  // Ensure the normalized URL doesn't end with a slash
  const normalizedBase = normalizedUrl.endsWith("/")
    ? normalizedUrl.slice(0, -1)
    : normalizedUrl;
  return `${normalizedBase}/AGENT.md`;
}

/**
 * Fetch AGENT.md content from a base URL
 */
export async function fetchAgentDoc(baseUrl: string): Promise<string> {
  try {
    const agentMdUrl = buildAgentMdUrl(baseUrl);
    const rawUrl = parseGitHubUrl(agentMdUrl);
    const response = await fetch(rawUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch AGENT.md from ${baseUrl}: ${response.status} ${response.statusText}`
      );
    }

    const content = await response.text();
    return content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error fetching AGENT.md from ${baseUrl}: ${errorMessage}`);
  }
}

/**
 * Fetch all AGENT.md files from configured base URLs
 */
export async function fetchAllAgentDocs(
  baseUrls: string[]
): Promise<Array<{ baseUrl: string; content: string; error?: string }>> {
  const results = await Promise.allSettled(
    baseUrls.map(async (baseUrl) => {
      const content = await fetchAgentDoc(baseUrl);
      return { baseUrl, content };
    })
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return {
        baseUrl: baseUrls[index],
        content: "",
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      };
    }
  });
}
