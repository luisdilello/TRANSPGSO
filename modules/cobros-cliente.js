// Portal del cliente · Cobros (23-11-2026). Transparencia de los envíos "por cobrar" del cliente:
// cuánto se cobró a sus destinatarios, cuánto ya se le pagó (liquidaciones y comprobantes),
// cuánto está por pagar y qué falta entregar. Solo sus envíos: la RPC mis_cobros_cliente toma el
// cliente desde la sesión (usuarios.rol='cliente'); los comprobantes se leen con la política de
// storage "cliente comprobantes-cobro select" (solo rutas de sus liquidaciones y envíos).
// No muestra mensajeros ni lo que deben rendir.
(function(){
var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo;
var A=window.__app||{};var db=A.db;var BUCKET='comprobantes-cobro';
var C={txt:'#2b2e20',sub:'#5f5e4c',dim:'#8a8873',fila:'#fbf8f0',bd:'rgba(43,46,32,.1)',oro:'#A0842A',
  caja:{borderRadius:18,background:'#fff',border:'1px solid rgba(43,46,32,.12)',boxShadow:'0 4px 0 #e3dbc4, 0 10px 24px rgba(20,22,15,.06)',color:'#2b2e20',padding:'18px 20px',marginBottom:14}};
var DIN={
  no_cobrado:['Aún no entregado','#7a7d6a','#f1efe6'],
  por_pagar:['Cobrado · por pagarte','#9a6a00','#fdf3dc'],
  en_liquidacion:['En liquidación · por pagarte','#1f5fa8','#e6f0fb'],
  pagado:['Pagado','#1f6b40','#e3f4ea'],
  directo:['Te pagó directo el destinatario','#1f6b40','#e3f4ea']};
function money(v){return '$'+Math.round(+v||0).toLocaleString('es-CL');}
function dmy(s){if(!s)return '—';var p=String(s).slice(0,10).split('-');return p[2]+'-'+p[1]+'-'+p[0];}
function tit(s){return String(s||'').trim().toLowerCase().replace(/(^|[\s(])\S/g,function(m){return m.toUpperCase();});}
function hoyCL(){return (A.fechaHoyCL&&A.fechaHoyCL())||new Date().toLocaleDateString('en-CA',{timeZone:'America/Santiago'});}
function rango(k){var hoy=hoyCL();var y=+hoy.slice(0,4),m=+hoy.slice(5,7);
  if(k==='90'){var d=new Date(hoy+'T12:00:00');d.setDate(d.getDate()-89);return [d.toISOString().slice(0,10),hoy];}
  if(k==='mes_ant'){m--;if(m<1){m=12;y--;}}var mm=String(m).padStart(2,'0');var last=new Date(y,m,0).getDate();
  return [y+'-'+mm+'-01',k==='mes'?hoy:y+'-'+mm+'-'+String(last).padStart(2,'0')];}
function boton(t,on,prim,st){return h('button',{type:'button',onClick:on,style:Object.assign({padding:'7px 13px',borderRadius:10,border:'1px solid '+(prim?'#d9b553':'rgba(160,132,42,.45)'),
  background:prim?'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)':'#fff',color:'#2b2e20',fontWeight:800,fontSize:12.5,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'},st||{})},t);}
function chip(k){var d=DIN[k]||[k,'#555','#eee'];return h('span',{style:{display:'inline-block',padding:'3px 9px',borderRadius:999,background:d[2],color:d[1],fontWeight:800,fontSize:11.5,whiteSpace:'nowrap'}},d[0]);}
async function abrirArchivos(lista){var w=window.open('','_blank');
  try{var r=await db.storage.from(BUCKET).createSignedUrls(lista.map(function(x){return x.path;}),3600);if(r.error)throw r.error;
    var urls=(r.data||[]).map(function(x,i){return {url:x.signedUrl,nombre:lista[i].nombre||('Archivo '+(i+1)),mime:lista[i].mime||lista[i].tipo||'',titulo:lista[i]._titulo||''};}).filter(function(x){return x.url;});
    if(!urls.length)throw new Error('sin archivos');
    if(urls.length===1&&w){w.location.href=urls[0].url;return;}
    var html='<!doctype html><meta charset="utf-8"><title>Comprobantes · TransPgso</title><body style="font-family:Arial,sans-serif;background:#f6f2e6;margin:0;padding:20px;color:#2b2e20"><h2 style="margin:0 0 14px">Comprobantes</h2>'
      +urls.map(function(u){var img=/^image\//.test(u.mime)||/\.(jpe?g|png|webp)$/i.test(u.nombre);return '<div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:14px;box-shadow:0 2px 10px rgba(0,0,0,.06)"><div style="font-weight:700;margin-bottom:8px">'+(u.titulo?u.titulo+' · ':'')+u.nombre.replace(/</g,'&lt;')+'</div>'+(img?'<img src="'+u.url+'" style="max-width:100%;border-radius:8px">':'<a href="'+u.url+'" target="_blank">Abrir documento</a>')+'</div>';}).join('')+'</body>';
    if(w){w.document.open();w.document.write(html);w.document.close();}}
  catch(e){if(w)w.close();alert('No se pudo abrir el comprobante.');}}

function CobrosCliente(props){
  var _p=useState('mes'),per=_p[0],setPer=_p[1];var _d=useState(null),d=_d[0],setD=_d[1];
  var _f=useState('todos'),filtro=_f[0],setFiltro=_f[1];var _q=useState(''),q=_q[0],setQ=_q[1];
  function cargar(){var rg=rango(per);db.rpc('mis_cobros_cliente',{p_desde:rg[0],p_hasta:rg[1]}).then(function(r){setD(r.error?{err:r.error.message}:r.data);});}
  useEffect(function(){setD(null);cargar();var st=A.intervaloVisible?A.intervaloVisible(cargar,300000,['envios'],8000):null;return function(){if(typeof st==='function')st();};},[per]);
  var E=(d&&d.envios)||[],L=(d&&d.liquidaciones)||[];
  var sum=function(k){return E.filter(function(x){return x.dinero===k;}).reduce(function(s,x){return s+(+x.cobrado_monto||+x.monto||0);},0);};
  var cobrado=E.filter(function(x){return x.dinero!=='no_cobrado';}).reduce(function(s,x){return s+(+x.cobrado_monto||+x.monto||0);},0);
  var pagado=sum('pagado')+sum('directo'),porPagar=sum('por_pagar')+sum('en_liquidacion'),sinEntregar=E.filter(function(x){return x.dinero==='no_cobrado';});
  var lista=E.filter(function(x){if(filtro==='pagado'&&!(x.dinero==='pagado'||x.dinero==='directo'))return false;if(filtro==='por_pagar'&&!(x.dinero==='por_pagar'||x.dinero==='en_liquidacion'))return false;if(filtro==='no_cobrado'&&x.dinero!=='no_cobrado')return false;if(filtro.indexOf('LIQ')===0&&x.liq_numero!==filtro)return false;
    if(q){var s=q.toLowerCase();return String(x.codigo).toLowerCase().indexOf(s)>=0||String(x.destinatario||'').toLowerCase().indexOf(s)>=0;}return true;});
  var tile=function(t,v,det,col,k){var on=filtro===k;return h('div',{key:t,onClick:function(){setFiltro(on?'todos':k);},style:{cursor:'pointer',padding:'12px 14px',borderRadius:14,background:on?'#fbf3dc':C.fila,border:'1px solid '+(on?'#d9b553':C.bd)}},
    h('div',{style:{fontSize:11,fontWeight:800,letterSpacing:1.2,textTransform:'uppercase',color:C.sub}},t),
    h('div',{style:{fontFamily:'Bebas Neue',fontSize:30,lineHeight:1.05,color:col||C.txt}},v),h('div',{style:{fontSize:12,color:C.sub,fontWeight:700}},det));};
  function excel(){if(!A.exportToExcel)return;var rg=rango(per);
    A.exportToExcel('Cobros_'+String((d&&d.cliente)||'').replace(/\s+/g,'_')+'_'+dmy(rg[0])+'_al_'+dmy(rg[1]),[
      {name:'Envíos por cobrar',headers:['Código','Fecha','Destinatario','Comuna','Monto','Forma de pago','Estado del dinero','Liquidación','Pagada'],rows:E.map(function(x){return [x.codigo,dmy(x.fecha),tit(x.destinatario),tit(x.comuna),+x.monto||0,x.forma?tit(x.forma):'',(DIN[x.dinero]||[x.dinero])[0],x.liq_numero||'',x.liq_pagada_fecha?dmy(x.liq_pagada_fecha):''];})},
      {name:'Liquidaciones',headers:['Número','Fecha','Desde','Hasta','Paquetes','Cobrado','Pagado directo','Transferido / a transferir','Estado','Pagada','Referencia'],rows:L.map(function(l){return [l.numero,dmy(l.fecha),dmy(l.desde),dmy(l.hasta),l.n,+l.total_cobrado||0,+l.directo_cliente||0,+l.a_transferir||0,l.estado==='pagada'?'Pagada':'Por pagar',l.pagada_fecha?dmy(l.pagada_fecha):'',l.pagada_ref||''];})}]);}
  var perBtn=function(k,t){var on=per===k;return h('button',{key:k,type:'button',onClick:function(){setPer(k);setFiltro('todos');},style:{padding:'7px 12px',borderRadius:10,border:'1px solid '+(on?'#d9b553':'rgba(43,46,32,.15)'),background:on?'#fbf3dc':'#fff',color:on?'#7a5f12':C.sub,fontWeight:800,fontSize:12.5,cursor:'pointer',fontFamily:'inherit'}},t);};
  return h('div',{style:{color:C.txt}},
    h('style',null,'.cc-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.cc-fila{display:grid;grid-template-columns:1.1fr 1.4fr 1fr .8fr 1.3fr auto;gap:10px;align-items:center}@media(max-width:820px){.cc-kpis{grid-template-columns:1fr 1fr}.cc-fila{grid-template-columns:1fr auto}.cc-fila .cc-x{display:none}}'),
    h('div',{style:C.caja},
      h('div',{style:{display:'flex',alignItems:'flex-start',gap:10,flexWrap:'wrap',marginBottom:12}},
        h('div',{style:{flex:1,minWidth:220}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:30,letterSpacing:2,lineHeight:1,color:'#3A3D2E'}},'Cobros a tus destinatarios'),
          h('div',{style:{fontSize:13,color:C.sub,fontWeight:600,marginTop:4}},'Lo que cobramos al entregar tus envíos "por cobrar", lo que ya te pagamos y lo que está pendiente. Toca un cuadro para filtrar.')),
        h('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},perBtn('mes','Este mes'),perBtn('mes_ant','Mes pasado'),perBtn('90','Últimos 90 días'),boton('Excel',excel))),
      !d?h('div',{style:{color:C.sub,fontWeight:700}},'Cargando…'):d.err?h('div',{style:{color:'#b03030',fontWeight:700}},'No se pudo cargar la información.'):
      h('div',{className:'cc-kpis'},
        tile('Cobrado',money(cobrado),E.length-sinEntregar.length+' envío'+(E.length-sinEntregar.length===1?'':'s')+' entregados','#3A3D2E','todos'),
        tile('Ya te pagamos',money(pagado),'Transferido o pagado directo a ti','#1f6b40','pagado'),
        tile('Por pagarte',money(porPagar),'Cobrado, en proceso de pago','#9a6a00','por_pagar'),
        tile('Aún sin entregar',money(sinEntregar.reduce(function(s,x){return s+(+x.monto||0);},0)),sinEntregar.length+' envío'+(sinEntregar.length===1?'':'s')+' en camino o reprogramados',C.dim,'no_cobrado'))),
    d&&!d.err&&L.length>0&&h('div',{style:C.caja},
      h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:1.5,color:'#3A3D2E',marginBottom:8}},'Tus liquidaciones'),
      h('div',{style:{display:'flex',flexDirection:'column',gap:6}},L.map(function(l){var pag=l.estado==='pagada';var comps=(l.comprobantes||[]).map(function(c){return Object.assign({},c,{_titulo:l.numero});});
        return h('div',{key:l.numero,style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'10px 12px',borderRadius:12,background:C.fila,border:'1px solid '+C.bd}},
          h('div',{style:{flex:1,minWidth:180}},h('div',{style:{fontWeight:900,fontSize:13.5,fontFamily:'JetBrains Mono, monospace'}},l.numero),
            h('div',{style:{fontSize:12,color:C.sub,fontWeight:700}},'Período '+dmy(l.desde)+' al '+dmy(l.hasta)+' · '+l.n+' envío'+(l.n===1?'':'s')+(+l.directo_cliente?' · '+money(l.directo_cliente)+' te pagaron directo':''))),
          h('div',{style:{textAlign:'right'}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,lineHeight:1}},money(l.a_transferir)),
            h('div',{style:{fontSize:11.5,fontWeight:800,color:pag?'#1f6b40':'#9a6a00'}},pag?'Pagada el '+dmy(l.pagada_fecha)+(l.pagada_ref?' · Op. '+l.pagada_ref:''):'Por pagar')),
          boton('Ver envíos',function(){setFiltro(filtro===l.numero?'todos':l.numero);setQ('');}),
          comps.length?boton('Comprobante'+(comps.length>1?'s ('+comps.length+')':''),function(){abrirArchivos(comps);},true):null);}))),
    d&&!d.err&&h('div',{style:C.caja},
      h('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:10}},
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:1.5,color:'#3A3D2E',flex:1}},'Detalle por envío'+(filtro!=='todos'?' · '+(filtro.indexOf('LIQ')===0?filtro:{pagado:'Pagados',por_pagar:'Por pagarte',no_cobrado:'Sin entregar'}[filtro]):'')),
        filtro!=='todos'&&boton('Ver todos',function(){setFiltro('todos');}),
        h('input',{value:q,onChange:function(e){setQ(e.target.value);},placeholder:'Buscar código o destinatario',style:{padding:'8px 12px',borderRadius:10,border:'1px solid rgba(43,46,32,.18)',fontSize:13,fontFamily:'inherit',minWidth:200}})),
      lista.length===0?h('div',{style:{color:C.sub,fontWeight:700,padding:'10px 0'}},E.length?'Sin envíos con este filtro.':'No tienes envíos por cobrar en este período.'):
      h('div',{style:{display:'flex',flexDirection:'column',gap:4}},lista.map(function(x){var ev=x.evidencias||[];
        return h('div',{key:x.codigo,className:'cc-fila',style:{padding:'9px 11px',borderRadius:10,background:C.fila}},
          h('div',null,h('div',{style:{fontFamily:'JetBrains Mono, monospace',fontWeight:700,fontSize:12.5}},x.codigo),h('div',{style:{fontSize:11.5,color:C.sub,fontWeight:700}},dmy(x.fecha))),
          h('div',{className:'cc-x',style:{fontSize:12.5,fontWeight:700,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},tit(x.destinatario),h('div',{style:{fontSize:11.5,color:C.sub}},tit(x.comuna))),
          h('div',{className:'cc-x',style:{fontSize:12,color:C.sub,fontWeight:700}},x.forma?tit(x.forma):'—'),
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,textAlign:'right'}},money(x.cobrado_monto||x.monto)),
          h('div',null,chip(x.dinero),x.liq_numero?h('div',{style:{fontSize:11,color:C.sub,fontWeight:700,marginTop:2}},x.liq_numero+(x.liq_pagada_fecha?' · '+dmy(x.liq_pagada_fecha):'')):null),
          ev.length?boton('Evidencia ('+ev.length+')',function(){abrirArchivos(ev.map(function(e){return Object.assign({},e,{_titulo:(e.tipo==='pago'?'Pago':'Cobro')+' · '+x.codigo});}));},false,{padding:'5px 10px',fontSize:11.5}):h('span',null));}))));}
window.CobrosCliente=CobrosCliente;
})();
