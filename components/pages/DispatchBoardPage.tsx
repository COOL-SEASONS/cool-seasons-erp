'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronRight, ChevronLeft, Plus, X, Printer } from 'lucide-react'

const DAYS_AR=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
// Vibrant, distinct color palette
const COLORS=['#1E9CD7','#27AE60','#E67E22','#C0392B','#8E44AD','#16A085','#D35400','#2980B9','#E91E63','#00BCD4']

export default function DispatchBoardPage() {
  const [techs,setTechs]=useState<any[]>([])
  const [projects,setProjects]=useState<any[]>([])
  const [maintenance,setMaintenance]=useState<any[]>([])
  // Use a fixed reference date that doesn't change as user scrolls
  const [weekStartIso,setWeekStartIso]=useState(()=>{
    const d=new Date(); d.setDate(d.getDate()-d.getDay()); d.setHours(0,0,0,0)
    return d.toISOString().split('T')[0]
  })
  // Tasks keyed by techId+ISO_DATE so they stay tied to that exact date
  const [assignments,setAssignments]=useState<Record<string,{label:string,color:string}[]>>({})
  const [loading,setLoading]=useState(true)
  const [addModal,setAddModal]=useState<{techId:string,dateIso:string,color:string}|null>(null)
  const [selectedJob,setSelectedJob]=useState('')
  const [selectedType,setSelectedType]=useState<'project'|'maintenance'|'custom'>('project')
  const [customTask,setCustomTask]=useState('')

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

  const weekStart=new Date(weekStartIso)
  const weekDates=Array.from({length:7},(_,i)=>{const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); return d})
  // Key uses tech id + iso date string — this is permanent and won't shift
  const key=(techId:string,dateIso:string)=>`${techId}||${dateIso}`
  const today=new Date().toISOString().split('T')[0]

  const addTask=()=>{
    if(!addModal) return
    const label=selectedType==='custom'?customTask:selectedJob
    if(!label?.trim()) return
    const k=key(addModal.techId,addModal.dateIso)
    setAssignments(prev=>({...prev,[k]:[...(prev[k]||[]),{label,color:addModal.color}]}))
    setSelectedJob(''); setCustomTask('')
  }
  const removeTask=(techId:string,dateIso:string,idx:number)=>{
    const k=key(techId,dateIso)
    setAssignments(prev=>{const arr=[...(prev[k]||[])]; arr.splice(idx,1); return {...prev,[k]:arr}})
  }
  const clearDay=(techId:string,dateIso:string)=>{
    setAssignments(prev=>({...prev,[key(techId,dateIso)]:[]}))
  }

  const prevWeek=()=>{const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStartIso(d.toISOString().split('T')[0])}
  const nextWeek=()=>{const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStartIso(d.toISOString().split('T')[0])}
  const goToday=()=>{const d=new Date(); d.setDate(d.getDate()-d.getDay()); d.setHours(0,0,0,0); setWeekStartIso(d.toISOString().split('T')[0])}
  const fmtDate=(d:Date)=>`${d.getDate()}/${d.getMonth()+1}`
  const startLabel=`${weekDates[0].getDate()}/${weekDates[0].getMonth()+1}`
  const endLabel=`${weekDates[6].getDate()}/${weekDates[6].getMonth()+1} ${weekDates[6].getFullYear()}`

  if(loading) return <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title" style={{fontSize:22}}>Dispatch Board</div><div className="page-subtitle" style={{fontSize:14}}>جدولة الفنيين الأسبوعية — {startLabel} إلى {endLabel}</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          <button onClick={prevWeek} style={{background:'white',border:'1px solid var(--cs-border)',borderRadius:8,padding:'8px 14px',cursor:'pointer'}}><ChevronRight size={18}/></button>
          <button onClick={goToday} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:8,padding:'8px 18px',cursor:'pointer',fontSize:14,fontFamily:'Tajawal,sans-serif',fontWeight:700}}>اليوم</button>
          <button onClick={nextWeek} style={{background:'white',border:'1px solid var(--cs-border)',borderRadius:8,padding:'8px 14px',cursor:'pointer'}}><ChevronLeft size={18}/></button>
        </div>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden',background:'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:1100}}>
            <thead>
              <tr style={{background:'linear-gradient(135deg, #1E9CD7 0%, #1565C0 100%)',color:'white'}}>
                <th style={{padding:'14px 18px',textAlign:'right',width:200,fontSize:15,borderLeft:'1px solid rgba(255,255,255,0.2)'}}>الفني</th>
                {weekDates.map((d,i)=>{
                  const di=d.toISOString().split('T')[0]
                  return (
                    <th key={i} style={{padding:'12px 6px',textAlign:'center',minWidth:140,background:di===today?'rgba(255,255,255,0.15)':'transparent',borderLeft:'1px solid rgba(255,255,255,0.2)'}}>
                      <div style={{fontSize:13,opacity:0.9,fontWeight:500}}>{DAYS_AR[i]}</div>
                      <div style={{fontSize:18,fontWeight:800,marginTop:2}}>{fmtDate(d)}</div>
                      {di===today&&<div style={{fontSize:9,marginTop:2,background:'#FFD700',color:'#1565C0',borderRadius:10,padding:'1px 6px',display:'inline-block',fontWeight:700}}>اليوم</div>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {techs.map((tech,tIdx)=>{
                const techColor=COLORS[tIdx%COLORS.length]
                return (
                  <tr key={tech.id} style={{borderBottom:'2px solid #E0E7EF',background:'white'}}>
                    <td style={{padding:'12px 14px',background:`linear-gradient(90deg, ${techColor}15 0%, white 100%)`,borderLeft:'1px solid #E0E7EF',verticalAlign:'middle',borderRight:`5px solid ${techColor}`}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:42,height:42,borderRadius:'50%',background:`linear-gradient(135deg, ${techColor} 0%, ${techColor}cc 100%)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'white',flexShrink:0,boxShadow:`0 2px 8px ${techColor}50`}}>
                          {tech.full_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{fontSize:15,fontWeight:700,color:'#1A1A1A'}}>{tech.full_name}</div>
                          <div style={{fontSize:11,color:techColor,fontWeight:600}}>{tech.tech_code}</div>
                        </div>
                      </div>
                    </td>
                    {weekDates.map((d,dayIdx)=>{
                      const dateIso=d.toISOString().split('T')[0]
                      const k=key(tech.id,dateIso)
                      const tasks=assignments[k]||[]
                      const isToday=dateIso===today
                      return (
                        <td key={dayIdx} style={{padding:5,verticalAlign:'top',background:isToday?'#FFFEF0':'white',borderLeft:'1px solid #E0E7EF',minWidth:140,minHeight:75}}>
                          <div style={{minHeight:65,display:'flex',flexDirection:'column',gap:4}}>
                            {tasks.map((task,taskIdx)=>(
                              <div key={taskIdx} style={{background:`linear-gradient(90deg, ${task.color}25 0%, ${task.color}10 100%)`,borderRight:`4px solid ${task.color}`,borderRadius:'0 6px 6px 0',padding:'5px 8px 5px 6px',fontSize:13,fontWeight:600,color:task.color,display:'flex',justifyContent:'space-between',alignItems:'center',gap:4,boxShadow:`0 1px 3px ${task.color}20`}}>
                                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,lineHeight:1.4}}>{task.label}</span>
                                <button onClick={()=>removeTask(tech.id,dateIso,taskIdx)} style={{background:'none',border:'none',cursor:'pointer',color:task.color,padding:0,flexShrink:0,fontSize:16,lineHeight:1,opacity:0.6,fontWeight:700}}>×</button>
                              </div>
                            ))}
                            <button onClick={()=>{setAddModal({techId:tech.id,dateIso,color:techColor});setSelectedType('project');setSelectedJob('');setCustomTask('')}} style={{background:'rgba(255,255,255,0.7)',border:`1.5px dashed ${isToday?'var(--cs-blue)':'#B8C4D6'}`,borderRadius:6,cursor:'pointer',color:isToday?'var(--cs-blue)':'#7F8C8D',fontSize:12,padding:'4px 8px',display:'flex',alignItems:'center',justifyContent:'center',gap:4,fontWeight:600,fontFamily:'Tajawal,sans-serif'}}>
                              <Plus size={12}/> مهمة
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

      <div style={{marginTop:10,fontSize:12,color:'var(--cs-text-muted)',textAlign:'center'}}>
        💡 اضغط "مهمة" لإضافة — اضغط × لحذف — المهام مرتبطة بتاريخ محدد ولا تتحرك
      </div>

      {addModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:460,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:17}}>إضافة مهمة</div>
              <button onClick={()=>setAddModal(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{background:`linear-gradient(135deg, ${addModal.color}15 0%, white 100%)`,borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:14,fontWeight:700,color:addModal.color,borderRight:`4px solid ${addModal.color}`}}>
              👷 {techs.find(t=>t.id===addModal.techId)?.full_name} — {addModal.dateIso}
            </div>
            {(assignments[key(addModal.techId,addModal.dateIso)]||[]).length>0&&(
              <div style={{background:'#F8FAFC',borderRadius:8,padding:10,marginBottom:14,maxHeight:160,overflowY:'auto'}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--cs-text-muted)',marginBottom:6}}>المهام الحالية ({(assignments[key(addModal.techId,addModal.dateIso)]||[]).length}):</div>
                {(assignments[key(addModal.techId,addModal.dateIso)]||[]).map((t,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'white',borderRadius:6,padding:'6px 10px',marginBottom:4,fontSize:13,borderRight:`3px solid ${t.color}`}}>
                    <span style={{color:t.color,fontWeight:600}}>{t.label}</span>
                    <button onClick={()=>removeTask(addModal.techId,addModal.dateIso,i)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)',fontSize:16}}>×</button>
                  </div>
                ))}
                <button onClick={()=>clearDay(addModal.techId,addModal.dateIso)} style={{background:'none',border:'1px solid var(--cs-red)',borderRadius:6,color:'var(--cs-red)',fontSize:12,padding:'4px 12px',cursor:'pointer',marginTop:4,fontFamily:'Tajawal,sans-serif',fontWeight:600}}>حذف الكل</button>
              </div>
            )}
            <div style={{display:'flex',gap:0,marginBottom:14,borderRadius:8,overflow:'hidden',border:'1px solid var(--cs-border)'}}>
              {(['project','maintenance','custom'] as const).map(t=>(
                <button key={t} onClick={()=>{setSelectedType(t);setSelectedJob('');setCustomTask('')}} style={{flex:1,padding:'10px 6px',border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:600,fontSize:13,background:selectedType===t?addModal.color:'white',color:selectedType===t?'white':'var(--cs-text-muted)'}}>
                  {t==='project'?'🏗 مشروع':t==='maintenance'?'🔧 صيانة':'✏️ مخصص'}
                </button>
              ))}
            </div>
            {selectedType==='custom'?(
              <input className="form-input" placeholder="اكتب وصف المهمة..." style={{marginBottom:14,fontSize:14}} value={customTask} onChange={e=>setCustomTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()}/>
            ):(
              <select className="form-input" style={{marginBottom:14,fontSize:14}} value={selectedJob} onChange={e=>setSelectedJob(e.target.value)}>
                <option value="">— اختر —</option>
                {(selectedType==='project'?projects:maintenance).map((item:any)=>(
                  <option key={item.id} value={item.project_name||`${item.job_code} — ${item.description}`}>{item.project_name||`${item.job_code} — ${item.description}`}</option>
                ))}
              </select>
            )}
            <div style={{display:'flex',gap:8}}>
              <button className="btn-primary" style={{flex:1,fontSize:14}} onClick={addTask} disabled={selectedType==='custom'?!customTask.trim():!selectedJob}><Plus size={14}/>إضافة</button>
              <button className="btn-secondary" onClick={()=>setAddModal(null)}>تم ✓</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@media print{.btn-primary,.btn-secondary,button{display:none!important}}`}</style>
    </div>
  )
}
