'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer, ArrowDownCircle, ArrowUpCircle, Boxes } from 'lucide-react'

const PIPE_PAIRS = [
  {liquid:'1/4"',  suction:'3/8"',  btu:'9,000-12,000',  label:'1/4" × 3/8" — 1 طن'},
  {liquid:'1/4"',  suction:'1/2"',  btu:'12,000-18,000', label:'1/4" × 1/2" — 1.5 طن'},
  {liquid:'1/4"',  suction:'5/8"',  btu:'18,000-24,000', label:'1/4" × 5/8" — 2 طن'},
  {liquid:'3/8"',  suction:'5/8"',  btu:'24,000-30,000', label:'3/8" × 5/8" — 2.5-3 طن ⭐'},
  {liquid:'3/8"',  suction:'3/4"',  btu:'30,000-36,000', label:'3/8" × 3/4" — 3 طن'},
  {liquid:'3/8"',  suction:'7/8"',  btu:'36,000-48,000', label:'3/8" × 7/8" — 3-4 طن ⭐'},
  {liquid:'1/2"',  suction:'7/8"',  btu:'48,000-60,000', label:'1/2" × 7/8" — 4-5 طن'},
  {liquid:'1/2"',  suction:'1-1/8"',btu:'60,000+',       label:'1/2" × 1-1/8" — 5+ طن'},
  {liquid:'5/8"',  suction:'1-1/8"',btu:'VRF',           label:'5/8" × 1-1/8" — VRF كبير'},
  {liquid:'5/8"',  suction:'1-3/8"',btu:'VRF/Chiller',   label:'5/8" × 1-3/8" — VRF/Chiller'},
]

// قوائم منفصلة (للاختيار المرن)
const LIQUID_SIZES = ['1/4"','3/8"','1/2"','5/8"']
const SUCTION_SIZES = ['3/8"','1/2"','5/8"','3/4"','7/8"','1-1/8"','1-3/8"']

// دالة لإيجاد الـ BTU بناءً على الزوج
const findBTU = (l:string, s:string):string => {
  const pair = PIPE_PAIRS.find(p=>p.liquid===l && p.suction===s)
  return pair?.btu || 'مخصص'
}

const BRANDS = ['Halcor','Wieland','KME','Mueller','Cambridge-Lee','Mexichem','نحاس محلي','أخرى']
const ORIGINS = ['يوناني','إيطالي','ألماني','أمريكي','مكسيكي','صيني','محلي','أخرى']
const REASONS_IN = ['شراء جديد','نقل من مشروع آخر','مرتجع من فني','تسوية مخزون']
const REASONS_OUT = ['تركيب وحدة جديدة','تمديد توصيلات','صيانة وإصلاح','نقل لمشروع آخر','تالف']

const fmt = (n:number) => Number(n||0).toLocaleString('ar-SA',{maximumFractionDigits:2})

