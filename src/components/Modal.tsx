import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Optional footer content, typically action buttons. */
  footer?: ReactNode
  widthClass?: string
  /**
   * When false, the modal can't be dismissed by clicking the backdrop, pressing
   * Escape, or the header ✕ — only by explicit actions in the footer. Guards
   * forms with unsaved input against accidental dismissal. Defaults to true.
   */
  dismissible?: boolean
}

export default function Modal({
  title,
  onClose,
  children,
  footer,
  widthClass = 'max-w-3xl',
  dismissible = true,
}: ModalProps) {
  useEffect(() => {
    if (!dismissible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, dismissible])

  // Rendered through a portal so a modal's content (e.g. its own <form>) is
  // never nested inside a parent modal's <form>, which would misroute submits.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-8"
      onMouseDown={dismissible ? onClose : undefined}
    >
      <div
        className={`w-full ${widthClass} rounded-lg bg-white shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
        // Contain form submits so an inner modal's form doesn't bubble up the
        // React tree (across the portal) to an ancestor modal's <form>.
        onSubmit={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
