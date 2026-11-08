// Centro de control 3D del Dashboard (08-11-2026).
// Dos vistas en Three.js sobre los envíos del período filtrado:
//  - Mapa 3D de comunas: torres hexagonales ubicadas geográficamente; altura = envíos, color = efectividad operativa.
//  - Flujo de estados: silos por estado y partículas que viajan Bodega → En ruta → Entregado / Reprogramado / Cancelado.
// Solo lectura: no escribe nada en la base.
(function(){
if(window.__dash3d)return;
var R=React,h=R.createElement;
function cargarThree(){
  if(window.THREE)return Promise.resolve(window.THREE);
  if(window.__threeP)return window.__threeP;
  window.__threeP=new Promise(function(res,rej){var s=document.createElement('script');s.src='vendor/three-0.149.0.min.js';s.onload=function(){window.THREE?res(window.THREE):rej(new Error('three'));};s.onerror=function(){window.__threeP=null;rej(new Error('three'));};document.head.appendChild(s);});
  return window.__threeP;
}
function norm(s){return String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
// Coordenadas aproximadas (centro) de las comunas de la RM.
var COORD={
'SANTIAGO':[-33.4489,-70.6693],'PROVIDENCIA':[-33.4314,-70.6093],'LAS CONDES':[-33.4080,-70.5670],'VITACURA':[-33.3900,-70.5900],
'LO BARNECHEA':[-33.3500,-70.5180],'NUNOA':[-33.4569,-70.5975],'LA REINA':[-33.4450,-70.5400],'PENALOLEN':[-33.4870,-70.5410],
'MACUL':[-33.4920,-70.5990],'LA FLORIDA':[-33.5220,-70.5880],'PUENTE ALTO':[-33.6110,-70.5750],'SAN JOAQUIN':[-33.4950,-70.6280],
'SAN MIGUEL':[-33.4970,-70.6510],'PEDRO AGUIRRE CERDA':[-33.4900,-70.6780],'LO ESPEJO':[-33.5200,-70.6890],'LA CISTERNA':[-33.5300,-70.6630],
'EL BOSQUE':[-33.5620,-70.6760],'SAN RAMON':[-33.5370,-70.6420],'LA GRANJA':[-33.5370,-70.6230],'LA PINTANA':[-33.5830,-70.6340],
'SAN BERNARDO':[-33.5920,-70.7050],'ESTACION CENTRAL':[-33.4590,-70.6980],'CERRILLOS':[-33.4960,-70.7160],'MAIPU':[-33.5100,-70.7570],
'QUINTA NORMAL':[-33.4280,-70.6970],'LO PRADO':[-33.4440,-70.7250],'PUDAHUEL':[-33.4400,-70.7600],'CERRO NAVIA':[-33.4250,-70.7400],
'RENCA':[-33.4050,-70.7280],'QUILICURA':[-33.3600,-70.7300],'CONCHALI':[-33.3840,-70.6750],'HUECHURABA':[-33.3670,-70.6330],
'RECOLETA':[-33.4060,-70.6400],'INDEPENDENCIA':[-33.4160,-70.6650],'COLINA':[-33.2030,-70.6750],'LAMPA':[-33.2850,-70.8760],
'PADRE HURTADO':[-33.5670,-70.8150],'PENAFLOR':[-33.6060,-70.8760],'TALAGANTE':[-33.6650,-70.9300],'CALERA DE TANGO':[-33.6300,-70.7700],
'PIRQUE':[-33.6350,-70.5500],'BUIN':[-33.7320,-70.7420],'SAN JOSE DE MAIPO':[-33.6420,-70.3520],'EL MONTE':[-33.6800,-71.0200],
'ISLA DE MAIPO':[-33.7500,-70.9000],'TILTIL':[-33.0830,-70.9270],'PAINE':[-33.8070,-70.7400]};
var ALIAS={'STGO':'SANTIAGO','SANTIAGO CENTRO':'SANTIAGO','MAIPO':'MAIPU','EST CENTRAL':'ESTACION CENTRAL','PAC':'PEDRO AGUIRRE CERDA'};
function coordDe(c){var n=norm(c);n=ALIAS[n]||n;return COORD[n]?{n:n,c:COORD[n]}:null;}
function efColor(T,ef){
  if(ef==null)return new T.Color('#8a8f78');
  var a=new T.Color('#e0473f'),b=new T.Color('#e8b84a'),c=new T.Color('#36c47f');
  var t=Math.max(0,Math.min(1,(ef-0.9)/0.1));
  return t<0.5?a.lerp(b,t*2):b.lerp(c,(t-0.5)*2);
}
function titulo(s){return s.toLowerCase().replace(/(^|\s)\S/g,function(x){return x.toUpperCase();});}

// ── Motor común: renderer + cámara orbital + bucle con pausa ──
function crearEscena(T,cont,opts){
  var W=cont.clientWidth||800,H=cont.clientHeight||420;
  var ren=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  ren.setPixelRatio(Math.min(2,window.devicePixelRatio||1));ren.setSize(W,H);
  if(T.ColorManagement)T.ColorManagement.legacyMode=false;
  ren.outputEncoding=T.sRGBEncoding;ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;
  ren.toneMapping=T.ACESFilmicToneMapping;ren.toneMappingExposure=1.15;
  cont.appendChild(ren.domElement);ren.domElement.style.display='block';ren.domElement.style.cursor='grab';
  var sc=new T.Scene();sc.fog=new T.Fog(0x15180f,opts.fogNear||70,opts.fogFar||150);
  var cam=new T.PerspectiveCamera(38,W/H,0.1,400);
  var orb={az:opts.az||-0.6,pol:opts.pol||0.95,r:opts.r||60,tAz:null,auto:true,target:new T.Vector3(opts.tx||0,opts.ty||0,opts.tz||0)};
  function ubicar(){var sp=Math.sin(orb.pol);cam.position.set(orb.target.x+orb.r*sp*Math.sin(orb.az),orb.r*Math.cos(orb.pol),orb.target.z+orb.r*sp*Math.cos(orb.az));cam.lookAt(orb.target);}
  ubicar();
  sc.add(new T.HemisphereLight(0xfff4d6,0x1c2014,0.75));
  var sol=new T.DirectionalLight(0xffffff,1.25);sol.position.set(30,60,25);sol.castShadow=true;sol.shadow.mapSize.set(2048,2048);
  var sh=sol.shadow.camera;sh.left=-45;sh.right=45;sh.top=45;sh.bottom=-45;sh.far=160;sc.add(sol);
  var rim=new T.DirectionalLight(0xc8a84b,0.55);rim.position.set(-40,20,-30);sc.add(rim);
  // arrastre / zoom
  var drag=null,el=ren.domElement;
  function down(e){drag={x:e.clientX,y:e.clientY,az:orb.az,pol:orb.pol};orb.auto=false;el.style.cursor='grabbing';el.setPointerCapture&&el.setPointerCapture(e.pointerId);}
  function move(e){if(drag){orb.az=drag.az-(e.clientX-drag.x)*0.008;orb.pol=Math.max(0.25,Math.min(1.35,drag.pol-(e.clientY-drag.y)*0.006));ubicar();}if(opts.onMove)opts.onMove(e);}
  function up(){drag=null;el.style.cursor='grab';}
  function wheel(e){e.preventDefault();orb.r=Math.max(opts.rMin||22,Math.min(opts.rMax||110,orb.r*(e.deltaY>0?1.08:0.93)));ubicar();}
  el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointerleave',function(e){up();opts.onLeave&&opts.onLeave(e);});
  el.addEventListener('wheel',wheel,{passive:false});
  var vivo=true,visible=true,raf=0,t0=performance.now(),tick=null;
  var io=window.IntersectionObserver?new IntersectionObserver(function(en){visible=en[0].isIntersecting;if(visible&&!raf)loop();}):null;io&&io.observe(cont);
  function loop(){raf=0;if(!vivo||!visible||document.hidden)return;var t=(performance.now()-t0)/1000;
    if(orb.auto){orb.az+=0.0012;ubicar();}
    tick&&tick(t);ren.render(sc,cam);raf=requestAnimationFrame(loop);}
  function vis(){if(!document.hidden&&!raf)loop();}
  document.addEventListener('visibilitychange',vis);
  var ro=window.ResizeObserver?new ResizeObserver(function(){var w=cont.clientWidth,hh=cont.clientHeight;if(!w||!hh)return;ren.setSize(w,hh);cam.aspect=w/hh;cam.updateProjectionMatrix();}):null;ro&&ro.observe(cont);
  el.addEventListener('webglcontextlost',function(e){e.preventDefault();opts.onLost&&opts.onLost();});
  return{T:T,ren:ren,sc:sc,cam:cam,orb:orb,ubicar:ubicar,setTick:function(f){tick=f;},start:loop,
    destroy:function(){vivo=false;cancelAnimationFrame(raf);io&&io.disconnect();ro&&ro.disconnect();document.removeEventListener('visibilitychange',vis);
      sc.traverse(function(o){o.geometry&&o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){m.map&&m.map.dispose();m.dispose();});}});
      ren.dispose();ren.domElement.remove();}};
}
function proyectar(E,v,cont){var p=v.clone().project(E.cam);return{x:(p.x+1)/2*cont.clientWidth,y:(1-p.y)/2*cont.clientHeight,vis:p.z<1};}
function suelo(T,sc,rad){
  var g=new T.Mesh(new T.CircleGeometry(rad,96),new T.MeshStandardMaterial({color:0x23271b,roughness:0.95,metalness:0.05}));
  g.rotation.x=-Math.PI/2;g.receiveShadow=true;sc.add(g);
  var grid=new T.PolarGridHelper(rad,16,8,96,0xc8a84b,0xc8a84b);grid.material.transparent=true;grid.material.opacity=0.13;grid.position.y=0.02;sc.add(grid);
  var anillo=new T.Mesh(new T.RingGeometry(rad-0.25,rad,128),new T.MeshBasicMaterial({color:0xc8a84b,transparent:true,opacity:0.5,side:T.DoubleSide}));anillo.rotation.x=-Math.PI/2;anillo.position.y=0.03;sc.add(anillo);
  return anillo;
}

