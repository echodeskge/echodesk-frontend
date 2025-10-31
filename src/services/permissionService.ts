import { User } from "@/api/generated/interfaces";

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  description?: string;
  requiredFeatureKey?: string; // Feature key required to access this menu item (optional - items without this are always visible)
  isPremium?: boolean;
  isLocked?: boolean;
}

export interface PermissionMap {
  [key: string]: boolean;
}

export interface RolePermissions {
  [roleName: string]: string[];
}

// Simplified permission categories mapping to granular Django permissions
export interface PermissionCategory {
  id: string;
  label: string;
  description: string;
  permissions: string[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'tickets',
    label: 'Tickets',
    description: 'Full access to ticket management including tags, comments, and columns',
    permissions: [
      // Ticket permissions
      'tickets.add_ticket',
      'tickets.change_ticket',
      'tickets.delete_ticket',
      'tickets.view_ticket',
      // Tag permissions
      'tickets.add_tag',
      'tickets.change_tag',
      'tickets.delete_tag',
      'tickets.view_tag',
      // Ticket column permissions
      'tickets.add_ticketcolumn',
      'tickets.change_ticketcolumn',
      'tickets.delete_ticketcolumn',
      'tickets.view_ticketcolumn',
      // Ticket comment permissions
      'tickets.add_ticketcomment',
      'tickets.change_ticketcomment',
      'tickets.delete_ticketcomment',
      'tickets.view_ticketcomment',
      // Ticket status permissions
      'tickets.add_ticketstatus',
      'tickets.change_ticketstatus',
      'tickets.delete_ticketstatus',
      'tickets.view_ticketstatus',
      // Board permissions
      'tickets.add_board',
      'tickets.change_board',
      'tickets.delete_board',
      'tickets.view_board'
    ]
  },
  {
    id: 'calls',
    label: 'Calls',
    description: 'Full access to call management, logs, recordings, and events',
    permissions: [
      // Call log permissions
      'crm.add_calllog',
      'crm.change_calllog',
      'crm.delete_calllog',
      'crm.view_calllog',
      // Call event permissions
      'crm.add_callevent',
      'crm.change_callevent',
      'crm.delete_callevent',
      'crm.view_callevent',
      // Call recording permissions
      'crm.add_callrecording',
      'crm.change_callrecording',
      'crm.delete_callrecording',
      'crm.view_callrecording'
    ]
  },
  {
    id: 'orders',
    label: 'Orders',
    description: 'Access to order management and creation functionality',
    permissions: [
      // Order permissions
      'orders.add_order',
      'orders.change_order',
      'orders.delete_order',
      'orders.view_order'
    ]
  },
  {
    id: 'user_management',
    label: 'User Management',
    description: 'Full access to user and group management including departments and permissions',
    permissions: [
      // User permissions
      'users.add_user',
      'users.change_user',
      'users.delete_user',
      'users.view_user',
      // Group permissions
      'auth.add_group',
      'auth.change_group',
      'auth.delete_group',
      'auth.view_group',
      // Department permissions
      'users.add_department',
      'users.change_department',
      'users.delete_department',
      'users.view_department',
      // Auth permission management
      'auth.add_permission',
      'auth.change_permission',
      'auth.delete_permission',
      'auth.view_permission'
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Access to system settings and configuration',
    permissions: [
      // Settings permissions
      'settings.view_settings',
      'settings.change_settings'
    ]
  }
];

/**
 * Get the simplified permission key for a Django permission
 */
export function getSimplifiedPermissionKey(djangoPermission: string): string | null {
  for (const category of PERMISSION_CATEGORIES) {
    if (category.permissions.includes(djangoPermission)) {
      return `can_access_${category.id}`;
    }
  }
  return null;
}

/**
 * Permission Service for handling user permissions and menu filtering
 * Supports both super admin access and granular role-based permissions
 */
export class PermissionService {
  private static instance: PermissionService;
  
  // Cache for parsed permissions to avoid repeated JSON parsing
  private permissionCache = new Map<string, PermissionMap>();
  
  // Role-based fallback permissions for backwards compatibility
  private readonly rolePermissions: RolePermissions = {
    admin: [
      'can_access_tickets',
      'can_access_calls', 
      'can_access_orders',
      'can_access_user_management',
      'can_manage_settings', // Admin-specific permission
      'can_view_boards',
      'can_create_boards',
      'can_edit_boards',
      'can_delete_boards'
    ],
    manager: [
      'can_access_tickets',
      'can_access_calls',
      'can_access_orders',
      'can_view_boards',
      'can_create_boards',
      'can_edit_boards'
      // Note: managers cannot access user management by default
      // Note: managers cannot delete boards by default
    ],
    agent: [
      'can_access_tickets', // Limited ticket access
      'can_access_calls',   // Limited call access
      'can_view_boards'     // Can view boards but not create/edit
    ],
    order_user: [
      'can_access_orders',  // Can only access orders
      'can_view_boards'     // Can view boards to select for orders
    ],
    viewer: [
      'can_view_boards'     // Can only view boards
    ]
  };

