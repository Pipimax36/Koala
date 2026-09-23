import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import useSWR, { mutate } from 'swr'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import { useProfileConfig } from '@renderer/hooks/use-profile-config'
import {
  mihomoConfig,
  patchControledMihomoConfig,
  patchMihomoConfig,
  mihomoCloseAllConnections
} from '@renderer/utils/ipc'
import { cn } from '@renderer/lib/utils'

export default function OutboundModeSwitcher() {
  const { t } = useTranslation()
  const { appConfig } = useAppConfig()
  const { profileConfig } = useProfileConfig()
  const currentProfile = profileConfig?.items?.find((item) => item.id === profileConfig.current)
  const { data: runtime, error, mutate: refresh } = useSWR('mihomoConfig', mihomoConfig)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  async function change(mode: OutboundMode): Promise<void> {
    if (lock.current || !runtime || mode === runtime.mode) return
    lock.current = true
    setBusy(true)
    const previous = runtime.mode
    try {
      await patchMihomoConfig({ mode })
      try {
        await patchControledMihomoConfig({ mode })
      } catch (cause) {
        const recovery = await Promise.allSettled([
          patchControledMihomoConfig({ mode: previous }),
          patchMihomoConfig({ mode: previous })
        ])
        if (recovery.some((result) => result.status === 'rejected')) {
          throw new AggregateError([cause], t('redesign.recoveryFailed'))
        }
        throw cause
      }
      if (appConfig?.autoCloseConnection !== false) await mihomoCloseAllConnections()
    } catch (cause) {
      toast.error(`${t('redesign.operationFailed')}: ${cause}`)
    } finally {
      await Promise.allSettled([
        refresh(),
        mutate('getControledMihomoConfig'),
        mutate('mihomoGroups')
      ])
      window.electron.ipcRenderer.send('updateTrayMenu')
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <div
      role="group"
      aria-label={t('redesign.outboundMode')}
      aria-busy={busy}
      className="flex gap-1 rounded-lg bg-muted p-1"
    >
      {(['rule', 'global', 'direct'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={!error && runtime?.mode === mode}
          disabled={
            busy ||
            !runtime ||
            Boolean(error) ||
            (mode === 'global' && currentProfile?.globalMode === false)
          }
          onClick={() => void change(mode)}
          className={cn(
            'flex-1 rounded-md px-2 py-2 text-xs font-medium disabled:opacity-50',
            runtime?.mode === mode && !error
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:bg-background/50'
          )}
        >
          {t(`redesign.${mode}`)}
        </button>
      ))}
    </div>
  )
}
