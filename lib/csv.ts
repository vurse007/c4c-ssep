function toCsvCell(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  const header = columns.map(toCsvCell).join(",");
  const lines = rows.map((row) =>
    columns.map((column) => toCsvCell(row[column])).join(","),
  );
  return [header, ...lines].join("\n");
}
