export type PricingModel = 'agent' | 'crm';

// API Response types to match the generated API
export interface PackageList {
  id: number;
  name: string;
  display_name: string;
  description: string;
  pricing_model: PricingModel;
  price_gel: string;
  max_users?: number;
  max_whatsapp_messages: number;
  max_storage_gb: number;
  is_highlighted: boolean;
  features_list: string[];
  pricing_suffix: string;
}

export type Package = PackageList;

export interface PaginatedPackageListList {
  count: number;
  next?: string;
  previous?: string;
  results: PackageList[];
}

export interface Feature {
  id: number;
  key: string;
  name: string;
  description?: string;
  category?: string;
  category_display: string;
  icon?: string;
  price_per_user_gel: string;
  price_unlimited_gel?: string;
  sort_order?: number;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantSubscription {
  id: number;
  tenant: number;
  package?: Package | null;  // Now optional for feature-based subscriptions
  package_details?: Package | null;
  selected_features: Feature[];  // New: selected features
  selected_feature_ids?: number[];  // For write operations
  agent_count: number;  // Now required, in increments of 10 (10-200)
  is_active: boolean;
  starts_at: string;
  expires_at?: string;
  current_users: number;
  whatsapp_messages_used: number;
  storage_used_gb: number;
  last_billed_at?: string;
  next_billing_date?: string;
  monthly_cost: number;  // Calculated as: Σ(feature.price_per_user_gel * agent_count)
  created_at: string;
  updated_at: string;
}

export interface PackageListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Package[];
}

export interface TenantRegistrationRequest {
  company_name: string;
  domain: string;
  description?: string;
  package_id?: number;  // Optional for feature-based registration
  feature_ids?: number[];  // New: for feature-based registration
  pricing_model: PricingModel;
  agent_count: number;  // Required: 10, 20, 30... up to 200
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
  preferred_language: string;
}

export interface TenantRegistrationResponse {
  message: string;
  tenant: {
    id: number;
    name: string;
    schema_name: string;
    domain_url: string;
    admin_email: string;
    preferred_language: string;
  };
  subscription: {
    package_name: string;
    monthly_cost: number;
    agent_count: number;
    trial_expires: string;
    limits: {
      max_users?: number;
      max_whatsapp_messages: number;
      max_storage_gb: number;
    };
  };
  frontend_url: string;
  api_url: string;
  login_url: string;
  deployment_status: string;
  credentials: {
    email: string;
    note: string;
  };
}
