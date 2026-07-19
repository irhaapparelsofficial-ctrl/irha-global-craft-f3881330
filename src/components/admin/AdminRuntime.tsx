import AdminLiveChatLauncher from "@/components/admin/AdminLiveChatLauncher";
import AdminPushNotificationSetup from "@/components/admin/AdminPushNotificationSetup";
import AdminVisitorPulse from "@/components/admin/AdminVisitorPulse";
import "@/admin-mobile-focus.css";

/**
 * Admin-only floating controls and realtime listeners.
 *
 * The beginner website-operations admin mounts only website-operating controls.
 * Legacy CRM-era in-app owner inbox alerts are intentionally not mounted here;
 * live-chat attention state comes from chat_sessions and the dedicated chat
 * console, while optional background push setup remains available.
 */
export default function AdminRuntime() {
  return (
    <>
      <AdminLiveChatLauncher />
      <AdminVisitorPulse />
      <AdminPushNotificationSetup />
    </>
  );
}
