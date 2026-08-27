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
  console.log('👥  WORKSPACE TEAMS & MULTI-TEAM PERMISSIONS VERIFICATION 👥');
  console.log('================================================================\n');

  const ts = Date.now();
  const ownerEmail = `org_lead_${ts}@workbench.dev`;
  const devEmail = `dev_${ts}@workbench.dev`;
  const analystEmail = `analyst_${ts}@workbench.dev`;
  const pwd = 'TeamPassword123!';

  // 1. Signup Users
  console.log('▶ STEP 1: Creating Org Lead, Backend Dev, and Data Analyst accounts...');
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

  const devRes = await graphqlRequest(`
    mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
        user { id email }
      }
    }
  `, { input: { email: devEmail, password: pwd } });
  const devToken = devRes.data.signup.accessToken;
  const devUserId = devRes.data.signup.user.id;
  const devHeaders = { Authorization: `Bearer ${devToken}` };

  const analystRes = await graphqlRequest(`
    mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
        user { id email }
      }
    }
  `, { input: { email: analystEmail, password: pwd } });
  const analystToken = analystRes.data.signup.accessToken;
  const analystUserId = analystRes.data.signup.user.id;
  const analystHeaders = { Authorization: `Bearer ${analystToken}` };

  console.log('  ✅ Accounts created.');

  // 2. Create Workspace
  console.log('\n▶ STEP 2: Creating "Acme Cloud Platform" Workspace...');
  const wsRes = await graphqlRequest(`
    mutation CreateWorkspace($input: CreateWorkspaceInput!) {
      createWorkspace(input: $input) {
        id
        name
      }
    }
  `, { input: { name: 'Acme Cloud Platform' } }, ownerHeaders);
  const workspaceId = wsRes.data.createWorkspace.id;
  console.log(`  ✅ Workspace created: ID ${workspaceId}`);

  // 3. Invite Members as READONLY by default
  console.log('\n▶ STEP 3: Inviting Members to Workspace with READONLY base role...');
  await graphqlRequest(`
    mutation Invite($input: InviteWorkspaceMemberInput!) {
      inviteWorkspaceMember(input: $input) { id }
    }
  `, { input: { workspaceId, email: devEmail, role: 'READONLY' } }, ownerHeaders);

  await graphqlRequest(`
    mutation Invite($input: InviteWorkspaceMemberInput!) {
      inviteWorkspaceMember(input: $input) { id }
    }
  `, { input: { workspaceId, email: analystEmail, role: 'READONLY' } }, ownerHeaders);
  console.log('  ✅ Members invited.');

  // 4. Create Teams (@backend-engineers and @data-analysts)
  console.log('\n▶ STEP 4: Creating Teams in Workspace...');
  const backendTeamRes = await graphqlRequest(`
    mutation CreateTeam($input: CreateTeamInput!) {
      createTeam(input: $input) {
        id
        name
        slug
      }
    }
  `, { input: { workspaceId, name: 'Backend Engineers', description: 'Core API and DB devs' } }, ownerHeaders);
  const backendTeamId = backendTeamRes.data.createTeam.id;

  const analystTeamRes = await graphqlRequest(`
    mutation CreateTeam($input: CreateTeamInput!) {
      createTeam(input: $input) {
        id
        name
        slug
      }
    }
  `, { input: { workspaceId, name: 'Data Analysts', description: 'BI and Analytics squad' } }, ownerHeaders);
  const analystTeamId = analystTeamRes.data.createTeam.id;
  console.log(`  ✅ Created teams: @Backend Engineers (${backendTeamId}) and @Data Analysts (${analystTeamId})`);

  // 5. Add Members to Teams
  console.log('\n▶ STEP 5: Adding Members to Squads...');
  await graphqlRequest(`
    mutation AddMember($input: AddTeamMemberInput!) {
      addTeamMember(input: $input) { id }
    }
  `, { input: { teamId: backendTeamId, userId: devUserId } }, ownerHeaders);

  await graphqlRequest(`
    mutation AddMember($input: AddTeamMemberInput!) {
      addTeamMember(input: $input) { id }
    }
  `, { input: { teamId: analystTeamId, userId: analystUserId } }, ownerHeaders);
  console.log('  ✅ Dev added to Backend Engineers; Analyst added to Data Analysts.');

  // 6. Create Database Connection in Workspace
  console.log('\n▶ STEP 6: Creating Database Connection...');
  const createConnRes = await graphqlRequest(`
    mutation CreateConnection($input: CreateConnectionInput!) {
      createConnection(input: $input) {
        id
        name
      }
    }
  `, {
    input: {
      workspaceId,
      name: 'Production Core DB',
      engine: 'POSTGRES',
      host: '127.0.0.1',
      port: 5433,
      database: 'sample_ecommerce',
      username: 'postgres',
      password: 'postgrespassword',
      accessLevel: 'READ',
    },
  }, ownerHeaders);
  const connId = createConnRes.data.createConnection.id;
  console.log(`  ✅ Connection created: ID ${connId}`);

  // 7. Assign Team Permissions to Connection
  console.log('\n▶ STEP 7: Granting Connection Permissions to Teams...');
  await graphqlRequest(`
    mutation SetTeamPerm($input: SetTeamConnectionPermissionInput!) {
      setTeamConnectionPermission(input: $input) {
        id
        accessLevel
      }
    }
  `, {
    input: {
      connectionId: connId,
      teamId: backendTeamId,
      accessLevel: 'WRITE',
    },
  }, ownerHeaders);

  await graphqlRequest(`
    mutation SetTeamPerm($input: SetTeamConnectionPermissionInput!) {
      setTeamConnectionPermission(input: $input) {
        id
        accessLevel
      }
    }
  `, {
    input: {
      connectionId: connId,
      teamId: analystTeamId,
      accessLevel: 'READ',
    },
  }, ownerHeaders);
  console.log('  ✅ Backend Engineers granted WRITE; Data Analysts granted READ.');

  // 8. Verify Dev Inherited WRITE access from Team
  console.log('\n▶ STEP 8: Verifying Backend Dev inherits WRITE permission...');
  const devConnList = await graphqlRequest(`
    query ListConnections($workspaceId: ID) {
      listConnections(workspaceId: $workspaceId) {
        id
        effectiveAccessLevel
      }
    }
  `, { workspaceId }, devHeaders);
  const devConn = devConnList.data.listConnections.find((c: any) => c.id === connId);
  if (devConn?.effectiveAccessLevel === 'WRITE') {
    console.log(`  ✅ PASS: Dev inherited "WRITE" permission from @Backend Engineers team.`);
  } else {
    console.error(`  ❌ FAILED: Dev expected WRITE, got: ${devConn?.effectiveAccessLevel}`);
    process.exit(1);
  }

  // 9. Verify Analyst Inherited READ access from Team
  console.log('\n▶ STEP 9: Verifying Data Analyst inherits READ permission...');
  const analystConnList = await graphqlRequest(`
    query ListConnections($workspaceId: ID) {
      listConnections(workspaceId: $workspaceId) {
        id
        effectiveAccessLevel
      }
    }
  `, { workspaceId }, analystHeaders);
  const analystConn = analystConnList.data.listConnections.find((c: any) => c.id === connId);
  if (analystConn?.effectiveAccessLevel === 'READ') {
    console.log(`  ✅ PASS: Analyst inherited "READ" permission from @Data Analysts team.`);
  } else {
    console.error(`  ❌ FAILED: Analyst expected READ, got: ${analystConn?.effectiveAccessLevel}`);
    process.exit(1);
  }

  // 10. Multi-Team Inheritance: Add Analyst to Backend Engineers -> automatically upgrades to WRITE
  console.log('\n▶ STEP 10: Testing Multi-Team Inheritance (Adding Analyst to Backend Engineers)...');
  await graphqlRequest(`
    mutation AddMember($input: AddTeamMemberInput!) {
      addTeamMember(input: $input) { id }
    }
  `, { input: { teamId: backendTeamId, userId: analystUserId } }, ownerHeaders);

  const analystUpgradedConnList = await graphqlRequest(`
    query ListConnections($workspaceId: ID) {
      listConnections(workspaceId: $workspaceId) {
        id
        effectiveAccessLevel
      }
    }
  `, { workspaceId }, analystHeaders);
  const upgradedConn = analystUpgradedConnList.data.listConnections.find((c: any) => c.id === connId);
  if (upgradedConn?.effectiveAccessLevel === 'WRITE') {
    console.log(`  ✅ PASS: Analyst dynamically upgraded to highest team permission: "WRITE" (Inherited from @Backend Engineers).`);
  } else {
    console.error(`  ❌ FAILED: Analyst expected WRITE after joining team, got: ${upgradedConn?.effectiveAccessLevel}`);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL WORKSPACE TEAMS & PERMISSION TESTS PASSED 100% 🎉');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Teams verification error:', err);
  process.exit(1);
});
