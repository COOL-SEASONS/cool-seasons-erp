'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Boxes } from 'lucide-react'

// الأزواج العالمية: [Liquid, Suction, BTU]
const PIPE_PAIRS = [
  {liquid:'1/4"', suction:'3/8"',  btu:'9,000-12,000', label:'1/4" × 3/8" — 1 طن'},
  {liquid:'1/4"', suction:'1/2"',  btu:'12,000-18,000', label:'1/4" × 1/2" — 1.5 طن'},
  {liquid:'1/4"', suction:'5/8"',  btu:'18,000-24,000', label:'1/4" × 5/8" — 2 طن'},
  {liquid:'3/8"', suction:'5/8"',  btu:'24,000-30,000', label:'3/8" × 5/8" — 2.5-3 طن ⭐'},
  {liquid:'3/8"', suction:'3/4"',  btu:'30,000-36,000', label:'3/8" × 3/4" — 3 طن'},
  {liquid:'3/8"', suction:'7/8"',  btu:'36,000-48,000', label:'3/8" × 7/8" — 3-4 طن ⭐'},
  {liquid:'1/2"', suction:'7/8"',  btu:'48,000-60,000', label:'1/2" × 7/8" — 4-5 طن'},
  {liquid:'1/2"', suction:'1-1/8"',btu:'60,000+',       label:'1/2" × 1-1/8" — 5+ طن'},
  {liquid:'5/8"', suction:'1-1/8"',btu:'VRF',           label:'5/8" × 1-1/8" — VRF كبير'},
  {liquid:'5/8"', suction:'1-3/8"',btu:'VRF/Chiller',   label:'5/8" × 1-3/8" — VRF/Chiller'},
]
const BRANDS=['Halcor','Wieland','KME','Mueller','Cambridge-Lee','Mexichem','نحاس محلي','أخرى']
const ORIGINS=['يوناني','إيطالي','ألماني','أمريكي','مكسيكي','صيني','محلي','أخرى']
const REASONS_IN=['شراء جديد','مرتجع للمخزون','نقل من فني آخر']
const REASONS_OUT=['تركيب وحدة جديدة','تمديد توصيلات','صيانة وإصلاح','استبدال خط','تالف']

const newCoilCode=()=>`COIL-${1000+Math.floor(Date.now()/1000)%9000}`
const newTransCode=()=>`CT-${5000+Math.floor(Date.now()/1000)%9000}`

const newCoil=()=>({coil_code:newCoilCode(),liquid_size:'3/8"',suction_size:'5/8"',capacity_btu:'24,000-30,000',brand:'Halcor',origin:'يوناني',custody_tech_id:'',status:'Active',notes:''})

const newTrans=(coilId='')=>({trans_code:newTransCode(),coil_id:coilId,trans_date:new Date().toISOString().split('T')[0],trans_type:'OUT',meters_before:'',meters_after:'',waste_meters:'0',tech_id:'',client_id:'',project_id:'',unit_serial:'',unit_capacity_btu:'',reason:'تركيب وحدة جديدة',purchase_total_cost:'',notes:''})

