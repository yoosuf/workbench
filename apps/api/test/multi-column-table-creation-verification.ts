export {};

const GRAPHQL_URL = 'http://localhost:4000/graphql';

async function graphqlRequest(query: string, variables = {}, headers: Record<string, string> = {}) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('================================================================');
  console.log('🏗️  MULTI-FIELD TABLE CREATION & AUTO-TIMESTAMPS TEST 🏗️');
  console.log('================================================================\n');

  const ts = Date.now();
  const userEmail = `table_creator_${ts}@workbench.dev`;
  const pwd = 'TableCreatorPwd123!';

  // 1. Auth Setup
  console.log('▶ STEP 1: Setting up user and PostgreSQL connection...');
  const signupRes = await graphqlRequest(`
    mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
        user { id email }
      }
    }
  `, { input: { email: userEmail, password: pwd } });

  const token = signupRes.data.signup.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  const connRes = await graphqlRequest(`
    mutation CreateConnection($input: CreateConnectionInput!) {
      createConnection(input: $input) { id name }
    }
  `, {
    input: {
      name: 'Multi Field Test Postgres',
      engine: 'POSTGRES',
      host: '127.0.0.1',
      port: 5433,
      database: 'sample_ecommerce',
      username: 'postgres',
      password: 'postgrespassword',
    },
  }, headers);

  const connectionId = connRes.data.createConnection.id;
  const tableName = `inventory_items_${ts.toString().slice(-6)}`;

  // 2. Create Table with multiple fields & autoTimestamps
  console.log(`\n▶ STEP 2: Creating table "${tableName}" with 4 custom fields and auto-timestamps...`);
  const createTableRes = await graphqlRequest(`
    mutation CreateTable($input: CreateTableInput!) {
      createTable(input: $input) {
        id
        nodes {
          tableName
          columns {
            name
            nativeType
            isPrimaryKey
          }
        }
      }
    }
  `, {
    input: {
      connectionId,
      schema: 'public',
      tableName,
      primaryKeyColumn: 'item_id',
      primaryKeyType: 'UUID',
      columns: [
        {
          name: 'title',
          nativeType: 'VARCHAR(255)',
          nullable: false,
        },
        {
          name: 'price_usd',
          nativeType: 'DECIMAL(10,2)',
          nullable: false,
          defaultValue: '0.00',
        },
        {
          name: 'sku_code',
          nativeType: 'VARCHAR(50)',
          isUnique: true,
        },
        {
          name: 'is_active',
          nativeType: 'BOOLEAN',
          defaultValue: 'true',
        },
      ],
      autoTimestamps: true,
    },
  }, headers);

  if (createTableRes.errors) {
    console.error('  ❌ Table creation failed:', createTableRes.errors);
    process.exit(1);
  }

  const createdNode = createTableRes.data?.createTable?.nodes?.find(
    (n: any) => n.tableName === tableName,
  );

  if (!createdNode) {
    console.error('  ❌ Table node not returned in diagram:', createTableRes);
    process.exit(1);
  }

  console.log(`  ✅ Table "${tableName}" created successfully.`);
  console.log(`     Discovered columns on diagram canvas:`);
  for (const c of createdNode.columns) {
    console.log(`     - ${c.name} (${c.nativeType}) [PK: ${c.isPrimaryKey}]`);
  }

  // 3. Introspect via SQL query to confirm column structure in Postgres
  console.log('\n▶ STEP 3: Verifying columns directly against PostgreSQL catalog...');
  const verifyRes = await graphqlRequest(`
    mutation Execute($input: ExecuteQueryInput!) {
      executeQuery(input: $input) {
        rows
      }
    }
  `, {
    input: {
      connectionId,
      sql: `SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '${tableName}' 
            ORDER BY ordinal_position;`,
    },
  }, headers);

  const rawRows: any[] = verifyRes.data?.executeQuery?.rows || [];
  const colNames = rawRows.map((r: any) => r.column_name);

  console.log('  ✅ PostgreSQL Catalog Confirmed Columns:', colNames.join(', '));

  // Assert all fields exist
  const expectedCols = ['item_id', 'title', 'price_usd', 'sku_code', 'is_active', 'created_at', 'updated_at'];
  for (const expected of expectedCols) {
    if (!colNames.includes(expected)) {
      console.error(`  ❌ FAILED: Expected column "${expected}" not found in catalog:`, colNames);
      process.exit(1);
    }
  }

  console.log('  ✅ PASS: Primary key "item_id" created.');
  console.log('  ✅ PASS: Custom fields "title", "price_usd", "sku_code", "is_active" created.');
  console.log('  ✅ PASS: Auto timestamps "created_at" and "updated_at" created.');

  // Clean up test table
  await graphqlRequest(`
    mutation Drop($input: DropTableInput!) {
      dropTable(input: $input) { id }
    }
  `, {
    input: { connectionId, schema: 'public', tableName },
  }, headers);

  console.log('\n================================================================');
  console.log('🎉 MULTI-FIELD & AUTO-TIMESTAMP TABLE TESTS PASSED 100% 🎉');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Multi-field table test suite error:', err);
  process.exit(1);
});
