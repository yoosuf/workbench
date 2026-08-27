import { PostgresDriver } from '../src/postgres/postgres.driver.js';
import { MySqlDriver } from '../src/mysql/mysql.driver.js';
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

  const pgDriver = new PostgresDriver();
  const mysqlDriver = new MySqlDriver();

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

  console.log(`\n========================================`);
  console.log(`Driver Tests: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

testBothDrivers();
