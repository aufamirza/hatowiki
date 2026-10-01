import { useRef, useState } from 'react'
import { Download, HardDrive, TriangleAlert, Upload } from 'lucide-react'
import { useI18n } from '../../i18n/I18nProvider'
import { backupFileName, createBackup, isStoragePersistent, parseBackup, restoreBackup } from './checklistStore'
import { CHECKLIST_KINDS } from './checklistKinds'
import ConfirmDialog from './ConfirmDialog'

const ERROR_KEYS = { json: 'checklist.restoreErrorJson', kind: 'checklist.restoreErrorKind', version: 'checklist.restoreErrorVersion', read: 'checklist.restoreErrorRead' }

// Jumlah entri yang dikenali per kategori di sebuah cadangan, mis. "Fish 42, Bugs 10, dan Achievements 3".
function useBackupSummary() {
  const { t, formatList } = useI18n()
  return (data) => {
    const parts = CHECKLIST_KINDS.map((kind) => {
      const slugs = new Set(data.obtained[kind.slug] ?? [])
      const count = kind.entries.filter((entry) => slugs.has(entry.slug)).length
      return count ? t('checklist.summaryItem', { name: kind.name, count }) : null
    }).filter(Boolean)
    return parts.length ? formatList(parts) : t('checklist.summaryEmpty')
  }
}

/**
 * Kotak "Simpan progres": penjelasan bahwa progres hanya ada di browser ini, tombol Cadangkan (unduh berkas JSON) dan
 * Pulihkan (pilih berkas JSON, konfirmasi, lalu ganti progres). Berkas dibaca di browser; tidak ada yang diunggah ke
 * server mana pun.
 */
function BackupPanel() {
  const { t } = useI18n()
  const fileRef = useRef(null)
  const [message, setMessage] = useState(null)
  const [pending, setPending] = useState(null)
  const summarize = useBackupSummary()
  const persistent = isStoragePersistent()

  const download = () => {
    const now = new Date()
    const file = backupFileName(now)
    const url = URL.createObjectURL(new Blob([createBackup(now)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = file
    document.body.append(link)
    link.click()
    link.remove()
    // Unduhan butuh alamat blob sebentar setelah klik.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    setMessage({ tone: 'ok', text: t('checklist.backupDone', { file }) })
  }

  const chooseFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    let text
    try {
      text = await file.text()
    } catch {
      setMessage({ tone: 'error', text: t(ERROR_KEYS.read, { file: file.name }) })
      return
    }
    const result = parseBackup(text)
    if (!result.ok) {
      setMessage({ tone: 'error', text: t(ERROR_KEYS[result.error], { file: file.name }) })
      return
    }
    setMessage(null)
    setPending({ file: file.name, data: result.data })
  }

  const confirmRestore = () => {
    restoreBackup(pending.data)
    setMessage({ tone: 'ok', text: t('checklist.restoreDone', { file: pending.file }) })
    setPending(null)
  }

  return (
    <section className="checklist-panel backup-panel" aria-labelledby="backup-title">
      <h2 id="backup-title" className="backup-panel__title">
        <HardDrive aria-hidden="true" />
        {t('checklist.saveTitle')}
      </h2>
      <p className="backup-panel__text">{t('checklist.saveText')}</p>
      {!persistent && (
        <p className="backup-panel__warning">
          <TriangleAlert aria-hidden="true" />
          {t('checklist.storageBlocked')}
        </p>
      )}
      <div className="backup-panel__actions">
        <button type="button" className="btn btn--primary backup-panel__backup" onClick={download}>
          <Download aria-hidden="true" />
          <span className="backup-panel__label">
            {t('checklist.backup')}
            <span className="backup-panel__hint">{t('checklist.backupHint')}</span>
          </span>
        </button>
        <button type="button" className="btn btn--ghost backup-panel__restore" onClick={() => fileRef.current?.click()}>
          <Upload aria-hidden="true" />
          <span className="backup-panel__label">
            {t('checklist.restore')}
            <span className="backup-panel__hint">{t('checklist.restoreHint')}</span>
          </span>
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="visually-hidden" tabIndex={-1} aria-hidden="true" onChange={chooseFile} />
      </div>
      <p className="backup-panel__status" role="status" data-tone={message?.tone}>
        {message?.text}
      </p>

      <ConfirmDialog
        open={pending !== null}
        title={t('checklist.restoreTitle')}
        confirmLabel={t('checklist.restoreConfirm')}
        tone="primary"
        onConfirm={confirmRestore}
        onCancel={() => setPending(null)}
      >
        {pending && <p>{t('checklist.restoreText', { file: pending.file, summary: summarize(pending.data) })}</p>}
      </ConfirmDialog>
    </section>
  )
}

export default BackupPanel
