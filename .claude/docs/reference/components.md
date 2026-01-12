# Component Reference

## ConfirmDeleteDialog

Location: `components/ui/confirm-delete-dialog.tsx`

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

**Usage**:
```tsx
<ConfirmDeleteDialog
  open={showDeleteDialog}
  onOpenChange={setShowDeleteDialog}
  description="確定要刪除這筆支出嗎？此操作無法復原。"
  onConfirm={handleDelete}
  loading={deleting}
>
  {/* Optional children for extra content */}
</ConfirmDeleteDialog>
```

**Used in**:
- `app/projects/[id]/expenses/page.tsx` - Single/batch expense delete
- `app/projects/[id]/settings/page.tsx` - Project delete
- `components/expense/expense-form.tsx` - Edit page expense delete
