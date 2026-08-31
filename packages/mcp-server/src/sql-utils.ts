/**
 * A handful of Workbench tools (drop_column, create_index, insert_data, update_data,
 * delete_data, execute_query_with_params) need to build raw SQL because the Workbench
 * GraphQL API has no dedicated mutation for them — it only exposes a single
 * `executeQuery(input: { connectionId, sql })` mutation, with no server-side bind-parameter
 * support (the target-database drivers run the given SQL string as-is).
 *
 * These helpers do client-side identifier quoting and literal escaping so the generated SQL
 * is valid per-engine and values are quoted safely. This is NOT the same guarantee as a real
 * parameterized query — see the caveat on execute_query_with_params.
 */

export function quoteIdent(engine: string, name: string): string {
  const e = (engine || '').toUpperCase();
  if (e === 'MYSQL') return `\`${name.replace(/`/g, '``')}\``;
  if (e === 'MSSQL') return `[${name.replace(/]/g, ']]')}]`;
  return `"${name.replace(/"/g, '""')}"`; // POSTGRES default
}

export function qualifiedTable(engine: string, schema: string, table: string): string {
  return `${quoteIdent(engine, schema)}.${quoteIdent(engine, table)}`;
}

export function quoteLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite number cannot be used as a SQL literal');
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}
