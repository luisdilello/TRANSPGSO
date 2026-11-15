// Sistema → Errores de la app (15-11-2026). Lo que falla en los celulares de los mensajeros y en el
// panel queda en errores_app (ver window.__logErr en index.html). Acá se ve agrupado por tipo de
// error para detectar problemas antes de que el mensajero avise. Admin y superadmin.
(function(){
var A=window.__app||{};var db=A.db;var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo;
var ORO='#e8c766',TXT='#f1ecda',SUAVE='rgba(233,228,210,.65)',VERDE='#36c47f',ROJO='#ff5a5a',NAR='#ff9d5c',AZUL='#5b8def';
var caja={borderRadius:20,background:'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 50%,#15180f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 18px 38px rgba(20,22,15,.25), inset 0 1px 0 rgba(255,255,255,.07)',color:TXT};
var vid={borderRadius:14,background:'linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.1)'};
var css='.ea-btn{transition:filter .12s;cursor:pointer}.ea-btn:hover{filter:brightness(1.1)}.ea-in{padding:7px 10px;border-radius:10px;border:1px solid rgba(232,199,102,.4);background:rgba(255,255,255,.95);font-size:13px;color:#1a1d13;outline:none}'+
 '.ea-g{border-top:1px solid rgba(255,255,255,.07)}.ea-g:hover{background:rgba(232,199,102,.04)}@media (max-width:760px){.ea-k{grid-template-columns:repeat(2,1fr)!important}}';
var TIPOS={error_js:['Error de código',ROJO],promesa:['Error de código',ROJO],pantalla:['Pantalla caída',ROJO],pantalla_colecta:['Colecta caída',ROJO],cola_offline:['No sincroniza',NAR],cola_trabada:['Cola trabada',NAR],
  foto_storage:['Foto no subió',AZUL],video_storage:['Video no subió',AZUL],aviso_mensajero:['Aviso al mensajero',ORO]};
function tipoInfo(t){return TIPOS[t]||[t,'#9aa08a'];}
function hace(s){var m=Math.round((Date.now()-new Date(s))/60000);if(m<1)return 'recién';if(m<60)return 'hace '+m+' min';var hh=Math.round(m/60);if(hh<24)return 'hace '+hh+' h';return 'hace '+Math.round(hh/24)+' d';}
function fh(s){return new Date(s).toLocaleString('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}
// agrupa mensajes iguales salvo números/códigos
function firma(e){return e.tipo+'|'+String(e.mensaje||'').replace(/\d{4,}/g,'#').replace(/intento \d+/,'intento #').replace(/https?:\S+/g,'URL').slice(0,160);}
function disp(ua){ua=String(ua||'');var m=ua.match(/Android [\d.]+|iPhone OS [\d_]+|Windows NT [\d.]+|Mac OS X [\d_]+/);return m?m[0].replace(/_/g,'.').replace('iPhone OS','iOS').replace('Windows NT 10.0','Windows'):(ua.slice(0,30)||'—');}
function Chip(p){return h('span',{style:{display:'inline-flex',alignItems:'center',gap:6,padding:'3px 10px',borderRadius:999,background:p.c+'26',border:'1px solid '+p.c+'90',color:'#fff',fontSize:11.5,fontWeight:800,whiteSpace:'nowrap'}},h('span',{style:{width:7,height:7,borderRadius:'50%',background:p.c,boxShadow:'0 0 6px '+p.c}}),p.t);}
function btn(t,on,x){return h('button',{type:'button',className:'ea-btn',onClick:on,style:Object.assign({padding:'7px 13px',borderRadius:10,border:'1px solid rgba(232,199,102,.4)',background:'rgba(255,255,255,.06)',color:TXT,fontWeight:800,fontSize:12.5,whiteSpace:'nowrap'},x||{})},t);}

function ErroresApp(props){
  var toast=props.toast||function(){};
  var _d=useState(7),dias=_d[0],setDias=_d[1];
  var _r=useState(null),rows=_r[0],setRows=_r[1];
  var _app=useState('todas'),fApp=_app[0],setFApp=_app[1];
  var _u=useState(''),fUsr=_u[0],setFUsr=_u[1];
  var _res=useState(false),verRes=_res[0],setVerRes=_res[1];
  var _ab=useState(null),abierto=_ab[0],setAbierto=_ab[1];
  async function cargar(){
    var desde=new Date(Date.now()-dias*864e5).toISOString();var out=[],from=0;
    try{for(;;){var r=await db.from('errores_app').select('*').gte('created_at',desde).order('created_at',{ascending:false}).range(from,from+999);if(r.error)throw r.error;out=out.concat(r.data||[]);if(!r.data||r.data.length<1000||out.length>=5000)break;from+=1000;}
      setRows(out);}catch(e){toast('No se pudo cargar: '+(e.message||e));setRows([]);}
  }
  useEffect(function(){cargar();var t=setInterval(cargar,60000);return function(){clearInterval(t);};},[dias]);
  var lista=(rows||[]).filter(function(e){if(!verRes&&e.resuelto)return false;if(fApp!=='todas'&&e.app!==fApp)return false;if(fUsr&&e.usuario!==fUsr)return false;return true;});
  var grupos=useMemo(function(){var g={};lista.forEach(function(e){var k=firma(e);var x=g[k]=g[k]||{k:k,tipo:e.tipo,mensaje:e.mensaje,items:[],usuarios:{},ultimo:e.created_at,resuelto:true};
    x.items.push(e);if(e.usuario)x.usuarios[e.usuario]=(x.usuarios[e.usuario]||0)+1;if(e.created_at>x.ultimo)x.ultimo=e.created_at;if(!e.resuelto)x.resuelto=false;});
    return Object.keys(g).map(function(k){return g[k];}).sort(function(a,b){return a.resuelto-b.resuelto||b.ultimo.localeCompare(a.ultimo);});},[rows,fApp,fUsr,verRes]);
  var usuarios=useMemo(function(){var o={};(rows||[]).forEach(function(e){if(e.usuario)o[e.usuario]=1;});return Object.keys(o).sort();},[rows]);
  var dia=Date.now()-864e5,abiertos=(rows||[]).filter(function(e){return !e.resuelto;});
  var k24=abiertos.filter(function(e){return new Date(e.created_at)>dia;}).length;
  var mensAf={};abiertos.forEach(function(e){if(e.app==='rider'&&e.usuario)mensAf[e.usuario]=1;});
  var cola=abiertos.filter(function(e){return e.tipo==='cola_offline'||e.tipo==='cola_trabada';}).length;
  var fotos=abiertos.filter(function(e){return e.tipo==='foto_storage'||e.tipo==='video_storage';}).length;
  async function resolver(g,valor){
    var ids=g.items.map(function(e){return e.id;});var u=(A.perfil&&A.perfil.nombre)||'';
    for(var i=0;i<ids.length;i+=200){var r=await db.from('errores_app').update({resuelto:valor,resuelto_por:valor?u:null,resuelto_at:valor?new Date().toISOString():null}).in('id',ids.slice(i,i+200));if(r.error){toast('Error: '+r.error.message);return;}}
    toast(valor?'Marcado como resuelto':'Reabierto');cargar();
  }
  var kp=function(l,v,c,s){return h('div',{key:l,style:Object.assign({},vid,{padding:'12px 14px'})},h('div',{style:{fontSize:10.5,letterSpacing:1.5,textTransform:'uppercase',color:SUAVE,fontWeight:800}},l),
    h('div',{style:{fontFamily:'Bebas Neue',fontSize:32,lineHeight:1.05,color:c,textShadow:'0 0 14px '+c+'55'}},v),s&&h('div',{style:{fontSize:11.5,color:SUAVE}},s));};
  return h('div',{style:{display:'flex',flexDirection:'column',gap:16}},h('style',null,css),
    h('div',{style:Object.assign({},caja,{padding:'18px 20px'})},
      h('div',{style:{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'flex-start'}},
        h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:32,letterSpacing:2.4,color:'#fff',lineHeight:1}},'Errores de la app'),
          h('div',{style:{fontSize:12.5,color:SUAVE,marginTop:4}},'Lo que falla en los celulares de los mensajeros y en el panel, registrado solo. Se actualiza cada minuto.')),
        h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}},[[1,'24 h'],[7,'7 días'],[30,'30 días']].map(function(o){var act=dias===o[0];return h('button',{key:o[0],type:'button',className:'ea-btn',onClick:function(){setDias(o[0]);},style:{padding:'6px 12px',borderRadius:999,border:'1px solid '+(act?'#f7dd8c':'rgba(255,255,255,.14)'),background:act?'rgba(232,199,102,.2)':'transparent',color:TXT,fontWeight:800,fontSize:12}},o[1]);}),btn('Actualizar',cargar))),
      h('div',{className:'ea-k',style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:14}},
        kp('Últimas 24 h',k24,k24?ROJO:VERDE,'errores sin resolver'),
        kp('Mensajeros afectados',Object.keys(mensAf).length,Object.keys(mensAf).length?NAR:VERDE,'en el período'),
        kp('No sincroniza',cola,cola?NAR:VERDE,'entregas o colectas en cola'),
        kp('Fotos/videos',fotos,fotos?AZUL:VERDE,'no subieron al almacenamiento'))),
    h('div',{style:Object.assign({},caja,{padding:0,overflow:'hidden'})},
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',padding:'14px 18px'}},
        h('select',{className:'ea-in',value:fApp,onChange:function(e){setFApp(e.target.value);}},[['todas','Todas las apps'],['rider','App mensajero'],['panel','Panel'],['portal','Portal cliente']].map(function(o){return h('option',{key:o[0],value:o[0]},o[1]);})),
        h('select',{className:'ea-in',value:fUsr,onChange:function(e){setFUsr(e.target.value);}},h('option',{value:''},'Todos los usuarios'),usuarios.map(function(u){return h('option',{key:u,value:u},u);})),
        h('label',{style:{display:'flex',alignItems:'center',gap:6,fontSize:12.5,color:SUAVE,fontWeight:700}},h('input',{type:'checkbox',checked:verRes,onChange:function(e){setVerRes(e.target.checked);}}),'Ver resueltos'),
        h('span',{style:{marginLeft:'auto',fontSize:12,color:SUAVE}},grupos.length+' tipos de error · '+lista.length+' registros')),
      rows==null?h('div',{style:{padding:'20px 18px',color:SUAVE}},'Cargando…'):
      grupos.length===0?h('div',{style:{padding:'20px 18px',color:'#7fe3a8',fontWeight:800}},'Sin errores en el período.'):
      grupos.map(function(g){var ti=tipoInfo(g.tipo),open=abierto===g.k,us=Object.keys(g.usuarios);
        return h('div',{key:g.k,className:'ea-g',style:{opacity:g.resuelto?.55:1}},
          h('div',{onClick:function(){setAbierto(open?null:g.k);},style:{display:'flex',gap:12,alignItems:'center',padding:'12px 18px',cursor:'pointer',flexWrap:'wrap'}},
            h('div',{style:{fontFamily:'Bebas Neue',fontSize:26,minWidth:46,textAlign:'center',color:ti[1]}},g.items.length),
            h('div',{style:{flex:'1 1 320px',minWidth:0}},h('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}},h(Chip,{t:ti[0],c:ti[1]}),g.resuelto&&h(Chip,{t:'Resuelto',c:VERDE}),h('span',{style:{fontSize:11.5,color:SUAVE}},hace(g.ultimo))),
              h('div',{style:{fontSize:13,fontWeight:700,marginTop:5,wordBreak:'break-word'}},g.mensaje),
              h('div',{style:{fontSize:11.5,color:SUAVE,marginTop:3}},us.length?us.slice(0,6).map(function(u){return u+(g.usuarios[u]>1?' ('+g.usuarios[u]+')':'');}).join(' · ')+(us.length>6?' · +'+(us.length-6):''):'Sin usuario identificado')),
            h('div',{onClick:function(e){e.stopPropagation();}},g.resuelto?btn('Reabrir',function(){resolver(g,false);}):btn('Marcar resuelto',function(){resolver(g,true);},{borderColor:VERDE+'99'}))),
          open&&h('div',{style:{padding:'0 18px 14px 76px'}},g.items.slice(0,40).map(function(e){return h('div',{key:e.id,style:Object.assign({},vid,{padding:'10px 12px',marginBottom:8,fontSize:12})},
            h('div',{style:{display:'flex',gap:12,flexWrap:'wrap',color:SUAVE}},h('b',{style:{color:TXT}},fh(e.ocurrido_at||e.created_at)),h('span',null,e.usuario||'—'),h('span',null,e.app||''),h('span',null,disp(e.dispositivo)),
              h('span',null,e.online===false?'sin señal':'con señal'),e.cola_pendiente!=null&&h('span',null,'cola: '+e.cola_pendiente),e.codigo&&h('span',{style:{color:ORO,fontWeight:800}},'código '+e.codigo),h('span',null,'v'+(e.version||'?'))),
            e.mensaje!==g.mensaje&&h('div',{style:{marginTop:6}},e.mensaje),
            e.detalle&&h('pre',{style:{margin:'8px 0 0',whiteSpace:'pre-wrap',wordBreak:'break-word',fontFamily:'JetBrains Mono, monospace',fontSize:11,color:'rgba(241,236,218,.75)',maxHeight:180,overflow:'auto'}},e.detalle));}),
            g.items.length>40&&h('div',{style:{fontSize:12,color:SUAVE}},'+'+(g.items.length-40)+' más'))); }))
  );
}
window.ErroresApp=ErroresApp;
})();
