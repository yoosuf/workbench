import { gql } from '@apollo/client';

export const LIST_CONNECTIONS_QUERY = gql`
  query ListConnections {
    listConnections {
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
`;

export const CONNECTION_QUERY = gql`
  query GetConnection($id: ID!) {
    connection(id: $id) {
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
`;

export const TEST_CONNECTION_MUTATION = gql`
  mutation TestConnection($input: TestConnectionInput!) {
    testConnection(input: $input) {
      success
      message
      latencyMs
    }
  }
`;

export const TEST_SAVED_CONNECTION_MUTATION = gql`
  mutation TestSavedConnection($id: ID!) {
    testSavedConnection(id: $id) {
      success
      message
      latencyMs
    }
  }
`;

export const CREATE_CONNECTION_MUTATION = gql`
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
`;

export const DELETE_CONNECTION_MUTATION = gql`
  mutation DeleteConnection($id: ID!) {
    deleteConnection(id: $id)
  }
`;
