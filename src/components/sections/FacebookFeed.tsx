import { useEffect } from "react";
import { Facebook } from "lucide-react";

const PAGE_URL = "https://web.facebook.com/profile.php?id=61590950402472";

/**
 * Embeds the official Facebook Page Plugin (timeline + Like button).
 * Loads the FB SDK once, then renders the fb-page widget responsively.
 */
export default function FacebookFeed() {
  useEffect(() => {
    if (document.getElementById("facebook-jssdk")) {
      // re-parse if SDK already loaded (e.g. SPA route change)
      // @ts-expect-error FB injected at runtime
      window.FB?.XFBML?.parse?.();
      return;
    }
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0";
    document.body.appendChild(script);
  }, []);

  return (
    <section className="py-20 md:py-28 border-t border-border/60 bg-card/30">
      <div className="container-luxe">
        <div className="grid md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-5">
            <p className="eyebrow mb-4">Social</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
              Follow <span className="text-gold italic">Irha Apparels</span> on Facebook
            </h2>
            <p className="text-foreground/70 mt-6 max-w-md">
              New drops, factory updates and behind-the-scenes from our Sialkot atelier — straight from our Facebook page.
            </p>
            <a
              href={PAGE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-8 inline-flex items-center gap-3 bg-[#1877F2] text-white px-6 py-3.5 text-xs uppercase tracking-[0.3em] hover:opacity-90 transition-opacity"
            >
              <Facebook size={16} /> Visit our Page
            </a>
          </div>

          <div className="md:col-span-7">
            {/* FB SDK root */}
            <div id="fb-root" />
            <div
              className="fb-page mx-auto"
              data-href={PAGE_URL}
              data-tabs="timeline"
              data-width="500"
              data-height="640"
              data-small-header="false"
              data-adapt-container-width="true"
              data-hide-cover="false"
              data-show-facepile="true"
            >
              <blockquote cite={PAGE_URL} className="fb-xfbml-parse-ignore">
                <a href={PAGE_URL}>Irha Apparels on Facebook</a>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
