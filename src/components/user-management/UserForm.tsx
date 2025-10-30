"use client";

import { useState, useEffect } from "react";
import { UserCreate, UserUpdate, User, TenantGroup } from "@/api/generated/interfaces";
import { apiTenantGroupsList, apiUsersRetrieve } from "@/api/generated/api";
import MultiGroupSelection from "@/components/MultiGroupSelection";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { XCircle, AlertCircle } from "lucide-react";

interface UserFormProps {
  mode: "create" | "edit";
  user?: User;
  open: boolean;
  onSubmit: (userData: UserCreate | UserUpdate) => Promise<void>;
  onClose: () => void;
}

export default function UserForm({
  mode,
  user,
  open,
  onSubmit,
  onClose,
}: UserFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantGroups, setTenantGroups] = useState<TenantGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [fullUserData, setFullUserData] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    email: user?.email || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    is_active: user?.is_active ?? true,
    tenant_group_ids: user?.tenant_group_ids || [],
    phone_number: user?.phone_number || "",
    status: user?.is_active ? "active" : "inactive",
  });

  // Fetch full user details when in edit mode
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (mode === 'edit' && user?.id) {
        setLoadingUserDetails(true);
        try {
          const fullUser = await apiUsersRetrieve(user.id);
          setFullUserData(fullUser);
        } catch (error) {
          console.error('Failed to fetch full user details:', error);
          // Fall back to the user prop data
          setFullUserData(user);
        } finally {
          setLoadingUserDetails(false);
        }
      } else {
        setFullUserData(user || null);
      }
    };

    fetchUserDetails();
  }, [user, mode]);

  // Update form data when user prop changes (important for edit mode)
  useEffect(() => {
    const userData = fullUserData || user;
    if (userData) {

      setFormData(prev => ({
        ...prev,
        email: userData.email || "",
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        is_active: userData.is_active ?? true,
        tenant_group_ids: userData.tenant_group_ids || (userData.tenant_groups ? userData.tenant_groups.map(g => g.id) : []),
        phone_number: userData.phone_number || "",
        status: userData.is_active ? "active" : "inactive",
      }));
    }
  }, [fullUserData, user]);

  // Load tenant groups on component mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const tenantGroupsResponse = await apiTenantGroupsList();
        setTenantGroups(tenantGroupsResponse.results || []);
      } catch (error) {
        console.error('Failed to load tenant groups:', error);
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
          tenant_group_ids: formData.tenant_group_ids.length > 0 ? formData.tenant_group_ids : undefined,
          phone_number: formData.phone_number || undefined,
        };
        await onSubmit(createData);
      } else {
        const updateData: any = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          status: formData.status as any,
          tenant_group_ids: formData.tenant_group_ids.length > 0 ? formData.tenant_group_ids : undefined,
          phone_number: formData.phone_number || undefined,
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New User" : "Edit User"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new user account. A secure password will be auto-generated and emailed to the user."
              : `Update user information for ${user?.email}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {errors.submit && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={mode === "edit"}
                placeholder="user@example.com"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                type="text"
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                placeholder="John"
                className={errors.first_name ? "border-destructive" : ""}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                type="text"
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                placeholder="Doe"
                className={errors.last_name ? "border-destructive" : ""}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleChange("phone_number", e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {mode === "edit" && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status?.toString() || ""}
                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white" style={{ backgroundColor: 'white' }}>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Group Assignment Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold">Group Assignment</h3>
            <div className="space-y-2">
              <Label htmlFor="tenant-groups">Tenant Groups</Label>
              {(loadingGroups || loadingUserDetails) ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="h-6 w-6 mr-2" />
                  <p className="text-sm text-muted-foreground">
                    {loadingUserDetails ? 'Loading user details...' : 'Loading groups...'}
                  </p>
                </div>
              ) : (
                <MultiGroupSelection
                  groups={tenantGroups}
                  selectedGroupIds={formData.tenant_group_ids}
                  onChange={(groupIds) => handleChange("tenant_group_ids", groupIds)}
                  disabled={isSubmitting}
                  placeholder="Select groups to assign to this user..."
                />
              )}
            </div>
          </div>

          {/* User Active Status (Edit Mode Only) */}
          {mode === "edit" && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold">User Status</h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleChange("is_active", checked as boolean)}
                />
                <Label htmlFor="is_active" className="font-normal cursor-pointer">
                  User is active
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                  ? "Create User"
                  : "Update User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
