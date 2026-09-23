import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compareProxyDelay } from '../src/renderer/src/utils/proxy-delay'
test('valid latency sorts before timeout and untested, ties preserve input order', () => {
  const samples = [
    { name: 'timeout', history: [{ delay: 0 }] },
    { name: 'slow', history: [{ delay: 90 }] },
    { name: 'untested', history: [] },
    { name: 'fast', history: [{ delay: 15 }] }
  ]
  assert.deepEqual(
    [...samples].sort(compareProxyDelay).map((item) => item.name),
    ['fast', 'slow', 'timeout', 'untested']
  )
  assert.equal(compareProxyDelay(samples[0], samples[2]), 0)
  assert.equal(samples[0].name, 'timeout')
})
