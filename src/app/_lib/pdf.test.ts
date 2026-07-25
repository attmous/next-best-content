import { describe, expect, it } from "vitest";

import { buildPdfFromJpegPages } from "./pdf";

/** Minimal stand-in for JPEG bytes (SOI … EOI markers). */
function fakeJpeg(size = 32): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[size - 2] = 0xff;
  bytes[size - 1] = 0xd9;
  return bytes;
}

function latin1(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += String.fromCharCode(byte);
  return out;
}

describe("buildPdfFromJpegPages", () => {
  it("produces a well-formed multi-page PDF skeleton", () => {
    const pages = Array.from({ length: 6 }, () => ({
      data: fakeJpeg(),
      width: 1080,
      height: 1350,
    }));
    const bytes = buildPdfFromJpegPages(pages);
    const text = latin1(bytes);

    expect(text.startsWith("%PDF-1.4\n")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Count 6");
    // 2 root objects + 3 per page.
    expect(text.match(/\d+ 0 obj/g)).toHaveLength(20);
    expect(text.match(/\/Subtype \/Image/g)).toHaveLength(6);
    expect(text).toContain("/Filter /DCTDecode");
    expect(text).toContain("/MediaBox [0 0 1080 1350]");
  });

  it("writes an xref table whose offsets point at the objects", () => {
    const bytes = buildPdfFromJpegPages([
      { data: fakeJpeg(), width: 100, height: 200 },
    ]);
    const text = latin1(bytes);

    const startxref = Number(
      text.match(/startxref\n(\d+)\n%%EOF/)?.[1] ?? "-1",
    );
    expect(text.slice(startxref, startxref + 4)).toBe("xref");

    const entries = [...text.matchAll(/^(\d{10}) 00000 n /gm)].map((match) =>
      Number(match[1]),
    );
    expect(entries).toHaveLength(5);
    entries.forEach((offset, index) => {
      expect(text.slice(offset, offset + String(index + 1).length + 6)).toBe(
        `${index + 1} 0 obj`,
      );
    });
  });

  it("embeds the JPEG bytes verbatim with the declared length", () => {
    const jpeg = fakeJpeg(64);
    const bytes = buildPdfFromJpegPages([
      { data: jpeg, width: 10, height: 10 },
    ]);
    const text = latin1(bytes);
    expect(text).toContain(`/Length ${jpeg.length}`);
    expect(text).toContain(latin1(jpeg));
  });

  it("refuses to build an empty document", () => {
    expect(() => buildPdfFromJpegPages([])).toThrow();
  });
});
