import { useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, BellRing, CheckCheck, CircleAlert, Clock3, Filter, ListFilter,
  Radio, RefreshCcw, Search, Send, TimerReset } from 'lucide-react';
import { AppMark, ChannelTag, CopyId, Empty, ErrorNotice, Header, Loading, Paging, Status } from './ui';
import { appNames, labels, number, percent, stamp, useResource, type Channel, type Cohort, type Page, type State, type Stats, type Summary } from './data';

export interface Filters { q:string; app:string; channel:string; state:string; kind:string; offset:number }
export const initialFilters:Filters={ q:'',app:'',channel:'',state:'',kind:'',offset:0 };

export function NotificationTable({items}:{items:Summary[]}) {
  return <div className="table-scroll" tabIndex={0} aria-label="Tabla desplazable de notificaciones" role="region">
    <table><thead><tr><th scope="col">Notificación</th><th scope="col">Origen</th><th scope="col">Canal</th>
      <th scope="col">Destinatario</th><th scope="col">Estado</th><th scope="col">Intentos</th>
      <th scope="col">Aceptación UTC</th><th scope="col">Último cambio UTC</th><th scope="col"><span className="sr-only">Detalle</span></th>
    </tr></thead><tbody>{items.map(n=><tr key={n.id}>
      <td className="subject-cell"><a href={'#/notifications/'+n.id}>{n.subject}</a><CopyId value={n.id}/></td>
      <td><AppMark app={n.application_id} compact/></td><td><ChannelTag channel={n.channel}/></td>
      <td><span>{n.recipient_name}</span><small>{n.pet_name}</small></td><td><Status state={n.state}/></td>
      <td className="tabular">{n.attempt_count}<span className="muted">/{n.max_attempts}</span></td>
      <td className="date-cell">{stamp(n.accepted_at)}</td><td className="date-cell">{stamp(n.updated_at)}</td>
      <td><a className="icon-button" href={'#/notifications/'+n.id} aria-label={'Abrir '+n.subject}><ArrowUpRight size={16}/></a></td>
    </tr>)}</tbody></table></div>;
}

