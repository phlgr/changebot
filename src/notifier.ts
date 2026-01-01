import { config } from "./config.js";
import type { ChangeResult, Website } from "./types.js";
import { formatTimestamp, urlToFilename } from "./utils.js";

const priorityMap: Record<Website["priority"], number> = {
	urgent: 5,
	high: 4,
	default: 3,
	low: 2,
	min: 1,
} as const;

/**
 * Send change notification
 */
export async function sendChangeNotification(
	result: ChangeResult,
	website: Website,
): Promise<void> {
	let title: string;
	let message: string;

	if (result.isFirstRun) {
		title = `✅ Initial snapshot: ${result.name}`;
		message =
			`Initial snapshot created for ${result.url}\n` +
			`Content hash: ${result.newHash}\n` +
			`Timestamp: ${new Date().toISOString()}`;
	} else {
		title = `📢 Change detected: ${result.name}`;
		const filename = urlToFilename(result.url);
		message =
			`Changes detected at ${new Date().toISOString()}` +
			`Snapshot: snapshots/${filename}`;
	}

	await sendNtfyNotification({
		topic: config.ntfy.topic,
		title,

		priority: priorityMap[website.priority] ?? priorityMap.default,
		tags: [
			...(website.tags ?? []),
			"changedetection",
			result.isFirstRun ? "initial" : "changed",
		],
		message,
		click: result.url,
	});
}

/**
 * Send error notification
 */
export async function sendErrorNotification(
	website: Website,
	error: Error,
): Promise<void> {
	const title = `❌ Failed to fetch: ${website.name}`;
	const message =
		`Failed to fetch ${website.url}\n\n` +
		`Error: ${error.message}\n` +
		`Timestamp: ${formatTimestamp(new Date())}`;

	await sendNtfyNotification({
		topic: config.ntfy.topic,
		title,
		message,
		priority: priorityMap.urgent,
		tags: [...(website.tags ?? []), "error"],
		click: website.url,
	});
}

/**
 * Send ntfy.sh notification
 */
async function sendNtfyNotification(params: {
	topic: string;
	title: string;
	priority: number;
	message: string;
	tags?: string[];
	click?: string;
}): Promise<void> {
	try {
		const response = await fetch(config.ntfy.server, {
			method: "POST",
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			throw new Error(
				`ntfy.sh returned ${response.status}: ${response.statusText} for ${JSON.stringify(params)}`,
			);
		}

		console.log(`✅ Notification sent: ${params.title}`);
	} catch (error) {
		console.error("Failed to send ntfy notification:", error);
		throw error;
	}
}
