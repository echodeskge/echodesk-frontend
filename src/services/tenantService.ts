import { TenantConfig, Tenant } from '@/types/tenant';

class TenantService {
  private apiBaseUrl: string;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Use development API if in development mode and localhost
    if (this.isDevelopment && typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
      this.apiBaseUrl = process.env.NEXT_PUBLIC_DEV_API_URL || 'http://localhost:8000';
    } else {
      this.apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.echodesk.ge';
    }
  }

  /**
   * Get the correct API URL for a specific tenant
   */
  private getTenantApiUrl(subdomain?: string): string {
    if (this.isDevelopment && typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
      return this.apiBaseUrl;
    }
    
    if (subdomain) {
      // Use tenant-specific API subdomain: tenant.api.echodesk.ge
      const apiDomain = process.env.NEXT_PUBLIC_API_DOMAIN || 'api.echodesk.ge';
      return `https://${subdomain}.${apiDomain}`;
    }
    
    return this.apiBaseUrl;
  }

  /**
   * Get tenant configuration by subdomain
   */
  async getTenantBySubdomain(subdomain: string): Promise<TenantConfig | null> {
    try {
      const apiUrl = this.getTenantApiUrl();
      const endpoint = process.env.NEXT_PUBLIC_TENANT_CONFIG_ENDPOINT || '/api/tenant/config';
      
      const response = await fetch(`${apiUrl}${endpoint}?subdomain=${subdomain}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache', // Always get fresh tenant data
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      if (response.status === 404) {
        console.warn(`Tenant not found for subdomain: ${subdomain}`);
        return null;
      }
      
      throw new Error(`Failed to fetch tenant: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error('Error fetching tenant config:', error);
      throw error;
    }
  }

  /**
   * Get tenant configuration by domain
   */
  async getTenantByDomain(domain: string): Promise<TenantConfig | null> {
    try {
      const apiUrl = this.getTenantApiUrl();
      const endpoint = process.env.NEXT_PUBLIC_TENANT_CONFIG_ENDPOINT || '/api/tenant/config';
      
      const response = await fetch(`${apiUrl}${endpoint}?domain=${domain}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache',
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error fetching tenant config:', error);
      return null;
    }
  }

  /**
   * Get all active tenants
   */
  async getAllTenants(): Promise<Tenant[]> {
    try {
      const apiUrl = this.apiBaseUrl; // Use main API for listing all tenants
      const endpoint = process.env.NEXT_PUBLIC_TENANTS_LIST_ENDPOINT || '/api/tenants/list';
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.tenants || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching tenants list:', error);
      return [];
    }
  }

  /**
   * Update tenant language preference
   */
  async updateLanguage(subdomain: string, language: string, authToken?: string): Promise<boolean> {
    try {
      const apiUrl = this.getTenantApiUrl(subdomain);
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      const response = await fetch(`${apiUrl}/api/tenant/language/update/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ preferred_language: language }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating language:', error);
      return false;
    }
  }

  /**
   * Extract subdomain from current hostname
   */
  getSubdomainFromHostname(hostname: string): string | null {
    const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';
    
    // Handle localhost development
    if (hostname.includes('localhost')) {
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[0] !== 'localhost') {
        return parts[0];
      }
      return null;
    }

    // Production domain handling
    if (hostname.endsWith(`.${mainDomain}`)) {
      const subdomain = hostname.replace(`.${mainDomain}`, '');
      // Exclude 'www' and other system subdomains
      if (subdomain && !['www', 'api', 'mail', 'admin', 'cdn', 'static'].includes(subdomain)) {
        return subdomain;
      }
    }

    return null;
  }

  /**
   * Check if current domain is a tenant domain
   */
  isTenantDomain(hostname: string): boolean {
    return this.getSubdomainFromHostname(hostname) !== null;
  }

  /**
   * Get the current subdomain from browser
   */
  getCurrentSubdomain(): string | null {
    if (typeof window === 'undefined') return null;
    return this.getSubdomainFromHostname(window.location.hostname);
  }

  /**
   * Generate tenant frontend URL
   */
  getTenantUrl(subdomain: string): string {
    const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';
    
    if (this.isDevelopment) {
      return `http://${subdomain}.localhost:3000`;
    }
    
    return `https://${subdomain}.${mainDomain}`;
  }

  /**
   * Generate tenant API URL
   */
  getPublicTenantApiUrl(subdomain: string): string {
    const apiDomain = process.env.NEXT_PUBLIC_API_DOMAIN || 'api.echodesk.ge';
    
    if (this.isDevelopment) {
      return `http://localhost:8000`;
    }
    
    return `https://${subdomain}.${apiDomain}`;
  }
}

export const tenantService = new TenantService();
