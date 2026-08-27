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

async function main() {
  console.log('================================================================');
  console.log('🛡️  UNIVERSAL DATABASE WORKBENCH — CONNECTION SECURITY TEST 🛡️');
  console.log('================================================================\n');

  // 1. Authenticate / Signup
  const email = `sec_user_${Date.now()}@workbench.dev`;
  const password = 'SecurityPassword123!';

  const signupRes = await graphqlRequest(`
    mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
        user { id email }
      }
    }
  `, { input: { email, password } });

  const token = signupRes.data.signup.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log('✅ Authenticated test session initialized.');

  // 2. SSRF Protection Tests
  console.log('\n▶ Testing SSRF & Cloud Metadata Protection...');
  const dangerousHosts = [
    '169.254.169.254',
    '169.254.169.250',
    'metadata.google.internal',
    '169.254.10.20',
  ];

  for (const host of dangerousHosts) {
    const testRes = await graphqlRequest(`
      mutation TestConnection($input: TestConnectionInput!) {
        testConnection(input: $input) {
          success
          message
        }
      }
    `, {
      input: {
        engine: 'POSTGRES',
        host,
        port: 5432,
        database: 'postgres',
        username: 'root',
        password: 'secret',
      },
    }, authHeaders);

    const isBlocked =
      testRes.errors &&
      testRes.errors.some((e: any) =>
        e.message.toLowerCase().includes('security error') ||
        e.message.toLowerCase().includes('prohibited'),
      );

    if (isBlocked) {
      console.log(`  ✅ SSRF BLOCKED: Access to dangerous host "${host}" was rejected.`);
    } else {
      console.error(`  ❌ FAILED: SSRF Host "${host}" was NOT blocked!`, testRes);
      process.exit(1);
    }
  }

  // 3. Zero Password Leakage Verification
  console.log('\n▶ Testing Zero Password Leakage in GraphQL Queries...');
  const createConnRes = await graphqlRequest(`
    mutation CreateConnection($input: CreateConnectionInput!) {
      createConnection(input: $input) {
        id
        name
        engine
        host
        port
        database
        username
        ssl
        sslMode
        createdAt
      }
    }
  `, {
    input: {
      name: 'Secure Cloud DB',
      engine: 'POSTGRES',
      host: '127.0.0.1',
      port: 5433,
      database: 'sample_ecommerce',
      username: 'postgres',
      password: 'postgrespassword',
      ssl: false,
      sslMode: 'disable',
    },
  }, authHeaders);

  const createdConn = createConnRes.data?.createConnection;
  if (!createdConn || !createdConn.id) {
    console.error('Failed to create connection:', createConnRes);
    process.exit(1);
  }

  // Verify created connection object has zero password field
  if ((createdConn as any).password || (createdConn as any).encryptedPassword) {
    console.error('❌ FAILED: Password leaked in createConnection response!');
    process.exit(1);
  }
  console.log('  ✅ PASS: Password field omitted in createConnection output.');
  console.log(`  ✅ PASS: SSL configuration persisted: ssl=${createdConn.ssl}, sslMode=${createdConn.sslMode}`);

  // Query listConnections
  const listConnRes = await graphqlRequest(`
    query ListConnections {
      listConnections {
        id
        name
        host
        username
        ssl
        sslMode
      }
    }
  `, {}, authHeaders);

  const foundConn = listConnRes.data.listConnections.find(
    (c: any) => c.id === createdConn.id,
  );
  if ((foundConn as any).password || (foundConn as any).encryptedPassword) {
    console.error('❌ FAILED: Password leaked in listConnections response!');
    process.exit(1);
  }
  console.log('  ✅ PASS: Password field strictly omitted in listConnections output.');

  // 4. Test SQL Identifier Injection Prevention
  console.log('\n▶ Testing SQL Identifier Injection Prevention in DDL...');
  const maliciousTableRes = await graphqlRequest(`
    mutation CreateTable($input: CreateTableInput!) {
      createTable(input: $input) {
        id
      }
    }
  `, {
    input: {
      connectionId: createdConn.id,
      schema: 'public',
      tableName: 'evil_table; DROP TABLE users; --',
      primaryKeyColumn: 'id',
    },
  }, authHeaders);

  const isDdlBlocked =
    maliciousTableRes.errors &&
    maliciousTableRes.errors.some((e: any) =>
      e.message.toLowerCase().includes('security error') ||
      e.message.toLowerCase().includes('invalid tablename'),
    );

  if (isDdlBlocked) {
    console.log('  ✅ PASS: Malicious SQL injection payload in table name was rejected.');
  } else {
    console.error('  ❌ FAILED: Identifier injection was NOT blocked!', maliciousTableRes);
    process.exit(1);
  }

  // 5. Test Saved Connection Decryption & Live Connection Test
  console.log('\n▶ Testing Live Saved Connection Test with Decrypted Credentials...');
  const testSavedRes = await graphqlRequest(`
    mutation TestSavedConnection($id: ID!) {
      testSavedConnection(id: $id) {
        success
        latencyMs
      }
    }
  `, { id: createdConn.id }, authHeaders);

  if (testSavedRes.data?.testSavedConnection?.success) {
    console.log(`  ✅ PASS: Decrypted credentials connected successfully in ${testSavedRes.data.testSavedConnection.latencyMs}ms.`);
  } else {
    console.error('  ❌ FAILED: Saved connection test failed:', testSavedRes);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL CONNECTION SECURITY VERIFICATION TESTS PASSED 100% 🎉');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Security verification error:', err);
  process.exit(1);
});
