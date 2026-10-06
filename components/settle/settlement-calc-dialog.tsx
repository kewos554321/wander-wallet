"use client"

import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ArrowRight, CheckCircle2, Calculator } from "lucide-react"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import type { SettleData } from "@/lib/hooks/useSettlement"

interface SettlementCalcDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: SettleData
  trigger?: ReactNode
}

// "計算說明" dialog: expense details, per-member totals and the settlement plan,
// always shown in the project currency.
export function SettlementCalcDialog({ open, onOpenChange, data, trigger }: SettlementCalcDialogProps) {
  const { summary, balances, settlements } = data
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
              {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
              <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    計算過程
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Step 1: 支出明細 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center">1</div>
                      <h3 className="font-semibold">支出明細</h3>
                      <span className="text-xs text-muted-foreground">（共 {data?.expenseDetails?.length || 0} 筆）</span>
                    </div>
                    <div className="ml-8">
                      {data?.expenseDetails && data.expenseDetails.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {data.expenseDetails.map((expense) => (
                            <div key={expense.id} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-sm">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium">{expense.description}</span>
                                <span className="text-primary font-medium">
                                  {expense.currency !== summary.currency
                                    ? `${formatCurrency(expense.amount, expense.currency)} → `
                                    : ""
                                  }
                                  {formatCurrency(expense.convertedAmount, summary.currency || DEFAULT_CURRENCY)}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div>
                                  <span className="text-green-600">付款：</span>
                                  {expense.payers.map((p) => (
                                    <span key={p.memberId} className="mr-1 inline-flex items-center gap-1">
                                      {p.userImage ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={p.userImage} alt={p.displayName} className="h-4 w-4 rounded-full object-cover" />
                                      ) : null}
                                      {p.displayName}
                                      <span className="text-muted-foreground/70">
                                        ({formatCurrency(p.convertedAmount, summary.currency || DEFAULT_CURRENCY)})
                                      </span>
                                    </span>
                                  ))}
                                </div>
                                <div>
                                  <span className="text-amber-600">分攤：</span>
                                  {(() => {
                                    const count = expense.participants.length
                                    const total = expense.convertedAmount
                                    const perPerson = total / count
                                    const precision = summary.precision ?? 2
                                    const hasRounding = !Number.isInteger(perPerson)
                                    return (
                                      <>
                                        {hasRounding && (
                                          <span className="text-muted-foreground/50 mr-1">
                                            ({total} ÷ {count} ≈ {perPerson.toFixed(precision)})
                                          </span>
                                        )}
                                        {expense.participants.map((p, i) => (
                                          <span key={p.memberId}>
                                            {i > 0 && "、"}
                                            {p.displayName}
                                            <span className="text-muted-foreground/70">
                                              ({formatCurrency(p.convertedShareAmount, summary.currency || DEFAULT_CURRENCY)})
                                            </span>
                                          </span>
                                        ))}
                                      </>
                                    )
                                  })()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">尚無支出記錄</p>
                      )}
                    </div>
                  </div>

                  {/* Step 2: 計算各人總額 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center">2</div>
                      <h3 className="font-semibold">計算各人總額</h3>
                    </div>
                    <div className="ml-8">
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-800">
                            <tr>
                              <th className="text-left p-2 font-medium">成員</th>
                              <th className="text-right p-2 font-medium text-green-600">已付</th>
                              <th className="text-right p-2 font-medium text-amber-600">應付</th>
                              <th className="text-right p-2 font-medium">餘額</th>
                            </tr>
                          </thead>
                          <tbody>
                            {balances.map((b) => (
                              <tr key={b.memberId} className="border-t border-slate-200 dark:border-slate-700">
                                <td className="p-2">{b.displayName}</td>
                                <td className="p-2 text-right text-green-600">
                                  {formatCurrency(b.totalPaid, summary.currency || DEFAULT_CURRENCY)}
                                </td>
                                <td className="p-2 text-right text-amber-600">
                                  {formatCurrency(b.totalShare, summary.currency || DEFAULT_CURRENCY)}
                                </td>
                                <td className={`p-2 text-right font-medium ${b.balance > 0.01 ? "text-green-600" : b.balance < -0.01 ? "text-red-600" : "text-muted-foreground"}`}>
                                  {b.balance > 0.01 ? "+" : ""}{formatCurrency(b.balance, summary.currency || DEFAULT_CURRENCY)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        餘額 = 已付金額 − 應付金額（正數表示應收回，負數表示需付出）
                      </p>
                    </div>
                  </div>

                  {/* Step 3: 結算方案 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center">3</div>
                      <h3 className="font-semibold">結算方案</h3>
                    </div>
                    <div className="ml-8">
                      {settlements.length > 0 ? (
                        <>
                          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 space-y-2">
                            {settlements.map((s, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="font-medium">{idx + 1}.</span>
                                <span className="text-red-600 font-medium">{s.from.displayName}</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <span className="text-green-600 font-medium">{s.to.displayName}</span>
                                <span className="ml-auto font-bold text-primary">
                                  {formatCurrency(s.amount, summary.currency || DEFAULT_CURRENCY)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            以上為最少轉帳次數的結算方案，共需 {settlements.length} 筆轉帳
                          </p>
                        </>
                      ) : (
                        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 text-center">
                          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-green-700 dark:text-green-300">
                            {summary.totalExpenses === 0 ? "尚無支出記錄" : "所有人都已結清，無需轉帳！"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
    </Dialog>
  )
}
