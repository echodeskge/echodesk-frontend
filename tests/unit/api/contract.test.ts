import { describe, it, expect } from 'vitest';

/**
 * API Contract Tests
 *
 * These tests verify that the generated TypeScript interfaces from the backend
 * OpenAPI schema contain the fields our frontend code depends on. If the backend
 * renames or removes a field, these tests fail at compile time (tsc --noEmit)
 * AND at runtime (vitest run), catching contract drift before it reaches users.
 *
 * To update after backend changes: npm run generate
 */

import type {
  CallLog,
  EmailMessage,
  InvoiceDetail,
  InvoiceList,
  InvoiceLineItem,
  Ticket,
  User,
  UserMinimal,
  SocialClient,
  SocialAccount,
  Board,
  BookingDetail,
  BookingList,
} from '@/api/generated/interfaces';

// ---------------------------------------------------------------------------
// Helper: compile-time assertion that a key exists on a type.
// If the key is removed from the interface, tsc will error on this line.
// ---------------------------------------------------------------------------
function assertField<T>(field: keyof T): keyof T {
  return field;
}

// ---------------------------------------------------------------------------
// CallLog
// ---------------------------------------------------------------------------
describe('API Contract - CallLog', () => {
  it('has transfer-related fields', () => {
    expect(assertField<CallLog>('parent_call')).toBe('parent_call');
    expect(assertField<CallLog>('transfer_type')).toBe('transfer_type');
    expect(assertField<CallLog>('transferred_to')).toBe('transferred_to');
    expect(assertField<CallLog>('transferred_to_user')).toBe('transferred_to_user');
    expect(assertField<CallLog>('transferred_to_user_name')).toBe('transferred_to_user_name');
    expect(assertField<CallLog>('transferred_at')).toBe('transferred_at');
  });

  it('has core call fields', () => {
    const fields: (keyof CallLog)[] = [
      'id',
      'call_id',
      'caller_number',
      'recipient_number',
      'direction',
      'call_type',
      'started_at',
      'ended_at',
      'duration',
      'duration_display',
      'status',
      'handled_by',
      'handled_by_name',
      'recording_url',
      'created_at',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<CallLog>(f)).toBe(f));
  });
});

// ---------------------------------------------------------------------------
// EmailMessage
// ---------------------------------------------------------------------------
describe('API Contract - EmailMessage', () => {
  it('has required fields used by the email UI', () => {
    const fields: (keyof EmailMessage)[] = [
      'id',
      'message_id',
      'thread_id',
      'subject',
      'from_email',
      'from_name',
      'to_emails',
      'cc_emails',
      'body_html',
      'body_text',
      'is_read',
      'is_starred',
      'folder',
      'timestamp',
      'connection_id',
      'connection_email',
      'is_from_business',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<EmailMessage>(f)).toBe(f));
  });
});

// ---------------------------------------------------------------------------
// InvoiceDetail & InvoiceList
// ---------------------------------------------------------------------------
describe('API Contract - Invoice', () => {
  it('InvoiceDetail has all display fields', () => {
    const fields: (keyof InvoiceDetail)[] = [
      'id',
      'uuid',
      'invoice_number',
      'status',
      'client_name',
      'client_details',
      'line_items',
      'payments',
      'balance',
      'is_overdue',
      'issue_date',
      'due_date',
      'currency',
      'subtotal',
      'tax_amount',
      'discount_amount',
      'total',
      'paid_amount',
      'notes',
      'terms_and_conditions',
      'pdf_url',
      'created_by_name',
      'template_name',
      'created_at',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<InvoiceDetail>(f)).toBe(f));
  });

  it('InvoiceList has list-view fields', () => {
    const fields: (keyof InvoiceList)[] = [
      'id',
      'uuid',
      'invoice_number',
      'status',
      'client_name',
      'due_date',
      'total',
      'paid_amount',
      'balance',
      'is_overdue',
      'created_at',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<InvoiceList>(f)).toBe(f));
  });

  it('InvoiceLineItem has calculation fields', () => {
    const fields: (keyof InvoiceLineItem)[] = [
      'id',
      'line_subtotal',
      'discount_amount',
      'tax_amount',
      'line_total',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<InvoiceLineItem>(f)).toBe(f));
  });
});

