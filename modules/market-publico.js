// modules/market-publico.js
// ─────────────────────────────────────────────────────────────────────────
// PGSO MARKET — catálogo público (sin login) de alimentos del campo: verduras,
// hortalizas, carnicería, pescadería y embutidos. Tienda propia de TransPgso
// (no es marketplace multi-proveedor). Se accede vía https://sistema.transpgso.cl/?portal=market
// (ver el enganche en index.html, función App(), rama esMarketPublico).
//
// Fase 1 (esta versión): pago por transferencia bancaria con confirmación MANUAL de un
// admin desde el panel "Pedidos Market" (modules/pedidos-market-admin.js). NO depende de
// Webpay/Transbank todavía -- ver claude/Propuesta_Pgso_Market.md en el proyecto para el
// diseño completo y la Fase 2 (Webpay Plus) planificada.
//
// Cuando el admin confirma el pago de un pedido, SE CREA UN ENVÍO NUEVO en la tabla
// `envios` (fuente='market') y desde ahí el pedido corre por la MISMA máquina de estados,
// mismos mensajeros y mismas reglas que cualquier paquete de TransPgso -- esa parte vive en
// pedidos-market-admin.js, no acá. Este archivo SOLO es el catálogo/carrito/checkout público.
//
// Corre como <script> global clásico (sin módulos/bundler, igual que el resto del sistema).
// Usa identificadores globales ya definidos en index.html: React, useState, useEffect,
// useRef, db (cliente Supabase), COMUNAS_CHILE. No requiere sesión ni usuario.
(function(){

var RUBRO_ICONOS={
  'Verduras':'🥦','Hortalizas':'🥬','Carnicería':'🥩','Pescadería':'🐟','Embutidos':'🌭'
};
function iconoRubro(nombre){return RUBRO_ICONOS[nombre]||'🛒';}

function formatoCLP(n){return '$'+Math.round(n||0).toLocaleString('es-CL');}

function unidadLabel(u){
  if(u==='kg')return '/kg';
  if(u==='paquete')return '/paquete';
  return 'c/u';
}

// Paso de cantidad: los productos por kg permiten fracciones (0.5 kg), el resto es entero.
function pasoCantidad(u){return u==='kg'?0.5:1;}

var COLORES={
  fondo:'#faf7ee',
  fondoCard:'#ffffff',
  oscuro:'#2b2e20',
  oscuroMed:'#3a3d2e',
  verde:'#3a5a40',
  verdeClaro:'#e8f0e6',
  dorado:'#C8A84B',
  texto:'#2b2e20',
  textoSuave:'#7a7d6a',
  borde:'rgba(43,46,32,0.13)',
  peligro:'#b03030',
  exito:'#2e7d4f'
};

function MarketPublico(){
  var _rubros=useState([]),rubros=_rubros[0],setRubros=_rubros[1];
  var _productos=useState([]),productos=_productos[0],setProductos=_productos[1];
  var _cargando=useState(true),cargando=_cargando[0],setCargando=_cargando[1];
  var _errorCarga=useState(false),errorCarga=_errorCarga[0],setErrorCarga=_errorCarga[1];
  var _rubroActivo=useState('todos'),rubroActivo=_rubroActivo[0],setRubroActivo=_rubroActivo[1];
  var _config=useState(null),configTienda=_config[0],setConfigTienda=_config[1];
  var _carrito=useState([]),carrito=_carrito[0],setCarrito=_carrito[1];
  var _panel=useState(null),panel=_panel[0],setPanel=_panel[1]; // null | 'carrito' | 'checkout' | 'confirmacion'
  var _form=useState({nombre:'',telefono:'',direccion:'',comuna:'',referencia:''}),form=_form[0],setForm=_form[1];
  var _comprobante=useState(null),comprobante=_comprobante[0],setComprobante=_comprobante[1];
  var _enviando=useState(false),enviando=_enviando[0],setEnviando=_enviando[1];
  var _errorPedido=useState(null),errorPedido=_errorPedido[0],setErrorPedido=_errorPedido[1];
  var _pedidoOk=useState(null),pedidoOk=_pedidoOk[0],setPedidoOk=_pedidoOk[1];

  useEffect(function(){cargarCatalogo();},[]);

  function cargarCatalogo(){
    setCargando(true);setErrorCarga(false);
    Promise.all([
      db.from('rubros').select('*').eq('activo',true).order('orden'),
      db.from('productos').select('*').eq('activo',true).order('nombre'),
      db.from('configuracion').select('*').eq('clave','market_config').maybeSingle()
    ]).then(function(res){
      var rRubros=res[0],rProd=res[1],rCfg=res[2];
      if(rRubros.error||rProd.error){setErrorCarga(true);setCargando(false);return;}
      setRubros(rRubros.data||[]);
      setProductos(rProd.data||[]);
      setConfigTienda((rCfg&&rCfg.data&&rCfg.data.valor)||{tiendaAbierta:true,datosBancarios:{}});
      setCargando(false);
    }).catch(function(){setErrorCarga(true);setCargando(false);});
  }

  var tiendaAbierta=!configTienda||configTienda.tiendaAbierta!==false;

  var productosFiltrados=rubroActivo==='todos'?productos:productos.filter(function(p){return String(p.rubro_id)===String(rubroActivo);});

  function agregarAlCarrito(producto){
    setCarrito(function(prev){
      var ix=prev.findIndex(function(i){return i.producto_id===producto.id;});
      if(ix>=0){
        var copy=prev.slice();
        copy[ix]=Object.assign({},copy[ix],{cantidad:copy[ix].cantidad+pasoCantidad(producto.unidad_venta)});
        return copy;
      }
      return prev.concat([{producto_id:producto.id,nombre:producto.nombre,precio:producto.precio,unidad_venta:producto.unidad_venta,foto_url:producto.foto_url,cantidad:pasoCantidad(producto.unidad_venta)}]);
    });
  }
  function cambiarCantidad(producto_id,delta){
    setCarrito(function(prev){
      return prev.map(function(i){
        if(i.producto_id!==producto_id)return i;
        var nueva=Math.round((i.cantidad+delta)*100)/100;
        return Object.assign({},i,{cantidad:nueva});
      }).filter(function(i){return i.cantidad>0.001;});
    });
  }
  function quitarDelCarrito(producto_id){
    setCarrito(function(prev){return prev.filter(function(i){return i.producto_id!==producto_id;});});
  }

  var totalCarrito=carrito.reduce(function(a,i){return a+i.precio*i.cantidad;},0);
  var cantidadItems=carrito.reduce(function(a,i){return a+i.cantidad;},0);

  function confirmarPedido(){
    if(!form.nombre.trim()||!form.telefono.trim()||!form.direccion.trim()||!form.comuna){
      setErrorPedido('Completa nombre, teléfono, dirección y comuna para continuar.');
      return;
    }
    if(carrito.length===0){setErrorPedido('Tu carrito está vacío.');return;}
    setEnviando(true);setErrorPedido(null);
    var subirComprobante=Promise.resolve(null);
    if(comprobante){
      var nombreArchivo='comprobante_'+Date.now()+'_'+comprobante.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      subirComprobante=db.storage.from('market-comprobantes').upload(nombreArchivo,comprobante,{cacheControl:'3600',upsert:false}).then(function(res){
        if(res.error)throw new Error('No se pudo subir el comprobante. Puedes enviar tu pedido igual y mandarnos el comprobante después.');
        var pub=db.storage.from('market-comprobantes').getPublicUrl(nombreArchivo);
        return (pub&&pub.data&&pub.data.publicUrl)||null;
      });
    }
    subirComprobante.then(function(comprobante_url){
      return db.from('pedidos_market').insert({
        comprador_nombre:form.nombre.trim(),
        comprador_telefono:form.telefono.trim(),
        direccion:form.direccion.trim(),
        comuna:form.comuna,
        referencia:form.referencia.trim()||null,
        estado_pago:'pendiente',
        medio_pago:'transferencia',
        monto_total:totalCarrito,
        comprobante_url:comprobante_url
      }).select().single();
    }).then(function(res){
      if(res.error)throw new Error(res.error.message||'No se pudo crear el pedido.');
      var pedido=res.data;
      var items=carrito.map(function(i){
        return{pedido_id:pedido.id,producto_id:i.producto_id,producto_nombre:i.nombre,cantidad:i.cantidad,precio_unitario:i.precio,subtotal:i.precio*i.cantidad};
      });
      return db.from('items_pedido').insert(items).then(function(resItems){
        if(resItems.error)throw new Error(resItems.error.message||'No se pudieron guardar los productos del pedido.');
        return pedido;
      });
    }).then(function(pedido){
      setPedidoOk({id:pedido.id,total:totalCarrito});
      setCarrito([]);
      setForm({nombre:'',telefono:'',direccion:'',comuna:'',referencia:''});
      setComprobante(null);
      setPanel('confirmacion');
      setEnviando(false);
    }).catch(function(e){
      setErrorPedido((e&&e.message)||'No se pudo enviar el pedido. Intenta de nuevo.');
      setEnviando(false);
    });
  }

  // ── Estilos base reutilizables ──
  var sChip=function(activo){return{padding:'8px 16px',borderRadius:20,fontSize:13,fontWeight:700,cursor:'pointer',border:'1.5px solid '+(activo?COLORES.verde:COLORES.borde),background:activo?COLORES.verde:'#fff',color:activo?'#fff':COLORES.textoSuave,whiteSpace:'nowrap',flexShrink:0,transition:'all .15s'};};
  var sBtnPrimario={background:COLORES.verde,color:'#fff',border:'none',borderRadius:10,padding:'12px 20px',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans'};
  var sBtnSecundario={background:'#fff',color:COLORES.verde,border:'1.5px solid '+COLORES.verde,borderRadius:10,padding:'12px 20px',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans'};
  var sInput={width:'100%',padding:'11px 13px',borderRadius:9,border:'1.5px solid '+COLORES.borde,fontSize:14,fontFamily:'DM Sans',boxSizing:'border-box',marginBottom:12,background:'#fff',color:COLORES.texto};
  var sLabel={fontSize:11,fontWeight:700,color:COLORES.textoSuave,letterSpacing:1,textTransform:'uppercase',marginBottom:6,display:'block'};

  if(cargando){
    return React.createElement('div',{style:{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:COLORES.fondo,fontFamily:'DM Sans',color:COLORES.verde,gap:14}},
      React.createElement('div',{style:{fontSize:40}},'🥬'),
      React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:2}},'CARGANDO PGSO MARKET...')
    );
  }
  if(errorCarga){
    return React.createElement('div',{style:{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:COLORES.fondo,fontFamily:'DM Sans',color:COLORES.peligro,gap:14,padding:24,textAlign:'center'}},
      React.createElement('div',{style:{fontSize:15,fontWeight:700}},'No pudimos cargar el catálogo.'),
      React.createElement('button',{style:sBtnPrimario,onClick:cargarCatalogo},'Reintentar')
    );
  }

  return React.createElement('div',{style:{minHeight:'100vh',background:COLORES.fondo,fontFamily:'DM Sans',color:COLORES.texto,paddingBottom:90}},

    // ── Header ──
    React.createElement('div',{style:{position:'sticky',top:0,zIndex:50,background:'linear-gradient(135deg,'+COLORES.oscuro+','+COLORES.oscuroMed+')',borderBottom:'3px solid '+COLORES.dorado,padding:'16px 20px',paddingTop:'max(16px,env(safe-area-inset-top))',boxShadow:'0 4px 16px rgba(0,0,0,0.25)'}},
      React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:960,margin:'0 auto'}},
        React.createElement('div',null,
          React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:26,letterSpacing:2,color:COLORES.dorado,lineHeight:1}},'PGSO MARKET'),
          React.createElement('div',{style:{fontSize:10,color:'rgba(255,255,255,0.65)',letterSpacing:1.5,marginTop:2}},'ALIMENTOS DEL CAMPO · DESPACHO A DOMICILIO')
        ),
        React.createElement('button',{onClick:function(){setPanel('carrito');},style:{position:'relative',background:'rgba(200,168,75,0.15)',border:'1.5px solid '+COLORES.dorado,borderRadius:10,padding:'10px 14px',color:COLORES.dorado,fontSize:20,cursor:'pointer'}},
          '🛒',
          cantidadItems>0&&React.createElement('span',{style:{position:'absolute',top:-6,right:-6,background:COLORES.peligro,color:'#fff',borderRadius:10,fontSize:10,fontWeight:800,padding:'2px 6px',minWidth:16,textAlign:'center'}},cantidadItems)
        )
      )
    ),

    !tiendaAbierta&&React.createElement('div',{style:{background:'#fdecec',borderBottom:'1px solid '+COLORES.peligro,color:COLORES.peligro,textAlign:'center',padding:'10px 16px',fontSize:13,fontWeight:600}},
      (configTienda&&configTienda.mensajeCerrado)||'Pgso Market está cerrado por el momento. Puedes ver el catálogo, pero no se pueden generar pedidos ahora mismo.'
    ),

    // ── Rubros (chips) ──
    React.createElement('div',{style:{display:'flex',gap:8,overflowX:'auto',padding:'16px 20px 4px',maxWidth:960,margin:'0 auto',WebkitOverflowScrolling:'touch'}},
      React.createElement('button',{style:sChip(rubroActivo==='todos'),onClick:function(){setRubroActivo('todos');}},'🛒 Todos'),
      rubros.map(function(r){
        return React.createElement('button',{key:r.id,style:sChip(String(rubroActivo)===String(r.id)),onClick:function(){setRubroActivo(r.id);}},iconoRubro(r.nombre)+' '+r.nombre);
      })
    ),

    // ── Grilla de productos ──
    React.createElement('div',{style:{maxWidth:960,margin:'0 auto',padding:'12px 20px 40px'}},
      productosFiltrados.length===0&&React.createElement('div',{style:{textAlign:'center',color:COLORES.textoSuave,padding:'60px 20px',fontSize:14}},
        '📭 No hay productos disponibles en esta sección por ahora.'
      ),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:14}},
        productosFiltrados.map(function(p){
          var enCarro=carrito.find(function(i){return i.producto_id===p.id;});
          var sinStock=p.stock_disponible<=0;
          return React.createElement('div',{key:p.id,style:{background:COLORES.fondoCard,borderRadius:14,border:'1px solid '+COLORES.borde,overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 2px 8px rgba(43,46,32,0.06)',opacity:sinStock?0.55:1}},
            React.createElement('div',{style:{height:110,background:COLORES.verdeClaro,display:'flex',alignItems:'center',justifyContent:'center',fontSize:38,overflow:'hidden'}},
              p.foto_url?React.createElement('img',{src:p.foto_url,style:{width:'100%',height:'100%',objectFit:'cover'},onError:function(e){e.target.style.display='none';}}):iconoRubro((rubros.find(function(r){return r.id===p.rubro_id;})||{}).nombre)
            ),
            React.createElement('div',{style:{padding:'10px 12px',display:'flex',flexDirection:'column',flex:1,gap:6}},
              React.createElement('div',{style:{fontWeight:700,fontSize:13,lineHeight:1.25}},p.nombre),
              p.descripcion&&React.createElement('div',{style:{fontSize:11,color:COLORES.textoSuave,lineHeight:1.3}},p.descripcion),
              React.createElement('div',{style:{marginTop:'auto',display:'flex',alignItems:'baseline',gap:4}},
                React.createElement('span',{style:{fontFamily:'Bebas Neue',fontSize:19,color:COLORES.verde}},formatoCLP(p.precio)),
                React.createElement('span',{style:{fontSize:11,color:COLORES.textoSuave}},unidadLabel(p.unidad_venta))
              ),
              sinStock?React.createElement('div',{style:{fontSize:11,fontWeight:700,color:COLORES.peligro,textAlign:'center',padding:'8px 0'}},'Agotado'):
              (enCarro?React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',background:COLORES.verdeClaro,borderRadius:8,padding:'4px 6px'}},
                React.createElement('button',{onClick:function(){cambiarCantidad(p.id,-pasoCantidad(p.unidad_venta));},style:{background:COLORES.verde,color:'#fff',border:'none',borderRadius:6,width:26,height:26,fontSize:16,cursor:'pointer',lineHeight:'26px',padding:0}},'−'),
                React.createElement('span',{style:{fontSize:12,fontWeight:700}},enCarro.cantidad+(p.unidad_venta==='kg'?' kg':'')),
                React.createElement('button',{onClick:function(){cambiarCantidad(p.id,pasoCantidad(p.unidad_venta));},style:{background:COLORES.verde,color:'#fff',border:'none',borderRadius:6,width:26,height:26,fontSize:16,cursor:'pointer',lineHeight:'26px',padding:0}},'+')
              ):React.createElement('button',{onClick:function(){agregarAlCarrito(p);},style:{background:COLORES.verde,color:'#fff',border:'none',borderRadius:8,padding:'8px 0',fontSize:12,fontWeight:700,cursor:'pointer'}},'Agregar'))
            )
          );
        })
      )
    ),

    // ── Barra fija de carrito cuando hay items y el panel está cerrado ──
    cantidadItems>0&&!panel&&React.createElement('div',{style:{position:'fixed',left:0,right:0,bottom:0,padding:'14px 20px',paddingBottom:'max(14px,env(safe-area-inset-bottom))',background:'#fff',borderTop:'1px solid '+COLORES.borde,boxShadow:'0 -4px 16px rgba(0,0,0,0.08)',zIndex:60}},
      React.createElement('div',{style:{maxWidth:960,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',gap:14}},
        React.createElement('div',null,
          React.createElement('div',{style:{fontSize:10,color:COLORES.textoSuave,letterSpacing:1,textTransform:'uppercase'}},cantidadItems+' producto'+(cantidadItems!==1?'s':'')),
          React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:20,color:COLORES.verde}},formatoCLP(totalCarrito))
        ),
        React.createElement('button',{style:sBtnPrimario,onClick:function(){setPanel('carrito');}},'Ver carrito →')
      )
    ),

    // ── Panel: CARRITO ──
    panel==='carrito'&&React.createElement(PanelOverlay,{onClose:function(){setPanel(null);},titulo:'Tu carrito'},
      carrito.length===0?React.createElement('div',{style:{textAlign:'center',color:COLORES.textoSuave,padding:'40px 0'}},'Tu carrito está vacío.'):
      React.createElement(React.Fragment,null,
        React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:10,marginBottom:16}},
          carrito.map(function(i){
            return React.createElement('div',{key:i.producto_id,style:{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid '+COLORES.borde}},
              React.createElement('div',{style:{flex:1}},
                React.createElement('div',{style:{fontWeight:700,fontSize:13}},i.nombre),
                React.createElement('div',{style:{fontSize:11,color:COLORES.textoSuave}},formatoCLP(i.precio)+' '+unidadLabel(i.unidad_venta))
              ),
              React.createElement('button',{onClick:function(){cambiarCantidad(i.producto_id,-pasoCantidad(i.unidad_venta));},style:{background:COLORES.verdeClaro,color:COLORES.verde,border:'none',borderRadius:6,width:26,height:26,fontSize:16,cursor:'pointer',padding:0}},'−'),
              React.createElement('span',{style:{fontSize:13,fontWeight:700,minWidth:34,textAlign:'center'}},i.cantidad+(i.unidad_venta==='kg'?'kg':'')),
              React.createElement('button',{onClick:function(){cambiarCantidad(i.producto_id,pasoCantidad(i.unidad_venta));},style:{background:COLORES.verdeClaro,color:COLORES.verde,border:'none',borderRadius:6,width:26,height:26,fontSize:16,cursor:'pointer',padding:0}},'+'),
              React.createElement('div',{style:{fontWeight:700,fontSize:13,minWidth:70,textAlign:'right'}},formatoCLP(i.precio*i.cantidad)),
              React.createElement('button',{onClick:function(){quitarDelCarrito(i.producto_id);},style:{background:'none',border:'none',color:COLORES.peligro,fontSize:16,cursor:'pointer',padding:'0 4px'}},'✕')
            );
          })
        ),
        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',fontFamily:'Bebas Neue',fontSize:20,color:COLORES.verde,padding:'10px 0',borderTop:'2px solid '+COLORES.oscuro,marginBottom:16}},
          React.createElement('span',null,'TOTAL'),React.createElement('span',null,formatoCLP(totalCarrito))
        ),
        React.createElement('button',{style:Object.assign({},sBtnPrimario,{width:'100%',opacity:tiendaAbierta?1:0.5}),disabled:!tiendaAbierta,onClick:function(){setPanel('checkout');}},tiendaAbierta?'Continuar con el pedido →':'Tienda cerrada')
      )
    ),

    // ── Panel: CHECKOUT ──
    panel==='checkout'&&React.createElement(PanelOverlay,{onClose:function(){setPanel(null);},titulo:'Datos de entrega y pago'},
      React.createElement('div',null,
        React.createElement('label',{style:sLabel},'Nombre completo'),
        React.createElement('input',{style:sInput,value:form.nombre,onChange:function(e){setForm(Object.assign({},form,{nombre:e.target.value}));},placeholder:'Ej: María Pérez'}),
        React.createElement('label',{style:sLabel},'Teléfono'),
        React.createElement('input',{style:sInput,value:form.telefono,onChange:function(e){setForm(Object.assign({},form,{telefono:e.target.value}));},placeholder:'+56 9 1234 5678'}),
        React.createElement('label',{style:sLabel},'Dirección'),
        React.createElement('input',{style:sInput,value:form.direccion,onChange:function(e){setForm(Object.assign({},form,{direccion:e.target.value}));},placeholder:'Calle, número, depto/casa'}),
        React.createElement('label',{style:sLabel},'Comuna'),
        React.createElement('select',{style:sInput,value:form.comuna,onChange:function(e){setForm(Object.assign({},form,{comuna:e.target.value}));}},
          React.createElement('option',{value:''},'Selecciona tu comuna'),
          COMUNAS_CHILE.filter(function(c){return c.indexOf('PERIFERIA')===-1;}).map(function(c){return React.createElement('option',{key:c,value:c},c);})
        ),
        React.createElement('label',{style:sLabel},'Referencia (opcional)'),
        React.createElement('input',{style:sInput,value:form.referencia,onChange:function(e){setForm(Object.assign({},form,{referencia:e.target.value}));},placeholder:'Ej: Portón negro, casa del fondo'}),

        React.createElement('div',{style:{background:COLORES.verdeClaro,border:'1px solid '+COLORES.verde,borderRadius:10,padding:14,marginTop:6,marginBottom:16}},
          React.createElement('div',{style:{fontWeight:700,fontSize:12,color:COLORES.verde,marginBottom:8,letterSpacing:0.5}},'💳 PAGO POR TRANSFERENCIA'),
          renderDatosBancarios(configTienda&&configTienda.datosBancarios),
          React.createElement('div',{style:{fontSize:11,color:COLORES.textoSuave,marginTop:8}},'Envía tu pedido y adjunta el comprobante (opcional). Un encargado confirmará tu pago y ahí despachamos tu pedido.')
        ),

        React.createElement('label',{style:sLabel},'Adjuntar comprobante (opcional)'),
        React.createElement('input',{type:'file',accept:'image/*,.pdf',style:{marginBottom:16},onChange:function(e){setComprobante(e.target.files&&e.target.files[0]?e.target.files[0]:null);}}),

        errorPedido&&React.createElement('div',{style:{background:'#fdecec',color:COLORES.peligro,borderRadius:8,padding:'10px 12px',fontSize:12,marginBottom:14,fontWeight:600}},errorPedido),

        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',fontFamily:'Bebas Neue',fontSize:20,color:COLORES.verde,padding:'10px 0',borderTop:'2px solid '+COLORES.oscuro,marginBottom:16}},
          React.createElement('span',null,'TOTAL A PAGAR'),React.createElement('span',null,formatoCLP(totalCarrito))
        ),
        React.createElement('button',{style:Object.assign({},sBtnPrimario,{width:'100%',opacity:enviando?0.6:1}),disabled:enviando,onClick:confirmarPedido},enviando?'Enviando pedido...':'Confirmar pedido')
      )
    ),

    // ── Panel: CONFIRMACIÓN ──
    panel==='confirmacion'&&pedidoOk&&React.createElement(PanelOverlay,{onClose:function(){setPanel(null);},titulo:'¡Pedido recibido!',ocultarVolver:true},
      React.createElement('div',{style:{textAlign:'center',padding:'10px 0 24px'}},
        React.createElement('div',{style:{fontSize:44,marginBottom:10}},'✅'),
        React.createElement('div',{style:{fontSize:14,color:COLORES.texto,marginBottom:6}},'Tu pedido N° '+pedidoOk.id+' quedó registrado por '+formatoCLP(pedidoOk.total)+'.'),
        React.createElement('div',{style:{fontSize:13,color:COLORES.textoSuave,marginBottom:20,lineHeight:1.5}},'En cuanto confirmemos tu transferencia, tu pedido pasa a preparación y despacho. Te contactaremos al teléfono que dejaste si hay alguna duda.'),
        React.createElement('button',{style:sBtnPrimario,onClick:function(){setPanel(null);}},'Seguir comprando')
      )
    )
  );

  // ── Subcomponente: panel deslizante genérico (carrito/checkout/confirmación) ──
  function PanelOverlay(props){
    return React.createElement('div',{style:{position:'fixed',inset:0,background:'rgba(43,46,32,0.5)',zIndex:100,display:'flex',justifyContent:'flex-end'},onClick:function(e){if(e.target===e.currentTarget)props.onClose();}},
      React.createElement('div',{style:{width:'min(420px,100%)',height:'100%',background:COLORES.fondo,boxShadow:'-8px 0 24px rgba(0,0,0,0.2)',display:'flex',flexDirection:'column',overflow:'hidden'}},
        React.createElement('div',{style:{background:'linear-gradient(135deg,'+COLORES.oscuro+','+COLORES.oscuroMed+')',padding:'16px 20px',paddingTop:'max(16px,env(safe-area-inset-top))',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'3px solid '+COLORES.dorado}},
          React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:19,letterSpacing:1,color:'#fff'}},props.titulo),
          React.createElement('button',{onClick:props.onClose,style:{background:'none',border:'none',color:COLORES.dorado,fontSize:20,cursor:'pointer'}},'✕')
        ),
        React.createElement('div',{style:{flex:1,overflowY:'auto',padding:'18px 20px'}},props.children)
      )
    );
  }

  function renderDatosBancarios(d){
    if(!d||!d.numero){
      return React.createElement('div',{style:{fontSize:12,color:COLORES.textoSuave}},'Los datos de la cuenta te los confirmaremos apenas recibamos tu pedido.');
    }
    return React.createElement('div',{style:{fontSize:12,lineHeight:1.6,color:COLORES.texto}},
      React.createElement('div',null,React.createElement('strong',null,'Banco: '),d.banco||'—'),
      React.createElement('div',null,React.createElement('strong',null,'Tipo de cuenta: '),d.tipoCuenta||'—'),
      React.createElement('div',null,React.createElement('strong',null,'N° de cuenta: '),d.numero||'—'),
      React.createElement('div',null,React.createElement('strong',null,'RUT: '),d.rut||'—'),
      React.createElement('div',null,React.createElement('strong',null,'Titular: '),d.titular||'—'),
      d.email&&React.createElement('div',null,React.createElement('strong',null,'Email: '),d.email)
    );
  }
}

window.MarketPublico=MarketPublico;
})();
