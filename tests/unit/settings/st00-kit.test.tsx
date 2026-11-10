/** ST-00 settings kit (src/components/redesign/settings): behaviour of every shared piece. */
import React, { useState } from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { Bell, Facebook, Mail, Plus, Users } from "lucide-react"

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import {
  AccountRow,
  AccountRowAction,
  ActionButton,
  BarCell,
  ChannelAlert,
  ChannelDetailCard,
  ChannelList,
  ChannelNote,
  ChoiceControl,
  ConnectionsLayout,
  DangerZone,
  FactsGrid,
  FieldRow,
  PermissionList,
  SaveBarSlotProvider,
  SecretInput,
  SettingsFormPage,
  SettingsListPage,
  SettingsNote,
  SettingsPage,
  SettingsSection,
  SettingsToggle,
  StatsPanel,
  StickySaveBar,
  SwatchPicker,
  TextCell,
  AvatarCell,
  BadgeCell,
  ToggleCell,
  deltaOf,
} from "@/components/redesign/settings"
import { SettingsPageHeader as TemplatesHeader } from "@/app/(tenant)/settings/templates/_components/settings-page-header"
import { SettingsPageHeader } from "@/components/redesign/settings"
import type { Column } from "@/components/redesign/data-table"

const labels = { unsaved: "You have unsaved changes", discard: "Discard", save: "Save changes", saving: "Saving…", saved: "All changes saved" }

describe("page shells", () => {
  it("templates re-exports the moved header", () => {
    expect(TemplatesHeader).toBe(SettingsPageHeader)
  })

  it("renders the form page header and sections with field rows", () => {
    render(
      <SettingsFormPage icon={Bell} title="Notifications" description="How you get alerts" action={<button>Act</button>} testId="pg">
        <SettingsSection title="Sounds" hint="per channel">
          <FieldRow label="Play sound" help="When a message arrives">
            <SettingsToggle aria-label="Play sound" />
          </FieldRow>
        </SettingsSection>
      </SettingsFormPage>
    )
    expect(screen.getByRole("heading", { level: 2, name: "Notifications" })).toBeInTheDocument()
    expect(screen.getByText("How you get alerts")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Sounds" })).toHaveTextContent("· per channel")
    expect(screen.getByText("When a message arrives")).toBeInTheDocument()
    expect(screen.getByTestId("pg").firstElementChild).toHaveClass("max-w-[720px]")
  })

  it("uses the design widths per page type", () => {
    const { rerender } = render(<SettingsPage icon={Bell} title="x" width="wide" testId="p" />)
    expect(screen.getByTestId("p").firstElementChild).toHaveClass("max-w-[960px]")
    rerender(<SettingsPage icon={Bell} title="x" width="connections" gap={18} testId="p" />)
    expect(screen.getByTestId("p").firstElementChild).toHaveClass("max-w-[1100px]", "gap-[18px]")
  })

  it("danger zone runs the page's action (its own confirm)", () => {
    const onAction = vi.fn()
    render(<DangerZone label="Delete workspace" help="Cannot be undone" actionLabel="Delete…" onAction={onAction} />)
    fireEvent.click(screen.getByRole("button", { name: "Delete…" }))
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("settings-danger-zone")).toHaveClass("border-destructive/40")
  })
})

