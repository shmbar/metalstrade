import Navbar from '../../../components/Navbar/navbar';
import Footer from '../../../components/Footer/footer';
import HeroSection from '../../../components/Hero/HeroSection';
import { SUPPORT_EMAIL } from '../../../utils/publicContact';

// NOTE FOR MAINTAINERS: this is a plain-language summary written to give the
// footer's "Terms of Service" link a real destination, not legal advice. IMS is
// sold under signed subscription agreements, and section 1 says so — that
// agreement, not this page, is what binds. Have a lawyer review before treating
// this as the operative contract for any customer, and name a governing-law
// jurisdiction here if you ever want it to stand on its own.

export const metadata = {
  title: 'Terms of Service — IMS',
  description:
    'The terms on which the IMS web application and mobile apps are made available.',
};

const LAST_UPDATED = '10 September 2026';

const h2 = 'responsiveTextPage font-bold text-[var(--chathams-blue)] mb-3';
const p = 'responsiveTextTitle text-[var(--ink-secondary)] leading-relaxed mb-3';
const ul = 'responsiveTextTitle text-[var(--ink-secondary)] leading-relaxed mb-3 list-disc pl-6 space-y-1';

function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-8">
      <h2 className={h2}>{title}</h2>
      {children}
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="marketing w-full bg-[var(--bg-card)] min-h-screen font-sans text-foreground">
      <Navbar />
      <main className="pt-20">
        <HeroSection
          title="Terms of Service"
          subtitle="The terms on which IMS is made available to your organisation."
        />

        <div className="container mx-auto px-8 md:px-16 py-12 max-w-3xl">
          <p className={p}>Last updated: {LAST_UPDATED}</p>

          <Section id="agreement" title="1. These terms and your agreement">
            <p className={p}>
              IMS is a business operations platform for metals and alloys trading, licensed
              to companies under a subscription agreement. Where your organisation has
              signed such an agreement with us, that agreement governs your use of the
              Service, and it prevails over this page wherever the two differ. This page
              describes, in plain language, the terms that apply to everyone who uses IMS.
            </p>
            <p className={p}>
              &ldquo;Service&rdquo; means the IMS web application at ims-tech.io together
              with the IMS mobile applications for iOS and Android.
            </p>
          </Section>

          <Section id="accounts" title="2. Accounts and access">
            <p className={p}>
              Accounts are created and administered by your organisation, not by us and not
              through public sign-up. Your administrator decides who has an account and what
              each person may see. You are responsible for keeping your credentials
              confidential and for activity carried out under your account, and you should
              tell your administrator promptly if you believe your account has been misused.
            </p>
            <p className={p}>
              We may suspend an account where it is being used in breach of these terms, or
              where suspension is necessary to protect the Service or other customers.
            </p>
          </Section>

          <Section id="use" title="3. Acceptable use">
            <p className={p}>You agree not to:</p>
            <ul className={ul}>
              <li>Use the Service unlawfully, or in breach of trade, sanctions or export controls.</li>
              <li>Attempt to access data belonging to another organisation.</li>
              <li>Probe, scan or interfere with the security or integrity of the Service.</li>
              <li>Reverse engineer, resell or make the Service available to third parties outside your organisation.</li>
              <li>Upload malware, or content you have no right to upload.</li>
            </ul>
          </Section>

          <Section id="data" title="4. Your data">
            <p className={p}>
              The business records your organisation enters or uploads remain your
              organisation&rsquo;s property. We claim no ownership of them. We process them
              to provide the Service, as described in our{' '}
              <a
                href="/privacy"
                className="text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors"
              >
                Privacy Policy
              </a>
              , and we do not sell them or use them to advertise to you.
            </p>
            <p className={p}>
              Your organisation is responsible for the accuracy and lawfulness of the data it
              puts into the Service, and for having the right to upload documents concerning
              its counterparties.
            </p>
          </Section>

          <Section id="ai" title="5. AI-assisted features">
            <p className={p}>
              Parts of the Service use large language models to read documents, categorise
              entries, summarise records and answer questions. These features are aids, not
              a substitute for professional judgement. Output can be incomplete or wrong, so
              extracted values and generated figures should be checked before they are relied
              on for a trade, a payment or a filing. Section 4 of the Privacy Policy explains
              what is sent for processing.
            </p>
          </Section>

          <Section id="availability" title="6. Availability and changes">
            <p className={p}>
              We work to keep the Service available and to fix faults promptly, but we do not
              promise uninterrupted availability on this page — any uptime commitment is the
              one in your subscription agreement. We may change, add or withdraw features as
              the product develops, and will avoid changes that materially reduce core
              functionality during a paid term without notice.
            </p>
          </Section>

          <Section id="fees" title="7. Fees">
            <p className={p}>
              Fees, billing periods and renewal terms are those set out in your
              organisation&rsquo;s subscription agreement. The mobile apps are free to
              download; access to them requires an active subscription held by your
              organisation. No purchase is made inside the apps.
            </p>
          </Section>

          <Section id="warranty" title="8. Disclaimers">
            <p className={p}>
              Except as expressly stated in your subscription agreement, and to the extent
              permitted by law, the Service is provided &ldquo;as is&rdquo; without
              warranties of any kind, whether express or implied. IMS is a record-keeping and
              analysis tool; it does not provide financial, legal, tax or accounting advice,
              and figures it presents are derived from the data you supply.
            </p>
          </Section>

          <Section id="liability" title="9. Limitation of liability">
            <p className={p}>
              To the extent permitted by law, neither party is liable for indirect or
              consequential loss, or for loss of profit, revenue, goodwill or anticipated
              savings. Any limits and caps on liability are those set out in your
              subscription agreement. Nothing here excludes liability that cannot lawfully be
              excluded, including for fraud or for death or personal injury caused by
              negligence.
            </p>
          </Section>

          <Section id="termination" title="10. Termination">
            <p className={p}>
              Your organisation&rsquo;s subscription agreement governs how and when either
              party may end it. On termination, access to the Service ends, and we will
              return or delete your organisation&rsquo;s data on written request from its
              administrator, subject to any retention the law requires of us.
            </p>
          </Section>

          <Section id="changes" title="11. Changes to these terms">
            <p className={p}>
              We may update this page as the Service develops. The date at the top shows when
              it last changed, and we will give notice of material changes through the
              Service.
            </p>
          </Section>

          <Section id="contact" title="12. Contact">
            <p className={p}>
              Questions about these terms can be sent to{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
