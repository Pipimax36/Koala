import SettingCard from '../base/base-setting-card'
import SettingItem from '../base/base-setting-item'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import ProxyModeTabs from '@renderer/components/home/proxy-mode-tabs'
import OutboundMode from '@renderer/components/sider/outbound-mode-switcher'
import { useProxyControl } from '@renderer/hooks/use-proxy-control'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Settings } from 'lucide-react'

export default function ProxySwitches() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mode, enabled, busy, ready, portDisabled, error, apply } = useProxyControl()
  return (
    <SettingCard>
      <SettingItem title={t('redesign.proxyMode')} divider>
        <ProxyModeTabs />
      </SettingItem>
      <SettingItem
        title={t(busy ? 'redesign.applying' : enabled ? 'redesign.enabled' : 'redesign.disabled')}
        divider
      >
        <Switch
          aria-label={t('redesign.proxyMode')}
          checked={enabled}
          disabled={busy || !ready || (!enabled && portDisabled)}
          onCheckedChange={(activate) => void apply(mode, activate)}
        />
      </SettingItem>
      {portDisabled && !enabled && (
        <p role="status" className="ui-description my-3">
          {t('redesign.portDisabled')}
        </p>
      )}
      {error && (
        <p role="alert" className="my-3 break-words text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="ui-description my-3">{t('redesign.settingsProxyHint')}</p>
      <SettingItem title={t('redesign.outboundMode')}>
        <OutboundMode />
      </SettingItem>
      <div className="ui-toolbar mt-4">
        <Button variant="outline" onClick={() => navigate('/sysproxy')}>
          <Settings />
          {t('sider.proxyMode')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/tun')}>
          <Settings />
          {t('sider.virtualInterface')}
        </Button>
      </div>
    </SettingCard>
  )
}
