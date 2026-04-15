-- CreateTable
CREATE TABLE "Identity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "authId" TEXT,
    "emailVerifiedAt" DATETIME,
    "emailVerifyToken" TEXT,
    "emailVerifyTokenExpiresAt" DATETIME,
    "passwordResetTokenHash" TEXT,
    "passwordResetTokenExpiresAt" DATETIME,
    "onboardedAt" DATETIME,
    "avatar" TEXT,
    "description" TEXT,
    "metadata" TEXT,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    CONSTRAINT "Session_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "settings" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "brandName" TEXT,
    "brandColor" TEXT,
    "brandLogo" TEXT,
    "brandTone" TEXT,
    "brandAudience" TEXT,
    "brandValues" TEXT,
    "brandKeywords" TEXT,
    "brandVoiceDont" TEXT,
    "brandBio" TEXT,
    "tokenBudget" INTEGER,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "budgetResetAt" DATETIME,
    "anthropicKeyEnc" TEXT,
    "anthropicKeyPreview" TEXT,
    "anthropicKeyAddedAt" DATETIME,
    "anthropicKeySource" TEXT,
    "deletedAt" DATETIME,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "Environment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Identity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnvironmentMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    CONSTRAINT "EnvironmentMembership_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EnvironmentMembership_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "System" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "config" TEXT,
    "metrics" TEXT,
    "healthScore" REAL,
    "deletedAt" DATETIME,
    "environmentId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "System_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "System_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT,
    "currentStage" INTEGER,
    "completedAt" DATETIME,
    "systemId" TEXT NOT NULL,
    "workflowId" TEXT,
    CONSTRAINT "Execution_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Execution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValidationResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" REAL NOT NULL,
    "issues" TEXT,
    "correctedOutput" TEXT,
    "executionId" TEXT NOT NULL,
    CONSTRAINT "ValidationResult_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "updatedAt" DATETIME NOT NULL,
    "healthScore" REAL,
    "activeWorkflows" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" DATETIME,
    "systemId" TEXT NOT NULL,
    CONSTRAINT "SystemState_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "config" TEXT,
    "stages" TEXT NOT NULL,
    "nodes" TEXT,
    "edges" TEXT,
    "deletedAt" DATETIME,
    "systemId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "Workflow_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Workflow_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Workflow_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Intelligence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "systemId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "Intelligence_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Intelligence_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Intelligence_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntelligenceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "input" TEXT,
    "output" TEXT,
    "reasoning" TEXT,
    "tokens" INTEGER,
    "cost" REAL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "intelligenceId" TEXT NOT NULL,
    "systemId" TEXT,
    "workflowId" TEXT,
    "identityId" TEXT,
    CONSTRAINT "IntelligenceLog_intelligenceId_fkey" FOREIGN KEY ("intelligenceId") REFERENCES "Intelligence" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IntelligenceLog_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IntelligenceLog_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IntelligenceLog_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "secret" TEXT,
    "environmentId" TEXT,
    CONSTRAINT "Webhook_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "duration" INTEGER,
    "webhookId" TEXT NOT NULL,
    CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL,
    "description" TEXT,
    "stages" TEXT NOT NULL,
    "nodes" TEXT,
    "edges" TEXT,
    "workflowId" TEXT NOT NULL,
    CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" DATETIME,
    "expiresAt" DATETIME,
    "environmentId" TEXT,
    "identityId" TEXT,
    CONSTRAINT "ApiKey_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApiKey_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "entityName" TEXT,
    "before" TEXT,
    "after" TEXT,
    "metadata" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorType" TEXT,
    "environmentId" TEXT,
    "environmentName" TEXT
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metric" TEXT,
    "target" TEXT,
    "current" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ON_TRACK',
    "dueDate" DATETIME,
    "progress" REAL,
    "systemId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "Goal_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "systemId" TEXT,
    "workflowId" TEXT,
    "environmentId" TEXT NOT NULL,
    "novaRouting" TEXT,
    "novaTriaged" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Signal_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Signal_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Signal_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT,
    "promptTemplate" TEXT NOT NULL,
    "inputsSchema" TEXT,
    "model" TEXT,
    "schedule" TEXT DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastRunAt" DATETIME,
    "deletedAt" DATETIME,
    "environmentId" TEXT NOT NULL,
    "systemId" TEXT,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "Agent_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Agent_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Agent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentHandoff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "callerId" TEXT NOT NULL,
    "calleeId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "condition" TEXT,
    "passContext" BOOLEAN NOT NULL DEFAULT true,
    "passMemory" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AgentHandoff_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentHandoff_calleeId_fkey" FOREIGN KEY ("calleeId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL,
    "resolvedPrompt" TEXT NOT NULL,
    "inputs" TEXT,
    "outputText" TEXT,
    "tokens" INTEGER,
    "cost" REAL,
    "error" TEXT,
    "toolCalls" TEXT,
    "conversationState" TEXT,
    "iterationsUsed" INTEGER NOT NULL DEFAULT 0,
    "agentId" TEXT NOT NULL,
    CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PendingAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    "executedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "toolUseId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "toolInput" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "resultJson" TEXT,
    "error" TEXT,
    "decidedById" TEXT,
    "decisionReason" TEXT,
    "runId" TEXT NOT NULL,
    CONSTRAINT "PendingAction_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentOutputBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "index" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "editedAt" DATETIME,
    "editedById" TEXT,
    "runId" TEXT NOT NULL,
    CONSTRAINT "AgentOutputBlock_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "accountLabel" TEXT,
    "authType" TEXT NOT NULL,
    "credentialsEnc" TEXT NOT NULL,
    "credentialsPreview" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "expiresAt" DATETIME,
    "scopes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" DATETIME,
    "lastError" TEXT,
    "lastErrorAt" DATETIME,
    "deletedAt" DATETIME,
    "environmentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Integration_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "position" INTEGER NOT NULL DEFAULT 0,
    "labels" TEXT,
    "parentId" TEXT,
    "environmentId" TEXT NOT NULL,
    "systemId" TEXT,
    "creatorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Identity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "body" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "identityId" TEXT NOT NULL,
    CONSTRAINT "Notification_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Identity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortalLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "showSystems" BOOLEAN NOT NULL DEFAULT true,
    "showWorkflows" BOOLEAN NOT NULL DEFAULT true,
    "showGoals" BOOLEAN NOT NULL DEFAULT true,
    "showExecutions" BOOLEAN NOT NULL DEFAULT false,
    "customTitle" TEXT,
    "environmentId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "PortalLink_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodStart" DATETIME,
    "currentPeriodEnd" DATETIME,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "identityId" TEXT NOT NULL,
    CONSTRAINT "Subscription_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metric" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "period" DATETIME NOT NULL,
    "identityId" TEXT NOT NULL,
    CONSTRAINT "UsageRecord_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "content" TEXT NOT NULL DEFAULT '',
    "icon" TEXT,
    "coverImage" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "environmentId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "trigger" TEXT NOT NULL,
    "triggerConfig" TEXT NOT NULL DEFAULT '{}',
    "nodes" TEXT NOT NULL DEFAULT '[]',
    "edges" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "environmentId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "lastRunAt" DATETIME,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Automation_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Automation_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "fields" TEXT NOT NULL DEFAULT '[]',
    "settings" TEXT NOT NULL DEFAULT '{}',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Form_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Form_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL DEFAULT 'uncategorized',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "environmentId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "spent" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "category" TEXT NOT NULL DEFAULT 'general',
    "environmentId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Budget_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Budget_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "category" TEXT NOT NULL DEFAULT 'other',
    "vendor" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "receipt" TEXT,
    "notes" TEXT,
    "budgetId" TEXT,
    "identityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "items" TEXT NOT NULL DEFAULT '[]',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "paidAt" DATETIME,
    "notes" TEXT,
    "environmentId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "requesterId" TEXT NOT NULL,
    "steps" TEXT NOT NULL DEFAULT '[]',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "environmentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL DEFAULT '',
    "duration" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "hourlyRate" REAL,
    "taskId" TEXT,
    "environmentId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NovaMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0.8,
    "environmentId" TEXT,
    "systemId" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "NovaReflection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "insight" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "metric" TEXT,
    "metricValue" REAL,
    "metricDelta" REAL,
    "confidence" REAL NOT NULL DEFAULT 0.7,
    "environmentId" TEXT NOT NULL,
    "systemId" TEXT,
    "workflowId" TEXT,
    "suggestion" TEXT,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "actionTaken" TEXT
);

