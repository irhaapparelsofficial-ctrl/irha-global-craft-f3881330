import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_faqs",
  title: "List FAQs",
  description: "List published FAQ entries. Useful for buyer questions about MOQ, lead times, shipping, samples.",
  inputSchema: {
    search: z.string().optional().describe("Substring match against question."),
    limit: z.number().int().min(1).max(100).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );

    let query = supabase
      .from("faqs")
      .select("id, question, answer, category, order_index")
      .order("order_index", { ascending: true })
      .limit(limit);

    if (search) query = query.ilike("question", `%${search}%`);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { faqs: data ?? [] },
    };
  },
});
