'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer} from 'lucide-react'

const CATEGORIES = ['مواد','نقل','معدات','وقود','اتصالات','طعام','صيانة','مكتبية','أخرى']
const STATUS_AR:any = {Pending:'معلق',Approved:'معتمد',Rejected:'مرفوض',Paid:'مدفوع'}
const STATUS_C:any = {Pending:'badge-amber',Approved:'badge-blue',Rejected:'badge-red',Paid:'badge-green'}

const newForm=()=>({
  expense_code:'',expense_date:new Date().toISOString().split('T')[0],
  project_id:'',tech_id:'',category:'مواد',amount:'0',
  description:'',status:'Pending',transaction_type:'صرف'
})

export default function ExpensesPage() {
  const [rows,setRows]=useState<any[]>([])
  const [techs,setTechs]=useState<any[]>([])
  const [projects,setProjects]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [viewItem,setViewItem]=useState<any>(null)
  const [search,setSearch]=useState('')
  const [filterType,setFilterType]=useState('')
  const [modal,setModal]=useState(false)
  const [saving,setSaving]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [form,setForm]=useState<any>(newForm())

  const load=async()=>{
    setLoading(true)
    const [{data:e},{data:t},{data:p}]=await Promise.all([
      supabase.from('expenses').select('*,technicians(full_name),projects(project_name)').order('created_at',{ascending:false}),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('projects').select('id,project_name'),
    ])
    setRows(e||[]); setTechs(t||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openAdd=()=>{setForm(newForm());setEditId(null);setModal(true)}
  const openEdit=(r:any)=>{
    setForm({
      expense_code:r.expense_code||'',
      expense_date:r.expense_date?.split('T')[0]||'',
      project_id:r.project_id||'',
      tech_id:r.tech_id||'',
      category:r.category||'مواد',
      amount:String(r.amount??0),
      description:r.description||'',
      status:r.status||'Pending',
      transaction_type:r.transaction_type||'صرف'
    })
    setEditId(r.id); setModal(true)
  }

  const save=async()=>{
    if(!form.expense_code.trim()){alert('كود المصروف مطلوب');return}
    if(!form.tech_id){alert('اختر الفني');return}
    setSaving(true)
    const payload={
      expense_code:form.expense_code.trim(),
      expense_date:form.expense_date||null,
      project_id:form.project_id||null,
      tech_id:form.tech_id||null,
      category:form.category||null,
      amount:parseFloat(form.amount)||0,
      description:form.description||null,
      status:form.status,
      transaction_type:form.transaction_type,
    }
    const {error}=editId
      ? await supabase.from('expenses').update(payload).eq('id',editId)
      : await supabase.from('expenses').insert(payload)
    if(error){alert('خطأ: '+error.message)}
    else{setModal(false);load()}
    setSaving(false)
  }

  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('expenses').delete().eq('id',id);load()}

  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered=rows.filter(r=>{
    const m=r.expense_code?.includes(search)||r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase())||r.description?.toLowerCase().includes(search.toLowerCase())
    const t=!filterType||r.transaction_type===filterType
    return m&&t
  })

  const totalSarf=rows.filter(r=>r.transaction_type==='صرف').reduce((s,r)=>s+(r.amount||0),0)
  const totalOhda=rows.filter(r=>r.transaction_type==='عهدة').reduce((s,r)=>s+(r.amount||0),0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">المصروفات والتكاليف</div><div className="page-subtitle">{rows.length} سجل</div></div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/>مصروف جديد</button>
      </div>
      {/* ===== TOTALS BAR ===== */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:0,marginBottom:20,borderRadius:12,overflow:'hidden',border:'1px solid var(--cs-border)',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
        {/* العهدة */}
        <div style={{background:'#FEF3E2',padding:'14px 18px',borderLeft:'1px solid var(--cs-border)'}}>
          <div style={{fontSize:11,color:'#E67E22',fontWeight:700,marginBottom:6}}>📋 إجمالي العهد</div>
          <div style={{fontSize:22,fontWeight:900,color:'#E67E22',fontFamily:'Cairo,sans-serif'}}>{fmt(totalOhda)}</div>
          <div style={{fontSize:11,color:'#E67E22',opacity:0.7,marginTop:2}}>{rows.filter(r=>r.transaction_type==='عهدة').length} سجل عهدة</div>
        </div>
        {/* الصرف */}
        <div style={{background:'#FDECEA',padding:'14px 18px',borderLeft:'1px solid var(--cs-border)'}}>
          <div style={{fontSize:11,color:'var(--cs-red)',fontWeight:700,marginBottom:6}}>💸 إجمالي الصرف</div>
          <div style={{fontSize:22,fontWeight:900,color:'var(--cs-red)',fontFamily:'Cairo,sans-serif'}}>{fmt(totalSarf)}</div>
          <div style={{fontSize:11,color:'var(--cs-red)',opacity:0.7,marginTop:2}}>{rows.filter(r=>r.transaction_type==='صرف').length} سجل صرف</div>
        </div>
        {/* إجمالي التكاليف = عهدة - صرف */}
        <div style={{background:totalOhda-totalSarf>=0?'#E8F8EF':'#FDECEA',padding:'14px 18px',position:'relative'}}>
          <div style={{fontSize:11,color:totalOhda-totalSarf>=0?'var(--cs-green)':'var(--cs-red)',fontWeight:700,marginBottom:6}}>
            📊 إجمالي التكاليف
          </div>
          <div style={{fontSize:22,fontWeight:900,color:totalOhda-totalSarf>=0?'var(--cs-green)':'var(--cs-red)',fontFamily:'Cairo,sans-serif'}}>
            {fmt(totalOhda-totalSarf)}
          </div>
          <div style={{fontSize:10,marginTop:4,color:'var(--cs-text-muted)',background:'white',borderRadius:6,padding:'3px 8px',display:'inline-block',border:'1px solid var(--cs-border)'}}>
            عهدة ({fmt(totalOhda)}) − صرف ({fmt(totalSarf)})
          </div>
        </div>
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{display:'flex',gap:10}}>
          <div style={{position:'relative',flex:1}}>
            <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
            <input className="form-input" style={{paddingRight:34}} placeholder="بحث بالكود أو الفني..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-input" style={{width:130}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="">الكل</option><option value="صرف">💸 صرف</option><option value="عهدة">📋 عهدة</option>
          </select>
        </div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>التاريخ</th><th>النوع</th><th>الفني</th><th>المشروع</th><th>الفئة</th><th>المبلغ</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
              :filtered.map(r=>(
                <tr key={r.id} style={{background:r.transaction_type==='عهدة'?'#FFFBF0':'inherit'}}>
                  <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.expense_code}</span></td>
                  <td style={{fontSize:12}}>{r.expense_date}</td>
                  <td><span className={`badge ${r.transaction_type==='عهدة'?'badge-amber':'badge-gray'}`}>{r.transaction_type==='عهدة'?'📋 عهدة':'💸 صرف'}</span></td>
                  <td style={{fontWeight:600}}>{r.technicians?.full_name||'—'}</td>
                  <td style={{fontSize:12}}>{r.projects?.project_name||<span style={{color:'var(--cs-text-muted)'}}>—</span>}</td>
                  <td>{r.category}</td>
                  <td style={{fontWeight:700}}>{fmt(r.amount)} ر.س</td>
                  <td><span className={`badge ${STATUS_C[r.status]||'badge-gray'}`}>{STATUS_AR[r.status]||r.status}</span></td>
                  <td><div style={{display:'flex',gap:6}}>
                    <button onClick={()=>setViewItem(r)} title="عرض وطباعة" style={{background:"none",border:"none",cursor:"pointer",color:"var(--cs-green)"}}><Printer size={14}/></button>
                    <button onClick={()=>openEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                    <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      
      {/* View / Print Modal */}
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
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
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
          <style>{`@media print{body *{visibility:hidden}#view-print-area,#view-print-area *{visibility:visible}#view-print-area{position:fixed;top:0;left:0;width:100%;max-height:none!important;overflow:visible!important}}`}</style>
        </div>
      )}

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'مصروف جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            {/* نوع المعاملة */}
            <div style={{display:'flex',gap:0,marginBottom:20,borderRadius:8,overflow:'hidden',border:'2px solid var(--cs-border)'}}>
              {['صرف','عهدة'].map(t=>(
                <button key={t} onClick={()=>setForm({...form,transaction_type:t})}
                  style={{flex:1,padding:'12px',border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:700,fontSize:15,
                    background:form.transaction_type===t?(t==='صرف'?'#C0392B':'#E67E22'):'white',
                    color:form.transaction_type===t?'white':'var(--cs-text-muted)'}}>
                  {t==='صرف'?'💸 صرف':'📋 عهدة'}
                </button>
              ))}
            </div>
            {form.transaction_type==='عهدة'&&<div style={{background:'#FEF3E2',border:'1px solid #E67E2240',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'#854F0B'}}>العهدة: مبلغ يُسلَّم للفني ويُحاسَب عليه لاحقاً</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود المصروف *</label><input className="form-input" placeholder="EXP-001" value={form.expense_code} onChange={e=>setForm({...form,expense_code:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.expense_date} onChange={e=>setForm({...form,expense_date:e.target.value})}/></div>
              <div><label className="form-label">الفني *</label><select className="form-input" value={form.tech_id} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">— اختر الفني —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">المشروع (اختياري)</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— بدون مشروع —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">الفئة</label><select className="form-input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label className="form-label">المبلغ (ر.س)</label><input type="number" min="0" step="0.01" className="form-input" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.keys(STATUS_AR).map(s=><option key={s} value={s}>{STATUS_AR[s]}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">الوصف</label><textarea className="form-input" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
              <button className="btn-secondary" onClick={()=>setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
