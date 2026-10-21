import { readFileSync } from "fs";
import path from "path";

/**
 * Read a markdown document from /public on the server (at build time for
 * static pages), so its text ships in the server-rendered HTML. Crawlers
 * such as Meta's app-review bot don't run the client-side fetch the legal
 * pages used to rely on.
 */
export function readPublicMarkdown(filename: string): string {
  return readFileSync(path.join(process.cwd(), "public", filename), "utf8");
}
