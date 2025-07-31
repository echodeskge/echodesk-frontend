import React, { useState, useEffect } from 'react';
import { PERMISSION_CATEGORIES, PermissionCategory } from '@/services/permissionService';
import { djangoPermissionsToCategories } from '@/utils/permissionUtils';

interface GroupPermissionFormProps {
  selectedPermissions?: string[];
  onPermissionsChange: (permissions: string[]) => void;
  disabled?: boolean;
}

interface SimplifiedPermission {
  id: string;
  label: string;
  description: string;
  djangoPermissions: string[];
  checked: boolean;
}

/**
 * Simplified group permission form with 3 main categories
 */
export const GroupPermissionForm: React.FC<GroupPermissionFormProps> = ({
  selectedPermissions = [],
  onPermissionsChange,
  disabled = false
}) => {
  const [permissions, setPermissions] = useState<SimplifiedPermission[]>([]);

  useEffect(() => {
    console.log('GroupPermissionForm: selectedPermissions changed:', selectedPermissions);
    
    // Use the utility function to determine which categories should be checked
    const selectedCategoryIds = djangoPermissionsToCategories(selectedPermissions);
    console.log('Determined selected categories:', selectedCategoryIds);
    
    // Initialize permissions based on categories
    const initialPermissions: SimplifiedPermission[] = PERMISSION_CATEGORIES.map(category => ({
      id: category.id,
      label: category.label,
      description: category.description,
      djangoPermissions: category.permissions,
      checked: selectedCategoryIds.includes(category.id)
    }));

    console.log('Initialized permissions:', initialPermissions.map(p => ({
      id: p.id,
      label: p.label,
      checked: p.checked
    })));

    setPermissions(initialPermissions);
  }, [selectedPermissions]);

  const handlePermissionChange = (categoryId: string, checked: boolean) => {
    console.log(`Permission change: ${categoryId} = ${checked}`);
    
    const updatedPermissions = permissions.map(perm => {
      if (perm.id === categoryId) {
        return { ...perm, checked };
      }
      return perm;
    });

    setPermissions(updatedPermissions);

    // Calculate all Django permissions based on selected categories
    const allSelectedPermissions: string[] = [];
    
    updatedPermissions.forEach(perm => {
      if (perm.checked) {
        console.log(`Adding permissions for category ${perm.id}:`, perm.djangoPermissions);
        allSelectedPermissions.push(...perm.djangoPermissions);
      }
    });

    console.log('Final selected permissions being sent to parent:', allSelectedPermissions);
    onPermissionsChange(allSelectedPermissions);
  };

  return (
    <div style={{ 
      background: 'white',
      padding: '24px',
      borderRadius: '8px',
      border: '1px solid #e1e5e9'
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#333'
      }}>
        Group Permissions
      </h3>
      
      <p style={{
        margin: '0 0 20px 0',
        fontSize: '14px',
        color: '#6c757d',
        lineHeight: '1.5'
      }}>
        Select the areas this group should have access to. Each permission grants full access to that module.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {permissions.map((permission) => (
          <div
            key={permission.id}
            style={{
              display: 'flex',
              padding: '16px',
              border: '1px solid #e9ecef',
              borderRadius: '6px',
              backgroundColor: permission.checked ? '#f8f9fa' : 'white',
              transition: 'all 0.2s ease'
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                width: '100%',
                opacity: disabled ? 0.6 : 1
              }}
            >
              <input
                type="checkbox"
                checked={permission.checked}
                onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                disabled={disabled}
                style={{
                  marginTop: '2px',
                  cursor: disabled ? 'not-allowed' : 'pointer'
                }}
              />
              
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '4px'
                }}>
                  {permission.label}
                </div>
                
                <div style={{
                  fontSize: '14px',
                  color: '#6c757d',
                  lineHeight: '1.4',
                  marginBottom: '8px'
                }}>
                  {permission.description}
                </div>

                {/* Show Django permissions in development */}
                {process.env.NODE_ENV === 'development' && (
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{
                      fontSize: '12px',
                      color: '#007bff',
                      cursor: 'pointer',
                      fontFamily: 'monospace'
                    }}>
                      Django Permissions ({permission.djangoPermissions.length})
                    </summary>
                    <div style={{
                      marginTop: '4px',
                      padding: '8px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #e9ecef'
                    }}>
                      {permission.djangoPermissions.map((djangoPerm) => (
                        <div
                          key={djangoPerm}
                          style={{
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            color: '#495057',
                            margin: '2px 0'
                          }}
                        >
                          {djangoPerm}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </label>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        border: '1px solid #e9ecef'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#495057',
          marginBottom: '4px'
        }}>
          Permission Summary
        </div>
        <div style={{
          fontSize: '13px',
          color: '#6c757d'
        }}>
          {permissions.filter(p => p.checked).length === 0 ? (
            'No permissions selected - users in this group will have very limited access'
          ) : (
            <>
              Selected: {permissions.filter(p => p.checked).map(p => p.label).join(', ')}
              <br />
              Total Django permissions: {permissions.filter(p => p.checked).reduce((sum, p) => sum + p.djangoPermissions.length, 0)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupPermissionForm;
