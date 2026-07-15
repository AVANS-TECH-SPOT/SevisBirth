import { Router } from "express";
import { db } from "@workspace/db";
import { birthRecordsTable, stateHistoryTable } from "@workspace/db";
import { eq, desc, and, ilike, sql, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../lib/auth";
import type { AuthUser } from "../lib/auth";

const router = Router();

// State machine
const STATE_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  received: "Received",
  reviewing: "Reviewing",
  approved: "Approved",
  rejected: "Rejected",
  certifying: "Certifying",
  complete: "Complete",
  voided: "Voided",
};

const TRANSITIONS: Record<string, Record<string, string[]>> = {
  submitted: { received: ["system", "civil_registrar", "facility_manager"] },
  received: { reviewing: ["system", "civil_registrar"] },
  reviewing: {
    approved: ["civil_registrar"],
    rejected: ["civil_registrar"],
  },
  rejected: { submitted: ["field_worker"] },
  approved: { certifying: ["system", "civil_registrar", "registrar_general"] },
  certifying: { complete: ["system", "civil_registrar", "registrar_general"] },
  complete: { voided: ["registrar_general"] },
};

async function recordTransition(
  recordId: string,
  fromState: string | null,
  toState: string,
  actorName: string,
  actorRole: string,
  reason?: string
) {
  await db.insert(stateHistoryTable).values({
    recordId,
    fromState,
    toState,
    actorName,
    actorRole,
    reason: reason ?? null,
  });
}

