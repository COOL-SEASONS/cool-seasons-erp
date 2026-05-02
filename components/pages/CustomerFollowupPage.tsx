'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, AlertTriangle, Printer} from 'lucide-react'

const CONTACT_METHODS = ['مكالمة هاتفية','واتساب','بريد إلكتروني','زيارة ميدانية','رسالة نصية']
const RATINGS = ['راضٍ جداً ⭐⭐⭐⭐⭐','راضٍ ⭐⭐⭐⭐','محايد ⭐⭐⭐','غير راضٍ ⭐⭐','شكوى رسمية ⭐']
const ACTIONS = ['تم الإغلاق','متابعة مجدولة','عرض سعر مطلوب','إرسال تقرير','إصلاح مطلوب','لا يجاوب']
const newForm = () => ({
  followup_code:`FU-${662+Math.floor(Date.now()/1000)%9000}` as string, client_id:'', project_id:'',
  service_type:'', scheduled_date: new Date().toISOString().split('T')[0],
  contact_method:'مكالمة هاتفية', summary:'', rating:'راضٍ جداً ⭐⭐⭐⭐⭐',
  action_required:'تم الإغلاق', next_date:'', assigned_to:'', status:'مفتوح'
})

  const generateCode = (rows: any[]) => {
    if(!rows.length) return 'FU-662'
    const nums = rows
      .map((r:any) => r.followup_code?.replace('FU-',''))
      .filter(Boolean)
      .map((n:string) => parseInt(n.replace(/\D/g,'')))
      .filter((n:number) => !isNaN(n))
    if(!nums.length) return 'FU-662'
    return 'FU-' + (Math.max(...nums) + 1)
  }


