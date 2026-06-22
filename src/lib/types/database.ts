export type UserRole = "admin" | "client";

export type SiteStatus = "building" | "active" | "suspended" | "error";

export type TemplateId = "universal" | "restaurant" | "clinic";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "inactive";

export type DomainVerificationStatus =
  | "pending"
  | "verified"
  | "failed";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  slug: string;
  template_id: TemplateId;
  status: SiteStatus;
  owner_id: string | null;
  business_name: string;
  custom_domain: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteContent {
  site_id: string;
  content: Record<string, unknown>;
  version: number;
  updated_at: string;
}

export interface SiteSeo {
  site_id: string;
  title: string;
  description: string;
  keywords: string[];
  schema_markup: Record<string, unknown>;
  updated_at: string;
}

export interface Subscription {
  id: string;
  site_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  site_id: string;
  domain: string;
  verification_status: DomainVerificationStatus;
  vercel_domain_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteHealth {
  id: string;
  site_id: string;
  status: "up" | "down" | "degraded";
  last_checked: string;
  response_time_ms: number | null;
  error_message: string | null;
}
