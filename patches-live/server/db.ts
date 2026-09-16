import { randomBytes } from "node:crypto";
import { userRest, type AppUser } from "./supabase";

export type AgeBand = "3-6" | "7-9" | "10-12";
export type ProgressStatus = "new" | "learning" | "review" | "mastered";

export type Actor = {
  user: AppUser;
  accessToken: string;
};

export type ChildProfile = {
  id: string;
  parent_id: string;
  display_name: string;
  age_band: AgeBand;
  avatar: string;
  level: string;
  points: number;
  stars: number;
  streak: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ChildProfileView = {
  id: string;
  displayName: string;
  ageBand: AgeBand;
  avatar: string;
  level: string;
  points: number;
  stars: number;
  streak: number;
};

export type ReviewEvent = {
  id: string;
  child_id: string;
  surah_number: number;
  score: number | null;
  notes: string | null;
  reviewed_at: string;
  created_by: string | null;
};

function toChildProfileView(child: ChildProfile): ChildProfileView {
  return {
    id: child.id,
    displayName: child.display_name,
    ageBand: child.age_band,
    avatar: child.avatar,
    level: child.level,
    points: child.points,
    stars: child.stars,
    streak: child.streak,
  };
}

function encode(value: string) {
  return encodeURIComponent(value);
}

async function selectOne<T>(actor: Actor, path: string): Promise<T | undefined> {
  const rows = await userRest<T[]>(actor.accessToken, path);
  return rows[0];
}

export async function listChildProfiles(actor: Actor) {
  if (actor.user.accountType === "teacher") {
    const classes = await userRest<Array<{ id: string }>>(
      actor.accessToken,
      `/classes?teacher_id=eq.${encode(actor.user.id)}&is_active=eq.true&select=id`,
    );
    if (!classes.length) return [];
    const classFilter = classes.map(item => `class_id.eq.${item.id}`).join(",");
    const links = await userRest<Array<{ child_id: string }>>(
      actor.accessToken,
      `/class_students?or=(${classFilter})&select=child_id`,
    );
    const ids = [...new Set(links.map(item => item.child_id))];
    if (!ids.length) return [];
    const childFilter = ids.map(id => `id.eq.${id}`).join(",");
    return userRest<ChildProfile[]>(
      actor.accessToken,
      `/child_profiles?or=(${childFilter})&is_active=eq.true&select=*&order=display_name.asc`,
    );
  }

  return userRest<ChildProfile[]>(
    actor.accessToken,
    `/child_profiles?parent_id=eq.${encode(actor.user.id)}&is_active=eq.true&select=*&order=created_at.asc`,
  );
}

export async function getChildProfileRowForUser(actor: Actor, childId?: string) {
  if (childId) {
    return selectOne<ChildProfile>(
      actor,
      `/child_profiles?id=eq.${encode(childId)}&is_active=eq.true&select=*&limit=1`,
    );
  }

  if (actor.user.accountType === "teacher") return undefined;
  return selectOne<ChildProfile>(
    actor,
    `/child_profiles?parent_id=eq.${encode(actor.user.id)}&is_active=eq.true&select=*&order=created_at.asc&limit=1`,
  );
}

export async function getChildProfileForUser(actor: Actor, childId?: string) {
  const child = await getChildProfileRowForUser(actor, childId);
  return child ? toChildProfileView(child) : undefined;
}

export async function createChildProfile(
  actor: Actor,
  input: { displayName: string; avatar?: string; ageBand: AgeBand },
) {
  if (actor.user.accountType !== "parent") throw new Error("Only parent accounts can create child profiles");
  const rows = await userRest<ChildProfile[]>(actor.accessToken, "/child_profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      parent_id: actor.user.id,
      display_name: input.displayName,
      avatar: input.avatar ?? "🧒🏻",
      age_band: input.ageBand,
    }),
  });
  return rows[0];
}

