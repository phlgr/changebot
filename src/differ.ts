import { diffLines } from "diff";
import type { ChangeResult, SnapshotEntry } from "./types.js";

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
 * Generate human-readable diff
 */
function generateDiff(oldContent: string, newContent: string): string {
	const changes = diffLines(oldContent, newContent, {
		newlineIsToken: true,
		ignoreWhitespace: false,
	});

	const lines: string[] = [];
	let additions = 0;
	let deletions = 0;
	const contextLines = 2; // Number of unchanged lines to show around changes
	let lastUnchangedLines: string[] = [];

	for (const change of changes) {
		if (change.added) {
			// Add context before addition if available
			if (lastUnchangedLines.length > 0) {
				for (const ctx of lastUnchangedLines.slice(-contextLines)) {
					lines.push(`  ${ctx.trimEnd()}`);
				}
				lastUnchangedLines = [];
			}
			const changeLines = change.value.split("\n").filter((l) => l !== "");
			for (const line of changeLines) {
				lines.push(`+ ${line.trimEnd()}`);
				additions++;
			}
		} else if (change.removed) {
			// Add context before deletion if available
			if (lastUnchangedLines.length > 0) {
				for (const ctx of lastUnchangedLines.slice(-contextLines)) {
					lines.push(`  ${ctx.trimEnd()}`);
				}
				lastUnchangedLines = [];
			}
			const changeLines = change.value.split("\n").filter((l) => l !== "");
			for (const line of changeLines) {
				lines.push(`- ${line.trimEnd()}`);
				deletions++;
			}
		} else {
			// Store unchanged lines for context (keep only recent ones)
			const unchangedLines = change.value.split("\n").filter((l) => l !== "");
			lastUnchangedLines.push(...unchangedLines);
			// Keep only the last few unchanged lines for context
			if (lastUnchangedLines.length > contextLines * 2) {
				lastUnchangedLines = lastUnchangedLines.slice(-contextLines * 2);
			}
		}
	}

	// Limit diff size for notifications
	const maxLines = 50;
	let diffOutput = lines.slice(0, maxLines).join("\n");

	if (lines.length > maxLines) {
		diffOutput += `\n... and ${lines.length - maxLines} more lines`;
	}

	// Add summary
	diffOutput = `Changes summary: ${additions} additions, ${deletions} deletions\n\n${diffOutput}`;

	return diffOutput;
}
