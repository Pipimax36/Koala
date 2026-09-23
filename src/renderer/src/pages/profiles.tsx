import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import BasePage from '@renderer/components/base/base-page'
import ProfileItem from '@renderer/components/profiles/profile-item'
import EditInfoModal from '@renderer/components/profiles/edit-info-modal'
import { useProfileConfig } from '@renderer/hooks/use-profile-config'
import { readTextFile } from '@renderer/utils/ipc'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { Input } from '@renderer/components/ui/input'
import { useTranslation } from 'react-i18next'
import { Plus, FileDown, RefreshCcw } from 'lucide-react'

const emptyItems: ProfileItem[] = []

const Profiles: React.FC = () => {
  const { t } = useTranslation()
  const {
    profileConfig,
    setProfileConfig,
    addProfileItem,
    updateProfileItem,
    removeProfileItem,
    changeCurrentProfile
  } = useProfileConfig()
  const { current, items } = profileConfig || {}
  const itemsArray = items ?? emptyItems
  const [sortedItems, setSortedItems] = useState(itemsArray)
  const [query, setQuery] = useState('')
  const [updating, setUpdating] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [fileOver, setFileOver] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ProfileItem | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2
      }
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const pageRef = useRef<HTMLDivElement>(null)
  const dragCounterRef = useRef(0)
  const addProfileItemRef = useRef(addProfileItem)
  addProfileItemRef.current = addProfileItem
  const tRef = useRef(t)
  tRef.current = t

  const onDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    if (!over || active.id === over.id || query) return
    const activeIndex = sortedItems.findIndex((item) => item.id === active.id)
    const overIndex = sortedItems.findIndex((item) => item.id === over.id)
    if (activeIndex < 0 || overIndex < 0) return
    const newOrder = arrayMove(sortedItems, activeIndex, overIndex)
    setSortedItems(newOrder)
    try {
      await setProfileConfig({ current, items: newOrder })
    } catch (error) {
      setSortedItems(itemsArray)
      toast.error(String(error))
    }
  }

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (dragCounterRef.current === 1) {
      setFileOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setFileOver(false)
    }
  }, [])

  const handleDrop = useCallback(async (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    dragCounterRef.current = 0
    setFileOver(false)
    if (event.dataTransfer?.files) {
      const file = event.dataTransfer.files[0]
      if (!file) return
      if (
        file.name.endsWith('.yml') ||
        file.name.endsWith('.yaml') ||
        file.name.endsWith('.json') ||
        file.name.endsWith('.jsonc') ||
        file.name.endsWith('.json5') ||
        file.name.endsWith('.txt')
      ) {
        try {
          const path = window.api.webUtils.getPathForFile(file)
          const content = await readTextFile(path)
          await addProfileItemRef.current({ name: file.name, type: 'local', file: content })
        } catch (e) {
          toast.error(tRef.current('pages.profiles.fileImportFailed') + e)
        }
      } else {
        toast.error(tRef.current('pages.profiles.unsupportedFileType'))
      }
    }
  }, [])

  useEffect(() => {
    const el = pageRef.current
    if (!el) return
    el.addEventListener('dragover', handleDragOver)
    el.addEventListener('dragenter', handleDragEnter)
    el.addEventListener('dragleave', handleDragLeave)
    el.addEventListener('drop', handleDrop)
    return (): void => {
      el.removeEventListener('dragover', handleDragOver)
      el.removeEventListener('dragenter', handleDragEnter)
      el.removeEventListener('dragleave', handleDragLeave)
      el.removeEventListener('drop', handleDrop)
    }
  }, [handleDragOver, handleDragEnter, handleDragLeave, handleDrop])

  useEffect(() => {
    setSortedItems(itemsArray)
  }, [itemsArray])

  const handleAddProfile = (): void => {
    const newProfile: ProfileItem = {
      id: '',
      name: '',
      type: 'remote',
      url: '',
      useProxy: false,
      autoUpdate: true
    }
    setEditingItem(newProfile)
    setShowEditModal(true)
  }

  return (
    <BasePage ref={pageRef} title={t('pages.profiles.title')} contentClassName="ui-page">
      <div className="ui-toolbar mb-5">
        <Input
          className="min-w-40 flex-1"
          aria-label={t('common.search')}
          placeholder={t('common.search')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button className="new-profile" onClick={handleAddProfile}>
          <Plus />
          {t('pages.profiles.addProfile')}
        </Button>
        <Button
          variant="outline"
          disabled={updating || !itemsArray.some((item) => item.type === 'remote')}
          onClick={async () => {
            if (updating) return
            setUpdating(true)
            try {
              const ordered = [
                ...itemsArray.filter((item) => item.id !== current),
                ...itemsArray.filter((item) => item.id === current)
              ]
              for (const item of ordered) {
                if (item.type !== 'remote') continue
                try {
                  await addProfileItem(item)
                } catch (error) {
                  toast.error(`${item.name}: ${error}`)
                }
              }
            } finally {
              setUpdating(false)
            }
          }}
        >
          <RefreshCcw className={updating ? 'animate-spin' : ''} />
          {t('pages.profiles.updateAll')}
        </Button>
      </div>
      <p className="ui-description mb-4">{t('redesign.profileHint')}</p>
      {showEditModal && editingItem && (
        <EditInfoModal
          item={editingItem}
          isCurrent={editingItem.id === current}
          updateProfileItem={async (item: ProfileItem) => {
            await addProfileItem(item)
          }}
          onClose={() => {
            setShowEditModal(false)
            setEditingItem(null)
          }}
        />
      )}

      {/* File drop overlay */}
      {fileOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 px-12 py-8">
            <FileDown className="size-10 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t('pages.profiles.dropFileHint')}
            </span>
          </div>
        </div>
      )}

      {query &&
        !sortedItems.some((item) =>
          item.name.toLowerCase().includes(query.trim().toLowerCase())
        ) && (
          <p role="status" className="ui-panel">
            {t('redesign.noResults')}
          </p>
        )}
      {sortedItems.length === 0 ? (
        <div className="ui-panel min-h-64 w-full flex justify-center items-center">
          <div className="flex flex-col items-center gap-3">
            <Button
              className="rounded-full w-20 h-20 hover:bg-card"
              variant="outline"
              onClick={handleAddProfile}
            >
              <Plus className="text-muted-foreground size-10" />
            </Button>
            <h2 className="text-muted-foreground text-lg font-medium">
              {t('pages.profiles.emptyTitle')}
            </h2>
            <p className="text-muted-foreground/70 text-sm">
              {t('pages.profiles.emptyDescription')}
            </p>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className="flex flex-col gap-3">
            <SortableContext
              items={sortedItems.map((item) => {
                return item.id
              })}
            >
              {sortedItems
                .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
                .map((item) => (
                  <ProfileItem
                    key={item.id}
                    isCurrent={item.id === current}
                    addProfileItem={addProfileItem}
                    removeProfileItem={removeProfileItem}
                    updateProfileItem={updateProfileItem}
                    info={item}
                    switching={switching}
                    sortingDisabled={Boolean(query)}
                    onClick={async () => {
                      setSwitching(true)
                      try {
                        await changeCurrentProfile(item.id)
                      } finally {
                        setSwitching(false)
                      }
                    }}
                  />
                ))}
            </SortableContext>
          </div>
        </DndContext>
      )}
    </BasePage>
  )
}

export default Profiles
