import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "submit_inquiry",
  title: "Submit B2B inquiry",
  description:
    "Submit a wholesale/B2B inquiry to Irha Apparels. Creates a lead the sales team will follow up on.",
  inputSchema: {
    name: z.string().min(1).describe("Contact full name."),
    email: z.string().email().describe("Contact email."),
    company: z.string().optional(),
    country: z.string().optional().describe("Buyer country (e.g. 'Germany')."),
    phone: z.string().optional(),
    product_interest: z
      .string()
      .optional()
      .describe("Which product / category the buyer is interested in."),
    quantity: z.string().optional().describe("Estimated order quantity, e.g. '500 units'."),
    message: z.string().min(1).describe("Free-form buyer message."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await supabase
      .from("inquiries")
      .insert({
        name: input.name,
        email: input.email,
        company: input.company ?? null,
        country: input.country ?? null,
        phone: input.phone ?? null,
        product_interest: input.product_interest ?? null,
        quantity: input.quantity ?? null,
        message: input.message,
        source: "mcp",
      })
      .select("id")
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: `Failed to submit: ${error.message}` }], isError: true };
    }

    return {
      content: [
        {
          type: "text",
          text: `Inquiry received. Reference #${data?.id}. The Irha Apparels team will reply within one business day.`,
        },
      ],
      structuredContent: { inquiry_id: data?.id },
    };
  },
});
