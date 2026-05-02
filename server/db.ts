import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import { 
  User, InsertUser, users, 
  events, InsertEvent, Event,
  expenses, InsertExpense, Expense,
  medications, InsertMedication, Medication,
  medicationLogs, InsertMedicationLog, MedicationLog,
  userPreferences, InsertUserPreference, UserPreference,
  diaryEntries, InsertDiaryEntry, DiaryEntry,
  categories, InsertCategory, Category,
  monthlyAdjustments, InsertMonthlyAdjustment, MonthlyAdjustment,
  agendaManagers, InsertAgendaManager, AgendaManager,
  workplaces, InsertWorkplace, Workplace
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { sql } from "drizzle-orm";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  // Se já tem conexão, testa se ainda está viva
  if (_db && _client) {
    try {
      console.log('[Database] Testing existing connection...');
      await _client`SELECT 1`;
      console.log('[Database] Existing connection is healthy');
      return _db;
    } catch (e) {
      console.warn('[Database] Existing connection is dead, creating new one...');
      try { _client.end(); } catch (err) { /* ignore */ }
      _db = null;
      _client = null;
    }
  }

  // Se não tem URL, não pode conectar
  if (!ENV.databaseUrl) {
    console.error('[Database] DATABASE_URL not set in ENV');
    return null;
  }

  try {
    _client = postgres(ENV.databaseUrl, {
      ssl: { rejectUnauthorized: false },
      prepare: false,
      connect_timeout: 30,
      idle_timeout: 20
    });

    // Testa a conexão
    await _client`SELECT 1`;
    _db = drizzle(_client, { schema });
    return _db;
  } catch (error) {
    console.error('[Database] Connection failed:', error instanceof Error ? error.message : error);
    console.error('[Database] Full error:', error);
    try { _client?.end(); } catch (e) { /* ignore */ }
    _db = null;
    _client = null;
    return null;
  }
}

// ============ USER FUNCTIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      if (user[field] !== undefined) {
        values[field] = user[field];
        updateSet[field] = user[field];
      }
    };

    assignNullable("name");
    assignNullable("email");
    assignNullable("loginMethod");

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    const timestamp = new Date();
    updateSet.updatedAt = timestamp;

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
  } catch (error) {
    console.error("[Database] Upsert user failed:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(users)
      .where(sql`${users.openId} = ${openId}`)
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Get user by openId failed:", error);
    return null;
  }
}

export async function getUserById(id: number): Promise<InsertUser | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(users)
      .where(sql`${users.id} = ${id}`)
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Get user by id failed:", error);
    return null;
  }
}

// ============ EVENT FUNCTIONS ============

export async function getEventsByDate(userId: number, date: string): Promise<Event[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get events: database not available");
    return [];
  }

  try {
    console.log(`[Database] getEventsByDate: userId=${userId}, date=${date}`);
    const result = await db
      .select()
      .from(events)
      .where(sql`${events.userId} = ${userId} AND DATE(${events.date}) = ${date}`)
      .orderBy(sql`${events.date} DESC`);
    console.log(`[Database] getEventsByDate returned ${result.length} events`);
    return result;
  } catch (error) {
    console.error("[Database] Get events by date failed:", error);
    return [];
  }
}

export async function getEventsByDateRange(userId: number, startDate: string, endDate: string): Promise<Event[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get events: database not available");
    return [];
  }
  try {
    const result = await db
      .select()
      .from(events)
      .where(sql`${events.userId} = ${userId} AND DATE(${events.date}) >= ${startDate} AND DATE(${events.date}) <= ${endDate}`)
      .orderBy(sql`${events.date} ASC`);
    return result;
  } catch (error) {
    console.error("[Database] Get events by date range failed:", error);
    return [];
  }
}

