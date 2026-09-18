# V7 Implementation Roadmap

> **Authority:** `docs/MASTER_PRD_V7.md`  
> **Companion:** `docs/V7_GAP_ANALYSIS.md`

The implementation is intentionally phased to avoid breaking the working Quran/game platform.

---

# Phase 0 — Foundation freeze and migration safety

## Goal
Create a safe baseline before changing domain ownership or accounting.

## Deliverables
- keep Master PRD V7 as authority,
- document current schema,
- add tests for V7 invariants,
- establish migration naming/order,
- verify production RLS/advisors before and after each schema phase,
- prohibit new features that expand legacy `classes/class_students` or `child_profiles.points` dependencies.

## Exit criteria
- CI protects architecture invariants,
- no new code treats legacy class links or points field as future source of truth.

---

# Phase 1 — Identity, Workspace, Enrollment

## Database
Create:
- `teacher_workspaces`
- `teacher_settings`
- `parent_student_relations`
- `enrollments`
- `enrollment_invites`
- `family_security`
- `audit_logs`

## Migration
- one workspace per existing teacher,
- existing `child_profiles.parent_id` becomes initial owner relation,
- existing class/student links may backfill Enrollment records,
- no destructive removal of classes yet.

## Backend/RPC
- create invite,
- accept invite,
- list parent child enrollments,
- list teacher enrollments,
- workspace-scoped teacher access helpers,
- PIN set/verify RPC.

## UI
- replace “join class code” with invitations/enrollment management,
- teacher students list reads Enrollments,
- family page shows linked teachers,
- Child Mode exits with PIN.

## Exit criteria
A child can be connected to two teachers without duplicate profiles and each teacher sees only their own enrollment context.

---

# Phase 2 — V7 Point Accounting + Wallet + Game Unlocks

## Database
Create:
- `point_ledger`
- `student_wallets`
- `game_unlocks`

## Accounting model
Signed deltas:
- WalletDelta
- LifetimeDelta
- WeeklyDelta

Transaction types:
- TASK_APPROVED
- TEACHER_BONUS
- GAME_PURCHASE
- WEEKLY_REWARD
- POINT_REVERSAL
- ADMIN_ADJUSTMENT

## Migration
- import historical positive `reward_ledger` rows into PointLedger,
- reconcile child current point totals,
- preserve legacy ledger for traceability during transition.

## RPC
- grant teacher bonus,
- reverse transaction,
- purchase game,
- get wallet,
- check game ownership.

All mutation RPCs must be idempotent.

## Game integration
- GameEngine remains runtime/telemetry authority,
- game access layer checks permanent unlock,
- teacher preview/classroom launch bypasses Store Lock,
- purchase never reduces Lifetime Points or Weekly Score.

## Exit criteria
No child-facing wallet value depends on direct mutation of `child_profiles.points`.

---

# Phase 3 — Tasks and Teacher Approval

## Database
Create:
- `tasks`
- `task_assignments`
- `task_submissions`

## Task types
- NEW_MEMORIZATION
- REVIEW
- RECITATION
- BEHAVIOR

## State machine
ASSIGNED → PARENT_SUBMITTED → PENDING_TEACHER_APPROVAL → APPROVED/REJECTED

## RPC
- teacher assign task,
- parent submit completion,
- teacher approve,
- teacher reject with mandatory reason,
- revoke approved reward via PointLedger.

## UI
Teacher:
- create task,
- pending reviews queue,
- approve/reject.

Parent:
- current tasks,
- mark completed,
- teacher feedback.

Child:
- “what should I do now?” task card.

## Exit criteria
Parent submission cannot grant points; teacher approval grants exactly once.

---

# Phase 4 — Scheduling + Session Lifecycle + Tuition CRM

## Database
Create:
- `recurring_schedule_rules`
- lesson `sessions`
- `session_billing_entries`

## Session statuses
- SCHEDULED
- COMPLETED
- STUDENT_NO_SHOW
- TEACHER_NO_SHOW
- EARLY_CANCELLATION
- LATE_CANCELLATION
- RESCHEDULED
- CANCELLED

## Rules
- UTC storage,
- Teacher Timezone policy evaluation,
- configurable late-cancel threshold,
- SessionRate from Enrollment,
- bill COMPLETED/STUDENT_NO_SHOW/LATE_CANCELLATION,
- do not bill TEACHER_NO_SHOW/EARLY_CANCELLATION,
- teacher waiver requires reason and audit log.

