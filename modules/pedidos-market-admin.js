// modules/pedidos-market-admin.js
// ─────────────────────────────────────────────────────────────────────────
// PGSO MARKET — panel admin: confirmar/rechazar pagos de pedidos (transferencia, Fase 1),
// gestionar catálogo (rubros y productos) y configurar datos bancarios / si la tienda está
// abierta. Ver claude/Propuesta_Pgso_Market.md (proyecto) para el diseño completo.
//
// Al CONFIRMAR un pago se crea un ENVÍO NUEVO en `envios` (fuente='market', mismas reglas
// que cualquier paquete: ESTADOS_ADQUIRIBLES_ESCANEO, offline, mínimo 2 fotos para entregar,
// etc. -- nada de eso se toca acá, solo se inserta la fila) y se deja registrado en el
// historial con sbRegistrarHistorial (helper global ya usado por el resto del sistema).
//
// Solo visible para admin/superadmin (ver index.html, botón de nav 'market') -- no pasa por
// el sistema de Permisos todavía.
//
// Corre como <script> global clásico. OJO: index.html envuelve TODO su código en
// window.addEventListener('DOMContentLoaded',...), así que db/confirmarCodigo/fechaHoyCL/etc
// NO son identificadores globales de verdad -- viven adentro de ese closure. Lo que SÍ es
// global es window.__app (objeto que ese closure llena a propósito) y window.React. Mismo
// patrón que ya usa modules/gestion-envios.js.
(function(){
var useState=React.useState,useEffect=React.useEffect;
var db=window.__app.db;
var confirmarCodigo=window.__app.confirmarCodigo;
var sbRegistrarHistorial=window.__app.sbRegistrarHistorial;
var fechaHoyCL=window.__app.fechaHoyCL;
// sincronizarContadorPGSO NO está expuesto en window.__app (solo se usa en el bootstrap
// inicial) -- se replica acá mismo el resync liviano contra la misma RPC que usa esa función,
// para el caso raro de choque de código PGSO (ver insertarEnvioMarket más abajo).
var PGSO_KEY='transpgso_v2_pgso_counter';
function resincronizarContadorPGSO(){
  return db.rpc('obtener_max_codigo_pgso').then(function(res){
    try{
      if(res&&res.data){
        var m=/^PGSO(\d+)$/.exec(res.data);
        if(m){
          var maxDb=parseInt(m[1],10);
          var actual=parseInt(localStorage.getItem(PGSO_KEY)||'0',10);
          if(maxDb>actual)localStorage.setItem(PGSO_KEY,String(maxDb));
        }
      }
    }catch(e){}
  }).catch(function(){});
}

var ESTADOS_PAGO=[
  {val:'pendiente',label:'Pendiente',color:'#b07d10',bg:'rgba(176,125,16,0.12)'},
  {val:'confirmado',label:'Confirmado',color:'#2e7d4f',bg:'rgba(46,125,79,0.1)'},
  {val:'rechazado',label:'Rechazado',color:'#b03030',bg:'rgba(176,48,48,0.1)'}
];
function estadoInfo(v){return ESTADOS_PAGO.find(function(e){return e.val===v;})||ESTADOS_PAGO[0];}

function fmtCLP(n){return '$'+Math.round(n||0).toLocaleString('es-CL');}
function fmtFechaHora(iso){
  if(!iso)return'—';
  try{var d=new Date(iso);return d.toLocaleDateString('es-CL')+' '+d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});}catch(e){return iso;}
}

