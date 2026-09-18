# Master PRD V7 — Abu Al-Azaem Quran EdTech Platform

> **Status:** Approved product baseline  
> **Version:** V7  
> **Audience:** Product, Engineering, Design, QA, Operations  
> **Source of truth:** This document is the highest-level product reference for the platform. If an older PRD, V6 document, implementation note, or conversation conflicts with this document, **V7 wins** unless a later explicitly approved decision supersedes it.

---

## 0. Source hierarchy and implementation rule

### 0.1 Product decision precedence
1. **Master PRD V7**
2. Explicitly approved later decisions
3. Specialized technical docs in `docs/`
4. Legacy V6 documents
5. Existing implementation behavior when it does not conflict with approved requirements

### 0.2 Current implementation baseline
The current canonical application remains the repository's `netlify-app/` stack as documented in `docs/ARCHITECTURE.md`:
- React 19 + Vite
- Supabase Auth
- Supabase PostgreSQL / REST / RPC
- Existing unified Quran corpus and GameEngine layers

The V6 proposal mentioning Next.js / Tailwind / Node.js / FastAPI is considered an **earlier architectural draft**, not a mandatory migration requirement. Product development must extend the current canonical stack unless a separate migration decision is approved.

### 0.3 Core product principle
The platform is not merely a Quran website with games. It is a **B2B2C SaaS operating system for 1-on-1 Quran teachers**, connecting:

**Live learning → homework → parent follow-up → teacher verification → rewards → game ownership → weekly positive competition.**

The teacher is the paying business customer.  
The parent owns the child profile.  
The child receives a simplified, motivating learning experience.

---

# 1. Product vision

## 1.1 Product description
Abu Al-Azaem is a SaaS platform for Quran teachers serving children aged **6–12 years**. It provides:
- individual live Quran lessons,
- scheduling,
- interactive whiteboard,
- task assignment and academic verification,
- parent follow-up,
- points and game economy,
- weekly teacher-scoped leaderboard,
- parent tuition CRM,
- teacher SaaS billing,
- student progress and rewards.

## 1.2 Core value proposition
The core product loop is:

1. Teacher conducts a focused Quran lesson.
2. Teacher assigns a task.
3. Parent follows up at home.
4. Parent submits completion.
5. Teacher tests the child and approves or rejects.
6. Approved work creates rewards.
7. Child spends wallet points on permanent game unlocks.
8. Weekly teacher-scoped competition reinforces consistency.

## 1.3 MVP goal
The MVP must prove that one teacher can manage the complete learning loop without external spreadsheets, scattered chat, or manual reward tracking.

The MVP prioritizes:
- reliability,
- academic accountability,
- simple family UX,
- child motivation,
- clean financial tracking,
- teacher operational efficiency.

---

# 2. Users and roles

## 2.1 Platform Super Admin
The Super Admin operates the SaaS platform.

### Responsibilities
- manage teacher accounts,
- activate, suspend, or restore teachers,
- manage SaaS plans,
- inspect subscription status,
- process exceptional manual activation,
- review operational issues,
- support billing disputes,
- access audit logs according to least-privilege support rules.

### Restrictions
Super Admin is not part of day-to-day teaching and should not casually browse child data without an operational/support reason.

---

## 2.2 Teacher
The teacher is the principal B2B customer.

### Capabilities
- own a Teacher Workspace,
- invite parents,
- connect to existing child profiles through Enrollment,
- define weekly recurring lesson slots,
- reschedule/cancel lessons,
- run live 1-on-1 sessions,
- control the whiteboard,
- assign tasks,
- review submitted tasks,
- approve or reject tasks,
- grant manual bonus points,
- revoke previously granted points through an auditable reversal,
- set tuition rate per Enrollment,
- review parent balances,
- waive billable missed lessons,
- launch games during class regardless of student store lock,
- configure leaderboard rewards/privacy,
- view student progress and reports.

---

