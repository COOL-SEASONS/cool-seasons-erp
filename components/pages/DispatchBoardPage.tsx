'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronRight, ChevronLeft, Plus, X, Printer } from 'lucide-react'

const DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const COLORS = ['#1E9CD7','#27AE60','#E67E22','#C0392B','#8E44AD','#16A085','#D35400','#2980B9']

export default function DispatchBoardPage() {
  const [techs,setTechs] = useState<any[]>([])
  const [projects,setProjects] = useState<any[]>([])
  const [maintenance,setMaintenance] = useState<any[]>([])
  const [weekStart,setWeekStart] = useState(()=>{
    const d=new Date(); d.setDate(d.getDate()-d.getDay()); return d
  })
  // assignments: { "techId_day": [{label, color}] }
  const [assignments,setAssignments] = useState<Record<string,{label:string,color:string}[]>>({})
  const [loading,setLoading] = useState(true)
  const [addModal,setAddModal] = useState<{techId:string,day:number,color:string}|null>(null)
  const [selectedJob,setSelectedJob] = useState('')
  const [selectedType,setSelectedType] = useState<'project'|'maintenance'|'custom'>('project')
  const [customTask,setCustomTask] = useState('')

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

  const weekDates = Array.from({length:7},(_,i)=>{
    const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); return d
  })
  const key = (techId:string, day:number) => `${techId}_${day}`
  const today = new Date().toDateString()

  const addTask = () => {
    if(!addModal) return
    const label = selectedType==='custom' ? customTask : selectedJob
    if(!label?.trim()) return
    const k = key(addModal.techId, addModal.day)
    setAssignments(prev=>({
      ...prev,
      [k]: [...(prev[k]||[]), {label, color: addModal.color}]
    }))
    // Reset job selection but keep modal open for adding more
    setSelectedJob('')
    setCustomTask('')
  }

  const removeTask = (techId:string, day:number, idx:number) => {
    const k = key(techId, day)
    setAssignments(prev=>{
      const arr = [...(prev[k]||[])]
      arr.splice(idx,1)
      return {...prev,[k]:arr}
    })
  }

  const clearDay = (techId:string, day:number) => {
    const k = key(techId, day)
    setAssignments(prev=>({...prev,[k]:[]}))
  }

  const prevWeek = () => {const d=new Date(weekStart);d.setDate(d.getDate()-7);setWeekStart(d)}
  const nextWeek = () => {const d=new Date(weekStart);d.setDate(d.getDate()+7);setWeekStart(d)}
  const goToday = () => {const d=new Date();d.setDate(d.getDate()-d.getDay());setWeekStart(d)}
  const fmtDate = (d:Date) => `${d.getDate()}/${d.getMonth()+1}`

  const startLabel = `${weekDates[0].getDate()}/${weekDates[0].getMonth()+1}`
  const endLabel = `${weekDates[6].getDate()}/${weekDates[6].getMonth()+1} ${weekDates[6].getFullYear()}`

  if(loading) return <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dispatch Board</div>
          <div className="page-subtitle">جدولة الفنيين — {startLabel} إلى {endLabel}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          <button onClick={prevWeek} style={{background:'white',border:'1px solid var(--cs-border)',borderRadius:8,padding:'7px 12px',cursor:'pointer'}}><ChevronRight size={16}/></button>
          <button onClick={goToday} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:8,padding:'7px 16px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}>اليوم</button>
          <button onClick={nextWeek} style={{background:'white',border:'1px solid var(--cs-border)',borderRadius:8,padding:'7px 12px',cursor:'pointer'}}><ChevronLeft size={16}/></button>
        </div>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
            <thead>
              <tr style={{background:'var(--cs-blue)',color:'white'}}>
                <th style={{padding:'12px 16px',textAlign:'right',width:180,fontSize:13,borderLeft:'1px solid rgba(255,255,255,0.2)'}}>الفني</th>
                {weekDates.map((d,i)=>(
                  <th key={i} style={{padding:'10px 6px',textAlign:'center',minWidth:120,
                    background:d.toDateString()===today?'#1460A0':'var(--cs-blue)',
                    borderLeft:'1px solid rgba(255,255,255,0.2)'}}>
                    <div style={{fontSize:11,opacity:0.8}}>{DAYS_AR[i]}</div>
                    <div style={{fontSize:15,fontWeight:700}}>{fmtDate(d)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {techs.map((tech,tIdx)=>{
                const techColor = COLORS[tIdx%COLORS.length]
                return (
                  <tr key={tech.id} style={{borderBottom:'2px solid var(--cs-border)'}}>
                    {/* Tech name cell */}
                    <td style={{padding:'10px 12px',background:'#F8FAFC',borderLeft:'1px solid var(--cs-border)',verticalAlign:'middle'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:34,height:34,borderRadius:'50%',background:techColor+'20',border:`2px solid ${techColor}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:techColor,flexShrink:0}}>
                          {tech.full_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{fontSize:13,fontWeight:700}}>{tech.full_name}</div>
                          <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>{tech.tech_code}</div>
                        </div>
                      </div>
                    </td>

                    {/* Day cells */}
                    {weekDates.map((_,dayIdx)=>{
                      const k = key(tech.id, dayIdx)
                      const tasks = assignments[k]||[]
                      const isToday = weekDates[dayIdx].toDateString()===today
                      return (
                        <td key={dayIdx} style={{
                          padding:4, verticalAlign:'top',
                          background:isToday?'#EEF7FF':'white',
                          borderLeft:'1px solid var(--cs-border)',
                          minWidth:120, minHeight:60,
                        }}>
                          <div style={{minHeight:50,display:'flex',flexDirection:'column',gap:3}}>
                            {/* Existing tasks */}
                            {tasks.map((task,taskIdx)=>(
                              <div key={taskIdx} style={{
                                background:task.color+'18',
                                borderRight:`3px solid ${task.color}`,
                                borderRadius:'0 4px 4px 0',
                                padding:'3px 6px 3px 4px',
                                fontSize:11,fontWeight:600,
                                color:task.color,
                                display:'flex',justifyContent:'space-between',
                                alignItems:'center',gap:3,
                              }}>
                                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,lineHeight:1.3}}>
                                  {task.label}
                                </span>
                                <button onClick={()=>removeTask(tech.id,dayIdx,taskIdx)}
                                  style={{background:'none',border:'none',cursor:'pointer',color:task.color,padding:0,flexShrink:0,fontSize:14,lineHeight:1,opacity:0.7}}>
                                  ×
                                </button>
                              </div>
                            ))}

                            {/* Add task button */}
                            <button
                              onClick={()=>{setAddModal({techId:tech.id,day:dayIdx,color:techColor});setSelectedType('project');setSelectedJob('');setCustomTask('')}}
                              style={{
                                background:'none',
                                border:`1px dashed ${isToday?'var(--cs-blue)':'var(--cs-border)'}`,
                                borderRadius:4,cursor:'pointer',
                                color:isToday?'var(--cs-blue)':'var(--cs-text-muted)',
                                fontSize:11,padding:'3px 6px',
                                display:'flex',alignItems:'center',justifyContent:'center',gap:3,
                                opacity:0.8,
                              }}>
                              <Plus size={10}/> مهمة
                            </button>
                          </div>
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

      <div style={{marginTop:8,fontSize:11,color:'var(--cs-text-muted)',textAlign:'center'}}>
        اضغط "مهمة" لإضافة — اضغط × لحذف — يمكنك إضافة مهام غير محدودة لكل خلية
      </div>

      {/* Add Task Modal */}
      {addModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:440,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16}}>
                إضافة مهام — {DAYS_AR[addModal.day]}
              </div>
              <button onClick={()=>setAddModal(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>

            {/* Tech name */}
            <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:13,fontWeight:600,color:addModal.color}}>
              👷 {techs.find(t=>t.id===addModal.techId)?.full_name}
            </div>

            {/* Current tasks */}
            {(assignments[key(addModal.techId,addModal.day)]||[]).length>0&&(
              <div style={{background:'#F8FAFC',borderRadius:8,padding:10,marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--cs-text-muted)',marginBottom:6}}>
                  المهام الحالية ({(assignments[key(addModal.techId,addModal.day)]||[]).length}):
                </div>
                {(assignments[key(addModal.techId,addModal.day)]||[]).map((t,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    background:'white',borderRadius:6,padding:'5px 10px',marginBottom:4,fontSize:12,
                    borderRight:`3px solid ${t.color}`}}>
                    <span style={{color:t.color,fontWeight:600}}>{t.label}</span>
                    <button onClick={()=>removeTask(addModal.techId,addModal.day,i)}
                      style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)',fontSize:16}}>×</button>
                  </div>
                ))}
                <button onClick={()=>clearDay(addModal.techId,addModal.day)}
                  style={{background:'none',border:'1px solid var(--cs-red)',borderRadius:6,color:'var(--cs-red)',fontSize:11,padding:'3px 10px',cursor:'pointer',marginTop:4,fontFamily:'Tajawal,sans-serif'}}>
                  حذف الكل
                </button>
              </div>
            )}

            {/* Type selector */}
            <div style={{display:'flex',gap:0,marginBottom:12,borderRadius:8,overflow:'hidden',border:'1px solid var(--cs-border)'}}>
              {(['project','maintenance','custom'] as const).map(t=>(
                <button key={t} onClick={()=>{setSelectedType(t);setSelectedJob('');setCustomTask('')}}
                  style={{flex:1,padding:'8px 4px',border:'none',cursor:'pointer',
                    fontFamily:'Tajawal,sans-serif',fontWeight:600,fontSize:12,
                    background:selectedType===t?addModal.color:'white',
                    color:selectedType===t?'white':'var(--cs-text-muted)'}}>
                  {t==='project'?'🏗 مشروع':t==='maintenance'?'🔧 صيانة':'✏️ مخصص'}
                </button>
              ))}
            </div>

            {selectedType==='custom' ? (
              <input className="form-input" placeholder="اكتب وصف المهمة..." style={{marginBottom:12}}
                value={customTask} onChange={e=>setCustomTask(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addTask()}/>
            ) : (
              <select className="form-input" style={{marginBottom:12}} value={selectedJob} onChange={e=>setSelectedJob(e.target.value)}>
                <option value="">— اختر {selectedType==='project'?'مشروع':'طلب صيانة'} —</option>
                {(selectedType==='project'?projects:maintenance).map((item:any)=>(
                  <option key={item.id} value={item.project_name||`${item.job_code} — ${item.description}`}>
                    {item.project_name||`${item.job_code} — ${item.description}`}
                  </option>
                ))}
              </select>
            )}

            <div style={{display:'flex',gap:8}}>
              <button className="btn-primary" style={{flex:1}} 
                onClick={addTask}
                disabled={selectedType==='custom'?!customTask.trim():!selectedJob}>
                <Plus size={14}/>إضافة مهمة
              </button>
              <button className="btn-secondary" onClick={()=>setAddModal(null)}>
                تم ✓
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@media print{.btn-primary,.btn-secondary,button{display:none!important}}`}</style>
    </div>
  )
}
