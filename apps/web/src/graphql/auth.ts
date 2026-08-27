import { gql } from '@apollo/client';

export const HEALTH_QUERY = gql`
  query Health {
    health
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      createdAt
    }
  }
`;

export const SIGNUP_MUTATION = gql`
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
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        email
        createdAt
      }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken {
    refreshToken {
      accessToken
      user {
        id
        email
        createdAt
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;
