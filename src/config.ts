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
	},
	websites: [
		{
			name: "Example Website",
			url: "https://example.com",
			selector: null, // CSS/XPath selector (null = full page)
			enabled: true,
			priority: "high",
		},
		{
			name: "Product Page",
			url: "https://store.example.com/product/123",
			selector: ".product-info", // CSS selector
			enabled: true,
			priority: "default",
		},
	],
};
