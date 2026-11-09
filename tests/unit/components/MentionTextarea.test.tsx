/** MentionTextarea (FE-11, W72): caret handling, keyboard, insertion, paging. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useRef, useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/api/axios", () => ({ default: { get: vi.fn() } }));

import axios from "@/api/axios";
import en from "@/i18n/messages/en.json";
import {
  MentionTextarea,
  filterMentionUsers,
  findMentionQuery,
  mentionUserName,
  type MentionTextareaHandle,
  type MentionUser,
} from "@/components/MentionTextarea";

const USERS: MentionUser[] = [
  { id: 1, email: "nino@demo.ge", first_name: "Nino", last_name: "Beridze" },
  { id: 2, email: "levan@demo.ge", first_name: "Levan", last_name: "Maisuradze" },
  { id: 3, email: "giorgi@demo.ge", first_name: "Giorgi", last_name: "Kapanadze" },
];

let handle: React.RefObject<MentionTextareaHandle | null>;

function Harness({ users, initial = "", onKeyDown }: { users?: MentionUser[]; initial?: string; onKeyDown?: () => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<MentionTextareaHandle>(null);
  handle = ref;
  return (
    <MentionTextarea ref={ref} value={value} onChange={setValue} users={users} aria-label="Comment" onKeyDown={onKeyDown} />
  );
}

function renderIt(props: React.ComponentProps<typeof Harness> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <Harness {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const ta = () => screen.getByRole("combobox", { name: "Comment" }) as HTMLTextAreaElement;

function type(value: string, caret = value.length) {
  fireEvent.change(ta(), { target: { value, selectionStart: caret, selectionEnd: caret } });
}

beforeEach(() => vi.clearAllMocks());

describe("findMentionQuery", () => {
  it("finds the word being typed after @", () => {
    expect(findMentionQuery("hi @ni", 6)).toEqual({ start: 3, query: "ni" });
    expect(findMentionQuery("@", 1)).toEqual({ start: 0, query: "" });
    expect(findMentionQuery("hi @ni there", 12)).toBeNull();
    expect(findMentionQuery("mail a@b.ge", 11)).toBeNull();
    expect(findMentionQuery("line\n@le", 8)).toEqual({ start: 5, query: "le" });
  });

  it("uses the caret, not the end of the text", () => {
    expect(findMentionQuery("@ni and more", 3)).toEqual({ start: 0, query: "ni" });
  });
});

describe("filterMentionUsers / mentionUserName", () => {
  it("matches email, first, last and full name", () => {
    expect(filterMentionUsers(USERS, "kapa").map((u) => u.id)).toEqual([3]);
    expect(filterMentionUsers(USERS, "LEVAN@").map((u) => u.id)).toEqual([2]);
    expect(filterMentionUsers(USERS, "nino beri").map((u) => u.id)).toEqual([1]);
    expect(filterMentionUsers(USERS, "").length).toBe(3);
    expect(mentionUserName({ id: 9, email: "x@y.ge" })).toBe("x@y.ge");
  });
});

describe("MentionTextarea", () => {
  it("opens on @, moves with arrows (wrapping) and inserts @email with Enter", async () => {
    renderIt({ users: USERS });
    type("Hey @");
    const list = await screen.findByRole("listbox");
    const options = within(list).getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(ta(), { key: "ArrowDown" });
    expect(within(list).getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(ta(), { key: "ArrowUp" });
    fireEvent.keyDown(ta(), { key: "ArrowUp" });
    expect(within(list).getAllByRole("option")[2]).toHaveAttribute("aria-selected", "true");
    expect(ta()).toHaveAttribute("aria-activedescendant", within(list).getAllByRole("option")[2].id);
    fireEvent.keyDown(ta(), { key: "Enter" });
    await waitFor(() => expect(ta().value).toBe("Hey @giorgi@demo.ge "));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(ta().selectionStart).toBe("Hey @giorgi@demo.ge ".length);
  });

  it("replaces only the typed query and keeps the text after the caret", async () => {
    renderIt({ users: USERS });
    type("ask @lev about it", 8);
    await screen.findByRole("listbox");
    fireEvent.keyDown(ta(), { key: "Tab" });
    await waitFor(() => expect(ta().value).toBe("ask @levan@demo.ge  about it"));
    expect(ta().selectionStart).toBe("ask @levan@demo.ge ".length);
  });

  it("clicking an option inserts it", async () => {
    renderIt({ users: USERS });
    type("@ni");
    const option = await screen.findByRole("option", { name: /Nino Beridze/ });
    fireEvent.mouseDown(option);
    await waitFor(() => expect(ta().value).toBe("@nino@demo.ge "));
  });

  it("Escape closes; other keys reach onKeyDown", async () => {
    const onKeyDown = vi.fn();
    renderIt({ users: USERS, onKeyDown });
    type("@");
    await screen.findByRole("listbox");
    fireEvent.keyDown(ta(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onKeyDown).not.toHaveBeenCalled();
    fireEvent.keyDown(ta(), { key: "Enter", metaKey: true });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("closes when a space ends the word", async () => {
    renderIt({ users: USERS });
    type("@ni");
    await screen.findByRole("listbox");
    type("@ni ");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows 'No users found' when nothing matches", async () => {
    renderIt({ users: USERS });
    type("@zzz");
    expect(await screen.findByText("No users found")).toBeInTheDocument();
  });

  it("without a users prop, loads every page of /api/users/", async () => {
    (axios.get as ReturnType<typeof vi.fn>).mockImplementation(async (_url: string, cfg: { params: { page: number } }) => ({
      data:
        cfg.params.page === 1
          ? { results: [USERS[0]], next: "http://x/api/users/?page=2" }
          : { results: [USERS[1]], next: null },
    }));
    renderIt();
    type("@");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  it("insertText and openMention work at the caret", async () => {
    renderIt({ users: USERS, initial: "abc" });
    ta().setSelectionRange(1, 1);
    handle.current!.insertText("XY");
    await waitFor(() => expect(ta().value).toBe("aXYbc"));
    expect(ta().selectionStart).toBe(3);
    handle.current!.openMention();
    await waitFor(() => expect(ta().value).toBe("aXY @bc"));
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });
});
