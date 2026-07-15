/**
 * Data Protection components for SevisBirth
 * Implements field-level masking, consent banners, and access audit logging
 * compliant with PNG Privacy Act 2020 and HIPAA-adjacent best practices.
 */
import { useState, useEffect, useCallback } from "react";
import { Shield, Eye, EyeOff, Lock, AlertTriangle, ChevronRight, Clock, User, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Access Log ───────────────────────────────────────────────────────────────

export interface AccessLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  recordId?: string;
  field?: string;
}

const SESSION_LOG_KEY = "sevisbirth_access_log";
const SESSION_CONSENT_KEY = "sevisbirth_dp_consent";

function getLog(): AccessLogEntry[] {
  try { return JSON.parse(sessionStorage.getItem(SESSION_LOG_KEY) || "[]"); }
  catch { return []; }
}

export function logDataAccess(actor: string, action: string, recordId?: string, field?: string) {
  const entry: AccessLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actor,
    action,
    recordId,
    field,
  };
  const log = getLog();
  log.unshift(entry);
  sessionStorage.setItem(SESSION_LOG_KEY, JSON.stringify(log.slice(0, 200)));
}

export function useAccessLog() {
  const [log, setLog] = useState<AccessLogEntry[]>(getLog());
  const refresh = useCallback(() => setLog(getLog()), []);
  return { log, refresh };
}

// ─── Consent Hook ─────────────────────────────────────────────────────────────

export function useDataProtectionConsent(actorName: string) {
  const [consented, setConsented] = useState(false);
  const [sensitiveUnlocked, setSensitiveUnlocked] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_CONSENT_KEY);
    if (stored === actorName) setConsented(true);
  }, [actorName]);

  const giveConsent = useCallback(() => {
    sessionStorage.setItem(SESSION_CONSENT_KEY, actorName);
    setConsented(true);
    logDataAccess(actorName, "Accepted data protection consent", undefined, undefined);
  }, [actorName]);

  const unlockSensitive = useCallback(() => {
    setSensitiveUnlocked(true);
    logDataAccess(actorName, "Unlocked sensitive data view");
  }, [actorName]);

  const lockSensitive = useCallback(() => setSensitiveUnlocked(false), []);

  return { consented, sensitiveUnlocked, giveConsent, unlockSensitive, lockSensitive };
}

// ─── Consent Banner ───────────────────────────────────────────────────────────

interface ConsentBannerProps {
  actorName: string;
  role: string;
  onConsent: () => void;
}

export function DataProtectionConsentBanner({ actorName, role, onConsent }: ConsentBannerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-primary/30 bg-card shadow-2xl">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Data Protection Notice</CardTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">PNG Privacy Act 2020 — Health Records Compliance</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-500/90">
              You are accessing <strong>sensitive personal health and identity data</strong> for birth registration purposes.
            </p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">By proceeding, you confirm that:</p>
            <ul className="space-y-2 pl-2">
              {[
                "Access is strictly for official birth registration duties",
                "Data will not be copied, shared, or retained beyond this session",
                "You are authorised under your role as " + role,
                "Unauthorised access is a criminal offence under PNG law",
                "This session is logged and auditable",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 bg-primary text-primary-foreground font-semibold"
              onClick={onConsent}
            >
              <Shield className="mr-2 h-4 w-4" />
              I Understand — Proceed
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground/60 font-mono">
            {actorName} · {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sensitive Data Toolbar ────────────────────────────────────────────────────

interface SensitiveDataToolbarProps {
  unlocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  recordCount?: number;
}

export function SensitiveDataToolbar({ unlocked, onUnlock, onLock, recordCount }: SensitiveDataToolbarProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border text-sm transition-colors ${
      unlocked
        ? "border-amber-500/30 bg-amber-500/5 text-amber-500"
        : "border-border bg-card text-muted-foreground"
    }`}>
      <Shield className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-xs">
        {unlocked
          ? "Sensitive data unlocked — all fields visible. Session is audited."
          : "Sensitive fields are masked. Click to reveal with audit logging."}
      </span>
      {recordCount !== undefined && (
        <Badge variant="outline" className="text-xs font-mono">
          {recordCount} records
        </Badge>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-3 gap-1.5 shrink-0"
        onClick={unlocked ? onLock : onUnlock}
      >
        {unlocked ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {unlocked ? "Lock" : "Reveal"}
      </Button>
    </div>
  );
}

// ─── Masked Field ─────────────────────────────────────────────────────────────

interface MaskedFieldProps {
  value: string | null | undefined;
  unlocked: boolean;
  maskChar?: string;
  showPrefix?: number; // show first N chars
  className?: string;
  onReveal?: () => void;
}

export function MaskedField({ value, unlocked, maskChar = "•", showPrefix = 4, className = "", onReveal }: MaskedFieldProps) {
  const [localUnlocked, setLocalUnlocked] = useState(false);

  if (!value) return <span className="text-muted-foreground text-xs">N/A</span>;

  const shown = unlocked || localUnlocked;
  const masked = value.length > showPrefix
    ? value.slice(0, showPrefix) + maskChar.repeat(Math.min(8, value.length - showPrefix))
    : maskChar.repeat(value.length);

  if (shown) {
    return <span className={className}>{value}</span>;
  }

  return (
    <button
      className={`flex items-center gap-1.5 group cursor-pointer ${className}`}
      onClick={() => { setLocalUnlocked(true); onReveal?.(); }}
      title="Click to reveal"
    >
      <Lock className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      <span className="font-mono text-muted-foreground/60 group-hover:text-muted-foreground transition-colors text-xs tracking-wider">
        {masked}
      </span>
    </button>
  );
}

// ─── Access Log Panel ─────────────────────────────────────────────────────────

interface AccessLogPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AccessLogPanel({ open, onClose }: AccessLogPanelProps) {
  const { log } = useAccessLog();

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 z-40 bg-card border-l border-border shadow-2xl flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Session Access Log</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>✕</Button>
      </div>
      <p className="text-xs text-muted-foreground px-4 py-2 border-b border-border">
        Showing this session's data access events.
      </p>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {log.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-8">No access events yet.</p>
        )}
        {log.map((entry) => (
          <div key={entry.id} className="p-2.5 rounded-lg bg-background border border-border text-xs space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-3 w-3 mt-0.5 text-primary shrink-0" />
              <div>
                <span className="font-medium text-foreground">{entry.actor}</span>
                <p className="text-muted-foreground">{entry.action}</p>
                {entry.recordId && (
                  <p className="font-mono text-muted-foreground/60">{entry.recordId}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
