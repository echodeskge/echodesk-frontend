"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Check, Search, X } from "lucide-react"
import axios from "@/api/axios"
import { cn } from "@/lib/utils"
import { FieldShell, inputClass } from "./field-shell"

/** Minimal user row (`/api/users/?lite=1` or `context.users`). */
export interface PickerUser {
  id: number
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  /** SCHEMAS.md `context.users` rows carry `name` instead of first/last. */
  name?: string
  role?: string
  is_active?: boolean
}

export function pickerUserLabel(u: PickerUser): string {
  const name = u.full_name || u.name || [u.first_name, u.last_name].filter(Boolean).join(" ")
  return name.trim() || u.email
}

/** `context.users` when a step provides it, else one fetch of the active users. */
export function usePickerUsers(given?: unknown): { users: PickerUser[]; loading: boolean } {
  const fromContext = useMemo(() => (Array.isArray(given) ? (given as PickerUser[]) : null), [given])
  const [fetched, setFetched] = useState<PickerUser[] | null>(null)
  const [loading, setLoading] = useState(fromContext === null)
  useEffect(() => {
    if (fromContext !== null) return
    let alive = true
    setLoading(true)
    axios
      .get("/api/users/", { params: { lite: 1, page_size: 200, is_active: true } })
      .then((res) => {
        const data = res.data as unknown
        const rows = Array.isArray(data) ? data : ((data as { results?: unknown })?.results ?? [])
        if (alive) setFetched(Array.isArray(rows) ? (rows as PickerUser[]) : [])
      })
      .catch(() => alive && setFetched([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [fromContext])
  return { users: fromContext ?? fetched ?? [], loading: fromContext === null && loading }
}

/** Multi-select of users: selected chips above, a searchable checklist below. */
export function UsersPicker({
  label,
  help,
  error,
  users: given,
  value,
  onChange,
  disabled,
  className,
  testId = "users-picker",
}: {
  label?: ReactNode
  help?: ReactNode
  error?: string | null
  /** Pass `context.users` to skip the fetch. */
  users?: unknown
  value: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
  className?: string
  testId?: string
}) {
  const t = useTranslations("onboarding.fields")
  const { users, loading } = usePickerUsers(given)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => pickerUserLabel(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, query])

  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  const selected = users.filter((u) => value.includes(u.id))

  return (
    <FieldShell as="div" label={label} help={help} error={error} className={className} testId={testId}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid={`${testId}-selected`}>
          {selected.map((u) => (
            <span key={u.id} className="inline-flex h-6 items-center gap-1 rounded-full border bg-muted/60 ps-2.5 pe-1 text-xs">
              {pickerUserLabel(u)}
              <button
                type="button"
                onClick={() => toggle(u.id)}
                disabled={disabled}
                aria-label={`${pickerUserLabel(u)} ×`}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchUsers")}
          disabled={disabled}
          className={cn(inputClass, "ps-8")}
          data-testid={`${testId}-search`}
        />
      </div>
      <div role="listbox" aria-multiselectable className="max-h-56 overflow-y-auto rounded-[10px] border bg-card">
        {loading ? (
          <div className="px-3 py-3 text-xs text-muted-foreground">…</div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-3 text-xs text-muted-foreground">{t("noUsers")}</div>
        ) : (
          filtered.map((u) => {
            const on = value.includes(u.id)
            return (
              <button
                key={u.id}
                type="button"
                role="option"
                aria-selected={on}
                disabled={disabled}
                onClick={() => toggle(u.id)}
                data-testid={`${testId}-user-${u.id}`}
                className={cn(
                  "flex w-full items-center gap-2.5 border-b px-3 py-2 text-left text-[13px] last:border-b-0 hover:bg-accent disabled:opacity-50",
                  on && "bg-primary/5"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
                  )}
                >
                  {on && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{pickerUserLabel(u)}</span>
                <span className="hidden truncate text-xs text-muted-foreground sm:inline">{u.email}</span>
              </button>
            )
          })
        )}
      </div>
      <span className="text-xs text-muted-foreground" data-testid={`${testId}-count`}>
        {t("selectedCount", { count: value.length })}
      </span>
    </FieldShell>
  )
}
