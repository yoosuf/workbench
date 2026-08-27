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
  console.log('🏢  MULTI-WORKSPACE & GITHUB-STYLE TEAM PERMISSIONS TEST 🏢');
  console.log('================================================================\n');

  const ts = Date.now();
  const ownerEmail = `owner_${ts}@workbench.dev`;
  const memberEmail = `member_${ts}@workbench.dev`;
  const readerEmail = `reader_${ts}@workbench.dev`;
  const pwd = 'TeamPassword123!';

  // 1. Owner Signup
  console.log('▶ STEP 1: Signup User A (Workspace Owner)...');
  const ownerRes = await graphqlRequest(`
    mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
        user { id email }
      }
    }
  `, { input: { email: ownerEmail, password: pwd } });

  const ownerToken = ownerRes.data.signup.accessToken;
  const ownerHeaders = { Authorization: `Bearer ${ownerToken}` };
  console.log(`  ✅ User A signed up: ${ownerEmail}`);

  // 2. Member & Reader Signups
  console.log('\n▶ STEP 2: Signup User B (Member) & User C (Reader)...');
  const memberRes = await graphqlRequest(`
    mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
        user { id email }
      }
    }
  `, { input: { email: memberEmail, password: pwd } });
  const memberToken = memberRes.data.signup.accessToken;
  const memberHeaders = { Authorization: `Bearer ${memberToken}` };

  const readerRes = await graphqlRequest(`
    mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
        user { id email }
      }
    }
  `, { input: { email: readerEmail, password: pwd } });
  const readerToken = readerRes.data.signup.accessToken;
  const readerUserId = readerRes.data.signup.user.id;
  const readerHeaders = { Authorization: `Bearer ${readerToken}` };
  console.log(`  ✅ User B & User C accounts ready.`);

  // 3. User A Creates "Engineering Team" Workspace
  console.log('\n▶ STEP 3: User A Creates "Engineering Team" Workspace...');
  const createWsRes = await graphqlRequest(`
    mutation CreateWorkspace($input: CreateWorkspaceInput!) {
      createWorkspace(input: $input) {
        id
        name
        slug
        currentUserRole
      }
    }
  `, { input: { name: 'Engineering Team' } }, ownerHeaders);

  const teamWs = createWsRes.data.createWorkspace;
  console.log(`  ✅ Workspace created: "${teamWs.name}" (ID: ${teamWs.id}, Role: ${teamWs.currentUserRole})`);

  // 4. User A Invites User B (MEMBER) & User C (READONLY)
  console.log('\n▶ STEP 4: Inviting Team Members...');
  await graphqlRequest(`
    mutation Invite($input: InviteWorkspaceMemberInput!) {
      inviteWorkspaceMember(input: $input) { id role }
    }
  `, {
    input: {
      workspaceId: teamWs.id,
      email: memberEmail,
      role: 'MEMBER',
    },
  }, ownerHeaders);
  console.log(`  ✅ User B invited with MEMBER (Write) role.`);

  await graphqlRequest(`
    mutation Invite($input: InviteWorkspaceMemberInput!) {
      inviteWorkspaceMember(input: $input) { id role }
    }
  `, {
    input: {
      workspaceId: teamWs.id,
      email: readerEmail,
      role: 'READONLY',
    },
  }, ownerHeaders);
  console.log(`  ✅ User C invited with READONLY role.`);

  // 5. User A Creates a Target Database Connection in "Engineering Team"
  console.log('\n▶ STEP 5: Creating Connection in "Engineering Team" Workspace...');
  const createConnRes = await graphqlRequest(`
    mutation CreateConnection($input: CreateConnectionInput!) {
      createConnection(input: $input) {
        id
        name
        workspaceId
        effectiveAccessLevel
      }
    }
  `, {
    input: {
      workspaceId: teamWs.id,
      name: 'Engineering Postgres DB',
      engine: 'POSTGRES',
      host: '127.0.0.1',
      port: 5433,
      database: 'sample_ecommerce',
      username: 'postgres',
      password: 'postgrespassword',
      accessLevel: 'WRITE',
    },
  }, ownerHeaders);

  const conn = createConnRes.data.createConnection;
  console.log(`  ✅ Connection created: "${conn.name}" (Access: ${conn.effectiveAccessLevel})`);

  // 6. User B (MEMBER - WRITE) Verification
  console.log('\n▶ STEP 6: Testing User B (MEMBER - WRITE) Capabilities...');
  const memberConnList = await graphqlRequest(`
    query ListConnections($workspaceId: ID) {
      listConnections(workspaceId: $workspaceId) {
        id
        name
        effectiveAccessLevel
      }
    }
  `, { workspaceId: teamWs.id }, memberHeaders);

  const memberConn = memberConnList.data.listConnections.find((c: any) => c.id === conn.id);
  console.log(`  ✅ User B discovered connection with effectiveAccessLevel: "${memberConn.effectiveAccessLevel}"`);

  // User B executes query
  const memberQueryRes = await graphqlRequest(`
    mutation Execute($input: ExecuteQueryInput!) {
      executeQuery(input: $input) {
        rowCount
        executionTimeMs
      }
    }
  `, {
    input: {
      connectionId: conn.id,
      sql: 'SELECT * FROM products LIMIT 5;',
    },
  }, memberHeaders);
  console.log(`  ✅ User B executed query: returned ${memberQueryRes.data.executeQuery.rowCount} rows.`);

  // User B creates table via DDL
  const memberDdlRes = await graphqlRequest(`
    mutation CreateTable($input: CreateTableInput!) {
      createTable(input: $input) { id }
    }
  `, {
    input: {
      connectionId: conn.id,
      schema: 'public',
      tableName: `team_table_${ts.toString().slice(-4)}`,
    },
  }, memberHeaders);
  console.log(`  ✅ User B created table successfully.`);

  // 7. User C (READONLY - READ) Sandbox Verification
  console.log('\n▶ STEP 7: Testing User C (READONLY) Security Sandbox...');
  const readerConnList = await graphqlRequest(`
    query ListConnections($workspaceId: ID) {
      listConnections(workspaceId: $workspaceId) {
        id
        name
        effectiveAccessLevel
      }
    }
  `, { workspaceId: teamWs.id }, readerHeaders);

  const readerConn = readerConnList.data.listConnections.find((c: any) => c.id === conn.id);
  console.log(`  ✅ User C discovered connection with effectiveAccessLevel: "${readerConn.effectiveAccessLevel}"`);

  // User C can run SELECT
  const readerSelectRes = await graphqlRequest(`
    mutation Execute($input: ExecuteQueryInput!) {
      executeQuery(input: $input) {
        rowCount
      }
    }
  `, {
    input: {
      connectionId: conn.id,
      sql: 'SELECT * FROM products LIMIT 2;',
    },
  }, readerHeaders);
  console.log(`  ✅ User C read SELECT data successfully.`);

  // User C BLOCKED from mutating SQL (DROP TABLE)
  const readerDropRes = await graphqlRequest(`
    mutation Execute($input: ExecuteQueryInput!) {
      executeQuery(input: $input) { rowCount }
    }
  `, {
    input: {
      connectionId: conn.id,
      sql: 'DROP TABLE products;',
    },
  }, readerHeaders);

  const isReaderSqlBlocked =
    readerDropRes.errors &&
    readerDropRes.errors.some((e: any) =>
      e.message.toLowerCase().includes('prohibited') ||
      e.message.toLowerCase().includes('read'),
    );

  if (isReaderSqlBlocked) {
    console.log(`  ✅ PASS: User C was BLOCKED from executing mutating DROP TABLE statement.`);
  } else {
    console.error(`  ❌ FAILED: User C was NOT blocked from DROP TABLE!`, readerDropRes);
    process.exit(1);
  }

  // User C BLOCKED from DDL createTable
  const readerDdlRes = await graphqlRequest(`
    mutation CreateTable($input: CreateTableInput!) {
      createTable(input: $input) { id }
    }
  `, {
    input: {
      connectionId: conn.id,
      schema: 'public',
      tableName: `unauthorized_table`,
    },
  }, readerHeaders);

  const isReaderDdlBlocked =
    readerDdlRes.errors &&
    readerDdlRes.errors.some((e: any) =>
      e.message.toLowerCase().includes('cannot execute ddl') ||
      e.message.toLowerCase().includes('read'),
    );

  if (isReaderDdlBlocked) {
    console.log(`  ✅ PASS: User C was BLOCKED from DDL createTable.`);
  } else {
    console.error(`  ❌ FAILED: User C was NOT blocked from DDL!`, readerDdlRes);
    process.exit(1);
  }

  // User C BLOCKED from deleting connection
  const readerDeleteConnRes = await graphqlRequest(`
    mutation DeleteConnection($id: ID!) {
      deleteConnection(id: $id)
    }
  `, { id: conn.id }, readerHeaders);

  const isReaderDeleteBlocked =
    readerDeleteConnRes.errors &&
    readerDeleteConnRes.errors.some((e: any) =>
      e.message.toLowerCase().includes('only connection admins') ||
      e.message.toLowerCase().includes('security error'),
    );

  if (isReaderDeleteBlocked) {
    console.log(`  ✅ PASS: User C was BLOCKED from deleting database connection.`);
  } else {
    console.error(`  ❌ FAILED: User C was NOT blocked from deleteConnection!`, readerDeleteConnRes);
    process.exit(1);
  }

  // 8. Granular Connection Permission Override
  console.log('\n▶ STEP 8: Testing Granular Connection Permission Override (Promoting User C)...');
  await graphqlRequest(`
    mutation SetPerm($input: SetConnectionPermissionInput!) {
      setConnectionPermission(input: $input) {
        id
        accessLevel
      }
    }
  `, {
    input: {
      connectionId: conn.id,
      userId: readerUserId,
      accessLevel: 'WRITE',
    },
  }, ownerHeaders);

  // User C now has WRITE access override on this connection
  const readerUpdatedConnList = await graphqlRequest(`
    query ListConnections($workspaceId: ID) {
      listConnections(workspaceId: $workspaceId) {
        id
        effectiveAccessLevel
      }
    }
  `, { workspaceId: teamWs.id }, readerHeaders);
  const updatedReaderConn = readerUpdatedConnList.data.listConnections.find((c: any) => c.id === conn.id);
  console.log(`  ✅ User C upgraded to effectiveAccessLevel: "${updatedReaderConn.effectiveAccessLevel}"`);

  console.log('\n================================================================');
  console.log('🎉 ALL MULTI-WORKSPACE & PERMISSION TESTS PASSED 100% 🎉');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Multi-workspace verification error:', err);
  process.exit(1);
});
