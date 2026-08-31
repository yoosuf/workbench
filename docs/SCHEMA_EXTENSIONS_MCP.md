/**
 * Prisma Schema Extensions for MCP Agent Support
 * 
 * Add these models to apps/api/prisma/schema.prisma
 */

// ============= COPY BELOW INTO schema.prisma =============

model Agent {
  id String @id @default(cuid())
  
  // Agent Identity
  name String @db.VarChar(255)
  description String? @db.Text
  type String @db.VarChar(50) // 'claude', 'gpt4', 'custom', etc.
  
  // Authentication
  api_key String @unique @db.VarChar(255)
  api_key_hash String @db.VarChar(255)
  
  // Workspace Association
  workspace_id String
  workspace Workspace @relation(fields: [workspace_id], references: [id], onDelete: Cascade)
  
  // Status
  is_active Boolean @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  last_activity DateTime?
  
  // Relations
  actions AgentAction[]
  
  @@index([workspace_id])
  @@index([api_key_hash])
  @@fulltext([name, description]) // For MySQL full-text search
}

model AgentAction {
  id String @id @default(cuid())
  
  // Agent Reference
  agent_id String
  agent Agent @relation(fields: [agent_id], references: [id], onDelete: Cascade)
  
  // Action Details
  action String @db.VarChar(255) // 'get_schema', 'execute_query', 'create_table', etc.
  status String @default("pending") @db.VarChar(50) // 'pending', 'success', 'error'
  
  // Input/Output
  parameters Json? // Input parameters as JSON
  result Json? // Result data as JSON
  error_message String? @db.Text
  
  // Performance Metrics
  execution_time_ms Int?
  
  // Audit
  workspace_id String
  workspace Workspace @relation(fields: [workspace_id], references: [id], onDelete: Cascade)
  created_at DateTime @default(now())
  completed_at DateTime?
  
  // Relations
  tool_calls AgentToolCall[]
  
  @@index([agent_id])
  @@index([workspace_id])
  @@index([status])
  @@index([created_at])
}

model AgentToolCall {
  id String @id @default(cuid())
  
  // Parent Action
  agent_action_id String
  agent_action AgentAction @relation(fields: [agent_action_id], references: [id], onDelete: Cascade)
  
  // Tool Invocation
  tool_name String @db.VarChar(255) // 'execute_query', 'get_schema', etc.
  tool_input Json // Input to the tool
  tool_output Json? // Output from the tool
  
  // Sequencing (for tracking tool-use loops)
  sequence Int
  
  // Audit
  created_at DateTime @default(now())
  
  @@index([agent_action_id])
  @@unique([agent_action_id, sequence]) // One call per sequence per action
}

// Extend existing Workspace model
// Add this relation to the Workspace model:
// agents Agent[]

// Extend existing User model if needed for agent permissions
// Add this field to User model:
// agents_managed Agent[] // Users who can manage these agents

// ============= END COPY =============

/**
 * Migration Command:
 * 
 * 1. Add the schema above to apps/api/prisma/schema.prisma
 * 2. Run:
 *    pnpm db:migrate
 *    Name your migration: "add-mcp-agent-support"
 * 3. Regenerate Prisma client:
 *    pnpm db:generate
 */