## 2.3 Parent
The parent is the **owner of the Child Profile**.

### Capabilities
- create/manage child profile,
- accept teacher Enrollment invites,
- view all child enrollments,
- view schedule,
- switch into Child Mode,
- maintain the 4-digit Parent PIN used to exit Child Mode,
- see assigned tasks,
- mark a task as completed for teacher review,
- read teacher rejection notes,
- see child progress,
- see teacher-specific leaderboards,
- see tuition statement,
- receive in-app/email notifications.

### Restrictions
Parent cannot:
- approve academic completion,
- alter teacher scoring,
- change leaderboard results,
- access teacher-only notes/settings.

---

## 2.4 Child Mode
The child has no independent MVP login.

### Entry
`Parent Login → Select Child → Child Mode`

### Exit
Returning to the parent interface requires a **4-digit PIN**.

### Child experience
- today’s next action,
- upcoming lesson,
- assigned tasks,
- global wallet,
- lifetime achievement progress,
- teacher-specific leaderboard,
- permanently unlocked games,
- rewards and celebration,
- minimal text,
- large touch targets,
- optional voice prompts.

---

# 3. Multi-teacher child ownership model

## 3.1 Ownership
**Parent owns Child Profile.**

A teacher never owns or duplicates the child identity.

## 3.2 Enrollment
A child may study with multiple teachers simultaneously.

The relationship is represented by `Enrollment`, not `Student.TeacherID`.

### Enrollment contains
- StudentID
- TeacherWorkspaceID
- TeacherID
- SessionRate
- Status
- JoinedAt
- AcceptedAt
- Optional teacher-specific metadata

## 3.3 Invite flow
1. Teacher enters parent email.
2. System sends Invite Link.
3. Parent signs in or creates account.
4. Parent selects an existing child or creates a child.
5. Parent accepts the teacher connection.
6. System creates a new Enrollment.
7. No duplicate child profile is created.

---

# 4. MVP live classroom

## 4.1 Lesson model
MVP supports **1-on-1 only**.

### Technology direction
- Video/audio: WebRTC Peer-to-Peer
- Whiteboard synchronization: realtime/WebSocket-capable transport
- No recording

Group lessons and SFU infrastructure are Phase 2.

## 4.2 MVP classroom tools
- video,
- audio,
- Quran/ayah viewer,
- freehand pen,
- highlighter,
- eraser,
- undo,
- teacher laser pointer,
- teacher Lock/Unlock whiteboard,
- teacher quick access to student profile,
- quick manual reward,
- in-class game launch.

## 4.3 Whiteboard permissions
The board is shared.

Teacher controls whether the child can draw/interact.

### Locked
Teacher interaction only.

### Unlocked
Teacher and child may interact.

## 4.4 Whiteboard persistence
Whiteboard state is **ephemeral**.

It is cleared when the session ends.

No classroom recording and no durable whiteboard history in MVP.

## 4.5 Quran rendering requirement
Quran text and Uthmani rendering must never be AI-generated or manually retyped inside game/classroom components.

Approved direction:
- KFGQPC SVG/page assets, **or**
- verified Global Quran API / verified Uthmani source with approved web font.

Until a specific rendering migration is approved, the current repository's unified Quran corpus remains the runtime source of truth. A future source replacement must happen through one centralized adapter/migration, never by creating parallel Quran sources.

---

# 5. Scheduling

## 5.1 MVP schedule
- recurring weekly lesson slots,
- teacher timezone is canonical,
- manual reschedule,
- manual cancellation,
- one student per live session.

## 5.2 Time storage
- canonical timestamps stored in UTC,
- policy evaluation uses Teacher Timezone,
- UI may display localized equivalents to parents,
- leaderboard close and cancellation threshold use Teacher Timezone.

## 5.3 Session statuses
Minimum required statuses:

