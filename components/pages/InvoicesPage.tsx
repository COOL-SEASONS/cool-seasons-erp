'use client'
// COOL SEASONS — مواسم البرودة ودرجة للتكييف
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer} from 'lucide-react'

const INVOICE_TYPES = ['مشروع','صيانة','AMC','توريد','استشارة','أخرى']
const STATUS_AR:any = {Draft:'مسودة',Sent:'مرسلة',Paid:'مدفوعة',Partial:'جزئي',Overdue:'متأخرة',Cancelled:'ملغية'}
const STATUS_C:any = {Draft:'badge-gray',Sent:'badge-blue',Paid:'badge-green',Partial:'badge-amber',Overdue:'badge-red',Cancelled:'badge-gray'}

const newForm = () => ({
  invoice_code:`INV-${1001+Math.floor(Date.now()/1000)%9000}` as string, project_id:'', client_id:'',
  invoice_date: new Date().toISOString().split('T')[0],
  due_date:'', amount:'0', paid_amount:'0',
  status:'Draft', invoice_type:'مشروع', notes:''
})

  const generateCode = (rows: any[]) => {
    if(!rows.length) return 'INV-1001'
    const nums = rows
      .map((r:any) => r.invoice_code?.replace('INV-',''))
      .filter(Boolean)
      .map((n:string) => parseInt(n.replace(/\D/g,'')))
      .filter((n:number) => !isNaN(n))
    if(!nums.length) return 'INV-1001'
    return 'INV-' + (Math.max(...nums) + 1)
  }