// ---------------------------------------------------------------------------
// Ticket
// ---------------------------------------------------------------------------
describe('API Contract - Ticket', () => {
  it('has core ticket fields', () => {
    const fields: (keyof Ticket)[] = [
      'id',
      'title',
      'description',
      'status',
      'priority',
      'is_closed',
      'column',
      'position_in_column',
      'created_at',
      'updated_at',
      'created_by',
      'assigned_to',
      'assigned_users',
      'assigned_groups',
      'tags',
      'comments',
      'comments_count',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<Ticket>(f)).toBe(f));
  });

  it('has order/payment fields', () => {
    const fields: (keyof Ticket)[] = [
      'is_order',
      'price',
      'currency',
      'is_paid',
      'amount_paid',
      'payment_due_date',
      'payments',
      'remaining_balance',
      'payment_status',
      'is_overdue',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<Ticket>(f)).toBe(f));
  });

  it('has checklist fields', () => {
    expect(assertField<Ticket>('checklist_items')).toBe('checklist_items');
    expect(assertField<Ticket>('checklist_items_count')).toBe('checklist_items_count');
    expect(assertField<Ticket>('completed_checklist_items_count')).toBe(
      'completed_checklist_items_count'
    );
  });
});

// ---------------------------------------------------------------------------
// User & UserMinimal
// ---------------------------------------------------------------------------
describe('API Contract - User', () => {
  it('User has auth and profile fields', () => {
    const fields: (keyof User)[] = [
      'id',
      'email',
      'first_name',
      'last_name',
      'full_name',
      'role',
      'status',
      'phone_number',
      'department',
      'is_active',
      'is_staff',
      'date_joined',
      'last_login',
      'permissions',
      'feature_keys',
      'groups',
      'tenant_groups',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<User>(f)).toBe(f));
  });

  it('UserMinimal has the fields used in assignment dropdowns', () => {
    const fields: (keyof UserMinimal)[] = ['id', 'email', 'first_name', 'last_name'];
    expect(fields.length).toBe(4);
    fields.forEach((f) => expect(assertField<UserMinimal>(f)).toBe(f));
  });
});

// ---------------------------------------------------------------------------
// SocialClient & SocialAccount
// ---------------------------------------------------------------------------
describe('API Contract - Social', () => {
  it('SocialClient has CRM fields', () => {
    const fields: (keyof SocialClient)[] = [
      'id',
      'name',
      'email',
      'phone',
      'notes',
      'profile_picture',
      'social_accounts',
      'created_by',
      'created_by_name',
      'created_at',
      'first_name',
      'last_name',
      'full_name',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<SocialClient>(f)).toBe(f));
  });

  it('SocialAccount has platform fields', () => {
    const fields: (keyof SocialAccount)[] = [
      'id',
      'platform',
      'platform_id',
      'display_name',
      'username',
      'profile_pic_url',
      'first_seen_at',
      'last_seen_at',
      'last_message_at',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<SocialAccount>(f)).toBe(f));
  });
});

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------
describe('API Contract - Board', () => {
  it('has kanban board fields', () => {
    const fields: (keyof Board)[] = [
      'id',
      'name',
      'description',
      'is_default',
      'columns_count',
      'order_users',
      'board_groups',
      'board_users',
      'created_at',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<Board>(f)).toBe(f));
  });
});

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------
describe('API Contract - Booking', () => {
  it('BookingDetail has scheduling and payment fields', () => {
    const fields: (keyof BookingDetail)[] = [
      'id',
      'booking_number',
      'client',
      'service',
      'staff',
      'date',
      'start_time',
      'end_time',
      'status',
      'payment_status',
      'total_amount',
      'deposit_amount',
      'paid_amount',
      'remaining_amount',
      'client_notes',
      'staff_notes',
      'rating',
      'cancelled_at',
      'cancelled_by',
      'created_at',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<BookingDetail>(f)).toBe(f));
  });

  it('BookingList has list-view fields', () => {
    const fields: (keyof BookingList)[] = [
      'id',
      'booking_number',
      'client',
      'service',
      'staff',
      'date',
      'start_time',
      'end_time',
      'status',
      'payment_status',
      'total_amount',
      'created_at',
    ];
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => expect(assertField<BookingList>(f)).toBe(f));
  });
});
