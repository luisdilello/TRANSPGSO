// Cierre Flex (04-11-2026)
// El mensajero graba la pantalla "Mis viajes → <día>" de la app Envíos Flex de Mercado Libre y la
// sube aquí. El celular saca solo los cuadros necesarios (donde la lista avanzó), la función
// leer-cierre-flex lee cada código con su estado, y guardar_cierre_flex lo deja registrado.
// reporte_cierre_flex cruza esa lista con lo que el mensajero hizo en nuestra app ese día.
// La escritura pasa por el registro de handlers offline (tipo 'cierre_flex', ver index.html):
// sin señal, el cierre queda guardado en el celular y se envía solo después.
(function(){
  // Lo del sistema principal se toma de window.__app (el index no expone globales).
  var A=window.__app||{};
  var db=A.db,fechaHoyCL=A.fechaHoyCL,headersIA=A.headersIA,SUPA_URL=A.SUPA_URL||'https://tiambblslqdloeqdbhrs.supabase.co';
  function intentarConColaOffline(t,p,m){return (window.__app.intentarConColaOffline)(t,p,m);}
  var h=function(){return React.createElement.apply(React,arguments);};
  var LEER_URL=SUPA_URL+'/functions/v1/leer-cierre-flex';
  var MESES={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
  var ESTADOS={entregado:'Entregado',reprogramado:'Reprogramado',cancelado:'Cancelado',en_bodega_cancelado:'En bodega cancelado',siniestro:'Siniestro',retorno:'Retorno',en_ruta:'En ruta',en_bodega:'En bodega',en_bodega_fecha:'En bodega por fecha',sin_asignar:'Sin asignar'};
  function est(x){return ESTADOS[x]||x||'';}
  var CATS={
    ok:{t:'Coincide',n:0},
    ok_fallido:{t:'Cuadra: no se entregó en los dos lados',n:0},
    flex_e_nuestro_otro:{t:'Entregado en Flex, pero en nuestra app quedó {n}',n:2},
    flex_e_sin_nuestro:{t:'Entregado en Flex, pero no lo registró en nuestra app',n:2},
    flex_n_nuestro_e:{t:'Entregado en nuestra app, pero en Flex quedó No entregado',n:2},
    flex_n_sin_nuestro:{t:'Lo intentó en Flex, pero no lo registró en nuestra app',n:1},
    nuestro_e_sin_flex:{t:'Entregado en nuestra app, pero no aparece en Flex',n:2},
    nuestro_otro_sin_flex:{t:'Lo gestionó en nuestra app ({n}), pero no aparece en Flex',n:1},
    sin_cierre:{t:'Sin cierre Flex subido',n:1}
  };
  function significado(r){
    var c=CATS[r.categoria]||{t:r.categoria};
    var t=c.t.replace('{n}',est(r.nuestro).toLowerCase());
    if(r.categoria!=='ok'&&r.estado_actual){
      var m=(r.mensajero_actual||'').toUpperCase();
      if(m&&m!==(r.mensajero||'').toUpperCase())t+='. Hoy: '+est(r.estado_actual)+' con '+r.mensajero_actual;
      else if(r.estado_actual!==r.nuestro)t+='. Hoy: '+est(r.estado_actual);
    }
    return t;
  }
  function nivel(r){var c=CATS[r.categoria];return c?c.n:1;}

  // ── Fecha del encabezado ("3 de noviembre") ──
  function fechaDesdeTexto(txt,ref){
    var m=String(txt||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/(\d{1,2})\s+de\s+([a-z]+)/);
    if(!m||!MESES[m[2]])return null;
    var hoy=fechaHoyCL(ref);var anio=+hoy.slice(0,4),mesHoy=+hoy.slice(5,7),mes=MESES[m[2]];
    if(mes>mesHoy+1)anio--; // un video de diciembre subido en enero
    return anio+'-'+String(mes).padStart(2,'0')+'-'+String(+m[1]).padStart(2,'0');
  }

  // ── Cuadros del video ──
  // Se recorre el video cada 0,7 s y se compara el perfil de brillo por fila (zona de la lista)
  // con el último cuadro guardado: cuando la lista avanzó más de ~55% de la pantalla se guarda
  // el cuadro anterior (así siempre queda superposición y no se salta ninguna fila).
  function perfil(ctx,w,hh){
    var d=ctx.getImageData(0,0,w,hh).data,p=[];var t=Math.floor(hh*0.1),b=Math.floor(hh*0.9);
    for(var y=t;y<b;y++){var s=0;for(var x=0;x<w;x++){var i=(y*w+x)*4;s+=d[i]*0.3+d[i+1]*0.59+d[i+2]*0.11;}p.push(s/w);}
    return p;
  }
  function desplazamiento(p,q){
    var n=p.length,best=1e9,bs=0;
    for(var s=0;s<Math.floor(n*0.92);s++){var ov=n-s;if(ov<n*0.08)break;var e=0;for(var y=0;y<ov;y++)e+=Math.abs(p[y+s]-q[y]);e/=ov;if(e<best){best=e;bs=s;}}
    return{err:best,s:bs,L:n};
  }
  function esperar(el,ev,ms){return new Promise(function(res,rej){var t=setTimeout(function(){el.removeEventListener(ev,f);rej(new Error('El video no responde'));},ms||15000);function f(){clearTimeout(t);el.removeEventListener(ev,f);res();}el.addEventListener(ev,f);});}
  async function cuadrosDeVideo(file,onProg){
    var url=URL.createObjectURL(file);
    var v=document.createElement('video');v.muted=true;v.playsInline=true;v.setAttribute('playsinline','');v.preload='auto';v.src=url;
    try{
      v.load();await esperar(v,'loadeddata',20000);
      var dur=v.duration;if(!isFinite(dur)||dur<=0)throw new Error('No se pudo leer el video');
      var W=576,H=Math.round(v.videoHeight*W/v.videoWidth)||1280;
      var big=document.createElement('canvas');big.width=W;big.height=H;var bctx=big.getContext('2d');
      var sm=document.createElement('canvas');sm.width=72;sm.height=Math.round(72*H/W);var sctx=sm.getContext('2d',{willReadFrequently:true});
      var paso=dur>240?1.0:0.7;var tiempos=[];for(var t=0.05;t<dur-0.05;t+=paso)tiempos.push(t);tiempos.push(Math.max(0,dur-0.1));
      async function ir(t){v.currentTime=t;await esperar(v,'seeked',8000);}
      function capturar(){bctx.drawImage(v,0,0,W,H);return big.toDataURL('image/jpeg',0.75);}
      function perf(){sctx.drawImage(v,0,0,sm.width,sm.height);return perfil(sctx,sm.width,sm.height);}
      var out=[];await ir(tiempos[0]);out.push(capturar());var ult=perf();var prevT=tiempos[0],ultT=tiempos[0];
      for(var i=1;i<tiempos.length;i++){
        await ir(tiempos[i]);var p=perf();var d=desplazamiento(ult,p);
        if(d.err>8||d.s>d.L*0.55){
          if(prevT!==ultT){await ir(prevT);out.push(capturar());ult=perf();ultT=prevT;await ir(tiempos[i]);p=perf();d=desplazamiento(ult,p);}
          if(d.err>8||d.s>d.L*0.55){out.push(capturar());ult=p;ultT=tiempos[i];}
        }
        prevT=tiempos[i];
        if(onProg)onProg('Preparando video ('+Math.round(i/tiempos.length*100)+'%)…');
        if(out.length>=40)break;
      }
      if(ultT!==tiempos[tiempos.length-1]){await ir(tiempos[tiempos.length-1]);out.push(capturar());}
      return out;
    }finally{URL.revokeObjectURL(url);}
  }
  function cuadroDeImagen(file){return new Promise(function(res,rej){var u=URL.createObjectURL(file);var im=new Image();im.onload=function(){var W=576,H=Math.round(im.height*W/im.width);var c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(im,0,0,W,H);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',0.8));};im.onerror=function(){URL.revokeObjectURL(u);rej(new Error('No se pudo abrir la imagen'));};im.src=u;});}
  async function prepararCuadros(files,onProg){
    var out=[];
    for(var i=0;i<files.length;i++){
      var f=files[i];
      if(/^video\//.test(f.type)||/\.(mp4|mov|m4v|3gp|webm)$/i.test(f.name||''))out=out.concat(await cuadrosDeVideo(f,onProg));
      else out.push(await cuadroDeImagen(f));
    }
    return out.slice(0,40);
  }

  // ── Lectura + guardado (lo llama el handler offline 'cierre_flex') ──
  async function sincronizar(payload){
    var imgs=payload.imagenes||[];if(!imgs.length)throw new Error('Cierre Flex sin imágenes');
    var hdr=await headersIA();
    var filas=[],idx={},fechaTxt='';
    for(var i=0;i<imgs.length;i+=9){
      var lote=imgs.slice(i,i+10).map(function(x){return String(x).replace(/^data:image\/\w+;base64,/,'');});
      var r;
      try{r=await fetch(LEER_URL,{method:'POST',headers:hdr,body:JSON.stringify({imagenes:lote})});}
      catch(e){throw new Error('network: '+(e&&e.message||'sin conexión'));}
      if(r.status>=500||r.status===429)throw new Error('timeout lectura ('+r.status+')'); // reintentar después
      var d=await r.json().catch(function(){return{};});
      if(!r.ok)throw new Error(d.error||('Error '+r.status));
      if(d.fecha&&!fechaTxt)fechaTxt=d.fecha;
      (d.filas||[]).forEach(function(f){if(idx[f[0]]==null){idx[f[0]]=filas.length;filas.push(f);}else if(f[1]!=='P')filas[idx[f[0]]][1]=f[1];});
      if(i+10>=imgs.length)break;
    }
    if(!filas.length)throw new Error('SIN_FILAS: no se encontró la lista de envíos en el video. Abre Mis viajes, entra al día y graba bajando por la lista.');
    var fecha=fechaDesdeTexto(fechaTxt,payload.creado)||fechaHoyCL(payload.creado);
    var g=await db.rpc('guardar_cierre_flex',{p_fecha:fecha,p_filas:filas,p_fecha_pantalla:fechaTxt||null,p_n_imagenes:imgs.length,p_mensajero:payload.paraMensajero||null});
    if(g.error)throw g.error;
    payload.__res={fecha:fecha,fechaTxt:fechaTxt,filas:filas,mensajero:(g.data&&g.data.mensajero)||payload.mensajero};
  }

  function resumenFilas(filas){var e=0,n=0;filas.forEach(function(f){if(f[1]==='E')e++;else n++;});return{e:e,n:n};}
  function fechaBonita(f){var p=String(f).split('-');return p[2]+'-'+p[1]+'-'+p[0];}

  // ── App del mensajero ──
  function abrirRider(opts){
    var usuario=opts.usuario,toast=opts.toast||function(){};
    var f=document.createElement('div');
    f.style.cssText='position:fixed;inset:0;background:rgba(10,12,6,0.85);z-index:100000;display:flex;align-items:flex-end;justify-content:center';
    f.innerHTML='<div style="width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#1e2118;border-top:1px solid rgba(200,168,75,0.45);border-radius:20px 20px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom,0px));color:#fff;font-family:inherit">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-family:Bebas Neue,sans-serif;letter-spacing:2px;font-size:22px;color:#c8a84b">Cierre Flex del día</div><button data-x="cerrar" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:22px">×</button></div>'
      +'<div data-pasos style="font-size:13px;line-height:1.6;color:rgba(255,255,255,0.8);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;margin-bottom:14px">'
      +'<b style="color:#fff">1.</b> En la app Flex: <b style="color:#fff">Más → Mis viajes</b> → toca el día.<br><b style="color:#fff">2.</b> Graba la pantalla mientras bajas por la lista hasta el final.<br><b style="color:#fff">3.</b> Sube aquí ese video. También sirven capturas.</div>'
      +'<button data-x="subir" style="width:100%;padding:15px;border:none;border-radius:12px;background:#c8a84b;color:#1e2118;font-family:Bebas Neue,sans-serif;letter-spacing:2px;font-size:18px">Subir video</button>'
      +'<div data-prog style="margin-top:12px;font-size:13px;color:#e0a050;min-height:18px"></div>'
      +'<div data-res></div></div>';
    document.body.appendChild(f);
    function cerrar(){if(f.parentNode)f.parentNode.removeChild(f);}
    f.querySelector('[data-x=cerrar]').onclick=cerrar;
    var prog=f.querySelector('[data-prog]'),res=f.querySelector('[data-res]'),btn=f.querySelector('[data-x=subir]');
    btn.onclick=function(){
      var inp=document.createElement('input');inp.type='file';inp.accept='video/*,image/*';inp.multiple=true;
      inp.onchange=async function(){
        var files=Array.from(inp.files||[]);if(!files.length)return;
        btn.disabled=true;btn.style.opacity='.6';res.innerHTML='';
        try{
          prog.textContent='Preparando video…';
          var cuadros=await prepararCuadros(files,function(t){prog.textContent=t;});
          if(!cuadros.length)throw new Error('No se pudieron sacar imágenes del video.');
          prog.textContent='Leyendo la lista de Flex…';
          var payload={imagenes:cuadros,mensajero:usuario.nombre,creado:new Date().toISOString()};
          var r=await intentarConColaOffline('cierre_flex',payload,usuario.nombre);
          if(r&&r.offline){prog.textContent='';res.innerHTML='<div style="padding:12px;border-radius:10px;background:rgba(224,160,80,0.15);border:1px solid rgba(224,160,80,0.5);color:#e0a050;font-size:13px">Sin señal: tu cierre quedó guardado en el celular y se enviará solo cuando vuelva la conexión.</div>';return;}
          var x=payload.__res;var c=resumenFilas(x.filas);
          prog.textContent='';
          var html='<div style="padding:12px 14px;border-radius:12px;background:rgba(46,125,79,0.15);border:1px solid rgba(46,125,79,0.5);margin-bottom:12px"><div style="font-weight:800;color:#7fd19b;font-size:14px">Cierre registrado · '+(x.fechaTxt||fechaBonita(x.fecha))+'</div><div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px">'+x.filas.length+' envíos en Flex: '+c.e+' entregados, '+c.n+' no entregados.</div></div>';
          res.innerHTML=html+'<div data-dif style="font-size:13px;color:rgba(255,255,255,0.6)">Revisando contra nuestra app…</div>';
          var rep=await db.rpc('reporte_cierre_flex',{p_fecha:x.fecha,p_mensajero:null});
          var dif=((rep&&rep.data)||[]).filter(function(r){return r.categoria!=='ok'&&r.categoria!=='ok_fallido'&&r.categoria!=='sin_cierre'&&r.categoria!=='sin_movimiento';});
          var cont=res.querySelector('[data-dif]');
          if(!dif.length){cont.innerHTML='<div style="color:#7fd19b;font-weight:700">Todo cuadra con nuestra app.</div>';}
          else{
            cont.innerHTML='<div style="color:#e0a050;font-weight:800;margin-bottom:8px">'+dif.length+' diferencia'+(dif.length>1?'s':'')+' con nuestra app. Revísalas con tu supervisor:</div>'
              +dif.map(function(r){return '<div style="border:1px solid rgba(255,255,255,0.1);border-left:3px solid '+(nivel(r)>=2?'#e05050':'#e0a050')+';border-radius:0;padding:8px 10px;margin-bottom:6px;color:#fff"><div style="font-family:JetBrains Mono,monospace;font-size:13px">'+r.codigo+'</div><div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:2px">'+significado(r)+'</div></div>';}).join('');
          }
          toast('Cierre Flex registrado');
          if(opts.onListo){try{opts.onListo(new Date().toLocaleTimeString('es-CL',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit'}));}catch(_){}}
        }catch(e){
          prog.textContent='';
          var msg=String(e&&e.message||e).replace(/^SIN_FILAS:\s*/,'');
          res.innerHTML='<div style="padding:12px;border-radius:10px;background:rgba(224,80,80,0.15);border:1px solid rgba(224,80,80,0.5);color:#f0a0a0;font-size:13px">No se pudo registrar el cierre: '+msg.replace(/</g,'&lt;')+'</div>';
        }finally{btn.disabled=false;btn.style.opacity='1';btn.textContent='Subir otro video';}
      };
      inp.click();
    };
  }

  // ── Panel admin ──
  function Panel(props){
    var toast=props.toast||function(){};
    var mensajeros=props.mensajeros||[];
    var _f=React.useState(fechaHoyCL()),fecha=_f[0],setFecha=_f[1];
    var _d=React.useState(null),datos=_d[0],setDatos=_d[1];
    var _c=React.useState(false),cargando=_c[0],setCargando=_c[1];
    var _a=React.useState(null),abierto=_a[0],setAbierto=_a[1];
    var _s=React.useState(''),subiendo=_s[0],setSubiendo=_s[1];
    var _m=React.useState(''),mensSubir=_m[0],setMensSubir=_m[1];
    function cargar(fc){setCargando(true);db.rpc('reporte_cierre_flex',{p_fecha:fc||fecha,p_mensajero:null}).then(function(r){setCargando(false);if(r.error){toast('Error: '+r.error.message);return;}setDatos(r.data||[]);}).catch(function(e){setCargando(false);toast('Error: '+e.message);});}
    React.useEffect(function(){cargar(fecha);},[fecha]);
    var _o=React.useState([]),otrosDias=_o[0],setOtrosDias=_o[1];
    React.useEffect(function(){var desde=new Date(fechaHoyCL()+'T00:00:00-03:00').toISOString();db.from('cierres_flex').select('mensajero,fecha,updated_at').gte('updated_at',desde).neq('fecha',fecha).order('updated_at',{ascending:false}).limit(20).then(function(r){setOtrosDias((r&&r.data)||[]);},function(){});},[fecha,datos]);
    var grupos={};(datos||[]).forEach(function(r){var g=grupos[r.mensajero]||(grupos[r.mensajero]={m:r.mensajero,filas:[],subido:r.cierre_subido,hora:r.cierre_hora});if(r.categoria==='sin_movimiento'){g.sinMov=true;}else{g.filas.push(r);}});
    var lista=Object.keys(grupos).map(function(k){var g=grupos[k];
      g.flexE=g.filas.filter(function(r){return r.flex==='Entregado';}).length;
      g.flexN=g.filas.filter(function(r){return r.flex&&r.flex!=='Entregado';}).length;
      g.nuestrosE=g.filas.filter(function(r){return r.nuestro==='entregado';}).length;
      g.ok=g.filas.filter(function(r){return r.categoria==='ok'||r.categoria==='ok_fallido';}).length;
      g.dif=g.subido?g.filas.filter(function(r){return r.categoria!=='ok'&&r.categoria!=='ok_fallido';}):[];
      g.graves=g.dif.filter(function(r){return nivel(r)>=2;}).length;
      g.orden=g.subido?0:(g.filas.length?1:2);return g;}).sort(function(a,b){return (a.orden-b.orden)||(b.dif.length-a.dif.length)||a.m.localeCompare(b.m);});
    var conCierre=lista.filter(function(g){return g.subido;}),sinCierre=lista.filter(function(g){return !g.subido&&g.filas.length;}),sinMov=lista.filter(function(g){return !g.subido&&!g.filas.length;});
    var totDif=conCierre.reduce(function(a,g){return a+g.dif.length;},0);
    function exportar(){
      var rows=[];lista.forEach(function(g){(g.subido?g.dif:g.filas).forEach(function(r){rows.push([g.m,r.codigo,r.flex||(g.subido?'No aparece':'Sin cierre'),r.nuestro?(est(r.nuestro)+(r.hora?' '+r.hora:'')):'No lo registró',g.subido?significado(r):'Sin cierre Flex subido',r.cliente||'',r.comuna||'',est(r.estado_actual),r.mensajero_actual||'']);});});
      window.__app.exportToExcel('Cierre_Flex_'+fecha,[{name:'Diferencias',headers:['Mensajero','Código','En Flex','En nuestra app','Qué significa','Cliente','Comuna','Estado hoy','Mensajero hoy'],rows:rows},{name:'Resumen',headers:['Mensajero','Cierre subido','Entregados Flex','No entregados Flex','Entregados nuestra app','Coinciden','Diferencias'],rows:lista.map(function(g){return[g.m,g.subido?(g.hora||'Sí'):(g.filas.length?'No':'Sin movimiento Flex'),g.flexE,g.flexN,g.nuestrosE,g.ok,g.subido?g.dif.length:''];})}]);
    }
    function subirPorMensajero(){
      if(!mensSubir){toast('Elige el mensajero');return;}
      var inp=document.createElement('input');inp.type='file';inp.accept='video/*,image/*';inp.multiple=true;
      inp.onchange=async function(){var files=Array.from(inp.files||[]);if(!files.length)return;
        try{setSubiendo('Preparando video…');var cuadros=await prepararCuadros(files,function(t){setSubiendo(t);});setSubiendo('Leyendo la lista de Flex…');
          var p={imagenes:cuadros,mensajero:mensSubir,paraMensajero:mensSubir,creado:new Date().toISOString()};await sincronizar(p);
          setSubiendo('');toast('Cierre de '+mensSubir+' registrado ('+p.__res.filas.length+' envíos, '+(p.__res.fechaTxt||p.__res.fecha)+')');
          if(p.__res.fecha!==fecha)setFecha(p.__res.fecha);else cargar(fecha);
        }catch(e){setSubiendo('');toast('No se pudo leer: '+String(e.message||e).replace(/^SIN_FILAS:\s*/,''));}};
      inp.click();
    }
    var th={padding:'8px 10px',textAlign:'left',fontSize:11,letterSpacing:1,textTransform:'uppercase',color:'var(--text-soft)',borderBottom:'1px solid var(--border)'};
    var td={padding:'8px 10px',borderBottom:'1px solid var(--border)',fontSize:13,verticalAlign:'top'};
    function ayer(){var d=new Date(fecha+'T12:00:00');d.setDate(d.getDate()-1);setFecha(d.toISOString().slice(0,10));}
    return h('div',null,
      h('div',{className:'section-head'},h('div',{className:'section-title'},'Cierre ',h('span',null,'Flex')),
        h('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}},
          h('button',{className:'btn-secondary',onClick:ayer},'Día anterior'),
          h('input',{type:'date',className:'form-input',value:fecha,onChange:function(e){if(e.target.value)setFecha(e.target.value);},style:{width:160}}),
          h('button',{className:'btn-secondary',onClick:function(){cargar(fecha);}},'Actualizar'),
          h('button',{className:'btn-secondary',onClick:exportar,disabled:!lista.length},'Excel'))),
      h('div',{style:{fontSize:13,color:'var(--text-soft)',marginBottom:14,lineHeight:1.5}},'Cruce entre lo que cada mensajero cerró en la app Envíos Flex (video de "Mis viajes") y lo que registró en nuestra app ese día. Solo envíos Flex.'),
      h('div',{className:'stats-grid',style:{marginBottom:16}},
        h('div',{className:'stat-card'},h('div',{className:'stat-label'},'Cierres subidos'),h('div',{className:'stat-value',style:{fontSize:30}},conCierre.length),h('div',{className:'stat-sub'},'de '+(conCierre.length+sinCierre.length)+' mensajeros con Flex ese día')),
        h('div',{className:'stat-card'},h('div',{className:'stat-label'},'Diferencias'),h('div',{className:'stat-value',style:{fontSize:30,color:totDif?'#b00020':'#2e7d4f'}},totDif),h('div',{className:'stat-sub'},'en cierres subidos')),
        h('div',{className:'stat-card'},h('div',{className:'stat-label'},'Sin cierre'),h('div',{className:'stat-value',style:{fontSize:30,color:sinCierre.length?'#c98a1f':'#2e7d4f'}},sinCierre.length),h('div',{className:'stat-sub'},'con Flex que no subieron video'+(sinMov.length?(' · '+sinMov.length+' sin movimiento Flex'):'')))),
      otrosDias.length?h('div',{style:{marginBottom:14,padding:'10px 12px',borderRadius:10,border:'1px solid rgba(201,138,31,0.5)',background:'rgba(201,138,31,0.08)',fontSize:13}},h('b',null,'Cierres de otros días subidos hoy: '),otrosDias.map(function(c,i){return h('span',{key:i},i?' · ':'',c.mensajero+' ('+fechaBonita(c.fecha)+') ',h('a',{href:'#',onClick:function(e){e.preventDefault();setFecha(c.fecha);},style:{color:'#a0842a',fontWeight:700}},'Ver'));})):null,
      h('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:16,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:10,background:'var(--cream)'}},
        h('span',{style:{fontSize:13,fontWeight:700}},'Subir cierre por un mensajero:'),
        h('select',{className:'form-input',value:mensSubir,onChange:function(e){setMensSubir(e.target.value);},style:{width:240}},h('option',{value:''},'Elige mensajero'),mensajeros.filter(function(m){return m.activo!==false;}).map(function(m){return h('option',{key:m.id||m.nombre,value:(m.nombre||'').toUpperCase()},m.nombre);})),
        h('button',{className:'btn-primary',onClick:subirPorMensajero,disabled:!!subiendo},'Subir video'),
        subiendo&&h('span',{style:{fontSize:12,color:'#c98a1f'}},subiendo)),
      cargando&&!datos?h('div',{className:'empty-state'},'Cargando…'):
      !lista.length?h('div',{className:'empty-state'},'No hay mensajeros activos.'):
      h('div',{className:'table-wrap'},h('table',null,
        h('thead',null,h('tr',null,['Mensajero','Cierre Flex','Entregados Flex','No entregados Flex','Entregados nuestra app','Coinciden','Diferencias',''].map(function(x,i){return h('th',{key:i,style:th},x);}))),
        h('tbody',null,lista.map(function(g){
          var open=abierto===g.m;
          var filasDet=g.subido?g.dif:g.filas;
          return [h('tr',{key:g.m,style:{cursor:'pointer',background:open?'rgba(200,168,75,0.08)':undefined},onClick:function(){setAbierto(open?null:g.m);}},
              h('td',{style:Object.assign({},td,{fontWeight:700})},g.m),
              h('td',{style:td},g.subido?h('span',{style:{color:'#2e7d4f',fontWeight:700}},'Subido '+(g.hora||'')):g.filas.length?h('span',{style:{color:'#c98a1f',fontWeight:700}},'Sin cierre'):h('span',{style:{color:'var(--text-soft)'}},'Sin movimiento Flex')),
              h('td',{style:td},g.subido?g.flexE:'—'),h('td',{style:td},g.subido?g.flexN:'—'),h('td',{style:td},g.nuestrosE),
              h('td',{style:td},g.subido?g.ok:'—'),
              h('td',{style:Object.assign({},td,{fontWeight:800,color:!g.subido?'#c98a1f':g.graves?'#b00020':g.dif.length?'#c98a1f':'#2e7d4f'})},g.subido?(g.dif.length||'0'):'—'),
              h('td',{style:Object.assign({},td,{color:'var(--text-soft)'})},filasDet.length?(open?'Ocultar':'Ver'):'')),
            open&&filasDet.length?h('tr',{key:g.m+'_d'},h('td',{colSpan:8,style:{padding:'4px 10px 14px',background:'rgba(200,168,75,0.04)'}},
              h('table',{style:{width:'100%'}},
                h('thead',null,h('tr',null,['Código','En Flex','En nuestra app','Qué significa','Cliente'].map(function(x,i){return h('th',{key:i,style:th},x);}))),
                h('tbody',null,filasDet.map(function(r){var nv=nivel(r);return h('tr',{key:r.codigo},
                  h('td',{style:Object.assign({},td,{fontFamily:'JetBrains Mono',borderLeft:'3px solid '+(!g.subido?'#c98a1f':nv>=2?'#b00020':'#c98a1f')})},r.codigo),
                  h('td',{style:td},r.flex||(g.subido?'No aparece':'Sin cierre')),
                  h('td',{style:td},r.nuestro?(est(r.nuestro)+(r.hora?' '+r.hora:'')):'No lo registró'),
                  h('td',{style:td},g.subido?significado(r):'Sin cierre Flex subido'),
                  h('td',{style:Object.assign({},td,{color:'var(--text-soft)',fontSize:12})},(r.cliente||'')+(r.comuna?' · '+r.comuna:'')));}))))):null];
        }))))
    );
  }

  window.__cierreFlex={abrirRider:abrirRider,sincronizar:sincronizar,prepararCuadros:prepararCuadros,Panel:Panel,_fechaDesdeTexto:fechaDesdeTexto};
})();