- `SCHEDULED`
- `COMPLETED`
- `STUDENT_NO_SHOW`
- `TEACHER_NO_SHOW`
- `EARLY_CANCELLATION`
- `LATE_CANCELLATION`
- `RESCHEDULED`
- `CANCELLED`

## 5.4 Late cancellation
Teacher configures a cancellation threshold.

Recommended/default policy:
- under 24 hours before lesson = `LATE_CANCELLATION`
- otherwise = `EARLY_CANCELLATION`

The threshold must be workspace-configurable.

---

# 6. Parent tuition CRM

## 6.1 Product boundary
The platform **does not collect tuition payments from parents in MVP**.

Payments happen off-platform:
- bank transfer,
- wallet transfer,
- cash,
- other direct arrangement.

The system acts as a financial CRM.

## 6.2 Billable session states
A tuition charge is automatically created for:

- `COMPLETED`
- `STUDENT_NO_SHOW`
- `LATE_CANCELLATION`

## 6.3 Non-billable states
No charge for:

- `TEACHER_NO_SHOW`
- `EARLY_CANCELLATION`

## 6.4 Teacher billing override
Teacher may waive a charge for an accepted excuse.

The waiver must be:
- explicit,
- auditable,
- reasoned,
- non-destructive.

The original session status stays historically visible while the billing entry is marked waived.

## 6.5 Statement
Parent statement is based on:

`Billable Sessions × Enrollment.SessionRate`

Payment status is manually changed by teacher after receiving funds off-platform.

Minimum payment states:
- `DUE`
- `PAID`
- `WAIVED`
- `PARTIALLY_PAID` may be added if required by implementation, but is not mandatory for initial MVP.

---

# 7. Teacher SaaS subscription

## 7.1 Billing model
Teachers pay the platform via an **online payment gateway**.

Requirements:
- recurring subscription,
- automatic renewal,
- provider webhook support,
- failed payment state,
- cancellation state,
- grace/suspension behavior,
- plan management by Super Admin.

## 7.2 Manual activation
Manual activation is exceptional only:
- special contracts,
- enterprise/bulk arrangements,
- bank transfers,
- support overrides.

It must never be the primary operational flow.

## 7.3 Provider neutrality
The PRD does not mandate a specific gateway vendor. Engineering may integrate the approved regional/global gateway later without changing product semantics.

---

# 8. Tasks and academic verification

## 8.1 MVP task fields
- Title
- Type
- Points
- DueDate
- TeacherID
- StudentID / Assignment target
- Status
- TeacherNote
- RejectionNote
- CreatedAt
- SubmittedAt
- ReviewedAt

## 8.2 Task types
- `NEW_MEMORIZATION` — حفظ جديد
- `REVIEW` — مراجعة
- `RECITATION` — تلاوة
- `BEHAVIOR` — سلوك

Recurring tasks are out of scope for MVP.

## 8.3 Task state machine
```text
ASSIGNED
   ↓
PARENT_SUBMITTED
   ↓
PENDING_TEACHER_APPROVAL
   ├── APPROVED
   └── REJECTED
```

The parent action does **not** grant points.

## 8.4 Teacher approval
On `APPROVED`:
- reward is written to PointLedger,
- Global Wallet increases,
- Lifetime Points increases,
- current Teacher/Week score increases.

## 8.5 Rejection
Rejection requires a reason.

Teacher may:
- choose quick reason,
- enter custom note.

Example:
`يحتاج لمراجعة الآيات 5–10`

No reward is issued.

## 8.6 Manual reversal
Once a task was approved, later correction must **not** rewrite history by changing it to rejected.

Teacher uses **Revoke / سحب النقاط**.

Requirements:
- reason mandatory,
- new negative ledger transaction,
- transaction type `POINT_REVERSAL`,
- link to original transaction,
- complete audit trail.

---

# 9. Points economy

The platform distinguishes three separate concepts.

## 9.1 Global Wallet
A child-level balance shared across all teachers.

