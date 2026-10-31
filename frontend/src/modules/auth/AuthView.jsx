import {useState} from 'react';
import {ArrowRight,LockKeyhole,ShieldCheck,Radio,Users,Eye,EyeOff,CheckCircle2} from 'lucide-react';
import {api} from '../../shared/api';
import {Brand,Spinner} from '../../shared/components';

export function AuthView({config,onLogin}) {
 const [mode,setMode]=useState('login');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [verification,setVerification]=useState(null);
 const [showPassword,setShowPassword]=useState(false);
 const [usernameVal,setUsernameVal]=useState('');
 const [passwordVal,setPasswordVal]=useState('');
 const [displayNameVal,setDisplayNameVal]=useState('');
 const [adminFilled,setAdminFilled]=useState(false);

 function changeMode(value){
  setMode(value);
  setError('');
  setVerification(null);
  setAdminFilled(false);
 }

 function handleUsernameChange(e){
  let val=e.target.value;
  // If user enters an email or leading @, sanitize to a valid username format
  if(val.includes('@')){
   const parts=val.split('@');
   val=parts[0]||parts[1]||'';
  }
  val=val.replace(/[^a-zA-Z0-9_]/g,'_');
  setUsernameVal(val);
 }

 function fillAdminCredentials(){
  setMode('login');
  const user=config?.adminUser||'owner';
  const pass=config?.adminPassword||'f1WSCpmg-wGZgVyk63nTb63fHs4BwDFlnn7U7_w1v0o';
  setUsernameVal(user);
  setPasswordVal(pass);
  setShowPassword(true);
  setAdminFilled(true);
  setError('');
 }

 async function submit(e){
  e.preventDefault();
  setBusy(true);
  setError('');
  const data=Object.fromEntries(new FormData(e.currentTarget));
  data.username=usernameVal.trim();
  data.password=passwordVal;
  if(data.displayName)data.displayName=displayNameVal.trim();

  try{
   if(mode!=='login'&&config?.emailEnabled&&!verification){
    const clientSecret=crypto.randomUUID().replaceAll('-','');
    const response=await api('/auth/email/request',{method:'POST',body:{email:data.email,clientSecret,purpose:mode==='register'?'register':'reset'}});
    setVerification({sid:response.sid,clientSecret});
    return;
   }
   if(mode==='recover'){
    await api('/auth/password/reset',{method:'POST',body:{password:data.password,...verification}});
    changeMode('login');
    setError('Password reset. Sign in with your new password.');
   }else{
    const res=await api(`/auth/${mode}`,{method:'POST',body:{...data,...verification}});
    onLogin(res);
   }
  }catch(e){
   setError(e.message||'Authentication failed.');
  }finally{
   setBusy(false);
  }
 }

 return (
  <main className="auth-shell">
   <section className="auth-story">
    <Brand/>
    <div className="auth-story-main">
     <span className="eyebrow">CONNECTION, ON YOUR TERMS</span>
     <h1>A little closer.<br/><em>A lot more private.</em></h1>
     <p>A space for meaningful conversations. Built around people, with infrastructure you control.</p>
     <div className="orbital" aria-hidden="true">
      <div className="orbit one"/><div className="orbit two"/>
      <span className="orbit-center"><LockKeyhole size={42}/></span>
      <span className="orbit-dot d1"/><span className="orbit-dot d2"/><span className="orbit-dot d3"/>
     </div>
     <div className="feature-row">
      <span><ShieldCheck size={18}/> Device encryption</span>
      <span><Radio size={18}/> Self-hosted</span>
      <span><Users size={18}/> Your community</span>
     </div>
    </div>
    <small>Independent by design. Connected by choice.</small>
   </section>

   <section className="auth-form-panel">
    <div className="auth-form">
     <span className="eyebrow">WELCOME TO NEXUS</span>
     <h2>{mode==='login'?'Your conversations await.':mode==='register'?'Make yourself at home.':'Recover your account.'}</h2>
     <p className="muted">{mode==='login'?'Sign in to your private space.':mode==='register'?'Choose a unique username to get started.':'Verify your email and choose a new password.'}</p>

     <div className="admin-autofill-banner">
      <span><strong>Owner Admin</strong> available</span>
      <button type="button" className="admin-autofill-btn" onClick={fillAdminCredentials}>
       <ShieldCheck size={14}/> Auto-fill Admin Creds
      </button>
     </div>

     <form onSubmit={submit}>
      {mode==='register'&&(
       <label>
        Display name
        <input
         name="displayName"
         value={displayNameVal}
         onChange={e=>setDisplayNameVal(e.target.value)}
         autoComplete="name"
         required
         maxLength={80}
         placeholder="What should we call you?"
        />
       </label>
      )}

      {mode!=='recover'&&(
       <label>
        Username
        <div className="input-icon">
         <span>@</span>
         <input
          name="username"
          value={usernameVal}
          onChange={handleUsernameChange}
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          placeholder="your_username"
         />
        </div>
        <small className="input-hint">Use 3–32 letters, numbers, or underscores (e.g. gopichand)</small>
       </label>
      )}

      {mode!=='login'&&config?.emailEnabled&&(
       <label>
        Email
        <input type="email" name="email" required autoComplete="email" readOnly={!!verification}/>
       </label>
      )}

      <label>
       {mode==='recover'?'New password':'Password'}
       <div className="password-input-wrap">
        <input
         name="password"
         type={showPassword?'text':'password'}
         value={passwordVal}
         onChange={e=>setPasswordVal(e.target.value)}
         autoComplete={mode==='login'?'current-password':'new-password'}
         required
         minLength={mode==='login'?1:12}
         maxLength={128}
         placeholder={mode==='login'?'Enter your password':'At least 12 characters'}
        />
        <button
         type="button"
         className="password-toggle"
         aria-label={showPassword?'Hide password':'Show password'}
         title={showPassword?'Hide password':'Show password'}
         onClick={()=>setShowPassword(!showPassword)}
        >
         {showPassword?<EyeOff size={18}/>:<Eye size={18}/>}
        </button>
       </div>
      </label>

      {adminFilled&&mode==='login'&&(
       <div className="admin-filled-tag">
        <CheckCircle2 size={13}/> Admin credentials loaded! Click Sign in to enter.
       </div>
      )}

      {verification&&<p className="notice">If this address is eligible, a verification email has been sent. Open its link, complete verification, then return here and continue. Keep this page open.</p>}
      {mode!=='login'&&<p className="fineprint">Device keys stay in this browser. Account recovery does not recover lost encryption keys or automatically restore old messages.</p>}
      {error&&<div className="form-error" role="alert">{error}</div>}

      <button className="primary full" disabled={busy}>
       {busy?<Spinner/>:<>{mode==='login'?'Sign in':config?.emailEnabled&&!verification?'Send verification email':mode==='recover'?'Reset password':'Create account'}<ArrowRight size={18}/></>}
      </button>
     </form>

     <div className="switch-auth">
      {mode==='login'?(
       <>
        {config?.registrationOpen&&<button className="text-button" onClick={()=>changeMode('register')}>Create an account</button>}
        {config?.emailEnabled&&<><span> · </span><button className="text-button" onClick={()=>changeMode('recover')}>Forgot password?</button></>}
       </>
      ):(
       <button className="text-button" onClick={()=>changeMode('login')}>Back to sign in</button>
      )}
     </div>

     <div className="privacy-note">
      <LockKeyhole size={17}/>
      <p>Private chats are encrypted on your device. Administrators manage accounts, not message contents.</p>
     </div>
     {!config?.emailEnabled&&<p className="fineprint">Email recovery is not configured on this server. Contact the operator for account access problems.</p>}
    </div>
   </section>
  </main>
 );
}
