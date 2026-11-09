# Component Reference

## DeleteExpenseSheet

Location: `components/v2/expenses/delete-expense-sheet.tsx`

```tsx
interface DeleteExpenseSheetProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean          // Default: false
  error?: string | null
  expense: DeleteExpenseSummaryProps | null
  canNotifyLine?: boolean    // Default: false
  notifyLine?: boolean       // Default: true
  onNotifyLineChange?: (checked: boolean) => void
}
```

**Usage**:
```tsx
<DeleteExpenseSheet
  open={showDeleteSheet}
  onClose={() => setShowDeleteSheet(false)}
  onConfirm={handleDelete}
  loading={deleting}
  expense={deleteExpenseSummary}
  canNotifyLine={canNotifyLine}
  notifyLine={notifyLine}
  onNotifyLineChange={setNotifyLine}
/>
```

**Used in**:
- `components/v2/expenses/expenses-v2.tsx` - Single expense delete
- `components/v2/expense-form/expense-form-v2.tsx` - Edit page expense delete
