import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

async function runM1Verification() {
  console.log('🚀 Starting Universal DB Workbench - M1 Verification Suite...\n');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(4002);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5431/workbench_app?schema=public',
      },
    },
  });

  const baseUrl = 'http://localhost:4002/graphql';

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
    // 1. Authenticate a test user
    console.log('1. Setting up Authenticated User Session...');
    const testEmail = `m1_tester_${Date.now()}@workbench.local`;
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
    assert(!!token, 'Obtained JWT access token for M1 test suite');

    // 2. Test Connection Mutation (PostgreSQL Target Container)
    console.log('\n2. Testing Postgres Connection Endpoint...');
    const testPgRes = await gql(
      `
      mutation TestConn($input: TestConnectionInput!) {
        testConnection(input: $input) {
          success
          message
          latencyMs
        }
      }
    `,
      {
        input: {
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
    const pgTest = testPgRes.json?.data?.testConnection;
    assert(pgTest?.success === true, `Postgres testConnection succeeded (${pgTest?.latencyMs}ms)`);

    // 3. Test Connection Mutation (MySQL Target Container)
    console.log('\n3. Testing MySQL Connection Endpoint...');
    const testMySqlRes = await gql(
      `
      mutation TestConn($input: TestConnectionInput!) {
        testConnection(input: $input) {
          success
          message
          latencyMs
        }
      }
    `,
      {
        input: {
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
    const mySqlTest = testMySqlRes.json?.data?.testConnection;
    assert(mySqlTest?.success === true, `MySQL testConnection succeeded (${mySqlTest?.latencyMs}ms)`);

    // 4. Create Saved Connections for both engines
    console.log('\n4. Creating Saved Connections in App DB...');
    const createPgRes = await gql(
      `
      mutation CreateConn($input: CreateConnectionInput!) {
        createConnection(input: $input) {
          id
          name
          engine
          host
          port
          database
        }
      }
    `,
      {
        input: {
          name: 'Docker PostgreSQL Test Container',
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
    const pgConn = createPgRes.json?.data?.createConnection;
    assert(!!pgConn?.id, 'Postgres connection created and saved');

    const createMySqlRes = await gql(
      `
      mutation CreateConn($input: CreateConnectionInput!) {
        createConnection(input: $input) {
          id
          name
          engine
          host
          port
          database
        }
      }
    `,
      {
        input: {
          name: 'Docker MySQL Test Container',
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
    const mySqlConn = createMySqlRes.json?.data?.createConnection;
    assert(!!mySqlConn?.id, 'MySQL connection created and saved');

    // 5. Verify Credential Encryption at Rest in App Postgres DB
    console.log('\n5. Verifying Credential Encryption at Rest in Prisma Metadata DB...');
    const rawPgRecord = await prisma.connection.findUnique({ where: { id: pgConn.id } });
    const rawMySqlRecord = await prisma.connection.findUnique({ where: { id: mySqlConn.id } });

    assert(
      rawPgRecord?.encryptedPassword !== 'postgrespassword' &&
        rawPgRecord?.encryptedPassword.split(':').length === 3,
      'Postgres password encrypted at rest with AES-256-GCM (iv:authTag:ciphertext)',
    );
    assert(
      rawMySqlRecord?.encryptedPassword !== 'mysqlpassword' &&
        rawMySqlRecord?.encryptedPassword.split(':').length === 3,
      'MySQL password encrypted at rest with AES-256-GCM (iv:authTag:ciphertext)',
    );

    // 6. Test Saved Connections
    console.log('\n6. Testing Saved Connection Verification...');
    const testSavedPg = await gql(
      `
      mutation TestSaved($id: ID!) {
        testSavedConnection(id: $id) {
          success
          message
          latencyMs
        }
      }
    `,
      { id: pgConn.id },
      token,
    );
    assert(
      testSavedPg.json?.data?.testSavedConnection?.success === true,
      'testSavedConnection decrypted and verified Postgres credentials',
    );

    const testSavedMySql = await gql(
      `
      mutation TestSaved($id: ID!) {
        testSavedConnection(id: $id) {
          success
          message
          latencyMs
        }
      }
    `,
      { id: mySqlConn.id },
      token,
    );
    assert(
      testSavedMySql.json?.data?.testSavedConnection?.success === true,
      'testSavedConnection decrypted and verified MySQL credentials',
    );

    // 7. List Connections Query
    console.log('\n7. Testing listConnections Query...');
    const listRes = await gql(
      `
      query {
        listConnections {
          id
          name
          engine
        }
      }
    `,
      {},
      token,
    );
    const list = listRes.json?.data?.listConnections;
    assert(
      Array.isArray(list) && list.some(c => c.id === pgConn.id) && list.some(c => c.id === mySqlConn.id),
      'listConnections returned both saved PostgreSQL and MySQL connections',
    );

    // 8. Delete Connection Mutation
    console.log('\n8. Testing deleteConnection Mutation...');
    const deleteRes = await gql(
      `
      mutation Delete($id: ID!) {
        deleteConnection(id: $id)
      }
    `,
      { id: pgConn.id },
      token,
    );
    assert(deleteRes.json?.data?.deleteConnection === true, 'deleteConnection successfully deleted connection');

    console.log(`\n========================================`);
    console.log(`M1 Verification Summary: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    await prisma.$disconnect();
    await app.close();

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('M1 Verification failed with error:', err);
    await prisma.$disconnect();
    await app.close();
    process.exit(1);
  }
}

runM1Verification();
