import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../lib/auth";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username) {
    res.status(400).json({ error: "Username required" });
    return;
  }

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!users.length) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const user = users[0];

  // Demo: accept password "demo" or matching username
  if (password !== "demo" && password !== username) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  await db.insert(sessionsTable).values({
    id: sessionId,
    userId: user.id,
    expiresAt,
    active: true,
  });

  res.json({
    token: sessionId,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      tier: user.tier,
      facilityName: user.facilityName,
      facilityCode: user.facilityCode,
      sevispassId: user.sevispassId,
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  res.json(user);
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    await db
      .update(sessionsTable)
      .set({ active: false })
      .where(eq(sessionsTable.id, token));
  }
  res.json({ success: true });
});

export default router;