export async function upsertEvent(event: InsertEvent): Promise<Event | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert event: database not available");
    return null;
  }

  try {
    const result = await db
      .insert(events)
      .values(event)
      .onConflictDoUpdate({
        target: events.id,
        set: {
          type: event.type,
          description: event.description,
          isShift: event.isShift,
          isPassed: event.isPassed,
          passedReason: event.passedReason,
          isCancelled: event.isCancelled,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Upsert event failed:", error);
    return null;
  }
}

export async function deleteEvent(id: number): Promise<Event[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete event: database not available");
    return [];
  }

  try {
    const deletedEvents = await db.delete(events).where(sql`${events.id} = ${id}`).returning();
    return deletedEvents as Event[];
  } catch (error) {
    console.error("[Database] Delete event failed:", error);
    return [];
  }
}

// Delete events in series based on type, startTime, and mode
export async function deleteEventSeries(
  userId: number,
  type: string,
  startTime: string | null,
  mode: 'future' | 'all',
  referenceDate: string
): Promise<Event[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete event series: database not available");
    return [];
  }

  try {
    let whereCondition = sql`${events.userId} = ${userId} AND ${events.type} = ${type}`;
    
    // Match startTime (null or specific time)
    if (startTime) {
      whereCondition = sql`${whereCondition} AND ${events.startTime} = ${startTime}`;
    } else {
      whereCondition = sql`${whereCondition} AND ${events.startTime} IS NULL`;
    }
    
    // Apply date filter based on mode
    if (mode === 'future') {
      whereCondition = sql`${whereCondition} AND DATE(${events.date}) >= DATE(${referenceDate})`;
    }
    // If mode === 'all', no date filter is applied
    
    const deletedEvents = await db.delete(events).where(whereCondition).returning();
    return deletedEvents as Event[];
  } catch (error) {
    console.error("[Database] Delete event series failed:", error);
    return [];
  }
}

// ============ MEDICATION FUNCTIONS ============

export async function getMedicationsByUserId(userId: number): Promise<Medication[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get medications: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(medications)
      .where(sql`${medications.userId} = ${userId}`)
      .orderBy(sql`${medications.createdAt} ASC`);
    return result;
  } catch (error) {
    console.error("[Database] Get medications failed:", error);
    return [];
  }
}

export async function getMedicationLogsByDate(userId: number, date: string): Promise<MedicationLog[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get medication logs: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(medicationLogs)
      .where(sql`${medicationLogs.userId} = ${userId} AND DATE(${medicationLogs.takenDate}) = ${date}`)
      .orderBy(sql`${medicationLogs.takenAt} DESC`);
    return result;
  } catch (error) {
    console.error("[Database] Get medication logs by date failed:", error);
    return [];
  }
}

export async function insertMedicationLog(log: InsertMedicationLog): Promise<MedicationLog | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot insert medication log: database not available");
    return null;
  }

  try {
    const result = await db
      .insert(medicationLogs)
      .values(log)
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Insert medication log failed:", error);
    return null;
  }
}

export async function deleteMedicationLog(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete medication log: database not available");
    return false;
  }

  try {
    await db.delete(medicationLogs).where(sql`${medicationLogs.id} = ${id}`);
    return true;
  } catch (error) {
    console.error("[Database] Delete medication log failed:", error);
    return false;
  }
}

// ============ DIARY FUNCTIONS ============

export async function getDiaryEntry(userId: number, dateStr: string): Promise<DiaryEntry | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get diary entry: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(diaryEntries)
      .where(sql`${diaryEntries.userId} = ${userId} AND DATE(${diaryEntries.date}) = ${dateStr}`)
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Get diary entry failed:", error);
    return null;
  }
}

export async function upsertDiaryEntry(entry: InsertDiaryEntry): Promise<DiaryEntry | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert diary entry: database not available");
    return null;
  }

  try {
    // First, try to find existing entry for this date
    const existing = await getDiaryEntry(entry.userId, entry.date as unknown as string);
    
    if (existing) {
      // Update existing entry
      const result = await db
        .update(diaryEntries)
        .set({
          title: entry.title,
          content: entry.content,
          tags: entry.tags,
          updatedAt: new Date(),
        })
        .where(sql`${diaryEntries.id} = ${existing.id}`)
        .returning();
      return result[0] || null;
    } else {
      // Insert new entry
      const result = await db
        .insert(diaryEntries)
        .values(entry)
        .returning();
      return result[0] || null;
    }
  } catch (error) {
    console.error("[Database] Upsert diary entry failed:", error);
    return null;
  }
}

export async function getDiaryEntries(userId: number, startDate: string, endDate: string): Promise<DiaryEntry[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get diary entries: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(diaryEntries)
      .where(sql`${diaryEntries.userId} = ${userId} AND DATE(${diaryEntries.date}) >= ${startDate} AND DATE(${diaryEntries.date}) <= ${endDate}`)
      .orderBy(sql`${diaryEntries.date} DESC`);
    return result;
  } catch (error) {
    console.error("[Database] Get diary entries failed:", error);
    return [];
  }
}

