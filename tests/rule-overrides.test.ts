import assert from 'node:assert/strict'
import { test } from 'node:test'
import { saveRuleOverrides, validateRuleOverrides } from '../src/renderer/src/utils/rule-overrides'
test('rejects malformed override structures before saving', () => {
  for (const value of [
    'text',
    [],
    { prepend: 'DOMAIN,a,DIRECT' },
    { append: [4] },
    { prepend: [''] },
    { rules: [] }
  ])
    assert.throws(() => validateRuleOverrides(value))
  assert.deepEqual(validateRuleOverrides({ prepend: ['DOMAIN,example.com,DIRECT'] }), {
    prepend: ['DOMAIN,example.com,DIRECT']
  })
  assert.deepEqual(validateRuleOverrides(null), {})
})
test('a failed core apply restores old overrides and reports failure', async () => {
  let file = 'old'
  let applies = 0
  await assert.rejects(
    saveRuleOverrides('new', {
      read: async () => file,
      write: async (value) => {
        file = value
      },
      apply: async () => {
        if (++applies === 1) throw Error('invalid rule')
      }
    }),
    /invalid rule/
  )
  assert.equal(file, 'old')
  assert.equal(applies, 2)
})
test('recovery failure is not reported as successful save', async () => {
  await assert.rejects(
    saveRuleOverrides('new', {
      read: async () => 'old',
      write: async () => {},
      apply: async () => {
        throw Error('unavailable')
      }
    }),
    AggregateError
  )
})
