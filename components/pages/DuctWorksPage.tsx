'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Edit2, Trash2, X, Save, Printer, ArrowDownCircle, ArrowUpCircle, Boxes } from 'lucide-react'

// أنواع الدكت
const DUCT_TYPES = [
  {key:'Galvanized', label:'🔩 معدني مجلفن', unit:'m2', unitLabel:'م²', color:'#64748B', emoji:'🔩'},
  {key:'PreInsulated', label:'🟦 PIR Panel معزول', unit:'panel', unitLabel:'لوح', color:'#1E9CD7', emoji:'🟦'},
  {key:'Flexible', label:'🌀 مرن (Flex)', unit:'m', unitLabel:'م طولي', color:'#F59E0B', emoji:'🌀'},
  {key:'Fiberglass', label:'🧱 فايبرجلاس', unit:'m2', unitLabel:'م²', color:'#16A34A', emoji:'🧱'},
  {key:'Spiral', label:'🔵 حلزوني (Spiral)', unit:'m', unitLabel:'م طولي', color:'#7C3AED', emoji:'🔵'}
]

const GAUGES = [0.5, 0.6, 0.7, 0.8, 1.0, 1.2]
const DIAMETERS = [4, 5, 6, 8, 10, 12, 14, 16, 18, 20]
const SHEET_SIZES = ['1.22 × 2.44m', '1.00 × 2.00m', '1.50 × 3.00m', '1.20 × 2.40m', 'مخصص']
const PANEL_SIZES = ['1.20 × 3.00m', '1.20 × 4.00m', '1.50 × 3.00m', 'مخصص']
const INSULATION_DENSITIES = [25, 32, 48, 60]
const INSULATION_TYPES = ['PIR', 'Phenolic', 'PU', 'Fiberglass']
const THICKNESSES = [10, 15, 20, 25, 30, 50]
const BRANDS = ['Kingspan','Trocellen','Armacell','Rockwool','محلي','أخرى']
const ORIGINS = ['أمريكي','ألماني','إيطالي','تركي','صيني','محلي','أخرى']
const REASONS_IN = ['شراء جديد','نقل من مشروع آخر','مرتجع من فني','تسوية مخزون']
const REASONS_OUT = ['تركيب رئيسي','تركيب فرعي','صيانة وإصلاح','نقل لمشروع آخر','تالف']

const fmt = (n:number) => Number(n||0).toLocaleString('ar-SA',{maximumFractionDigits:2})
const getDuctType = (key:string) => DUCT_TYPES.find(t=>t.key===key) || DUCT_TYPES[0]

