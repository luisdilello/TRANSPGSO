// KPI Mensajeros v2 (18-11-2026). Analítica → KPI Mensajeros.
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
  var _p=useState('semana'),per=_p[0],setPer=_p[1];var _r=useState([hoyCL(),hoyCL()]),rango=_r[0],setRango=_r[1];
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
    return h('div',{key:m.nombre,className:'kpm-card',onClick:function(){setAb(function(o){var x=Object.assign({},o);x[m.nombre]=!o[m.nombre];return x;});},style:{borderRadius:20,background:'#fff',border:'1px solid '+(warn?'#f0c7bd':'#e9e1ca'),boxShadow:'0 5px 0 '+(warn?'#f0c7bd':'#e2d8bb'),padding:'15px 17px',cursor:'pointer',color:'#2b2e20'}},
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
        h('span',{style:{marginLeft:'auto',fontSize:11.5,color:'#8a8775',fontWeight:700}},'Toca una tarjeta para ver más · Barra: verde entregado, morado reprogramado, rojo cancelado, dorado en ruta, gris otros estados')),
      lista.length===0?h('div',{style:{padding:30,textAlign:'center',color:'#7a7766',fontWeight:700}},'Sin mensajeros con carga en este período.'):h('div',{className:'kpm-grid'},lista.map(tarjeta))));
}
window.KpiMensajerosV2=KpiMensajerosV2;
})();
