'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function WIPPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: projects } = await supabase
        .from('projects')
        .select('*, clients(company_name), invoices(total_amount)')
        .eq('status','In Progress')
        .order('created_at',{ascending:false})
      
      if (projects) {
        const processed = projects.map(p => {
          const contractValue = p.budget || 0
          const completion = (p.completion_pct || 0) / 100
          const earnedRevenue = contractValue * completion
          const billedAmount = (p.invoices || []).reduce((s:number,inv:any)=>s+(inv.total_amount||0),0)
          const overBilling = Math.max(0, billedAmount - earnedRevenue)
          const underBilling = Math.max(0, earnedRevenue - billedAmount)
          return { ...p, earnedRevenue, billedAmount, overBilling, underBilling, contractValue }
        })
        setRows(processed)
      }
      setLoading(false)
    }
    load()
  }, [])

  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const totalContract = rows.reduce((s,r)=>s+(r.contractValue||0),0)
  const totalEarned = rows.reduce((s,r)=>s+(r.earnedRevenue||0),0)
  const totalBilled = rows.reduce((s,r)=>s+(r.billedAmount||0),0)
  const totalOver = rows.reduce((s,r)=>s+(r.overBilling||0),0)
  const totalUnder = rows.reduce((s,r)=>s+(r.underBilling||0),0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">تقرير WIP</div><div className="page-subtitle">Work In Progress — الأعمال الجارية</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[
          {l:'مشاريع جارية',v:rows.length,c:'var(--cs-blue)'},
          {l:'إجمالي قيمة العقود',v:fmt(totalContract)+' ر.س',c:'var(--cs-blue)'},
          {l:'الإيراد المكتسب',v:fmt(totalEarned)+' ر.س',c:'var(--cs-green)'},
          {l:'إجمالي الفواتير',v:fmt(totalBilled)+' ر.س',c:'var(--cs-orange)'},
          {l:'تفوق الفوترة',v:fmt(totalOver)+' ر.س',c:'var(--cs-red)'},
          {l:'نقص الفوترة',v:fmt(totalUnder)+' ر.س',c:'var(--cs-amber)'},
        ].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:'Cairo,sans-serif'}}>{s.v}</div></div>
        ))}
      </div>

      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري الحساب...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>المشروع</th><th>العميل</th><th>قيمة العقد</th>
                <th>الإنجاز %</th><th>الإيراد المكتسب</th><th>الفواتير</th>
                <th>تفوق الفوترة</th><th>نقص الفوترة</th><th>الحالة</th>
              </tr></thead>
              <tbody>
                {rows.length===0 ? <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد مشاريع جارية</td></tr>
                : rows.map(r=>(
                  <tr key={r.id}>
                    <td style={{fontWeight:600}}>{r.project_name}</td>
                    <td>{r.clients?.company_name}</td>
                    <td>{fmt(r.contractValue)} ر.س</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:60,background:'var(--cs-border)',borderRadius:4,height:6}}>
                          <div style={{width:`${r.completion_pct||0}%`,background:'var(--cs-blue)',height:6,borderRadius:4}}/>
                        </div>
                        <span style={{fontSize:12,fontWeight:600}}>{r.completion_pct||0}%</span>
                      </div>
                    </td>
                    <td style={{color:'var(--cs-green)',fontWeight:600}}>{fmt(r.earnedRevenue)} ر.س</td>
                    <td>{fmt(r.billedAmount)} ر.س</td>
                    <td style={{color:r.overBilling>0?'var(--cs-red)':'inherit',fontWeight:r.overBilling>0?700:400}}>{r.overBilling>0?fmt(r.overBilling)+' ر.س':'—'}</td>
                    <td style={{color:r.underBilling>0?'var(--cs-orange)':'inherit',fontWeight:r.underBilling>0?700:400}}>{r.underBilling>0?fmt(r.underBilling)+' ر.س':'—'}</td>
                    <td>
                      {r.overBilling>0 ? <span className="badge badge-red">تفوق فوترة</span>
                       : r.underBilling>0 ? <span className="badge badge-amber">نقص فوترة</span>
                       : <span className="badge badge-green">متوازن</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
