(() => {
  const SITE_ORIGIN = "https://irhaapparels.com";
  const stateKey = "__irhaWebMcpRegistered";
  if (window[stateKey]) return;

  const safeText = (value, maxLength) =>
    typeof value === "string"
      ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
      : "";

  const tools = [
    {
      name: "list_b2b_collections",
      title: "List B2B collections",
      description: "Return current Irha Apparels manufacturing hubs and public collection links. This tool is read-only.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => ({
        collections: [
          {
            name: "Bavarian Heritage & Leather",
            description: "Lederhosen, Dirndl, Trachten programs and premium leather apparel.",
            url: `${SITE_ORIGIN}/products/bavarian-trachten-wear`,
          },
          {
            name: "Textile, Streetwear & Active",
            description: "Sportswear, activewear, heavyweight streetwear, leisurewear and nightwear.",
            url: `${SITE_ORIGIN}/products`,
          },
        ],
      }),
    },
    {
      name: "get_factory_verification_options",
      title: "Get factory verification options",
      description: "Return buyer-trust and live factory video-call options. This tool is read-only and does not book a meeting.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => ({
        buyerTrustUrl: `${SITE_ORIGIN}/buyer-trust`,
        factoryVideoCallUrl: `${SITE_ORIGIN}/factory-video-call`,
        inquiryUrl: `${SITE_ORIGIN}/inquiry`,
        note: "Buyer verification should focus on the exact program, team and written scope. An appointment-based live factory call may be requested, subject to availability and viewing scope.",
      }),
    },
    {
      name: "prepare_buyer_inquiry",
      title: "Prepare buyer inquiry",
      description: "Create a buyer-reviewable inquiry URL. This tool never sends or stores buyer information.",
      inputSchema: {
        type: "object",
        properties: {
          category: { type: "string", maxLength: 180 },
          quantity: { type: "string", maxLength: 100 },
          country: { type: "string", maxLength: 80 },
          message: { type: "string", maxLength: 1200 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (input = {}) => {
        const params = new URLSearchParams();
        const category = safeText(input.category, 180);
        const quantity = safeText(input.quantity, 100);
        const country = safeText(input.country, 80);
        const message = safeText(input.message, 1200);
        if (category) params.set("category", category);
        if (quantity) params.set("quantity", quantity);
        if (country) params.set("country", country);
        if (message) params.set("message", message);
        params.set("source", "webmcp-review");
        return {
          reviewUrl: `${SITE_ORIGIN}/inquiry?${params.toString()}`,
          submitted: false,
          confirmationRequired: true,
        };
      },
    },
  ];

  const register = async () => {
    const current = document.modelContext;
    if (current && typeof current.registerTool === "function") {
      const controller = new AbortController();
      let registered = 0;
      for (const tool of tools) {
        try {
          await current.registerTool(tool, { signal: controller.signal });
          registered += 1;
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "InvalidStateError")) {
            console.info("WebMCP tool registration skipped", tool.name);
          }
        }
      }
      if (registered > 0) window[stateKey] = true;
      return;
    }

    const legacy = navigator.modelContext;
    if (legacy && typeof legacy.provideContext === "function") {
      try {
        await legacy.provideContext({ tools });
        window[stateKey] = true;
      } catch {
        console.info("Legacy WebMCP context registration was not accepted by this browser");
      }
    }
  };

  void register();
})();
