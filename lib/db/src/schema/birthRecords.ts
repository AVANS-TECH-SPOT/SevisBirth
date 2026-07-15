import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const birthRecordsTable = pgTable("birth_records", {
  id: text("id").primaryKey(),
  state: text("state").notNull().default("submitted"),
  registrationType: text("registration_type").notNull().default("standard"),
  childFirstName: text("child_first_name").notNull(),
  childLastName: text("child_last_name").notNull(),
  childDob: text("child_dob").notNull(),
  childSex: text("child_sex").notNull(),
  birthPlace: text("birth_place").notNull(),
  province: text("province").notNull(),
  district: text("district").notNull(),
  attendant: text("attendant").notNull(),
  adultName: text("adult_name"),
  adultRelation: text("adult_relation"),
  adultUid: text("adult_uid"),
  verifyMethod: text("verify_method").notNull().default("qr"),
  witness1: text("witness_1"),
  witness2: text("witness_2"),
  dedupFlag: boolean("dedup_flag").notNull().default(false),
  dedupStatus: text("dedup_status"),
  notes: text("notes"),
  operatorName: text("operator_name").notNull(),
  operatorRole: text("operator_role").notNull(),
  facilityCode: text("facility_code").notNull().default(""),
  gpsLat: doublePrecision("gps_lat"),
  gpsLng: doublePrecision("gps_lng"),
  certificateId: text("certificate_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const stateHistoryTable = pgTable("state_history", {
  id: serial("id").primaryKey(),
  recordId: text("record_id")
    .notNull()
    .references(() => birthRecordsTable.id, { onDelete: "cascade" }),
  fromState: text("from_state"),
  toState: text("to_state").notNull(),
  actorName: text("actor_name").notNull(),
  actorRole: text("actor_role").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBirthRecordSchema = createInsertSchema(birthRecordsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertBirthRecord = z.infer<typeof insertBirthRecordSchema>;
export type BirthRecord = typeof birthRecordsTable.$inferSelect;
export type StateHistory = typeof stateHistoryTable.$inferSelect;
