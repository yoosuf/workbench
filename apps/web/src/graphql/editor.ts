import { gql } from '@apollo/client';

export const EXECUTE_QUERY_MUTATION = gql`
  mutation ExecuteQuery($input: ExecuteQueryInput!) {
    executeQuery(input: $input) {
      columns
      rows
      rowCount
      executionTimeMs
      truncated
    }
  }
`;

export const QUERY_HISTORY_QUERY = gql`
  query GetQueryHistory($connectionId: ID!, $limit: Int) {
    queryHistory(connectionId: $connectionId, limit: $limit) {
      id
      connectionId
      sql
      executedAt
      durationMs
      rowCount
      success
      errorMessage
    }
  }
`;

export const SAVE_QUERY_MUTATION = gql`
  mutation SaveQuery($input: SaveQueryInput!) {
    saveQuery(input: $input) {
      id
      connectionId
      name
      sql
      createdAt
    }
  }
`;

export const LIST_SAVED_QUERIES_QUERY = gql`
  query ListSavedQueries($connectionId: ID!) {
    listSavedQueries(connectionId: $connectionId) {
      id
      connectionId
      name
      sql
      createdAt
    }
  }
`;

export const DELETE_SAVED_QUERY_MUTATION = gql`
  mutation DeleteSavedQuery($id: ID!) {
    deleteSavedQuery(id: $id)
  }
`;
