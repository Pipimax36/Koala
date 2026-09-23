import React from 'react'
const RuleItem: React.FC<ControllerRulesDetail & { index: number }> = ({
  type,
  payload,
  proxy,
  index
}) => (
  <article className="flex items-start gap-4 border-b px-4 py-3 text-sm">
    <span className="w-8 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
      {index + 1}
    </span>
    <div className="min-w-0 flex-1">
      <p className="select-text break-words font-mono">{payload || type}</p>
      <p className="mt-1 text-xs text-muted-foreground">{type}</p>
    </div>
    <span className="max-w-[35%] break-words rounded-md bg-muted px-2 py-1 text-xs">{proxy}</span>
  </article>
)
export default RuleItem
