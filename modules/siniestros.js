(function(){
var useEffect=React.useEffect, useState=React.useState;
var db=window.__app.db, Modal=window.__app.Modal, estadoInfo=window.__app.estadoInfo,
    fechaHoyCL=window.__app.fechaHoyCL, registrarSiniestro=window.__app.registrarSiniestro,
    exportToExcel=window.__app.exportToExcel;

function fmtCLP(n){
  var v=parseFloat(n)||0;
  return '$'+Math.round(v).toLocaleString('es-CL');
}
function fmtFechaHora(iso){
  if(!iso)return '—';
  try{return new Date(iso).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return iso;}
}

// Luis explicó que el estado con el MENSAJERO y la forma de pago al CLIENTE son dos cosas
// independientes que pueden pasar al mismo tiempo (ej: se le pagó al proveedor por transferencia
// Y por separado se le descontó al mensajero; o no corresponde descontarle nada al mensajero pero
// al cliente igual se le aplicó un descuento en la facturación). Antes esto vivía en un solo campo
// "resolucion" con 5 opciones mezcladas, y eso no dejaba marcar las dos cosas a la vez. Ahora son
// dos campos separados, cada uno con su propio selector en la tabla:
//   resolucion    -> SOLO el estado con el mensajero (pendiente / mensajero / sin_descuento)
//   pago_cliente  -> SOLO la forma de pago al cliente (5 opciones, igual que la planilla)
// Por debajo, "mensajero" y "descuento_facturacion" siguen escribiendo los mismos campos de
// siempre (descontado_cliente/descontado_mensajero + su valor/fecha/semana) porque el Recibo de
// Cobro oficial (generarReciboCobro en index.html) y el cálculo de pago semanal de mensajeros
// (modules/pagos-mensajeros.js) dependen de esos campos exactos -- nada de eso cambió. De las 5
// formas de pago al cliente, SOLO "descuento_facturacion" resta plata de su Recibo de Cobro; las
// otras 4 (no pagado, transferencia al proveedor, mediación, sin informar) son solo un registro
// informativo y no le tocan la factura al cliente.
var ESTADOS_MENSAJERO=[
  {val:'pendiente',label:'Pendiente',color:'#b03030',bg:'#FCEAEA'},
  {val:'mensajero',label:'Descontada al mensajero',color:'#2e7d4f',bg:'#E8F5EC'},
  {val:'sin_descuento',label:'No corresponde descuento',color:'#3a6ea5',bg:'#E9F1F9'}
];
function estadoMensajeroInfo(val){
  for(var i=0;i<ESTADOS_MENSAJERO.length;i++)if(ESTADOS_MENSAJERO[i].val===val)return ESTADOS_MENSAJERO[i];
  return ESTADOS_MENSAJERO[0];
}
var ESTADOS_PAGO_CLIENTE=[
  {val:'no_pagado',label:'No se ha pagado',color:'#b03030',bg:'#FCEAEA'},
  {val:'descuento_facturacion',label:'Descuento de la facturación',color:'#2e7d4f',bg:'#E8F5EC'},
  {val:'transferencia_proveedor',label:'Transferencia al proveedor',color:'#2e7d4f',bg:'#E8F5EC'},
  {val:'mediacion',label:'Se logra mediación',color:'#3a6ea5',bg:'#E9F1F9'},
  {val:'sin_informar',label:'Sin informar',color:'#8a6d1a',bg:'#FBF3DC'}
];
function pagoClienteInfo(val){
  for(var i=0;i<ESTADOS_PAGO_CLIENTE.length;i++)if(ESTADOS_PAGO_CLIENTE[i].val===val)return ESTADOS_PAGO_CLIENTE[i];
  return ESTADOS_PAGO_CLIENTE[0];
}

// Modal chico para elegir la semana de pago (mismo formato que usa Pagos Mensajeros:
// "DD-MM-YYYY al DD-MM-YYYY") a la que se le va a restar el valor del siniestro.
function ModalSemana(props){
  // Modo normal: props.row trae un único registro. Modo masivo (selección con checks):
  // props.bulk trae {cantidad, total} y aplica la MISMA semana elegida a todos los
  // seleccionados de una sola vez -- así no hay que abrir el modal código por código.
  var row=props.row, bulk=props.bulk, onClose=props.onClose, onConfirm=props.onConfirm;
  var hoy=new Date();
  var lunes=new Date(hoy); lunes.setDate(hoy.getDate()-((hoy.getDay()+6)%7));
  var sabado=new Date(lunes); sabado.setDate(lunes.getDate()+5);
  var toInput=function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  var _d1=useState(toInput(lunes)), d1=_d1[0], setD1=_d1[1];
  var _d2=useState(toInput(sabado)), d2=_d2[0], setD2=_d2[1];
  var _guardando=useState(false), guardando=_guardando[0], setGuardando=_guardando[1];
  function confirmar(){
    if(!d1||!d2){return;}
    var f1=new Date(d1+'T12:00:00'), f2=new Date(d2+'T12:00:00');
    var semana=f1.toLocaleDateString('es-CL')+' al '+f2.toLocaleDateString('es-CL');
    setGuardando(true);
    onConfirm(semana).finally(function(){setGuardando(false);});
  }
  return React.createElement(Modal,{title:'🧾 Descontar a mensajero',
    sub:bulk?(bulk.cantidad+' código(s) seleccionados'):(row.codigo+' · '+(row.mensajero||'Sin mensajero')),onClose:onClose},
    bulk?
      React.createElement('div',{style:{fontSize:13,marginBottom:14,color:'var(--text-mid)'}},
        'Se va a restar ',React.createElement('strong',null,fmtCLP(bulk.total)),' en total, repartido entre los '+bulk.cantidad+' código(s) seleccionados, del pago de la semana que elijas (a cada mensajero se le descuenta lo que corresponda a su propio código).'):
      React.createElement('div',{style:{fontSize:13,marginBottom:14,color:'var(--text-mid)'}},
        'Se va a restar ',React.createElement('strong',null,fmtCLP(row.valor_siniestro)),' del pago de la semana que elijas.'),
    React.createElement('div',{style:{display:'flex',gap:10,marginBottom:16}},
      React.createElement('div',{style:{flex:1}},
        React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Desde'),
        React.createElement('input',{type:'date',className:'form-input',value:d1,onChange:function(e){setD1(e.target.value);},style:{margin:0}})),
      React.createElement('div',{style:{flex:1}},
        React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Hasta'),
        React.createElement('input',{type:'date',className:'form-input',value:d2,onChange:function(e){setD2(e.target.value);},style:{margin:0}}))),
    React.createElement('div',{className:'modal-actions'},
      React.createElement('button',{className:'btn-secondary',onClick:onClose},'Cancelar'),
      React.createElement('button',{className:'btn-confirm',disabled:guardando,onClick:confirmar},guardando?'Guardando...':'✓ Confirmar descuento')));
}

// Modal para registrar manualmente un siniestro sobre un código existente, sin pasar por el
// selector de estado (útil si el estado ya se cambió antes de que existiera este registro,
// o si se necesita dejar la constancia sin tocar el estado del envío).
function ModalNuevo(props){
  var onClose=props.onClose, onCreado=props.onCreado, mensajeros=props.mensajeros||[];
  var _codigo=useState(''), codigo=_codigo[0], setCodigo=_codigo[1];
  var _mensajero=useState(''), mensajero=_mensajero[0], setMensajero=_mensajero[1];
  var _nota=useState(''), nota=_nota[0], setNota=_nota[1];
  var _guardando=useState(false), guardando=_guardando[0], setGuardando=_guardando[1];
  var _error=useState(''), error=_error[0], setError=_error[1];
  function guardar(){
    var cod=(codigo||'').trim();
    if(!cod){setError('Ingresa el código del envío');return;}
    setGuardando(true); setError('');
    db.from('envios').select('codigo').eq('codigo',cod).limit(1).then(function(r){
      if(!r.data||r.data.length===0){setGuardando(false);setError('No existe un envío con ese código');return;}
      registrarSiniestro(cod,mensajero,nota).then(function(){
        setGuardando(false);
        onCreado();
      });
    });
  }
  return React.createElement(Modal,{title:'⚠ Registrar siniestro manual',sub:'Deja constancia de un siniestro sin depender del estado del envío',onClose:onClose},
    error&&React.createElement('div',{style:{background:'rgba(176,48,48,0.08)',color:'var(--danger)',padding:'8px 12px',borderRadius:8,fontSize:12,marginBottom:12,fontWeight:600}},'⚠ ',error),
    React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Código del envío'),
    React.createElement('input',{className:'form-input',value:codigo,onChange:function(e){setCodigo(e.target.value);},placeholder:'Ej: PGSO000012345'}),
    React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',margin:'12px 0 4px'}},'Mensajero (opcional)'),
    React.createElement('select',{className:'form-input',value:mensajero,onChange:function(e){setMensajero(e.target.value);}},
      React.createElement('option',{value:''},'Sin mensajero'),
      mensajeros.map(function(m){return React.createElement('option',{key:m.id||m.nombre,value:m.nombre},m.nombre.replace(/,\s*/g,' '));})),
    React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',margin:'12px 0 4px'}},'Nota'),
    React.createElement('textarea',{className:'form-input',rows:3,value:nota,onChange:function(e){setNota(e.target.value);},placeholder:'¿Qué pasó?',style:{resize:'vertical'}}),
    React.createElement('div',{className:'modal-actions'},
      React.createElement('button',{className:'btn-secondary',onClick:onClose},'Cancelar'),
      React.createElement('button',{className:'btn-confirm',disabled:guardando,onClick:guardar},guardando?'Guardando...':'✓ Registrar')));
}

function Siniestros(props){
  var toast=props.toast, usuario=props.usuario, mensajeros=props.mensajeros||[];
  var nombreUsuario=(usuario&&(usuario.nombre||usuario))||'Admin';
  var _registros=useState([]), registros=_registros[0], setRegistros=_registros[1];
  var _cargando=useState(true), cargando=_cargando[0], setCargando=_cargando[1];
  var _filtro=useState('pendiente'), filtro=_filtro[0], setFiltro=_filtro[1]; // uno de ESTADOS_MENSAJERO.val, o 'todos'
  var _filtroCliente=useState('todos'), filtroCliente=_filtroCliente[0], setFiltroCliente=_filtroCliente[1]; // uno de ESTADOS_PAGO_CLIENTE.val, o 'todos'
  var _modalMensajero=useState(null), modalMensajero=_modalMensajero[0], setModalMensajero=_modalMensajero[1];
  var _modalNuevo=useState(false), modalNuevo=_modalNuevo[0], setModalNuevo=_modalNuevo[1];
  var _valorEdit=useState({}), valorEdit=_valorEdit[0], setValorEdit=_valorEdit[1];
  var _notaEdit=useState({}), notaEdit=_notaEdit[0], setNotaEdit=_notaEdit[1];
  var _rango=useState('todos'), rango=_rango[0], setRango=_rango[1]; // todos|hoy|semana|mes|rango
  var _rangoDesde=useState(''), rangoDesde=_rangoDesde[0], setRangoDesde=_rangoDesde[1];
  var _busqueda=useState(''), busqueda=_busqueda[0], setBusqueda=_busqueda[1];
  // Selección con checks -- para elegir a mano qué códigos procesar (de la semana, del mes o
  // de cualquier combinación que arme con el buscador) y descontarlos todos juntos, en vez de
  // tener que entrar código por código. Se guarda por id de siniestro, no por posición en la
  // tabla, así sigue siendo válida aunque cambie el filtro o el orden.
  var _seleccionados=useState({}), seleccionados=_seleccionados[0], setSeleccionados=_seleccionados[1];
  var _modalMensajeroBulk=useState(false), modalMensajeroBulk=_modalMensajeroBulk[0], setModalMensajeroBulk=_modalMensajeroBulk[1];
  var _bulkMensajero=useState(''), bulkMensajero=_bulkMensajero[0], setBulkMensajero=_bulkMensajero[1]; // estado elegido en la barra de selección masiva (mensajero)
  var _bulkCliente=useState(''), bulkCliente=_bulkCliente[0], setBulkCliente=_bulkCliente[1]; // forma de pago elegida en la barra de selección masiva (cliente)
  var _rangoHasta=useState(''), rangoHasta=_rangoHasta[0], setRangoHasta=_rangoHasta[1];

  // Límites de fecha (formato YYYY-MM-DD, igual que fecha_siniestro) según el preset elegido.
  function limitesRango(){
    var hoy=fechaHoyCL();
    if(rango==='hoy')return{desde:hoy,hasta:hoy};
    if(rango==='semana'){
      var d=new Date(); var lunes=new Date(d); lunes.setDate(d.getDate()-((d.getDay()+6)%7));
      return{desde:fechaHoyCL(lunes),hasta:hoy};
    }
    if(rango==='mes'){
      var d2=new Date(); var primero=new Date(d2.getFullYear(),d2.getMonth(),1);
      return{desde:fechaHoyCL(primero),hasta:hoy};
    }
    if(rango==='rango')return{desde:rangoDesde||null,hasta:rangoHasta||null};
    return{desde:null,hasta:null};
  }

  function cargar(){
    setCargando(true);
    db.from('siniestros').select('*').order('created_at',{ascending:false}).then(function(r){
      var rows=r.data||[];
      var codigos=Array.from(new Set(rows.map(function(x){return x.codigo;}).filter(Boolean)));
      if(codigos.length===0){setRegistros([]);setCargando(false);return;}
      db.from('envios').select('codigo,cliente,estado,destinatario,direccion,comuna,valor_siniestro').in('codigo',codigos).then(function(r2){
        var mapaEnvios={};
        (r2.data||[]).forEach(function(e){mapaEnvios[e.codigo]=e;});
        var merged=rows.map(function(s){
          var e=mapaEnvios[s.codigo]||{};
          return Object.assign({},s,{
            cliente:e.cliente||'—',estado:e.estado||'—',destinatario:e.destinatario||'—',
            direccion:e.direccion||'—',comuna:e.comuna||'—',
            valor_siniestro:e.valor_siniestro!=null?e.valor_siniestro:0
          });
        });
        setRegistros(merged);
        setCargando(false);
      });
    }).catch(function(e){console.warn('Error cargando siniestros:',e.message);setCargando(false);});
  }
  useEffect(function(){cargar();},[]);

  var lim=limitesRango();
  var enRango=registros.filter(function(r){
    if(!lim.desde&&!lim.hasta)return true;
    var f=r.fecha_siniestro;
    if(!f)return false;
    if(lim.desde&&f<lim.desde)return false;
    if(lim.hasta&&f>lim.hasta)return false;
    return true;
  });
  // Los dos filtros (mensajero y cliente) son independientes entre sí -- se pueden combinar,
  // por ejemplo "Descontada al mensajero" + "Se logra mediación" a la vez.
  var filtrados=enRango.filter(function(r){
    var okMensajero=filtro==='todos'||(r.resolucion||'pendiente')===filtro;
    var okCliente=filtroCliente==='todos'||(r.pago_cliente||'no_pagado')===filtroCliente;
    return okMensajero&&okCliente;
  });
  // Buscador libre por código, mensajero, cliente o fecha del siniestro -- se aplica encima
  // del período y de los filtros de estado, para poder acotar rápido dentro de "Este mes",
  // "Esta semana", etc. sin perder esos filtros.
  var q=busqueda.trim().toLowerCase();
  if(q){
    filtrados=filtrados.filter(function(r){
      return (r.codigo||'').toLowerCase().indexOf(q)!==-1
        || (r.mensajero||'').toLowerCase().indexOf(q)!==-1
        || (r.cliente||'').toLowerCase().indexOf(q)!==-1
        || (r.fecha_siniestro||'').toLowerCase().indexOf(q)!==-1;
    });
  }

  // Totales acumulados del período actual — para hacerle seguimiento rápido a pagos y descuentos.
  // Mensajero y cliente se cuentan por separado porque son campos independientes.
  var totales=enRango.reduce(function(a,r){
    var v=parseFloat(r.valor_siniestro)||0;
    var resM=r.resolucion||'pendiente';
    var resC=r.pago_cliente||'no_pagado';
    a.cantidad+=1;
    a.valorTotal+=v;
    if(resM==='pendiente'){a.mensajeroPendienteCantidad+=1;a.mensajeroPendienteValor+=v;}
    else if(resM==='mensajero'){a.mensajeroDescontadoValor+=parseFloat(r.descontado_mensajero_valor)||0;}
    else if(resM==='sin_descuento'){a.mensajeroSinDescuentoCantidad+=1;}
    if(resC==='no_pagado'){a.clienteNoPagadoCantidad+=1;}
    else if(resC==='descuento_facturacion'){a.clienteDescuentoValor+=parseFloat(r.descontado_cliente_valor)||0;}
    else if(resC==='transferencia_proveedor'){a.clienteTransferenciaCantidad+=1;}
    else if(resC==='mediacion'){a.clienteMediacionCantidad+=1;}
    else if(resC==='sin_informar'){a.clienteSinInformarCantidad+=1;}
    return a;
  },{cantidad:0,valorTotal:0,
     mensajeroPendienteCantidad:0,mensajeroPendienteValor:0,mensajeroDescontadoValor:0,mensajeroSinDescuentoCantidad:0,
     clienteNoPagadoCantidad:0,clienteDescuentoValor:0,clienteTransferenciaCantidad:0,clienteMediacionCantidad:0,clienteSinInformarCantidad:0});

  function exportarExcel(){
    var headers=['Código','Cliente','Mensajero','Estado actual','Fecha siniestro','Valor',
      'Estado con mensajero','Valor descontado a mensajero','Semana descuento mensajero','Fecha resolución mensajero','Resuelto por (mensajero)',
      'Forma de pago al cliente','Valor descuento facturación','Fecha resolución cliente','Resuelto por (cliente)',
      'Nota'];
    var rows=filtrados.map(function(r){
      var est=estadoInfo?estadoInfo(r.estado):{label:r.estado};
      var resM=r.resolucion||'pendiente';
      var resC=r.pago_cliente||'no_pagado';
      return[r.codigo,r.cliente,(r.mensajero||'—').replace(/,\s*/g,' '),est.label,r.fecha_siniestro||'',r.valor_siniestro||0,
        estadoMensajeroInfo(resM).label,
        resM==='mensajero'?(r.descontado_mensajero_valor||0):'',
        resM==='mensajero'?(r.descontado_mensajero_semana||''):'',
        resM==='pendiente'?'':fmtFechaHora(r.resolucion_fecha),
        resM==='pendiente'?'':(r.resolucion_por||''),
        pagoClienteInfo(resC).label,
        resC==='descuento_facturacion'?(r.descontado_cliente_valor||0):'',
        resC==='no_pagado'?'':fmtFechaHora(r.pago_cliente_fecha),
        resC==='no_pagado'?'':(r.pago_cliente_por||''),
        r.nota||''];
    });
    exportToExcel('Siniestros_TransPgso_'+fechaHoyCL(),[{name:'Siniestros',headers:headers,rows:rows}]);
  }

  // Corrige el mensajero de un registro de siniestro ya creado — por ejemplo cuando el envío
  // se reasignó de mensajero antes de que ocurriera el siniestro y quedó guardado el nombre
  // equivocado. Solo toca la tabla siniestros (no el envío en sí).
  function guardarMensajero(row,nuevoMensajero){
    db.from('siniestros').update({mensajero:nuevoMensajero}).eq('id',row.id).then(function(r){
      if(r.error){toast&&toast('⚠ Error guardando mensajero: '+r.error.message);return;}
      setRegistros(function(prev){return prev.map(function(x){return x.id===row.id?Object.assign({},x,{mensajero:nuevoMensajero}):x;});});
      toast&&toast('✓ Mensajero corregido');
    });
  }

  function guardarValor(row){
    var val=valorEdit[row.id];
    if(val==null)return;
    var num=parseFloat(val)||0;
    db.from('envios').update({valor_siniestro:num}).eq('codigo',row.codigo).then(function(r){
      if(r.error){toast&&toast('⚠ Error guardando valor: '+r.error.message);return;}
      setRegistros(function(prev){return prev.map(function(x){return x.id===row.id?Object.assign({},x,{valor_siniestro:num}):x;});});
      setValorEdit(function(prev){var n=Object.assign({},prev);delete n[row.id];return n;});
      toast&&toast('✓ Valor actualizado');
    });
  }

  function guardarNota(row){
    var val=notaEdit[row.id];
    if(val==null)return;
    db.from('siniestros').update({nota:val}).eq('id',row.id).then(function(r){
      if(r.error){toast&&toast('⚠ Error guardando nota: '+r.error.message);return;}
      setRegistros(function(prev){return prev.map(function(x){return x.id===row.id?Object.assign({},x,{nota:val}):x;});});
      setNotaEdit(function(prev){var n=Object.assign({},prev);delete n[row.id];return n;});
      toast&&toast('✓ Nota actualizada');
    });
  }

  // ---- Estado con el MENSAJERO (independiente de la forma de pago al cliente) ----
  // Solo "mensajero" toca los campos descontado_mensajero (el pago semanal de mensajeros sigue
  // leyendo esos campos exactamente igual que siempre). "sin_descuento" cierra el caso sin
  // cobrarle nada al mensajero.
  function limpiarCamposMensajero(){
    return{descontado_mensajero:false,descontado_mensajero_valor:null,descontado_mensajero_semana:null,descontado_mensajero_fecha:null,descontado_mensajero_por:null};
  }
  function payloadMensajero(row,nuevo,semana){
    if(nuevo==='mensajero'){
      return Object.assign({resolucion:'mensajero',resolucion_fecha:new Date().toISOString(),resolucion_por:nombreUsuario},
        {descontado_mensajero:true,descontado_mensajero_valor:row.valor_siniestro,descontado_mensajero_semana:semana,
         descontado_mensajero_fecha:new Date().toISOString(),descontado_mensajero_por:nombreUsuario});
    }
    if(nuevo==='pendiente'){
      return Object.assign({resolucion:'pendiente',resolucion_fecha:null,resolucion_por:null},limpiarCamposMensajero());
    }
    // sin_descuento -- no corresponde descontarle nada al mensajero
    return Object.assign({resolucion:'sin_descuento',resolucion_fecha:new Date().toISOString(),resolucion_por:nombreUsuario},limpiarCamposMensajero());
  }
  function mensajeConfirmacionMensajero(codigoTexto,nuevo,montoTexto){
    var label=estadoMensajeroInfo(nuevo).label;
    if(nuevo==='pendiente')return '¿Volver '+codigoTexto+' a "'+label+'"? Se deshace el descuento al mensajero ya aplicado.';
    if(nuevo==='sin_descuento')return '¿Marcar '+codigoTexto+' como "'+label+'"? No se le descuenta nada al mensajero.';
    return '¿Marcar '+codigoTexto+' como "'+label+'"? Se descuenta '+montoTexto+' al mensajero.';
  }
  function guardarEstadoMensajero(row,nuevo,semana){
    return db.from('siniestros').update(payloadMensajero(row,nuevo,semana)).eq('id',row.id).then(function(r){
      if(r.error){toast&&toast('⚠ Error: '+r.error.message);return;}
      setModalMensajero(null);
      cargar();
      toast&&toast('✓ '+row.codigo+' (mensajero) → '+estadoMensajeroInfo(nuevo).label);
    });
  }
  function cambiarEstadoMensajero(row,nuevo){
    if(nuevo===(row.resolucion||'pendiente'))return;
    if(nuevo==='mensajero'){setModalMensajero(row);return;} // pide la semana antes de guardar
    if(!window.confirm(mensajeConfirmacionMensajero(row.codigo,nuevo,fmtCLP(row.valor_siniestro))))return;
    guardarEstadoMensajero(row,nuevo);
  }

  // ---- Forma de pago al CLIENTE (independiente del estado con el mensajero) ----
  // Solo "descuento_facturacion" toca los campos descontado_cliente (el Recibo de Cobro oficial
  // sigue leyendo esos campos exactamente igual que siempre). Las otras formas de pago son solo
  // un registro informativo -- no le descuentan nada de la factura al cliente.
  function limpiarCamposCliente(){
    return{descontado_cliente:false,descontado_cliente_valor:null,descontado_cliente_fecha:null,descontado_cliente_por:null};
  }
  function payloadPagoCliente(row,nuevo){
    if(nuevo==='descuento_facturacion'){
      return Object.assign({pago_cliente:'descuento_facturacion',pago_cliente_fecha:new Date().toISOString(),pago_cliente_por:nombreUsuario},
        {descontado_cliente:true,descontado_cliente_valor:row.valor_siniestro,
         descontado_cliente_fecha:new Date().toISOString(),descontado_cliente_por:nombreUsuario});
    }
    if(nuevo==='no_pagado'){
      return Object.assign({pago_cliente:'no_pagado',pago_cliente_fecha:null,pago_cliente_por:null},limpiarCamposCliente());
    }
    // transferencia_proveedor | mediacion | sin_informar -- no le descuentan nada de la factura al cliente
    return Object.assign({pago_cliente:nuevo,pago_cliente_fecha:new Date().toISOString(),pago_cliente_por:nombreUsuario},limpiarCamposCliente());
  }
  function mensajeConfirmacionCliente(codigoTexto,nuevo,montoTexto){
    var label=pagoClienteInfo(nuevo).label;
    if(nuevo==='no_pagado')return '¿Volver '+codigoTexto+' a "'+label+'"? Se deshace el descuento a la facturación si ya estaba aplicado.';
    if(nuevo==='descuento_facturacion')return '¿Marcar '+codigoTexto+' como "'+label+'"? Se descuenta '+montoTexto+' de la facturación al cliente.';
    return '¿Marcar '+codigoTexto+' como "'+label+'"? No se le descuenta nada de la factura al cliente.';
  }
  function guardarPagoCliente(row,nuevo){
    return db.from('siniestros').update(payloadPagoCliente(row,nuevo)).eq('id',row.id).then(function(r){
      if(r.error){toast&&toast('⚠ Error: '+r.error.message);return;}
      cargar();
      toast&&toast('✓ '+row.codigo+' (cliente) → '+pagoClienteInfo(nuevo).label);
    });
  }
  function cambiarPagoCliente(row,nuevo){
    if(nuevo===(row.pago_cliente||'no_pagado'))return;
    if(!window.confirm(mensajeConfirmacionCliente(row.codigo,nuevo,fmtCLP(row.valor_siniestro))))return;
    guardarPagoCliente(row,nuevo);
  }

  // ---- Selección con checks y acciones masivas ----
  // La selección se guarda por id de siniestro (no por fila de la tabla filtrada), así que
  // sigue siendo válida aunque el usuario cambie de período, de filtro de estado o escriba
  // algo en el buscador entre medio.
  function filasSeleccionadas(){
    return registros.filter(function(r){return!!seleccionados[r.id];});
  }
  function toggleSeleccion(row){
    setSeleccionados(function(prev){
      var n=Object.assign({},prev);
      if(n[row.id])delete n[row.id];else n[row.id]=true;
      return n;
    });
  }
  var todosFiltradosSeleccionados=filtrados.length>0&&filtrados.every(function(r){return!!seleccionados[r.id];});
  function toggleTodosFiltrados(){
    setSeleccionados(function(prev){
      var n=Object.assign({},prev);
      if(todosFiltradosSeleccionados){
        filtrados.forEach(function(r){delete n[r.id];});
      }else{
        filtrados.forEach(function(r){n[r.id]=true;});
      }
      return n;
    });
  }
  function limpiarSeleccion(){setSeleccionados({});setBulkMensajero('');setBulkCliente('');}

  // Aplica el MISMO estado con el mensajero a todos los seleccionados que todavía no lo tengan --
  // así se puede, por ejemplo, descontarle a varios códigos del mes al mismo mensajero en la
  // misma semana de pago, de una sola vez.
  function candidatosBulkMensajero(nuevo){
    return filasSeleccionadas().filter(function(r){return(r.resolucion||'pendiente')!==nuevo;});
  }
  function aplicarEstadoMensajeroMasivo(nuevo,semana){
    var cand=candidatosBulkMensajero(nuevo);
    if(cand.length===0){toast&&toast('Los seleccionados ya están en ese estado');return Promise.resolve();}
    return Promise.all(cand.map(function(row){
      return db.from('siniestros').update(payloadMensajero(row,nuevo,semana)).eq('id',row.id);
    })).then(function(results){
      var errores=results.filter(function(r){return r&&r.error;});
      setModalMensajeroBulk(false);
      cargar();
      limpiarSeleccion();
      if(errores.length>0)toast&&toast('⚠ '+errores.length+' de '+cand.length+' tuvieron error, revisa e intenta de nuevo');
      else toast&&toast('✓ '+cand.length+' código(s) (mensajero) → '+estadoMensajeroInfo(nuevo).label);
    });
  }
  function aplicarBulkMensajeroClick(){
    if(!bulkMensajero){toast&&toast('Elige primero a qué estado los quieres pasar');return;}
    var cand=candidatosBulkMensajero(bulkMensajero);
    if(cand.length===0){toast&&toast('Los seleccionados ya están en ese estado');return;}
    if(bulkMensajero==='mensajero'){setModalMensajeroBulk(true);return;} // pide la semana antes de guardar
    if(!window.confirm('¿Marcar '+cand.length+' código(s) seleccionados como "'+estadoMensajeroInfo(bulkMensajero).label+'"? No se les descuenta nada al mensajero.'))return;
    aplicarEstadoMensajeroMasivo(bulkMensajero);
  }

  // Aplica la MISMA forma de pago al cliente a todos los seleccionados que todavía no la tengan.
  function candidatosBulkCliente(nuevo){
    return filasSeleccionadas().filter(function(r){return(r.pago_cliente||'no_pagado')!==nuevo;});
  }
  function aplicarPagoClienteMasivo(nuevo){
    var cand=candidatosBulkCliente(nuevo);
    if(cand.length===0){toast&&toast('Los seleccionados ya están en esa forma de pago');return Promise.resolve();}
    return Promise.all(cand.map(function(row){
      return db.from('siniestros').update(payloadPagoCliente(row,nuevo)).eq('id',row.id);
    })).then(function(results){
      var errores=results.filter(function(r){return r&&r.error;});
      cargar();
      limpiarSeleccion();
      if(errores.length>0)toast&&toast('⚠ '+errores.length+' de '+cand.length+' tuvieron error, revisa e intenta de nuevo');
      else toast&&toast('✓ '+cand.length+' código(s) (cliente) → '+pagoClienteInfo(nuevo).label);
    });
  }
  function aplicarBulkClienteClick(){
    if(!bulkCliente){toast&&toast('Elige primero a qué forma de pago los quieres pasar');return;}
    var cand=candidatosBulkCliente(bulkCliente);
    if(cand.length===0){toast&&toast('Los seleccionados ya están en esa forma de pago');return;}
    var total=cand.reduce(function(a,r){return a+(parseFloat(r.valor_siniestro)||0);},0);
    var extra=bulkCliente==='descuento_facturacion'?(' Se descuenta '+fmtCLP(total)+' en total de la facturación, cada uno con su propio monto.'):' No se les descuenta nada de la factura.';
    if(!window.confirm('¿Marcar '+cand.length+' código(s) seleccionados como "'+pagoClienteInfo(bulkCliente).label+'"?'+extra))return;
    aplicarPagoClienteMasivo(bulkCliente);
  }

  var FILTROS_MENSAJERO=ESTADOS_MENSAJERO.map(function(e){return{val:e.val,label:e.label};}).concat([{val:'todos',label:'Todos'}]);
  var FILTROS_CLIENTE=ESTADOS_PAGO_CLIENTE.map(function(e){return{val:e.val,label:e.label};}).concat([{val:'todos',label:'Todos'}]);

  var RANGOS=[
    {val:'todos',label:'Todo el historial'},
    {val:'hoy',label:'Hoy'},
    {val:'semana',label:'Esta semana'},
    {val:'mes',label:'Este mes'},
    {val:'rango',label:'Rango personalizado'}
  ];
  var STATS=[
    {label:'Siniestros en el período',val:totales.cantidad,color:'var(--dark)'},
    {label:'Valor total',val:fmtCLP(totales.valorTotal),color:'var(--dark)'},
    {label:'Mensajero: pendiente',val:totales.mensajeroPendienteCantidad+' · '+fmtCLP(totales.mensajeroPendienteValor),color:'var(--danger)'},
    {label:'Mensajero: descontado',val:fmtCLP(totales.mensajeroDescontadoValor),color:'var(--success)'},
    {label:'Mensajero: sin descuento',val:totales.mensajeroSinDescuentoCantidad,color:'#3a6ea5'},
    {label:'Cliente: no pagado',val:totales.clienteNoPagadoCantidad,color:'var(--danger)'},
    {label:'Cliente: descuento facturación',val:fmtCLP(totales.clienteDescuentoValor),color:'var(--success)'},
    {label:'Cliente: transferencia proveedor',val:totales.clienteTransferenciaCantidad,color:'var(--success)'},
    {label:'Cliente: mediación',val:totales.clienteMediacionCantidad,color:'#3a6ea5'},
    {label:'Cliente: sin informar',val:totales.clienteSinInformarCantidad,color:'#8a6d1a'}
  ];

  return React.createElement('div',null,
    React.createElement('div',{className:'section-head'},
      React.createElement('div',{className:'section-title'},'Siniestros'),
      React.createElement('div',{style:{display:'flex',gap:8}},
        React.createElement('button',{className:'btn-add',onClick:function(){setModalNuevo(true);}},'+ Registrar siniestro'),
        React.createElement('button',{className:'action-btn btn-edit',disabled:filtrados.length===0,onClick:exportarExcel},'📊 Exportar Excel'))),
    React.createElement('div',{className:'info-banner'},
      '⚠ Aquí quedan registrados todos los códigos que alguna vez pasaron por estado "Siniestro", ',
      'aunque después salgan a despacho o se entreguen. El estado con el mensajero y la forma de pago ',
      'al cliente son independientes entre sí, y se marcan manualmente, cuando tú decidas — nunca automático.'),
    React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:6}},'Período'),
    React.createElement('div',{style:{display:'flex',gap:8,marginBottom:rango==='rango'?10:16,flexWrap:'wrap',alignItems:'center'}},
      RANGOS.map(function(r){
        return React.createElement('button',{key:r.val,onClick:function(){setRango(r.val);},
          style:{padding:'8px 14px',borderRadius:20,border:'1px solid '+(rango===r.val?'var(--gold)':'var(--border)'),
            background:rango===r.val?'rgba(200,168,75,0.15)':'#fff',color:rango===r.val?'#8a6d1a':'var(--text-mid)',
            fontSize:12,fontWeight:700,cursor:'pointer'}},r.label);
      })),
    rango==='rango'&&React.createElement('div',{style:{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'flex-end'}},
      React.createElement('div',null,
        React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Desde'),
        React.createElement('input',{type:'date',className:'form-input',value:rangoDesde,onChange:function(e){setRangoDesde(e.target.value);},style:{margin:0}})),
      React.createElement('div',null,
        React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Hasta'),
        React.createElement('input',{type:'date',className:'form-input',value:rangoHasta,onChange:function(e){setRangoHasta(e.target.value);},style:{margin:0}}))),
    React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:18}},
      STATS.map(function(s,i){
        return React.createElement('div',{key:i,style:{padding:'12px 14px',background:'#fff',border:'1px solid var(--border)',borderRadius:10}},
          React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}},s.label),
          React.createElement('div',{style:{fontSize:16,fontWeight:700,color:s.color,fontFamily:'JetBrains Mono'}},s.val));
      })),
    React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:6}},'Estado con el mensajero'),
    React.createElement('div',{style:{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}},
      FILTROS_MENSAJERO.map(function(f){
        return React.createElement('button',{key:f.val,onClick:function(){setFiltro(f.val);},
          style:{padding:'8px 14px',borderRadius:20,border:'1px solid '+(filtro===f.val?'var(--gold)':'var(--border)'),
            background:filtro===f.val?'rgba(200,168,75,0.15)':'#fff',color:filtro===f.val?'#8a6d1a':'var(--text-mid)',
            fontSize:12,fontWeight:700,cursor:'pointer'}},f.label);
      })),
    React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:6}},'Forma de pago al cliente'),
    React.createElement('div',{style:{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}},
      FILTROS_CLIENTE.map(function(f){
        return React.createElement('button',{key:f.val,onClick:function(){setFiltroCliente(f.val);},
          style:{padding:'8px 14px',borderRadius:20,border:'1px solid '+(filtroCliente===f.val?'var(--gold)':'var(--border)'),
            background:filtroCliente===f.val?'rgba(200,168,75,0.15)':'#fff',color:filtroCliente===f.val?'#8a6d1a':'var(--text-mid)',
            fontSize:12,fontWeight:700,cursor:'pointer'}},f.label);
      })),
    React.createElement('input',{type:'text',className:'form-input',placeholder:'🔍 Buscar por código, mensajero, cliente o fecha (AAAA-MM-DD)...',
      value:busqueda,onChange:function(e){setBusqueda(e.target.value);},style:{marginBottom:16,maxWidth:420}}),
    filasSeleccionadas().length>0&&React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:10,
      background:'rgba(200,168,75,0.12)',border:'1px solid var(--gold)',borderRadius:10,padding:'10px 14px',marginBottom:16}},
      React.createElement('div',{style:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}},
        React.createElement('span',{style:{fontSize:12,fontWeight:700,color:'#8a6d1a'}},filasSeleccionadas().length+' seleccionado(s)'),
        React.createElement('button',{onClick:limpiarSeleccion,style:{fontSize:11,color:'var(--text-soft)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}},'Limpiar selección')),
      React.createElement('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}},
        React.createElement('span',{style:{fontSize:11,color:'var(--text-mid)',fontWeight:700,minWidth:70}},'Mensajero:'),
        React.createElement('select',{value:bulkMensajero,onChange:function(e){setBulkMensajero(e.target.value);},
          style:{fontSize:12,padding:'8px 10px',border:'1px solid var(--border)',borderRadius:8,background:'#fff',color:'var(--text-mid)',fontWeight:700}},
          React.createElement('option',{value:''},'Pasar a...'),
          ESTADOS_MENSAJERO.map(function(e){return React.createElement('option',{key:e.val,value:e.val},e.label);})),
        React.createElement('button',{className:'action-btn btn-edit',onClick:aplicarBulkMensajeroClick},'Aplicar')),
      React.createElement('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}},
        React.createElement('span',{style:{fontSize:11,color:'var(--text-mid)',fontWeight:700,minWidth:70}},'Cliente:'),
        React.createElement('select',{value:bulkCliente,onChange:function(e){setBulkCliente(e.target.value);},
          style:{fontSize:12,padding:'8px 10px',border:'1px solid var(--border)',borderRadius:8,background:'#fff',color:'var(--text-mid)',fontWeight:700}},
          React.createElement('option',{value:''},'Pasar a...'),
          ESTADOS_PAGO_CLIENTE.map(function(e){return React.createElement('option',{key:e.val,value:e.val},e.label);})),
        React.createElement('button',{className:'action-btn btn-edit',onClick:aplicarBulkClienteClick},'Aplicar'))),
    cargando?React.createElement('div',{style:{textAlign:'center',padding:'40px 20px',color:'var(--text-soft)'}},'Cargando siniestros...'):
    filtrados.length===0?React.createElement('div',{style:{textAlign:'center',padding:'40px 20px',color:'var(--text-soft)'}},'No hay siniestros en este filtro 🎉'):
    React.createElement('div',{className:'table-wrap'},
      React.createElement('table',null,
        React.createElement('thead',null,React.createElement('tr',null,
          React.createElement('th',null,React.createElement('input',{type:'checkbox',checked:todosFiltradosSeleccionados,onChange:toggleTodosFiltrados,title:'Seleccionar todos los filtrados'})),
          React.createElement('th',null,'Código'),
          React.createElement('th',null,'Cliente'),
          React.createElement('th',null,'Mensajero'),
          React.createElement('th',null,'Estado actual'),
          React.createElement('th',null,'Fecha siniestro'),
          React.createElement('th',null,'Valor'),
          React.createElement('th',null,'Estado con mensajero'),
          React.createElement('th',null,'Forma de pago al cliente'),
          React.createElement('th',null,'Nota'))),
        React.createElement('tbody',null,filtrados.map(function(row){
          var est=estadoInfo?estadoInfo(row.estado):{label:row.estado,color:'#7A7D6A'};
          return React.createElement('tr',{key:row.id,style:{background:seleccionados[row.id]?'rgba(200,168,75,0.10)':'rgba(198,40,40,0.03)'}},
            React.createElement('td',null,React.createElement('input',{type:'checkbox',checked:!!seleccionados[row.id],onChange:function(){toggleSeleccion(row);}})),
            React.createElement('td',{style:{fontFamily:'JetBrains Mono',fontWeight:700,fontSize:11,color:'var(--dark)'}},row.codigo),
            React.createElement('td',{style:{fontSize:12}},row.cliente),
            React.createElement('td',null,
              React.createElement('select',{value:row.mensajero||'',
                onChange:function(e){guardarMensajero(row,e.target.value);},
                style:{fontSize:11,padding:'4px 6px',border:'1px solid var(--border)',borderRadius:6,background:'#fff',color:'var(--text-mid)',maxWidth:130}},
                React.createElement('option',{value:''},'Sin mensajero'),
                mensajeros.map(function(m){return React.createElement('option',{key:m.id||m.nombre,value:m.nombre},m.nombre.replace(/,\s*/g,' '));}))),
            React.createElement('td',null,React.createElement('span',{style:{fontSize:11,fontWeight:700,color:est.color}},est.label)),
            React.createElement('td',{style:{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-soft)'}},row.fecha_siniestro||'—'),
            React.createElement('td',null,
              React.createElement('input',{type:'number',style:{width:90,padding:'4px 6px',border:'1px solid var(--border)',borderRadius:6,fontFamily:'JetBrains Mono',fontSize:11},
                value:valorEdit[row.id]!=null?valorEdit[row.id]:row.valor_siniestro,
                onChange:function(e){setValorEdit(function(prev){var n=Object.assign({},prev);n[row.id]=e.target.value;return n;});},
                onBlur:function(){if(valorEdit[row.id]!=null)guardarValor(row);},
                onFocus:function(e){e.target.select();}})),
            React.createElement('td',null,
              (function(){
                var resM=row.resolucion||'pendiente';
                var infoM=estadoMensajeroInfo(resM);
                return React.createElement('div',null,
                  React.createElement('select',{value:resM,
                    onChange:function(e){cambiarEstadoMensajero(row,e.target.value);},
                    style:{fontSize:11,fontWeight:700,padding:'4px 6px',borderRadius:6,border:'1px solid '+infoM.color,
                      background:infoM.bg,color:infoM.color,maxWidth:170}},
                    ESTADOS_MENSAJERO.map(function(e){return React.createElement('option',{key:e.val,value:e.val},e.label);})),
                  resM==='mensajero'&&React.createElement('div',{style:{fontSize:9,color:'var(--text-soft)',marginTop:2}},fmtCLP(row.descontado_mensajero_valor)+' · '+(row.descontado_mensajero_semana||'')),
                  resM==='sin_descuento'&&React.createElement('div',{style:{fontSize:9,color:'var(--text-soft)',marginTop:2}},fmtFechaHora(row.resolucion_fecha)));
              })()),
            React.createElement('td',null,
              (function(){
                var resC=row.pago_cliente||'no_pagado';
                var infoC=pagoClienteInfo(resC);
                return React.createElement('div',null,
                  React.createElement('select',{value:resC,
                    onChange:function(e){cambiarPagoCliente(row,e.target.value);},
                    style:{fontSize:11,fontWeight:700,padding:'4px 6px',borderRadius:6,border:'1px solid '+infoC.color,
                      background:infoC.bg,color:infoC.color,maxWidth:190}},
                    ESTADOS_PAGO_CLIENTE.map(function(e){return React.createElement('option',{key:e.val,value:e.val},e.label);})),
                  resC==='descuento_facturacion'&&React.createElement('div',{style:{fontSize:9,color:'var(--text-soft)',marginTop:2}},fmtCLP(row.descontado_cliente_valor)+' · '+fmtFechaHora(row.descontado_cliente_fecha)),
                  (resC==='transferencia_proveedor'||resC==='mediacion'||resC==='sin_informar')&&React.createElement('div',{style:{fontSize:9,color:'var(--text-soft)',marginTop:2}},fmtFechaHora(row.pago_cliente_fecha)));
              })()),
            React.createElement('td',null,
              React.createElement('input',{type:'text',style:{width:150,padding:'4px 6px',border:'1px solid var(--border)',borderRadius:6,fontSize:11,color:'var(--text-mid)'},
                value:notaEdit[row.id]!=null?notaEdit[row.id]:(row.nota||''),
                placeholder:'¿Qué pasó?',
                onChange:function(e){setNotaEdit(function(prev){var n=Object.assign({},prev);n[row.id]=e.target.value;return n;});},
                onBlur:function(){if(notaEdit[row.id]!=null)guardarNota(row);}})));
        })))),
    modalMensajero&&React.createElement(ModalSemana,{row:modalMensajero,onClose:function(){setModalMensajero(null);},onConfirm:function(semana){return guardarEstadoMensajero(modalMensajero,'mensajero',semana);}}),
    modalMensajeroBulk&&React.createElement(ModalSemana,{bulk:(function(){
        var pend=candidatosBulkMensajero('mensajero');
        return{cantidad:pend.length,total:pend.reduce(function(a,r){return a+(parseFloat(r.valor_siniestro)||0);},0)};
      })(),onClose:function(){setModalMensajeroBulk(false);},onConfirm:function(semana){return aplicarEstadoMensajeroMasivo('mensajero',semana);}}),
    modalNuevo&&React.createElement(ModalNuevo,{mensajeros:mensajeros,onClose:function(){setModalNuevo(false);},onCreado:function(){setModalNuevo(false);cargar();toast&&toast('✓ Siniestro registrado');}}));
}

window.Siniestros = Siniestros;
})();
