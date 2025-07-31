import React, { useState } from "react";
import GroupPermissionForm from "./GroupPermissionForm";
import {
  categoriesToDjangoPermissions,
  djangoPermissionsToCategories,
} from "@/utils/permissionUtils";

/**
 * Demo component showing the new simplified permission system
 */
export const PermissionSystemDemo: React.FC = () => {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const handlePermissionsChange = (permissions: string[]) => {
    setSelectedPermissions(permissions);
  };

  // Example of converting simplified categories to Django permissions
  const exampleCategories = ["tickets", "calls"];
  const exampleDjangoPermissions =
    categoriesToDjangoPermissions(exampleCategories);
  const convertedBackCategories = djangoPermissionsToCategories(
    exampleDjangoPermissions
  );

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "700",
            color: "#333",
            marginBottom: "12px",
          }}
        >
          Simplified Permission System Demo
        </h1>
        <p style={{ fontSize: "16px", color: "#6c757d", lineHeight: "1.5" }}>
          This demonstrates the new simplified permission system with 3 main
          categories:
          <strong> Tickets</strong>, <strong>Calls</strong>, and{" "}
          <strong>User Management</strong>.
        </p>
      </div>

      {/* Permission Form */}
      <GroupPermissionForm
        selectedPermissions={selectedPermissions}
        onPermissionsChange={handlePermissionsChange}
      />

      {/* Results */}
      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #e9ecef",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "18px",
            fontWeight: "600",
            color: "#333",
          }}
        >
          Selected Permissions
        </h3>

        <div style={{ marginBottom: "16px" }}>
          <strong>Django Permissions ({selectedPermissions.length}):</strong>
          <div
            style={{
              marginTop: "8px",
              padding: "12px",
              backgroundColor: "white",
              borderRadius: "4px",
              border: "1px solid #dee2e6",
              fontFamily: "monospace",
              fontSize: "12px",
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {selectedPermissions.length > 0 ? (
              selectedPermissions.map((perm, index) => (
                <div key={index} style={{ margin: "2px 0", color: "#495057" }}>
                  {perm}
                </div>
              ))
            ) : (
              <div style={{ color: "#6c757d", fontStyle: "italic" }}>
                No permissions selected
              </div>
            )}
          </div>
        </div>

        {/* Conversion Example */}
        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            backgroundColor: "#e3f2fd",
            borderRadius: "6px",
            border: "1px solid #bbdefb",
          }}
        >
          <h4
            style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#1976d2" }}
          >
            Example: Category ↔ Django Permission Conversion
          </h4>

          <div style={{ fontSize: "14px", color: "#333" }}>
            <div style={{ marginBottom: "8px" }}>
              <strong>Categories:</strong> [{exampleCategories.join(", ")}]
            </div>
            <div style={{ marginBottom: "8px" }}>
              <strong>→ Django Permissions:</strong>{" "}
              {exampleDjangoPermissions.length} permissions
            </div>
            <div>
              <strong>→ Back to Categories:</strong> [
              {convertedBackCategories.join(", ")}]
            </div>
          </div>
        </div>
      </div>

      {/* API Integration Guide */}
      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          backgroundColor: "#fff3cd",
          borderRadius: "8px",
          border: "1px solid #ffeaa7",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "18px",
            fontWeight: "600",
            color: "#856404",
          }}
        >
          Backend Integration Guide
        </h3>

        <div style={{ fontSize: "14px", color: "#856404", lineHeight: "1.6" }}>
          <p style={{ margin: "0 0 12px 0" }}>
            <strong>1. Group Creation/Update:</strong> When creating or updating
            a group, send the selected Django permissions to your backend API.
          </p>

          <p style={{ margin: "0 0 12px 0" }}>
            <strong>2. User Authentication:</strong> Include all user&apos;s Django
            permissions in the <code>all_permissions</code> JSON field when
            returning user data.
          </p>

          <p style={{ margin: "0 0 12px 0" }}>
            <strong>3. Frontend Permission Checks:</strong> The permission
            service will automatically map Django permissions back to simplified
            categories for UI display.
          </p>

          <p style={{ margin: "0" }}>
            <strong>4. Menu Access:</strong> Menu items will show/hide based on
            whether users have the complete set of permissions for each
            category.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PermissionSystemDemo;
