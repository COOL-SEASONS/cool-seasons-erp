'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X, Save, Search, Printer } from 'lucide-react'

const STATUS_AR:any={Draft:'مسودة',Sent:'مرسل',Accepted:'مقبول',Rejected:'مرفوض',Expired:'منتهي'}
const STATUS_C:any={Draft:'badge-gray',Sent:'badge-blue',Accepted:'badge-green',Rejected:'badge-red',Expired:'badge-amber'}

const newForm=()=>({
  quote_code:'',client_id:'',description:'',
  quote_date:new Date().toISOString().split('T')[0],expiry_date:'',
  economy_price:'0',standard_price:'0',premium_price:'0',
  status:'Draft',accepted_tier:'',notes:''
})

export default function MultiQuotesPage() {
  const [rows,setRows]=useState<any[]>([])
  const [clients,setClients]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [modal,setModal]=useState(false)
  const [saving,setSaving]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [form,setForm]=useState<any>(newForm())
  const [viewItem,setViewItem]=useState<any>(null)

  const load=async()=>{
    setLoading(true)
    const [{data:q},{data:c}]=await Promise.all([
      supabase.from('multi_quotes').select('*,clients(company_name)').order('created_at',{ascending:false}),
      supabase.from('clients').select('id,company_name'),
    ])
    setRows(q||[]); setClients(c||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openEdit=(r:any)=>{
    setForm({
      quote_code:r.quote_code||'',client_id:r.client_id||'',description:r.description||'',
      quote_date:r.quote_date?.split('T')[0]||'',expiry_date:r.expiry_date?.split('T')[0]||'',
      economy_price:String(r.economy_price||0),standard_price:String(r.standard_price||0),
      premium_price:String(r.premium_price||0),status:r.status||'Draft',
      accepted_tier:r.accepted_tier||'',notes:r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save=async()=>{
    if(!form.quote_code.trim()) return alert('رقم العرض مطلوب')
    setSaving(true)
    const ep=parseFloat(form.economy_price)||0
    const sp=parseFloat(form.standard_price)||0
    const pp=parseFloat(form.premium_price)||0
    // Core payload - columns that definitely exist
    const payload:any={
      quote_code:form.quote_code.trim(),
      client_id:form.client_id||null,
      description:form.description||null,
      quote_date:form.quote_date||null,
      expiry_date:form.expiry_date||null,
      economy_price:ep,
      economy_total:Math.round(ep*1.15*100)/100,
      standard_price:sp,
      standard_total:Math.round(sp*1.15*100)/100,
      premium_price:pp,
      premium_total:Math.round(pp*1.15*100)/100,
      status:form.status,
      notes:form.notes||null,
    }
    // Try accepted_tier - may not exist yet
    const withTier={...payload,accepted_tier:form.accepted_tier||null}
    const {error}=editId
      ? await supabase.from('multi_quotes').update(withTier).eq('id',editId)
      : await supabase.from('multi_quotes').insert(withTier)
    if(error){
      if(error.message?.includes('accepted_tier')){
        const {error:e2}=editId
          ? await supabase.from('multi_quotes').update(payload).eq('id',editId)
          : await supabase.from('multi_quotes').insert(payload)
        if(e2) alert('خطأ: '+e2.message)
        else{setModal(false);load()}
      } else alert('خطأ: '+error.message)
    } else{setModal(false);load()}
    setSaving(false)
  }

  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('multi_quotes').delete().eq('id',id);load()}
  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered=rows.filter(r=>r.quote_code?.includes(search)||r.clients?.company_name?.toLowerCase().includes(search.toLowerCase()))
  const ep=parseFloat(form.economy_price)||0
  const sp=parseFloat(form.standard_price)||0
  const pp=parseFloat(form.premium_price)||0

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">عروض أسعار متعددة الخيارات</div><div className="page-subtitle">Multi-Tier Quotes — {rows.length} عرض</div></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          <button className="btn-primary" onClick={()=>{setForm(newForm());setEditId(null);setModal(true)}}><Plus size={16}/>عرض جديد</button>
        </div>
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>رقم العرض</th><th>العميل</th><th>الوصف</th><th style={{background:'#F0FFF4',color:'var(--cs-green)'}}>💚 اقتصادي</th><th style={{background:'#FFFDF0',color:'#B7950B'}}>💛 قياسي</th><th style={{background:'#EBF5FB',color:'var(--cs-blue)'}}>💎 متميز</th><th>المقبول</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد عروض</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.quote_code}</span></td>
                  <td style={{fontWeight:600}}>{r.clients?.company_name||'—'}</td>
                  <td style={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description}</td>
                  <td style={{background:'#F0FFF4',fontWeight:700,color:'var(--cs-green)',textAlign:'center'}}>{fmt(r.economy_total||r.economy_price)} ر.س</td>
                  <td style={{background:'#FFFDF0',fontWeight:700,color:'#B7950B',textAlign:'center'}}>{fmt(r.standard_total||r.standard_price)} ر.س</td>
                  <td style={{background:'#EBF5FB',fontWeight:700,color:'var(--cs-blue)',textAlign:'center'}}>{fmt(r.premium_total||r.premium_price)} ر.س</td>
                  <td>{r.accepted_tier?<span style={{fontWeight:700,color:'var(--cs-green)'}}>{r.accepted_tier}</span>:'—'}</td>
                  <td><span className={`badge ${STATUS_C[r.status]||'badge-gray'}`}>{STATUS_AR[r.status]||r.status}</span></td>
                  <td><div style={{display:'flex',gap:4}}>
                    <button onClick={()=>setViewItem(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                    <button onClick={()=>openEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={14}/></button>
                    <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {viewItem&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div id="mq-print" className="card" style={{width:'100%',maxWidth:540,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>عرض أسعار — {viewItem.quote_code}</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><Printer size={13}/>طباعة</button>
                <button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
              </div>
            </div>
            <div style={{marginBottom:14}}><div style={{fontSize:12,color:'var(--cs-text-muted)'}}>العميل</div><div style={{fontWeight:700,fontSize:16}}>{viewItem.clients?.company_name||'—'}</div></div>
            {viewItem.description&&<div style={{marginBottom:14,padding:'8px 12px',background:'var(--cs-gray-light)',borderRadius:8,fontSize:13}}>{viewItem.description}</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
              {[{l:'💚 اقتصادي',v:viewItem.economy_total||viewItem.economy_price,c:'var(--cs-green)',bg:'#F0FFF4'},{l:'💛 قياسي',v:viewItem.standard_total||viewItem.standard_price,c:'#B7950B',bg:'#FFFDF0'},{l:'💎 متميز',v:viewItem.premium_total||viewItem.premium_price,c:'var(--cs-blue)',bg:'#EBF5FB'}].map((tier,i)=>(
                <div key={i} style={{background:tier.bg,border:`1px solid ${tier.c}30`,borderRadius:10,padding:12,textAlign:'center'}}>
                  <div style={{fontSize:12,fontWeight:700,color:tier.c,marginBottom:6}}>{tier.l}</div>
                  <div style={{fontSize:18,fontWeight:900,color:tier.c,fontFamily:'Cairo,sans-serif'}}>{fmt(tier.v)}</div>
                  <div style={{fontSize:10,color:tier.c,opacity:0.7}}>ر.س شامل VAT</div>
                </div>
              ))}
            </div>
            {viewItem.accepted_tier&&<div style={{background:'#E8F8EF',borderRadius:8,padding:'10px 14px',marginBottom:10,fontWeight:700,color:'var(--cs-green)',fontSize:14}}>✅ الخيار المقبول: {viewItem.accepted_tier}</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
              {[{l:'تاريخ العرض',v:viewItem.quote_date},{l:'تاريخ الانتهاء',v:viewItem.expiry_date},{l:'الحالة',v:STATUS_AR[viewItem.status]||viewItem.status},{l:'ملاحظات',v:viewItem.notes}].map(({l,v},i)=>v?(
                <div key={i} style={{padding:'6px 8px',borderBottom:'1px solid var(--cs-border)'}}>
                  <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:600}}>{v}</div>
                </div>
              ):null)}
            </div>
          </div>
          <style>{`@media print{body *{visibility:hidden}#mq-print,#mq-print *{visibility:visible}#mq-print{position:fixed;top:0;left:0;width:100%}}`}</style>
        </div>
      )}

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:600,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل العرض':'عرض متعدد الخيارات'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم العرض *</label><input className="form-input" placeholder="MQ-001" value={form.quote_code} onChange={e=>setForm({...form,quote_code:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">وصف العمل</label><input className="form-input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label className="form-label">تاريخ العرض</label><input type="date" className="form-input" value={form.quote_date} onChange={e=>setForm({...form,quote_date:e.target.value})}/></div>
              <div><label className="form-label">تاريخ الانتهاء</label><input type="date" className="form-input" value={form.expiry_date} onChange={e=>setForm({...form,expiry_date:e.target.value})}/></div>
            </div>
            {/* Pricing tiers */}
            <div style={{marginTop:16,marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>مستويات التسعير — قبل VAT</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                {[{key:'economy_price',label:'💚 اقتصادي',color:'var(--cs-green)',border:'#27AE60',val:ep},{key:'standard_price',label:'💛 قياسي',color:'#B7950B',border:'#F0D060',val:sp},{key:'premium_price',label:'💎 متميز',color:'var(--cs-blue)',border:'var(--cs-blue)',val:pp}].map(tier=>(
                  <div key={tier.key} style={{border:`2px solid ${tier.border}`,borderRadius:10,padding:12}}>
                    <div style={{fontSize:13,fontWeight:700,color:tier.color,marginBottom:8}}>{tier.label}</div>
                    <input type="number" min="0" className="form-input" style={{marginBottom:6}} value={form[tier.key]} onChange={e=>setForm({...form,[tier.key]:e.target.value})}/>
                    <div style={{fontSize:11,color:'var(--cs-text-muted)'}}>VAT 15%: {fmt(tier.val*0.15)} ر.س</div>
                    <div style={{fontSize:13,fontWeight:800,color:tier.color}}>الإجمالي: {fmt(Math.round(tier.val*1.15))} ر.س</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.keys(STATUS_AR).map(s=><option key={s} value={s}>{STATUS_AR[s]}</option>)}</select></div>
              <div><label className="form-label">الخيار المقبول</label><select className="form-input" value={form.accepted_tier} onChange={e=>setForm({...form,accepted_tier:e.target.value})}>
                <option value="">— لم يُختر بعد —</option>
                <option value="اقتصادي">💚 اقتصادي</option>
                <option value="قياسي">💛 قياسي</option>
                <option value="متميز">💎 متميز</option>
              </select></div>
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