export default function CopperPipePage() {
  const [tab,setTab]=useState<'coils'|'transactions'>('coils')
  const [coils,setCoils]=useState<any[]>([])
  const [transactions,setTransactions]=useState<any[]>([])
  const [techs,setTechs]=useState<any[]>([])
  const [clients,setClients]=useState<any[]>([])
  const [projects,setProjects]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [coilModal,setCoilModal]=useState(false)
  const [transModal,setTransModal]=useState(false)
  const [saving,setSaving]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [coilForm,setCoilForm]=useState<any>(newCoil())
  const [transForm,setTransForm]=useState<any>(newTrans())
  const [viewCoil,setViewCoil]=useState<any>(null)

  const load=async()=>{
    setLoading(true)
    const [{data:c},{data:tr},{data:t},{data:cl},{data:p}]=await Promise.all([
      supabase.from('copper_coils').select('*,technicians:custody_tech_id(full_name)').order('created_at',{ascending:false}),
      supabase.from('copper_transactions').select('*,copper_coils(coil_code,pipe_pair,liquid_size,suction_size),technicians(full_name),clients(company_name),projects(project_name)').order('trans_date',{ascending:false,nullsFirst:false}),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name'),
    ])
    setCoils(c||[]); setTransactions(tr||[]); setTechs(t||[]); setClients(cl||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(n||0)

  const openEditCoil=(c:any)=>{
    setCoilForm({coil_code:c.coil_code,liquid_size:c.liquid_size||'3/8"',suction_size:c.suction_size||'5/8"',capacity_btu:c.capacity_btu||'',brand:c.brand||'Halcor',origin:c.origin||'يوناني',custody_tech_id:c.custody_tech_id||'',status:c.status||'Active',notes:c.notes||''})
    setEditId(c.id); setCoilModal(true)
  }
  const saveCoil=async()=>{
    if(!coilForm.coil_code.trim()) return alert('كود اللفة مطلوب')
    setSaving(true)
    const payload:any={coil_code:coilForm.coil_code.trim(),liquid_size:coilForm.liquid_size,suction_size:coilForm.suction_size,capacity_btu:coilForm.capacity_btu||null,brand:coilForm.brand||null,origin:coilForm.origin||null,initial_meters:0,current_meters:0,custody_tech_id:coilForm.custody_tech_id||null,status:coilForm.status,notes:coilForm.notes||null}
    if(editId) { delete payload.current_meters; delete payload.initial_meters }
    const {error}=editId?await supabase.from('copper_coils').update(payload).eq('id',editId):await supabase.from('copper_coils').insert(payload)
    if(error) alert('خطأ: '+error.message); else{
      const wasCreating = !editId
      setCoilModal(false);load()
      if(wasCreating) setTimeout(()=>alert('✅ تم إنشاء اللفة بنجاح\n\n📌 الخطوة التالية: اضغط زر "+حركة" بجانب اللفة لتسجيل أول استلام (الطول الفعلي + التكلفة الإجمالية)'),300)
    }
    setSaving(false)
  }
  const delCoil=async(id:string)=>{
    if(!confirm('حذف اللفة وجميع حركاتها؟'))return
    await supabase.from('copper_coils').delete().eq('id',id);load()
  }
  const openTransForCoil=(c:any)=>{
    const f=newTrans(c.id)
    f.meters_before=String(c.current_meters)
    f.tech_id=c.custody_tech_id||''
    setTransForm(f); setEditId(null); setTransModal(true)
  }
  const saveTrans=async()=>{
    if(!transForm.coil_id) return alert('اختر اللفة')
    if(!transForm.meters_before||!transForm.meters_after) return alert('الطول قبل وبعد مطلوبان')
    const mb=parseFloat(transForm.meters_before)
    const ma=parseFloat(transForm.meters_after)
    if(transForm.trans_type==='OUT'&&ma>=mb) return alert('في حالة الاستخدام: الطول بعد يجب أن يكون أقل من الطول قبل')
    if(transForm.trans_type==='IN'&&ma<=mb) return alert('في حالة الاستلام: الطول بعد يجب أن يكون أكبر من الطول قبل')
    setSaving(true)
    const coil=coils.find(c=>c.id===transForm.coil_id)
    const used=Math.abs(ma-mb)
    const waste=parseFloat(transForm.waste_meters)||0
    let cost = 0
    if (transForm.trans_type==='IN') {
      // عند الاستلام: التكلفة = إجمالي سعر الشراء (يدخله المستخدم)
      cost = parseFloat(transForm.purchase_total_cost)||0
    } else {
      // عند الاستخدام: التكلفة = (المستخدم + الفاقد) × متوسط تكلفة المتر من الاستلامات
      const inTrans = transactions.filter(t=>t.coil_id===transForm.coil_id && t.trans_type==='IN')
      const totalMIn = inTrans.reduce((s,t)=>s+(t.meters_used||0), 0)
      const totalCostIn = inTrans.reduce((s,t)=>s+(t.cost||0), 0)
      const avgCostPerM = totalMIn>0 ? totalCostIn/totalMIn : 0
      cost = Math.round((used+waste) * avgCostPerM * 100) / 100
    }
    const payload={trans_code:transForm.trans_code.trim(),coil_id:transForm.coil_id,trans_date:transForm.trans_date,trans_type:transForm.trans_type,meters_before:mb,meters_after:ma,waste_meters:waste,tech_id:transForm.tech_id||null,client_id:transForm.client_id||null,project_id:transForm.project_id||null,unit_serial:transForm.unit_serial||null,unit_capacity_btu:transForm.unit_capacity_btu||null,cost,reason:transForm.reason||null,notes:transForm.notes||null}
    const {error}=editId?await supabase.from('copper_transactions').update(payload).eq('id',editId):await supabase.from('copper_transactions').insert(payload)
    if(error) alert('خطأ: '+error.message); else{setTransModal(false);load()}
    setSaving(false)
  }
  const delTrans=async(id:string)=>{if(!confirm('حذف الحركة؟'))return;await supabase.from('copper_transactions').delete().eq('id',id);load()}

  // Stock per pair
  const stockByPair=PIPE_PAIRS.map(pair=>{
    const pairCoils=coils.filter(c=>c.liquid_size===pair.liquid&&c.suction_size===pair.suction&&c.status==='Active')
    return {pair,total:pairCoils.reduce((s,c)=>s+(c.current_meters||0),0),count:pairCoils.length}
  }).filter(x=>x.count>0)

  const totalStock=coils.reduce((s,c)=>s+(c.current_meters||0),0)
  const totalUsed=transactions.filter(t=>t.trans_type==='OUT').reduce((s,t)=>s+(t.meters_used||0)+(t.waste_meters||0),0)
  const totalWaste=transactions.reduce((s,t)=>s+(t.waste_meters||0),0)
  // قيمة المخزون = إجمالي تكلفة الاستلامات − إجمالي تكلفة الاستخدامات
  const totalValueIn=transactions.filter(t=>t.trans_type==='IN').reduce((s,t)=>s+(t.cost||0),0)
  const totalValueOut=transactions.filter(t=>t.trans_type==='OUT').reduce((s,t)=>s+(t.cost||0),0)
  const totalValue=Math.max(0,totalValueIn-totalValueOut)
  const lowStock=coils.filter(c=>c.current_meters!=null&&c.current_meters<2&&c.status==='Active')
  const coilSearch=coils.filter(c=>c.coil_code?.includes(search)||c.pipe_pair?.includes(search)||c.liquid_size?.includes(search)||c.suction_size?.includes(search)||c.technicians?.full_name?.toLowerCase().includes(search.toLowerCase()))
  const transSearch=transactions.filter(t=>t.trans_code?.includes(search)||t.copper_coils?.coil_code?.includes(search)||t.clients?.company_name?.toLowerCase().includes(search.toLowerCase()))

  const mb=parseFloat(transForm.meters_before)||0
  const ma=parseFloat(transForm.meters_after)||0
  const used=Math.abs(ma-mb)
  const waste=parseFloat(transForm.waste_meters)||0
  const selectedCoil=coils.find(c=>c.id===transForm.coil_id)
  const transCost=selectedCoil?(used+waste)*(selectedCoil.unit_cost_per_meter||0):0

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">سجل النحاس — Copper Tracking</div>
          <div className="page-subtitle">{coils.length} لفة | {transactions.length} حركة</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          {tab==='coils'?
            <button className="btn-primary" onClick={()=>{setCoilForm(newCoil());setEditId(null);setCoilModal(true)}}><Plus size={16}/>لفة جديدة</button>
            :<button className="btn-primary" onClick={()=>{setTransForm(newTrans());setEditId(null);setTransModal(true)}}><Plus size={16}/>حركة جديدة</button>
          }
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:12,marginBottom:16}}>
        <div className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>📦 المخزون الحالي</div><div style={{fontSize:22,fontWeight:800,color:'var(--cs-blue)'}}>{fmt(totalStock)} م</div></div>
        <div className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>📊 إجمالي مستخدم</div><div style={{fontSize:22,fontWeight:800,color:'var(--cs-orange)'}}>{fmt(totalUsed)} م</div></div>
        <div className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>🗑 الفاقد الكلي</div><div style={{fontSize:22,fontWeight:800,color:'var(--cs-red)'}}>{fmt(totalWaste)} م</div></div>
        <div className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>💰 قيمة المخزون</div><div style={{fontSize:18,fontWeight:800,color:'var(--cs-green)'}}>{fmt(totalValue)} ر.س</div></div>
        <div className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>⚠️ مخزون منخفض</div><div style={{fontSize:22,fontWeight:800,color:lowStock.length>0?'var(--cs-red)':'var(--cs-text-muted)'}}>{lowStock.length}</div></div>
      </div>

      {/* Stock by size — KEY FEATURE */}
      {stockByPair.length>0&&(
        <div className="card" style={{marginBottom:16,padding:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:'var(--cs-text)'}}><Boxes size={14} style={{display:'inline',verticalAlign:-2,marginLeft:6}}/>المخزون حسب الزوج (Pair)</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8}}>
            {stockByPair.map(({pair,total,count})=>(
              <div key={pair.liquid+pair.suction} style={{background:'linear-gradient(135deg, #FFF8DC 0%, #FFFAE6 100%)',border:'1px solid #FFD70030',borderRadius:8,padding:'10px 12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={{fontSize:10,color:'#B7950B',fontWeight:700}}>{count} لفة</span>
                  <span style={{fontSize:9,color:'#B7950B'}}>{pair.btu} BTU</span>
                </div>
                <div style={{fontFamily:'monospace',fontSize:13,fontWeight:800,color:'#7B5800',textAlign:'center'}}>{pair.liquid} × {pair.suction}</div>
                <div style={{fontSize:18,fontWeight:900,color:'#7B5800',textAlign:'center',marginTop:4}}>{fmt(total)} م</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lowStock.length>0&&(
        <div style={{background:'#FFF5F5',border:'1px solid #C0392B30',borderRadius:8,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
          <AlertTriangle size={16} color="var(--cs-red)"/>
          <span style={{fontSize:13,color:'var(--cs-red)',fontWeight:700}}>لفات قاربت على النفاد: {lowStock.map(c=>`${c.coil_code} (${c.liquid_size}×${c.suction_size}, ${fmt(c.current_meters)}م)`).join('، ')}</span>
        </div>
      )}

      <div style={{display:'flex',gap:0,marginBottom:16,borderRadius:10,overflow:'hidden',border:'1px solid var(--cs-border)',background:'white'}}>
        {[{k:'coils',l:'📦 اللفات',c:coils.length},{k:'transactions',l:'📝 الحركات',c:transactions.length}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as any)} style={{flex:1,padding:'12px 16px',border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:700,fontSize:14,background:tab===t.k?'var(--cs-blue)':'white',color:tab===t.k?'white':'var(--cs-text-muted)'}}>
            {t.l} <span style={{background:tab===t.k?'rgba(255,255,255,0.25)':'var(--cs-blue-light)',color:tab===t.k?'white':'var(--cs-blue)',borderRadius:10,padding:'1px 8px',fontSize:11,marginRight:4}}>{t.c}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{marginBottom:14,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>

      {tab==='coils'&&(
        <div className="card">
          {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
            <div className="table-wrap"><table>
              <thead><tr><th>الكود</th><th>الزوج (Pair)</th><th>السعة</th><th>الماركة</th><th>الطول الأولي</th><th>المتبقي</th><th>المستخدم</th><th>التكلفة/م</th><th>في عهدة</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {coilSearch.length===0?<tr><td colSpan={11} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد لفات</td></tr>
                :coilSearch.map(c=>{
                  const used=transactions.filter(t=>t.coil_id===c.id&&t.trans_type==='OUT').reduce((s,t)=>s+(t.meters_used||0)+(t.waste_meters||0),0)
                  const initialIn=transactions.filter(t=>t.coil_id===c.id&&t.trans_type==='IN').reduce((s,t)=>s+(t.meters_used||0),0)
                  const isLow=c.current_meters<2
                  const isEmpty=c.current_meters<=0
                  return (
                    <tr key={c.id} style={{background:isEmpty?'#FFF5F5':isLow?'#FFFBF0':'inherit'}}>
                      <td><span style={{fontFamily:'monospace',background:'#FFF8DC',color:'#7B5800',padding:'2px 8px',borderRadius:4,fontSize:12,fontWeight:700}}>{c.coil_code}</span></td>
                      <td style={{fontFamily:'monospace',fontWeight:700,fontSize:13}}>{c.liquid_size} × {c.suction_size}</td>
                      <td style={{fontSize:11,color:'var(--cs-text-muted)'}}>{c.capacity_btu||'—'}</td>
                      <td>{c.brand||'—'}</td>
                      <td style={{fontSize:12}}>{fmt(initialIn)} م</td>
                      <td style={{fontWeight:800,color:isEmpty?'var(--cs-red)':isLow?'var(--cs-orange)':'var(--cs-green)',fontSize:14}}>{fmt(c.current_meters)} م</td>
                      <td style={{color:'var(--cs-orange)',fontSize:12}}>{fmt(used)} م</td>
                      <td>{(function(){const ins=transactions.filter(t=>t.coil_id===c.id&&t.trans_type==='IN');const tm=ins.reduce((s,t)=>s+(t.meters_used||0),0);const tc=ins.reduce((s,t)=>s+(t.cost||0),0);return tm>0?fmt(tc/tm):'—'})()} ر.س</td>
                      <td style={{fontSize:12}}>{c.technicians?.full_name||'—'}</td>
                      <td><span className={`badge ${c.status==='Active'?'badge-green':c.status==='Empty'?'badge-red':'badge-gray'}`}>{c.status==='Active'?'نشطة':c.status==='Empty'?'فارغة':c.status}</span></td>
                      <td><div style={{display:'flex',gap:4}}>
                        <button onClick={()=>openTransForCoil(c)} title="حركة جديدة" style={{background:'var(--cs-green)',color:'white',border:'none',cursor:'pointer',borderRadius:4,padding:'3px 6px',fontSize:11}}>+حركة</button>
                        <button onClick={()=>setViewCoil(c)} title="تفاصيل" style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Boxes size={14}/></button>
                        <button onClick={()=>openEditCoil(c)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={14}/></button>
                        <button onClick={()=>delCoil(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button>
                      </div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {tab==='transactions'&&(
        <div className="card">
          {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
            <div className="table-wrap"><table>
              <thead><tr><th>الكود</th><th>التاريخ</th><th>النوع</th><th>اللفة</th><th>الزوج</th><th>قبل</th><th>بعد</th><th>المستخدم</th><th>الفاقد</th><th>التكلفة</th><th>الفني</th><th>العميل/المشروع</th><th>السبب</th><th>إجراءات</th></tr></thead>
              <tbody>
                {transSearch.length===0?<tr><td colSpan={14} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد حركات</td></tr>
                :transSearch.map(t=>(
                  <tr key={t.id} style={{background:t.trans_type==='IN'?'#F0FFF4':'#FFF5F5'}}>
                    <td style={{fontFamily:'monospace',fontSize:11}}>{t.trans_code}</td>
                    <td style={{fontSize:11}}>{t.trans_date?.split('T')[0]||'—'}</td>
                    <td>{t.trans_type==='IN'?<span style={{color:'var(--cs-green)',fontWeight:800,fontSize:11}}><ArrowDownCircle size={11} style={{display:'inline',verticalAlign:-1}}/> استلام</span>:<span style={{color:'var(--cs-red)',fontWeight:800,fontSize:11}}><ArrowUpCircle size={11} style={{display:'inline',verticalAlign:-1}}/> استخدام</span>}</td>
                    <td style={{fontFamily:'monospace',fontSize:11}}>{t.copper_coils?.coil_code||'—'}</td>
                    <td style={{fontFamily:'monospace',fontWeight:700}}>{t.copper_coils?.pipe_pair||(t.copper_coils?.liquid_size+'×'+t.copper_coils?.suction_size)||'—'}</td>
                    <td style={{fontSize:11}}>{fmt(t.meters_before)}</td>
                    <td style={{fontSize:11}}>{fmt(t.meters_after)}</td>
                    <td style={{fontWeight:800,color:t.trans_type==='IN'?'var(--cs-green)':'var(--cs-red)',fontSize:13}}>{t.trans_type==='IN'?'+':'−'}{fmt(t.meters_used)} م</td>
                    <td style={{color:'var(--cs-red)',fontSize:11}}>{t.waste_meters>0?fmt(t.waste_meters)+' م':'—'}</td>
                    <td style={{fontSize:11,fontWeight:600,color:'var(--cs-orange)'}}>{fmt(t.cost)} ر.س</td>
                    <td style={{fontSize:11}}>{t.technicians?.full_name||'—'}</td>
                    <td style={{fontSize:11,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.clients?.company_name||t.projects?.project_name||'—'}</td>
                    <td style={{fontSize:11}}>{t.reason||'—'}</td>
                    <td><button onClick={()=>delTrans(t.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {/* COIL MODAL */}
      {coilModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:600,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:18}}><div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>📦 {editId?'تعديل لفة':'لفة نحاس جديدة'}</div><button onClick={()=>setCoilModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button></div>
            <div style={{background:'#E8F6FC',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'var(--cs-blue)'}}>💡 <strong>خطوتان:</strong> (١) أنشئ اللفة هنا بمعلوماتها الأساسية فقط (الزوج، المصنع، المنشأ) · (٢) ثم سجّل أول حركة استلام لتحديد الطول الفعلي والتكلفة الإجمالية.<br/><br/>📐 ملاحظة: لفة السبليت = ماسورتان (Liquid + Suction) كقطعة واحدة. الطول 15م يعني 15م للزوج كاملاً.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود اللفة *</label><input className="form-input" value={coilForm.coil_code} onChange={e=>setCoilForm({...coilForm,coil_code:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1',background:'#FFFBF0',borderRadius:8,padding:12,border:'1px solid #FFD70040'}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:8,color:'#B7950B'}}>📏 الزوج (Liquid + Suction) — الماسورتان معاً</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:8}}>
                  <div>
                    <label className="form-label" style={{fontSize:11}}>خط السائل (Liquid)</label>
                    <select className="form-input" style={{fontFamily:'monospace',fontWeight:700}} value={coilForm.liquid_size} onChange={e=>{
                      const pair=PIPE_PAIRS.find(p=>p.liquid===e.target.value&&p.suction===coilForm.suction_size)
                      setCoilForm({...coilForm,liquid_size:e.target.value,capacity_btu:pair?pair.btu:coilForm.capacity_btu})
                    }}>
                      {Array.from(new Set(PIPE_PAIRS.map(p=>p.liquid))).map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{fontSize:11}}>خط الغاز (Suction)</label>
                    <select className="form-input" style={{fontFamily:'monospace',fontWeight:700}} value={coilForm.suction_size} onChange={e=>{
                      const pair=PIPE_PAIRS.find(p=>p.liquid===coilForm.liquid_size&&p.suction===e.target.value)
                      setCoilForm({...coilForm,suction_size:e.target.value,capacity_btu:pair?pair.btu:coilForm.capacity_btu})
                    }}>
                      {Array.from(new Set(PIPE_PAIRS.map(p=>p.suction))).map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{fontSize:11,color:'#B7950B',marginBottom:6}}>أو اختر زوج جاهز:</div>
                <select className="form-input" style={{fontSize:12}} onChange={e=>{
                  if(!e.target.value) return
                  const pair=PIPE_PAIRS[parseInt(e.target.value)]
                  setCoilForm({...coilForm,liquid_size:pair.liquid,suction_size:pair.suction,capacity_btu:pair.btu})
                }}>
                  <option value="">— اختر زوج جاهز —</option>
                  {PIPE_PAIRS.map((p,i)=><option key={i} value={i}>{p.label}</option>)}
                </select>
                <div style={{marginTop:8,padding:'6px 10px',background:'white',borderRadius:6,fontSize:12,display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:'var(--cs-text-muted)'}}>السعة المعتمدة:</span>
                  <strong style={{color:'#B7950B'}}>{coilForm.capacity_btu||'—'} BTU</strong>
                </div>
              </div>
              <div><label className="form-label">الماركة</label><select className="form-input" value={coilForm.brand} onChange={e=>setCoilForm({...coilForm,brand:e.target.value})}>{BRANDS.map(b=><option key={b}>{b}</option>)}</select></div>
              <div><label className="form-label">بلد المنشأ</label><select className="form-input" value={coilForm.origin} onChange={e=>setCoilForm({...coilForm,origin:e.target.value})}>{ORIGINS.map(o=><option key={o}>{o}</option>)}</select></div>

              <div><label className="form-label">في عهدة الفني</label><select className="form-input" value={coilForm.custody_tech_id} onChange={e=>setCoilForm({...coilForm,custody_tech_id:e.target.value})}><option value="">— مخزن الشركة —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={coilForm.status} onChange={e=>setCoilForm({...coilForm,status:e.target.value})}><option value="Active">نشطة</option><option value="Empty">فارغة</option><option value="Returned">مُرتجعة</option><option value="Damaged">تالفة</option></select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={coilForm.notes} onChange={e=>setCoilForm({...coilForm,notes:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}><button className="btn-secondary" onClick={()=>setCoilModal(false)}>إلغاء</button><button className="btn-primary" onClick={saveCoil} disabled={saving}><Save size={15}/>{saving?'جاري...':'حفظ اللفة'}</button></div>
          </div>
        </div>
      )}

      {/* TRANSACTION MODAL */}
      {transModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:620,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:18}}><div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>📝 حركة نحاس</div><button onClick={()=>setTransModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button></div>
            <div style={{display:'flex',gap:0,marginBottom:14,borderRadius:10,overflow:'hidden',border:'2px solid var(--cs-border)'}}>
              <button onClick={()=>setTransForm({...transForm,trans_type:'OUT',reason:'تركيب وحدة جديدة'})} style={{flex:1,padding:14,border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:800,fontSize:14,background:transForm.trans_type==='OUT'?'var(--cs-red)':'white',color:transForm.trans_type==='OUT'?'white':'var(--cs-text-muted)'}}>
                <ArrowUpCircle size={18} style={{display:'inline',verticalAlign:-3,marginLeft:6}}/>استخدام (نقص)
              </button>
              <button onClick={()=>setTransForm({...transForm,trans_type:'IN',reason:'شراء جديد'})} style={{flex:1,padding:14,border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:800,fontSize:14,background:transForm.trans_type==='IN'?'var(--cs-green)':'white',color:transForm.trans_type==='IN'?'white':'var(--cs-text-muted)'}}>
                <ArrowDownCircle size={18} style={{display:'inline',verticalAlign:-3,marginLeft:6}}/>استلام (إضافة)
              </button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم الحركة *</label><input className="form-input" value={transForm.trans_code} onChange={e=>setTransForm({...transForm,trans_code:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={transForm.trans_date} onChange={e=>setTransForm({...transForm,trans_date:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}>
                <label className="form-label">اللفة *</label>
                <select className="form-input" value={transForm.coil_id} onChange={e=>{
                  const coil=coils.find(c=>c.id===e.target.value)
                  setTransForm({...transForm,coil_id:e.target.value,meters_before:coil?String(coil.current_meters):''})
                }}>
                  <option value="">— اختر —</option>
                  {coils.filter(c=>c.status==='Active').map(c=><option key={c.id} value={c.id}>{c.coil_code} | {c.liquid_size}×{c.suction_size} | متبقي: {fmt(c.current_meters)} م</option>)}
                </select>
              </div>
              {selectedCoil&&(
                <div style={{gridColumn:'1/-1',background:'#F8FAFC',borderRadius:8,padding:'8px 14px',fontSize:12,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  <div><span style={{color:'var(--cs-text-muted)'}}>الزوج:</span> <strong style={{fontFamily:'monospace'}}>{selectedCoil.liquid_size} × {selectedCoil.suction_size}</strong></div>
                  <div><span style={{color:'var(--cs-text-muted)'}}>المتبقي حالياً:</span> <strong style={{color:'var(--cs-blue)'}}>{fmt(selectedCoil.current_meters)} م</strong></div>
                  <div><span style={{color:'var(--cs-text-muted)'}}>متوسط/م:</span> <strong style={{color:'var(--cs-orange)'}}>{(function(){const ins=transactions.filter(t=>t.coil_id===selectedCoil.id&&t.trans_type==='IN');const tm=ins.reduce((s,t)=>s+(t.meters_used||0),0);const tc=ins.reduce((s,t)=>s+(t.cost||0),0);return tm>0?fmt(tc/tm):'—'})()} ر.س</strong></div>
                </div>
              )}
              <div style={{gridColumn:'1/-1',background:transForm.trans_type==='OUT'?'#FFF5F5':'#F0FFF4',borderRadius:8,padding:14,border:`2px solid ${transForm.trans_type==='OUT'?'#C0392B30':'#27AE6030'}`}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:transForm.trans_type==='OUT'?'var(--cs-red)':'var(--cs-green)'}}>📏 الطول الفعلي</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div><label className="form-label" style={{fontSize:12}}>الطول قبل (م)</label><input type="number" min="0" step="0.1" className="form-input" placeholder="مثلاً: 15.0" value={transForm.meters_before} onChange={e=>setTransForm({...transForm,meters_before:e.target.value})}/></div>
                  <div><label className="form-label" style={{fontSize:12}}>الطول بعد (م)</label><input type="number" min="0" step="0.1" className="form-input" placeholder="مثلاً: 12.5" value={transForm.meters_after} onChange={e=>setTransForm({...transForm,meters_after:e.target.value})}/></div>
                </div>
                {transForm.trans_type==='OUT'&&(
                  <div><label className="form-label" style={{fontSize:12}}>الفاقد بالقص (م) — اختياري</label><input type="number" min="0" step="0.1" className="form-input" placeholder="0.0" value={transForm.waste_meters} onChange={e=>setTransForm({...transForm,waste_meters:e.target.value})}/></div>
                )}
                {(mb>=0&&ma>=0&&used>0)&&(
                  <div style={{marginTop:10,padding:'8px 12px',background:'white',borderRadius:6,display:'grid',gridTemplateColumns:waste>0?'1fr 1fr 1fr':'1fr 1fr',gap:8}}>
                    <div><span style={{fontSize:11,color:'var(--cs-text-muted)'}}>{transForm.trans_type==='OUT'?'مستخدم فعلي':'مستلم'}:</span> <strong style={{fontSize:14,color:transForm.trans_type==='OUT'?'var(--cs-red)':'var(--cs-green)'}}>{fmt(used)} م</strong></div>
                    {waste>0&&<div><span style={{fontSize:11,color:'var(--cs-text-muted)'}}>+ فاقد:</span> <strong style={{fontSize:14,color:'var(--cs-orange)'}}>{fmt(waste)} م</strong></div>}
                    <div><span style={{fontSize:11,color:'var(--cs-text-muted)'}}>التكلفة:</span> <strong style={{fontSize:14,color:'var(--cs-orange)'}}>{fmt(transForm.trans_type==='IN' ? (parseFloat(transForm.purchase_total_cost)||0) : (function(){const inTrans=transactions.filter(t=>t.coil_id===transForm.coil_id&&t.trans_type==='IN');const totalM=inTrans.reduce((s,t)=>s+(t.meters_used||0),0);const totalC=inTrans.reduce((s,t)=>s+(t.cost||0),0);const avg=totalM>0?totalC/totalM:0;return (used+waste)*avg})())} ر.س</strong></div>
                  </div>
                )}
                {transForm.trans_type==='IN'&&parseFloat(transForm.purchase_total_cost)>0&&used>0&&(
                  <div style={{marginTop:6,padding:'6px 12px',background:'#E8F6FC',borderRadius:6,fontSize:11,color:'var(--cs-blue)',textAlign:'center'}}>
                    💡 تكلفة المتر الواحد: <strong>{fmt(parseFloat(transForm.purchase_total_cost)/used)} ر.س/م</strong>
                  </div>
                )}
              </div>
              <div><label className="form-label">السبب</label><select className="form-input" value={transForm.reason} onChange={e=>setTransForm({...transForm,reason:e.target.value})}>{(transForm.trans_type==='IN'?REASONS_IN:REASONS_OUT).map(r=><option key={r}>{r}</option>)}</select></div>
              {transForm.trans_type==='IN'&&(
                <div><label className="form-label">إجمالي تكلفة الشراء (ر.س) *</label><input type="number" min="0" step="0.01" className="form-input" style={{background:'#F0FFF4',fontWeight:700}} placeholder="مثلاً: 750.00" value={transForm.purchase_total_cost} onChange={e=>setTransForm({...transForm,purchase_total_cost:e.target.value})}/></div>
              )}
              <div><label className="form-label">الفني المنفّذ</label><select className="form-input" value={transForm.tech_id} onChange={e=>setTransForm({...transForm,tech_id:e.target.value})}><option value="">— اختر —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              {transForm.trans_type==='OUT'&&(
                <>
                  <div><label className="form-label">العميل</label><select className="form-input" value={transForm.client_id} onChange={e=>setTransForm({...transForm,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
                  <div><label className="form-label">المشروع</label><select className="form-input" value={transForm.project_id} onChange={e=>setTransForm({...transForm,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
                  <div><label className="form-label">سعة الوحدة (BTU)</label><select className="form-input" value={transForm.unit_capacity_btu} onChange={e=>setTransForm({...transForm,unit_capacity_btu:e.target.value})}><option value="">— اختر —</option><option>9,000 (1 طن)</option><option>12,000</option><option>18,000</option><option>24,000 (2 طن)</option><option>30,000 (2.5 طن)</option><option>36,000 (3 طن)</option><option>48,000 (4 طن)</option><option>60,000 (5 طن)</option><option>VRF</option></select></div>
                  <div><label className="form-label">رقم الوحدة (Serial)</label><input className="form-input" dir="ltr" placeholder="رقم المكيف" value={transForm.unit_serial} onChange={e=>setTransForm({...transForm,unit_serial:e.target.value})}/></div>
                </>
              )}
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={transForm.notes} onChange={e=>setTransForm({...transForm,notes:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}><button className="btn-secondary" onClick={()=>setTransModal(false)}>إلغاء</button><button className="btn-primary" onClick={saveTrans} disabled={saving}><Save size={15}/>{saving?'جاري...':'حفظ الحركة'}</button></div>
          </div>
        </div>
      )}

      {/* COIL VIEW */}
      {viewCoil&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>📦 {viewCoil.coil_code} — {viewCoil.liquid_size} × {viewCoil.suction_size}</div>
              <button onClick={()=>setViewCoil(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
              <div className="stat-card" style={{textAlign:'center'}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>المتبقي</div><div style={{fontSize:22,fontWeight:800,color:'var(--cs-green)'}}>{fmt(viewCoil.current_meters)} م</div></div>
              <div className="stat-card" style={{textAlign:'center'}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>إجمالي مستلم</div><div style={{fontSize:22,fontWeight:800,color:'var(--cs-blue)'}}>{fmt(transactions.filter(t=>t.coil_id===viewCoil.id&&t.trans_type==='IN').reduce((s,t)=>s+(t.meters_used||0),0))} م</div></div>
              <div className="stat-card" style={{textAlign:'center'}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>إجمالي مستخدم</div><div style={{fontSize:22,fontWeight:800,color:'var(--cs-orange)'}}>{fmt(transactions.filter(t=>t.coil_id===viewCoil.id&&t.trans_type==='OUT').reduce((s,t)=>s+(t.meters_used||0)+(t.waste_meters||0),0))} م</div></div>
            </div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>📋 سجل الحركات</div>
            <div style={{maxHeight:300,overflowY:'auto'}}>
              {transactions.filter(t=>t.coil_id===viewCoil.id).map(t=>(
                <div key={t.id} style={{padding:'8px 12px',background:t.trans_type==='IN'?'#F0FFF4':'#FFF5F5',borderRadius:6,marginBottom:6,borderRight:`3px solid ${t.trans_type==='IN'?'var(--cs-green)':'var(--cs-red)'}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700}}>{t.trans_date?.split('T')[0]} — {t.reason}</div>
                    <div style={{fontSize:11,color:'var(--cs-text-muted)'}}>{t.clients?.company_name||t.projects?.project_name||t.technicians?.full_name||'—'}</div>
                  </div>
                  <div style={{textAlign:'left'}}>
                    <div style={{fontWeight:800,fontSize:14,color:t.trans_type==='IN'?'var(--cs-green)':'var(--cs-red)'}}>{t.trans_type==='IN'?'+':'−'}{fmt(t.meters_used)} م</div>
                    {t.waste_meters>0&&<div style={{fontSize:10,color:'var(--cs-orange)'}}>فاقد: {fmt(t.waste_meters)} م</div>}
                  </div>
                </div>
              ))}
              {transactions.filter(t=>t.coil_id===viewCoil.id).length===0&&<div style={{textAlign:'center',padding:20,color:'var(--cs-text-muted)',fontSize:12}}>لا توجد حركات بعد</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
