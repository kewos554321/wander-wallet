# 範例庫 (Reference Styles)

此檔案包含程式碼範例，當 Claude 表現不如預期時可作為 Few-shot 參考。

## 共用元件範例

### ConfirmDeleteDialog

位置: `components/ui/confirm-delete-dialog.tsx`

```tsx
interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string           // Default: "確認刪除"
  description: string
  onConfirm: () => void
  loading?: boolean        // Default: false
  confirmText?: string     // Default: "刪除"
  children?: React.ReactNode
}
```

**使用方式:**
```tsx
<ConfirmDeleteDialog
  open={showDeleteDialog}
  onOpenChange={setShowDeleteDialog}
  description="確定要刪除這筆支出嗎？此操作無法復原。"
  onConfirm={handleDelete}
  loading={deleting}
>
  {/* Optional children for extra content like LINE notification checkbox */}
</ConfirmDeleteDialog>
```

**使用位置:**
- `app/projects/[id]/expenses/page.tsx` - Single and batch expense delete
- `app/projects/[id]/settings/page.tsx` - Project delete
- `components/expense/expense-form.tsx` - Edit page expense delete

## 資料結構範例

### ParsedReceipt Interface

```typescript
interface ParsedReceipt {
  amount: number        // Total amount
  description: string   // Merchant name or item description
  category: ExpenseCategory
  date: string | null   // YYYY-MM-DD format
  confidence: number    // 0-1
}
```
