// Prueba de humo del Centro de Operaciones (15-11-2026).
// Abre el sistema con una sesión de superadmin simulada y la base reemplazada por respuestas
// vacías (no toca datos reales ni necesita claves), recorre todas las secciones del menú y
// falla si alguna pantalla se cae, si aparece un error de JavaScript o si un módulo no carga.
// También abre la app del mensajero y el portal de clientes con sesiones simuladas.
// Uso: node tests/smoke.js   (requiere: npm i playwright react@18.2.0 react-dom@18.2.0 @supabase/supabase-js@2 xlsx@0.18.5)
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.join(__dirname,'..');
function nm(p){for(const base of [path.join(ROOT,'node_modules'),path.join(process.cwd(),'node_modules'),process.env.NODE_MODULES||'']){const f=path.join(base,p);if(base&&fs.existsSync(f))return f;}return null;}
const LIBS=[
  [/react\/18\.2\.0\/umd\/react\.production/,'react/umd/react.production.min.js'],
  [/react-dom\/18\.2\.0\/umd\/react-dom\.production/,'react-dom/umd/react-dom.production.min.js'],
  [/@supabase\/supabase-js@2/,'@supabase/supabase-js/dist/umd/supabase.js'],
  [/xlsx\/0\.18\.5\/xlsx\.full/,'xlsx/dist/xlsx.full.min.js'],
  [/three-0\.149/,null]
];
const TIPOS={'.html':'text/html','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.css':'text/css'};
function servidor(){return new Promise(res=>{const s=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':TIPOS[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
  s.listen(0,()=>res(s));});}
