import { Router } from "express";
import QRCode from "qrcode";
import { randomUUID } from "crypto";

const router = Router();

// In-memory session store (demo only)
interface OidcSession {
  id: string;
  status: "pending" | "scanning" | "verified" | "expired";
  context: string;
  verifiedUser?: {
    name: string;
    uid: string;
    sub: string;
    tier: number;
    tierLabel: string;
    ageOver18: boolean;
    credentials: string[];
    dedup: { status: "clear" | "warning" | "match"; method: string; score: number | null };
  };
  createdAt: Date;
  expiresAt: Date;
}

const sessions = new Map<string, OidcSession>();

// Clean up expired sessions periodically
setInterval(() => {
  const now = new Date();
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt < now) sessions.delete(id);
  }
}, 60_000);

const MOCK_VERIFIED_USERS = [
  { name: "Grace Kila", uid: "SP-GKIL-A2B3", sub: "did:sevis:png:GKIL-2021-A2B3" },
  { name: "Peter Wagi", uid: "SP-PWAG-C4D5", sub: "did:sevis:png:PWAG-2019-C4D5" },
  { name: "Mary Tua", uid: "SP-MTUA-E6F7", sub: "did:sevis:png:MTUA-2020-E6F7" },
  { name: "John Naime", uid: "SP-JNAI-G8H9", sub: "did:sevis:png:JNAI-2022-G8H9" },
  { name: "Ruth Sione", uid: "SP-RSIO-I0J1", sub: "did:sevis:png:RSIO-2018-I0J1" },
];
let mockUserIdx = 0;

// POST /api/oidc4vp/initiate — generate QR code
router.post("/oidc4vp/initiate", async (req, res) => {
  const { context = "parent", state, nonce } = req.body as {
    context?: string;
    state?: string;
    nonce?: string;
  };

  const sessionId = randomUUID();
  const resolvedState = state || randomUUID();
  const resolvedNonce = nonce || randomUUID();

  const session: OidcSession = {
    id: sessionId,
    status: "pending",
    context,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
  };
  sessions.set(sessionId, session);

  // Build the OIDC4VP URI that would go into the QR code
  const presentationUri = [
    `openid4vp://authorize`,
    `?response_type=vp_token`,
    `&client_id=sevisbirth.gov.pg`,
    `&client_id_scheme=web-origin`,
    `&nonce=${resolvedNonce}`,
    `&state=${resolvedState}`,
    `&request_uri=https://sso.sevispass.gov.pg/api/auth/request/${sessionId}`,
  ].join("");

  // Generate actual SVG QR code
  const svgQr = await QRCode.toString(presentationUri, {
    type: "svg",
    color: { dark: "#E8A838", light: "#0C0F14" },
    errorCorrectionLevel: "M",
    margin: 1,
  });

  res.json({
    sessionId,
    qrCode: svgQr,
    state: resolvedState,
    nonce: resolvedNonce,
    expiresIn: 600,
  });
});

// GET /api/oidc4vp/status — poll session status
router.get("/oidc4vp/status", (req, res) => {
  const { session: sessionId } = req.query as { session: string };
  const session = sessions.get(sessionId);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.expiresAt < new Date()) {
    res.json({ sessionId, authenticated: false, status: "expired" });
    return;
  }

  res.json({
    sessionId,
    authenticated: session.status === "verified",
    status: session.status,
    ...(session.status === "verified" && session.verifiedUser
      ? { user: session.verifiedUser }
      : {}),
  });
});

// POST /api/oidc4vp/bypass — demo bypass (simulates wallet completing auth)
router.post("/oidc4vp/bypass", (req, res) => {
  const { sessionId, name } = req.body as { sessionId: string; name?: string };
  const session = sessions.get(sessionId);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const base = MOCK_VERIFIED_USERS[mockUserIdx++ % MOCK_VERIFIED_USERS.length];
  const resolvedName = name?.trim() || base.name;
  const resolvedUid = "SP-" + resolvedName.replace(/\s/g, "").slice(0, 4).toUpperCase() + "-" + randomUUID().slice(0, 4).toUpperCase();

  const rand = Math.random();
  const dedup =
    rand < 0.02
      ? { status: "match" as const, method: "local_composite", score: null }
      : rand < 0.07
      ? { status: "warning" as const, method: "local_biometric", score: parseFloat((0.82 + rand).toFixed(3)) }
      : { status: "clear" as const, method: "local_1n", score: null };

  session.status = "verified";
  session.verifiedUser = {
    name: resolvedName,
    uid: resolvedUid,
    sub: `did:sevis:png:${resolvedUid}`,
    tier: session.context === "parent" ? 2 : session.context === "witness" ? 1 : 3,
    tierLabel:
      session.context === "parent"
        ? "Tier 2 — Community Member"
        : session.context === "witness"
        ? "Tier 1 — Community Member"
        : "Tier 3 — Health Professional",
    ageOver18: true,
    credentials: ["PNGNationalID", "SevisPassBiometric"],
    dedup,
  };

  sessions.set(sessionId, session);

  res.json({
    success: true,
    sessionId,
    user: session.verifiedUser,
  });
});

// POST /api/oidc4vp/callback — handle VP token (real wallet would hit this)
router.post("/oidc4vp/callback", (req, res) => {
  const { vp_token, state } = req.body;
  // In production: verify JWT signature, extract DID, lookup session by state
  // For demo: just return success
  res.json({ success: true, message: "VP token received (demo mode)" });
});

export default router;
