import { useEffect, useState } from 'react';

export const labels = {
  accepted: 'Aceptada', pending: 'Pendiente', processing: 'En proceso', delivered: 'Entregada', failed: 'Fallida',
} as const;
export type State = keyof typeof labels;
export type Channel = 'email' | 'internal';
export const channelNames: Record<Channel, string> = { email: 'Correo de prueba', internal: 'Bandeja interna' };
export const appNames: Record<string,string> = {
  'agenda-veterinaria': 'Agenda Veterinaria', 'laboratorio-veterinario': 'Laboratorio Veterinario',
  'emisor-inactivo': 'Emisor de control',
};
export interface Human { id: string; name: string; role: 'recipient'|'operator'|'admin'; recipientId: string|null; csrfToken: string }
export interface Summary {
  id: string; application_id: string; channel: Channel; recipient_id: string; recipient_name: string; pet_name: string;
  subject: string; state: State; creation_kind: string; accepted_at: string; updated_at: string; delivered_at: string|null;
  correlation_id: string; parent_notification_id: string|null; root_notification_id: string; attempt_count: number;
  max_attempts: number; next_attempt_at: string|null;
}
export interface Detail extends Summary {
  body: string; recipient_email: string|null; trace_id: string|null; run_id: string|null; metadata: Record<string,string>;
  chain: { id:string; state:State; parent_notification_id:string|null }[];
  reprocess: {actor:string;reason:string;at:string}|null;
}
export interface Attempt { id:string; number:number; started_at:string; finished_at:string|null; duration_ms:number|null;
  outcome:string; code:string|null; receipt_id:string|null; trace_id:string|null; span_id:string|null }
export interface Transition { from_state:State|null; to_state:State; at:string; reason:string; actor:string }
export interface InboxItem { id:string; application_id:string; subject:string; body:string; available_at:string; read_at:string|null }
export interface Page<T> { items:T[]; total:number; limit:number; offset:number }
export interface Stats { total:number; asOf:string; groups:{ channel:Channel; state:State; creation_kind:string;
  count:number; rate:number|null; average_delivery_seconds:number|null }[] }
export interface Cohort { sli:string; population:number; good:number; bad:number; ratio:number|null; target:number; error_budget:number;
  group_channel:Channel|null; application_id:string|null }
export interface Accepted { id:string; state:State; replay:boolean; parentId:string|null; rootId:string }
export class ApiError extends Error {
  constructor(readonly status:number, message:string) { super(message); }
}

export async function call<T>(path:string, config:{ method?:string; body?:unknown; user?:Human; key?:string; signal?:AbortSignal } = {}) {
  const { method = 'GET', body, user, key, signal } = config;
  const headers = new Headers();
  if (body !== undefined) headers.set('content-type','application/json');
  if (user) headers.set('x-csrf-token',user.csrfToken);
  if (key) headers.set('idempotency-key',key);
  const response = await fetch('/api/v1'+path,{
    method,headers,body:body === undefined ? undefined : JSON.stringify(body),credentials:'same-origin',
    redirect:'error',signal: signal ?? AbortSignal.timeout(12000),
  });
  const data = response.status === 204 ? null : await response.json().catch(()=>null);
  if(!response.ok) throw new ApiError(response.status,data?.message ?? 'VetNotify no pudo completar la solicitud. Reintenta.');
  return data as T;
}

export function useResource<T>(path:string, everyMs=5000) {
  const [snapshot,set] = useState<{ path:string; data?:T; error?:string }>({path});
  const [revision,refresh] = useState(0);
  useEffect(()=>{
    let active=true;
    let timer:number|undefined;
    let controller:AbortController|undefined;
    async function load() {
      controller = new AbortController();
      try {
        const data=await call<T>(path,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])});
        if(active) set({path,data});
      } catch(error) {
        if(active) set(current=>({path,data:current.path===path?current.data:undefined,
          error:error instanceof Error ? error.message : 'No se pudo actualizar.'}));
      } finally {
        if(active && everyMs>0) timer=window.setTimeout(()=>void load(),everyMs);
      }
    }
    void load();
    return ()=>{ active=false; controller?.abort(); window.clearTimeout(timer); };
  },[path,everyMs,revision]);
  return { data:snapshot.path===path?snapshot.data:undefined, error:snapshot.path===path?snapshot.error:undefined,
    refresh:()=>refresh(n=>n+1) };
}

export const number = (n:number) => new Intl.NumberFormat('es-MX',{ maximumFractionDigits:2 }).format(n);
export const percent = (ratio:number) => new Intl.NumberFormat('es-MX',{style:'percent',maximumFractionDigits:1}).format(ratio);
const datetime = new Intl.DateTimeFormat('es-MX',{ day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',
  second:'2-digit',hourCycle:'h23',timeZone:'UTC' });
export const stamp=(value:string|null|undefined)=>value ? datetime.format(new Date(value)) : '—';
