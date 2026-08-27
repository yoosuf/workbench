import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function runM3Verification() {
  console.log('🚀 Starting Universal DB Workbench - M3 Verification Suite...\n');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(4004);

  const baseUrl = 'http://localhost:4004/graphql';

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
    // 1. Setup User Session & Target Connections
    console.log('1. Setting up User & Connections for M3...');
    const testEmail = `m3_tester_${Date.now()}@workbench.local`;
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
    assert(!!token, 'Obtained JWT access token for M3 test suite');

    // Create Postgres Connection
    const createPgRes = await gql(
      `
      mutation CreateConn($input: CreateConnectionInput!) {
        createConnection(input: $input) { id name engine }
      }
    `,
      {
        input: {
          name: 'M3 Postgres Container',
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
          name: 'M3 MySQL Container',
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

    // 2. Test generateDiagram for PostgreSQL
    console.log('\n2. Testing generateDiagram for PostgreSQL Target Schema...');
    const genPgRes = await gql(
      `
      mutation GenDiag($input: GenerateDiagramInput!) {
        generateDiagram(input: $input) {
          id
          name
          schema
          nodes {
            id
            tableName
            positionX
            positionY
            columns {
              name
              isPrimaryKey
              isForeignKey
            }
          }
          edges {
            id
            source
            target
            sourceColumn
            targetColumn
          }
        }
      }
    `,
      {
        input: {
          connectionId: pgConnId,
          schema: 'public',
          name: 'PostgreSQL E-Commerce ERD',
        },
      },
      token,
    );

    const pgDiag = genPgRes.json?.data?.generateDiagram;
    assert(!!pgDiag?.id, 'generateDiagram created diagram record');
    assert(
      pgDiag?.nodes?.length === 6,
      `PostgreSQL diagram generated 6 table nodes (found ${pgDiag?.nodes?.length})`,
    );
    assert(
      pgDiag?.nodes?.every((n: any) => typeof n.positionX === 'number' && typeof n.positionY === 'number'),
      'Dagre auto-layout assigned (x, y) coordinates to all nodes',
    );
    assert(
      pgDiag?.edges?.length >= 5,
      `Live foreign key edges derived (${pgDiag?.edges?.length} edges found)`,
    );
    assert(
      pgDiag?.edges?.some(
        (e: any) => e.source === 'products' && e.target === 'categories' && e.sourceColumn === 'category_id',
      ),
      'Derived edge connects products(category_id) -> categories(id)',
    );
    assert(
      pgDiag?.edges?.some(
        (e: any) => e.source === 'order_items' && e.target === 'products',
      ),
      'Derived edge connects order_items -> products',
    );

    // 3. Test generateDiagram for MySQL
    console.log('\n3. Testing generateDiagram for MySQL Target Schema...');
    const genMySqlRes = await gql(
      `
      mutation GenDiag($input: GenerateDiagramInput!) {
        generateDiagram(input: $input) {
          id
          name
          schema
          nodes {
            id
            tableName
            positionX
            positionY
          }
          edges {
            id
            source
            target
            sourceColumn
            targetColumn
          }
        }
      }
    `,
      {
        input: {
          connectionId: mySqlConnId,
          schema: 'sample_ecommerce',
          name: 'MySQL E-Commerce ERD',
        },
      },
      token,
    );

    const mySqlDiag = genMySqlRes.json?.data?.generateDiagram;
    assert(!!mySqlDiag?.id, 'generateDiagram created MySQL diagram record');
    assert(
      mySqlDiag?.nodes?.length === 6,
      `MySQL diagram generated 6 table nodes (found ${mySqlDiag?.nodes?.length})`,
    );
    assert(
      mySqlDiag?.edges?.length >= 5,
      `MySQL live FK edges derived (${mySqlDiag?.edges?.length} edges found)`,
    );

    // 4. Test saveDiagramLayout (Drag and Reposition Persistence)
    console.log('\n4. Testing saveDiagramLayout (repositioning nodes)...');
    const updatedPositions = [
      { nodeId: 'products', x: 550, y: 320 },
      { nodeId: 'categories', x: 120, y: 180 },
      { nodeId: 'orders', x: 750, y: 400 },
    ];

    const saveRes = await gql(
      `
      mutation SaveLayout($input: SaveDiagramLayoutInput!) {
        saveDiagramLayout(input: $input)
      }
    `,
      {
        input: {
          diagramId: pgDiag.id,
          positions: updatedPositions,
        },
      },
      token,
    );
    assert(saveRes.json?.data?.saveDiagramLayout === true, 'saveDiagramLayout mutation succeeded');

    // 5. Test diagram(id) Query (verifying persisted coordinates + freshly derived edges)
    console.log('\n5. Testing diagram(id) Query across reload...');
    const fetchSavedDiagRes = await gql(
      `
      query GetDiag($id: ID!) {
        diagram(id: $id) {
          id
          name
          nodes {
            id
            positionX
            positionY
          }
          edges {
            id
            source
            target
          }
        }
      }
    `,
      { id: pgDiag.id },
      token,
    );

    const reloadedDiag = fetchSavedDiagRes.json?.data?.diagram;
    const productsNode = reloadedDiag?.nodes?.find((n: any) => n.id === 'products');
    const categoriesNode = reloadedDiag?.nodes?.find((n: any) => n.id === 'categories');

    assert(
      productsNode?.positionX === 550 && productsNode?.positionY === 320,
      'Reloaded diagram preserved modified position for "products" (x: 550, y: 320)',
    );
    assert(
      categoriesNode?.positionX === 120 && categoriesNode?.positionY === 180,
      'Reloaded diagram preserved modified position for "categories" (x: 120, y: 180)',
    );
    assert(
      reloadedDiag?.edges?.length >= 5,
      'Edges freshly re-derived live upon diagram query load',
    );

    // 6. Test listDiagrams & deleteDiagram
    console.log('\n6. Testing listDiagrams & deleteDiagram...');
    const listRes = await gql(
      `
      query ListDiags($connectionId: ID!) {
        listDiagrams(connectionId: $connectionId) { id name }
      }
    `,
      { connectionId: pgConnId },
      token,
    );
    assert(
      Array.isArray(listRes.json?.data?.listDiagrams) && listRes.json.data.listDiagrams.length > 0,
      'listDiagrams returned saved diagram summaries',
    );

    const deleteRes = await gql(
      `
      mutation DelDiag($id: ID!) {
        deleteDiagram(id: $id)
      }
    `,
      { id: pgDiag.id },
      token,
    );
    assert(deleteRes.json?.data?.deleteDiagram === true, 'deleteDiagram successfully removed diagram');

    console.log(`\n========================================`);
    console.log(`M3 Verification Summary: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    await app.close();
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('M3 Verification failed with error:', err);
    await app.close();
    process.exit(1);
  }
}

runM3Verification();
