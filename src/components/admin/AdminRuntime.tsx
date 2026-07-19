import AdminLiveChatLauncher from "@/components/admin/AdminLiveChatLauncher";
import AdminLiveChatNotification from "@/components/admin/AdminLiveChatNotification";
import AdminPushNotificationSetup from "@/components/admin/AdminPushNotificationSetup";
import AdminVisitorPulse from "@/components/admin/AdminVisitorPulse";
import "@/admin-mobile-focus.css";

/**
 * Admin-only floating controls and realtime listeners.
 *
 * The beginner website-operations admin only mounts controls that support the
 * website inquiries + live chat + visitor traffic surfaces. Legacy CRM
 * launchers (buyer actions, outreach command center, etc.) are intentionally
 * not mounted here; their components remain in the repository for rollback
 * and historical reference only.
 */
export default function AdminRuntime() {
  return (
    <>
      <AdminLiveChatLauncher />
      <AdminVisitorPulse />
      <AdminLiveChatNotification />
      <AdminPushNotificationSetup />
    </>
  );
}
