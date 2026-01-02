"use client"

import { useState } from "react"
import { Check, Delete } from "lucide-react"

interface CalculatorProps {
  onApply: (value: number) => void
  onClose?: () => void
  initialValue?: string
}

// 純計算函數（不涉及 state）
function evaluateExpressionValue(expr: string): number | null {
  if (!expr) return null

  try {
    const jsExpr = expr.replace(/×/g, "*").replace(/÷/g, "/")
    const cleanExpr = jsExpr.replace(/[+\-*/]$/, "")
    if (!cleanExpr) return null
    const evalResult = new Function(`return ${cleanExpr}`)()
    if (typeof evalResult === "number" && !isNaN(evalResult) && isFinite(evalResult)) {
      return Math.round(evalResult * 100) / 100
    }
    return null
  } catch {
    return null
  }
}

export function Calculator({ onApply, onClose, initialValue }: CalculatorProps) {
  const [expression, setExpression] = useState(initialValue || "")
  // 使用 lazy initialization 計算初始結果
  const [result, setResult] = useState<number | null>(() =>
    initialValue ? evaluateExpressionValue(initialValue) : null
  )

  // 計算表達式結果並更新 state
  function evaluateExpression(expr: string) {
    setResult(evaluateExpressionValue(expr))
  }

  function handleInput(value: string) {
    const operators = ["+", "-", "×", "÷"]
    const lastChar = expression.slice(-1)

    // 防止連續運算符
    if (operators.includes(value)) {
      if (expression === "" || operators.includes(lastChar)) {
        return
      }
    }

    // 防止重複小數點
    if (value === ".") {
      const parts = expression.split(/[+\-×÷]/)
      const lastPart = parts[parts.length - 1]
      if (lastPart.includes(".")) {
        return
      }
    }

    const newExpression = expression + value
    setExpression(newExpression)
    evaluateExpression(newExpression)
  }

  function handleDelete() {
    const newExpression = expression.slice(0, -1)
    setExpression(newExpression)
    evaluateExpression(newExpression)
  }

  function handleClear() {
    setExpression("")
    setResult(null)
  }

  function applyResult() {
    if (result !== null) {
      onApply(result)
      setExpression("")
      setResult(null)
      onClose?.()
    }
  }

  const buttons = ["C", "÷", "×", "⌫", "7", "8", "9", "−", "4", "5", "6", "+", "1", "2", "3", "=", "0", "0", ".", "="]

  return (
    <div className="space-y-3">
      {/* 顯示區 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4">
        <div className="text-right">
          <p className="text-sm text-muted-foreground min-h-[20px] font-mono">
            {expression || "0"}
          </p>
          <p className="text-3xl font-bold text-primary tabular-nums">
            {result !== null ? `= ${result.toLocaleString("zh-TW")}` : ""}
          </p>
        </div>
      </div>

      {/* 按鈕區 */}
      <div className="grid grid-cols-4 gap-2">
        {buttons.map((btn, idx) => {
          // 跳過重複的按鈕位置
          if (idx === 17 || idx === 19) return null

          const isOperator = ["÷", "×", "−", "+"].includes(btn)
          const isClear = btn === "C"
          const isDelete = btn === "⌫"
          const isEquals = btn === "="
          const isZero = btn === "0" && idx === 16

          let className = "h-11 rounded-xl font-semibold text-lg transition-all active:scale-95 "

          if (isClear) {
            className += "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200"
          } else if (isOperator || isDelete) {
            className += "bg-slate-100 dark:bg-slate-700 text-primary hover:bg-slate-200 dark:hover:bg-slate-600"
          } else if (isEquals) {
            className += "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          } else {
            className += "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
          }

          if (isZero) className += " col-span-2"

          const handleClick = () => {
            if (isClear) handleClear()
            else if (isDelete) handleDelete()
            else if (isEquals) applyResult()
            else if (isOperator) handleInput(btn === "−" ? "-" : btn)
            else handleInput(btn)
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={handleClick}
              disabled={isEquals && result === null}
              className={className}
            >
              {isDelete ? (
                <Delete className="h-5 w-5 mx-auto" />
              ) : isEquals ? (
                <Check className="h-5 w-5 mx-auto" />
              ) : (
                btn
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
