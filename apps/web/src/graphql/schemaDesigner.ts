import { gql } from '@apollo/client';

export const CREATE_TABLE_MUTATION = gql`
  mutation CreateTable($input: CreateTableInput!) {
    createTable(input: $input) {
      id
      connectionId
      name
      schema
      nodes {
        id
        tableName
        schema
        positionX
        positionY
        columns {
          name
          nativeType
          dataKind
          isPrimaryKey
          isForeignKey
        }
      }
      edges {
        id
        source
        sourceHandle
        target
        targetHandle
        relationName
        sourceColumn
        targetColumn
      }
      updatedAt
    }
  }
`;

export const ADD_COLUMN_MUTATION = gql`
  mutation AddColumn($input: AddColumnInput!) {
    addColumn(input: $input) {
      id
      connectionId
      name
      schema
      nodes {
        id
        tableName
        schema
        positionX
        positionY
        columns {
          name
          nativeType
          dataKind
          isPrimaryKey
          isForeignKey
        }
      }
      edges {
        id
        source
        sourceHandle
        target
        targetHandle
        relationName
        sourceColumn
        targetColumn
      }
      updatedAt
    }
  }
`;

export const ADD_FOREIGN_KEY_MUTATION = gql`
  mutation AddForeignKey($input: AddForeignKeyInput!) {
    addForeignKey(input: $input) {
      id
      connectionId
      name
      schema
      nodes {
        id
        tableName
        schema
        positionX
        positionY
        columns {
          name
          nativeType
          dataKind
          isPrimaryKey
          isForeignKey
        }
      }
      edges {
        id
        source
        sourceHandle
        target
        targetHandle
        relationName
        sourceColumn
        targetColumn
      }
      updatedAt
    }
  }
`;

export const DROP_TABLE_MUTATION = gql`
  mutation DropTable($input: DropTableInput!) {
    dropTable(input: $input) {
      id
      connectionId
      name
      schema
      nodes {
        id
        tableName
        schema
        positionX
        positionY
        columns {
          name
          nativeType
          dataKind
          isPrimaryKey
          isForeignKey
        }
      }
      edges {
        id
        source
        sourceHandle
        target
        targetHandle
        relationName
        sourceColumn
        targetColumn
      }
      updatedAt
    }
  }
`;
