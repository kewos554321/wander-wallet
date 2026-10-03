"use client"

import { useState } from "react"

interface CalculatorPadProps {
  initialValue: string | number
  onApply: (value: number) => void
  onClose: () => void
}

const OPERATORS = ["+", "−", "×", "÷"] as const

interface Key {
  label: string
  span?: number
  kind?: "operator" | "backspace" | "clear" | "digit" | "dot" | "apply"
}

const KEYS: Key[] = [
  { label: "C", kind: "clear" },
  { label: "÷", kind: "operator" },
  { label: "×", kind: "operator" },
  { label: "⌫", kind: "backspace" },
  { label: "7", kind: "digit" },
  { label: "8", kind: "digit" },
  { label: "9", kind: "digit" },
  { label: "−", kind: "operator" },
  { label: "4", kind: "digit" },
  { label: "5", kind: "digit" },
  { label: "6", kind: "digit" },
  { label: "+", kind: "operator" },
  { label: "1", kind: "digit" },
  { label: "2", kind: "digit" },
  { label: "3", kind: "digit" },
  { label: "✓", kind: "apply" },
  { label: "0", kind: "digit", span: 2 },
  { label: ".", kind: "dot" },
]

/** Evaluates a keypad expression. Returns null for empty/invalid input. */
function evaluateExpression(expr: string): number | null {
  if (!expr) return null
  try {
    const jsExpr = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-")
    const cleanExpr = jsExpr.replace(/[+\-*/]$/, "")
    if (!cleanExpr) return null
    const result = new Function(`return ${cleanExpr}`)()
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return Math.round(result * 100) / 100
    }
    return null
  } catch {
    return null
  }
}

function isOperator(char: string): boolean {
  return (OPERATORS as readonly string[]).includes(char)
}

const KEY_BASE = "h-[42px] rounded-[11px] text-base font-bold transition-transform active:scale-95"

function keyClass(kind: Key["kind"]): string {
  switch (kind) {
    case "operator":
    case "backspace":
      return `${KEY_BASE} bg-v2-paper/15 text-v2-paper`
    case "clear":
      return `${KEY_BASE} bg-v2-paper/15 text-v2-danger-edge`
    case "apply":
      return `${KEY_BASE} bg-v2-paper text-v2-lake`
    default:
      return `${KEY_BASE} bg-v2-paper text-v2-ink`
  }
}

export function CalculatorPad({ initialValue, onApply, onClose }: CalculatorPadProps) {
  const [expression, setExpression] = useState<string>(String(initialValue))
  const result = evaluateExpression(expression)

  function handleKey(key: Key) {
    switch (key.kind) {
      case "clear":
        setExpression("")
        return
      case "backspace":
        setExpression((prev) => prev.slice(0, -1))
        return
      case "apply": {
        onApply(evaluateExpression(expression) ?? 0)
        onClose()
        return
      }
      case "operator": {
        if (expression === "" || isOperator(expression.slice(-1))) return
        setExpression((prev) => prev + key.label)
        return
      }
      case "dot": {
        const lastOperand = expression.split(/[+\-−×÷]/).pop() ?? ""
        if (lastOperand.includes(".")) return
        // A leading dot (empty expression or straight after an operator) becomes 0.
        const prefix = expression === "" || isOperator(expression.slice(-1)) ? "0" : ""
        setExpression((prev) => prev + prefix + ".")
        return
      }
      default:
        setExpression((prev) => prev + key.label)
    }
  }

  return (
    <div className="space-y-3">
      <div data-testid="calc-display" className="rounded-[14px] bg-v2-surface p-3.5">
        <p
          data-testid="calc-expression"
          className="min-h-[16px] text-right font-mono text-xs text-v2-ink-subtle"
        >
          {expression || "0"}
        </p>
        <p
          data-testid="calc-result"
          className="text-right font-v2-serif text-[26px] font-bold text-v2-lake tabular-nums"
        >
          {result !== null ? `= ${result.toLocaleString("zh-TW")}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-[7px]">
        {KEYS.map((key) => (
          <button
            key={key.label}
            type="button"
            onClick={() => handleKey(key)}
            className={`${keyClass(key.kind)}${key.span === 2 ? " col-span-2" : ""}`}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  )
}
