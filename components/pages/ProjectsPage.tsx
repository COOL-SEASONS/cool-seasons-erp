'use client'
const generateCode_ProjectsPage = (rows: any[]) => {
  if(!rows || !rows.length) return 'P5620'
  const nums = rows
    .map((r:any) => r.project_code?.toString().replace('P','').replace(/\D/g,''))
    .filter(Boolean).map(Number).filter(n => !isNaN(n))
  if(!nums.length) return 'P5620'
  return 'P' + (Math.max(...nums) + 1)
}
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer} from 'lucide-react'

const EMPTY = { project_code:`P-${5620+Math.floor(Date.now()/1000)%9000}` as string, project_name:'', client_id:'', tech_id:'', start_date:'', end_date:'', status:'New', project_type:'', budget:'', actual_cost:'', location:'', completion_pct:0, notes:'' }

export default function ProjectsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewItem,setViewItem]=useState<any>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: p }, { data: c }, { data: t }] = await Promise.all([
      supabase.from('projects').select('*, clients(company_name), technicians(full_name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, company_name').eq('status', 'Active'),
      supabase.from('technicians').select('id, full_name').eq('status', 'Active'),
    ])
    setRows(p || [])
    setClients(c || [])
    setTechs(t || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.project_name?.toLowerCase().includes(search.toLowerCase()) || r.project_code?.includes(search))

  const save = async () => {
    if (!form.project_code || !form.project_name) return alert('الكود والاسم مطلوبان')
    setSaving(true)
    const payload = { ...form, budget: parseFloat(form.budget)||null, actual_cost: parseFloat(form.actual_cost)||null, completion_pct: parseFloat(form.completion_pct)||0 }
    if (editId) await supabase.from('projects').update(payload).eq('id', editId)
    else await supabase.from('projects').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا المشروع؟')) return
    await supabase.from('projects').delete().eq('id', id)
    load()
  }

  const statusColor: any = { 'In Progress': 'badge-blue', Completed: 'badge-green', 'On Hold': 'badge-amber', Cancelled: 'badge-red', New: 'badge-gray' }
  const statusAr: any = { 'In Progress': 'جاري', Completed: 'مكتمل', 'On Hold': 'متوقف', Cancelled: 'ملغي', New: 'جديد' }

  
  // طباعة تقرير شامل للمشروع
  const printProjectReport = async (project:any) => {
    // جلب كل البيانات المرتبطة بالمشروع
    const [copperRes, freonRes, ductRes, techRes, clientRes] = await Promise.all([
      supabase.from('copper_movements').select('*,technicians!copper_movements_tech_id_fkey(full_name),receiver_tech:technicians!copper_movements_receiver_tech_id_fkey(full_name)').eq('project_id', project.id).order('movement_date', {ascending: false}),
      supabase.from('freon_movements').select('*,technicians!freon_movements_tech_id_fkey(full_name)').eq('project_id', project.id).order('movement_date', {ascending: false}),
      supabase.from('duct_movements').select('*,technicians!duct_movements_tech_id_fkey(full_name)').eq('project_id', project.id).order('movement_date', {ascending: false}),
      supabase.from('technicians').select('id,full_name').eq('id', project.tech_id).maybeSingle(),
      supabase.from('clients').select('id,company_name,phone,email').eq('id', project.client_id).maybeSingle()
    ])
    
    const copperMovs = copperRes.data || []
    const freonTxs = freonRes.data || []
    const ductMovs = ductRes.data || []
    const tech = techRes.data
    const client = clientRes.data
    
    // الدكت - تجميع حسب النوع
    const DUCT_LABELS:any = {Galvanized:'🔩 معدني مجلفن', PreInsulated:'🟦 PIR Panel', Flexible:'🌀 مرن', Fiberglass:'🧱 فايبرجلاس', Spiral:'🔵 حلزوني'}
    const DUCT_UNITS:any = {Galvanized:'م²', PreInsulated:'لوح', Flexible:'م', Fiberglass:'م²', Spiral:'م'}
    const ductByType: any = {}
    ductMovs.forEach((m:any)=>{
      const key = m.duct_type
      if (!ductByType[key]) ductByType[key] = {type:DUCT_LABELS[key]||key, unit:DUCT_UNITS[key]||'', in:0, out:0, waste:0, costIn:0, costOut:0, tonnage:0, linear:0}
      if (m.movement_type==='IN') {
        ductByType[key].in += (m.quantity||0)
        ductByType[key].costIn += (m.total_cost||0)
        ductByType[key].tonnage += (m.cooling_tonnage||0)
        ductByType[key].linear += (m.linear_meters||0)
      } else {
        ductByType[key].out += (m.quantity||0)
        ductByType[key].waste += (m.waste_qty||0)
        ductByType[key].costOut += (m.total_cost||0)
        ductByType[key].tonnage -= (m.cooling_tonnage||0)
        ductByType[key].linear -= (m.linear_meters||0)
      }
    })
    
    // إجماليات الدكت للسعة والمتر الطولي
    const totalDuctTonnage = ductMovs.filter((m:any)=>m.movement_type==='IN').reduce((s:number,m:any)=>s+(m.cooling_tonnage||0),0) - ductMovs.filter((m:any)=>m.movement_type==='OUT').reduce((s:number,m:any)=>s+(m.cooling_tonnage||0),0)
    const totalDuctLinear = ductMovs.filter((m:any)=>m.movement_type==='IN').reduce((s:number,m:any)=>s+(m.linear_meters||0),0) - ductMovs.filter((m:any)=>m.movement_type==='OUT').reduce((s:number,m:any)=>s+(m.linear_meters||0),0)
    const ductCostOut = ductMovs.filter((m:any)=>m.movement_type==='OUT').reduce((s:number,m:any)=>s+(m.total_cost||0), 0)
    
    // حساب الإحصائيات
    const fmtN = (n:number) => Number(n||0).toLocaleString('ar-SA',{maximumFractionDigits:2})
    
    // النحاس
    const copperReceived = copperMovs.filter(m=>m.movement_type==='IN').reduce((s,m)=>s+(m.meters||0), 0)
    const copperUsed = copperMovs.filter(m=>m.movement_type==='OUT').reduce((s,m)=>s+(m.meters||0)+(m.waste_meters||0), 0)
    const copperBalance = copperReceived - copperUsed
    const copperWaste = copperMovs.filter(m=>m.movement_type==='OUT').reduce((s,m)=>s+(m.waste_meters||0), 0)
    const copperCostIn = copperMovs.filter(m=>m.movement_type==='IN').reduce((s,m)=>s+(m.total_cost||0), 0)
    const copperCostOut = copperMovs.filter(m=>m.movement_type==='OUT').reduce((s,m)=>s+(m.total_cost||0), 0)
    
    // الفريون
    const freonIn = freonTxs.filter(t=>t.movement_type==='IN').reduce((s,t)=>s+(t.kg||0), 0)
    const freonOut = freonTxs.filter(t=>t.movement_type==='OUT').reduce((s,t)=>s+(t.kg||0), 0)
    const freonBalance = freonIn - freonOut
    const freonCostIn = freonTxs.filter(t=>t.movement_type==='IN').reduce((s,t)=>s+(t.total_cost||0), 0)
    const freonCostOut = freonTxs.filter(t=>t.movement_type==='OUT').reduce((s,t)=>s+(t.total_cost||0), 0)
    
    // إجمالي تكلفة المواد
    const totalMaterialsCost = copperCostOut + freonCostOut + ductCostOut
    
    // المقاسات النحاسية المستخدمة
    const copperByPair: any = {}
    copperMovs.forEach(m=>{
      const key = `${m.liquid_size} × ${m.suction_size}`
      if (!copperByPair[key]) copperByPair[key] = {pair:key, in:0, out:0, waste:0, costIn:0, costOut:0}
      if (m.movement_type==='IN') {
        copperByPair[key].in += (m.meters||0)
        copperByPair[key].costIn += (m.total_cost||0)
      } else {
        copperByPair[key].out += (m.meters||0)
        copperByPair[key].waste += (m.waste_meters||0)
        copperByPair[key].costOut += (m.total_cost||0)
      }
    })
    
    // أنواع الفريون
    const freonByType: any = {}
    freonTxs.forEach(t=>{
      const key = t.freon_type || 'غير محدد'
      if (!freonByType[key]) freonByType[key] = {type:key, in:0, out:0, costIn:0, costOut:0}
      if (t.movement_type==='IN') {
        freonByType[key].in += (t.kg||0)
        freonByType[key].costIn += (t.total_cost||0)
      } else {
        freonByType[key].out += (t.kg||0)
        freonByType[key].costOut += (t.total_cost||0)
      }
    })
    
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>تقرير شامل للمشروع - ${project.project_name}</title>
<style>
  @media print { @page { size: A4; margin: 1.5cm; } }
  body { font-family: 'Tajawal', 'Cairo', Arial, sans-serif; padding: 20px; color: #1E293B; max-width: 900px; margin: 0 auto; line-height: 1.5; }
  .header { text-align: center; padding: 16px; border-bottom: 4px double #1E9CD7; margin-bottom: 20px; }
  .company { font-size: 24px; font-weight: 900; color: #1E9CD7; }
  .subtitle { font-size: 12px; color: #64748B; letter-spacing: 1px; margin-top: 4px; }
  .doc-title { font-size: 20px; font-weight: 800; margin-top: 14px; color: white; padding: 10px 24px; background: linear-gradient(135deg,#1E9CD7,#0F4C81); border-radius: 8px; display: inline-block; }
  .section { margin: 20px 0; }
  .section-title { font-size: 16px; font-weight: 800; color: #1E293B; padding: 8px 14px; background: #F1F5F9; border-right: 4px solid #1E9CD7; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
  th { background: #E0F2FE; color: #0C4A6E; text-align: right; padding: 8px 10px; border: 1px solid #BAE6FD; font-weight: 700; }
  td { padding: 7px 10px; border: 1px solid #E2E8F0; }
  .label { color: #64748B; font-size: 11px; font-weight: 600; }
  .value { font-weight: 700; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
  .stat-card { background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; text-align: center; }
  .stat-card.green { background: #F0FDF4; border-color: #16A34A; }
  .stat-card.red { background: #FEF2F2; border-color: #DC2626; }
  .stat-card.blue { background: #EFF6FF; border-color: #1E9CD7; }
  .stat-card.amber { background: #FFFBEB; border-color: #F59E0B; }
  .stat-label { font-size: 10px; color: #64748B; }
  .stat-value { font-size: 18px; font-weight: 900; margin-top: 4px; }
  .balance-positive { color: #16A34A; }
  .balance-negative { color: #DC2626; }
  .balance-zero { color: #64748B; }
  .totals-box { background: linear-gradient(135deg,#FEF3C7,#FFFBEB); border: 2px solid #F59E0B; border-radius: 10px; padding: 14px; margin: 16px 0; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals-row.main { font-size: 18px; font-weight: 900; color: #92400E; border-top: 2px solid #F59E0B; padding-top: 10px; margin-top: 8px; }
  .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #94A3B8; border-top: 1px dashed #CBD5E1; padding-top: 12px; }
  .empty { text-align: center; padding: 14px; color: #94A3B8; font-style: italic; font-size: 12px; }
  .no-data { background: #F8FAFC; padding: 12px; text-align: center; border-radius: 8px; color: #64748B; font-size: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="company">COOL SEASONS & DARAJA.STORE</div>
    <div class="subtitle">مواسم البرودة ودرجة للتكييف · شركة سعودية متخصصة</div>
    <div class="doc-title">📊 تقرير شامل للمشروع</div>
  </div>

  <!-- معلومات المشروع -->
  <div class="section">
    <div class="section-title">📋 معلومات المشروع الأساسية</div>
    <table>
      <tr><td class="label" style="width:25%">الكود</td><td class="value" style="font-family:monospace">${project.project_code||'-'}</td><td class="label" style="width:25%">الاسم</td><td class="value">${project.project_name||'-'}</td></tr>
      <tr><td class="label">العميل</td><td>${client?.company_name||'-'}</td><td class="label">الهاتف</td><td>${client?.phone||'-'}</td></tr>
      <tr><td class="label">الفني المسؤول</td><td>${tech?.full_name||'-'}</td><td class="label">الموقع</td><td>${project.location||'-'}</td></tr>
      <tr><td class="label">تاريخ البدء</td><td>${project.start_date||'-'}</td><td class="label">تاريخ الانتهاء</td><td>${project.end_date||'-'}</td></tr>
      <tr><td class="label">الميزانية</td><td class="value" style="color:#1E9CD7">${fmtN(project.budget||0)} ر.س</td><td class="label">التكلفة الفعلية</td><td class="value">${fmtN(project.actual_cost||0)} ر.س</td></tr>
      <tr><td class="label">نسبة الإنجاز</td><td class="value" style="color:#16A34A">${project.completion_pct||0}%</td><td class="label">الحالة</td><td class="value">${project.status||'-'}</td></tr>
    </table>
  </div>

  <!-- ملخص النحاس -->
  <div class="section">
    <div class="section-title">🔥 استهلاك النحاس</div>
    ${copperMovs.length === 0 ? '<div class="no-data">لا توجد حركات نحاس مرتبطة بهذا المشروع</div>' : `
    <div class="stats-grid">
      <div class="stat-card green"><div class="stat-label">📥 مستلم</div><div class="stat-value" style="color:#16A34A">${fmtN(copperReceived)} م</div></div>
      <div class="stat-card red"><div class="stat-label">📤 مستخدم</div><div class="stat-value" style="color:#DC2626">${fmtN(copperUsed)} م</div></div>
      <div class="stat-card amber"><div class="stat-label">⚠️ الفاقد</div><div class="stat-value" style="color:#D97706">${fmtN(copperWaste)} م</div></div>
      <div class="stat-card blue"><div class="stat-label">📦 الرصيد</div><div class="stat-value ${copperBalance>0?'balance-positive':copperBalance<0?'balance-negative':'balance-zero'}">${copperBalance>0?'+':''}${fmtN(copperBalance)} م</div></div>
    </div>
    <table>
      <thead><tr><th>المقاس</th><th>📥 مستلم</th><th>📤 مستخدم</th><th>⚠️ فاقد</th><th>الرصيد</th><th>تكلفة الاستلام</th><th>تكلفة الاستخدام</th></tr></thead>
      <tbody>
        ${Object.values(copperByPair).map((p:any)=>`
          <tr>
            <td class="value">${p.pair}</td>
            <td style="color:#16A34A">${fmtN(p.in)} م</td>
            <td style="color:#DC2626">${fmtN(p.out)} م</td>
            <td style="color:#D97706">${fmtN(p.waste)} م</td>
            <td class="value ${(p.in-p.out-p.waste)>0?'balance-positive':(p.in-p.out-p.waste)<0?'balance-negative':'balance-zero'}">${fmtN(p.in-p.out-p.waste)} م</td>
            <td>${fmtN(p.costIn)} ر.س</td>
            <td>${fmtN(p.costOut)} ر.س</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    `}
  </div>

  <!-- ملخص الفريون -->
  <div class="section">
    <div class="section-title">❄️ استهلاك الفريون</div>
    ${freonTxs.length === 0 ? '<div class="no-data">لا توجد حركات فريون مرتبطة بهذا المشروع</div>' : `
    <div class="stats-grid">
      <div class="stat-card green"><div class="stat-label">📥 مستلم</div><div class="stat-value" style="color:#16A34A">${fmtN(freonIn)} كغ</div></div>
      <div class="stat-card red"><div class="stat-label">📤 مستخدم</div><div class="stat-value" style="color:#DC2626">${fmtN(freonOut)} كغ</div></div>
      <div class="stat-card blue"><div class="stat-label">📦 الرصيد</div><div class="stat-value ${freonBalance>0?'balance-positive':freonBalance<0?'balance-negative':'balance-zero'}">${freonBalance>0?'+':''}${fmtN(freonBalance)} كغ</div></div>
      <div class="stat-card amber"><div class="stat-label">💰 التكلفة</div><div class="stat-value" style="color:#D97706">${fmtN(freonCostOut)} ر.س</div></div>
    </div>
    <table>
      <thead><tr><th>نوع الفريون</th><th>📥 مستلم</th><th>📤 مستخدم</th><th>الرصيد</th><th>تكلفة الاستلام</th><th>تكلفة الاستخدام</th></tr></thead>
      <tbody>
        ${Object.values(freonByType).map((f:any)=>`
          <tr>
            <td class="value">${f.type}</td>
            <td style="color:#16A34A">${fmtN(f.in)} كغ</td>
            <td style="color:#DC2626">${fmtN(f.out)} كغ</td>
            <td class="value ${(f.in-f.out)>0?'balance-positive':(f.in-f.out)<0?'balance-negative':'balance-zero'}">${fmtN(f.in-f.out)} كغ</td>
            <td>${fmtN(f.costIn)} ر.س</td>
            <td>${fmtN(f.costOut)} ر.س</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    `}
  </div>

  <!-- ملخص الدكت -->
  <div class="section">
    <div class="section-title">🏗️ استهلاك الدكت</div>
    ${ductMovs.length === 0 ? '<div class="no-data">لا توجد حركات دكت مرتبطة بهذا المشروع</div>' : `
    <table>
      <thead><tr><th>نوع الدكت</th><th>📥 مستلم</th><th>📤 مستخدم</th><th>الرصيد</th><th>❄️ طن</th><th>📏 طولي</th><th>تكلفة الاستخدام</th></tr></thead>
      <tbody>
        ${Object.values(ductByType).map((d:any)=>`
          <tr>
            <td class="value">${d.type}</td>
            <td style="color:#16A34A">${fmtN(d.in)} ${d.unit}</td>
            <td style="color:#DC2626">${fmtN(d.out)} ${d.unit}</td>
            <td class="value ${(d.in-d.out-d.waste)>0?'balance-positive':(d.in-d.out-d.waste)<0?'balance-negative':'balance-zero'}">${fmtN(d.in-d.out-d.waste)} ${d.unit}</td>
            <td style="color:#0C4A6E;font-weight:700">${d.tonnage!==0?fmtN(Math.abs(d.tonnage))+' طن':'—'}</td>
            <td style="color:#7C3AED;font-weight:700">${d.linear!==0?fmtN(Math.abs(d.linear))+' م':'—'}</td>
            <td>${fmtN(d.costOut)} ر.س</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="margin-top:10px;padding:10px;background:#F0F9FF;border-radius:8px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
      <div style="text-align:center"><div class="label">❄️ السعة الإجمالية</div><div style="font-size:18px;font-weight:900;color:#0C4A6E">${fmtN(Math.abs(totalDuctTonnage))} طن</div></div>
      <div style="text-align:center"><div class="label">📏 الطول الطولي الإجمالي</div><div style="font-size:18px;font-weight:900;color:#7C3AED">${fmtN(Math.abs(totalDuctLinear))} م</div></div>
    </div>
    `}
  </div>

  <!-- إجمالي تكلفة المواد -->
  <div class="totals-box">
    <div style="font-size:14px;font-weight:800;color:#92400E;margin-bottom:10px;text-align:center">💰 الملخص المالي للمواد</div>
    <div class="totals-row"><span>إجمالي تكلفة النحاس المُستخدم:</span><span class="value" style="color:#DC2626">${fmtN(copperCostOut)} ر.س</span></div>
    <div class="totals-row"><span>إجمالي تكلفة الفريون المُستخدم:</span><span class="value" style="color:#DC2626">${fmtN(freonCostOut)} ر.س</span></div>
    <div class="totals-row"><span>إجمالي تكلفة الدكت المُستخدم:</span><span class="value" style="color:#DC2626">${fmtN(ductCostOut)} ر.س</span></div>
    <div class="totals-row main"><span>📊 إجمالي تكلفة المواد للمشروع:</span><span>${fmtN(totalMaterialsCost)} ر.س</span></div>
    ${project.budget > 0 ? `<div class="totals-row" style="margin-top:8px;font-size:12px;color:#64748B"><span>نسبة المواد من الميزانية:</span><span class="value">${fmtN(totalMaterialsCost*100/project.budget)}%</span></div>` : ''}
  </div>

  <div class="footer">
    تم إنشاء التقرير: ${new Date().toLocaleString('ar-SA')} | COOL SEASONS ERP | تقرير محاسبي رسمي
  </div>

  <script>window.onload = () => { setTimeout(() => window.print(), 300); }</script>
</body>
</html>`
    
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    } else {
      alert('يرجى السماح للنوافذ المنبثقة لطباعة التقرير')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">المشاريع</div>
          <div className="page-subtitle">{rows.length} مشروع</div>
        </div>
        <button className="btn-primary" onClick={() => { setForm({...EMPTY,project_code:'P'+(rows.length+5620)});setEditId(null);setModal(true) }}><Plus size={16}/>مشروع جديد</button>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--cs-text-muted)' }} />
          <input className="form-input" style={{ paddingRight: 34 }} placeholder="بحث بالاسم أو الكود..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--cs-text-muted)' }}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>الكود</th><th>اسم المشروع</th><th>العميل</th><th>الفني</th>
                <th>الحالة</th><th>الإنجاز</th><th>الميزانية</th><th>إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--cs-text-muted)' }}>لا توجد مشاريع</td></tr>
                  : filtered.map(r => (
                    <tr key={r.id}>
                      <td><span style={{ fontFamily: 'monospace', background: 'var(--cs-blue-light)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{r.project_code}</span></td>
                      <td style={{ fontWeight: 600 }}>{r.project_name}</td>
                      <td>{r.clients?.company_name}</td>
                      <td>{r.technicians?.full_name}</td>
                      <td><span className={`badge ${statusColor[r.status]||'badge-gray'}`}>{statusAr[r.status]||r.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                          <div style={{ flex: 1, background: 'var(--cs-border)', borderRadius: 4, height: 6 }}>
                            <div style={{ width: `${r.completion_pct || 0}%`, background: 'var(--cs-blue)', height: 6, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--cs-text-muted)', minWidth: 30 }}>{r.completion_pct || 0}%</span>
                        </div>
                      </td>
                      <td style={{ direction: 'ltr' }}>{r.budget ? new Intl.NumberFormat('en').format(r.budget) + ' ر.س' : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => printProjectReport(r)} title="تقرير شامل" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-green)' }}><Printer size={15}/></button>
                          <button onClick={() => { setForm({ ...r, client_id: r.client_id||'', tech_id: r.tech_id||'' }); setEditId(r.id); setModal(true) }} title="تعديل" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-blue)' }}><Edit2 size={15}/></button>
                          <button onClick={() => del(r.id)} title="حذف" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-red)' }}><Trash2 size={15}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Cairo,sans-serif', fontWeight: 700, fontSize: 18 }}>{editId ? 'تعديل المشروع' : 'مشروع جديد'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'project_code', label: 'كود المشروع *' },
                { key: 'project_name', label: 'اسم المشروع *' },
              ].map(f => (
                <div key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" value={form[f.key]||''} onChange={e => setForm({...form,[f.key]:e.target.value})}/>
                </div>
              ))}
              <div>
                <label className="form-label">العميل</label>
                <select className="form-input" value={form.client_id||''} onChange={e => setForm({...form,client_id:e.target.value})}>
                  <option value="">اختر...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">الفني</label>
                <select className="form-input" value={form.tech_id||''} onChange={e => setForm({...form,tech_id:e.target.value})}>
                  <option value="">اختر...</option>
                  {techs.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">تاريخ البدء</label>
                <input type="date" className="form-input" value={form.start_date||''} onChange={e => setForm({...form,start_date:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">تاريخ الانتهاء</label>
                <input type="date" className="form-input" value={form.end_date||''} onChange={e => setForm({...form,end_date:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">الحالة</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
                  {['New','In Progress','On Hold','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">نوع المشروع</label>
                <input className="form-input" value={form.project_type||''} onChange={e => setForm({...form,project_type:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">الميزانية (ر.س)</label>
                <input type="number" className="form-input" value={form.budget||''} onChange={e => setForm({...form,budget:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">نسبة الإنجاز %</label>
                <input type="number" min="0" max="100" className="form-input" value={form.completion_pct||0} onChange={e => setForm({...form,completion_pct:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">الموقع</label>
                <input className="form-input" value={form.location||''} onChange={e => setForm({...form,location:e.target.value})}/>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">ملاحظات</label>
                <textarea className="form-input" rows={2} value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})}/>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
      {viewItem&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div id="view-print-area" className="card" style={{width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16}}>تفاصيل السجل</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'6px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:12,fontFamily:'Tajawal,sans-serif'}}><Printer size={14}/>طباعة</button>
                <button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-text-muted)'}}><X size={20}/></button>
              </div>
            </div>
            <div>
              {Object.entries(viewItem).filter(([k])=>!['id','created_at','updated_at'].includes(k)&&typeof viewItem[k]!=='object').map(([k,v]:any,i)=>
                v!=null&&v!==''?(
                  <div key={i} style={{display:'flex',padding:'8px 0',borderBottom:'1px solid var(--cs-border)'}}>
                    <span style={{width:160,color:'var(--cs-text-muted)',fontSize:12,fontWeight:600,flexShrink:0}}>{k.replace(/_/g,' ')}</span>
                    <span style={{fontWeight:600,fontSize:13}}>{String(v)}</span>
                  </div>
                ):null
              )}
            </div>
          </div>
          <style>{`@media print{body *{visibility:hidden}#view-print-area,#view-print-area *{visibility:visible}#view-print-area{position:fixed;top:0;left:0;width:100%;max-height:none!important}}`}</style>
        </div>
      )}
    </div>
  )
}
