import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ChevronLeft, CheckCircle2, AlertTriangle, ShieldCheck,
  UserCheck, Shield, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBirthRecord, BirthRecordInputRegistrationType } from "@workspace/api-client-react";
import { useToast } from "@/components/ui/toast/use-toast";
import { OidcAuthModal, type OidcVerifiedUser } from "@/components/oidc-auth-modal";
import { useAuth } from "@/hooks/use-auth";

const PROVINCES = [
  "Central", "Gulf", "Milne Bay", "Oro", "Western", "Southern Highlands",
  "Hela", "Enga", "Sandaun", "Western Highlands", "Jiwaka", "Simbu",
  "Eastern Highlands", "Morobe", "Madang", "East Sepik", "Bougainville",
  "New Ireland", "Manus", "East New Britain", "West New Britain", "NCD",
];

const formSchema = z.object({
  registrationType: z.enum(["standard", "late", "foundling", "adoption"]),
  childFirstName: z.string().min(2, "Required"),
  childLastName: z.string().min(2, "Required"),
  childDob: z.string().min(1, "Required"),
  childSex: z.enum(["Male", "Female"]),
  birthPlace: z.string().min(2, "Required"),
  province: z.string().min(2, "Required"),
  district: z.string().min(2, "Required"),
  attendant: z.string().min(2, "Required"),
  adultName: z.string().optional(),
  adultRelation: z.string().optional(),
  adultUid: z.string().optional(),
  verifyMethod: z.string().default("qr"),
  witness1: z.string().optional(),
  witness1Uid: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

function VerifiedBadge({ user }: { user: OidcVerifiedUser }) {
  return (
    <Card className={`border-2 ${user.dedup.status === "clear" ? "border-green-500/40 bg-green-500/8" : user.dedup.status === "warning" ? "border-amber-500/40 bg-amber-500/8" : "border-red-500/40 bg-red-500/8"}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className={`h-7 w-7 ${user.dedup.status === "clear" ? "text-green-500" : user.dedup.status === "warning" ? "text-amber-500" : "text-red-500"}`} />
          <div>
            <p className={`font-bold text-sm ${user.dedup.status === "clear" ? "text-green-500" : user.dedup.status === "warning" ? "text-amber-500" : "text-red-500"}`}>
              Identity Verified via OIDC4VP
            </p>
            <p className="font-semibold text-base mt-0.5">{user.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{user.uid}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs font-mono">SD-JWT VC</Badge>
          <Badge variant="outline" className="text-xs font-mono">{user.tierLabel}</Badge>
          {user.ageOver18 && <Badge variant="outline" className="text-xs text-green-500 border-green-500/40">Age 18+ Verified</Badge>}
        </div>
        {user.dedup.status !== "clear" && (
          <div className={`flex items-start gap-2 text-xs p-2 rounded-lg ${user.dedup.status === "warning" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"}`}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              {user.dedup.status === "warning"
                ? `Dedup warning (${user.dedup.method}) — score ${user.dedup.score?.toFixed(3)}. Continue with care.`
                : "Possible duplicate match. Registration will be flagged for manual review."}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ChwRegistration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  // OIDC modal state
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [witnessModalOpen, setWitnessModalOpen] = useState(false);
  const [parentVerified, setParentVerified] = useState<OidcVerifiedUser | null>(null);
  const [witnessVerified, setWitnessVerified] = useState<OidcVerifiedUser | null>(null);

  const createMutation = useCreateBirthRecord();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { registrationType: "standard", childSex: "Male", verifyMethod: "qr" },
  });

  function handleParentVerified(u: OidcVerifiedUser) {
    setParentVerified(u);
    setParentModalOpen(false);
    form.setValue("adultName", u.name);
    form.setValue("adultUid", u.uid);
    form.setValue("verifyMethod", "qr");
    // flag dedup
    if (u.dedup.status !== "clear") {
      form.setValue("verifyMethod", "qr_dedup_flag");
    }
  }

  function handleWitnessVerified(u: OidcVerifiedUser) {
    setWitnessVerified(u);
    setWitnessModalOpen(false);
    form.setValue("witness1", u.name);
    form.setValue("witness1Uid", u.uid);
  }

  const onSubmit = (data: FormData) => {
    createMutation.mutate(
      {
        data: {
          ...data,
          dedupFlag: parentVerified?.dedup.status !== "clear",
          dedupStatus: parentVerified?.dedup.status ?? "clear",
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: "Record submitted successfully" });
          setLocation("/chw");
        },
        onError: () => toast({ title: "Failed to submit record", variant: "destructive" }),
      }
    );
  };

  const nextStep = () => {
    const fieldsMap: Record<number, (keyof FormData)[]> = {
      1: ["registrationType"],
      3: ["childFirstName", "childLastName", "childDob", "childSex"],
      4: ["birthPlace", "province", "district", "attendant"],
    };
    const fields = fieldsMap[step];
    if (fields) {
      form.trigger(fields).then((ok) => { if (ok) setStep(step + 1); });
    } else {
      setStep(step + 1);
    }
  };

  const TOTAL_STEPS = 5;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 h-14 flex items-center border-b border-border bg-card shrink-0 gap-3">
        <button onClick={() => step > 1 ? setStep(step - 1) : setLocation("/chw")} className="p-2 -ml-2">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="font-semibold flex-1">New Registration</span>
        {/* Progress dots */}
        <div className="flex gap-1.5 mr-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i < step ? "bg-primary w-4" : i === step - 1 ? "bg-primary w-4" : "bg-border w-1.5"}`} />
          ))}
        </div>
        <div className="text-xs font-mono text-muted-foreground shrink-0">{step}/{TOTAL_STEPS}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ── STEP 1: Registration Type ── */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Registration Type</h2>
                  <p className="text-muted-foreground text-sm">Select the category of birth registration.</p>
                </div>

                <FormField control={form.control} name="registrationType" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid gap-3">
                        {[
                          { id: "standard", label: "Standard", desc: "Within 1 year of birth" },
                          { id: "late", label: "Late", desc: "After 1 year of birth" },
                          { id: "foundling", label: "Foundling", desc: "Unknown parents / abandoned" },
                          { id: "adoption", label: "Adoption", desc: "Legal adoption registration" },
                        ].map(({ id, label, desc }) => (
                          <div
                            key={id}
                            onClick={() => field.onChange(id)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${field.value === id ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                          >
                            <div className="font-bold">{label}</div>
                            <div className="text-sm text-muted-foreground">{desc}</div>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="button" className="w-full h-12 text-base rounded-xl" onClick={nextStep}>
                  Continue
                </Button>
              </div>
            )}

            {/* ── STEP 2: Parent / Informant Identity Verification ── */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Parent / Informant Identity</h2>
                  <p className="text-muted-foreground text-sm">
                    Verify the parent or informant using their SevisPass digital identity wallet via OIDC4VP.
                  </p>
                </div>

                {/* Protocol info card */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs font-mono text-primary">
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span>OIDC4VP · SD-JWT VC · T5-OmniMatch 1:N Dedup</span>
                </div>

                {!parentVerified ? (
                  <div className="space-y-3">
                    <div
                      onClick={() => setParentModalOpen(true)}
                      className="aspect-[4/3] w-full max-w-[260px] mx-auto rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-primary/10 transition-colors"
                    >
                      <UserCheck className="h-12 w-12 text-primary" />
                      <div className="text-center">
                        <p className="font-semibold text-sm">Scan SevisPass QR</p>
                        <p className="text-xs text-muted-foreground mt-1">OIDC4VP verification</p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setParentModalOpen(true)}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Open Verification Flow
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <VerifiedBadge user={parentVerified} />

                    <FormField control={form.control} name="adultRelation" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship to Child</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 bg-card">
                              <SelectValue placeholder="Select relation..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Mother">Mother</SelectItem>
                            <SelectItem value="Father">Father</SelectItem>
                            <SelectItem value="Guardian">Guardian</SelectItem>
                            <SelectItem value="Other">Other Informant</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground w-full" onClick={() => setParentVerified(null)}>
                      Re-verify identity
                    </Button>
                  </div>
                )}

                <Button
                  type="button"
                  className="w-full h-12 text-base rounded-xl"
                  onClick={nextStep}
                  disabled={!parentVerified || !form.watch("adultRelation")}
                >
                  Continue
                </Button>
              </div>
            )}

            {/* ── STEP 3: Child Details ── */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Child Details</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="childFirstName" render={({ field }) => (
                    <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} className="h-12 bg-card" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="childLastName" render={({ field }) => (
                    <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} className="h-12 bg-card" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="childDob" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} className="h-12 bg-card" /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="childSex" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex</FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                      {["Male", "Female"].map(sex => (
                        <div key={sex} onClick={() => field.onChange(sex)}
                          className={`p-3 rounded-xl border text-center cursor-pointer font-medium transition-all ${field.value === sex ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}
                        >{sex}</div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="button" className="w-full h-12 text-base rounded-xl" onClick={nextStep}>Continue</Button>
              </div>
            )}

            {/* ── STEP 4: Birth Location ── */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Birth Location</h2>
                </div>

                <FormField control={form.control} name="province" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Province</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-12 bg-card"><SelectValue placeholder="Select province..." /></SelectTrigger></FormControl>
                      <SelectContent>{PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="district" render={({ field }) => (
                  <FormItem><FormLabel>District / LLG</FormLabel><FormControl><Input {...field} className="h-12 bg-card" /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="birthPlace" render={({ field }) => (
                  <FormItem><FormLabel>Village / Facility Name</FormLabel><FormControl><Input {...field} className="h-12 bg-card" /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="attendant" render={({ field }) => (
                  <FormItem><FormLabel>Attendant at Birth</FormLabel><FormControl><Input {...field} placeholder="e.g. Doctor, Midwife, Village Attendant" className="h-12 bg-card" /></FormControl><FormMessage /></FormItem>
                )} />

                <Button type="button" className="w-full h-12 text-base rounded-xl" onClick={nextStep}>Continue</Button>
              </div>
            )}

            {/* ── STEP 5: Witness + Review + Submit ── */}
            {step === 5 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 pb-8">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Witness Verification & Review</h2>
                  <p className="text-muted-foreground text-sm">Optionally verify a witness, then review and submit.</p>
                </div>

                {/* Witness verification */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Witness Verification</span>
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  </div>

                  {!witnessVerified ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 border-dashed border-primary/40 text-primary"
                      onClick={() => setWitnessModalOpen(true)}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Verify Witness via SevisPass
                    </Button>
                  ) : (
                    <Card className="border-green-500/30 bg-green-500/5">
                      <CardContent className="p-3 flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-green-500">Witness Verified</p>
                          <p className="text-sm font-medium">{witnessVerified.name}</p>
                          <p className="font-mono text-xs text-muted-foreground truncate">{witnessVerified.uid}</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => setWitnessVerified(null)}>
                          Change
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Summary */}
                <Card className="bg-card border-border">
                  <CardContent className="p-0 divide-y divide-border text-sm">
                    {[
                      ["Type", <span className="capitalize">{form.getValues("registrationType")}</span>],
                      ["Informant", <div><div className="font-medium">{form.getValues("adultName")}</div><div className="text-xs text-muted-foreground">{form.getValues("adultRelation")}</div></div>],
                      ["Child", <div><div className="font-medium">{form.getValues("childFirstName")} {form.getValues("childLastName")}</div><div className="text-xs text-muted-foreground">{form.getValues("childSex")} · {form.getValues("childDob")}</div></div>],
                      ["Location", <div><div className="font-medium">{form.getValues("birthPlace")}</div><div className="text-xs text-muted-foreground">{form.getValues("district")}, {form.getValues("province")}</div></div>],
                      ["Attendant", <span>{form.getValues("attendant")}</span>],
                    ].map(([label, value], i) => (
                      <div key={i} className="p-4 grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground text-xs">{label}</span>
                        <div className="col-span-2">{value as React.ReactNode}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Field Notes (Optional)</FormLabel><FormControl><Input {...field} className="h-12 bg-card" /></FormControl></FormItem>
                )} />

                <Button
                  type="submit"
                  className="w-full h-14 text-lg rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Submitting..." : "Submit Birth Record"}
                </Button>
              </div>
            )}

          </form>
        </Form>
      </div>

      {/* OIDC modals */}
      <OidcAuthModal
        open={parentModalOpen}
        onClose={() => setParentModalOpen(false)}
        onVerified={handleParentVerified}
        title="Verify Parent / Informant"
        description="The parent or informant must scan the QR code with their SevisPass wallet."
        context="parent"
        bypassLabel="Demo Bypass — simulate wallet scan"
      />
      <OidcAuthModal
        open={witnessModalOpen}
        onClose={() => setWitnessModalOpen(false)}
        onVerified={handleWitnessVerified}
        title="Verify Witness"
        description="The witness must verify their identity using their SevisPass digital credential."
        context="witness"
        bypassLabel="Demo Bypass — simulate wallet scan"
      />
    </div>
  );
}
