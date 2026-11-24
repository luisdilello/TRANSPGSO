// Portal del cliente · Por cobrar (rediseño 24-11-2026). Pensado para que el cliente entienda en
// segundos: cuánto cobramos a sus destinatarios, cuánto ya recibió, cuánto le debemos y qué falta
// por entregar. Solo sus envíos: la RPC mis_cobros_cliente toma el cliente desde la sesión; los
// comprobantes se leen con la política de storage "cliente comprobantes-cobro select".
// No muestra mensajeros ni rendiciones.
(function(){
var h=React.createElement,useState=React.useState,useEffect=React.useEffect;
var A=window.__app||{};var db=A.db;var BUCKET='comprobantes-cobro';
var C={txt:'#2b2e20',sub:'#66654f',dim:'#9a9883',fila:'#fbf8f0',bd:'rgba(43,46,32,.1)',oro:'#A0842A',verde:'#1f7a48',ambar:'#a86b00',azul:'#1f5fa8',gris:'#8a8873',
  caja:{borderRadius:20,background:'#fff',border:'1px solid rgba(43,46,32,.1)',boxShadow:'0 4px 0 #e6dfca, 0 14px 30px rgba(20,22,15,.06)',color:'#2b2e20',padding:'20px 22px',marginBottom:16}};
var DEVUELTOS={retorno:1,cancelado:1,en_bodega_cancelado:1,siniestro:1};
// Estado simple que ve el cliente
function est(x){if(x.dinero==='pagado')return 'pagado';if(x.dinero==='directo')return 'directo';if(x.dinero==='por_pagar'||x.dinero==='en_liquidacion')return 'debemos';return DEVUELTOS[x.estado]?'devuelto':'camino';}
var EST={pagado:['Pagado','#1f7a48','#e3f4ea'],directo:['Te pagaron directo','#1f7a48','#e3f4ea'],debemos:['Te lo debemos','#a86b00','#fdf1d6'],camino:['En camino','#1f5fa8','#e6f0fb'],devuelto:['Devuelto · no se cobró','#7a7d6a','#f0eee6']};
function money(v){return '$'+Math.round(+v||0).toLocaleString('es-CL');}
function dmy(s){if(!s)return '—';var p=String(s).slice(0,10).split('-');return p[2]+'-'+p[1]+'-'+p[0];}
function dLargo(s){if(!s)return '—';try{return new Date(String(s).slice(0,10)+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long'});}catch(e){return dmy(s);}}
function tit(s){return String(s||'').trim().toLowerCase().replace(/(^|[\s(])\S/g,function(m){return m.toUpperCase();});}
function hoyCL(){return (A.fechaHoyCL&&A.fechaHoyCL())||new Date().toLocaleDateString('en-CA',{timeZone:'America/Santiago'});}
function rango(k){var hoy=hoyCL();var y=+hoy.slice(0,4),m=+hoy.slice(5,7);
  if(k==='90'){var d=new Date(hoy+'T12:00:00');d.setDate(d.getDate()-89);return [d.toISOString().slice(0,10),hoy];}
  if(k==='mes_ant'){m--;if(m<1){m=12;y--;}}var mm=String(m).padStart(2,'0');var last=new Date(y,m,0).getDate();
  return [y+'-'+mm+'-01',k==='mes'?hoy:y+'-'+mm+'-'+String(last).padStart(2,'0')];}
function val(x){return +x.cobrado_monto||+x.monto||0;}
function boton(t,on,tipo,st){var prim=tipo==='prim';return h('button',{type:'button',onClick:on,style:Object.assign({padding:'8px 14px',borderRadius:11,border:'1px solid '+(prim?'#d9b553':'rgba(160,132,42,.4)'),
  background:prim?'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)':'#fff',color:'#2b2e20',fontWeight:800,fontSize:12.5,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'},st||{})},t);}
function chip(k){var d=EST[k];return h('span',{style:{display:'inline-block',padding:'4px 10px',borderRadius:999,background:d[2],color:d[1],fontWeight:800,fontSize:11.5,whiteSpace:'nowrap'}},d[0]);}
async function abrirArchivos(lista){var w=window.open('','_blank');
  try{var r=await db.storage.from(BUCKET).createSignedUrls(lista.map(function(x){return x.path;}),3600);if(r.error)throw r.error;
    var urls=(r.data||[]).map(function(x,i){return {url:x.signedUrl,nombre:lista[i].nombre||('Archivo '+(i+1)),mime:lista[i].mime||lista[i].tipo||'',titulo:lista[i]._titulo||''};}).filter(function(x){return x.url;});
    if(!urls.length)throw new Error('sin archivos');
    if(urls.length===1&&w){w.location.href=urls[0].url;return;}
    var html='<!doctype html><meta charset="utf-8"><title>Comprobantes · TransPgso</title><body style="font-family:Arial,sans-serif;background:#f6f2e6;margin:0;padding:20px;color:#2b2e20"><h2 style="margin:0 0 14px">Comprobantes</h2>'
      +urls.map(function(u){var img=/^image\//.test(u.mime)||/\.(jpe?g|png|webp)$/i.test(u.nombre);return '<div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:14px;box-shadow:0 2px 10px rgba(0,0,0,.06)"><div style="font-weight:700;margin-bottom:8px">'+(u.titulo?u.titulo+' · ':'')+u.nombre.replace(/</g,'&lt;')+'</div>'+(img?'<img src="'+u.url+'" style="max-width:100%;border-radius:8px">':'<a href="'+u.url+'" target="_blank">Abrir documento</a>')+'</div>';}).join('')+'</body>';
    if(w){w.document.open();w.document.write(html);w.document.close();}}
  catch(e){if(w)w.close();alert('No se pudo abrir el comprobante.');}}
function evidencias(x){var ev=x.evidencias||[];return ev.length?boton('Comprobante'+(ev.length>1?'s ('+ev.length+')':''),function(){abrirArchivos(ev.map(function(e){return Object.assign({},e,{_titulo:(e.tipo==='pago'?'Pago':'Cobro')+' · '+x.codigo});}));},null,{padding:'6px 10px',fontSize:11.5}):h('span',null);}
function filaEnvio(x,mostrarLiq){var k=est(x);
  return h('div',{key:x.codigo,className:'cc-fila',style:{padding:'10px 12px',borderRadius:12,background:C.fila}},
    h('div',null,h('div',{style:{fontWeight:800,fontSize:13}},tit(x.destinatario)||'—'),h('div',{style:{fontSize:11.5,color:C.sub,fontWeight:600}},x.codigo+' · '+dmy(x.fecha)+(x.comuna?' · '+tit(x.comuna):''))),
    h('div',{className:'cc-x',style:{fontSize:12,color:C.sub,fontWeight:700}},x.forma?tit(x.forma):''),
    h('div',null,chip(k),mostrarLiq&&x.liq_numero&&(k==='pagado'||k==='directo')?h('div',{style:{fontSize:11,color:C.dim,fontWeight:700,marginTop:3}},x.liq_numero):null),
    h('div',{style:{fontFamily:'Bebas Neue',fontSize:21,textAlign:'right',color:k==='devuelto'?C.dim:C.txt,textDecoration:k==='devuelto'?'line-through':'none'}},money(val(x))),
    evidencias(x));}

function CobrosCliente(props){
  var _p=useState('mes'),per=_p[0],setPer=_p[1];var _d=useState(null),d=_d[0],setD=_d[1];
  var _f=useState('todos'),filtro=_f[0],setFiltro=_f[1];var _q=useState(''),q=_q[0],setQ=_q[1];var _ab=useState({}),ab=_ab[0],setAb=_ab[1];var _ay=useState(false),ayuda=_ay[0],setAyuda=_ay[1];
  function cargar(){var rg=rango(per);db.rpc('mis_cobros_cliente',{p_desde:rg[0],p_hasta:rg[1]}).then(function(r){setD(r.error?{err:r.error.message}:r.data);});}
  useEffect(function(){setD(null);cargar();var st=A.intervaloVisible?A.intervaloVisible(cargar,300000,['envios'],8000):null;return function(){if(typeof st==='function')st();};},[per]);
  var E=(d&&d.envios)||[],L=(d&&d.liquidaciones)||[];
  var grupo=function(k){return E.filter(function(x){return est(x)===k;});};var suma=function(a){return a.reduce(function(s,x){return s+val(x);},0);};
  var gPag=grupo('pagado'),gDir=grupo('directo'),gDeb=grupo('debemos'),gCam=grupo('camino'),gDev=grupo('devuelto');
  // 24-11-2026: lo que te debemos es el total a la fecha (no depende del período), igual que el billete del Dashboard.
  var P=(d&&d.pendientes)||gDeb;
  var cobrado=suma(gPag)+suma(gDir)+suma(gDeb),recibido=suma(gPag)+suma(gDir),debemos=suma(P);var pct=cobrado?Math.round(recibido*100/cobrado):0;
  var enLiq=P.filter(function(x){return x.liq_numero;}),sinLiq=P.filter(function(x){return !x.liq_numero;});
  var liqPend=L.filter(function(l){return l.estado!=='pagada';}),liqPag=L.filter(function(l){return l.estado==='pagada';});
  var envDeLiq=function(n){return E.filter(function(x){return x.liq_numero===n;});};
  var lista=(filtro==='debemos'?P:E).filter(function(x){var k=est(x);if(filtro==='pagados'&&!(k==='pagado'||k==='directo'))return false;if(filtro!=='todos'&&filtro!=='pagados'&&k!==filtro)return false;
    if(q){var s=q.toLowerCase();return String(x.codigo).toLowerCase().indexOf(s)>=0||String(x.destinatario||'').toLowerCase().indexOf(s)>=0;}return true;});
  function excel(){if(!A.exportToExcel)return;var rg=rango(per);
    A.exportToExcel('Cobros_'+String((d&&d.cliente)||'').replace(/\s+/g,'_')+'_'+dmy(rg[0])+'_al_'+dmy(rg[1]),[
      {name:'Envíos por cobrar',headers:['Código','Fecha','Destinatario','Comuna','Monto','Forma de pago','Estado','Liquidación','Pagada'],rows:E.map(function(x){return [x.codigo,dmy(x.fecha),tit(x.destinatario),tit(x.comuna),val(x),x.forma?tit(x.forma):'',EST[est(x)][0],x.liq_numero||'',x.liq_pagada_fecha?dmy(x.liq_pagada_fecha):''];})},
      {name:'Pagos',headers:['Liquidación','Emitida','Envíos','Cobrado','Te pagaron directo','Transferido','Estado','Fecha de pago','Referencia'],rows:L.map(function(l){return [l.numero,dmy(l.fecha),l.n,+l.total_cobrado||0,+l.directo_cliente||0,+l.a_transferir||0,l.estado==='pagada'?'Pagada':'Por pagar',l.pagada_fecha?dmy(l.pagada_fecha):'',l.pagada_ref||''];})}]);}
  var perBtn=function(k,t){var on=per===k;return h('button',{key:k,type:'button',onClick:function(){setPer(k);setFiltro('todos');},style:{padding:'7px 13px',borderRadius:10,border:'1px solid '+(on?'#d9b553':'rgba(43,46,32,.14)'),background:on?'#fbf3dc':'#fff',color:on?'#7a5f12':C.sub,fontWeight:800,fontSize:12.5,cursor:'pointer',fontFamily:'inherit'}},t);};
  var titulo=function(t,s,der){return h('div',{style:{display:'flex',alignItems:'flex-end',gap:10,flexWrap:'wrap',marginBottom:12}},h('div',{style:{flex:1,minWidth:200}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:24,letterSpacing:1.4,color:'#3A3D2E',lineHeight:1}},t),s?h('div',{style:{fontSize:12.5,color:C.sub,fontWeight:600,marginTop:3}},s):null),der||null);};
  var paso=function(n,t,s){return h('div',{style:{flex:'1 1 200px',display:'flex',gap:10,alignItems:'flex-start'}},h('span',{style:{width:24,height:24,borderRadius:8,flexShrink:0,display:'grid',placeItems:'center',background:'#3A3D2E',color:'#f7dd8c',fontWeight:900,fontSize:12}},n),h('div',null,h('div',{style:{fontWeight:800,fontSize:13}},t),h('div',{style:{fontSize:12,color:C.sub}},s)));};
  var tabs=[['todos','Todos',E.length],['debemos','Te lo debemos',P.length],['pagados','Pagados',gPag.length+gDir.length],['camino','En camino',gCam.length],['devuelto','Devueltos',gDev.length]];

  return h('div',{style:{color:C.txt}},
    h('style',null,'.cc-res{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.cc-fila{display:grid;grid-template-columns:1.6fr .7fr 1fr .7fr 118px;gap:12px;align-items:center}.cc-liq{display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;align-items:center}'
      +'@media(max-width:820px){.cc-res{grid-template-columns:1fr}.cc-fila{grid-template-columns:1fr auto}.cc-fila>:last-child{grid-column:1/-1;justify-self:start}.cc-fila .cc-x{display:none}.cc-liq{grid-template-columns:auto 1fr}.cc-liq>.cc-lb{grid-column:1/-1}}'),
    // 1. Resumen
    h('div',{style:C.caja},
      titulo('Tus cobros contra entrega','Cuando tus envíos son "por cobrar", nosotros cobramos al entregar y después te transferimos ese dinero.',
        h('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},perBtn('mes','Este mes'),perBtn('mes_ant','Mes pasado'),perBtn('90','Últimos 90 días'),boton('Excel',excel))),
      !d?h('div',{style:{color:C.sub,fontWeight:700}},'Cargando…'):d.err?h('div',{style:{color:'#b03030',fontWeight:700}},'No se pudo cargar la información.'):
      h('div',null,
        h('div',{className:'cc-res'},
          [['Cobramos a tus clientes',cobrado,(gPag.length+gDir.length+gDeb.length)+' envíos entregados con cobro','#3A3D2E','todos'],
           ['Ya lo recibiste',recibido,pct+'% de lo cobrado',C.verde,'pagados'],
           ['Te lo debemos hoy',debemos,debemos?P.length+' envío'+(P.length===1?'':'s')+' · total a la fecha, de cualquier período':'Estás al día',C.ambar,'debemos']].map(function(t){var on=filtro===t[4]&&t[4]!=='todos';
            return h('div',{key:t[0],onClick:function(){setFiltro(t[4]);document.getElementById('cc-detalle')&&document.getElementById('cc-detalle').scrollIntoView({behavior:'smooth',block:'start'});},style:{cursor:'pointer',padding:'14px 16px',borderRadius:16,background:on?'#fbf3dc':C.fila,border:'1px solid '+(on?'#d9b553':C.bd)}},
              h('div',{style:{fontSize:12,fontWeight:800,color:C.sub}},t[0]),h('div',{style:{fontFamily:'Bebas Neue',fontSize:38,lineHeight:1.05,color:t[3]}},money(t[1])),h('div',{style:{fontSize:12,color:C.sub,fontWeight:700}},t[2]));})),
        h('div',{style:{marginTop:14}},
          h('div',{style:{height:10,borderRadius:6,background:'#efe9d8',overflow:'hidden',display:'flex'}},h('div',{style:{width:pct+'%',background:'linear-gradient(90deg,#2e9a5e,#1f7a48)'}}),h('div',{style:{width:(100-pct)+'%',background:suma(gDeb)?'repeating-linear-gradient(45deg,#e8c766,#e8c766 6px,#f2d98d 6px,#f2d98d 12px)':'transparent'}})),
          h('div',{style:{display:'flex',gap:16,flexWrap:'wrap',marginTop:8,fontSize:12,color:C.sub,fontWeight:700}},
            h('span',null,h('b',{style:{color:C.verde}},'■ '),'Recibido'),h('span',null,h('b',{style:{color:'#d9b553'}},'■ '),'Pendiente'),
            gCam.length?h('span',null,'Además, ',h('b',{style:{color:C.azul}},gCam.length+' en camino'),' por '+money(suma(gCam))+' (se cobran al entregar)'):null,
            gDev.length?h('span',null,h('b',null,gDev.length+' devuelto'+(gDev.length===1?'':'s')),' (no se cobraron)'):null)),
        h('div',{style:{marginTop:12}},h('button',{type:'button',onClick:function(){setAyuda(!ayuda);},style:{border:'none',background:'none',padding:0,color:C.oro,fontWeight:800,fontSize:12.5,cursor:'pointer',fontFamily:'inherit'}},ayuda?'Ocultar cómo funciona':'¿Cómo funciona?'),
          ayuda&&h('div',{style:{display:'flex',gap:14,flexWrap:'wrap',marginTop:10,padding:'12px 14px',borderRadius:14,background:C.fila}},
            paso(1,'Entregamos y cobramos','Tu destinatario paga al recibir: en efectivo, por transferencia o directo a tu cuenta.'),
            paso(2,'Armamos tu liquidación','Juntamos lo cobrado y te enviamos el detalle de cada envío.'),
            paso(3,'Te transferimos','Hacemos la transferencia y aquí queda el comprobante.'))))),
    // 2. Lo que te debemos
    d&&!d.err&&debemos>0&&h('div',{style:C.caja},
      titulo('Lo que te debemos · '+money(debemos),'Dinero ya cobrado a tus destinatarios que todavía no te hemos transferido.'),
      liqPend.map(function(l){var ev=envDeLiq(l.numero);return h('div',{key:l.numero,style:{padding:'12px 14px',borderRadius:14,background:'#fdf6e3',border:'1px solid #ecd9a3',marginBottom:8}},
        h('div',{style:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}},h('div',{style:{flex:1}},h('div',{style:{fontWeight:900}},'Liquidación '+l.numero+' · lista para pagar'),
          h('div',{style:{fontSize:12,color:C.sub,fontWeight:700}},'Emitida el '+dLargo(l.fecha)+' · '+l.n+' envío'+(l.n===1?'':'s')+(+l.directo_cliente?' · de estos, '+money(l.directo_cliente)+' ya te los pagaron directo':''))),
          h('div',{style:{textAlign:'right'}},h('div',{style:{fontSize:11,fontWeight:800,color:C.sub}},'A transferirte'),h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,lineHeight:1,color:C.ambar}},money(l.a_transferir)))));}),
      sinLiq.length>0&&h('div',{style:{padding:'12px 14px',borderRadius:14,background:C.fila,border:'1px solid '+C.bd}},
        h('div',{style:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:8}},h('div',{style:{flex:1}},h('div',{style:{fontWeight:900}},'Cobrado, entra en tu próxima liquidación'),h('div',{style:{fontSize:12,color:C.sub,fontWeight:700}},sinLiq.length+' envío'+(sinLiq.length===1?'':'s'))),
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,lineHeight:1,color:C.ambar}},money(suma(sinLiq)))),
        h('div',{style:{display:'flex',flexDirection:'column',gap:4}},sinLiq.map(function(x){return filaEnvio(x,false);})))),
    // 3. Pagos recibidos
    d&&!d.err&&liqPag.length>0&&h('div',{style:C.caja},
      titulo('Pagos que ya recibiste','Cada pago corresponde a una liquidación. Toca "Ver envíos" para ver qué incluye.'),
      h('div',{style:{display:'flex',flexDirection:'column',gap:8}},liqPag.map(function(l){var comps=(l.comprobantes||[]).map(function(c){return Object.assign({},c,{_titulo:l.numero});});var soloDir=!(+l.a_transferir)&&+l.directo_cliente>0;var abierto=!!ab[l.numero];var ev=envDeLiq(l.numero);
        return h('div',{key:l.numero,style:{borderRadius:14,background:C.fila,border:'1px solid '+C.bd,padding:'12px 14px'}},
          h('div',{className:'cc-liq'},
            h('div',{style:{width:54,textAlign:'center',padding:'6px 0',borderRadius:12,background:'#fff',border:'1px solid '+C.bd}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:24,lineHeight:1}},String(l.pagada_fecha||'').slice(8,10)||'—'),h('div',{style:{fontSize:10,fontWeight:800,color:C.sub,textTransform:'uppercase'}},l.pagada_fecha?new Date(l.pagada_fecha+'T12:00:00').toLocaleDateString('es-CL',{month:'short'}).replace('.',''):'')),
            h('div',{style:{minWidth:0}},h('div',{style:{fontWeight:900,fontSize:13.5}},soloDir?'Tus destinatarios te pagaron directo':'Transferencia recibida'),
              h('div',{style:{fontSize:12,color:C.sub,fontWeight:700}},l.numero+' · '+l.n+' envío'+(l.n===1?'':'s')+(+l.directo_cliente&&!soloDir?' · '+money(l.directo_cliente)+' te pagaron directo':'')+(l.pagada_ref?' · '+l.pagada_ref:''))),
            h('div',{style:{textAlign:'right'}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:26,lineHeight:1,color:C.verde}},money(soloDir?l.directo_cliente:l.a_transferir)),h('div',{style:{fontSize:11,fontWeight:800,color:C.verde}},soloDir?'sin transferencia':'transferido')),
            h('div',{className:'cc-lb',style:{display:'flex',gap:6,justifyContent:'flex-end'}},boton(abierto?'Ocultar':'Ver envíos',function(){setAb(function(o){var n=Object.assign({},o);n[l.numero]=!o[l.numero];return n;});}),comps.length?boton('Comprobante'+(comps.length>1?'s':''),function(){abrirArchivos(comps);},'prim'):null)),
          abierto&&h('div',{style:{display:'flex',flexDirection:'column',gap:4,marginTop:10}},ev.length?ev.map(function(x){return filaEnvio(x,false);}):h('div',{style:{fontSize:12,color:C.sub}},'Los envíos de esta liquidación son de otro período. Cambia el período arriba para verlos.')));}))),
    // 4. Detalle
    d&&!d.err&&h('div',{id:'cc-detalle',style:C.caja},
      titulo('Todos tus envíos por cobrar',null,h('input',{value:q,onChange:function(e){setQ(e.target.value);},placeholder:'Buscar código o destinatario',style:{padding:'9px 12px',borderRadius:11,border:'1px solid rgba(43,46,32,.16)',fontSize:13,fontFamily:'inherit',minWidth:220}})),
      h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}},tabs.map(function(t){var on=filtro===t[0];return h('button',{key:t[0],type:'button',onClick:function(){setFiltro(t[0]);},style:{padding:'7px 12px',borderRadius:999,border:'1px solid '+(on?'#3A3D2E':'rgba(43,46,32,.14)'),background:on?'#3A3D2E':'#fff',color:on?'#f7dd8c':C.sub,fontWeight:800,fontSize:12.5,cursor:'pointer',fontFamily:'inherit'}},t[1]+' · '+t[2]);})),
      lista.length===0?h('div',{style:{color:C.sub,fontWeight:700,padding:'10px 0'}},E.length?'No hay envíos en esta pestaña.':'No tienes envíos por cobrar en este período.'):
      h('div',{style:{display:'flex',flexDirection:'column',gap:5}},lista.map(function(x){return filaEnvio(x,true);}))));}
window.CobrosCliente=CobrosCliente;
})();
