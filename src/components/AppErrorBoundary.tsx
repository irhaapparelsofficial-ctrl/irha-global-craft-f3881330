import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

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
    const safe = {
      incidentId: this.state.incidentId,
      name: error.name,
      route: window.location.pathname,
      componentStack: info.componentStack?.split("\n").slice(0, 8).join("\n") || null,
    };
    console.error("Irha application error", safe);
  }

  private reload = () => window.location.reload();
  private goHome = () => window.location.assign("/");

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-[100svh] flex items-center justify-center bg-background px-4 py-12 text-foreground">
        <section className="w-full max-w-xl border border-amber-500/35 bg-card/50 p-6 sm:p-9 text-center">
          <AlertTriangle size={34} className="mx-auto text-amber-300" />
          <p className="eyebrow mt-5">Recoverable application error</p>
          <h1 className="font-display text-3xl sm:text-4xl mt-2">This page could not finish loading.</h1>
          <p className="text-sm text-foreground/65 mt-4 leading-relaxed">
            No password, token or private business record is shown here. Reload the page once. If the problem continues, keep the incident reference for the system-health review.
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Incident {this.state.incidentId}
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mt-7">
            <button type="button" onClick={this.reload} className="min-h-12 inline-flex items-center justify-center gap-2 bg-gradient-gold px-5 text-xs uppercase tracking-[0.18em] text-primary-foreground">
              <RefreshCw size={15} /> Reload page
            </button>
            <button type="button" onClick={this.goHome} className="min-h-12 inline-flex items-center justify-center gap-2 border border-border/60 px-5 text-xs uppercase tracking-[0.18em] hover:border-gold hover:text-gold">
              <Home size={15} /> Open website
            </button>
          </div>
        </section>
      </main>
    );
  }
}
