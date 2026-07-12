import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const OWNER_EMAIL = "irhaapparelsofficial@gmail.com";

type BooleanRpcResult = {
  data: boolean | null;
  error: { message: string } | null;
};

const callOwnerClaimRpc = () =>
  (supabase.rpc as unknown as (name: string) => Promise<BooleanRpcResult>)("claim_owner_admin");

export type AuthState = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  authError: string | null;
};

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const resolveAdmin = async (user: User) => {
      setAuthError(null);

      const readRole = () =>
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

      let { data, error } = await readRole();

      if (!data && !error && user.email?.toLowerCase() === OWNER_EMAIL) {
        const claim = await callOwnerClaimRpc();
        if (!claim.error && claim.data) {
          const refreshed = await readRole();
          data = refreshed.data;
          error = refreshed.error;
        } else if (claim.error && !claim.error.message.includes("admin_already_initialized")) {
          setAuthError(claim.error.message);
        }
      }

      if (!active) return;
      setIsAdmin(!error && Boolean(data));
      if (error) setAuthError(error.message);
      setLoading(false);
    };

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        setLoading(true);
        void resolveAdmin(nextSession.user);
      } else {
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
        setAuthError(error.message);
        setLoading(false);
        return;
      }
      applySession(data.session);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    isAdmin,
    loading,
    authError,
  };
}
