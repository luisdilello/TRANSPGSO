// Periferia automática por zona del mapa (04-11-2026).
// Cada comuna con periferia tiene una zona (polígono) guardada en la tabla zonas_periferia.
// Los envíos nuevos de esa comuna se ubican con Google y la función clasificar_periferia (SQL)
// decide si caen dentro de la zona: si caen, la comuna queda "<COMUNA> - PERIFERIA".
// Reglas: nunca toca un envío ya revisado (zona_auto), uno marcado periferia a mano ni uno cerrado.
// Si Google no encuentra la dirección exacta, el envío queda "sin_ubicacion" y aparece en el
// panel "Periferia" del mapa para que un admin lo marque a mano.
(function(){
  var ESTADOS_CERRADOS=['entregado','cancelado','retorno','en_bodega_cancelado','siniestro'];
  var corriendo=false;
  function norm(x){return String(x||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
  function esperarGoogle(ms){return new Promise(function(res){var t0=Date.now();(function chk(){if(window.google&&google.maps&&google.maps.Geocoder)return res(true);if(Date.now()-t0>ms)return res(false);setTimeout(chk,500);})();});}
  async function zonas(){var r=await db.from('zonas_periferia').select('*').eq('activo',true);return(r&&r.data)||[];}
  function ubicar(geo,e){return new Promise(function(res){
    var dir=String(e.direccion||'').trim(),com=String(e.comuna||'').trim();
    if(!dir||!/\d/.test(dir)){res(null);return;}
    geo.geocode({address:dir+', '+com+', Región Metropolitana, Chile',componentRestrictions:{country:'CL'}},function(r,st){
      if(st!=='OK'||!r||!r[0]){res(null);return;}
      var x=r[0],t=x.types||[],c=x.address_components||[];
      var g=function(k){var y=c.find(function(z){return z.types.indexOf(k)>=0;});return y?y.long_name:'';};
      var comM=g('administrative_area_level_3')||g('locality');
      var exacta=t.indexOf('street_address')>=0||t.indexOf('premise')>=0||t.indexOf('subpremise')>=0;
      var nums=dir.match(/\d+/g)||[];var numG=String(g('street_number')).replace(/\D.*$/,'');
      if(!exacta||!numG||nums.indexOf(numG)<0){res(null);return;}
      if(comM&&norm(comM)!==norm(com)){res(null);return;}
      var l=x.geometry.location;res({lat:l.lat(),lng:l.lng()});
    });
  });}
  // Revisa los envíos pendientes (últimos 7 días) de las comunas con zona. Devuelve el resumen.
  async function clasificar(opts){
    opts=opts||{};
    if(corriendo)return{ocupado:true};
    corriendo=true;
    var res={revisados:0,periferia:0,centro:0,sin_ubicacion:0};
    try{
      var zs=await zonas();if(!zs.length)return res;
      var desde=new Date(Date.now()-7*864e5).toISOString().slice(0,10);
      var lista=[];
      for(var i=0;i<zs.length;i++){
        var r=await db.from('envios').select('codigo,direccion,comuna,estado,lat,lng').eq('comuna',zs[i].comuna).is('zona_auto',null).gte('fecha',desde).limit(1000);
        ((r&&r.data)||[]).forEach(function(e){if(ESTADOS_CERRADOS.indexOf(e.estado)<0)lista.push(e);});
      }
      if(!lista.length)return res;
      var hayGoogle=await esperarGoogle(15000);
      var geo=hayGoogle?new google.maps.Geocoder():null;
      var cola=lista.slice();
      async function trab(){
        while(cola.length){
          var e=cola.shift();var p=null;
          if(typeof e.lat==='number'&&typeof e.lng==='number')p={lat:e.lat,lng:e.lng};
          else if(geo){try{p=await ubicar(geo,e);}catch(_){p=null;}}
          else continue; // sin Google no se marca nada: se reintenta en la próxima vuelta
          try{
            var rr=await db.rpc('clasificar_periferia',{p_codigo:e.codigo,p_lat:p?p.lat:null,p_lng:p?p.lng:null});
            var v=rr&&rr.data;if(res[v]!=null)res[v]++;res.revisados++;
          }catch(_){}
          if(opts.onProgreso)opts.onProgreso(lista.length-cola.length,lista.length);
          await new Promise(function(x){setTimeout(x,120);});
        }
      }
      await Promise.all([trab(),trab(),trab()]);
      return res;
    }finally{corriendo=false;}
  }

  // ── Panel en el mapa (Mapa de Rutas) ──────────────────────────────────────
  function panel(map,toast){
    if(!map||map.__periferiaPanel)return;map.__periferiaPanel=true;
    toast=toast||function(){};
    var poligonos={};// comuna -> google.maps.Polygon
    var visible=false;
    var btn=document.createElement('button');
    btn.textContent='Periferia';
    btn.style.cssText='margin:12px 0 0 10px;padding:9px 16px;border-radius:8px;border:1px solid rgba(201,138,31,0.8);background:linear-gradient(135deg,#2b2e20,#1e2118);color:#e0a050;font-family:Bebas Neue,sans-serif;letter-spacing:1.5px;font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.35)';
    var caja=document.createElement('div');
    caja.style.cssText='display:none;margin:8px 0 0 10px;width:330px;max-width:calc(100vw - 40px);max-height:70vh;overflow:auto;background:linear-gradient(180deg,#2b2e20,#1e2118);border:1px solid rgba(201,138,31,0.6);border-radius:12px;box-shadow:0 10px 32px rgba(0,0,0,0.5);color:#fff;font-family:DM Sans,Arial,sans-serif;font-size:12px';
    var cont=document.createElement('div');cont.appendChild(btn);cont.appendChild(caja);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(cont);
    btn.onclick=function(){visible=!visible;caja.style.display=visible?'block':'none';Object.keys(poligonos).forEach(function(k){poligonos[k].setMap(visible?map:null);});if(visible)render();};
    function bS(c){return 'padding:7px 10px;border-radius:7px;border:1px solid '+(c||'rgba(200,168,75,0.5)')+';background:rgba(255,255,255,0.05);color:#fff;font-size:12px;cursor:pointer;margin:3px 4px 3px 0';}
    async function render(){
      caja.innerHTML='<div style="padding:10px 14px;border-bottom:1px solid rgba(201,138,31,0.3);font-family:Bebas Neue,sans-serif;letter-spacing:2px;font-size:16px;color:#e0a050">Periferia automática</div><div data-c style="padding:10px 14px">Cargando…</div>';
      var c=caja.querySelector('[data-c]');
      var zs=await zonas();
      zs.forEach(function(z){
        if(poligonos[z.comuna])return;
        var path=(z.poligono||[]).map(function(p){return{lat:+p[0],lng:+p[1]};});
        var pg=new google.maps.Polygon({paths:path,strokeColor:'#d9480f',strokeWeight:3,fillColor:'#f08c00',fillOpacity:0.12,editable:false,draggable:false,clickable:false,zIndex:5});
        pg.setMap(visible?map:null);poligonos[z.comuna]=pg;
      });
      var sin=await db.from('envios').select('codigo,direccion,comuna,estado').eq('zona_auto','sin_ubicacion').not('estado','in','('+ESTADOS_CERRADOS.join(',')+')').limit(200);
      var sinL=(sin&&sin.data)||[];
      var h='<div style="color:rgba(255,255,255,0.65);margin-bottom:8px;line-height:1.4">La zona naranja es periferia. Los envíos nuevos de estas comunas se ubican en el mapa y se marcan solos cada 10 minutos.</div>';
      zs.forEach(function(z){h+='<div style="border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 10px;margin-bottom:8px"><div style="font-weight:700;margin-bottom:4px">'+z.comuna+'</div><button data-ed="'+z.comuna+'" style="'+bS()+'">Editar zona</button><button data-sv="'+z.comuna+'" style="'+bS('#2e7d4f')+';display:none">Guardar zona</button><button data-cx="'+z.comuna+'" style="'+bS()+';display:none">Cancelar</button></div>';});
      h+='<button data-run style="'+bS('#e0a050')+';width:100%;padding:9px">Clasificar ahora</button><div data-prog style="margin:6px 0;color:#e0a050"></div>';
      h+='<div style="margin-top:8px;font-weight:700">Sin ubicar ('+sinL.length+')</div><div style="color:rgba(255,255,255,0.55);margin:2px 0 6px">Google no encontró la dirección exacta. Márcalos a mano:</div>';
      sinL.forEach(function(e){h+='<div style="border-top:1px solid rgba(255,255,255,0.08);padding:6px 0"><div style="font-family:JetBrains Mono,monospace">'+e.codigo+'</div><div style="color:rgba(255,255,255,0.7)">'+(e.direccion||'(sin dirección)').replace(/</g,'&lt;')+' · '+e.comuna+'</div><button data-per="'+e.codigo+'" data-com="'+e.comuna+'" style="'+bS('#e0a050')+'">Periferia</button><button data-cen="'+e.codigo+'" style="'+bS()+'">Centro</button></div>';});
      c.innerHTML=h;
      c.querySelectorAll('[data-ed]').forEach(function(b){b.onclick=function(){var k=b.getAttribute('data-ed');var pg=poligonos[k];pg.__orig=pg.getPath().getArray().map(function(p){return{lat:p.lat(),lng:p.lng()};});pg.setEditable(true);b.style.display='none';c.querySelector('[data-sv="'+k+'"]').style.display='';c.querySelector('[data-cx="'+k+'"]').style.display='';toast('Arrastra los puntos de la zona. Para borrar un punto, clic derecho sobre él.');pg.__del||(pg.__del=google.maps.event.addListener(pg,'rightclick',function(ev){if(ev.vertex!=null&&pg.getPath().getLength()>3)pg.getPath().removeAt(ev.vertex);}));};});
      c.querySelectorAll('[data-cx]').forEach(function(b){b.onclick=function(){var k=b.getAttribute('data-cx');var pg=poligonos[k];pg.setPath(pg.__orig);pg.setEditable(false);render();};});
      c.querySelectorAll('[data-sv]').forEach(function(b){b.onclick=async function(){var k=b.getAttribute('data-sv');var pg=poligonos[k];var pts=pg.getPath().getArray().map(function(p){return[+p.lat().toFixed(6),+p.lng().toFixed(6)];});
        var u=(window.__app&&window.__app.perfil&&window.__app.perfil.nombre)||'Admin';
        var r=await db.from('zonas_periferia').update({poligono:pts,updated_at:new Date().toISOString(),updated_by:u}).eq('comuna',k);
        if(r&&r.error){toast('No se pudo guardar la zona: '+r.error.message);return;}
        pg.setEditable(false);toast('Zona de '+k+' guardada. Aplica a los envíos nuevos.');render();};});
      c.querySelector('[data-run]').onclick=async function(){var pr=c.querySelector('[data-prog]');pr.textContent='Revisando…';
        var r=await clasificar({onProgreso:function(a,n){pr.textContent='Revisando '+a+' de '+n+'…';}});
        if(r.ocupado){pr.textContent='Ya se está clasificando en segundo plano, espera un momento.';return;}
        pr.textContent=r.revisados?('Listo: '+r.periferia+' periferia, '+r.centro+' centro, '+r.sin_ubicacion+' sin ubicar.'):'No hay envíos nuevos por revisar.';
        setTimeout(render,1500);};
      async function marcar(cod,per,com){var upd={zona_auto:'manual'};if(per)upd.comuna=String(com).replace(/\s*-\s*PERIFERIA\s*$/i,'')+' - PERIFERIA';var r=await db.from('envios').update(upd).eq('codigo',cod);if(r&&r.error){toast('Error: '+r.error.message);return;}toast(cod+(per?' marcado periferia':' marcado centro'));render();}
      c.querySelectorAll('[data-per]').forEach(function(b){b.onclick=function(){marcar(b.getAttribute('data-per'),true,b.getAttribute('data-com'));};});
      c.querySelectorAll('[data-cen]').forEach(function(b){b.onclick=function(){marcar(b.getAttribute('data-cen'),false);};});
    }
  }

  // Vuelta automática cada 10 minutos mientras haya un panel de admin/operador abierto.
  var iniciado=false;
  function iniciarAuto(){
    if(iniciado)return;iniciado=true;
    setTimeout(function(){clasificar().catch(function(){});},20000);
    setInterval(function(){if(!document.hidden)clasificar().catch(function(){});},10*60*1000);
  }
  window.__periferia={clasificar:clasificar,panel:panel,iniciarAuto:iniciarAuto};
})();
