// ════════════════════════════════════════════════════════════════════════════════════════
// Operaciones › Ruta en vivo (09-11-2026)
// Tabla "Mensajeros que salieron a ruta" del Informe de cierre, pero en tiempo real: se refresca
// sola cada 30 segundos mientras se mira el día de hoy. Datos: función SQL public.ruta_en_vivo(p_dia)
// (misma lógica de salida / entrega / estado final que informe_cierre_dia, sin listas de códigos).
//   - Bajo el ritmo: el % entregado va por debajo del % de tiempo transcurrido entre su salida y las
//     22:00 (menos 10 puntos de tolerancia).
//   - Detenido: tiene pendientes y no registra movimiento hace 45 minutos o más.
// ════════════════════════════════════════════════════════════════════════════════════════
(function(){
var h=React.createElement,R=React;
var HORAS=[19,20,21,22,23];
var DETENIDO_MIN=45, HORA_META=22, TOLERANCIA=10;
function hoyCL(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function horaCL(ts){if(!ts)return '—';return new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ts));}
function minCL(d){var p=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit',hour12:false}).format(d).split(':');return (+p[0])*60+(+p[1]);}
function pct(a,b){return b?(a/b*100):null;}
function fP(v){return v==null?'—':v.toFixed(1).replace('.',',')+'%';}
function fN(n){return (+n||0).toLocaleString('es-CL');}
function tit(s){return String(s||'').toLowerCase().replace(/(^|\s)\S/g,function(x){return x.toUpperCase();});}
function hace(ts,ahora){if(!ts)return null;var m=Math.max(0,Math.round((ahora-new Date(ts))/60000));return m;}
function txtHace(m){if(m==null)return 'sin entregas';if(m<1)return 'recién';if(m<60)return 'hace '+m+' min';var hh=Math.floor(m/60);return 'hace '+hh+' h '+(m%60)+' min';}
var COL={verde:'#36c47f',ambar:'#f0b94a',rojo:'#ff7b70',oro:'#e8c766',azul:'#7fc4e6',suave:'rgba(233,228,210,.66)',txt:'#e9e4d2'};
function colPct(p){return p==null?'var(--text-soft)':p>=97?'#2e7d4f':p>=90?'#5e9a3a':p>=75?'#b8860b':'#b03030';}


// ═══ Vista individual del mensajero en 3D (11-11-2026) ═══
// Toda la gestión del día de un mensajero en tiempo real: flujo 3D / mapa con sus paquetes
// (mismo Centro de control del Dashboard, filtrado a su ruta), avance contra la hora, ritmo,
// hora estimada de término, entregas por hora, últimos movimientos y pendientes.
// Datos: public.ruta_mensajero_detalle(p_dia, p_mensajero) (mismas reglas que ruta_en_vivo).
var COLEST={entregado:'#36c47f',reprogramado:'#c77dff',en_bodega_fecha:'#5b8def',cancelado:'#ff5a5a',en_bodega_cancelado:'#ff8a3d',retorno:'#ff8a3d',siniestro:'#ff8a3d',en_ruta:'#e8c766',en_bodega:'#4aa3df'};
var NOMEST={entregado:'Entregado',reprogramado:'Reprogramado',en_bodega_fecha:'Bodega por fecha',cancelado:'Cancelado',en_bodega_cancelado:'Bodega cancelado',retorno:'Retorno',siniestro:'Siniestro',en_ruta:'En ruta',en_bodega:'En bodega'};
function MensajeroVivo(p){
  var db=p.db,f=p.fila||{},nombre=p.mensajero;
  var _d=R.useState(null),det=_d[0],setDet=_d[1];
  var _l=R.useState(!!window.__dash3d),listo3d=_l[0],setListo3d=_l[1];
  R.useEffect(function(){if(!listo3d&&typeof loadScriptOnce==='function')loadScriptOnce('dash3d','modules/dashboard-3d.js').then(function(){setListo3d(true);}).catch(function(){});},[]);
  function cargar(){db.rpc('ruta_mensajero_detalle',{p_dia:p.dia,p_mensajero:nombre}).then(function(r){if(!r.error)setDet(r.data);});}
  R.useEffect(function(){setDet(null);cargar();
    if(!p.esHoy)return;var iv=window.__app&&window.__app.intervaloVisible;
    if(iv)return iv(cargar,20000,['envios'],5000);
    var id=setInterval(function(){if(!document.hidden)cargar();},20000);return function(){clearInterval(id);};
  },[nombre,p.dia]);
  var paq=(det&&det.paquetes)||[];
  var envios=R.useMemo(function(){return paq.map(function(x){return {codigo:x.codigo,estado:x.estado,comuna:x.comuna,mensajero:x.mensajero,cliente:x.cliente,destinatario:x.destinatario,direccion:x.direccion,fecha:x.fecha,lat:x.lat,lng:x.lng};});},[det]);
  var ahora=new Date();
  var ent=paq.filter(function(x){return x.ts_entrega;});
  var pend=paq.filter(function(x){return !x.estado_final;});
  var primera=paq.reduce(function(a,x){var t=new Date(x.ts_salida);return !a||t<a?t:a;},null);
  var horasRuta=primera?Math.max(0.25,((p.esHoy?ahora:new Date(Math.max.apply(null,ent.map(function(x){return +new Date(x.ts_entrega);}).concat([+primera]))))-primera)/3600000):null;
  var ritmo=horasRuta&&ent.length?ent.length/horasRuta:null;
  var eta=p.esHoy&&ritmo&&pend.length?new Date(ahora.getTime()+pend.length/ritmo*3600000):null;
  var porHora={};ent.forEach(function(x){var hh=+new Intl.DateTimeFormat('en-GB',{timeZone:'America/Santiago',hour:'2-digit',hour12:false}).format(new Date(x.ts_entrega));porHora[hh]=(porHora[hh]||0)+1;});
  var hs=Object.keys(porHora).map(Number);var h0=Math.min.apply(null,hs.concat([primera?+new Intl.DateTimeFormat('en-GB',{timeZone:'America/Santiago',hour:'2-digit',hour12:false}).format(primera):9])),h1=Math.max.apply(null,hs.concat([p.esHoy?+new Intl.DateTimeFormat('en-GB',{timeZone:'America/Santiago',hour:'2-digit',hour12:false}).format(ahora):h0+1]));
  var horas=[];for(var hh=h0;hh<=Math.min(23,h1);hh++)horas.push(hh);var maxH=Math.max.apply(null,horas.map(function(x){return porHora[x]||0;}).concat([1]));
  var movs=paq.filter(function(x){return x.ts_final;}).sort(function(a,b){return new Date(b.ts_final)-new Date(a.ts_final);}).slice(0,12);
  var gps=det&&det.ubicacion,gpsMin=gps&&gps.updated_at?Math.round((ahora-new Date(gps.updated_at))/60000):null;
  var E={detenido:['Detenido','#ff5a5a'],atrasado:['Bajo el ritmo','#f0b94a'],ok:['En ruta','#5b8def'],terminado:['Terminó','#36c47f']}[f.estado]||['—','#999'];
  var ini=String(nombre||'').split(/\s+/).map(function(x){return x[0];}).join('').slice(0,2);
  var caja={borderRadius:20,background:'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 50%,#15180f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 18px 38px rgba(20,22,15,.25), inset 0 1px 0 rgba(255,255,255,.07)',color:'#f1ecda'};
  var vid={borderRadius:14,background:'linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.1)'};
  var kp=function(l,v,col,sub){return h('div',{key:l,style:Object.assign({},vid,{padding:'11px 13px',minWidth:0})},
    h('div',{style:{fontSize:10,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(233,228,210,.65)',fontWeight:800}},l),
    h('div',{style:{fontFamily:'Bebas Neue',fontSize:30,lineHeight:1.05,color:col||'#fff',textShadow:'0 0 14px '+(col||'#fff')+'55',whiteSpace:'nowrap'}},v),
    sub&&h('div',{style:{fontSize:11,color:'rgba(233,228,210,.65)'}},sub));};
  var nb=function(t,on,dis){return h('button',{type:'button',onClick:on,disabled:dis,style:{padding:'8px 13px',borderRadius:10,border:'1px solid rgba(232,199,102,.4)',background:'rgba(255,255,255,.06)',color:'#f1ecda',fontWeight:800,fontSize:12,cursor:dis?'default':'pointer',opacity:dis?.4:1,whiteSpace:'nowrap'}},t);};
  var cerrPct=Math.min(100,pct(f.cerr,f.sal)||0),entPct=Math.min(100,f.pE||0);
  return h('div',{id:'mv3d',style:{display:'flex',flexDirection:'column',gap:14,marginBottom:18}},
    h('style',null,'@keyframes mvPulso{0%,100%{box-shadow:0 0 0 0 rgba(232,199,102,.5)}50%{box-shadow:0 0 0 10px rgba(232,199,102,0)}}@media (max-width:760px){.mv-k{grid-template-columns:repeat(2,1fr)!important}.mv-2{grid-template-columns:1fr!important}}'),
    h('div',{style:Object.assign({},caja,{padding:'16px 18px'})},
      h('div',{style:{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}},
        h('div',{style:{width:58,height:58,borderRadius:'50%',display:'grid',placeItems:'center',fontFamily:'Bebas Neue',fontSize:26,color:'#1a1d13',background:'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)',boxShadow:'0 4px 0 #6d531a, 0 8px 20px rgba(200,168,75,.35)',animation:p.esHoy&&f.estado!=='terminado'?'mvPulso 2s infinite':'none'}},ini),
        h('div',{style:{flex:'1 1 260px',minWidth:0}},
          h('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}},
            h('div',{style:{fontFamily:'Bebas Neue',fontSize:32,letterSpacing:2,color:'#fff',lineHeight:1}},nombre),
            h('span',{style:{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 11px',borderRadius:999,background:E[1]+'26',border:'1px solid '+E[1]+'90',color:'#fff',fontSize:12,fontWeight:800}},h('span',{style:{width:8,height:8,borderRadius:'50%',background:E[1],boxShadow:'0 0 8px '+E[1]}}),E[0])),
          h('div',{style:{fontSize:12.5,color:'rgba(233,228,210,.75)',marginTop:5}},
            'Salió '+horaCL(f.primera_salida)+' · Última entrega '+(f.ultima_entrega?horaCL(f.ultima_entrega)+(p.esHoy?' ('+txtHace(f.hEnt)+')':''):'—')+
            (gps?(' · GPS '+(gpsMin==null?'—':gpsMin<1?'recién':'hace '+gpsMin+' min')):' · Sin GPS'))),
        h('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},nb('← Anterior',p.onPrev,!p.onPrev),nb('Siguiente →',p.onNext,!p.onNext),nb('Cerrar',p.onClose))),
      h('div',{className:'mv-k',style:{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginTop:14}},
        kp('Llevó',fN(f.sal),'#e8c766','piezas del día'),
        kp('Entregados',fN(f.ent),'#36c47f',fP(f.pE)+' de lo que llevó'),
        kp('Pendientes',fN(f.pend),f.pend?'#f0b94a':'#9aa08a',f.pend?'por cerrar':'sin pendientes'),
        kp('Reprog. / cancel.',fN(+f.rep||0)+' / '+fN(+f.can||0),'#c77dff','operativa '+fP(f.pO)),
        kp('Ritmo',ritmo?ritmo.toFixed(1).replace('.',',')+'/h':'—','#5b8def','entregas por hora'),
        kp('Termina aprox.',eta?horaCL(eta):(f.pend?'—':'Listo'),eta&&eta.getHours()>=HORA_META?'#ff5a5a':'#fff',eta?(eta.getHours()>=HORA_META?'después de las '+HORA_META+':00':'a este ritmo'):'')),
      h('div',{style:{marginTop:14}},
        h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:11.5,color:'rgba(233,228,210,.7)',marginBottom:5,fontWeight:700}},
          h('span',null,'Avance: '+Math.round(cerrPct)+'% cerrado · '+Math.round(entPct)+'% entregado'),
          f.esperado!=null&&f.estado!=='terminado'&&h('span',null,'Debería ir en '+Math.round(f.esperado)+'%')),
        h('div',{style:{position:'relative',height:16,borderRadius:9,background:'rgba(0,0,0,.35)',overflow:'hidden',boxShadow:'inset 0 2px 6px rgba(0,0,0,.45)'}},
          h('div',{style:{position:'absolute',left:0,top:0,bottom:0,width:cerrPct+'%',background:'rgba(232,199,102,.35)',transition:'width .8s'}}),
          h('div',{style:{position:'absolute',left:0,top:0,bottom:0,width:entPct+'%',background:'linear-gradient(90deg,#2e7d4f,#36c47f)',boxShadow:'0 0 14px rgba(54,196,127,.6)',borderRadius:9,transition:'width .8s'}}),
          f.esperado!=null&&f.estado!=='terminado'&&h('div',{style:{position:'absolute',top:0,bottom:0,left:f.esperado+'%',width:3,background:'#ff5a5a',boxShadow:'0 0 8px #ff5a5a'}})))),
    listo3d&&window.__dash3d?h(window.__dash3d.CentroControl3D,{key:nombre,envios:envios,titulo:'Ruta de '+tit(nombre),subtitulo:'Sus '+paq.length+' paquetes del día en tiempo real: de la bodega a la entrega'}):h('div',{style:Object.assign({},caja,{padding:30,textAlign:'center'})},'Cargando vista 3D…'),
    h('div',{className:'mv-2',style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}},
      h('div',{style:Object.assign({},caja,{padding:'14px 16px'})},
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.6,color:'#fff',marginBottom:10}},'Entregas por hora'),
        horas.length?h('div',{style:{display:'flex',alignItems:'flex-end',gap:6,height:150}},horas.map(function(x){var n=porHora[x]||0;var alto=Math.max(4,n/maxH*120);
          return h('div',{key:x,style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,minWidth:0}},
            h('div',{style:{fontFamily:'Bebas Neue',fontSize:15,color:n?'#7fe3a8':'rgba(233,228,210,.35)'}},n),
            h('div',{style:{width:'100%',maxWidth:34,height:alto,borderRadius:'7px 7px 3px 3px',background:n?'linear-gradient(180deg,#5ef0a0,#2e7d4f)':'rgba(255,255,255,.08)',boxShadow:n?'0 0 12px rgba(54,196,127,.45)':'none',transition:'height .6s'}}),
            h('div',{style:{fontSize:10.5,color:'rgba(233,228,210,.6)',fontWeight:700}},x+'h'));})):h('div',{style:{color:'rgba(233,228,210,.6)',fontSize:12.5}},'Sin entregas todavía.')),
      h('div',{style:Object.assign({},caja,{padding:'14px 16px'})},
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.6,color:'#fff',marginBottom:10}},'Últimos movimientos'),
        movs.length?h('div',{style:{display:'flex',flexDirection:'column',gap:6,maxHeight:210,overflowY:'auto'}},movs.map(function(x){var c=COLEST[x.estado_final]||'#aaa';
          return h('div',{key:x.codigo,style:{display:'flex',gap:10,alignItems:'flex-start',padding:'7px 10px',borderRadius:10,background:'rgba(255,255,255,.04)',borderLeft:'3px solid '+c}},
            h('div',{style:{fontFamily:'JetBrains Mono',fontSize:11.5,color:'rgba(233,228,210,.7)',whiteSpace:'nowrap'}},horaCL(x.ts_final)),
            h('div',{style:{minWidth:0,flex:1}},
              h('div',{style:{fontSize:12.5,fontWeight:800}},h('span',{style:{color:c}},NOMEST[x.estado_final]||x.estado_final),' · '+tit(x.comuna||'')+' · ',h('span',{style:{fontFamily:'JetBrains Mono',fontWeight:600,fontSize:11.5}},x.codigo)),
              x.nota_final&&!/^Estado cambiado|^Asignado|^Retiro masivo|^Colecta/i.test(x.nota_final)&&h('div',{style:{fontSize:11.5,color:'rgba(233,228,210,.7)',whiteSpace:'pre-wrap'}},x.nota_final)));})):h('div',{style:{color:'rgba(233,228,210,.6)',fontSize:12.5}},'Todavía no cierra ningún paquete.'))),
    h('div',{style:Object.assign({},caja,{padding:0,overflow:'hidden'})},
      h('div',{style:{padding:'12px 16px',fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.6,color:'#fff',borderBottom:'1px solid rgba(255,255,255,.08)'}},'Pendientes ',h('span',{style:{color:'#f0b94a'}},'('+pend.length+')')),
      !det?h('div',{style:{padding:20,color:'rgba(233,228,210,.6)'}},'Cargando…'):
      pend.length===0?h('div',{style:{padding:20,color:'#7fe3a8',fontWeight:800}},'Sin pendientes.'):
      h('div',{style:{overflowX:'auto',maxHeight:320,overflowY:'auto'}},h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:12.5,minWidth:640}},
        h('thead',null,h('tr',{style:{background:'rgba(0,0,0,.25)'}},['Código','Cliente','Comuna','Dirección','Salió'].map(function(c){return h('th',{key:c,style:{textAlign:'left',padding:'8px 12px',fontSize:10.5,letterSpacing:1.2,textTransform:'uppercase',color:'#e8c766'}},c);}))),
        h('tbody',null,pend.map(function(x){var m=Math.round((ahora-new Date(x.ts_salida))/60000);return h('tr',{key:x.codigo,style:{borderTop:'1px solid rgba(255,255,255,.06)'}},
          h('td',{style:{padding:'7px 12px',fontFamily:'JetBrains Mono',color:'#f1ecda',background:'transparent'}},x.codigo),
          h('td',{style:{padding:'7px 12px',color:'#f1ecda',background:'transparent'}},x.cliente||'—'),
          h('td',{style:{padding:'7px 12px',color:'#f1ecda',fontWeight:800,background:'transparent'}},tit(x.comuna||'—')),
          h('td',{style:{padding:'7px 12px',color:x.direccion?'#f1ecda':'#ff8a3d',background:'transparent'}},x.direccion||'Sin dirección'),
          h('td',{style:{padding:'7px 12px',color:'rgba(233,228,210,.7)',whiteSpace:'nowrap',background:'transparent'}},horaCL(x.ts_salida)+(p.esHoy?' · '+(m<60?m+' min':Math.floor(m/60)+' h '+(m%60)+' min'):'')));}))))));
}
function RutaEnVivo(props){
  var toast=props.toast||function(){};
  var db=props.db||(window.__app&&window.__app.db)||window.db;
  var _d=R.useState(hoyCL()),dia=_d[0],setDia=_d[1];
  var _r=R.useState(null),res=_r[0],setRes=_r[1];
  // 10-11-2026: lista de paquetes con fecha de etiqueta posterior al día (informativo)
  var _ve=R.useState(false),verEtq=_ve[0],setVerEtq=_ve[1];
  var _vm=R.useState('todos'),etqMen=_vm[0],setEtqMen=_vm[1];
  var _vp=R.useState(false),etqPend=_vp[0],setEtqPend=_vp[1];
  var _c=R.useState(false),cargando=_c[0],setCargando=_c[1];
  var _p=R.useState(false),pausa=_p[0],setPausa=_p[1];
  var _t=R.useState(0),tick=_t[0],setTick=_t[1];
  var _f=R.useState('todos'),filtro=_f[0],setFiltro=_f[1];
  var _o=R.useState('estado'),orden=_o[0],setOrden=_o[1];
  var _q=R.useState(''),q=_q[0],setQ=_q[1];
  var _u=R.useState(null),ultima=_u[0],setUltima=_u[1];
  var esHoy=dia===hoyCL();
  var _sm=R.useState(null),selMen=_sm[0],setSelMen=_sm[1];
  function abrirMen(m){setSelMen(m);setTimeout(function(){var el=document.getElementById('mv3d');if(el)try{el.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){}},80);}
  function cargar(){
    setCargando(true);
    db.rpc('ruta_en_vivo',{p_dia:dia}).then(function(r){
      setCargando(false);
      if(r.error){toast('No se pudo cargar la ruta: '+r.error.message);return;}
      setRes(r.data);setUltima(new Date());
    }).catch(function(e){setCargando(false);toast('No se pudo cargar la ruta');});
  }
  R.useEffect(function(){setRes(null);cargar();},[dia]);
  R.useEffect(function(){
    if(!esHoy||pausa)return;
    var iv=window.__app&&window.__app.intervaloVisible;
    if(iv)return iv(cargar,30000,['envios'],8000);
    var id=setInterval(function(){if(!document.hidden)cargar();},30000);
    return function(){clearInterval(id);};
  },[dia,pausa,esHoy]);
  // reloj para los "hace X min"
  R.useEffect(function(){var id=setInterval(function(){setTick(function(x){return x+1;});},20000);return function(){clearInterval(id);};},[]);

  var ahora=new Date(),minAhora=esHoy?minCL(ahora):24*60;
  var filas=((res&&res.mensajeros)||[]).map(function(m){
    var cerr=(+m.ent||0)+(+m.rep||0)+(+m.can||0)+(+m.otr||0),pend=+m.pen||0,sal=+m.salida||0;
    var pE=pct(+m.ent||0,sal),pO=pct(+m.ent||0,(+m.ent||0)+(+m.rep||0)+(+m.can||0));
    var minSal=m.primera_salida?minCL(new Date(m.primera_salida)):null;
    var esperado=null;
    if(esHoy&&minSal!=null){var tot=HORA_META*60-minSal;esperado=tot>0?Math.max(0,Math.min(100,(minAhora-minSal)/tot*100)):100;}
    var hAct=esHoy?hace(m.ultima_actividad,ahora):null,hEnt=esHoy?hace(m.ultima_entrega,ahora):null;
    var estado='ok';
    if(pend===0)estado='terminado';
    else if(esHoy&&hAct!=null&&hAct>=DETENIDO_MIN)estado='detenido';
    else if(esperado!=null&&(pct(cerr,sal)||0)<esperado-TOLERANCIA)estado='atrasado';
    return Object.assign({},m,{sal:sal,pend:pend,cerr:cerr,pE:pE,pO:pO,esperado:esperado,hAct:hAct,hEnt:hEnt,estado:estado});
  });
  var T=filas.reduce(function(a,f){a.etq+=+f.etq_futura||0;a.etqP+=+f.etq_futura_pend||0;a.sal+=f.sal;a.ent+=+f.ent||0;a.rep+=+f.rep||0;a.can+=+f.can||0;a.pen+=f.pend;a.otr+=+f.otr||0;HORAS.forEach(function(x,i){a.c[i]+=+((f.cortes||[])[i])||0;});return a;},{sal:0,ent:0,rep:0,can:0,pen:0,otr:0,etq:0,etqP:0,c:[0,0,0,0,0]});
  var cuenta={todos:filas.length,atrasado:0,detenido:0,terminado:0,ok:0};filas.forEach(function(f){cuenta[f.estado]++;});
  var prio={detenido:0,atrasado:1,ok:2,terminado:3};
  var vis=filas.filter(function(f){return (filtro==='todos'||f.estado===filtro)&&(!q||f.mensajero.indexOf(q.toUpperCase())>=0);});
  vis.sort(function(a,b){
    if(orden==='nombre')return a.mensajero.localeCompare(b.mensajero);
    if(orden==='llevo')return b.sal-a.sal;
    if(orden==='pct')return (a.pE||0)-(b.pE||0);
    return prio[a.estado]-prio[b.estado]||(a.pE||0)-(b.pE||0)||b.pend-a.pend;
  });
  var cortePas=function(hh){return !esHoy||minAhora>=hh*60;};
  var ESTADOS={detenido:{l:'Detenido',c:'#b03030',bg:'rgba(176,48,48,.10)'},atrasado:{l:'Bajo el ritmo',c:'#a15c00',bg:'rgba(240,185,74,.18)'},ok:{l:'En ruta',c:'#1565c0',bg:'rgba(21,101,192,.08)'},terminado:{l:'Terminó',c:'#1f6b40',bg:'rgba(46,125,79,.10)'}};

  var kpi=function(l,v,col,sub){return h('div',{key:l,style:{flex:'1 1 150px',minWidth:0,padding:'12px 14px',borderRadius:14,background:'linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.10)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.08)'}},
    h('div',{style:{fontSize:10,letterSpacing:1.5,textTransform:'uppercase',color:COL.suave,fontWeight:800}},l),
    h('div',{style:{fontFamily:'Bebas Neue',fontSize:30,lineHeight:1.05,color:col||'#fff',textShadow:'0 0 16px '+(col||'#fff')+'55',whiteSpace:'nowrap'}},v),
    sub&&h('div',{style:{fontSize:11,color:COL.suave}},sub));};
  var btnO=function(txt,on,act){return h('button',{type:'button',onClick:on,style:{padding:'8px 14px',borderRadius:10,cursor:'pointer',fontWeight:800,fontSize:12,letterSpacing:.4,whiteSpace:'nowrap',border:'1px solid '+(act?'#e8c766':'rgba(255,255,255,.16)'),background:act?'linear-gradient(135deg,#e8c766,#b08a2e)':'rgba(255,255,255,.06)',color:act?'#1a1d13':COL.txt}},txt);};
  var pEnt=pct(T.ent,T.sal),pOp=pct(T.ent,T.ent+T.rep+T.can);
  var chip=function(k,l){var a=filtro===k;return h('button',{key:k,type:'button',onClick:function(){setFiltro(k);},style:{padding:'6px 12px',borderRadius:999,cursor:'pointer',fontSize:12,fontWeight:700,border:'1px solid '+(a?'var(--gold)':'var(--border)'),background:a?'rgba(200,168,75,.18)':'#fff',color:'var(--dark)'}},l+' ('+(cuenta[k]||0)+')');};

  return h('div',{className:'dashx'},
    h('div',{className:'section-head'},h('div',{className:'section-title'},'Operaciones ',h('span',null,'Ruta en vivo'))),
    h('style',null,'@keyframes rvPulso{0%{box-shadow:0 0 0 0 rgba(54,196,127,.7)}70%{box-shadow:0 0 0 8px rgba(54,196,127,0)}100%{box-shadow:0 0 0 0 rgba(54,196,127,0)}}'),
    h('div',{style:{position:'relative',borderRadius:20,overflow:'hidden',background:'radial-gradient(120% 90% at 30% 0%,#3a3f2b 0%,#22261a 45%,#14170f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 24px 50px rgba(20,22,15,.30), inset 0 1px 0 rgba(255,255,255,.08)',color:COL.txt,padding:'16px 20px 18px',marginBottom:16}},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap',marginBottom:14}},
        h('div',null,
          h('div',{style:{display:'flex',alignItems:'center',gap:10}},
            esHoy&&!pausa&&h('span',{style:{width:10,height:10,borderRadius:'50%',background:COL.verde,animation:'rvPulso 1.8s infinite'}}),
            h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:2.2,color:'#fff',lineHeight:1}},esHoy?'Ruta en vivo':'Ruta del día')),
          h('div',{style:{fontSize:12,color:COL.suave,marginTop:4}},(ultima?'Actualizado '+ultima.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'Cargando…')+(esHoy?(pausa?' · actualización en pausa':' · se actualiza sola cada 30 segundos'):' · día cerrado'))),
        h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},
          h('input',{type:'date',className:'form-input',value:dia,max:hoyCL(),onChange:function(e){if(e.target.value)setDia(e.target.value);},style:{margin:0,padding:'7px 10px',width:150,background:'rgba(255,255,255,.92)'}}),
          !esHoy&&btnO('Hoy',function(){setDia(hoyCL());}),
          esHoy&&btnO(pausa?'Reanudar':'Pausar',function(){setPausa(!pausa);},pausa),
          btnO(cargando?'Actualizando…':'Actualizar',cargar,true))),
      h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
        kpi('Llegó hoy',fN(res&&res.llegada),'#fff'),
        kpi('Salió a ruta',fN(T.sal),'#ffe59a',filas.length+' mensajeros'),
        kpi('Entregados',fN(T.ent),COL.verde),
        kpi('Pendientes',fN(T.pen),T.pen?COL.ambar:COL.verde,fN(T.rep)+' reprog. · '+fN(T.can)+' cancel.'),
        kpi('% entrega',fP(pEnt),pEnt==null?'#fff':pEnt>=95?COL.verde:pEnt>=80?COL.ambar:COL.rojo,'% operacional '+fP(pOp)),
        kpi('Bajo el ritmo',fN(cuenta.atrasado),cuenta.atrasado?COL.ambar:COL.verde),
        kpi('Detenidos',fN(cuenta.detenido),cuenta.detenido?COL.rojo:COL.verde,'sin movimiento '+DETENIDO_MIN+'+ min'),
        h('div',{key:'etqk',onClick:function(){setVerEtq(!verEtq);setEtqMen('todos');},title:'Ver la lista de paquetes',style:{flex:'1 1 150px',minWidth:0,cursor:'pointer',borderRadius:14,outline:verEtq?'2px solid '+COL.ambar:'none'}},
          kpi('Etiqueta de otro día',fN(T.etq),T.etq?COL.ambar:'#fff',(T.etq?fN(T.etqP)+' aún pendientes · ':'')+(verEtq?'ocultar lista':'ver lista')))),
      h('div',{style:{display:'flex',gap:6,marginTop:12,flexWrap:'wrap'}},HORAS.map(function(hh,i){var pas=cortePas(hh);var v=pas?pct(T.c[i],T.sal):null;
        return h('div',{key:hh,style:{flex:'1 1 110px',padding:'8px 10px',borderRadius:12,background:pas?'rgba(232,199,102,.12)':'rgba(255,255,255,.03)',border:'1px solid '+(pas?'rgba(232,199,102,.4)':'rgba(255,255,255,.08)')}},
          h('div',{style:{fontSize:10,fontWeight:800,letterSpacing:1.3,color:COL.suave}},'CORTE '+hh+':00'),
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,color:pas?'#ffe59a':'rgba(233,228,210,.35)',lineHeight:1.1}},pas?fP(v):'Pendiente'),
          pas&&h('div',{style:{fontSize:10.5,color:COL.suave}},fN(T.c[i])+' entregados'));}))),
    verEtq&&(function(){
      var L=(res&&res.etq_lista)||[];
      var mens={};L.forEach(function(x){mens[x.mensajero]=(mens[x.mensajero]||0)+1;});
      var vis=L.filter(function(x){return (etqMen==='todos'||x.mensajero===etqMen)&&(!etqPend||x.cat==='pendiente');});
      var fechas={};vis.forEach(function(x){fechas[x.fecha_etiqueta]=(fechas[x.fecha_etiqueta]||0)+1;});
      var fD=function(d){return d?String(d).slice(8,10)+'-'+String(d).slice(5,7):'—';};
      var catTxt={pendiente:['Pendiente','#a15c00','rgba(240,185,74,.18)'],entregado:['Entregado','#2e7d4f','rgba(54,196,127,.15)'],reprogramado:['Reprogramado','#7b3fa0','rgba(176,106,214,.15)'],cancelado:['Cancelado','#b03030','rgba(224,71,63,.12)'],otro:['Otro','#555','rgba(0,0,0,.06)']};
      var chipM=function(v,l,n){var a=etqMen===v;return h('button',{key:v,type:'button',onClick:function(){setEtqMen(v);},style:{padding:'6px 11px',borderRadius:10,cursor:'pointer',fontSize:12,fontWeight:800,border:'1px solid '+(a?'#e0a020':'rgba(43,46,32,.15)'),background:a?'linear-gradient(180deg,#ffd980,#e0a020)':'#fff',color:a?'#2a1d00':'#4a4d3a',boxShadow:a?'0 2px 0 #8a5a00':'0 2px 0 rgba(43,46,32,.12)'}},l+' ('+n+')');};
      return h('div',{className:'panel',style:{marginBottom:14,border:'1px solid rgba(240,185,74,.55)'}},
        h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,flexWrap:'wrap',marginBottom:10}},
          h('div',null,
            h('div',{className:'panel-title',style:{margin:0}},'Etiqueta de otro día · '+fN(vis.length)+' paquete'+(vis.length!==1?'s':'')),
            h('div',{style:{fontSize:12.5,color:'var(--text-mid)',marginTop:3}},'Salieron hoy a ruta con fecha impresa posterior. '+Object.keys(fechas).sort().map(function(k){return fechas[k]+' con '+fD(k);}).join(' · ')+'. Informativo: la fecha de recepción no cambia.')),
          h('div',{style:{display:'flex',gap:6,alignItems:'center'}},
            h('label',{style:{display:'flex',alignItems:'center',gap:6,fontSize:12.5,fontWeight:700,cursor:'pointer'}},h('input',{type:'checkbox',checked:etqPend,onChange:function(e){setEtqPend(e.target.checked);}}),'Solo pendientes'),
            h('button',{type:'button',className:'btn-secondary',onClick:function(){setVerEtq(false);}},'Cerrar'))),
        h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}},chipM('todos','Todos',L.length),Object.keys(mens).sort(function(a,b){return mens[b]-mens[a];}).map(function(m){return chipM(m,tit(m),mens[m]);})),
        vis.length===0?h('div',{className:'empty-state'},'Sin paquetes con este filtro.'):
        h('div',{className:'table-wrap',style:{maxHeight:380,overflow:'auto'}},h('table',null,
          h('thead',null,h('tr',null,['Código','Mensajero','Cliente','Comuna','Fecha etiqueta','Resultado'].map(function(t){return h('th',{key:t},t);}))),
          h('tbody',null,vis.map(function(x){var c=catTxt[x.cat]||catTxt.otro;return h('tr',{key:x.codigo},
            h('td',{className:'mono',style:{fontWeight:700}},x.codigo),h('td',null,tit(x.mensajero)),h('td',null,x.cliente||'—'),h('td',null,tit(x.comuna||'—')),
            h('td',null,h('span',{style:{padding:'2px 8px',borderRadius:999,fontSize:11.5,fontWeight:800,color:'#8a5a00',background:'rgba(240,185,74,.2)',border:'1px solid rgba(240,185,74,.6)'}},'ETIQUETA '+fD(x.fecha_etiqueta))),
            h('td',null,h('span',{style:{padding:'2px 8px',borderRadius:999,fontSize:11.5,fontWeight:800,color:c[1],background:c[2]}},c[0])));})))));
    })(),
    selMen&&(function(){var idx=vis.findIndex(function(x){return x.mensajero===selMen;});var fila=filas.find(function(x){return x.mensajero===selMen;});
      return h(MensajeroVivo,{key:selMen+dia,db:db,dia:dia,esHoy:esHoy,mensajero:selMen,fila:fila,
        onPrev:idx>0?function(){setSelMen(vis[idx-1].mensajero);}:null,onNext:idx>=0&&idx<vis.length-1?function(){setSelMen(vis[idx+1].mensajero);}:null,onClose:function(){setSelMen(null);}});})(),
    h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:12}},
      h('input',{className:'form-input',placeholder:'Buscar mensajero',value:q,onChange:function(e){setQ(e.target.value);},style:{margin:0,maxWidth:240}}),
      chip('todos','Todos'),chip('detenido','Detenidos'),chip('atrasado','Bajo el ritmo'),chip('ok','En ruta'),chip('terminado','Terminaron'),
      h('div',{style:{flex:1}}),
      h('select',{className:'form-input',value:orden,onChange:function(e){setOrden(e.target.value);},style:{margin:0,maxWidth:220}},
        h('option',{value:'estado'},'Ordenar: atrasados primero'),h('option',{value:'pct'},'Ordenar: menor % entrega'),h('option',{value:'llevo'},'Ordenar: más piezas'),h('option',{value:'nombre'},'Ordenar: nombre'))),
    h('div',{className:'panel',style:{padding:0,overflow:'hidden'}},
      !res?h('div',{style:{padding:30,textAlign:'center',color:'var(--text-soft)'}},'Cargando la ruta…'):
      !filas.length?h('div',{style:{padding:30,textAlign:'center',color:'var(--text-soft)'}},'Todavía no sale ningún mensajero a ruta este día.'):
      h('div',{className:'table-wrap',style:{margin:0}},h('table',null,
        h('thead',null,h('tr',null,['Mensajero','Estado','Salió','Llevó','Avance'].concat(HORAS.map(function(x){return x+':00';})).concat(['Final','Reprog.','Cancel.','Pend.','% entrega','% operac.','Etiq. otro día','Última entrega']).map(function(c,i){return h('th',{key:i,style:i>=2&&i!==4&&i!==1?{textAlign:'right'}:null},c);}))),
        h('tbody',null,vis.map(function(f){var E=ESTADOS[f.estado];
          return h('tr',{key:f.mensajero},
            h('td',{style:{fontWeight:700,whiteSpace:'nowrap'}},h('span',{onClick:function(){abrirMen(f.mensajero);},title:'Ver su gestión en 3D',style:{cursor:'pointer',borderBottom:'1px dashed rgba(200,168,75,.8)'}},f.mensajero),h('button',{type:'button',onClick:function(){abrirMen(f.mensajero);},style:{marginLeft:8,padding:'2px 9px',borderRadius:6,border:'1px solid #ae8829',background:'linear-gradient(180deg,#f7dd8c,#d9b553)',color:'#1a1d13',fontWeight:800,fontSize:10.5,cursor:'pointer'}},'3D')),
            h('td',null,h('span',{style:{padding:'2px 9px',borderRadius:999,fontSize:11,fontWeight:800,color:E.c,background:E.bg,whiteSpace:'nowrap'}},E.l)),
            h('td',{className:'mono',style:{textAlign:'right'}},horaCL(f.primera_salida)),
            h('td',{className:'mono',style:{textAlign:'right',fontWeight:700}},fN(f.sal)),
            h('td',{style:{minWidth:130}},
              h('div',{style:{position:'relative',height:10,borderRadius:6,background:'rgba(43,46,32,.10)',overflow:'hidden'}},
                h('div',{style:{position:'absolute',left:0,top:0,bottom:0,width:Math.min(100,pct(f.cerr,f.sal)||0)+'%',background:'rgba(200,168,75,.35)'}}),
                h('div',{style:{position:'absolute',left:0,top:0,bottom:0,width:Math.min(100,f.pE||0)+'%',background:'linear-gradient(90deg,#2e7d4f,#36c47f)',borderRadius:6}}),
                f.esperado!=null&&f.estado!=='terminado'&&h('div',{title:'Donde debería ir según la hora',style:{position:'absolute',top:-2,bottom:-2,left:f.esperado+'%',width:2,background:'#b03030'}}))),
            HORAS.map(function(hh,i){return h('td',{key:hh,className:'mono',style:{textAlign:'right',color:cortePas(hh)?'var(--dark)':'var(--text-soft)'}},cortePas(hh)?fN((f.cortes||[])[i]):'—');}),
            h('td',{className:'mono',style:{textAlign:'right',fontWeight:700,color:'#2e7d4f'}},fN(f.ent)),
            h('td',{className:'mono',style:{textAlign:'right'}},fN(f.rep)),
            h('td',{className:'mono',style:{textAlign:'right'}},fN(f.can)),
            h('td',{className:'mono',style:{textAlign:'right',fontWeight:700,color:f.pend?'#a15c00':'var(--text-soft)'}},fN(f.pend)),
            h('td',{className:'mono',style:{textAlign:'right',fontWeight:700,color:colPct(f.pE)}},fP(f.pE)),
            h('td',{className:'mono',style:{textAlign:'right'}},fP(f.pO)),
            h('td',{style:{textAlign:'right'}},(+f.etq_futura||0)?h('span',{onClick:function(){setVerEtq(true);setEtqMen(f.mensajero);try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){}},title:'Ver cuáles. Paquetes que llevó con fecha de etiqueta posterior al día ('+(+f.etq_futura_pend||0)+' aún pendientes). La fecha de recepción no cambia.',style:{padding:'2px 8px',borderRadius:999,fontSize:11,fontWeight:800,color:'#8a5a00',background:'rgba(240,185,74,.2)',border:'1px solid rgba(240,185,74,.6)',whiteSpace:'nowrap',cursor:'pointer'}},fN(f.etq_futura)+(f.etq_futura_pend?' · '+fN(f.etq_futura_pend)+' pend.':'')):h('span',{style:{color:'var(--text-soft)'}},'—')),
            h('td',{style:{textAlign:'right',whiteSpace:'nowrap',fontSize:12,color:f.estado==='detenido'?'#b03030':'var(--text-mid)',fontWeight:f.estado==='detenido'?800:500}},f.ultima_entrega?horaCL(f.ultima_entrega)+(esHoy?' · '+txtHace(f.hEnt):''):'Sin entregas'));
        }),
        h('tr',{style:{background:'var(--dark)'}},
          h('td',{style:{color:'#ffe59a',fontWeight:800}},'TOTAL ('+filas.length+')'),h('td',null),h('td',null),
          h('td',{className:'mono',style:{textAlign:'right',color:'#fff',fontWeight:800}},fN(T.sal)),h('td',null),
          HORAS.map(function(hh,i){return h('td',{key:hh,className:'mono',style:{textAlign:'right',color:'#fff'}},cortePas(hh)?fN(T.c[i]):'—');}),
          h('td',{className:'mono',style:{textAlign:'right',color:'#7ee0ad',fontWeight:800}},fN(T.ent)),
          h('td',{className:'mono',style:{textAlign:'right',color:'#fff'}},fN(T.rep)),
          h('td',{className:'mono',style:{textAlign:'right',color:'#fff'}},fN(T.can)),
          h('td',{className:'mono',style:{textAlign:'right',color:'#ffd27a',fontWeight:800}},fN(T.pen)),
          h('td',{className:'mono',style:{textAlign:'right',color:'#fff',fontWeight:800}},fP(pEnt)),
          h('td',{className:'mono',style:{textAlign:'right',color:'#fff'}},fP(pOp)),
          h('td',{className:'mono',style:{textAlign:'right',color:'#ffd27a',fontWeight:800}},T.etq?fN(T.etq):'—'),
          h('td',null)))))),
    h('div',{style:{fontSize:11.5,color:'var(--text-soft)',marginTop:10,lineHeight:1.5}},
      'Barra de avance: verde = entregados, dorado = cerrados (incluye reprogramados y cancelados), línea roja = donde debería ir según la hora (salida → '+HORA_META+':00). ',
      'Bajo el ritmo: va más de '+TOLERANCIA+' puntos detrás de esa línea. Detenido: tiene pendientes y no registra movimiento hace '+DETENIDO_MIN+' minutos o más. ',
      'Etiq. otro día: paquetes con fecha impresa en la etiqueta posterior al día (informativo, la fecha de recepción no cambia). Mismos números que el Informe de cierre (FERNANDOCHECK no cuenta como ruta).'));
}
window.RutaEnVivo=RutaEnVivo;
})();
