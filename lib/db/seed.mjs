import pg from "pg";
import { randomUUID } from "crypto";

const { Client } = pg;

const demoUsers = [
  // ========== COMMUNITY HEALTH WORKERS (CHW - Field Workers) ==========
  // Note: CHWs use credential-based login (username/password), no OIDC4VP
  {
    name: "Mary Kila",
    username: "mary",
    role: "field_worker",
    facilityName: "Kila Clinic",
    facilityCode: "KLC001",
    sevispassId: "",
  },
  {
    name: "Joseph Manu",
    username: "joseph",
    role: "field_worker",
    facilityName: "Goroka District Health Centre",
    facilityCode: "GDHC001",
    sevispassId: "",
  },
  {
    name: "Elizabeth Bena",
    username: "elizabeth",
    role: "field_worker",
    facilityName: "Lae Rural Health Post",
    facilityCode: "LRHP001",
    sevispassId: "",
  },
  {
    name: "Grace Raka",
    username: "grace",
    role: "field_worker",
    facilityName: "Mount Hagen Health Centre",
    facilityCode: "MHHC001",
    sevispassId: "",
  },
  {
    name: "Thomas Sione",
    username: "thomas",
    role: "field_worker",
    facilityName: "Kokopo Health Clinic",
    facilityCode: "KHC001",
    sevispassId: "",
  },

  // ========== HEALTH FACILITY MANAGERS (Staff) ==========
  // Note: Facility managers can use OIDC4VP login with SevisPass
  {
    name: "Dr. Peter Naime",
    username: "peter",
    role: "facility_manager",
    facilityName: "Port Moresby General Hospital",
    facilityCode: "PMGH001",
    sevispassId: "SP-MARY-2397",
  },
  {
    name: "Nurse Patricia Tuli",
    username: "patricia",
    role: "facility_manager",
    facilityName: "Goroka District Hospital",
    facilityCode: "GDH001",
    sevispassId: "SP-PTUR-E6F7",
  },
  {
    name: "Dr. Michael Lae",
    username: "michael",
    role: "facility_manager",
    facilityName: "Lae General Hospital",
    facilityCode: "LGH001",
    sevispassId: "SP-MLAE-F6G7",
  },
  {
    name: "Sister Anna Koki",
    username: "anna",
    role: "facility_manager",
    facilityName: "Mount Hagen Hospital",
    facilityCode: "MHH001",
    sevispassId: "SP-AKOKI-G8H9",
  },
  {
    name: "Dr. James Kokopo",
    username: "james_k",
    role: "facility_manager",
    facilityName: "Kokopo Hospital",
    facilityCode: "KH001",
    sevispassId: "SP-JKOK-H8I9",
  },
  {
    name: "Nurse David Madang",
    username: "david",
    role: "facility_manager",
    facilityName: "Madang Hospital",
    facilityCode: "MH001",
    sevispassId: "SP-DMAD-I0J1",
  },

  // ========== CIVIL REGISTRARS (Staff) ==========
  {
    name: "Susan Tua",
    username: "susan",
    role: "civil_registrar",
    facilityName: "National Capital District Civil Registry",
    facilityCode: "NCDCR001",
    sevispassId: "SP-SUSAN-5821", 
  },
  {
    name: "Robert Beno",
    username: "robert",
    role: "civil_registrar",
    facilityName: "Eastern Highlands Provincial Registry",
    facilityCode: "EHPR001",
    sevispassId: "SP-RBEN-K2L3",
  },
  {
    name: "Victoria Kamu",
    username: "victoria",
    role: "civil_registrar",
    facilityName: "Morobe Provincial Registry",
    facilityCode: "MPR001",
    sevispassId: "SP-VKAM-L2M3",
  },
  {
    name: "Samuel Roti",
    username: "samuel",
    role: "civil_registrar",
    facilityName: "Western Highlands Provincial Registry",
    facilityCode: "WHPR001",
    sevispassId: "SP-SROT-M4N5",
  },
  {
    name: "Catherine Ura",
    username: "catherine",
    role: "civil_registrar",
    facilityName: "East New Britain Provincial Registry",
    facilityCode: "ENBPR001",
    sevispassId: "SP-CURA-N6O7",
  },
  {
    name: "Marcus Gavi",
    username: "marcus",
    role: "civil_registrar",
    facilityName: "Madang Provincial Registry",
    facilityCode: "MAPR001",
    sevispassId: "SP-MGAV-O8P9",
  },

  // ========== REGISTRAR GENERAL & DEPUTY (Staff) ==========
  {
    name: "James Walo",
    username: "james",
    role: "registrar_general",
    facilityName: "Registrar General Office",
    facilityCode: "RGO001",
    sevispassId: "SP-JAMES-9432", 
  },
  {
    name: "Dr. Henry Lami",
    username: "henry",
    role: "registrar_general",
    facilityName: "Deputy Registrar General Office",
    facilityCode: "RGO002",
    sevispassId: "SP-HLAM-Q2R3",
  },
];

