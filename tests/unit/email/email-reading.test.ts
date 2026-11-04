/**
 * Pure helpers behind the Outlook-style reading experience.
 */
import { describe, it, expect } from "vitest";

import {
  blockRemoteCssUrls,
  blockingCsp,
  buildSidebarFolders,
  classifyFolderRole,
  defaultExpandedIds,
  extractFolderEntries,
  findCidAttachment,
  getListCounterparty,
  hasAttachments,
  mapCidToAttachmentUrl,
  messageSnippet,
  prepareEmailHtml,
  resolveServerFolderName,
  sortThreadMessages,
  toSidebarFolder,
} from "@/lib/email-reading";

function parse(srcDoc: string): Document {
  return new DOMParser().parseFromString(srcDoc, "text/html");
}

describe("classifyFolderRole", () => {
  it.each([
    ["INBOX", "inbox"],
    ["Sent", "sent"],
    ["INBOX.Sent", "sent"],
    ["[Gmail]/Sent Mail", "sent"],
    ["Sent Items", "sent"],
    ["Trash", "trash"],
    ["Deleted Items", "trash"],
    ["INBOX.Deleted Messages", "trash"],
    ["Junk", "junk"],
    ["INBOX.spam", "junk"],
    ["Junk E-mail", "junk"],
    ["Drafts", "drafts"],
    ["Archive", "archive"],
    ["Customers", "custom"],
    ["[Gmail]/All Mail", "custom"],
  ])("%s → %s", (name, role) => {
    expect(classifyFolderRole(name)).toBe(role);
  });

  it("prefers IMAP special-use flags over the name", () => {
    expect(classifyFolderRole("Papierkorb", ["\\HasNoChildren", "\\Trash"])).toBe("trash");
  });
});

