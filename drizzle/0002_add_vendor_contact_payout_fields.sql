ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "contact_person_email" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "mobile_money_provider" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "mobile_money_name" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bank_account_name" text;