-- CreateTable
CREATE TABLE "ConsequenceLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "impact" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT,
    "lagTime" TEXT,
    "environmentId" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0.7
);

-- CreateTable
CREATE TABLE "AutonomyConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "scopeLabel" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "totalActions" INTEGER NOT NULL DEFAULT 0,
    "approvedActions" INTEGER NOT NULL DEFAULT 0,
    "overriddenActions" INTEGER NOT NULL DEFAULT 0,
    "approvalRate" REAL NOT NULL DEFAULT 0,
    "recommendedLevel" INTEGER,
    "recommendReason" TEXT,
    "environmentId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CrossDomainInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "confidence" REAL NOT NULL DEFAULT 0.6,
    "sourceDomains" TEXT NOT NULL,
    "targetDomains" TEXT NOT NULL,
    "evidence" TEXT,
    "dataPoints" INTEGER NOT NULL DEFAULT 0,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "actionTaken" TEXT,
    "resolvedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "Identity_email_key" ON "Identity"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_authId_key" ON "Identity"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_emailVerifyToken_key" ON "Identity"("emailVerifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_passwordResetTokenHash_key" ON "Identity"("passwordResetTokenHash");

-- CreateIndex
CREATE INDEX "Identity_email_idx" ON "Identity"("email");

-- CreateIndex
CREATE INDEX "Identity_type_idx" ON "Identity"("type");

