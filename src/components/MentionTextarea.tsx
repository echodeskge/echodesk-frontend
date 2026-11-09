"use client"

/**
 * Textarea with an `@` mention list (plan FE-11, fixes W72).
 *
 * - Typing `@` at the start of a word opens a list of users filtered by what
 *   follows; ArrowUp/ArrowDown move, Enter/Tab insert `@email `, Escape
 *   closes. Clicking an option inserts it without losing focus.
 * - Users come from the `users` prop, or, when it is left out, from every
 *   page of `/api/users/` (page_size=100 until `next` is null).
 * - "No users found" is translated (`tickets.noUsersFound`).
 * - The ref exposes `insertText` (at the caret), `openMention` (inserts `@`
 *   at the caret and opens the list) and `focus`, for toolbar buttons.
 * - Keys the list doesn't use go to `onKeyDown`, so callers can bind ⌘↵.
 *
 * The old ticket detail (`TicketCommentInput`) uses the original props
 * (`value`, `onChange`, `placeholder`, `className`, `disabled`) unchanged.
 */
import {
  forwardRef,
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import axios from '@/api/axios'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export interface MentionUser {
  id: number
  email: string
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
}

export interface MentionTextareaHandle {
  focus: () => void
  /** Insert text at the caret (replacing a selection) and focus. */
  insertText: (text: string) => void
  /** Insert `@` at the caret (with a space before it when needed) and open the list. */
  openMention: () => void
  readonly element: HTMLTextAreaElement | null
}

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Classes for the textarea. */
  className?: string
  /** Classes for the wrapper. */
  wrapperClassName?: string
  disabled?: boolean
  /** Users to suggest; when left out every page of `/api/users/` is loaded. */
  users?: MentionUser[]
  /** Where the list opens relative to the caret line (`above` for bottom-docked composers). */
  placement?: 'below' | 'above'
  rows?: number
  id?: string
  'aria-label'?: string
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onFocus?: (e: FocusEvent<HTMLTextAreaElement>) => void
  onBlur?: (e: FocusEvent<HTMLTextAreaElement>) => void
}

const MAX_SUGGESTIONS = 10
const LIST_WIDTH = 260

