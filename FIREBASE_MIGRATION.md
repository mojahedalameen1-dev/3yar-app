# ترحيل تطبيق عيار إلى Firebase المجاني

يستخدم التطبيق الآن:

- Firebase Authentication للمستخدمين.
- Cloud Firestore في مشروع `yar-3yar-free` للبيانات.
- Vercel Blob الخاص للصور الجديدة.
- Vercel Functions للعمليات الإدارية وعرض الملفات الخاصة.

المشروع يعمل على Firebase Spark وVercel Hobby ولا ينشر Cloud Functions أو Firebase Storage.

## الإعداد المحلي

انسخ `.env.example` إلى `.env.local` وأدخل إعدادات Firebase Web App. احتفظ بمفتاح Supabase وملف Firebase Service Account محليًا فقط؛ كلاهما مستبعد من Git.

## ترحيل البيانات والتحقق

```bash
npm run migrate:firebase
node scripts/verify-migration.mjs
```

أداة النقل قابلة لإعادة التشغيل، وتحافظ على UID القديم والعلاقات، كما تنقل صلاحية `admin` من الملف الشخصي إلى Firebase custom claims. كلمات مرور Supabase لا يمكن نسخها؛ يستخدم أصحاب الحسابات «نسيت كلمة المرور» لإنشاء كلمة مرور Firebase جديدة.

## إعداد Vercel

تُضاف متغيرات `VITE_FIREBASE_*` العامة إلى Production. يُحفظ JSON الخاص بحساب الخدمة في متغير خادم مشفّر باسم `FIREBASE_SERVICE_ACCOUNT_JSON`، وينشئ ربط Vercel Blob المتغير `BLOB_READ_WRITE_TOKEN` تلقائيًا.

لا تضع الأسرار في متغير يبدأ بـ `VITE_` لأنها تصبح ظاهرة للمتصفح.

## قواعد Firestore

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project yar-3yar-free
```

## التحقق قبل إيقاف Supabase

تحقق من تسجيل الدخول، واستعادة كلمة المرور، والسيارات، والمهام، والسجلات، والعداد، والوثائق، وروابط المشاركة، ولوحة الإدارة. لا تحذف مصدر Supabase إلا بعد فترة تحقق ونسخة احتياطية.