export default function CustomerFollowupPage() {
  const [viewItem,setViewItem]=useState<any>(null)
  const [rows,setRows] = useState<any[]>([])
  const [clients,setClients] = useState<any[]>([])
  const [projects,setProjects] = useState<any[]>([])
  const [techs,setTechs] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [search,setSearch] = useState('')
  const [modal,setModal] = useState(false)
  const [saving,setSaving] = useState(false)
  const [editId,setEditId] = useState<string|null>(null)
  const [form,setForm] = useState<any>(newForm())

  const load = async () => {
    setLoading(true)
    const [{data:f},{data:c},{data:p},{data:t}] = await Promise.all([
      supabase.from('customer_followup').select('*,clients(company_name),projects(project_name)').order('scheduled_date',{ascending:false}),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(f||[]); setClients(c||[]); setProjects(p||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openEdit = (r:any) => {
    setForm({
      followup_code:r.followup_code||'',client_id:r.client_id||'',project_id:r.project_id||'',
      service_type:r.service_type||'',scheduled_date:r.scheduled_date?.split('T')[0]||'',
      contact_method:r.contact_method||'مكالمة هاتفية',summary:r.summary||'',
      rating:r.rating||'راضٍ جداً ⭐⭐⭐⭐⭐',action_required:r.action_required||'تم الإغلاق',
      next_date:r.next_date?.split('T')[0]||'',assigned_to:r.assigned_to||'',status:r.status||'مفتوح'
    })
    setEditId(r.id); setModal(true)
  }

  const save = async () => {
    if(!form.followup_code.trim()){alert('الكود مطلوب');return}
    setSaving(true)
    const payload = {
      followup_code:form.followup_code.trim(),
      client_id:form.client_id||null,
      project_id:form.project_id||null,
      service_type:form.service_type||null,
      scheduled_date:form.scheduled_date||null,
      contact_method:form.contact_method||null,
      summary:form.summary||null,
      rating:form.rating||null,
      action_required:form.action_required||null,
      next_date:form.next_date||null,
      assigned_to:form.assigned_to||null,
      status:form.status||'مفتوح'
    }
    const {error} = editId
      ? await supabase.from('customer_followup').update(payload).eq('id',editId)
      : await supabase.from('customer_followup').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('customer_followup').delete().eq('id',id); load() }

  const today = new Date().toISOString().split('T')[0]
  const todayFollowups = rows.filter(r=>r.scheduled_date?.split('T')[0]===today)
  const complaints = rows.filter(r=>r.rating?.includes('شكوى'))
  const filtered = rows.filter(r=>r.clients?.company_name?.toLowerCase().includes(search.toLowerCase())||r.followup_code?.includes(search))

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">متابعة العملاء</div><div className="page-subtitle">{rows.length} متابعة</div></div>
        <button className="btn-primary" onClick={()=>{setForm({...newForm(),followup_code:'FU-'+(rows.length+662)});setEditId(null);setModal(true)}}><Plus size={16}/>متابعة جديدة</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12,marginBottom:16}}>
        {[{l:'متابعات اليوم',v:todayFollowups.length,c:'var(--cs-blue)'},{l:'راضٍ جداً',v:rows.filter(r=>r.rating?.includes('جداً')).length,c:'var(--cs-green)'},{l:'شكاوى مفتوحة',v:complaints.length,c:'var(--cs-red)'},{l:'متابعة مطلوبة',v:rows.filter(r=>r.status==='مفتوح').length,c:'var(--cs-orange)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>

      {todayFollowups.length>0&&(
        <div style={{background:'#E8F6FC',border:'1px solid #1E9CD730',borderRadius:8,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
          <AlertTriangle size={16} color="var(--cs-blue)"/>
          <span style={{fontSize:13,fontWeight:700,color:'var(--cs-blue)'}}>متابعات اليوم: {todayFollowups.map(r=>r.clients?.company_name||r.followup_code).join('، ')}</span>
        </div>
      )}

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالعميل أو الكود..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>

      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>العميل</th><th>التاريخ</th><th>طريقة التواصل</th><th>التقييم</th><th>الإجراء</th><th>الموعد القادم</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد متابعات</td></tr>
              :filtered.map(r=>(
                <tr key={r.id} style={{background:r.rating?.includes('شكوى')?'#FFF5F5':r.scheduled_date?.split('T')[0]===today?'#F0FAFF':'inherit'}}>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{r.followup_code}</td>
                  <td style={{fontWeight:600}}>{r.clients?.company_name||'—'}</td>
                  <td style={{fontSize:12}}>{r.scheduled_date?.split('T')[0]}</td>
                  <td>{r.contact_method}</td>
                  <td style={{fontSize:12}}>{r.rating}</td>
                  <td style={{fontSize:12}}>{r.action_required}</td>
                  <td style={{fontSize:12,color:r.next_date&&r.next_date.split('T')[0]<=today?'var(--cs-red)':'inherit'}}>{r.next_date?.split('T')[0]||'—'}</td>
                  <td><span className={`badge ${r.status==='مكتمل'?'badge-green':r.status==='مفتوح'?'badge-blue':'badge-gray'}`}>{r.status}</span></td>
                  <td><div style={{display:'flex',gap:6}}>
                    <button onClick={()=>setViewItem(r)} title="عرض وطباعة" style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                    <button onClick={()=>openEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                    <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      
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

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'متابعة جديدة'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود المتابعة *</label><input className="form-input" placeholder="FU-001" value={form.followup_code} onChange={e=>setForm({...form,followup_code:e.target.value})}/></div>
              <div><label className="form-label">تاريخ المتابعة</label><input type="date" className="form-input" value={form.scheduled_date} onChange={e=>setForm({...form,scheduled_date:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">المشروع (اختياري)</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">طريقة التواصل</label><select className="form-input" value={form.contact_method} onChange={e=>setForm({...form,contact_method:e.target.value})}>{CONTACT_METHODS.map(m=><option key={m}>{m}</option>)}</select></div>
              <div><label className="form-label">المسؤول</label><select className="form-input" value={form.assigned_to} onChange={e=>setForm({...form,assigned_to:e.target.value})}><option value="">— اختر —</option>{techs.map(t=><option key={t.id} value={t.full_name}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">تقييم العميل</label><select className="form-input" value={form.rating} onChange={e=>setForm({...form,rating:e.target.value})}>{RATINGS.map(r=><option key={r}>{r}</option>)}</select></div>
              <div><label className="form-label">الإجراء المطلوب</label><select className="form-input" value={form.action_required} onChange={e=>setForm({...form,action_required:e.target.value})}>{ACTIONS.map(a=><option key={a}>{a}</option>)}</select></div>
              <div><label className="form-label">الموعد القادم</label><input type="date" className="form-input" value={form.next_date} onChange={e=>setForm({...form,next_date:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="مفتوح">مفتوح</option><option value="مكتمل">مكتمل</option><option value="ملغي">ملغي</option></select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملخص المحادثة</label><textarea className="form-input" rows={3} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/></div>
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