describe("folder ordering by role", () => {
  it("sorts Outlook roles first then custom folders alphabetically", () => {
    const folders = buildSidebarFolders([
      "Zeta",
      "INBOX.Archive",
      "Alpha",
      "INBOX.Junk",
      "INBOX.Trash",
      "INBOX.Sent",
      "INBOX.Drafts",
      "INBOX",
    ]);
    expect(folders.map((f) => f.role)).toEqual([
      "inbox",
      "drafts",
      "sent",
      "trash",
      "junk",
      "archive",
      "custom",
      "custom",
    ]);
    expect(folders.slice(-2).map((f) => f.name)).toEqual(["Alpha", "Zeta"]);
  });

  it("maps role folders to canonical DB names but keeps the server name for moves", () => {
    const folders = buildSidebarFolders(["INBOX", "INBOX.Sent", "Deleted Items", "Drafts"]);
    const sent = folders.find((f) => f.role === "sent")!;
    expect(sent.name).toBe("Sent");
    expect(sent.serverName).toBe("INBOX.Sent");
    expect(folders.find((f) => f.role === "trash")!.name).toBe("Trash");
    expect(folders.find((f) => f.role === "drafts")!.name).toBe("drafts");
  });

  it("merges a DB-only canonical folder into its role and keeps the server name", () => {
    const folders = buildSidebarFolders(["INBOX", "Sent Items"], ["Sent", "INBOX"]);
    const sent = folders.filter((f) => f.role === "sent");
    expect(sent).toHaveLength(1);
    expect(sent[0].serverName).toBe("Sent Items");
  });

  it("always includes Inbox, Drafts, Sent, Trash and Junk", () => {
    const roles = buildSidebarFolders([]).map((f) => f.role);
    expect(roles).toEqual(["inbox", "drafts", "sent", "trash", "junk"]);
  });

  it("honours C5 role / unread_count / total_count objects", () => {
    const folders = buildSidebarFolders([
      { name: "INBOX", role: "inbox", unread_count: 4, total_count: 10 },
      { name: "Papierkorb", role: "trash", unread_count: 1, total_count: 2 },
    ]);
    expect(folders[0]).toMatchObject({ role: "inbox", unreadCount: 4, totalCount: 10 });
    expect(folders.find((f) => f.role === "trash")).toMatchObject({
      name: "Trash",
      serverName: "Papierkorb",
      unreadCount: 1,
    });
  });

  it("drops namespace-only parents", () => {
    const names = buildSidebarFolders(["INBOX", "[Gmail]", "[Gmail]/Sent Mail"]).map(
      (f) => f.serverName
    );
    expect(names).not.toContain("[Gmail]");
  });

  it("extracts entries from single and all-connection responses", () => {
    expect(extractFolderEntries({ folders: ["INBOX"] })).toEqual(["INBOX"]);
    expect(
      extractFolderEntries({
        connections: [
          { folders: ["INBOX"], success: true },
          { folders: ["Broken"], success: false },
        ],
      })
    ).toEqual(["INBOX"]);
  });

  it("prefers folder_details (DB name, role, counts) over the plain folders list", () => {
    const data = {
      folders: ["INBOX", "INBOX.Archive", "უსარგებლო"],
      folder_details: [
        { name: "INBOX", display_name: "INBOX", raw_name: "INBOX", role: "inbox", unread_count: 3, total_count: 9 },
        { name: "Archive", display_name: "INBOX.Archive", raw_name: "INBOX.Archive", role: "archive", unread_count: 0, total_count: 5 },
        // Georgian-named \\Junk folder: only the flag says it is Junk.
        { name: "Junk", display_name: "უსარგებლო", raw_name: "&EAA-", role: "junk", unread_count: 2, total_count: 2 },
      ],
    };
    const folders = buildSidebarFolders(extractFolderEntries(data));
    expect(folders.find((f) => f.role === "inbox")).toMatchObject({ name: "INBOX", unreadCount: 3 });
    expect(folders.find((f) => f.role === "archive")).toMatchObject({
      name: "Archive",
      serverName: "INBOX.Archive",
      totalCount: 5,
    });
    expect(folders.find((f) => f.role === "junk")).toMatchObject({
      name: "Junk",
      serverName: "უსარგებლო",
      unreadCount: 2,
    });
    expect(folders.filter((f) => f.role === "custom")).toHaveLength(0);

    // All-connections shape: details per connection, failures skipped.
    const all = extractFolderEntries({
      connections: [
        { folders: ["INBOX"], folder_details: [{ name: "INBOX", role: "inbox", unread_count: 1 }], success: true },
        { folders: ["X"], folder_details: [], success: true },
        { folders: ["Broken"], success: false },
      ],
    });
    expect(all).toEqual([
      expect.objectContaining({ name: "INBOX", role: "inbox", unread_count: 1 }),
      "X",
    ]);
  });

  it("maps an archive-role folder to the canonical Archive DB folder", () => {
    const archive = buildSidebarFolders(["INBOX", "INBOX.Archive"]).find((f) => f.role === "archive")!;
    expect(archive.name).toBe("Archive");
    expect(archive.serverName).toBe("INBOX.Archive");
  });

  it("resolves a DB folder to the server folder for moves", () => {
    const folders = buildSidebarFolders(["INBOX", "INBOX.Sent", "Projects"]);
    expect(resolveServerFolderName("Sent", folders)).toBe("INBOX.Sent");
    expect(resolveServerFolderName("Projects", folders)).toBe("Projects");
    expect(resolveServerFolderName("Unknown", folders)).toBe("Unknown");
  });

  it("toSidebarFolder ignores empty names", () => {
    expect(toSidebarFolder("")).toBeNull();
  });
});

describe("thread ordering and collapse", () => {
  const a = { id: 3, timestamp: "2026-01-01T10:00:00Z" };
  const b = { id: 1, timestamp: "2026-01-02T10:00:00Z" };
  const c = { id: 2, timestamp: "2026-01-03T10:00:00Z" };

  it("orders oldest → newest regardless of API order", () => {
    expect(sortThreadMessages([c, a, b]).map((m) => m.id)).toEqual([3, 1, 2]);
  });

  it("de-duplicates, drops deleted rows and always includes the opened message", () => {
    const deleted = { id: 9, timestamp: "2026-01-04T10:00:00Z", is_deleted: true };
    const opened = { id: 5, timestamp: "2026-01-01T12:00:00Z" };
    const sorted = sortThreadMessages([c, c, deleted, a], opened);
    expect(sorted.map((m) => m.id)).toEqual([3, 5, 2]);
  });

  it("falls back to the opened message when the thread is empty", () => {
    expect(sortThreadMessages(undefined, a).map((m) => m.id)).toEqual([3]);
  });

  it("expands only the latest message (and the opened one)", () => {
    const sorted = sortThreadMessages([a, b, c]);
    expect([...defaultExpandedIds(sorted)]).toEqual([2]);
    expect([...defaultExpandedIds(sorted, 3)].sort()).toEqual([2, 3]);
    expect(defaultExpandedIds([], 1).size).toBe(0);
  });

  it("builds a snippet from text, falling back to HTML", () => {
    expect(messageSnippet({ body_text: "  Hello\n\nworld ", body_html: "" })).toBe("Hello world");
    expect(
      messageSnippet({ body_text: "", body_html: "<style>p{}</style><p>Hi &amp; bye</p>" })
    ).toBe("Hi & bye");
    expect(messageSnippet({ body_text: "x".repeat(200), body_html: "" }, 10)).toHaveLength(10);
  });
});

