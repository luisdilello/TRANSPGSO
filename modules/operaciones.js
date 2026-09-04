(function(){
var useState=React.useState, useEffect=React.useEffect, useMemo=React.useMemo;
var db=window.__app.db, estadoBadge=window.__app.estadoBadge, fechaHoyCL=window.__app.fechaHoyCL;
// Catálogo de faltas del Reglamento (Leve/Grave/Crítica) y lista de estados de envío —
// compartidos desde index.html / window.__app para no duplicarlos (ver comentario en
// modules/pagos-mensajeros.js: es lo mismo que usa el botón "🎯 Descuentos" de Pagos).
var CATALOGO_FALTAS_REGLAMENTO=window.__app.CATALOGO_FALTAS_REGLAMENTO||[];
var ESTADOS_ENVIO=window.__app.ESTADOS_ENVIO||[];

// Logo embebido en base64 (mismo que usan los Recibos de Cobro) — para que el reporte
// exportado se vea igual estando offline / abierto desde un correo, sin depender de que
// cargue una imagen externa.
var LOGO_B64='data:image/png;base64,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';

// ══════════════════════════════════════════════════════════════════════════════════════
// Helpers de fecha (mismo criterio que usa Analítica: lunes de la semana, mes calendario)
// ══════════════════════════════════════════════════════════════════════════════════════
function lunesDe(d){var x=new Date(d);x.setDate(x.getDate()-((x.getDay()+6)%7));x.setHours(0,0,0,0);return x;}
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function limitesRango(filtro,fechaDesde,fechaHasta){
  var hoy=fechaHoyCL();
  if(filtro==='hoy')return{desde:hoy,hasta:hoy};
  if(filtro==='semana')return{desde:ymd(lunesDe(new Date(hoy+'T12:00:00'))),hasta:hoy};
  if(filtro==='mes')return{desde:hoy.slice(0,7)+'-01',hasta:hoy};
  if(filtro==='rango')return{desde:fechaDesde||null,hasta:fechaHasta||null};
  return{desde:hoy,hasta:hoy};
}
function periodoLabelTexto(filtro,lim){
  if(filtro==='hoy')return'Hoy ('+lim.desde+')';
  if(filtro==='semana')return'Esta semana ('+lim.desde+' al '+lim.hasta+')';
  if(filtro==='mes')return'Este mes ('+lim.desde+' al '+lim.hasta+')';
  if(filtro==='rango')return(lim.desde&&lim.hasta)?(lim.desde+' al '+lim.hasta):'Rango sin definir';
  return'Hoy';
}
// Detecta si un envío tiene evidencia cargada, aceptando tanto el formato nuevo de
// fotos_entrega (array de intentos con {fotos:[...]}) como el formato viejo (array plano
// de URLs) — mismo criterio que ya usa Analítica.
function tieneFotoEntrega(raw){
  if(!raw)return false;
  try{
    var parsed=typeof raw==='string'?JSON.parse(raw):raw;
    if(!Array.isArray(parsed)||parsed.length===0)return false;
    if(typeof parsed[0]==='string')return true;
    return parsed.some(function(it){return it&&Array.isArray(it.fotos)&&it.fotos.length>0;});
  }catch(e){return false;}
}
// Aplana fotos_entrega a una lista simple [{url,intento,estado,fecha}] lista para miniaturas.
function parsearFotos(raw){
  if(!raw)return[];
  try{
    var parsed=typeof raw==='string'?JSON.parse(raw):raw;
    if(!Array.isArray(parsed)||parsed.length===0)return[];
    if(typeof parsed[0]==='string'){
      return parsed.map(function(url){return{url:url,intento:1,estado:'',fecha:''};});
    }
    var out=[];
    parsed.forEach(function(it){
      (it.fotos||[]).forEach(function(url){out.push({url:url,intento:it.intento,estado:it.estado,fecha:it.fecha});});
    });
    return out;
  }catch(e){return[];}
}

// ══════════════════════════════════════════════════════════════════════════════════════
// Constantes del formato (mismas secciones/opciones que el "Formato de Revisión y Cierre
// de Rutas" en papel que arma Fernando — ver A/B/C/D/E de ese documento).
// ══════════════════════════════════════════════════════════════════════════════════════
// OJO con el sentido de estos checklists: el formato dice "Registrar únicamente las
// excepciones detectadas" — es decir, se asume que todo está correcto por defecto y la
// casilla se marca SOLO cuando efectivamente hay una excepción/problema en ese punto (no al
// revés). Por eso acá: sin marcar = sin novedad, marcado = hay algo que reportar.
var FIRMAS_CHECK_ITEMS=[
  {key:'registrada',label:'Firma correctamente registrada.'},
  {key:'asociada',label:'Firma asociada a la pieza correspondiente.'},
  {key:'legible',label:'Firma legible cuando corresponda.'},
  {key:'sinRespaldo',label:'Hubo entregas que quedaron sin respaldo.'}
];
var RESPALDOS_CHECK_ITEMS=[
  {key:'inicioRuta',label:'Respaldo de inicio de ruta con problemas.'},
  {key:'entregas',label:'Respaldos de entrega con problemas.'},
  {key:'terminoRuta',label:'Respaldo de término de ruta con problemas.'},
  {key:'fotografias',label:'Fotografías incorrectas o de mala calidad.'},
  {key:'gestiones',label:'Gestiones solicitadas durante el turno NO realizadas.'}
];
var TIPO_INCIDENCIA_OPTIONS=['Extravío','Dañado','Rechazo del cliente','Dirección incorrecta / no ubicable','Retraso de ruta','Otro'];
var FALTA_FIRMA_OPTIONS=['Sin firma','Firma ilegible','Firma no corresponde al destinatario','Sin foto de respaldo','Otro'];
var TIPO_RESPALDO_OPTIONS=['Foto de inicio de ruta','Foto de entrega','Foto de término de ruta','Video de respaldo','Otro'];
var RESULTADO_REVISION_OPTIONS=['Cierre conforme — sin novedades','Cierre con observaciones menores','Cierre con incidencias pendientes de gestión'];

var COLS_ESTADO_RUTA=[
  {key:'mensajero',label:'Mensajero',type:'text',datalist:'dl-mensajeros-operaciones',minWidth:160},
  {key:'entregadas',label:'Entregadas',type:'number',minWidth:90},
  {key:'pendientes',label:'Pendientes',type:'number',minWidth:90},
  {key:'incidencia',label:'Con incidencia',type:'number',minWidth:100},
  {key:'reprogramacion',label:'Reprogramación / gestión posterior',type:'text',minWidth:200}
];
var COLS_INCIDENCIAS=[
  {key:'mensajero',label:'Mensajero',type:'text',datalist:'dl-mensajeros-operaciones',minWidth:160},
  {key:'codigo',label:'Código de pieza',type:'text',minWidth:130},
  {key:'tipo',label:'Tipo de situación',type:'select',options:TIPO_INCIDENCIA_OPTIONS,minWidth:170},
  {key:'descripcion',label:'Breve descripción / gestión realizada',type:'text',minWidth:220}
];
var COLS_EXCEP_FIRMAS=[
  {key:'mensajero',label:'Mensajero',type:'text',datalist:'dl-mensajeros-operaciones',minWidth:160},
  {key:'codigo',label:'Código afectado',type:'text',minWidth:130},
  {key:'falta',label:'Falta detectada',type:'select',options:FALTA_FIRMA_OPTIONS,minWidth:170},
  {key:'accion',label:'Acción / comentario',type:'text',minWidth:220}
];
var COLS_RESPALDOS=[
  {key:'mensajero',label:'Mensajero',type:'text',datalist:'dl-mensajeros-operaciones',minWidth:160},
  {key:'tipo',label:'Tipo de respaldo / gestión',type:'select',options:TIPO_RESPALDO_OPTIONS,minWidth:180},
  {key:'codigo',label:'Código (si aplica)',type:'text',minWidth:130},
  {key:'observacion',label:'Observación / falta detectada',type:'text',minWidth:220}
];
var COLS_PENDIENTES=[
  {key:'codigo',label:'Código de pieza',type:'text',minWidth:130},
  {key:'mensajero',label:'Mensajero',type:'text',datalist:'dl-mensajeros-operaciones',minWidth:160},
  {key:'situacion',label:'Situación / motivo',type:'text',minWidth:180},
  {key:'gestion',label:'Gestión pendiente para el día siguiente',type:'text',minWidth:220},
  {key:'responsable',label:'Responsable',type:'text',datalist:'dl-mensajeros-operaciones',minWidth:150}
];

// ══════════════════════════════════════════════════════════════════════════════════════
// Componentes chicos reutilizables
// ══════════════════════════════════════════════════════════════════════════════════════
function Lightbox(props){
  return React.createElement('div',{onClick:props.onClose,style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out',padding:16}},
    React.createElement('div',{style:{position:'relative',maxWidth:'95vw',maxHeight:'92vh'}},
      React.createElement('img',{src:props.url,style:{maxWidth:'95vw',maxHeight:'88vh',objectFit:'contain',borderRadius:8,boxShadow:'0 0 40px rgba(200,168,75,0.3)',border:'2px solid var(--gold)'}}),
      React.createElement('div',{style:{textAlign:'center',marginTop:10,fontSize:12,color:'rgba(255,255,255,0.5)'}},'Toca para cerrar')));
}

// Miniatura de evidencia con reintento automático. En Firmas en Vivo las fotos pueden llegar
// a la pantalla (que se auto-refresca cada 25s) prácticamente en el mismo instante en que el
// mensajero recién terminó de subirlas — si esa primera carga del <img> pega justo en ese
// margen de milisegundos, el navegador la marca como fallida (icono de imagen rota) y no la
// reintenta solo, aunque el archivo sí exista y quede accesible un segundo después. Antes eso
// se veía como "fotos rotas" permanentes en la tarjeta. Ahora, si falla, se reintenta un par de
// veces con una URL con parámetro anti-caché (para no toparse otra vez con el mismo error
// guardado en caché del navegador) antes de darla por perdida de verdad.
function FotoThumb(props){
  var url=props.url, onClick=props.onClick;
  var _intentos=useState(0), intentos=_intentos[0], setIntentos=_intentos[1];
  var _fallo=useState(false), fallo=_fallo[0], setFallo=_fallo[1];
  var MAX_REINTENTOS=2;
  function onError(){
    if(intentos<MAX_REINTENTOS){
      setTimeout(function(){setIntentos(function(n){return n+1;});},1500*(intentos+1));
    }else{
      setFallo(true);
    }
  }
  var srcActual=intentos>0?(url+(url.indexOf('?')===-1?'?':'&')+'_r='+intentos):url;
  return React.createElement('div',{onClick:onClick,style:{width:56,height:56,borderRadius:6,overflow:'hidden',border:'1px solid var(--border)',cursor:'zoom-in',flexShrink:0,position:'relative',background:fallo?'var(--cream)':undefined}},
    !fallo&&React.createElement('img',{key:intentos,src:srcActual,style:{width:'100%',height:'100%',objectFit:'cover'},onError:onError}),
    fallo&&React.createElement('span',{style:{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'var(--text-soft)',textAlign:'center',padding:2,lineHeight:1.2}},'⚠ No cargó'));
}

// Tabla de filas dinámicas genérica: agregar/editar/borrar filas de cualquiera de las
// secciones del formato (todas comparten la misma forma: cantidad variable de filas con
// columnas de texto/número/selección).
function TablaDinamica(props){
  var columnas=props.columnas, filas=props.filas||[], onChange=props.onChange, soloLectura=props.soloLectura, vacioTexto=props.vacioTexto||'Sin filas cargadas.';
  function actualizar(i,key,val,tipo){
    var nuevas=filas.slice();
    var fila=Object.assign({},nuevas[i]);
    fila[key]=tipo==='number'?(val===''?'':Number(val)):val;
    nuevas[i]=fila;
    onChange(nuevas);
  }
  function agregar(){
    var vacio={};
    columnas.forEach(function(c){vacio[c.key]=c.type==='number'?'':'';});
    onChange(filas.concat([vacio]));
  }
  function borrar(i){onChange(filas.filter(function(_,idx){return idx!==i;}));}
  return React.createElement('div',{style:{marginBottom:10}},
    React.createElement('div',{className:'table-wrap',style:{marginBottom:8}},
      React.createElement('table',null,
        React.createElement('thead',null,React.createElement('tr',null,
          columnas.map(function(c){return React.createElement('th',{key:c.key},c.label);}),
          !soloLectura&&React.createElement('th',null,''))),
        React.createElement('tbody',null,
          filas.length===0?React.createElement('tr',null,React.createElement('td',{colSpan:columnas.length+(soloLectura?0:1),style:{textAlign:'center',color:'var(--text-soft)',fontSize:12,padding:'14px 8px'}},vacioTexto)):
          filas.map(function(fila,i){
            return React.createElement('tr',{key:i},
              columnas.map(function(c){
                return React.createElement('td',{key:c.key,style:{minWidth:c.minWidth||110}},
                  soloLectura?
                    React.createElement('span',{style:{fontSize:12}},(fila[c.key]===''||fila[c.key]==null)?'—':String(fila[c.key])):
                  (c.type==='select'?
                    React.createElement('select',{className:'form-input',style:{padding:'6px 8px',fontSize:12},value:fila[c.key]||'',onChange:function(e){actualizar(i,c.key,e.target.value,c.type);}},
                      React.createElement('option',{value:''},'Selecciona...'),
                      (c.options||[]).map(function(op){return React.createElement('option',{key:op,value:op},op);})):
                  c.type==='number'?
                    React.createElement('input',{className:'form-input',type:'number',style:{padding:'6px 8px',fontSize:12},value:fila[c.key]===''||fila[c.key]==null?'':fila[c.key],onChange:function(e){actualizar(i,c.key,e.target.value,c.type);}}):
                    React.createElement('input',{className:'form-input',style:{padding:'6px 8px',fontSize:12},list:c.datalist||undefined,value:fila[c.key]||'',placeholder:c.placeholder||'',onChange:function(e){actualizar(i,c.key,e.target.value,c.type);}})
                  ));
              }),
              !soloLectura&&React.createElement('td',null,
                React.createElement('button',{type:'button',onClick:function(){borrar(i);},style:{background:'none',border:'none',cursor:'pointer',color:'#b03030',fontSize:14},title:'Quitar fila'},'✕')));
          })
        )
      )
    ),
    !soloLectura&&React.createElement('button',{type:'button',className:'btn-secondary',onClick:agregar},'+ Agregar fila')
  );
}

// Checklist de excepciones: sin marcar = sin novedad (verde), marcado = excepción detectada (rojo).
function Checklist(props){
  var items=props.items, valores=props.valores||{}, onChange=props.onChange, soloLectura=props.soloLectura;
  return React.createElement('div',null,
    !soloLectura&&React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',fontStyle:'italic',marginBottom:8}},'Marca solo si detectaste una excepción en ese punto — si no marcas nada, se asume que está correcto.'),
    React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:8,marginBottom:6}},
      items.map(function(it){
        var marcado=!!valores[it.key];
        return React.createElement('label',{key:it.key,style:{display:'flex',alignItems:'center',gap:10,fontSize:13,cursor:soloLectura?'default':'pointer',padding:'8px 12px',borderRadius:8,background:marcado?'rgba(176,48,48,0.06)':'rgba(46,125,79,0.06)',border:'1px solid '+(marcado?'rgba(176,48,48,0.3)':'rgba(46,125,79,0.2)')}},
          React.createElement('input',{type:'checkbox',checked:marcado,disabled:soloLectura,onChange:function(){if(soloLectura)return;var nuevo=Object.assign({},valores);nuevo[it.key]=!marcado;onChange(nuevo);},style:{width:16,height:16,cursor:soloLectura?'default':'pointer'}}),
          React.createElement('span',{style:{color:marcado?'#b03030':'#2e7d4f',fontWeight:700,fontSize:11,minWidth:66}},marcado?'⚠ EXCEPCIÓN':'✓ SIN NOVEDAD'),
          React.createElement('span',null,it.label));
      })
    )
  );
}

