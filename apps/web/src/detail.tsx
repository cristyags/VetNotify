import { useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Braces, CheckCircle2, Clock3, FileText, Fingerprint, GitBranch, History, Inbox,
  MailCheck, RotateCcw } from 'lucide-react';
import { call, channelNames, stamp, useResource, type Accepted, type Attempt, type Detail, type Human, type InboxItem, type Page, type Transition } from './data';
import { AppMark, CopyId, Empty, ErrorNotice, Header, Loading, Paging, Status } from './ui';

const outcome:Record<string,string>={processing:'En proceso',delivered:'Aceptado',transient:'Error transitorio',permanent:'Error permanente',uncertain:'Resultado incierto'};
const reasons:Record<string,string>={durable_acceptance:'Solicitud guardada de forma durable',job_queued:'Trabajo registrado en cola',
  attempt_claimed:'Intento reclamado por un worker',retry_scheduled:'Reintento programado',provider_accepted:'Recibo del simulador guardado',
  inbox_persisted:'Aviso disponible en la bandeja',provider_recipient_rejected:'Destinatario rechazado por el simulador',
  manual_reprocess_accepted:'Reproceso explícito guardado',lease_recovered:'Trabajo recuperado tras vencer el lease',
  lease_exhausted:'Se agotó el límite de intentos tras vencer el lease'};

export function NotificationDetail({id,user}:{id:string;user:Human}) {
  const n=useResource<Detail>('/notifications/'+id);
  const a=useResource<Attempt[]>('/notifications/'+id+'/attempts');
  const t=useResource<Transition[]>('/notifications/'+id+'/transitions');
  const dialog=useRef<HTMLDialogElement>(null);
  const key=useRef('');
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [derived,setDerived]=useState<Accepted>();
  const detail=n.data;
  async function reprocess() {
    if(busy) return;
    setError('');setBusy(true);
    if(!key.current) key.current=crypto.randomUUID();
    try {
      const result=await call<Accepted>('/notifications/'+id+'/reprocess',{method:'POST',body:{reason},user,key:key.current});
      setDerived(result);dialog.current?.close();n.refresh();
    } catch(error) {setError((error as Error).message);}
    finally {setBusy(false);}
  }
  return <>
    <a className="back" href="#/notifications"><ArrowLeft size={16}/>Centro de notificaciones</a>
    {n.error&&<ErrorNotice message={n.error} retry={n.refresh}/>}
    {!detail&&!n.error&&<Loading/>}
    {detail&&<>
      <Header eyebrow="DETALLE DE ENTREGA" title={detail.subject}
        subtitle={channelNames[detail.channel]+' · '+detail.recipient_name+' / '+detail.pet_name}
        actions={<div className="action-cluster"><Status state={detail.state}/>{detail.state==='failed'&&detail.chain.at(-1)?.id===id&&!derived&&
          <button className="button primary" onClick={()=>dialog.current?.showModal()}><RotateCcw size={16}/>Reprocesar</button>}</div>}/>
      {derived&&<div className="success-banner" role="status"><CheckCircle2 size={18}/><span>Reprocesamiento creado.</span>
        <a href={'#/notifications/'+derived.id}>Ver derivada <ArrowUpRight size={15}/></a></div>}
      <div className="detail-grid">
        <section className="surface detail-box"><div className="section-head"><div><h2><FileText size={18}/>Mensaje</h2>
          <p>Contenido efectivo guardado al aceptar.</p></div><AppMark app={detail.application_id}/></div>
          <p className="message">{detail.body}</p>
          <dl className="meta"><div><dt>Notificación</dt><dd><CopyId value={detail.id} full/></dd></div>
            <div><dt>Correlación</dt><dd><CopyId value={detail.correlation_id} full/></dd></div>
            <div><dt>Destino</dt><dd>{detail.recipient_email??detail.recipient_id}</dd></div>
            <div><dt>Trace ID</dt><dd>{detail.trace_id?<CopyId value={detail.trace_id} full/>:'—'}</dd></div>
            <div><dt>Aceptación UTC</dt><dd>{stamp(detail.accepted_at)}</dd></div>
            <div><dt>Próximo intento UTC</dt><dd>{stamp(detail.next_attempt_at)}</dd></div>
            <div><dt>Entrega UTC</dt><dd>{stamp(detail.delivered_at)}</dd></div>
            {detail.metadata.event&&<div><dt>Evento</dt><dd>{detail.metadata.event}</dd></div>}</dl>
        </section>
        <section className="surface detail-box"><div className="section-head"><div><h2><History size={18}/>Línea de tiempo</h2>
          <p>Aceptación, trabajo y resultado en orden.</p></div></div>
          {t.error&&<ErrorNotice message={t.error} retry={t.refresh}/>}
          {!t.data&&!t.error&&<Loading/>}
          <ol className="timeline">{t.data?.map((entry,index)=><li key={entry.at+index}><span className="timeline-dot"/>
            <div><Status state={entry.to_state}/><strong>{reasons[entry.reason]??entry.reason}</strong>
              <small>{stamp(entry.at)} UTC · {entry.actor}</small></div></li>)}</ol>
        </section>
      </div>
      <section className="surface detail-box"><div className="section-head"><div><h2><Fingerprint size={18}/>Intentos de entrega</h2>
        <p>{detail.attempt_count} de {detail.max_attempts} para este ID. Un reproceso crea otro registro.</p></div></div>
        {a.error&&<ErrorNotice message={a.error} retry={a.refresh}/>}
        {!a.data&&!a.error&&<Loading/>}
        {a.data?.length===0&&<Empty title="Aún sin intentos" message="El worker reclamará el trabajo cuando esté disponible."/>}
        <div className="attempt-list">{a.data?.map(attempt=><article key={attempt.id}>
          <span className="number-chip">{attempt.number}</span>
          <div><strong>{outcome[attempt.outcome]??attempt.outcome}</strong><small>{attempt.code??'Resultado pendiente'}</small></div>
          <div><Clock3 size={15}/>{stamp(attempt.started_at)} UTC</div>
          <div>{attempt.duration_ms===null?'—':attempt.duration_ms+' ms'}</div>
          {attempt.receipt_id&&<div><MailCheck size={17}/><CopyId value={attempt.receipt_id}/><span>Recibo</span></div>}
        </article>)}</div>
      </section>
      <section className="surface detail-box"><div className="section-head"><div><h2><GitBranch size={18}/>Cadena de reprocesos</h2>
        <p>{detail.reprocess?`Solicitado por ${detail.reprocess.actor} · ${detail.reprocess.reason}`:'La notificación inicial conserva su estado e intentos.'}</p>
        </div></div><div className="chain">{detail.chain.map((item,i)=><a key={item.id} href={'#/notifications/'+item.id} aria-current={item.id===id?'page':undefined}>
          <span>{i===0?'Original':'Derivada '+i}</span><code>{item.id.slice(0,8)}</code><Status state={item.state}/><ArrowUpRight size={15}/></a>)}</div>
      </section>
    </>}
    <dialog ref={dialog} aria-labelledby="reprocess-title" onCancel={e=>{if(busy)e.preventDefault();}}>
      <form onSubmit={e=>{e.preventDefault();void reprocess();}}>
        <div className="dialog-icon"><RotateCcw size={22}/></div>
        <h2 id="reprocess-title">Reprocesar notificación</h2><p>Se creará una derivada con su propio historial. Indica por qué corresponde reintentar la entrega.</p>
        <label>Motivo<textarea required maxLength={240} value={reason} onChange={e=>setReason(e.target.value)}/></label>
        {error&&<ErrorNotice message={error}/>}
        <div className="dialog-actions"><button type="button" className="button" disabled={busy} onClick={()=>dialog.current?.close()}>Cancelar</button>
          <button className="button primary" disabled={busy||!reason.trim()}>{busy?'Guardando…':'Crear derivada'}</button></div>
      </form>
    </dialog>
  </>;
}

