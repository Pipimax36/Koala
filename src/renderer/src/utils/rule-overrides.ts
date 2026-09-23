export interface RuleOverrides {
  prepend?: string[]
  append?: string[]
  delete?: string[]
}

export function validateRuleOverrides(value: unknown): RuleOverrides {
  if (value == null) return {}
  if (typeof value !== 'object' || Array.isArray(value))
    throw Error('Rules must be a mapping of prepend, append and delete lists')
  for (const [key, rules] of Object.entries(value)) {
    if (!['prepend', 'append', 'delete'].includes(key)) throw Error(`Unknown rule section: ${key}`)
    if (
      !Array.isArray(rules) ||
      rules.some((rule) => typeof rule !== 'string' || !rule.trim() || !rule.includes(','))
    ) {
      throw Error(`${key} must contain non-empty rule strings`)
    }
  }
  return value as RuleOverrides
}

export async function saveRuleOverrides(
  content: string,
  deps: {
    read: () => Promise<string>
    write: (value: string) => Promise<void>
    apply: () => Promise<void>
  }
): Promise<void> {
  const previous = await deps.read()
  try {
    await deps.write(content)
    await deps.apply()
  } catch (error) {
    try {
      await deps.write(previous)
      await deps.apply()
    } catch (recoveryError) {
      throw new AggregateError([error, recoveryError], 'Rule recovery failed')
    }
    throw error
  }
}
