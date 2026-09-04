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
  var _filtro=useState('pendientes'), filtro=_filtro[0], setFiltro=_filtro[1];
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
  var filtrados=enRango.filter(function(r){
    if(filtro==='pendientes')return!r.descontado_cliente||!r.descontado_mensajero;
    if(filtro==='cliente-pendiente')return!r.descontado_cliente;
    if(filtro==='mensajero-pendiente')return!r.descontado_mensajero;
    if(filtro==='resueltos')return r.descontado_cliente&&r.descontado_mensajero;
    return true;
  });
  // Buscador libre por código, mensajero, cliente o fecha del siniestro -- se aplica encima
  // del período y del filtro de estado, para poder acotar rápido dentro de "Este mes",
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

  // Totales acumulados del período/filtro actual — para hacerle seguimiento rápido a pagos y descuentos.
  var totales=enRango.reduce(function(a,r){
    var v=parseFloat(r.valor_siniestro)||0;
    a.cantidad+=1;
    a.valorTotal+=v;
    if(r.descontado_cliente){a.clienteAplicado+=parseFloat(r.descontado_cliente_valor)||0;}else{a.clientePendiente+=v;}
    if(r.descontado_mensajero){a.mensajeroAplicado+=parseFloat(r.descontado_mensajero_valor)||0;}else{a.mensajeroPendiente+=v;}
    return a;
  },{cantidad:0,valorTotal:0,clienteAplicado:0,clientePendiente:0,mensajeroAplicado:0,mensajeroPendiente:0});

  function exportarExcel(){
    var headers=['Código','Cliente','Mensajero','Estado actual','Fecha siniestro','Valor','Descuento cliente','Fecha desc. cliente','Descuento mensajero','Semana desc. mensajero','Nota'];
    var rows=filtrados.map(function(r){
      var est=estadoInfo?estadoInfo(r.estado):{label:r.estado};
      return[r.codigo,r.cliente,(r.mensajero||'—').replace(/,\s*/g,' '),est.label,r.fecha_siniestro||'',r.valor_siniestro||0,
        r.descontado_cliente?(r.descontado_cliente_valor||0):'Pendiente',
        r.descontado_cliente?fmtFechaHora(r.descontado_cliente_fecha):'',
        r.descontado_mensajero?(r.descontado_mensajero_valor||0):'Pendiente',
        r.descontado_mensajero?(r.descontado_mensajero_semana||''):'',
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

  function descontarCliente(row){
    if(!window.confirm('¿Descontar '+fmtCLP(row.valor_siniestro)+' del cobro al cliente '+row.cliente+' por el código '+row.codigo+'?'))return;
    db.from('siniestros').update({
      descontado_cliente:true,descontado_cliente_valor:row.valor_siniestro,
      descontado_cliente_fecha:new Date().toISOString(),descontado_cliente_por:nombreUsuario
    }).eq('id',row.id).then(function(r){
      if(r.error){toast&&toast('⚠ Error: '+r.error.message);return;}
      cargar();
      toast&&toast('✓ Descontado al cliente');
    });
  }
  function deshacerCliente(row){
    if(!window.confirm('¿Deshacer el descuento al cliente de este siniestro?'))return;
    db.from('siniestros').update({
      descontado_cliente:false,descontado_cliente_valor:null,descontado_cliente_fecha:null,descontado_cliente_por:null
    }).eq('id',row.id).then(function(r){
      if(r.error){toast&&toast('⚠ Error: '+r.error.message);return;}
      cargar();
      toast&&toast('✓ Deshecho');
    });
  }
  function confirmarDescuentoMensajero(row,semana){
    return db.from('siniestros').update({
      descontado_mensajero:true,descontado_mensajero_valor:row.valor_siniestro,descontado_mensajero_semana:semana,
      descontado_mensajero_fecha:new Date().toISOString(),descontado_mensajero_por:nombreUsuario
    }).eq('id',row.id).then(function(r){
      if(r.error){toast&&toast('⚠ Error: '+r.error.message);return;}
      setModalMensajero(null);
      cargar();
      toast&&toast('✓ Descontado al mensajero · semana '+semana);
    });
  }
  function deshacerMensajero(row){
    if(!window.confirm('¿Deshacer el descuento al mensajero de este siniestro?'))return;
    db.from('siniestros').update({
      descontado_mensajero:false,descontado_mensajero_valor:null,descontado_mensajero_semana:null,
      descontado_mensajero_fecha:null,descontado_mensajero_por:null
    }).eq('id',row.id).then(function(r){
      if(r.error){toast&&toast('⚠ Error: '+r.error.message);return;}
      cargar();
      toast&&toast('✓ Deshecho');
    });
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
  function limpiarSeleccion(){setSeleccionados({});}

  function descontarClienteMasivo(){
    var pend=filasSeleccionadas().filter(function(r){return!r.descontado_cliente;});
    if(pend.length===0){toast&&toast('Los seleccionados ya están descontados al cliente');return;}
    var total=pend.reduce(function(a,r){return a+(parseFloat(r.valor_siniestro)||0);},0);
    if(!window.confirm('¿Descontar '+fmtCLP(total)+' en total al cliente, repartido entre los '+pend.length+' código(s) seleccionados?'))return;
    Promise.all(pend.map(function(row){
      return db.from('siniestros').update({
        descontado_cliente:true,descontado_cliente_valor:row.valor_siniestro,
        descontado_cliente_fecha:new Date().toISOString(),descontado_cliente_por:nombreUsuario
      }).eq('id',row.id);
    })).then(function(results){
      var errores=results.filter(function(r){return r&&r.error;});
      cargar();
      limpiarSeleccion();
      if(errores.length>0)toast&&toast('⚠ '+errores.length+' de '+pend.length+' tuvieron error, revisa e intenta de nuevo');
      else toast&&toast('✓ Descontado al cliente en '+pend.length+' código(s)');
    });
  }
  function descontarMensajeroMasivo(semana){
    var pend=filasSeleccionadas().filter(function(r){return!r.descontado_mensajero;});
    return Promise.all(pend.map(function(row){
      return db.from('siniestros').update({
        descontado_mensajero:true,descontado_mensajero_valor:row.valor_siniestro,descontado_mensajero_semana:semana,
        descontado_mensajero_fecha:new Date().toISOString(),descontado_mensajero_por:nombreUsuario
      }).eq('id',row.id);
    })).then(function(results){
      var errores=results.filter(function(r){return r&&r.error;});
      setModalMensajeroBulk(false);
      cargar();
      limpiarSeleccion();
      if(errores.length>0)toast&&toast('⚠ '+errores.length+' de '+pend.length+' tuvieron error, revisa e intenta de nuevo');
      else toast&&toast('✓ Descontado al mensajero en '+pend.length+' código(s) · semana '+semana);
    });
  }

  var FILTROS=[
    {val:'pendientes',label:'Pendientes'},
    {val:'cliente-pendiente',label:'Falta descontar a cliente'},
    {val:'mensajero-pendiente',label:'Falta descontar a mensajero'},
    {val:'resueltos',label:'Resueltos'},
    {val:'todos',label:'Todos'}
  ];

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
    {label:'Cliente: pendiente',val:fmtCLP(totales.clientePendiente),color:'var(--danger)'},
    {label:'Cliente: descontado',val:fmtCLP(totales.clienteAplicado),color:'var(--success)'},
    {label:'Mensajero: pendiente',val:fmtCLP(totales.mensajeroPendiente),color:'var(--danger)'},
    {label:'Mensajero: descontado',val:fmtCLP(totales.mensajeroAplicado),color:'var(--success)'}
  ];

  return React.createElement('div',null,
    React.createElement('div',{className:'section-head'},
      React.createElement('div',{className:'section-title'},'Siniestros'),
      React.createElement('div',{style:{display:'flex',gap:8}},
        React.createElement('button',{className:'btn-add',onClick:function(){setModalNuevo(true);}},'+ Registrar siniestro'),
        React.createElement('button',{className:'action-btn btn-edit',disabled:filtrados.length===0,onClick:exportarExcel},'📊 Exportar Excel'))),
    React.createElement('div',{className:'info-banner'},
      '⚠ Aquí quedan registrados todos los códigos que alguna vez pasaron por estado "Siniestro", ',
      'aunque después salgan a despacho o se entreguen. El descuento al cliente y al mensajero ',
      'se hace manualmente, cuando tú decidas — nunca automático.'),
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
    React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:6}},'Estado del descuento'),
    React.createElement('div',{style:{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}},
      FILTROS.map(function(f){
        return React.createElement('button',{key:f.val,onClick:function(){setFiltro(f.val);},
          style:{padding:'8px 14px',borderRadius:20,border:'1px solid '+(filtro===f.val?'var(--gold)':'var(--border)'),
            background:filtro===f.val?'rgba(200,168,75,0.15)':'#fff',color:filtro===f.val?'#8a6d1a':'var(--text-mid)',
            fontSize:12,fontWeight:700,cursor:'pointer'}},f.label);
      })),
    React.createElement('input',{type:'text',className:'form-input',placeholder:'🔍 Buscar por código, mensajero, cliente o fecha (AAAA-MM-DD)...',
      value:busqueda,onChange:function(e){setBusqueda(e.target.value);},style:{marginBottom:16,maxWidth:420}}),
    filasSeleccionadas().length>0&&React.createElement('div',{style:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',
      background:'rgba(200,168,75,0.12)',border:'1px solid var(--gold)',borderRadius:10,padding:'10px 14px',marginBottom:16}},
      React.createElement('span',{style:{fontSize:12,fontWeight:700,color:'#8a6d1a'}},filasSeleccionadas().length+' seleccionado(s)'),
      React.createElement('button',{className:'action-btn btn-edit',onClick:descontarClienteMasivo},'💰 Descontar a cliente (seleccionados)'),
      React.createElement('button',{className:'action-btn btn-edit',onClick:function(){
        if(filasSeleccionadas().filter(function(r){return!r.descontado_mensajero;}).length===0){toast&&toast('Los seleccionados ya están descontados al mensajero');return;}
        setModalMensajeroBulk(true);
      }},'🧾 Descontar a mensajero (seleccionados)'),
      React.createElement('button',{onClick:limpiarSeleccion,style:{fontSize:11,color:'var(--text-soft)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}},'Limpiar selección')),
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
          React.createElement('th',null,'Cliente'),
          React.createElement('th',null,'Mensajero'),
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
              row.descontado_cliente?
                React.createElement('div',null,
                  React.createElement('span',{style:{fontSize:11,fontWeight:700,color:'var(--success)'}},'✓ '+fmtCLP(row.descontado_cliente_valor)),
                  React.createElement('div',{style:{fontSize:9,color:'var(--text-soft)'}},fmtFechaHora(row.descontado_cliente_fecha)),
                  React.createElement('button',{onClick:function(){deshacerCliente(row);},style:{marginTop:2,fontSize:9,color:'var(--danger)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline',padding:0}},'deshacer')):
                React.createElement('button',{className:'action-btn btn-edit',onClick:function(){descontarCliente(row);}},'💰 Descontar')),
            React.createElement('td',null,
              row.descontado_mensajero?
                React.createElement('div',null,
                  React.createElement('span',{style:{fontSize:11,fontWeight:700,color:'var(--success)'}},'✓ '+fmtCLP(row.descontado_mensajero_valor)),
                  React.createElement('div',{style:{fontSize:9,color:'var(--text-soft)'}},row.descontado_mensajero_semana),
                  React.createElement('button',{onClick:function(){deshacerMensajero(row);},style:{marginTop:2,fontSize:9,color:'var(--danger)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline',padding:0}},'deshacer')):
                React.createElement('button',{className:'action-btn btn-edit',onClick:function(){setModalMensajero(row);}},'🧾 Descontar')),
            React.createElement('td',null,
              React.createElement('input',{type:'text',style:{width:150,padding:'4px 6px',border:'1px solid var(--border)',borderRadius:6,fontSize:11,color:'var(--text-mid)'},
                value:notaEdit[row.id]!=null?notaEdit[row.id]:(row.nota||''),
                placeholder:'¿Qué pasó?',
                onChange:function(e){setNotaEdit(function(prev){var n=Object.assign({},prev);n[row.id]=e.target.value;return n;});},
                onBlur:function(){if(notaEdit[row.id]!=null)guardarNota(row);}})));
        })))),
    modalMensajero&&React.createElement(ModalSemana,{row:modalMensajero,onClose:function(){setModalMensajero(null);},onConfirm:function(semana){return confirmarDescuentoMensajero(modalMensajero,semana);}}),
    modalMensajeroBulk&&React.createElement(ModalSemana,{bulk:(function(){
        var pend=filasSeleccionadas().filter(function(r){return!r.descontado_mensajero;});
        return{cantidad:pend.length,total:pend.reduce(function(a,r){return a+(parseFloat(r.valor_siniestro)||0);},0)};
      })(),onClose:function(){setModalMensajeroBulk(false);},onConfirm:descontarMensajeroMasivo}),
    modalNuevo&&React.createElement(ModalNuevo,{mensajeros:mensajeros,onClose:function(){setModalNuevo(false);},onCreado:function(){setModalNuevo(false);cargar();toast&&toast('✓ Siniestro registrado');}}));
}

window.Siniestros = Siniestros;
})();