export function RecipientInbox({id,user}:{id?:string;user:Human}) {
  const [offset,setOffset]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const items=useResource<Page<InboxItem>>('/me/inbox?limit=20&offset='+offset);
  const item=useResource<InboxItem>(id?'/me/inbox/'+id:'/me/inbox',id?5000:0);
  async function read() {
    if(!id||busy)return;
    setBusy(true);setError('');
    try{await call('/me/inbox/'+id+'/read',{method:'PATCH',user});item.refresh();items.refresh();}
    catch(error){setError((error as Error).message);}
    finally{setBusy(false);}
  }
  return <>
    {id&&<a href="#/inbox" className="back"><ArrowLeft size={16}/>Volver a la bandeja</a>}
    <Header eyebrow="MIS AVISOS" title={id&&item.data?.subject?item.data.subject:'Bandeja de notificaciones'}
      subtitle="Consulta los mensajes sobre las citas y servicios de tu mascota."/>
    {id?<section className="surface detail-box">
      {item.error&&<ErrorNotice message={item.error} retry={item.refresh}/>}
      {!item.data&&!item.error&&<Loading/>}
      {item.data&&<><div className="section-head"><AppMark app={item.data.application_id}/><span>{stamp(item.data.available_at)} UTC</span></div>
        <p className="message">{item.data.body}</p>
        {error&&<ErrorNotice message={error}/>}
        <div className="section-head">{item.data.read_at?<span className="channel"><CheckCircle2 size={16}/> Leída</span>:
          <button className="button primary" disabled={busy} onClick={()=>void read()}><CheckCircle2 size={16}/>Marcar como leída</button>}</div></>}
    </section>:<section className="surface"><div className="section-head"><div><h2><Inbox size={18}/>Avisos recibidos</h2><p>Ordenados del más reciente al más antiguo.</p></div></div>
      {items.error&&<ErrorNotice message={items.error} retry={items.refresh}/>}
      {!items.data&&!items.error&&<Loading/>}
      {items.data?.items.length===0&&<Empty title="Tu bandeja está vacía" message="Los avisos nuevos aparecerán aquí."/>}
      <div className="inbox-list">{items.data?.items.map(entry=><a href={'#/inbox/'+entry.id} key={entry.id} className={!entry.read_at?'unread':''}>
        <AppMark app={entry.application_id}/><strong>{entry.subject}</strong><span>{stamp(entry.available_at)} UTC</span>
        <small>{entry.read_at?'Leída':'Nueva'}</small><ArrowUpRight size={16}/></a>)}</div>
      {items.data&&<Paging {...items.data} onPage={setOffset}/>}
    </section>}
  </>;
}

export function ContractLink(){return <a className="button small" href="/api/v1/openapi.json" target="_blank" rel="noreferrer"><Braces size={15}/>OpenAPI<ArrowUpRight size={14}/></a>;}
