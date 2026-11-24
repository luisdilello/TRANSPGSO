// Control de Por cobrar (18-11-2026). Administración → Por cobrar.
// Flujo: el mensajero cobra al entregar (efectivo o transferencia, informando a qué cuenta) →
// RINDE a diario lo que quedó en su poder (efectivo + transferencias a su cuenta) → acta REN-AAAA-NNNN →
// TransPgso LIQUIDA al cliente (semanal o mensual) lo cobrado → acta LIQ-AAAA-NNNN → se marca pagada.
// Transferencias a la cuenta del cliente no pasan por nosotros: se informan en la liquidación como "pagado directo".
(function(){
var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo;
var A=window.__app||{};var db=A.db;
var EMP={n:'TransPgso SpA',rut:'78.143.701-8',dir:'Exposición 902, Santiago Centro',mail:'contacto@transpgso.cl',fono:'+56 9 4211 2940',web:'www.transpgso.cl'};
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function money(n){return '$'+Math.round(+n||0).toLocaleString('es-CL');}
function dmy(s){if(!s)return '—';var p=String(s).slice(0,10).split('-');return p[2]+'-'+p[1]+'-'+p[0];}
function largo(s){var p=String(s).slice(0,10).split('-');return (+p[2])+' de '+MESES[+p[1]-1]+' de '+p[0];}
function tit(s){return String(s||'').toLowerCase().replace(/(^|\s)\S/g,function(m){return m.toUpperCase();});}
function hoyCL(){return A.fechaHoyCL?A.fechaHoyCL():new Date().toLocaleDateString('en-CA',{timeZone:'America/Santiago'});}
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function addD(s,n){var d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return ymd(d);}
function lunes(s){var d=new Date(s+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return ymd(d);}
function diasDesde(ts){if(!ts)return null;return Math.floor((Date.now()-new Date(ts).getTime())/86400000);}
var DEST={mensajero:['En poder del mensajero','#8a5a00','#fbefd2'],transpgso:['Transferido a TransPgso','#1f5fa8','#e3eefb'],cliente:['Transferido al cliente','#1f6b40','#dff3e7']};
function destinoDe(x){return x.cobro_destino||'mensajero';}
function formaTxt(x){return x.cobro_forma==='transferencia'?'Transferencia':x.cobro_forma==='efectivo'?'Efectivo':'Sin informar';}
function valor(x){return +(x.cobro_monto||x.monto)||0;}

// ── Actas (HTML imprimible) ──────────────────────────────────────────
function htmlActa(tipo,a,comp){comp=comp||[];
  var F=a.detalle||[],ren=tipo==='ren';var o=location.origin;
  var EA=a._est||{env:{},liqs:{}};var dirCli=ren&&a.forma_recibo===DIRECTO;
  var estF=function(x){var v=Object.assign({},x,EA.env[x.codigo]||{});return estadoDinero(v,EA.liqs);};
  var cuenta={};F.forEach(function(x){var k=estF(x)[0].split(' · ')[0];cuenta[k]=(cuenta[k]||0)+valor(x);});
  var filas=F.map(function(x,i){var ef=estF(x);return '<tr><td class="n">'+(i+1)+'</td><td class="m">'+esc(x.codigo)+'</td><td>'+dmy(x.fecha)+'</td><td>'+esc(ren?(x.cliente||'—'):tit(x.mensajero||'—'))+'</td><td>'+esc(tit(x.destinatario||'—'))+'</td><td>'+esc(formaTxt(x))+'</td><td>'+esc((DEST[destinoDe(x)]||['—'])[0])+'</td><td style="font-weight:700;color:'+ef[1]+'">'+esc(ef[0])+'</td><td class="r">'+money(valor(x))+'</td></tr>';}).join('');
  var resumen=ren?[['Mensajero',tit(a.mensajero)],['Paquetes',String(F.length)],['Total a rendir',money(a.total_esperado)],['Monto recibido',money(a.monto_recibido)],['Forma de recibo',a.forma_recibo||'—'],['Diferencia',money((+a.monto_recibido||0)-(+a.total_esperado||0))]]
    :[['Cliente',a.cliente],['Período',(a.desde?dmy(a.desde):'—')+' al '+(a.hasta?dmy(a.hasta):'—')],['Paquetes',String(F.length)],['Total cobrado a destinatarios',money(a.total_cobrado)],['Pagado directo al cliente',money(a.directo_cliente)],['A transferir por TransPgso',money(a.a_transferir)]];
  var dif=ren?(+a.monto_recibido||0)-(+a.total_esperado||0):0;
  return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(nombreActa(tipo,a))+'</title>'
  +'<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">'
  +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"DM Sans",Arial,sans-serif;color:#2b2e20;background:#e9e5d8;font-size:12px}.acc{position:sticky;top:0;display:flex;gap:8px;justify-content:center;padding:10px;background:#2b2e20}.acc button{font:800 13px "DM Sans",Arial;padding:9px 18px;border-radius:9px;border:1px solid #f7dd8c;background:linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829);cursor:pointer}.acc .s{background:transparent;color:#f1ecda}'
  +'.hoja{width:210mm;min-height:297mm;margin:16px auto;background:#fff;padding:15mm;box-shadow:0 10px 30px rgba(0,0,0,.18)}.cab{display:flex;justify-content:space-between;gap:20px;padding:14px 18px;border-radius:12px;background:#2b2e20;color:#f1ecda}.cab img{height:58px}.cab p{font-size:10.5px;color:#cfc9b2;margin-top:4px}.tipo{font-family:"Bebas Neue";font-size:30px;letter-spacing:2px;color:#e8c766;text-align:right;line-height:1}.num{display:inline-block;margin-top:6px;padding:4px 10px;border-radius:7px;background:#e8c766;color:#2b2e20;font-family:"JetBrains Mono",monospace;font-weight:700}'
  +'.res{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;margin-top:14px;padding:12px 14px;border:1px solid #e3dbc4;border-radius:10px}.res span{display:block;font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;color:#7a7766}.res b{font-size:13px}.tot{margin-top:12px;padding:14px 16px;border-radius:12px;background:#fbf2d6;border:1px solid #e8c766;display:flex;justify-content:space-between;align-items:center}.tot b{font-family:"Bebas Neue";font-size:32px;letter-spacing:1px}'
  +'h2{font-family:"Bebas Neue";font-size:15px;letter-spacing:1.5px;color:#8a6d1f;margin:16px 0 6px}table{width:100%;border-collapse:collapse}th{background:#3A3D2E;color:#f1ecda;font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;text-align:left;padding:7px 8px}td{padding:6px 8px;border-bottom:1px solid #ece6d4;font-size:11px}tr:nth-child(even) td{background:#fbf8f0}td.n{color:#9a9684;width:22px}td.r{text-align:right;font-weight:700}td.m{font-family:"JetBrains Mono",monospace;font-size:10.5px}'
  +'.decl{margin-top:16px;padding:12px 14px;border-left:4px solid #C8A84B;background:#fbf8f0;font-size:11.5px}.firmas{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:46px}.firmas div{border-top:1.5px solid #2b2e20;padding-top:6px;font-size:11px}.firmas b{display:block;font-family:"Bebas Neue";font-size:15px;letter-spacing:1.2px}.dif{color:'+(dif<0?'#b03030':'#2e7d4f')+'}'
  +'.anexo{page-break-before:always}.comp{margin-top:14px;padding:10px;border:1px solid #e3dbc4;border-radius:10px;page-break-inside:avoid;text-align:center}.comp img{max-width:100%;max-height:200mm;border-radius:6px}.cpie{margin-top:6px;font-size:10.5px;color:#5f5e4c;text-align:left}.cpdf{display:block;padding:18px;border-radius:8px;background:#fbf2d6;color:#8a6d1f;font-weight:800;text-decoration:none}'
  +'@page{size:A4;margin:12mm}@media print{body{background:#fff}.acc{display:none}.hoja{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}}</style></head><body>'
  +'<div class="acc"><button onclick="window.print()">Descargar PDF / Imprimir</button><button class="s" onclick="window.close()">Cerrar</button></div><div class="hoja">'
  +'<div class="cab"><div><img src="'+o+'/logo.jpg" alt="TransPgso" style="border-radius:10px"><p>'+EMP.n+' · RUT '+EMP.rut+'<br>'+EMP.dir+' · '+EMP.mail+'</p></div><div><div class="tipo">'+(ren?'Acta de rendición':'Liquidación de cobros')+'</div><div style="text-align:right"><span class="num">N° '+esc(a.numero)+'</span></div><p style="text-align:right">Santiago, '+largo(a.fecha||hoyCL())+'</p></div></div>'
  +'<div class="res">'+resumen.map(function(r,i){return '<div><span>'+r[0]+'</span><b'+(ren&&i===5?' class="dif"':'')+'>'+esc(r[1])+'</b></div>';}).join('')+'</div>'
  +'<div class="tot"><span style="font-weight:800">'+(ren?(dirCli?'Pagado por el mensajero directo al cliente':'Recibido por TransPgso'):'Monto a transferir al cliente')+'</span><b>'+money(ren?a.monto_recibido:a.a_transferir)+'</b></div>'
  +(!ren&&a.estado==='pagada'?'<div class="tot" style="background:#dff3e7;border-color:#57c98a"><span style="font-weight:800">PAGADA el '+dmy(a.pagada_fecha)+(a.pagada_ref?' · Ref. '+esc(a.pagada_ref):'')+'</span></div>':'')
  +'<h2>Estado actual del dinero</h2><div class="res" style="margin-top:0">'+Object.keys(cuenta).map(function(k){return '<div><span>'+esc(k)+'</span><b>'+money(cuenta[k])+'</b></div>';}).join('')+'</div>'
  +'<h2>Detalle de paquetes por cobrar</h2><table><thead><tr><th>#</th><th>Código</th><th>Fecha</th><th>'+(ren?'Cliente':'Mensajero')+'</th><th>Destinatario</th><th>Forma</th><th>Al cobrar</th><th>Estado actual</th><th style="text-align:right">Monto</th></tr></thead><tbody>'+filas+'</tbody></table>'
  +(a.nota?'<div class="decl"><b>Observaciones:</b> '+esc(a.nota)+'</div>':'')
  +'<div class="decl">'+(ren?(dirCli?'El mensajero declara haber transferido directamente al cliente (vendedor) los montos cobrados a destinatarios en los paquetes detallados. TransPgso SpA deja constancia y no vuelve a transferir estos montos al cliente.':'El mensajero entrega a TransPgso SpA los montos cobrados a destinatarios en los paquetes detallados, que quedaron en su poder (efectivo o transferencias a su cuenta). Ambas partes firman en conformidad.'):'TransPgso SpA informa al cliente los montos cobrados a sus destinatarios en el período. El monto a transferir excluye los pagos que los destinatarios hicieron directamente a la cuenta del cliente.')+'</div>'
  +'<div class="firmas"><div><b>'+(ren?'Entrega: '+esc(tit(a.mensajero)):'Emite: TransPgso SpA')+'</b>'+(ren?'Mensajero':esc(tit(a.emitida_por||'')))+'</div><div><b>'+(ren?(dirCli?'Recibe: '+esc(F.map(function(x){return x.cliente;}).filter(function(v,i,arr){return v&&arr.indexOf(v)===i;}).join(', ')||'Cliente'):'Recibe: TransPgso SpA'):'Recibe: '+esc(a.cliente))+'</b>'+(ren?(dirCli?'Cliente · registra '+esc(tit(a.recibido_por||'')):esc(tit(a.recibido_por||''))):'Cliente')+'</div></div>'
  +'</div>'
  +(comp.length?'<div class="hoja anexo"><div class="cab"><div><img src="'+o+'/logo.jpg" alt="TransPgso" style="border-radius:10px"></div><div><div class="tipo">Anexo · comprobantes de pago</div><div style="text-align:right"><span class="num">N° '+esc(a.numero)+'</span></div><p style="text-align:right">'+comp.length+' comprobante'+(comp.length>1?'s':'')+' adjunto'+(comp.length>1?'s':'')+'</p></div></div>'
    +comp.map(function(c,i){var img=/^image\//.test(c.tipo||'');var pie='<div class="cpie"><b>Comprobante '+(i+1)+'</b> · '+esc(c.nombre||'')+(c.subido_por?' · subido por '+esc(tit(c.subido_por)):'')+(c.subido_at?' · '+esc(new Date(c.subido_at).toLocaleString('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})):'')+'</div>';
      return '<div class="comp">'+(img?'<img src="'+esc(c.url)+'" alt="">':'<a class="cpdf" href="'+esc(c.url)+'" target="_blank">Comprobante en PDF · abrir documento</a>')+pie+'</div>';}).join('')+'</div>':'')
  +'</body></html>';}
function abrir(html){var w=window.open('','_blank');if(w){w.document.open();w.document.write(html);w.document.close();}}
var BUCKET='comprobantes-cobro';var TIPO_DB={ren:'rendicion',liq:'liquidacion'};
function comprimir(file){if(!/^image\//.test(file.type)||file.type==='image/gif')return Promise.resolve(file);
  return new Promise(function(res){var u=URL.createObjectURL(file),img=new Image();img.onload=function(){var s=Math.min(1,1800/Math.max(img.width,img.height));var c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    c.toBlob(function(b){URL.revokeObjectURL(u);res(b&&b.size<file.size?new File([b],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'}):file);},'image/jpeg',.85);};img.onerror=function(){URL.revokeObjectURL(u);res(file);};img.src=u;});}
async function subirComprobantes(tipo,a,files){var last=null;
  for(var i=0;i<files.length;i++){var f=await comprimir(files[i]);var limpio=String(f.name||'archivo').normalize('NFD').replace(/[^\w.-]+/g,'_').slice(-60);
    var path=TIPO_DB[tipo]+'/'+a.numero+'/'+Date.now()+'_'+i+'_'+limpio;
    var up=await db.storage.from(BUCKET).upload(path,f,{contentType:f.type||'application/octet-stream',upsert:false});if(up.error)throw new Error('No se pudo subir '+f.name+': '+up.error.message);
    var r=await db.rpc('comprobante_cobro',{p_tipo:TIPO_DB[tipo],p_id:a.id,p_accion:'agregar',p_item:{path:path,nombre:files[i].name,tipo:f.type,size:f.size}});if(r.error)throw new Error(r.error.message);last=r.data;}
  return last;}
async function urlsComprobantes(a){var L=a.comprobantes||[];if(!L.length)return [];var r=await db.storage.from(BUCKET).createSignedUrls(L.map(function(x){return x.path;}),60*60*24*7);
  return L.map(function(x,i){return Object.assign({},x,{url:(r.data&&r.data[i]&&r.data[i].signedUrl)||''});});}
// 23-11-2026: estado actual del dinero de cada paquete (dónde está finalmente el pago).
var DIRECTO='Transferencia directa al cliente';
function estadoDinero(x,liqs){var L=x.liquidacion_id&&liqs?liqs[x.liquidacion_id]:null;
  if(x.cobro_destino==='cliente')return ['Pagado directo al cliente','#1f6b40'];
  if(L&&L.estado==='pagada')return ['Pagado al cliente · '+L.numero+(L.pagada_fecha?' · '+dmy(L.pagada_fecha):''),'#1f6b40'];
  if(L)return ['En TransPgso · '+L.numero+' por pagar','#1f5fa8'];
  if(x.rendicion_id||x.cobro_destino==='transpgso')return ['En TransPgso · por pagar al cliente','#1f5fa8'];
  return ['En poder del mensajero','#8a5a00'];}
async function estadosActuales(cods){var o={},liqs={};if(!cods||!cods.length)return {env:o,liqs:liqs};
  for(var i=0;i<cods.length;i+=200){var r=await db.from('envios').select('codigo,cobro_destino,rendicion_id,liquidacion_id').in('codigo',cods.slice(i,i+200));(r.data||[]).forEach(function(e){o[e.codigo]=e;});}
  var ids=[];Object.keys(o).forEach(function(k){var l=o[k].liquidacion_id;if(l&&ids.indexOf(l)<0)ids.push(l);});
  if(ids.length){var q=await db.from('liquidaciones_cobro').select('id,numero,estado,pagada_fecha').in('id',ids);(q.data||[]).forEach(function(l){liqs[l.id]=l;});}
  return {env:o,liqs:liqs};}
async function verActa(tipo,a,w){w=w||window.open('','_blank');if(w){try{w.document.write('<p style="font-family:sans-serif;padding:30px;color:#555">Preparando acta…</p>');}catch(e){}}
  var c=[];try{c=await urlsComprobantes(a);}catch(e){}
  try{var evs=await cargarEvidencias(a.codigos||(a.detalle||[]).map(function(x){return x.codigo;}));var fl=[];Object.keys(evs).forEach(function(k){evs[k].forEach(function(e){fl.push(e);});});
    var fs=await firmarEvidencias(fl);c=c.concat(fs.map(function(e){return {path:e.path,url:e.url,tipo:e.mime,nombre:(TIPO_EV[e.tipo]?TIPO_EV[e.tipo][0]:'Evidencia')+' · '+e.codigo+' · '+(e.nombre||''),subido_por:e.subido_por,subido_at:e.created_at};}));}catch(e){}try{var ea=await estadosActuales(a.codigos||(a.detalle||[]).map(function(x){return x.codigo;}));a=Object.assign({},a,{_est:ea});}catch(e){}var html=htmlActa(tipo,a,c);if(w&&!w.closed){w.document.open();w.document.write(html);w.document.close();}}
// 24-11-2026: nombre del archivo con el cliente (liquidación) o el mensajero (rendición).
function nombreActa(tipo,a){var quien=String((tipo==='ren'?a.mensajero:a.cliente)||'').trim().replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,'_');return (tipo==='ren'?'Rendicion_':'Liquidacion_')+a.numero+(quien?'_'+quien:'');}
function excelActa(tipo,a){var ex=A.exportToExcel;if(!ex)return;var F=a.detalle||[];ex(nombreActa(tipo,a),[{name:'Detalle',headers:['Código','Fecha','Cliente','Mensajero','Destinatario','Forma','Destino del pago','Monto'],rows:F.map(function(x){return [x.codigo,dmy(x.fecha),x.cliente||'',x.mensajero||'',x.destinatario||'',formaTxt(x),(DEST[destinoDe(x)]||[''])[0],valor(x)];})}]);}

// ── UI (v2, 18-11-2026): misma línea visual del sistema (caja oscura oliva/oro), flujo en 3 pasos
// y vista maestro-detalle: a la izquierda quién debe, a la derecha sus paquetes ya marcados y el cierre.
var K={txt:'#f1ecda',sub:'rgba(233,228,210,.68)',dim:'rgba(233,228,210,.45)',oro:'#e8c766',fila:'rgba(255,255,255,.045)',filaOn:'rgba(232,199,102,.13)',bd:'rgba(255,255,255,.09)',bdOro:'rgba(200,168,75,.45)',
  rojo:'#ff9b8f',verde:'#8fe0a8',ambar:'#f7c55a',azul:'#9cc6ff',
  caja:{borderRadius:20,background:'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 50%,#15180f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 18px 38px rgba(20,22,15,.25), inset 0 1px 0 rgba(255,255,255,.07)',color:'#f1ecda',padding:'18px 20px'}};
var DESTK={mensajero:['En su poder',K.ambar],transpgso:['Transfirió a TransPgso',K.azul],cliente:['Pagó directo al cliente',K.verde]};
function caja(st){var a=[].slice.call(arguments,1);return h.apply(null,['div',{style:Object.assign({},K.caja,st||{})}].concat(a));}
function boton(t,on,tipo,dis,st){var p=tipo==='prim',d=tipo==='peligro';
  return h('button',{type:'button',onClick:on,disabled:!!dis,style:Object.assign({padding:'8px 14px',borderRadius:10,border:'1px solid '+(p?'#f7dd8c':d?'rgba(255,155,143,.45)':'rgba(200,168,75,.45)'),
    background:p?'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)':d?'rgba(176,48,48,.15)':'rgba(255,255,255,.06)',color:p?'#1a1d13':d?K.rojo:K.txt,
    fontWeight:800,fontSize:12.5,cursor:dis?'default':'pointer',opacity:dis?.45:1,boxShadow:p?'0 3px 0 #6d531a':'none',whiteSpace:'nowrap',fontFamily:'inherit'},st||{})},t);}
function eti(t){return h('div',{style:{fontSize:10.5,fontWeight:900,letterSpacing:1.3,textTransform:'uppercase',color:K.oro}},t);}
function titulo(t,s){return h('div',{style:{marginBottom:10}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:1.3,lineHeight:1}},t),s&&h('div',{style:{fontSize:12,fontWeight:700,color:K.sub,marginTop:3}},s));}
function plural(n,s,p){return n+' '+(n===1?s:(p||s+'s'));}
function iniciales(n){var p=String(n||'').trim().split(/\s+/);return ((p[0]||'')[0]||'')+((p[1]||'')[0]||'');}
function avatar(n,col){return h('div',{style:{width:38,height:38,borderRadius:12,flex:'0 0 38px',display:'grid',placeItems:'center',fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1,
  background:'rgba(232,199,102,.12)',border:'1px solid '+(col||K.bdOro),color:col||K.oro}},iniciales(n).toUpperCase());}
function pill(t,col,fondo){return h('span',{style:{padding:'3px 9px',borderRadius:999,fontSize:11,fontWeight:900,color:col,background:fondo||'rgba(255,255,255,.06)',border:'1px solid '+col+'55',whiteSpace:'nowrap'}},t);}
function diasPill(d){return d==null?null:d<=0?pill('De hoy',K.verde):pill(d===1?'1 día':d+' días',d>=2?K.rojo:K.ambar);}
// 23-11-2026: botón Ver en cada paquete: abre la ficha completa del envío (fotos, historial) sin perder lo marcado.
function verEnvio(codigo){var M=A.Modal,Card=A.EnvioDetalleCard;var el=document.createElement('div');document.body.appendChild(el);var root=ReactDOM.createRoot?ReactDOM.createRoot(el):null;
  function cerrar(){try{root?root.unmount():ReactDOM.unmountComponentAtNode(el);}catch(e){}if(el.parentNode)el.parentNode.removeChild(el);}
  function pintar(cont){var v=M?h(M,{title:'Envío · '+codigo,wide:true,onClose:cerrar},cont):h('div',{style:{position:'fixed',inset:0,zIndex:9990,background:'rgba(0,0,0,.6)',overflowY:'auto',padding:16},onClick:function(ev){if(ev.target===ev.currentTarget)cerrar();}},h('div',{style:{maxWidth:900,margin:'0 auto',background:'#fff',borderRadius:16,padding:16,color:'#2b2e20'}},cont));
    if(root)root.render(v);else ReactDOM.render(v,el);}
  pintar(h('div',{style:{padding:30,textAlign:'center',color:'#777'}},'Cargando envío…'));
  db.from('envios').select('*').eq('codigo',codigo).maybeSingle().then(function(r){if(!r||!r.data){pintar(h('div',{style:{padding:20,textAlign:'center',color:'#777'}},'Este código no existe en Envíos.'));return;}
    pintar(Card?h(Card,{key:codigo,envio:r.data}):h('div',null,'No disponible'));},function(){pintar(h('div',{style:{padding:20,textAlign:'center',color:'#777'}},'No se pudo cargar el envío.'));});}
function botonVer(codigo){return h('button',{type:'button',title:'Ver envío',onClick:function(ev){ev.stopPropagation();verEnvio(codigo);},style:{padding:'5px 12px',borderRadius:8,border:'1px solid rgba(232,199,102,.5)',background:'rgba(232,199,102,.12)',color:'#e8c766',fontWeight:900,fontSize:11.5,cursor:'pointer',fontFamily:'inherit'}},'Ver');}
function tick(on){return h('div',{style:{width:20,height:20,borderRadius:6,flex:'0 0 20px',display:'grid',placeItems:'center',border:'1.5px solid '+(on?'#e8c766':'rgba(255,255,255,.3)'),
  background:on?'linear-gradient(180deg,#f7dd8c,#d9b553)':'transparent',color:'#1a1d13',fontWeight:900,fontSize:13,lineHeight:1}},on?'✓':'');}
var inp={padding:'10px 12px',borderRadius:10,border:'1px solid rgba(200,168,75,.4)',background:'rgba(0,0,0,.25)',color:'#f1ecda',fontSize:14,fontWeight:700,fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'};
var CSS='.pc-md{display:grid;grid-template-columns:minmax(250px,320px) 1fr;gap:14px;align-items:start}.pc-pasos{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}'
  +'.pc-fila{display:grid;grid-template-columns:24px 1.2fr 1.4fr 1fr auto auto auto;gap:12px;align-items:center}'
  +'@media (max-width:900px){.pc-md{grid-template-columns:1fr}.pc-pasos{grid-template-columns:1fr}.pc-fila{grid-template-columns:24px 1fr auto auto auto}.pc-fila .pc-x{display:none}}'
  +'.pc-it{transition:background .12s}.pc-it:hover{background:rgba(255,255,255,.07)!important}.pc-seg button{flex:1}';

function SelectorArchivos(p){var ref=React.useRef(null);var L=p.archivos||[];
  return h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginTop:6}},
    h('input',{ref:ref,type:'file',multiple:true,accept:'image/*,application/pdf',style:{display:'none'},onChange:function(e){var f=[].slice.call(e.target.files||[]);p.setArchivos(L.concat(f));e.target.value='';}}),
    boton('Adjuntar comprobante',function(){ref.current&&ref.current.click();}),
    L.length===0&&h('span',{style:{fontSize:12,color:K.dim,fontWeight:700}},p.texto||'Foto o PDF'),
    L.map(function(f,i){return h('span',{key:i,style:{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 6px 5px 10px',borderRadius:999,background:'rgba(232,199,102,.12)',border:'1px solid '+K.bdOro,fontSize:12,fontWeight:800,color:K.txt,maxWidth:260}},
      h('span',{style:{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},f.name),
      h('button',{type:'button',onClick:function(){p.setArchivos(L.filter(function(_,j){return j!==i;}));},style:{border:'none',background:'rgba(255,255,255,.1)',color:K.txt,borderRadius:999,width:20,height:20,cursor:'pointer',fontWeight:900,lineHeight:1}},'×'));}));}
function ModalComprobantes(p){var m=p.m,a=m.a,liq=m.tipo==='liq';var toast=p.toast;
  var _c=useState(null),comp=_c[0],setComp=_c[1];var _f=useState([]),arch=_f[0],setArch=_f[1];var _b=useState(false),busy=_b[0],setBusy=_b[1];
  var _fe=useState(hoyCL()),fecha=_fe[0],setFecha=_fe[1];var _rf=useState(''),refe=_rf[0],setRefe=_rf[1];
  function recargar(lista){urlsComprobantes(Object.assign({},a,{comprobantes:lista})).then(setComp).catch(function(){setComp([]);});}
  useEffect(function(){recargar(a.comprobantes||[]);},[]);
  async function subir(){if(!arch.length)return true;setBusy(true);try{var r=await subirComprobantes(m.tipo,a,arch);a.comprobantes=r||a.comprobantes;setArch([]);recargar(a.comprobantes);p.onCambio();return true;}catch(e){toast(e.message);return false;}finally{setBusy(false);}}
  async function quitar(c){if(!window.confirm('Quitar el comprobante "'+(c.nombre||'')+'" del acta?'))return;setBusy(true);
    var r=await db.rpc('comprobante_cobro',{p_tipo:TIPO_DB[m.tipo],p_id:a.id,p_accion:'quitar',p_item:{path:c.path}});
    if(r.error){setBusy(false);toast(r.error.message);return;}await db.storage.from(BUCKET).remove([c.path]);a.comprobantes=r.data;recargar(r.data);setBusy(false);p.onCambio();}
  async function marcarPagada(){if(!arch.length&&!(a.comprobantes||[]).length&&!window.confirm('No adjuntaste comprobante. ¿Marcar como pagada igual?'))return;
    if(!(await subir()))return;setBusy(true);var r=await db.rpc('pagar_liquidacion_cobro',{p_id:a.id,p_fecha:fecha,p_ref:refe});setBusy(false);
    if(r.error){toast('No se pudo marcar: '+r.error.message);return;}toast(a.numero+' marcada como pagada');p.onCambio();p.onClose();}
  var pagando=liq&&m.pagar&&a.estado!=='pagada';
  return h('div',{onClick:function(e){if(e.target===e.currentTarget&&!busy)p.onClose();},style:{position:'fixed',inset:0,zIndex:9999,background:'rgba(10,11,7,.6)',display:'grid',placeItems:'center',padding:16}},
    h('div',{style:Object.assign({},K.caja,{width:'min(640px,100%)',maxHeight:'90vh',overflowY:'auto',padding:'20px 22px',boxSizing:'border-box'})},
      h('div',{style:{display:'flex',alignItems:'flex-start',gap:12,marginBottom:14}},
        h('div',{style:{flex:1}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:26,letterSpacing:1.3,lineHeight:1}},pagando?'Registrar pago':'Comprobantes de pago'),
          h('div',{style:{fontSize:12.5,fontWeight:700,color:K.sub,marginTop:4}},a.numero+' · '+(liq?a.cliente:tit(a.mensajero))+' · '+money(liq?a.a_transferir:a.monto_recibido))),
        h('button',{type:'button',onClick:function(){if(!busy)p.onClose();},style:{border:'none',background:'rgba(255,255,255,.08)',color:K.txt,width:32,height:32,borderRadius:10,cursor:'pointer',fontSize:18,fontWeight:900}},'×')),
      pagando&&h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:14}},
        h('label',{style:{display:'flex',flexDirection:'column',gap:6}},eti('Fecha de la transferencia'),h('input',{type:'date',value:fecha,onChange:function(e){setFecha(e.target.value);},style:Object.assign({},inp,{colorScheme:'dark'})})),
        h('label',{style:{display:'flex',flexDirection:'column',gap:6}},eti('N° de operación (opcional)'),h('input',{value:refe,onChange:function(e){setRefe(e.target.value);},placeholder:'Ej: 004512339',style:inp}))),
      eti(pagando?'Comprobante de la transferencia':'Adjuntar nuevos'),
      h(SelectorArchivos,{archivos:arch,setArchivos:setArch,texto:'Foto o PDF del comprobante'}),
      h('div',{style:{marginTop:16}},eti('En el acta'+(comp&&comp.length?' ('+comp.length+')':'')),
        comp==null?h('div',{style:{color:K.sub,fontWeight:700,marginTop:8}},'Cargando…'):comp.length===0?h('div',{style:{color:K.dim,fontWeight:700,marginTop:8,fontSize:13}},'Aún no hay comprobantes en esta acta.'):
        h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginTop:8}},comp.map(function(c){var img=/^image\//.test(c.tipo||'');
          return h('div',{key:c.path,style:{borderRadius:12,background:K.fila,border:'1px solid '+K.bd,overflow:'hidden'}},
            h('a',{href:c.url,target:'_blank',rel:'noopener',style:{display:'grid',placeItems:'center',height:110,background:'rgba(0,0,0,.25)',color:K.oro,fontWeight:900,textDecoration:'none',fontFamily:'Bebas Neue',fontSize:22,letterSpacing:1}},img?h('img',{src:c.url,alt:'',style:{width:'100%',height:110,objectFit:'cover'}}):'PDF'),
            h('div',{style:{padding:'7px 9px'}},h('div',{style:{fontSize:11.5,fontWeight:800,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},c.nombre||'Comprobante'),
              h('div',{style:{fontSize:10.5,color:K.dim,fontWeight:700}},c.subido_at?new Date(c.subido_at).toLocaleDateString('es-CL',{timeZone:'America/Santiago'}):''),
              h('button',{type:'button',onClick:function(){quitar(c);},disabled:busy,style:{marginTop:5,border:'none',background:'none',color:K.rojo,fontWeight:800,fontSize:11.5,cursor:'pointer',padding:0,fontFamily:'inherit'}},'Quitar')));}))),
      h('div',{style:{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18,flexWrap:'wrap'}},
        boton('Ver acta',function(){verActa(m.tipo,a);}),
        pagando?boton(busy?'Guardando…':'Marcar como pagada',marcarPagada,'prim',busy):boton(busy?'Subiendo…':'Subir al acta',subir,'prim',busy||!arch.length))));}

// 23-11-2026: evidencia por paquete (cobro al destinatario o pago al cliente). Tabla evidencias_cobro + bucket comprobantes-cobro.
var TIPO_EV={cobro:['Evidencia de cobro','Lo que pagó el destinatario (transferencia, foto del efectivo)'],pago:['Evidencia de pago','Pago de TransPgso o del mensajero al cliente']};
async function cargarEvidencias(cods){var o={};if(!cods||!cods.length)return o;
  for(var i=0;i<cods.length;i+=200){var r=await db.from('evidencias_cobro').select('*').in('codigo',cods.slice(i,i+200)).order('id');(r.data||[]).forEach(function(e){(o[e.codigo]=o[e.codigo]||[]).push(e);});}return o;}
async function firmarEvidencias(L){if(!L.length)return [];var r=await db.storage.from(BUCKET).createSignedUrls(L.map(function(x){return x.path;}),60*60*24*7);
  return L.map(function(x,i){return Object.assign({},x,{url:(r.data&&r.data[i]&&r.data[i].signedUrl)||''});});}
function botonEvi(codigo,n,abrir){return h('button',{type:'button',title:'Adjuntar evidencia de cobro o de pago',onClick:function(ev){ev.stopPropagation();abrir(codigo);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid '+(n?'rgba(87,201,138,.6)':'rgba(255,255,255,.2)'),background:n?'rgba(87,201,138,.14)':'rgba(255,255,255,.05)',color:n?'#7fe0a8':'#f1ecda',fontWeight:900,fontSize:11.5,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}},n?'Evidencia ('+n+')':'Evidencia');}
function ModalEvidencia(p){var toast=p.toast;var _t=useState(p.tipo||'cobro'),tipo=_t[0],setTipo=_t[1];var _f=useState([]),arch=_f[0],setArch=_f[1];var _b=useState(false),busy=_b[0],setBusy=_b[1];var _l=useState(null),lista=_l[0],setLista=_l[1];
  function recargar(){cargarEvidencias([p.codigo]).then(function(o){return firmarEvidencias(o[p.codigo]||[]);}).then(setLista).catch(function(){setLista([]);});}
  useEffect(recargar,[]);
  async function subir(){if(!arch.length)return;setBusy(true);try{for(var i=0;i<arch.length;i++){var f=arch[i];var ext=(f.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'');
      var path='envio/'+p.codigo.replace(/[^A-Za-z0-9_-]/g,'')+'/'+tipo+'_'+Date.now()+'_'+i+'.'+ext;
      var up=await db.storage.from(BUCKET).upload(path,f,{contentType:f.type||'application/octet-stream',upsert:false});if(up.error)throw new Error('No se pudo subir '+f.name+': '+up.error.message);
      var ins=await db.from('evidencias_cobro').insert({codigo:p.codigo,tipo:tipo,path:path,nombre:f.name,mime:f.type,size:f.size});if(ins.error)throw new Error(ins.error.message);}
    setArch([]);toast('Evidencia guardada');recargar();p.onCambio();}catch(e){toast(e.message);}finally{setBusy(false);}}
  async function quitar(c){if(!window.confirm('Quitar la evidencia "'+(c.nombre||'')+'"?'))return;setBusy(true);var d=await db.from('evidencias_cobro').delete().eq('id',c.id);if(d.error){setBusy(false);toast(d.error.message);return;}
    await db.storage.from(BUCKET).remove([c.path]);setBusy(false);recargar();p.onCambio();}
  return h('div',{onClick:function(e){if(e.target===e.currentTarget&&!busy)p.onClose();},style:{position:'fixed',inset:0,zIndex:9999,background:'rgba(10,11,7,.6)',display:'grid',placeItems:'center',padding:16}},
    h('div',{style:Object.assign({},K.caja,{width:'min(640px,100%)',maxHeight:'90vh',overflowY:'auto',padding:'20px 22px',boxSizing:'border-box'})},
      h('div',{style:{display:'flex',alignItems:'flex-start',gap:12,marginBottom:14}},
        h('div',{style:{flex:1}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:26,letterSpacing:1.3,lineHeight:1}},'Evidencia del paquete'),
          h('div',{style:{fontSize:12.5,fontWeight:700,color:K.sub,marginTop:4,fontFamily:'JetBrains Mono, monospace'}},p.codigo+(p.info?' · '+p.info:''))),
        h('button',{type:'button',onClick:function(){if(!busy)p.onClose();},style:{border:'none',background:'rgba(255,255,255,.08)',color:K.txt,width:32,height:32,borderRadius:10,cursor:'pointer',fontSize:18,fontWeight:900}},'×')),
      eti('¿Qué vas a adjuntar?'),
      h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,margin:'8px 0 12px'}},Object.keys(TIPO_EV).map(function(k){var on=tipo===k;
        return h('button',{key:k,type:'button',onClick:function(){setTipo(k);},style:{textAlign:'left',padding:'10px 12px',borderRadius:12,cursor:'pointer',fontFamily:'inherit',border:'1px solid '+(on?'#e8c766':'rgba(255,255,255,.14)'),background:on?'rgba(232,199,102,.16)':'rgba(0,0,0,.2)',color:K.txt}},
          h('div',{style:{fontWeight:900,fontSize:13,color:on?'#f7dd8c':K.txt}},TIPO_EV[k][0]),h('div',{style:{fontSize:11.5,fontWeight:700,color:K.sub,marginTop:2}},TIPO_EV[k][1]));})),
      h(SelectorArchivos,{archivos:arch,setArchivos:setArch,texto:'Foto o PDF'}),
      h('div',{style:{marginTop:16}},eti('Adjuntas'+(lista&&lista.length?' ('+lista.length+')':'')),
        lista==null?h('div',{style:{color:K.sub,fontWeight:700,marginTop:8}},'Cargando…'):lista.length===0?h('div',{style:{color:K.dim,fontWeight:700,marginTop:8,fontSize:13}},'Este paquete aún no tiene evidencia.'):
        h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginTop:8}},lista.map(function(c){var img=/^image\//.test(c.mime||'');
          return h('div',{key:c.id,style:{borderRadius:12,background:K.fila,border:'1px solid '+K.bd,overflow:'hidden'}},
            h('a',{href:c.url,target:'_blank',rel:'noopener',style:{display:'grid',placeItems:'center',height:110,background:'rgba(0,0,0,.25)',color:K.oro,fontWeight:900,textDecoration:'none',fontFamily:'Bebas Neue',fontSize:22,letterSpacing:1}},img?h('img',{src:c.url,alt:'',style:{width:'100%',height:'100%',objectFit:'cover'}}):'PDF'),
            h('div',{style:{padding:'7px 9px'}},h('div',{style:{fontSize:11,fontWeight:900,color:c.tipo==='pago'?'#7fe0a8':K.oro}},TIPO_EV[c.tipo]?TIPO_EV[c.tipo][0]:c.tipo),
              h('div',{style:{fontSize:11.5,fontWeight:800,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},c.nombre||'Archivo'),
              h('div',{style:{fontSize:10.5,color:K.dim,fontWeight:700}},new Date(c.created_at).toLocaleDateString('es-CL',{timeZone:'America/Santiago'})+(c.subido_por?' · '+tit(c.subido_por):'')),
              h('button',{type:'button',onClick:function(){quitar(c);},disabled:busy,style:{marginTop:5,border:'none',background:'none',color:K.rojo,fontWeight:800,fontSize:11.5,cursor:'pointer',padding:0,fontFamily:'inherit'}},'Quitar')));}))),
      h('div',{style:{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}},boton('Cerrar',p.onClose),boton(busy?'Subiendo…':'Guardar evidencia',subir,'prim',busy||!arch.length))));}
