import { Helmet } from "react-helmet-async";

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <Helmet>
        <title>Privacy Policy — Irha Apparels</title>
        <meta name="description" content="How Irha Apparels collects, uses and protects your data, including cookies and analytics." />
        <link rel="canonical" href="https://www.irhaapparels.com/privacy-policy" />
      </Helmet>
      <h1 className="mb-6 text-3xl font-semibold">Privacy Policy</h1>
      <div className="prose prose-neutral max-w-none space-y-4 text-sm leading-relaxed">
        <p>
          This page is maintained by Irha Apparels to explain how we handle visitor data on
          irhaapparels.com. By using our website you agree to this policy.
        </p>

        <h2 className="text-xl font-semibold">Cookies & analytics</h2>
        <p>
          We use Google Analytics 4 with Google Consent Mode v2. Visitors in the EU, EEA and UK see a
          consent banner. Until you click <strong>Accept All</strong>, advertising and analytics
          storage are denied by default. If you click <strong>Reject All</strong>, no analytics or
          advertising cookies are written.
        </p>

        <h2 className="text-xl font-semibold">Data we collect</h2>
        <ul className="list-disc pl-5">
          <li>Aggregated, anonymised usage data via Google Analytics (only after consent).</li>
          <li>Information you voluntarily submit through inquiry and contact forms.</li>
        </ul>

        <h2 className="text-xl font-semibold">Your choices</h2>
        <p>
          You can change your cookie choice at any time by clearing your browser storage for this
          site, which will re-show the banner on your next visit.
        </p>

        <h2 className="text-xl font-semibold">Contact</h2>
        <p>
          Questions about this policy?{" "}
          <a className="underline" href="mailto:info@irhaapparels.com">
            info@irhaapparels.com
          </a>
        </p>
      </div>
    </main>
  );
}
