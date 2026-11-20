// Seguimiento de mensajeros (20-11-2026).
// El admin marca mensajeros desde Centro de control → En ruta ahora → Por mensajero (botón "Seguir").
// Cada 60 s se consulta seguimiento_mensajeros() y se avisa (aviso en pantalla + sonido + notificación del navegador) cuando:
//  - lleva X minutos sin entregar teniendo paquetes en ruta,
//  - su GPS no se actualiza hace X minutos,
//  - está detenido en el mismo lugar X minutos sin gestionar nada,
//  - acumula N gestiones seguidas sin entregar (reprogramado/cancelado),
//  - terminó su ruta.
// Lo que se sigue y los umbrales quedan guardados en este navegador. Solo lectura: no escribe nada en la base.
(function(){
if(window.SegMens)return;
var A=window.__app||{},db=A.db,R=React,h=R.createElement;
var KEY='seg_mens_v1';
var DEF={sinEntrega:10,sinGps:10,quieto:15,racha:3,terminar:true,sonido:true};
function leer(){try{var o=JSON.parse(localStorage.getItem(KEY)||'{}');return {mens:Array.isArray(o.mens)?o.mens:[],cfg:Object.assign({},DEF,o.cfg||{}),desde:o.desde||{},dia:o.dia||null};}catch(e){return {mens:[],cfg:Object.assign({},DEF),desde:{}};}}
var S=leer();
function guardar(){try{localStorage.setItem(KEY,JSON.stringify({mens:S.mens,cfg:S.cfg,desde:S.desde,dia:S.dia}));}catch(e){}}
var subs=[];function emit(){subs.forEach(function(f){try{f();}catch(e){}});}
var datos={},alertas=[],estadoAlerta={},posHist={},enRutaPrev={},timer=null,abierto=false;
function norm(n){return String(n||'').replace(/,\s*/g,' ').trim().toUpperCase();}
function tit(n){return String(n||'').toLowerCase().replace(/\b\w/g,function(c){return c.toUpperCase();});}
function minDesde(iso,ahora){if(!iso)return null;return Math.floor((ahora-new Date(iso).getTime())/60000);}
function distM(a,b){var R6=6371000,t=Math.PI/180;var dLa=(b.lat-a.lat)*t,dLo=(b.lng-a.lng)*t;var x=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(a.lat*t)*Math.cos(b.lat*t)*Math.sin(dLo/2)*Math.sin(dLo/2);return 2*R6*Math.asin(Math.sqrt(x));}
function hoy(){return new Date().toLocaleDateString('en-CA',{timeZone:'America/Santiago'});}

function beep(){if(!S.cfg.sonido)return;try{var C=window.AudioContext||window.webkitAudioContext;if(!C)return;var c=window.__segAC||(window.__segAC=new C());[0,0.18].forEach(function(t,i){var o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=i?1046:784;g.gain.setValueAtTime(0.0001,c.currentTime+t);g.gain.exponentialRampToValueAtTime(0.25,c.currentTime+t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+t+0.16);o.connect(g);g.connect(c.destination);o.start(c.currentTime+t);o.stop(c.currentTime+t+0.18);});}catch(e){}}
function notificar(titulo,cuerpo,tipo,men){
  var a={id:Date.now()+Math.random(),t:Date.now(),titulo:titulo,cuerpo:cuerpo,tipo:tipo,men:men,visto:false};
  alertas.unshift(a);alertas=alertas.slice(0,40);beep();
  try{if(window.Notification&&Notification.permission==='granted'){var n=new Notification(titulo,{body:cuerpo,tag:'seg-'+men+'-'+tipo,icon:'logo.jpg'});n.onclick=function(){window.focus();abierto=true;emit();};}}catch(e){}
  toasts.push(a);setTimeout(function(){toasts=toasts.filter(function(x){return x!==a;});emit();},12000);emit();
}
var toasts=[];
function avisoUnaVez(men,tipo,activo,titulo,cuerpo){var k=men+'|'+tipo;if(activo){if(!estadoAlerta[k]){estadoAlerta[k]=true;notificar(titulo,cuerpo,tipo,men);}}else estadoAlerta[k]=false;}

function evaluar(d){
  var ahora=new Date(d.ahora||Date.now()).getTime(),m=d.mensajero,c=S.cfg,nom=tit(m);
  var desde=S.desde[m]?new Date(S.desde[m]).getTime():ahora;
  // posición
  if(d.lat!=null&&d.lng!=null&&d.gps_at){var L=posHist[m]=posHist[m]||[];var last=L[L.length-1];if(!last||last.at!==d.gps_at)L.push({lat:+d.lat,lng:+d.lng,at:d.gps_at,t:new Date(d.gps_at).getTime()});while(L.length>90)L.shift();}
  var enRuta=+d.en_ruta||0;
  // 1) sin entregar
  var refE=Math.max(d.ult_entrega?new Date(d.ult_entrega).getTime():0,desde);
  var minSinE=Math.floor((ahora-refE)/60000);
  avisoUnaVez(m,'sinEntrega',enRuta>0&&c.sinEntrega>0&&minSinE>=c.sinEntrega,nom+': '+minSinE+' min sin entregar','Tiene '+enRuta+' paquete'+(enRuta===1?'':'s')+' en ruta. Última entrega: '+(d.ult_entrega?new Date(d.ult_entrega).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Santiago'}):'ninguna hoy')+'.');
  // 2) sin GPS
  var minGps=minDesde(d.gps_at,ahora);
  avisoUnaVez(m,'sinGps',enRuta>0&&c.sinGps>0&&(minGps==null||minGps>=c.sinGps),nom+': sin señal GPS',minGps==null?'No hay ubicación registrada hoy.':'Su ubicación no se actualiza hace '+minGps+' min.');
  // 3) detenido
  var quieto=false,minQ=0,L2=posHist[m]||[];
  if(enRuta>0&&c.quieto>0&&L2.length>=2){var fin=L2[L2.length-1];var ini=null;for(var i=L2.length-1;i>=0;i--){if(distM(L2[i],fin)>150)break;ini=L2[i];}
    if(ini){minQ=Math.floor((fin.t-ini.t)/60000);var gest=d.ult_gestion?new Date(d.ult_gestion).getTime():0;quieto=minQ>=c.quieto&&gest<ini.t&&(ahora-fin.t)<c.quieto*60000;}}
  avisoUnaVez(m,'quieto',quieto,nom+': detenido '+minQ+' min','Lleva '+minQ+' min en el mismo lugar sin gestionar paquetes.');
  // 4) racha sin entregar
  var u=Array.isArray(d.ultimas)?d.ultimas:[];var racha=0;for(var j=0;j<u.length;j++){if(u[j]==='entregado')break;racha++;}
  avisoUnaVez(m,'racha',c.racha>0&&racha>=c.racha,nom+': '+racha+' sin entregar seguidas','Sus últimas '+racha+' gestiones fueron reprogramadas o canceladas.');
  // 5) terminó
  if(c.terminar&&enRutaPrev[m]>0&&enRuta===0)notificar(nom+' terminó su ruta',(+d.entregados||0)+' entregados hoy · '+(+d.no_entregados||0)+' no entregados.','fin',m);
  enRutaPrev[m]=enRuta;
  d._minSinE=enRuta>0?minSinE:null;d._minGps=minGps;d._racha=racha;d._quieto=quieto?minQ:0;
  d._alerta=enRuta>0&&((c.sinEntrega&&minSinE>=c.sinEntrega)||(c.sinGps&&(minGps==null||minGps>=c.sinGps))||quieto)||(c.racha&&racha>=c.racha);
}
function consultar(){
  if(!S.mens.length||!db)return;
  db.rpc('seguimiento_mensajeros',{p_mens:S.mens}).then(function(r){if(r.error||!Array.isArray(r.data))return;var nd={};r.data.forEach(function(d){evaluar(d);nd[d.mensajero]=d;});datos=nd;emit();},function(){});
}
function arrancar(){if(timer)return;consultar();timer=setInterval(consultar,60000);}
function parar(){if(timer){clearInterval(timer);timer=null;}}
function pedirPermiso(){try{if(window.Notification&&Notification.permission==='default')Notification.requestPermission();}catch(e){}}
var API={
  esta:function(n){return S.mens.indexOf(norm(n))>=0;},
  toggle:function(n){n=norm(n);if(!n)return;var i=S.mens.indexOf(n);if(i>=0){S.mens.splice(i,1);delete S.desde[n];delete datos[n];Object.keys(estadoAlerta).forEach(function(k){if(k.indexOf(n+'|')===0)delete estadoAlerta[k];});}else{S.mens.push(n);S.desde[n]=new Date().toISOString();pedirPermiso();}
    S.dia=hoy();guardar();if(S.mens.length){parar();arrancar();}else parar();emit();},
  lista:function(){return S.mens.slice();},
  sub:function(f){subs.push(f);return function(){subs=subs.filter(function(x){return x!==f;});};}
};
window.SegMens=API;

// ── Panel flotante ──
var K={oro:'#e8c766',txt:'#f1ecda',sub:'rgba(233,228,210,.7)',rojo:'#ff8f80',verde:'#8fe0a8',ambar:'#f7c55a'};
var caja={background:'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 50%,#15180f 100%)',border:'1px solid rgba(200,168,75,.45)',boxShadow:'0 18px 38px rgba(0,0,0,.45)',color:K.txt,borderRadius:16,fontFamily:'inherit'};
function hace(m){return m==null?'—':m<1?'recién':m<60?'hace '+m+' min':'hace '+Math.floor(m/60)+' h '+(m%60)+' min';}
function Panel(){
  var _f=R.useState(0),setF=_f[1];R.useEffect(function(){return API.sub(function(){setF(function(x){return x+1;});});},[]);
  var _c=R.useState(false),verCfg=_c[0],setVerCfg=_c[1];
  if(!S.mens.length&&!toasts.length)return null;
  var nAl=S.mens.filter(function(m){return datos[m]&&datos[m]._alerta;}).length;
  var cfgIn=function(k,lab,suf){return h('label',{key:k,style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,fontSize:12.5,fontWeight:700,color:K.sub,padding:'4px 0'}},lab,
    h('span',null,h('input',{type:'number',min:0,value:S.cfg[k],onChange:function(e){S.cfg[k]=Math.max(0,+e.target.value||0);guardar();emit();},style:{width:56,padding:'4px 6px',borderRadius:7,border:'1px solid rgba(200,168,75,.4)',background:'rgba(0,0,0,.3)',color:K.txt,fontWeight:800,textAlign:'center',fontFamily:'inherit'}}),' '+suf));};
  return h('div',null,
    h('div',{style:{position:'fixed',right:16,bottom:16,zIndex:99998,display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end',maxWidth:'calc(100vw - 32px)'}},
      toasts.slice(-3).map(function(a){var col=a.tipo==='fin'?K.verde:a.tipo==='racha'||a.tipo==='quieto'?K.ambar:K.rojo;
        return h('div',{key:a.id,onClick:function(){abierto=true;toasts=toasts.filter(function(x){return x!==a;});emit();},style:Object.assign({},caja,{width:330,maxWidth:'100%',padding:'12px 14px',borderLeft:'4px solid '+col,cursor:'pointer'})},
          h('div',{style:{fontWeight:900,fontSize:13.5,color:col}},a.titulo),h('div',{style:{fontSize:12.5,color:K.sub,marginTop:3,lineHeight:1.4}},a.cuerpo));}),
      S.mens.length>0&&(abierto?
        h('div',{style:Object.assign({},caja,{width:360,maxWidth:'100%',maxHeight:'70vh',display:'flex',flexDirection:'column',overflow:'hidden'})},
          h('div',{style:{display:'flex',alignItems:'center',gap:8,padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,.08)'}},
            h('div',{style:{flex:1}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:1.4,color:K.oro,lineHeight:1}},'Seguimiento'),h('div',{style:{fontSize:11.5,color:K.sub,fontWeight:700,marginTop:2}},S.mens.length+' mensajero'+(S.mens.length>1?'s':'')+' · se revisa cada minuto')),
            h('button',{type:'button',onClick:function(){setVerCfg(!verCfg);},style:{border:'1px solid rgba(200,168,75,.4)',background:verCfg?'rgba(232,199,102,.2)':'rgba(255,255,255,.06)',color:K.txt,borderRadius:8,padding:'5px 9px',fontSize:11.5,fontWeight:800,cursor:'pointer'}},'Avisos'),
            h('button',{type:'button',onClick:function(){abierto=false;emit();},style:{border:'1px solid rgba(255,255,255,.18)',background:'rgba(255,255,255,.06)',color:K.txt,borderRadius:8,width:28,height:28,cursor:'pointer',fontSize:15}},'×')),
          verCfg&&h('div',{style:{padding:'8px 14px',borderBottom:'1px solid rgba(255,255,255,.08)',background:'rgba(0,0,0,.2)'}},
            cfgIn('sinEntrega','Avisar si no entrega en','min'),cfgIn('sinGps','Avisar si el GPS no se actualiza en','min'),cfgIn('quieto','Avisar si está detenido','min'),cfgIn('racha','Avisar tras no entregas seguidas','gest.'),
            h('label',{style:{display:'flex',justifyContent:'space-between',fontSize:12.5,fontWeight:700,color:K.sub,padding:'4px 0'}},'Avisar cuando termine la ruta',h('input',{type:'checkbox',checked:!!S.cfg.terminar,onChange:function(e){S.cfg.terminar=e.target.checked;guardar();emit();}})),
            h('label',{style:{display:'flex',justifyContent:'space-between',fontSize:12.5,fontWeight:700,color:K.sub,padding:'4px 0'}},'Sonido',h('input',{type:'checkbox',checked:!!S.cfg.sonido,onChange:function(e){S.cfg.sonido=e.target.checked;guardar();emit();}})),
            window.Notification&&Notification.permission!=='granted'&&h('button',{type:'button',onClick:function(){try{Notification.requestPermission().then(emit);}catch(e){}},style:{marginTop:6,width:'100%',padding:'7px',borderRadius:8,border:'1px solid #f7dd8c',background:'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)',color:'#1a1d13',fontWeight:900,fontSize:12,cursor:'pointer'}},'Activar notificaciones del navegador'),
            h('div',{style:{fontSize:10.5,color:'rgba(233,228,210,.5)',marginTop:4}},'0 = no avisar. Los avisos funcionan mientras el sistema esté abierto en alguna pestaña.')),
          h('div',{style:{overflowY:'auto',padding:'8px 10px'}},
            S.mens.map(function(m){var d=datos[m];var al=d&&d._alerta;
              return h('div',{key:m,style:{padding:'9px 10px',borderRadius:11,marginBottom:6,background:al?'rgba(255,143,128,.12)':'rgba(255,255,255,.05)',border:'1px solid '+(al?'rgba(255,143,128,.45)':'transparent')}},
                h('div',{style:{display:'flex',alignItems:'center',gap:8}},
                  h('span',{style:{width:9,height:9,borderRadius:'50%',background:!d?'#777':al?K.rojo:(+d.en_ruta?K.verde:K.oro),boxShadow:'0 0 6px currentColor',flexShrink:0}}),
                  h('b',{style:{flex:1,fontSize:13.5}},tit(m)),
                  d&&h('span',{style:{fontFamily:'Bebas Neue',fontSize:20,lineHeight:1}},String(+d.en_ruta||0),h('span',{style:{fontSize:11,color:K.sub,fontFamily:'inherit',fontWeight:700}},' en ruta')),
                  h('button',{type:'button',title:'Dejar de seguir',onClick:function(){API.toggle(m);},style:{border:'none',background:'none',color:'rgba(233,228,210,.5)',cursor:'pointer',fontSize:14}},'×')),
                d?h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 10px',fontSize:11.5,color:K.sub,fontWeight:700,marginTop:5,paddingLeft:17}},
                  h('span',null,'Entregados hoy: ',h('b',{style:{color:K.txt}},+d.entregados||0)),
                  h('span',null,'No entregados: ',h('b',{style:{color:K.txt}},+d.no_entregados||0)),
                  h('span',{style:{color:d._minSinE!=null&&S.cfg.sinEntrega&&d._minSinE>=S.cfg.sinEntrega?K.rojo:K.sub}},'Últ. entrega: '+(d.ult_entrega?hace(minDesde(d.ult_entrega,Date.now())):'ninguna')),
                  h('span',{style:{color:S.cfg.sinGps&&(d._minGps==null||d._minGps>=S.cfg.sinGps)?K.rojo:K.sub}},'GPS: '+hace(d._minGps)),
                  d._quieto>0&&h('span',{style:{color:K.ambar,gridColumn:'1 / -1'}},'Detenido hace '+d._quieto+' min'),
                  d._racha>=2&&h('span',{style:{color:K.ambar,gridColumn:'1 / -1'}},d._racha+' gestiones seguidas sin entregar'),
                  d.lat!=null&&h('a',{href:'https://www.google.com/maps?q='+d.lat+','+d.lng,target:'_blank',rel:'noopener',style:{color:K.oro,gridColumn:'1 / -1',textDecoration:'none',fontWeight:800}},'Ver ubicación en el mapa')):
                h('div',{style:{fontSize:11.5,color:K.sub,paddingLeft:17,marginTop:4}},'Consultando…'));}),
            alertas.length>0&&h('div',{style:{marginTop:8,paddingTop:8,borderTop:'1px solid rgba(255,255,255,.08)'}},
              h('div',{style:{fontSize:10.5,fontWeight:900,letterSpacing:1.2,textTransform:'uppercase',color:K.oro,marginBottom:4}},'Últimos avisos'),
              alertas.slice(0,10).map(function(a){return h('div',{key:a.id,style:{fontSize:11.5,color:K.sub,padding:'3px 0'}},h('b',{style:{color:K.txt}},new Date(a.t).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',hour12:false})+' '),a.titulo);}))))
        :h('button',{type:'button',onClick:function(){abierto=true;emit();},style:Object.assign({},caja,{padding:'10px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontWeight:900,fontSize:13})},
          h('span',{style:{width:10,height:10,borderRadius:'50%',background:nAl?K.rojo:K.verde,boxShadow:'0 0 8px '+(nAl?K.rojo:K.verde)}}),
          'Siguiendo '+S.mens.length,nAl?h('span',{style:{color:K.rojo}},' · '+nAl+' con alerta'):null))));
}
function montar(){if(document.getElementById('seg-mens-root'))return;var el=document.createElement('div');el.id='seg-mens-root';document.body.appendChild(el);
  if(ReactDOM.createRoot)ReactDOM.createRoot(el).render(h(Panel));else ReactDOM.render(h(Panel),el);}
// Un día nuevo empieza limpio
if(S.dia&&S.dia!==hoy()){S.mens=[];S.desde={};guardar();}
if(document.body)montar();else document.addEventListener('DOMContentLoaded',montar);
if(S.mens.length)arrancar();
})();
