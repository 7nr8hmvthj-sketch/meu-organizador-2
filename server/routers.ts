import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

// Simple auth credentials
const VALID_CREDENTIALS = {
  "USER": { password: "Wert123.", role: "admin", userId: 1 },
  "JESSICA": { password: "123", role: "trainer", userId: 150023 },
  "ISA": { password: "123", role: "trainer", userId: 150024 },
};

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    // Simple login with fixed credentials
    simpleLogin: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = VALID_CREDENTIALS[input.username.toUpperCase() as keyof typeof VALID_CREDENTIALS];
        
        if (user && input.password === user.password) {
          // Create a simple session by setting a cookie with user info
          const cookieOptions = getSessionCookieOptions(ctx.req);
          const userInfo = JSON.stringify({
            username: input.username.toUpperCase(),
            role: user.role,
            userId: user.userId,
          });
          ctx.res.cookie("simple_auth", userInfo, {
            ...cookieOptions,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          });
          return { success: true, role: user.role, username: input.username.toUpperCase() };
        }
        return { success: false, error: "Credenciais inválidas" };
      }),
    
    // Check if user is authenticated via simple auth
    checkSimpleAuth: publicProcedure.query(({ ctx }) => {
      const cookies = ctx.req.headers.cookie || "";
      const authCookie = cookies.split(';').find(c => c.trim().startsWith('simple_auth='));
      if (!authCookie) {
        return { isAuthenticated: false, user: null };
      }
      
      try {
        const cookieValue = decodeURIComponent(authCookie.split('=')[1]);
        const userInfo = JSON.parse(cookieValue);
        return { isAuthenticated: true, user: userInfo };
      } catch {
        return { isAuthenticated: false, user: null };
      }
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
    list: publicProcedure.query(async () => {
      return await db.getEventsByUserId(1); // Using userId 1 for simple auth
    }),
    
    listByDateRange: publicProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getEventsByDateRange(1, input.startDate, input.endDate);
      }),
    
    create: publicProcedure
      .input(z.object({
        date: z.string(),
        type: z.string(),
        description: z.string().optional(),
        isShift: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        return await db.createEvent({
          userId: 1,
          date: new Date(input.date),
          type: input.type,
          description: input.description || null,
          isShift: input.isShift,
        });
      }),
    
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        date: z.string().optional(),
        type: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};
        if (data.date) updateData.date = new Date(data.date);
        if (data.type) updateData.type = data.type;
        if (data.description !== undefined) updateData.description = data.description;
        return await db.updateEvent(id, 1, updateData);
      }),
    
    passShift: publicProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateEvent(input.id, 1, {
          isPassed: true,
          passedReason: input.reason,
        });
      }),
    
    undoPass: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateEvent(input.id, 1, {
          isPassed: false,
          passedReason: null,
        });
      }),
    
    cancel: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateEvent(input.id, 1, { isCancelled: true });
      }),
    
    undoCancel: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateEvent(input.id, 1, { isCancelled: false });
      }),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteEvent(input.id, 1);
      }),
  }),

  // Expenses router
  expenses: router({
    list: publicProcedure.query(async () => {
      return await db.getExpensesByUserId(1);
    }),
    
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        amount: z.string(),
        dueDay: z.number(),
        category: z.enum(["fixed", "variable"]),
      }))
      .mutation(async ({ input }) => {
        return await db.createExpense({
          userId: 1,
          name: input.name,
          amount: input.amount,
          dueDay: input.dueDay,
          category: input.category,
        });
      }),
    
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        amount: z.string().optional(),
        dueDay: z.number().optional(),
        category: z.enum(["fixed", "variable"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateExpense(id, 1, data);
      }),
    
    togglePaid: publicProcedure
      .input(z.object({
        id: z.number(),
        isPaid: z.boolean(),
        month: z.number().optional(),
        year: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateExpense(input.id, 1, {
          isPaid: input.isPaid,
          paidMonth: input.isPaid ? input.month : null,
          paidYear: input.isPaid ? input.year : null,
        });
      }),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteExpense(input.id, 1);
      }),
    
    resetPaidStatus: publicProcedure.mutation(async () => {
      await db.resetExpensesPaidStatus(1);
      return { success: true };
    }),
  }),

  // Medications router
  medications: router({
    list: publicProcedure.query(async () => {
      return await db.getMedicationsByUserId(1);
    }),
    
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        time: z.string(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createMedication({
          userId: 1,
          name: input.name,
          time: input.time,
          order: input.order || 0,
        });
      }),
    
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        time: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateMedication(id, 1, data);
      }),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteMedication(input.id, 1);
      }),
    
    // Medication logs
    getLogs: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        return await db.getMedicationLogsByDate(1, input.date);
      }),
    
    logTaken: publicProcedure
      .input(z.object({
        medicationId: z.number(),
        date: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.logMedicationTaken({
          userId: 1,
          medicationId: input.medicationId,
          takenDate: new Date(input.date),
        });
      }),
    
    undoTaken: publicProcedure
      .input(z.object({
        medicationId: z.number(),
        date: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.deleteMedicationLog(input.medicationId, 1, input.date);
      }),
  }),

  // User preferences router
  preferences: router({
    get: publicProcedure.query(async () => {
      return await db.getUserPreferences(1);
    }),
    
    setTheme: publicProcedure
      .input(z.object({ theme: z.enum(["light", "dark"]) }))
      .mutation(async ({ input }) => {
        return await db.upsertUserPreferences(1, { theme: input.theme });
      }),
  }),
});

export type AppRouter = typeof appRouter;