// ============ EXPENSE FUNCTIONS ============

export async function getExpensesByUserId(userId: number): Promise<Expense[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get expenses: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(expenses)
      .where(sql`${expenses.userId} = ${userId}`)
      .orderBy(sql`${expenses.dueDay} ASC`);
    return result;
  } catch (error) {
    console.error("[Database] Get expenses failed:", error);
    return [];
  }
}

export async function createExpense(expense: InsertExpense): Promise<Expense | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create expense: database not available");
    return null;
  }

  try {
    const result = await db
      .insert(expenses)
      .values(expense)
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Create expense failed:", error);
    return null;
  }
}

export async function updateExpense(id: number, userId: number, data: Partial<InsertExpense>): Promise<Expense | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update expense: database not available");
    return null;
  }

  try {
    const result = await db
      .update(expenses)
      .set({ ...data, updatedAt: new Date() })
      .where(sql`${expenses.id} = ${id} AND ${expenses.userId} = ${userId}`)
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Update expense failed:", error);
    return null;
  }
}

export async function deleteExpense(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete expense: database not available");
    return false;
  }

  try {
    await db.delete(expenses).where(sql`${expenses.id} = ${id} AND ${expenses.userId} = ${userId}`);
    return true;
  } catch (error) {
    console.error("[Database] Delete expense failed:", error);
    return false;
  }
}

export async function resetExpensesPaidStatus(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot reset expenses: database not available");
    return;
  }

  try {
    await db
      .update(expenses)
      .set({ isPaid: false, paidMonth: null, paidYear: null })
      .where(sql`${expenses.userId} = ${userId}`);
  } catch (error) {
    console.error("[Database] Reset expenses failed:", error);
  }
}

// ============ EVENT FUNCTIONS (CREATE/UPDATE) ============

export async function createEvent(eventData: InsertEvent): Promise<Event | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(events).values(eventData).returning();
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Create event failed:", error);
    throw error;
  }
}

export async function updateEvent(id: number, userId: number, data: Partial<InsertEvent>): Promise<Event | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db
      .update(events)
      .set({ ...data, updatedAt: new Date() })
      .where(sql`${events.id} = ${id} AND ${events.userId} = ${userId}`)
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Update event failed:", error);
    throw error;
  }
}

export async function getEventById(id: number): Promise<Event | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db
      .select()
      .from(events)
      .where(sql`${events.id} = ${id}`)
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Get event by id failed:", error);
    return null;
  }
}

// ============ CATEGORY FUNCTIONS ============

export async function getCategories(userId?: number): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    // Return global categories (userid IS NULL) + user-specific categories
    if (userId) {
      const result = await db
        .select()
        .from(categories)
        .where(sql`${categories.userId} IS NULL OR ${categories.userId} = ${userId}`)
        .orderBy(sql`${categories.sortOrder} ASC`);
      return result;
    }
    const result = await db
      .select()
      .from(categories)
      .where(sql`${categories.userId} IS NULL`)
      .orderBy(sql`${categories.sortOrder} ASC`);
    return result;
  } catch (error) {
    console.error("[Database] Get categories failed:", error);
    return [];
  }
}

export async function createCategory(data: InsertCategory): Promise<Category | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(categories).values(data).returning();
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Create category failed:", error);
    throw error;
  }
}

export async function updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db
      .update(categories)
      .set(data)
      .where(sql`${categories.id} = ${id}`)
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Update category failed:", error);
    throw error;
  }
}

export async function deleteCategory(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(categories).where(sql`${categories.id} = ${id}`);
    return true;
  } catch (error) {
    console.error("[Database] Delete category failed:", error);
    return false;
  }
}

export async function createManyEvents(eventsData: InsertEvent[]): Promise<Event[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.insert(events).values(eventsData).returning();
  } catch (error) {
    console.error("[Database] Create many events failed:", error);
    throw error;
  }
}


// ============ DIARY FUNCTIONS (ADDITIONAL) ============