function miniStat(label,val,alerta){
  return React.createElement('div',{key:label,style:{flex:'1 1 120px',background:alerta&&val>0?'rgba(176,48,48,0.06)':'#fff',border:'1px solid '+(alerta&&val>0?'rgba(176,48,48,0.25)':'var(--border)'),borderRadius:10,padding:'10px 14px'}},
    React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',letterSpacing:0.5,textTransform:'uppercase',marginBottom:4}},label),
    React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:26,color:alerta&&val>0?'#b03030':'var(--text)'}},val));
}

// Mismo mapeo color→clase de degradé que usa el Dashboard principal para sus tarjetas KPI
// por estado (.stat-value.green/.red/.gold/etc, definidas en el CSS global) — así el mini
// dashboard de Firmas en Vivo se ve exactamente igual, solo que en tamaño reducido.
var ESTADO_VALUE_CLASS={en_bodega:'teal',en_ruta:'gold',entregado:'green',reprogramado:'purple',cancelado:'red',siniestro:'orange',retorno:'brown',en_bodega_cancelado:'rust'};
// Estados que ameritan una señal de alerta cuando su conteo es mayor a 0 (no incluye
// 'retorno' ni 'en_bodega_cancelado' porque son desenlaces esperados del flujo, no fallas).
var ESTADOS_CRITICOS=['reprogramado','cancelado','siniestro'];

// Tarjeta de conteo por estado: mismo estilo visual que las KPI del Dashboard principal
// (.stat-card/.stat-label/.stat-value/.stat-sub, con acento de color por estado) pero en
// tamaño reducido y CLICKEABLE — funciona a la vez como indicador en vivo y como filtro
// rápido (clic = filtrar Firmas en Vivo por ese estado; clic de nuevo sobre el ya activo =
// quitar el filtro y volver a "Todos").
function EstadoStatTile(label,val,count,total,color,bg,valClass,activo,critico,onClick){
  var pct=total>0?Math.round(count/total*100):0;
  var pctTxt=total>0?pct+'%':'—';
  return React.createElement('div',{
    key:val||'todos',onClick:onClick,className:'stat-card',
    style:{
      '--card-accent':color,borderTop:'4px solid '+color,padding:'10px 8px 8px',cursor:'pointer',minWidth:0,
      boxShadow:activo?('0 0 0 2px '+color+', 6px 6px 14px rgba(43,46,32,0.14)'):(critico&&count>0?'0 0 0 1px rgba(176,48,48,0.35)':undefined),
      transform:activo?'translateY(-2px)':undefined,transition:'all 0.15s'
    }
  },
    critico&&count>0&&React.createElement('span',{style:{position:'absolute',top:6,right:8,fontSize:11}},'⚠'),
    React.createElement('div',{className:'stat-label',style:{fontSize:8,marginBottom:5,paddingRight:(critico&&count>0)?14:0}},label),
    React.createElement('div',{className:'stat-value '+valClass,style:{fontSize:26}},count),
    // Barra de efectividad: el relleno lleva el color propio del estado y el riel es un tono
    // más claro del mismo color (no un gris genérico), así el estado se reconoce de un
    // vistazo aunque el número y el % ya lo digan.
    React.createElement('div',{style:{height:5,borderRadius:20,background:bg,marginTop:7,overflow:'hidden'}},
      React.createElement('div',{style:{height:'100%',width:pct+'%',borderRadius:20,background:color,transition:'width 0.3s ease'}})),
    React.createElement('div',{className:'stat-sub',style:{fontSize:9,marginTop:5}},pctTxt));
}

// ══════════════════════════════════════════════════════════════════════════════════════
// Puente Firmas en Vivo ↔ Cierre Diario ↔ Multas (Pagos Mensajeros).
// ══════════════════════════════════════════════════════════════════════════════════════
// Agrega una fila a "Excepciones detectadas" (Sección B) del reporte de Cierre Diario de esa
// fecha -- si ya hay un reporte en BORRADOR para ese día lo actualiza, y si no existe ninguno
// (o todos los que hay ya están cerrados) crea uno nuevo en borrador. Ojo: esto escribe directo
// en la base (no pasa por el estado local de CierreDiario), así que si alguien tiene ese mismo
// reporte abierto en pantalla sin guardar, su próximo "Guardar borrador" puede pisar esta fila
// (limitación que ya existía antes para cualquier edición concurrente del mismo reporte).
async function registrarExcepcionEnCierre(fecha,fila,toast,nombreUsuario){
  try{
    var r=await db.from('cierres_ruta').select('id,firmas_excepciones').eq('fecha',fecha).eq('estado_reporte','borrador').order('created_at',{ascending:false}).limit(1);
    if(r.error)throw r.error;
    if(r.data&&r.data.length>0){
      var row=r.data[0];
      var nuevas=(row.firmas_excepciones||[]).concat([fila]);
      var w=await db.from('cierres_ruta').update({firmas_excepciones:nuevas,updated_at:new Date().toISOString()}).eq('id',row.id);
      if(w.error)throw w.error;
    }else{
      var ins=await db.from('cierres_ruta').insert({fecha:fecha,estado_reporte:'borrador',firmas_excepciones:[fila],creado_por:nombreUsuario||null}).select().single();
      if(ins.error)throw ins.error;
    }
    return true;
  }catch(e){
    toast&&toast('⚠ No se pudo registrar en el Cierre Diario: '+(e&&e.message?e.message:'error desconocido'));
    return false;
  }
}

