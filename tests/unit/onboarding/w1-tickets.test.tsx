/** ONB-W1 Tickets step: draft from prefill/context, contract payload, preview, nested errors. */
import React, { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/api/axios", () => ({ default: { get: (...a: unknown[]) => mocks.get(...a), post: (...a: unknown[]) => mocks.post(...a) } }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => ({ loaded: true, userId: 1, isStaff: true, isSuperuser: false, has: () => false }) }))

import {
  TicketsStep,
  initTicketsAnswers,
  prepareTicketsAnswers,
  presetColumns,
  type TicketsAnswers,
} from "@/app/(tenant)/onboarding/_steps/tickets"
import { getStepDefinition, hasStepComponent } from "@/app/(tenant)/onboarding/_steps"
import { onboardingKeys, type FieldErrors } from "@/app/(tenant)/onboarding/_lib/onboarding-api"
import { makeQueryClient, renderOnb, state, step } from "./helpers"

const USERS = [
  { id: 1, email: "ana@x.ge", first_name: "Ana", last_name: "K" },
  { id: 2, email: "gio@x.ge", first_name: "Gio", last_name: "M" },
]
const CONTEXT = {
  users: USERS,
  groups: [],
  has_boards: false,
  presets: {
    support: [
      { name: "New", name_ka: "ახალი", is_default: true },
      { name: "In progress", name_ka: "მიმდინარე", track_time: true },
      { name: "Waiting for customer", name_ka: "მომხმარებლის მოლოდინში" },
      { name: "Resolved", name_ka: "გადაჭრილი", is_closed_status: true },
    ],
    tasks: ["To do", "In progress", "Review", "Done"],
  },
}

function Harness({
  initial,
  errors = null,
  context = CONTEXT,
  onChange,
}: {
  initial: TicketsAnswers
  errors?: FieldErrors | null
  context?: Record<string, unknown>
  onChange: (a: TicketsAnswers) => void
}) {
  const [answers, set] = useState(initial)
  const setAnswers = (next: TicketsAnswers | ((p: TicketsAnswers) => TicketsAnswers)) => {
    set((prev) => {
      const v = typeof next === "function" ? next(prev) : next
      onChange(v)
      return v
    })
  }
  return <TicketsStep step={step("tickets", 10, { context })} answers={answers} setAnswers={setAnswers} errors={errors} context={context} prefill={{}} />
}

beforeEach(() => {
  mocks.get.mockReset()
  mocks.post.mockReset()
})

describe("tickets answers", () => {
  it("is registered with the contract title key", () => {
    expect(hasStepComponent("tickets")).toBe(true)
    expect(getStepDefinition("tickets").titleKey).toBe("steps.tickets.title")
  })

  it("init splits the mixed form_fields and the telegram pair out of the prefill", () => {
    const a = initTicketsAnswers({
      answers: {},
      prefill: {
        purpose: "jobs",
        team_user_ids: [2, "x", 3.5],
        form_fields: ["phone", { label: "Car plate", type: "string" }, "deadline", { label: "Notes", type: "weird" }],
        tags: ["Urgent", ""],
        only_superadmin_can_delete_tickets: true,
        min_users_per_ticket: 2,
        telegram: { bot_token: "123:abc", chat_id: "-100" },
      },
    })
    expect(a).toEqual({
      purpose: "jobs",
      board_name: "Jobs",
      team_user_ids: [2],
      builtin_fields: ["phone", "deadline"],
      custom_fields: [
        { label: "Car plate", type: "string" },
        { label: "Notes", type: "string" },
      ],
      tags: ["Urgent"],
      only_superadmin_can_delete_tickets: true,
      min_users_per_ticket: 2,
      telegram_bot_token: "123:abc",
      telegram_chat_id: "-100",
    })
  })

  it("init prefers applied answers and tolerates an empty payload", () => {
    expect(initTicketsAnswers({ answers: { purpose: "support", board_name: "Help" }, prefill: { purpose: "tasks" } }).board_name).toBe("Help")
    expect(initTicketsAnswers({ answers: {}, prefill: {} })).toMatchObject({ purpose: null, board_name: "", builtin_fields: [], custom_fields: [], min_users_per_ticket: null })
  })

  it("prepare emits exactly the SCHEMAS.md payload", () => {
    const out = prepareTicketsAnswers({
      purpose: "support",
      board_name: "  Support desk ",
      team_user_ids: [1, 1, 2],
      builtin_fields: ["deadline", "phone"],
      custom_fields: [
        { label: " Car plate ", type: "string" },
        { label: "", type: "date" },
      ],
      tags: [" Urgent", "urgent", "Refund"],
      only_superadmin_can_delete_tickets: true,
      min_users_per_ticket: 250,
      telegram_bot_token: " 123:abc ",
      telegram_chat_id: "-1001",
    })
    expect(out).toEqual({
      purpose: "support",
      board_name: "Support desk",
      team_user_ids: [1, 2],
      form_fields: ["phone", "deadline", { label: "Car plate", type: "string" }],
      tags: ["Urgent", "Refund"],
      only_superadmin_can_delete_tickets: true,
      min_users_per_ticket: 100,
      telegram: { bot_token: "123:abc", chat_id: "-1001" },
    })
    expect(Object.keys(out).sort()).toEqual(["board_name", "form_fields", "min_users_per_ticket", "only_superadmin_can_delete_tickets", "purpose", "tags", "team_user_ids", "telegram"])
  })

  it("prepare omits telegram when empty, the purpose when unset, and defaults the board name", () => {
    const out = prepareTicketsAnswers({
      purpose: null,
      board_name: "",
      team_user_ids: [],
      builtin_fields: [],
      custom_fields: [],
      tags: [],
      only_superadmin_can_delete_tickets: false,
      min_users_per_ticket: null,
      telegram_bot_token: "",
      telegram_chat_id: " ",
    })
    expect(out).toEqual({ board_name: "", team_user_ids: [], form_fields: [], tags: [], only_superadmin_can_delete_tickets: false, min_users_per_ticket: 0 })
    expect(prepareTicketsAnswers({ ...initTicketsAnswers({ answers: {}, prefill: {} }), purpose: "tasks" }).board_name).toBe("Tasks")
  })

  it("presetColumns reads the backend shapes and falls back to the PLAN presets", () => {
    expect(presetColumns(CONTEXT, "support")[0]).toEqual({ en: "New", ka: "ახალი", is_default: true, is_closed: false, track_time: false })
    expect(presetColumns(CONTEXT, "support")[3].is_closed).toBe(true)
    expect(presetColumns(CONTEXT, "tasks").map((c) => c.en)).toEqual(["To do", "In progress", "Review", "Done"])
    expect(presetColumns(CONTEXT, "jobs").map((c) => c.en)).toEqual(["New", "Scheduled", "In progress", "Done"])
    expect(presetColumns({ presets: { support: [{ en: "Open", ka: "ღია" }] } }, "support")).toEqual([{ en: "Open", ka: "ღია", is_default: false, is_closed: false, track_time: false }])
  })
})

describe("TicketsStep form", () => {
  const initial = initTicketsAnswers({ answers: {}, prefill: {} })

  it("picks a purpose: live column preview, default board name, team, fields, tags, rules, telegram", () => {
    const onChange = vi.fn()
    const client = makeQueryClient()
    client.setQueryData(onboardingKeys.state(), state([step("tickets", 10)], { industry: "clinic" }))
    renderOnb(<Harness initial={initial} onChange={onChange} />, { client })
    const last = () => onChange.mock.calls[onChange.mock.calls.length - 1][0] as TicketsAnswers

    expect(screen.queryByTestId("onb-tickets-preview")).toBeNull()
    fireEvent.click(screen.getByTestId("onb-tickets-purpose-support"))
    expect(last().purpose).toBe("support")
    expect(last().board_name).toBe("Support")
    const preview = screen.getByTestId("onb-tickets-preview")
    expect(within(preview).getByTestId("onb-tickets-preview-col-0")).toHaveTextContent("New")
    expect(within(preview).getByTestId("onb-tickets-preview-col-0")).toHaveTextContent("default")
    expect(within(preview).getByTestId("onb-tickets-preview-col-1")).toHaveTextContent("tracks time")
    expect(within(preview).getByTestId("onb-tickets-preview-col-3")).toHaveTextContent("closed")

    // A default board name follows the purpose; a custom one stays.
    fireEvent.click(screen.getByTestId("onb-tickets-purpose-tasks"))
    expect(last().board_name).toBe("Tasks")
    expect(screen.getByTestId("onb-tickets-preview-col-0")).toHaveTextContent("To do")
    fireEvent.change(screen.getByTestId("onb-tickets-board-name-input"), { target: { value: "Ops" } })
    fireEvent.click(screen.getByTestId("onb-tickets-purpose-jobs"))
    expect(last().board_name).toBe("Ops")
    expect(screen.getByTestId("onb-tickets-preview-col-1")).toHaveTextContent("Scheduled")

    // Team from context.users (no fetch).
    fireEvent.click(screen.getByTestId("onb-tickets-team-user-2"))
    expect(last().team_user_ids).toEqual([2])
    expect(mocks.get).not.toHaveBeenCalled()

    // Built-in chips + a custom row.
    fireEvent.click(screen.getByTestId("onb-tickets-field-phone"))
    fireEvent.click(screen.getByTestId("onb-tickets-field-deadline"))
    expect(screen.getByTestId("onb-tickets-field-phone")).toHaveAttribute("aria-checked", "true")
    fireEvent.click(screen.getByTestId("onb-tickets-custom-add"))
    fireEvent.change(screen.getByTestId("onb-tickets-custom-row-0-label"), { target: { value: "Car plate" } })
    fireEvent.change(screen.getByTestId("onb-tickets-custom-row-0-type"), { target: { value: "number" } })
    expect(last().builtin_fields).toEqual(["phone", "deadline"])
    expect(last().custom_fields).toEqual([{ label: "Car plate", type: "number" }])

    // Tags: typed + a suggestion of the clinic industry.
    fireEvent.change(screen.getByTestId("onb-tickets-tags-input"), { target: { value: "VIP" } })
    fireEvent.keyDown(screen.getByTestId("onb-tickets-tags-input"), { key: "Enter" })
    fireEvent.click(screen.getByTestId("onb-tickets-tags-suggest-Insurance"))
    expect(last().tags).toEqual(["VIP", "Insurance"])

    // Rules + telegram.
    fireEvent.click(screen.getByTestId("onb-tickets-only-admins-switch"))
    fireEvent.change(screen.getByTestId("onb-tickets-min-users-input"), { target: { value: "2" } })
    fireEvent.change(screen.getByTestId("onb-tickets-bot-token-input"), { target: { value: "123:abc" } })
    fireEvent.change(screen.getByTestId("onb-tickets-chat-id-input"), { target: { value: "-100" } })
    expect(screen.getByTestId("onb-tickets-bot-token-input")).toHaveAttribute("type", "password")
    expect(last()).toMatchObject({ only_superadmin_can_delete_tickets: true, min_users_per_ticket: 2, telegram_bot_token: "123:abc", telegram_chat_id: "-100" })

    expect(prepareTicketsAnswers(last())).toEqual({
      purpose: "jobs",
      board_name: "Ops",
      team_user_ids: [2],
      form_fields: ["phone", "deadline", { label: "Car plate", type: "number" }],
      tags: ["VIP", "Insurance"],
      only_superadmin_can_delete_tickets: true,
      min_users_per_ticket: 2,
      telegram: { bot_token: "123:abc", chat_id: "-100" },
    })
  })

  it("renders field, nested and row errors next to their fields", () => {
    renderOnb(
      <Harness
        initial={{ ...initial, purpose: "support", builtin_fields: ["phone"], custom_fields: [{ label: "", type: "string" }] }}
        errors={{
          purpose: ["Pick one"],
          board_name: ["Already exists"],
          telegram: { bot_token: ["Invalid token"] },
          form_fields: [{}, { label: ["Required"] }],
          min_users_per_ticket: ["Too many"],
        }}
        onChange={() => {}}
      />
    )
    expect(screen.getByTestId("onb-tickets-purpose-error")).toHaveTextContent("Pick one")
    expect(screen.getByTestId("onb-tickets-board-name-error")).toHaveTextContent("Already exists")
    expect(screen.getByTestId("onb-tickets-bot-token-error")).toHaveTextContent("Invalid token")
    expect(screen.getByTestId("onb-tickets-custom-row-0")).toHaveTextContent("Required")
    expect(screen.getByTestId("onb-tickets-min-users-error")).toHaveTextContent("Too many")
  })

  it("shows the Georgian column names in ka", () => {
    renderOnb(<Harness initial={{ ...initial, purpose: "support", board_name: "Support" }} onChange={() => {}} />, { locale: "ka" })
    expect(screen.getByTestId("onb-tickets-preview-col-0")).toHaveTextContent("ახალი")
    expect(screen.getByTestId("onb-tickets-preview-col-2")).toHaveTextContent("მომხმარებლის მოლოდინში")
  })
})