describe("field controls", () => {
  it("toggle is a switch that reports changes and respects disabled", () => {
    const onChange = vi.fn()
    const { rerender } = render(<SettingsToggle checked={false} onCheckedChange={onChange} aria-label="On" />)
    const sw = screen.getByRole("switch", { name: "On" })
    expect(sw).toHaveClass("h-[22px]", "w-10")
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(true)
    rerender(<SettingsToggle checked onCheckedChange={onChange} aria-label="On" disabled size="sm" />)
    expect(screen.getByRole("switch")).toHaveClass("h-[18px]", "w-8")
    fireEvent.click(screen.getByRole("switch"))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it("secret input reveals and hides with named buttons", () => {
    function Host() {
      const [v, setV] = useState("s3cret")
      return <SecretInput id="k" value={v} onChange={setV} showLabel="Show" hideLabel="Hide" />
    }
    const { container } = render(<Host />)
    const input = container.querySelector("input")!
    expect(input).toHaveAttribute("type", "password")
    fireEvent.click(screen.getByRole("button", { name: "Show" }))
    expect(input).toHaveAttribute("type", "text")
    fireEvent.click(screen.getByRole("button", { name: "Hide" }))
    expect(input).toHaveAttribute("type", "password")
    fireEvent.change(input, { target: { value: "new" } })
    expect(input).toHaveValue("new")
  })

  it("choice control selects an option", () => {
    const onChange = vi.fn()
    render(
      <ChoiceControl value="a" onChange={onChange} ariaLabel="Mode" options={[{ value: "a", label: "Light" }, { value: "b", label: "Dark" }]} />
    )
    expect(screen.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true")
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }))
    expect(onChange).toHaveBeenCalledWith("b")
  })

  it("swatches mark the active colour and pick another", () => {
    const onChange = vi.fn()
    render(
      <SwatchPicker
        value="blue"
        onChange={onChange}
        ariaLabel="Brand colour"
        options={[
          { value: "blue", label: "Blue", color: "#2563eb" },
          { value: "green", label: "Green", color: "#16a34a" },
        ]}
      />
    )
    expect(screen.getByRole("radio", { name: "Blue" })).toHaveAttribute("aria-checked", "true")
    fireEvent.click(screen.getByRole("radio", { name: "Blue" }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("radio", { name: "Green" }))
    expect(onChange).toHaveBeenCalledWith("green")
  })

  it("action button and note", () => {
    const onClick = vi.fn()
    render(
      <>
        <ActionButton onClick={onClick} tone="danger">
          Revoke
        </ActionButton>
        <SettingsNote tone="warning">Careful</SettingsNote>
        <SettingsNote>Info</SettingsNote>
      </>
    )
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }))
    expect(onClick).toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Revoke" })).toHaveClass("text-destructive", "h-[30px]")
    expect(screen.getByRole("alert")).toHaveTextContent("Careful")
    expect(screen.getByRole("status")).toHaveTextContent("Info")
  })

  it("note action wraps under the text on phones", () => {
    render(
      <SettingsNote tone="warning" action={<button type="button">Enable</button>}>
        Permissions needed
      </SettingsNote>
    )
    const note = screen.getByRole("alert")
    expect(note).toHaveClass("flex-wrap", "sm:flex-nowrap")
    expect(screen.getByRole("button", { name: "Enable" }).parentElement).toHaveClass("max-sm:basis-full", "shrink-0")
  })
})