Purpose:
- buy/unlock games.

Behavior:
- increases from approved rewards,
- decreases from game purchases,
- survives teacher changes,
- belongs to the Child Profile.

## 9.2 Lifetime Points
Global cumulative achievement value.

Behavior:
- grows with approved positive learning rewards,
- game purchases do not reduce it,
- used for long-term achievement identity,
- reversal transactions may correct it when a previously approved reward is formally revoked.

## 9.3 Weekly Score
Teacher-scoped competitive score.

Key:
`Student + TeacherWorkspace + Week`

It is not stored as a single global Student field.

### Rules
- approved task rewards contribute to the active teacher week,
- teacher manual reward may contribute if configured as competition-eligible,
- store spending never decreases Weekly Score,
- after week close, old snapshot is immutable,
- a later reversal affects the **new current week** rather than rewriting the closed week.

---

# 10. PointLedger

## 10.1 Source of truth
PointLedger is the authoritative source for all point movement.

Wallet/Lifetime/Weekly aggregates may be cached for performance, but must be reconcilable from ledger entries.

## 10.2 Minimum transaction types
- `TASK_APPROVED`
- `TEACHER_BONUS`
- `GAME_PURCHASE`
- `WEEKLY_REWARD`
- `POINT_REVERSAL`
- `ADMIN_ADJUSTMENT` if needed for support

## 10.3 Ledger fields
Recommended:
- ID
- StudentID
- EnrollmentID nullable where appropriate
- TeacherWorkspaceID nullable where appropriate
- Type
- WalletDelta
- LifetimeDelta
- WeeklyDelta
- SourceType
- SourceID
- ReversalOfTransactionID nullable
- Reason
- CreatedByUserID
- CreatedAt
- Metadata JSON

Ledger rows should be append-only.

---

# 11. Game economy and unlocks

## 11.1 Game Store
Child spends **Global Wallet** points.

## 11.2 Permanent unlock
When purchased, a game is permanently attached to Student Profile.

It remains available:
- after changing teachers,
- across all enrollments,
- without repurchase.

## 11.3 Purchase transaction
Purchase:
- creates `GAME_PURCHASE`,
- decreases Wallet Balance,
- does not reduce Lifetime Points,
- does not reduce Weekly Score.

## 11.4 Teacher-launched games
Teacher classroom launch bypasses Store Lock.

Rules:
- free during class,
- no wallet deduction,
- available as instructional tool even if child has not purchased it,
- does not permanently unlock the game unless a separate purchase occurs.

---

# 12. Weekly leaderboard

## 12.1 Scope
Competition is limited to students in the **same Teacher Workspace**.

No global leaderboard.

## 12.2 Display privacy
Default child display:
- first name,
- first initial of father name,
- avatar.

Example:
`عمر أ.`

No full family identity should be exposed.

## 12.3 Close time
Every Friday at **11:59 PM in Teacher Timezone**.

## 12.4 Snapshot
At close:
- calculate final scores,
- calculate shared ranks,
- save immutable snapshot,
- assign configured podium rewards,
- mark week closed.

## 12.5 Shared position
Tie behavior uses shared competition ranking.

Example:
```text
1. عمر أ. — 350
1. يوسف م. — 350
3. أحمد ع. — 320
```

Both first-place children receive the first-place reward.

## 12.6 Snapshot immutability
Closed leaderboard snapshots never change.

If a teacher reverses an old reward on Saturday:
- old snapshot stays unchanged,
- a negative correction is entered in the new week.

This preserves trust and historical consistency.

## 12.7 Saturday experience
Child UI should visibly celebrate the closed result on Saturday:
- podium,
- reward,
- light animation,
- no excessive visual noise.

---

# 13. Notifications

## 13.1 MVP channels
- In-app
- Email

WhatsApp is Phase 2.

