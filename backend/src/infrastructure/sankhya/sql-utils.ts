const ORACLE_IN_LIMIT = 1000;

export function chunkedIn(column: string, ids: number[]): string {
  if (ids.length === 0) return '1=0';
  const unique = [...new Set(ids)];
  const chunks: string[] = [];
  for (let i = 0; i < unique.length; i += ORACLE_IN_LIMIT) {
    chunks.push(unique.slice(i, i + ORACLE_IN_LIMIT).join(','));
  }
  if (chunks.length === 1) return `${column} IN (${chunks[0]})`;
  return chunks.map((c) => `${column} IN (${c})`).join(' OR ');
}
