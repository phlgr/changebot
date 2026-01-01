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
};

export type Website = {
	name: string;
	url: string;
	selector?: string | null;
	enabled: boolean;
	priority: "default" | "urgent" | "high" | "low" | "min";
	tags?: string[];
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