// ── Vista 1: mapa de comunas ──
function montarMapa(T,cont,datos,ui){
  var tip=ui.tip,labels=ui.labels;
  var meshes=[],ray=new T.Raycaster(),ptr=new T.Vector2(),hov=null;
  var E=crearEscena(T,cont,{r:66,pol:0.9,az:-0.5,ty:2,rMin:24,rMax:120,onLost:ui.onLost,
    onMove:function(e){var b=E.ren.domElement.getBoundingClientRect();ptr.x=(e.clientX-b.left)/b.width*2-1;ptr.y=-(e.clientY-b.top)/b.height*2+1;
      ray.setFromCamera(ptr,E.cam);var hit=ray.intersectObjects(meshes)[0];var m=hit?hit.object:null;
      if(hov&&hov!==m){hov.material.emissiveIntensity=hov.userData.ei;hov.scale.x=hov.scale.z=1;}
      hov=m;if(m){m.material.emissiveIntensity=0.65;m.scale.x=m.scale.z=1.12;var d=m.userData.d;
        tip.style.display='block';tip.style.left=(e.clientX-b.left+14)+'px';tip.style.top=(e.clientY-b.top+14)+'px';
        tip.innerHTML='<div style="font-family:Bebas Neue;font-size:20px;letter-spacing:1px;color:#ffe59a">'+titulo(d.n)+'</div>'
          +'<div style="font-size:12px;opacity:.85;margin-bottom:6px">'+d.total.toLocaleString('es-CL')+' envíos · efectividad '+(d.ef==null?'—':Math.round(d.ef*100)+'%')+'</div>'
          +[['Entregados',d.entregado,'#36c47f'],['En ruta',d.en_ruta,'#e8b84a'],['Reprogramados',d.reprogramado,'#b06ad6'],['Cancelados',d.cancelado,'#e0473f'],['En bodega',d.en_bodega,'#4aa3c8']]
            .filter(function(x){return x[1];}).map(function(x){return '<div style="display:flex;justify-content:space-between;gap:18px;font-size:12px"><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:'+x[2]+';margin-right:6px"></i>'+x[0]+'</span><b>'+x[1]+'</b></div>';}).join('');
      }else tip.style.display='none';},
    onLeave:function(){tip.style.display='none';}});
  suelo(T,E.sc,40);
  var max=Math.max.apply(null,datos.map(function(d){return d.total;}).concat([1]));
  var geo=new T.CylinderGeometry(1.15,1.15,1,6,1);geo.translate(0,0.5,0);
  var capGeo=new T.CylinderGeometry(1.18,1.18,0.12,6,1);
  datos.forEach(function(d,i){
    var x=(d.c[1]+70.66)*105,z=-(d.c[0]+33.48)*105;var hgt=0.4+15*Math.sqrt(d.total/max);var col=efColor(T,d.ef);
    var mat=new T.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.18,roughness:0.35,metalness:0.25,transparent:true,opacity:0.94});
    var m=new T.Mesh(geo,mat);m.position.set(x,0,z);m.scale.y=0.001;m.castShadow=true;m.receiveShadow=true;
    m.userData={d:d,h:hgt,ei:0.18,delay:i*0.035};E.sc.add(m);meshes.push(m);
    var cap=new T.Mesh(capGeo,new T.MeshBasicMaterial({color:col.clone().lerp(new T.Color(0xffffff),0.45)}));cap.position.set(x,0,z);m.userData.cap=cap;E.sc.add(cap);
  });
  // etiquetas HTML para las 8 comunas con más envíos
  var top=meshes.slice().sort(function(a,b){return b.userData.d.total-a.userData.d.total;}).slice(0,8);
  labels.innerHTML='';var lab=top.map(function(m){var el=document.createElement('div');
    el.style.cssText='position:absolute;transform:translate(-50%,-100%);pointer-events:none;white-space:nowrap;padding:3px 9px;border-radius:999px;background:rgba(20,22,15,.78);border:1px solid rgba(200,168,75,.55);color:#fff;font:700 11px DM Sans,system-ui,sans-serif;box-shadow:0 6px 14px rgba(0,0,0,.35);backdrop-filter:blur(4px)';
    el.innerHTML=titulo(m.userData.d.n)+' <span style="color:#ffe59a;font-family:Bebas Neue;font-size:14px;letter-spacing:.5px;margin-left:3px">'+m.userData.d.total.toLocaleString('es-CL')+'</span>';labels.appendChild(el);return{el:el,m:m};});
  var v=new T.Vector3();
  E.setTick(function(t){
    meshes.forEach(function(m){var u=m.userData;var k=Math.max(0,Math.min(1,(t-u.delay)/0.9));var e=1-Math.pow(1-k,3);var hh=Math.max(0.001,u.h*e);m.scale.y=hh;u.cap.position.y=hh+0.06;});
    lab.forEach(function(L){v.set(L.m.position.x,L.m.scale.y+1.2,L.m.position.z);var p=proyectar(E,v,cont);L.el.style.left=p.x+'px';L.el.style.top=p.y+'px';L.el.style.display=p.vis?'block':'none';});
  });
  E.start();return E;
}

