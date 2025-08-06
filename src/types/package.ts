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

export interface TenantSubscription {
  id: number;
  tenant: number;
  package: Package;
  is_active: boolean;
  starts_at: string;
  expires_at?: string;
  agent_count: number;
  current_users: number;
  whatsapp_messages_used: number;
  storage_used_gb: number;
  last_billed_at?: string;
  next_billing_date?: string;
  monthly_cost: number;
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
  package_id: number;
  pricing_model: PricingModel;
  agent_count: number;
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
