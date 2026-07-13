import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isOwnerEmail } from "@/config/ownerIdentity";
import { supabase } from "@/integrations/supabase/client";
import { redactRuntimeMessage } from "@/lib/runtimeSafety";

type BooleanRpcResult = {
  data: boolean | null;
  error: { message: string } | null;
};

const callOwnerClaimRpc = () =>
  (supabase.rpc as unknown as (name: string) => Promise<BooleanRpcResult>)("claim_owner_admin");

function authorizationError(value: unknown): string {
  const message = redactRuntimeMessage(value);
  const normalized = message.toLowerCase();
  if (normalized.includes("admin_already_initialized")) {
    return "Owner role initialization is locked because an admin role already exists.";
  }
  if (normalized.includes("claim_owner_admin") && (normalized.includes("not find") || normalized.includes("does not exist"))) {
    return "Owner role initialization is not active in this backend yet.";
  }
  if (normalized.includes("permission denied") || normalized.includes("row-level security")) {
    return "The backend denied the admin-role check. Do not weaken security policies; verify the owner role during final activation.";
  }
  if (normalized.includes("jwt") || normalized.includes("session") || normalized.includes("token")) {
    return "The owner session could not be verified. Sign out and authenticate again.";
  }
  return "Admin authorization could not be verified safely.";
}

export type AuthState = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  authError: string | null;
};

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let resolutionId = 0;

    const resolveAdmin = async (sessionUser: User, requestId: number) => {
      setAuthError(null);

      const verified = await supabase.auth.getUser();
      if (!active || requestId !== resolutionId) return;
      if (verified.error || !verified.data.user || verified.data.user.id !== sessionUser.id) {
        setVerifiedUser(null);
        setIsAdmin(false);
        setAuthError(authorizationError(verified.error?.message || "Session user could not be verified"));
        setLoading(false);
        return;
      }

      const user = verified.data.user;
      setVerifiedUser(user);
      const readRole = () =>
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

      let { data, error } = await readRole();
      if (!active || requestId !== resolutionId) return;

      if (!data && !error && isOwnerEmail(user.email)) {
        const claim = await callOwnerClaimRpc();
        if (!active || requestId !== resolutionId) return;
        if (!claim.error && claim.data) {
          const refreshed = await readRole();
          data = refreshed.data;
          error = refreshed.error;
        } else if (claim.error && !claim.error.message.includes("admin_already_initialized")) {
          setAuthError(authorizationError(claim.error.message));
        }
      }

      if (!active || requestId !== resolutionId) return;
      setIsAdmin(!error && Boolean(data));
      if (error) setAuthError(authorizationError(error.message));
      setLoading(false);
    };

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      resolutionId += 1;
      const requestId = resolutionId;
      setSession(nextSession);
      if (nextSession?.user) {
        setLoading(true);
        void resolveAdmin(nextSession.user, requestId);
      } else {
        setVerifiedUser(null);
        setIsAdmin(false);
        setAuthError(null);
        setLoading(false);
      }
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => applySession(nextSession), 0);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setVerifiedUser(null);
        setAuthError(authorizationError(error.message));
        setLoading(false);
        return;
      }
      applySession(data.session);
    });

    return () => {
      active = false;
      resolutionId += 1;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: verifiedUser,
    isAdmin,
    loading,
    authError,
  };
}