// ── Vista 2: flujo de estados ──
function montarFlujo(T,cont,cnt,ui){
  var E=crearEscena(T,cont,{r:58,pol:1.08,az:-0.35,ty:3.5,rMin:22,rMax:90,onLost:ui.onLost});
  suelo(T,E.sc,30);
  var nodos={
    en_bodega:{p:[-17,0,0],c:'#4aa3c8',l:'En bodega'},
    en_ruta:{p:[-4,0,0],c:'#e8b84a',l:'En ruta'},
    entregado:{p:[14,0,-12],c:'#36c47f',l:'Entregado'},
    reprogramado:{p:[16,0,0],c:'#b06ad6',l:'Reprogramado'},
    cancelado:{p:[14,0,12],c:'#e0473f',l:'Cancelado'}};
  var finales=['entregado','reprogramado','cancelado'];
  var salieron=(cnt.en_ruta||0)+finales.reduce(function(a,k){return a+(cnt[k]||0);},0);
  var vals={en_bodega:cnt.en_bodega||0,en_ruta:salieron,entregado:cnt.entregado||0,reprogramado:cnt.reprogramado||0,cancelado:cnt.cancelado||0};
  var max=Math.max.apply(null,Object.keys(vals).map(function(k){return vals[k];}).concat([1]));
  var silos={};
  Object.keys(nodos).forEach(function(k,i){var n=nodos[k];var col=new T.Color(n.c);var hh=0.6+11*Math.sqrt(vals[k]/max);
    var base=new T.Mesh(new T.CylinderGeometry(3.4,3.6,0.5,48),new T.MeshStandardMaterial({color:0x2f3424,roughness:0.6,metalness:0.4}));base.position.set(n.p[0],0.25,n.p[2]);base.receiveShadow=true;E.sc.add(base);
    var g=new T.CylinderGeometry(2.4,2.4,1,48,1,true);g.translate(0,0.5,0);
    var vidrio=new T.Mesh(g,new T.MeshPhysicalMaterial({color:col,transparent:true,opacity:0.22,roughness:0.05,metalness:0,side:T.DoubleSide,depthWrite:false}));vidrio.position.set(n.p[0],0.5,n.p[2]);vidrio.scale.y=12.2;E.sc.add(vidrio);
    var g2=new T.CylinderGeometry(2.1,2.1,1,48);g2.translate(0,0.5,0);
    var liq=new T.Mesh(g2,new T.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.35,roughness:0.25,metalness:0.2}));liq.position.set(n.p[0],0.5,n.p[2]);liq.scale.y=0.001;liq.castShadow=true;E.sc.add(liq);
    var aro=new T.Mesh(new T.TorusGeometry(2.45,0.08,12,64),new T.MeshBasicMaterial({color:col}));aro.rotation.x=Math.PI/2;aro.position.set(n.p[0],0.5,n.p[2]);E.sc.add(aro);
    silos[k]={liq:liq,aro:aro,h:hh,delay:i*0.12,n:n};
  });
  // tubos + partículas
  var rutas=[['en_bodega','en_ruta',salieron]].concat(finales.map(function(k){return['en_ruta',k,vals[k]];}));
  var totalFlujo=rutas.reduce(function(a,r){return a+r[2];},0)||1;
  var curvas=[],N=0;
  rutas.forEach(function(r){var a=nodos[r[0]].p,b=nodos[r[1]].p;
    var p0=new T.Vector3(a[0]+2.6,2.2,a[2]),p3=new T.Vector3(b[0]-2.6,2.2,b[2]);
    var cur=new T.CubicBezierCurve3(p0,new T.Vector3(p0.x+5,5.5,a[2]),new T.Vector3(p3.x-5,5.5,b[2]),p3);
    var grosor=0.18+0.55*Math.sqrt(r[2]/totalFlujo);
    E.sc.add(new T.Mesh(new T.TubeGeometry(cur,64,grosor,16,false),new T.MeshPhysicalMaterial({color:new T.Color(nodos[r[1]].c),transparent:true,opacity:0.18,roughness:0.1,depthWrite:false})));
    var n=r[2]?Math.max(6,Math.round(520*r[2]/totalFlujo)):0;curvas.push({cur:cur,n:n,col:new T.Color(nodos[r[1]].c),g:grosor});N+=n;});
  var pos=new Float32Array(N*3),colr=new Float32Array(N*3),fase=[],vel=[],cid=[],off=[];
  var idx=0;curvas.forEach(function(c,ci){for(var i=0;i<c.n;i++){fase.push(Math.random());vel.push(0.08+Math.random()*0.07);cid.push(ci);off.push([(Math.random()-0.5)*c.g*1.4,(Math.random()-0.5)*c.g*1.4]);colr[idx*3]=c.col.r;colr[idx*3+1]=c.col.g;colr[idx*3+2]=c.col.b;idx++;}});
  var pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pos,3));pg.setAttribute('color',new T.BufferAttribute(colr,3));
  var cv=document.createElement('canvas');cv.width=cv.height=64;var cx=cv.getContext('2d');var gr=cx.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.35,'rgba(255,255,255,.8)');gr.addColorStop(1,'rgba(255,255,255,0)');cx.fillStyle=gr;cx.fillRect(0,0,64,64);
  var pts=new T.Points(pg,new T.PointsMaterial({size:0.75,map:new T.CanvasTexture(cv),vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));E.sc.add(pts);
  // etiquetas
  ui.labels.innerHTML='';var labs=Object.keys(nodos).map(function(k){var el=document.createElement('div');var n=nodos[k];
    el.style.cssText='position:absolute;transform:translate(-50%,-100%);pointer-events:none;text-align:center;white-space:nowrap';
    var pct=k==='en_bodega'||k==='en_ruta'?'':(salieron?' · '+Math.round(vals[k]/salieron*100)+'%':'');
    el.innerHTML='<div style="font-family:Bebas Neue;font-size:30px;line-height:1;color:#fff;text-shadow:0 0 18px '+n.c+',0 3px 0 rgba(0,0,0,.4)">'+vals[k].toLocaleString('es-CL')+'</div>'
      +'<div style="margin-top:3px;padding:2px 10px;border-radius:999px;background:rgba(20,22,15,.75);border:1px solid '+n.c+';color:#fff;font:700 11px DM Sans,system-ui,sans-serif">'+n.l+(k==='en_ruta'?' (salieron)':'')+pct+'</div>';
    ui.labels.appendChild(el);return{el:el,k:k};});
  var v=new T.Vector3(),tmp=new T.Vector3();
  E.setTick(function(t){
    Object.keys(silos).forEach(function(k){var s=silos[k];var q=Math.max(0,Math.min(1,(t-s.delay)/1.1));var e=1-Math.pow(1-q,3);var hh=Math.max(0.001,s.h*e);s.liq.scale.y=hh;s.aro.position.y=0.5+hh;});
    var i=0;curvas.forEach(function(c){for(var j=0;j<c.n;j++){var f=(fase[i]+t*vel[i])%1;c.cur.getPointAt(f,tmp);pos[i*3]=tmp.x+off[i][0];pos[i*3+1]=tmp.y+off[i][1];pos[i*3+2]=tmp.z+off[i][0]*0.6;i++;}});
    pg.attributes.position.needsUpdate=true;
    labs.forEach(function(L){var s=silos[L.k];v.set(s.n.p[0],s.liq.scale.y+2.4,s.n.p[2]);var p=proyectar(E,v,cont);L.el.style.left=p.x+'px';L.el.style.top=p.y+'px';L.el.style.display=p.vis?'block':'none';});
  });
  E.start();return E;
}