-- CreateIndex
CREATE INDEX "Identity_authId_idx" ON "Identity"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Environment_slug_key" ON "Environment"("slug");

-- CreateIndex
CREATE INDEX "Environment_ownerId_idx" ON "Environment"("ownerId");

-- CreateIndex
CREATE INDEX "Environment_slug_idx" ON "Environment"("slug");

-- CreateIndex
CREATE INDEX "EnvironmentMembership_environmentId_idx" ON "EnvironmentMembership"("environmentId");

-- CreateIndex
CREATE INDEX "EnvironmentMembership_identityId_idx" ON "EnvironmentMembership"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX "EnvironmentMembership_environmentId_identityId_key" ON "EnvironmentMembership"("environmentId", "identityId");

-- CreateIndex
CREATE INDEX "System_environmentId_idx" ON "System"("environmentId");

-- CreateIndex
CREATE INDEX "System_creatorId_idx" ON "System"("creatorId");

-- CreateIndex
CREATE INDEX "Execution_systemId_idx" ON "Execution"("systemId");

-- CreateIndex
CREATE INDEX "Execution_status_idx" ON "Execution"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationResult_executionId_key" ON "ValidationResult"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemState_systemId_key" ON "SystemState"("systemId");

-- CreateIndex
CREATE INDEX "Workflow_systemId_idx" ON "Workflow"("systemId");

-- CreateIndex
CREATE INDEX "Workflow_environmentId_idx" ON "Workflow"("environmentId");

-- CreateIndex
CREATE INDEX "Workflow_status_idx" ON "Workflow"("status");

-- CreateIndex
CREATE INDEX "Intelligence_systemId_idx" ON "Intelligence"("systemId");

-- CreateIndex
CREATE INDEX "Intelligence_environmentId_idx" ON "Intelligence"("environmentId");

-- CreateIndex
CREATE INDEX "Intelligence_type_idx" ON "Intelligence"("type");

-- CreateIndex
CREATE INDEX "Intelligence_isActive_idx" ON "Intelligence"("isActive");

-- CreateIndex
CREATE INDEX "IntelligenceLog_intelligenceId_idx" ON "IntelligenceLog"("intelligenceId");

-- CreateIndex
CREATE INDEX "IntelligenceLog_createdAt_idx" ON "IntelligenceLog"("createdAt");

-- CreateIndex
CREATE INDEX "IntelligenceLog_success_idx" ON "IntelligenceLog"("success");

-- CreateIndex
CREATE INDEX "Webhook_environmentId_idx" ON "Webhook"("environmentId");

-- CreateIndex
CREATE INDEX "Webhook_isActive_idx" ON "Webhook"("isActive");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

-- CreateIndex
CREATE INDEX "WorkflowVersion_workflowId_idx" ON "WorkflowVersion"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowVersion_createdAt_idx" ON "WorkflowVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_environmentId_idx" ON "AuditLog"("environmentId");

-- CreateIndex
CREATE INDEX "Goal_systemId_idx" ON "Goal"("systemId");

-- CreateIndex
CREATE INDEX "Goal_environmentId_idx" ON "Goal"("environmentId");

