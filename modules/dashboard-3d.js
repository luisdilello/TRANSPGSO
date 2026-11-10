// Centro de control 3D del Dashboard (08-11-2026).
// Dos vistas en Three.js sobre los envíos del período filtrado:
//  - Mapa 3D de comunas: torres hexagonales ubicadas geográficamente; altura = envíos, color = efectividad total.
//  - Flujo de estados: modelos 3D por estado (bodega, camión, casa, reloj, caja cancelada) con pila de cajas proporcional y partículas que viajan Bodega → En ruta → Entregado / Reprogramado / Cancelado.
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
'ISLA DE MAIPO':[-33.7500,-70.9000],'ALHUE':[-34.0300,-71.1000],'CURACAVI':[-33.4030,-71.1330],'MARIA PINTO':[-33.5150,-71.1200],'MELIPILLA':[-33.6870,-71.2150],'SAN PEDRO':[-33.8950,-71.4600],'TILTIL':[-33.0830,-70.9270],'PAINE':[-33.8070,-70.7400]};
var ALIAS={'STGO':'SANTIAGO','SANTIAGO CENTRO':'SANTIAGO','MAIPO':'MAIPU','EST CENTRAL':'ESTACION CENTRAL','PAC':'PEDRO AGUIRRE CERDA'};
function coordDe(c){var n=norm(c);n=ALIAS[n]||n;if(!COORD[n]&&/\s[-–]\s/.test(n)){n=n.split(/\s[-–]\s/)[0].trim();n=ALIAS[n]||n;}return COORD[n]?{n:n,c:COORD[n]}:null;}
function cargarGeo(){if(window.__rmGeo)return Promise.resolve(window.__rmGeo);if(window.__rmGeoP)return window.__rmGeoP;window.__rmGeoP=fetch('vendor/rm-comunas.json').then(function(r){if(!r.ok)throw new Error('geo');return r.json();}).then(function(j){window.__rmGeo=j;return j;}).catch(function(e){window.__rmGeoP=null;throw e;});return window.__rmGeoP;}
function efColor(T,ef,lo,hi){
  if(ef==null)return new T.Color('#8a8f78');
  var a=new T.Color('#e0473f'),b=new T.Color('#e8b84a'),c=new T.Color('#36c47f');
  lo=lo==null?0.9:lo;hi=hi==null?1:hi;var t=Math.max(0,Math.min(1,(ef-lo)/Math.max(0.005,hi-lo)));
  return t<0.5?a.lerp(b,t*2):b.lerp(c,(t-0.5)*2);
}
var ACENTOS={'NUNOA':'Ñuñoa','MAIPU':'Maipú','CONCHALI':'Conchalí','PENALOLEN':'Peñalolén','ESTACION CENTRAL':'Estación Central','SAN JOAQUIN':'San Joaquín','SAN RAMON':'San Ramón','PENAFLOR':'Peñaflor','SAN JOSE DE MAIPO':'San José de Maipo','ALHUE':'Alhué','CURACAVI':'Curacaví','MARIA PINTO':'María Pinto','PEDRO AGUIRRE CERDA':'Pedro Aguirre Cerda','LO BARNECHEA':'Lo Barnechea','ISLA DE MAIPO':'Isla de Maipo','CALERA DE TANGO':'Calera de Tango','SAN JOSE':'San José'};
function titulo(s){var k=String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();if(ACENTOS[k])return ACENTOS[k];return s.toLowerCase().replace(/(^|\s)\S/g,function(x){return x.toUpperCase();}).replace(/ (De|Del|La|Las|Los|El) /g,function(x){return x.toLowerCase();});}

