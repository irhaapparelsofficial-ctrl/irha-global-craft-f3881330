import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FloatingActions from "./FloatingActions";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingActions />
    </div>
  );
}
