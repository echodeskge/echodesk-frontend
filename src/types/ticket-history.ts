// Temporary interface for TicketHistory until API schema is updated
export interface TicketHistory {
  id: number;
  ticket: number;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  user?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  created_at: string;
}
