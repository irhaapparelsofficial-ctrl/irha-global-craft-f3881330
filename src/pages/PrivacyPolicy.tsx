import { Helmet } from "react-helmet-async";

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24 md:py-32">
      <Helmet>
        <title>Privacy Policy — Irha Apparels</title>
        <meta name="description" content="How Irha Apparels handles website analytics, inquiry details, uploaded files and local draft data." />
        <link rel="canonical" href="https://www.irhaapparels.com/privacy-policy" />
      </Helmet>

      <p className="eyebrow mb-5">Privacy</p>
      <h1 className="font-display text-4xl md:text-6xl leading-[1.05]">Privacy Policy</h1>
      <p className="mt-6 text-foreground/70 leading-relaxed">
        This policy explains how the Irha Apparels website handles visitor choices, inquiry details and files submitted for B2B requirement review.
      </p>

      <div className="mt-12 space-y-9 text-sm leading-relaxed text-foreground/75">
        <section className="border-t border-border/60 pt-7">
          <h2 className="font-display text-2xl text-foreground">Cookies and analytics</h2>
          <p className="mt-3">
            The website uses consent controls before optional analytics or advertising storage is enabled. You can reopen Cookie Settings from the footer and change your choice.
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
            Submitted information is used to review requirements, respond to inquiries, discuss sampling or production, manage follow-up and improve the website experience.
          </p>
        </section>

        <section className="border-t border-border/60 pt-7">
          <h2 className="font-display text-2xl text-foreground">Contact</h2>
          <p className="mt-3">
            Privacy questions can be sent to <a className="underline" href="mailto:irhaapparelsofficial@gmail.com">irhaapparelsofficial@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
