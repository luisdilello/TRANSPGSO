// Supervisión (05-11-2026): oficina en 3D de los administrativos + estadísticas, movimientos y
// recomendaciones según la necesidad operativa. Solo Super Admin.
// Datos: RPC supervision_datos(p_desde,p_hasta) (historial_envios, reportes_operador,
// correcciones_estado, acciones_masivas_log y el pulso del panel en actividad_staff).
// El pulso lo manda index.html cada minuto desde el panel de cada admin/operador.
(function(){
var A=window.__app||{};
var db=A.db, fechaHoyCL=A.fechaHoyCL;
var h=React.createElement, useState=React.useState, useEffect=React.useEffect, useRef=React.useRef, useMemo=React.useMemo;

var SECCIONES={
  dashboard:['Dashboard','Revisando el dashboard'],
  envios:['Gestión de Envíos','Gestionando envíos'],
  'consulta-express':['Consulta Express','Consultando envíos'],
  importar:['Importar','Importando datos'],
  analitica:['Analítica','Revisando analítica'],
  etiquetas:['Etiquetas','Imprimiendo etiquetas'],
  pagos:['Pagos y Cobros','Trabajando en pagos y cobros'],
  siniestros:['Siniestros','Gestionando siniestros'],
  firmas:['Firmas Operadores','Firmando entregas'],
  'firmas-vivo':['Firmas en Vivo','Revisando evidencias en vivo'],
  incidencias:['Incidencias','Revisando incidencias'],
  informes:['Informes','Preparando informes'],
  operaciones:['Novedades del día','Revisando novedades del día'],
  'colecta-admin':['Colecta','Controlando la colecta'],
  cierre:['Cierre de Mes','Trabajando en el cierre de mes'],
  usuarios:['Usuarios','Administrando usuarios'],
  clientes:['Clientes','Revisando clientes'],
  mensajeros:['Mensajeros','Revisando mensajeros'],
  comunicados:['Comunicados','Enviando comunicados'],
  'cierre-flex':['Cierre Flex','Revisando cierres Flex'],
  'mapa-rutas':['Mapas y Rutas','Planificando rutas'],
  comunas:['Comunas','Revisando comunas'],
  market:['Pgso Market','Gestionando Pgso Market']
};
function secLabel(s){return (SECCIONES[s]&&SECCIONES[s][0])||(s||'—');}
function secAccion(s){return (SECCIONES[s]&&SECCIONES[s][1])||('En '+secLabel(s));}

var ESTADO_LBL={en_bodega:'En bodega',en_bodega_fecha:'Bodega por fecha',en_ruta:'En ruta',reprogramado:'Reprogramado',entregado:'Entregado',cancelado:'Cancelado',en_bodega_cancelado:'Bodega cancelado',retorno:'Retorno',siniestro:'Siniestro'};
var TIPO_LBL={
  firma_entregado:'Entregas firmadas', asignacion:'Asignaciones a mensajero', correccion:'Correcciones de estado', colecta:'Colecta / retiro',
  reporte:'Incidencias reportadas', resuelto:'Incidencias resueltas', masiva:'Acciones masivas'
};
function tipoLbl(t){if(TIPO_LBL[t])return TIPO_LBL[t];if(t.indexOf('firma_')===0)return 'Gestión de entrega: '+(ESTADO_LBL[t.slice(6)]||t.slice(6));if(t.indexOf('estado_')===0)return 'Cambio a '+(ESTADO_LBL[t.slice(7)]||t.slice(7));return t;}
var COLOR_T={firma_entregado:'#2e9d5b',asignacion:'#c8a84b',correccion:'#d32f2f',colecta:'#00897b',reporte:'#7b1fa2',resuelto:'#1565c0',masiva:'#f57c00'};
function colorTipo(t){if(COLOR_T[t])return COLOR_T[t];if(t.indexOf('firma_')===0)return '#43a047';var e=t.slice(7);return ({en_bodega:'#5d8aa8',en_ruta:'#c8a84b',reprogramado:'#8e24aa',en_bodega_fecha:'#3949ab',siniestro:'#e65100',cancelado:'#c62828',en_bodega_cancelado:'#6d4c41',retorno:'#455a64',entregado:'#2e7d32'})[e]||'#78909c';}

var PERS=['#4f8cff','#ff8a3d','#36c98e','#c56bff','#ffd23f','#ff5d8f','#2ec4d6','#a3d65c'];
function sumaD(f,d){var x=new Date(f+'T12:00:00');x.setDate(x.getDate()+d);return x.toISOString().slice(0,10);}
function dmy(f){return f?f.split('-').reverse().join('-'):'';}
function hhmm(min){min=Math.round(min||0);var hh=Math.floor(min/60),mm=min%60;return hh+'h '+(mm<10?'0':'')+mm+'m';}
function horaCL(ts){try{return new Date(ts).toLocaleTimeString('es-CL',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});}catch(e){return '';}}
function hace(ts){var s=Math.max(0,(Date.now()-new Date(ts).getTime())/1000);if(s<60)return 'hace segundos';if(s<3600)return 'hace '+Math.round(s/60)+' min';return 'hace '+Math.floor(s/3600)+' h '+Math.round((s%3600)/60)+' min';}
function fmt(n){return Number(n||0).toLocaleString('es-CL');}
function inic(n){return String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(function(p){return p[0];}).join('').toUpperCase();}
function nombreCorto(n){var p=String(n||'').split(/\s+/);return p[0]?(p[0][0]+p[0].slice(1).toLowerCase()):n;}

// ---------- procesamiento ----------
function procesar(D,fecha,esHoy,F){
  var staff=(D.staff||[]).map(function(s,i){return Object.assign({},s,{color:PERS[i%PERS.length]});});
  var P={};
  staff.forEach(function(s){
    P[s.nombre]={s:s,horas:Array.from({length:24},function(){return{con:0,act:0,acc:0};}),secc:{},tipos:{},tipos7:{},dias:{},acc:0,con:0,act:0,firmas:0,asig:0,estados:0,corr:0,rep:0,res:0,mas:0,masEnv:0,pulso:null,primera:null,ultima:null};
  });
  for(var i=0;i<7;i++){var d=sumaD(fecha,-i);staff.forEach(function(s){P[s.nombre].dias[d]={acc:0,con:0,act:0};});}
  function suma(a,d,hr,tipo,n){var p=P[a];if(!p)return;if(p.dias[d]){p.dias[d].acc+=n;}p.tipos7[tipo]=(p.tipos7[tipo]||0)+n;if(d!==fecha)return;p.horas[hr].acc+=n;p.tipos[tipo]=(p.tipos[tipo]||0)+n;p.acc+=n;}
  (D.acciones||[]).forEach(function(r){if(r.t==='correccion')return suma(r.a,r.d,r.h,'correccion_hist',0);suma(r.a,r.d,r.h,r.t,r.n);var p=P[r.a];if(!p||r.d!==fecha)return;if(r.t==='firma_entregado'||r.t.indexOf('firma_')===0)p.firmas+=r.n;else if(r.t==='asignacion')p.asig+=r.n;else if(r.t.indexOf('estado_')===0||r.t==='colecta')p.estados+=r.n;});
  (D.reportes||[]).forEach(function(r){suma(r.a,r.d,r.h,'reporte',r.n);if(P[r.a]&&r.d===fecha)P[r.a].rep+=r.n;});
  (D.resueltos||[]).forEach(function(r){suma(r.a,r.d,r.h,'resuelto',r.n);if(P[r.a]&&r.d===fecha)P[r.a].res+=r.n;});
  (D.correcciones||[]).forEach(function(r){suma(r.a,r.d,r.h,'correccion',r.n);if(P[r.a]&&r.d===fecha)P[r.a].corr+=r.n;});
  (D.masivas||[]).forEach(function(r){suma(r.a,r.d,r.h,'masiva',r.n);if(P[r.a]&&r.d===fecha){P[r.a].mas+=r.n;P[r.a].masEnv+=r.c;}});
  (D.presencia||[]).forEach(function(r){var p=P[r.u];if(!p)return;if(p.dias[r.d]){p.dias[r.d].con+=r.m;p.dias[r.d].act+=r.act;}if(r.d!==fecha)return;p.horas[r.h].con+=r.m;p.horas[r.h].act+=r.act;p.secc[r.s]=(p.secc[r.s]||0)+r.m;p.con+=r.m;p.act+=r.act;});
  (D.pulso||[]).forEach(function(r){if(P[r.u])P[r.u].pulso=r;});
  var ahoraMin=null;if(esHoy){var hc=new Date().toLocaleTimeString('en-GB',{timeZone:'America/Santiago',hour12:false}).split(':');ahoraMin=(+hc[0])*60+(+hc[1]);}
  staff.forEach(function(s){var p=P[s.nombre];var t=tramos(((D.minutos||{})[s.nombre])||[],ahoraMin);p.tramos=t.L;p.inact=t.inact;p.oculto=t.oculto;p.desc=t.desc;p.pausas=t.pausas;p.pausaMax=t.pausaMax;});
  staff.forEach(function(s){var p=P[s.nombre];
    for(var hr=0;hr<24;hr++){if(p.horas[hr].acc>0||p.horas[hr].con>0){if(p.primera==null)p.primera=hr;p.ultima=hr;}}
    var est='desconectado';
    if(esHoy&&p.pulso){var edad=(Date.now()-new Date(p.pulso.ts).getTime())/1000;if(edad<200)est=(p.pulso.act&&p.pulso.vis)?'activo':'ausente';}
    p.estado=est;
    p.sinActDesde=(p.pulso&&p.pulso.ult_act)?p.pulso.ult_act:(p.pulso?p.pulso.ini:null);
    p.minSinAct=(esHoy&&p.sinActDesde&&est!=='activo')?Math.round((Date.now()-new Date(p.sinActDesde).getTime())/60000):0;
    p.minDesc=(esHoy&&est==='desconectado'&&p.pulso)?Math.round((Date.now()-new Date(p.pulso.ts).getTime())/60000):0;
    p.prod=p.act>5?p.acc/(p.act/60):null;
    var dsum=0,dn=0;Object.keys(p.dias).forEach(function(d){if(d!==fecha&&p.dias[d].acc>0){dsum+=p.dias[d].acc;dn++;}});p.prom7=dn?dsum/dn:null;
    // especialidad (7 días)
    var g={'Soporte Firmas':0,'Bodega y asignación':0,'Control y correcciones':0,'Supervisión de evidencias':0};
    Object.keys(p.tipos7).forEach(function(t){var n=p.tipos7[t];if(t.indexOf('firma_')===0)g['Soporte Firmas']+=n;else if(t==='asignacion'||t==='estado_en_bodega'||t==='estado_en_ruta'||t==='colecta'||t==='masiva')g['Bodega y asignación']+=n;else if(t==='correccion'||t==='estado_reprogramado'||t==='estado_siniestro'||t==='estado_en_bodega_fecha'||t==='estado_cancelado'||t==='estado_en_bodega_cancelado'||t==='estado_retorno')g['Control y correcciones']+=n;else if(t==='reporte'||t==='resuelto')g['Supervisión de evidencias']+=n*8;});
    var best=Object.keys(g).sort(function(a,b){return g[b]-g[a];})[0];p.esp=g[best]>0?best:'Sin actividad reciente';
    // últimos minutos sin acciones
    p.accUltHora=esHoy?(p.horas[(D.necesidad&&D.necesidad.hora)||0]||{acc:0}).acc:0;
  });
  // Soporte Firmas: operador (HIRAM / LIZ) -> usuario del equipo; mensajero -> operador
  var sop={},opDe={};
  ((F&&F.soporte)||[]).forEach(function(o){var st=staff.find(function(s){return s.nombre.indexOf(String(o.op).toUpperCase())===0;});var nom=st?st.nombre:o.op;(o.mens||[]).forEach(function(m){opDe[normN(m)]=nom;});sop[nom]={op:o.op,mens:o.mens||[],staff:st||null};});
  return {staff:staff,P:P,riders:procesarRiders(D.riders,opDe,(F&&F.rafagas)||{}),soporte:sop,opDe:opDe,panel:(F&&F.panel)||[],rafagas:(F&&F.rafagas)||{}};
}

// Línea de tiempo del día a partir del pulso por minuto: [minuto, 1 activo | 2 abierto sin actividad | 3 ventana oculta, sección]
function tramos(arr,ahoraMin){
  var L=[],inact=0,oculto=0,desc=0,pausas=0,pausaMax=0;
  var TIPO={1:'activo',2:'inactivo',3:'oculto'};
  arr.forEach(function(x,i){var mi=x[0],f=x[1],sec=x[2];var ult=L[L.length-1];
    if(f===2)inact++;if(f===3)oculto++;
    if(ult&&mi-ult.fin<=2&&ult.tipo===TIPO[f]){ult.fin=mi+1;return;}
    if(ult&&mi-ult.fin>2){L.push({ini:ult.fin,fin:mi,tipo:'desconectado'});desc+=mi-ult.fin;}
    else if(ult){ult.fin=Math.max(ult.fin,mi);}
    L.push({ini:mi,fin:mi+1,tipo:TIPO[f],s:sec});});
  if(ahoraMin!=null&&L.length){var u=L[L.length-1];if(ahoraMin-u.fin>3){L.push({ini:u.fin,fin:ahoraMin,tipo:'desconectado',actual:true});desc+=ahoraMin-u.fin;}}
  L.forEach(function(t){var d=t.fin-t.ini;if((t.tipo==='inactivo'||t.tipo==='oculto')&&d>=3){pausas++;}if(t.tipo!=='activo'&&d>pausaMax)pausaMax=d;});
  return {L:L,inact:inact,oculto:oculto,desc:desc,pausas:pausas,pausaMax:pausaMax};
}
function hm(mi){var hh=Math.floor(mi/60),mm=mi%60;return (hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm;}
function durTxt(min){min=Math.round(min||0);if(min<1)return 'menos de 1 min';if(min<60)return min+' min';return Math.floor(min/60)+' h '+(min%60)+' min';}
function normN(n){return String(n||'').toUpperCase().replace(/,\s*/g,' ').replace(/\s+/g,' ').trim();}
function procesarRiders(R,opDe,raf){opDe=opDe||{};raf=raf||{};
  var L=(R||[]).map(function(r){var hrs=Math.max(1,(new Date(r.fin)-new Date(r.ini))/3600000);return {u:r.u,n:r.n,ini:r.ini,fin:r.fin,hrs:hrs,vel:r.n/hrs,sop:opDe[normN(r.u)]||null,r30:raf[r.u]||0};});
  var top=L.filter(function(r){return r.n>=10&&!r.sop&&r.r30<20;}).sort(function(a,b){return b.vel-a.vel;}).slice(0,5);
  var enTop={};top.forEach(function(r){enTop[r.u]=1;});
  var resto=L.filter(function(r){return !enTop[r.u];}).sort(function(a,b){return b.n-a.n;});
  return {top:top,resto:resto,total:L.reduce(function(a,r){return a+r.n;},0),n:L.length};
}
function necesidades(N){
  if(!N)return [];
  var L=[];
  function add(k,n,txt,sev,tipos,accion){if(n>0)L.push({k:k,n:n,txt:txt,sev:sev,tipos:tipos,accion:accion});}
  add('bodega',N.en_bodega_hoy,'paquetes en bodega por asignar',N.en_bodega_hoy>60?3:N.en_bodega_hoy>15?2:1,['asignacion','estado_en_bodega','estado_en_ruta','masiva'],'Asignar a mensajeros');
  add('sinmens',N.en_ruta_sin_mensajero,'envíos en ruta sin mensajero asignado',3,['asignacion','correccion'],'Asignar mensajero');
  add('atrasados',N.atrasados,'envíos atrasados (más de 1 día sin cerrar)',N.atrasados>40?3:2,['correccion','estado_reprogramado','estado_en_bodega_fecha','estado_siniestro'],'Revisar y gestionar');
  add('reprog',N.reprogramado,'reprogramados por volver a ruta',N.reprogramado>40?2:1,['estado_reprogramado','asignacion','estado_en_bodega_fecha'],'Reasignar');
  add('cancel',N.cancelado,'cancelados por recibir en bodega',N.cancelado>20?2:1,['estado_en_bodega_cancelado','estado_retorno','estado_cancelado'],'Recibir en bodega');
  add('incid',N.incidencias_pend,'incidencias de mensajeros sin resolver',N.incidencias_pend>50?2:1,['resuelto','reporte','correccion'],'Revisar y marcar resueltas');
  add('sini',N.siniestros_pend,'siniestros sin confirmar',N.siniestros_pend>5?2:1,['estado_siniestro','correccion'],'Confirmar o descartar');
  var faltan=Math.max(0,(N.riders_con_entregas_hoy||0)-(N.cierres_flex_hoy||0));
  if(N.hora>=17)add('flex',faltan,'mensajeros con entregas hoy sin Cierre Flex subido',faltan>10?2:1,['reporte','resuelto','correccion'],'Pedir el video de cierre');
  return L.sort(function(a,b){return b.sev-a.sev||b.n-a.n;});
}
function recomendaciones(Ns,M,esHoy){
  var R=[];if(!M)return R;
  var orden={activo:0,ausente:1,desconectado:2};
  Ns.forEach(function(nd){
    var cands=M.staff.map(function(s){var p=M.P[s.nombre];var sk=0;nd.tipos.forEach(function(t){sk+=(p.tipos7[t]||0);});return{p:p,sk:sk};}).filter(function(c){return c.sk>0||c.p.estado!=='desconectado';});
    cands.sort(function(a,b){return (b.sk-a.sk)||(orden[a.p.estado]-orden[b.p.estado]);});
    var top=cands[0];
    var con=cands.filter(function(x){return x.p.estado!=='desconectado'&&x.sk>=Math.max(1,(top?top.sk:0)*0.2);}).sort(function(a,b){return (orden[a.p.estado]-orden[b.p.estado])||(b.sk-a.sk);})[0];
    var c=con||top;
    if(!c){R.push({sev:nd.sev,quien:null,txt:nd.accion+': '+fmt(nd.n)+' '+nd.txt+'. Nadie del equipo lo ha trabajado esta semana.'});return;}
    var por=c.sk>0?(fmt(c.sk)+' movimientos de este tipo en 7 días'):'está conectado ahora';
    R.push({sev:nd.sev,quien:c.p.s,txt:nd.accion+' — '+fmt(nd.n)+' '+nd.txt+'.',por:nombreCorto(c.p.s.nombre)+' '+(c.p.estado==='activo'?'está activo':c.p.estado==='ausente'?'tiene el panel abierto':'no está conectado')+' y es quien más lo trabaja ('+por+').'});
  });
  var porOp={};
  (M.riders.resto.concat(M.riders.top)).forEach(function(r){
    if(r.sop&&r.n>=3){(porOp[r.sop]=porOp[r.sop]||[]).push(r);}
    else if(!r.sop&&r.r30>=20)R.push({sev:2,quien:null,txt:r.u+' marcó '+r.r30+' entregas en 30 minutos.',por:'Firmas en serie: revisar si las hizo en terreno o si alguien firmó por él.'});
  });
  Object.keys(porOp).forEach(function(op){var L=porOp[op];var tot=L.reduce(function(a,r){return a+r.n;},0);var st=M.staff.find(function(x){return x.nombre===op;});
    R.push({sev:2,quien:st||null,txt:fmt(tot)+' entregas atendidas por '+nombreCorto(op)+' se firmaron desde la cuenta del mensajero, no desde su usuario.',por:L.map(function(r){return r.u+' '+r.n;}).join(' · ')+'. Debe firmarlas en Firmas Operadores con su propio usuario.'});});
  if(esHoy){
    M.staff.forEach(function(s){var p=M.P[s.nombre];
      if(p.estado==='ausente'&&p.minSinAct>=3)R.push({sev:p.minSinAct>=15?3:2,quien:s,txt:nombreCorto(s.nombre)+' lleva '+durTxt(p.minSinAct)+' con el sistema abierto sin mover nada.',por:'Última actividad '+(p.sinActDesde?horaCL(p.sinActDesde):'—')+' en '+secLabel(p.pulso&&p.pulso.s)+(p.pulso&&p.pulso.vis===false?' · la ventana está minimizada o en otra pestaña':'')+'.'});
      if(p.estado==='desconectado'&&p.pulso&&p.minDesc<600&&p.minDesc>=20)R.push({sev:1,quien:s,txt:nombreCorto(s.nombre)+' se desconectó hace '+durTxt(p.minDesc)+'.',por:'Última señal '+horaCL(p.pulso.ts)+' en '+secLabel(p.pulso.s)+'.'});
      if(p.estado==='activo'&&p.accUltHora===0&&p.act>30)R.push({sev:1,quien:s,txt:nombreCorto(s.nombre)+' está activo en '+secLabel(p.pulso&&p.pulso.s)+' pero sin movimientos registrados en esta hora.',por:'Puede estar revisando sin dejar registro; vale la pena confirmar en qué está.'});
      if(p.prom7&&p.acc<p.prom7*0.4&&p.con>120)R.push({sev:1,quien:s,txt:nombreCorto(s.nombre)+' lleva '+fmt(p.acc)+' movimientos hoy, bajo su promedio de '+fmt(Math.round(p.prom7))+'.',por:'Conectado '+hhmm(p.con)+' hoy.'});
    });
  }
  return R.sort(function(a,b){return b.sev-a.sev;}).slice(0,10);
}

// ---------- oficina 3D ----------
function cargarThree(){
  if(window.THREE)return Promise.resolve(window.THREE);
  return new Promise(function(res,rej){var s=document.createElement('script');s.src='vendor/three-0.149.0.min.js';s.onload=function(){window.THREE?res(window.THREE):rej(new Error('three'));};s.onerror=function(){rej(new Error('three'));};document.head.appendChild(s);});
}
function webglOk(){try{var c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl2')||c.getContext('webgl')));}catch(e){return false;}}

function textoCanvas(T,lineas,w,hgt,fondo){
  var c=document.createElement('canvas');c.width=w;c.height=hgt;var x=c.getContext('2d');
  if(fondo){x.fillStyle=fondo;x.fillRect(0,0,w,hgt);}
  lineas.forEach(function(l){x.font=l.font;x.fillStyle=l.color;x.textAlign=l.align||'left';x.textBaseline='middle';x.fillText(l.t,l.x,l.y);});
  var t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=8;return t;
}
function rr(x,X,Y,W,H,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+W,Y,X+W,Y+H,r);x.arcTo(X+W,Y+H,X,Y+H,r);x.arcTo(X,Y+H,X,Y,r);x.arcTo(X,Y,X+W,Y,r);x.closePath();}
function pantallaCanvas(T,p,col,modo){
  var w=512,hh=320,c=document.createElement('canvas');c.width=w;c.height=hh;var x=c.getContext('2d');
  var on=p&&p.estado!=='desconectado';
  var g=x.createLinearGradient(0,0,w,hh);g.addColorStop(0,on?'#0c1f2a':'#07080a');g.addColorStop(1,on?'#061016':'#040506');x.fillStyle=g;x.fillRect(0,0,w,hh);
  if(on&&modo===2){
    x.fillStyle='#e8f4ff';x.font='bold 22px sans-serif';x.textBaseline='middle';x.fillText('JORNADA DE HOY',20,24);
    var CT={activo:'#3dffa0',inactivo:'#ffcc4d',oculto:'#ff8a3d',desconectado:'#30363d'};var i0=7*60,i1=24*60;
    x.fillStyle='#161b22';x.fillRect(20,60,w-40,40);(p.tramos||[]).forEach(function(tr){var a=Math.max(i0,tr.ini),b=Math.min(i1,tr.fin);if(b<=a)return;x.fillStyle=CT[tr.tipo];x.fillRect(20+(a-i0)/(i1-i0)*(w-40),60,Math.max(2,(b-a)/(i1-i0)*(w-40)),40);});
    x.fillStyle='#8fb3c8';x.font='16px sans-serif';[8,12,16,20,24].forEach(function(hr){x.fillText(String(hr),20+(hr*60-i0)/(i1-i0)*(w-40)-6,118);});
    x.fillStyle='#ffffff';x.font='bold 40px sans-serif';x.fillText(hhmm(p.con),20,170);x.fillStyle='#8fb3c8';x.font='16px sans-serif';x.fillText('conectado',20,200);
    x.fillStyle='#3dffa0';x.font='bold 40px sans-serif';x.fillText(hhmm(p.act),190,170);x.fillStyle='#8fb3c8';x.font='16px sans-serif';x.fillText('activo',190,200);
    x.fillStyle='#ffcc4d';x.font='bold 40px sans-serif';x.fillText(hhmm(p.inact+p.oculto),350,170);x.fillStyle='#8fb3c8';x.font='16px sans-serif';x.fillText('sin actividad',350,200);
    x.fillStyle='#e8f4ff';x.font='18px sans-serif';x.fillText((p.pausas||0)+' pausas · la más larga '+durTxt(p.pausaMax||0),20,250);
  }else if(on){
    var c1=p.estado==='activo'?'#3dffa0':'#ffcc4d';
    x.fillStyle='rgba(255,255,255,0.05)';x.fillRect(0,0,w,40);
    x.fillStyle=c1;x.beginPath();x.arc(20,20,7,0,7);x.fill();
    x.fillStyle='#e8f4ff';x.font='bold 22px sans-serif';x.textBaseline='middle';x.fillText(secLabel(p.pulso&&p.pulso.s).toUpperCase().slice(0,26),36,21);
    // filas tipo tabla
    for(var i=0;i<6;i++){x.fillStyle=i%2?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.08)';x.fillRect(16,56+i*22,300,16);x.fillStyle=col;x.fillRect(16,56+i*22,40+((i*53+(p.acc||0))%200),16);}
    var hs=p.horas.slice(8,23),mx=Math.max.apply(null,hs.map(function(q){return q.acc;}).concat([1]));
    hs.forEach(function(q,i){var bh=Math.round(q.acc/mx*110);var gg=x.createLinearGradient(0,300-bh,0,300);gg.addColorStop(0,c1);gg.addColorStop(1,'rgba(61,255,160,0.15)');x.fillStyle=gg;x.fillRect(16+i*20,300-bh,13,bh);});
    x.fillStyle='#ffffff';x.font='bold 64px sans-serif';x.textAlign='right';x.fillText(fmt(p.acc),w-20,110);
    x.fillStyle='#8fb3c8';x.font='18px sans-serif';x.fillText('movimientos hoy',w-20,152);
  }else{x.fillStyle='#1b1f24';x.font='bold 22px sans-serif';x.textAlign='center';x.fillText('SIN SESIÓN',w/2,hh/2);}
  var t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=8;return t;
}
function ciudadCanvas(T){
  var w=2048,hh=640,c=document.createElement('canvas');c.width=w;c.height=hh;var x=c.getContext('2d');
  var g=x.createLinearGradient(0,0,0,hh);g.addColorStop(0,'#0a1230');g.addColorStop(0.55,'#1d2a55');g.addColorStop(1,'#3d2a3a');x.fillStyle=g;x.fillRect(0,0,w,hh);
  for(var k=0;k<120;k++){x.fillStyle='rgba(255,255,255,'+(Math.random()*0.7)+')';x.fillRect(Math.random()*w,Math.random()*hh*0.4,1.5,1.5);}
  x.fillStyle='rgba(255,240,200,0.9)';x.beginPath();x.arc(w*0.82,90,26,0,7);x.fill();
  // cordillera
  x.fillStyle='#232848';x.beginPath();x.moveTo(0,hh*0.62);for(var i=0;i<=20;i++){x.lineTo(i*w/20,hh*(0.42+Math.sin(i*1.3)*0.07+Math.random()*0.04));}x.lineTo(w,hh);x.lineTo(0,hh);x.fill();
  x.fillStyle='rgba(235,240,255,0.5)';for(var j=0;j<20;j++){var px=j*w/20;x.beginPath();x.moveTo(px-25,hh*0.47);x.lineTo(px,hh*0.43);x.lineTo(px+25,hh*0.47);x.fill();}
  var X=0;while(X<w){var bw=40+Math.random()*110,bh=120+Math.random()*360;var y=hh-bh;x.fillStyle=['#0f1424','#131a2e','#0c1120','#161d33'][Math.floor(Math.random()*4)];x.fillRect(X,y,bw,bh);
    for(var yy=y+10;yy<hh-8;yy+=14)for(var xx=X+6;xx<X+bw-8;xx+=12){if(Math.random()<0.38){x.fillStyle=Math.random()<0.8?'rgba(255,214,140,0.85)':'rgba(160,210,255,0.8)';x.fillRect(xx,yy,6,8);}}
    if(Math.random()<0.25){x.fillStyle='#ff4040';x.fillRect(X+bw/2-2,y-6,4,4);}
    X+=bw+4;}
  // Gran Torre
  x.fillStyle='#10162a';x.beginPath();x.moveTo(w*0.4,hh);x.lineTo(w*0.405,hh-560);x.lineTo(w*0.43,hh-580);x.lineTo(w*0.455,hh-560);x.lineTo(w*0.46,hh);x.fill();
  for(var t2=hh-550;t2<hh;t2+=10){x.fillStyle='rgba(150,200,255,0.55)';x.fillRect(w*0.41,t2,w*0.045,2);}
  var t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;
}
function videoWallCanvas(T,RD,logoImg){
  var w=2048,hh=1152,c=document.createElement('canvas');c.width=w;c.height=hh;var x=c.getContext('2d');
  var g=x.createLinearGradient(0,0,w,hh);g.addColorStop(0,'#0b0f0a');g.addColorStop(1,'#141a10');x.fillStyle=g;x.fillRect(0,0,w,hh);
  x.strokeStyle='rgba(200,168,75,0.10)';x.lineWidth=1;for(var gx=0;gx<w;gx+=64){x.beginPath();x.moveTo(gx,0);x.lineTo(gx,hh);x.stroke();}
  if(logoImg&&logoImg.complete){var lw=300,lh=lw*logoImg.height/logoImg.width;x.drawImage(logoImg,60,40,lw,lh);}
  x.fillStyle='#c8a84b';x.font='bold 64px sans-serif';x.textBaseline='middle';x.fillText('MENSAJEROS MÁS RÁPIDOS HOY',400,90);
  x.fillStyle='#9aa08e';x.font='34px sans-serif';x.fillText(fmt(RD.total)+' entregas · '+RD.n+' mensajeros en ruta · entregas por hora entre su primera y última entrega',402,150);
  var medal=['#f3d27a','#d9d9d9','#e2a56c','#8fb3c8','#8fb3c8'];
  RD.top.forEach(function(r,i){var y=230+i*150;
    var gg=x.createLinearGradient(60,0,1180,0);gg.addColorStop(0,'rgba(200,168,75,'+(i===0?0.35:0.18)+')');gg.addColorStop(1,'rgba(200,168,75,0.02)');x.fillStyle=gg;rr(x,60,y,1120,128,22);x.fill();
    x.fillStyle=medal[i];x.beginPath();x.arc(130,y+64,46,0,7);x.fill();x.fillStyle='#1a1d13';x.font='bold 54px sans-serif';x.textAlign='center';x.fillText(String(i+1),130,y+66);
    x.textAlign='left';x.fillStyle='#ffffff';x.font='bold 52px sans-serif';x.fillText(r.u.slice(0,22),205,y+48);
    x.fillStyle='#9aa08e';x.font='30px sans-serif';x.fillText(fmt(r.n)+' entregas · '+horaCL(r.ini)+' a '+horaCL(r.fin),207,y+98);
    x.textAlign='right';x.fillStyle='#3dffa0';x.font='bold 88px sans-serif';x.fillText(r.vel.toFixed(1),1140,y+56);x.fillStyle='#7fcfa5';x.font='26px sans-serif';x.fillText('entregas / hora',1140,y+106);x.textAlign='left';});
  if(!RD.top.length){x.fillStyle='#9aa08e';x.font='40px sans-serif';x.fillText('Aún no hay mensajeros con 10 o más entregas hoy.',80,320);}
  // resto
  x.fillStyle='#c8a84b';x.font='bold 40px sans-serif';x.fillText('RESTO DEL EQUIPO · ENTREGAS',1250,230);
  var R=RD.resto.slice(0,26),mx=Math.max.apply(null,R.map(function(r){return r.n;}).concat([1]));
  var colN=R.length>13?2:1,porCol=Math.ceil(R.length/colN),cw=colN===2?370:740;
  R.forEach(function(r,i){var col=Math.floor(i/porCol),row=i%porCol;var X=1250+col*(cw+18),y=275+row*64;
    x.fillStyle='rgba(255,255,255,0.05)';rr(x,X,y,cw,52,12);x.fill();
    var bw=Math.max(6,(cw-20)*r.n/mx);x.fillStyle='rgba(61,255,160,0.18)';rr(x,X,y,bw,52,12);x.fill();
    x.fillStyle=r.sop?'#ffb27a':'#e8eadf';x.font='bold 26px sans-serif';x.fillText(r.u.slice(0,colN===2?17:30)+(r.sop?' *':''),X+14,y+27);
    x.textAlign='right';x.fillStyle='#ffffff';x.font='bold 32px sans-serif';x.fillText(fmt(r.n),X+cw-14,y+28);x.textAlign='left';});
  if(RD.resto.length>26){x.fillStyle='#9aa08e';x.font='26px sans-serif';x.fillText('+'+(RD.resto.length-26)+' más',1250,hh-40);}
  x.fillStyle='#5b5f55';x.font='24px sans-serif';x.textAlign='right';x.fillText('* firmado desde la cuenta por Soporte Firmas · Actualizado '+horaCL(new Date()),w-40,hh-36);
  var t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=8;return t;
}
function glowTex(T,color){var c=document.createElement('canvas');c.width=c.height=128;var x=c.getContext('2d');var g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);var t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;}

function Oficina3D(props){
  var ref=useRef(null),overlay=useRef(null),api=useRef(null),ultProps=useRef(props);ultProps.current=props;
  var _err=useState(null),err=_err[0],setErr=_err[1];
  var _vp=useState(false),verP=_vp[0],setVerP=_vp[1];
  var M=props.M;
  useEffect(function(){
    if(!webglOk()){setErr('Este equipo no soporta 3D; se muestra la vista simple.');return;}
    var vivo=true,cleanup=null;
    cargarThree().then(function(T){if(!vivo)return;cleanup=montar(T);}).catch(function(){setErr('No se pudo cargar el motor 3D.');});
    function montar(T){
      if(T.ColorManagement)T.ColorManagement.legacyMode=false;
      var el=ref.current;var W=el.clientWidth,H=el.clientHeight;
      var renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.setSize(W,H);
      renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.physicallyCorrectLights=false;
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
      el.appendChild(renderer.domElement);renderer.domElement.style.display='block';
      var scene=new T.Scene();scene.background=new T.Color('#07090a');scene.fog=new T.Fog('#07090a',40,90);
      // entorno para reflejos (paneles de luz)
      var envS=new T.Scene();envS.background=new T.Color('#0c0e10');
      [[0,9,0,14,0.2,14,'#fff2d6',2.2],[-12,4,0,0.2,6,16,'#9fc4ff',1.2],[12,4,0,0.2,6,16,'#ffd28a',1.2],[0,4,-12,16,6,0.2,'#c8a84b',0.8]].forEach(function(q){var m=new T.Mesh(new T.BoxGeometry(q[3],q[4],q[5]),new T.MeshBasicMaterial({color:new T.Color(q[6]).multiplyScalar(q[7])}));m.position.set(q[0],q[1],q[2]);envS.add(m);});
      var pm=new T.PMREMGenerator(renderer);var envRT=pm.fromScene(envS,0.04);scene.environment=envRT.texture;
      var cam=new T.PerspectiveCamera(30,W/H,0.1,300);
      // luces
      scene.add(new T.HemisphereLight('#ffeccc','#0a0b0c',0.35));
      var sun=new T.DirectionalLight('#ffe4b8',0.9);sun.position.set(14,24,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);var sc=sun.shadow.camera;sc.left=-22;sc.right=22;sc.top=22;sc.bottom=-22;sun.shadow.bias=-0.0003;sun.shadow.normalBias=0.02;scene.add(sun);
      var luna=new T.DirectionalLight('#6f8fd6',0.35);luna.position.set(22,10,-4);scene.add(luna);
      var n=M.staff.length||1, cols=n<=2?n:2, rows=Math.ceil(n/cols), sx=6.2, sz=5.2;
      var ancho=Math.max(cols*sx,12), fondo=Math.max(rows*sz,10);
      var X0=-ancho/2-3, X1=ancho/2+3, Z0=-fondo/2-3, Z1=fondo/2+3;
      var M_=function(o){return new T.MeshStandardMaterial(o);};
      // piso pulido
      var piso=new T.Mesh(new T.PlaneGeometry(X1-X0+30,Z1-Z0+30),M_({color:'#121416',roughness:0.22,metalness:0.35,envMapIntensity:0.9}));piso.rotation.x=-Math.PI/2;piso.receiveShadow=true;scene.add(piso);
      // alfombra zona de trabajo
      var alf=new T.Mesh(new T.BoxGeometry(ancho+1.6,0.04,fondo+0.6),M_({color:'#24282a',roughness:0.95}));alf.position.set(0,0.03,0.6);alf.receiveShadow=true;scene.add(alf);
      var bordeA=new T.Mesh(new T.BoxGeometry(ancho+1.8,0.02,fondo+0.8),M_({color:'#8a7232',roughness:0.45,metalness:0.6}));bordeA.position.set(0,0.01,0.6);scene.add(bordeA);
      // pared del fondo con listones de madera
      var paredF=new T.Mesh(new T.BoxGeometry(X1-X0,5,0.3),M_({color:'#1a1c1e',roughness:0.7}));paredF.position.set(0,2.5,Z0);paredF.receiveShadow=true;scene.add(paredF);
      var matListon=M_({color:'#6b4a2b',roughness:0.55,metalness:0.05});
      for(var lx=X0+0.3;lx<X1-0.2;lx+=0.32){var ls=new T.Mesh(new T.BoxGeometry(0.16,5,0.12),matListon);ls.position.set(lx,2.5,Z0+0.2);ls.castShadow=true;ls.receiveShadow=true;scene.add(ls);}
      // panel negro para el logo
      var panelLogo=new T.Mesh(new T.BoxGeometry(7.2,2.6,0.12),M_({color:'#0c0d0e',roughness:0.3,metalness:0.6}));panelLogo.position.set(0,2.95,Z0+0.33);scene.add(panelLogo);
      var halo=new T.Sprite(new T.SpriteMaterial({map:glowTex(T,'rgba(255,200,90,0.55)'),transparent:true,depthWrite:false,blending:T.AdditiveBlending}));halo.scale.set(9,4.2,1);halo.position.set(0,2.95,Z0+0.36);scene.add(halo);
      var logoMat=new T.MeshBasicMaterial({transparent:true,color:'#ffffff'});var logo=new T.Mesh(new T.PlaneGeometry(5.6,5.6*527/896),logoMat);logo.position.set(0,2.95,Z0+0.4);scene.add(logo);
      var logoImg=new Image();logoImg.onload=function(){var t=new T.Texture(logoImg);t.encoding=T.sRGBEncoding;t.anisotropy=8;t.needsUpdate=true;logoMat.map=t;logoMat.needsUpdate=true;if(api.current)api.current.aplicar(ultProps.current.M,ultProps.current.sel,true);};logoImg.src='vendor/logo-transparente.png';
      var tiraF=new T.Mesh(new T.BoxGeometry(X1-X0,0.04,0.04),new T.MeshBasicMaterial({color:'#ffcf6a'}));tiraF.position.set(0,4.92,Z0+0.3);scene.add(tiraF);
      var tiraF2=tiraF.clone();tiraF2.position.y=0.05;scene.add(tiraF2);
      // pared izquierda con video wall
      var paredI=new T.Mesh(new T.BoxGeometry(0.3,5,Z1-Z0),M_({color:'#17191b',roughness:0.75}));paredI.position.set(X0,2.5,0);paredI.receiveShadow=true;scene.add(paredI);
      var vwW=Math.min(Z1-Z0-2,11),vwH=vwW*1152/2048;
      var marcoVW=new T.Mesh(new T.BoxGeometry(0.14,vwH+0.25,vwW+0.25),M_({color:'#050505',roughness:0.25,metalness:0.7}));marcoVW.position.set(X0+0.22,2.65,0);scene.add(marcoVW);
      var vwMat=new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false});var vw=new T.Mesh(new T.PlaneGeometry(vwW,vwH),vwMat);vw.rotation.y=Math.PI/2;vw.position.set(X0+0.3,2.65,0);scene.add(vw);
      var haloVW=new T.Sprite(new T.SpriteMaterial({map:glowTex(T,'rgba(80,255,170,0.18)'),transparent:true,depthWrite:false,blending:T.AdditiveBlending}));haloVW.scale.set(vwW*1.4,vwH*1.6,1);haloVW.position.set(X0+0.6,2.65,0);scene.add(haloVW);
      // ventanal derecho con ciudad
      var ciudad=new T.Mesh(new T.PlaneGeometry(Z1-Z0,5.4),new T.MeshBasicMaterial({map:ciudadCanvas(T),toneMapped:false}));ciudad.rotation.y=-Math.PI/2;ciudad.position.set(X1+1.2,2.6,0);scene.add(ciudad);
      var vidrio=new T.Mesh(new T.PlaneGeometry(Z1-Z0,5),new T.MeshPhysicalMaterial({color:'#9fc4ff',transparent:true,opacity:0.08,roughness:0.05,metalness:0,envMapIntensity:1.5}));vidrio.rotation.y=-Math.PI/2;vidrio.position.set(X1,2.5,0);scene.add(vidrio);
      var matMarco=M_({color:'#0b0b0c',roughness:0.35,metalness:0.8});
      for(var mz=Z0;mz<=Z1+0.01;mz+=(Z1-Z0)/5){var mu=new T.Mesh(new T.BoxGeometry(0.12,5,0.12),matMarco);mu.position.set(X1,2.5,mz);mu.castShadow=true;scene.add(mu);}
      [0.05,4.95].forEach(function(y){var tr=new T.Mesh(new T.BoxGeometry(0.14,0.12,Z1-Z0),matMarco);tr.position.set(X1,y,0);scene.add(tr);});
      // plantas
      function planta(x,z,esc){var g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(esc||1);var maceta=new T.Mesh(new T.CylinderGeometry(0.42,0.32,0.8,24),M_({color:'#e8e2d4',roughness:0.4}));maceta.position.y=0.4;maceta.castShadow=true;g.add(maceta);
        var matH=M_({color:'#2f6b3a',roughness:0.8});for(var k=0;k<9;k++){var hj=new T.Mesh(new T.IcosahedronGeometry(0.32+Math.random()*0.18,0),matH);hj.position.set((Math.random()-0.5)*0.6,1.05+Math.random()*0.9,(Math.random()-0.5)*0.6);hj.rotation.set(Math.random()*3,Math.random()*3,0);hj.castShadow=true;g.add(hj);}scene.add(g);}
      planta(X0+1,Z0+1,1.1);planta(X1-1,Z0+1,1.2);planta(X1-1,Z1-1,1);planta(X0+1,Z1-1.2,0.9);
      // lounge
      var lounge=new T.Group();lounge.position.set(X1-2.4,0,Z1-2.6);scene.add(lounge);
      var matSofa=M_({color:'#3a3f46',roughness:0.85});
      var base=new T.Mesh(new T.BoxGeometry(2.6,0.45,1),matSofa);base.position.y=0.3;base.castShadow=true;lounge.add(base);
      var resp=new T.Mesh(new T.BoxGeometry(2.6,0.7,0.25),matSofa);resp.position.set(0,0.75,0.4);resp.castShadow=true;lounge.add(resp);
      [-1.25,1.25].forEach(function(xx){var b=new T.Mesh(new T.BoxGeometry(0.2,0.6,1),matSofa);b.position.set(xx,0.55,0);lounge.add(b);});
      var mesita=new T.Mesh(new T.CylinderGeometry(0.5,0.5,0.06,32),M_({color:'#c8a84b',roughness:0.25,metalness:0.9}));mesita.position.set(0,0.45,-1.1);mesita.castShadow=true;lounge.add(mesita);
      var pataM=new T.Mesh(new T.CylinderGeometry(0.05,0.05,0.42,12),matMarco);pataM.position.set(0,0.22,-1.1);lounge.add(pataM);
      lounge.rotation.y=Math.PI;
      // materiales escritorio
      var matTop=M_({color:'#f2efe8',roughness:0.25,metalness:0.05});
      var matMetal=M_({color:'#1b1c1e',roughness:0.3,metalness:0.85});
      var matOro=M_({color:'#c8a84b',roughness:0.25,metalness:0.9});
      var matSilla=M_({color:'#1f2226',roughness:0.6});
      var matMalla=M_({color:'#2b3036',roughness:0.9});
      var matPiel=M_({color:'#e3b894',roughness:0.55});
      var matPelo=M_({color:'#1f1712',roughness:0.7});
      var puestos=[],clic=[];
      M.staff.forEach(function(s,i){
        var c=i%cols,r=Math.floor(i/cols);
        var g=new T.Group();g.position.set((c-(cols-1)/2)*sx,0,(r-(rows-1)/2)*sz+0.4);scene.add(g);
        // escritorio de vidrio blanco con patas metálicas
        var top=new T.Mesh(new T.BoxGeometry(3,0.07,1.45),matTop);top.position.y=0.78;top.castShadow=true;top.receiveShadow=true;g.add(top);
        var canto=new T.Mesh(new T.BoxGeometry(3.02,0.02,1.47),matOro);canto.position.y=0.745;g.add(canto);
        [-1.4,1.4].forEach(function(xx){var pt=new T.Mesh(new T.BoxGeometry(0.07,0.75,1.3),matMetal);pt.position.set(xx,0.375,0);pt.castShadow=true;g.add(pt);});
        var cajon=new T.Mesh(new T.BoxGeometry(0.55,0.6,0.6),matMetal);cajon.position.set(1.0,0.32,-0.3);cajon.castShadow=true;g.add(cajon);
        // dos monitores
        var scrMats=[];
        [-0.62,0.62].forEach(function(xx,k){var mon=new T.Group();mon.position.set(xx,0,-0.45);mon.rotation.y=k?-0.18:0.18;g.add(mon);
          var marco=new T.Mesh(new T.BoxGeometry(1.15,0.68,0.04),matMetal);marco.position.y=1.32;marco.castShadow=true;mon.add(marco);
          var sm=new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false});var sc=new T.Mesh(new T.PlaneGeometry(1.09,0.62),sm);sc.position.set(0,1.32,0.022);mon.add(sc);scrMats.push(sm);
          var cuello=new T.Mesh(new T.BoxGeometry(0.06,0.32,0.06),matMetal);cuello.position.set(0,0.98,-0.04);mon.add(cuello);
          var pie=new T.Mesh(new T.BoxGeometry(0.34,0.02,0.22),matMetal);pie.position.set(0,0.825,-0.02);mon.add(pie);});
        var glowM=new T.Sprite(new T.SpriteMaterial({map:glowTex(T,'rgba(120,200,255,0.35)'),transparent:true,depthWrite:false,blending:T.AdditiveBlending}));glowM.scale.set(3.4,1.8,1);glowM.position.set(0,1.35,-0.35);g.add(glowM);
        var tec=new T.Mesh(new T.BoxGeometry(0.9,0.025,0.28),matMetal);tec.position.set(-0.1,0.825,0.12);g.add(tec);
        var mouse=new T.Mesh(new T.BoxGeometry(0.1,0.03,0.16),matMetal);mouse.position.set(0.55,0.825,0.15);g.add(mouse);
        var lampP=new T.Mesh(new T.CylinderGeometry(0.015,0.015,0.6,8),matOro);lampP.position.set(-1.25,1.1,-0.45);lampP.rotation.z=0.2;g.add(lampP);
        var lampC=new T.Mesh(new T.ConeGeometry(0.12,0.16,20,1,true),matOro);lampC.position.set(-1.18,1.38,-0.4);lampC.rotation.z=2.6;g.add(lampC);
        var taza=new T.Mesh(new T.CylinderGeometry(0.06,0.05,0.13,16),M_({color:'#1a1a1a',roughness:0.4}));taza.position.set(1.2,0.88,0.2);g.add(taza);
        var placa=new T.Mesh(new T.BoxGeometry(0.7,0.12,0.05),matOro);placa.position.set(0,0.88,0.6);placa.rotation.x=-0.3;g.add(placa);
        var placaTxt=new T.Mesh(new T.PlaneGeometry(0.66,0.1),new T.MeshBasicMaterial({map:textoCanvas(T,[{t:s.nombre,font:'bold 44px sans-serif',color:'#1a1d13',x:256,y:40,align:'center'}],512,80),transparent:true}));placaTxt.position.set(0,0.885,0.628);placaTxt.rotation.x=-0.3;g.add(placaTxt);
        // silla ergonómica
        var silla=new T.Group();silla.position.set(0,0,0.95);g.add(silla);
        var asiento=new T.Mesh(new T.BoxGeometry(0.62,0.09,0.58),matSilla);asiento.position.y=0.5;asiento.castShadow=true;silla.add(asiento);
        var respS=new T.Mesh(new T.BoxGeometry(0.58,0.82,0.06),matMalla);respS.position.set(0,1.0,0.3);respS.rotation.x=-0.1;respS.castShadow=true;silla.add(respS);
        var cabez=new T.Mesh(new T.BoxGeometry(0.36,0.16,0.06),matSilla);cabez.position.set(0,1.5,0.36);silla.add(cabez);
        var eje=new T.Mesh(new T.CylinderGeometry(0.035,0.035,0.4,10),matMetal);eje.position.y=0.27;silla.add(eje);
        for(var a=0;a<5;a++){var brazo=new T.Mesh(new T.BoxGeometry(0.04,0.04,0.34),matMetal);var ang=a*Math.PI*2/5;brazo.position.set(Math.sin(ang)*0.17,0.06,Math.cos(ang)*0.17);brazo.rotation.y=ang;silla.add(brazo);var rueda=new T.Mesh(new T.SphereGeometry(0.035,8,8),matMetal);rueda.position.set(Math.sin(ang)*0.33,0.035,Math.cos(ang)*0.33);silla.add(rueda);}
        // persona
        var colP=new T.Color(s.color);
        var per=new T.Group();per.position.set(0,0,0.9);g.add(per);
        var matRopa=M_({color:colP,roughness:0.6});
        var torso=new T.Mesh(new T.CapsuleGeometry(0.22,0.38,8,16),matRopa);torso.position.y=1.02;torso.scale.set(1.15,1,0.85);torso.castShadow=true;per.add(torso);
        var cuelloP=new T.Mesh(new T.CylinderGeometry(0.07,0.08,0.1,12),matPiel);cuelloP.position.y=1.37;per.add(cuelloP);
        var cabeza=new T.Mesh(new T.SphereGeometry(0.17,32,24),matPiel);cabeza.position.y=1.55;cabeza.scale.set(1,1.12,1);cabeza.castShadow=true;per.add(cabeza);
        var pelo=new T.Mesh(new T.SphereGeometry(0.178,32,16,0,Math.PI*2,0,Math.PI/1.9),matPelo);pelo.position.y=1.585;pelo.rotation.x=0.35;per.add(pelo);
        var auric=new T.Mesh(new T.TorusGeometry(0.18,0.018,8,24,Math.PI),matMetal);auric.position.y=1.6;auric.rotation.y=Math.PI/2;per.add(auric);
        function brazoP(sx){var b=new T.Group();b.position.set(sx*0.27,1.22,0);per.add(b);var sup=new T.Mesh(new T.CapsuleGeometry(0.065,0.26,6,10),matRopa);sup.position.set(0,-0.15,0);sup.castShadow=true;b.add(sup);
          var codo=new T.Group();codo.position.set(0,-0.3,0);b.add(codo);var ant=new T.Mesh(new T.CapsuleGeometry(0.055,0.26,6,10),matRopa);ant.position.set(0,0,-0.17);ant.rotation.x=Math.PI/2;codo.add(ant);var mano=new T.Mesh(new T.SphereGeometry(0.055,12,10),matPiel);mano.position.set(0,0,-0.34);codo.add(mano);b.rotation.x=0.35;codo.rotation.x=-0.25;return {b:b,codo:codo};}
        var bI=brazoP(-1),bD=brazoP(1);
        var piernas=new T.Mesh(new T.BoxGeometry(0.4,0.15,0.5),M_({color:'#23272f',roughness:0.7}));piernas.position.set(0,0.6,-0.18);per.add(piernas);
        [-0.11,0.11].forEach(function(xx){var pn=new T.Mesh(new T.CapsuleGeometry(0.06,0.38,4,8),M_({color:'#23272f',roughness:0.7}));pn.position.set(xx,0.32,-0.42);per.add(pn);});
        // estado: anillo, luz, columna holográfica
        var anillo=new T.Mesh(new T.RingGeometry(1.95,2.05,96),new T.MeshBasicMaterial({color:'#39e58c',transparent:true,opacity:0.9,side:T.DoubleSide,toneMapped:false}));anillo.rotation.x=-Math.PI/2;anillo.position.y=0.04;g.add(anillo);
        var aura=new T.Mesh(new T.CircleGeometry(1.95,96),new T.MeshBasicMaterial({color:'#39e58c',transparent:true,opacity:0.07,depthWrite:false}));aura.rotation.x=-Math.PI/2;aura.position.y=0.035;g.add(aura);
        var luz=new T.PointLight('#39e58c',0,5,2);luz.position.set(0,2.2,0.3);g.add(luz);
        var foco=new T.SpotLight('#fff1d6',0.9,9,0.55,0.6,1.5);foco.position.set(0,6,0.4);foco.target.position.set(0,0,0.2);g.add(foco);g.add(foco.target);
        var lamp=new T.Mesh(new T.BoxGeometry(2.2,0.04,0.12),new T.MeshBasicMaterial({color:'#fff3d8',toneMapped:false}));lamp.position.set(0,5.2,0.3);g.add(lamp);
        var cable=new T.Mesh(new T.CylinderGeometry(0.006,0.006,1.2,4),matMetal);cable.position.set(0,5.8,0.3);g.add(cable);
        var hit=new T.Mesh(new T.BoxGeometry(3.4,2.4,3),new T.MeshBasicMaterial({visible:false}));hit.position.set(0,1,0.3);hit.userData.nombre=s.nombre;g.add(hit);clic.push(hit);
        puestos.push({s:s,g:g,scrMats:scrMats,glowM:glowM,per:per,bI:bI,bD:bD,anillo:anillo,aura:aura,luz:luz,cabeza:cabeza,pelo:pelo,auric:auric,torso:torso,fase:Math.random()*6,estado:'desconectado',acc:0,parts:[]});
      });
      // partículas de datos
      var partGeo=new T.OctahedronGeometry(0.05,0);
      function chispa(pu,color){var m=new T.Mesh(partGeo,new T.MeshBasicMaterial({color:color||'#ffd56a',transparent:true,opacity:1,toneMapped:false}));m.position.set(pu.g.position.x+(Math.random()-0.5)*1.6,1.7,pu.g.position.z-0.45+(Math.random()-0.5)*0.2);m.userData.v=0.8+Math.random()*0.9;m.userData.vida=0;scene.add(m);pu.parts.push(m);}
      // cámara
      var radioBase=Math.max(22,ancho*1.7+8),radio=radioBase,az=0.72,elev=0.62,objetivo=new T.Vector3(-0.6,1.0,0),objDest=objetivo.clone(),radioDest=radio,arrastre=null,ultimoInput=0;
      function ubicarCam(){cam.position.set(objetivo.x+radio*Math.sin(az)*Math.cos(elev),objetivo.y+radio*Math.sin(elev),objetivo.z+radio*Math.cos(az)*Math.cos(elev));cam.lookAt(objetivo);}
      ubicarCam();
      var dom=renderer.domElement;dom.style.cursor='grab';dom.style.touchAction='none';
      var ray=new T.Raycaster(),mouse2=new T.Vector2(),hover=null;
      function pick(ev){var r=dom.getBoundingClientRect();mouse2.x=((ev.clientX-r.left)/r.width)*2-1;mouse2.y=-((ev.clientY-r.top)/r.height)*2+1;ray.setFromCamera(mouse2,cam);var it=ray.intersectObjects(clic,false);return it.length?it[0].object.userData.nombre:null;}
      function down(ev){arrastre={x:ev.clientX,y:ev.clientY,az:az,elev:elev,mov:0};dom.setPointerCapture&&dom.setPointerCapture(ev.pointerId);dom.style.cursor='grabbing';ultimoInput=Date.now();}
      function move(ev){if(arrastre){var dx=ev.clientX-arrastre.x,dy=ev.clientY-arrastre.y;arrastre.mov=Math.max(arrastre.mov,Math.abs(dx)+Math.abs(dy));az=arrastre.az-dx*0.006;elev=Math.max(0.2,Math.min(1.25,arrastre.elev+dy*0.004));ultimoInput=Date.now();return;}var nm=pick(ev);if(nm!==hover){hover=nm;dom.style.cursor=nm?'pointer':'grab';}}
      function up(ev){if(arrastre&&arrastre.mov<6){var nm=pick(ev);props.onSelect&&props.onSelect(nm);}arrastre=null;dom.style.cursor=hover?'pointer':'grab';}
      function wheel(ev){ev.preventDefault();radioDest=Math.max(7,Math.min(70,radioDest*(ev.deltaY>0?1.1:0.9)));ultimoInput=Date.now();}
      dom.addEventListener('pointerdown',down);dom.addEventListener('pointermove',move);dom.addEventListener('pointerup',up);dom.addEventListener('wheel',wheel,{passive:false});
      var ro=new ResizeObserver(function(){var w=el.clientWidth,hh=el.clientHeight;if(!w||!hh)return;renderer.setSize(w,hh);cam.aspect=w/hh;cam.updateProjectionMatrix();});ro.observe(el);
      var COL={activo:'#39e58c',ausente:'#ffc93c',desconectado:'#4a4e52'};
      var selPrevio='__inicio__',firmaVW='';
      function aplicar(MM,sel,forzarVW){
        puestos.forEach(function(pu){var p=MM.P[pu.s.nombre];if(!p)return;
          var nuevo=p.acc-pu.acc;if(pu.acc>0&&nuevo>0){for(var k=0;k<Math.min(16,nuevo);k++)setTimeout(function(){chispa(pu);},k*80);}pu.acc=p.acc;
          pu.estado=p.estado;var c=new T.Color(COL[p.estado]);pu.anillo.material.color=c;pu.aura.material.color=c;pu.luz.color=c;
          pu.anillo.material.opacity=sel===pu.s.nombre?1:0.8;
          pu.per.visible=p.estado!=='desconectado';pu.glowM.visible=p.estado!=='desconectado';
          pu.scrMats.forEach(function(sm,k){if(sm.map)sm.map.dispose();sm.map=pantallaCanvas(T,p,pu.s.color,k+1);sm.needsUpdate=true;});
        });
        var RD=MM.riders;var fv=JSON.stringify([RD.top.map(function(r){return r.u+r.n;}),RD.resto.length,RD.total,!!(logoImg.complete)]);
        if(fv!==firmaVW||forzarVW){firmaVW=fv;if(vwMat.map)vwMat.map.dispose();vwMat.map=videoWallCanvas(T,RD,logoImg);vwMat.needsUpdate=true;}
        if(sel===selPrevio)return;selPrevio=sel;
        if(sel){var pu=puestos.find(function(q){return q.s.nombre===sel;});if(pu){objDest.set(pu.g.position.x,1.0,pu.g.position.z);radioDest=11;}}else{objDest.set(-0.6,1.0,0);radioDest=radioBase;}
      }
      api.current={aplicar:aplicar,verPantalla:function(){objDest.set(X0+1,2.6,0);az=Math.PI/2;elev=0.12;radioDest=Math.max(10,vwW*1.25);ultimoInput=Date.now()+20000;selPrevio='__pantalla__';}};
      aplicar(ultProps.current.M,ultProps.current.sel);
      var v3=new T.Vector3(),reloj=new T.Clock(),raf=0;
      function frame(){
        raf=requestAnimationFrame(frame);var dt=Math.min(0.05,reloj.getDelta()),t=reloj.elapsedTime;
        if(!arrastre&&Date.now()-ultimoInput>8000)az+=dt*0.04;
        objetivo.lerp(objDest,0.05);radio+=(radioDest-radio)*0.05;ubicarCam();
        halo.material.opacity=0.85+Math.sin(t*1.2)*0.15;
        puestos.forEach(function(pu){
          var act=pu.estado==='activo',aus=pu.estado==='ausente';
          pu.luz.intensity+=((act?1.4:aus?0.8:0)-pu.luz.intensity)*0.08;
          pu.aura.material.opacity=act?0.08+0.06*(1+Math.sin(t*2.2+pu.fase)):aus?0.07+0.05*(1+Math.sin(t*4+pu.fase)):0.03;
          if(pu.per.visible){
            var b=act?Math.sin(t*16+pu.fase)*0.08:0;pu.bI.codo.rotation.x=-0.25+b;pu.bD.codo.rotation.x=-0.25-b;
            pu.bI.b.rotation.x=act?0.35:0.0;pu.bD.b.rotation.x=act?0.35:0.0;
            var gy=act?Math.sin(t*0.6+pu.fase)*0.22:Math.sin(t*0.35+pu.fase)*0.6;pu.cabeza.rotation.y=gy;pu.pelo.rotation.y=gy;pu.auric.rotation.y=Math.PI/2+gy;
            var inc=act?0:0.25;pu.cabeza.rotation.x+=(inc-pu.cabeza.rotation.x)*0.05;
            pu.torso.position.y=1.02+Math.sin(t*1.8+pu.fase)*0.006;
          }
          if(act&&Math.random()<dt*0.8)chispa(pu,'#7dffb8');
          pu.parts=pu.parts.filter(function(m){m.userData.vida+=dt;m.position.y+=m.userData.v*dt;m.rotation.x+=dt*3;m.rotation.y+=dt*2;m.material.opacity=Math.max(0,1-m.userData.vida/1.8);if(m.userData.vida>1.8){scene.remove(m);m.material.dispose();return false;}return true;});
        });
        renderer.render(scene,cam);
        var ov=overlay.current;if(ov){var r=dom.getBoundingClientRect();puestos.forEach(function(pu,i){var d=ov.children[i];if(!d)return;v3.set(pu.g.position.x,2.35,pu.g.position.z+0.4).project(cam);var x=(v3.x*0.5+0.5)*r.width,y=(-v3.y*0.5+0.5)*r.height;d.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px) translate(-50%,-100%)';d.style.opacity=(v3.z<1&&x>-50&&x<r.width+50)?1:0;});}
      }
      frame();
      return function(){cancelAnimationFrame(raf);ro.disconnect();dom.removeEventListener('pointerdown',down);dom.removeEventListener('pointermove',move);dom.removeEventListener('pointerup',up);dom.removeEventListener('wheel',wheel);
        scene.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material){[].concat(o.material).forEach(function(m){if(m.map)m.map.dispose();m.dispose();});}});
        envRT.dispose();pm.dispose();renderer.dispose();if(dom.parentNode)dom.parentNode.removeChild(dom);api.current=null;};
    }
    return function(){vivo=false;cleanup&&cleanup();};
  },[M.staff.map(function(s){return s.nombre;}).join('|')]);
  useEffect(function(){if(api.current)api.current.aplicar(M,props.sel);});
  var COLH={activo:'#39e58c',ausente:'#ffc93c',desconectado:'#8a8f82'};
  var TXT={activo:'Activo',ausente:'Sin actividad',desconectado:'Desconectado'};
  if(err)return h(OficinaSimple,{M:M,sel:props.sel,onSelect:props.onSelect,aviso:err});
  function sub(p){if(p.estado==='activo')return secAccion(p.pulso&&p.pulso.s);if(p.estado==='ausente')return 'Sin actividad hace '+durTxt(p.minSinAct)+' · '+secLabel(p.pulso&&p.pulso.s);if(p.pulso&&p.minDesc)return 'Desconectado hace '+durTxt(p.minDesc);return p.pulso?('Última señal '+horaCL(p.pulso.ts)):'Sin conexión registrada';}
  return h('div',{style:{position:'relative',height:props.alto||600,borderRadius:20,overflow:'hidden',boxShadow:'0 30px 70px rgba(5,7,4,0.55), 0 0 0 1px rgba(200,168,75,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',background:'#07090a'}},
    h('div',{ref:ref,style:{position:'absolute',inset:0}}),
    verP&&h('div',{style:{position:'absolute',inset:0,zIndex:3,padding:16,overflowY:'auto',background:'rgba(5,7,6,0.6)',backdropFilter:'blur(4px)'}},h(PantallaRiders,{RD:M.riders,esHoy:true,fecha:null})),
    h('div',{ref:overlay,style:{position:'absolute',inset:0,pointerEvents:'none',opacity:verP?0:1}},
      M.staff.map(function(s){var p=M.P[s.nombre];var sel=props.sel===s.nombre;
        return h('div',{key:s.nombre,onClick:function(){props.onSelect&&props.onSelect(sel?null:s.nombre);},style:{position:'absolute',left:0,top:0,pointerEvents:'auto',cursor:'pointer',padding:'8px 12px',borderRadius:14,background:sel?'linear-gradient(135deg,rgba(243,210,122,0.96),rgba(200,168,75,0.96))':'linear-gradient(135deg,rgba(18,22,20,0.88),rgba(10,12,11,0.88))',backdropFilter:'blur(8px)',border:'1px solid '+(sel?'#ffe59a':'rgba(200,168,75,0.4)'),boxShadow:'0 10px 26px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.2)',color:sel?'#1a1d13':'#f3ead2',whiteSpace:'nowrap',minWidth:150}},
          h('div',{style:{display:'flex',alignItems:'center',gap:8}},
            h('span',{style:{width:10,height:10,borderRadius:'50%',background:COLH[p.estado],boxShadow:'0 0 12px '+COLH[p.estado]}}),
            h('span',{style:{fontWeight:800,fontSize:12.5,letterSpacing:0.4}},s.nombre),
            h('span',{style:{fontFamily:'Bebas Neue',fontSize:18,marginLeft:'auto',color:sel?'#1a1d13':'#e6c76a'}},fmt(p.acc))),
          h('div',{style:{fontSize:10.5,opacity:0.9,marginTop:2,color:sel?'#1a1d13':(p.estado==='ausente'?'#ffd36a':p.estado==='activo'?'#a8f5cb':'#b5b9ae')}},sub(p)));
      })),
    h('div',{style:{position:'absolute',left:14,bottom:12,display:'flex',gap:12,alignItems:'center',fontSize:11,color:'#c9c3ad',background:'rgba(10,12,11,0.75)',padding:'7px 12px',borderRadius:12,border:'1px solid rgba(200,168,75,0.2)'}},
      ['activo','ausente','desconectado'].map(function(k){return h('span',{key:k,style:{display:'flex',alignItems:'center',gap:5}},h('span',{style:{width:8,height:8,borderRadius:'50%',background:COLH[k]}}),TXT[k]);}),
      h('span',{style:{opacity:0.65}},'Arrastra para girar · rueda para acercar · toca un escritorio')),
    h('div',{style:{position:'absolute',right:14,bottom:12,display:'flex',gap:8,zIndex:4}},
      h('button',{type:'button',onClick:function(){setVerP(!verP);},style:{padding:'7px 12px',borderRadius:10,border:'1px solid rgba(200,168,75,0.5)',background:'rgba(10,12,11,0.8)',color:'#e6c76a',fontWeight:700,fontSize:11.5,cursor:'pointer'}},verP?'Volver a la oficina':'Ver pantalla de mensajeros'),
      h('button',{type:'button',onClick:function(){setVerP(false);props.onSelect&&props.onSelect(null);if(api.current){api.current.aplicar(M,'__reset__');api.current.aplicar(M,null);}},style:{padding:'7px 12px',borderRadius:10,border:'1px solid rgba(200,168,75,0.5)',background:'rgba(10,12,11,0.8)',color:'#e6c76a',fontWeight:700,fontSize:11.5,cursor:'pointer'}},'Vista general')));
}
function OficinaSimple(props){
  var M=props.M;var COLH={activo:'#39e58c',ausente:'#ffc93c',desconectado:'#8a8f82'};
  return h('div',{style:{padding:16,borderRadius:18,background:'#12150f'}},props.aviso&&h('div',{style:{fontSize:11,color:'#9aa08e',marginBottom:8}},props.aviso),
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}},M.staff.map(function(s){var p=M.P[s.nombre];return h('div',{key:s.nombre,onClick:function(){props.onSelect(s.nombre);},style:{cursor:'pointer',padding:14,borderRadius:14,background:'#1b1f17',border:'2px solid '+COLH[p.estado],color:'#eee'}},h('div',{style:{fontWeight:800}},s.nombre),h('div',{style:{fontSize:12,opacity:0.8}},secAccion(p.pulso&&p.pulso.s)),h('div',{style:{fontFamily:'Bebas Neue',fontSize:26,color:'#c8a84b'}},fmt(p.acc)));})));
}

