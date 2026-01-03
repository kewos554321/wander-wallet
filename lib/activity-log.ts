import { prisma } from "@/lib/db"
import { Prisma, type Prisma as PrismaTypes } from "@prisma/client"

export type EntityType = "expense" | "project" | "member"
export type ActionType = "create" | "update" | "delete"

export type ChangesRecord = Record<string, { from: unknown; to: unknown }>

// 費用實體的 metadata
export interface ExpenseMetadata {
  description?: string | null
  amount?: number
  category?: string | null
  payerName?: string
  expenseDate?: string
}

// 通用 metadata 類型
export type EntityMetadata = ExpenseMetadata | Record<string, unknown>

export interface ActivityLogData {
  projectId: string
  actorMemberId: string | null
  entityType: EntityType
  entityId: string
  action: ActionType
  changes?: ChangesRecord | null
  metadata?: EntityMetadata | null
}

/**
 * 將 changes 轉換為 Prisma 可接受的 JSON 格式
 */
function toJsonValue(changes: ChangesRecord | null | undefined): PrismaTypes.InputJsonValue | typeof Prisma.JsonNull {
  if (!changes) {
    return Prisma.JsonNull
  }
  return changes as unknown as PrismaTypes.InputJsonValue
}

/**
 * 建立操作歷史紀錄
 */
export async function createActivityLog(data: ActivityLogData) {
  return prisma.activityLog.create({
    data: {
      projectId: data.projectId,
      actorMemberId: data.actorMemberId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      changes: toJsonValue(data.changes),
      metadata: toJsonValue(data.metadata as ChangesRecord | null | undefined),
    },
  })
}

/**
 * 在 transaction 中建立操作歷史紀錄
 */
export async function createActivityLogInTransaction(
  tx: Prisma.TransactionClient,
  data: ActivityLogData
) {
  return tx.activityLog.create({
    data: {
      projectId: data.projectId,
      actorMemberId: data.actorMemberId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      changes: toJsonValue(data.changes),
      metadata: toJsonValue(data.metadata as ChangesRecord | null | undefined),
    },
  })
}

/**
 * 比較兩個物件的差異，返回變更紀錄
 */
export function diffChanges<T extends Record<string, unknown>>(
  oldData: T,
  newData: Partial<T>,
  fieldsToCompare: (keyof T)[]
): Record<string, { from: unknown; to: unknown }> | null {
  const changes: Record<string, { from: unknown; to: unknown }> = {}

  for (const field of fieldsToCompare) {
    if (field in newData) {
      const oldValue = oldData[field]
      const newValue = newData[field]

      // 處理 Decimal 轉換為數字比較
      const normalizedOld = normalizeValue(oldValue)
      const normalizedNew = normalizeValue(newValue)

      if (normalizedOld !== normalizedNew) {
        changes[field as string] = {
          from: normalizedOld,
          to: normalizedNew,
        }
      }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null
}

/**
 * 正規化值以便比較（處理 Decimal、Date 等特殊類型）
 */
function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null
  }

  // Prisma Decimal
  if (typeof value === "object" && "toNumber" in (value as object)) {
    return (value as { toNumber: () => number }).toNumber()
  }

  // Date
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value
}

/**
 * 獲取專案的操作歷史紀錄
 */
export async function getActivityLogs(
  projectId: string,
  options?: {
    entityType?: EntityType
    entityId?: string
    limit?: number
    offset?: number
  }
) {
  const where: Prisma.ActivityLogWhereInput = {
    projectId,
  }

  if (options?.entityType) {
    where.entityType = options.entityType
  }

  if (options?.entityId) {
    where.entityId = options.entityId
  }

  return prisma.activityLog.findMany({
    where,
    include: {
      actor: {
        select: {
          id: true,
          displayName: true,
          user: {
            select: {
              image: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })
}
