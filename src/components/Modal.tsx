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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 md:p-8"
      onMouseDown={dismissible ? onClose : undefined}
    >
      <div
        // Capped to the viewport (dynamic units so the on-screen keyboard
        // doesn't hide the body) with a scrollable content region.
        className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-lg bg-white shadow-xl md:max-h-[calc(100dvh-4rem)] ${widthClass}`}
        onMouseDown={(e) => e.stopPropagation()}
        // Contain form submits so an inner modal's form doesn't bubble up the
        // React tree (across the portal) to an ancestor modal's <form>.
        onSubmit={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:min-h-0 md:min-w-0 md:p-1"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>
        <div className="min-h-0 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          // Buttons get a 44px min tap height on touch; reset on desktop.
          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4 [&_button]:min-h-11 md:[&_button]:min-h-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