export default function CopperPipePage(){
  const [movements,setMovements] = useState<any[]>([])
  const [stockByPair,setStockByPair] = useState<any[]>([])
  const [techs,setTechs] = useState<any[]>([])
  const [clients,setClients] = useState<any[]>([])
  const [projects,setProjects] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [search,setSearch] = useState('')
  const [filterType,setFilterType] = useState<'ALL'|'IN'|'OUT'>('ALL')
  const [modal,setModal] = useState(false)
  const [editId,setEditId] = useState<string|null>(null)
  const [saving,setSaving] = useState(false)

  const newCode = () => `CM-${100000 + Math.floor(Math.random()*900000)}`
  const newMov = ()=>({movement_code:newCode(),movement_date:new Date().toISOString().split('T')[0],movement_type:'IN',liquid_size:'3/8"',suction_size:'5/8"',capacity_btu:'24,000-30,000',meters:'',num_coils:'1',length_per_coil:'15',waste_meters:'0',total_cost:'',project_id:'',tech_id:'',receiver_tech_id:'',client_id:'',brand:'Halcor',origin:'يوناني',unit_serial:'',reason:'شراء جديد',reference_no:'',notes:''})
  const [form,setForm] = useState<any>(newMov())

  const load = async () => {
    setLoading(true)
    const [m,s,t,cl,p] = await Promise.all([
      supabase.from('copper_movements').select('*,projects(project_name),technicians(full_name),clients(company_name)').order('movement_date',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('copper_stock_by_pair').select('*'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name')
    ])
    setMovements(m.data||[])
    setStockByPair(s.data||[])
    setTechs(t.data||[])
    setClients(cl.data||[])
    setProjects(p.data||[])
    setLoading(false)
  }

  useEffect(()=>{load()},[])

  const openNew = (type:'IN'|'OUT'='IN') => {
    setEditId(null)
    setForm({...newMov(), movement_type:type, reason: type==='IN'?'شراء جديد':'تركيب وحدة جديدة'})
    setModal(true)
  }

  const openEdit = (m:any) => {
    setEditId(m.id)
    setForm({movement_code:m.movement_code,movement_date:m.movement_date?.split('T')[0]||'',movement_type:m.movement_type,liquid_size:m.liquid_size,suction_size:m.suction_size,capacity_btu:m.capacity_btu||'',meters:String(m.meters||''),num_coils:String(m.num_coils||0),length_per_coil:m.num_coils>0?String((m.meters||0)/(m.num_coils||1)):'15',waste_meters:String(m.waste_meters||0),total_cost:String(m.total_cost||''),project_id:m.project_id||'',tech_id:m.tech_id||'',receiver_tech_id:m.receiver_tech_id||'',client_id:m.client_id||'',brand:m.brand||'Halcor',origin:m.origin||'يوناني',unit_serial:m.unit_serial||'',reason:m.reason||'',reference_no:m.reference_no||'',notes:m.notes||''})
    setModal(true)
  }

  const save = async () => {
    const meters = parseFloat(form.meters)||0
    const waste = parseFloat(form.waste_meters)||0
    const totalCost = parseFloat(form.total_cost)||0
    const numCoils = parseInt(form.num_coils)||0

    if (meters <= 0) { alert('الكمية بالمتر مطلوبة'); return }
    if (form.movement_type === 'IN' && totalCost <= 0) { alert('إجمالي التكلفة مطلوب للاستلام'); return }
    if (form.movement_type === 'IN' && numCoils <= 0) { alert('عدد اللفات مطلوب'); return }

    if (form.movement_type === 'OUT' && !editId) {
      const pair = stockByPair.find(s=>s.liquid_size===form.liquid_size && s.suction_size===form.suction_size)
      const available = pair?.current_meters || 0
      const required = meters + waste
      if (required > available) {
        if (!confirm(`⚠️ المخزون المتاح ${fmt(available)}م غير كافٍ للسحب ${fmt(required)}م.\nهل تريد المتابعة؟`)) return
      }
    }

    setSaving(true)

    let cost = totalCost
    if (form.movement_type === 'OUT') {
      const pair = stockByPair.find(s=>s.liquid_size===form.liquid_size && s.suction_size===form.suction_size)
      const avgCost = pair?.avg_cost_per_meter || 0
      cost = Math.round((meters + waste) * avgCost * 100) / 100
    }

    const payload = {
      movement_code: form.movement_code.trim(),
      movement_date: form.movement_date,
      movement_type: form.movement_type,
      liquid_size: form.liquid_size,
      suction_size: form.suction_size,
      capacity_btu: form.capacity_btu||null,
      meters,
      num_coils: form.movement_type==='IN' ? numCoils : 0,
      waste_meters: form.movement_type==='OUT' ? waste : 0,
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
      ? await supabase.from('copper_movements').update(payload).eq('id',editId)
      : await supabase.from('copper_movements').insert(payload)

    if (error) alert('خطأ: ' + error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id:string) => {
    if (!confirm('حذف هذه الحركة؟')) return
    await supabase.from('copper_movements').delete().eq('id',id)
    load()
  }

  const filteredMovements = movements.filter(m=>{
    if (filterType !== 'ALL' && m.movement_type !== filterType) return false
    const s = search.toLowerCase()
    if (!s) return true
    return m.movement_code?.toLowerCase().includes(s)
        || m.liquid_size?.toLowerCase().includes(s)
        || m.suction_size?.toLowerCase().includes(s)
        || m.projects?.project_name?.toLowerCase().includes(s)
        || m.technicians?.full_name?.toLowerCase().includes(s)
        || m.reason?.toLowerCase().includes(s)
  })

  const totalStock = stockByPair.reduce((s,p)=>s+(p.current_meters||0), 0)
  const totalReceived = stockByPair.reduce((s,p)=>s+(p.total_received||0), 0)
  const totalUsed = stockByPair.reduce((s,p)=>s+(p.total_used||0), 0)
  const totalValue = stockByPair.reduce((s,p)=>s+((p.current_meters||0)*(p.avg_cost_per_meter||0)), 0)
  const lowStockPairs = stockByPair.filter(p=>p.current_meters>0 && p.current_meters<5)

  const projectSummary = projects.map((p:any)=>{
    const inMeters = movements.filter(m=>m.project_id===p.id && m.movement_type==='IN').reduce((s:number,m:any)=>s+(m.meters||0), 0)
    const outMeters = movements.filter(m=>m.project_id===p.id && m.movement_type==='OUT').reduce((s:number,m:any)=>s+(m.meters||0)+(m.waste_meters||0), 0)
    const balance = inMeters - outMeters
    return { id: p.id, name: p.project_name, in: inMeters, out: outMeters, balance, status: balance>0?'surplus':balance<0?'deficit':'balanced' }
  }).filter((p:any) => p.in>0 || p.out>0)

  const totalSurplus = projectSummary.filter((p:any)=>p.balance>0).reduce((s:number,p:any)=>s+p.balance, 0)
  const totalDeficit = projectSummary.filter((p:any)=>p.balance<0).reduce((s:number,p:any)=>s+Math.abs(p.balance), 0)

  if (loading) return <div style={{padding:'4rem',textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>

  const selectedPair = stockByPair.find(s=>s.liquid_size===form.liquid_size && s.suction_size===form.suction_size)
  const metersNum = parseFloat(form.meters)||0
  const wasteNum = parseFloat(form.waste_meters)||0
  const usingFromAvg = (selectedPair?.avg_cost_per_meter||0) * (metersNum + wasteNum)

  return (
    <div style={{padding:'1rem 1.25rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:22,color:'var(--cs-text)'}}>🔥 سجل النحاس</h2>
          <div style={{fontSize:12,color:'var(--cs-text-muted)',marginTop:4}}>{stockByPair.length} مقاس | {movements.length} حركة</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn-primary" style={{background:'#16A34A'}} onClick={()=>openNew('IN')}><ArrowDownCircle size={16}/> + استلام</button>
          <button className="btn-primary" style={{background:'#DC2626'}} onClick={()=>openNew('OUT')}><ArrowUpCircle size={16}/> + استخدام</button>
          <button className="btn-secondary" onClick={()=>window.print()}><Printer size={15}/> طباعة</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginBottom:14}}>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>📦 المخزون الحالي</div><div style={{fontSize:24,fontWeight:800,color:'var(--cs-blue)'}}>{fmt(totalStock)} م</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>📥 إجمالي مستلم</div><div style={{fontSize:24,fontWeight:800,color:'#16A34A'}}>{fmt(totalReceived)} م</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>📤 إجمالي مستخدم</div><div style={{fontSize:24,fontWeight:800,color:'#DC2626'}}>{fmt(totalUsed)} م</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>💰 قيمة المخزون</div><div style={{fontSize:24,fontWeight:800,color:'var(--cs-green)'}}>{fmt(totalValue)} ر.س</div></div>
        <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>⚠️ مقاسات قاربت النفاد</div><div style={{fontSize:24,fontWeight:800,color:lowStockPairs.length>0?'var(--cs-orange)':'var(--cs-text-muted)'}}>{lowStockPairs.length}</div></div>
      </div>

      {lowStockPairs.length>0 && (
        <div className="card" style={{marginBottom:14,padding:'10px 14px',background:'#FEF3C7',border:'1px solid #FBBF24'}}>
          <div style={{fontSize:13,color:'#92400E'}}>
            ⚠️ <strong>مقاسات قاربت على النفاد:</strong> {lowStockPairs.map(p=>`${p.liquid_size}×${p.suction_size} (${fmt(p.current_meters)}م)`).join(' · ')}
          </div>
        </div>
      )}

      {projectSummary.length > 0 && (
        <div className="card" style={{marginBottom:14,padding:'1rem 1.25rem',background:'linear-gradient(135deg, #FFF8E7 0%, #FEFCE8 100%)',border:'1px solid #FBBF2440'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
            <h3 style={{margin:0,fontSize:15,color:'#92400E'}}>📊 ملخص المخزون حسب المشروع</h3>
            {(totalSurplus > 0 || totalDeficit > 0) && (
              <div style={{display:'flex',gap:14,fontSize:12}}>
                {totalSurplus > 0 && <span style={{color:'#16A34A',fontWeight:700}}>🟢 الفائض: {fmt(totalSurplus)} م</span>}
                {totalDeficit > 0 && <span style={{color:'#DC2626',fontWeight:700}}>🔴 النقص: {fmt(totalDeficit)} م</span>}
              </div>
            )}
          </div>
          {totalSurplus > 0 && totalDeficit > 0 && (
            <div style={{background:'#DBEAFE',borderRadius:6,padding:'8px 12px',fontSize:12,color:'#1E40AF',marginBottom:10}}>
              💡 يمكنك استخدام {fmt(Math.min(totalSurplus, totalDeficit))} م من المشاريع ذات الفائض لتغطية المشاريع ذات النقص
            </div>
          )}
          <div style={{overflow:'auto',background:'white',borderRadius:8}}>
            <table className="cs-table" style={{margin:0,fontSize:13}}>
              <thead><tr><th style={{textAlign:'right'}}>المشروع</th><th>📥 مستلم</th><th>📤 مستخدم</th><th>الرصيد</th><th>الحالة</th></tr></thead>
              <tbody>
                {projectSummary.map((p:any)=>(
                  <tr key={p.id}>
                    <td style={{textAlign:'right',fontWeight:600}}>{p.name}</td>
                    <td style={{color:'#16A34A',fontWeight:600}}>{fmt(p.in)} م</td>
                    <td style={{color:'#DC2626',fontWeight:600}}>{fmt(p.out)} م</td>
                    <td style={{fontWeight:800,color:p.balance>0?'#16A34A':p.balance<0?'#DC2626':'#64748B'}}>{p.balance>0?'+':''}{fmt(p.balance)} م</td>
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

      {stockByPair.length>0 && (
        <div className="card" style={{marginBottom:14,padding:14}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10,color:'var(--cs-text)'}}>
            <Boxes size={15} style={{display:'inline',verticalAlign:-2,marginLeft:6}}/> المخزون حسب المقاس
          </div>
          <div style={{overflow:'auto'}}>
            <table className="cs-table" style={{margin:0,fontSize:13}}>
              <thead><tr><th>الزوج (Liquid × Suction)</th><th>السعة (BTU)</th><th>📥 مستلم</th><th>📤 مستخدم</th><th>📦 المتاح</th><th>متوسط/متر</th><th>القيمة</th></tr></thead>
              <tbody>
                {stockByPair.map((p,i)=>(
                  <tr key={i} style={{background:p.current_meters<5?'#FEF3C7':undefined}}>
                    <td style={{fontWeight:700,color:'var(--cs-blue)'}}>{p.liquid_size} × {p.suction_size}</td>
                    <td style={{fontSize:11,color:'var(--cs-text-muted)'}}>{p.capacity_btu||'—'}</td>
                    <td style={{color:'#16A34A',fontWeight:600}}>{fmt(p.total_received)} م<span style={{fontSize:10,color:'#94A3B8',marginRight:4}}>({p.total_coils_received} لفة)</span></td>
                    <td style={{color:'#DC2626',fontWeight:600}}>{fmt(p.total_used)} م</td>
                    <td style={{fontWeight:800,fontSize:15,color:p.current_meters<5?'var(--cs-orange)':'var(--cs-blue)'}}>{fmt(p.current_meters)} م</td>
                    <td style={{color:'var(--cs-orange)'}}>{fmt(p.avg_cost_per_meter)} ر.س</td>
                    <td style={{color:'var(--cs-green)',fontWeight:700}}>{fmt(p.current_meters * p.avg_cost_per_meter)} ر.س</td>
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
          <thead><tr><th>الكود</th><th>التاريخ</th><th>النوع</th><th>الزوج</th><th>الكمية</th><th>اللفات</th><th>الفاقد</th><th>التكلفة</th><th>المشروع</th><th>الفني</th><th>السبب</th><th>إجراءات</th></tr></thead>
          <tbody>
            {filteredMovements.length===0 ? (
              <tr><td colSpan={12} style={{textAlign:'center',padding:'2rem',color:'var(--cs-text-muted)'}}>لا توجد حركات</td></tr>
            ) : filteredMovements.map(m=>(
              <tr key={m.id} style={{background:m.movement_type==='IN'?'#F0FFF4':'#FEF2F2'}}>
                <td style={{fontFamily:'monospace',fontSize:11}}>{m.movement_code}</td>
                <td style={{fontSize:11}}>{m.movement_date}</td>
                <td>
                  {m.movement_type==='IN' && <span style={{color:'#16A34A',fontWeight:700,fontSize:12}}><ArrowDownCircle size={13} style={{display:'inline',verticalAlign:-2}}/> استلام</span>}
                  {m.movement_type==='OUT' && <span style={{color:'#DC2626',fontWeight:700,fontSize:12}}><ArrowUpCircle size={13} style={{display:'inline',verticalAlign:-2}}/> استخدام</span>}
                </td>
                <td style={{fontWeight:600,fontSize:12}}>{m.liquid_size} × {m.suction_size}</td>
                <td style={{fontWeight:700,color:m.movement_type==='IN'?'#16A34A':'#DC2626'}}>{m.movement_type==='IN'?'+':'-'}{fmt(m.meters)} م</td>
                <td>{m.movement_type==='IN' ? `${m.num_coils||0} لفة` : '—'}</td>
                <td style={{color:'var(--cs-orange)'}}>{m.waste_meters>0 ? `${fmt(m.waste_meters)} م` : '—'}</td>
                <td style={{color:'var(--cs-green)',fontWeight:600}}>{fmt(m.total_cost)} ر.س</td>
                <td style={{fontSize:12}}>{m.projects?.project_name || '—'}</td>
                <td style={{fontSize:12}}>{m.technicians?.full_name || '—'}</td>
                <td style={{fontSize:12}}>{m.reason || '—'}</td>
                <td>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>openEdit(m)} style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={14}/></button>
                    <button onClick={()=>del(m.id)} style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button>
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
              <h3 style={{margin:0,fontSize:16}}>{form.movement_type==='IN' ? '📥 حركة استلام' : '📤 حركة استخدام'}{editId && ' (تعديل)'}</h3>
              <button onClick={()=>setModal(false)} style={{background:'transparent',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>

            <div style={{padding:20}}>
              {!editId && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                  <button className={form.movement_type==='IN'?'btn-primary':'btn-secondary'} style={{padding:10,background:form.movement_type==='IN'?'#16A34A':undefined,border:form.movement_type!=='IN'?'1px dashed #cbd5e1':undefined}} onClick={()=>setForm({...form,movement_type:'IN',reason:'شراء جديد'})}><ArrowDownCircle size={16}/> استلام (إضافة مخزون)</button>
                  <button className={form.movement_type==='OUT'?'btn-primary':'btn-secondary'} style={{padding:10,background:form.movement_type==='OUT'?'#DC2626':undefined,border:form.movement_type!=='OUT'?'1px dashed #cbd5e1':undefined}} onClick={()=>setForm({...form,movement_type:'OUT',reason:'تركيب وحدة جديدة'})}><ArrowUpCircle size={16}/> استخدام (نقص مخزون)</button>
                </div>
              )}

              <div style={{background:'#E8F6FC',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'var(--cs-blue)'}}>
                💡 {form.movement_type==='IN' ? 'سجّل عملية شراء واحدة لأي عدد من اللفات. أدخل العدد + إجمالي الأمتار + التكلفة الإجمالية.' : 'سجّل ما استخدمه الفني من المخزون. التكلفة محسوبة تلقائياً من متوسط الاستلامات.'}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label className="form-label">رقم الحركة *</label><input className="form-input" value={form.movement_code} onChange={e=>setForm({...form,movement_code:e.target.value})}/></div>
                <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.movement_date} onChange={e=>setForm({...form,movement_date:e.target.value})}/></div>

                <div>
                  <label className="form-label">مقاس السائل (Liquid) *</label>
                  <select className="form-input" value={form.liquid_size} onChange={e=>{
                    const newLiquid = e.target.value
                    setForm({...form,liquid_size:newLiquid,capacity_btu:findBTU(newLiquid,form.suction_size)})
                  }}>
                    {LIQUID_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">مقاس الغازي (Suction) *</label>
                  <select className="form-input" value={form.suction_size} onChange={e=>{
                    const newSuction = e.target.value
                    setForm({...form,suction_size:newSuction,capacity_btu:findBTU(form.liquid_size,newSuction)})
                  }}>
                    {SUCTION_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:'1/-1',background:'#F0F9FF',borderRadius:6,padding:'8px 12px',fontSize:12,color:'var(--cs-blue)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>📐 الزوج المختار: <strong>{form.liquid_size} × {form.suction_size}</strong></span>
                  <span>💨 السعة المتوقعة: <strong>{form.capacity_btu||'غير محدد'} BTU</strong></span>
                </div>

                {form.movement_type==='OUT' && selectedPair && (
                  <div style={{gridColumn:'1/-1',background:'#F1F5F9',borderRadius:8,padding:'10px 14px',fontSize:13,display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                    <span>📦 المتاح حالياً من هذا المقاس:</span>
                    <span style={{fontWeight:700,color:selectedPair.current_meters<5?'var(--cs-orange)':'var(--cs-blue)'}}>{fmt(selectedPair.current_meters)} م | متوسط التكلفة: {fmt(selectedPair.avg_cost_per_meter)} ر.س/م</span>
                  </div>
                )}

                {form.movement_type==='IN' ? (
                  <>
                    <div>
                      <label className="form-label">عدد اللفات *</label>
                      <input type="number" min="1" max="100" className="form-input" style={{textAlign:'center',fontWeight:700,fontSize:16}} value={form.num_coils} onChange={e=>{
                        const n = e.target.value
                        const lpc = parseFloat(form.length_per_coil)||0
                        const total = (parseInt(n)||0) * lpc
                        setForm({...form,num_coils:n,meters:total>0?String(total):''})
                      }}/>
                    </div>
                    <div>
                      <label className="form-label">طول كل لفة (متر) *</label>
                      <input type="number" min="0.1" step="0.1" className="form-input" style={{textAlign:'center',fontWeight:700,fontSize:16}} value={form.length_per_coil} onChange={e=>{
                        const lpc = e.target.value
                        const n = parseInt(form.num_coils)||0
                        const total = n * (parseFloat(lpc)||0)
                        setForm({...form,length_per_coil:lpc,meters:total>0?String(total):''})
                      }}/>
                    </div>
                    <div style={{gridColumn:'1/-1',background:'#FFFDE7',borderRadius:8,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',border:'2px solid #FBBF24'}}>
                      <div>
                        <div style={{fontSize:11,color:'var(--cs-text-muted)'}}>📏 الكمية الإجمالية المحسوبة</div>
                        <div style={{fontSize:24,fontWeight:900,color:'var(--cs-blue)'}}>{fmt(parseFloat(form.meters)||0)} متر</div>
                      </div>
                      <div style={{fontSize:13,color:'var(--cs-text-muted)',textAlign:'left'}}>
                        <div>{form.num_coils||0} لفة × {form.length_per_coil||0} م</div>
                        <div style={{fontSize:11,marginTop:2}}>= {fmt((parseInt(form.num_coils)||0) * (parseFloat(form.length_per_coil)||0))} م</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{gridColumn:'1/-1'}}>
                    <label className="form-label">الكمية المستخدمة (متر) *</label>
                    <input type="number" min="0.1" step="0.1" className="form-input" style={{background:'#FFFDE7',fontWeight:700,fontSize:16,textAlign:'center'}} value={form.meters} onChange={e=>setForm({...form,meters:e.target.value})}/>
                  </div>
                )}

                {form.movement_type==='OUT' && (
                  <div>
                    <label className="form-label">الفاقد (متر)</label>
                    <input type="number" min="0" step="0.1" className="form-input" value={form.waste_meters} onChange={e=>setForm({...form,waste_meters:e.target.value})}/>
                  </div>
                )}

                {form.movement_type==='IN' ? (
                  <div style={{gridColumn:'1/-1'}}>
                    <label className="form-label">إجمالي تكلفة الشراء (ر.س) *</label>
                    <input type="number" min="0" step="0.01" className="form-input" style={{background:'#F0FFF4',fontWeight:700,fontSize:16}} placeholder="مثلاً: 8000" value={form.total_cost} onChange={e=>setForm({...form,total_cost:e.target.value})}/>
                    {metersNum>0 && parseFloat(form.total_cost)>0 && (
                      <div style={{marginTop:8,padding:'10px 14px',background:'linear-gradient(135deg, #E8F6FC 0%, #DBEAFE 100%)',borderRadius:8,border:'1px solid #93C5FD'}}>
                        <div style={{fontSize:11,color:'var(--cs-text-muted)',marginBottom:6,fontWeight:600}}>💰 ملخص التكلفة المحسوبة:</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,fontSize:13}}>
                          <div style={{background:'white',padding:'8px 12px',borderRadius:6,textAlign:'center'}}>
                            <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>تكلفة المتر</div>
                            <div style={{fontSize:18,fontWeight:800,color:'var(--cs-blue)'}}>{fmt(parseFloat(form.total_cost)/metersNum)} ر.س</div>
                          </div>
                          {parseInt(form.num_coils)>0 && (
                            <div style={{background:'white',padding:'8px 12px',borderRadius:6,textAlign:'center'}}>
                              <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>تكلفة اللفة</div>
                              <div style={{fontSize:18,fontWeight:800,color:'var(--cs-green)'}}>{fmt(parseFloat(form.total_cost)/parseInt(form.num_coils))} ر.س</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  metersNum>0 && (
                    <div style={{gridColumn:'1/-1',padding:'8px 12px',background:'#FFF8E7',borderRadius:6,fontSize:13,textAlign:'center'}}>
                      💰 التكلفة المحسوبة تلقائياً: <strong style={{color:'var(--cs-orange)',fontSize:15}}>{fmt(usingFromAvg)} ر.س</strong>
                      <span style={{fontSize:11,color:'var(--cs-text-muted)',marginRight:8}}>({fmt(metersNum+wasteNum)} م × {fmt(selectedPair?.avg_cost_per_meter||0)} ر.س)</span>
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
