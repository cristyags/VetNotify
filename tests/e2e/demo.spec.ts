import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const captures=process.env.EVIDENCE_DIR ?? 'docs/evidence/ui-local';
async function screen(page:Page,name:string) {
  await mkdir(captures,{recursive:true});
  await page.screenshot({path:join(captures,name+'.png'),animations:'disabled'});
}
async function login(page:Page,user:string,key:string){
  const password=process.env[key];
  if(!password)throw new Error('Falta '+key);
  await page.getByLabel('Usuario').fill(user);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button',{name:'Entrar a VetNotify'}).click();
}

async function emit(page:Page,app:string) {
  const response=page.waitForResponse(r=>r.url().endsWith('/demo/'+app+'/events')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Enviar notificación'}).click();
  const result=await response;
  expect(result.status()).toBe(200);
  const data=await result.json() as {application:string;notifications:{id:string}[]};
  expect(data.application).toBe(app);
  await expect(page.getByText('Solicitudes registradas',{exact:true})).toBeVisible();
  return data.notifications.map(n=>n.id);
}
async function state(page:Page,id:string) {
  const result=await page.request.get('/api/v1/notifications/'+id);
  if(!result.ok())return '';
  return (await result.json()).state;
}

test('demostración visual real con dos emisores, fallos y bandeja aislada a 360 px',async({page,browser})=>{
  const version=await page.request.get('/api/v1/version');
  await expect(version).toBeOK();
  expect((await version.json()).environment).toMatch(/^(local|test|dev)$/);
  const consoleErrors:string[]=[];
  const failedRequests:string[]=[];
  page.on('pageerror',error=>consoleErrors.push(error.message));
  page.on('console',message=>{
    if(message.type()==='error'&&!/status of 401/.test(message.text()))consoleErrors.push(message.text());
  });
  page.on('response',response=>{
    if(response.status()>=400&&!/\/api\/v1\/auth\/me$/.test(response.url()))failedRequests.push(response.status()+' '+new URL(response.url()).pathname);
  });
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Iniciar sesión'})).toBeVisible();
  await screen(page,'01-acceso');
  await login(page,'operador','OPERATOR_PASSWORD');
  await expect(page.getByRole('heading',{name:'Resumen operativo'})).toBeVisible();
  const agenda='agenda-veterinaria';
  const lab='laboratorio-veterinario';
  await page.getByRole('link',{name:'Agenda',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Agenda Veterinaria'})).toBeVisible();
  const [email,inbox]=await emit(page,agenda);
  await expect.poll(()=>state(page,email)).toBe('delivered');
  await expect.poll(()=>state(page,inbox)).toBe('delivered');
  await screen(page,'02-agenda');
  await page.getByRole('link',{name:'Laboratorio',exact:true}).click();
  await page.getByLabel('Evento',{exact:true}).selectOption('resultado-disponible');
  await page.getByLabel('Destinatario',{exact:true}).selectOption('max');
  const labIds=await emit(page,lab);
  expect(labIds).toHaveLength(2);
  await expect.poll(()=>state(page,labIds[0])).toBe('delivered');
  await screen(page,'03-laboratorio');

  await page.getByRole('link',{name:'Notificaciones',exact:true}).click();
  await page.getByLabel('Buscar notificaciones').fill(email.slice(0,8));
  await page.getByLabel('Estado',{exact:true}).selectOption('delivered');
  await expect(page.getByRole('link',{name:'Cita confirmada · Luna',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Cita confirmada · Luna',exact:true}).click();
  await expect(page.getByText('Recibo del simulador guardado')).toBeVisible();
  await screen(page,'04-detalle-entrega');
  await page.getByRole('link',{name:'Centro de notificaciones',exact:true}).click();
  await expect(page.getByLabel('Buscar notificaciones')).toHaveValue(email.slice(0,8));

  await page.getByRole('link',{name:'Agenda',exact:true}).click();
  await page.getByLabel('Modo de prueba').selectOption('always_503');
  await page.getByRole('button',{name:'Aplicar modo'}).click();
  await expect(page.getByText('Último ajuste: 503 sostenido')).toBeVisible();
  const [bad,stillGood]=await emit(page,agenda);
  await expect.poll(()=>state(page,stillGood)).toBe('delivered');
  await expect.poll(()=>state(page,bad),{timeout:22000}).toBe('failed');
  const attempts=(await (await page.request.get('/api/v1/notifications/'+bad+'/attempts')).json()) as {code:string}[];
  expect(attempts.map(a=>a.code)).toEqual(Array(3).fill('provider_http_503'));
  await page.getByRole('button',{name:'Restaurar sano'}).click();
  await expect(page.getByText('Último ajuste: Sano')).toBeVisible();
  await page.getByRole('link',{name:'Ver detalle'}).first().click();
  await page.getByRole('button',{name:'Reprocesar',exact:true}).click();
  await page.getByRole('textbox',{name:'Motivo'}).fill('Restaurado durante la demo visual');
  await page.getByRole('button',{name:'Crear derivada'}).click();
  await expect(page.getByText('Reprocesamiento creado.',{exact:true})).toBeVisible();
  await screen(page,'05-reproceso');
  await page.getByRole('link',{name:'Ver derivada'}).click();
  const derivedId=page.url().split('/').at(-1)!;
  await expect.poll(()=>state(page,derivedId)).toBe('delivered');
  expect(await state(page,bad)).toBe('failed');

  await page.getByRole('link',{name:'Laboratorio',exact:true}).click();
  await page.getByLabel('Modo de prueba').selectOption('permanent_rejection');
  await page.getByRole('button',{name:'Aplicar modo'}).click();
  await expect(page.getByText('Último ajuste: Rechazo permanente')).toBeVisible();
  await page.getByLabel('Bandeja interna',{exact:true}).uncheck();
  const [permanent]=await emit(page,lab);
  await expect.poll(()=>state(page,permanent)).toBe('failed');
  const failed=await (await page.request.get('/api/v1/notifications/'+permanent+'/attempts')).json();
  expect(failed.map((a:{outcome:string})=>a.outcome)).toEqual(['permanent']);
  await page.getByRole('button',{name:'Restaurar sano'}).click();
  await expect(page.getByText('Último ajuste: Sano')).toBeVisible();

  await page.getByRole('link',{name:'Resumen',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Actividad reciente'})).toBeVisible();
  await expect(page.locator('tbody tr').first()).toBeVisible();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await screen(page,'06-resumen');
  await page.getByRole('link',{name:'Notificaciones',exact:true}).click();
  await page.getByRole('button',{name:'Limpiar'}).click();
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await screen(page,'07-centro');

  const mobile=await browser.newContext({viewport:{width:360,height:800},deviceScaleFactor:1,
    baseURL:page.url().split('#')[0],hasTouch:true,isMobile:true});
  try{
    const m=await mobile.newPage();
    await m.goto('/');
    await login(m,'sofia','SOFIA_PASSWORD');
    await expect(m.getByRole('heading',{name:'Bandeja de notificaciones'})).toBeVisible();
    await expect(m.getByRole('link',{name:'Notificaciones',exact:true})).toHaveCount(0);
    await m.goto('/#/inbox/'+inbox);
    await expect(m.getByRole('heading',{name:'Cita confirmada · Luna'})).toBeVisible();
    await m.getByRole('button',{name:'Marcar como leída'}).click();
    await expect(m.getByText('Leída',{exact:true})).toBeVisible();
    expect(await m.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    expect((await new AxeBuilder({page:m}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    await screen(m,'08-bandeja-360');
    expect((await m.request.get('/api/v1/me/inbox/'+labIds[1])).status()).toBe(404);
  }finally{await mobile.close();}
  await page.getByRole('button',{name:'Cerrar sesión'}).click();
  await expect(page.getByRole('heading',{name:'Iniciar sesión'})).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