// ---------- UI ----------
var card={background:'linear-gradient(160deg,#ffffff 0%,#fbf6ea 100%)',border:'1px solid rgba(200,168,75,0.35)',borderRadius:16,boxShadow:'0 14px 30px rgba(43,46,32,0.10), 0 2px 6px rgba(43,46,32,0.06), inset 0 1px 0 #fff'};
var tit={fontFamily:'Bebas Neue',letterSpacing:2,fontSize:17,color:'var(--dark)'};
function Kpi(p){return h('div',{style:Object.assign({},card,{padding:'14px 16px',position:'relative',overflow:'hidden'})},
  h('div',{style:{position:'absolute',left:0,top:0,right:0,height:4,background:p.color}}),
  h('div',{style:{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'var(--text-soft)',fontWeight:700}},p.l),
  h('div',{style:{fontFamily:'Bebas Neue',fontSize:38,lineHeight:1.05,color:p.color}},p.v),
  p.s&&h('div',{style:{fontSize:11,color:'var(--text-soft)'}},p.s));}

function BarraH(p){var pct=p.max?Math.max(2,Math.round(p.v/p.max*100)):0;return h('div',{style:{marginBottom:8}},
  h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3,gap:8}},h('span',{style:{fontWeight:600,color:'var(--dark)'}},p.l),h('span',{style:{fontWeight:800,color:p.c}},p.txt!=null?p.txt:fmt(p.v))),
  h('div',{style:{height:9,borderRadius:6,background:'rgba(43,46,32,0.07)',overflow:'hidden',boxShadow:'inset 0 1px 2px rgba(0,0,0,0.1)'}},h('div',{style:{height:'100%',width:pct+'%',background:'linear-gradient(90deg,'+p.c+','+p.c+'bb)',borderRadius:6}})));}

