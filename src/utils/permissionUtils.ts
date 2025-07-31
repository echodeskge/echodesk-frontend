/**
 * Permission utilities for backend integration
 * 
 * This file contains utilities to help map between the simplified frontend
 * permission categories and the Django permission system.
 */

import { PERMISSION_CATEGORIES, PermissionCategory } from '@/services/permissionService';

/**
 * Convert simplified permission categories to Django permission IDs
 * 
 * @param selectedCategories Array of category IDs ('tickets', 'calls', 'user_management')
 * @returns Array of Django permission codenames
 */
export function categoriesToDjangoPermissions(selectedCategories: string[]): string[] {
  const djangoPermissions: string[] = [];
  
  selectedCategories.forEach(categoryId => {
    const category = PERMISSION_CATEGORIES.find((cat: PermissionCategory) => cat.id === categoryId);
    if (category) {
      djangoPermissions.push(...category.permissions);
    }
  });
  
  return djangoPermissions;
}

/**
 * Convert Django permissions back to simplified categories
 * 
 * @param djangoPermissions Array of Django permission codenames
 * @returns Array of category IDs that should be checked
 */
export function djangoPermissionsToCategories(djangoPermissions: string[]): string[] {
  console.log('Converting Django permissions to categories:', djangoPermissions);
  
  const selectedCategories: string[] = [];
  
  PERMISSION_CATEGORIES.forEach((category: PermissionCategory) => {
    // Check if any permission from this category is present
    const hasAnyPermission = category.permissions.some((categoryPerm: string) => {
      return djangoPermissions.some(djangoPerm => {
        // Strategy 1: Direct match
        if (categoryPerm === djangoPerm) return true;
        
        // Strategy 2: Category permission includes app prefix, Django permission doesn't  
        if (categoryPerm.includes('.')) {
          const [, actionModel] = categoryPerm.split('.');
          if (actionModel === djangoPerm) return true;
        }
        
        // Strategy 3: Django permission includes app prefix, category permission doesn't
        if (djangoPerm.includes('.')) {
          const [, actionModel] = djangoPerm.split('.');
          if (actionModel === categoryPerm) return true;
        }
        
        return false;
      });
    });
    
    if (hasAnyPermission) {
      selectedCategories.push(category.id);
      console.log(`Category "${category.id}" (${category.label}) is selected - has matching permissions`);
    } else {
      console.log(`Category "${category.id}" (${category.label}) is NOT selected - no matching permissions found`);
    }
  });
  
  console.log('Final selected categories:', selectedCategories);
  return selectedCategories;
}

/**
 * Get Django permission IDs from permission codenames
 * This would typically be used with your backend API to get the actual permission IDs
 * 
 * Example usage:
 * const permissionIds = await getPermissionIdsByCodenames(djangoPermissions);
 */
export function createPermissionQuery(djangoPermissions: string[]): string {
  // Create a query filter for Django permissions
  return djangoPermissions.map(perm => `codename=${perm}`).join('&');
}

/**
 * Validate that all required permissions for a category are present
 * 
 * @param categoryId The category to check ('tickets', 'calls', 'user_management')
 * @param userPermissions Array of user's Django permissions
 * @returns boolean indicating if user has all permissions for the category
 */
export function hasCompleteAccessToCategory(
  categoryId: string, 
  userPermissions: string[]
): boolean {
  const category = PERMISSION_CATEGORIES.find((cat: PermissionCategory) => cat.id === categoryId);
  if (!category) {
    return false;
  }
  
  // Check if user has ALL permissions for this category
  return category.permissions.every((perm: string) => userPermissions.includes(perm));
}

/**
 * Get permission mapping for API requests
 * This creates the structure expected by your Django backend
 */
export function createGroupPermissionPayload(selectedCategories: string[]) {
  const djangoPermissions = categoriesToDjangoPermissions(selectedCategories);
  
  return {
    simplified_permissions: selectedCategories,
    django_permissions: djangoPermissions,
    permission_count: djangoPermissions.length
  };
}

/**
 * Frontend permission validation
 * Check if a user should have access to a menu item based on their Django permissions
 */
export function validateMenuAccess(
  menuPermission: string,
  userDjangoPermissions: string[]
): boolean {
  switch (menuPermission) {
    case 'can_access_tickets':
      return hasCompleteAccessToCategory('tickets', userDjangoPermissions);
    
    case 'can_access_calls':
      return hasCompleteAccessToCategory('calls', userDjangoPermissions);
    
    case 'can_access_user_management':
      return hasCompleteAccessToCategory('user_management', userDjangoPermissions);
    
    default:
      return false;
  }
}

/**
 * Debug helper to show permission mapping
 */
export function debugPermissionMapping() {
  console.group('Permission Category Mapping');
  
  PERMISSION_CATEGORIES.forEach((category: PermissionCategory) => {
    console.group(`${category.label} (${category.id})`);
    console.log('Description:', category.description);
    console.log('Django Permissions:', category.permissions);
    console.log('Permission Count:', category.permissions.length);
    console.groupEnd();
  });
  
  console.groupEnd();
}

// Export permission categories for use in other components
export { PERMISSION_CATEGORIES } from '@/services/permissionService';
