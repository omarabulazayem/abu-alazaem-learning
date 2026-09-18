# V7 Gap Analysis — Current Platform vs Master PRD

> **Status:** Implementation planning baseline  
> **Product authority:** `docs/MASTER_PRD_V7.md`  
> **Technical baseline reviewed:** current `main` repository + live Supabase project `Abul-Azayem Learning Platform`

---

# 1. Executive summary

The current application already has a useful learning/gamification foundation, but it is **not yet the V7 SaaS product**.

The current platform is strongest in:
- parent/teacher authentication,
- child profiles,
- Quran corpus access,
- memorization/review progress,
- Quran game runtime,
- game telemetry,
- achievements,
- reward history,
- teacher read-only/student-progress views,
- CMS/Tafsir foundations,
- UI v4 and brand identity.

The largest V7 gaps are:
- TeacherWorkspace tenancy,
- Enrollment replacing class-code ownership logic,
- parent invite flow,
- recurring scheduling and lesson lifecycle,
- tuition CRM,
- teacher SaaS subscriptions,
- task assignment + teacher approval workflow,
- append-only V7 PointLedger with negative reversals,
- Global Wallet vs Lifetime Points vs Weekly Score separation,
- permanent GameUnlock ownership,
- weekly leaderboard snapshots,
- 4-digit Child Mode exit PIN,
- notifications,
- AuditLog,
- real WebRTC classroom and shared whiteboard.

The recommended strategy is **migrate the domain model in layers**, preserving the working Quran/GameEngine systems instead of rebuilding them.

---

# 2. Current production/data baseline

## 2.1 Canonical application
Current source of truth for the active product:
- `netlify-app/`
- React + Vite
- Supabase Auth
- Supabase PostgreSQL / REST / RPC

## 2.2 Current public database tables observed

The live Supabase project currently contains:

- `profiles`
- `child_profiles`
- `classes`
- `class_students`
- `learning_progress`
- `review_events`
- `achievements`
- `reward_ledger`
- `game_sessions`
- `game_ayah_events`
- `game_progress`
- `review_queue`
- Tafsir tables
- CMS compatibility tables

The following V7 target-domain tables are **not currently present**:
- `teacher_workspaces`
- `teacher_settings`
- `parent_student_relations`
- `family_security`
- `enrollments`
- `enrollment_invites`
- `recurring_schedule_rules`
- V7 lesson `sessions`
- `session_billing_entries`
- `tasks`
- `task_assignments`
- `task_submissions`
- V7 `point_ledger`
- `student_wallets`
- `game_unlocks`
- `leaderboard_weeks`
- `leaderboard_snapshots`
- `saas_plans`
- `teacher_subscriptions`
- `notifications`
- `notification_deliveries`
- `audit_logs`

---

# 3. Gap matrix

| Domain | Current state | V7 requirement | Gap severity |
|---|---|---|---|
| Authentication | Parent/Teacher/Admin profiles exist | Same roles + Child Mode scope | Low |
| Child ownership | `child_profiles.parent_id` | Parent owns child profile | Mostly aligned |
| Multi-parent relation | Single `parent_id` only | Explicit parent-child relation model | Medium |
| Teacher relation | `classes + class_students` join code | `Enrollment` per TeacherWorkspace | Critical |
| Teacher tenancy | Teacher owns classes directly | TeacherWorkspace + settings | Critical |
| Parent invitation | Parent enters join code | Teacher email invite link | Critical |
| Scheduling | No V7 schedule domain | Recurring weekly slots + reschedule/cancel | Critical |
| Lesson billing | None | Session-status-based tuition CRM | Critical |
| Tasks | No V7 task workflow | Parent submit → teacher approve/reject | Critical |
| Rewards | Positive-only `reward_ledger` | Append-only signed deltas + reversals | Critical |
| Wallet | `child_profiles.points` | Global Wallet balance | Critical |
| Lifetime Points | Not separate | Independent cumulative metric | High |
| Weekly score | Not teacher/week scoped | Enrollment/workspace/week score | Critical |
| Game Store | Games are registry/live-state based | Wallet purchase + permanent unlock | Critical |
| Teacher classroom game | Teacher preview exists | Teacher launch bypasses store lock | Partial |
| Leaderboard | No immutable weekly snapshot model | Friday close + shared rank + rewards | Critical |
| Child Mode exit | Parent password re-auth | 4-digit parent PIN | High |
| Notifications | None | In-app + Email | High |
| Audit trail | No generic audit log | Required for reversals/waivers/admin | High |
| Live video | None | WebRTC P2P 1-on-1 | Critical |
| Shared whiteboard | None | Ephemeral board + teacher lock | Critical |
| Quran source | Central corpus exists | Single verified source | Aligned foundation |
| Game telemetry | Strong GameEngine foundation | Preserve | Good |
| Brand/UI | V4 + approved palette | Role-specific UX | Good foundation |

---

# 4. Important implementation conflicts

## 4.1 Class model vs Enrollment model
Current teacher relationship is:

`Teacher → Class → class_students → Child`

V7 requires:

`TeacherWorkspace → Enrollment → Child`

The existing class model should not be deleted immediately because it is used by the current teacher portal and RLS helpers. It should be treated as **legacy compatibility** during migration.

