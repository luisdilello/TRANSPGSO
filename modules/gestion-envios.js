(function(){
var useEffect=React.useEffect, useMemo=React.useMemo, useRef=React.useRef, useState=React.useState;
var AdminEditarEnvio=window.__app.AdminEditarEnvio, abrirVentanaEtiquetas=window.__app.abrirVentanaEtiquetas, COMUNAS_CHILE=window.__app.COMUNAS_CHILE, ESTADOS_ENVIO=window.__app.ESTADOS_ENVIO, EnvioDetalleCard=window.__app.EnvioDetalleCard, EtiquetaPreview=window.__app.EtiquetaPreview, ExportBtn=window.__app.ExportBtn, FotosEntregaConRecarga=window.__app.FotosEntregaConRecarga, Modal=window.__app.Modal, matchComuna=window.__app.matchComuna, esComunaValida=window.__app.esComunaValida, confirmarCodigo=window.__app.confirmarCodigo, crearEntradaHistorial=window.__app.crearEntradaHistorial, db=window.__app.db, diasDesdeFecha=window.__app.diasDesdeFecha, esEnvioAtrasado=window.__app.esEnvioAtrasado, UMBRAL_ATRASO_DIAS=window.__app.UMBRAL_ATRASO_DIAS, calcularBaseTardio=window.__app.calcularBaseTardio, esEnvioTardio=window.__app.esEnvioTardio, horasTardanza=window.__app.horasTardanza, UMBRAL_TARDIO_HORAS=window.__app.UMBRAL_TARDIO_HORAS, estadoBadge=window.__app.estadoBadge, estadoInfo=window.__app.estadoInfo, exportToExcel=window.__app.exportToExcel, fechaHoyCL=window.__app.fechaHoyCL, imprimirFotoEtiqueta=window.__app.imprimirFotoEtiqueta, lsLoad=window.__app.lsLoad, lsSave=window.__app.lsSave, normalizarNombre=window.__app.normalizarNombre, perfil=window.__app.perfil, playSound=window.__app.playSound, subirFotoStorage=window.__app.subirFotoStorage, sbRegistrarHistorial=window.__app.sbRegistrarHistorial, sbRegistrarHistorialLote=window.__app.sbRegistrarHistorialLote, fetchPaginadoParalelo=window.__app.fetchPaginadoParalelo, fetchPorDiasParalelo=window.__app.fetchPorDiasParalelo, fetchEntregadosPorFechaReal=window.__app.fetchEntregadosPorFechaReal, fetchPorFechaRealDeEstado=window.__app.fetchPorFechaRealDeEstado, calcularEstadoEfectivo=window.__app.calcularEstadoEfectivo, limiteDiaChileUTC=window.__app.limiteDiaChileUTC;
function GestionEnvios(_ref26){var _detalleEnvio$mensaje;let mensajeros=_ref26.mensajeros,clientes=_ref26.clientes,toast=_ref26.toast,esSuperAdmin=_ref26.esSuperAdmin,esAdmin=_ref26.esAdmin,usuario=_ref26.usuario,codigoInicial=_ref26.codigoInicial,onCodigoInicialConsumido=_ref26.onCodigoInicialConsumido;const _useState60=useState(()=>lsLoad('gestion_envios',[])),envios=_useState60[0],setEnvios=_useState60[1];const _useState61=useState('lista'),subTab=_useState61[0],setSubTab=_useState61[1];const _useState62=useState(''),search=_useState62[0],setSearch=_useState62[1];const _useState63=useState('todos'),filtroEst=_useState63[0],setFiltroEst=_useState63[1];const _useState64=useState('todos'),filtroCli=_useState64[0],setFiltroCli=_useState64[1];const _useState65=useState('todos'),filtroMen=_useState65[0],setFiltroMen=_useState65[1];const _useState65b=useState('todos'),filtroFuente=_useState65b[0],setFiltroFuente=_useState65b[1];
// Vista de las tarjetas de estado (y de la tabla al filtrar por una de ellas): 'cierre' (default,
// como siempre funcionó) muestra el estado que tenía cada código AL CIERRE del período elegido
// (Entregado/Retorno por su fecha real de evento, el resto congelado al último día del rango).
// 'actual' es la vista nueva que pidió Luis: para los mismos códigos DESPACHADOS en el rango,
// muestra su estado EN VIVO tal cual está ahora mismo, sin congelar nada -- por eso en este modo
// Entregado/Retorno también se calculan igual que el resto (contra enviosPeriodo/e.estado en vivo)
// en vez de usar sus listas de fecha real. Se guarda en localStorage para que no se resetee cada
// vez que se abre la pantalla.
const _useVistaEst=useState(()=>lsLoad('ge_vista_estado','cierre')),vistaEstado=_useVistaEst[0],setVistaEstado=_useVistaEst[1];
useEffect(function(){lsSave('ge_vista_estado',vistaEstado);},[vistaEstado]);
// NUEVO 2026-09-22 (vista 'fusion', "Recibido + Resuelto"): las tarjetas siempre muestran los dos
// números a la vez (recibido y resuelto). Para la TABLA/export de abajo, en vez de pedirle a Luis
// que elija manualmente entre los dos criterios (eso fue lo primero que se probó, pero generaba
// confusión: Retorno daba 16 con un criterio y 25 con el otro, y Luis SIEMPRE necesita el 25 --
// ver hilo "no entiendes o que?"), el sistema decide solo, por estado, igual que 'cierre':
// -- 'Todos' y el resto de los estados (Reprogramado, Cancelado, Siniestro, En Bodega, En Ruta)
//    usan "recibido" (despachado en el rango) -- coincide con el pivot de Luis por Fecha Recepción
//    y con el badge "recibidos en el período".
// -- Entregado y Retorno SIEMPRE usan "resuelto" (fecha REAL del evento, sin importar cuándo se
//    despachó) -- igual que en 'cierre', y como establecen los fixes históricos "Retorno usa
//    fecha real de gestion, no fecha de despacho" / Entregado con fecha real de entrega. Un envío
//    despachado el 29-08 pero retornado el 05-09 (dentro del rango elegido) cuenta como retorno de
//    este período -- coincide con el badge "retorno resuelto en el período", que nunca cambia.
// La vista 'actual' (estado en vivo) no se toca -- sigue exactamente igual que antes.
const usaRecibido=vistaEstado==='actual'||(vistaEstado==='fusion'&&filtroEst!=='entregado'&&filtroEst!=='retorno');
// Antes "⚠ Atrasados" era un simple interruptor on/off que solo miraba envíos 'en_ruta' con
// UMBRAL_ATRASO_DIAS+ días sin entregar. Luis pidió que también se puedan ver ahí los envíos que
// llevan 2 o más veces en estado Reprogramado (sin importar hace cuántos días fue la última
// reagenda) -- así que ahora es un desplegable de 3 modos: 'combinado' (junta ambos grupos,
// modo por defecto), 'atrasados' (solo el criterio de siempre) y 'reprogramados' (solo los
// reprogramados 2+ veces). 'off' apaga el filtro y muestra todo, como antes al hacer clic de
// nuevo en el botón.
const _useFiltroAtrasoModo=useState('off'),filtroAtrasoModo=_useFiltroAtrasoModo[0],setFiltroAtrasoModo=_useFiltroAtrasoModo[1];
const _useAtrasoDropdown=useState(false),atrasoDropdownOpen=_useAtrasoDropdown[0],setAtrasoDropdownOpen=_useAtrasoDropdown[1];
// Modal de detalle completo: se abre al hacer clic en el botón "⚠ Atrasados" (no en la flechita
// ▾, que sigue abriendo el desplegable de modo). Muestra cada pieza no entregada con toda su
// información (estilo Consulta Express) y el motivo real de la reagenda/atraso, con un botón
// para exportar el mismo informe en Word y HTML.
const _useAtrasadosDetalle=useState(false),atrasadosDetalleOpen=_useAtrasadosDetalle[0],setAtrasadosDetalleOpen=_useAtrasadosDetalle[1];
const atrasoDropdownRef=useRef();
useEffect(function(){
  function handler(e){if(atrasoDropdownRef.current&&!atrasoDropdownRef.current.contains(e.target))setAtrasoDropdownOpen(false);}
  document.addEventListener('mousedown',handler);
  return function(){document.removeEventListener('mousedown',handler);};
},[]);
// Motivos de reagenda cargados por el admin (tabla 'configuracion', clave 'motivos_reprogramacion')
// -- se usan tanto en el modal de administración de motivos (más abajo) como para mostrar el
// motivo real (en vez de la nota cruda) al exportar el HTML por cliente.
const _useMotivosAdmin=useState([]),motivosAdmin=_useMotivosAdmin[0],setMotivosAdmin=_useMotivosAdmin[1];
const _useMotivosModal=useState(false),motivosModalOpen=_useMotivosModal[0],setMotivosModalOpen=_useMotivosModal[1];
useEffect(function(){
  (async function(){
    try{
      const{data}=await db.from('configuracion').select('valor').eq('clave','motivos_reprogramacion').maybeSingle();
      if(data&&Array.isArray(data.valor))setMotivosAdmin(data.valor);
    }catch(e){}
  })();
},[]);
const _motivosCargados=useRef(false);
useEffect(function(){if(motivosAdmin.length>0)_motivosCargados.current=true;},[motivosAdmin]);
useEffect(function(){
  if(!_motivosCargados.current&&motivosAdmin.length===0)return;
  const t=setTimeout(function(){
    db.from('configuracion').upsert({clave:'motivos_reprogramacion',valor:motivosAdmin,updated_at:new Date().toISOString()},{onConflict:'clave'}).then(function(r){if(r&&r.error)console.warn('Motivos reagenda: error guardando:',r.error.message);});
  },800);
  return function(){clearTimeout(t);};
},[motivosAdmin]);
// Tasa de Gestión (Fase 1 - fundación): interruptor on/off para pedirle foto+GPS al mensajero
// al Reprogramar/Cancelar (tabla 'configuracion', clave 'gestion_verificada_geo'). Luis pidió
// explícitamente que se pueda apagar para emergencias -- así el mensajero nunca queda bloqueado
// si hace falta despachar rápido y sin complicaciones. Por ahora esto SOLO guarda la evidencia
// (ver EnvioAccion en la app del mensajero); todavía no se muestra ninguna métrica con esto.
const _useGestionGeoCfg=useState({activo:false,radio_metros:150,estados:['reprogramado']}),gestionGeoCfg=_useGestionGeoCfg[0],setGestionGeoCfg=_useGestionGeoCfg[1];
const _useGestionGeoModal=useState(false),gestionGeoModalOpen=_useGestionGeoModal[0],setGestionGeoModalOpen=_useGestionGeoModal[1];
const _gestionGeoCargado=useRef(false);
useEffect(function(){
  (async function(){
    try{
      const{data}=await db.from('configuracion').select('valor').eq('clave','gestion_verificada_geo').maybeSingle();
      // 'cancelado' se filtra siempre, aunque quede guardado en la config vieja -- ver comentario
      // en el texto de arriba: nunca implica una visita real al domicilio del cliente.
      if(data&&data.valor&&typeof data.valor==='object')setGestionGeoCfg({activo:!!data.valor.activo,radio_metros:data.valor.radio_metros||150,estados:(Array.isArray(data.valor.estados)?data.valor.estados:['reprogramado']).filter(function(x){return x==='reprogramado';})});
    }catch(e){}
    _gestionGeoCargado.current=true;
  })();
},[]);
useEffect(function(){
  if(!_gestionGeoCargado.current)return;
  const t=setTimeout(function(){
    db.from('configuracion').upsert({clave:'gestion_verificada_geo',valor:gestionGeoCfg,updated_at:new Date().toISOString()},{onConflict:'clave'}).then(function(r){if(r&&r.error)console.warn('Gestión verificada GPS: error guardando:',r.error.message);});
  },800);
  return function(){clearTimeout(t);};
},[gestionGeoCfg]);
// Conteo real de cuántas veces cada envío actualmente Reprogramado pasó por ese estado --
// no se puede confiar en el campo local envio.historial (para envíos recién sincronizados desde
// Supabase solo trae un placeholder de un solo evento, ver el merge de sincronizarDesdeSupabase),
// así que se consulta historial_envios directo, agrupando por código, solo para los códigos que
// AHORA MISMO están en Reprogramado (el resto no importa para este conteo).
const _useReprogCount=useState({}),reprogCount=_useReprogCount[0],setReprogCount=_useReprogCount[1];
const codigosReprogramadosActuales=useMemo(function(){return envios.filter(function(e){return e.estado==='reprogramado';}).map(function(e){return e.codigo;});},[envios]);
useEffect(function(){
  let cancelado=false;
  (async function(){
    if(codigosReprogramadosActuales.length===0){if(!cancelado)setReprogCount({});return;}
    try{
      const conteo={};
      const BATCH=200;
      for(let i=0;i<codigosReprogramadosActuales.length;i+=BATCH){
        const lote=codigosReprogramadosActuales.slice(i,i+BATCH);
        const{data}=await db.from('historial_envios').select('codigo_envio').eq('estado','reprogramado').in('codigo_envio',lote);
        (data||[]).forEach(function(row){conteo[row.codigo_envio]=(conteo[row.codigo_envio]||0)+1;});
      }
      if(!cancelado)setReprogCount(conteo);
    }catch(e){console.warn('Conteo reprogramados error:',e.message);}
  })();
  return function(){cancelado=true;};
},[codigosReprogramadosActuales.join(',')]);
function esReprogramadoRepetido(e){return e.estado==='reprogramado'&&(reprogCount[e.codigo]||0)>=2;}
// NUEVO: Luis pidió que el modal de "Detalle completo" de Atrasados muestre TODAS las piezas
// reprogramadas sin importar cuántas veces (antes solo entraban desde la 2da reprogramación,
// igual que el filtro rápido de la tabla). Este criterio más amplio se usa SOLO en ese modal --
// la tabla principal, su dropdown de filtro rápido y exportarHTMLPorCliente siguen exigiendo 2+.
function esReprogramadoAlMenos1Vez(e){return e.estado==='reprogramado';}
const _useSortCol=useState(null),sortCol=_useSortCol[0],setSortCol=_useSortCol[1];const _useSortDir=useState('asc'),sortDir=_useSortDir[0],setSortDir=_useSortDir[1];const _useState66=useState(new Set()),selected=_useState66[0],setSelected=_useState66[1];const _useState67=useState(false),asignarModal=_useState67[0],setAsignarModal=_useState67[1];const _useState68=useState(''),mensajeroAsignar=_useState68[0],setMensajeroAsignar=_useState68[1];const _useState69=useState(null),detalleEnvio=_useState69[0],setDetalleEnvio=_useState69[1];const _useHistReal=useState([]),historialReal=_useHistReal[0],setHistorialReal=_useHistReal[1];const _useFotosReloadKey=useState(0),fotosReloadKey=_useFotosReloadKey[0],setFotosReloadKey=_useFotosReloadKey[1];const _useHistCarg=useState(false),cargandoHistorial=_useHistCarg[0],setCargandoHistorial=_useHistCarg[1];const _useEntregasReal=useState({}),entregasReal=_useEntregasReal[0],setEntregasReal=_useEntregasReal[1];const _useState70=useState(1),page=_useState70[0],setPage=_useState70[1];const _useState71=useState(false),sincronizando=_useState71[0],setSincronizando=_useState71[1];const _useState71b=useState(false),showListaNegra=_useState71b[0],setShowListaNegra=_useState71b[1];const _useState71cc=useState(false),cambiarClienteModal=_useState71cc[0],setCambiarClienteModal=_useState71cc[1];const _useState71tt=useState(false),showTardiosModal=_useState71tt[0],setShowTardiosModal=_useState71tt[1];const _useState71dd=useState(''),clienteCambio=_useState71dd[0],setClienteCambio=_useState71dd[1];
const _useState71c=useState(false),showPDFModal=_useState71c[0],setShowPDFModal=_useState71c[1];
const _useState71d=useState(''),clientePDF=_useState71d[0],setClientePDF=_useState71d[1];
const _useState71e=useState(null),pdfPreview=_useState71e[0],setPdfPreview=_useState71e[1];
const _useState71f=useState(false),procesandoPDF=_useState71f[0],setProcesandoPDF=_useState71f[1];
const _useState71g=useState(''),progresoPDF=_useState71g[0],setProgresoPDF=_useState71g[1];
const _uPerGE=useState('hoy'),periodo=_uPerGE[0],setPeriodo=_uPerGE[1];
const _uMesGE=useState(new Date().toISOString().slice(0,7)),mesFiltro=_uMesGE[0],setMesFiltro=_uMesGE[1];
const _uD1GE=useState(''),desde=_uD1GE[0],setDesde=_uD1GE[1];
const _uD2GE=useState(''),hasta=_uD2GE[0],setHasta=_uD2GE[1];
const pdfRef=useRef();const _usePS=useState(50),PAGE_SIZE=_usePS[0],setPageSize=_usePS[1];const edicionesRecientesRef=useRef({});useEffect(()=>{lsSave('gestion_envios',envios);},[envios]);
// ── Confirmación de cambios críticos ────────────────────────────────
// Antes, cambiar mensajero/cliente/comuna/estado (en la tabla o en el detalle) se aplicaba
// al toque -- ni bien se elegía la opción, la fila se iba de inmediato a otro filtro/estado --
// y eso generaba errores constantes porque era imposible revisar o recordar cuál era el valor
// anterior. Ahora esos 4 campos piden confirmación (mostrando el valor anterior y el nuevo)
// antes de aplicar el cambio de verdad; el resto de los campos (monto, nota, teléfono, etc.)
// se siguen guardando al instante como hasta ahora.
const _useConfirmCambio=useState(null),confirmCambio=_useConfirmCambio[0],setConfirmCambio=_useConfirmCambio[1]; // {campoLabel,anterior,nuevo,ejecutar}
function pedirConfirmacionCambio(campoLabel,anterior,nuevo,ejecutar){
  setConfirmCambio({campoLabel,anterior,nuevo,ejecutar});
}
function aplicarConfirmCambio(){
  const c=confirmCambio;
  setConfirmCambio(null);
  if(c&&typeof c.ejecutar==='function') c.ejecutar();
}
function cancelarConfirmCambio(){
  // Antes esto quedaba mudo -- si un operador tocaba fuera del cuadro sin querer (muy fácil
  // trabajando rápido, fila tras fila) el cambio se cancelaba sin ningún aviso: la fila se
  // quedaba igual que antes y parecía que el sistema "no hizo caso", así que volvían a
  // intentarlo varias veces. Ahora siempre se avisa qué pasó.
  setConfirmCambio(null);
  toast('✕ Cambio cancelado — no se modificó nada');
}
// 'Retorno' solo lo puede colocar un admin o super admin (a pedido de Luis: hasta ahora el estado
// terminal era 'Cancelado' y no habia forma de anotar/verificar el retorno fisico a bodega).
// Los operadores ven y filtran envios en 'Retorno' igual que cualquier otro estado, pero no
// pueden asignarselo — se les oculta de todos los botones/selectores que ESCRIBEN el estado.
const estadosEditables=useMemo(()=>(esAdmin||esSuperAdmin)?ESTADOS_ENVIO:ESTADOS_ENVIO.filter(est=>!est.soloAdmin),[esAdmin,esSuperAdmin]);
useEffect(()=>{sincronizarDesdeSupabase();const _autoSyncInterval=setInterval(sincronizarDesdeSupabase,180000);return()=>clearInterval(_autoSyncInterval);},[periodo,mesFiltro,desde,hasta]);// Antes cada 60s: se sube a 3 min (igual que los otros dos auto-refrescos de esta pantalla, ver más abajo) -- es de solo lectura, no necesita ser al segundo, y así no se repiten 3 consultas por minuto por cada pestaña de Gestión de Envíos que quede abierta.// Igual que el sistema anterior de Luis: por defecto solo trae el DIA EN CURSO (rapido), y solo trae
// mas cuando el usuario cambia de periodo (Semana/Mes/Rango). Antes se traia SIEMPRE la tabla
// completa cada 60s sin importar el filtro visible, lo que iba a pesar cada vez mas a medida
// que crece el historico. Este helper calcula el rango de fechas exacto para el periodo activo
// (mismo criterio que enPeriodoGE, mas abajo) y se lo pasamos a Supabase para que filtre alla,
// no acá en el navegador.
function limitesPeriodoGE(){
  const hoy=fechaHoyCL();
  if(periodo==='hoy')return{desde:hoy,hasta:hoy};
  if(periodo==='ayer'){const d=new Date(hoy+'T12:00:00');d.setDate(d.getDate()-1);const ay=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return{desde:ay,hasta:ay};}
  if(periodo==='semana'){const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));const lunes=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return{desde:lunes,hasta:hoy};}
  if(periodo==='mes'){const mes=mesFiltro||hoy.slice(0,7);const[y,m]=mes.split('-').map(Number);const ultimoDia=new Date(y,m,0).getDate();return{desde:mes+'-01',hasta:mes+'-'+String(ultimoDia).padStart(2,'0')};}
  if(periodo==='rango')return{desde:desde||null,hasta:hasta||null};
  return{desde:null,hasta:null};
}
// El bucket 'Entregado' (tarjeta, lista y export) usa la fecha REAL de entrega
// (historial_envios), no la fecha de despacho como el resto de los buckets (En Bodega, En Ruta,
// Reprogramado, etc.) -- este es el mismo criterio que ya usan Pagos Mensajeros y la app del
// mensajero para calcular lo que se paga. Por eso puede haber paquetes despachados ANTES del
// periodo elegido pero entregados DENTRO de el (o viceversa): 'Entregado' deja de ser un
// subconjunto de 'Todos' (que sigue siendo por fecha de despacho) -- es la naturaleza de la
// pregunta ("¿que se entrego esta semana?" es distinto de "¿que se despacho esta semana?").
const _uEntPerReal=useState([]),entregadosPeriodoReal=_uEntPerReal[0],setEntregadosPeriodoReal=_uEntPerReal[1];
const _uCargEntReal=useState(false),cargandoEntregadosReal=_uCargEntReal[0],setCargandoEntregadosReal=_uCargEntReal[1];
async function cargarEntregadosPeriodoReal(){
  const{desde:desdeQ,hasta:hastaQ}=limitesPeriodoGE();
  if(!desdeQ||!hastaQ){setEntregadosPeriodoReal([]);return;}
  setCargandoEntregadosReal(true);
  try{
    const COLS_ENT='id,codigo,cliente,destinatario,telefono,direccion,comuna,referencia,fecha,estado,mensajero,monto,en_un_cambio,nota,nota_admin,fuente,peso,valor_siniestro,tuvo_siniestro,updated_at,created_at,aviso_tardio';
    const rows=await fetchEntregadosPorFechaReal(desdeQ,hastaQ,COLS_ENT);
    const normalizados=rows.map(function(sb){
      return{id:sb.id,codigo:sb.codigo,cliente:sb.cliente||'',destinatario:sb.destinatario||'',telefono:sb.telefono||'',
        direccion:sb.direccion||'',comuna:sb.comuna||'',referencia:sb.referencia||'',fecha:sb.fecha||'',
        estado:sb.estado||'entregado',mensajero:sb.mensajero||'',monto:sb.monto||0,enUnCambio:sb.en_un_cambio||false,
        nota:sb.nota||'',nota_admin:sb.nota_admin||'',fuente:sb.fuente||'propio',peso:sb.peso||null,
        valor_siniestro:sb.valor_siniestro||null,tuvo_siniestro:sb.tuvo_siniestro||false,created_at:sb.created_at||null,
        updated_at:sb.updated_at||null,aviso_tardio:sb.aviso_tardio||false,
        historial:[{fecha:sb.created_at,estado:sb.estado,nota:'Desde Supabase'}],_synced:true,
        _fechaRealEntrega:sb._fechaRealEntrega,_fechaRealEntregaISO:sb._fechaRealEntregaISO};
    });
    setEntregadosPeriodoReal(normalizados);
    // Estos códigos pueden no estar en 'entregasReal' (ese mapa solo se llena para los códigos
    // que trajo el fetch acotado por fecha de DESPACHO -- ver sincronizarDesdeSupabase) -- sin
    // esto, 'fechaEntregaDe()' mostraría la fecha de creación del registro en vez de la fecha
    // real de entrega para los paquetes despachados fuera del período pero entregados dentro.
    setEntregasReal(prev=>{const merged={...prev};normalizados.forEach(function(e){if(e._fechaRealEntregaISO)merged[e.codigo]=e._fechaRealEntregaISO;});return merged;});
  }catch(eReal){console.warn('Error cargando entregados por fecha real:',eReal.message);}
  setCargandoEntregadosReal(false);
}
useEffect(()=>{cargarEntregadosPeriodoReal();const _ivEntReal=setInterval(cargarEntregadosPeriodoReal,180000);return()=>clearInterval(_ivEntReal);},[periodo,mesFiltro,desde,hasta]);// Antes cada 60s: se sube a 3 min por la misma razón que sincronizarDesdeSupabase de arriba.
// Mismo criterio que 'Entregado' arriba, pero para 'Retorno': Luis reporto que al sacar los
// retornos de la quincena 2 de un cliente (filtro de fecha en Gestion de Envios) le salian 18
// paquetes cuando en realidad eran 14 -- el filtro estaba usando la fecha de DESPACHO
// (envios.fecha) en vez de la fecha en que el ultimo estado 'retorno' quedo registrado en
// historial_envios. Con esto 'Retorno' deja de ser subconjunto de 'Todos' igual que 'Entregado':
// puede haber paquetes despachados ANTES del periodo pero retornados DENTRO de el (o al reves).
const _uRetPerReal=useState([]),retornadosPeriodoReal=_uRetPerReal[0],setRetornadosPeriodoReal=_uRetPerReal[1];
const _uCargRetReal=useState(false),cargandoRetornadosReal=_uCargRetReal[0],setCargandoRetornadosReal=_uCargRetReal[1];
async function cargarRetornadosPeriodoReal(){
  const{desde:desdeQ,hasta:hastaQ}=limitesPeriodoGE();
  if(!desdeQ||!hastaQ){setRetornadosPeriodoReal([]);return;}
  setCargandoRetornadosReal(true);
  try{
    const COLS_RET='id,codigo,cliente,destinatario,telefono,direccion,comuna,referencia,fecha,estado,mensajero,monto,en_un_cambio,nota,nota_admin,fuente,peso,valor_siniestro,tuvo_siniestro,updated_at,created_at,aviso_tardio';
    const rows=await fetchPorFechaRealDeEstado('retorno',desdeQ,hastaQ,COLS_RET);
    const normalizados=rows.map(function(sb){
      return{id:sb.id,codigo:sb.codigo,cliente:sb.cliente||'',destinatario:sb.destinatario||'',telefono:sb.telefono||'',
        direccion:sb.direccion||'',comuna:sb.comuna||'',referencia:sb.referencia||'',fecha:sb.fecha||'',
        estado:sb.estado||'retorno',mensajero:sb.mensajero||'',monto:sb.monto||0,enUnCambio:sb.en_un_cambio||false,
        nota:sb.nota||'',nota_admin:sb.nota_admin||'',fuente:sb.fuente||'propio',peso:sb.peso||null,
        valor_siniestro:sb.valor_siniestro||null,tuvo_siniestro:sb.tuvo_siniestro||false,created_at:sb.created_at||null,
        updated_at:sb.updated_at||null,aviso_tardio:sb.aviso_tardio||false,
        historial:[{fecha:sb.created_at,estado:sb.estado,nota:'Desde Supabase'}],_synced:true,
        _fechaRealEstado:sb._fechaRealEstado,_fechaRealEstadoISO:sb._fechaRealEstadoISO};
    });
    setRetornadosPeriodoReal(normalizados);
  }catch(eReal){console.warn('Error cargando retornados por fecha real:',eReal.message);}
  setCargandoRetornadosReal(false);
}
useEffect(()=>{cargarRetornadosPeriodoReal();const _ivRetReal=setInterval(cargarRetornadosPeriodoReal,180000);return()=>clearInterval(_ivRetReal);},[periodo,mesFiltro,desde,hasta]);// Antes cada 60s: se sube a 3 min por la misma razón que las otras dos.
// Luis (16-09-2026), cruzando Gestión de Envíos contra el Drive de un cliente: "para mí, al
// colocar rango de fechas busco es todo lo gestionado dentro de ese rango" -- es decir, el mismo
// criterio de "fecha real del evento" que ya usan Entregado/Retorno arriba, pero para TODOS los
// demás estados (En Bodega, En Ruta, Reprogramado, Cancelado, Siniestro, En Bodega Cancelado, En
// Bodega por Fecha de Entrega). Antes esos usaban 'enviosPeriodoEfectivo' (estado CONGELADO al
// cierre, solo para lo DESPACHADO en el rango -- ver comentario mas abajo), que responde una
// pregunta distinta ("¿cómo quedó lo que salió en este rango?" en vez de "¿qué se gestionó en
// este rango?"). fetchPorFechaRealDeEstado ya estaba escrita para aceptar cualquier estado (fue
// generalizada justo para esto la primera vez que se agregó 'retorno', ver su comentario en
// index.html) así que se reusa tal cual, en paralelo, para el resto.
const ESTADOS_OTROS_REAL=ESTADOS_ENVIO.filter(function(est){return est.val!=='entregado'&&est.val!=='retorno';}).map(function(est){return est.val;});
const _uOtrosPerReal=useState({}),otrosPeriodoReal=_uOtrosPerReal[0],setOtrosPeriodoReal=_uOtrosPerReal[1];
const _uCargOtrosReal=useState(false),cargandoOtrosReal=_uCargOtrosReal[0],setCargandoOtrosReal=_uCargOtrosReal[1];
async function cargarOtrosPeriodoReal(){
  const{desde:desdeQ,hasta:hastaQ}=limitesPeriodoGE();
  if(!desdeQ||!hastaQ){setOtrosPeriodoReal({});return;}
  // Solo hace falta en vista 'cierre' -- en 'actual' estos estados se miran directo contra
  // enviosPeriodo/e.estado en vivo (igual que Entregado/Retorno en ese modo). Nos ahorramos
  // disparar 7 consultas paralelas a historial_envios cuando no se van a usar para nada; mismo
  // espíritu de precaución que el guard de 'actual' en cargarEnviosPeriodoEfectivo más abajo
  // (URGENTE fix incidente 07-09) -- acá con más razón, porque esto son 7 estados a la vez en
  // vez de 1, y 'En Ruta'/'En Bodega' pueden tener mucho volumen de eventos.
  if(vistaEstado==='actual')return;
  setCargandoOtrosReal(true);
  try{
    const COLS_OTROS='id,codigo,cliente,destinatario,telefono,direccion,comuna,referencia,fecha,estado,mensajero,monto,en_un_cambio,nota,nota_admin,fuente,peso,valor_siniestro,tuvo_siniestro,updated_at,created_at,aviso_tardio';
    const resultados=await Promise.all(ESTADOS_OTROS_REAL.map(function(est){return fetchPorFechaRealDeEstado(est,desdeQ,hastaQ,COLS_OTROS).then(function(rows){return{est:est,rows:rows};});}));
    const mapa={};
    resultados.forEach(function(r){
      mapa[r.est]=r.rows.map(function(sb){
        return{id:sb.id,codigo:sb.codigo,cliente:sb.cliente||'',destinatario:sb.destinatario||'',telefono:sb.telefono||'',
          direccion:sb.direccion||'',comuna:sb.comuna||'',referencia:sb.referencia||'',fecha:sb.fecha||'',
          estado:sb.estado||r.est,mensajero:sb.mensajero||'',monto:sb.monto||0,enUnCambio:sb.en_un_cambio||false,
          nota:sb.nota||'',nota_admin:sb.nota_admin||'',fuente:sb.fuente||'propio',peso:sb.peso||null,
          valor_siniestro:sb.valor_siniestro||null,tuvo_siniestro:sb.tuvo_siniestro||false,created_at:sb.created_at||null,
          updated_at:sb.updated_at||null,aviso_tardio:sb.aviso_tardio||false,
          historial:[{fecha:sb.created_at,estado:sb.estado,nota:'Desde Supabase'}],_synced:true,
          _fechaRealEstado:sb._fechaRealEstado,_fechaRealEstadoISO:sb._fechaRealEstadoISO};
      });
    });
    setOtrosPeriodoReal(mapa);
  }catch(eOtros){console.warn('Error cargando otros estados por fecha real:',eOtros.message);}
  setCargandoOtrosReal(false);
}
useEffect(()=>{cargarOtrosPeriodoReal();const _ivOtrosReal=setInterval(cargarOtrosPeriodoReal,180000);return()=>clearInterval(_ivOtrosReal);},[periodo,mesFiltro,desde,hasta,vistaEstado]);
async function sincronizarDesdeSupabase(){setSincronizando(true);try{
  // Solo trae el periodo activo (Hoy por defecto), no la tabla completa. Se pagina en bloques
  // de 1000 igual que antes por si un periodo amplio (Mes/Rango grande) supera esa cantidad,
  // pero para 'Hoy' — el caso de uso normal del dia a dia — es tipicamente una sola pagina.
  const COLS='id,codigo,cliente,destinatario,telefono,direccion,comuna,referencia,fecha,estado,mensajero,monto,en_un_cambio,nota,nota_admin,fuente,peso,valor_siniestro,tuvo_siniestro,updated_at,created_at,aviso_tardio';
  const{desde:desdeQ,hasta:hastaQ}=limitesPeriodoGE();
  // Si el periodo es 'Rango' pero aun no se eligieron las dos fechas, antes esto caia en el
  // fallback de mas abajo y traia la TABLA COMPLETA de envios (miles de filas) sin que el
  // usuario lo haya pedido -- ademas de mostrar de mas, esto se repetia cada 60s (auto-sync)
  // pudiendo sobrecargar la base. Ahora simplemente no trae nada hasta que ambas fechas esten.
  if(periodo==='rango'&&(!desdeQ||!hastaQ)){setSincronizando(false);return;}
  // Se ordena por 'id' (llave primaria, nunca cambia) para que la paginación sea siempre estable
  // sin importar cuántas filas se editen mientras se está trayendo el periodo — antes se ordenaba
  // por 'updated_at', una columna que cambia constantemente en vivo, y eso podia duplicar/saltear
  // filas entre paginas. Se pagina en PARALELO (fetchPaginadoParalelo) en vez de una pagina a la
  // vez para que un periodo grande (Semana/Mes/Rango) no tarde varios segundos en cargar.
  // Con ambos bordes de fecha definidos (Hoy/Semana/Mes, y Rango una vez elegidas las fechas)
  // se reparte por dia en paralelo (mucho mas rapido); si falta algun borde (Rango sin fechas
  // aun elegidas) se usa el fallback secuencial por cursor.
  const rows=(desdeQ&&hastaQ)
    ?await fetchPorDiasParalelo(desdeQ,hastaQ,function(fecha,cursor,limite){
      return db.from('envios').select(COLS).neq('estado','eliminado').eq('fecha',fecha).gt('id',cursor).order('id',{ascending:true}).limit(limite);
    })
    :await fetchPaginadoParalelo(function(cursor,limite){
      let _q=db.from('envios').select(COLS).neq('estado','eliminado');
      if(desdeQ)_q=_q.gte('fecha',desdeQ);
      if(hastaQ)_q=_q.lte('fecha',hastaQ);
      return _q.gt('id',cursor).order('id',{ascending:true}).limit(limite);
    });
  // Fechas de entrega REALES: se leen de historial_envios (fuente de verdad sincronizada),
  // no del historial local en cache del navegador, que puede quedar obsoleto o mezclado
  // entre dispositivos y hacer parecer que un envío se entregó antes de recibirse.
  // Acotado a los codigos del periodo que acabamos de traer (antes traia TODO historial_envios
  // con estado 'entregado' de siempre, otra consulta pesada e innecesaria para ver solo hoy).
  try{
    const codigosPeriodo=[...new Set(rows.map(r=>r.codigo))];
    const hBloque=500;const lotes=[];
    for(let hi=0;hi<codigosPeriodo.length;hi+=hBloque)lotes.push(codigosPeriodo.slice(hi,hi+hBloque));
    // En paralelo (antes uno detras de otro) — con periodos grandes esto podia ser varias
    // vueltas de red innecesariamente lentas.
    const resultados=await Promise.all(lotes.map(function(lote){return db.from('historial_envios').select('codigo_envio,created_at').eq('estado','entregado').in('codigo_envio',lote);}));
    let histRows=[];resultados.forEach(function(_h){if(!_h.error)histRows=histRows.concat(_h.data||[]);});
    setEntregasReal(prev=>{const merged={...prev};histRows.forEach(function(h){if(!merged[h.codigo_envio])merged[h.codigo_envio]=h.created_at;});return merged;});
  }catch(eHist){console.warn('Error cargando fechas de entrega reales:',eHist.message);}
  // Defensa adicional: aunque la paginación ya es estable por 'id', se deduplica por
  // 'codigo' al construir 'merged' (si por cualquier motivo llegara un código repetido,
  // se queda con la última versión en vez de contarlo dos veces).
  const rowsUnicas=[];const vistos={};rows.forEach(function(r){if(vistos[r.codigo])return;vistos[r.codigo]=true;rowsUnicas.push(r);});
  setEnvios(prev=>{const mapaLocal={};prev.forEach(e=>{mapaLocal[e.codigo]=e;});const ahora=Date.now();const merged=rowsUnicas.map(sb=>{var _mapaLocal$sb$codigo,_mapaLocal$sb$codigo2;const local=mapaLocal[sb.codigo];const edicionReciente=edicionesRecientesRef.current[sb.codigo];const usarLocalReciente=edicionReciente&&(ahora-edicionReciente.ts)<10000;return{id:((_mapaLocal$sb$codigo=mapaLocal[sb.codigo])==null?void 0:_mapaLocal$sb$codigo.id)||sb.id,codigo:sb.codigo,cliente:sb.cliente||'',destinatario:sb.destinatario||'',telefono:sb.telefono||'',direccion:sb.direccion||'',comuna:sb.comuna||'',referencia:sb.referencia||'',fecha:sb.fecha||fechaHoyCL(),estado:usarLocalReciente?edicionReciente.estado:(sb.estado||'en_bodega'),mensajero:usarLocalReciente?edicionReciente.mensajero:(sb.mensajero||''),monto:sb.monto||0,enUnCambio:sb.en_un_cambio||false,nota:sb.nota||'',nota_admin:sb.nota_admin||'',fuente:sb.fuente||'propio',peso:sb.peso||null,valor_siniestro:sb.valor_siniestro||null,created_at:sb.created_at||null,aviso_tardio:sb.aviso_tardio||false,historial:((_mapaLocal$sb$codigo2=mapaLocal[sb.codigo])==null?void 0:_mapaLocal$sb$codigo2.historial)||[{fecha:sb.created_at,estado:sb.estado,nota:'Desde Supabase'}],_synced:true};});const codigosSupabase=new Set(rowsUnicas.map(e=>e.codigo));const eliminados=new Set(lsLoad('envios_eliminados',[]));const soloLocal=prev.filter(e=>!codigosSupabase.has(e.codigo)&&!eliminados.has(e.codigo)&&e._synced!==true);const mergedFiltrado=merged.filter(e=>!eliminados.has(e.codigo));return[...mergedFiltrado,...soloLocal];});toast(rows.length>0?`✓ Sincronizado: ${rows.length} envíos desde la nube`:'✓ Sincronizado: 0 envíos activos en la nube');}catch(e){toast('⚠ Error de sincronización: '+e.message);}setSincronizando(false);}useEffect(()=>{const channel=db.channel('admin-envios').on('postgres_changes',{event:'UPDATE',schema:'public',table:'envios',filter:'fecha=eq.'+fechaHoyCL()},payload=>{const sb=payload.new;const edicionReciente=edicionesRecientesRef.current[sb.codigo];const esPropio=edicionReciente&&(Date.now()-edicionReciente.ts)<10000;
  // Antes este canal en vivo solo propagaba estado/mensajero/nota -- el cliente (y
  // destinatario/direccion/comuna) se quedaban pegados con lo que fuera que tuviera la fila
  // en memoria, aunque cambiaran en Supabase, porque este es uno de los pocos caminos que
  // actualiza una fila SIN esperar el sync completo de 3 min (que ademas solo trae codigos
  // DENTRO del periodo activo -- uno despachado otro dia nunca se refrescaba solo). Ahora se
  // propagan tambien esos campos (con respaldo al valor local si vinieran vacios/null).
  const camposExtra=e=>({cliente:sb.cliente||e.cliente,destinatario:sb.destinatario||e.destinatario,direccion:sb.direccion||e.direccion,comuna:sb.comuna||e.comuna});
  setEnvios(prev=>prev.map(e=>{if(e.codigo!==sb.codigo)return e;if(esPropio)return{...e,estado:sb.estado,mensajero:sb.mensajero||e.mensajero,nota:sb.nota||e.nota,...camposExtra(e)};if(e.historial.length>0&&e.historial[e.historial.length-1].estado===sb.estado&&e.historial[e.historial.length-1].nota==='Actualizado por Rider')return{...e,...camposExtra(e)};return{...e,estado:sb.estado,mensajero:sb.mensajero||e.mensajero,nota:sb.nota||e.nota,...camposExtra(e),historial:[...e.historial,{fecha:new Date().toISOString(),estado:sb.estado,nota:'Actualizado por Rider'}]};}));}).subscribe();return()=>{db.removeChannel(channel);};},[]);
// El sync automatico (mas arriba) y el canal en vivo (justo arriba) solo cubren envios DENTRO
// del periodo activo (Hoy/Semana/Mes/etc) -- si alguien busca un codigo puntual despachado
// OTRO dia (fuera del periodo que se esta mirando), ninguno de los dos lo refresca nunca, sin
// importar cuanto tiempo pase. Antes eso significaba que buscar ese codigo podia mostrar datos
// desactualizados (cliente/mensajero vacios aunque ya estuvieran asignados en Supabase) hasta
// que alguien recargara la pagina a mano -- confuso para operadores y para responder consultas
// de clientes (caso real: Luis). Ahora, cuando el buscador tiene algo que parece un codigo real
// (6+ digitos, soporta pegar varios de una vez via el modo de busqueda masiva), se va a buscar
// ese/esos codigo(s) fresco directo a Supabase -- aparte del periodo activo -- y se
// actualiza/agrega en la lista local, asi buscar un codigo siempre muestra el dato real.
useEffect(()=>{
  const candidatosBus=[...new Set(search.split(/[\n,;\s]+/).map(t=>t.trim()).filter(t=>/^\d{6,}$/.test(t)))];
  if(!candidatosBus.length)return;
  const timerBus=setTimeout(async()=>{
    try{
      const eliminadosBus=new Set(lsLoad('envios_eliminados',[]));
      const codigosBuscar=candidatosBus.filter(c=>!eliminadosBus.has(c));
      if(!codigosBuscar.length)return;
      const COLS_BUS='id,codigo,cliente,destinatario,telefono,direccion,comuna,referencia,fecha,estado,mensajero,monto,en_un_cambio,nota,nota_admin,fuente,peso,valor_siniestro,tuvo_siniestro,updated_at,created_at,aviso_tardio';
      const LOTE_BUS=200;const lotesBus=[];
      for(let i=0;i<codigosBuscar.length;i+=LOTE_BUS)lotesBus.push(codigosBuscar.slice(i,i+LOTE_BUS));
      const resultadosBus=await Promise.all(lotesBus.map(function(lote){return db.from('envios').select(COLS_BUS).neq('estado','eliminado').in('codigo',lote);}));
      let dataBus=[];resultadosBus.forEach(function(r){if(!r.error)dataBus=dataBus.concat(r.data||[]);});
      if(!dataBus.length)return;
      const ahoraBus=Date.now();
      setEnvios(prev=>{
        const mapaLocal={};prev.forEach(e=>{mapaLocal[e.codigo]=e;});
        dataBus.forEach(function(sb){
          const local=mapaLocal[sb.codigo];
          const edicionReciente=edicionesRecientesRef.current[sb.codigo];
          const usarLocalReciente=edicionReciente&&(ahoraBus-edicionReciente.ts)<10000;
          mapaLocal[sb.codigo]={id:(local&&local.id)||sb.id,codigo:sb.codigo,cliente:sb.cliente||'',destinatario:sb.destinatario||'',telefono:sb.telefono||'',direccion:sb.direccion||'',comuna:sb.comuna||'',referencia:sb.referencia||'',fecha:sb.fecha||fechaHoyCL(),estado:usarLocalReciente?edicionReciente.estado:(sb.estado||'en_bodega'),mensajero:usarLocalReciente?edicionReciente.mensajero:(sb.mensajero||''),monto:sb.monto||0,enUnCambio:sb.en_un_cambio||false,nota:sb.nota||'',nota_admin:sb.nota_admin||'',fuente:sb.fuente||'propio',peso:sb.peso||null,valor_siniestro:sb.valor_siniestro||null,tuvo_siniestro:sb.tuvo_siniestro||false,created_at:sb.created_at||null,updated_at:sb.updated_at||null,aviso_tardio:sb.aviso_tardio||false,historial:(local&&local.historial)||[{fecha:sb.created_at,estado:sb.estado,nota:'Desde Supabase'}],_synced:true};
        });
        return Object.values(mapaLocal);
      });
    }catch(eBuscar){console.warn('Error refrescando códigos buscados:',eBuscar.message);}
  },500);
  return()=>clearTimeout(timerBus);
},[search]);
function cargarHistorialReal(codigo){
  if(!codigo){setHistorialReal([]);return;}
  setCargandoHistorial(true);
  // gestion_lat/gestion_lng/gestion_precision_m/gestion_distancia_m/gestion_verificada (Fase 1):
  // evidencia geo-verificada de Reprogramado -- se pide acá para poder mostrar, junto a cada
  // entrada del historial, qué tan lejos quedó el mensajero del domicilio real y un link a Maps
  // (Luis pidió poder auditar esto visualmente, no solo confiar en el booleano).
  db.from('historial_envios').select('id,estado,nota,usuario,canal,created_at,gestion_lat,gestion_lng,gestion_precision_m,gestion_distancia_m,gestion_verificada').eq('codigo_envio',codigo).order('created_at',{ascending:false}).then(function(res){
    setHistorialReal((res&&res.data)||[]);
    setCargandoHistorial(false);
  }).catch(function(){setHistorialReal([]);setCargandoHistorial(false);});
}
useEffect(()=>{cargarHistorialReal(detalleEnvio&&detalleEnvio.codigo);},[detalleEnvio&&detalleEnvio.codigo]);
// Llega desde el buscador del Mapa de Rutas ("Ver ficha completa" en el pin de un envío
// encontrado): en vez de duplicar el modal de detalle allá, el Mapa solo guarda el código y
// salta a esta pestaña -- acá se busca ese código en la lista local y se abre la MISMA ficha
// de siempre. Si el código todavía no llegó al sync local (recién se creó, o el sync está en
// curso) este efecto reintenta solo porque depende de `envios`: en cuanto aparezca ahí, se abre.
useEffect(()=>{
  if(!codigoInicial)return;
  const match=envios.find(function(e){return e.codigo===codigoInicial;})||filtrados.find(function(e){return e.codigo===codigoInicial;});
  if(match){
    setDetalleEnvio(match);
    if(onCodigoInicialConsumido)onCodigoInicialConsumido();
  }
},[codigoInicial,envios]);
const _useSiniDet=useState([]),siniestroDetalle=_useSiniDet[0],setSiniestroDetalle=_useSiniDet[1];
// Ficha del envío en Gestión de Envíos: antes mostraba los campos en tarjetas de solo lectura
// arriba y, más abajo, un panel aparte 'Editar Campos del Envío' que repetía Código/Dirección/Comuna
// -- Luis pidió que sea una sola vista, sin duplicar información, con todos los campos editables ahí
// mismo. 'edicionesCampo' guarda, por cada campo que se está editando en este momento, su valor en
// borrador (la sola presencia de la clave en el objeto indica que ese campo está en modo edición).
const _useEdicionesCampo=useState({}),edicionesCampo=_useEdicionesCampo[0],setEdicionesCampo=_useEdicionesCampo[1];
useEffect(()=>{if(!detalleEnvio||!detalleEnvio.tuvo_siniestro){setSiniestroDetalle([]);return;}db.from('siniestros').select('*').eq('codigo',detalleEnvio.codigo).order('created_at',{ascending:false}).then(function(res){setSiniestroDetalle((res&&res.data)||[]);}).catch(function(){setSiniestroDetalle([]);});},[detalleEnvio&&detalleEnvio.codigo,detalleEnvio&&detalleEnvio.tuvo_siniestro]);
function canalInfo(canal){
  if(canal==='app_mensajero')return{label:'📱 App Mensajero',bg:'rgba(46,125,79,0.12)',color:'#2e7d4f'};
  if(canal==='panel_admin')return{label:'🖥 Panel Admin',bg:'rgba(27,58,107,0.12)',color:'#1B3A6B'};
  if(canal==='cliente')return{label:'🌐 Cliente',bg:'rgba(200,168,75,0.15)',color:'#a0842a'};
  return{label:'⚙ Sistema',bg:'rgba(122,125,106,0.12)',color:'#7a7d6a'};
}
const mensajerosActivos=mensajeros.filter(m=>m.activo);const clientesActivos=clientes.filter(c=>c.activo);function importarPDF(file,cliente){
  if(!cliente){toast('⚠ Selecciona un cliente primero');return;}
  setProcesandoPDF(true);
  setProgresoPDF('📄 Leyendo PDF...');
  const reader=new FileReader();
  reader.onload=async e=>{
    try{
      const arrayBuffer=e.target.result;
      if(!window.pdfjsLib){throw new Error('pdf.js no cargado. Recarga la página.');}
      window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdfDoc=await conTimeout(window.pdfjsLib.getDocument({data:arrayBuffer}).promise,30000,'cargar documento PDF');
      const totalPags=pdfDoc.numPages;
      setProgresoPDF('📄 PDF cargado · '+totalPags+' páginas · Extrayendo datos...');
      const envios=[];
      for(let i=1;i<=totalPags;i++){
        if(i%10===0||i===1){
            setProgresoPDF('⚙ Procesando página '+i+' / '+totalPags+'...');
            await new Promise(r=>setTimeout(r,0)); // yield al browser para re-render
          }
        try{
          const page=await conTimeout(pdfDoc.getPage(i),20000,'getPage pág '+i);
          // Extraer texto
          const tc=await conTimeout(page.getTextContent(),20000,'getTextContent pág '+i);
          const lineas=[];
          let lastY=-1,linea='';
          tc.items.forEach(it=>{
            const y=Math.round(it.transform[5]);
            if(lastY!==-1&&Math.abs(y-lastY)>3){lineas.push(linea.trim());linea='';}
            linea+=it.str;
            lastY=y;
          });
          if(linea.trim())lineas.push(linea.trim());
          const texto=lineas.filter(l=>l).join('\n');
          // Parsear campos
          let codigo='',destinatario='',direccion='',referencia='',comuna='',fecha=fechaHoyCL(),zona='';
          const meses={ENE:'01',FEB:'02',MAR:'03',ABR:'04',MAY:'05',JUN:'06',JUL:'07',AGO:'08',SEP:'09',OCT:'10',NOV:'11',DIC:'12'};
          // Palabras clave que NO son comunas
          const NO_COMUNA=/^(RESIDENCIAL|FLEX|ANILLO|DISTRIBUIDOR|PUNTO|Pack|Venta|Envio|Avenida|Quilicura|Recorta|Color|Unidad|Led|ZONA|SECTOR|NORTE|SUR|ESTE|ORIENTE|PONIENTE|CENTRO)/i;
          let flexIdx=-1;
          lineas.forEach((l,idx)=>{
            // Código
            const mCod=l.match(/Envio[:\s]+(\d[\d\s]{5,})/i);
            if(mCod&&!codigo)codigo=mCod[1].replace(/\s+/g,'');
            // Fecha
            const mFecha=l.match(/(\d{2})\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)/i);
            if(mFecha){fecha=new Date().getFullYear()+'-'+(meses[mFecha[2].toUpperCase()]||'01')+'-'+mFecha[1];}
            // Marcar índice de FLEX
            if(/FLEX/i.test(l))flexIdx=idx;
            // ANILLO: marcar zona
            if(/^ANILLO/i.test(l))zona=l.trim();
            // Dirección
            const mDir=l.match(/^Direcci[oó]n[:\s]+(.+)/i);
            if(mDir&&!direccion)direccion=mDir[1].trim();
            // Referencia
            const mRef=l.match(/^Referencia[:\s]+(.+)/i);
            if(mRef){let rv=mRef[1].replace(/^Referencia[:\s]*/i,'').trim();if(rv)referencia=referencia?referencia+' '+rv:rv;}
            // Destinatario
            const mDest=l.match(/^Destinatario[:\s]+(.+)/i);
            if(mDest&&!destinatario)destinatario=mDest[1].replace(/\([^)]*\)/g,'').trim();
          });
          // Buscar comuna: primera línea TODO MAYÚSCULAS después de FLEX que no sea keyword
          // Funciona con y sin ANILLO porque en ambos casos la comuna viene después de FLEX
          if(flexIdx>=0&&!comuna){
            for(let ci=flexIdx+1;ci<lineas.length&&ci<flexIdx+8;ci++){
              const c=lineas[ci]?.trim()||'';
              if(!c)continue;
              const esMayus=c===c.toUpperCase()&&/[A-ZÁÉÍÓÚÑ]/.test(c);
              if(esMayus&&c.length>3&&!NO_COMUNA.test(c)&&!/^\d/.test(c)){
                // Evitar duplicar (PUDAHUEL PUDAHUEL → tomar solo 1)
                // Si la siguiente igual también es la misma, tomamos esta
                comuna=c;
                break;
              }
              // Si encontramos ANILLO, la siguiente línea válida es la comuna
              if(/^ANILLO/i.test(c)){
                for(let ci2=ci+1;ci2<lineas.length&&ci2<ci+4;ci2++){
                  const c2=lineas[ci2]?.trim()||'';
                  if(c2&&c2===c2.toUpperCase()&&c2.length>3&&!NO_COMUNA.test(c2)&&!/^\d/.test(c2)){
                    comuna=c2;break;
                  }
                }
                if(comuna)break;
              }
              // Si llegamos a Direccion, paramos
              if(/^Direcci/i.test(c))break;
            }
          }
          if(!comuna)console.warn('PDF Flex: no se detecto comuna en pagina '+i+' (codigo '+codigo+'). Lineas extraidas:',lineas);
          if(!codigo)continue;
          // Renderizar página como imagen
          let foto_etiqueta=null;
          if(i<=totalPags){
            try{
              const vp=page.getViewport({scale:1.5});
              const cv=document.createElement('canvas');
              cv.width=vp.width;cv.height=vp.height;
              await conTimeout(page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise,15000,'render pág '+i);
              foto_etiqueta=cv.toDataURL('image/jpeg',0.72);
              cv.width=0;cv.height=0; // liberar memoria
              foto_etiqueta=await subirFotoStorage(foto_etiqueta,codigo,'etq','etiquetas');
            }catch(re){console.warn('Error render pág '+i,re);}
          }
          envios.push({
            id:Date.now()+i,
            codigo,cliente,destinatario,direccion,referencia,
            comuna:matchComuna(comuna.toUpperCase()),zona,telefono:'',fecha,
            estado:'en_bodega',mensajero:'',monto:0,
            nota:referencia?'Ref: '+referencia:'',
            fuente:'externo',foto_etiqueta,
            historial:[{fecha:new Date().toISOString(),estado:'en_bodega',nota:'PDF Flex · '+cliente}]
          });
        }catch(pe){console.warn('Error página '+i+':',pe.message);}
      }
      if(!envios.length){toast('⚠ No se encontraron envíos en el PDF');setProcesandoPDF(false);setProgresoPDF('');return;}
      const conFoto=envios.filter(e=>e.foto_etiqueta).length;
      setProgresoPDF('✅ Listo · '+envios.length+' envíos · '+conFoto+' con foto');
      setPdfPreview({envios,cliente,total:envios.length,conFoto});
      setProcesandoPDF(false);
      setProgresoPDF('');
    }catch(err){
      toast('⚠ Error procesando PDF: '+err.message);
      setProcesandoPDF(false);setProgresoPDF('');
    }
  };
  reader.readAsArrayBuffer(file);
}
function confirmarImportPDF(){
  if(!pdfPreview)return;
  const nuevos=pdfPreview.envios;
  setEnvios(prev=>{
    const mapaExist={};
    prev.forEach(e=>{mapaExist[e.codigo]=e;});
    const procesados=nuevos.map(n=>{
      if(mapaExist[n.codigo]){
        const exist=mapaExist[n.codigo];
        return{...exist,
          destinatario:exist.destinatario||n.destinatario,
          direccion:exist.direccion||n.direccion,
          comuna:exist.comuna||n.comuna,
          cliente:exist.cliente||n.cliente,
          referencia:exist.referencia||n.referencia,
          nota:exist.nota||n.nota,
        };
      }
      return n;
    });
    const codigosNuevos=new Set(nuevos.map(n=>n.codigo));
    const soloLocales=prev.filter(e=>!codigosNuevos.has(e.codigo));
    // Sync a Supabase en background
    (async()=>{
      // Antes un error de upsert acá quedaba completamente silencioso: el envío se veía
      // "importado" en pantalla (queda en el estado local) pero nunca llegaba a Supabase, sin
      // ningún aviso al admin. Ahora se juntan los códigos que fallaron y se avisa con un toast
      // al terminar, para no perder envíos importados sin que nadie se entere.
      const codigosFallidos=[];
      for(const e of procesados.slice(0,500)){
        try{
          const upsertData={codigo:e.codigo,cliente:e.cliente||'',destinatario:e.destinatario||'',telefono:e.telefono||'',direccion:e.direccion||'',comuna:e.comuna||'',referencia:e.referencia||'',fecha:e.fecha||fechaHoyCL(),estado:e.estado||'en_bodega',mensajero:e.mensajero||'',monto:0,en_un_cambio:false,nota:e.nota||'',fuente:'externo'};
          if(e.foto_etiqueta)upsertData.foto_etiqueta=e.foto_etiqueta;
          await db.from('envios').upsert(upsertData,{onConflict:'codigo'});
          sbRegistrarHistorial(e.codigo,upsertData.estado,'Importado por PDF (admin)',usuario?.nombre||'Admin','panel_admin');
        }catch(err){
          codigosFallidos.push(e.codigo);
          console.warn('Error al sincronizar envío importado por PDF:',e.codigo,err.message);
        }
      }
      if(codigosFallidos.length>0){
        toast('⚠ '+codigosFallidos.length+' envío(s) del PDF no se pudieron guardar en la nube: '+codigosFallidos.slice(0,5).join(', ')+(codigosFallidos.length>5?'...':'')+'. Reintenta sincronizar.');
      }
    })();
    return[...soloLocales,...procesados];
  });
  const nuevosCount=pdfPreview.envios.filter(n=>{const local=lsLoad('gestion_envios',[]);return!local.find(e=>e.codigo===n.codigo);}).length;
  toast(`✓ PDF procesado: ${pdfPreview.total} envíos · ${nuevosCount} nuevos · ${pdfPreview.total-nuevosCount} actualizados · Cliente: ${pdfPreview.cliente}`);
  setPdfPreview(null);
  setShowPDFModal(false);
  setClientePDF('');
}
async function conReintento(fn,intentos){if(intentos===void 0){intentos=3;}for(let i=0;i<intentos;i++){try{await fn();return{ok:true};}catch(err){console.warn('Supabase sync error (intento '+(i+1)+'/'+intentos+'):',err.message);if(i<intentos-1){await new Promise(r=>setTimeout(r,600*(i+1)));}}}return{ok:false};}
// FIX 2026-09-19 (raiz del bug de 'cambio de estado que no hace nada'): 'envios' es un cache
// general acotado a los ~1000 envios mas recientes por fecha de despacho (para no recargar
// miles de filas en memoria/DOM -- ver Sync inicial). Un envio con muchos dias de antiguedad
// puede quedar fuera de ese cache aunque se siga viendo y gestionando hoy (la vista 'Gestionado
// en el periodo' lo trae con su propia consulta, independiente de 'envios'). Antes, CUALQUIER
// accion que hiciera 'envios.filter(e=>ids.has(e.id))' para reconstruir el envio a partir de un
// id simplemente no encontraba nada para esas filas -- y como no hay ids sueltos sin una fila
// real detras, el resultado era una accion que no hacia NADA, sin ningun error. Esta funcion la
// usan todas esas acciones (cambiar estado, asignar mensajero, eliminar, imprimir etiquetas):
// busca primero en 'envios' y, para lo que falte, en 'filtrados' (lo que se esta mostrando en
// pantalla ahora mismo) -- entre ambas siempre está la fila real que originó la acción.
function resolverEnviosPorId(idsBuscados){
  const origen=new Map();
  for(const e of envios){if(idsBuscados.has(e.id))origen.set(e.id,e);}
  for(const e of filtrados){if(idsBuscados.has(e.id)&&!origen.has(e.id))origen.set(e.id,e);}
  return Array.from(origen.values());
}
async function cambiarEstado(ids,nuevoEstado,nota){if(nota===void 0){nota='';}
const enviosAfectados=resolverEnviosPorId(ids);
if(enviosAfectados.length===0){console.error('cambiarEstado: no se encontro ningun envio para los ids dados (esto no deberia pasar)',Array.from(ids));return;}
setEnvios(prev=>{const idsEnPrev=new Set(prev.map(e=>e.id));const actualizados=prev.map(e=>{if(!ids.has(e.id))return e;const notaFinal=nota||`Estado cambiado a ${estadoInfo(nuevoEstado).label}`+(e.mensajero?` (mensajero: ${e.mensajero.replace(/,\s*/g,' ')})`:'');return{...e,estado:nuevoEstado,mensajero:nuevoEstado==='sin_asignar'?'':e.mensajero,historial:[...e.historial,crearEntradaHistorial(nuevoEstado,notaFinal,usuario?.nombre||'Admin')]};});const faltantes=enviosAfectados.filter(e=>!idsEnPrev.has(e.id)).map(e=>{const notaFinal=nota||`Estado cambiado a ${estadoInfo(nuevoEstado).label}`+(e.mensajero?` (mensajero: ${e.mensajero.replace(/,\s*/g,' ')})`:'');return{...e,estado:nuevoEstado,mensajero:nuevoEstado==='sin_asignar'?'':e.mensajero,historial:[...(e.historial||[]),crearEntradaHistorial(nuevoEstado,notaFinal,usuario?.nombre||'Admin')]};});return faltantes.length?[...actualizados,...faltantes]:actualizados;});setSelected(new Set());toast(`✓ ${ids.size} envío${ids.size>1?'s':''} → ${estadoInfo(nuevoEstado).label}`);for(const e of enviosAfectados){const r=await conReintento(()=>db.from('envios').upsert({codigo:e.codigo,cliente:e.cliente||'',destinatario:e.destinatario||'',telefono:e.telefono||'',direccion:e.direccion||'',comuna:e.comuna||'',referencia:e.referencia||'',fecha:e.fecha||fechaHoyCL(),estado:nuevoEstado,mensajero:nuevoEstado==='sin_asignar'?'':e.mensajero,monto:e.monto||0,en_un_cambio:e.enUnCambio||false,nota:nota||e.nota||'',fuente:e.fuente||'propio'},{onConflict:'codigo'}));if(r.ok){sbRegistrarHistorial(e.codigo,nuevoEstado,nota||`Estado cambiado a ${estadoInfo(nuevoEstado).label}`,usuario?.nombre||'Admin','panel_admin');if(nuevoEstado==='siniestro'&&window.__app&&window.__app.registrarSiniestro){try{await window.__app.registrarSiniestro(e.codigo,e.mensajero||'',nota||'');}catch(errSin){console.warn('registrarSiniestro error:',errSin.message);}}}else{toast('⚠️ '+e.codigo+' no se pudo guardar en el servidor — reintenta con mejor señal');}}}async function asignarMensajero(){if(!mensajeroAsignar){toast('Selecciona un mensajero');return;}const ids=selected;const enviosSeleccionados=resolverEnviosPorId(ids);
if(enviosSeleccionados.length===0){console.error('asignarMensajero: no se encontro ningun envio para los ids dados (esto no deberia pasar)',Array.from(ids));return;}
enviosSeleccionados.forEach(e=>{edicionesRecientesRef.current[e.codigo]={estado:'en_ruta',mensajero:mensajeroAsignar,ts:Date.now()};});setEnvios(prev=>{const idsEnPrev=new Set(prev.map(e=>e.id));const actualizados=prev.map(e=>{if(!ids.has(e.id))return e;return{...e,mensajero:mensajeroAsignar,estado:'en_ruta',historial:[...e.historial,crearEntradaHistorial('en_ruta',`Asignado a ${mensajeroAsignar}`,usuario?.nombre||'Admin')]};});const faltantes=enviosSeleccionados.filter(e=>!idsEnPrev.has(e.id)).map(e=>({...e,mensajero:mensajeroAsignar,estado:'en_ruta',historial:[...(e.historial||[]),crearEntradaHistorial('en_ruta',`Asignado a ${mensajeroAsignar}`,usuario?.nombre||'Admin')]}));return faltantes.length?[...actualizados,...faltantes]:actualizados;});for(const e of enviosSeleccionados){const r=await conReintento(()=>db.from('envios').upsert({codigo:e.codigo,cliente:e.cliente||'',destinatario:e.destinatario||'',telefono:e.telefono||'',direccion:e.direccion||'',comuna:e.comuna||'',referencia:e.referencia||'',fecha:e.fecha||fechaHoyCL(),estado:'en_ruta',mensajero:mensajeroAsignar,monto:e.monto||0,en_un_cambio:e.enUnCambio||false,nota:e.nota||'',fuente:e.fuente||'propio'},{onConflict:'codigo'}));if(r.ok){sbRegistrarHistorial(e.codigo,'en_ruta','Asignado a '+mensajeroAsignar+' desde panel admin',usuario?.nombre||'Admin','panel_admin');}else{toast('⚠️ '+e.codigo+' no se pudo guardar en el servidor — reintenta con mejor señal');}}setSelected(new Set());setAsignarModal(false);playSound('ruta');toast(`✓ ${ids.size} envío${ids.size>1?'s':''} asignado${ids.size>1?'s':''} a ${mensajeroAsignar} · Sincronizado`);}async function eliminarSeleccionados(){
  if(!esSuperAdmin){toast('Solo el Super Admin puede eliminar envíos');return;}
  const count=selected.size;
  if(!window.confirm(`¿Eliminar PERMANENTEMENTE ${count} envío${count>1?'s':''} de Supabase? Esta acción NO SE PUEDE DESHACER.`))return;
  
  const enviosElim=resolverEnviosPorId(selected);
  if(enviosElim.length===0){console.error('eliminarSeleccionados: no se encontro ningun envio para los ids seleccionados (esto no deberia pasar)',Array.from(selected));return;}

  const codigosElim=enviosElim.map(e=>e.codigo).filter(Boolean);
  
  toast('⏳ Eliminando '+count+' envíos...');
  
  try{
    /* Eliminar en lotes de 50 para no saturar Supabase. OJO: Supabase/PostgREST no tira error
       si el DELETE afecta 0 filas (ej. el codigo no matchea exactamente por espacios, comillas
       de Excel u otra causa) - "sin error" no es lo mismo que "borrado de verdad". Por eso,
       despues de cada lote, se vuelve a consultar cuales de esos codigos SIGUEN existiendo y
       solo se consideran borrados los que realmente desaparecieron. */
    const BATCH=50;
    let erroresRed=0;
    const sobrevivientes=[];
    for(let i=0;i<codigosElim.length;i+=BATCH){
      const lote=codigosElim.slice(i,i+BATCH);
      const r=await db.from('envios').delete().in('codigo',lote);
      if(r.error){
        erroresRed+=lote.length;
        console.warn('Error lote '+(i/BATCH+1)+':',r.error.message);
        continue;
      }
      try{
        const chk=await db.from('envios').select('codigo').in('codigo',lote);
        const codigosVivos=new Set((chk.data||[]).map(x=>x.codigo));
        lote.forEach(cod=>{if(codigosVivos.has(cod))sobrevivientes.push(cod);});
      }catch(chkErr){console.warn('No se pudo verificar el borrado:',chkErr.message);}
    }
    const codigosBorradosOk=codigosElim.filter(cod=>!sobrevivientes.includes(cod));
    // También borrar de historial_envios (solo lo que sí se confirmó borrado)
    if(codigosBorradosOk.length>0){
      await db.from('historial_envios').delete().in('codigo_envio',codigosBorradosOk);
    }
    // Lista negra local (solo lo confirmado)
    const eliminadosPrev=lsLoad('envios_eliminados',[]);
    lsSave('envios_eliminados',[...new Set([...eliminadosPrev,...codigosBorradosOk])]);
    // Borrar del estado local solo lo confirmado; lo que sobrevivió se deja visible
    const idsBorradosOk=enviosElim.filter(e=>codigosBorradosOk.includes(e.codigo)).map(e=>e.id);
    setEnvios(prev=>prev.filter(e=>!idsBorradosOk.includes(e.id)));
    setSelected(new Set());
    if(sobrevivientes.length>0){
      toast('⚠ '+codigosBorradosOk.length+' eliminados · '+sobrevivientes.length+' NO se pudieron borrar en Supabase (sigue en la base): '+sobrevivientes.join(', '));
    }else if(erroresRed>0){
      toast('⚠ '+(count-erroresRed)+' eliminados · '+erroresRed+' con error de red');
    }else{
      toast('🗑 '+count+' envío'+(count>1?'s':'')+' eliminado'+(count>1?'s':'')+' permanentemente');
    }
  }catch(e){
    console.error('Error eliminando:',e);
    toast('⚠ Error: '+e.message);
  }
}

