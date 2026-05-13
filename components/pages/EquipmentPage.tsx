'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer, TrendingUp, AlertTriangle, Filter } from 'lucide-react'

const ASSET_TYPES = ['مكيف سبليت','مكيف دبل سبليت','VRF','مكيف مخفي','مكيف مركزي','Chiller','FCU','AHU','ثلاجة','معدة مطبخ','أخرى']
const UNITS        = ['طن','كيلو واط','BTU','وحدة']
const STATUSES     = [{ v:'Active', ar:'نشطة', c:'badge-green' },{ v:'Under Maintenance', ar:'تحت الصيانة', c:'badge-amber' },{ v:'Inactive', ar:'خارج الخدمة', c:'badge-gray' }]

const newCode = () => `AST-${11000 + Math.floor(Date.now()/1000) % 9000}`
const newForm = () => ({
  asset_code: newCode(), asset_name: '', asset_type: 'مكيف سبليت',
  brand: '', model: '', serial_no: '', capacity: '', unit: 'طن',
  project_id: '', client_id: '', tech_id: '', location: '',
  install_date: '', warranty_expiry: '',
  purchase_price: '0', selling_price: '0',
  qty: '1', installation_cost: '0', supplier: '',
  status: 'Active', notes: ''
})

export default function EquipmentPage() {
  const [rows,    setRows]    = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [projects,setProjects]= useState<any[]>([])
  const [techs,   setTechs]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [modal,   setModal]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [editId,  setEditId]  = useState<string|null>(null)
  const [form,    setForm]    = useState<any>(newForm())
  const [viewItem,setViewItem]= useState<any>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: e }, { data: c }, { data: p }, { data: t }] = await Promise.all([
      supabase.from('equipment_assets')
        .select('*,clients(company_name),projects(project_name),technicians(full_name)')
        .order('install_date', { ascending: false, nullsFirst: false }),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(e||[]); setClients(c||[]); setProjects(p||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openEdit = (r: any) => {
    setForm({
      asset_code: r.asset_code||'', asset_name: r.asset_name||'', asset_type: r.asset_type||'مكيف سبليت',
      brand: r.brand||'', model: r.model||'', serial_no: r.serial_no||'',
      capacity: r.capacity||'', unit: r.unit||'طن',
      project_id: r.project_id||'', client_id: r.client_id||'', tech_id: r.tech_id||'',
      location: r.location||'',
      install_date: r.install_date?.split('T')[0]||'',
      warranty_expiry: r.warranty_expiry?.split('T')[0]||'',
      purchase_price:    String(r.purchase_price    || 0),
      selling_price:     String(r.selling_price     || 0),
      qty:               String(r.qty               || 1),
      installation_cost: String(r.installation_cost || 0),
      supplier: r.supplier||'',
      status: r.status||'Active', notes: r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save = async () => {
    if (!form.asset_code.trim()) return alert('الكود مطلوب')
    setSaving(true)
    const payload = {
      asset_code:        form.asset_code.trim(),
      asset_name:        form.asset_name||null,
      asset_type:        form.asset_type||null,
      brand:             form.brand||null,
      model:             form.model||null,
      serial_no:         form.serial_no||null,
      capacity:          form.capacity||null,
      unit:              form.unit||null,
      project_id:        form.project_id||null,
      client_id:         form.client_id||null,
      tech_id:           form.tech_id||null,
      location:          form.location||null,
      install_date:      form.install_date||null,
      warranty_expiry:   form.warranty_expiry||null,
      purchase_price:    parseFloat(form.purchase_price)    || 0,
      selling_price:     parseFloat(form.selling_price)     || 0,
      qty:               parseInt(form.qty)                 || 1,
      installation_cost: parseFloat(form.installation_cost) || 0,
      supplier:          form.supplier||null,
      status:            form.status||'Active',
      notes:             form.notes||null,
    }
    const { error } = editId
      ? await supabase.from('equipment_assets').update(payload).eq('id', editId)
      : await supabase.from('equipment_assets').insert(payload)
    if (error) alert('خطأ: ' + error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذه المعدة؟')) return
    await supabase.from('equipment_assets').delete().eq('id', id)
    load()
  }

  // ─── حسابات التكاليف ─────────────────────────────────
  const totalCost   = (r: any) => (parseFloat(r.purchase_price)||0) * (r.qty||1)
  const totalSell   = (r: any) => (parseFloat(r.selling_price) ||0) * (r.qty||1)
  const fullCost    = (r: any) => totalCost(r) + (parseFloat(r.installation_cost)||0)
  const profit      = (r: any) => totalSell(r) - fullCost(r)
  const margin      = (r: any) => totalSell(r) > 0 ? Math.round(profit(r) / totalSell(r) * 100) : 0

  const fmt = (n: number) => new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n||0)
  const fmtD = (n: number) => Number(n||0).toLocaleString('ar-SA', { maximumFractionDigits: 2 })

  // ─── إحصائيات عامة ──────────────────────────────────
  const totalPurchase    = rows.reduce((s, r) => s + fullCost(r), 0)
  const totalRevenue     = rows.reduce((s, r) => s + totalSell(r), 0)
  const totalProfit      = totalRevenue - totalPurchase
  const avgMargin        = totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0

  const today     = new Date().toISOString().split('T')[0]
  const expiring  = rows.filter(r => r.warranty_expiry && r.warranty_expiry.split('T')[0] <= today)
  const expIn30   = rows.filter(r => {
    if (!r.warranty_expiry) return false
    const d = new Date(r.warranty_expiry); const now = new Date()
    return d > now && (d.getTime() - now.getTime()) / 86400000 <= 30
  })

  // ─── فلترة ──────────────────────────────────────────
  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.asset_code?.includes(search) ||
      r.asset_name?.toLowerCase().includes(q) ||
      r.clients?.company_name?.toLowerCase().includes(q) ||
      r.brand?.toLowerCase().includes(q)
    const matchProject = !filterProject || r.project_id === filterProject
    const matchStatus  = !filterStatus  || r.status === filterStatus
    return matchSearch && matchProject && matchStatus
  })

  // إجماليات الفلتر الحالي
  const filtCost    = filtered.reduce((s, r) => s + fullCost(r), 0)
  const filtRevenue = filtered.reduce((s, r) => s + totalSell(r), 0)
  const filtProfit  = filtRevenue - filtCost

  // ─── طباعة تقرير تكاليف المعدات ─────────────────────
  const printReport = (items: any[], title: string) => {
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<title>${title}</title>
<style>
  @media print{@page{size:A4;margin:1.5cm}}
  body{font-family:'Tajawal','Cairo',Arial,sans-serif;padding:20px;color:#1E293B;max-width:950px;margin:0 auto}
  .header{text-align:center;padding:16px;border-bottom:4px double #1E9CD7;margin-bottom:20px}
  .company{font-size:22px;font-weight:900;color:#1E9CD7}
  .sub{font-size:11px;color:#64748B;margin-top:4px}
  .doc-title{font-size:18px;font-weight:800;margin-top:12px;color:white;padding:8px 20px;background:linear-gradient(135deg,#1E9CD7,#0F4C81);border-radius:8px;display:inline-block}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px}
  th{background:#E0F2FE;color:#0C4A6E;text-align:right;padding:8px;border:1px solid #BAE6FD;font-weight:700}
  td{padding:7px 8px;border:1px solid #E2E8F0}
  .green{color:#16A34A;font-weight:700}
  .red{color:#DC2626;font-weight:700}
  .blue{color:#1E9CD7;font-weight:700}
  .amber{color:#D97706;font-weight:700}
  .summary{background:linear-gradient(135deg,#FEF3C7,#FFFBEB);border:2px solid #F59E0B;border-radius:10px;padding:14px;margin:16px 0}
  .sum-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
  .sum-main{font-size:17px;font-weight:900;color:#92400E;border-top:2px solid #F59E0B;padding-top:10px;margin-top:8px}
  .footer{text-align:center;margin-top:24px;font-size:10px;color:#94A3B8;border-top:1px dashed #CBD5E1;padding-top:10px}
  .warranty-warn{background:#FEF2F2;color:#DC2626;font-size:11px;padding:3px 8px;border-radius:4px}
</style></head><body>
<div class="header">
  <div class="company">COOL SEASONS & DARAJA.STORE</div>
  <div class="sub">مواسم البرودة · نظام ERP للتكييف والتبريد</div>
  <div class="doc-title">📦 ${title}</div>
</div>

<table>
  <thead><tr>
    <th>#</th><th>الكود</th><th>المعدة</th><th>النوع</th><th>الماركة</th><th>الكمية</th>
    <th>سعر الشراء/وحدة</th><th>تكلفة التركيب</th><th>إجمالي التكلفة</th>
    <th>سعر البيع/وحدة</th><th>إجمالي البيع</th><th>الربح</th><th>الهامش%</th>
    <th>العميل</th><th>المشروع</th><th>الضمان</th>
  </tr></thead>
  <tbody>
    ${items.map((r,i) => {
      const tc = fullCost(r), ts = totalSell(r), tp = ts - tc
      const m  = ts > 0 ? Math.round(tp/ts*100) : 0
      const warnClass = r.warranty_expiry && r.warranty_expiry.split('T')[0] <= today ? 'class="warranty-warn"' : ''
      return `<tr>
        <td>${i+1}</td>
        <td style="font-family:monospace;font-size:10px">${r.asset_code}</td>
        <td style="font-weight:600">${r.asset_name||'—'}</td>
        <td style="font-size:10px">${r.asset_type||'—'}</td>
        <td>${r.brand||'—'}</td>
        <td style="text-align:center;font-weight:700">${r.qty||1}</td>
        <td class="red">${fmtD(r.purchase_price)} ر.س</td>
        <td class="amber">${fmtD(r.installation_cost||0)} ر.س</td>
        <td class="red" style="font-weight:800">${fmtD(tc)} ر.س</td>
        <td class="blue">${fmtD(r.selling_price||0)} ر.س</td>
        <td class="blue" style="font-weight:800">${fmtD(ts)} ر.س</td>
        <td class="${tp>=0?'green':'red'}" style="font-weight:800">${tp>=0?'+':''}${fmtD(tp)} ر.س</td>
        <td class="${m>=20?'green':m>=10?'amber':'red'}">${m}%</td>
        <td>${r.clients?.company_name||'—'}</td>
        <td>${r.projects?.project_name||'—'}</td>
        <td ${warnClass}>${r.warranty_expiry?.split('T')[0]||'—'}</td>
      </tr>`
    }).join('')}
  </tbody>
</table>

<div class="summary">
  <div style="font-size:14px;font-weight:800;color:#92400E;text-align:center;margin-bottom:10px">💰 الملخص المالي للمعدات</div>
  <div class="sum-row"><span>عدد المعدات:</span><span style="font-weight:700">${items.length} معدة | ${items.reduce((s,r)=>s+(r.qty||1),0)} وحدة</span></div>
  <div class="sum-row"><span>إجمالي تكلفة الشراء:</span><span class="red">${fmtD(items.reduce((s,r)=>s+(parseFloat(r.purchase_price)||0)*(r.qty||1),0))} ر.س</span></div>
  <div class="sum-row"><span>إجمالي تكلفة التركيب:</span><span class="amber">${fmtD(items.reduce((s,r)=>s+(parseFloat(r.installation_cost)||0),0))} ر.س</span></div>
  <div class="sum-row"><span>إجمالي التكلفة الكاملة:</span><span class="red">${fmtD(items.reduce((s,r)=>s+fullCost(r),0))} ر.س</span></div>
  <div class="sum-row"><span>إجمالي سعر البيع:</span><span class="blue">${fmtD(items.reduce((s,r)=>s+totalSell(r),0))} ر.س</span></div>
  <div class="sum-row sum-main">
    <span>📊 إجمالي الربح المتوقع:</span>
    <span class="${items.reduce((s,r)=>s+profit(r),0)>=0?'green':'red'}">
      ${fmtD(items.reduce((s,r)=>s+profit(r),0))} ر.س
      (${items.reduce((s,r)=>s+totalSell(r),0)>0?Math.round(items.reduce((s,r)=>s+profit(r),0)/items.reduce((s,r)=>s+totalSell(r),0)*100):0}% هامش)
    </span>
  </div>
</div>

<div class="footer">تم الإنشاء: ${new Date().toLocaleString('ar-SA')} | COOL SEASONS ERP | تقرير محاسبي للمعدات</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),400)}</script>
</body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
    else alert('يرجى السماح بالنوافذ المنبثقة')
  }

  // ─── واجهة المستخدم ──────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div><div className="page-title">المعدات المركّبة</div><div className="page-subtitle">{rows.length} معدة</div></div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => printReport(filtered, 'تقرير تكاليف المعدات')}
            style={{ display:'flex', alignItems:'center', gap:6, background:'white', color:'var(--cs-blue)', border:'1px solid var(--cs-blue)', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:13, fontFamily:'Tajawal,sans-serif', fontWeight:600 }}>
            <Printer size={15}/>طباعة التقرير
          </button>
          <button className="btn-primary" onClick={() => { setForm(newForm()); setEditId(null); setModal(true) }}>
            <Plus size={16}/>معدة جديدة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
        {[
          { l:'إجمالي المعدات',    v: rows.length,             c:'var(--cs-blue)',   sub: `${rows.reduce((s,r)=>s+(r.qty||1),0)} وحدة` },
          { l:'إجمالي التكلفة',    v: fmt(totalPurchase)+' ر.س', c:'var(--cs-red)',   sub: 'شراء + تركيب' },
          { l:'إجمالي المبيعات',   v: fmt(totalRevenue)+' ر.س',  c:'var(--cs-blue)',  sub: 'سعر البيع' },
          { l:'إجمالي الربح',      v: fmt(totalProfit)+' ر.س',   c: totalProfit>=0 ? 'var(--cs-green)':'var(--cs-red)', sub: `هامش ${avgMargin}%` },
          { l:'ضمان منتهي',        v: expiring.length,          c:'var(--cs-red)',   sub: `${expIn30.length} ينتهي قريباً` },
          { l:'نشطة',              v: rows.filter(r=>r.status==='Active').length, c:'var(--cs-green)', sub: 'معدة' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div style={{ fontSize:11, color:'var(--cs-text-muted)', fontWeight:600, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontSize:18, fontWeight:800, color:s.c, fontFamily:'Cairo,sans-serif' }}>{s.v}</div>
            <div style={{ fontSize:10, color:'var(--cs-text-muted)', marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* تنبيه ضمان */}
      {(expiring.length > 0 || expIn30.length > 0) && (
        <div style={{ background:'#FFF5F5', border:'1px solid #FCA5A5', borderRadius:8, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          <AlertTriangle size={16} color="var(--cs-red)"/>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--cs-red)' }}>
            {expiring.length > 0 && `${expiring.length} معدة انتهى ضمانها`}
            {expiring.length > 0 && expIn30.length > 0 && ' | '}
            {expIn30.length > 0 && `${expIn30.length} معدة ضمانها ينتهي خلال 30 يوم`}
          </span>
        </div>
      )}

      {/* فلاتر */}
      <div className="card" style={{ marginBottom:16, padding:'12px 16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:10, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <Search size={16} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--cs-text-muted)' }}/>
            <input className="form-input" style={{ paddingRight:34 }} placeholder="بحث بالكود أو الاسم أو الماركة أو العميل..."
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="form-input" style={{ minWidth:160 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">🏗️ كل المشاريع</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
          <select className="form-input" style={{ minWidth:130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">📊 كل الحالات</option>
            {STATUSES.map(s => <option key={s.v} value={s.v}>{s.ar}</option>)}
          </select>
        </div>
        {/* ملخص الفلتر الحالي */}
        {(filterProject || filterStatus || search) && (
          <div style={{ marginTop:10, padding:'8px 12px', background:'var(--cs-gray-light)', borderRadius:8, display:'flex', gap:20, fontSize:12 }}>
            <span style={{ color:'var(--cs-text-muted)' }}>النتائج: <b style={{ color:'var(--cs-text)' }}>{filtered.length}</b></span>
            <span style={{ color:'var(--cs-red)' }}>تكلفة: <b>{fmt(filtCost)} ر.س</b></span>
            <span style={{ color:'var(--cs-blue)' }}>مبيعات: <b>{fmt(filtRevenue)} ر.س</b></span>
            <span style={{ color: filtProfit>=0?'var(--cs-green)':'var(--cs-red)' }}>ربح: <b>{filtProfit>=0?'+':''}{fmt(filtProfit)} ر.س</b></span>
            {filterProject && <button onClick={() => printReport(filtered, `تقرير تكاليف معدات المشروع: ${projects.find(p=>p.id===filterProject)?.project_name||''}`)}
              style={{ marginRight:'auto', background:'var(--cs-blue)', color:'white', border:'none', borderRadius:6, padding:'3px 12px', cursor:'pointer', fontSize:12, fontFamily:'Tajawal,sans-serif', display:'flex', alignItems:'center', gap:4 }}>
              <Printer size={12}/>طباعة تقرير المشروع
            </button>}
          </div>
        )}
      </div>

      {/* الجدول */}
      <div className="card">
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--cs-text-muted)' }}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>المعدة</th>
                  <th>النوع</th>
                  <th>الماركة/الموديل</th>
                  <th>كمية</th>
                  <th>تكلفة/وحدة</th>
                  <th>إجمالي التكلفة</th>
                  <th>سعر البيع</th>
                  <th>الربح</th>
                  <th>الهامش%</th>
                  <th>العميل</th>
                  <th>الضمان</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={14} style={{ textAlign:'center', padding:40, color:'var(--cs-text-muted)' }}>لا توجد معدات</td></tr>
                  : filtered.map(r => {
                    const tc = fullCost(r), ts = totalSell(r), tp = profit(r), mg = margin(r)
                    const warnExpiry = r.warranty_expiry && r.warranty_expiry.split('T')[0] <= today
                    const soonExpiry = expIn30.some(e => e.id === r.id)
                    return (
                      <tr key={r.id} style={{ background: warnExpiry ? '#FFF5F5' : soonExpiry ? '#FFFBEB' : 'inherit' }}>
                        <td style={{ fontFamily:'monospace', fontSize:11 }}>{r.asset_code}</td>
                        <td style={{ fontWeight:600, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.asset_name||'—'}</td>
                        <td style={{ fontSize:11 }}>{r.asset_type}</td>
                        <td style={{ fontSize:11 }}>{[r.brand, r.model].filter(Boolean).join(' / ') || '—'}</td>
                        <td style={{ textAlign:'center', fontWeight:700 }}>{r.qty||1}</td>
                        <td style={{ color:'var(--cs-red)', fontSize:12 }}>{fmt(r.purchase_price)}</td>
                        <td style={{ fontWeight:700, color:'var(--cs-red)' }}>{fmt(tc)} ر.س</td>
                        <td style={{ fontWeight:700, color:'var(--cs-blue)' }}>{ts > 0 ? fmt(ts)+' ر.س' : <span style={{ color:'var(--cs-text-muted)', fontSize:11 }}>—</span>}</td>
                        <td style={{ fontWeight:800, color: tp>0?'var(--cs-green)':tp<0?'var(--cs-red)':'var(--cs-text-muted)' }}>
                          {ts > 0 ? `${tp>=0?'+':''}${fmt(tp)} ر.س` : '—'}
                        </td>
                        <td>
                          {ts > 0 ? (
                            <span style={{ fontWeight:700, fontSize:12,
                              color: mg>=25?'#16A34A':mg>=15?'#D97706':'#DC2626',
                              background: mg>=25?'#F0FDF4':mg>=15?'#FFFBEB':'#FEF2F2',
                              padding:'2px 8px', borderRadius:20 }}>
                              {mg}%
                            </span>
                          ) : <span style={{ color:'var(--cs-text-muted)', fontSize:11 }}>—</span>}
                        </td>
                        <td style={{ fontSize:12 }}>{r.clients?.company_name||'—'}</td>
                        <td style={{ fontSize:11, color: warnExpiry?'var(--cs-red)':soonExpiry?'var(--cs-orange)':'inherit', fontWeight: (warnExpiry||soonExpiry)?700:400 }}>
                          {warnExpiry && '⚠️ '}{soonExpiry && !warnExpiry && '⏰ '}
                          {r.warranty_expiry?.split('T')[0]||'—'}
                        </td>
                        <td>
                          <span className={`badge ${STATUSES.find(s=>s.v===r.status)?.c||'badge-gray'}`}>
                            {STATUSES.find(s=>s.v===r.status)?.ar||r.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={() => setViewItem(r)} title="عرض وطباعة" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-green)' }}><Printer size={14}/></button>
                            <button onClick={() => openEdit(r)} title="تعديل" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-blue)' }}><Edit2 size={14}/></button>
                            <button onClick={() => del(r.id)} title="حذف" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-red)' }}><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
              {/* صف إجماليات الجدول */}
              {filtered.length > 0 && (
                <tfoot>
                  <tr style={{ background:'#F8FAFC', fontWeight:700 }}>
                    <td colSpan={4} style={{ fontSize:12, fontWeight:700, color:'var(--cs-text-muted)' }}>المجموع ({filtered.length} معدة)</td>
                    <td style={{ textAlign:'center', color:'var(--cs-blue)' }}>{filtered.reduce((s,r)=>s+(r.qty||1),0)}</td>
                    <td></td>
                    <td style={{ color:'var(--cs-red)' }}>{fmt(filtCost)} ر.س</td>
                    <td style={{ color:'var(--cs-blue)' }}>{fmt(filtRevenue)} ر.س</td>
                    <td style={{ color: filtProfit>=0?'var(--cs-green)':'var(--cs-red)' }}>{filtProfit>=0?'+':''}{fmt(filtProfit)} ر.س</td>
                    <td style={{ color: avgMargin>=20?'var(--cs-green)':'var(--cs-orange)' }}>
                      {filtRevenue>0?Math.round(filtProfit/filtRevenue*100):0}%
                    </td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* View / Print Modal */}
      {viewItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div id="eq-print" className="card" style={{ width:'100%', maxWidth:540, maxHeight:'90vh', overflow:'auto', padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontFamily:'Cairo,sans-serif', fontWeight:700, fontSize:18 }}>معدة — {viewItem.asset_code}</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => window.print()} style={{ background:'var(--cs-blue)', color:'white', border:'none', borderRadius:6, padding:'5px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12 }}><Printer size={13}/>طباعة</button>
                <button onClick={() => setViewItem(null)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={18}/></button>
              </div>
            </div>

            {/* معلومات المعدة */}
            {[
              { l:'الكود',           v: viewItem.asset_code },
              { l:'الاسم',           v: viewItem.asset_name },
              { l:'النوع',           v: viewItem.asset_type },
              { l:'الماركة',         v: viewItem.brand },
              { l:'الموديل',         v: viewItem.model },
              { l:'الرقم التسلسلي', v: viewItem.serial_no },
              { l:'الطاقة',          v: viewItem.capacity ? `${viewItem.capacity} ${viewItem.unit}` : null },
              { l:'الكمية',          v: viewItem.qty||1 },
              { l:'العميل',          v: viewItem.clients?.company_name },
              { l:'المشروع',         v: viewItem.projects?.project_name },
              { l:'الموقع',          v: viewItem.location },
              { l:'تاريخ التركيب',  v: viewItem.install_date?.split('T')[0] },
              { l:'انتهاء الضمان',  v: viewItem.warranty_expiry?.split('T')[0] },
              { l:'المورد',          v: viewItem.supplier },
              { l:'الحالة',          v: STATUSES.find(s=>s.v===viewItem.status)?.ar||viewItem.status },
            ].map(({ l, v }, i) => v ? (
              <div key={i} style={{ display:'flex', padding:'6px 0', borderBottom:'1px solid var(--cs-border)' }}>
                <span style={{ width:140, color:'var(--cs-text-muted)', fontSize:13 }}>{l}:</span>
                <span style={{ fontWeight:600, fontSize:13 }}>{String(v)}</span>
              </div>
            ) : null)}

            {/* تحليل التكاليف */}
            <div style={{ marginTop:16, background:'#F8FAFC', borderRadius:10, padding:14 }}>
              <div style={{ fontFamily:'Cairo,sans-serif', fontWeight:700, fontSize:14, marginBottom:10, color:'var(--cs-text)' }}>💰 تحليل التكاليف</div>
              {[
                { l:'سعر الشراء / وحدة',  v: fmtD(viewItem.purchase_price||0)+' ر.س',   c:'var(--cs-red)' },
                { l:'تكلفة التركيب',       v: fmtD(viewItem.installation_cost||0)+' ر.س',c:'var(--cs-orange)' },
                { l:'إجمالي التكلفة',      v: fmtD(fullCost(viewItem))+' ر.س',           c:'var(--cs-red)',  bold:true },
                { l:'سعر البيع / وحدة',   v: fmtD(viewItem.selling_price||0)+' ر.س',    c:'var(--cs-blue)' },
                { l:'إجمالي البيع',        v: fmtD(totalSell(viewItem))+' ر.س',          c:'var(--cs-blue)', bold:true },
                { l:'الربح',               v: `${profit(viewItem)>=0?'+':''}${fmtD(profit(viewItem))} ر.س`, c: profit(viewItem)>=0?'var(--cs-green)':'var(--cs-red)', bold:true },
                { l:'هامش الربح',          v: `${margin(viewItem)}%`,                     c: margin(viewItem)>=25?'var(--cs-green)':margin(viewItem)>=15?'var(--cs-orange)':'var(--cs-red)', bold:true },
              ].map(({ l, v, c, bold }, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--cs-border)' }}>
                  <span style={{ fontSize:13, color:'var(--cs-text-muted)' }}>{l}</span>
                  <span style={{ fontSize:13, fontWeight: bold?800:600, color:c }}>{v}</span>
                </div>
              ))}
            </div>

            {viewItem.notes && (
              <div style={{ marginTop:12, padding:'8px 12px', background:'var(--cs-gray-light)', borderRadius:8 }}>
                <div style={{ fontSize:11, color:'var(--cs-text-muted)', marginBottom:4 }}>ملاحظات</div>
                <div style={{ fontSize:13 }}>{viewItem.notes}</div>
              </div>
            )}
          </div>
          <style>{`@media print{body *{visibility:hidden}#eq-print,#eq-print *{visibility:visible}#eq-print{position:fixed;top:0;left:0;width:100%;max-height:none!important}}`}</style>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div className="card" style={{ width:'100%', maxWidth:620, maxHeight:'92vh', overflow:'auto', padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontFamily:'Cairo,sans-serif', fontWeight:700, fontSize:18 }}>{editId?'تعديل المعدة':'معدة جديدة'}</div>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

              {/* --- معلومات أساسية --- */}
              <div><label className="form-label">الكود *</label><input className="form-input" value={form.asset_code} onChange={e=>setForm({...form,asset_code:e.target.value})}/></div>
              <div><label className="form-label">نوع المعدة</label><select className="form-input" value={form.asset_type} onChange={e=>setForm({...form,asset_type:e.target.value})}>{ASSET_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">اسم المعدة</label><input className="form-input" value={form.asset_name} onChange={e=>setForm({...form,asset_name:e.target.value})}/></div>
              <div><label className="form-label">الماركة</label><input className="form-input" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></div>
              <div><label className="form-label">الموديل</label><input className="form-input" value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></div>
              <div><label className="form-label">الرقم التسلسلي</label><input className="form-input" dir="ltr" value={form.serial_no} onChange={e=>setForm({...form,serial_no:e.target.value})}/></div>
              <div style={{ display:'flex', gap:6 }}>
                <div style={{ flex:2 }}><label className="form-label">الطاقة</label><input className="form-input" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></div>
                <div style={{ flex:1 }}><label className="form-label">الوحدة</label><select className="form-input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
              </div>
              <div><label className="form-label">الكمية</label><input type="number" min="1" className="form-input" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/></div>

              {/* --- الربط --- */}
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">الموقع / الوحدة</label><input className="form-input" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div>
              <div><label className="form-label">المورد / Supplier</label><input className="form-input" value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></div>

              {/* --- تكاليف (خلفية مميزة) --- */}
              <div style={{ gridColumn:'1/-1', background:'#FEF9EC', borderRadius:8, padding:'10px 14px', border:'1px solid #FDE68A' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#92400E', marginBottom:10 }}>💰 التكاليف والأسعار</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label className="form-label">سعر الشراء / وحدة (ر.س) *</label>
                    <input type="number" min="0" className="form-input" value={form.purchase_price} onChange={e=>setForm({...form,purchase_price:e.target.value})}/>
                  </div>
                  <div>
                    <label className="form-label">سعر البيع / وحدة (ر.س)</label>
                    <input type="number" min="0" className="form-input" value={form.selling_price} onChange={e=>setForm({...form,selling_price:e.target.value})}/>
                  </div>
                  <div>
                    <label className="form-label">تكلفة التركيب (ر.س)</label>
                    <input type="number" min="0" className="form-input" value={form.installation_cost} onChange={e=>setForm({...form,installation_cost:e.target.value})}/>
                  </div>
                  {/* حساب تلقائي */}
                  <div style={{ background:'white', borderRadius:8, padding:'8px 12px', border:'1px solid var(--cs-border)' }}>
                    <div style={{ fontSize:11, color:'var(--cs-text-muted)', marginBottom:6 }}>📊 ملخص تلقائي</div>
                    <div style={{ fontSize:11, display:'flex', justifyContent:'space-between' }}>
                      <span>التكلفة الكاملة:</span>
                      <span style={{ color:'var(--cs-red)', fontWeight:700 }}>
                        {fmt((parseFloat(form.purchase_price)||0)*(parseInt(form.qty)||1)+(parseFloat(form.installation_cost)||0))} ر.س
                      </span>
                    </div>
                    <div style={{ fontSize:11, display:'flex', justifyContent:'space-between', marginTop:4 }}>
                      <span>إجمالي البيع:</span>
                      <span style={{ color:'var(--cs-blue)', fontWeight:700 }}>
                        {fmt((parseFloat(form.selling_price)||0)*(parseInt(form.qty)||1))} ر.س
                      </span>
                    </div>
                    {(parseFloat(form.selling_price)||0) > 0 && (
                      <div style={{ fontSize:11, display:'flex', justifyContent:'space-between', marginTop:4 }}>
                        <span>الهامش:</span>
                        <span style={{ fontWeight:700, color:
                          (() => {
                            const sell=(parseFloat(form.selling_price)||0)*(parseInt(form.qty)||1)
                            const cost=(parseFloat(form.purchase_price)||0)*(parseInt(form.qty)||1)+(parseFloat(form.installation_cost)||0)
                            const mg=sell>0?Math.round((sell-cost)/sell*100):0
                            return mg>=25?'var(--cs-green)':mg>=15?'var(--cs-orange)':'var(--cs-red)'
                          })()
                        }}>
                          {(() => {
                            const sell=(parseFloat(form.selling_price)||0)*(parseInt(form.qty)||1)
                            const cost=(parseFloat(form.purchase_price)||0)*(parseInt(form.qty)||1)+(parseFloat(form.installation_cost)||0)
                            return sell>0?Math.round((sell-cost)/sell*100)+'%':'—'
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* --- تواريخ وحالة --- */}
              <div><label className="form-label">تاريخ التركيب</label><input type="date" className="form-input" value={form.install_date} onChange={e=>setForm({...form,install_date:e.target.value})}/></div>
              <div><label className="form-label">انتهاء الضمان</label><input type="date" className="form-input" value={form.warranty_expiry} onChange={e=>setForm({...form,warranty_expiry:e.target.value})}/></div>
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">الحالة</label>
                <select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                  {STATUSES.map(s=><option key={s.v} value={s.v}>{s.ar}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
