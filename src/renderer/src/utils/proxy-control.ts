export type ProxyMode = 'sysproxy' | 'tun'

export interface ProxyControlDependencies {
  patchApp: (patch: Partial<AppConfig>) => Promise<void>
  patchCore: (patch: Partial<MihomoConfig>) => Promise<void>
  reload: () => Promise<void>
  setSystemProxy: (enable: boolean, onlyActiveDevice: boolean) => Promise<void>
  readRuntime: () => Promise<ControllerConfigs>
}

// Keep the mode preference separate from activation. Raw IPC calls must reject on
// failure; the legacy config hooks deliberately consume errors for settings forms.
export async function applyProxyControl(
  mode: ProxyMode,
  enabled: boolean | undefined,
  app: AppConfig,
  core: Partial<MihomoConfig>,
  deps: ProxyControlDependencies
): Promise<void> {
  if (enabled === undefined) {
    await deps.patchApp({ mainSwitchMode: mode })
    return
  }

  const writeSystemProxy = app.sysProxy?.enable !== false
  const onlyActiveDevice = app.onlyActiveDevice ?? false
  const tun = enabled && mode === 'tun'
  const proxy = enabled && mode === 'sysproxy'
  if (proxy && writeSystemProxy && app.sysProxy?.mode === 'manual' && core['mixed-port'] === 0) {
    throw new Error('The mixed port is disabled')
  }
  const enableDns = tun && app.controlDns && core.dns?.enable === false
  let systemProxyTouched = false
  try {
    if (writeSystemProxy && app.proxyMode && !proxy) {
      systemProxyTouched = true
      await deps.setSystemProxy(false, onlyActiveDevice)
    }
    await deps.patchCore({ tun: { enable: tun }, ...(enableDns ? { dns: { enable: true } } : {}) })
    await deps.patchApp({ proxyMode: proxy })
    await deps.reload()
    const runtime = await deps.readRuntime()
    if (runtime.tun.enable !== tun) throw new Error('The core did not apply the selected mode')
    if (writeSystemProxy && proxy) {
      systemProxyTouched = true
      await deps.setSystemProxy(true, onlyActiveDevice)
    }
    await deps.patchApp({ mainSwitchMode: mode })
  } catch (error) {
    // Attempt every recovery step, even when one fails. Never hide a partial recovery.
    const failures: unknown[] = []
    const recover = async (action: () => Promise<void>): Promise<void> => {
      try {
        await action()
      } catch (failure) {
        failures.push(failure)
      }
    }
    await recover(() =>
      deps.patchCore({
        tun: { enable: core.tun?.enable ?? false },
        ...(enableDns ? { dns: { enable: false } } : {})
      })
    )
    await recover(() =>
      deps.patchApp({
        proxyMode: app.proxyMode ?? false,
        mainSwitchMode: app.mainSwitchMode ?? 'tun'
      })
    )
    await recover(deps.reload)
    if (systemProxyTouched) {
      await recover(() => deps.setSystemProxy(app.proxyMode ?? false, onlyActiveDevice))
    }
    if (failures.length)
      throw new AggregateError([error, ...failures], 'Proxy mode recovery failed')
    throw error
  }
}
