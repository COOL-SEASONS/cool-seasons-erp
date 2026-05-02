'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Printer } from 'lucide-react'

export default function TechLeaderboardPage() {
  const [techs,setTechs] = useState<any[]>([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    async function load() {
      const [{data:t},{data:proj},{data:maint},{data:att}] = await Promise.all([
        supabase.from('technicians').select('id,tech_code,full_name,specialty,level').eq('status','Active'),
        supabase.from('projects').select('tech_id,status'),
        supabase.from('maintenance').select('tech_id,status'),
        supabase.from('hr_attendance').select('tech_id,status'),
      ])

      const data = (t||[]).map(tech => {
        const activeProjects = (proj||[]).filter(p=>p.tech_id===tech.id&&p.status==='In Progress').length
        const totalMaint = (maint||[]).filter(m=>m.tech_id===tech.id).length
        const doneMaint = (maint||[]).filter(m=>m.tech_id===tech.id&&m.status==='Completed').length
        const totalDays = (att||[]).filter(a=>a.tech_id===tech.id).length
        const presentDays = (att||[]).filter(a=>a.tech_id===tech.id&&a.status==='Present').length
        const attendance = totalDays>0 ? Math.round(presentDays/totalDays*100) : 0
        const completionRate = totalMaint>0 ? Math.round(doneMaint/totalMaint*100) : 0
        const score = activeProjects*10 + doneMaint*5 + attendance/10
        return { ...tech, activeProjects, totalMaint, doneMaint, attendance, completionRate, score }
      }).sort((a,b)=>b.score-a.score)

      setTechs(data); setLoading(false)
    }
    load()
  },[])

  const medals = ['🥇','🥈','🥉']
  const levelC: any = {Expert:'var(--cs-green)',Senior:'var(--cs-blue)',Specialist:'var(--cs-orange)',Mid:'var(--cs-text-muted)',Trainee:'var(--cs-text-muted)'}

  return (
    <div>
      <div className="page-header" style={{gap:8}}>
        <div><div className="page-title">لوحة أداء الفنيين</div><div className="page-subtitle">Tech Leaderboard</div></div>
        <button onClick={()=>window.print()} style={{display:"flex",alignItems:"center",gap:6,background:"var(--cs-blue)",color:"white",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13,fontFamily:"Tajawal,sans-serif",fontWeight:600}}><Printer size={15}/>طباعة</button>
      </div>

      {/* Top 3 */}
      {!loading&&techs.length>=3&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr 1fr',gap:12,marginBottom:24}}>
          {[1,0,2].map(idx=>{
            const t = techs[idx]
            if(!t) return <div key={idx}/>
            const isFirst = idx===0
            return (
              <div key={idx} className="card" style={{padding:20,textAlign:'center',border:isFirst?'2px solid #FFD700':'1px solid var(--cs-border)',background:isFirst?'#FFFDF0':'white',marginTop:isFirst?0:20}}>
                <div style={{fontSize:32,marginBottom:8}}>{medals[idx]}</div>
                <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16,marginBottom:4}}>{t.full_name}</div>
                <div style={{fontSize:12,color:'var(--cs-text-muted)',marginBottom:12}}>{t.specialty} — {t.level}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:8}}>
                    <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>مشاريع</div>
                    <div style={{fontWeight:800,color:'var(--cs-blue)'}}>{t.activeProjects}</div>
                  </div>
                  <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:8}}>
                    <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>صيانة</div>
                    <div style={{fontWeight:800,color:'var(--cs-green)'}}>{t.doneMaint}</div>
                  </div>
                  <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:8}}>
                    <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>الحضور</div>
                    <div style={{fontWeight:800,color:'var(--cs-orange)'}}>{t.attendance}%</div>
                  </div>
                  <div style={{background:isFirst?'#FFF3CD':'var(--cs-gray-light)',borderRadius:8,padding:8}}>
                    <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>النقاط</div>
                    <div style={{fontWeight:800,color:isFirst?'#B8860B':'var(--cs-text)'}}>{Math.round(t.score)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري الحساب...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>الترتيب</th><th>الفني</th><th>المستوى</th><th>التخصص</th><th>مشاريع نشطة</th><th>صيانة مكتملة</th><th>معدل الإنجاز %</th><th>الحضور %</th><th>النقاط</th></tr></thead>
            <tbody>
              {techs.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا يوجد بيانات</td></tr>
              :techs.map((t,i)=>(
                <tr key={t.id} style={{background:i<3?'#FFFDF0':'inherit',fontWeight:i<3?600:400}}>
                  <td style={{textAlign:'center',fontSize:20}}>{medals[i]||`#${i+1}`}</td>
                  <td style={{fontWeight:700}}>{t.full_name}</td>
                  <td><span style={{fontWeight:600,color:levelC[t.level]||'var(--cs-text)'}}>{t.level}</span></td>
                  <td style={{fontSize:12}}>{t.specialty}</td>
                  <td style={{textAlign:'center',fontWeight:700,color:'var(--cs-blue)'}}>{t.activeProjects}</td>
                  <td style={{textAlign:'center',fontWeight:700,color:'var(--cs-green)'}}>{t.doneMaint}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:50,background:'var(--cs-border)',borderRadius:4,height:6}}><div style={{width:`${t.completionRate}%`,background:'var(--cs-green)',height:6,borderRadius:4}}/></div>
                      <span style={{fontSize:12}}>{t.completionRate}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:50,background:'var(--cs-border)',borderRadius:4,height:6}}><div style={{width:`${t.attendance}%`,background:t.attendance>=90?'var(--cs-green)':t.attendance>=70?'var(--cs-orange)':'var(--cs-red)',height:6,borderRadius:4}}/></div>
                      <span style={{fontSize:12,color:t.attendance>=90?'var(--cs-green)':t.attendance>=70?'var(--cs-orange)':'var(--cs-red)',fontWeight:600}}>{t.attendance}%</span>
                    </div>
                  </td>
                  <td><span style={{fontWeight:800,color:i===0?'#B8860B':i===1?'#808080':i===2?'#CD7F32':'var(--cs-text)',fontSize:16}}>{Math.round(t.score)}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      <div style={{marginTop:12,fontSize:11,color:'var(--cs-text-muted)',textAlign:'center'}}>النقاط = مشاريع×10 + صيانة مكتملة×5 + حضور/10</div>
    </div>
  )
}
