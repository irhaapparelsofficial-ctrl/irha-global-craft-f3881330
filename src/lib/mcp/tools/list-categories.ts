import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description: "List all product categories with slug and description.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).default(100),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name, description, parent_id")
      .order("name")
      .limit(limit);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [
        { type: "text", text: `Found ${data?.length ?? 0} categories.\n\n${JSON.stringify(data, null, 2)}` },
      ],
      structuredContent: { categories: data ?? [] },
    };
  },
});