describe("sticky save bar", () => {
  it("shows only while dirty (design) and calls the page's save / discard", () => {
    const onSave = vi.fn()
    const onDiscard = vi.fn()
    const { rerender } = render(<StickySaveBar dirty={false} onSave={onSave} onDiscard={onDiscard} labels={labels} />)
    expect(screen.queryByTestId("settings-savebar")).toBeNull()
    rerender(<StickySaveBar dirty onSave={onSave} onDiscard={onDiscard} labels={labels} />)
    expect(screen.getByText("You have unsaved changes")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Discard" }))
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
    expect(onDiscard).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it("keeps the bar in 'always' mode and disables while saving", () => {
    const onSave = vi.fn()
    const { rerender } = render(<StickySaveBar mode="always" dirty={false} onSave={onSave} labels={labels} />)
    expect(screen.getByText("All changes saved")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Discard" })).toBeNull()
    rerender(<StickySaveBar mode="always" dirty saving onSave={onSave} labels={labels} />)
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled()
    rerender(<StickySaveBar mode="always" dirty onSave={onSave} labels={labels} saveDisabled message="Pick a provider" messageTone="danger" />)
    expect(screen.getByText("Pick a provider")).toHaveClass("text-destructive")
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled()
  })

  it("submits the page's form through formId, even from the shell slot", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    function Host() {
      const [slot, setSlot] = useState<HTMLDivElement | null>(null)
      return (
        <>
          <SaveBarSlotProvider node={slot}>
            <form id="f1" onSubmit={onSubmit}>
              <StickySaveBar dirty formId="f1" labels={labels} />
            </form>
          </SaveBarSlotProvider>
          <div ref={setSlot} data-testid="slot" />
        </>
      )
    }
    render(<Host />)
    const bar = within(screen.getByTestId("slot")).getByTestId("settings-savebar")
    const btn = within(bar).getByRole("button", { name: "Save changes" })
    expect(btn).toHaveAttribute("type", "submit")
    expect(btn).toHaveAttribute("form", "f1")
    fireEvent.click(btn)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

interface Row {
  id: number
  name: string
  active: boolean
}

describe("list page", () => {
  const columns = (onToggle: (r: Row, v: boolean) => void): Column<Row>[] => [
    { id: "name", header: "Name", width: "minmax(0,1fr)", mobile: "title", cell: (r) => <AvatarCell name={r.name} sub="2 items" shape="square" /> },
    { id: "type", header: "Type", width: "100px", cell: () => <BadgeCell tone="info">Public</BadgeCell> },
    { id: "desc", header: "Desc", width: "120px", cell: (r) => <TextCell text={r.name} sub="sub" /> },
    { id: "active", header: "Active", width: "60px", mobile: "end", cell: (r) => <ToggleCell checked={r.active} onCheckedChange={(v) => onToggle(r, v)} label="Active" /> },
  ]

  it("renders header button, rows, count and keeps toggles from opening the row", () => {
    const onNew = vi.fn()
    const onRow = vi.fn()
    const onToggle = vi.fn()
    render(
      <SettingsListPage<Row>
        icon={Users}
        title="Item lists"
        description="Reusable lists"
        newAction={{ label: "New list", onClick: onNew, icon: Plus }}
        columns={columns(onToggle)}
        rows={[{ id: 1, name: "Branches", active: true }, { id: 2, name: "Reasons", active: false }]}
        rowKey={(r) => r.id}
        onRowClick={onRow}
        renderError={() => <div>err</div>}
        countLabel="2 lists · click a row to edit"
        ariaLabel="Item lists"
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "New list" }))
    expect(onNew).toHaveBeenCalled()
    expect(screen.getAllByTestId("st-list-table-row")).toHaveLength(2)
    expect(screen.getByTestId("st-list-count")).toHaveTextContent("2 lists · click a row to edit")
    fireEvent.click(screen.getAllByRole("switch", { name: "Active" })[1])
    expect(onToggle).toHaveBeenCalledWith({ id: 2, name: "Reasons", active: false }, true)
    expect(onRow).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByText("Branches")[0])
    expect(onRow).toHaveBeenCalledWith({ id: 1, name: "Branches", active: true })
    expect(screen.getAllByTestId("st-list-table-row")[0]).toHaveClass("@3xl:min-h-12")
  })

  it("shows the empty and error states and hides the count without rows", () => {
    const { rerender } = render(
      <SettingsListPage<Row> icon={Users} title="T" columns={columns(vi.fn())} rows={[]} rowKey={(r) => r.id} renderError={() => <div>err</div>} empty={<div>Nothing yet</div>} countLabel="0" ariaLabel="T" />
    )
    expect(screen.getByText("Nothing yet")).toBeInTheDocument()
    expect(screen.queryByTestId("st-list-count")).toBeNull()
    rerender(
      <SettingsListPage<Row> icon={Users} title="T" columns={columns(vi.fn())} rows={undefined} error={new Error("x")} rowKey={(r) => r.id} renderError={() => <div>err</div>} ariaLabel="T" />
    )
    expect(screen.getByText("err")).toBeInTheDocument()
  })
})

describe("stats panel", () => {
  it("switches range, exports and shows cards with their change", () => {
    const onRange = vi.fn()
    const onExport = vi.fn()
    render(
      <StatsPanel
        ranges={[{ value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }]}
        range="7d"
        onRangeChange={onRange}
        rangeAriaLabel="Range"
        rangeLabel="1 – 7 Nov"
        exportAction={{ label: "Export CSV", onClick: onExport }}
        cards={[{ key: "calls", label: "Calls", value: 42, hint: "+12%", hintTone: "success" }]}
      >
        <div>table</div>
      </StatsPanel>
    )
    fireEvent.click(screen.getByRole("radio", { name: "30 days" }))
    expect(onRange).toHaveBeenCalledWith("30d")
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }))
    expect(onExport).toHaveBeenCalled()
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("+12%")).toHaveClass("text-green-700")
    expect(screen.getByText("1 – 7 Nov")).toBeInTheDocument()
    expect(screen.getByText("table")).toBeInTheDocument()
  })

  it("bar cell clamps its fill and deltaOf formats changes", () => {
    const { container } = render(
      <>
        <BarCell value={5} max={10} label="5h" ariaLabel="Tracked" />
        <BarCell value={20} max={10} label="20h" />
        <BarCell value={1} max={0} label="1h" />
      </>
    )
    const fills = container.querySelectorAll("[role=meter] > span")
    expect((fills[0] as HTMLElement).style.width).toBe("50%")
    expect((fills[1] as HTMLElement).style.width).toBe("100%")
    expect((fills[2] as HTMLElement).style.width).toBe("0%")
    expect(deltaOf(110, 100)).toEqual({ text: "+10%", tone: "success" })
    expect(deltaOf(90, 100)).toEqual({ text: "−10%", tone: "danger" })
    expect(deltaOf(100, 100)).toEqual({ text: "0%", tone: "muted" })
    expect(deltaOf(5, 0)).toBeNull()
    expect(deltaOf(5, null)).toBeNull()
  })
})

