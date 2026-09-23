import { Button } from '@renderer/components/ui/button'
import BasePage from '@renderer/components/base/base-page'
import GeneralConfig from '@renderer/components/settings/general-config'
import AdvancedSettings from '@renderer/components/settings/advanced-settings'
import Actions from '@renderer/components/settings/actions'
import ShortcutConfig from '@renderer/components/settings/shortcut-config'
import AppearanceConfig from '@renderer/components/settings/appearance-confis'
import LanguageConfig from '@renderer/components/settings/language-config'
import ProxySwitches from '@renderer/components/settings/proxy-switches'
import { useTranslation } from 'react-i18next'
import { Github } from 'lucide-react'
import { useState } from 'react'

const Settings: React.FC = () => {
  const { t } = useTranslation()
  const [showHiddenSettings, setShowHiddenSettings] = useState(false)

  return (
    <BasePage
      title={t('pages.settings.title')}
      contentClassName="ui-page"
      header={
        <>
          <Button
            size="icon-sm"
            variant="ghost"
            className="app-nodrag"
            title={t('pages.settings.githubRepo')}
            onClick={() => {
              window.open('https://github.com/coolcoala/koala-clash')
            }}
          >
            <Github className="text-lg" />
          </Button>
        </>
      }
    >
      <div className="mx-auto w-full max-w-4xl space-y-7">
        <p className="ui-description">{t('redesign.settingsHint')}</p>
        <section aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" className="mb-3 text-sm font-semibold">
            {t('redesign.appearanceLanguage')}
          </h2>
          <LanguageConfig />
          <AppearanceConfig showHiddenSettings={showHiddenSettings} />
        </section>
        <section aria-labelledby="startup-heading">
          <h2 id="startup-heading" className="mb-3 text-sm font-semibold">
            {t('redesign.startupPreferences')}
          </h2>
          <GeneralConfig showHiddenSettings={showHiddenSettings} />
        </section>
        <section aria-labelledby="proxy-heading">
          <h2 id="proxy-heading" className="mb-3 text-sm font-semibold">
            {t('redesign.proxyPreferences')}
          </h2>
          <ProxySwitches />
        </section>
        <section aria-labelledby="advanced-heading">
          <h2 id="advanced-heading" className="mb-3 text-sm font-semibold">
            {t('redesign.advancedPreferences')}
          </h2>
          <AdvancedSettings showHiddenSettings={showHiddenSettings} />
          <ShortcutConfig />
          <Actions
            showHiddenSettings={showHiddenSettings}
            onUnlockHiddenSettings={() => setShowHiddenSettings(true)}
          />
        </section>
      </div>
    </BasePage>
  )
}

export default Settings
