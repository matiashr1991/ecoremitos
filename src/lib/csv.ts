export function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const asString =
    typeof value === "string" ? value : JSON.stringify(value);
  return `"${asString.replace(/"/g, '""')}"`;
}
