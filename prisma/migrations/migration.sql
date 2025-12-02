-- ============================================
-- Wander Wallet - Authentication Migration
-- ============================================
-- 此文件包含完整的資料庫結構，可直接在 PostgreSQL 中執行
-- 執行方式: psql -U your_user -d your_database -f migration.sql
-- 或使用 Prisma: npx prisma migrate deploy
-- ============================================

-- 啟用 UUID 擴展（如果尚未啟用）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 表: users (用戶表)
-- ============================================
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "name" TEXT,
    "password" TEXT, -- 加密後的密碼，OAuth 用戶為 NULL
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- 用戶表索引
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- ============================================
-- 表: accounts (OAuth 帳號表)
-- ============================================
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- OAuth 帳號表索引
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_key" 
    ON "accounts"("provider", "provider_account_id");

-- 外鍵約束
ALTER TABLE "accounts" 
    ADD CONSTRAINT "accounts_user_id_fkey" 
    FOREIGN KEY ("user_id") 
    REFERENCES "users"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- ============================================
-- 表: sessions (會話表)
-- ============================================
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- 會話表索引
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_session_token_key" 
    ON "sessions"("session_token");

-- 外鍵約束
ALTER TABLE "sessions" 
    ADD CONSTRAINT "sessions_user_id_fkey" 
    FOREIGN KEY ("user_id") 
    REFERENCES "users"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- ============================================
-- 表: verification_tokens (驗證令牌表)
-- ============================================
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- 驗證令牌表索引
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" 
    ON "verification_tokens"("token");

CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" 
    ON "verification_tokens"("identifier", "token");

-- ============================================
-- 觸發器: 自動更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為 users 表添加 updated_at 自動更新觸發器
DROP TRIGGER IF EXISTS update_users_updated_at ON "users";
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成
-- ============================================
-- Migration 完成！
-- 現在你可以：
-- 1. 使用 Prisma Client 連接資料庫
-- 2. 開始實作註冊和登入功能
-- ============================================

