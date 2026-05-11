'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ── helpers ──────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n || 0)

const fmtSAR = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K'
  return fmt(n)
}

// ── sub-components ───────────────────────────────────────────

function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
      <div style={{ width:3, height:14, background:'#22D3EE', borderRadius:2, flexShrink:0 }}/>
      <div style={{ fontFamily:'monospace', fontSize:9.5, fontWeight:700, color:'#3B6EA5', textTransform:'uppercase', letterSpacing:'2px' }}>
        {children}
      </div>
      <div style={{ flex:1, height:1, background:'rgba(34,211,238,0.08)' }}/>
    </div>
  )
}

function KpiCard({ label, labelEn, value, unit, color, pct }: any) {
  const colors: any = { cyan:'#22D3EE', green:'#22C55E', red:'#F87171', amber:'#FBBF24', purple:'#A78BFA', gray:'#475569' }
  const c = colors[color] || colors.gray
  return (
    <div style={{
      background:'#0D1E30', border:'1px solid rgba(255,255,255,0.05)',
      borderRadius:10, padding:'13px 12px', position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background: color === 'gray' ? '#1E3A5F' : c }}/>
      <div style={{ fontSize:11.5, fontWeight:700, color:'#475569', marginBottom:1, lineHeight:1.3 }}>{label}</div>
      <div style={{ fontFamily:'monospace', fontSize:8.5, color:'#1E3A5F', marginBottom:8 }}>{labelEn}</div>
      <div style={{ fontFamily:'Cairo,sans-serif', fontSize:28, fontWeight:900, color: color==='gray' ? '#CBD5E1' : c, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:9.5, color:'#1E3A5F', marginTop:4, fontWeight:600 }}>{unit}</div>
      {pct !== undefined && (
        <div style={{ height:2, background:'#1E3A5F', borderRadius:1, marginTop:10 }}>
          <div style={{ height:2, borderRadius:1, background: color==='gray' ? '#1E3A5F' : c, width:`${Math.min(pct,100)}%` }}/>
        </div>
      )}
    </div>
  )
}

