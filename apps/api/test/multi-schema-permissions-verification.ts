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
  console.log('🛡️  MULTI-SCHEMA CREATION & SCHEMA PERMISSIONS VERIFICATION 🛡️');
  console.log('================================================================\n');

  // Step 1: Sign up user
  const userEmail = `schema_admin_${Date.now()}@workbench.dev`;
  const signupRes = await graphqlReq(`
    mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
        user { id email }
      }
    }
  `, { input: { email: userEmail, password: 'Password123!' } });

  const token = signupRes.signup.accessToken;

  // Step 2: Create DB connection
  const connRes = await graphqlReq(`
    mutation CreateConnection($input: CreateConnectionInput!) {
      createConnection(input: $input) {
        id
        name
        engine
      }
    }
  `, {
    input: {
      name: 'Multi-Schema Test DB',
      engine: 'POSTGRES',
      host: '127.0.0.1',
      port: 5433,
      database: 'sample_ecommerce',
      username: 'postgres',
      password: 'postgrespassword',
    },
  }, token);

  const connectionId = connRes.createConnection.id;
  console.log(`▶ STEP 1: Created Database Connection ${connectionId}`);

  // Step 3: Create custom schema
  const targetSchemaName = `analytics_dept_${Math.floor(Math.random() * 100000)}`;
  console.log(`▶ STEP 2: Creating Schema "${targetSchemaName}"...`);
  const createSchemaRes = await graphqlReq(`
    mutation CreateSchema($input: CreateSchemaInput!) {
      createSchema(input: $input) {
        name
        connectionId
      }
    }
  `, {
    input: {
      connectionId,
      schemaName: targetSchemaName,
    },
  }, token);

  console.log(`  ✅ Schema "${createSchemaRes.createSchema.name}" created successfully.`);

  // Step 4: List schemas and confirm existence
  console.log('▶ STEP 3: Querying connection schemas...');
  const listSchemasRes = await graphqlReq(`
    query GetSchemas($connectionId: ID!) {
      connectionSchemas(connectionId: $connectionId) {
        name
      }
    }
  `, { connectionId }, token);

  const schemas = listSchemasRes.connectionSchemas.map((s: any) => s.name);
  if (!schemas.includes(targetSchemaName)) {
    throw new Error(`Schema ${targetSchemaName} not found in listed schemas: ${schemas.join(', ')}`);
  }
  console.log(`  ✅ PASS: Discovered ${schemas.length} schemas including "${targetSchemaName}".`);

  // Step 5: List database users
  console.log('▶ STEP 4: Querying database users & roles...');
  const usersRes = await graphqlReq(`
    query GetUsers($connectionId: ID!) {
      databaseUsers(connectionId: $connectionId) {
        username
        isSuperuser
      }
    }
  `, { connectionId }, token);

  const dbUsers = usersRes.databaseUsers;
  console.log(`  ✅ Found ${dbUsers.length} DB Users: ${dbUsers.map((u: any) => u.username).join(', ')}`);

  // Step 6: Grant schema permission
  console.log(`▶ STEP 5: Granting USAGE & SELECT permissions on "${targetSchemaName}" to "postgres"...`);
  await graphqlReq(`
    mutation GrantPermission($input: GrantSchemaPermissionInput!) {
      grantSchemaPermission(input: $input)
    }
  `, {
    input: {
      connectionId,
      schemaName: targetSchemaName,
      username: 'postgres',
      privilege: 'USAGE',
      grantAllTables: true,
    },
  }, token);

  console.log('  ✅ Schema privilege granted successfully.');

  // Step 7: Revoke schema permission
  console.log(`▶ STEP 6: Revoking USAGE permission on "${targetSchemaName}" from "postgres"...`);
  await graphqlReq(`
    mutation RevokePermission($input: RevokeSchemaPermissionInput!) {
      revokeSchemaPermission(input: $input)
    }
  `, {
    input: {
      connectionId,
      schemaName: targetSchemaName,
      username: 'postgres',
      privilege: 'USAGE',
    },
  }, token);

  console.log('  ✅ Schema privilege revoked successfully.');

  // Step 8: Clean up by dropping test schema
  console.log(`▶ STEP 7: Dropping test schema "${targetSchemaName}"...`);
  await graphqlReq(`
    mutation DropSchema($input: DropSchemaInput!) {
      dropSchema(input: $input)
    }
  `, {
    input: {
      connectionId,
      schemaName: targetSchemaName,
      cascade: true,
    },
  }, token);

  console.log(`  ✅ Schema "${targetSchemaName}" dropped successfully.`);

  console.log('\n================================================================');
  console.log('🎉 MULTI-SCHEMA & SCHEMA PERMISSION TESTS PASSED 100% 🎉');
  console.log('================================================================\n');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
