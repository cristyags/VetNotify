import { useRef, useState } from 'react';
import { ArrowUpRight, CalendarDays, CheckCircle2, FlaskConical, Inbox, Mail, RadioTower, Send, ShieldCheck } from 'lucide-react';
import { appNames, call, channelNames, useResource, type Accepted, type Channel, type Human } from './data';
import { AppMark, CopyId, ErrorNotice, Header, Loading } from './ui';
import { ContractLink } from './detail';

const sources = {
  'agenda-veterinaria': { role:'Coordinación de citas', icon:CalendarDays, className:'agenda',
    description:'Emite confirmaciones, cambios de horario y cancelaciones desde la aplicación de Agenda.',
    events:[['cita-confirmada','Cita confirmada'],['cita-reprogramada','Cita reprogramada'],['cita-cancelada','Cita cancelada']] },
  'laboratorio-veterinario': { role:'Operación de laboratorio', icon:FlaskConical, className:'lab',
    description:'Emite avisos de recepción de muestra y disponibilidad del resultado ficticio.',
    events:[['muestra-recibida','Muestra recibida'],['resultado-disponible','Resultado disponible']] },
} as const;
export type Source=keyof typeof sources;
const modes=[['healthy','Sano'],['fail_first_n','503 dos veces y luego éxito'],['always_503','503 sostenido'],
  ['timeout','Timeout sin aceptación'],['accepted_then_timeout','Aceptado con respuesta demorada'],['permanent_rejection','Rechazo permanente']] as const;
const controlsSupported=(environment?:string)=>environment!=='prod';

