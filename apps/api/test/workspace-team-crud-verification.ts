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
  console.log('🛠️  WORKSPACE & TEAM CRUD (EDIT, UPDATE, DELETE) TEST 🛠️');
  console.log('================================================================\n');

  const ts = Date.now();
  const ownerEmail = `lead_crud_${ts}@workbench.dev`;
  const memberEmail = `member_crud_${ts}@workbench.dev`;
  const pwd = 'CrudPassword123!';

  // 1. Signup Users
  console.log('▶ STEP 1: Creating Owner and Member accounts...');
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
  console.log('  ✅ Accounts created.');

  // 2. Create Workspace
  console.log('\n▶ STEP 2: Creating Workspace "Initial Alpha Workspace"...');
  const wsRes = await graphqlRequest(`
    mutation CreateWorkspace($input: CreateWorkspaceInput!) {
      createWorkspace(input: $input) {
        id
        name
      }
    }
  `, { input: { name: 'Initial Alpha Workspace' } }, ownerHeaders);
  const workspaceId = wsRes.data.createWorkspace.id;
  console.log(`  ✅ Workspace created: "${wsRes.data.createWorkspace.name}" (ID: ${workspaceId})`);

  // 3. Update / Rename Workspace
  console.log('\n▶ STEP 3: Renaming Workspace to "Renamed Enterprise Workspace"...');
  const updateWsRes = await graphqlRequest(`
    mutation UpdateWorkspace($input: UpdateWorkspaceInput!) {
      updateWorkspace(input: $input) {
        id
        name
      }
    }
  `, {
    input: {
      workspaceId,
      name: 'Renamed Enterprise Workspace',
    },
  }, ownerHeaders);

  if (updateWsRes.data?.updateWorkspace?.name === 'Renamed Enterprise Workspace') {
    console.log(`  ✅ PASS: Workspace successfully renamed to "${updateWsRes.data.updateWorkspace.name}".`);
  } else {
    console.error('  ❌ FAILED: Workspace rename failed:', updateWsRes);
    process.exit(1);
  }

  // 4. Invite Member
  console.log('\n▶ STEP 4: Inviting Member to Workspace...');
  await graphqlRequest(`
    mutation Invite($input: InviteWorkspaceMemberInput!) {
      inviteWorkspaceMember(input: $input) { id }
    }
  `, { input: { workspaceId, email: memberEmail, role: 'MEMBER' } }, ownerHeaders);
  console.log('  ✅ Member invited.');

  // 5. Create Team
  console.log('\n▶ STEP 5: Creating Team "Core Dev Squad"...');
  const createTeamRes = await graphqlRequest(`
    mutation CreateTeam($input: CreateTeamInput!) {
      createTeam(input: $input) {
        id
        name
        description
      }
    }
  `, {
    input: {
      workspaceId,
      name: 'Core Dev Squad',
      description: 'Initial team description',
    },
  }, ownerHeaders);
  const teamId = createTeamRes.data.createTeam.id;
  console.log(`  ✅ Team created: "${createTeamRes.data.createTeam.name}" (ID: ${teamId})`);

  // 6. Update Team
  console.log('\n▶ STEP 6: Updating Team name and description...');
  const updateTeamRes = await graphqlRequest(`
    mutation UpdateTeam($input: UpdateTeamInput!) {
      updateTeam(input: $input) {
        id
        name
        description
      }
    }
  `, {
    input: {
      workspaceId,
      teamId,
      name: 'Platform Infrastructure Squad',
      description: 'Updated description for cloud engineering squad',
    },
  }, ownerHeaders);

  if (
    updateTeamRes.data?.updateTeam?.name === 'Platform Infrastructure Squad' &&
    updateTeamRes.data?.updateTeam?.description === 'Updated description for cloud engineering squad'
  ) {
    console.log(`  ✅ PASS: Team updated to "${updateTeamRes.data.updateTeam.name}".`);
  } else {
    console.error('  ❌ FAILED: Team update failed:', updateTeamRes);
    process.exit(1);
  }

  // 7. Delete Team
  console.log('\n▶ STEP 7: Deleting Team...');
  const deleteTeamRes = await graphqlRequest(`
    mutation DeleteTeam($workspaceId: ID!, $teamId: ID!) {
      deleteTeam(workspaceId: $workspaceId, teamId: $teamId)
    }
  `, { workspaceId, teamId }, ownerHeaders);

  if (deleteTeamRes.data?.deleteTeam === true) {
    console.log('  ✅ PASS: Team deleted successfully.');
  } else {
    console.error('  ❌ FAILED: Team deletion failed:', deleteTeamRes);
    process.exit(1);
  }

  // Verify Team is Gone
  const listTeamsRes = await graphqlRequest(`
    query ListTeams($workspaceId: ID!) {
      listTeams(workspaceId: $workspaceId) { id }
    }
  `, { workspaceId }, ownerHeaders);
  if (listTeamsRes.data?.listTeams?.length === 0) {
    console.log('  ✅ PASS: Team confirmed removed from workspace.');
  }

  // 8. Non-Owner Attempts to Delete Workspace -> Must be Blocked
  console.log('\n▶ STEP 8: Verifying Non-Owner is BLOCKED from deleting workspace...');
  const memberDeleteWsRes = await graphqlRequest(`
    mutation DeleteWorkspace($workspaceId: ID!) {
      deleteWorkspace(workspaceId: $workspaceId)
    }
  `, { workspaceId }, memberHeaders);

  const isBlocked = memberDeleteWsRes.errors && memberDeleteWsRes.errors.some((e: any) =>
    e.message.toLowerCase().includes('only the workspace owner') ||
    e.message.toLowerCase().includes('forbidden')
  );

  if (isBlocked) {
    console.log('  ✅ PASS: Non-owner was BLOCKED from deleting workspace.');
  } else {
    console.error('  ❌ FAILED: Non-owner was not blocked from deleting workspace!', memberDeleteWsRes);
    process.exit(1);
  }

  // 9. Owner Deletes Workspace
  console.log('\n▶ STEP 9: Owner Deletes Workspace...');
  const ownerDeleteWsRes = await graphqlRequest(`
    mutation DeleteWorkspace($workspaceId: ID!) {
      deleteWorkspace(workspaceId: $workspaceId)
    }
  `, { workspaceId }, ownerHeaders);

  if (ownerDeleteWsRes.data?.deleteWorkspace === true) {
    console.log('  ✅ PASS: Owner deleted workspace successfully.');
  } else {
    console.error('  ❌ FAILED: Owner workspace deletion failed:', ownerDeleteWsRes);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL WORKSPACE & TEAM CRUD TESTS PASSED 100% 🎉');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Workspace & team CRUD test error:', err);
  process.exit(1);
});
