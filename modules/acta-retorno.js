// Actas de retorno (16-11-2026). Respaldo profesional de lo que TransPgso devuelve a cada cliente.
// El acta se arma sola en la base (tabla actas_retorno): cada envío que pasa a 'retorno' se suma al
// acta de su cliente y día. Aquí: la lista (Informes y portal del cliente) y el documento PDF/Excel.
(function(){
var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo;
var A=window.__app||{};var db=A.db;
var EMPRESA={nombre:'TransPgso SpA',rut:'78.143.701-8',dir:'Exposición 902, Santiago Centro',correo:'contacto@transpgso.cl',fono:'+56 9 4211 2940',web:'www.transpgso.cl'};
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function dmy(s){if(!s)return '—';var p=String(s).slice(0,10).split('-');return p[2]+'-'+p[1]+'-'+p[0];}
function largo(s){var p=String(s).slice(0,10).split('-');return (+p[2])+' de '+MESES[+p[1]-1]+' de '+p[0];}
function hora(ts){if(!ts)return '';return new Date(ts).toLocaleTimeString('es-CL',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit'});}
function tit(s){return String(s||'').toLowerCase().replace(/(^|[\s(])\S/g,function(m){return m.toUpperCase();});}
function motivoLimpio(m){var s=String(m||'').trim();if(!s)return 'Devolución al remitente';return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase();}

async function traerDatos(id){var r=await db.rpc('acta_retorno_datos',{p_id:id});if(r.error)throw r.error;if(!r.data)throw new Error('Acta no encontrada');return r.data;}

function htmlActa(d){
  var a=d.acta||{},c=d.cliente||{},F=(d.filas||[]).slice();
  var origen=location.origin;
  var porMotivo={},porComuna={};
  F.forEach(function(f){var m=motivoLimpio(f.motivo);porMotivo[m]=(porMotivo[m]||0)+1;var co=tit(f.comuna||'Sin comuna');porComuna[co]=(porComuna[co]||0)+1;});
  var motivos=Object.keys(porMotivo).map(function(k){return [k,porMotivo[k]];}).sort(function(x,y){return y[1]-x[1];});
  var nCom=Object.keys(porComuna).length;var conInt=F.filter(function(f){return (+f.intentos||0)>0;}).length;
  var verInt=conInt>0,verMot=motivos.length>1;
  var emitido=new Date().toLocaleString('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  var dato=function(l,v){return '<div class="dato"><span>'+esc(l)+'</span><b>'+(v?esc(v):'—')+'</b></div>';};
  var filas=F.map(function(f,i){return '<tr><td class="n">'+(i+1)+'</td><td class="mono">'+esc(f.codigo)+'</td><td>'+esc(tit(f.destinatario)||'—')+'</td><td>'+esc(f.direccion||'—')+'</td><td>'+esc(tit(f.comuna)||'—')+'</td><td class="c">'+dmy(f.fecha_recepcion)+'</td>'+(verInt?'<td class="c">'+(+f.intentos||0)+'</td>':'')+(verMot?'<td>'+esc(motivoLimpio(f.motivo))+'</td>':'')+'</tr>';}).join('');
  var resumen=motivos.map(function(m){var p=F.length?Math.round(m[1]/F.length*100):0;return '<tr><td>'+esc(m[0])+'</td><td class="c">'+m[1]+'</td><td class="barra"><div><i style="width:'+p+'%"></i></div><span>'+p+'%</span></td></tr>';}).join('');
  return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  +'<title>Acta de retorno '+esc(a.numero)+' · '+esc(a.cliente)+'</title>'
  +'<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">'
  +'<style>'
  +'*{box-sizing:border-box;margin:0;padding:0}body{font-family:"DM Sans",Arial,sans-serif;color:#2b2e20;background:#e9e5d8;font-size:12px;line-height:1.45}'
  +'.acc{position:sticky;top:0;z-index:5;display:flex;gap:8px;justify-content:center;padding:10px;background:#2b2e20}.acc button{font:800 13px "DM Sans",Arial;padding:9px 18px;border-radius:9px;border:1px solid #f7dd8c;background:linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829);color:#1a1d13;cursor:pointer;box-shadow:0 3px 0 #6d531a}.acc button.sec{background:#3a3d2e;color:#f1ecda;border-color:#6d6a55;box-shadow:0 3px 0 #15170f}'
  +'.hoja{width:210mm;min-height:297mm;margin:16px auto;background:#fff;padding:16mm 15mm 14mm;box-shadow:0 10px 30px rgba(0,0,0,.18);position:relative}'
  +'.cab{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:12px;border-bottom:3px solid #C8A84B}'
  +'.marca{display:flex;gap:12px;align-items:center}.marca img{width:62px;height:62px;border-radius:12px;object-fit:cover;border:2px solid #C8A84B}.marca h1{font-family:"Bebas Neue";font-size:28px;letter-spacing:2px;color:#3A3D2E;line-height:1}.marca p{font-size:10.5px;color:#5f5e4c;line-height:1.4}'
  +'.doc{text-align:right}.doc .tipo{font-family:"Bebas Neue";font-size:30px;letter-spacing:2px;color:#3A3D2E;line-height:1}.doc .num{display:inline-block;margin-top:6px;padding:5px 12px;border-radius:8px;background:#3A3D2E;color:#e8c766;font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:700;letter-spacing:.5px}.doc p{font-size:10.5px;color:#5f5e4c;margin-top:5px}'
  +'.bloque{margin-top:14px}.bloque h2{font-family:"Bebas Neue";font-size:15px;letter-spacing:1.6px;color:#8a6d1f;margin-bottom:6px}'
  +'.cli{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;padding:12px 14px;border:1px solid #e3dbc4;border-radius:10px;background:#fbf8f0}.dato span{display:block;font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;color:#7a7766}.dato b{font-size:12px;color:#2b2e20}'
  +'.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.kpi{border:1px solid #e3dbc4;border-radius:10px;padding:10px 12px;background:linear-gradient(180deg,#fff,#f6f1e2)}.kpi b{display:block;font-family:"Bebas Neue";font-size:28px;line-height:1;color:#3A3D2E}.kpi span{font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;color:#7a7766}.kpi.dest b{color:#8a6d1f}'
  +'table{width:100%;border-collapse:collapse}thead{display:table-header-group}th{background:#3A3D2E;color:#f1ecda;font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;text-align:left;padding:7px 8px}td{padding:6px 8px;border-bottom:1px solid #ece6d4;vertical-align:top}tr{page-break-inside:avoid}tbody tr:nth-child(even) td{background:#fbf8f0}'
  +'td.n{color:#9a9684;width:26px}td.c{text-align:center;white-space:nowrap}.mono{font-family:"JetBrains Mono",monospace;font-size:11px}'
  +'.barra{width:46%}.barra div{display:inline-block;width:calc(100% - 44px);height:8px;border-radius:4px;background:#efe8d4;vertical-align:middle;overflow:hidden}.barra i{display:block;height:100%;background:linear-gradient(90deg,#C8A84B,#8a6d1f)}.barra span{display:inline-block;width:40px;text-align:right;font-weight:700}'
  +'.decl{margin-top:16px;padding:12px 14px;border-left:4px solid #C8A84B;background:#fbf8f0;font-size:11.5px;color:#3d3f32}'
  +'.firmas{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:34px;page-break-inside:avoid}.firma .linea{height:56px;border-bottom:1.5px solid #3A3D2E}.firma h3{font-family:"Bebas Neue";font-size:15px;letter-spacing:1.4px;color:#3A3D2E;margin-top:6px}.firma p{font-size:10.5px;color:#5f5e4c;margin-top:3px}'
  +'.pie{margin-top:22px;padding-top:8px;border-top:1px solid #e3dbc4;display:flex;justify-content:space-between;font-size:9.5px;color:#8a8775}'
  +'.vacio{padding:24px;text-align:center;color:#7a7766;border:1px dashed #d8cfb6;border-radius:10px}'
  +'@page{size:A4;margin:12mm}@media print{body{background:#fff}.acc{display:none}.hoja{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}}'
  +'@media screen and (max-width:820px){.hoja{width:auto;margin:0;padding:18px 14px}.cli,.kpis{grid-template-columns:1fr 1fr}.cab{flex-direction:column}.doc{text-align:left}table{font-size:10.5px}}'
  +'</style></head><body>'
  +'<div class="acc"><button onclick="window.print()">Descargar PDF / Imprimir</button><button class="sec" onclick="window.close()">Cerrar</button></div>'
  +'<div class="hoja">'
  +'<div class="cab"><div class="marca"><img src="'+origen+'/logo.jpg" alt="TransPgso"><div><h1>TRANSPGSO</h1><p>'+esc(EMPRESA.nombre)+' · RUT '+EMPRESA.rut+'<br>'+esc(EMPRESA.dir)+'<br>'+EMPRESA.correo+' · '+EMPRESA.fono+'</p></div></div>'
  +'<div class="doc"><div class="tipo">Acta de retorno</div><div class="num">N° '+esc(a.numero)+'</div><p>Fecha del retorno: <b>'+largo(a.fecha)+'</b><br>Emitida: '+emitido+'</p></div></div>'
  +'<div class="bloque"><h2>Cliente</h2><div class="cli">'+dato('Cliente',c.nombre||a.cliente)+dato('Razón social',c.razon_social)+dato('RUT',c.rut)+dato('Dirección',[c.direccion,tit(c.comuna)].filter(Boolean).join(', '))+dato('Contacto',c.contacto)+dato('Correo',c.correo)+'</div></div>'
  +'<div class="bloque"><h2>Resumen</h2><div class="kpis"><div class="kpi dest"><b>'+F.length+'</b><span>Paquetes devueltos</span></div><div class="kpi"><b>'+nCom+'</b><span>Comunas</span></div><div class="kpi"><b>'+conInt+'</b><span>Con intento de entrega</span></div><div class="kpi"><b style="font-size:16px;line-height:1.15;padding-top:6px">'+esc(motivos[0]?motivos[0][0]:'—')+'</b><span>Motivo principal</span></div></div></div>'
  +(verMot?'<div class="bloque"><h2>Motivos de la devolución</h2><table><thead><tr><th>Motivo</th><th style="text-align:center">Paquetes</th><th>Proporción</th></tr></thead><tbody>'+resumen+'</tbody></table></div>':'')
  +'<div class="bloque"><h2>Detalle de paquetes devueltos</h2>'+(F.length?'<table><thead><tr><th>#</th><th>Código</th><th>Destinatario</th><th>Dirección</th><th>Comuna</th><th style="text-align:center">Recibido</th>'+(verInt?'<th style="text-align:center">Intentos</th>':'')+(verMot?'<th>Motivo</th>':'')+'</tr></thead><tbody>'+filas+'</tbody></table>':'<div class="vacio">Los paquetes de esta acta ya no figuran en estado retorno.</div>')+'</div>'
  +'<div class="decl">'+esc(EMPRESA.nombre)+' hace entrega a <b>'+esc(c.razon_social||c.nombre||a.cliente)+'</b> de los <b>'+F.length+'</b> paquetes detallados en esta acta, devueltos sin entregar a su destinatario por los motivos indicados. Con la firma de este documento, el cliente declara recibirlos conforme en cantidad y estado.</div>'
  +'<div class="firmas"><div class="firma"><div class="linea"></div><h3>Entrega · '+esc(EMPRESA.nombre)+'</h3><p>Nombre: ______________________ RUT: ______________</p></div><div class="firma"><div class="linea"></div><h3>Recibe conforme · '+esc(c.nombre||a.cliente)+'</h3><p>Nombre: ______________________ RUT: ______________</p><p>Fecha y hora: ____________________</p></div></div>'
  +'<div class="pie"><span>Documento generado por el sistema de '+esc(EMPRESA.nombre)+' · '+EMPRESA.web+'</span><span>'+esc(a.numero)+' · '+F.length+' paquetes</span></div>'
  +'</div></body></html>';
}

async function abrir(id,toast){
  var w=window.open('','_blank');
  if(w){try{w.document.write('<p style="font-family:sans-serif;padding:30px;color:#555">Preparando acta…</p>');}catch(e){}}
  try{if(typeof id==='function')id=await id();var d=await traerDatos(id);var html=htmlActa(d);
    if(w&&!w.closed){w.document.open();w.document.write(html);w.document.close();}
    else{var blob=new Blob([html],{type:'text/html'});var u=URL.createObjectURL(blob);window.open(u,'_blank');}
  }catch(e){if(w&&!w.closed)w.close();(toast||alert)('No se pudo abrir el acta: '+(e.message||e));}
}
async function excel(id,toast){
  try{var d=await traerDatos(id),a=d.acta||{};var F=d.filas||[];
    var rows=F.map(function(f,i){return [i+1,f.codigo,tit(f.destinatario),f.direccion||'',tit(f.comuna),dmy(f.fecha_recepcion),+f.intentos||0,motivoLimpio(f.motivo),f.retornado_at?dmy(String(new Date(f.retornado_at).toLocaleDateString('en-CA',{timeZone:'America/Santiago'})))+' '+hora(f.retornado_at):''];});
    A.exportToExcel('ACTA DE RETORNO '+a.numero+' '+String(a.cliente||'').replace(/[\\\/:*?"<>|]/g,'')+' '+dmy(a.fecha),[{name:'Acta '+a.numero,headers:['#','Código','Destinatario','Dirección','Comuna','Recibido','Intentos','Motivo','Retornado'],rows:rows}]);
  }catch(e){(toast||alert)('No se pudo exportar: '+(e.message||e));}
}

// Panel (16-11-2026, versión 2): una tarjeta por cliente con sus paquetes en retorno que aún no
// están en ninguna acta. Al abrir el cliente se marcan los paquetes y se genera el acta (N° correlativo).
// props.cliente => modo portal: solo la lista de actas emitidas para ese cliente.
var ESTILO={txt:'#f1ecda',sub:'rgba(233,228,210,.7)',fila:'rgba(255,255,255,.05)',bd:'rgba(255,255,255,.1)',
  caja:{borderRadius:20,background:'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 50%,#15180f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 18px 38px rgba(20,22,15,.25), inset 0 1px 0 rgba(255,255,255,.07)',color:'#f1ecda',padding:'18px 20px'}};
var CLARO={txt:'#2b2e20',sub:'#5f5e4c',fila:'#fbf8f0',bd:'rgba(43,46,32,.1)',
  caja:{borderRadius:18,background:'#fff',border:'1px solid rgba(43,46,32,.12)',boxShadow:'0 4px 0 #e3dbc4, 0 10px 24px rgba(20,22,15,.06)',color:'#2b2e20',padding:'18px 20px'}};
function boton(C,t,on,tipo,dis){var prim=tipo==='prim',peligro=tipo==='peligro';
  return h('button',{type:'button',onClick:on,disabled:!!dis,style:{padding:'8px 14px',borderRadius:10,border:'1px solid '+(prim?'#f7dd8c':peligro?'rgba(176,48,48,.6)':'rgba(200,168,75,.5)'),
    background:prim?'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)':peligro?'rgba(176,48,48,.15)':(C===ESTILO?'rgba(255,255,255,.06)':'#fff'),
    color:prim?'#1a1d13':peligro?'#ff9b9b':C.txt,fontWeight:800,fontSize:12.5,cursor:dis?'default':'pointer',opacity:dis?.5:1,whiteSpace:'nowrap',boxShadow:prim?'0 3px 0 #6d531a':'none'}},t);}
function fechaHora(ts){if(!ts)return '—';var d=new Date(ts);return d.toLocaleDateString('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit'})+' '+hora(ts);}
function diaCL(ts){return ts?new Date(ts).toLocaleDateString('en-CA',{timeZone:'America/Santiago'}):'';}
function plural(n,s,p){return n+' '+(n===1?s:(p||s+'s'));}

function FilaActa(p){var a=p.a,C=p.C,n=(a.codigos||[]).length;
  return h('div',{style:{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',padding:'12px 14px',borderRadius:14,background:C.fila,border:'1px solid '+C.bd}},
    h('div',{style:{fontFamily:'JetBrains Mono, monospace',fontWeight:700,fontSize:13,padding:'5px 10px',borderRadius:8,background:'#3A3D2E',color:'#e8c766',whiteSpace:'nowrap'}},a.numero),
    h('div',{style:{flex:'1 1 220px',minWidth:0}},h('div',{style:{fontWeight:800,fontSize:14}},largo(a.fecha)),
      h('div',{style:{fontSize:12,color:C.sub}},plural(n,'paquete')+(a.emitida_por&&!p.portal?' · emitida por '+tit(a.emitida_por):''))),
    h('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},boton(C,'Ver acta / PDF',function(){abrir(a.id,p.toast);},'prim'),boton(C,'Excel',function(){excel(a.id,p.toast);}),
      p.onAnular&&boton(C,'Anular',function(){p.onAnular(a);},'peligro')));}

function ActasPortal(props){var C=CLARO,toast=props.toast||function(m){alert(m);};
  var _l=useState(null),lista=_l[0],setLista=_l[1];
  function cargar(){db.from('actas_retorno').select('id,numero,cliente,fecha,codigos').ilike('cliente',props.cliente).order('fecha',{ascending:false}).order('id',{ascending:false}).limit(300)
    .then(function(r){setLista(r.error?[]:(r.data||[]));});}
  useEffect(function(){cargar();var st=A.intervaloVisible?A.intervaloVisible(cargar,300000,['envios'],8000):null;return function(){if(typeof st==='function')st();};},[props.cliente]);
  return h('div',{style:C.caja},
    h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:2,lineHeight:1,color:'#3A3D2E'}},'Actas de retorno'),
    h('div',{style:{fontSize:12.5,color:C.sub,margin:'4px 0 14px'}},'Respaldo de los paquetes que te devolvimos, con su detalle. Descárgalas en PDF o Excel.'),
    lista==null?h('div',{style:{color:C.sub}},'Cargando…'):lista.length===0?h('div',{style:{color:C.sub,fontWeight:700}},'Aún no hay actas de retorno.'):
    h('div',{style:{display:'flex',flexDirection:'column',gap:8}},lista.map(function(a){return h(FilaActa,{key:a.id,a:a,C:C,toast:toast,portal:true});})));}

function ActasRetorno(props){
  if(props.cliente)return h(ActasPortal,props);
  var C=ESTILO,toast=props.toast||function(m){alert(m);};
  var esAdmin=!!(A.perfil&&(A.perfil.esAdmin||A.perfil.esSuperAdmin))||props.esAdmin;
  var _p=useState(null),pend=_p[0],setPend=_p[1];
  var _a=useState([]),actas=_a[0],setActas=_a[1];
  var _c=useState(null),cli=_c[0],setCli=_c[1];
  var _t=useState('pend'),tab=_t[0],setTab=_t[1];
  var _r=useState('7'),rango=_r[0],setRango=_r[1];
  var _q=useState(''),q=_q[0],setQ=_q[1];
  var _qc=useState(''),qc=_qc[0],setQc=_qc[1];
  var _s=useState({}),sel=_s[0],setSel=_s[1];
  var _g=useState(false),gen=_g[0],setGen=_g[1];
  function cargar(){
    db.rpc('retornos_pendientes',{p_cliente:null}).then(function(r){if(r.error){toast('No se pudieron cargar los retornos: '+r.error.message);setPend([]);return;}setPend(r.data||[]);});
    db.from('actas_retorno').select('id,numero,cliente,fecha,codigos,emitida_por').order('id',{ascending:false}).limit(1000).then(function(r){if(!r.error)setActas(r.data||[]);});
  }
  useEffect(function(){cargar();var st=A.intervaloVisible?A.intervaloVisible(cargar,120000,['envios'],5000):null;return function(){if(typeof st==='function')st();};},[]);
  // Si un paquete marcado deja de estar pendiente (otro usuario lo ingresó o cambió de estado), se desmarca solo.
  useEffect(function(){if(!pend)return;var ok={};pend.forEach(function(x){ok[x.codigo]=1;});var cambia=false,n={};Object.keys(sel).forEach(function(k){if(ok[k])n[k]=1;else cambia=true;});if(cambia)setSel(n);},[pend]);
  var hoy=A.fechaHoyCL?A.fechaHoyCL():diaCL(Date.now());
  var desde7=diaCL(Date.now()-6*86400000);
  var mesIni=hoy.slice(0,7)+'-01';
  var porCli=useMemo(function(){var o={};
    (pend||[]).forEach(function(x){var k=x.cliente;var c=o[k]||(o[k]={cliente:k,pend:0,hoy:0,sem:0,ult:null,actasMes:0,ultActa:null});c.pend++;var d=diaCL(x.retornado_at);if(d===hoy)c.hoy++;if(d>=desde7)c.sem++;if(x.retornado_at&&(!c.ult||x.retornado_at>c.ult))c.ult=x.retornado_at;});
    actas.forEach(function(a){var c=o[a.cliente]||(o[a.cliente]={cliente:a.cliente,pend:0,hoy:0,sem:0,ult:null,actasMes:0,ultActa:null});if(a.fecha>=mesIni)c.actasMes++;if(!c.ultActa)c.ultActa=a;});
    return Object.keys(o).map(function(k){return o[k];}).sort(function(x,y){return (y.sem-x.sem)||(y.pend-x.pend)||x.cliente.localeCompare(y.cliente);});
  },[pend,actas]);
  var titulo=h('div',{style:{marginBottom:14}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:2,lineHeight:1,color:'#fff'}},'Actas de retorno'),
    h('div',{style:{fontSize:12.5,color:C.sub,marginTop:4}},'Cada cliente muestra sus paquetes en retorno que todavía no van en un acta. Entra al cliente, marca los paquetes que le devuelves y genera el acta. El cliente la ve también en su portal.'));

  if(!cli){
    var visC=porCli.filter(function(c){return !qc||c.cliente.toLowerCase().indexOf(qc.toLowerCase())>=0;});
    var totSem=porCli.reduce(function(s,c){return s+c.sem;},0),totHoy=porCli.reduce(function(s,c){return s+c.hoy;},0);
    return h('div',{style:C.caja},titulo,
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:12}},
        h('input',{placeholder:'Buscar cliente',value:qc,onChange:function(e){setQc(e.target.value);},style:{padding:'8px 10px',borderRadius:10,border:'1px solid rgba(232,199,102,.4)',fontSize:13,width:220,maxWidth:'100%'}}),
        h('span',{style:{marginLeft:'auto',fontSize:12.5,color:C.sub}},pend==null?'Cargando…':plural(totHoy,'paquete')+' en retorno hoy · '+plural(totSem,'paquete')+' en los últimos 7 días sin acta')),
      pend==null?h('div',{style:{padding:20,color:C.sub}},'Cargando…'):visC.length===0?h('div',{style:{padding:20,color:C.sub,fontWeight:700}},'No hay paquetes en retorno.'):
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:10}},visC.map(function(c){var activo=c.sem>0;
        return h('button',{key:c.cliente,type:'button',className:'ix-hub-card',onClick:function(){setCli(c.cliente);setSel({});setQ('');setTab(c.pend?'pend':'actas');setRango(c.sem?'7':'todo');},
          style:{textAlign:'left',cursor:'pointer',padding:'14px 16px',borderRadius:16,color:C.txt,border:'1px solid '+(activo?'rgba(232,199,102,.65)':'rgba(255,255,255,.12)'),
            background:activo?'linear-gradient(150deg,rgba(232,199,102,.22),rgba(176,138,46,.08) 60%,rgba(255,255,255,.03))':'linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02))'}},
          h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}},
            h('div',{style:{fontWeight:800,fontSize:15,lineHeight:1.2}},c.cliente),
            c.hoy>0&&h('span',{style:{padding:'2px 8px',borderRadius:999,background:'#b03030',color:'#fff',fontSize:11,fontWeight:800,whiteSpace:'nowrap'}},c.hoy+' hoy')),
          h('div',{style:{display:'flex',alignItems:'baseline',gap:8,marginTop:8}},
            h('span',{style:{fontFamily:'Bebas Neue',fontSize:38,lineHeight:1,color:activo?'#ffe59a':'rgba(255,255,255,.55)'}},c.sem),
            h('span',{style:{fontSize:11.5,color:C.sub,lineHeight:1.25}},'por ingresar',h('br'),'últimos 7 días')),
          h('div',{style:{fontSize:11.5,color:C.sub,marginTop:6}},(c.pend>c.sem?plural(c.pend-c.sem,'más antiguo')+' sin acta · ':'')+(c.ultActa?'última acta '+c.ultActa.numero:'sin actas aún')));})));
  }

  // Detalle de un cliente
  var lista=(pend||[]).filter(function(x){return x.cliente===cli;});
  var vis=lista.filter(function(x){var d=diaCL(x.retornado_at);if(rango==='hoy'&&d!==hoy)return false;if(rango==='7'&&d<desde7)return false;
    if(q){var s=q.toLowerCase();if(String(x.codigo).toLowerCase().indexOf(s)<0&&String(x.destinatario||'').toLowerCase().indexOf(s)<0&&String(x.comuna||'').toLowerCase().indexOf(s)<0)return false;}return true;});
  var nSel=lista.filter(function(x){return sel[x.codigo];}).length;
  var todosVis=vis.length>0&&vis.every(function(x){return sel[x.codigo];});
  var actasCli=actas.filter(function(a){return a.cliente===cli;});
  function marcarVis(v){var n=Object.assign({},sel);vis.forEach(function(x){if(v)n[x.codigo]=1;else delete n[x.codigo];});setSel(n);}
  function generar(){if(!nSel||gen)return;var cods=lista.filter(function(x){return sel[x.codigo];}).map(function(x){return x.codigo;});setGen(true);
    abrir(function(){return db.rpc('crear_acta_retorno',{p_cliente:cli,p_codigos:cods}).then(function(r){setGen(false);if(r.error)throw r.error;setSel({});cargar();setTab('actas');toast('Acta generada con '+plural(cods.length,'paquete'));return r.data;},function(e){setGen(false);throw e;});},toast);}
  function anular(a){if(!window.confirm('Anular el acta '+a.numero+'? Sus '+(a.codigos||[]).length+' paquetes vuelven a quedar por ingresar. El número no se reutiliza.'))return;
    db.rpc('anular_acta_retorno',{p_id:a.id}).then(function(r){if(r.error){toast('No se pudo anular: '+r.error.message);return;}toast('Acta '+a.numero+' anulada');cargar();});}
  var chip=function(k,t){var on=rango===k;return h('button',{key:k,type:'button',onClick:function(){setRango(k);},style:{padding:'6px 12px',borderRadius:999,border:'1px solid '+(on?'#e8c766':'rgba(255,255,255,.18)'),background:on?'rgba(232,199,102,.2)':'transparent',color:on?'#ffe59a':C.txt,fontWeight:800,fontSize:12,cursor:'pointer'}},t);};
  var tabB=function(k,t){var on=tab===k;return h('button',{type:'button',onClick:function(){setTab(k);},style:{padding:'8px 14px',border:'none',borderBottom:'3px solid '+(on?'#e8c766':'transparent'),background:'transparent',color:on?'#ffe59a':C.sub,fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1.2,cursor:'pointer'}},t);};
  var th={textAlign:'left',padding:'8px 10px',fontSize:10.5,letterSpacing:.8,textTransform:'uppercase',color:'rgba(233,228,210,.65)',borderBottom:'1px solid rgba(255,255,255,.12)',whiteSpace:'nowrap'};
  var td={padding:'8px 10px',borderBottom:'1px solid rgba(255,255,255,.06)',fontSize:13,verticalAlign:'top',color:C.txt,background:'transparent'};
  return h('div',{style:C.caja},
    h('div',{style:{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:6}},
      boton(C,'‹ Clientes',function(){setCli(null);setSel({});}),
      h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:1.6,lineHeight:1,color:'#fff'}},cli)),
    h('div',{style:{display:'flex',gap:4,borderBottom:'1px solid rgba(255,255,255,.1)',marginBottom:12}},tabB('pend','Por ingresar ('+lista.length+')'),tabB('actas','Actas emitidas ('+actasCli.length+')')),
    tab==='actas'?(actasCli.length===0?h('div',{style:{padding:20,color:C.sub,fontWeight:700}},'Este cliente aún no tiene actas.'):
      h('div',{style:{display:'flex',flexDirection:'column',gap:8}},actasCli.map(function(a){return h(FilaActa,{key:a.id,a:a,C:C,toast:toast,onAnular:esAdmin?anular:null});}))):
    h('div',null,
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:10}},
        chip('hoy','Hoy'),chip('7','Últimos 7 días'),chip('todo','Todos'),
        h('input',{placeholder:'Buscar código, destinatario o comuna',value:q,onChange:function(e){setQ(e.target.value);},style:{padding:'7px 10px',borderRadius:10,border:'1px solid rgba(232,199,102,.4)',fontSize:13,width:260,maxWidth:'100%'}}),
        h('span',{style:{marginLeft:'auto',fontSize:12.5,color:C.sub}},plural(vis.length,'paquete')+' en la vista')),
      vis.length===0?h('div',{style:{padding:20,color:C.sub,fontWeight:700}},lista.length?'No hay paquetes en este rango. Prueba con "Todos".':'Este cliente no tiene paquetes por ingresar.'):
      h('div',{style:{overflowX:'auto',borderRadius:12,border:'1px solid rgba(255,255,255,.08)'}},h('table',{style:{width:'100%',borderCollapse:'collapse',color:C.txt}},
        h('thead',null,h('tr',null,h('th',{style:Object.assign({},th,{width:36})},h('input',{type:'checkbox',checked:todosVis,onChange:function(e){marcarVis(e.target.checked);},style:{width:17,height:17,accentColor:'#C8A84B'}})),
          h('th',{style:th},'Código'),h('th',{style:th},'Destinatario'),h('th',{style:th},'Comuna'),h('th',{style:th},'Recibido'),h('th',{style:th},'Retornado'))),
        h('tbody',null,vis.map(function(x){var on=!!sel[x.codigo];
          return h('tr',{key:x.codigo,onClick:function(){var n=Object.assign({},sel);if(on)delete n[x.codigo];else n[x.codigo]=1;setSel(n);},style:{cursor:'pointer',background:on?'rgba(232,199,102,.12)':'transparent'}},
            h('td',{style:td},h('input',{type:'checkbox',checked:on,readOnly:true,style:{width:17,height:17,accentColor:'#C8A84B',pointerEvents:'none'}})),
            h('td',{style:Object.assign({},td,{fontFamily:'JetBrains Mono, monospace',fontSize:12.5})},x.codigo),
            h('td',{style:td},tit(x.destinatario)||'—'),h('td',{style:td},tit(x.comuna)||'—'),
            h('td',{style:Object.assign({},td,{whiteSpace:'nowrap'})},dmy(x.fecha)),
            h('td',{style:Object.assign({},td,{whiteSpace:'nowrap',color:C.sub,fontSize:12})},fechaHora(x.retornado_at)+(x.retornado_por?' · '+tit(x.retornado_por):'')));})))),
      h('div',{style:{position:'sticky',bottom:0,marginTop:12,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'12px 14px',borderRadius:14,background:'rgba(20,22,15,.92)',border:'1px solid rgba(232,199,102,.35)',backdropFilter:'blur(6px)'}},
        h('div',{style:{fontWeight:800}},nSel?plural(nSel,'paquete seleccionado','paquetes seleccionados'):'Marca los paquetes que le devuelves al cliente'),
        nSel>0&&boton(C,'Quitar selección',function(){setSel({});}),
        h('div',{style:{marginLeft:'auto'}},boton(C,gen?'Generando…':'Generar acta de retorno',generar,'prim',!nSel||gen))))
  );
}
window.ActaRetorno={abrir:abrir,excel:excel,html:htmlActa};
window.ActasRetorno=ActasRetorno;
})();
