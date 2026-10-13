function pdfText(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapLine(text: string, width = 88): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function pageStreams(heading: string, body: string[]): string[] {
  const rows = [heading, '', ...body.flatMap((line) => wrapLine(line))];
  const pages: string[][] = [];
  let page: string[] = [];
  let y = 760;
  rows.forEach((row, index) => {
    const size = index === 0 ? 16 : 11;
    const step = index === 0 ? 26 : 16;
    if (y - step < 48 && page.length > 0) {
      pages.push(page);
      page = [];
      y = 760;
    }
    page.push(`/F1 ${size} Tf`);
    page.push(`1 0 0 1 50 ${y} Tm`);
    page.push(`(${pdfText(row)}) Tj`);
    y -= step;
  });
  if (page.length > 0) pages.push(page);
  return pages.map((commands) => ['BT', ...commands, 'ET'].join('\n'));
}

export function buildRecordPdf(heading: string, body: string[]): Uint8Array {
  const streams = pageStreams(heading, body);
  const fontId = 1;
  const pagesId = 2;
  const catalogId = 3;
  const contentIds = streams.map((_, index) => 4 + index * 2);
  const pageIds = streams.map((_, index) => 5 + index * 2);
  const objects = new Map<number, string>();

  objects.set(fontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.set(
    pagesId,
    `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`
  );
  objects.set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  streams.forEach((stream, index) => {
    objects.set(contentIds[index], `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    objects.set(
      pageIds[index],
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[index]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    );
  });

  const ids = [...objects.keys()].sort((a, b) => a - b);
  let pdf = '%PDF-1.4\n';
  const offsets = new Map<number, number>();
  ids.forEach((id) => {
    offsets.set(id, pdf.length);
    pdf += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  const size = Math.max(...ids) + 1;
  pdf += `xref\n0 ${size}\n`;
  pdf += '0000000000 65535 f \n';
  for (let id = 1; id < size; id += 1) {
    const offset = offsets.get(id) ?? 0;
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${size} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function downloadRecordPdf(filename: string, heading: string, body: string[]) {
  const bytes = buildRecordPdf(heading, body);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
