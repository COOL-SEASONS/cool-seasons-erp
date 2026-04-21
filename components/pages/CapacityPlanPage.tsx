'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

export default function CapacityPlanPage() {
  const [techs,setTechs] = useState<any[]>([])
  const [projects,setProjects] = useState<any[]>([])
  const [workDays,setWorkDays] = useState(22)
  const [hoursPerDay,setHoursPerDay] = useState(8)
  const [loading,setLoading] = useState(true)
  const [month,setMonth] = useState(() => new Date().getMonth())
  const [year,setYear] = useState(() => new Date().getFullYear())

  useEffect(()=>{
    async function load() {
      const [{data:t},{data:p}] = await Promise.all([
        supabase.from('technicians').select('id,full_name,specialty,level,hourly_rate').eq('status','Active'),
        supabase.from('projects').select('id,project_name,tech_id,completion_pct,estimated_hours,status').eq('status','In Progress'),
      ])
      setTechs(t||[]); setProjects(p||[])
      setLoading(false)
    }
    load()
  },[])

  const totalCapacity = techs.length * workDays * hoursPerDay
  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)

  const techLoad = techs.map(tech => {
    const assigned = projects.filter(p=>p.tech_id===tech.id)
    const estimatedHours = assigned.reduce((s,p)=>s+(p.estimated_hours||0),0)
    const remainingHours = assigned.reduce((s,p)=>s+(p.estimated_hours||0)*((100-(p.completion_pct||0))/100),0)
    const capacity = workDays * hoursPerDay
    const utilization = capacity>0 ? Math.min(100,Math.round(remainingHours/capacity*100)) : 0
    return { ...tech, assigned, estimatedHours, remainingHours, capacity, utilization }
  }).sort((a,b)=>b.utilization-a.utilization)

  const overloaded = techLoad.filter(t=>t.utilization>100)
  const highLoad = techLoad.filter(t=>t.utilization>=80&&t.utilization<=100)
  const available = techLoad.filter(t=>t.utilization<50)

  const utilizationColor = (u:number) => u>100 ? 'var(--cs-red)' : u>=80 ? 'var(--cs-orange)' : u>=50 ? 'var(--cs-blue)' : 'var(--cs-green)'
  const utilizationBg = (u:number) => u>100 ? '#FDECEA' : u>=80 ? '#FEF3E2' : u>=50 ? '#E8F6FC' : '#E8F8EF'

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">خطة الطاقة الإنتاجية</div><div className="page-subtitle">Capacity Planning — {MONTHS[month]} {year}</div></div>
      </div>

      {/* Settings */}
      <div className="card" style={{padding:'14px 20px',marginBottom:16}}>
        <div style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <label className="form-label" style={{marginBottom:0}}>الشهر:</label>
            <select className="form-input" style={{width:130}} value={month} onChange={e=>setMonth(parseInt(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
            <input type="number" className="form-input" style={{width:80}} value={year} onChange={e=>setYear(parseInt(e.target.value)||year)}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <label className="form-label" style={{marginBottom:0}}>أيام العمل:</label>
            <input type="number" min="1" max="31" className="form-input" style={{width:70}} value={workDays} onChange={e=>setWorkDays(parseInt(e.target.value)||22)}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <label className="form-label" style={{marginBottom:0}}>ساعات/يوم:</label>
            <input type="number" min="1" max="12" className="form-input" style={{width:70}} value={hoursPerDay} onChange={e=>setHoursPerDay(parseInt(e.target.value)||8)}/>
          </div>
          <div style={{marginRight:'auto',textAlign:'left',fontFamily:'Cairo,sans-serif'}}>
            <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>إجمالي الطاقة: </span>
            <span style={{fontWeight:800,color:'var(--cs-blue)',fontSize:16}}>{fmt(totalCapacity)} ساعة</span>
          </div>
        </div>
      </div>

      {/* Summary alerts */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[
          {l:'إجمالي الفنيين',v:techs.length,c:'var(--cs-blue)'},
          {l:'محمّل زائد 🔴',v:overloaded.length,c:'var(--cs-red)'},
          {l:'حمل عالي 🟠',v:highLoad.length,c:'var(--cs-orange)'},
          {l:'متاح 🟢',v:available.length,c:'var(--cs-green)'},
          {l:'متوسط الاستخدام',v:techs.length>0?Math.round(techLoad.reduce((s,t)=>s+t.utilization,0)/techs.length)+'%':'0%',c:'var(--cs-blue)'},
        ].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>

      {/* Capacity bars */}
      <div className="card" style={{padding:20,marginBottom:16}}>
        <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>استخدام طاقة الفنيين</div>
        {loading?<div style={{textAlign:'center',color:'var(--cs-text-muted)',padding:20}}>جاري التحميل...</div>
        :techLoad.length===0?<div style={{textAlign:'center',color:'var(--cs-text-muted)',padding:20}}>لا يوجد فنيون نشطون</div>
        :<div style={{display:'flex',flexDirection:'column',gap:14}}>
          {techLoad.map(t=>(
            <div key={t.id} style={{background:utilizationBg(t.utilization),borderRadius:10,padding:'12px 16px',border:`1px solid ${utilizationColor(t.utilization)}30`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <span style={{fontWeight:700,fontSize:14}}>{t.full_name}</span>
                  <span style={{fontSize:11,color:'var(--cs-text-muted)',marginRight:8}}>{t.specialty} — {t.level}</span>
                </div>
                <div style={{textAlign:'left'}}>
                  <span style={{fontWeight:800,fontSize:16,color:utilizationColor(t.utilization)}}>{t.utilization}%</span>
                  {t.utilization>100&&<span style={{fontSize:11,color:'var(--cs-red)',marginRight:6}}>⚠️ محمّل زائد</span>}
                </div>
              </div>
              <div style={{background:'white',borderRadius:6,height:16,overflow:'hidden',marginBottom:6}}>
                <div style={{width:`${Math.min(100,t.utilization)}%`,background:utilizationColor(t.utilization),height:16,borderRadius:6,transition:'width 0.5s'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--cs-text-muted)'}}>
                <span>الطاقة: {fmt(t.capacity)} ساعة</span>
                <span>المطلوب: {fmt(Math.round(t.remainingHours))} ساعة</span>
                <span>مشاريع: {t.assigned.length}</span>
              </div>
              {t.assigned.length>0&&(
                <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
                  {t.assigned.map((p:any)=>(
                    <span key={p.id} style={{fontSize:11,background:'white',border:`1px solid ${utilizationColor(t.utilization)}30`,padding:'2px 8px',borderRadius:20,color:'var(--cs-text)'}}>
                      {p.project_name} ({100-(p.completion_pct||0)}% متبقي)
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>}
      </div>

      {/* Unassigned projects */}
      {projects.filter(p=>!p.tech_id).length>0&&(
        <div className="card" style={{padding:20,borderRight:'3px solid var(--cs-red)'}}>
          <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:14,color:'var(--cs-red)',marginBottom:12}}>⚠️ مشاريع بدون فني مكلّف</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {projects.filter(p=>!p.tech_id).map(p=>(
              <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'#FFF5F5',borderRadius:8}}>
                <span style={{fontWeight:600,fontSize:13}}>{p.project_name}</span>
                <span style={{fontSize:12,color:'var(--cs-text-muted)'}}>{p.completion_pct||0}% مكتمل</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