// Modal "⚠ Reportar excepción" -- se abre desde cada tarjeta de Firmas en Vivo. Deja elegir
// CADA VEZ entre solo dejar constancia en el Cierre Diario, o además aplicar la multa/descuento
// real al mensajero (reutilizando el mismo catálogo y cálculo que "🎯 Descuentos" en Pagos
// Mensajeros, vía window.__app.aplicarMultaExterna -- carga ese módulo al vuelo si todavía no
// estaba cargado). Los "puntos" quedan guardados en la fila igual se multe o no, para poder
// calcular la ponderación económica del día en el Cierre Diario aunque no se haya multado.
function ReportarModal(props){
  var envio=props.envio, onClose=props.onClose, onDone=props.onDone, toast=props.toast, nombreUsuario=props.nombreUsuario;
  var grupos=['Leve','Grave','Crítica','Otro'];
  var primero=CATALOGO_FALTAS_REGLAMENTO[0]||{label:'',envios:0};
  var _falta=useState(primero.label), faltaSel=_falta[0], setFaltaSel=_falta[1];
  var _puntos=useState(primero.envios||0), puntos=_puntos[0], setPuntos=_puntos[1];
  var _accion=useState(''), accion=_accion[0], setAccion=_accion[1];
  var _enviando=useState(false), enviando=_enviando[0], setEnviando=_enviando[1];

  function onChangeFalta(label){
    setFaltaSel(label);
    var it=CATALOGO_FALTAS_REGLAMENTO.find(function(f){return f.label===label;});
    setPuntos(it?it.envios:0);
  }

  async function ejecutar(conMulta){
    if(!envio.mensajero){toast&&toast('⚠ Este envío no tiene mensajero asignado, no se puede reportar.');return;}
    if(conMulta&&(+puntos||0)<=0){toast&&toast('⚠ Ingresa una cantidad de puntos/envíos mayor a 0 para poder multar.');return;}
    setEnviando(true);
    var monto=0, multaOk=false;
    if(conMulta){
      try{
        await loadScriptOnce('pagos-mensajeros','modules/pagos-mensajeros.js');
      }catch(e){
        toast&&toast('⚠ No se pudo cargar el módulo de Pagos Mensajeros.');
      }
      if(window.__app.aplicarMultaExterna){
        var rr=await window.__app.aplicarMultaExterna(envio.mensajero,faltaSel,puntos,accion,fechaHoyCL());
        if(rr.ok){monto=rr.monto;multaOk=true;}
        else if(rr.motivo==='sin_semana')toast&&toast('⚠ No hay pagos calculados para esta semana todavía. Ve a Pagos Mensajeros → "Calcular Envíos Semana" y vuelve a intentar.');
        else if(rr.motivo==='sin_mensajero')toast&&toast('⚠ '+envio.mensajero.split(',')[0]+' no aparece en los pagos de esta semana.');
        else toast&&toast('⚠ Error al aplicar la multa: '+(rr.mensaje||'desconocido'));
      }else{
        toast&&toast('⚠ No se pudo cargar el módulo de Pagos Mensajeros.');
      }
    }
    var fila={
      mensajero:envio.mensajero,codigo:envio.codigo,falta:faltaSel,
      accion:accion||(multaOk?'Multa aplicada desde Firmas en Vivo':'Registrado desde Firmas en Vivo'),
      puntos:+puntos||0,multaAplicada:multaOk,monto:multaOk?monto:0,origen:'firmas_vivo',hora:new Date().toISOString()
    };
    var ok=await registrarExcepcionEnCierre(fechaHoyCL(),fila,toast,nombreUsuario);
    setEnviando(false);
    if(ok){
      toast&&toast(multaOk?'✓ Multa aplicada y registrada en el Cierre Diario':'✓ Registrado en el Cierre Diario de hoy');
      onDone&&onDone(fila);
      onClose();
    }
  }

  return React.createElement('div',{style:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999},onClick:onClose},
    React.createElement('div',{style:{background:'#fff',borderRadius:14,padding:20,width:460,maxWidth:'92vw',maxHeight:'85vh',overflowY:'auto'},onClick:function(e){e.stopPropagation();}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}},
        React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1,color:'var(--dark)'}},'⚠ Reportar excepción'),
        React.createElement('button',{onClick:onClose,style:{border:'none',background:'none',fontSize:18,cursor:'pointer',color:'var(--text-soft)'}},'✕')
      ),
      React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:14}},(envio.mensajero||'Sin mensajero asignado').replace(/,\s*/g,' ')+' · Código '+envio.codigo),
      React.createElement('div',{style:{marginBottom:10}},
        React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Falta detectada (Reglamento Operativo)'),
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
      React.createElement('div',{style:{marginBottom:10}},
        React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Puntos de gravedad (= envíos de descuento si se multa)'),
        React.createElement('input',{type:'number',min:0,value:puntos,onChange:function(e){setPuntos(e.target.value);},style:{width:140,padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',fontSize:12,outline:'none',fontFamily:'JetBrains Mono'}})
      ),
      React.createElement('textarea',{placeholder:'Acción / comentario (opcional)...',rows:2,value:accion,onChange:function(e){setAccion(e.target.value);},style:{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:12,outline:'none',marginBottom:14,boxSizing:'border-box',resize:'vertical'}}),
      React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}},
        React.createElement('button',{disabled:enviando,onClick:function(){ejecutar(false);},style:{padding:'8px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--cream)',color:'var(--text-main)',fontWeight:700,fontSize:12,cursor:enviando?'default':'pointer'}},'📋 Solo registrar incidencia'),
        React.createElement('button',{disabled:enviando,onClick:function(){ejecutar(true);},style:{padding:'8px 14px',borderRadius:8,border:'none',background:'var(--danger)',color:'#fff',fontWeight:700,fontSize:12,cursor:enviando?'default':'pointer'}},enviando?'...':'🎯 Aplicar multa y registrar')
      )
    )
  );
}

