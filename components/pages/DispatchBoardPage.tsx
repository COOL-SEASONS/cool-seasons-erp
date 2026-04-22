'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronRight, ChevronLeft, Plus, X } from 'lucide-react'

const DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const COLORS = ['#1E9CD7','#27AE60','#E67E22','#C0392B','#8E44AD','#16A085','#D35400','#2980B9']

export default function DispatchBoardPage() {
  const [techs,setTechs]=useState<any[]>([])
  const [projects,setProjects]=useState<any[]>([])
  const [maintenance,setMaintenance]=useState<any[]>([])
  const [weekStart,setWeekStart]=useState(()=>{const d=new Date();d.setDate(d.getDate()-d.getDay());return d})
  // assignments: { techId_day: string[] }
  const [assignments,setAssignments]=useState<Record<string,string[]>>({})
  const [loading,setLoading]=useState(true)
  const [addModal,setAddModal]=useState<{techId:string,day:number}|null>(null)
  const [selectedJob,setSelectedJob]=useState('')
  const [selectedType,setSelectedType]=useState<'project'|'maintenance'>('project')

  useEffect(()=>{
    async function load(){
      const [{data:t},{data:p},{data:m}]=await Promise.all([
        supabase.from('technicians').select('id,tech_code,full_name').eq('status','Active'),
        supabase.from('projects').select('id,project_name').eq('status','In Progress'),
        supabase.from('maintenance').select('id,job_code,description').in('status',['Open','Scheduled']),
      ])
      setTechs(t||[]); setProjects(p||[]); setMaintenance(m||[])
      setLoading(false)
    }
    load()
  },[])

  const weekDates=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);return d})
  const key=(techId:string,day:number)=>`${techId}_${day}`
  const today=new Date().toDateString()

  const addTask=()=>{
    if(!addModal||!selectedJob)return
    const k=key(addModal.techId,addModal.day)
    setAssignments(prev=>({...prev,[k]:[...(prev[k]||[]),selectedJob]}))
    setSelectedJob('')
    // Don't close modal so user can add more
  }

  const removeTask=(techId:string,day:number,idx:number)=>{
    const k=key(techId,day)
    setAssignments(prev=>{
      const arr=[...(prev[k]||[])]
      arr.splice(idx,1)
      return {...prev,[k]:arr}
    })
  }

  const prevWeek=()=>{const d=new Date(weekStart);d.setDate(d.getDate()-7);setWeekStart(d)}
  const nextWeek=()=>{const d=new Date(weekStart);d.setDate(d.getDate()+7);setWeekStart(d)}
  const goToday=()=>{const d=new Date();d.setDate(d.getDate()-d.getDay());setWeekStart(d)}
  const fmtDate=(d:Date)=>`${d.getDate()}/${d.getMonth()+1}`

  if(loading)return<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Dispatch Board</div><div className="page-subtitle">جدولة الفنيين الأسبوعية</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={prevWeek} style={{background:'none',border:'1px solid var(--cs-border)',borderRadius:8,padding:'6px 10px',cursor:'pointer'}}><ChevronRight size={16}/></button>
          <button onClick={goToday} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}>اليوم</button>
          <button onClick={nextWeek} style={{background:'none',border:'1px solid var(--cs-border)',borderRadius:8,padding:'6px 10px',cursor:'pointer'}}><ChevronLeft size={16}/></button>
        </div>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
            <thead>
              <tr style={{background:'var(--cs-blue)',color:'white'}}>
                <th style={{padding:'12px 16px',textAlign:'right',width:180,fontSize:13}}>الفني</th>
                {weekDates.map((d,i)=>(
                  <th key={i} style={{padding:'10px 6px',textAlign:'center',minWidth:110,background:d.toDateString()===today?'#1670A0':'var(--cs-blue)'}}>
                    <div style={{fontSize:11,opacity:0.8}}>{DAYS_AR[i]}</div>
                    <div style={{fontSize:14,fontWeight:700}}>{fmtDate(d)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {techs.map((tech,tIdx)=>(
                <tr key={tech.id} style={{borderBottom:'1px solid var(--cs-border)'}}>
                  <td style={{padding:'8px 12px',borderLeft:'1px solid var(--cs-border)',background:'var(--cs-gray-light)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:30,height:30,borderRadius:'50%',background:COLORS[tIdx%COLORS.length]+'30',border:`2px solid ${COLORS[tIdx%COLORS.length]}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:COLORS[tIdx%COLORS.length],flexShrink:0}}>
                        {tech.full_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:700}}>{tech.full_name}</div>
                        <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>{tech.tech_code}</div>
                      </div>
                    </div>
                  </td>
                  {weekDates.map((_,dayIdx)=>{
                    const k=key(tech.id,dayIdx)
                    const tasks=assignments[k]||[]
                    const isToday=weekDates[dayIdx].toDateString()===today
                    return (
                      <td key={dayIdx} style={{padding:4,verticalAlign:'top',minHeight:60,background:isToday?'#F0FAFF':'white',borderRight:'1px solid var(--cs-border)'}}>
                        <div style={{minHeight:50,display:'flex',flexDirection:'column',gap:3}}>
                          {tasks.map((task,tIdx2)=>(
                            <div key={tIdx2} style={{background:COLORS[tIdx%COLORS.length]+'20',borderRight:`3px solid ${COLORS[tIdx%COLORS.length]}`,borderRadius:'0 4px 4px 0',padding:'3px 6px',fontSize:11,fontWeight:600,color:COLORS[tIdx%COLORS.length],display:'flex',justifyContent:'space-between',alignItems:'center',gap:4}}>
                              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{task}</span>
                              <button onClick={()=>removeTask(tech.id,dayIdx,tIdx2)} style={{background:'none',border:'none',cursor:'pointer',color:COLORS[tIdx%COLORS.length],padding:0,flexShrink:0,opacity:0.7,fontSize:12}}>×</button>
                            </div>
                          ))}
                          <button onClick={()=>{setAddModal({techId:tech.id,day:dayIdx});setSelectedType('project');setSelectedJob('')}}
                            style={{background:'none',border:'1px dashed var(--cs-border)',borderRadius:4,cursor:'pointer',color:'var(--cs-text-muted)',fontSize:11,padding:'2px 4px',display:'flex',alignItems:'center',justifyContent:'center',gap:2}}>
                            <Plus size={10}/> مهمة
                          </button>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {addModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:420,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16}}>
                إضافة مهمة — {DAYS_AR[addModal.day]} | {techs.find(t=>t.id===addModal.techId)?.full_name}
              </div>
              <button onClick={()=>setAddModal(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
            </div>

            {/* Current tasks */}
            {(assignments[key(addModal.techId,addModal.day)]||[]).length>0&&(
              <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:10,marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--cs-text-muted)',marginBottom:6}}>المهام المضافة:</div>
                {(assignments[key(addModal.techId,addModal.day)]||[]).map((t,i)=>(
                  <div key={i} style={{fontSize:12,background:'white',padding:'4px 8px',borderRadius:6,marginBottom:4,display:'flex',justifyContent:'space-between'}}>
                    <span>{t}</span>
                    <button onClick={()=>removeTask(addModal.techId,addModal.day,i)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)',fontSize:14}}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{display:'flex',gap:0,marginBottom:14,borderRadius:8,overflow:'hidden',border:'1px solid var(--cs-border)'}}>
              {(['project','maintenance'] as const).map(t=>(
                <button key={t} onClick={()=>{setSelectedType(t);setSelectedJob('')}} style={{flex:1,padding:'8px',border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:600,fontSize:13,background:selectedType===t?'var(--cs-blue)':'white',color:selectedType===t?'white':'var(--cs-text-muted)'}}>
                  {t==='project'?'🏗 مشروع':'🔧 صيانة'}
                </button>
              ))}
            </div>
            <select className="form-input" style={{marginBottom:14}} value={selectedJob} onChange={e=>setSelectedJob(e.target.value)}>
              <option value="">— اختر —</option>
              {(selectedType==='project'?projects:maintenance).map((item:any)=>(
                <option key={item.id} value={item.project_name||item.description||item.job_code}>
                  {item.project_name||item.description||item.job_code}
                </option>
              ))}
            </select>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-primary" style={{flex:1}} onClick={addTask} disabled={!selectedJob}><Plus size={14}/>إضافة مهمة</button>
              <button className="btn-secondary" onClick={()=>setAddModal(null)}>تم</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
