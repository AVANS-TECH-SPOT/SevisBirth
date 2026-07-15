import { Router } from "express";
import { db } from "@workspace/db";
import { birthRecordsTable, stateHistoryTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import type { AuthUser } from "../lib/auth";

const router = Router();

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

router.get("/stats", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;

  const whereClause =
    user.role === "field_worker"
      ? sql`operator_name = ${user.name}`
      : user.role === "facility_manager"
      ? sql`facility_code = ${user.facilityCode}`
      : sql`1=1`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [byStateRows, todayRow, flaggedRow] = await Promise.all([
    db.execute(
      sql`SELECT state, COUNT(*)::int as count FROM birth_records WHERE ${whereClause} GROUP BY state`
    ),
    db.execute(
      sql`SELECT COUNT(*)::int as count FROM birth_records WHERE ${whereClause} AND created_at >= ${today.toISOString()}`
    ),
    db.execute(
      sql`SELECT COUNT(*)::int as count FROM birth_records WHERE ${whereClause} AND dedup_flag = true`
    ),
  ]);

  const byState: Record<string, number> = {};
  for (const row of byStateRows.rows as { state: string; count: number }[]) {
    byState[row.state] = row.count;
  }

  const total = Object.values(byState).reduce((a, b) => a + b, 0);

  res.json({
    total,
    today: (todayRow.rows[0] as any)?.count ?? 0,
    pending: (byState["submitted"] ?? 0) + (byState["received"] ?? 0),
    inReview: byState["reviewing"] ?? 0,
    approved: byState["approved"] ?? 0,
    complete: byState["complete"] ?? 0,
    flagged: (flaggedRow.rows[0] as any)?.count ?? 0,
    byState,
  });
});

router.get("/stats/by-province", requireAuth, async (_req, res) => {
  const rows = await db.execute(
    sql`SELECT province, COUNT(*)::int as count FROM birth_records GROUP BY province ORDER BY count DESC`
  );
  res.json(
    (rows.rows as { province: string; count: number }[]).map((r) => ({
      province: r.province,
      count: r.count,
    }))
  );
});

router.get("/stats/by-state", requireAuth, async (_req, res) => {
  const rows = await db.execute(
    sql`SELECT state, COUNT(*)::int as count FROM birth_records GROUP BY state ORDER BY count DESC`
  );
  res.json(
    (rows.rows as { state: string; count: number }[]).map((r) => ({
      state: r.state,
      stateLabel: STATE_LABELS[r.state] ?? r.state,
      count: r.count,
    }))
  );
});

router.get("/activity", requireAuth, async (_req, res) => {
  const rows = await db.execute(
    sql`
      SELECT sh.id, sh.record_id, sh.from_state, sh.to_state, sh.actor_name, sh.actor_role, sh.reason, sh.created_at,
             br.child_first_name, br.child_last_name
      FROM state_history sh
      JOIN birth_records br ON sh.record_id = br.id
      ORDER BY sh.created_at DESC
      LIMIT 30
    `
  );

  res.json(
    (rows.rows as any[]).map((r) => ({
      id: r.id,
      recordId: r.record_id,
      childName: `${r.child_first_name} ${r.child_last_name}`,
      fromState: r.from_state,
      toState: r.to_state,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      reason: r.reason,
      createdAt: new Date(r.created_at).toISOString(),
    }))
  );
});

export default router;
