'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer, Cylinder, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from 'lucide-react'

const FREON_TYPES=['R-22','R-32','R-410A','R-404A','R-407C','R-134A','R-507A']
const BRANDS=['Honeywell','SRF','Dupont / Chemours','Mexichem','Daikin','Linde','فريون محلي','أخرى']
const ORIGINS=['مكسيكي','أمريكي','صيني','كوري','هندي','أخرى']
const REASONS_IN=['شراء جديد','مرتجع للمخزون','نقل من فني آخر']
const REASONS_OUT=['تعبئة وحدة عميل','تسريب','صيانة دورية','تالف','مفقود']

const newCylCode=()=>`CYL-${1000+Math.floor(Date.now()/1000)%9000}`
const newTransCode=()=>`FT-${5000+Math.floor(Date.now()/1000)%9000}`

const newCyl=()=>({cylinder_code:newCylCode(),freon_type:'R-32',brand:'Honeywell',origin:'مكسيكي',total_weight_kg:'13',tare_weight_kg:'8',custody_tech_id:'',status:'Active',notes:''})

const newTrans=(cylId='')=>({trans_code:newTransCode(),cylinder_id:cylId,trans_date:new Date().toISOString().split('T')[0],trans_type:'OUT',weight_before:'',weight_after:'',tech_id:'',client_id:'',project_id:'',unit_serial:'',reason:'تعبئة وحدة عميل',purchase_total_cost:'',notes:''})

