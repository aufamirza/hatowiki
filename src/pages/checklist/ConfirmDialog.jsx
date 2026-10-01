import { useEffect, useId, useRef } from 'react'
import { useI18n } from '../../i18n/I18nProvider'

/**
 * Dialog konfirmasi (elemen <dialog> modal: fokus terkunci di dalamnya, Escape membatalkan). Fokus awal di tombol Batal,
 * supaya Enter yang tidak sengaja tidak menjalankan tindakan yang tidak bisa dibatalkan. Tampil selama `open` true.
 */
function ConfirmDialog({ open, title, children, confirmLabel, tone = 'danger', onConfirm, onCancel }) {
  const { t } = useI18n()
  const ref = useRef(null)
  const titleId = useId()
  const textId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.querySelector('.confirm-dialog__cancel')?.focus()
    } else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={textId}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      // Klik di latar (di luar kotak dialog) membatalkan.
      onClick={(event) => event.target === ref.current && onCancel()}
    >
      {open && (
        <div className="confirm-dialog__box">
          <h2 id={titleId} className="confirm-dialog__title">
            {title}
          </h2>
          <div id={textId} className="confirm-dialog__text">
            {children}
          </div>
          <div className="confirm-dialog__actions">
            <button type="button" className="btn btn--ghost confirm-dialog__cancel" onClick={onCancel}>
              {t('checklist.cancel')}
            </button>
            <button type="button" className={`btn confirm-dialog__confirm confirm-dialog__confirm--${tone}`} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}

export default ConfirmDialog
