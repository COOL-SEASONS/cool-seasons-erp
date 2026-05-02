'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, CheckCircle, Clock, DollarSign, Printer} from 'lucide-react'

export default function AMCDashboardPage() {
  const [contracts,setContracts] = useState<any[]>([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    async function load() {
      const { data } = await supabase
        .from('contracts_amc')
        .select('*,clients(company_name,phone)')
        .order('end_date',{ascending:true})
      setContracts(data||[])
      setLoading(false)
    }
    load()
  },[])

  const today = new Date()
  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)

  const enriched = contracts.map(c => {
    const daysLeft = c.end_date ? Math.ceil((new Date(c.end_date).getTime()-today.getTime())/86400000) : null
    const monthlyRevenue = c.annual_value ? c.annual_value/12 : 0
    return { ...c, daysLeft, monthlyRevenue }
  })

  const active = enriched.filter(c=>c.status==='Active')
  const expiringSoon = enriched.filter(c=>c.daysLeft!==null&&c.daysLeft>0&&c.daysLeft<=60)
  const expired = enriched.filter(c=>c.daysLeft!==null&&c.daysLeft<=0)
  const totalValue = active.reduce((s,c)=>s+(c.annual_value||0),0)
  const totalCollected = enriched.reduce((s,c)=>s+(c.paid_amount||0),0)
  const totalBalance = enriched.reduce((s,c)=>s+(c.balance||0),0)
  const monthlyRevenue = active.reduce((s,c)=>s+(c.monthlyRevenue||0),0)

  const statusBadge = (days:number|null, status:string) => {
    if(status==='Expired'||(days!==null&&days<=0)) return {label:'منتهي ❌',bg:'#FDECEA',color:'#C0392B'}
    if(days!==null&&days<=30) return {label:`${days} يوم ⚠️`,bg:'#FEF3E2',color:'#E67E22'}
    if(days!==null&&days<=60) return {label:`${days} يوم`,bg:'#E8F6FC',color:'#1E9CD7'}
    return {label:'نشط ✅',bg:'#E8F8EF',color:'#27AE60'}
  }

  return (
    <div>
      <div className="page-header" style={{gap:8}}>
        <div><div className="page-title">لوحة عقود AMC</div><div className="page-subtitle">Annual Maintenance Contracts</div></div>
        <button onClick={()=>window.print()} style={{display:"flex",alignItems:"center",gap:6,background:"var(--cs-blue)",color:"white",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13,fontFamily:"Tajawal,sans-serif",fontWeight:600}}><Printer size={15}/>طباعة</button>
      </div>

      {/* KPI cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14,marginBottom:20}}>
        {[
          {l:'عقود نشطة',v:active.length,c:'var(--cs-green)',icon:CheckCircle},
          {l:'تنتهي خلال 60 يوم',v:expiringSoon.length,c:'var(--cs-orange)',icon:Clock},
          {l:'منتهية',v:expired.length,c:'var(--cs-red)',icon:AlertTriangle},
          {l:'إجمالي قيمة العقود',v:fmt(totalValue)+' ر.س',c:'var(--cs-blue)',icon:DollarSign},
          {l:'إيراد شهري',v:fmt(monthlyRevenue)+' ر.س',c:'var(--cs-green)',icon:DollarSign},
          {l:'المحصّل',v:fmt(totalCollected)+' ر.س',c:'var(--cs-blue)',icon:DollarSign},
          {l:'المتبقي',v:fmt(totalBalance)+' ر.س',c:'var(--cs-red)',icon:DollarSign},
        ].map((s,i)=>(
          <div key={i} className="stat-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:15,fontWeight:800,color:s.c,fontFamily:'Cairo,sans-serif'}}>{s.v}</div></div>
              <s.icon size={18} color={s.c} style={{opacity:0.5}}/>
            </div>
          </div>
        ))}
      </div>

      {/* Expiring soon alert */}
      {expiringSoon.length>0&&(
        <div style={{background:'#FEF3E2',border:'1px solid #E67E2230',borderRadius:10,padding:16,marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <AlertTriangle size={18} color="#E67E22"/>
            <span style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,color:'#E67E22'}}>عقود تنتهي خلال 60 يوم</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}}>
            {expiringSoon.map(c=>(
              <div key={c.id} style={{background:'white',borderRadius:8,padding:'8px 12px',border:'1px solid #E67E2240'}}>
                <div style={{fontWeight:700,fontSize:13}}>{c.clients?.company_name}</div>
                <div style={{fontSize:11,color:'var(--cs-text-muted)'}}>{c.contract_code}</div>
                <div style={{fontSize:12,color:c.daysLeft<=30?'var(--cs-red)':'var(--cs-orange)',fontWeight:700,marginTop:4}}>⏰ {c.daysLeft} يوم متبقي</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contracts table */}
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr>
              <th>كود العقد</th><th>العميل</th><th>نوع الخدمة</th>
              <th>بداية</th><th>نهاية</th><th>القيمة السنوية</th>
              <th>المحصّل</th><th>الرصيد</th><th>الحالة</th>
            </tr></thead>
            <tbody>
              {contracts.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد عقود</td></tr>
              :enriched.map(c=>{
                const badge = statusBadge(c.daysLeft, c.status)
                return (
                  <tr key={c.id} style={{background:c.daysLeft!==null&&c.daysLeft<=0?'#FFF5F5':c.daysLeft!==null&&c.daysLeft<=30?'#FFFBF0':'inherit'}}>
                    <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{c.contract_code}</span></td>
                    <td style={{fontWeight:600}}>{c.clients?.company_name}</td>
                    <td style={{fontSize:12}}>{c.service_type||'—'}</td>
                    <td style={{fontSize:12}}>{c.start_date?.split('T')[0]||'—'}</td>
                    <td style={{fontSize:12,color:c.daysLeft!==null&&c.daysLeft<=30?'var(--cs-red)':'inherit',fontWeight:c.daysLeft!==null&&c.daysLeft<=30?700:400}}>{c.end_date?.split('T')[0]||'—'}</td>
                    <td style={{fontWeight:700,color:'var(--cs-blue)'}}>{fmt(c.annual_value)} ر.س</td>
                    <td style={{color:'var(--cs-green)'}}>{fmt(c.paid_amount)} ر.س</td>
                    <td style={{color:(c.balance||0)>0?'var(--cs-red)':'var(--cs-green)',fontWeight:700}}>{fmt(c.balance)} ر.س</td>
                    <td><span style={{background:badge.bg,color:badge.color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>{badge.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Monthly revenue by contract type */}
      {active.length>0&&(
        <div className="card" style={{padding:20,marginTop:16}}>
          <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>💰 توزيع الإيراد الشهري</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {active.sort((a,b)=>(b.annual_value||0)-(a.annual_value||0)).map(c=>(
              <div key={c.id} style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:140,fontSize:12,fontWeight:600,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.clients?.company_name}</div>
                <div style={{flex:1,background:'var(--cs-border)',borderRadius:6,height:20,overflow:'hidden'}}>
                  <div style={{width:`${(c.annual_value||0)/Math.max(...active.map(x=>x.annual_value||0))*100}%`,background:'var(--cs-blue)',height:20,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'flex-end',paddingLeft:8}}>
                  </div>
                </div>
                <div style={{width:100,textAlign:'left',fontWeight:700,color:'var(--cs-blue)',fontSize:13,flexShrink:0}}>{fmt(c.monthlyRevenue)} ر.س/ش</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
