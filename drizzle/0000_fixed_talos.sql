CREATE TABLE `content_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`content_type` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`title_nl` text DEFAULT '' NOT NULL,
	`title_en` text DEFAULT '' NOT NULL,
	`summary_nl` text DEFAULT '' NOT NULL,
	`summary_en` text DEFAULT '' NOT NULL,
	`body_nl` text DEFAULT '' NOT NULL,
	`body_en` text DEFAULT '' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_content_type_slug` ON `content_entries` (`content_type`,`slug`);--> statement-breakpoint
CREATE INDEX `idx_content_status_sort` ON `content_entries` (`status`,`content_type`,`sort_order`);--> statement-breakpoint
CREATE TABLE `lead_media` (
	`lead_id` text NOT NULL,
	`media_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lead_media_pair` ON `lead_media` (`lead_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `idx_lead_media_lead` ON `lead_media` (`lead_id`);--> statement-breakpoint
CREATE TABLE `lead_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_lead_notes_lead_created` ON `lead_notes` (`lead_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`postcode` text DEFAULT '' NOT NULL,
	`service` text NOT NULL,
	`project_description` text NOT NULL,
	`preferred_contact` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notification_status` text DEFAULT 'pending' NOT NULL,
	`consent_at` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`ip_hash` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`closed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leads_idempotency` ON `leads` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_leads_status_created` ON `leads` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_leads_ip_created` ON `leads` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`alt_nl` text DEFAULT '' NOT NULL,
	`alt_en` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_key_unique` ON `media_assets` (`key`);--> statement-breakpoint
CREATE INDEX `idx_media_public_created` ON `media_assets` (`is_public`,`created_at`);