## 13.2 Event categories
Minimum:
- parent invite,
- lesson reminder,
- lesson rescheduled,
- lesson cancelled,
- new task,
- task submitted,
- task approved,
- task rejected,
- points reversed,
- weekly result,
- tuition status change,
- SaaS subscription notices for teacher.

## 13.3 Notification architecture
Notification event and delivery channel should be separated so Phase 2 can add WhatsApp without changing business logic.

---

# 14. User flows

## 14.1 Teacher onboarding
1. Teacher signs up.
2. Chooses SaaS plan.
3. Completes online subscription.
4. Teacher Workspace created/activated.
5. Sets timezone.
6. Sets cancellation window.
7. Sets leaderboard reward rules.
8. Invites first parent.

## 14.2 Parent invite
1. Teacher enters parent email.
2. Invite sent.
3. Parent authenticates.
4. Parent accepts invite.
5. Parent selects/creates child.
6. Enrollment created.
7. SessionRate becomes active.
8. Child appears in teacher workspace.

## 14.3 Schedule flow
1. Teacher opens Enrollment.
2. Creates recurring weekly slot.
3. Future Sessions are generated or resolved from recurrence.
4. Parent receives schedule.
5. Teacher may reschedule/cancel.
6. Cancellation policy evaluates status.

## 14.4 Live lesson
1. Teacher and parent/child join.
2. WebRTC P2P established.
3. Shared whiteboard opens.
4. Teacher locks/unlocks child interaction.
5. Teacher uses Quran viewer.
6. Teacher may grant bonus point.
7. Teacher may launch free in-class game.
8. Session ends.
9. Whiteboard ephemeral state cleared.
10. Session status finalized.

## 14.5 Task flow
1. Teacher creates task.
2. Child sees task in Child Mode.
3. Parent follows up.
4. Parent submits completion.
5. Task becomes Pending Teacher Approval.
6. Teacher tests child.
7. Approve → ledger reward.
8. Reject → required reason, no points.

## 14.6 Reversal flow
1. Teacher opens approved historical task/reward.
2. Presses Revoke.
3. Enters required reason.
4. System creates negative `POINT_REVERSAL`.
5. Audit log records action.
6. Closed leaderboard snapshots are untouched.

## 14.7 Game purchase flow
1. Child opens game store.
2. Sees price and wallet balance.
3. Confirms purchase.
4. Wallet deducted.
5. GameUnlock created.
6. Game remains permanently available.

## 14.8 Weekly leaderboard close
1. Friday 23:59 teacher timezone.
2. System closes active week.
3. Calculates rank including ties.
4. Saves immutable snapshot.
5. Creates weekly reward ledger entries.
6. Sends result notifications.
7. Saturday child sees podium celebration.

---

# 15. Permissions matrix

| Capability | Super Admin | Teacher | Parent | Child Mode |
|---|---:|---:|---:|---:|
| Manage SaaS plans | ✅ | ❌ | ❌ | ❌ |
| Suspend teacher | ✅ | ❌ | ❌ | ❌ |
| Invite parent | ❌ | ✅ | ❌ | ❌ |
| Own child profile | ❌ | ❌ | ✅ | ❌ |
| Accept enrollment | ❌ | ❌ | ✅ | ❌ |
| Create schedule | ❌ | ✅ | ❌ | ❌ |
| Reschedule/cancel lesson | support-only | ✅ | request/limited UI | ❌ |
| Run classroom | ❌ | ✅ | join child side | child side |
| Lock whiteboard | ❌ | ✅ | ❌ | ❌ |
| Create task | ❌ | ✅ | ❌ | ❌ |
| Submit task completed | ❌ | ❌ | ✅ | ❌ |
| Approve/reject task | ❌ | ✅ | ❌ | ❌ |
| Revoke points | support-only | ✅ | ❌ | ❌ |
| Buy game | ❌ | ❌ | via Child Mode | ✅ |
| Launch locked game in class | ❌ | ✅ | ❌ | receives launch |
| View tuition statement | support-only | ✅ | ✅ | ❌ |
| Mark tuition paid | support-only | ✅ | ❌ | ❌ |
| View leaderboard | support-only | ✅ | ✅ | ✅ |

