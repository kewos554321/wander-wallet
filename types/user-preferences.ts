// 用戶偏好設定類型定義

export interface NotificationPreferences {
  expenseCreated: boolean  // 新增支出通知
  expenseUpdated: boolean  // 更新支出通知
  expenseDeleted: boolean  // 刪除支出通知
}

export interface UserPreferences {
  defaultCurrency: string                    // 預設幣別，如 "TWD", "JPY"
  defaultSplitMode: "equal" | "custom"       // 預設分帳方式
  notifications: NotificationPreferences     // 通知設定
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultCurrency: "TWD",
  defaultSplitMode: "equal",
  notifications: {
    expenseCreated: true,
    expenseUpdated: true,
    expenseDeleted: true,
  },
}

// 合併用戶偏好與預設值
export function mergePreferences(
  userPrefs: Partial<UserPreferences> | null | undefined
): UserPreferences {
  if (!userPrefs) {
    return DEFAULT_PREFERENCES
  }

  return {
    defaultCurrency: userPrefs.defaultCurrency ?? DEFAULT_PREFERENCES.defaultCurrency,
    defaultSplitMode: userPrefs.defaultSplitMode ?? DEFAULT_PREFERENCES.defaultSplitMode,
    notifications: {
      expenseCreated: userPrefs.notifications?.expenseCreated ?? DEFAULT_PREFERENCES.notifications.expenseCreated,
      expenseUpdated: userPrefs.notifications?.expenseUpdated ?? DEFAULT_PREFERENCES.notifications.expenseUpdated,
      expenseDeleted: userPrefs.notifications?.expenseDeleted ?? DEFAULT_PREFERENCES.notifications.expenseDeleted,
    },
  }
}
