// KPI Mensajeros (18-11-2026). Operaciones → KPI Mensajeros (reemplaza Analítica y Ruta en vivo).
// Todo se calcula en el servidor (RPC kpi_mensajeros): ranking y copa del período, efectividad total y
// operativa, comparación con el período anterior, jornada real (primera/última entrega), ritmo por hora,
// incidencias, siniestros, atrasados, comunas y estado de la ruleta (cuando el período es una semana).
// Sin cuentas de prueba ni mensajeros pausados.
(function(){
var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo;
var A=window.__app||{};var db=A.db;
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function hoyCL(){return A.fechaHoyCL?A.fechaHoyCL():new Date().toLocaleDateString('en-CA',{timeZone:'America/Santiago'});}
function addD(s,n){var d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return ymd(d);}
function lunes(s){var d=new Date(s+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return ymd(d);}
function dm(s){var p=String(s).split('-');return p[2]+'-'+p[1];}
function n1(x){return x==null?'—':String(x).replace('.',',');}
function fmt(n){return Math.round(+n||0).toLocaleString('es-CL');}
function tit(s){return String(s||'').toLowerCase().replace(/(^|\s)\S/g,function(m){return m.toUpperCase();});}
var COPA={leyenda:['LEYENDA','linear-gradient(180deg,#fff2c2,#e8c766)','#5a4510'],podio:['PODIO','#f6ead0','#8a6d1f'],oro:['ORO','#fbf2d6','#8a6d1f'],plata:['PLATA','#eef0f2','#5c6670'],bronce:['BRONCE','#f6e5d6','#8a5426'],hierro:['HIERRO','#ececea','#6b6d62']};
function periodo(k,r){var hoy=hoyCL();
  if(k==='hoy')return [hoy,hoy];if(k==='ayer'){var a=addD(hoy,-1);return [a,a];}
  if(k==='semana'){var l=lunes(hoy);return [l,addD(l,6)];}
  if(k==='semana_ant'){var l2=addD(lunes(hoy),-7);return [l2,addD(l2,6)];}
  if(k==='mes'){var m1=hoy.slice(0,8)+'01';var d=new Date(hoy.slice(0,4),+hoy.slice(5,7),0);return [m1,ymd(d)];}
  return [r[0]||hoy,r[1]||hoy];}
var CSS='.kpm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px}.kpm-hero{display:grid;grid-template-columns:1.5fr repeat(6,minmax(0,1fr));gap:12px}@media(max-width:1300px){.kpm-hero{grid-template-columns:repeat(4,minmax(0,1fr))}.kpm-hero>div:first-child{grid-column:span 2}}'+
 '@media(max-width:700px){.kpm-grid{grid-template-columns:1fr}.kpm-hero{grid-template-columns:1fr 1fr}.kpm-hero>div:first-child{grid-column:1/-1}}'+
 '.kpm-card{transition:transform .15s, box-shadow .15s}.kpm-card:hover{transform:translateY(-2px);box-shadow:0 8px 0 #e2d8bb,0 14px 24px rgba(0,0,0,.08)!important}';

function KpiMensajerosV2(props){
  var _p=useState('semana'),perL=_p[0],setPer=_p[1];var _r=useState([hoyCL(),hoyCL()]),rangoL=_r[0],setRango=_r[1];
  var per=props.per||perL,rango=props.rango||rangoL;
  var _d=useState(null),data=_d[0],setData=_d[1];var _e=useState(''),err=_e[0],setErr=_e[1];var _l=useState(false),cargando=_l[0],setCargando=_l[1];
  var _o=useState('pos'),orden=_o[0],setOrden=_o[1];var _q=useState(''),q=_q[0],setQ=_q[1];var _x=useState({}),ab=_x[0],setAb=_x[1];
  var pr=periodo(per,rango);
  function cargar(){setCargando(true);setErr('');db.rpc('kpi_mensajeros',{p_desde:pr[0],p_hasta:pr[1]}).then(function(r){setCargando(false);if(r.error){setErr(r.error.message);return;}setData(r.data);},function(e){setCargando(false);setErr(String(e&&e.message||e));});}
  useEffect(cargar,[pr[0],pr[1]]);
  var M=(data&&data.mensajeros)||[];
  var flota=useMemo(function(){var t={tot:0,ent:0,rep:0,can:0,inc:0,multas:0,correctivas:0,pend:0,sin:0,atr:0,totp:0,entp:0,ruta:0};var rit=[],jor=[];
    M.forEach(function(m){t.tot+=m.tot;t.ent+=m.ent;t.rep+=m.rep;t.can+=m.can;t.inc+=m.inc;t.multas+=m.multas;t.correctivas+=m.correctivas;t.pend+=m.inc_pend;t.sin+=m.siniestros;t.atr+=m.atrasados;t.totp+=m.tot_prev||0;t.entp+=m.ent_prev||0;t.ruta+=m.ruta;if(m.ritmo)rit.push(+m.ritmo);if(m.horas)jor.push(+m.horas);});
    function med(a){if(!a.length)return null;a=a.slice().sort(function(x,y){return x-y;});var k=Math.floor(a.length/2);return a.length%2?a[k]:(a[k-1]+a[k])/2;}
    t.ef=t.tot?t.ent/t.tot*100:0;t.acida=(t.ent+t.rep+t.can)?t.ent/(t.ent+t.rep+t.can)*100:0;t.efp=t.totp?t.entp/t.totp*100:null;t.ritmo=med(rit);t.jornada=med(jor);return t;},[data]);
  var alertas=useMemo(function(){var a=[];M.forEach(function(m){var r=[];
      if(m.tot>=20&&m.ef<95)r.push(n1(m.ef)+'% efectividad');
      if(m.atrasados>0)r.push(m.atrasados+' atrasado'+(m.atrasados>1?'s':''));
      if(m.rep>=4)r.push(m.rep+' reprogramados');
      if(flota.ritmo&&m.ritmo&&m.ent>=20&&m.ritmo<flota.ritmo*0.7)r.push('ritmo '+n1(m.ritmo)+'/h');
      if(m.inc_pend>0)r.push(m.inc_pend+' incid. sin decidir');
      if(r.length)a.push(tit(m.nombre)+' · '+r.join(' · '));});
    var sa=(data&&data.sin_actividad)||[];if(sa.length)a.push(sa.length+' sin actividad: '+sa.map(tit).join(', '));return a;},[data,flota]);
  var ruleta=useMemo(function(){if(!data||!data.semana)return null;var si=[],cerca=[];M.forEach(function(m){var r=m.ruleta;if(!r)return;if(r.cumple)si.push(m);else if(r.cumple_copa&&r.cumple_ef&&r.cumple_inc)cerca.push(m);});return {si:si,cerca:cerca};},[data]);
  var lista=useMemo(function(){var L=M.filter(function(m){return !q||m.nombre.toLowerCase().indexOf(q.toLowerCase())>=0;});
    var f={pos:function(a,b){return a.pos-b.pos;},ef:function(a,b){return b.ef-a.ef||b.ent-a.ent;},ent:function(a,b){return b.ent-a.ent;},ritmo:function(a,b){return (+b.ritmo||0)-(+a.ritmo||0);},inc:function(a,b){return b.inc-a.inc||a.pos-b.pos;}}[orden];return L.slice().sort(f);},[data,orden,q]);

  function exportar(){var ex=A.exportToExcel;if(!ex)return;ex('KPI_Mensajeros_'+pr[0]+'_'+pr[1],[{name:'KPI',headers:['Posición','Mensajero','Copa','Asignados','Entregados','Efectividad %','Operativa %','Ef. período anterior %','Reprogramados','Cancelados','En ruta','Atrasados','Siniestros','Incidencias','Multas','Correctivas','Monto multas','Días','Inicio prom.','Fin prom.','Horas prom.','Entregas/hora','Comunas','Clientes','Cobrado'],
    rows:M.map(function(m){return [m.pos,m.nombre,(COPA[m.nivel]||[''])[0],m.tot,m.ent,m.ef,m.acida,m.ef_prev,m.rep,m.can,m.ruta,m.atrasados,m.siniestros,m.inc,m.multas,m.correctivas,m.monto_multas,m.dias,m.ini||'',m.fin||'',m.horas,m.ritmo,(m.comunas||[]).map(function(c){return tit(c.comuna)+' ('+c.n+')';}).join(', '),m.clientes,m.cobrado];})}]);}

  var seg=function(k,t){var on=per===k;return h('button',{key:k,type:'button',onClick:function(){setPer(k);},style:{padding:'7px 13px',borderRadius:9,border:'none',background:on?'linear-gradient(180deg,#3a3d2e,#23261a)':'transparent',color:on?'#f7dd8c':'#5f5e4c',fontWeight:800,fontSize:12.5,cursor:'pointer'}},t);};
  var k=function(l,v,d,col,dark){return h('div',{style:{borderRadius:18,padding:'14px 16px',background:dark?'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 55%,#15180f 100%)':'#fff',border:'1px solid '+(dark?'rgba(200,168,75,.45)':'#e9e1ca'),boxShadow:'0 4px 0 '+(dark?'#0b0c07':'#e2d8bb'),color:dark?'#f1ecda':'#2b2e20',minWidth:0}},
    h('div',{style:{fontSize:10.5,fontWeight:900,letterSpacing:1.3,color:dark?'#e8c766':'#8a8775',textTransform:'uppercase'}},l),h('div',{style:{fontFamily:'Bebas Neue',fontSize:42,lineHeight:1,marginTop:6,color:col||'inherit'}},v),h('div',{style:{fontSize:12,fontWeight:700,color:dark?'#cfc9b2':'#7a7766',marginTop:3}},d));};
  var dif=flota.efp==null?null:Math.round((flota.ef-flota.efp)*10)/10;

  function chip(v,l,bad){return h('div',{style:{borderRadius:12,background:bad?'#fff4f1':'#faf6ea',border:'1px solid '+(bad?'#f3cfc6':'#efe6cc'),padding:'7px 4px',textAlign:'center'}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:23,lineHeight:1,color:bad?'#b03030':'#2b2e20'}},v),h('div',{style:{fontSize:9,fontWeight:900,letterSpacing:.7,color:'#8a8775',textTransform:'uppercase',marginTop:2}},l));}
  function ruletaChip(m){var r=m.ruleta;if(!r)return null;var falta=[];if(!r.cumple_copa)falta.push('copa');if(!r.cumple_ef)falta.push('98%');if(!r.cumple_inc)falta.push('incidencias');if(!r.cumple_vol)falta.push('volumen');
    return h('div',{style:{marginTop:10,padding:'7px 10px',borderRadius:10,fontSize:12,fontWeight:800,background:r.cumple?'linear-gradient(180deg,#4a3a17,#2a2110)':'#f6f1e3',color:r.cumple?'#f7dd8c':'#7a7766',border:'1px solid '+(r.cumple?'rgba(232,199,102,.6)':'#e9e1ca')}},r.cumple?'Ruleta: va para giro':'Ruleta: le falta '+falta.join(' · '));}
  function tarjeta(m){var ef=+m.ef,col=ef>=98?'#2e9e5b':ef>=95?'#C8A84B':'#d0452f',warn=ef<95&&m.tot>=20,c=COPA[m.nivel]||COPA.hierro,abierto=!!ab[m.nombre];
    var tot=m.tot||1,serie=m.serie||[],mx=Math.max.apply(null,serie.map(function(s){return s.n;}).concat([1]));var d=m.ef_prev==null?null:Math.round((ef-m.ef_prev)*10)/10;
    return h('div',{key:m.nombre,className:'kpm-card',onClick:function(){if(props.onAbrir){props.onAbrir(m.nombre,lista.map(function(x){return x.nombre;}));return;}setAb(function(o){var x=Object.assign({},o);x[m.nombre]=!o[m.nombre];return x;});},style:{borderRadius:20,background:'#fff',border:'1px solid '+(warn?'#f0c7bd':'#e9e1ca'),boxShadow:'0 5px 0 '+(warn?'#f0c7bd':'#e2d8bb'),padding:'15px 17px',cursor:'pointer',color:'#2b2e20'}},
      h('div',{style:{display:'flex',alignItems:'center',gap:10}},
        h('div',{style:{minWidth:46,height:38,borderRadius:11,background:'#2b2e20',color:'#e8c766',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',lineHeight:1}},h('span',{style:{fontFamily:'Bebas Neue',fontSize:21}},'#'+m.pos),h('span',{style:{fontSize:8.5,fontWeight:800,color:'#cfc9b2'}},'de '+m.cnt)),
        h('div',{style:{flex:1,minWidth:0,fontWeight:900,fontSize:15,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},m.nombre),
        h('span',{style:{padding:'5px 11px',borderRadius:999,fontSize:11,fontWeight:900,letterSpacing:.8,background:c[1],color:c[2],display:'inline-flex',alignItems:'center',gap:5}},
          h('svg',{width:13,height:13,viewBox:'0 0 24 24'},h('path',{d:'M7 4h10v3a5 5 0 01-10 0V4zM10.5 12h3v4h-3zM8 17h8v3H8z',fill:c[2]})),c[0])),
      h('div',{style:{display:'flex',alignItems:'center',gap:16,marginTop:12}},
        h('div',{style:{width:92,height:92,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:'conic-gradient('+col+' '+(ef*3.6)+'deg,#efe9d8 0)'}},
          h('div',{style:{width:72,height:72,borderRadius:'50%',background:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}},h('b',{style:{fontFamily:'Bebas Neue',fontSize:27,lineHeight:.9,color:col,fontWeight:400}},n1(ef)+'%'),
            d!=null?h('span',{style:{fontSize:10,fontWeight:900,color:d>=0?'#2e7d4f':'#b03030'}},(d>=0?'▲ ':'▼ ')+n1(Math.abs(d))):h('span',{style:{fontSize:8.5,fontWeight:900,color:'#8a8775',letterSpacing:1}},'EFECT.'))),
        h('div',{style:{flex:1,minWidth:0}},
          h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:800,color:'#5f5e4c',marginBottom:4}},h('span',null,m.ent+' de '+m.tot+' entregados'),h('span',{style:{color:'#8a8775'}},'operativa '+n1(m.acida)+'%')),
          h('div',{style:{height:10,borderRadius:6,background:'#efe9d8',overflow:'hidden',display:'flex',marginBottom:8}},
            [[m.ent,'linear-gradient(90deg,#57c98a,#2e9e5b)'],[m.rep,'#a56ad6'],[m.can,'#d0452f'],[m.ruta,'#e8c766'],[m.sin,'#4a4d3c'],[Math.max(0,m.tot-m.ent-m.rep-m.can-m.ruta-m.sin),'#cfc7ae']].map(function(s,i){return h('span',{key:i,style:{width:(s[0]/tot*100)+'%',background:s[1]}});})),
          h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:8}},
            h('div',{style:{fontSize:11.5,fontWeight:700,color:'#7a7766',lineHeight:1.45}},m.ini?('Jornada '+m.ini+' – '+m.fin):'Sin entregas registradas',h('br'),m.horas?(n1(m.horas)+' h en ruta · '+m.dias+' día'+(m.dias===1?'':'s')):''),
            serie.length>1&&h('div',{title:'Entregas por día',style:{display:'flex',alignItems:'flex-end',gap:3,height:28}},serie.map(function(s,i){return h('i',{key:i,title:dm(s.d)+': '+s.n,style:{width:8,height:Math.max(3,s.n/mx*28),borderRadius:2,background:'#C8A84B'}});}))))),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,marginTop:12}},
        chip(m.ritmo?n1(m.ritmo):'—','Por hora',flota.ritmo&&m.ritmo&&m.ent>=20&&m.ritmo<flota.ritmo*0.7),chip(m.rep,'Reprog.',m.rep>=4),chip(m.can,'Cancel.',m.can>0),chip(m.inc,'Incid.',m.inc>0),chip(m.atrasados,'Atrasados',m.atrasados>0)),
      ruletaChip(m),
      abierto&&h('div',{style:{marginTop:12,paddingTop:10,borderTop:'1px dashed #e3dbc4',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 14px',fontSize:12.5}},
        h('div',null,h('div',{style:{fontSize:10,fontWeight:900,letterSpacing:1,color:'#8a8775'}},'COMUNAS PRINCIPALES'),(m.comunas||[]).map(function(c){return h('div',{key:c.comuna,style:{fontWeight:700}},tit(c.comuna)+' · '+c.n+' · ',h('span',{style:{color:c.ef>=98?'#2e7d4f':c.ef>=95?'#8a6d1f':'#b03030'}},n1(c.ef)+'%'));})),
        h('div',null,h('div',{style:{fontSize:10,fontWeight:900,letterSpacing:1,color:'#8a8775'}},'PEOR COMUNA (5+ PAQ.)'),m.peor_comuna?h('div',{style:{fontWeight:700}},tit(m.peor_comuna.comuna)+' · '+n1(m.peor_comuna.ef)+'% de '+m.peor_comuna.n):h('div',{style:{color:'#8a8775'}},'—'),
          h('div',{style:{fontSize:10,fontWeight:900,letterSpacing:1,color:'#8a8775',marginTop:8}},'PERÍODO ANTERIOR'),h('div',{style:{fontWeight:700}},m.ef_prev==null?'Sin datos':(m.ent_prev+' entregados · '+n1(m.ef_prev)+'%'))),
        h('div',null,h('div',{style:{fontSize:10,fontWeight:900,letterSpacing:1,color:'#8a8775'}},'INCIDENCIAS'),h('div',{style:{fontWeight:700}},m.inc?(m.multas+' multa'+(m.multas===1?'':'s')+(m.monto_multas?' ($'+fmt(m.monto_multas)+')':'')+' · '+m.correctivas+' correctiva'+(m.correctivas===1?'':'s')+' · '+m.inc_pend+' por decidir'):'Ninguna')),
        h('div',null,h('div',{style:{fontSize:10,fontWeight:900,letterSpacing:1,color:'#8a8775'}},'OTROS'),h('div',{style:{fontWeight:700}},m.clientes+' clientes · '+m.siniestros+' siniestro'+(m.siniestros===1?'':'s')+(m.cobrado?' · cobrado $'+fmt(m.cobrado):'')))));}

  return h('div',{style:{color:'#2b2e20'}},h('style',null,CSS),
    props.embebido?h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:12}},
      h('div',{style:{fontSize:12.5,fontWeight:700,color:'#7a7766'}},dm(pr[0])+(pr[0]!==pr[1]?' al '+dm(pr[1]):'')+' · '+M.length+' mensajeros con carga'+(cargando?' · actualizando…':'')),
      h('div',{style:{display:'flex',gap:8}},h('button',{type:'button',onClick:cargar,style:{padding:'8px 13px',borderRadius:10,border:'1px solid #e3dbc4',background:'#fff',fontWeight:800,fontSize:12.5,cursor:'pointer'}},'Actualizar'),h('button',{type:'button',onClick:exportar,style:{padding:'8px 13px',borderRadius:10,border:'1px solid #e3dbc4',background:'#fff',fontWeight:800,fontSize:12.5,cursor:'pointer'}},'Excel'))):
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:12,flexWrap:'wrap',marginBottom:14}},
      h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:34,letterSpacing:2,lineHeight:1}},'RENDIMIENTO ',h('span',{style:{color:'#C8A84B'}},'MENSAJEROS')),
        h('div',{style:{fontSize:12.5,fontWeight:700,color:'#7a7766',marginTop:4}},dm(pr[0])+(pr[0]!==pr[1]?' al '+dm(pr[1]):'')+' · '+M.length+' mensajeros con carga'+(cargando?' · actualizando…':''))),
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},
        h('div',{style:{display:'flex',gap:3,background:'#fff',border:'1px solid #e3dbc4',borderRadius:12,padding:4,flexWrap:'wrap'}},seg('hoy','Hoy'),seg('ayer','Ayer'),seg('semana','Esta semana'),seg('semana_ant','Semana pasada'),seg('mes','Este mes'),seg('rango','Rango')),
        per==='rango'&&h('input',{type:'date',value:rango[0],onChange:function(e){setRango([e.target.value,rango[1]]);},style:{padding:'7px 8px',borderRadius:9,border:'1px solid #e3dbc4'}}),
        per==='rango'&&h('input',{type:'date',value:rango[1],onChange:function(e){setRango([rango[0],e.target.value]);},style:{padding:'7px 8px',borderRadius:9,border:'1px solid #e3dbc4'}}),
        h('button',{type:'button',onClick:cargar,style:{padding:'9px 13px',borderRadius:10,border:'1px solid #e3dbc4',background:'#fff',fontWeight:800,fontSize:12.5,cursor:'pointer'}},'Actualizar'),
        h('button',{type:'button',onClick:exportar,style:{padding:'9px 13px',borderRadius:10,border:'1px solid #e3dbc4',background:'#fff',fontWeight:800,fontSize:12.5,cursor:'pointer'}},'Excel'),
        props.onClasica&&h('button',{type:'button',onClick:props.onClasica,style:{padding:'9px 13px',borderRadius:10,border:'1px solid #e3dbc4',background:'transparent',fontWeight:700,fontSize:12,color:'#7a7766',cursor:'pointer'}},'Vista clásica'))),
    err&&h('div',{style:{padding:12,borderRadius:12,background:'#fff4f1',color:'#b03030',fontWeight:700,marginBottom:12}},'No se pudo cargar: '+err),
    data==null?h('div',{style:{padding:30,textAlign:'center',color:'#7a7766'}},'Cargando…'):
    h(React.Fragment,null,
      h('div',{className:'kpm-hero',style:{marginBottom:14}},
        k('Efectividad de la flota',n1(Math.round(flota.ef*10)/10)+'%',h('span',null,'Operativa '+n1(Math.round(flota.acida*10)/10)+'%',dif!=null?h('span',{style:{color:dif>=0?'#8ef0b8':'#ffb3a6'}},' · '+(dif>=0?'+':'')+n1(dif)+' pts vs anterior'):null),'#8ef0b8',true),
        k('Entregados',fmt(flota.ent),'de '+fmt(flota.tot)+' asignados','#2e7d4f'),
        k('Ritmo mediano',flota.ritmo?n1(Math.round(flota.ritmo*10)/10):'—','entregas por hora en ruta'),
        k('Jornada mediana',flota.jornada?n1(Math.round(flota.jornada*10)/10)+'h':'—','primera a última entrega'),
        k('Reprog. + cancel.',fmt(flota.rep+flota.can),flota.rep+' reprogramados · '+flota.can+' cancelados','#b03030'),
        k('Incidencias',fmt(flota.inc),flota.multas+' multas · '+flota.correctivas+' correctivas · '+flota.pend+' por decidir','#8a6d1f'),
        k('Atrasados',fmt(flota.atr),'en ruta o reprogramados con más de 1 día',flota.atr?'#b03030':'#2e7d4f')),
      ruleta&&h('div',{style:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',padding:'11px 15px',borderRadius:14,background:'linear-gradient(180deg,#4a3a17,#2a2110)',border:'1px solid rgba(232,199,102,.6)',color:'#f7dd8c',marginBottom:12,fontSize:12.5,fontWeight:800}},
        h('span',{style:{fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1.2}},'RULETA DE ESTA SEMANA'),
        h('span',null,ruleta.si.length?('Van para giro ('+ruleta.si.length+'): '+ruleta.si.map(function(m){return tit(m.nombre);}).join(', ')):'Por ahora nadie cumple todo'),
        ruleta.cerca.length>0&&h('span',{style:{color:'#d9cfa8'}},' · Cumplen copa, 98% y sin incidencias, les falta llegar al mínimo de entregas: '+ruleta.cerca.map(function(m){return tit(m.nombre);}).join(', '))),
      alertas.length>0&&h('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',padding:'11px 15px',borderRadius:14,background:'#fff4f1',border:'1px solid #f3cfc6',marginBottom:14}},
        h('span',{style:{fontWeight:900,color:'#b03030',letterSpacing:1,fontSize:11}},'REQUIEREN ATENCIÓN'),alertas.map(function(t,i){return h('span',{key:i,style:{padding:'5px 11px',borderRadius:999,background:'#fff',border:'1px solid #f0c7bd',color:'#8e2414',fontWeight:800,fontSize:12}},t);})),
      h('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:12}},
        h('input',{placeholder:'Buscar mensajero',value:q,onChange:function(e){setQ(e.target.value);},style:{padding:'8px 11px',borderRadius:10,border:'1px solid #e3dbc4',fontSize:13,minWidth:200}}),
        h('span',{style:{fontSize:12,fontWeight:800,color:'#7a7766',marginLeft:6}},'Ordenar:'),
        [['pos','Ranking'],['ef','Efectividad'],['ent','Entregados'],['ritmo','Ritmo'],['inc','Incidencias']].map(function(o){var on=orden===o[0];return h('button',{key:o[0],type:'button',onClick:function(){setOrden(o[0]);},style:{padding:'6px 11px',borderRadius:999,border:'1px solid '+(on?'#C8A84B':'#e3dbc4'),background:on?'#fbf2d6':'#fff',color:on?'#8a6d1f':'#5f5e4c',fontWeight:800,fontSize:12,cursor:'pointer'}},o[1]);}),
        h('span',{style:{marginLeft:'auto',fontSize:11.5,color:'#8a8775',fontWeight:700}},(props.onAbrir?'Toca una tarjeta para abrir su ficha':'Toca una tarjeta para ver más')+' · Barra: verde entregado, morado reprogramado, rojo cancelado, dorado en ruta, gris otros estados')),
      lista.length===0?h('div',{style:{padding:30,textAlign:'center',color:'#7a7766',fontWeight:700}},'Sin mensajeros con carga en este período.'):h('div',{className:'kpm-grid'},lista.map(tarjeta))));
}

