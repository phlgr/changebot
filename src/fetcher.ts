import { DOMParser } from "@xmldom/xmldom";
import * as cheerio from "cheerio";
import * as xpath from "xpath";
import type { FetchResult, Website } from "./types.js";
import { config } from "./config.js";

// Constants for retry logic
const INITIAL_RETRY_DELAY_MS = 1000; // Initial delay before first retry
const MAX_RETRY_DELAY_MS = 10000; // Maximum delay between retries

/**
 * Fetch website content with retries
 */
export async function fetchWithRetry(
	website: Website,
	options: { timeout: number; retries: number },
): Promise<FetchResult> {
	const { url, selector } = website;
	const { timeout, retries } = options;

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeout);

			const response = await fetch(url, {
				signal: controller.signal,
				headers: {
					"User-Agent": "Mozilla/5.0 (compatible; WebsiteChangeDetection/1.0)",
				},
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			let content = await response.text();

			// Check content size
			const contentSize = new TextEncoder().encode(content).length;
			if (contentSize > config.settings.large_content_threshold) {
				console.warn(
					`⚠️  Large content detected for ${url}: ${(contentSize / 1024 / 1024).toFixed(2)}MB (threshold: ${(config.settings.large_content_threshold / 1024 / 1024).toFixed(2)}MB). Consider using a selector to monitor a specific section.`,
				);
			}

			// Apply selector if provided
			if (selector?.startsWith("xpath=")) {
				content = applyXPathSelector(content, selector.replace("xpath=", ""));
			} else if (selector) {
				content = applyCssSelector(content, selector);
			}

			return { content, status: response.status };
		} catch (error) {
			if (attempt === retries) {
				return {
					content: "",
					status: 0,
					error: error instanceof Error ? error.message : String(error),
				};
			}

			// Exponential backoff
			const delay = Math.min(
				INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1),
				MAX_RETRY_DELAY_MS,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));

			console.log(`Retry ${attempt}/${retries} for ${url} after ${delay}ms`);
		}
	}

	return { content: "", status: 0, error: "Max retries exceeded" };
}

/**
 * Apply CSS selector to extract content
 */
function applyCssSelector(html: string, selector: string): string {
	try {
		const $ = cheerio.load(html);
		const element = $(selector).first();

		if (element.length === 0) {
			console.warn(`CSS selector "${selector}" found no elements`);
			return html;
		}

		return element.html() || element.text() || "";
	} catch (error) {
		console.error("Failed to apply CSS selector:", error);
		return html;
	}
}

/**
 * Apply XPath selector to extract content
 */
function applyXPathSelector(html: string, xpathExpr: string): string {
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");
		const result = xpath.select(xpathExpr, doc);

		if (Array.isArray(result) && result.length > 0) {
			const node = result[0];
			if (node && typeof node === "object") {
				// Handle DOM nodes with textContent
				if ("textContent" in node && typeof node.textContent === "string") {
					return node.textContent;
				}
				// Fallback to toString
				return String(node);
			}
			return "";
		}

		console.warn(`XPath selector "${xpathExpr}" found no elements`);
		return html;
	} catch (error) {
		console.error("Failed to apply XPath selector:", error);
		return html;
	}
}
