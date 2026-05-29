import type { ReactNode } from 'react'
import Link from 'next/link'
import { JetBrains_Mono } from 'next/font/google'
import styles from './marketing.module.css'

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${mono.className} ${styles.shell}`}>
      <div className={styles.shellInner}>
        {children}
        <footer className={styles.footer}>
          <div className={styles.footerLinks}>
            <Link href="/">Home</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="mailto:support@subsounder.com">Contact</a>
          </div>
          <p className={styles.footerSmall}>
            &copy; {new Date().getFullYear()} SubSounder. Submarine icon by{' '}
            <a
              href="https://www.flaticon.com/free-icons/submarine"
              target="_blank"
              rel="noopener noreferrer"
            >
              Flaticon
            </a>
            .
          </p>
        </footer>
      </div>
    </div>
  )
}