  static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * Main function to get sidebar menu items
   * Note: All items are shown - filtering is done by isLocked status in the layout
   * Permissions are checked at the API level, not for sidebar visibility
   */
  getSidebarMenuItems(userProfile: User | null, menuItems: MenuItem[]): MenuItem[] {
    // Show all menu items - locking is handled by feature keys in the layout
    return menuItems;
  }

  /**
   * Check if user is super admin
   */
  private isSuperAdmin(userProfile: User): boolean {
    return Boolean((userProfile as any).is_superuser);
  }

  /**
   * Check if user has a specific permission
   * Resolution priority:
   * 1. Super admin status (highest)
   * 2. Group-based permissions from Django (NEW METHOD)
   * 3. Parsed all_permissions JSON field (simplified categories) - LEGACY
   * 4. Individual user permission fields - LEGACY
   * 5. Role-based defaults (fallback) - LEGACY
   */
  hasPermission(userProfile: User | null, permission: string): boolean {
    if (!userProfile) {
      return false;
    }

    // Super admin bypass
    if (this.isSuperAdmin(userProfile)) {
      return true;
    }

    // NEW: Check group-based permissions from Django
    const hasGroupPermission = this.checkGroupBasedPermission(userProfile, permission);
    if (hasGroupPermission !== null) {
      return hasGroupPermission;
    }

    // LEGACY: Map legacy permission names to simplified categories
    const simplifiedPermission = this.mapLegacyPermission(permission);

    // LEGACY: Try to get from parsed all_permissions JSON
    const aggregatePermissions = this.parseAllPermissions(userProfile);
    if (aggregatePermissions && simplifiedPermission in aggregatePermissions) {
      return aggregatePermissions[simplifiedPermission];
    }

    // LEGACY: Check individual permission fields on user object
    const individualPermission = this.getIndividualPermission(userProfile, simplifiedPermission);
    if (individualPermission !== null) {
      return individualPermission;
    }

    // LEGACY: Fall back to role-based permissions
    return this.checkRoleBasedPermission(userProfile, simplifiedPermission);
  }

  /**
   * NEW: Check permissions based on user's Django groups and their permissions
   */
  private checkGroupBasedPermission(userProfile: User, permission: string): boolean | null {
    console.log(`Checking group-based permission "${permission}" for user:`, userProfile.email);
    
    // Get all permission codenames from user's groups
    const userPermissionCodenames = this.getUserPermissionCodenames(userProfile);
    
    if (userPermissionCodenames.length === 0) {
      console.log('User has no permissions from groups');
      return null; // Let it fall back to legacy methods
    }

    // Map the requested permission to required Django permission codenames
    const requiredPermissions = this.getRequiredDjangoPermissions(permission);
    console.log(`Permission "${permission}" requires Django permissions:`, requiredPermissions);
    
    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some(requiredPerm => 
      userPermissionCodenames.some(userPerm => this.permissionMatches(userPerm, requiredPerm))
    );
    
    console.log(`User ${hasPermission ? 'HAS' : 'DOES NOT HAVE'} permission "${permission}"`);
    return hasPermission;
  }

  /**
   * Get all permission codenames for a user from their groups
   */
  private getUserPermissionCodenames(userProfile: User): string[] {
    const permissionCodenames: Set<string> = new Set();
    
    if (userProfile.groups && userProfile.groups.length > 0) {
      userProfile.groups.forEach(group => {
        if (group.permissions && group.permissions.length > 0) {
          group.permissions.forEach(permission => {
            permissionCodenames.add(permission.codename);
          });
        }
      });
    }

    // Also include permissions from all_permissions if it's an array
    if (userProfile.all_permissions) {
      try {
        let allPerms: string[] = [];
        if (typeof userProfile.all_permissions === 'string') {
          // Try to parse as JSON if it's a string
          allPerms = JSON.parse(userProfile.all_permissions);
        } else if (Array.isArray(userProfile.all_permissions)) {
          allPerms = userProfile.all_permissions;
        }
        
        if (Array.isArray(allPerms)) {
          allPerms.forEach(perm => permissionCodenames.add(perm));
        }
      } catch (error) {
        console.warn('Could not parse all_permissions field:', error);
      }
    }

    return Array.from(permissionCodenames);
  }