export default function InvoicesPage() {
  const [rows,setRows]=useState<any[]>([])
  const [clients,setClients]=useState<any[]>([])
  const [projects,setProjects]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [viewItem,setViewItem]=useState<any>(null)
  const [search,setSearch]=useState('')
  const [modal,setModal]=useState(false)
  const [saving,setSaving]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [form,setForm]=useState<any>(newForm())

  const load=async()=>{
    setLoading(true)
    const [{data:inv},{data:c},{data:p}]=await Promise.all([
      supabase.from('invoices').select('*,clients(company_name),projects(project_name)').order('invoice_date',{ascending:false}),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name,client_id'),
    ])
    setRows(inv||[]); setClients(c||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openAdd=()=>{setForm({...newForm(), invoice_code: generateCode(rows)});setEditId(null);setModal(true)}
  const openEdit=(r:any)=>{
    setForm({
      invoice_code:r.invoice_code||'',
      project_id:r.project_id||'',
      client_id:r.client_id||'',
      invoice_date:r.invoice_date?.split('T')[0]||'',
      due_date:r.due_date?.split('T')[0]||'',
      amount:String(r.amount??0),
      paid_amount:String(r.paid_amount??0),
      status:r.status||'Draft',
      invoice_type:r.invoice_type||'مشروع',
      notes:r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save=async()=>{
    if(!form.invoice_code.trim()){alert('رقم الفاتورة مطلوب');return}
    setSaving(true)
    const payload={
      invoice_code:form.invoice_code.trim(),
      project_id:form.project_id||null,
      client_id:form.client_id||null,
      invoice_date:form.invoice_date||null,
      due_date:form.due_date||null,
      amount:parseFloat(form.amount)||0,
      paid_amount:parseFloat(form.paid_amount)||0,
      status:form.status,
      invoice_type:form.invoice_type,
      notes:form.notes||null,
    }
    const {error}=editId
      ? await supabase.from('invoices').update(payload).eq('id',editId)
      : await supabase.from('invoices').insert(payload)
    if(error){alert('خطأ في الحفظ: '+error.message)}
    else{setModal(false);load()}
    setSaving(false)
  }

  const del=async(id:string)=>{
    if(!confirm('حذف هذه الفاتورة؟'))return
    await supabase.from('invoices').delete().eq('id',id);load()
  }

  const amt=parseFloat(form.amount)||0
  const vat=Math.round(amt*15)/100
  const total=Math.round(amt*115)/100
  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered=rows.filter(r=>r.invoice_code?.includes(search)||r.clients?.company_name?.toLowerCase().includes(search.toLowerCase()))
  const totalInv=rows.reduce((s,r)=>s+(r.total_amount||0),0)
  const totalPaid=rows.reduce((s,r)=>s+(r.paid_amount||0),0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">الفواتير</div><div className="page-subtitle">{rows.length} فاتورة</div></div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/>فاتورة جديدة</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
        <div className="stat-card"><div style={{fontSize:12,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:6}}>إجمالي الفواتير</div><div style={{fontSize:20,fontWeight:800,color:'var(--cs-blue)'}}>{fmt(totalInv)} ر.س</div></div>
        <div className="stat-card"><div style={{fontSize:12,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:6}}>المحصّل</div><div style={{fontSize:20,fontWeight:800,color:'var(--cs-green)'}}>{fmt(totalPaid)} ر.س</div></div>
        <div className="stat-card"><div style={{fontSize:12,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:6}}>المستحق</div><div style={{fontSize:20,fontWeight:800,color:'var(--cs-red)'}}>{fmt(totalInv-totalPaid)} ر.س</div></div>
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>رقم الفاتورة</th><th>العميل</th><th>النوع</th><th>المبلغ</th><th>VAT+الإجمالي</th><th>المدفوع</th><th>الرصيد</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد فواتير — اضغط "فاتورة جديدة"</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.invoice_code}</span></td>
                  <td style={{fontWeight:600}}>{r.clients?.company_name||'—'}</td>
                  <td>{r.invoice_type}</td>
                  <td>{fmt(r.amount)} ر.س</td>
                  <td style={{fontWeight:600}}>{fmt(r.vat_amount||0)} + {fmt(r.total_amount||0)} ر.س</td>
                  <td style={{color:'var(--cs-green)'}}>{fmt(r.paid_amount)} ر.س</td>
                  <td style={{color:(r.balance||0)>0?'var(--cs-red)':'var(--cs-green)',fontWeight:700}}>{fmt(r.balance||0)} ر.س</td>
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
            <div style={{borderBottom:'3px solid var(--cs-blue)',paddingBottom:14,marginBottom:16,textAlign:'center'}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:900,fontSize:24,color:'var(--cs-blue)',letterSpacing:0.5}}>🏢 COOL SEASONS</div>
              <div style={{fontSize:13,color:'#1E9CD7',fontWeight:700,marginTop:2}}>مواسم البرودة ودرجة للتكييف والتبريد</div>
              <div style={{fontSize:11,color:'var(--cs-text-muted)',marginTop:1}}>HVAC & Refrigeration Solutions | DARAJA.STORE</div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16}}>تفاصيل الفاتورة</div>
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
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل الفاتورة':'فاتورة جديدة'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم الفاتورة *</label><input className="form-input" placeholder="INV-001" value={form.invoice_code} onChange={e=>setForm({...form,invoice_code:e.target.value})}/></div>
              <div><label className="form-label">نوع الفاتورة</label><select className="form-input" value={form.invoice_type} onChange={e=>setForm({...form,invoice_type:e.target.value})}>{INVOICE_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">المشروع (اختياري)</label><select className="form-input" value={form.project_id} onChange={e=>{const p=projects.find(x=>x.id===e.target.value);setForm({...form,project_id:e.target.value,client_id:p?.client_id||form.client_id})}}><option value="">— اختر مشروع —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">العميل (اختياري)</label><select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">— اختر عميل —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">تاريخ الفاتورة</label><input type="date" className="form-input" value={form.invoice_date} onChange={e=>setForm({...form,invoice_date:e.target.value})}/></div>
              <div><label className="form-label">تاريخ الاستحقاق</label><input type="date" className="form-input" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></div>
              <div><label className="form-label">المبلغ قبل VAT (ر.س)</label><input type="number" min="0" step="0.01" className="form-input" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
              <div style={{background:'#E8F6FC',borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:11,color:'var(--cs-text-muted)',marginBottom:4}}>الحساب التلقائي</div>
                <div style={{fontSize:13,color:'var(--cs-blue)'}}>VAT 15%: <strong>{fmt(vat)} ر.س</strong></div>
                <div style={{fontSize:14,fontWeight:800,color:'var(--cs-blue)'}}>الإجمالي: {fmt(total)} ر.س</div>
              </div>
              <div><label className="form-label">المبلغ المدفوع (ر.س)</label><input type="number" min="0" step="0.01" className="form-input" value={form.paid_amount} onChange={e=>setForm({...form,paid_amount:e.target.value})}/></div>
              <div style={{background:'#F0FFF4',borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:11,color:'var(--cs-text-muted)',marginBottom:4}}>الرصيد المتبقي</div>
                <div style={{fontSize:16,fontWeight:800,color:total-(parseFloat(form.paid_amount)||0)>0?'var(--cs-red)':'var(--cs-green)'}}>{fmt(total-(parseFloat(form.paid_amount)||0))} ر.س</div>
              </div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.keys(STATUS_AR).map(s=><option key={s} value={s}>{STATUS_AR[s]}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
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
