'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, CheckCircle, Clock, DollarSign, Printer, Plus, Edit2, Trash2, X, Save, ChevronDown, ChevronUp, Package, Wrench } from 'lucide-react'

// ─── قطع الغيار ───────────────────────────────────
const PART_STATUS_AR: any = { Pending:'معلق', Invoiced:'مُفوتَر', Paid:'مدفوع' }
const PART_STATUS_C:  any = { Pending:'badge-amber', Invoiced:'badge-blue', Paid:'badge-green' }

const newPart = (contractId = '', clientId = '') => ({
  company_pays: false,
  part_code:    `PRT-${1001 + Math.floor(Date.now()/1000) % 9000}`,
  contract_id:  contractId,
  client_id:    clientId,
  invoice_no:   '',
  invoice_date: new Date().toISOString().split('T')[0],
  part_name:    '',
  part_number:  '',
  qty:          '1',
  unit_cost:    '0',
  unit_price:   '0',
  supplier:     '',
  status:       'Pending',
  notes:        '',
})

export default function AMCDashboardPage() {
  const [contracts,   setContracts]   = useState<any[]>([])
  const [visits,      setVisits]      = useState<any[]>([])   // maint_reports
  const [parts,       setParts]       = useState<any[]>([])
  const [ctrs,        setCtrs]        = useState<any[]>([])  // contractors
  const [comms,       setComms]       = useState<any[]>([])  // commissions   // amc_parts
  const [loading,     setLoading]     = useState(true)
  const [expandedId,  setExpandedId]  = useState<string|null>(null)
  const [activeTab,   setActiveTab]   = useState<'visits'|'parts'|'ctrs'|'comms'>('visits')
  const [partModal,   setPartModal]   = useState(false)
  const [partForm,    setPartForm]    = useState<any>(newPart())
  const [partEditId,  setPartEditId]  = useState<string|null>(null)
  const [partSaving,  setPartSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: v }, { data: p }, { data: ct }, { data: cm }] = await Promise.all([
      supabase.from('contracts_amc')
        .select('*,clients(company_name,phone),technicians(full_name)')
        .order('end_date', { ascending: true }),
      supabase.from('maint_reports')
        .select('id,contract_id,report_no,report_date,problem,cost,status,technicians(full_name)')
        .not('contract_id', 'is', null),
      supabase.from('amc_parts')
        .select('*,clients(company_name),company_pays')
        .order('invoice_date', { ascending: false }),
      supabase.from('contractors').select('contract_id,company_name,specialty,contract_value,paid_amount,status,link_type').eq('link_type','amc').not('contract_id','is',null),
      supabase.from('commissions').select('contract_id,broker_name,commission_amt,paid_amount,status,link_type').eq('link_type','amc').not('contract_id','is',null),
    ])
    setContracts(c||[]); setVisits(v||[]); setParts(p||[]); setCtrs(ct||[]); setComms(cm||[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ─── حسابات لكل عقد ─────────────────────────────
  const calcContract = (cid: string) => {
    const cVisits   = visits.filter(v => v.contract_id === cid)
    const cParts    = parts.filter(p  => p.contract_id === cid)
    const visitCost = cVisits.reduce((s, v) => s + (parseFloat(v.cost)||0), 0)
    const partsCost = cParts.reduce((s,  p) => s + (p.total_cost||0), 0)
    const partsRev  = cParts.reduce((s,  p) => s + (p.total_price||0), 0)
    const partsPaid = cParts.filter(p=>p.status==='Paid').reduce((s,p)=>s+(p.total_price||0),0)
    const partsPending = cParts.filter(p=>p.status!=='Paid').reduce((s,p)=>s+(p.total_price||0),0)
    const cCtrs           = ctrs.filter(ct => ct.contract_id === cid)
    const cComms          = comms.filter(cm => cm.contract_id === cid)
    const ctrsCost        = cCtrs.reduce((s,ct)=>s+(ct.contract_value||0),0)
    const ctrsValue       = cCtrs.reduce((s,ct)=>s+(ct.paid_amount||0),0)
    const commsCost       = cComms.reduce((s,cm)=>s+(cm.commission_amt||0),0)
    // قطع الغيار التي تتحملها الشركة → تُخصم من قيمة العقد
    const companyPartsCost = cParts.filter(p=>p.company_pays).reduce((s,p)=>s+(p.total_cost||0),0)
    const totalDeductions  = visitCost + ctrsCost + commsCost + companyPartsCost
    return { cVisits, cParts, visitCost, partsCost, partsRev, partsPaid, partsPending, cCtrs, cComms, ctrsCost, ctrsValue, commsCost, companyPartsCost, totalDeductions }
  }

  // ─── CRUD قطع الغيار ─────────────────────────────
  const openNewPart = (contractId: string, clientId: string) => {
    setPartForm(newPart(contractId, clientId))
    setPartEditId(null); setPartModal(true)
  }

  const openEditPart = (p: any) => {
    setPartForm({
      company_pays: p.company_pays||false,
      part_code: p.part_code||'', contract_id: p.contract_id||'', client_id: p.client_id||'',
      invoice_no: p.invoice_no||'', invoice_date: p.invoice_date?.split('T')[0]||'',
      part_name: p.part_name||'', part_number: p.part_number||'',
      qty: String(p.qty||1), unit_cost: String(p.unit_cost||0), unit_price: String(p.unit_price||0),
      supplier: p.supplier||'', status: p.status||'Pending', notes: p.notes||'',
    })
    setPartEditId(p.id); setPartModal(true)
  }

  const savePart = async () => {
    if (!partForm.part_name?.trim()) return alert('اسم القطعة مطلوب')
    if (!partForm.contract_id) return alert('العقد مطلوب')
    setPartSaving(true)
    const payload = {
      part_code:    partForm.part_code||null,
      contract_id:  partForm.contract_id,
      client_id:    partForm.client_id||null,
      invoice_no:   partForm.invoice_no||null,
      invoice_date: partForm.invoice_date||null,
      part_name:    partForm.part_name.trim(),
      part_number:  partForm.part_number||null,
      qty:          parseInt(partForm.qty)||1,
      unit_cost:    parseFloat(partForm.unit_cost)||0,
      unit_price:   parseFloat(partForm.unit_price)||0,
      company_pays: partForm.company_pays||false,
      supplier:     partForm.supplier||null,
      status:       partForm.status||'Pending',
      notes:        partForm.notes||null,
    }
    const { error } = partEditId
      ? await supabase.from('amc_parts').update(payload).eq('id', partEditId)
      : await supabase.from('amc_parts').insert(payload)
    if (error) alert('خطأ: ' + error.message)
    else { setPartModal(false); load() }
    setPartSaving(false)
  }

  const delPart = async (id: string) => {
    if (!confirm('حذف هذه القطعة؟')) return
    await supabase.from('amc_parts').delete().eq('id', id); load()
  }

  // ─── طباعة تقرير العقد ───────────────────────────
  const printContract = (contract: any) => {
    const c = calcContract(contract.id)
    const profit = (contract.annual_value||0) - c.totalDeductions
    const margin = contract.annual_value > 0 ? Math.round(profit/contract.annual_value*100) : 0
    const fmtN   = (n:number) => Number(n||0).toLocaleString('ar-SA',{maximumFractionDigits:2})

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<title>تقرير عقد AMC — ${contract.contract_code}</title>
<style>
  @media print{@page{size:A4;margin:1.5cm}}
  body{font-family:'Tajawal','Cairo',Arial,sans-serif;padding:20px;color:#1E293B;max-width:900px;margin:0 auto}
  .header{text-align:center;padding:14px;border-bottom:4px double #1E9CD7;margin-bottom:18px}
  .company{font-size:20px;font-weight:900;color:#1E9CD7}
  .doc-title{font-size:17px;font-weight:800;margin-top:10px;color:white;padding:7px 18px;background:linear-gradient(135deg,#1E9CD7,#0F4C81);border-radius:8px;display:inline-block}
  .section-title{font-size:14px;font-weight:800;padding:7px 12px;background:#F1F5F9;border-right:4px solid #1E9CD7;margin:14px 0 8px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
  th{background:#E0F2FE;color:#0C4A6E;text-align:right;padding:7px;border:1px solid #BAE6FD;font-weight:700}
  td{padding:6px 7px;border:1px solid #E2E8F0}
  .box{background:linear-gradient(135deg,#FEF3C7,#FFFBEB);border:2px solid #F59E0B;border-radius:10px;padding:14px;margin:14px 0}
  .row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}
  .main{font-size:16px;font-weight:900;color:#92400E;border-top:2px solid #F59E0B;padding-top:8px;margin-top:6px}
  .green{color:#16A34A;font-weight:700}.red{color:#DC2626;font-weight:700}.blue{color:#1E9CD7;font-weight:700}
  .footer{text-align:center;margin-top:20px;font-size:10px;color:#94A3B8;border-top:1px dashed #CBD5E1;padding-top:10px}
</style></head><body>
<div class="header">
  <div class="company">COOL SEASONS & DARAJA.STORE</div>
  <div style="font-size:11px;color:#64748B;margin-top:4px">نظام ERP للتكييف والتبريد</div>
  <div class="doc-title">📋 تقرير عقد AMC الشامل</div>
</div>

<div class="section-title">📄 بيانات العقد</div>
<table><tr>
  <td style="color:#64748B;width:20%">الكود</td><td><b>${contract.contract_code}</b></td>
  <td style="color:#64748B;width:20%">العميل</td><td><b>${contract.clients?.company_name||'—'}</b></td>
</tr><tr>
  <td style="color:#64748B">الفني</td><td>${contract.technicians?.full_name||'—'}</td>
  <td style="color:#64748B">تكرار الزيارة</td><td>${contract.visit_frequency||'—'}</td>
</tr><tr>
  <td style="color:#64748B">بداية العقد</td><td>${contract.start_date?.split('T')[0]||'—'}</td>
  <td style="color:#64748B">نهاية العقد</td><td>${contract.end_date?.split('T')[0]||'—'}</td>
</tr><tr>
  <td style="color:#64748B">القيمة السنوية</td><td class="blue">${fmtN(contract.annual_value||0)} ر.س</td>
  <td style="color:#64748B">عدد الوحدات</td><td>${contract.units_count||'—'}</td>
</tr></table>

${c.cVisits.length > 0 ? `
<div class="section-title">🔧 الزيارات والصيانة (${c.cVisits.length} زيارة)</div>
<table><thead><tr><th>#</th><th>رقم التقرير</th><th>التاريخ</th><th>المشكلة</th><th>الفني</th><th>التكلفة</th><th>الحالة</th></tr></thead>
<tbody>
${c.cVisits.map((v,i) => `<tr>
  <td>${i+1}</td>
  <td style="font-family:monospace">${v.report_no||'—'}</td>
  <td>${v.report_date?.split('T')[0]||'—'}</td>
  <td>${v.problem||'—'}</td>
  <td>${v.technicians?.full_name||'—'}</td>
  <td class="red">${fmtN(v.cost||0)} ر.س</td>
  <td>${v.status||'—'}</td>
</tr>`).join('')}
<tr style="background:#FEF2F2;font-weight:700">
  <td colspan="5">إجمالي تكاليف الزيارات</td>
  <td class="red">${fmtN(c.visitCost)} ر.س</td><td></td>
</tr>
</tbody></table>` : '<div style="padding:10px;background:#F8FAFC;border-radius:8px;color:#64748B;font-size:12px;margin-bottom:12px">لا توجد زيارات مسجّلة لهذا العقد</div>'}

${c.cParts.length > 0 ? `
<div class="section-title">📦 قطع الغيار (${c.cParts.length} صنف)</div>
<table><thead><tr><th>#</th><th>القطعة</th><th>رقم القطعة</th><th>الكمية</th><th>تكلفة/وحدة</th><th>سعر للعميل</th><th>الإجمالي</th><th>المورد</th><th>الحالة</th></tr></thead>
<tbody>
${c.cParts.map((p,i) => `<tr>
  <td>${i+1}</td>
  <td style="font-weight:600">${p.part_name}</td>
  <td style="font-family:monospace;font-size:10px">${p.part_number||'—'}</td>
  <td style="text-align:center">${p.qty||1}</td>
  <td>${fmtN(p.unit_cost||0)} ر.س</td>
  <td>${fmtN(p.unit_price||0)} ر.س</td>
  <td class="blue">${fmtN(p.total_price||0)} ر.س</td>
  <td>${p.supplier||'—'}</td>
  <td>${PART_STATUS_AR[p.status]||p.status}</td>
</tr>`).join('')}
<tr style="background:#EFF6FF;font-weight:700">
  <td colspan="6">إجمالي قطع الغيار (للعميل)</td>
  <td class="blue">${fmtN(c.partsRev)} ر.س</td><td colspan="2"></td>
</tr>
</tbody></table>` : '<div style="padding:10px;background:#F8FAFC;border-radius:8px;color:#64748B;font-size:12px;margin-bottom:12px">لا توجد قطع غيار مسجّلة</div>'}

<div class="box">
  <div style="font-size:13px;font-weight:800;color:#92400E;text-align:center;margin-bottom:8px">💰 الملخص المالي</div>
  <div class="row"><span>قيمة عقد الخدمة السنوي:</span><span class="blue">${fmtN(contract.annual_value||0)} ر.س</span></div>
  <div class="row"><span>إجمالي تكاليف الزيارات:</span><span class="red">−${fmtN(c.visitCost)} ر.س</span></div>
  <div class="row main"><span>ربح عقد الخدمة:</span>
    <span class="${profit>=0?'green':'red'}">${profit>=0?'+':''}${fmtN(profit)} ر.س (${margin}%)</span>
  </div>
  <div style="border-top:1px solid #E2E8F0;margin-top:10px;padding-top:8px">
    <div class="row" style="font-size:12px;color:#64748B">
      <span>⚠️ قطع الغيار (يدفعها العميل بالتكلفة — بدون هامش):</span>
      <span>${fmtN(c.partsRev)} ر.س</span>
    </div>
    <div class="row" style="font-size:12px;color:#64748B">
      <span>مدفوع من قطع الغيار:</span><span class="green">${fmtN(c.partsPaid)} ر.س</span>
    </div>
    <div class="row" style="font-size:12px;color:#64748B">
      <span>معلق من قطع الغيار:</span><span class="red">${fmtN(c.partsPending)} ر.س</span>
    </div>
  </div>
</div>
<div class="footer">تم الإنشاء: ${new Date().toLocaleString('ar-SA')} | COOL SEASONS ERP</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),400)}</script>
</body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
    else alert('يرجى السماح بالنوافذ المنبثقة')
  }

  // ─── مساعدات ─────────────────────────────────────
  const fmt = (n: number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const today = new Date()

  const enriched = contracts.map(c => {
    const daysLeft = c.end_date ? Math.ceil((new Date(c.end_date).getTime()-today.getTime())/86400000) : null
    const calc     = calcContract(c.id)
    const profit   = (c.annual_value||0) - c.totalDeductions
    const margin   = c.annual_value > 0 ? Math.round(profit/c.annual_value*100) : 0
    const totalCosts = calc.totalDeductions
    return { ...c, daysLeft, ...calc, profit, margin, totalCosts }
  })

  const active       = enriched.filter(c => c.status==='Active')
  const expiringSoon = enriched.filter(c => c.daysLeft!==null && c.daysLeft>0 && c.daysLeft<=60)
  const expired      = enriched.filter(c => c.daysLeft!==null && c.daysLeft<=0)
  const totalValue   = active.reduce((s,c) => s+(c.annual_value||0), 0)
  const totalVisitCost = enriched.reduce((s,c) => s+c.visitCost, 0)
  const totalProfit  = totalValue - totalVisitCost
  const totalParts   = enriched.reduce((s,c) => s+c.partsRev, 0)

  const statusBadge = (days: number|null, status: string) => {
    if (status==='Expired'||(days!==null&&days<=0))    return { label:'منتهي ❌',   bg:'#FDECEA', color:'#C0392B' }
    if (days!==null && days<=30) return { label:`${days} يوم ⚠️`, bg:'#FEF3E2', color:'#E67E22' }
    if (days!==null && days<=60) return { label:`${days} يوم`,    bg:'#E8F6FC', color:'#1E9CD7' }
    return { label:'نشط ✅', bg:'#E8F8EF', color:'#27AE60' }
  }

  // ─── واجهة ───────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ gap:8 }}>
        <div>
          <div className="page-title">لوحة عقود AMC</div>
          <div className="page-subtitle">Annual Maintenance Contracts</div>
        </div>
        <button onClick={() => window.print()}
          style={{ display:'flex', alignItems:'center', gap:6, background:'var(--cs-blue)', color:'white', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:13, fontFamily:'Tajawal,sans-serif', fontWeight:600 }}>
          <Printer size={15}/>طباعة
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:12, marginBottom:16 }}>
        {[
          { l:'عقود نشطة',       v: active.length,               c:'var(--cs-green)',  icon:CheckCircle },
          { l:'تنتهي خلال 60 يوم', v: expiringSoon.length,       c:'var(--cs-orange)', icon:Clock },
          { l:'منتهية',          v: expired.length,               c:'var(--cs-red)',    icon:AlertTriangle },
          { l:'قيمة العقود',     v: fmt(totalValue)+' ر.س',       c:'var(--cs-blue)',   icon:DollarSign },
          { l:'تكاليف الزيارات', v: fmt(totalVisitCost)+' ر.س',   c:'var(--cs-red)',    icon:Wrench },
          { l:'ربح الخدمة',      v: fmt(totalProfit)+' ر.س',      c: totalProfit>=0?'var(--cs-green)':'var(--cs-red)', icon:DollarSign },
          { l:'قطع الغيار (للعملاء)', v: fmt(totalParts)+' ر.س',  c:'var(--cs-blue)',   icon:Package },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:11, color:'var(--cs-text-muted)', fontWeight:600, marginBottom:4 }}>{s.l}</div>
                <div style={{ fontSize:14, fontWeight:800, color:s.c, fontFamily:'Cairo,sans-serif' }}>{s.v}</div>
              </div>
              <s.icon size={18} color={s.c} style={{ opacity:0.5 }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Expiry alert */}
      {expiringSoon.length > 0 && (
        <div style={{ background:'#FEF3E2', border:'1px solid #E67E2230', borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <AlertTriangle size={16} color="#E67E22"/>
            <span style={{ fontFamily:'Cairo,sans-serif', fontWeight:700, fontSize:14, color:'#E67E22' }}>تنتهي خلال 60 يوم</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8 }}>
            {expiringSoon.map(c => (
              <div key={c.id} style={{ background:'white', borderRadius:8, padding:'8px 12px', border:'1px solid #E67E2240' }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{c.clients?.company_name}</div>
                <div style={{ fontSize:11, color:'var(--cs-text-muted)' }}>{c.contract_code}</div>
                <div style={{ fontSize:12, color:c.daysLeft<=30?'var(--cs-red)':'var(--cs-orange)', fontWeight:700, marginTop:4 }}>⏰ {c.daysLeft} يوم</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contracts Table */}
      <div className="card">
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--cs-text-muted)' }}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width:28 }}></th>
                  <th>كود العقد</th>
                  <th>العميل</th>
                  <th>تنتهي</th>
                  <th>القيمة السنوية</th>
                  <th>تكلفة الزيارات</th>
                  <th>ربح الخدمة</th>
                  <th>هامش%</th>
                  <th>قطع غيار</th>
                  <th>زيارات</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {enriched.length === 0
                  ? <tr><td colSpan={12} style={{ textAlign:'center', padding:40, color:'var(--cs-text-muted)' }}>لا توجد عقود</td></tr>
                  : enriched.map(c => {
                    const badge    = statusBadge(c.daysLeft, c.status)
                    const expanded = expandedId === c.id

                    return <>
                      <tr key={c.id} style={{
                        background: (c.daysLeft!==null&&c.daysLeft<=0) ? '#FFF5F5'
                          : (c.daysLeft!==null&&c.daysLeft<=30) ? '#FFFBF0'
                          : expanded ? '#F0F9FF' : 'inherit'
                      }}>
                        <td style={{ textAlign:'center' }}>
                          <button onClick={() => setExpandedId(expanded ? null : c.id)}
                            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-text-muted)', padding:2 }}>
                            {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                          </button>
                        </td>
                        <td><span style={{ fontFamily:'monospace', background:'var(--cs-blue-light)', padding:'2px 8px', borderRadius:4, fontSize:11 }}>{c.contract_code}</span></td>
                        <td style={{ fontWeight:600 }}>{c.clients?.company_name}</td>
                        <td style={{ fontSize:12, color:c.daysLeft!==null&&c.daysLeft<=30?'var(--cs-red)':'var(--cs-text-muted)' }}>
                          {c.end_date?.split('T')[0]||'—'}
                        </td>
                        <td style={{ fontWeight:700, color:'var(--cs-blue)' }}>{fmt(c.annual_value)} ر.س</td>
                        <td style={{ color:'var(--cs-red)', fontSize:12 }}>{c.visitCost > 0 ? fmt(c.visitCost)+' ر.س' : '—'}</td>
                        <td style={{ fontWeight:800, color: c.profit>=0?'var(--cs-green)':'var(--cs-red)' }}>
                          {c.annual_value > 0 ? `${c.profit>=0?'+':''}${fmt(c.profit)} ر.س` : '—'}
                        </td>
                        <td>
                          {c.annual_value > 0 ? (
                            <span style={{ fontWeight:700, fontSize:12,
                              color: c.margin>=50?'#16A34A':c.margin>=25?'#D97706':'#DC2626',
                              background: c.margin>=50?'#F0FDF4':c.margin>=25?'#FFFBEB':'#FEF2F2',
                              padding:'2px 8px', borderRadius:20 }}>
                              {c.margin}%
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {c.partsRev > 0
                            ? <span style={{ fontSize:12, color:'var(--cs-blue)', fontWeight:600 }}>{fmt(c.partsRev)} ر.س</span>
                            : <span style={{ fontSize:11, color:'var(--cs-text-muted)' }}>—</span>}
                        </td>
                        <td style={{ textAlign:'center' }}>
                          {c.cVisits.length > 0
                            ? <span style={{ fontWeight:700, color:'var(--cs-blue)' }}>{c.cVisits.length}</span>
                            : <span style={{ color:'var(--cs-text-muted)', fontSize:11 }}>—</span>}
                        </td>
                        <td>
                          <span style={{ background:badge.bg, color:badge.color, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
                            {badge.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={() => printContract(c)} title="طباعة تقرير" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-green)' }}><Printer size={14}/></button>
                            <button onClick={() => { setExpandedId(c.id); setActiveTab('parts'); openNewPart(c.id, c.client_id) }} title="إضافة قطعة"
                              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-blue)' }}><Package size={14}/></button>
                          </div>
                        </td>
                      </tr>

                      {/* ─── صف التوسعة ─── */}
                      {expanded && (
                        <tr key={c.id+'-exp'}>
                          <td colSpan={12} style={{ padding:0 }}>
                            <div style={{ background:'#F8FAFC', padding:16, borderTop:'2px solid var(--cs-blue)', borderBottom:'2px solid var(--cs-border)' }}>

                              {/* Tabs */}
                              <div style={{ display:'flex', gap:0, marginBottom:14, background:'white', borderRadius:8, padding:3, width:'fit-content', border:'1px solid var(--cs-border)' }}>
                                {[
                                  { id:'visits', label:'🔧 الزيارات والصيانة', count: c.cVisits.length },
                                  { id:'parts',  label:'📦 قطع الغيار',        count: c.cParts.length  },
                                  { id:'ctrs',   label:'👷 المقاولون',          count: c.cCtrs.length   },
                                  { id:'comms',  label:'💼 العمولات',           count: c.cComms.length  },
                                ].map(t => (
                                  <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                                    style={{ padding:'6px 16px', border:'none', borderRadius:6, cursor:'pointer', fontFamily:'Tajawal,sans-serif', fontSize:12, fontWeight:600,
                                      background: activeTab===t.id ? 'var(--cs-blue)' : 'transparent',
                                      color: activeTab===t.id ? 'white' : 'var(--cs-text-muted)' }}>
                                    {t.label} ({t.count})
                                  </button>
                                ))}
                              </div>

                              {/* Visits tab */}
                              {/* TABS: add contractors and commissions */}
                              {activeTab === 'visits' && (
                                <div>
                                  {c.cVisits.length === 0
                                    ? <div style={{ fontSize:12, color:'var(--cs-text-muted)', padding:'10px 0' }}>لا توجد زيارات مرتبطة بهذا العقد</div>
                                    : <>
                                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                                        <thead><tr style={{ background:'var(--cs-gray-light)' }}>
                                          <th style={{ padding:'6px 8px', textAlign:'right', fontWeight:600 }}>رقم التقرير</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>التاريخ</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>المشكلة</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>الفني</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right', color:'var(--cs-red)' }}>التكلفة</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>الحالة</th>
                                        </tr></thead>
                                        <tbody>
                                          {c.cVisits.map((v:any) => (
                                            <tr key={v.id} style={{ borderBottom:'1px solid var(--cs-border)' }}>
                                              <td style={{ padding:'6px 8px', fontFamily:'monospace', color:'var(--cs-blue)' }}>{v.report_no}</td>
                                              <td style={{ padding:'6px 8px' }}>{v.report_date?.split('T')[0]||'—'}</td>
                                              <td style={{ padding:'6px 8px', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.problem||'—'}</td>
                                              <td style={{ padding:'6px 8px' }}>{v.technicians?.full_name||'—'}</td>
                                              <td style={{ padding:'6px 8px', fontWeight:700, color:'var(--cs-red)' }}>{fmt(v.cost||0)} ر.س</td>
                                              <td style={{ padding:'6px 8px' }}>{v.status||'—'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot>
                                          <tr style={{ background:'#FEF2F2', fontWeight:700 }}>
                                            <td colSpan={4} style={{ padding:'6px 8px', fontSize:12 }}>إجمالي تكاليف الزيارات</td>
                                            <td style={{ padding:'6px 8px', color:'var(--cs-red)' }}>{fmt(c.visitCost)} ر.س</td>
                                            <td></td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                      {/* ملخص الربح */}
                                      <div style={{ marginTop:12, padding:'10px 14px', background:'white', borderRadius:8, border:'1px solid var(--cs-border)', display:'flex', gap:24, fontSize:13 }}>
                                        <span>القيمة السنوية: <b style={{ color:'var(--cs-blue)' }}>{fmt(c.annual_value)} ر.س</b></span>
                                        <span>التكاليف: <b style={{ color:'var(--cs-red)' }}>{fmt(c.visitCost)} ر.س</b></span>
                                        <span>الربح: <b style={{ color: c.profit>=0?'var(--cs-green)':'var(--cs-red)' }}>{c.profit>=0?'+':''}{fmt(c.profit)} ر.س ({c.margin}%)</b></span>
                                      </div>
                                    </>
                                  }
                                </div>
                              )}

                              {/* Contractors tab */}
                              {activeTab === 'ctrs' && (
                                <div>
                                  {c.cCtrs.length === 0
                                    ? <div style={{ fontSize:12, color:'var(--cs-text-muted)', padding:'10px 0' }}>لا يوجد مقاولون مرتبطون بهذا العقد</div>
                                    : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                                        <thead><tr style={{ background:'var(--cs-gray-light)' }}>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>الشركة</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>التخصص</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>قيمة العقد</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>المدفوع</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>الحالة</th>
                                        </tr></thead>
                                        <tbody>
                                          {c.cCtrs.map((ct:any,i:number) => (
                                            <tr key={i} style={{ borderBottom:'1px solid var(--cs-border)' }}>
                                              <td style={{ padding:'6px 8px', fontWeight:600 }}>{ct.company_name}</td>
                                              <td style={{ padding:'6px 8px' }}><span className="badge badge-blue">{ct.specialty}</span></td>
                                              <td style={{ padding:'6px 8px', fontWeight:700, color:'var(--cs-red)' }}>{fmt(ct.contract_value||0)} ر.س</td>
                                              <td style={{ padding:'6px 8px', color:'var(--cs-green)' }}>{fmt(ct.paid_amount||0)} ر.س</td>
                                              <td style={{ padding:'6px 8px' }}><span className={ct.status==='نشط'?'badge badge-green':'badge badge-gray'}>{ct.status}</span></td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot><tr style={{ background:'#FEF2F2', fontWeight:700 }}>
                                          <td colSpan={2} style={{ padding:'6px 8px' }}>إجمالي المقاولين</td>
                                          <td style={{ padding:'6px 8px', color:'var(--cs-red)' }}>{fmt(c.ctrsCost)} ر.س</td>
                                          <td style={{ padding:'6px 8px', color:'var(--cs-green)' }}>{fmt(c.ctrsValue)} ر.س</td>
                                          <td></td>
                                        </tr></tfoot>
                                      </table>
                                  }
                                </div>
                              )}

                              {/* Commissions tab */}
                              {activeTab === 'comms' && (
                                <div>
                                  {c.cComms.length === 0
                                    ? <div style={{ fontSize:12, color:'var(--cs-text-muted)', padding:'10px 0' }}>لا توجد عمولات مرتبطة بهذا العقد</div>
                                    : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                                        <thead><tr style={{ background:'var(--cs-gray-light)' }}>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>الوسيط</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>العمولة</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>المدفوع</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>الحالة</th>
                                        </tr></thead>
                                        <tbody>
                                          {c.cComms.map((cm:any,i:number) => (
                                            <tr key={i} style={{ borderBottom:'1px solid var(--cs-border)' }}>
                                              <td style={{ padding:'6px 8px', fontWeight:600 }}>{cm.broker_name||'—'}</td>
                                              <td style={{ padding:'6px 8px', fontWeight:700, color:'var(--cs-red)' }}>{fmt(cm.commission_amt||0)} ر.س</td>
                                              <td style={{ padding:'6px 8px', color:'var(--cs-green)' }}>{fmt(cm.paid_amount||0)} ر.س</td>
                                              <td style={{ padding:'6px 8px' }}><span className="badge badge-amber">{cm.status}</span></td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot><tr style={{ background:'#FEF2F2', fontWeight:700 }}>
                                          <td style={{ padding:'6px 8px' }}>إجمالي العمولات</td>
                                          <td style={{ padding:'6px 8px', color:'var(--cs-red)' }}>{fmt(c.commsCost)} ر.س</td>
                                          <td colSpan={2}></td>
                                        </tr></tfoot>
                                      </table>
                                  }
                                </div>
                              )}

                              {/* Parts tab */}
                              {activeTab === 'parts' && (
                                <div>
                                  <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
                                    <button onClick={() => openNewPart(c.id, c.client_id)} className="btn-primary" style={{ fontSize:12, padding:'6px 14px' }}>
                                      <Plus size={13}/>إضافة قطعة
                                    </button>
                                  </div>
                                  {c.cParts.length === 0
                                    ? <div style={{ fontSize:12, color:'var(--cs-text-muted)', padding:'10px 0' }}>لا توجد قطع غيار مسجّلة لهذا العقد</div>
                                    : <>
                                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                                        <thead><tr style={{ background:'var(--cs-gray-light)' }}>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>القطعة</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>رقم القطعة</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>الكمية</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>تكلفة/وحدة</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>سعر للعميل</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>إجمالي</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>المورد</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>الحالة</th>
                                          <th style={{ padding:'6px 8px', textAlign:'right' }}>إجراءات</th>
                                        </tr></thead>
                                        <tbody>
                                          {c.cParts.map((p:any) => (
                                            <tr key={p.id} style={{ borderBottom:'1px solid var(--cs-border)' }}>
                                              <td style={{ padding:'6px 8px', fontWeight:600 }}>{p.part_name}</td>
                                              <td style={{ padding:'6px 8px', fontFamily:'monospace', fontSize:11 }}>{p.part_number||'—'}</td>
                                              <td style={{ padding:'6px 8px', textAlign:'center', fontWeight:700 }}>{p.qty||1}</td>
                                              <td style={{ padding:'6px 8px', color:'var(--cs-text-muted)' }}>{fmt(p.unit_cost||0)} ر.س</td>
                                              <td style={{ padding:'6px 8px' }}>{fmt(p.unit_price||0)} ر.س</td>
                                              <td style={{ padding:'6px 8px', fontWeight:700, color: p.company_pays?'var(--cs-red)':'var(--cs-blue)' }}>
                                                {fmt(p.company_pays?(p.total_cost||0):(p.total_price||0))} ر.س
                                                {p.company_pays && <div style={{ fontSize:9, color:'var(--cs-red)', fontWeight:600 }}>🏢 تتحملها الشركة</div>}
                                              </td>
                                              <td style={{ padding:'6px 8px', fontSize:11 }}>{p.supplier||'—'}</td>
                                              <td style={{ padding:'6px 8px' }}>
                                                <span className={`badge ${PART_STATUS_C[p.status]||'badge-gray'}`} style={{ fontSize:10 }}>
                                                  {PART_STATUS_AR[p.status]||p.status}
                                                </span>
                                              </td>
                                              <td style={{ padding:'6px 8px' }}>
                                                <div style={{ display:'flex', gap:4 }}>
                                                  <button onClick={() => openEditPart(p)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-blue)' }}><Edit2 size={13}/></button>
                                                  <button onClick={() => delPart(p.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-red)' }}><Trash2 size={13}/></button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot>
                                          <tr style={{ background:'#EFF6FF', fontWeight:700 }}>
                                            <td colSpan={5} style={{ padding:'6px 8px', fontSize:12 }}>الإجمالي</td>
                                            <td style={{ padding:'6px 8px', color:'var(--cs-blue)' }}>{fmt(c.partsRev)} ر.س</td>
                                            <td colSpan={3}></td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                      <div style={{ marginTop:10, padding:'8px 12px', background:'#EFF6FF', borderRadius:8, fontSize:12, display:'flex', gap:16, flexWrap:'wrap' }}>
                                        <span>العميل يدفع: <b style={{ color:'var(--cs-blue)' }}>{fmt(c.partsRev - c.companyPartsCost)} ر.س</b></span>
                                        <span>الشركة تتحمل: <b style={{ color:'var(--cs-red)' }}>{fmt(c.companyPartsCost)} ر.س</b></span>
                                        <span>مدفوع: <b style={{ color:'var(--cs-green)' }}>{fmt(c.partsPaid)} ر.س</b></span>
                                        {c.companyPartsCost>0 && <span style={{ fontSize:11, color:'var(--cs-red)', fontWeight:700 }}>⚠️ {fmt(c.companyPartsCost)} ر.س مخصومة من ربح العقد</span>}
                                      </div>
                                    </>
                                  }
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly revenue bar chart */}
      {active.length > 0 && (
        <div className="card" style={{ padding:20, marginTop:16 }}>
          <div style={{ fontFamily:'Cairo,sans-serif', fontWeight:700, fontSize:15, marginBottom:16 }}>💰 ربحية العقود النشطة</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {active.sort((a,b)=>(b.annual_value||0)-(a.annual_value||0)).map(c => {
              const m = c.annual_value > 0 ? Math.round(c.profit/c.annual_value*100) : 0
              const maxVal = Math.max(...active.map(x=>x.annual_value||0))
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:130, fontSize:12, fontWeight:600, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.clients?.company_name}</div>
                  <div style={{ flex:1, background:'var(--cs-border)', borderRadius:6, height:22, overflow:'hidden', position:'relative' }}>
                    <div style={{ width:`${(c.annual_value||0)/maxVal*100}%`, background:'#BFDBFE', height:22, borderRadius:6 }}/>
                    <div style={{ position:'absolute', top:0, right:0, width:`${Math.max(0,c.visitCost/(c.annual_value||1))*100}%`, background:'#FCA5A5', height:22, borderRadius:6, opacity:0.7 }}/>
                  </div>
                  <div style={{ width:110, textAlign:'left', fontSize:12, flexShrink:0 }}>
                    <span style={{ fontWeight:700, color:'var(--cs-blue)' }}>{fmt(c.annual_value/12)}/ش</span>
                    <span style={{ marginRight:6, fontWeight:700, fontSize:11, color: m>=50?'var(--cs-green)':m>=25?'var(--cs-orange)':'var(--cs-red)' }}>({m}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop:10, fontSize:11, color:'var(--cs-text-muted)', display:'flex', gap:16 }}>
            <span>🔵 القيمة السنوية</span>
            <span>🔴 تكاليف الزيارات</span>
          </div>
        </div>
      )}

      {/* Part Modal */}
      {partModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div className="card" style={{ width:'100%', maxWidth:560, maxHeight:'92vh', overflow:'auto', padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontFamily:'Cairo,sans-serif', fontWeight:700, fontSize:18 }}>{partEditId?'تعديل قطعة':'إضافة قطعة غيار'}</div>
              <button onClick={() => setPartModal(false)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div><label className="form-label">اسم القطعة *</label>
                <input className="form-input" value={partForm.part_name||''} onChange={e=>setPartForm({...partForm,part_name:e.target.value})} placeholder="مثال: فلتر هواء، كمبروسر..."/>
              </div>
              <div><label className="form-label">رقم القطعة / Part No.</label>
                <input className="form-input" dir="ltr" value={partForm.part_number||''} onChange={e=>setPartForm({...partForm,part_number:e.target.value})}/>
              </div>
              <div><label className="form-label">رقم الفاتورة</label>
                <input className="form-input" value={partForm.invoice_no||''} onChange={e=>setPartForm({...partForm,invoice_no:e.target.value})}/>
              </div>
              <div><label className="form-label">تاريخ الفاتورة</label>
                <input type="date" className="form-input" value={partForm.invoice_date||''} onChange={e=>setPartForm({...partForm,invoice_date:e.target.value})}/>
              </div>
              <div><label className="form-label">الكمية</label>
                <input type="number" min="1" className="form-input" value={partForm.qty||1} onChange={e=>setPartForm({...partForm,qty:e.target.value})}/>
              </div>
              <div><label className="form-label">المورد / Supplier</label>
                <input className="form-input" value={partForm.supplier||''} onChange={e=>setPartForm({...partForm,supplier:e.target.value})}/>
              </div>
              <div><label className="form-label">تكلفة الشراء / وحدة (ر.س)</label>
                <input type="number" min="0" className="form-input" value={partForm.unit_cost||0} onChange={e=>setPartForm({...partForm,unit_cost:e.target.value})}/>
              </div>
              <div><label className="form-label">سعر البيع للعميل / وحدة (ر.س)</label>
                <input type="number" min="0" className="form-input" value={partForm.unit_price||0} onChange={e=>setPartForm({...partForm,unit_price:e.target.value})}/>
                <div style={{ fontSize:10, color:'var(--cs-text-muted)', marginTop:3 }}>⚠️ عادةً = تكلفة الشراء (بدون هامش)</div>
              </div>
              {/* Auto calc */}
              <div style={{ gridColumn:'1/-1', background:'#F0F9FF', borderRadius:8, padding:'8px 12px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, textAlign:'center' }}>
                <div><div style={{ fontSize:10, color:'var(--cs-text-muted)' }}>إجمالي التكلفة</div><div style={{ fontWeight:700, color:'var(--cs-red)' }}>{fmt((parseFloat(partForm.unit_cost)||0)*(parseInt(partForm.qty)||1))} ر.س</div></div>
                <div><div style={{ fontSize:10, color:'var(--cs-text-muted)' }}>إجمالي للعميل</div><div style={{ fontWeight:700, color:'var(--cs-blue)' }}>{fmt((parseFloat(partForm.unit_price)||0)*(parseInt(partForm.qty)||1))} ر.س</div></div>
                <div><div style={{ fontSize:10, color:'var(--cs-text-muted)' }}>الهامش</div>
                  <div style={{ fontWeight:700, color:'var(--cs-text-muted)' }}>
                    {(parseFloat(partForm.unit_price)||0) > 0
                      ? Math.round(((parseFloat(partForm.unit_price)||0)-(parseFloat(partForm.unit_cost)||0))/(parseFloat(partForm.unit_price)||1)*100)+'%'
                      : '—'}
                  </div>
                </div>
              </div>
              {/* ✅ خيار: تتحملها الشركة */}
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ background: partForm.company_pays?'#FEF2F2':'#F8FAFC', border:`2px solid ${partForm.company_pays?'#FCA5A5':'#E5E7EB'}`, borderRadius:8, padding:'10px 14px' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none' as any }}>
                    <input type="checkbox" checked={partForm.company_pays||false}
                      onChange={e=>setPartForm({...partForm,company_pays:e.target.checked})}
                      style={{ width:18, height:18, accentColor:'#DC2626', cursor:'pointer' }}/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:partForm.company_pays?'#DC2626':'#374151' }}>
                        🏢 تتحملها الشركة (تُخصم من قيمة العقد)
                      </div>
                      <div style={{ fontSize:10, color:'var(--cs-text-muted)', marginTop:2 }}>
                        عند التفعيل: تكلفة القطعة تُضاف لتكاليف العقد وتُخصم من الربح
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">الحالة</label>
                <select className="form-input" value={partForm.status||'Pending'} onChange={e=>setPartForm({...partForm,status:e.target.value})}>
                  {Object.keys(PART_STATUS_AR).map(s=><option key={s} value={s}>{PART_STATUS_AR[s]}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">ملاحظات</label>
                <textarea className="form-input" rows={2} value={partForm.notes||''} onChange={e=>setPartForm({...partForm,notes:e.target.value})}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
              <button className="btn-secondary" onClick={() => setPartModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={savePart} disabled={partSaving}><Save size={15}/>{partSaving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
