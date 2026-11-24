// Operaciones → Banco de incidencias v2 (16-11-2026).
// Una incidencia = mensajero + día + título; cada reporte (tabla reportes_operador) cae adentro
// y suma "veces". Liz e Hiram reportan; Yohana y Fernando (configuracion.incidencias_clasifican)
// clasifican en Correctiva / Multa / Descartar; la multa y su valor los aprueba Luis (superadmin).
// RPC clasificar_incidencia replica el resultado en reportes_operador (comisión del operador).
(function(){
var A=window.__app||{};var db=A.db;var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo;
var ORO='#e8c766',TXT='#f1ecda',SUAVE='rgba(233,228,210,.65)';
var EST={por_clasificar:['Por clasificar','#e8b84a'],multa_propuesta:['Multa · falta valor','#ff8a6e'],multa:['Multa','#ff6b57'],correctiva:['Correctiva','#7fb0ff'],descartada:['Descartada','#9aa08a']};
var DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
function hoyCL(){return A.fechaHoyCL?A.fechaHoyCL():new Date().toISOString().slice(0,10);}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function sumar(f,n){var d=new Date(f+'T12:00:00');d.setDate(d.getDate()+n);return iso(d);}
function lunesDe(f){var d=new Date(f+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d);}
function dm(f){var p=String(f).slice(0,10).split('-');return p[2]+'-'+p[1];}
function diaLargo(f){var d=new Date(f+'T12:00:00');return DIAS[d.getDay()].toUpperCase()+' '+dm(f);}
function hora(ts){try{return new Date(ts).toLocaleTimeString('es-CL',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});}catch(e){return '';}}
function money(n){return '$'+Math.round(+n||0).toLocaleString('es-CL');}
function tit(s){return String(s||'').toLowerCase().replace(/(^|\s)\S/g,function(c){return c.toUpperCase();});}
function primer(s){return tit(String(s||'').split(' ')[0]);}
var css='@media(max-width:900px){.ia-dash{grid-template-columns:1fr!important}}'+'.ia-heat,.ia-heat thead,.ia-heat tbody,.ia-heat tr,.ia-heat th,.ia-heat td{background:transparent!important;box-shadow:none!important}.ia-heat tbody tr:hover td{background:rgba(255,255,255,.04)!important}.ia-heat td{color:#f1ecda}'+'.ia-btn{transition:transform .12s,filter .12s;cursor:pointer}.ia-btn:hover{filter:brightness(1.1)}.ia-btn:active{transform:translateY(1px)}.ia-btn:disabled{opacity:.5;cursor:default}'+
 '.ia-in{padding:9px 11px;border-radius:10px;border:1px solid rgba(232,199,102,.5);background:#fff;font-size:14px;color:#1a1d13;outline:none;box-sizing:border-box}'+
 '.ia-tab{transition:color .15s}.ia-tab:hover{color:#fff}@media (max-width:760px){.ia-act{width:100%;justify-content:flex-start!important;margin-left:0!important}.ia-k{grid-template-columns:repeat(2,1fr)!important}}';
var caja={borderRadius:20,background:'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 50%,#15180f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 18px 38px rgba(20,22,15,.25), inset 0 1px 0 rgba(255,255,255,.07)',color:TXT,padding:'18px 20px'};
var vid={borderRadius:16,background:'linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.1)'};
function boton(t,on,tipo,dis){var st={padding:'8px 13px',borderRadius:10,fontWeight:900,fontSize:12.5,whiteSpace:'nowrap',border:'1px solid rgba(232,199,102,.45)',background:'rgba(255,255,255,.06)',color:TXT};
  if(tipo==='c')Object.assign(st,{borderColor:'#5b8def',color:'#a9c8ff',background:'rgba(91,141,239,.13)'});
  if(tipo==='m')Object.assign(st,{borderColor:'#e0533f',color:'#ffa494',background:'rgba(224,83,63,.14)'});
  if(tipo==='g')Object.assign(st,{borderColor:'#f7dd8c',color:'#1a1d13',background:'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)',boxShadow:'0 3px 0 #6d531a'});
  return h('button',{type:'button',className:'ia-btn',onClick:on,disabled:!!dis,style:st},t);}
function chip(t,c){return h('span',{style:{display:'inline-block',padding:'3px 10px',borderRadius:999,fontSize:11,fontWeight:900,background:c+'22',color:c,border:'1px solid '+c+'66',whiteSpace:'nowrap'}},t);}
function contador(n,rojo,tam){tam=tam||58;return h('div',{style:{width:tam,height:tam,borderRadius:16,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:tam*.52,lineHeight:.9,
  color:rojo?'#fff':'#1a1d13',background:rojo?'linear-gradient(180deg,#ffb3a6,#e0533f 55%,#8e2414)':'linear-gradient(180deg,#fff2c2,#e8c766 55%,#a8801f)',boxShadow:rojo?'inset 0 2px 0 rgba(255,255,255,.35), 0 4px 0 #5a160c':'inset 0 2px 0 rgba(255,255,255,.6), 0 4px 0 #5a4510'}},
  '×'+n,h('span',{style:{fontFamily:'DM Sans,sans-serif',fontSize:9,fontWeight:900,letterSpacing:1}},n===1?'VEZ':'VECES'));}

function IncidenciasAgrupadas(props){
  var _ag=useState(function(){try{return localStorage.getItem('ia_agrupar')||'men';}catch(e){return 'men';}}),agrupar=_ag[0],setAgrupar=_ag[1];var _am=useState({}),abMen=_am[0],setAbMen=_am[1];
  var toast=props.toast||function(m){alert(m);};
  var esSuper=!!(A.perfil&&A.perfil.esSuperAdmin),esAdm=!!(A.perfil&&A.perfil.esAdministracion);
  var _p=useState(false),puede=_p[0],setPuede=_p[1];
  var _s=useState(lunesDe(hoyCL())),sem=_s[0],setSem=_s[1];
  var _i=useState(null),incs=_i[0],setIncs=_i[1];var _r=useState([]),reps=_r[0],setReps=_r[1];
  var _t=useState('prop'),tab=_t[0],setTab=_t[1];var _q=useState(''),q=_q[0],setQ=_q[1];
  var _o=useState({}),abiertas=_o[0],setAbiertas=_o[1];
  var _m=useState(null),modal=_m[0],setModal=_m[1];
  var _v=useState(null),ver=_v[0],setVer=_v[1]; // {incId, i}
  var _ve=useState(null),verEnv=_ve[0],setVerEnv=_ve[1];var _b=useState(false),busy=_b[0],setBusy=_b[1];
  useEffect(function(){db.rpc('puede_clasificar_incidencias').then(function(r){setPuede(!!(r&&r.data));});},[]);
  var _cm=useState({}),catMontos=_cm[0],setCatMontos=_cm[1];var _cg=useState({}),catGrupos=_cg[0],setCatGrupos=_cg[1];
  useEffect(function(){db.from('configuracion').select('valor').eq('clave','faltas_reglamento').maybeSingle().then(function(r){var v=r&&r.data&&Array.isArray(r.data.valor)?r.data.valor:[];var o={};var gg={};v.forEach(function(f){if(f&&f.label){o[String(f.label).toLowerCase().trim()]=+f.monto||0;gg[String(f.label).toLowerCase().trim()]=f.grupo||'';}});setCatMontos(o);setCatGrupos(gg);});},[]);
  var hasta=sumar(sem,6);
  function cargar(){
    db.from('incidencias').select('*').gte('fecha',sem).lte('fecha',hasta).order('fecha',{ascending:true}).limit(3000).then(function(r){if(r.error){toast('No se pudieron cargar las incidencias: '+r.error.message);setIncs([]);return;}setIncs(r.data||[]);});
    db.from('reportes_operador').select('id,incidencia_id,codigo,cliente,comuna,comentario,reportado_por,created_at,decision,decision_monto,monto_propuesto,decision_por,aprobado_por,resuelto,resolucion,resuelto_por,evidencias').gte('fecha',sem).lte('fecha',hasta).order('created_at',{ascending:true}).limit(5000).then(function(r){if(!r.error)setReps((r.data||[]).map(function(x){return x.codigo?x:Object.assign({},x,{codigo:'Directo',_directo:true});}));});}
  useEffect(function(){setIncs(null);cargar();var st=A.intervaloVisible?A.intervaloVisible(cargar,300000,['reportes_operador'],2500):null;return function(){if(typeof st==='function')st();};},[sem]);
  var porInc=useMemo(function(){var o={};reps.forEach(function(r){(o[r.incidencia_id]=o[r.incidencia_id]||[]).push(r);});return o;},[reps]);
  var nSinGest=0;var L=(incs||[]).map(function(i){var rsT=porInc[i.id]||[];var rs=rsT.filter(function(r){return r.resuelto||r.decision;});nSinGest+=rsT.length-rs.length;var quien={};rs.forEach(function(r){var k=primer(r.reportado_por)||'—';quien[k]=(quien[k]||0)+1;});
    var nuevos=i.clasificado_at?rs.filter(function(r){return r.created_at>i.clasificado_at;}).length:0;
    return Object.assign({},i,{_reps:rs,_veces:rs.length||1,_quien:quien,_ult:rs.length?rs[rs.length-1].created_at:i.created_at,_nuevos:nuevos});}).filter(function(i){return i._reps.length>0;});
  // 17-11-2026: el banco solo muestra piezas ya gestionadas en Operaciones → Incidencias; aquí solo se decide.
  var Lq=L.filter(function(i){if(!q)return true;var s=q.toLowerCase();return (i.mensajero+' '+i.motivo+' '+i._reps.map(function(r){return r.codigo;}).join(' ')).toLowerCase().indexOf(s)>=0;});
  function tienePend(i){return i._reps.some(function(r){return !r.decision&&!r.resuelto;});}function tieneProp(i){return i._reps.some(function(r){return (!r.decision&&r.resuelto)||r.decision==='multa_propuesta';});}
  var nPor=Lq.filter(tienePend).length,nProp=Lq.filter(tieneProp).length;
  var vis=Lq.filter(function(i){return tab==='por'?tienePend(i):tab==='prop'?tieneProp(i):tab==='clas'?(!tienePend(i)&&!tieneProp(i)):true;});
  var multas=L.filter(function(i){return i.estado==='multa';}),totMultas=multas.reduce(function(s,i){return s+(+i.monto||0);},0);

  var verInc=ver?L.find(function(x){return x.id===ver.incId;}):null;var verRep=verInc?verInc._reps[ver.i]:null;
  useEffect(function(){if(!verRep||!verRep.codigo||verRep._directo){setVerEnv(verRep?{_noExiste:true}:null);return;}var vivo=true;setVerEnv('cargando');
    db.from('envios').select('*').eq('codigo',verRep.codigo).maybeSingle().then(function(q){if(vivo)setVerEnv(q&&q.data?q.data:{codigo:verRep.codigo,_noExiste:true});});return function(){vivo=false;};},[verRep&&verRep.id]);
  useEffect(function(){if(!ver)return;function k(e){if(e.key==='ArrowRight')mover(1);if(e.key==='ArrowLeft')mover(-1);if(e.key==='Escape')setVer(null);}window.addEventListener('keydown',k);return function(){window.removeEventListener('keydown',k);};},[ver,verInc&&verInc._reps.length]);
  function mover(d){setVer(function(v){if(!v||!verInc)return v;var n=v.i+d;if(n<0||n>=verInc._reps.length)return v;return {incId:v.incId,i:n};});}
  function abrirVer(i,idx){setVer({incId:i.id,i:idx||0});}
  var DEC={correctiva:['Correctiva','#7fb0ff'],multa_propuesta:['Multa · falta valor','#ff8a6e'],multa:['Multa','#ff6b57'],descartada:['Descartada','#9aa08a']};
  function decChip(r){if(!r.decision)return r.resuelto?chip('Pendiente','#e8b84a'):chip('Por gestionar','#e8b84a');var d=DEC[r.decision];return chip(r.decision==='multa'?'Multa '+money(r.decision_monto):r.decision==='multa_propuesta'&&r.monto_propuesto?'Multa propuesta '+money(r.monto_propuesto):d[0],d[1]);}
  // acción sobre uno o varios códigos (reportes)
  async function clasificar(ids,acc,montos,nota){if(!ids.length)return false;setBusy(true);
    var r=await db.rpc('clasificar_reportes',{p_ids:ids,p_accion:acc,p_montos:montos||null,p_nota:nota||null});setBusy(false);
    if(r.error){toast(r.error.message||'No se pudo guardar');return false;}
    var n=ids.length,s=n===1?'':'s';toast(acc==='correctiva'?n+' código'+s+' como correctiva':acc==='descartar'?n+' código'+s+' descartado'+s:acc==='reabrir'?n+' código'+s+' vuelto'+s+' a por decidir':'Multa aprobada en '+n+' código'+s);
    setModal(null);cargar();return true;}
  // 20-11-2026: el monto parte del valor fijo del catálogo (Sistema → Listado de incidencias) para el motivo.
  function montoCatalogo(motivo){return catMontos[String(motivo||'').toLowerCase().trim()]||0;}
  function abrirMulta(i,reps){var mc=montoCatalogo(i.motivo);setModal({i:i,reps:reps,montos:reps.map(function(r){return r.decision==='multa'?String(r.decision_monto||''):r.monto_propuesto?String(r.monto_propuesto):(mc?String(mc):'');}),nota:i.nota||''});}
  async function descontada(i,v){var r=await db.rpc('marcar_incidencia_descontada',{p_id:i.id,p_valor:v});if(r.error){toast(r.error.message);return;}cargar();}
  function exportar(){var rows=[];L.forEach(function(i){i._reps.forEach(function(r){rows.push([dm(i.fecha),i.mensajero,i.motivo,r.codigo,primer(r.reportado_por),hora(r.created_at),r.comentario||'',r.resuelto?(r.resolucion||'Sí'):'',r.resuelto_por||'',r.decision?(DEC[r.decision]||[''])[0]:(r.resuelto?'Por decidir':'Por gestionar'),r.decision==='multa'?Math.round(+r.decision_monto||0):'',r.decision_por||'',r.aprobado_por||'',i.descontado?'Sí':'']);});});
    A.exportToExcel('INCIDENCIAS '+dm(sem)+' AL '+dm(hasta),[{name:'Incidencias',headers:['Día','Mensajero','Título','Código','Reportó','Hora','Comentario','Gestión','Gestionó','Decisión','Multa','Decidió','Aprobó','Descontada'],rows:rows}]);}

  // 17-11-2026: primero Pieza gestionada (Luis, Yohana o Fernando); después decide solo Luis.
  function gestionar(r){
    var f=document.createElement('div');f.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px';
    f.innerHTML='<div style="background:#fff;color:#222;border-radius:12px;max-width:420px;width:100%;padding:18px;font-family:inherit"><div style="font-weight:800;font-size:15px;margin-bottom:4px">Pieza gestionada · '+String(r.codigo||'').replace(/</g,'&lt;')+'</div><div style="font-size:12px;color:#777;margin-bottom:10px">Cuenta qué se hizo con la pieza</div><textarea rows="3" placeholder="Cómo se gestionó" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #ccc;border-radius:8px;font-family:inherit;font-size:13px"></textarea><div data-err style="color:#b00020;font-size:12px;min-height:16px;margin-top:4px"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px"><button data-x="c" style="padding:8px 14px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer">Cancelar</button><button data-x="o" style="padding:8px 14px;border-radius:8px;border:none;background:#2e7d4f;color:#fff;font-weight:700;cursor:pointer">Pieza gestionada</button></div></div>';
    document.body.appendChild(f);var ta=f.querySelector('textarea');ta.focus();
    function cerrar(){if(f.parentNode)f.parentNode.removeChild(f);}
    f.querySelector('[data-x=c]').onclick=cerrar;
    f.querySelector('[data-x=o]').onclick=async function(){var v=(ta.value||'').trim();if(v.length<3){f.querySelector('[data-err]').textContent='Escribe cómo se gestionó.';return;}
      var rr=await db.rpc('resolver_reporte_operador',{p_id:r.id,p_resolucion:v});
      if(rr.error){f.querySelector('[data-err]').textContent=rr.error.message;return;}
      cerrar();toast(r.codigo+' gestionada');cargar();};
  }
  function accionesCodigo(i,r,chico){var b=[];
    if(!r.decision&&esSuper){b.push(boton('Correctiva',function(){clasificar([r.id],'correctiva');},'c',busy),boton('Multa',function(){abrirMulta(i,[r]);},'m',busy),boton('Descartar',function(){clasificar([r.id],'descartar');},null,busy));}
    else if(r.decision==='multa_propuesta'&&esSuper){b.push(boton('Poner valor',function(){abrirMulta(i,[r]);},'g',busy),boton('Correctiva',function(){clasificar([r.id],'correctiva');},'c',busy));}
    else if(r.decision&&esSuper&&!(i.descontado&&r.decision==='multa'))b.push(boton('Cambiar',function(){clasificar([r.id],'reabrir');},null,busy));
    return b;}
  function tarjeta(i){var sinG=i._reps.filter(function(r){return !r.decision&&!r.resuelto;}),pend=i._reps.filter(function(r){return !r.decision&&r.resuelto;}),prop=i._reps.filter(function(r){return r.decision==='multa_propuesta';}),mul=i._reps.filter(function(r){return r.decision==='multa';}),cor=i._reps.filter(function(r){return r.decision==='correctiva';});
    var rojo=mul.length>0||prop.length>0||i._veces>=5,ab=abiertas[i.id]!=null?abiertas[i.id]:(sinG.length>0||pend.length>0||prop.length>0),e=EST[i.estado]||EST.por_clasificar;
    var acciones=[boton('Ver evidencias',function(){abrirVer(i,0);},null,false)];
    if(pend.length>1&&esSuper)acciones.push(h('span',{key:'t',style:{fontSize:11,fontWeight:900,color:SUAVE,marginLeft:4}},'Todas las gestionadas:'),boton('Correctiva',function(){clasificar(pend.map(function(r){return r.id;}),'correctiva');},'c',busy),boton('Multa',function(){abrirMulta(i,pend);},'m',busy),boton('Descartar',function(){clasificar(pend.map(function(r){return r.id;}),'descartar');},null,busy));
    if(prop.length>1&&esSuper)acciones.push(boton('Aprobar las '+prop.length+' multas',function(){abrirMulta(i,prop);},'g',busy));
    if(mul.length>0&&(esSuper||esAdm))acciones.push(h('label',{key:'d',style:{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,cursor:'pointer'}},h('input',{type:'checkbox',checked:!!i.descontado,onChange:function(ev){descontada(i,ev.target.checked);},style:{width:16,height:16,accentColor:'#C8A84B'}}),'Descontada'));
    var resumenTxt=[sinG.length?sinG.length+' por gestionar':'',pend.length?pend.length+' por decidir':'',prop.length?prop.length+' multa'+(prop.length>1?'s':'')+' sin valor':'',mul.length?mul.length+' multa'+(mul.length>1?'s':'')+' '+money(mul.reduce(function(t,r){return t+(+r.decision_monto||0);},0)):'',cor.length?cor.length+' correctiva'+(cor.length>1?'s':''):''].filter(Boolean).join(' · ');
    return h('div',{key:i.id,style:Object.assign({},vid,{padding:'12px 14px',marginBottom:8,borderColor:(pend.length||prop.length)?'rgba(224,83,63,.5)':'rgba(255,255,255,.1)'})},
      h('div',{style:{display:'flex',gap:14,alignItems:'center',flexWrap:'wrap'}},
        contador(i._veces,rojo),
        h('div',{style:{flex:'1 1 260px',minWidth:0,cursor:'pointer'},onClick:function(){setAbiertas(function(o){var n=Object.assign({},o);n[i.id]=!ab;return n;});}},
          h('div',{style:{fontWeight:900,fontSize:14.5}},i.mensajero),h('div',{style:{fontSize:13,color:'#d9d3bd',marginTop:2}},i.motivo),
          h('div',{style:{fontSize:11.5,color:SUAVE,marginTop:5}},'Reportado por '+Object.keys(i._quien).map(function(k){return k+(i._quien[k]>1?' ×'+i._quien[k]:'');}).join(' · ')+' · último '+hora(i._ult)+(i.comision_operador&&mul.length?' · comisión '+primer(i.comision_operador):'')),
          resumenTxt&&h('div',{style:{fontSize:12,fontWeight:800,color:ORO,marginTop:4}},resumenTxt),
          !ab&&h('div',{style:{fontSize:11,color:SUAVE,marginTop:4}},'Toca para ver los códigos')),
        h('div',{className:'ia-act',style:{marginLeft:'auto',display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}},acciones)),
      ab&&h('div',{style:{marginTop:10,borderTop:'1px solid rgba(255,255,255,.08)',paddingTop:6}},i._reps.map(function(r,idx){return h('div',{key:r.id,style:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',fontSize:12,padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,.05)',color:'#e9e4d2',opacity:r.decision==='descartada'?.55:1}},
        h('span',{style:{fontFamily:'monospace',minWidth:110,fontWeight:700}},r.codigo||'—'),h('span',{style:{color:SUAVE,minWidth:80}},hora(r.created_at)+' · '+primer(r.reportado_por)),h('span',{style:{flex:'1 1 200px',minWidth:0}},[r.cliente,tit(r.comuna),r.comentario].filter(Boolean).join(' · '),r.resuelto&&r.resolucion?h('div',{style:{fontSize:11.5,color:'#8fd3a8',marginTop:2}},'Gestionada'+(r.resuelto_por?' por '+primer(r.resuelto_por):'')+': '+r.resolucion):null),
        decChip(r),
        h('button',{type:'button',className:'ia-btn',onClick:function(ev){ev.stopPropagation();abrirVer(i,idx);},style:{padding:'5px 12px',borderRadius:8,border:'1px solid rgba(232,199,102,.5)',background:'rgba(232,199,102,.12)',color:ORO,fontWeight:900,fontSize:11.5}},'Ver'),
        accionesCodigo(i,r));}),
        i.nota&&h('div',{style:{fontSize:12,color:ORO,marginTop:6}},'Nota: '+i.nota)));}

  // 23-11-2026: informe por mensajero (PDF / HTML) con el formato de documentos TransPgso (modules/doc-pdf.js)
  function fLarga(f){var d=new Date(f+'T12:00:00');var t=d.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});return t.charAt(0).toUpperCase()+t.slice(1);}
  function dmy(f){var p=String(f).slice(0,10).split('-');return p[2]+'-'+p[1]+'-'+p[0];}
  async function informeMensajero(m,modo){
    var w=modo==='pdf'?window.open('','_blank'):null;if(w){try{w.document.write('<p style="font-family:sans-serif;padding:30px;color:#555">Preparando informe…</p>');}catch(e){}}
    try{await (A.loadScriptOnce||window.loadScriptOnce)('doc-pdf','modules/doc-pdf.js');}catch(e){if(w)w.close();toast('No se pudo cargar el generador de documentos');return;}
    var D=window.__docPDF,E=function(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
    var its=L.filter(function(i){return i.mensajero===m;}).sort(function(a,b){return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:b._veces-a._veces;});
    var rs=[];its.forEach(function(i){i._reps.forEach(function(r){rs.push(Object.assign({_i:i},r));});});
    var decTxt=function(r){if(!r.decision)return r.resuelto?'Por decidir':'Por gestionar';if(r.decision==='multa')return 'Multa '+money(r.decision_monto);if(r.decision==='multa_propuesta')return 'Multa propuesta'+(r.monto_propuesto?' '+money(r.monto_propuesto):'');return (DEC[r.decision]||[r.decision])[0];};
    var col={correctiva:'#1a6b8a',multa:'#b03030',multa_propuesta:'#c0541c',descartada:'#7a7d6a'};
    var badge=function(r){var c=r.decision?col[r.decision]||'#7a7d6a':'#a07a1a';return '<span class="estado" style="background:'+c+'">'+E(decTxt(r))+'</span>';};
    var nCor=rs.filter(function(r){return r.decision==='correctiva';}).length,mul=rs.filter(function(r){return r.decision==='multa';}),monto=mul.reduce(function(t,r){return t+(+r.decision_monto||0);},0);
    var nDes=rs.filter(function(r){return r.decision==='descartada';}).length,nPen=rs.length-nCor-mul.length-nDes;
    var desc=its.filter(function(i){return i.estado==='multa'&&i.descontado;}).reduce(function(t,i){return t+(+i.monto||0);},0);
    var periodo=fLarga(sem)+' al '+fLarga(hasta).replace(/^\w/,function(c){return c.toLowerCase();});
    // 1. por día
    var porDia=[0,1,2,3,4,5,6].map(function(k){var f=sumar(sem,k),xs=its.filter(function(i){return i.fecha===f;});var n=xs.reduce(function(t,i){return t+i._veces;},0);
      return '<tr><td style="white-space:nowrap"><b>'+E(diaLargo(f).charAt(0)+diaLargo(f).slice(1).toLowerCase())+'</b></td><td style="text-align:center;font-weight:800">'+(n||'—')+'</td><td>'+(xs.length?xs.map(function(i){return E(i.motivo)+(i._veces>1?' <b>×'+i._veces+'</b>':'');}).join('<br/>'):'<span style="color:#999">Sin incidencias</span>')+'</td></tr>';}).join('');
    // 2. por falta
    var F={};rs.forEach(function(r){var k=r._i.motivo;var x=F[k]=F[k]||{n:0,cor:0,mul:0,monto:0,des:0,pen:0};x.n++;if(r.decision==='correctiva')x.cor++;else if(r.decision==='multa'){x.mul++;x.monto+=(+r.decision_monto||0);}else if(r.decision==='descartada')x.des++;else x.pen++;});
    var porFalta=Object.keys(F).sort(function(a,b){return F[b].n-F[a].n;}).map(function(k){var x=F[k];return '<tr><td>'+E(k)+'</td><td style="text-align:center;font-weight:800">'+x.n+'</td><td>'+[x.cor?x.cor+' correctiva'+(x.cor>1?'s':''):'',x.mul?x.mul+' multa'+(x.mul>1?'s':'')+' ('+money(x.monto)+')':'',x.des?x.des+' descartada'+(x.des>1?'s':''):'',x.pen?x.pen+' pendiente'+(x.pen>1?'s':''):''].filter(Boolean).join(' · ')+'</td></tr>';}).join('');
    // 3. detalle
    var det=rs.map(function(r,ix){return '<tr><td style="color:#9a9684">'+(ix+1)+'</td><td style="white-space:nowrap">'+E(dm(r._i.fecha))+'<br/><span style="color:#888">'+E(hora(r.created_at))+' hrs</span></td><td style="font-family:JetBrains Mono,monospace;font-size:10px">'+E(r.codigo||'—')+'</td><td>'+E(r._i.motivo)+(r.comentario?'<br/><span style="color:#6b6e5c">"'+E(r.comentario)+'"</span>':'')+'</td><td>'+E([r.cliente,tit(r.comuna)].filter(Boolean).join(' · ')||'—')+'</td><td>'+E(primer(r.reportado_por)||'—')+(r.resolucion?'<br/><span style="color:#2e7d4f">'+E(r.resolucion)+'</span>':'')+'</td><td>'+badge(r)+'</td></tr>';}).join('');
    // 5. evidencia de la entrega de cada paquete afectado (23-11-2026)
    var evid='';try{var cods=[];rs.forEach(function(r){if(r.codigo&&!r._directo&&cods.indexOf(r.codigo)<0)cods.push(r.codigo);});
      if(cods.length){var EV={};for(var q=0;q<cods.length;q+=150){var rq=await A.db.from('envios').select('codigo,estado,destinatario,comuna,fotos_entrega,foto_etiqueta').in('codigo',cods.slice(q,q+150));(rq.data||[]).forEach(function(e){EV[e.codigo]=e;});}
        var pj=function(v){if(v==null)return null;if(typeof v!=='string')return v;try{var x=JSON.parse(v);return typeof x==='string'?pj(x):x;}catch(e){return null;}};
        var fotosDe=function(e){var arr=pj(e.fotos_entrega);if(!Array.isArray(arr)||!arr.length)return [];if(typeof arr[0]==='string')return arr.filter(function(u){return typeof u==='string'&&u;});
          var ints=arr.filter(function(x){return x&&typeof x==='object'&&Array.isArray(x.fotos)&&x.fotos.length;});var ul=ints[ints.length-1];return ul?ul.fotos.filter(function(u){return typeof u==='string'&&u;}):[];};
        var nf=0;evid=cods.map(function(c){var e=EV[c];var faltas=rs.filter(function(r){return r.codigo===c;}).map(function(r){return r._i.motivo;}).filter(function(v,i,arr){return arr.indexOf(v)===i;}).join(' · ');
          var head='<p style="margin:10px 0 6px"><b style="font-family:JetBrains Mono,monospace">'+E(c)+'</b> — '+E(faltas)+(e?'<br/><span style="color:#6b6e5c">'+E([tit(e.destinatario||''),tit(e.comuna||''),(A.estadoInfo&&A.estadoInfo(e.estado)||{}).label||e.estado].filter(Boolean).join(' · '))+'</span>':'')+'</p>';
          var fs=e?fotosDe(e):[];if(!fs.length&&e&&e.foto_etiqueta)fs=[e.foto_etiqueta];
          if(!fs.length)return head+'<p style="color:#999;margin:0 0 10px">Sin fotografías de entrega registradas.</p>';
          var figs=fs.slice(0,4).map(function(u,k){nf++;return '<figure><img src="'+E(u)+'" crossorigin="anonymous"/><figcaption><b>Figura '+nf+'.</b> '+E(c)+' · foto '+(k+1)+' de '+fs.length+'</figcaption></figure>';});
          var filas='';for(var k=0;k<figs.length;k+=2)filas+='<div class="figs'+(figs.length===1?' uno':'')+'">'+figs.slice(k,k+2).join('')+'</div>';
          return head+filas;}).join('');}}catch(e){evid='';}
    var notas=its.filter(function(i){return i.nota;}).map(function(i){return '<li><b>'+E(dm(i.fecha))+' · '+E(i.motivo)+':</b> '+E(i.nota)+'</li>';}).join('');
    var cuerpo=D&&'<div class="resultado" style="border-color:'+(mul.length?'#b03030':'#C8A84B')+';background:'+(mul.length?'#fdf0ee':'#FBF6E6')+'"><div class="gr" style="color:'+(mul.length?'#b03030':'#A0842A')+'">'+rs.length+' REPORTE'+(rs.length===1?'':'S')+'</div><div class="dt">'
      +its.length+' incidencia'+(its.length===1?'':'s')+' en la semana · '+nCor+' correctiva'+(nCor===1?'':'s')+' · '+mul.length+' multa'+(mul.length===1?'':'s')+(monto?' por '+money(monto):'')+(nDes?' · '+nDes+' descartada'+(nDes===1?'':'s'):'')+(nPen?' · '+nPen+' pendiente'+(nPen===1?'':'s')+' de decisión':'')+'</div></div>'
      +'<div class="sec"><h2>1. Reportes por día</h2><table class="tabla"><tr><th style="width:150px">Día</th><th style="width:70px;text-align:center">Reportes</th><th>Faltas</th></tr>'+porDia+'</table></div>'
      +'<div class="sec"><h2>2. Resumen por falta</h2><table class="tabla"><tr><th>Falta</th><th style="width:70px;text-align:center">Veces</th><th style="width:220px">Decisión</th></tr>'+(porFalta||'<tr><td colspan="3">Sin reportes</td></tr>')+'</table></div>'
      +'<div class="sec"><h2>3. Detalle de cada reporte</h2><table class="tabla"><tr><th style="width:22px">#</th><th style="width:62px">Fecha</th><th style="width:96px">Código</th><th>Falta</th><th style="width:110px">Cliente · comuna</th><th style="width:90px">Reportó</th><th style="width:96px">Decisión</th></tr>'+(det||'<tr><td colspan="7">Sin reportes</td></tr>')+'</table></div>'
      +(notas?'<div class="sec"><h2>4. Notas para el mensajero</h2><ul>'+notas+'</ul></div>':'')
      +(evid?'<div class="sec"><h2>'+(notas?'5':'4')+'. Evidencia de la entrega de cada paquete</h2>'+evid+'</div>':'');
    var nombre='Incidencias '+tit(m)+' '+dmy(sem)+' al '+dmy(hasta);
    var html=D.documentoHTML({tipo:'INFORME DE INCIDENCIAS',folio:dm(sem)+' AL '+dm(hasta),fechaDoc:dmy(hoyCL()),
      titulo:'Informe de incidencias — '+tit(m),subtitulo:'Período evaluado: '+periodo,
      metaPares:[['Mensajero',tit(m),2],['Período evaluado',dmy(sem)+' al '+dmy(hasta),2],['Incidencias',String(its.length)],['Reportes',String(rs.length)],['Correctivas',String(nCor)],['Multas',mul.length?mul.length+' · '+money(monto):'0'],['Descartadas',String(nDes)],['Pendientes de decisión',String(nPen)],['Descontado del pago',desc?money(desc):'—',2]],
      cuerpo:cuerpo,firmas:['Mensajero: '+tit(m),'TransPgso SpA · Supervisión'],
      cierre:'Las incidencias son faltas al protocolo reportadas por el equipo de operaciones y revisadas código a código. Correctiva: aviso formal sin descuento. Multa: monto fijo por falta según el Listado de incidencias vigente, que se descuenta del pago de la semana. Descartada: no hubo falta. Horarios en hora de Chile continental.',
      nombreArchivo:nombre.replace(/\s+/g,'_')});
    if(modo==='pdf'){D.abrir(w,html);try{var t0=Date.now(),iv=setInterval(function(){try{if(w.html2pdf&&w.descargarPDF){clearInterval(iv);w.descargarPDF();}else if(Date.now()-t0>15000)clearInterval(iv);}catch(e){clearInterval(iv);}},400);}catch(e){}}
    else{var b=new Blob([html],{type:'text/html'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=nombre.replace(/\s+/g,'_')+'.html';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},30000);}
  }
  // agrupar por día
  var dias={};vis.forEach(function(i){(dias[i.fecha]=dias[i.fecha]||[]).push(i);});
  var resumen=useMemo(function(){var o={};L.forEach(function(i){var x=o[i.mensajero]=o[i.mensajero]||{veces:0,inc:0,corr:0,mul:0,monto:0,pend:0,desc:0};x.inc++;x.veces+=i._veces;if(i.estado==='correctiva')x.corr++;if(i.estado==='multa'){x.mul++;x.monto+=(+i.monto||0);if(i.descontado)x.desc+=(+i.monto||0);}if(i.estado==='por_clasificar'||i.estado==='multa_propuesta')x.pend++;});
    return Object.keys(o).map(function(k){return Object.assign({m:k},o[k]);}).sort(function(a,b){return b.monto-a.monto||b.veces-a.veces;});},[incs,reps]);
  var tabB=function(k,t,n){var on=tab===k;return h('button',{key:k,type:'button',className:'ia-tab',onClick:function(){setTab(k);},style:{padding:'9px 14px',border:'none',borderBottom:'3px solid '+(on?ORO:'transparent'),background:'transparent',color:on?'#ffe59a':SUAVE,fontFamily:'Bebas Neue',fontSize:19,letterSpacing:1.2,cursor:'pointer'}},t,n?h('span',{style:{marginLeft:6,padding:'0 7px',borderRadius:999,background:'#b03030',color:'#fff',fontFamily:'DM Sans',fontSize:12,fontWeight:900}},n):null);};
  var kp=function(l,v,c,s){return h('div',{style:Object.assign({},vid,{padding:'10px 12px'})},h('div',{style:{fontSize:10,letterSpacing:1.4,textTransform:'uppercase',color:SUAVE,fontWeight:800}},l),h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,lineHeight:1.05,color:c}},v),s&&h('div',{style:{fontSize:11,color:SUAVE}},s));};
  var totVeces=L.reduce(function(s,i){return s+i._veces;},0);

  return h('div',{style:caja},h('style',null,css),
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:12,flexWrap:'wrap'}},
      h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:32,letterSpacing:2,color:'#fff',lineHeight:1}},'Incidencias'),
        h('div',{style:{fontSize:12.5,color:SUAVE,marginTop:4,maxWidth:720}},'Agrupadas por mensajero, día y título. Aquí llegan solo las piezas ya gestionadas en Operaciones → Incidencias; Luis decide código a código: correctiva, multa o descartar.'+(esSuper?'':' Tu usuario solo puede ver.'))),
      h('div',{style:{display:'flex',gap:8,alignItems:'center'}},boton('‹',function(){setSem(sumar(sem,-7));}),h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.2,color:ORO,minWidth:160,textAlign:'center'}},'Semana '+dm(sem)+' al '+dm(hasta)),boton('›',function(){setSem(sumar(sem,7));}),L.length>0&&boton('Excel',exportar))),
    h('div',{className:'ia-k',style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:14}},
      kp('Incidencias',L.length,ORO,totVeces+' reportes agrupados'),kp('Falta gestionar',nSinGest,'#e8b84a','piezas en Operaciones → Incidencias'),
      kp('Por decidir',L.filter(tieneProp).length,'#ff8a6e','gestionadas, esperando a Luis'),kp('Multas aprobadas',money(totMultas),'#ff6b57',multas.length+' multa'+(multas.length===1?'':'s')+' · '+multas.filter(function(i){return i.descontado;}).length+' descontadas')),
    h('div',{style:{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap',margin:'14px 0 10px',borderBottom:'1px solid rgba(255,255,255,.1)'}},
      tabB('prop','Por decidir',nProp),tabB('clas','Decididas'),tabB('res','Resumen por mensajero'),tabB('dash','Dashboard'),
      tab!=='res'&&tab!=='dash'&&h('div',{style:{marginLeft:'auto',display:'flex',gap:4,marginBottom:6,padding:3,borderRadius:10,background:'rgba(0,0,0,.25)',border:'1px solid rgba(255,255,255,.08)'}},[['men','Por mensajero'],['dia','Por día']].map(function(o){var on=agrupar===o[0];return h('button',{key:o[0],type:'button',onClick:function(){setAgrupar(o[0]);try{localStorage.setItem('ia_agrupar',o[0]);}catch(e){}},style:{padding:'5px 11px',borderRadius:8,border:'none',fontWeight:900,fontSize:12,cursor:'pointer',background:on?'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)':'transparent',color:on?'#1a1d13':SUAVE}},o[1]);})),
      h('input',{className:'ia-in',placeholder:'Buscar mensajero, título o código',value:q,onChange:function(e){setQ(e.target.value);},style:{marginLeft:(tab==='res'||tab==='dash')?'auto':8,width:240,padding:'6px 10px',fontSize:13,marginBottom:6}})),
    incs==null?h('div',{style:{color:SUAVE}},'Cargando…'):
    tab==='dash'?(function(){
      /* 23-11-2026: dashboard de faltas de la semana: cuáles se reportaron y su % según cuánto se repiten */
      var Lx=Lq,rs=[];Lx.forEach(function(i){i._reps.forEach(function(r){rs.push({r:r,i:i});});});
      if(!rs.length)return h('div',{style:{color:SUAVE,fontWeight:700,padding:'10px 0'}},'Sin incidencias esta semana.');
      var LVC={'Leve':'#f0cf4a','Grave':'#ff9d4d','Crítica':'#ff6b5b'};
      var F={};rs.forEach(function(x){var k=x.i.motivo||'Sin título';var f=F[k]=F[k]||{k:k,n:0,men:{},cor:0,mul:0,monto:0,des:0,pen:0,dias:{}};f.n++;f.men[x.i.mensajero]=(f.men[x.i.mensajero]||0)+1;f.dias[x.i.fecha]=(f.dias[x.i.fecha]||0)+1;
        var d=x.r.decision;if(d==='correctiva')f.cor++;else if(d==='multa'){f.mul++;f.monto+=(+x.r.decision_monto||0);}else if(d==='descartada')f.des++;else f.pen++;});
      var lista=Object.keys(F).map(function(k){return F[k];}).sort(function(a,b){return b.n-a.n;}),tot=rs.length,max=lista[0].n;
      var pct=function(n){return (Math.round(n*1000/tot)/10).toString().replace('.',',')+'%';};
      var grupo=function(k){return catGrupos[String(k).toLowerCase().trim()]||'';};
      var porNivel={};lista.forEach(function(f){var g=grupo(f.k)||'Otro';porNivel[g]=(porNivel[g]||0)+f.n;});
      var menSet={};rs.forEach(function(x){menSet[x.i.mensajero]=1;});
      var top3=lista.slice(0,3).reduce(function(t,f){return t+f.n;},0);
      var dona=function(){var acc=0,seg=lista.slice(0,6).map(function(f,ix){var c=['#e8c766','#ff9d4d','#ff6b5b','#7fb0ff','#8fe0a8','#c9a0ff'][ix];var a0=acc;acc+=f.n/tot*360;return c+' '+a0+'deg '+acc+'deg';});if(acc<360)seg.push('rgba(255,255,255,.12) '+acc+'deg 360deg');return 'conic-gradient('+seg.join(',')+')';};
      var COLS=['#e8c766','#ff9d4d','#ff6b5b','#7fb0ff','#8fe0a8','#c9a0ff'];
      return h('div',{style:{display:'flex',flexDirection:'column',gap:14}},
        h('div',{className:'ia-k',style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}},
          kp('Reportes en la semana',tot,ORO,Lx.length+' incidencias agrupadas'),
          kp('Faltas distintas',lista.length,'#ffe59a','tipos de falta reportados'),
          kp('Mensajeros con reportes',Object.keys(menSet).length,'#7fb0ff','con al menos una falta'),
          kp('Falta más repetida',pct(lista[0].n),'#ff8a6e',lista[0].k.length>48?lista[0].k.slice(0,46)+'…':lista[0].k)),
        h('div',{style:{display:'grid',gridTemplateColumns:'minmax(260px,1fr) 2.2fr',gap:14},className:'ia-dash'},
          h('div',{style:Object.assign({},vid,{padding:16,display:'flex',flexDirection:'column',alignItems:'center',gap:12})},
            h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.2,color:'#fff',alignSelf:'flex-start'}},'Reparto de faltas'),
            h('div',{style:{position:'relative',width:190,height:190,borderRadius:'50%',background:dona(),boxShadow:'0 10px 24px rgba(0,0,0,.35)'}},
              h('div',{style:{position:'absolute',inset:34,borderRadius:'50%',background:'#23271a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',boxShadow:'inset 0 2px 8px rgba(0,0,0,.5)'}},
                h('div',{style:{fontFamily:'Bebas Neue',fontSize:40,lineHeight:1,color:ORO}},tot),h('div',{style:{fontSize:10.5,fontWeight:800,letterSpacing:1.2,color:SUAVE}},'REPORTES'))),
            h('div',{style:{width:'100%',display:'flex',flexDirection:'column',gap:5}},lista.slice(0,6).map(function(f,ix){return h('div',{key:f.k,style:{display:'flex',gap:8,alignItems:'center',fontSize:12}},h('span',{style:{width:10,height:10,borderRadius:3,background:COLS[ix],flexShrink:0}}),h('span',{style:{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:TXT}},f.k),h('b',{style:{color:'#fff'}},pct(f.n)));}).concat(lista.length>6?[h('div',{key:'o',style:{fontSize:11.5,color:SUAVE}},'+ '+(lista.length-6)+' faltas más ('+pct(lista.slice(6).reduce(function(t,f){return t+f.n;},0))+')')]:[])),
            h('div',{style:{width:'100%',borderTop:'1px solid rgba(255,255,255,.08)',paddingTop:10,fontSize:12,color:SUAVE,lineHeight:1.5}},'Las 3 faltas más repetidas suman ',h('b',{style:{color:ORO}},pct(top3)),' de los reportes.'),
            Object.keys(porNivel).length>1&&h('div',{style:{width:'100%',display:'flex',gap:6,flexWrap:'wrap'}},Object.keys(porNivel).sort(function(a,b){return porNivel[b]-porNivel[a];}).map(function(g){var c=LVC[g]||'#9aa08a';return h('span',{key:g,style:{padding:'4px 10px',borderRadius:999,border:'1px solid '+c,color:c,fontSize:11.5,fontWeight:900}},g+' · '+pct(porNivel[g]));}))),
          h('div',{style:Object.assign({},vid,{padding:16})},
            h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.2,color:'#fff'}},'Faltas reportadas, de la más repetida a la menos'),h('div',{style:{fontSize:11.5,color:SUAVE}},'% sobre '+tot+' reportes')),
            lista.map(function(f,ix){var g=grupo(f.k),c=LVC[g]||ORO,nm=Object.keys(f.men).length,topM=Object.keys(f.men).sort(function(a,b){return f.men[b]-f.men[a];}).slice(0,3);
              return h('div',{key:f.k,style:{padding:'10px 0',borderTop:ix?'1px solid rgba(255,255,255,.07)':'none'}},
                h('div',{style:{display:'flex',gap:10,alignItems:'center'}},
                  h('div',{style:{width:26,fontFamily:'Bebas Neue',fontSize:20,color:SUAVE,textAlign:'right'}},ix+1),
                  h('div',{style:{flex:1,minWidth:0}},
                    h('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}},h('span',{style:{fontWeight:800,fontSize:13.5,color:'#fff'}},f.k),g&&h('span',{style:{padding:'1px 8px',borderRadius:999,fontSize:10,fontWeight:900,color:c,border:'1px solid '+c+'88'}},g.toUpperCase())),
                    h('div',{style:{position:'relative',height:14,borderRadius:7,background:'rgba(255,255,255,.07)',marginTop:6,overflow:'hidden'}},
                      h('div',{style:{width:(f.n/max*100)+'%',height:'100%',borderRadius:7,background:'linear-gradient(90deg,'+c+'aa,'+c+')',boxShadow:'0 0 10px '+c+'55'}})),
                    h('div',{style:{fontSize:11.5,color:SUAVE,marginTop:5}},nm+' mensajero'+(nm===1?'':'s')+': '+topM.map(function(m){return tit(m)+(f.men[m]>1?' ×'+f.men[m]:'');}).join(', ')+(nm>3?' y '+(nm-3)+' más':''),
                      ' · ',[f.cor?f.cor+' correctiva'+(f.cor>1?'s':''):'',f.mul?f.mul+' multa'+(f.mul>1?'s':'')+' '+money(f.monto):'',f.des?f.des+' descartada'+(f.des>1?'s':''):'',f.pen?f.pen+' por decidir':''].filter(Boolean).join(' · '))),
                  h('div',{style:{textAlign:'right',minWidth:74}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:30,lineHeight:1,color:c}},pct(f.n)),h('div',{style:{fontSize:11,fontWeight:800,color:SUAVE}},f.n+' reporte'+(f.n===1?'':'s')))));}))),
        h('div',{style:Object.assign({},vid,{padding:16,overflowX:'auto'})},
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.2,color:'#fff',marginBottom:10}},'Faltas por día'),
          h('table',{className:'ia-heat',style:{width:'100%',borderCollapse:'collapse',fontSize:12.5,background:'transparent'}},
            h('thead',null,h('tr',null,[h('th',{key:'f',style:{textAlign:'left',padding:'6px 8px',color:ORO,fontSize:10.5,letterSpacing:1.2,textTransform:'uppercase'}},'Falta')].concat([0,1,2,3,4,5,6].map(function(k){var f=sumar(sem,k),d=new Date(f+'T12:00:00');return h('th',{key:f,style:{padding:'6px 4px',color:ORO,fontSize:10.5,letterSpacing:1,textAlign:'center'}},DIAS[d.getDay()].slice(0,3).toUpperCase()+' '+d.getDate());}),[h('th',{key:'t',style:{padding:'6px 8px',color:ORO,fontSize:10.5,textAlign:'center'}},'TOTAL')]))),
            h('tbody',null,lista.map(function(f){var mx=Math.max.apply(null,Object.keys(f.dias).map(function(k){return f.dias[k];}));return h('tr',{key:f.k},
              [h('td',{key:'f',style:{padding:'6px 8px',borderTop:'1px solid rgba(255,255,255,.06)',color:TXT,maxWidth:380}},f.k)].concat([0,1,2,3,4,5,6].map(function(k){var dd=sumar(sem,k),n=f.dias[dd]||0;return h('td',{key:dd,style:{padding:4,borderTop:'1px solid rgba(255,255,255,.06)',textAlign:'center'}},h('div',{style:{margin:'0 auto',width:34,height:26,borderRadius:7,display:'grid',placeItems:'center',fontWeight:900,fontSize:12.5,color:n?'#1a1d13':'rgba(255,255,255,.25)',background:n?'rgba(232,199,102,'+(0.25+0.75*n/mx)+')':'rgba(255,255,255,.04)'}},n||'—'));}),
                [h('td',{key:'t',style:{padding:'6px 8px',borderTop:'1px solid rgba(255,255,255,.06)',textAlign:'center',fontWeight:900,color:'#fff'}},f.n)]));})))));
    })():
    tab==='res'?(resumen.length===0?h('div',{style:{color:SUAVE,fontWeight:700}},'Sin incidencias esta semana.'):h('div',{style:{overflowX:'auto'}},h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:13}},
      h('thead',null,h('tr',null,['Mensajero','Incidencias','Veces reportado','Correctivas','Multas','Monto multas','Descontado','Pendientes'].map(function(c){return h('th',{key:c,style:{textAlign:'left',padding:'8px 10px',fontSize:10.5,letterSpacing:1.2,textTransform:'uppercase',color:ORO,borderBottom:'1px solid rgba(232,199,102,.35)'}},c);}))),
      h('tbody',null,resumen.map(function(x){var td={padding:'8px 10px',borderTop:'1px solid rgba(255,255,255,.06)',color:TXT,background:'transparent'};return h('tr',{key:x.m},h('td',{style:Object.assign({},td,{fontWeight:800})},x.m),h('td',{style:td},x.inc),h('td',{style:td},x.veces),h('td',{style:td},x.corr||'—'),h('td',{style:td},x.mul||'—'),h('td',{style:Object.assign({},td,{color:x.monto?'#ff8a6e':TXT,fontWeight:800})},x.monto?money(x.monto):'—'),h('td',{style:td},x.desc?money(x.desc):'—'),h('td',{style:Object.assign({},td,{color:x.pend?'#e8b84a':TXT})},x.pend||'—'));}))))):
    vis.length===0?h('div',{style:{color:SUAVE,fontWeight:700,padding:'10px 0'}},tab==='por'?'No hay piezas por gestionar esta semana.':tab==='prop'?'No hay piezas esperando decisión.':'Sin incidencias decididas esta semana.'):
    agrupar==='dia'?Object.keys(dias).sort().map(function(f){return h('div',{key:f},h('div',{style:{fontSize:11,fontWeight:900,letterSpacing:1.6,color:ORO,margin:'12px 0 8px'}},diaLargo(f)),dias[f].sort(function(a,b){return b._veces-a._veces;}).map(tarjeta));}):
    /* 23-11-2026: vista por mensajero: nombre, total de la semana y total por día; se abre para ver las tarjetas */
    (function(){var G={};vis.forEach(function(i){(G[i.mensajero]=G[i.mensajero]||[]).push(i);});
      return Object.keys(G).map(function(m){var its=G[m],veces=its.reduce(function(t,i){return t+i._veces;},0),pd={};its.forEach(function(i){pd[i.fecha]=(pd[i.fecha]||0)+i._veces;});
        var rs=[];its.forEach(function(i){rs=rs.concat(i._reps);});
        var nCor=rs.filter(function(r){return r.decision==='correctiva';}).length,mulR=rs.filter(function(r){return r.decision==='multa';}),nPend=rs.filter(function(r){return (!r.decision)||r.decision==='multa_propuesta';}).length,nDesc=rs.filter(function(r){return r.decision==='descartada';}).length;
        return {m:m,its:its,veces:veces,pd:pd,nCor:nCor,nMul:mulR.length,monto:mulR.reduce(function(t,r){return t+(+r.decision_monto||0);},0),nPend:nPend,nDesc:nDesc};})
      .sort(function(a,b){return b.veces-a.veces||a.m.localeCompare(b.m);})
      .map(function(g){var ab=!!abMen[g.m];
        return h('div',{key:g.m,style:Object.assign({},vid,{padding:0,marginBottom:10,overflow:'hidden',borderColor:g.nPend?'rgba(224,83,63,.45)':'rgba(232,199,102,.3)'})},
          h('div',{onClick:function(){setAbMen(function(o){var n=Object.assign({},o);n[g.m]=!ab;return n;});},style:{display:'flex',gap:14,alignItems:'center',flexWrap:'wrap',padding:'12px 14px',cursor:'pointer',background:ab?'rgba(232,199,102,.07)':'transparent'}},
            contador(g.veces,g.nMul>0||g.veces>=5),
            h('div',{style:{flex:'1 1 220px',minWidth:0}},
              h('div',{style:{fontWeight:900,fontSize:15.5,color:'#fff'}},g.m),
              h('div',{style:{fontSize:12,color:SUAVE,marginTop:2}},g.its.length+' incidencia'+(g.its.length===1?'':'s')+' · '+g.veces+' reporte'+(g.veces===1?'':'s')+' en la semana'),
              h('div',{style:{fontSize:12,fontWeight:800,color:ORO,marginTop:4}},[g.nPend?g.nPend+' por decidir':'',g.nCor?g.nCor+' correctiva'+(g.nCor>1?'s':''):'',g.nMul?g.nMul+' multa'+(g.nMul>1?'s':'')+' '+money(g.monto):'',g.nDesc?g.nDesc+' descartada'+(g.nDesc>1?'s':''):''].filter(Boolean).join(' · '))),
            h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}},
              [0,1,2,3,4,5,6].map(function(k){var f=sumar(sem,k),n=g.pd[f]||0,d=new Date(f+'T12:00:00');
                return h('div',{key:f,title:diaLargo(f),style:{width:46,padding:'5px 0',borderRadius:10,textAlign:'center',background:n?'rgba(232,199,102,.16)':'rgba(255,255,255,.03)',border:'1px solid '+(n?'rgba(232,199,102,.5)':'rgba(255,255,255,.07)'),opacity:n?1:.55}},
                  h('div',{style:{fontSize:9.5,fontWeight:900,letterSpacing:.8,color:SUAVE}},DIAS[d.getDay()].slice(0,3).toUpperCase()+' '+d.getDate()),
                  h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,lineHeight:1,color:n?'#ffe59a':SUAVE}},n||'—'));})),
            h('div',{style:{display:'flex',gap:6},onClick:function(ev){ev.stopPropagation();}},boton('PDF',function(){informeMensajero(g.m,'pdf');}),boton('HTML',function(){informeMensajero(g.m,'html');})),
            h('div',{style:{fontSize:18,color:ORO,transform:ab?'rotate(90deg)':'none',transition:'transform .15s',marginLeft:4}},'›')),
          ab&&h('div',{style:{padding:'0 12px 6px',borderTop:'1px solid rgba(255,255,255,.08)'}},
            Object.keys(g.pd).sort().map(function(f){return h('div',{key:f},h('div',{style:{fontSize:11,fontWeight:900,letterSpacing:1.6,color:ORO,margin:'12px 0 8px'}},diaLargo(f)),
              g.its.filter(function(i){return i.fecha===f;}).sort(function(a,b){return b._veces-a._veces;}).map(tarjeta));})));});})(),
    ver&&verInc&&verRep&&(function(){var M=A.Modal,Card=A.EnvioDetalleCard,n=verInc._reps.length;
      var nb=function(t,d,dis){return h('button',{type:'button',className:'btn-secondary',disabled:dis,onClick:function(){mover(d);},style:{padding:'6px 14px',fontSize:12,opacity:dis?.4:1}},t);};
      var cuerpo=h('div',null,
        h('div',{style:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',padding:'10px 12px',borderRadius:12,background:'#2b2e20',color:'#f1ecda',marginBottom:12}},
          contador(n,n>=5,46),
          h('div',{style:{flex:'1 1 220px',minWidth:0}},h('div',{style:{fontWeight:900}},verInc.mensajero+' · '+diaLargo(verInc.fecha).toLowerCase()),h('div',{style:{fontSize:12.5,color:'#d9d3bd'}},verInc.motivo),
            h('div',{style:{fontSize:13,color:'#e8c766',marginTop:3,fontWeight:800}},verRep.codigo+' · '+hora(verRep.created_at)+' · reportó '+primer(verRep.reportado_por)+(verRep.comentario?' · "'+verRep.comentario+'"':''))),
          h('div',{style:{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}},decChip(verRep),accionesCodigo(verInc,verRep))),
        h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}},nb('← Anterior',-1,ver.i===0),h('span',{style:{fontSize:12,fontWeight:800,color:'var(--text-soft)'}},'Paquete '+(ver.i+1)+' de '+n),nb('Siguiente →',1,ver.i>=n-1)),
        verRep._directo?h('div',{style:{padding:16,borderRadius:12,background:'var(--cream,#fbf6e6)',border:'1px solid rgba(200,168,75,.35)'}},
          h('div',{style:{fontWeight:900,marginBottom:6}},'Reporte directo al mensajero (sin código de paquete)'),
          h('div',{style:{fontSize:13,marginBottom:8}},verRep.comentario||'Sin comentario.'),
          (verRep.evidencias||[]).length?h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}},(verRep.evidencias||[]).map(function(u,k){return h('a',{key:k,href:u,target:'_blank',rel:'noopener'},h('img',{src:u,style:{width:'100%',height:220,objectFit:'cover',borderRadius:10,border:'1px solid rgba(0,0,0,.1)'}}));})):h('div',{style:{fontSize:12,color:'var(--text-soft)'}},'Sin imágenes adjuntas.')):
        verEnv==='cargando'||!verEnv?h('div',{style:{padding:30,textAlign:'center',color:'var(--text-soft)'}},'Cargando envío…'):
        verEnv._noExiste?h('div',{style:{padding:20,textAlign:'center',color:'var(--text-soft)'}},'Este código no existe en Envíos.'):
        (Card?h(Card,{key:verEnv.codigo,envio:verEnv}):h('div',null,'No disponible')));
      return M?h(M,{title:'Evidencia · '+verRep.codigo,sub:'Decide código a código · usa ← → para avanzar',wide:true,onClose:function(){setVer(null);}},cuerpo)
        :h('div',{style:{position:'fixed',inset:0,zIndex:9990,background:'rgba(0,0,0,.6)',overflowY:'auto',padding:16},onClick:function(ev){if(ev.target===ev.currentTarget)setVer(null);}},h('div',{style:{maxWidth:900,margin:'0 auto',background:'#fff',borderRadius:16,padding:16,color:'#2b2e20'}},cuerpo));})(),
    modal&&(function(){var mm=modal,tot=mm.montos.reduce(function(s,v){return s+(+v||0);},0),faltan=mm.montos.some(function(v){return !(+v>0);});
      function setTodos(v){setModal(function(m){return Object.assign({},m,{montos:m.reps.map(function(){return String(v);})});});}
      return h('div',{style:{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.62)',display:'flex',alignItems:'center',justifyContent:'center',padding:16},onClick:function(e){if(e.target===e.currentTarget&&!busy)setModal(null);}},
      h('div',{style:Object.assign({},caja,{width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'})},
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:24,letterSpacing:1.6,color:'#fff'}},'Valor de la multa'),
        h('div',{style:{fontSize:13,marginTop:6}},h('b',null,mm.i.mensajero),' · '+diaLargo(mm.i.fecha).toLowerCase()),
        h('div',{style:{fontSize:13,color:'#d9d3bd'}},mm.i.motivo+' · ',h('b',{style:{color:'#ffe59a'}},mm.reps.length+(mm.reps.length===1?' código':' códigos'))),
        mm.reps.length>1&&h('div',{style:{display:'flex',gap:6,marginTop:12,flexWrap:'wrap',alignItems:'center'}},h('span',{style:{fontSize:11,fontWeight:900,color:ORO,letterSpacing:1}},'A TODOS:'),[1000,2000,5000,10000].map(function(v){return boton(money(v),function(){setTodos(v);});})),
        h('div',{style:{marginTop:10}},mm.reps.map(function(r,k){return h('div',{key:r.id,style:{display:'flex',gap:10,alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,.07)'}},
          h('div',{style:{flex:1,minWidth:0}},h('div',{style:{fontFamily:'monospace',fontWeight:800,fontSize:13}},r.codigo||'—'),h('div',{style:{fontSize:11.5,color:SUAVE}},[r.cliente,r.comentario].filter(Boolean).join(' · '))),
          h('input',{className:'ia-in',inputMode:'numeric',placeholder:'$',value:mm.montos[k]?'$ '+Math.round(+mm.montos[k]).toLocaleString('es-CL'):'',onChange:function(e){var v=e.target.value.replace(/\D/g,'');setModal(function(m){var a=m.montos.slice();a[k]=v;return Object.assign({},m,{montos:a});});},style:{width:130,fontSize:16,fontWeight:900}}),
          mm.reps.length===1&&h('div',{style:{display:'flex',gap:4}},[2000,5000,10000].map(function(v){return boton(money(v),function(){setTodos(v);});})));})),
        h('textarea',{className:'ia-in',rows:2,placeholder:'Nota (opcional): el mensajero la ve',value:mm.nota,onChange:function(e){var v=e.target.value;setModal(function(m){return Object.assign({},m,{nota:v});});},style:{width:'100%',marginTop:10,fontSize:13}}),
        h('div',{style:{fontSize:11.5,color:SUAVE,marginTop:8,lineHeight:1.4}},'Al aprobar: queda para descontar en el pago de la semana, el mensajero pierde el giro de la ruleta y quien reportó recibe la comisión (una por incidencia).'),
        h('div',{style:{display:'flex',gap:8,marginTop:14,justifyContent:'flex-end',flexWrap:'wrap',alignItems:'center'}},
          h('span',{style:{marginRight:'auto',fontWeight:900,color:'#ffe59a'}},'Total '+money(tot)),
          boton('Cancelar',function(){setModal(null);},null,busy),
          boton('Dejar como correctiva',function(){clasificar(mm.reps.map(function(r){return r.id;}),'correctiva',null,mm.nota);},'c',busy),
          boton(busy?'Guardando…':'Aprobar '+money(tot),function(){if(faltan){toast('Escribe el valor de cada código');return;}clasificar(mm.reps.map(function(r){return r.id;}),'multa',mm.montos.map(function(v){return Math.round(+v);}),mm.nota);},'g',busy||faltan))));})());
}
window.IncidenciasAgrupadas=IncidenciasAgrupadas;
})();