export function Notifications({filters,set}:{filters:Filters;set:(value:Filters)=>void}) {
  const params=new URLSearchParams({limit:'15',offset:String(filters.offset)});
  for(const k of ['q','app','channel','state','kind'] as const) if(filters[k].trim()) params.set(k,filters[k].trim());
  const {data,error,refresh}=useResource<Page<Summary>>('/notifications?'+params.toString());
  function change(key:keyof Filters,value:string){set({...filters,[key]:value,offset:0});}
  return <>
    <Header eyebrow="REGISTRO DE ENTREGAS" title="Centro de notificaciones"
      subtitle="Explora cada solicitud desde su aceptación hasta el resultado de entrega."
      actions={<a className="button primary" href="#/agenda"><Send size={16}/>Generar evento</a>}/>
    <section className="surface">
      <div className="section-head"><div><h2><ListFilter size={19}/>Historial de notificaciones</h2>
        <p>Ordenado por aceptación más reciente.</p></div><button className="button small" onClick={refresh}><RefreshCcw size={15}/>Actualizar</button></div>
      <div className="filters">
        <label className="search"><Search size={17}/><span className="sr-only">Buscar notificaciones</span>
          <input placeholder="Buscar asunto, ID o destinatario" value={filters.q} onChange={e=>change('q',e.target.value)}/></label>
        <label><span>Aplicación</span><select aria-label="Aplicación" value={filters.app} onChange={e=>change('app',e.target.value)}><option value="">Todas</option>
          {Object.entries(appNames).slice(0,2).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <label><span>Canal</span><select aria-label="Canal" value={filters.channel} onChange={e=>change('channel',e.target.value)}><option value="">Todos</option>
          <option value="email">Correo de prueba</option><option value="internal">Bandeja interna</option></select></label>
        <label><span>Estado</span><select aria-label="Estado" value={filters.state} onChange={e=>change('state',e.target.value)}><option value="">Todos</option>
          {Object.entries(labels).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <label><span>Creación</span><select aria-label="Creación" value={filters.kind} onChange={e=>change('kind',e.target.value)}><option value="">Todas</option>
          <option value="initial">Original</option><option value="manual_reprocess">Reproceso manual</option></select></label>
        <button className="button small" onClick={()=>set(initialFilters)}><Filter size={14}/>Limpiar</button>
      </div>
      {error&&<ErrorNotice message={error} retry={refresh}/>}
      {!data&&!error&&<Loading/>}
      {data&&(data.items.length?<NotificationTable items={data.items}/>:<Empty title="Sin coincidencias" message="Ajusta los filtros o genera un nuevo evento."/>)}
      {data&&<Paging {...data} onPage={offset=>set({...filters,offset})}/>}
    </section>
  </>;
}

const metrics=[
  {label:'Registradas',icon:BellRing,className:'teal',description:'Solicitudes aceptadas por el servidor'},
  {label:'Entregadas',icon:CheckCheck,className:'green',description:'Aceptadas por correo o guardadas en bandeja'},
  {label:'En espera',icon:Clock3,className:'blue',description:'Pendientes y en proceso'},
  {label:'Fallidas',icon:CircleAlert,className:'red',description:'Con un resultado final fallido'},
] as const;
export function Overview() {
  const [windowHours,setWindow]=useState(24);
  const [startTime,setStart]=useState(()=>new Date(Date.now()-24*3600_000).toISOString());
  const [application,setApp]=useState('');
  const [channel,setChannel]=useState('');
  const query=new URLSearchParams({kind:'initial'});
  if(windowHours) query.set('from',startTime);
  if(application) query.set('app',application);
  if(channel) query.set('channel',channel);
  const stats=useResource<Stats>('/stats?'+query.toString());
  const recent=useResource<Page<Summary>>('/notifications?limit=6&'+query.toString());
  const cohorts=useResource<Cohort[]>('/stats/cohorts');
  const groups=stats.data?.groups??[];
  const tally=(state:State)=>groups.filter(g=>g.state===state).reduce((s,g)=>s+g.count,0);
  const total=stats.data?.total;
  const delivered=tally('delivered');
  const failed=tally('failed');
  const values=[total,delivered,tally('pending')+tally('processing'),failed];
  const terminal=delivered+failed;
  const mean=delivered ? groups.reduce((s,g)=>s+g.count*(g.average_delivery_seconds??0),0)/delivered : null;
  function setHours(hours:number) {setWindow(hours);setStart(new Date(Date.now()-hours*3600_000).toISOString());}
  return <>
    <Header eyebrow="OPERACIÓN VETERINARIA" title="Resumen operativo"
      subtitle="Seguimiento de los avisos de Agenda y Laboratorio en un solo lugar."
      actions={<a className="button primary" href="#/agenda"><Send size={17}/>Generar evento</a>}/>
    <div className="window-bar"><div className="window-label"><Radio size={17}/><strong>Actividad inicial</strong>
      <span className="desktop-only">Reprocesos en su historial</span></div>
      <label><span className="sr-only">Ventana</span><select value={windowHours} onChange={e=>setHours(Number(e.target.value))}>
        <option value={1}>Última hora</option><option value={24}>Últimas 24 horas</option><option value={168}>Últimos 7 días</option><option value={0}>Todo el historial</option>
      </select></label>
      <label><span className="sr-only">Aplicación</span><select value={application} onChange={e=>setApp(e.target.value)}><option value="">Todas las aplicaciones</option>
        {Object.entries(appNames).slice(0,2).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label>
      <label><span className="sr-only">Canal</span><select value={channel} onChange={e=>setChannel(e.target.value)}><option value="">Todos los canales</option>
        <option value="email">Correo de prueba</option><option value="internal">Bandeja interna</option></select></label>
    </div>
    {stats.error&&<ErrorNotice message={stats.error} retry={stats.refresh}/>}
    <div className="kpi-grid">{metrics.map(({label,icon:Icon,className,description},index)=><article className="kpi" key={label}>
      <div><span className={'kpi-icon '+className}><Icon size={20}/></span><span>{label}</span></div>
      <strong>{stats.data?number(values[index]??0):'—'}</strong><small>{description}</small>
    </article>)}</div>
    <div className="summary-grid">
      <section className="surface service-panel"><div className="section-head"><div><h2><Activity size={18}/>Resultados por canal</h2><p>Estados de las solicitudes de la ventana elegida.</p></div></div>
        {(['email','internal'] as Channel[]).map(c=>{
          const items=groups.filter(g=>g.channel===c);
          const count=items.reduce((n,g)=>n+g.count,0);
          const good=items.find(g=>g.state==='delivered')?.count??0;
          return <div className="channel-row" key={c}><ChannelTag channel={c}/><strong>{stats.data?number(count):'—'}</strong>
            <progress value={count?good/count:0} max={1} aria-label={'Fracción entregada de '+c}/>
            <small>{count?percent(good/count)+' entregadas':'Sin solicitudes'}</small></div>;
        })}
        <div className="latency-line"><TimerReset size={17}/><div><strong>{mean===null?'—':number(mean)+' s'}</strong><span>Latencia media de las entregadas</span></div>
          <div><strong>{terminal?percent(delivered/terminal):'—'}</strong><span>Entregas sobre resultados finales</span></div></div>
      </section>
      <section className="surface service-panel"><div className="section-head"><div><h2><ArrowDownRight size={18}/>Objetivos de entrega</h2><p>Cohorte madura global de 15 min.</p></div></div>
        {cohorts.error&&<ErrorNotice message={cohorts.error} retry={cohorts.refresh}/>}
        {cohorts.data?.filter(c=>!c.group_channel&&!c.application_id).map(c=><div className="objective" key={c.sli}>
          <div><strong>{c.sli==='initial_30s'?'Entrega inicial en 30 s':'Bandeja interna en 5 s'}</strong>
            <small>Meta {percent(c.target)} · {number(c.population)} evaluables · {c.error_budget} fallos permitidos</small></div>
          <span className={c.ratio!==null&&c.ratio<c.target?'below':''}>{c.ratio===null?'Sin datos':percent(c.ratio)}</span>
        </div>)}
        {!cohorts.data&&!cohorts.error&&<Loading/>}
        <div className="panel-foot">Actualizado {stats.data?stamp(stats.data.asOf)+' UTC':'—'}</div>
      </section>
    </div>
    <section className="surface">
      <div className="section-head"><div><h2>Actividad reciente</h2><p>Abre un registro para ver sus intentos y su línea de tiempo.</p></div>
        <a className="button small" href="#/notifications">Ver historial<ArrowUpRight size={15}/></a></div>
      {recent.error&&<ErrorNotice message={recent.error} retry={recent.refresh}/>}
      {!recent.data&&!recent.error&&<Loading/>}
      {recent.data&&(recent.data.items.length?<NotificationTable items={recent.data.items}/>:<Empty title="Todavía no hay actividad" message="Genera un evento desde Agenda o Laboratorio."/>)}
    </section>
  </>;
}
