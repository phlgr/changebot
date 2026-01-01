import type { Config } from "./types.js";

export const config: Config = {
	ntfy: {
		topic: process.env.NTFY_TOPIC ?? "",
		server: process.env.NTFY_SERVER ?? "https://ntfy.sh",
	},
	settings: {
		timeout: 30000, // Request timeout in ms
		retries: 3, // Retry failed fetches
		large_content_threshold: 1048576, // 1MB warning threshold
		error_notification_threshold: 3, // Only notify after this many consecutive errors
		error_notification_cooldown_ms: 3600000, // 1 hour cooldown between error notifications
	},
	websites: [
		{
			name: "Example Website",
			url: "https://example.com",
			selector: null, // CSS/XPath selector (null = full page)
			enabled: true,
			priority: "high",
		},
	],
};
