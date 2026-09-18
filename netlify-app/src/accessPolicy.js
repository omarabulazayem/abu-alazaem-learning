// Central access policy.
// Learning/content routes are open to teachers by default.
// Only account-management/child-identity routes are explicitly restricted.
const TEACHER_RESTRICTED_EXACT = new Set([
  "/family",
  "/child",
  "/room",
]);

export function isTeacherRestrictedRoute(path) {
  return TEACHER_RESTRICTED_EXACT.has(path);
}

export function isTeacher(user) {
  return user?.accountType === "teacher";
}

export function canTeacherPreview(user) {
  return isTeacher(user);
}

export const TEACHER_MANAGE_NAV_ITEMS = [
  ["لوحة المعلم", "/teacher"],
  ["تقارير الألعاب", "/teacher/game-reports"],
  ["الدعوات", "/teacher/invites"],
  ["الطلاب", "/teacher/students"],
  ["المهام", "/teacher/tasks"],
  ["الجدول", "/teacher/schedule"],
  ["الاستحقاقات", "/teacher/billing"],
];

export const TEACHER_PREVIEW_NAV_ITEMS = [
  ["الرئيسية", "/"],
  ["القرآن", "/quran"],
  ["الحفظ", "/memorize"],
  ["المراجعة", "/review"],
  ["الألعاب", "/games"],
  ["الإنجازات", "/achievements"],
  ["التحديات", "/challenges"],
];

// Kept for existing imports and compatibility checks.
export const TEACHER_NAV_ITEMS = [...TEACHER_PREVIEW_NAV_ITEMS, ...TEACHER_MANAGE_NAV_ITEMS];
