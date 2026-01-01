import { diffLines } from "diff";
import type { ChangeResult, SnapshotEntry } from "./types.js";
import { TRUNCATION_LIMITS, truncateText } from "./utils.js";

/**
 * Compare content and generate change result
 */
export function compareContent(
	newEntry: SnapshotEntry,
	oldEntry: SnapshotEntry | undefined,
	url: string,
	name: string,
): ChangeResult {
	const newHash = newEntry.hash;
	const oldHash = oldEntry?.hash;

	// First run scenario
	if (!oldHash) {
		return {
			url,
			name,
			changed: false,
			isFirstRun: true,
			newHash,
			diff: "",
		};
	}

	// Compare hashes
	const changed = newHash !== oldHash;

	// Generate diff if changed
	let diff = "";
	if (changed) {
		diff = generateDiff(oldEntry.content, newEntry.content);
	}

	return {
		url,
		name,
		changed,
		isFirstRun: false,
		oldHash,
		newHash,
		diff,
	};
}

/**
 * Generate human-readable diff between old and new content
 * @param oldContent - The previous content
 * @param newContent - The new content
 * @returns A formatted diff string with context lines and summary
 */
function generateDiff(oldContent: string, newContent: string): string {
	const changes = diffLines(oldContent, newContent, {
		newlineIsToken: true,
		ignoreWhitespace: false,
	});

	const lines: string[] = [];

	// Only include actual changes (additions and deletions), no context lines
	for (const change of changes) {
		if (change.added) {
			const changeLines = change.value.split("\n").filter((l) => l !== "");
			for (const line of changeLines) {
				lines.push(`+ ${line.trimEnd()}`);
			}
		} else if (change.removed) {
			const changeLines = change.value.split("\n").filter((l) => l !== "");
			for (const line of changeLines) {
				lines.push(`- ${line.trimEnd()}`);
			}
		}
		// Skip unchanged lines - only show actual diffs
	}

	// Use centralized truncation utility
	const diffText = lines.join("\n");
	return truncateText(diffText, {
		maxLength: TRUNCATION_LIMITS.MAX_LINE_LENGTH,
		maxLines: TRUNCATION_LIMITS.MAX_DIFF_LINES,
		maxTotalSize: TRUNCATION_LIMITS.MAX_DIFF_SIZE,
	});
}