### Required transition
1. Introduce TeacherWorkspace.
2. Backfill one workspace per teacher.
3. Introduce Enrollment.
4. Backfill Enrollment from existing class_students relationships where possible.
5. Update teacher APIs/RLS to use Enrollment.
6. Retire class join code as the primary onboarding method.
7. Keep class/group concept only if later product needs it.

---

## 4.2 Existing reward ledger cannot become V7 PointLedger unchanged
Current `reward_ledger`:
- only non-negative points,
- only non-negative stars,
- unique by child/source/source_key,
- directly increments `child_profiles.points`,
- used by current game rewards.

V7 requires:
- signed deltas,
- negative reversals,
- WalletDelta,
- LifetimeDelta,
- WeeklyDelta,
- source linkage,
- Enrollment/Workspace context,
- append-only accounting.

### Decision
Do **not** destructively mutate the existing table in one step.

Recommended:
- create new `point_ledger`,
- create `student_wallets`,
- migrate/copy historical rewards into canonical ledger entries,
- temporarily dual-write or adapt reward RPCs,
- switch UI reads,
- retire `child_profiles.points` as authority after reconciliation.

---

## 4.3 Game rewards currently grant points directly from gameplay
Current GameEngine completion can produce reward ledger entries.

V7 distinguishes:
- teacher-approved academic task rewards,
- game purchases,
- teacher bonus,
- weekly rewards,
- reversals.

Game performance may still produce progression/achievements, but its relationship to spendable wallet must be explicitly controlled.

Until a later product decision changes it, migration should preserve current game behavior while making all point movement flow through the new V7 ledger.

---

## 4.4 Child Mode currently uses parent password, not PIN
Current behavior:
- child mode stored in localStorage,
- exit requires parent password re-authentication.

V7 behavior:
- exit requires 4-digit PIN.

Migration needs:
- hashed PIN storage,
- setup/reset flow in Parent UI,
- verification RPC/server-side check,
- no plaintext PIN in browser storage.

---

# 5. Current components that can be preserved

## Strong reusable foundations
- `quranCorpus.js`
- `surahCatalog.js`
- `gameRegistry.js`
- `gameEngine.js`
- game telemetry tables
- `review_queue`
- `learning_progress`
- existing child profile identity/customization
- Supabase authentication
- UI v4 component system
- Brand identity layer
- teacher game reports
- CMS compatibility layer
- Tafsir approval gates

These should be integrated into V7, not replaced.

---

# 6. Current components that need domain migration

## TeacherPortal
Current:
- classes,
- class join code,
- linked students,
- review scoring.

Target:
- workspace dashboard,
- enrollments,
- pending task reviews,
- today’s sessions,
- tuition balances,
- scheduling,
- lesson controls.

## FamilyPage
Current:
- create/edit child,
- choose active child,
- join via class code.

Target:
- owned child profiles,
- teacher invitations,
- active enrollments,
- schedule,
- tasks,
- tuition,
- PIN management.

## ChildHub
Current:
- local child mode,
- points/stars,
- games/memorize/review,
- parent-password exit.

Target:
- PIN exit,
- wallet,
- lifetime progress,
- next lesson,
- assigned tasks,
- teacher-specific leaderboard,
- permanent unlocked games.

---

# 7. Security/RLS migration requirements

V7 makes Enrollment the authorization boundary between teacher and child.

New helper concepts should replace class-based checks:
- `is_child_owner(child_id)`
- `is_active_enrollment_teacher(enrollment_id)`
- `teacher_can_access_child(child_id, workspace_id)`
- `parent_can_access_child(child_id)`
- `user_owns_workspace(workspace_id)`

Critical rule:
A teacher must never gain access to another teacher's:
- session history,
- tuition records,
- private notes,
- task reviews,
- leaderboard snapshots.

Global child wallet/game unlock state must be exposed only through narrowly scoped policies/RPCs.

---

# 8. Migration risk priorities

## P0 — must be solved before broad feature work
1. Enrollment/ownership model
2. V7 PointLedger accounting
3. RLS isolation
4. session/timezone model
5. task approval idempotency
6. immutable leaderboard close logic

## P1
7. tuition billing automation
8. game unlock wallet transactions
9. invitation security
10. child PIN
11. notifications/audit

## P2
12. WebRTC classroom
13. whiteboard synchronization
14. SaaS payment gateway
15. richer admin operations

---

# 9. Recommended migration philosophy

- Additive migrations first.
- Preserve working game/Quran systems.
- Avoid renaming/deleting legacy tables until new paths are live.
- Use idempotent RPCs for financial/reward mutations.
- Use append-only accounting for points and audit.
- Backfill before switching reads.
- Validate RLS after every domain migration.
- Feature-flag or route-gate unfinished V7 modules.
- Do not expose partially migrated financial functionality.

---

# 10. Definition of gap-closure

The repository becomes V7-aligned when:
- child identity is parent-owned and multi-teacher through Enrollment,
- teacher access is workspace/enrollment scoped,
- tasks require teacher approval before reward,
- every spend/reward/reversal is in PointLedger,
- wallet/lifetime/weekly totals are separated,
- games can be purchased permanently,
- leaderboard weeks close immutably,
- scheduling generates billable session history,
- tuition statements reconcile to session statuses,
- child mode uses PIN,
- teacher SaaS subscription state is enforceable,
- live 1-on-1 classroom operates with ephemeral whiteboard.
