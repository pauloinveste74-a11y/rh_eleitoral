/**
 * Geração de CSV simples para os relatórios (Fase 8). Separador `;` (não
 * `,`) porque é o que o Excel em pt-BR espera por padrão; BOM UTF-8 no
 * início evita acentos quebrados ao abrir no Excel/LibreOffice.
 */
const BOM = String.fromCharCode(0xfeff);

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers, ...rows].map((row) => row.map(escape).join(";"));
  return BOM + lines.join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
