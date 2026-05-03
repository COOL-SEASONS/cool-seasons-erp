'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Edit2, X, Save, Printer, AlertTriangle } from 'lucide-react'

const REJECTION_REASONS=[
  'السعر مرتفع','المدة طويلة','عدم توفر الميزانية','اختار منافساً',
  'تأجيل المشروع','تغيير المتطلبات','عدم الرضا عن الشركة','أسباب أخرى'
]

export default function UnsoldEstimatesPage() {
  const [rows,setRows]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [editing,setEditing]=useState<any>(null)
  const [reason,setReason]=useState('')
  const [reasonText,setReasonText]=useState('')
  const [followupDate,setFollowupDate]=useState('')

  const load=async()=>{
    setLoading(true)
    const {data}=await supabase.from('quotations').select('*,clients(company_name)').in('status',['Rejected','Expired','Lost']).order('quote_date',{ascending:false,nullsFirst:false})
    setRows(data||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const startEdit=(r:any)=>{
    setEditing(r)
    setReason(r.rejection_reason||'السعر مرتفع')
    setReasonText(r.rejection_notes||'')
    setFollowupDate(r.followup_date?.split('T')[0]||'')
  }
  const saveReason=async()=>{
    if(!editing) return
    const payload={rejection_reason:reason,rejection_notes:reasonText||null,followup_date:followupDate||null}
    const {error}=await supabase.from('quotations').update(payload).eq('id',editing.id)
    if(error){
      // Try without new columns if they don't exist
      if(error.message?.includes('column')){
        const {error:e2}=await supabase.from('quotations').update({notes:`سبب الرفض: ${reason} | ${reasonText}`}).eq('id',editing.id)
        if(e2) alert('خطأ: '+e2.message)
        else{setEditing(null);load()}
      } else alert('خطأ: '+error.message)
    } else{setEditing(null);load()}
  }
  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered=rows.filter(r=>r.clients?.company_name?.toLowerCase().includes(search.toLowerCase())||r.quote_no?.includes(search))

  // إحصائيات أسباب الرفض
  const reasonStats=REJECTION_REASONS.map(r=>({reason:r,count:rows.filter(x=>x.rejection_reason===r).length})).filter(x=>x.count>0).sort((a,b)=>b.count-a.count)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">العروض غير المقبولة</div><div className="page-subtitle">{rows.length} عرض — لا تُحذف للتحليل لاحقاً</div></div>
        <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
      </div>

      <div style={{background:'#FFF3CD',border:'1px solid #FFE69C',borderRadius:8,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
        <AlertTriangle size={16} color="#856404"/>
        <span style={{fontSize:13,color:'#856404'}}>العروض المرفوضة لا يتم حذفها لتحليل أسباب الرفض وتحسين العروض المستقبلية</span>
      </div>

      {reasonStats.length>0&&(
        <div className="card" style={{marginBottom:16,padding:16}}>
          <div style={{fontWeight:700,marginBottom:10,fontSize:14}}>📊 أسباب الرفض الأكثر شيوعاً</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
            {reasonStats.map(({reason,count})=>(
              <div key={reason} style={{background:'#FFF5F5',borderRight:'3px solid var(--cs-red)',borderRadius:6,padding:'8px 12px'}}>
                <div style={{fontSize:11,color:'var(--cs-text-muted)'}}>{reason}</div>
                <div style={{fontSize:18,fontWeight:800,color:'var(--cs-red)'}}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>

      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>رقم العرض</th><th>العميل</th><th>القيمة</th><th>تاريخ العرض</th><th>الحالة</th><th>سبب الرفض</th><th>متابعة</th><th>إجراء</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد عروض غير مقبولة</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{r.quote_no}</td>
                  <td style={{fontWeight:600}}>{r.clients?.company_name||'—'}</td>
                  <td style={{color:'var(--cs-orange)',fontWeight:700}}>{fmt(r.total_amount||0)} ر.س</td>
                  <td style={{fontSize:12}}>{r.quote_date?.split('T')[0]||'—'}</td>
                  <td><span className={`badge ${r.status==='Rejected'?'badge-red':r.status==='Expired'?'badge-amber':'badge-gray'}`}>{r.status}</span></td>
                  <td style={{fontSize:12,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.rejection_reason||<span style={{color:'var(--cs-text-muted)',fontStyle:'italic'}}>لم يُحدد</span>}</td>
                  <td style={{fontSize:12,color:r.followup_date?'var(--cs-blue)':'var(--cs-text-muted)'}}>{r.followup_date?.split('T')[0]||'—'}</td>
                  <td>
                    <button onClick={()=>startEdit(r)} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:4,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Edit2 size={12}/>تحديد السبب</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {editing&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:500,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:17}}>سبب رفض العرض — {editing.quote_no}</div>
              <button onClick={()=>setEditing(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:13}}>
              <div><strong>العميل:</strong> {editing.clients?.company_name}</div>
              <div><strong>القيمة:</strong> {fmt(editing.total_amount||0)} ر.س</div>
            </div>
            <div style={{marginBottom:14}}>
              <label className="form-label">سبب الرفض</label>
              <select className="form-input" value={reason} onChange={e=>setReason(e.target.value)}>
                {REJECTION_REASONS.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div style={{marginBottom:14}}>
              <label className="form-label">تفاصيل إضافية</label>
              <textarea className="form-input" rows={3} value={reasonText} onChange={e=>setReasonText(e.target.value)} placeholder="ملاحظات إضافية (اختياري)..."/>
            </div>
            <div style={{marginBottom:18}}>
              <label className="form-label">تاريخ المتابعة (اختياري)</label>
              <input type="date" className="form-input" value={followupDate} onChange={e=>setFollowupDate(e.target.value)}/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn-secondary" onClick={()=>setEditing(null)}>إلغاء</button>
              <button className="btn-primary" onClick={saveReason}><Save size={15}/>حفظ السبب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
