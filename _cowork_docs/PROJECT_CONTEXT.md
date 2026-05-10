# 📊 COOL SEASONS ERP - السياق الكامل للمشروع

> هذا الملف هو المرجع الأساسي. يجب قراءته كاملاً قبل أي عمل على المشروع.

---

## 🏢 معلومات الشركة
- **الاسم التجاري**: COOL SEASONS & DARAJA.STORE (مواسم البرودة ودرجة)
- **النشاط**: شركة تكييف وتبريد (HVAC)
- **الموقع**: المملكة العربية السعودية
- **اللغة الأساسية**: العربية (RTL)

---

## 🛠️ البنية التقنية

| المكون | التقنية | الرابط |
|--------|---------|--------|
| Frontend | Next.js 14 + TypeScript + Tailwind | - |
| Database | Supabase (PostgreSQL) | https://cmnmbikhvdbqgzmtdeko.supabase.co |
| Hosting | Vercel | https://cool-seasons-erp.vercel.app |
| Repo | GitHub | https://github.com/COOL-SEASONS/cool-seasons-erp |
| Anon Key | (في Vercel Env) | `eyJhbGc...VzdvwQgLqr0g` |

### ملاحظات مهمة:
- **RLS معطّل** على كل الجداول (للتطوير)
- البناء (`npm run build`) يجب أن يكون ناجحاً قبل أي push
- Vercel يُحدّث تلقائياً عند push على main

---

## 🎨 هوية التصميم
```css
الأزرق الأساسي:  #1E9CD7
الأحمر:          #C0392B
الرمادي الفاتح:  #F4F7FA
الأخضر:          #16A34A
البرتقالي:       #F59E0B
```
- **الخطوط**: Tajawal + Cairo
- **الاتجاه**: RTL كامل
- **شعار الشركة**: على الفواتير والتقارير

---

## 📑 الصفحات المُنفّذة (48 صفحة)
الموقع: `components/pages/`

### CRM
- `ClientsPage.tsx` - إدارة العملاء
- `ClientCardPage.tsx` - بطاقة العميل
- `ClientFollowUpPage.tsx` - متابعة العملاء
- `CallCenterPage.tsx` - مركز الاتصال
- `PendingOffersPage.tsx` - العروض المعلقة
- `QuotesPage.tsx` - عروض الأسعار
- `MultiOptionQuotesPage.tsx` - عروض متعددة الخيارات

### العمليات
- `ProjectsPage.tsx` ⭐ - المشاريع (مع تقرير شامل للمواد)
- `DispatchBoardPage.tsx` - لوحة التوزيع
- `GanttChartPage.tsx` - مخطط جانت
- `InvoicesPage.tsx` - الفواتير
- `ExpensesPage.tsx` ⭐ - المصروفات (المعتمد فقط + تحليل الفئات)

### المخزون (Movement-Based) ⭐ النظام الأهم
- `CopperPipePage.tsx` - النحاس (10 أزواج مقاسات)
- `FreonPage.tsx` - الفريون (8 أنواع غاز)
- `DuctWorksPage.tsx` - الدكت (3 طرق حساب: طن/طولي/مواد × 5 أنواع)
- `InventoryPage.tsx` - المخزون العام
- `WarrantyTrackingPage.tsx` - الضمانات

### الموارد البشرية
- `TechniciansPage.tsx` - الفنيون
- `HRAttendancePage.tsx` - الحضور والانصراف
- `CommissionsPage.tsx` - العمولات
- `TechLeaderboardPage.tsx` - ترتيب الفنيون

### المالية
- `MaintenancePage.tsx` - الصيانة
- `ContractsPage.tsx` - عقود AMC
- `JobCostingPage.tsx` - تكلفة المهمة
- `WIPReportPage.tsx` - تقرير العمل قيد التنفيذ
- `CashFlowPage.tsx` - التدفق النقدي
- `ChangeOrdersPage.tsx` - أوامر التغيير

### أخرى
- `VehiclesPage.tsx` - المركبات
- `CompanyDocsPage.tsx` - وثائق الشركة
- `JobChecklistsPage.tsx` - قوائم المهام (13 بند)
- `PunchListPage.tsx` - قوائم الإكمال
- `DailyLogsPage.tsx` - السجلات اليومية
- `CapacityPlanPage.tsx` - تخطيط الطاقة
- `PriceBookPage.tsx` - دليل الأسعار
- `ContractorPage.tsx` - المقاولون

---

## 🏗️ القرارات المعمارية الأساسية

### قرار 1: نظام Movement-Based للمخزون ⭐
**المشكلة الأصلية**: تتبع كل لفة/أسطوانة منفردة كان مُربكاً.

**القرار**: 
- جدول واحد `*_movements` لكل مادة
- View واحد `*_stock_by_*` يحسب المخزون تلقائياً
- IN/OUT/ADJ كأنواع حركات
- متوسط التكلفة المرجح للحساب

