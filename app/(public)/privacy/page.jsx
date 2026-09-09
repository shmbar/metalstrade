import Navbar from '../../../components/Navbar/navbar';
import Footer from '../../../components/Footer/footer';
import HeroSection from '../../../components/Hero/HeroSection';
import { SUPPORT_EMAIL } from '../../../utils/publicContact';

export const metadata = {
  title: 'Privacy Policy — IMS',
  description:
    'How IMS collects, uses, stores and shares information across the IMS web application and the IMS mobile app.',
};

const LAST_UPDATED = '9 September 2026';

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

export default function PrivacyPage() {
  return (
    <div className="marketing w-full bg-[var(--bg-card)] min-h-screen font-sans text-foreground">
      <Navbar />
      <main className="pt-20">
        <HeroSection
          title="Privacy Policy"
          subtitle="What IMS collects, why we collect it, and the choices you have."
        />

        <div className="container mx-auto px-8 md:px-16 py-12 max-w-3xl">
          <p className={p}>Last updated: {LAST_UPDATED}</p>

          <Section id="scope" title="1. Scope">
            <p className={p}>
              This policy covers the IMS web application at ims-tech.io and the IMS mobile app for iOS
              and Android (together, the &ldquo;Service&rdquo;). IMS is a business operations platform for
              metals and alloys trading, sold to companies rather than to consumers. Accounts are
              created and administered by the customer organisation that subscribes to IMS; the Service
              is not intended for personal or household use.
            </p>
            <p className={p}>
              Where a customer organisation loads its own business records into IMS, that organisation
              is the controller of those records and IMS acts as its processor. This policy describes
              our own handling in both roles.
            </p>
          </Section>

          <Section id="collect" title="2. Information we collect">
            <p className={p}>
              <strong>Account information.</strong> The email address and password used to sign in, your
              display name, and the role assigned to you by your organisation&rsquo;s administrator
              (for example standard, accounting or administrator). Passwords are handled by Google
              Firebase Authentication and are never stored by us in readable form.
            </p>
            <p className={p}>
              <strong>Business records you enter.</strong> The operational data you or your colleagues
              create in the Service — contracts, purchase orders, invoices, shipments, stock and
              warehouse records, supplier and client details, expenses, cashflow entries, pricing
              formulas, and any documents or certificates you upload. This content is stored under your
              organisation&rsquo;s own namespace and is not shared between customer organisations.
            </p>
            <p className={p}>
              <strong>Technical and device information.</strong> Basic technical data needed to operate
              the Service, including authentication session tokens and, if you enable push
              notifications in the mobile app, a device push token used solely to deliver those
              notifications.
            </p>
            <p className={p}>
              <strong>Stored on your device only.</strong> If you turn on biometric sign-in, your
              sign-in credentials are stored in the operating system&rsquo;s secure keystore (iOS
              Keychain / Android Keystore) on that device so you can unlock the app with Face ID, Touch
              ID or a fingerprint. Those credentials are not transmitted to us, and we never receive
              your fingerprint or face data — the operating system performs the biometric check and
              only reports success or failure to the app.
            </p>
            <p className={p}>
              We do not use advertising identifiers, we do not track you across other companies&rsquo;
              apps or websites, and we do not sell personal information.
            </p>
          </Section>

          <Section id="use" title="3. How we use information">
            <ul className={ul}>
              <li>To authenticate you and keep your session secure.</li>
              <li>To provide the Service — storing, retrieving, calculating and presenting your organisation&rsquo;s business records.</li>
              <li>To send notifications you have enabled, such as reminders and operational alerts.</li>
              <li>To diagnose faults, maintain security, and prevent misuse.</li>
              <li>To meet legal, tax and accounting obligations.</li>
            </ul>
          </Section>

          <Section id="ai" title="4. AI-assisted features">
            <p className={p}>
              Parts of the Service use large language models supplied by OpenAI to reduce manual data
              entry and to summarise information. These features include reading uploaded trade
              documents and certificates, categorising expenses, checking material certificates,
              producing cashflow forecasts and daily briefings, drafting reminders, flagging margin
              anomalies, and answering questions in the in-app assistant.
            </p>
            <p className={p}>
              When you use one of these features, the relevant content — for example the text of a
              document you uploaded or the records needed to answer your question — is transmitted to
              OpenAI for processing, and the result is returned to the Service. We send only the content
              needed for the requested task. We do not permit this content to be used to train
              third-party models. If you would prefer that your organisation&rsquo;s data is not
              processed this way, your administrator should contact us so these features can be
              discussed for your account.
            </p>
          </Section>

          <Section id="sharing" title="5. Service providers">
            <p className={p}>
              We do not sell or rent personal information. We share it only with the providers that
              operate the Service on our behalf, each bound to use it solely for that purpose:
            </p>
            <ul className={ul}>
              <li><strong>Google Firebase</strong> — authentication, database (Firestore) and file storage.</li>
              <li><strong>OpenAI</strong> — processing for the AI-assisted features described in section 4.</li>
              <li><strong>Expo</strong> — application build and delivery, and push-notification transport.</li>
            </ul>
            <p className={p}>
              We may also disclose information where we are legally required to do so, or where
              necessary to establish or defend legal claims.
            </p>
          </Section>

          <Section id="security" title="6. Storage and security">
            <p className={p}>
              Data is held on Google Cloud infrastructure. Traffic between the apps and our servers is
              encrypted in transit, and data is encrypted at rest by the underlying platform. Access to
              records inside the Service is limited by your organisation&rsquo;s role assignments, and
              administrative access on our side is restricted to staff who need it to run and support
              the Service. No system can be guaranteed completely secure, but we work to protect your
              information using measures appropriate to its sensitivity.
            </p>
          </Section>

          <Section id="retention" title="7. Retention">
            <p className={p}>
              We keep your organisation&rsquo;s records for as long as its account is active, and
              afterwards only as long as needed for legitimate business or legal purposes. On written
              request from your organisation&rsquo;s administrator we will delete or return its data
              within a reasonable period, subject to any retention we are legally required to observe.
            </p>
          </Section>

          <Section id="rights" title="8. Your choices and rights">
            <p className={p}>
              Depending on where you live, you may have the right to access, correct, export or delete
              personal information we hold about you, to object to or restrict certain processing, and
              to complain to a data protection authority.
            </p>
            <p className={p}>
              Because IMS accounts are issued and controlled by your employer, the quickest route for
              access, correction or deletion is usually your own administrator, who can change or remove
              your account directly. You can also write to us at {SUPPORT_EMAIL} and we will respond,
              coordinating with your organisation where the request concerns its business records. You
              can turn off push notifications at any time in your device settings, and turn off
              biometric sign-in from within the app.
            </p>
          </Section>

          <Section id="children" title="9. Children">
            <p className={p}>
              The Service is a workplace tool intended for use by adults acting for a business. It is
              not directed to children, and we do not knowingly collect information from anyone under 16.
            </p>
          </Section>

          <Section id="international" title="10. International transfers">
            <p className={p}>
              Our providers may process information in countries other than your own, including the
              United States. Where required, we rely on appropriate safeguards — such as the European
              Commission&rsquo;s standard contractual clauses — for those transfers.
            </p>
          </Section>

          <Section id="changes" title="11. Changes to this policy">
            <p className={p}>
              We may update this policy as the Service develops. When we do, we will revise the date at
              the top of this page, and we will give notice of material changes through the Service.
            </p>
          </Section>

          <Section id="contact" title="12. Contact us">
            <p className={p}>
              Questions about this policy or about how your information is handled can be sent to{' '}
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
