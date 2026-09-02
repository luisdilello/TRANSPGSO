(function(){

var useEffect=React.useEffect, useRef=React.useRef, useState=React.useState;

var ExportBtn=window.__app.ExportBtn, HistorialCierres=window.__app.HistorialCierres, PlanillaRetiros=window.__app.PlanillaRetiros, db=window.__app.db, exportToExcel=window.__app.exportToExcel, fechaHoyCL=window.__app.fechaHoyCL, lsLoad=window.__app.lsLoad, lsSave=window.__app.lsSave, fetchPorDiasParalelo=window.__app.fetchPorDiasParalelo, fetchPaginadoParalelo=window.__app.fetchPaginadoParalelo, matchComuna=window.__app.matchComuna;

// Registro de consumo local (colaciones, bebidas, etc.) por mensajero, ítem por ítem.
// Cada entrada queda guardada en Supabase (tabla consumos_mensajeros) asociada a la
// semana activa, para que el total quede persistido semana a semana y disponible
// más adelante para Cierre de Mes / historial. El total de la semana se sincroniza
// automáticamente hacia pagos.consumo vía onTotalChange (updatePago).
function ConsumoModal(props){
  var p=props.p, semana=props.semana, productosLocal=props.productosLocal, toast=props.toast, onClose=props.onClose, onTotalChange=props.onTotalChange;
  var _items=useState([]),items=_items[0],setItems=_items[1];
  var _cargando=useState(true),cargando=_cargando[0],setCargando=_cargando[1];
  var productosActivos=(productosLocal||[]).filter(function(x){return x.activo!==false;});
  var _prodSel=useState(function(){return productosActivos.length>0?productosActivos[0].id:null;}),prodSel=_prodSel[0],setProdSel=_prodSel[1];
  var _cant=useState(1),cant=_cant[0],setCant=_cant[1];
  var _guardando=useState(false),guardando=_guardando[0],setGuardando=_guardando[1];

  var nombreNorm=(p.nombre||'').toUpperCase().replace(/,\s*/g,' ').replace(/\s+/g,' ').trim();

  function aplicarTotal(lista){
    var total=lista.reduce(function(a,it){return a+(+it.monto||0);},0);
    onTotalChange(total);
  }

  function cargar(){
    setCargando(true);
    db.from('consumos_mensajeros').select('*').eq('semana',semana).eq('mensajero_nombre',nombreNorm).order('fecha',{ascending:true}).then(function(r){
      var data=(r&&r.data)||[];
      setItems(data);
      setCargando(false);
      aplicarTotal(data);
    });
  }

  useEffect(function(){cargar();},[]);

  function agregar(){
    var prod=productosActivos.find(function(x){return x.id===prodSel;});
    if(!prod){toast&&toast('⚠ Selecciona un producto');return;}
    var cantidad=+cant||1;
    var monto=cantidad*(prod.precio||0);
    setGuardando(true);
    db.from('consumos_mensajeros').insert({
      semana:semana,fecha:fechaHoyCL(),mensajero_nombre:nombreNorm,
      producto:prod.nombre,cantidad:cantidad,precio_unitario:prod.precio||0,monto:monto
    }).then(function(r){
      setGuardando(false);
      if(r&&r.error){toast&&toast('⚠ Error: '+r.error.message);return;}
      setCant(1);
      cargar();
    });
  }

  function eliminar(id){
    db.from('consumos_mensajeros').delete().eq('id',id).then(function(r){
      if(r&&r.error){toast&&toast('⚠ Error: '+r.error.message);return;}
      cargar();
    });
  }

  var total=items.reduce(function(a,it){return a+(+it.monto||0);},0);

  // Resumen agrupado por producto (ej. "Almuerzo: $10.500", "Cafe: $2.400") -- Luis pidió ver
  // cuánto fue en cada tipo de consumo, no solo el detalle ítem por ítem que ya se mostraba abajo
  // (esa lista se deja igual). Se calcula sobre los mismos 'items' ya cargados, sin tocar nada
  // en Supabase.
  var resumenPorProducto=(function(){
    var mapa={};
    var orden=[];
    items.forEach(function(it){
      var nombreProd=it.producto||'(Sin producto)';
      if(!mapa[nombreProd]){mapa[nombreProd]={cantidad:0,monto:0};orden.push(nombreProd);}
      mapa[nombreProd].cantidad+=(+it.cantidad||0);
      mapa[nombreProd].monto+=(+it.monto||0);
    });
    return orden.map(function(nombreProd){return{producto:nombreProd,cantidad:mapa[nombreProd].cantidad,monto:mapa[nombreProd].monto};}).sort(function(a,b){return b.monto-a.monto;});
  })();

  return React.createElement('div',{style:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999},onClick:onClose},
    React.createElement('div',{style:{background:'#fff',borderRadius:14,padding:20,width:420,maxWidth:'92vw',maxHeight:'85vh',overflowY:'auto'},onClick:function(e){e.stopPropagation();}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}},
        React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1,color:'var(--dark)'}},'🍽 Consumo Local'),
        React.createElement('button',{onClick:onClose,style:{border:'none',background:'none',fontSize:18,cursor:'pointer',color:'var(--text-soft)'}},'✕')
      ),
      React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:14}},p.nombre.replace(/,\s*/g,' ')+' — Semana: '+semana),
      productosActivos.length===0?React.createElement('div',{style:{fontSize:12,color:'var(--danger)',marginBottom:10,background:'rgba(176,48,48,0.06)',padding:10,borderRadius:8}},'No hay productos activos en la pestaña "Productos". Agrega uno primero para poder registrar consumo.'):
      React.createElement('div',{style:{display:'flex',gap:8,marginBottom:14,alignItems:'flex-end'}},
        React.createElement('div',{style:{flex:1}},
          React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Producto'),
          React.createElement('select',{value:prodSel||'',onChange:function(e){setProdSel(+e.target.value);},style:{width:'100%',padding:'7px 8px',borderRadius:7,border:'1px solid var(--border)',fontSize:12,outline:'none'}},
            productosActivos.map(function(pr){return React.createElement('option',{key:pr.id,value:pr.id},pr.nombre+' — $'+Math.round(pr.precio).toLocaleString('es-CL'));})
          )
        ),
        React.createElement('div',{style:{width:64}},
          React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Cant.'),
          React.createElement('input',{type:'number',min:1,value:cant,onChange:function(e){setCant(e.target.value);},onFocus:function(e){e.target.select();},style:{width:'100%',padding:'7px 8px',borderRadius:7,border:'1px solid var(--border)',fontSize:12,outline:'none'}})
        ),
        React.createElement('button',{onClick:agregar,disabled:guardando,style:{padding:'8px 14px',borderRadius:7,border:'none',background:'var(--gold)',color:'#2b2e20',fontWeight:700,fontSize:12,cursor:guardando?'default':'pointer',opacity:guardando?0.6:1}},guardando?'...':'+ Agregar')
      ),
      !cargando&&resumenPorProducto.length>0&&React.createElement('div',{style:{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}},
        resumenPorProducto.map(function(r){return React.createElement('div',{key:r.producto,style:{display:'flex',alignItems:'center',gap:6,background:'rgba(176,48,48,0.06)',border:'1px solid rgba(176,48,48,0.18)',borderRadius:20,padding:'4px 10px',fontSize:11}},
          React.createElement('span',{style:{fontWeight:700,color:'var(--text)'}},r.producto),
          React.createElement('span',{style:{color:'var(--text-soft)'}},'× '+r.cantidad),
          React.createElement('span',{style:{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--danger)'}},'$'+Math.round(r.monto).toLocaleString('es-CL'))
        );})
      ),
      React.createElement('div',{style:{maxHeight:220,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8}},
        cargando?React.createElement('div',{style:{padding:14,fontSize:12,color:'var(--text-soft)',textAlign:'center'}},'Cargando...'):
        items.length===0?React.createElement('div',{style:{padding:14,fontSize:12,color:'var(--text-soft)',textAlign:'center'}},'Sin consumos registrados esta semana.'):
        items.map(function(it){return React.createElement('div',{key:it.id,style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',borderBottom:'1px solid var(--border)',fontSize:12}},
          React.createElement('div',null,
            React.createElement('div',{style:{fontWeight:600}},it.producto+' × '+it.cantidad),
            React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)'}},it.fecha)
          ),
          React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8}},
            React.createElement('span',{style:{fontFamily:'JetBrains Mono',color:'var(--danger)',fontWeight:600}},'$'+Math.round(it.monto).toLocaleString('es-CL')),
            React.createElement('button',{onClick:function(){eliminar(it.id);},style:{border:'none',background:'rgba(176,48,48,0.1)',color:'#b03030',borderRadius:5,width:20,height:20,cursor:'pointer',fontSize:11}},'×')
          )
        );})
      ),
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14,paddingTop:12,borderTop:'2px solid var(--border)'}},
        React.createElement('span',{style:{fontSize:12,fontWeight:700,color:'var(--text)'}},'TOTAL CONSUMO SEMANA'),
        React.createElement('span',{style:{fontFamily:'JetBrains Mono',fontSize:16,fontWeight:900,color:'var(--danger)'}},'$'+Math.round(total).toLocaleString('es-CL'))
      )
    )
  );
}

// Antes semanaActual() (adentro de PagosMensajeros) solo calculaba la semana de HOY -- si un
// consumo se registraba con una fecha de una semana distinta (backfill/corrección), había que
// etiquetarlo igual con la semana que estuviera activa en pantalla, lo que lo dejaba mezclado con
// la semana equivocada. Esta versión hace lo mismo pero para CUALQUIER fecha, así cada consumo
// backfillado queda agrupado en SU propia semana real (lunes a sábado), sin importar qué semana
// esté abierta en la pestaña de Pagos en ese momento.

// Catálogo de faltas del Reglamento Operativo (sección 7: Clasificación de Faltas, más los
// protocolos de bodega/entrega/cierre de jornada). La cantidad de envíos sugerida es un
// criterio de partida (editable en el momento de aplicar) -- el Reglamento solo fija montos
// en pesos para dos casos puntuales (protocolo de bodega: $1.000 fijo; entrega no cumplida el
// mismo día: costo de mensajero de emergencia, $2.500 por encomienda); para el resto, la
// gravedad Leve/Grave/Crítica que define el propio Reglamento (sección 7) es la que orienta
// el número de envíos sugerido aquí. Luis puede ajustar cualquier valor antes de aplicar.
var CATALOGO_FALTAS_REGLAMENTO=[
  {grupo:'Leve',label:'No enviar respaldos de salida de bodega (pantallazos Flex + Interna)',envios:1},
  {grupo:'Leve',label:'Respaldos incompletos o enviados fuera de tiempo',envios:1},
  {grupo:'Leve',label:'Retraso menor sin justificación válida',envios:1},
  {grupo:'Grave',label:'Entrega sin evidencia obligatoria completa (etiqueta / fachada / entrega / datos receptor)',envios:5},
  {grupo:'Grave',label:'No entregar encomienda el mismo día sin justificación válida',envios:10},
  {grupo:'Grave',label:'No registrar correctamente el estado en la aplicación',envios:3},
  {grupo:'Grave',label:'Finalizar jornada sin autorización',envios:5},
  {grupo:'Grave',label:'Devolver paquete sin respaldo',envios:5},
  {grupo:'Grave',label:'Diferencia entre paquetes retirados / entregados / devueltos',envios:10},
  {grupo:'Crítica',label:'Falsificación de entrega',envios:20},
  {grupo:'Crítica',label:'Manipulación o alteración de evidencias',envios:20},
  {grupo:'Crítica',label:'Pérdida de encomienda por negligencia',envios:15},
  {grupo:'Crítica',label:'Delegar entregas sin autorización',envios:15},
  {grupo:'Crítica',label:'Abandono de ruta',envios:20},
  {grupo:'Crítica',label:'Ocultamiento de información relevante',envios:10},
  {grupo:'Otro',label:'Otro (personalizado)',envios:0}
];

// Modal de descuentos/multas por falta operativa, por mensajero -- se abre desde el botón
// "🎯 Descuentos" de la tarjeta (carnet) de Pagos. Cada aplicación queda guardada dentro del
// propio objeto de pago (p.penalizaciones), que ya se respalda automáticamente en Supabase
// junto con el resto de "pagos" (mismo mecanismo que tarifa/adelanto/préstamo) -- no requiere
// tabla ni migración nueva. El monto se calcula una sola vez al aplicar (envíos × tarifa
// vigente de ese mensajero en ese momento), igual que Consumo Local.
function PenalizacionModal(props){
  var p=props.p, onClose=props.onClose, onAplicar=props.onAplicar, onEliminar=props.onEliminar, toast=props.toast;
  // Lista local -- igual que ConsumoModal: se inicializa una sola vez desde props.p.penalizaciones
  // y se actualiza al toque en aplicar()/eliminar(), en vez de leer directo de props.p (que queda
  // congelado en el objeto de pago que había cuando se abrió el modal y no se refresca solo).
  var _items=useState(function(){return props.p.penalizaciones||[];}),items=_items[0],setItems=_items[1];
  var _sel=useState(CATALOGO_FALTAS_REGLAMENTO[0].label),faltaSel=_sel[0],setFaltaSel=_sel[1];
  var _envios=useState(CATALOGO_FALTAS_REGLAMENTO[0].envios),envios=_envios[0],setEnvios=_envios[1];
  var _nota=useState(''),nota=_nota[0],setNota=_nota[1];

  function onChangeFalta(label){
    setFaltaSel(label);
    var item=CATALOGO_FALTAS_REGLAMENTO.find(function(f){return f.label===label;});
    setEnvios(item?item.envios:0);
  }

  function aplicar(){
    var e=+envios||0;
    if(e<=0){toast&&toast('⚠ Ingresa una cantidad de envíos mayor a 0');return;}
    var monto=Math.round(e*(+p.tarifa||0));
    var item={id:Date.now(),motivo:faltaSel,envios:e,monto:monto,nota:nota||'',fecha:fechaHoyCL()};
    setItems(function(prev){return prev.concat([item]);});
    onAplicar(item);
    setNota('');
    toast&&toast('✓ Descuento aplicado: -'+e+' envíos');
  }

  function eliminar(itemId){
    setItems(function(prev){return prev.filter(function(x){return x.id!==itemId;});});
    onEliminar(itemId);
  }

  var lista=items;
  var totalEnvios=lista.reduce(function(a,x){return a+(x.envios||0);},0);
  var totalMonto=lista.reduce(function(a,x){return a+(x.monto||0);},0);
  var grupos=['Leve','Grave','Crítica','Otro'];

  return React.createElement('div',{style:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999},onClick:onClose},
    React.createElement('div',{style:{background:'#fff',borderRadius:14,padding:20,width:460,maxWidth:'92vw',maxHeight:'85vh',overflowY:'auto'},onClick:function(e){e.stopPropagation();}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}},
        React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1,color:'var(--dark)'}},'🎯 Descuentos por Falta'),
        React.createElement('button',{onClick:onClose,style:{border:'none',background:'none',fontSize:18,cursor:'pointer',color:'var(--text-soft)'}},'✕')
      ),
      React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:14}},p.nombre.replace(/,\s*/g,' ')+' · Según Reglamento Operativo'),
      React.createElement('div',{style:{display:'flex',gap:8,marginBottom:10,alignItems:'flex-end',flexWrap:'wrap'}},
        React.createElement('div',{style:{flex:'2 1 220px'}},
          React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Tipo de falta'),
          React.createElement('select',{value:faltaSel,onChange:function(e){onChangeFalta(e.target.value);},style:{width:'100%',padding:'7px 8px',borderRadius:7,border:'1px solid var(--border)',fontSize:12,outline:'none'}},
            grupos.map(function(g){
              return React.createElement('optgroup',{key:g,label:g},
                CATALOGO_FALTAS_REGLAMENTO.filter(function(f){return f.grupo===g;}).map(function(f){
                  return React.createElement('option',{key:f.label,value:f.label},f.label+(f.envios>0?' (-'+f.envios+')':''));
                })
              );
            })
          )
        ),
        React.createElement('div',{style:{width:100}},
          React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Envíos'),
          React.createElement('input',{type:'number',min:0,value:envios,onChange:function(e){setEnvios(e.target.value);},style:{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',fontSize:12,outline:'none',fontFamily:'JetBrains Mono'}})
        ),
        React.createElement('button',{onClick:aplicar,style:{padding:'8px 14px',borderRadius:8,border:'none',background:'var(--danger)',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}},'− Aplicar')
      ),
      React.createElement('input',{type:'text',placeholder:'Nota / detalle (opcional)...',value:nota,onChange:function(e){setNota(e.target.value);},
        style:{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:12,outline:'none',marginBottom:14,boxSizing:'border-box'}}),
      lista.length===0?React.createElement('div',{style:{textAlign:'center',padding:'16px 0',color:'var(--text-soft)',fontSize:13}},'Sin descuentos aplicados esta semana.'):
        React.createElement('div',{style:{border:'1px solid var(--border)',borderRadius:8,marginBottom:12,overflow:'hidden'}},
          lista.map(function(x,i){
            return React.createElement('div',{key:x.id,style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:i%2===0?'#fff':'var(--cream)',borderBottom:'1px solid var(--border)',gap:8}},
              React.createElement('div',{style:{flex:1,minWidth:0}},
                React.createElement('div',{style:{fontSize:12,fontWeight:600}},x.motivo),
                x.nota?React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)'}},x.nota):null,
                React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)'}},x.fecha)
              ),
              React.createElement('span',{style:{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--danger)',whiteSpace:'nowrap'}},'-'+x.envios+' ($'+Math.round(x.monto).toLocaleString('es-CL')+')'),
              React.createElement('button',{onClick:function(){eliminar(x.id);},style:{padding:'2px 7px',borderRadius:4,border:'none',background:'rgba(176,48,48,0.1)',color:'#b03030',cursor:'pointer'}},'x')
            );
          })
        ),
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',padding:'10px 12px',background:'rgba(176,48,48,0.08)',fontWeight:700,borderRadius:8,marginBottom:14}},
        React.createElement('span',null,'TOTAL PENALIZADO'),
        React.createElement('span',{style:{fontFamily:'JetBrains Mono',color:'var(--danger)'}},'-'+totalEnvios+' envíos ($'+Math.round(totalMonto).toLocaleString('es-CL')+')')
      ),
      React.createElement('div',{style:{display:'flex',justifyContent:'flex-end'}},React.createElement('button',{onClick:onClose,style:{padding:'8px 16px',borderRadius:8,border:'1px solid var(--border)',background:'var(--cream)',color:'var(--text-main)',fontSize:12,cursor:'pointer'}},'Cerrar'))
    )
  );
}

