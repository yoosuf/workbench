import { DbDriver } from './types.js';
import { PostgresDriver } from './postgres/postgres.driver.js';
import { MySqlDriver } from './mysql/mysql.driver.js';
import { DriverError } from './errors.js';

export function createDbDriver(engine: string): DbDriver {
  const normalized = engine.toUpperCase();
  if (normalized === 'POSTGRES' || normalized === 'POSTGRESQL') {
    return new PostgresDriver();
  }
  if (normalized === 'MYSQL') {
    return new MySqlDriver();
  }
  throw new DriverError(
    'UNSUPPORTED_ENGINE',
    `Database engine "${engine}" is not supported. Supported engines are: POSTGRES, MYSQL`,
  );
}
