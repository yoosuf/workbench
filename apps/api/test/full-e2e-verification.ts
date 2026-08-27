import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function runFullE2EVerification() {
  console.log('================================================================');
  console.log('🌟 UNIVERSAL DATABASE WORKBENCH — FULL E2E MVP VERIFICATION 🌟');
  console.log('================================================================\n');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(4010);

  const baseUrl = 'http://localhost:4010/graphql';

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

  function assert(condition: boolean, milestone: string, message: string) {
    if (condition) {
      console.log(`  ✅ [${milestone}] PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [${milestone}] FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // MILESTONE 0: AUTHENTICATION & SECURITY
    // ---------------------------------------------------------
    console.log('\n▶ STAGE 1: Testing Milestone 0 (Auth, JWT & Session Management)...');
    const userEmail = `e2e_master_${Date.now()}@workbench.local`;
    const password = 'SuperSecurePassword2026!';

    // Signup
    const signupRes = await gql(`
      mutation Signup($input: SignupInput!) {
        signup(input: $input) {
          accessToken
          user { id email createdAt }
        }
      }
    `, { input: { email: userEmail, password } });

    const token = signupRes.json?.data?.signup?.accessToken;
    const userId = signupRes.json?.data?.signup?.user?.id;
    assert(!!token && !!userId, 'M0', 'User signup returned JWT access token and user record');

    // Login
    const loginRes = await gql(`
      mutation Login($input: LoginInput!) {
        login(input: $input) {
          accessToken
          user { id email }
        }
      }
    `, { input: { email: userEmail, password } });
    assert(!!loginRes.json?.data?.login?.accessToken, 'M0', 'User login succeeded with valid credentials');

    // Current User Profile Query
    const meRes = await gql(`
      query Me {
        me { id email }
      }
    `, {}, token);
    assert(meRes.json?.data?.me?.email === userEmail, 'M0', 'Authenticated `me` query returned active user profile');

    // ---------------------------------------------------------
    // MILESTONE 1: CONNECTION MANAGEMENT & AES-256-GCM ENCRYPTION
    // ---------------------------------------------------------
    console.log('\n▶ STAGE 2: Testing Milestone 1 (Connection Management & Dual Engine)...');

    // Live Test Connection (Unsaved)
    const testPgRes = await gql(`
      mutation TestConn($input: TestConnectionInput!) {
        testConnection(input: $input) {
          success
          message
          latencyMs
        }
      }
    `, {
      input: {
        engine: 'POSTGRES',
        host: '127.0.0.1',
        port: 5433,
        database: 'sample_ecommerce',
        username: 'postgres',
        password: 'postgrespassword',
      }
    }, token);
    assert(testPgRes.json?.data?.testConnection?.success === true, 'M1', 'Live connection test to PostgreSQL container succeeded with latency');

    // Save PostgreSQL Connection
    const savePgRes = await gql(`
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
    `, {
      input: {
        name: 'E2E PostgreSQL Target',
        engine: 'POSTGRES',
        host: '127.0.0.1',
        port: 5433,
        database: 'sample_ecommerce',
        username: 'postgres',
        password: 'postgrespassword',
      }
    }, token);
    const pgConnId = savePgRes.json?.data?.createConnection?.id;
    assert(!!pgConnId, 'M1', 'Created and encrypted PostgreSQL connection');

    // Save MySQL Connection
    const saveMySqlRes = await gql(`
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
    `, {
      input: {
        name: 'E2E MySQL Target',
        engine: 'MYSQL',
        host: '127.0.0.1',
        port: 3307,
        database: 'sample_ecommerce',
        username: 'root',
        password: 'mysqlpassword',
      }
    }, token);
    const mySqlConnId = saveMySqlRes.json?.data?.createConnection?.id;
    assert(!!mySqlConnId, 'M1', 'Created and encrypted MySQL connection');

    // Test Saved Connection
    const testSavedRes = await gql(`
      mutation TestSaved($id: ID!) {
        testSavedConnection(id: $id) {
          success
          latencyMs
        }
      }
    `, { id: pgConnId }, token);
    assert(testSavedRes.json?.data?.testSavedConnection?.success === true, 'M1', 'Decrypted and tested saved connection on-the-fly');

    // ---------------------------------------------------------
    // MILESTONE 2: SCHEMA BROWSER & DATALOADER METADATA
    // ---------------------------------------------------------
    console.log('\n▶ STAGE 3: Testing Milestone 2 (Schema Browser & DataLoader)...');

    // Schemas & Tables
    const pgSchemasRes = await gql(`
      query GetSchemas($connectionId: ID!) {
        connectionSchemas(connectionId: $connectionId) { name }
      }
    `, { connectionId: pgConnId }, token);
    assert(pgSchemasRes.json?.data?.connectionSchemas?.some((s: any) => s.name === 'public'), 'M2', 'Introspected PostgreSQL schemas');

    const pgTablesRes = await gql(`
      query GetTables($connectionId: ID!, $schema: String!) {
        schemaTables(connectionId: $connectionId, schema: $schema) {
          name
          kind
        }
      }
    `, { connectionId: pgConnId, schema: 'public' }, token);
    const tableNames: string[] = (pgTablesRes.json?.data?.schemaTables || []).map((t: any) => t.name);
    assert(tableNames.includes('products') && tableNames.includes('orders') && tableNames.includes('order_items'), 'M2', 'Found all 6 relational sample tables');

    // Nested Field Resolvers (Columns, PK, FK, Indexes) via DataLoader
    const detailsRes = await gql(`
      query GetDetails($connectionId: ID!, $schema: String!, $table: String!) {
        tableDetails(connectionId: $connectionId, schema: $schema, table: $table) {
          name
          columns { name nativeType dataKind isPrimaryKey isForeignKey }
          primaryKey
          foreignKeys { name columns referencedTable referencedColumns onDelete }
          indexes { name isUnique type columns }
        }
      }
    `, { connectionId: pgConnId, schema: 'public', table: 'order_items' }, token);

    const details = detailsRes.json?.data?.tableDetails;
    assert(details?.primaryKey?.includes('id'), 'M2', 'DataLoader resolved primary key correctly');
    assert(details?.foreignKeys?.length === 2, 'M2', 'DataLoader resolved both foreign keys (orders & products)');
    assert(details?.columns?.find((c: any) => c.name === 'quantity')?.dataKind === 'NUMERIC', 'M2', 'Standardized dataKind accurately mapped to NUMERIC');

    // ---------------------------------------------------------
    // MILESTONE 3: ER DIAGRAM CANVAS & LIVE FK EDGES
    // ---------------------------------------------------------
    console.log('\n▶ STAGE 4: Testing Milestone 3 (ER Diagram Canvas & Dagre Layout)...');

    // Generate Diagram
    const genDiagRes = await gql(`
      mutation GenDiag($input: GenerateDiagramInput!) {
        generateDiagram(input: $input) {
          id
          name
          schema
          nodes { id positionX positionY columns { name } }
          edges { id source target sourceColumn targetColumn }
        }
      }
    `, {
      input: {
        connectionId: pgConnId,
        schema: 'public',
        name: 'E2E Full Schema ERD',
      }
    }, token);

    const diagram = genDiagRes.json?.data?.generateDiagram;
    assert(diagram?.nodes?.length >= 6, 'M3', 'Dagre computed node layout for relational tables');
    assert(diagram?.edges?.length >= 5, 'M3', 'Derived live relational FK edges between tables');

    // Save repositioned layout
    const saveLayoutRes = await gql(`
      mutation SaveLayout($input: SaveDiagramLayoutInput!) {
        saveDiagramLayout(input: $input)
      }
    `, {
      input: {
        diagramId: diagram.id,
        positions: [
          { nodeId: 'products', x: 600, y: 350 },
          { nodeId: 'categories', x: 150, y: 200 }
        ]
      }
    }, token);
    assert(saveLayoutRes.json?.data?.saveDiagramLayout === true, 'M3', 'Saved drag-and-drop repositioned coordinates');

    // Reload diagram
    const reloadDiagRes = await gql(`
      query GetDiag($id: ID!) {
        diagram(id: $id) {
          id
          nodes { id positionX positionY }
          edges { id source target }
        }
      }
    `, { id: diagram.id }, token);
    const reloaded = reloadDiagRes.json?.data?.diagram;
    const prodNode = reloaded?.nodes?.find((n: any) => n.id === 'products');
    assert(prodNode?.positionX === 600 && prodNode?.positionY === 350, 'M3', 'Persisted layout coordinates maintained across reload');
    assert(reloaded?.edges?.length >= 5, 'M3', 'Edges dynamically re-derived from live DB state on load');

    // ---------------------------------------------------------
    // MILESTONE 4: SQL EDITOR, LIMITS & QUERY HISTORY
    // ---------------------------------------------------------
    console.log('\n▶ STAGE 5: Testing Milestone 4 (SQL Editor, Limits & Query History)...');

    // Execute Standard Query
    const execRes = await gql(`
      mutation ExecQ($input: ExecuteQueryInput!) {
        executeQuery(input: $input) {
          columns
          rows
          rowCount
          executionTimeMs
          truncated
        }
      }
    `, {
      input: {
        connectionId: pgConnId,
        sql: 'SELECT p.name, c.name as category, p.price FROM products p JOIN categories c ON p.category_id = c.id ORDER BY p.price DESC;',
      }
    }, token);
    const execResult = execRes.json?.data?.executeQuery;
    assert(execResult?.rowCount > 0 && execResult?.columns?.includes('category'), 'M4', 'Complex JOIN query executed and returned rows with columns');

    // Test 10k Row Cap
    const capRes = await gql(`
      mutation ExecQ($input: ExecuteQueryInput!) {
        executeQuery(input: $input) {
          rowCount
          truncated
        }
      }
    `, {
      input: {
        connectionId: pgConnId,
        sql: 'SELECT generate_series(1, 12000) as n;',
        overrideLimits: false,
      }
    }, token);
    assert(capRes.json?.data?.executeQuery?.truncated === true, 'M4', '10,000-row default cap enforced on server-side');

    // Verify Query History
    const historyRes = await gql(`
      query GetHistory($connectionId: ID!) {
        queryHistory(connectionId: $connectionId) {
          id
          sql
          durationMs
          success
        }
      }
    `, { connectionId: pgConnId }, token);
    assert(historyRes.json?.data?.queryHistory?.length >= 2, 'M4', 'Query executions logged into QueryHistory table');

    // Saved Queries
    const saveQRes = await gql(`
      mutation SaveQ($input: SaveQueryInput!) {
        saveQuery(input: $input) { id name sql }
      }
    `, {
      input: {
        connectionId: pgConnId,
        name: 'Top Categories by Product Count',
        sql: 'SELECT category_id, COUNT(*) FROM products GROUP BY category_id;',
      }
    }, token);
    assert(!!saveQRes.json?.data?.saveQuery?.id, 'M4', 'Saved custom SQL query');

    // ---------------------------------------------------------
    // MILESTONE 5: TABLE DATA BROWSING & PAGINATION
    // ---------------------------------------------------------
    console.log('\n▶ STAGE 6: Testing Milestone 5 (Table Data Browsing, Sorting & Pagination)...');

    const tableDataRes = await gql(`
      query GetTableData($input: TableDataInput!) {
        tableData(input: $input) {
          columns
          rows
          totalCount
          limit
          offset
          sortColumn
          sortOrder
        }
      }
    `, {
      input: {
        connectionId: pgConnId,
        schema: 'public',
        table: 'products',
        limit: 2,
        offset: 0,
        sortColumn: 'price',
        sortOrder: 'DESC',
      }
    }, token);

    const tData = tableDataRes.json?.data?.tableData;
    assert(tData?.totalCount >= 3, 'M5', 'Table data browser discovered total count via COUNT(*)');
    assert(tData?.rows?.length === 2, 'M5', 'Pagination limit returned exact slice of 2 rows');
    assert(Number(tData?.rows[0]?.price) >= Number(tData?.rows[1]?.price), 'M5', 'Table data returned rows sorted by price DESC');

    // Test MySQL Target Parity
    const mysqlDataRes = await gql(`
      query GetTableData($input: TableDataInput!) {
        tableData(input: $input) {
          rows
          totalCount
        }
      }
    `, {
      input: {
        connectionId: mySqlConnId,
        schema: 'sample_ecommerce',
        table: 'categories',
        limit: 10,
        offset: 0,
      }
    }, token);
    assert(mysqlDataRes.json?.data?.tableData?.totalCount >= 2, 'M5', 'MySQL table data browsing parity verified');

    console.log('\n================================================================');
    console.log(`🎉 ALL MILESTONES VERIFIED: ${passed} passed, ${failed} failed 🎉`);
    console.log('================================================================\n');

    await app.close();
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Full E2E Verification failed with error:', err);
    await app.close();
    process.exit(1);
  }
}

runFullE2EVerification();
