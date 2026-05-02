'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronRight, ChevronLeft } from 'lucide-react'

const DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const JOB_COLORS = ['#E8F4FC','#E8F8EF','#FEF3E2','#FDECEA','#F0E8FC','#E8FCF8','#FCF0E8']
const JOB_BORDERS = ['#1E9CD7','#27AE60','#E67E22','#C0392B','#8E44AD','#16A085','#D35400']

export default function DispatchBoardPage() {
  const [techs, setTechs] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    return d
  })
  const [assignments, setAssignments] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{techId:string,day:number}|null>(null)
  const [selectedJob, setSelectedJob] = useState('')
  const [selectedType, setSelectedType] = useState<'project'|'maintenance'>('project')

  useEffect(() => {
    async function load() {
      const [{ data: t }, { data: p }, { data: m }] = await Promise.all([
        supabase.from('technicians').select('id,tech_code,full_name').eq('status','Active'),
        supabase.from('projects').select('id,project_code,project_name').eq('status','In Progress'),
        supabase.from('maintenance').select('id,job_code,description').in('status',['Open','Scheduled']),
      ])
      setTechs(t||[]); setProjects(p||[]); setMaintenance(m||[])
      setLoading(false)
    }
    load()
  }, [])

  const getWeekDates = () => {
    return Array.from({length:7}, (_,i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d
    })
  }

  const key = (techId:string, day:number) => `${techId}_${day}`

  const assign = () => {
    if (!modal || !selectedJob) return
    setAssignments(prev => ({...prev, [key(modal.techId, modal.day)]: selectedJob}))
    setModal(null)
    setSelectedJob('')
  }

  const clearCell = (techId:string, day:number) => {
    setAssignments(prev => {
      const n = {...prev}
      delete n[key(techId,day)]
      return n
    })
  }

  const prevWeek = () => { const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d) }
  const nextWeek = () => { const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d) }

  const weekDates = getWeekDates()
  const today = new Date().toDateString()

  // color per tech
  const techColor = (idx:number) => ({ bg: JOB_COLORS[idx%JOB_COLORS.length], border: JOB_BORDERS[idx%JOB_BORDERS.length] })

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Dispatch Board</div><div className="page-subtitle">جدولة الفنيين الأسبوعية</div></div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={prevWeek} style={{background:'none',border:'1px solid var(--cs-border)',borderRadius:8,padding:'6px 10px',cursor:'pointer'}}><ChevronRight size={16}/></button>
          <span style={{fontWeight:600,fontSize:14,minWidth:200,textAlign:'center'}}>
            {weekDates[0].toLocaleDateString('ar-SA',{day:'numeric',month:'short'})} — {weekDates[6].toLocaleDateString('ar-SA',{day:'numeric',month:'short',year:'numeric'})}
          </span>
          <button onClick={nextWeek} style={{background:'none',border:'1px solid var(--cs-border)',borderRadius:8,padding:'6px 10px',cursor:'pointer'}}><ChevronLeft size={16}/></button>
        </div>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
            <thead>
              <tr style={{background:'var(--cs-gray-light)'}}>
                <th style={{padding:'12px 16px',textAlign:'right',borderBottom:'1px solid var(--cs-border)',width:160,fontSize:13,fontWeight:700,color:'var(--cs-text-muted)'}}>الفني</th>
                {weekDates.map((d,i) => (
                  <th key={i} style={{padding:'10px 8px',textAlign:'center',borderBottom:'1px solid var(--cs-border)',borderRight:'1px solid var(--cs-border)',minWidth:110,background: d.toDateString()===today ? '#E8F6FC' : 'var(--cs-gray-light)'}}>
                    <div style={{fontSize:12,fontWeight:700,color: d.toDateString()===today ? 'var(--cs-blue)' : 'var(--cs-text-muted)'}}>{DAYS_AR[i]}</div>
                    <div style={{fontSize:13,fontWeight:600,color: d.toDateString()===today ? 'var(--cs-blue)' : 'var(--cs-text)'}}>{d.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {techs.map((tech,tIdx) => {
                const tc = techColor(tIdx)
                return (
                  <tr key={tech.id} style={{borderBottom:'1px solid var(--cs-border)'}}>
                    <td style={{padding:'10px 16px',borderLeft:'1px solid var(--cs-border)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:tc.border+'20',border:`2px solid ${tc.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:tc.border}}>
                          {tech.full_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:'var(--cs-text)'}}>{tech.full_name}</div>
                          <div style={{fontSize:11,color:'var(--cs-text-muted)'}}>{tech.tech_code}</div>
                        </div>
                      </div>
                    </td>
                    {weekDates.map((_,dayIdx) => {
                      const k = key(tech.id, dayIdx)
                      const val = assignments[k]
                      return (
                        <td key={dayIdx} style={{padding:4,verticalAlign:'top',minHeight:60,borderRight:'1px solid var(--cs-border)',background: weekDates[dayIdx].toDateString()===today ? '#F0FAFF' : 'white',cursor:'pointer'}}
                          onClick={()=>{if(!val){setModal({techId:tech.id,day:dayIdx});setSelectedType('project')}}}>
                          {val ? (
                            <div style={{background:tc.bg,borderRight:`3px solid ${tc.border}`,borderRadius:'0 6px 6px 0',padding:'6px 8px',fontSize:11,fontWeight:600,color:tc.border,position:'relative',minHeight:50}}
                              onDoubleClick={(e)=>{e.stopPropagation();clearCell(tech.id,dayIdx)}}>
                              <div style={{marginBottom:2}}>{val}</div>
                              <div style={{fontSize:9,color:tc.border+'99',fontWeight:400}}>دبل كليك للحذف</div>
                            </div>
                          ) : (
                            <div style={{height:50,display:'flex',alignItems:'center',justifyContent:'center',opacity:0,transition:'opacity 0.2s'}} className="dispatch-add">
                              <span style={{fontSize:20,color:'var(--cs-border)'}}>+</span>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop:12,fontSize:12,color:'var(--cs-text-muted)',textAlign:'center'}}>
        اضغط على أي خلية لتعيين مهمة · دبل كليك على المهمة للحذف
      </div>

      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:440,padding:24}}>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18,marginBottom:16}}>
              تعيين مهمة — {DAYS_AR[modal.day]}
            </div>
            <div style={{display:'flex',gap:0,marginBottom:16,borderRadius:8,overflow:'hidden',border:'1.5px solid var(--cs-border)'}}>
              {(['project','maintenance'] as const).map(t=>(
                <button key={t} onClick={()=>{setSelectedType(t);setSelectedJob('')}} style={{flex:1,padding:'9px',border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:600,fontSize:13,background:selectedType===t?'var(--cs-blue)':'white',color:selectedType===t?'white':'var(--cs-text-muted)'}}>
                  {t==='project'?'🏗 مشروع':'🔧 صيانة'}
                </button>
              ))}
            </div>
            <div style={{marginBottom:16}}>
              <label className="form-label">{selectedType==='project'?'اختر المشروع':'اختر طلب الصيانة'}</label>
              <select className="form-input" value={selectedJob} onChange={e=>setSelectedJob(e.target.value)}>
                <option value="">اختر...</option>
                {selectedType==='project'
                  ? projects.map(p=><option key={p.id} value={p.project_name}>{p.project_name}</option>)
                  : maintenance.map(m=><option key={m.id} value={m.description||m.job_code}>{m.description||m.job_code}</option>)
                }
              </select>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn-secondary" onClick={()=>setModal(null)}>إلغاء</button>
              <button className="btn-primary" onClick={assign} disabled={!selectedJob}>تعيين</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.dispatch-add:hover { opacity: 1 !important; }`}</style>
    </div>
  )
}
