"use client";

import { useState, useEffect } from "react";
import { UserCreate, UserUpdate, User, Group, PaginatedGroupList } from "@/api/generated/interfaces";
import { groupsList } from "@/api/generated/api";
import "./UserForm.css";

interface UserFormProps {
  mode: "create" | "edit";
  user?: User;
  onSubmit: (userData: UserCreate | UserUpdate) => Promise<void>;
  onCancel: () => void;
}

export default function UserForm({
  mode,
  user,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const [formData, setFormData] = useState({
    email: user?.email || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    password: "",
    password_confirm: "",
    is_active: user?.is_active ?? true,
    group_ids: user?.group_ids || [],
    phone_number: user?.phone_number || "",
    job_title: user?.job_title || "",
    status: user?.is_active ? "active" : "inactive",
  });

  // Load groups on component mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response: PaginatedGroupList = await groupsList();
        setGroups(response.results || []);
      } catch (error) {
        console.error('Failed to load groups:', error);
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchGroups();
  }, []);

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" },
    { value: "suspended", label: "Suspended" },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.first_name) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name) {
      newErrors.last_name = "Last name is required";
    }

    if (mode === "create") {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters long";
      }

      if (!formData.password_confirm) {
        newErrors.password_confirm = "Please confirm your password";
      } else if (formData.password !== formData.password_confirm) {
        newErrors.password_confirm = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const createData: any = {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password,
          password_confirm: formData.password_confirm,
          group_ids: formData.group_ids.length > 0 ? formData.group_ids : undefined,
          phone_number: formData.phone_number || undefined,
          job_title: formData.job_title || undefined,
        };
        await onSubmit(createData);
      } else {
        const updateData: any = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          status: formData.status as any,
          group_ids: formData.group_ids.length > 0 ? formData.group_ids : undefined,
          phone_number: formData.phone_number || undefined,
          job_title: formData.job_title || undefined,
          is_active: formData.is_active,
        };
        await onSubmit(updateData);
      }
    } catch (err: any) {
      setErrors({ submit: err.message || "Failed to save user" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="user-form-overlay">
      <div className="user-form-modal">
        <div className="user-form-header">
          <h2>{mode === "create" ? "Add New User" : "Edit User"}</h2>
          <button className="close-btn" onClick={onCancel}>
            ×
          </button>
        </div>

        <form className="user-form" onSubmit={handleSubmit}>
          {errors.submit && <div className="error-alert">{errors.submit}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={mode === "edit"}
                className={errors.email ? "error" : ""}
                placeholder="user@example.com"
              />
              {errors.email && <div className="error-text">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                type="text"
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                className={errors.first_name ? "error" : ""}
                placeholder="John"
              />
              {errors.first_name && (
                <div className="error-text">{errors.first_name}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                type="text"
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                className={errors.last_name ? "error" : ""}
                placeholder="Doe"
              />
              {errors.last_name && (
                <div className="error-text">{errors.last_name}</div>
              )}
            </div>

            <div className="form-section">
              <h3>Group Assignment</h3>
              <div className="form-group">
                <label htmlFor="group">Group</label>
                <select
                  id="group"
                  value={formData.group_ids.length > 0 ? formData.group_ids[0] : ""}
                  onChange={(e) => handleChange("group_ids", e.target.value ? [parseInt(e.target.value)] : [])}
                  disabled={loadingGroups}
                >
                  <option value="">Select Group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {loadingGroups && <small>Loading groups...</small>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="job_title">Job Title</label>
              <input
                type="text"
                id="job_title"
                value={formData.job_title}
                onChange={(e) => handleChange("job_title", e.target.value)}
                placeholder="Senior Developer, Sales Manager, etc."
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone_number">Phone Number</label>
              <input
                type="tel"
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => handleChange("phone_number", e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {mode === "edit" && (
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status?.toString() || ""}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {mode === "create" && (
            <div className="form-section">
              <h3>Password</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className={errors.password ? "error" : ""}
                    placeholder="Minimum 8 characters"
                  />
                  {errors.password && (
                    <div className="error-text">{errors.password}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="password_confirm">Confirm Password *</label>
                  <input
                    type="password"
                    id="password_confirm"
                    value={formData.password_confirm}
                    onChange={(e) =>
                      handleChange("password_confirm", e.target.value)
                    }
                    className={errors.password_confirm ? "error" : ""}
                    placeholder="Re-enter password"
                  />
                  {errors.password_confirm && (
                    <div className="error-text">{errors.password_confirm}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {mode === "edit" && (
            <div className="user-status-section">
              <h4>User Status</h4>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    handleChange("is_active", e.target.checked)
                  }
                />
                <span>User is active</span>
              </label>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                  ? "Create User"
                  : "Update User"}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .user-form-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .user-form-modal {
          background: white;
          border-radius: 8px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .user-form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .user-form-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .close-btn:hover {
          background-color: #f3f4f6;
          color: #374151;
        }

        .user-form {
          padding: 24px;
        }

        .error-alert {
          background-color: #fee2e2;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          border: 1px solid #fecaca;
        }

        .form-section {
          margin-bottom: 24px;
        }

        .form-section h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: 500;
          color: #374151;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .form-group input,
        .form-group select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group input.error,
        .form-group select.error {
          border-color: #dc2626;
        }

        .error-text {
          color: #dc2626;
          font-size: 12px;
          margin-top: 4px;
        }

        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .checkbox-label:hover {
          background-color: #f3f4f6;
        }

        .checkbox-label input[type="checkbox"] {
          margin: 0;
        }

        .checkbox-label span {
          font-size: 14px;
          color: #374151;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background-color: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2563eb;
        }

        .btn-secondary {
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background-color: #e5e7eb;
        }

        @media (max-width: 768px) {
          .user-form-modal {
            margin: 0;
            border-radius: 0;
            max-height: 100vh;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .permissions-grid {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column-reverse;
          }
        }
      `}</style>
    </div>
  );
}