// ═══ KPI Mensajeros unificado (18-11-2026): "Hoy en vivo" + períodos + ficha del mensajero ═══
// Hoy en vivo: RPC ruta_en_vivo(hoy) cada 30 s + ubicaciones en tiempo real + ranking_semana para la copa.
// Mismas reglas que tenía Ruta en vivo: meta 22:00, 10 puntos de tolerancia, detenido = 45 min sin movimiento.
var EXCLUIR={'ALEJANDRO PADRINO':1,'ELY MENSAJERO':1,'FERNANDOCHECK':1,'FERNANDO CHECK':1,'TODO ENVIO':1};
var HORA_META=22,TOL=10,DETENIDO=45,GPS_MIN=5,HORAS=[19,20,21,22,23];
function fD(d){return d?String(d).slice(8,10)+'-'+String(d).slice(5,7):'—';}
function normN(s){return String(s||'').toUpperCase().replace(/,/g,'').replace(/\s+/g,' ').trim();}
function minCL(d){var p=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit',hour12:false}).format(d).split(':');return (+p[0])*60+(+p[1]);}
function horaCL(d){if(!d)return '—';return new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(d));}
function hace(m){if(m==null)return '—';if(m<1)return 'recién';if(m<60)return 'hace '+m+' min';return 'hace '+Math.floor(m/60)+' h '+(m%60)+' min';}
var EST={detenido:['Detenido','#b03030','#fde3df'],atrasado:['Bajo el ritmo','#8a5a00','#fbefd2'],ok:['En ruta','#1f5fa8','#e3eefb'],terminado:['Terminó','#1f6b40','#dff3e7']};
var CSSV='@keyframes kpmPulso{0%{box-shadow:0 0 0 0 rgba(208,69,47,.55)}70%{box-shadow:0 0 0 9px rgba(208,69,47,0)}100%{box-shadow:0 0 0 0 rgba(208,69,47,0)}}@keyframes kpmVivo{0%{box-shadow:0 0 0 0 rgba(54,196,127,.7)}70%{box-shadow:0 0 0 8px rgba(54,196,127,0)}100%{box-shadow:0 0 0 0 rgba(54,196,127,0)}}'+
  '.kpm-hv{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}@media(max-width:1100px){.kpm-hv{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){.kpm-hv{grid-template-columns:1fr 1fr}.kpm-hv>div:first-child{grid-column:1/-1}}';

