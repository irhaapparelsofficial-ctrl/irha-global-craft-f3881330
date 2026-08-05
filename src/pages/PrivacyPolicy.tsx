import SEO from "@/components/SEO";
import { BRAND } from "@/lib/constants";

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24 md:py-32">
      <SEO
        title="Privacy Policy — Irha Apparels"
        description="How Irha Apparels handles website analytics, visitor presence, inquiry details, live-chat typing previews, uploaded files, local draft data and user data deletion requests."
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
          <h2 className="font-display text-2xl text-foreground">Live chat and typing preview</h2>
          <p className="mt-3">
            When you open the human Live Chat, the text currently being typed inside that chat message box may be shared temporarily with the authenticated Irha Apparels support team before you press Send. This helps the team prepare a faster and more relevant response. The chat interface clearly displays this notice.
          </p>
          <p className="mt-3">
            The typing preview is limited to the Live Chat message composer. It does not read other forms, password fields, browser activity or text entered elsewhere on the website. The preview is cleared when you pause, leave the message box, send the message, close the chat or end the conversation.
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

        <section id="data-deletion" className="border-t border-border/60 pt-7 scroll-mt-28">
          <h2 className="font-display text-2xl text-foreground">User data deletion requests</h2>
          <p className="mt-3">
            You may request deletion of personal data that Irha Apparels controls and that is associated with a website inquiry, live-chat conversation, or business interaction through Facebook, Instagram or WhatsApp.
          </p>
          <p className="mt-3">
            Send your request to <a className="underline" href={`mailto:${BRAND.email}?subject=Data%20Deletion%20Request`}>{BRAND.email}</a> with the subject <strong>Data Deletion Request</strong>. Include the name, email address or phone number you used to contact us and, where relevant, the channel used so we can locate the correct records. Do not send passwords, access tokens or other account secrets.
          </p>
          <p className="mt-3">
            We may ask for reasonable information to verify that the request relates to you. After verification, we will delete or anonymize the personal data we control that is covered by the request, except where retention is required by law or is reasonably necessary for security, fraud prevention, dispute handling or legitimate business recordkeeping.
          </p>
          <p className="mt-3">
            Browser-only inquiry drafts and local preferences can also be removed directly by clearing this site's browser storage on your device.
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