describe("list counterparty", () => {
  const base = {
    from_name: "Our Co",
    from_email: "info@our.co",
    to_emails: [{ email: "ann@x.com", name: "Ann" }, { email: "bob@x.com" }],
    is_from_business: true,
    folder: "Sent",
  };

  it("shows recipients in Sent Items", () => {
    expect(getListCounterparty(base, "Sent")).toEqual({
      kind: "to",
      label: "Ann (+1)",
      initialsSource: "Ann",
    });
  });

  it("uses the email when the recipient has no name", () => {
    expect(
      getListCounterparty({ ...base, to_emails: [{ email: "bob@x.com" }] }, "Sent").label
    ).toBe("bob@x.com");
  });

  it("shows our sent messages as 'To' even in virtual folders (starred)", () => {
    expect(getListCounterparty(base, "starred").kind).toBe("to");
  });

  it("shows the sender for received mail", () => {
    expect(
      getListCounterparty({ ...base, is_from_business: false, folder: "INBOX" }, "INBOX")
    ).toEqual({ kind: "from", label: "Our Co", initialsSource: "Our Co" });
  });

  it("detects attachments from the list or the lite count", () => {
    expect(hasAttachments({ attachments: [] })).toBe(false);
    expect(hasAttachments({ attachments: [], attachments_count: 2 })).toBe(true);
    expect(
      hasAttachments({ attachments: [{ filename: "a", content_type: "", url: "", size: 0 }] })
    ).toBe(true);
  });
});

describe("cid mapping", () => {
  const attachments = [
    { filename: "image001.png", url: "https://cdn/1.png" },
    { filename: "logo.png", url: "https://cdn/logo.png", content_id: "<abc123@mail>" },
  ];

  it("maps by Content-ID (with or without angle brackets)", () => {
    expect(mapCidToAttachmentUrl("cid:abc123@mail", attachments)).toBe("https://cdn/logo.png");
    expect(mapCidToAttachmentUrl("CID:ABC123@MAIL", attachments)).toBe("https://cdn/logo.png");
  });

  it("falls back to the filename before '@'", () => {
    expect(mapCidToAttachmentUrl("cid:image001.png@01D9ABCD.12345", attachments)).toBe(
      "https://cdn/1.png"
    );
  });

  it("returns null for non-cid or unknown references", () => {
    expect(mapCidToAttachmentUrl("https://x/y.png", attachments)).toBeNull();
    expect(findCidAttachment("cid:nothing", attachments)).toBeNull();
    expect(mapCidToAttachmentUrl("cid:x", null)).toBeNull();
  });
});

