(function(){
// ══════════════════════════════════════════════════════════════════════════════════════
// REVISAR DIRECCIONES (30-10-2026)
// Antes de exportar rutas a Circuit/Spoke: revisa cada dirección y marca las que tienen
// problemas para corregirlas en el momento.
//  Revisión local (sin costo): sin dirección, sin número de calle, sin comuna / comuna no válida.
//  Revisión en el mapa (Google): ubicada exacta / solo la calle (número no encontrado) / cae en
//  otra comuna / no encontrada.
// Corrección: dirección, comuna y referencia se editan en la misma pantalla (desde el panel
// administrativo) y se vuelve a verificar. Las coordenadas buenas se guardan en el envío.
// ══════════════════════════════════════════════════════════════════════════════════════
var h=React.createElement, useState=React.useState, useEffect=React.useEffect, useRef=React.useRef;
var db=window.__app.db, COMUNAS=window.__app.COMUNAS_CHILE||[], matchComuna=window.__app.matchComuna||function(x){return x;};

function norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().trim();}
function revisionLocal(e){
  var p=[];
  var dir=String(e.direccion||'').trim();
  if(!dir)p.push('Sin dirección');
  else if(!/\d/.test(dir))p.push('Sin número de calle');
  if(!String(e.comuna||'').trim())p.push('Sin comuna');
  else if(!matchComuna(e.comuna))p.push('Comuna no válida');
  return p;
}
function geocodificar(geocoder,e){
  return new Promise(function(res){
    var dir=String(e.direccion||'').trim();if(!dir){res({nivel:'no',detalle:'Sin dirección'});return;}
    geocoder.geocode({address:dir+', '+(e.comuna||'')+', Región Metropolitana, Chile',region:'CL'},function(results,status){
      if(status==='OVER_QUERY_LIMIT'){res({nivel:'reintentar'});return;}
      if(status!=='OK'||!results||!results[0]){res({nivel:'no',detalle:'No encontrada en el mapa'});return;}
      var r=results[0], t=r.types||[];
      var comp=r.address_components||[];
      var com=(comp.find(function(c){return c.types.indexOf('administrative_area_level_3')>=0;})||comp.find(function(c){return c.types.indexOf('locality')>=0;})||{}).long_name||'';
      var loc=r.geometry.location;
      var out={lat:loc.lat(),lng:loc.lng(),formatted:r.formatted_address,comunaMapa:com};
      var exacta=t.indexOf('street_address')>=0||t.indexOf('premise')>=0||t.indexOf('subpremise')>=0||t.indexOf('establishment')>=0;
      if(e.comuna&&com&&norm(com)!==norm(e.comuna)){out.nivel='otra';out.detalle='El mapa la ubica en '+com;}
      else if(!exacta&&t.indexOf('route')>=0){out.nivel='calle';out.detalle='Solo se encontró la calle, no el número';}
      else if(!exacta){out.nivel='no';out.detalle='Solo se ubicó la zona, no la dirección';}
      else if(r.partial_match){out.nivel='dudosa';out.detalle='Coincidencia parcial: '+r.formatted_address;}
      else {out.nivel='ok';out.detalle=r.formatted_address;}
      res(out);
    });
  });
}
var NIVEL={ok:{t:'OK',c:'#2e7d4f'},dudosa:{t:'Dudosa',c:'#b07d10'},calle:{t:'Sin número exacto',c:'#b07d10'},otra:{t:'Otra comuna',c:'#b03030'},no:{t:'No encontrada',c:'#b03030'},local:{t:'Incompleta',c:'#b03030'},pend:{t:'Revisando…',c:'#999'}};

function Revision(props){
  var _l=useState(function(){return props.envios.map(function(e){var p=revisionLocal(e);return Object.assign({},e,{_local:p,_nivel:p.length?'local':'pend',_detalle:p.join(' · ')});});}),lista=_l[0],setLista=_l[1];
  var _f=useState('problemas'),filtro=_f[0],setFiltro=_f[1];
  var _ed=useState(null),editando=_ed[0],setEditando=_ed[1];
  var _p=useState(0),prog=_p[0],setProg=_p[1];
  var _g=useState(''),guardando=_g[0],setGuardando=_g[1];
  var geoRef=useRef(null);
  function setFila(cod,patch){setLista(function(prev){return prev.map(function(x){return x.codigo===cod?Object.assign({},x,patch):x;});});}
  async function verificar(e){
    if(!window.google||!google.maps||!google.maps.Geocoder){setFila(e.codigo,{_nivel:e._local.length?'local':'dudosa',_detalle:'Mapa no disponible: '+(e._local.join(' · ')||'sin verificar')});return;}
    if(!geoRef.current)geoRef.current=new google.maps.Geocoder();
    var r=await geocodificar(geoRef.current,e);
    if(r.nivel==='reintentar'){await new Promise(function(x){setTimeout(x,1200);});r=await geocodificar(geoRef.current,e);if(r.nivel==='reintentar')r={nivel:'dudosa',detalle:'No se pudo verificar (límite del mapa), reintenta'};}
    var nivel=r.nivel, det=r.detalle;
    if(e._local.length&&nivel==='ok'){nivel='dudosa';det=e._local.join(' · ')+' · '+det;}
    else if(e._local.length){nivel='local';det=e._local.join(' · ')+(det?' · '+det:'');}
    setFila(e.codigo,{_nivel:nivel,_detalle:det,_lat:r.lat,_lng:r.lng,_formatted:r.formatted});
    if(nivel==='ok'&&r.lat){try{db.rpc('guardar_coords_envio',{p_codigo:e.codigo,p_lat:r.lat,p_lng:r.lng});}catch(x){}}
  }
  useEffect(function(){
    var vivo=true;
    (async function(){
      var cola=lista.slice(),hechos=0;
      async function trabajador(){while(cola.length&&vivo){var e=cola.shift();await verificar(e);hechos++;setProg(hechos);await new Promise(function(x){setTimeout(x,120);});}}
      await Promise.all([trabajador(),trabajador(),trabajador(),trabajador()]);
    })();
    return function(){vivo=false;};
  },[]);
  async function guardarCorreccion(){
    var e=editando;if(!e)return;
    var com=matchComuna(e._comuna)||e._comuna;
    setGuardando('Guardando…');
    var r=await db.from('envios').update({direccion:e._dir.trim(),comuna:com,referencia:(e._ref||'').trim()||null}).eq('codigo',e.codigo);
    if(r.error){setGuardando('No se pudo guardar: '+r.error.message);return;}
    var nuevo=Object.assign({},lista.find(function(x){return x.codigo===e.codigo;}),{direccion:e._dir.trim(),comuna:com,referencia:(e._ref||'').trim()});
    nuevo._local=revisionLocal(nuevo);nuevo._nivel='pend';nuevo._detalle='Verificando…';
    setLista(function(prev){return prev.map(function(x){return x.codigo===e.codigo?nuevo:x;});});
    setEditando(null);setGuardando('');
    await verificar(nuevo);
  }
  var cuenta={ok:0,prob:0};lista.forEach(function(e){if(e._nivel==='ok')cuenta.ok++;else if(e._nivel!=='pend')cuenta.prob++;});
  var vis=lista.filter(function(e){return filtro==='todas'||(filtro==='problemas'?(e._nivel!=='ok'&&e._nivel!=='pend'):e._nivel==='ok');});
  var td={padding:'7px 8px',borderBottom:'1px solid #eee',fontSize:12,verticalAlign:'top'};
  var total=lista.length;
  function exportar(){
    var ex=window.__app.exportarCircuit;if(!ex)return;
    var grupos={};lista.forEach(function(e){var m=(e.mensajero||'SIN MENSAJERO').replace(/,\s*/g,' ').trim();var c=Object.assign({},e);if(e._nivel!=='ok'&&e._nivel!=='pend')c.nota='DIRECCIÓN POR VERIFICAR'+(e._detalle?': '+e._detalle:'')+(e.nota?' | '+e.nota:'');(grupos[m]=grupos[m]||[]).push(c);});
    var nombres=Object.keys(grupos);
    (async function(){for(var i=0;i<nombres.length;i++){await ex(grupos[nombres[i]],'Ruta_'+nombres[i].replace(/\s+/g,'_')+'_'+(window.__app.fechaHoyCL?window.__app.fechaHoyCL():''));await new Promise(function(x){setTimeout(x,600);});}})();
  }
  return h('div',{style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center',padding:12}},
    h('div',{style:{background:'#fff',borderRadius:14,width:'min(1100px,100%)',maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'inherit'}},
      h('div',{style:{padding:'14px 18px',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}},
        h('div',null,
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1,color:'#2B2E20'}},'Revisar direcciones'),
          h('div',{style:{fontSize:12,color:'#777'}},(prog<total?('Revisando '+prog+' de '+total+'…'):('Revisadas '+total))+' · '+cuenta.ok+' OK · '+cuenta.prob+' con problemas')),
        h('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},
          ['problemas','ok','todas'].map(function(k){var lab={problemas:'Con problemas ('+cuenta.prob+')',ok:'OK ('+cuenta.ok+')',todas:'Todas ('+total+')'}[k];
            return h('button',{key:k,className:'filter-btn'+(filtro===k?' active':''),onClick:function(){setFiltro(k);}},lab);}),
          props.conExportar&&h('button',{className:'btn-primary',style:{padding:'7px 14px',fontSize:12},disabled:prog<total,onClick:exportar,title:'Las que siguen con problemas salen con la nota "DIRECCIÓN POR VERIFICAR"'},'Exportar para Circuit / Spoke'),
          h('button',{className:'btn-secondary',style:{padding:'7px 14px',fontSize:12},onClick:props.onClose},'Cerrar'))),
      h('div',{style:{overflow:'auto',flex:1}},
        vis.length===0?h('div',{style:{padding:24,fontSize:13,color:'#777',textAlign:'center'}},prog<total?'Revisando…':(filtro==='problemas'?'Ninguna dirección con problemas.':'Sin direcciones.')):
        h('table',{style:{width:'100%',borderCollapse:'collapse',minWidth:860}},
          h('thead',null,h('tr',null,['Código','Mensajero','Dirección','Comuna','Referencia','Resultado',''].map(function(x,i){return h('th',{key:i,style:{textAlign:'left',padding:'8px',fontSize:10,letterSpacing:1,textTransform:'uppercase',color:'#888',borderBottom:'2px solid #eee',position:'sticky',top:0,background:'#fff'}},x);}))),
          h('tbody',null,vis.map(function(e){
            var n=NIVEL[e._nivel]||NIVEL.pend; var ed=editando&&editando.codigo===e.codigo;
            return h(React.Fragment,{key:e.codigo},
              h('tr',null,
                h('td',{style:Object.assign({},td,{fontFamily:'JetBrains Mono',fontWeight:700})},e.codigo,h('div',{style:{fontFamily:'inherit',fontWeight:400,fontSize:11,color:'#888'}},e.cliente||'')),
                h('td',{style:td},(e.mensajero||'—').replace(/,\s*/g,' ')),
                h('td',{style:Object.assign({},td,{fontWeight:600})},e.direccion||h('i',{style:{color:'#b03030'}},'vacía'),h('div',{style:{fontSize:11,color:'#888',fontWeight:400}},e.destinatario||'')),
                h('td',{style:td},e.comuna||h('i',{style:{color:'#b03030'}},'vacía')),
                h('td',{style:Object.assign({},td,{color:'#666'})},e.referencia||''),
                h('td',{style:td},h('span',{style:{display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:10.5,fontWeight:800,color:'#fff',background:n.c}},n.t),h('div',{style:{fontSize:11,color:'#666',marginTop:3,maxWidth:260}},e._detalle||'')),
                h('td',{style:Object.assign({},td,{whiteSpace:'nowrap'})},
                  h('button',{className:'action-btn btn-edit',onClick:function(){setEditando({codigo:e.codigo,_dir:e.direccion||'',_comuna:e.comuna||'',_ref:e.referencia||''});setGuardando('');}},'Corregir'),' ',
                  h('a',{href:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((e.direccion||'')+', '+(e.comuna||'')+', Chile'),target:'_blank',rel:'noopener',style:{fontSize:11,color:'#A0842A'}},'Mapa'))),
              ed&&h('tr',null,h('td',{colSpan:7,style:{padding:'10px 12px',background:'#FBF8F0',borderBottom:'1px solid #eee'}},
                h('div',{style:{display:'grid',gridTemplateColumns:'2fr 1fr 1.4fr auto',gap:8,alignItems:'end'}},
                  h('div',null,h('label',{style:{fontSize:10,color:'#888'}},'Dirección (calle y número)'),h('input',{className:'form-input',value:editando._dir,onChange:function(ev){setEditando(Object.assign({},editando,{_dir:ev.target.value}));}})),
                  h('div',null,h('label',{style:{fontSize:10,color:'#888'}},'Comuna'),h('input',{className:'form-input',list:'dl-comunas-revdir',value:editando._comuna,onChange:function(ev){setEditando(Object.assign({},editando,{_comuna:ev.target.value}));}})),
                  h('div',null,h('label',{style:{fontSize:10,color:'#888'}},'Referencia (depto, casa, torre)'),h('input',{className:'form-input',value:editando._ref,onChange:function(ev){setEditando(Object.assign({},editando,{_ref:ev.target.value}));}})),
                  h('div',{style:{display:'flex',gap:6}},h('button',{className:'btn-primary',style:{padding:'8px 12px',fontSize:12},onClick:guardarCorreccion},'Guardar y verificar'),h('button',{className:'btn-secondary',style:{padding:'8px 12px',fontSize:12},onClick:function(){setEditando(null);}},'Cancelar'))),
                e._formatted&&h('div',{style:{fontSize:11,color:'#666',marginTop:6}},'El mapa encontró: '+e._formatted),
                guardando&&h('div',{style:{fontSize:11,color:'#b03030',marginTop:6}},guardando))));
          })))),
      h('datalist',{id:'dl-comunas-revdir'},COMUNAS.map(function(c){return h('option',{key:c,value:c});})),
      h('div',{style:{padding:'8px 18px',borderTop:'1px solid #eee',fontSize:11,color:'#888'}},'OK = el mapa ubica la dirección exacta en su comuna. Las correcciones se guardan en el envío. Al exportar, las que siguen con problemas salen con la nota "DIRECCIÓN POR VERIFICAR" para el mensajero.'))
  );
}

function abrir(envios,opts){
  opts=opts||{};
  var cont=document.createElement('div');document.body.appendChild(cont);
  var root=ReactDOM.createRoot(cont);
  function cerrar(){root.unmount();cont.remove();if(opts.onClose)opts.onClose();}
  root.render(h(Revision,{envios:envios,conExportar:!!opts.conExportar,onClose:cerrar}));
}
window.__revDir={abrir:abrir,revisionLocal:revisionLocal};
})();
