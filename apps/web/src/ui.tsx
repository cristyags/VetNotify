import { useState, type ReactNode } from 'react';
import { Activity, AlertCircle, ArrowLeft, ArrowRight, CalendarDays, Check, CircleCheck, Clock3, Copy, FlaskConical,
  Inbox, LoaderCircle, Mail, PawPrint, RotateCcw } from 'lucide-react';
import { labels, channelNames, appNames, number, type Channel, type State } from './data';

export function Brand() {
  return <div className="brand"><span className="brand-mark"><PawPrint size={21}/></span><span>Vet<span>Notify</span></span></div>;
}
export function AppMark({app, compact=false}:{app:string;compact?:boolean}) {
  const Lab=app==='laboratorio-veterinario';
  const Icon=Lab?FlaskConical:CalendarDays;
  return <span className={compact?'origin compact':'origin'}><span className={Lab?'app-icon lab':'app-icon agenda'}><Icon size={16}/></span>
    <span>{appNames[app]??app}</span></span>;
}
export function Status({state}:{state:State}) {
  const Icon=state==='delivered'?CircleCheck:state==='failed'?AlertCircle:state==='processing'?Activity:Clock3;
  return <span className={'status '+state}><Icon size={13} aria-hidden="true"/>{labels[state]}</span>;
}
export function ChannelTag({channel}:{channel:Channel}) {
  const Icon=channel==='email'?Mail:Inbox;
  return <span className="channel"><Icon size={15} aria-hidden="true"/>{channelNames[channel]}</span>;
}
export function CopyId({value,full=false}:{value:string;full?:boolean}) {
  const [copied,setCopied]=useState(false);
  const [error,setError]=useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setError(false); window.setTimeout(()=>setCopied(false),1500); }
    catch { setError(true); }
  }
  return <span className="copy-id"><code title={value}>{full?value:value.slice(0,8)}</code>
    <button className="icon-button copy" type="button" onClick={()=>void copy()} aria-label={'Copiar ID '+value} title="Copiar ID">
      {copied?<Check size={14}/>:<Copy size={14}/>}</button>
    {error&&<span role="status">Selecciona el ID para copiarlo.</span>}</span>;
}
export function Header({eyebrow,title,subtitle,actions}:{eyebrow:string;title:string;subtitle:string;actions?:ReactNode}) {
  return <div className="page-heading"><div><div className="eyebrow"><span/>{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{actions}</div>;
}
export function ErrorNotice({message,retry}:{message:string;retry?:()=>void}) {
  return <div className="error-notice" role="alert"><AlertCircle size={19}/><span>{message}</span>
    {retry&&<button className="button small" onClick={retry}><RotateCcw size={14}/>Reintentar</button>}</div>;
}
export function Loading(){return <div className="empty" role="status"><LoaderCircle className="spin" size={24}/>Cargando datos…</div>;}
export function Empty({title,message}:{title:string;message:string}){
  return <div className="empty"><span className="empty-icon"><Inbox size={24}/></span><strong>{title}</strong><span>{message}</span></div>;
}
export function Paging({total,offset,limit,onPage}:{total:number;offset:number;limit:number;onPage:(value:number)=>void}) {
  return <div className="paging"><span>{total?number(offset+1)+'–'+number(Math.min(total,offset+limit)):'0'} de {number(total)} registros</span>
    <div><button className="button small" onClick={()=>onPage(Math.max(0,offset-limit))} disabled={offset===0}><ArrowLeft size={14}/>Anterior</button>
      <button className="button small" onClick={()=>onPage(offset+limit)} disabled={offset+limit>=total}>Siguiente<ArrowRight size={14}/></button></div></div>;
}
