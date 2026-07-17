import SEO from "@/components/SEO";
import { BRAND } from "@/lib/constants";

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24 md:py-32">
      <SEO
        title="Privacy Policy — Irha Apparels"
        description="How Irha Apparels handles website analytics, visitor presence, inquiry details, uploaded files and local draft data."
        path="/privacy-policy"
      />

      <p className="eyebrow mb-5">Privacy</p>
      <h1 className="font-display text-4xl md:text-6xl leading-[1.05]">Privacy Policy</h1>
      <p className="mt-6 text-foreground/70 leading-relaxed">
        This policy explains how the Irha Apparels website handles visitor choices, website presence, inquiry details and files submitted for B2B requirement review.
      </p>

      <div className="mt-12 space-y-9 text-sm leading-relaxed text-foreground/75">
        <section className="border-t border-border/60 pt-7">
          <h2 className="font-display text-2xl text-foreground">Cookies and analytics</h2>
          <p className="mt-3">
            Essential website functions remain available without optional tracking. Analytics and advertising storage stay denied until you make a choice through the cookie banner. You can accept all optional categories, reject them, or choose categories individually.
          </p>
          <p className="mt-3">
            Your saved choice is kept in browser storage for up to six months unless you clear browser storage earlier. You can reopen Cookie Settings from the footer and change your choice at any time.
          </p>
        </section>

        <section className="border-t border-border/60 pt-7">
          <h2 className="font-display text-2xl text-foreground">Website presence and approximate location</h2>
          <p className="mt-3">
            For website security, service availability and prompt B2B support, the site may record a session identifier, pages visited, referral source, device category, browser language, timestamps and an approximate country. Region or city may also be available from the network edge. This essential presence record does not use GPS and does not store your raw IP address.
          </p>
          <p className="mt-3">
            Approximate location is derived from the internet connection at the hosting or application edge. VPN, proxy, corporate gateway or mobile-network routing can change the reported country or city. Visitor-presence records are automatically eligible for deletion after 90 days.
          </p>
        </section>

        <section className="border-t border-border/60 pt-7">
          <h2 className="font-display text-2xl text-foreground">Information you submit</h2>
          <p className="mt-3">
            Inquiry and contact flows may collect business contact details, company information, product interests, quantity, destination, notes and other requirement details you choose to provide.
          </p>
        </section>

        <section className="border-t border-border/60 pt-7">
          <h2 className="font-display text-2xl text-foreground">Uploaded files</h2>
          <p className="mt-3">
            Buyers may upload reference images, PDFs or other supported files for requirement discussion. Do not upload confidential or restricted material unless you are authorized to share it.
          </p>
        </section>

        <section className="border-t border-border/60 pt-7">
          <h2 className="font-display text-2xl text-foreground">Inquiry drafts on your device</h2>
          <p className="mt-3">
            The inquiry wizard may save a draft in your browser storage so you can continue later. This draft is stored on the device and browser you are using until it is submitted, cleared or removed with browser storage.
          </p>
        </section>

        <section className="border-t border-border/60 pt-7">
          <h2 className="font-display text-2xl text-foreground">How information is used</h2>
          <p className="mt-3">
            Submitted information and essential website-presence data are used to review requirements, respond to inquiries, provide live-chat support, maintain security, manage follow-up and improve the website experience.
          </p>
        </section>

        <section className="border-t border-border/60 pt-7">
          <h2 className="font-display text-2xl text-foreground">Contact</h2>
          <p className="mt-3">
            Privacy questions can be sent to <a className="underline" href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
