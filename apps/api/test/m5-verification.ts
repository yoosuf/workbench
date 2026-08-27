import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function runM5Verification() {
  console.log('🚀 Starting Universal DB Workbench - M5 Verification Suite...\n');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(4008);

  const baseUrl = 'http://localhost:4008/graphql';

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
    // 1. Setup User & Target Connections
    console.log('1. Setting up User & Connections for M5...');
    const testEmail = `m5_tester_${Date.now()}@workbench.local`;
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
    assert(!!token, 'Obtained JWT access token for M5 test suite');

    // Create Postgres Connection
    const createPgRes = await gql(
      `
      mutation CreateConn($input: CreateConnectionInput!) {
        createConnection(input: $input) { id name engine }
      }
    `,
      {
        input: {
          name: 'M5 Postgres Container',
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
          name: 'M5 MySQL Container',
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

    // 2. Test tableData for PostgreSQL
    console.log('\n2. Testing tableData on PostgreSQL (Pagination & Sorting)...');
    const pgDataRes = await gql(
      `
      query GetTableData($input: TableDataInput!) {
        tableData(input: $input) {
          columns
          rows
          rowCount
          totalCount
          limit
          offset
          executionTimeMs
        }
      }
    `,
      {
        input: {
          connectionId: pgConnId,
          schema: 'public',
          table: 'products',
          limit: 2,
          offset: 0,
        },
      },
      token,
    );

    const pgData = pgDataRes.json?.data?.tableData;
    assert(pgData?.totalCount >= 3, `Postgres totalCount reported accurately (${pgData?.totalCount} rows)`);
    assert(pgData?.rows?.length === 2, `Pagination limit=2 returned 2 rows`);
    assert(pgData?.columns?.includes('sku'), 'Columns include "sku" field');

    // Test Postgres Sorting
    const pgSortRes = await gql(
      `
      query GetTableData($input: TableDataInput!) {
        tableData(input: $input) {
          rows
          sortColumn
          sortOrder
        }
      }
    `,
      {
        input: {
          connectionId: pgConnId,
          schema: 'public',
          table: 'products',
          limit: 10,
          offset: 0,
          sortColumn: 'price',
          sortOrder: 'DESC',
        },
      },
      token,
    );

    const pgSortedRows = pgSortRes.json?.data?.tableData?.rows || [];
    assert(
      Number(pgSortedRows[0]?.price) >= Number(pgSortedRows[1]?.price),
      'Postgres tableData returned rows sorted by price DESC',
    );

    // 3. Test tableData for MySQL
    console.log('\n3. Testing tableData on MySQL (Pagination & Sorting)...');
    const mySqlDataRes = await gql(
      `
      query GetTableData($input: TableDataInput!) {
        tableData(input: $input) {
          columns
          rows
          rowCount
          totalCount
          limit
          offset
          executionTimeMs
        }
      }
    `,
      {
        input: {
          connectionId: mySqlConnId,
          schema: 'sample_ecommerce',
          table: 'products',
          limit: 2,
          offset: 0,
        },
      },
      token,
    );

    const mySqlData = mySqlDataRes.json?.data?.tableData;
    assert(mySqlData?.totalCount >= 3, `MySQL totalCount reported accurately (${mySqlData?.totalCount} rows)`);
    assert(mySqlData?.rows?.length === 2, `MySQL pagination limit=2 returned 2 rows`);

    // Test MySQL Sorting ASC
    const mySqlSortRes = await gql(
      `
      query GetTableData($input: TableDataInput!) {
        tableData(input: $input) {
          rows
          sortColumn
          sortOrder
        }
      }
    `,
      {
        input: {
          connectionId: mySqlConnId,
          schema: 'sample_ecommerce',
          table: 'products',
          limit: 10,
          offset: 0,
          sortColumn: 'price',
          sortOrder: 'ASC',
        },
      },
      token,
    );

    const mySqlSortedRows = mySqlSortRes.json?.data?.tableData?.rows || [];
    assert(
      Number(mySqlSortedRows[0]?.price) <= Number(mySqlSortedRows[1]?.price),
      'MySQL tableData returned rows sorted by price ASC',
    );

    // 4. Test tableData on Customers and Orders tables
    console.log('\n4. Testing tableData on Customers & Orders...');
    const custDataRes = await gql(
      `
      query GetTableData($input: TableDataInput!) {
        tableData(input: $input) {
          totalCount
          rows
        }
      }
    `,
      {
        input: {
          connectionId: pgConnId,
          schema: 'public',
          table: 'customers',
          limit: 5,
          offset: 0,
        },
      },
      token,
    );
    assert(
      custDataRes.json?.data?.tableData?.totalCount >= 2,
      'Postgres customers table has rows and total count',
    );

    console.log(`\n========================================`);
    console.log(`M5 Verification Summary: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    await app.close();
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('M5 Verification failed with error:', err);
    await app.close();
    process.exit(1);
  }
}

runM5Verification();