describe("prepareEmailHtml", () => {
  it("blocks remote images, srcset, backgrounds and CSS urls by default", () => {
    const res = prepareEmailHtml(
      '<style>.a{background:url("https://t.example/bg.png")}</style>' +
        '<table background="https://t.example/t.png"><tr><td style="background-image:url(https://t.example/s.png)">x</td></tr></table>' +
        '<img src="https://t.example/p.gif" srcset="https://t.example/p2.gif 2x">' +
        '<img src="data:image/png;base64,AAAA">'
    );
    const doc = parse(res.srcDoc);
    const imgs = doc.querySelectorAll("img");
    expect(imgs[0].getAttribute("src")).toBeNull();
    expect(imgs[0].getAttribute("srcset")).toBeNull();
    expect(imgs[0].getAttribute("data-echodesk-blocked-src")).toBe("https://t.example/p.gif");
    expect(imgs[1].getAttribute("src")).toContain("data:image/png");
    expect(res.srcDoc).not.toContain("https://t.example/bg.png");
    expect(res.srcDoc).not.toContain("https://t.example/s.png");
    expect(doc.querySelector("table")?.getAttribute("background")).toBeNull();
    expect(res.blockedCount).toBe(4);
  });

  it("keeps remote images when allowed", () => {
    const res = prepareEmailHtml('<img src="https://t.example/p.gif">', {
      allowRemoteImages: true,
    });
    expect(parse(res.srcDoc).querySelector("img")?.getAttribute("src")).toBe(
      "https://t.example/p.gif"
    );
    expect(res.blockedCount).toBe(0);
  });

  it("maps cid images even while remote images are blocked", () => {
    const res = prepareEmailHtml('<img src="cid:logo@x">', {
      attachments: [{ filename: "logo", url: "https://cdn/logo.png", content_id: "logo@x" }],
    });
    expect(parse(res.srcDoc).querySelector("img")?.getAttribute("src")).toBe(
      "https://cdn/logo.png"
    );
    expect(res.inlineAttachmentUrls).toEqual(["https://cdn/logo.png"]);
    expect(res.blockedCount).toBe(0);
  });

  it("strips scripts and event handlers, forces links to a new tab", () => {
    const res = prepareEmailHtml(
      '<p onclick="alert(1)">hi</p><script>alert(2)</script><a href="https://e.com">l</a>'
    );
    const doc = parse(res.srcDoc);
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelector("p")?.getAttribute("onclick")).toBeNull();
    expect(doc.querySelector("a")?.getAttribute("target")).toBe("_blank");
    expect(doc.querySelector("a")?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(doc.querySelector("base")?.getAttribute("target")).toBe("_blank");
  });

  it("keeps the email's own <style> (from head or body) inside the document head", () => {
    const res = prepareEmailHtml(
      "<html><head><style>body{color:red}</style></head><body><p>x</p></body></html>"
    );
    const doc = parse(res.srcDoc);
    expect(doc.head.innerHTML).toContain("body{color:red}");
    expect(doc.body.querySelector("style")).toBeNull();
    expect(doc.body.textContent).toBe("x");
  });

  it("drops @import rules", () => {
    const res = prepareEmailHtml('<style>@import "https://evil/x.css"; p{color:blue}</style><p>x</p>');
    expect(res.srcDoc).not.toContain("@import");
    expect(res.srcDoc).toContain("p{color:blue}");
  });

  it("blockRemoteCssUrls counts and neutralises remote url()", () => {
    expect(blockRemoteCssUrls("a{background:url('//x/y.png')} b{background:url(data:x)}")).toEqual({
      css: "a{background:none} b{background:url(data:x)}",
      count: 1,
    });
  });
});

describe("prepareEmailHtml remote-fetch hardening", () => {
  it("adds a CSP that blocks every remote fetch while images are blocked", () => {
    const res = prepareEmailHtml("<style>@\\69mport 'https://t.example/x.css';</style><p>x</p>", {
      attachments: [{ filename: "a.png", url: "https://cdn.example.com/a.png" }],
    });
    const meta = parse(res.srcDoc).querySelector('meta[http-equiv="Content-Security-Policy"]');
    const csp = meta?.getAttribute("content") || "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("img-src 'self' data: blob: https://cdn.example.com");
    expect(csp).not.toContain("t.example");
  });

  it("drops the CSP when the user allows images", () => {
    const res = prepareEmailHtml("<p>x</p>", { allowRemoteImages: true });
    expect(res.srcDoc).not.toContain("Content-Security-Policy");
  });

  it("strips picture sources, video posters and image inputs", () => {
    const res = prepareEmailHtml(
      '<picture><source srcset="https://t.example/a.webp"><img src="https://t.example/a.png"></picture>' +
        '<video poster="https://t.example/p.png"></video><input type="image" src="https://t.example/i.png">'
    );
    expect(res.srcDoc).not.toContain("https://t.example/a.webp");
    expect(res.srcDoc).not.toContain("poster");
    expect(res.srcDoc).not.toContain("<input");
    expect(res.blockedCount).toBeGreaterThanOrEqual(2);
  });

  it("blockingCsp ignores relative and malformed attachment URLs", () => {
    expect(blockingCsp([{ filename: "a", url: "/media/a.png" }, { filename: "b", url: "http://[bad" }])).toBe(
      "default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'; font-src data:; media-src 'none'"
    );
  });
});
