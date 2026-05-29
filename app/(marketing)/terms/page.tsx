import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../marketing.module.css'

export const metadata: Metadata = {
  title: 'Terms of Service — SubSounder',
  description:
    'Terms governing your use of the SubSounder private-preview service.',
}

const LAST_UPDATED = '2026-05-28'
const CONTACT_EMAIL = 'support@subsounder.com'

export default function TermsPage() {
  return (
    <main className={styles.prose}>
      <header className={styles.proseHeader}>
        <div className={styles.proseHeaderRow}>
          <div className={styles.proseHeaderTitleRow}>
            <Link
              href="/"
              className={styles.backArrow}
              aria-label="Back to home"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/back_arrow.svg" alt="" width={18} height={18} />
            </Link>
            <h1 className={styles.proseTitle}>Terms of Service</h1>
          </div>
          <div className={styles.previewPillHeader}>Private preview</div>
        </div>
        <p className={styles.proseUpdated}>Last updated: {LAST_UPDATED}</p>
      </header>

      <section className={styles.proseSection}>
        <p>
          These Terms of Service (the &ldquo;<strong>Terms</strong>&rdquo;)
          govern your use of SubSounder (the &ldquo;<strong>Service</strong>
          &rdquo;), an invite-only private-preview subscription-tracking
          product operated by SubSounder (&ldquo;<strong>SubSounder</strong>
          ,&rdquo; &ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>
          &rdquo;). By creating an account or using the Service, you agree to
          these Terms. If you do not agree, do not use the Service.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>1. The Service</h2>
        <p>
          SubSounder ingests subscription-related emails routed to a unique
          email alias we assign you, parses them with the help of a
          third-party large language model, and presents the result as a
          catalog of your subscriptions with renewal reminders.
        </p>
        <p>
          The Service is currently in <strong>private preview</strong>. It is
          provided to a small invite-only cohort for the purpose of testing
          and iteration. Features may change, break, or be removed without
          notice. The Service is not a substitute for reviewing your own
          bank or credit-card statements.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years old and able to form a legally
          binding contract to use the Service. By using the Service, you
          represent that you meet these requirements.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>3. Your account</h2>
        <p>
          You are responsible for safeguarding access to your account. You
          agree not to share your magic-link sign-in emails with anyone, and
          to notify us promptly at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you
          believe your account has been compromised.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>4. Forwarded content</h2>
        <p>
          By routing an email to your SubSounder alias &mdash; whether via an
          auto-forwarding rule in your email client or by forwarding the
          message manually &mdash; you grant us the right to receive, store,
          process, and parse that email and its contents solely for the
          purpose of operating the Service for you and improving the parser.
          You represent that you have the right to route each such email to
          us.
        </p>
        <p>
          Forwarded emails are processed as described in our{' '}
          <Link href="/privacy">Privacy Policy</Link>, including transmission
          to our LLM subprocessor for structured extraction.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            Use the Service in violation of any applicable law or third-party
            right.
          </li>
          <li>
            Forward content you do not have the legal right to send, or that
            contains another person&rsquo;s confidential information without
            authorization.
          </li>
          <li>
            Attempt to probe, scan, or test the vulnerability of the Service,
            or to circumvent any security, rate-limit, or access-control
            mechanism.
          </li>
          <li>
            Use the Service to send unsolicited bulk email, malware, or any
            content that is unlawful, harassing, or infringing.
          </li>
          <li>
            Reverse-engineer the Service or use it to build a competing
            product.
          </li>
        </ul>
      </section>

      <section className={styles.proseSection}>
        <h2>6. Fees</h2>
        <p>
          The private preview is provided at no cost. We may introduce paid
          plans in the future and will give you notice before any charges
          would apply to your account.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>7. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
          AVAILABLE,&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
          IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING
          OUT OF COURSE OF DEALING OR USAGE OF TRADE.
        </p>
        <p>
          We do not warrant that the parsing of any specific email will be
          accurate, that any renewal reminder will be delivered on time, or
          that the Service will be uninterrupted or error-free. The
          subscription catalog is best-effort information based on what you
          forward; treat it as a helpful signal, not as the canonical record
          of what you are paying for.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>8. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL SUBSOUNDER
          OR ITS AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS,
          REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF
          THE SERVICE. OUR TOTAL CUMULATIVE LIABILITY FOR ANY CLAIM ARISING
          OUT OF OR RELATED TO THESE TERMS OR THE SERVICE WILL NOT EXCEED ONE
          HUNDRED U.S. DOLLARS (US$100).
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>9. Termination</h2>
        <p>
          You may stop using the Service at any time and request account
          deletion by emailing{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
        <p>
          We may suspend or terminate your access to the Service at any
          time, with or without notice, including (without limitation) for
          violation of these Terms, for abuse of the Service, or because we
          are winding down or materially changing the private preview.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>10. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material
          changes, we will notify you by email and update the &ldquo;Last
          updated&rdquo; date above. Continued use of the Service after the
          effective date of an update constitutes acceptance of the updated
          Terms.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>11. Governing law</h2>
        <p>
          These Terms are governed by the laws of the State of California,
          United States, without regard to its conflict-of-laws principles.
          You and SubSounder agree that the state and federal courts located
          in California will have exclusive jurisdiction over any dispute
          arising out of or related to these Terms or the Service.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>12. Contact</h2>
        <p>
          Questions about these Terms:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </main>
  )
}
