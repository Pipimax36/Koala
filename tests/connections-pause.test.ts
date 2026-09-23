import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  attachConnectionsStore,
  useConnectionsStore
} from '../src/renderer/src/store/connections-store'

test('pausing leaves network listeners active and resumes the latest snapshot without speed spikes', () => {
  let listener: ((event: unknown, payload: ControllerConnections) => void) | undefined
  Object.assign(globalThis, {
    window: {
      electron: {
        ipcRenderer: {
          on: (_key: string, fn: typeof listener) => {
            listener = fn
          },
          removeListener: () => {
            listener = undefined
          }
        }
      }
    }
  })
  const detach = attachConnectionsStore()
  const payload = (ids: string[], download: number) =>
    ({
      uploadTotal: 0,
      downloadTotal: download,
      memory: 0,
      connections: ids.map((id) => ({ id, metadata: { type: 'HTTP' }, download, upload: 0 }))
    }) as ControllerConnections
  listener!(null, payload(['a', 'b'], 10))
  useConnectionsStore.getState().togglePause()
  listener!(null, payload(['a'], 1000))
  assert.equal(useConnectionsStore.getState().active.length, 2)
  listener!(null, payload(['a', 'c'], 2000))
  useConnectionsStore.getState().togglePause()
  assert.deepEqual(
    useConnectionsStore.getState().active.map((item) => item.id),
    ['a', 'c']
  )
  assert.equal(useConnectionsStore.getState().active[0].downloadSpeed, 0)
  assert.equal(useConnectionsStore.getState().closed[0].id, 'b')
  listener!(null, payload(['a', 'c'], 2010))
  assert.equal(useConnectionsStore.getState().active[0].downloadSpeed, 10)
  detach()
  assert.equal(listener, undefined)
})