const demoBirthRecords = [
  {
    childFirstName: "Kapu",
    childLastName: "Kila",
    childDob: "2024-03-15",
    childSex: "Male",
    birthPlace: "Kila Village Clinic",
    province: "Eastern Highlands",
    district: "Goroka",
    attendant: "Dr. Alice Moni",
    adultName: "Grace Kila",
    adultRelation: "mother",
    adultUid: "SP-GKIL-A2B3",  // Verified SevisPass UID
    witness1: "John Kila (SP-JKIL-C4D5)",
    witness2: "Margaret Kila (SP-MKIL-E6F7)",
    registrationType: "standard",
    verifyMethod: "qr",
    dedupStatus: "clear",
    dedupFlag: false,
  },
  {
    childFirstName: "Peta",
    childLastName: "Wagi",
    childDob: "2024-02-22",
    childSex: "Female",
    birthPlace: "Port Moresby General Hospital",
    province: "National Capital District",
    district: "Port Moresby",
    attendant: "Dr. Peter Naime",
    adultName: "Sarah Wagi",
    adultRelation: "mother",
    adultUid: "SP-SWAG-D4E5",  // Verified SevisPass UID
    witness1: "Michael Wagi (SP-MWAG-F6G7)",
    witness2: "Ruth Wagi (SP-RWAG-G8H9)",
    registrationType: "standard",
    verifyMethod: "qr",
    dedupStatus: "warning",  // Potential duplicate flagged
    dedupFlag: true,
  },
  {
    childFirstName: "Tomas",
    childLastName: "Bena",
    childDob: "2024-01-10",
    childSex: "Male",
    birthPlace: "Lae General Hospital",
    province: "Morobe",
    district: "Lae",
    attendant: "Nurse Josephine Tuli",
    adultName: "Elizabeth Bena",
    adultRelation: "mother",
    adultUid: "SP-EBEN-F6G7",  // Verified SevisPass UID
    witness1: "David Bena (SP-DBEN-H8I9)",
    witness2: "Anna Laki (SP-ALAK-I0J1)",
    registrationType: "standard",
    verifyMethod: "qr",
    dedupStatus: "clear",
    dedupFlag: false,
  },
  {
    childFirstName: "Mina",
    childLastName: "Sione",
    childDob: "2024-04-05",
    childSex: "Female",
    birthPlace: "Kokopo Hospital",
    province: "East New Britain",
    district: "Kokopo",
    attendant: "Dr. James Kokopo",
    adultName: "Ruth Sione",
    adultRelation: "mother",
    adultUid: "SP-RSIO-H8I9",  // Verified SevisPass UID
    witness1: "Paul Sione (SP-PSIO-J0K1)",
    witness2: "Susan Manu (SP-SMAN-K2L3)",
    registrationType: "standard",
    verifyMethod: "qr",
    dedupStatus: "clear",
    dedupFlag: false,
  },
  {
    childFirstName: "Aiva",
    childLastName: "Raka",
    childDob: "2024-05-18",
    childSex: "Female",
    birthPlace: "Mount Hagen Hospital",
    province: "Western Highlands",
    district: "Mount Hagen",
    attendant: "Nurse Patricia Raka",
    adultName: "Anna Raka",
    adultRelation: "mother",
    adultUid: "SP-ARAK-J0K1",  // Verified SevisPass UID
    witness1: "Thomas Raka (SP-TRAK-L2M3)",
    witness2: "Grace Turi (SP-GTUR-M4N5)",
    registrationType: "standard",
    verifyMethod: "qr",
    dedupStatus: "match",  // Duplicate detected
    dedupFlag: true,
  },
  {
    childFirstName: "Kevin",
    childLastName: "Laku",
    childDob: "2024-03-28",
    childSex: "Male",
    birthPlace: "Madang Hospital",
    province: "Madang",
    district: "Madang",
    attendant: "Dr. Henry Laku",
    adultName: "Mary Laku",
    adultRelation: "mother",
    adultUid: "SP-MLAK-L2M3",  // Verified SevisPass UID
    witness1: "George Laku (SP-GLAK-N6O7)",
    witness2: "Victoria Kami (SP-VKAMI-O8P9)",
    registrationType: "late",
    verifyMethod: "qr",
    dedupStatus: "warning",
    dedupFlag: true,
  },
  {
    childFirstName: "Ioane",
    childLastName: "Tonga",
    childDob: "2024-06-12",
    childSex: "Male",
    birthPlace: "Nadi Hospital",
    province: "Western",
    district: "Ba",
    attendant: "Nurse Semesa Vore",
    adultName: "Losana Tonga",
    adultRelation: "mother",
    adultUid: "SP-LTOG-P0Q1",  // Verified SevisPass UID
    witness1: "Jone Tonga (SP-JTOG-Q2R3)",
    witness2: "Salote Cagi (SP-SCAG-R4S5)",
    registrationType: "standard",
    verifyMethod: "qr",
    dedupStatus: "clear",
    dedupFlag: false,
  },
  {
    childFirstName: "Amani",
    childLastName: "Moana",
    childDob: "2024-04-30",
    childSex: "Female",
    birthPlace: "Suva Tertiary Hospital",
    province: "Central",
    district: "Suva City",
    attendant: "Dr. Rajesh Kumar",
    adultName: "Melina Moana",
    adultRelation: "mother",
    adultUid: "SP-MMOA-S6T7",  // Verified SevisPass UID
    witness1: "Takeshi Moana (SP-TMOA-T8U9)",
    witness2: "Apisai Roto (SP-AROT-U0V1)",
    registrationType: "standard",
    verifyMethod: "qr",
    dedupStatus: "clear",
    dedupFlag: false,
  },
];

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("🌱 Seeding demo users...");

    for (const user of demoUsers) {
      const userId = randomUUID();
      const sevispassId = `SP-${user.username.toUpperCase()}-001`;

      const query = `
        INSERT INTO users (id, name, username, password_hash, role, tier, facility_name, facility_code, sevispass_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (username) DO UPDATE SET sevispass_id = $9
      `;

      await client.query(query, [
        userId,
        user.name,
        user.username,
        "demo",
        user.role,
        1,
        user.facilityName,
        user.facilityCode,
        user.sevispassId,  // Now includes verified IDs for staff
      ]);

      console.log(`✅ Created user: ${user.username} (${user.name})`);
    }

    console.log("\n🌱 Seeding demo birth records...");

    for (const record of demoBirthRecords) {
      const recordId = `SB-2024-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const now = new Date().toISOString();

      const insertRecordQuery = `
        INSERT INTO birth_records (
          id, child_first_name, child_last_name, child_dob, child_sex,
          birth_place, province, district, attendant, adult_name, adult_relation,
          adult_uid, witness_1, witness_2, registration_type, verify_method,
          dedup_status, dedup_flag, state, operator_name, operator_role, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `;

      await client.query(insertRecordQuery, [
        recordId,
        record.childFirstName,
        record.childLastName,
        record.childDob,
        record.childSex,
        record.birthPlace,
        record.province,
        record.district,
        record.attendant,
        record.adultName,
        record.adultRelation,
        record.adultUid,
        record.witness1,
        record.witness2,
        record.registrationType,
        record.verifyMethod,
        record.dedupStatus,
        record.dedupFlag,
        "submitted",
        "mary",
        "field_worker",
      ]);

      // Insert initial state history
      const stateHistoryQuery = `
        INSERT INTO state_history (record_id, from_state, to_state, actor_name, actor_role, reason, created_at)
        VALUES ($1, NULL, $2, $3, $4, $5, NOW())
      `;

      await client.query(stateHistoryQuery, [
        recordId,
        "submitted",
        "Mary Kila",
        "field_worker",
        "Initial registration submission",
      ]);

      console.log(
        `✅ Created record: ${recordId} - ${record.childFirstName} ${record.childLastName} | Parent: ${record.adultName} (${record.adultUid}) | Dedup: ${record.dedupStatus}${record.dedupFlag ? " ⚠️" : " ✓"} | Witnesses: ${record.witness1}, ${record.witness2}`
      );
    }

    console.log("\n✨ Seeding completed!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
