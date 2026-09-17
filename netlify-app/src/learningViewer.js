import {
  getActiveChildId,
  getCurrentUser,
  listChildren,
  setActiveChildId,
} from "./api.js";

export async function loadLearningViewer() {
  const user = await getCurrentUser();
  if (!user) return { user: null, child: null, teacherPreview: false };
  if (user.accountType === "teacher") {
    return { user, child: null, teacherPreview: true };
  }
  const kids = await listChildren(user);
  let activeId = getActiveChildId();
  const child = kids.find(k => k.id === activeId) || kids[0] || null;
  if (child && child.id !== activeId) {
    activeId = child.id;
    setActiveChildId(activeId);
  }
  return { user, child, teacherPreview: false };
}

export function learningActorReady(viewer) {
  return Boolean(viewer?.teacherPreview || viewer?.child?.id);
}
