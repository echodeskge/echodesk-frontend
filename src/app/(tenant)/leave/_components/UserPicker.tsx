"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { fetchLiteUsers, userLabel, type LiteUser } from "../_lib/hr-api"

/**
 * Load active users once per distinct filter (`/api/users/?lite=1`).
 * Pass `users` to the pickers to share one fetch across several pickers.
 */
export function useLiteUsers(params: Record<string, unknown> = {}, enabled = true) {
  const key = JSON.stringify(params)
  const [users, setUsers] = useState<LiteUser[]>([])
  const [loading, setLoading] = useState(enabled)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    setLoading(true)
    fetchLiteUsers(JSON.parse(key))
      .then((rows) => alive && setUsers(rows))
      .catch(() => alive && setUsers([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [key, enabled])
  return { users, loading }
}

interface UserPickerProps {
  users: LiteUser[]
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
  excludeIds?: number[]
  disabled?: boolean
  allowClear?: boolean
  className?: string
}

/** Searchable single-user combobox. */
export function UserPicker({
  users,
  value,
  onChange,
  placeholder,
  excludeIds = [],
  disabled,
  allowClear,
  className,
}: UserPickerProps) {
  const t = useTranslations("leave")
  const [open, setOpen] = useState(false)
  const selected = users.find((u) => u.id === value)
  const options = useMemo(
    () => users.filter((u) => u.id === value || !excludeIds.includes(u.id)),
    [users, excludeIds, value]
  )
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? userLabel(selected) : placeholder || t("hr.common.selectUser")}
          </span>
          <span className="flex items-center gap-1">
            {allowClear && selected && (
              <X
                className="h-4 w-4 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(null)
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("hr.common.searchUsers")} />
          <CommandList>
            <CommandEmpty>{t("hr.common.noUsers")}</CommandEmpty>
            <CommandGroup>
              {options.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`${userLabel(u)} ${u.email} ${u.id}`}
                  onSelect={() => {
                    onChange(u.id)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("h-4 w-4", u.id === value ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{userLabel(u)}</span>
                    {u.email && userLabel(u) !== u.email && (
                      <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface MultiUserPickerProps {
  users: LiteUser[]
  value: number[]
  onChange: (ids: number[]) => void
  placeholder?: string
  disabled?: boolean
}

/** Searchable multi-user combobox with removable chips. */
export function MultiUserPicker({ users, value, onChange, placeholder, disabled }: MultiUserPickerProps) {
  const t = useTranslations("leave")
  const [open, setOpen] = useState(false)
  const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const toggle = (id: number) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground truncate">
              {value.length > 0
                ? t("hr.common.selectedCount", { count: value.length })
                : placeholder || t("hr.common.selectUsers")}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t("hr.common.searchUsers")} />
            <CommandList>
              <CommandEmpty>{t("hr.common.noUsers")}</CommandEmpty>
              <CommandGroup>
                {users.map((u) => (
                  <CommandItem
                    key={u.id}
                    value={`${userLabel(u)} ${u.email} ${u.id}`}
                    onSelect={() => toggle(u.id)}
                  >
                    <Check className={cn("h-4 w-4", value.includes(u.id) ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{userLabel(u)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((id) => {
            const u = byId.get(id)
            return (
              <Badge key={id} variant="secondary" className="gap-1">
                {u ? userLabel(u) : `#${id}`}
                {!disabled && (
                  <button
                    type="button"
                    aria-label={t("hr.common.remove")}
                    onClick={() => toggle(id)}
                    className="opacity-60 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
