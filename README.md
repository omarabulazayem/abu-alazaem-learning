# أبو العزايم للحفظ الممتع

منصة عربية لحفظ ومراجعة القرآن للأطفال، مع حساب أسرة، وضع طفل، لوحة معلم، ألعاب تعليمية، مراجعة ذكية، نقاط ونجوم وإنجازات.

## النسخة الحالية

المسار الأساسي الحالي هو `netlify-app/`:

- React 19 + Vite
- Supabase Auth
- Supabase PostgreSQL / REST / RPC
- GameEngine موحد للجلسات والإجابات والتقدم والمراجعة والمكافآت
- Quran corpus مولد مركزيًا ولا تُكتب الآيات داخل مكونات الألعاب

Netlify يبني `netlify-app` مباشرة. GitHub Pages يبني نفس التطبيق كمسار نشر ثانوي.

## تشغيل نسخة Netlify محليًا

```bash
cd netlify-app
npm install
npm run check
npm test
npm run build
npm run dev
```

تحتاج نسخة التطوير إلى متغيرات Supabase العامة المناسبة (URL + publishable/anon key). لا تضع service-role key داخل Vite أو المتصفح.

## بنية المستودع

- `netlify-app/`: المصدر الأساسي للواجهة الحالية والألعاب.
- `patches-live/supabase/migrations/`: سجل migrations الخاصة بـSupabase.
- `source.tgz + patches-live/`: مسار full-stack قديم/ثانوي يستخدمه bootstrap الخاص بـRailway/Docker؛ ليس المصدر الأساسي لواجهة Netlify.
- `docs/ARCHITECTURE.md`: شرح تفصيلي لمصادر الحقيقة ومسارات النشر.
- `PROJECT_STATUS.md`: ملخص الحالة الحالية.

## قواعد مهمة

- `netlify-app/src/gameRegistry.js` هو المصدر الوحيد لتعريف وتوفر الألعاب.
- اللعبة لا تظهر للطفل إلا إذا كانت `status: live`.
- `quranCorpus.js` هو API قراءة corpus القرآن الكامل، و`surahCatalog.js` للـmetadata البسيطة للسور.
- لا تعدل نص القرآن داخل Components، ولا تنشئ مصدر قرآن أو GameEngine أو Rewards/Review system موازٍ.

للتفاصيل: [Architecture](docs/ARCHITECTURE.md).