---

# 16. Data model — target logical schema

This is the target logical model. Exact SQL may be normalized further during migration design.

## 16.1 Identity and workspace
### `users`
- id
- role
- name
- email
- status
- timezone
- created_at

### `teacher_workspaces`
- id
- owner_teacher_user_id
- display_name
- timezone
- status
- created_at

### `teacher_settings`
- workspace_id
- late_cancellation_hours
- leaderboard_privacy
- first_place_reward
- second_place_reward
- third_place_reward

---

## 16.2 Family and child
### `student_profiles`
- id
- owner_parent_user_id
- display_name
- father_initial
- birth_year / age band
- avatar_reference
- wallet_balance_cache
- lifetime_points_cache
- created_at

### `parent_student_relations`
- parent_user_id
- student_id
- relationship_type
- is_owner
- created_at

### `family_security`
- parent_user_id
- child_mode_pin_hash
- updated_at

---

## 16.3 Teacher-child relation
### `enrollments`
- id
- workspace_id
- teacher_user_id
- student_id
- session_rate
- status
- accepted_at
- created_at

### `enrollment_invites`
- id
- workspace_id
- invited_email
- invited_by
- token_hash
- expires_at
- accepted_at
- status

---

## 16.4 Scheduling and sessions
### `recurring_schedule_rules`
- id
- enrollment_id
- weekday
- local_start_time
- duration_minutes
- timezone
- active

### `sessions`
- id
- enrollment_id
- scheduled_start_utc
- scheduled_end_utc
- status
- rescheduled_from_session_id
- cancellation_actor
- cancellation_at
- completed_at
- teacher_note

### `session_billing_entries`
- id
- session_id
- enrollment_id
- amount
- status
- auto_charge_reason
- override_reason
- paid_at
- updated_by

---

## 16.5 Tasks
### `tasks`
- id
- workspace_id
- teacher_user_id
- title
- type
- points_reward
- created_at

### `task_assignments`
- id
- task_id
- student_id
- enrollment_id
- due_at
- status
- assigned_at

### `task_submissions`
- id
- assignment_id
- submitted_by_parent_id
- submitted_at
- teacher_reviewed_at
- rejection_note
- teacher_note

---

## 16.6 Points and games
### `point_ledger`
Fields described in Section 10.

### `student_wallets`
- student_id
- wallet_balance
- lifetime_points
- last_reconciled_at

### `game_unlocks`
- id
- student_id
- game_id
- unlocked_at
- price_paid
- ledger_transaction_id

The existing `gameRegistry.js` remains the current game metadata source unless a separate product decision moves catalog metadata to DB.

---

## 16.7 Weekly leaderboard
### `leaderboard_weeks`
- id
- workspace_id
- week_start
- week_end
- timezone
- status
- closed_at

### `leaderboard_snapshots`
- id
- leaderboard_week_id
- student_id
- display_name_snapshot
- avatar_snapshot
- final_score
- rank
- reward_points
- created_at

Snapshots are immutable after close.

---

## 16.8 Teacher SaaS
### `saas_plans`
- id
- name
- price
- billing_interval
- active

### `teacher_subscriptions`
- id
- workspace_id
- plan_id
- provider
- provider_customer_id
- provider_subscription_id
- status
- current_period_start
- current_period_end
- cancel_at_period_end

---

## 16.9 Notifications and audit
### `notifications`
- id
- user_id
- event_type
- title
- body
- read_at
- created_at
- metadata

### `notification_deliveries`
- notification_id
- channel
- status
- provider_reference
- sent_at
- error

### `audit_logs`
- id
- actor_user_id
- action
- entity_type
- entity_id
- before_state
- after_state
- reason
- metadata
- created_at

---

