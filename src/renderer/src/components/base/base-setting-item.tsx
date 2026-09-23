import { Separator } from '@renderer/components/ui/separator'

import React from 'react'

interface Props {
  title: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  divider?: boolean
}

const SettingItem: React.FC<Props> = (props) => {
  const { title, actions, children, divider = false } = props

  return (
    <>
      <div className="min-h-8 w-full flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex items-center">
          <h4 className="text-sm leading-8 break-words">{title}</h4>
          <div>{actions}</div>
        </div>
        {children}
      </div>
      {divider && <Separator className="my-2" />}
    </>
  )
}

export default SettingItem
