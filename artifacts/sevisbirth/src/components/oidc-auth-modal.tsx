import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, AlertTriangle, AlertCircle, Fingerprint,
  QrCode, Zap, CheckCircle2, Clock
} from "lucide-react";

export interface OidcVerifiedUser {
  name: string;
  uid: string;
  sub: string;
  tier: number;
  tierLabel: string;
  ageOver18: boolean;
  credentials: string[];
  dedup: { status: "clear" | "warning" | "match"; method: string; score: number | null };
}

export interface OidcAuthModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: (user: OidcVerifiedUser) => void;
  title: string;
  description?: string;
  context?: "parent" | "witness" | "staff";
  bypassLabel?: string;
}

type FlowState = "loading" | "qr" | "scanning" | "verifying" | "verified" | "error";

const STEP_MESSAGES = [
  "Connecting to SevisPass wallet...",
  "Reading OIDC4VP presentation request...",
  "Validating SD-JWT credential...",
  "Running T5-OmniMatch 1:N dedup...",
  "Verification complete.",
];

export function OidcAuthModal({
  open,
  onClose,
  onVerified,
  title,
  description,
  context = "parent",
  bypassLabel = "Demo Bypass",
}: OidcAuthModalProps) {
  const [flowState, setFlowState] = useState<FlowState>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [stepIdx, setStepIdx] = useState(0);
  const [verifiedUser, setVerifiedUser] = useState<OidcVerifiedUser | null>(null);
  const [error, setError] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Initiate session on open
  useEffect(() => {
    if (!open) { stopPolling(); setFlowState("loading"); setVerifiedUser(null); setStepIdx(0); setError(""); return; }

    (async () => {
      try {
        const res = await fetch("/api/oidc4vp/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context }),
        });
        const data = await res.json();
        setSessionId(data.sessionId);
        setQrSvg(data.qrCode);
        setFlowState("qr");

        // Poll for real wallet scan every 2s
        pollRef.current = setInterval(async () => {
          try {
            const r = await fetch(`/api/oidc4vp/status?session=${data.sessionId}`);
            const s = await r.json();
            if (s.authenticated && s.user) {
              stopPolling();
              handleVerified(s.user);
            }
          } catch { /* ignore poll errors */ }
        }, 2000);
      } catch (e) {
        setError("Failed to initiate OIDC4VP session");
        setFlowState("error");
      }
    })();

    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleVerified(user: OidcVerifiedUser) {
    setVerifiedUser(user);
    setFlowState("verified");
  }

  async function handleBypass() {
    if (!sessionId) return;
    setFlowState("scanning");
    setStepIdx(0);

    // Animate through steps
    for (let i = 0; i < STEP_MESSAGES.length; i++) {
      setStepIdx(i);
      await new Promise(r => setTimeout(r, 600));
    }
    setFlowState("verifying");
    await new Promise(r => setTimeout(r, 500));

    try {
      stopPolling();
      const res = await fetch("/api/oidc4vp/bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        handleVerified(data.user);
      } else {
        setError("Bypass failed");
        setFlowState("error");
      }
    } catch {
      setError("Network error during bypass");
      setFlowState("error");
    }
  }

  function handleAccept() {
    if (verifiedUser) onVerified(verifiedUser);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px] bg-card border-border p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-sm mt-1">{description}</DialogDescription>
            )}
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* QR Code display */}
          {(flowState === "qr" || flowState === "loading") && (
            <div className="space-y-4">
              <div className="flex gap-2 text-xs text-muted-foreground items-center">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono">OIDC4VP — SD-JWT VC — OpenID4VP Draft 20</span>
              </div>

              {/* QR */}
              <div className="flex justify-center">
                <div className="relative w-52 h-52 rounded-2xl border-2 border-primary/40 bg-background flex items-center justify-center overflow-hidden">
                  {qrSvg ? (
                    <div
                      className="w-full h-full p-2"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <QrCode className="h-10 w-10 animate-pulse" />
                      <span className="text-xs">Generating...</span>
                    </div>
                  )}
                  {/* Corner markers */}
                  <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl" />
                  <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr" />
                  <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl" />
                  <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br" />
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Scan with <span className="text-primary font-semibold">SevisPass</span> wallet app to verify identity
              </p>

              <div className="flex items-center gap-3 text-xs text-muted-foreground/60 font-mono border-t border-border pt-3">
                <Clock className="h-3 w-3 shrink-0" />
                <span>Session expires in 10 minutes</span>
              </div>

              {/* Bypass */}
              <div className="pt-1 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  SevisPass wallet not available?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/10 gap-2"
                  onClick={handleBypass}
                >
                  <Zap className="h-4 w-4" />
                  {bypassLabel}
                </Button>
              </div>
            </div>
          )}

          {/* Scanning animation */}
          {(flowState === "scanning" || flowState === "verifying") && (
            <div className="space-y-5 py-2">
              <div className="flex justify-center">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Fingerprint className="h-10 w-10 text-primary" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {STEP_MESSAGES.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                      i < stepIdx
                        ? "text-green-500"
                        : i === stepIdx
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {i < stepIdx ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : i === stepIdx ? (
                      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground/20 shrink-0" />
                    )}
                    <span className="font-mono text-xs">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified */}
          {flowState === "verified" && verifiedUser && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-green-500">Identity Verified</span>
                    <Badge variant="outline" className="text-green-500 border-green-500/40 text-xs font-mono">
                      OIDC4VP
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-semibold">{verifiedUser.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SevisPass UID</span>
                      <span className="font-mono text-xs">{verifiedUser.uid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tier</span>
                      <span className="text-xs">{verifiedUser.tierLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Age 18+</span>
                      <span className="text-green-500 text-xs">Verified</span>
                    </div>
                  </div>

                  {/* Dedup result */}
                  {verifiedUser.dedup.status === "clear" ? (
                    <div className="flex items-center gap-2 text-xs text-green-500/80 pt-1 border-t border-green-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>T5-OmniMatch: No duplicate found</span>
                    </div>
                  ) : verifiedUser.dedup.status === "warning" ? (
                    <div className="flex items-start gap-2 text-xs text-amber-500 pt-1 border-t border-amber-500/20">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Dedup warning — score {verifiedUser.dedup.score?.toFixed(3)} via {verifiedUser.dedup.method}. Manual review recommended.</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-xs text-red-500 pt-1 border-t border-red-500/20">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Possible duplicate match — registration flagged for review.</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-border" onClick={onClose} size="sm">
                  Cancel
                </Button>
                <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleAccept} size="sm">
                  Confirm Identity
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {flowState === "error" && (
            <div className="space-y-4 py-2 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
