// Administración → Ruleta de incentivos (16-11-2026). Único bono por efectividad.
// Superadmin configura premios, probabilidades y requisitos (tabla ruleta_config, privada).
// Superadmin y Administración ven quién calificó cada semana, qué ganó y marcan el premio entregado.
(function(){
var A=window.__app||{};var db=A.db;var h=React.createElement,useState=React.useState,useEffect=React.useEffect;
var ORO='#e8c766',TXT='#f1ecda',SUAVE='rgba(233,228,210,.65)',VERDE='#36c47f',ROJO='#ff5a5a',NAR='#ff9d5c';
var COPA={leyenda:['Leyenda','#ffd84d'],podio:['Podio','#f2cf5b'],oro:['Oro','#e8c766'],plata:['Plata','#d6dbe2'],bronce:['Bronce','#c9824a'],hierro:['Hierro','#8a8275']};
var TIPOS=[['dinero','Dinero (extra en el pago)'],['consumo','Consumo en el local'],['bencina','Bencina'],['comodin','Comodín (anula 1 incidencia)'],['especie','Especie (polera, gorro…)'],['otro','Otro']];
var caja={borderRadius:20,background:'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 50%,#15180f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 18px 38px rgba(20,22,15,.25), inset 0 1px 0 rgba(255,255,255,.07)',color:TXT,padding:'18px 20px'};
var vid={borderRadius:14,background:'linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.1)'};
function money(n){var v=Math.round(+n||0);return '$'+v.toLocaleString('es-CL');}
function pad(n){return (n<10?'0':'')+n;}
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function lunesDe(s){var d=new Date(String(s).slice(0,10)+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d);}
function sumar(s,n){var d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return iso(d);}
function dm(s){var p=String(s).slice(0,10).split('-');return p[2]+'-'+p[1];}
function hoy(){return A.fechaHoyCL?A.fechaHoyCL():iso(new Date());}
var css='.ra-in{padding:7px 9px;border-radius:9px;border:1px solid rgba(232,199,102,.4);background:rgba(255,255,255,.95);font-size:13px;color:#1a1d13;outline:none;box-sizing:border-box}'+
 '.ra-tab{width:100%;border-collapse:collapse;font-size:12.5px}.ra-tab th{text-align:left;padding:8px 10px;font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:#e8c766;border-bottom:1px solid rgba(232,199,102,.35);white-space:nowrap}'+
 '.ra-tab td{padding:8px 10px;border-top:1px solid rgba(255,255,255,.06);color:#f1ecda;background:transparent!important;vertical-align:middle}@media (max-width:760px){.ra-k{grid-template-columns:repeat(2,1fr)!important}}';

function RuletaAdmin(props){
  var toast=props.toast||function(m){alert(m);},esSuper=!!props.esSuper;
  var _c=useState(null),cfg=_c[0],setCfg=_c[1];var _e=useState(null),ed=_e[0],setEd=_e[1];
  var _s=useState(sumar(lunesDe(hoy()),-7)),sem=_s[0],setSem=_s[1];
  var _f=useState(null),filas=_f[0],setFilas=_f[1];var _g=useState([]),giros=_g[0],setGiros=_g[1];
  function cargarCfg(){db.from('ruleta_config').select('valor').eq('id',1).maybeSingle().then(function(r){if(r&&r.data)setCfg(r.data.valor);});}
  function cargarSem(){setFilas(null);
    db.rpc('ruleta_semana_panel',{p_lunes:sem}).then(function(r){if(r.error){toast('No se pudo cargar la semana: '+r.error.message);setFilas([]);return;}setFilas(r.data||[]);});
    db.from('ruleta_giros').select('*').eq('semana',sem).then(function(r){if(!r.error)setGiros(r.data||[]);});}
  useEffect(cargarCfg,[]);
  useEffect(function(){cargarSem();var st=A.intervaloVisible?A.intervaloVisible(cargarSem,300000,['envios'],15000):null;return function(){if(typeof st==='function')st();};},[sem]);
  var gPor={};giros.forEach(function(g){gPor[String(g.mensajero).toUpperCase().trim()]=g;});
  var F=filas||[],calif=F.filter(function(x){return x.cumple;});
  var dinero=giros.filter(function(g){return g.tipo==='dinero';}).reduce(function(s,g){return s+(+g.monto||0);},0);
  var porEntregar=giros.filter(function(g){return !g.entregado;}).length;
  var esActual=sem===lunesDe(hoy());
  async function marcar(g,v){var quien='';try{var u=await db.auth.getUser();quien=(u.data&&u.data.user&&u.data.user.email)||'';}catch(e){}
    var r=await db.from('ruleta_giros').update({entregado:v,entregado_por:v?quien:null,entregado_at:v?new Date().toISOString():null}).eq('id',g.id);if(r.error){toast('No se pudo guardar: '+r.error.message);return;}cargarSem();}
  function exportar(){var rows=F.map(function(x){var g=gPor[x.mensajero];return [x.mensajero,x._ent,x._tot,x.efectividad,x.cumple_inc?'No':'Sí',x.cumple?'Sí':'No',g?g.premio_detalle||g.premio_nombre:'',g&&g.tipo==='dinero'?Math.round(g.monto):'',g?(g.entregado?'Sí':'No'):''];});
    A.exportToExcel('RULETA SEMANA '+dm(sem)+' AL '+dm(sumar(sem,6)),[{name:'Ruleta',headers:['Mensajero','Entregados','Asignados','Efectividad %','Incidencias a descuento','Califica','Premio','Monto extra','Entregado'],rows:rows}]);}
  // configuración
  function abrirEd(){setEd(JSON.parse(JSON.stringify(cfg)));}
  function updP(i,k,v){setEd(function(o){var n=Object.assign({},o);n.premios=o.premios.map(function(p,j){return j===i?Object.assign({},p,(function(){var x={};x[k]=v;return x;})()):p;});return n;});}
  async function guardarCfg(){var tot=ed.premios.reduce(function(s,p){return s+(+p.prob||0);},0);if(Math.abs(tot-100)>0.01){toast('Las probabilidades deben sumar 100% (ahora suman '+tot+'%).');return;}
    var v=Object.assign({},ed,{min_efectividad:+ed.min_efectividad,min_entregas:Math.round(+ed.min_entregas),premios:ed.premios.map(function(p){return Object.assign({},p,{monto:Math.round(+p.monto||0),prob:+p.prob||0});})});
    var r=await db.from('ruleta_config').update({valor:v,updated_at:new Date().toISOString()}).eq('id',1);if(r.error){toast('No se pudo guardar: '+r.error.message);return;}setEd(null);toast('Ruleta actualizada');cargarCfg();cargarSem();}
  var btn=function(t,on,prim,st){return h('button',{type:'button',onClick:on,style:Object.assign({padding:'7px 13px',borderRadius:10,fontWeight:900,fontSize:12.5,whiteSpace:'nowrap',cursor:'pointer',border:'1px solid '+(prim?'#f7dd8c':'rgba(232,199,102,.45)'),background:prim?'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)':'rgba(255,255,255,.06)',color:prim?'#1a1d13':TXT,boxShadow:prim?'0 3px 0 #6d531a':'none'},st||{})},t);};
  var chip=function(t,c){return h('span',{style:{display:'inline-block',padding:'2px 9px',borderRadius:999,fontSize:11,fontWeight:900,background:c+'22',color:c,border:'1px solid '+c+'55',whiteSpace:'nowrap'}},t);};
  var kp=function(l,v,c,s){return h('div',{style:Object.assign({},vid,{padding:'10px 12px'})},h('div',{style:{fontSize:10,letterSpacing:1.4,textTransform:'uppercase',color:SUAVE,fontWeight:800}},l),h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,lineHeight:1.05,color:c}},v),s&&h('div',{style:{fontSize:11,color:SUAVE}},s));};
  var costoGiro=cfg?cfg.premios.reduce(function(s,p){return s+(+p.prob||0)/100*(+p.monto||0);},0):0;

  return h('div',{style:{display:'flex',flexDirection:'column',gap:16}},h('style',null,css),
    h('div',{style:caja},
      h('div',{style:{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'flex-start'}},
        h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:32,letterSpacing:2.2,color:'#fff',lineHeight:1}},'Ruleta de incentivos'),
          h('div',{style:{fontSize:12.5,color:SUAVE,marginTop:4,maxWidth:720}},'Único bono por efectividad. Cada semana (lunes a domingo) gira quien termina en Copa de Oro o mejor, con la efectividad mínima, sin incidencias y sobre el mínimo oculto de entregas. Se gira desde la app desde el martes siguiente. El mensajero no ve las probabilidades ni el mínimo.')),
        h('div',{style:{display:'flex',alignItems:'center',gap:8}},btn('‹',function(){setSem(sumar(sem,-7));}),
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:21,letterSpacing:1.2,color:ORO,minWidth:150,textAlign:'center'}},dm(sem)+' al '+dm(sumar(sem,6))),btn('›',function(){setSem(sumar(sem,7));}))),
      cfg&&h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginTop:10,fontSize:12.5,color:SUAVE}},
        chip(cfg.activa?'Activa':'Apagada',cfg.activa?VERDE:'#9aa08a'),chip(cfg.visible?'Visible para mensajeros':'Oculta para mensajeros',cfg.visible?VERDE:NAR),
        h('span',null,'Meta: Copa de Oro o mejor · '+cfg.min_efectividad+'% de efectividad · mínimo oculto '+cfg.min_entregas+' entregados · '+(cfg.sin_incidencias!==false?'sin incidencias a descuento':'incidencias permitidas')+(cfg.desde?' · desde la semana del '+dm(cfg.desde):'')+' · se abre el '+(['','lunes','martes','miércoles','jueves','viernes','sábado','domingo'][cfg.dia_apertura||2]||'martes')),
        h('span',{style:{marginLeft:'auto'}},'Costo promedio por giro: ',h('b',{style:{color:ORO}},money(costoGiro))),
        esSuper&&btn('Configurar',abrirEd,true)),
      h('div',{className:'ra-k',style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:14}},
        kp(esActual?'Califican por ahora':'Calificaron',filas==null?'…':calif.length,ORO,esActual?'semana en curso':'de '+F.length+' con envíos'),
        kp('Giraron',giros.length,VERDE,esActual?'giran desde el lunes':(calif.length-giros.length>0?(calif.length-giros.length)+' sin girar aún':'todos giraron')),
        kp('Extra en dinero',money(dinero),NAR,'a sumar al pago'),
        kp('Premios por entregar',porEntregar,porEntregar?ROJO:VERDE,porEntregar?'marcar al entregar':'todo entregado'))),
    h('div',{style:Object.assign({},caja,{padding:0,overflow:'hidden'})},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 18px 8px'}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.4,color:'#fff'}},'Mensajeros de la semana'),F.length>0&&btn('Excel',exportar)),
      filas==null?h('div',{style:{padding:'14px 18px',color:SUAVE}},'Cargando…'):F.length===0?h('div',{style:{padding:'14px 18px',color:SUAVE}},'Sin envíos esa semana.'):
      h('div',{style:{overflowX:'auto'}},h('table',{className:'ra-tab'},h('thead',null,h('tr',null,['#','Mensajero','Copa','Entregados','Efectividad','Incidencias','Califica','Premio','Entregado'].map(function(c){return h('th',{key:c},c);}))),
        h('tbody',null,F.slice().sort(function(a,b){return (a.posicion||999)-(b.posicion||999);}).map(function(x){var g=gPor[x.mensajero];var motivo=x.cumple?'':(!x.cumple_copa?'copa':!x.cumple_ef?'efectividad':!x.cumple_vol?'mínimo de entregas':!x.cumple_inc?'incidencias':'fecha de inicio');var cp=COPA[x.nivel]||COPA.hierro;
          return h('tr',{key:x.mensajero,style:{opacity:x.cumple?1:.62}},h('td',{style:{color:SUAVE}},x.posicion||'—'),h('td',{style:{fontWeight:800}},x.mensajero),h('td',null,chip(cp[0],cp[1])),h('td',null,x._ent+' / '+x._tot),
            h('td',{style:{fontWeight:800,color:x.cumple_ef?'#7fe3a8':'#ff8a8a'}},x.efectividad+'%'),h('td',null,x.cumple_inc?'—':chip('Con descuento',ROJO)),
            h('td',null,x.cumple?chip('Sí',VERDE):chip('No · '+motivo,'#9aa08a')),
            h('td',null,g?h('span',{style:{fontWeight:800,color:ORO}},g.premio_detalle||g.premio_nombre):(x.cumple&&!esActual?h('span',{style:{color:SUAVE}},'Aún no gira'):'—')),
            h('td',null,g?h('label',{style:{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}},h('input',{type:'checkbox',checked:!!g.entregado,onChange:function(e){marcar(g,e.target.checked);},style:{width:17,height:17,accentColor:'#C8A84B'}}),g.entregado?'Entregado':'Pendiente'):'—'));}))))),
    ed&&h('div',{style:{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.62)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'24px 12px',overflowY:'auto'},onClick:function(e){if(e.target===e.currentTarget)setEd(null);}},
      h('div',{style:Object.assign({},caja,{width:'100%',maxWidth:860})},
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:24,letterSpacing:1.6,color:'#fff',marginBottom:10}},'Configurar ruleta'),
        h('div',{style:{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end',marginBottom:12}},
          h('label',{style:{display:'flex',alignItems:'center',gap:6,fontWeight:800,fontSize:13}},h('input',{type:'checkbox',checked:!!ed.visible,onChange:function(e){var v=e.target.checked;setEd(function(o){return Object.assign({},o,{visible:v});});},style:{width:18,height:18,accentColor:'#C8A84B'}}),'Visible para los mensajeros'),
          h('label',{style:{display:'flex',alignItems:'center',gap:6,fontWeight:800,fontSize:13}},h('input',{type:'checkbox',checked:!!ed.activa,onChange:function(e){var v=e.target.checked;setEd(function(o){return Object.assign({},o,{activa:v});});},style:{width:18,height:18,accentColor:'#C8A84B'}}),'Ruleta activa'),
          [['min_efectividad','Efectividad mínima %',90],['min_entregas','Mínimo de entregados',90]].map(function(f){return h('label',{key:f[0],style:{fontSize:10.5,fontWeight:900,letterSpacing:1,color:ORO,display:'flex',flexDirection:'column',gap:4}},f[1].toUpperCase(),h('input',{className:'ra-in',type:'number',value:ed[f[0]],onChange:function(e){var v=e.target.value;setEd(function(o){var n=Object.assign({},o);n[f[0]]=v;return n;});},style:{width:f[2]+60}}));}),
          h('label',{style:{fontSize:10.5,fontWeight:900,letterSpacing:1,color:ORO,display:'flex',flexDirection:'column',gap:4}},'VÁLIDA DESDE LA SEMANA DEL',h('input',{className:'ra-in',type:'date',value:ed.desde||'',onChange:function(e){var v=e.target.value?lunesDe(e.target.value):'';setEd(function(o){return Object.assign({},o,{desde:v});});}})),
          h('label',{style:{display:'flex',alignItems:'center',gap:6,fontWeight:800,fontSize:13}},h('input',{type:'checkbox',checked:ed.sin_incidencias!==false,onChange:function(e){var v=e.target.checked;setEd(function(o){return Object.assign({},o,{sin_incidencias:v});});},style:{width:18,height:18,accentColor:'#C8A84B'}}),'Sin incidencias a descuento')),
        h('div',{style:{overflowX:'auto'}},h('table',{className:'ra-tab'},h('thead',null,h('tr',null,['Color','En la ruleta','Detalle que ve el mensajero','Tipo','Monto / costo','Prob. %',''].map(function(c,i){return h('th',{key:i},c);}))),
          h('tbody',null,ed.premios.map(function(p,i){return h('tr',{key:p.id||i},
            h('td',null,h('input',{type:'color',value:p.color||'#C8A84B',onChange:function(e){updP(i,'color',e.target.value);},style:{width:36,height:30,border:'none',background:'none'}})),
            h('td',null,h('input',{className:'ra-in',value:p.nombre||'',maxLength:10,onChange:function(e){updP(i,'nombre',e.target.value);},style:{width:100}})),
            h('td',null,h('input',{className:'ra-in',value:p.detalle||'',onChange:function(e){updP(i,'detalle',e.target.value);},style:{width:230}})),
            h('td',null,h('select',{className:'ra-in',value:p.tipo,onChange:function(e){updP(i,'tipo',e.target.value);}},TIPOS.map(function(t){return h('option',{key:t[0],value:t[0]},t[1]);}))),
            h('td',null,h('input',{className:'ra-in',type:'number',value:p.monto,onChange:function(e){updP(i,'monto',e.target.value);},style:{width:100}})),
            h('td',null,h('input',{className:'ra-in',type:'number',step:'0.5',value:p.prob,onChange:function(e){updP(i,'prob',e.target.value);},style:{width:70}})),
            h('td',null,ed.premios.length>2&&btn('Quitar',function(){setEd(function(o){return Object.assign({},o,{premios:o.premios.filter(function(x,j){return j!==i;})});});},false,{padding:'4px 9px',fontSize:11.5})));})))),
        (function(){var tot=ed.premios.reduce(function(s,p){return s+(+p.prob||0);},0),cg=ed.premios.reduce(function(s,p){return s+(+p.prob||0)/100*(+p.monto||0);},0);
          return h('div',{style:{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',marginTop:10,fontSize:13}},
            btn('Agregar premio',function(){setEd(function(o){return Object.assign({},o,{premios:o.premios.concat([{id:'p'+Date.now(),nombre:'Nuevo',detalle:'',tipo:'otro',monto:0,prob:0,color:'#5b8def'}])});});}),
            h('span',{style:{fontWeight:900,color:Math.abs(tot-100)<0.01?'#7fe3a8':'#ff8a8a'}},'Probabilidades: '+tot+'% '+(Math.abs(tot-100)<0.01?'(cuadra)':'(debe sumar 100%)')),
            h('span',{style:{color:SUAVE}},'Costo promedio por giro: ',h('b',{style:{color:ORO}},money(cg))),
            h('div',{style:{marginLeft:'auto',display:'flex',gap:8}},btn('Cancelar',function(){setEd(null);}),btn('Guardar',guardarCfg,true)));})()))
  );
}
window.RuletaAdmin=RuletaAdmin;
})();
