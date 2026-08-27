export enum FeatureFlagKey {
  EER_DIAGRAM_DESIGNER = 'EER_DIAGRAM_DESIGNER',
  SQL_QUERY_EXPORT = 'SQL_QUERY_EXPORT',
  TRANSACTIONAL_NOTIFICATIONS = 'TRANSACTIONAL_NOTIFICATIONS',
  TEAM_COLLABORATION = 'TEAM_COLLABORATION',
  CONNECTION_SSL_ENFORCEMENT = 'CONNECTION_SSL_ENFORCEMENT',
  AI_QUERY_ASSIST = 'AI_QUERY_ASSIST',
  TABLE_DATA_VIRTUALIZATION = 'TABLE_DATA_VIRTUALIZATION',
}

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  name: string;
  description: string;
  enabledByDefault: boolean;
  category: 'core' | 'security' | 'collaboration' | 'beta';
}

export const FEATURE_FLAG_REGISTRY: Record<FeatureFlagKey, FeatureFlagDefinition> = {
  [FeatureFlagKey.EER_DIAGRAM_DESIGNER]: {
    key: FeatureFlagKey.EER_DIAGRAM_DESIGNER,
    name: 'Visual EER Diagram Designer',
    description: 'Enables the interactive ER canvas, automatic table node positioning, and drag-and-drop FK relationship creation.',
    enabledByDefault: true,
    category: 'core',
  },
  [FeatureFlagKey.SQL_QUERY_EXPORT]: {
    key: FeatureFlagKey.SQL_QUERY_EXPORT,
    name: 'SQL Query Result Export',
    description: 'Enables exporting query execution results and table data to CSV and JSON formats.',
    enabledByDefault: true,
    category: 'core',
  },
  [FeatureFlagKey.TRANSACTIONAL_NOTIFICATIONS]: {
    key: FeatureFlagKey.TRANSACTIONAL_NOTIFICATIONS,
    name: 'Transactional Notifications & Emails',
    description: 'Enables multi-channel notification delivery (HTML email, webhooks, in-app notifications).',
    enabledByDefault: true,
    category: 'collaboration',
  },
  [FeatureFlagKey.TEAM_COLLABORATION]: {
    key: FeatureFlagKey.TEAM_COLLABORATION,
    name: 'Workspaces & Squads RBAC',
    description: 'Enables multi-workspace management, functional squads, and GitHub-style team permission inheritance.',
    enabledByDefault: true,
    category: 'collaboration',
  },
  [FeatureFlagKey.CONNECTION_SSL_ENFORCEMENT]: {
    key: FeatureFlagKey.CONNECTION_SSL_ENFORCEMENT,
    name: 'SSL/TLS Connection Enforcement',
    description: 'Enables TLS/SSL connection configuration for PostgreSQL and MySQL target databases.',
    enabledByDefault: true,
    category: 'security',
  },
  [FeatureFlagKey.AI_QUERY_ASSIST]: {
    key: FeatureFlagKey.AI_QUERY_ASSIST,
    name: 'AI SQL Query Assistant',
    description: 'Enables GenAI SQL generation, auto-complete suggestions, and query performance explanations.',
    enabledByDefault: false,
    category: 'beta',
  },
  [FeatureFlagKey.TABLE_DATA_VIRTUALIZATION]: {
    key: FeatureFlagKey.TABLE_DATA_VIRTUALIZATION,
    name: 'Virtualized Table Data Grid',
    description: 'Enables ultra-fast virtualized viewport rendering for large database tables.',
    enabledByDefault: true,
    category: 'core',
  },
};
