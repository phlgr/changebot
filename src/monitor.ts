import { config } from "./config";
import { compareContent } from "./differ";
import { fetchWithRetry } from "./fetcher";
import { sendChangeNotification, sendErrorNotification } from "./notifier";
import { loadSnapshot, saveSnapshot } from "./storage";
import type { ChangeResult, Snapshot, SnapshotEntry, Website } from "./types";
import { calculateHash, formatTimestamp } from "./utils";
import { commit, push } from "./git";

/**
 * Main monitoring function
 */
export async function main(): Promise<void> {
	console.log("🔍 Starting website change detection...");

	console.log(
		`📋 Monitoring ${config.websites.filter((w) => w.enabled).length} website(s)`,
	);

	const results: ChangeResult[] = [];
	const updatedSnapshots: string[] = [];

	// Monitor each website
	for (const website of config.websites.filter((w) => w.enabled)) {
		console.log(`\n📡 Checking: ${website.name}`);

		try {
			const result = await monitorWebsite(website);

			if (result.changed || result.isFirstRun) {
				results.push(result);
				updatedSnapshots.push(website.url);
			} else {
				// Still add result for tracking, even if snapshot wasn't updated
				results.push(result);
			}
		} catch (error) {
			console.error(`❌ Failed to monitor ${website.name}:`);

			const errorMessage =
				error instanceof Error ? error.message : String(error);

			// Track error in snapshot
			const existingSnapshot = loadSnapshot(website.url);
			if (existingSnapshot) {
				const snapshot: Snapshot = {
					...existingSnapshot,
					error_count: existingSnapshot.error_count + 1,
				};
				saveSnapshot(snapshot);
				updatedSnapshots.push(website.url);
			}

			// Add error result for summary
			results.push({
				url: website.url,
				name: website.name,
				changed: false,
				isFirstRun: false,
				error: errorMessage,
			});

			// Send error notification
			await sendErrorNotification(
				website,
				error instanceof Error ? error : new Error(errorMessage),
			);
		}
	}

	if (process.argv.includes("--update")) {
		commit("chore: update snapshots [skip ci]");
		push();
	}

	console.log(`\n📊 Summary:`);
	console.log(
		`  - Websites checked: ${config.websites.filter((w) => w.enabled).length}`,
	);
	console.log(`  - Changed: ${results.filter((r) => r.changed).length}`);
	console.log(`  - Initial: ${results.filter((r) => r.isFirstRun).length}`);
	console.log(`  - Errors: ${results.filter((r) => r.error).length}`);

	process.exit(0);
}

/**
 * Monitor a single website
 */
async function monitorWebsite(website: Website): Promise<ChangeResult> {
	// Fetch current content
	const fetchResult = await fetchWithRetry(website, {
		timeout: config.settings.timeout,
		retries: config.settings.retries,
	});

	if (fetchResult.error) {
		throw new Error(fetchResult.error);
	}

	// Create snapshot entry
	const newEntry: SnapshotEntry = {
		timestamp: formatTimestamp(),
		content: fetchResult.content,
		status: fetchResult.status,
		hash: calculateHash(fetchResult.content),
	};

	// Load existing snapshot
	const existing = loadSnapshot(website.url);
	const oldEntry = existing?.current;

	// Compare content
	const result = compareContent(newEntry, oldEntry, website.url, website.name);

	// Update snapshot if changed or first run
	if (result.changed || result.isFirstRun) {
		saveSnapshot({
			url: website.url,
			name: website.name,
			current: newEntry,
			previous: existing?.current,
			last_check: formatTimestamp(),
			change_count: result.changed
				? (existing?.change_count ?? 0) + 1
				: (existing?.change_count ?? 0),
			error_count: existing?.error_count ?? 0,
			enabled: website.enabled,
			selector: website.selector ?? null,
		});

		// Send notification
		await sendChangeNotification(result, website);
	}

	return result;
}

// Run if executed directly
if (import.meta.main) {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
