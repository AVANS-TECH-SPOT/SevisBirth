import { db, usersTable } from "./index.js";
import { randomUUID } from "crypto";

const demoUsers = [
  {
    name: "Mary Kila",
    username: "mary",
    role: "field_worker",
    facilityName: "Kila Clinic",
    facilityCode: "KLC001",
  },
  {
    name: "Dr. Peter Naime",
    username: "peter",
    role: "facility_manager",
    facilityName: "Port Moresby General Hospital",
    facilityCode: "PMGH001",
  },
  {
    name: "Susan Tua",
    username: "susan",
    role: "civil_registrar",
    facilityName: "National Civil Registry",
    facilityCode: "NCR001",
  },
  {
    name: "James Walo",
    username: "james",
    role: "registrar_general",
    facilityName: "Registrar General Office",
    facilityCode: "RGO001",
  },
];

async function seed() {
  try {
    console.log("🌱 Seeding demo users...");

    for (const user of demoUsers) {
      const userId = randomUUID();

      await db.insert(usersTable).values({
        id: userId,
        name: user.name,
        username: user.username,
        passwordHash: "demo", // Demo mode only - not used
        role: user.role,
        tier: 1,
        facilityName: user.facilityName,
        facilityCode: user.facilityCode,
        sevispassId: `SP-${user.username.toUpperCase()}-001`,
        createdAt: new Date(),
      });

      console.log(`✅ Created user: ${user.username} (${user.name})`);
    }

    console.log("✨ Seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
