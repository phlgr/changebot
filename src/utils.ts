import { createHash } from "node:crypto";

/**
 * Generate URL-safe filename from URL
 */
export function urlToFilename(url: string): string {
	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname.replace(/\./g, "-");
		const pathname = parsed.pathname
			.replace(/[^a-zA-Z0-9]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");
		return `${hostname}${pathname || "index"}.json`.toLowerCase();
	} catch {
		throw new Error(`Invalid URL: ${url}`);
	}
}

/**
 * Calculate SHA-256 hash of content
 */
export function calculateHash(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}

/**
 * Format ISO timestamp
 */
export function formatTimestamp(date: Date = new Date()): string {
	return date.toISOString();
}