function AlertItem({ label, value, type }: any) {
  const colors: any = { danger:'#F87171', warn:'#FBBF24', ok:'#22C55E' }
  const c = colors[type] || colors.ok
  return (
    <div style={{ display:'flex', alignItems:'center', padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)', gap:10 }}>
      <div style={{ width:5, height:5, borderRadius:1, background:c, flexShrink:0 }}/>
      <div style={{ fontSize:11.5, color:'#7A9DBF', flex:1, fontWeight:500 }}>{label}</div>
      <div style={{ fontFamily:'Cairo,sans-serif', fontSize:18, fontWeight:800, color:c }}>{value}</div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────
export default function DashboardContent({ onNav }: { onNav: (id: string) => void }) {
  const [stats,   setStats]   = useState<any>({})
  const [alerts,  setAlerts]  = useState<any>({ expired:[], soon:[], later:[] })
  const [projs,   setProjs]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date()
      const [
        { count: cc }, { count: pc }, { count: tc },
        { data: invData },
        { count: oc }, { count: ls }, { count: mo },
        { data: projects },
        { data: techs }, { data: vehicles }, { data: docs }, { data: amcs },
      ] = await Promise.all([
        supabase.from('clients').select('*', { count:'exact', head:true }),
        supabase.from('projects').select('*', { count:'exact', head:true }).eq('status','In Progress'),
        supabase.from('technicians').select('*', { count:'exact', head:true }).eq('status','Active'),
        supabase.from('invoices').select('total_amount,paid_amount'),
        supabase.from('invoices').select('*', { count:'exact', head:true }).eq('status','Overdue'),
        supabase.from('inventory').select('*', { count:'exact', head:true }).eq('status','Low Stock'),
        supabase.from('maintenance').select('*', { count:'exact', head:true }).eq('status','Overdue'),
        supabase.from('projects').select('project_name,status,completion_pct,contract_value').order('created_at',{ascending:false}).limit(6),
        supabase.from('technicians').select('full_name,residence_expiry,engineers_membership_exp').eq('status','Active'),
        supabase.from('vehicles').select('plate_no,brand,model,insurance_expiry,registration_expiry'),
        supabase.from('company_docs').select('doc_name,expiry_date'),
        supabase.from('contracts_amc').select('contract_code,end_date,clients(company_name)').eq('status','Active'),
      ])

      const totalInv  = invData?.reduce((s,r)=>s+(r.total_amount||0),0)||0
      const totalPaid = invData?.reduce((s,r)=>s+(r.paid_amount||0),0)||0
      const balance   = totalInv - totalPaid
      const pctPaid   = totalInv ? Math.round(totalPaid/totalInv*100) : 0

      setStats({ cc, pc, tc, totalInv, totalPaid, balance, pctPaid, oc, ls, mo })
      setProjs(projects || [])

      // Build alerts
      const expired: any[] = [], soon: any[] = [], later: any[] = []
      function addDoc(name: string, expiry: string, cat: string) {
        if (!expiry) return
        const d = expiry.split('T')[0]
        const days = Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000)
        const item = { name:`${cat}: ${name}`, days }
        if (days <= 0)  expired.push(item)
        else if (days <= 30) soon.push(item)
        else if (days <= 60) later.push(item)
      }
      techs?.forEach((t:any) => {
        if (t.residence_expiry) addDoc(t.full_name, t.residence_expiry, 'إقامة')
        if (t.engineers_membership_exp) addDoc(t.full_name, t.engineers_membership_exp, 'عضوية')
      })
      vehicles?.forEach((v:any) => {
        const n = `${v.brand||''} ${v.model||''} (${v.plate_no||''})`
        if (v.insurance_expiry)   addDoc(n, v.insurance_expiry, 'تأمين')
        if (v.registration_expiry) addDoc(n, v.registration_expiry, 'استمارة')
      })
      docs?.forEach((d:any) => { if (d.expiry_date) addDoc(d.doc_name, d.expiry_date, 'وثيقة') })
      amcs?.forEach((a:any) => { if (a.end_date) addDoc(a.clients?.company_name||a.contract_code, a.end_date, 'AMC') })
      setAlerts({ expired, soon, later })
      setLoading(false)
    }
    load()
  }, [])

  const totalAlerts = alerts.expired.length + alerts.soon.length + alerts.later.length

  if (loading) {
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[...Array(8)].map((_,i) => (
          <div key={i} style={{ height:100, background:'#0D1E30', borderRadius:10, opacity:0.5, animation:'pulse 1.5s infinite' }}/>
        ))}
      </div>
    )
  }

  const pctOps = stats.pc && stats.cc ? Math.round((stats.pc / Math.max(stats.cc,1)) * 100) : 0

  return (
    <div style={{ fontFamily:'Tajawal,sans-serif', color:'#E2E8F0' }}>

      {/* ── TICKER ── */}
      {totalAlerts > 0 && (
        <div style={{
          display:'flex', alignItems:'stretch',
          background:'#110A0A', borderRadius:8,
          border:'1px solid rgba(239,68,68,0.2)',
          marginBottom:16, overflow:'hidden',
        }}>
          <div style={{
            background:'#C0392B', color:'#fff',
            fontSize:10, fontWeight:800, padding:'0 14px',
            display:'flex', alignItems:'center', letterSpacing:'0.8px',
            flexShrink:0, gap:5, whiteSpace:'nowrap',
          }}>
            ⚠ تنبيهات
          </div>
          <div style={{ display:'flex', flex:1, overflow:'hidden', flexWrap:'wrap' }}>
            {[
              { label:'منتهية', value: alerts.expired.length, type:'danger' },
              { label:'خلال 30 يوم', value: alerts.soon.length, type:'warn' },
              { label:'خلال 60 يوم', value: alerts.later.length, type:'ok' },
            ].map((t,i) => (
              <div key={i} style={{ display:'flex', alignItems:'baseline', gap:7, padding:'7px 16px', borderLeft:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize:10.5, color:'#8A6060', fontWeight:600 }}>{t.label}</div>
                <div style={{ fontFamily:'Cairo,sans-serif', fontSize:18, fontWeight:800, color: t.type==='danger'?'#F87171':t.type==='warn'?'#FBBF24':'#22C55E' }}>{t.value}</div>
              </div>
            ))}
            <div style={{ display:'flex', gap:8, alignItems:'center', padding:'0 14px', marginRight:'auto' }}>
              {[{id:'technicians',l:'الفنيون'},{id:'vehicles',l:'المركبات'},{id:'company_docs',l:'الوثائق'}].map(b => (
                <button key={b.id} onClick={()=>onNav(b.id)} style={{
                  fontSize:11, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                  borderRadius:5, padding:'3px 10px', cursor:'pointer', color:'#94A3B8', fontFamily:'Tajawal,sans-serif',
                }}>
                  {b.l} ←
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HERO SPLIT ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr', gap:10, marginBottom:14 }}>

        {/* Hero Main */}
        <div style={{
          background:'#0D1E30', border:'1px solid rgba(34,211,238,0.1)',
          borderRadius:14, padding:'20px 24px', position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:0, right:0, bottom:0, width:3, background:'#22D3EE', borderRadius:'0 14px 14px 0' }}/>
          {/* Frame corners */}
          <div style={{ position:'absolute', top:0, left:0, width:16, height:16, borderTop:'1.5px solid rgba(34,211,238,0.4)', borderRight:'1.5px solid rgba(34,211,238,0.4)' }}/>
          <div style={{ position:'absolute', bottom:0, right:0, width:16, height:16, borderBottom:'1.5px solid rgba(34,211,238,0.4)', borderLeft:'1.5px solid rgba(34,211,238,0.4)' }}/>

          <div style={{ fontFamily:'monospace', fontSize:9, fontWeight:700, color:'#22D3EE', textTransform:'uppercase', letterSpacing:'2px', marginBottom:6 }}>
            TOTAL INVOICED · إجمالي الفواتير
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ fontFamily:'Cairo,sans-serif', fontSize:46, fontWeight:900, color:'#F1F5F9', lineHeight:1, letterSpacing:-1 }}>
              {fmtSAR(stats.totalInv)}
            </div>
            <div style={{ fontSize:13, color:'#3B6EA5', fontWeight:600 }}>ريال سعودي</div>
          </div>

          {/* Progress bars */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:10 }}>
            {[
              { label:'COLLECTED', value: fmtSAR(stats.totalPaid), pct: stats.pctPaid, color:'#22C55E' },
              { label:'BALANCE',   value: fmtSAR(stats.balance),   pct: 100-stats.pctPaid, color:'#FBBF24' },
            ].map((row,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ fontFamily:'monospace', fontSize:9.5, color:'#475569', width:72, fontWeight:600 }}>{row.label}</div>
                <div style={{ flex:1, height:4, background:'#1E3A5F', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:4, width:`${row.pct}%`, background:row.color, borderRadius:2 }}/>
                </div>
                <div style={{ fontFamily:'Cairo,sans-serif', fontSize:12, fontWeight:700, color:row.color, minWidth:40, textAlign:'left' }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero: Active Projects */}
        <div style={{
          background:'#0D1E30', border:'1px solid rgba(34,211,238,0.1)',
          borderRadius:14, padding:'18px 20px', display:'flex', flexDirection:'column', justifyContent:'space-between',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'#22C55E' }}/>
          <div style={{ fontFamily:'monospace', fontSize:9.5, fontWeight:700, color:'#3B6EA5', textTransform:'uppercase', letterSpacing:'1.5px' }}>
            مشاريع نشطة
          </div>
          <div style={{ textAlign:'center', margin:'10px 0' }}>
            <div style={{ fontFamily:'Cairo,sans-serif', fontSize:64, fontWeight:900, color:'#22C55E', lineHeight:1 }}>{stats.pc}</div>
            <div style={{ fontFamily:'monospace', fontSize:10, color:'#3B6EA5', marginTop:4 }}>ACTIVE PROJECTS</div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#475569', borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:10 }}>
            <span>العملاء: <strong style={{color:'#22D3EE'}}>{stats.cc}</strong></span>
            <span>الفنيون: <strong style={{color:'#22D3EE'}}>{stats.tc}</strong></span>
          </div>
        </div>

        {/* Hero: Alerts */}
        <div style={{
          background:'#0D1E30', border:'1px solid rgba(239,68,68,0.15)',
          borderRadius:14, padding:'18px 20px', display:'flex', flexDirection:'column', justifyContent:'space-between',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background: totalAlerts > 0 ? '#F87171' : '#22C55E' }}/>
          <div style={{ fontFamily:'monospace', fontSize:9.5, fontWeight:700, color:'#3B6EA5', textTransform:'uppercase', letterSpacing:'1.5px' }}>
            التنبيهات الحرجة
          </div>
          <div style={{ textAlign:'center', margin:'10px 0' }}>
            <div style={{ fontFamily:'Cairo,sans-serif', fontSize:64, fontWeight:900, color: totalAlerts > 0 ? '#F87171' : '#22C55E', lineHeight:1 }}>
              {totalAlerts}
            </div>
            <div style={{ fontFamily:'monospace', fontSize:10, color:'#3B6EA5', marginTop:4 }}>
              {totalAlerts > 0 ? 'CRITICAL ALERTS' : 'ALL CLEAR'}
            </div>
          </div>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:5,
            background: totalAlerts>0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            border: `1px solid ${totalAlerts>0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
            borderRadius:20, padding:'4px 12px', fontSize:10, fontWeight:700,
            color: totalAlerts>0 ? '#F87171' : '#22C55E',
          }}>
            {totalAlerts > 0 ? '⚠ إجراء مطلوب' : '✓ كل شيء سليم'}
          </div>
        </div>
      </div>

      {/* ── FINANCIAL KPIs ── */}
      <SecLabel>الملف المالي · Financial Overview</SecLabel>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
        <KpiCard label="إجمالي الفواتير"  labelEn="TOTAL INVOICED"  value={fmtSAR(stats.totalInv)}  unit="ريال سعودي" color="cyan"   pct={100}/>
        <KpiCard label="المحصّل"           labelEn="COLLECTED"       value={fmtSAR(stats.totalPaid)} unit="ريال سعودي" color="green"  pct={stats.pctPaid}/>
        <KpiCard label="الرصيد المتبقي"    labelEn="BALANCE DUE"     value={fmtSAR(stats.balance)}   unit="ريال سعودي" color="amber"  pct={100-stats.pctPaid}/>
        <KpiCard label="فواتير متأخرة"     labelEn="OVERDUE"         value={stats.oc ?? 0}            unit="فاتورة"      color={stats.oc>0?'red':'green'}/>
      </div>

      {/* ── OPERATIONS KPIs ── */}
      <SecLabel>العمليات · Operations</SecLabel>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
        <KpiCard label="مشاريع نشطة"       labelEn="ACTIVE PROJECTS"    value={stats.pc ?? 0} unit="مشروع"  color="cyan"/>
        <KpiCard label="صيانة متأخرة"       labelEn="OVERDUE MAINT."     value={stats.mo ?? 0} unit="طلب"    color={stats.mo>0?'amber':'green'}/>
        <KpiCard label="مخزون منخفض"        labelEn="LOW STOCK"          value={stats.ls ?? 0} unit="صنف"    color={stats.ls>0?'red':'green'}/>
        <KpiCard label="العملاء"            labelEn="TOTAL CLIENTS"      value={stats.cc ?? 0} unit="عميل"   color="purple"/>
      </div>

      {/* ── LOWER: Projects + Alerts ── */}
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:10 }}>

        {/* Recent Projects */}
        <div>
          <SecLabel>أحدث المشاريع · Recent Projects</SecLabel>
          <div style={{ background:'#0D1E30', border:'1px solid rgba(255,255,255,0.05)', borderRadius:10, overflow:'hidden' }}>
            {projs.length === 0 ? (
              <div style={{ padding:30, textAlign:'center', color:'#475569', fontSize:13 }}>لا توجد مشاريع بعد</div>
            ) : (
              projs.map((p,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:'#CBD5E1', marginBottom:4 }}>{p.project_name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:3, background:'#1E3A5F', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:3, width:`${p.completion_pct||0}%`, background:'#22D3EE', borderRadius:2 }}/>
                      </div>
                      <span style={{ fontFamily:'monospace', fontSize:10, color:'#3B6EA5', minWidth:30 }}>{p.completion_pct||0}%</span>
                    </div>
                  </div>
                  <div style={{
                    fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
                    background: p.status==='Completed'?'rgba(34,197,94,0.1)':p.status==='In Progress'?'rgba(34,211,238,0.1)':'rgba(71,85,105,0.2)',
                    color: p.status==='Completed'?'#22C55E':p.status==='In Progress'?'#22D3EE':'#64748B',
                    fontFamily:'monospace', whiteSpace:'nowrap',
                  }}>
                    {p.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alert Board */}
        <div>
          <SecLabel>لوحة التنبيهات · Alert Board</SecLabel>
          <div style={{ background:'#0D1E30', border:'1px solid rgba(255,255,255,0.05)', borderRadius:10, overflow:'hidden' }}>
            <div style={{ padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontFamily:'monospace', fontSize:9, fontWeight:700, color:'#3B6EA5', textTransform:'uppercase', letterSpacing:'1.5px' }}>
                Status Monitor
              </div>
              {totalAlerts > 0 && (
                <div style={{ fontSize:9, color:'#F87171', fontWeight:700, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)', padding:'2px 8px', borderRadius:4 }}>
                  {totalAlerts} ACTIVE
                </div>
              )}
            </div>
            <AlertItem label="فواتير متأخرة"       value={stats.oc ?? 0} type={stats.oc > 0 ? 'danger' : 'ok'}/>
            <AlertItem label="صيانة متأخرة"         value={stats.mo ?? 0} type={stats.mo > 0 ? 'warn'   : 'ok'}/>
            <AlertItem label="وثائق منتهية الصلاحية" value={alerts.expired.length}  type={alerts.expired.length > 0  ? 'danger' : 'ok'}/>
            <AlertItem label="وثائق تنتهي 30 يوم"   value={alerts.soon.length}   type={alerts.soon.length > 0    ? 'warn'   : 'ok'}/>
            <AlertItem label="وثائق تنتهي 60 يوم"   value={alerts.later.length}  type={alerts.later.length > 0   ? 'ok'     : 'ok'}/>
            <AlertItem label="مخزون منخفض"           value={stats.ls ?? 0} type={stats.ls > 0 ? 'warn'   : 'ok'}/>
          </div>
        </div>
      </div>

    </div>
  )
}