export default function DuctWorksPage(){
  const [movements,setMovements] = useState<any[]>([])
  const [stockBySpec,setStockBySpec] = useState<any[]>([])
  const [techs,setTechs] = useState<any[]>([])
  const [clients,setClients] = useState<any[]>([])
  const [projects,setProjects] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [search,setSearch] = useState('')
  const [filterType,setFilterType] = useState<'ALL'|'IN'|'OUT'>('ALL')
  const [activeTab,setActiveTab] = useState<string>('ALL')
  const [modal,setModal] = useState(false)
  const [editId,setEditId] = useState<string|null>(null)
  const [saving,setSaving] = useState(false)

  const newCode = () => `DM-${100000 + Math.floor(Math.random()*900000)}`
  
  const newMov = (ductType='Galvanized')=>({
    movement_code: newCode(),
    movement_date: new Date().toISOString().split('T')[0],
    movement_type: 'IN',
    duct_type: ductType,
    gauge_mm: '0.7',
    diameter_inch: '8',
    sheet_size: '1.22 × 2.44m',
    insulation_density: '25',
    insulation_type: 'PIR',
    thickness_mm: '25',
    is_insulated: false,
    quantity: '',
    unit: getDuctType(ductType).unit,
    num_pieces: '1',
    qty_per_piece: '',
    waste_qty: '0',
    cost_per_piece: '',
    total_cost: '',
    cooling_tonnage: '',
    linear_meters: '',
    duct_width_cm: '',
    duct_height_cm: '',
    calculation_method: 'Materials',
    project_id: '',
    tech_id: '',
    receiver_tech_id: '',
    client_id: '',
    brand: 'Kingspan',
    origin: 'أمريكي',
    unit_serial: '',
    reason: 'شراء جديد',
    reference_no: '',
    notes: ''
  })
  
  const [form,setForm] = useState<any>(newMov())

  const load = async () => {
    setLoading(true)
    const [m,s,t,cl,p] = await Promise.all([
      supabase.from('duct_movements').select('*,projects(project_name),technicians!duct_movements_tech_id_fkey(full_name),receiver_tech:technicians!duct_movements_receiver_tech_id_fkey(full_name),clients(company_name)').order('movement_date',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('duct_stock_by_spec').select('*'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name')
    ])
    setMovements(m.data||[])
    setStockBySpec(s.data||[])
    setTechs(t.data||[])
    setClients(cl.data||[])
    setProjects(p.data||[])
    setLoading(false)
  }

  useEffect(()=>{load()},[])

  const openNew = (type:'IN'|'OUT'='IN') => {
    setEditId(null)
    const ductType = activeTab !== 'ALL' ? activeTab : 'Galvanized'
    setForm({...newMov(ductType), movement_type:type, reason: type==='IN'?'شراء جديد':'تركيب رئيسي'})
    setModal(true)
  }

  const openEdit = (m:any) => {
    setEditId(m.id)
    setForm({
      movement_code: m.movement_code,
      movement_date: m.movement_date?.split('T')[0]||'',
      movement_type: m.movement_type,
      duct_type: m.duct_type,
      gauge_mm: String(m.gauge_mm||'0.7'),
      diameter_inch: String(m.diameter_inch||'8'),
      sheet_size: m.sheet_size||'1.22 × 2.44m',
      insulation_density: String(m.insulation_density||'25'),
      insulation_type: m.insulation_type||'PIR',
      thickness_mm: String(m.thickness_mm||'25'),
      is_insulated: m.is_insulated||false,
      quantity: String(m.quantity||''),
      unit: m.unit||getDuctType(m.duct_type).unit,
      num_pieces: String(m.num_pieces||0),
      qty_per_piece: m.num_pieces>0 ? String((m.quantity||0)/(m.num_pieces||1)) : '',
      waste_qty: String(m.waste_qty||0),
      cost_per_piece: m.num_pieces>0 ? String((m.total_cost||0)/(m.num_pieces||1)) : '',
      total_cost: String(m.total_cost||''),
      cooling_tonnage: String(m.cooling_tonnage||''),
      linear_meters: String(m.linear_meters||''),
      duct_width_cm: String(m.duct_width_cm||''),
      duct_height_cm: String(m.duct_height_cm||''),
      calculation_method: m.calculation_method || 'Materials',
      project_id: m.project_id||'',
      tech_id: m.tech_id||'',
      receiver_tech_id: m.receiver_tech_id||'',
      client_id: m.client_id||'',
      brand: m.brand||'Kingspan',
      origin: m.origin||'أمريكي',
      unit_serial: m.unit_serial||'',
      reason: m.reason||'',
      reference_no: m.reference_no||'',
      notes: m.notes||''
    })
    setModal(true)
  }

  const save = async () => {
    const qty = parseFloat(form.quantity)||0
    const waste = parseFloat(form.waste_qty)||0
    const costPerPiece = parseFloat(form.cost_per_piece)||0
    const numPieces = parseInt(form.num_pieces)||0
    const totalCost = form.movement_type === 'IN' ? (costPerPiece * numPieces) : (parseFloat(form.total_cost)||0)
    const ductInfo = getDuctType(form.duct_type)

    const method = form.calculation_method
    if (method === 'Tonnage') {
      const tn = parseFloat(form.cooling_tonnage)||0
      if (tn <= 0) { alert('السعة بالطن مطلوبة'); return }
      if (form.movement_type === 'IN' && parseFloat(form.total_cost) <= 0) { alert('إجمالي التكلفة مطلوب'); return }
    } else if (method === 'Linear') {
      const lm = parseFloat(form.linear_meters)||0
      if (lm <= 0) { alert('المتر الطولي مطلوب'); return }
      if (form.movement_type === 'IN' && parseFloat(form.total_cost) <= 0) { alert('إجمالي التكلفة مطلوب'); return }
    } else {
      if (qty <= 0) { alert(`الكمية بـ ${ductInfo.unitLabel} مطلوبة`); return }
      if (form.movement_type === 'IN' && costPerPiece <= 0) { alert('تكلفة القطعة الواحدة مطلوبة'); return }
      if (form.movement_type === 'IN' && numPieces <= 0) { alert('عدد القطع مطلوب'); return }
    }

    if (form.movement_type === 'OUT' && !editId) {
      const matchingStock = stockBySpec.find(s => s.duct_type===form.duct_type)
      const available = matchingStock?.current_qty || 0
      const required = qty + waste
      if (required > available) {
        if (!confirm(`⚠️ المخزون المتاح ${fmt(available)} ${ductInfo.unitLabel} غير كافٍ للسحب ${fmt(required)} ${ductInfo.unitLabel}.\nهل تريد المتابعة؟`)) return
      }
    }

    setSaving(true)

    let cost = totalCost
    if (form.movement_type === 'OUT') {
      const stock = stockBySpec.find(s => s.duct_type===form.duct_type)
      const avgCost = stock?.avg_cost_per_unit || 0
      cost = Math.round((qty + waste) * avgCost * 100) / 100
    }

    // الحقول حسب نوع الدكت
    const isGalvanizedOrFiber = form.duct_type==='Galvanized' || form.duct_type==='Fiberglass'
    const isPreInsulated = form.duct_type==='PreInsulated'
    const isFlexOrSpiral = form.duct_type==='Flexible' || form.duct_type==='Spiral'

    let finalQty = qty
    let finalCost = cost
    if (method === 'Tonnage') {
      finalQty = parseFloat(form.cooling_tonnage) || 1
      finalCost = parseFloat(form.total_cost) || 0
    } else if (method === 'Linear') {
      finalQty = parseFloat(form.linear_meters) || 1
      finalCost = parseFloat(form.total_cost) || 0
    }
    
    const payload:any = {
      movement_code: form.movement_code.trim(),
      movement_date: form.movement_date,
      movement_type: form.movement_type,
      duct_type: method === 'Materials' ? form.duct_type : 'Galvanized',
      calculation_method: method,
      gauge_mm: (method === 'Materials' && isGalvanizedOrFiber) ? (parseFloat(form.gauge_mm)||null) : null,
      diameter_inch: (method === 'Materials' && isFlexOrSpiral) ? (parseFloat(form.diameter_inch)||null) : null,
      sheet_size: (method === 'Materials' && (form.duct_type==='Galvanized' || isPreInsulated)) ? (form.sheet_size||null) : null,
      insulation_density: (method === 'Materials' && (isPreInsulated || form.duct_type==='Fiberglass')) ? (parseInt(form.insulation_density)||null) : null,
      insulation_type: (method === 'Materials' && isPreInsulated) ? (form.insulation_type||null) : null,
      thickness_mm: (method === 'Materials' && (isPreInsulated || form.duct_type==='Fiberglass')) ? (parseInt(form.thickness_mm)||null) : null,
      is_insulated: (method === 'Materials' && form.duct_type==='Flexible') ? form.is_insulated : false,
      quantity: finalQty,
      unit: method === 'Tonnage' ? 'tonnage' : (method === 'Linear' ? 'm' : ductInfo.unit),
      num_pieces: form.movement_type==='IN' ? numPieces : 0,
      waste_qty: form.movement_type==='OUT' ? waste : 0,
      total_cost: finalCost,
      project_id: form.project_id||null,
      tech_id: form.tech_id||null,
      receiver_tech_id: form.movement_type==='IN' ? (form.receiver_tech_id||null) : null,
      client_id: form.client_id||null,
      brand: form.movement_type==='IN' ? (form.brand||null) : null,
      origin: form.movement_type==='IN' ? (form.origin||null) : null,
      unit_serial: form.movement_type==='OUT' ? (form.unit_serial||null) : null,
      reason: form.reason||null,
      reference_no: form.reference_no||null,
      notes: form.notes||null,
      cooling_tonnage: parseFloat(form.cooling_tonnage)||null,
      linear_meters: parseFloat(form.linear_meters)||null,
      duct_width_cm: parseFloat(form.duct_width_cm)||null,
      duct_height_cm: parseFloat(form.duct_height_cm)||null
    }

    const {error} = editId
      ? await supabase.from('duct_movements').update(payload).eq('id',editId)
      : await supabase.from('duct_movements').insert(payload)

    if (error) alert('خطأ: ' + error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id:string) => {
    if (!confirm('حذف هذه الحركة؟')) return
    await supabase.from('duct_movements').delete().eq('id',id)
    load()
  }

  // طباعة سند منفرد
  const printMovement = (m:any) => {
    const isIN = m.movement_type === 'IN'
    const ductInfo = getDuctType(m.duct_type)
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>سند ${isIN?'استلام':'صرف'} دكت</title>
<style>
  @media print { @page { size: A5; margin: 1cm; } }
  body { font-family: 'Tajawal', 'Cairo', Arial, sans-serif; padding: 20px; color: #1E293B; max-width: 600px; margin: 0 auto; }
  .header { text-align: center; padding: 16px; border-bottom: 3px solid ${isIN?'#16A34A':'#DC2626'}; margin-bottom: 20px; }
  .company { font-size: 22px; font-weight: 900; color: #1E9CD7; }
  .doc-title { font-size: 18px; font-weight: 800; margin-top: 12px; color: ${isIN?'#16A34A':'#DC2626'}; padding: 6px 16px; background: ${isIN?'#F0FFF4':'#FEF2F2'}; border-radius: 8px; display: inline-block; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #F1F5F9; text-align: right; padding: 8px 10px; border: 1px solid #CBD5E1; font-weight: 700; }
  td { padding: 8px 10px; border: 1px solid #E2E8F0; }
  .label { color: #64748B; font-size: 11px; }
  .value { font-weight: 700; }
  .totals { margin-top: 16px; background: ${isIN?'#F0FFF4':'#FEF2F2'}; border: 2px solid ${isIN?'#16A34A':'#DC2626'}; border-radius: 8px; padding: 12px 16px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals-row.main { font-size: 16px; font-weight: 900; color: ${isIN?'#16A34A':'#DC2626'}; border-top: 1px solid; padding-top: 8px; margin-top: 6px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; }
  .sig-box { border-top: 2px solid #1E293B; padding-top: 8px; text-align: center; font-size: 11px; }
  .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #94A3B8; padding-top: 12px; }
</style></head>
<body>
  <div class="header">
    <div class="company">COOL SEASONS & DARAJA.STORE</div>
    <div class="doc-title">${isIN?'📥 سند استلام دكت':'📤 سند صرف دكت'}</div>
  </div>
  <div class="meta">
    <div><span class="label">رقم الحركة:</span> <span class="value" style="font-family:monospace">${m.movement_code||'-'}</span></div>
    <div><span class="label">التاريخ:</span> <span class="value">${m.movement_date||'-'}</span></div>
  </div>
  <table>
    <tr><th colspan="2" style="background:${isIN?'#16A34A':'#DC2626'};color:white;text-align:center;">📋 تفاصيل الحركة</th></tr>
    <tr><td class="label" style="width:40%">نوع الدكت</td><td class="value">${ductInfo.label}</td></tr>
    ${m.gauge_mm ? `<tr><td class="label">السمك</td><td>${m.gauge_mm} mm</td></tr>` : ''}
    ${m.diameter_inch ? `<tr><td class="label">القطر</td><td>${m.diameter_inch}"</td></tr>` : ''}
    ${m.sheet_size ? `<tr><td class="label">المقاس</td><td>${m.sheet_size}</td></tr>` : ''}
    ${m.insulation_type ? `<tr><td class="label">نوع العزل</td><td>${m.insulation_type} (${m.insulation_density||'-'} kg/m³)</td></tr>` : ''}
    ${m.thickness_mm ? `<tr><td class="label">سمك العزل</td><td>${m.thickness_mm} mm</td></tr>` : ''}
    <tr><td class="label">الكمية</td><td class="value" style="color:${isIN?'#16A34A':'#DC2626'};font-size:15px">${isIN?'+':'-'}${Number(m.quantity||0).toLocaleString('ar-SA')} ${ductInfo.unitLabel}</td></tr>
    ${isIN ? `<tr><td class="label">عدد القطع</td><td class="value">${m.num_pieces||0} قطعة</td></tr>` : ''}
    ${m.waste_qty>0 ? `<tr><td class="label">الفاقد</td><td style="color:#D97706">${Number(m.waste_qty).toLocaleString('ar-SA')} ${ductInfo.unitLabel}</td></tr>` : ''}
    ${isIN ? `<tr><td class="label">الماركة</td><td>${m.brand||'—'}</td></tr><tr><td class="label">المنشأ</td><td>${m.origin||'—'}</td></tr>` : ''}
  </table>
  <table>
    <tr><th colspan="2" style="background:#1E9CD7;color:white;text-align:center;">🔗 الربط</th></tr>
    ${m.projects?.project_name ? `<tr><td class="label" style="width:40%">المشروع</td><td class="value">${m.projects.project_name}</td></tr>` : ''}
    ${m.clients?.company_name ? `<tr><td class="label">العميل</td><td>${m.clients.company_name}</td></tr>` : ''}
    ${isIN && m.receiver_tech?.full_name ? `<tr><td class="label">الفني المستلم</td><td>${m.receiver_tech.full_name}</td></tr>` : ''}
    ${!isIN && m.technicians?.full_name ? `<tr><td class="label">الفني المنفذ</td><td>${m.technicians.full_name}</td></tr>` : ''}
    <tr><td class="label">السبب</td><td>${m.reason||'—'}</td></tr>
  </table>
  <div class="totals">
    ${isIN ? `
      <div class="totals-row"><span>تكلفة القطعة:</span><span class="value">${(m.num_pieces>0?(m.total_cost/m.num_pieces):0).toLocaleString('ar-SA',{maximumFractionDigits:2})} ر.س</span></div>
      <div class="totals-row"><span>تكلفة الـ ${ductInfo.unitLabel}:</span><span class="value">${(m.quantity>0?(m.total_cost/m.quantity):0).toLocaleString('ar-SA',{maximumFractionDigits:2})} ر.س</span></div>
      <div class="totals-row main"><span>إجمالي قيمة الاستلام:</span><span>${Number(m.total_cost||0).toLocaleString('ar-SA',{maximumFractionDigits:2})} ر.س</span></div>
    ` : `
      <div class="totals-row"><span>المستخدم + الفاقد:</span><span class="value">${(Number(m.quantity||0)+Number(m.waste_qty||0)).toLocaleString('ar-SA')} ${ductInfo.unitLabel}</span></div>
      <div class="totals-row main"><span>إجمالي تكلفة المنصرف:</span><span>${Number(m.total_cost||0).toLocaleString('ar-SA',{maximumFractionDigits:2})} ر.س</span></div>
    `}
  </div>
  ${m.notes ? `<div style="margin-top:16px;padding:10px 14px;background:#FFFBEB;border-right:3px solid #F59E0B;border-radius:4px;font-size:12px;"><strong>ملاحظات:</strong> ${m.notes}</div>` : ''}
  <div class="signatures">
    <div class="sig-box">${isIN?'الفني المستلم':'الفني المنفذ'}</div>
    <div class="sig-box">المسؤول</div>
  </div>
  <div class="footer">تم الإنشاء: ${new Date().toLocaleString('ar-SA')} | COOL SEASONS ERP</div>
  <script>window.onload=()=>{setTimeout(()=>window.print(),200);}</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() } else { alert('يرجى السماح للنوافذ المنبثقة') }
  }

  // فلترة الحركات
  const filteredMovements = movements.filter(m=>{
    if (activeTab !== 'ALL' && m.duct_type !== activeTab) return false
    if (filterType !== 'ALL' && m.movement_type !== filterType) return false
    const s = search.toLowerCase()
    if (!s) return true
    return m.movement_code?.toLowerCase().includes(s)
        || m.duct_type?.toLowerCase().includes(s)
        || m.projects?.project_name?.toLowerCase().includes(s)
        || m.technicians?.full_name?.toLowerCase().includes(s)
        || m.reason?.toLowerCase().includes(s)
  })

  // فلترة المخزون حسب التاب
  const filteredStock = activeTab === 'ALL' ? stockBySpec : stockBySpec.filter(s => s.duct_type === activeTab)

  // KPIs (شاملة لكل الأنواع - الكميات بوحدات مختلفة لذا نعرضها كأعداد)
  const totalRecords = movements.length
  const totalIN = movements.filter(m=>m.movement_type==='IN').length
  const totalOUT = movements.filter(m=>m.movement_type==='OUT').length
  const totalValue = stockBySpec.reduce((s,p)=>s+((p.current_qty||0)*(p.avg_cost_per_unit||0)), 0)
  // إجماليات إضافية
  const totalTonnage = movements.filter(m=>m.movement_type==='IN').reduce((s,m)=>s+(m.cooling_tonnage||0), 0) - movements.filter(m=>m.movement_type==='OUT').reduce((s,m)=>s+(m.cooling_tonnage||0), 0)
  const totalLinear = movements.filter(m=>m.movement_type==='IN').reduce((s,m)=>s+(m.linear_meters||0), 0) - movements.filter(m=>m.movement_type==='OUT').reduce((s,m)=>s+(m.linear_meters||0), 0)
  
  // حسب النوع
  const typeStats = DUCT_TYPES.map(t=>{
    const stocks = stockBySpec.filter(s=>s.duct_type===t.key)
    const totalQty = stocks.reduce((s,p)=>s+(p.current_qty||0), 0)
    const totalCost = stocks.reduce((s,p)=>s+((p.current_qty||0)*(p.avg_cost_per_unit||0)), 0)
    return {...t, totalQty, totalCost, hasStock: totalQty>0}
  })

  // ملخص المشاريع
  const projectSummary = projects.map((p:any)=>{
    const projMovs = movements.filter(m=>m.project_id===p.id)
    if (projMovs.length === 0) return null
    
    const byType: any = {}
    projMovs.forEach(m=>{
      if (!byType[m.duct_type]) byType[m.duct_type] = {in:0, out:0, unit:getDuctType(m.duct_type).unitLabel}
      if (m.movement_type==='IN') byType[m.duct_type].in += (m.quantity||0)
      else byType[m.duct_type].out += (m.quantity||0) + (m.waste_qty||0)
    })
    
    return { id: p.id, name: p.project_name, byType }
  }).filter(Boolean)

  if (loading) return <div style={{padding:'4rem',textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>

  const ductInfo = getDuctType(form.duct_type)
  const qtyNum = parseFloat(form.quantity)||0
  const wasteNum = parseFloat(form.waste_qty)||0
  const matchingStock = stockBySpec.find(s => s.duct_type===form.duct_type)
  const usingFromAvg = (matchingStock?.avg_cost_per_unit||0) * (qtyNum + wasteNum)

  return (
    <div style={{padding:'1rem 1.25rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:22,color:'var(--cs-text)'}}>🏗️ سجل الدكت</h2>
          <div style={{fontSize:12,color:'var(--cs-text-muted)',marginTop:4}}>{stockBySpec.length} مواصفة | {movements.length} حركة | 5 أنواع مدعومة</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn-primary" style={{background:'#16A34A'}} onClick={()=>openNew('IN')}><ArrowDownCircle size={16}/> + استلام</button>
          <button className="btn-primary" style={{background:'#DC2626'}} onClick={()=>openNew('OUT')}><ArrowUpCircle size={16}/> + استخدام</button>
          <button className="btn-secondary" onClick={()=>window.print()}><Printer size={15}/> طباعة</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10,marginBottom:14}}>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>📦 السجلات</div><div style={{fontSize:22,fontWeight:800,color:'var(--cs-blue)'}}>{totalRecords}</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>📥 استلام</div><div style={{fontSize:22,fontWeight:800,color:'#16A34A'}}>{totalIN}</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>📤 استخدام</div><div style={{fontSize:22,fontWeight:800,color:'#DC2626'}}>{totalOUT}</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>❄️ السعة (طن)</div><div style={{fontSize:22,fontWeight:800,color:'#0C4A6E'}}>{fmt(totalTonnage)}</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>📏 الطول الطولي</div><div style={{fontSize:22,fontWeight:800,color:'#7C3AED'}}>{fmt(totalLinear)} م</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>💰 قيمة المخزون</div><div style={{fontSize:22,fontWeight:800,color:'var(--cs-green)'}}>{fmt(totalValue)} ر.س</div></div>
      </div>

      {/* بطاقات الأنواع */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10,marginBottom:14}}>
        {typeStats.map(t=>(
          <div key={t.key} className="card" style={{padding:'12px 14px',borderRight:`4px solid ${t.color}`,opacity:t.hasStock?1:0.5,cursor:'pointer'}} onClick={()=>setActiveTab(t.key)}>
            <div style={{fontSize:11,color:t.color,fontWeight:700,marginBottom:4}}>{t.label}</div>
            <div style={{fontSize:18,fontWeight:800}}>{fmt(t.totalQty)} <span style={{fontSize:11,color:'var(--cs-text-muted)'}}>{t.unitLabel}</span></div>
            <div style={{fontSize:11,color:'var(--cs-green)',marginTop:2}}>{fmt(t.totalCost)} ر.س</div>
          </div>
        ))}
      </div>

      {/* ملخص المشاريع */}
      {projectSummary.length > 0 && (
        <div className="card" style={{marginBottom:14,padding:'1rem 1.25rem',background:'linear-gradient(135deg, #FFF8E7 0%, #FEFCE8 100%)',border:'1px solid #FBBF2440'}}>
          <h3 style={{margin:0,fontSize:15,color:'#92400E',marginBottom:10}}>📊 ملخص استهلاك الدكت حسب المشروع</h3>
          <div style={{overflow:'auto',background:'white',borderRadius:8}}>
            <table className="cs-table" style={{margin:0,fontSize:13}}>
              <thead><tr><th style={{textAlign:'right'}}>المشروع</th>{DUCT_TYPES.map(t=><th key={t.key}>{t.emoji} {t.label.substring(2)}</th>)}</tr></thead>
              <tbody>
                {projectSummary.map((p:any)=>(
                  <tr key={p.id}>
                    <td style={{textAlign:'right',fontWeight:600}}>{p.name}</td>
                    {DUCT_TYPES.map(t=>{
                      const data = p.byType[t.key]
                      if (!data) return <td key={t.key} style={{color:'#94A3B8',fontSize:11}}>—</td>
                      const balance = data.in - data.out
                      return (
                        <td key={t.key} style={{fontSize:11}}>
                          <div style={{color:'#16A34A'}}>📥 {fmt(data.in)}</div>
                          <div style={{color:'#DC2626'}}>📤 {fmt(data.out)}</div>
                          <div style={{fontWeight:700,color:balance>0?'#16A34A':balance<0?'#DC2626':'#64748B'}}>
                            {balance>0?'+':''}{fmt(balance)} {data.unit}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* تابات الأنواع */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
        <button className={activeTab==='ALL'?'btn-primary':'btn-secondary'} style={{padding:'8px 14px',fontSize:12}} onClick={()=>setActiveTab('ALL')}>🌐 الكل</button>
        {DUCT_TYPES.map(t=>(
          <button key={t.key} className={activeTab===t.key?'btn-primary':'btn-secondary'} style={{padding:'8px 14px',fontSize:12,background:activeTab===t.key?t.color:undefined}} onClick={()=>setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* المخزون حسب المواصفة */}
      {filteredStock.length>0 && (
        <div className="card" style={{marginBottom:14,padding:14}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10,color:'var(--cs-text)'}}>
            <Boxes size={15} style={{display:'inline',verticalAlign:-2,marginLeft:6}}/> المخزون حسب المواصفة
          </div>
          <div style={{overflow:'auto'}}>
            <table className="cs-table" style={{margin:0,fontSize:13}}>
              <thead><tr><th>النوع</th><th>المواصفة</th><th>📥 مستلم</th><th>📤 مستخدم</th><th>📦 المتاح</th><th>متوسط/وحدة</th><th>القيمة</th></tr></thead>
              <tbody>
                {filteredStock.map((p,i)=>{
                  const ti = getDuctType(p.duct_type)
                  return (
                    <tr key={i} style={{background:p.current_qty<5?'#FEF3C7':undefined}}>
                      <td><span style={{background:`${ti.color}15`,color:ti.color,padding:'3px 8px',borderRadius:4,fontSize:11,fontWeight:700}}>{ti.label}</span></td>
                      <td style={{fontSize:11,color:'var(--cs-text-muted)'}}>{p.spec_summary}</td>
                      <td style={{color:'#16A34A',fontWeight:600}}>{fmt(p.total_received)} {ti.unitLabel}<span style={{fontSize:10,color:'#94A3B8',marginRight:4}}>({p.total_pieces_received} ق)</span></td>
                      <td style={{color:'#DC2626',fontWeight:600}}>{fmt(p.total_used)} {ti.unitLabel}</td>
                      <td style={{fontWeight:800,fontSize:14,color:p.current_qty<5?'var(--cs-orange)':'var(--cs-blue)'}}>{fmt(p.current_qty)} {ti.unitLabel}</td>
                      <td style={{color:'var(--cs-orange)'}}>{fmt(p.avg_cost_per_unit)} ر.س</td>
                      <td style={{color:'var(--cs-green)',fontWeight:700}}>{fmt(p.current_qty * p.avg_cost_per_unit)} ر.س</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* فلاتر البحث */}
      <div className="card" style={{padding:'10px 14px',marginBottom:14,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <Search size={15} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:32}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button className={filterType==='ALL'?'btn-primary':'btn-secondary'} style={{padding:'6px 14px',fontSize:12}} onClick={()=>setFilterType('ALL')}>الكل ({filteredMovements.length})</button>
          <button className={filterType==='IN'?'btn-primary':'btn-secondary'} style={{padding:'6px 14px',fontSize:12,background:filterType==='IN'?'#16A34A':undefined}} onClick={()=>setFilterType('IN')}>📥 استلام</button>
          <button className={filterType==='OUT'?'btn-primary':'btn-secondary'} style={{padding:'6px 14px',fontSize:12,background:filterType==='OUT'?'#DC2626':undefined}} onClick={()=>setFilterType('OUT')}>📤 استخدام</button>
        </div>
      </div>

      {/* جدول الحركات */}
      <div className="card" style={{padding:0,overflow:'auto'}}>
        <table className="cs-table" style={{margin:0,fontSize:13}}>
          <thead><tr><th>الكود</th><th>التاريخ</th><th>الحركة</th><th>النوع</th><th>المواصفة</th><th>الكمية</th><th>❄️ طن</th><th>📏 طولي</th><th>الفاقد</th><th>التكلفة</th><th>المشروع</th><th>الفني</th><th>إجراءات</th></tr></thead>
          <tbody>
            {filteredMovements.length===0 ? (
              <tr><td colSpan={13} style={{textAlign:'center',padding:'2rem',color:'var(--cs-text-muted)'}}>لا توجد حركات</td></tr>
            ) : filteredMovements.map(m=>{
              const ti = getDuctType(m.duct_type)
              const spec = m.duct_type==='Galvanized' ? `${m.gauge_mm||'?'}mm` : 
                          m.duct_type==='Flexible' || m.duct_type==='Spiral' ? `${m.diameter_inch||'?'}"` :
                          m.duct_type==='PreInsulated' ? `${m.insulation_type||'?'} ${m.thickness_mm||'?'}mm` :
                          `${m.thickness_mm||'?'}mm`
              return (
                <tr key={m.id} style={{background:m.movement_type==='IN'?'#F0FFF4':'#FEF2F2'}}>
                  <td style={{fontFamily:'monospace',fontSize:11}}>{m.movement_code}</td>
                  <td style={{fontSize:11}}>{m.movement_date}</td>
                  <td>
                    {m.movement_type==='IN' && <span style={{color:'#16A34A',fontWeight:700,fontSize:11}}>📥 استلام</span>}
                    {m.movement_type==='OUT' && <span style={{color:'#DC2626',fontWeight:700,fontSize:11}}>📤 استخدام</span>}
                  </td>
                  <td><span style={{background:`${ti.color}15`,color:ti.color,padding:'2px 6px',borderRadius:4,fontSize:10,fontWeight:700}}>{ti.emoji} {ti.label.substring(2,12)}</span></td>
                  <td style={{fontSize:11}}>{spec}</td>
                  <td style={{fontWeight:700,color:m.movement_type==='IN'?'#16A34A':'#DC2626'}}>{m.movement_type==='IN'?'+':'-'}{fmt(m.quantity)} {ti.unitLabel}</td>
                  <td style={{fontSize:11,color:'#0C4A6E',fontWeight:600}}>{m.cooling_tonnage>0 ? `${fmt(m.cooling_tonnage)} طن` : '—'}</td>
                  <td style={{fontSize:11,color:'#7C3AED',fontWeight:600}}>{m.linear_meters>0 ? `${fmt(m.linear_meters)} م` : '—'}</td>
                  <td style={{color:'var(--cs-orange)',fontSize:11}}>{m.waste_qty>0 ? `${fmt(m.waste_qty)}` : '—'}</td>
                  <td style={{color:'var(--cs-green)',fontWeight:600}}>{fmt(m.total_cost)} ر.س</td>
                  <td style={{fontSize:11}}>{m.projects?.project_name || '—'}</td>
                  <td style={{fontSize:11}}>{m.movement_type==='IN' ? (m.receiver_tech?.full_name || '—') : (m.technicians?.full_name || '—')}</td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>printMovement(m)} title="طباعة" style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                      <button onClick={()=>openEdit(m)} title="تعديل" style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={14}/></button>
                      <button onClick={()=>del(m.id)} title="حذف" style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* النموذج */}
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setModal(false)}>
          <div className="card" style={{maxWidth:820,width:'100%',maxHeight:'92vh',overflow:'auto',padding:0}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid var(--cs-border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h3 style={{margin:0,fontSize:16}}>{form.movement_type==='IN' ? '📥 حركة استلام دكت' : '📤 حركة استخدام دكت'}{editId && ' (تعديل)'}</h3>
              <button onClick={()=>setModal(false)} style={{background:'transparent',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>

            <div style={{padding:20}}>
              {!editId && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                  <button className={form.movement_type==='IN'?'btn-primary':'btn-secondary'} style={{padding:10,background:form.movement_type==='IN'?'#16A34A':undefined,border:form.movement_type!=='IN'?'1px dashed #cbd5e1':undefined}} onClick={()=>setForm({...form,movement_type:'IN',reason:'شراء جديد'})}><ArrowDownCircle size={16}/> استلام</button>
                  <button className={form.movement_type==='OUT'?'btn-primary':'btn-secondary'} style={{padding:10,background:form.movement_type==='OUT'?'#DC2626':undefined,border:form.movement_type!=='OUT'?'1px dashed #cbd5e1':undefined}} onClick={()=>setForm({...form,movement_type:'OUT',reason:'تركيب رئيسي'})}><ArrowUpCircle size={16}/> استخدام</button>
                </div>
              )}

              {/* 🎯 اختيار طريقة الحساب */}
              <div style={{marginBottom:14}}>
                <label className="form-label" style={{fontSize:13,fontWeight:700}}>🎯 طريقة الحساب *</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  {[
                    {key:'Tonnage', label:'❄️ بالطن', desc:'السعة التبريدية', color:'#0C4A6E'},
                    {key:'Linear', label:'📏 بالمتر الطولي', desc:'القياس المباشر', color:'#7C3AED'},
                    {key:'Materials', label:'🏗️ بالمواد', desc:'5 أنواع دكت', color:'#1E9CD7'}
                  ].map(m=>(
                    <button key={m.key}
                      onClick={()=>setForm({...form, calculation_method: m.key})}
                      style={{
                        padding:'14px 8px',
                        border:`2px solid ${form.calculation_method===m.key?m.color:'#E2E8F0'}`,
                        background:form.calculation_method===m.key?`${m.color}15`:'white',
                        color:form.calculation_method===m.key?m.color:'var(--cs-text-muted)',
                        borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',
                        display:'flex',flexDirection:'column',alignItems:'center',gap:4
                      }}>
                      <span style={{fontSize:16}}>{m.label}</span>
                      <span style={{fontSize:10,opacity:0.8,fontWeight:400}}>{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* اختيار نوع الدكت - يظهر فقط للمواد */}
              {form.calculation_method === 'Materials' && (
              <div style={{marginBottom:14}}>
                <label className="form-label">🏗️ نوع الدكت *</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:6}}>
                  {DUCT_TYPES.map(t=>(
                    <button key={t.key}
                      onClick={()=>setForm({...form,duct_type:t.key,unit:t.unit})}
                      style={{
                        padding:'10px 8px',
                        border:`2px solid ${form.duct_type===t.key?t.color:'#E2E8F0'}`,
                        background:form.duct_type===t.key?`${t.color}15`:'white',
                        color:form.duct_type===t.key?t.color:'var(--cs-text-muted)',
                        borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer',
                        display:'flex',flexDirection:'column',alignItems:'center',gap:2
                      }}>
                      <span style={{fontSize:18}}>{t.emoji}</span>
                      <span>{t.label.substring(2)}</span>
                      <span style={{fontSize:9,opacity:0.7}}>({t.unitLabel})</span>
                    </button>
                  ))}
                </div>
              </div>
              )}

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label className="form-label">رقم الحركة *</label><input className="form-input" value={form.movement_code} onChange={e=>setForm({...form,movement_code:e.target.value})}/></div>
                <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.movement_date} onChange={e=>setForm({...form,movement_date:e.target.value})}/></div>

                {/* ❄️ طريقة الطن */}
                {form.calculation_method === 'Tonnage' && (
                  <div style={{gridColumn:'1/-1',background:'linear-gradient(135deg, #DBEAFE 0%, #E0F2FE 100%)',borderRadius:8,padding:14,border:'2px solid #1E9CD7'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#0C4A6E',marginBottom:10,textAlign:'center'}}>❄️ الحساب بالسعة التبريدية</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                      <div>
                        <label className="form-label">السعة بالطن *</label>
                        <input type="number" min="0" step="0.5" className="form-input" style={{background:'white',fontWeight:700,fontSize:18,textAlign:'center'}} placeholder="مثلاً: 10" value={form.cooling_tonnage} onChange={e=>{
                          const tn = e.target.value
                          const tnNum = parseFloat(tn)||0
                          const estLinear = tnNum > 0 ? (tnNum * 4).toFixed(1) : ''
                          setForm({...form, cooling_tonnage:tn, linear_meters: estLinear})
                        }}/>
                      </div>
                      <div>
                        <label className="form-label">المتر الطولي المقابل (تقديري)</label>
                        <input type="number" min="0" step="0.1" className="form-input" style={{background:'white',fontWeight:700,fontSize:14,textAlign:'center'}} value={form.linear_meters} onChange={e=>setForm({...form,linear_meters:e.target.value})}/>
                        <div style={{fontSize:10,color:'var(--cs-text-muted)',marginTop:4,textAlign:'center'}}>1 طن ≈ 4 متر طولي</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 📏 طريقة المتر الطولي */}
                {form.calculation_method === 'Linear' && (
                  <div style={{gridColumn:'1/-1',background:'linear-gradient(135deg, #F3E8FF 0%, #FAF5FF 100%)',borderRadius:8,padding:14,border:'2px solid #7C3AED'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#7C3AED',marginBottom:10,textAlign:'center'}}>📏 الحساب بالمتر الطولي</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                      <div>
                        <label className="form-label">المتر الطولي *</label>
                        <input type="number" min="0" step="0.1" className="form-input" style={{background:'white',fontWeight:700,fontSize:18,textAlign:'center'}} placeholder="مثلاً: 25" value={form.linear_meters} onChange={e=>setForm({...form,linear_meters:e.target.value})}/>
                      </div>
                      <div>
                        <label className="form-label">العرض (سم)</label>
                        <input type="number" min="0" step="1" className="form-input" placeholder="30" value={form.duct_width_cm} onChange={e=>setForm({...form,duct_width_cm:e.target.value})}/>
                      </div>
                      <div>
                        <label className="form-label">الارتفاع (سم)</label>
                        <input type="number" min="0" step="1" className="form-input" placeholder="40" value={form.duct_height_cm} onChange={e=>setForm({...form,duct_height_cm:e.target.value})}/>
                      </div>
                    </div>
                    {parseFloat(form.duct_width_cm)>0 && parseFloat(form.duct_height_cm)>0 && parseFloat(form.linear_meters)>0 && (
                      <div style={{marginTop:10,padding:'8px 12px',background:'white',borderRadius:6,fontSize:12,textAlign:'center',color:'#7C3AED'}}>
                        📐 المحيط: <strong>{((parseFloat(form.duct_width_cm)+parseFloat(form.duct_height_cm))*2/100).toFixed(2)}م</strong> · 
                        المساحة المعادلة: <strong>{(parseFloat(form.linear_meters) * (parseFloat(form.duct_width_cm)+parseFloat(form.duct_height_cm))*2/100).toFixed(2)} م²</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* المواصفات حسب النوع - للمواد فقط */}
                {form.calculation_method === 'Materials' && (form.duct_type==='Galvanized' || form.duct_type==='Fiberglass') && (
                  <>
                    <div><label className="form-label">{form.duct_type==='Galvanized'?'السمك (mm)':'سمك العزل (mm)'} *</label>
                      <select className="form-input" value={form.duct_type==='Galvanized'?form.gauge_mm:form.thickness_mm} onChange={e=>setForm({...form,[form.duct_type==='Galvanized'?'gauge_mm':'thickness_mm']:e.target.value})}>
                        {(form.duct_type==='Galvanized'?GAUGES:THICKNESSES).map(g=><option key={g} value={g}>{g} mm</option>)}
                      </select>
                    </div>
                    {form.duct_type==='Galvanized' && (
                      <div><label className="form-label">مقاس اللوح</label>
                        <select className="form-input" value={form.sheet_size} onChange={e=>setForm({...form,sheet_size:e.target.value})}>
                          {SHEET_SIZES.map(s=><option key={s}>{s}</option>)}
                        </select>
                      </div>
                    )}
                    {form.duct_type==='Fiberglass' && (
                      <div><label className="form-label">الكثافة (kg/m³)</label>
                        <select className="form-input" value={form.insulation_density} onChange={e=>setForm({...form,insulation_density:e.target.value})}>
                          {INSULATION_DENSITIES.map(d=><option key={d} value={d}>{d} kg/m³</option>)}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {form.calculation_method === 'Materials' && form.duct_type==='PreInsulated' && (
                  <>
                    <div><label className="form-label">نوع العزل *</label>
                      <select className="form-input" value={form.insulation_type} onChange={e=>setForm({...form,insulation_type:e.target.value})}>
                        {INSULATION_TYPES.map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><label className="form-label">الكثافة (kg/m³)</label>
                      <select className="form-input" value={form.insulation_density} onChange={e=>setForm({...form,insulation_density:e.target.value})}>
                        {INSULATION_DENSITIES.map(d=><option key={d} value={d}>{d} kg/m³</option>)}
                      </select>
                    </div>
                    <div><label className="form-label">السمك (mm)</label>
                      <select className="form-input" value={form.thickness_mm} onChange={e=>setForm({...form,thickness_mm:e.target.value})}>
                        {THICKNESSES.map(t=><option key={t} value={t}>{t} mm</option>)}
                      </select>
                    </div>
                    <div><label className="form-label">مقاس اللوح</label>
                      <select className="form-input" value={form.sheet_size} onChange={e=>setForm({...form,sheet_size:e.target.value})}>
                        {PANEL_SIZES.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {form.calculation_method === 'Materials' && (form.duct_type==='Flexible' || form.duct_type==='Spiral') && (
                  <>
                    <div><label className="form-label">القطر (inch) *</label>
                      <select className="form-input" value={form.diameter_inch} onChange={e=>setForm({...form,diameter_inch:e.target.value})}>
                        {DIAMETERS.map(d=><option key={d} value={d}>{d}"</option>)}
                      </select>
                    </div>
                    {form.duct_type==='Flexible' && (
                      <div><label className="form-label">معزول؟</label>
                        <select className="form-input" value={form.is_insulated?'yes':'no'} onChange={e=>setForm({...form,is_insulated:e.target.value==='yes'})}>
                          <option value="no">غير معزول</option>
                          <option value="yes">معزول</option>
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* عرض المخزون المتاح للاستخدام */}
                {form.calculation_method === 'Materials' && form.movement_type==='OUT' && matchingStock && (
                  <div style={{gridColumn:'1/-1',background:'#F1F5F9',borderRadius:8,padding:'10px 14px',fontSize:13,display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                    <span>📦 المتاح من {ductInfo.label}:</span>
                    <span style={{fontWeight:700,color:matchingStock.current_qty<5?'var(--cs-orange)':'var(--cs-blue)'}}>
                      {fmt(matchingStock.current_qty)} {ductInfo.unitLabel} | متوسط: {fmt(matchingStock.avg_cost_per_unit)} ر.س/{ductInfo.unitLabel}
                    </span>
                  </div>
                )}

                {/* الكميات - للمواد فقط */}
                {form.calculation_method === 'Materials' && form.movement_type==='IN' ? (
                  <>
                    <div>
                      <label className="form-label">عدد القطع/الألواح *</label>
                      <input type="number" min="1" max="500" className="form-input" style={{textAlign:'center',fontWeight:700,fontSize:16}} value={form.num_pieces} onChange={e=>{
                        const n = e.target.value
                        const qpp = parseFloat(form.qty_per_piece)||0
                        const total = (parseInt(n)||0) * qpp
                        setForm({...form,num_pieces:n,quantity:total>0?String(total):''})
                      }}/>
                    </div>
                    <div>
                      <label className="form-label">{ductInfo.unitLabel} لكل قطعة *</label>
                      <input type="number" min="0.01" step="0.01" className="form-input" style={{textAlign:'center',fontWeight:700,fontSize:16}} value={form.qty_per_piece} onChange={e=>{
                        const qpp = e.target.value
                        const n = parseInt(form.num_pieces)||0
                        const total = n * (parseFloat(qpp)||0)
                        setForm({...form,qty_per_piece:qpp,quantity:total>0?String(total):''})
                      }}/>
                    </div>
                    <div style={{gridColumn:'1/-1',background:'#FFFDE7',borderRadius:8,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',border:'2px solid #FBBF24'}}>
                      <div>
                        <div style={{fontSize:11,color:'var(--cs-text-muted)'}}>📐 الكمية الإجمالية المحسوبة</div>
                        <div style={{fontSize:24,fontWeight:900,color:'var(--cs-blue)'}}>{fmt(parseFloat(form.quantity)||0)} {ductInfo.unitLabel}</div>
                      </div>
                      <div style={{fontSize:13,color:'var(--cs-text-muted)',textAlign:'left'}}>
                        <div>{form.num_pieces||0} قطعة × {form.qty_per_piece||0} {ductInfo.unitLabel}</div>
                      </div>
                    </div>
                  </>
                ) : form.calculation_method === 'Materials' ? (
                  <>
                    <div><label className="form-label">الكمية المستخدمة ({ductInfo.unitLabel}) *</label>
                      <input type="number" min="0.01" step="0.01" className="form-input" style={{background:'#FFFDE7',fontWeight:700,fontSize:16,textAlign:'center'}} value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/>
                    </div>
                    <div><label className="form-label">الفاقد ({ductInfo.unitLabel})</label>
                      <input type="number" min="0" step="0.01" className="form-input" value={form.waste_qty} onChange={e=>setForm({...form,waste_qty:e.target.value})}/>
                    </div>
                  </>
                ) : null}

                {/* التكلفة */}
                {form.calculation_method === 'Materials' && form.movement_type==='IN' ? (
                  <div style={{gridColumn:'1/-1'}}>
                    <label className="form-label">💰 تكلفة القطعة الواحدة (ر.س) *</label>
                    <input type="number" min="0" step="0.01" className="form-input" style={{background:'#F0FFF4',fontWeight:700,fontSize:16}} placeholder="مثلاً: 150" value={form.cost_per_piece} onChange={e=>setForm({...form,cost_per_piece:e.target.value})}/>
                    {parseFloat(form.cost_per_piece)>0 && parseInt(form.num_pieces)>0 && qtyNum>0 && (
                      <div style={{marginTop:8,padding:'12px 14px',background:'linear-gradient(135deg, #DCFCE7 0%, #DBEAFE 100%)',borderRadius:8,border:'2px solid #16A34A'}}>
                        <div style={{fontSize:11,color:'var(--cs-text-muted)',marginBottom:8,fontWeight:600,textAlign:'center'}}>💰 الحساب التلقائي:</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,fontSize:13}}>
                          <div style={{background:'white',padding:'10px',borderRadius:6,textAlign:'center'}}>
                            <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>تكلفة القطعة</div>
                            <div style={{fontSize:16,fontWeight:800,color:'var(--cs-green)'}}>{fmt(parseFloat(form.cost_per_piece))} ر.س</div>
                          </div>
                          <div style={{background:'white',padding:'10px',borderRadius:6,textAlign:'center'}}>
                            <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>تكلفة الـ {ductInfo.unitLabel}</div>
                            <div style={{fontSize:16,fontWeight:800,color:'var(--cs-blue)'}}>{fmt(parseFloat(form.cost_per_piece)/(parseFloat(form.qty_per_piece)||1))} ر.س</div>
                          </div>
                          <div style={{background:'#FEF3C7',padding:'10px',borderRadius:6,textAlign:'center',border:'2px solid #FBBF24'}}>
                            <div style={{fontSize:10,color:'#92400E',fontWeight:700}}>الإجمالي</div>
                            <div style={{fontSize:18,fontWeight:900,color:'#92400E'}}>{fmt(parseFloat(form.cost_per_piece)*parseInt(form.num_pieces))} ر.س</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : form.calculation_method === 'Materials' && form.movement_type === 'OUT' ? (
                  qtyNum>0 && (
                    <div style={{gridColumn:'1/-1',padding:'8px 12px',background:'#FFF8E7',borderRadius:6,fontSize:13,textAlign:'center'}}>
                      💰 التكلفة المحسوبة: <strong style={{color:'var(--cs-orange)',fontSize:15}}>{fmt(usingFromAvg)} ر.س</strong>
                      <span style={{fontSize:11,color:'var(--cs-text-muted)',marginRight:8}}>({fmt(qtyNum+wasteNum)} {ductInfo.unitLabel} × {fmt(matchingStock?.avg_cost_per_unit||0)} ر.س)</span>
                    </div>
                  )
                ) : (
                  <div style={{gridColumn:'1/-1'}}>
                    <label className="form-label">💰 إجمالي التكلفة (ر.س) {form.movement_type==='IN'?'*':'(محسوبة تلقائياً للاستخدام)'}</label>
                    <input type="number" min="0" step="0.01" className="form-input" style={{background:form.movement_type==='IN'?'#F0FFF4':'#FFF8E7',fontWeight:700,fontSize:16,textAlign:'center'}} placeholder={form.calculation_method==='Tonnage'?'مثلاً: 5000':'مثلاً: 1500'} value={form.total_cost} onChange={e=>setForm({...form,total_cost:e.target.value})}/>
                    {form.calculation_method==='Tonnage' && parseFloat(form.cooling_tonnage)>0 && parseFloat(form.total_cost)>0 && (
                      <div style={{marginTop:6,padding:'6px 12px',background:'#E0F2FE',borderRadius:6,fontSize:11,color:'#0C4A6E',textAlign:'center'}}>
                        💡 تكلفة الطن الواحد: <strong>{fmt(parseFloat(form.total_cost)/parseFloat(form.cooling_tonnage))} ر.س/طن</strong>
                      </div>
                    )}
                    {form.calculation_method==='Linear' && parseFloat(form.linear_meters)>0 && parseFloat(form.total_cost)>0 && (
                      <div style={{marginTop:6,padding:'6px 12px',background:'#F3E8FF',borderRadius:6,fontSize:11,color:'#7C3AED',textAlign:'center'}}>
                        💡 تكلفة المتر الطولي: <strong>{fmt(parseFloat(form.total_cost)/parseFloat(form.linear_meters))} ر.س/م</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* المشروع */}
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
                      <label className="form-label">👤 الفني المستلم من المورد</label>
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
                <div><label className="form-label">المرجع/الفاتورة</label>
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
