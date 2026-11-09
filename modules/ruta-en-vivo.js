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

function RutaEnVivo(props){
  var toast=props.toast||function(){};
  var db=props.db||(window.__app&&window.__app.db)||window.db;
  var _d=R.useState(hoyCL()),dia=_d[0],setDia=_d[1];
  var _r=R.useState(null),res=_r[0],setRes=_r[1];
  var _c=R.useState(false),cargando=_c[0],setCargando=_c[1];
  var _p=R.useState(false),pausa=_p[0],setPausa=_p[1];
  var _t=R.useState(0),tick=_t[0],setTick=_t[1];
  var _f=R.useState('todos'),filtro=_f[0],setFiltro=_f[1];
  var _o=R.useState('estado'),orden=_o[0],setOrden=_o[1];
  var _q=R.useState(''),q=_q[0],setQ=_q[1];
  var _u=R.useState(null),ultima=_u[0],setUltima=_u[1];
  var esHoy=dia===hoyCL();
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
  var T=filas.reduce(function(a,f){a.sal+=f.sal;a.ent+=+f.ent||0;a.rep+=+f.rep||0;a.can+=+f.can||0;a.pen+=f.pend;a.otr+=+f.otr||0;HORAS.forEach(function(x,i){a.c[i]+=+((f.cortes||[])[i])||0;});return a;},{sal:0,ent:0,rep:0,can:0,pen:0,otr:0,c:[0,0,0,0,0]});
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
        kpi('Detenidos',fN(cuenta.detenido),cuenta.detenido?COL.rojo:COL.verde,'sin movimiento '+DETENIDO_MIN+'+ min')),
      h('div',{style:{display:'flex',gap:6,marginTop:12,flexWrap:'wrap'}},HORAS.map(function(hh,i){var pas=cortePas(hh);var v=pas?pct(T.c[i],T.sal):null;
        return h('div',{key:hh,style:{flex:'1 1 110px',padding:'8px 10px',borderRadius:12,background:pas?'rgba(232,199,102,.12)':'rgba(255,255,255,.03)',border:'1px solid '+(pas?'rgba(232,199,102,.4)':'rgba(255,255,255,.08)')}},
          h('div',{style:{fontSize:10,fontWeight:800,letterSpacing:1.3,color:COL.suave}},'CORTE '+hh+':00'),
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,color:pas?'#ffe59a':'rgba(233,228,210,.35)',lineHeight:1.1}},pas?fP(v):'Pendiente'),
          pas&&h('div',{style:{fontSize:10.5,color:COL.suave}},fN(T.c[i])+' entregados'));}))),
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
        h('thead',null,h('tr',null,['Mensajero','Estado','Salió','Llevó','Avance'].concat(HORAS.map(function(x){return x+':00';})).concat(['Final','Reprog.','Cancel.','Pend.','% entrega','% operac.','Última entrega']).map(function(c,i){return h('th',{key:i,style:i>=2&&i!==4&&i!==1?{textAlign:'right'}:null},c);}))),
        h('tbody',null,vis.map(function(f){var E=ESTADOS[f.estado];
          return h('tr',{key:f.mensajero},
            h('td',{style:{fontWeight:700,whiteSpace:'nowrap'}},f.mensajero),
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
          h('td',null)))))),
    h('div',{style:{fontSize:11.5,color:'var(--text-soft)',marginTop:10,lineHeight:1.5}},
      'Barra de avance: verde = entregados, dorado = cerrados (incluye reprogramados y cancelados), línea roja = donde debería ir según la hora (salida → '+HORA_META+':00). ',
      'Bajo el ritmo: va más de '+TOLERANCIA+' puntos detrás de esa línea. Detenido: tiene pendientes y no registra movimiento hace '+DETENIDO_MIN+' minutos o más. ',
      'Mismos números que el Informe de cierre (FERNANDOCHECK no cuenta como ruta).'));
}
window.RutaEnVivo=RutaEnVivo;
})();
