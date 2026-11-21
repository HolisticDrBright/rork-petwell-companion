export type VetSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  species: string;
  topics: string[];
  section: string;
  passage: string;
};

export type VetCitation = {
  source_id: string;
  quote_or_section: string;
  title: string;
  publisher: string;
  url: string;
};

export function retrieveSources(sources: VetSource[], query: string, species?: string, limit = 4): VetSource[] {
  const text = " " + query.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ") + " ";
  return sources
    .filter(source => source.species === "both" || source.species === species)
    .map(source => ({
      source,
      rank: source.topics.reduce((rank, topic) => rank + (text.includes(` ${topic.toLowerCase()} `) ? 1 : 0), 0),
    }))
    .filter(item => item.rank > 0)
    .sort((a, b) => b.rank - a.rank || a.source.id.localeCompare(b.source.id))
    .slice(0, limit)
    .map(item => item.source);
}

/** Allow a single retry for missing, invalid, or unreviewed citations. */
export async function groundedReply(retrieved: VetSource[], generate: (retry: boolean) => Promise<unknown>,
  acceptText: (reply: string) => boolean) {
  if (!retrieved.length) return null;
  for (const retry of [false, true]) {
    const candidate = (await generate(retry) ?? {}) as {
      reply?: unknown; suggestedVetReport?: unknown; citations?: unknown;
    };
    if (typeof candidate.reply !== "string" || !candidate.reply.trim() || !acceptText(candidate.reply)) continue;
    const citations = checkCitations(candidate.citations, retrieved);
    if (citations) return { reply: candidate.reply.trim(), citations, suggestedVetReport: candidate.suggestedVetReport === true };
  }
  return null;
}

export function checkCitations(input: unknown, retrieved: VetSource[]): VetCitation[] | null {
  if (!Array.isArray(input) || !input.length || input.length > retrieved.length) return null;
  const formatted = new Map<string, VetCitation>();
  for (const item of input) {
    if (!item || typeof item !== "object") return null;
    const citation = item as { source_id?: unknown; quote_or_section?: unknown };
    const source = retrieved.find(s => s.id === citation.source_id);
    if (!source || citation.quote_or_section !== source.section || !source.url.startsWith("https://")) return null;
    formatted.set(source.id, {
      source_id: source.id, quote_or_section: source.section,
      title: source.title, publisher: source.publisher, url: source.url,
    });
  }
  return [...formatted.values()];
}
