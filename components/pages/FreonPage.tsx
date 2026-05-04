'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Edit2, Trash2, X, Save, Printer, ArrowDownCircle, ArrowUpCircle, Boxes } from 'lucide-react'

const FREON_TYPES = ['R-32','R-410A','R-22','R-407C','R-134a','R-404A','R-290','R-600a']
const BRANDS = ['Honeywell','Chemours','Daikin','Mexichem','Floron','SRF','Climalife','أخرى']
const ORIGINS = ['أمريكي','ياباني','صيني','مكسيكي','هندي','أوروبي','محلي','أخرى']
const REASONS_IN = ['شراء جديد','نقل من مشروع آخر','مرتجع من فني','تسوية مخزون']
const REASONS_OUT = ['تعبئة وحدة عميل','شحن مشروع جديد','صيانة وإصلاح','تسريب','نقل لمشروع آخر','تالف']

const fmt = (n:number) => Number(n||0).toLocaleString('ar-SA',{maximumFractionDigits:2})

export default function FreonPage(){
  const [movements,setMovements] = useState<any[]>([])
  const [stockByType,setStockByType] = useState<any[]>([])
  const [techs,setTechs] = useState<any[]>([])
  const [clients,setClients] = useState<any[]>([])
  const [projects,setProjects] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [search,setSearch] = useState('')
  const [filterType,setFilterType] = useState<'ALL'|'IN'|'OUT'>('ALL')
  const [modal,setModal] = useState(false)
  const [editId,setEditId] = useState<string|null>(null)
  const [saving,setSaving] = useState(false)

  const newCode = () => `FM-${100000 + Math.floor(Math.random()*900000)}`
  const newMov = ()=>({movement_code:newCode(),movement_date:new Date().toISOString().split('T')[0],movement_type:'IN',freon_type:'R-32',kg:'',num_cylinders:'1',kg_per_cylinder:'9',cost_per_cylinder:'',total_cost:'',project_id:'',tech_id:'',receiver_tech_id:'',client_id:'',brand:'Honeywell',origin:'أمريكي',unit_serial:'',reason:'شراء جديد',reference_no:'',notes:''})
  const [form,setForm] = useState<any>(newMov())

  const load = async () => {
    setLoading(true)
    const [m,s,t,cl,p] = await Promise.all([
      supabase.from('freon_movements').select('*,projects(project_name),technicians!freon_movements_tech_id_fkey(full_name),receiver_tech:technicians!freon_movements_receiver_tech_id_fkey(full_name),clients(company_name)').order('movement_date',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('freon_stock_by_type').select('*'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name')
    ])
    setMovements(m.data||[])
    setStockByType(s.data||[])
    setTechs(t.data||[])
    setClients(cl.data||[])
    setProjects(p.data||[])
    setLoading(false)
  }

  useEffect(()=>{load()},[])

  const openNew = (type:'IN'|'OUT'='IN') => {
    setEditId(null)
    setForm({...newMov(), movement_type:type, reason: type==='IN'?'شراء جديد':'تعبئة وحدة عميل'})
    setModal(true)
  }

  const openEdit = (m:any) => {
    setEditId(m.id)
    setForm({movement_code:m.movement_code,movement_date:m.movement_date?.split('T')[0]||'',movement_type:m.movement_type,freon_type:m.freon_type,kg:String(m.kg||''),num_cylinders:String(m.num_cylinders||0),kg_per_cylinder:m.num_cylinders>0?String((m.kg||0)/(m.num_cylinders||1)):'9',cost_per_cylinder:m.num_cylinders>0?String((m.total_cost||0)/(m.num_cylinders||1)):'',total_cost:String(m.total_cost||''),project_id:m.project_id||'',tech_id:m.tech_id||'',receiver_tech_id:m.receiver_tech_id||'',client_id:m.client_id||'',brand:m.brand||'Honeywell',origin:m.origin||'أمريكي',unit_serial:m.unit_serial||'',reason:m.reason||'',reference_no:m.reference_no||'',notes:m.notes||''})
    setModal(true)
  }

  const save = async () => {
    const kg = parseFloat(form.kg)||0
    const costPerCyl = parseFloat(form.cost_per_cylinder)||0
    const numCyls = parseInt(form.num_cylinders)||0
    const totalCost = form.movement_type === 'IN' ? (costPerCyl * numCyls) : (parseFloat(form.total_cost)||0)

    if (kg <= 0) { alert('الكمية بالكيلو مطلوبة'); return }
    if (form.movement_type === 'IN' && costPerCyl <= 0) { alert('تكلفة الأسطوانة الواحدة مطلوبة'); return }
    if (form.movement_type === 'IN' && numCyls <= 0) { alert('عدد الأسطوانات مطلوب'); return }

    if (form.movement_type === 'OUT' && !editId) {
      const stock = stockByType.find(s=>s.freon_type===form.freon_type)
      const available = stock?.current_kg || 0
      if (kg > available) {
        if (!confirm(`⚠️ المخزون المتاح ${fmt(available)}كغ غير كافٍ للسحب ${fmt(kg)}كغ.\nهل تريد المتابعة؟`)) return
      }
    }

    setSaving(true)

    let cost = totalCost
    if (form.movement_type === 'OUT') {
      const stock = stockByType.find(s=>s.freon_type===form.freon_type)
      const avgCost = stock?.avg_cost_per_kg || 0
      cost = Math.round(kg * avgCost * 100) / 100
    }

    const payload = {
      movement_code: form.movement_code.trim(),
      movement_date: form.movement_date,
      movement_type: form.movement_type,
      freon_type: form.freon_type,
      kg,
      num_cylinders: form.movement_type==='IN' ? numCyls : 0,
      total_cost: cost,
      project_id: form.project_id||null,
      tech_id: form.tech_id||null,
      receiver_tech_id: form.movement_type==='IN' ? (form.receiver_tech_id||null) : null,
      client_id: form.client_id||null,
      brand: form.movement_type==='IN' ? (form.brand||null) : null,
      origin: form.movement_type==='IN' ? (form.origin||null) : null,
      unit_serial: form.movement_type==='OUT' ? (form.unit_serial||null) : null,
      reason: form.reason||null,
      reference_no: form.reference_no||null,
      notes: form.notes||null
    }

    const {error} = editId
      ? await supabase.from('freon_movements').update(payload).eq('id',editId)
      : await supabase.from('freon_movements').insert(payload)

    if (error) alert('خطأ: ' + error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id:string) => {
    if (!confirm('حذف هذه الحركة؟')) return
    await supabase.from('freon_movements').delete().eq('id',id)
    load()
  }

  // طباعة سند منفرد
  const printMovement = (m:any) => {
    const isIN = m.movement_type === 'IN'
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>سند ${isIN?'استلام':'صرف'} فريون - ${m.movement_code}</title>
<style>
  @media print { @page { size: A5; margin: 1cm; } }
  body { font-family: 'Tajawal', 'Cairo', Arial, sans-serif; padding: 20px; color: #1E293B; max-width: 600px; margin: 0 auto; }
  .header { text-align: center; padding: 16px; border-bottom: 3px solid ${isIN?'#16A34A':'#DC2626'}; margin-bottom: 20px; }
  .company { font-size: 22px; font-weight: 900; color: #1E9CD7; }
  .subtitle { font-size: 11px; color: #64748B; letter-spacing: 1px; margin-top: 4px; }
  .doc-title { font-size: 18px; font-weight: 800; margin-top: 12px; color: ${isIN?'#16A34A':'#DC2626'}; padding: 6px 16px; background: ${isIN?'#F0FFF4':'#FEF2F2'}; border-radius: 8px; display: inline-block; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 12px; color: #475569; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #F1F5F9; text-align: right; padding: 8px 10px; border: 1px solid #CBD5E1; font-weight: 700; color: #475569; }
  td { padding: 8px 10px; border: 1px solid #E2E8F0; }
  .label { color: #64748B; font-size: 11px; }
  .value { font-weight: 700; }
  .totals { margin-top: 16px; background: ${isIN?'#F0FFF4':'#FEF2F2'}; border: 2px solid ${isIN?'#16A34A':'#DC2626'}; border-radius: 8px; padding: 12px 16px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals-row.main { font-size: 16px; font-weight: 900; color: ${isIN?'#16A34A':'#DC2626'}; border-top: 1px solid ${isIN?'#16A34A30':'#DC262630'}; padding-top: 8px; margin-top: 6px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; }
  .sig-box { border-top: 2px solid #1E293B; padding-top: 8px; text-align: center; font-size: 11px; }
  .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #94A3B8; border-top: 1px dashed #CBD5E1; padding-top: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="company">COOL SEASONS & DARAJA.STORE</div>
    <div class="subtitle">مواسم البرودة ودرجة للتكييف</div>
    <div class="doc-title">${isIN?'📥 سند استلام فريون':'📤 سند صرف فريون'}</div>
  </div>
  <div class="meta">
    <div><span class="label">رقم الحركة:</span> <span class="value" style="font-family:monospace">${m.movement_code||'-'}</span></div>
    <div><span class="label">التاريخ:</span> <span class="value">${m.movement_date||'-'}</span></div>
  </div>
  <table>
    <tr><th colspan="2" style="background:${isIN?'#16A34A':'#DC2626'};color:white;text-align:center;">📋 تفاصيل الحركة</th></tr>
    <tr><td class="label" style="width:40%">نوع الفريون</td><td class="value">${m.freon_type}</td></tr>
    <tr><td class="label">الكمية</td><td class="value" style="color:${isIN?'#16A34A':'#DC2626'};font-size:15px">${isIN?'+':'-'}${Number(m.kg||0).toLocaleString('ar-SA')} كغ</td></tr>
    ${isIN ? `<tr><td class="label">عدد الأسطوانات</td><td class="value">${m.num_cylinders||0} أسطوانة</td></tr>` : ''}
    ${isIN ? `<tr><td class="label">الماركة</td><td>${m.brand||'—'}</td></tr><tr><td class="label">المنشأ</td><td>${m.origin||'—'}</td></tr>` : ''}
    ${m.unit_serial ? `<tr><td class="label">رقم الوحدة</td><td>${m.unit_serial}</td></tr>` : ''}
  </table>
  <table>
    <tr><th colspan="2" style="background:#1E9CD7;color:white;text-align:center;">🔗 الربط</th></tr>
    ${m.projects?.project_name ? `<tr><td class="label" style="width:40%">المشروع</td><td class="value">${m.projects.project_name}</td></tr>` : ''}
    ${m.clients?.company_name ? `<tr><td class="label">العميل</td><td>${m.clients.company_name}</td></tr>` : ''}
    ${isIN && m.receiver_tech?.full_name ? `<tr><td class="label">الفني المستلم</td><td>${m.receiver_tech.full_name}</td></tr>` : ''}
    ${!isIN && m.technicians?.full_name ? `<tr><td class="label">الفني المنفذ</td><td>${m.technicians.full_name}</td></tr>` : ''}
    <tr><td class="label">السبب</td><td>${m.reason||'—'}</td></tr>
    ${m.reference_no ? `<tr><td class="label">المرجع/الفاتورة</td><td>${m.reference_no}</td></tr>` : ''}
  </table>
  <div class="totals">
    ${isIN ? `
      <div class="totals-row"><span>تكلفة الأسطوانة:</span><span class="value">${(m.num_cylinders>0?(m.total_cost/m.num_cylinders):0).toLocaleString('ar-SA',{maximumFractionDigits:2})} ر.س</span></div>
      <div class="totals-row"><span>تكلفة الكيلو:</span><span class="value">${(m.kg>0?(m.total_cost/m.kg):0).toLocaleString('ar-SA',{maximumFractionDigits:2})} ر.س</span></div>
      <div class="totals-row main"><span>إجمالي قيمة الاستلام:</span><span>${Number(m.total_cost||0).toLocaleString('ar-SA',{maximumFractionDigits:2})} ر.س</span></div>
    ` : `
      <div class="totals-row"><span>الكمية المستخدمة:</span><span class="value">${Number(m.kg||0).toLocaleString('ar-SA')} كغ</span></div>
      <div class="totals-row main"><span>إجمالي تكلفة المنصرف:</span><span>${Number(m.total_cost||0).toLocaleString('ar-SA',{maximumFractionDigits:2})} ر.س</span></div>
    `}
  </div>
  ${m.notes ? `<div style="margin-top:16px;padding:10px 14px;background:#FFFBEB;border-right:3px solid #F59E0B;border-radius:4px;font-size:12px;"><strong>ملاحظات:</strong> ${m.notes}</div>` : ''}
  <div class="signatures">
    <div class="sig-box">${isIN?'الفني المستلم':'الفني المنفذ'}</div>
    <div class="sig-box">المسؤول</div>
  </div>
  <div class="footer">تم الإنشاء: ${new Date().toLocaleString('ar-SA')} | COOL SEASONS ERP</div>
  <script>window.onload = () => { setTimeout(() => window.print(), 200); }</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() } else { alert('يرجى السماح للنوافذ المنبثقة') }
  }

  const filteredMovements = movements.filter(m=>{
    if (filterType !== 'ALL' && m.movement_type !== filterType) return false
    const s = search.toLowerCase()
    if (!s) return true
    return m.movement_code?.toLowerCase().includes(s)
        || m.freon_type?.toLowerCase().includes(s)
        || m.projects?.project_name?.toLowerCase().includes(s)
        || m.technicians?.full_name?.toLowerCase().includes(s)
        || m.reason?.toLowerCase().includes(s)
  })

  const totalStock = stockByType.reduce((s,p)=>s+(p.current_kg||0), 0)
  const totalReceived = stockByType.reduce((s,p)=>s+(p.total_received||0), 0)
  const totalUsed = stockByType.reduce((s,p)=>s+(p.total_used||0), 0)
  const totalValue = stockByType.reduce((s,p)=>s+((p.current_kg||0)*(p.avg_cost_per_kg||0)), 0)
  const lowStockTypes = stockByType.filter(p=>p.current_kg>0 && p.current_kg<3)

  const projectSummary = projects.map((p:any)=>{
    const inKg = movements.filter(m=>m.project_id===p.id && m.movement_type==='IN').reduce((s:number,m:any)=>s+(m.kg||0), 0)
    const outKg = movements.filter(m=>m.project_id===p.id && m.movement_type==='OUT').reduce((s:number,m:any)=>s+(m.kg||0), 0)
    const balance = inKg - outKg
    return { id: p.id, name: p.project_name, in: inKg, out: outKg, balance, status: balance>0?'surplus':balance<0?'deficit':'balanced' }
  }).filter((p:any) => p.in>0 || p.out>0)

  const totalSurplus = projectSummary.filter((p:any)=>p.balance>0).reduce((s:number,p:any)=>s+p.balance, 0)
  const totalDeficit = projectSummary.filter((p:any)=>p.balance<0).reduce((s:number,p:any)=>s+Math.abs(p.balance), 0)

  if (loading) return <div style={{padding:'4rem',textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>

  const selectedStock = stockByType.find(s=>s.freon_type===form.freon_type)
  const kgNum = parseFloat(form.kg)||0
  const usingFromAvg = (selectedStock?.avg_cost_per_kg||0) * kgNum

  return (
    <div style={{padding:'1rem 1.25rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:22,color:'var(--cs-text)'}}>❄️ سجل الفريون</h2>
          <div style={{fontSize:12,color:'var(--cs-text-muted)',marginTop:4}}>{stockByType.length} نوع | {movements.length} حركة</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn-primary" style={{background:'#16A34A'}} onClick={()=>openNew('IN')}><ArrowDownCircle size={16}/> + استلام</button>
          <button className="btn-primary" style={{background:'#DC2626'}} onClick={()=>openNew('OUT')}><ArrowUpCircle size={16}/> + استخدام</button>
          <button className="btn-secondary" onClick={()=>window.print()}><Printer size={15}/> طباعة</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginBottom:14}}>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>📦 المخزون الحالي</div><div style={{fontSize:24,fontWeight:800,color:'var(--cs-blue)'}}>{fmt(totalStock)} كغ</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>📥 إجمالي مستلم</div><div style={{fontSize:24,fontWeight:800,color:'#16A34A'}}>{fmt(totalReceived)} كغ</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>📤 إجمالي مستخدم</div><div style={{fontSize:24,fontWeight:800,color:'#DC2626'}}>{fmt(totalUsed)} كغ</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>💰 قيمة المخزون</div><div style={{fontSize:24,fontWeight:800,color:'var(--cs-green)'}}>{fmt(totalValue)} ر.س</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>⚠️ أنواع قاربت النفاد</div><div style={{fontSize:24,fontWeight:800,color:lowStockTypes.length>0?'var(--cs-orange)':'var(--cs-text-muted)'}}>{lowStockTypes.length}</div></div>
      </div>

      {lowStockTypes.length>0 && (
        <div className="card" style={{marginBottom:14,padding:'10px 14px',background:'#FEF3C7',border:'1px solid #FBBF24'}}>
          <div style={{fontSize:13,color:'#92400E'}}>
            ⚠️ <strong>أنواع قاربت على النفاد:</strong> {lowStockTypes.map(p=>`${p.freon_type} (${fmt(p.current_kg)}كغ)`).join(' · ')}
          </div>
        </div>
      )}

      {projectSummary.length > 0 && (
        <div className="card" style={{marginBottom:14,padding:'1rem 1.25rem',background:'linear-gradient(135deg, #FFF8E7 0%, #FEFCE8 100%)',border:'1px solid #FBBF2440'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
            <h3 style={{margin:0,fontSize:15,color:'#92400E'}}>📊 ملخص استهلاك الفريون حسب المشروع</h3>
            {(totalSurplus > 0 || totalDeficit > 0) && (
              <div style={{display:'flex',gap:14,fontSize:12}}>
                {totalSurplus > 0 && <span style={{color:'#16A34A',fontWeight:700}}>🟢 الفائض: {fmt(totalSurplus)} كغ</span>}
                {totalDeficit > 0 && <span style={{color:'#DC2626',fontWeight:700}}>🔴 النقص: {fmt(totalDeficit)} كغ</span>}
              </div>
            )}
          </div>
          {totalSurplus > 0 && totalDeficit > 0 && (
            <div style={{background:'#DBEAFE',borderRadius:6,padding:'8px 12px',fontSize:12,color:'#1E40AF',marginBottom:10}}>
              💡 يمكنك استخدام {fmt(Math.min(totalSurplus, totalDeficit))} كغ من المشاريع ذات الفائض لتغطية المشاريع ذات النقص
            </div>
          )}
          <div style={{overflow:'auto',background:'white',borderRadius:8}}>
            <table className="cs-table" style={{margin:0,fontSize:13}}>
              <thead><tr><th style={{textAlign:'right'}}>المشروع</th><th>📥 مستلم</th><th>📤 مستخدم</th><th>الرصيد</th><th>الحالة</th></tr></thead>
              <tbody>
                {projectSummary.map((p:any)=>(
                  <tr key={p.id}>
                    <td style={{textAlign:'right',fontWeight:600}}>{p.name}</td>
                    <td style={{color:'#16A34A',fontWeight:600}}>{fmt(p.in)} كغ</td>
                    <td style={{color:'#DC2626',fontWeight:600}}>{fmt(p.out)} كغ</td>
                    <td style={{fontWeight:800,color:p.balance>0?'#16A34A':p.balance<0?'#DC2626':'#64748B'}}>{p.balance>0?'+':''}{fmt(p.balance)} كغ</td>
                    <td>
                      {p.status==='surplus' && <span style={{background:'#DCFCE7',color:'#15803D',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700}}>فائض ✅</span>}
                      {p.status==='deficit' && <span style={{background:'#FEE2E2',color:'#991B1B',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700}}>نقص ⚠️</span>}
                      {p.status==='balanced' && <span style={{background:'#F1F5F9',color:'#475569',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700}}>متوازن</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stockByType.length>0 && (
        <div className="card" style={{marginBottom:14,padding:14}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10,color:'var(--cs-text)'}}>
            <Boxes size={15} style={{display:'inline',verticalAlign:-2,marginLeft:6}}/> المخزون حسب نوع الفريون
          </div>
          <div style={{overflow:'auto'}}>
            <table className="cs-table" style={{margin:0,fontSize:13}}>
              <thead><tr><th>نوع الفريون</th><th>📥 مستلم</th><th>📤 مستخدم</th><th>📦 المتاح</th><th>متوسط/كغ</th><th>القيمة</th></tr></thead>
              <tbody>
                {stockByType.map((p,i)=>(
                  <tr key={i} style={{background:p.current_kg<3?'#FEF3C7':undefined}}>
                    <td style={{fontWeight:700,color:'var(--cs-blue)'}}>{p.freon_type}</td>
                    <td style={{color:'#16A34A',fontWeight:600}}>{fmt(p.total_received)} كغ<span style={{fontSize:10,color:'#94A3B8',marginRight:4}}>({p.total_cylinders_received} أسطوانة)</span></td>
                    <td style={{color:'#DC2626',fontWeight:600}}>{fmt(p.total_used)} كغ</td>
                    <td style={{fontWeight:800,fontSize:15,color:p.current_kg<3?'var(--cs-orange)':'var(--cs-blue)'}}>{fmt(p.current_kg)} كغ</td>
                    <td style={{color:'var(--cs-orange)'}}>{fmt(p.avg_cost_per_kg)} ر.س</td>
                    <td style={{color:'var(--cs-green)',fontWeight:700}}>{fmt(p.current_kg * p.avg_cost_per_kg)} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{padding:'10px 14px',marginBottom:14,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <Search size={15} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:32}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button className={filterType==='ALL'?'btn-primary':'btn-secondary'} style={{padding:'6px 14px',fontSize:12}} onClick={()=>setFilterType('ALL')}>الكل ({movements.length})</button>
          <button className={filterType==='IN'?'btn-primary':'btn-secondary'} style={{padding:'6px 14px',fontSize:12,background:filterType==='IN'?'#16A34A':undefined}} onClick={()=>setFilterType('IN')}>📥 استلام</button>
          <button className={filterType==='OUT'?'btn-primary':'btn-secondary'} style={{padding:'6px 14px',fontSize:12,background:filterType==='OUT'?'#DC2626':undefined}} onClick={()=>setFilterType('OUT')}>📤 استخدام</button>
        </div>
      </div>

      <div className="card" style={{padding:0,overflow:'auto'}}>
        <table className="cs-table" style={{margin:0,fontSize:13}}>
          <thead><tr><th>الكود</th><th>التاريخ</th><th>النوع</th><th>الفريون</th><th>الكمية</th><th>الأسطوانات</th><th>التكلفة</th><th>المشروع</th><th>الفني</th><th>السبب</th><th>إجراءات</th></tr></thead>
          <tbody>
            {filteredMovements.length===0 ? (
              <tr><td colSpan={11} style={{textAlign:'center',padding:'2rem',color:'var(--cs-text-muted)'}}>لا توجد حركات</td></tr>
            ) : filteredMovements.map(m=>(
              <tr key={m.id} style={{background:m.movement_type==='IN'?'#F0FFF4':'#FEF2F2'}}>
                <td style={{fontFamily:'monospace',fontSize:11}}>{m.movement_code}</td>
                <td style={{fontSize:11}}>{m.movement_date}</td>
                <td>
                  {m.movement_type==='IN' && <span style={{color:'#16A34A',fontWeight:700,fontSize:12}}><ArrowDownCircle size={13} style={{display:'inline',verticalAlign:-2}}/> استلام</span>}
                  {m.movement_type==='OUT' && <span style={{color:'#DC2626',fontWeight:700,fontSize:12}}><ArrowUpCircle size={13} style={{display:'inline',verticalAlign:-2}}/> استخدام</span>}
                </td>
                <td style={{fontWeight:600,fontSize:12}}>{m.freon_type}</td>
                <td style={{fontWeight:700,color:m.movement_type==='IN'?'#16A34A':'#DC2626'}}>{m.movement_type==='IN'?'+':'-'}{fmt(m.kg)} كغ</td>
                <td>{m.movement_type==='IN' ? `${m.num_cylinders||0} أسطوانة` : '—'}</td>
                <td style={{color:'var(--cs-green)',fontWeight:600}}>{fmt(m.total_cost)} ر.س</td>
                <td style={{fontSize:12}}>{m.projects?.project_name || '—'}</td>
                <td style={{fontSize:12}}>{m.movement_type==='IN' ? (m.receiver_tech?.full_name || '—') : (m.technicians?.full_name || '—')}</td>
                <td style={{fontSize:12}}>{m.reason || '—'}</td>
                <td>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>printMovement(m)} title="طباعة السند" style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                    <button onClick={()=>openEdit(m)} title="تعديل" style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={14}/></button>
                    <button onClick={()=>del(m.id)} title="حذف" style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setModal(false)}>
          <div className="card" style={{maxWidth:780,width:'100%',maxHeight:'90vh',overflow:'auto',padding:0}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid var(--cs-border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h3 style={{margin:0,fontSize:16}}>{form.movement_type==='IN' ? '📥 حركة استلام فريون' : '📤 حركة استخدام فريون'}{editId && ' (تعديل)'}</h3>
              <button onClick={()=>setModal(false)} style={{background:'transparent',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>

            <div style={{padding:20}}>
              {!editId && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                  <button className={form.movement_type==='IN'?'btn-primary':'btn-secondary'} style={{padding:10,background:form.movement_type==='IN'?'#16A34A':undefined,border:form.movement_type!=='IN'?'1px dashed #cbd5e1':undefined}} onClick={()=>setForm({...form,movement_type:'IN',reason:'شراء جديد'})}><ArrowDownCircle size={16}/> استلام (إضافة فريون)</button>
                  <button className={form.movement_type==='OUT'?'btn-primary':'btn-secondary'} style={{padding:10,background:form.movement_type==='OUT'?'#DC2626':undefined,border:form.movement_type!=='OUT'?'1px dashed #cbd5e1':undefined}} onClick={()=>setForm({...form,movement_type:'OUT',reason:'تعبئة وحدة عميل'})}><ArrowUpCircle size={16}/> استخدام (نقص فريون)</button>
                </div>
              )}

              <div style={{background:'#E8F6FC',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'var(--cs-blue)'}}>
                💡 {form.movement_type==='IN' ? 'سجّل عملية شراء واحدة لأي عدد من الأسطوانات. أدخل العدد + إجمالي الكيلوغرامات + تكلفة الأسطوانة الواحدة.' : 'سجّل ما استخدمه الفني من الفريون. التكلفة محسوبة تلقائياً من متوسط الاستلامات.'}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label className="form-label">رقم الحركة *</label><input className="form-input" value={form.movement_code} onChange={e=>setForm({...form,movement_code:e.target.value})}/></div>
                <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.movement_date} onChange={e=>setForm({...form,movement_date:e.target.value})}/></div>

                <div style={{gridColumn:'1/-1'}}>
                  <label className="form-label">نوع الفريون *</label>
                  <select className="form-input" value={form.freon_type} onChange={e=>setForm({...form,freon_type:e.target.value})}>
                    {FREON_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {form.movement_type==='OUT' && selectedStock && (
                  <div style={{gridColumn:'1/-1',background:'#F1F5F9',borderRadius:8,padding:'10px 14px',fontSize:13,display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                    <span>📦 المتاح حالياً من {form.freon_type}:</span>
                    <span style={{fontWeight:700,color:selectedStock.current_kg<3?'var(--cs-orange)':'var(--cs-blue)'}}>{fmt(selectedStock.current_kg)} كغ | متوسط التكلفة: {fmt(selectedStock.avg_cost_per_kg)} ر.س/كغ</span>
                  </div>
                )}

                {form.movement_type==='IN' ? (
                  <>
                    <div>
                      <label className="form-label">عدد الأسطوانات *</label>
                      <input type="number" min="1" max="100" className="form-input" style={{textAlign:'center',fontWeight:700,fontSize:16}} value={form.num_cylinders} onChange={e=>{
                        const n = e.target.value
                        const kpc = parseFloat(form.kg_per_cylinder)||0
                        const total = (parseInt(n)||0) * kpc
                        setForm({...form,num_cylinders:n,kg:total>0?String(total):''})
                      }}/>
                    </div>
                    <div>
                      <label className="form-label">وزن الأسطوانة (كغ) *</label>
                      <input type="number" min="0.1" step="0.1" className="form-input" style={{textAlign:'center',fontWeight:700,fontSize:16}} value={form.kg_per_cylinder} onChange={e=>{
                        const kpc = e.target.value
                        const n = parseInt(form.num_cylinders)||0
                        const total = n * (parseFloat(kpc)||0)
                        setForm({...form,kg_per_cylinder:kpc,kg:total>0?String(total):''})
                      }}/>
                    </div>
                    <div style={{gridColumn:'1/-1',background:'#FFFDE7',borderRadius:8,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',border:'2px solid #FBBF24'}}>
                      <div>
                        <div style={{fontSize:11,color:'var(--cs-text-muted)'}}>⚖️ الكمية الإجمالية المحسوبة</div>
                        <div style={{fontSize:24,fontWeight:900,color:'var(--cs-blue)'}}>{fmt(parseFloat(form.kg)||0)} كغ</div>
                      </div>
                      <div style={{fontSize:13,color:'var(--cs-text-muted)',textAlign:'left'}}>
                        <div>{form.num_cylinders||0} أسطوانة × {form.kg_per_cylinder||0} كغ</div>
                        <div style={{fontSize:11,marginTop:2}}>= {fmt((parseInt(form.num_cylinders)||0) * (parseFloat(form.kg_per_cylinder)||0))} كغ</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{gridColumn:'1/-1'}}>
                    <label className="form-label">الكمية المستخدمة (كغ) *</label>
                    <input type="number" min="0.01" step="0.01" className="form-input" style={{background:'#FFFDE7',fontWeight:700,fontSize:16,textAlign:'center'}} value={form.kg} onChange={e=>setForm({...form,kg:e.target.value})}/>
                  </div>
                )}

                {form.movement_type==='IN' ? (
                  <div style={{gridColumn:'1/-1'}}>
                    <label className="form-label">💰 تكلفة الأسطوانة الواحدة (ر.س) *</label>
                    <input type="number" min="0" step="0.01" className="form-input" style={{background:'#F0FFF4',fontWeight:700,fontSize:16}} placeholder="مثلاً: 450" value={form.cost_per_cylinder} onChange={e=>setForm({...form,cost_per_cylinder:e.target.value})}/>
                    {parseFloat(form.cost_per_cylinder)>0 && parseInt(form.num_cylinders)>0 && kgNum>0 && (
                      <div style={{marginTop:8,padding:'12px 14px',background:'linear-gradient(135deg, #DCFCE7 0%, #DBEAFE 100%)',borderRadius:8,border:'2px solid #16A34A'}}>
                        <div style={{fontSize:11,color:'var(--cs-text-muted)',marginBottom:8,fontWeight:600,textAlign:'center'}}>💰 الحساب التلقائي:</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,fontSize:13}}>
                          <div style={{background:'white',padding:'10px',borderRadius:6,textAlign:'center'}}>
                            <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>تكلفة الأسطوانة</div>
                            <div style={{fontSize:16,fontWeight:800,color:'var(--cs-green)'}}>{fmt(parseFloat(form.cost_per_cylinder))} ر.س</div>
                          </div>
                          <div style={{background:'white',padding:'10px',borderRadius:6,textAlign:'center'}}>
                            <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>تكلفة الكيلو</div>
                            <div style={{fontSize:16,fontWeight:800,color:'var(--cs-blue)'}}>{fmt(parseFloat(form.cost_per_cylinder)/parseFloat(form.kg_per_cylinder||'1'))} ر.س</div>
                          </div>
                          <div style={{background:'#FEF3C7',padding:'10px',borderRadius:6,textAlign:'center',border:'2px solid #FBBF24'}}>
                            <div style={{fontSize:10,color:'#92400E',fontWeight:700}}>الإجمالي</div>
                            <div style={{fontSize:18,fontWeight:900,color:'#92400E'}}>{fmt(parseFloat(form.cost_per_cylinder)*parseInt(form.num_cylinders))} ر.س</div>
                          </div>
                        </div>
                        <div style={{fontSize:11,color:'var(--cs-text-muted)',marginTop:8,textAlign:'center'}}>
                          {parseFloat(form.cost_per_cylinder)} × {parseInt(form.num_cylinders)} أسطوانة = {fmt(parseFloat(form.cost_per_cylinder)*parseInt(form.num_cylinders))} ر.س
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  kgNum>0 && (
                    <div style={{gridColumn:'1/-1',padding:'8px 12px',background:'#FFF8E7',borderRadius:6,fontSize:13,textAlign:'center'}}>
                      💰 التكلفة المحسوبة تلقائياً: <strong style={{color:'var(--cs-orange)',fontSize:15}}>{fmt(usingFromAvg)} ر.س</strong>
                      <span style={{fontSize:11,color:'var(--cs-text-muted)',marginRight:8}}>({fmt(kgNum)} كغ × {fmt(selectedStock?.avg_cost_per_kg||0)} ر.س)</span>
                    </div>
                  )
                )}

                <div style={{gridColumn:'1/-1'}}>
                  <label className="form-label">📁 المشروع {form.movement_type==='OUT'?'*':'(اختياري)'}</label>
                  <select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}>
                    <option value="">— {form.movement_type==='IN'?'مخزون عام':'بدون مشروع'} —</option>
                    {projects.map((p:any)=><option key={p.id} value={p.id}>{p.project_name}</option>)}
                  </select>
                </div>

                {form.movement_type==='OUT' && (
                  <>
                    <div><label className="form-label">الفني المنفذ</label>
                      <select className="form-input" value={form.tech_id} onChange={e=>setForm({...form,tech_id:e.target.value})}>
                        <option value="">— اختر —</option>
                        {techs.map((t:any)=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    </div>
                    <div><label className="form-label">العميل</label>
                      <select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}>
                        <option value="">— اختر —</option>
                        {clients.map((c:any)=><option key={c.id} value={c.id}>{c.company_name}</option>)}
                      </select>
                    </div>
                    <div style={{gridColumn:'1/-1'}}><label className="form-label">رقم الوحدة (اختياري)</label>
                      <input className="form-input" placeholder="رقم الوحدة..." value={form.unit_serial} onChange={e=>setForm({...form,unit_serial:e.target.value})}/>
                    </div>
                  </>
                )}

                {form.movement_type==='IN' && (
                  <>
                    <div><label className="form-label">الماركة</label>
                      <select className="form-input" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}>
                        {BRANDS.map(b=><option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div><label className="form-label">المنشأ</label>
                      <select className="form-input" value={form.origin} onChange={e=>setForm({...form,origin:e.target.value})}>
                        {ORIGINS.map(o=><option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div style={{gridColumn:'1/-1'}}>
                      <label className="form-label">👤 الفني المستلم من المورد (اختياري)</label>
                      <select className="form-input" value={form.receiver_tech_id} onChange={e=>setForm({...form,receiver_tech_id:e.target.value})}>
                        <option value="">— لم يحدد —</option>
                        {techs.map((t:any)=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <div><label className="form-label">السبب</label>
                  <select className="form-input" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}>
                    {(form.movement_type==='IN'?REASONS_IN:REASONS_OUT).map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div><label className="form-label">المرجع/رقم الفاتورة</label>
                  <input className="form-input" placeholder="رقم الفاتورة..." value={form.reference_no} onChange={e=>setForm({...form,reference_no:e.target.value})}/>
                </div>

                <div style={{gridColumn:'1/-1'}}>
                  <label className="form-label">ملاحظات</label>
                  <textarea className="form-input" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
                </div>
              </div>

              <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
                <button className="btn-secondary" onClick={()=>setModal(false)}>إلغاء</button>
                <button className="btn-primary" style={{background:form.movement_type==='IN'?'#16A34A':'#DC2626'}} onClick={save} disabled={saving}>
                  <Save size={15}/>{saving?'جاري...':editId?'حفظ التعديلات':'حفظ الحركة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