export function mentionUserName(user: MentionUser): string {
  return (
    user.full_name?.trim() ||
    `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() ||
    user.email
  )
}

/**
 * The mention being typed at `caret`: the `@` must start a word (start of
 * text or after whitespace) and the text after it must have no whitespace.
 */
export function findMentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret)
  const at = before.lastIndexOf('@')
  if (at === -1) return null
  if (at > 0 && !/\s/.test(before[at - 1])) return null
  const query = before.slice(at + 1)
  if (/\s/.test(query)) return null
  return { start: at, query }
}

export function filterMentionUsers<U extends MentionUser>(users: U[], query: string, limit = MAX_SUGGESTIONS): U[] {
  const q = query.trim().toLowerCase()
  const list = q
    ? users.filter((u) =>
        [u.email, u.first_name, u.last_name, u.full_name, mentionUserName(u)]
          .some((v) => (v ?? '').toLowerCase().includes(q))
      )
    : users
  return list.slice(0, limit)
}

/** Every page of `/api/users/`. */
async function fetchAllUsers(): Promise<MentionUser[]> {
  const out: MentionUser[] = []
  for (let page = 1; page < 100; page++) {
    const { data } = await axios.get('/api/users/', { params: { page, page_size: 100 } })
    if (Array.isArray(data)) return data as MentionUser[]
    out.push(...((data?.results ?? []) as MentionUser[]))
    if (!data?.next) break
  }
  return out
}

/** Caret position (px) inside the textarea, measured with a mirror div. */
function caretCoordinates(element: HTMLTextAreaElement, position: number) {
  if (typeof document === 'undefined') return { top: 0, left: 0 }
  const div = document.createElement('div')
  const style = window.getComputedStyle(element)
  const props = [
    'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderLeftWidth', 'boxSizing', 'wordWrap',
  ] as const
  for (const p of props) div.style[p] = style[p]
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.width = `${element.offsetWidth}px`
  div.textContent = element.value.slice(0, position)
  const span = document.createElement('span')
  span.textContent = element.value.slice(position) || '.'
  div.appendChild(span)
  document.body.appendChild(div)
  const coords = { top: span.offsetTop - element.scrollTop, left: span.offsetLeft }
  document.body.removeChild(div)
  return coords
}

export const MentionTextarea = forwardRef<MentionTextareaHandle, MentionTextareaProps>(function MentionTextarea(
  {
    value,
    onChange,
    placeholder,
    className,
    wrapperClassName,
    disabled,
    users: usersProp,
    placement = 'below',
    rows,
    id,
    'aria-label': ariaLabel,
    onKeyDown,
    onFocus,
    onBlur,
  },
  ref
) {
  const t = useTranslations('tickets')
  const listId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const [mention, setMention] = useState<{ start: number; query: string; caret: number } | null>(null)
  const [selected, setSelected] = useState(0)
  const [pos, setPos] = useState({ top: 0, left: 0, height: 0, width: 0 })

  const fetched = useQuery({
    queryKey: ['mentionUsers'],
    queryFn: fetchAllUsers,
    enabled: usersProp === undefined,
    staleTime: 5 * 60_000,
  })
  const matches = useMemo(
    () => (mention ? filterMentionUsers(usersProp ?? fetched.data ?? [], mention.query) : []),
    [usersProp, fetched.data, mention]
  )

  // Apply a caret position after a controlled value change.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (el && pendingCaret.current !== null) {
      const c = pendingCaret.current
      pendingCaret.current = null
      el.focus()
      el.setSelectionRange(c, c)
    }
  }, [value])

  const place = useCallback((caret: number) => {
    const el = textareaRef.current
    if (!el) return
    const c = caretCoordinates(el, caret)
    setPos({ top: c.top, left: c.left, height: el.offsetHeight, width: el.offsetWidth })
  }, [])

  const openAt = useCallback(
    (start: number, query: string, caret: number) => {
      setMention({ start, query, caret })
      setSelected(0)
      place(caret)
    },
    [place]
  )

  const sync = useCallback(
    (text: string, caret: number) => {
      const m = findMentionQuery(text, caret)
      if (m) openAt(m.start, m.query, caret)
      else setMention(null)
    },
    [openAt]
  )

  const setValue = (next: string, caret: number) => {
    pendingCaret.current = caret
    onChange(next)
  }

  const insertMention = (user: MentionUser) => {
    if (!mention) return
    const text = `@${user.email} `
    const next = value.slice(0, mention.start) + text + value.slice(mention.caret)
    setMention(null)
    setValue(next, mention.start + text.length)
  }

  useImperativeHandle(
    ref,
    () => ({
      get element() {
        return textareaRef.current
      },
      focus: () => textareaRef.current?.focus(),
      insertText: (text: string) => {
        const el = textareaRef.current
        const start = el ? el.selectionStart ?? value.length : value.length
        const end = el ? el.selectionEnd ?? start : start
        setMention(null)
        setValue(value.slice(0, start) + text + value.slice(end), start + text.length)
      },
      openMention: () => {
        const el = textareaRef.current
        const start = el ? el.selectionStart ?? value.length : value.length
        const end = el ? el.selectionEnd ?? start : start
        const needsSpace = start > 0 && !/\s/.test(value[start - 1])
        const text = needsSpace ? ' @' : '@'
        const next = value.slice(0, start) + text + value.slice(end)
        const caret = start + text.length
        setValue(next, caret)
        // Measure after the value lands.
        requestAnimationFrame(() => place(caret))
        setMention({ start: caret - 1, query: '', caret })
        setSelected(0)
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, place]
  )

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setMention(null)
        return
      }
      if (matches.length > 0 && !e.metaKey && !e.ctrlKey) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelected((s) => (s + 1) % matches.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelected((s) => (s - 1 + matches.length) % matches.length)
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          insertMention(matches[Math.min(selected, matches.length - 1)])
          return
        }
      }
    }
    onKeyDown?.(e)
  }

  const open = mention !== null
  const width = Math.min(LIST_WIDTH, pos.width || LIST_WIDTH)
  const left = Math.max(0, Math.min(pos.left, (pos.width || LIST_WIDTH) - width))
  const style =
    placement === 'above'
      ? { bottom: `${Math.max(0, pos.height - pos.top) + 2}px`, left: `${left}px`, width: `${width}px` }
      : { top: `${pos.top + 22}px`, left: `${left}px`, width: `${width}px` }
  const activeId = open && matches.length > 0 ? `${listId}-opt-${Math.min(selected, matches.length - 1)}` : undefined

  return (
    <div className={cn('relative', wrapperClassName)}>
      <Textarea
        ref={textareaRef}
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          sync(e.target.value, e.target.selectionStart ?? e.target.value.length)
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            sync(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
          }
        }}
        onClick={(e) => sync(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
        onFocus={onFocus}
        onBlur={(e) => {
          setMention(null)
          onBlur?.(e)
        }}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeId}
      />

      {open && (
        <div
          data-slot="mention-list"
          data-placement={placement}
          className="absolute z-50 max-h-60 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          style={style}
        >
          {matches.length === 0 ? (
            <p className="px-2 py-1.5 text-center text-xs text-muted-foreground">{t('noUsersFound')}</p>
          ) : (
            <ul id={listId} role="listbox" aria-label={t('mentionSuggestions')}>
              {matches.map((user, index) => {
                const name = mentionUserName(user)
                const active = index === Math.min(selected, matches.length - 1)
                return (
                  <li
                    key={user.id}
                    id={`${listId}-opt-${index}`}
                    role="option"
                    aria-selected={active}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      insertMention(user)
                    }}
                    onMouseEnter={() => setSelected(index)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5',
                      active && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                      {(user.first_name?.[0] ?? name[0] ?? '?')}{user.last_name?.[0] ?? ''}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{name}</span>
                      {name !== user.email && (
                        <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
})
