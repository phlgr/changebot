import { DOMParser } from "@xmldom/xmldom";
import * as cheerio from "cheerio";
import * as xpath from "xpath";
import type { FetchResult, Website } from "./types.js";

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
			const delay = Math.min(1000 * 2 ** (attempt - 1), 10000);
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
			const node = result[0] as any;
			return node.textContent || node.toString() || "";
		}

		console.warn(`XPath selector "${xpathExpr}" found no elements`);
		return html;
	} catch (error) {
		console.error("Failed to apply XPath selector:", error);
		return html;
	}
}
