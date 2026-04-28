import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { comparisonRouter } from "./routers/comparison";

// --- MIDDLEWARES ---

const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const cookies = ctx.req.headers.cookie || "";
  const authCookie = cookies.split(';').find(c => c.trim().startsWith('simple_auth='));
  
  if (!authCookie) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Login necessário." });
  }

  let user;
  try {
    const cookieValue = decodeURIComponent(authCookie.split('=')[1]);
    user = JSON.parse(cookieValue);
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sessão inválida." });
  }

  return next({ ctx: { ...ctx, user: user as { username: string; role: string; userId: number } } });
});

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores." });
  }
  return next();
});

// Simple auth credentials
const VALID_CREDENTIALS = {
  "USER": { password: "Wert123.", role: "admin", userId: 1 },
  "JESSICA": { password: "123", role: "trainer", userId: 150023 },
  "ISA": { password: "123", role: "trainer", userId: 150024 },
  "VEGANO": { password: "123", role: "admin", userId: 2 },
};

// Normaliza eventos do PostgreSQL (lowercase) para camelCase
const normalizeEvent = (event: any) => ({
  ...event,
  userId: event.userid ?? event.userId,
  isShift: event.isshift ?? event.isShift,
  isPassed: event.ispassed ?? event.isPassed,
  passedReason: event.passedreason ?? event.passedReason,
  isCancelled: event.iscancelled ?? event.isCancelled,
  createdBy: event.createdby ?? event.createdBy,
  createdAt: event.createdat ?? event.createdAt,
  updatedAt: event.updatedat ?? event.updatedAt,
});

const normalizeEvents = (events: any[]) => events.map(normalizeEvent);

// Normaliza categorias do PostgreSQL (lowercase) para camelCase
const normalizeCategory = (cat: any) => ({
  ...cat,
  isDefault: cat.isdefault ?? cat.isDefault,
  sortOrder: cat.sortorder ?? cat.sortOrder,
  createdAt: cat.createdat ?? cat.createdAt,
});

const normalizeCategories = (cats: any[]) => cats.map(normalizeCategory);

// Força meio-dia UTC para evitar bug de dia anterior por timezone
const parseDateSafe = (dateString: string) => {
  if (dateString.length === 10) return new Date(`${dateString}T12:00:00Z`);
  return new Date(dateString);
};