// ── Motor común: renderer + cámara orbital + bucle con pausa ──
function crearEscena(T,cont,opts){
  var W=cont.clientWidth||800,H=cont.clientHeight||420;
  // 10-11-2026: si el equipo no entrega un contexto WebGL de alto rendimiento, se reintenta en modo liviano.
  var ren;
  try{ren=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}
  catch(e1){ren=new T.WebGLRenderer({antialias:false,alpha:true,powerPreference:'default',failIfMajorPerformanceCaveat:false});}
  ren.setPixelRatio(Math.min(2,window.devicePixelRatio||1));ren.setSize(W,H);
  if(T.ColorManagement)T.ColorManagement.legacyMode=false;
  ren.outputEncoding=T.sRGBEncoding;ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;
  ren.toneMapping=T.ACESFilmicToneMapping;ren.toneMappingExposure=1.15;
  cont.appendChild(ren.domElement);ren.domElement.style.display='block';ren.domElement.style.cursor='grab';
  var sc=new T.Scene();sc.fog=new T.Fog(0x15180f,opts.fogNear||70,opts.fogFar||150);
  var cam=new T.PerspectiveCamera(38,W/H,0.1,400);
  // En pantallas angostas (teléfono) se abre el ángulo vertical para conservar el ancho de la escena.
  function ajustarFov(a){var base=38*Math.PI/180,ref=1.85;cam.fov=a>=ref?38:Math.min(80,2*Math.atan(Math.tan(base/2)*ref/a)*180/Math.PI);}
  ajustarFov(W/H);cam.updateProjectionMatrix();
  var orb={az:opts.az||-0.6,pol:opts.pol||0.95,r:opts.r||60,tAz:null,auto:true,target:new T.Vector3(opts.tx||0,opts.ty||0,opts.tz||0)};
  function ubicar(){var sp=Math.sin(orb.pol);cam.position.set(orb.target.x+orb.r*sp*Math.sin(orb.az),orb.r*Math.cos(orb.pol),orb.target.z+orb.r*sp*Math.cos(orb.az));cam.lookAt(orb.target);}
  ubicar();
  sc.add(new T.HemisphereLight(0xfff4d6,0x1c2014,0.75));
  var sol=new T.DirectionalLight(0xffffff,1.25);sol.position.set(30,60,25);sol.castShadow=true;sol.shadow.mapSize.set(2048,2048);
  var sh=sol.shadow.camera;sh.left=-45;sh.right=45;sh.top=45;sh.bottom=-45;sh.far=160;sc.add(sol);
  var rim=new T.DirectionalLight(0xc8a84b,0.55);rim.position.set(-40,20,-30);sc.add(rim);
  // arrastre / zoom
  var drag=null,el=ren.domElement;
  function down(e){drag={x:e.clientX,y:e.clientY,az:orb.az,pol:orb.pol,x0:e.clientX,y0:e.clientY};orb.auto=false;el.style.cursor='grabbing';el.setPointerCapture&&el.setPointerCapture(e.pointerId);}
  function move(e){if(drag){orb.az=drag.az-(e.clientX-drag.x)*0.008;orb.pol=Math.max(0.25,Math.min(1.35,drag.pol-(e.clientY-drag.y)*0.006));ubicar();}if(opts.onMove)opts.onMove(e);}
  function up(e){var d=drag;drag=null;el.style.cursor='grab';if(d&&e&&e.clientX!=null&&Math.abs(e.clientX-d.x0)+Math.abs(e.clientY-d.y0)<7&&opts.onClick)opts.onClick(e);}
  function wheel(e){e.preventDefault();orb.r=Math.max(opts.rMin||22,Math.min(opts.rMax||110,orb.r*(e.deltaY>0?1.08:0.93)));ubicar();}
  el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointerleave',function(e){drag=null;el.style.cursor='grab';opts.onLeave&&opts.onLeave(e);});
  el.addEventListener('wheel',wheel,{passive:false});
  var vivo=true,visible=true,raf=0,t0=performance.now(),tick=null;
  var io=window.IntersectionObserver?new IntersectionObserver(function(en){visible=en[0].isIntersecting;if(visible&&!raf)loop();}):null;io&&io.observe(cont);
  // 10-11-2026: resplandor (bloom) propio y liviano: escena a media resolución -> zonas brillantes ->
  // desenfoque -> se suma encima. Solo con opts.bloom y si el equipo lo soporta; si falla, se apaga solo.
  var post=null;
  function crearPost(){try{
    var pr=ren.getPixelRatio(),w=Math.max(4,Math.floor((cont.clientWidth||W)*pr/2)),hh=Math.max(4,Math.floor((cont.clientHeight||H)*pr/2));
    var tipo=ren.capabilities.isWebGL2?T.HalfFloatType:T.UnsignedByteType;
    var rt0=new T.WebGLRenderTarget(w,hh,{type:tipo}),rtA=new T.WebGLRenderTarget(w>>1,hh>>1,{type:tipo}),rtB=new T.WebGLRenderTarget(w>>1,hh>>1,{type:tipo});
    var VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
    var mB=new T.ShaderMaterial({uniforms:{t:{value:null},th:{value:0.62}},vertexShader:VS,fragmentShader:'uniform sampler2D t;uniform float th;varying vec2 vUv;void main(){vec4 c=texture2D(t,vUv);float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c.rgb*smoothstep(th,th+0.35,l),1.);}',depthTest:false,depthWrite:false});
    var mG=new T.ShaderMaterial({uniforms:{t:{value:null},d:{value:new T.Vector2()}},vertexShader:VS,fragmentShader:'uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*0.227;c+=texture2D(t,vUv+d*1.385).rgb*0.316;c+=texture2D(t,vUv-d*1.385).rgb*0.316;c+=texture2D(t,vUv+d*3.231).rgb*0.07;c+=texture2D(t,vUv-d*3.231).rgb*0.07;gl_FragColor=vec4(c,1.);}',depthTest:false,depthWrite:false});
    var mS=new T.ShaderMaterial({uniforms:{t:{value:null},k:{value:opts.bloom}},vertexShader:VS,fragmentShader:'uniform sampler2D t;uniform float k;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*k;gl_FragColor=vec4(c,0.);}',transparent:true,blending:T.CustomBlending,blendEquation:T.AddEquation,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,depthTest:false,depthWrite:false});
    var scO=new T.Scene(),camO=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(new T.PlaneGeometry(2,2),mB);quad.frustumCulled=false;scO.add(quad);
    post={rt:[rt0,rtA,rtB],render:function(){
      var au=ren.autoClear,su=ren.shadowMap.autoUpdate,tm=ren.toneMapping;
      ren.render(sc,cam);
      ren.shadowMap.autoUpdate=false;
      ren.setRenderTarget(rt0);ren.setClearColor(0x000000,0);ren.clear();ren.render(sc,cam);
      quad.material=mB;mB.uniforms.t.value=rt0.texture;ren.setRenderTarget(rtA);ren.render(scO,camO);
      for(var it=0;it<3;it++){var sp=1+it;
        quad.material=mG;mG.uniforms.t.value=rtA.texture;mG.uniforms.d.value.set(sp/rtA.width,0);ren.setRenderTarget(rtB);ren.render(scO,camO);
        mG.uniforms.t.value=rtB.texture;mG.uniforms.d.value.set(0,sp/rtA.height);ren.setRenderTarget(rtA);ren.render(scO,camO);}
      ren.setRenderTarget(null);ren.autoClear=false;ren.toneMapping=T.NoToneMapping;quad.material=mS;mS.uniforms.t.value=rtA.texture;ren.render(scO,camO);
      ren.autoClear=au;ren.shadowMap.autoUpdate=su;ren.toneMapping=tm;},
      dispose:function(){[rt0,rtA,rtB].forEach(function(r){r.dispose();});[mB,mG,mS].forEach(function(m){m.dispose();});quad.geometry.dispose();}};
  }catch(e){console.warn('[cc3d] sin bloom',e);post=null;}}
  if(opts.bloom&&(cont.clientWidth||W)>=600)crearPost();
  function loop(){raf=0;if(!vivo||!visible||document.hidden)return;var t=(performance.now()-t0)/1000;
    if(orb.auto){orb.az+=0.0012;ubicar();}
    tick&&tick(t);
    if(post){try{post.render();}catch(e){console.warn('[cc3d] bloom off',e);try{post.dispose();}catch(e2){}post=null;ren.setRenderTarget(null);ren.render(sc,cam);}}else ren.render(sc,cam);
    raf=requestAnimationFrame(loop);}
  function vis(){if(!document.hidden&&!raf)loop();}
  document.addEventListener('visibilitychange',vis);
  var ro=window.ResizeObserver?new ResizeObserver(function(){var w=cont.clientWidth,hh=cont.clientHeight;if(!w||!hh)return;ren.setSize(w,hh);cam.aspect=w/hh;ajustarFov(w/hh);cam.updateProjectionMatrix();
    if(opts.bloom){if(post){post.dispose();post=null;}if(w>=600)crearPost();}}):null;ro&&ro.observe(cont);
  el.addEventListener('webglcontextlost',function(e){e.preventDefault();opts.onLost&&opts.onLost();});
  return{T:T,ren:ren,sc:sc,cam:cam,orb:orb,ubicar:ubicar,t0:t0,setTick:function(f){tick=f;},start:loop,
    destroy:function(){vivo=false;cancelAnimationFrame(raf);io&&io.disconnect();ro&&ro.disconnect();if(post){try{post.dispose();}catch(e){}post=null;}document.removeEventListener('visibilitychange',vis);
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
function montarMapa(T,cont,datos,ui,geo){
  var tip=ui.tip,labels=ui.labels;
  var meshes=[],ray=new T.Raycaster(),ptr=new T.Vector2(),hov=null;
  var E=crearEscena(T,cont,{r:74,pol:0.84,az:-0.3,rMin:18,rMax:200,fogNear:110,fogFar:260,onLost:ui.onLost,
    onMove:function(e){var b=E.ren.domElement.getBoundingClientRect();ptr.x=(e.clientX-b.left)/b.width*2-1;ptr.y=-(e.clientY-b.top)/b.height*2+1;
      ray.setFromCamera(ptr,E.cam);var hit=ray.intersectObjects(meshes,false)[0];var m=hit?hit.object:null;
      if(hov&&hov!==m){hov.material.emissiveIntensity=hov.userData.ei;}
      hov=m;if(m){m.material.emissiveIntensity=m.userData.losa?0.35:0.75;var d=m.userData.d;
        tip.style.display='block';tip.style.left=Math.min(cont.clientWidth-210,e.clientX-b.left+14)+'px';tip.style.top=(e.clientY-b.top+14)+'px';
        if(!d.total){tip.innerHTML='<div style="font-family:Bebas Neue;font-size:20px;letter-spacing:1px;color:#ffe59a">'+titulo(d.n)+'</div><div style="font-size:12px;opacity:.75">Provincia de '+d.prov+' · sin envíos en el período</div>';return;}
        tip.innerHTML='<div style="font-family:Bebas Neue;font-size:20px;letter-spacing:1px;color:#ffe59a">'+titulo(d.n)+'</div>'
          +'<div style="font-size:12px;opacity:.85;margin-bottom:6px">'+d.total.toLocaleString('es-CL')+' envíos · efectividad '+(d.ef==null?'—':(Math.round(d.ef*1000)/10)+'%')+'</div>'
          +[['Entregados',d.entregado,'#36c47f'],['En ruta',d.en_ruta,'#e8b84a'],['En bodega',d.en_bodega,'#4aa3c8'],['Reprogramados',d.reprogramado,'#b06ad6'],['Cancelados',d.cancelado,'#e0473f'],['Siniestros',d.siniestro,'#ff7a3d'],['Retornos',d.retorno,'#c49a4a'],['Bodega cancelado',d.en_bodega_cancelado,'#d08a4a'],['Bodega por fecha',d.en_bodega_fecha,'#5b8fd6']]
            .filter(function(x){return x[1];}).map(function(x){return '<div style="display:flex;justify-content:space-between;gap:18px;font-size:12px"><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:'+x[2]+';margin-right:6px"></i>'+x[0]+'</span><b>'+x[1]+'</b></div>';}).join('');
      }else tip.style.display='none';},
    onLeave:function(){tip.style.display='none';}});
  // suelo amplio y oscuro (la región completa se pierde en la niebla hacia la cordillera y la costa)
  var piso=new T.Mesh(new T.CircleGeometry(260,96),new T.MeshStandardMaterial({color:0x1d2116,roughness:1}));piso.rotation.x=-Math.PI/2;piso.position.y=-0.05;piso.receiveShadow=true;E.sc.add(piso);
  var grid=new T.PolarGridHelper(150,24,10,96,0xc8a84b,0xc8a84b);grid.material.transparent=true;grid.material.opacity=0.07;grid.position.y=-0.02;E.sc.add(grid);
  var byN={};datos.forEach(function(d){byN[d.n]=d;});
  var max=Math.max.apply(null,datos.map(function(d){return d.total;}).concat([1]));
  var X=function(lng){return (lng+70.65)*105;},Y=function(lat){return (lat+33.47)*105;};
  var lineMat=new T.LineBasicMaterial({color:0xffe08a,transparent:true,opacity:0.9});
  var i=0,torres=[];
  var geoT=new T.CylinderGeometry(1.0,1.0,1,6,1);geoT.translate(0,0.5,0);var capT=new T.CylinderGeometry(1.03,1.03,0.12,6,1);
  geo.forEach(function(f){
    var key=norm(f.n);var d=byN[key];
    var shapes=f.r.map(function(ring){return new T.Shape(ring.map(function(p){return new T.Vector2(X(p[0]),Y(p[1]));}));});
    var g=new T.ExtrudeGeometry(shapes,{depth:1,bevelEnabled:false});g.rotateX(-Math.PI/2);
    // separación entre comunas: cada losa se encoge levemente hacia su centro (deja una "calle" oscura entre comunas)
    g.computeBoundingBox();var b0=g.boundingBox,ccx=(b0.min.x+b0.max.x)/2,ccz=(b0.min.z+b0.max.z)/2,tam=Math.max(1,Math.min(b0.max.x-b0.min.x,b0.max.z-b0.min.z));
    var fs=Math.max(0.9,1-0.5/tam);g.translate(-ccx,0,-ccz);g.scale(fs,1,fs);g.translate(ccx,0,ccz);
    var con=!!(d&&d.total);
    // losa del mapa: tono crema/oliva, teñida suave según efectividad si tiene envíos
    var paleta=[0xe9dcae,0xd8c48a,0xf1e6c2,0xcdb877,0xe2d29f,0xc9b26b];
    var vari=(f.n.length*7+f.n.charCodeAt(0)*3)%paleta.length;
    var colL=con?efColor(T,d.ef,ui.lo,ui.hi).multiplyScalar([0.42,0.55,0.68,0.48,0.62,0.36][vari]):new T.Color([0x3a4030,0x323827,0x41472f][vari%3]);
    var matL=new T.MeshStandardMaterial({color:colL,emissive:colL,emissiveIntensity:0.12,roughness:0.7,metalness:0.1});
    var losa=new T.Mesh(g,matL);losa.receiveShadow=true;losa.castShadow=false;losa.scale.y=0.001;
    var hl=con?0.9:0.45;
    losa.userData={d:d||{n:key,total:0,prov:f.p},h:hl,ei:0.12,delay:0,losa:true};
    if(d)d.prov=f.p;
    losa.add(new T.LineSegments(new T.EdgesGeometry(g,25),con?lineMat:new T.LineBasicMaterial({color:0xc8a84b,transparent:true,opacity:0.55})));
    E.sc.add(losa);meshes.push(losa);
    if(con){
      var c=COORD[key];var cx,cz;
      if(c){cx=X(c[1]);cz=-Y(c[0]);}else{g.computeBoundingBox();var bb=g.boundingBox;cx=(bb.min.x+bb.max.x)/2;cz=(bb.min.z+bb.max.z)/2;}
      var col=efColor(T,d.ef,ui.lo,ui.hi);
      var mat=new T.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.2,roughness:0.32,metalness:0.25});
      var tw=new T.Mesh(geoT,mat);tw.position.set(cx,0,cz);tw.castShadow=true;tw.scale.y=0.001;
      tw.userData={d:d,h:1+13*Math.sqrt(d.total/max),ei:0.2,delay:0.35+i++*0.03,base:hl,cx:cx,cz:cz};
      var cap=new T.Mesh(capT,new T.MeshBasicMaterial({color:col.clone().lerp(new T.Color(0xffffff),0.45)}));tw.userData.cap=cap;E.sc.add(cap);
      E.sc.add(tw);meshes.push(tw);torres.push(tw);
    }
  });
  // etiquetas HTML para las 8 comunas con más envíos
  var top=torres.slice().sort(function(a,b){return b.userData.d.total-a.userData.d.total;}).slice(0,(labels.clientWidth||900)<600?3:8);
  labels.innerHTML='';var lab=top.map(function(m){var el=document.createElement('div');
    el.style.cssText='position:absolute;transform:translate(-50%,-100%);pointer-events:none;white-space:nowrap;padding:3px 9px;border-radius:999px;background:rgba(20,22,15,.8);border:1px solid rgba(200,168,75,.6);color:#fff;font:700 11px DM Sans,system-ui,sans-serif;box-shadow:0 6px 14px rgba(0,0,0,.35);backdrop-filter:blur(4px)';
    el.innerHTML=titulo(m.userData.d.n)+' <span style="color:#ffe59a;font-family:Bebas Neue;font-size:14px;letter-spacing:.5px;margin-left:3px">'+m.userData.d.total.toLocaleString('es-CL')+'</span>';labels.appendChild(el);return{el:el,m:m};});
  var v=new T.Vector3();
  E.setTick(function(t){
    meshes.forEach(function(m){var u=m.userData;var k=Math.max(0,Math.min(1,(t-u.delay)/0.9));var e=1-Math.pow(1-k,3);m.scale.y=Math.max(0.001,u.h*e);
      if(!u.losa){m.position.y=(u.base||0)*Math.min(1,t/0.9)+(m===hov?0.35:0);u.cap.position.set(u.cx,m.position.y+m.scale.y+0.06,u.cz);}});
    lab.forEach(function(L){v.set(L.m.userData.cx,L.m.scale.y+L.m.position.y+1.2,L.m.userData.cz);var p=proyectar(E,v,cont);L.el.style.left=p.x+'px';L.el.style.top=p.y+'px';L.el.style.display=p.vis?'block':'none';});
  });
  E.start();return E;
}

// ── Vista 2: flujo de estados ──
// 10-11-2026: cada estado cae en una estación, así las 5 estaciones suman el total del período
// (antes quedaban fuera bodega por fecha, retorno, bodega cancelado y siniestro).
var GRUPO_NODO={en_bodega:'en_bodega',en_bodega_fecha:'en_bodega_fecha',sin_asignar:'en_bodega',en_ruta:'en_ruta',entregado:'entregado',reprogramado:'reprogramado',cancelado:'cancelado',retorno:'cancelado',siniestro:'cancelado',en_bodega_cancelado:'cancelado'};
function nodoDe(e){return GRUPO_NODO[e]||null;}
function montarFlujo(T,cont,cnt,ui){
  // 10-11-2026: tocar una estación (bodega, camión, casa, reloj, caja) abre el detalle por comuna.
  var clicables=[],rayF=new T.Raycaster(),ptrF=new T.Vector2();
  var E=crearEscena(T,cont,{r:52,pol:0.98,az:-0.3,ty:3,rMin:24,rMax:110,bloom:1.15,fogNear:60,fogFar:150,onLost:ui.onLost,
    onClick:function(e){if(!ui.onNodo)return;var b=E.ren.domElement.getBoundingClientRect();ptrF.x=(e.clientX-b.left)/b.width*2-1;ptrF.y=-(e.clientY-b.top)/b.height*2+1;
      rayF.setFromCamera(ptrF,E.cam);var hit=rayF.intersectObjects(clicables,true)[0];if(!hit){ui.onNodo(null);return;}
      var o=hit.object;while(o&&!(o.userData&&o.userData.k))o=o.parent;ui.onNodo(o?o.userData.k:null);}});
  suelo(T,E.sc,38);
  // 10-11-2026: estaciones más separadas (antes el reloj tapaba la casa) y escena más oscura para que resalte el neón.
  E.sc.children.forEach(function(o){if(o.isHemisphereLight)o.intensity=0.5;if(o.isDirectionalLight&&o.castShadow)o.intensity=1.0;});
  var nodos={
    en_bodega:{p:[-24,0,4],c:'#4aa3c8',l:'En bodega'},
    en_bodega_fecha:{p:[-21,0,-13],c:'#5b8def',l:'Bodega por fecha'},
    en_ruta:{p:[-6,0,4],c:'#e8b84a',l:'En ruta'},
    entregado:{p:[16,0,-16],c:'#36c47f',l:'Entregado'},
    reprogramado:{p:[25,0,3],c:'#b06ad6',l:'Reprogramado'},
    cancelado:{p:[15,0,21],c:'#e0473f',l:'Cancelado y retorno'}};
  var finales=['entregado','reprogramado','cancelado'];
  var salieron=(cnt.en_ruta||0)+finales.reduce(function(a,k){return a+(cnt[k]||0);},0);
  // En ruta = lo que sigue en ruta ahora (no lo que salió); lo que salió se muestra aparte y es la base de los %.
  var vals={en_bodega:0,en_bodega_fecha:0,en_ruta:0,entregado:0,reprogramado:0,cancelado:0},det={};
  Object.keys(cnt).forEach(function(e){var k=nodoDe(e);if(k){vals[k]+=cnt[e]||0;det[e]=(det[e]||0)+(cnt[e]||0);}});
  function subNodo(k){var f=function(n){return (n||0).toLocaleString('es-CL');};
    if(k==='en_bodega_fecha')return 'esperan su fecha de entrega';
    if(k==='cancelado'){var p=[[det.cancelado,'cancel.'],[det.retorno,'retorno'],[det.en_bodega_cancelado,'bod. canc.'],[det.siniestro,'siniestro']].filter(function(x){return x[0];});if(p.length>1||(p.length===1&&p[0][1]!=='cancel.'))return p.map(function(x){return f(x[0])+' '+x[1];}).join(' · ');}
    return '';}
  salieron=vals.en_ruta+vals.entregado+vals.reprogramado+vals.cancelado;
  var max=Math.max.apply(null,Object.keys(vals).map(function(k){return vals[k];}).concat([1]));
  // Modelos 3D según el estado: bodega, camión de reparto, casa con paquete entregado, reloj de reagenda
  // y caja cancelada. Al lado, una pila de cajas cuya altura es proporcional a la cantidad.
  function M(col,o){return new T.MeshStandardMaterial(Object.assign({color:col,roughness:0.55,metalness:0.1},o||{}));}
  function caja(w,h,d,mat,x,y,z,par){var m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;par.add(m);return m;}
  var carton=M(0xc79a5b,{roughness:0.85}),cinta=M(0xa87a3c,{roughness:0.7}),blanco=M(0xf3efe4),oscuro=M(0x23261c,{roughness:0.4,metalness:0.3}),vidrioM=M(0x1d2b33,{roughness:0.1,metalness:0.6});
  function paquete(par,x,y,z,sz,rot){var g=new T.Group();caja(sz,sz*0.8,sz,carton,0,0,0,g);caja(sz*1.01,sz*0.12,sz*0.22,cinta,0,sz*0.35,0,g);g.position.set(x,y,z);g.rotation.y=rot||0;par.add(g);return g;}
  var animables=[];
  function mBodega(g,col){var c=new T.Color(col);
    caja(4.6,2.6,3.4,M(0xe4ddc9),0,1.3,0,g);
    var techo=new T.Mesh(new T.CylinderGeometry(2.45,2.45,3.6,32,1,false,0,Math.PI),M(c,{metalness:0.55,roughness:0.3}));techo.rotation.z=Math.PI/2;techo.rotation.y=Math.PI/2;techo.position.set(0,2.6,0);techo.castShadow=true;g.add(techo);
    var tapa=new T.Mesh(new T.CircleGeometry(2.45,32,0,Math.PI),M(0xd6cdb4,{side:T.DoubleSide}));tapa.position.set(0,2.6,1.72);g.add(tapa);
    var puerta=caja(2.2,1.9,0.08,M(0x8d949a,{metalness:0.6,roughness:0.35}),0,0.95,1.72,g);
    for(var i=0;i<6;i++)caja(2.2,0.04,0.1,oscuro,0,0.25+i*0.3,1.77,g);
    caja(2.6,0.45,0.08,M(c,{emissive:c,emissiveIntensity:0.4}),0,3.15,1.78,g);
    paquete(g,-1.7,0.4,2.2,0.7,0.3);paquete(g,-1.65,1.0,2.15,0.55,-0.2);
    return 4.9;}
  function mCamion(g,col){var c=new T.Color(col);var cuerpo=new T.Group();g.add(cuerpo);
    caja(3.8,2.2,2.2,blanco,-0.7,1.75,0,cuerpo);
    caja(3.82,0.3,2.22,M(c,{metalness:0.3}),-0.7,1.2,0,cuerpo);
    caja(1.5,1.7,2.1,M(c,{metalness:0.35,roughness:0.35}),1.95,1.5,0,cuerpo);
    caja(0.06,0.8,1.8,vidrioM,2.72,1.85,0,cuerpo);
    caja(0.9,0.5,0.06,vidrioM,1.95,1.9,1.06,cuerpo);caja(0.9,0.5,0.06,vidrioM,1.95,1.9,-1.06,cuerpo);
    caja(0.08,0.22,0.4,M(0xfff6c8,{emissive:0xfff2b0,emissiveIntensity:1.2}),2.72,1.0,0.75,cuerpo);caja(0.08,0.22,0.4,M(0xfff6c8,{emissive:0xfff2b0,emissiveIntensity:1.2}),2.72,1.0,-0.75,cuerpo);
    var ruedas=[];[[-1.8,1.1],[-1.8,-1.1],[1.9,1.1],[1.9,-1.1]].forEach(function(r){var w=new T.Mesh(new T.CylinderGeometry(0.45,0.45,0.35,24),oscuro);w.rotation.x=Math.PI/2;w.position.set(r[0],0.45,r[1]);w.castShadow=true;g.add(w);ruedas.push(w);
      var aro=new T.Mesh(new T.CylinderGeometry(0.22,0.22,0.37,16),M(0xbfc4c8,{metalness:0.8,roughness:0.25}));aro.rotation.x=Math.PI/2;aro.position.copy(w.position);g.add(aro);});
    animables.push(function(t){cuerpo.position.y=Math.sin(t*9)*0.03;ruedas.forEach(function(w){w.rotation.y=t*6;});});
    return 3.4;}
  function mCasa(g,col){var c=new T.Color(col);
    caja(3.2,2.2,2.8,M(0xf4ecd8),0,1.1,0,g);
    var techo=new T.Mesh(new T.ConeGeometry(2.75,1.6,4),M(c,{roughness:0.45}));techo.rotation.y=Math.PI/4;techo.position.set(0,3.0,0);techo.castShadow=true;g.add(techo);
    caja(0.8,1.4,0.08,M(0x7a5232),0,0.7,1.42,g);
    caja(0.7,0.6,0.08,vidrioM,-1.0,1.4,1.42,g);caja(0.7,0.6,0.08,vidrioM,1.0,1.4,1.42,g);
    paquete(g,0.75,0.3,1.95,0.6,0.4);
    var chk=new T.Group();var mc=M(c,{emissive:c,emissiveIntensity:0.9});
    var a=caja(0.25,0.7,0.25,mc,-0.25,-0.1,0,chk);a.rotation.z=0.75;var b=caja(0.25,1.3,0.25,mc,0.22,0.15,0,chk);b.rotation.z=-0.65;
    chk.position.set(0,4.6,0);g.add(chk);animables.push(function(t){chk.rotation.y=t*1.4;chk.position.y=4.6+Math.sin(t*2)*0.15;});
    return 5.3;}
  function mReloj(g,col){var c=new T.Color(col);
    caja(0.35,1.6,0.35,oscuro,0,0.8,0,g);caja(1.6,0.2,1.0,oscuro,0,0.1,0,g);
    var marco=new T.Mesh(new T.CylinderGeometry(1.75,1.75,0.45,48),M(c,{metalness:0.45,roughness:0.3}));marco.rotation.x=Math.PI/2;marco.position.set(0,3.2,0);marco.castShadow=true;g.add(marco);
    var cara=new T.Mesh(new T.CircleGeometry(1.5,48),M(0xfbf8ef));cara.position.set(0,3.2,0.24);g.add(cara);
    for(var i=0;i<12;i++){var m=caja(0.08,0.25,0.04,oscuro,Math.sin(i/12*Math.PI*2)*1.25,3.2+Math.cos(i/12*Math.PI*2)*1.25,0.27,g);m.rotation.z=-i/12*Math.PI*2;}
    var hora=new T.Group();hora.position.set(0,3.2,0.3);caja(0.12,0.75,0.04,oscuro,0,0.32,0,hora);g.add(hora);
    var min=new T.Group();min.position.set(0,3.2,0.33);caja(0.08,1.15,0.04,M(c),0,0.5,0,min);g.add(min);
    var flecha=new T.Mesh(new T.TorusGeometry(2.2,0.09,8,48,Math.PI*1.4),M(c,{emissive:c,emissiveIntensity:0.6}));flecha.position.set(0,3.2,0);g.add(flecha);
    animables.push(function(t){min.rotation.z=-t*1.6;hora.rotation.z=-t*0.14;flecha.rotation.z=t*0.8;});
    return 5.6;}
  function mCancelado(g,col){var c=new T.Color(col);
    var p=paquete(g,0,0.85,0,2.0,0.35);p.rotation.z=0.06;
    var x=new T.Group();var mx=M(c,{emissive:c,emissiveIntensity:0.9});
    var a=caja(0.35,2.2,0.35,mx,0,0,0,x);a.rotation.z=Math.PI/4;var b=caja(0.35,2.2,0.35,mx,0,0,0,x);b.rotation.z=-Math.PI/4;
    x.position.set(0,3.4,0);g.add(x);animables.push(function(t){x.rotation.y=t*1.2;var s=1+Math.sin(t*3)*0.06;x.scale.set(s,s,s);});
    return 4.6;}
  function mCalendario(g,col){var c=new T.Color(col);
    var cv=document.createElement('canvas');cv.width=256;cv.height=256;var x=cv.getContext('2d');
    x.fillStyle='#fbf8ef';x.fillRect(0,0,256,256);x.fillStyle=col;x.fillRect(0,0,256,70);
    x.fillStyle='#fff';x.font='bold 40px DM Sans,Arial';x.textAlign='center';x.fillText('ENTREGA',128,50);
    x.fillStyle='#23261c';x.font='bold 120px Arial';x.fillText(String(new Date().getDate()+1),128,190);
    x.strokeStyle='rgba(35,38,28,.25)';x.lineWidth=3;for(var i=1;i<4;i++){x.beginPath();x.moveTo(20,200+i*12);x.lineTo(236,200+i*12);x.stroke();}
    var tx=new T.CanvasTexture(cv);
    var tabla=caja(3.6,3.6,0.5,M(c,{metalness:0.3,roughness:0.4}),0,2.4,0,g);tabla.rotation.x=-0.12;
    var cara=new T.Mesh(new T.PlaneGeometry(3.3,3.3),new T.MeshStandardMaterial({map:tx,roughness:0.6}));cara.position.set(0,2.4,0.27);cara.rotation.x=-0.12;g.add(cara);
    [-1,1].forEach(function(sg){var an=new T.Mesh(new T.TorusGeometry(0.28,0.08,8,20),M(0x9aa0a6,{metalness:0.8,roughness:0.3}));an.position.set(sg*1.0,4.25,0.1);g.add(an);});
    caja(0.3,0.6,0.3,oscuro,-1.3,0.3,0,g);caja(0.3,0.6,0.3,oscuro,1.3,0.3,0,g);caja(3.2,0.18,0.5,oscuro,0,0.62,0,g);
    paquete(g,1.9,0.4,1.4,0.7,0.4);paquete(g,-2.0,0.4,1.2,0.6,-0.3);
    var halo=new T.Mesh(new T.TorusGeometry(2.3,0.07,8,48),M(c,{emissive:c,emissiveIntensity:0.8}));halo.position.set(0,2.4,0.1);g.add(halo);
    animables.push(function(t){g.rotation.y=Math.sin(t*0.6)*0.18;halo.scale.setScalar(1+Math.sin(t*2.4)*0.04);});
    return 4.6;}
  var CONSTR={en_bodega:mBodega,en_bodega_fecha:mCalendario,en_ruta:mCamion,entregado:mCasa,reprogramado:mReloj,cancelado:mCancelado};
  var silos={},neon={};
  // Ciudad de fondo: edificios con ventanas encendidas alrededor de la plataforma
  (function(){
    var cv=document.createElement('canvas');cv.width=64;cv.height=128;var x=cv.getContext('2d');x.fillStyle='#0e1009';x.fillRect(0,0,64,128);
    for(var yy=4;yy<128;yy+=9)for(var xx=4;xx<64;xx+=10){var on=Math.random();x.fillStyle=on>0.72?(on>0.94?'rgba(255,214,140,.95)':'rgba(255,190,100,.6)'):'rgba(14,16,10,1)';x.fillRect(xx,yy,6,5);}
    var tx=new T.CanvasTexture(cv);tx.wrapS=tx.wrapT=T.RepeatWrapping;
    for(var bi=0;bi<54;bi++){var ang=bi/54*Math.PI*2+Math.random()*0.06,rad=74+Math.random()*12,alto=4+Math.pow(Math.random(),1.6)*18,an=3+Math.random()*4;
      var mat=new T.MeshStandardMaterial({color:0x0c0e08,roughness:0.9,metalness:0.1,emissive:0xffffff,emissiveMap:tx,emissiveIntensity:0.55});
      mat.emissiveMap=tx.clone();mat.emissiveMap.needsUpdate=true;mat.emissiveMap.repeat.set(an/3,alto/6);mat.emissiveMap.offset.set(Math.random(),Math.random());
      var ed=new T.Mesh(new T.BoxGeometry(an,alto,an),mat);ed.position.set(Math.cos(ang)*rad,alto/2,Math.sin(ang)*rad);ed.rotation.y=-ang;E.sc.add(ed);
      if(Math.random()<0.25){var luz=new T.Mesh(new T.SphereGeometry(0.22,8,8),new T.MeshBasicMaterial({color:0xff4040}));luz.position.set(ed.position.x,alto+0.3,ed.position.z);E.sc.add(luz);animables.push((function(l,f){return function(t){l.visible=Math.sin(t*3+f)>0.2;};})(luz,Math.random()*6));}}
  })();
  // Polvo dorado flotando
  (function(){var n=260,pp=new Float32Array(n*3),sp=[];for(var i=0;i<n;i++){pp[i*3]=(Math.random()-0.5)*80;pp[i*3+1]=1+Math.random()*16;pp[i*3+2]=(Math.random()-0.5)*80;sp.push(0.2+Math.random()*0.5);}
    var g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pp,3));
    var c2=document.createElement('canvas');c2.width=c2.height=32;var x2=c2.getContext('2d');var gr2=x2.createRadialGradient(16,16,0,16,16,16);gr2.addColorStop(0,'rgba(255,230,160,1)');gr2.addColorStop(1,'rgba(255,230,160,0)');x2.fillStyle=gr2;x2.fillRect(0,0,32,32);
    var polvo=new T.Points(g,new T.PointsMaterial({size:0.35,map:new T.CanvasTexture(c2),transparent:true,opacity:0.55,depthWrite:false,blending:T.AdditiveBlending}));E.sc.add(polvo);
    animables.push(function(t){for(var i=0;i<n;i++){pp[i*3+1]+=0.006*sp[i];if(pp[i*3+1]>17)pp[i*3+1]=1;}g.attributes.position.needsUpdate=true;});})();
  function texCanvas(dib){var c=document.createElement('canvas');c.width=c.height=128;dib(c.getContext('2d'));return new T.CanvasTexture(c);}
  var texHalo=texCanvas(function(x){var g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(0.35,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);});
  var texHaz=texCanvas(function(x){var g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.75,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,1)');x.fillStyle=g;x.fillRect(0,0,128,128);});
  Object.keys(nodos).forEach(function(k,i){var n=nodos[k];var col=new T.Color(n.c);
    var base=new T.Mesh(new T.CylinderGeometry(4.9,5.2,0.5,56),new T.MeshStandardMaterial({color:0x2f3424,roughness:0.6,metalness:0.4}));base.position.set(n.p[0],0.25,n.p[2]);base.receiveShadow=true;E.sc.add(base);
    var aro=new T.Mesh(new T.TorusGeometry(4.95,0.09,12,72),new T.MeshBasicMaterial({color:col}));aro.rotation.x=Math.PI/2;aro.position.set(n.p[0],0.52,n.p[2]);E.sc.add(aro);
    var g=new T.Group();g.position.set(n.p[0]-0.6,0.5,n.p[2]);g.scale.setScalar(0.001);E.sc.add(g);
    var hm=CONSTR[k](g,n.c);
    // pila de cajas = volumen
    var pila=new T.Group();pila.position.set(n.p[0]+3.3,0.5,n.p[2]-1.6);E.sc.add(pila);
    var niveles=vals[k]?Math.max(1,Math.round(9*Math.sqrt(vals[k]/max))):0,cajasP=[];
    for(var j=0;j<niveles;j++){var pq=paquete(pila,(Math.random()-0.5)*0.14,0.42+j*0.8,(Math.random()-0.5)*0.14,1.0,(Math.random()-0.5)*0.5);pq.visible=false;cajasP.push(pq);}
    base.userData.k=k;g.userData.k=k;pila.userData.k=k;clicables.push(base,g,pila);
    // Neón: halo en el piso, cortina de luz sobre el aro y onda que se expande.
    var halo=new T.Mesh(new T.PlaneGeometry(17,17),new T.MeshBasicMaterial({map:texHalo,color:col,transparent:true,opacity:0.55,depthWrite:false,blending:T.AdditiveBlending}));halo.rotation.x=-Math.PI/2;halo.position.set(n.p[0],0.06,n.p[2]);E.sc.add(halo);
    var haz=new T.Mesh(new T.CylinderGeometry(4.95,4.95,7,56,1,true),new T.MeshBasicMaterial({map:texHaz,color:col,transparent:true,opacity:0.32,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));haz.position.set(n.p[0],0.5+3.5,n.p[2]);E.sc.add(haz);
    var onda=new T.Mesh(new T.RingGeometry(4.9,5.25,72),new T.MeshBasicMaterial({color:col,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));onda.rotation.x=-Math.PI/2;onda.position.set(n.p[0],0.55,n.p[2]);E.sc.add(onda);
    aro.material.color=col.clone().multiplyScalar(1.6);
    neon[k]={halo:halo,haz:haz,onda:onda,fase:i*0.7,golpe:-10};
    silos[k]={g:g,cajas:cajasP,hm:hm,hp:niveles*0.8+0.5,delay:i*0.15,n:n};
  });
  // tubos + partículas
  var rutas=[['en_bodega','en_ruta',salieron]].concat(finales.map(function(k){return['en_ruta',k,vals[k]];}));
  var totalFlujo=rutas.reduce(function(a,r){return a+r[2];},0)||1;
  var curvas=[],N=0,pistas=[],camiones=[],mtx=new T.Matrix4(),tmpQ=new T.Vector3(),tmpQ2=new T.Vector3(),eje=new T.Vector3(0,1,0),quat=new T.Quaternion();
  rutas.forEach(function(r){var a=nodos[r[0]].p,b=nodos[r[1]].p;
    var p0=new T.Vector3(a[0]+3.2,2.6,a[2]),p3=new T.Vector3(b[0]-3.6,2.6,b[2]);
    var cur=new T.CubicBezierCurve3(p0,new T.Vector3(p0.x+5,5.5,a[2]),new T.Vector3(p3.x-5,5.5,b[2]),p3);
    var grosor=0.18+0.55*Math.sqrt(r[2]/totalFlujo);
    E.sc.add(new T.Mesh(new T.TubeGeometry(cur,64,grosor,16,false),new T.MeshPhysicalMaterial({color:new T.Color(nodos[r[1]].c),transparent:true,opacity:0.18,roughness:0.1,depthWrite:false})));
    var n=r[2]?Math.max(6,Math.round(520*r[2]/totalFlujo)):0;curvas.push({cur:cur,n:n,col:new T.Color(nodos[r[1]].c),g:grosor});N+=n;
    // Calle en el piso con luces de pista que avanzan hacia el destino
    var q0=new T.Vector3(a[0]+5,0,a[2]),q3=new T.Vector3(b[0]-5,0,b[2]);
    var calleC=new T.CubicBezierCurve3(q0,new T.Vector3(q0.x+6,0,a[2]),new T.Vector3(q3.x-6,0,b[2]),q3);
    var pts=calleC.getSpacedPoints(60),ancho=1.25,vs=[],ix=[];
    for(var pi=0;pi<pts.length;pi++){var pa=pts[Math.max(0,pi-1)],pb=pts[Math.min(pts.length-1,pi+1)];var dx=pb.x-pa.x,dz=pb.z-pa.z,L=Math.hypot(dx,dz)||1;var nx=-dz/L*ancho,nz=dx/L*ancho;
      vs.push(pts[pi].x+nx,0.045,pts[pi].z+nz,pts[pi].x-nx,0.045,pts[pi].z-nz);if(pi>0){var o=(pi-1)*2;ix.push(o,o+1,o+2,o+1,o+3,o+2);}}
    var cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(vs,3));cg.setIndex(ix);cg.computeVertexNormals();
    var calle=new T.Mesh(cg,new T.MeshStandardMaterial({color:0x12150d,roughness:0.35,metalness:0.4,side:T.DoubleSide}));calle.receiveShadow=true;E.sc.add(calle);
    [ancho,-ancho].forEach(function(sg){var bp=[];for(var pi=0;pi<pts.length;pi++){var pa=pts[Math.max(0,pi-1)],pb=pts[Math.min(pts.length-1,pi+1)];var dx=pb.x-pa.x,dz=pb.z-pa.z,L=Math.hypot(dx,dz)||1;bp.push(new T.Vector3(pts[pi].x-dz/L*sg,0.06,pts[pi].z+dx/L*sg));}
      E.sc.add(new T.Line(new T.BufferGeometry().setFromPoints(bp),new T.LineBasicMaterial({color:new T.Color(nodos[r[1]].c),transparent:true,opacity:0.55})));});
    var nLuces=14,luces=new T.InstancedMesh(new T.BoxGeometry(0.75,0.06,0.22),new T.MeshBasicMaterial({color:new T.Color(nodos[r[1]].c).multiplyScalar(1.5),transparent:true,opacity:0.95,blending:T.AdditiveBlending,depthWrite:false}),nLuces);
    E.sc.add(luces);pistas.push({cur:calleC,mesh:luces,n:nLuces,vel:0.06+0.08*Math.sqrt(r[2]/totalFlujo)});
    // Camioncitos circulando (más volumen = más camiones)
    var nCam=r[2]?Math.max(1,Math.min(4,Math.round(4*Math.sqrt(r[2]/totalFlujo)+0.3))):0;
    for(var ci=0;ci<nCam;ci++){var mc=new T.Group();var colD=new T.Color(nodos[r[1]].c);
      var cja=new T.Mesh(new T.BoxGeometry(1.5,0.9,0.85),blanco);cja.position.set(-0.25,0.75,0);cja.castShadow=true;mc.add(cja);
      var cab=new T.Mesh(new T.BoxGeometry(0.6,0.7,0.85),M(colD,{metalness:0.3}));cab.position.set(0.8,0.65,0);cab.castShadow=true;mc.add(cab);
      [[-0.6,0.42],[-0.6,-0.42],[0.7,0.42],[0.7,-0.42]].forEach(function(w){var rr=new T.Mesh(new T.CylinderGeometry(0.2,0.2,0.12,12),oscuro);rr.rotation.x=Math.PI/2;rr.position.set(w[0],0.22,w[1]);mc.add(rr);});
      var faro=new T.Mesh(new T.BoxGeometry(0.06,0.12,0.6),new T.MeshBasicMaterial({color:0xfff2c0}));faro.position.set(1.12,0.55,0);mc.add(faro);
      var cono=new T.Mesh(new T.PlaneGeometry(3.2,1.6),new T.MeshBasicMaterial({map:texHalo,color:0xffe8a0,transparent:true,opacity:0.45,depthWrite:false,blending:T.AdditiveBlending}));cono.rotation.x=-Math.PI/2;cono.position.set(2.4,0.07,0);mc.add(cono);
      mc.scale.setScalar(0.9);E.sc.add(mc);camiones.push({g:mc,cur:calleC,f0:ci/nCam,vel:0.035+0.03*Math.random()});}
  });
  var pos=new Float32Array(N*3),colr=new Float32Array(N*3),fase=[],vel=[],cid=[],off=[];
  var idx=0;curvas.forEach(function(c,ci){for(var i=0;i<c.n;i++){fase.push(Math.random());vel.push(0.08+Math.random()*0.07);cid.push(ci);off.push([(Math.random()-0.5)*c.g*1.4,(Math.random()-0.5)*c.g*1.4]);colr[idx*3]=c.col.r;colr[idx*3+1]=c.col.g;colr[idx*3+2]=c.col.b;idx++;}});
  var pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pos,3));pg.setAttribute('color',new T.BufferAttribute(colr,3));
  var cv=document.createElement('canvas');cv.width=cv.height=64;var cx=cv.getContext('2d');var gr=cx.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.35,'rgba(255,255,255,.8)');gr.addColorStop(1,'rgba(255,255,255,0)');cx.fillStyle=gr;cx.fillRect(0,0,64,64);
  var pts=new T.Points(pg,new T.PointsMaterial({size:0.75,map:new T.CanvasTexture(cv),vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));E.sc.add(pts);
  // etiquetas
  var chico=(ui.labels.clientWidth||900)<600;
  var factorCuenta=0;
  function pintar(L){var k=L.k,n=nodos[k],el=L.el;var mostrar=Math.round(vals[k]*factorCuenta);
    var pct=k==='en_bodega'||k==='en_bodega_fecha'||k==='en_ruta'?'':(salieron?' · '+Math.round(vals[k]/salieron*100)+'%':'');
    el.innerHTML='<div style="font-family:Bebas Neue;font-size:'+(chico?20:30)+'px;line-height:1;color:#fff;text-shadow:0 0 18px '+n.c+',0 3px 0 rgba(0,0,0,.4)">'+mostrar.toLocaleString('es-CL')+'</div>'
      +'<div style="margin-top:3px;padding:'+(chico?'1px 6px':'2px 10px')+';border-radius:999px;background:rgba(20,22,15,.75);border:1px solid '+n.c+';color:#fff;font:700 '+(chico?9:11)+'px DM Sans,system-ui,sans-serif">'+n.l+(k==='en_ruta'?' ahora':'')+pct+'</div>'+(k==='en_ruta'?'<div style="margin-top:3px;font:700 '+(chico?9:11)+'px DM Sans,system-ui,sans-serif;color:rgba(233,228,210,.8)">salieron '+salieron.toLocaleString('es-CL')+'</div>':(subNodo(k)?'<div style="margin-top:3px;font:700 '+(chico?9:11)+'px DM Sans,system-ui,sans-serif;color:rgba(233,228,210,.8)">'+subNodo(k)+'</div>':''));}
  ui.labels.innerHTML='';var labs=Object.keys(nodos).map(function(k){var el=document.createElement('div');
    el.style.cssText='position:absolute;transform:translate(-50%,-100%);pointer-events:auto;cursor:pointer;text-align:center;white-space:nowrap';el.title='Ver por comuna';el.onclick=function(){ui.onNodo&&ui.onNodo(k);};
    var L={el:el,k:k};pintar(L);ui.labels.appendChild(el);return L;});
  // En vivo: un envío cambió de estado -> mueve el conteo, repinta etiquetas y dispara un destello en el destino.
  E.evento=function(desdeE,haciaE,codigo){
    var desde=nodoDe(desdeE),hacia=nodoDe(haciaE);
    if(desdeE&&det[desdeE]>0)det[desdeE]--;if(haciaE)det[haciaE]=(det[haciaE]||0)+1;
    if(desde===hacia){labs.forEach(pintar);return;}
    var cambio=false;
    if(desde&&vals[desde]!=null&&vals[desde]>0){vals[desde]--;cambio=true;}
    if(hacia&&vals[hacia]!=null){vals[hacia]++;cambio=true;}
    var antes=desde==='en_ruta'||finales.indexOf(desde)>=0,ahora=hacia==='en_ruta'||finales.indexOf(hacia)>=0;
    if(ahora&&!antes)salieron++;if(antes&&!ahora&&salieron>0)salieron--;
    if(!cambio)return;
    labs.forEach(pintar);
    if(hacia&&neon[hacia]){neon[hacia].golpe=(performance.now()-E.t0)/1000;
      var Lh=labs.filter(function(x){return x.k===hacia;})[0];
      if(Lh){var f=document.createElement('div');f.textContent='+1';f.style.cssText='position:absolute;left:50%;top:-6px;transform:translate(-50%,0);font:900 22px Bebas Neue,sans-serif;color:'+nodos[hacia].c+';text-shadow:0 0 14px '+nodos[hacia].c+';pointer-events:none;transition:transform 1.4s ease-out,opacity 1.4s ease-out';Lh.el.appendChild(f);requestAnimationFrame(function(){f.style.transform='translate(-50%,-38px)';f.style.opacity='0';});setTimeout(function(){f.remove();},1500);}
    }
  };
  var v=new T.Vector3(),tmp=new T.Vector3();
  E.setTick(function(t){
    Object.keys(silos).forEach(function(k){var s=silos[k];var q=Math.max(0,Math.min(1,(t-s.delay)/0.9));var e=q<1?1-Math.pow(1-q,3)*Math.cos(q*5):1;s.g.scale.setScalar(Math.max(0.001,e*1.4));var vis=Math.floor(Math.max(0,t-s.delay-0.3)/0.07);s.cajas.forEach(function(c,ci){c.visible=ci<vis;});});
    animables.forEach(function(f){f(t);});
    Object.keys(neon).forEach(function(k){var nn=neon[k];var dt=t-nn.golpe,gol=dt>=0&&dt<1.6?1-dt/1.6:0;
      nn.halo.material.opacity=0.42+0.14*Math.sin(t*1.6+nn.fase)+0.5*gol;
      nn.haz.material.opacity=0.22+0.08*Math.sin(t*2.1+nn.fase)+0.45*gol;
      var ph=gol>0?(1-gol):((t*0.45+nn.fase)%1);var sc=1+ph*(gol>0?1.1:0.45);nn.onda.scale.set(sc,sc,1);nn.onda.material.opacity=(gol>0?0.95:0.5)*(1-ph);});
    camiones.forEach(function(C){var f=(C.f0+t*C.vel)%1;C.cur.getPointAt(f,tmpQ);C.cur.getTangentAt(f,tmpQ2);C.g.position.set(tmpQ.x,0.05+Math.abs(Math.sin(t*14+C.f0*9))*0.04,tmpQ.z);C.g.rotation.y=Math.atan2(-tmpQ2.z,tmpQ2.x);
      var fin=f>0.93?(1-f)/0.07:(f<0.07?f/0.07:1);C.g.scale.setScalar(0.9*Math.max(0.001,fin));});
    if(t<2.2){var e2=Math.min(1,t/1.8);e2=1-Math.pow(1-e2,3);factorCuenta=e2;labs.forEach(pintar);}else if(factorCuenta<1){factorCuenta=1;labs.forEach(pintar);}
    pistas.forEach(function(P){for(var li=0;li<P.n;li++){var f=((li/P.n)+t*P.vel)%1;P.cur.getPointAt(f,tmpQ);P.cur.getTangentAt(f,tmpQ2);quat.setFromAxisAngle(eje,Math.atan2(-tmpQ2.z,tmpQ2.x));tmpQ.y=0.08;mtx.compose(tmpQ,quat,new T.Vector3(1,1,1));P.mesh.setMatrixAt(li,mtx);}P.mesh.instanceMatrix.needsUpdate=true;});
    var i=0;curvas.forEach(function(c){for(var j=0;j<c.n;j++){var f=(fase[i]+t*vel[i])%1;c.cur.getPointAt(f,tmp);pos[i*3]=tmp.x+off[i][0];pos[i*3+1]=tmp.y+off[i][1];pos[i*3+2]=tmp.z+off[i][0]*0.6;i++;}});
    pg.attributes.position.needsUpdate=true;
    labs.forEach(function(L){var s=silos[L.k];v.set(s.n.p[0]+0.6,Math.max(s.hm*1.4,s.hp)+1.6,s.n.p[2]);var p=proyectar(E,v,cont);L.el.style.left=p.x+'px';L.el.style.top=p.y+'px';L.el.style.display=p.vis?'block':'none';});
  });
  E.start();return E;
}

