// Guía de faltas para el mensajero (23-11-2026).
// Se abre desde Incidencias → pestaña "Guía de faltas". Mismo estilo que el video de incidencias:
// cada falta con su nivel y su descuento fijo. Los datos salen de Sistema → Listado de incidencias
// (RPC guia_faltas, solo faltas activas) y se guardan en el teléfono para verlos sin señal. Solo lectura.
(function(){
if(window.GuiaFaltasRider)return;
var R=React,h=R.createElement,useState=R.useState,useEffect=R.useEffect;
var KEY='guia_faltas_v1';
var LV={Leve:{n:1,c:'#f0cf4a',bg:'linear-gradient(180deg,#fff3b0,#e8c34a 60%,#9a7a10)',tx:'#3a2c0a',sh:'#6d5310',tit:'Faltas leves',sub:'Descuidos que se pueden evitar'},
  Grave:{n:2,c:'#ff9d4d',bg:'linear-gradient(180deg,#ffd0a0,#e8892e 60%,#8e4a10)',tx:'#3a1c05',sh:'#5e2f08',tit:'Faltas graves',sub:'Afectan al cliente y a la operación'},
  'Crítica':{n:3,c:'#ff6b5b',bg:'linear-gradient(180deg,#ffb3a6,#e0533f 60%,#8e2414)',tx:'#ffffff',sh:'#5a160c',tit:'Faltas críticas',sub:'Las más graves: rompen la confianza'}};
var SHORT={
'No enviar respaldos de salida de bodega (pantallazos Flex + Interna)':['No enviar respaldos de salida','Pantallazos de Flex y de la app interna al salir de bodega'],
'Respaldos enviados fuera de tiempo':['Respaldos fuera de tiempo','Enviarlos tarde también cuenta'],
'Retraso menor sin justificación válida':['Retraso sin justificar','Llegar tarde sin un motivo válido'],
'Entrega sin evidencia obligatoria completa (etiqueta / fachada / entrega / datos receptor)':['Entrega sin evidencia completa','Faltó etiqueta, fachada, entrega o datos de quien recibe'],
'No registrar correctamente el estado en la aplicación':['Estado mal registrado','No marcar bien el estado en la app'],
'Devolver paquete sin respaldo':['Devolver sin respaldo','Devolver un paquete sin foto ni motivo'],
'Diferencia entre paquetes retirados / entregados / devueltos':['Diferencia de paquetes','No cuadran retirados, entregados y devueltos'],
'Pérdida de encomienda por negligencia':['Pérdida por descuido','Perder una encomienda por negligencia'],
'Dejár encominedas en bodega por falta de organizacion u olvido':['Paquetes olvidados en bodega','Dejarlos por desorden u olvido. Organiza tu carga antes de salir'],
'Salir de Bodega sin el escaneo total de la Carga en ambas Apps (Pgso y Flex)':['Salir sin escanear toda la carga','Hay que escanear todo en las dos apps: Pgso y Flex'],
'Retraso de llegada a la bodega sin justificación válida':['Llegar tarde a bodega','Sin una justificación válida'],
'Devolver paquete sin respaldo de la gestion realizada':['Devolver sin respaldo','Sin evidencia de la gestión que hiciste'],
'Entregar encomienda en Pgso pero no en Envios Flex':['Entregar en Pgso y no en Flex','Cerrar la entrega en una sola app'],
'No entregar encomienda el mismo día sin justificación válida':['No entregar el mismo día','Sin una justificación válida'],
'Ocultamiento de información relevante':['Ocultar información','Esconder algo que el equipo debe saber'],
'Falsificación de entrega':['Falsificar una entrega','Marcar entregado lo que no se entregó'],
'Manipulación o alteración de evidencias':['Alterar evidencias','Manipular fotos o datos de la entrega'],
'Abandono de ruta sin justificacion avisada en tiempo correspondiente':['Abandonar la ruta','Sin avisar a tiempo y sin justificación'],
'Faltar a ruta asignada sin previo aviso':['Faltar a la ruta asignada','No presentarse sin previo aviso']};
function corto(lab){var s=SHORT[lab];if(s)return s;var m=String(lab||'').match(/^([^(]+)\(([^)]+)\)/);return m?[m[1].trim(),m[2].trim()]:[String(lab||''),''];}
function pesos(n){return '$'+Math.round(+n||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
function leer(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}}
function guardar(d){try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}
var CSS='@keyframes gfUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes gfRay{to{transform:rotate(360deg)}}@keyframes gfPop{0%{opacity:0;transform:scale(.7)}70%{transform:scale(1.06)}100%{opacity:1;transform:none}}'+
 '.gf-in{opacity:0;animation:gfUp .55s cubic-bezier(.2,.8,.2,1) forwards}.gf-pop{opacity:0;animation:gfPop .5s cubic-bezier(.2,.8,.2,1) forwards}'+
 '.gf-gold{background:linear-gradient(180deg,#fff4c9 0%,#f0cf6e 45%,#b8892c 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #4a3a10) drop-shadow(0 8px 14px rgba(0,0,0,.45))}';
function estilo(){if(document.getElementById('gf-css'))return;var s=document.createElement('style');s.id='gf-css';s.textContent=CSS;document.head.appendChild(s);}
function d(i){return {animationDelay:(i*0.06).toFixed(2)+'s'};}

function GuiaFaltasRider(props){
  estilo();
  var _d=useState(function(){return leer();}),datos=_d[0],setDatos=_d[1];
  var _e=useState(false),err=_e[0],setErr=_e[1];
  useEffect(function(){var db=(window.__app&&window.__app.db)||window.db;if(!db)return;
    db.rpc('guia_faltas').then(function(r){if(r.error||!Array.isArray(r.data)){if(!leer())setErr(true);return;}setDatos(r.data);guardar(r.data);},function(){if(!leer())setErr(true);});},[]);
  var F={Leve:[],Grave:[],'Crítica':[]};
  (datos||[]).forEach(function(c){if(F[c.grupo])F[c.grupo].push({t:corto(c.label),m:+c.monto||0});});
  Object.keys(F).forEach(function(g){F[g].sort(function(a,b){return a.m-b.m;});});
  function rango(g){var v=F[g].map(function(f){return f.m;});if(!v.length)return '';var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v);return mn===mx?pesos(mn)+' por falta':'de '+pesos(mn)+' a '+pesos(mx);}
  var k=0;
  var caja={borderRadius:18,background:'linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.02))',border:'1px solid rgba(232,199,102,.28)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.1), 0 4px 0 #0b0c07, 0 10px 18px rgba(0,0,0,.3)',padding:'14px 14px'};
  var pill=function(txt,col){return h('span',{style:{display:'inline-block',padding:'5px 14px',borderRadius:999,border:'1.5px solid '+col,color:col,fontWeight:900,fontSize:11,letterSpacing:2}},txt);};
  var titulo=function(a,b,size){return h('div',{style:{fontFamily:'Bebas Neue',fontSize:size||34,letterSpacing:1.5,lineHeight:.95,textAlign:'center'}},a&&h('span',{style:{color:'#fbf6e6'}},a),a&&b?' ':'',b&&h('span',{className:'gf-gold'},b));};
  function nivel(g){var L=LV[g];if(!F[g].length)return null;
    return h('div',{key:g,id:'gf-'+g,style:{display:'flex',flexDirection:'column',gap:8,scrollMarginTop:70}},
      h('div',{className:'gf-in',style:Object.assign({textAlign:'center',marginTop:8},d(k++))},pill('NIVEL '+L.n+' · '+g.toUpperCase(),L.c)),
      h('div',{className:'gf-in',style:Object.assign({fontFamily:'Bebas Neue',fontSize:38,letterSpacing:1.5,lineHeight:1,textAlign:'center',color:L.c,textShadow:'0 3px 0 rgba(0,0,0,.5)'},d(k++))},L.tit),
      h('div',{className:'gf-in',style:Object.assign({textAlign:'center',fontSize:13,fontWeight:700,color:'#cfc9b2',marginTop:-4},d(k++))},L.sub+' · '+rango(g)),
      F[g].map(function(f,i){return h('div',{key:i,className:'gf-in',style:Object.assign({display:'flex',alignItems:'stretch',gap:10,borderRadius:16,background:'linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02))',border:'1px solid rgba(255,255,255,.08)',boxShadow:'0 4px 0 #0b0c07',overflow:'hidden'},d(k++))},
        h('div',{style:{width:5,background:L.c,flexShrink:0}}),
        h('div',{style:{flex:1,minWidth:0,padding:'10px 0'}},
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:.8,lineHeight:1.05,color:'#fbf6e6'}},f.t[0]),
          f.t[1]&&h('div',{style:{fontSize:12,color:'#bdb8a2',marginTop:2,lineHeight:1.3}},f.t[1])),
        h('div',{style:{flexShrink:0,alignSelf:'center',margin:'8px 10px 8px 0',padding:'6px 10px',borderRadius:12,background:L.bg,color:L.tx,textAlign:'center',minWidth:86,boxShadow:'inset 0 2px 0 rgba(255,255,255,.4), 0 3px 0 '+L.sh}},
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:24,lineHeight:1}},'−'+pesos(f.m)),
          h('div',{style:{fontSize:8.5,fontWeight:900,letterSpacing:1.2}},'DESCUENTO')));}));}
  function paso(n,t,s){return h('div',{className:'gf-in',style:Object.assign({display:'flex',gap:12,alignItems:'center'},caja,d(k++))},
    h('div',{style:{width:40,height:40,borderRadius:12,flexShrink:0,display:'grid',placeItems:'center',fontFamily:'Bebas Neue',fontSize:24,color:'#1a1d13',background:'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)',boxShadow:'inset 0 2px 0 rgba(255,255,255,.5), 0 3px 0 #6d531a'}},n),
    h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:19,letterSpacing:1,color:'#fbf6e6'}},t),h('div',{style:{fontSize:12,color:'#bdb8a2'}},s)));}
  function decision(t,s,c){return h('div',{className:'gf-pop',style:Object.assign({flex:1,borderRadius:14,padding:'10px 6px',textAlign:'center',background:'rgba(0,0,0,.25)',border:'1.5px solid '+c},d(k++))},
    h('div',{style:{fontFamily:'Bebas Neue',fontSize:19,letterSpacing:1,color:c}},t),h('div',{style:{fontSize:11,color:'#cfc9b2',lineHeight:1.25,marginTop:2}},s));}
  var hayDatos=(datos||[]).length>0;
  return h('div',{style:{position:'relative',flex:1,overflowY:'auto',overflowX:'hidden',background:'radial-gradient(120% 60% at 50% 0%,#3e4430 0%,#23271a 45%,#121409 100%)',color:'#f1ecda',fontFamily:'DM Sans,sans-serif'}},
    h('div',{style:{position:'absolute',left:'50%',top:120,width:1100,height:1100,margin:'-550px 0 0 -550px',opacity:.07,background:'repeating-conic-gradient(#e8c766 0 6deg,transparent 6deg 18deg)',animation:'gfRay 60s linear infinite',pointerEvents:'none'}}),
    h('div',{style:{position:'relative',padding:'18px 14px 26px',display:'flex',flexDirection:'column',gap:12}},
      h('div',{className:'gf-in',style:Object.assign({textAlign:'center'},d(k++))},h('span',{style:{display:'inline-block',padding:'6px 16px',borderRadius:999,background:'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)',color:'#1a1d13',fontWeight:900,fontSize:11,letterSpacing:2.5,boxShadow:'0 3px 0 #6d531a'}},'REGLAMENTO DE MENSAJEROS')),
      h('div',{className:'gf-in',style:Object.assign({textAlign:'center',fontFamily:'Bebas Neue',lineHeight:.9,letterSpacing:2}, d(k++))},h('div',{className:'gf-gold',style:{fontSize:54}},'Incidencias'),h('div',{style:{fontSize:34,color:'#fbf6e6',textShadow:'0 3px 0 rgba(0,0,0,.5)'}},'y descuentos')),
      h('div',{className:'gf-in',style:Object.assign({textAlign:'center',fontSize:13.5,color:'#cfc9b2',fontWeight:700},d(k++))},'Qué es cada falta, qué tan grave es y cuánto se descuenta'),
      h('div',{className:'gf-in',style:Object.assign({},caja,d(k++))},
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:1,color:'#fbf6e6'}},'¿Qué es una ',h('span',{className:'gf-gold'},'incidencia'),'?'),
        h('div',{style:{fontSize:13,color:'#d9d3bd',marginTop:4,lineHeight:1.45}},'Es una ',h('b',{style:{color:'#fff'}},'falta al protocolo'),' que el equipo detecta y reporta. La ves al instante en ',h('b',{style:{color:'#e8c766'}},'Mis incidencias'),'.'),
        h('div',{style:{display:'flex',gap:8,marginTop:10}},
          h('div',{style:{flex:1,borderRadius:12,padding:'8px 10px',background:'rgba(232,199,102,.1)',border:'1px solid rgba(232,199,102,.3)',fontSize:12,color:'#f1ecda',lineHeight:1.35}},h('b',{style:{color:'#e8c766'}},'Monto fijo por falta'),h('br'),'igual para todos los mensajeros'),
          h('div',{style:{flex:1,borderRadius:12,padding:'8px 10px',background:'rgba(232,199,102,.1)',border:'1px solid rgba(232,199,102,.3)',fontSize:12,color:'#f1ecda',lineHeight:1.35}},h('b',{style:{color:'#e8c766'}},'Cada multa se suma'),h('br'),'y se resta de tu pago de la semana'))),
      h('div',{className:'gf-in',style:Object.assign({display:'flex',gap:8,justifyContent:'center'},d(k++))},['Leve','Grave','Crítica'].map(function(g){return h('button',{key:g,type:'button',onClick:function(){var el=document.getElementById('gf-'+g);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},style:{padding:'7px 14px',borderRadius:999,border:'1.5px solid '+LV[g].c,background:'rgba(0,0,0,.25)',color:LV[g].c,fontWeight:900,fontSize:12,letterSpacing:1.5,cursor:'pointer'}},g.toUpperCase());})),
      !hayDatos&&h('div',{style:Object.assign({textAlign:'center',color:'#cfc9b2',fontSize:13},caja)},err?'No se pudo cargar la guía. Revisa tu señal.':'Cargando…'),
      hayDatos&&['Leve','Grave','Crítica'].map(nivel),
      h('div',{className:'gf-in',style:Object.assign({marginTop:10},d(k++))},titulo('¿Qué pasa','después?',34)),
      paso(1,'Se reporta','El equipo registra la falta con su código'),
      paso(2,'La ves en tu app','En Mis incidencias, al momento'),
      paso(3,'Se revisa','Supervisión verifica cada paquete'),
      h('div',{className:'gf-in',style:Object.assign({},caja,d(k++))},
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:19,letterSpacing:1,color:'#fbf6e6',marginBottom:8}},'4 · La decisión'),
        h('div',{style:{display:'flex',gap:8}},decision('Correctiva','Aviso formal, sin descuento','#a9c8ff'),decision('Multa','Se descuenta de tu pago','#ff8f80'),decision('Descartada','No hubo falta, no pasa nada','#8fe0a8'))),
      h('div',{className:'gf-in',style:Object.assign({borderRadius:18,padding:'14px',background:'linear-gradient(180deg,#4a3a17,#2a2110)',border:'1px solid rgba(232,199,102,.5)',boxShadow:'0 4px 0 #0b0c07'},d(k++))},
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:24,letterSpacing:1.2,color:'#f7dd8c'}},'Ojo con la ruleta'),
        h('div',{style:{fontSize:13,color:'#f1ecda',lineHeight:1.45,marginTop:2}},'Una ',h('b',null,'correctiva'),' o una ',h('b',null,'multa'),' en la semana te deja sin giro. Con 0 incidencias puedes girar el martes.')),
      h('div',{style:{textAlign:'center',fontSize:13,fontWeight:700,color:'#cfc9b2',padding:'6px 0 4px'}},'¿Dudas? Pregúntale a tu supervisor')));
}
window.GuiaFaltasRider=GuiaFaltasRider;
})();
