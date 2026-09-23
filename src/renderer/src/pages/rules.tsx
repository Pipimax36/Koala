import BasePage from '@renderer/components/base/base-page'
import RuleItem from '@renderer/components/rules/rule-item'
import EditRulesModal from '@renderer/components/profiles/edit-rules-modal'
import { Virtuoso } from 'react-virtuoso'
import { useMemo, useState } from 'react'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { useRules } from '@renderer/hooks/use-rules'
import { useProfileConfig } from '@renderer/hooks/use-profile-config'
import { useControledMihomoConfig } from '@renderer/hooks/use-controled-mihomo-config'
import { includesIgnoreCase } from '@renderer/utils/includes'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Database, Pencil, RefreshCcw } from 'lucide-react'
import useSWR from 'swr'
import { load } from 'js-yaml'
import { getRuleStr } from '@renderer/utils/ipc'
import { validateRuleOverrides } from '@renderer/utils/rule-overrides'

export default function Rules() {
  const { t } = useTranslation()
  const { rules, mutate } = useRules()
  const { profileConfig } = useProfileConfig()
  const { controledMihomoConfig } = useControledMihomoConfig()
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('runtime')
  const [editing, setEditing] = useState(false)
  const navigate = useNavigate()
  const current = profileConfig?.items.find((item) => item.id === profileConfig.current)
  const {
    data: overrides,
    error,
    mutate: refreshOverrides
  } = useSWR(current ? ['ruleOverrides', current.id] : null, async () =>
    validateRuleOverrides(load(await getRuleStr(current!.id)))
  )
  const filtered = useMemo(
    () =>
      (rules?.rules ?? []).filter((rule) =>
        includesIgnoreCase(`${rule.type} ${rule.payload} ${rule.proxy}`, query)
      ),
    [rules, query]
  )
  const custom = useMemo(
    () =>
      (['prepend', 'append', 'delete'] as const)
        .flatMap((section) => (overrides?.[section] ?? []).map((value) => ({ section, value })))
        .filter((item) => includesIgnoreCase(item.value, query)),
    [overrides, query]
  )
  const refresh = (): void => {
    mutate()
    void refreshOverrides()
  }
  return (
    <BasePage
      title={t('pages.rules.title')}
      contentClassName="ui-page flex flex-col overflow-hidden"
    >
      <div className="ui-toolbar mb-3 shrink-0">
        <Input
          className="min-w-40 flex-1"
          aria-label={t('common.search')}
          placeholder={t('common.search')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button variant="outline" disabled={!current} onClick={() => setEditing(true)}>
          <Pencil />
          {t('profile.editRule')}
        </Button>
        <Button variant="ghost" aria-label={t('redesign.refreshStatus')} onClick={refresh}>
          <RefreshCcw />
        </Button>
        <Button
          variant="ghost"
          aria-label={t('pages.resources.title')}
          onClick={() => navigate('/resources')}
        >
          <Database />
        </Button>
      </div>
      <p className="ui-description mb-3 shrink-0">
        {t('redesign.ruleScope', { name: current?.name || t('pages.home.noProfile') })}
      </p>
      {controledMihomoConfig?.mode !== 'rule' && (
        <p role="status" className="mb-3 rounded-lg border p-3 text-sm">
          {t('redesign.rulesInactive')}
        </p>
      )}
      <Tabs className="mb-4 shrink-0" value={source} onValueChange={setSource}>
        <TabsList aria-label={t('redesign.ruleSource')}>
          <TabsTrigger value="runtime">
            {t('redesign.runtimeRules')} ({rules?.rules.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="custom">{t('redesign.customRules')}</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-card">
        {source === 'runtime' ? (
          filtered.length ? (
            <Virtuoso
              data={filtered}
              itemContent={(index, rule) => <RuleItem {...rule} index={index} />}
            />
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {t(query ? 'redesign.noResults' : 'redesign.noRules')}
            </p>
          )
        ) : error ? (
          <p role="alert" className="p-4 text-destructive">
            {String(error)}
          </p>
        ) : !overrides && current ? (
          <p className="p-4">{t('redesign.loading')}</p>
        ) : custom.length ? (
          <Virtuoso
            data={custom}
            itemContent={(_, item) => (
              <article className="border-b p-4">
                <span className="text-xs text-muted-foreground">
                  {t(`redesign.${item.section}Rules`)}
                </span>
                <p className="select-text mt-1 break-words font-mono text-sm">{item.value}</p>
              </article>
            )}
          />
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {t(query ? 'redesign.noResults' : 'redesign.noCustomRules')}
          </p>
        )}
      </div>
      {editing && current && (
        <EditRulesModal
          id={current.id}
          onClose={() => {
            setEditing(false)
            refresh()
          }}
        />
      )}
    </BasePage>
  )
}
