"use client";

import { useEmailStatus } from "@/hooks/api/useSocial";
import { useEmailContext } from "../_hooks/use-email-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail } from "lucide-react";

export function EmailConnectionSelector() {
  const { currentConnectionId, setCurrentConnectionId } = useEmailContext();
  const { data: emailStatus, isLoading } = useEmailStatus();

  if (isLoading) {
    return (
      <div className="px-3 pb-2">
        <div className="h-9 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  const connections = emailStatus?.connections ?? [];

  if (connections.length === 0) {
    return (
      <div className="px-3 pb-2">
        <p className="text-sm text-muted-foreground text-center py-2">
          No email accounts connected
        </p>
      </div>
    );
  }

  if (connections.length === 1) {
    return (
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted rounded-md">
          <Mail className="h-4 w-4 shrink-0" />
          <span className="truncate">{connections[0].email_address}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-2">
      <Select
        value={currentConnectionId?.toString() ?? "all"}
        onValueChange={(val) =>
          setCurrentConnectionId(val === "all" ? null : Number(val))
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            value="all"
            className="focus:bg-primary/10 focus:text-primary"
          >
            All accounts
          </SelectItem>
          {connections.map((conn) => (
            <SelectItem
              key={conn.id}
              value={conn.id.toString()}
              className="focus:bg-primary/10 focus:text-primary"
            >
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {conn.display_name || conn.email_address}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
