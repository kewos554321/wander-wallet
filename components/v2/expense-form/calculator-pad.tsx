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

/**
 * Evaluates a keypad expression with a tiny hand-written recursive-descent
 * parser. It never executes arbitrary code: only digits, `.`, the four
 * operators (ASCII and the design glyphs `− × ÷`) and whitespace are accepted;
 * any other character makes the expression invalid (`null`).
 */
function evaluateExpression(expr: string): number | null {
  if (!expr) return null

  // Normalise the design glyphs and reject anything outside the safe alphabet.
  const src = expr.replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/")
  if (!/^[0-9+\-*/. ]*$/.test(src)) return null

  interface NumberToken {
    type: "number"
    value: number
  }
  interface OperatorToken {
    type: "operator"
    value: "+" | "-" | "*" | "/"
  }
  type Token = NumberToken | OperatorToken

  // Tokenise: numbers (at most one dot) and operators.
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === " ") {
      i++
      continue
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "operator", value: ch })
      i++
      continue
    }
    let j = i
    while (j < src.length && /[0-9.]/.test(src[j])) j++
    const raw = src.slice(i, j)
    if (raw === "" || raw === "." || !/^\d*\.?\d*$/.test(raw)) return null
    tokens.push({ type: "number", value: Number(raw) })
    i = j
  }
  if (tokens.length === 0) return null

  // Recursive descent with operator precedence: +/− lowest, ×/÷ higher.
  let pos = 0
  const peek = (): Token | undefined => tokens[pos]

  function parseFactor(): number | null {
    const token = peek()
    if (token?.type === "operator" && (token.value === "-" || token.value === "+")) {
      pos++
      const value = parseFactor()
      if (value === null) return null
      return token.value === "-" ? -value : value
    }
    if (token?.type === "number") {
      pos++
      return token.value
    }
    return null
  }

  function parseTerm(): number | null {
    let left = parseFactor()
    if (left === null) return null
    let token = peek()
    while (token?.type === "operator" && (token.value === "*" || token.value === "/")) {
      pos++
      const right = parseFactor()
      if (right === null) return left
      left = token.value === "*" ? left * right : left / right
      token = peek()
    }
    return left
  }

  function parseExpression(): number | null {
    let left = parseTerm()
    if (left === null) return null
    let token = peek()
    while (token?.type === "operator" && (token.value === "+" || token.value === "-")) {
      pos++
      const right = parseTerm()
      if (right === null) return left
      left = token.value === "+" ? left + right : left - right
      token = peek()
    }
    return left
  }

  const value = parseExpression()
  if (value === null || pos !== tokens.length || !isFinite(value)) return null
  return Math.round(value * 100) / 100
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