function tile(l,v,d,col,dark,extra){return h('div',{style:{borderRadius:18,padding:'14px 16px',background:dark?'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 55%,#15180f 100%)':'#fff',border:'1px solid '+(dark?'rgba(200,168,75,.45)':'#e9e1ca'),boxShadow:'0 4px 0 '+(dark?'#0b0c07':'#e2d8bb'),color:dark?'#f1ecda':'#2b2e20',minWidth:0}},
  h('div',{style:{fontSize:10.5,fontWeight:900,letterSpacing:1.3,color:dark?'#e8c766':'#8a8775',textTransform:'uppercase'}},l),h('div',{style:{fontFamily:'Bebas Neue',fontSize:40,lineHeight:1,marginTop:6,color:col||'inherit',whiteSpace:'nowrap'}},v),h('div',{style:{fontSize:12,fontWeight:700,color:dark?'#cfc9b2':'#7a7766',marginTop:3}},d),extra||null);}
function copaBadge(nivel){var c=COPA[nivel];if(!c)return null;return h('span',{style:{padding:'5px 11px',borderRadius:999,fontSize:11,fontWeight:900,letterSpacing:.8,background:c[1],color:c[2],display:'inline-flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}},
  h('svg',{width:13,height:13,viewBox:'0 0 24 24'},h('path',{d:'M7 4h10v3a5 5 0 01-10 0V4zM10.5 12h3v4h-3zM8 17h8v3H8z',fill:c[2]})),c[0]);}
function posBadge(pos,cnt){return h('div',{style:{minWidth:46,height:38,borderRadius:11,background:'#2b2e20',color:'#e8c766',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',lineHeight:1,flexShrink:0}},h('span',{style:{fontFamily:'Bebas Neue',fontSize:21}},pos?'#'+pos:'—'),h('span',{style:{fontSize:8.5,fontWeight:800,color:'#cfc9b2'}},cnt?'de '+cnt:'sem.'));}

function Vivo(props){
  var toast=props.toast||function(){};
  var _r=useState(null),res=_r[0],setRes=_r[1];var _u=useState({}),ubic=_u[0],setUbic=_u[1];var _k=useState({}),rk=_k[0],setRk=_k[1];
  var _f=useState('todos'),filtro=_f[0],setFiltro=_f[1];var _o=useState('urg'),orden=_o[0],setOrden=_o[1];var _q=useState(''),q=_q[0],setQ=_q[1];
  var _t=useState(0),tick=_t[0],setTick=_t[1];var _ul=useState(null),ultima=_ul[0],setUltima=_ul[1];var _p=useState(false),pausa=_p[0],setPausa=_p[1];
  var _dd=useState(hoyCL()),dia=_dd[0],setDia=_dd[1];var esHoy=dia===hoyCL();var hoy=dia;
  var _ve=useState(false),verEtq=_ve[0],setVerEtq=_ve[1];var _em=useState('todos'),etqMen=_em[0],setEtqMen=_em[1];var _ep=useState(false),etqPend=_ep[0],setEtqPend=_ep[1];
  var avisados=React.useRef({});
  function cargar(){db.rpc('ruta_en_vivo',{p_dia:dia}).then(function(r){if(r.error){toast('No se pudo cargar la ruta: '+r.error.message);return;}setRes(r.data);setUltima(new Date());},function(){});}
  useEffect(function(){cargar();if(pausa||!esHoy)return;var iv=A.intervaloVisible;if(iv)return iv(cargar,30000,['envios'],8000);var id=setInterval(function(){if(!document.hidden)cargar();},30000);return function(){clearInterval(id);};},[pausa,dia]);
  useEffect(function(){setRk({});db.rpc('ranking_semana',{p_lunes:lunes(dia)}).then(function(r){if(r&&r.data){var o={};r.data.forEach(function(x){o[normN(x.n)]=x;});setRk(o);}},function(){});},[dia]);
  useEffect(function(){
    function cargarUb(){db.from('ubicaciones_mensajeros').select('mensajero,updated_at,activo').then(function(r){if(r&&r.data){var o={};r.data.forEach(function(u){o[normN(u.mensajero)]=u;});setUbic(o);}},function(){});}
    cargarUb();var ch=null;try{ch=db.channel('kpm-ubic-'+Math.random().toString(36).slice(2,7)).on('postgres_changes',{event:'*',schema:'public',table:'ubicaciones_mensajeros'},function(pl){var u=pl&&pl.new;if(!u||!u.mensajero)return;setUbic(function(prev){var o=Object.assign({},prev);o[normN(u.mensajero)]=u;return o;});}).subscribe();}catch(e){}
    var iv=setInterval(function(){if(!document.hidden)cargarUb();},120000);var t2=setInterval(function(){setTick(function(x){return x+1;});},20000);
    return function(){clearInterval(iv);clearInterval(t2);try{if(ch)db.removeChannel(ch);}catch(e){}};
  },[]);
  var ahora=new Date(),minAhora=esHoy?minCL(ahora):24*60;var cortePas=function(hh){return !esHoy||minAhora>=hh*60;};
  var filas=useMemo(function(){return ((res&&res.mensajeros)||[]).filter(function(m){return !EXCLUIR[normN(m.mensajero)];}).map(function(m){
    var n=normN(m.mensajero),ent=+m.ent||0,rep=+m.rep||0,can=+m.can||0,otr=+m.otr||0,pend=+m.pen||0,sal=+m.salida||0,cerr=ent+rep+can+otr;
    var minSal=m.primera_salida?minCL(new Date(m.primera_salida)):null,esperado=null;
    if(minSal!=null){var tot=HORA_META*60-minSal;esperado=tot>0?Math.max(0,Math.min(100,(minAhora-minSal)/tot*100)):100;}
    var hAct=esHoy&&m.ultima_actividad?Math.max(0,Math.round((ahora-new Date(m.ultima_actividad))/60000)):null,hEnt=esHoy&&m.ultima_entrega?Math.max(0,Math.round((ahora-new Date(m.ultima_entrega))/60000)):null;
    var pE=sal?ent/sal*100:0,pC=sal?cerr/sal*100:0,pO=(ent+rep+can)?ent/(ent+rep+can)*100:null;
    var estado=pend===0?'terminado':(hAct!=null&&hAct>=DETENIDO)?'detenido':(esperado!=null&&pC<esperado-TOL)?'atrasado':'ok';
    var fin=esHoy?ahora:(m.ultima_entrega?new Date(m.ultima_entrega):null);var horas=m.primera_salida&&fin?Math.max(.25,(fin-new Date(m.primera_salida))/3600000):null;var ritmo=horas&&ent?ent/horas:null;
    var eta=esHoy&&pend&&ritmo?new Date(ahora.getTime()+pend/ritmo*3600000):null;var etaTarde=eta?(minAhora+(eta-ahora)/60000)>=HORA_META*60:false;
    var u=ubic[n],gpsMin=u&&u.updated_at?Math.floor((ahora-new Date(u.updated_at))/60000):null,sinGps=esHoy&&pend>0&&(gpsMin==null||gpsMin>=GPS_MIN),gpsApp=u?u.activo!==false:null;
    var r=rk[n]||{};
    return {nombre:n,ent:ent,rep:rep,can:can,otr:otr,pend:pend,sal:sal,cerr:cerr,pE:pE,pC:pC,esperado:esperado,hAct:hAct,hEnt:hEnt,estado:estado,pO:pO,etq:+m.etq_futura||0,etqP:+m.etq_futura_pend||0,gpsApp:gpsApp,ritmo:ritmo,eta:eta,etaTarde:etaTarde,gpsMin:gpsMin,sinGps:sinGps,salida:m.primera_salida,ultEnt:m.ultima_entrega,cortes:m.cortes||[],pos:r.pos,cnt:r.cnt,nivel:r.nivel,raw:m};
  });},[res,ubic,rk,tick,dia]);
  var T=filas.reduce(function(a,f){a.sal+=f.sal;a.ent+=f.ent;a.rep+=f.rep;a.can+=f.can;a.pend+=f.pend;a.cerr+=f.cerr;a[f.estado]++;if(f.sinGps)a.gps++;if(f.eta&&(!a.eta||f.eta>a.eta))a.eta=f.eta;if(f.esperado!=null){a.espS+=f.esperado*f.sal;a.espN+=f.sal;}a.etq+=f.etq;a.etqP+=f.etqP;HORAS.forEach(function(x,i){a.c[i]+=+(f.cortes[i])||0;});return a;},{c:[0,0,0,0,0],etq:0,etqP:0,sal:0,ent:0,rep:0,can:0,pend:0,cerr:0,detenido:0,atrasado:0,ok:0,terminado:0,gps:0,eta:null,espS:0,espN:0});
  var pFlota=T.sal?T.cerr/T.sal*100:0,espFlota=T.espN?T.espS/T.espN:null;
  var sinGps=filas.filter(function(f){return f.sinGps;}).sort(function(a,b){return (b.gpsMin==null?1e9:b.gpsMin)-(a.gpsMin==null?1e9:a.gpsMin);});
  useEffect(function(){var vig={};sinGps.forEach(function(f){vig[f.nombre]=1;});Object.keys(avisados.current).forEach(function(k){if(!vig[k])delete avisados.current[k];});var nuevos=sinGps.filter(function(f){return !avisados.current[f.nombre];});
    if(nuevos.length&&res){nuevos.forEach(function(f){avisados.current[f.nombre]=1;});toast(nuevos.length===1?tit(nuevos[0].nombre)+' lleva más de '+GPS_MIN+' min sin enviar ubicación':nuevos.length+' mensajeros llevan más de '+GPS_MIN+' min sin enviar ubicación');}},[sinGps.map(function(f){return f.nombre;}).join('|'),!!res]);
  var prio={detenido:0,atrasado:1,ok:2,terminado:3};
  var vis=filas.filter(function(f){return (filtro==='todos'||(filtro==='gps'?f.sinGps:f.estado===filtro))&&(!q||f.nombre.indexOf(q.toUpperCase())>=0);});
  vis.sort({urg:function(a,b){return prio[a.estado]-prio[b.estado]||(a.pC-(a.esperado||0))-(b.pC-(b.esperado||0));},pos:function(a,b){return (a.pos||999)-(b.pos||999);},avance:function(a,b){return a.pC-b.pC;},pend:function(a,b){return b.pend-a.pend;}}[orden]);
  useEffect(function(){if(props.onLista)props.onLista(vis.map(function(f){return f.nombre;}),filas);},[vis.map(function(f){return f.nombre;}).join('|'),res]);

  function cardVivo(f){var e=EST[f.estado],col=f.estado==='detenido'?'#d0452f':f.estado==='atrasado'?'#d89a1c':f.estado==='terminado'?'#2e9e5b':'#2e9e5b',sal=f.sal||1;
    var bars=[[f.ent,'linear-gradient(90deg,#57c98a,#2e9e5b)'],[f.rep,'#a56ad6'],[f.can+f.otr,'#d0452f'],[f.pend,'#e8c766']];
    return h('div',{key:f.nombre,className:'kpm-card',onClick:function(){props.onAbrir&&props.onAbrir(f.nombre);},style:{borderRadius:20,background:'#fff',border:'1px solid '+(f.estado==='detenido'?'#f0c7bd':f.estado==='atrasado'?'#efd9a6':'#e9e1ca'),boxShadow:'0 5px 0 '+(f.estado==='detenido'?'#f0c7bd':f.estado==='atrasado'?'#efd9a6':'#e2d8bb'),padding:'15px 17px',cursor:'pointer',color:'#2b2e20',position:'relative'}},
      h('div',{style:{display:'flex',alignItems:'center',gap:10}},posBadge(f.pos,f.cnt),
        h('div',{style:{flex:1,minWidth:0}},h('div',{style:{fontWeight:900,fontSize:15,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},f.nombre),
          h('div',{style:{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}},h('span',{style:{padding:'2px 9px',borderRadius:999,fontSize:10.5,fontWeight:900,letterSpacing:.5,color:e[1],background:e[2],animation:f.estado==='detenido'?'kpmPulso 1.6s infinite':'none'}},e[0].toUpperCase()),
            f.sinGps&&h('span',{style:{padding:'2px 9px',borderRadius:999,fontSize:10.5,fontWeight:900,letterSpacing:.5,color:'#b03030',background:'#fde3df'}},'SIN GPS'),
            f.etaTarde&&f.estado!=='terminado'&&h('span',{style:{padding:'2px 9px',borderRadius:999,fontSize:10.5,fontWeight:900,letterSpacing:.5,color:'#8a5a00',background:'#fbefd2'}},'TERMINA DESPUÉS DE 22:00'))),
        copaBadge(f.nivel)),
      h('div',{style:{display:'flex',alignItems:'center',gap:16,marginTop:12}},
        h('div',{style:{position:'relative',width:92,height:92,flexShrink:0}},
          h('div',{style:{width:92,height:92,borderRadius:'50%',background:'conic-gradient('+col+' '+(f.pC*3.6)+'deg,#efe9d8 0)',display:'flex',alignItems:'center',justifyContent:'center'}},
            h('div',{style:{width:72,height:72,borderRadius:'50%',background:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}},h('b',{style:{fontFamily:'Bebas Neue',fontSize:27,lineHeight:.9,color:col,fontWeight:400}},Math.round(f.pC)+'%'),h('span',{style:{fontSize:8.5,fontWeight:900,color:'#8a8775',letterSpacing:.8}},'GESTIONADO'))),
          f.esperado!=null&&f.estado!=='terminado'&&h('div',{title:'Debería ir en '+Math.round(f.esperado)+'%',style:{position:'absolute',left:45,top:0,width:2,height:46,transformOrigin:'1px 46px',transform:'rotate('+(f.esperado*3.6)+'deg)'}},h('div',{style:{width:4,height:13,marginLeft:-1,borderRadius:2,background:'#2b2e20'}}))),
        h('div',{style:{flex:1,minWidth:0}},
          h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:800,color:'#5f5e4c',marginBottom:4}},h('span',null,f.ent+' entregados de '+f.sal),h('span',{style:{color:f.pend?'#8a5a00':'#2e7d4f'}},f.pend?f.pend+' pendientes':'sin pendientes')),
          h('div',{style:{position:'relative',height:10,borderRadius:6,background:'#efe9d8',marginBottom:8}},
            h('div',{style:{display:'flex',height:'100%',borderRadius:6,overflow:'hidden'}},bars.map(function(b,i){return h('span',{key:i,style:{width:(b[0]/sal*100)+'%',background:b[1]}});})),
            f.esperado!=null&&f.estado!=='terminado'&&h('div',{style:{position:'absolute',top:-4,left:'calc('+f.esperado+'% - 1px)',width:2,height:18,background:'#2b2e20',borderRadius:1}})),
          h('div',{style:{fontSize:11.5,fontWeight:700,color:'#7a7766',lineHeight:1.5}},
            'Salió '+horaCL(f.salida)+(f.esperado!=null&&f.estado!=='terminado'?' · debería ir en '+Math.round(f.esperado)+'%':''),h('br'),
            f.estado==='terminado'?('Terminó '+horaCL(f.ultEnt)):(f.eta?h('span',{style:{color:f.etaTarde?'#b03030':'#7a7766'}},'Termina aprox. '+horaCL(f.eta)):'Sin ritmo aún')))),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginTop:12}},
        chip2(f.ritmo?n1(Math.round(f.ritmo*10)/10):'—','Por hora'),chip2(f.hEnt==null?'—':(f.hEnt<60?f.hEnt+'′':Math.floor(f.hEnt/60)+'h'),'Últ. entrega',f.pend>0&&f.hEnt!=null&&f.hEnt>=DETENIDO),
        chip2(f.gpsMin==null?'—':(f.gpsMin<60?f.gpsMin+'′':Math.floor(f.gpsMin/60)+'h'),'GPS',f.sinGps),chip2(f.rep+f.can,'Rep./Canc.',f.rep+f.can>=3)),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4,marginTop:8}},HORAS.map(function(hh,i){var pas=cortePas(hh),v=+(f.cortes[i])||0;return h('div',{key:hh,title:pas?v+' entregados a las '+hh+':00':'Aún no llega esta hora',style:{textAlign:'center',padding:'5px 2px',borderRadius:9,background:pas?'#fbf2d6':'#f6f1e3',border:'1px solid '+(pas?'#ead9a2':'#efe6cc')}},
        h('div',{style:{fontSize:9,fontWeight:900,letterSpacing:.6,color:'#8a8775'}},hh+':00'),h('div',{style:{fontFamily:'Bebas Neue',fontSize:18,lineHeight:1.05,color:pas?'#2b2e20':'#c9c2ab'}},pas?v:'—'),pas&&h('div',{style:{fontSize:9.5,fontWeight:800,color:'#8a6d1f'}},Math.round(v/sal*100)+'%'));})),
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginTop:8,fontSize:11.5,fontWeight:800,color:'#5f5e4c'}},h('span',null,'% entrega '+n1(Math.round(f.pE*10)/10)+'%'),h('span',{style:{color:'#8a8775'}},'· operacional '+(f.pO==null?'—':n1(Math.round(f.pO*10)/10)+'%')),
        f.etq>0&&h('span',{onClick:function(e){e.stopPropagation();setVerEtq(true);setEtqMen(f.raw.mensajero);try{window.scrollTo({top:0,behavior:'smooth'});}catch(x){}},title:'Paquetes con fecha de etiqueta posterior al día (informativo)',style:{marginLeft:'auto',padding:'2px 9px',borderRadius:999,fontSize:11,fontWeight:900,color:'#8a5a00',background:'#fbefd2',border:'1px solid #efd9a6',cursor:'pointer'}},f.etq+' etiq. otro día'+(f.etqP?' ('+f.etqP+' pend.)':''))));}
  function chip2(v,l,bad){return h('div',{style:{borderRadius:12,background:bad?'#fff4f1':'#faf6ea',border:'1px solid '+(bad?'#f3cfc6':'#efe6cc'),padding:'7px 4px',textAlign:'center'}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:23,lineHeight:1,color:bad?'#b03030':'#2b2e20'}},v),h('div',{style:{fontSize:9,fontWeight:900,letterSpacing:.7,color:'#8a8775',textTransform:'uppercase',marginTop:2}},l));}
  var fchip=function(k,l,n){var on=filtro===k;return h('button',{key:k,type:'button',onClick:function(){setFiltro(k);},style:{padding:'6px 12px',borderRadius:999,border:'1px solid '+(on?'#C8A84B':'#e3dbc4'),background:on?'#fbf2d6':'#fff',color:on?'#8a6d1f':'#5f5e4c',fontWeight:800,fontSize:12,cursor:'pointer'}},l+' ('+n+')');};
  var ochip=function(k,l){var on=orden===k;return h('button',{key:k,type:'button',onClick:function(){setOrden(k);},style:{padding:'6px 11px',borderRadius:999,border:'1px solid '+(on?'#2b2e20':'#e3dbc4'),background:on?'#2b2e20':'#fff',color:on?'#f7dd8c':'#5f5e4c',fontWeight:800,fontSize:12,cursor:'pointer'}},l);};
  if(!res)return h('div',{style:{padding:30,textAlign:'center',color:'#7a7766'}},'Cargando ruta en vivo…');
  var difE=espFlota==null?null:Math.round(pFlota-espFlota);
  return h('div',null,h('style',null,CSSV),
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:12}},
      h('div',{style:{display:'flex',alignItems:'center',gap:10,fontSize:12.5,fontWeight:700,color:'#7a7766'}},esHoy&&!pausa&&h('span',{style:{width:10,height:10,borderRadius:'50%',background:'#36c47f',animation:'kpmVivo 1.8s infinite'}}),
        (ultima?'Actualizado '+ultima.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'')+(esHoy?(pausa?' · en pausa':' · se actualiza sola cada 30 segundos'):' · día '+fD(dia)+' cerrado')+' · '+filas.length+' mensajeros salieron'),
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},h('input',{type:'date',value:dia,max:hoyCL(),onChange:function(e){if(e.target.value){setRes(null);setDia(e.target.value);}},style:{padding:'7px 9px',borderRadius:10,border:'1px solid #e3dbc4'}}),!esHoy&&h('button',{type:'button',onClick:function(){setRes(null);setDia(hoyCL());},style:{padding:'8px 13px',borderRadius:10,border:'1px solid #C8A84B',background:'#fbf2d6',fontWeight:800,fontSize:12.5,cursor:'pointer'}},'Volver a hoy'),esHoy&&h('button',{type:'button',onClick:function(){setPausa(!pausa);},style:{padding:'8px 13px',borderRadius:10,border:'1px solid #e3dbc4',background:'#fff',fontWeight:800,fontSize:12.5,cursor:'pointer'}},pausa?'Reanudar':'Pausar'),
        h('button',{type:'button',onClick:cargar,style:{padding:'8px 13px',borderRadius:10,border:'1px solid #e3dbc4',background:'#fff',fontWeight:800,fontSize:12.5,cursor:'pointer'}},'Actualizar'),
        props.onTabla&&h('button',{type:'button',onClick:props.onTabla,style:{padding:'8px 13px',borderRadius:10,border:'1px solid #e3dbc4',background:'transparent',fontWeight:700,fontSize:12,color:'#7a7766',cursor:'pointer'}},'Vista tabla (cortes por hora, otros días)'))),
    h('div',{className:'kpm-hv',style:{marginBottom:14}},
      tile('Avance de la flota',Math.round(pFlota)+'%',h('span',null,espFlota!=null?'Debería ir en '+Math.round(espFlota)+'% ':'',difE!=null?h('span',{style:{color:difE>=0?'#8ef0b8':'#ffb3a6'}},'('+(difE>=0?'+':'')+difE+' pts)'):null),'#8ef0b8',true,
        h('div',{style:{position:'relative',height:8,borderRadius:5,background:'rgba(255,255,255,.12)',marginTop:10}},h('div',{style:{width:pFlota+'%',height:'100%',borderRadius:5,background:'linear-gradient(90deg,#57c98a,#2e9e5b)'}}),espFlota!=null&&h('div',{style:{position:'absolute',top:-4,left:'calc('+espFlota+'% - 1px)',width:2,height:16,background:'#f7dd8c'}}))),
      tile('Llegó hoy',fmt(res&&res.llegada),'paquetes recibidos en bodega'),
      tile('Salió a ruta',fmt(T.sal),filas.length+' mensajeros','#8a6d1f'),
      tile('Entregados',fmt(T.ent),'% entrega '+(T.sal?n1(Math.round(T.ent/T.sal*1000)/10):'—')+'% · operacional '+((T.ent+T.rep+T.can)?n1(Math.round(T.ent/(T.ent+T.rep+T.can)*1000)/10):'—')+'%','#2e7d4f'),
      tile('Pendientes',fmt(T.pend),T.rep+' reprog. · '+T.can+' cancel.',T.pend?'#8a5a00':'#2e7d4f'),
      tile('Detenidos',T.detenido,'45 min o más sin movimiento',T.detenido?'#b03030':'#2e7d4f'),
      tile('Bajo el ritmo',T.atrasado,'más de 10 pts detrás de su hora',T.atrasado?'#8a5a00':'#2e7d4f'),
      tile('Sin GPS',T.gps,'con pendientes y 5+ min sin ubicación',T.gps?'#b03030':'#2e7d4f'),
      tile('Cierre estimado',esHoy?(T.eta?horaCL(T.eta):(T.pend?'—':'Listo')):'—',T.terminado+' terminaron',T.eta&&minCL(T.eta)>=HORA_META*60?'#b03030':null),
      h('div',{key:'etq',onClick:function(){setVerEtq(!verEtq);setEtqMen('todos');},style:{cursor:'pointer',borderRadius:18,outline:verEtq?'2px solid #e0a020':'none'}},tile('Etiqueta de otro día',fmt(T.etq),(T.etq?T.etqP+' aún pendientes · ':'')+(verEtq?'ocultar lista':'ver lista'),T.etq?'#8a5a00':null))),
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:10,marginBottom:14}},HORAS.map(function(hh,i){var pas=cortePas(hh),v=T.c[i];return h('div',{key:hh,style:{borderRadius:14,padding:'10px 14px',background:pas?'linear-gradient(180deg,#fff,#fbf2d6)':'#faf6ea',border:'1px solid '+(pas?'#ead9a2':'#efe6cc'),boxShadow:pas?'0 3px 0 #ead9a2':'none'}},
      h('div',{style:{fontSize:10,fontWeight:900,letterSpacing:1.3,color:'#8a8775'}},'CORTE '+hh+':00'),h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,lineHeight:1.05,color:pas?'#2b2e20':'#c9c2ab'}},pas?(T.sal?n1(Math.round(v/T.sal*1000)/10)+'%':'—'):'Pendiente'),pas&&h('div',{style:{fontSize:11,fontWeight:700,color:'#7a7766'}},fmt(v)+' entregados'));})),
    verEtq&&(function(){var L=(res&&res.etq_lista)||[];var mens={};L.forEach(function(x){mens[x.mensajero]=(mens[x.mensajero]||0)+1;});
      var V=L.filter(function(x){return (etqMen==='todos'||x.mensajero===etqMen)&&(!etqPend||x.cat==='pendiente');});var fechas={};V.forEach(function(x){fechas[x.fecha_etiqueta]=(fechas[x.fecha_etiqueta]||0)+1;});
      var CAT={pendiente:['Pendiente','#8a5a00','#fbefd2'],entregado:['Entregado','#1f6b40','#dff3e7'],reprogramado:['Reprogramado','#6b2fa0','#efe2fa'],cancelado:['Cancelado','#b03030','#fde3df'],otro:['Otro','#555','#ececea']};
      var cm=function(v,l,n){var on=etqMen===v;return h('button',{key:v,type:'button',onClick:function(){setEtqMen(v);},style:{padding:'5px 10px',borderRadius:999,border:'1px solid '+(on?'#e0a020':'#e3dbc4'),background:on?'#fbefd2':'#fff',fontWeight:800,fontSize:12,cursor:'pointer'}},l+' ('+n+')');};
      return h('div',{style:{borderRadius:18,background:'#fff',border:'1px solid #efd9a6',boxShadow:'0 4px 0 #efd9a6',padding:'14px 16px',marginBottom:14}},
        h('div',{style:{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap',alignItems:'flex-start'}},h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.2}},'Etiqueta de otro día · '+V.length+' paquete'+(V.length!==1?'s':'')),
          h('div',{style:{fontSize:12.5,color:'#7a7766',fontWeight:600}},'Salieron a ruta con fecha impresa posterior. '+Object.keys(fechas).sort().map(function(k){return fechas[k]+' con '+fD(k);}).join(' · ')+'. Informativo: la fecha de recepción no cambia.')),
          h('label',{style:{fontSize:12.5,fontWeight:800,display:'flex',gap:6,alignItems:'center'}},h('input',{type:'checkbox',checked:etqPend,onChange:function(e){setEtqPend(e.target.checked);}}),'Solo pendientes')),
        h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',margin:'10px 0'}},cm('todos','Todos',L.length),Object.keys(mens).sort().map(function(m){return cm(m,tit(m),mens[m]);})),
        h('div',{style:{maxHeight:320,overflowY:'auto'}},h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:12.5}},h('thead',null,h('tr',null,['Código','Mensajero','Cliente','Comuna','Etiqueta','Estado'].map(function(c){return h('th',{key:c,style:{textAlign:'left',padding:'6px 8px',fontSize:10.5,letterSpacing:.8,color:'#8a8775',borderBottom:'1px solid #efe6cc'}},c);}))),
          h('tbody',null,V.map(function(x){var c=CAT[x.cat]||CAT.otro;return h('tr',{key:x.codigo},h('td',{style:{padding:'5px 8px',fontFamily:'monospace',fontWeight:700}},x.codigo),h('td',{style:{padding:'5px 8px'}},tit(x.mensajero)),h('td',{style:{padding:'5px 8px'}},x.cliente||'—'),h('td',{style:{padding:'5px 8px'}},tit(x.comuna||'—')),h('td',{style:{padding:'5px 8px'}},fD(x.fecha_etiqueta)),h('td',{style:{padding:'5px 8px'}},h('span',{style:{padding:'2px 8px',borderRadius:999,fontWeight:800,fontSize:11,color:c[1],background:c[2]}},c[0])));})))));})(),
    esHoy&&sinGps.length>0&&h('div',{style:{borderRadius:16,padding:'12px 16px',background:'linear-gradient(180deg,#fff,#fbe1dd)',border:'1px solid rgba(176,48,48,.45)',boxShadow:'0 3px 0 rgba(176,48,48,.3)',marginBottom:14}},
      h('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:8}},h('span',{style:{width:10,height:10,borderRadius:'50%',background:'#b03030',animation:'kpmPulso 1.6s infinite'}}),
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.2,color:'#8a1f1f'}},sinGps.length+(sinGps.length===1?' mensajero':' mensajeros')+' sin enviar ubicación hace más de '+GPS_MIN+' min'),h('span',{style:{fontSize:12,color:'#6b3a3a'}},'Solo cuenta a quienes todavía tienen pendientes.')),
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},sinGps.map(function(f){return h('button',{key:f.nombre,type:'button',onClick:function(){props.onAbrir&&props.onAbrir(f.nombre);},style:{display:'inline-flex',gap:8,alignItems:'center',padding:'6px 12px',borderRadius:999,border:'1px solid rgba(176,48,48,.4)',background:'#fff',boxShadow:'0 2px 0 rgba(176,48,48,.25)',cursor:'pointer',fontSize:12.5,fontWeight:800,color:'#2b2e20'}},f.nombre,
        h('span',{style:{fontWeight:700,color:'#a12626'}},(f.gpsMin==null?'nunca hoy':(f.gpsMin>=60?Math.floor(f.gpsMin/60)+' h '+(f.gpsMin%60)+' min':f.gpsMin+' min'))+(f.gpsApp===false?' · cerró la app':' · sin señal o app en segundo plano')));}))),
    h('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:12}},
      fchip('todos','Todos',filas.length),fchip('detenido','Detenidos',T.detenido),fchip('atrasado','Bajo el ritmo',T.atrasado),fchip('ok','En ruta',T.ok),fchip('gps','Sin GPS',T.gps),fchip('terminado','Terminaron',T.terminado),
      h('input',{placeholder:'Buscar mensajero',value:q,onChange:function(e){setQ(e.target.value);},style:{padding:'7px 11px',borderRadius:10,border:'1px solid #e3dbc4',fontSize:13,minWidth:180,marginLeft:6}}),
      h('span',{style:{fontSize:12,fontWeight:800,color:'#7a7766',marginLeft:'auto'}},'Ordenar:'),ochip('urg','Urgencia'),ochip('pos','Ranking'),ochip('avance','Menos avance'),ochip('pend','Más pendientes')),
    vis.length===0?h('div',{style:{padding:30,textAlign:'center',color:'#7a7766',fontWeight:700}},filas.length?'Nadie en este filtro.':'Todavía nadie sale a ruta hoy.'):h('div',{className:'kpm-grid'},vis.map(cardVivo)),
    h('div',{style:{fontSize:11.5,color:'#8a8775',fontWeight:700,marginTop:10}},'La marca negra en el anillo y en la barra indica dónde debería ir según la hora (salida → 22:00). Bajo el ritmo: más de 10 puntos detrás de esa marca. Detenido: con pendientes y sin movimiento hace 45 min o más. Cortes: entregados acumulados a cada hora. Gestionado = entregado + reprogramado + cancelado. Mismos números que el Informe de cierre.'));
}