export function Emit({source,user,environment}:{source:Source;user:Human;environment?:string}) {
  const data=sources[source];
  const Icon=data.icon;
  const [event,setEvent]=useState<string>(data.events[0][0]);
  const [recipient,setRecipient]=useState('luna');
  const [channels,setChannels]=useState<Channel[]>(['email','internal']);
  const [mode,setMode]=useState('healthy');
  const [requested,setRequested]=useState('healthy');
  const [enabled,setEnabled]=useState(false);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const [sent,setSent]=useState<{notification:Accepted;channel:Channel}[]>([]);
  const actionKey=useRef('');
  const [profileId]=useState(()=> 'ui-'+crypto.randomUUID().slice(0,16));
  const adjust=()=>{ actionKey.current=''; };
  function toggle(channel:Channel) {
    adjust();
    setChannels(previous=>previous.includes(channel)?previous.filter(c=>c!==channel):[...previous,channel]);
  }
  async function emit() {
    if(pending||!channels.length)return;
    setPending(true);setError('');setSent([]);
    if(!actionKey.current) actionKey.current=crypto.randomUUID();
    try{
      const result=await call<{application:string;notifications:Accepted[]}>('/demo/'+source+'/events',{
        method:'POST',user,body:{event,recipientId:recipient,channels,requestId:actionKey.current,
          ...(enabled?{runId:profileId}:{})}});
      setSent(result.notifications.map((notification,index)=>({notification,channel:channels[index]})));
      actionKey.current='';
    }catch(error){setError((error as Error).message);}
    finally{setPending(false);}
  }
  async function activate(next:string) {
    if(pending)return;
    setPending(true);setError('');
    try{
      await call('/admin/faults/'+profileId,{method:'PUT',user,body:{mode:next,expiresIn:300}});
      setMode(next);setRequested(next);setEnabled(next!=='healthy');adjust();
    }catch(error){setError((error as Error).message);}
    finally{setPending(false);}
  }
  return <>
    <Header eyebrow="EMISORES DE DEMOSTRACIÓN" title={appNames[source]} subtitle={data.description} actions={<ContractLink/>}/>
    <div className="emitter-grid">
      <section className="surface emitter-form">
        <div className="section-head"><div><h2><Send size={18}/>Generar evento</h2><p>Selecciona un evento, un destinatario y sus canales.</p></div></div>
        <form onSubmit={e=>{e.preventDefault();void emit();}}>
          <label>Evento<select aria-label="Evento" value={event} onChange={e=>{setEvent(e.target.value);adjust();}}>
            {data.events.map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label>
          <label>Destinatario<select aria-label="Destinatario" value={recipient} onChange={e=>{setRecipient(e.target.value);adjust();}}>
            <option value="luna">Sofía Rivera · Luna</option><option value="max">Diego Salas · Max</option></select></label>
          <fieldset><legend>Canales</legend>{(['email','internal'] as Channel[]).map(channel=>{
            const ChannelIcon=channel==='email'?Mail:Inbox;
            return <label className={'choice '+(channels.includes(channel)?'chosen':'')} key={channel}>
              <input type="checkbox" checked={channels.includes(channel)} onChange={()=>toggle(channel)}/>
              <ChannelIcon size={17}/>{channelNames[channel]}</label>;
          })}</fieldset>
          {error&&<ErrorNotice message={error}/>}
          <button className="button primary" disabled={pending||!channels.length}><Send size={16}/>{pending?'Procesando…':'Enviar notificación'}</button>
          <small>Se crea una solicitud por cada canal seleccionado.</small>
        </form>
        {sent.length>0&&<div className="sent" role="status"><strong><CheckCircle2 size={18}/>Solicitudes registradas</strong>
          {sent.map(({notification:n,channel})=><div key={n.id}><span>{channelNames[channel]}</span><CopyId value={n.id}/>
            <a href={'#/notifications/'+n.id}>Ver detalle <ArrowUpRight size={14}/></a></div>)}</div>}
      </section>
      <aside>
        <section className="surface emitter-info"><span className={'app-icon '+data.className}><Icon size={24}/></span>
          <h2>{data.role}</h2><p>Emisor HTTP independiente con identidad propia en VetNotify.</p><code>{source}</code>
          <div className="emitter-note"><ShieldCheck size={19}/><span>La sesión de operador autoriza el evento. El emisor firma la solicitud desde el servidor.</span></div>
        </section>
        {user.role==='admin'&&controlsSupported(environment)&&<section className="surface emitter-info">
          <h2><RadioTower size={18}/>Simulador de correo</h2><p>Falla aislada a los próximos envíos de este formulario. El perfil vence en cinco minutos.</p>
          <label>Modo de prueba<select aria-label="Modo de prueba" value={requested} onChange={e=>setRequested(e.target.value)}>
            {modes.map(([value,title])=><option key={value} value={value}>{title}</option>)}</select></label>
          <div className="control-actions"><button className="button" disabled={pending} onClick={()=>void activate(requested)}>Aplicar modo</button>
            {mode!=='healthy'&&<button className="button small" disabled={pending} onClick={()=>void activate('healthy')}>Restaurar sano</button>}</div>
          <small role="status">Último ajuste: {modes.find(([value])=>value===mode)?.[1]}</small>
        </section>}
      </aside>
    </div>
  </>;
}

export function Applications() {
  const apps=useResource<{id:string;name:string;enabled:boolean}[]>('/applications');
  return <><Header eyebrow="INTEGRACIONES" title="Aplicaciones cliente" subtitle="Identidades registradas y permisos de emisión por aplicación." actions={<ContractLink/>}/>
    {apps.error&&<ErrorNotice message={apps.error} retry={apps.refresh}/>}
    {!apps.data&&!apps.error&&<Loading/>}
    <div className="app-grid">{apps.data?.map(app=><article className="surface app-card" key={app.id}><AppMark app={app.id}/>
      <h2>{app.name}</h2><code>{app.id}</code><div className="app-card-footer"><span className={'connection '+(app.enabled?'on':'off')}>
        <span/>{app.enabled?'Habilitada':'Deshabilitada'}</span>
        {app.enabled&&<a className="button small" href={app.id==='agenda-veterinaria'?'#/agenda':'#/laboratorio'}>Abrir emisor<ArrowUpRight size={15}/></a>}</div>
    </article>)}</div></>;
}
