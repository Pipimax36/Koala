import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { GripVertical, RefreshCcw, MoreHorizontal, Check } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import ConfirmModal from '@renderer/components/base/base-confirm'
import { calcTraffic } from '@renderer/utils/calc'
import { openFile } from '@renderer/utils/ipc'
import EditFileModal from './edit-file-modal'
import EditRulesModal from './edit-rules-modal'
import EditInfoModal from './edit-info-modal'

interface Props {
  info: ProfileItem
  isCurrent: boolean
  addProfileItem: (item: Partial<ProfileItem>) => Promise<void>
  updateProfileItem: (item: ProfileItem) => Promise<void>
  removeProfileItem: (id: string) => Promise<void>
  onClick: () => Promise<void>
  switching: boolean
  sortingDisabled?: boolean
}

export default function ProfileItem({
  info,
  isCurrent,
  addProfileItem,
  updateProfileItem,
  removeProfileItem,
  onClick,
  switching,
  sortingDisabled
}: Props) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<'info' | 'file' | 'rules' | 'delete' | null>(null)
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: info.id,
    disabled: sortingDisabled || busy || switching
  })
  const extra = info.extra
  const hasUsage =
    extra?.upload !== undefined &&
    extra?.download !== undefined &&
    extra?.total !== undefined &&
    extra.total > 0
  const used = (extra?.upload ?? 0) + (extra?.download ?? 0)
  const expired = Boolean(extra?.expire && extra.expire * 1000 < Date.now())
  async function run(action: () => Promise<void>): Promise<void> {
    if (busy || switching) return
    setBusy(true)
    try {
      await action()
    } catch (error) {
      toast.error(String(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`ui-panel ${isCurrent ? 'border-primary/50' : ''}`}
      aria-busy={busy}
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={sortingDisabled || busy || switching}
          aria-label={t('redesign.reorderProfile', { name: info.name })}
          className="cursor-grab rounded p-1 text-muted-foreground disabled:opacity-30"
        >
          <GripVertical className="size-4" />
        </button>
        {info.logo && <img src={info.logo} alt="" className="size-8 rounded-md" />}
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-base font-semibold">{info.name}</h2>
          <p className="ui-description mt-1">
            {t(info.type === 'remote' ? 'common.remote' : 'common.local')}
            {isCurrent && (
              <span className="ml-3 inline-flex items-center gap-1 text-foreground">
                <Check className="size-3" />
                {t('redesign.currentProfile')}
              </span>
            )}
          </p>
        </div>
        <div className="ui-toolbar">
          {!isCurrent && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy || switching}
              onClick={() => void run(onClick)}
            >
              {t('redesign.useProfile')}
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setDialog('info')}>
            {t('profile.editInfo')}
          </Button>
          {info.type === 'remote' && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('redesign.updateSubscription')}
              disabled={busy || switching}
              onClick={() => void run(() => addProfileItem(info))}
            >
              <RefreshCcw className={busy ? 'animate-spin' : ''} />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={busy}
                aria-label={t('redesign.moreActions')}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDialog('file')}>
                {t('profile.editFile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialog('rules')}>
                {t('profile.editRule')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void run(() => openFile(info.id))}>
                {t('profile.openFile')}
              </DropdownMenuItem>
              {info.home && (
                <DropdownMenuItem onClick={() => open(info.home)}>
                  {t('profile.homepage')}
                </DropdownMenuItem>
              )}
              {info.supportUrl && (
                <DropdownMenuItem onClick={() => open(info.supportUrl)}>
                  {t('profile.support')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onClick={() => setDialog('delete')}>
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {hasUsage && (
        <div
          role="progressbar"
          aria-label={t('redesign.usedTraffic')}
          aria-valuenow={Math.min(100, Math.round((used / extra!.total) * 100))}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-4 h-1 overflow-hidden rounded bg-muted"
        >
          <div
            className="h-full bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, (used / extra!.total) * 100))}%` }}
          />
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span>
          {t('profile.trafficRemaining')}:{' '}
          {hasUsage ? calcTraffic(Math.max(0, extra!.total - used)) : t('redesign.notProvided')}
        </span>
        <span className={expired ? 'text-destructive' : ''}>
          {t('pages.home.expires')}{' '}
          {extra?.expire ? dayjs.unix(extra.expire).format('L') : t('redesign.notProvided')}
          {expired && ` · ${t('pages.home.subscriptionExpired')}`}
        </span>
        {info.updated && (
          <span>
            {t('profile.updatedAt')}: {dayjs(info.updated).fromNow()}
          </span>
        )}
        {info.autoUpdate && info.interval && (
          <span>
            {t('profile.autoUpdate')}: {info.interval} {t('profile.minuteShort')}
          </span>
        )}
      </div>
      {dialog === 'info' && (
        <EditInfoModal
          item={info}
          isCurrent={isCurrent}
          updateProfileItem={updateProfileItem}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'file' && <EditFileModal id={info.id} onClose={() => setDialog(null)} />}
      {dialog === 'rules' && <EditRulesModal id={info.id} onClose={() => setDialog(null)} />}
      {dialog === 'delete' && (
        <ConfirmModal
          title={t('profile.confirmDeleteProfile')}
          description={
            <>
              {info.name}
              {isCurrent && <p className="mt-2">{t('redesign.deleteCurrentHint')}</p>}
            </>
          }
          onChange={(open) => {
            if (!open) setDialog(null)
          }}
          onConfirm={async () => {
            setDialog(null)
            await run(() => removeProfileItem(info.id))
          }}
        />
      )}
    </article>
  )
}
