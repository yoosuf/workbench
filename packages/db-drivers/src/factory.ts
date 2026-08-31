import { DbDriver } from './types.js';
import { PostgresDriver, closePostgresPools } from './postgres/postgres.driver.js';
import { MySqlDriver, closeMysqlPools } from './mysql/mysql.driver.js';
import { MssqlDriver, closeMssqlPools } from './mssql/mssql.driver.js';
import { DriverError } from './errors.js';

export function createDbDriver(engine: string): DbDriver {
  const normalized = engine.toUpperCase();
  if (normalized === 'POSTGRES' || normalized === 'POSTGRESQL') {
    return new PostgresDriver();
  }
  if (normalized === 'MYSQL') {
    return new MySqlDriver();
  }
  if (normalized === 'MSSQL' || normalized === 'SQLSERVER') {
    return new MssqlDriver();
  }
  throw new DriverError(
    'UNSUPPORTED_ENGINE',
    `Database engine "${engine}" is not supported. Supported engines are: POSTGRES, MYSQL, MSSQL`,
  );
}

/**
 * Closes every cached target-database connection pool across all drivers. Call this on
 * process shutdown (e.g. SIGTERM) for a clean exit instead of abruptly dropping open sockets.
 */
export async function closeAllDbPools(): Promise<void> {
  await Promise.all([closePostgresPools(), closeMysqlPools(), closeMssqlPools()]);
}