-- CreateIndex
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- CreateIndex
CREATE INDEX "Signal_environmentId_idx" ON "Signal"("environmentId");

-- CreateIndex
CREATE INDEX "Signal_systemId_idx" ON "Signal"("systemId");

-- CreateIndex
CREATE INDEX "Signal_status_idx" ON "Signal"("status");

-- CreateIndex
CREATE INDEX "Signal_priority_idx" ON "Signal"("priority");

-- CreateIndex
CREATE INDEX "Signal_createdAt_idx" ON "Signal"("createdAt");

-- CreateIndex
CREATE INDEX "Agent_environmentId_idx" ON "Agent"("environmentId");

-- CreateIndex
CREATE INDEX "Agent_systemId_idx" ON "Agent"("systemId");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "Agent_creatorId_idx" ON "Agent"("creatorId");

-- CreateIndex
CREATE INDEX "AgentHandoff_callerId_idx" ON "AgentHandoff"("callerId");

-- CreateIndex
CREATE INDEX "AgentHandoff_calleeId_idx" ON "AgentHandoff"("calleeId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentHandoff_callerId_calleeId_key" ON "AgentHandoff"("callerId", "calleeId");

-- CreateIndex
CREATE INDEX "AgentRun_agentId_idx" ON "AgentRun"("agentId");

-- CreateIndex
CREATE INDEX "AgentRun_status_idx" ON "AgentRun"("status");

-- CreateIndex
CREATE INDEX "AgentRun_createdAt_idx" ON "AgentRun"("createdAt");

-- CreateIndex
CREATE INDEX "PendingAction_runId_idx" ON "PendingAction"("runId");

-- CreateIndex
CREATE INDEX "PendingAction_status_idx" ON "PendingAction"("status");

-- CreateIndex
CREATE INDEX "AgentOutputBlock_runId_idx" ON "AgentOutputBlock"("runId");

-- CreateIndex
CREATE INDEX "AgentOutputBlock_runId_index_idx" ON "AgentOutputBlock"("runId", "index");

-- CreateIndex
CREATE INDEX "Integration_environmentId_idx" ON "Integration"("environmentId");

-- CreateIndex
CREATE INDEX "Integration_provider_idx" ON "Integration"("provider");

-- CreateIndex
CREATE INDEX "Integration_status_idx" ON "Integration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_environmentId_provider_accountLabel_key" ON "Integration"("environmentId", "provider", "accountLabel");

-- CreateIndex
CREATE INDEX "Task_environmentId_idx" ON "Task"("environmentId");

-- CreateIndex
CREATE INDEX "Task_systemId_idx" ON "Task"("systemId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE INDEX "Task_creatorId_idx" ON "Task"("creatorId");

-- CreateIndex
CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "Task"("priority");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");

-- CreateIndex
CREATE INDEX "TaskComment_createdAt_idx" ON "TaskComment"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_identityId_idx" ON "Notification"("identityId");

-- CreateIndex
CREATE INDEX "Notification_identityId_read_idx" ON "Notification"("identityId", "read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_entityType_entityId_idx" ON "Comment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortalLink_token_key" ON "PortalLink"("token");

-- CreateIndex
CREATE INDEX "PortalLink_token_idx" ON "PortalLink"("token");

-- CreateIndex
CREATE INDEX "PortalLink_environmentId_idx" ON "PortalLink"("environmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_identityId_key" ON "Subscription"("identityId");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "UsageRecord_identityId_idx" ON "UsageRecord"("identityId");

-- CreateIndex
CREATE INDEX "UsageRecord_period_idx" ON "UsageRecord"("period");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_identityId_metric_period_key" ON "UsageRecord"("identityId", "metric", "period");

-- CreateIndex
CREATE INDEX "Document_environmentId_idx" ON "Document"("environmentId");

-- CreateIndex
CREATE INDEX "Document_parentId_idx" ON "Document"("parentId");

-- CreateIndex
CREATE INDEX "Automation_environmentId_idx" ON "Automation"("environmentId");

-- CreateIndex
CREATE INDEX "Automation_identityId_idx" ON "Automation"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX "Form_slug_key" ON "Form"("slug");

-- CreateIndex
CREATE INDEX "Form_environmentId_idx" ON "Form"("environmentId");

-- CreateIndex
CREATE INDEX "Form_identityId_idx" ON "Form"("identityId");

-- CreateIndex
CREATE INDEX "Form_slug_idx" ON "Form"("slug");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_idx" ON "FormSubmission"("formId");

-- CreateIndex
CREATE INDEX "FormSubmission_createdAt_idx" ON "FormSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "Attachment_entityType_entityId_idx" ON "Attachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Attachment_identityId_idx" ON "Attachment"("identityId");

-- CreateIndex
CREATE INDEX "Asset_environmentId_idx" ON "Asset"("environmentId");

-- CreateIndex
CREATE INDEX "Asset_identityId_idx" ON "Asset"("identityId");

-- CreateIndex
CREATE INDEX "Asset_parentId_idx" ON "Asset"("parentId");

-- CreateIndex
CREATE INDEX "Asset_category_idx" ON "Asset"("category");

-- CreateIndex
CREATE INDEX "Budget_environmentId_idx" ON "Budget"("environmentId");

-- CreateIndex
CREATE INDEX "Budget_identityId_idx" ON "Budget"("identityId");

-- CreateIndex
CREATE INDEX "Expense_budgetId_idx" ON "Expense"("budgetId");

-- CreateIndex
CREATE INDEX "Expense_identityId_idx" ON "Expense"("identityId");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_environmentId_idx" ON "Invoice"("environmentId");

-- CreateIndex
CREATE INDEX "Invoice_identityId_idx" ON "Invoice"("identityId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_environmentId_idx" ON "ApprovalRequest"("environmentId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requesterId_idx" ON "ApprovalRequest"("requesterId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_entityType_idx" ON "ApprovalRequest"("entityType");

-- CreateIndex
CREATE INDEX "TimeEntry_identityId_idx" ON "TimeEntry"("identityId");

-- CreateIndex
CREATE INDEX "TimeEntry_environmentId_idx" ON "TimeEntry"("environmentId");

-- CreateIndex
CREATE INDEX "TimeEntry_taskId_idx" ON "TimeEntry"("taskId");

-- CreateIndex
CREATE INDEX "TimeEntry_date_idx" ON "TimeEntry"("date");

-- CreateIndex
CREATE INDEX "NovaMemory_type_idx" ON "NovaMemory"("type");

-- CreateIndex
CREATE INDEX "NovaMemory_environmentId_idx" ON "NovaMemory"("environmentId");

-- CreateIndex
CREATE INDEX "NovaMemory_systemId_idx" ON "NovaMemory"("systemId");

-- CreateIndex
CREATE INDEX "NovaMemory_isActive_idx" ON "NovaMemory"("isActive");

-- CreateIndex
CREATE INDEX "NovaMemory_confidence_idx" ON "NovaMemory"("confidence");

-- CreateIndex
CREATE INDEX "NovaMemory_createdAt_idx" ON "NovaMemory"("createdAt");

-- CreateIndex
CREATE INDEX "NovaReflection_environmentId_idx" ON "NovaReflection"("environmentId");

-- CreateIndex
CREATE INDEX "NovaReflection_category_idx" ON "NovaReflection"("category");

-- CreateIndex
CREATE INDEX "NovaReflection_severity_idx" ON "NovaReflection"("severity");

-- CreateIndex
CREATE INDEX "NovaReflection_createdAt_idx" ON "NovaReflection"("createdAt");

-- CreateIndex
CREATE INDEX "ConsequenceLink_sourceType_sourceId_idx" ON "ConsequenceLink"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ConsequenceLink_targetType_targetId_idx" ON "ConsequenceLink"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ConsequenceLink_environmentId_idx" ON "ConsequenceLink"("environmentId");

-- CreateIndex
CREATE INDEX "AutonomyConfig_environmentId_idx" ON "AutonomyConfig"("environmentId");

-- CreateIndex
CREATE INDEX "AutonomyConfig_level_idx" ON "AutonomyConfig"("level");

-- CreateIndex
CREATE UNIQUE INDEX "AutonomyConfig_scopeType_scopeId_key" ON "AutonomyConfig"("scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "CrossDomainInsight_category_idx" ON "CrossDomainInsight"("category");

-- CreateIndex
CREATE INDEX "CrossDomainInsight_severity_idx" ON "CrossDomainInsight"("severity");

-- CreateIndex
CREATE INDEX "CrossDomainInsight_createdAt_idx" ON "CrossDomainInsight"("createdAt");

