# 🚀 دليل إعداد Cowork - خطوة بخطوة

> اتبع هذه الخطوات بالترتيب لإعداد بيئة العمل بالكامل.

---

## 1️⃣ تثبيت Claude Desktop

1. افتح: https://claude.ai/download
2. نزّل **Claude for Windows**
3. ثبّت الملف
4. سجّل دخول بحسابك (Pro)

---

## 2️⃣ تفعيل Cowork

1. افتح Claude Desktop
2. اذهب إلى **Settings** (الإعدادات)
3. ابحث عن **Cowork** أو **Research Previews**
4. فعّله

> ⚠️ ملاحظة: Cowork rolls out gradually. لو لم يظهر مباشرة، انتظر يوم أو يومين.

---

## 3️⃣ إعداد المشروع محلياً

### أ. تثبيت الأدوات الأساسية (لو غير مثبتة):
```bash
# Node.js (الإصدار 18+)
# نزّل من: https://nodejs.org

# Git
# نزّل من: https://git-scm.com/download/win
```

### ب. Clone المشروع:
افتح PowerShell أو Terminal:

```bash
# اختر مجلد للمشاريع
cd C:\Users\YourName\Documents

# Clone
git clone https://github.com/COOL-SEASONS/cool-seasons-erp.git

# ادخل المجلد
cd cool-seasons-erp

# ثبّت الحزم
npm install

# جرّب البناء
npm run build
```

> إذا نجح البناء، فالمشروع جاهز ✅

---

## 4️⃣ إنشاء Project في Cowork

1. في Claude Desktop، افتح **Cowork**
2. اضغط **+ New Project**
3. الاسم: `COOL_SEASONS_ERP`
4. اختر فولدر المشروع المحلي: `C:\Users\YourName\Documents\cool-seasons-erp`
5. أكّد الصلاحيات:
   - ✅ Read files
   - ✅ Edit files
   - ✅ Create files
   - ✅ Run commands

---

## 5️⃣ نقل ملفات السياق

في فولدر المشروع، أنشئ مجلداً اسمه `_cowork_docs/`:

```
cool-seasons-erp/
├── _cowork_docs/        ⭐ هنا الوثائق
│   ├── PROJECT_CONTEXT.md
│   ├── INSTRUCTIONS.md
│   ├── CURRENT_STATE.md
│   └── NEXT_TASKS.md
├── components/
├── app/
└── package.json
```

ثم في **Cowork Project Settings**:
- **Custom Instructions**: انسخ محتوى `INSTRUCTIONS.md`
- **Allowed Files**: تأكد أن `_cowork_docs/` مُتاح

---

## 6️⃣ إعداد MCP Connectors (اختياري لكن موصى به)

### أ. GitHub Connector
لتمكين Cowork من commit/push تلقائياً:
1. Cowork Settings → Connectors → Browse
2. ابحث عن **GitHub**
3. ثبّته
4. اربطه بحسابك (وفّر access token)

### ب. Supabase Connector (لو متوفر)
لتشغيل SQL مباشرة بدون فتح Dashboard:
1. ابحث في Connectors عن **Supabase** أو **PostgreSQL**
2. أضف:
   - Host: `cmnmbikhvdbqgzmtdeko.supabase.co`
   - Database password (من Supabase Settings)

### ج. Browser Extension
لاختبار الموقع بعد الـ Deploy:
1. ثبّت **Claude in Chrome** من Chrome Web Store
2. سجّل دخول بنفس حساب Pro
3. اربطه بـ Cowork

---

## 7️⃣ أول جلسة في Cowork

ابدأ بهذه الرسالة كاختبار:

```
اقرأ ملفات _cowork_docs/ كاملة، ثم لخّص لي:
1. حالة المشروع الحالية
2. ما المهام التالية
3. هل لديك أي أسئلة قبل البدء؟
```

إذا فهم Cowork المشروع جيداً، فأنت جاهز للعمل.

---

## 8️⃣ سيناريوهات استخدام يومي

### 🔧 لتطبيق تعديل بسيط:
```
في صفحة المصروفات، أضف فلتر حسب الفئة في الأعلى
```

Cowork سيقوم بـ:
1. قراءة `ExpensesPage.tsx`
2. تعديل الكود
3. تشغيل `npm run build`
4. عرض النتيجة
5. (لو وافقت) git commit + push
6. مراقبة Vercel deployment

### 🐛 لإصلاح خطأ:
```
صفحة الفواتير لا تعمل، الخطأ في الصورة المرفقة
```

(ارفق screenshot)

Cowork سيُحلّل ويُصلح.

### 📊 لإضافة ميزة:
```
أضف صفحة جديدة لتقارير الربحية الشهرية
```

Cowork سيُخطط ويبني.

---

## ⚙️ نصائح للأداء الأمثل

1. **استخدم Project Context** لكل مشروع منفصل
2. **حدّث `CURRENT_STATE.md`** بانتظام
3. **اطلب تأكيد قبل** أي عملية مدمّرة (delete, drop)
4. **اعمل branch** للميزات الكبيرة، لا تعدّل main مباشرة
5. **احتفظ بنسخة احتياطية** من `_cowork_docs/` على Drive/Dropbox

---

## 🚨 في حالة الطوارئ

### لو Cowork عمل تعديل خاطئ:
```bash
# تراجع عن آخر commit (لو لم تُرفع بعد)
git reset --hard HEAD~1

# أو تراجع عن تغيير محدد
git revert <commit-hash>
```

### لو SQL خاطئ على Supabase:
- Supabase يحفظ Backups تلقائياً
- استرجع من Database → Backups

### لو Vercel deployment فشل:
- اذهب لـ Vercel → Deployments → آخر نسخة ناجحة → "Promote to Production"

---

## 📞 للمساعدة

- **Cowork Docs**: https://claude.com/product/cowork
- **Anthropic Support**: support.claude.com
- **هذه المحادثة**: ابقها كمرجع للأسلوب والقرارات المعمارية

---

## ✅ Checklist قبل البدء

- [ ] Claude Desktop مثبّت
- [ ] Cowork مفعّل
- [ ] Node.js + Git مثبّتان
- [ ] المشروع cloned محلياً
- [ ] `npm run build` نجح
- [ ] فولدر `_cowork_docs/` فيه الـ 4 ملفات
- [ ] Cowork Project مرتبط بالفولدر
- [ ] GitHub Connector مفعّل (اختياري)
- [ ] أول جلسة اختبار ناجحة

عند الانتهاء، أنت جاهز للعمل بكفاءة 10x من قبل! 🚀
