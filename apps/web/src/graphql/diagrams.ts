import { gql } from '@apollo/client';

export const GENERATE_DIAGRAM_MUTATION = gql`
  mutation GenerateDiagram($input: GenerateDiagramInput!) {
    generateDiagram(input: $input) {
      id
      connectionId
      name
      schema
      createdAt
      updatedAt
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
    }
  }
`;

export const GET_DIAGRAM_QUERY = gql`
  query GetDiagram($id: ID!) {
    diagram(id: $id) {
      id
      connectionId
      name
      schema
      createdAt
      updatedAt
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
    }
  }
`;

export const LIST_DIAGRAMS_QUERY = gql`
  query ListDiagrams($connectionId: ID!) {
    listDiagrams(connectionId: $connectionId) {
      id
      connectionId
      name
      createdAt
      updatedAt
    }
  }
`;

export const SAVE_DIAGRAM_LAYOUT_MUTATION = gql`
  mutation SaveDiagramLayout($input: SaveDiagramLayoutInput!) {
    saveDiagramLayout(input: $input)
  }
`;

export const DELETE_DIAGRAM_MUTATION = gql`
  mutation DeleteDiagram($id: ID!) {
    deleteDiagram(id: $id)
  }
`;