export default function FreonPage() {
  const [tab,setTab]=useState<'cylinders'|'transactions'>('cylinders')
  const [cylinders,setCylinders]=useState<any[]>([])
  const [transactions,setTransactions]=useState<any[]>([])
  const [techs,setTechs]=useState<any[]>([])
  const [clients,setClients]=useState<any[]>([])
  const [projects,setProjects]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [cylModal,setCylModal]=useState(false)
  const [transModal,setTransModal]=useState(false)
  const [saving,setSaving]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [cylForm,setCylForm]=useState<any>(newCyl())
  const [transForm,setTransForm]=useState<any>(newTrans())
  const [viewCyl,setViewCyl]=useState<any>(null)

  const load=async()=>{
    setLoading(true)
    const [{data:c},{data:tr},{data:t},{data:cl},{data:p}]=await Promise.all([
      supabase.from('freon_cylinders').select('*,technicians:custody_tech_id(full_name)').order('created_at',{ascending:false}),
      supabase.from('freon_transactions').select('*,freon_cylinders(cylinder_code,freon_type),technicians(full_name),clients(company_name),projects(project_name)').order('trans_date',{ascending:false,nullsFirst:false}),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name'),
    ])
    setCylinders(c||[]); setTransactions(tr||[]); setTechs(t||[]); setClients(cl||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(n||0)

  // ════════════════════ Cylinder ops ════════════════════
  const openEditCyl=(c:any)=>{
    setCylForm({cylinder_code:c.cylinder_code,freon_type:c.freon_type,brand:c.brand||'Honeywell',origin:c.origin||'مكسيكي',total_weight_kg:String(c.total_weight_kg),tare_weight_kg:String(c.tare_weight_kg),custody_tech_id:c.custody_tech_id||'',status:c.status||'Active',notes:c.notes||''})
    setEditId(c.id); setCylModal(true)
  }
  const saveCyl=async()=>{
    if(!cylForm.cylinder_code.trim()) return alert('كود الأسطوانة مطلوب')
    setSaving(true)
    const total=parseFloat(cylForm.total_weight_kg)||0
    const tare=parseFloat(cylForm.tare_weight_kg)||0
    const payload:any={cylinder_code:cylForm.cylinder_code.trim(),freon_type:cylForm.freon_type,brand:cylForm.brand||null,origin:cylForm.origin||null,total_weight_kg:total,tare_weight_kg:tare,initial_freon_kg:0,current_freon_kg:0,custody_tech_id:cylForm.custody_tech_id||null,status:cylForm.status,notes:cylForm.notes||null}
    if(editId) { delete payload.current_freon_kg; delete payload.initial_freon_kg }
    const {error}=editId?await supabase.from('freon_cylinders').update(payload).eq('id',editId):await supabase.from('freon_cylinders').insert(payload)
    if(error) alert('خطأ: '+error.message); else{
      const wasCreating = !editId
      setCylModal(false);load()
      if(wasCreating) setTimeout(()=>alert('✅ تم إنشاء الأسطوانة بنجاح\n\n📌 الخطوة التالية: اضغط زر "+حركة" بجانب الأسطوانة لتسجيل أول استلام (الكمية المشتراة + التكلفة)'),300)
    }
    setSaving(false)
  }
  const delCyl=async(id:string)=>{
    if(!confirm('حذف الأسطوانة وجميع حركاتها؟'))return
    await supabase.from('freon_cylinders').delete().eq('id',id);load()
  }

  // ════════════════════ Transaction ops ════════════════════
  const openTransForCyl=(c:any)=>{
    const f=newTrans(c.id)
    f.weight_before=String(c.tare_weight_kg+c.current_freon_kg) // current total weight
    f.tech_id=c.custody_tech_id||''
    setTransForm(f); setEditId(null); setTransModal(true)
  }
  const saveTrans=async()=>{
    if(!transForm.cylinder_id) return alert('اختر الأسطوانة')
    if(!transForm.weight_before||!transForm.weight_after) return alert('الوزن قبل وبعد مطلوبان')
    const wb=parseFloat(transForm.weight_before)
    const wa=parseFloat(transForm.weight_after)
    if(transForm.trans_type==='OUT'&&wa>=wb) return alert('في حالة الاستخدام: الوزن بعد يجب أن يكون أقل من الوزن قبل')
    if(transForm.trans_type==='IN'&&wa<=wb) return alert('في حالة الاستلام: الوزن بعد يجب أن يكون أكبر من الوزن قبل')
    setSaving(true)
    const cyl=cylinders.find(c=>c.id===transForm.cylinder_id)
    const netKg=Math.abs(wa-wb)
    let cost = 0
    if (transForm.trans_type==='IN') {
      // عند الاستلام: التكلفة = إجمالي سعر الشراء (يدخله المستخدم)
      cost = parseFloat(transForm.purchase_total_cost)||0
    } else {
      // عند الاستخدام: التكلفة = الكمية × متوسط تكلفة الكيلو من سجل الاستلامات
      const inTrans = transactions.filter(t=>t.cylinder_id===transForm.cylinder_id && t.trans_type==='IN')
      const totalKgIn = inTrans.reduce((s,t)=>s+(t.net_kg||0), 0)
      const totalCostIn = inTrans.reduce((s,t)=>s+(t.cost||0), 0)
      const avgCostPerKg = totalKgIn>0 ? totalCostIn/totalKgIn : 0
      cost = Math.round(netKg * avgCostPerKg * 100) / 100
    }
    const payload={trans_code:transForm.trans_code.trim(),cylinder_id:transForm.cylinder_id,trans_date:transForm.trans_date,trans_type:transForm.trans_type,weight_before:wb,weight_after:wa,tech_id:transForm.tech_id||null,client_id:transForm.client_id||null,project_id:transForm.project_id||null,unit_serial:transForm.unit_serial||null,cost,reason:transForm.reason||null,notes:transForm.notes||null}
    const {error}=editId?await supabase.from('freon_transactions').update(payload).eq('id',editId):await supabase.from('freon_transactions').insert(payload)
    if(error) alert('خطأ: '+error.message); else{setTransModal(false);load()}
    setSaving(false)
  }
  const delTrans=async(id:string)=>{if(!confirm('حذف الحركة؟'))return;await supabase.from('freon_transactions').delete().eq('id',id);load()}

  // ════════════════════ Stats ════════════════════
  const totalStock=cylinders.reduce((s,c)=>s+(c.current_freon_kg||0),0)
  const initialTotal=cylinders.reduce((s,c)=>s+(c.initial_freon_kg||0),0)
  const totalUsed=initialTotal-totalStock
  // قيمة المخزون = مجموع تكلفة الاستلامات − مجموع تكلفة الاستخدامات
  const totalValueIn=transactions.filter(t=>t.trans_type==='IN').reduce((s,t)=>s+(t.cost||0),0)
  const totalValueOut=transactions.filter(t=>t.trans_type==='OUT').reduce((s,t)=>s+(t.cost||0),0)
  const totalValue=Math.max(0,totalValueIn-totalValueOut)
  const lowStock=cylinders.filter(c=>c.current_freon_kg!=null&&c.current_freon_kg<2&&c.status==='Active')
  const cylSearch=cylinders.filter(c=>c.cylinder_code?.includes(search)||c.freon_type?.includes(search)||c.technicians?.full_name?.toLowerCase().includes(search.toLowerCase()))
  const transSearch=transactions.filter(t=>t.trans_code?.includes(search)||t.freon_cylinders?.cylinder_code?.includes(search)||t.clients?.company_name?.toLowerCase().includes(search.toLowerCase()))

  // Form computed values
  const wb=parseFloat(transForm.weight_before)||0
  const wa=parseFloat(transForm.weight_after)||0
  const netKg=Math.abs(wa-wb)
  const selectedCyl=cylinders.find(c=>c.id===transForm.cylinder_id)
  const transCost=selectedCyl?netKg*(selectedCyl.unit_cost_per_kg||0):0

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">سجل الفريون — Cylinder Tracking</div>
          <div className="page-subtitle">{cylinders.length} أسطوانة | {transactions.length} حركة</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          {tab==='cylinders'?
            <button className="btn-primary" onClick={()=>{setCylForm(newCyl());setEditId(null);setCylModal(true)}}><Plus size={16}/>أسطوانة جديدة</button>
            :<button className="btn-primary" onClick={()=>{setTransForm(newTrans());setEditId(null);setTransModal(true)}}><Plus size={16}/>حركة جديدة</button>
          }
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:12,marginBottom:16}}>
        <div className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>📦 المخزون الحالي</div><div style={{fontSize:22,fontWeight:800,color:'var(--cs-blue)'}}>{fmt(totalStock)} كغ</div></div>
        <div className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>📊 إجمالي مستخدم</div><div style={{fontSize:22,fontWeight:800,color:'var(--cs-orange)'}}>{fmt(totalUsed)} كغ</div></div>
        <div className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>💰 قيمة المخزون</div><div style={{fontSize:18,fontWeight:800,color:'var(--cs-green)'}}>{fmt(totalValue)} ر.س</div></div>
        <div className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>⚠️ مخزون منخفض</div><div style={{fontSize:22,fontWeight:800,color:lowStock.length>0?'var(--cs-red)':'var(--cs-text-muted)'}}>{lowStock.length}</div></div>
      </div>

      {lowStock.length>0&&(
        <div style={{background:'#FFF5F5',border:'1px solid #C0392B30',borderRadius:8,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
          <AlertTriangle size={16} color="var(--cs-red)"/>
          <span style={{fontSize:13,color:'var(--cs-red)',fontWeight:700}}>أسطوانات قاربت على النفاد: {lowStock.map(c=>`${c.cylinder_code} (${fmt(c.current_freon_kg)}كغ)`).join('، ')}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:0,marginBottom:16,borderRadius:10,overflow:'hidden',border:'1px solid var(--cs-border)',background:'white'}}>
        {[{k:'cylinders',l:'📦 الأسطوانات',c:cylinders.length},{k:'transactions',l:'📝 الحركات',c:transactions.length}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as any)} style={{flex:1,padding:'12px 16px',border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:700,fontSize:14,background:tab===t.k?'var(--cs-blue)':'white',color:tab===t.k?'white':'var(--cs-text-muted)',transition:'0.2s'}}>
            {t.l} <span style={{background:tab===t.k?'rgba(255,255,255,0.25)':'var(--cs-blue-light)',color:tab===t.k?'white':'var(--cs-blue)',borderRadius:10,padding:'1px 8px',fontSize:11,marginRight:4}}>{t.c}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{marginBottom:14,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>

      {/* Tab content */}
      {tab==='cylinders'&&(
        <div className="card">
          {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
            <div className="table-wrap"><table>
              <thead><tr><th>الكود</th><th>النوع</th><th>الماركة</th><th>وزن إجمالي</th><th>وزن فارغ</th><th>الفريون الحالي</th><th>التكلفة/كغ</th><th>في عهدة</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {cylSearch.length===0?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد أسطوانات</td></tr>
                :cylSearch.map(c=>{
                  const isLow=c.current_freon_kg<2
                  const isEmpty=c.current_freon_kg<=0
                  return (
                    <tr key={c.id} style={{background:isEmpty?'#FFF5F5':isLow?'#FFFBF0':'inherit'}}>
                      <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12,fontWeight:700}}>{c.cylinder_code}</span></td>
                      <td><span className="badge badge-blue">{c.freon_type}</span></td>
                      <td>{c.brand||'—'}</td>
                      <td style={{fontSize:12}}>{fmt(c.total_weight_kg)} كغ</td>
                      <td style={{fontSize:12}}>{fmt(c.tare_weight_kg)} كغ</td>
                      <td style={{fontWeight:800,color:isEmpty?'var(--cs-red)':isLow?'var(--cs-orange)':'var(--cs-green)',fontSize:14}}>{fmt(c.current_freon_kg)} كغ</td>
                      <td>{(function(){const ins=transactions.filter(t=>t.cylinder_id===c.id&&t.trans_type==='IN');const tk=ins.reduce((s,t)=>s+(t.net_kg||0),0);const tc=ins.reduce((s,t)=>s+(t.cost||0),0);return tk>0?fmt(tc/tk):'—'})()} ر.س</td>
                      <td style={{fontSize:12}}>{c.technicians?.full_name||'—'}</td>
                      <td><span className={`badge ${c.status==='Active'?'badge-green':c.status==='Empty'?'badge-red':'badge-gray'}`}>{c.status==='Active'?'نشطة':c.status==='Empty'?'فارغة':c.status}</span></td>
                      <td><div style={{display:'flex',gap:4}}>
                        <button onClick={()=>openTransForCyl(c)} title="حركة جديدة" style={{background:'var(--cs-green)',color:'white',border:'none',cursor:'pointer',borderRadius:4,padding:'3px 6px',fontSize:11}}>+حركة</button>
                        <button onClick={()=>setViewCyl(c)} title="تفاصيل" style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Cylinder size={14}/></button>
                        <button onClick={()=>openEditCyl(c)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={14}/></button>
                        <button onClick={()=>delCyl(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button>
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
              <thead><tr><th>الكود</th><th>التاريخ</th><th>النوع</th><th>الأسطوانة</th><th>الفريون</th><th>قبل</th><th>بعد</th><th>الكمية</th><th>التكلفة</th><th>الفني</th><th>العميل</th><th>السبب</th><th>إجراءات</th></tr></thead>
              <tbody>
                {transSearch.length===0?<tr><td colSpan={13} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد حركات</td></tr>
                :transSearch.map(t=>(
                  <tr key={t.id} style={{background:t.trans_type==='IN'?'#F0FFF4':'#FFF5F5'}}>
                    <td style={{fontFamily:'monospace',fontSize:11}}>{t.trans_code}</td>
                    <td style={{fontSize:11}}>{t.trans_date?.split('T')[0]||'—'}</td>
                    <td>{t.trans_type==='IN'?<span style={{color:'var(--cs-green)',fontWeight:800,fontSize:11}}><ArrowDownCircle size={11} style={{display:'inline',verticalAlign:-1}}/> استلام</span>:<span style={{color:'var(--cs-red)',fontWeight:800,fontSize:11}}><ArrowUpCircle size={11} style={{display:'inline',verticalAlign:-1}}/> استخدام</span>}</td>
                    <td style={{fontFamily:'monospace',fontSize:11}}>{t.freon_cylinders?.cylinder_code||'—'}</td>
                    <td><span className="badge badge-blue">{t.freon_cylinders?.freon_type||'—'}</span></td>
                    <td style={{fontSize:11}}>{fmt(t.weight_before)}</td>
                    <td style={{fontSize:11}}>{fmt(t.weight_after)}</td>
                    <td style={{fontWeight:800,color:t.trans_type==='IN'?'var(--cs-green)':'var(--cs-red)',fontSize:13}}>{t.trans_type==='IN'?'+':'−'}{fmt(t.net_kg)} كغ</td>
                    <td style={{fontSize:11,fontWeight:600,color:'var(--cs-orange)'}}>{fmt(t.cost)} ر.س</td>
                    <td style={{fontSize:11}}>{t.technicians?.full_name||'—'}</td>
                    <td style={{fontSize:11,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.clients?.company_name||'—'}</td>
                    <td style={{fontSize:11}}>{t.reason||'—'}</td>
                    <td><button onClick={()=>delTrans(t.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {/* ═══════════════════ CYLINDER MODAL ═══════════════════ */}
      {cylModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:600,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:18}}><div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>📦 {editId?'تعديل أسطوانة':'أسطوانة جديدة (Cylinder)'}</div><button onClick={()=>setCylModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button></div>
            <div style={{background:'#E8F6FC',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'var(--cs-blue)'}}>💡 <strong>خطوتان:</strong> (١) أنشئ الأسطوانة هنا بمعلوماتها الأساسية فقط · (٢) ثم سجّل أول حركة استلام لتحديد الكمية المشتراة والتكلفة.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود الأسطوانة *</label><input className="form-input" value={cylForm.cylinder_code} onChange={e=>setCylForm({...cylForm,cylinder_code:e.target.value})}/></div>
              <div><label className="form-label">نوع الفريون</label><select className="form-input" value={cylForm.freon_type} onChange={e=>setCylForm({...cylForm,freon_type:e.target.value})}>{FREON_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">الماركة</label><select className="form-input" value={cylForm.brand} onChange={e=>setCylForm({...cylForm,brand:e.target.value})}>{BRANDS.map(b=><option key={b}>{b}</option>)}</select></div>
              <div><label className="form-label">بلد المنشأ</label><select className="form-input" value={cylForm.origin} onChange={e=>setCylForm({...cylForm,origin:e.target.value})}>{ORIGINS.map(o=><option key={o}>{o}</option>)}</select></div>
              <div style={{gridColumn:'1/-1',background:'#FFFBF0',borderRadius:8,padding:12}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:8,color:'#B7950B'}}>⚖️ مواصفات الأسطوانة (فارغة)</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div><label className="form-label" style={{fontSize:11}}>الوزن الكلي للأسطوانة الممتلئة (كغ)</label><input type="number" min="0" step="0.1" className="form-input" value={cylForm.total_weight_kg} onChange={e=>setCylForm({...cylForm,total_weight_kg:e.target.value})}/></div>
                  <div><label className="form-label" style={{fontSize:11}}>وزن الأسطوانة فارغة (Tare) كغ</label><input type="number" min="0" step="0.1" className="form-input" value={cylForm.tare_weight_kg} onChange={e=>setCylForm({...cylForm,tare_weight_kg:e.target.value})}/></div>
                </div>
                <div style={{fontSize:11,color:'var(--cs-text-muted)',marginTop:6}}>هذه المعلومات للمرجع فقط. الكمية الفعلية تُسجَّل عبر "حركة استلام" بعد إنشاء الأسطوانة.</div>
              </div>
              <div><label className="form-label">في عهدة الفني</label><select className="form-input" value={cylForm.custody_tech_id} onChange={e=>setCylForm({...cylForm,custody_tech_id:e.target.value})}><option value="">— مخزن الشركة —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={cylForm.status} onChange={e=>setCylForm({...cylForm,status:e.target.value})}><option value="Active">نشطة</option><option value="Empty">فارغة</option><option value="Returned">مُرتجعة</option><option value="Damaged">تالفة</option></select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={cylForm.notes} onChange={e=>setCylForm({...cylForm,notes:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}><button className="btn-secondary" onClick={()=>setCylModal(false)}>إلغاء</button><button className="btn-primary" onClick={saveCyl} disabled={saving}><Save size={15}/>{saving?'جاري...':'حفظ الأسطوانة'}</button></div>
          </div>
        </div>
      )}

      {/* ═══════════════════ TRANSACTION MODAL ═══════════════════ */}
      {transModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:620,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:18}}><div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>📝 حركة فريون جديدة</div><button onClick={()=>setTransModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button></div>
            
            {/* Transaction Type Toggle */}
            <div style={{display:'flex',gap:0,marginBottom:14,borderRadius:10,overflow:'hidden',border:'2px solid var(--cs-border)'}}>
              <button onClick={()=>setTransForm({...transForm,trans_type:'OUT',reason:'تعبئة وحدة عميل'})} style={{flex:1,padding:14,border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:800,fontSize:14,background:transForm.trans_type==='OUT'?'var(--cs-red)':'white',color:transForm.trans_type==='OUT'?'white':'var(--cs-text-muted)'}}>
                <ArrowUpCircle size={18} style={{display:'inline',verticalAlign:-3,marginLeft:6}}/>
                استخدام (نقص فريون)
              </button>
              <button onClick={()=>setTransForm({...transForm,trans_type:'IN',reason:'شراء جديد'})} style={{flex:1,padding:14,border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:800,fontSize:14,background:transForm.trans_type==='IN'?'var(--cs-green)':'white',color:transForm.trans_type==='IN'?'white':'var(--cs-text-muted)'}}>
                <ArrowDownCircle size={18} style={{display:'inline',verticalAlign:-3,marginLeft:6}}/>
                استلام (إضافة فريون)
              </button>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم الحركة *</label><input className="form-input" value={transForm.trans_code} onChange={e=>setTransForm({...transForm,trans_code:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={transForm.trans_date} onChange={e=>setTransForm({...transForm,trans_date:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}>
                <label className="form-label">الأسطوانة *</label>
                <select className="form-input" value={transForm.cylinder_id} onChange={e=>{
                  const cyl=cylinders.find(c=>c.id===e.target.value)
                  setTransForm({...transForm,cylinder_id:e.target.value,weight_before:cyl?String(cyl.tare_weight_kg+cyl.current_freon_kg):''})
                }}>
                  <option value="">— اختر —</option>
                  {cylinders.filter(c=>c.status==='Active').map(c=><option key={c.id} value={c.id}>{c.cylinder_code} | {c.freon_type} | متبقي: {fmt(c.current_freon_kg)} كغ</option>)}
                </select>
              </div>
              {selectedCyl&&(
                <div style={{gridColumn:'1/-1',background:'#F8FAFC',borderRadius:8,padding:'8px 14px',fontSize:12,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  <div><span style={{color:'var(--cs-text-muted)'}}>وزن فارغ:</span> <strong>{fmt(selectedCyl.tare_weight_kg)} كغ</strong></div>
                  <div><span style={{color:'var(--cs-text-muted)'}}>الفريون الحالي:</span> <strong style={{color:'var(--cs-blue)'}}>{fmt(selectedCyl.current_freon_kg)} كغ</strong></div>
                  <div><span style={{color:'var(--cs-text-muted)'}}>متوسط/كغ:</span> <strong style={{color:'var(--cs-orange)'}}>{(function(){const ins=transactions.filter(t=>t.cylinder_id===selectedCyl.id&&t.trans_type==='IN');const tk=ins.reduce((s,t)=>s+(t.net_kg||0),0);const tc=ins.reduce((s,t)=>s+(t.cost||0),0);return tk>0?fmt(tc/tk):'—'})()} ر.س</strong></div>
                </div>
              )}
              <div style={{gridColumn:'1/-1',background:transForm.trans_type==='OUT'?'#FFF5F5':'#F0FFF4',borderRadius:8,padding:14,border:`2px solid ${transForm.trans_type==='OUT'?'#C0392B30':'#27AE6030'}`}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:transForm.trans_type==='OUT'?'var(--cs-red)':'var(--cs-green)'}}>⚖️ الوزن الفعلي</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div><label className="form-label" style={{fontSize:12}}>الوزن قبل (كغ) — قراءة الميزان</label><input type="number" min="0" step="0.01" className="form-input" placeholder="مثلاً: 13.0" value={transForm.weight_before} onChange={e=>setTransForm({...transForm,weight_before:e.target.value})}/></div>
                  <div><label className="form-label" style={{fontSize:12}}>الوزن بعد (كغ) — قراءة الميزان</label><input type="number" min="0" step="0.01" className="form-input" placeholder="مثلاً: 11.5" value={transForm.weight_after} onChange={e=>setTransForm({...transForm,weight_after:e.target.value})}/></div>
                </div>
                {wb>0&&wa>0&&(
                  <div style={{marginTop:10,padding:'8px 12px',background:'white',borderRadius:6,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div><span style={{fontSize:11,color:'var(--cs-text-muted)'}}>الكمية {transForm.trans_type==='OUT'?'المستخدمة':'المضافة'}:</span> <strong style={{fontSize:16,color:transForm.trans_type==='OUT'?'var(--cs-red)':'var(--cs-green)'}}>{fmt(netKg)} كغ</strong></div>
                    <div><span style={{fontSize:11,color:'var(--cs-text-muted)'}}>التكلفة:</span> <strong style={{fontSize:16,color:'var(--cs-orange)'}}>{fmt(transForm.trans_type==='IN' ? (parseFloat(transForm.purchase_total_cost)||0) : (function(){const inTrans=transactions.filter(t=>t.cylinder_id===transForm.cylinder_id&&t.trans_type==='IN');const totalKgIn=inTrans.reduce((s,t)=>s+(t.net_kg||0),0);const totalCostIn=inTrans.reduce((s,t)=>s+(t.cost||0),0);const avg=totalKgIn>0?totalCostIn/totalKgIn:0;return netKg*avg})())} ر.س</strong></div>
                  </div>
                )}
                {transForm.trans_type==='IN'&&parseFloat(transForm.purchase_total_cost)>0&&netKg>0&&(
                  <div style={{marginTop:6,padding:'6px 12px',background:'#E8F6FC',borderRadius:6,fontSize:11,color:'var(--cs-blue)',textAlign:'center'}}>
                    💡 تكلفة الكيلو الواحد: <strong>{fmt(parseFloat(transForm.purchase_total_cost)/netKg)} ر.س/كغ</strong>
                  </div>
                )}
              </div>
              <div><label className="form-label">السبب</label><select className="form-input" value={transForm.reason} onChange={e=>setTransForm({...transForm,reason:e.target.value})}>{(transForm.trans_type==='IN'?REASONS_IN:REASONS_OUT).map(r=><option key={r}>{r}</option>)}</select></div>
              {transForm.trans_type==='IN'&&(
                <div><label className="form-label">إجمالي تكلفة الشراء (ر.س) *</label><input type="number" min="0" step="0.01" className="form-input" style={{background:'#F0FFF4',fontWeight:700}} placeholder="مثلاً: 450.00" value={transForm.purchase_total_cost} onChange={e=>setTransForm({...transForm,purchase_total_cost:e.target.value})}/></div>
              )}
              <div><label className="form-label">الفني المنفّذ</label><select className="form-input" value={transForm.tech_id} onChange={e=>setTransForm({...transForm,tech_id:e.target.value})}><option value="">— اختر —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              {transForm.trans_type==='OUT'&&(
                <>
                  <div><label className="form-label">العميل</label><select className="form-input" value={transForm.client_id} onChange={e=>setTransForm({...transForm,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
                  <div><label className="form-label">المشروع (اختياري)</label><select className="form-input" value={transForm.project_id} onChange={e=>setTransForm({...transForm,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
                  <div style={{gridColumn:'1/-1'}}><label className="form-label">رقم الوحدة (Serial)</label><input className="form-input" dir="ltr" placeholder="رقم المكيف المُعبّأ" value={transForm.unit_serial} onChange={e=>setTransForm({...transForm,unit_serial:e.target.value})}/></div>
                </>
              )}
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={transForm.notes} onChange={e=>setTransForm({...transForm,notes:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}><button className="btn-secondary" onClick={()=>setTransModal(false)}>إلغاء</button><button className="btn-primary" onClick={saveTrans} disabled={saving}><Save size={15}/>{saving?'جاري...':'حفظ الحركة'}</button></div>
          </div>
        </div>
      )}

      {/* CYLINDER VIEW MODAL */}
      {viewCyl&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>📦 {viewCyl.cylinder_code}</div>
              <button onClick={()=>setViewCyl(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              <div className="stat-card" style={{textAlign:'center'}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>الفريون الحالي</div><div style={{fontSize:24,fontWeight:800,color:'var(--cs-green)'}}>{fmt(viewCyl.current_freon_kg)} كغ</div></div>
              <div className="stat-card" style={{textAlign:'center'}}><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>إجمالي مستلم</div><div style={{fontSize:24,fontWeight:800,color:'var(--cs-blue)'}}>{fmt(transactions.filter(t=>t.cylinder_id===viewCyl.id&&t.trans_type==='IN').reduce((s,t)=>s+(t.net_kg||0),0))} كغ</div></div>
            </div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>📋 سجل الحركات</div>
            <div style={{maxHeight:300,overflowY:'auto'}}>
              {transactions.filter(t=>t.cylinder_id===viewCyl.id).map(t=>(
                <div key={t.id} style={{padding:'8px 12px',background:t.trans_type==='IN'?'#F0FFF4':'#FFF5F5',borderRadius:6,marginBottom:6,borderRight:`3px solid ${t.trans_type==='IN'?'var(--cs-green)':'var(--cs-red)'}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700}}>{t.trans_date?.split('T')[0]} — {t.reason}</div>
                    <div style={{fontSize:11,color:'var(--cs-text-muted)'}}>{t.clients?.company_name||t.technicians?.full_name||'—'}</div>
                  </div>
                  <div style={{fontWeight:800,fontSize:14,color:t.trans_type==='IN'?'var(--cs-green)':'var(--cs-red)'}}>{t.trans_type==='IN'?'+':'−'}{fmt(t.net_kg)} كغ</div>
                </div>
              ))}
              {transactions.filter(t=>t.cylinder_id===viewCyl.id).length===0&&<div style={{textAlign:'center',padding:20,color:'var(--cs-text-muted)',fontSize:12}}>لا توجد حركات بعد</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