export async function updateChildProfile(
  actor: Actor,
  input: { childId?: string; displayName: string; avatar: string; ageBand: AgeBand },
) {
  if (actor.user.accountType === "teacher") throw new Error("Teachers cannot edit a child's family profile");
  const child = await getChildProfileRowForUser(actor, input.childId);
  if (!child) throw new Error("Child profile was not found");

  const rows = await userRest<ChildProfile[]>(actor.accessToken, `/child_profiles?id=eq.${encode(child.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ display_name: input.displayName, avatar: input.avatar, age_band: input.ageBand }),
  });
  return rows[0] ? toChildProfileView(rows[0]) : undefined;
}

export async function joinChildToClass(actor: Actor, childId: string, joinCode: string) {
  if (actor.user.accountType !== "parent") throw new Error("Only a parent can link a child to a class");
  const rows = await userRest<Array<{ class_id: string }>>(actor.accessToken, "/rpc/link_child_to_class", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ p_child_id: childId, p_join_code: joinCode.trim().toUpperCase() }),
  });
  return rows[0] ?? null;
}

export async function getLearningProgress(actor: Actor, childId?: string) {
  const child = await getChildProfileRowForUser(actor, childId);
  if (!child) return [];
  return userRest<Array<Record<string, unknown>>>(
    actor.accessToken,
    `/learning_progress?child_id=eq.${encode(child.id)}&select=*&order=surah_number.asc`,
  );
}

export async function upsertLearningProgress(
  actor: Actor,
  input: {
    childId?: string;
    surahNumber: number;
    surahName: string;
    memorizedPercent: number;
    reviewPercent?: number;
    status: ProgressStatus;
  },
) {
  const child = await getChildProfileRowForUser(actor, input.childId);
  if (!child) throw new Error("Child profile was not found or is not linked to this account");

  const rows = await userRest<Array<Record<string, unknown>>>(
    actor.accessToken,
    "/learning_progress?on_conflict=child_id,surah_number",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        child_id: child.id,
        surah_number: input.surahNumber,
        surah_name: input.surahName,
        memorized_percent: input.memorizedPercent,
        review_percent: input.reviewPercent ?? 0,
        status: input.status,
        last_activity_at: new Date().toISOString(),
      }),
    },
  );
  return rows[0];
}

const rewardEvents = ["memorize_session", "memory_game", "review_session"] as const;
export type RewardEvent = (typeof rewardEvents)[number];

export async function claimReward(
  actor: Actor,
  input: { childId?: string; event: RewardEvent; sourceKey: string },
) {
  const child = await getChildProfileRowForUser(actor, input.childId);
  if (!child) throw new Error("Child profile was not found");

  await userRest<unknown>(actor.accessToken, "/rpc/claim_learning_reward", {
    method: "POST",
    body: JSON.stringify({
      p_child_id: child.id,
      p_event: input.event,
      p_source_key: input.sourceKey,
    }),
  });
  return getChildProfileForUser(actor, child.id);
}

export async function listReviewEvents(actor: Actor, childId?: string, limit = 20) {
  const child = await getChildProfileRowForUser(actor, childId);
  if (!child) return [];
  const safeLimit = Math.max(1, Math.min(limit, 100));
  return userRest<ReviewEvent[]>(
    actor.accessToken,
    `/review_events?child_id=eq.${encode(child.id)}&select=*&order=reviewed_at.desc&limit=${safeLimit}`,
  );
}

export async function recordReviewEvent(
  actor: Actor,
  input: { childId?: string; surahNumber: number; score?: number; notes?: string },
) {
  const child = await getChildProfileRowForUser(actor, input.childId);
  if (!child) throw new Error("Child profile was not found or is not linked to this account");

  const rows = await userRest<ReviewEvent[]>(actor.accessToken, "/review_events", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      child_id: child.id,
      surah_number: input.surahNumber,
      score: input.score ?? null,
      notes: input.notes?.trim() || null,
      reviewed_at: new Date().toISOString(),
      created_by: actor.user.id,
    }),
  });

  const score = input.score ?? 70;
  const progress = await selectOne<Record<string, unknown>>(
    actor,
    `/learning_progress?child_id=eq.${encode(child.id)}&surah_number=eq.${input.surahNumber}&select=*&limit=1`,
  );
  if (progress) {
    const memorized = Number(progress.memorized_percent ?? 0);
    await userRest<unknown>(actor.accessToken, `/learning_progress?child_id=eq.${encode(child.id)}&surah_number=eq.${input.surahNumber}`, {
      method: "PATCH",
      body: JSON.stringify({
        review_percent: score,
        status: memorized >= 100 && score >= 85 ? "mastered" : "review",
        last_activity_at: new Date().toISOString(),
      }),
    });
  }

  return rows[0];
}

export type AchievementRow = {
  id: string;
  child_id: string;
  slug: string;
  unlocked_at: string;
};

export async function listAchievements(actor: Actor, childId?: string) {
  const child = await getChildProfileRowForUser(actor, childId);
  if (!child) return [];
  return userRest<AchievementRow[]>(
    actor.accessToken,
    `/achievements?child_id=eq.${encode(child.id)}&select=id,child_id,slug,unlocked_at&order=unlocked_at.asc`,
  );
}

export async function listTeacherClasses(actor: Actor) {
  if (actor.user.accountType !== "teacher" && actor.user.accountType !== "admin") {
    throw new Error("Teacher account required");
  }
  return userRest<Array<Record<string, unknown>>>(
    actor.accessToken,
    `/classes?teacher_id=eq.${encode(actor.user.id)}&select=*&order=created_at.desc`,
  );
}

export async function createTeacherClass(actor: Actor, name: string) {
  if (actor.user.accountType !== "teacher" && actor.user.accountType !== "admin") {
    throw new Error("Teacher account required");
  }
  const joinCode = randomBytes(5).toString("hex").toUpperCase();
  const rows = await userRest<Array<Record<string, unknown>>>(actor.accessToken, "/classes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ teacher_id: actor.user.id, name, join_code: joinCode }),
  });
  return rows[0];
}

export async function getTeacherOverview(actor: Actor) {
  if (actor.user.accountType !== "teacher" && actor.user.accountType !== "admin") {
    throw new Error("Teacher account required");
  }
  const classes = await listTeacherClasses(actor);
  const classIds = classes.map(item => item.id).filter((id): id is string => typeof id === "string");
  if (!classIds.length) return { classes, classCount: 0, studentCount: 0, sessionsToday: 0, students: [] };

  const classFilter = classIds.map(id => `class_id.eq.${id}`).join(",");
  const links = await userRest<Array<{ class_id: string; child_id: string }>>(
    actor.accessToken,
    `/class_students?or=(${classFilter})&select=class_id,child_id`,
  );
  const childIds = [...new Set(links.map(link => link.child_id))];
  if (!childIds.length) return { classes, classCount: classes.length, studentCount: 0, sessionsToday: 0, students: [] };

  const childFilter = childIds.map(id => `id.eq.${id}`).join(",");
  const children = await userRest<ChildProfile[]>(
    actor.accessToken,
    `/child_profiles?or=(${childFilter})&is_active=eq.true&select=*&order=display_name.asc`,
  );
  const progressFilter = childIds.map(id => `child_id.eq.${id}`).join(",");
  const progress = await userRest<Array<{ child_id: string; memorized_percent: number; review_percent: number; status: string; last_activity_at: string }>>(
    actor.accessToken,
    `/learning_progress?or=(${progressFilter})&select=child_id,memorized_percent,review_percent,status,last_activity_at`,
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const reviews = await userRest<Array<{ child_id: string; reviewed_at: string }>>(
    actor.accessToken,
    `/review_events?or=(${progressFilter})&reviewed_at=gte.${encode(todayStart.toISOString())}&select=child_id,reviewed_at`,
  );

  const classNameById = new Map(classes.map(item => [String(item.id ?? ""), String(item.name ?? "فصل")]));
  const classesByChild = new Map<string, string[]>();
  for (const link of links) {
    const names = classesByChild.get(link.child_id) ?? [];
    const name = classNameById.get(link.class_id);
    if (name && !names.includes(name)) names.push(name);
    classesByChild.set(link.child_id, names);
  }
  const progressByChild = new Map<string, typeof progress>();
  for (const item of progress) {
    const rows = progressByChild.get(item.child_id) ?? [];
    rows.push(item);
    progressByChild.set(item.child_id, rows);
  }

  const students = children.map(child => {
    const rows = progressByChild.get(child.id) ?? [];
    const memorizedAverage = rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.memorized_percent || 0), 0) / rows.length) : 0;
    const reviewAverage = rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.review_percent || 0), 0) / rows.length) : 0;
    const masteredCount = rows.filter(row => row.status === "mastered").length;
    const lastActivityAt = rows.map(row => row.last_activity_at).filter(Boolean).sort().at(-1) ?? null;
    return {
      id: child.id,
      displayName: child.display_name,
      avatar: child.avatar,
      ageBand: child.age_band,
      points: child.points,
      stars: child.stars,
      classes: classesByChild.get(child.id) ?? [],
      surahCount: rows.length,
      masteredCount,
      memorizedAverage,
      reviewAverage,
      lastActivityAt,
    };
  });

  return {
    classes,
    classCount: classes.length,
    studentCount: children.length,
    sessionsToday: reviews.length,
    students,
  };
}
