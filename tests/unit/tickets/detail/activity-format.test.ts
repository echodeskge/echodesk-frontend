/** FE-11 activity helpers: event sentences, HTML stripping, mentions, tabs. */
import { describe, it, expect } from "vitest";
import { createTranslator } from "next-intl";
import {
  eventParts,
  eventText,
  feedCounts,
  itemsForTab,
  splitMentions,
  stripHtml,
  type EventLookups,
} from "@/app/(tenant)/tickets/[id]/_components/activity/activity-format";
import type { HistoryLabels } from "@/app/(tenant)/tickets/[id]/_components/history-dialog";
import { messages } from "./helpers";
import { comment, event } from "./fe11-helpers";

function labels(locale: "en" | "ka" = "en"): HistoryLabels {
  const m = messages[locale] as never;
  return {
    t: createTranslator({ locale, messages: m, namespace: "ticketsScreen.activity" }) as unknown as HistoryLabels["t"],
    tTickets: createTranslator({ locale, messages: m, namespace: "tickets" }) as unknown as HistoryLabels["t"],
    locale,
  };
}

const LOOKUPS: EventLookups = {
  columns: new Map([["11", "To do"], ["12", "In progress"]]),
  users: new Map([["2", "Levan Maisuradze"]]),
  departments: new Map([["5", "Billing"]]),
};

describe("stripHtml", () => {
  it("removes tags, decodes entities, collapses whitespace and truncates", () => {
    expect(stripHtml("<p>Hello&nbsp;<b>there</b></p><p>x &amp; y</p>")).toBe("Hello there x & y");
    expect(stripHtml(null)).toBe("");
    expect(stripHtml("a".repeat(100), 10)).toBe("aaaaaaaaa…");
  });
});

describe("eventParts", () => {
  it("joins the Georgian subject marker onto the system actor (სისტემამ, not სისტემა-მა)", () => {
    const text = eventText(event({ user: null } as never), labels("ka"));
    expect(text.startsWith("სისტემამ ")).toBe(true);
    expect(text).not.toContain("-მა");
  });

  it("splits the sentence around the actor's name", () => {
    expect(eventParts(event(), labels())).toEqual({ before: "", name: "Nino Beridze", after: " created the ticket" });
  });

  it("resolves column, user and department ids", () => {
    const l = labels();
    expect(
      eventText(event({ action: "status_changed", field_name: "column_id", old_value: "11", new_value: "12" }), l, LOOKUPS),
    ).toBe("Nino Beridze moved the ticket from To do to In progress");
    expect(eventText(event({ action: "assigned", field_name: "assigned_to_id", old_value: "", new_value: "2" }), l, LOOKUPS)).toBe(
      "Nino Beridze assigned Levan Maisuradze",
    );
    expect(eventText(event({ action: "assigned", field_name: "assigned_to_id", old_value: "2", new_value: "" }), l, LOOKUPS)).toBe(
      "Nino Beridze unassigned Levan Maisuradze",
    );
    expect(
      eventText(event({ action: "updated", field_name: "assigned_department_id", old_value: "", new_value: "5" }), l, LOOKUPS),
    ).toBe("Nino Beridze changed the department from — to Billing");
    expect(
      eventText(event({ action: "status_changed", field_name: "column_id", old_value: "99", new_value: "12" }), l, LOOKUPS),
    ).toBe("Nino Beridze moved the ticket from — to In progress");
  });

  it("drops description values and strips HTML from others", () => {
    const l = labels();
    expect(
      eventText(event({ action: "updated", field_name: "description", old_value: "<p>a</p>", new_value: "<p>b</p>" }), l),
    ).toBe("Nino Beridze changed the description");
    expect(eventText(event({ action: "updated", field_name: "title", old_value: "<i>A</i>", new_value: "B" }), l)).toBe(
      "Nino Beridze changed the title from A to B",
    );
  });

  it("covers transfers, labels, due dates, priority and the system user", () => {
    const l = labels();
    expect(eventText(event({ action: "transferred", field_name: "board", old_value: "Support", new_value: "Sales" }), l)).toBe(
      "Nino Beridze transferred the ticket from Support to Sales",
    );
    expect(eventText(event({ action: "tag_added", field_name: "tags", new_value: "VIP" }), l)).toBe(
      "Nino Beridze added the label VIP",
    );
    expect(
      eventText(event({ action: "due_date_changed", field_name: "due_date", old_value: "", new_value: "2026-11-12" }), l),
    ).toBe("Nino Beridze changed the due date from — to Nov 12");
    expect(
      eventText(event({ action: "priority_changed", field_name: "priority", old_value: "low", new_value: "critical" }), l),
    ).toBe("Nino Beridze changed the priority from Low to Critical");
    expect(eventText(event({ user: { id: null, name: "System", email: "", initials: "" } }), l)).toBe(
      "System created the ticket",
    );
  });

  it("is translated in Georgian", () => {
    const text = eventText(event(), labels("ka"));
    expect(text).toContain("Nino Beridze");
    expect(text).not.toContain("created the ticket");
  });
});

describe("splitMentions", () => {
  it("finds @email mentions and leaves trailing punctuation as text", () => {
    expect(splitMentions("hi @nino@demo.ge, see @levan@demo.ge.")).toEqual([
      { type: "text", text: "hi " },
      { type: "mention", email: "nino@demo.ge" },
      { type: "text", text: ", see " },
      { type: "mention", email: "levan@demo.ge" },
      { type: "text", text: "." },
    ]);
    expect(splitMentions("@a@b.ge")).toEqual([{ type: "mention", email: "a@b.ge" }]);
    expect(splitMentions("mail me at x@y.ge")).toEqual([{ type: "text", text: "mail me at x@y.ge" }]);
  });
});

describe("tabs", () => {
  it("counts and filters", () => {
    const items = [event(), comment(), event({ id: "event-2" })];
    expect(feedCounts(items, 4)).toEqual({ all: 3, comments: 1, history: 2, time: 4 });
    expect(itemsForTab(items, "comments")).toHaveLength(1);
    expect(itemsForTab(items, "history")).toHaveLength(2);
    expect(itemsForTab(items, "time")).toHaveLength(0);
  });
});
