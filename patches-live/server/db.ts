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

export async function getChildProfileForUser(actor: Actor, childId?: string) {
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
  const child = await getChildProfileForUser(actor, input.childId);
  if (!child) throw new Error("Child profile was not found");

  const rows = await userRest<ChildProfile[]>(actor.accessToken, `/child_profiles?id=eq.${encode(child.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ display_name: input.displayName, avatar: input.avatar, age_band: input.ageBand }),
  });
  return rows[0];
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
  const child = await getChildProfileForUser(actor, childId);
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
  const child = await getChildProfileForUser(actor, input.childId);
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
  const child = await getChildProfileForUser(actor, input.childId);
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
  let studentCount = 0;
  if (classIds.length) {
    const classFilter = classIds.map(id => `class_id.eq.${id}`).join(",");
    const links = await userRest<Array<{ child_id: string }>>(
      actor.accessToken,
      `/class_students?or=(${classFilter})&select=child_id`,
    );
    studentCount = new Set(links.map(link => link.child_id)).size;
  }
  return { classes, classCount: classes.length, studentCount };
}