const USUARIOS={
  superadmin:{u:{nombre:'Prueba Superadmin',email:'prueba.superadmin@test.local',rol:'superadmin',activo:true},p:{nombre:'Prueba Superadmin',rol:'superadmin',esAdmin:true,esSuperAdmin:true,verTodo:true,mensajerosIds:[]}},
  mensajero:{u:{nombre:'PRUEBA MENSAJERO',email:'prueba.rider@test.local',rol:'mensajero',activo:true,mensajero_id:1},p:{nombre:'PRUEBA MENSAJERO',rol:'mensajero',esAdmin:false,esSuperAdmin:false,verTodo:false,mensajerosIds:[1]}},
  cliente:{u:{nombre:'PRUEBA CLIENTE',email:'prueba.cliente@test.local',rol:'cliente',activo:true,cliente_nombre:'PRUEBA CLIENTE'},p:{nombre:'PRUEBA CLIENTE',rol:'cliente',esAdmin:false,esSuperAdmin:false,verTodo:false,mensajerosIds:[]}}
};
async function preparar(ctx,quien){
  const U=USUARIOS[quien];
  await ctx.route('**/*',async route=>{
    const req=route.request(),url=req.url();
    for(const [re,f] of LIBS){if(re.test(url)){const file=f&&nm(f);if(file)return route.fulfill({path:file,contentType:'application/javascript'});if(!f)return route.continue();}}
    if(url.startsWith('http://127.0.0.1'))return route.continue();
    if(/supabase\.co\/rest\/v1\//.test(url)){
      const acc=(req.headers()['accept']||'');const una=acc.includes('vnd.pgrst.object');
      let body=una?{}:[];if(/usuarios_publico/.test(url))body=una?U.u:[U.u];
      if(/\/rpc\//.test(url))body=una?{}:[];
      return route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'0-0/0','access-control-allow-origin':'*','access-control-expose-headers':'content-range'},body:JSON.stringify(body)});
    }
    if(/supabase\.co\/auth\/v1\//.test(url))return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({})});
    if(/supabase\.co\/(storage|functions)\//.test(url))return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{}'});
    return route.abort();
  });
  await ctx.addInitScript(([u,p])=>{try{localStorage.setItem('transpgso_v2_session_usuario',JSON.stringify(u));localStorage.setItem('transpgso_v2_session_perfil',JSON.stringify(p));}catch(e){}
    window.alert=function(){};window.confirm=function(){return false;};window.prompt=function(){return null;};},[U.u,U.p]);
}
const IGNORAR=/google|maps|ResizeObserver|Failed to load resource|net::ERR|WebSocket|realtime|Script error|supabase\.co|Service ?Worker|serviceWorker|Notification|AbortError/i;
(async()=>{
  const srv=await servidor();const base='http://127.0.0.1:'+srv.address().port+'/';
  const browser=await chromium.launch();const fallas=[];
  async function pagina(quien){const ctx=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});await preparar(ctx,quien);const pg=await ctx.newPage();
    const errs=[];pg.on('pageerror',e=>{if(IGNORAR.test(e.message)||/supabase-js/.test(e.stack||''))return;const l=(e.stack||'').split('\n')[1]||'';if(errs.indexOf(e.message)<0)errs.push(e.message+(l?' ('+l.trim().slice(0,120)+')':''));});
    pg.on('console',m=>{if(m.type()==='error'&&!IGNORAR.test(m.text())&&!/Maximum call stack/.test(m.text()))errs.push('consola: '+m.text().slice(0,300));});
    await pg.goto(base,{waitUntil:'domcontentloaded'});await pg.waitForTimeout(2500);return {ctx,pg,errs};}
  async function caida(pg){return await pg.evaluate(()=>document.body.innerText.indexOf('Algo falló en esta pantalla')>=0);}
  function revisar(nombre,errs,cayo){if(cayo)fallas.push(nombre+': la pantalla se cayó');[...new Set(errs.splice(0))].forEach(e=>fallas.push(nombre+': '+e));}

  // 1) Pantalla de acceso
  {const ctx=await browser.newContext({serviceWorkers:'block'});await preparar(ctx,'superadmin');await ctx.clearCookies();const pg=await ctx.newPage();
   await ctx.addInitScript(()=>{try{localStorage.clear();}catch(e){}});const errs=[];pg.on('pageerror',e=>{if(!IGNORAR.test(e.message)&&!/supabase-js/.test(e.stack||''))errs.push(e.message);});
   await pg.goto(base);await pg.waitForTimeout(2500);const ok=await pg.evaluate(()=>/INICIAR SESI/i.test(document.body.innerText));if(!ok)fallas.push('Acceso: no aparece la pantalla de inicio de sesión');revisar('Acceso',errs,false);await ctx.close();console.log('ok  acceso');}

  // 2) Panel superadmin: todas las secciones
  {const {ctx,pg,errs}=await pagina('superadmin');revisar('Panel (inicio)',errs,await caida(pg));
   const tops=await pg.$$eval('.nav-btn',bs=>bs.map((b,i)=>({i,t:b.textContent.trim(),dd:b.classList.contains('nav-dropdown-toggle')})));
   if(tops.length<4)fallas.push('Panel: el menú no cargó ('+tops.length+' botones)');
   for(const t of tops){
     if(!t.dd){await pg.locator('.nav-btn').nth(t.i).click();await pg.waitForTimeout(1500);revisar('Sección '+t.t,errs,await caida(pg));console.log('ok  '+t.t);continue;}
     await pg.locator('.nav-btn').nth(t.i).click();await pg.waitForTimeout(200);
     const items=await pg.$$eval('.nav-dropdown-menu .nav-dropdown-item',bs=>bs.map(b=>b.textContent.trim()));
     await pg.locator('.nav-btn').nth(t.i).click();
     for(let k=0;k<items.length;k++){
       await pg.locator('.nav-btn').nth(t.i).click();await pg.waitForTimeout(150);
       await pg.locator('.nav-dropdown-menu .nav-dropdown-item').nth(k).click();await pg.waitForTimeout(1800);
       const cayo=await caida(pg);revisar(t.t+' → '+items[k],errs,cayo);console.log((cayo?'MAL ':'ok  ')+t.t+' → '+items[k]);
       if(cayo){await pg.reload();await pg.waitForTimeout(2500);}
     }
   }
   // todos los módulos cargan sin error
   const mods=fs.readdirSync(path.join(ROOT,'modules')).filter(f=>f.endsWith('.js'));
   for(const m of mods){const e=await pg.evaluate(src=>new Promise(res=>{const s=document.createElement('script');s.src=src;s.onload=()=>res(null);s.onerror=()=>res('no carga');document.head.appendChild(s);}),'modules/'+m+'?smoke='+Date.now());
     await pg.waitForTimeout(100);if(e)fallas.push('Módulo '+m+': '+e);revisar('Módulo '+m,errs,false);}
   console.log('ok  '+mods.length+' módulos');await ctx.close();}

  // 3) App del mensajero y 4) Portal de clientes
  for(const quien of ['mensajero','cliente']){const {ctx,pg,errs}=await pagina(quien);await pg.waitForTimeout(1500);
    const txt=await pg.evaluate(()=>document.body.innerText.length);if(txt<40)fallas.push((quien==='mensajero'?'App mensajero':'Portal cliente')+': pantalla vacía');
    revisar(quien==='mensajero'?'App mensajero':'Portal cliente',errs,await caida(pg));console.log('ok  '+(quien==='mensajero'?'app mensajero':'portal cliente'));await ctx.close();}

  await browser.close();srv.close();
  if(fallas.length){console.log('\nFALLAS ('+fallas.length+'):\n- '+fallas.join('\n- '));process.exit(1);}
  console.log('\nPrueba de humo OK');
})().catch(e=>{console.error(e);process.exit(1);});
