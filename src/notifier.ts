import { config } from "./config.js";
import type { ChangeResult, Snapshot, Website } from "./types.js";
import { TRUNCATION_LIMITS, formatTimestamp, urlToFilename } from "./utils.js";

const priorityMap: Record<Website["priority"], number> = {
	urgent: 5,
	high: 4,
	default: 3,
	low: 2,
	min: 1,
} as const;

/**
 * Check if error notification should be sent based on throttling rules
 * @param errorCount - Current error count from snapshot
 * @param lastNotificationTime - Timestamp of last error notification (0 if never notified)
 * @returns Object with shouldNotify flag and reason if throttled
 */
function shouldSendErrorNotification(
	errorCount: number,
	lastNotificationTime: number,
): { shouldNotify: boolean; reason?: string } {
	const threshold = config.settings.error_notification_threshold;
	const cooldown = config.settings.error_notification_cooldown_ms;
	const timeSinceLastNotification = Date.now() - lastNotificationTime;

	const shouldNotify =
		errorCount >= threshold && timeSinceLastNotification >= cooldown;

	if (!shouldNotify) {
		if (errorCount < threshold) {
			return {
				shouldNotify: false,
				reason: `error count: ${errorCount}/${threshold}`,
			};
		} else {
			const remainingCooldown = Math.ceil(
				(cooldown - timeSinceLastNotification) / 60000,
			);
			return {
				shouldNotify: false,
				reason: `cooldown: ${remainingCooldown} minutes remaining`,
			};
		}
	}

	return { shouldNotify: true };
}

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
		const baseMessage =
			`Changes detected at ${new Date().toISOString()}\n` +
			`Snapshot: snapshots/${filename}`;

		// Only include diff if it fits within message size limit
		if (result.diff) {
			const fullMessage = `${baseMessage}\n\n${result.diff}`;
			if (fullMessage.length <= TRUNCATION_LIMITS.MAX_MESSAGE_SIZE) {
				message = fullMessage;
			} else {
				// Diff too large, just send summary
				message = `${baseMessage}\n\n(Diff too large to include in notification)`;
			}
		} else {
			message = baseMessage;
		}
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
 * Send error notification with throttling
 * @param website - The website that failed
 * @param error - The error that occurred
 * @param snapshot - The snapshot containing error count and last notification time
 * @returns Updated snapshot with last_error_notification_time set if notification was sent, or null if throttled
 */
export async function sendErrorNotification(
	website: Website,
	error: Error,
	snapshot: Snapshot | null,
): Promise<Snapshot | null> {
	const errorCount = snapshot?.error_count ?? 0;
	const lastNotificationTime = snapshot?.last_error_notification_time ?? 0;

	const { shouldNotify, reason } = shouldSendErrorNotification(
		errorCount,
		lastNotificationTime,
	);

	if (!shouldNotify) {
		console.log(`Skipping error notification for ${website.name} (${reason})`);
		return null;
	}

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

	// Return updated snapshot with notification time
	if (snapshot) {
		return {
			...snapshot,
			last_error_notification_time: Date.now(),
		};
	}
	return null;
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
