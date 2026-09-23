import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { applyCorePatch } from '@renderer/utils/core-config'
import { validPorts } from '@renderer/utils/ports'
import SettingCard from '../base/base-setting-card'
import SettingItem from '../base/base-setting-item'
import EditableList from '../base/base-list-editor'

import { useControledMihomoConfig } from '@renderer/hooks/use-controled-mihomo-config'
import { triggerSysProxy } from '@renderer/utils/ipc'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import { platform } from '@renderer/utils/init'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Switch } from '@renderer/components/ui/switch'
import InterfaceModal from '@renderer/components/mihomo/interface-modal'
import { useTranslation } from 'react-i18next'
import { Network } from 'lucide-react'

const PortSetting: React.FC = () => {
  const { t } = useTranslation()
  const { appConfig } = useAppConfig()
  const { sysProxy, proxyMode = false, onlyActiveDevice = false } = appConfig || {}
  const { controledMihomoConfig } = useControledMihomoConfig()
  const {
    authentication = [],
    'skip-auth-prefixes': skipAuthPrefixes = ['127.0.0.1/32'],
    'allow-lan': allowLan,
    'lan-allowed-ips': lanAllowedIps = [],
    'lan-disallowed-ips': lanDisallowedIps = [],
    'mixed-port': mixedPort = 7897,
    'socks-port': socksPort = 0,
    port: httpPort = 0,
    'redir-port': redirPort = 0,
    'tproxy-port': tproxyPort = 0
  } = controledMihomoConfig || {}

  const [mixedPortInput, setMixedPortInput] = useState(mixedPort)
  const [socksPortInput, setSocksPortInput] = useState(socksPort)
  const [httpPortInput, setHttpPortInput] = useState(httpPort)
  const [redirPortInput, setRedirPortInput] = useState(redirPort)
  const [tproxyPortInput, setTproxyPortInput] = useState(tproxyPort)
  const [lanAllowedIpsInput, setLanAllowedIpsInput] = useState(lanAllowedIps)
  const [lanDisallowedIpsInput, setLanDisallowedIpsInput] = useState(lanDisallowedIps)
  const [authenticationInput, setAuthenticationInput] = useState(authentication)
  const [skipAuthPrefixesInput, setSkipAuthPrefixesInput] = useState(skipAuthPrefixes)
  const [busy, setBusy] = useState(false)
  const operationLock = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [lanOpen, setLanOpen] = useState(false)

  const parseAuth = (item: string): { part1: string; part2: string } => {
    const [user = '', pass = ''] = item.split(':')
    return { part1: user, part2: pass }
  }
  const formatAuth = (user: string, pass?: string): string => `${user}:${pass || ''}`
  useEffect(() => setMixedPortInput(mixedPort), [mixedPort])
  useEffect(() => setSocksPortInput(socksPort), [socksPort])
  useEffect(() => setHttpPortInput(httpPort), [httpPort])
  useEffect(() => setRedirPortInput(redirPort), [redirPort])
  useEffect(() => setTproxyPortInput(tproxyPort), [tproxyPort])
  const hasPortConflict = (): boolean =>
    !validPorts([mixedPortInput, socksPortInput, httpPortInput, redirPortInput, tproxyPortInput])

  const onChangeNeedRestart = async (patch: Partial<MihomoConfig>): Promise<void> => {
    if (operationLock.current) return
    if (Object.keys(patch).some((key) => key.endsWith('port')) && hasPortConflict()) return
    operationLock.current = true
    setBusy(true)
    setError(null)
    try {
      await applyCorePatch(patch)
      if ('mixed-port' in patch && proxyMode && sysProxy?.enable !== false)
        await triggerSysProxy(true, onlyActiveDevice)
      toast.success(t('redesign.saved'))
    } catch (cause) {
      setError(String(cause))
    } finally {
      await Promise.allSettled([mutate('getControledMihomoConfig'), mutate('mihomoConfig')])
      operationLock.current = false
      setBusy(false)
    }
  }

  return (
    <>
      {lanOpen && <InterfaceModal onClose={() => setLanOpen(false)} />}
      <fieldset disabled={busy}>
        <SettingCard title={t('mihomo.portSettings.title')}>
          <p className="ui-description mb-3">{t('redesign.portHint')}</p>
          {hasPortConflict() && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {t('redesign.invalidPorts')}
            </p>
          )}
          {error && (
            <p role="alert" className="mb-3 break-words text-sm text-destructive">
              {error}
            </p>
          )}
          <SettingItem title={t('mihomo.portSettings.mixedPort')} divider>
            <div className="flex">
              {mixedPortInput !== mixedPort && (
                <Button
                  size="sm"
                  className="mr-2"
                  disabled={hasPortConflict()}
                  onClick={async () => {
                    await onChangeNeedRestart({ 'mixed-port': mixedPortInput })
                  }}
                >
                  {t('common.confirm')}
                </Button>
              )}
              <Input
                type="number"
                className="w-25 h-8 text-sm"
                aria-label={t('mihomo.portSettings.mixedPort')}
                value={Number.isNaN(mixedPortInput) ? '' : mixedPortInput.toString()}
                max={65535}
                min={0}
                onChange={(e) => {
                  setMixedPortInput(e.target.value === '' ? NaN : Number(e.target.value))
                }}
              />
            </div>
          </SettingItem>
          <SettingItem title={t('mihomo.portSettings.socksPort')} divider>
            <div className="flex">
              {socksPortInput !== socksPort && (
                <Button
                  size="sm"
                  className="mr-2"
                  disabled={hasPortConflict()}
                  onClick={() => {
                    onChangeNeedRestart({ 'socks-port': socksPortInput })
                  }}
                >
                  {t('common.confirm')}
                </Button>
              )}

              <Input
                type="number"
                className="w-25 h-8 text-sm"
                aria-label={t('mihomo.portSettings.socksPort')}
                value={Number.isNaN(socksPortInput) ? '' : socksPortInput.toString()}
                max={65535}
                min={0}
                onChange={(e) => {
                  setSocksPortInput(e.target.value === '' ? NaN : Number(e.target.value))
                }}
              />
            </div>
          </SettingItem>
          <SettingItem title={t('mihomo.portSettings.httpPort')} divider>
            <div className="flex">
              {httpPortInput !== httpPort && (
                <Button
                  size="sm"
                  className="mr-2"
                  disabled={hasPortConflict()}
                  onClick={() => {
                    onChangeNeedRestart({ port: httpPortInput })
                  }}
                >
                  {t('common.confirm')}
                </Button>
              )}

              <Input
                type="number"
                className="w-25 h-8 text-sm"
                aria-label={t('mihomo.portSettings.httpPort')}
                value={Number.isNaN(httpPortInput) ? '' : httpPortInput.toString()}
                max={65535}
                min={0}
                onChange={(e) => {
                  setHttpPortInput(e.target.value === '' ? NaN : Number(e.target.value))
                }}
              />
            </div>
          </SettingItem>
          {platform !== 'win32' && (
            <SettingItem title={t('mihomo.portSettings.redirPort')} divider>
              <div className="flex">
                {redirPortInput !== redirPort && (
                  <Button
                    size="sm"
                    className="mr-2"
                    disabled={hasPortConflict()}
                    onClick={() => {
                      onChangeNeedRestart({ 'redir-port': redirPortInput })
                    }}
                  >
                    {t('common.confirm')}
                  </Button>
                )}

                <Input
                  type="number"
                  className="w-25 h-8 text-sm"
                  aria-label={t('mihomo.portSettings.redirPort')}
                  value={Number.isNaN(redirPortInput) ? '' : redirPortInput.toString()}
                  max={65535}
                  min={0}
                  onChange={(e) => {
                    setRedirPortInput(e.target.value === '' ? NaN : Number(e.target.value))
                  }}
                />
              </div>
            </SettingItem>
          )}
          {platform === 'linux' && (
            <SettingItem title={t('mihomo.portSettings.tproxyPort')} divider>
              <div className="flex">
                {tproxyPortInput !== tproxyPort && (
                  <Button
                    size="sm"
                    className="mr-2"
                    disabled={hasPortConflict()}
                    onClick={() => {
                      onChangeNeedRestart({ 'tproxy-port': tproxyPortInput })
                    }}
                  >
                    {t('common.confirm')}
                  </Button>
                )}

                <Input
                  type="number"
                  className="w-25 h-8 text-sm"
                  aria-label={t('mihomo.portSettings.tproxyPort')}
                  value={Number.isNaN(tproxyPortInput) ? '' : tproxyPortInput.toString()}
                  max={65535}
                  min={0}
                  onChange={(e) => {
                    setTproxyPortInput(e.target.value === '' ? NaN : Number(e.target.value))
                  }}
                />
              </div>
            </SettingItem>
          )}
          <SettingItem
            title={t('mihomo.portSettings.allowLan')}
            actions={
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  setLanOpen(true)
                }}
              >
                <Network className="text-lg" />
              </Button>
            }
            divider
          >
            <Switch
              checked={allowLan}
              onCheckedChange={(v) => {
                onChangeNeedRestart({ 'allow-lan': v })
              }}
            />
          </SettingItem>
          {allowLan && (
            <>
              <SettingItem title={t('mihomo.portSettings.allowedIpRanges')}>
                {lanAllowedIpsInput.join('') !== lanAllowedIps.join('') && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onChangeNeedRestart({ 'lan-allowed-ips': lanAllowedIpsInput })
                    }}
                  >
                    {t('common.confirm')}
                  </Button>
                )}
              </SettingItem>
              <EditableList
                items={lanAllowedIpsInput}
                onChange={(items) => setLanAllowedIpsInput(items as string[])}
                placeholder={t('mihomo.portSettings.ipRangePlaceholder')}
              />
              <SettingItem title={t('mihomo.portSettings.deniedIpRanges')}>
                {lanDisallowedIpsInput.join('') !== lanDisallowedIps.join('') && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onChangeNeedRestart({ 'lan-disallowed-ips': lanDisallowedIpsInput })
                    }}
                  >
                    {t('common.confirm')}
                  </Button>
                )}
              </SettingItem>
              <EditableList
                items={lanDisallowedIpsInput}
                onChange={(items) => setLanDisallowedIpsInput(items as string[])}
                placeholder={t('mihomo.portSettings.ipRangePlaceholder')}
              />
            </>
          )}
          <SettingItem title={t('mihomo.portSettings.authentication')}>
            {authenticationInput.join() !== authentication.join() && (
              <Button
                size="sm"
                onClick={() => onChangeNeedRestart({ authentication: authenticationInput })}
              >
                {t('common.confirm')}
              </Button>
            )}
          </SettingItem>
          <EditableList
            items={authenticationInput}
            onChange={(items) => setAuthenticationInput(items as string[])}
            placeholder={t('mihomo.portSettings.usernamePlaceholder')}
            part2Placeholder={t('mihomo.portSettings.passwordPlaceholder')}
            parse={parseAuth}
            format={formatAuth}
          />
          <SettingItem title={t('mihomo.portSettings.skipAuthIpRanges')}>
            {skipAuthPrefixesInput.join('') !== skipAuthPrefixes.join('') && (
              <Button
                size="sm"
                onClick={() => {
                  onChangeNeedRestart({ 'skip-auth-prefixes': skipAuthPrefixesInput })
                }}
              >
                {t('common.confirm')}
              </Button>
            )}
          </SettingItem>
          <EditableList
            items={skipAuthPrefixesInput}
            onChange={(items) => setSkipAuthPrefixesInput(items as string[])}
            placeholder={t('mihomo.portSettings.ipRangePlaceholder')}
            disableFirst
            divider={false}
          />
        </SettingCard>
      </fieldset>
    </>
  )
}

export default PortSetting
