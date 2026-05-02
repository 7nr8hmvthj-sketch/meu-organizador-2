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
    
    create: protectedProcedure
      .input(z.object({ date: z.string(), type: z.string(), description: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional(), color: z.string().optional(), isShift: z.boolean().default(true) }))
      .mutation(async ({ input, ctx }) => {
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        const event = await db.createEvent({
          userId: effectiveUserId,
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
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        const eventsToCreate = input.map(ev => ({
          userId: effectiveUserId,
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
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        return await db.updateEvent(id, effectiveUserId, updateData);
      }),
    
    passShift: adminProcedure
      .input(z.object({ id: z.number(), reason: z.string() }))
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
    
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        const event = await db.updateEvent(input.id, effectiveUserId, { isCancelled: true });
        return event ? normalizeEvent(event) : null;
      }),
    
    undoCancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const effectiveUserId = await getEffectiveUserId(ctx.user);
        const event = await db.updateEvent(input.id, effectiveUserId, { isCancelled: false });
        return event ? normalizeEvent(event) : null;
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
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
        // === DESPESAS ===
        const allExpenses = await db.getExpensesByUserId(ctx.user.userId);
        const fixedExpenses = allExpenses.filter(e => e.category === "fixed");
        const variableExpenses = allExpenses.filter(e => e.category === "variable");
        const totalFixed = fixedExpenses.reduce((sum, e) => sum + parseFloat(String(e.amount || "0")), 0);
        const totalVariable = variableExpenses.reduce((sum, e) => sum + parseFloat(String(e.amount || "0")), 0);

        // === EVENTOS (range amplo para cobrir atrasos de pagamento) ===
        const allEvents = await db.getEventsByDateRange(ctx.user.userId, '2024-01-01', '2027-12-31');

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

        // === MOTOR DINÂMICO DE WORKPLACES ===
        const userWorkplaces = await db.getWorkplaces(ctx.user.userId);

        // Se não há workplaces configurados, usa lógica legada (ZN/HC hardcoded)
        const VALOR_HORA_ZN = 136;
        const VALOR_HORA_HC = 108;
        const HC_DELAY_MONTHS = 3;

        let workplacesSummary: Array<{
          id: number;
          name: string;
          hourlyRate: number;
          hours: number;
          total: number;
          refStart: string;
          refEnd: string;
          paymentDay: number;
          cycleStartDay: number;
          cycleEndDay: number;
        }> = [];

        if (userWorkplaces.length > 0) {
          // Motor dinâmico: calcula para cada workplace
          for (const wp of userWorkplaces) {
            const rate = parseFloat(String(wp.hourlyRate));
            const delay = wp.paymentDelayMonths;
            const keywords = wp.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);

            // Calcular mês de referência com atraso
            let refMonth = input.month - delay;
            let refYear = input.year;
            while (refMonth < 1) { refMonth += 12; refYear--; }

            // Calcular datas do ciclo
            let cycleStartMonth = refMonth;
            let cycleStartYear = refYear;
            // Se cycleStartDay > cycleEndDay, o ciclo começa no mês anterior
            if (wp.cycleStartDay > wp.cycleEndDay) {
              cycleStartMonth = refMonth - 1;
              if (cycleStartMonth < 1) { cycleStartMonth = 12; cycleStartYear--; }
            }
            const refStart = `${cycleStartYear}-${String(cycleStartMonth).padStart(2, '0')}-${String(wp.cycleStartDay).padStart(2, '0')}`;
            const refEnd = `${refYear}-${String(refMonth).padStart(2, '0')}-${String(wp.cycleEndDay).padStart(2, '0')}`;

            // Filtrar eventos que correspondem às keywords e ao range de datas
            let wpHours = 0;
            for (const event of allEvents) {
              const eventDate = event.date;
              if (eventDate < refStart || eventDate > refEnd) continue;
              const fullText = `${(event.type || '').toLowerCase()} ${(event.description || '').toLowerCase()}`;
              const matches = keywords.some(kw => fullText.includes(kw));
              if (!matches) continue;
              wpHours += calcHours(event);
            }

            workplacesSummary.push({
              id: wp.id,
              name: wp.name,
              hourlyRate: rate,
              hours: wpHours,
              total: wpHours * rate,
              refStart,
              refEnd,
              paymentDay: wp.paymentDay,
              cycleStartDay: wp.cycleStartDay,
              cycleEndDay: wp.cycleEndDay,
            });
          }
        } else {
          // Fallback legado: ZN e HC hardcoded
          const isZNGroup = (event: any): boolean => {
            const t = (event.type || "").toLowerCase();
            const d = (event.description || "").toLowerCase();
            const full = `${t} ${d}`;
            return full.includes("zn") || full.includes("zona norte") || full.includes("noturno")
              || full.includes("apoio") || full.includes("corredor") || full.includes("observação") || full.includes("observacao")
              || full.includes("porta") || full.includes("sala");
          };
          const isHC = (event: any): boolean => {
            const t = (event.type || "").toLowerCase();
            return t.includes("hc") || t.includes("home care") || t.includes("enfermaria");
          };

          let znStartMonth = input.month - 1;
          let znStartYear = input.year;
          if (znStartMonth < 1) { znStartMonth = 12; znStartYear--; }
          const znStartDate = `${znStartYear}-${String(znStartMonth).padStart(2, '0')}-20`;
          const znEndDate = `${input.year}-${String(input.month).padStart(2, '0')}-19`;
          let znHours = 0;
          allEvents.forEach(event => {
            if (event.date < znStartDate || event.date > znEndDate) return;
            if (!isZNGroup(event)) return;
            znHours += calcHours(event);
          });
          workplacesSummary.push({
            id: -1, name: "Zona Norte (legado)", hourlyRate: VALOR_HORA_ZN,
            hours: znHours, total: znHours * VALOR_HORA_ZN,
            refStart: znStartDate, refEnd: znEndDate, paymentDay: 5,
            cycleStartDay: 20, cycleEndDay: 19,
          });

          let hcMonth = input.month - HC_DELAY_MONTHS;
          let hcYear = input.year;
          while (hcMonth < 1) { hcMonth += 12; hcYear--; }
          const hcStartDate = `${hcYear}-${String(hcMonth).padStart(2, '0')}-01`;
          const hcLastDay = new Date(hcYear, hcMonth, 0).getDate();
          const hcEndDate = `${hcYear}-${String(hcMonth).padStart(2, '0')}-${String(hcLastDay).padStart(2, '0')}`;
          let hcHours = 0;
          allEvents.forEach(event => {
            if (event.date < hcStartDate || event.date > hcEndDate) return;
            if (!isHC(event)) return;
            hcHours += calcHours(event);
          });
          workplacesSummary.push({
            id: -2, name: "Home Care (legado)", hourlyRate: VALOR_HORA_HC,
            hours: hcHours, total: hcHours * VALOR_HORA_HC,
            refStart: hcStartDate, refEnd: hcEndDate, paymentDay: 5,
            cycleStartDay: 1, cycleEndDay: 31,
          });
        }

        const totalRecebimentos = workplacesSummary.reduce((sum, wp) => sum + wp.total, 0);

        return {
          month: input.month,
          year: input.year,
          // Workplaces dinâmicos
          workplacesSummary,
          // Legado (compatibilidade com frontend antigo)
          znHours: workplacesSummary.find(w => w.id === -1)?.hours ?? workplacesSummary[0]?.hours ?? 0,
          znBreakdown: { zn: 0, noturno: 0, apoio: 0, observacao: 0, porta: 0, sala: 0 },
          znRefStart: workplacesSummary[0]?.refStart ?? '',
          znRefEnd: workplacesSummary[0]?.refEnd ?? '',
          valorHoraZN: VALOR_HORA_ZN,
          totalZN: workplacesSummary.find(w => w.id === -1)?.total ?? workplacesSummary[0]?.total ?? 0,
          hcHours: workplacesSummary.find(w => w.id === -2)?.hours ?? workplacesSummary[1]?.hours ?? 0,
          hcRefMonth: input.month,
          hcRefYear: input.year,
          valorHoraHC: VALOR_HORA_HC,
          totalHC: workplacesSummary.find(w => w.id === -2)?.total ?? workplacesSummary[1]?.total ?? 0,
          // Despesas
          totalFixed,
          totalVariable,
          totalDespesas: totalFixed + totalVariable,
          // Saldo
          totalRecebimentos,
          saldoEstimado: totalRecebimentos - totalFixed,
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
