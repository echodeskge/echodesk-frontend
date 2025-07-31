import React, { useState } from "react";
import GroupPermissionForm from "./GroupPermissionForm";
import { PERMISSION_CATEGORIES } from "@/services/permissionService";
import {
  categoriesToDjangoPermissions,
  djangoPermissionsToCategories,
} from "@/utils/permissionUtils";

/**
 * Demo component for testing the simplified group permission system
 */
export const GroupPermissionDemo: React.FC = () => {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [simulatedGroupData, setSimulatedGroupData] = useState({
    name: "Test Group",
    permission_codenames: [] as string[],
  });

  const handlePermissionsChange = (permissions: string[]) => {
    setSelectedPermissions(permissions);
    setSimulatedGroupData((prev) => ({
      ...prev,
      permission_codenames: permissions,
    }));
  };

  const handleGroupNameChange = (name: string) => {
    setSimulatedGroupData((prev) => ({
      ...prev,
      name,
    }));
  };

  const selectedCategories = djangoPermissionsToCategories(selectedPermissions);

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ marginBottom: "30px" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "700",
            color: "#333",
            marginBottom: "12px",
          }}
        >
          Group Permission System Demo
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#6c757d",
            lineHeight: "1.5",
            marginBottom: "24px",
          }}
        >
          This demonstrates the new simplified group permission system. Instead
          of managing dozens of granular permissions, admins can now simply
          select from 3 main categories.
        </p>

        <div
          style={{
            background: "#e3f2fd",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #bbdefb",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", color: "#1976d2" }}>
            ✨ What&apos;s New
          </h3>
          <ul style={{ margin: "0", paddingLeft: "20px", color: "#1565c0" }}>
            <li>
              <strong>Simplified UX:</strong> 3 checkboxes instead of 40+
              granular permissions
            </li>
            <li>
              <strong>Same Security:</strong> Backend still uses full Django
              permission system
            </li>
            <li>
              <strong>Automatic Mapping:</strong> Each category maps to its
              relevant Django permissions
            </li>
            <li>
              <strong>Better Performance:</strong> Reduced complexity and faster
              permission checks
            </li>
          </ul>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}
      >
        {/* Left Column - Form */}
        <div>
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #e1e5e9",
              marginBottom: "20px",
            }}
          >
            <h3
              style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#333" }}
            >
              Group Information
            </h3>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#333",
                }}
              >
                Group Name
              </label>
              <input
                type="text"
                value={simulatedGroupData.name}
                onChange={(e) => handleGroupNameChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
                placeholder="Enter group name"
              />
            </div>
          </div>

          <GroupPermissionForm
            selectedPermissions={selectedPermissions}
            onPermissionsChange={handlePermissionsChange}
          />
        </div>

        {/* Right Column - Results */}
        <div>
          <div
            style={{
              background: "#f8f9fa",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #e9ecef",
              marginBottom: "20px",
            }}
          >
            <h3
              style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#333" }}
            >
              Selection Results
            </h3>

            <div style={{ marginBottom: "16px" }}>
              <strong>Group Name:</strong> {simulatedGroupData.name}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <strong>
                Selected Categories ({selectedCategories.length}):
              </strong>
              <div style={{ marginTop: "8px" }}>
                {selectedCategories.length > 0 ? (
                  selectedCategories.map((category) => {
                    const categoryInfo = PERMISSION_CATEGORIES.find(
                      (c) => c.id === category
                    );
                    return (
                      <span
                        key={category}
                        style={{
                          display: "inline-block",
                          background: "#007bff",
                          color: "white",
                          padding: "4px 12px",
                          borderRadius: "16px",
                          fontSize: "12px",
                          marginRight: "8px",
                          marginBottom: "4px",
                        }}
                      >
                        {categoryInfo?.label || category}
                      </span>
                    );
                  })
                ) : (
                  <span style={{ color: "#6c757d", fontStyle: "italic" }}>
                    No categories selected
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <strong>
                Django Permissions ({selectedPermissions.length}):
              </strong>
              <div
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  background: "white",
                  borderRadius: "4px",
                  border: "1px solid #dee2e6",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {selectedPermissions.length > 0 ? (
                  selectedPermissions.map((perm, index) => (
                    <div
                      key={index}
                      style={{
                        fontFamily: "monospace",
                        fontSize: "12px",
                        color: "#495057",
                        margin: "2px 0",
                      }}
                    >
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
          </div>

          {/* API Request Example */}
          <div
            style={{
              background: "#fff3cd",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #ffeaa7",
            }}
          >
            <h4 style={{ margin: "0 0 12px 0", color: "#856404" }}>
              API Request Example
            </h4>
            <div
              style={{
                background: "white",
                padding: "12px",
                borderRadius: "4px",
                border: "1px solid #ffeaa7",
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: "#856404",
                  whiteSpace: "pre-wrap",
                }}
              >
                {`POST /api/groups/
{
  "name": "${simulatedGroupData.name}",
  "permission_codenames": [
${selectedPermissions.map((p) => `    "${p}"`).join(",\n")}
  ]
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Permission Category Details */}
      <div style={{ marginTop: "40px" }}>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#333",
            marginBottom: "20px",
          }}
        >
          Permission Category Details
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          {PERMISSION_CATEGORIES.map((category) => (
            <div
              key={category.id}
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "8px",
                border: selectedCategories.includes(category.id)
                  ? "2px solid #007bff"
                  : "1px solid #e1e5e9",
                transition: "all 0.2s ease",
              }}
            >
              <h3 style={{ margin: "0 0 12px 0", color: "#333" }}>
                {category.label}
                {selectedCategories.includes(category.id) && (
                  <span style={{ color: "#007bff", marginLeft: "8px" }}>✓</span>
                )}
              </h3>

              <p
                style={{
                  margin: "0 0 16px 0",
                  color: "#6c757d",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                {category.description}
              </p>

              <div style={{ fontSize: "12px", color: "#6c757d" }}>
                <strong>
                  {category.permissions.length} Django permissions
                </strong>
              </div>

              <details style={{ marginTop: "12px" }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#007bff",
                    fontFamily: "monospace",
                  }}
                >
                  Show Django permissions
                </summary>
                <div
                  style={{
                    marginTop: "8px",
                    padding: "8px",
                    background: "#f8f9fa",
                    borderRadius: "4px",
                    maxHeight: "150px",
                    overflowY: "auto",
                  }}
                >
                  {category.permissions.map((perm) => (
                    <div
                      key={perm}
                      style={{
                        fontSize: "11px",
                        fontFamily: "monospace",
                        color: "#495057",
                        margin: "1px 0",
                      }}
                    >
                      {perm}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GroupPermissionDemo;
