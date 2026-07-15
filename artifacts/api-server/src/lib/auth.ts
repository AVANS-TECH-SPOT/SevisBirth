import { db } from "@workspace/db";
import { sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  tier: number;
  facilityName: string;
  facilityCode: string;
  sevispassId: string;
}

export async function validateSession(token: string): Promise<AuthUser | null> {
  const rows = await db
    .select({
      userId: sessionsTable.userId,
      expiresAt: sessionsTable.expiresAt,
      active: sessionsTable.active,
      name: usersTable.name,
      role: usersTable.role,
      tier: usersTable.tier,
      facilityName: usersTable.facilityName,
      facilityCode: usersTable.facilityCode,
      sevispassId: usersTable.sevispassId,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.id, token))
    .limit(1);

  if (!rows.length) return null;
  const row = rows[0];
  if (!row.active || new Date(row.expiresAt) < new Date()) return null;

  return {
    id: row.userId,
    name: row.name,
    role: row.role,
    tier: row.tier,
    facilityName: row.facilityName,
    facilityCode: row.facilityCode,
    sevispassId: row.sevispassId,
  };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await validateSession(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  (req as any).user = user;
  next();
}
