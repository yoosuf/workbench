import { gql } from '@apollo/client';

export const TABLE_DATA_QUERY = gql`
  query GetTableData($input: TableDataInput!) {
    tableData(input: $input) {
      columns
      rows
      rowCount
      totalCount
      limit
      offset
      sortColumn
      sortOrder
      executionTimeMs
      truncated
    }
  }
`;
