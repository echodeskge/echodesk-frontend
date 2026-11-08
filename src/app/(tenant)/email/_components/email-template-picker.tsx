"use client";

import { useState } from "react";
import { FileText, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  useQuickReplies,
  useUseQuickReply,
  type QuickReply,
  type QuickReplyUseParams,
} from "@/hooks/api/useSocial";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface EmailTemplatePickerProps {
  /** Values for {{customer_name}} etc. */
  variables: QuickReplyUseParams;
  onInsert: (text: string) => void;
}

/** Templates only for email (or all platforms). */
export function emailTemplates(replies: QuickReply[]): QuickReply[] {
  return replies.filter(
    (r) => !r.platforms || r.platforms.length === 0 || r.platforms.includes("all") || r.platforms.includes("email")
  );
}

/** Design composer "Template" button: quick replies for email, variables filled in. */
export function EmailTemplatePicker({ variables, onInsert }: EmailTemplatePickerProps) {
  const t = useTranslations("email.compose");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuickReplies({ platform: "email" });
  const useReply = useUseQuickReply();

  const q = search.trim().toLowerCase();
  const items = emailTemplates(data).filter(
    (r) => !q || r.title.toLowerCase().includes(q) || r.message.toLowerCase().includes(q)
  );

  function pick(reply: QuickReply) {
    useReply.mutate(
      { id: reply.id, variables },
      {
        onSuccess: (res) => {
          onInsert(res.processed_message);
          setOpen(false);
        },
        // Insert the raw text if the server can't fill the variables.
        onError: () => {
          onInsert(reply.message);
          setOpen(false);
        },
      }
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t("insertTemplate")}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          data-testid="email-template"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">{t("template")}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-[320px] p-0">
        <div className="relative border-b">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchTemplates")}
            className="h-9 w-full bg-transparent pe-2 ps-8 text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">{t("noTemplates")}</p>
          ) : (
            items.map((reply) => (
              <button
                key={reply.id}
                type="button"
                onClick={() => pick(reply)}
                disabled={useReply.isPending}
                className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-start hover:bg-muted"
              >
                <span className="text-[13px] font-medium">{reply.title}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{reply.message}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
