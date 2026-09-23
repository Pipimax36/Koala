import BasePage from '@renderer/components/base/base-page'
import LogItem from '@renderer/components/logs/log-item'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import ConfirmModal from '@renderer/components/base/base-confirm'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { useTranslation } from 'react-i18next'
import { useLogsStore } from '@renderer/store/logs-store'
import { includesIgnoreCase } from '@renderer/utils/includes'
import { MapPin, Trash2, Pause, Play } from 'lucide-react'

export default function Logs() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState(() => useLogsStore.getState().logs)
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')
  const [paused, setPaused] = useState(false)
  const [follow, setFollow] = useState(true)
  const [confirmClear, setConfirmClear] = useState(false)
  const list = useRef<VirtuosoHandle>(null)
  useEffect(() => {
    if (paused) return
    setLogs(useLogsStore.getState().logs)
    return useLogsStore.subscribe((state) => setLogs(state.logs))
  }, [paused])
  const filtered = useMemo(
    () =>
      logs.filter(
        (log) => (level === 'all' || log.type === level) && includesIgnoreCase(log.payload, query)
      ),
    [logs, level, query]
  )
  useEffect(() => {
    if (follow && !paused && filtered.length)
      list.current?.scrollToIndex({ index: filtered.length - 1, align: 'end' })
  }, [follow, paused, filtered.length])
  return (
    <BasePage
      title={t('pages.logs.title')}
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
        <select
          aria-label={t('pages.mihomo.logLevel')}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
        >
          <option value="all">{t('redesign.allLevels')}</option>
          {['debug', 'info', 'warning', 'error'].map((value) => (
            <option key={value} value={value}>
              {value.toUpperCase()}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={() => setPaused(!paused)} aria-pressed={paused}>
          {paused ? <Play /> : <Pause />}
          {t(paused ? 'connections.resume' : 'connections.pause')}
        </Button>
        <Button
          variant={follow ? 'secondary' : 'outline'}
          aria-pressed={follow}
          onClick={() => setFollow(!follow)}
        >
          <MapPin />
          {t('redesign.followLogs')}
        </Button>
        <Button variant="ghost" disabled={logs.length === 0} onClick={() => setConfirmClear(true)}>
          <Trash2 />
          {t('pages.logs.clearLogs')}
        </Button>
      </div>
      <p role="status" className="ui-description mb-4 shrink-0">
        {t(paused ? 'redesign.logsPaused' : 'redesign.logsHint')} · {filtered.length}/{logs.length}
      </p>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {t(query || level !== 'all' ? 'redesign.noResults' : 'redesign.noLogs')}
          </p>
        ) : (
          <Virtuoso
            ref={list}
            data={filtered}
            followOutput={follow && !paused}
            itemContent={(index, log) => <LogItem {...log} index={index} />}
          />
        )}
      </div>
      {confirmClear && (
        <ConfirmModal
          title={t('pages.logs.clearLogs')}
          description={t('redesign.clearLogsHint')}
          onChange={(open) => {
            if (!open) setConfirmClear(false)
          }}
          onConfirm={() => {
            useLogsStore.getState().clear()
            setLogs([])
            setConfirmClear(false)
          }}
        />
      )}
    </BasePage>
  )
}
