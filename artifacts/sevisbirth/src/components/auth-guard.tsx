import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/navbar";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

// Shell for CHW app (mobile view centered on desktop)
export function MobileAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-0 sm:p-6">
      <div className="w-full h-[100dvh] sm:h-[850px] max-w-[480px] bg-background sm:rounded-[3rem] sm:border-[8px] border-zinc-800 overflow-hidden relative shadow-2xl flex flex-col">
        {/* Fake notch for desktop presentation */}
        <div className="hidden sm:block absolute top-0 inset-x-0 h-6 z-50 pointer-events-none">
          <div className="w-32 h-6 bg-zinc-800 mx-auto rounded-b-3xl" />
        </div>
        
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}