describe("connections shells", () => {
  it("lists channels and selects one", () => {
    const onSelect = vi.fn()
    render(
      <ConnectionsLayout
        list={
          <ChannelList
            ariaLabel="Channels"
            value="facebook"
            onSelect={onSelect}
            channels={[
              { id: "facebook", label: "Facebook", status: "2 pages", icon: Facebook, color: "#1877f2", dot: "success" },
              { id: "email", label: "Email", status: "Not connected", icon: Mail, color: "#64748b" },
            ]}
          />
        }
      >
        <div>detail</div>
      </ConnectionsLayout>
    )
    expect(screen.getByTestId("channel-facebook")).toHaveAttribute("aria-current", "true")
    fireEvent.click(screen.getByTestId("channel-email"))
    expect(onSelect).toHaveBeenCalledWith("email")
    expect(screen.getByTestId("channel-detail")).toHaveTextContent("detail")
  })

  it("renders the detail card, alert, accounts, facts, permissions and notes", () => {
    const connect = vi.fn()
    const refresh = vi.fn()
    const remove = vi.fn()
    render(
      <>
        <ChannelDetailCard
          icon={Facebook}
          color="#1877f2"
          title="Facebook Messenger"
          status="Connected"
          statusTone="success"
          badge={{ label: "2 pages", tone: "success" }}
          inbox={{ count: 12, label: "open conversations", actionLabel: "View messages", href: "/messages" }}
          actions={[{ label: "Add page", onClick: connect, variant: "primary" }]}
        />
        <ChannelAlert title="Token expires soon" text="Reconnect" actionLabel="Reconnect" onAction={refresh} />
        <SettingsSection title="Pages">
          <AccountRow avatar="DS" name="Demo Shop" meta="id 123" sub="Sync failed" subTone="danger" badge={{ label: "Active", tone: "success" }} actions={<AccountRowAction label="Disconnect" tone="danger" onClick={remove} />} />
          <FactsGrid items={[{ k: "Quality", v: "High" }]} />
          <PermissionList items={[{ scope: "pages_messaging", why: "Reply to messages" }]} />
        </SettingsSection>
        <ChannelNote icon={Mail}>Notes here</ChannelNote>
      </>
    )
    expect(screen.getByText("Facebook Messenger")).toBeInTheDocument()
    expect(screen.getByText("Connected")).toHaveClass("text-green-700")
    expect(screen.getByTestId("channel-inbox-link")).toHaveAttribute("href", "/messages")
    fireEvent.click(screen.getByRole("button", { name: "Add page" }))
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }))
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }))
    expect(connect).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalled()
    expect(remove).toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("Token expires soon")
    expect(screen.getByText("Sync failed")).toHaveClass("text-destructive")
    expect(screen.getByText("High")).toBeInTheDocument()
    expect(screen.getByText("pages_messaging")).toBeInTheDocument()
    expect(screen.getByText("Notes here")).toBeInTheDocument()
  })
})
