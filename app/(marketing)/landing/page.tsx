import type { Metadata } from 'next'
import styles from './page.module.css'
import WaitlistForm from './WaitlistForm'

export const metadata: Metadata = {
  title: 'SubSounder — Subscription intelligence for modern software stacks',
  description:
    'Forward subscription emails to a unique alias. SubSounder builds a clean catalog of your stack and warns you before each trial expires or annual renewal hits.',
}

export default function LandingPage() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/submarine.svg"
          alt=""
          width={220}
          height={220}
          className={styles.submarine}
        />
        <h1 className={styles.tagline}>
          Subscription intelligence for modern software stacks
        </h1>
      </section>

      <section className={styles.section}>
        <ul className={styles.painList}>
          <li>Need to keep track of an ever-growing tool stack?</li>
          <li>Forgot to cancel a trial before it became a paid subscription?</li>
          <li>Worried about an expensive annual subscription auto-renewing silently?</li>
        </ul>
        <p className={styles.bodyEmphasis}>
          Set up auto-forwarding in your email client, then let us do the rest.
        </p>
        <p className={styles.body}>
          We&rsquo;ll compile a catalog of your stack and warn you before each
          trial expires or annual renewal hits. No spreadsheet to maintain.
          You&rsquo;re busy enough. We can help.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>How it works</h2>
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepNum}>1</span>
            <div>
              <strong>Forward subscription emails</strong> to the unique alias
              we assign you. Set a forwarding rule once and forget it;
              receipts, renewal notices, and trial-ending warnings flow in
              automatically.
            </div>
          </li>
          <li>
            <span className={styles.stepNum}>2</span>
            <div>
              <strong>AI extracts</strong> the provider, plan, amount, billing
              cadence, and next renewal date; matches each signal to a clean
              subscription record.
            </div>
          </li>
          <li>
            <span className={styles.stepNum}>3</span>
            <div>
              <strong>See everything in one catalog.</strong> Get a reminder
              before each charge hits, with a direct cancel link and a
              difficulty rating per subscription.
            </div>
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Why SubSounder</h2>
        <div className={styles.diffGrid}>
          <div className={styles.diffCard}>
            <h3 className={styles.diffH}>No bank, no inbox</h3>
            <p>
              We never touch your bank account, and we never ask for read
              access to your inbox. You decide what reaches us with a single
              forwarding rule.
            </p>
          </div>
          <div className={styles.diffCard}>
            <h3 className={styles.diffH}>Built for stack sprawl</h3>
            <p>
              Identifies the real subscription behind a vague charge &mdash;
              long-tail SaaS, prosumer tools, API credits &mdash; not just
              the well-known providers.
            </p>
          </div>
          <div className={styles.diffCard}>
            <h3 className={styles.diffH}>Warned, not categorized</h3>
            <p>
              A reminder before the charge hits &mdash; not a chart of what
              already cleared.
            </p>
          </div>
          <div className={styles.diffCard}>
            <h3 className={styles.diffH}>Cancellation intel</h3>
            <p>
              Direct cancel link and a difficulty rating for every
              subscription in your catalog.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Who this is for</h2>
        <p className={styles.body}>
          Indie hackers, vibe coders, AI-heavy freelancers, solo SaaS
          founders, makers, technical creators, and automation builders.
          Anyone running a sprawling work stack who refuses to hand over a
          bank account or an inbox just to track what they&rsquo;re paying
          for.
        </p>
      </section>

      <div className={styles.previewPillRow}>
        <div className={styles.previewPill}>Private preview</div>
      </div>

      <section className={styles.ctaSection}>
        <WaitlistForm />
        <p className={styles.ctaSub}>
          Access is invite-only while we&rsquo;re in private preview.
          Questions?{' '}
          <a href="mailto:support@subsounder.com">support@subsounder.com</a>.
        </p>
      </section>
    </main>
  )
}
