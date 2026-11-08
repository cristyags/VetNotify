import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowRight, Bell, CalendarDays, FlaskConical, Inbox, LayoutDashboard, LogOut, ShieldCheck,
  Radio, Clock3, UserRound, Waypoints } from 'lucide-react';
import './styles.css';
import { ApiError, call, type Human } from './data';
import { Applications, Emit } from './apps';
import { NotificationDetail, RecipientInbox } from './detail';
import { initialFilters, Notifications, Overview, type Filters } from './operations';
import { Brand, ErrorNotice, Loading } from './ui';

const operatorNav=[
  ['overview','Resumen',LayoutDashboard],['notifications','Notificaciones',Bell],
  ['agenda','Agenda',CalendarDays],['laboratorio','Laboratorio',FlaskConical],['applications','Aplicaciones',Waypoints],
] as const;
const inboxNav=[['inbox','Mi bandeja',Inbox]] as const;

function Login({onLogin}:{onLogin:(user:Human)=>void}) {
  const [name,setName]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit() {
    if(busy)return;
    setBusy(true);setError('');
    try{onLogin(await call<Human>('/auth/login',{method:'POST',body:{username:name.trim().toLowerCase(),password}}));}
    catch(error){setError((error as Error).message);}
    finally{setBusy(false);}
  }
  return <main className="login">
    <section className="login-story"><Brand/><div className="login-intro">
      <div className="eyebrow"><span/> PLATAFORMA DE NOTIFICACIONES</div>
      <h1>El aviso correcto,<br/>en el canal correcto.</h1>
      <p>Agenda y Laboratorio en una sola vista. Sigue cada aviso veterinario desde el origen hasta la entrega.</p>
      <div className="flow"><div><CalendarDays size={23}/><span>Agenda</span></div><div><Activity size={23}/><span>VetNotify</span></div>
        <div><Inbox size={23}/><span>Entrega</span></div></div>
    </div><div className="login-foot"><Radio size={16}/>Centro de operaciones veterinarias</div></section>
    <section className="login-pane"><form onSubmit={e=>{e.preventDefault();void submit();}}>
      <span className="login-icon"><ShieldCheck size={25}/></span><h2>Iniciar sesión</h2><p>Entra con tu cuenta de VetNotify.</p>
      <label>Usuario<input name="username" autoComplete="username" required value={name} onChange={e=>setName(e.target.value)} placeholder="Tu usuario" aria-describedby={error?'login-error':undefined}/></label>
      <label>Contraseña<input name="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}
        placeholder="Tu contraseña" aria-describedby={error?'login-error':undefined}/></label>
      {error&&<div id="login-error"><ErrorNotice message={error}/></div>}
      <button className="button primary" disabled={busy}>{busy?'Verificando…':'Entrar a VetNotify'}<ArrowRight size={17}/></button>
      <small>Entorno de demostración · datos ficticios</small>
    </form></section>
  </main>;
}
function useRoute() {
  const [route,setRoute]=useState(()=>location.hash.slice(2));
  useEffect(()=>{
    const change=()=>{setRoute(location.hash.slice(2));window.scrollTo(0,0);};
    window.addEventListener('hashchange',change);
    return()=>window.removeEventListener('hashchange',change);
  },[]);
  return route.split('/');
}
function App() {
  const [user,setUser]=useState<Human|null>();
  const [sessionError,setSessionError]=useState('');
  const [version,setVersion]=useState<{version:string;environment:string}>();
  const [filters,setFilters]=useState<Filters>(initialFilters);
  const [path,id]=useRoute();
  function session() {
    setSessionError('');
    void call<Human>('/auth/me').then(setUser).catch(error=>{
      if(error instanceof ApiError&&error.status===401)setUser(null);
      else setSessionError(error.message);
    });
  }
  useEffect(()=>{
    session();
    void call<{version:string;environment:string}>('/version').then(setVersion).catch(()=>undefined);
  },[]);
  async function logout(){
    try{
      await call('/auth/logout',{method:'POST',user:user??undefined});
      setUser(null);setFilters(initialFilters);location.hash='';
    }catch(error){setSessionError((error as Error).message);}
  }
  if(user===undefined)return <main className="session-loading">{sessionError?<ErrorNotice message={sessionError} retry={session}/>:<Loading/>}</main>;
  if(!user)return <Login onLogin={identity=>{setUser(identity);location.hash=identity.role==='recipient'?'#/inbox':'#/overview';}}/>;
  const recipient=user.role==='recipient';
  const nav=recipient?inboxNav:operatorNav;
  const view=recipient?'inbox':nav.some(([key])=>key===path)?path:'overview';
  const crumb=nav.find(([key])=>key===view)?.[1];
  return <div className="shell">
    <a className="skip" href="#content" onClick={e=>{e.preventDefault();document.getElementById('content')?.focus();}}>Ir al contenido</a>
    <aside className="rail">
      <a href={recipient?'#/inbox':'#/overview'} className="logo-link" aria-label="VetNotify, inicio"><Brand/></a>
      <span className="rail-label">{recipient?'DESTINATARIO':'ESPACIO DE TRABAJO'}</span>
      <nav aria-label="Navegación principal">{nav.map(([key,label,Icon])=><a href={'#/'+key} key={key} aria-current={view===key?'page':undefined}>
        <Icon size={18}/><span>{label}</span></a>)}</nav>
      <div className="rail-foot"><span className="health-dot"/><div><strong>{version?.environment==='prod'?'Producción':'Entorno de demostración'}</strong>
        <small>VetNotify {version?.version??''}</small></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span><span className="desktop-only">{recipient?'Portal veterinario':'Operaciones'}</span><span className="top-sep desktop-only">/</span><strong>{crumb}</strong></span>
        <div className="account"><span className="zone"><Clock3 size={15}/>UTC</span><span className="avatar"><UserRound size={17}/></span>
          <div><strong>{user.name}</strong><small>{recipient?'Destinatario':'Operador'}</small></div>
          <button className="icon-button" onClick={()=>void logout()} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={17}/></button></div></header>
      <main className="content" id="content" tabIndex={-1}>
        {sessionError&&<ErrorNotice message={sessionError} retry={session}/>}
        {view==='overview'&&<Overview/>}
        {view==='notifications'&&(id?<NotificationDetail key={id} id={id} user={user}/>:<Notifications filters={filters} set={setFilters}/>)}
        {view==='agenda'&&<Emit key="agenda" source="agenda-veterinaria" user={user} environment={version?.environment}/>}
        {view==='laboratorio'&&<Emit key="laboratorio" source="laboratorio-veterinario" user={user} environment={version?.environment}/>}
        {view==='applications'&&<Applications/>}
        {view==='inbox'&&<RecipientInbox key={id??'inbox'} id={path==='inbox'?id:undefined} user={user}/>}
      </main>
      <footer className="workspace-footer"><span>VetNotify · Notificaciones multicanal</span><span>Datos ficticios · UTC</span></footer>
    </div>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