# 17. Product state machines

## 17.1 Enrollment
```text
INVITED → ACTIVE → PAUSED → ENDED
       ↘ DECLINED
```

## 17.2 Task
```text
ASSIGNED
→ PARENT_SUBMITTED
→ PENDING_TEACHER_APPROVAL
→ APPROVED

PENDING_TEACHER_APPROVAL
→ REJECTED
```

Approved history is not rewritten. Corrections use Point Reversal.

## 17.3 Session
```text
SCHEDULED
→ COMPLETED
→ STUDENT_NO_SHOW
→ TEACHER_NO_SHOW
→ EARLY_CANCELLATION
→ LATE_CANCELLATION
→ RESCHEDULED
```

## 17.4 Teacher subscription
```text
TRIAL / PENDING_PAYMENT
→ ACTIVE
→ PAST_DUE
→ SUSPENDED
→ CANCELLED
```

Exact gateway-specific statuses are mapped to these product states.

---

# 18. UI/UX system

## 18.1 Approved brand palette

| Role | Hex | Approx. visual share |
|---|---:|---:|
| Background — Ivory | `#F7F6F0` | 55% |
| Primary — Calm Teal | `#1E6F5C` | 18% |
| Secondary — Soft Sky Blue | `#4EA8DE` | 12% |
| Text — Deep Charcoal | `#2B2D42` | 10% |
| Reward — Warm Gold | `#E9C46A` | 5% |

Special semantic colors such as error red are functional only and not brand colors.

## 18.2 Student UI
For ages 6–12:
- large touch targets,
- rounded shapes,
- concise copy,
- fewer choices per screen,
- visual cues,
- restrained illustrations,
- voice prompt support,
- minimal administrative language,
- clear reward moments.

## 18.3 Parent UI
- simple,
- warm,
- task/status centric,
- clear tuition statement,
- teacher feedback highly visible,
- low cognitive load.

## 18.4 Teacher UI
- professional,
- faster density,
- workflow efficiency over decoration,
- live-classroom controls always reachable,
- dashboard should prioritize today’s lessons, pending reviews, and parent balances.

## 18.5 Super Admin UI
- operational,
- subscription/account management,
- support/audit focused,
- not child-styled.

## 18.6 Accessibility
- normal text contrast target: WCAG AA minimum,
- Quran text should use stronger contrast where feasible,
- keyboard focus visible,
- large tap targets,
- mobile-first student experience,
- animations should not block task completion.

---

# 19. Privacy and child safety

## 19.1 Leaderboard identity
Default:
`First Name + Father's Initial + Avatar`

## 19.2 Data minimization
Child surfaces must not expose:
- parent email,
- phone,
- payment details,
- other families’ private data.

## 19.3 No recording
MVP live lessons are not recorded.

## 19.4 Teacher data isolation
A teacher can access child data only through their own active Enrollment context. They must not see another teacher's:
- session records,
- private notes,
- billing relationship,
- leaderboard history.

Global child wallet/unlocks may be shown only to the extent required for the child experience, not as access to another teacher’s private activity.

---

# 20. MVP scope

## 20.1 Must ship
### Teacher
- SaaS onboarding/subscription
- workspace
- parent invites
- multi-teacher Enrollment model
- recurring weekly schedule
- manual reschedule/cancel
- 1-on-1 WebRTC lesson
- shared whiteboard
- task creation
- pending review queue
- approve/reject
- rejection reason
- manual bonus
- point reversal
- tuition CRM
- leaderboard settings/results
- in-class game launch

### Parent
- account/invite acceptance
- child ownership
- child mode switch
- PIN exit
- schedule
- task completion submission
- teacher feedback
- tuition statement
- progress
- leaderboard

### Child
- next action
- task list
- global wallet
- lifetime points/progress
- games/store
- permanent unlocks
- teacher-specific leaderboard
- podium celebration

