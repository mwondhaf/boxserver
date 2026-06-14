CREATE TYPE "public"."payout_method" AS ENUM('mobile_money', 'bank');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('customer', 'rider', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vendor_type" AS ENUM('grocery', 'food');--> statement-breakpoint
CREATE TYPE "public"."actor_role" AS ENUM('customer', 'vendor', 'rider', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('not_fulfilled', 'fulfilled', 'shipped', 'returned');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_type" AS ENUM('delivery', 'pickup', 'self_delivery');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('available', 'unavailable', 'swap_proposed', 'swap_accepted', 'swap_rejected', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash_on_delivery', 'mobile_money', 'card', 'wallet');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('awaiting', 'captured', 'refunded', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('freelance', 'inhouse');--> statement-breakpoint
CREATE TYPE "public"."rider_account_status" AS ENUM('pending', 'active', 'suspended', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."rider_location_status" AS ENUM('offline', 'online', 'busy');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('walking', 'bicycle', 'scooter', 'motorbike', 'car', 'van', 'truck');--> statement-breakpoint
CREATE TYPE "public"."distance_source" AS ENUM('google', 'mapbox', 'haversine');--> statement-breakpoint
CREATE TYPE "public"."pricing_rule_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."box_wallet_status" AS ENUM('processed', 'quarantined', 'already_synced');--> statement-breakpoint
CREATE TYPE "public"."wallet_entity_type" AS ENUM('vendor', 'rider', 'customer', 'platform');--> statement-breakpoint
CREATE TYPE "public"."momo_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."momo_status" AS ENUM('initiated', 'pending', 'success', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."parcel_payment_status" AS ENUM('pending', 'paid', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."parcel_size_category" AS ENUM('small', 'medium', 'large', 'extra_large');--> statement-breakpoint
CREATE TYPE "public"."parcel_status" AS ENUM('draft', 'pending', 'picked_up', 'in_transit', 'delivered', 'canceled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."campaign_budget_type" AS ENUM('spend', 'usage');--> statement-breakpoint
CREATE TYPE "public"."promotion_status" AS ENUM('draft', 'active', 'inactive', 'expired');--> statement-breakpoint
CREATE TYPE "public"."promotion_type" AS ENUM('standard', 'buyget');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('pending', 'qualified', 'rewarded', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."subscription_cadence" AS ENUM('weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."subscription_cycle_status" AS ENUM('scheduled', 'skipped', 'fulfilled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('awaiting_payment', 'active', 'paused', 'canceled', 'completed');--> statement-breakpoint
CREATE TABLE "counters" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "counters_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"city" text,
	"town" text,
	"street" text,
	"address_type" text,
	"building_name" text,
	"apartment_no" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"geohash" text,
	"directions" text,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"inviter_id" varchar(36) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_categories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" varchar(36),
	CONSTRAINT "organization_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "organization_customers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"type" "vendor_type" DEFAULT 'grocery' NOT NULL,
	"cover_photo" text,
	"email" text,
	"phone" text,
	"tin" text,
	"contact_person" text,
	"contact_phone" text,
	"payout_method" "payout_method",
	"payout_mobile_number" text,
	"payout_bank_name" text,
	"payout_bank_account" text,
	"payout_bank_branch" text,
	"country" text DEFAULT 'UG',
	"city_or_district" text,
	"town" text,
	"street" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"geohash" text,
	"google_places_id" text,
	"business_hours" jsonb,
	"timezone" text DEFAULT 'Africa/Kampala',
	"is_busy" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"platform_delivery_enabled" boolean DEFAULT true NOT NULL,
	"self_delivery_enabled" boolean DEFAULT false NOT NULL,
	"self_pickup_enabled" boolean DEFAULT false NOT NULL,
	"self_delivery_fee" numeric(15, 0),
	"self_delivery_radius" numeric(10, 2),
	"self_delivery_estimate" text,
	"pickup_instructions" text,
	"estimated_prep_time" text,
	"minimum_order_amount" numeric(15, 0),
	"commission_rule_id" text,
	"category_id" varchar(36),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" varchar(36) NOT NULL,
	"active_organization_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone" text,
	"platform_role" "platform_role" DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_r2_key" text,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_id" varchar(36),
	"thumbnail_r2_key" text,
	"banner_r2_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category_pricing_rules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"category_id" varchar(36) NOT NULL,
	"markup_percentage" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "menu_modifier_groups" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"product_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"min_selections" integer DEFAULT 0 NOT NULL,
	"max_selections" integer DEFAULT 1 NOT NULL,
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "menu_modifier_options" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"modifier_group_id" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"price_add" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "money_amounts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"price_set_id" varchar(36) NOT NULL,
	"currency" text DEFAULT 'UGX' NOT NULL,
	"amount" integer NOT NULL,
	"sale_amount" integer,
	"min_quantity" integer,
	"max_quantity" integer
);
--> statement-breakpoint
CREATE TABLE "price_sets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"variant_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	CONSTRAINT "price_sets_variant_id_unique" UNIQUE("variant_id")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"product_id" varchar(36) NOT NULL,
	"category_id" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"product_id" varchar(36) NOT NULL,
	"r2_key" text NOT NULL,
	"alt" text,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_tags" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"product_id" varchar(36) NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"product_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"sku" text,
	"unit" text NOT NULL,
	"weight_grams" integer,
	"barcode" text,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"brand_id" varchar(36),
	"category_id" varchar(36),
	"organization_id" varchar(36),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variant_collection_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"collection_id" varchar(36) NOT NULL,
	"variant_id" varchar(36) NOT NULL,
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "variant_collections" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "cart_item_modifiers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"cart_item_id" varchar(36) NOT NULL,
	"modifier_option_id" varchar(36) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"cart_id" varchar(36) NOT NULL,
	"variant_id" varchar(36) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36),
	"session_id" text,
	"organization_id" varchar(36) NOT NULL,
	"currency_code" text DEFAULT 'UGX' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"order_id" varchar(36) NOT NULL,
	"actor_user_id" varchar(36),
	"event_type" text NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status",
	"reason" text,
	"actor_name" text,
	"actor_role" "actor_role",
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"order_id" varchar(36) NOT NULL,
	"order_item_id" varchar(36),
	"event_type" text NOT NULL,
	"actor_user_id" varchar(36),
	"actor_role" "actor_role",
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_modifiers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"order_item_id" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"price_add" integer DEFAULT 0 NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"order_id" varchar(36) NOT NULL,
	"product_id" varchar(36) NOT NULL,
	"variant_id" varchar(36) NOT NULL,
	"title" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"vendor_unit_price" integer,
	"markup_amount" integer,
	"subtotal" integer NOT NULL,
	"tax_total" integer DEFAULT 0 NOT NULL,
	"item_status" "item_status",
	"proposed_variant_id" varchar(36),
	"proposed_price" integer,
	"proposed_title" text,
	"proposed_image_r2_key" text,
	"swap_deadline_at" timestamp with time zone,
	"swap_reported_by" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"display_id" integer NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"fulfillment_status" "fulfillment_status" DEFAULT 'not_fulfilled' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'awaiting' NOT NULL,
	"fulfillment_type" "fulfillment_type" NOT NULL,
	"payment_method" "payment_method",
	"user_id" varchar(36),
	"is_guest" boolean DEFAULT false NOT NULL,
	"guest_name" text,
	"guest_phone" text,
	"guest_session_id" text,
	"guest_source" text,
	"delivery_lat" numeric(10, 7),
	"delivery_lng" numeric(10, 7),
	"delivery_phone" text,
	"delivery_description" text,
	"customer_address_id" varchar(36),
	"delivery_zone_id" varchar(36),
	"delivery_quote_id" varchar(36),
	"rider_id" varchar(36),
	"rider_name" text,
	"rider_phone" text,
	"offered_to_rider_id" varchar(36),
	"offered_at" timestamp with time zone,
	"subtotal" integer,
	"total" integer DEFAULT 0 NOT NULL,
	"tax_total" integer DEFAULT 0 NOT NULL,
	"discount_total" integer DEFAULT 0 NOT NULL,
	"delivery_total" integer DEFAULT 0 NOT NULL,
	"service_fee_total" integer,
	"small_order_fee_total" integer,
	"delivery_subsidy_total" integer,
	"markup_total" integer,
	"rider_delivery_fee" integer,
	"currency_code" text DEFAULT 'UGX' NOT NULL,
	"commission_rule_id" text,
	"refund_pending" boolean DEFAULT false NOT NULL,
	"refund_idempotency_key" text,
	"prep_started_at" timestamp with time zone,
	"vendor_pickup_code" text,
	"proof_of_delivery_r2_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_incidents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"delivery_kind" text NOT NULL,
	"delivery_id" varchar(36) NOT NULL,
	"rider_user_id" varchar(36) NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"photo_r2_keys" text[],
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"auto_canceled_delivery" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_locations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"geohash" text,
	"status" "rider_location_status" DEFAULT 'offline' NOT NULL,
	"last_updated_at" timestamp with time zone NOT NULL,
	"active_order_id" varchar(36),
	"active_parcel_id" varchar(36),
	CONSTRAINT "rider_locations_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "rider_payouts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"rider_id" varchar(36) NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'UGX' NOT NULL,
	"payout_method" text NOT NULL,
	"payout_details" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"delivery_count" integer DEFAULT 0 NOT NULL,
	"transaction_ref" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_ratings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"rider_id" varchar(36) NOT NULL,
	"order_id" varchar(36),
	"parcel_id" varchar(36),
	"customer_user_id" varchar(36) NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_stage_memberships" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"rider_id" varchar(36) NOT NULL,
	"stage_id" varchar(36) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"assigned_by" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"rider_code" text NOT NULL,
	"name" text NOT NULL,
	"account_status" "rider_account_status" DEFAULT 'pending' NOT NULL,
	"phone_number" text NOT NULL,
	"email" text,
	"next_of_kin_name" text,
	"next_of_kin_phone" text,
	"next_of_kin_relation" text,
	"national_id" text,
	"driving_permit_number" text,
	"driving_permit_expiry" timestamp with time zone,
	"tin" text,
	"helmet_verified" boolean DEFAULT false NOT NULL,
	"insurance_provider" text,
	"insurance_policy_number" text,
	"insurance_expiry" timestamp with time zone,
	"vehicle_type" "vehicle_type" NOT NULL,
	"vehicle_plate" text,
	"vehicle_make" text,
	"vehicle_model" text,
	"vehicle_color" text,
	"vehicle_year" integer,
	"home_lat" numeric(10, 7),
	"home_lng" numeric(10, 7),
	"photo_r2_key" text,
	"national_id_r2_key" text,
	"driving_permit_r2_key" text,
	"insurance_r2_key" text,
	"payout_method" text,
	"payout_mobile_number" text,
	"payout_bank_name" text,
	"payout_bank_account" text,
	"employment_type" "employment_type",
	"rating_sum" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"completed_deliveries" integer DEFAULT 0 NOT NULL,
	"canceled_deliveries" integer DEFAULT 0 NOT NULL,
	"total_earnings" integer DEFAULT 0 NOT NULL,
	"current_stage_id" varchar(36),
	"approved_at" timestamp with time zone,
	"approved_by" varchar(36),
	"suspended_at" timestamp with time zone,
	"suspended_by" varchar(36),
	"suspension_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "riders_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "riders_rider_code_unique" UNIQUE("rider_code")
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text NOT NULL,
	"district" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"geohash" text,
	"zone_id" varchar(36),
	"capacity" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"contact_name" text,
	"contact_phone" text,
	CONSTRAINT "stages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "delivery_quotes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"pickup_lat" numeric(10, 7),
	"pickup_lng" numeric(10, 7),
	"dropoff_lat" numeric(10, 7),
	"dropoff_lng" numeric(10, 7),
	"distance_meters" integer NOT NULL,
	"distance_source" "distance_source" NOT NULL,
	"estimated_duration_seconds" integer,
	"base_fee" integer NOT NULL,
	"rate_per_km" integer NOT NULL,
	"distance_fee" integer NOT NULL,
	"surge_multiplier" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"min_fee" integer NOT NULL,
	"delivery_fee" integer NOT NULL,
	"zone_id" varchar(36),
	"rule_id" varchar(36),
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"size_category" text,
	"package_fee" integer,
	"fragile_fee" integer,
	"insurance_fee" integer,
	"total_package_fee" integer,
	"total_fare" integer,
	"commission_rule_id" text,
	"order_id" varchar(36),
	"parcel_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"country" text DEFAULT 'UG' NOT NULL,
	"center_lat" numeric(10, 7) NOT NULL,
	"center_lng" numeric(10, 7) NOT NULL,
	"max_distance_meters" integer NOT NULL,
	"color" text,
	"active" boolean DEFAULT true NOT NULL,
	"suspended_reason" text,
	"suspended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"zone_id" varchar(36),
	"name" text NOT NULL,
	"base_fee" integer NOT NULL,
	"rate_per_km" integer NOT NULL,
	"min_fee" integer NOT NULL,
	"surge_multiplier" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"days_of_week" text[],
	"start_hour" integer,
	"end_hour" integer,
	"status" "pricing_rule_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zone_commission_mappings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"zone_id" varchar(36) NOT NULL,
	"box_wallet_commission_rule_id" text NOT NULL,
	"rule_name" text,
	CONSTRAINT "zone_commission_mappings_zone_id_unique" UNIQUE("zone_id")
);
--> statement-breakpoint
CREATE TABLE "box_wallet_auto_create_log" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"entity_type" "wallet_entity_type" NOT NULL,
	"organization_id" varchar(36),
	"rider_id" varchar(36),
	"user_id" varchar(36),
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "box_wallet_mappings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"entity_type" "wallet_entity_type" NOT NULL,
	"organization_id" varchar(36),
	"rider_id" varchar(36),
	"user_id" varchar(36),
	"box_wallet_id" text NOT NULL,
	"entity_name" text NOT NULL,
	"auto_created" text DEFAULT 'false',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "box_wallet_order_confirmations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"order_id" varchar(36) NOT NULL,
	"box_wallet_order_id" text NOT NULL,
	"box_wallet_status" "box_wallet_status" NOT NULL,
	"correlation_id" text NOT NULL,
	"vendor_amount" integer,
	"rider_amount" integer,
	"platform_amount" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "box_wallet_order_confirmations_correlation_id_unique" UNIQUE("correlation_id")
);
--> statement-breakpoint
CREATE TABLE "box_wallet_parcel_confirmations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"parcel_id" varchar(36) NOT NULL,
	"box_wallet_order_id" text NOT NULL,
	"box_wallet_status" "box_wallet_status" NOT NULL,
	"correlation_id" text NOT NULL,
	"package_fee" integer,
	"delivery_fee" integer,
	"total_fare" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "box_wallet_parcel_confirmations_correlation_id_unique" UNIQUE("correlation_id")
);
--> statement-breakpoint
CREATE TABLE "mobile_money_payments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"box_wallet_payment_id" text,
	"direction" "momo_direction" NOT NULL,
	"status" "momo_status" DEFAULT 'initiated' NOT NULL,
	"phone_number" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'UGX' NOT NULL,
	"provider" text,
	"customer_reference" text,
	"internal_reference" text,
	"charge" integer,
	"description" text,
	"failure_reason" text,
	"order_id" varchar(36),
	"parcel_id" varchar(36),
	"customer_user_id" varchar(36),
	"entity_type" text,
	"initiated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "mobile_money_payments_customer_reference_unique" UNIQUE("customer_reference")
);
--> statement-breakpoint
CREATE TABLE "parcel_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"parcel_id" varchar(36) NOT NULL,
	"event_type" text NOT NULL,
	"status" "parcel_status",
	"description" text,
	"actor_user_id" varchar(36),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcel_pricing_rules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"size_category" "parcel_size_category" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"package_fee" integer NOT NULL,
	"fragile_multiplier" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"insurance_rate_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"insurance_min_fee" integer DEFAULT 0 NOT NULL,
	"max_weight_kg" numeric(6, 2),
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcels" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"display_id" integer NOT NULL,
	"sender_user_id" varchar(36) NOT NULL,
	"pickup_name" text NOT NULL,
	"pickup_phone" text NOT NULL,
	"pickup_address" text NOT NULL,
	"pickup_lat" numeric(10, 7),
	"pickup_lng" numeric(10, 7),
	"pickup_geohash" text,
	"pickup_notes" text,
	"dropoff_name" text NOT NULL,
	"dropoff_phone" text NOT NULL,
	"dropoff_address" text NOT NULL,
	"dropoff_lat" numeric(10, 7),
	"dropoff_lng" numeric(10, 7),
	"dropoff_geohash" text,
	"dropoff_notes" text,
	"description" text NOT NULL,
	"weight_kg" numeric(6, 2),
	"size_category" "parcel_size_category" NOT NULL,
	"fragile" boolean DEFAULT false NOT NULL,
	"value_amount" integer,
	"value_currency" text DEFAULT 'UGX',
	"status" "parcel_status" DEFAULT 'draft' NOT NULL,
	"rider_id" varchar(36),
	"rider_name" text,
	"rider_phone" text,
	"offered_to_rider_id" varchar(36),
	"offered_at" timestamp with time zone,
	"quote_id" varchar(36),
	"price_amount" integer,
	"package_fee_amount" integer,
	"delivery_fee_amount" integer,
	"commission_rule_id" text,
	"rider_delivery_fee" integer,
	"payment_status" "parcel_payment_status" DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"pickup_code" text,
	"delivery_code" text,
	"proof_of_delivery_r2_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_methods" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"promotion_id" varchar(36) NOT NULL,
	"type" text NOT NULL,
	"target_type" text NOT NULL,
	"allocation" text,
	"value" integer NOT NULL,
	"buy_quantity" integer,
	"get_quantity" integer,
	"get_discount_type" text,
	"get_discount_value" integer,
	"vendor_pays_delivery" boolean DEFAULT false,
	CONSTRAINT "application_methods_promotion_id_unique" UNIQUE("promotion_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_budget_usages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"budget_id" varchar(36) NOT NULL,
	"order_id" varchar(36),
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_budgets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"campaign_id" varchar(36) NOT NULL,
	"type" "campaign_budget_type" NOT NULL,
	"currency_code" text DEFAULT 'UGX' NOT NULL,
	"limit_amount" integer,
	"used_amount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"campaign_identifier" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"organization_id" varchar(36),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_rule_values" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"rule_id" varchar(36) NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_rules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"promotion_id" varchar(36) NOT NULL,
	"attribute" text NOT NULL,
	"operator" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_usages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"promotion_id" varchar(36) NOT NULL,
	"order_id" varchar(36),
	"customer_user_id" varchar(36) NOT NULL,
	"discount_amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" "promotion_type" DEFAULT 'standard' NOT NULL,
	"status" "promotion_status" DEFAULT 'draft' NOT NULL,
	"is_automatic" boolean DEFAULT false,
	"is_tax_inclusive" boolean DEFAULT false,
	"campaign_id" varchar(36),
	"organization_id" varchar(36),
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"customer_usage_limit" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"code" text NOT NULL,
	"reward_amount" integer NOT NULL,
	"reward_currency" text DEFAULT 'UGX' NOT NULL,
	"total_referrals" integer DEFAULT 0 NOT NULL,
	"max_referrals" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"campaign_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"referrer_user_id" varchar(36) NOT NULL,
	"referee_user_id" varchar(36) NOT NULL,
	"referral_code_id" varchar(36) NOT NULL,
	"status" "referral_status" DEFAULT 'pending' NOT NULL,
	"qualifying_order_id" varchar(36),
	"reward_amount" integer,
	"rewarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_cycles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"subscription_id" varchar(36) NOT NULL,
	"cycle_number" integer NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"order_id" varchar(36),
	"status" "subscription_cycle_status" DEFAULT 'scheduled' NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plan_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"plan_id" varchar(36) NOT NULL,
	"variant_id" varchar(36) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"is_swappable" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plan_slots" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"plan_id" varchar(36) NOT NULL,
	"day_of_week" integer,
	"day_of_month" integer,
	"start_hour" integer,
	"end_hour" integer,
	"capacity" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"cover_r2_key" text,
	"cadence" "subscription_cadence" NOT NULL,
	"total_cycles" integer NOT NULL,
	"bundle_price_per_cycle" integer NOT NULL,
	"markup_per_cycle" integer,
	"auto_renew" boolean DEFAULT false,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"plan_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"customer_user_id" varchar(36) NOT NULL,
	"customer_address_id" varchar(36),
	"status" "subscription_status" DEFAULT 'awaiting_payment' NOT NULL,
	"plan_name" text NOT NULL,
	"slot_snapshot" text,
	"items_snapshot" text,
	"total_cycles" integer NOT NULL,
	"cycles_remaining" integer NOT NULL,
	"bundle_price_per_cycle" integer NOT NULL,
	"items_total_prepaid" integer NOT NULL,
	"delivery_fee_per_cycle" integer DEFAULT 0 NOT NULL,
	"delivery_total_prepaid" integer DEFAULT 0 NOT NULL,
	"markup_per_cycle" integer,
	"grand_total_prepaid" integer NOT NULL,
	"payment_id" varchar(36),
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"paused_until" timestamp with time zone,
	"skip_next_run" boolean DEFAULT false,
	"canceled_at" timestamp with time zone,
	"cancel_reason" text,
	"refund_amount" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_time_boosts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"category_id" varchar(36) NOT NULL,
	"time_slot" integer NOT NULL,
	"boost_multiplier" numeric(4, 2) DEFAULT '1.00' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_of_day_recommendations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"time_slot" integer NOT NULL,
	"variant_ids" text[] DEFAULT '{}' NOT NULL,
	"scores" numeric(10, 4)[] DEFAULT '{}' NOT NULL,
	"label" text,
	"recomputed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_time_of_day_recommendations_time_slot" UNIQUE("time_slot")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" text DEFAULT 'platform' NOT NULL,
	"mobile_money_cod_enabled" boolean DEFAULT true NOT NULL,
	"card_enabled" boolean DEFAULT false NOT NULL,
	"wallet_enabled" boolean DEFAULT false NOT NULL,
	"cash_on_delivery_enabled" boolean DEFAULT true NOT NULL,
	"mobile_money_instructions" text,
	"service_grocery_enabled" boolean DEFAULT true NOT NULL,
	"service_parcels_enabled" boolean DEFAULT true NOT NULL,
	"referral_enabled" boolean DEFAULT false NOT NULL,
	"referral_reward_amount" integer DEFAULT 0 NOT NULL,
	"support_phone" text,
	"support_email" text,
	"markup_enabled" boolean DEFAULT false NOT NULL,
	"service_fee_enabled" boolean DEFAULT false NOT NULL,
	"service_fee_type" text DEFAULT 'percentage',
	"service_fee_amount" integer DEFAULT 0 NOT NULL,
	"service_fee_cap" integer,
	"small_order_fee_enabled" boolean DEFAULT false NOT NULL,
	"small_order_fee_threshold" integer DEFAULT 0 NOT NULL,
	"small_order_fee_amount" integer DEFAULT 0 NOT NULL,
	"unconfirmed_order_timeout_minutes" integer DEFAULT 60 NOT NULL,
	"rider_offer_window_seconds" integer DEFAULT 60 NOT NULL,
	"rider_lead_time_minutes" integer DEFAULT 15 NOT NULL,
	"cart_ttl_hours" integer DEFAULT 24 NOT NULL,
	"extra" jsonb,
	"updated_at" timestamp with time zone NOT NULL,
	"updated_by" varchar(36),
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_customers" ADD CONSTRAINT "organization_customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_customers" ADD CONSTRAINT "organization_customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_pricing_rules" ADD CONSTRAINT "category_pricing_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_modifier_groups" ADD CONSTRAINT "menu_modifier_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_modifier_groups" ADD CONSTRAINT "menu_modifier_groups_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_modifier_options" ADD CONSTRAINT "menu_modifier_options_modifier_group_id_menu_modifier_groups_id_fk" FOREIGN KEY ("modifier_group_id") REFERENCES "public"."menu_modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_amounts" ADD CONSTRAINT "money_amounts_price_set_id_price_sets_id_fk" FOREIGN KEY ("price_set_id") REFERENCES "public"."price_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_sets" ADD CONSTRAINT "price_sets_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_sets" ADD CONSTRAINT "price_sets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_collection_items" ADD CONSTRAINT "variant_collection_items_collection_id_variant_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."variant_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_collection_items" ADD CONSTRAINT "variant_collection_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_collections" ADD CONSTRAINT "variant_collections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item_modifiers" ADD CONSTRAINT "cart_item_modifiers_cart_item_id_cart_items_id_fk" FOREIGN KEY ("cart_item_id") REFERENCES "public"."cart_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item_modifiers" ADD CONSTRAINT "cart_item_modifiers_modifier_option_id_menu_modifier_options_id_fk" FOREIGN KEY ("modifier_option_id") REFERENCES "public"."menu_modifier_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_events" ADD CONSTRAINT "order_item_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_events" ADD CONSTRAINT "order_item_events_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_address_id_customer_addresses_id_fk" FOREIGN KEY ("customer_address_id") REFERENCES "public"."customer_addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_locations" ADD CONSTRAINT "rider_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_payouts" ADD CONSTRAINT "rider_payouts_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_ratings" ADD CONSTRAINT "rider_ratings_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_stage_memberships" ADD CONSTRAINT "rider_stage_memberships_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_stage_memberships" ADD CONSTRAINT "rider_stage_memberships_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_zone_id_delivery_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."delivery_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_quotes" ADD CONSTRAINT "delivery_quotes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_zone_id_delivery_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."delivery_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_commission_mappings" ADD CONSTRAINT "zone_commission_mappings_zone_id_delivery_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."delivery_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_wallet_order_confirmations" ADD CONSTRAINT "box_wallet_order_confirmations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_money_payments" ADD CONSTRAINT "mobile_money_payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_events" ADD CONSTRAINT "parcel_events_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_quote_id_delivery_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."delivery_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_methods" ADD CONSTRAINT "application_methods_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_budget_usages" ADD CONSTRAINT "campaign_budget_usages_budget_id_campaign_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."campaign_budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_budget_usages" ADD CONSTRAINT "campaign_budget_usages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_budgets" ADD CONSTRAINT "campaign_budgets_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_rule_values" ADD CONSTRAINT "promotion_rule_values_rule_id_promotion_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."promotion_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_rules" ADD CONSTRAINT "promotion_rules_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_user_id_users_id_fk" FOREIGN KEY ("referee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referral_code_id_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_cycles" ADD CONSTRAINT "subscription_cycles_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_cycles" ADD CONSTRAINT "subscription_cycles_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plan_items" ADD CONSTRAINT "subscription_plan_items_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plan_items" ADD CONSTRAINT "subscription_plan_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plan_slots" ADD CONSTRAINT "subscription_plan_slots_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_address_id_customer_addresses_id_fk" FOREIGN KEY ("customer_address_id") REFERENCES "public"."customer_addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_time_boosts" ADD CONSTRAINT "category_time_boosts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organizations_geohash_idx" ON "organizations" USING btree ("geohash");--> statement-breakpoint
CREATE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "product_variants_org_idx" ON "product_variants" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "products_org_idx" ON "products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "orders_org_idx" ON "orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "riders_user_id_idx" ON "riders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "delivery_zones_city_idx" ON "delivery_zones" USING btree ("city");