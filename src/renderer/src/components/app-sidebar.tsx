import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  HomeIcon,
  ProfileIcon,
  ProxiesIcon,
  ConnectionsIcon,
  RulesIcon,
  LogsIcon,
  SettingsIcon,
  CollapsedIcon,
  ExpandedIcon
} from '@renderer/components/icons/sidebar-icons'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@renderer/components/ui/sidebar'
import { Cpu } from 'lucide-react'
import ConfigViewer from '@renderer/components/sider/config-viewer'

const navItems = [
  { key: 'main', path: '/home', icon: HomeIcon, i18nKey: 'sider.home' },
  { key: 'proxy', path: '/proxies', icon: ProxiesIcon, i18nKey: 'sider.proxyGroup' },
  { key: 'profile', path: '/profiles', icon: ProfileIcon, i18nKey: 'sider.profileManagement' },
  { key: 'connection', path: '/connections', icon: ConnectionsIcon, i18nKey: 'sider.connection' },
  { key: 'rule', path: '/rules', icon: RulesIcon, i18nKey: 'sider.rules' },
  { key: 'log', path: '/logs', icon: LogsIcon, i18nKey: 'sider.logs' },
  { key: 'core', path: '/mihomo', icon: Cpu, i18nKey: 'sider.coreSettings' },
  { key: 'settings', path: '/settings', icon: SettingsIcon, i18nKey: 'common.settings' }
]

const AppSidebar: React.FC = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { toggleSidebar, state, isMobile, setOpenMobile } = useSidebar()
  const collapsed = state === 'collapsed'
  const [showRuntimeConfig, setShowRuntimeConfig] = useState(false)
  return (
    <Sidebar
      data-guide="app-sidebar"
      collapsible="icon"
      side="left"
      variant="sidebar"
      className="pt-14.25 bg-sidebar"
    >
      <div className="flex h-12 shrink-0 items-center gap-2 overflow-hidden px-3">
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground"
        >
          K
        </span>
        {!collapsed && <span className="truncate text-sm font-semibold">Koala Clash</span>}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname.includes(item.path)
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      className="h-10 cursor-pointer"
                      aria-label={t(item.i18nKey)}
                      aria-current={isActive ? 'page' : undefined}
                      tooltip={t(item.i18nKey)}
                      isActive={isActive}
                      data-guide={item.key === 'main' ? 'sidebar-home-button' : undefined}
                      onClick={() => {
                        navigate(item.path)
                        if (isMobile) setOpenMobile(false)
                      }}
                      onDoubleClick={
                        item.key === 'profile' ? () => setShowRuntimeConfig(true) : undefined
                      }
                    >
                      <Icon className="size-4" />
                      <span>{t(item.i18nKey)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col items-center gap-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={t('common.toggleSidebar')}
                onClick={toggleSidebar}
                className="cursor-pointer"
              >
                {collapsed ? (
                  <ExpandedIcon className="size-4 shrink-0" />
                ) : (
                  <CollapsedIcon className="size-4 shrink-0" />
                )}
                <span>{t('common.hideSidebar')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
      {showRuntimeConfig && <ConfigViewer onClose={() => setShowRuntimeConfig(false)} />}
    </Sidebar>
  )
}

export default AppSidebar
