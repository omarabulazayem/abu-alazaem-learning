import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  claimReward,
  createChildProfile,
  createTeacherClass,
  getChildProfileForUser,
  getLearningProgress,
  getTeacherOverview,
  listReviewEvents,
  recordReviewEvent,
  joinChildToClass,
  listAchievements,
  listChildProfiles,
  listTeacherClasses,
  updateChildProfile,
  upsertLearningProgress,
  type Actor,
} from "./db";
import { z } from "zod";

const ageBand = z.enum(["3-6", "7-9", "10-12"]);
const progressStatus = z.enum(["new", "learning", "review", "mastered"]);
const optionalChildId = z.string().uuid().optional();

function actor(ctx: { user: NonNullable<Actor["user"]>; accessToken: string }): Actor {
  return { user: ctx.user, accessToken: ctx.accessToken };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),
  family: router({
    children: router({
      list: protectedProcedure.query(({ ctx }) => listChildProfiles(actor(ctx))),
      create: protectedProcedure
        .input(z.object({ displayName: z.string().min(2).max(80), avatar: z.string().max(16).optional(), ageBand }))
        .mutation(({ ctx, input }) => createChildProfile(actor(ctx), input)),
      update: protectedProcedure
        .input(z.object({ childId: z.string().uuid(), displayName: z.string().min(2).max(80), avatar: z.string().max(16), ageBand }))
        .mutation(({ ctx, input }) => updateChildProfile(actor(ctx), input)),
      joinClass: protectedProcedure
        .input(z.object({ childId: z.string().uuid(), joinCode: z.string().min(4).max(32) }))
        .mutation(({ ctx, input }) => joinChildToClass(actor(ctx), input.childId, input.joinCode)),
    }),
  }),
  profile: router({
    get: protectedProcedure
      .input(z.object({ childId: optionalChildId }).optional())
      .query(({ ctx, input }) => getChildProfileForUser(actor(ctx), input?.childId)),
    update: protectedProcedure
      .input(z.object({ childId: optionalChildId, displayName: z.string().min(2).max(80), avatar: z.string().max(16), ageBand }))
      .mutation(({ ctx, input }) => updateChildProfile(actor(ctx), input)),
  }),
  progress: router({
    list: protectedProcedure
      .input(z.object({ childId: optionalChildId }).optional())
      .query(({ ctx, input }) => getLearningProgress(actor(ctx), input?.childId)),
    save: protectedProcedure
      .input(
        z.object({
          childId: optionalChildId,
          surahNumber: z.number().int().min(1).max(114),
          surahName: z.string().min(1).max(80),
          memorizedPercent: z.number().int().min(0).max(100),
          reviewPercent: z.number().int().min(0).max(100).optional(),
          status: progressStatus,
        }),
      )
      .mutation(({ ctx, input }) => upsertLearningProgress(actor(ctx), input)),
    reward: protectedProcedure
      .input(
        z.object({
          childId: optionalChildId,
          event: z.enum(["memorize_session", "memory_game", "review_session"]),
          sourceKey: z.string().min(4).max(160),
        }),
      )
      .mutation(({ ctx, input }) => claimReward(actor(ctx), input)),
  }),
  review: router({
    list: protectedProcedure
      .input(z.object({ childId: optionalChildId, limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(({ ctx, input }) => listReviewEvents(actor(ctx), input?.childId, input?.limit ?? 20)),
    record: protectedProcedure
      .input(
        z.object({
          childId: optionalChildId,
          surahNumber: z.number().int().min(1).max(114),
          score: z.number().int().min(0).max(100).optional(),
          notes: z.string().max(500).optional(),
        }),
      )
      .mutation(({ ctx, input }) => recordReviewEvent(actor(ctx), input)),
  }),
  achievements: router({
    list: protectedProcedure
      .input(z.object({ childId: optionalChildId }).optional())
      .query(({ ctx, input }) => listAchievements(actor(ctx), input?.childId)),
  }),
  teacher: router({
    overview: protectedProcedure.query(({ ctx }) => getTeacherOverview(actor(ctx))),
    classes: router({
      list: protectedProcedure.query(({ ctx }) => listTeacherClasses(actor(ctx))),
      create: protectedProcedure
        .input(z.object({ name: z.string().min(2).max(100) }))
        .mutation(({ ctx, input }) => createTeacherClass(actor(ctx), input.name)),
    }),
  }),
});

export type AppRouter = typeof appRouter;