// Descarga un archivo .html real (no solo una ventana de impresión) -- se usa para el export
// "un archivo por cliente" de reagendas, porque el objetivo es poder ADJUNTAR ese archivo en un
// correo o WhatsApp al cliente, no solo verlo/imprimirlo en el momento.
function descargarArchivoHTML(nombreArchivo,contenidoHTML){
  const blob=new Blob([contenidoHTML],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=nombreArchivo;document.body.appendChild(a);a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},1500);
}

// Texto fijo que Luis pidió que vaya SIEMPRE en cada HTML que se le manda a un cliente sobre
// piezas en reagenda: deja claro que TransPgso ya hizo 2 intentos demostrables, y que un 3er
// intento requiere que el cliente lo pida expresamente con teléfono o dirección corregidos --
// si no, el caso queda cerrado de nuestra parte.
const AVISO_POLITICA_REINTENTOS='<div class="aviso"><b>Sobre nuestra gestión de entregas:</b> TransPgso realiza <b>2 intentos de entrega demostrables</b> por cada envío, ya sea mediante el registro de la visita al domicilio o mediante el motivo documentado por el cual no fue posible realizar la entrega. Las piezas detalladas en este documento corresponden a envíos que se encuentran actualmente en estado <b>Reprogramado</b>, habiendo agotado o estando en curso de estos intentos.<br/><br/>En caso de necesitar un <b>3er intento de entrega</b>, este debe ser solicitado expresamente por el cliente, indicando la corrección del <b>número de teléfono</b> y/o la <b>dirección correcta</b> de destino. En caso de no contar con esta información actualizada, no será posible realizar un tercer intento y damos por <b>cerrada nuestra gestión</b> respecto a la(s) pieza(s) indicada(s).</div>';

