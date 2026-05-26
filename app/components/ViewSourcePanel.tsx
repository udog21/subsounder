import styles from '../page.module.css'

export type SourceReceipt = {
  id: string
  message_id: string | null
  subject: string | null
  from_email: string | null
  received_at: string
  gmail_url: string | null
}

const dateOnly = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function buildGmailUrl(
  messageId: string | null,
  userEmail: string | null,
): string | null {
  if (!messageId) return null
  const cleanId = messageId.replace(/^<|>$/g, '').trim()
  if (!cleanId) return null
  const hash = `#search/rfc822msgid:${encodeURIComponent(cleanId)}`
  const trimmedUser = userEmail?.trim()
  if (trimmedUser) {
    return `https://mail.google.com/mail/?authuser=${encodeURIComponent(trimmedUser)}${hash}`
  }
  return `https://mail.google.com/mail/${hash}`
}

export default function ViewSourcePanel({ receipts }: { receipts: SourceReceipt[] }) {
  const linkable = receipts.filter((r) => r.gmail_url !== null)
  if (linkable.length === 0) return null

  return (
    <div className={styles.viewSource}>
      <div className={styles.viewSourceLabel}>Source emails</div>
      <ul className={styles.viewSourceList}>
        {linkable.map((r) => (
          <li key={r.id} className={styles.viewSourceItem}>
            <a
              href={r.gmail_url!}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.viewSourceLink}
            >
              <span className={styles.viewSourceSubject}>
                {r.subject ?? '(no subject)'}
              </span>
              <span className={styles.viewSourceDate}>
                {dateOnly.format(new Date(r.received_at))}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
