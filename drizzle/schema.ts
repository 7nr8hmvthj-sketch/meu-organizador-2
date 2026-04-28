import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, numeric, pgEnum } from "drizzle-orm/pg-core";

// Define enums first
const roleEnum = pgEnum("role", ["user", "admin"]);
const categoryEnum = pgEnum("category", ["fixed", "variable"]);
const themeEnum = pgEnum("theme", ["light", "dark"]);
const categoryTypeEnum = pgEnum("category_type", ["plantao", "treino", "pessoal", "saude", "outro"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").notNull().default("user"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Events/Shifts table - stores professional shifts and personal events
 * NOTE: Columns are lowercase in PostgreSQL due to how they were created
 */
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: integer("userid").notNull(),
  date: date("date").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  description: text("description"),
  startTime: varchar("starttime", { length: 5 }), // Formato HH:MM
  endTime: varchar("endtime", { length: 5 }), // Formato HH:MM
  color: varchar("color", { length: 50 }), // Classe Tailwind ou Hex
  isShift: boolean("isshift").default(true).notNull(),
  isPassed: boolean("ispassed").default(false).notNull(),
  passedReason: text("passedreason"),
  isCancelled: boolean("iscancelled").default(false).notNull(),
  createdBy: varchar("createdby", { length: 50 }),
  createdAt: timestamp("createdat", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedat", { withTimezone: true }).defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Expenses table - stores fixed and variable expenses
 */
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("userid").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  dueDay: integer("dueday").notNull(),
  category: categoryEnum("category").notNull().default("fixed"),
  isPaid: boolean("ispaid").default(false).notNull(),
  paidMonth: integer("paidmonth"),
  paidYear: integer("paidyear"),
  createdAt: timestamp("createdat", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedat", { withTimezone: true }).defaultNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * Medications table - stores medication checklist items
 */
export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  userId: integer("userid").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  time: varchar("time", { length: 50 }).notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("createdat", { withTimezone: true }).defaultNow().notNull(),
});

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = typeof medications.$inferInsert;

/**
 * Medication logs - tracks when medications were taken
 */
export const medicationLogs = pgTable("medication_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userid").notNull(),
  medicationId: integer("medicationid").notNull(),
  takenAt: timestamp("takenat", { withTimezone: true }).defaultNow().notNull(),
  takenDate: date("takendate").notNull(),
});

export type MedicationLog = typeof medicationLogs.$inferSelect;
export type InsertMedicationLog = typeof medicationLogs.$inferInsert;

/**
 * User preferences - stores theme and other settings
 */
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("userid").notNull().unique(),
  theme: themeEnum("theme").notNull().default("light"),
  updatedAt: timestamp("updatedat", { withTimezone: true }).defaultNow().notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

/**
 * Diary entries - stores personal journal entries
 */
export const diaryEntries = pgTable("diary_entries", {
  id: serial("id").primaryKey(),
  userId: integer("userid").notNull(),
  date: date("date").notNull(),
  title: varchar("title", { length: 255 }),
  content: text("content"),
  tags: varchar("tags", { length: 500 }),
  createdAt: timestamp("createdat", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedat", { withTimezone: true }).defaultNow().notNull(),
});

export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type InsertDiaryEntry = typeof diaryEntries.$inferInsert;

/**
 * Categories table - dynamic event categories with colors
 */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("outro"),
  icon: varchar("icon", { length: 50 }),
  isDefault: boolean("isdefault").default(false).notNull(),
  sortOrder: integer("sortorder").default(0).notNull(),
  createdAt: timestamp("createdat", { withTimezone: true }).defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Monthly adjustments - stores RH confirmed hours for conciliation
 */
export const monthlyAdjustments = pgTable("monthly_adjustments", {
  id: serial("id").primaryKey(),
  userId: integer("userid").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  rhHoursZN: numeric("rhhourszn", { precision: 10, scale: 2 }),
  rhHoursHC: numeric("rhhourshc", { precision: 10, scale: 2 }),
  updatedAt: timestamp("updatedat", { withTimezone: true }).defaultNow().notNull(),
});

export type MonthlyAdjustment = typeof monthlyAdjustments.$inferSelect;
export type InsertMonthlyAdjustment = typeof monthlyAdjustments.$inferInsert;
