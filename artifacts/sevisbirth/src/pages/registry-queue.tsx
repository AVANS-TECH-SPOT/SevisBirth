import { useState } from "react";
import { useListBirthRecords, useTransitionBirthRecord } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle, FileText, User, ShieldCheck, Zap } from "lucide-react";
import { StateDot } from "@/components/status-badge";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { getListBirthRecordsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { OidcAuthModal, type OidcVerifiedUser } from "@/components/oidc-auth-modal";

export default function RegistryQueue() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // OIDC4VP session for this registrar
  const [sessionVerified, setSessionVerified] = useState(false);
  const [sessionUser, setSessionUser] = useState<OidcVerifiedUser | null>(null);
  const [oidcOpen, setOidcOpen] = useState(false);

  const { data, isLoading } = useListBirthRecords({ state: "reviewing", limit: 50 });

  const transitionMutation = useTransitionBirthRecord({
    mutation: {
      onSuccess: () => {
        setSelectedId(null);
        queryClient.invalidateQueries({ queryKey: getListBirthRecordsQueryKey() });
      },
    },
  });

  const selectedRecord = data?.records.find((r) => r.id === selectedId);

  function handleAction(toState: "approved" | "rejected") {
    if (!selectedId) return;
    if (!sessionVerified) { setOidcOpen(true); return; }
    transitionMutation.mutate({
      id: selectedId,
      data: { toState, reason: toState === "rejected" ? "Rejected by civil registrar" : undefined },
    });
  }

  function handleSessionVerified(u: OidcVerifiedUser) {
    setSessionUser(u);
    setSessionVerified(true);
    setOidcOpen(false);
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto h-[calc(100vh-3.5rem)] flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Civil Registrar Queue</h1>
          <p className="text-muted-foreground mt-1">Review and approve verified birth registrations.</p>
        </div>

        {/* Session verification badge */}
        {sessionVerified && sessionUser ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-sm">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <div>
              <p className="font-semibold text-green-500 text-xs">Session Verified via OIDC4VP</p>
              <p className="text-xs text-muted-foreground">{sessionUser.name} · {sessionUser.uid}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-500">Session not verified</p>
              <p className="text-xs text-muted-foreground">OIDC4VP required to approve/reject</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 gap-1.5 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
              onClick={() => setOidcOpen(true)}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Verify Now
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
        {/* List Panel */}
        <Card className="col-span-1 border-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border bg-card font-medium flex justify-between items-center">
            <span>Pending Review</span>
            <Badge variant="secondary">{data?.total || 0}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoading && (
              <div className="p-8 flex justify-center">
                <Loader2 className="animate-spin h-6 w-6 text-primary" />
              </div>
            )}
            {data?.records.map((record) => (
              <div
                key={record.id}
                onClick={() => setSelectedId(record.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === record.id
                    ? "bg-primary/10 border-primary"
                    : "bg-card border-border hover:border-primary/50"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm">{record.childFirstName} {record.childLastName}</span>
                  {record.dedupFlag && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {record.id} · {format(new Date(record.createdAt), "MMM d, HH:mm")}
                </div>
                <div className="text-xs mt-1.5 flex justify-between">
                  <span>{record.province}</span>
                  <span className="capitalize text-primary">{record.registrationType}</span>
                </div>
              </div>
            ))}
            {data?.records.length === 0 && (
              <div className="text-center p-8 text-muted-foreground text-sm">No records pending review.</div>
            )}
          </div>
        </Card>

        {/* Detail Panel */}
        <Card className="col-span-2 border-border flex flex-col overflow-hidden bg-card/50">
          {selectedRecord ? (
            <>
              <div className="p-6 border-b border-border bg-card flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedRecord.childFirstName} {selectedRecord.childLastName}
                  </h2>
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span className="font-mono text-xs">ID: {selectedRecord.id}</span>
                    <span>·</span>
                    <Badge variant="outline">
                      <StateDot state={selectedRecord.state} />
                      <span className="ml-1.5">{selectedRecord.stateLabel}</span>
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-3">
                  {!sessionVerified && (
                    <div className="flex items-center gap-2 text-xs text-amber-500 mr-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Verify session first</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="text-red-500 hover:text-red-500 hover:bg-red-500/10 border-red-500/20"
                    onClick={() => handleAction("rejected")}
                    disabled={transitionMutation.isPending}
                    size="sm"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                  <Button
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={() => handleAction("approved")}
                    disabled={transitionMutation.isPending}
                    size="sm"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                  </Button>
                </div>
              </div>

              {/* OIDC session required notice (if not verified) */}
              {!sessionVerified && (
                <div className="mx-6 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-sm">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-500">OIDC4VP session required</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You must verify your identity before approving or rejecting records.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => setOidcOpen(true)}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verify Identity
                  </Button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-8">

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" /> Child Information
                      </h3>
                      <div className="bg-card p-4 rounded-xl border border-border">
                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                          {[
                            ["Date of Birth", format(new Date(selectedRecord.childDob), "PP")],
                            ["Sex", selectedRecord.childSex],
                            ["Registration Type", selectedRecord.registrationType],
                            ["Birth Place", selectedRecord.birthPlace],
                            ["Location", `${selectedRecord.district}, ${selectedRecord.province}`],
                          ].map(([k, v]) => (
                            <><div key={k + "k"} className="text-muted-foreground">{k}</div><div key={k + "v"} className="font-medium capitalize">{v}</div></>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Operator Metadata
                      </h3>
                      <div className="bg-card p-4 rounded-xl border border-border">
                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                          <div className="text-muted-foreground">Facility Code</div>
                          <div className="font-mono text-xs">{selectedRecord.facilityCode}</div>
                          <div className="text-muted-foreground">Submitted By</div>
                          <div className="font-medium">{selectedRecord.operatorName}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" /> Identity Verification (OIDC4VP)
                      </h3>
                      <div className="bg-card p-4 rounded-xl border border-border space-y-3">
                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                          <div className="text-muted-foreground">Informant</div>
                          <div className="font-medium">{selectedRecord.adultName}</div>
                          <div className="text-muted-foreground">Relationship</div>
                          <div className="font-medium">{selectedRecord.adultRelation}</div>
                          <div className="text-muted-foreground">Verify Method</div>
                          <Badge variant="outline" className="w-fit text-xs font-mono text-primary border-primary/30">
                            {selectedRecord.verifyMethod?.startsWith("qr") ? "OIDC4VP" : selectedRecord.verifyMethod?.toUpperCase()}
                          </Badge>
                          <div className="text-muted-foreground">SevisPass UID</div>
                          <div className="font-mono text-xs">{selectedRecord.adultUid}</div>
                        </div>

                        {selectedRecord.dedupFlag ? (
                          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-amber-500">Dedup Warning</p>
                              <p className="text-xs text-amber-500/80 mt-1">
                                Potential duplicate via OmniMatch — manual review required.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-green-500 pt-2 border-t border-border">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>T5-OmniMatch: No duplicate found</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
              <FileText className="h-12 w-12 opacity-20" />
              <p>Select a record from the queue to review</p>
            </div>
          )}
        </Card>
      </div>

      {/* OIDC4VP verification modal */}
      <OidcAuthModal
        open={oidcOpen}
        onClose={() => setOidcOpen(false)}
        onVerified={handleSessionVerified}
        title="Civil Registrar Authentication"
        description="Verify your identity before approving or rejecting birth records. Required for audit compliance."
        context="staff"
        bypassLabel="Demo Bypass — skip QR verification"
      />
    </div>
  );
}
