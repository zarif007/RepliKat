"use server";

import { load } from "cheerio";

interface RouteNode {
  path: string;
  url: string;
  children: RouteNode[];
  status?: number;
  error?: string;
}

interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  timeout?: number;
  delay?: number;
}

export async function getRoutesFromPage(
  url: string,
  options: CrawlOptions = {}
): Promise<RouteNode> {
  const { maxDepth = 2, maxPages = 50, timeout = 10000, delay = 500 } = options;

  const visited = new Set<string>();
  let pageCount = 0;

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const normalizeUrl = (baseUrl: string, link: string): string => {
    if (
      !link ||
      link.startsWith("javascript:") ||
      link.startsWith("#") ||
      link.startsWith("mailto:") ||
      link.startsWith("tel:") ||
      link.startsWith("data:") ||
      link.startsWith("blob:")
    ) {
      return "";
    }

    try {
      const urlObj = new URL(link, baseUrl);
      urlObj.search = "";
      urlObj.hash = "";
      return urlObj.href;
    } catch (error) {
      return "";
    }
  };

  const getPathFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname === "/" ? "/" : urlObj.pathname.replace(/\/$/, "");
    } catch {
      return url;
    }
  };

  const isValidUrl = (url: string, baseDomain: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === baseDomain;
    } catch {
      return false;
    }
  };

  const fetchWithRetry = async (
    url: string,
    retries = 2
  ): Promise<Response | null> => {
    for (let i = 0; i <= retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            DNT: "1",
            Connection: "keep-alive",
            "Upgrade-Insecure-Requests": "1",
          },
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        if (i === retries) return null;
        await sleep(1000 * (i + 1));
      }
    }
    return null;
  };

  async function crawlPage(
    currentUrl: string,
    baseDomain: string,
    depth: number = 0
  ): Promise<RouteNode> {
    const path = getPathFromUrl(currentUrl);

    if (depth > maxDepth || pageCount >= maxPages) {
      return {
        path,
        url: currentUrl,
        children: [],
        error: depth > maxDepth ? "Max depth reached" : "Max pages reached",
      };
    }

    if (visited.has(currentUrl)) {
      return { path, url: currentUrl, children: [] };
    }

    visited.add(currentUrl);
    pageCount++;

    if (delay > 0 && pageCount > 1) {
      await sleep(delay);
    }

    try {
      const response = await fetchWithRetry(currentUrl);

      if (!response) {
        return {
          path,
          url: currentUrl,
          children: [],
          error: "Failed to fetch after retries",
        };
      }

      if (!response.ok) {
        return {
          path,
          url: currentUrl,
          children: [],
          status: response.status,
          error: `HTTP ${response.status}`,
        };
      }

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("text/html")) {
        return {
          path,
          url: currentUrl,
          children: [],
          error: "Not HTML content",
        };
      }

      const html = await response.text();
      const $ = load(html);

      const links = new Set<string>();

      $("a[href]").each((i, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        const normalizedUrl = normalizeUrl(currentUrl, href);
        if (normalizedUrl && isValidUrl(normalizedUrl, baseDomain)) {
          links.add(normalizedUrl);
        }
      });

      const node: RouteNode = {
        path,
        url: currentUrl,
        children: [],
        status: response.status,
      };

      const childPromises: Promise<RouteNode>[] = [];

      for (const childUrl of links) {
        if (!visited.has(childUrl) && pageCount < maxPages) {
          childPromises.push(crawlPage(childUrl, baseDomain, depth + 1));
        }
      }

      const childNodes = await Promise.allSettled(childPromises);

      for (const result of childNodes) {
        if (result.status === "fulfilled" && result.value.path !== path) {
          node.children.push(result.value);
        }
      }

      return node;
    } catch (error) {
      return {
        path,
        url: currentUrl,
        children: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  try {
    const baseUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    const baseDomain = baseUrl.hostname;

    const routeTree = await crawlPage(baseUrl.href, baseDomain);
    return routeTree;
  } catch (error) {
    return {
      path: "/",
      url: url,
      children: [],
      error: "Invalid starting URL",
    };
  }
}