function calcularSemanaDeFecha(fechaStr){
  var d=new Date(fechaStr+'T12:00:00');
  var lunes=new Date(d);
  lunes.setDate(d.getDate()-((d.getDay()+6)%7));
  var sabado=new Date(lunes);
  sabado.setDate(lunes.getDate()+5);
  var fmt=function(x){return x.toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'});};
  return fmt(lunes)+' al '+fmt(sabado);
}

// Pantalla de carga rápida de consumo, día a día, para TODOS los mensajeros a la vez -- pensada
// para que quien anota los consumos (colaciones, bebidas, etc.) no tenga que entrar mensajero por
// mensajero desde la tabla de Pagos: acá aparecen todos en una lista (como la Planilla de
// Retiros), cada uno con su propio selector de producto y cantidad. Cada "+ Agregar" hace el
// mismo insert inmediato a consumos_mensajeros que el modal individual (ConsumoModal) -- no es un
// borrador local: queda guardado con la fecha real apenas se aprieta el botón. El total de la
// columna derecha se lee directo de `pagos` (que a su vez se mantiene sincronizado en tiempo real
// contra consumos_mensajeros por sincronizarConsumoDesdeDB en PagosMensajeros), así que apenas se
// agrega algo acá, ese mismo total ya se ve actualizado en la tabla de Pagos sin recargar nada.
//
// Luis pidió dos cosas más: (1) poder ingresar un consumo en CUALQUIER fecha (no solo hoy), para
// poder corregir si se les olvidó anotar algo un día anterior; y (2) poder VER el consumo filtrado
// por un día puntual o un rango de fechas, no solo el acumulado de "esta semana". Por eso ahora
// hay un selector FECHA en el formulario de carga (antes se guardaba siempre con fechaHoyCL()), y
// un selector "Ver por" con tres modos: Esta semana (el comportamiento de siempre, en vivo desde
// `pagos`), Un día, y Rango de fechas -- estos dos últimos hacen su PROPIA consulta directa a
// consumos_mensajeros filtrando por `fecha` (independiente de `semana` y de sincronizarConsumoDesdeDB,
// que solo sigue la semana activa de la pestaña Pagos), agrupan por mensajero, y permiten ver el
// detalle día por día de cada ítem con opción de eliminarlo.
function ConsumoDiario(props){
  var mensajeros=props.mensajeros||[],pagos=props.pagos||[],productosLocal=props.productosLocal,semana=props.semana,toast=props.toast,onAbrirDetalle=props.onAbrirDetalle,onConsumoGuardado=props.onConsumoGuardado;
  var productosActivos=(productosLocal||[]).filter(function(x){return x.activo!==false;});
  // Antes esto listaba TODOS los mensajeros activos como filas fijas -- con equipos grandes la
  // lista queda eterna para encontrar a uno solo. Ahora la carga es al revés: arriba hay un
  // único selector (mensajero + producto + cantidad) para agregar rápido, y abajo solo aparecen
  // los que YA tienen algún consumo cargado esta semana -- la lista larga desaparece y solo
  // "los que consuman" quedan visibles, creciendo de a uno a medida que se van agregando.
  var _selMensajero=useState(''),selMensajero=_selMensajero[0],setSelMensajero=_selMensajero[1];
  var _selProd=useState(productosActivos.length>0?productosActivos[0].id:null),selProd=_selProd[0],setSelProd=_selProd[1];
  var _cant=useState(1),cant=_cant[0],setCant=_cant[1];
  var _fechaSel=useState(fechaHoyCL()),fechaSel=_fechaSel[0],setFechaSel=_fechaSel[1];
  var _guardando=useState(false),guardando=_guardando[0],setGuardando=_guardando[1];
  var _busqueda=useState(''),busqueda=_busqueda[0],setBusqueda=_busqueda[1];

  // ── "Ver por": Esta semana (en vivo, comportamiento de siempre) / Un día / Rango de fechas ──
  var _modoVer=useState('semana'),modoVer=_modoVer[0],setModoVer=_modoVer[1];
  var _verFecha=useState(fechaHoyCL()),verFecha=_verFecha[0],setVerFecha=_verFecha[1];
  var _verDesde=useState(fechaHoyCL()),verDesde=_verDesde[0],setVerDesde=_verDesde[1];
  var _verHasta=useState(fechaHoyCL()),verHasta=_verHasta[0],setVerHasta=_verHasta[1];
  var _consumoRango=useState([]),consumoRango=_consumoRango[0],setConsumoRango=_consumoRango[1];
  var _cargandoRango=useState(false),cargandoRango=_cargandoRango[0],setCargandoRango=_cargandoRango[1];
  var _detalleNombre=useState(null),detalleNombre=_detalleNombre[0],setDetalleNombre=_detalleNombre[1];

  function normNombreConsumo(n){return(n||'').toUpperCase().replace(/,\s*/g,' ').replace(/\s+/g,' ').trim();}

  var activos=mensajeros.filter(function(m){return m.activo!==false&&m.activo!=='paused'&&m.nombre&&m.nombre.trim();});
  var activosOrdenados=activos.slice().sort(function(a,b){return a.nombre.localeCompare(b.nombre,'es');});

  function consumoDe(nombre){
    var nombreNorm=normNombreConsumo(nombre);
    var pago=pagos.find(function(p){return normNombreConsumo(p.nombre)===nombreNorm;});
    return pago?(pago.consumo||0):0;
  }

  function cargarConsumoRango(desde,hasta){
    setCargandoRango(true);
    db.from('consumos_mensajeros').select('*').gte('fecha',desde).lte('fecha',hasta).order('fecha',{ascending:true}).then(function(r){
      setCargandoRango(false);
      if(r&&r.error){toast&&toast('⚠ Error: '+r.error.message);setConsumoRango([]);return;}
      setConsumoRango((r&&r.data)||[]);
    });
  }

  useEffect(function(){
    if(modoVer==='dia')cargarConsumoRango(verFecha,verFecha);
    else if(modoVer==='rango')cargarConsumoRango(verDesde,verHasta);
  },[modoVer,verFecha,verDesde,verHasta]);

  function agregar(){
    if(!selMensajero){toast&&toast('⚠ Selecciona un mensajero');return;}
    var prod=productosActivos.find(function(x){return x.id===selProd;});
    if(!prod){toast&&toast('⚠ Selecciona un producto');return;}
    var cantidad=+cant||1;
    var monto=cantidad*(prod.precio||0);
    var nombreNorm=normNombreConsumo(selMensajero);
    var fechaFinal=fechaSel||fechaHoyCL();
    var semanaFinal=calcularSemanaDeFecha(fechaFinal);
    setGuardando(true);
    db.from('consumos_mensajeros').insert({
      semana:semanaFinal,fecha:fechaFinal,mensajero_nombre:nombreNorm,
      producto:prod.nombre,cantidad:cantidad,precio_unitario:prod.precio||0,monto:monto
    }).then(function(r){
      setGuardando(false);
      if(r&&r.error){toast&&toast('⚠ Error: '+r.error.message);return;}
      setCant(1);
      toast&&toast('✓ '+prod.nombre+' agregado a '+selMensajero.split(',')[0].split(' ')[0]+(fechaFinal!==fechaHoyCL()?' ('+fechaFinal+')':''));
      // El mensajero elegido se mantiene seleccionado a propósito -- así, si compró varias
      // cosas distintas, se pueden ir agregando una tras otra sin tener que volver a buscarlo.
      // Si la fecha cargada cae dentro del día/rango que se está viendo ahora mismo, refresca
      // esa vista para que el ítem recién agregado aparezca al toque, sin recargar la página.
      if(modoVer==='dia'&&fechaFinal===verFecha)cargarConsumoRango(verFecha,verFecha);
      else if(modoVer==='rango'&&fechaFinal>=verDesde&&fechaFinal<=verHasta)cargarConsumoRango(verDesde,verHasta);
      // Antes esto dependía SOLO de Supabase Realtime para que la columna "Consumo" de la
      // pestaña Pagos se actualizara sola -- pero la tabla consumos_mensajeros no estaba
      // suscrita a la publicación de Realtime, así que ese aviso nunca llegaba y el monto se
      // quedaba pegado en el valor viejo hasta que alguien recargaba toda la página entera
      // (aunque el dato ya estaba bien guardado en la base). Ahora, además de Realtime (ya
      // habilitado), se refresca de una vez aquí mismo apenas se guarda -- así no depende de
      // que esa suscripción esté funcionando para verse reflejado.
      onConsumoGuardado&&onConsumoGuardado();
    });
  }

  function eliminarItemRango(id){
    db.from('consumos_mensajeros').delete().eq('id',id).then(function(r){
      if(r&&r.error){toast&&toast('⚠ Error: '+r.error.message);return;}
      if(modoVer==='dia')cargarConsumoRango(verFecha,verFecha);
      else if(modoVer==='rango')cargarConsumoRango(verDesde,verHasta);
    });
  }

  // Solo los que YA tienen consumo cargado esta semana -- la lista corta que pidió Luis.
  var conConsumo=activosOrdenados.filter(function(m){return consumoDe(m.nombre)>0;});
  if(busqueda.trim()){
    var q=busqueda.trim().toUpperCase();
    conConsumo=conConsumo.filter(function(m){return m.nombre.toUpperCase().includes(q);});
  }

  // ── Totales por mensajero para los modos Un día / Rango (independiente de `pagos`) ──
  var totalesRangoPorNombre={};
  consumoRango.forEach(function(it){
    var k=normNombreConsumo(it.mensajero_nombre);
    totalesRangoPorNombre[k]=(totalesRangoPorNombre[k]||0)+(+it.monto||0);
  });
  var nombresRango=Object.keys(totalesRangoPorNombre).sort(function(a,b){return a.localeCompare(b,'es');});
  if(busqueda.trim()){
    var q2=busqueda.trim().toUpperCase();
    nombresRango=nombresRango.filter(function(n){return n.includes(q2);});
  }

  var detalleItems=detalleNombre?consumoRango.filter(function(it){return normNombreConsumo(it.mensajero_nombre)===detalleNombre;}).sort(function(a,b){return (a.fecha||'').localeCompare(b.fecha||'');}):[];
  var detalleTotal=detalleItems.reduce(function(a,it){return a+(+it.monto||0);},0);

  var etiquetaPeriodo=modoVer==='semana'?('Semana: '+semana):modoVer==='dia'?('Día: '+verFecha):('Rango: '+verDesde+' al '+verHasta);
  var etiquetaLista=modoVer==='semana'?'esta semana':modoVer==='dia'?'este día':'este rango';

  return React.createElement('div',null,
    React.createElement('div',{className:'section-head'},
      React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:14,letterSpacing:1.5,color:'var(--dark)'}},'Consumo Diario — ',etiquetaPeriodo)
    ),
    productosActivos.length===0
      ?React.createElement('div',{className:'info-banner'},'⚠ No hay productos activos en la pestaña "Productos". Agrega uno primero para poder registrar consumo.')
      :React.createElement(React.Fragment,null,
        // ── Selector para agregar (con fecha elegible, para poder corregir días anteriores) ──
        React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end',background:'#fff',border:'1px solid var(--border)',borderTop:'3px solid var(--gold)',borderRadius:10,padding:16,marginBottom:20}},
          React.createElement('div',{style:{flex:'2 1 240px',minWidth:200}},
            React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3,letterSpacing:1}},'MENSAJERO'),
            React.createElement('select',{value:selMensajero,onChange:function(e){setSelMensajero(e.target.value);},style:{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:13,outline:'none',fontWeight:600}},
              React.createElement('option',{value:''},'Selecciona un mensajero...'),
              activosOrdenados.map(function(m){return React.createElement('option',{key:m.nombre,value:m.nombre},m.nombre.replace(/,\s*/g,' '));})
            )
          ),
          React.createElement('div',{style:{flex:'2 1 220px',minWidth:180}},
            React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3,letterSpacing:1}},'PRODUCTO'),
            React.createElement('select',{value:selProd||'',onChange:function(e){setSelProd(+e.target.value);},style:{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:13,outline:'none'}},
              productosActivos.map(function(pr){return React.createElement('option',{key:pr.id,value:pr.id},pr.nombre+' — $'+Math.round(pr.precio).toLocaleString('es-CL'));})
            )
          ),
          React.createElement('div',{style:{width:70}},
            React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3,letterSpacing:1}},'CANT.'),
            React.createElement('input',{type:'number',min:1,value:cant,onChange:function(e){setCant(e.target.value);},onFocus:function(e){e.target.select();},style:{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:13,textAlign:'center',outline:'none'}})
          ),
          React.createElement('div',{style:{width:150}},
            React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3,letterSpacing:1}},'FECHA'),
            React.createElement('input',{type:'date',value:fechaSel,max:fechaHoyCL(),onChange:function(e){setFechaSel(e.target.value);},style:{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:13,outline:'none'}})
          ),
          React.createElement('button',{onClick:agregar,disabled:guardando,style:{padding:'10px 20px',borderRadius:7,border:'none',background:'var(--gold)',color:'#2b2e20',fontWeight:700,fontSize:13,cursor:guardando?'default':'pointer',opacity:guardando?0.6:1}},guardando?'Guardando...':'+ Agregar')
        ),
        fechaSel!==fechaHoyCL()?React.createElement('div',{style:{fontSize:11,color:'var(--gold)',background:'rgba(199,168,88,0.12)',padding:'6px 10px',borderRadius:7,marginTop:-12,marginBottom:16,fontWeight:600}},'📅 Vas a registrar este consumo con fecha ',fechaSel,' (no hoy) — quedará en la semana que le corresponda a esa fecha.'):null,
        // ── Selector "Ver por": Esta semana / Un día / Rango de fechas ──────
        React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end',marginBottom:14}},
          React.createElement('div',{style:{display:'flex',gap:4}},
            [['semana','Esta semana'],['dia','Un día'],['rango','Rango de fechas']].map(function(opt){
              return React.createElement('button',{key:opt[0],onClick:function(){setModoVer(opt[0]);},style:{padding:'7px 12px',borderRadius:20,border:'1px solid '+(modoVer===opt[0]?'var(--gold)':'var(--border)'),background:modoVer===opt[0]?'var(--gold)':'#fff',color:modoVer===opt[0]?'#2b2e20':'var(--text-soft)',fontWeight:700,fontSize:11,cursor:'pointer'}},opt[1]);
            })
          ),
          modoVer==='dia'?React.createElement('div',null,
            React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3,letterSpacing:1}},'DÍA'),
            React.createElement('input',{type:'date',value:verFecha,max:fechaHoyCL(),onChange:function(e){setVerFecha(e.target.value);},style:{padding:'7px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:12,outline:'none'}})
          ):null,
          modoVer==='rango'?React.createElement(React.Fragment,null,
            React.createElement('div',null,
              React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3,letterSpacing:1}},'DESDE'),
              React.createElement('input',{type:'date',value:verDesde,max:verHasta,onChange:function(e){setVerDesde(e.target.value);},style:{padding:'7px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:12,outline:'none'}})
            ),
            React.createElement('div',null,
              React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3,letterSpacing:1}},'HASTA'),
              React.createElement('input',{type:'date',value:verHasta,min:verDesde,max:fechaHoyCL(),onChange:function(e){setVerHasta(e.target.value);},style:{padding:'7px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:12,outline:'none'}})
            )
          ):null
        ),
        // ── Lista: quienes tienen consumo en el período elegido ─────────────
        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}},
          React.createElement('div',{style:{fontSize:12,fontWeight:700,color:'var(--text)',letterSpacing:0.5}},'Consumo registrado ',etiquetaLista),
          React.createElement('input',{type:'text',placeholder:'🔍 Buscar...',value:busqueda,onChange:function(e){setBusqueda(e.target.value);},style:{padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12,outline:'none',minWidth:180}})
        ),
        modoVer==='semana'?(
          conConsumo.length===0
            ?React.createElement('div',{className:'info-banner'},'Aún no hay consumo registrado esta semana. Usa el selector de arriba para agregar el primero.')
            :React.createElement('div',{className:'table-wrap'},
              React.createElement('table',null,
                React.createElement('thead',null,React.createElement('tr',null,
                  React.createElement('th',null,'Mensajero'),
                  React.createElement('th',{style:{width:150,textAlign:'right'}},'Consumo Semana')
                )),
                React.createElement('tbody',null,
                  conConsumo.map(function(m){
                    return React.createElement('tr',{key:m.nombre},
                      React.createElement('td',{style:{fontWeight:700,whiteSpace:'nowrap'}},m.nombre.replace(/,\s*/g,' ')),
                      React.createElement('td',{className:'mono',style:{textAlign:'right',color:'var(--danger)',fontWeight:700,cursor:'pointer'},onClick:function(){onAbrirDetalle&&onAbrirDetalle(m);},title:'Clic para ver el detalle de la semana o eliminar un ítem'},'$',Math.round(consumoDe(m.nombre)).toLocaleString('es-CL'))
                    );
                  })
                )
              )
            )
        ):(
          cargandoRango
            ?React.createElement('div',{className:'info-banner'},'Cargando...')
            :nombresRango.length===0
              ?React.createElement('div',{className:'info-banner'},'No hay consumo registrado en '+etiquetaLista+'.')
              :React.createElement('div',{className:'table-wrap'},
                React.createElement('table',null,
                  React.createElement('thead',null,React.createElement('tr',null,
                    React.createElement('th',null,'Mensajero'),
                    React.createElement('th',{style:{width:150,textAlign:'right'}},'Consumo del período')
                  )),
                  React.createElement('tbody',null,
                    nombresRango.map(function(n){
                      return React.createElement('tr',{key:n},
                        React.createElement('td',{style:{fontWeight:700,whiteSpace:'nowrap'}},n.replace(/,\s*/g,' ')),
                        React.createElement('td',{className:'mono',style:{textAlign:'right',color:'var(--danger)',fontWeight:700,cursor:'pointer'},onClick:function(){setDetalleNombre(n);},title:'Clic para ver el detalle día por día o eliminar un ítem'},'$',Math.round(totalesRangoPorNombre[n]).toLocaleString('es-CL'))
                      );
                    })
                  )
                )
              )
        ),
        // ── Detalle día por día del período elegido, con opción de eliminar ítems ──
        detalleNombre?React.createElement('div',{style:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999},onClick:function(){setDetalleNombre(null);}},
          React.createElement('div',{style:{background:'#fff',borderRadius:14,padding:20,width:420,maxWidth:'92vw',maxHeight:'85vh',overflowY:'auto'},onClick:function(e){e.stopPropagation();}},
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}},
              React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1,color:'var(--dark)'}},'🍽 Detalle de Consumo'),
              React.createElement('button',{onClick:function(){setDetalleNombre(null);},style:{border:'none',background:'none',fontSize:18,cursor:'pointer',color:'var(--text-soft)'}},'✕')
            ),
            React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:14}},detalleNombre.replace(/,\s*/g,' ')+' — '+etiquetaPeriodo),
            React.createElement('div',{style:{maxHeight:280,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8}},
              detalleItems.length===0?React.createElement('div',{style:{padding:14,fontSize:12,color:'var(--text-soft)',textAlign:'center'}},'Sin ítems en este período.'):
              detalleItems.map(function(it){return React.createElement('div',{key:it.id,style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',borderBottom:'1px solid var(--border)',fontSize:12}},
                React.createElement('div',null,
                  React.createElement('div',{style:{fontWeight:600}},it.producto+' × '+it.cantidad),
                  React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)'}},it.fecha)
                ),
                React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8}},
                  React.createElement('span',{style:{fontFamily:'JetBrains Mono',color:'var(--danger)',fontWeight:600}},'$'+Math.round(it.monto).toLocaleString('es-CL')),
                  React.createElement('button',{onClick:function(){eliminarItemRango(it.id);},style:{border:'none',background:'rgba(176,48,48,0.1)',color:'#b03030',borderRadius:5,width:20,height:20,cursor:'pointer',fontSize:11}},'×')
                )
              );})
            ),
            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14,paddingTop:12,borderTop:'2px solid var(--border)'}},
              React.createElement('span',{style:{fontSize:12,fontWeight:700,color:'var(--text)'}},'TOTAL'),
              React.createElement('span',{style:{fontFamily:'JetBrains Mono',fontSize:16,fontWeight:900,color:'var(--danger)'}},'$'+Math.round(detalleTotal).toLocaleString('es-CL'))
            )
          )
        ):null
      )
  );
}

