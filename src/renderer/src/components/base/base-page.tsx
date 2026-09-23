import { Button } from '@renderer/components/ui/button'
import { platform } from '@renderer/utils/init'
import WindowControls from '@renderer/components/window-controls'
import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@renderer/lib/utils'
import { useTranslation } from 'react-i18next'
import { SidebarTrigger } from '@renderer/components/ui/sidebar'
import { ChevronLeft } from 'lucide-react'

const sidebarPaths = new Set([
  '/home',
  '/profiles',
  '/proxies',
  '/connections',
  '/rules',
  '/logs',
  '/mihomo',
  '/settings'
])
const isMac = platform === 'darwin'

interface Props {
  title?: React.ReactNode
  header?: React.ReactNode
  children?: React.ReactNode
  contentClassName?: string
  showBackButton?: boolean
}

const BasePage = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const isSubPage = !sidebarPaths.has(location.pathname)

  const contentRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => {
    return contentRef.current as HTMLDivElement
  })

  return (
    <div ref={contentRef} className="w-full h-full">
      <div className="sticky top-0 z-40 h-14.25 w-full border-b border-border bg-background">
        <div
          className={cn(
            'app-drag px-4 pt-3 pb-2 flex justify-between gap-2 h-14.25',
            isMac && 'pl-20 md:pl-4'
          )}
        >
          <div className="title min-w-0 h-full text-base font-semibold leading-8 flex items-center gap-2">
            <SidebarTrigger
              className="app-nodrag md:hidden"
              aria-label={t('common.toggleSidebar')}
            />
            {(isSubPage || props.showBackButton) && (
              <Button
                size="icon-sm"
                variant="ghost"
                className="app-nodrag"
                aria-label={t('redesign.back')}
                onClick={() => navigate(-1)}
              >
                <ChevronLeft className="size-5" />
              </Button>
            )}
            {props.title}
          </div>
          <div className="header app-nodrag flex gap-1 h-full items-center">
            {props.header}
            {!isMac && <WindowControls />}
          </div>
        </div>
      </div>
      <div
        className={cn(
          'content h-[calc(100vh-57px)] overflow-y-auto custom-scrollbar',
          props.contentClassName
        )}
      >
        {props.children}
      </div>
    </div>
  )
})

BasePage.displayName = 'BasePage'
export default BasePage