// ══════════════════════════════════════════════════════════════════════════════════════
// Estilo visual compartido con los Recibos de Cobro, para que todo lo exportado desde
// TransPgso se vea igual (mismo dorado/crema, mismo header con logo).
// ══════════════════════════════════════════════════════════════════════════════════════
function escHTML(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function estiloBaseHTML(titulo){
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5"/><meta name="theme-color" content="#C8A84B"/><title>'+escHTML(titulo)+'</title><style>*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}body{font-family:"DM Sans",system-ui,sans-serif;background:#F9F6EE;color:#444}</style></head><body>';
}
function headerReciboHTML(subtitulo,badge){
  return '<div style="background:#fff;border-bottom:3px solid #C8A84B;padding:14px 16px;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(168,132,48,.15)"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><div style="display:flex;align-items:center;gap:10px"><img src="'+LOGO_B64+'" style="height:42px;width:auto;object-fit:contain"/><div><div style="font-weight:900;font-size:16px;color:#A0842A">TransPgso SpA</div><div style="font-size:10px;color:#888;letter-spacing:1.5px;text-transform:uppercase">'+escHTML(subtitulo)+'</div></div></div>'+(badge?'<span style="background:#FDF8EC;border:1.5px solid #C8A84B;color:#A0842A;font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap">'+escHTML(badge)+'</span>':'')+'</div></div>';
}
function tarjetaHTML(tituloSeccion,icono,contenidoHTML){
  return '<div style="background:#fff;border-radius:14px;border:1.5px solid #EDE3C8;box-shadow:0 2px 12px rgba(168,132,48,.09);overflow:hidden;margin-bottom:16px"><div style="background:linear-gradient(135deg,#FDF8EC,#F5F0E0);padding:12px 18px;border-bottom:2px solid #C8A84B;display:flex;align-items:center;gap:8px"><span style="width:3px;height:16px;background:#C8A84B;border-radius:2px;flex-shrink:0;display:block"></span><span style="font-weight:700;font-size:14px;color:#A0842A">'+icono+' '+escHTML(tituloSeccion)+'</span></div><div style="padding:16px">'+contenidoHTML+'</div></div>';
}
function infoBoxHTML(label,valor){
  return '<div style="background:#FDF8EC;border-radius:8px;padding:10px 12px;border:1px solid #EDE3C8"><label style="display:block;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#A0842A;margin-bottom:2px">'+escHTML(label)+'</label><span style="font-size:13px;color:#333;font-weight:500;white-space:pre-wrap">'+escHTML(valor==null||valor===''?'—':valor)+'</span></div>';
}
function tablaHTML(columnas,filas){
  if(!filas||filas.length===0)return '<div style="font-size:12px;color:#999;padding:8px 0">Sin registros.</div>';
  var thead='<tr>'+columnas.map(function(c){return '<th style="text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#A0842A;border-bottom:2px solid #EDE3C8">'+escHTML(c.label)+'</th>';}).join('')+'</tr>';
  var trs=filas.map(function(f){
    return '<tr>'+columnas.map(function(c){return '<td style="padding:8px 10px;font-size:12px;border-bottom:1px solid #F0EAD6;color:#444">'+escHTML(f[c.key])+'</td>';}).join('')+'</tr>';
  }).join('');
  return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:480px">'+thead+trs+'</table></div>';
}
function checklistHTML(items,valores){
  return '<div style="display:flex;flex-direction:column;gap:6px">'+items.map(function(it){
    var marcado=!!valores[it.key];
    return '<div style="display:flex;align-items:center;gap:8px;font-size:12px"><span style="color:'+(marcado?'#C62828':'#2E7D32')+';font-weight:700;min-width:90px">'+(marcado?'⚠ EXCEPCIÓN':'✓ SIN NOVEDAD')+'</span><span>'+escHTML(it.label)+'</span></div>';
  }).join('')+'</div>';
}
function descargarHTML(nombreArchivo,htmlContent){
  var blob=new Blob([htmlContent],{type:'text/html'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download=nombreArchivo;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},2000);
}

function exportarCierreHTML(r){
  var titulo='Cierre de Ruta - '+r.fecha+(r.turno?' ('+r.turno+')':'');
  var html=estiloBaseHTML(titulo)
    +headerReciboHTML('Cierre de Ruta · Operaciones',r.estado_reporte==='cerrado'?'CERRADO':'BORRADOR')
    +'<div style="padding:16px;max-width:900px;margin:0 auto">'
    +tarjetaHTML('Datos generales','🗓','<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      +infoBoxHTML('Fecha',r.fecha)+infoBoxHTML('Turno',r.turno)
      +infoBoxHTML('Supervisor responsable',r.supervisor_responsable)+infoBoxHTML('Jefe / responsable de revisión',r.jefe_responsable)
      +'</div>')
    +tarjetaHTML('A. Estado de la ruta por mensajero','🚚',tablaHTML([{key:'mensajero',label:'Mensajero'},{key:'entregadas',label:'Entregadas'},{key:'pendientes',label:'Pendientes'},{key:'incidencia',label:'Con incidencia'},{key:'reprogramacion',label:'Reprogramación / gestión'}],r.estado_ruta)
      +'<div style="margin-top:12px;font-weight:700;font-size:12px;color:#A0842A">Detalle de incidencias</div><div style="margin-top:6px">'+tablaHTML([{key:'mensajero',label:'Mensajero'},{key:'codigo',label:'Código'},{key:'tipo',label:'Tipo'},{key:'descripcion',label:'Descripción / gestión'}],r.incidencias)+'</div>')
    +tarjetaHTML('B. Firmas','✍',checklistHTML(FIRMAS_CHECK_ITEMS,r.firmas_checklist||{})
      +'<div style="margin-top:12px;font-weight:700;font-size:12px;color:#A0842A">Excepciones detectadas</div><div style="margin-top:6px">'+tablaHTML([{key:'mensajero',label:'Mensajero'},{key:'codigo',label:'Código afectado'},{key:'falta',label:'Falta detectada'},{key:'accion',label:'Acción / comentario'}],r.firmas_excepciones)+'</div>')
    +tarjetaHTML('C. Respaldos','📷',tablaHTML([{key:'mensajero',label:'Mensajero'},{key:'tipo',label:'Tipo'},{key:'codigo',label:'Código'},{key:'observacion',label:'Observación / falta detectada'}],r.respaldos)
      +'<div style="margin-top:12px;font-weight:700;font-size:12px;color:#A0842A">Control general</div><div style="margin-top:6px">'+checklistHTML(RESPALDOS_CHECK_ITEMS,r.respaldos_checklist||{})+'</div>')
    +tarjetaHTML('D. Pendientes para el día siguiente','📌',tablaHTML([{key:'codigo',label:'Código'},{key:'mensajero',label:'Mensajero'},{key:'situacion',label:'Situación / motivo'},{key:'gestion',label:'Gestión pendiente'},{key:'responsable',label:'Responsable'}],r.pendientes))
    +tarjetaHTML('E. Cierre de la revisión','✅','<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      +infoBoxHTML('Resultado de la revisión',r.resultado_revision)
      +infoBoxHTML('Fecha / hora de cierre',r.fecha_hora_cierre?new Date(r.fecha_hora_cierre).toLocaleString('es-CL'):'—')
      +'<div style="grid-column:1/-1">'+infoBoxHTML('Observaciones generales',r.observaciones_generales)+'</div>'
      +infoBoxHTML('Creado por',r.creado_por)+infoBoxHTML('Cerrado por',r.cerrado_por)
      +'</div>')
    +(r.ponderacion_economica?tarjetaHTML('Ponderación económica del día','💰','<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
      +infoBoxHTML('Puntaje de gravedad',String(r.ponderacion_economica.puntosGravedadDia))
      +infoBoxHTML('Multas detectadas hoy','$'+Math.round(r.ponderacion_economica.montoMultasDia).toLocaleString('es-CL'))
      +infoBoxHTML('Costo del día (operador)','$'+Math.round(r.ponderacion_economica.costoDiarioOperador).toLocaleString('es-CL'))
      +'</div><div style="margin-top:10px;font-size:12px;font-weight:700;color:'+(r.ponderacion_economica.seRecuperoCosto?'#2E7D32':'#C62828')+'">'
      +(r.ponderacion_economica.seRecuperoCosto?'✓ El trabajo de hoy se pagó solo.':'⚠ Por debajo del costo del día.')+'</div>'):'')
    +'</div></body></html>';
  descargarHTML('Cierre_Ruta_'+r.fecha+(r.turno?'_'+r.turno.replace(/\s+/g,'_'):'')+'.html',html);
}

function exportarFirmasVivoHTML(filtrados,periodoLabel){
  var filas=filtrados.map(function(e){
    var fotos=parsearFotos(e.fotos_entrega);
    var urls=(e.foto_etiqueta?[e.foto_etiqueta]:[]).concat(fotos.map(function(f){return f.url;}));
    var imgsHtml=urls.length>0?urls.map(function(u){return '<img src="'+u+'" style="width:90px;height:90px;object-fit:cover;border-radius:6px;border:1px solid #EDE3C8;margin:2px" onerror="this.style.display=\'none\'"/>';}).join(''):'<span style="font-size:11px;color:#999;font-style:italic">Sin evidencia cargada</span>';
    return '<div style="background:#fff;border-radius:12px;border:1px solid #EDE3C8;box-shadow:0 2px 8px rgba(168,132,48,.08);padding:14px;margin-bottom:12px">'
      +'<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px"><span style="font-family:monospace;font-weight:700;font-size:13px">'+escHTML(e.codigo)+'</span><span style="font-size:11px;font-weight:700;color:#A0842A;text-transform:uppercase">'+escHTML(e.estado)+'</span></div>'
      +'<div style="font-size:13px;font-weight:700;margin-bottom:2px">'+escHTML(e.cliente||'—')+'</div>'
      +'<div style="font-size:12px;color:#666;margin-bottom:2px">'+escHTML(e.destinatario||'—')+' · '+escHTML(e.comuna||'—')+'</div>'
      +'<div style="font-size:12px;color:#666;margin-bottom:8px">🏍 '+escHTML((e.mensajero||'Sin asignar').replace(/,\s*/g,' '))+'</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:2px">'+imgsHtml+'</div></div>';
  }).join('');
  var html=estiloBaseHTML('Firmas en Vivo - '+periodoLabel)
    +headerReciboHTML('Firmas en Vivo · Operaciones',periodoLabel.toUpperCase())
    +'<div style="padding:16px;max-width:900px;margin:0 auto">'
    +'<div style="font-size:12px;color:#888;margin-bottom:14px">'+filtrados.length+' envío'+(filtrados.length!==1?'s':'')+' · generado '+new Date().toLocaleString('es-CL')+'</div>'
    +(filas||'<div style="font-size:12px;color:#999">Sin envíos que coincidan con los filtros.</div>')
    +'</div></body></html>';
  descargarHTML('Firmas_En_Vivo_'+ymd(new Date())+'.html',html);
}

// ══════════════════════════════════════════════════════════════════════════════════════
// A-E: Cierre Diario de Rutas (informe de cierre digitalizado)
// ══════════════════════════════════════════════════════════════════════════════════════
function CierreDiario(props){
  var mensajeros=props.mensajeros||[], usuario=props.usuario, esAdmin=props.esAdmin, toast=props.toast;
  var nombreUsuario=(usuario&&usuario.nombre)||'—';

  var _fecha=useState(function(){return fechaHoyCL();}), fecha=_fecha[0], setFecha=_fecha[1];
  var _turno=useState(''), turno=_turno[0], setTurno=_turno[1];
  var _reporteId=useState(null), reporteId=_reporteId[0], setReporteId=_reporteId[1];
  var _estadoReporte=useState('borrador'), estadoReporte=_estadoReporte[0], setEstadoReporte=_estadoReporte[1];
  var _supervisor=useState(nombreUsuario), supervisorResponsable=_supervisor[0], setSupervisorResponsable=_supervisor[1];
  var _jefe=useState(''), jefeResponsable=_jefe[0], setJefeResponsable=_jefe[1];
  var _estadoRuta=useState([]), estadoRuta=_estadoRuta[0], setEstadoRuta=_estadoRuta[1];
  var _incidencias=useState([]), incidencias=_incidencias[0], setIncidencias=_incidencias[1];
  var _firmasChk=useState({}), firmasChecklist=_firmasChk[0], setFirmasChecklist=_firmasChk[1];
  var _firmasExc=useState([]), firmasExcepciones=_firmasExc[0], setFirmasExcepciones=_firmasExc[1];
  var _respaldos=useState([]), respaldos=_respaldos[0], setRespaldos=_respaldos[1];
  var _respaldosChk=useState({}), respaldosChecklist=_respaldosChk[0], setRespaldosChecklist=_respaldosChk[1];
  var _pendientes=useState([]), pendientes=_pendientes[0], setPendientes=_pendientes[1];
  var _resultado=useState(''), resultadoRevision=_resultado[0], setResultadoRevision=_resultado[1];
  var _obsGen=useState(''), observacionesGenerales=_obsGen[0], setObservacionesGenerales=_obsGen[1];
  var _fhCierre=useState(null), fechaHoraCierre=_fhCierre[0], setFechaHoraCierre=_fhCierre[1];
  var _creadoPor=useState(''), creadoPor=_creadoPor[0], setCreadoPor=_creadoPor[1];
  var _cerradoPor=useState(''), cerradoPor=_cerradoPor[0], setCerradoPor=_cerradoPor[1];
  var _guardando=useState(false), guardando=_guardando[0], setGuardando=_guardando[1];
  var _historialDia=useState([]), historialDia=_historialDia[0], setHistorialDia=_historialDia[1];

  // ── Ponderación económica del día ──────────────────────────────────────────────────
  // Compara lo detectado (en pesos, vía multas efectivamente aplicadas + un puntaje de
  // gravedad aunque no se haya multado) contra el costo de ese día de trabajo del operador
  // (sueldo mensual en USD, convertido a pesos con un tipo de cambio editable, dividido entre
  // los días laborables del mes) -- así se puede ver de un vistazo si el día "se pagó solo".
  // Los 3 parámetros (tipo de cambio, sueldo, días laborables) se guardan en la tabla
  // genérica `configuracion` (mismo mecanismo que usan otras pantallas del sistema, ej.
  // "motivos_reprogramacion") para que Luis los pueda ajustar sin tocar código.
  var CFG_ECON_DEFAULT={valorDolarClp:936,sueldoOperadorUsdMensual:150,diasLaborablesMes:26};
  var _cfgEcon=useState(CFG_ECON_DEFAULT), cfgEcon=_cfgEcon[0], setCfgEcon=_cfgEcon[1];
  var _editandoCfg=useState(false), editandoCfg=_editandoCfg[0], setEditandoCfg=_editandoCfg[1];
  var _cfgBorrador=useState(CFG_ECON_DEFAULT), cfgBorrador=_cfgBorrador[0], setCfgBorrador=_cfgBorrador[1];
  useEffect(function(){
    db.from('configuracion').select('valor').eq('clave','operaciones_valor_economico').maybeSingle().then(function(r){
      if(r&&r.data&&r.data.valor){var fusion=Object.assign({},CFG_ECON_DEFAULT,r.data.valor);setCfgEcon(fusion);setCfgBorrador(fusion);}
    }).catch(function(){});
  },[]);
  function guardarCfgEcon(){
    var limpio={
      valorDolarClp:+cfgBorrador.valorDolarClp||CFG_ECON_DEFAULT.valorDolarClp,
      sueldoOperadorUsdMensual:+cfgBorrador.sueldoOperadorUsdMensual||CFG_ECON_DEFAULT.sueldoOperadorUsdMensual,
      diasLaborablesMes:+cfgBorrador.diasLaborablesMes||CFG_ECON_DEFAULT.diasLaborablesMes
    };
    setCfgEcon(limpio);setEditandoCfg(false);
    db.from('configuracion').upsert({clave:'operaciones_valor_economico',valor:limpio,updated_at:new Date().toISOString()},{onConflict:'clave'}).then(function(){toast&&toast('✓ Parámetros de ponderación económica actualizados');}).catch(function(){});
  }

  var _histOpen=useState(false), historialAbierto=_histOpen[0], setHistorialAbierto=_histOpen[1];
  var _histDesde=useState(function(){var d=new Date();d.setDate(d.getDate()-6);return ymd(d);}), histDesde=_histDesde[0], setHistDesde=_histDesde[1];
  var _histHasta=useState(function(){return fechaHoyCL();}), histHasta=_histHasta[0], setHistHasta=_histHasta[1];
  var _histRows=useState([]), historialRango=_histRows[0], setHistorialRango=_histRows[1];
  var _histCarg=useState(false), cargandoHist=_histCarg[0], setCargandoHist=_histCarg[1];

  function cargarHistorialDia(f){
    db.from('cierres_ruta').select('id,fecha,turno,estado_reporte,creado_por,cerrado_por').eq('fecha',f).order('created_at',{ascending:false}).then(function(r){
      setHistorialDia((r&&r.data)||[]);
    }).catch(function(){});
  }
  // Al entrar a la pestaña (o cambiar de fecha) autoabre el reporte más reciente de ese día si
  // ya existe uno -- antes quedaba un formulario en blanco aunque ya hubiera un reporte cargado
  // (por ejemplo, uno recién creado desde el botón "⚠ Reportar" de Firmas en Vivo), y para verlo
  // había que acordarse de tocar su chip en "Reportes de este día"; fácil pensar que el dato "no
  // llegó" cuando en realidad sí se guardó, solo que no estaba a la vista. Prioriza un borrador
  // (lo más probable que se quiera seguir editando) y si no hay ninguno abre el más reciente
  // igual (aunque esté cerrado) para no dejar la pantalla en blanco sin motivo.
  // OJO: esto NO se ejecuta al usar "+ Nuevo reporte" (esa acción no cambia `fecha`, así que este
  // efecto no se vuelve a disparar) ni después de Guardar/Cerrar/Reabrir (esos casos llaman
  // directo a cargarHistorialDia(fecha), que solo refresca los chips sin autoabrir nada) --
  // en ambos casos se respeta el reporte que la persona ya tiene abierto en pantalla.
  useEffect(function(){
    db.from('cierres_ruta').select('id,fecha,turno,estado_reporte,creado_por,cerrado_por').eq('fecha',fecha).order('created_at',{ascending:false}).then(function(r){
      var filas=(r&&r.data)||[];
      setHistorialDia(filas);
      if(filas.length>0){
        var preferido=filas.find(function(x){return x.estado_reporte==='borrador';})||filas[0];
        abrirDesdeHistorial(preferido.id);
      }
    }).catch(function(){});
  },[fecha]);

  function limpiarFormulario(){
    setReporteId(null);setEstadoReporte('borrador');setTurno('');
    setSupervisorResponsable(nombreUsuario);setJefeResponsable('');
    setEstadoRuta([]);setIncidencias([]);setFirmasChecklist({});setFirmasExcepciones([]);
    setRespaldos([]);setRespaldosChecklist({});setPendientes([]);
    setResultadoRevision('');setObservacionesGenerales('');setFechaHoraCierre(null);
    setCreadoPor('');setCerradoPor('');
  }
  function abrirReporte(row){
    setReporteId(row.id);setFecha(row.fecha);setTurno(row.turno||'');setEstadoReporte(row.estado_reporte||'borrador');
    setSupervisorResponsable(row.supervisor_responsable||'');setJefeResponsable(row.jefe_responsable||'');
    setEstadoRuta(row.estado_ruta||[]);setIncidencias(row.incidencias||[]);
    setFirmasChecklist(row.firmas_checklist||{});setFirmasExcepciones(row.firmas_excepciones||[]);
    setRespaldos(row.respaldos||[]);setRespaldosChecklist(row.respaldos_checklist||{});
    setPendientes(row.pendientes||[]);
    setResultadoRevision(row.resultado_revision||'');setObservacionesGenerales(row.observaciones_generales||'');
    setFechaHoraCierre(row.fecha_hora_cierre||null);
    setCreadoPor(row.creado_por||'');setCerradoPor(row.cerrado_por||'');
  }
  function abrirDesdeHistorial(id){
    db.from('cierres_ruta').select('*').eq('id',id).single().then(function(r){
      if(r&&r.data){abrirReporte(r.data);setHistorialAbierto(false);}
    }).catch(function(){toast&&toast('⚠ No se pudo abrir ese reporte');});
  }
  function cargarHistorialRango(){
    setCargandoHist(true);
    db.from('cierres_ruta').select('id,fecha,turno,estado_reporte,creado_por,cerrado_por,supervisor_responsable')
      .gte('fecha',histDesde).lte('fecha',histHasta)
      .order('fecha',{ascending:false}).order('created_at',{ascending:false}).then(function(r){
        setHistorialRango((r&&r.data)||[]);setCargandoHist(false);
      }).catch(function(){setCargandoHist(false);});
  }
  useEffect(function(){if(historialAbierto)cargarHistorialRango();},[historialAbierto,histDesde,histHasta]);

  var soloLectura=estadoReporte==='cerrado';

  function construirPayload(estadoFinal){
    return{
      fecha:fecha,turno:turno||null,
      supervisor_responsable:supervisorResponsable||null,jefe_responsable:jefeResponsable||null,
      estado_ruta:estadoRuta,incidencias:incidencias,
      firmas_checklist:firmasChecklist,firmas_excepciones:firmasExcepciones,
      respaldos:respaldos,respaldos_checklist:respaldosChecklist,
      pendientes:pendientes,
      resultado_revision:resultadoRevision||null,observaciones_generales:observacionesGenerales||null,
      fecha_hora_cierre:estadoFinal==='cerrado'?new Date().toISOString():fechaHoraCierre,
      estado_reporte:estadoFinal,
      cerrado_por:estadoFinal==='cerrado'?nombreUsuario:cerradoPor,
      updated_at:new Date().toISOString()
    };
  }
  async function guardar(cerrar){
    if(guardando)return;
    if(!fecha){toast&&toast('⚠ Falta la fecha');return;}
    if(cerrar&&!window.confirm('¿Cerrar esta revisión? Una vez cerrada, solo un administrador podrá reabrirla para editarla.'))return;
    setGuardando(true);
    var estadoFinal=cerrar?'cerrado':'borrador';
    var payload=construirPayload(estadoFinal);
    try{
      var r;
      if(reporteId){
        r=await db.from('cierres_ruta').update(payload).eq('id',reporteId).select().single();
      }else{
        payload.creado_por=nombreUsuario;
        r=await db.from('cierres_ruta').insert(payload).select().single();
      }
      if(r.error)throw r.error;
      abrirReporte(r.data);
      cargarHistorialDia(fecha);
      toast&&toast(cerrar?'✓ Revisión cerrada':'✓ Borrador guardado');
    }catch(e){
      toast&&toast('⚠ Error al guardar: '+(e&&e.message?e.message:'desconocido'));
    }
    setGuardando(false);
  }
  async function reabrir(){
    if(!reporteId||!esAdmin)return;
    if(!window.confirm('¿Reabrir esta revisión para editarla?'))return;
    try{
      var r=await db.from('cierres_ruta').update({estado_reporte:'borrador',updated_at:new Date().toISOString()}).eq('id',reporteId).select().single();
      if(r.error)throw r.error;
      abrirReporte(r.data);
      cargarHistorialDia(fecha);
      toast&&toast('🔓 Revisión reabierta');
    }catch(e){toast&&toast('⚠ Error: '+(e&&e.message?e.message:'desconocido'));}
  }

  var totIncidencias=incidencias.length, totExcepFirmas=firmasExcepciones.length, totRespaldos=respaldos.length, totPendientes=pendientes.length;

  // "puntos" y "monto"/"multaAplicada" solo existen en filas creadas desde el botón "⚠ Reportar"
  // de Firmas en Vivo (o cargadas manualmente con esos mismos campos) -- una excepción tipeada a
  // mano en la tabla de siempre, sin esos campos, simplemente no suma nada acá (no se pierde ni
  // rompe, solo no aporta a la ponderación económica).
  var puntosGravedadDia=firmasExcepciones.reduce(function(a,x){return a+(+x.puntos||0);},0);
  var montoMultasDia=firmasExcepciones.reduce(function(a,x){return a+(x.multaAplicada?(+x.monto||0):0);},0);
  var costoDiarioOperador=Math.round((cfgEcon.sueldoOperadorUsdMensual*cfgEcon.valorDolarClp)/(cfgEcon.diasLaborablesMes||1));
  var seRecuperoCosto=montoMultasDia>=costoDiarioOperador&&costoDiarioOperador>0;

  return React.createElement('div',null,
    React.createElement('datalist',{id:'dl-mensajeros-operaciones'},mensajeros.map(function(m){return React.createElement('option',{key:m.id||m.nombre,value:m.nombre});})),

    React.createElement('div',{style:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end',marginBottom:14}},
      React.createElement('div',null,
        React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Fecha'),
        React.createElement('input',{type:'date',className:'form-input',style:{padding:'8px 10px'},value:fecha,onChange:function(e){limpiarFormulario();setFecha(e.target.value);}})),
      React.createElement('div',null,
        React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Turno (opcional)'),
        React.createElement('input',{className:'form-input',style:{padding:'8px 10px',maxWidth:160},placeholder:'Ej: AM, PM...',value:turno,onChange:function(e){setTurno(e.target.value);},disabled:soloLectura})),
      React.createElement('button',{className:'btn-secondary',onClick:function(){limpiarFormulario();}},'+ Nuevo reporte'),
      React.createElement('button',{className:'btn-secondary',onClick:function(){setHistorialAbierto(function(v){return!v;});}},historialAbierto?'✕ Cerrar historial':'📚 Ver historial de cierres')
    ),

    historialDia.length>0&&React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}},
      React.createElement('span',{style:{fontSize:11,color:'var(--text-soft)',alignSelf:'center'}},'Reportes de este día:'),
      historialDia.map(function(h){
        var activo=reporteId===h.id;
        return React.createElement('button',{key:h.id,className:'btn-secondary',style:activo?{background:'rgba(200,168,75,0.18)',borderColor:'var(--gold)',color:'var(--gold)'}:undefined,onClick:function(){abrirDesdeHistorial(h.id);}},
          (h.turno||'Turno único')+' · '+(h.estado_reporte==='cerrado'?'🔒 Cerrado':'📝 Borrador')+(h.creado_por?' · '+h.creado_por:''));
      })
    ),

    historialAbierto&&React.createElement('div',{style:{border:'1px solid var(--border)',borderRadius:10,padding:14,marginBottom:18,background:'#fafaf7'}},
      React.createElement('div',{style:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end',marginBottom:10}},
        React.createElement('div',null,
          React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Desde'),
          React.createElement('input',{type:'date',className:'form-input',style:{padding:'6px 10px'},value:histDesde,onChange:function(e){setHistDesde(e.target.value);}})),
        React.createElement('div',null,
          React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Hasta'),
          React.createElement('input',{type:'date',className:'form-input',style:{padding:'6px 10px'},value:histHasta,onChange:function(e){setHistHasta(e.target.value);}})),
        React.createElement('button',{className:'btn-secondary',disabled:cargandoHist,onClick:cargarHistorialRango},cargandoHist?'Cargando...':'↺ Actualizar')
      ),
      React.createElement('div',{className:'table-wrap'},
        React.createElement('table',null,
          React.createElement('thead',null,React.createElement('tr',null,
            React.createElement('th',null,'Fecha'),React.createElement('th',null,'Turno'),React.createElement('th',null,'Estado'),
            React.createElement('th',null,'Supervisor'),React.createElement('th',null,'Creado por'),React.createElement('th',null,'Cerrado por'),React.createElement('th',null,''))),
          React.createElement('tbody',null,
            historialRango.length===0&&React.createElement('tr',null,React.createElement('td',{colSpan:7,style:{textAlign:'center',color:'var(--text-soft)',fontSize:12,padding:14}},'Sin reportes en este rango.')),
            historialRango.map(function(h){
              return React.createElement('tr',{key:h.id},
                React.createElement('td',{style:{fontSize:12}},h.fecha),
                React.createElement('td',{style:{fontSize:12}},h.turno||'—'),
                React.createElement('td',{style:{fontSize:12}},h.estado_reporte==='cerrado'?'🔒 Cerrado':'📝 Borrador'),
                React.createElement('td',{style:{fontSize:12}},h.supervisor_responsable||'—'),
                React.createElement('td',{style:{fontSize:12}},h.creado_por||'—'),
                React.createElement('td',{style:{fontSize:12}},h.cerrado_por||'—'),
                React.createElement('td',null,React.createElement('button',{className:'action-btn btn-edit',onClick:function(){abrirDesdeHistorial(h.id);}},'Abrir')));
            })
          )
        )
      )
    ),

    React.createElement('div',{style:{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}},
      miniStat('Incidencias',totIncidencias,true),
      miniStat('Excepciones de firma',totExcepFirmas,true),
      miniStat('Respaldos observados',totRespaldos,true),
      miniStat('Pendientes mañana',totPendientes,true),
      React.createElement('div',{style:{flex:'1 1 160px',background:soloLectura?'rgba(46,125,79,0.08)':'rgba(200,168,75,0.1)',border:'1px solid '+(soloLectura?'rgba(46,125,79,0.3)':'rgba(200,168,75,0.35)'),borderRadius:10,padding:'10px 14px'}},
        React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',letterSpacing:0.5,textTransform:'uppercase',marginBottom:4}},'Estado del reporte'),
        React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:20,color:soloLectura?'#2e7d4f':'#8a6d1a'}},soloLectura?'🔒 CERRADO':'📝 BORRADOR'))
    ),

    // ── Ponderación económica del día ──
    React.createElement('div',{style:{background:'#fff',border:'1.5px solid '+(seRecuperoCosto?'rgba(46,125,79,0.3)':'rgba(200,168,75,0.35)'),borderRadius:10,padding:14,marginBottom:20}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:10}},
        React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:15,letterSpacing:1,color:'var(--dark)'}},'💰 Ponderación económica del día'+(creadoPor?' — '+creadoPor:'')),
        esAdmin&&React.createElement('button',{className:'btn-secondary',onClick:function(){setCfgBorrador(cfgEcon);setEditandoCfg(function(v){return!v;});}},editandoCfg?'✕ Cerrar':'⚙ Parámetros')
      ),
      editandoCfg&&React.createElement('div',{style:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end',background:'var(--cream)',border:'1px solid var(--border)',borderRadius:8,padding:12,marginBottom:12}},
        React.createElement('div',null,
          React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Sueldo mensual operador (USD)'),
          React.createElement('input',{type:'number',className:'form-input',style:{width:110,padding:'6px 8px'},value:cfgBorrador.sueldoOperadorUsdMensual,onChange:function(e){setCfgBorrador(Object.assign({},cfgBorrador,{sueldoOperadorUsdMensual:e.target.value}));}})),
        React.createElement('div',null,
          React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Tipo de cambio (CLP por USD)'),
          React.createElement('input',{type:'number',className:'form-input',style:{width:110,padding:'6px 8px'},value:cfgBorrador.valorDolarClp,onChange:function(e){setCfgBorrador(Object.assign({},cfgBorrador,{valorDolarClp:e.target.value}));}})),
        React.createElement('div',null,
          React.createElement('label',{style:{fontSize:10,color:'var(--text-soft)',display:'block',marginBottom:3}},'Días laborables al mes'),
          React.createElement('input',{type:'number',className:'form-input',style:{width:100,padding:'6px 8px'},value:cfgBorrador.diasLaborablesMes,onChange:function(e){setCfgBorrador(Object.assign({},cfgBorrador,{diasLaborablesMes:e.target.value}));}})),
        React.createElement('button',{className:'btn-confirm',onClick:guardarCfgEcon},'💾 Guardar')
      ),
      React.createElement('div',{style:{display:'flex',gap:10,flexWrap:'wrap',marginBottom:10}},
        miniStat('Puntaje de gravedad',puntosGravedadDia,puntosGravedadDia>0),
        React.createElement('div',{style:{flex:'1 1 160px',background:montoMultasDia>0?'rgba(176,48,48,0.06)':'#fff',border:'1px solid '+(montoMultasDia>0?'rgba(176,48,48,0.25)':'var(--border)'),borderRadius:10,padding:'10px 14px'}},
          React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',letterSpacing:0.5,textTransform:'uppercase',marginBottom:4}},'Multas detectadas hoy'),
          React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:22,color:montoMultasDia>0?'#b03030':'var(--text)'}},'$'+montoMultasDia.toLocaleString('es-CL'))),
        React.createElement('div',{style:{flex:'1 1 160px',background:'#fff',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px'}},
          React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',letterSpacing:0.5,textTransform:'uppercase',marginBottom:4}},'Costo del día (operador)'),
          React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:22,color:'var(--text)'}},'$'+costoDiarioOperador.toLocaleString('es-CL')))
      ),
      React.createElement('div',{style:{fontSize:12,fontWeight:600,padding:'8px 12px',borderRadius:8,background:seRecuperoCosto?'rgba(46,125,79,0.08)':'rgba(176,48,48,0.06)',color:seRecuperoCosto?'#2e7d4f':'#b03030'}},
        seRecuperoCosto
          ?'✓ El trabajo de hoy se pagó solo: lo detectado ($'+montoMultasDia.toLocaleString('es-CL')+') cubre el costo del día ($'+costoDiarioOperador.toLocaleString('es-CL')+').'
          :'⚠ Por debajo del costo del día: lo detectado ($'+montoMultasDia.toLocaleString('es-CL')+') no alcanza el costo del día ($'+costoDiarioOperador.toLocaleString('es-CL')+'). Faltan $'+Math.max(0,costoDiarioOperador-montoMultasDia).toLocaleString('es-CL')+'.'),
      React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginTop:6,fontStyle:'italic'}},'Calculado solo con las excepciones registradas en este reporte (Sección B). El puntaje de gravedad suma aunque no se haya multado; el monto en pesos solo cuenta multas efectivamente aplicadas.')
    ),

    soloLectura&&React.createElement('div',{style:{background:'rgba(46,125,79,0.08)',border:'1px solid rgba(46,125,79,0.3)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:12,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}},
      React.createElement('span',null,'🔒 Esta revisión ya fue cerrada'+(cerradoPor?' por '+cerradoPor:'')+(fechaHoraCierre?' el '+new Date(fechaHoraCierre).toLocaleString('es-CL'):'')+'. No se puede editar.'),
      esAdmin&&React.createElement('button',{className:'btn-secondary',onClick:reabrir},'🔓 Reabrir para editar')
    ),

    React.createElement('div',{className:'section-title',style:{fontSize:16,marginBottom:10}},'Datos generales'),
    React.createElement('div',{style:{display:'flex',gap:10,flexWrap:'wrap',marginBottom:20}},
      React.createElement('div',{style:{flex:'1 1 220px'}},
        React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Supervisor responsable'),
        React.createElement('input',{className:'form-input',value:supervisorResponsable,disabled:soloLectura,onChange:function(e){setSupervisorResponsable(e.target.value);}})),
      React.createElement('div',{style:{flex:'1 1 220px'}},
        React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Jefe / responsable de revisión'),
        React.createElement('input',{className:'form-input',value:jefeResponsable,disabled:soloLectura,onChange:function(e){setJefeResponsable(e.target.value);}}))
    ),

    React.createElement('div',{className:'section-title',style:{fontSize:16,marginBottom:10}},'A. Estado de la ruta por mensajero'),
    React.createElement(TablaDinamica,{columnas:COLS_ESTADO_RUTA,filas:estadoRuta,onChange:setEstadoRuta,soloLectura:soloLectura,vacioTexto:'Sin mensajeros cargados en este reporte.'}),
    React.createElement('div',{style:{fontSize:12,fontWeight:700,color:'var(--text-soft)',margin:'14px 0 8px'}},'Detalle de incidencias / piezas a gestionar'),
    React.createElement(TablaDinamica,{columnas:COLS_INCIDENCIAS,filas:incidencias,onChange:setIncidencias,soloLectura:soloLectura,vacioTexto:'Sin incidencias registradas.'}),

    React.createElement('div',{className:'section-title',style:{fontSize:16,margin:'22px 0 10px'}},'B. Firmas'),
    React.createElement(Checklist,{items:FIRMAS_CHECK_ITEMS,valores:firmasChecklist,onChange:setFirmasChecklist,soloLectura:soloLectura}),
    React.createElement('div',{style:{fontSize:12,fontWeight:700,color:'var(--text-soft)',margin:'14px 0 8px'}},'Excepciones detectadas'),
    React.createElement(TablaDinamica,{columnas:COLS_EXCEP_FIRMAS,filas:firmasExcepciones,onChange:setFirmasExcepciones,soloLectura:soloLectura,vacioTexto:'Sin excepciones de firma.'}),

    React.createElement('div',{className:'section-title',style:{fontSize:16,margin:'22px 0 10px'}},'C. Respaldos'),
    React.createElement(TablaDinamica,{columnas:COLS_RESPALDOS,filas:respaldos,onChange:setRespaldos,soloLectura:soloLectura,vacioTexto:'Sin respaldos observados.'}),
    React.createElement('div',{style:{fontSize:12,fontWeight:700,color:'var(--text-soft)',margin:'14px 0 8px'}},'Control general'),
    React.createElement(Checklist,{items:RESPALDOS_CHECK_ITEMS,valores:respaldosChecklist,onChange:setRespaldosChecklist,soloLectura:soloLectura}),

    React.createElement('div',{className:'section-title',style:{fontSize:16,margin:'22px 0 10px'}},'D. Pendientes para el día siguiente'),
    React.createElement(TablaDinamica,{columnas:COLS_PENDIENTES,filas:pendientes,onChange:setPendientes,soloLectura:soloLectura,vacioTexto:'Sin pendientes para mañana.'}),

    React.createElement('div',{className:'section-title',style:{fontSize:16,margin:'22px 0 10px'}},'E. Cierre de la revisión'),
    React.createElement('div',{style:{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12}},
      React.createElement('div',{style:{flex:'1 1 260px'}},
        React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Resultado de la revisión'),
        React.createElement('select',{className:'form-input',value:resultadoRevision,disabled:soloLectura,onChange:function(e){setResultadoRevision(e.target.value);}},
          React.createElement('option',{value:''},'Selecciona...'),
          RESULTADO_REVISION_OPTIONS.map(function(op){return React.createElement('option',{key:op,value:op},op);}))),
      React.createElement('div',{style:{flex:'0 0 auto'}},
        React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Fecha / hora de cierre'),
        React.createElement('div',{style:{fontSize:13,fontWeight:600,padding:'8px 0'}},fechaHoraCierre?new Date(fechaHoraCierre).toLocaleString('es-CL'):'— (se completa al cerrar)'))
    ),
    React.createElement('div',{style:{marginBottom:20}},
      React.createElement('label',{style:{fontSize:11,color:'var(--text-soft)',display:'block',marginBottom:4}},'Observaciones generales'),
      React.createElement('textarea',{className:'form-input',rows:3,style:{resize:'vertical'},value:observacionesGenerales,disabled:soloLectura,onChange:function(e){setObservacionesGenerales(e.target.value);}})),

    React.createElement('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
      !soloLectura&&React.createElement('button',{className:'btn-secondary',disabled:guardando,onClick:function(){guardar(false);}},guardando?'Guardando...':'💾 Guardar borrador'),
      !soloLectura&&React.createElement('button',{className:'btn-confirm',disabled:guardando,onClick:function(){guardar(true);}},guardando?'Guardando...':'🔒 Cerrar revisión'),
      reporteId&&React.createElement('button',{className:'btn-secondary',onClick:function(){exportarCierreHTML({fecha:fecha,turno:turno,supervisor_responsable:supervisorResponsable,jefe_responsable:jefeResponsable,estado_ruta:estadoRuta,incidencias:incidencias,firmas_checklist:firmasChecklist,firmas_excepciones:firmasExcepciones,respaldos:respaldos,respaldos_checklist:respaldosChecklist,pendientes:pendientes,resultado_revision:resultadoRevision,observaciones_generales:observacionesGenerales,fecha_hora_cierre:fechaHoraCierre,estado_reporte:estadoReporte,creado_por:creadoPor,cerrado_por:cerradoPor,ponderacion_economica:{puntosGravedadDia:puntosGravedadDia,montoMultasDia:montoMultasDia,costoDiarioOperador:costoDiarioOperador,seRecuperoCosto:seRecuperoCosto}});}},'⬇ Exportar a HTML')
    )
  );
}

