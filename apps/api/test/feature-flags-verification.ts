export {};

const GRAPHQL_URL = 'http://localhost:4000/graphql';

async function graphqlRequest(query: string, variables = {}) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function main() {
  console.log('================================================================');
  console.log('🚩  ENTERPRISE FEATURE FLAGS VERIFICATION TEST 🚩');
  console.log('================================================================\n');

  // 1. Query all feature flags
  console.log('▶ STEP 1: Querying all platform feature flags...');
  const flagsRes = await graphqlRequest(`
    query GetFeatureFlags {
      featureFlags {
        key
        name
        description
        enabled
        category
      }
    }
  `);

  const flags = flagsRes.data?.featureFlags;
  if (!flags || flags.length === 0) {
    console.error('  ❌ FAILED to retrieve feature flags:', flagsRes);
    process.exit(1);
  }

  console.log(`  ✅ Retrieved ${flags.length} registered feature flags.`);
  for (const flag of flags) {
    console.log(`     - [${flag.enabled ? 'ON' : 'OFF'}] ${flag.key} (${flag.category}) — ${flag.name}`);
  }

  // 2. Query individual feature status
  console.log('\n▶ STEP 2: Checking individual feature flag status...');
  const eerRes = await graphqlRequest(`
    query CheckFlag($key: String!) {
      isFeatureEnabled(key: $key)
    }
  `, { key: 'EER_DIAGRAM_DESIGNER' });

  const aiRes = await graphqlRequest(`
    query CheckFlag($key: String!) {
      isFeatureEnabled(key: $key)
    }
  `, { key: 'AI_QUERY_ASSIST' });

  if (eerRes.data?.isFeatureEnabled === true) {
    console.log('  ✅ PASS: EER_DIAGRAM_DESIGNER evaluated to TRUE (Default enabled)');
  } else {
    console.error('  ❌ FAILED: EER_DIAGRAM_DESIGNER should be enabled by default');
    process.exit(1);
  }

  if (aiRes.data?.isFeatureEnabled === false) {
    console.log('  ✅ PASS: AI_QUERY_ASSIST evaluated to FALSE (Beta disabled by default)');
  } else {
    console.error('  ❌ FAILED: AI_QUERY_ASSIST should be disabled by default');
    process.exit(1);
  }

  // 3. Dynamic Override Mutation
  console.log('\n▶ STEP 3: Testing dynamic runtime flag override mutation...');
  const toggleOnRes = await graphqlRequest(`
    mutation ToggleFlag($key: String!, $enabled: Boolean!) {
      setFeatureFlagOverride(key: $key, enabled: $enabled)
    }
  `, { key: 'AI_QUERY_ASSIST', enabled: true });

  if (toggleOnRes.data?.setFeatureFlagOverride === true) {
    console.log('  ✅ Override mutation executed successfully.');
  }

  const aiAfterOverrideRes = await graphqlRequest(`
    query CheckFlag($key: String!) {
      isFeatureEnabled(key: $key)
    }
  `, { key: 'AI_QUERY_ASSIST' });

  if (aiAfterOverrideRes.data?.isFeatureEnabled === true) {
    console.log('  ✅ PASS: AI_QUERY_ASSIST dynamically evaluated to TRUE after override.');
  } else {
    console.error('  ❌ FAILED: AI_QUERY_ASSIST should be TRUE after override');
    process.exit(1);
  }

  // Reset flag back
  await graphqlRequest(`
    mutation ToggleFlag($key: String!, $enabled: Boolean!) {
      setFeatureFlagOverride(key: $key, enabled: $enabled)
    }
  `, { key: 'AI_QUERY_ASSIST', enabled: false });

  console.log('\n================================================================');
  console.log('🎉 ALL FEATURE FLAG VERIFICATION TESTS PASSED 100% 🎉');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Feature flags test suite error:', err);
  process.exit(1);
});
