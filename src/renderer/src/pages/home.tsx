import { memo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import {
  Power,
  ArrowUp,
  ArrowDown,
  RefreshCcw,
  Plus,
  ChevronRight,
  WifiOff,
  ExternalLink
} from 'lucide-react'
import BasePage from '@renderer/components/base/base-page'
import { Button } from '@renderer/components/ui/button'
import { Spinner } from '@renderer/components/ui/spinner'
import EditInfoModal from '@renderer/components/profiles/edit-info-modal'
import ProxyModeTabs from '@renderer/components/home/proxy-mode-tabs'
import OutboundModeSwitcher from '@renderer/components/sider/outbound-mode-switcher'
import { useProxyControl } from '@renderer/hooks/use-proxy-control'
import { useProfileConfig } from '@renderer/hooks/use-profile-config'
import { useGroups } from '@renderer/hooks/use-groups'
import { useTrafficStore } from '@renderer/store/traffic-store'
import { addProfileItem } from '@renderer/utils/ipc'
import { calcTraffic } from '@renderer/utils/calc'

// Module-level variable: persists across component mounts/unmounts
let connectionStartTime: number | null = null

const ConnectedTimer = memo(({ active }: { active: boolean }) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) {
      connectionStartTime = null
      setElapsed(0)
      return undefined
    }

    if (connectionStartTime === null) {
      connectionStartTime = Date.now()
    }

    const updateElapsed = (): void => {
      setElapsed(Math.floor((Date.now() - connectionStartTime!) / 1000))
    }
    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [active])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  return (
    <span>
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
      {String(seconds).padStart(2, '0')}
    </span>
  )
})
ConnectedTimer.displayName = 'ConnectedTimer'