// Ficha del mensajero: pestaña Hoy (ruta en vivo con mapa/3D) y Rendimiento (semana + historial de copas)
function Ficha(props){
  var nombre=props.nombre,_t=useState(props.tab||'hoy'),tab=_t[0],setTab=_t[1];
  var _w=useState(null),sem=_w[0],setSem=_w[1];var _h=useState(null),tend=_h[0],setTend=_h[1];var _v=useState(!!window.MensajeroVivo),vivoListo=_v[0],setVivoListo=_v[1];var _f=useState(null),fila=_f[0],setFila=_f[1];
  useEffect(function(){if(!vivoListo&&typeof loadScriptOnce==='function')loadScriptOnce('ruta-en-vivo','modules/ruta-en-vivo.js').then(function(){setVivoListo(true);}).catch(function(){});},[]);
  useEffect(function(){setSem(null);setTend(null);if(!props.puedeRend)return;var l=lunes(hoyCL());
    db.rpc('kpi_mensajeros',{p_desde:l,p_hasta:addD(l,6)}).then(function(r){var m=r&&r.data&&(r.data.mensajeros||[]).find(function(x){return x.nombre===nombre;});setSem(m||false);},function(){setSem(false);});
    db.rpc('kpi_mensajero_tendencia',{p_mensajero:nombre,p_semanas:8}).then(function(r){setTend(r&&r.data||[]);},function(){setTend([]);});},[nombre]);
  useEffect(function(){var f=(props.vivoFilas||[]).find(function(x){return x.nombre===nombre;});setFila(f?{estado:f.estado,mensajero:nombre}:{mensajero:nombre});},[nombre]);
  useEffect(function(){function k(e){if(e.key==='Escape')props.onClose();if(e.key==='ArrowRight'&&props.onNext)props.onNext();if(e.key==='ArrowLeft'&&props.onPrev)props.onPrev();}window.addEventListener('keydown',k);return function(){window.removeEventListener('keydown',k);};},[props.onNext,props.onPrev]);
  var tabB=function(k,t){var on=tab===k;return h('button',{key:k,type:'button',onClick:function(){setTab(k);},style:{padding:'9px 16px',border:'none',borderBottom:'3px solid '+(on?'#C8A84B':'transparent'),background:'transparent',fontFamily:'Bebas Neue',fontSize:19,letterSpacing:1.2,color:on?'#2b2e20':'#8a8775',cursor:'pointer'}},t);};
  var nav=function(t,on){return h('button',{type:'button',disabled:!on,onClick:on||undefined,style:{width:38,height:38,borderRadius:10,border:'1px solid #e3dbc4',background:'#fff',fontWeight:900,fontSize:18,cursor:on?'pointer':'default',opacity:on?1:.35}},t);};
  var last=tend&&tend.length?tend[tend.length-1]:null;
  return h('div',{onClick:function(e){if(e.target===e.currentTarget)props.onClose();},style:{position:'fixed',inset:0,zIndex:9500,background:'rgba(20,22,15,.55)',backdropFilter:'blur(3px)',display:'flex',justifyContent:'center',alignItems:'flex-start',overflowY:'auto',padding:'24px 12px'}},
    h('div',{style:{width:'100%',maxWidth:1240,borderRadius:22,background:'#f6f1e3',boxShadow:'0 30px 80px rgba(0,0,0,.45)',overflow:'hidden'}},
      h('div',{style:{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:'linear-gradient(180deg,#3a3d2e,#23261a)',borderBottom:'3px solid #C8A84B'}},
        last&&posBadge(last.pos,last.cnt),
        h('div',{style:{flex:1,minWidth:0}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:1.6,color:'#fff',lineHeight:1}},nombre),h('div',{style:{fontSize:12,fontWeight:700,color:'#d9d3bd',marginTop:3}},'Ficha del mensajero'+(last&&last.pos?' · semana actual #'+last.pos+' de '+last.cnt:''))),
        last&&copaBadge(last.nivel),nav('‹',props.onPrev),nav('›',props.onNext),
        h('button',{type:'button',onClick:props.onClose,style:{width:38,height:38,borderRadius:10,border:'1px solid rgba(232,199,102,.5)',background:'rgba(255,255,255,.08)',color:'#f7dd8c',fontWeight:900,fontSize:16,cursor:'pointer'}},'×')),
      h('div',{style:{display:'flex',gap:6,padding:'0 18px',borderBottom:'1px solid #e3dbc4',background:'#fbf8ef'}},tabB('hoy','Hoy en vivo'),props.puedeRend&&tabB('rend','Rendimiento')),
      h('div',{style:{padding:18}},
        tab==='hoy'?(vivoListo&&window.MensajeroVivo&&fila?h(window.MensajeroVivo,{key:nombre,db:db,dia:hoyCL(),esHoy:true,mensajero:nombre,fila:fila,onClose:props.onClose,onPrev:props.onPrev,onNext:props.onNext}):h('div',{style:{padding:30,textAlign:'center',color:'#7a7766'}},'Cargando…')):
        h(Rendimiento,{m:sem,tend:tend}))));
}
function Rendimiento(p){var m=p.m,tend=p.tend;
  if(m==null||tend==null)return h('div',{style:{padding:30,textAlign:'center',color:'#7a7766'}},'Cargando…');
  var box=function(t,c){return h('div',{style:{borderRadius:18,background:'#fff',border:'1px solid #e9e1ca',boxShadow:'0 4px 0 #e2d8bb',padding:'14px 16px'}},h('div',{style:{fontSize:10.5,fontWeight:900,letterSpacing:1.3,color:'#8a8775',textTransform:'uppercase',marginBottom:10}},t),c);};
  var mxE=Math.max.apply(null,tend.map(function(x){return x.ent||0;}).concat([1]));
  var copas=h('div',{style:{display:'grid',gridTemplateColumns:'repeat('+tend.length+',1fr)',gap:8}},tend.map(function(x,i){var c=COPA[x.nivel],act=i===tend.length-1;
    return h('div',{key:x.lunes,style:{textAlign:'center',padding:'10px 4px',borderRadius:14,background:act?'#fbf2d6':'#faf6ea',border:'1px solid '+(act?'#e8c766':'#efe6cc')}},
      h('div',{style:{fontSize:10,fontWeight:900,color:'#8a8775'}},dm(x.lunes)),
      h('svg',{width:34,height:34,viewBox:'0 0 24 24',style:{margin:'6px auto 2px',display:'block',opacity:c?1:.25}},h('path',{d:'M7 4h10v3a5 5 0 01-10 0V4zM10.5 12h3v4h-3zM8 17h8v3H8z',fill:c?c[2]:'#999'}),h('path',{d:'M7 5H4v1.5A3.5 3.5 0 007.5 10M17 5h3v1.5A3.5 3.5 0 0116.5 10',fill:'none',stroke:c?c[2]:'#999',strokeWidth:1.4})),
      h('div',{style:{fontSize:10.5,fontWeight:900,color:c?c[2]:'#999',letterSpacing:.5}},c?c[0]:'SIN CARGA'),
      h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,lineHeight:1.1}},x.pos?'#'+x.pos:'—'),
      h('div',{style:{height:44,display:'flex',alignItems:'flex-end',justifyContent:'center',marginTop:4}},h('div',{title:x.ent+' entregados',style:{width:16,height:Math.max(3,(x.ent||0)/mxE*44),borderRadius:3,background:'#C8A84B'}})),
      h('div',{style:{fontSize:11,fontWeight:800,color:'#5f5e4c'}},x.ent||0),
      h('div',{style:{fontSize:11,fontWeight:800,color:x.ef==null?'#999':x.ef>=98?'#2e7d4f':x.ef>=95?'#8a6d1f':'#b03030'}},x.ef==null?'—':n1(x.ef)+'%'),
      x.giro&&h('div',{style:{marginTop:4,fontSize:10,fontWeight:900,color:'#8a5a00'}},'Giro: '+x.giro.nombre));}));
  var nLey=tend.filter(function(x){return x.nivel==='leyenda';}).length,nPod=tend.filter(function(x){return x.nivel==='podio';}).length,nOro=tend.filter(function(x){return x.nivel==='oro';}).length;
  var semana=m?h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}},
    [['Efectividad',n1(m.ef)+'%',m.ef_prev!=null?((m.ef-m.ef_prev>=0?'▲ ':'▼ ')+n1(Math.abs(Math.round((m.ef-m.ef_prev)*10)/10))+' vs semana pasada'):''],['Operativa',n1(m.acida)+'%',''],['Entregados',m.ent+' de '+m.tot,m.dias+' días con entregas'],['Jornada',m.ini?m.ini+'–'+m.fin:'—',m.horas?n1(m.horas)+' h en ruta':''],['Ritmo',m.ritmo?n1(m.ritmo)+'/h':'—','entregas por hora'],
     ['Reprog. / Cancel.',m.rep+' / '+m.can,''],['Incidencias',String(m.inc),m.multas+' multas · '+m.correctivas+' correctivas · '+m.inc_pend+' por decidir'],['Atrasados',String(m.atrasados),'más de 1 día'],['Siniestros',String(m.siniestros),''],['Cobrado',m.cobrado?'$'+fmt(m.cobrado):'$0','cobro contra entrega']].map(function(x){return h('div',{key:x[0],style:{borderRadius:12,background:'#faf6ea',border:'1px solid #efe6cc',padding:'10px 12px'}},h('div',{style:{fontSize:10,fontWeight:900,letterSpacing:1,color:'#8a8775',textTransform:'uppercase'}},x[0]),h('div',{style:{fontFamily:'Bebas Neue',fontSize:26,lineHeight:1.1}},x[1]),x[2]&&h('div',{style:{fontSize:11,fontWeight:700,color:'#7a7766'}},x[2]));})):h('div',{style:{color:'#7a7766',fontWeight:700}},'Sin carga esta semana.');
  var ru=m&&m.ruleta;var ruBox=ru?h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},[['Copa de Oro o mejor',ru.cumple_copa],['98% de efectividad',ru.cumple_ef],['Cero incidencias',ru.cumple_inc],['Mínimo de entregas',ru.cumple_vol]].map(function(x){return h('span',{key:x[0],style:{padding:'7px 12px',borderRadius:999,fontWeight:800,fontSize:12.5,background:x[1]?'#dff3e7':'#fde3df',color:x[1]?'#1f6b40':'#b03030'}},(x[1]?'Cumple · ':'Falta · ')+x[0]);}),h('span',{style:{padding:'7px 12px',borderRadius:999,fontWeight:900,fontSize:12.5,background:ru.cumple?'linear-gradient(180deg,#4a3a17,#2a2110)':'#ececea',color:ru.cumple?'#f7dd8c':'#6b6d62'}},ru.cumple?'VA PARA GIRO':'SIN GIRO POR AHORA')):null;
  var com=m?h('div',{style:{display:'flex',flexDirection:'column',gap:6}},(m.comunas||[]).map(function(c){return h('div',{key:c.comuna,style:{display:'flex',alignItems:'center',gap:10,fontSize:13,fontWeight:700}},h('span',{style:{flex:'0 0 170px'}},tit(c.comuna)),h('div',{style:{flex:1,height:8,borderRadius:5,background:'#efe9d8',overflow:'hidden'}},h('div',{style:{width:c.ef+'%',height:'100%',background:c.ef>=98?'#2e9e5b':c.ef>=95?'#C8A84B':'#d0452f'}})),h('span',{style:{width:110,textAlign:'right',color:'#5f5e4c'}},c.n+' paq · '+n1(c.ef)+'%'));})):null;
  return h('div',{style:{display:'flex',flexDirection:'column',gap:14}},
    box('Historial de copas · últimas 8 semanas'+(nLey||nPod||nOro?' · '+[nLey?nLey+' Leyenda':'',nPod?nPod+' Podio':'',nOro?nOro+' Oro':''].filter(Boolean).join(' · '):''),copas),
    box('Esta semana',semana),
    ruBox&&box('Ruleta de esta semana',ruBox),
    com&&(m.comunas||[]).length>0&&box('Comunas de esta semana',com));
}

