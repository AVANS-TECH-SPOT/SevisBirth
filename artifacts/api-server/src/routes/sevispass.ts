import { Router } from "express";
import { requireAuth } from "../lib/auth";

const router = Router();

const MOCK_NAMES = [
  "Mary Kila", "Peter Naime", "Susan Tua", "James Walo",
  "Grace Kona", "David Manu", "Elizabeth Raka", "Thomas Sione",
  "Anna Beno", "Michael Laki",
];

let nameIdx = 0;

router.post("/sevispass/mock-scan", requireAuth, async (req, res) => {
  const { context, name } = req.body as { context: string; name?: string };

  // Simulate ~500ms verification delay (handled by client; we just respond)
  const resolvedName = name?.trim() || MOCK_NAMES[nameIdx++ % MOCK_NAMES.length];
  const uid = "SP-" + resolvedName.replace(/\s/g, "").substring(0, 4).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

  // 5% chance of dedup warning, 2% chance of match for demo interest
  const rand = Math.random();
  let dedup: { status: "clear" | "warning" | "match"; method: string; biometricScore: number | null };

  if (rand < 0.02) {
    dedup = { status: "match", method: "local_composite", biometricScore: null };
  } else if (rand < 0.07) {
    dedup = {
      status: "warning",
      method: "local_biometric",
      biometricScore: parseFloat((0.82 + Math.random() * 0.12).toFixed(3)),
    };
  } else {
    dedup = { status: "clear", method: "local_1n", biometricScore: null };
  }

  const tierMap: Record<string, string> = {
    parent: "Tier 2 — Community Member",
    witness: "Tier 1 — Community Member",
  };

  res.json({
    verified: true,
    uid,
    name: resolvedName,
    tier: context === "parent" ? 2 : 1,
    tierLabel: tierMap[context] ?? "Tier 1",
    dedup,
  });
});

export default router;
