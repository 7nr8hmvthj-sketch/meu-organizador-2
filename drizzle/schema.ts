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
  openId: varchar("openid", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginmethod", { length: 64 }),
  role: roleEnum("role").notNull().default("user"),
  createdAt: timestamp("createdat", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedat", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastsignedin", { withTimezone: true }).defaultNow().notNull(),
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
  workplaceId: integer("workplaceid"), // <--- NOVO CAMPO: Vínculo explícito com o Local de Trabalho
  date: date("date").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  description: text("description"),
  startTime: varchar("starttime", { length: 5 }), // Formato HH:MM
  endTime: varchar("endtime", { length: 5 }), // Formato HH:MM
  color: varchar("color", { length: 50 }), // Classe Tailwind ou Hex
  isShift: boolean("isshift").default(true).notNull(),
  isPassed: boolean("ispassed").default(false).notNull(),
  passedReason: text("passedreason"),
  value: numeric("value", { precision: 10, scale: 2 }),
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
  userId: integer("userid"),  // null = global, number = user-specific custom category
  createdAt: timestamp("createdat", { withTimezone: true }).defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Monthly adjustments - stores RH confirmed hours for conciliation
 * Supports both legacy (rhHoursZN/HC) and new per-workplace adjustments
 */
export const monthlyAdjustments = pgTable("monthly_adjustments", {
  id: serial("id").primaryKey(),
  userId: integer("userid").notNull(),
  workplaceId: integer("workplaceid"),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  overrideHours: numeric("overridehours", { precision: 10, scale: 2 }),
  reason: text("reason"),
  rhHoursZN: numeric("rhhourszn", { precision: 10, scale: 2 }),
  rhHoursHC: numeric("rhhourshc", { precision: 10, scale: 2 }),
  updatedAt: timestamp("updatedat", { withTimezone: true }).defaultNow().notNull(),
});

export type MonthlyAdjustment = typeof monthlyAdjustments.$inferSelect;
export type InsertMonthlyAdjustment = typeof monthlyAdjustments.$inferInsert;

/**
 * Agenda Managers - allows users to manage other users' agendas
 * Example: Paula (user_id) manages CPDEFENDI's agenda (owner_id)
 */
export const agendaManagers = pgTable("agenda_managers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdat", { withTimezone: true }).defaultNow().notNull(),
});

export type AgendaManager = typeof agendaManagers.$inferSelect;
export type InsertAgendaManager = typeof agendaManagers.$inferInsert;

/**
 * Workplaces - dynamic billing engine
 * Replaces hardcoded ZN/HC constants with configurable work locations
 * Each workplace has its own hourly rate, billing cycle, and keyword matchers
 */
export const workplaces = pgTable("workplaces", {
  id: serial("id").primaryKey(),
  userId: integer("userid").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  hourlyRate: numeric("hourlyrate", { precision: 10, scale: 2 }).notNull(),
  cycleStartDay: integer("cyclestartday").notNull().default(1),
  cycleEndDay: integer("cycleendday").notNull().default(31),
  paymentDelayMonths: integer("paymentdelaymonths").notNull().default(0),
  paymentDay: integer("paymentday").notNull().default(5),
  keywords: text("keywords").notNull(),
  createdAt: timestamp("createdat", { withTimezone: true }).defaultNow().notNull(),
});
export type Workplace = typeof workplaces.$inferSelect;
export type InsertWorkplace = typeof workplaces.$inferInsert;


// --- PLANTÕES SEM VÍNCULO (AVULSOS) ---
/**
 * Unlinked Rates - plantões avulsos sem vínculo com workplace
 * Usados para eventos que não pertencem a nenhum local de trabalho específico
 */
export const unlinkedRates = pgTable("unlinked_rates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default('automatico'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UnlinkedRate = typeof unlinkedRates.$inferSelect;
export type InsertUnlinkedRate = typeof unlinkedRates.$inferInsert;


// --- FINANÇAS PJ/PF ---
/**
 * Finance Items - despesas e obrigações financeiras PJ e PF
 * Persistência das abas Empresa (PJ) e Pessoal (PF) do painel financeiro
 */
export const financeItems = pgTable("finance_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tab: varchar("tab", { length: 10 }).notNull(), // 'PJ' ou 'PF'
  category: varchar("category", { length: 100 }).notNull(), // ex: 'Impostos', 'Moradia', 'Cartoes'
  title: varchar("title", { length: 200 }).notNull(), // ex: 'DAS', 'Luz', 'Itaú Personnalité'
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  isPaid: boolean("is_paid").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type FinanceItem = typeof financeItems.$inferSelect;
export type InsertFinanceItem = typeof financeItems.$inferInsert;
