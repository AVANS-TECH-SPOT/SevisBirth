import { useState } from "react";
import { useListBirthRecords, useGetBirthRecord } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Search, Filter, Loader2, ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { StateDot } from "@/components/status-badge";
import { format } from "date-fns";
import { RecordHistory } from "@/components/record-history";
import { useAuth } from "@/hooks/use-auth";
import {
  DataProtectionConsentBanner,
  SensitiveDataToolbar,
  MaskedField,
  AccessLogPanel,
  useDataProtectionConsent,
  logDataAccess,
} from "@/components/data-protection";

function RecordDetailDrawer({
  id,
  open,
  onOpenChange,
  sensitiveUnlocked,
  actorName,
}: {
  id: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sensitiveUnlocked: boolean;
  actorName: string;
}) {
  const { data, isLoading } = useGetBirthRecord(id || "", { query: { enabled: !!id } });

  if (open && id && data) {
    logDataAccess(actorName, "Viewed record detail", id);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh]">
        {isLoading || !data ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-4xl flex flex-col h-full overflow-hidden">
            <DrawerHeader className="border-b border-border text-left pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <DrawerTitle className="text-2xl">
                    {data.childFirstName} {data.childLastName}
                  </DrawerTitle>
                  <DrawerDescription className="font-mono mt-1">ID: {data.id}</DrawerDescription>
                </div>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  <StateDot state={data.state} />
                  <span className="ml-2">{data.stateLabel}</span>
                </Badge>
              </div>
            </DrawerHeader>

            <div className="p-6 overflow-y-auto space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Date of Birth</div>
                  <MaskedField
                    value={format(new Date(data.childDob), "PP")}
                    unlocked={sensitiveUnlocked}
                    onReveal={() => logDataAccess(actorName, "Revealed: Date of Birth", data.id, "childDob")}
                    className="font-medium"
                  />
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Sex</div>
                  <div className="font-medium">{data.childSex}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Reg. Type</div>
                  <div className="font-medium capitalize">{data.registrationType}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Location</div>
                  <div className="font-medium">{data.district}, {data.province}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informant */}
                <Card className="bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      Informant (OIDC4VP Verified)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between items-center border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Name</span>
                      <MaskedField
                        value={data.adultName}
                        unlocked={sensitiveUnlocked}
                        onReveal={() => logDataAccess(actorName, "Revealed: Informant Name", data.id, "adultName")}
                        className="font-medium text-right"
                      />
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Relation</span>
                      <span className="font-medium">{data.adultRelation || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Method</span>
                      <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                        {data.verifyMethod === "qr" || data.verifyMethod?.startsWith("qr") ? "OIDC4VP" : data.verifyMethod?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">SevisPass UID</span>
                      <MaskedField
                        value={data.adultUid}
                        unlocked={sensitiveUnlocked}
                        showPrefix={7}
                        onReveal={() => logDataAccess(actorName, "Revealed: SevisPass UID", data.id, "adultUid")}
                        className="font-mono text-xs"
                      />
                    </div>
                    {data.dedupFlag && (
                      <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-500 flex items-center gap-2">
                        <span>Dedup flag active — {data.dedupStatus}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Metadata */}
                <Card className="bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">System Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Operator</span>
                      <span className="font-medium">{data.operatorName}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Facility Code</span>
                      <span className="font-mono text-xs">{data.facilityCode}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">{format(new Date(data.createdAt), "PP")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dedup Status</span>
                      <span className={data.dedupFlag ? "text-amber-500 font-medium" : "text-green-500 font-medium"}>
                        {data.dedupFlag ? "Flagged" : "Clear"}
                      </span>
                    </div>
                    {data.certificateId && (
                      <div className="flex justify-between border-t border-border/50 pt-2">
                        <span className="text-muted-foreground">Certificate ID</span>
                        <span className="font-mono text-xs text-emerald-500">{data.certificateId}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-bold text-base mb-4">Record History</h3>
                <RecordHistory history={(data as any).history ?? []} />
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

export default function FacilityDashboard() {
  const { user } = useAuth();
  const actorName = user?.name ?? "Unknown";

  const {
    consented,
    sensitiveUnlocked,
    giveConsent,
    unlockSensitive,
    lockSensitive,
  } = useDataProtectionConsent(actorName);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState<string>("all");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  const { data, isLoading } = useListBirthRecords({
    search: searchTerm || undefined,
    state: filterState !== "all" ? filterState : undefined,
    limit: 50,
  });

  // Data protection consent gate
  if (!consented) {
    return (
      <DataProtectionConsentBanner
        actorName={actorName}
        role={user?.role?.replace("_", " ") ?? "Facility Manager"}
        onConsent={giveConsent}
      />
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 relative">
      {/* Access Log Slide-over */}
      <AccessLogPanel open={logOpen} onClose={() => setLogOpen(false)} />

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facility Records</h1>
          <p className="text-muted-foreground mt-1">
            Manage and verify local birth registrations — Port Moresby General Hospital
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => setLogOpen(true)}>
            <FileText className="h-3.5 w-3.5" />
            Access Log
          </Button>
          <div className="text-right">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Records</div>
            <div className="text-2xl font-bold font-mono">{data?.total || 0}</div>
          </div>
        </div>
      </div>

      {/* Data protection toolbar */}
      <SensitiveDataToolbar
        unlocked={sensitiveUnlocked}
        onUnlock={() => {
          unlockSensitive();
          logDataAccess(actorName, "Unlocked all sensitive fields");
        }}
        onLock={lockSensitive}
        recordCount={data?.total}
      />

      {/* Records table */}
      <Card className="border-border">
        <div className="p-4 border-b border-border flex gap-4 bg-card/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or parent..."
              className="pl-9 h-10 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              className="h-10 px-3 rounded-md bg-background border border-input text-sm"
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="received">Received</option>
              <option value="reviewing">Reviewing</option>
              <option value="approved">Approved</option>
              <option value="complete">Complete</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-card text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Record ID</th>
                  <th className="px-6 py-4 font-medium">Child Name</th>
                  <th className="px-6 py-4 font-medium">Date of Birth</th>
                  <th className="px-6 py-4 font-medium">
                    Informant
                    {!sensitiveUnlocked && (
                      <span className="ml-1.5 text-xs text-muted-foreground/60 font-normal font-mono">(masked)</span>
                    )}
                  </th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.records.map((record) => (
                  <tr key={record.id} className="hover:bg-card/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {record.id}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {record.childFirstName} {record.childLastName}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <MaskedField
                        value={format(new Date(record.childDob), "MMM d, yyyy")}
                        unlocked={sensitiveUnlocked}
                        showPrefix={3}
                        onReveal={() => logDataAccess(actorName, "Revealed: DOB in table", record.id, "childDob")}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <MaskedField
                        value={record.adultName}
                        unlocked={sensitiveUnlocked}
                        onReveal={() => logDataAccess(actorName, "Revealed: Informant name in table", record.id, "adultName")}
                        className="font-medium"
                      />
                      {record.adultRelation && (
                        <span className="block text-xs text-muted-foreground">{record.adultRelation}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-background">
                        <StateDot state={record.state} />
                        <span className="ml-1.5">{record.stateLabel}</span>
                      </Badge>
                      {record.dedupFlag && (
                        <Badge variant="outline" className="ml-1 text-amber-500 border-amber-500/30 text-xs">Dedup</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRecordId(record.id)}>
                        View <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {data?.records.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No records found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <RecordDetailDrawer
        id={selectedRecordId}
        open={!!selectedRecordId}
        onOpenChange={(open) => !open && setSelectedRecordId(null)}
        sensitiveUnlocked={sensitiveUnlocked}
        actorName={actorName}
      />
    </div>
  );
}
