'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

// ─── ثوابت أوامر التغيير ──────────────────────────────
const CO_AR: any = { Pending:'انتظار موافقة', Approved:'موافق عليها', Rejected:'مرفوضة', Cancelled:'ملغية' }
const CO_C:  any = { Pending:'badge-amber', Approved:'badge-green', Rejected:'badge-red', Cancelled:'badge-gray' }
const newCO = () => ({ co_code:`CO-${551+Math.floor(Date.now()/1000)%9000}`, project_id:'', client_id:'', description:'', amount:'0', requested_date:new Date().toISOString().split('T')[0], approved_date:'', status:'Pending', change_type:'Addition', deduction_reason:'', notes:'' })

// ─── تبويبات ─────────────────────────────────────────
type Tab = 'costing' | 'changeorders'

export default function JobCostingPage() {
  const [tab, setTab] = useState<Tab>('costing')

  // ─── بيانات رئيسية ──────────────────────────────────
  const [projects,   setProjects]   = useState<any[]>([])
  const [changeOrders, setChangeOrders] = useState<any[]>([])
  const [expenses,   setExpenses]   = useState<any[]>([])
  const [contractors,setContractors]= useState<any[]>([])
  const [purchaseOrders,setPurchaseOrders] = useState<any[]>([])
  const [commissions,   setCommissions]   = useState<any[]>([])
  const [equipment,  setEquipment]  = useState<any[]>([])
  const [invoices,   setInvoices]   = useState<any[]>([])
  const [commissions,setCommissions]= useState<any[]>([])
  const [copper,     setCopper]     = useState<any[]>([])
  const [freon,      setFreon]      = useState<any[]>([])
  const [duct,       setDuct]       = useState<any[]>([])
  const [clients,    setClients]    = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)

  // ─── UI state ────────────────────────────────────────
  const [search,      setSearch]      = useState('')
  const [filterStatus,setFilterStatus]= useState('')
  const [expandedId,  setExpandedId]  = useState<string|null>(null)
  const [coModal,     setCoModal]     = useState(false)
  const [coForm,      setCoForm]      = useState<any>(newCO())
  const [coEditId,    setCoEditId]    = useState<string|null>(null)
  const [coSaving,    setCoSaving]    = useState(false)
  const [coSearch,    setCoSearch]    = useState('')
  const [coPrint,     setCoPrint]     = useState<any>(null)

  // ─── تحميل جميع البيانات ─────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const [
      { data: pr },{ data: co },{ data: ex },{ data: ct },
      { data: po },{ data: eq },{ data: inv },
      { data: cu },{ data: fr },{ data: du },{ data: cl },
      { data: comm },
    ] = await Promise.all([
      supabase.from('projects').select('*,clients(company_name),technicians(full_name)').order('created_at',{ascending:false}),
      supabase.from('change_orders').select('*,projects(project_name),clients(company_name)').order('requested_date',{ascending:false,nullsFirst:false}),
      supabase.from('expenses').select('project_id,amount,status').not('project_id','is',null),
      supabase.from('contractors').select('project_id,contract_value,paid_amount').not('project_id','is',null),
      supabase.from('purchase_orders').select('project_id,grand_total,status').not('project_id','is',null),
      supabase.from('commissions').select('project_id,commission_amt,source_type').eq('source_type','project').not('project_id','is',null),
      supabase.from('equipment_assets').select('project_id,purchase_price,selling_price,qty,installation_cost').not('project_id','is',null),
      supabase.from('invoices').select('project_id,amount,paid_amount,status').not('project_id','is',null),
      supabase.from('commissions').select('project_id,commission_amt,link_type').eq('link_type','project').not('project_id','is',null),
      supabase.from('copper_movements').select('project_id,movement_type,total_cost').not('project_id','is',null),
      supabase.from('freon_movements').select('project_id,movement_type,total_cost').not('project_id','is',null),
      supabase.from('duct_movements').select('project_id,movement_type,total_cost').not('project_id','is',null),
      supabase.from('clients').select('id,company_name'),
    ])
    setProjects(pr||[]); setChangeOrders(co||[]); setExpenses(ex||[])
    setContractors(ct||[]); setPurchaseOrders(po||[]); setEquipment(eq||[])
    setInvoices(inv||[]); setCommissions(comm||[]); setCopper(cu||[]); setFreon(fr||[]); setDuct(du||[])
    setClients(cl||[]); setCommissions(comm||[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ─── تجميع التكاليف لكل مشروع ─────────────────────────
  const calcProject = (pid: string) => {
    // المعدات
    const eqItems     = equipment.filter(e => e.project_id === pid)
    const eqCost      = eqItems.reduce((s,e) => s + (parseFloat(e.purchase_price)||0)*(e.qty||1) + (parseFloat(e.installation_cost)||0), 0)
    const eqRevenue   = eqItems.reduce((s,e) => s + (parseFloat(e.selling_price)||0)*(e.qty||1), 0)

    // مواد (نحاس + فريون + دكت) — حركات الصرف OUT
    const copperCost  = copper.filter(c=>c.project_id===pid&&c.movement_type==='OUT').reduce((s,c)=>s+(c.total_cost||0),0)
    const freonCost   = freon.filter(f=>f.project_id===pid&&f.movement_type==='OUT').reduce((s,f)=>s+(f.total_cost||0),0)
    const ductCost    = duct.filter(d=>d.project_id===pid&&d.movement_type==='OUT').reduce((s,d)=>s+(d.total_cost||0),0)
    const materialCost = copperCost + freonCost + ductCost

    // مصروفات
    const expCost     = expenses.filter(e=>e.project_id===pid).reduce((s,e)=>s+(e.amount||0),0)

    // مقاولون
    const ctCost      = contractors.filter(c=>c.project_id===pid).reduce((s,c)=>s+(c.contract_value||0),0)
    const ctPaid      = contractors.filter(c=>c.project_id===pid).reduce((s,c)=>s+(c.paid_amount||0),0)

    // أوامر شراء
    const poCost      = purchaseOrders.filter(p=>p.project_id===pid&&p.status!=='Cancelled').reduce((s,p)=>s+(p.grand_total||0),0)
    const commCost    = commissions.filter(c=>c.project_id===pid).reduce((s,c)=>s+(c.commission_amt||0),0)

    // أوامر التغيير — إضافات وخصميات
    const coAdditions  = changeOrders.filter(c=>c.project_id===pid&&c.status==='Approved'&&c.change_type!=='Deduction').reduce((s,c)=>s+(c.amount||0),0)
    const coDeductions = changeOrders.filter(c=>c.project_id===pid&&c.status==='Approved'&&c.change_type==='Deduction').reduce((s,c)=>s+(c.amount||0),0)
    const coApproved   = coAdditions   // للتوافق مع الكود السابق
    const coPending    = changeOrders.filter(c=>c.project_id===pid&&c.status==='Pending').reduce((s,c)=>s+(c.amount||0),0)
    // قيمة العقد المعدّلة = الأصلية + الإضافات المعتمدة - الخصميات المعتمدة
    const revisedBudget = (projects.find(p=>p.id===pid)?.budget||0) + coAdditions - coDeductions

    // الفواتير (الإيرادات الفعلية)
    const invoiced    = invoices.filter(i=>i.project_id===pid).reduce((s,i)=>s+(i.amount||0),0)
    const collected   = invoices.filter(i=>i.project_id===pid).reduce((s,i)=>s+(i.paid_amount||0),0)

    const totalCostBase = eqCost + materialCost + expCost + ctCost + poCost + commCost
    return { eqCost, eqRevenue, materialCost, copperCost, freonCost, ductCost, expCost, ctCost, ctPaid, poCost, commCost, coApproved, coAdditions, coDeductions, coPending, invoiced, collected, totalCost }
  }

  const fmt = (n: number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)

  // ─── إجماليات عامة ──────────────────────────────────
  const totals = projects.reduce((acc, p) => {
    const c = calcProject(p.id)
    return {
      budget:     acc.budget     + (p.budget||0),
      invoiced:   acc.invoiced   + c.invoiced,
      collected:  acc.collected  + c.collected,
      totalCost:  acc.totalCost  + c.totalCost,
      coApproved: acc.coApproved + c.coApproved,
    }
  }, { budget:0, invoiced:0, collected:0, totalCost:0, coApproved:0 })

  // ─── فلترة المشاريع ──────────────────────────────────
  const filteredProjects = projects.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.project_name?.toLowerCase().includes(q) || r.project_code?.toLowerCase().includes(q) || r.clients?.company_name?.toLowerCase().includes(q)
    const matchStatus  = !filterStatus || r.status === filterStatus
    return matchSearch && matchStatus
  })

  // ─── فلترة أوامر التغيير ─────────────────────────────
  const filteredCO = changeOrders.filter(r =>
    r.co_code?.includes(coSearch) ||
    r.projects?.project_name?.toLowerCase().includes(coSearch.toLowerCase()) ||
    r.description?.toLowerCase().includes(coSearch.toLowerCase())
  )

  // ─── CRUD أوامر التغيير ──────────────────────────────
  const openNewCO = (projectId?: string) => {
    const proj = projects.find(p => p.id === projectId)
    setCoForm({ ...newCO(), project_id: projectId||'', client_id: proj?.client_id||'' })
    setCoEditId(null); setCoModal(true)
  }

  const openEditCO = (r: any) => {
    setCoForm({ co_code:r.co_code||'', project_id:r.project_id||'', client_id:r.client_id||'', description:r.description||'', amount:String(r.amount||0), requested_date:r.requested_date||'', approved_date:r.approved_date||'', status:r.status||'Pending', change_type:r.change_type||'Addition', deduction_reason:r.deduction_reason||'', notes:r.notes||'' })
    setCoEditId(r.id); setCoModal(true)
  }

  const saveCO = async () => {
    if (!coForm.co_code?.trim()) return alert('رقم الأمر مطلوب')
    setCoSaving(true)
    const payload = { co_code:coForm.co_code.trim(), project_id:coForm.project_id||null, client_id:coForm.client_id||null, description:coForm.description||null, amount:parseFloat(coForm.amount)||0, requested_date:coForm.requested_date||null, approved_date:coForm.approved_date||null, status:coForm.status, change_type:coForm.change_type||'Addition', deduction_reason:coForm.deduction_reason||null, notes:coForm.notes||null }
    const { error } = coEditId
      ? await supabase.from('change_orders').update(payload).eq('id',coEditId)
      : await supabase.from('change_orders').insert(payload)
    if (error) alert('خطأ: ' + error.message)
    else { setCoModal(false); load() }
    setCoSaving(false)
  }

  const delCO = async (id: string) => {
    if (!confirm('حذف هذا الأمر؟')) return
    await supabase.from('change_orders').delete().eq('id',id); load()
  }

  // ─── تقرير طباعة للمشروع ─────────────────────────────
  const printProject = (proj: any) => {
    const c = calcProject(proj.id)
    const coList = changeOrders.filter(co => co.project_id === proj.id)
    const profit  = (proj.budget||0) - c.totalCost

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<title>تكاليف المشروع — ${proj.project_name}</title>
<style>
  @media print{@page{size:A4;margin:1.5cm}}
  body{font-family:'Tajawal','Cairo',Arial,sans-serif;padding:20px;color:#1E293B;max-width:900px;margin:0 auto}
  .header{text-align:center;padding:14px;border-bottom:4px double #1E9CD7;margin-bottom:18px}
  .company{font-size:20px;font-weight:900;color:#1E9CD7}
  .doc-title{font-size:17px;font-weight:800;margin-top:10px;color:white;padding:7px 18px;background:linear-gradient(135deg,#1E9CD7,#0F4C81);border-radius:8px;display:inline-block}
  .section-title{font-size:14px;font-weight:800;padding:7px 12px;background:#F1F5F9;border-right:4px solid #1E9CD7;margin:14px 0 8px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#E0F2FE;color:#0C4A6E;text-align:right;padding:7px;border:1px solid #BAE6FD;font-weight:700}
  td{padding:6px 7px;border:1px solid #E2E8F0}
  .box{background:linear-gradient(135deg,#FEF3C7,#FFFBEB);border:2px solid #F59E0B;border-radius:10px;padding:14px;margin:14px 0}
  .row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}
  .main{font-size:16px;font-weight:900;color:#92400E;border-top:2px solid #F59E0B;padding-top:8px;margin-top:6px}
  .green{color:#16A34A;font-weight:700} .red{color:#DC2626;font-weight:700} .blue{color:#1E9CD7;font-weight:700}
  .footer{text-align:center;margin-top:20px;font-size:10px;color:#94A3B8;border-top:1px dashed #CBD5E1;padding-top:10px}
</style></head><body>
<div class="header">
  <div class="company">COOL SEASONS & DARAJA.STORE</div>
  <div style="font-size:11px;color:#64748B;margin-top:4px">نظام ERP للتكييف والتبريد</div>
  <div class="doc-title">📊 تقرير تكاليف المشروع الشامل</div>
</div>
<div class="section-title">📋 معلومات المشروع</div>
<table><tr>
  <td style="color:#64748B">الكود</td><td><b>${proj.project_code||'—'}</b></td>
  <td style="color:#64748B">الاسم</td><td><b>${proj.project_name||'—'}</b></td>
</tr><tr>
  <td style="color:#64748B">العميل</td><td>${proj.clients?.company_name||'—'}</td>
  <td style="color:#64748B">الفني</td><td>${proj.technicians?.full_name||'—'}</td>
</tr><tr>
  <td style="color:#64748B">قيمة العقد</td><td class="blue">${fmt(proj.budget||0)} ر.س</td>
  <td style="color:#64748B">الإنجاز</td><td><b>${proj.completion_pct||0}%</b></td>
</tr></table>

<div class="section-title">💰 تفصيل التكاليف</div>
<table><thead><tr><th>مصدر التكلفة</th><th>القيمة</th><th>ملاحظات</th></tr></thead><tbody>
  <tr><td>🧊 معدات (شراء + تركيب)</td><td class="red">${fmt(c.eqCost)} ر.س</td><td>من صفحة المعدات المركّبة</td></tr>
  <tr><td>🔧 نحاس (مستخدم)</td><td class="red">${fmt(c.copperCost)} ر.س</td><td>من حركات النحاس</td></tr>
  <tr><td>❄️ فريون (مستخدم)</td><td class="red">${fmt(c.freonCost)} ر.س</td><td>من حركات الفريون</td></tr>
  <tr><td>🌬️ دكت (مستخدم)</td><td class="red">${fmt(c.ductCost)} ر.س</td><td>من حركات الدكت</td></tr>
  <tr><td>💸 مصروفات</td><td class="red">${fmt(c.expCost)} ر.س</td><td>من صفحة المصروفات</td></tr>
  <tr><td>👷 مقاولون (قيمة العقود)</td><td class="red">${fmt(c.ctCost)} ر.س</td><td>المدفوع: ${fmt(c.ctPaid)} ر.س</td></tr>
  <tr><td>📦 أوامر الشراء</td><td class="red">${fmt(c.poCost)} ر.س</td><td>من صفحة أوامر الشراء</td></tr>
  <tr><td>💼 عمولات الوسطاء</td><td class="red">\${fmtD(c.commCost)} ر.س</td><td>من صفحة العمولات</td></tr>
  <tr><td>📋 أوامر التغيير (معتمدة)</td><td class="red">${fmt(c.coApproved)} ر.س</td><td>انتظار: ${fmt(c.coPending)} ر.س</td></tr>
  <tr style="background:#FEF2F2"><td><b>إجمالي التكاليف</b></td><td class="red"><b>${fmt(c.totalCost)} ر.س</b></td><td></td></tr>
</tbody></table>

${coList.length>0?`
<div class="section-title">📋 أوامر التغيير</div>
<table><thead><tr><th>رقم الأمر</th><th>الوصف</th><th>القيمة</th><th>الحالة</th></tr></thead><tbody>
${coList.map(co=>`<tr><td style="font-family:monospace">${co.co_code}</td><td>${co.description||'—'}</td><td>${fmt(co.amount)} ر.س</td><td>${CO_AR[co.status]||co.status}</td></tr>`).join('')}
</tbody></table>`:''}

<div class="box">
  <div style="font-size:13px;font-weight:800;color:#92400E;text-align:center;margin-bottom:8px">📊 الملخص المالي</div>
  <div class="row"><span>قيمة العقد:</span><span class="blue">${fmt(proj.budget||0)} ر.س</span></div>
  <div class="row"><span>الفواتير الصادرة:</span><span>${fmt(c.invoiced)} ر.س</span></div>
  <div class="row"><span>المحصّل:</span><span class="green">${fmt(c.collected)} ر.س</span></div>
  <div class="row"><span>إجمالي التكاليف:</span><span class="red">${fmt(c.totalCost)} ر.س</span></div>
  <div class="row main"><span>صافي الربح المتوقع:</span>
    <span class="${profit>=0?'green':'red'}">${profit>=0?'+':''}${fmt(profit)} ر.س
    (${proj.budget>0?Math.round(profit/proj.budget*100):0}%)</span>
  </div>
</div>
<div class="footer">تم الإنشاء: ${new Date().toLocaleString('ar-SA')} | COOL SEASONS ERP</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),400)}</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
    else alert('يرجى السماح بالنوافذ المنبثقة')
  }

  // ─── مكونات مشتركة ───────────────────────────────────
  const statusColor: any = { 'In Progress':'badge-blue', Completed:'badge-green', 'On Hold':'badge-amber', Cancelled:'badge-red', New:'badge-gray' }
  const statusAr: any    = { 'In Progress':'جاري', Completed:'مكتمل', 'On Hold':'متوقف', Cancelled:'ملغي', New:'جديد' }

  // ─── واجهة ───────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">تكاليف المشاريع وأوامر التغيير</div>
          <div className="page-subtitle">{projects.length} مشروع</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} title="تحديث" style={{ display:'flex', alignItems:'center', gap:4, background:'white', color:'var(--cs-blue)', border:'1px solid var(--cs-blue)', borderRadius:8, padding:'8px 12px', cursor:'pointer', fontSize:13 }}>
            <RefreshCw size={14}/>
          </button>
          <button onClick={() => openNewCO()} className="btn-primary"><Plus size={16}/>أمر تغيير جديد</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
        {[
          { l:'قيمة العقود',    v: fmt(totals.budget)   +' ر.س', c:'var(--cs-blue)' },
          { l:'الفواتير الصادرة', v: fmt(totals.invoiced)+' ر.س', c:'var(--cs-blue)' },
          { l:'إجمالي التكاليف', v: fmt(totals.totalCost)+' ر.س', c:'var(--cs-red)' },
          { l:'الربح المتوقع',   v: fmt(totals.budget-totals.totalCost)+' ر.س',
            c: (totals.budget-totals.totalCost)>=0 ? 'var(--cs-green)':'var(--cs-red)' },
          { l:'هامش الربح',     v: totals.budget>0?Math.round((totals.budget-totals.totalCost)/totals.budget*100)+'%':'—',
            c:'var(--cs-blue)' },
          { l:'أوامر التغيير (معتمدة)', v: fmt(totals.coApproved)+' ر.س', c:'var(--cs-orange)' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div style={{ fontSize:11, color:'var(--cs-text-muted)', fontWeight:600, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontSize:16, fontWeight:800, color:s.c, fontFamily:'Cairo,sans-serif' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:16, background:'var(--cs-gray-light)', borderRadius:10, padding:4, width:'fit-content' }}>
        {[
          { id:'costing', label:'📊 تكاليف المشاريع' },
          { id:'changeorders', label:'📋 أوامر التغيير' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            style={{ padding:'8px 20px', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'Tajawal,sans-serif', fontSize:13, fontWeight:600,
              background: tab===t.id ? 'white' : 'transparent',
              color: tab===t.id ? 'var(--cs-blue)' : 'var(--cs-text-muted)',
              boxShadow: tab===t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════ Tab 1: تكاليف المشاريع ════════════ */}
      {tab === 'costing' && (
        <>
          {/* Filters */}
          <div className="card" style={{ marginBottom:16, padding:'12px 16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10 }}>
              <div style={{ position:'relative' }}>
                <Search size={16} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--cs-text-muted)' }}/>
                <input className="form-input" style={{ paddingRight:34 }} placeholder="بحث بالمشروع أو العميل..."
                  value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
              <select className="form-input" style={{ minWidth:130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">كل الحالات</option>
                {['New','In Progress','On Hold','Completed','Cancelled'].map(s =>
                  <option key={s} value={s}>{statusAr[s]||s}</option>)}
              </select>
            </div>
          </div>

          {/* Costing Table */}
          <div className="card">
            {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--cs-text-muted)' }}>جاري تحميل البيانات...</div> : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width:28 }}></th>
                      <th>المشروع</th>
                      <th>العميل</th>
                      <th>قيمة العقد</th>
                      <th>🧊 معدات</th>
                      <th>🔧 مواد</th>
                      <th>💸 مصروفات</th>
                      <th>👷 مقاولون</th>
                      <th>📋 تغييرات</th>
                      <th>إجمالي التكلفة</th>
                      <th>الربح</th>
                      <th>هامش%</th>
                      <th>إنجاز</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.length === 0
                      ? <tr><td colSpan={14} style={{ textAlign:'center', padding:40, color:'var(--cs-text-muted)' }}>لا توجد مشاريع</td></tr>
                      : filteredProjects.map(proj => {
                        const c = calcProject(proj.id)
                        const budget = proj.budget || 0
                        const revised = budget + c.coAdditions - c.coDeductions
                        const profit = revised - c.totalCost
                        const margin = revised > 0 ? Math.round(profit/revised*100) : 0
                        const overBudget = c.totalCost > revised && revised > 0
                        const expanded = expandedId === proj.id
                        const projCOs   = changeOrders.filter(co => co.project_id === proj.id)

                        return <>
                          <tr key={proj.id} style={{ background: overBudget ? '#FFF5F5' : expanded ? '#F0F9FF' : 'inherit' }}>
                            {/* expand button */}
                            <td style={{ textAlign:'center' }}>
                              <button onClick={() => setExpandedId(expanded ? null : proj.id)}
                                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-text-muted)', padding:2 }}>
                                {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                              </button>
                            </td>
                            <td>
                              <div style={{ fontWeight:700, fontSize:13 }}>{proj.project_name}</div>
                              <div style={{ fontSize:10, fontFamily:'monospace', color:'var(--cs-text-muted)' }}>{proj.project_code}</div>
                            </td>
                            <td style={{ fontSize:12 }}>{proj.clients?.company_name||'—'}</td>
                            <td>
                              <div style={{ fontWeight:600, color:'var(--cs-blue)' }}>{fmt(budget)} ر.س</div>
                              {revised !== budget && (
                                <div style={{ fontSize:10, color: revised>budget?'var(--cs-green)':'var(--cs-red)', fontWeight:600 }}>
                                  معدّلة: {fmt(revised)} ر.س
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize:12, color: c.eqCost>0?'var(--cs-red)':'var(--cs-text-muted)' }}>{c.eqCost>0?fmt(c.eqCost)+' ر.س':'—'}</td>
                            <td style={{ fontSize:12, color: c.materialCost>0?'var(--cs-red)':'var(--cs-text-muted)' }}>{c.materialCost>0?fmt(c.materialCost)+' ر.س':'—'}</td>
                            <td style={{ fontSize:12, color: c.expCost>0?'var(--cs-red)':'var(--cs-text-muted)' }}>{c.expCost>0?fmt(c.expCost)+' ر.س':'—'}</td>
                            <td style={{ fontSize:12, color: c.ctCost>0?'var(--cs-red)':'var(--cs-text-muted)' }}>{c.ctCost>0?fmt(c.ctCost)+' ر.س':'—'}</td>
                            <td>
                              {c.coApproved > 0 && <div style={{ fontSize:11, color:'var(--cs-green)', fontWeight:600 }}>✅ {fmt(c.coApproved)}</div>}
                              {c.coPending  > 0 && <div style={{ fontSize:11, color:'var(--cs-orange)' }}>⏳ {fmt(c.coPending)}</div>}
                              {c.coApproved === 0 && c.coPending === 0 && <span style={{ color:'var(--cs-text-muted)', fontSize:11 }}>—</span>}
                            </td>
                            <td style={{ fontWeight:800, color: overBudget?'var(--cs-red)':'var(--cs-text)' }}>{fmt(c.totalCost)} ر.س</td>
                            <td style={{ fontWeight:800, color: profit>=0?'var(--cs-green)':'var(--cs-red)' }}>
                              {revised > 0 ? `${profit>=0?'+':''}${fmt(profit)} ر.س` : <span style={{ color:'var(--cs-text-muted)', fontSize:11 }}>غير محدد</span>}
                            </td>
                            <td>
                              {revised > 0 ? (
                                <span style={{ fontWeight:700, fontSize:12,
                                  color: margin>=25?'#16A34A':margin>=10?'#D97706':'#DC2626',
                                  background: margin>=25?'#F0FDF4':margin>=10?'#FFFBEB':'#FEF2F2',
                                  padding:'2px 8px', borderRadius:20 }}>
                                  {margin}%
                                </span>
                              ) : '—'}
                            </td>
                            <td>
                              <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:80 }}>
                                <div style={{ flex:1, background:'var(--cs-border)', borderRadius:4, height:5 }}>
                                  <div style={{ width:`${Math.min(proj.completion_pct||0,100)}%`, background:'var(--cs-blue)', height:5, borderRadius:4 }}/>
                                </div>
                                <span style={{ fontSize:10, color:'var(--cs-text-muted)' }}>{proj.completion_pct||0}%</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display:'flex', gap:4 }}>
                                <button onClick={() => printProject(proj)} title="طباعة تقرير التكاليف"
                                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-green)' }}><Printer size={14}/></button>
                                <button onClick={() => openNewCO(proj.id)} title="أمر تغيير جديد"
                                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-blue)' }}><Plus size={14}/></button>
                              </div>
                            </td>
                          </tr>

                          {/* ─── صف التوسعة — تفاصيل التكاليف وأوامر التغيير ─── */}
                          {expanded && (
                            <tr key={proj.id+'-exp'}>
                              <td colSpan={14} style={{ padding:0 }}>
                                <div style={{ background:'#F8FAFC', padding:16, borderTop:'2px solid var(--cs-blue)', borderBottom:'2px solid var(--cs-border)' }}>
                                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

                                    {/* تفصيل التكاليف */}
                                    <div>
                                      <div style={{ fontSize:13, fontWeight:700, color:'var(--cs-text)', marginBottom:10, borderBottom:'1px solid var(--cs-border)', paddingBottom:6 }}>
                                        💰 تفصيل التكاليف
                                      </div>
                                      {[
                                        { l:'🧊 معدات (شراء + تركيب)', v:c.eqCost, sub: c.eqRevenue>0?`سعر البيع: ${fmt(c.eqRevenue)} ر.س`:'' },
                                        { l:'🔧 نحاس مستخدم',          v:c.copperCost },
                                        { l:'❄️ فريون مستخدم',          v:c.freonCost },
                                        { l:'🌬️ دكت مستخدم',            v:c.ductCost },
                                        { l:'💸 مصروفات',               v:c.expCost },
                                        { l:'👷 مقاولون',               v:c.ctCost, sub: `مدفوع: ${fmt(c.ctPaid)} ر.س` },
                                        { l:'📦 أوامر شراء',            v:c.poCost },
                                        { l:'💼 عمولات الوسطاء',          v:c.commCost },
                                        { l:'💼 عمولات الوسطاء',                 v:c.commCost },
                                        { l:'📋 أوامر تغيير إضافات (معتمدة)',  v:c.coAdditions },
                                        { l:'📋 أوامر تغيير خصميات (معتمدة)', v:c.coDeductions, neg:true },
                                      ].map(({ l, v, sub, neg }: any, i: number) => (
                                        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderBottom:'1px solid var(--cs-border)', fontSize:12 }}>
                                          <span style={{ color:'var(--cs-text-muted)' }}>{l}</span>
                                          <div style={{ textAlign:'left' }}>
                                            <span style={{ fontWeight:600, color: v>0?(neg?'var(--cs-green)':'var(--cs-red)'):'var(--cs-text-muted)' }}>
                                              {v>0?(neg?'−':'+')+fmt(v)+' ر.س':'—'}
                                            </span>
                                            {sub && <div style={{ fontSize:10, color:'var(--cs-text-muted)' }}>{sub}</div>}
                                          </div>
                                        </div>
                                      ))}
                                      <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', marginTop:4, fontWeight:800, fontSize:13, borderTop:'2px solid var(--cs-border)' }}>
                                        <span>إجمالي التكاليف</span>
                                        <span style={{ color:'var(--cs-red)' }}>{fmt(c.totalCost)} ر.س</span>
                                      </div>
                                      {/* الربح */}
                                      {budget > 0 && (
                                        <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontWeight:800, fontSize:13 }}>
                                          <span>الربح المتوقع</span>
                                          <span style={{ color: profit>=0?'var(--cs-green)':'var(--cs-red)' }}>
                                            {profit>=0?'+':''}{fmt(profit)} ر.س ({margin}%)
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* أوامر التغيير للمشروع */}
                                    <div>
                                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, borderBottom:'1px solid var(--cs-border)', paddingBottom:6 }}>
                                        <span style={{ fontSize:13, fontWeight:700 }}>📋 أوامر التغيير ({projCOs.length})</span>
                                        <button onClick={() => openNewCO(proj.id)}
                                          style={{ background:'var(--cs-blue)', color:'white', border:'none', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:11, fontFamily:'Tajawal,sans-serif', display:'flex', alignItems:'center', gap:3 }}>
                                          <Plus size={11}/>إضافة
                                        </button>
                                      </div>
                                      {projCOs.length === 0
                                        ? <div style={{ fontSize:12, color:'var(--cs-text-muted)', textAlign:'center', padding:'12px 0' }}>لا توجد أوامر تغيير</div>
                                        : projCOs.map(co => (
                                          <div key={co.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 8px', background:'white', borderRadius:8, marginBottom:6, border:'1px solid var(--cs-border)' }}>
                                            <div>
                                              <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--cs-blue)' }}>{co.co_code}</span>
                                              <span style={{ fontSize:11, marginRight:8, color:'var(--cs-text-muted)' }}>{co.description?.substring(0,30)}</span>
                                            </div>
                                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                              <span style={{ fontWeight:700, fontSize:12, color:'var(--cs-blue)' }}>{fmt(co.amount)} ر.س</span>
                                              <span className={`badge ${CO_C[co.status]||'badge-gray'}`} style={{ fontSize:10 }}>{CO_AR[co.status]||co.status}</span>
                                              <button onClick={() => openEditCO(co)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-blue)' }}><Edit2 size={12}/></button>
                                              <button onClick={() => delCO(co.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-red)' }}><Trash2 size={12}/></button>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      })
                    }
                  </tbody>
                  {/* إجماليات */}
                  {filteredProjects.length > 0 && (
                    <tfoot>
                      <tr style={{ background:'#F0F4F8', fontWeight:700 }}>
                        <td colSpan={3} style={{ fontSize:12, color:'var(--cs-text-muted)' }}>المجموع ({filteredProjects.length} مشروع)</td>
                        <td style={{ color:'var(--cs-blue)' }}>{fmt(filteredProjects.reduce((s,p)=>s+(p.budget||0),0))} ر.س</td>
                        <td style={{ color:'var(--cs-red)', fontSize:12 }}>{fmt(filteredProjects.reduce((s,p)=>s+calcProject(p.id).eqCost,0))} ر.س</td>
                        <td style={{ color:'var(--cs-red)', fontSize:12 }}>{fmt(filteredProjects.reduce((s,p)=>s+calcProject(p.id).materialCost,0))} ر.س</td>
                        <td style={{ color:'var(--cs-red)', fontSize:12 }}>{fmt(filteredProjects.reduce((s,p)=>s+calcProject(p.id).expCost,0))} ر.س</td>
                        <td style={{ color:'var(--cs-red)', fontSize:12 }}>{fmt(filteredProjects.reduce((s,p)=>s+calcProject(p.id).ctCost,0))} ر.س</td>
                        <td style={{ color:'var(--cs-orange)', fontSize:12 }}>{fmt(filteredProjects.reduce((s,p)=>s+calcProject(p.id).coApproved,0))} ر.س</td>
                        <td style={{ color:'var(--cs-red)' }}>{fmt(filteredProjects.reduce((s,p)=>s+calcProject(p.id).totalCost,0))} ر.س</td>
                        <td style={{ color:'var(--cs-green)' }}>
                          {fmt(filteredProjects.reduce((s,p)=>s+(p.budget||0)-calcProject(p.id).totalCost,0))} ر.س
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════ Tab 2: أوامر التغيير ════════════ */}
      {tab === 'changeorders' && (
        <>
          {/* stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginBottom:16 }}>
            {[
              { l:'الإجمالي', v:fmt(changeOrders.reduce((s,r)=>s+(r.amount||0),0))+' ر.س', c:'var(--cs-blue)' },
              { l:'موافق عليها', v:fmt(changeOrders.filter(r=>r.status==='Approved').reduce((s,r)=>s+(r.amount||0),0))+' ر.س', c:'var(--cs-green)' },
              { l:'انتظار موافقة', v:fmt(changeOrders.filter(r=>r.status==='Pending').reduce((s,r)=>s+(r.amount||0),0))+' ر.س', c:'var(--cs-orange)' },
              { l:'مرفوضة', v:changeOrders.filter(r=>r.status==='Rejected').length+' أمر', c:'var(--cs-red)' },
            ].map((s,i) => (
              <div key={i} className="stat-card">
                <div style={{ fontSize:11, color:'var(--cs-text-muted)', fontWeight:600, marginBottom:4 }}>{s.l}</div>
                <div style={{ fontSize:16, fontWeight:800, color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom:16, padding:'12px 16px' }}>
            <div style={{ position:'relative' }}>
              <Search size={16} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--cs-text-muted)' }}/>
              <input className="form-input" style={{ paddingRight:34 }} placeholder="بحث برقم الأمر أو المشروع أو الوصف..."
                value={coSearch} onChange={e => setCoSearch(e.target.value)}/>
            </div>
          </div>

          <div className="card">
            {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--cs-text-muted)' }}>جاري التحميل...</div> : (
              <div className="table-wrap"><table>
                <thead><tr><th>رقم الأمر</th><th>المشروع</th><th>العميل</th><th>الوصف</th><th>القيمة</th><th>تاريخ الطلب</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {filteredCO.length === 0
                    ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--cs-text-muted)' }}>لا توجد أوامر</td></tr>
                    : filteredCO.map(r => (
                      <tr key={r.id}>
                        <td><span style={{ fontFamily:'monospace', background:'var(--cs-blue-light)', padding:'2px 8px', borderRadius:4, fontSize:12 }}>{r.co_code}</span></td>
                        <td style={{ fontWeight:600 }}>{r.projects?.project_name||'—'}</td>
                        <td>{r.clients?.company_name||'—'}</td>
                        <td style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12 }}>{r.description||'—'}</td>
                        <td>
                          <span style={{ fontWeight:700, color: r.change_type==='Deduction'?'var(--cs-red)':'var(--cs-blue)' }}>
                            {r.change_type==='Deduction'?'−':'+'}{fmt(r.amount)} ر.س
                          </span>
                          {r.change_type==='Deduction' && r.deduction_reason && (
                            <div style={{ fontSize:10, color:'var(--cs-red)' }}>📝 {r.deduction_reason}</div>
                          )}
                        </td>
                        <td style={{ fontSize:12 }}>{r.requested_date||'—'}</td>
                        <td>
                          <span className={`badge ${CO_C[r.status]||'badge-gray'}`}>{CO_AR[r.status]||r.status}</span>
                          {r.change_type && <span style={{ fontSize:10, marginRight:4, color: r.change_type==='Deduction'?'var(--cs-red)':r.change_type==='Addition'?'var(--cs-green)':'var(--cs-text-muted)' }}>{r.change_type==='Addition'?'➕':r.change_type==='Deduction'?'➖':'🔄'}</span>}
                        </td>
                        <td><div style={{ display:'flex', gap:4 }}>
                          <button onClick={() => setCoPrint(r)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-green)' }}><Printer size={14}/></button>
                          <button onClick={() => openEditCO(r)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-blue)' }}><Edit2 size={14}/></button>
                          <button onClick={() => delCO(r.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-red)' }}><Trash2 size={14}/></button>
                        </div></td>
                      </tr>
                    ))}
                </tbody>
              </table></div>
            )}
          </div>
        </>
      )}

      {/* ════════ Modal: أمر تغيير ════════ */}
      {coModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div className="card" style={{ width:'100%', maxWidth:520, maxHeight:'92vh', overflow:'auto', padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontFamily:'Cairo,sans-serif', fontWeight:700, fontSize:18 }}>{coEditId?'تعديل':'أمر تغيير جديد'}</div>
              <button onClick={() => setCoModal(false)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label className="form-label">رقم الأمر *</label>
                <input className="form-input" value={coForm.co_code||''} onChange={e=>setCoForm({...coForm,co_code:e.target.value})}/>
              </div>
              <div><label className="form-label">الحالة</label>
                <select className="form-input" value={coForm.status||'Pending'} onChange={e=>setCoForm({...coForm,status:e.target.value})}>
                  {Object.keys(CO_AR).map(s=><option key={s} value={s}>{CO_AR[s]}</option>)}
                </select>
              </div>
              <div><label className="form-label">نوع الأمر</label>
                <select className="form-input" value={coForm.change_type||'Addition'} onChange={e=>setCoForm({...coForm,change_type:e.target.value})}>
                  <option value="Addition">➕ إضافة نطاق — تُضاف للعقد</option>
                  <option value="Deduction">➖ خصم — تُخصم من العقد</option>
                  <option value="Variation">🔄 تعديل — بدون تغيير مالي</option>
                </select>
              </div>
              <div><label className="form-label">المشروع</label>
                <select className="form-input" value={coForm.project_id||''} onChange={e=>{
                  const proj = projects.find(x=>x.id===e.target.value)
                  setCoForm({...coForm, project_id:e.target.value, client_id:proj?.client_id||coForm.client_id})
                }}>
                  <option value="">— اختر —</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}
                </select>
              </div>
              <div><label className="form-label">العميل</label>
                <select className="form-input" value={coForm.client_id||''} onChange={e=>setCoForm({...coForm,client_id:e.target.value})}>
                  <option value="">— اختر —</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">وصف التغيير</label>
                <textarea className="form-input" rows={2} value={coForm.description||''} onChange={e=>setCoForm({...coForm,description:e.target.value})}/>
              </div>
              <div><label className="form-label">القيمة (ر.س)</label>
                <input type="number" min="0" className="form-input" value={coForm.amount||'0'} onChange={e=>setCoForm({...coForm,amount:e.target.value})}/>
              </div>
              <div><label className="form-label">تاريخ الطلب</label>
                <input type="date" className="form-input" value={coForm.requested_date||''} onChange={e=>setCoForm({...coForm,requested_date:e.target.value})}/>
              </div>
              {coForm.status === 'Approved' && (
                <div><label className="form-label">تاريخ الموافقة</label>
                  <input type="date" className="form-input" value={coForm.approved_date||''} onChange={e=>setCoForm({...coForm,approved_date:e.target.value})}/>
                </div>
              )}
              {coForm.change_type === 'Deduction' && (
                <div style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">سبب الخصم *</label>
                  <input className="form-input" placeholder="مثال: غرامة تأخير، خصم ضمان، تعديل كميات..." value={coForm.deduction_reason||''} onChange={e=>setCoForm({...coForm,deduction_reason:e.target.value})}/>
                </div>
              )}
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">ملاحظات</label>
                <textarea className="form-input" rows={2} value={coForm.notes||''} onChange={e=>setCoForm({...coForm,notes:e.target.value})}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
              <button className="btn-secondary" onClick={() => setCoModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={saveCO} disabled={coSaving}><Save size={15}/>{coSaving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Print CO */}
      {coPrint && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div id="co-print" className="card" style={{ width:'100%', maxWidth:520, padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontFamily:'Cairo,sans-serif', fontWeight:700, fontSize:18 }}>أمر تغيير — {coPrint.co_code}</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => window.print()} style={{ background:'var(--cs-blue)', color:'white', border:'none', borderRadius:6, padding:'5px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12 }}><Printer size={13}/>طباعة</button>
                <button onClick={() => setCoPrint(null)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={18}/></button>
              </div>
            </div>
            {[
              {l:'رقم الأمر',v:coPrint.co_code},{l:'المشروع',v:coPrint.projects?.project_name},
              {l:'العميل',v:coPrint.clients?.company_name},{l:'الوصف',v:coPrint.description},
              {l:'القيمة',v:fmt(coPrint.amount)+' ر.س'},{l:'تاريخ الطلب',v:coPrint.requested_date},
              {l:'تاريخ الموافقة',v:coPrint.approved_date||'—'},{l:'الحالة',v:CO_AR[coPrint.status]||coPrint.status},
              {l:'ملاحظات',v:coPrint.notes},
            ].map(({l,v},i)=>v?(<div key={i} style={{display:'flex',padding:'8px 0',borderBottom:'1px solid var(--cs-border)'}}>
              <span style={{width:140,color:'var(--cs-text-muted)',fontSize:13}}>{l}:</span>
              <span style={{fontWeight:600,fontSize:13}}>{v}</span>
            </div>):null)}
            <div style={{ marginTop:24, display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              {['توقيع المدير','توقيع العميل'].map((l,i) => (
                <div key={i} style={{ textAlign:'center', borderTop:'2px solid var(--cs-border)', paddingTop:8, fontSize:12, color:'var(--cs-text-muted)', fontWeight:600 }}>{l}</div>
              ))}
            </div>
          </div>
          <style>{`@media print{body *{visibility:hidden}#co-print,#co-print *{visibility:visible}#co-print{position:fixed;top:0;left:0;width:100%}}`}</style>
        </div>
      )}
    </div>
  )
}
