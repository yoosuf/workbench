import { gql } from '@apollo/client';

export const CONNECTION_SCHEMAS_QUERY = gql`
  query GetConnectionSchemas($connectionId: ID!) {
    connectionSchemas(connectionId: $connectionId) {
      name
    }
  }
`;

export const SCHEMA_TABLES_QUERY = gql`
  query GetSchemaTables($connectionId: ID!, $schema: String!) {
    schemaTables(connectionId: $connectionId, schema: $schema) {
      name
      kind
      schema
    }
  }
`;

export const TABLE_DETAILS_QUERY = gql`
  query GetTableDetails($connectionId: ID!, $schema: String!, $table: String!) {
    tableDetails(connectionId: $connectionId, schema: $schema, table: $table) {
      name
      kind
      schema
      primaryKey
      columns {
        name
        nativeType
        dataKind
        nullable
        defaultValue
        isAutoIncrement
        ordinalPosition
        isPrimaryKey
        isForeignKey
      }
      foreignKeys {
        name
        columns
        referencedTable
        referencedColumns
        onDelete
        onUpdate
      }
      indexes {
        name
        columns
        isUnique
        type
      }
    }
  }
`;

export const CREATE_SCHEMA_MUTATION = gql`
  mutation CreateSchema($input: CreateSchemaInput!) {
    createSchema(input: $input) {
      name
      connectionId
    }
  }
`;

export const DROP_SCHEMA_MUTATION = gql`
  mutation DropSchema($input: DropSchemaInput!) {
    dropSchema(input: $input)
  }
`;

export const DATABASE_USERS_QUERY = gql`
  query GetDatabaseUsers($connectionId: ID!) {
    databaseUsers(connectionId: $connectionId) {
      username
      isSuperuser
      host
    }
  }
`;

export const SCHEMA_PERMISSIONS_QUERY = gql`
  query GetSchemaPermissions($connectionId: ID!, $schema: String!) {
    schemaPermissions(connectionId: $connectionId, schema: $schema) {
      grantee
      privilege
      isGrantable
    }
  }
`;

export const GRANT_SCHEMA_PERMISSION_MUTATION = gql`
  mutation GrantSchemaPermission($input: GrantSchemaPermissionInput!) {
    grantSchemaPermission(input: $input)
  }
`;

export const REVOKE_SCHEMA_PERMISSION_MUTATION = gql`
  mutation RevokeSchemaPermission($input: RevokeSchemaPermissionInput!) {
    revokeSchemaPermission(input: $input)
  }
`;
