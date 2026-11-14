import { useId, type ReactNode } from 'react'

interface Props {
  title: ReactNode
  code?: string
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function Panel({ title, code, actions, className, children }: Props) {
  const id = useId()
  return (
    <section className={`panel${className ? ` ${className}` : ''}`} aria-labelledby={id}>
      <header className="panel-head">
        <h2 id={id}>{title}</h2>
        {code && <span className="panel-code">{code}</span>}
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  )
}
