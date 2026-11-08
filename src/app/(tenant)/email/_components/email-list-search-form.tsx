"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";

/** Design "Search mail…" box (debounced `?search=`). */
export function EmailListSearchForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("search") ?? "");
  const debouncedTerm = useDebounce(term, 300);
  const t = useTranslations("email.list");

  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (current === debouncedTerm) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedTerm) {
      params.set("search", debouncedTerm);
      params.delete("page");
    } else {
      params.delete("search");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [debouncedTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute start-2 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-muted-foreground" />
      <input
        className="h-7 w-full rounded-md border border-input bg-background pe-2 ps-[26px] text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-foreground/10"
        placeholder={t("search")}
        type="search"
        aria-label={t("search")}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
    </div>
  );
}