export const appRouter = router({
  system: systemRouter,
  comparison: comparisonRouter,
  
  
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      const cookies = ctx.req.headers.cookie || "";
      const authCookie = cookies.split(';').find(c => c.trim().startsWith('simple_auth='));
      if (!authCookie) return null;
      try { return JSON.parse(decodeURIComponent(authCookie.split('=')[1])); } catch { return null; }
    }),
    
    simpleLogin: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = VALID_CREDENTIALS[input.username.toUpperCase() as keyof typeof VALID_CREDENTIALS];
        if (user && input.password === user.password) {
          const cookieOptions = getSessionCookieOptions(ctx.req);
          const userInfo = JSON.stringify({ username: input.username.toUpperCase(), role: user.role, userId: user.userId });
          ctx.res.cookie("simple_auth", userInfo, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
          return { success: true, role: user.role, username: input.username.toUpperCase() };
        }
        return { success: false, error: "Credenciais inválidas" };
      }),
    
    checkSimpleAuth: publicProcedure.query(({ ctx }) => {
      const cookies = ctx.req.headers.cookie || "";
      const authCookie = cookies.split(';').find(c => c.trim().startsWith('simple_auth='));
      if (!authCookie) return { isAuthenticated: false, user: null };
      try {
        const userInfo = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
        return { isAuthenticated: true, user: userInfo };
      } catch { return { isAuthenticated: false, user: null }; }
    }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("simple_auth", { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
  }),

  // Events/Shifts router
  events: router({
    // Trainers veem agenda do Admin (ID 1)
    list: publicProcedure.query(async () => {
      const events = await db.getEventsByDateRange(1, '2026-01-01', '2026-12-31');
      return normalizeEvents(events);
    }),
    
    listByDateRange: publicProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input }) => {
        const events = await db.getEventsByDateRange(1, input.startDate, input.endDate);
        return normalizeEvents(events);
      }),
    
    create: protectedProcedure
      .input(z.object({ date: z.string(), type: z.string(), description: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional(), color: z.string().optional(), isShift: z.boolean().default(true) }))
      .mutation(async ({ input, ctx }) => {
        const event = await db.createEvent({
          userId: 1, // Trainers agendam para o Admin
          date: input.date.substring(0, 10),
          type: input.type,
          description: input.description || null,
          startTime: input.startTime || null,
          endTime: input.endTime || null,
          color: input.color || null,
          isShift: input.isShift,
          createdBy: ctx.user.username, // Salva quem criou o evento
        });
        return event ? normalizeEvent(event) : null;
      }),
    
    createMany: protectedProcedure
      .input(z.array(z.object({ 
        date: z.string(), 
        type: z.string(), 
        description: z.string().optional(), 
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        color: z.string().optional(),
        isShift: z.boolean().default(true) 
      })))
      .mutation(async ({ input, ctx }) => {
        const eventsToCreate = input.map(ev => ({
          userId: 1,
          date: ev.date.substring(0, 10),
          type: ev.type,
          description: ev.description || null,
          startTime: ev.startTime || null,
          endTime: ev.endTime || null,
          color: ev.color || null,
          isShift: ev.isShift,
          createdBy: ctx.user.username,
        }));
        const results = await db.createManyEvents(eventsToCreate);
        return results.map(normalizeEvent);
      }),
    
    update: protectedProcedure
      .input(z.object({ id: z.number(), date: z.string().optional(), type: z.string().optional(), description: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional(), color: z.string().optional(), isPassed: z.boolean().optional(), passedReason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        // Verifica se o usuário pode editar (admin ou criador do evento)
        const event = await db.getEventById(input.id);
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
        
        // Treinadoras só podem editar eventos que elas criaram (Musculação/Pilates)
        if (ctx.user.role === "trainer") {
          if (event.createdBy !== ctx.user.username) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode editar treinos que você criou." });
          }
        }
        
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};
        if (data.date) updateData.date = data.date.substring(0, 10);
        if (data.type) updateData.type = data.type;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.startTime !== undefined) updateData.startTime = data.startTime || null;
        if (data.endTime !== undefined) updateData.endTime = data.endTime || null;
        if (data.color !== undefined) updateData.color = data.color || null;
        if (data.isPassed !== undefined) updateData.isPassed = data.isPassed;
        if (data.passedReason !== undefined) updateData.passedReason = data.passedReason;
        return await db.updateEvent(id, 1, updateData);
      }),
    
    passShift: adminProcedure
      .input(z.object({ id: z.number(), reason: z.string() }))
      .mutation(async ({ input }) => {
        const event = await db.updateEvent(input.id, 1, { isPassed: true, passedReason: input.reason });
        return event ? normalizeEvent(event) : null;
      }),
    
    undoPass: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const event = await db.updateEvent(input.id, 1, { isPassed: false, passedReason: null });
        return event ? normalizeEvent(event) : null;
      }),
    
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const event = await db.updateEvent(input.id, 1, { isCancelled: true });
        return event ? normalizeEvent(event) : null;
      }),
    
    undoCancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const event = await db.updateEvent(input.id, 1, { isCancelled: false });
        return event ? normalizeEvent(event) : null;
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verifica se o usuário pode excluir (admin ou criador do evento)
        const event = await db.getEventById(input.id);
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
        
        // Treinadoras só podem excluir eventos que elas criaram (Musculação/Pilates)
        if (ctx.user.role === "trainer") {
          if (event.createdBy !== ctx.user.username) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode excluir treinos que você criou." });
          }
        }
        
        return await db.deleteEvent(input.id);
      }),
  }),

  // Expenses router - Admin only
  expenses: router({
    list: adminProcedure.query(async ({ ctx }) => await db.getExpensesByUserId(ctx.user.userId)),
    
    create: adminProcedure
      .input(z.object({ name: z.string(), amount: z.string(), dueDay: z.number(), category: z.enum(["fixed", "variable"]) }))
      .mutation(async ({ input, ctx }) => await db.createExpense({ userId: ctx.user.userId, name: input.name, amount: input.amount, dueDay: input.dueDay, category: input.category })),
    
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), amount: z.string().optional(), dueDay: z.number().optional(), category: z.enum(["fixed", "variable"]).optional() }))
      .mutation(async ({ input, ctx }) => { const { id, ...data } = input; return await db.updateExpense(id, ctx.user.userId, data); }),
    
    togglePaid: adminProcedure
      .input(z.object({ id: z.number(), isPaid: z.boolean(), month: z.number().optional(), year: z.number().optional() }))
      .mutation(async ({ input, ctx }) => await db.updateExpense(input.id, ctx.user.userId, { isPaid: input.isPaid, paidMonth: input.isPaid ? input.month : null, paidYear: input.isPaid ? input.year : null })),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => await db.deleteExpense(input.id, ctx.user.userId)),
    
    resetPaidStatus: adminProcedure.mutation(async ({ ctx }) => { await db.resetExpensesPaidStatus(ctx.user.userId); return { success: true }; }),

    // Resumo financeiro mensal com regras reais de faturamento
    monthlySummary: adminProcedure
      .input(z.object({ month: z.number().min(1).max(12), year: z.number() }))
      .query(async ({ ctx, input }) => {
        const VALOR_HORA_ZN = 136; // R$/h para ZN, Noturno, Apoio, Corredor
        const VALOR_HORA_HC = 108; // R$/h para HC
        const HC_DELAY_MONTHS = 3;  // HC paga com 90 dias de atraso

        // === DESPESAS ===
        const allExpenses = await db.getExpensesByUserId(ctx.user.userId);
        const fixedExpenses = allExpenses.filter(e => e.category === "fixed");
        const variableExpenses = allExpenses.filter(e => e.category === "variable");
        const totalFixed = fixedExpenses.reduce((sum, e) => sum + parseFloat(String(e.amount || "0")), 0);
        const totalVariable = variableExpenses.reduce((sum, e) => sum + parseFloat(String(e.amount || "0")), 0);

        // === EVENTOS (todos do usuário) ===
        const allEvents = await db.getEventsByDateRange(ctx.user.userId, '2025-01-01', '2027-12-31');

        // Helper: calcula horas de um evento baseado no tipo
        const calcHours = (event: any): number => {
          if (event.isPassed) return 0;
          const type = (event.type || "").toLowerCase();
          const desc = (event.description || "").toLowerCase();
          const fullText = `${type} ${desc}`;
          const SHIFT_HOURS: Record<string, string> = {
            "hc manhã": "7-13", "hc tarde": "13-19",
            "corredor tarde": "13-19", "corredor manhã": "7-13",
            "zona norte manhã": "7-13", "zona norte tarde": "13-19",
            "noturno": "19-7", "apoio": "19-01",
          };
          let timeMatch = fullText.match(/(\d{1,2})-(\d{1,2})/);
          if (!timeMatch && SHIFT_HOURS[type]) {
            timeMatch = SHIFT_HOURS[type].match(/(\d{1,2})-(\d{1,2})/);
          }
          if (!timeMatch) return 0;
          const startH = parseInt(timeMatch[1], 10);
          const endH = parseInt(timeMatch[2], 10);
          let diff = endH - startH;
          if (diff < 0) diff += 24;
          return diff;
        };

        // Helper: classifica evento como ZN-group ou HC
        const isZNGroup = (event: any): boolean => {
          const t = (event.type || "").toLowerCase();
          const d = (event.description || "").toLowerCase();
          const full = `${t} ${d}`;
          return full.includes("zn") || full.includes("zona norte") || full.includes("noturno") 
            || full.includes("apoio") || full.includes("corredor") || full.includes("observação") || full.includes("observacao");
        };
        const isHC = (event: any): boolean => {
          const t = (event.type || "").toLowerCase();
          return t.includes("hc") || t.includes("home care");
        };

        // === ZN: Ciclo 20/(mês-1) até 19/mês ===
        let znStartMonth = input.month - 1;
        let znStartYear = input.year;
        if (znStartMonth < 1) { znStartMonth = 12; znStartYear--; }
        const znStartDate = `${znStartYear}-${String(znStartMonth).padStart(2, '0')}-20`;
        const znEndDate = `${input.year}-${String(input.month).padStart(2, '0')}-19`;

        let znHours = 0;
        let znBreakdown = { zn: 0, noturno: 0, apoio: 0, observacao: 0 };
        allEvents.forEach(event => {
          const eventDate = event.date;
          if (eventDate < znStartDate || eventDate > znEndDate) return;
          if (!isZNGroup(event)) return;
          const hours = calcHours(event);
          znHours += hours;
          const t = (event.type || "").toLowerCase();
          const d = (event.description || "").toLowerCase();
          const full = `${t} ${d}`;
          if (full.includes("noturno")) znBreakdown.noturno += hours;
          else if (full.includes("apoio")) znBreakdown.apoio += hours;
          else if (full.includes("observação") || full.includes("observacao")) znBreakdown.observacao += hours;
          else znBreakdown.zn += hours;
        });
        const totalZN = znHours * VALOR_HORA_ZN;

        // === HC: Mês X-3 (atraso 90 dias) ===
        let hcMonth = input.month - HC_DELAY_MONTHS;
        let hcYear = input.year;
        while (hcMonth < 1) { hcMonth += 12; hcYear--; }
        const hcStartDate = `${hcYear}-${String(hcMonth).padStart(2, '0')}-01`;
        const hcLastDay = new Date(hcYear, hcMonth, 0).getDate();
        const hcEndDate = `${hcYear}-${String(hcMonth).padStart(2, '0')}-${String(hcLastDay).padStart(2, '0')}`;

        let hcHours = 0;
        allEvents.forEach(event => {
          const eventDate = event.date;
          if (eventDate < hcStartDate || eventDate > hcEndDate) return;
          if (!isHC(event)) return;
          hcHours += calcHours(event);
        });
        const totalHC = hcHours * VALOR_HORA_HC;

        return {
          month: input.month,
          year: input.year,
          // ZN Group
          znHours,
          znBreakdown,
          znRefStart: znStartDate,
          znRefEnd: znEndDate,
          valorHoraZN: VALOR_HORA_ZN,
          totalZN,
          // HC
          hcHours,
          hcRefMonth: hcMonth,
          hcRefYear: hcYear,
          valorHoraHC: VALOR_HORA_HC,
          totalHC,
          // Despesas
          totalFixed,
          totalVariable,
          totalDespesas: totalFixed + totalVariable,
          // Saldo
          totalRecebimentos: totalZN + totalHC,
          saldoEstimado: (totalZN + totalHC) - totalFixed,
        };
      }),
  }),

  // Medications router
  medications: router({
    list: adminProcedure.query(async ({ ctx }) => await db.getMedicationsByUserId(ctx.user.userId)),
    
    create: adminProcedure
      .input(z.object({ name: z.string(), time: z.string(), order: z.number().optional() }))
      .mutation(async ({ input, ctx }) => await db.createMedication({ userId: ctx.user.userId, name: input.name, time: input.time, order: input.order || 0 })),
    
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), time: z.string().optional(), order: z.number().optional() }))
      .mutation(async ({ input, ctx }) => { const { id, ...rest } = input; const data: Record<string, unknown> = {}; if (rest.name !== undefined) data.name = rest.name; if (rest.time !== undefined) data.time = rest.time; if (rest.order !== undefined) data.order = rest.order; return await db.updateMedication(id, ctx.user.userId, data as any); }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => await db.deleteMedication(input.id, ctx.user.userId)),
    
    getLogs: adminProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input, ctx }) => await db.getMedicationLogsByDate(ctx.user.userId, input.date)),
    
    logTaken: adminProcedure
      .input(z.object({ medicationId: z.number(), date: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const now = new Date();
        return await db.insertMedicationLog({
          userId: ctx.user.userId,
          medicationId: input.medicationId,
          takenAt: now,
          takenDate: input.date
        });
      }),
    
    undoTaken: adminProcedure
      .input(z.object({ medicationId: z.number(), date: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const logs = await db.getMedicationLogsByDate(ctx.user.userId, input.date);
        const log = logs.find(l => l.medicationId === input.medicationId);
        if (log) return await db.deleteMedicationLog(log.id);
        return false;
      }),
  }),

  // Diary router - Admin only (private diary)
  diary: router({
    // Get diary entry for a specific date
    get: adminProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.getDiaryEntry(ctx.user.userId, input.date);
      }),
    
    // Save or update diary entry
    save: adminProcedure
      .input(z.object({ 
        date: z.string(), 
        title: z.string().nullable().optional(),
        content: z.string().nullable().optional(),
        tags: z.string().nullable().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.upsertDiaryEntry({
          userId: ctx.user.userId, 
          date: input.date, 
          title: input.title || null, 
          content: input.content || null,
          tags: input.tags || null
        });
      }),
    
    // List all diary entries
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getDiaryEntriesByUserId(ctx.user.userId);
    }),
    
    // Search diary entries by keyword
    search: adminProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.searchDiaryEntries(ctx.user.userId, input.query);
      }),
    
    // Get entries by tag
    byTag: adminProcedure
      .input(z.object({ tag: z.string() }))
      .query(async ({ input, ctx }) => {
        // Get all diary entries and filter by tag
        const entries = await db.getDiaryEntries(ctx.user.userId, '2026-01-01', '2026-12-31');
        return entries.filter(e => e.tags?.includes(input.tag));
      }),
    
    // Get all tags used
    tags: adminProcedure.query(async ({ ctx }) => {
      const entries = await db.getDiaryEntries(ctx.user.userId, '2026-01-01', '2026-12-31');
      const tags = new Set<string>();
      entries.forEach(e => {
        if (e.tags) {
          e.tags.split(',').forEach(tag => tags.add(tag.trim()));
        }
      });
      return Array.from(tags);
    }),
    
    // Delete diary entry
    delete: adminProcedure
      .input(z.object({ date: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // Find and delete diary entry for this date
        const entry = await db.getDiaryEntry(ctx.user.userId, input.date);
        if (entry) {
          // Note: No delete function in db.ts yet, would need to be added
          return { success: true, message: 'Delete not yet implemented' };
        }
        return { success: false, message: 'Entry not found' };
      }),
  }),

  // Categories router
  categories: router({
    list: publicProcedure.query(async () => {
      const cats = await db.getCategories();
      return normalizeCategories(cats);
    }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        color: z.string().min(1),
        type: z.string().default("outro"),
        icon: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const cat = await db.createCategory({
          name: input.name,
          color: input.color,
          type: input.type,
          icon: input.icon || null,
          sortOrder: input.sortOrder || 0,
        });
        return cat ? normalizeCategory(cat) : null;
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        color: z.string().optional(),
        type: z.string().optional(),
        icon: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.color !== undefined) updateData.color = data.color;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.icon !== undefined) updateData.icon = data.icon;
        if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
        const cat = await db.updateCategory(id, updateData);
        return cat ? normalizeCategory(cat) : null;
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteCategory(input.id);
      }),
  }),

  // User preferences router
  preferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await db.getUserPreferences(ctx.user.userId);
      return prefs || { userId: ctx.user.userId, theme: 'light' };
    }),
    setTheme: protectedProcedure
      .input(z.object({ theme: z.enum(["light", "dark"]) }))
      .mutation(async ({ input, ctx }) => await db.upsertUserPreferences({ userId: ctx.user.userId, theme: input.theme })),
  }),
});

export type AppRouter = typeof appRouter;
