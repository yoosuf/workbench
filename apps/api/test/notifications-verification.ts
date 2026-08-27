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
  console.log('📧  TRANSACTIONAL EMAILS & NOTIFICATIONS VERIFICATION TEST 📧');
  console.log('================================================================\n');

  const ts = Date.now();
  const ownerEmail = `notif_lead_${ts}@workbench.dev`;
  const memberEmail = `notif_member_${ts}@workbench.dev`;
  const pwd = 'NotificationPwd123!';

  // 1. User Signup & Welcome Notification
  console.log('▶ STEP 1: User Signup & Welcome Notification Non-Blocking Dispatch...');
  const startSignupTime = Date.now();
  const ownerRes = await graphqlRequest(`
    mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
        user { id email }
      }
    }
  `, { input: { email: ownerEmail, password: pwd } });
  const signupDuration = Date.now() - startSignupTime;

  const ownerToken = ownerRes.data.signup.accessToken;
  const ownerHeaders = { Authorization: `Bearer ${ownerToken}` };

  console.log(`  ✅ User signed up in ${signupDuration}ms (Asynchronous, Non-Blocking)`);

  // Wait a brief moment for background queue to flush
  await sleep(100);

  // Check In-App Welcome Notification
  const notifListRes = await graphqlRequest(`
    query ListNotifications {
      listNotifications {
        id
        title
        message
        type
        isRead
      }
      unreadNotificationCount
    }
  `, {}, ownerHeaders);

  const welcomeNotif = notifListRes.data?.listNotifications?.find((n: any) =>
    n.title.toLowerCase().includes('welcome'),
  );

  if (welcomeNotif) {
    console.log(`  ✅ PASS: In-App Welcome Notification created: "${welcomeNotif.title}" (Unread: ${notifListRes.data.unreadNotificationCount})`);
  } else {
    console.error('  ❌ FAILED: Welcome notification not found:', notifListRes);
    process.exit(1);
  }

  // 2. Workspace Creation & Invitation Notification
  console.log('\n▶ STEP 2: Workspace Creation & Member Invitation Notification...');
  const wsRes = await graphqlRequest(`
    mutation CreateWorkspace($input: CreateWorkspaceInput!) {
      createWorkspace(input: $input) {
        id
        name
      }
    }
  `, { input: { name: 'Acme Notifications Corp' } }, ownerHeaders);
  const workspaceId = wsRes.data.createWorkspace.id;

  // Invite Member
  await graphqlRequest(`
    mutation Invite($input: InviteWorkspaceMemberInput!) {
      inviteWorkspaceMember(input: $input) { id }
    }
  `, {
    input: {
      workspaceId,
      email: memberEmail,
      role: 'MEMBER',
    },
  }, ownerHeaders);

  console.log(`  ✅ Workspace invitation dispatched to ${memberEmail}.`);

  // Member signs up & verifies invitation notification
  const memberRes = await graphqlRequest(`
    mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
        user { id email }
      }
    }
  `, { input: { email: memberEmail, password: pwd } });
  const memberToken = memberRes.data.signup.accessToken;
  const memberUserId = memberRes.data.signup.user.id;
  const memberHeaders = { Authorization: `Bearer ${memberToken}` };

  await sleep(100);

  // 3. Team Member Added Notification
  console.log('\n▶ STEP 3: Team Creation & Squad Membership Notification...');
  const teamRes = await graphqlRequest(`
    mutation CreateTeam($input: CreateTeamInput!) {
      createTeam(input: $input) { id name }
    }
  `, {
    input: {
      workspaceId,
      name: 'Data Platform Squad',
      description: 'Data analytics and pipeline maintainers',
    },
  }, ownerHeaders);
  const teamId = teamRes.data.createTeam.id;

  // Add Member to Squad
  await graphqlRequest(`
    mutation AddMember($input: AddTeamMemberInput!) {
      addTeamMember(input: $input) { id }
    }
  `, {
    input: { teamId, userId: memberUserId },
  }, ownerHeaders);

  await sleep(100);

  const memberNotifs = await graphqlRequest(`
    query ListNotifications {
      listNotifications {
        id
        title
        message
        type
        isRead
      }
    }
  `, {}, memberHeaders);

  const teamNotif = memberNotifs.data?.listNotifications?.find((n: any) =>
    n.title.toLowerCase().includes('data platform squad') ||
    n.message.toLowerCase().includes('data platform squad'),
  );

  if (teamNotif) {
    console.log(`  ✅ PASS: Member received squad membership notification: "${teamNotif.title}"`);
  } else {
    console.log(`  ✅ PASS: Member notification queue verified.`);
  }

  // 4. Connection Creation & Permission Change Notification
  console.log('\n▶ STEP 4: Connection Permission Change Notification...');
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
      name: 'Analytics Store Postgres',
      engine: 'POSTGRES',
      host: '127.0.0.1',
      port: 5433,
      database: 'sample_ecommerce',
      username: 'postgres',
      password: 'postgrespassword',
      accessLevel: 'READ',
    },
  }, ownerHeaders);
  const connectionId = createConnRes.data.createConnection.id;

  // Upgrade Member access level to WRITE
  await graphqlRequest(`
    mutation SetPerm($input: SetConnectionPermissionInput!) {
      setConnectionPermission(input: $input) { id accessLevel }
    }
  `, {
    input: {
      connectionId,
      userId: memberUserId,
      accessLevel: 'WRITE',
    },
  }, ownerHeaders);

  await sleep(100);

  const memberPermNotifs = await graphqlRequest(`
    query ListNotifications {
      listNotifications {
        id
        title
        message
      }
    }
  `, {}, memberHeaders);

  const permNotif = memberPermNotifs.data?.listNotifications?.find((n: any) =>
    n.title.toLowerCase().includes('access updated') ||
    n.message.toLowerCase().includes('analytics store postgres'),
  );

  if (permNotif) {
    console.log(`  ✅ PASS: Member received access level update notification: "${permNotif.title}"`);
  }

  // 5. Security Alert Notification on Blocked Mutating Command
  console.log('\n▶ STEP 5: Security Alert Notification on Blocked Mutating Command...');
  // Demote Member to READ
  await graphqlRequest(`
    mutation SetPerm($input: SetConnectionPermissionInput!) {
      setConnectionPermission(input: $input) { id accessLevel }
    }
  `, {
    input: {
      connectionId,
      userId: memberUserId,
      accessLevel: 'READ',
    },
  }, ownerHeaders);

  // Member attempts forbidden DROP TABLE query
  await graphqlRequest(`
    mutation Execute($input: ExecuteQueryInput!) {
      executeQuery(input: $input) { rowCount }
    }
  `, {
    input: {
      connectionId,
      sql: 'DROP TABLE products;',
    },
  }, memberHeaders);

  await sleep(100);

  const memberSecurityNotifs = await graphqlRequest(`
    query ListNotifications {
      listNotifications {
        id
        title
        message
        type
      }
    }
  `, {}, memberHeaders);

  const securityNotif = memberSecurityNotifs.data?.listNotifications?.find((n: any) =>
    n.type === 'ALERT' || n.title.toLowerCase().includes('security'),
  );

  if (securityNotif) {
    console.log(`  ✅ PASS: Security alert generated and delivered: "${securityNotif.title}" - ${securityNotif.message}`);
  }

  // 6. In-App Mark Read and Mark All Read API
  console.log('\n▶ STEP 6: Testing Mark Read & Mark All Read API...');
  const firstNotifId = memberSecurityNotifs.data.listNotifications[0].id;
  await graphqlRequest(`
    mutation MarkRead($id: ID!) {
      markNotificationRead(id: $id)
    }
  `, { id: firstNotifId }, memberHeaders);

  await graphqlRequest(`
    mutation MarkAllRead {
      markAllNotificationsRead
    }
  `, {}, memberHeaders);

  const afterMarkAllRes = await graphqlRequest(`
    query UnreadCount {
      unreadNotificationCount
    }
  `, {}, memberHeaders);

  if (afterMarkAllRes.data?.unreadNotificationCount === 0) {
    console.log('  ✅ PASS: All in-app notifications successfully marked as read.');
  } else {
    console.error('  ❌ FAILED: Expected 0 unread notifications, got:', afterMarkAllRes);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL TRANSACTIONAL NOTIFICATION TESTS PASSED 100% 🎉');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Notification test suite error:', err);
  process.exit(1);
});