export async function getDiaryEntriesByUserId(userId: number): Promise<DiaryEntry[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get diary entries: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(diaryEntries)
      .where(sql`${diaryEntries.userId} = ${userId}`)
      .orderBy(sql`${diaryEntries.date} DESC`);
    return result;
  } catch (error) {
    console.error("[Database] Get diary entries by userId failed:", error);
    return [];
  }
}

export async function searchDiaryEntries(userId: number, query: string): Promise<DiaryEntry[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot search diary entries: database not available");
    return [];
  }

  try {
    const searchPattern = `%${query}%`;
    const result = await db
      .select()
      .from(diaryEntries)
      .where(sql`${diaryEntries.userId} = ${userId} AND (${diaryEntries.title} ILIKE ${searchPattern} OR ${diaryEntries.content} ILIKE ${searchPattern} OR ${diaryEntries.tags} ILIKE ${searchPattern})`)
      .orderBy(sql`${diaryEntries.date} DESC`);
    return result;
  } catch (error) {
    console.error("[Database] Search diary entries failed:", error);
    return [];
  }
}

// ============ USER PREFERENCES FUNCTIONS ============

export async function getUserPreferences(userId: number): Promise<UserPreference | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user preferences: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(userPreferences)
      .where(sql`${userPreferences.userId} = ${userId}`)
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Get user preferences failed:", error);
    return null;
  }
}

export async function upsertUserPreferences(prefs: InsertUserPreference): Promise<UserPreference | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user preferences: database not available");
    return null;
  }

  try {
    const existing = await getUserPreferences(prefs.userId);
    if (existing) {
      const result = await db
        .update(userPreferences)
        .set({ theme: prefs.theme, updatedAt: new Date() })
        .where(sql`${userPreferences.userId} = ${prefs.userId}`)
        .returning();
      return result[0] || null;
    } else {
      const result = await db
        .insert(userPreferences)
        .values(prefs)
        .returning();
      return result[0] || null;
    }
  } catch (error) {
    console.error("[Database] Upsert user preferences failed:", error);
    return null;
  }
}


// ============ MEDICATION FUNCTIONS (ADDITIONAL) ============

export async function createMedication(data: InsertMedication): Promise<Medication | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(medications).values(data).returning();
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Create medication failed:", error);
    throw error;
  }
}

export async function updateMedication(id: number, userId: number, data: Partial<InsertMedication>): Promise<Medication | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db
      .update(medications)
      .set(data)
      .where(sql`${medications.id} = ${id} AND ${medications.userId} = ${userId}`)
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Update medication failed:", error);
    throw error;
  }
}

export async function deleteMedication(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(medications).where(sql`${medications.id} = ${id} AND ${medications.userId} = ${userId}`);
    return true;
  } catch (error) {
    console.error("[Database] Delete medication failed:", error);
    return false;
  }
}

// ===== Monthly Adjustments (RH Conciliation) =====

export async function getMonthlyAdjustment(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select()
      .from(monthlyAdjustments)
      .where(sql`${monthlyAdjustments.userId} = ${userId} AND ${monthlyAdjustments.month} = ${month} AND ${monthlyAdjustments.year} = ${year}`)
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error fetching monthly adjustment:", error);
    return null;
  }
}

export async function upsertMonthlyAdjustment(userId: number, month: number, year: number, rhHoursZN: number | null, rhHoursHC: number | null) {
  const db = await getDb();
  if (!db) return null;
  try {
    // Try to find existing record
    const existing = await db.select()
      .from(monthlyAdjustments)
      .where(sql`${monthlyAdjustments.userId} = ${userId} AND ${monthlyAdjustments.month} = ${month} AND ${monthlyAdjustments.year} = ${year}`)
      .limit(1);
    
    if (existing.length > 0) {
      // Update
      const updated = await db.update(monthlyAdjustments)
        .set({
          rhHoursZN: rhHoursZN !== null ? String(rhHoursZN) : null,
          rhHoursHC: rhHoursHC !== null ? String(rhHoursHC) : null,
          updatedAt: new Date(),
        })
        .where(sql`${monthlyAdjustments.id} = ${existing[0].id}`)
        .returning();
      return updated[0];
    } else {
      // Insert
      const inserted = await db.insert(monthlyAdjustments)
        .values({
          userId,
          month,
          year,
          rhHoursZN: rhHoursZN !== null ? String(rhHoursZN) : null,
          rhHoursHC: rhHoursHC !== null ? String(rhHoursHC) : null,
        })
        .returning();
      return inserted[0];
    }
  } catch (error) {
    console.error("[Database] Error upserting monthly adjustment:", error);
    return null;
  }
}

