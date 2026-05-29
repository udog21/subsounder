import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../marketing.module.css'

export const metadata: Metadata = {
  title: 'Privacy Policy — SubSounder',
  description:
    'How SubSounder collects, uses, stores, and shares the data you send by forwarding subscription emails to your alias.',
}

const LAST_UPDATED = '2026-05-28'
const CONTACT_EMAIL = 'support@subsounder.com'

export default function PrivacyPage() {
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
            <h1 className={styles.proseTitle}>Privacy Policy</h1>
          </div>
        </div>
        <p className={styles.proseUpdated}>Last updated: {LAST_UPDATED}</p>
      </header>

      <section className={styles.proseSection}>
        <p className={styles.proseNote}>
          <strong>Private preview notice.</strong> SubSounder is currently in
          private preview. This Privacy Policy describes our current data
          practices; we will publish an updated version, including the names
          of our subprocessors, before SubSounder becomes generally available.
        </p>
        <p>
          SubSounder (&ldquo;<strong>SubSounder</strong>,&rdquo; &ldquo;
          <strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>&rdquo;) helps
          you track your recurring subscriptions by parsing emails routed to
          a unique alias address we assign you. This Privacy Policy explains
          what we collect, why, how we use it, and the limited set of service
          providers we share it with.
        </p>
        <p>
          We do <strong>not</strong> connect to your bank or credit card. We
          do <strong>not</strong> ask for read access to your inbox. You
          decide which emails reach us by configuring a forwarding rule in
          your email client &mdash; or by forwarding individual messages
          manually.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>1. Information we collect</h2>

        <h3>a. Account information</h3>
        <ul>
          <li>
            <strong>Email address</strong> &mdash; collected when you sign up
            via magic link. Used to authenticate you and to send you renewal
            reminders and product notifications.
          </li>
        </ul>

        <h3>b. Forwarded email content</h3>
        <ul>
          <li>
            <strong>Subject, sender, recipient, headers, and body</strong> of
            each email that arrives at your SubSounder alias.
          </li>
          <li>
            <strong>HTML and plain-text versions</strong> of the message body,
            stored as the raw signal that feeds our parser.
          </li>
        </ul>
        <p>
          We do not connect to or scan any inbox. We only see emails routed
          to your alias &mdash; typically by a forwarding rule you set up
          once in your email client, or by individual messages you forward by
          hand. You stay in control of what reaches us by choosing which
          senders the rule covers.
        </p>

        <h3>c. Information derived from forwarded emails</h3>
        <ul>
          <li>
            Subscription identity (provider, product, plan, instance), amount,
            currency, billing cadence, next renewal date, trial end date, and
            cancellation metadata.
          </li>
          <li>
            Diagnostic records of each parsing attempt (success, retry,
            classification outcome).
          </li>
        </ul>

        <h3>d. Usage and technical data</h3>
        <ul>
          <li>
            Standard server logs: IP address, user agent, request timestamps,
            and routing metadata necessary to operate the service.
          </li>
          <li>
            A first-party session cookie used to keep you signed in. We do
            not use third-party analytics or advertising trackers.
          </li>
        </ul>
      </section>

      <section className={styles.proseSection}>
        <h2>2. How we use your information</h2>
        <ul>
          <li>
            Parse forwarded emails into a structured catalog of your
            subscriptions.
          </li>
          <li>
            Send renewal-reminder emails and product notifications you have
            opted into by creating an account.
          </li>
          <li>
            Operate, maintain, debug, and improve the service &mdash;
            including improving parser accuracy on the data you have already
            chosen to forward.
          </li>
          <li>
            Comply with applicable law and protect the security and integrity
            of the service.
          </li>
        </ul>
        <p>
          We do not sell your personal information. We do not use your
          forwarded email content to train third-party AI models for general
          use; see &sect;3 for the limited LLM processing we do perform.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>3. Service providers we share data with</h2>
        <p>
          We rely on a small number of service providers (subprocessors) to
          operate the service. Each receives only the data needed to deliver
          its part of the service:
        </p>
        <ul>
          <li>
            An <strong>email service provider</strong> that receives the
            messages routed to your alias and delivers our outbound emails
            (renewal reminders and account notifications).
          </li>
          <li>
            A <strong>managed database and authentication provider</strong>{' '}
            that hosts your account, your parsed subscription catalog, and
            the raw forwarded email content.
          </li>
          <li>
            A <strong>large language model API</strong> that receives the
            normalized text of each forwarded email so it can extract
            structured subscription data. Per the provider&rsquo;s API terms,
            content sent through the API is not used to train its general
            models.
          </li>
          <li>
            A <strong>hosting and edge-delivery provider</strong> that hosts
            the application, terminates TLS, and handles edge routing.
          </li>
        </ul>
        <p>
          We will publish the names of our current subprocessors before
          SubSounder leaves private preview.
        </p>
        <p>
          Beyond these subprocessors, we share personal information only
          when required to do so by law, when necessary to protect the rights
          and safety of users or the public, or in connection with a
          corporate transaction (merger, acquisition, sale of assets) &mdash;
          and you will be notified before your information is transferred to
          a successor with a different privacy policy.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>4. Data retention</h2>
        <ul>
          <li>
            <strong>Account data</strong> is retained while your account is
            active.
          </li>
          <li>
            <strong>Forwarded email content and your subscription catalog</strong>{' '}
            are retained while your account is active.
          </li>
          <li>
            <strong>Server logs</strong> are retained for a limited period
            sufficient to debug and operate the service, typically no longer
            than ninety (90) days.
          </li>
          <li>
            When you request deletion, we delete your account, your forwarded
            email content, and the subscription catalog associated with your
            account within thirty (30) days.
          </li>
          <li>
            We retain <strong>aggregate parser diagnostic records</strong>{' '}
            (the per-attempt records of how the parser performed and the
            structured subscription signals it extracted) for ongoing parser
            evaluation and improvement. After account deletion these records
            are no longer linked to your account or your email address.
          </li>
        </ul>
      </section>

      <section className={styles.proseSection}>
        <h2>5. Your rights</h2>
        <p>
          You may request to access, correct, export, or delete your data at
          any time by emailing{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Depending
          on where you live, you may also have additional rights under the
          GDPR, CCPA, or other applicable privacy laws &mdash; including the
          right to object to or restrict certain processing. We will honor
          those rights as required by law.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>6. Security</h2>
        <p>
          We use industry-standard practices to protect your data, including
          TLS for data in transit, encryption at rest where our subprocessors
          provide it, scoped row-level security in our database, and
          least-privilege access for engineering personnel. No system is
          perfectly secure; if you believe your account has been compromised,
          please contact us immediately.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>7. Children&rsquo;s privacy</h2>
        <p>
          SubSounder is not directed to children under 13, and we do not
          knowingly collect personal information from children under 13. If
          you believe we have collected information from a child under 13,
          please contact us and we will delete it.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>8. International users</h2>
        <p>
          SubSounder operates from the United States. If you access the
          service from outside the United States, you understand that your
          information will be transferred to, stored in, and processed in the
          United States and in any country in which our subprocessors
          operate.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>9. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make
          material changes, we will notify you by email and update the
          &ldquo;Last updated&rdquo; date above. Continued use of the service
          after the effective date of an update constitutes acceptance of the
          updated policy.
        </p>
      </section>

      <section className={styles.proseSection}>
        <h2>10. Contact us</h2>
        <p>
          Questions, requests, or concerns about this policy or your data:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </main>
  )
}