// ── Componente ──
function CentroControl3D(props){
  var envios=props.envios||[];
  var _m=R.useState(function(){try{return localStorage.getItem('dash3d_modo')||'mapa';}catch(e){return 'mapa';}}),modo=_m[0],setModo=_m[1];
  var _g=R.useState(0),gen=_g[0],setGen=_g[1];
  var _e=R.useState(''),err=_e[0],setErr=_e[1];
  var refC=R.useRef(null),refTip=R.useRef(null),refLab=R.useRef(null);
  var res=R.useMemo(function(){
    var pc={},cnt={},sinCoord={};
    envios.forEach(function(e){cnt[e.estado]=(cnt[e.estado]||0)+1;if(!e.comuna)return;var k=coordDe(e.comuna);
      if(!k){var nn=norm(e.comuna);sinCoord[nn]=(sinCoord[nn]||0)+1;return;}
      var d=pc[k.n]||(pc[k.n]={n:k.n,c:k.c,total:0});d.total++;d[e.estado]=(d[e.estado]||0)+1;});
    var datos=Object.keys(pc).map(function(k){var d=pc[k];var den=(d.entregado||0)+(d.reprogramado||0)+(d.cancelado||0);d.ef=den?(d.entregado||0)/den:null;return d;});
    var conEf=datos.filter(function(d){return d.ef!=null&&d.total>=10;});
    var mejor=conEf.slice().sort(function(a,b){return b.ef-a.ef;})[0],peor=conEf.slice().sort(function(a,b){return a.ef-b.ef;})[0];
    var top=datos.slice().sort(function(a,b){return b.total-a.total;})[0];
    var key=datos.map(function(d){return d.n+':'+d.total+':'+(d.entregado||0);}).join('|')+'#'+JSON.stringify(cnt);
    return{datos:datos,cnt:cnt,mejor:mejor,peor:peor,top:top,key:key,nComunas:datos.length};
  },[envios]);
  R.useEffect(function(){
    var E=null,vivo=true;setErr('');
    if(!envios.length)return;
    cargarThree().then(function(T){if(!vivo||!refC.current)return;
      var ui={tip:refTip.current,labels:refLab.current,onLost:function(){setTimeout(function(){setGen(function(g){return g+1;});},800);}};
      try{E=modo==='flujo'?montarFlujo(T,refC.current,res.cnt,ui):montarMapa(T,refC.current,res.datos,ui);}catch(e){setErr('No se pudo dibujar la vista 3D en este equipo.');}
    }).catch(function(){setErr('No se pudo cargar el motor 3D.');});
    return function(){vivo=false;if(E)E.destroy();if(refLab.current)refLab.current.innerHTML='';};
  },[modo,res.key,gen]);
  function cambiar(m){setModo(m);try{localStorage.setItem('dash3d_modo',m);}catch(e){}}
  var tab=function(v,l){var a=modo===v;return h('button',{key:v,type:'button',onClick:function(){cambiar(v);},style:{padding:'8px 16px',borderRadius:10,border:'1px solid '+(a?'#e8c766':'rgba(255,255,255,.14)'),background:a?'linear-gradient(135deg,#e8c766,#b08a2e)':'rgba(255,255,255,.05)',color:a?'#1a1d13':'#e9e4d2',fontWeight:800,fontSize:12.5,letterSpacing:.4,cursor:'pointer',boxShadow:a?'0 6px 16px rgba(200,168,75,.35)':'none'}},l);};
  var ins=function(lbl,val,sub,col){return h('div',{style:{padding:'12px 14px',borderRadius:14,background:'linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.10)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.08)'}},
    h('div',{style:{fontSize:10.5,letterSpacing:1.6,textTransform:'uppercase',color:'rgba(233,228,210,.65)',fontWeight:800}},lbl),
    h('div',{title:typeof val==='string'?val:'',style:{fontFamily:'Bebas Neue',fontSize:26,lineHeight:1.1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:col||'#fff',textShadow:'0 0 16px '+(col||'#fff')+'55'}},val),
    sub&&h('div',{style:{fontSize:11.5,color:'rgba(233,228,210,.75)'}},sub));};
  var c=res.cnt,den=(c.entregado||0)+(c.reprogramado||0)+(c.cancelado||0);
  return h('div',{style:{position:'relative',marginBottom:20,borderRadius:20,overflow:'hidden',background:'radial-gradient(120% 90% at 30% 0%,#3a3f2b 0%,#22261a 45%,#14170f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 24px 50px rgba(20,22,15,.35), inset 0 1px 0 rgba(255,255,255,.08)'}},
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,padding:'16px 20px 0'}},
      h('div',null,
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:2.5,color:'#fff',lineHeight:1}},'Centro de control'),
        h('div',{style:{fontSize:12,color:'rgba(233,228,210,.7)',marginTop:3}},modo==='mapa'?'Altura = envíos del período · color = efectividad operativa (rojo 90% · verde 100%) · arrastra para girar, rueda para acercar':'Recorrido de los envíos del período: de bodega a ruta y su resultado final')),
      h('div',{style:{display:'flex',gap:6}},tab('mapa','Mapa 3D de comunas'),tab('flujo','Flujo de estados'))),
    h('div',{style:{display:'grid',gridTemplateColumns:'minmax(0,1fr) 220px',gap:0}},
      h('div',{style:{position:'relative',height:440,minWidth:0}},
        h('div',{ref:refC,style:{position:'absolute',inset:0}}),
        h('div',{ref:refLab,style:{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}),
        h('div',{ref:refTip,style:{position:'absolute',display:'none',pointerEvents:'none',zIndex:3,minWidth:190,padding:'10px 12px',borderRadius:12,background:'rgba(18,20,13,.92)',border:'1px solid rgba(200,168,75,.6)',color:'#fff',font:'12px DM Sans,system-ui,sans-serif',boxShadow:'0 14px 30px rgba(0,0,0,.45)',backdropFilter:'blur(6px)'}}),
        !envios.length&&h('div',{style:{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(233,228,210,.7)',fontSize:13}},'Sin envíos en el período.'),
        err&&h('div',{style:{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#ffb4a8',fontSize:13}},err),
        modo==='mapa'&&h('div',{style:{position:'absolute',left:16,bottom:14,display:'flex',alignItems:'center',gap:8,fontSize:11,color:'rgba(233,228,210,.8)',fontWeight:700}},
          'Efectividad',h('span',null,'90%'),h('span',{style:{width:120,height:8,borderRadius:6,background:'linear-gradient(90deg,#e0473f,#e8b84a,#36c47f)',boxShadow:'0 0 10px rgba(232,184,74,.4)'}}),h('span',null,'100%'))),
      h('div',{style:{display:'flex',flexDirection:'column',gap:10,padding:'14px 16px 16px 4px'}},
        ins('Efectividad operativa',den?Math.round((c.entregado||0)/den*100)+'%':'—',(c.entregado||0).toLocaleString('es-CL')+' entregados de '+den.toLocaleString('es-CL')+' gestionados','#36c47f'),
        ins('Comuna con más envíos',res.top?titulo(res.top.n):'—',res.top?res.top.total.toLocaleString('es-CL')+' envíos':'', '#ffe59a'),
        ins('Mejor efectividad',res.mejor?titulo(res.mejor.n):'—',res.mejor?Math.round(res.mejor.ef*100)+'% · '+res.mejor.total+' envíos':'Mín. 10 envíos','#7ee0ad'),
        ins('A revisar',res.peor?titulo(res.peor.n):'—',res.peor?Math.round(res.peor.ef*100)+'% · '+res.peor.total+' envíos':'','#ff8f86'),
        ins('Cobertura',res.nComunas+' comunas',null,'#9fd3ea'))));
}
window.__dash3d={CentroControl3D:CentroControl3D};
})();