// ==================== APP USERS (Auth via DB) ====================

export async function getAppUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.execute(
      sql`SELECT id, username, password_hash, role, user_id FROM app_users WHERE username = ${username} LIMIT 1`
    );
    const rows = (result as any).rows || (result as any);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("[Database] Error fetching app user:", error);
    return null;
  }
}

export async function getNextAppUserId(): Promise<number> {
  const db = await getDb();
  if (!db) return Date.now();
  try {
    const result = await db.execute(
      sql`SELECT COALESCE(MAX(user_id), 0) + 1 as next_id FROM app_users`
    );
    const rows = (result as any).rows || (result as any);
    return rows[0]?.next_id || Date.now();
  } catch (error) {
    console.error("[Database] Error getting next user ID:", error);
    return Date.now();
  }
}

export async function createAppUser(data: {
  username: string;
  passwordHash: string;
  role: string;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.execute(
      sql`INSERT INTO app_users (username, password_hash, role, user_id) 
          VALUES (${data.username}, ${data.passwordHash}, ${data.role}, ${data.userId})`
    );
    return true;
  } catch (error) {
    console.error("[Database] Error creating app user:", error);
    throw error;
  }
}

export async function updateAppUserPassword(username: string, newPasswordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.execute(
      sql`UPDATE app_users SET password_hash = ${newPasswordHash}, updated_at = NOW() WHERE username = ${username}`
    );
    return true;
  } catch (error) {
    console.error("[Database] Error updating password:", error);
    throw error;
  }
}

export async function createUserRecord(params: {
  id: number;
  openId: string;
  name: string;
  email: string;
  loginMethod: string;
  role: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.execute(
      sql`INSERT INTO users (id, openid, name, email, loginmethod, role, createdat, updatedat, lastsignedin)
          VALUES (${params.id}, ${params.openId}, ${params.name}, ${params.email}, ${params.loginMethod}, ${params.role}, NOW(), NOW(), NOW())`
    );
    return true;
  } catch (error: any) {
    // Ignore duplicate key errors (user already exists)
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      console.log(`[Database] User ${params.name} already exists in users table, skipping`);
      return true;
    }
    console.error("[Database] Error creating user record:", error);
    throw error;
  }
}


// ============ AGENDA MANAGER FUNCTIONS ============

export async function getManagedUserIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db
      .select({ ownerId: agendaManagers.ownerId })
      .from(agendaManagers)
      .where(sql`${agendaManagers.userId} = ${userId}`);
    return result.map(r => r.ownerId);
  } catch (error) {
    console.error("[Database] Get managed user IDs failed:", error);
    return [];
  }
}

// ─── Workplaces CRUD ─────────────────────────────────────────────────────────

export async function getWorkplaces(userId: number): Promise<Workplace[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db
      .select()
      .from(workplaces)
      .where(sql`${workplaces.userId} = ${userId}`)
      .orderBy(workplaces.createdAt);
    return result;
  } catch (error) {
    console.error("[Database] Get workplaces failed:", error);
    return [];
  }
}

export async function createWorkplace(data: InsertWorkplace): Promise<Workplace | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(workplaces).values(data).returning();
    return result[0] ?? null;
  } catch (error) {
    console.error("[Database] Create workplace failed:", error);
    return null;
  }
}

export async function updateWorkplace(
  id: number,
  userId: number,
  data: Partial<Omit<InsertWorkplace, "id" | "userId" | "createdAt">>
): Promise<Workplace | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db
      .update(workplaces)
      .set(data)
      .where(sql`${workplaces.id} = ${id} AND ${workplaces.userId} = ${userId}`)
      .returning();
    return result[0] ?? null;
  } catch (error) {
    console.error("[Database] Update workplace failed:", error);
    return null;
  }
}

export async function deleteWorkplace(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    const result = await db
      .delete(workplaces)
      .where(sql`${workplaces.id} = ${id} AND ${workplaces.userId} = ${userId}`)
      .returning();
    return result.length > 0;
  } catch (error) {
    console.error("[Database] Delete workplace failed:", error);
    return false;
  }
}
