# Interface Reference

## ParsedReceipt

```typescript
interface ParsedReceipt {
  amount: number        // Total amount
  description: string   // Merchant name or item description
  category: ExpenseCategory
  date: string | null   // YYYY-MM-DD format
  confidence: number    // 0-1
}
```

## ExpenseCategory

See `types/expense.ts` for full category enum.

Common categories:
- `food` - 餐飲
- `transport` - 交通
- `accommodation` - 住宿
- `shopping` - 購物
- `entertainment` - 娛樂
- `other` - 其他
