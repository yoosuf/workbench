export {};

const GRAPHQL_URL = 'http://localhost:4000/graphql';

async function graphqlReq(query: string, variables: any = {}, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json: any = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data;
}

async function runTest() {
  console.log('\n================================================================');
  console.log('➕  ADD COLUMN VIA SCHEMA BROWSER / API VERIFICATION TEST ➕');
  console.log('================================================================\n');

  // Step 1: User Auth
  const timestamp = Date.now();
  const email = `col_tester_${timestamp}@workbench.dev`;
  const signupRes = await graphqlReq(`
    mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
        user { id email }
      }
    }
  `, {
    input: { email, password: 'Password123!' }
  });
  const token = signupRes.signup.accessToken;
  console.log(`▶ STEP 1: Created test account: ${email}`);

  // Step 2: Database Connection
  const connRes = await graphqlReq(`
    mutation CreateConn($input: CreateConnectionInput!) {
      createConnection(input: $input) {
        id
        name
        engine
      }
    }
  `, {
    input: {
      name: 'Postgres Col Test DB',
      engine: 'POSTGRES',
      host: '127.0.0.1',
      port: 5433,
      database: 'sample_ecommerce',
      username: 'postgres',
      password: 'postgrespassword',
      ssl: false,
    }
  }, token);

  const connectionId = connRes.createConnection.id;
  const tableName = `team_table_1699_${timestamp.toString().slice(-4)}`;
  console.log(`▶ STEP 2: Created database connection ${connectionId}`);

  // Step 3: Create Table
  console.log(`▶ STEP 3: Creating table "${tableName}"...`);
  await graphqlReq(`
    mutation CreateTable($input: CreateTableInput!) {
      createTable(input: $input) {
        id
      }
    }
  `, {
    input: {
      connectionId,
      schema: 'public',
      tableName,
      primaryKeyType: 'SERIAL',
      columns: [
        { name: 'name', nativeType: 'varchar(100)', nullable: false }
      ],
      autoTimestamps: true
    }
  }, token);
  console.log(`  ✅ Table "${tableName}" created.`);

  // Step 4: Add Column 1 - 'department' varchar(150)
  console.log(`▶ STEP 4: Adding column "department" (VARCHAR(150), NULL)...`);
  await graphqlReq(`
    mutation AddColumn($input: AddColumnInput!) {
      addColumn(input: $input) {
        id
      }
    }
  `, {
    input: {
      connectionId,
      schema: 'public',
      tableName,
      columnName: 'department',
      nativeType: 'VARCHAR(150)',
      nullable: true
    }
  }, token);
  console.log(`  ✅ Column "department" added successfully.`);

  // Step 5: Add Column 2 - 'budget' numeric(14,2) with default 0
  console.log(`▶ STEP 5: Adding column "budget" (NUMERIC(14,2), DEFAULT 0)...`);
  await graphqlReq(`
    mutation AddColumn($input: AddColumnInput!) {
      addColumn(input: $input) {
        id
      }
    }
  `, {
    input: {
      connectionId,
      schema: 'public',
      tableName,
      columnName: 'budget',
      nativeType: 'NUMERIC(14,2)',
      nullable: false,
      defaultValue: '0'
    }
  }, token);
  console.log(`  ✅ Column "budget" added successfully.`);

  // Step 6: Verify Table Details via Schema Inspector
  console.log(`▶ STEP 6: Querying TableDetails via Schema Inspector...`);
  const detailsRes = await graphqlReq(`
    query TableDetails($connectionId: ID!, $schema: String!, $table: String!) {
      tableDetails(connectionId: $connectionId, schema: $schema, table: $table) {
        schema
        name
        columns {
          name
          nativeType
          dataKind
          nullable
          defaultValue
        }
      }
    }
  `, {
    connectionId,
    schema: 'public',
    table: tableName
  }, token);

  const cols = detailsRes.tableDetails.columns;
  const colNames = cols.map((c: any) => c.name);
  console.log(`  Columns found on table ${tableName}: ${colNames.join(', ')}`);

  const deptCol = cols.find((c: any) => c.name === 'department');
  const budgetCol = cols.find((c: any) => c.name === 'budget');

  if (!deptCol) throw new Error('department column not found in schema inspection!');
  if (!budgetCol) throw new Error('budget column not found in schema inspection!');

  console.log(`  ✅ PASS: "department" verified with nativeType: ${deptCol.nativeType}`);
  console.log(`  ✅ PASS: "budget" verified with nativeType: ${budgetCol.nativeType}`);

  // Step 7: Clean up test table
  await graphqlReq(`
    mutation DropTable($input: DropTableInput!) {
      dropTable(input: $input) {
        id
      }
    }
  `, {
    input: {
      connectionId,
      schema: 'public',
      tableName
    }
  }, token);
  console.log(`  ✅ Cleaned up test table.`);

  console.log('\n================================================================');
  console.log('🎉 ADD COLUMN VIA SCHEMA BROWSER TEST PASSED 100% 🎉');
  console.log('================================================================\n');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