// Pago por efectividad de entrega: además del pago normal (tarifa x envío), el admin puede
// activar (por separado) un BONO fijo para el mensajero que llegue a una efectividad mínima
// esa semana, y/o un DESCUENTO fijo para el que quede por debajo de otro % (más bajo, dejando
// una zona neutra entre los dos donde no pasa nada). La efectividad es entregados/asignados,
// mismo criterio 'en_bodega' excluido que usa el calendario "Mis Entregas" del mensajero. Se
// guarda en la tabla genérica 'configuracion' (clave 'criterio_pago_efectividad'), igual que
// 'motivos_reprogramacion' en Gestión de Envíos -- no crea tabla nueva. El bono se SUMA y el
// descuento se RESTA del Total a Pagar (igual que "Extra" y "Consumo" respectivamente), sin
// tocar ningún otro cálculo existente (tarifa, IVA, consumo, adelanto, préstamo, siniestro
// siguen exactamente igual que antes de esta función).
function CriterioEfectividadModal(props){
  var criterio=props.criterio, onGuardar=props.onGuardar, onClose=props.onClose;
  var _bonAct=useState(!!criterio.bonoActivo),bonoActivo=_bonAct[0],setBonoActivo=_bonAct[1];
  var _umbBon=useState(criterio.umbralBonoPct!=null?criterio.umbralBonoPct:90),umbralBono=_umbBon[0],setUmbralBono=_umbBon[1];
  var _bon=useState(criterio.bono||0),bono=_bon[0],setBono=_bon[1];
  var _descAct=useState(!!criterio.descuentoActivo),descuentoActivo=_descAct[0],setDescuentoActivo=_descAct[1];
  var _umbDesc=useState(criterio.umbralDescuentoPct!=null?criterio.umbralDescuentoPct:70),umbralDescuento=_umbDesc[0],setUmbralDescuento=_umbDesc[1];
  var _desc=useState(criterio.descuento||0),descuento=_desc[0],setDescuento=_desc[1];

  function guardar(){
    onGuardar({
      bonoActivo:bonoActivo,umbralBonoPct:+umbralBono||0,bono:+bono||0,
      descuentoActivo:descuentoActivo,umbralDescuentoPct:+umbralDescuento||0,descuento:+descuento||0
    });
    onClose();
  }

  return React.createElement('div',{style:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999},onClick:onClose},
    React.createElement('div',{style:{background:'#fff',borderRadius:14,padding:22,width:440,maxWidth:'92vw',maxHeight:'85vh',overflowY:'auto'},onClick:function(e){e.stopPropagation();}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}},
        React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1,color:'var(--dark)'}},'🎯 Pago por Efectividad'),
        React.createElement('button',{onClick:onClose,style:{border:'none',background:'none',fontSize:18,cursor:'pointer',color:'var(--text-soft)'}},'✕')
      ),
      React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:16,lineHeight:1.4}},'El bono se evalúa con la efectividad de TODA la semana (entregados / asignados, sin contar paquetes que aún no salieron a ruta). El descuento se evalúa DÍA POR DÍA: cada día que la efectividad de ese día quede bajo el mínimo, se descuenta el monto configurado por CADA paquete que ese día quedó sin entregar. Ninguno de los dos reemplaza el pago normal por tarifa -- el bono se suma y el descuento se resta del Total a Pagar, igual que "Extra" y "Consumo".'),

      React.createElement('div',{style:{border:'1px solid var(--gold-border)',borderRadius:10,padding:'12px 14px',marginBottom:14,background:'rgba(200,168,75,0.06)'}},
        React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,marginBottom:12}},
          React.createElement('input',{type:'checkbox',checked:bonoActivo,onChange:function(e){setBonoActivo(e.target.checked);},style:{width:16,height:16,cursor:'pointer'}}),
          React.createElement('label',{style:{fontSize:13,fontWeight:700,color:'var(--dark)',cursor:'pointer'},onClick:function(){setBonoActivo(function(v){return !v;});}},'🏆 Bono por buena efectividad')
        ),
        React.createElement('div',{style:{display:'flex',gap:10}},
          React.createElement('div',{style:{flex:1}},
            React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Efectividad mínima (%)'),
            React.createElement('input',{type:'number',min:0,max:100,value:umbralBono,onChange:function(e){setUmbralBono(e.target.value);},onFocus:function(e){e.target.select();},style:{width:'100%',padding:'8px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:13,outline:'none'}})
          ),
          React.createElement('div',{style:{flex:1}},
            React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Bono ($)'),
            React.createElement('input',{type:'number',min:0,value:bono,onChange:function(e){setBono(e.target.value);},onFocus:function(e){e.target.select();},style:{width:'100%',padding:'8px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:13,outline:'none'}})
          )
        ),
        React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginTop:6}},'Se paga si la efectividad llega o supera este %.')
      ),

      React.createElement('div',{style:{border:'1px solid rgba(176,48,48,0.3)',borderRadius:10,padding:'12px 14px',marginBottom:8,background:'rgba(176,48,48,0.05)'}},
        React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,marginBottom:12}},
          React.createElement('input',{type:'checkbox',checked:descuentoActivo,onChange:function(e){setDescuentoActivo(e.target.checked);},style:{width:16,height:16,cursor:'pointer'}}),
          React.createElement('label',{style:{fontSize:13,fontWeight:700,color:'var(--dark)',cursor:'pointer'},onClick:function(){setDescuentoActivo(function(v){return !v;});}},'⚠ Descuento por incumplir efectividad')
        ),
        React.createElement('div',{style:{display:'flex',gap:10}},
          React.createElement('div',{style:{flex:1}},
            React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Efectividad máxima antes de descontar (%)'),
            React.createElement('input',{type:'number',min:0,max:100,value:umbralDescuento,onChange:function(e){setUmbralDescuento(e.target.value);},onFocus:function(e){e.target.select();},style:{width:'100%',padding:'8px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:13,outline:'none'}})
          ),
          React.createElement('div',{style:{flex:1}},
            React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Descuento ($)'),
            React.createElement('input',{type:'number',min:0,value:descuento,onChange:function(e){setDescuento(e.target.value);},onFocus:function(e){e.target.select();},style:{width:'100%',padding:'8px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:13,outline:'none'}})
          )
        ),
        React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginTop:6}},'Por cada día que la efectividad de ESE día quede por debajo de este %, se descuenta este monto MULTIPLICADO por los paquetes que ese día quedaron sin entregar (no un monto único por semana).'),
        (+umbralDescuento>=+umbralBono)&&React.createElement('div',{style:{fontSize:10,color:'var(--danger)',marginTop:4,fontWeight:700}},'⚠ El % del descuento debería ser menor que el % del bono, para dejar una zona neutra entre los dos.')
      ),

      React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',marginBottom:4}},'Al guardar, "Calcular Envíos Semana" vuelve a correr para aplicar los cambios a la semana actual.'),
      React.createElement('div',{style:{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}},
        React.createElement('button',{onClick:onClose,className:'btn-secondary'},'Cancelar'),
        React.createElement('button',{onClick:guardar,className:'btn-futurista btn-f-gold'},'Guardar')
      )
    )
  );
}

// Vista "carnet" por mensajero -- mismos datos y acciones que la tabla de Pagos (Tarifa,
// Extra, Adelanto y Préstamo editables; Consumo y Saldo Pendiente abren sus modales; Estado
// se puede marcar PAGADO/PENDIENTE), pero en formato de tarjeta individual con el mismo
// lenguaje visual que las tarjetas KPI del dashboard (.stat-card). El botón "🎯 Descuentos"
// queda visible pero deshabilitado a propósito -- se habilita cuando estén cargadas las
// reglas de descuento del nuevo reglamento operativo (pendiente de definir con Luis).
function PagosTarjetas(props){
  var pagos=props.pagos, montoPago=props.montoPago, updatePago=props.updatePago,
      marcarEstado=props.marcarEstado,
      setConsumoModal=props.setConsumoModal, setPrestamosModal=props.setPrestamosModal,
      exportarComprobante=props.exportarComprobante, prestamosDB=props.prestamosDB,
      setPenalizacionModal=props.setPenalizacionModal;

  if(pagos.length===0){
    return React.createElement('div',{className:'empty-state'},'Sin resultados');
  }

  function fila(label,valorNode,color){
    return React.createElement('div',{key:label,style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(0,0,0,0.05)'}},
      React.createElement('span',{style:{fontSize:11,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:0.5}},label),
      React.createElement('span',{style:{fontFamily:'JetBrains Mono',fontSize:12,fontWeight:600,color:color||'var(--text-main)'}},valorNode)
    );
  }

  function inputMini(valor,onChange,color){
    return React.createElement('input',{type:'number',value:valor,onChange:onChange,onFocus:function(e){e.target.select();},
      style:{width:80,padding:'3px 6px',background:'var(--cream)',border:'1px solid var(--border)',borderRadius:6,fontFamily:'JetBrains Mono',fontSize:12,textAlign:'right',outline:'none',color:color||'var(--text-main)'}});
  }

  return React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}},
    pagos.map(function(p){
      var m=montoPago(p);
      var key=p.nombre.toUpperCase().trim();
      var saldoPrestamo=(prestamosDB[key]&&prestamosDB[key].saldo)||0;
      var pagado=p.estado==='PAGADO';

      return React.createElement('div',{key:p.id,className:'stat-card',style:{'--card-accent':pagado?'#2e7d4f':'#C8A84B',borderTop:'4px solid '+(pagado?'#2e7d4f':'#C8A84B'),padding:'18px 18px 14px'}},
        // Encabezado: nombre + estado
        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,gap:8}},
          React.createElement('div',{style:{fontWeight:800,fontSize:15,lineHeight:1.25}},p.nombre.replace(/,\s*/g,' ')),
          React.createElement('button',{
            onClick:function(){marcarEstado(p);},
            style:{padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,whiteSpace:'nowrap',
              background:pagado?'rgba(46,125,79,0.15)':'rgba(200,168,75,0.15)',
              color:pagado?'var(--success)':'var(--gold)'}
          },pagado?'✓ PAGADO':'PENDIENTE')
        ),
        // Envíos + efectividad
        React.createElement('div',{style:{display:'flex',gap:14,marginBottom:12,fontSize:11,color:'var(--text-soft)',flexWrap:'wrap'}},
          React.createElement('span',null,p.envios,' envíos'),
          p.efectividad!=null&&React.createElement('span',{style:{color:p.efectividad>=0.95?'var(--success)':'var(--danger)',fontWeight:700}},(p.efectividad*100).toFixed(1),'% efectividad')
        ),
        // Detalle
        React.createElement('div',{style:{marginBottom:10}},
          fila('Tarifa',inputMini(p.tarifa,function(e){updatePago(p.id,'tarifa',e.target.value);})),
          fila('Pago Calc.','$'+Math.round(p.bruto).toLocaleString('es-CL'),'var(--success)'),
          fila('Consumo',React.createElement('span',{style:{cursor:'pointer'},onClick:function(){setConsumoModal(p);},title:'Clic para editar consumo'},'$'+Math.round(p.consumo||0).toLocaleString('es-CL')+' ✎'),'var(--danger)'),
          fila('Siniestro','$'+Math.round(p.descSiniestro||0).toLocaleString('es-CL'),'#C62828'),
          fila('Extra',inputMini(p.extra,function(e){updatePago(p.id,'extra',e.target.value);}),'#2980b9'),
          (p.bonoEfectividad||0)>0?fila('Bono Efect.','$'+Math.round(p.bonoEfectividad).toLocaleString('es-CL'),'#7a6ba8'):null,
          (p.descuentoEfectividad||0)>0?fila('Desc. Efect.','$'+Math.round(p.descuentoEfectividad).toLocaleString('es-CL')+' ('+(p.paquetesNoEntregadosEfectividad||0)+' paq. en '+(p.diasBajoEfectividad||0)+' día'+(p.diasBajoEfectividad===1?'':'s')+')','var(--danger)'):null,
          (p.penalizacion||0)>0?fila('Penalización','-'+(p.penalizaciones||[]).reduce(function(a,x){return a+(x.envios||0);},0)+' env. ($'+Math.round(p.penalizacion).toLocaleString('es-CL')+')','var(--danger)'):null,
          fila('Adelanto',inputMini(p.adelanto,function(e){updatePago(p.id,'adelanto',e.target.value);}),'#e67e22'),
          fila('Préstamo',inputMini(p.prestamo,function(e){updatePago(p.id,'prestamo',e.target.value);}),'#c0392b'),
          saldoPrestamo>0?fila('Saldo Pend.',React.createElement('span',{style:{cursor:'pointer'},onClick:function(){setPrestamosModal(p.nombre);},title:'Ver historial de préstamos'},'$'+Math.round(saldoPrestamo).toLocaleString('es-CL')),'#c0392b'):null
        ),
        // Nota
        React.createElement('input',{type:'text',placeholder:'Nota...',value:p.obs||'',onChange:function(e){updatePago(p.id,'obs',e.target.value);},
          style:{width:'100%',padding:'6px 10px',borderRadius:6,border:'1px solid var(--border)',fontSize:11,outline:'none',marginBottom:12,boxSizing:'border-box'}}),
        // Total a pagar
        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderTop:'1px solid var(--border)',marginBottom:10}},
          React.createElement('span',{style:{fontSize:11,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:0.5,fontWeight:700}},'Total a Pagar'),
          React.createElement('span',{style:{fontFamily:'JetBrains Mono',fontSize:16,fontWeight:800,color:m.total>=0?'var(--success)':'var(--danger)'}},'$'+Math.round(m.total).toLocaleString('es-CL'))
        ),
        // Acciones
        React.createElement('div',{style:{display:'flex',gap:8}},
          React.createElement('button',{onClick:function(){exportarComprobante(p);},
            style:{flex:1,padding:'8px',borderRadius:8,border:'1px solid var(--border)',background:'var(--cream)',color:'var(--text-main)',fontSize:11,cursor:'pointer',fontWeight:600}
          },'🧾 Comprobante'),
          React.createElement('button',{
            onClick:function(){setPenalizacionModal(p);},
            title:'Aplicar descuento por falta según el Reglamento Operativo',
            style:{flex:1,padding:'8px',borderRadius:8,border:'1px solid rgba(176,48,48,0.35)',background:'rgba(176,48,48,0.06)',color:'var(--danger)',fontSize:11,cursor:'pointer',fontWeight:600}
          },'🎯 Descuentos')
        )
      );
    })
  );
}

