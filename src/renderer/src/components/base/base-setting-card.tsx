import React from 'react'
import { Card, CardContent } from '@renderer/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@renderer/components/ui/accordion'

interface Props {
  title?: string
  defaultExpanded?: boolean
  children?: React.ReactNode
  className?: string
}

const SettingCard: React.FC<Props> = (props) => {
  return !props.title ? (
    <Card className={`${props.className || ''} mb-3 border-border bg-card shadow-none`}>
      <CardContent>{props.children}</CardContent>
    </Card>
  ) : (
    <Accordion
      className={`${props.className || ''} mb-3 px-4 sm:px-6 rounded-xl border border-border bg-card text-card-foreground`}
      type="single"
      collapsible
      defaultValue={props.defaultExpanded ? props.title : undefined}
    >
      <AccordionItem value={props.title}>
        <AccordionTrigger>{props.title}</AccordionTrigger>
        <AccordionContent>{props.children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default SettingCard
