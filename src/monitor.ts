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

	// Cache enabled websites to avoid multiple filter calls
	const enabledWebsites = config.websites.filter((w) => w.enabled);
	console.log(`📋 Monitoring ${enabledWebsites.length} website(s)`);

	const results: ChangeResult[] = [];

	// Monitor websites in parallel
	const monitoringPromises = enabledWebsites.map(async (website) => {
		console.log(`\n📡 Checking: ${website.name}`);

		try {
			const result = await monitorWebsite(website);
			return { success: true, result, website };
		} catch (error) {
			console.error(`❌ Failed to monitor ${website.name}:`);

			const errorMessage =
				error instanceof Error ? error.message : String(error);

			const existingSnapshot = loadSnapshot(website.url);
			let snapshot: Snapshot;

			if (existingSnapshot) {
				snapshot = {
					...existingSnapshot,
					error_count: existingSnapshot.error_count + 1,
				};
			} else {
				snapshot = {
					url: website.url,
					name: website.name,
					current: {
						timestamp: formatTimestamp(),
						content: "",
						hash: "",
						status: 0,
					},
					last_check: formatTimestamp(),
					change_count: 0,
					error_count: 1,
					enabled: website.enabled,
					selector: website.selector ?? null,
				};
			}

			saveSnapshot(snapshot);

			// Add error result for summary
			const errorResult: ChangeResult = {
				url: website.url,
				name: website.name,
				changed: false,
				isFirstRun: false,
				error: errorMessage,
			};

			// Send error notification with throttling (catch errors to prevent one failure from stopping others)
			const currentSnapshot = snapshot;

			try {
				const updatedSnapshot = await sendErrorNotification(
					website,
					error instanceof Error ? error : new Error(errorMessage),
					currentSnapshot,
				);

				// Save updated snapshot if notification was sent (contains updated last_error_notification_time)
				if (updatedSnapshot) {
					saveSnapshot(updatedSnapshot);
				}
			} catch (notificationError) {
				console.error(
					`Failed to send error notification for ${website.name}:`,
					notificationError,
				);
			}

			return { success: false, result: errorResult, website };
		}
	});

	// Wait for all monitoring tasks to complete
	const monitoringResults = await Promise.allSettled(monitoringPromises);

	// Process results
	for (const result of monitoringResults) {
		if (result.status === "fulfilled") {
			results.push(result.value.result);
		} else {
			// Handle unexpected promise rejection
			console.error("Unexpected error in monitoring:", result.reason);
		}
	}

	// Commit and push if --update flag is set and there are changes
	if (process.argv.includes("--update")) {
		try {
			const changedWebsites = results
				.filter((r) => r.changed || r.isFirstRun)
				.map((r) => r.name);

			if (changedWebsites.length > 0) {
				const commitMessage =
					changedWebsites.length === 1
						? `chore: update snapshot for ${changedWebsites[0]} [skip ci]`
						: `chore: update snapshots for ${changedWebsites.length} website(s) [skip ci]`;

				await commit(commitMessage);
				await push();
			} else {
				console.log("No changes to commit");
			}
		} catch (error) {
			console.error("Failed to commit/push changes:", error);
			// Don't exit with error code - allow summary to be shown
		}
	}

	console.log(`\n📊 Summary:`);
	console.log(`  - Websites checked: ${enabledWebsites.length}`);
	console.log(`  - Changed: ${results.filter((r) => r.changed).length}`);
	console.log(`  - Initial: ${results.filter((r) => r.isFirstRun).length}`);
	console.log(`  - Errors: ${results.filter((r) => r.error).length}`);
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

		// Send notification if enabled (catch errors to prevent notification failure from breaking monitoring)
		const shouldNotify =
			(result.isFirstRun && website.notifyOnFirstRun !== false) ||
			result.changed;

		if (shouldNotify) {
			try {
				await sendChangeNotification(result, website);
			} catch (error) {
				console.error(
					`Failed to send change notification for ${website.name}:`,
					error,
				);
			}
		}
	}

	return result;
}

// Run if executed directly
if (import.meta.main) {
	main()
		.then(() => {
			// Exit successfully
			process.exit(0);
		})
		.catch((error) => {
			console.error("Fatal error:", error);
			process.exit(1);
		});
}