function PedidosMarketAdmin(props){
  var toast=props.toast,usuario=props.usuario;
  var _subTab=useState('pedidos'),subTab=_subTab[0],setSubTab=_subTab[1];

  return React.createElement('div',null,
    React.createElement('div',{style:{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}},
      [['pedidos','📋 Pedidos'],['productos','🥬 Productos'],['rubros','🗂 Rubros'],['config','⚙ Configuración']].map(function(t){
        return React.createElement('button',{key:t[0],className:'nav-btn'+(subTab===t[0]?' active':''),onClick:function(){setSubTab(t[0]);},style:{padding:'8px 18px'}},t[1]);
      })
    ),
    subTab==='pedidos'&&React.createElement(TabPedidos,{toast:toast,usuario:usuario}),
    subTab==='productos'&&React.createElement(TabProductos,{toast:toast}),
    subTab==='rubros'&&React.createElement(TabRubros,{toast:toast}),
    subTab==='config'&&React.createElement(TabConfig,{toast:toast})
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: PEDIDOS — confirmar/rechazar pagos
// ═══════════════════════════════════════════════════════════════════════
function TabPedidos(props){
  var toast=props.toast,usuario=props.usuario;
  var _pedidos=useState([]),pedidos=_pedidos[0],setPedidos=_pedidos[1];
  var _items=useState({}),itemsPorPedido=_items[0],setItemsPorPedido=_items[1];
  var _cargando=useState(true),cargando=_cargando[0],setCargando=_cargando[1];
  var _filtro=useState('pendiente'),filtro=_filtro[0],setFiltro=_filtro[1];
  var _expandido=useState(null),expandido=_expandido[0],setExpandido=_expandido[1];
  var _procesandoId=useState(null),procesandoId=_procesandoId[0],setProcesandoId=_procesandoId[1];
  var _rechazoId=useState(null),rechazoId=_rechazoId[0],setRechazoId=_rechazoId[1];
  var _rechazoNota=useState(''),rechazoNota=_rechazoNota[0],setRechazoNota=_rechazoNota[1];

  useEffect(function(){cargarPedidos();},[]);

  function cargarPedidos(){
    setCargando(true);
    db.from('pedidos_market').select('*').order('created_at',{ascending:false}).then(function(res){
      if(res.error){toast&&toast('⚠ No se pudieron cargar los pedidos');setCargando(false);return;}
      var lista=res.data||[];
      setPedidos(lista);
      setCargando(false);
      var ids=lista.map(function(p){return p.id;});
      if(ids.length===0)return;
      db.from('items_pedido').select('*').in('pedido_id',ids).then(function(resItems){
        if(resItems.error)return;
        var mapa={};
        (resItems.data||[]).forEach(function(it){
          if(!mapa[it.pedido_id])mapa[it.pedido_id]=[];
          mapa[it.pedido_id].push(it);
        });
        setItemsPorPedido(mapa);
      });
    });
  }

  // Crea el envío en `envios` para un pedido ya pagado. Reintenta hasta 3 veces si el código
  // PGSO generado localmente choca con uno ya existente (mismo patrón que usa Portal Cliente
  // al crear envíos manuales -- ver insertarEnvioConReintento en index.html).
  function insertarEnvioMarket(pedido){
    var base={
      cliente:'PGSO MARKET',
      destinatario:pedido.comprador_nombre,
      telefono:pedido.comprador_telefono,
      direccion:pedido.direccion,
      comuna:pedido.comuna,
      referencia:pedido.referencia||'',
      monto:0,
      fecha:fechaHoyCL(),
      estado:'en_bodega',
      mensajero:'',
      nota:'Pedido Pgso Market N°'+pedido.id,
      fuente:'market'
    };
    function intentar(intentos){
      return confirmarCodigo().then(function(codigo){
        return db.from('envios').insert(Object.assign({codigo:codigo},base)).select().single().then(function(res){
          if(!res.error)return res.data;
          if(res.error.code==='23505'&&intentos<2){
            return resincronizarContadorPGSO().then(function(){return intentar(intentos+1);});
          }
          throw res.error;
        });
      });
    }
    return intentar(0);
  }

  function confirmarPago(pedido){
    if(procesandoId)return;
    setProcesandoId(pedido.id);
    // Reconfirma contra el servidor que el pedido siga 'pendiente' justo antes de crear el
    // envío -- evita duplicar el envío si dos administradores intentan confirmar el mismo
    // pedido casi al mismo tiempo.
    db.from('pedidos_market').select('estado_pago').eq('id',pedido.id).single().then(function(chk){
      if(chk.error||!chk.data||chk.data.estado_pago!=='pendiente'){
        toast&&toast('⚠ Este pedido ya no está pendiente -- recarga la lista.');
        setProcesandoId(null);
        cargarPedidos();
        return;
      }
      insertarEnvioMarket(pedido).then(function(envio){
        return db.from('pedidos_market').update({
          estado_pago:'confirmado',envio_id:envio.id,envio_codigo:envio.codigo,
          confirmado_por:(usuario&&(usuario.nombre||usuario.email))||'Admin',confirmado_at:new Date().toISOString()
        }).eq('id',pedido.id).select().then(function(upd){
          if(upd.error)throw upd.error;
          sbRegistrarHistorial(envio.codigo,'en_bodega','Pedido Pgso Market N°'+pedido.id,(usuario&&(usuario.nombre||usuario.email))||'Admin','panel_admin');
          toast&&toast('✓ Pago confirmado -- envío '+envio.codigo+' creado y listo para despachar');
          setProcesandoId(null);
          cargarPedidos();
        });
      }).catch(function(e){
        toast&&toast('⚠ '+((e&&e.message)||'No se pudo confirmar el pago'));
        setProcesandoId(null);
      });
    });
  }

  function rechazarPago(pedido){
    setProcesandoId(pedido.id);
    db.from('pedidos_market').update({
      estado_pago:'rechazado',nota:rechazoNota||pedido.nota,
      confirmado_por:(usuario&&(usuario.nombre||usuario.email))||'Admin',confirmado_at:new Date().toISOString()
    }).eq('id',pedido.id).select().then(function(res){
      setProcesandoId(null);
      if(res.error){toast&&toast('⚠ No se pudo rechazar el pedido');return;}
      toast&&toast('Pedido marcado como rechazado');
      setRechazoId(null);setRechazoNota('');
      cargarPedidos();
    });
  }

  var pedidosFiltrados=filtro==='todos'?pedidos:pedidos.filter(function(p){return p.estado_pago===filtro;});

  if(cargando)return React.createElement('div',{style:{textAlign:'center',padding:'60px 20px',color:'var(--text-soft)'}},'Cargando pedidos...');

  return React.createElement('div',null,
    React.createElement('div',{style:{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}},
      [['todos','Todos'],['pendiente','Pendientes'],['confirmado','Confirmados'],['rechazado','Rechazados']].map(function(f){
        var n=f[0]==='todos'?pedidos.length:pedidos.filter(function(p){return p.estado_pago===f[0];}).length;
        return React.createElement('button',{key:f[0],onClick:function(){setFiltro(f[0]);},style:{padding:'6px 14px',borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',border:'1px solid '+(filtro===f[0]?'var(--gold)':'var(--border)'),background:filtro===f[0]?'rgba(200,168,75,0.15)':'#fff',color:filtro===f[0]?'var(--dark)':'var(--text-soft)'}},f[1]+' ('+n+')');
      })
    ),
    pedidosFiltrados.length===0&&React.createElement('div',{className:'info-banner'},'No hay pedidos en esta categoría.'),
    React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:10}},
      pedidosFiltrados.map(function(p){
        var info=estadoInfo(p.estado_pago);
        var items=itemsPorPedido[p.id]||[];
        var abierto=expandido===p.id;
        return React.createElement('div',{key:p.id,style:{background:'#fff',border:'1px solid var(--border)',borderLeft:'4px solid '+info.color,borderRadius:10,padding:14,boxShadow:'0 2px 8px rgba(43,46,32,0.06)'}},
          React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap',cursor:'pointer'},onClick:function(){setExpandido(abierto?null:p.id);}},
            React.createElement('div',null,
              React.createElement('div',{style:{fontWeight:700,fontSize:14}},'Pedido N° '+p.id+' — '+p.comprador_nombre),
              React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)'}},p.comprador_telefono+' · '+p.direccion+', '+p.comuna),
              React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',marginTop:2}},fmtFechaHora(p.created_at))
            ),
            React.createElement('div',{style:{textAlign:'right'}},
              React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:20,color:'var(--dark)'}},fmtCLP(p.monto_total)),
              React.createElement('span',{style:{fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:12,background:info.bg,color:info.color}},info.label.toUpperCase())
            )
          ),
          abierto&&React.createElement('div',{style:{marginTop:12,paddingTop:12,borderTop:'1px dashed var(--border)'}},
            items.length>0&&React.createElement('div',{style:{marginBottom:10}},
              items.map(function(it){
                return React.createElement('div',{key:it.id,style:{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0'}},
                  React.createElement('span',null,it.cantidad+' × '+it.producto_nombre),
                  React.createElement('span',{style:{fontWeight:600}},fmtCLP(it.subtotal))
                );
              })
            ),
            p.referencia&&React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:6}},'Referencia: '+p.referencia),
            p.comprobante_url&&React.createElement('a',{href:p.comprobante_url,target:'_blank',rel:'noreferrer',style:{fontSize:12,color:'var(--gold)',fontWeight:700,display:'inline-block',marginBottom:8}},'📎 Ver comprobante adjunto'),
            p.estado_pago==='confirmado'&&React.createElement('div',{style:{fontSize:12,color:'var(--success)',fontWeight:600}},'✓ Envío creado: '+(p.envio_codigo||'—')+' · confirmado por '+(p.confirmado_por||'—')+' el '+fmtFechaHora(p.confirmado_at)),
            p.estado_pago==='rechazado'&&React.createElement('div',{style:{fontSize:12,color:'var(--danger)',fontWeight:600}},'✕ Rechazado por '+(p.confirmado_por||'—')+' el '+fmtFechaHora(p.confirmado_at)+(p.nota?' — "'+p.nota+'"':'')),
            p.estado_pago==='pendiente'&&React.createElement('div',{style:{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}},
              React.createElement('button',{className:'btn-primary',disabled:procesandoId===p.id,onClick:function(e){e.stopPropagation();confirmarPago(p);},style:{padding:'8px 18px'}},procesandoId===p.id?'Procesando...':'✓ Confirmar pago y crear envío'),
              rechazoId===p.id?React.createElement(React.Fragment,null,
                React.createElement('input',{className:'form-input',placeholder:'Motivo (opcional)',value:rechazoNota,onChange:function(e){setRechazoNota(e.target.value);},style:{width:200,margin:0}}),
                React.createElement('button',{className:'action-btn btn-delete',onClick:function(e){e.stopPropagation();rechazarPago(p);}},'Confirmar rechazo')
              ):React.createElement('button',{className:'btn-secondary',onClick:function(e){e.stopPropagation();setRechazoId(p.id);},style:{padding:'8px 18px'}},'✕ Rechazar')
            )
          )
        );
      })
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════
function TabProductos(props){
  var toast=props.toast;
  var _productos=useState([]),productos=_productos[0],setProductos=_productos[1];
  var _rubros=useState([]),rubros=_rubros[0],setRubros=_rubros[1];
  var _cargando=useState(true),cargando=_cargando[0],setCargando=_cargando[1];
  var vacio={id:null,nombre:'',descripcion:'',rubro_id:'',precio:'',unidad_venta:'unidad',stock_disponible:'',activo:true,foto_url:''};
  var _form=useState(vacio),form=_form[0],setForm=_form[1];
  var _guardando=useState(false),guardando=_guardando[0],setGuardando=_guardando[1];
  var _subiendoFoto=useState(false),subiendoFoto=_subiendoFoto[0],setSubiendoFoto=_subiendoFoto[1];

  useEffect(function(){cargar();},[]);
  function cargar(){
    setCargando(true);
    Promise.all([
      db.from('rubros').select('*').order('orden'),
      db.from('productos').select('*').order('nombre')
    ]).then(function(res){
      setRubros((res[0].data)||[]);
      setProductos((res[1].data)||[]);
      setCargando(false);
    });
  }

  function subirFoto(file){
    setSubiendoFoto(true);
    var nombreArchivo='producto_'+Date.now()+'_'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    db.storage.from('market-productos').upload(nombreArchivo,file,{cacheControl:'3600',upsert:false}).then(function(res){
      setSubiendoFoto(false);
      if(res.error){toast&&toast('⚠ No se pudo subir la foto');return;}
      var pub=db.storage.from('market-productos').getPublicUrl(nombreArchivo);
      setForm(function(f){return Object.assign({},f,{foto_url:(pub&&pub.data&&pub.data.publicUrl)||''});});
    });
  }

  function guardar(){
    if(!form.nombre.trim()||!form.rubro_id||!form.precio){
      toast&&toast('⚠ Completa nombre, rubro y precio');
      return;
    }
    setGuardando(true);
    var payload={
      nombre:form.nombre.trim(),descripcion:form.descripcion.trim()||null,
      rubro_id:Number(form.rubro_id),precio:Number(form.precio)||0,
      unidad_venta:form.unidad_venta,stock_disponible:Number(form.stock_disponible)||0,
      activo:!!form.activo,foto_url:form.foto_url||null,updated_at:new Date().toISOString()
    };
    var q=form.id?db.from('productos').update(payload).eq('id',form.id):db.from('productos').insert(payload);
    q.select().then(function(res){
      setGuardando(false);
      if(res.error){toast&&toast('⚠ No se pudo guardar el producto');return;}
      toast&&toast('✓ Producto guardado');
      setForm(vacio);
      cargar();
    });
  }

  function editar(p){
    setForm({id:p.id,nombre:p.nombre,descripcion:p.descripcion||'',rubro_id:p.rubro_id||'',precio:p.precio,unidad_venta:p.unidad_venta,stock_disponible:p.stock_disponible,activo:p.activo,foto_url:p.foto_url||''});
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function toggleActivo(p){
    db.from('productos').update({activo:!p.activo}).eq('id',p.id).select().then(function(res){
      if(!res.error)cargar();
    });
  }

  if(cargando)return React.createElement('div',{style:{textAlign:'center',padding:'60px 20px',color:'var(--text-soft)'}},'Cargando productos...');

  return React.createElement('div',null,
    React.createElement('div',{className:'panel',style:{marginBottom:20}},
      React.createElement('div',{className:'panel-title'},form.id?'Editar producto':'➕ Nuevo producto'),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}},
        React.createElement('div',{className:'form-group'},
          React.createElement('label',{className:'form-label'},'Nombre *'),
          React.createElement('input',{className:'form-input',value:form.nombre,onChange:function(e){setForm(Object.assign({},form,{nombre:e.target.value}));}})
        ),
        React.createElement('div',{className:'form-group'},
          React.createElement('label',{className:'form-label'},'Rubro *'),
          React.createElement('select',{className:'form-input',value:form.rubro_id,onChange:function(e){setForm(Object.assign({},form,{rubro_id:e.target.value}));}},
            React.createElement('option',{value:''},'Selecciona un rubro'),
            rubros.map(function(r){return React.createElement('option',{key:r.id,value:r.id},r.nombre);})
          )
        ),
        React.createElement('div',{className:'form-group',style:{gridColumn:'span 2'}},
          React.createElement('label',{className:'form-label'},'Descripción'),
          React.createElement('input',{className:'form-input',value:form.descripcion,onChange:function(e){setForm(Object.assign({},form,{descripcion:e.target.value}));}})
        ),
        React.createElement('div',{className:'form-group'},
          React.createElement('label',{className:'form-label'},'Precio *'),
          React.createElement('input',{className:'form-input',type:'number',value:form.precio,onChange:function(e){setForm(Object.assign({},form,{precio:e.target.value}));}})
        ),
        React.createElement('div',{className:'form-group'},
          React.createElement('label',{className:'form-label'},'Unidad de venta'),
          React.createElement('select',{className:'form-input',value:form.unidad_venta,onChange:function(e){setForm(Object.assign({},form,{unidad_venta:e.target.value}));}},
            React.createElement('option',{value:'unidad'},'Unidad'),
            React.createElement('option',{value:'kg'},'Kilo (kg)'),
            React.createElement('option',{value:'paquete'},'Paquete')
          )
        ),
        React.createElement('div',{className:'form-group'},
          React.createElement('label',{className:'form-label'},'Stock disponible'),
          React.createElement('input',{className:'form-input',type:'number',value:form.stock_disponible,onChange:function(e){setForm(Object.assign({},form,{stock_disponible:e.target.value}));}})
        ),
        React.createElement('div',{className:'form-group'},
          React.createElement('label',{className:'form-label'},'Foto'),
          React.createElement('input',{type:'file',accept:'image/*',disabled:subiendoFoto,onChange:function(e){if(e.target.files&&e.target.files[0])subirFoto(e.target.files[0]);}}),
          subiendoFoto&&React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)'}},'Subiendo...'),
          form.foto_url&&React.createElement('img',{src:form.foto_url,style:{width:60,height:60,objectFit:'cover',borderRadius:8,marginTop:6}})
        ),
        React.createElement('div',{className:'form-group',style:{display:'flex',alignItems:'center',gap:8}},
          React.createElement('input',{type:'checkbox',checked:form.activo,onChange:function(e){setForm(Object.assign({},form,{activo:e.target.checked}));},id:'prod-activo'}),
          React.createElement('label',{htmlFor:'prod-activo',className:'form-label',style:{margin:0}},'Visible en la tienda')
        )
      ),
      React.createElement('div',{style:{display:'flex',gap:8,marginTop:14,justifyContent:'flex-end'}},
        form.id&&React.createElement('button',{className:'btn-secondary',onClick:function(){setForm(vacio);}},'Cancelar edición'),
        React.createElement('button',{className:'btn-primary',disabled:guardando,onClick:guardar},guardando?'Guardando...':(form.id?'Guardar cambios':'Crear producto'))
      )
    ),
    React.createElement('div',{className:'table-wrap'},
      React.createElement('table',null,
        React.createElement('thead',null,React.createElement('tr',null,
          React.createElement('th',null,'Producto'),React.createElement('th',null,'Rubro'),React.createElement('th',null,'Precio'),
          React.createElement('th',null,'Stock'),React.createElement('th',null,'Estado'),React.createElement('th',null)
        )),
        React.createElement('tbody',null,
          productos.map(function(p){
            var rubroNombre=(rubros.find(function(r){return r.id===p.rubro_id;})||{}).nombre||'—';
            return React.createElement('tr',{key:p.id},
              React.createElement('td',{style:{fontWeight:600}},p.nombre),
              React.createElement('td',null,rubroNombre),
              React.createElement('td',{className:'mono'},fmtCLP(p.precio)+' '+(p.unidad_venta==='kg'?'/kg':p.unidad_venta==='paquete'?'/paquete':'c/u')),
              React.createElement('td',{className:'mono'},p.stock_disponible),
              React.createElement('td',null,React.createElement('span',{className:'badge',style:{background:p.activo?'rgba(46,125,79,0.1)':'rgba(176,48,48,0.1)',color:p.activo?'var(--success)':'var(--danger)'}},p.activo?'Activo':'Oculto')),
              React.createElement('td',{style:{display:'flex',gap:6}},
                React.createElement('button',{className:'action-btn btn-edit',onClick:function(){editar(p);}},'Editar'),
                React.createElement('button',{className:'action-btn',onClick:function(){toggleActivo(p);}},p.activo?'Ocultar':'Mostrar')
              )
            );
          })
        )
      )
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: RUBROS
// ═══════════════════════════════════════════════════════════════════════
function TabRubros(props){
  var toast=props.toast;
  var _rubros=useState([]),rubros=_rubros[0],setRubros=_rubros[1];
  var _cargando=useState(true),cargando=_cargando[0],setCargando=_cargando[1];
  var _nuevo=useState({nombre:'',orden:''}),nuevo=_nuevo[0],setNuevo=_nuevo[1];
  var _guardando=useState(false),guardando=_guardando[0],setGuardando=_guardando[1];

  useEffect(function(){cargar();},[]);
  function cargar(){
    setCargando(true);
    db.from('rubros').select('*').order('orden').then(function(res){setRubros((res.data)||[]);setCargando(false);});
  }
  function agregar(){
    if(!nuevo.nombre.trim()){toast&&toast('⚠ Ingresa un nombre de rubro');return;}
    setGuardando(true);
    db.from('rubros').insert({nombre:nuevo.nombre.trim(),orden:Number(nuevo.orden)||(rubros.length+1),activo:true}).select().then(function(res){
      setGuardando(false);
      if(res.error){toast&&toast('⚠ No se pudo crear el rubro');return;}
      setNuevo({nombre:'',orden:''});
      cargar();
    });
  }
  function actualizar(r,cambios){
    db.from('rubros').update(cambios).eq('id',r.id).select().then(function(res){if(!res.error)cargar();});
  }

  if(cargando)return React.createElement('div',{style:{textAlign:'center',padding:'60px 20px',color:'var(--text-soft)'}},'Cargando rubros...');

  return React.createElement('div',null,
    React.createElement('div',{className:'panel',style:{marginBottom:20}},
      React.createElement('div',{className:'panel-title'},'➕ Nuevo rubro'),
      React.createElement('div',{style:{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}},
        React.createElement('div',{className:'form-group',style:{flex:1,minWidth:180}},
          React.createElement('label',{className:'form-label'},'Nombre'),
          React.createElement('input',{className:'form-input',value:nuevo.nombre,onChange:function(e){setNuevo(Object.assign({},nuevo,{nombre:e.target.value}));},placeholder:'Ej: Frutos secos'})
        ),
        React.createElement('div',{className:'form-group',style:{width:100}},
          React.createElement('label',{className:'form-label'},'Orden'),
          React.createElement('input',{className:'form-input',type:'number',value:nuevo.orden,onChange:function(e){setNuevo(Object.assign({},nuevo,{orden:e.target.value}));},placeholder:String(rubros.length+1)})
        ),
        React.createElement('button',{className:'btn-primary',disabled:guardando,onClick:agregar,style:{padding:'10px 20px'}},'Crear rubro')
      )
    ),
    React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:8}},
      rubros.map(function(r){
        return React.createElement('div',{key:r.id,style:{display:'flex',alignItems:'center',gap:12,background:'#fff',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px'}},
          React.createElement('input',{className:'form-input',style:{margin:0,flex:1},defaultValue:r.nombre,onBlur:function(e){if(e.target.value.trim()&&e.target.value.trim()!==r.nombre)actualizar(r,{nombre:e.target.value.trim()});}}),
          React.createElement('input',{className:'form-input',type:'number',style:{margin:0,width:80},defaultValue:r.orden,onBlur:function(e){var v=Number(e.target.value);if(!isNaN(v)&&v!==r.orden)actualizar(r,{orden:v});}}),
          React.createElement('button',{className:'action-btn',onClick:function(){actualizar(r,{activo:!r.activo});},style:{background:r.activo?'rgba(46,125,79,0.1)':'rgba(176,48,48,0.1)',color:r.activo?'var(--success)':'var(--danger)'}},r.activo?'Activo':'Oculto')
        );
      })
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: CONFIGURACIÓN — datos bancarios y estado de la tienda
// ═══════════════════════════════════════════════════════════════════════
function TabConfig(props){
  var toast=props.toast;
  var _config=useState(null),config=_config[0],setConfig=_config[1];
  var _cargando=useState(true),cargando=_cargando[0],setCargando=_cargando[1];
  var _guardando=useState(false),guardando=_guardando[0],setGuardando=_guardando[1];

  useEffect(function(){cargar();},[]);
  function cargar(){
    setCargando(true);
    db.from('configuracion').select('*').eq('clave','market_config').maybeSingle().then(function(res){
      var v=(res.data&&res.data.valor)||{};
      setConfig({
        tiendaAbierta:v.tiendaAbierta!==false,
        mensajeCerrado:v.mensajeCerrado||'',
        datosBancarios:Object.assign({banco:'',tipoCuenta:'',numero:'',rut:'',titular:'',email:''},v.datosBancarios||{})
      });
      setCargando(false);
    });
  }
  function guardar(){
    setGuardando(true);
    db.from('configuracion').update({valor:config,updated_at:new Date().toISOString()}).eq('clave','market_config').select().then(function(res){
      setGuardando(false);
      if(res.error){toast&&toast('⚠ No se pudo guardar la configuración');return;}
      toast&&toast('✓ Configuración guardada');
    });
  }
  function setBanco(campo,valor){
    setConfig(function(c){return Object.assign({},c,{datosBancarios:Object.assign({},c.datosBancarios,(function(){var o={};o[campo]=valor;return o;})())});});
  }

  if(cargando||!config)return React.createElement('div',{style:{textAlign:'center',padding:'60px 20px',color:'var(--text-soft)'}},'Cargando configuración...');

  return React.createElement('div',{className:'panel'},
    React.createElement('div',{className:'panel-title'},'⚙ Configuración de Pgso Market'),
    React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,marginBottom:16,padding:'12px 16px',background:config.tiendaAbierta?'rgba(46,125,79,0.08)':'rgba(176,48,48,0.08)',borderRadius:10}},
      React.createElement('input',{type:'checkbox',checked:config.tiendaAbierta,onChange:function(e){setConfig(Object.assign({},config,{tiendaAbierta:e.target.checked}));},id:'tienda-abierta'}),
      React.createElement('label',{htmlFor:'tienda-abierta',style:{fontWeight:700,fontSize:13}},config.tiendaAbierta?'Tienda ABIERTA -- el público puede hacer pedidos':'Tienda CERRADA -- el catálogo se ve pero no se pueden generar pedidos')
    ),
    !config.tiendaAbierta&&React.createElement('div',{className:'form-group',style:{marginBottom:16}},
      React.createElement('label',{className:'form-label'},'Mensaje que verán los compradores'),
      React.createElement('input',{className:'form-input',value:config.mensajeCerrado,onChange:function(e){setConfig(Object.assign({},config,{mensajeCerrado:e.target.value}));},placeholder:'Ej: Volvemos a recibir pedidos el lunes.'})
    ),
    React.createElement('div',{style:{fontWeight:700,fontSize:13,margin:'16px 0 10px',color:'var(--dark)'}},'💳 Datos bancarios (se muestran al comprador al pagar)'),
    React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}},
      [['banco','Banco'],['tipoCuenta','Tipo de cuenta'],['numero','N° de cuenta'],['rut','RUT'],['titular','Titular'],['email','Email de aviso (opcional)']].map(function(f){
        return React.createElement('div',{className:'form-group',key:f[0]},
          React.createElement('label',{className:'form-label'},f[1]),
          React.createElement('input',{className:'form-input',value:config.datosBancarios[f[0]]||'',onChange:function(e){setBanco(f[0],e.target.value);}})
        );
      })
    ),
    React.createElement('div',{style:{display:'flex',justifyContent:'flex-end',marginTop:16}},
      React.createElement('button',{className:'btn-primary',disabled:guardando,onClick:guardar,style:{padding:'10px 24px'}},guardando?'Guardando...':'Guardar configuración')
    )
  );
}

window.PedidosMarketAdmin=PedidosMarketAdmin;
})();
