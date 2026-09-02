(function(){
var useEffect=React.useEffect, useMemo=React.useMemo, useRef=React.useRef, useState=React.useState;
var db=window.__app.db, Modal=window.__app.Modal, estadoInfo=window.__app.estadoInfo, estadoBadge=window.__app.estadoBadge,
    estadoEsTerminal=window.__app.estadoEsTerminal, estadoPermitido=window.__app.estadoPermitido,
    intentarConColaOffline=window.__app.intentarConColaOffline, procesarConcurrencia=window.__app.procesarConcurrencia;

// Mismas 5 opciones que ve el mensajero en su app (ESTADOS_RIDER) -- el admin/operador gestiona
// la entrega exactamente igual, solo que desde el panel en vez del celular del mensajero.
var ESTADOS_FIRMAS=[
  {val:'en_ruta',label:'En Ruta',icon:'🚴',color:'#8a6d1a',bg:'rgba(200,168,75,0.15)'},
  {val:'entregado',label:'Entregado',icon:'✅',color:'#2e7d4f',bg:'rgba(46,125,79,0.15)'},
  {val:'reprogramado',label:'Reprogramado',icon:'📅',color:'#b07d10',bg:'rgba(176,125,16,0.15)'},
  {val:'cancelado',label:'Cancelado',icon:'❌',color:'#b03030',bg:'rgba(176,48,48,0.12)'},
  {val:'siniestro',label:'Siniestro',icon:'⚠️',color:'#b03030',bg:'rgba(176,48,48,0.12)'}
];
var MIN_FOTOS_ENTREGA=2, MAX_FOTOS=5;

function fmtCLP(n){var v=parseFloat(n)||0;return '$'+Math.round(v).toLocaleString('es-CL');}

// Comprime una imagen (File o dataURL ya cargado) al mismo estándar que usa la app del
// mensajero: máximo 800px de lado mayor, JPEG calidad 0.7 -- así las fotos que suba el admin
// pesan igual de poco y no rompen ningún límite de Storage que ya esté afinado para el rider.
function comprimirDataURL(dataURL){
  return new Promise(function(res){
    var img=new Image();
    img.onload=function(){
      var MAX=800;
      var scale=Math.min(1,MAX/Math.max(img.width,img.height));
      var canvas=document.createElement('canvas');
      canvas.width=Math.round(img.width*scale);
      canvas.height=Math.round(img.height*scale);
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      res(canvas.toDataURL('image/jpeg',0.7));
    };
    img.onerror=function(){res(null);};
    img.src=dataURL;
  });
}

// ── Panel de gestión de UNA entrega puntual (se abre en un Modal) ──────────────────────────
function GestionEntregaModal(props){
  var envio=props.envio, mensajeroNombre=props.mensajeroNombre, adminNombre=props.adminNombre,
      motivosReprogramacion=props.motivosReprogramacion, toast=props.toast,
      onClose=props.onClose, onGuardado=props.onGuardado;

  var _fotos=useState([]), fotos=_fotos[0], setFotos=_fotos[1];
  var _estadoSel=useState(null), estadoSel=_estadoSel[0], setEstadoSel=_estadoSel[1];
  var _nota=useState(''), nota=_nota[0], setNota=_nota[1];
  var _guardando=useState(false), guardando=_guardando[0], setGuardando=_guardando[1];
  var _aviso=useState(''), aviso=_aviso[0], setAviso=_aviso[1];

  var usaMotivoDesplegable=estadoSel==='reprogramado' && (motivosReprogramacion||[]).length>0;
  var terminal=estadoEsTerminal(envio.estado);

  function agregarFotos(files){
    var cupo=MAX_FOTOS-fotos.length;
    var arr=Array.prototype.slice.call(files,0,Math.max(0,cupo));
    if(files.length>arr.length){setAviso('⚠ Máximo '+MAX_FOTOS+' fotos por entrega — se cargaron '+arr.length+' de '+files.length+' seleccionadas');}
    else{setAviso('');}
    arr.forEach(function(file){
      var reader=new FileReader();
      reader.onload=function(e){
        setFotos(function(prev){return prev.length>=MAX_FOTOS?prev:prev.concat([{data:e.target.result}]);});
      };
      reader.readAsDataURL(file);
    });
  }
  function quitarFoto(i){setFotos(function(prev){return prev.filter(function(_,idx){return idx!==i;});});}

  function elegirArchivo(){
    var inp=document.createElement('input');
    inp.type='file'; inp.accept='image/*'; inp.multiple=true;
    inp.onchange=function(ev){agregarFotos(ev.target.files);};
    document.body.appendChild(inp); inp.click();
    setTimeout(function(){document.body.removeChild(inp);},1000);
  }

  // Copiar y pegar (Ctrl+V) una imagen directamente -- pedido explícito de Luis para que la
  // gestión sea rápida, sin tener que guardar el archivo primero. Escucha el paste a nivel de
  // documento mientras este modal está abierto, así funciona sin tener que hacer foco en un
  // campo específico primero.
  useEffect(function(){
    function onPaste(e){
      var items=(e.clipboardData && e.clipboardData.items)||[];
      var imgFiles=[];
      for(var i=0;i<items.length;i++){
        if(items[i].type && items[i].type.indexOf('image')===0){
          var f=items[i].getAsFile();
          if(f)imgFiles.push(f);
        }
      }
      if(imgFiles.length>0){e.preventDefault();agregarFotos(imgFiles);}
    }
    document.addEventListener('paste',onPaste);
    return function(){document.removeEventListener('paste',onPaste);};
  },[fotos.length]);

  async function guardar(estadoFinal){
    if(terminal || guardando)return;
    if(estadoFinal==='entregado' && fotos.length<MIN_FOTOS_ENTREGA){
      setAviso('⚠ Debes cargar al menos '+MIN_FOTOS_ENTREGA+' fotos para marcar como entregado ('+fotos.length+'/'+MIN_FOTOS_ENTREGA+' cargadas)');
      return;
    }
    if(estadoFinal==='reprogramado' && usaMotivoDesplegable && !nota){
      setAviso('⚠ Selecciona el motivo de la reagenda');
      return;
    }
    if(estadoFinal==='reprogramado' && !usaMotivoDesplegable && !nota.trim()){
      setAviso('⚠ Escribe el motivo de la reagenda antes de guardar');
      return;
    }
    setAviso('');
    setGuardando(true);
    try{
      // Igual que en la app del mensajero: se comprimen todas las fotos en paralelo (4 a la
      // vez) recién al guardar, no al agregarlas -- así elegir/pegar varias fotos es instantáneo.
      var fotosB64Raw=await procesarConcurrencia(fotos,function(f){return comprimirDataURL(f.data);},4);
      var fotosB64=fotosB64Raw.filter(function(b){return!!b;});
      var payload={
        codigo:envio.codigo,
        estadoFinal:estadoFinal,
        estadoPrevio:envio.estado||'desconocido',
        nota:nota||'',
        // OJO: mensajero queda como el mensajero ASIGNADO real (no el admin) -- así
        // fotos_entrega y la atribución de pago le siguen quedando correctamente a él.
        // Quién gestionó realmente la entrega queda registrado aparte en historialUsuario/canal.
        mensajero:mensajeroNombre,
        fotosB64:fotosB64,
        videoBlob:null,
        historialUsuario:'Admin: '+adminNombre,
        canal:'panel_admin'
      };
      var resultado;
      try{
        resultado=await intentarConColaOffline('entrega',payload,adminNombre);
      }catch(errReal){
        setAviso('⚠ No se pudo guardar: '+(errReal&&errReal.message?errReal.message:'error desconocido'));
        setGuardando(false);
        return;
      }
      toast&&toast(resultado.offline?'📴 Sin conexión — se guardó y se sincroniza solo cuando vuelva la señal':'✓ Entrega registrada');
      setGuardando(false);
      onGuardado();
    }catch(e){
      console.warn(e);
      setAviso('⚠ Error al guardar: '+(e&&e.message?e.message:'desconocido'));
      setGuardando(false);
    }
  }

  return React.createElement(Modal,{title:'✍ Gestionar entrega',sub:envio.codigo+' · '+(envio.destinatario||'Sin destinatario'),onClose:onClose,wide:true},
    terminal&&React.createElement('div',{style:{background:'rgba(176,48,48,0.08)',color:'var(--danger)',padding:'10px 14px',borderRadius:8,fontSize:12,fontWeight:700,marginBottom:14}},
      '⚠ Este envío ya está en un estado terminal ('+estadoInfo(envio.estado).label+') — no se puede volver a gestionar desde acá.'),
    React.createElement('div',{style:{display:'flex',flexWrap:'wrap',gap:16,marginBottom:16}},
      React.createElement('div',{style:{flex:'1 1 220px'}},
        React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',marginBottom:2}},'Dirección'),
        React.createElement('div',{style:{fontSize:13,fontWeight:600}},envio.direccion||'—'),
        envio.comuna&&React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginTop:2}},'🏘 '+envio.comuna)),
      envio.telefono&&React.createElement('div',{style:{flex:'0 0 auto'}},
        React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',marginBottom:2}},'Teléfono'),
        React.createElement('a',{href:'tel:'+envio.telefono,style:{fontSize:13,fontWeight:700,color:'var(--gold)',textDecoration:'none'}},envio.telefono)),
      envio.monto>0&&React.createElement('div',{style:{flex:'0 0 auto'}},
        React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',marginBottom:2}},'Cobro contra entrega'),
        React.createElement('div',{style:{fontSize:14,fontWeight:700,color:'var(--danger)'}},fmtCLP(envio.monto)))),
    envio.nota&&React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',fontStyle:'italic',marginBottom:14}},'📌 '+envio.nota),

    React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:8}},'Fotos de la entrega'),
    React.createElement('div',{style:{border:'1.5px dashed var(--border)',borderRadius:10,padding:14,marginBottom:14,background:'#fafaf7'}},
      React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:10}},'📋 Pega una imagen con Ctrl+V (o Cmd+V), o súbela desde un archivo.'),
      React.createElement('div',{style:{display:'flex',flexWrap:'wrap',gap:8,marginBottom:fotos.length>0?10:0}},
        fotos.map(function(f,i){
          return React.createElement('div',{key:i,style:{position:'relative',width:64,height:64}},
            React.createElement('img',{src:f.data,style:{width:64,height:64,objectFit:'cover',borderRadius:8,border:'1px solid var(--border)'}}),
            React.createElement('button',{onClick:function(){quitarFoto(i);},style:{position:'absolute',top:-6,right:-6,background:'var(--danger)',border:'2px solid #fff',borderRadius:'50%',color:'#fff',width:20,height:20,cursor:'pointer',fontSize:11,lineHeight:'16px',padding:0}},'✕'));
        })),
      React.createElement('button',{className:'btn-secondary',type:'button',disabled:terminal||fotos.length>=MAX_FOTOS,onClick:elegirArchivo},'📁 Subir foto ('+fotos.length+'/'+MAX_FOTOS+')')),

    React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:8}},'Actualizar estado'),
    React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:8,marginBottom:16}},
      ESTADOS_FIRMAS.map(function(s){
        var permitido=estadoPermitido(envio.estado,s.val,true);
        var esActual=envio.estado===s.val;
        var esSel=estadoSel===s.val;
        return React.createElement('button',{key:s.val,type:'button',disabled:terminal,
          onClick:function(){if(terminal)return;setAviso('');setEstadoSel(esSel?null:s.val);},
          style:{padding:'12px 8px',borderRadius:10,border:'2px solid '+(esSel?s.color:'var(--border)'),
            background:esSel?s.bg:'#fff',color:esSel?s.color:'var(--text-mid)',
            cursor:terminal?'not-allowed':'pointer',fontSize:12,fontWeight:700,textAlign:'center',
            opacity:terminal?0.4:esActual?0.6:1}},
          React.createElement('div',{style:{fontSize:18,marginBottom:2}},s.icon),
          s.label,
          esActual&&React.createElement('div',{style:{fontSize:9,opacity:0.7,marginTop:2}},'ACTUAL'));
      })),

    estadoSel==='reprogramado'&&(usaMotivoDesplegable?
      React.createElement('div',{style:{marginBottom:16}},
        React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Motivo de la reagenda'),
        React.createElement('select',{className:'form-input',value:nota,onChange:function(e){setNota(e.target.value);}},
          React.createElement('option',{value:''},'Selecciona un motivo...'),
          motivosReprogramacion.map(function(m,i){return React.createElement('option',{key:i,value:m.texto},m.texto);}))):
      React.createElement('div',{style:{marginBottom:16}},
        React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Motivo de la reagenda'),
        React.createElement('textarea',{className:'form-input',rows:2,value:nota,onChange:function(e){setNota(e.target.value);},placeholder:'¿Por qué se reagenda?',style:{resize:'vertical'}}))),

    estadoSel && estadoSel!=='reprogramado' && React.createElement('div',{style:{marginBottom:16}},
      React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Observaciones (opcional)'),
      React.createElement('textarea',{className:'form-input',rows:2,value:nota,onChange:function(e){setNota(e.target.value);},placeholder:'Ej: Dejé con el vecino del 3B, cliente no estaba...',style:{resize:'vertical'}})),

    aviso&&React.createElement('div',{style:{background:'rgba(200,168,75,0.14)',border:'1px solid rgba(200,168,75,0.45)',borderRadius:8,padding:'8px 12px',color:'#8a6d1a',fontSize:12,fontWeight:700,marginBottom:14}},aviso),

    React.createElement('div',{className:'modal-actions'},
      React.createElement('button',{className:'btn-secondary',onClick:onClose},'Cancelar'),
      React.createElement('button',{className:'btn-confirm',disabled:!estadoSel||terminal||guardando,
        onClick:function(){estadoSel&&guardar(estadoSel);}},
        guardando?'Guardando...':'✓ Guardar')));
}