function PorCobrar(props){
  var toast=props.toast||function(m){alert(m);};var esAdmin=!!(A.perfil&&(A.perfil.esAdmin||A.perfil.esSuperAdmin));
  var _t=useState('rendir'),tab=_t[0],setTab=_t[1];var _p=useState(null),pend=_p[0],setPend=_p[1];
  var _r=useState(null),rens=_r[0],setRens=_r[1];var _l=useState(null),liqs=_l[0],setLiqs=_l[1];
  var _sm=useState(''),selMen=_sm[0],setSelMen=_sm[1];var _sc=useState(''),selCli=_sc[0],setSelCli=_sc[1];
  var _sel=useState({}),sel=_sel[0],setSel=_sel[1];var _rec=useState(''),recibido=_rec[0],setRecibido=_rec[1];var _fr=useState('Efectivo'),formaRec=_fr[0],setFormaRec=_fr[1];var _nt=useState(''),nota=_nt[0],setNota=_nt[1];var _fa=useState([]),archivos=_fa[0],setArchivos=_fa[1];var _md=useState(null),modal=_md[0],setModal=_md[1];
  var _ev=useState({}),evi=_ev[0],setEvi=_ev[1];var _me=useState(null),modalEv=_me[0],setModalEv=_me[1];var _al=useState([]),archL=_al[0],setArchL=_al[1];
  var _per=useState('semana_ant'),per=_per[0],setPer=_per[1];var _busy=useState(false),busy=_busy[0],setBusy=_busy[1];var _mes=useState(hoyCL().slice(0,7)),mes=_mes[0],setMes=_mes[1];
  function cargar(){db.rpc('por_cobrar_pendientes',{p_desde:'2026-11-01'}).then(function(r){if(r.error){toast('No se pudo cargar: '+r.error.message);setPend([]);return;}setPend(r.data||[]);cargarEvidencias((r.data||[]).map(function(x){return x.codigo;})).then(setEvi).catch(function(){});});
    db.from('rendiciones_cobro').select('*').order('id',{ascending:false}).limit(500).then(function(r){setRens(r.data||[]);});
    db.from('liquidaciones_cobro').select('*').order('id',{ascending:false}).limit(500).then(function(r){setLiqs(r.data||[]);});}
  useEffect(cargar,[]);
  var P=pend||[];
  var porRendir=P.filter(function(x){return !x.rendicion_id&&destinoDe(x)==='mensajero';});
  var porLiquidar=P.filter(function(x){return !x.liquidacion_id;});
  var porMen=useMemo(function(){var o={};porRendir.forEach(function(x){var k=x.mensajero||'SIN MENSAJERO';var m=o[k]=o[k]||{men:k,n:0,total:0,maxDias:0,items:[]};m.n++;m.total+=valor(x);var d=diasDesde(x.cobro_at);if(d!=null&&d>m.maxDias)m.maxDias=d;m.items.push(x);});return Object.keys(o).map(function(k){return o[k];}).sort(function(a,b){return b.maxDias-a.maxDias||b.total-a.total;});},[pend]);
  var porCli=useMemo(function(){var o={};porLiquidar.forEach(function(x){var k=x.cliente||'—';var m=o[k]=o[k]||{cli:k,n:0,total:0,directo:0,sinRendir:0};m.n++;m.total+=valor(x);if(destinoDe(x)==='cliente')m.directo+=valor(x);if(!x.rendicion_id&&destinoDe(x)==='mensajero')m.sinRendir++;});return Object.keys(o).map(function(k){return o[k];}).sort(function(a,b){return (b.total-b.directo)-(a.total-a.directo);});},[pend]);
  var tot=function(L){return L.reduce(function(s,x){return s+valor(x);},0);};
  var atrasados=porMen.filter(function(m){return m.maxDias>=1;});
  var liqPend=(liqs||[]).filter(function(l){return l.estado!=='pagada';});
  var sinDestino=P.filter(function(x){return x.cobro_forma==='transferencia'&&!x.cobro_destino;});

  function rangoPer(){var hoy=hoyCL();if(per==='semana_ant'){var l=addD(lunes(hoy),-7);return [l,addD(l,6)];}if(per==='semana'){var l2=lunes(hoy);return [l2,addD(l2,6)];}if(per==='mes_ant'){var d=new Date(hoy.slice(0,4),+hoy.slice(5,7)-2,1);var f=new Date(d.getFullYear(),d.getMonth()+1,0);return [ymd(d),ymd(f)];}var d2=new Date(hoy.slice(0,4),+hoy.slice(5,7)-1,1);return [ymd(d2),hoy];}
  // Al elegir mensajero o cliente, todo queda marcado de entrada (lo normal es rendir/liquidar todo).
  function elegirMen(k){setSelMen(k);var o={};porRendir.forEach(function(x){if(x.mensajero===k)o[x.codigo]=true;});setSel(o);setRecibido('');setNota('');setFormaRec('Efectivo');setArchivos([]);}
  function marcarPeriodo(cli,p){var hoy=hoyCL(),rg;var pp=p||per;
    if(pp==='semana_ant'){var l=addD(lunes(hoy),-7);rg=[l,addD(l,6)];}else if(pp==='semana'){var l2=lunes(hoy);rg=[l2,addD(l2,6)];}else if(pp==='mes_ant'){var d=new Date(hoy.slice(0,4),+hoy.slice(5,7)-2,1);rg=[ymd(d),ymd(new Date(d.getFullYear(),d.getMonth()+1,0))];}else{rg=[ymd(new Date(hoy.slice(0,4),+hoy.slice(5,7)-1,1)),hoy];}
    var o={};porLiquidar.forEach(function(x){if(x.cliente===cli&&x.fecha>=rg[0]&&x.fecha<=rg[1])o[x.codigo]=true;});setSel(o);}
  function elegirCli(k){setSelCli(k);setNota('');marcarPeriodo(k);}
  function irTab(k){setTab(k);setSel({});
    if(k==='rendir'&&!selMen&&porMen[0])elegirMen(porMen[0].men);else if(k==='rendir'&&selMen)elegirMen(selMen);
    if(k==='liquidar'&&!selCli&&porCli[0])elegirCli(porCli[0].cli);else if(k==='liquidar'&&selCli)elegirCli(selCli);}
  useEffect(function(){if(pend&&tab==='rendir'&&(!selMen||!porMen.some(function(m){return m.men===selMen;}))){if(porMen[0])elegirMen(porMen[0].men);else setSelMen('');}},[pend]);

  async function rendir(){var items=porRendir.filter(function(x){return x.mensajero===selMen&&sel[x.codigo];});if(!items.length){toast('Marca los paquetes que está rindiendo');return;}
    var esp=tot(items),rec=recibido===''?esp:+String(recibido).replace(/\D/g,'');setBusy(true);var w=window.open('','_blank');
    var r=await db.rpc('crear_rendicion_cobro',{p:{mensajero:selMen,codigos:items.map(function(x){return x.codigo;}),total_esperado:esp,monto_recibido:rec,forma_recibo:formaRec,nota:nota,detalle:items}});
    setBusy(false);if(r.error){if(w)w.close();toast('No se pudo registrar: '+r.error.message);return;}
    var g=await db.from('rendiciones_cobro').select('*').eq('id',r.data).single();
    if(g.data&&archivos.length){try{var cp=await subirComprobantes('ren',g.data,archivos);if(cp)g.data.comprobantes=cp;}catch(e){toast(e.message);}}
    if(g.data)await verActa('ren',g.data,w);
    toast('Rendición '+(g.data&&g.data.numero)+' registrada');setSel({});setRecibido('');setNota('');setArchivos([]);setSelMen('');cargar();}
  async function liquidar(){var rg=rangoPer();var items=porLiquidar.filter(function(x){return x.cliente===selCli&&sel[x.codigo];});if(!items.length){toast('Marca los paquetes a liquidar');return;}
    var total=tot(items),directo=tot(items.filter(function(x){return destinoDe(x)==='cliente';}));setBusy(true);var w=window.open('','_blank');
    var r=await db.rpc('crear_liquidacion_cobro',{p:{cliente:selCli,desde:rg[0],hasta:rg[1],codigos:items.map(function(x){return x.codigo;}),total_cobrado:total,directo_cliente:directo,a_transferir:total-directo,nota:nota,detalle:items}});
    setBusy(false);if(r.error){if(w)w.close();toast('No se pudo emitir: '+r.error.message);return;}
    var g=await db.from('liquidaciones_cobro').select('*').eq('id',r.data).single();
    if(g.data&&archL.length){try{var cpl=await subirComprobantes('liq',g.data,archL);if(cpl)g.data.comprobantes=cpl;}catch(e){toast(e.message);}}setArchL([]);
    if(g.data)await verActa('liq',g.data,w);
    toast('Liquidación '+(g.data&&g.data.numero)+' emitida');setSel({});setNota('');cargar();}
  function pagar(l){setModal({tipo:'liq',a:l,pagar:true});}
  function eliminar(tipo,a){if(!window.confirm('Eliminar '+a.numero+'? Los paquetes vuelven a quedar pendientes.'))return;db.rpc('eliminar_acta_cobro',{p_tipo:tipo,p_id:a.id}).then(function(r){if(r.error){toast(r.error.message);return;}toast(a.numero+' eliminada');cargar();});}
  function toggle(c){var o=Object.assign({},sel);o[c]=!sel[c];setSel(o);}

  if(pend==null)return caja({textAlign:'center',padding:40},h('div',{style:{color:K.sub,fontWeight:700}},'Cargando…'));

  // ── Cabecera + los 3 pasos (son también las pestañas) ──
  var paso=function(k,n,t,monto,det,alerta){var on=tab===k;return h('button',{key:k,type:'button',onClick:function(){irTab(k);},style:{textAlign:'left',cursor:'pointer',fontFamily:'inherit',color:K.txt,
      borderRadius:16,padding:'13px 15px',background:on?'linear-gradient(180deg,rgba(232,199,102,.18),rgba(232,199,102,.06))':'rgba(255,255,255,.04)',border:'1px solid '+(on?'#e8c766':K.bd),boxShadow:on?'0 0 0 3px rgba(232,199,102,.12)':'none'}},
    h('div',{style:{display:'flex',alignItems:'center',gap:9}},h('span',{style:{width:24,height:24,borderRadius:8,display:'grid',placeItems:'center',fontFamily:'Bebas Neue',fontSize:16,background:on?'#e8c766':'rgba(255,255,255,.1)',color:on?'#1a1d13':K.txt}},n),
      h('span',{style:{fontWeight:900,fontSize:13.5}},t),alerta&&h('span',{style:{marginLeft:'auto'}},alerta)),
    h('div',{style:{fontFamily:'Bebas Neue',fontSize:32,lineHeight:1,marginTop:8,color:on?'#f7dd8c':K.txt}},monto),
    h('div',{style:{fontSize:12,fontWeight:700,color:K.sub,marginTop:2}},det));};
  var cabecera=caja({marginBottom:14},
    h('style',null,CSS),
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap',marginBottom:14}},
      h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:34,letterSpacing:2,lineHeight:1}},'CONTROL ',h('span',{style:{color:K.oro}},'POR COBRAR')),
        h('div',{style:{fontSize:12.5,fontWeight:700,color:K.sub,marginTop:4}},'El mensajero cobra al entregar → nos rinde a diario → pagamos al cliente semanal o mensual. Cada paso deja su acta.')),
      boton('Actualizar',cargar)),
    h('div',{className:'pc-pasos'},
      paso('rendir','1','Cobrar a mensajeros',money(tot(porRendir)),porRendir.length?plural(porMen.length,'mensajero')+' · '+plural(porRendir.length,'paquete'):'Todos rindieron',atrasados.length?pill(atrasados.length+' atrasado'+(atrasados.length>1?'s':''),K.rojo):pill('Al día',K.verde)),
      paso('liquidar','2','Pagar a clientes',money(tot(porLiquidar)-tot(porLiquidar.filter(function(x){return destinoDe(x)==='cliente';}))),porCli.length?plural(porCli.length,'cliente')+' por liquidar':'Nada por liquidar',liqPend.length?pill(liqPend.length+' sin pagar',K.ambar):null),
      paso('actas','3','Actas e informe del mes',String((rens||[]).filter(function(r){return String(r.fecha).slice(0,7)===mes;}).length+(liqs||[]).filter(function(l){return String(l.fecha).slice(0,7)===mes;}).length),'actas emitidas en '+MESES[+mes.slice(5,7)-1])),
    sinDestino.length>0&&h('div',{style:{marginTop:12,padding:'9px 13px',borderRadius:12,background:'rgba(247,197,90,.1)',border:'1px solid rgba(247,197,90,.35)',fontSize:12.5,fontWeight:700,color:K.ambar}},
      plural(sinDestino.length,'transferencia')+' sin cuenta informada (cobradas antes de pedir el destino). Se tratan como "en su poder" hasta que el mensajero aclare.'));

  var cuerpo;
  // ── PASO 1: rendición del mensajero ──
  if(tab==='rendir'){
    var m=porMen.filter(function(x){return x.men===selMen;})[0];
    var lista=caja({padding:'14px'},titulo('¿Quién debe rendir?','Primero los más atrasados'),
      porMen.length===0?h('div',{style:{padding:'20px 6px',color:K.verde,fontWeight:800}},'Nadie tiene cobros pendientes. Todo rendido.'):
      h('div',{style:{display:'flex',flexDirection:'column',gap:6}},porMen.map(function(x){var on=x.men===selMen;var col=x.maxDias>=2?K.rojo:x.maxDias===1?K.ambar:K.verde;
        return h('div',{key:x.men,className:'pc-it',onClick:function(){elegirMen(x.men);},style:{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:12,cursor:'pointer',
          background:on?K.filaOn:K.fila,border:'1px solid '+(on?'#e8c766':'transparent'),borderLeft:'3px solid '+col}},
          avatar(x.men,on?'#e8c766':null),
          h('div',{style:{flex:1,minWidth:0}},h('div',{style:{fontWeight:800,fontSize:13.5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},tit(x.men)),
            h('div',{style:{fontSize:11.5,fontWeight:700,color:K.sub}},plural(x.n,'paquete'))),
          h('div',{style:{textAlign:'right'}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:21,lineHeight:1}},money(x.total)),h('div',{style:{marginTop:3}},diasPill(x.maxDias))));})));
    var detalle;
    if(!m)detalle=caja({padding:'40px 20px',textAlign:'center'},h('div',{style:{color:K.sub,fontWeight:700}},porMen.length?'Elige un mensajero de la lista.':'Cuando un mensajero cobre un paquete aparecerá aquí.'));
    else{var selI=m.items.filter(function(x){return sel[x.codigo];});var esp=tot(selI);var rec=recibido===''?esp:+recibido;var dif=rec-esp;var todos=selI.length===m.items.length;
      var grupos={};m.items.forEach(function(x){var k=String(x.cobro_at?new Date(x.cobro_at).toLocaleDateString('en-CA',{timeZone:'America/Santiago'}):x.fecha);(grupos[k]=grupos[k]||[]).push(x);});
      detalle=caja({padding:'16px 18px'},
        h('div',{style:{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',paddingBottom:12,borderBottom:'1px solid '+K.bd}},avatar(m.men,'#e8c766'),
          h('div',{style:{flex:1,minWidth:180}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:26,letterSpacing:1.2,lineHeight:1}},tit(m.men)),h('div',{style:{fontSize:12.5,fontWeight:700,color:K.sub,marginTop:3}},'Tiene en su poder '+plural(m.n,'cobro')+(m.maxDias>=1?' · el más antiguo de hace '+plural(m.maxDias,'día'):' · todos de hoy'))),
          h('div',{style:{textAlign:'right'}},eti('Debe rendir'),h('div',{style:{fontFamily:'Bebas Neue',fontSize:40,lineHeight:1,color:'#f7dd8c'}},money(m.total)))),
        // Paso a: revisar paquetes
        h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,margin:'14px 0 8px'}},
          h('div',{style:{display:'flex',alignItems:'center',gap:8}},h('span',{style:{fontFamily:'Bebas Neue',fontSize:15,color:'#1a1d13',background:'#e8c766',borderRadius:6,padding:'1px 7px'}},'A'),h('b',{style:{fontSize:13.5}},'Revisa los paquetes que te entrega'),h('span',{style:{fontSize:12,color:K.sub,fontWeight:700}},selI.length+' de '+m.items.length+' marcados')),
          h('button',{type:'button',onClick:function(){var o={};m.items.forEach(function(x){o[x.codigo]=!todos;});setSel(o);},style:{background:'none',border:'none',color:K.oro,fontWeight:800,fontSize:12.5,cursor:'pointer',fontFamily:'inherit'}},todos?'Desmarcar todos':'Marcar todos')),
        h('div',{style:{display:'flex',flexDirection:'column',gap:4}},Object.keys(grupos).sort().map(function(g){var dd=diasDesde(g+'T12:00:00');
          return h('div',{key:g},h('div',{style:{fontSize:11,fontWeight:900,letterSpacing:1,color:K.dim,textTransform:'uppercase',margin:'6px 2px 4px'}},'Cobrado el '+dmy(g)+(dd>=1?' · hace '+plural(dd,'día'):' · hoy')),
            grupos[g].map(function(x){var on=!!sel[x.codigo];var sinInf=!x.cobro_forma||(x.cobro_forma==='transferencia'&&!x.cobro_destino);
              return h('div',{key:x.codigo,className:'pc-it pc-fila',onClick:function(){toggle(x.codigo);},style:{padding:'9px 11px',borderRadius:10,cursor:'pointer',background:on?K.filaOn:K.fila,border:'1px solid '+(on?'rgba(232,199,102,.35)':'transparent'),opacity:on?1:.6,marginBottom:4}},
                tick(on),
                h('div',{style:{minWidth:0}},h('div',{style:{fontFamily:'JetBrains Mono, monospace',fontWeight:700,fontSize:12.5}},x.codigo),h('div',{style:{fontSize:11.5,color:K.sub,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},x.cliente||'—')),
                h('div',{className:'pc-x',style:{fontSize:12.5,fontWeight:700,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},tit(x.destinatario)),
                h('div',{className:'pc-x'},sinInf?pill(x.cobro_forma==='transferencia'?'Transferencia sin cuenta':'Forma sin informar',K.ambar,'rgba(247,197,90,.1)'):pill(formaTxt(x),K.sub)),
                h('div',{style:{fontFamily:'Bebas Neue',fontSize:21,textAlign:'right'}},money(valor(x))),botonEvi(x.codigo,(evi[x.codigo]||[]).length,function(c){setModalEv({codigo:c,info:tit(x.destinatario||'')+' · '+money(valor(x))});}),botonVer(x.codigo));}));})),
        // Paso b: confirmar monto y forma
        h('div',{style:{display:'flex',alignItems:'center',gap:8,margin:'18px 0 10px'}},h('span',{style:{fontFamily:'Bebas Neue',fontSize:15,color:'#1a1d13',background:'#e8c766',borderRadius:6,padding:'1px 7px'}},'B'),h('b',{style:{fontSize:13.5}},'Confirma cuánto te entregó y cómo')),
        h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:12}},
          h('label',{style:{display:'flex',flexDirection:'column',gap:6}},eti('Monto recibido'),h('input',{value:recibido===''?'':Number(recibido).toLocaleString('es-CL'),placeholder:money(esp),inputMode:'numeric',onChange:function(e){setRecibido(e.target.value.replace(/\D/g,''));},style:Object.assign({},inp,{fontSize:18,fontFamily:'Bebas Neue',letterSpacing:1})}),
            h('span',{style:{fontSize:11.5,color:K.dim,fontWeight:700}},'Déjalo vacío si entregó exacto')),
          h('div',{style:{display:'flex',flexDirection:'column',gap:6}},eti('Cómo lo entrega'),h('div',{className:'pc-seg',style:{display:'flex',gap:6,flexWrap:'wrap'}},[['Efectivo','Efectivo'],['Transferencia a TransPgso','Transf. a TransPgso'],['Transferencia directa al cliente','Pagó directo al cliente'],['Descuento en su pago','Desc. en su pago']].map(function(o){var on=formaRec===o[0];
            return h('button',{key:o[0],type:'button',onClick:function(){setFormaRec(o[0]);},style:{padding:'10px 8px',borderRadius:10,fontWeight:800,fontSize:12.5,cursor:'pointer',fontFamily:'inherit',border:'1px solid '+(on?'#e8c766':'rgba(255,255,255,.14)'),background:on?'rgba(232,199,102,.18)':'rgba(0,0,0,.2)',color:on?'#f7dd8c':K.sub}},o[1]);}))),
          h('label',{style:{display:'flex',flexDirection:'column',gap:6,gridColumn:'1 / -1'}},eti('Observación (opcional)'),h('input',{value:nota,onChange:function(e){setNota(e.target.value);},placeholder:'Ej: faltó un billete, lo trae mañana',style:inp}))),
        h('div',{style:{marginTop:12}},eti(formaRec==='Transferencia directa al cliente'?'Comprobante del pago al cliente (opcional)':formaRec==='Transferencia a TransPgso'?'Comprobante de la transferencia del mensajero (opcional)':'Respaldo (opcional)'),h(SelectorArchivos,{archivos:archivos,setArchivos:setArchivos,texto:formaRec==='Transferencia directa al cliente'?'Adjunta la transferencia que el mensajero hizo directo al vendedor':formaRec==='Transferencia a TransPgso'?'Adjunta la transferencia que el mensajero hizo a TransPgso':'Foto del efectivo recibido u otro respaldo'}),
          h('div',{style:{fontSize:11.5,color:K.dim,marginTop:6,fontWeight:700}},formaRec==='Transferencia directa al cliente'?'Estos paquetes quedan como pagados directo al cliente y no se le vuelven a transferir en la liquidación.':'El comprobante del pago de TransPgso al cliente se adjunta después, en el paso Liquidar.')),
        // Paso c: emitir
        h('div',{style:{marginTop:16,padding:'14px 16px',borderRadius:14,background:'rgba(0,0,0,.25)',border:'1px solid '+K.bdOro,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}},
          h('div',null,eti('Recibes'),h('div',{style:{fontFamily:'Bebas Neue',fontSize:36,lineHeight:1,color:'#f7dd8c'}},money(rec))),
          h('div',{style:{flex:1,minWidth:160}},!selI.length?h('span',{style:{color:K.ambar,fontWeight:800,fontSize:13}},'Marca al menos un paquete'):dif===0?h('span',{style:{color:K.verde,fontWeight:800,fontSize:13.5}},'✓ Cuadra con '+plural(selI.length,'paquete')):
            h('span',{style:{color:dif<0?K.rojo:K.verde,fontWeight:800,fontSize:13.5}},(dif<0?'Faltan ':'Sobran ')+money(Math.abs(dif))+' · quedará anotado en el acta')),
          boton(busy?'Registrando…':'Registrar y emitir acta',rendir,'prim',busy||!selI.length,{padding:'13px 22px',fontSize:14.5})));}
    cuerpo=h('div',{className:'pc-md'},lista,detalle);}
  // ── PASO 2: liquidación al cliente ──
  else if(tab==='liquidar'){
    var c=porCli.filter(function(x){return x.cli===selCli;})[0];var rg=rangoPer();
    var listaC=caja({padding:'14px'},titulo('¿A quién le pagamos?','Lo cobrado a sus destinatarios'),
      porCli.length===0?h('div',{style:{padding:'20px 6px',color:K.verde,fontWeight:800}},'No hay cobros pendientes de liquidar.'):
      h('div',{style:{display:'flex',flexDirection:'column',gap:6}},porCli.map(function(x){var on=x.cli===selCli;
        return h('div',{key:x.cli,className:'pc-it',onClick:function(){elegirCli(x.cli);},style:{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:12,cursor:'pointer',background:on?K.filaOn:K.fila,border:'1px solid '+(on?'#e8c766':'transparent')}},
          avatar(x.cli,on?'#e8c766':null),
          h('div',{style:{flex:1,minWidth:0}},h('div',{style:{fontWeight:800,fontSize:13.5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},x.cli),
            h('div',{style:{fontSize:11.5,fontWeight:700,color:x.sinRendir?K.ambar:K.sub}},plural(x.n,'paquete')+(x.sinRendir?' · '+x.sinRendir+' sin rendir':''))),
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:21}},money(x.total-x.directo)));})),
      liqPend.length>0&&h('div',{style:{marginTop:14,paddingTop:12,borderTop:'1px solid '+K.bd}},eti('Liquidaciones emitidas sin pagar'),
        h('div',{style:{display:'flex',flexDirection:'column',gap:6,marginTop:8}},liqPend.slice(0,8).map(function(l){return h('div',{key:l.id,style:{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:10,background:K.fila}},
          h('div',{style:{flex:1,minWidth:0}},h('div',{style:{fontWeight:800,fontSize:12.5}},l.cliente),h('div',{style:{fontSize:11,color:K.sub,fontFamily:'JetBrains Mono, monospace'}},l.numero)),
          h('b',{style:{fontSize:13}},money(l.a_transferir)),boton('Pagada',function(){pagar(l);},null,false,{padding:'5px 9px',fontSize:11.5}));}))));
    var detalleC;
    if(!c)detalleC=caja({padding:'40px 20px',textAlign:'center'},h('div',{style:{color:K.sub,fontWeight:700}},porCli.length?'Elige un cliente de la lista.':'Cuando haya cobros entregados aparecerán aquí.'));
    else{var itemsC=porLiquidar.filter(function(x){return x.cliente===selCli;}).sort(function(a,b){return a.fecha<b.fecha?-1:1;});var selL=itemsC.filter(function(x){return sel[x.codigo];});
      var totL=tot(selL),dirL=tot(selL.filter(function(x){return destinoDe(x)==='cliente';}));var sinRen=selL.filter(function(x){return !x.rendicion_id&&destinoDe(x)==='mensajero';}).length;var todosC=itemsC.length&&selL.length===itemsC.length;
      detalleC=caja({padding:'16px 18px'},
        h('div',{style:{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',paddingBottom:12,borderBottom:'1px solid '+K.bd}},avatar(c.cli,'#e8c766'),
          h('div',{style:{flex:1,minWidth:180}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:26,letterSpacing:1.2,lineHeight:1}},c.cli),h('div',{style:{fontSize:12.5,fontWeight:700,color:K.sub,marginTop:3}},plural(c.n,'cobro')+' pendiente'+(c.n>1?'s':'')+' de liquidar')),
          h('div',{style:{textAlign:'right'}},eti('Pendiente total'),h('div',{style:{fontFamily:'Bebas Neue',fontSize:40,lineHeight:1,color:'#f7dd8c'}},money(c.total-c.directo)))),
        h('div',{style:{display:'flex',alignItems:'center',gap:8,margin:'14px 0 8px'}},h('span',{style:{fontFamily:'Bebas Neue',fontSize:15,color:'#1a1d13',background:'#e8c766',borderRadius:6,padding:'1px 7px'}},'A'),h('b',{style:{fontSize:13.5}},'Elige qué período le pagas')),
        h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}},[['semana_ant','Semana pasada'],['semana','Esta semana'],['mes_ant','Mes pasado'],['mes','Este mes']].map(function(o){var on=per===o[0];
            return h('button',{key:o[0],type:'button',onClick:function(){setPer(o[0]);marcarPeriodo(selCli,o[0]);},style:{padding:'9px 13px',borderRadius:10,fontWeight:800,fontSize:12.5,cursor:'pointer',fontFamily:'inherit',border:'1px solid '+(on?'#e8c766':'rgba(255,255,255,.14)'),background:on?'rgba(232,199,102,.18)':'rgba(0,0,0,.2)',color:on?'#f7dd8c':K.sub}},o[1]);}),
          h('span',{style:{fontSize:12.5,color:K.sub,fontWeight:700,marginLeft:4}},dmy(rg[0])+' al '+dmy(rg[1]))),
        // 24-11-2026: lista agrupada por dónde está el dinero, para que sea claro qué se paga.
        (function(){var rgP=rangoPer();var dondeDe=function(x){return destinoDe(x)==='cliente'?'cliente':(x.rendicion_id||destinoDe(x)==='transpgso')?'tp':'men';};
          var GR=[['tp','Dinero en TransPgso · listo para transferir','El mensajero ya nos rindió este dinero.',K.azul],
                  ['men','Aún lo tiene el mensajero','Todavía no nos rinde. Si lo incluyes, le pagas al cliente antes de recibirlo.',K.ambar],
                  ['cliente','El cliente ya lo recibió directo','El destinatario le pagó directo al cliente. Se incluye solo para dejar registro: no se transfiere.',K.verde]];
          return h('div',null,
            h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,margin:'16px 0 4px',flexWrap:'wrap'}},
              h('div',{style:{display:'flex',alignItems:'center',gap:8}},h('span',{style:{fontFamily:'Bebas Neue',fontSize:15,color:'#1a1d13',background:'#e8c766',borderRadius:6,padding:'1px 7px'}},'B'),h('b',{style:{fontSize:13.5}},'Marca los envíos que entran en esta liquidación'),h('span',{style:{fontSize:12,color:K.sub,fontWeight:700}},selL.length+' de '+itemsC.length+' marcados')),
              h('button',{type:'button',onClick:function(){var o={};itemsC.forEach(function(x){o[x.codigo]=!todosC;});setSel(o);},style:{background:'none',border:'none',color:K.oro,fontWeight:800,fontSize:12.5,cursor:'pointer',fontFamily:'inherit'}},todosC?'Desmarcar todos':'Marcar todos')),
            h('div',{style:{fontSize:12,color:K.sub,fontWeight:600,marginBottom:10}},'El período de arriba marca solo los envíos de esas fechas. Puedes marcar o desmarcar cualquiera tocándolo.'),
            GR.map(function(g){var its=itemsC.filter(function(x){return dondeDe(x)===g[0];});if(!its.length)return null;var marc=its.filter(function(x){return sel[x.codigo];});var todosG=marc.length===its.length;
              return h('div',{key:g[0],style:{marginBottom:12,borderRadius:14,border:'1px solid '+g[3]+'44',background:'rgba(0,0,0,.14)',overflow:'hidden'}},
                h('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'10px 12px',borderBottom:'1px solid '+g[3]+'33',background:g[3]+'14'}},
                  h('span',{style:{width:10,height:10,borderRadius:'50%',background:g[3],flexShrink:0}}),
                  h('div',{style:{flex:1,minWidth:200}},h('div',{style:{fontWeight:900,fontSize:13.5,color:g[3]}},g[1]+' · '+plural(its.length,'envío')),h('div',{style:{fontSize:11.5,color:K.sub,fontWeight:700}},g[2])),
                  h('div',{style:{textAlign:'right'}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,lineHeight:1}},money(tot(its))),h('div',{style:{fontSize:11,color:K.sub,fontWeight:700}},marc.length+' marcados')),
                  h('button',{type:'button',onClick:function(){var o=Object.assign({},sel);its.forEach(function(x){o[x.codigo]=!todosG;});setSel(o);},style:{background:'none',border:'1px solid '+g[3]+'66',borderRadius:8,padding:'5px 9px',color:g[3],fontWeight:800,fontSize:11.5,cursor:'pointer',fontFamily:'inherit'}},todosG?'Quitar todos':'Marcar todos')),
                h('div',{style:{display:'flex',flexDirection:'column',gap:3,padding:6}},its.map(function(x){var on=!!sel[x.codigo];var fuera=x.fecha<rgP[0]||x.fecha>rgP[1];
                  return h('div',{key:x.codigo,className:'pc-it pc-fila',onClick:function(){toggle(x.codigo);},style:{padding:'9px 11px',borderRadius:10,cursor:'pointer',background:on?K.filaOn:K.fila,border:'1px solid '+(on?'rgba(232,199,102,.4)':'transparent')}},
                    tick(on),
                    h('div',{style:{minWidth:0}},h('div',{style:{fontFamily:'JetBrains Mono, monospace',fontWeight:700,fontSize:12.5}},x.codigo),h('div',{style:{fontSize:11.5,color:K.sub,fontWeight:700}},dmy(x.fecha)+' · '+tit(x.mensajero))),
                    h('div',{className:'pc-x',style:{fontSize:12.5,fontWeight:700,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},tit(x.destinatario)),
                    h('div',{className:'pc-x'},on?pill('Incluido',K.oro,'rgba(232,199,102,.12)'):fuera?pill('Fuera del período',K.dim):pill('No incluido',K.dim)),
                    h('div',{style:{fontFamily:'Bebas Neue',fontSize:21,textAlign:'right',color:g[0]==='cliente'?K.verde:K.txt}},money(valor(x))),botonEvi(x.codigo,(evi[x.codigo]||[]).length,function(c){setModalEv({codigo:c,info:tit(x.destinatario||'')+' · '+money(valor(x))});}),botonVer(x.codigo));})));}),
            itemsC.length===0&&h('div',{style:{color:K.sub,fontWeight:700,padding:10}},'Sin paquetes.'));})(),
        h('label',{style:{display:'flex',flexDirection:'column',gap:6,marginTop:14}},eti('Observación (opcional)'),h('input',{value:nota,onChange:function(e){setNota(e.target.value);},placeholder:'Ej: transferencia a cuenta Banco Estado',style:inp})),
        h('div',{style:{marginTop:12}},eti('Comprobante del pago al cliente (opcional)'),h(SelectorArchivos,{archivos:archL,setArchivos:setArchL,texto:'Si ya le transferiste, adjunta el comprobante; queda en el anexo del acta'})),
        h('div',{style:{marginTop:16,padding:'14px 16px',borderRadius:14,background:'rgba(0,0,0,.25)',border:'1px solid '+K.bdOro,display:'flex',alignItems:'center',gap:18,flexWrap:'wrap'}},
          h('div',null,eti('Cobrado'),h('div',{style:{fontFamily:'Bebas Neue',fontSize:24,lineHeight:1}},money(totL))),
          h('div',{style:{color:K.dim,fontWeight:900}},'−'),
          h('div',null,eti('Ya lo recibió directo'),h('div',{style:{fontFamily:'Bebas Neue',fontSize:24,lineHeight:1,color:K.verde}},money(dirL))),
          h('div',{style:{color:K.dim,fontWeight:900}},'='),
          h('div',null,eti('Le transferimos'),h('div',{style:{fontFamily:'Bebas Neue',fontSize:36,lineHeight:1,color:'#f7dd8c'}},money(totL-dirL))),
          h('div',{style:{flex:1,minWidth:150,fontSize:12.5,fontWeight:800,color:sinRen?K.ambar:K.verde}},!selL.length?'Marca al menos un envío':sinRen?'Ojo: '+plural(sinRen,'envío')+' de esta liquidación aún lo tiene el mensajero':plural(selL.length,'envío')+' · todo el dinero ya está en TransPgso o con el cliente'),
          boton(busy?'Emitiendo…':'Emitir liquidación',liquidar,'prim',busy||!selL.length,{padding:'13px 22px',fontSize:14.5})));}
    cuerpo=h('div',{className:'pc-md'},listaC,detalleC);}
  // ── PASO 3: actas e informe del mes ──
  else{var rensMes=(rens||[]).filter(function(r){return String(r.fecha).slice(0,7)===mes;});var liqMes=(liqs||[]).filter(function(l){return String(l.fecha).slice(0,7)===mes;});
    var resumenMes=(function(){var R={};rensMes.forEach(function(r){var k=r.mensajero;var o=R[k]=R[k]||{men:k,n:0,esp:0,rec:0};o.n+=(r.codigos||[]).length;o.esp+=+r.total_esperado;o.rec+=+r.monto_recibido;});return Object.keys(R).map(function(k){return R[k];}).sort(function(a,b){return b.rec-a.rec;});})();
    var sumR=rensMes.reduce(function(s,r){return s+(+r.monto_recibido||0);},0),sumL=liqMes.reduce(function(s,l){return s+(+l.a_transferir||0);},0),sumLp=liqMes.filter(function(l){return l.estado==='pagada';}).reduce(function(s,l){return s+(+l.a_transferir||0);},0);
    var kpi=function(l,v,d,col){return h('div',{style:{padding:'12px 14px',borderRadius:14,background:K.fila,border:'1px solid '+K.bd}},eti(l),h('div',{style:{fontFamily:'Bebas Neue',fontSize:30,lineHeight:1,marginTop:5,color:col||K.txt}},v),h('div',{style:{fontSize:12,fontWeight:700,color:K.sub,marginTop:2}},d));};
    var filaActa=function(a,liq){return h('div',{key:a.id,style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'10px 12px',borderRadius:12,background:K.fila,marginBottom:6}},
      h('span',{style:{fontFamily:'JetBrains Mono, monospace',fontWeight:700,fontSize:12.5,padding:'4px 9px',borderRadius:7,background:'rgba(232,199,102,.14)',border:'1px solid '+K.bdOro,color:K.oro}},a.numero),
      h('div',{style:{flex:1,minWidth:200}},h('div',{style:{fontWeight:800,fontSize:13.5}},liq?a.cliente:tit(a.mensajero)),h('div',{style:{fontSize:11.5,color:K.sub,fontWeight:700}},plural((a.codigos||[]).length,'paquete')+' · '+dmy(a.fecha)+(liq?' · período '+dmy(a.desde)+' al '+dmy(a.hasta):(a.forma_recibo?' · '+a.forma_recibo:'')))),
      h('div',{style:{fontFamily:'Bebas Neue',fontSize:22}},money(liq?a.a_transferir:a.monto_recibido)),
      liq&&(a.estado==='pagada'?pill('Pagada '+dmy(a.pagada_fecha),K.verde):pill('Por pagar',K.ambar)),
      boton('Ver / PDF',function(){verActa(liq?'liq':'ren',a);},'prim'),boton('Comprobantes'+((a.comprobantes||[]).length?' ('+a.comprobantes.length+')':''),function(){setModal({tipo:liq?'liq':'ren',a:a});}),boton('Excel',function(){excelActa(liq?'liq':'ren',a);}),
      liq&&a.estado!=='pagada'&&boton('Marcar pagada',function(){pagar(a);}),
      esAdmin&&!(liq&&a.estado==='pagada')&&boton('Eliminar',function(){eliminar(liq?'liquidacion':'rendicion',a);},'peligro'));};
    cuerpo=h('div',{style:{display:'flex',flexDirection:'column',gap:14}},
      caja(null,h('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:14}},
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:24,letterSpacing:1.3,flex:1}},'Informe de ',h('span',{style:{color:K.oro}},MESES[+mes.slice(5,7)-1]+' '+mes.slice(0,4))),
          h('input',{type:'month',value:mes,onChange:function(e){setMes(e.target.value);},style:Object.assign({},inp,{width:170,padding:'8px 10px',colorScheme:'dark'})}),
          boton('Descargar Excel del mes',function(){var ex=A.exportToExcel;if(!ex)return;ex('Por_cobrar_'+mes,[{name:'Rendiciones',headers:['Número','Fecha','Mensajero','Paquetes','A rendir','Recibido','Diferencia','Forma','Recibió'],rows:rensMes.map(function(r){return [r.numero,dmy(r.fecha),r.mensajero,(r.codigos||[]).length,+r.total_esperado,+r.monto_recibido,(+r.monto_recibido)-(+r.total_esperado),r.forma_recibo||'',r.recibido_por||''];})},
            {name:'Liquidaciones',headers:['Número','Fecha','Cliente','Desde','Hasta','Paquetes','Cobrado','Directo al cliente','A transferir','Estado','Pagada','Referencia'],rows:liqMes.map(function(l){return [l.numero,dmy(l.fecha),l.cliente,dmy(l.desde),dmy(l.hasta),(l.codigos||[]).length,+l.total_cobrado,+l.directo_cliente,+l.a_transferir,l.estado,l.pagada_fecha?dmy(l.pagada_fecha):'',l.pagada_ref||''];})}]);},'prim')),
        h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10}},
          kpi('Rendido por mensajeros',money(sumR),plural(rensMes.length,'acta')+' de rendición','#f7dd8c'),
          kpi('Liquidado a clientes',money(sumL),plural(liqMes.length,'liquidación','liquidaciones')),
          kpi('Ya pagado',money(sumLp),'transferido a clientes',K.verde),
          kpi('Falta pagar',money(sumL-sumLp),'liquidaciones emitidas sin pagar',sumL-sumLp>0?K.ambar:K.verde))),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(380px,1fr))',gap:14,alignItems:'start'}},
        caja(null,titulo('Mensajeros en el mes','Lo que rindió cada uno y si cuadró'),resumenMes.length===0?h('div',{style:{color:K.sub,fontWeight:700}},'Sin rendiciones este mes.'):
          resumenMes.map(function(r){var d=r.rec-r.esp;return h('div',{key:r.men,style:{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,background:K.fila,marginBottom:6}},avatar(r.men),
            h('div',{style:{flex:1,minWidth:0}},h('div',{style:{fontWeight:800,fontSize:13.5}},tit(r.men)),h('div',{style:{fontSize:11.5,color:K.sub,fontWeight:700}},plural(r.n,'paquete'))),
            h('div',{style:{textAlign:'right'}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:20}},money(r.rec)),d===0?pill('Cuadra',K.verde):pill((d<0?'Faltó ':'Sobró ')+money(Math.abs(d)),d<0?K.rojo:K.verde)));})),
        caja(null,titulo('Liquidaciones a clientes ('+liqMes.length+')','Lo que debemos transferir y lo ya pagado'),liqMes.length===0?h('div',{style:{color:K.sub,fontWeight:700}},'Ninguna este mes.'):liqMes.map(function(a){return filaActa(a,true);}))),
      caja(null,titulo('Actas de rendición ('+rensMes.length+')','Firmadas por cada mensajero al entregar lo cobrado'),rensMes.length===0?h('div',{style:{color:K.sub,fontWeight:700}},'Ninguna este mes.'):rensMes.map(function(a){return filaActa(a,false);})));}
  return h('div',{style:{color:K.txt}},cabecera,cuerpo,modal&&h(ModalComprobantes,{key:modal.a.id+modal.tipo,m:modal,toast:toast,onClose:function(){setModal(null);},onCambio:cargar}),modalEv&&h(ModalEvidencia,{key:modalEv.codigo,codigo:modalEv.codigo,info:modalEv.info,tipo:tab==='liquidar'?'pago':'cobro',toast:toast,onClose:function(){setModalEv(null);},onCambio:function(){cargarEvidencias((pend||[]).map(function(x){return x.codigo;})).then(setEvi).catch(function(){});}}));
}
window.PorCobrar=PorCobrar;
})();
