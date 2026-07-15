import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Building2, ScrollText, Landmark, ShieldCheck } from "lucide-react";
import { useLogin, UserRole } from "@workspace/api-client-react";
import { OidcAuthModal, type OidcVerifiedUser } from "@/components/oidc-auth-modal";

const DEMO_ACCOUNTS = [
  {
    username: "mary",
    password: "demo",
    name: "Mary Kila",
    facility: "Angau Memorial Hospital",
    role: "Community Health Worker",
    roleKey: "field_worker",
    icon: Stethoscope,
    description: "Mobile field registration and initial data entry.",
    path: "/chw",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    username: "peter",
    password: "demo",
    name: "Dr. Peter Naime",
    facility: "Port Moresby General",
    role: "Facility Manager",
    roleKey: "facility_manager",
    icon: Building2,
    description: "Manage facility records, deduplication and local data integrity.",
    path: "/facility",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    username: "susan",
    password: "demo",
    name: "Susan Tua",
    facility: "NCD Civil Registry",
    role: "Civil Registrar",
    roleKey: "civil_registrar",
    icon: ScrollText,
    description: "Review queue and record approvals. Final verification authority.",
    path: "/registry",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    username: "james",
    password: "demo",
    name: "James Walo",
    facility: "PNGCIR Headquarters",
    role: "Registrar General",
    roleKey: "registrar_general",
    icon: Landmark,
    description: "National dashboard and final certification authority.",
    path: "/approval",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

export default function LoginPage() {
  const { loginWithSession } = useAuth();
  const [, setLocation] = useLocation();
  const [pendingAccount, setPendingAccount] = useState<(typeof DEMO_ACCOUNTS)[0] | null>(null);
  const [oidcOpen, setOidcOpen] = useState(false);
  const [verifiedStaff, setVerifiedStaff] = useState<OidcVerifiedUser | null>(null);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        loginWithSession(data);
        if (data.user.role === UserRole.field_worker) setLocation("/chw");
        else if (data.user.role === UserRole.facility_manager) setLocation("/facility");
        else if (data.user.role === UserRole.civil_registrar) setLocation("/registry");
        else if (data.user.role === UserRole.registrar_general) setLocation("/approval");
      },
    },
  });

  function handleEnterRole(account: (typeof DEMO_ACCOUNTS)[0]) {
    setPendingAccount(account);
    setOidcOpen(true);
  }

  function handleOidcVerified(user: OidcVerifiedUser) {
    setVerifiedStaff(user);
    setOidcOpen(false);
    if (pendingAccount) {
      // For staff roles, use OIDC4VP verified identity
      const staffRoles = ["facility_manager", "civil_registrar", "registrar_general"];
      if (staffRoles.includes(pendingAccount.roleKey)) {
        // Call new SSO endpoint with verified SevisPass UID
        loginWithOidc(user.uid);
      } else {
        // For CHWs, use credential-based login (legacy)
        loginMutation.mutate({
          data: { username: pendingAccount.username, password: pendingAccount.password },
        });
      }
    }
  }

  async function loginWithOidc(sevispassUid: string) {
    try {
      const response = await fetch("/api/auth/login-oidc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sevispassUid,
          verifiedName: verifiedStaff?.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Login failed: ${error.error}`);
        return;
      }

      const data = await response.json();
      loginWithSession(data);

      // Navigate based on role
      if (data.user.role === UserRole.facility_manager) setLocation("/facility");
      else if (data.user.role === UserRole.civil_registrar) setLocation("/registry");
      else if (data.user.role === UserRole.registrar_general) setLocation("/approval");
    } catch (error) {
      alert(`Login error: ${error}`);
    }
  }

  function handleOidcClose() {
    setOidcOpen(false);
    setPendingAccount(null);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-primary/8 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(232,168,56,0.06),transparent)] pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-5xl space-y-12">

          {/* Wordmark + headline */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center gap-2 p-3 px-5 rounded-2xl bg-card border border-border/60 mb-4 shadow-xl">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <span className="font-bold text-3xl tracking-tight">
                <span className="text-primary">Sevis</span>Birth
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              PNG Civil Identity System
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Secure digital birth registration for Papua New Guinea.
              Authentication via OIDC4VP — SevisPass digital identity wallet.
            </p>

            {/* Protocol badges */}
            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              {["OIDC4VP", "SD-JWT VC", "OpenID4VP Draft 20", "T5-OmniMatch Dedup"].map(b => (
                <Badge key={b} variant="outline" className="font-mono text-xs text-muted-foreground border-border/50 bg-card/40">
                  {b}
                </Badge>
              ))}
            </div>
          </div>

          {/* Role cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              const isPending = loginMutation.isPending && pendingAccount?.username === account.username;
              return (
                <Card
                  key={account.username}
                  className="group relative overflow-hidden border-border/50 hover:border-primary/40 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer bg-card/50 backdrop-blur-xl"
                  onClick={() => !loginMutation.isPending && handleEnterRole(account)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="relative pb-2">
                    <div className={`w-11 h-11 rounded-xl ${account.bg} flex items-center justify-center mb-3 ${account.color} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg leading-snug">{account.role}</CardTitle>
                    <CardDescription className="text-sm font-semibold text-foreground/80">
                      {account.name}
                    </CardDescription>
                    <p className="text-xs text-muted-foreground">{account.facility}</p>
                  </CardHeader>
                  <CardContent className="relative pt-0">
                    <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                      {account.description}
                    </p>
                    <Button
                      className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground"
                      variant="outline"
                      disabled={loginMutation.isPending}
                      size="sm"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {isPending ? "Authenticating..." : "Verify & Enter"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground/50 font-mono mt-2">
                      SevisPass OIDC4VP
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground/40 font-mono">
            SYSTEM STATUS: ONLINE · VERSION 0.1.0-beta · PNGCIR DEMO ENVIRONMENT
          </p>
        </div>
      </div>

      {/* OIDC4VP authentication modal */}
      <OidcAuthModal
        open={oidcOpen}
        onClose={handleOidcClose}
        onVerified={handleOidcVerified}
        title="Staff Authentication"
        description={
          pendingAccount
            ? `Verify your identity to access the ${pendingAccount.role} interface.`
            : undefined
        }
        context="staff"
        bypassLabel="Demo Bypass — skip QR scan"
      />
    </div>
  );
}
