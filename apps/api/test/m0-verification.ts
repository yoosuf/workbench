import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function runM0Verification() {
  console.log('🚀 Starting Universal DB Workbench - M0 Verification Suite...\n');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(4001);

  const baseUrl = 'http://localhost:4001/graphql';

  async function gql(query: string, variables: any = {}, token?: string, cookie?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const setCookie = res.headers.get('set-cookie');
    const json = await res.json();
    return { status: res.status, json, setCookie };
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check (Public query)
    console.log('1. Testing Public Health Query...');
    const healthRes = await gql('query { health }');
    assert(
      typeof healthRes.json?.data?.health === 'string' && healthRes.json.data.health.startsWith('OK'),
      'Public health query returned OK status',
    );

    // 2. Unauthenticated 'me' query (should fail with Unauthorized)
    console.log('\n2. Testing GqlAuthGuard on Protected Query...');
    const unauthRes = await gql('query { me { id email } }');
    assert(
      unauthRes.json?.errors?.[0]?.message === 'Unauthorized',
      'Unauthenticated request to protected query correctly rejected by GqlAuthGuard',
    );

    // 3. User Signup Mutation
    console.log('\n3. Testing User Registration Mutation...');
    const testEmail = `test_admin_${Date.now()}@workbench.local`;
    const signupRes = await gql(
      `
      mutation Signup($input: SignupInput!) {
        signup(input: $input) {
          accessToken
          user {
            id
            email
            createdAt
          }
        }
      }
    `,
      { input: { email: testEmail, password: 'SecurePassword123!' } },
    );

    const signupData = signupRes.json?.data?.signup;
    assert(!!signupData?.accessToken, 'Signup returned valid JWT access token');
    assert(signupData?.user?.email === testEmail, 'Signup returned correct user email');
    assert(
      !!signupRes.setCookie && signupRes.setCookie.includes('workbench_refresh_token'),
      'Signup set httpOnly refresh token cookie',
    );

    const accessToken = signupData.accessToken;
    const cookie = signupRes.setCookie || '';

    // 4. Authenticated 'me' query
    console.log('\n4. Testing Authenticated Query Resolution...');
    const authMeRes = await gql('query { me { id email } }', {}, accessToken);
    assert(
      authMeRes.json?.data?.me?.email === testEmail,
      'Authenticated "me" query returned current user details from JWT strategy',
    );

    // 5. User Login Mutation
    console.log('\n5. Testing User Login Mutation...');
    const loginRes = await gql(
      `
      mutation Login($input: LoginInput!) {
        login(input: $input) {
          accessToken
          user {
            id
            email
          }
        }
      }
    `,
      { input: { email: testEmail, password: 'SecurePassword123!' } },
    );

    assert(!!loginRes.json?.data?.login?.accessToken, 'Login successfully authenticated user');

    // 6. Token Refresh via httpOnly Cookie
    console.log('\n6. Testing Token Refresh Mutation...');
    const refreshRes = await gql(
      `
      mutation RefreshToken {
        refreshToken {
          accessToken
          user {
            email
          }
        }
      }
    `,
      {},
      undefined,
      cookie,
    );

    assert(
      !!refreshRes.json?.data?.refreshToken?.accessToken,
      'Refresh mutation generated new access token using httpOnly cookie',
    );

    // 7. Logout Mutation
    console.log('\n7. Testing Logout Mutation...');
    const logoutRes = await gql('mutation { logout }');
    assert(logoutRes.json?.data?.logout === true, 'Logout successfully cleared session');

    console.log(`\n========================================`);
    console.log(`M0 Verification Summary: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    await app.close();

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Verification failed with error:', err);
    await app.close();
    process.exit(1);
  }
}

runM0Verification();
