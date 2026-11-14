import { AppError } from "../../../common/errors/AppError";

function stripXmlTags(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export const ukPrecedentService = {
  async search(query: string, page: number = 1, perPage: number = 20) {
    const url = `https://caselaw.nationalarchives.gov.uk/atom.xml?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw AppError.badRequest(`UK case law search failed: ${response.status}`);
    }
    const xml = await response.text();

    const entries: any[] = [];
    const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);
    for (const match of entryMatches) {
      const entry = match[1];
      const title = stripXmlTags(entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? "");
      const published = (entry.match(/<published>([\s\S]*?)<\/published>/)?.[1] ?? "").trim();
      const author = stripXmlTags(entry.match(/<author>\s*<name>([\s\S]*?)<\/name>/)?.[1] ?? "");
      const link = entry.match(/<link[^>]*href="([^"]*)"[^>]*rel="alternate"[^>]*\/>/)?.[1]
        ?? entry.match(/<link[^>]*href="([^"]*)"/)?.[1]
        ?? "";
      const ncn = stripXmlTags(entry.match(/type="ukncn">([\s\S]*?)<\/tna:identifier>/)?.[1] ?? "");
      const rawSummary =
        entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1] ??
        entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ??
        "";
      const summary = stripXmlTags(rawSummary).slice(0, 2000);

      entries.push({
        title,
        publishedDate: published ? published.split("T")[0] : "",
        court: author,
        url: link,
        citation: ncn,
        summary,
      });
    }

    return { items: entries, page, source: "UK National Archives - Find Case Law" };
  },
};