// ══════════════════════════════════════════════════════════════════════════════════════
// Firmas en Vivo: vista en tiempo real (solo lectura) de la evidencia de entrega, con
// filtros por cliente/mensajero/período y exportación.
// ══════════════════════════════════════════════════════════════════════════════════════
function FirmasEnVivo(props){
  var clientes=props.clientes||[], mensajeros=props.mensajeros||[], toast=props.toast, usuario=props.usuario;
  var nombreUsuario=(usuario&&usuario.nombre)||'';

  var _clienteSel=useState(''), clienteSel=_clienteSel[0], setClienteSel=_clienteSel[1];
  var _mensajeroSel=useState(''), mensajeroSel=_mensajeroSel[0], setMensajeroSel=_mensajeroSel[1];
  var _estadoSel=useState(''), estadoSel=_estadoSel[0], setEstadoSel=_estadoSel[1];
  var _filtro=useState('hoy'), filtro=_filtro[0], setFiltro=_filtro[1];
  var _fechaDesde=useState(''), fechaDesde=_fechaDesde[0], setFechaDesde=_fechaDesde[1];
  var _fechaHasta=useState(''), fechaHasta=_fechaHasta[0], setFechaHasta=_fechaHasta[1];
  var _soloEvid=useState(true), soloConEvidencia=_soloEvid[0], setSoloConEvidencia=_soloEvid[1];
  var _busqueda=useState(''), busqueda=_busqueda[0], setBusqueda=_busqueda[1];
  var _envios=useState([]), envios=_envios[0], setEnvios=_envios[1];
  var _cargando=useState(false), cargando=_cargando[0], setCargando=_cargando[1];
  var _ultimaAct=useState(null), ultimaActualizacion=_ultimaAct[0], setUltimaActualizacion=_ultimaAct[1];
  var _zoomUrl=useState(null), zoomUrl=_zoomUrl[0], setZoomUrl=_zoomUrl[1];
  var _reportarEnvio=useState(null), reportarEnvio=_reportarEnvio[0], setReportarEnvio=_reportarEnvio[1];
  var _reportados=useState({}), reportados=_reportados[0], setReportados=_reportados[1];
  var _estadoCounts=useState({}), estadoCounts=_estadoCounts[0], setEstadoCounts=_estadoCounts[1];
  var _totalCounts=useState(0), totalCounts=_totalCounts[0], setTotalCounts=_totalCounts[1];
  var _cargandoConteos=useState(false), cargandoConteos=_cargandoConteos[0], setCargandoConteos=_cargandoConteos[1];

  // Conteo en vivo por estado para el mini dashboard/filtro de arriba. Va aparte de cargar()
  // porque cargar() trae como mucho 200 envíos (los más recientes, para las tarjetas con
  // fotos) y además ya viene filtrado por estadoSel — acá en cambio se pide, para CADA
  // estado, un conteo exacto (head:true = solo el número, no trae filas) respetando
  // cliente/mensajero/período pero NUNCA el estado, para poder mostrar "cuántos hay en cada
  // uno" al mismo tiempo. Barato aunque haya miles de envíos en el rango, porque head:true no
  // transfiere datos, solo el total.
  function cargarConteos(){
    var lim=limitesRango(filtro,fechaDesde,fechaHasta);
    if(filtro==='rango'&&(!lim.desde||!lim.hasta)){setEstadoCounts({});setTotalCounts(0);return;}
    setCargandoConteos(true);
    function base(){
      var q=db.from('envios').select('id',{count:'exact',head:true}).neq('estado','eliminado');
      if(lim.desde)q=q.gte('fecha',lim.desde);
      if(lim.hasta)q=q.lte('fecha',lim.hasta);
      if(clienteSel)q=q.eq('cliente',clienteSel);
      if(mensajeroSel)q=q.eq('mensajero',mensajeroSel);
      return q;
    }
    var pedidos=ESTADOS_ENVIO.map(function(es){
      return base().eq('estado',es.val).then(function(r){return{val:es.val,count:r.count||0};});
    });
    pedidos.push(base().then(function(r){return{val:'__total',count:r.count||0};}));
    Promise.all(pedidos).then(function(resultados){
      var mapa={},tot=0;
      resultados.forEach(function(r){if(r.val==='__total')tot=r.count;else mapa[r.val]=r.count;});
      setEstadoCounts(mapa);setTotalCounts(tot);setCargandoConteos(false);
    }).catch(function(){setCargandoConteos(false);});
  }
  useEffect(function(){cargarConteos();},[clienteSel,mensajeroSel,filtro,fechaDesde,fechaHasta]);
  useEffect(function(){
    var iv=setInterval(cargarConteos,25000);
    return function(){clearInterval(iv);};
  },[clienteSel,mensajeroSel,filtro,fechaDesde,fechaHasta]);

  function cargar(){
    var lim=limitesRango(filtro,fechaDesde,fechaHasta);
    if(filtro==='rango'&&(!lim.desde||!lim.hasta)){setEnvios([]);return;}
    setCargando(true);
    var q=db.from('envios').select('codigo,cliente,destinatario,direccion,comuna,mensajero,estado,fecha,updated_at,foto_etiqueta,fotos_entrega');
    if(lim.desde)q=q.gte('fecha',lim.desde);
    if(lim.hasta)q=q.lte('fecha',lim.hasta);
    if(clienteSel)q=q.eq('cliente',clienteSel);
    if(mensajeroSel)q=q.eq('mensajero',mensajeroSel);
    if(estadoSel)q=q.eq('estado',estadoSel);
    q.order('updated_at',{ascending:false}).limit(200).then(function(r){
      setEnvios((r&&r.data)||[]);setCargando(false);setUltimaActualizacion(new Date());
    }).catch(function(){setCargando(false);toast&&toast('⚠ Error cargando envíos');});
  }
  useEffect(function(){cargar();},[clienteSel,mensajeroSel,estadoSel,filtro,fechaDesde,fechaHasta]);
  // "En vivo": se refresca sola cada 25s mientras esta pestaña está abierta (además del
  // botón "Actualizar" manual). Es de solo lectura, así que no hay riesgo de pisar cambios.
  useEffect(function(){
    var iv=setInterval(cargar,25000);
    return function(){clearInterval(iv);};
  },[clienteSel,mensajeroSel,estadoSel,filtro,fechaDesde,fechaHasta]);

  var filtrados=useMemo(function(){
    var q=busqueda.trim().toLowerCase();
    return envios.filter(function(e){
      if(soloConEvidencia&&!tieneFotoEntrega(e.fotos_entrega)&&!e.foto_etiqueta)return false;
      if(!q)return true;
      return (e.codigo||'').toLowerCase().indexOf(q)!==-1||(e.destinatario||'').toLowerCase().indexOf(q)!==-1;
    });
  },[envios,busqueda,soloConEvidencia]);

  var lim=limitesRango(filtro,fechaDesde,fechaHasta);
  var btnStyle=function(active){return{padding:'6px 16px',borderRadius:8,border:'1px solid '+(active?'var(--gold)':'var(--border)'),background:active?'rgba(200,168,75,0.12)':'#fff',color:active?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer'};};

  return React.createElement('div',null,
    React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:12}},
      React.createElement('select',{className:'form-input',style:{maxWidth:220,padding:'7px 10px'},value:clienteSel,onChange:function(e){setClienteSel(e.target.value);}},
        React.createElement('option',{value:''},'Todos los clientes'),
        clientes.map(function(c){return React.createElement('option',{key:c.id||c.nombre,value:c.nombre},c.nombre);})),
      React.createElement('select',{className:'form-input',style:{maxWidth:220,padding:'7px 10px'},value:mensajeroSel,onChange:function(e){setMensajeroSel(e.target.value);}},
        React.createElement('option',{value:''},'Todos los mensajeros'),
        mensajeros.map(function(m){return React.createElement('option',{key:m.id||m.nombre,value:m.nombre},(m.nombre||'').replace(/,\s*/g,' '));})),
      React.createElement('select',{className:'form-input',style:{maxWidth:180,padding:'7px 10px'},value:estadoSel,onChange:function(e){setEstadoSel(e.target.value);}},
        React.createElement('option',{value:''},'Todos los estados'),
        ESTADOS_ENVIO.map(function(es){return React.createElement('option',{key:es.val,value:es.val},es.label);})),
      React.createElement('input',{className:'form-input',style:{maxWidth:220,padding:'7px 10px'},placeholder:'🔍 Buscar código o destinatario...',value:busqueda,onChange:function(e){setBusqueda(e.target.value);}})
    ),

    // ── MINI DASHBOARD / FILTRO POR ESTADO ── mismo estilo (.stat-card) que el Dashboard
    // principal, en tamaño reducido: cada tarjeta muestra el conteo en vivo de ese estado
    // (respetando cliente/mensajero/período elegidos arriba, no busqueda ni "solo con
    // evidencia" — esos dos son para acotar las tarjetas de abajo, no el panorama general) y
    // funciona como filtro: un clic selecciona ese estado (se sincroniza con el selector de
    // arriba), y un clic sobre el que ya está activo lo quita y vuelve a "Todos".
    React.createElement('div',{style:{marginBottom:16}},
      React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8,marginBottom:8}},
        React.createElement('span',{style:{fontFamily:'Bebas Neue',fontSize:12,letterSpacing:1.5,color:'var(--text-soft)'}},'📊 CONTEO EN VIVO POR ESTADO'),
        cargandoConteos&&React.createElement('span',{style:{fontSize:10,color:'var(--text-soft)'}},'actualizando…')
      ),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(80px,1fr))',gap:8}},
        EstadoStatTile('Todos','',totalCounts,totalCounts,'#C8A84B','rgba(200,168,75,0.15)','gold',estadoSel==='',false,function(){setEstadoSel('');}),
        ESTADOS_ENVIO.map(function(es){
          return EstadoStatTile(es.label,es.val,estadoCounts[es.val]||0,totalCounts,es.color,es.bg,ESTADO_VALUE_CLASS[es.val]||'gold',estadoSel===es.val,ESTADOS_CRITICOS.indexOf(es.val)!==-1,function(){setEstadoSel(estadoSel===es.val?'':es.val);});
        })
      )
    ),

    React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:18}},
      React.createElement('button',{style:btnStyle(filtro==='hoy'),onClick:function(){setFiltro('hoy');}},'Hoy'),
      React.createElement('button',{style:btnStyle(filtro==='semana'),onClick:function(){setFiltro('semana');}},'Esta semana'),
      React.createElement('button',{style:btnStyle(filtro==='mes'),onClick:function(){setFiltro('mes');}},'Este mes'),
      React.createElement('button',{style:btnStyle(filtro==='rango'),onClick:function(){setFiltro('rango');}},'Rango'),
      filtro==='rango'&&React.createElement(React.Fragment,null,
        React.createElement('input',{type:'date',value:fechaDesde,onChange:function(e){setFechaDesde(e.target.value);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12}}),
        React.createElement('span',{style:{color:'var(--text-soft)',fontSize:12}},'al'),
        React.createElement('input',{type:'date',value:fechaHasta,onChange:function(e){setFechaHasta(e.target.value);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12}})
      ),
      React.createElement('label',{style:{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text-soft)',cursor:'pointer'}},
        React.createElement('input',{type:'checkbox',checked:soloConEvidencia,onChange:function(e){setSoloConEvidencia(e.target.checked);}}),'Solo con evidencia cargada'),
      React.createElement('button',{className:'btn-secondary',disabled:cargando,onClick:cargar},cargando?'Actualizando...':'↺ Actualizar'),
      ultimaActualizacion&&React.createElement('span',{style:{fontSize:10,color:'var(--text-soft)'}},'Datos al '+ultimaActualizacion.toLocaleTimeString('es-CL')),
      React.createElement('button',{className:'btn-secondary',style:{marginLeft:'auto'},onClick:function(){exportarFirmasVivoHTML(filtrados,periodoLabelTexto(filtro,lim));}},'⬇ Exportar a HTML')
    ),

    cargando&&envios.length===0&&React.createElement('div',{style:{textAlign:'center',padding:'40px 20px',color:'var(--text-soft)'}},'Cargando envíos...'),
    !cargando&&filtrados.length===0&&React.createElement('div',{style:{textAlign:'center',padding:'40px 20px',color:'var(--text-soft)'}},'No hay envíos que coincidan con los filtros.'),

    React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}},
      filtrados.map(function(e){
        var fotos=parsearFotos(e.fotos_entrega);
        var todas=(e.foto_etiqueta?[{url:e.foto_etiqueta}]:[]).concat(fotos);
        return React.createElement('div',{key:e.codigo,style:{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:12,boxShadow:'2px 2px 8px rgba(43,46,32,0.06)'}},
          React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6,gap:8}},
            React.createElement('span',{style:{fontFamily:'JetBrains Mono',fontWeight:700,fontSize:12}},e.codigo),
            estadoBadge(e.estado)),
          React.createElement('div',{style:{fontSize:12,fontWeight:700,marginBottom:2}},e.cliente||'—'),
          React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',marginBottom:2}},e.destinatario||'—'),
          // Mensajero y comuna como chips de color (antes era una línea de texto gris, igual
          // que el destinatario de arriba, y costaba distinguir a simple vista quién es el
          // cliente final vs. quién es el mensajero/dónde entrega) — dorado = persona
          // (mensajero), teal = lugar (comuna), consistente con los acentos que ya usa el
          // resto de la app para esos mismos roles.
          React.createElement('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}},
            React.createElement('span',{style:{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:'#a87d2a',background:'rgba(200,168,75,0.14)',padding:'3px 8px',borderRadius:20}},'🏍 '+(e.mensajero||'Sin asignar').replace(/,\s*/g,' ')),
            React.createElement('span',{style:{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,color:'#1a6b8a',background:'rgba(26,107,138,0.1)',padding:'3px 8px',borderRadius:20}},'🏘 '+(e.comuna||'—'))
          ),
          todas.length>0?
            React.createElement('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},
              todas.slice(0,6).map(function(f,i){
                return React.createElement(FotoThumb,{key:i,url:f.url,onClick:function(){setZoomUrl(f.url);}});
              }),
              todas.length>6&&React.createElement('div',{style:{width:56,height:56,borderRadius:6,border:'1px dashed var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'var(--text-soft)'}},'+'+(todas.length-6))
            ):
            React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',fontStyle:'italic'}},'Sin evidencia cargada'),
          React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8,gap:8}},
            React.createElement('span',{style:{fontSize:10,color:'var(--text-soft)'}},'Actualizado '+(e.updated_at?new Date(e.updated_at).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—')),
            reportados[e.codigo]?
              React.createElement('span',{style:{fontSize:10,fontWeight:700,color:'#2e7d4f'}},'✓ Reportado'):
              React.createElement('button',{onClick:function(){setReportarEnvio(e);},style:{padding:'3px 10px',borderRadius:6,border:'1px solid rgba(176,48,48,0.3)',background:'rgba(176,48,48,0.06)',color:'#b03030',fontWeight:700,fontSize:10,cursor:'pointer',whiteSpace:'nowrap'}},'⚠ Reportar'))
        );
      })
    ),
    zoomUrl&&React.createElement(Lightbox,{url:zoomUrl,onClose:function(){setZoomUrl(null);}}),
    reportarEnvio&&React.createElement(ReportarModal,{
      envio:reportarEnvio,toast:toast,nombreUsuario:nombreUsuario,
      onClose:function(){setReportarEnvio(null);},
      onDone:function(){setReportados(function(prev){var n=Object.assign({},prev);n[reportarEnvio.codigo]=true;return n;});}
    })
  );
}

