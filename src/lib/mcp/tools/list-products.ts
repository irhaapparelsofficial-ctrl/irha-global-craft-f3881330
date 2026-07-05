import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_products",
  title: "List products",
  description:
    "List B2B garment products from Irha Apparels. Optionally filter by category slug (e.g. 'lederhosen', 'business-suits') or search text.",
  inputSchema: {
    category_slug: z
      .string()
      .optional()
      .describe("Filter by category slug, e.g. 'lederhosen'."),
    search: z
      .string()
      .optional()
      .describe("Case-insensitive substring match against product name."),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category_slug, search, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );

    let query = supabase
      .from("products")
      .select("id, slug, name, description, category_id, moq, materials, images")
      .limit(limit);

    if (search) query = query.ilike("name", `%${search}%`);

    if (category_slug) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", category_slug)
        .maybeSingle();
      if (cat?.id) query = query.eq("category_id", cat.id);
    }

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [
        {
          type: "text",
          text: `Found ${data?.length ?? 0} products.\n\n${JSON.stringify(data, null, 2)}`,
        },
      ],
      structuredContent: { products: data ?? [] },
    };
  },
});
