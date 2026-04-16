import { PrismaClient, Prisma } from '@prisma/client'
import { encryptPII, decryptPII } from './crypto/pii-encryption'
import { hashEmail } from './crypto/email-hash'

// ---------------------------------------------------------------------------
// PII encryption extension
// ---------------------------------------------------------------------------
// Automatically encrypts sensitive fields on write and decrypts on read
// for Identity (email, name) and IntelligenceLog (input, output, reasoning).
//
// Identity.email uses non-deterministic AES-256-GCM, so a companion
// emailHash column (HMAC-SHA256) is populated on every write for
// deterministic lookups. All `where: { email }` queries must be
// changed to `where: { emailHash: hashEmail(email) }` at call sites.
//
// Migration-safe: decryptPII returns plaintext unchanged if the value
// isn't prefixed with "pii:", so rows written before encryption was
// enabled still read correctly.
// ---------------------------------------------------------------------------

/**
 * Encrypt Identity PII fields in a Prisma data payload. Handles both
 * top-level `data` and nested `create`/`update` inside relations.
 */
function encryptIdentityData(data: Record<string, unknown>): void {
  if (data.email != null && typeof data.email === 'string') {
    const h = hashEmail(data.email)
    if (h) data.emailHash = h
    data.email = encryptPII(data.email)
  }
  if (data.name != null && typeof data.name === 'string') {
    data.name = encryptPII(data.name)
  }
}

/**
 * Decrypt Identity PII fields on a result row (or array of rows).
 */
function decryptIdentityResult<T>(result: T): T {
  if (!result) return result
  if (Array.isArray(result)) {
    for (const row of result) decryptIdentityRow(row)
    return result
  }
  decryptIdentityRow(result as Record<string, unknown>)
  return result
}

function decryptIdentityRow(row: Record<string, unknown>): void {
  if (row.email != null && typeof row.email === 'string') {
    row.email = decryptPII(row.email)
  }
  if (row.name != null && typeof row.name === 'string') {
    row.name = decryptPII(row.name)
  }
}

/**
 * Encrypt IntelligenceLog PII fields.
 */
function encryptIntelligenceLogData(data: Record<string, unknown>): void {
  if (data.input != null && typeof data.input === 'string') {
    data.input = encryptPII(data.input)
  }
  if (data.output != null && typeof data.output === 'string') {
    data.output = encryptPII(data.output)
  }
  if (data.reasoning != null && typeof data.reasoning === 'string') {
    data.reasoning = encryptPII(data.reasoning)
  }
}

function decryptIntelligenceLogResult<T>(result: T): T {
  if (!result) return result
  if (Array.isArray(result)) {
    for (const row of result) decryptIntelligenceLogRow(row)
    return result
  }
  decryptIntelligenceLogRow(result as Record<string, unknown>)
  return result
}

function decryptIntelligenceLogRow(row: Record<string, unknown>): void {
  if (row.input != null && typeof row.input === 'string') {
    row.input = decryptPII(row.input)
  }
  if (row.output != null && typeof row.output === 'string') {
    row.output = decryptPII(row.output)
  }
  if (row.reasoning != null && typeof row.reasoning === 'string') {
    row.reasoning = decryptPII(row.reasoning)
  }
}

// ---------------------------------------------------------------------------
// Prisma client with PII extension
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? [] : ['query'],
  })

  return base.$extends({
    query: {
      identity: {
        async create({ args, query }) {
          encryptIdentityData(args.data as Record<string, unknown>)
          const result = await query(args)
          return decryptIdentityResult(result)
        },
        async createMany({ args, query }) {
          const dataArr = Array.isArray(args.data) ? args.data : [args.data]
          for (const d of dataArr) encryptIdentityData(d as Record<string, unknown>)
          return query(args)
        },
        async update({ args, query }) {
          if (args.data) encryptIdentityData(args.data as Record<string, unknown>)
          const result = await query(args)
          return decryptIdentityResult(result)
        },
        async updateMany({ args, query }) {
          if (args.data) encryptIdentityData(args.data as Record<string, unknown>)
          return query(args)
        },
        async upsert({ args, query }) {
          encryptIdentityData(args.create as Record<string, unknown>)
          if (args.update) encryptIdentityData(args.update as Record<string, unknown>)
          const result = await query(args)
          return decryptIdentityResult(result)
        },
        async findUnique({ args, query }) {
          const result = await query(args)
          return decryptIdentityResult(result)
        },
        async findUniqueOrThrow({ args, query }) {
          const result = await query(args)
          return decryptIdentityResult(result)
        },
        async findFirst({ args, query }) {
          const result = await query(args)
          return decryptIdentityResult(result)
        },
        async findMany({ args, query }) {
          const result = await query(args)
          return decryptIdentityResult(result)
        },
      },

      intelligenceLog: {
        async create({ args, query }) {
          encryptIntelligenceLogData(args.data as Record<string, unknown>)
          const result = await query(args)
          return decryptIntelligenceLogResult(result)
        },
        async createMany({ args, query }) {
          const dataArr = Array.isArray(args.data) ? args.data : [args.data]
          for (const d of dataArr) encryptIntelligenceLogData(d as Record<string, unknown>)
          return query(args)
        },
        async update({ args, query }) {
          if (args.data) encryptIntelligenceLogData(args.data as Record<string, unknown>)
          const result = await query(args)
          return decryptIntelligenceLogResult(result)
        },
        async findUnique({ args, query }) {
          const result = await query(args)
          return decryptIntelligenceLogResult(result)
        },
        async findFirst({ args, query }) {
          const result = await query(args)
          return decryptIntelligenceLogResult(result)
        },
        async findMany({ args, query }) {
          const result = await query(args)
          return decryptIntelligenceLogResult(result)
        },
      },
    },
  })
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
