'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronRight, ChevronLeft } from 'lucide-react'

export default function GanttPage() {
  const [projects,setProjects] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [viewStart,setViewStart] = useState(() => {
    const d = new Date(); d.setDate(1); return d
  })

  useEffect(()=>{
    supabase.from('projects')
      .select('id,project_code,project_name,start_date,end_date,completion_pct,status,technicians(full_name),clients(company_name)')
      .not('start_date','is',null).not('end_date','is',null)
      .order('start_date',{ascending:true})
      .then(({data})=>{ setProjects(data||[]); setLoading(false) })
  },[])

  const WEEKS = 16
  const weeks: Date[] = []
  for(let i=0;i<WEEKS;i++){
    const d = new Date(viewStart)
    d.setDate(viewStart.getDate() + i*7)
    weeks.push(d)
  }

  const viewEnd = new Date(viewStart)
  viewEnd.setDate(viewStart.getDate() + WEEKS*7)

  const statusColor: Record<string,string> = {
    'In Progress':'var(--cs-blue)',
    'Completed':'var(--cs-green)',
    'On Hold':'var(--cs-orange)',
    'Cancelled':'var(--cs-red)',
    'Planned':'#8E44AD',
  }

  const getBar = (proj: any) => {
    if(!proj.start_date||!proj.end_date) return null
    const pStart = new Date(proj.start_date)
    const pEnd = new Date(proj.end_date)
    const totalMs = viewEnd.getTime() - viewStart.getTime()
    const startOffset = Math.max(0, (pStart.getTime()-viewStart.getTime())/totalMs*100)
    const endOffset = Math.min(100, (pEnd.getTime()-viewStart.getTime())/totalMs*100)
    const width = endOffset - startOffset
    if(width <= 0) return null
    return { left: startOffset, width, color: statusColor[proj.status]||'var(--cs-blue)' }
  }

  const todayOffset = () => {
    const total = viewEnd.getTime()-viewStart.getTime()
    const pos = (new Date().getTime()-viewStart.getTime())/total*100
    return Math.max(0,Math.min(100,pos))
  }

  const prevPeriod = () => { const d=new Date(viewStart); d.setDate(d.getDate()-WEEKS*7); setViewStart(d) }
  const nextPeriod = () => { const d=new Date(viewStart); d.setDate(d.getDate()+WEEKS*7); setViewStart(d) }
  const goToday = () => { const d=new Date(); d.setDate(d.getDate()-7); setViewStart(d) }

  const fmtDate = (d:Date) => `${d.getDate()}/${d.getMonth()+1}`
  const fmtMonth = (d:Date) => ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][d.getMonth()]

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">مخطط جانت</div><div className="page-subtitle">Gantt Chart — جدولة المشاريع</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={prevPeriod} style={{background:'none',border:'1px solid var(--cs-border)',borderRadius:8,padding:'6px 10px',cursor:'pointer'}}><ChevronRight size={16}/></button>
          <button onClick={goToday} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}>اليوم</button>
          <button onClick={nextPeriod} style={{background:'none',border:'1px solid var(--cs-border)',borderRadius:8,padding:'6px 10px',cursor:'pointer'}}><ChevronLeft size={16}/></button>
        </div>
      </div>

      {/* Legend */}
      <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap'}}>
        {Object.entries(statusColor).map(([status,color])=>(
          <div key={status} style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
            <div style={{width:12,height:12,borderRadius:3,background:color}}/>
            <span style={{color:'var(--cs-text-muted)'}}>{status}</span>
          </div>
        ))}
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
          <div style={{width:2,height:12,background:'var(--cs-red)'}}/>
          <span style={{color:'var(--cs-text-muted)'}}>اليوم</span>
        </div>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <div style={{minWidth:900}}>
            {/* Header */}
            <div style={{display:'grid',gridTemplateColumns:'240px 1fr',borderBottom:'2px solid var(--cs-border)',background:'var(--cs-gray-light)'}}>
              <div style={{padding:'10px 16px',fontWeight:700,fontSize:13,borderLeft:'1px solid var(--cs-border)'}}>المشروع</div>
              <div style={{position:'relative',height:48}}>
                {/* Month labels */}
                <div style={{display:'flex',height:24,borderBottom:'1px solid var(--cs-border)'}}>
                  {weeks.filter((_,i)=>i===0||weeks[i].getMonth()!==weeks[i-1].getMonth()).map((w,i)=>{
                    const nextChange = weeks.findIndex((ww,j)=>j>weeks.indexOf(w)&&ww.getMonth()!==w.getMonth())
                    const span = nextChange===-1 ? WEEKS-weeks.indexOf(w) : nextChange-weeks.indexOf(w)
                    return (
                      <div key={i} style={{width:`${span/WEEKS*100}%`,padding:'4px 8px',fontSize:11,fontWeight:700,color:'var(--cs-blue)',borderLeft:'1px solid var(--cs-border)',overflow:'hidden',flexShrink:0}}>
                        {fmtMonth(w)} {w.getFullYear()}
                      </div>
                    )
                  })}
                </div>
                {/* Week labels */}
                <div style={{display:'flex',height:24}}>
                  {weeks.map((w,i)=>(
                    <div key={i} style={{flex:1,padding:'4px 6px',fontSize:10,color:'var(--cs-text-muted)',borderLeft:'1px solid var(--cs-border)',textAlign:'center'}}>{fmtDate(w)}</div>
                  ))}
                </div>
                {/* Today line */}
                <div style={{position:'absolute',top:0,bottom:0,left:`${todayOffset()}%`,width:2,background:'var(--cs-red)',opacity:0.8,zIndex:10}}/>
              </div>
            </div>

            {/* Rows */}
            {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>
            :projects.length===0?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>لا توجد مشاريع بتواريخ محددة</div>
            :projects.map((proj,i)=>{
              const bar = getBar(proj)
              return (
                <div key={proj.id} style={{display:'grid',gridTemplateColumns:'240px 1fr',borderBottom:'1px solid var(--cs-border)',minHeight:44,background:i%2===0?'white':'#FAFBFC'}}>
                  <div style={{padding:'8px 16px',borderLeft:'1px solid var(--cs-border)',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                    <div style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{proj.project_name}</div>
                    <div style={{fontSize:10,color:'var(--cs-text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{proj.clients?.company_name||''}</div>
                  </div>
                  <div style={{position:'relative',padding:'8px 0'}}>
                    {/* Today line */}
                    <div style={{position:'absolute',top:0,bottom:0,left:`${todayOffset()}%`,width:1,background:'var(--cs-red)',opacity:0.4,zIndex:5}}/>
                    {/* Week grid */}
                    {weeks.map((_,wi)=>(
                      <div key={wi} style={{position:'absolute',top:0,bottom:0,left:`${wi/WEEKS*100}%`,width:1,background:'var(--cs-border)',opacity:0.5}}/>
                    ))}
                    {/* Bar */}
                    {bar && (
                      <div style={{position:'absolute',top:8,bottom:8,left:`${bar.left}%`,width:`${bar.width}%`,background:bar.color,borderRadius:6,opacity:0.85,display:'flex',alignItems:'center',overflow:'hidden',cursor:'default',zIndex:3,minWidth:4}}
                        title={`${proj.project_name} — ${proj.completion_pct||0}%`}>
                        {/* Progress fill */}
                        <div style={{position:'absolute',top:0,bottom:0,left:0,width:`${proj.completion_pct||0}%`,background:'rgba(0,0,0,0.2)',borderRadius:'6px 0 0 6px'}}/>
                        {bar.width>5&&<span style={{position:'relative',padding:'0 8px',color:'white',fontSize:10,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                          {proj.project_name} {proj.completion_pct?`(${proj.completion_pct}%)`:''}
                        </span>}
                      </div>
                    )}
                    {!bar&&<div style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:4,fontSize:10,color:'var(--cs-text-muted)'}}>خارج النطاق</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