**المطبق على**:
- ✅ النحاس (`copper_movements` + `copper_stock_by_pair`)
- ✅ الفريون (`freon_movements` + `freon_stock_by_type`)
- ✅ الدكت (`duct_movements` + `duct_stock_by_spec`)

### قرار 2: الخيار أ المحاسبي (Professional Accounting) ⭐
- المنشأة (لفة/أسطوانة/لوح) **بدون كميات أو تكلفة عند الإنشاء**
- أول حركة استلام = الكمية + التكلفة
- تكلفة الاستخدام = متوسط مرجح من حركات الاستلام

### قرار 3: الاستلام الجماعي
- حركة واحدة لـ N لفة/أسطوانة (بدلاً من N حركة)
- تكلفة الواحدة × العدد = الإجمالي تلقائياً
- تكلفة الكيلو/المتر تُحسب تلقائياً

### قرار 4: تتبع المشاريع
- كل حركة مربوطة بمشروع (اختياري للاستلام، إجباري للاستخدام)
- بطاقة "ملخص المشاريع" تُظهر: مستلم/مستخدم/فائض/نقص
- تنبيه ذكي: "يمكنك استخدام X من فائض المشروع لتغطية النقص"

### قرار 5: الدكت بـ 3 طرق حساب
- ❄️ **بالطن** (Tonnage) - للسعة التبريدية
- 📏 **بالمتر الطولي** (Linear) - للقياس المباشر
- 🏗️ **بالمواد** (Materials) - 5 أنواع مدمجة:
  - 🔩 Galvanized (م²)
  - 🟦 PreInsulated (لوح)
  - 🌀 Flexible (م طولي)
  - 🧱 Fiberglass (م²)
  - 🔵 Spiral (م طولي)

### قرار 6: المصروفات - المعتمد فقط
- الإجماليات تُحسب فقط من السجلات `Approved`
- تنبيه أصفر للسجلات `Pending`
- بطاقات تحليل حسب الفئة (مع شريط تقدم بصري)
- الإجمالي = العهدة − الصرف (مهم للمحاسبة)

### قرار 7: تقرير المشروع الشامل
زر طباعة في `ProjectsPage.tsx` يُولّد تقرير A4 يحوي:
- معلومات المشروع الأساسية
- 🔥 استهلاك النحاس (4 بطاقات + جدول)
- ❄️ استهلاك الفريون (4 بطاقات + جدول)
- 🏗️ استهلاك الدكت (3 طرق + جدول)
- 💰 الملخص المالي للمواد + نسبة من الميزانية

---

## 📐 جداول قاعدة البيانات الأساسية

### النحاس
- `copper_movements` (الجدول الوحيد)
- View: `copper_stock_by_pair`
- أعمدة مهمة: `liquid_size`, `suction_size`, `meters`, `num_coils`, `total_cost`, `project_id`

### الفريون
- `freon_movements`
- View: `freon_stock_by_type`
- أعمدة مهمة: `freon_type`, `kg`, `num_cylinders`, `total_cost`, `receiver_tech_id`

### الدكت
- `duct_movements`
- View: `duct_stock_by_spec`
- أعمدة مهمة: `duct_type`, `quantity`, `unit`, `calculation_method`, `cooling_tonnage`, `linear_meters`

### المشاريع
- `projects` (مرتبط بـ clients + technicians)

### المصروفات
- `expenses` (مع `status` للاعتماد)

---

## ⚠️ تحذيرات مهمة

### 🚫 لا تفعل هذا:
- **لا تعيد تفعيل RLS** بدون نظام Auth أولاً
- **لا تعدّل الـ Views** بـ `CREATE OR REPLACE` (تغيير ترتيب الأعمدة) - استخدم `DROP VIEW IF EXISTS ... CASCADE` أولاً
- **لا تُنشئ ملفات مكررة** لنفس الصفحة (مثل `FreonPage.tsx` و `FreonPage_v2.tsx`)
- **لا تكسر العلاقات** عند تعديل Foreign Keys

### ✅ افعل هذا دائماً:
- **اختبر البناء** قبل أي push: `npm run build`
- **استخدم Foreign Keys explicit** عند العلاقات المتعددة:
  ```typescript
  technicians!table_tech_id_fkey(full_name)
  receiver_tech:technicians!table_receiver_tech_id_fkey(full_name)
  ```
- **اتبع نفس النمط البصري** (الألوان، الخطوط، RTL)
- **أضف زر طباعة** لكل صفحة جديدة

---

## 📌 تاريخ المشروع
- تم بناؤه على مدى عدة محادثات
- كان يعتمد على Excel (49 شيت) قبل التحويل
- التحول الأساسي: Inventory-Based → Movement-Based (ربيع 2026)
- آخر تحديث كبير: نظام الدكت بـ 3 طرق حساب
