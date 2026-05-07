import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

import bcrypt from "bcryptjs";
import crypto from "crypto";

// --- MOTOR DE SEGURANÇA (HMAC) ---
const SECRET = process.env.JWT_SECRET || "chave_super_secreta_padrao_123";

function signCookie(data: any) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`; 
}

function verifyCookie(cookieValue: string) {
  try {
    const decoded = decodeURIComponent(cookieValue);
    const [payload, signature] = decoded.split('.');
    if (!payload || !signature) return null;
    
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    if (signature !== expectedSignature) return null;
    
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch {
    return null; 
  }
}

// --- MIDDLEWARES ---

const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const cookies = ctx.req.headers.cookie || "";
  const authCookie = cookies.split(';').find(c => c.trim().startsWith('simple_auth='));
  
  if (!authCookie) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Login necessário." });
  }

  const cookieValue = authCookie.split('=')[1];
  const user = verifyCookie(cookieValue);

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sessão inválida ou forjada." });
  }

  return next({ ctx: { ...ctx, user: user as { username: string; role: string; userId: number } } });
});

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores." });
  }
  return next();
});

// Auth is now fully handled via database (app_users table with bcrypt hashes)
// VALID_CREDENTIALS removed - all auth goes through DB

// Delegação de acesso: trainers acessam agenda do admin (userId 1)
// Agenda managers acessam agenda do owner
// Admins e users normais acessam sua própria agenda
let _managedUserIds: Map<number, number[]> = new Map();

const getEffectiveUserId = async (user: { role: string; userId: number }): Promise<number> => {
  // Trainers always see admin's agenda (userId 1)
  if (user.role === 'trainer') return 1;
  
  // Check if this user manages other agendas
  if (!_managedUserIds.has(user.userId)) {
    const managed = await db.getManagedUserIds(user.userId);
    _managedUserIds.set(user.userId, managed);
  }
  
  const managed = _managedUserIds.get(user.userId) || [];
  if (managed.length > 0) {
    return managed[0]; // Return first managed user's ID
  }
  
  return user.userId;
};

// Clear cache every 5 minutes
setInterval(() => {
  _managedUserIds.clear();
}, 5 * 60 * 1000);

// Normaliza eventos do PostgreSQL garantindo o workplaceId explícito
const normalizeEvent = (event: any) => ({
  ...event,
  userId: event.userId,
  workplaceId: event.workplaceId ?? null,
  value: event.value ?? null,
  isShift: event.isShift,
  isPassed: event.isPassed,
  passedReason: event.passedReason,
  isCancelled: event.isCancelled,
  createdBy: event.createdBy,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
});

const normalizeEvents = (events: any[]) => events.map(normalizeEvent);

// Normaliza categorias do PostgreSQL (lowercase) para camelCase
const normalizeCategory = (cat: any) => ({
  ...cat,
  isDefault: cat.isdefault ?? cat.isDefault,
  sortOrder: cat.sortorder ?? cat.sortOrder,
  userId: cat.userid ?? cat.userId ?? null,
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

  
  
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      const cookies = ctx.req.headers.cookie || "";
      const authCookie = cookies.split(';').find(c => c.trim().startsWith('simple_auth='));
      if (!authCookie) return null;
      return verifyCookie(authCookie.split('=')[1]);
    }),
    
    simpleLogin: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const upperUsername = input.username.toUpperCase();
        try {
          const dbUser = await db.getAppUserByUsername(upperUsername);
          if (dbUser) {
            const isValid = await bcrypt.compare(input.password, dbUser.password_hash);
            if (isValid) {
              const cookieOptions = getSessionCookieOptions(ctx.req);
              
              const userInfoSigned = signCookie({ username: dbUser.username, role: dbUser.role, userId: dbUser.user_id });
              
              ctx.res.cookie("simple_auth", userInfoSigned, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
              return { success: true, role: dbUser.role, username: dbUser.username };
            }
            return { success: false, error: "Credenciais inválidas" };
          }
        } catch (error) {
          console.error("[Auth] DB auth error:", error);
        }
        return { success: false, error: "Credenciais inválidas" };
      }),
    
    // Criar novo usuário (apenas admin)
    createUser: adminProcedure
      .input(z.object({
        username: z.string().min(2).max(64),
        password: z.string().min(3).max(128),
        role: z.enum(["admin", "trainer", "user"]),
      }))
      .mutation(async ({ input }) => {
        const upperUsername = input.username.toUpperCase();
        
        // Verificar se já existe
        const existing = await db.getAppUserByUsername(upperUsername);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Usuário já existe" });
        }
        
        // Hash da senha
        const passwordHash = await bcrypt.hash(input.password, 10);
        
        // Gerar userId único
        const newUserId = await db.getNextAppUserId();
        
        // Inserir no banco (app_users para credenciais)
        await db.createAppUser({
          username: upperUsername,
          passwordHash,
          role: input.role,
          userId: newUserId,
        });
        
        // Inserir na tabela users para satisfazer FK constraints
        await db.createUserRecord({
          id: newUserId,
          openId: `${upperUsername.toLowerCase()}-local`,
          name: upperUsername,
          email: `${upperUsername.toLowerCase()}@local.com`,
          loginMethod: 'local',
          role: input.role === 'admin' ? 'admin' : 'user',
        });
        
        return { success: true, username: upperUsername, userId: newUserId, role: input.role };
      }),
    
    // Auto-registro com código de convite (público)
    registerWithCode: publicProcedure
      .input(z.object({
        username: z.string().min(2).max(64),
        password: z.string().min(3).max(128),
        inviteCode: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        // Código de convite válido (pode ser configurado via env no futuro)
        const VALID_INVITE_CODES: Record<string, string> = {
          "AGENDA2026": "user",
          "TRAINER2026": "trainer",
        };
        
        const codeUpper = input.inviteCode.toUpperCase();
        const assignedRole = VALID_INVITE_CODES[codeUpper];
        if (!assignedRole) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Código de convite inválido" });
        }
        
        const upperUsername = input.username.toUpperCase();
        
        // Verificar se já existe
        const existing = await db.getAppUserByUsername(upperUsername);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Usuário já existe" });
        }
        
        // Hash da senha
        const passwordHash = await bcrypt.hash(input.password, 10);
        
        // Gerar userId único
        const newUserId = await db.getNextAppUserId();
        
        // Inserir no banco (app_users para credenciais)
        await db.createAppUser({
          username: upperUsername,
          passwordHash,
          role: assignedRole,
          userId: newUserId,
        });
        
        // Inserir na tabela users para satisfazer FK constraints
        await db.createUserRecord({
          id: newUserId,
          openId: `${upperUsername.toLowerCase()}-local`,
          name: upperUsername,
          email: `${upperUsername.toLowerCase()}@local.com`,
          loginMethod: 'local',
          role: assignedRole === 'admin' ? 'admin' : 'user',
        });
        
        // Auto-login após registro
        const cookieOptions = getSessionCookieOptions(ctx.req);
        const userInfoSigned = signCookie({ username: upperUsername, role: assignedRole, userId: newUserId });
        ctx.res.cookie("simple_auth", userInfoSigned, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        
        return { success: true, username: upperUsername, userId: newUserId, role: assignedRole };
      }),
    
    checkSimpleAuth: publicProcedure.query(({ ctx }) => {
      const cookies = ctx.req.headers.cookie || "";
      const authCookie = cookies.split(';').find(c => c.trim().startsWith('simple_auth='));
      if (!authCookie) return { isAuthenticated: false, user: null };
      
      const user = verifyCookie(authCookie.split('=')[1]);
      if (user) {
        return { isAuthenticated: true, user: user };
      }
      return { isAuthenticated: false, user: null };
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
    // Cada usuário vê seus eventos; trainers vêem agenda do admin (userId 1)
    list: protectedProcedure.query(async ({ ctx }) => {
      const effectiveUserId = await getEffectiveUserId(ctx.user);
      const events = await db.getEventsByDateRange(effectiveUserId, '2026-01-01', '2026-12-31');
      return normalizeEvents(events);
    }),
    
    listByDateRange: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input, ctx }) => {
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        const events = await db.getEventsByDateRange(effectiveUserId, input.startDate, input.endDate);
        return normalizeEvents(events);
      }),
    
    // ATUALIZADO: Aceita workplaceId
    create: protectedProcedure
      .input(z.object({ date: z.string(), type: z.string(), description: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional(), color: z.string().optional(), isShift: z.boolean().default(true), workplaceId: z.number().nullable().optional(), value: z.number().nullable().optional() }))
      .mutation(async ({ input, ctx }) => {
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        const eventData: any = {
          userId: effectiveUserId,
          date: input.date.substring(0, 10),
          type: input.type,
          description: input.description || null,
          startTime: input.startTime || null,
          endTime: input.endTime || null,
          color: input.color || null,
          isShift: input.isShift,
          createdBy: ctx.user.username,
        };
        if (input.workplaceId !== undefined) {
           eventData.workplaceId = input.workplaceId;
        }
        if (input.value !== undefined) {
           eventData.value = input.value !== null ? String(input.value) : null;
        }

        const event = await db.createEvent(eventData);
        return event ? normalizeEvent(event) : null;
      }),
    
    // ATUALIZADO: Aceita workplaceId no Lote
    createMany: protectedProcedure
      .input(z.array(z.object({ 
        date: z.string(), 
        type: z.string(), 
        description: z.string().optional(), 
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        color: z.string().optional(),
        isShift: z.boolean().default(true),
        workplaceId: z.number().nullable().optional(),
        value: z.number().nullable().optional()
      })))
      .mutation(async ({ input, ctx }) => {
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        const eventsToCreate = input.map(ev => {
          const e: any = {
            userId: effectiveUserId,
            date: ev.date.substring(0, 10),
            type: ev.type,
            description: ev.description || null,
            startTime: ev.startTime || null,
            endTime: ev.endTime || null,
            color: ev.color || null,
            isShift: ev.isShift,
            createdBy: ctx.user.username,
          };
          if (ev.workplaceId !== undefined) e.workplaceId = ev.workplaceId;
          return e;
        });
        const results = await db.createManyEvents(eventsToCreate);
        return results.map(normalizeEvent);
      }),
    
    // ATUALIZADO: Aceita workplaceId e IMPEDE manipulação indevida de isPassed
    update: protectedProcedure
      .input(z.object({ 
        id: z.number(), 
        date: z.string().optional(), 
        type: z.string().optional(), 
        description: z.string().optional(), 
        startTime: z.string().optional(), 
        endTime: z.string().optional(), 
        color: z.string().optional(), 
        isPassed: z.boolean().optional(), 
        passedReason: z.string().max(500, "Justificativa muito longa").optional(), 
        workplaceId: z.number().nullable().optional(),
        value: z.number().nullable().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        // Verifica se o usuário pode editar (admin ou criador do evento)
        const event = await db.getEventById(input.id);
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
        
        // Bloqueio de Privacidade: Apenas admin pode alterar isPassed na rota update padrão
        if (input.isPassed !== undefined && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem auditar ou passar eventos." });
        }

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
        if (data.workplaceId !== undefined) updateData.workplaceId = data.workplaceId;
        if (data.value !== undefined) updateData.value = data.value !== null ? String(data.value) : null;
        
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        return await db.updateEvent(id, effectiveUserId, updateData);
      }),
    
    // Assegurado que seja adminProcedure e imposto max chars
    passShift: adminProcedure
      .input(z.object({ id: z.number(), reason: z.string().max(500, "Justificativa muito longa") }))
      .mutation(async ({ input, ctx }) => {
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        const event = await db.updateEvent(input.id, effectiveUserId, { isPassed: true, passedReason: input.reason });
        return event ? normalizeEvent(event) : null;
      }),
    
    undoPass: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        const event = await db.updateEvent(input.id, effectiveUserId, { isPassed: false, passedReason: null });
        return event ? normalizeEvent(event) : null;
      }),
    
    // Apenas Admins podem cancelar eventos globalmente
    cancel: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        const event = await db.updateEvent(input.id, effectiveUserId, { isCancelled: true });
        return event ? normalizeEvent(event) : null;
      }),
    
    undoCancel: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        const event = await db.updateEvent(input.id, effectiveUserId, { isCancelled: false });
        return event ? normalizeEvent(event) : null;
      }),
    
    delete: protectedProcedure
      .input(z.object({ 
        id: z.number(), 
        mode: z.enum(['single', 'future', 'all']).default('single') 
      }))
      .mutation(async ({ input, ctx }) => {
        const event = await db.getEventById(input.id);
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
        
        const effectiveUserId = await getEffectiveUserId(ctx.user);

        if (ctx.user.role === "trainer") {
          if (event.createdBy !== ctx.user.username) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode excluir treinos que você criou." });
          }
        } 
        else if (ctx.user.role !== "admin" && event.userId !== effectiveUserId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para deletar este evento." });
        }
        
        let deletedEvents = [];
        if (input.mode === 'single') {
          deletedEvents = await db.deleteEvent(input.id);
        } else {
          deletedEvents = await db.deleteEventSeries(effectiveUserId, event.type, event.startTime, input.mode, event.date as unknown as string);
        }

        return deletedEvents.map(normalizeEvent);
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

    // --- NOVO MOTOR FINANCEIRO EXPLÍCITO ---
    monthlySummary: adminProcedure
      .input(z.object({ month: z.number().min(1).max(12), year: z.number() }))
      .query(async ({ ctx, input }) => {
        let workedMonth = input.month - 1;
        let workedYear = input.year;
        if (workedMonth < 1) {
          workedMonth = 12;
          workedYear--;
        }

        const allEvents = await db.getEventsByDateRange(ctx.user.userId, '2024-01-01', '2027-12-31');
        const userWorkplaces = await db.getWorkplaces(ctx.user.userId);
        const unlinkedRatesList = await db.getUnlinkedRates(ctx.user.userId);

        const calcHours = (event: any): number => {
          // CORREÇÃO 1: Removido o "if (event.isPassed) return 0;". Plantões concluídos DEVEM somar no faturamento!
          if (event.isCancelled) return 0; // Só zera se for explicitamente cancelado
          let startH = 0, endH = 0;
          if (event.startTime && event.endTime) {
              const timeMatch = event.startTime.match(/(\d{1,2}):(\d{2})/);
              const endMatch = event.endTime.match(/(\d{1,2}):(\d{2})/);
              if (timeMatch && endMatch) {
                  startH = parseInt(timeMatch[1], 10);
                  endH = parseInt(endMatch[1], 10);
              }
          }
          if (startH === 0 && endH === 0) return 0;
          let diff = endH - startH;
          if (diff < 0) diff += 24;
          return diff;
        };

        let workplacesSummary = [];
        let totalRecebimentos = 0;

        for (const wp of userWorkplaces) {
          const rate = parseFloat(String(wp.hourlyRate));
          const cutoffDay = wp.cycleEndDay;
          
          let prevMonth = workedMonth - 1;
          let prevYear = workedYear;
          if (prevMonth < 1) { prevMonth = 12; prevYear--; }

          const refStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(cutoffDay + 1).padStart(2, '0')}`;
          const refEnd = `${workedYear}-${String(workedMonth).padStart(2, '0')}-${String(cutoffDay).padStart(2, '0')}`;

          let wpHours = 0;
          let wpFixedValues = 0;

          for (const event of allEvents) {
            const eventDate = typeof event.date === 'string' ? event.date.substring(0, 10) : new Date(event.date).toISOString().substring(0, 10);
            if (eventDate < refStart || eventDate > refEnd) continue;
            
            if (event.workplaceId === wp.id) { 
               const eventValue = event.value ? parseFloat(event.value) : 0;
               if (eventValue > 0) {
                 wpFixedValues += eventValue;
               } else {
                 wpHours += calcHours(event); 
               }
            }
          }
          const wpTotal = (wpHours * rate) + wpFixedValues;
          totalRecebimentos += wpTotal;

          workplacesSummary.push({
            id: wp.id,
            name: wp.name,
            hourlyRate: rate,
            hours: wpHours,
            total: wpTotal,
            cycleStart: refStart,
            cycleEnd: refEnd
          });
        }

        let unlinkedSummary = [];
        const startAvulso = `${workedYear}-${String(workedMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(workedYear, workedMonth, 0).getDate();
        const endAvulso = `${workedYear}-${String(workedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        for (const rateObj of unlinkedRatesList) {
          let hours = 0; 
          let fixedValues = 0;
          const rateValue = parseFloat(String(rateObj.hourlyRate));
          
          for (const event of allEvents) {
            const eventDate = typeof event.date === 'string' ? event.date.substring(0, 10) : new Date(event.date).toISOString().substring(0, 10);
            if (eventDate < startAvulso || eventDate > endAvulso) continue;
            
            if (!event.workplaceId && event.type === rateObj.name) { 
               const eventValue = event.value ? parseFloat(event.value) : 0;
               if (eventValue > 0) {
                 fixedValues += eventValue;
               } else {
                 hours += calcHours(event); 
               }
            }
          }
          const total = (hours * rateValue) + fixedValues; 
          totalRecebimentos += total;

          unlinkedSummary.push({
            id: rateObj.id,
            name: rateObj.name,
            type: rateObj.type,
            hourlyRate: rateValue,
            hours: hours,
            total: total
          });
        }

        return {
          receivingMonth: input.month,
          receivingYear: input.year,
          workedMonth,
          workedYear,
          workplacesSummary,
          unlinkedSummary,
          totalRecebimentos
        };
      }),

    // RH Conciliation - get adjustment for a month
    getAdjustment: adminProcedure
      .input(z.object({ month: z.number().min(1).max(12), year: z.number() }))
      .query(async ({ ctx, input }) => {
        const adj = await db.getMonthlyAdjustment(ctx.user.userId, input.month, input.year);
        return adj ? {
          rhHoursZN: adj.rhHoursZN ? parseFloat(adj.rhHoursZN) : null,
          rhHoursHC: adj.rhHoursHC ? parseFloat(adj.rhHoursHC) : null,
        } : { rhHoursZN: null, rhHoursHC: null };
      }),

    // RH Conciliation - save adjustment for a month
    upsertAdjustment: adminProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
        rhHoursZN: z.number().nullable(),
        rhHoursHC: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.upsertMonthlyAdjustment(
          ctx.user.userId, input.month, input.year, input.rhHoursZN, input.rhHoursHC
        );
        return { success: !!result };
      }),
  }),

  // Medications router
  medications: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getMedicationsByUserId(ctx.user.userId);
    }),
    
    create: adminProcedure
      .input(z.object({ name: z.string(), time: z.string(), order: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        return await db.createMedication({ userId: ctx.user.userId, name: input.name, time: input.time, order: input.order || 0 });
      }),
    
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), time: z.string().optional(), order: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...rest } = input;
        const data: Record<string, unknown> = {};
        if (rest.name !== undefined) data.name = rest.name;
        if (rest.time !== undefined) data.time = rest.time;
        if (rest.order !== undefined) data.order = rest.order;
        return await db.updateMedication(id, ctx.user.userId, data as any);
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.deleteMedication(input.id, ctx.user.userId);
      }),
    
    getLogs: adminProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.getMedicationLogsByDate(ctx.user.userId, input.date);
      }),
    
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
    list: protectedProcedure.query(async ({ ctx }) => {
      const cats = await db.getCategories(ctx.user.userId);
      return normalizeCategories(cats);
    }),
    
    // Add a custom category for the current user
    addCustom: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if this user already has this custom category
        const existingCats = await db.getCategories(ctx.user.userId);
        const exists = existingCats.find((c: any) => c.name.toLowerCase() === input.name.toLowerCase() && (c.userId === ctx.user.userId || c.userid === ctx.user.userId));
        if (exists) return normalizeCategory(exists);
        const cat = await db.createCategory({
          name: input.name,
          color: 'text-slate-700 bg-slate-50 dark:bg-slate-900/30 border-slate-200',
          type: 'outro',
          icon: null,
          sortOrder: 100,
          userId: ctx.user.userId,
        });
        return cat ? normalizeCategory(cat) : null;
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

  // Workplaces - dynamic billing engine
  workplaces: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getWorkplaces(ctx.user.userId);
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        hourlyRate: z.number().positive(),
        cycleStartDay: z.number().min(1).max(31).default(1),
        cycleEndDay: z.number().min(1).max(31).default(31),
        paymentDelayMonths: z.number().min(0).max(12).default(0),
        paymentDay: z.number().min(1).max(31).default(5),
        keywords: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createWorkplace({
          userId: ctx.user.userId,
          name: input.name,
          hourlyRate: String(input.hourlyRate),
          cycleStartDay: input.cycleStartDay,
          cycleEndDay: input.cycleEndDay,
          paymentDelayMonths: input.paymentDelayMonths,
          paymentDay: input.paymentDay,
          keywords: input.keywords,
        });
        if (!result) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create workplace' });
        return result;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        hourlyRate: z.number().positive().optional(),
        cycleStartDay: z.number().min(1).max(31).optional(),
        cycleEndDay: z.number().min(1).max(31).optional(),
        paymentDelayMonths: z.number().min(0).max(12).optional(),
        paymentDay: z.number().min(1).max(31).optional(),
        keywords: z.string().min(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.hourlyRate !== undefined) updateData.hourlyRate = String(data.hourlyRate);
        const result = await db.updateWorkplace(id, ctx.user.userId, updateData);
        if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workplace not found or unauthorized' });
        return result;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.deleteWorkplace(input.id, ctx.user.userId);
        if (!success) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workplace not found or unauthorized' });
        return { success: true };
      }),
  }),

  unlinkedRates: router({
    list: protectedProcedure.query(async ({ ctx }) => await db.getUnlinkedRates(ctx.user.userId)),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), hourlyRate: z.number().positive(), type: z.string().default('automatico') }))
      .mutation(async ({ ctx, input }) => await db.createUnlinkedRate({ userId: ctx.user.userId, name: input.name, hourlyRate: String(input.hourlyRate), type: input.type })),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).optional(), hourlyRate: z.number().positive().optional(), type: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.hourlyRate !== undefined) updateData.hourlyRate = String(data.hourlyRate);
        return await db.updateUnlinkedRate(id, ctx.user.userId, updateData);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => await db.deleteUnlinkedRate(input.id, ctx.user.userId)),
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
