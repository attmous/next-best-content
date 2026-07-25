/**
 * Minimal PDF writer: turns pre-rendered JPEG pages into a real,
 * multi-page PDF (one full-bleed image per page) with no dependencies.
 * Used for the LinkedIn document-post export, where the upload format is a
 * PDF document. Everything is assembled locally in the browser.
 */

export interface JpegPage {
  data: Uint8Array;
  width: number;
  height: number;
}

const encoder = new TextEncoder();

export function buildPdfFromJpegPages(pages: JpegPage[]): Uint8Array {
  if (pages.length === 0) {
    throw new Error("A PDF needs at least one page");
  }

  const chunks: Uint8Array[] = [];
  let position = 0;
  /** Byte offset of each object, indexed by object number. */
  const offsets: number[] = [];

  function push(chunk: Uint8Array | string) {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    position += bytes.length;
  }

  function beginObject(objectNumber: number) {
    offsets[objectNumber] = position;
  }

  push("%PDF-1.4\n");

  const pageObjectNumber = (index: number) => 3 + index * 3;
  const contentObjectNumber = (index: number) => 4 + index * 3;
  const imageObjectNumber = (index: number) => 5 + index * 3;

  beginObject(1);
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  const kids = pages.map((_, index) => `${pageObjectNumber(index)} 0 R`).join(" ");
  beginObject(2);
  push(
    `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`,
  );

  pages.forEach((page, index) => {
    const { width, height } = page;

    beginObject(pageObjectNumber(index));
    push(
      `${pageObjectNumber(index)} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
        `/Resources << /XObject << /Im ${imageObjectNumber(index)} 0 R >> >> ` +
        `/Contents ${contentObjectNumber(index)} 0 R >>\nendobj\n`,
    );

    const content = `q ${width} 0 0 ${height} 0 0 cm /Im Do Q\n`;
    beginObject(contentObjectNumber(index));
    push(
      `${contentObjectNumber(index)} 0 obj\n<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`,
    );

    beginObject(imageObjectNumber(index));
    push(
      `${imageObjectNumber(index)} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.data.length} >>\nstream\n`,
    );
    push(page.data);
    push("\nendstream\nendobj\n");
  });

  const objectCount = 2 + pages.length * 3;
  const xrefOffset = position;
  const xrefEntries = [
    "0000000000 65535 f \n",
    ...Array.from({ length: objectCount }, (_, index) => {
      const offset = offsets[index + 1];
      return `${String(offset).padStart(10, "0")} 00000 n \n`;
    }),
  ].join("");

  push(
    `xref\n0 ${objectCount + 1}\n${xrefEntries}trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  const total = new Uint8Array(position);
  let cursor = 0;
  for (const chunk of chunks) {
    total.set(chunk, cursor);
    cursor += chunk.length;
  }
  return total;
}
