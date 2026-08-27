import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function runM4Verification() {
  console.log('🚀 Starting Universal DB Workbench - M4 Verification Suite...\n');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(4006);

  const baseUrl = 'http://localhost:4006/graphql';

  async function gql(query: string, variables: any = {}, token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const json = await res.json();
    return { status: res.status, json };
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Setup User & Connections
    console.log('1. Setting up User & Connections for M4...');
    const testEmail = `m4_tester_${Date.now()}@workbench.local`;
    const signupRes = await gql(
      `
      mutation Signup($input: SignupInput!) {
        signup(input: $input) {
          accessToken
          user { id email }
        }
      }
    `,
      { input: { email: testEmail, password: 'SecurePassword123!' } },
    );
    const token = signupRes.json?.data?.signup?.accessToken;
    assert(!!token, 'Obtained JWT access token for M4 test suite');

    // Create Postgres Connection
    const createPgRes = await gql(
      `
      mutation CreateConn($input: CreateConnectionInput!) {
        createConnection(input: $input) { id name engine }
      }
    `,
      {
        input: {
          name: 'M4 Postgres Container',
          engine: 'POSTGRES',
          host: '127.0.0.1',
          port: 5433,
          database: 'sample_ecommerce',
          username: 'postgres',
          password: 'postgrespassword',
        },
      },
      token,
    );
    const pgConnId = createPgRes.json?.data?.createConnection?.id;
    assert(!!pgConnId, 'Saved PostgreSQL target connection');

    // Create MySQL Connection
    const createMySqlRes = await gql(
      `
      mutation CreateConn($input: CreateConnectionInput!) {
        createConnection(input: $input) { id name engine }
      }
    `,
      {
        input: {
          name: 'M4 MySQL Container',
          engine: 'MYSQL',
          host: '127.0.0.1',
          port: 3307,
          database: 'sample_ecommerce',
          username: 'root',
          password: 'mysqlpassword',
        },
      },
      token,
    );
    const mySqlConnId = createMySqlRes.json?.data?.createConnection?.id;
    assert(!!mySqlConnId, 'Saved MySQL target connection');

    // 2. Test executeQuery on PostgreSQL
    console.log('\n2. Testing executeQuery on PostgreSQL Target...');
    const pgQueryRes = await gql(
      `
      mutation ExecQuery($input: ExecuteQueryInput!) {
        executeQuery(input: $input) {
          columns
          rows
          rowCount
          executionTimeMs
          truncated
        }
      }
    `,
      {
        input: {
          connectionId: pgConnId,
          sql: 'SELECT id, sku, name, price FROM products ORDER BY id ASC;',
        },
      },
      token,
    );

    const pgResult = pgQueryRes.json?.data?.executeQuery;
    assert(
      Array.isArray(pgResult?.columns) && pgResult.columns.includes('sku') && pgResult.columns.includes('price'),
      'Postgres executeQuery returned expected columns',
    );
    assert(
      Array.isArray(pgResult?.rows) && pgResult.rows.length > 0,
      `Postgres executeQuery returned ${pgResult?.rows?.length} rows`,
    );
    assert(
      typeof pgResult?.executionTimeMs === 'number' && pgResult.executionTimeMs >= 0,
      `Execution duration recorded (${pgResult?.executionTimeMs}ms)`,
    );

    // 3. Test executeQuery on MySQL
    console.log('\n3. Testing executeQuery on MySQL Target...');
    const mySqlQueryRes = await gql(
      `
      mutation ExecQuery($input: ExecuteQueryInput!) {
        executeQuery(input: $input) {
          columns
          rows
          rowCount
          executionTimeMs
          truncated
        }
      }
    `,
      {
        input: {
          connectionId: mySqlConnId,
          sql: 'SELECT id, sku, name, price FROM products ORDER BY id ASC;',
        },
      },
      token,
    );

    const mySqlResult = mySqlQueryRes.json?.data?.executeQuery;
    assert(
      Array.isArray(mySqlResult?.columns) && mySqlResult.columns.includes('sku') && mySqlResult.columns.includes('price'),
      'MySQL executeQuery returned expected columns',
    );
    assert(
      Array.isArray(mySqlResult?.rows) && mySqlResult.rows.length > 0,
      `MySQL executeQuery returned ${mySqlResult?.rows?.length} rows`,
    );

    // 4. Test 10k Row Limit Cap and Override Limits
    console.log('\n4. Testing 10,000-Row Truncation and Override Limits...');
    const cappedQueryRes = await gql(
      `
      mutation ExecQuery($input: ExecuteQueryInput!) {
        executeQuery(input: $input) {
          rowCount
          truncated
          rows
        }
      }
    `,
      {
        input: {
          connectionId: pgConnId,
          sql: 'SELECT generate_series(1, 15000) as num;',
          overrideLimits: false,
        },
      },
      token,
    );

    const cappedResult = cappedQueryRes.json?.data?.executeQuery;
    assert(
      cappedResult?.truncated === true && cappedResult?.rows?.length === 10000,
      'Query returning 15,000 rows was properly capped at 10,000 with truncated=true',
    );

    const overrideQueryRes = await gql(
      `
      mutation ExecQuery($input: ExecuteQueryInput!) {
        executeQuery(input: $input) {
          rowCount
          truncated
          rows
        }
      }
    `,
      {
        input: {
          connectionId: pgConnId,
          sql: 'SELECT generate_series(1, 15000) as num;',
          overrideLimits: true,
        },
      },
      token,
    );

    const overrideResult = overrideQueryRes.json?.data?.executeQuery;
    assert(
      overrideResult?.truncated === false && overrideResult?.rows?.length === 15000,
      'Query with overrideLimits=true returned full 15,000 rows with truncated=false',
    );

    // 5. Test Query History Audit Logging
    console.log('\n5. Testing queryHistory Audit Logging...');
    const historyRes = await gql(
      `
      query GetHistory($connectionId: ID!) {
        queryHistory(connectionId: $connectionId) {
          id
          sql
          durationMs
          rowCount
          success
          errorMessage
        }
      }
    `,
      { connectionId: pgConnId },
      token,
    );

    const historyItems = historyRes.json?.data?.queryHistory || [];
    assert(historyItems.length >= 3, `Query history logged ${historyItems.length} executions`);
    assert(
      historyItems.some((h: any) => h.success === true && h.sql.includes('generate_series')),
      'Query history logged successful executions with duration and rowCount',
    );

    // 6. Test Error Handling & Failed History Logging
    console.log('\n6. Testing Error Handling on Syntax/Table Error...');
    const failedQueryRes = await gql(
      `
      mutation ExecQuery($input: ExecuteQueryInput!) {
        executeQuery(input: $input) {
          rowCount
        }
      }
    `,
      {
        input: {
          connectionId: pgConnId,
          sql: 'SELECT * FROM non_existent_table_xyz_123;',
        },
      },
      token,
    );

    assert(
      !!failedQueryRes.json?.errors?.[0]?.message,
      'Invalid table query returned DriverError message',
    );

    const updatedHistoryRes = await gql(
      `
      query GetHistory($connectionId: ID!) {
        queryHistory(connectionId: $connectionId) {
          id
          sql
          success
          errorMessage
        }
      }
    `,
      { connectionId: pgConnId },
      token,
    );

    const failedLog = updatedHistoryRes.json?.data?.queryHistory?.find(
      (h: any) => h.success === false && h.sql.includes('non_existent_table_xyz_123'),
    );
    assert(!!failedLog, 'Failed query execution recorded in QueryHistory with success=false and errorMessage');

    // 7. Test Saved Queries Lifecycle
    console.log('\n7. Testing Saved Queries Management...');
    const saveQueryRes = await gql(
      `
      mutation SaveQ($input: SaveQueryInput!) {
        saveQuery(input: $input) {
          id
          name
          sql
        }
      }
    `,
      {
        input: {
          connectionId: pgConnId,
          name: 'Top Selling Products by Revenue',
          sql: 'SELECT * FROM products WHERE price > 500;',
        },
      },
      token,
    );

    const savedQ = saveQueryRes.json?.data?.saveQuery;
    assert(savedQ?.name === 'Top Selling Products by Revenue', 'saveQuery mutation created saved query record');

    const listSavedRes = await gql(
      `
      query ListSaved($connectionId: ID!) {
        listSavedQueries(connectionId: $connectionId) {
          id
          name
          sql
        }
      }
    `,
      { connectionId: pgConnId },
      token,
    );

    const savedList = listSavedRes.json?.data?.listSavedQueries || [];
    assert(savedList.some((q: any) => q.id === savedQ.id), 'listSavedQueries returned saved query');

    const deleteSavedRes = await gql(
      `
      mutation DelSaved($id: ID!) {
        deleteSavedQuery(id: $id)
      }
    `,
      { id: savedQ.id },
      token,
    );
    assert(deleteSavedRes.json?.data?.deleteSavedQuery === true, 'deleteSavedQuery removed record');

    console.log(`\n========================================`);
    console.log(`M4 Verification Summary: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    await app.close();
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('M4 Verification failed with error:', err);
    await app.close();
    process.exit(1);
  }
}

runM4Verification();