function Firmas(props){
  var mensajeros=props.mensajeros||[], toast=props.toast, usuario=props.usuario;
  var adminNombre=(usuario&&usuario.nombre)||'Admin';

  var _busqueda=useState(''), busqueda=_busqueda[0], setBusqueda=_busqueda[1];
  var _mensajeroSel=useState(''), mensajeroSel=_mensajeroSel[0], setMensajeroSel=_mensajeroSel[1];
  var _envios=useState([]), envios=_envios[0], setEnvios=_envios[1];
  var _cargando=useState(false), cargando=_cargando[0], setCargando=_cargando[1];
  var _envioActivo=useState(null), envioActivo=_envioActivo[0], setEnvioActivo=_envioActivo[1];
  var _motivos=useState([]), motivosReprogramacion=_motivos[0], setMotivosReprogramacion=_motivos[1];
  var _buscarCodigo=useState(''), buscarCodigoInput=_buscarCodigo[0], setBuscarCodigoInput=_buscarCodigo[1];
  var _buscandoCodigo=useState(false), buscandoCodigo=_buscandoCodigo[0], setBuscandoCodigo=_buscandoCodigo[1];
  var _resultadosCodigo=useState([]), resultadosCodigo=_resultadosCodigo[0], setResultadosCodigo=_resultadosCodigo[1];

  useEffect(function(){
    db.from('configuracion').select('valor').eq('clave','motivos_reprogramacion').maybeSingle().then(function(r){
      if(r&&r.data&&Array.isArray(r.data.valor)){
        setMotivosReprogramacion(r.data.valor.filter(function(m){return m&&m.activo!==false;}));
      }
    }).catch(function(){});
  },[]);

  var activos=useMemo(function(){
    var lista=mensajeros.filter(function(m){return m.activo!==false;});
    var q=busqueda.trim().toLowerCase();
    if(!q)return lista;
    return lista.filter(function(m){return (m.nombre||'').toLowerCase().indexOf(q)!==-1;});
  },[mensajeros,busqueda]);

  function cargarEnvios(nombreMensajero){
    setCargando(true);
    db.from('envios').select('codigo,destinatario,direccion,comuna,estado,mensajero,telefono,monto,nota,updated_at')
      .eq('mensajero',nombreMensajero)
      .in('estado',['en_bodega','en_ruta','reprogramado'])
      .order('updated_at',{ascending:false})
      .then(function(r){
        setEnvios(r&&r.data?r.data:[]);
        setCargando(false);
      }).catch(function(){setCargando(false);toast&&toast('⚠ Error cargando entregas');});
  }

  useEffect(function(){
    if(mensajeroSel){cargarEnvios(mensajeroSel);}
    else{setEnvios([]);}
    setEnvioActivo(null);
  },[mensajeroSel]);

  // Buscador directo por código -- no depende del mensajero seleccionado arriba: busca en
  // TODA la tabla envios (cualquier mensajero, cualquier fecha/estado), igual que el buscador
  // del Mapa de Rutas. Pedido explícito de Luis para no tener que ir mensajero por mensajero
  // cuando ya se tiene el código a mano.
  function buscarPorCodigo(){
    var q=(buscarCodigoInput||'').trim();
    if(!q)return;
    setBuscandoCodigo(true);
    setResultadosCodigo([]);
    db.from('envios').select('codigo,destinatario,direccion,comuna,estado,mensajero,telefono,monto,nota,updated_at')
      .ilike('codigo','%'+q+'%')
      .order('updated_at',{ascending:false})
      .limit(10)
      .then(function(r){
        setBuscandoCodigo(false);
        var rows=r&&r.data?r.data:[];
        if(rows.length===0){toast&&toast('⚠ No se encontró ningún envío con ese código');return;}
        if(rows.length===1){abrirEnvioDirecto(rows[0]);return;}
        setResultadosCodigo(rows);
      }).catch(function(){setBuscandoCodigo(false);toast&&toast('⚠ Error buscando el código');});
  }
  // Abre el envío encontrado directamente en el panel de gestión, SIN tocar el mensajero
  // seleccionado en la grilla de arriba (así no se pisa la lista que el admin ya tenía abierta).
  // El pago/atribución sigue siendo correcto porque GestionEntregaModal usa el mensajero
  // asignado real del propio envío encontrado, no el filtro de la grilla.
  function abrirEnvioDirecto(envio){
    setResultadosCodigo([]);
    setBuscarCodigoInput('');
    setEnvioActivo(envio);
  }

  return React.createElement('div',null,
    React.createElement('div',{className:'section-head'},
      React.createElement('div',{className:'section-title'},'Firmas · Gestión de Entregas'),
      mensajeroSel&&React.createElement('button',{className:'btn-secondary',onClick:function(){cargarEnvios(mensajeroSel);}},'↺ Actualizar')),
    React.createElement('div',{className:'info-banner'},
      '✍ Selecciona un mensajero para ver sus entregas pendientes y gestionarlas desde acá — con las mismas opciones que tiene el mensajero en su celular (estado, motivo, fotos). ',
      'Lo que gestiones acá se refleja al instante en la app del mensajero.'),

    React.createElement('div',{style:{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap',alignItems:'flex-start'}},
      React.createElement('input',{className:'form-input',placeholder:'🔍 Ir directo a un código de envío (cualquier mensajero/fecha)...',
        value:buscarCodigoInput,
        onChange:function(e){setBuscarCodigoInput(e.target.value);},
        onKeyDown:function(e){if(e.key==='Enter'){e.preventDefault();buscarPorCodigo();}},
        style:{maxWidth:360,margin:0}}),
      React.createElement('button',{className:'btn-secondary',disabled:buscandoCodigo||!buscarCodigoInput.trim(),onClick:buscarPorCodigo},buscandoCodigo?'Buscando...':'🔍 Buscar código')),

    resultadosCodigo.length>0&&React.createElement('div',{style:{border:'1px solid var(--border)',borderRadius:10,marginBottom:18,overflow:'hidden'}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'rgba(200,168,75,0.1)'}},
        React.createElement('span',{style:{fontSize:12,fontWeight:700,color:'#8a6d1a'}},resultadosCodigo.length+' resultados — elige uno'),
        React.createElement('button',{onClick:function(){setResultadosCodigo([]);},style:{background:'none',border:'none',cursor:'pointer',color:'var(--text-soft)',fontSize:14}},'✕')),
      resultadosCodigo.map(function(r){
        return React.createElement('div',{key:r.codigo,onClick:function(){abrirEnvioDirecto(r);},
          style:{padding:'10px 12px',borderTop:'1px solid var(--border)',cursor:'pointer',display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',fontSize:12}},
          React.createElement('span',{style:{fontFamily:'JetBrains Mono',fontWeight:700}},r.codigo),
          React.createElement('span',{style:{color:'var(--text-soft)'}},r.destinatario||'—'),
          React.createElement('span',{style:{color:'var(--text-soft)'}},(r.mensajero||'Sin mensajero').replace(/,\s*/g,' ')),
          estadoBadge(r.estado));
      })),

    React.createElement('div',{style:{marginBottom:16}},
      React.createElement('input',{className:'form-input',placeholder:'🔍 Buscar mensajero...',value:busqueda,onChange:function(e){setBusqueda(e.target.value);},style:{maxWidth:320,marginBottom:10}}),
      React.createElement('div',{className:'men-grid',style:{gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))'}},
        activos.map(function(m){
          return React.createElement('div',{key:m.id,className:'men-chip'+(mensajeroSel===m.nombre?' selected':''),
            onClick:function(){setMensajeroSel(mensajeroSel===m.nombre?'':m.nombre);}},
            React.createElement('div',{className:'men-chip-check'},mensajeroSel===m.nombre?'✓':''),
            React.createElement('span',{className:'men-chip-name'},(m.nombre||'').replace(/,\s*/g,' ')));
        }),
        activos.length===0&&React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',padding:8}},'No hay mensajeros que coincidan.'))),

    !mensajeroSel&&React.createElement('div',{style:{textAlign:'center',padding:'40px 20px',color:'var(--text-soft)'}},'Selecciona un mensajero arriba para ver sus entregas.'),
    mensajeroSel&&cargando&&React.createElement('div',{style:{textAlign:'center',padding:'40px 20px',color:'var(--text-soft)'}},'Cargando entregas...'),
    mensajeroSel&&!cargando&&envios.length===0&&React.createElement('div',{style:{textAlign:'center',padding:'40px 20px',color:'var(--text-soft)'}},'🎉 '+mensajeroSel.replace(/,\s*/g,' ')+' no tiene entregas pendientes en este momento.'),
    mensajeroSel&&!cargando&&envios.length>0&&React.createElement('div',{className:'table-wrap'},
      React.createElement('table',null,
        React.createElement('thead',null,React.createElement('tr',null,
          React.createElement('th',null,'Código'),
          React.createElement('th',null,'Destinatario'),
          React.createElement('th',null,'Dirección'),
          React.createElement('th',null,'Comuna'),
          React.createElement('th',null,'Estado'),
          React.createElement('th',null,''))),
        React.createElement('tbody',null,envios.map(function(e){
          var est=estadoInfo(e.estado);
          return React.createElement('tr',{key:e.codigo},
            React.createElement('td',{style:{fontFamily:'JetBrains Mono',fontWeight:700,fontSize:11}},e.codigo),
            React.createElement('td',{style:{fontSize:12}},e.destinatario||'—'),
            React.createElement('td',{style:{fontSize:12}},e.direccion||'—'),
            React.createElement('td',{style:{fontSize:12}},e.comuna||'—'),
            React.createElement('td',null,estadoBadge(e.estado)),
            React.createElement('td',null,React.createElement('button',{className:'action-btn btn-edit',onClick:function(){setEnvioActivo(e);}},'✍ Gestionar')));
        })))),

    envioActivo&&React.createElement(GestionEntregaModal,{
      envio:envioActivo,
      // Se usa el mensajero asignado del PROPIO envío (no el filtro de la grilla de arriba) --
      // así el pago/atribución queda siempre correcto, incluso cuando el envío se abrió por el
      // buscador de código directo con un mensajero distinto (o ninguno) seleccionado arriba.
      mensajeroNombre:envioActivo.mensajero||mensajeroSel,
      adminNombre:adminNombre,
      motivosReprogramacion:motivosReprogramacion,
      toast:toast,
      onClose:function(){setEnvioActivo(null);},
      onGuardado:function(){setEnvioActivo(null);if(mensajeroSel)cargarEnvios(mensajeroSel);}
    }));
}

window.Firmas = Firmas;
})();
