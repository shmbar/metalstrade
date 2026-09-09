import Navbar from '../../../components/Navbar/navbar';
import Footer from '../../../components/Footer/footer';
import HeroSection from '../../../components/Hero/HeroSection';
import { SUPPORT_EMAIL } from '../../../utils/publicContact';

export const metadata = {
  title: 'Support — IMS',
  description:
    'Get help with the IMS web application and the IMS mobile app for iOS and Android.',
};

const h2 = 'responsiveTextPage font-bold text-[var(--chathams-blue)] mb-3';
const p = 'responsiveTextTitle text-[var(--ink-secondary)] leading-relaxed mb-3';
const ul = 'responsiveTextTitle text-[var(--ink-secondary)] leading-relaxed mb-3 list-disc pl-6 space-y-1';

const TOPICS = [
  {
    title: 'I cannot sign in',
    body: 'IMS accounts are issued by your own company’s administrator, not created in the app. If your email and password are rejected, use "Forgot password" on the sign-in screen to have a reset link sent, or ask your administrator to confirm the account is active.',
  },
  {
    title: 'Face ID or fingerprint sign-in stopped working',
    body: 'Biometric sign-in stores your credentials in the secure keystore on that one device. Changing your password, reinstalling the app, or resetting the device clears it. Sign in with your email and password once and the app will offer to re-enable biometrics.',
  },
  {
    title: 'I need an account, or a colleague needs one',
    body: 'Accounts and permission levels are managed by your company’s IMS administrator. Ask them to add the user and assign the appropriate role. If you are the administrator and need help, write to us.',
  },
  {
    title: 'Figures look wrong, or data is missing',
    body: 'Tell us the page, the record involved and what you expected to see. Screenshots help a great deal. If your company uses more than one workspace, confirm which one you were viewing when the problem appeared.',
  },
];

export default function SupportPage() {
  return (
    <div className="marketing w-full bg-[var(--bg-card)] min-h-screen font-sans text-foreground">
      <Navbar />
      <main className="pt-20">
        <HeroSection
          title="Support"
          subtitle="Help with the IMS web application and the IMS mobile app."
        />

        <div className="container mx-auto px-8 md:px-16 py-12 max-w-3xl">
          <section className="mb-8">
            <h2 className={h2}>Contact us</h2>
            <p className={p}>
              Email{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors"
              >
                {SUPPORT_EMAIL}
              </a>{' '}
              and we will reply within one business day.
            </p>
            <p className={p}>To get to an answer faster, please include:</p>
            <ul className={ul}>
              <li>The email address you sign in with, and your company name.</li>
              <li>Whether you were using the mobile app or the web application.</li>
              <li>On mobile, your device model and the app version shown under More &rsaquo; Settings.</li>
              <li>What you were doing, what you expected, and what happened instead.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className={h2}>Common questions</h2>
            {TOPICS.map((t) => (
              <div key={t.title} className="mb-5">
                <h3 className="responsiveTextTitle font-semibold text-[var(--chathams-blue)] mb-1">
                  {t.title}
                </h3>
                <p className={p}>{t.body}</p>
              </div>
            ))}
          </section>

          <section className="mb-8">
            <h2 className={h2}>Privacy and your data</h2>
            <p className={p}>
              How we handle information is set out in our{' '}
              <a
                href="/privacy"
                className="text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors"
              >
                Privacy Policy
              </a>
              . Requests to access, correct or delete personal data can go to your company&rsquo;s IMS
              administrator or to the address above.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
