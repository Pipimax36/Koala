import { useEffect } from 'react'
import { create } from 'zustand'
import useSWR, { mutate } from 'swr'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAppConfig } from './use-app-config'
import { useControledMihomoConfig } from './use-controled-mihomo-config'
import * as ipc from '@renderer/utils/ipc'
import { applyProxyControl, type ProxyMode } from '@renderer/utils/proxy-control'
import { subscribeCoreStarted } from '@renderer/store/core-lifecycle-store'

const useOperation = create<{ busy: boolean; error: string | null }>(() => ({
  busy: false,
  error: null
}))

export function useProxyControl() {
  const { t } = useTranslation()
  const { appConfig } = useAppConfig()
  const { controledMihomoConfig } = useControledMihomoConfig()
  const { busy, error } = useOperation()
  const {
    data: runtime,
    error: runtimeError,
    mutate: refresh
  } = useSWR('mihomoConfig', ipc.mihomoConfig, {
    refreshInterval: 5000,
    errorRetryInterval: 5000
  })
  useEffect(
    () =>
      subscribeCoreStarted(() => {
        void refresh()
      }),
    [refresh]
  )
  const enabled = Boolean(
    (runtimeError ? controledMihomoConfig?.tun?.enable : runtime?.tun?.enable) ||
    appConfig?.proxyMode
  )
  const mode = appConfig?.mainSwitchMode ?? 'tun'
  const ready = Boolean(appConfig && controledMihomoConfig)
  const portDisabled =
    mode === 'sysproxy' &&
    appConfig?.sysProxy?.enable !== false &&
    appConfig?.sysProxy?.mode === 'manual' &&
    controledMihomoConfig?.['mixed-port'] === 0

  async function apply(nextMode: ProxyMode, activate?: boolean): Promise<void> {
    if (useOperation.getState().busy) return
    useOperation.setState({ busy: true, error: null })
    try {
      const [app, core] = await Promise.all([ipc.getAppConfig(), ipc.getControledMihomoConfig()])
      await applyProxyControl(nextMode, activate, app, core, {
        patchApp: ipc.patchAppConfig,
        patchCore: ipc.patchControledMihomoConfig,
        reload: ipc.mihomoHotReloadConfig,
        setSystemProxy: ipc.triggerSysProxy,
        readRuntime: ipc.mihomoConfig
      })
    } catch (cause) {
      const message = `${t(cause instanceof AggregateError ? 'redesign.recoveryFailed' : 'redesign.operationFailed')}: ${String(cause)}`
      useOperation.setState({ error: message })
      toast.error(message)
    } finally {
      await Promise.allSettled([
        mutate('getConfig'),
        mutate('getControledMihomoConfig'),
        refresh(),
        ipc.updateTrayIcon()
      ])
      window.electron.ipcRenderer.send('updateTrayMenu')
      window.electron.ipcRenderer.send('updateFloatingWindow')
      useOperation.setState({ busy: false })
    }
  }
  return { mode, enabled, busy, error, ready, portDisabled, runtimeError, runtime, apply, refresh }
}