  /**
   * Map frontend permission names to required Django permission codenames
   */
  private getRequiredDjangoPermissions(permission: string): string[] {
    const permissionMapping: Record<string, string[]> = {
      'can_access_tickets': [
        'tickets.add_ticket',
        'tickets.view_ticket',
        'tickets.change_ticket',
        'tickets.delete_ticket',
        'tickets.add_tag',
        'tickets.view_tag',
        'tickets.change_tag',
        'tickets.delete_tag',
        'tickets.add_ticketcolumn',
        'tickets.view_ticketcolumn',
        'tickets.change_ticketcolumn',
        'tickets.delete_ticketcolumn',
      ],
      'can_view_boards': [
        'tickets.view_board',
      ],
      'can_create_boards': [
        'tickets.add_board',
      ],
      'can_edit_boards': [
        'tickets.change_board',
      ],
      'can_delete_boards': [
        'tickets.delete_board',
      ],
      'can_access_calls': [
        'crm.add_calllog',
        'crm.view_calllog',
        'crm.change_calllog',
        'crm.delete_calllog',
        'crm.add_callrecording',
        'crm.view_callrecording',
        'crm.change_callrecording',
        'crm.delete_callrecording',
      ],
      'can_access_user_management': [
        'users.add_user',
        'users.view_user',
        'users.change_user',
        'users.delete_user',
        'auth.add_group',
        'auth.view_group',
        'auth.change_group',
        'auth.delete_group',
        'auth.add_permission',
        'auth.view_permission',
        'auth.change_permission',
        'auth.delete_permission',
      ],
      'can_access_orders': [
        'orders.add_order',
        'orders.view_order',
        'orders.change_order',
        'orders.delete_order',
      ],
      'can_manage_settings': [
        'settings.view_settings',
        'settings.change_settings',
      ]
    };

    return permissionMapping[permission] || [];
  }

  /**
   * Check if a user permission matches a required permission (with flexible matching)
   */
  private permissionMatches(userPermission: string, requiredPermission: string): boolean {
    // Direct match
    if (userPermission === requiredPermission) {
      return true;
    }

    // Handle different formats (app.action_model vs action_model)
    if (requiredPermission.includes('.')) {
      const [, actionModel] = requiredPermission.split('.');
      if (userPermission === actionModel) {
        return true;
      }
    }

    if (userPermission.includes('.')) {
      const [, actionModel] = userPermission.split('.');
      if (actionModel === requiredPermission) {
        return true;
      }
    }

    return false;
  }

  /**
   * Map legacy permission names to simplified category permissions
   */
  private mapLegacyPermission(permission: string): string {
    // Map old granular permissions to new simplified ones
    const legacyPermissionMap: Record<string, string> = {
      'can_make_calls': 'can_access_calls',
      'can_manage_users': 'can_access_user_management',
      'can_manage_groups': 'can_access_user_management',
      'can_view_all_tickets': 'can_access_tickets',
      'can_create_tickets': 'can_access_tickets',
      'can_edit_own_tickets': 'can_access_tickets',
      'can_edit_all_tickets': 'can_access_tickets',
      'can_delete_tickets': 'can_access_tickets',
      'can_assign_tickets': 'can_access_tickets',
      'can_manage_tags': 'can_access_tickets',
      'can_manage_columns': 'can_access_tickets',
      // Board permissions are kept as-is (no mapping needed)
    };

    return legacyPermissionMap[permission] || permission;
  }

