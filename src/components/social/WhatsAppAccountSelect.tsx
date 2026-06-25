"use client";

import { useWhatsAppStatus } from "@/hooks/api/useSocial";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WhatsAppAccount {
  id: number;
  waba_id: string;
  business_name: string;
  phone_number: string;
  display_phone_number: string;
  quality_rating: string;
  is_active: boolean;
}

interface WhatsAppStatus {
  connected: boolean;
  accounts_count: number;
  accounts: WhatsAppAccount[];
}

interface Props {
  value: string;
  onChange: (wabaId: string) => void;
  className?: string;
}

/**
 * Dumb selector for the WhatsApp Business Account to send from. Mirrors the
 * email connection-selector pattern: the caller gates on `accounts.length > 1`
 * and owns the default. Lists only active accounts.
 */
export function WhatsAppAccountSelect({ value, onChange, className }: Props) {
  const { data } = useWhatsAppStatus();
  const status = data as WhatsAppStatus | undefined;
  const accounts = (status?.accounts || []).filter((a) => a.is_active);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((a) => (
          <SelectItem key={a.waba_id} value={a.waba_id}>
            {a.business_name} ({a.display_phone_number || a.phone_number})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
