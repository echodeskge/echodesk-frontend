"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";

export function EmailListSearchForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("search") ?? "");
  const debouncedTerm = useDebounce(term, 300);
  const t = useTranslations("email.list");

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedTerm) {
      params.set("search", debouncedTerm);
      params.delete("page");
    } else {
      params.delete("search");
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [debouncedTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative grow">
      <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="w-full bg-muted ps-9"
        placeholder={t("search")}
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
    </div>
  );
}
