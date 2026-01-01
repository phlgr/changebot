import { createHash } from "node:crypto";

/**
 * Generate URL-safe filename from URL
 * Converts a URL to a filesystem-safe filename by replacing special characters
 * @param url - The URL to convert
 * @returns A lowercase filename with hostname and pathname, ending in .json
 * @throws Error if the URL is invalid
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
 * @param content - The content to hash
 * @returns Hexadecimal string representation of the SHA-256 hash
 */
export function calculateHash(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}

/**
 * Format date as ISO timestamp string
 * @param date - The date to format (defaults to current date/time)
 * @returns ISO 8601 formatted timestamp string
 */
export function formatTimestamp(date: Date = new Date()): string {
	return date.toISOString();
}

/**
 * Truncation limits for notifications
 */
export const TRUNCATION_LIMITS = {
	MAX_LINE_LENGTH: 200, // Maximum characters per line
	MAX_DIFF_LINES: 20, // Maximum number of diff lines
	MAX_DIFF_SIZE: 2000, // Maximum total characters for diff
	MAX_MESSAGE_SIZE: 3500, // Maximum total characters for entire message
} as const;

/**
 * Truncate text to fit within size limits
 * @param text - The text to truncate
 * @param options - Truncation options
 * @returns Truncated text with ellipsis if truncated
 */
export function truncateText(
	text: string,
	options: {
		maxLength?: number;
		maxLines?: number;
		maxTotalSize?: number;
	},
): string {
	const { maxLength, maxLines, maxTotalSize } = options;
	const lines = text.split("\n");
	let result = "";
	let totalSize = 0;

	for (let i = 0; i < lines.length; i++) {
		// Check line count limit
		if (maxLines !== undefined && i >= maxLines) {
			result += `\n... and ${lines.length - i} more lines`;
			break;
		}

		const line = lines[i];
		if (line === undefined) {
			continue;
		}

		let processedLine = line;

		// Truncate individual line if needed
		if (maxLength !== undefined && processedLine.length > maxLength) {
			processedLine = `${processedLine.slice(0, maxLength)}...`;
		}

		const lineSize = processedLine.length + (result ? 1 : 0); // +1 for newline if not first line

		// Check total size limit
		if (maxTotalSize !== undefined && totalSize + lineSize > maxTotalSize) {
			result += `\n... (truncated, ${text.length - totalSize} more characters)`;
			break;
		}

		result += (result ? "\n" : "") + processedLine;
		totalSize += lineSize;
	}

	return result;
}
