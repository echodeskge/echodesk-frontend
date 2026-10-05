"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { enGB, ka } from "date-fns/locale"
import { useLocale } from "next-intl"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  /** YYYY-MM-DD */
  value: string
  onChange: (isoDate: string) => void
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
}

function parseIso(value: string): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/** A button that opens a month calendar; works with YYYY-MM-DD strings. */
export function DatePicker({ value, onChange, placeholder, className, id, disabled }: DatePickerProps) {
  const locale = useLocale()
  const [open, setOpen] = React.useState(false)
  const date = parseIso(value)
  const dateLocale = locale === "ka" ? ka : enGB

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("justify-start text-left font-normal capitalize", !date && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "EEE, d MMM yyyy", { locale: dateLocale }) : placeholder || ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          locale={dateLocale}
          weekStartsOn={1}
          onSelect={(picked) => {
            if (picked) {
              onChange(toIsoDate(picked))
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
