import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

interface Props {
  trigger: ReactNode
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  danger?: boolean
  children?: ReactNode
}

/** Accessible confirmation for irreversible actions (launching a mission, resetting the game). */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  danger,
  children,
}: Props) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog">
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
          <Dialog.Description className="dialog-description">{description}</Dialog.Description>
          {children}
          <div className="dialog-actions">
            <Dialog.Close asChild>
              <button type="button" className="btn">
                Cancelar
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button
                type="button"
                className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