  /**
   * Parse the all_permissions JSON field with caching and error handling
   */
  private parseAllPermissions(userProfile: User): PermissionMap | null {
    if (!userProfile.all_permissions) {
      return null;
    }

    // Use cache key based on user ID and permissions string
    const cacheKey = `${userProfile.id}_${userProfile.all_permissions}`;
    
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    try {
      const parsed = JSON.parse(userProfile.all_permissions);
      
      // Validate that it's an object with boolean values
      if (typeof parsed === 'object' && parsed !== null) {
        const permissionMap: PermissionMap = {};
        
        for (const [key, value] of Object.entries(parsed)) {
          // Ensure boolean values
          permissionMap[key] = Boolean(value);
        }
        
        // Cache the result
        this.permissionCache.set(cacheKey, permissionMap);
        return permissionMap;
      }
    } catch (error) {
      console.warn('Failed to parse user permissions JSON:', error);
      
      // Clear cache entry on parse error
      this.permissionCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Check individual permission fields on the user object
   */
  private getIndividualPermission(userProfile: User, permission: string): boolean | null {
    // Check if the permission exists as a direct field on the user
    const userAny = userProfile as any;
    
    if (permission in userAny && typeof userAny[permission] === 'boolean') {
      return userAny[permission];
    }

    return null;
  }

  /**
   * Check role-based permissions as fallback
   */
  private checkRoleBasedPermission(userProfile: User, permission: string): boolean {
    const userRole = this.getUserRole(userProfile);
    
    if (!userRole || !this.rolePermissions[userRole]) {
      return false;
    }

    return this.rolePermissions[userRole].includes(permission);
  }

  /**
   * Extract user role as string, handling different role formats
   */
  private getUserRole(userProfile: User): string | null {
    if (!userProfile.role) {
      return null;
    }

    // Convert role to string and handle different formats
    const roleString = String(userProfile.role).toLowerCase();
    return roleString || null;
  }

  /**
   * Get all permissions for a user (for debugging/display purposes)
   */
  getAllPermissions(userProfile: User | null): PermissionMap {
    if (!userProfile) {
      return {};
    }

    if (this.isSuperAdmin(userProfile)) {
      // Super admin has all possible permissions
      const allPermissions: PermissionMap = {};
      const allPossiblePermissions = [
        'can_access_tickets',
        'can_access_calls',
        'can_access_orders',
        'can_access_user_management',
        'can_manage_settings',
        'can_view_boards',
        'can_create_boards',
        'can_edit_boards',
        'can_delete_boards'
      ];
      
      for (const permission of allPossiblePermissions) {
        allPermissions[permission] = true;
      }
      
      return allPermissions;
    }

    // Combine all permission sources
    const permissions: PermissionMap = {};
    
    // Start with role-based permissions
    const userRole = this.getUserRole(userProfile);
    if (userRole && this.rolePermissions[userRole]) {
      for (const permission of this.rolePermissions[userRole]) {
        permissions[permission] = true;
      }
    }

    // Override with individual permissions (checking for simplified keys)
    const userAny = userProfile as any;
    for (const key of Object.keys(userAny)) {
      if (key.startsWith('can_') && typeof userAny[key] === 'boolean') {
        const simplifiedKey = this.mapLegacyPermission(key);
        permissions[simplifiedKey] = userAny[key];
      }
    }

    // Override with parsed all_permissions
    const aggregatePermissions = this.parseAllPermissions(userProfile);
    if (aggregatePermissions) {
      Object.assign(permissions, aggregatePermissions);
    }

    return permissions;
  }

  /**
   * Clear permission cache (useful when user data changes)
   */
  clearCache(): void {
    this.permissionCache.clear();
  }

  /**
   * Clear cache for specific user
   */
  clearUserCache(userId: number): void {
    const keysToDelete = Array.from(this.permissionCache.keys()).filter(key => 
      key.startsWith(`${userId}_`)
    );
    
    for (const key of keysToDelete) {
      this.permissionCache.delete(key);
    }
  }

  /**
   * Utility method to check multiple permissions (ANY)
   */
  hasAnyPermission(userProfile: User | null, permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(userProfile, permission));
  }

  /**
   * Utility method to check multiple permissions (ALL)
   */
  hasAllPermissions(userProfile: User | null, permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(userProfile, permission));
  }

  /**
   * Get user-friendly role display name
   */
  getRoleDisplayName(userProfile: User | null): string {
    if (!userProfile) {
      return 'Guest';
    }

    if (this.isSuperAdmin(userProfile)) {
      return 'Super Admin';
    }

    const role = this.getUserRole(userProfile);
    if (!role) {
      return 'User';
    }

    // Capitalize first letter
    return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

// Export singleton instance
export const permissionService = PermissionService.getInstance();

// Default menu items for the sidebar (deprecated - use navigationConfig instead)
// Kept for backwards compatibility
export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: "tickets",
    label: "Tickets",
    icon: "🎫",
    requiredFeatureKey: "ticket_management",
    description: "View and manage tickets",
  },
  {
    id: "orders",
    label: "Orders",
    icon: "📦",
    requiredFeatureKey: "order_management",
    description: "Create and manage orders",
  },
  {
    id: "calls",
    label: "Calls",
    icon: "📞",
    requiredFeatureKey: "sip_calling",
    description: "Handle phone calls",
    isPremium: true,
  },
  {
    id: "users",
    label: "Users",
    icon: "👥",
    requiredFeatureKey: "user_management",
    description: "Manage user accounts",
  },
  {
    id: "groups",
    label: "Groups",
    icon: "👨‍👩‍👧‍👦",
    requiredFeatureKey: "user_management",
    description: "Manage user groups and permissions",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "⚙️",
    description: "Configure system settings",
    // No requiredFeatureKey - visible to all users
  },
];

// Export convenience functions for easier usage
export function getSidebarMenuItems(user: any, menuItems: MenuItem[] = DEFAULT_MENU_ITEMS): MenuItem[] {
  return permissionService.getSidebarMenuItems(user, menuItems);
}

export function hasPermission(user: any, permission: string): boolean {
  return permissionService.hasPermission(user, permission);
}
