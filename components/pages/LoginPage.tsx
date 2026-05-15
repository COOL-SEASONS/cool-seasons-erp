'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Lock, Mail, Snowflake, ArrowRight } from 'lucide-react'

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [mode,     setMode]     = useState<'login'|'reset'>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('يرجى إدخال البريد وكلمة المرور'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) setError('البريد أو كلمة المرور غير صحيحة')
    else onLogin()
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('يرجى إدخال بريدك الإلكتروني'); return }
    setLoading(true); setError(''); setSuccess('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setLoading(false)
    if (err) setError('حدث خطأ، تأكد من البريد الإلكتروني')
    else setSuccess('✅ تم إرسال رابط إعادة التعيين على بريدك — تحقق من الإيميل')
  }

  const inputStyle = {
    width:'100%', padding:'11px 40px 11px 14px', border:'2px solid #E5E7EB',
    borderRadius:10, fontSize:14, fontFamily:'Tajawal,sans-serif',
    outline:'none', boxSizing:'border-box' as any, direction:'ltr' as any,
    textAlign:'right' as any, transition:'border 0.2s'
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg,#0F4C81 0%,#1E9CD7 50%,#0F4C81 100%)',
      fontFamily:'Tajawal,Cairo,sans-serif', direction:'rtl'
    }}>
      <div style={{
        background:'white', borderRadius:20, padding:'40px 36px',
        width:'100%', maxWidth:420, boxShadow:'0 25px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{
            background:'linear-gradient(135deg,#1E9CD7,#0F4C81)', borderRadius:16,
            width:64, height:64, display:'flex', alignItems:'center',
            justifyContent:'center', margin:'0 auto 14px'
          }}>
            <Snowflake size={32} color="white"/>
          </div>
          <div style={{ fontFamily:'Cairo,sans-serif', fontWeight:900, fontSize:22, color:'#0F4C81' }}>
            COOL SEASONS
          </div>
          <div style={{ fontSize:12, color:'#64748B', marginTop:4 }}>
            {mode==='login' ? 'DARAJA.STORE — نظام ERP' : 'إعادة تعيين كلمة المرور'}
          </div>
        </div>

        {/* ─── وضع تسجيل الدخول ─── */}
        {mode === 'login' && (
          <form onSubmit={login}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>
                البريد الإلكتروني
              </label>
              <div style={{ position:'relative' }}>
                <Mail size={16} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="example@email.com" style={inputStyle}
                  onFocus={e=>e.target.style.borderColor='#1E9CD7'}
                  onBlur={e=>e.target.style.borderColor='#E5E7EB'}/>
              </div>
            </div>

            <div style={{ marginBottom:8 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>
                كلمة المرور
              </label>
              <div style={{ position:'relative' }}>
                <Lock size={16} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
                <input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••" style={{...inputStyle, paddingLeft:40}}
                  onFocus={e=>e.target.style.borderColor='#1E9CD7'}
                  onBlur={e=>e.target.style.borderColor='#E5E7EB'}/>
                <button type="button" onClick={()=>setShow(!show)}
                  style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0 }}>
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* نسيت كلمة المرور */}
            <div style={{ textAlign:'left', marginBottom:20 }}>
              <button type="button" onClick={()=>{ setMode('reset'); setError(''); setSuccess('') }}
                style={{ background:'none', border:'none', color:'#1E9CD7', fontSize:12,
                  cursor:'pointer', fontFamily:'Tajawal,sans-serif', fontWeight:600 }}>
                نسيت كلمة المرور؟
              </button>
            </div>

            {error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:8,
                padding:'10px 14px', marginBottom:16, fontSize:13, color:'#DC2626' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'13px',
              background: loading?'#93C5FD':'linear-gradient(135deg,#1E9CD7,#0F4C81)',
              color:'white', border:'none', borderRadius:10, fontSize:15,
              fontFamily:'Cairo,sans-serif', fontWeight:700,
              cursor: loading?'not-allowed':'pointer',
              boxShadow:'0 4px 15px rgba(30,156,215,0.4)'
            }}>
              {loading ? '⏳ جاري التحقق...' : '🔐 دخول'}
            </button>
          </form>
        )}

        {/* ─── وضع إعادة التعيين ─── */}
        {mode === 'reset' && (
          <form onSubmit={resetPassword}>
            <p style={{ fontSize:13, color:'#64748B', marginBottom:20, textAlign:'center', lineHeight:1.6 }}>
              أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
            </p>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>
                البريد الإلكتروني
              </label>
              <div style={{ position:'relative' }}>
                <Mail size={16} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="example@email.com" style={inputStyle}
                  onFocus={e=>e.target.style.borderColor='#1E9CD7'}
                  onBlur={e=>e.target.style.borderColor='#E5E7EB'}/>
              </div>
            </div>

            {error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:8,
                padding:'10px 14px', marginBottom:16, fontSize:13, color:'#DC2626' }}>
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:8,
                padding:'12px 14px', marginBottom:16, fontSize:13, color:'#16A34A',
                lineHeight:1.6, textAlign:'center' }}>
                {success}
              </div>
            )}

            <button type="submit" disabled={loading||!!success} style={{
              width:'100%', padding:'13px',
              background: (loading||success)?'#93C5FD':'linear-gradient(135deg,#1E9CD7,#0F4C81)',
              color:'white', border:'none', borderRadius:10, fontSize:15,
              fontFamily:'Cairo,sans-serif', fontWeight:700,
              cursor:(loading||!!success)?'not-allowed':'pointer',
              boxShadow:'0 4px 15px rgba(30,156,215,0.4)', marginBottom:14
            }}>
              {loading ? '⏳ جاري الإرسال...' : success ? '✅ تم الإرسال' : '📧 إرسال رابط التعيين'}
            </button>

            <button type="button" onClick={()=>{ setMode('login'); setError(''); setSuccess('') }}
              style={{ width:'100%', background:'none', border:'1px solid #E5E7EB', borderRadius:10,
                padding:'11px', color:'#374151', fontSize:13, cursor:'pointer',
                fontFamily:'Tajawal,sans-serif', display:'flex', alignItems:'center',
                justifyContent:'center', gap:6 }}>
              <ArrowRight size={14}/> العودة لتسجيل الدخول
            </button>
          </form>
        )}

        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'#9CA3AF' }}>
          🔒 محمي بـ Supabase Auth
        </div>
      </div>
    </div>
  )
}
