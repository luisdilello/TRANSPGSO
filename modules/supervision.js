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
function horaCL(ts){try{return new Date(ts).toLocaleTimeString('es-CL',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit'});}catch(e){return '';}}
function hace(ts){var s=Math.max(0,(Date.now()-new Date(ts).getTime())/1000);if(s<60)return 'hace segundos';if(s<3600)return 'hace '+Math.round(s/60)+' min';return 'hace '+Math.floor(s/3600)+' h '+Math.round((s%3600)/60)+' min';}
function fmt(n){return Number(n||0).toLocaleString('es-CL');}
function inic(n){return String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(function(p){return p[0];}).join('').toUpperCase();}
function nombreCorto(n){var p=String(n||'').split(/\s+/);return p[0]?(p[0][0]+p[0].slice(1).toLowerCase()):n;}

// ---------- procesamiento ----------
function procesar(D,fecha,esHoy){
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
  staff.forEach(function(s){var p=P[s.nombre];
    for(var hr=0;hr<24;hr++){if(p.horas[hr].acc>0||p.horas[hr].con>0){if(p.primera==null)p.primera=hr;p.ultima=hr;}}
    var est='desconectado';
    if(esHoy&&p.pulso){var edad=(Date.now()-new Date(p.pulso.ts).getTime())/1000;if(edad<200)est=(p.pulso.act&&p.pulso.vis)?'activo':'ausente';}
    p.estado=est;
    p.prod=p.act>5?p.acc/(p.act/60):null;
    var dsum=0,dn=0;Object.keys(p.dias).forEach(function(d){if(d!==fecha&&p.dias[d].acc>0){dsum+=p.dias[d].acc;dn++;}});p.prom7=dn?dsum/dn:null;
    // especialidad (7 días)
    var g={'Soporte Firmas':0,'Bodega y asignación':0,'Control y correcciones':0,'Supervisión de evidencias':0};
    Object.keys(p.tipos7).forEach(function(t){var n=p.tipos7[t];if(t.indexOf('firma_')===0)g['Soporte Firmas']+=n;else if(t==='asignacion'||t==='estado_en_bodega'||t==='estado_en_ruta'||t==='colecta'||t==='masiva')g['Bodega y asignación']+=n;else if(t==='correccion'||t==='estado_reprogramado'||t==='estado_siniestro'||t==='estado_en_bodega_fecha'||t==='estado_cancelado'||t==='estado_en_bodega_cancelado'||t==='estado_retorno')g['Control y correcciones']+=n;else if(t==='reporte'||t==='resuelto')g['Supervisión de evidencias']+=n*8;});
    var best=Object.keys(g).sort(function(a,b){return g[b]-g[a];})[0];p.esp=g[best]>0?best:'Sin actividad reciente';
    // últimos minutos sin acciones
    p.accUltHora=esHoy?(p.horas[(D.necesidad&&D.necesidad.hora)||0]||{acc:0}).acc:0;
  });
  return {staff:staff,P:P};
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
    cands.sort(function(a,b){return (orden[a.p.estado]-orden[b.p.estado])||(b.sk-a.sk);});
    var c=cands[0];
    if(!c){R.push({sev:nd.sev,quien:null,txt:nd.accion+': '+fmt(nd.n)+' '+nd.txt+'. Nadie del equipo lo ha trabajado esta semana.'});return;}
    var por=c.sk>0?(fmt(c.sk)+' movimientos de este tipo en 7 días'):'está conectado ahora';
    R.push({sev:nd.sev,quien:c.p.s,txt:nd.accion+' — '+fmt(nd.n)+' '+nd.txt+'.',por:nombreCorto(c.p.s.nombre)+' '+(c.p.estado==='activo'?'está activo':c.p.estado==='ausente'?'tiene el panel abierto':'no está conectado')+' y es quien más lo trabaja ('+por+').'});
  });
  if(esHoy){
    M.staff.forEach(function(s){var p=M.P[s.nombre];
      if(p.estado==='ausente')R.push({sev:2,quien:s,txt:nombreCorto(s.nombre)+' tiene el panel abierto pero sin actividad '+(p.pulso?hace(p.pulso.ts):'')+'.',por:'Última sección: '+secLabel(p.pulso&&p.pulso.s)+'.'});
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
  var t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;return t;
}
function pantallaCanvas(T,p){
  var w=256,hh=160,c=document.createElement('canvas');c.width=w;c.height=hh;var x=c.getContext('2d');
  var on=p&&p.estado!=='desconectado';
  var g=x.createLinearGradient(0,0,0,hh);g.addColorStop(0,on?'#0d2b22':'#0b0c0a');g.addColorStop(1,on?'#071712':'#060706');x.fillStyle=g;x.fillRect(0,0,w,hh);
  if(on){
    x.fillStyle=p.estado==='activo'?'#39e58c':'#ffc93c';x.font='bold 18px sans-serif';x.fillText(secLabel(p.pulso&&p.pulso.s).toUpperCase().slice(0,22),12,26);
    var hs=p.horas.slice(7,23),mx=Math.max.apply(null,hs.map(function(q){return q.acc;}).concat([1]));
    hs.forEach(function(q,i){var bh=Math.round(q.acc/mx*80);x.fillStyle=i%2?'#2fbf7a':'#3fe091';x.fillRect(12+i*14.5,140-bh,10,bh);});
    x.fillStyle='#bfeedd';x.font='bold 22px sans-serif';x.textAlign='right';x.fillText(fmt(p.acc),w-12,28);
  }
  var t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;
}

function Oficina3D(props){
  var ref=useRef(null),overlay=useRef(null),api=useRef(null),ultProps=useRef(props);ultProps.current=props;
  var _err=useState(null),err=_err[0],setErr=_err[1];
  var M=props.M;
  useEffect(function(){
    if(!webglOk()){setErr('Este equipo no soporta 3D; se muestra la vista simple.');return;}
    var vivo=true,cleanup=null;
    cargarThree().then(function(T){if(!vivo)return;cleanup=montar(T);}).catch(function(){setErr('No se pudo cargar el motor 3D.');});
    function montar(T){
      var el=ref.current;var W=el.clientWidth,H=el.clientHeight;
      var renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.setSize(W,H);
      renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
      el.appendChild(renderer.domElement);renderer.domElement.style.display='block';renderer.domElement.style.borderRadius='18px';
      var scene=new T.Scene();scene.background=new T.Color('#0e110d');scene.fog=new T.Fog('#0e110d',26,60);
      var cam=new T.PerspectiveCamera(32,W/H,0.1,200);
      // luces
      scene.add(new T.HemisphereLight('#fff6e0','#1a1c14',0.55));
      var sun=new T.DirectionalLight('#ffe9c2',1.15);sun.position.set(10,18,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-18;sun.shadow.bias=-0.0004;sun.shadow.radius=4;scene.add(sun);
      var rim=new T.DirectionalLight('#7fb4ff',0.35);rim.position.set(-12,8,-10);scene.add(rim);
      // piso
      var piso=new T.Mesh(new T.PlaneGeometry(80,80),new T.MeshStandardMaterial({color:'#181b14',roughness:0.92,metalness:0.05}));piso.rotation.x=-Math.PI/2;piso.receiveShadow=true;scene.add(piso);
      var grid=new T.GridHelper(80,80,'#3a3520','#23261c');grid.material.transparent=true;grid.material.opacity=0.35;grid.position.y=0.002;scene.add(grid);
      var n=M.staff.length||1, cols=n<=3?n:Math.ceil(n/2), rows=Math.ceil(n/cols), sx=5.2, sz=4.6;
      var ancho=cols*sx, fondo=rows*sz;
      // alfombra de zona + borde dorado
      var zona=new T.Mesh(new T.PlaneGeometry(ancho+3,fondo+3),new T.MeshStandardMaterial({color:'#20241a',roughness:0.85}));zona.rotation.x=-Math.PI/2;zona.position.y=0.004;zona.receiveShadow=true;scene.add(zona);
      var bordeG=new T.EdgesGeometry(new T.PlaneGeometry(ancho+3,fondo+3));var borde=new T.LineSegments(bordeG,new T.LineBasicMaterial({color:'#c8a84b',transparent:true,opacity:0.7}));borde.rotation.x=-Math.PI/2;borde.position.y=0.01;scene.add(borde);
      var rotulo=new T.Mesh(new T.PlaneGeometry(6,0.9),new T.MeshBasicMaterial({map:textoCanvas(T,[{t:'OPERACIONES · ADMINISTRATIVOS',font:'bold 40px sans-serif',color:'#c8a84b',x:512,y:64,align:'center'}],1024,128),transparent:true}));rotulo.rotation.x=-Math.PI/2;rotulo.position.set(0,0.012,fondo/2+1.05);scene.add(rotulo);
      // pared con pantalla
      var pared=new T.Mesh(new T.BoxGeometry(ancho+3,3.6,0.25),new T.MeshStandardMaterial({color:'#1d2018',roughness:0.8}));pared.position.set(0,1.8,-fondo/2-1.6);pared.receiveShadow=true;scene.add(pared);
      var tvMat=new T.MeshBasicMaterial({color:'#ffffff'});var tv=new T.Mesh(new T.PlaneGeometry(Math.min(7,ancho),1.9),tvMat);tv.position.set(0,2.05,-fondo/2-1.46);scene.add(tv);
      var tvMarco=new T.Mesh(new T.BoxGeometry(Math.min(7,ancho)+0.18,2.08,0.08),new T.MeshStandardMaterial({color:'#0a0a0a',metalness:0.6,roughness:0.3}));tvMarco.position.set(0,2.05,-fondo/2-1.51);scene.add(tvMarco);
      var tira=new T.Mesh(new T.BoxGeometry(ancho+3,0.05,0.05),new T.MeshBasicMaterial({color:'#c8a84b'}));tira.position.set(0,0.06,-fondo/2-1.46);scene.add(tira);
      // escritorios
      var matMesa=new T.MeshStandardMaterial({color:'#d9b85c',roughness:0.42,metalness:0.25});
      var matCuerpo=new T.MeshStandardMaterial({color:'#b8963f',roughness:0.55,metalness:0.2});
      var matOscuro=new T.MeshStandardMaterial({color:'#2a2c26',roughness:0.5,metalness:0.4});
      var matSilla=new T.MeshStandardMaterial({color:'#33362e',roughness:0.7});
      var matPiel=new T.MeshStandardMaterial({color:'#e9c3a0',roughness:0.6});
      var puestos=[],clic=[];
      M.staff.forEach(function(s,i){
        var c=i%cols,r=Math.floor(i/cols);
        var g=new T.Group();g.position.set((c-(cols-1)/2)*sx,0,(r-(rows-1)/2)*sz);g.rotation.y=-0.0;scene.add(g);
        var top=new T.Mesh(new T.BoxGeometry(2.6,0.12,1.3),matMesa);top.position.y=0.86;top.castShadow=true;top.receiveShadow=true;g.add(top);
        var cajon=new T.Mesh(new T.BoxGeometry(0.75,0.8,1.15),matCuerpo);cajon.position.set(0.85,0.42,0);cajon.castShadow=true;g.add(cajon);
        var pata=new T.Mesh(new T.BoxGeometry(0.08,0.8,1.15),matCuerpo);pata.position.set(-1.22,0.42,0);pata.castShadow=true;g.add(pata);
        var pie=new T.Mesh(new T.BoxGeometry(0.22,0.28,0.1),matOscuro);pie.position.set(0,1.06,-0.38);g.add(pie);
        var mon=new T.Mesh(new T.BoxGeometry(1.25,0.78,0.06),matOscuro);mon.position.set(0,1.5,-0.42);mon.castShadow=true;g.add(mon);
        var scrMat=new T.MeshBasicMaterial({color:'#ffffff',map:pantallaCanvas(T,null)});var scr=new T.Mesh(new T.PlaneGeometry(1.16,0.7),scrMat);scr.position.set(0,1.5,-0.388);g.add(scr);
        var tec=new T.Mesh(new T.BoxGeometry(0.8,0.03,0.26),matOscuro);tec.position.set(-0.1,0.935,0.1);g.add(tec);
        var taza=new T.Mesh(new T.CylinderGeometry(0.07,0.06,0.15,16),new T.MeshStandardMaterial({color:'#f2efe6',roughness:0.4}));taza.position.set(0.95,1.0,0.15);g.add(taza);
        // silla
        var silla=new T.Group();silla.position.set(0,0,0.95);g.add(silla);
        var asiento=new T.Mesh(new T.BoxGeometry(0.62,0.1,0.6),matSilla);asiento.position.y=0.55;asiento.castShadow=true;silla.add(asiento);
        var resp=new T.Mesh(new T.BoxGeometry(0.62,0.7,0.09),matSilla);resp.position.set(0,0.95,0.3);resp.castShadow=true;silla.add(resp);
        var eje=new T.Mesh(new T.CylinderGeometry(0.04,0.04,0.45,10),matOscuro);eje.position.y=0.3;silla.add(eje);
        var base=new T.Mesh(new T.CylinderGeometry(0.32,0.32,0.05,20),matOscuro);base.position.y=0.05;silla.add(base);
        // persona
        var colP=new T.Color(s.color);
        var per=new T.Group();per.position.set(0,0,0.92);g.add(per);
        var matRopa=new T.MeshStandardMaterial({color:colP,roughness:0.55,emissive:colP,emissiveIntensity:0.12});
        var torso=new T.Mesh(new T.CapsuleGeometry(0.24,0.42,6,14),matRopa);torso.position.y=1.12;torso.castShadow=true;per.add(torso);
        var cabeza=new T.Mesh(new T.SphereGeometry(0.2,24,18),matPiel);cabeza.position.y=1.66;cabeza.castShadow=true;per.add(cabeza);
        var pelo=new T.Mesh(new T.SphereGeometry(0.205,24,12,0,Math.PI*2,0,Math.PI/2.1),new T.MeshStandardMaterial({color:'#2b2118',roughness:0.8}));pelo.position.y=1.69;pelo.rotation.x=0.25;per.add(pelo);
        var brazoI=new T.Mesh(new T.CapsuleGeometry(0.07,0.42,4,8),matRopa);brazoI.position.set(-0.3,1.08,-0.25);brazoI.rotation.x=1.2;per.add(brazoI);
        var brazoD=brazoI.clone();brazoD.position.x=0.3;per.add(brazoD);
        var piernas=new T.Mesh(new T.BoxGeometry(0.42,0.16,0.5),new T.MeshStandardMaterial({color:'#2d3340',roughness:0.7}));piernas.position.set(0,0.66,-0.15);per.add(piernas);
        // anillo de estado + luz
        var anillo=new T.Mesh(new T.RingGeometry(1.75,1.92,64),new T.MeshBasicMaterial({color:'#39e58c',transparent:true,opacity:0.85,side:T.DoubleSide}));anillo.rotation.x=-Math.PI/2;anillo.position.y=0.02;g.add(anillo);
        var halo=new T.Mesh(new T.CircleGeometry(1.75,64),new T.MeshBasicMaterial({color:'#39e58c',transparent:true,opacity:0.08}));halo.rotation.x=-Math.PI/2;halo.position.y=0.015;g.add(halo);
        var luz=new T.PointLight('#39e58c',0.0,4.5,2);luz.position.set(0,1.6,0.2);g.add(luz);
        var hit=new T.Mesh(new T.BoxGeometry(3,2.2,2.6),new T.MeshBasicMaterial({visible:false}));hit.position.y=1;hit.userData.nombre=s.nombre;g.add(hit);clic.push(hit);
        puestos.push({s:s,g:g,scrMat:scrMat,per:per,brazoI:brazoI,brazoD:brazoD,anillo:anillo,halo:halo,luz:luz,cabeza:cabeza,torso:torso,fase:Math.random()*6,estado:'desconectado',acc:0,parts:[]});
      });
      // partículas de datos
      var partGeo=new T.BoxGeometry(0.07,0.07,0.07);
      function chispa(pu,color){var m=new T.Mesh(partGeo,new T.MeshBasicMaterial({color:color||'#ffd56a',transparent:true,opacity:1}));m.position.set(pu.g.position.x+(Math.random()-0.5)*0.9,1.9,pu.g.position.z-0.4+(Math.random()-0.5)*0.2);m.userData.v=0.9+Math.random()*0.8;m.userData.vida=0;scene.add(m);pu.parts.push(m);}
      // cámara orbital
      var radio=Math.max(16,ancho*1.55+6),az=0.62,elev=0.72,objetivo=new T.Vector3(0,0.8,0),objDest=objetivo.clone(),radioDest=radio,arrastre=null,ultimoInput=0;
      function ubicarCam(){cam.position.set(objetivo.x+radio*Math.sin(az)*Math.cos(elev),objetivo.y+radio*Math.sin(elev),objetivo.z+radio*Math.cos(az)*Math.cos(elev));cam.lookAt(objetivo);}
      ubicarCam();
      var dom=renderer.domElement;dom.style.cursor='grab';dom.style.touchAction='none';
      var ray=new T.Raycaster(),mouse=new T.Vector2(),hover=null;
      function pick(ev){var r=dom.getBoundingClientRect();mouse.x=((ev.clientX-r.left)/r.width)*2-1;mouse.y=-((ev.clientY-r.top)/r.height)*2+1;ray.setFromCamera(mouse,cam);var it=ray.intersectObjects(clic,false);return it.length?it[0].object.userData.nombre:null;}
      function down(ev){arrastre={x:ev.clientX,y:ev.clientY,az:az,elev:elev,mov:0};dom.setPointerCapture&&dom.setPointerCapture(ev.pointerId);dom.style.cursor='grabbing';ultimoInput=Date.now();}
      function move(ev){if(arrastre){var dx=ev.clientX-arrastre.x,dy=ev.clientY-arrastre.y;arrastre.mov=Math.max(arrastre.mov,Math.abs(dx)+Math.abs(dy));az=arrastre.az-dx*0.006;elev=Math.max(0.28,Math.min(1.25,arrastre.elev+dy*0.004));ultimoInput=Date.now();return;}var nm=pick(ev);if(nm!==hover){hover=nm;dom.style.cursor=nm?'pointer':'grab';}}
      function up(ev){if(arrastre&&arrastre.mov<6){var nm=pick(ev);props.onSelect&&props.onSelect(nm);}arrastre=null;dom.style.cursor=hover?'pointer':'grab';}
      function wheel(ev){ev.preventDefault();radioDest=Math.max(8,Math.min(60,radioDest*(ev.deltaY>0?1.1:0.9)));ultimoInput=Date.now();}
      dom.addEventListener('pointerdown',down);dom.addEventListener('pointermove',move);dom.addEventListener('pointerup',up);dom.addEventListener('wheel',wheel,{passive:false});
      var ro=new ResizeObserver(function(){var w=el.clientWidth,hh=el.clientHeight;if(!w||!hh)return;renderer.setSize(w,hh);cam.aspect=w/hh;cam.updateProjectionMatrix();});ro.observe(el);
      var COL={activo:'#39e58c',ausente:'#ffc93c',desconectado:'#5b5f55'};
      var selPrevio='__inicio__';
      function aplicar(MM,sel){
        puestos.forEach(function(pu){var p=MM.P[pu.s.nombre];if(!p)return;
          var nuevo=p.acc-pu.acc;if(pu.acc>0&&nuevo>0){for(var k=0;k<Math.min(14,nuevo);k++)setTimeout(function(){chispa(pu);},k*90);}pu.acc=p.acc;
          pu.estado=p.estado;var c=new T.Color(COL[p.estado]);pu.anillo.material.color=c;pu.halo.material.color=c;pu.luz.color=c;
          pu.anillo.material.opacity=sel===pu.s.nombre?1:0.75;
          pu.per.visible=p.estado!=='desconectado';
          if(pu.scrMat.map)pu.scrMat.map.dispose();pu.scrMat.map=pantallaCanvas(T,p);pu.scrMat.needsUpdate=true;
        });
        var tot=0,on=0;MM.staff.forEach(function(s){var p=MM.P[s.nombre];tot+=p.acc;if(p.estado!=='desconectado')on++;});
        if(tvMat.map)tvMat.map.dispose();
        tvMat.map=textoCanvas(T,[{t:'TRANSPGSO · CENTRO DE OPERACIONES',font:'bold 34px sans-serif',color:'#c8a84b',x:40,y:50},{t:fmt(tot),font:'bold 120px sans-serif',color:'#ffffff',x:40,y:165},{t:'movimientos del equipo',font:'28px sans-serif',color:'#9aa08e',x:44,y:235},{t:on+' / '+MM.staff.length,font:'bold 110px sans-serif',color:'#39e58c',x:984,y:160,align:'right'},{t:'conectados ahora',font:'28px sans-serif',color:'#9aa08e',x:984,y:235,align:'right'}],1024,280,'#0b0f0c');tvMat.needsUpdate=true;
        if(sel===selPrevio)return;selPrevio=sel;
        if(sel){var pu=puestos.find(function(q){return q.s.nombre===sel;});if(pu){objDest.set(pu.g.position.x,0.9,pu.g.position.z);radioDest=Math.max(9,radio*0.7);}}else{objDest.set(0,0.8,0);radioDest=Math.max(16,ancho*1.55+6);}
      }
      api.current={aplicar:aplicar};aplicar(ultProps.current.M,ultProps.current.sel);
      // etiquetas HTML
      var v3=new T.Vector3();
      var reloj=new T.Clock(),raf=0;
      function frame(){
        raf=requestAnimationFrame(frame);var dt=Math.min(0.05,reloj.getDelta()),t=reloj.elapsedTime;
        if(!arrastre&&Date.now()-ultimoInput>6000)az+=dt*0.05;
        objetivo.lerp(objDest,0.06);radio+=(radioDest-radio)*0.06;ubicarCam();
        puestos.forEach(function(pu){
          var act=pu.estado==='activo';
          pu.luz.intensity+=((act?1.1:pu.estado==='ausente'?0.55:0)-pu.luz.intensity)*0.08;
          pu.halo.material.opacity=0.06+(act?0.06*(1+Math.sin(t*2.4+pu.fase)):0.02);
          if(pu.per.visible){
            var b=act?Math.sin(t*14+pu.fase)*0.06:0;pu.brazoI.rotation.x=1.2+b;pu.brazoD.rotation.x=1.2-b;
            pu.cabeza.rotation.y=act?Math.sin(t*0.7+pu.fase)*0.25:Math.sin(t*0.3)*0.5;
            pu.torso.position.y=1.12+(act?Math.sin(t*2+pu.fase)*0.008:0);
            if(!act){pu.cabeza.rotation.x=0.3;}else pu.cabeza.rotation.x=0;
          }
          if(act&&Math.random()<dt*0.6)chispa(pu,'#7dffb8');
          pu.parts=pu.parts.filter(function(m){m.userData.vida+=dt;m.position.y+=m.userData.v*dt;m.rotation.x+=dt*3;m.rotation.y+=dt*2;m.material.opacity=Math.max(0,1-m.userData.vida/1.6);if(m.userData.vida>1.6){scene.remove(m);m.material.dispose();return false;}return true;});
        });
        renderer.render(scene,cam);
        // etiquetas
        var ov=overlay.current;if(ov){var r=dom.getBoundingClientRect();puestos.forEach(function(pu,i){var d=ov.children[i];if(!d)return;v3.set(pu.g.position.x,2.55,pu.g.position.z).project(cam);var x=(v3.x*0.5+0.5)*r.width,y=(-v3.y*0.5+0.5)*r.height;d.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px) translate(-50%,-100%)';d.style.opacity=v3.z<1?1:0;});}
      }
      frame();
      return function(){cancelAnimationFrame(raf);ro.disconnect();dom.removeEventListener('pointerdown',down);dom.removeEventListener('pointermove',move);dom.removeEventListener('pointerup',up);dom.removeEventListener('wheel',wheel);
        scene.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material){[].concat(o.material).forEach(function(m){if(m.map)m.map.dispose();m.dispose();});}});
        renderer.dispose();if(dom.parentNode)dom.parentNode.removeChild(dom);api.current=null;};
    }
    return function(){vivo=false;cleanup&&cleanup();};
  },[M.staff.map(function(s){return s.nombre;}).join('|')]);
  useEffect(function(){if(api.current)api.current.aplicar(M,props.sel);});
  var COLH={activo:'#39e58c',ausente:'#ffc93c',desconectado:'#8a8f82'};
  var TXT={activo:'Activo',ausente:'Sin actividad',desconectado:'Desconectado'};
  if(err)return h(OficinaSimple,{M:M,sel:props.sel,onSelect:props.onSelect,aviso:err});
  return h('div',{style:{position:'relative',height:props.alto||560,borderRadius:18,overflow:'hidden',boxShadow:'0 24px 60px rgba(10,12,8,0.45), inset 0 0 0 1px rgba(200,168,75,0.25)',background:'#0e110d'}},
    h('div',{ref:ref,style:{position:'absolute',inset:0}}),
    h('div',{ref:overlay,style:{position:'absolute',inset:0,pointerEvents:'none'}},
      M.staff.map(function(s){var p=M.P[s.nombre];var sel=props.sel===s.nombre;
        return h('div',{key:s.nombre,onClick:function(){props.onSelect&&props.onSelect(sel?null:s.nombre);},style:{position:'absolute',left:0,top:0,pointerEvents:'auto',cursor:'pointer',padding:'7px 11px',borderRadius:12,background:sel?'rgba(200,168,75,0.92)':'rgba(14,17,13,0.82)',backdropFilter:'blur(6px)',border:'1px solid '+(sel?'#ffe59a':'rgba(200,168,75,0.35)'),boxShadow:'0 8px 22px rgba(0,0,0,0.35)',color:sel?'#1a1d13':'#f3ead2',whiteSpace:'nowrap',transition:'background .2s',minWidth:120}},
          h('div',{style:{display:'flex',alignItems:'center',gap:7}},
            h('span',{style:{width:9,height:9,borderRadius:'50%',background:COLH[p.estado],boxShadow:'0 0 10px '+COLH[p.estado]}}),
            h('span',{style:{fontWeight:800,fontSize:12.5,letterSpacing:0.3}},s.nombre),
            h('span',{style:{fontFamily:'Bebas Neue',fontSize:16,marginLeft:'auto',color:sel?'#1a1d13':'#c8a84b'}},fmt(p.acc))),
          h('div',{style:{fontSize:10.5,opacity:0.85,marginTop:2}},p.estado==='desconectado'?(TXT[p.estado]+(p.pulso?' · última señal '+horaCL(p.pulso.ts):'')):(secAccion(p.pulso&&p.pulso.s)+' · '+TXT[p.estado])));
      })),
    h('div',{style:{position:'absolute',left:14,bottom:12,display:'flex',gap:12,fontSize:11,color:'#c9c3ad',background:'rgba(14,17,13,0.7)',padding:'6px 10px',borderRadius:10}},
      ['activo','ausente','desconectado'].map(function(k){return h('span',{key:k,style:{display:'flex',alignItems:'center',gap:5}},h('span',{style:{width:8,height:8,borderRadius:'50%',background:COLH[k]}}),TXT[k]);}),
      h('span',{style:{opacity:0.7}},'· Arrastra para girar · rueda para acercar · toca un escritorio')));
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
  function cargar(){db.rpc('supervision_datos',{p_desde:sumaD(fecha,-6),p_hasta:fecha}).then(function(r){if(r.error){setError(r.error.message);return;}setError(null);setD(r.data);});}
  useEffect(function(){setD(null);cargar();if(!esHoy)return;var iv=setInterval(cargar,30000);var iv2=setInterval(function(){setTick(function(x){return x+1;});},15000);return function(){clearInterval(iv);clearInterval(iv2);};},[fecha]);
  useEffect(function(){if(!cod){setCodEnv(null);return;}var v=true;setCodEnv('cargando');db.from('envios').select('*').eq('codigo',cod).maybeSingle().then(function(q){if(v)setCodEnv(q&&q.data?q.data:{codigo:cod,_no:true});});return function(){v=false;};},[cod]);
  var M=useMemo(function(){return D?procesar(D,fecha,esHoy):null;},[D,tick]);
  var Ns=useMemo(function(){return D&&esHoy?necesidades(D.necesidad):[];},[D]);
  var Rs=useMemo(function(){return M?recomendaciones(Ns,M,esHoy):[];},[M,Ns]);
  if(error)return h('div',{className:'panel'},h('div',{style:{color:'var(--danger)'}},'No se pudo cargar Supervisión: '+error));
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

  return h('div',null,
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
      h(Oficina3D,{M:M,sel:sel,onSelect:setSel,alto:560}),
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
    P&&h(Ficha,{P:P,M:M,feed:(D.feed||[]).filter(function(f){return f.a===sel;}),recs:Rs.filter(function(r){return r.quien&&r.quien.nombre===sel;}),fecha:fecha,esHoy:esHoy,onClose:function(){setSel(null);},onCodigo:setCod}),
    // comparativo
    h('div',{style:Object.assign({},card,{padding:'16px 18px',marginBottom:16})},
      h('div',{style:Object.assign({},tit,{marginBottom:10})},'Equipo · '+(esHoy?'hoy':dmy(fecha))),
      h('div',{style:{overflowX:'auto'}},h('table',{style:{width:'100%',borderCollapse:'collapse',minWidth:900,fontSize:12.5}},
        h('thead',null,h('tr',null,['','Administrativo','Estado','Entrada','Conectado','Activo','Movimientos','Firmas','Asignaciones','Cambios de estado','Incidencias','Resueltas','Correcciones','Mov. / hora activa'].map(function(c,i){return h('th',{key:i,style:{textAlign:i>2?'right':'left',padding:'8px',fontSize:10,letterSpacing:1,textTransform:'uppercase',color:'var(--text-soft)',borderBottom:'2px solid var(--border)',whiteSpace:'nowrap'}},c);}))),
        h('tbody',null,ranking.map(function(s,i){var p=M.P[s.nombre];var COL={activo:'#2e9d5b',ausente:'#c98a1f',desconectado:'#8a8f82'};var T={activo:'Activo',ausente:'Sin actividad',desconectado:'Desconectado'};
          var td=function(v,b){return h('td',{style:{textAlign:'right',padding:'9px 8px',borderBottom:'1px solid var(--border)',fontWeight:b?800:500,fontFamily:b?'Bebas Neue':'inherit',fontSize:b?20:12.5}},v);};
          return h('tr',{key:s.nombre,onClick:function(){setSel(s.nombre);window.scrollTo({top:0,behavior:'smooth'});},style:{cursor:'pointer',background:sel===s.nombre?'rgba(200,168,75,0.12)':undefined}},
            h('td',{style:{padding:'9px 8px',borderBottom:'1px solid var(--border)'}},h('div',{style:{width:28,height:28,borderRadius:'50%',background:s.color,color:'#fff',fontWeight:800,fontSize:10.5,display:'flex',alignItems:'center',justifyContent:'center'}},inic(s.nombre))),
            h('td',{style:{padding:'9px 8px',borderBottom:'1px solid var(--border)',fontWeight:800}},s.nombre,h('div',{style:{fontSize:10.5,color:'var(--text-soft)',fontWeight:500}},p.esp)),
            h('td',{style:{padding:'9px 8px',borderBottom:'1px solid var(--border)',color:COL[p.estado],fontWeight:800,fontSize:11.5}},esHoy?T[p.estado]:(p.con>0?'Se conectó':'—')),
            td(p.pulso&&p.pulso.ini?horaCL(p.pulso.ini):(p.primera!=null?p.primera+':00':'—')),td(p.con?hhmm(p.con):'—'),td(p.con?Math.round(p.act/p.con*100)+'%':'—'),
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
      mini('Firmas',fmt(P.firmas)),mini('Incidencias',fmt(P.rep),P.res?fmt(P.res)+' resueltas':null)),
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