function GraficoHoras(p){
  var hs=p.horas,desde=6,hasta=23;var mx=Math.max.apply(null,hs.slice(desde,hasta+1).map(function(q){return q.acc;}).concat([1]));
  return h('div',null,
    h('div',{style:{display:'flex',alignItems:'flex-end',gap:4,height:150,padding:'0 2px'}},
      hs.slice(desde,hasta+1).map(function(q,i){var hr=desde+i;var con=Math.min(60,q.con),act=Math.min(60,q.act);
        return h('div',{key:hr,title:hr+':00 · '+q.acc+' movimientos · conectado '+con+' min · activo '+act+' min',style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',position:'relative'}},
          q.acc>0&&h('div',{style:{fontSize:9.5,fontWeight:800,color:'var(--dark)',marginBottom:2}},q.acc),
          h('div',{style:{width:'100%',maxWidth:26,height:Math.max(q.acc?4:0,Math.round(q.acc/mx*104)),borderRadius:'6px 6px 2px 2px',background:'linear-gradient(180deg,'+p.color+','+p.color+'99)',boxShadow:q.acc?'0 4px 10px '+p.color+'55':'none'}}),
          h('div',{style:{width:'100%',height:6,marginTop:3,borderRadius:3,background:'rgba(43,46,32,0.08)',overflow:'hidden',display:'flex'}},h('div',{style:{width:(act/60*100)+'%',background:'#2e9d5b'}}),h('div',{style:{width:((con-act)/60*100)+'%',background:'#e0b84a'}})),
          h('div',{style:{fontSize:9.5,color:'var(--text-soft)',marginTop:3}},hr));})),
    h('div',{style:{display:'flex',gap:12,fontSize:10.5,color:'var(--text-soft)',marginTop:6}},
      h('span',null,h('span',{style:{display:'inline-block',width:10,height:10,borderRadius:3,background:p.color,marginRight:4,verticalAlign:'-1px'}}),'Movimientos'),
      h('span',null,h('span',{style:{display:'inline-block',width:10,height:6,borderRadius:2,background:'#2e9d5b',marginRight:4}}),'Activo'),
      h('span',null,h('span',{style:{display:'inline-block',width:10,height:6,borderRadius:2,background:'#e0b84a',marginRight:4}}),'Conectado sin actividad')));
}

var CTR={activo:['Activo','#2e9d5b'],inactivo:['Abierto sin actividad','#e0a82e'],oculto:['Ventana minimizada / otra pestaña','#f57c00'],desconectado:['Desconectado','#9aa0a6']};
function Jornada(p){
  var L=p.tramos||[];if(!L.length)return h('div',{style:{fontSize:12,color:'var(--text-soft)'}},'Sin registro de conexión este día (el registro empezó el 05-11-2026).');
  var i0=Math.min(8*60,Math.floor(L[0].ini/60)*60),i1=Math.max(20*60,Math.ceil(L[L.length-1].fin/60)*60);var span=i1-i0;
  var hrs=[];for(var hr=i0/60;hr<=i1/60;hr++)hrs.push(hr);
  return h('div',null,
    h('div',{style:{position:'relative',height:34,borderRadius:10,background:'repeating-linear-gradient(90deg,rgba(43,46,32,0.05) 0 1px,transparent 1px '+(100/(hrs.length-1))+'%)',backgroundColor:'rgba(43,46,32,0.04)',overflow:'hidden',boxShadow:'inset 0 1px 3px rgba(0,0,0,0.12)'}},
      L.map(function(t,i){var c=CTR[t.tipo];return h('div',{key:i,title:c[0]+' · '+hm(t.ini)+' a '+hm(t.fin)+' ('+durTxt(t.fin-t.ini)+')'+(t.s?' · '+secLabel(t.s):''),style:{position:'absolute',top:t.tipo==='desconectado'?14:3,bottom:t.tipo==='desconectado'?14:3,left:((t.ini-i0)/span*100)+'%',width:Math.max(0.25,(t.fin-t.ini)/span*100)+'%',background:t.tipo==='desconectado'?'repeating-linear-gradient(45deg,#c5c9cc 0 4px,#e3e5e7 4px 8px)':'linear-gradient(180deg,'+c[1]+','+c[1]+'cc)',borderRadius:4}});})),
    h('div',{style:{position:'relative',height:16,marginTop:3}},hrs.map(function(hr){return h('span',{key:hr,style:{position:'absolute',left:((hr*60-i0)/span*100)+'%',transform:'translateX(-50%)',fontSize:10,color:'var(--text-soft)'}},hr+'h');})),
    h('div',{style:{display:'flex',gap:12,flexWrap:'wrap',fontSize:10.5,color:'var(--text-soft)',marginTop:6}},Object.keys(CTR).map(function(k){return h('span',{key:k},h('span',{style:{display:'inline-block',width:10,height:10,borderRadius:3,background:CTR[k][1],marginRight:4,verticalAlign:'-1px'}}),CTR[k][0]);})));
}
function RegistroInactividad(p){
  var L=(p.tramos||[]).filter(function(t){return t.tipo!=='activo'&&(t.fin-t.ini)>=3;}).slice().reverse();
  if(!L.length)return h('div',{style:{fontSize:12,color:'var(--text-soft)'}},'Sin pausas de 3 minutos o más.');
  return h('div',{style:{maxHeight:260,overflowY:'auto'}},L.map(function(t,i){var c=CTR[t.tipo];return h('div',{key:i,style:{display:'grid',gridTemplateColumns:'110px 1fr 90px',gap:10,alignItems:'center',padding:'7px 6px',borderBottom:'1px solid rgba(43,46,32,0.06)',fontSize:12}},
    h('span',{style:{fontFamily:'JetBrains Mono',fontSize:11.5,color:'var(--dark)'}},hm(t.ini)+' – '+(t.actual?'ahora':hm(t.fin))),
    h('span',null,h('span',{style:{display:'inline-block',width:9,height:9,borderRadius:3,background:c[1],marginRight:6}}),h('b',{style:{color:'var(--dark)'}},c[0]),t.s?h('span',{style:{color:'var(--text-soft)'}},' · '+secLabel(t.s)):null),
    h('span',{style:{textAlign:'right',fontWeight:800,color:c[1]}},durTxt(t.fin-t.ini)));}));
}
function PantallaRiders(p){
  var RD=p.RD;var medal=['linear-gradient(145deg,#f3d27a,#c8a84b)','linear-gradient(145deg,#eeeeee,#a9a9a9)','linear-gradient(145deg,#e7b07a,#b97a3d)','linear-gradient(145deg,#cfe0ea,#8fb3c8)','linear-gradient(145deg,#cfe0ea,#8fb3c8)'];
  var mx=Math.max.apply(null,RD.resto.map(function(r){return r.n;}).concat([1]));
  return h('div',{style:{borderRadius:20,padding:'18px 20px',marginBottom:16,background:'radial-gradient(120% 140% at 0% 0%,#1d2418 0%,#0c0f0b 60%)',boxShadow:'0 24px 60px rgba(5,7,4,0.45), inset 0 0 0 1px rgba(200,168,75,0.3)',color:'#eee'}},
    h('div',{style:{display:'flex',alignItems:'center',gap:14,marginBottom:14,flexWrap:'wrap'}},
      h('img',{src:'vendor/logo-transparente.png',alt:'',style:{height:44}}),
      h('div',{style:{flex:1}},h('div',{style:{fontFamily:'Bebas Neue',letterSpacing:2.5,fontSize:24,color:'#e6c76a'}},'Pantalla de mensajeros · '+(p.esHoy?'hoy':dmy(p.fecha))),h('div',{style:{fontSize:12,color:'#9aa08e'}},fmt(RD.total)+' entregas · '+RD.n+' mensajeros · velocidad = entregas por hora entre su primera y última entrega (mínimo 10 entregas; no cuentan las cuentas de Soporte Firmas ni las firmas en serie)'))),
    h('div',{style:{display:'grid',gridTemplateColumns:'minmax(0,1.1fr) minmax(0,1fr)',gap:18}},
      h('div',null,h('div',{style:{fontSize:10.5,letterSpacing:2,textTransform:'uppercase',color:'#9aa08e',fontWeight:800,marginBottom:8}},'Top 5 más rápidos'),
        RD.top.length?RD.top.map(function(r,i){return h('div',{key:r.u,style:{display:'grid',gridTemplateColumns:'46px 1fr auto',gap:12,alignItems:'center',padding:'10px 12px',marginBottom:8,borderRadius:14,background:'linear-gradient(90deg,rgba(200,168,75,'+(i===0?0.28:0.14)+'),rgba(200,168,75,0.02))',border:'1px solid rgba(200,168,75,'+(i===0?0.6:0.25)+')'}},
          h('div',{style:{width:40,height:40,borderRadius:'50%',background:medal[i],display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:22,color:'#1a1d13',boxShadow:'0 6px 14px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.5)'}},i+1),
          h('div',{style:{minWidth:0}},h('div',{style:{fontWeight:800,fontSize:14.5,letterSpacing:0.3}},r.u),h('div',{style:{fontSize:11.5,color:'#9aa08e'}},fmt(r.n)+' entregas · '+horaCL(r.ini)+' a '+horaCL(r.fin))),
          h('div',{style:{textAlign:'right'}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:34,color:'#3dffa0',lineHeight:1}},r.vel.toFixed(1)),h('div',{style:{fontSize:10,color:'#7fcfa5'}},'entregas / hora')));}):h('div',{style:{fontSize:12.5,color:'#9aa08e'}},'Aún no hay mensajeros con 10 o más entregas.')),
      h('div',null,h('div',{style:{fontSize:10.5,letterSpacing:2,textTransform:'uppercase',color:'#9aa08e',fontWeight:800,marginBottom:8}},'Resto del equipo · entregas'),
        h('div',{style:{maxHeight:330,overflowY:'auto',paddingRight:4}},RD.resto.map(function(r){return h('div',{key:r.u,title:fmt(r.n)+' entregas · '+r.vel.toFixed(1)+' por hora',style:{position:'relative',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',marginBottom:5,borderRadius:9,background:'rgba(255,255,255,0.04)',overflow:'hidden'}},
          h('div',{style:{position:'absolute',left:0,top:0,bottom:0,width:(r.n/mx*100)+'%',background:'linear-gradient(90deg,rgba(61,255,160,0.22),rgba(61,255,160,0.06))'}}),
          h('span',{style:{position:'relative',fontWeight:700,fontSize:12.5}},r.u,r.sop?h('span',{style:{marginLeft:8,fontSize:9.5,fontWeight:800,letterSpacing:0.5,padding:'2px 6px',borderRadius:6,background:'rgba(255,138,61,0.25)',color:'#ffb27a'}},'CUENTA USADA POR '+nombreCorto(r.sop).toUpperCase()):(r.r30>=20?h('span',{style:{marginLeft:8,fontSize:9.5,fontWeight:800,padding:'2px 6px',borderRadius:6,background:'rgba(255,90,90,0.25)',color:'#ff9a9a'}},r.r30+' EN 30 MIN'):null)),
          h('span',{style:{position:'relative',display:'flex',gap:10,alignItems:'baseline'}},h('span',{style:{fontSize:10.5,color:'#9aa08e'}},r.vel.toFixed(1)+'/h'),h('span',{style:{fontFamily:'Bebas Neue',fontSize:20}},fmt(r.n))));})))));
}
function SoporteFirmas(p){
  var M=p.M,ops=Object.keys(M.soporte);if(!ops.length)return null;
  return h('div',{style:Object.assign({},card,{padding:'16px 18px',marginBottom:16})},
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline',flexWrap:'wrap',gap:8,marginBottom:10}},h('div',{style:tit},'Soporte Firmas · teletrabajo'),h('div',{style:{fontSize:11.5,color:'var(--text-soft)'}},'Lo correcto: firman desde su propio usuario (Firmas Operadores). Si aparece la cuenta del mensajero, firmaron entrando a su usuario.')),
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(380px,1fr))',gap:14}},ops.map(function(nom){var o=M.soporte[nom];var st=o.staff;var col=st?st.color:'#999';
      var filas=o.mens.map(function(m){var pn=M.panel.filter(function(x){return x.a===nom&&normN(x.m)===normN(m);});var np=pn.reduce(function(a,x){return a+x.n;},0);var ini=pn.length?pn.map(function(x){return x.ini;}).sort()[0]:null,fin=pn.length?pn.map(function(x){return x.fin;}).sort().slice(-1)[0]:null;var r30=pn.reduce(function(a,x){return Math.max(a,x.r30||0);},0);
        var rd=(M.riders.top.concat(M.riders.resto)).find(function(r){return normN(r.u)===normN(m);});return {m:m,np:np,ini:ini,fin:fin,r30:r30,app:rd?rd.n:0,appR30:rd?rd.r30:0};});
      var otros=M.panel.filter(function(x){return x.a===nom&&!o.mens.some(function(m){return normN(m)===normN(x.m);});});
      var totP=filas.reduce(function(a,f){return a+f.np;},0)+otros.reduce(function(a,x){return a+x.n;},0),totA=filas.reduce(function(a,f){return a+f.app;},0);
      return h('div',{key:nom,style:{borderRadius:14,padding:'12px 14px',background:'rgba(255,255,255,0.85)',border:'1px solid rgba(43,46,32,0.07)',borderTop:'4px solid '+col}},
        h('div',{style:{display:'flex',alignItems:'center',gap:10,marginBottom:10}},
          h('div',{style:{width:34,height:34,borderRadius:'50%',background:col,color:'#fff',fontWeight:800,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}},inic(nom)),
          h('div',{style:{flex:1}},h('div',{style:{fontWeight:800}},nom),h('div',{style:{fontSize:11,color:'var(--text-soft)'}},'Atiende a '+o.mens.join(', '))),
          h('div',{style:{textAlign:'right'}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,color:'#2e9d5b',lineHeight:1}},fmt(totP)),h('div',{style:{fontSize:10,color:'var(--text-soft)'}},'firmadas desde su usuario')),
          totA>0&&h('div',{style:{textAlign:'right',marginLeft:10}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,color:'#f57c00',lineHeight:1}},fmt(totA)),h('div',{style:{fontSize:10,color:'var(--text-soft)'}},'desde la cuenta del mensajero'))),
        h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:12}},
          h('thead',null,h('tr',null,['Mensajero','Desde su usuario','Horario','Máx. en 30 min','Desde la cuenta del mensajero'].map(function(c,i){return h('th',{key:i,style:{textAlign:i?'right':'left',padding:'5px 4px',fontSize:9.5,letterSpacing:1,textTransform:'uppercase',color:'var(--text-soft)',borderBottom:'1px solid var(--border)'}},c);}))),
          h('tbody',null,filas.map(function(f){return h('tr',{key:f.m},
            h('td',{style:{padding:'6px 4px',fontWeight:700}},f.m),
            h('td',{style:{padding:'6px 4px',textAlign:'right',fontWeight:800,color:'#2e9d5b'}},fmt(f.np)),
            h('td',{style:{padding:'6px 4px',textAlign:'right',color:'var(--text-mid)'}},f.ini?horaCL(f.ini)+'–'+horaCL(f.fin):'—'),
            h('td',{style:{padding:'6px 4px',textAlign:'right',color:f.r30>=25?'#d32f2f':'var(--text-mid)',fontWeight:f.r30>=25?800:500}},f.r30||'—'),
            h('td',{style:{padding:'6px 4px',textAlign:'right',fontWeight:800,color:f.app?'#f57c00':'var(--text-soft)'}},f.app?fmt(f.app)+(f.appR30>=15?' · '+f.appR30+' en 30 min':''):'0'));}),
            otros.map(function(x){return h('tr',{key:'o'+x.m},h('td',{style:{padding:'6px 4px',color:'var(--text-mid)'}},x.m+' (no asignado)'),h('td',{style:{padding:'6px 4px',textAlign:'right',fontWeight:800}},fmt(x.n)),h('td',{style:{padding:'6px 4px',textAlign:'right'}},horaCL(x.ini)+'–'+horaCL(x.fin)),h('td',{style:{padding:'6px 4px',textAlign:'right'}},x.r30||'—'),h('td',null));}))));
    })));
}
function Feed(p){
  var KL={firma:['Firma','#2e9d5b'],correccion:['Corrección','#d32f2f'],asignacion:['Asignación','#c8a84b'],estado:['Estado','#5d8aa8'],reporte:['Incidencia','#7b1fa2'],resuelto:['Resuelta','#1565c0'],masiva:['Masiva','#f57c00']};
  var L=p.items;
  if(!L.length)return h('div',{style:{padding:24,textAlign:'center',color:'var(--text-soft)',fontSize:13}},'Sin movimientos registrados.');
  return h('div',{style:{maxHeight:p.alto||420,overflowY:'auto'}},L.map(function(f,i){var k=KL[f.k]||[f.k,'#777'];var col=p.colorDe?p.colorDe(f.a):'#999';
    return h('div',{key:i,style:{display:'grid',gridTemplateColumns:'52px 10px '+(p.sinNombre?'':'150px ')+'92px 1fr',gap:8,alignItems:'center',padding:'7px 8px',borderBottom:'1px solid rgba(43,46,32,0.06)',fontSize:12}},
      h('span',{style:{fontFamily:'JetBrains Mono',color:'var(--text-soft)',fontSize:11}},horaCL(f.ts)),
      h('span',{style:{width:8,height:8,borderRadius:'50%',background:col}}),
      !p.sinNombre&&h('span',{style:{fontWeight:700,color:'var(--dark)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},f.a),
      h('span',{style:{fontSize:10,fontWeight:800,letterSpacing:0.5,textTransform:'uppercase',color:'#fff',background:k[1],borderRadius:6,padding:'2px 6px',textAlign:'center'}},k[0]),
      h('span',{style:{color:'var(--text-mid)',minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},title:f.txt||''},
        f.cod&&h('a',{href:'#',onClick:function(e){e.preventDefault();p.onCodigo&&p.onCodigo(f.cod);},style:{fontFamily:'JetBrains Mono',fontWeight:700,color:'#7a6420',marginRight:6}},f.cod),
        f.e&&f.k!=='masiva'&&h('span',{style:{fontWeight:700,color:'var(--dark)',marginRight:6}},ESTADO_LBL[f.e]||f.e),
        f.txt||''));}));
}

function Panel(props){
  var toast=props.toast;
  var hoy=fechaHoyCL();
  var _f=useState(hoy),fecha=_f[0],setFecha=_f[1];
  var _d=useState(null),D=_d[0],setD=_d[1];
  var _e=useState(null),error=_e[0],setError=_e[1];
  var _s=useState(null),sel=_s[0],setSel=_s[1];
  var _fk=useState('todos'),fk=_fk[0],setFk=_fk[1];
  var _fa=useState(''),fa=_fa[0],setFa=_fa[1];
  var _cod=useState(null),cod=_cod[0],setCod=_cod[1];
  var _ce=useState(null),codEnv=_ce[0],setCodEnv=_ce[1];
  var _tick=useState(0),tick=_tick[0],setTick=_tick[1];
  var esHoy=fecha===hoy;
  var _F=useState(null),F=_F[0],setF=_F[1];
  function cargar(){db.rpc('supervision_datos',{p_desde:sumaD(fecha,-6),p_hasta:fecha}).then(function(r){if(r.error){setError(r.error.message);return;}setError(null);setD(r.data);});db.rpc('supervision_firmas',{p_fecha:fecha}).then(function(r){if(!r.error)setF(r.data);});}
  useEffect(function(){setD(null);cargar();if(!esHoy)return;var iv=setInterval(cargar,30000);var iv2=setInterval(function(){setTick(function(x){return x+1;});},15000);return function(){clearInterval(iv);clearInterval(iv2);};},[fecha]);
  useEffect(function(){if(!cod){setCodEnv(null);return;}var v=true;setCodEnv('cargando');db.from('envios').select('*').eq('codigo',cod).maybeSingle().then(function(q){if(v)setCodEnv(q&&q.data?q.data:{codigo:cod,_no:true});});return function(){v=false;};},[cod]);
  var M=useMemo(function(){return D?procesar(D,fecha,esHoy,F):null;},[D,F,tick]);
  var Ns=useMemo(function(){return D&&esHoy?necesidades(D.necesidad):[];},[D]);
  var Rs=useMemo(function(){return M?recomendaciones(Ns,M,esHoy):[];},[M,Ns]);
  var fichaRef=useRef(null);
  useEffect(function(){if(sel&&fichaRef.current){setTimeout(function(){try{fichaRef.current.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){}},350);}},[sel]);
  if(error)return h('div',{className:'panel',style:{margin:'28px 32px'}},h('div',{style:{color:'var(--danger)'}},'No se pudo cargar Supervisión: '+error));
  if(!M)return h('div',{style:{padding:60,textAlign:'center',color:'var(--text-soft)'}},'Cargando supervisión…');
  var colorDe=function(n){var s=M.staff.find(function(x){return x.nombre===n;});return s?s.color:'#999';};
  var tot={acc:0,firmas:0,rep:0,con:0,act:0,on:0,activos:0,corr:0,asig:0};
  M.staff.forEach(function(s){var p=M.P[s.nombre];tot.acc+=p.acc;tot.firmas+=p.firmas;tot.rep+=p.rep;tot.con+=p.con;tot.act+=p.act;tot.corr+=p.corr;tot.asig+=p.asig;if(p.estado!=='desconectado')tot.on++;if(p.estado==='activo')tot.activos++;});
  var ranking=M.staff.slice().sort(function(a,b){return M.P[b.nombre].acc-M.P[a.nombre].acc;});
  var feed=(D.feed||[]).filter(function(f){return (fk==='todos'||f.k===fk)&&(!fa||f.a===fa);});
  var SEV={3:['Crítico','#d32f2f'],2:['Alta','#f57c00'],1:['Normal','#1565c0']};
  var P=sel?M.P[sel]:null;
  var verEnvio=cod&&h(A.Modal,{title:'Envío '+cod,wide:true,onClose:function(){setCod(null);}},
    codEnv==='cargando'||!codEnv?h('div',{style:{padding:30,textAlign:'center'}},'Cargando…'):codEnv._no?h('div',null,'El envío ya no existe.'):h(A.EnvioDetalleCard,{key:cod,envio:codEnv}),
    h('div',{className:'modal-actions'},h('button',{className:'btn-secondary',onClick:function(){setCod(null);}},'Cerrar')));

  return h('div',{style:{padding:'28px 32px',maxWidth:'100%',boxSizing:'border-box'}},
    h('div',{className:'section-head',style:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}},
      h('div',null,h('div',{className:'section-title'},'Super',h('span',null,'visión')),h('div',{style:{fontSize:12,color:'var(--text-soft)',marginTop:2}},esHoy?('En vivo · se actualiza cada 30 segundos · '+horaCL(D.generado)):('Día '+dmy(fecha)))),
      h('div',{style:{display:'flex',gap:6,alignItems:'center'}},
        h('button',{className:'filter-btn'+(esHoy?' active':''),onClick:function(){setFecha(hoy);}},'Hoy'),
        h('button',{className:'filter-btn'+(fecha===sumaD(hoy,-1)?' active':''),onClick:function(){setFecha(sumaD(hoy,-1));}},'Ayer'),
        h('input',{type:'date',className:'form-input',value:fecha,max:hoy,onChange:function(e){if(e.target.value)setFecha(e.target.value);},style:{width:150}}))),
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:16}},
      h(Kpi,{l:esHoy?'Conectados ahora':'Se conectaron',v:esHoy?(tot.on+' / '+M.staff.length):M.staff.filter(function(s){return M.P[s.nombre].con>0;}).length,s:esHoy?(tot.activos+' activos en este momento'):'con el panel abierto',color:'#2e7d4f'}),
      h(Kpi,{l:'Movimientos',v:fmt(tot.acc),s:'todo el equipo',color:'#2b2e20'}),
      h(Kpi,{l:'Entregas firmadas',v:fmt(tot.firmas),s:'Soporte Firmas',color:'#2e9d5b'}),
      h(Kpi,{l:'Asignaciones',v:fmt(tot.asig),s:'envíos a mensajeros',color:'#c8a84b'}),
      h(Kpi,{l:'Incidencias',v:fmt(tot.rep),s:'reportadas',color:'#7b1fa2'}),
      h(Kpi,{l:'Correcciones',v:fmt(tot.corr),s:'de estado',color:'#d32f2f'}),
      h(Kpi,{l:'Tiempo conectado',v:hhmm(tot.con),s:'activo '+hhmm(tot.act),color:'#1565c0'})),
    h('div',{style:{display:'grid',gridTemplateColumns:'minmax(0,1.75fr) minmax(320px,1fr)',gap:16,marginBottom:16,alignItems:'start'}},
      h(Oficina3D,{M:M,sel:sel,onSelect:setSel,alto:620}),
      h('div',{style:{display:'flex',flexDirection:'column',gap:14,minWidth:0}},
        esHoy&&h('div',{style:Object.assign({},card,{padding:'14px 16px'})},
          h('div',{style:Object.assign({},tit,{marginBottom:8})},'Necesidad operativa ahora'),
          Ns.length===0?h('div',{style:{fontSize:12.5,color:'var(--text-soft)'}},'Sin pendientes relevantes.'):
          Ns.map(function(n){var sv=SEV[n.sev];return h('div',{key:n.k,style:{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',marginBottom:6,borderRadius:10,background:'rgba(255,255,255,0.8)',borderLeft:'4px solid '+sv[1]}},
            h('div',{style:{fontFamily:'Bebas Neue',fontSize:26,color:sv[1],minWidth:52,textAlign:'right'}},fmt(n.n)),
            h('div',{style:{fontSize:12.5,color:'var(--dark)',flex:1}},n.txt),
            h('span',{style:{fontSize:9.5,fontWeight:800,letterSpacing:1,textTransform:'uppercase',color:sv[1]}},sv[0]));})),
        h('div',{style:Object.assign({},card,{padding:'14px 16px'})},
          h('div',{style:Object.assign({},tit,{marginBottom:8})},'Recomendaciones'),
          !esHoy?h('div',{style:{fontSize:12.5,color:'var(--text-soft)'}},'Las recomendaciones se calculan en vivo (vista Hoy).'):
          Rs.length===0?h('div',{style:{fontSize:12.5,color:'var(--text-soft)'}},'Todo en orden.'):
          Rs.map(function(r,i){var sv=SEV[r.sev]||SEV[1];return h('div',{key:i,style:{display:'flex',gap:10,padding:'9px 10px',marginBottom:6,borderRadius:10,background:'rgba(255,255,255,0.8)',border:'1px solid rgba(43,46,32,0.06)',cursor:r.quien?'pointer':'default'},onClick:function(){if(r.quien)setSel(r.quien.nombre);}},
            r.quien?h('div',{style:{width:30,height:30,flex:'0 0 30px',borderRadius:'50%',background:r.quien.color,color:'#fff',fontWeight:800,fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 3px 8px '+r.quien.color+'66'}},inic(r.quien.nombre)):h('div',{style:{width:30,flex:'0 0 30px'}}),
            h('div',{style:{minWidth:0}},h('div',{style:{fontSize:12.5,fontWeight:700,color:'var(--dark)'}},h('span',{style:{color:sv[1]}},'● '),r.txt),r.por&&h('div',{style:{fontSize:11.5,color:'var(--text-soft)',marginTop:2}},r.por)));})))),
    // ficha individual
    h(PantallaRiders,{RD:M.riders,esHoy:esHoy,fecha:fecha}),
    h(SoporteFirmas,{M:M}),
    h('div',{ref:fichaRef,style:{scrollMarginTop:80}}),
    P&&h(Ficha,{P:P,M:M,feed:(D.feed||[]).filter(function(f){return f.a===sel;}),recs:Rs.filter(function(r){return r.quien&&r.quien.nombre===sel;}),fecha:fecha,esHoy:esHoy,onClose:function(){setSel(null);},onCodigo:setCod}),
    // comparativo
    h('div',{style:Object.assign({},card,{padding:'16px 18px',marginBottom:16})},
      h('div',{style:Object.assign({},tit,{marginBottom:10})},'Equipo · '+(esHoy?'hoy':dmy(fecha))),
      h('div',{style:{overflowX:'auto'}},h('table',{style:{width:'100%',borderCollapse:'collapse',minWidth:1150,fontSize:12.5}},
        h('thead',null,h('tr',null,['','Administrativo','Estado','Entrada','Conectado','Activo','Sin actividad','Desconectado','Pausas','Movimientos','Firmas','Asignaciones','Cambios de estado','Incidencias','Resueltas','Correcciones','Mov. / hora activa'].map(function(c,i){return h('th',{key:i,style:{textAlign:i>2?'right':'left',padding:'8px',fontSize:10,letterSpacing:1,textTransform:'uppercase',color:'var(--text-soft)',borderBottom:'2px solid var(--border)',whiteSpace:'nowrap'}},c);}))),
        h('tbody',null,ranking.map(function(s,i){var p=M.P[s.nombre];var COL={activo:'#2e9d5b',ausente:'#c98a1f',desconectado:'#8a8f82'};var T={activo:'Activo',ausente:'Sin actividad',desconectado:'Desconectado'};
          var td=function(v,b){return h('td',{style:{textAlign:'right',padding:'9px 8px',borderBottom:'1px solid var(--border)',fontWeight:b?800:500,fontFamily:b?'Bebas Neue':'inherit',fontSize:b?20:12.5}},v);};
          return h('tr',{key:s.nombre,onClick:function(){setSel(s.nombre);window.scrollTo({top:0,behavior:'smooth'});},style:{cursor:'pointer',background:sel===s.nombre?'rgba(200,168,75,0.12)':undefined}},
            h('td',{style:{padding:'9px 8px',borderBottom:'1px solid var(--border)'}},h('div',{style:{width:28,height:28,borderRadius:'50%',background:s.color,color:'#fff',fontWeight:800,fontSize:10.5,display:'flex',alignItems:'center',justifyContent:'center'}},inic(s.nombre))),
            h('td',{style:{padding:'9px 8px',borderBottom:'1px solid var(--border)',fontWeight:800}},s.nombre,h('div',{style:{fontSize:10.5,color:'var(--text-soft)',fontWeight:500}},p.esp)),
            h('td',{style:{padding:'9px 8px',borderBottom:'1px solid var(--border)',color:COL[p.estado],fontWeight:800,fontSize:11.5,whiteSpace:'nowrap'}},esHoy?T[p.estado]:(p.con>0?'Se conectó':'—'),esHoy&&p.estado==='ausente'?h('div',{style:{fontSize:10.5,fontWeight:600}},'hace '+durTxt(p.minSinAct)):null,esHoy&&p.estado==='desconectado'&&p.minDesc?h('div',{style:{fontSize:10.5,fontWeight:600}},'hace '+durTxt(p.minDesc)):null),
            td(p.pulso&&p.pulso.ini?horaCL(p.pulso.ini):(p.primera!=null?p.primera+':00':'—')),td(p.con?hhmm(p.con):'—'),td(p.con?Math.round(p.act/p.con*100)+'%':'—'),td(p.con?hhmm(p.inact+p.oculto):'—'),td(p.desc?hhmm(p.desc):'—'),td(p.con?fmt(p.pausas):'—'),
            td(fmt(p.acc),true),td(fmt(p.firmas)),td(fmt(p.asig)),td(fmt(p.estados)),td(fmt(p.rep)),td(fmt(p.res)),td(fmt(p.corr)),td(p.prod!=null?p.prod.toFixed(1):'—'));}))))),
    // feed general
    h('div',{style:Object.assign({},card,{padding:'16px 18px'})},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:10}},
        h('div',{style:tit},'Cada movimiento · '+(esHoy?'hoy':dmy(fecha))+' ('+fmt(feed.length)+')'),
        h('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},
          h('select',{className:'form-input',value:fa,onChange:function(e){setFa(e.target.value);},style:{width:190,padding:'4px 8px',fontSize:12}},h('option',{value:''},'Todo el equipo'),M.staff.map(function(s){return h('option',{key:s.nombre,value:s.nombre},s.nombre);})),
          [['todos','Todos'],['firma','Firmas'],['asignacion','Asignaciones'],['estado','Estados'],['reporte','Incidencias'],['resuelto','Resueltas'],['correccion','Correcciones'],['masiva','Masivas']].map(function(o){return h('button',{key:o[0],className:'filter-btn'+(fk===o[0]?' active':''),onClick:function(){setFk(o[0]);},style:{padding:'4px 10px',fontSize:11.5}},o[1]);}))),
      h(Feed,{items:feed,colorDe:colorDe,onCodigo:setCod,alto:460})),
    verEnvio);
}

function Ficha(props){
  var P=props.P,s=P.s,M=props.M;
  var COL={activo:'#2e9d5b',ausente:'#c98a1f',desconectado:'#8a8f82'};var T={activo:'Activo ahora',ausente:'Panel abierto, sin actividad',desconectado:'Desconectado'};
  var tipos=Object.keys(P.tipos).filter(function(t){return P.tipos[t]>0;}).sort(function(a,b){return P.tipos[b]-P.tipos[a];});var maxT=tipos.length?P.tipos[tipos[0]]:1;
  var secc=Object.keys(P.secc).sort(function(a,b){return P.secc[b]-P.secc[a];});var maxS=secc.length?P.secc[secc[0]]:1;
  var dias=Object.keys(P.dias).sort();var maxD=Math.max.apply(null,dias.map(function(d){return P.dias[d].acc;}).concat([1]));
  var vsProm=P.prom7?Math.round((P.acc/P.prom7-1)*100):null;
  var mini=function(l,v,sub){return h('div',{style:{padding:'10px 12px',borderRadius:12,background:'rgba(255,255,255,0.85)',border:'1px solid rgba(43,46,32,0.07)'}},h('div',{style:{fontSize:9.5,letterSpacing:1.5,textTransform:'uppercase',color:'var(--text-soft)',fontWeight:700}},l),h('div',{style:{fontFamily:'Bebas Neue',fontSize:26,color:'var(--dark)',lineHeight:1.1}},v),sub&&h('div',{style:{fontSize:10.5,color:'var(--text-soft)'}},sub));};
  return h('div',{style:Object.assign({},card,{padding:'18px 20px',marginBottom:16,borderTop:'5px solid '+s.color})},
    h('div',{style:{display:'flex',alignItems:'center',gap:14,marginBottom:14,flexWrap:'wrap'}},
      h('div',{style:{width:58,height:58,borderRadius:'50%',background:'radial-gradient(circle at 30% 30%, '+s.color+'ee, '+s.color+')',color:'#fff',fontWeight:800,fontSize:20,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 20px '+s.color+'66, inset 0 2px 0 rgba(255,255,255,0.35)'}},inic(s.nombre)),
      h('div',{style:{flex:1,minWidth:200}},
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:1.5,color:'var(--dark)',lineHeight:1}},s.nombre),
        h('div',{style:{fontSize:12,color:'var(--text-soft)',marginTop:3}},(s.rol==='operador'?'Operador':'Administrativo')+' · '+P.esp+(s.corr?' · Permiso de corrección de estados':'')),
        h('div',{style:{fontSize:12.5,marginTop:5,fontWeight:700,color:COL[P.estado]}},props.esHoy?T[P.estado]:'',props.esHoy&&P.pulso&&P.estado!=='desconectado'?h('span',{style:{color:'var(--text-mid)',fontWeight:500}},' · '+secAccion(P.pulso.s)+(P.pulso.det?' ('+P.pulso.det+')':'')+' · '+hace(P.pulso.ts)+(P.pulso.dev?' · '+P.pulso.dev:'')):null,
          props.esHoy&&P.estado==='desconectado'&&P.pulso?h('span',{style:{color:'var(--text-mid)',fontWeight:500}},' · última señal '+horaCL(P.pulso.ts)):null)),
      h('button',{className:'btn-secondary',onClick:props.onClose,style:{padding:'6px 14px',fontSize:12}},'Cerrar ficha')),
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:16}},
      mini('Entrada',P.pulso&&P.pulso.ini?horaCL(P.pulso.ini):(P.primera!=null?P.primera+':00':'—')),
      mini('Última señal',P.pulso?horaCL(P.pulso.ts):'—'),
      mini('Conectado',P.con?hhmm(P.con):'—'),
      mini('Activo',P.act?hhmm(P.act):'—',P.con?Math.round(P.act/P.con*100)+'% del tiempo conectado':null),
      mini('Movimientos',fmt(P.acc),vsProm!=null?((vsProm>=0?'+':'')+vsProm+'% vs su promedio 7 días'):null),
      mini('Mov. / hora activa',P.prod!=null?P.prod.toFixed(1):'—'),
      mini('Firmas',fmt(P.firmas)),mini('Incidencias',fmt(P.rep),P.res?fmt(P.res)+' resueltas':null),
      mini('Sin actividad',P.con?hhmm(P.inact+P.oculto):'—',P.oculto?hhmm(P.oculto)+' con la ventana minimizada':null),
      mini('Desconectado',P.desc?hhmm(P.desc):'—','entre su entrada y '+(props.esHoy?'ahora':'su salida')),
      mini('Pausas (3+ min)',fmt(P.pausas),P.pausaMax?'la más larga '+durTxt(P.pausaMax):null),
      props.esHoy&&P.estado!=='activo'&&P.pulso?mini(P.estado==='ausente'?'Sin actividad hace':'Desconectado hace',durTxt(P.estado==='ausente'?P.minSinAct:P.minDesc),P.sinActDesde?'última actividad '+horaCL(P.sinActDesde):null):null),
    h('div',{style:{display:'grid',gridTemplateColumns:'minmax(0,1.6fr) minmax(280px,1fr)',gap:16,marginBottom:16}},
      h('div',{style:{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.85)',border:'1px solid rgba(43,46,32,0.06)'}},h('div',{style:Object.assign({},tit,{fontSize:15,marginBottom:10})},'Jornada minuto a minuto'),h(Jornada,{tramos:P.tramos})),
      h('div',{style:{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.85)',border:'1px solid rgba(43,46,32,0.06)'}},h('div',{style:Object.assign({},tit,{fontSize:15,marginBottom:8})},'Registro de inactividad'),h(RegistroInactividad,{tramos:P.tramos}))),
    props.recs.length>0&&h('div',{style:{marginBottom:14,padding:'10px 12px',borderRadius:12,background:'rgba(200,168,75,0.12)',border:'1px solid rgba(200,168,75,0.4)'}},
      h('div',{style:{fontSize:10,letterSpacing:1.5,textTransform:'uppercase',fontWeight:800,color:'#7a6420',marginBottom:4}},'Recomendado para '+nombreCorto(s.nombre)),
      props.recs.map(function(r,i){return h('div',{key:i,style:{fontSize:12.5,color:'var(--dark)',marginBottom:3}},'• '+r.txt+(r.por?' '+r.por:''));})),
    h('div',{style:{display:'grid',gridTemplateColumns:'minmax(0,1.6fr) minmax(260px,1fr)',gap:16,marginBottom:16}},
      h('div',{style:{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.85)',border:'1px solid rgba(43,46,32,0.06)'}},h('div',{style:Object.assign({},tit,{fontSize:15,marginBottom:8})},'Actividad por hora'),h(GraficoHoras,{horas:P.horas,color:s.color})),
      h('div',{style:{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.85)',border:'1px solid rgba(43,46,32,0.06)'}},h('div',{style:Object.assign({},tit,{fontSize:15,marginBottom:8})},'Últimos 7 días'),
        h('div',{style:{display:'flex',alignItems:'flex-end',gap:6,height:130}},dias.map(function(d){var q=P.dias[d];return h('div',{key:d,title:dmy(d)+': '+q.acc+' movimientos · conectado '+hhmm(q.con),style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%'}},
          h('div',{style:{fontSize:10,fontWeight:800}},q.acc||''),
          h('div',{style:{width:'100%',maxWidth:30,height:Math.max(q.acc?4:0,Math.round(q.acc/maxD*90)),borderRadius:'6px 6px 2px 2px',background:d===props.fecha?'linear-gradient(180deg,'+s.color+','+s.color+'aa)':'linear-gradient(180deg,#d9c78f,#b8a061)'}}),
          h('div',{style:{fontSize:9.5,color:'var(--text-soft)',marginTop:3}},dmy(d).slice(0,5)),
          h('div',{style:{fontSize:9,color:'var(--text-soft)'}},q.con?hhmm(q.con).replace(' ',''):''));})))),
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16,marginBottom:16}},
      h('div',{style:{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.85)',border:'1px solid rgba(43,46,32,0.06)'}},h('div',{style:Object.assign({},tit,{fontSize:15,marginBottom:8})},'Qué hizo'),
        tipos.length?tipos.map(function(t){return h(BarraH,{key:t,l:tipoLbl(t),v:P.tipos[t],max:maxT,c:colorTipo(t)});}):h('div',{style:{fontSize:12,color:'var(--text-soft)'}},'Sin movimientos registrados este día.'),
        P.mas>0&&h('div',{style:{fontSize:11,color:'var(--text-soft)',marginTop:4}},P.mas+' acciones masivas sobre '+fmt(P.masEnv)+' envíos.')),
      h('div',{style:{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.85)',border:'1px solid rgba(43,46,32,0.06)'}},h('div',{style:Object.assign({},tit,{fontSize:15,marginBottom:8})},'Dónde estuvo (tiempo por sección)'),
        secc.length?secc.map(function(k){return h(BarraH,{key:k,l:secLabel(k),v:P.secc[k],max:maxS,c:s.color,txt:hhmm(P.secc[k])});}):h('div',{style:{fontSize:12,color:'var(--text-soft)'}},'Sin registro de conexión este día (el registro de conexión empezó el 05-11-2026).'))),
    h('div',{style:{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.85)',border:'1px solid rgba(43,46,32,0.06)'}},
      h('div',{style:Object.assign({},tit,{fontSize:15,marginBottom:6})},'Movimientos de '+nombreCorto(s.nombre)+' ('+fmt(props.feed.length)+')'),
      h(Feed,{items:props.feed,sinNombre:true,colorDe:function(){return s.color;},onCodigo:props.onCodigo,alto:340})));
}

window.__supervision={Panel:Panel};
})();
