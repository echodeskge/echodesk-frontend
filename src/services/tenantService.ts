import { TenantConfig, Tenant } from '@/types/tenant';

class TenantService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  }

  /**
   * Get tenant configuration by subdomain
   */
  async getTenantBySubdomain(subdomain: string): Promise<TenantConfig | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/tenant/config/?subdomain=${subdomain}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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
   * Get tenant configuration by domain
   */
  async getTenantByDomain(domain: string): Promise<TenantConfig | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/tenant/config/?domain=${domain}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`${this.apiBaseUrl}/api/tenants/list/`, {
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
  async updateLanguage(language: string, authToken?: string): Promise<boolean> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      const response = await fetch(`${this.apiBaseUrl}/api/tenant/language/update/`, {
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
      // Exclude 'www' and other common subdomains
      if (subdomain && !['www', 'api', 'mail', 'admin'].includes(subdomain)) {
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
}

export const tenantService = new TenantService();