// ══════════════════════════════════════════════════════════════════════════════════════
// Raíz del módulo: sub-navegación entre "Cierre Diario" y "Firmas en Vivo".
// ══════════════════════════════════════════════════════════════════════════════════════
function Operaciones(props){
  var puedeVerCierre=props.puedeVerCierre!==false, puedeVerFirmasVivo=props.puedeVerFirmasVivo!==false;
  var _sub=useState(function(){return puedeVerCierre?'cierre':'firmas-vivo';}), subTab=_sub[0], setSubTab=_sub[1];
  var chipStyle=function(active){return active?{background:'rgba(200,168,75,0.18)',borderColor:'var(--gold)',color:'var(--gold)'}:undefined;};
  return React.createElement('div',null,
    React.createElement('div',{className:'section-head'},
      React.createElement('div',{className:'section-title'},'Operaciones'),
      React.createElement('div',{style:{display:'flex',gap:8}},
        puedeVerCierre&&React.createElement('button',{className:'btn-secondary',style:chipStyle(subTab==='cierre'),onClick:function(){setSubTab('cierre');}},'📋 Cierre Diario'),
        puedeVerFirmasVivo&&React.createElement('button',{className:'btn-secondary',style:chipStyle(subTab==='firmas-vivo'),onClick:function(){setSubTab('firmas-vivo');}},'🖼 Firmas en Vivo')
      )
    ),
    subTab==='cierre'&&puedeVerCierre&&React.createElement(CierreDiario,props),
    subTab==='firmas-vivo'&&puedeVerFirmasVivo&&React.createElement(FirmasEnVivo,props),
    !puedeVerCierre&&!puedeVerFirmasVivo&&React.createElement('div',{style:{textAlign:'center',padding:'40px 20px',color:'var(--text-soft)'}},'No tienes acceso a ninguna subsección de Operaciones. Pídele a un administrador que te habilite el permiso desde Permisos.')
  );
}

window.Operaciones=Operaciones;
})();
