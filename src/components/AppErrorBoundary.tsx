import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Copy, Home, RefreshCw } from "lucide-react";
import {
  claimOneTimeAssetRecovery,
  isRecoverableAssetError,
  reportRuntimeIncident,
  sanitizeRuntimeErrorMessage,
} from "@/lib/appRuntimeIncident";

type Props = { children: ReactNode };
type State = { hasError: boolean; incidentId: string | null };

function createIncidentId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `IRHA-${stamp}-${random}`;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, incidentId: null };

  static getDerivedStateFromError(): State {
    return { hasError: true, incidentId: createIncidentId() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const incidentId = this.state.incidentId ?? createIncidentId();
    const route = window.location.pathname || "/";
    const componentStack = info.componentStack?.split("\n").slice(0, 12).join("\n") || null;
    const safeMessage = sanitizeRuntimeErrorMessage(error.message);
    const safe = {
      incidentId,
      name: error.name,
      message: safeMessage,
      route,
      componentStack,
    };

    console.error("Irha application error", safe);
    void reportRuntimeIncident({
      incidentId,
      route,
      errorName: error.name || "Error",
      errorMessage: safeMessage,
      componentStack,
      userAgent: navigator.userAgent,
      sourceSha: null,
    });

    if (isRecoverableAssetError(error) && claimOneTimeAssetRecovery(route)) {
      window.setTimeout(() => window.location.reload(), 350);
    }
  }

  private reload = () => window.location.reload();
  private goHome = () => window.location.assign("/");
  private copyIncident = () => {
    const incidentId = this.state.incidentId;
    if (!incidentId || !navigator.clipboard) return;
    void navigator.clipboard.writeText(incidentId).catch(() => undefined);
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-[100svh] flex items-center justify-center bg-background px-4 py-12 text-foreground">
        <section className="w-full max-w-xl border border-amber-500/35 bg-card/50 p-6 sm:p-9 text-center">
          <AlertTriangle size={34} className="mx-auto text-amber-300" />
          <p className="eyebrow mt-5">Recoverable application error</p>
          <h1 className="font-display text-3xl sm:text-4xl mt-2">This page could not finish loading.</h1>
          <p className="text-sm text-foreground/65 mt-4 leading-relaxed">
            Reload once. Stale application files are retried automatically one time, and the incident reference is sent to system health when the network is available.
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Incident {this.state.incidentId}
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mt-7">
            <button type="button" onClick={this.reload} className="min-h-12 inline-flex items-center justify-center gap-2 bg-gradient-gold px-5 text-xs uppercase tracking-[0.18em] text-primary-foreground">
              <RefreshCw size={15} /> Reload
            </button>
            <button type="button" onClick={this.copyIncident} className="min-h-12 inline-flex items-center justify-center gap-2 border border-border/60 px-5 text-xs uppercase tracking-[0.18em] hover:border-gold hover:text-gold">
              <Copy size={15} /> Copy ref
            </button>
            <button type="button" onClick={this.goHome} className="min-h-12 inline-flex items-center justify-center gap-2 border border-border/60 px-5 text-xs uppercase tracking-[0.18em] hover:border-gold hover:text-gold">
              <Home size={15} /> Website
            </button>
          </div>
        </section>
      </main>
    );
  }
}
