import { GraphQLClient } from 'graphql-request';

/**
 * Thin wrapper around the Workbench GraphQL API. The MCP server authenticates as a real
 * Workbench user (a JWT obtained via the `login` mutation, same as the web app) so every
 * request goes through the API's existing permission checks — the MCP layer does not
 * duplicate or bypass authorization.
 */
export class WorkbenchGraphQLClient {
  private client: GraphQLClient;

  constructor(apiUrl: string, authToken: string) {
    this.client = new GraphQLClient(apiUrl, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
  }

  async request<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.client.request<T>(query, variables);
  }
}
