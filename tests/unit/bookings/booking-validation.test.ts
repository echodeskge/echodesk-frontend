/**
 * Tests for booking CRUD form validation logic.
 * Validates required fields, numeric constraints, and error clearing.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Validation functions (mirrors page-level validation logic)
// ---------------------------------------------------------------------------

interface ServiceFormData {
  name: string;
  description: string;
  duration_minutes: string;
  base_price: string;
  booking_type: "duration_based" | "fixed_slots";
  status: "active" | "inactive";
}

interface CategoryFormData {
  name: string;
  description: string;
  is_active: boolean;
}

interface StaffFormData {
  user_id: string;
  bio: string;
  is_active_for_bookings: boolean;
  service_ids: number[];
}

function validateServiceForm(data: ServiceFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.name.trim()) errors.name = "Service name is required";
  if (!data.base_price) {
    errors.base_price = "Price is required";
  } else if (parseFloat(data.base_price) <= 0) {
    errors.base_price = "Price must be greater than 0";
  }
  if (!data.duration_minutes) {
    errors.duration_minutes = "Duration is required";
  } else if (parseInt(data.duration_minutes) <= 0) {
    errors.duration_minutes = "Duration must be greater than 0";
  }
  return errors;
}

function validateCategoryForm(data: CategoryFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.name.trim()) errors.name = "Category name is required";
  return errors;
}

function validateStaffForm(
  data: StaffFormData,
  isEditing: boolean
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isEditing && !data.user_id) errors.user_id = "Please select a user";
  if (data.service_ids.length === 0)
    errors.service_ids = "At least one service must be selected";
  return errors;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Service Form Validation", () => {
  const validService: ServiceFormData = {
    name: "Haircut",
    description: "Basic haircut",
    duration_minutes: "60",
    base_price: "25.00",
    booking_type: "duration_based",
    status: "active",
  };

  it("passes with valid data", () => {
    expect(validateServiceForm(validService)).toEqual({});
  });

  it("requires name", () => {
    const errors = validateServiceForm({ ...validService, name: "" });
    expect(errors.name).toBe("Service name is required");
  });

  it("requires name to be non-whitespace", () => {
    const errors = validateServiceForm({ ...validService, name: "   " });
    expect(errors.name).toBe("Service name is required");
  });

  it("requires price", () => {
    const errors = validateServiceForm({ ...validService, base_price: "" });
    expect(errors.base_price).toBe("Price is required");
  });

  it("requires positive price", () => {
    const errors = validateServiceForm({ ...validService, base_price: "0" });
    expect(errors.base_price).toBe("Price must be greater than 0");
  });

  it("rejects negative price", () => {
    const errors = validateServiceForm({ ...validService, base_price: "-5" });
    expect(errors.base_price).toBe("Price must be greater than 0");
  });

  it("requires duration", () => {
    const errors = validateServiceForm({
      ...validService,
      duration_minutes: "",
    });
    expect(errors.duration_minutes).toBe("Duration is required");
  });

  it("requires positive duration", () => {
    const errors = validateServiceForm({
      ...validService,
      duration_minutes: "0",
    });
    expect(errors.duration_minutes).toBe("Duration must be greater than 0");
  });

  it("rejects negative duration", () => {
    const errors = validateServiceForm({
      ...validService,
      duration_minutes: "-10",
    });
    expect(errors.duration_minutes).toBe("Duration must be greater than 0");
  });

  it("returns all errors at once", () => {
    const errors = validateServiceForm({
      ...validService,
      name: "",
      base_price: "",
      duration_minutes: "",
    });
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["name", "base_price", "duration_minutes"])
    );
  });

  it("allows decimal prices", () => {
    const errors = validateServiceForm({
      ...validService,
      base_price: "0.01",
    });
    expect(errors.base_price).toBeUndefined();
  });
});

describe("Category Form Validation", () => {
  it("passes with valid name", () => {
    expect(
      validateCategoryForm({ name: "Beauty", description: "", is_active: true })
    ).toEqual({});
  });

  it("requires name", () => {
    const errors = validateCategoryForm({
      name: "",
      description: "",
      is_active: true,
    });
    expect(errors.name).toBe("Category name is required");
  });

  it("requires name to be non-whitespace", () => {
    const errors = validateCategoryForm({
      name: "  ",
      description: "",
      is_active: true,
    });
    expect(errors.name).toBe("Category name is required");
  });

  it("does not require description", () => {
    const errors = validateCategoryForm({
      name: "Beauty",
      description: "",
      is_active: true,
    });
    expect(errors.description).toBeUndefined();
  });
});

describe("Staff Form Validation", () => {
  const validStaff: StaffFormData = {
    user_id: "1",
    bio: "",
    is_active_for_bookings: true,
    service_ids: [1, 2],
  };

  it("passes with valid data (new)", () => {
    expect(validateStaffForm(validStaff, false)).toEqual({});
  });

  it("requires user when creating", () => {
    const errors = validateStaffForm({ ...validStaff, user_id: "" }, false);
    expect(errors.user_id).toBe("Please select a user");
  });

  it("does not require user when editing", () => {
    const errors = validateStaffForm({ ...validStaff, user_id: "" }, true);
    expect(errors.user_id).toBeUndefined();
  });

  it("requires at least one service", () => {
    const errors = validateStaffForm(
      { ...validStaff, service_ids: [] },
      false
    );
    expect(errors.service_ids).toBe("At least one service must be selected");
  });

  it("passes with one service", () => {
    const errors = validateStaffForm(
      { ...validStaff, service_ids: [5] },
      false
    );
    expect(errors.service_ids).toBeUndefined();
  });

  it("does not require bio", () => {
    const errors = validateStaffForm({ ...validStaff, bio: "" }, false);
    expect(errors.bio).toBeUndefined();
  });

  it("returns all errors at once", () => {
    const errors = validateStaffForm(
      { user_id: "", bio: "", is_active_for_bookings: true, service_ids: [] },
      false
    );
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["user_id", "service_ids"])
    );
  });
});
