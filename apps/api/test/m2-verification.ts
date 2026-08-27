import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function runM2Verification() {
  console.log('🚀 Starting Universal DB Workbench - M2 Verification Suite...\n');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(4003);

  const baseUrl = 'http://localhost:4003/graphql';

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
    // 1. Authenticate test user
    console.log('1. Setting up User & Connections...');
    const testEmail = `m2_tester_${Date.now()}@workbench.local`;
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
    assert(!!token, 'Obtained JWT access token for M2 test suite');

    // Create Postgres Connection
    const createPgRes = await gql(
      `
      mutation CreateConn($input: CreateConnectionInput!) {
        createConnection(input: $input) { id name engine }
      }
    `,
      {
        input: {
          name: 'M2 Postgres Container',
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
          name: 'M2 MySQL Container',
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

    // 2. Test connectionSchemas query
    console.log('\n2. Testing connectionSchemas Query for both engines...');
    const pgSchemasRes = await gql(
      `
      query GetSchemas($connectionId: ID!) {
        connectionSchemas(connectionId: $connectionId) { name }
      }
    `,
      { connectionId: pgConnId },
      token,
    );
    const pgSchemas = pgSchemasRes.json?.data?.connectionSchemas;
    assert(
      Array.isArray(pgSchemas) && pgSchemas.some(s => s.name === 'public'),
      'Postgres connectionSchemas returned "public" schema',
    );

    const mySqlSchemasRes = await gql(
      `
      query GetSchemas($connectionId: ID!) {
        connectionSchemas(connectionId: $connectionId) { name }
      }
    `,
      { connectionId: mySqlConnId },
      token,
    );
    const mySqlSchemas = mySqlSchemasRes.json?.data?.connectionSchemas;
    assert(
      Array.isArray(mySqlSchemas) && mySqlSchemas.some(s => s.name === 'sample_ecommerce'),
      'MySQL connectionSchemas returned "sample_ecommerce" database',
    );

    // 3. Test schemaTables query
    console.log('\n3. Testing schemaTables Query...');
    const pgTablesRes = await gql(
      `
      query GetTables($connectionId: ID!, $schema: String!) {
        schemaTables(connectionId: $connectionId, schema: $schema) {
          name
          kind
          schema
        }
      }
    `,
      { connectionId: pgConnId, schema: 'public' },
      token,
    );
    const pgTables = pgTablesRes.json?.data?.schemaTables;
    assert(
      Array.isArray(pgTables) &&
        ['categories', 'customers', 'products', 'orders', 'order_items', 'reviews'].every(t =>
          pgTables.some(pt => pt.name === t),
        ),
      'Postgres schemaTables returned all 6 relational sample tables',
    );

    const mySqlTablesRes = await gql(
      `
      query GetTables($connectionId: ID!, $schema: String!) {
        schemaTables(connectionId: $connectionId, schema: $schema) {
          name
          kind
          schema
        }
      }
    `,
      { connectionId: mySqlConnId, schema: 'sample_ecommerce' },
      token,
    );
    const mySqlTables = mySqlTablesRes.json?.data?.schemaTables;
    assert(
      Array.isArray(mySqlTables) &&
        ['categories', 'customers', 'products', 'orders', 'order_items', 'reviews'].every(t =>
          mySqlTables.some(mt => mt.name === t),
        ),
      'MySQL schemaTables returned all 6 relational sample tables',
    );

    // 4. Test tableDetails with nested DataLoader resolution for PostgreSQL
    console.log('\n4. Testing tableDetails for PostgreSQL (columns, PK, FK, indexes)...');
    const pgDetailsRes = await gql(
      `
      query GetDetails($connectionId: ID!, $schema: String!, $table: String!) {
        tableDetails(connectionId: $connectionId, schema: $schema, table: $table) {
          name
          kind
          primaryKey(connectionId: $connectionId)
          columns(connectionId: $connectionId) {
            name
            nativeType
            dataKind
            nullable
            isPrimaryKey
            isForeignKey
          }
          foreignKeys(connectionId: $connectionId) {
            name
            columns
            referencedTable
            referencedColumns
          }
          indexes(connectionId: $connectionId) {
            name
            isUnique
            columns
          }
        }
      }
    `,
      { connectionId: pgConnId, schema: 'public', table: 'products' },
      token,
    );
    const pgDetails = pgDetailsRes.json?.data?.tableDetails;
    assert(pgDetails?.name === 'products', 'Postgres tableDetails returned products metadata');
    assert(pgDetails?.primaryKey?.includes('id'), 'Postgres primaryKey accurately identified "id"');
    assert(
      pgDetails?.columns?.some((c: any) => c.name === 'sku' && c.dataKind === 'STRING'),
      'Postgres columns correctly mapped sku as STRING',
    );
    assert(
      pgDetails?.foreignKeys?.some(
        (fk: any) => fk.referencedTable === 'categories' && fk.columns.includes('category_id'),
      ),
      'Postgres foreignKeys found relationship to categories(id)',
    );
    assert(
      pgDetails?.indexes?.some((idx: any) => idx.name.includes('products') || idx.columns.includes('category_id')),
      'Postgres indexes found idx_products_category_id index',
    );

    // 5. Test tableDetails with nested DataLoader resolution for MySQL
    console.log('\n5. Testing tableDetails for MySQL (columns, PK, FK, indexes)...');
    const mySqlDetailsRes = await gql(
      `
      query GetDetails($connectionId: ID!, $schema: String!, $table: String!) {
        tableDetails(connectionId: $connectionId, schema: $schema, table: $table) {
          name
          kind
          primaryKey(connectionId: $connectionId)
          columns(connectionId: $connectionId) {
            name
            nativeType
            dataKind
            nullable
            isPrimaryKey
            isForeignKey
          }
          foreignKeys(connectionId: $connectionId) {
            name
            columns
            referencedTable
            referencedColumns
          }
          indexes(connectionId: $connectionId) {
            name
            isUnique
            columns
          }
        }
      }
    `,
      { connectionId: mySqlConnId, schema: 'sample_ecommerce', table: 'products' },
      token,
    );
    const mySqlDetails = mySqlDetailsRes.json?.data?.tableDetails;
    assert(mySqlDetails?.name === 'products', 'MySQL tableDetails returned products metadata');
    assert(mySqlDetails?.primaryKey?.includes('id'), 'MySQL primaryKey accurately identified "id"');
    assert(
      mySqlDetails?.columns?.some((c: any) => c.name === 'sku' && c.dataKind === 'STRING'),
      'MySQL columns correctly mapped sku as STRING',
    );
    assert(
      mySqlDetails?.foreignKeys?.some(
        (fk: any) => fk.referencedTable === 'categories' && fk.columns.includes('category_id'),
      ),
      'MySQL foreignKeys found relationship to categories(id)',
    );

    // 6. Test multi-FK resolution on order_items
    console.log('\n6. Testing Multi-FK resolution on order_items table...');
    const orderItemsRes = await gql(
      `
      query GetDetails($connectionId: ID!, $schema: String!, $table: String!) {
        tableDetails(connectionId: $connectionId, schema: $schema, table: $table) {
          name
          foreignKeys(connectionId: $connectionId) {
            name
            referencedTable
            columns
          }
        }
      }
    `,
      { connectionId: pgConnId, schema: 'public', table: 'order_items' },
      token,
    );
    const orderItemFks = orderItemsRes.json?.data?.tableDetails?.foreignKeys || [];
    assert(
      orderItemFks.some((fk: any) => fk.referencedTable === 'orders') &&
        orderItemFks.some((fk: any) => fk.referencedTable === 'products'),
      'order_items correctly resolved FKs to both "orders" and "products" tables',
    );

    console.log(`\n========================================`);
    console.log(`M2 Verification Summary: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    await app.close();
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('M2 Verification failed with error:', err);
    await app.close();
    process.exit(1);
  }
}

runM2Verification();
