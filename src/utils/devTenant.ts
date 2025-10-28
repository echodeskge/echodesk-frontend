/**
 * Development tenant utilities for local development
 *
 * These utilities allow you to set/get/clear a tenant in localStorage
 * for development purposes on localhost.
 */

const DEV_TENANT_KEY = 'dev_tenant';

export const devTenant = {
  /**
   * Set the development tenant
   * @param tenantId - The tenant subdomain/schema name (e.g., 'groot')
   */
  set: (tenantId: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DEV_TENANT_KEY, tenantId);
    console.log(`✓ Development tenant set to: ${tenantId}`);
    console.log('Reload the page to apply changes.');
  },

  /**
   * Get the current development tenant
   * @returns The current tenant ID or null if not set
   */
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(DEV_TENANT_KEY);
  },

  /**
   * Clear the development tenant (to access homepage)
   */
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(DEV_TENANT_KEY);
    console.log('✓ Development tenant cleared. You can now access the homepage.');
    console.log('Reload the page to apply changes.');
  },

  /**
   * Check if a development tenant is set
   * @returns true if a tenant is set, false otherwise
   */
  isSet: (): boolean => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DEV_TENANT_KEY) !== null;
  },
};

// Make it available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).devTenant = devTenant;
  console.log('💡 Development tenant utilities available via window.devTenant');
  console.log('Usage:');
  console.log('  - devTenant.set("groot")  // Set tenant to "groot"');
  console.log('  - devTenant.get()         // Get current tenant');
  console.log('  - devTenant.clear()       // Clear tenant (access homepage)');
  console.log('  - devTenant.isSet()       // Check if tenant is set');
}