### Platform
- Super Admin
- teacher subscription billing
- in-app/email notifications
- audit trail

---

# 21. Phase 2 / explicitly out of MVP

- group classes,
- SFU media architecture,
- WhatsApp notifications,
- screen sharing,
- classroom text chat,
- recurring tasks,
- global leaderboard,
- parent tuition payment gateway,
- classroom recording,
- durable whiteboard playback/history,
- advanced multi-class cohorts,
- enterprise school hierarchy,
- complex assignment automation.

---

# 22. Acceptance criteria — product critical

## 22.1 Multi-teacher identity
- One Child Profile can have 2+ active Enrollments.
- No duplicate child is required.
- Teacher A cannot see Teacher B private enrollment data.

## 22.2 Task approval
- Parent submission never grants points.
- Approval grants points exactly once.
- Rejection requires a reason.
- Re-approving the same reward cannot double-credit.

## 22.3 Reversal
- Approved task history remains approved.
- Revoke creates new negative ledger row.
- Reason is mandatory.
- Closed leaderboard snapshot does not change.

## 22.4 Wallet/game
- Purchases reduce Global Wallet only.
- Lifetime Points remain unchanged by purchase.
- Game remains unlocked permanently.

## 22.5 Leaderboard
- Scores are scoped by Teacher Workspace.
- Friday 23:59 uses Teacher Timezone.
- Ties share position.
- Shared winners receive the same configured reward.
- Closed snapshot is immutable.

## 22.6 Session billing
- Completed = charge.
- Student no-show = charge.
- Late cancellation = charge.
- Teacher no-show = no charge.
- Early cancellation = no charge.
- Teacher can waive with audit reason.

## 22.7 Child Mode
- Parent can enter Child Mode.
- Parent functions are unavailable in Child Mode.
- Exit requires 4-digit PIN.

## 22.8 Classroom
- 1 teacher + 1 child only in MVP.
- Whiteboard can be locked by teacher.
- Teacher can launch game without store ownership.
- Ending session clears ephemeral board state.

---

# 23. Engineering invariants

The following rules must not be violated during implementation:

1. Do not create a second Quran text source inside components.
2. Do not create a parallel point system outside PointLedger.
3. Do not derive leaderboard from wallet balance.
4. Do not make Student belong to one Teacher directly.
5. Do not duplicate Child Profile on new teacher invite.
6. Do not mutate closed leaderboard history.
7. Do not modify an approved reward destructively; reverse it.
8. Do not charge tuition based on arbitrary UI flags; use finalized Session Status + billing rule.
9. Do not couple parent tuition CRM to teacher SaaS subscription billing.
10. Do not make manual Super Admin subscription activation the standard teacher payment path.
11. Do not allow teacher classroom game launches to consume child wallet.
12. Do not persist whiteboard session state in MVP.
13. Do not expose full child names by default in leaderboards.

---

# 24. Metrics for MVP validation

Recommended product metrics:
- Teacher activation: first accepted Enrollment
- First-value event: first completed live lesson + approved task
- Weekly active teachers
- Parent task submission rate
- Teacher approval turnaround time
- Child task approval rate
- Weekly leaderboard participation
- Wallet earn/spend rate
- Game unlock conversion
- Teacher retention
- SaaS payment success/failure rate
- Lesson completion/no-show/cancellation distribution

These metrics measure the core loop, not vanity pageviews.

---

# 25. Product definition of done

The MVP is product-valid when a new teacher can, without external spreadsheets:

1. subscribe,
2. invite a parent,
3. connect to an existing/new child,
4. create a weekly schedule,
5. conduct a 1-on-1 Quran session,
6. assign a task,
7. receive a parent submission,
8. approve/reject after testing,
9. issue correct point transactions,
10. let the child buy a permanent game unlock,
11. close an immutable weekly leaderboard,
12. produce an accurate parent tuition statement,
13. repeat the loop the next week.

That complete loop is the primary definition of product readiness.
