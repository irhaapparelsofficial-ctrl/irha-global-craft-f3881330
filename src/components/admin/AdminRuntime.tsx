import AdminBuyerActionsLauncher from "@/components/admin/AdminBuyerActionsLauncher";
import AdminLiveChatLauncher from "@/components/admin/AdminLiveChatLauncher";
import AdminLiveChatNotification from "@/components/admin/AdminLiveChatNotification";
import AdminOutreachCommandCenter from "@/components/admin/AdminOutreachCommandCenter";
import "@/admin-mobile-focus.css";

/**
 * Admin-only floating controls and realtime listeners.
 *
 * This module is loaded dynamically only for /admin routes so public buyer and
 * SEO pages never download CRM panels, realtime listeners or admin-only CSS.
 */
export default function AdminRuntime() {
  return (
    <>
      <AdminOutreachCommandCenter />
      <AdminBuyerActionsLauncher />
      <AdminLiveChatLauncher />
      <AdminLiveChatNotification />
    </>
  );
}