## UI
Teacher:
- weekly schedule,
- reschedule/cancel,
- finalize status,
- balances,
- waive charge,
- mark paid.

Parent:
- schedule,
- statement.

## Exit criteria
Parent statement can be reconstructed solely from finalized sessions + billing entries.

---

# Phase 5 — Weekly Leaderboard

## Database
Create:
- `leaderboard_weeks`
- `leaderboard_snapshots`

## Logic
- scope = TeacherWorkspace,
- score = WeeklyDelta context from PointLedger,
- Friday 23:59 Teacher Timezone,
- shared rank,
- immutable close,
- reward ledger entries,
- later reversal affects new week only.

## Automation
Use scheduled server-side execution appropriate to the production stack.

## UI
- Teacher standings/configuration,
- Parent view,
- Child leaderboard,
- Saturday podium.

## Exit criteria
Historical winner/rank never changes after week closure.

---

# Phase 6 — Notifications + Audit + Operational Admin

## Notifications
Create:
- `notifications`
- `notification_deliveries`

Channels:
- in-app,
- email.

Events:
- invitation,
- lesson reminder/change,
- new task,
- submission,
- approval/rejection,
- reversal,
- weekly result,
- tuition status,
- SaaS subscription.

## Audit
Audit:
- point reversal,
- session billing waiver,
- subscription manual override,
- critical admin changes.

## Super Admin
- teacher account status,
- plans,
- subscription visibility,
- manual exceptional activation,
- audit lookup.

---

# Phase 7 — Teacher SaaS Subscription

## Database
Create:
- `saas_plans`
- `teacher_subscriptions`

## Integration
- online gateway,
- recurring billing,
- auto renewal,
- webhook events,
- ACTIVE / PAST_DUE / SUSPENDED / CANCELLED mapping.

## Access enforcement
Workspace product access must reflect subscription state with a defined grace path.

## Note
Payment provider remains an implementation decision until explicitly selected.

---

# Phase 8 — 1-on-1 Live Classroom

## Media
- WebRTC Peer-to-Peer,
- 1 teacher + 1 child,
- no recording.

## Whiteboard
- Quran viewer,
- pen,
- highlighter,
- eraser,
- undo,
- teacher laser pointer,
- Lock/Unlock child input,
- ephemeral state only.

## Classroom tools
- child profile context,
- quick teacher bonus,
- launch game without Store Lock,
- finalize lesson status.

## Exit criteria
A teacher can conduct the complete lesson without leaving the classroom for core actions.

---

# Phase 9 — Role-specific UX completion

## Student
- next lesson,
- active task,
- wallet,
- lifetime progress,
- unlocked games,
- leaderboard,
- celebration.

## Parent
- children,
- teachers/enrollments,
- schedule,
- task follow-up,
- feedback,
- statement,
- PIN/security.

## Teacher
- today,
- upcoming sessions,
- pending reviews,
- student records,
- balances,
- leaderboard.

## Super Admin
- subscriptions,
- teachers,
- support/audit.

---

# Recommended engineering sequence

```text
Workspace/Enrollment
        ↓
V7 PointLedger
        ↓
Tasks
        ↓
Scheduling + Billing
        ↓
Leaderboard
        ↓
Notifications/Admin
        ↓
SaaS Payments
        ↓
Live Classroom
        ↓
Full UX polish
```

This order intentionally resolves identity and accounting **before** building workflows that depend on them.

---

# Features that must NOT be built before prerequisites

- Do not build leaderboard before WeeklyDelta/Workspace accounting.
- Do not build tuition dashboard before Session lifecycle.
- Do not build game store before Global Wallet and GameUnlock.
- Do not build teacher task rewards on legacy reward_ledger.
- Do not build multi-teacher dashboards on class_students.
- Do not build billing webhooks before subscription state model.
- Do not build classroom controls against legacy class ownership.

---

# Delivery policy

Each phase should ship through:
1. additive SQL migration,
2. RLS policies/RPCs,
3. automated tests,
4. API/client integration,
5. UI,
6. security/performance advisor review,
7. production migration,
8. post-deploy verification.

No phase is considered complete because UI exists alone.