function KpiMensajeros(props){
  var puedeRend=!!props.puedeRend;
  var _m=useState('vivo'),modo=_m[0],setModo=_m[1];var _r=useState([addD(hoyCL(),-6),hoyCL()]),rango=_r[0],setRango=_r[1];
  var _a=useState(null),abierto=_a[0],setAbierto=_a[1];var _l=useState([]),orden=_l[0],setOrden=_l[1];var _vf=useState([]),vivoFilas=_vf[0],setVivoFilas=_vf[1];
  var _tb=useState(false),tabla=_tb[0],setTabla=_tb[1];var _rv=useState(!!window.RutaEnVivo),rvListo=_rv[0],setRvListo=_rv[1];
  useEffect(function(){if(tabla&&!rvListo&&typeof loadScriptOnce==='function')loadScriptOnce('ruta-en-vivo','modules/ruta-en-vivo.js').then(function(){setRvListo(true);}).catch(function(){});},[tabla]);
  function abrir(n,lista){setAbierto(n);if(lista)setOrden(lista);}
  var idx=abierto?orden.indexOf(abierto):-1;
  var seg=function(k,t){var on=modo===k;return h('button',{key:k,type:'button',onClick:function(){setModo(k);setTabla(false);},style:{padding:'8px 14px',borderRadius:9,border:'none',background:on?'linear-gradient(180deg,#3a3d2e,#23261a)':'transparent',color:on?'#f7dd8c':'#5f5e4c',fontWeight:800,fontSize:12.5,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6}},k==='vivo'&&h('span',{style:{width:8,height:8,borderRadius:'50%',background:'#36c47f'}}),t);};
  return h('div',{style:{color:'#2b2e20'}},h('style',null,CSS),
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:12,flexWrap:'wrap',marginBottom:14}},
      h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:38,letterSpacing:2,lineHeight:1}},'KPI ',h('span',{style:{color:'#C8A84B'}},'MENSAJEROS')),
        h('div',{style:{fontSize:12.5,fontWeight:700,color:'#7a7766',marginTop:4}},modo==='vivo'?'Hoy en tiempo real: avance contra la hora, detenidos, GPS y cierre estimado':'Resultados del período: ranking, copa, efectividad, jornada, ritmo e incidencias')),
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},
        h('div',{style:{display:'flex',gap:3,background:'#fff',border:'1px solid #e3dbc4',borderRadius:12,padding:4,flexWrap:'wrap'}},seg('vivo','Hoy en vivo'),puedeRend&&seg('ayer','Ayer'),puedeRend&&seg('semana','Esta semana'),puedeRend&&seg('semana_ant','Semana pasada'),puedeRend&&seg('mes','Este mes'),puedeRend&&seg('rango','Rango')),
        modo==='rango'&&h('input',{type:'date',value:rango[0],onChange:function(e){setRango([e.target.value,rango[1]]);},style:{padding:'7px 8px',borderRadius:9,border:'1px solid #e3dbc4'}}),
        modo==='rango'&&h('input',{type:'date',value:rango[1],onChange:function(e){setRango([rango[0],e.target.value]);},style:{padding:'7px 8px',borderRadius:9,border:'1px solid #e3dbc4'}}))),
    modo==='vivo'?(tabla?h('div',null,h('button',{type:'button',onClick:function(){setTabla(false);},style:{padding:'8px 13px',borderRadius:10,border:'1px solid #e3dbc4',background:'#fff',fontWeight:800,fontSize:12.5,cursor:'pointer',marginBottom:12}},'Volver a tarjetas'),rvListo&&window.RutaEnVivo?h(window.RutaEnVivo,{toast:props.toast,db:db}):h('div',{style:{padding:30,textAlign:'center',color:'#7a7766'}},'Cargando…')):
      h(Vivo,{toast:props.toast,onAbrir:function(n){abrir(n);},onLista:function(l,f){setOrden(l);setVivoFilas(f);},onTabla:function(){setTabla(true);}})):
      h(KpiMensajerosV2,{key:modo,embebido:true,per:modo,rango:rango,onAbrir:abrir}),
    abierto&&h(Ficha,{key:'f',nombre:abierto,puedeRend:puedeRend,vivoFilas:vivoFilas,tab:modo==='vivo'?'hoy':'rend',onClose:function(){setAbierto(null);},
      onPrev:idx>0?function(){setAbierto(orden[idx-1]);}:null,onNext:idx>=0&&idx<orden.length-1?function(){setAbierto(orden[idx+1]);}:null}));
}
window.KpiMensajeros=KpiMensajeros;

window.KpiMensajerosV2=KpiMensajerosV2;
})();
