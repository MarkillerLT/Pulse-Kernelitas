import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="page-header">
      <span className="eyebrow">{eyebrow}</span>
      <h1>
        {title}
        <span className="cursor" aria-hidden="true">
          _
        </span>
      </h1>
      {children && <p className="lede">{children}</p>}
    </div>
  )
}