function PagosMensajeros(_ref18){let mensajeros=_ref18.mensajeros,mensajerosDia=_ref18.mensajerosDia,esAdmin=_ref18.esAdmin,toast=_ref18.toast,clientes=_ref18.clientes||[];
// Permisos GRANULARES dentro de "Pagos y Cobros": antes era un único interruptor (todo o nada),
// asi que para que un rol viera la Planilla de Retiros (que usan a diario) tambien quedaba
// viendo la tabla de Pagos con montos, adelantos y prestamos de cada mensajero -- informacion
// que Luis no quiere que Admin (a diferencia de Super Admin) tenga por que ver. Ahora cada
// pestaña interna (Pagos/Retiros/Productos/Consumo/Historial) tiene su propio permiso; si no
// llega la prop (por compatibilidad con algún llamado viejo) se asume acceso total, igual que
// el comportamiento de siempre.
var pp=_ref18.permisosPago||{pagos:true,retiros:true,productos:true,consumo:true,historial:true};
var TABS_PAGOS=[{val:'pagos',label:'Pagos'},{val:'retiros',label:'Planilla Retiros'},{val:'productos',label:'Productos'},{val:'consumo',label:'Consumo Diario'},{val:'historial',label:'Historial'}];
var tabsVisibles=TABS_PAGOS.filter(function(t){return pp[t.val]!==false;});
const semanaActual=()=>{const hoy=new Date();const lunes=new Date(hoy);lunes.setDate(hoy.getDate()-((hoy.getDay()+6)%7));const sabado=new Date(lunes);sabado.setDate(lunes.getDate()+5);const fmt=d=>d.toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'});return`${fmt(lunes)} al ${fmt(sabado)}`;};const _useState34=useState(semanaActual()),semana=_useState34[0],setSemana=_useState34[1];

// Fechas de rango para calcular envíos

var _fi=React.useState(()=>{var h=new Date();var lu=new Date(h);lu.setDate(h.getDate()-((h.getDay()+6)%7));return fechaHoyCL(lu);});

var fechaInicio=_fi[0];var setFechaInicio=_fi[1];

var _ff=React.useState(()=>{var h=new Date();var lu=new Date(h);lu.setDate(h.getDate()-((h.getDay()+6)%7));var sa=new Date(lu);sa.setDate(lu.getDate()+5);return fechaHoyCL(sa);});

var fechaFin=_ff[0];var setFechaFin=_ff[1];

var _calc=React.useState(false);var calculando=_calc[0];var setCalculando=_calc[1];

var _prDB=React.useState({});var prestamosDB=_prDB[0];var setPrestamosDB=_prDB[1];

var _prMod=React.useState(null);var prestamosModal=_prMod[0];var setPrestamosModal=_prMod[1];

React.useEffect(function(){

  db.from('prestamos_mensajeros').select('*').gt('saldo_pendiente',0)

    .order('updated_at',{ascending:false})

    .then(function(r){

      if(!r.data)return;

      var mapa={};

      r.data.forEach(function(row){

        var key=row.mensajero_nombre.toUpperCase().trim();

        if(!mapa[key]||new Date(row.updated_at)>new Date(mapa[key].updated_at))

          mapa[key]={saldo:row.saldo_pendiente,updated_at:row.updated_at};

      });

      setPrestamosDB(mapa);

    });

},[]);

async function cerrarSemana(){

  if(!confirm('¿Guardar ahora mismo el cierre de la semana '+semana+'?\nEsto ya se guarda solo automáticamente, este botón solo lo fuerza al instante.'))return;

  toast('💾 Guardando cierre semanal...');

  try{

    await autoGuardarCierreSemanal();

    toast('✓ Semana '+semana+' guardada correctamente');

  }catch(e){toast('⚠ Error: '+e.message);}

}

async function guardarPrestamo(nombre,montoDesc,saldoPrev,sem){

  var nuevoSaldo=Math.max(0,saldoPrev-montoDesc);

  try{

    await db.from('prestamos_mensajeros').insert({

      mensajero_nombre:nombre,semana:sem,monto_prestado:0,

      monto_descontado:montoDesc,saldo_pendiente:nuevoSaldo,nota:'Descuento '+sem

    });

    setPrestamosDB(function(prev){

      var n=Object.assign({},prev);

      n[nombre.toUpperCase().trim()]={saldo:nuevoSaldo,updated_at:new Date().toISOString()};

      return n;

    });

  }catch(e){console.warn(e);}

  return nuevoSaldo;

}

// Antes el descuento del préstamo al marcar PAGADO solo estaba conectado en UNA de las tres
// formas de cambiar el estado de un pago (el botón dentro del detalle de una tarjeta KPI) --
// el <select> de la tabla principal y el botón de la vista de Tarjetas cambiaban el estado
// pero jamás avisaban a prestamos_mensajeros, así que el saldo del mensajero nunca bajaba salvo
// que el admin usara justo esa pantalla puntual. Ahora las tres pasan por esta única función.
// prestamoDescontado marca si ESTE pago ya aplicó su descuento, para que alternar
// PAGADO/PENDIENTE varias veces no vuelva a restar el mismo monto del saldo cada vez.
async function marcarEstado(p,nuevoEstadoForzado){
  const nuevoEstado=nuevoEstadoForzado||(p.estado==='PAGADO'?'PENDIENTE':'PAGADO');
  updatePago(p.id,'estado',nuevoEstado);
  if(nuevoEstado==='PAGADO'&&p.prestamo>0&&!p.prestamoDescontado){
    const key=p.nombre.toUpperCase().trim();
    const saldoAnterior=(prestamosDB[key]&&prestamosDB[key].saldo)||p.prestamo;
    await guardarPrestamo(p.nombre,p.prestamo,saldoAnterior,semana);
    updatePago(p.id,'prestamoDescontado',true);
    toast&&toast('💾 Saldo préstamo actualizado: $'+Math.max(0,saldoAnterior-p.prestamo).toLocaleString('es-CL'));
  }
}

const _usePagosTab=useState(()=>window._pagosTab||'pagos'),pagosTab=_usePagosTab[0],setPagosTab=_usePagosTab[1];

React.useEffect(()=>{window._pagosTab=pagosTab;},[pagosTab]);

// Si el rol no tiene permiso para la pestaña activa (recien entra, o un Super Admin le acaba
// de quitar el permiso mientras la tenia abierta), lo manda a la primera pestaña que SI puede
// ver -- asi nunca queda "atascado" en una pestaña sin acceso ni ve por un instante contenido
// que no deberia.
React.useEffect(()=>{
  if(tabsVisibles.length===0)return;
  if(!tabsVisibles.some(function(t){return t.val===pagosTab;}))setPagosTab(tabsVisibles[0].val);
},[pp.pagos,pp.retiros,pp.productos,pp.consumo,pp.historial]);

const _useRetiros=useState([]),retirosDB=_useRetiros[0],setRetirosDB=_useRetiros[1];

const _useProds=useState(()=>lsLoad('productos_local',[{id:1,nombre:'Almuerzo',precio:3500,activo:true},{id:2,nombre:'Cafe',precio:800,activo:true},{id:3,nombre:'Cinta embalaje',precio:1200,activo:true}])),productosLocal=_useProds[0],setProductosLocal=_useProds[1];

const _prodsCargado=useRef(false);

React.useEffect(()=>{

  (async()=>{

    try{

      const{data}=await db.from('configuracion').select('valor').eq('clave','productos_venta').maybeSingle();

      if(data&&Array.isArray(data.valor)&&data.valor.length>0)setProductosLocal(data.valor);

    }catch(e){}

    _prodsCargado.current=true;

  })();

},[]);

// Criterio de pago por efectividad: mismo patrón de carga/guardado que 'productos_venta' arriba,
// solo que en la clave 'criterio_pago_efectividad' de la tabla genérica 'configuracion'.
const CRITERIO_EF_DEFAULT={bonoActivo:false,umbralBonoPct:90,bono:0,descuentoActivo:false,umbralDescuentoPct:70,descuento:0};
const _useCriterioEf=useState(CRITERIO_EF_DEFAULT),criterioEf=_useCriterioEf[0],setCriterioEf=_useCriterioEf[1];
const _criterioEfCargado=useRef(false);
React.useEffect(()=>{
  (async()=>{
    try{
      const{data}=await db.from('configuracion').select('valor').eq('clave','criterio_pago_efectividad').maybeSingle();
      if(data&&data.valor&&typeof data.valor==='object'){
        var v=data.valor;
        // Compatibilidad con la forma anterior (solo bono, sin descuento): {activo,umbralPct,bono}
        // -- si ya existe un guardado viejo, se migra a los campos nuevos en vez de perderlo.
        var migrado=('bonoActivo' in v)?v:Object.assign({},v,{
          bonoActivo:v.activo!=null?v.activo:CRITERIO_EF_DEFAULT.bonoActivo,
          umbralBonoPct:v.umbralPct!=null?v.umbralPct:CRITERIO_EF_DEFAULT.umbralBonoPct
        });
        setCriterioEf(Object.assign({},CRITERIO_EF_DEFAULT,migrado));
      }
    }catch(e){}
    _criterioEfCargado.current=true;
  })();
},[]);
React.useEffect(()=>{
  if(!_criterioEfCargado.current)return;
  const t=setTimeout(()=>{
    db.from('configuracion').upsert({clave:'criterio_pago_efectividad',valor:criterioEf,updated_at:new Date().toISOString()},{onConflict:'clave'}).then(function(r){if(r&&r.error)console.warn('Criterio pago efectividad: error guardando en Supabase:',r.error.message);});
  },500);
  return()=>clearTimeout(t);
},[criterioEf]);
// Recalcular automáticamente cuando el criterio termina de cargar (por si ya estaba activo
// antes de que este componente se montara) y cada vez que el admin lo guarda desde el modal --
// así el bono/descuento quedan aplicados sin que haga falta apretar "Calcular"/"Recalcular" a mano.
React.useEffect(()=>{
  if(!_criterioEfCargado.current)return;
  if(!_pagosCargados.current)return;
  if((criterioEf.bonoActivo||criterioEf.descuentoActivo)&&fechaInicio&&fechaFin)calcularEnviosSemana();
},[criterioEf.bonoActivo,criterioEf.umbralBonoPct,criterioEf.bono,criterioEf.descuentoActivo,criterioEf.umbralDescuentoPct,criterioEf.descuento]);
const _useCriterioModal=useState(false),criterioModalAbierto=_useCriterioModal[0],setCriterioModalAbierto=_useCriterioModal[1];
// Vista previa (solo en pantalla, no toca nada guardado ni recalcula en Supabase): permite
// ver de un click cómo quedarían los montos SIN aplicar el bono/descuento por efectividad,
// para comparar contra lo que se está aplicando de verdad. No modifica criterioEf.
const _useVistaPrevia=useState(false),vistaPreviaSinCriterio=_useVistaPrevia[0],setVistaPreviaSinCriterio=_useVistaPrevia[1];

const [consumoDetalle,setConsumoDetalle]=useState({});

const _useRetiroFecha=useState(fechaHoyCL()),retiroFecha=_useRetiroFecha[0],setRetiroFecha=_useRetiroFecha[1];

const _useConsumoModal=useState(null),consumoModal=_useConsumoModal[0],setConsumoModal=_useConsumoModal[1];
const _usePenalizacionModal=useState(null),penalizacionModal=_usePenalizacionModal[0],setPenalizacionModal=_usePenalizacionModal[1];

const _useExpandido=useState({}),expandido=_useExpandido[0],setExpandido=_useExpandido[1];

/* Nota: la carga de retiros del dia para esta pantalla la hace PlanillaRetiros (con tiempo real

   + polling contra la tabla retiros). Antes habia aca un efecto duplicado que leia

   retiros_planilla_+fecha de localStorage y, si encontraba algo, jamas consultaba Supabase

   (cortaba con un return temprano) ademas de una confirmacion/cobro por cliente que se

   guardaba solo en el dispositivo y nunca se leia en ninguna pantalla. Se elimino: no aportaba

   datos reales y competia por pisar retirosDB con una copia local vieja. */const _useState35=useState(fechaHoyCL()),fechaPago=_useState35[0],setFechaPago=_useState35[1];const _useState36=useState(null),verComprobante=_useState36[0],setVerComprobante=_useState36[1];const _useState38=useState(null),pagosFiltro=_useState38[0],setPagosFiltro=_useState38[1];const buildPagos=()=>{

  // Calcular desde envíos reales del sistema (lunes a sábado de la semana actual)

  const hoy=new Date();

  const lunes=new Date(hoy); lunes.setDate(hoy.getDate()-((hoy.getDay()+6)%7)); lunes.setHours(0,0,0,0);

  const domingo=new Date(lunes); domingo.setDate(lunes.getDate()+6); domingo.setHours(23,59,59,999);

  const lunesStr=fechaHoyCL(lunes);

  const domingoStr=fechaHoyCL(domingo);

  // Leer envíos locales

  const enviosLocal=lsLoad('gestion_envios',[]);

  const enviosSemana=enviosLocal.filter(e=>{

    // Fecha de entrega real desde historial

    let fechaEnt=e.fecha;

    if(e.historial&&e.historial.length>0){

      const h=[...e.historial].reverse().find(x=>x.estado==='entregado');

      if(h)fechaEnt=(h.fecha||'').slice(0,10);

    }

    return e.estado==='entregado'&&fechaEnt>=lunesStr&&fechaEnt<=domingoStr;

  });

  // Agrupar por mensajero

  const menMap={};

  mensajeros.forEach(m=>{menMap[m.nombre]={nombre:m.nombre,tarifa:m.tarifa||1200,tarifaRetiro:m.tarifaRetiro||500,envios:0,retiros:0};});

  enviosSemana.forEach(e=>{

    const n=(e.mensajero||'').trim().toUpperCase();

    if(!n)return;

    if(!menMap[n])menMap[n]={nombre:n,tarifa:1200,tarifaRetiro:500,envios:0,retiros:0};

    menMap[n].envios++;

  });

  // Agregar mensajeros activos que no tienen envíos esta semana

  mensajeros.filter(m=>m.activo!==false&&m.activo!=='paused').forEach(m=>{

    if(!menMap[m.nombre])menMap[m.nombre]={nombre:m.nombre,tarifa:m.tarifa||1200,tarifaRetiro:m.tarifaRetiro||500,envios:0,retiros:0};

  });

  return Object.values(menMap).filter(m=>m.nombre&&m.nombre.trim()).map((m,i)=>{

    const tarifa=m.tarifa||1200;

    const bruto=m.envios*tarifa;

    const savedPago=lsLoad('pagos_semana',[]).find(p=>p.nombre===m.nombre)||{};

    return{id:i+1,nombre:m.nombre,envios:m.envios,tarifa,bruto,ajuste:0,iva:0,tipoIVA:'ninguno',totalBruto:bruto,adelanto:0,extra:savedPago.extra||0,prestamo:0,consumo:savedPago.consumo||0,descSiniestro:savedPago.descSiniestro||0,totalPagar:bruto+(savedPago.extra||0)-(savedPago.consumo||0)-(savedPago.descSiniestro||0),estado:savedPago.estado||'PENDIENTE',obs:savedPago.obs||''};

  });

};const _useState40=useState(()=>{

  const saved=lsLoad('pagos_semana',[]);

  // Cruzar con mensajeros actuales para actualizar nombres y tarifas

  if(saved.length>0){

    // Construir mapa de mensajeros actuales por nombre normalizado

    const menMapActual={};

    mensajeros.forEach(m=>{

      // Indexar por nombre normalizado (sin comas, uppercase)

      const key=m.nombre.replace(/,\s*/g,' ').toUpperCase().trim();

      menMapActual[key]=m;

    });

    // Actualizar cada pago con datos actuales del mensajero

    // Filtrar pausados del saved

    const activosNombres=new Set(mensajeros.filter(m=>m.activo!==false&&m.activo!=='paused').map(m=>m.nombre.replace(/,\s*/g,' ').toUpperCase().trim()));

    const savedActivos=saved.filter(p=>activosNombres.has(p.nombre.replace(/,\s*/g,' ').toUpperCase().trim())||!menMapActual[p.nombre.replace(/,\s*/g,' ').toUpperCase().trim()]);

    const updated=savedActivos.map(p=>{

      const keyP=p.nombre.replace(/,\s*/g,' ').toUpperCase().trim();

      const menActual=menMapActual[keyP];

      if(menActual){

        const tarifa=menActual.tarifa||p.tarifa||1200;

        // Respetar tarifas por comuna si quedaron guardadas (ver calcularEnviosSemana)

        let bruto;

        if(p.enviosPorComuna && Object.keys(p.enviosPorComuna).length>0){

          bruto=Object.keys(p.enviosPorComuna).reduce((sum,com)=>{

            const tar=(p.tarsCom&&p.tarsCom[com]!==undefined)?p.tarsCom[com]:tarifa;

            return sum+(p.enviosPorComuna[com]*tar);

          },0);

        } else {

          bruto=p.envios*tarifa;

        }

        const totalBruto=bruto+(p.ajuste||0)-(p.iva||0);

        const totalPagar=totalBruto+(p.extra||0)+(p.bonoEfectividad||0)-(p.descuentoEfectividad||0)-(p.adelanto||0)-(p.prestamo||0)-(p.consumo||0)-(p.descSiniestro||0)-(p.penalizacion||0);

        return{...p,nombre:menActual.nombre,tarifa,bruto,totalBruto,totalPagar};

      }

      return p;

    });

    // Agregar mensajeros nuevos que no estaban en pagos guardados

    const savedNames=new Set(updated.map(p=>p.nombre.replace(/,\s*/g,' ').toUpperCase().trim()));

    const nuevos=mensajeros.filter(m=>m.activo!==false&&!savedNames.has(m.nombre.replace(/,\s*/g,' ').toUpperCase().trim()))

      .map((m,i)=>({id:Date.now()+i,nombre:m.nombre,envios:0,tarifa:m.tarifa||1200,bruto:0,ajuste:0,iva:0,tipoIVA:'ninguno',totalBruto:0,adelanto:0,extra:0,prestamo:0,consumo:0,descSiniestro:0,penalizacion:0,totalPagar:0,estado:'PENDIENTE',obs:''}));

    return updated.concat(nuevos);

  }

  return buildPagos();

}),pagos=_useState40[0],setPagos=_useState40[1];useEffect(()=>{lsSave('pagos_semana',pagos);},[pagos]);
// Barra de filtro/orden de la tabla principal de pagos: buscar por nombre y ordenar A-Z / Z-A
// por mensajero. Solo afecta qué filas se muestran y en qué orden — la fila de TOTALES sigue
// sumando TODOS los pagos de la semana, filtrados o no, para que nunca se lea como si el total
// mostrado fuera parcial.
const _useStatePagosBusqueda=useState(''),pagosBusqueda=_useStatePagosBusqueda[0],setPagosBusqueda=_useStatePagosBusqueda[1];
const _useStatePagosOrden=useState(null),pagosOrden=_useStatePagosOrden[0],setPagosOrden=_useStatePagosOrden[1];
const _useStatePagosVista=useState('tabla'),pagosVista=_useStatePagosVista[0],setPagosVista=_useStatePagosVista[1];
const pagosMostrados=React.useMemo(()=>{
  let arr=pagos;
  if(pagosBusqueda&&pagosBusqueda.trim()){
    const q=pagosBusqueda.trim().toUpperCase();
    arr=arr.filter(p=>p.nombre.toUpperCase().includes(q));
  }
  if(pagosOrden==='asc')arr=[...arr].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  else if(pagosOrden==='desc')arr=[...arr].sort((a,b)=>b.nombre.localeCompare(a.nombre,'es'));
  return arr;
},[pagos,pagosBusqueda,pagosOrden]);

// Consumo: consumos_mensajeros es la única fuente de verdad (cada ítem que se agrega, desde
// donde sea -- el modal de un mensajero puntual en la tabla de Pagos, o la pantalla nueva
// "Consumo Diario" que lista a todos-- queda ahí con su fecha real). Antes la columna Consumo
// de la tabla de Pagos solo se refrescaba para UN mensajero cuando el admin abría SU modal
// puntual; si el consumo se cargaba desde otro lado sin pasar por ese modal, la tabla se veía
// desactualizada hasta que alguien lo abriera. Con esto se recalculan los totales de TODOS
// los mensajeros apenas cambia algo en consumos_mensajeros (alta o baja, desde cualquier
// pantalla), en tiempo real vía Supabase Realtime -- así "Consumo Diario" y la columna
// Consumo de Pagos siempre muestran el mismo número, sin que quede nada "en el aire".
function sincronizarConsumoDesdeDB(sem){
  if(!sem)return;
  db.from('consumos_mensajeros').select('mensajero_nombre,monto').eq('semana',sem).then(function(r){
    if(!r||!r.data)return;
    var totales={};
    r.data.forEach(function(row){
      var k=(row.mensajero_nombre||'').toUpperCase().replace(/,\s*/g,' ').replace(/\s+/g,' ').trim();
      totales[k]=(totales[k]||0)+(parseFloat(row.monto)||0);
    });
    setPagos(function(prev){
      var cambio=false;
      var next=prev.map(function(p){
        var k=p.nombre.toUpperCase().replace(/,\s*/g,' ').replace(/\s+/g,' ').trim();
        var nuevoConsumo=totales[k]||0;
        if(Math.abs(nuevoConsumo-(p.consumo||0))<0.5)return p;
        cambio=true;
        var totalPagar=p.totalBruto+(p.extra||0)+(p.bonoEfectividad||0)-(p.descuentoEfectividad||0)-(p.adelanto||0)-(p.prestamo||0)-nuevoConsumo-(p.descSiniestro||0)-(p.penalizacion||0);
        return Object.assign({},p,{consumo:nuevoConsumo,totalPagar:totalPagar});
      });
      return cambio?next:prev;
    });
  });
}
React.useEffect(function(){
  sincronizarConsumoDesdeDB(semana);
  var canalKey='consumo-mensajeros-'+semana.replace(/[^a-zA-Z0-9]/g,'');
  var canal=db.channel(canalKey).on('postgres_changes',{event:'*',schema:'public',table:'consumos_mensajeros',filter:'semana=eq.'+semana},function(){sincronizarConsumoDesdeDB(semana);}).subscribe();
  return function(){db.removeChannel(canal);};
},[semana]);

// ── Respaldo en Supabase de Pago Mensajeros (mismo patrón que Cierre de Mes) ──

const _pagosCargados=useRef(false);

const _usePagosListos=useState(false),pagosListos=_usePagosListos[0],setPagosListos=_usePagosListos[1];

useEffect(()=>{

  let cancelado=false;

  _pagosCargados.current=false;

  setPagosListos(false);

  (async()=>{

    let intentos=0;

    let logrado=false;

    while(intentos<4&&!cancelado&&!logrado){

      try{

        const{data,error}=await db.from('pagos_mensajeros_semanales').select('data').eq('semana',semana).single();

        if(error&&error.code!=='PGRST116'){

          // Error de red/timeout (no es simplemente "no existe todavia esta semana"): reintentar

          intentos++;

          if(intentos<4){await new Promise(r=>setTimeout(r,800));continue;}

        }

        if(!cancelado&&!error&&data&&data.data&&Array.isArray(data.data.pagos)&&data.data.pagos.length>0){

          // Respetar el bruto guardado tal cual: puede venir de un calculo por tarifa

          // de comuna (calcularEnviosSemana), que es mas especifico que envios*tarifa plana.

          setPagos(data.data.pagos);

        }

        logrado=true;

      }catch(e){

        console.warn('Pago Mensajeros: error cargando desde Supabase (intento '+(intentos+1)+'):',e.message);

        intentos++;

        if(intentos<4)await new Promise(r=>setTimeout(r,800));

      }

    }

    _pagosCargados.current=true;

    if(!cancelado)setPagosListos(true);

    // Auto-cálculo: apenas se termina de cargar el respaldo de esta semana,

    // se recalcula automáticamente contra los envíos reales (mismo cálculo que

    // el botón "Calcular"), así el admin nunca ve un número viejo/desactualizado

    // sin tener que acordarse de apretar un botón. Los botones Calcular/Recalcular

    // quedan disponibles como respaldo manual (ej. después de importar Excel o

    // cambiar el roster de mensajeros activos).

    if(!cancelado&&fechaInicio&&fechaFin){

      calcularEnviosSemana();

    }

  })();

  return()=>{cancelado=true;};

},[semana]);

// Trae los descuentos por siniestro ya marcados para esta semana (sección Siniestros) y los
// suma dentro de cada pago (mismo criterio que 'consumo'), recalculando el total a pagar. No
// escribe nada de vuelta a la tabla 'siniestros' -- ese registro es de solo lectura desde acá.
useEffect(()=>{
  if(!_pagosCargados.current)return;
  const normNomSin=n=>(n||'').replace(/,\s*/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
  db.from('siniestros').select('mensajero,descontado_mensajero_valor').eq('descontado_mensajero_semana',semana).eq('descontado_mensajero',true).then(function(r){
    if(r.error){console.warn('Error cargando descuentos de siniestro:',r.error.message);return;}
    const sumaPorMensajero={};
    (r.data||[]).forEach(function(s){
      const key=normNomSin(s.mensajero);
      if(!key)return;
      sumaPorMensajero[key]=(sumaPorMensajero[key]||0)+(parseFloat(s.descontado_mensajero_valor)||0);
    });
    setPagos(prev=>prev.map(p=>{
      const nuevoDesc=sumaPorMensajero[normNomSin(p.nombre)]||0;
      if((p.descSiniestro||0)===nuevoDesc)return p;
      const updated={...p,descSiniestro:nuevoDesc};
      updated.totalPagar=updated.totalBruto+(updated.extra||0)+(updated.bonoEfectividad||0)-(updated.descuentoEfectividad||0)-(updated.adelanto||0)-(updated.prestamo||0)-(updated.consumo||0)-(updated.descSiniestro||0)-(updated.penalizacion||0);
      return updated;
    }));
  }).catch(function(e){console.warn('Error cargando descuentos de siniestro:',e.message);});
},[semana,_pagosCargados.current]);

useEffect(()=>{

  if(!_pagosCargados.current)return; // no pisar Supabase con datos vacíos antes de terminar de cargar

  const t=setTimeout(()=>{

    db.from('pagos_mensajeros_semanales').upsert({semana,data:{pagos,fechaPago},updated_at:new Date().toISOString()},{onConflict:'semana'}).then(function(r){if(r.error)console.warn('Pago Mensajeros: error guardando en Supabase:',r.error.message);});

    autoGuardarCierreSemanal();

  },2500);

  return()=>clearTimeout(t);

},[semana,pagos,fechaPago]);

async function autoGuardarCierreSemanal(){

  if(!pagos||pagos.length===0)return;

  try{

    // Borra lo que ya había guardado de esta semana y vuelve a insertar fresco (evita duplicados al repetirse)

    await db.from('cierres_semanales').delete().eq('semana',semana);

    var records=pagos.map(function(p){

      var key=p.nombre.toUpperCase().trim();

      var saldoDB=(prestamosDB[key]&&prestamosDB[key].saldo)||0;

      return{

        semana:semana,

        fecha_inicio:fechaInicio||null,

        fecha_fin:fechaFin||null,

        fecha_cierre:new Date().toISOString(),

        mensajero_nombre:p.nombre,

        envios:p.envios||0,

        tarifa:p.tarifa||0,

        pago_bruto:p.bruto||0,

        consumo:p.consumo||0,

        extra:p.extra||0,

        asignados:p.asignados!=null?p.asignados:null,

        efectividad_pct:p.efectividad!=null?Math.round(p.efectividad*1000)/10:null,

        bono_efectividad:p.bonoEfectividad||0,

        descuento_efectividad:p.descuentoEfectividad||0,

        adelanto:p.adelanto||0,

        prestamo_descontado:p.prestamo||0,

        saldo_prestamo:saldoDB,

        total_pagado:p.totalPagar||0,

        estado:p.estado||'PENDIENTE',

        obs:p.obs||''

      };

    });

    await db.from('cierres_semanales').insert(records);

  }catch(e){console.warn('Auto-cierre semanal: error guardando:',e.message);}

}

useEffect(()=>{try{localStorage.setItem('transpgso_v2_productos_local',JSON.stringify(productosLocal));}catch(e){};},[productosLocal]);

useEffect(()=>{if(!_prodsCargado.current)return;const t=setTimeout(()=>{db.from('configuracion').upsert({clave:'productos_venta',valor:productosLocal,updated_at:new Date().toISOString()},{onConflict:'clave'}).then(function(r){if(r&&r.error)console.warn('Productos venta: error guardando en Supabase:',r.error.message);});},1000);return()=>clearTimeout(t);},[productosLocal]);

useEffect(()=>{

  // Si no hay pagos guardados y hay mensajeros, construir

  if(pagos.length===0&&mensajeros.length>0){

    const built=buildPagos();

    if(built.length>0)setPagos(built);

  }

  // SIEMPRE sincronizar tarifas desde Supabase cuando cambian los mensajeros

  if(mensajeros.length>0&&pagos.length>0){

    const normNom=n=>(n||'').replace(/,\s*/g,' ').replace(/\s+/g,' ').trim().toUpperCase();

    const tarifaMap={};

    mensajeros.forEach(m=>{tarifaMap[normNom(m.nombre)]=m.tarifa||1200;});

    setPagos(prev=>prev.map(p=>{

      const tarifaActual=tarifaMap[normNom(p.nombre)]||p.tarifa||1200;

      if(tarifaActual===p.tarifa)return p; // sin cambio de tarifa base: no tocar bruto (puede venir de tarifa por comuna)

      // Solo si la tarifa BASE realmente cambio, actualizamos tarifa mostrada.

      // El bruto/total NO se recalcula aca para no pisar un calculo por comuna ya hecho;

      // el admin debe usar 'Calcular Envios Semana' para refrescar el monto real.

      return{...p,tarifa:tarifaActual};

    }));

  }

},[mensajeros,pagos.length]);useEffect(()=>{if(mensajerosDia.length>0){const normNom2=n=>(n||'').replace(/,\s*/g,' ').replace(/\s+/g,' ').trim().toUpperCase();const tarifaMap={};mensajeros.forEach(m=>{tarifaMap[normNom2(m.nombre)]=m.tarifa||1200;});setPagos(prev=>{const prevMap={};prev.forEach(p=>{prevMap[normNom2(p.nombre)]=p;});return mensajerosDia.filter(m=>m.total>0).map((m,i)=>{const tarifa=tarifaMap[normNom2(m.nombre)]||1200;const bruto=m.entregados*tarifa;const existing=prevMap[normNom2(m.nombre)];if(existing)return{...existing,envios:m.entregados};return{id:m.id||i,nombre:m.nombre,envios:m.entregados,tarifa,bruto,ajuste:0,iva:0,totalBruto:bruto,adelanto:0,extra:0,prestamo:0,consumo:0,descSiniestro:0,penalizacion:0,totalPagar:bruto,estado:'PENDIENTE',obs:''};});});}},[mensajerosDia]);function updatePago(id,field,val){setPagos(prev=>prev.map(p=>{if(p.id!==id)return p;const strFields=['estado','obs','tipoIVA','prestamoDescontado'];const updated={...p,[field]:strFields.includes(field)?val:+val};if(field==='tipoIVA'){if(val==='ninguno'){updated.iva=0;}else if(val==='manual'){}else{const rate=val==='honorarios'?0.1525:val==='factura'?0.19:0;updated.iva=Math.round(updated.bruto*rate/(1+rate));}}if(field==='tarifa'){updated.bruto=updated.envios*+val;const rate=updated.tipoIVA==='honorarios'?0.1525:updated.tipoIVA==='factura'?0.19:0;if(rate>0)updated.iva=Math.round(updated.bruto*rate/(1+rate));}if(!strFields.includes(field)){updated.totalBruto=updated.bruto+updated.ajuste-updated.iva;updated.totalPagar=updated.totalBruto+updated.extra+(updated.bonoEfectividad||0)-(updated.descuentoEfectividad||0)-updated.adelanto-updated.prestamo-updated.consumo-(updated.descSiniestro||0)-(updated.penalizacion||0);}if(field==='tipoIVA'){updated.totalBruto=updated.bruto+updated.ajuste-updated.iva;updated.totalPagar=updated.totalBruto+updated.extra+(updated.bonoEfectividad||0)-(updated.descuentoEfectividad||0)-updated.adelanto-updated.prestamo-updated.consumo-(updated.descSiniestro||0)-(updated.penalizacion||0);}return updated;}));}function aplicarPenalizacion(pagoId,item){
  setPagos(function(prev){
    return prev.map(function(p){
      if(p.id!==pagoId)return p;
      var lista=(p.penalizaciones||[]).concat([item]);
      var totalPenal=lista.reduce(function(a,x){return a+(x.monto||0);},0);
      var updated=Object.assign({},p,{penalizaciones:lista,penalizacion:totalPenal});
      updated.totalPagar=updated.totalBruto+(updated.extra||0)+(updated.bonoEfectividad||0)-(updated.descuentoEfectividad||0)-(updated.adelanto||0)-(updated.prestamo||0)-(updated.consumo||0)-(updated.descSiniestro||0)-(updated.penalizacion||0);
      return updated;
    });
  });
}
function eliminarPenalizacion(pagoId,itemId){
  setPagos(function(prev){
    return prev.map(function(p){
      if(p.id!==pagoId)return p;
      var lista=(p.penalizaciones||[]).filter(function(x){return x.id!==itemId;});
      var totalPenal=lista.reduce(function(a,x){return a+(x.monto||0);},0);
      var updated=Object.assign({},p,{penalizaciones:lista,penalizacion:totalPenal});
      updated.totalPagar=updated.totalBruto+(updated.extra||0)+(updated.bonoEfectividad||0)-(updated.descuentoEfectividad||0)-(updated.adelanto||0)-(updated.prestamo||0)-(updated.consumo||0)-(updated.descSiniestro||0)-(updated.penalizacion||0);
      return updated;
    });
  });
}
async function calcularEnviosSemana(){

  if(!fechaInicio||!fechaFin){toast('Selecciona el rango de fechas');return;}

  setCalculando(true);

  toast('⏳ Calculando envíos...');

  try{

    // ANTES: se armaba el listado de "entregados del período" buscando envíos cuya columna

    // 'fecha' (la fecha en que se ASIGNÓ/cargó el envío, no en que se entregó) cayera dentro

    // del rango pedido. El problema: un paquete cargado un sábado pero entregado recién el

    // lunes siguiente cruza de semana, y con ese criterio se contaba (y pagaba) en la semana

    // de carga en vez de la semana real de entrega — inflando esa semana en uno y de paso

    // descuadrando el conteo que ve el propio mensajero en "Mis Entregas" (caso detectado por

    // Luis: Domingo cobró 174 y el sistema mostraba 175/177 esa semana).

    // AHORA: se usa la fecha real en que CADA paquete pasó a 'entregado', tomada de

    // historial_envios — una bitácora de eventos que no se pisa después aunque el envío se

    // edite más tarde (a diferencia de la columna 'fecha' o 'updated_at', que si cambian con

    // cualquier edición posterior). Solo se recurre a la fecha de asignación como respaldo

    // para el puñado de envíos entregados que no tienen ese evento registrado (datos

    // antiguos, de antes de que existiera el historial, o cargados por importación masiva).

    // Se trae TODO sin acotar por fecha (paginado) porque la fecha real de entrega puede

    // caer fuera del rango que se buscaría si se acotara por la fecha de asignación.

    var todosEntregados=await fetchPaginadoParalelo(function(cursor,limite){

      return db.from('envios').select('id,codigo,mensajero,estado,fecha,comuna')

        .eq('estado','entregado').gt('id',cursor).order('id',{ascending:true}).limit(limite);

    });

    var porCodigo={};

    todosEntregados.forEach(function(e){porCodigo[e.codigo]=e;});

    var histEntregas=await fetchPaginadoParalelo(function(cursor,limite){

      return db.from('historial_envios').select('id,codigo_envio,created_at')

        .eq('estado','entregado').gt('id',cursor).order('id',{ascending:true}).limit(limite);

    },0);

    // Si un envío pasó a 'entregado' más de una vez (ej. se deshizo por error y se volvió a

    // marcar), vale la última vez real.

    var ultimaEntregaPorCodigo={};

    histEntregas.forEach(function(h){

      var actual=ultimaEntregaPorCodigo[h.codigo_envio];

      if(!actual||new Date(h.created_at)>new Date(actual.created_at))ultimaEntregaPorCodigo[h.codigo_envio]=h;

    });

    var data=[];

    var sinHistorial=0;

    Object.keys(porCodigo).forEach(function(cod){

      var e=porCodigo[cod];

      var h=ultimaEntregaPorCodigo[cod];

      var fechaRealEntrega=h?fechaHoyCL(new Date(h.created_at)):e.fecha; // respaldo: fecha de asignación

      if(!h)sinHistorial++;

      // _fechaRealEntrega queda pegada a cada registro (no solo en esta variable local) porque
      // más abajo se necesita día por día para el descuento por efectividad diaria -- ver
      // entregadosPorDia.
      if(fechaRealEntrega>=fechaInicio&&fechaRealEntrega<=fechaFin)data.push(Object.assign({},e,{_fechaRealEntrega:fechaRealEntrega}));

    });

    if(sinHistorial>0)console.warn('calcularEnviosSemana: '+sinHistorial+' envíos entregados sin registro en historial_envios (se usó su fecha de asignación como respaldo).');

    toast(''+data.length+' registros encontrados...');

    var conteo={};

    data.forEach(function(e){

      var n=(e.mensajero||'').replace(/,\s*/g,' ').toUpperCase().trim();

      if(!n||n==='SIN ASIGNAR'||n==='')return;

      conteo[n]=(conteo[n]||0)+1;

    });

    // (No se aplica aqui un calculo intermedio con tarifa plana: se espera a tener

    // las tarifas por comuna para hacer el calculo correcto de una sola vez, evitando

    // mostrar un monto transitorio incorrecto).

    // Cargar tarifas por comuna de todos los mensajeros

    // Normalizar nombres: quitar comas para comparar con envios

    var normNombre=function(n){return (n||'').replace(/,\s*/g,' ').replace(/\s+/g,' ').toUpperCase().trim();};

    var mensajerosList=pagos.map(function(p){return p.nombre.toUpperCase().trim();});

    var mensajerosListNorm=pagos.map(function(p){return normNombre(p.nombre);});

    // Buscar tarifas con nombre exacto Y con nombre normalizado

    var rTar=await db.from('tarifas_comunas')

      .select('mensajero_nombre,comuna,tarifa');

    var tarifasComunaMap={};

    var tarifasComunaMapPrimerNombre={};

    (rTar.data||[]).forEach(function(t){

      // Indexar por nombre normalizado (sin comas) y tambien por primer nombre, como respaldo

      var key=normNombre(t.mensajero_nombre);

      var primerN=key.split(' ')[0];

      if(!tarifasComunaMap[key])tarifasComunaMap[key]={};

      // matchComuna normaliza acentos/mayúsculas/coma final -- así una tarifa cargada como
      // "Maipú" sí se encuentra aunque el envío haya quedado guardado como "MAIPU" sin acento.
      var comunaTar=matchComuna(t.comuna)||t.comuna.toUpperCase().trim();

      tarifasComunaMap[key][comunaTar]=t.tarifa;

      if(!tarifasComunaMapPrimerNombre[primerN])tarifasComunaMapPrimerNombre[primerN]={};

      tarifasComunaMapPrimerNombre[primerN][comunaTar]=t.tarifa;

    });

    // Construir conteo detallado por mensajero y comuna

    var conteoDetalle={};

    data.forEach(function(e){

      var n=normNombre(e.mensajero||'');

      // Igual que con tarifasComunaMap: se agrupa por matchComuna para que variantes de acento
      ///mayúscula de una misma comuna real (MAIPU vs Maipú) caigan en el mismo casillero y no
      // partan en dos el conteo ni la tarifa aplicada. Si no matchea ninguna comuna real, se
      // agrupa igual (con el texto tal cual) para no perder el envío del conteo/pago -- pero el
      // comprobante y el panel de Administración · Comunas van a mostrar ese valor como está,
      // sin disfrazarlo de comuna válida.
      var c=matchComuna(e.comuna)||(e.comuna||'').toUpperCase().trim();

      if(!n||n==='SIN ASIGNAR'||n==='')return;

      if(!conteoDetalle[n])conteoDetalle[n]={};

      if(!conteoDetalle[n][c])conteoDetalle[n][c]=0;

      conteoDetalle[n][c]++;

    });

    // Bono por efectividad: además de los entregados (arriba), hace falta el total de envíos
    // ASIGNADOS a cada mensajero en el rango (para el % entregados/asignados). Mismo criterio
    // 'en_bodega' excluido que ya usa el calendario "Mis Entregas" del mensajero (ver
    // CalendarioEntregasRider en index.html) -- un paquete que aún no salió a ruta (recién
    // escaneado por Colecta/Retiro Masivo/Excel) no cuenta todavía como "asignado". Solo se
    // consulta cuando el bono está activo, para no sumar una consulta extra de nada si Luis
    // no está usando esta función.
    var todosAsignados=(criterioEf.bonoActivo||criterioEf.descuentoActivo)?await fetchPaginadoParalelo(function(cursor,limite){
      return db.from('envios').select('id,mensajero,estado,fecha')
        .gte('fecha',fechaInicio).lte('fecha',fechaFin).neq('estado','en_bodega').neq('estado','eliminado')
        .gt('id',cursor).order('id',{ascending:true}).limit(limite);
    }):[];
    var conteoAsignados={};
    todosAsignados.forEach(function(e){
      var n=normNombre(e.mensajero||'');
      if(!n||n==='SIN ASIGNAR'||n==='')return;
      conteoAsignados[n]=(conteoAsignados[n]||0)+1;
    });

    // Desglose DÍA POR DÍA (además del total semanal de arriba), solo para el descuento por
    // efectividad: Luis pidió que el descuento no sea un monto fijo por toda la semana, sino que
    // se evalúe día por día y se aplique por CADA paquete que ese día quedó sin entregar. Mismo
    // criterio de fechas que ya usa "Mis Entregas" del mensajero (CalendarioEntregasRider en
    // index.html): lo asignado se agrupa por la fecha de asignación (columna 'fecha'), lo
    // entregado se agrupa por la fecha REAL en que pasó a 'entregado' (historial_envios) -- un
    // mismo paquete puede haberse asignado un día y entregado otro, así que no se puede
    // simplemente cruzar por índice, hay que agrupar cada lado por su propia fecha.
    var asignadosPorDia={};
    todosAsignados.forEach(function(e){
      var n=normNombre(e.mensajero||'');
      if(!n||n==='SIN ASIGNAR'||n==='')return;
      var f=e.fecha;
      if(!asignadosPorDia[n])asignadosPorDia[n]={};
      asignadosPorDia[n][f]=(asignadosPorDia[n][f]||0)+1;
    });
    var entregadosPorDia={};
    data.forEach(function(e){
      var n=normNombre(e.mensajero||'');
      if(!n||n==='SIN ASIGNAR'||n==='')return;
      var f=e._fechaRealEntrega||e.fecha;
      if(!entregadosPorDia[n])entregadosPorDia[n]={};
      entregadosPorDia[n][f]=(entregadosPorDia[n][f]||0)+1;
    });


    // Actualizar pagos con cálculo por tarifa de comuna

    setPagos(function(prev){

      return prev.map(function(p){

        var key=normNombre(p.nombre);

        var enviosPorComuna=conteoDetalle[key]||{};

        var totalEnvios=Object.values(enviosPorComuna).reduce(function(a,b){return a+b;},0);

        var tarsCom=tarifasComunaMap[key]||tarifasComunaMapPrimerNombre[key.split(' ')[0]]||{};

        // Calcular bruto usando tarifa específica por comuna

        var bruto=Object.keys(enviosPorComuna).reduce(function(sum,com){

          var tar=tarsCom[com]!==undefined?tarsCom[com]:(p.tarifa||1200);

          return sum+(enviosPorComuna[com]*tar);

        },0);

        if(totalEnvios===0){bruto=0;}

        var totalBruto=bruto+(p.ajuste||0)-(p.iva||0);

        // Pago por efectividad: 'asignados' se recalcula solo si el bono y/o el descuento están
        // activos (arriba); si ambos están desactivados se conserva lo último guardado (normalmente 0).
        var criterioEfActivo=criterioEf.bonoActivo||criterioEf.descuentoActivo;
        var asignados=conteoAsignados[key]!==undefined?conteoAsignados[key]:(p.asignados||0);

        var efectividad=(criterioEfActivo&&asignados>0)?Math.min(totalEnvios/asignados,1):(p.efectividad!=null?p.efectividad:null);

        var bonoEfectividad=(criterioEf.bonoActivo&&asignados>0&&efectividad!=null&&(efectividad*100)>=(+criterioEf.umbralBonoPct||0))?(+criterioEf.bono||0):0;

        // Descuento por efectividad: ahora se evalúa DÍA POR DÍA (no la semana completa como el
        // bono, que sigue igual arriba) -- por cada día donde el mensajero tuvo paquetes
        // asignados y su efectividad de ESE día (entregados reales ese día / asignados ese día)
        // quedó por debajo del umbral, se descuenta el monto configurado MULTIPLICADO por la
        // cantidad de paquetes que ese día quedaron sin entregar. Así un mal día con muchos
        // paquetes pesa más que un mal día con pocos, en vez de un monto fijo único sin importar
        // cuántos paquetes fallaron. diasBajoEfectividad/paquetesNoEntregadosEfectividad quedan
        // guardados aparte solo para poder mostrar el detalle (cuántos días, cuántos paquetes) en
        // la tarjeta y el comprobante.
        var diasBajoEfectividad=0,paquetesNoEntregadosEfectividad=0;
        if(criterioEf.descuentoActivo){
          var asigDia=asignadosPorDia[key]||{};
          var entDia=entregadosPorDia[key]||{};
          Object.keys(asigDia).forEach(function(f){
            var asigD=asigDia[f]||0;
            if(asigD<=0)return;
            var entD=entDia[f]||0;
            var efecD=Math.min(entD/asigD,1);
            if((efecD*100)<(+criterioEf.umbralDescuentoPct||0)){
              diasBajoEfectividad++;
              paquetesNoEntregadosEfectividad+=Math.max(asigD-entD,0);
            }
          });
        }
        var descuentoEfectividad=paquetesNoEntregadosEfectividad*(+criterioEf.descuento||0);

        var totalPagar=totalBruto+(p.extra||0)+bonoEfectividad-descuentoEfectividad-(p.adelanto||0)-(p.prestamo||0)-(p.consumo||0)-(p.descSiniestro||0)-(p.penalizacion||0);

        // Se guarda el detalle por comuna para que "Recalcular" (recalcAll) pueda

        // recomputar el bruto respetando tarifas especiales por comuna, en vez de

        // aplicar una tarifa plana.

        return Object.assign({},p,{envios:totalEnvios,bruto:bruto,totalBruto:totalBruto,totalPagar:totalPagar,enviosPorComuna:enviosPorComuna,tarsCom:tarsCom,asignados:asignados,efectividad:efectividad,bonoEfectividad:bonoEfectividad,descuentoEfectividad:descuentoEfectividad,diasBajoEfectividad:diasBajoEfectividad,paquetesNoEntregadosEfectividad:paquetesNoEntregadosEfectividad});

      });

    });

    var total=Object.values(conteo).reduce(function(a,b){return a+b;},0);

    toast('✓ '+total+' envíos calculados con tarifas por comuna');

  }catch(e){

    console.error('calcularEnviosSemana error:',e);

    toast('⚠ Error: '+e.message);

  }

  setCalculando(false);

}

function recalcAll(){

  // Construir mapa de mensajeros ACTIVOS actuales

  const menMap={};

  mensajeros.filter(m=>m.activo!==false).forEach(m=>{

    const key=m.nombre.replace(/,\s*/g,' ').toUpperCase().trim();

    menMap[key]={nombre:m.nombre,tarifa:m.tarifa||1200};

  });

  const activosKeys=new Set(Object.keys(menMap));

  setPagos(prev=>{

    // Filtrar pausados y actualizar datos

    const updated=prev

      .filter(p=>activosKeys.has(p.nombre.replace(/,\s*/g,' ').toUpperCase().trim()))

      .map(p=>{

        const key=p.nombre.replace(/,\s*/g,' ').toUpperCase().trim();

        const menActual=menMap[key];

        const nombre=menActual?menActual.nombre:p.nombre;

        const tarifa=menActual?menActual.tarifa:p.tarifa||1200;

        // Si tenemos el detalle de envíos por comuna (cargado por "Calcular"),

        // respetar las tarifas especiales por comuna en vez de aplicar una tarifa

        // plana a todos los envíos (bug: Gustavo Román $9.100 en vez de $10.300).

        let bruto;

        if(p.enviosPorComuna && Object.keys(p.enviosPorComuna).length>0){

          bruto=Object.keys(p.enviosPorComuna).reduce((sum,com)=>{

            const tar=(p.tarsCom&&p.tarsCom[com]!==undefined)?p.tarsCom[com]:tarifa;

            return sum+(p.enviosPorComuna[com]*tar);

          },0);

        } else {

          bruto=p.envios*tarifa;

        }

        const totalBruto=bruto+(p.ajuste||0)-(p.iva||0);

        const totalPagar=totalBruto+(p.extra||0)+(p.bonoEfectividad||0)-(p.descuentoEfectividad||0)-(p.adelanto||0)-(p.prestamo||0)-(p.consumo||0)-(p.descSiniestro||0)-(p.penalizacion||0);

        return{...p,nombre,tarifa,bruto,totalBruto,totalPagar};

      });

    // Agregar mensajeros activos nuevos que no estaban

    const updatedNames=new Set(updated.map(p=>p.nombre.replace(/,\s*/g,' ').toUpperCase().trim()));

    const nuevos=mensajeros.filter(m=>m.activo!==false&&!updatedNames.has(m.nombre.replace(/,\s*/g,' ').toUpperCase().trim()))

      .map((m,i)=>({id:Date.now()+i,nombre:m.nombre,envios:0,tarifa:m.tarifa||1200,bruto:0,ajuste:0,iva:0,tipoIVA:'ninguno',totalBruto:0,adelanto:0,extra:0,prestamo:0,consumo:0,descSiniestro:0,penalizacion:0,totalPagar:0,estado:'PENDIENTE',obs:''}));

    return updated.concat(nuevos);

  });

}
// Antes había que apretar el botón "Recalcular" a mano cada vez que cambiaba algo en
// Administración · Mensajeros (una tarifa nueva, un mensajero dado de baja/alta) para que la
// tabla de Pagos se enterara -- si nadie lo apretaba, quedaba mostrando datos viejos sin que se
// notara. Ahora se sincroniza sola: apenas cambia algo relevante del roster de mensajeros
// (comparando una "firma" liviana en vez de la referencia del array, que cambia en cada
// render del padre aunque no haya cambios reales) se llama a recalcAll() en silencio.
const firmaMensajeros=mensajeros.map(m=>m.nombre+'|'+(m.tarifa||1200)+'|'+(m.activo!==false)).sort().join(';');
const _firmaMensajerosPrev=useRef(null);
React.useEffect(()=>{
  if(!_pagosCargados.current)return;
  if(_firmaMensajerosPrev.current===null){_firmaMensajerosPrev.current=firmaMensajeros;return;}
  if(_firmaMensajerosPrev.current===firmaMensajeros)return;
  _firmaMensajerosPrev.current=firmaMensajeros;
  recalcAll();
},[firmaMensajeros]);
// Devuelve los montos de bono/descuento/total a pagar que corresponden a un pago 'p',
// respetando la Vista Previa (ver estado vistaPreviaSinCriterio más arriba): si está activa,
// simula cómo quedaría el pago SIN el bono/descuento por efectividad, solo para mostrarlo en
// pantalla -- nunca toca p.totalPagar, p.bonoEfectividad ni p.descuentoEfectividad reales, así
// que exportar a Excel/PDF o guardar sigue usando siempre los valores de verdad.
function montoPago(p){
  if(!vistaPreviaSinCriterio)return{bono:p.bonoEfectividad||0,desc:p.descuentoEfectividad||0,total:p.totalPagar};
  return{bono:0,desc:0,total:p.totalBruto+(p.extra||0)-(p.adelanto||0)-(p.prestamo||0)-(p.consumo||0)-(p.descSiniestro||0)-(p.penalizacion||0)};
}
const totales=pagos.reduce((a,p)=>{const m=montoPago(p);return{envios:a.envios+p.envios,bruto:a.bruto+p.bruto,adelanto:a.adelanto+p.adelanto,extra:a.extra+p.extra,bonoEfectividad:a.bonoEfectividad+m.bono,descuentoEfectividad:a.descuentoEfectividad+m.desc,prestamo:a.prestamo+p.prestamo,iva:a.iva+p.iva,consumo:a.consumo+(p.consumo||0),descSiniestro:a.descSiniestro+(p.descSiniestro||0),total:a.total+m.total,pendientes:a.pendientes+(p.estado==='PENDIENTE'?1:0),pagados:a.pagados+(p.estado==='PAGADO'?1:0)};},{envios:0,bruto:0,adelanto:0,extra:0,bonoEfectividad:0,descuentoEfectividad:0,prestamo:0,iva:0,consumo:0,descSiniestro:0,total:0,pendientes:0,pagados:0});const fmtCLP=n=>`$${Math.round(n).toLocaleString('es-CL')}`;function exportarComprobante(p){var _document$querySelect5;const win=window.open('','_blank','width=650,height=860');const logoSrc=((_document$querySelect5=document.querySelector('.logo-img'))==null?void 0:_document$querySelect5.src)||'';
    // Detalle por comuna: se arma con lo que ya calculó 'Calcular Envíos Semana' (p.enviosPorComuna +
    // p.tarsCom, ver calcularEnviosSemana más arriba) -- así el comprobante muestra exactamente lo
    // que se usó para calcular el pago, comuna por comuna, sin recalcular nada acá. Si el mensajero
    // se importó por Excel (sin ese detalle), se cae a una sola fila "General" con la tarifa plana.
    const filasComuna=(p.enviosPorComuna&&Object.keys(p.enviosPorComuna).length>0)
      ?Object.keys(p.enviosPorComuna).sort().map(function(com){
          const cant=p.enviosPorComuna[com];
          const tar=(p.tarsCom&&p.tarsCom[com]!==undefined)?p.tarsCom[com]:(p.tarifa||0);
          return{comuna:com||'SIN COMUNA',cant:cant,tarifa:tar,subtotal:cant*tar};
        })
      :[{comuna:'General',cant:p.envios,tarifa:p.tarifa,subtotal:p.bruto}];
    const filasDescuento=[
      p.ajuste!==0?{label:'Ajuste',val:p.ajuste,positivo:p.ajuste>0}:null,
      p.iva>0?{label:'IVA / Descuento',val:-p.iva,positivo:false}:null,
      p.extra>0?{label:'Extra / Bono',val:p.extra,positivo:true}:null,
      (p.bonoEfectividad||0)>0?{label:'Bono Efectividad'+(p.efectividad!=null?' ('+(p.efectividad*100).toFixed(1)+'%)':''),val:p.bonoEfectividad,positivo:true}:null,
      (p.descuentoEfectividad||0)>0?{label:'Descuento Efectividad ('+(p.paquetesNoEntregadosEfectividad||0)+' paq. en '+(p.diasBajoEfectividad||0)+' día'+(p.diasBajoEfectividad===1?'':'s')+')',val:-p.descuentoEfectividad,positivo:false}:null,
      p.consumo>0?{label:'Consumo Local',val:-p.consumo,positivo:false}:null,
      (p.descSiniestro||0)>0?{label:'Descuento por Siniestro',val:-p.descSiniestro,positivo:false}:null,
      (p.penalizacion||0)>0?{label:'Penalización por Falta ('+(p.penalizaciones||[]).reduce(function(a,x){return a+(x.envios||0);},0)+' env.)',val:-p.penalizacion,positivo:false}:null,
      p.adelanto>0?{label:'Adelanto Recibido',val:-p.adelanto,positivo:false}:null,
      p.prestamo>0?{label:'Préstamo Descontado',val:-p.prestamo,positivo:false}:null
    ].filter(Boolean);
    const filasComunaHtml=filasComuna.map(function(f){
      return`<tr><td>${f.comuna}</td><td class="c">${f.cant}</td><td class="r">${fmtCLP(f.tarifa)}</td><td class="r sub">${fmtCLP(f.subtotal)}</td></tr>`;
    }).join('');
    const filasDescuentoHtml=filasDescuento.length?filasDescuento.map(function(f){
      return`<tr><td>${f.label}</td><td class="r" style="color:${f.positivo?'#1a6b3a':'#b03030'};font-weight:700">${f.positivo?'+':''}${fmtCLP(f.val)}</td></tr>`;
    }).join(''):'';
    win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"/>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
    <title>Comprobante - ${p.nombre.replace(/,\s*/g,' ')}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      @page{size:A4;margin:14mm 16mm;}
      body{font-family:'DM Sans',Arial,sans-serif;padding:26px;background:#FEF8EA;color:#2b2e20;font-size:13px;}
      .sheet{max-width:680px;margin:0 auto;background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(43,46,32,0.08);border:1px solid #ecdfb8;overflow:hidden;}
      .topbar{height:6px;background:linear-gradient(90deg,#C8A84B,#e4c976,#C8A84B);}
      .pad{padding:22px 28px;}
      .header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #f0e6c8;padding-bottom:14px;margin-bottom:16px;}
      .logo{display:flex;align-items:center;gap:10px;}
      .logo img{width:46px;height:46px;object-fit:contain;border-radius:8px;}
      .brand{font-size:19px;font-family:'Bebas Neue',sans-serif;letter-spacing:2px;color:#2b2e20;line-height:1;}
      .brand-sub{font-size:8px;color:#9a9d8a;letter-spacing:2px;text-transform:uppercase;margin-top:2px;}
      .titulo{font-size:15px;font-weight:800;color:#C8A84B;letter-spacing:0.5px;}
      .meta{font-size:11px;color:#7a7d6a;margin-top:3px;}
      .meta b{color:#2b2e20;}
      .mens-row{display:flex;align-items:center;justify-content:space-between;background:#FBF6E6;border:1px solid #f0e6c8;border-radius:10px;padding:11px 16px;margin-bottom:16px;}
      .mens-nombre{font-size:15px;font-weight:800;color:#2b2e20;}
      .mens-sub{font-size:10px;color:#9a9d8a;letter-spacing:1px;text-transform:uppercase;margin-top:1px;}
      .badge{padding:4px 14px;border-radius:20px;font-size:10px;font-weight:800;letter-spacing:0.5px;}
      .badge-pagado{background:#e3f3e8;color:#1a6b3a;}
      .badge-pendiente{background:#fbe6e6;color:#b03030;}
      .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;}
      .tile{background:#FBF6E6;border:1px solid #f0e6c8;border-radius:10px;padding:10px 12px;text-align:center;}
      .tile-label{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9a9d8a;}
      .tile-val{font-size:17px;font-weight:800;color:#2b2e20;margin-top:3px;font-family:'DM Sans',sans-serif;}
      .section-title{font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#7a5500;margin:0 0 8px;padding-bottom:5px;border-bottom:2px solid #C8A84B;display:flex;align-items:center;gap:6px;}
      table{width:100%;border-collapse:collapse;margin-bottom:16px;}
      table th{font-size:9px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#9a9d8a;text-align:left;padding:6px 8px;border-bottom:2px solid #f0e6c8;}
      table td{font-size:12px;padding:6px 8px;border-bottom:1px solid #f5efdc;}
      table tr:last-child td{border-bottom:none;}
      table tr:nth-child(even) td{background:#FCF9EF;}
      .c{text-align:center;}
      .r{text-align:right;font-variant-numeric:tabular-nums;}
      .sub{font-weight:700;color:#2b2e20;}
      .tfoot td{border-top:2px solid #C8A84B;border-bottom:none;font-weight:800;background:#fff!important;padding-top:8px;}
      .total-box{background:linear-gradient(135deg,#2b2e20,#1c1e14);color:#fff;border-radius:12px;padding:16px 22px;display:flex;align-items:center;justify-content:space-between;margin:18px 0;}
      .total-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C8A84B;font-weight:700;}
      .total-val{font-size:26px;font-weight:800;font-family:'DM Sans',sans-serif;}
      .obs-box{background:#FFFBEF;border:1px solid #e4d494;border-radius:8px;padding:10px 14px;font-size:11px;color:#7a5500;margin-bottom:16px;}
      .firma-box{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:26px;}
      .firma-area{border-top:2px solid #C8A84B;padding-top:8px;text-align:center;font-size:9px;color:#9a9d8a;font-weight:700;letter-spacing:1px;text-transform:uppercase;}
      .firma-nombre{font-size:12px;color:#2b2e20;font-weight:700;text-transform:none;letter-spacing:0;margin-top:2px;}
      .footer-note{text-align:center;font-size:9px;color:#c4c7b4;margin-top:20px;letter-spacing:0.5px;}
      @media print{
        body{padding:0;background:#fff;}
        .sheet{max-width:100%;border-radius:0;border:none;box-shadow:none;}
      }
    </style>
    </head><body>
    <div class="sheet">
      <div class="topbar"></div>
      <div class="pad">
        <div class="header">
          <div class="logo">
            <img src="${logoSrc}" onerror="this.style.display='none'"/>
            <div><div class="brand">TRANSPGSO</div><div class="brand-sub">Last Mile Delivery</div></div>
          </div>
          <div style="text-align:right">
            <div class="titulo">Comprobante de Pago</div>
            <div class="meta">Semana <b>${semana}</b></div>
            <div class="meta">Pago: <b>${new Date(fechaPago+'T12:00:00').toLocaleDateString('es-CL')}</b></div>
          </div>
        </div>

        <div class="mens-row">
          <div>
            <div class="mens-nombre">${p.nombre.replace(/,\s*/g,' ')}</div>
            <div class="mens-sub">Mensajero</div>
          </div>
          <span class="badge ${p.estado==='PAGADO'?'badge-pagado':'badge-pendiente'}">${p.estado}</span>
        </div>

        <div class="tiles">
          <div class="tile"><div class="tile-label">Paquetes Entregados</div><div class="tile-val">${p.envios}</div></div>
          <div class="tile"><div class="tile-label">Comunas</div><div class="tile-val">${filasComuna.length}</div></div>
          <div class="tile"><div class="tile-label">Pago Bruto</div><div class="tile-val">${fmtCLP(p.bruto)}</div></div>
        </div>

        <div class="section-title">📦 Detalle por Comuna</div>
        <table>
          <thead><tr><th>Comuna</th><th class="c">Paquetes</th><th class="r">Valor / Paquete</th><th class="r">Subtotal</th></tr></thead>
          <tbody>${filasComunaHtml}</tbody>
          <tfoot><tr class="tfoot"><td>Total</td><td class="c">${p.envios}</td><td></td><td class="r">${fmtCLP(p.bruto)}</td></tr></tfoot>
        </table>

        ${filasDescuentoHtml?`
        <div class="section-title">⚖ Ajustes y Descuentos</div>
        <table><tbody>${filasDescuentoHtml}</tbody></table>`:''}

        ${p.obs?`<div class="obs-box"><strong>Observaciones:</strong> ${p.obs}</div>`:''}

        <div class="total-box">
          <div class="total-label">Total Neto a Pagar</div>
          <div class="total-val">${fmtCLP(p.totalPagar)}</div>
        </div>

        <div class="firma-box">
          <div class="firma-area">Recibí Conforme<div class="firma-nombre">${p.nombre.replace(/,\s*/g,' ')}</div></div>
          <div class="firma-area">Firma Responsable<div class="firma-nombre">TransPgso SpA</div></div>
        </div>

        <div class="footer-note">Comprobante generado automáticamente por TransPgso · ${new Date().toLocaleString('es-CL')}</div>
      </div>
    </div>
    <script>window.onload=()=>{window.print()}<\/script>
    </body></html>`);win.document.close();}function exportarResumen(){var _document$querySelect6;const win=window.open('','_blank','width=1000,height=700');const logoSrc=((_document$querySelect6=document.querySelector('.logo-img'))==null?void 0:_document$querySelect6.src)||'';const filas=pagos.map((p,i)=>`

      <tr style="background:${i%2===0?'#fff':'#fdf9f2'}">

        <td style="text-align:center;color:#7a7d6a;font-weight:700">${i+1}</td>

        <td style="font-weight:700">${p.nombre.replace(/,\s*/g,' ')}</td>

        <td style="text-align:center">${p.envios}</td>

        <td style="text-align:right">$${p.tarifa.toLocaleString('es-CL')}</td>

        <td style="text-align:right">$${Math.round(p.bruto).toLocaleString('es-CL')}</td>

        <td style="text-align:right;color:${p.ajuste!==0?p.ajuste>0?'#1a6b3a':'#b03030':'#7a7d6a'}">${p.ajuste!==0?'$'+Math.round(p.ajuste).toLocaleString('es-CL'):'—'}</td>

        <td style="text-align:right;color:#b03030">${p.iva>0?'$'+Math.round(p.iva).toLocaleString('es-CL'):'—'}</td>

        <td style="text-align:right">${p.extra>0?'$'+Math.round(p.extra).toLocaleString('es-CL'):'—'}</td>

        <td style="text-align:right;color:#b03030">${p.adelanto>0?'$'+Math.round(p.adelanto).toLocaleString('es-CL'):'—'}</td>

        <td style="text-align:right;color:#b03030">${p.prestamo>0?'$'+Math.round(p.prestamo).toLocaleString('es-CL'):'—'}</td>

        <td style="text-align:right;font-weight:700;color:${p.totalPagar>=0?'#1a6b3a':'#b03030'}">$${Math.round(p.totalPagar).toLocaleString('es-CL')}</td>

        <td style="text-align:center"><span style="padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;background:${p.estado==='PAGADO'?'rgba(26,107,58,0.12)':'rgba(176,48,48,0.1)'};color:${p.estado==='PAGADO'?'#1a6b3a':'#b03030'}">${p.estado}</span></td>

      </tr>`).join('');win.document.write(`<!DOCTYPE html><html><head>

    <meta charset="UTF-8"/><title>Resumen de Pagos - ${semana}</title>

    <style>

      *{box-sizing:border-box;margin:0;padding:0;}

      body{font-family:Arial,sans-serif;padding:24px;background:#fff;font-size:11px;color:#2b2e20;}

      .header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #C8A84B;padding-bottom:14px;margin-bottom:20px;}

      .logo{display:flex;align-items:center;gap:10px;}

      .logo img{width:54px;height:54px;object-fit:contain;border-radius:6px;}

      .brand{font-size:18px;font-family:'Bebas Neue',sans-serif;font-weight:900;letter-spacing:2px;}

      .kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px;}

      .kpi-box{background:#f9f5eb;border:1px solid #e0d8c0;border-top:3px solid #C8A84B;border-radius:8px;padding:12px;text-align:center;}

      .kpi-val{font-size:20px;font-weight:900;color:#2b2e20;}

      .kpi-label{font-size:9px;color:#7a7d6a;letter-spacing:1.5px;text-transform:uppercase;margin-top:3px;}

      table{width:100%;border-collapse:collapse;}

      thead tr{background:#2b2e20;}

      thead th{color:#C8A84B;padding:8px 8px;text-align:left;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;}

      tbody td{padding:7px 8px;border-bottom:1px solid #f0e8d0;font-size:10px;}

      tfoot tr{background:#2b2e20;}

      tfoot td{color:#C8A84B;padding:8px 8px;font-weight:700;font-size:11px;}

      @media print{body{padding:14px;}}

    </style>

    </head><body>

    <div class="header">

      <div class="logo">

        <img src="${logoSrc}" onerror="this.style.display='none'"/>

        <div><div class="brand">TRANSPGSO</div><div style="font-size:9px;color:#7a7d6a;letter-spacing:2px">RESUMEN SEMANAL DE PAGO</div></div>

      </div>

      <div style="text-align:right">

        <div style="font-size:13px;font-weight:700">Semana: ${semana}</div>

        <div style="font-size:11px;color:#7a7d6a;margin-top:3px">Fecha de pago: ${new Date(fechaPago+'T12:00:00').toLocaleDateString('es-CL')}</div>

      </div>

    </div>

    <div class="kpi-grid">

      <div class="kpi-box"><div class="kpi-val">${totales.envios.toLocaleString('es-CL')}</div><div class="kpi-label">Total Envíos</div></div>

      <div class="kpi-box"><div class="kpi-val" style="color:#1a6b3a">$${Math.round(totales.bruto).toLocaleString('es-CL')}</div><div class="kpi-label">Pago Bruto</div></div>

      <div class="kpi-box"><div class="kpi-val" style="color:#b03030">$${Math.round(totales.adelanto).toLocaleString('es-CL')}</div><div class="kpi-label">Total Adelantos</div></div>

      <div class="kpi-box"><div class="kpi-val" style="font-size:16px;color:#1a6b3a">$${Math.round(totales.total).toLocaleString('es-CL')}</div><div class="kpi-label">Total a Pagar</div></div>

      <div class="kpi-box"><div class="kpi-val">${totales.pendientes}</div><div class="kpi-label">Pendientes</div></div>

    </div>

    <table>

      <thead><tr>

        <th style="width:36px">#</th>

        <th style="text-align:left">Mensajero</th>

        <th>Envíos</th>

        <th>Pago Calc.</th>

        <th>Consumo</th>

        <th>Extra</th>

        <th>Adelanto</th>

        <th>Préstamo semana</th>

        <th>Saldo Pend.</th>

        <th>Total a Pagar</th>

        <th>Estado</th>

        <th style="width:36px"></th>

      </tr></thead>

      <tbody>${filas}</tbody>

      <tfoot><tr>

        <td></td><td>TOTALES</td>

        <td style="text-align:center">${totales.envios.toLocaleString('es-CL')}</td>

        <td style="text-align:right">$${Math.round(totales.bruto).toLocaleString('es-CL')}</td>

        <td style="text-align:right">$${Math.round(totales.consumo||0).toLocaleString('es-CL')}</td>

        <td style="text-align:right">${totales.extra>0?'$'+Math.round(totales.extra).toLocaleString('es-CL'):'—'}</td>

        <td style="text-align:right">$${Math.round(totales.adelanto).toLocaleString('es-CL')}</td>

        <td style="text-align:right">$${Math.round(totales.prestamo).toLocaleString('es-CL')}</td>

        <td></td>

        <td style="text-align:right">$${Math.round(totales.total).toLocaleString('es-CL')}</td>

        <td style="text-align:center">${totales.pendientes} pend. / ${totales.pagados} pag.</td>

        <td></td>

      </tr></tfoot>

    </table>

    <div style="margin-top:16px;font-size:9px;color:#7a7d6a;text-align:right">Generado: ${new Date().toLocaleString('es-CL')} · TransPgso SpA</div>

    <script>window.onload=()=>{window.print()}<\/script>

    </body></html>`);win.document.close();}if(!esAdmin)return/*#__PURE__*/React.createElement("div",{style:{textAlign:'center',padding:'60px 20px'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:48,marginBottom:16}},"\uD83D\uDD10"),/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:24,color:'var(--dark)',letterSpacing:2}},"Acceso Restringido"),/*#__PURE__*/React.createElement("div",{style:{fontSize:13,color:'var(--text-soft)',marginTop:8}},"Solo los administradores pueden ver los pagos de mensajeros."));if(tabsVisibles.length===0)return/*#__PURE__*/React.createElement("div",{style:{textAlign:'center',padding:'60px 20px'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:48,marginBottom:16}},"🔐"),/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:24,color:'var(--dark)',letterSpacing:2}},"Sin acceso habilitado"),/*#__PURE__*/React.createElement("div",{style:{fontSize:13,color:'var(--text-soft)',marginTop:8}},"Tu rol no tiene ninguna sección de Pagos y Cobros habilitada. Pide a un Super Admin que te habilite al menos una en Permisos."));return React.createElement(React.Fragment,null,/*#__PURE__*/React.createElement("div",{className:"pm-root tab-"+pagosTab},/*#__PURE__*/React.createElement("div",{className:"section-head"},

  /*#__PURE__*/React.createElement("div",{className:"section-title"},"Pagos ",/*#__PURE__*/React.createElement("span",null,"Mensajeros")),

  /*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:6}},

    tabsVisibles.map(t=>

      /*#__PURE__*/React.createElement("button",{key:t.val,onClick:()=>setPagosTab(t.val),style:{padding:'7px 16px',borderRadius:8,border:`1px solid ${pagosTab===t.val?'var(--gold)':'var(--border)'}`,background:pagosTab===t.val?'rgba(200,168,75,0.12)':'#fff',color:pagosTab===t.val?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer'}},t.label)

    )

  ),pp.pagos&&pagosTab==='pagos'&&/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},/*#__PURE__*/React.createElement("button",{className:'btn-futurista '+((criterioEf.bonoActivo||criterioEf.descuentoActivo)?'btn-f-gold':'btn-f-ghost'),onClick:()=>setCriterioModalAbierto(true),title:[criterioEf.bonoActivo?('Bono: \u2265'+criterioEf.umbralBonoPct+'% \u2192 +$'+Math.round(criterioEf.bono).toLocaleString('es-CL')):null,criterioEf.descuentoActivo?('Descuento: <'+criterioEf.umbralDescuentoPct+'% \u2192 -$'+Math.round(criterioEf.descuento).toLocaleString('es-CL')):null].filter(Boolean).join(' | ')||'Pago por efectividad desactivado -- clic para configurar'},"\uD83C\uDFAF Criterio Efectividad"),(criterioEf.bonoActivo||criterioEf.descuentoActivo)&&/*#__PURE__*/React.createElement("button",{className:'btn-futurista '+(vistaPreviaSinCriterio?'btn-f-danger':'btn-f-ghost'),onClick:()=>setVistaPreviaSinCriterio(v=>!v),title:vistaPreviaSinCriterio?'Viendo los montos SIN bono/descuento por efectividad (vista previa, no se guarda nada) -- clic para volver a lo real':'Ver c\u00F3mo quedar\u00EDan los montos SIN aplicar el bono/descuento por efectividad, sin tocar nada guardado'},vistaPreviaSinCriterio?"\uD83D\uDC41\uFE0F Viendo: SIN Efectividad":"\uD83D\uDC41\uFE0F Vista Previa"),/*#__PURE__*/React.createElement("button",{className:'btn-futurista btn-f-success',onClick:cerrarSemana},"\u2713 Cerrar Semana"),/*#__PURE__*/React.createElement(ExportBtn,{label:"Exportar",onPDF:exportarResumen,onExcel:()=>{const headers=['#','Mensajero','Envíos','Tarifa $','Pago Calc.','Ajuste','IVA/Desc.','Extra','Efectividad','Bono Efect.','Desc. Efect.','Adelanto','Préstamo','Total a Pagar','Estado','Observaciones'];const rows=pagos.map((p,i)=>[i+1,p.nombre.replace(/,\s*/g,' '),p.envios,p.tarifa,Math.round(p.bruto),p.ajuste,p.iva,p.extra,p.efectividad!=null?(p.efectividad*100).toFixed(1)+'%':'—',Math.round(p.bonoEfectividad||0),Math.round(p.descuentoEfectividad||0),p.adelanto,p.prestamo,Math.round(p.totalPagar),p.estado,p.obs]);const tots=pagos.reduce((a,p)=>({e:a.e+p.envios,b:a.b+p.bruto,t:a.t+p.totalPagar,ad:a.ad+p.adelanto,ex:a.ex+p.extra,bo:a.bo+(p.bonoEfectividad||0),de:a.de+(p.descuentoEfectividad||0)}),{e:0,b:0,t:0,ad:0,ex:0,bo:0,de:0});const totRow=['','TOTALES',tots.e,'',Math.round(tots.b),'','',Math.round(tots.ex),'',Math.round(tots.bo),Math.round(tots.de),Math.round(tots.ad),'',Math.round(tots.t),'',''];exportToExcel('Pagos_Mensajeros_'+semana.replace(/\s/g,'_'),[{name:'Pagos',headers,rows,totalsRow:totRow}]);}}))),pp.pagos&&/*#__PURE__*/React.createElement("div",{className:"pm-pagos-main"},/*#__PURE__*/React.createElement("div",{style:{background:'#fff',border:'1px solid var(--border)',borderTop:'3px solid var(--gold)',borderRadius:10,padding:20,marginBottom:20,boxShadow:'0 2px 10px rgba(43,46,32,0.07)'}},/*#__PURE__*/React.createElement("div",{className:"form-row"},/*#__PURE__*/React.createElement("div",{className:"form-group",style:{marginBottom:0}},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Período / Semana"),

/*#__PURE__*/React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center"}},

  /*#__PURE__*/React.createElement("input",{

    type:"date",className:"form-input",style:{flex:1},

    value:fechaInicio||"",

    onChange:e=>{

      setFechaInicio(e.target.value);

      if(e.target.value&&fechaFin){

        var d1=new Date(e.target.value),d2=new Date(fechaFin);

        setSemana(d1.toLocaleDateString("es-CL")+' al '+d2.toLocaleDateString("es-CL"));

      }

    }

  }),

  /*#__PURE__*/React.createElement("span",{style:{color:"var(--text-soft)",fontSize:12}},"al"),

  /*#__PURE__*/React.createElement("input",{

    type:"date",className:"form-input",style:{flex:1},

    value:fechaFin||"",

    onChange:e=>{

      setFechaFin(e.target.value);

      if(fechaInicio&&e.target.value){

        var d1=new Date(fechaInicio),d2=new Date(e.target.value);

        setSemana(d1.toLocaleDateString("es-CL")+' al '+d2.toLocaleDateString("es-CL"));

      }

    }

  }),

  /*#__PURE__*/React.createElement("button",{

    className:"btn-primary",

    style:{whiteSpace:"nowrap",padding:"8px 14px",fontSize:12},

    onClick:calcularEnviosSemana

  },"Calcular")

)),/*#__PURE__*/React.createElement("div",{className:"form-group",style:{marginBottom:0}},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Fecha de Pago"),/*#__PURE__*/React.createElement("input",{className:"form-input",type:"date",value:fechaPago,onChange:e=>setFechaPago(e.target.value)})))),/*#__PURE__*/React.createElement("div",{className:"stats-grid",style:{marginBottom:20}},[{label:'Total Envíos',val:totales.envios.toLocaleString('es-CL'),cls:'',filtro:null},{label:'Pago Bruto',val:'$'+Math.round(totales.bruto).toLocaleString('es-CL'),cls:'green',filtro:null},{label:'Total Adelantos',val:'$'+Math.round(totales.adelanto).toLocaleString('es-CL'),cls:'red',filtro:null},{label:'Consumo Local',val:'$'+Math.round(totales.consumo).toLocaleString('es-CL'),cls:'red',filtro:'consumo'},{label:'Descuento Siniestro',val:'$'+Math.round(totales.descSiniestro||0).toLocaleString('es-CL'),cls:'red',filtro:'descSiniestro'},{label:'Extras / Bonos',val:'$'+Math.round(totales.extra).toLocaleString('es-CL'),cls:'gold',filtro:'extra'},{label:'Total a Pagar',val:'$'+Math.round(totales.total).toLocaleString('es-CL'),cls:'green',filtro:null},{label:'Pendientes',val:totales.pendientes,cls:'red',filtro:'PENDIENTE'},{label:'Pagados',val:totales.pagados,cls:'green',filtro:'PAGADO'}].map(s=>/*#__PURE__*/React.createElement("div",{key:s.label,className:"stat-card",onClick:()=>s.filtro&&setPagosFiltro(pagosFiltro===s.filtro?null:s.filtro),style:{cursor:s.filtro?'pointer':'default',border:pagosFiltro===s.filtro?'2px solid var(--gold)':'1px solid var(--border)',transition:'all 0.2s'}},/*#__PURE__*/React.createElement("div",{className:"stat-label"},s.label),/*#__PURE__*/React.createElement("div",{className:`stat-value ${s.cls}`,style:{fontSize:s.val.toString().length>8?'20px':'28px'}},s.val),s.filtro&&/*#__PURE__*/React.createElement("div",{style:{marginTop:6,fontSize:10,color:'var(--gold)',fontWeight:700,letterSpacing:1}},pagosFiltro===s.filtro?'▲ Ocultar':'▼ Ver detalle')))),pagosFiltro&&(()=>{const filtrados=pagosFiltro==='PENDIENTE'||pagosFiltro==='PAGADO'?pagos.filter(p=>p.estado===pagosFiltro):pagosFiltro==='consumo'?pagos.filter(p=>(p.consumo||0)>0):pagosFiltro==='descSiniestro'?pagos.filter(p=>(p.descSiniestro||0)>0):pagosFiltro==='extra'?pagos.filter(p=>(p.extra||0)>0):pagos;const titulos={'PENDIENTE':'Mensajeros Pendientes de Pago','PAGADO':'Mensajeros Pagados','consumo':'Con Consumo Local','descSiniestro':'Con Descuento por Siniestro','extra':'Con Extras / Bonos'};const colores={'PENDIENTE':'var(--danger)','PAGADO':'var(--success)','consumo':'var(--warning)','descSiniestro':'#C62828','extra':'var(--success)'};if(!pagosListos){return/*#__PURE__*/React.createElement("div",{style:{textAlign:'center',padding:'60px 20px',color:'var(--text-soft)'}},"Cargando pagos...");}return/*#__PURE__*/React.createElement("div",{style:{background:'#fff',border:'1px solid var(--border)',borderTop:'3px solid '+colores[pagosFiltro],borderRadius:10,padding:20,marginBottom:20,boxShadow:'0 2px 10px rgba(43,46,32,0.07)'}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}},/*#__PURE__*/React.createElement("div",null,/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.5,color:'var(--dark)'}},titulos[pagosFiltro],/*#__PURE__*/React.createElement("span",{style:{fontFamily:'JetBrains Mono',fontSize:14,color:colores[pagosFiltro],marginLeft:12}},filtrados.length," mensajero",filtrados.length!==1?'s':'')),/*#__PURE__*/React.createElement("div",{style:{fontSize:12,color:'var(--text-soft)',marginTop:2}},semana&&'Período: '+semana)),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:8}},/*#__PURE__*/React.createElement(ExportBtn,{label:"Exportar",onPDF:()=>{var _document$querySelect7;const logoSrc=((_document$querySelect7=document.querySelector('.logo-img'))==null?void 0:_document$querySelect7.src)||'';const win=window.open('','_blank','width=900,height=700');const filas=filtrados.map((p,i)=>`

                      <tr style="background:${i%2===0?'#fff':'#fdf9f2'}">

                        <td style="text-align:center;color:#7a7d6a">${i+1}</td>

                        <td style="font-weight:700">${p.nombre.replace(/,\s*/g,' ')}</td>

                        <td style="text-align:center">${p.envios}</td>

                        <td style="text-align:right">$${Math.round(p.bruto).toLocaleString('es-CL')}</td>

                        ${pagosFiltro==='consumo'?`<td style="text-align:right;color:#b03030">$${Math.round(p.consumo||0).toLocaleString('es-CL')}</td>`:''}

                        ${pagosFiltro==='descSiniestro'?`<td style="text-align:right;color:#C62828">$${Math.round(p.descSiniestro||0).toLocaleString('es-CL')}</td>`:''}

                        ${pagosFiltro==='extra'?`<td style="text-align:right;color:#1a6b3a">$${Math.round(p.extra||0).toLocaleString('es-CL')}</td>`:''}

                        <td style="text-align:right;font-weight:700;color:${p.totalPagar>=0?'#1a6b3a':'#b03030'}">$${Math.round(p.totalPagar).toLocaleString('es-CL')}</td>

                        <td><span style="padding:2px 10px;border-radius:10px;font-size:10px;font-weight:700;

                          background:${p.estado==='PAGADO'?'rgba(26,107,58,0.12)':'rgba(176,48,48,0.09)'};

                          color:${p.estado==='PAGADO'?'#1a6b3a':'#b03030'}">${p.estado}</span></td>

                      </tr>`).join('');const totalFiltrado=filtrados.reduce((a,p)=>a+p.totalPagar,0);win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>

                    <title>${titulos[pagosFiltro]} - ${semana}</title>

                    <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;padding:24px;background:#FEF8EA;font-size:11px;color:#2b2e20;}

                    .hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #C8A84B;padding-bottom:12px;margin-bottom:18px;}

                    .logo{display:flex;align-items:center;gap:10px;}.logo img{width:50px;height:50px;object-fit:contain;border-radius:7px;}

                    .brand{font-size:18px;font-family:'Bebas Neue',sans-serif;font-weight:900;letter-spacing:2px;color:#2b2e20;}

                    table{width:100%;border-collapse:collapse;}thead tr{background:#2b2e20;}

                    thead th{color:#C8A84B;padding:8px 10px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;}

                    tbody td{padding:7px 10px;border-bottom:1px solid #f0e8d0;}

                    tfoot tr{background:#2b2e20;}tfoot td{color:#C8A84B;padding:8px 10px;font-weight:700;}

                    @media print{body{padding:14px;background:#fff;}}</style></head><body>

                    <div class="hdr">

                      <div class="logo"><img src="${logoSrc}" onerror="this.style.display='none'"/>

                      <div><div class="brand">TRANSPGSO</div>

                      <div style="font-size:9px;color:#7a7d6a;letter-spacing:2px">${titulos[pagosFiltro].toUpperCase()} — ${semana}</div></div></div>

                      <div style="text-align:right">

                        <div style="font-size:20px;font-weight:900;color:${colores[pagosFiltro]}">${filtrados.length}</div>

                        <div style="font-size:9px;color:#7a7d6a;letter-spacing:1px">MENSAJEROS</div>

                        <div style="font-size:13px;font-weight:700;margin-top:4px;color:#1a6b3a">$${Math.round(totalFiltrado).toLocaleString('es-CL')}</div>

                      </div>

                    </div>

                    <table><thead><tr><th>#</th><th>Mensajero</th><th>Envíos</th><th>Pago Bruto</th>

                    ${pagosFiltro==='consumo'?'<th>Consumo</th>':''}

                    ${pagosFiltro==='descSiniestro'?'<th>Siniestro</th>':''}

                    ${pagosFiltro==='extra'?'<th>Extra/Bono</th>':''}

                    <th>Total a Pagar</th><th>Estado</th></tr></thead>

                    <tbody>${filas}</tbody>

                    <tfoot><tr><td></td><td>TOTALES</td><td></td>

                    <td style="text-align:right">$${Math.round(filtrados.reduce((a,p)=>a+p.bruto,0)).toLocaleString('es-CL')}</td>

                    ${pagosFiltro==='consumo'||pagosFiltro==='descSiniestro'||pagosFiltro==='extra'?'<td></td>':''}

                    <td style="text-align:right">$${Math.round(totalFiltrado).toLocaleString('es-CL')}</td>

                    <td></td></tr></tfoot></table>

                    <script>window.onload=()=>{window.print()}<\/script>

                    </body></html>`);win.document.close();},onExcel:()=>{const headers=['#','Mensajero','Envíos','Pago Bruto',...(pagosFiltro==='consumo'?['Consumo Local']:[]),...(pagosFiltro==='descSiniestro'?['Descuento Siniestro']:[]),...(pagosFiltro==='extra'?['Extra/Bono']:[]),'Total a Pagar','Estado'];const rows=filtrados.map((p,i)=>[i+1,p.nombre.replace(/,\s*/g,' '),p.envios,Math.round(p.bruto),...(pagosFiltro==='consumo'?[Math.round(p.consumo||0)]:[]),...(pagosFiltro==='descSiniestro'?[Math.round(p.descSiniestro||0)]:[]),...(pagosFiltro==='extra'?[Math.round(p.extra||0)]:[]),Math.round(p.totalPagar),p.estado]);exportToExcel(titulos[pagosFiltro].replace(/\s/g,'_')+'_'+semana.replace(/\s/g,'_'),[{name:titulos[pagosFiltro].slice(0,31),headers,rows}]);}}),/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setPagosFiltro(null)},"\u2715 Cerrar"))),/*#__PURE__*/React.createElement("div",{className:"table-wrap",style:{maxHeight:360,overflowY:'auto'}},/*#__PURE__*/React.createElement("table",null,/*#__PURE__*/React.createElement("thead",null,/*#__PURE__*/React.createElement("tr",null,

  /*#__PURE__*/React.createElement("th",{style:{width:36,textAlign:'center'}},"#"),

  /*#__PURE__*/React.createElement("th",null,"Mensajero"),

  /*#__PURE__*/React.createElement("th",{style:{textAlign:'center'}},"Envíos"),

  /*#__PURE__*/React.createElement("th",null,"Pago Calc."),

  /*#__PURE__*/React.createElement("th",{style:{color:'var(--danger)'}},"Consumo"),

  /*#__PURE__*/React.createElement("th",{style:{color:'#C62828'}},"Siniestro"),

  /*#__PURE__*/React.createElement("th",{style:{color:'#2980b9'}},"Extra"),

  /*#__PURE__*/React.createElement("th",{style:{color:'#e67e22'}},"Adelanto"),

  /*#__PURE__*/React.createElement("th",{style:{color:'#c0392b'}},"Préstamo"),

  /*#__PURE__*/React.createElement("th",{style:{color:'#c0392b'}},"Saldo Pend."),

  /*#__PURE__*/React.createElement("th",{style:{fontWeight:700}},"Total a Pagar"),

  /*#__PURE__*/React.createElement("th",null,"Estado"),

  /*#__PURE__*/React.createElement("th",{style:{width:40}},""))),/*#__PURE__*/React.createElement("tbody",null,filtrados.map((p,i)=>/*#__PURE__*/React.createElement(React.Fragment,{key:p.id},

  // Fila principal compacta

  /*#__PURE__*/React.createElement("tr",{style:{background:p.estado==='PAGADO'?'rgba(46,125,79,0.06)':'',cursor:'default',borderBottom:'1px solid var(--border)'}},

    /*#__PURE__*/React.createElement("td",{style:{textAlign:'center',fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-soft)',background:'var(--cream)',fontWeight:700}},i+1),

    /*#__PURE__*/React.createElement("td",{style:{fontWeight:700,fontSize:13}},p.nombre.replace(/,\s*/g,' ')),

    /*#__PURE__*/React.createElement("td",{className:"mono",style:{textAlign:'center'}},p.envios),

    /*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--success)',fontWeight:600}},"$",Math.round(p.bruto).toLocaleString('es-CL')),

    /*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--danger)',cursor:'pointer'},onClick:()=>setConsumoModal(p),title:'Clic para editar consumo'},

      "$",Math.round(p.consumo||0).toLocaleString('es-CL'),

      /*#__PURE__*/React.createElement('span',{style:{fontSize:9,marginLeft:3,color:'var(--gold)',opacity:0.7}},'✎')

    ),

    /*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'#C62828'},title:(p.descSiniestro||0)>0?'Descontado desde la sección Siniestros para esta semana':'Sin descuentos por siniestro esta semana'},

      "$",Math.round(p.descSiniestro||0).toLocaleString('es-CL')

    ),

    /*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{style:{width:72,padding:'4px 6px',background:'var(--cream)',border:'1px solid var(--border)',borderRadius:6,color:'#2980b9',fontFamily:'JetBrains Mono',fontSize:11,textAlign:'right',outline:'none'},type:"number",value:p.extra,onChange:e=>updatePago(p.id,'extra',e.target.value),onFocus:e=>e.target.select()})),

    /*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'#e67e22'}},

      p.adelanto>0?"$"+Math.round(p.adelanto).toLocaleString('es-CL'):'—'

    ),

    /*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'#c0392b'}},

      p.prestamo>0?"$"+Math.round(p.prestamo).toLocaleString('es-CL'):'—'

    ),

    /*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'#c0392b',fontWeight:600,cursor:'pointer'},

      onClick:()=>setPrestamosModal(p.nombre),

      title:'Ver historial de préstamos'

    },(()=>{

      const key=p.nombre.toUpperCase().trim();

      const s=(prestamosDB[key]?.saldo)||0;

      return s>0?React.createElement('span',{style:{background:'rgba(192,57,43,0.1)',padding:'2px 6px',borderRadius:4}},'$'+Math.round(s).toLocaleString('es-CL')):'—';

    })()),

    /*#__PURE__*/React.createElement("td",{className:"mono",style:{fontWeight:700,color:p.totalPagar>=0?'var(--success)':'var(--danger)',fontSize:13}},"$",Math.round(p.totalPagar).toLocaleString('es-CL')),

    /*#__PURE__*/React.createElement("td",{style:{textAlign:'center'}},

      /*#__PURE__*/React.createElement('button',{

        onClick:()=>marcarEstado(p),

        style:{padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,

          background:p.estado==='PAGADO'?'rgba(46,125,79,0.15)':'rgba(200,168,75,0.15)',

          color:p.estado==='PAGADO'?'var(--success)':'var(--gold)'}

      },p.estado==='PAGADO'?'✓ PAGADO':'PENDIENTE')

    ),

    /*#__PURE__*/React.createElement("td",{style:{textAlign:'center'}},

      /*#__PURE__*/React.createElement('button',{

        onClick:()=>setExpandido(prev=>({...prev,[p.id]:!prev[p.id]})),

        style:{width:26,height:26,borderRadius:6,border:'1px solid var(--border)',background:'var(--cream)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto',transition:'transform 0.2s',transform:expandido[p.id]?'rotate(180deg)':'rotate(0deg)'}

      },'▾')

    )

  ),

  // Panel expandible con campos avanzados

  expandido[p.id]&&/*#__PURE__*/React.createElement("tr",{style:{background:'rgba(200,168,75,0.03)',borderBottom:'2px solid rgba(200,168,75,0.15)'}},

    /*#__PURE__*/React.createElement("td",{colSpan:12},

      /*#__PURE__*/React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,padding:'12px 16px'}},

        /*#__PURE__*/React.createElement('div',null,

          /*#__PURE__*/React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',letterSpacing:1,textTransform:'uppercase',display:'block',marginBottom:4}},'Tarifa por envío'),

          /*#__PURE__*/React.createElement('input',{type:'number',value:p.tarifa,onChange:e=>updatePago(p.id,'tarifa',e.target.value),

            style:{width:'100%',padding:'6px 10px',borderRadius:6,border:'1px solid var(--border)',fontSize:12,background:'#fff',outline:'none',fontFamily:'JetBrains Mono'}})

        ),

        /*#__PURE__*/React.createElement('div',null,

          /*#__PURE__*/React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',letterSpacing:1,textTransform:'uppercase',display:'block',marginBottom:4}},'Adelanto ($)'),

          /*#__PURE__*/React.createElement('input',{type:'number',value:p.adelanto,onChange:e=>updatePago(p.id,'adelanto',e.target.value),

            style:{width:'100%',padding:'6px 10px',borderRadius:6,border:'1px solid var(--border)',fontSize:12,background:'#fff',outline:'none',fontFamily:'JetBrains Mono',color:'#e67e22'}})

        ),

        /*#__PURE__*/React.createElement('div',null,

          /*#__PURE__*/React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',letterSpacing:1,textTransform:'uppercase',display:'block',marginBottom:4}},'Descontar préstamo esta semana'),

          /*#__PURE__*/React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:4}},

            /*#__PURE__*/React.createElement('input',{type:'number',value:p.prestamo,onChange:e=>updatePago(p.id,'prestamo',e.target.value),

              style:{width:'100%',padding:'6px 10px',borderRadius:6,border:'1px solid rgba(192,57,43,0.4)',fontSize:12,background:'#fff',outline:'none',fontFamily:'JetBrains Mono',color:'#c0392b'}}),

            (()=>{

              const key=p.nombre.toUpperCase().trim();

              const s=(prestamosDB[key]?.saldo)||0;

              if(s>0)return React.createElement('div',{

                style:{fontSize:10,color:'#c0392b',background:'rgba(192,57,43,0.08)',padding:'3px 7px',borderRadius:4,cursor:'pointer'},

                onClick:()=>setPrestamosModal(p.nombre)

              },'Saldo: $'+Math.round(s).toLocaleString('es-CL')+' — ver historial');

              return React.createElement('div',{

                style:{fontSize:10,color:'#888',cursor:'pointer'},

                onClick:()=>setPrestamosModal(p.nombre)

              },'+ Registrar préstamo nuevo');

            })()

          )

        ),

        /*#__PURE__*/React.createElement('div',null,

          /*#__PURE__*/React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',letterSpacing:1,textTransform:'uppercase',display:'block',marginBottom:4}},'Observación'),

          /*#__PURE__*/React.createElement('input',{type:'text',value:p.obs||'',placeholder:'Nota interna...',onChange:e=>updatePago(p.id,'obs',e.target.value),

            style:{width:'100%',padding:'6px 10px',borderRadius:6,border:'1px solid var(--border)',fontSize:12,background:'#fff',outline:'none'}})

        ),

        /*#__PURE__*/React.createElement('div',{style:{display:'flex',alignItems:'flex-end'}},

          /*#__PURE__*/React.createElement('button',{

            onClick:()=>exportarComprobante(p),

            style:{width:'100%',padding:'8px',borderRadius:8,border:'1px solid var(--border)',background:'var(--cream)',color:'var(--text-main)',fontSize:11,cursor:'pointer',fontWeight:600}

          },'🧾 Ver Comprobante')

        )

      )

    )

  ))),filtrados.length===0&&/*#__PURE__*/React.createElement("tr",null,/*#__PURE__*/React.createElement("td",{colSpan:13,className:"empty-state"},"Sin resultados"))))));})(),pagos.length===0&&/*#__PURE__*/React.createElement("div",{className:"info-banner"},"\uD83D\uDCE5 Importa el archivo del d\xEDa primero para generar los pagos autom\xE1ticamente."),pagos.length>0&&/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:10}},/*#__PURE__*/React.createElement("input",{type:'text',placeholder:'🔍 Buscar mensajero...',value:pagosBusqueda,onChange:e=>setPagosBusqueda(e.target.value),style:{flex:'1 1 220px',minWidth:180,padding:'8px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:12,outline:'none'}}),/*#__PURE__*/React.createElement("button",{className:'btn-futurista btn-f-ghost',onClick:()=>setPagosOrden(pagosOrden==='asc'?'desc':pagosOrden==='desc'?null:'asc'),title:'Ordenar alfab\xE9ticamente por mensajero'},pagosOrden==='asc'?'⬇ A-Z':pagosOrden==='desc'?'⬆ Z-A':'↕ Ordenar A-Z'),/*#__PURE__*/React.createElement("div",{style:{display:'flex',border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}},React.createElement("button",{onClick:()=>setPagosVista('tabla'),style:{padding:'7px 12px',border:'none',cursor:'pointer',fontSize:11,fontWeight:700,background:pagosVista==='tabla'?'rgba(200,168,75,0.15)':'transparent',color:pagosVista==='tabla'?'var(--gold)':'var(--text-soft)'}},'☰ Tabla'),React.createElement("button",{onClick:()=>setPagosVista('tarjetas'),style:{padding:'7px 12px',border:'none',cursor:'pointer',fontSize:11,fontWeight:700,background:pagosVista==='tarjetas'?'rgba(200,168,75,0.15)':'transparent',color:pagosVista==='tarjetas'?'var(--gold)':'var(--text-soft)'}},'🪪 Tarjetas')),pagosBusqueda&&/*#__PURE__*/React.createElement("button",{className:'btn-secondary',onClick:()=>setPagosBusqueda('')},'✕ Limpiar'),(pagosBusqueda||pagosOrden)&&/*#__PURE__*/React.createElement("span",{style:{fontSize:11,color:'var(--text-soft)'}},pagosMostrados.length," de ",pagos.length," mensajeros")),vistaPreviaSinCriterio&&/*#__PURE__*/React.createElement("div",{style:{background:'rgba(176,48,48,0.08)',border:'1px solid var(--danger)',borderRadius:8,padding:'8px 14px',marginBottom:10,fontSize:12,fontWeight:700,color:'var(--danger)',display:'flex',alignItems:'center',gap:8}},"👁️ VISTA PREVIA: se están mostrando los montos SIN el bono/descuento por efectividad -- esto es solo para comparar, no cambia ni guarda nada. Clic en \"Viendo: SIN Efectividad\" para volver a los montos reales."),/*#__PURE__*/pagosVista==='tabla'?React.createElement("div",{className:"table-wrap"},/*#__PURE__*/React.createElement("table",null,/*#__PURE__*/React.createElement("thead",null,/*#__PURE__*/React.createElement("tr",null,React.createElement("th",{style:{width:36,textAlign:"center"}},"#"),React.createElement("th",null,"Mensajero"),React.createElement("th",{style:{textAlign:"center"}},"Envíos"),React.createElement("th",{style:{textAlign:"center"}},"Tarifa"),React.createElement("th",null,"Pago Calc."),React.createElement("th",{style:{color:"var(--danger)"}},"Consumo"),React.createElement("th",{style:{color:"#C62828"}},"Siniestro"),React.createElement("th",{style:{color:"#2980b9"}},"Extra"),React.createElement("th",{style:{color:"#7a6ba8",textAlign:"center"}},"Efectividad"),React.createElement("th",{style:{color:"#7a6ba8"}},"Bono Efect."),React.createElement("th",{style:{color:"#b03030"}},"Desc. Efect."),React.createElement("th",{style:{color:"#e67e22"}},"Adelanto"),React.createElement("th",{style:{color:"#c0392b"}},"Préstamo"),React.createElement("th",{style:{color:"#c0392b"}},"Saldo Pend."),React.createElement("th",{style:{fontWeight:700}},"Total a Pagar"),React.createElement("th",null,"Estado"),React.createElement("th",null,"Nota"),React.createElement("th",{style:{width:60}},"Acc."))),/*#__PURE__*/React.createElement("tbody",null,pagosMostrados.map((p,i)=>((m)=>/*#__PURE__*/React.createElement("tr",{key:p.id,style:{background:p.estado==='PAGADO'?'rgba(46,125,79,0.04)':''}},/*#__PURE__*/React.createElement("td",{style:{textAlign:'center',fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-soft)',background:'var(--cream)',fontWeight:700}},i+1),/*#__PURE__*/React.createElement("td",{style:{fontWeight:700,whiteSpace:'nowrap'}},p.nombre.replace(/,\s*/g,' ')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{textAlign:'center'}},p.envios),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{style:{width:72,padding:'4px 6px',background:'var(--cream)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text)',fontFamily:'JetBrains Mono',fontSize:11,textAlign:'right',outline:'none'},type:"number",value:p.tarifa,onChange:e=>updatePago(p.id,'tarifa',e.target.value),onFocus:e=>e.target.select()})),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--success)',fontWeight:600}},"$",Math.round(p.bruto).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--danger)',cursor:'pointer',fontWeight:600},onClick:()=>setConsumoModal(p),title:'Clic para registrar consumo'},"$",Math.round(p.consumo||0).toLocaleString('es-CL'),/*#__PURE__*/React.createElement('span',{style:{fontSize:9,marginLeft:3,color:'var(--gold)',opacity:0.7}},'✎')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'#C62828',fontWeight:600},title:(p.descSiniestro||0)>0?'Descontado desde la sección Siniestros para esta semana':'Sin descuentos por siniestro esta semana'},"$",Math.round(p.descSiniestro||0).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{style:{width:72,padding:'4px 6px',background:'var(--cream)',border:'1px solid var(--border)',borderRadius:6,color:'var(--success)',fontFamily:'JetBrains Mono',fontSize:11,textAlign:'right',outline:'none'},type:"number",value:p.extra,onChange:e=>updatePago(p.id,'extra',e.target.value),onFocus:e=>e.target.select()})),/*#__PURE__*/React.createElement("td",{className:"mono",style:{textAlign:'center',color:p.efectividad==null?'var(--text-soft)':(p.efectividad>=0.95?'var(--success)':'var(--danger)'),fontWeight:600},title:p.asignados?p.envios+' entregados de '+p.asignados+' asignados':'Sin datos de asignados (requiere "Calcular Envíos Semana" con el bono activo)'},p.efectividad!=null?(p.efectividad*100).toFixed(1)+'%':'—'),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:(m.bono||0)>0?'#7a6ba8':'var(--text-soft)',fontWeight:600},title:'Bono automático por efectividad (ver botón \uD83C\uDFAF Criterio Efectividad)'},"$",Math.round(m.bono||0).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:(m.desc||0)>0?'var(--danger)':'var(--text-soft)',fontWeight:600},title:'Descuento automático por incumplir efectividad (ver botón \uD83C\uDFAF Criterio Efectividad)'},"$",Math.round(m.desc||0).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{style:{width:72,padding:'4px 6px',background:'var(--cream)',border:'1px solid rgba(176,48,48,0.3)',borderRadius:6,color:'var(--danger)',fontFamily:'JetBrains Mono',fontSize:11,textAlign:'right',outline:'none'},type:"number",value:p.adelanto,onChange:e=>updatePago(p.id,'adelanto',e.target.value),onFocus:e=>e.target.select()})),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{style:{width:72,padding:'4px 6px',background:'var(--cream)',border:'1px solid rgba(176,48,48,0.3)',borderRadius:6,color:'var(--danger)',fontFamily:'JetBrains Mono',fontSize:11,textAlign:'right',outline:'none'},type:"number",value:p.prestamo,onChange:e=>updatePago(p.id,'prestamo',e.target.value),onFocus:e=>e.target.select()})),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:"#c0392b",fontWeight:600,cursor:"pointer"},onClick:()=>setPrestamosModal(p.nombre),title:"Ver historial de préstamos"},(()=>{const key=p.nombre.toUpperCase().trim();const s=(prestamosDB[key]&&prestamosDB[key].saldo)||0;return s>0?"$"+Math.round(s).toLocaleString('es-CL'):'—';})()),/*#__PURE__*/React.createElement("td",{style:{fontFamily:'JetBrains Mono',fontWeight:700,fontSize:12,color:m.total>=0?'var(--success)':'var(--danger)',whiteSpace:'nowrap'}},"$",Math.round(m.total).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("select",{value:p.estado,onChange:e=>marcarEstado(p,e.target.value),style:{padding:'4px 8px',borderRadius:6,border:'1px solid var(--border)',background:p.estado==='PAGADO'?'rgba(46,125,79,0.1)':'rgba(176,48,48,0.06)',color:p.estado==='PAGADO'?'var(--success)':'var(--danger)',fontWeight:700,fontSize:11,cursor:'pointer',outline:'none'}},/*#__PURE__*/React.createElement("option",{value:"PENDIENTE"},"PENDIENTE"),/*#__PURE__*/React.createElement("option",{value:"PAGADO"},"PAGADO"))),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{style:{width:100,padding:'4px 6px',background:'var(--cream)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text)',fontSize:11,outline:'none'},placeholder:"Nota...",value:p.obs,onChange:e=>updatePago(p.id,'obs',e.target.value)})),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("button",{className:"action-btn btn-edit",onClick:()=>exportarComprobante(p),title:"Exportar comprobante"},"\uD83D\uDCC4"))))(montoPago(p))),/*#__PURE__*/React.createElement("tr",{className:"totales-row"},/*#__PURE__*/React.createElement("td",null),/*#__PURE__*/React.createElement("td",{style:{fontFamily:'Bebas Neue',fontSize:13,letterSpacing:1}},"TOTALES"),/*#__PURE__*/React.createElement("td",{className:"mono",style:{textAlign:'center',fontWeight:700}},totales.envios.toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",null),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--success)',fontWeight:700}},"$",Math.round(totales.bruto).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--danger)'}},"$",Math.round(totales.consumo).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'#C62828'}},"$",Math.round(totales.descSiniestro||0).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--success)'}},"$",Math.round(totales.extra).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",null),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'#7a6ba8',fontWeight:700}},"$",Math.round(totales.bonoEfectividad||0).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--danger)',fontWeight:700}},"$",Math.round(totales.descuentoEfectividad||0).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--danger)'}},"$",Math.round(totales.adelanto).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--danger)'}},"$",Math.round(totales.prestamo).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",null),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--success)',fontWeight:700,fontSize:13}},"$",Math.round(totales.total).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",null),/*#__PURE__*/React.createElement("td",null),/*#__PURE__*/React.createElement("td",{style:{color:'var(--text-soft)',fontSize:12}},totales.pagados," pag. / ",totales.pendientes," pend."))))):React.createElement(PagosTarjetas,{pagos:pagosMostrados,montoPago:montoPago,updatePago:updatePago,marcarEstado:marcarEstado,setConsumoModal:setConsumoModal,setPrestamosModal:setPrestamosModal,exportarComprobante:exportarComprobante,prestamosDB:prestamosDB,setPenalizacionModal:setPenalizacionModal})),

  pp.historial&&/*#__PURE__*/React.createElement("div",{className:"pm-tab-historial",style:{display:pagosTab==='historial'?'block':'none',padding:'0 20px 20px'}},/*#__PURE__*/React.createElement(HistorialCierres,{db:db})),pp.retiros&&/*#__PURE__*/React.createElement("div",{className:"pm-tab-retiros"},

  /*#__PURE__*/React.createElement(PlanillaRetiros,{clientes:clientes,mensajeros:mensajeros,retirosDB:retirosDB,setRetirosDB:setRetirosDB,retiroFecha:retiroFecha,setRetiroFecha:setRetiroFecha,toast:toast})

),

  pp.productos&&/*#__PURE__*/React.createElement("div",{className:"pm-tab-productos"},/*#__PURE__*/React.createElement("div",{className:"section-head"},/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:14,letterSpacing:1.5,color:'var(--dark)'}},"Productos en Venta"),/*#__PURE__*/React.createElement("button",{className:"btn-add",onClick:function(){var nid=Math.max.apply(null,[0].concat(productosLocal.map(function(p){return p.id;}))).valueOf()+1;setProductosLocal(function(prev){return prev.concat([{id:nid,nombre:'',precio:0,activo:true}]);});}},"+ Agregar")),/*#__PURE__*/React.createElement("div",{className:"table-wrap"},/*#__PURE__*/React.createElement("table",null,/*#__PURE__*/React.createElement("thead",null,/*#__PURE__*/React.createElement("tr",null,/*#__PURE__*/React.createElement("th",null,"Producto"),/*#__PURE__*/React.createElement("th",{style:{width:160}},"Precio ($)"),/*#__PURE__*/React.createElement("th",{style:{width:80,textAlign:"center"}},"Activo"),/*#__PURE__*/React.createElement("th",{style:{width:50}}))),/*#__PURE__*/React.createElement("tbody",null,productosLocal.map(function(p,i){return/*#__PURE__*/React.createElement("tr",{key:p.id,style:{background:i%2===0?"#fff":"var(--cream)"}},/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{className:"form-input",value:p.nombre,placeholder:"Ej: Almuerzo",onChange:function(e){var v=e.target.value;setProductosLocal(function(prev){return prev.map(function(x){return x.id===p.id?Object.assign({},x,{nombre:v}):x;});});},style:{margin:0}})),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{className:"form-input",type:"number",value:p.precio,onChange:function(e){var v=parseInt(e.target.value)||0;setProductosLocal(function(prev){return prev.map(function(x){return x.id===p.id?Object.assign({},x,{precio:v}):x;});});},style:{margin:0}})),/*#__PURE__*/React.createElement("td",{style:{textAlign:"center"}},/*#__PURE__*/React.createElement("span",{style:{color:p.activo!==false?"var(--success)":"var(--text-soft)",fontWeight:700}},p.activo!==false?"✓":"○")),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("button",{onClick:function(){var pid=p.id;setProductosLocal(function(prev){return prev.filter(function(x){return x.id!==pid;});});},style:{padding:"4px 8px",borderRadius:6,border:"none",background:"rgba(176,48,48,0.1)",color:"#b03030",cursor:"pointer",fontSize:12}},"x")));}))))),(pp.consumo!==false)&&/*#__PURE__*/React.createElement("div",{className:"pm-tab-consumo",style:{padding:'0 20px 20px'}},/*#__PURE__*/React.createElement(ConsumoDiario,{mensajeros:mensajeros,pagos:pagos,productosLocal:productosLocal,semana:semana,toast:toast,onConsumoGuardado:function(){sincronizarConsumoDesdeDB(semana);},onAbrirDetalle:function(m){
  var nombreNorm=(m.nombre||'').toUpperCase().replace(/,\s*/g,' ').replace(/\s+/g,' ').trim();
  var pago=pagos.find(function(p){return p.nombre.toUpperCase().replace(/,\s*/g,' ').replace(/\s+/g,' ').trim()===nombreNorm;});
  if(pago)setConsumoModal(pago);else toast&&toast('⚠ Aún no aparece en la tabla de Pagos de esta semana.');
}})),consumoModal&&React.createElement(ConsumoModal,{p:consumoModal,semana:semana,productosLocal:productosLocal,toast:toast,onClose:()=>setConsumoModal(null),onTotalChange:function(total){updatePago(consumoModal.id,'consumo',total);}}),penalizacionModal&&React.createElement(PenalizacionModal,{p:penalizacionModal,toast:toast,onClose:()=>setPenalizacionModal(null),onAplicar:function(item){aplicarPenalizacion(penalizacionModal.id,item);},onEliminar:function(itemId){eliminarPenalizacion(penalizacionModal.id,itemId);}}),criterioModalAbierto&&React.createElement(CriterioEfectividadModal,{criterio:criterioEf,onGuardar:setCriterioEf,onClose:()=>setCriterioModalAbierto(false)})));}

window.PagosMensajeros = PagosMensajeros;

})();
