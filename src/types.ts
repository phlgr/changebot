export type Config = {
	ntfy: NtfyConfig;
	settings: GlobalSettings;
	websites: Website[];
};

export type NtfyConfig = {
	topic: string;
	server: string;
};

export type GlobalSettings = {
	timeout: number;
	retries: number;
	large_content_threshold: number;
	error_notification_threshold: number; // Only notify after this many consecutive errors
	error_notification_cooldown_ms: number; // Cooldown between error notifications
};

export type Website = {
	name: string;
	url: string;
	selector?: string | null;
	enabled: boolean;
	priority: "default" | "urgent" | "high" | "low" | "min";
	tags?: string[];
	notifyOnFirstRun?: boolean; // Whether to send notification on initial snapshot (default: true)
};

export type Snapshot = {
	url: string;
	name: string;
	current: SnapshotEntry;
	previous?: SnapshotEntry;
	last_check: string;
	change_count: number;
	error_count: number;
	enabled: boolean;
	selector?: string | null;
	last_error_notification_time?: number; // Timestamp of last error notification (for throttling)
};

export type SnapshotEntry = {
	timestamp: string;
	content: string;
	hash: string;
	status: number;
};

export type ChangeResult = {
	url: string;
	name: string;
	changed: boolean;
	isFirstRun: boolean;
	oldHash?: string;
	newHash?: string;
	diff?: string;
	error?: string;
};

export type FetchResult = {
	content: string;
	status: number;
	error?: string;
};
