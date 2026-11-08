"use client";

import { useState } from "react";
import { Check, ChevronDown, UserPlus, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { isAxiosError } from "axios";

import {
  useAssignEmailThread,
  useEmailAssignableUsers,
  type EmailMessage,
} from "@/hooks/api/useSocial";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tool =
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50";

/** Design Assign dropdown: the conversation's agent, with Unassigned. */
export function EmailAssignMenu({ email }: { email: EmailMessage }) {
  const t = useTranslations("email.view");
  const { toast } = useToast();
  const assign = useAssignEmailThread();
  // The agent list loads only once the dropdown is opened (it is one request
  // per mailbox, cached for a minute) — not on every message opened.
  const [open, setOpen] = useState(false);
  const { data: users = [], isLoading } = useEmailAssignableUsers(email.connection_id, { enabled: open });
  const current = email.assignee ?? null;

  function choose(userId: number | null) {
    if (!email.thread_id) return;
    assign.mutate(
      { connection_id: email.connection_id, thread_id: email.thread_id, user_id: userId },
      {
        onSuccess: (data) =>
          toast({
            title: data.assignee ? t("assignedToToast", { name: data.assignee.name }) : t("unassignedToast"),
          }),
        onError: (error) => {
          const detail = isAxiosError(error)
            ? (error.response?.data as { error?: string; detail?: string } | undefined)
            : undefined;
          toast({
            title: t("assignFailed"),
            description: detail?.error || detail?.detail,
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button type="button" className={tool} disabled={!email.thread_id || assign.isPending} data-testid="email-assign">
          {current ? (
            <>
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary/10 text-[8px] font-semibold text-primary">
                {current.initials}
              </span>
              <span className="hidden max-w-[120px] truncate text-foreground sm:inline">{current.name}</span>
            </>
          ) : (
            <>
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("assign")}</span>
            </>
          )}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        {isLoading && <div className="px-2 py-1.5 text-xs text-muted-foreground">…</div>}
        {users.map((user) => (
          <DropdownMenuItem key={user.id} onClick={() => choose(user.id)} className="h-[30px] gap-2 text-[13px]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[8px] font-semibold text-primary">
              {user.initials}
            </span>
            <span className="min-w-0 flex-1 truncate">{user.name}</span>
            <Check className={cn("h-3.5 w-3.5", current?.id === user.id ? "opacity-100" : "opacity-0")} />
          </DropdownMenuItem>
        ))}
        {!isLoading && users.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">{t("noAssignableUsers")}</div>
        )}
        {current && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => choose(null)} className="h-[30px] gap-2 text-[13px]">
              <UserX className="h-4 w-4 text-muted-foreground" />
              {t("unassign")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
