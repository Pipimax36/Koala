import React from 'react'
const colors = {
  error: 'text-destructive',
  warning: 'text-warning',
  info: 'text-foreground',
  debug: 'text-muted-foreground'
}
const LogItem: React.FC<ControllerLog & { index: number }> = ({ type, payload, time }) => (
  <article className="select-text border-b px-4 py-3 font-mono text-xs">
    <div className="mb-1 flex flex-wrap gap-3">
      <span className={`font-semibold ${colors[type]}`}>{type.toUpperCase()}</span>
      <time className="text-muted-foreground">{time}</time>
    </div>
    <p className="whitespace-pre-wrap break-words leading-relaxed">{payload}</p>
  </article>
)
export default LogItem
