import { useState } from "react";
import { useGetStats, useGetStatsByProvince, useGetActivity, useTransitionBirthRecord, useListBirthRecords, getListBirthRecordsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Activity, CheckCircle, FileText, Landmark, Users, ShieldCheck, AlertCircle, Zap, Award } from "lucide-react";
import { StateDot } from "@/components/status-badge";
import { OidcAuthModal, type OidcVerifiedUser } from "@/components/oidc-auth-modal";

export default function ApprovalDashboard() {
  const queryClient = useQueryClient();
  const { data: stats } = useGetStats();
  const { data: provinceData } = useGetStatsByProvince();
  const { data: activityData } = useGetActivity();
  const { data: certifyingRecords } = useListBirthRecords({ state: "certifying", limit: 20 });

  // OIDC session state
  const [sessionVerified, setSessionVerified] = useState(false);
  const [sessionUser, setSessionUser] = useState<OidcVerifiedUser | null>(null);
  const [oidcOpen, setOidcOpen] = useState(false);

  const transitionMutation = useTransitionBirthRecord({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBirthRecordsQueryKey() });
      },
    },
  });

  function handleSessionVerified(u: OidcVerifiedUser) {
    setSessionUser(u);
    setSessionVerified(true);
    setOidcOpen(false);
  }

  function handleCertify(id: string) {
    if (!sessionVerified) { setOidcOpen(true); return; }
    transitionMutation.mutate({ id, data: { toState: "complete" } });
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">

      {/* Header with OIDC session status */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">National Operations</h1>
          <p className="text-muted-foreground mt-1">Registrar General — macro-view and certification authority.</p>
        </div>

        {sessionVerified && sessionUser ? (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30">
            <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-green-500">OIDC4VP Session Active</p>
              <p className="text-xs text-muted-foreground">{sessionUser.name} · {sessionUser.uid}</p>
            </div>
            <Badge variant="outline" className="text-xs font-mono text-green-500 border-green-500/30">SD-JWT</Badge>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-500">Session not verified</p>
              <p className="text-xs text-muted-foreground">Required to certify records</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 gap-1.5 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
              onClick={() => setOidcOpen(true)}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Verify
            </Button>
          </div>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: stats?.total ?? 0, color: "text-foreground", bg: "bg-primary/10", icon: FileText, iconColor: "text-primary" },
          { label: "Pending Review", value: (stats?.pending ?? 0) + (stats?.inReview ?? 0), color: "text-amber-400", bg: "bg-amber-500/10", icon: Users, iconColor: "text-amber-400" },
          { label: "Approved (Awaiting Cert)", value: stats?.approved ?? 0, color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle, iconColor: "text-green-400" },
          { label: "Certified Complete", value: stats?.complete ?? 0, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: Award, iconColor: "text-emerald-400" },
        ].map(({ label, value, color, bg, icon: Icon, iconColor }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  <h3 className={`text-3xl font-bold mt-2 font-mono ${color}`}>{value.toLocaleString()}</h3>
                </div>
                <div className={`p-2 ${bg} rounded-lg ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Certification queue */}
      {(certifyingRecords?.records?.length ?? 0) > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Ready for Certification
              <Badge variant="secondary" className="font-mono ml-auto">
                {certifyingRecords?.records.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {certifyingRecords?.records.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-card border border-border">
                  <div>
                    <p className="font-semibold">{r.childFirstName} {r.childLastName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.id} · {r.province}</p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleCertify(r.id)}
                    disabled={transitionMutation.isPending}
                  >
                    {sessionVerified ? (
                      <><Award className="h-4 w-4" /> Certify</>
                    ) : (
                      <><ShieldCheck className="h-4 w-4" /> Verify &amp; Certify</>
                    )}
                  </Button>
                </div>
              ))}
            </div>
            {!sessionVerified && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-500">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>OIDC4VP verification required before certifying. Click "Certify" to initiate.</span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1 text-amber-500 hover:bg-amber-500/10" onClick={() => setOidcOpen(true)}>
                  <Zap className="h-3 w-3" /> Bypass
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Province chart */}
        <Card className="col-span-2 border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Registration Volume by Province
              <Badge variant="outline" className="ml-auto font-mono text-xs">Live</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={provinceData || []} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="province" type="category" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={120} />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card className="border-border bg-card flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              System Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-1 space-y-3">
            {activityData?.map((item) => (
              <div key={item.id} className="flex gap-3 text-sm">
                <div className="mt-1 shrink-0">
                  <StateDot state={item.toState} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{item.childName}</p>
                  <p className="text-xs text-muted-foreground">
                    → <span className="text-foreground capitalize">{item.toState}</span>
                    {" "}by {item.actorName}
                  </p>
                  <p className="text-xs text-muted-foreground/60 font-mono">
                    {format(new Date(item.createdAt), "MMM d, HH:mm")}
                  </p>
                </div>
              </div>
            ))}
            {(!activityData || activityData.length === 0) && (
              <p className="text-sm text-muted-foreground text-center pt-8">No activity yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* OIDC4VP modal */}
      <OidcAuthModal
        open={oidcOpen}
        onClose={() => setOidcOpen(false)}
        onVerified={handleSessionVerified}
        title="Registrar General Authentication"
        description="Your identity must be verified via OIDC4VP before certifying official birth records."
        context="staff"
        bypassLabel="Demo Bypass — skip QR verification"
      />
    </div>
  );
}
