CREATE TABLE `admin_login_attempts` (
	`ip_hash` text PRIMARY KEY NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL,
	`last_attempt` text NOT NULL,
	`blocked_until` text
);
