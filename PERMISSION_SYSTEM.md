# Simplified Permission System Documentation

## Overview

The permission system has been refactored from granular individual permissions to **3 main categories** that map to Django's granular permissions behind the scenes. This simplifies the user experience while maintaining the same level of backend security.

## Permission Categories

### 1. 🎫 Tickets
**Description:** Full access to ticket management including tags, comments, and columns

**Includes Django Permissions:**
- `tickets.add_ticket`
- `tickets.change_ticket`
- `tickets.delete_ticket`
- `tickets.view_ticket`
- `tickets.add_tag`
- `tickets.change_tag`
- `tickets.delete_tag`
- `tickets.view_tag`
- `tickets.add_ticketcolumn`
- `tickets.change_ticketcolumn`
- `tickets.delete_ticketcolumn`
- `tickets.view_ticketcolumn`
- `tickets.add_ticketcomment`
- `tickets.change_ticketcomment`
- `tickets.delete_ticketcomment`
- `tickets.view_ticketcomment`
- `tickets.add_ticketstatus`
- `tickets.change_ticketstatus`
- `tickets.delete_ticketstatus`
- `tickets.view_ticketstatus`

### 2. 📞 Calls
**Description:** Full access to call management, logs, recordings, and events

**Includes Django Permissions:**
- `crm.add_calllog`
- `crm.change_calllog`
- `crm.delete_calllog`
- `crm.view_calllog`
- `crm.add_callevent`
- `crm.change_callevent`
- `crm.delete_callevent`
- `crm.view_callevent`
- `crm.add_callrecording`
- `crm.change_callrecording`
- `crm.delete_callrecording`
- `crm.view_callrecording`

### 3. 👥 User Management
**Description:** Full access to user and group management including departments and permissions

**Includes Django Permissions:**
- `users.add_user`
- `users.change_user`
- `users.delete_user`
- `users.view_user`
- `users.add_group`
- `users.change_group`
- `users.delete_group`
- `users.view_group`
- `users.add_department`
- `users.change_department`
- `users.delete_department`
- `users.view_department`
- `auth.add_permission`
- `auth.change_permission`
- `auth.delete_permission`
- `auth.view_permission`

## Frontend Implementation

### Components Created

1. **`permissionService.ts`** - Core permission logic with simplified categories
2. **`GroupPermissionForm.tsx`** - UI component for group permission selection
3. **`usePermissions.ts`** - React hooks for permission checking
4. **`permissionUtils.ts`** - Utility functions for backend integration
5. **`PermissionDebugPanel.tsx`** - Development debug component
6. **`PermissionSystemDemo.tsx`** - Demo component showing the system

### Key Features

- **Automatic Permission Mapping:** Legacy permission names are automatically mapped to new categories
- **Super Admin Bypass:** Super admins have access to everything regardless of permissions
- **Role-based Fallbacks:** Default permissions based on user roles (admin, manager, agent, viewer)
- **Development Debug Tools:** Shows permission mappings and user access in development mode
- **Performance Optimized:** Uses caching and memoization to avoid repeated calculations

## Backend Integration

### 1. Group Management API

When creating or updating groups, your API should:

```python
# Example Django view
def update_group_permissions(request, group_id):
    # Frontend sends simplified categories like ['tickets', 'calls']
    selected_categories = request.data.get('categories', [])
    
    # Convert to Django permissions using the mapping
    django_permissions = []
    category_mapping = {
        'tickets': [
            'tickets.add_ticket', 'tickets.change_ticket', 
            'tickets.delete_ticket', 'tickets.view_ticket',
            # ... all ticket-related permissions
        ],
        'calls': [
            'crm.add_calllog', 'crm.change_calllog',
            # ... all call-related permissions  
        ],
        'user_management': [
            'users.add_user', 'users.change_user',
            # ... all user management permissions
        ]
    }
    
    for category in selected_categories:
        if category in category_mapping:
            django_permissions.extend(category_mapping[category])
    
    # Apply permissions to group
    group = Group.objects.get(id=group_id)
    permissions = Permission.objects.filter(codename__in=django_permissions)
    group.permissions.set(permissions)
```

### 2. User Authentication Response

Include all user permissions in the authentication response:

```python
# In your user serializer or authentication view
def get_user_data(user):
    # Get all permissions from user + groups
    all_permissions = user.get_all_permissions()
    
    return {
        'id': user.id,
        'email': user.email,
        'role': user.role,
        'is_superuser': user.is_superuser,
        'all_permissions': json.dumps({
            perm: True for perm in all_permissions
        })
    }
```

### 3. Menu Permission Checking

The frontend automatically handles menu visibility based on permissions:

```typescript
// This happens automatically in the Dashboard component
const menuItems = [
  { id: "tickets", permission: "can_access_tickets" },     // Maps to tickets category
  { id: "calls", permission: "can_access_calls" },         // Maps to calls category  
  { id: "users", permission: "can_access_user_management" } // Maps to user mgmt category
];
```

## Migration Guide

### For Existing Installations

1. **Update Frontend:** Deploy the new frontend components
2. **Update Group Forms:** Replace existing group permission forms with `GroupPermissionForm`  
3. **Test Permission Mapping:** Use the debug panel to verify permissions are correctly mapped
4. **Update Backend APIs:** Modify group management endpoints to handle the simplified categories

### Backward Compatibility

- The system maintains backward compatibility with existing granular permissions
- Legacy permission names are automatically mapped to new categories
- Existing user permissions continue to work without changes

## Development & Testing

### Debug Tools

Enable development mode to see:
- Permission mappings
- User's actual permissions
- Django permission details
- Menu access calculations

### Testing Scenarios

1. **Super Admin:** Should see all menu items
2. **Admin Role:** Should see tickets, calls, and user management
3. **Manager Role:** Should see tickets and calls only
4. **Agent Role:** Should see tickets and calls with limited access
5. **Viewer Role:** Should see dashboard only

### Permission Validation

Use the utility functions to validate permissions:

```typescript
import { hasCompleteAccessToCategory } from '@/utils/permissionUtils';

// Check if user has full access to a category
const canAccessTickets = hasCompleteAccessToCategory('tickets', userPermissions);
```

## Benefits

1. **Simplified UX:** Users see 3 clear categories instead of dozens of granular permissions
2. **Maintained Security:** Backend still uses granular Django permissions
3. **Better Performance:** Reduced permission checks and calculations
4. **Easier Maintenance:** Clearer permission structure for developers
5. **Future Proof:** Easy to add new categories or modify existing ones

## Future Enhancements

- Add role-based permission templates
- Implement permission inheritance hierarchies
- Add audit logging for permission changes
- Create permission analytics and reporting
