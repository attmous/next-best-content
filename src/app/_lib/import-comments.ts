/**
 * Parses creator-supplied comment exports (JSON, CSV, or pasted text) into
 * contract-valid evidence. Imported text is treated strictly as data: it is
 * validated, capped, and displayed — never interpreted as instructions.
 */
import { CONTRACT_LIMITS, EvidenceSchema, type Evidence } from "@/contracts";

export type ParseImportResult =
  | { ok: true; comments: Evidence[]; warnings: string[] }
  | { ok: false; error: string };

const MAX_COMMENTS = CONTRACT_LIMITS.comments;

interface RawRow {
  author?: unknown;
  text?: unknown;
  likeCount?: unknown;
}

function coerceRow(row: RawRow): Evidence | null {
  const text = typeof row.text === "string" ? row.text.trim() : "";
  if (text.length === 0) {
    return null;
  }

  const author =
    typeof row.author === "string" && row.author.trim().length > 0
      ? row.author.trim()
      : "Unnamed commenter";

  const likeCountNumber =
    typeof row.likeCount === "number"
      ? row.likeCount
      : typeof row.likeCount === "string"
        ? Number.parseInt(row.likeCount.replace(/[^0-9-]/g, ""), 10)
        : 0;
  const likeCount =
    Number.isFinite(likeCountNumber) && likeCountNumber > 0
      ? Math.floor(likeCountNumber)
      : 0;

  const candidate = { author, text, likeCount };
  const parsed = EvidenceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function finalize(rows: RawRow[], warnings: string[]): ParseImportResult {
  const comments: Evidence[] = [];
  let skipped = 0;

  for (const row of rows) {
    const evidence = coerceRow(row);
    if (evidence) {
      comments.push(evidence);
    } else {
      skipped += 1;
    }
  }

  if (skipped > 0) {
    warnings.push(
      `${skipped} ${skipped === 1 ? "row was" : "rows were"} skipped (empty or over the 5,000-character comment limit).`,
    );
  }

  if (comments.length === 0) {
    return {
      ok: false,
      error:
        "No usable comments found. Each comment needs text; author and like count are optional.",
    };
  }

  if (comments.length > MAX_COMMENTS) {
    warnings.push(
      `The contract accepts at most ${MAX_COMMENTS} comments — the first ${MAX_COMMENTS} were kept.`,
    );
    return { ok: true, comments: comments.slice(0, MAX_COMMENTS), warnings };
  }

  return { ok: true, comments, warnings };
}

const AUTHOR_KEYS = ["author", "name", "user", "username", "commenter"];
const TEXT_KEYS = ["text", "comment", "content", "body", "message"];
const LIKE_KEYS = ["likecount", "likes", "like_count", "reactions", "votes"];

function pickKey(
  record: Record<string, unknown>,
  candidates: string[],
): unknown {
  for (const key of Object.keys(record)) {
    if (candidates.includes(key.toLowerCase().trim())) {
      return record[key];
    }
  }
  return undefined;
}

function parseJson(raw: string): ParseImportResult {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  const list = Array.isArray(payload)
    ? payload
    : typeof payload === "object" &&
        payload !== null &&
        Array.isArray((payload as { comments?: unknown }).comments)
      ? (payload as { comments: unknown[] }).comments
      : null;

  if (!list) {
    return {
      ok: false,
      error:
        "Expected a JSON array of comments (or an object with a \"comments\" array).",
    };
  }

  const rows: RawRow[] = list.map((item) => {
    if (typeof item === "string") {
      return { text: item };
    }
    if (typeof item === "object" && item !== null) {
      const record = item as Record<string, unknown>;
      return {
        author: pickKey(record, AUTHOR_KEYS),
        text: pickKey(record, TEXT_KEYS),
        likeCount: pickKey(record, LIKE_KEYS),
      };
    }
    return {};
  });

  return finalize(rows, []);
}

/** Minimal CSV splitter with support for double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(raw: string): ParseImportResult {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { ok: false, error: "The CSV file is empty." };
  }

  const header = splitCsvLine(lines[0]).map((cell) =>
    cell.toLowerCase().trim(),
  );
  const authorIndex = header.findIndex((cell) => AUTHOR_KEYS.includes(cell));
  const textIndex = header.findIndex((cell) => TEXT_KEYS.includes(cell));
  const likeIndex = header.findIndex((cell) => LIKE_KEYS.includes(cell));
  const hasHeader = textIndex >= 0;

  const warnings: string[] = [];
  const dataLines = hasHeader ? lines.slice(1) : lines;
  if (!hasHeader) {
    warnings.push(
      "No header row recognized — columns were read as author, text, likes.",
    );
  }

  const rows: RawRow[] = dataLines.map((line) => {
    const cells = splitCsvLine(line);
    if (hasHeader) {
      return {
        author: authorIndex >= 0 ? cells[authorIndex] : undefined,
        text: cells[textIndex],
        likeCount: likeIndex >= 0 ? cells[likeIndex] : undefined,
      };
    }
    return { author: cells[0], text: cells[1] ?? cells[0], likeCount: cells[2] };
  });

  return finalize(rows, warnings);
}

function parsePlainText(raw: string): ParseImportResult {
  const rows: RawRow[] = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ text: line }));

  return finalize(rows, []);
}

export type ImportKind = "json" | "csv" | "text";

export function detectImportKind(fileName: string | null, raw: string): ImportKind {
  const lowered = fileName?.toLowerCase() ?? "";
  if (lowered.endsWith(".json")) return "json";
  if (lowered.endsWith(".csv")) return "csv";
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return "json";
  return "text";
}

export function parseImportedComments(
  raw: string,
  kind: ImportKind,
): ParseImportResult {
  if (raw.trim().length === 0) {
    return { ok: false, error: "Add some comments first — the input is empty." };
  }
  switch (kind) {
    case "json":
      return parseJson(raw);
    case "csv":
      return parseCsv(raw);
    case "text":
      return parsePlainText(raw);
  }
}
