import { PostgresDriver, closePostgresPools } from '../src/postgres/postgres.driver.js';
import { MySqlDriver, closeMysqlPools } from '../src/mysql/mysql.driver.js';
import { MssqlDriver, closeMssqlPools } from '../src/mssql/mssql.driver.js';
import { ConnectionConfig } from '../src/types.js';

async function testBothDrivers() {
  console.log('🧪 Testing DbDriver implementations against live Docker containers...\n');

  const pgConfig: ConnectionConfig = {
    host: '127.0.0.1',
    port: 5433,
    database: 'sample_ecommerce',
    username: 'postgres',
    password: 'postgrespassword',
  };

  const mysqlConfig: ConnectionConfig = {
    host: '127.0.0.1',
    port: 3307,
    database: 'sample_ecommerce',
    username: 'root',
    password: 'mysqlpassword',
  };

  const mssqlConfig: ConnectionConfig = {
    host: '127.0.0.1',
    port: 1434,
    database: 'sample_ecommerce',
    username: 'sa',
    password: 'MssqlPassword1!',
  };

  const pgDriver = new PostgresDriver();
  const mysqlDriver = new MySqlDriver();
  const mssqlDriver = new MssqlDriver();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Test PostgreSQL Driver
  console.log('--- 1. Testing PostgresDriver ---');
  try {
    const pgConn = await pgDriver.testConnection(pgConfig);
    assert(pgConn === true, 'Postgres testConnection succeeded');

    const pgSchemas = await pgDriver.listSchemas(pgConfig);
    assert(pgSchemas.includes('public'), 'Postgres listSchemas includes public');

    const pgTables = await pgDriver.listTables(pgConfig, 'public');
    assert(pgTables.some(t => t.name === 'products'), 'Postgres listTables found products table');

    const pgCols = await pgDriver.getColumns(pgConfig, 'public', 'products');
    assert(pgCols.some(c => c.name === 'sku' && c.dataKind === 'STRING'), 'Postgres getColumns identified sku as STRING');

    const pgPk = await pgDriver.getPrimaryKey(pgConfig, 'public', 'products');
    assert(pgPk.includes('id'), 'Postgres getPrimaryKey identified id');

    const pgFks = await pgDriver.getForeignKeys(pgConfig, 'public', 'products');
    assert(pgFks.some(fk => fk.referencedTable === 'categories'), 'Postgres getForeignKeys found FK to categories');

    const pgIdx = await pgDriver.getIndexes(pgConfig, 'public', 'products');
    assert(pgIdx.length > 0, 'Postgres getIndexes found indexes');

    const pgQuery = await pgDriver.executeQuery(pgConfig, 'SELECT * FROM products', { timeoutMs: 5000, maxRows: 10 });
    assert(pgQuery.rowCount > 0 && pgQuery.columns.includes('price'), 'Postgres executeQuery returned rows');
  } catch (err: any) {
    console.error('Postgres driver error:', err);
    failed++;
  }

  // 2. Test MySQL Driver
  console.log('\n--- 2. Testing MySqlDriver ---');
  try {
    const mysqlConn = await mysqlDriver.testConnection(mysqlConfig);
    assert(mysqlConn === true, 'MySQL testConnection succeeded');

    const mysqlSchemas = await mysqlDriver.listSchemas(mysqlConfig);
    assert(mysqlSchemas.includes('sample_ecommerce'), 'MySQL listSchemas found sample_ecommerce');

    const mysqlTables = await mysqlDriver.listTables(mysqlConfig, 'sample_ecommerce');
    assert(mysqlTables.some(t => t.name === 'products'), 'MySQL listTables found products table');

    const mysqlCols = await mysqlDriver.getColumns(mysqlConfig, 'sample_ecommerce', 'products');
    assert(mysqlCols.some(c => c.name === 'sku' && c.dataKind === 'STRING'), 'MySQL getColumns identified sku as STRING');

    const mysqlPk = await mysqlDriver.getPrimaryKey(mysqlConfig, 'sample_ecommerce', 'products');
    assert(mysqlPk.includes('id'), 'MySQL getPrimaryKey identified id');

    const mysqlFks = await mysqlDriver.getForeignKeys(mysqlConfig, 'sample_ecommerce', 'products');
    assert(mysqlFks.some(fk => fk.referencedTable === 'categories'), 'MySQL getForeignKeys found FK to categories');

    const mysqlIdx = await mysqlDriver.getIndexes(mysqlConfig, 'sample_ecommerce', 'products');
    assert(mysqlIdx.length > 0, 'MySQL getIndexes found indexes');

    const mysqlQuery = await mysqlDriver.executeQuery(mysqlConfig, 'SELECT * FROM products', { timeoutMs: 5000, maxRows: 10 });
    assert(mysqlQuery.rowCount > 0 && mysqlQuery.columns.includes('price'), 'MySQL executeQuery returned rows');
  } catch (err: any) {
    console.error('MySQL driver error:', err);
    failed++;
  }

  // 3. Test MSSQL Driver
  console.log('\n--- 3. Testing MssqlDriver ---');
  try {
    const mssqlConn = await mssqlDriver.testConnection(mssqlConfig);
    assert(mssqlConn === true, 'MSSQL testConnection succeeded');

    const mssqlSchemas = await mssqlDriver.listSchemas(mssqlConfig);
    assert(mssqlSchemas.includes('dbo'), 'MSSQL listSchemas includes dbo');

    const mssqlTables = await mssqlDriver.listTables(mssqlConfig, 'dbo');
    assert(mssqlTables.some(t => t.name === 'products'), 'MSSQL listTables found products table');

    const mssqlCols = await mssqlDriver.getColumns(mssqlConfig, 'dbo', 'products');
    assert(mssqlCols.some(c => c.name === 'sku' && c.dataKind === 'STRING'), 'MSSQL getColumns identified sku as STRING');

    const mssqlPk = await mssqlDriver.getPrimaryKey(mssqlConfig, 'dbo', 'products');
    assert(mssqlPk.includes('id'), 'MSSQL getPrimaryKey identified id');

    const mssqlFks = await mssqlDriver.getForeignKeys(mssqlConfig, 'dbo', 'products');
    assert(mssqlFks.some(fk => fk.referencedTable === 'categories'), 'MSSQL getForeignKeys found FK to categories');

    const mssqlIdx = await mssqlDriver.getIndexes(mssqlConfig, 'dbo', 'products');
    assert(mssqlIdx.length > 0, 'MSSQL getIndexes found indexes');

    const mssqlQuery = await mssqlDriver.executeQuery(mssqlConfig, 'SELECT * FROM products', { timeoutMs: 5000, maxRows: 10 });
    assert(mssqlQuery.rowCount > 0 && mssqlQuery.columns.includes('price'), 'MSSQL executeQuery returned rows');
  } catch (err: any) {
    console.error('MSSQL driver error:', err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Driver Tests: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  // Drivers now keep long-lived connection pools open across calls (see PoolCache); close
  // them explicitly so this one-shot script can exit instead of hanging on open sockets.
  await Promise.all([closePostgresPools(), closeMysqlPools(), closeMssqlPools()]);

  process.exit(failed > 0 ? 1 : 0);
}

testBothDrivers();
