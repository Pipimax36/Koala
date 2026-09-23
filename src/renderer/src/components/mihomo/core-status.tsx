import { useState, useRef } from 'react'
import useSWR, { mutate } from 'swr'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { RefreshCcw, ScrollText, Cpu } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import ConfirmModal from '@renderer/components/base/base-confirm'
import { mihomoVersion, restartCore, updateTrayIcon } from '@renderer/utils/ipc'
import { useProxyControl } from '@renderer/hooks/use-proxy-control'

export default function CoreStatus() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    data,
    error,
    mutate: refresh
  } = useSWR('mihomoVersion', mihomoVersion, { refreshInterval: 5000 })
  const { enabled, busy: proxyBusy } = useProxyControl()
  const [restarting, setRestarting] = useState(false)
  const lock = useRef(false)
  const [confirm, setConfirm] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const restart = async (): Promise<void> => {
    if (lock.current || proxyBusy) return
    lock.current = true
    setConfirm(false)
    setRestarting(true)
    setFailure(null)
    try {
      await restartCore()
      await mihomoVersion()
      toast.success(t('redesign.coreRestarted'))
    } catch (cause) {
      setFailure(String(cause))
      toast.error(String(cause))
    } finally {
      await Promise.allSettled([
        refresh(),
        mutate('mihomoConfig'),
        mutate('mihomoGroups'),
        updateTrayIcon()
      ])
      window.electron.ipcRenderer.send('updateTrayMenu')
      window.electron.ipcRenderer.send('updateFloatingWindow')
      lock.current = false
      setRestarting(false)
    }
  }
  return (
    <section className="ui-panel mb-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Cpu className="size-7" />
          <div>
            <h2 className="text-base font-semibold">Mihomo {error ? '' : data?.version}</h2>
            <p role="status" className="ui-description mt-1">
              {t(
                restarting
                  ? 'redesign.restarting'
                  : error
                    ? 'redesign.coreUnavailable'
                    : data
                      ? 'redesign.coreReady'
                      : 'redesign.loading'
              )}
            </p>
          </div>
        </div>
        <div className="ui-toolbar">
          <Button
            variant="outline"
            disabled={restarting || proxyBusy}
            onClick={() => (enabled ? setConfirm(true) : void restart())}
          >
            <RefreshCcw className={restarting ? 'animate-spin' : ''} />
            {t('redesign.restartCore')}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/logs')}>
            <ScrollText />
            {t('sider.logs')}
          </Button>
        </div>
      </div>
      {failure && (
        <p role="alert" className="mt-3 break-words text-sm text-destructive">
          {failure}
        </p>
      )}
      <p className="ui-description mt-3">{t('redesign.coreStateHint')}</p>
      {confirm && (
        <ConfirmModal
          title={t('redesign.restartCore')}
          description={t('redesign.restartCoreHint')}
          onChange={(open) => {
            if (!open) setConfirm(false)
          }}
          onConfirm={restart}
        />
      )}
    </section>
  )
}
