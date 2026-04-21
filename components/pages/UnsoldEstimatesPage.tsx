'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Phone, Mail, AlertTriangle, TrendingDown, RefreshCw } from 'lucide-react'

export default function UnsoldEstimatesPage() {
  const [rows,setRows] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [filter,setFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('quotations')
      .select('*,clients(company_name,phone,email)')
      .in('status',['Sent','Draft','Expired'])
      .order('quote_date',{ascending:false})
    setRows(data||[])
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const today = new Date()
  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)

  const enrich = rows.map(r => {
    const daysSince = r.quote_date ? Math.ceil((today.getTime()-new Date(r.quote_date).getTime())/86400000) : 0
    const isExpired = r.expiry_date && new Date(r.expiry_date) < today
    const priority = (r.amount||0)>200000 ? '🔴 عاجل جداً' : (r.amount||0)>100000 ? '🟠 عاجل' : (r.amount||0)>50000 ? '🟡 متوسط' : '🟢 عادي'
    return { ...r, daysSince, isExpired, priority }
  })

  const filtered = enrich.filter(r => {
    if(filter==='sent') return r.status==='Sent'
    if(filter==='expired') return r.isExpired
    if(filter==='urgent') return r.amount>100000
    return true
  })

  const totalPending = enrich.filter(r=>r.status==='Sent').reduce((s,r)=>s+(r.total_amount||0),0)
  const totalExpired = enrich.filter(r=>r.isExpired).reduce((s,r)=>s+(r.total_amount||0),0)
  const conversionRate = rows.length > 0 ? 0 : 0

  const priorityColor:any = {'🔴 عاجل جداً':'var(--cs-red)','🟠 عاجل':'var(--cs-orange)','🟡 متوسط':'#B7950B','🟢 عادي':'var(--cs-green)'}

  const updateStatus = async (id:string, status:string) => {
    await supabase.from('quotations').update({status}).eq('id',id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">العروض غير المقبولة</div><div className="page-subtitle">Unsold Estimates — متابعة المبيعات</div></div>
        <button className="btn-secondary" onClick={load} style={{display:'flex',alignItems:'center',gap:6}}><RefreshCw size={14}/>تحديث</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20}}>
        {[
          {l:'إجمالي قيمة المعلقة',v:fmt(totalPending)+' ر.س',c:'var(--cs-orange)',icon:TrendingDown},
          {l:'عروض منتهية',v:enrich.filter(r=>r.isExpired).length,c:'var(--cs-red)',icon:AlertTriangle},
          {l:'قيمة المنتهية',v:fmt(totalExpired)+' ر.س',c:'var(--cs-red)',icon:TrendingDown},
          {l:'عروض مرسلة',v:enrich.filter(r=>r.status==='Sent').length,c:'var(--cs-blue)',icon:Mail},
        ].map((s,i)=>(
          <div key={i} className="stat-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</div></div>
              <s.icon size={20} color={s.c} style={{opacity:0.5}}/>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[
          {k:'all',l:`الكل (${enrich.length})`},
          {k:'sent',l:`مرسلة (${enrich.filter(r=>r.status==='Sent').length})`},
          {k:'expired',l:`منتهية (${enrich.filter(r=>r.isExpired).length})`},
          {k:'urgent',l:`قيمة عالية (${enrich.filter(r=>r.amount>100000).length})`},
        ].map(tab=>(
          <button key={tab.k} onClick={()=>setFilter(tab.k)}
            style={{padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:600,fontSize:13,
              background:filter===tab.k?'var(--cs-blue)':'var(--cs-gray-light)',
              color:filter===tab.k?'white':'var(--cs-text-muted)'}}>
            {tab.l}
          </button>
        ))}
      </div>

      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          filtered.length===0
          ? <div style={{padding:60,textAlign:'center',color:'var(--cs-text-muted)'}}>🎉 لا توجد عروض معلقة!</div>
          : <div style={{display:'flex',flexDirection:'column',gap:12,padding:16}}>
            {filtered.map(r=>(
              <div key={r.id} style={{border:'1px solid var(--cs-border)',borderRadius:12,padding:16,
                background:r.isExpired?'#FFF5F5':r.daysSince>30?'#FFFBF0':'white',
                borderRight:r.priority.includes('🔴')?'4px solid var(--cs-red)':r.priority.includes('🟠')?'4px solid var(--cs-orange)':'1px solid var(--cs-border)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.quote_code}</span>
                      <span style={{fontWeight:700,fontSize:15}}>{r.clients?.company_name||'—'}</span>
                      <span style={{fontSize:12,color:priorityColor[r.priority]||'var(--cs-text)',fontWeight:600}}>{r.priority}</span>
                    </div>
                    <div style={{fontSize:13,color:'var(--cs-text-muted)',marginBottom:6}}>{r.description}</div>
                    <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                      <span style={{fontSize:12,color:'var(--cs-text-muted)'}}>📅 تاريخ العرض: {r.quote_date}</span>
                      <span style={{fontSize:12,color:r.isExpired?'var(--cs-red)':'var(--cs-text-muted)'}}>⏰ {r.isExpired?'منتهي':'ينتهي'}: {r.expiry_date||'—'}</span>
                      <span style={{fontSize:12,color:r.daysSince>30?'var(--cs-orange)':'var(--cs-text-muted)'}}>🕐 منذ {r.daysSince} يوم</span>
                    </div>
                  </div>
                  <div style={{textAlign:'left'}}>
                    <div style={{fontSize:22,fontWeight:800,color:'var(--cs-blue)',fontFamily:'Cairo,sans-serif',marginBottom:4}}>{fmt(r.total_amount||r.amount)} ر.س</div>
                    <div style={{fontSize:11,color:'var(--cs-text-muted)'}}>شامل VAT 15%</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap',alignItems:'center'}}>
                  {r.clients?.phone&&<a href={`tel:${r.clients.phone}`} style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'var(--cs-blue)',textDecoration:'none',background:'var(--cs-blue-light)',padding:'4px 10px',borderRadius:6}}><Phone size={13}/>اتصال</a>}
                  {r.clients?.email&&<a href={`mailto:${r.clients.email}`} style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'var(--cs-green)',textDecoration:'none',background:'#E8F8EF',padding:'4px 10px',borderRadius:6}}><Mail size={13}/>بريد</a>}
                  <div style={{flex:1}}/>
                  <select style={{fontSize:12,border:'1px solid var(--cs-border)',borderRadius:6,padding:'4px 8px',fontFamily:'Tajawal,sans-serif',cursor:'pointer'}}
                    value={r.status} onChange={e=>updateStatus(r.id,e.target.value)}>
                    <option value="Draft">مسودة</option>
                    <option value="Sent">مرسل</option>
                    <option value="Accepted">✅ مقبول</option>
                    <option value="Rejected">❌ مرفوض</option>
                    <option value="Expired">منتهي</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
