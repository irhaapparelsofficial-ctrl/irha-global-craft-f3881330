import CommercialHubPanel from "@/components/admin/CommercialHubPanel";

/**
 * The PI entrypoint deliberately reuses the persistent Commercial Hub.
 * Quotations and their line items are stored in owner Supabase and remain
 * drafts until the owner explicitly approves or sends them.
 */
export default function PIGeneratorPanel() {
  return <CommercialHubPanel initialTab="quotations" />;
}
