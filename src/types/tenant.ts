export interface TenantConfig {
  tenant_id: number;
  tenant_name: string;
  schema_name: string;
  domain_url: string;
  api_url: string;
  preferred_language: string;
  admin_email: string;
  plan: string;
  frontend_url: string;
  theme: {
    primary_color: string;
    secondary_color: string;
    company_name: string;
    logo_url?: string;
  };
  features: {
    max_users: number;
    max_storage: number;
    analytics: boolean;
    custom_branding: boolean;
    api_access: boolean;
    webhooks: boolean;
  };
  localization: {
    language: string;
    timezone: string;
    date_format: string;
  };
}

export interface Tenant {
  schema_name: string;
  domain_url: string;
  frontend_url: string;
  name: string;
}
