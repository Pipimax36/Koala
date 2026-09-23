import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validPorts } from '../src/renderer/src/utils/ports'
test('accepts disabled ports but rejects duplicate, fractional, missing and out-of-range ports', () => {
  assert.equal(validPorts([0, 0, 7890, 65535]), true)
  for (const ports of [[7890, 7890], [-1], [65536], [NaN], [1.5], [Infinity]])
    assert.equal(validPorts(ports), false)
})
