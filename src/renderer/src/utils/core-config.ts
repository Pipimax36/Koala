import {
  getControledMihomoConfig,
  mihomoConfig,
  mihomoHotReloadConfig,
  patchControledMihomoConfig
} from './ipc'

// A successful disk write does not imply the running core accepted the change.
export async function applyCorePatch(patch: Partial<MihomoConfig>): Promise<void> {
  const [previous, runtime] = await Promise.all([getControledMihomoConfig(), mihomoConfig()])
  const restore = Object.fromEntries(
    Object.keys(patch).map((key) => [key, previous[key] ?? runtime[key]])
  )
  try {
    await patchControledMihomoConfig(patch)
    await mihomoHotReloadConfig()
  } catch (error) {
    try {
      await patchControledMihomoConfig(restore)
      await mihomoHotReloadConfig()
    } catch (recoveryError) {
      throw new AggregateError([error, recoveryError], 'Core configuration recovery failed')
    }
    throw error
  }
}
