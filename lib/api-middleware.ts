import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, AuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ApiResponse, ApiErrorResponse, ApiSuccessResponse } from "@/lib/api-response"
import type { Project, ProjectMember } from "@prisma/client"

/**
 * 認證 context
 */
export interface AuthContext {
  user: AuthUser
  req: NextRequest
}

/**
 * 專案成員 context
 */
export interface ProjectContext extends AuthContext {
  projectId: string
  membership: ProjectMember
}

/**
 * 專案創建者 context
 */
export interface CreatorContext extends ProjectContext {
  project: Project
}

/**
 * 認證處理器類型
 */
export type AuthHandler<T = unknown> = (
  ctx: AuthContext
) => Promise<NextResponse<ApiSuccessResponse<T> | ApiErrorResponse>>

/**
 * 專案成員處理器類型
 */
export type ProjectMemberHandler<T = unknown> = (
  ctx: ProjectContext
) => Promise<NextResponse<ApiSuccessResponse<T> | ApiErrorResponse>>

/**
 * 專案創建者處理器類型
 */
export type ProjectCreatorHandler<T = unknown> = (
  ctx: CreatorContext
) => Promise<NextResponse<ApiSuccessResponse<T> | ApiErrorResponse>>

/**
 * 用認證檢查包裝路由處理器
 * @param handler - 處理器函數
 * @returns 包裝後的路由處理器
 */
export function withAuth<T>(
  handler: AuthHandler<T>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    const user = await getAuthUser(req)

    if (!user) {
      return ApiResponse.unauthorized()
    }

    return handler({ user, req })
  }
}

/**
 * 成員權限檢查結果
 */
export type MemberCheckResult =
  | { success: true; member: ProjectMember }
  | { success: false; error: NextResponse<ApiErrorResponse> }

/**
 * 檢查使用者是否為專案成員
 * @param projectId - 專案 ID
 * @param userId - 使用者 ID
 */
export async function requireProjectMember(
  projectId: string,
  userId: string
): Promise<MemberCheckResult> {
  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
  })

  if (!membership) {
    return {
      success: false,
      error: ApiResponse.forbidden("無權限訪問此專案"),
    }
  }

  return { success: true, member: membership }
}

/**
 * 創建者權限檢查結果
 */
export type CreatorCheckResult =
  | { success: true; project: Project; member: ProjectMember }
  | { success: false; error: NextResponse<ApiErrorResponse> }

/**
 * 檢查使用者是否為專案創建者
 * @param projectId - 專案 ID
 * @param userId - 使用者 ID
 */
export async function requireProjectCreator(
  projectId: string,
  userId: string
): Promise<CreatorCheckResult> {
  // 先查詢專案
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    return {
      success: false,
      error: ApiResponse.notFound("專案"),
    }
  }

  // 檢查是否為創建者
  if (project.createdBy !== userId) {
    return {
      success: false,
      error: ApiResponse.forbidden("只有創建者可以執行此操作"),
    }
  }

  // 取得成員資格
  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
  })

  if (!membership) {
    return {
      success: false,
      error: ApiResponse.forbidden("無權限訪問此專案"),
    }
  }

  return { success: true, project, member: membership }
}

/**
 * 用認證 + 成員檢查包裝路由處理器
 * @param handler - 處理器函數
 * @returns 包裝後的路由處理器
 */
export function withProjectMember<T>(
  handler: ProjectMemberHandler<T>
): (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => Promise<NextResponse> {
  return async (
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> => {
    // 認證檢查
    const user = await getAuthUser(req)

    if (!user) {
      return ApiResponse.unauthorized()
    }

    // 取得專案 ID
    const { id: projectId } = await context.params

    // 成員權限檢查
    const memberCheck = await requireProjectMember(projectId, user.id)

    if (!memberCheck.success) {
      return memberCheck.error
    }

    return handler({
      user,
      req,
      projectId,
      membership: memberCheck.member,
    })
  }
}

/**
 * 用認證 + 創建者檢查包裝路由處理器
 * @param handler - 處理器函數
 * @returns 包裝後的路由處理器
 */
export function withProjectCreator<T>(
  handler: ProjectCreatorHandler<T>
): (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => Promise<NextResponse> {
  return async (
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> => {
    // 認證檢查
    const user = await getAuthUser(req)

    if (!user) {
      return ApiResponse.unauthorized()
    }

    // 取得專案 ID
    const { id: projectId } = await context.params

    // 創建者權限檢查
    const creatorCheck = await requireProjectCreator(projectId, user.id)

    if (!creatorCheck.success) {
      return creatorCheck.error
    }

    return handler({
      user,
      req,
      projectId,
      membership: creatorCheck.member,
      project: creatorCheck.project,
    })
  }
}

/**
 * 檢查使用者是否存在於資料庫
 * @param userId - 使用者 ID
 */
export async function requireUserExists(
  userId: string
): Promise<{ success: true } | { success: false; error: NextResponse<ApiErrorResponse> }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return {
      success: false,
      error: ApiResponse.unauthorized("用戶不存在", true),
    }
  }

  return { success: true }
}
