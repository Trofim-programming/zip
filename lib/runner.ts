// Tiny mock Python interpreter for the prototype. Swap for a sandboxed executor (Pyodide / Judge0 / Vercel Sandbox) later.
export type RunResult = { output: string[]; error?: string }

function evalExpr(expr: string, vars: Record<string, unknown>): unknown {
  const e = expr.trim()
  if (/^(["']).*\1$/.test(e)) return e.slice(1, -1)
  if (/^-?\d+(\.\d+)?$/.test(e)) return Number(e)
  if (/^[a-zA-Z_]\w*$/.test(e)) {
    if (!(e in vars)) throw new Error(`NameError: name '${e}' is not defined`)
    return vars[e]
  }
  const lenMatch = e.match(/^len\((.+)\)$/)
  if (lenMatch) return String(evalExpr(lenMatch[1], vars) as string).length
  const arith = e.match(/^(.+?)\s*([+\-*/%])\s*(.+)$/)
  if (arith) {
    const a = evalExpr(arith[1], vars) as number
    const b = evalExpr(arith[3], vars) as number
    switch (arith[2]) {
      case '+': return (a as unknown as string) + (b as unknown as string)
      case '-': return a - b
      case '*': return typeof a === 'string' ? (a as string).repeat(b) : a * b
      case '/': if (b === 0) throw new Error('ZeroDivisionError: division by zero'); return a / b
      case '%': return a % b
    }
  }
  throw new Error(`SyntaxError: invalid syntax: ${e}`)
}

function splitArgs(s: string) {
  const out: string[] = []
  let cur = ''
  let quote = ''
  for (const ch of s) {
    if (quote) { cur += ch; if (ch === quote) quote = '' }
    else if (ch === '"' || ch === "'") { quote = ch; cur += ch }
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out
}

export function runPython(code: string, stdin: string[] = []): RunResult {
  const vars: Record<string, unknown> = {}
  const output: string[] = []
  const inputs = [...stdin]
  const lines = code.split('\n')
  try {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/#.*$/, '').trimEnd()
      if (!line.trim()) continue
      const assignInput = line.match(/^(\w+)\s*=\s*input\((.*)\)$/)
      if (assignInput) {
        const prompt = assignInput[2] ? String(evalExpr(assignInput[2], vars)) : ''
        const value = inputs.shift() ?? 'Алекс'
        output.push(`${prompt}${value}`)
        vars[assignInput[1]] = value
        continue
      }
      const print = line.match(/^print\((.*)\)$/)
      if (print) {
        output.push(splitArgs(print[1]).map((a) => String(evalExpr(a, vars))).join(' '))
        continue
      }
      const assign = line.match(/^(\w+)\s*=\s*(.+)$/)
      if (assign) {
        vars[assign[1]] = evalExpr(assign[2], vars)
        continue
      }
      throw new Error(`SyntaxError (строка ${i + 1}): ${line.trim()}`)
    }
    return { output }
  } catch (err) {
    return { output, error: (err as Error).message }
  }
}
