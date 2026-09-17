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

export const TEACHER_NAV_ITEMS = [
  ["الرئيسية", "/"],
  ["القرآن", "/quran"],
  ["الحفظ", "/memorize"],
  ["المراجعة", "/review"],
  ["الألعاب", "/games"],
  ["الإنجازات", "/achievements"],
  ["التحديات", "/challenges"],
  ["لوحة المعلم", "/teacher"],
  ["الفصول", "/teacher/classes"],
  ["الطلاب", "/teacher/students"],
];