const Home: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const control = useProxyControl()
  const { profileConfig, mutateProfileConfig } = useProfileConfig()
  const { groups } = useGroups()
  const traffic = useTrafficStore((s) => s.traffic)
  const [editing, setEditing] = useState<ProfileItem | null>(null)
  const [updating, setUpdating] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  const current = profileConfig?.items.find((item) => item.id === profileConfig.current)
  const group = groups?.find((item) => item.name === groupName) ?? groups?.[0]
  const extra = current?.extra
  const usageKnown = extra?.upload !== undefined && extra?.download !== undefined
  const used = (extra?.upload ?? 0) + (extra?.download ?? 0)
  const total = extra?.total
  const quotaKnown = usageKnown && total !== undefined && total > 0
  const expires = extra?.expire
  const days =
    expires && expires > 0 ? Math.max(0, Math.ceil((expires * 1000 - now) / 86400000)) : undefined
  const expired = Boolean(expires && expires * 1000 <= now)
  const renewal = current?.home || current?.supportUrl
  const hasProfiles = Boolean(profileConfig?.items.length)
  const status = control.busy
    ? t('redesign.applying')
    : control.runtimeError
      ? t('redesign.coreUnavailable')
      : control.enabled
        ? t('redesign.enabled')
        : t('redesign.disabled')
  const newProfile = (): void =>
    setEditing({ id: '', name: '', type: 'remote', url: '', useProxy: false, autoUpdate: true })
  const update = async (): Promise<void> => {
    if (!current || updating) return
    setUpdating(true)
    try {
      await addProfileItem(current)
    } catch (error) {
      toast.error(String(error))
    } finally {
      mutateProfileConfig()
      setUpdating(false)
    }
  }

  return (
    <BasePage title={t('sider.home')} contentClassName="ui-page">
      {!profileConfig ? (
        <div role="status" className="ui-panel flex items-center gap-2">
          <Spinner />
          {t('redesign.loading')}
        </div>
      ) : !hasProfiles ? (
        <div className="ui-panel flex min-h-80 flex-col items-center justify-center gap-4 text-center">
          <WifiOff className="size-10 text-muted-foreground" />
          <h2 className="text-xl font-semibold">{t('pages.profiles.emptyTitle')}</h2>
          <p className="ui-description">{t('pages.profiles.emptyDescription')}</p>
          <Button onClick={newProfile} data-guide="home-add-profile-btn">
            <Plus />
            {t('pages.profiles.addProfile')}
          </Button>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-4">
          {(control.error || control.runtimeError) && (
            <div
              role="alert"
              className="ui-panel flex flex-wrap items-center gap-3 border-destructive"
            >
              <p className="min-w-0 flex-1 break-words text-sm">
                {control.error || t('redesign.coreUnavailableHint')}
              </p>
              <Button variant="outline" onClick={() => void control.refresh()}>
                {t('redesign.refreshStatus')}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/mihomo')}>
                {t('sider.coreSettings')}
              </Button>
            </div>
          )}
          <div className="grid gap-4 min-[1000px]:grid-cols-2">
            <section className="ui-panel flex flex-col gap-4" aria-label={t('redesign.proxyMode')}>
              <ProxyModeTabs />
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-3">
                <p role="status" className="text-sm font-medium">
                  {status}
                </p>
                <button
                  type="button"
                  data-guide="home-power-toggle"
                  aria-label={t(control.enabled ? 'redesign.disableProxy' : 'redesign.enableProxy')}
                  aria-pressed={control.enabled}
                  aria-busy={control.busy}
                  disabled={
                    control.busy ||
                    !control.ready ||
                    (!control.enabled && (control.portDisabled || !current))
                  }
                  onClick={() => void control.apply(control.mode, !control.enabled)}
                  className={`flex size-20 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${control.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
                >
                  {control.busy ? <Spinner className="size-7" /> : <Power className="size-7" />}
                </button>
                <p className="text-sm tabular-nums">
                  <ConnectedTimer active={control.enabled} />
                </p>
                <p className="ui-description max-w-72 text-center">
                  {t(control.mode === 'tun' ? 'redesign.tunHint' : 'redesign.defaultHint')}
                </p>
                {control.portDisabled && (
                  <p className="text-sm text-destructive">{t('redesign.portDisabled')}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 border-t pt-4 text-xs text-muted-foreground">
                <div>
                  <span className="flex items-center gap-1">
                    <ArrowUp className="size-3" />
                    {t('redesign.upload')}
                  </span>
                  <p className="mt-1 font-mono text-base text-foreground">
                    {calcTraffic(traffic.up)}/s
                  </p>
                  <p>
                    {calcTraffic(traffic.upTotal)} {t('redesign.total')}
                  </p>
                </div>
                <div>
                  <span className="flex items-center gap-1">
                    <ArrowDown className="size-3" />
                    {t('redesign.download')}
                  </span>
                  <p className="mt-1 font-mono text-base text-foreground">
                    {calcTraffic(traffic.down)}/s
                  </p>
                  <p>
                    {calcTraffic(traffic.downTotal)} {t('redesign.total')}
                  </p>
                </div>
              </div>
            </section>
            <div className="flex flex-col gap-4">
              <section className="ui-panel flex-1" data-guide="home-group-selector">
                <h2 className="text-sm font-semibold">{t('redesign.currentNode')}</h2>
                {groups && groups.length > 1 && (
                  <select
                    aria-label={t('sider.proxyGroup')}
                    value={group?.name}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="mt-3 w-full rounded-md border bg-background p-2 text-xs"
                  >
                    {groups.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                )}
                <p className="my-4 break-words text-xl font-semibold">
                  {control.runtimeError
                    ? t('redesign.unknown')
                    : group?.now || t('redesign.noNode')}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="ui-description">{group?.name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/proxies', { state: { fromHome: true } })}
                  >
                    {t('redesign.chooseNode')}
                    <ChevronRight />
                  </Button>
                </div>
              </section>
              <section className="ui-panel">
                <h2 className="mb-3 text-sm font-semibold">{t('redesign.outboundMode')}</h2>
                <OutboundModeSwitcher />
                <p className="ui-description mt-3">{t('redesign.outboundHint')}</p>
              </section>
            </div>
          </div>
          <section className="ui-panel">
            <div
              className="flex flex-wrap items-center justify-between gap-3"
              data-guide="home-profile-header"
            >
              <div className="min-w-0">
                <h2 className="text-xs text-muted-foreground">{t('redesign.currentProfile')}</h2>
                <p className="mt-1 break-words font-semibold">
                  {current?.name || t('pages.home.noProfile')}
                </p>
              </div>
              <div className="ui-toolbar">
                {current?.type === 'remote' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updating}
                    onClick={() => void update()}
                  >
                    <RefreshCcw className={updating ? 'animate-spin' : ''} />
                    {t('redesign.updateSubscription')}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => navigate('/profiles')}>
                  {t('sider.profileManagement')}
                  <ChevronRight />
                </Button>
              </div>
            </div>
            {quotaKnown && (
              <div
                role="progressbar"
                aria-label={t('redesign.usedTraffic')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.round((used / total) * 100))}
                className="my-4 h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, Math.max(0, (used / total) * 100))}%` }}
                />
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span>
                {t('redesign.usedTraffic')}:{' '}
                {usageKnown ? calcTraffic(used) : t('redesign.notProvided')}
              </span>
              <span>
                {t('pages.home.trafficRemaining')}{' '}
                {quotaKnown ? calcTraffic(Math.max(0, total - used)) : t('redesign.notProvided')}
              </span>
              <span>
                {t('pages.home.expires')}{' '}
                {expires && expires > 0
                  ? dayjs.unix(expires).format('L')
                  : t('redesign.notProvided')}
              </span>
            </div>
            {days !== undefined && days <= 3 && (
              <div
                role="status"
                className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
              >
                <span className="flex-1">
                  {expired
                    ? t('pages.home.subscriptionExpired')
                    : t('pages.home.subscriptionExpiring', { count: days })}
                </span>
                {renewal && (
                  <Button size="sm" variant="outline" onClick={() => open(renewal)}>
                    {t('pages.home.renewSubscription')}
                  </Button>
                )}
              </div>
            )}
            {current?.announce && (
              <p
                data-guide="home-profile-announce"
                className="mt-4 whitespace-pre-line break-words border-t pt-4 text-sm"
              >
                {current.announce}
              </p>
            )}
            {current?.supportUrl && (
              <Button
                data-guide="home-support-link"
                className="mt-3"
                variant="link"
                size="sm"
                onClick={() => open(current.supportUrl)}
              >
                {t('pages.profiles.support')}
                <ExternalLink />
              </Button>
            )}
          </section>
          <p className="ui-description">{t('redesign.connectivityHint')}</p>
        </div>
      )}
      {editing && (
        <EditInfoModal
          item={editing}
          isCurrent={false}
          onClose={() => setEditing(null)}
          updateProfileItem={async (item) => {
            await addProfileItem(item)
            mutateProfileConfig()
            setEditing(null)
          }}
        />
      )}
    </BasePage>
  )
}
export default Home