// ── Componente ──

// Vista de respaldo sin 3D (equipos sin WebGL disponible): mismos datos en tarjetas y barras.
function Vista2D(p){
  var res=p.res,c=res.cnt,f=function(n){return (n||0).toLocaleString('es-CL');};
  var cuerpo;
  if(p.modo==='flujo'){
    var salieron=(c.en_ruta||0)+(c.entregado||0)+(c.reprogramado||0)+(c.cancelado||0)+(c.siniestro||0)+(c.retorno||0)+(c.en_bodega_cancelado||0);
    var et=[['En bodega',(c.en_bodega||0),'#4fb3d9'],['Bodega por fecha',(c.en_bodega_fecha||0),'#5b8def'],['En ruta ahora',c.en_ruta||0,'#e8c766'],['Entregado',c.entregado||0,'#36c47f'],['Reprogramado',c.reprogramado||0,'#c58cff'],['Cancelado / retorno',(c.cancelado||0)+(c.retorno||0)+(c.siniestro||0)+(c.en_bodega_cancelado||0),'#ff7b70']];
    cuerpo=h('div',{style:{display:'flex',alignItems:'stretch',gap:10,flexWrap:'wrap',justifyContent:'center',padding:'0 10px'}},et.map(function(x,i){
      return h('div',{key:x[0],style:{flex:'1 1 130px',maxWidth:180,padding:'16px 14px',borderRadius:16,textAlign:'center',background:'linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,.03))',border:'1px solid '+x[2]+'88',boxShadow:'0 0 18px '+x[2]+'33, inset 0 1px 0 rgba(255,255,255,.08)'}},
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:40,lineHeight:1,color:x[2],textShadow:'0 0 16px '+x[2]+'66'}},f(x[1])),
        h('div',{style:{fontSize:11.5,fontWeight:800,letterSpacing:1,textTransform:'uppercase',color:'rgba(233,228,210,.85)',marginTop:6}},x[0]),
        i>=3&&salieron>0&&h('div',{style:{fontSize:11,color:'rgba(233,228,210,.6)',marginTop:3}},(Math.round(x[1]/salieron*1000)/10)+'% de los que salieron'));}));
  }else{
    var top=res.datos.slice().sort(function(a,b){return b.total-a.total;}).slice(0,10),max=top.length?top[0].total:1;
    cuerpo=h('div',{style:{width:'100%',maxWidth:640,padding:'0 18px'}},top.map(function(d){var ef=d.ef,col=ef==null?'#b9b5a5':ef>=0.95?'#36c47f':ef>=0.85?'#e8b84a':'#e0473f';
      return h('div',{key:d.n,style:{marginBottom:9}},
        h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:12.5,fontWeight:700,color:'#f1ecda',marginBottom:3}},h('span',null,titulo(d.n)),h('span',null,f(d.total)+' · '+(ef==null?'—':(Math.round(ef*1000)/10)+'%'))),
        h('div',{style:{height:10,borderRadius:6,background:'rgba(255,255,255,.08)',overflow:'hidden'}},h('div',{style:{width:Math.max(3,d.total/max*100)+'%',height:'100%',borderRadius:6,background:'linear-gradient(90deg,'+col+'aa,'+col+')',boxShadow:'0 0 10px '+col+'66'}})));}));
  }
  return h('div',{style:{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:18,padding:'20px 0'}},
    cuerpo,
    h('div',{style:{display:'flex',alignItems:'center',gap:10,fontSize:11.5,color:'rgba(233,228,210,.6)'}},
      'Vista simple: este equipo no permitió dibujar en 3D.',
      h('button',{type:'button',onClick:p.onReintentar,style:{padding:'6px 12px',borderRadius:9,cursor:'pointer',fontWeight:800,fontSize:11.5,border:'1px solid #e8c766',background:'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)',color:'#1a1d13',boxShadow:'0 2px 0 #6d531a'}},'Reintentar 3D')));
}