function formatRecord(row: typeof birthRecordsTable.$inferSelect) {
  return {
    id: row.id,
    state: row.state,
    stateLabel: STATE_LABELS[row.state] ?? row.state,
    registrationType: row.registrationType,
    childFirstName: row.childFirstName,
    childLastName: row.childLastName,
    childDob: row.childDob,
    childSex: row.childSex,
    birthPlace: row.birthPlace,
    province: row.province,
    district: row.district,
    attendant: row.attendant,
    adultName: row.adultName,
    adultRelation: row.adultRelation,
    adultUid: row.adultUid,
    verifyMethod: row.verifyMethod,
    witness1: row.witness1,
    witness2: row.witness2,
    dedupFlag: row.dedupFlag,
    dedupStatus: row.dedupStatus,
    notes: row.notes,
    operatorName: row.operatorName,
    operatorRole: row.operatorRole,
    facilityCode: row.facilityCode,
    gpsLat: row.gpsLat,
    gpsLng: row.gpsLng,
    certificateId: row.certificateId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /birth-records
router.get("/birth-records", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { state, province, search, page = "1", limit = "20" } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, parseInt(limit) || 20);
  const offset = (pageNum - 1) * limitNum;

  const conditions: ReturnType<typeof eq>[] = [];

  // field_workers only see their own records
  if (user.role === "field_worker") {
    conditions.push(eq(birthRecordsTable.operatorName, user.name));
  }
  // facility_managers see their facility
  if (user.role === "facility_manager") {
    conditions.push(eq(birthRecordsTable.facilityCode, user.facilityCode));
  }

  if (state) conditions.push(eq(birthRecordsTable.state, state));
  if (province) conditions.push(eq(birthRecordsTable.province, province));
  if (search) {
    conditions.push(
      or(
        ilike(birthRecordsTable.childFirstName, `%${search}%`),
        ilike(birthRecordsTable.childLastName, `%${search}%`),
        ilike(birthRecordsTable.adultName, `%${search}%`)
      ) as ReturnType<typeof eq>
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [records, countResult] = await Promise.all([
    db
      .select()
      .from(birthRecordsTable)
      .where(whereClause)
      .orderBy(desc(birthRecordsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(birthRecordsTable)
      .where(whereClause),
  ]);

  res.json({
    records: records.map(formatRecord),
    total: countResult[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// POST /birth-records
router.post("/birth-records", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const body = req.body;

  const id = "SB-" + new Date().getFullYear() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  const [record] = await db
    .insert(birthRecordsTable)
    .values({
      id,
      state: "submitted",
      registrationType: body.registrationType ?? "standard",
      childFirstName: body.childFirstName,
      childLastName: body.childLastName,
      childDob: body.childDob,
      childSex: body.childSex,
      birthPlace: body.birthPlace,
      province: body.province,
      district: body.district,
      attendant: body.attendant,
      adultName: body.adultName ?? null,
      adultRelation: body.adultRelation ?? null,
      adultUid: body.adultUid ?? null,
      verifyMethod: body.verifyMethod ?? "qr",
      witness1: body.witness1 ?? null,
      witness2: body.witness2 ?? null,
      dedupFlag: body.dedupFlag ?? false,
      dedupStatus: body.dedupStatus ?? null,
      notes: body.notes ?? null,
      operatorName: user.name,
      operatorRole: user.role,
      facilityCode: user.facilityCode,
      gpsLat: body.gpsLat ?? null,
      gpsLng: body.gpsLng ?? null,
    })
    .returning();

  await recordTransition(id, null, "submitted", user.name, user.role);

  // Auto-advance: submitted → received → reviewing
  await autoAdvance(id, user);

  const final = await db
    .select()
    .from(birthRecordsTable)
    .where(eq(birthRecordsTable.id, id))
    .limit(1);

  res.status(201).json(formatRecord(final[0]));
});

// GET /birth-records/:id
router.get("/birth-records/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const [record] = await db
    .select()
    .from(birthRecordsTable)
    .where(eq(birthRecordsTable.id, id))
    .limit(1);

  if (!record) {
    res.status(404).json({ error: "Record not found" });
    return;
  }

  const history = await db
    .select()
    .from(stateHistoryTable)
    .where(eq(stateHistoryTable.recordId, id))
    .orderBy(desc(stateHistoryTable.createdAt));

  res.json({
    ...formatRecord(record),
    history: history.map((h) => ({
      id: h.id,
      fromState: h.fromState,
      toState: h.toState,
      actorName: h.actorName,
      actorRole: h.actorRole,
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
    })),
  });
});

// POST /birth-records/:id/transition
router.post("/birth-records/:id/transition", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { id } = req.params;
  const { toState, reason } = req.body as { toState: string; reason?: string };

  const [record] = await db
    .select()
    .from(birthRecordsTable)
    .where(eq(birthRecordsTable.id, id))
    .limit(1);

  if (!record) {
    res.status(404).json({ error: "Record not found" });
    return;
  }

  const fromState = record.state;
  const allowedRoles = TRANSITIONS[fromState]?.[toState];

  if (!allowedRoles) {
    res.status(400).json({ error: `Cannot transition from ${fromState} to ${toState}` });
    return;
  }

  if (!allowedRoles.includes(user.role)) {
    res.status(403).json({ error: `Role '${user.role}' cannot perform this transition` });
    return;
  }

  // Generate certificate ID on complete
  let certificateId = record.certificateId;
  if (toState === "complete" && !certificateId) {
    certificateId = "PNGCIR-" + new Date().getFullYear() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  await db
    .update(birthRecordsTable)
    .set({ state: toState, updatedAt: new Date(), certificateId })
    .where(eq(birthRecordsTable.id, id));

  await recordTransition(id, fromState, toState, user.name, user.role, reason);

  res.json({
    id,
    previousState: fromState,
    newState: toState,
    newStateLabel: STATE_LABELS[toState] ?? toState,
  });
});

async function autoAdvance(id: string, _user: AuthUser) {
  const systemTransitions: Record<string, string> = {
    submitted: "received",
    received: "reviewing",
    approved: "certifying",
    certifying: "complete",
  };

  for (let i = 0; i < 2; i++) {
    const [row] = await db
      .select({ state: birthRecordsTable.state })
      .from(birthRecordsTable)
      .where(eq(birthRecordsTable.id, id))
      .limit(1);

    if (!row) return;
    const next = systemTransitions[row.state];
    if (!next) return;

    await db
      .update(birthRecordsTable)
      .set({ state: next, updatedAt: new Date() })
      .where(eq(birthRecordsTable.id, id));

    await recordTransition(id, row.state, next, "System", "system");
  }
}

export default router;
