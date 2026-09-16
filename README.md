# أبو العزايم للحفظ الممتع

منصة تعليمية عربية للأطفال مبنية بـ React + Vite + Express + tRPC + Drizzle + MySQL.

## الحالة الحالية

المشروع حاليًا Prototype متقدم للواجهة مع أجزاء Backend حقيقية للحسابات وملف الطفل وتقدم الحفظ والمكافآت. بعض الصفحات ما زالت تعتمد على بيانات ثابتة أو `localStorage`، وبعض الوظائف ما زالت Placeholder ولم تُربط بقاعدة البيانات.

راجع الملف [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) لمعرفة ما يعمل وما يحتاج استكمالًا.

## المتطلبات

- Node.js 22+
- pnpm 10+
- MySQL عند تجربة الوظائف التي تحتاج قاعدة بيانات

## التشغيل محليًا على Windows / VS Code

```powershell
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install
Copy-Item .env.example .env
pnpm dev
```

ثم افتح:

```text
http://localhost:3000
```

`pnpm dev` أصبح Cross-platform ويعمل على Windows/macOS/Linux.

## فحص المشروع

```powershell
pnpm check
pnpm test
pnpm build
```

## قاعدة البيانات

بعد ضبط `DATABASE_URL` في `.env`:

```powershell
pnpm db:push
```

## ملاحظة مهمة عن تسجيل الدخول

نظام تسجيل الدخول الحالي مأخوذ من بيئة Manus ويعتمد على `VITE_APP_ID` و`OAUTH_SERVER_URL` و`VITE_OAUTH_PORTAL_URL`. لذلك تشغيل الواجهة محليًا ممكن، لكن تسجيل الدخول والـ protected APIs يحتاجان هذه البيئة أو استبدال نظام المصادقة بنظام مستقل للمشروع.

## أسلوب العمل المقترح

- `main`: نسخة مستقرة.
- فرع لكل تطوير جديد.
- Pull Request لكل مجموعة تغييرات مهمة.
- تشغيل محلي بـ `pnpm dev` لمشاهدة التغييرات فور حفظ الملفات.
- لاحقًا ربط المستودع بـ Railway للحصول على Preview/Deploy مباشر من GitHub.