// Aviso flotante del último movimiento en vivo (abajo a la derecha del escenario).
var NOM_EST={en_bodega:'En bodega',en_ruta:'En ruta',entregado:'Entregado',reprogramado:'Reprogramado',cancelado:'Cancelado',siniestro:'Siniestro',retorno:'Retorno',en_bodega_cancelado:'Bodega cancelado',en_bodega_fecha:'Bodega por fecha'};
var COL_EST={en_bodega_fecha:'#5b8def',en_bodega:'#4aa3c8',en_ruta:'#e8b84a',entregado:'#36c47f',reprogramado:'#b06ad6',cancelado:'#e0473f'};
function AvisoVivo(p){var e=p.ev,col=COL_EST[e.estado]||'#e8c766';
  return h('div',{style:{position:'absolute',right:16,bottom:14,zIndex:3,display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderRadius:12,background:'rgba(16,18,12,.9)',border:'1px solid '+col,boxShadow:'0 0 18px '+col+'55',animation:'ccVivoIn 8s ease forwards',pointerEvents:'none'}},
    h('style',null,'@keyframes ccVivoIn{0%{opacity:0;transform:translateY(8px)}6%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0}}@keyframes ccDot{0%,100%{opacity:1}50%{opacity:.3}}'),
    h('span',{style:{width:8,height:8,borderRadius:'50%',background:'#36c47f',boxShadow:'0 0 8px #36c47f',animation:'ccDot 1s infinite'}}),
    h('span',{style:{fontSize:12,fontWeight:800,color:'rgba(233,228,210,.75)',letterSpacing:1}},'EN VIVO'),
    h('span',{style:{fontSize:12.5,fontWeight:700,color:'#f1ecda'}},(e.mensajero?String(e.mensajero).replace(/,\s*/g,' ')+' · ':'')+(e.comuna?titulo(norm(e.comuna))+' · ':'')),
    h('span',{style:{fontSize:12.5,fontWeight:900,color:col}},NOM_EST[e.estado]||e.estado));
}