// Exporta un archivo HTML descargable POR CADA CLIENTE con las piezas actualmente atrasadas o
// reprogramadas 2+ veces (según lo que esté filtrado en pantalla), listo para reenviar día a día
// notificando la reagenda y el motivo. Respeta los filtros activos (cliente/mensajero/tipo/búsqueda)
// y, si hay un modo de Atrasados activo, respeta también ese modo; si el modo está en 'off' toma
// igual el combinado (atrasados en ruta + reprogramados repetidos) para no exportar la lista completa
// de envíos por error.
function exportarHTMLPorCliente(){
  const base=filtradosOrdenados.filter(e=>filtroAtrasoModo==='atrasados'?esEnvioAtrasado(e):filtroAtrasoModo==='reprogramados'?esReprogramadoRepetido(e):(esEnvioAtrasado(e)||esReprogramadoRepetido(e)));
  if(base.length===0){toast('⚠ No hay envíos atrasados o reprogramados para exportar con los filtros actuales');return;}
  const porCliente={};
  base.forEach(e=>{const c=e.cliente||'Sin cliente';(porCliente[c]=porCliente[c]||[]).push(e);});
  const motivoDe=e=>(e.nota&&e.nota.trim())||'Reagenda registrada sin motivo detallado por el mensajero.';
  const fechaReporte=new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'});
  const clientesLista=Object.keys(porCliente);
  clientesLista.forEach((cliente,idx)=>{
    const envs=porCliente[cliente];
    const filas=envs.map((e,i)=>`<tr style="background:${i%2===0?'#fff':'#fdf9f2'}">
      <td style="font-family:monospace;font-size:11px;font-weight:700">${e.codigo}</td>
      <td>${e.destinatario||'—'}</td>
      <td>${e.direccion||''}${e.comuna?', '+e.comuna:''}</td>
      <td style="white-space:nowrap">${fmtFecha(e.fecha)}</td>
      <td>${esReprogramadoRepetido(e)?'<span style="color:#8a1d1d;font-weight:700">'+(reprogCount[e.codigo]||2)+'x Reprogramado</span>':'Atrasado en ruta'}</td>
      <td>${motivoDe(e)}</td>
    </tr>`).join('');
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Reagendas ${cliente} - ${fechaReporte}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;padding:28px;background:#FEF8EA;font-size:13px;color:#2b2e20;}
.hdr{border-bottom:3px solid #C8A84B;padding-bottom:14px;margin-bottom:20px;}
.brand{font-size:22px;font-weight:900;letter-spacing:2px;}
.sub{font-size:12px;color:#7a7d6a;margin-top:4px;}
table{width:100%;border-collapse:collapse;margin-bottom:22px;}thead tr{background:#2b2e20;}
thead th{color:#C8A84B;padding:8px 10px;font-size:10px;letter-spacing:1px;text-transform:uppercase;text-align:left;}
tbody td{padding:8px 10px;border-bottom:1px solid #f0e8d0;font-size:12px;vertical-align:top;}
.aviso{background:#fff;border:1px solid #e2d6ae;border-radius:10px;padding:16px 18px;font-size:12px;line-height:1.65;color:#3a3d2e;}
.aviso b{color:#2b2e20;}
@media print{body{padding:14px;background:#fff;}}</style></head><body>
<div class="hdr"><div class="brand">TRANSPGSO</div><div class="sub">Aviso de reagenda de entregas · Cliente: <b>${cliente}</b> · ${fechaReporte}</div></div>
<table><thead><tr><th>Código</th><th>Destinatario</th><th>Dirección</th><th>Última reagenda</th><th>Situación</th><th>Motivo</th></tr></thead><tbody>${filas}</tbody></table>
${AVISO_POLITICA_REINTENTOS}
</body></html>`;
    const nombreArchivo='Reagenda_'+cliente.replace(/[^a-zA-Z0-9-_]+/g,'_')+'_'+fechaReporte.replace(/\//g,'-')+'.html';
    setTimeout(()=>descargarArchivoHTML(nombreArchivo,html),idx*350);
  });
  toast(`✓ Generando ${clientesLista.length} archivo${clientesLista.length>1?'s':''} HTML (uno por cliente)`);
}

// Situación + motivo real de una pieza no entregada -- se usa en el modal "Detalle completo" de
// Atrasados y en el informe que se exporta desde ahí. Para reprogramados el motivo es la nota que
// dejó el mensajero al reagendar (o el aviso genérico si no dejó nada); para atrasados en ruta no
// existe una nota de reagenda (nunca se marcó), así que se explica que sigue en camino.
function situacionMotivoDe(e){
  if(esReprogramadoAlMenos1Vez(e)){
    return{
      situacion:(reprogCount[e.codigo]||1)+'x Reprogramado',
      motivo:(e.nota&&e.nota.trim())||'Reagenda registrada sin motivo detallado por el mensajero.'
    };
  }
  return{
    situacion:'Atrasado en ruta ('+diasDesdeFecha(e.fecha)+' día'+(diasDesdeFecha(e.fecha)===1?'':'s')+' sin entregar)',
    motivo:'Aún en ruta -- el mensajero no ha marcado entrega ni reagenda para esta pieza. Revisar directamente con el mensajero asignado.'
  };
}

// Descarga un .doc que Word abre directo con la tabla ya formada -- un .doc es en el fondo HTML
// con el namespace de Word declarado en el <html>, así que no hace falta ninguna librería extra
// para generar un Word real desde el navegador (mismo truco que usan la mayoría de los paneles
// administrativos para "Exportar a Word" sin backend).
function descargarArchivoWord(nombreArchivo,contenidoHTML){
  const blob=new Blob(['﻿',contenidoHTML],{type:'application/msword'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=nombreArchivo;document.body.appendChild(a);a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},1500);
}

// Informe general de piezas no entregadas (atrasadas en ruta + reprogramadas repetidas), para el
// botón de exportar del modal "Detalle completo" de Atrasados. formato==='word' agrega el
// namespace de MS Word al <html> para que Word lo abra directo; formato==='html' genera el mismo
// documento como .html normal (para verlo en el navegador o adjuntarlo).
function generarInformeAtrasados(items,formato){
  if(items.length===0){toast('⚠ No hay piezas para incluir en el informe');return;}
  const fechaReporte=new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'});
  const horaReporte=new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
  const filas=items.map((e,i)=>{
    const sm=situacionMotivoDe(e);
    return`<tr style="background:${i%2===0?'#fff':'#fdf9f2'}">
      <td style="font-family:monospace;font-size:11px;font-weight:700">${e.codigo}</td>
      <td>${e.cliente||'—'}</td>
      <td>${e.destinatario||'—'}</td>
      <td>${e.telefono||'—'}</td>
      <td>${e.direccion||''}${e.comuna?', '+e.comuna:''}</td>
      <td>${(e.mensajero||'—').replace(/,\s*/g,' ')}</td>
      <td style="white-space:nowrap">${fmtFecha(e.fecha)}</td>
      <td style="color:#8a1d1d;font-weight:700;white-space:nowrap">${sm.situacion}</td>
      <td>${sm.motivo}</td>
    </tr>`;
  }).join('');
  const wordNs=formato==='word'?' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"':'';
  const wordMeta=formato==='word'?'<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->':'';
  const html=`<!DOCTYPE html><html${wordNs}><head><meta charset="UTF-8"/>${wordMeta}
<title>Piezas No Entregadas - ${fechaReporte}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;padding:28px;background:#FEF8EA;font-size:13px;color:#2b2e20;}
.hdr{border-bottom:3px solid #C8A84B;padding-bottom:14px;margin-bottom:20px;}
.brand{font-size:22px;font-weight:900;letter-spacing:2px;}
.sub{font-size:12px;color:#7a7d6a;margin-top:4px;}
table{width:100%;border-collapse:collapse;margin-bottom:22px;}thead tr{background:#2b2e20;}
thead th{color:#C8A84B;padding:8px 10px;font-size:10px;letter-spacing:1px;text-transform:uppercase;text-align:left;}
tbody td{padding:8px 10px;border-bottom:1px solid #f0e8d0;font-size:12px;vertical-align:top;}
.resumen{font-size:12px;color:#3a3d2e;margin-bottom:16px;}
@media print{body{padding:14px;background:#fff;}}</style></head><body>
<div class="hdr"><div class="brand">TRANSPGSO</div><div class="sub">Informe de piezas no entregadas · ${fechaReporte} ${horaReporte}</div></div>
<div class="resumen"><b>${items.length}</b> pieza${items.length>1?'s':''} sin entregar al momento de generar este informe.</div>
<table><thead><tr><th>Código</th><th>Cliente</th><th>Destinatario</th><th>Teléfono</th><th>Dirección</th><th>Mensajero</th><th>Fecha Recepción</th><th>Situación</th><th>Motivo</th></tr></thead><tbody>${filas}</tbody></table>
</body></html>`;
  const nombreArchivo='Informe_Atrasados_'+fechaHoyCL()+(formato==='word'?'.doc':'.html');
  if(formato==='word')descargarArchivoWord(nombreArchivo,html);else descargarArchivoHTML(nombreArchivo,html);
  toast('✓ Informe '+(formato==='word'?'Word':'HTML')+' generado ('+items.length+' piezas)');
}
const hoyGE=fechaHoyCL();
const lunesStrGE=(()=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
const ayerStrGE=(()=>{const d=new Date(hoyGE+'T12:00:00');d.setDate(d.getDate()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
function enPeriodoGE(e){
  const fi=(e.fecha||'').slice(0,10);
  if(periodo==='hoy')return fi===hoyGE;
  if(periodo==='ayer')return fi===ayerStrGE;
  if(periodo==='semana')return fi>=lunesStrGE&&fi<=hoyGE;
  if(periodo==='mes')return fi.startsWith(mesFiltro||hoyGE.slice(0,7));
  // Rango: antes, si faltaba alguna fecha, mostraba de mas (todo lo que hubiera para el lado
  // sin tope). Ahora exige ambas fechas elegidas -- si falta alguna, no muestra nada.
  if(periodo==='rango')return!!desde&&!!hasta&&fi>=desde&&fi<=hasta;
  return true;
}
const enviosPeriodo=useMemo(()=>envios.filter(enPeriodoGE),[envios,periodo,mesFiltro,desde,hasta]);
// enviosPeriodoEfectivo: YA NO se usa para filtrar por un estado puntual (En Bodega, En Ruta,
// Reprogramado, Cancelado, Siniestro, En Bodega Cancelado, En Bodega por Fecha de Entrega) --
// desde el 16-09-2026 esos usan 'otrosPeriodoReal' (ver más arriba, mismo mecanismo de "fecha
// real" que Entregado/Retorno). Esta lista (estado CONGELADO al cierre, solo para lo DESPACHADO
// en el rango) sigue viva únicamente para la tarjeta/tabla "Todos" SIN búsqueda -- ver
// 'filtrados' y 'atrasadosDetalleFiltrados' más abajo -- porque esa vista responde una pregunta
// distinta a propósito ("¿cuánto se despachó en este rango?", no "¿qué se gestionó?"). Luis
// reporto originalmente el mismo problema mirando 'Todos'/una quincena cerrada: un envio
// despachado en agosto podia mostrar 'Retorno' (su estado de HOY) aunque ese retorno se haya
// gestionado recien en septiembre, DESPUES de que la quincena de agosto ya habia cerrado.
// calcularEstadoEfectivo (index.html) detecta solo los envios con algun evento de historial
// POSTERIOR al cierre (el "drift", se espera chico) y unicamente para esos recalcula cual era
// su estado real al cierre -- el resto conserva su estado en vivo tal cual (ya es correcto,
// porque nada cambio despues del cierre).
const _uEnvPerEfec=useState([]),enviosPeriodoEfectivo=_uEnvPerEfec[0],setEnviosPeriodoEfectivo=_uEnvPerEfec[1];
// Guard contra ejecuciones superpuestas: 'envios' se actualiza en tiempo real (ver "TIEMPO
// REAL" en el header), así que enviosPeriodo puede recalcularse (nueva referencia) mientras
// un calculo anterior de calcularEstadoEfectivo todavia esta en vuelo -- sin esto, una
// respuesta vieja que llega tarde podia pisar el resultado de una mas nueva.
const efectivoGenRef=useRef(0);
async function cargarEnviosPeriodoEfectivo(){
  const miGen=++efectivoGenRef.current;
  // En vista 'actual' (estado en vivo) este cálculo no se usa para nada (stats/filtrados miran
  // directo enviosPeriodo) -- nos ahorramos la paginación completa de historial_envios que hace
  // calcularEstadoEfectivo (justo la que en el pasado saturó la base, ver comentario de abajo).
  if(vistaEstado==='actual'){if(miGen===efectivoGenRef.current)setEnviosPeriodoEfectivo(enviosPeriodo);return;}
  const{hasta:hastaQ}=limitesPeriodoGE();
  if(!hastaQ||!enviosPeriodo.length){if(miGen===efectivoGenRef.current)setEnviosPeriodoEfectivo(enviosPeriodo);return;}
  try{
    const hastaISO=limiteDiaChileUTC(hastaQ,true);
    const rows=await calcularEstadoEfectivo(enviosPeriodo,hastaISO);
    if(miGen===efectivoGenRef.current)setEnviosPeriodoEfectivo(rows);
  }catch(eEfec){console.warn('Error calculando estado efectivo:',eEfec.message);if(miGen===efectivoGenRef.current)setEnviosPeriodoEfectivo(enviosPeriodo);}
}
// URGENTE (fix incidente 07-09): este efecto dependia de 'enviosPeriodo', que cambia de
// referencia CADA VEZ que 'envios' se actualiza por tiempo real (ver "TIEMPO REAL" en el
// header) -- con varios admins con un Rango/Mes activo y actividad constante de mensajeros,
// esto disparaba cargarEnviosPeriodoEfectivo (que pagina TODO historial_envios con
// created_at > cierre) miles de veces por hora, saturando la base de datos y provocando
// "canceling statement due to statement timeout" en TODO el sistema -- incluida la app de
// mensajeros, que no tiene nada que ver con esta pantalla. Se limita a como maximo 1
// ejecucion real cada 5 segundos por pestaña (throttle): si ya pasaron 5s+ desde la ultima
// corrida, dispara al toque; si no, agenda para completar los 5s. Los cambios reales de
// filtro (periodo/mes/desde/hasta) casi siempre caen en el primer caso, asi que la pantalla
// sigue sintiendose instantanea -- lo que se corta es el disparo repetido por cada tick de
// tiempo real mientras el filtro no cambio.
const efectivoUltimaCorridaRef=useRef(0);
useEffect(()=>{
  const ahora=Date.now();
  const transcurrido=ahora-efectivoUltimaCorridaRef.current;
  const espera=transcurrido>5000?0:5000-transcurrido;
  const t=setTimeout(()=>{efectivoUltimaCorridaRef.current=Date.now();cargarEnviosPeriodoEfectivo();},espera);
  return()=>clearTimeout(t);
},[enviosPeriodo,periodo,mesFiltro,desde,hasta,vistaEstado]);
const baseTardioMap=useMemo(()=>calcularBaseTardio(envios),[envios]);
const tardiosPendientes=useMemo(()=>enviosPeriodo.filter(e=>esEnvioTardio(e,baseTardioMap)&&!e.aviso_tardio),[enviosPeriodo,baseTardioMap]);
async function marcarAvisoTardio(id,codigo,valor){
  setEnvios(prev=>prev.map(x=>x.id===id?{...x,aviso_tardio:valor}:x));
  try{
    const{error:errUpd}=await db.from('envios').update({aviso_tardio:valor}).eq('codigo',codigo);
    if(errUpd)toast('⚠ Error guardando: '+errUpd.message);
    else toast(valor?`✓ ${codigo} marcado como avisado al cliente`:`${codigo} vuelve a quedar pendiente de avisar`);
  }catch(e){toast('⚠ '+e.message);}
}
const clientesUnicos=[...new Set(envios.map(e=>e.cliente).filter(Boolean))].sort();const mensajerosUnicos=[...new Set(envios.map(e=>e.mensajero).filter(Boolean))].sort();const fuentesUnicas=[...new Set(envios.map(e=>e.fuente).filter(Boolean))].sort();function fuenteLabel(f){const m={etiqueta:'Manual (Etiqueta)',flex:'PDF Flex',externo:'Excel',propio:'Excel (propio)',sistema:'Excel (sistema)',colecta_AM:'Colecta AM',colecta_PM:'Colecta PM',cliente:'Portal Cliente',retiro_masivo:'Retiro Masivo'};return m[f]||f;}
// 'Todos' filtrado solo por fecha de despacho (enviosPeriodo) dejaba afuera los mismos casos que
// 'Entregado' y 'Retorno' ya resuelven por separado con su fecha real (despachado antes del periodo
// pero entregado/retornado dentro de el, o al reves) -- Luis reporto que buscando un codigo puntual
// con el filtro en 'Todos' no aparecia nada, pero ese mismo codigo si aparecia filtrando por
// 'Retorno'. Si 'Retorno' y 'Entregado' tienen su propia lista "real", 'Todos' tiene que ser el
// superset de ambas, no solo lo que calza por fecha de despacho.
const todosPeriodoReal=useMemo(()=>{
  const vistos=new Set();const out=[];
  const otrosFlat=ESTADOS_OTROS_REAL.reduce(function(acc,est){return acc.concat(otrosPeriodoReal[est]||[]);},[]);
  [...otrosFlat,...entregadosPeriodoReal,...retornadosPeriodoReal].forEach(e=>{if(!vistos.has(e.codigo)){vistos.add(e.codigo);out.push(e);}});
  return out;
},[otrosPeriodoReal,entregadosPeriodoReal,retornadosPeriodoReal]);
const filtrados=useMemo(()=>{const q=search.trim().toLowerCase();
  // El bucket 'Entregado' se arma con la fecha REAL de entrega (ver entregadosPeriodoReal mas
  // arriba), no filtrando enviosPeriodo (que esta acotado por fecha de despacho) -- por eso usa
  // su propia lista en vez de 'enviosPeriodo.filter(estado==="entregado")'. 'Retorno' usa el
  // mismo criterio (ver retornadosPeriodoReal mas arriba). 'Todos' CON busqueda usa el superset
  // de las tres (ver todosPeriodoReal mas arriba) para que buscar un codigo puntual nunca de 0
  // resultados aunque ese mismo codigo aparezca filtrando por 'Entregado' o 'Retorno'. Pero
  // 'Todos' SIN busqueda -- la vista general que se usa para saber cuantas piezas se recibieron
  // en el periodo, armar manifiestos, etc. -- debe seguir mostrando solo lo despachado DENTRO del
  // periodo elegido: si no, un envio despachado dias antes pero entregado/retornado justo hoy se
  // sumaba igual al total de "Hoy", inflando el conteo real de piezas recibidas (caso real
  // reportado por el equipo: 189 despachados hoy pero 218 mostrados en 'Todos'+'Hoy').
  // Vista 'actual': todo sale de enviosPeriodo (despachados en el rango) mirando el estado EN
  // VIVO de cada uno (e.estado) -- Entregado/Retorno dejan de tener lista propia por fecha real,
  // se tratan como cualquier otro estado. Vista 'cierre': un estado puntual (ni Entregado/Retorno
  // ni 'Todos') usa 'otrosPeriodoReal[filtroEst]' -- mismo criterio de "fecha real" que
  // Entregado/Retorno, ver comentario junto a su declaración. 'Todos' SIN búsqueda sigue usando
  // 'enviosPeriodoEfectivo' (despachado en el rango) a propósito -- ver comentario ahí.
  const baseLista=usaRecibido?enviosPeriodo:(filtroEst==='entregado'?entregadosPeriodoReal:filtroEst==='retorno'?retornadosPeriodoReal:filtroEst==='todos'?todosPeriodoReal:(otrosPeriodoReal[filtroEst]||[]));
  return baseLista.filter(e=>{const qTerms=q.split(/[\n,;\s]+/).map(t=>t.trim().toLowerCase()).filter(Boolean);
      const esMultiple=qTerms.length>1;
      const matchQ=!q||(esMultiple
        ?qTerms.some(t=>e.codigo.toLowerCase()===t||e.codigo.toLowerCase().includes(t))
        :e.codigo.toLowerCase().includes(q)||e.destinatario.toLowerCase().includes(q)||e.direccion.toLowerCase().includes(q)||e.comuna.toLowerCase().includes(q)||e.cliente.toLowerCase().includes(q)||(e.mensajero||'').toLowerCase().includes(q)||estadoInfo(e._estadoEfectivo||e.estado).label.toLowerCase().includes(q)||(e.fecha||'').toLowerCase().includes(q));const matchEst=filtroEst==='todos'?true:(usaRecibido?e.estado===filtroEst:(filtroEst==='entregado'||filtroEst==='retorno'||(e._estadoEfectivo||e.estado)===filtroEst));const matchCli=filtroCli==='todos'||e.cliente===filtroCli;const matchMen=filtroMen==='todos'||e.mensajero===filtroMen;const matchFuente=filtroFuente==='todos'||e.fuente===filtroFuente;const matchAtraso=filtroAtrasoModo==='off'?true:filtroAtrasoModo==='atrasados'?esEnvioAtrasado(e):filtroAtrasoModo==='reprogramados'?esReprogramadoRepetido(e):(esEnvioAtrasado(e)||esReprogramadoRepetido(e));return matchQ&&matchEst&&matchCli&&matchMen&&matchFuente&&matchAtraso;});},[envios,entregadosPeriodoReal,retornadosPeriodoReal,todosPeriodoReal,enviosPeriodoEfectivo,otrosPeriodoReal,enviosPeriodo,vistaEstado,usaRecibido,filtroEst,search,filtroCli,filtroMen,filtroFuente,filtroAtrasoModo,reprogCount]);
// Cantidad de envíos atrasados en el período actual (antes del filtro de "solo atrasados"),
// para mostrar el contador en el botón de filtro sin que el usuario tenga que activarlo primero.
const atrasadosCount=useMemo(()=>enviosPeriodo.filter(esEnvioAtrasado).length,[enviosPeriodo]);
// Un envío no puede estar a la vez 'en_ruta' (criterio de Atrasados) y 'reprogramado' (criterio
// de Reprogramados repetidos) -- el estado es único por envío -- así que sumar ambos conteos
// para el modo "Todos" nunca duplica un mismo envío.
const reprogramadosRepetidosCount=useMemo(()=>enviosPeriodo.filter(esReprogramadoRepetido).length,[enviosPeriodo,reprogCount]);
const combinadoAtrasoCount=atrasadosCount+reprogramadosRepetidosCount;
// Orden alfabético/numérico al hacer clic en el encabezado de una columna — clic de nuevo
// invierte el orden (asc/desc). null=sin ordenar (orden de llegada/sincronización).
function valorOrden(e,col){switch(col){case'codigo':return(e.codigo||'').toLowerCase();case'cliente':return(e.cliente||'').toLowerCase();case'destinatario':return(e.destinatario||'').toLowerCase();case'direccion':return(e.direccion||'').toLowerCase();case'comuna':return(e.comuna||'').toLowerCase();case'mensajero':return(e.mensajero||'').toLowerCase();case'estado':return estadoInfo(e._estadoEfectivo||e.estado).label.toLowerCase();case'fecha':return e.fecha||'';case'monto':return e.monto||0;default:return'';}}
const filtradosOrdenados=useMemo(()=>{if(!sortCol)return filtrados;const copia=filtrados.slice();copia.sort((a,b)=>{const va=valorOrden(a,sortCol),vb=valorOrden(b,sortCol);let cmp;if(typeof va==='number'&&typeof vb==='number')cmp=va-vb;else cmp=String(va).localeCompare(String(vb),'es');return sortDir==='asc'?cmp:-cmp;});return copia;},[filtrados,sortCol,sortDir]);
// Piezas que ve el modal "Detalle completo" de Atrasados -- mismo criterio que usa
// exportarHTMLPorCliente: respeta los filtros activos en pantalla (cliente/mensajero/tipo/
// búsqueda) y el modo elegido en el desplegable (atrasados/reprogramados/combinado); si el modo
// está en 'off' toma igual el combinado para no mostrar la lista completa de envíos por error.
// Base filtrada SOLO para el modal de Detalle completo: repite el mismo criterio de
// cliente/mensajero/tipo/estado/búsqueda que 'filtrados' (arriba), pero SIN pasar por su propio
// filtro de atraso -- ese sigue exigiendo 2+ reprogramaciones para el filtro rápido de la tabla
// principal, y este modal ahora debe mostrar también los reprogramados de una sola vez.
const atrasadosDetalleFiltrados=useMemo(()=>{
  const q=search.trim().toLowerCase();
  const baseLista=usaRecibido?enviosPeriodo:(filtroEst==='entregado'?entregadosPeriodoReal:filtroEst==='retorno'?retornadosPeriodoReal:filtroEst==='todos'?todosPeriodoReal:(otrosPeriodoReal[filtroEst]||[]));
  return baseLista.filter(e=>{
    const qTerms=q.split(/[\n,;\s]+/).map(t=>t.trim().toLowerCase()).filter(Boolean);
    const esMultiple=qTerms.length>1;
    const matchQ=!q||(esMultiple
      ?qTerms.some(t=>e.codigo.toLowerCase()===t||e.codigo.toLowerCase().includes(t))
      :e.codigo.toLowerCase().includes(q)||e.destinatario.toLowerCase().includes(q)||e.direccion.toLowerCase().includes(q)||e.comuna.toLowerCase().includes(q)||e.cliente.toLowerCase().includes(q)||(e.mensajero||'').toLowerCase().includes(q)||estadoInfo(e._estadoEfectivo||e.estado).label.toLowerCase().includes(q)||(e.fecha||'').toLowerCase().includes(q));
    const matchEst=filtroEst==='todos'?true:(usaRecibido?e.estado===filtroEst:(filtroEst==='entregado'||filtroEst==='retorno'||(e._estadoEfectivo||e.estado)===filtroEst));
    const matchCli=filtroCli==='todos'||e.cliente===filtroCli;
    const matchMen=filtroMen==='todos'||e.mensajero===filtroMen;
    const matchFuente=filtroFuente==='todos'||e.fuente===filtroFuente;
    return matchQ&&matchEst&&matchCli&&matchMen&&matchFuente;
  });
},[enviosPeriodo,entregadosPeriodoReal,retornadosPeriodoReal,todosPeriodoReal,enviosPeriodoEfectivo,otrosPeriodoReal,vistaEstado,usaRecibido,filtroEst,search,filtroCli,filtroMen,filtroFuente]);
const atrasadosDetalleBase=useMemo(()=>atrasadosDetalleFiltrados.filter(e=>filtroAtrasoModo==='atrasados'?esEnvioAtrasado(e):filtroAtrasoModo==='reprogramados'?esReprogramadoAlMenos1Vez(e):(esEnvioAtrasado(e)||esReprogramadoAlMenos1Vez(e))),[atrasadosDetalleFiltrados,filtroAtrasoModo,reprogCount]);
// Conteos de las pestañas del modal (Todos/Atrasados en ruta/Reprogramados) -- a diferencia de
// atrasadosCount/reprogramadosRepetidosCount (que solo miran el período, para el botón/dropdown
// de la tabla principal), estos SÍ respetan los filtros de cliente/mensajero/tipo/búsqueda que
// ahora se pueden cambiar dentro del propio modal, para que la pestaña muestre el número real de
// lo que se está viendo.
const atrasadosCountModal=useMemo(()=>atrasadosDetalleFiltrados.filter(esEnvioAtrasado).length,[atrasadosDetalleFiltrados]);
const reprogramadosCountModal=useMemo(()=>atrasadosDetalleFiltrados.filter(esReprogramadoAlMenos1Vez).length,[atrasadosDetalleFiltrados]);
const combinadoAtrasoCountModal=atrasadosCountModal+reprogramadosCountModal;
function toggleSort(col){if(sortCol===col)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortCol(col);setSortDir('asc');}setPage(1);}
function iconoSort(col){if(sortCol!==col)return'';return sortDir==='asc'?' ▲':' ▼';}
const totalPags=Math.max(1,Math.ceil(filtradosOrdenados.length/PAGE_SIZE));const paginado=filtradosOrdenados.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
// Las opciones de Cliente/Comuna/Mensajero son las MISMAS en las 50 filas de la página -- antes
// se generaba un array de <option> nuevo por cada fila (50 veces), lo que con decenas de
// clientes/comunas/mensajeros activos significaba miles de elementos <option> recreados en
// CADA edición de la tabla (cambiar un estado, tipear en el buscador, etc.), obligando a React a
// recorrerlos todos de nuevo aunque ninguno haya cambiado. Esto era una causa real y medible de
// la lentitud reportada (Luis: un cambio de estado podía demorar hasta ~1 minuto en reflejarse
// en pantalla con el período "Mes"/"Rango" cargado, por el tamaño de la tabla). Ahora se arma UNA
// sola vez por lista y se reutiliza el mismo array en las 50 filas -- React lo detecta como "sin
// cambios" y se salta ese trabajo por completo. No cambia nada visible ni de comportamiento.
const clienteOptionsShared=useMemo(()=>clientesActivos.map(c=>React.createElement("option",{key:c.id,value:c.nombre},c.nombre)),[clientesActivos]);
const comunaOptionsShared=useMemo(()=>COMUNAS_CHILE.map(c=>React.createElement("option",{key:c,value:c},c)),[]);
const mensajeroOptionsShared=useMemo(()=>mensajerosActivos.map(m=>React.createElement("option",{key:m.id,value:m.nombre},m.nombre.replace(/,\s*/g,' '))),[mensajerosActivos]);
// FIX 2026-09-22 (fusión "Recibido + Resuelto"): antes esto era UN solo 'stats', calculado
// distinto según vistaEstado ('actual' contaba en vivo sobre enviosPeriodo, 'cierre' contaba con
// las listas de fecha real). Luis pidió una 3ra vista que muestre AMBOS números a la vez por
// estado (recibido en el rango vs. resuelto en el rango, sin restarlos -- eso lo hace él con su
// propia fórmula de cobro), así que ahora se calculan los dos conjuntos siempre, sin importar qué
// vista esté activa -- ninguno de los dos depende de vistaEstado, así que no hay costo extra de
// red: enviosPeriodo/entregadosPeriodoReal/retornadosPeriodoReal ya se cargaban siempre, y
// otrosPeriodoReal ya se cargaba en cualquier vista que no fuera 'actual' (ver el guard en
// cargarOtrosPeriodoReal más arriba, que sigue sirviendo tal cual para la nueva vista 'fusion').
// FIX 2026-09-22 (tarjetas no respetaban Cliente/Mensajero/Tipo): Luis armó su propio Excel de
// SUPER XIYU (pivot por Fecha Recepción) y le dio 3.151 para el 01-15/09 -- pero con el filtro
// CLIENTE en "SUPER XIYU" el panel seguía mostrando 13.953 en la tarjeta Todos, el mismo número
// que con "Todos los clientes". Razón: 'stats' (y ahora 'statsRecibido'/'statsResuelto') SIEMPRE
// contaron sobre TODA la empresa -- el filtro de Cliente/Mensajero/Tipo (filtroCli/filtroMen/
// filtroFuente) solo se aplicaba a la TABLA de abajo ('filtrados'), nunca a las tarjetas de
// arriba. Esto no lo causó el cambio de hoy: ya pasaba en las dos vistas de siempre, solo que con
// menos clientes activos en el sistema hace semanas el total de la empresa por casualidad se
// parecía al de un solo cliente grande y no se notaba. Con más clientes activos ahora sí se nota,
// y es justo el número que Luis necesita para cobrar por cliente -- así que las tarjetas (y los
// dos números de arriba: recibidos/retorno resuelto) ahora respetan los mismos tres filtros que
// ya respeta la tabla.
function matchFiltrosTarjeta(e){return(filtroCli==='todos'||e.cliente===filtroCli)&&(filtroMen==='todos'||e.mensajero===filtroMen)&&(filtroFuente==='todos'||e.fuente===filtroFuente);}
const enviosPeriodoTarjetas=useMemo(()=>enviosPeriodo.filter(matchFiltrosTarjeta),[enviosPeriodo,filtroCli,filtroMen,filtroFuente]);
const entregadosPeriodoRealTarjetas=useMemo(()=>entregadosPeriodoReal.filter(matchFiltrosTarjeta),[entregadosPeriodoReal,filtroCli,filtroMen,filtroFuente]);
const retornadosPeriodoRealTarjetas=useMemo(()=>retornadosPeriodoReal.filter(matchFiltrosTarjeta),[retornadosPeriodoReal,filtroCli,filtroMen,filtroFuente]);
const todosPeriodoRealTarjetas=useMemo(()=>todosPeriodoReal.filter(matchFiltrosTarjeta),[todosPeriodoReal,filtroCli,filtroMen,filtroFuente]);
const statsRecibido=useMemo(()=>{const s={};ESTADOS_ENVIO.forEach(est=>{s[est.val]=enviosPeriodoTarjetas.filter(e=>e.estado===est.val).length;});return s;},[enviosPeriodoTarjetas]);
const statsResuelto=useMemo(()=>{const s={};ESTADOS_ENVIO.forEach(est=>{s[est.val]=est.val==='entregado'?entregadosPeriodoRealTarjetas.length:est.val==='retorno'?retornadosPeriodoRealTarjetas.length:(otrosPeriodoReal[est.val]||[]).filter(matchFiltrosTarjeta).length;});return s;},[otrosPeriodoReal,entregadosPeriodoRealTarjetas,retornadosPeriodoRealTarjetas,filtroCli,filtroMen,filtroFuente]);
function toggleSelect(id){setSelected(prev=>{const s=new Set(prev);if(s.has(id))s.delete(id);else s.add(id);return s;});}function toggleAll(){const todosIds=new Set(filtrados.map(e=>e.id));if(selected.size===filtrados.length&&filtrados.every(e=>selected.has(e.id)))setSelected(new Set());else setSelected(todosIds);}async function imprimirEtiquetasSeleccionadas(){
  const seleccionados=resolverEnviosPorId(selected);
  if(seleccionados.length===0)return;
  toast('Buscando etiquetas...');
  try{
    const CHUNK=200;
    const codigos=seleccionados.map(e=>e.codigo);
    let filas=[];
    for(let i=0;i<codigos.length;i+=CHUNK){
      const lote=codigos.slice(i,i+CHUNK);
      const {data,error}=await db.from('envios').select('codigo,foto_etiqueta').in('codigo',lote);
      if(error)throw error;
      filas=filas.concat(data||[]);
    }
    const conFoto=new Map(filas.filter(f=>f.foto_etiqueta).map(f=>[f.codigo,f.foto_etiqueta]));
    const urls=seleccionados.filter(e=>conFoto.has(e.codigo)).map(e=>conFoto.get(e.codigo));
    // Los que no tienen foto escaneada (ej. cargados por Excel) no se descartan: se genera
    // la etiqueta del sistema (tamaño 100x150mm, con QR) a partir de sus propios datos.
    const sinFoto=seleccionados.filter(e=>!conFoto.has(e.codigo));
    if(urls.length>0)imprimirFotoEtiqueta(urls);
    if(sinFoto.length>0){
      const logoSrc=(document.querySelector('.logo-img')||{}).src||'';
      const lista=sinFoto.map(e=>({id:e.id,codigo:e.codigo,cliente:e.cliente,destinatario:e.destinatario,telefono:e.telefono,direccion:e.direccion,comuna:e.comuna,referencia:e.referencia,monto:e.monto,nota:e.nota,fecha:e.fecha,enUnCambio:e.enUnCambio}));
      abrirVentanaEtiquetas(lista,logoSrc);
    }
    if(urls.length>0&&sinFoto.length>0)toast('✓ '+urls.length+' con foto escaneada · '+sinFoto.length+' generadas por el sistema');
    else if(sinFoto.length>0)toast('✓ '+sinFoto.length+' etiqueta'+(sinFoto.length>1?'s':'')+' generada'+(sinFoto.length>1?'s':'')+' por el sistema');
    else toast('✓ '+urls.length+' etiqueta'+(urls.length>1?'s':'')+' con foto escaneada');
  }catch(e){toast('⚠ Error buscando etiquetas: '+e.message);}
}const fmtFecha=f=>{try{return new Date(f+'T12:00:00').toLocaleDateString('es-CL');}catch(e){return f;}};const fechaEntregaDe=e=>{if(entregasReal&&entregasReal[e.codigo])return entregasReal[e.codigo];if(e.historial&&e.historial.length>0){const ent=[...e.historial].reverse().find(h=>h.estado==='entregado');if(ent&&ent.fecha)return ent.fecha;}if(e.estado==='entregado'&&e.updated_at)return e.updated_at;return'';};const fmtFechaHora=iso=>{try{return new Date(iso).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){return iso||'';}};
// Guarda un campo de la ficha del envío (usado por la grilla unificada de abajo, que reemplaza
// tanto las tarjetas de solo lectura como el panel separado "Editar Campos del Envío" que existían
// antes -- ahora todo es un solo lugar y cada campo se edita ahí mismo con un click).
async function guardarCampoDetalle(campo,valor){
  if(!detalleEnvio)return;
  const codigoAntes=detalleEnvio.codigo;
  const entrada=crearEntradaHistorial(detalleEnvio.estado,campo+' cambiado a "'+valor+'"',usuario?.nombre||'Admin');
  setDetalleEnvio(prev=>prev?Object.assign({},prev,{[campo]:valor,historial:[...(prev.historial||[]),entrada]}):prev);
  setEnvios(prev=>prev.map(e=>e.id===detalleEnvio.id?Object.assign({},e,{[campo]:valor,historial:[...(e.historial||[]),entrada]}):e));
  try{
    // Si se edita dirección o comuna, hay que limpiar lat/lng cacheado -- si no, el Mapa de
    // Rutas sigue mostrando el pin en la ubicación VIEJA (reusa esas coordenadas en vez de
    // volver a geocodificar) aunque la dirección ya haya quedado bien guardada acá.
    const upd={[campo]:valor};
    if(campo==='direccion'||campo==='comuna'){upd.lat=null;upd.lng=null;}
    await db.from('envios').update(upd).eq('codigo',codigoAntes);
    toast('✓ '+campo+' actualizado');
  }catch(err){toast('⚠ Error al guardar: '+err.message);}
}
// Catálogo de campos de la ficha: 'tipo' controla qué input se muestra al editar. El de Comuna
// usa COMUNAS_CHILE (el catálogo real y siempre actualizado) en vez de la lista corta hardcodeada
// que tenía el panel viejo.
const CAMPOS_ENVIO_DETALLE=[
  {key:'codigo',label:'Código',tipo:'text'},
  {key:'destinatario',label:'Destinatario',tipo:'text'},
  {key:'telefono',label:'Teléfono',tipo:'text'},
  {key:'direccion',label:'Dirección',tipo:'text'},
  {key:'comuna',label:'Comuna',tipo:'select',opciones:COMUNAS_CHILE},
  {key:'mensajero',label:'Mensajero',tipo:'text'},
  {key:'fecha',label:'Fecha',tipo:'date'},
  {key:'monto',label:'Monto',tipo:'number'}
];
function valorMostradoCampo(campo,v){
  if(campo==='monto')return v>0?'$'+Number(v).toLocaleString('es-CL'):'—';
  if(campo==='fecha')return v?fmtFecha(v):'—';
  if(campo==='mensajero')return(v&&v.replace(/,\s*/g,' '))||'Sin asignar';
  return(v!=null&&v!=='')?v:'—';
}
function iniciarEdicionCampo(campo,valorActual){
  setEdicionesCampo(prev=>Object.assign({},prev,{[campo]:valorActual!=null?String(valorActual):''}));
}
function cancelarEdicionCampo(campo){
  setEdicionesCampo(prev=>{const n=Object.assign({},prev);delete n[campo];return n;});
}
async function confirmarEdicionCampo(campo,tipo){
  const bruto=edicionesCampo[campo];
  const valor=tipo==='number'?(parseFloat(bruto)||0):bruto;
  // Mensajero y Comuna son 2 de los 4 campos críticos -- aunque acá ya hay un paso de
  // "✎ Editar" antes de guardar, ese ✓ aplicaba directo sin mostrar valor anterior vs nuevo.
  // Ahora pasan por el mismo modal de confirmación que el resto de la tabla/detalle.
  if(campo==='mensajero'||campo==='comuna'){
    const anterior=detalleEnvio[campo];
    const etiquetaVacio=campo==='mensajero'?'Sin asignar':'Sin comuna';
    if(String(valor)===String(anterior||'')){cancelarEdicionCampo(campo);return;}
    pedirConfirmacionCambio(campo==='mensajero'?'Mensajero':'Comuna',anterior||etiquetaVacio,valor||etiquetaVacio,async()=>{await guardarCampoDetalle(campo,valor);});
    cancelarEdicionCampo(campo);
    return;
  }
  await guardarCampoDetalle(campo,valor);
  cancelarEdicionCampo(campo);
}
function renderCampoEditable(campo){
  const enEdicion=Object.prototype.hasOwnProperty.call(edicionesCampo,campo.key);
  const valorActual=detalleEnvio[campo.key];
  return/*#__PURE__*/React.createElement("div",{key:campo.key,style:{padding:'14px 16px',background:'linear-gradient(145deg,#ffffff,#f5eedc)',borderRadius:12,border:'1px solid rgba(200,168,75,0.25)',boxShadow:'5px 5px 10px rgba(43,46,32,0.12),-2px -2px 6px rgba(255,255,255,1),inset 0 1px 0 rgba(255,255,255,0.9)'}},
    /*#__PURE__*/React.createElement("div",{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,gap:8}},
      /*#__PURE__*/React.createElement("div",{style:{fontSize:13,color:'#C8A84B',letterSpacing:3,textTransform:'uppercase',fontFamily:'Bebas Neue',fontWeight:700,textShadow:'0 1px 2px rgba(200,168,75,0.3)'}},campo.label),
      !enEdicion&&/*#__PURE__*/React.createElement("button",{onClick:()=>iniciarEdicionCampo(campo.key,valorActual),title:'Editar '+campo.label,style:{background:'none',border:'none',color:'var(--gold)',cursor:'pointer',fontSize:12,fontWeight:700,padding:0,flexShrink:0}},"✎ Editar")
    ),
    enEdicion
      ?/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:6}},
          campo.tipo==='select'
            ?/*#__PURE__*/React.createElement("select",{className:'form-input',value:edicionesCampo[campo.key],onChange:e=>setEdicionesCampo(prev=>Object.assign({},prev,{[campo.key]:e.target.value})),autoFocus:true,style:{margin:0}},
                campo.opciones.map(o=>/*#__PURE__*/React.createElement("option",{key:o,value:o},o))
              )
            :/*#__PURE__*/React.createElement("input",{className:'form-input',type:campo.tipo==='number'?'number':campo.tipo==='date'?'date':'text',value:edicionesCampo[campo.key],onChange:e=>setEdicionesCampo(prev=>Object.assign({},prev,{[campo.key]:e.target.value})),autoFocus:true,style:{margin:0,fontSize:14}}),
          /*#__PURE__*/React.createElement("button",{className:'btn-primary',style:{padding:'6px 10px'},onClick:()=>confirmarEdicionCampo(campo.key,campo.tipo)},"✓"),
          /*#__PURE__*/React.createElement("button",{className:'btn-secondary',style:{padding:'6px 10px'},onClick:()=>cancelarEdicionCampo(campo.key)},"✕")
        )
      :/*#__PURE__*/React.createElement("div",{style:{fontSize:18,fontWeight:500,color:'#1a1d13',lineHeight:1.3,filter:'drop-shadow(0 1px 1px rgba(43,46,32,0.1))'}},valorMostradoCampo(campo.key,valorActual))
  );
}
// Nota privada (solo admin) y valor del siniestro: antes vivían en el panel separado "Editar
// Campos del Envío" más abajo del historial -- ahora son parte de la misma ficha unificada, con
// el mismo mecanismo de edición de un click que el resto de los campos.
function renderCampoLargo(campo,label,tipo,candado){
  const enEdicion=Object.prototype.hasOwnProperty.call(edicionesCampo,campo);
  const valorActual=detalleEnvio[campo];
  return/*#__PURE__*/React.createElement("div",{key:campo,style:{padding:'12px 16px',background:candado?'rgba(200,168,75,0.06)':'rgba(176,48,48,0.06)',border:'1px solid '+(candado?'var(--gold-border)':'rgba(176,48,48,0.3)'),borderRadius:10,marginBottom:12}},
    /*#__PURE__*/React.createElement("div",{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,gap:8}},
      /*#__PURE__*/React.createElement("div",{className:'form-label',style:{margin:0}},(candado?'🔒 ':'⚠️ ')+label),
      !enEdicion&&/*#__PURE__*/React.createElement("button",{onClick:()=>iniciarEdicionCampo(campo,valorActual),title:'Editar',style:{background:'none',border:'none',color:'var(--gold)',cursor:'pointer',fontSize:12,fontWeight:700,padding:0,flexShrink:0}},"✎ Editar")
    ),
    enEdicion
      ?/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:8}},
          /*#__PURE__*/React.createElement("input",{className:'form-input',type:tipo,value:edicionesCampo[campo],onChange:e=>setEdicionesCampo(prev=>Object.assign({},prev,{[campo]:e.target.value})),autoFocus:true,style:{margin:0}}),
          /*#__PURE__*/React.createElement("button",{className:'btn-primary',onClick:()=>confirmarEdicionCampo(campo,tipo)},"✓"),
          /*#__PURE__*/React.createElement("button",{className:'btn-secondary',onClick:()=>cancelarEdicionCampo(campo)},"✕")
        )
      :/*#__PURE__*/React.createElement("div",{style:{fontSize:13,color:'var(--text-mid)'}},tipo==='number'?(valorActual>0?'$'+Number(valorActual).toLocaleString('es-CL'):'—'):(valorActual||'—'))
  );
}
return/*#__PURE__*/React.createElement("div",null,/*#__PURE__*/React.createElement("div",{className:"section-head",style:{flexWrap:'wrap',gap:10}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',gap:12}},/*#__PURE__*/React.createElement("div",{className:"section-title"},"Gesti\xF3n de ",/*#__PURE__*/React.createElement("span",null,"Env\xEDos")),/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',gap:6,background:'rgba(46,125,79,0.1)',border:'1px solid rgba(46,125,79,0.2)',borderRadius:20,padding:'4px 10px'}},/*#__PURE__*/React.createElement("div",{style:{width:8,height:8,borderRadius:'50%',background:'#2e7d4f',animation:'pulse 2s infinite'}}),/*#__PURE__*/React.createElement("span",{style:{fontSize:10,color:'#2e7d4f',fontWeight:700,letterSpacing:1}},"TIEMPO REAL"))),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:8,flexWrap:'wrap'}},/*#__PURE__*/React.createElement("button",{onClick:sincronizarDesdeSupabase,disabled:sincronizando,className:'btn-futurista btn-f-dark',style:{display:'flex',alignItems:'center',gap:6,opacity:sincronizando?0.7:1}},sincronizando?'↺ Sincronizando...':'↺ Sincronizar Riders'),
  (()=>{const listaNegraCount=lsLoad('envios_eliminados',[]).length;return/*#__PURE__*/React.createElement("button",{onClick:()=>setShowListaNegra(v=>!v),style:{padding:'8px 14px',borderRadius:8,border:'1px solid '+(listaNegraCount>0?'rgba(176,48,48,0.8)':'rgba(100,100,100,0.4)'),background:showListaNegra?'rgba(176,48,48,0.25)':(listaNegraCount>0?'rgba(176,48,48,0.15)':'rgba(80,80,80,0.12)'),color:'#ffffff',cursor:'pointer',fontWeight:700,fontSize:12,display:'flex',alignItems:'center',gap:6}},"⊘ Lista negra",(listaNegraCount>0&&/*#__PURE__*/React.createElement("span",{style:{background:'rgba(176,48,48,0.3)',borderRadius:10,padding:'1px 7px',fontSize:11}},listaNegraCount)));})(),/*#__PURE__*/React.createElement("input",{id:"gestion-pdf-inp",ref:pdfRef,type:"file",accept:"application/pdf",style:{display:'none'},onChange:e=>{const f=e.target.files[0];if(!f)return;importarPDF(f,window._colecta_pdf_cliente||clientePDF);e.target.value='';}})  ,/*#__PURE__*/React.createElement("button",{onClick:()=>setSubTab('nuevo'),className:'btn-futurista btn-f-gold'},"+ Nuevo Env\xEDo"))),showPDFModal&&/*#__PURE__*/React.createElement(Modal,{title:'📄 Importar PDF Flex',onClose:()=>{setShowPDFModal(false);setPdfPreview(null);setClientePDF('');}},
  !pdfPreview&&/*#__PURE__*/React.createElement('div',null,
    /*#__PURE__*/React.createElement('div',{className:'form-group'},
      /*#__PURE__*/React.createElement('label',{className:'form-label'},'1. Selecciona el cliente al que corresponde este PDF'),
      /*#__PURE__*/React.createElement('select',{className:'form-input',value:clientePDF,onChange:e=>setClientePDF(e.target.value)},
        /*#__PURE__*/React.createElement('option',{value:''},'Seleccionar cliente...'),
        clientesActivos.map(c=>/*#__PURE__*/React.createElement('option',{key:c.id,value:c.nombre},c.nombre))
      )
    ),
    clientePDF&&/*#__PURE__*/React.createElement('div',{className:'form-group'},
      /*#__PURE__*/React.createElement('label',{className:'form-label'},'2. Sube el PDF de etiquetas Flex'),
      procesandoPDF
        ?/*#__PURE__*/React.createElement('div',{style:{padding:'24px 16px'}},
            /*#__PURE__*/React.createElement('div',{style:{textAlign:'center',marginBottom:16}},
              /*#__PURE__*/React.createElement('div',{style:{fontSize:32,marginBottom:8,animation:'spin 1.5s linear infinite',display:'inline-block'}},'⏳'),
              /*#__PURE__*/React.createElement('div',{style:{fontWeight:700,color:'var(--dark)',marginBottom:4}},'Procesando PDF...'),
              /*#__PURE__*/React.createElement('div',{style:{fontSize:13,color:'var(--gold)',fontWeight:600,minHeight:20}},progresoPDF)
            ),
            /*#__PURE__*/React.createElement('div',{style:{background:'var(--cream)',borderRadius:10,height:8,overflow:'hidden',border:'1px solid var(--border)'}},
              /*#__PURE__*/React.createElement('div',{style:{
                height:'100%',
                borderRadius:10,
                background:'linear-gradient(90deg,var(--gold),#a87d2a)',
                width:(()=>{if(!progresoPDF)return'5%';const m=progresoPDF.match(/(\d+)\s*\/\s*(\d+)/);if(m){const pct=Math.round(parseInt(m[1])/parseInt(m[2])*100);return Math.max(10,pct)+'%';}if(progresoPDF.includes('Listo')||progresoPDF.includes('✅'))return'100%';if(progresoPDF.includes('Finalizando'))return'92%';if(progresoPDF.includes('Renderizando'))return'70%';if(progresoPDF.includes('IA')||progresoPDF.includes('extrayendo'))return'40%';if(progresoPDF.includes('Leyendo')||progresoPDF.includes('cargado'))return'15%';return'8%';})(),
                transition:'width 0.4s ease'
              }})
            ),
            /*#__PURE__*/React.createElement('div',{style:{textAlign:'center',fontSize:11,color:'var(--text-soft)',marginTop:8}},
              'Esto puede tomar 30-60 segundos para PDFs grandes'
            )
          )
        :/*#__PURE__*/React.createElement('div',{onClick:()=>pdfRef.current.click(),style:{border:'2px dashed rgba(200,168,75,0.4)',borderRadius:10,padding:'24px',textAlign:'center',cursor:'pointer',background:'rgba(200,168,75,0.04)',transition:'all 0.2s'},onMouseEnter:e=>e.currentTarget.style.borderColor='var(--gold)',onMouseLeave:e=>e.currentTarget.style.borderColor='rgba(200,168,75,0.4)'},
            /*#__PURE__*/React.createElement('div',{style:{fontSize:36,marginBottom:8}},'📄'),
            /*#__PURE__*/React.createElement('div',{style:{fontWeight:700,marginBottom:4}},'Clic para seleccionar PDF'),
            /*#__PURE__*/React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)'}},'Archivo .pdf de etiquetas Flex · Todos los envíos se cargarán al cliente: ',/*#__PURE__*/React.createElement('strong',{style:{color:'var(--gold)'}},clientePDF))
          )
    ),
    /*#__PURE__*/React.createElement('div',{className:'modal-actions'},
      /*#__PURE__*/React.createElement('button',{className:'btn-secondary',onClick:()=>{setShowPDFModal(false);setClientePDF('');}},'Cancelar')
    )
  ),
  pdfPreview&&/*#__PURE__*/React.createElement('div',null,
    /*#__PURE__*/React.createElement('div',{style:{background:'rgba(200,168,75,0.08)',border:'1px solid var(--gold-border)',borderRadius:8,padding:'12px 16px',marginBottom:16}},
      /*#__PURE__*/React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1.5,color:'var(--dark)',marginBottom:4}},'✓ PDF Procesado'),
      /*#__PURE__*/React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)'}},pdfPreview.total,' envíos encontrados',pdfPreview.conFoto>0?' · ':'',(pdfPreview.conFoto>0&&/*#__PURE__*/React.createElement('span',{style:{color:'var(--success)',fontWeight:700}},'📷 '+pdfPreview.conFoto+' con foto etiqueta')),(' · Cliente: '),/*#__PURE__*/React.createElement('strong',{style:{color:'var(--gold)'}},pdfPreview.cliente))
    ),
    /*#__PURE__*/React.createElement('div',{style:{maxHeight:300,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8,marginBottom:16}},
      /*#__PURE__*/React.createElement('table',null,
        /*#__PURE__*/React.createElement('thead',null,/*#__PURE__*/React.createElement('tr',null,
          /*#__PURE__*/React.createElement('th',null,'Código'),
          /*#__PURE__*/React.createElement('th',null,'Destinatario'),
          /*#__PURE__*/React.createElement('th',null,'Dirección'),
          /*#__PURE__*/React.createElement('th',null,'Comuna')
        )),
        /*#__PURE__*/React.createElement('tbody',null,pdfPreview.envios.slice(0,20).map((e,i)=>
          /*#__PURE__*/React.createElement('tr',{key:i},
            /*#__PURE__*/React.createElement('td',{style:{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700}},e.codigo),
            /*#__PURE__*/React.createElement('td',{style:{fontSize:11}},e.destinatario||'—'),
            /*#__PURE__*/React.createElement('td',{style:{fontSize:11,color:'var(--text-soft)',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis'}},e.direccion||'—'),
            /*#__PURE__*/React.createElement('td',null,/*#__PURE__*/React.createElement('span',{style:{background:'var(--dark-deep)',color:'var(--gold)',padding:'2px 6px',borderRadius:4,fontSize:10,fontWeight:700}},e.comuna||'—'))
          )
        )),
        pdfPreview.envios.length>20&&/*#__PURE__*/React.createElement('tbody',null,/*#__PURE__*/React.createElement('tr',null,
          /*#__PURE__*/React.createElement('td',{colSpan:4,style:{textAlign:'center',color:'var(--text-soft)',fontSize:12,padding:'8px'}},
            '...y '+(pdfPreview.envios.length-20)+' más'
          )
        ))
      )
    ),
    /*#__PURE__*/React.createElement('div',{className:'modal-actions'},
      /*#__PURE__*/React.createElement('button',{className:'btn-secondary',onClick:()=>{setPdfPreview(null);}}, '← Volver'),
      /*#__PURE__*/React.createElement('button',{className:'btn-primary',onClick:confirmarImportPDF},'✓ Confirmar · '+pdfPreview.total+' envíos → '+pdfPreview.cliente)
    )
  )
),
showListaNegra&&(()=>{const lista=lsLoad('envios_eliminados',[]);return/*#__PURE__*/React.createElement("div",{style:{background:'#fff',border:'1px solid rgba(176,48,48,0.25)',borderTop:'3px solid #e05555',borderRadius:10,padding:20,marginBottom:16,boxShadow:'0 2px 10px rgba(43,46,32,0.07)'}},
  React.createElement("div",{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}},
    React.createElement("div",null,
      React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1.5,color:'var(--dark)'}},"Lista Negra — Envíos eliminados"),
      React.createElement("div",{style:{fontSize:12,color:'var(--text-soft)',marginTop:2}},"Estos códigos fueron eliminados manualmente y no volverán al sincronizar. ",React.createElement("strong",null,lista.length," código",lista.length!==1?'s':''," bloqueado",lista.length!==1?'s':''))
    ),
    React.createElement("div",{style:{display:'flex',gap:8}},
      lista.length>0&&React.createElement("button",{onClick:()=>{if(!window.confirm('¿Limpiar toda la lista negra? Los códigos podrán volver a sincronizarse desde Supabase.'))return;lsSave('envios_eliminados',[]);setShowListaNegra(false);toast('Lista negra limpiada');},style:{padding:'7px 14px',borderRadius:8,border:'1px solid rgba(176,48,48,0.3)',background:'rgba(176,48,48,0.06)',color:'#e05555',cursor:'pointer',fontWeight:700,fontSize:12}},"🗑 Limpiar todo"),
      React.createElement("button",{onClick:()=>setShowListaNegra(false),style:{padding:'7px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--cream)',color:'var(--text-soft)',cursor:'pointer',fontWeight:700,fontSize:12}},"Cerrar")
    )
  ),
  lista.length===0
    ?React.createElement("div",{style:{textAlign:'center',padding:'20px',color:'var(--text-soft)',fontSize:13}},"✅ Lista vacía — no hay códigos bloqueados")
    :React.createElement("div",{style:{display:'flex',flexWrap:'wrap',gap:8,maxHeight:220,overflowY:'auto',padding:'4px 0'}},
      lista.map((cod,i)=>React.createElement("div",{key:cod,style:{display:'flex',alignItems:'center',gap:6,background:'rgba(176,48,48,0.06)',border:'1px solid rgba(176,48,48,0.2)',borderRadius:8,padding:'6px 10px'}},
        React.createElement("span",{style:{fontFamily:'JetBrains Mono',fontSize:12,fontWeight:700,color:'var(--dark)'}},cod),
        React.createElement("button",{onClick:()=>{const nueva=lista.filter(c=>c!==cod);lsSave('envios_eliminados',nueva);toast('Código '+cod+' quitado de lista negra');},style:{background:'none',border:'none',color:'rgba(176,48,48,0.6)',cursor:'pointer',fontSize:14,lineHeight:1,padding:'0 2px'}},"×")
      ))
    )
);
})(),
/*#__PURE__*/React.createElement('div',{style:{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap',paddingTop:10}},
  /*#__PURE__*/React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:13,letterSpacing:2,color:'var(--text-soft)',marginRight:4}},'PERÍODO:'),
  [{val:'hoy',label:'Hoy'},{val:'ayer',label:'Ayer'},{val:'semana',label:'Esta semana'},{val:'mes',label:'Mes'},{val:'rango',label:'Rango'}].map(function(p){return/*#__PURE__*/React.createElement('button',{key:p.val,onClick:function(){setPeriodo(p.val);setPage(1);},style:{padding:'6px 16px',borderRadius:20,border:'1px solid '+(periodo===p.val?'var(--gold)':'var(--border)'),background:periodo===p.val?'rgba(200,168,75,0.12)':'#fff',color:periodo===p.val?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer',transition:'all 0.15s'}},p.label);}),
  periodo==='mes'&&/*#__PURE__*/React.createElement('input',{type:'month',value:mesFiltro,onChange:function(e){setMesFiltro(e.target.value);setPage(1);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--gold)',fontSize:12,outline:'none',color:'var(--dark)'}}),
  periodo==='rango'&&/*#__PURE__*/React.createElement(React.Fragment,null,
    /*#__PURE__*/React.createElement('input',{type:'date',value:desde,onChange:function(e){setDesde(e.target.value);setPage(1);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12,outline:'none'}}),
    /*#__PURE__*/React.createElement('span',{style:{color:'var(--text-soft)',fontSize:12}},'al'),
    /*#__PURE__*/React.createElement('input',{type:'date',value:hasta,onChange:function(e){setHasta(e.target.value);setPage(1);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12,outline:'none'}})
  ),
  /*#__PURE__*/React.createElement('div',{style:{marginLeft:'auto',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}},
    // NUEVO 2026-09-22: se agrega "retorno resuelto" al lado del contador de siempre -- Luis
    // necesita los dos números (recibido y retorno resuelto) a simple vista, sin cambiar de
    // vista, para armar su fórmula de cobro (recibido menos retorno). El primero (recibido) es
    // el mismo contador de siempre, solo con la etiqueta aclarada; el segundo es nuevo.
    /*#__PURE__*/React.createElement('span',{title:'Envíos DESPACHADOS dentro del rango elegido (columna Fecha), en cualquier estado que estén ahora -- es el "recibido" de la fórmula de cobro (recibido − retorno).',style:{display:'flex',alignItems:'center',gap:8,fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1,color:'var(--dark)',background:'linear-gradient(145deg,#fff,#f5eedc)',border:'1.5px solid var(--gold)',borderRadius:12,padding:'6px 16px',boxShadow:'3px 3px 8px rgba(43,46,32,0.1)'}},
      sincronizando?/*#__PURE__*/React.createElement('span',{style:{fontSize:13,fontFamily:'DM Sans',color:'var(--text-soft)'}},'Sincronizando...'):/*#__PURE__*/React.createElement(React.Fragment,null,
        /*#__PURE__*/React.createElement('span',{style:{color:'var(--gold)',fontSize:22}},enviosPeriodoTarjetas.length.toLocaleString('es-CL')),
        /*#__PURE__*/React.createElement('span',{style:{fontSize:11,fontFamily:'DM Sans',color:'var(--text-soft)',letterSpacing:0,textTransform:'none'}},'recibidos en el período')
      )
    ),
    /*#__PURE__*/React.createElement('span',{title:'Envíos cuyo ÚLTIMO movimiento a Retorno ocurrió dentro del rango elegido, sin importar cuándo se despacharon -- mismo criterio que la vista "Resuelto en el período". Es el "retorno" de la fórmula de cobro (recibido − retorno).',style:{display:'flex',alignItems:'center',gap:8,fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1,color:'var(--dark)',background:'linear-gradient(145deg,#fff,#fbe9e9)',border:'1.5px solid #c86a6a',borderRadius:12,padding:'6px 16px',boxShadow:'3px 3px 8px rgba(43,46,32,0.1)'}},
      cargandoRetornadosReal?/*#__PURE__*/React.createElement('span',{style:{fontSize:13,fontFamily:'DM Sans',color:'var(--text-soft)'}},'Actualizando...'):/*#__PURE__*/React.createElement(React.Fragment,null,
        /*#__PURE__*/React.createElement('span',{style:{color:'#c86a6a',fontSize:22}},retornadosPeriodoRealTarjetas.length.toLocaleString('es-CL')),
        /*#__PURE__*/React.createElement('span',{style:{fontSize:11,fontFamily:'DM Sans',color:'var(--text-soft)',letterSpacing:0,textTransform:'none'}},'retorno resuelto en el período')
      )
    )
  )
),
/*#__PURE__*/React.createElement('div',{style:{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap'}},
  /*#__PURE__*/React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:13,letterSpacing:2,color:'var(--text-soft)',marginRight:4}},'VISTA:'),
  [{val:'cierre',label:'Resuelto en el período',title:'Para cada estado (Entregado, Retorno, Reprogramado, Cancelado, etc.), muestra los códigos cuyo ÚLTIMO movimiento a ese estado ocurrió DENTRO de las fechas elegidas -- sin importar cuándo se despachó el envío. USA ESTA para pagar mensajeros y para cobrar a clientes: un envío cuenta en el período en que se RESOLVIÓ (se entregó, volvió, etc.), no en el que se despachó -- por ejemplo un envío reprogramado en la quincena 1 que termina como retorno en la quincena 2 cuenta como retorno de la quincena 2. También sirve para cruzar información con un reporte externo (ej. el Drive de un cliente).'},
   {val:'actual',label:'Despachado en el período',title:'Solo para los envíos DESPACHADOS dentro del rango elegido, muestra el estado en el que están AHORA MISMO, sin importar si ya se resolvió o no. Es para seguimiento operativo (cuánto despachaste en el rango y cómo va esa tanda) -- NO la uses para pagar ni cobrar, para eso usa "Resuelto en el período". Un envío despachado ANTES del rango, aunque se haya resuelto dentro de él, no aparece acá.'},
   // NUEVO 2026-09-22: Luis necesitaba los dos números a la vez para su fórmula de cobro
   // (recibido menos retorno) sin tener que cambiar de vista y perder de vista el otro número.
   // Esta 3ra vista muestra, por cada estado, "recibido" (despachado en el rango, igual que
   // "Despachado en el período") Y "resuelto" (fecha real del último movimiento, igual que
   // "Resuelto en el período") lado a lado en la misma tarjeta. El sistema NO resta uno del otro
   // a propósito -- Luis pidió ver los dos números por separado y hacer la resta él mismo, por si
   // aplica otros descuentos aparte. La tabla/export de abajo NO tiene selector manual (se probó y
   // confundía más de lo que ayudaba -- ver "no entiendes o que?"): arma sola el criterio correcto
   // por estado, igual que 'cierre' -- "Todos" y el resto de los estados usan "recibido" (para que
   // calce con el pivot de Luis), Entregado y Retorno siempre usan "resuelto" (para que calce con
   // el badge "retorno resuelto en el período", sin importar cuándo se despachó el envío).
   {val:'fusion',label:'Recibido + Resuelto',title:'Para cada estado, muestra DOS números lado a lado: cuántos códigos se DESPACHARON en el rango elegido ("recibido", igual que "Despachado en el período") y cuántos se RESOLVIERON en el rango elegido ("resuelto", igual que "Resuelto en el período" -- fecha real del último movimiento, sin importar cuándo se despachó). Pensada para armar el cálculo de cobro/pago cuando necesitas los dos números a la vez, sin cambiar de pestaña. El sistema no resta uno del otro -- muestra los dos por separado y la resta la haces tú. La tabla/export de abajo arma sola el criterio correcto: "Todos" y el resto de los estados usan "recibido", Entregado y Retorno siempre usan "resuelto".'}
  ].map(function(v){return/*#__PURE__*/React.createElement('button',{key:v.val,title:v.title,onClick:function(){setVistaEstado(v.val);setPage(1);},style:{padding:'6px 16px',borderRadius:20,border:'1px solid '+(vistaEstado===v.val?'var(--gold)':'var(--border)'),background:vistaEstado===v.val?'rgba(200,168,75,0.12)':'#fff',color:vistaEstado===v.val?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer',transition:'all 0.15s'}},v.label);})
),
sincronizando?/*#__PURE__*/React.createElement("div",{style:{textAlign:'center',padding:'20px',color:'var(--text-soft)',fontSize:13,marginBottom:20}},'⏳ Sincronizando historial completo desde la nube...'):
/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:10,flexWrap:'wrap',marginBottom:20,paddingTop:14,overflowX:'auto'}},[{val:'todos',label:'Todos',color:'var(--gold)'},...ESTADOS_ENVIO].map(est=>{
  // NUEVO 2026-09-22 (vista 'fusion'): 'countRecibido'/'countResuelto' se calculan SIEMPRE (no
  // solo en 'fusion') para no repetir la lógica -- en las otras dos vistas solo se usa 'count'
  // (el que corresponde a esa vista), igual que antes.
  const countRecibido=est.val==='todos'?enviosPeriodoTarjetas.length:statsRecibido[est.val]||0;
  const countResuelto=est.val==='todos'?todosPeriodoRealTarjetas.length:statsResuelto[est.val]||0;
  const count=vistaEstado==='actual'?countRecibido:countResuelto;
  const active=filtroEst===est.val;const accentColor=est.color||'var(--gold)';return/*#__PURE__*/React.createElement("div",{key:est.val,onClick:()=>{setFiltroEst(est.val);setPage(1);},style:{
  padding:'16px 18px',borderRadius:14,cursor:'pointer',minWidth:vistaEstado==='fusion'?150:100,textAlign:'center',
  background:active?'linear-gradient(145deg,#ffffff,#f0e8d0)':'linear-gradient(145deg,#fff,#faf3e0)',
  border:'2px solid '+(active?accentColor:'rgba(200,168,75,0.12)'),
  borderTop:'4px solid '+(active?accentColor:'rgba(200,168,75,0.08)'),
  boxShadow:active?'8px 8px 16px rgba(43,46,32,0.15),-3px -3px 8px rgba(255,255,255,0.95),0 0 20px '+accentColor+'33':'4px 4px 8px rgba(43,46,32,0.08),-2px -2px 6px rgba(255,255,255,0.9)',
  transform:active?'perspective(600px) rotateX(-2deg) translateY(-5px)':'perspective(600px) rotateX(0deg)',
  transition:'all 0.25s cubic-bezier(0.34,1.56,0.64,1)'}},
  vistaEstado==='fusion'
    ?/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:8,justifyContent:'center',alignItems:'baseline'}},
        /*#__PURE__*/React.createElement("div",null,
          /*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:26,lineHeight:1,color:active?accentColor:'#9a9d8a',transition:'all 0.25s'}},countRecibido),
          /*#__PURE__*/React.createElement("div",{style:{fontSize:7,fontWeight:600,letterSpacing:0.5,color:active?accentColor:'#b0b3a0',opacity:0.75,marginTop:1}},'recibido')
        ),
        /*#__PURE__*/React.createElement("div",{style:{width:1,alignSelf:'stretch',background:active?accentColor+'44':'rgba(0,0,0,0.1)'}}),
        /*#__PURE__*/React.createElement("div",null,
          /*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:26,lineHeight:1,color:active?accentColor:'#9a9d8a',transition:'all 0.25s'}},countResuelto),
          /*#__PURE__*/React.createElement("div",{style:{fontSize:7,fontWeight:600,letterSpacing:0.5,color:active?accentColor:'#b0b3a0',opacity:0.75,marginTop:1}},'resuelto')
        )
      )
    :/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:42,lineHeight:1,
    color:active?accentColor:'#9a9d8a',
    textShadow:active?'0 0 12px '+accentColor+'88':'none',
    filter:active?'drop-shadow(0 2px 2px rgba(43,46,32,0.2))':'none',
    transition:'all 0.25s'}},count),
  /*#__PURE__*/React.createElement("div",{style:{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:active?accentColor:'#b0b3a0',marginTop:8,transition:'all 0.25s'}},est.label,
    // 'Entregado' se calcula con la fecha REAL de entrega (igual que Pagos Mensajeros), no con
    // la fecha de despacho como el resto de las tarjetas -- por eso puede no calzar exactamente
    // con 'Todos' menos la suma del resto. Se avisa aca mismo para no repetir la confusion.
    est.val==='entregado'&&(vistaEstado==='cierre'||vistaEstado==='fusion')&&/*#__PURE__*/React.createElement("div",{style:{fontSize:7,fontWeight:600,letterSpacing:0.5,textTransform:'none',color:active?accentColor:'#b0b3a0',opacity:0.75,marginTop:2}},cargandoEntregadosReal?'actualizando…':'"resuelto" = fecha real de entrega')));})),selected.size>0&&/*#__PURE__*/React.createElement("div",{style:{background:'linear-gradient(145deg,#ffffff,#f5eedc)',border:'1px solid rgba(200,168,75,0.3)',borderTop:'3px solid var(--gold)',borderRadius:14,padding:'16px 20px',marginBottom:16,boxShadow:'6px 6px 16px rgba(43,46,32,0.12),-2px -2px 8px rgba(255,255,255,0.9)'}},
  // Encabezado
  React.createElement("div",{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}},
    React.createElement("div",{style:{display:'flex',alignItems:'center',gap:8}},
      React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:32,color:'var(--gold)',lineHeight:1,filter:'drop-shadow(0 0 8px rgba(200,168,75,0.4))'}},selected.size),
      React.createElement("span",{style:{fontSize:11,color:'var(--text-soft)',fontWeight:700,letterSpacing:2,textTransform:'uppercase'}},"envío",selected.size>1?'s':'',' seleccionado',selected.size>1?'s':'')
    ),
    React.createElement("button",{onClick:()=>setSelected(new Set()),style:{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:18,lineHeight:1,padding:'0 4px'}},"✕")
  ),
  // Botones en dos filas
  React.createElement("div",{style:{display:'flex',gap:8,flexWrap:'wrap'}},
    React.createElement("button",{onClick:()=>setAsignarModal(true),className:'btn-futurista btn-f-gold',style:{display:'flex',alignItems:'center',gap:6}},"Asignar mensajero"),
    React.createElement("button",{onClick:()=>setCambiarClienteModal(true),className:'btn-futurista btn-f-ghost',style:{display:'flex',alignItems:'center',gap:6}},"Cambiar cliente"),
    React.createElement("button",{onClick:imprimirEtiquetasSeleccionadas,className:'btn-futurista btn-f-ghost',style:{display:'flex',alignItems:'center',gap:6}},"🖨 Imprimir etiquetas"),
    estadosEditables.map(est=>React.createElement("button",{key:est.val,onClick:()=>cambiarEstado(selected,est.val),style:{padding:'10px 18px',borderRadius:10,border:'2px solid '+est.color,background:'linear-gradient(145deg,'+est.color+'25,'+est.color+'0a)',color:est.color,fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:1.5,whiteSpace:'nowrap',fontFamily:'Bebas Neue',boxShadow:'4px 4px 10px '+est.color+'33,-2px -2px 6px rgba(255,255,255,0.9),inset 0 1px 0 rgba(255,255,255,0.3)',transition:'all 0.2s'}},est.icon||'→',' ',est.label)),
    esSuperAdmin&&React.createElement("button",{onClick:eliminarSeleccionados,className:'btn-futurista btn-f-danger',style:{marginLeft:'auto'}},"Eliminar permanente")
  )
),/*#__PURE__*/React.createElement("div",{className:"toolbar",style:{marginBottom:12}},/*#__PURE__*/React.createElement("textarea",{className:"search-box",placeholder:"Buscar por código, destinatario, dirección...\nPega múltiples códigos (uno por línea) para búsqueda masiva",value:search,onChange:function(e){setSearch(e.target.value);setPage(1);},rows:search.split("\n").length>1?Math.min(search.split("\n").length,4):1,style:{resize:"vertical",minHeight:38,fontFamily:"inherit",fontSize:13,lineHeight:1.4}}),/*#__PURE__*/React.createElement("select",{className:"filter-btn",style:{background:'#fff'},value:filtroCli,onChange:e=>{setFiltroCli(e.target.value);setPage(1);}},/*#__PURE__*/React.createElement("option",{value:"todos"},"Todos los clientes"),clientesUnicos.map(c=>/*#__PURE__*/React.createElement("option",{key:c,value:c},c))),/*#__PURE__*/React.createElement("select",{className:"filter-btn",style:{background:'#fff'},value:filtroMen,onChange:e=>{setFiltroMen(e.target.value);setPage(1);}},/*#__PURE__*/React.createElement("option",{value:"todos"},"Todos los mensajeros"),mensajerosUnicos.map(m=>/*#__PURE__*/React.createElement("option",{key:m,value:m},m.replace(/,\s*/g,' ')))),/*#__PURE__*/React.createElement("select",{className:"filter-btn",style:{background:'#fff'},value:filtroFuente,onChange:e=>{setFiltroFuente(e.target.value);setPage(1);}},/*#__PURE__*/React.createElement("option",{value:"todos"},"Todos los tipos"),fuentesUnicas.map(f=>/*#__PURE__*/React.createElement("option",{key:f,value:f},fuenteLabel(f)))),/*#__PURE__*/React.createElement("div",{ref:atrasoDropdownRef,style:{position:'relative',display:'flex'}},/*#__PURE__*/React.createElement("button",{type:"button",className:"filter-btn",onClick:()=>setAtrasadosDetalleOpen(true),title:"Ver el detalle completo de todas las piezas no entregadas (con motivo) y exportar el informe",style:{background:filtroAtrasoModo!=='off'?'var(--danger)':'#fff',color:filtroAtrasoModo!=='off'?'#fff':'var(--danger)',border:'1px solid var(--danger)',borderRight:'1px solid rgba(255,255,255,0.35)',borderTopRightRadius:0,borderBottomRightRadius:0,fontWeight:700,display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap',cursor:'pointer'}},'⚠ Atrasados',combinadoAtrasoCount>0&&/*#__PURE__*/React.createElement("span",{style:{background:filtroAtrasoModo!=='off'?'rgba(255,255,255,0.25)':'rgba(176,48,48,0.12)',padding:'1px 7px',borderRadius:10,fontSize:11}},filtroAtrasoModo==='atrasados'?atrasadosCount:filtroAtrasoModo==='reprogramados'?reprogramadosRepetidosCount:combinadoAtrasoCount)),/*#__PURE__*/React.createElement("button",{type:"button",className:"filter-btn",onClick:()=>setAtrasoDropdownOpen(o=>!o),title:"Elegir qué mostrar: todos, solo atrasados en ruta o solo reprogramados repetidos",style:{background:filtroAtrasoModo!=='off'?'var(--danger)':'#fff',color:filtroAtrasoModo!=='off'?'#fff':'var(--danger)',border:'1px solid var(--danger)',borderLeft:'none',borderTopLeftRadius:0,borderBottomLeftRadius:0,padding:'9px 10px',cursor:'pointer'}},/*#__PURE__*/React.createElement("span",{style:{fontSize:9}},'▾')),atrasoDropdownOpen&&/*#__PURE__*/React.createElement("div",{style:{position:'absolute',top:'calc(100% + 4px)',left:0,background:'#fff',border:'1px solid var(--border)',borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,0.18)',zIndex:50,minWidth:230,overflow:'hidden'}},[{modo:'combinado',label:'Todos',count:combinadoAtrasoCount},{modo:'atrasados',label:'Atrasados en ruta',count:atrasadosCount},{modo:'reprogramados',label:'Reprogramados repetidos',count:reprogramadosRepetidosCount}].map(function(op,i){return/*#__PURE__*/React.createElement("button",{key:op.modo,type:"button",onClick:function(){setFiltroAtrasoModo(function(prev){return prev===op.modo?'off':op.modo;});setAtrasoDropdownOpen(false);setPage(1);},style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,width:'100%',padding:'10px 14px',background:filtroAtrasoModo===op.modo?'rgba(176,48,48,0.08)':'#fff',border:'none',borderBottom:i<2?'1px solid var(--border)':'none',cursor:'pointer',fontSize:13,color:'var(--text)',fontWeight:filtroAtrasoModo===op.modo?700:400,textAlign:'left'}},/*#__PURE__*/React.createElement("span",null,filtroAtrasoModo===op.modo?'✓ ':'',op.label),/*#__PURE__*/React.createElement("span",{style:{background:'rgba(176,48,48,0.12)',color:'var(--danger)',padding:'1px 7px',borderRadius:10,fontSize:11}},op.count));})))),(esAdmin||esSuperAdmin)&&/*#__PURE__*/React.createElement("button",{type:"button",className:"filter-btn",onClick:()=>setMotivosModalOpen(true),title:"Administrar los motivos de reagenda que ven los mensajeros al marcar Reprogramado",style:{background:'#fff',color:'var(--text-soft)',border:'1px solid var(--border)',fontWeight:600,whiteSpace:'nowrap',cursor:'pointer'}},"⚙ Motivos de reagenda"),(esAdmin||esSuperAdmin)&&/*#__PURE__*/React.createElement("button",{type:"button",className:"filter-btn",onClick:()=>setGestionGeoModalOpen(true),title:"Activar/desactivar la verificación por foto+GPS al Reprogramar",style:{background:gestionGeoCfg.activo?'rgba(46,125,79,0.1)':'#fff',color:gestionGeoCfg.activo?'var(--success)':'var(--text-soft)',border:'1px solid var(--border)',fontWeight:600,whiteSpace:'nowrap',cursor:'pointer'}},gestionGeoCfg.activo?'📍 Verificación GPS: ON':'📍 Verificación GPS: OFF'),tardiosPendientes.length>0&&/*#__PURE__*/React.createElement("div",{style:{background:'rgba(200,168,75,0.12)',border:'1px solid rgba(200,168,75,0.5)',borderRadius:10,padding:'12px 16px',marginBottom:12,fontSize:13,color:'var(--text)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}},/*#__PURE__*/React.createElement("span",null,"\u23F1 ",/*#__PURE__*/React.createElement("strong",null,tardiosPendientes.length)," env\xEDo",tardiosPendientes.length!==1?'s':''," ",tardiosPendientes.length===1?'se registr\xF3':'se registraron'," ",UMBRAL_TARDIO_HORAS,"+ horas despu\xE9s que el resto de su cliente/d\xEDa \u2014 revisa si hay que avisarle al cliente antes de cobrar."),/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setShowTardiosModal(true)},"Ver detalle")),envios.length===0&&/*#__PURE__*/React.createElement("div",{className:"info-banner"},"\uD83D\uDCE5 Importa el archivo del sistema (CARGA_PGSO) o un Excel propio. Si tu Excel ya tiene c\xF3digos (ML, Falabella, Shopify) se respetan tal cual. Si no tiene c\xF3digo, se genera uno PGSO autom\xE1ticamente."),filtrados.length>0&&/*#__PURE__*/React.createElement("div",{style:{fontSize:12,color:'var(--text-soft)',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0'}},/*#__PURE__*/React.createElement("span",null,/*#__PURE__*/React.createElement("strong",{style:{color:'var(--gold)'}},filtrados.length.toLocaleString('es-CL'))," env\xEDos",filtroEst!=='todos'?` · ${estadoInfo(filtroEst).label}`:''),/*#__PURE__*/React.createElement(ExportBtn,{label:"Exportar",onPDF:()=>{var _document$querySelect10;const logoSrc=((_document$querySelect10=document.querySelector('.logo-img'))==null?void 0:_document$querySelect10.src)||'';const win=window.open('','_blank','width=1000,height=700');const filas=filtradosOrdenados.slice(0,500).map((e,i)=>`
                <tr style="background:${i%2===0?'#fff':'#fdf9f2'}">
                  <td style="text-align:center;color:#7a7d6a;font-size:10px">${i+1}</td>
                  <td style="font-family:monospace;font-size:10px;font-weight:700">${e.codigo}</td>
                  <td>${e.cliente}</td>
                  <td style="font-weight:600">${e.destinatario}</td>
                  <td>${e.direccion}</td>
                  <td style="font-weight:700">${e.comuna}</td>
                  <td>${e.mensajero?e.mensajero.replace(/,\s*/g,' '):'—'}</td>
                  <td><span style="padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;
                    background:${estadoInfo(e.estado).bg};color:${estadoInfo(e.estado).color}">${estadoInfo(e.estado).label}</span></td>
                  <td style="text-align:right">${e.monto>0?'$'+e.monto.toLocaleString('es-CL'):'—'}</td>
                </tr>`).join('');win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
              <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet"/>
              <title>Envíos TransPgso</title>
              <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;padding:24px;background:#FEF8EA;font-size:11px;}
              .hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #C8A84B;padding-bottom:12px;margin-bottom:18px;}
              .logo{display:flex;align-items:center;gap:10px;}.logo img{width:50px;height:50px;object-fit:contain;border-radius:7px;}
              .brand{font-size:18px;font-family:'Bebas Neue',sans-serif;font-weight:900;letter-spacing:2px;color:#2b2e20;}
              table{width:100%;border-collapse:collapse;}thead tr{background:#2b2e20;}
              thead th{color:#C8A84B;padding:7px 8px;font-size:9px;letter-spacing:1px;text-transform:uppercase;}
              tbody td{padding:6px 8px;border-bottom:1px solid #f0e8d0;font-size:10px;}
              @media print{body{padding:14px;background:#fff;}}</style></head><body>
              <div class="hdr"><div class="logo"><img src="${logoSrc}" onerror="this.style.display='none'"/>
              <div><div class="brand">TRANSPGSO</div><div style="font-size:9px;color:#7a7d6a;letter-spacing:2px">LISTADO DE ENVÍOS</div></div></div>
              <div style="text-align:right;font-size:11px"><strong>${filtrados.length}</strong> envíos · ${new Date().toLocaleDateString('es-CL')}</div></div>
              <table><thead><tr><th>#</th><th>Código</th><th>Cliente</th><th>Destinatario</th><th>Dirección</th><th>Comuna</th><th>Mensajero</th><th>Estado</th><th>Monto</th></tr></thead>
              <tbody>${filas}</tbody></table>
              <script>window.onload=()=>{window.print()}<\/script></body></html>`);win.document.close();},onExcel:()=>{const headers=['#','Código','Cliente','Destinatario','Teléfono','Dirección','Comuna','Mensajero','Estado','Monto','Fecha Recepción','Fecha Entrega','Colecta','Nota'];const rows=filtradosOrdenados.map((e,i)=>{
  // Antes esta columna solo se llenaba para 'entregado' (via fechaEntregaDe) y cortaba a mano
  // los primeros 10 caracteres del ISO que llega en UTC -- eso dejaba SIEMPRE vacíos los
  // retornos (que sí tienen su propia fecha real en '_fechaRealEstadoISO', igual que se ve en
  // la columna Fecha de la tabla) y podía mostrar un día equivocado para entregas confirmadas
  // cerca de la medianoche de Chile, porque la fecha UTC no siempre es la misma fecha en Chile.
  // Ahora se busca la fecha real del ESTADO FINAL que tenga el envío (sea cual sea), y se
  // convierte esa fecha/hora al día calendario de Chile (fechaHoyCL) antes de formatear.
  // FIX 2026-09-22 (Excel exportado no coincidía con el panel): esta línea usaba
  // 'e._estadoEfectivo||e.estado' -- _estadoEfectivo es el estado que tenía el envío CONGELADO al
  // cierre del rango elegido (útil solo para el aviso "🕓 al cierre: X" que se ve en la tabla).
  // Como resultado, exportar 'Todos' en 'Resuelto en el período' (antes 'Gestionado en el período') podía mostrar un código como
  // "Entregado" en la columna Estado aunque ahora mismo ESTÉ en Retorno en el sistema -- y el
  // conteo de "Retorno" del archivo exportado no coincidía con el número que muestra la tarjeta
  // Retorno en pantalla (que sí usa el estado en vivo). El selector de Estado en la fila de la
  // tabla siempre usó 'e.estado' (en vivo) como valor principal -- este export ahora hace lo
  // mismo, para que la columna Estado del Excel sea siempre la del sistema ahora mismo.
  const estActual=e.estado;
  let feReal='';
  if(estActual==='entregado')feReal=fechaEntregaDe(e);
  else if(estActual==='retorno')feReal=e._fechaRealEstadoISO||'';
  if(!feReal&&e.historial&&e.historial.length>0){
    const ent=[...e.historial].reverse().find(h=>h.estado===estActual);
    if(ent&&ent.fecha)feReal=ent.fecha;
  }
  if(!feReal&&e.updated_at)feReal=e.updated_at;
  return[i+1,e.codigo,e.cliente,e.destinatario,e.telefono,e.direccion,e.comuna,e.mensajero.replace(/,\s*/g,' '),estadoInfo(estActual).label,e.monto,fmtFecha(e.fecha),feReal?fmtFecha(fechaHoyCL(feReal)):'—',e.nota||'',e.nota_admin||''];
});
const sheets=[{name:'Envíos',headers,rows}];
// NUEVO 2026-09-22 (vista 'fusion', "Recibido + Resuelto"): se agrega una segunda hoja "Retorno
// resuelto" con la lista EXACTA de retornos resueltos en el período (misma fuente que la tarjeta
// "retorno resuelto en el período" -- retornadosPeriodoRealTarjetas, ya filtrada por
// cliente/mensajero/tipo igual que la hoja "Envíos"). Necesario porque, como se probó con Luis con
// los códigos 47972008310 / 47894779905, la columna Estado de la hoja "Envíos" es SIEMPRE el
// estado EN VIVO de cada envío -- filtrar esa hoja a mano por "Retorno" nunca da el número correcto
// de retornos del período (el estado en vivo puede cambiar después de cerrado el período). Para
// pagar/cobrar hay que usar esta segunda hoja tal cual, nunca filtrar la primera por Estado.
if(vistaEstado==='fusion'){
  const rowsRetorno=retornadosPeriodoRealTarjetas.map((e,i)=>{
    const feReal=e._fechaRealEstadoISO||'';
    return[i+1,e.codigo,e.cliente,e.destinatario,e.telefono,e.direccion,e.comuna,(e.mensajero||'').replace(/,\s*/g,' '),estadoInfo('retorno').label,e.monto,fmtFecha(e.fecha),feReal?fmtFecha(fechaHoyCL(feReal)):'—',e.nota||'',e.nota_admin||''];
  });
  sheets.push({name:'Retorno resuelto',headers,rows:rowsRetorno});
}
exportToExcel('Envios_TransPgso_'+fechaHoyCL(),sheets);},onHTMLCliente:exportarHTMLPorCliente,htmlClienteLabel:'Exportar HTML por cliente — Reagendas'})),paginado.length>0&&/*#__PURE__*/React.createElement("div",{className:"table-wrap"},/*#__PURE__*/React.createElement("table",null,/*#__PURE__*/React.createElement("thead",null,/*#__PURE__*/React.createElement("tr",null,/*#__PURE__*/React.createElement("th",{style:{width:32,textAlign:'center'}},/*#__PURE__*/React.createElement("input",{type:"checkbox",checked:selected.size===paginado.length&&paginado.length>0,onChange:toggleAll,style:{cursor:'pointer'}})),/*#__PURE__*/React.createElement("th",null,"#"),/*#__PURE__*/React.createElement("th",{style:{cursor:'pointer',userSelect:'none'},onClick:()=>toggleSort('codigo')},"C\xF3digo",iconoSort('codigo')),/*#__PURE__*/React.createElement("th",{style:{cursor:'pointer',userSelect:'none'},onClick:()=>toggleSort('cliente')},"Cliente",iconoSort('cliente')),/*#__PURE__*/React.createElement("th",{style:{cursor:'pointer',userSelect:'none'},onClick:()=>toggleSort('destinatario')},"Destinatario",iconoSort('destinatario')),/*#__PURE__*/React.createElement("th",{style:{cursor:'pointer',userSelect:'none'},onClick:()=>toggleSort('direccion')},"Direcci\xF3n",iconoSort('direccion')),/*#__PURE__*/React.createElement("th",{style:{cursor:'pointer',userSelect:'none'},onClick:()=>toggleSort('comuna')},"Comuna",iconoSort('comuna')),/*#__PURE__*/React.createElement("th",{style:{cursor:'pointer',userSelect:'none'},onClick:()=>toggleSort('mensajero')},"Mensajero",iconoSort('mensajero')),/*#__PURE__*/React.createElement("th",{style:{cursor:'pointer',userSelect:'none'},onClick:()=>toggleSort('estado')},"Estado",iconoSort('estado')),/*#__PURE__*/React.createElement("th",{style:{cursor:'pointer',userSelect:'none'},onClick:()=>toggleSort('fecha')},"Fecha",iconoSort('fecha')),/*#__PURE__*/React.createElement("th",{style:{cursor:'pointer',userSelect:'none'},onClick:()=>toggleSort('monto')},"Monto",iconoSort('monto')),/*#__PURE__*/React.createElement("th",null))),/*#__PURE__*/React.createElement("tbody",null,paginado.map((e,i)=>{const rowNum=(page-1)*PAGE_SIZE+i+1;const sel=selected.has(e.id);const tardio=esEnvioTardio(e,baseTardioMap)&&!e.aviso_tardio;return/*#__PURE__*/React.createElement("tr",{key:e.id,style:{background:sel?'rgba(200,168,75,0.06)':(e.tuvo_siniestro?'rgba(198,40,40,0.08)':(esEnvioAtrasado(e)?'rgba(176,48,48,0.06)':(tardio?'rgba(200,168,75,0.09)':''))),borderLeft:e.tuvo_siniestro?'3px solid #C62828':(esEnvioAtrasado(e)?'3px solid var(--danger)':(tardio?'3px solid var(--gold)':'3px solid transparent')),cursor:'pointer'},onClick:()=>toggleSelect(e.id)},/*#__PURE__*/React.createElement("td",{style:{textAlign:'center'},onClick:ev=>ev.stopPropagation()},/*#__PURE__*/React.createElement("input",{type:"checkbox",checked:sel,onChange:()=>toggleSelect(e.id),style:{cursor:'pointer'}})),/*#__PURE__*/React.createElement("td",{style:{textAlign:'center',fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-soft)',background:'var(--cream)',fontWeight:700}},rowNum),/*#__PURE__*/React.createElement("td",{style:{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700,color:'var(--dark)'}},e.codigo,e.fuente==='externo'&&/*#__PURE__*/React.createElement("span",{style:{marginLeft:6,fontSize:9,background:'rgba(27,58,107,0.1)',color:'#1B3A6B',padding:'1px 6px',borderRadius:4,fontWeight:700,letterSpacing:0.5}},"ML"),e.tuvo_siniestro&&/*#__PURE__*/React.createElement("span",{title:'Este código tuvo un siniestro registrado',style:{marginLeft:6,fontSize:9,background:'#C62828',color:'#fff',padding:'1px 6px',borderRadius:4,fontWeight:700,letterSpacing:0.5,whiteSpace:'nowrap'}},"⚠ SINIESTRO"),esEnvioTardio(e,baseTardioMap)&&(e.aviso_tardio?/*#__PURE__*/React.createElement("span",{onClick:ev=>{ev.stopPropagation();marcarAvisoTardio(e.id,e.codigo,false);},title:'Cliente ya avisado de este código agregado tarde. Click para deshacer.',style:{marginLeft:6,fontSize:9,background:'rgba(46,125,79,0.1)',color:'var(--success)',padding:'1px 6px',borderRadius:4,fontWeight:700,letterSpacing:0.5,cursor:'pointer',whiteSpace:'nowrap'}},"✓ Avisado"):/*#__PURE__*/React.createElement("span",{onClick:ev=>{ev.stopPropagation();marcarAvisoTardio(e.id,e.codigo,true);},title:'Se registró '+horasTardanza(e,baseTardioMap)+'h después que el resto de este cliente/día — el cliente puede no reconocerlo al pagar. Click para marcar que ya se le avisó.',style:{marginLeft:6,fontSize:9,background:'rgba(200,168,75,0.15)',color:'#8a6d1a',padding:'1px 6px',borderRadius:4,fontWeight:700,letterSpacing:0.5,cursor:'pointer',whiteSpace:'nowrap'}},"⏱ Tardío"))),/*#__PURE__*/React.createElement("td",{onClick:ev=>ev.stopPropagation()},/*#__PURE__*/React.createElement("select",{className:"td-select",value:e.cliente||'',style:{fontWeight:700},onChange:ev=>{const val=ev.target.value;if(val===(e.cliente||''))return;pedirConfirmacionCambio('Cliente',e.cliente||'Sin cliente',val||'Sin cliente',async()=>{const entrada=crearEntradaHistorial(e.estado,`Cliente cambiado a ${val||'Sin cliente'}`,usuario?.nombre||'Admin');setEnvios(prev=>prev.some(x=>x.id===e.id)?prev.map(x=>x.id===e.id?{...x,cliente:val,historial:[...x.historial,entrada]}:x):[...prev,{...e,cliente:val,historial:[...(e.historial||[]),entrada]}]);const r=await conReintento(()=>db.from('envios').update({cliente:val}).eq('codigo',e.codigo));toast(r.ok?'✓ Cliente → '+val:'⚠️ No se pudo guardar en el servidor — reintenta con mejor señal');});}},/*#__PURE__*/React.createElement("option",{value:''},"Sin cliente"),clienteOptionsShared)),/*#__PURE__*/React.createElement("td",{style:{fontSize:12,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},title:e.destinatario||''},e.destinatario||'—'),/*#__PURE__*/React.createElement("td",{style:{fontSize:11,color:'var(--text-mid)',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},title:e.direccion||''},e.direccion||'—'),/*#__PURE__*/React.createElement("td",{onClick:ev=>ev.stopPropagation()},e.comuna&&!esComunaValida(e.comuna)&&/*#__PURE__*/React.createElement("span",{title:'"'+e.comuna+'" no coincide con ninguna comuna real de la Región Metropolitana — corrígela desde el desplegable o en Administración · Comunas',style:{color:'#b03030',fontWeight:900,marginRight:4,cursor:'help'}},"⚠"),/*#__PURE__*/React.createElement("select",{className:"td-select",value:matchComuna(e.comuna)||'',style:{fontFamily:'Bebas Neue',letterSpacing:1,fontSize:11},onChange:ev=>{const val=ev.target.value;if(val===(e.comuna||''))return;pedirConfirmacionCambio('Comuna',e.comuna||'Sin comuna',val||'Sin comuna',async()=>{const entrada=crearEntradaHistorial(e.estado,`Comuna cambiada a ${val||'Sin comuna'}`,usuario?.nombre||'Admin');setEnvios(prev=>prev.some(x=>x.id===e.id)?prev.map(x=>x.id===e.id?{...x,comuna:val,historial:[...x.historial,entrada]}:x):[...prev,{...e,comuna:val,historial:[...(e.historial||[]),entrada]}]);const r=await conReintento(()=>db.from('envios').update({comuna:val,lat:null,lng:null}).eq('codigo',e.codigo));toast(r.ok?'✓ Comuna actualizada':'⚠️ No se pudo guardar en el servidor — reintenta con mejor señal');});}},/*#__PURE__*/React.createElement("option",{value:''},"Sin comuna"),comunaOptionsShared)),/*#__PURE__*/React.createElement("td",{onClick:ev=>ev.stopPropagation()},/*#__PURE__*/React.createElement("select",{className:"td-select",value:e.mensajero||'',onChange:ev=>{const val=ev.target.value;if(val===(e.mensajero||''))return;pedirConfirmacionCambio('Mensajero',e.mensajero||'Sin asignar',val||'Sin asignar',async()=>{const nuevoEstado=val?'en_ruta':e.estado;edicionesRecientesRef.current[e.codigo]={estado:nuevoEstado,mensajero:val,ts:Date.now()};setEnvios(prev=>prev.some(x=>x.id===e.id)?prev.map(x=>x.id===e.id?{...x,mensajero:val,estado:nuevoEstado}:x):[...prev,{...e,mensajero:val,estado:nuevoEstado}]);const r=await conReintento(()=>db.from('envios').update({mensajero:val,estado:nuevoEstado}).eq('codigo',e.codigo));if(r.ok&&val)sbRegistrarHistorial(e.codigo,nuevoEstado,'Asignado a '+val+' desde panel admin',usuario?.nombre||'Admin','panel_admin');toast(r.ok?'✓ Mensajero actualizado':'⚠️ No se pudo guardar en el servidor — reintenta con mejor señal');});}},/*#__PURE__*/React.createElement("option",{value:''},"Sin asignar"),mensajeroOptionsShared)),/*#__PURE__*/React.createElement("td",{onClick:ev=>ev.stopPropagation()},/*#__PURE__*/React.createElement("select",{className:"td-select",value:e.estado,disabled:!estadosEditables.some(est=>est.val===e.estado),title:!estadosEditables.some(est=>est.val===e.estado)?'Este estado solo lo puede cambiar un admin':undefined,style:{borderColor:estadoInfo(e.estado).color||'rgba(200,168,75,0.2)',color:estadoInfo(e.estado).color||'var(--dark)',fontWeight:700,opacity:estadosEditables.some(est=>est.val===e.estado)?1:0.7},onChange:ev=>{const val=ev.target.value;if(val===e.estado)return;pedirConfirmacionCambio('Estado',estadoInfo(e.estado).label,estadoInfo(val).label,async()=>{edicionesRecientesRef.current[e.codigo]={estado:val,mensajero:e.mensajero,ts:Date.now()};await cambiarEstado(new Set([e.id]),val);});}},(estadosEditables.some(est=>est.val===e.estado)?estadosEditables:[...estadosEditables,estadoInfo(e.estado)]).map(est=>/*#__PURE__*/React.createElement("option",{key:est.val,value:est.val},est.label))),esEnvioAtrasado(e)&&/*#__PURE__*/React.createElement("span",{title:'Sin entregar hace '+diasDesdeFecha(e.fecha)+' día(s)',style:{marginLeft:6,fontSize:10,fontWeight:700,color:'var(--danger)',whiteSpace:'nowrap'}},'⚠ '+diasDesdeFecha(e.fecha)+'d'),e._estadoEfectivo&&e._estadoEfectivo!==e.estado?/*#__PURE__*/React.createElement("div",{title:'Este envío pasó a "'+estadoInfo(e.estado).label+'" DESPUÉS de que cerró el rango de fechas elegido — al cierre de ese rango su estado era "'+estadoInfo(e._estadoEfectivo).label+'".',style:{fontSize:9,color:'#7a5c1a',marginTop:3,fontWeight:700,whiteSpace:'nowrap'}},'🕓 al cierre: ',estadoInfo(e._estadoEfectivo).label):null),/*#__PURE__*/React.createElement("td",{style:{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-soft)'}},React.createElement("div",null,fmtFecha(e.fecha)),e.estado==='entregado'&&fechaEntregaDe(e)?React.createElement("div",{style:{color:'var(--success)',marginTop:2}},fmtFechaHora(fechaEntregaDe(e))):null,e.estado==='retorno'&&e._fechaRealEstadoISO?React.createElement("div",{title:'Fecha real en que quedó Retorno (según historial), distinta de la fecha de despacho de arriba',style:{color:'#7a5c1a',marginTop:2}},'↩️ ',fmtFechaHora(e._fechaRealEstadoISO)):null),/*#__PURE__*/React.createElement("td",{style:{fontFamily:'JetBrains Mono',fontSize:11,color:e.monto>0?'var(--success)':'var(--text-soft)'}},e.monto>0?'$'+e.monto.toLocaleString('es-CL'):'—'),/*#__PURE__*/React.createElement("td",{style:{whiteSpace:'nowrap',minWidth:50},onClick:ev=>ev.stopPropagation()},/*#__PURE__*/React.createElement("button",{className:"action-btn btn-edit",onClick:()=>setDetalleEnvio(e)},"Ver")));})))),/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:14,flexWrap:'wrap',gap:10}},
  /*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',gap:8}},
    /*#__PURE__*/React.createElement("span",{style:{fontSize:11,color:'var(--text-soft)'}},"Ver"),
    /*#__PURE__*/React.createElement("select",{value:PAGE_SIZE,onChange:e=>{setPageSize(+e.target.value);setPage(1);},style:{padding:'5px 8px',borderRadius:7,border:'1px solid var(--border)',fontSize:12,background:'var(--cream)',color:'var(--text)',cursor:'pointer',outline:'none'}},
      [25,50,100].map(n=>/*#__PURE__*/React.createElement("option",{key:n,value:n},n))
    ),
    /*#__PURE__*/React.createElement("span",{style:{fontSize:11,color:'var(--text-soft)'}},"por página")
  ),
  totalPags>1&&/*#__PURE__*/React.createElement("div",{className:"pagination",style:{margin:0}},/*#__PURE__*/React.createElement("button",{className:"page-btn",disabled:page===1,onClick:()=>setPage(p=>p-1)},"\u2039"),Array.from({length:Math.min(totalPags,7)},(_,i)=>i+1).map(p=>/*#__PURE__*/React.createElement("button",{key:p,className:'page-btn'+(page===p?' active':''),onClick:()=>setPage(p)},p)),totalPags>7&&/*#__PURE__*/React.createElement("span",{className:"page-info"},"...",totalPags),/*#__PURE__*/React.createElement("button",{className:"page-btn",disabled:page===totalPags,onClick:()=>setPage(p=>p+1)},"\u203A")),
  /*#__PURE__*/React.createElement("span",{className:"page-info",style:{margin:0}},(page-1)*PAGE_SIZE+1,"-",Math.min(page*PAGE_SIZE,filtrados.length)," de ",filtrados.length.toLocaleString('es-CL'))
),showTardiosModal&&/*#__PURE__*/React.createElement(Modal,{title:'⏱ Envíos tardíos pendientes de avisar ('+tardiosPendientes.length+')',onClose:()=>setShowTardiosModal(false)},tardiosPendientes.length===0?React.createElement("div",{style:{padding:'20px 0',textAlign:'center',color:'var(--text-soft)',fontSize:13}},"No hay envíos tardíos pendientes de avisar 🎉"):React.createElement("div",{style:{maxHeight:'60vh',overflowY:'auto'}},React.createElement("table",null,React.createElement("thead",null,React.createElement("tr",null,React.createElement("th",null,"Código"),React.createElement("th",null,"Cliente"),React.createElement("th",null,"Fecha"),React.createElement("th",null,"Diferencia"),React.createElement("th",null))),React.createElement("tbody",null,tardiosPendientes.map(e=>React.createElement("tr",{key:e.id},React.createElement("td",{style:{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700}},e.codigo),React.createElement("td",{style:{fontSize:12}},e.cliente),React.createElement("td",{style:{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-soft)'}},fmtFecha(e.fecha)),React.createElement("td",{style:{fontSize:11,color:'#8a6d1a',fontWeight:700}},'+'+horasTardanza(e,baseTardioMap)+'h'),React.createElement("td",null,React.createElement("button",{className:"action-btn btn-edit",onClick:()=>marcarAvisoTardio(e.id,e.codigo,true)},"✓ Marcar avisado")))))))),cambiarClienteModal&&/*#__PURE__*/React.createElement(Modal,{title:'Cambiar cliente · '+selected.size+' envío'+(selected.size>1?'s':''),onClose:()=>setCambiarClienteModal(false)},
  /*#__PURE__*/React.createElement("div",{className:"form-group"},
    /*#__PURE__*/React.createElement("label",{className:"form-label"},"Nuevo cliente"),
    /*#__PURE__*/React.createElement("select",{className:"form-input",value:clienteCambio,onChange:e=>setClienteCambio(e.target.value),autoFocus:true},
      /*#__PURE__*/React.createElement("option",{value:""},"Seleccionar..."),
      clientesActivos.map(c=>/*#__PURE__*/React.createElement("option",{key:c.id,value:c.nombre},c.nombre))
    )
  ),
  /*#__PURE__*/React.createElement("div",{style:{padding:'10px 14px',background:'var(--gold-dim)',borderRadius:8,border:'1px solid var(--gold-border)',fontSize:12,color:'var(--text-mid)',marginBottom:16}},
    "Se cambiará el cliente de ",/*#__PURE__*/React.createElement("strong",null,selected.size)," envíos seleccionados."
  ),
  /*#__PURE__*/React.createElement("div",{className:"modal-actions"},
    /*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setCambiarClienteModal(false)},"Cancelar"),
    /*#__PURE__*/React.createElement("button",{className:"btn-confirm",onClick:async()=>{
      if(!clienteCambio)return;
      const ids=Array.from(selected);
      const codigos=filtrados.filter(e=>ids.includes(e.id)).map(e=>e.codigo);
      setEnvios(prev=>prev.map(e=>selected.has(e.id)?{...e,cliente:clienteCambio}:e));
      for(let i=0;i<codigos.length;i+=50){
        const lote=codigos.slice(i,i+50);
        await db.from('envios').update({cliente:clienteCambio}).in('codigo',lote);
      }
      toast('✓ '+codigos.length+' envíos → '+clienteCambio);
      setSelected(new Set());setCambiarClienteModal(false);setClienteCambio('');
    }},"Confirmar cambio")
  )
),
asignarModal&&/*#__PURE__*/React.createElement(Modal,{title:'Asignar '+selected.size+' envío'+(selected.size>1?'s':''),onClose:()=>setAsignarModal(false)},/*#__PURE__*/React.createElement("div",{className:"form-group"},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Selecciona el mensajero"),/*#__PURE__*/React.createElement("select",{className:"form-input",value:mensajeroAsignar,onChange:e=>setMensajeroAsignar(e.target.value),autoFocus:true},/*#__PURE__*/React.createElement("option",{value:""},"Seleccionar..."),mensajerosActivos.map(m=>/*#__PURE__*/React.createElement("option",{key:m.id,value:m.nombre},m.nombre.replace(/,\s*/g,' '))))),/*#__PURE__*/React.createElement("div",{style:{padding:'10px 14px',background:'var(--gold-dim)',borderRadius:8,border:'1px solid var(--gold-border)',fontSize:12,color:'var(--text-mid)',marginBottom:16}},"Los env\xEDos pasar\xE1n autom\xE1ticamente a estado ",/*#__PURE__*/React.createElement("strong",null,"Asignado"),"."),/*#__PURE__*/React.createElement("div",{className:"modal-actions"},/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setAsignarModal(false)},"Cancelar"),/*#__PURE__*/React.createElement("button",{className:"btn-primary",onClick:asignarMensajero},"Asignar"))),confirmCambio&&/*#__PURE__*/React.createElement(Modal,{title:'¿Confirmas este cambio?',onClose:cancelarConfirmCambio,blockBackdropClose:true},
  React.createElement('div',{style:{padding:'4px 4px 18px'}},
    React.createElement('div',{style:{fontSize:11,color:'var(--text-mid)',marginBottom:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5}},confirmCambio.campoLabel),
    React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',fontSize:15}},
      React.createElement('span',{style:{padding:'6px 10px',borderRadius:8,background:'rgba(176,48,48,0.08)',border:'1px solid rgba(176,48,48,0.25)',color:'#8a2020',textDecoration:'line-through'}},confirmCambio.anterior),
      React.createElement('span',{style:{color:'var(--gold)',fontSize:18}},'→'),
      React.createElement('span',{style:{padding:'6px 10px',borderRadius:8,background:'rgba(46,125,79,0.1)',border:'1px solid rgba(46,125,79,0.3)',color:'#2e7d4f',fontWeight:700}},confirmCambio.nuevo)
    )
  ),
  React.createElement('div',{className:'modal-actions'},
    React.createElement('button',{className:'btn-secondary',onClick:cancelarConfirmCambio},'Cancelar'),
    React.createElement('button',{className:'btn-primary',onClick:aplicarConfirmCambio,autoFocus:true},'✓ Confirmar')
  )
),detalleEnvio&&/*#__PURE__*/React.createElement(Modal,{title:'Envío '+detalleEnvio.codigo,onClose:()=>setDetalleEnvio(null)},
  /*#__PURE__*/detalleEnvio.fuente==='etiqueta'&&React.createElement("div",{style:{display:'flex',justifyContent:'center',marginBottom:16}},/*#__PURE__*/React.createElement(EtiquetaPreview,{envio:detalleEnvio,logoSrc:(document.querySelector('.logo-img')||{}).src||''})),
  // ── Cambiar cliente ──
  /*#__PURE__*/React.createElement("div",{style:{background:'linear-gradient(145deg,rgba(200,168,75,0.1),rgba(200,168,75,0.04))',border:'1px solid rgba(200,168,75,0.3)',borderRadius:12,padding:'14px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12,boxShadow:'inset 0 1px 0 rgba(255,255,255,0.5),3px 3px 8px rgba(43,46,32,0.08)'}},
    /*#__PURE__*/React.createElement("div",{style:{flex:1}},
      /*#__PURE__*/React.createElement("div",{style:{fontSize:9,color:'rgba(200,168,75,0.8)',letterSpacing:3,textTransform:'uppercase',fontFamily:'Bebas Neue',fontSize:11,marginBottom:6}},'Cliente'),
      /*#__PURE__*/React.createElement("select",{value:detalleEnvio.cliente||'',
        onChange:e=>{const nc=e.target.value;if(nc===(detalleEnvio.cliente||''))return;pedirConfirmacionCambio('Cliente',detalleEnvio.cliente||'Sin cliente',nc||'Sin cliente',async()=>{setDetalleEnvio(prev=>({...prev,cliente:nc}));setEnvios(prev=>prev.map(ev=>ev.codigo===detalleEnvio.codigo?{...ev,cliente:nc}:ev));await db.from('envios').update({cliente:nc}).eq('codigo',detalleEnvio.codigo);toast('✓ Cliente → '+nc);});},
        style:{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid rgba(200,168,75,0.35)',background:'linear-gradient(145deg,#fff,#fdf6e8)',color:'var(--dark)',fontSize:14,fontWeight:700,fontFamily:'DM Sans',outline:'none',cursor:'pointer',boxShadow:'inset 2px 2px 4px rgba(43,46,32,0.08)'}},
        /*#__PURE__*/React.createElement("option",{value:''},'— Sin cliente —'),
        clientesActivos.map(c=>/*#__PURE__*/React.createElement("option",{key:c.id,value:c.nombre},c.nombre))
      )
    ),
    /*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:'rgba(200,168,75,0.5)',textAlign:'right',maxWidth:100,lineHeight:1.5,fontStyle:'italic'}},'Cambia el cliente de este envío')
  ),
  // ── Banner de siniestro ──
  /*#__PURE__*/detalleEnvio.tuvo_siniestro&&React.createElement('div',{style:{marginBottom:16,padding:'10px 14px',background:'rgba(198,40,40,0.08)',border:'1px solid rgba(198,40,40,0.35)',borderRadius:8,color:'#C62828'}},
    React.createElement('div',{style:{fontWeight:700,fontSize:13}},'⚠ Este código tuvo un Siniestro registrado'),
    siniestroDetalle.length===0?React.createElement('div',{style:{fontSize:11,marginTop:4,opacity:0.8}},'Cargando detalle del siniestro...'):
    siniestroDetalle.map(function(s){return React.createElement('div',{key:s.id,style:{fontSize:12,marginTop:6,lineHeight:1.6}},
      'Fecha: '+(s.fecha_siniestro||'—')+' · Mensajero: '+(s.mensajero||'—')+' · Valor del paquete: '+(detalleEnvio.valor_siniestro?'$'+Number(detalleEnvio.valor_siniestro).toLocaleString('es-CL'):'—'),
      React.createElement('br',null),
      'Descuento a cliente: ',s.descontado_cliente?'✓ Aplicado ($'+Number(s.descontado_cliente_valor||0).toLocaleString('es-CL')+')':'Pendiente',
      ' · Descuento a mensajero: ',s.descontado_mensajero?'✓ Aplicado ($'+Number(s.descontado_mensajero_valor||0).toLocaleString('es-CL')+', semana '+s.descontado_mensajero_semana+')':'Pendiente'
    );}),
    React.createElement('div',{style:{fontSize:11,marginTop:6,opacity:0.85}},'Para aplicar o deshacer un descuento, ve a la sección "⚠ Siniestros".')
  ),
  // ── Datos grid ──
  /*#__PURE__*/React.createElement("div",{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}},
    CAMPOS_ENVIO_DETALLE.map(campo=>renderCampoEditable(campo))
  ),
  renderCampoLargo('nota_admin','Nota privada (solo vista de administración)','text',true),
  detalleEnvio.estado==='siniestro'&&renderCampoLargo('valor_siniestro','Valor del producto siniestrado ($) — solo administrativos','number',false),
  /*#__PURE__*/React.createElement("div",{style:{marginBottom:16}},estadoBadge(detalleEnvio.estado)),
  detalleEnvio.nota&&/*#__PURE__*/React.createElement("div",{className:"obs-box",style:{marginBottom:16}},"📌 ",detalleEnvio.nota),
  /*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:14,letterSpacing:1.5,color:'var(--dark)',marginBottom:10}},"Historial"),
  /*#__PURE__*/React.createElement("div",{style:{maxHeight:260,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8,marginBottom:16}},
    cargandoHistorial?React.createElement("div",{style:{padding:16,textAlign:'center',color:'var(--text-soft)',fontSize:12}},"Cargando historial..."):
    historialReal.length===0?React.createElement("div",{style:{padding:16,textAlign:'center',color:'var(--text-soft)',fontSize:12}},"Sin registros de historial detallado para este envío (puede ser un paquete anterior a esta función)."):
    historialReal.map((h,i)=>/*#__PURE__*/React.createElement("div",{key:h.id||i,style:{padding:'8px 12px',borderBottom:'1px solid var(--border)',display:'flex',gap:10,alignItems:'flex-start'}},
      /*#__PURE__*/React.createElement("div",{style:{flex:1}},
        /*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}},
          /*#__PURE__*/React.createElement("span",{style:{fontSize:13,fontWeight:700,color:estadoInfo(h.estado).color}},estadoInfo(h.estado).label),
          /*#__PURE__*/React.createElement("span",{style:{fontSize:9,fontWeight:700,padding:'1px 7px',borderRadius:10,background:canalInfo(h.canal).bg,color:canalInfo(h.canal).color}},canalInfo(h.canal).label)
        ),
        /*#__PURE__*/React.createElement("div",{style:{fontSize:12,color:'var(--text-mid)',marginTop:3,fontWeight:600}},h.usuario||'Sistema'),
        h.nota&&/*#__PURE__*/React.createElement("div",{style:{fontSize:11,color:'var(--text-soft)',marginTop:2,fontStyle:'italic'}},h.nota),
        // Evidencia geo-verificada (Fase 1/Tasa de Gestión): solo existe en entradas Reprogramado
        // con la verificación GPS activa. gestion_verificada true = quedó dentro del radio
        // configurado (verde); false = el mensajero SÍ mandó GPS pero quedó fuera del radio (rojo,
        // para que salte a la vista si algo no corresponde); null con lat/lng presente = no se pudo
        // comparar contra el domicilio (ej. el envío todavía no tenía coordenadas geocodificadas en
        // ese momento) -- ninguno de los dos casos es un error de carga, así que se muestra neutro.
        h.gestion_lat!=null&&h.gestion_lng!=null&&/*#__PURE__*/React.createElement("div",{style:{marginTop:5,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}},
          /*#__PURE__*/React.createElement("span",{style:{fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:10,whiteSpace:'nowrap',background:h.gestion_verificada===true?'rgba(46,125,79,0.12)':h.gestion_verificada===false?'rgba(176,48,48,0.14)':'rgba(122,125,106,0.12)',color:h.gestion_verificada===true?'#2e7d4f':h.gestion_verificada===false?'#b03030':'#7a7d6a',border:'1px solid '+(h.gestion_verificada===true?'rgba(46,125,79,0.4)':h.gestion_verificada===false?'rgba(176,48,48,0.5)':'rgba(122,125,106,0.3)')}},
            h.gestion_verificada===true?'✓ Dentro del radio':h.gestion_verificada===false?'⚠ FUERA DEL RADIO':'○ Sin comparar',
            h.gestion_distancia_m!=null?(' · '+Math.round(h.gestion_distancia_m)+' m del domicilio'):''
          ),
          /*#__PURE__*/React.createElement("a",{href:'https://www.google.com/maps?q='+h.gestion_lat+','+h.gestion_lng,target:'_blank',rel:'noopener noreferrer',onClick:function(ev){ev.stopPropagation();},style:{fontSize:10,fontWeight:700,color:'var(--gold)',textDecoration:'underline'}},'📍 Ver ubicación en Maps')
        )
      ),
      /*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:'var(--text-soft)',fontFamily:'JetBrains Mono',whiteSpace:'nowrap',textAlign:'right'}},new Date(h.created_at).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})),
      (esAdmin||esSuperAdmin)&&React.createElement("button",{onClick:async()=>{
        if(!window.confirm('¿Borrar esta entrada del historial? No se puede deshacer.'))return;
        // Antes, borrar la entrada que representaba el estado ACTUAL dejaba un aviso rojo aparte
        // ("Revertir al estado anterior") que había que confirmar con un click extra. Luis pidió
        // que no exista ese botón: si borrás la entrada del estado vigente, el envío cae solo al
        // estado de la entrada más reciente que quede en el historial -- sin un paso manual más,
        // y sin dejar un nuevo registro de "cambio de estado" (es una corrección, no un evento nuevo).
        const eraLaActual=historialReal.length>0&&historialReal[0].id===h.id;
        try{
          await db.from('historial_envios').delete().eq('id',h.id);
          const restante=historialReal.filter(x=>x.id!==h.id);
          setHistorialReal(restante);
          if(eraLaActual&&restante.length>0&&restante[0].estado!==detalleEnvio.estado){
            const nuevoEstado=restante[0].estado;
            try{await db.from('envios').update({estado:nuevoEstado}).eq('codigo',detalleEnvio.codigo);}catch(errEst){console.warn('No se pudo sincronizar el estado tras borrar historial:',errEst.message);}
            setDetalleEnvio(prev=>prev?Object.assign({},prev,{estado:nuevoEstado}):prev);
            setEnvios(prev=>prev.map(e=>e.id===detalleEnvio.id?Object.assign({},e,{estado:nuevoEstado}):e));
            toast('✓ Entrada borrada — el envío volvió a "'+estadoInfo(nuevoEstado).label+'"');
          }else{
            toast('✓ Entrada de historial borrada');
          }
        }catch(e){toast('⚠ No se pudo borrar la entrada del historial: '+e.message);}
      },title:'Borrar entrada',style:{background:'none',border:'none',color:'var(--danger)',cursor:'pointer',fontSize:14,fontWeight:700,padding:'0 4px',lineHeight:1,flexShrink:0}},'✕')
    ))
  ),
  /*#__PURE__*/React.createElement(FotosEntregaConRecarga,{key:detalleEnvio.codigo+'_'+fotosReloadKey,codigo:detalleEnvio.codigo,fotoEtiquetaInicial:detalleEnvio.foto_etiqueta,esAdmin:(esAdmin||esSuperAdmin)}),
  /*#__PURE__*/React.createElement("div",{style:{marginTop:16,display:'flex',gap:8,flexWrap:'wrap'}},estadosEditables.map(est=>/*#__PURE__*/React.createElement("button",{key:est.val,onClick:()=>{if(est.val===detalleEnvio.estado)return;pedirConfirmacionCambio('Estado',estadoInfo(detalleEnvio.estado).label,est.label,async()=>{await cambiarEstado(new Set([detalleEnvio.id]),est.val);setDetalleEnvio(prev=>({...prev,estado:est.val}));setTimeout(()=>cargarHistorialReal(detalleEnvio.codigo),400);});},style:{padding:'6px 12px',borderRadius:7,border:'1px solid '+est.color,background:detalleEnvio.estado===est.val?est.bg:'transparent',color:est.color,fontSize:11,fontWeight:700,cursor:'pointer',opacity:detalleEnvio.estado===est.val?1:0.7}},detalleEnvio.estado===est.val?'✓ ':'',est.label))),
  /*#__PURE__*/React.createElement("div",{className:"modal-actions"},/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setDetalleEnvio(null)},"Cerrar"))),atrasadosDetalleOpen&&/*#__PURE__*/React.createElement(Modal,{title:'⚠ Piezas No Entregadas — Detalle Completo',wide:true,onClose:()=>setAtrasadosDetalleOpen(false)},
  /*#__PURE__*/React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:14,lineHeight:1.5}},'Todas las piezas no entregadas del período elegido abajo: atrasadas en ruta o reprogramadas (sin importar si van en la 1ra reagenda o en varias), con toda su información y el motivo real de cada una. Respeta los filtros de cliente, mensajero, tipo y búsqueda activos en la pantalla.'),
  /*#__PURE__*/React.createElement('div',{style:{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap'}},
    /*#__PURE__*/React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:12,letterSpacing:2,color:'var(--text-soft)',marginRight:2}},'PERÍODO:'),
    [{val:'hoy',label:'Hoy'},{val:'ayer',label:'Ayer'},{val:'semana',label:'Esta semana'},{val:'mes',label:'Mes'},{val:'rango',label:'Rango'}].map(function(p){return/*#__PURE__*/React.createElement('button',{key:p.val,type:'button',onClick:function(){setPeriodo(p.val);setPage(1);},style:{padding:'5px 14px',borderRadius:20,border:'1px solid '+(periodo===p.val?'var(--gold)':'var(--border)'),background:periodo===p.val?'rgba(200,168,75,0.12)':'#fff',color:periodo===p.val?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:11,cursor:'pointer'}},p.label);}),
    periodo==='mes'&&/*#__PURE__*/React.createElement('input',{type:'month',value:mesFiltro,onChange:function(e){setMesFiltro(e.target.value);setPage(1);},style:{padding:'4px 8px',borderRadius:8,border:'1px solid var(--gold)',fontSize:11,outline:'none',color:'var(--dark)'}}),
    periodo==='rango'&&/*#__PURE__*/React.createElement(React.Fragment,null,
      /*#__PURE__*/React.createElement('input',{type:'date',value:desde,onChange:function(e){setDesde(e.target.value);setPage(1);},style:{padding:'4px 8px',borderRadius:8,border:'1px solid var(--border)',fontSize:11,outline:'none'}}),
      /*#__PURE__*/React.createElement('span',{style:{color:'var(--text-soft)',fontSize:11}},'al'),
      /*#__PURE__*/React.createElement('input',{type:'date',value:hasta,onChange:function(e){setHasta(e.target.value);setPage(1);},style:{padding:'4px 8px',borderRadius:8,border:'1px solid var(--border)',fontSize:11,outline:'none'}})
    )
  ),
  /*#__PURE__*/React.createElement('div',{style:{display:'flex',gap:8,alignItems:'center',marginBottom:18,flexWrap:'wrap'}},
    /*#__PURE__*/React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:12,letterSpacing:2,color:'var(--text-soft)',marginRight:2}},'FILTRAR POR:'),
    /*#__PURE__*/React.createElement('select',{value:filtroCli,onChange:function(e){setFiltroCli(e.target.value);setPage(1);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:11,background:'#fff',color:'var(--text)',cursor:'pointer'}},
      /*#__PURE__*/React.createElement('option',{value:'todos'},'Todos los clientes'),
      clientesUnicos.map(function(c){return/*#__PURE__*/React.createElement('option',{key:c,value:c},c);})
    ),
    /*#__PURE__*/React.createElement('select',{value:filtroMen,onChange:function(e){setFiltroMen(e.target.value);setPage(1);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:11,background:'#fff',color:'var(--text)',cursor:'pointer'}},
      /*#__PURE__*/React.createElement('option',{value:'todos'},'Todos los mensajeros'),
      mensajerosUnicos.map(function(m){return/*#__PURE__*/React.createElement('option',{key:m,value:m},m.replace(/,\s*/g,' '));})
    ),
    /*#__PURE__*/React.createElement('select',{value:filtroFuente,onChange:function(e){setFiltroFuente(e.target.value);setPage(1);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:11,background:'#fff',color:'var(--text)',cursor:'pointer'}},
      /*#__PURE__*/React.createElement('option',{value:'todos'},'Todos los tipos'),
      fuentesUnicas.map(function(f){return/*#__PURE__*/React.createElement('option',{key:f,value:f},fuenteLabel(f));})
    ),
    (filtroCli!=='todos'||filtroMen!=='todos'||filtroFuente!=='todos')&&/*#__PURE__*/React.createElement('button',{type:'button',onClick:function(){setFiltroCli('todos');setFiltroMen('todos');setFiltroFuente('todos');setPage(1);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text-soft)',fontSize:11,cursor:'pointer'}},'✕ Quitar filtros')
  ),
  /*#__PURE__*/React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:18}},
    /*#__PURE__*/React.createElement('div',{style:{display:'flex',gap:2,background:'var(--dark)',borderRadius:10,padding:4}},
      [{modo:'combinado',label:'Todos ('+combinadoAtrasoCountModal+')'},{modo:'atrasados',label:'Atrasados en ruta ('+atrasadosCountModal+')'},{modo:'reprogramados',label:'Reprogramados ('+reprogramadosCountModal+')'}].map(function(op){
        const activo=(filtroAtrasoModo==='off'?'combinado':filtroAtrasoModo)===op.modo;
        return/*#__PURE__*/React.createElement('button',{key:op.modo,type:'button',onClick:()=>setFiltroAtrasoModo(op.modo),style:{padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,letterSpacing:0.3,background:activo?'var(--gold)':'transparent',color:activo?'var(--dark-deep)':'rgba(255,255,255,0.6)',whiteSpace:'nowrap'}},op.label);
      })
    ),
    /*#__PURE__*/React.createElement('div',{style:{display:'flex',gap:8}},
      /*#__PURE__*/React.createElement('button',{type:'button',className:'btn-secondary',title:'Descarga un archivo .doc con esta lista, listo para abrir en Word',onClick:()=>generarInformeAtrasados(atrasadosDetalleBase,'word')},'📄 Exportar Word'),
      /*#__PURE__*/React.createElement('button',{type:'button',className:'btn-secondary',title:'Descarga un archivo .html con esta lista',onClick:()=>generarInformeAtrasados(atrasadosDetalleBase,'html')},'🌐 Exportar HTML')
    )
  ),
  atrasadosDetalleBase.length===0?/*#__PURE__*/React.createElement('div',{className:'empty-state'},'No hay piezas atrasadas ni reprogramadas con los filtros actuales.'):
  atrasadosDetalleBase.map(function(e){
    const sm=situacionMotivoDe(e);
    return/*#__PURE__*/React.createElement('div',{key:e.codigo,style:{marginBottom:22,paddingBottom:22,borderBottom:'2px solid var(--border)'}},
      /*#__PURE__*/React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:8}},
        /*#__PURE__*/React.createElement('span',{style:{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:12,background:'rgba(176,48,48,0.12)',color:'var(--danger)',whiteSpace:'nowrap'}},'⚠ '+sm.situacion)
      ),
      /*#__PURE__*/React.createElement('div',{style:{fontSize:12,color:'var(--text-mid)',marginBottom:12,padding:'8px 12px',background:'rgba(176,48,48,0.06)',borderRadius:8,borderLeft:'3px solid var(--danger)'}},
        /*#__PURE__*/React.createElement('b',null,'Motivo: '),sm.motivo
      ),
      /*#__PURE__*/React.createElement(EnvioDetalleCard,{envio:e})
    );
  })
),motivosModalOpen&&/*#__PURE__*/React.createElement(Modal,{title:'⚙ Motivos de Reagenda',onClose:()=>setMotivosModalOpen(false)},/*#__PURE__*/React.createElement("div",{style:{fontSize:12,color:'var(--text-soft)',marginBottom:14,lineHeight:1.5}},"Estos motivos aparecen como lista desplegable en la app del mensajero al marcar un envío como Reprogramado, en vez del cuadro de texto libre. Si no dejas ningún motivo activo, el mensajero sigue viendo el cuadro de texto libre de siempre."),/*#__PURE__*/React.createElement("div",{className:"section-head"},/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:14,letterSpacing:1.5,color:'var(--dark)'}},"Catálogo de motivos"),/*#__PURE__*/React.createElement("button",{className:"btn-add",onClick:()=>{const nid=Math.max.apply(null,[0].concat(motivosAdmin.map(m=>m.id)))+1;setMotivosAdmin(prev=>prev.concat([{id:nid,texto:'',activo:true}]));}},"+ Agregar")),/*#__PURE__*/React.createElement("div",{className:"table-wrap"},/*#__PURE__*/React.createElement("table",null,/*#__PURE__*/React.createElement("thead",null,/*#__PURE__*/React.createElement("tr",null,/*#__PURE__*/React.createElement("th",null,"Motivo"),/*#__PURE__*/React.createElement("th",{style:{width:80,textAlign:'center'}},"Activo"),/*#__PURE__*/React.createElement("th",{style:{width:50}}))),/*#__PURE__*/React.createElement("tbody",null,motivosAdmin.length===0?/*#__PURE__*/React.createElement("tr",null,/*#__PURE__*/React.createElement("td",{colSpan:3,style:{textAlign:'center',color:'var(--text-soft)',fontSize:12,padding:'14px 0'}},"Sin motivos cargados todavía — agrega el primero")):motivosAdmin.map((m,i)=>/*#__PURE__*/React.createElement("tr",{key:m.id,style:{background:i%2===0?'#fff':'var(--cream)'}},/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{className:'form-input',value:m.texto,placeholder:'Ej: Cliente no se encontraba en el domicilio',onChange:e=>{const v=e.target.value;setMotivosAdmin(prev=>prev.map(x=>x.id===m.id?Object.assign({},x,{texto:v}):x));},style:{margin:0}})),/*#__PURE__*/React.createElement("td",{style:{textAlign:'center'}},/*#__PURE__*/React.createElement("button",{onClick:()=>{setMotivosAdmin(prev=>prev.map(x=>x.id===m.id?Object.assign({},x,{activo:x.activo===false}):x));},style:{background:'none',border:'none',cursor:'pointer',color:m.activo!==false?'var(--success)':'var(--text-soft)',fontWeight:700,fontSize:14}},m.activo!==false?'✓':'○')),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("button",{onClick:()=>{const mid=m.id;setMotivosAdmin(prev=>prev.filter(x=>x.id!==mid));},style:{padding:'4px 8px',borderRadius:6,border:'none',background:'rgba(176,48,48,0.1)',color:'#b03030',cursor:'pointer',fontSize:12}},"x"))))))))
,gestionGeoModalOpen&&/*#__PURE__*/React.createElement(Modal,{title:'📍 Verificación por Geolocalización (Tasa de Gestión)',onClose:()=>setGestionGeoModalOpen(false)},
/*#__PURE__*/React.createElement("div",{style:{fontSize:12,color:'var(--text-soft)',marginBottom:14,lineHeight:1.5}},"Al Reprogramar un envío, la app del mensajero puede pedir 1 foto y capturar su ubicación GPS para dejar registrado que realmente visitó el punto (estilo Mercado Libre Flex). Si el mensajero no tiene señal GPS o está fuera del radio configurado, igual puede guardar la entrega -- solo queda marcado como \"no verificado\" para la futura métrica de efectividad. Apágalo en emergencias si no quieres exigirle esto al mensajero."),
/*#__PURE__*/React.createElement("div",{style:{fontSize:11,color:'var(--text-soft)',marginBottom:14,padding:'8px 12px',background:'rgba(200,168,75,0.08)',borderRadius:8,borderLeft:'3px solid var(--gold)'}},"Solo aplica a Reprogramado. Cancelado queda afuera a propósito: muchas veces se decide en la bodega antes de salir a ruta, o en la casa del mensajero al llegar -- no implica una visita real al domicilio del cliente, así que pedir o contar GPS ahí no tendría sentido."),
/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:gestionGeoCfg.activo?'rgba(46,125,79,0.08)':'var(--cream)',borderRadius:8,marginBottom:16,border:'1px solid var(--border)'}},
  /*#__PURE__*/React.createElement("div",{style:{fontWeight:700,fontSize:13,color:'var(--dark)'}},gestionGeoCfg.activo?'Verificación ACTIVADA':'Verificación DESACTIVADA'),
  /*#__PURE__*/React.createElement("button",{type:"button",onClick:()=>setGestionGeoCfg(prev=>Object.assign({},prev,{activo:!prev.activo})),style:{padding:'8px 18px',borderRadius:20,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:gestionGeoCfg.activo?'var(--success)':'#ccc',color:'#fff'}},gestionGeoCfg.activo?'ON':'OFF')
),
/*#__PURE__*/React.createElement("div",null,
  /*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:14,letterSpacing:1.5,color:'var(--dark)',marginBottom:8}},"Radio de tolerancia (metros)"),
  /*#__PURE__*/React.createElement("input",{type:'number',className:'form-input',value:gestionGeoCfg.radio_metros,min:20,max:1000,onChange:e=>{const v=parseInt(e.target.value,10);setGestionGeoCfg(prev=>Object.assign({},prev,{radio_metros:isNaN(v)?150:v}));},style:{maxWidth:120}}),
  /*#__PURE__*/React.createElement("div",{style:{fontSize:11,color:'var(--text-soft)',marginTop:6}},"Si el mensajero confirma dentro de este radio respecto a la dirección del envío, queda verificado. Recomendado: 150 metros.")
)
));}
window.GestionEnvios = GestionEnvios;
})();