// Actividad en vivo: resumen de los últimos 15 minutos + lista de movimientos (de → a), con motivo
// cuando es reprogramado/cancelado/retorno. Se ve abajo a la derecha del escenario.
var MALOS={reprogramado:1,cancelado:1,retorno:1,siniestro:1,en_bodega_cancelado:1};
function FeedVivo(p){
  var ahora=Date.now(),ev=p.eventos,ult=ev.filter(function(e){return ahora-e.t<15*60000;});
  var c=function(est){return ult.filter(function(e){return e.estado===est;}).length;};
  var ent=c('entregado'),rep=c('reprogramado'),mal=ult.filter(function(e){return MALOS[e.estado]&&e.estado!=='reprogramado';}).length;
  var porMen={};ult.forEach(function(e){if(e.estado==='entregado'&&e.mensajero){porMen[e.mensajero]=(porMen[e.mensajero]||0)+1;}});
  var top=Object.keys(porMen).sort(function(a,b){return porMen[b]-porMen[a];})[0];
  var hm=function(t){return new Date(t).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',hour12:false});};
  var nm=function(s){return String(s||'').replace(/,\s*/g,' ');};
  var lista=p.abierto?ev:ev.slice(0,2);
  return h('div',{style:{position:'absolute',right:12,bottom:12,zIndex:3,width:360,maxWidth:'calc(100% - 24px)',borderRadius:14,background:'rgba(14,16,10,.92)',border:'1px solid rgba(232,199,102,.4)',boxShadow:'0 14px 30px rgba(0,0,0,.5)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',overflow:'hidden'}},
    h('style',null,'@keyframes ccDot{0%,100%{opacity:1}50%{opacity:.3}}@keyframes ccEvIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}'),
    h('div',{onClick:p.onToggle,style:{cursor:'pointer',padding:'9px 12px',borderBottom:'1px solid rgba(255,255,255,.08)'}},
      h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}},
        h('div',{style:{display:'flex',alignItems:'center',gap:7}},
          h('span',{style:{width:8,height:8,borderRadius:'50%',background:'#36c47f',boxShadow:'0 0 8px #36c47f',animation:'ccDot 1s infinite'}}),
          h('span',{style:{fontSize:11.5,fontWeight:900,letterSpacing:1.3,color:'#e8c766'}},'EN VIVO · ÚLTIMOS 15 MIN')),
        h('span',{style:{fontSize:11,fontWeight:800,color:'rgba(233,228,210,.65)'}},p.abierto?'Ver menos':'Ver todo ('+ev.length+')')),
      h('div',{style:{display:'flex',gap:12,marginTop:6,alignItems:'baseline',flexWrap:'wrap'}},
        h('span',null,h('b',{style:{fontFamily:'Bebas Neue',fontSize:24,color:'#36c47f',lineHeight:1}},ent),h('span',{style:{fontSize:11.5,color:'rgba(233,228,210,.75)',fontWeight:700}},' entregas')),
        h('span',null,h('b',{style:{fontFamily:'Bebas Neue',fontSize:24,color:'#b06ad6',lineHeight:1}},rep),h('span',{style:{fontSize:11.5,color:'rgba(233,228,210,.75)',fontWeight:700}},' reprog.')),
        h('span',null,h('b',{style:{fontFamily:'Bebas Neue',fontSize:24,color:mal?'#ff7b70':'rgba(233,228,210,.5)',lineHeight:1}},mal),h('span',{style:{fontSize:11.5,color:'rgba(233,228,210,.75)',fontWeight:700}},' cancel./ret.')),
        h('span',{style:{fontSize:11.5,color:'rgba(233,228,210,.75)',fontWeight:700}},'≈ '+(Math.round(ent/15*60))+' entregas/h')),
      top&&h('div',{style:{fontSize:11.5,color:'rgba(233,228,210,.75)',marginTop:3}},'Más activo: ',h('b',{style:{color:'#f1ecda'}},nm(top)),' · '+porMen[top]+' entrega'+(porMen[top]!==1?'s':''))),
    h('div',{style:{maxHeight:p.abierto?260:'none',overflowY:p.abierto?'auto':'visible'}},
      lista.map(function(e){var col=COL_EST[e.estado]||(MALOS[e.estado]?'#ff7b70':'#e8c766');var malo=MALOS[e.estado];
        return h('div',{key:e.t+e.codigo,style:{padding:'7px 12px',borderBottom:'1px solid rgba(255,255,255,.05)',borderLeft:'3px solid '+col,animation:'ccEvIn .35s ease-out',background:malo?'rgba(255,90,70,.06)':'transparent'}},
          h('div',{style:{display:'flex',justifyContent:'space-between',gap:8,alignItems:'baseline'}},
            h('span',{style:{fontSize:12.5,fontWeight:800,color:'#f1ecda',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},nm(e.mensajero)||'Sin mensajero'),
            h('span',{style:{fontSize:11,color:'rgba(233,228,210,.55)',fontFamily:'JetBrains Mono',flexShrink:0}},hm(e.t))),
          h('div',{style:{fontSize:11.5,color:'rgba(233,228,210,.75)',marginTop:1}},
            (NOM_EST[e.antes]||e.antes||'')+' → ',h('b',{style:{color:col}},NOM_EST[e.estado]||e.estado),
            ' · '+(e.comuna?titulo(norm(e.comuna)):'Sin comuna')+(e.cliente?' · '+e.cliente:'')),
          h('div',{style:{fontSize:10.5,color:'rgba(233,228,210,.5)',fontFamily:'JetBrains Mono',marginTop:1}},e.codigo),
          malo&&e.nota&&h('div',{style:{fontSize:11.5,color:'#ffb4a8',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},title:e.nota},'Motivo: '+e.nota));})));
}
// Detalle por comuna de una estación del flujo (solo comuna y cantidad).
var NODO_INFO={en_bodega:['En bodega','#4aa3c8','pendientes en bodega'],en_bodega_fecha:['Bodega por fecha','#5b8def','esperando su fecha de entrega'],en_ruta:['En ruta ahora','#e8b84a','todavía en ruta'],entregado:['Entregado','#36c47f','entregados'],reprogramado:['Reprogramado','#b06ad6','reprogramados'],cancelado:['Cancelado y retorno','#e0473f','cancelados, retornos y siniestros']};
function DetalleNodo(p){
  var inf=NODO_INFO[p.k]||[p.k,'#e8c766',''];
  var m={},vv=p.vivo||{};p.envios.forEach(function(e){if(nodoDe(vv[e.codigo]||e.estado)!==p.k)return;var c=e.comuna&&String(e.comuna).trim()?titulo(norm(e.comuna)):'Sin comuna';m[c]=(m[c]||0)+1;});
  var lista=Object.keys(m).map(function(c){return{c:c,n:m[c]};}).sort(function(a,b){return b.n-a.n||a.c.localeCompare(b.c,'es');});
  var tot=lista.reduce(function(a,x){return a+x.n;},0),max=lista.length?lista[0].n:1;
  return h('div',{style:{position:'absolute',top:12,left:12,bottom:12,width:300,maxWidth:'calc(100% - 24px)',zIndex:4,display:'flex',flexDirection:'column',borderRadius:16,background:'rgba(16,18,12,.94)',border:'1px solid '+inf[1],boxShadow:'0 18px 40px rgba(0,0,0,.55),0 0 24px '+inf[1]+'44',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',overflow:'hidden'}},
    h('div',{style:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,padding:'14px 16px 10px',borderBottom:'1px solid rgba(255,255,255,.08)'}},
      h('div',null,
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:1.6,color:inf[1],lineHeight:1}},inf[0]),
        h('div',{style:{fontSize:12.5,color:'rgba(233,228,210,.8)',marginTop:4,fontWeight:700}},tot.toLocaleString('es-CL')+' '+inf[2]+' · '+lista.length+' comuna'+(lista.length!==1?'s':''))),
      h('button',{type:'button',onClick:p.onClose,title:'Cerrar',style:{width:30,height:30,borderRadius:9,border:'1px solid rgba(255,255,255,.18)',background:'rgba(255,255,255,.06)',color:'#f1ecda',cursor:'pointer',fontSize:16,lineHeight:1,flexShrink:0}},'×')),
    lista.length===0?h('div',{style:{padding:16,fontSize:13,color:'rgba(233,228,210,.7)'}},'No hay envíos en este estado.'):
    h('div',{style:{overflowY:'auto',padding:'8px 12px 12px'}},lista.map(function(x){var sc=x.c==='Sin comuna';
      return h('div',{key:x.c,style:{padding:'7px 4px',borderBottom:'1px solid rgba(255,255,255,.05)'}},
        h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:10}},
          h('span',{style:{fontSize:13.5,fontWeight:700,color:sc?'#ffcf8a':'#f1ecda'}},x.c),
          h('span',{style:{fontFamily:'Bebas Neue',fontSize:21,color:'#fff',lineHeight:1}},x.n.toLocaleString('es-CL'))),
        h('div',{style:{height:5,marginTop:4,borderRadius:4,background:'rgba(255,255,255,.07)',overflow:'hidden'}},h('div',{style:{width:Math.max(3,x.n/max*100)+'%',height:'100%',borderRadius:4,background:inf[1],boxShadow:'0 0 8px '+inf[1]}})));})));
}
function CentroControl3D(props){
  var envios=props.envios||[];
  var _m=R.useState(function(){try{return localStorage.getItem('dash3d_modo')||'mapa';}catch(e){return 'mapa';}}),modo=_m[0],setModo=_m[1];
  var _g=R.useState(0),gen=_g[0],setGen=_g[1];
  var _e=R.useState(''),err=_e[0],setErr=_e[1];
  var reintRef=R.useRef(0);
  var deltasRef=R.useRef({});
  var _nd=R.useState(null),nodoSel=_nd[0],setNodoSel=_nd[1];
  // 10-11-2026: en vivo. Cada cambio de estado real (Supabase Realtime) mueve el conteo sin recargar la escena.
  var refE=R.useRef(null),vivoRef=R.useRef({});
  var _dl=R.useState({}),deltas=_dl[0],setDeltas=_dl[1];
  var _ul=R.useState([]),eventos=_ul[0],setEventos=_ul[1];
  var _fx=R.useState(false),feedAbierto=_fx[0],setFeedAbierto=_fx[1];
  var _tk=R.useState(0),setTick2=_tk[1];
  R.useEffect(function(){var iv=setInterval(function(){setTick2(function(x){return x+1;});},30000);return function(){clearInterval(iv);};},[]);
  var refNodo=R.useRef(setNodoSel);refNodo.current=setNodoSel;
  var refC=R.useRef(null),refTip=R.useRef(null),refLab=R.useRef(null);
  var res=R.useMemo(function(){
    var pc={},cnt={},sinCoord={};
    envios.forEach(function(e){cnt[e.estado]=(cnt[e.estado]||0)+1;if(!e.comuna)return;var k=coordDe(e.comuna);
      if(!k){var nn=norm(e.comuna);sinCoord[nn]=(sinCoord[nn]||0)+1;return;}
      var d=pc[k.n]||(pc[k.n]={n:k.n,c:k.c,total:0});d.total++;d[e.estado]=(d[e.estado]||0)+1;});
    // Efectividad por comuna con la fórmula oficial (Efectividad Total): entregados / (total − en_bodega_fecha).
    // Incluye siniestros, retornos y cancelados, que la operativa no ve.
    var INC=['cancelado','siniestro','retorno','en_bodega_cancelado'];
    var datos=Object.keys(pc).map(function(k){var d=pc[k];var den=d.total-(d.en_bodega_fecha||0);d.ef=den>0?(d.entregado||0)/den:null;
      d.inc=INC.reduce(function(a,x){return a+(d[x]||0);},0);d.sinEnt=den-(d.entregado||0);return d;});
    var conEf=datos.filter(function(d){return d.ef!=null&&d.total>=30;});
    var mejor=conEf.slice().sort(function(a,b){return b.ef-a.ef||b.total-a.total;})[0];
    var peor=conEf.slice().sort(function(a,b){return a.ef-b.ef||b.inc-a.inc;})[0];
    var masInc=datos.slice().sort(function(a,b){return b.inc-a.inc||(b.siniestro||0)-(a.siniestro||0);})[0];
    var sinComuna=0;envios.forEach(function(e){if(!e.comuna||!String(e.comuna).trim())sinComuna++;});
    var nSinCoord=Object.keys(sinCoord).reduce(function(a,k){return a+sinCoord[k];},0);
    var top=datos.slice().sort(function(a,b){return b.total-a.total;})[0];
    var key=datos.map(function(d){return d.n+':'+d.total+':'+(d.entregado||0);}).join('|')+'#'+JSON.stringify(cnt);
    var lo=peor?peor.ef:0.9,hi=mejor?mejor.ef:1;if(hi-lo<0.01)lo=Math.max(0,hi-0.01);
    return{datos:datos,cnt:cnt,mejor:mejor,peor:peor,masInc:masInc,top:top,key:key,nComunas:datos.length,lo:lo,hi:hi,sinComuna:sinComuna,nSinCoord:nSinCoord,total:envios.length};
  },[envios]);
  R.useEffect(function(){
    var m={};envios.forEach(function(e){m[e.codigo]=e.estado;});vivoRef.current=m;setDeltas({});
    var db=window.__app&&window.__app.db;if(!db||!db.channel||!envios.length)return;
    var canal=db.channel('cc3d-envios-'+Date.now()).on('postgres_changes',{event:'UPDATE',schema:'public',table:'envios'},function(pl){
      var nw=pl&&pl.new;if(!nw||!nw.codigo)return;var antes=vivoRef.current[nw.codigo];
      if(antes===undefined||antes===nw.estado)return;
      vivoRef.current[nw.codigo]=nw.estado;
      setDeltas(function(d){var x=Object.assign({},d);x[antes]=(x[antes]||0)-1;x[nw.estado]=(x[nw.estado]||0)+1;return x;});
      setEventos(function(ev){return [{codigo:nw.codigo,antes:antes,estado:nw.estado,mensajero:nw.mensajero,comuna:nw.comuna,cliente:nw.cliente,nota:nw.nota,t:Date.now()}].concat(ev).slice(0,60);});
      try{refE.current&&refE.current.evento&&refE.current.evento(antes,nw.estado,nw.codigo);}catch(e){}
    }).subscribe();
    return function(){try{db.removeChannel(canal);}catch(e){}};
  },[res.key]);
  R.useEffect(function(){
    var E=null,vivo=true;setErr('');
    if(!envios.length)return;
    Promise.all([cargarThree(),modo==='mapa'?cargarGeo():null]).then(function(rr){var T=rr[0],geo=rr[1];if(!vivo||!refC.current)return;
      var ui={lo:res.lo,hi:res.hi,tip:refTip.current,labels:refLab.current,onNodo:function(k){refNodo.current(function(prev){return k&&prev!==k?k:(k?null:null);});},onLost:function(){setTimeout(function(){setGen(function(g){return g+1;});},800);}};
      try{var cntVivo=Object.assign({},res.cnt);Object.keys(vivoRef.current).length&&Object.keys(deltasRef.current).forEach(function(k){cntVivo[k]=Math.max(0,(cntVivo[k]||0)+deltasRef.current[k]);});
        E=modo==='flujo'?montarFlujo(T,refC.current,cntVivo,ui):montarMapa(T,refC.current,res.datos,ui,geo);refE.current=E;reintRef.current=0;}
      catch(e){console.error('[cc3d]',e);
        try{refC.current.innerHTML='';if(refLab.current)refLab.current.innerHTML='';}catch(e2){}
        // Un reintento automático (el navegador a veces libera el contexto WebGL un momento después).
        if(reintRef.current<1){reintRef.current++;setTimeout(function(){if(vivo)setGen(function(g){return g+1;});},1200);}
        else setErr('3d');}
    }).catch(function(){setErr('3d');});
    return function(){vivo=false;refE.current=null;if(E)E.destroy();if(refLab.current)refLab.current.innerHTML='';};
  },[modo,res.key,gen]);
  function cambiar(m){setModo(m);try{localStorage.setItem('dash3d_modo',m);}catch(e){}}
  var tab=function(v,l){var a=modo===v;return h('button',{key:v,type:'button',onClick:function(){cambiar(v);},style:{padding:'8px 16px',borderRadius:10,border:'1px solid '+(a?'#e8c766':'rgba(255,255,255,.14)'),background:a?'linear-gradient(135deg,#e8c766,#b08a2e)':'rgba(255,255,255,.05)',color:a?'#1a1d13':'#e9e4d2',fontWeight:800,fontSize:12.5,letterSpacing:.4,cursor:'pointer',boxShadow:a?'0 6px 16px rgba(200,168,75,.35)':'none'}},l);};
  var ins=function(lbl,val,sub,col){return h('div',{key:lbl,style:{padding:'9px 12px',borderRadius:14,background:'linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.10)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.08)'}},
    h('div',{style:{fontSize:10.5,letterSpacing:1.6,textTransform:'uppercase',color:'rgba(233,228,210,.65)',fontWeight:800}},lbl),
    h('div',{title:typeof val==='string'?val:'',style:{fontFamily:'Bebas Neue',fontSize:24,lineHeight:1.05,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:col||'#fff',textShadow:'0 0 16px '+(col||'#fff')+'55'}},val),
    sub&&h('div',{style:{fontSize:11,lineHeight:1.35,color:'rgba(233,228,210,.78)'}},sub));};
  deltasRef.current=deltas;
  var c=Object.assign({},res.cnt);Object.keys(deltas).forEach(function(k){c[k]=Math.max(0,(c[k]||0)+deltas[k]);});
  var den=(c.entregado||0)+(c.reprogramado||0)+(c.cancelado||0);
  return h('div',{style:{position:'relative',marginBottom:20,borderRadius:20,overflow:'hidden',background:'radial-gradient(120% 90% at 30% 0%,#3a3f2b 0%,#22261a 45%,#14170f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 24px 50px rgba(20,22,15,.35), inset 0 1px 0 rgba(255,255,255,.08)'}},
    h('div',{className:'cc3d-head',style:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,padding:'16px 20px 0'}},
      h('div',null,
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:2.5,color:'#fff',lineHeight:1}},'Centro de control'),
        h('div',{className:'cc3d-sub',style:{fontSize:12,color:'rgba(233,228,210,.7)',marginTop:3}},modo==='mapa'?'Región Metropolitana · altura = envíos del período · color = efectividad total (rojo la más baja, verde la más alta) · arrastra para girar, rueda para acercar':'Recorrido de los envíos del período: de bodega a ruta y su resultado final')),
      h('div',{style:{display:'flex',gap:6}},tab('mapa','Mapa 3D de la RM'),tab('flujo','Flujo de estados'))),
    h('style',null,'@media (max-width:820px){.cc3d-grid{grid-template-columns:1fr!important}.cc3d-stage{height:330px!important}.cc3d-side{display:grid!important;grid-template-columns:1fr 1fr;padding:12px!important}.cc3d-side>*:last-child{grid-column:1/-1}.cc3d-head{padding:14px 14px 0!important}.cc3d-sub{display:none}}@media (max-width:420px){.cc3d-side{grid-template-columns:1fr}}'),
    h('div',{className:'cc3d-grid',style:{display:'grid',gridTemplateColumns:'minmax(0,1fr) 250px',gap:0}},
      h('div',{className:'cc3d-stage',style:{position:'relative',height:500,minWidth:0,touchAction:'pan-y'}},
        h('div',{ref:refC,style:{position:'absolute',inset:0}}),
        h('div',{ref:refLab,style:{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}),
        h('div',{ref:refTip,style:{position:'absolute',display:'none',pointerEvents:'none',zIndex:3,minWidth:190,padding:'10px 12px',borderRadius:12,background:'rgba(18,20,13,.92)',border:'1px solid rgba(200,168,75,.6)',color:'#fff',font:'12px DM Sans,system-ui,sans-serif',boxShadow:'0 14px 30px rgba(0,0,0,.45)',backdropFilter:'blur(6px)'}}),
        !envios.length&&h('div',{style:{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(233,228,210,.7)',fontSize:13}},'Sin envíos en el período.'),
        modo==='flujo'&&nodoSel&&h(DetalleNodo,{k:nodoSel,envios:envios,vivo:vivoRef.current,rev:deltas,onClose:function(){setNodoSel(null);}}),
        eventos.length>0&&h(FeedVivo,{eventos:eventos,abierto:feedAbierto,onToggle:function(){setFeedAbierto(!feedAbierto);}}),
        modo==='flujo'&&!nodoSel&&!err&&envios.length>0&&h('div',{style:{position:'absolute',left:16,bottom:14,fontSize:11.5,fontWeight:700,color:'rgba(233,228,210,.7)'}},'Toca una estación para ver sus comunas'),
        err&&envios.length>0&&h(Vista2D,{modo:modo,res:res,onReintentar:function(){reintRef.current=0;setErr('');setGen(function(g){return g+1;});}}),
        modo==='mapa'&&h('div',{style:{position:'absolute',left:16,bottom:14,display:'flex',alignItems:'center',gap:8,fontSize:11,color:'rgba(233,228,210,.8)',fontWeight:700}},
          'Efectividad',h('span',null,Math.floor(res.lo*1000)/10+'%'),h('span',{style:{width:120,height:8,borderRadius:6,background:'linear-gradient(90deg,#e0473f,#e8b84a,#36c47f)',boxShadow:'0 0 10px rgba(232,184,74,.4)'}}),h('span',null,Math.ceil(res.hi*1000)/10+'%'))),
      h('div',{className:'cc3d-side',style:{display:'flex',flexDirection:'column',gap:8,padding:'14px 16px 16px 4px'}},
        (function(){
          var tot=res.total,bf=c.en_bodega_fecha||0,denT=tot-bf,ent=c.entregado||0;
          var pend=(c.en_bodega||0)+(c.en_ruta||0)+(c.reprogramado||0);
          var inc=(c.cancelado||0)+(c.siniestro||0)+(c.retorno||0)+(c.en_bodega_cancelado||0);
          var f=function(n){return (n||0).toLocaleString('es-CL');};
          var p1=function(v){return (Math.round(v*1000)/10).toLocaleString('es-CL')+'%';};
          var partes=function(arr){return arr.filter(function(x){return x[0];}).map(function(x){return f(x[0])+' '+x[1];}).join(' · ');};
          var pe=res.peor,mi=res.masInc;
          return [
            ins('Efectividad total',denT>0?p1(ent/denT):'—',f(ent)+' entregados de '+f(denT)+(denT>0&&denT-ent>0?' · '+f(denT-ent)+' sin entregar':''),'#36c47f'),
            ins('Pendientes ahora',f(pend),pend?partes([[c.en_ruta,'en ruta'],[c.en_bodega,'en bodega'],[c.reprogramado,'reprog.']]):'Todo resuelto','#e8b84a'),
            ins('Incidencias',f(inc),inc?partes([[c.siniestro,'siniestros'],[c.retorno,'retornos'],[c.en_bodega_cancelado,'bodega canc.'],[c.cancelado,'cancel.']]):'Sin incidencias','#ff8f86'),
            ins('Comuna a revisar',pe?titulo(pe.n):'—',pe?p1(pe.ef)+' · '+f(pe.sinEnt)+' sin entregar de '+f(pe.total-(pe.en_bodega_fecha||0))+(pe.siniestro?' · '+pe.siniestro+' siniestro'+(pe.siniestro>1?'s':''):''):'Mín. 30 envíos','#ff6b5e'),
            mi&&mi.inc>0&&(!pe||mi.n!==pe.n)?ins('Más incidencias',titulo(mi.n),f(mi.inc)+' · '+partes([[mi.siniestro,'sin.'],[mi.retorno,'ret.'],[mi.en_bodega_cancelado,'bod. canc.'],[mi.cancelado,'canc.']]),'#ffb07a'):null,
            ins('Mayor volumen',res.top?titulo(res.top.n):'—',res.top?f(res.top.total)+' envíos · '+p1(res.top.total/(tot||1))+' del total':'','#ffe59a'),
            h('div',{key:'cob',style:{fontSize:11,color:'rgba(233,228,210,.7)',padding:'2px 4px',lineHeight:1.45}},
              f(res.nComunas)+' comunas con envíos',
              (res.sinComuna||res.nSinCoord)?h('div',{style:{color:'#ffcf8a',fontWeight:700}},
                [res.sinComuna?f(res.sinComuna)+' envíos sin comuna':null,res.nSinCoord?f(res.nSinCoord)+' con comuna no reconocida':null].filter(Boolean).join(' · ')+' (fuera del mapa)'):null)
          ];
        })())));
}
window.__dash3d={CentroControl3D:CentroControl3D};
})();
