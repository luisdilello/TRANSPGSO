(function(){
var useState=React.useState, useEffect=React.useEffect, useMemo=React.useMemo;
var db=window.__app.db;
var estadoInfo=window.__app.estadoInfo, ESTADOS_ENVIO=window.__app.ESTADOS_ENVIO;
var esEnvioAtrasado=window.__app.esEnvioAtrasado, diasDesdeFecha=window.__app.diasDesdeFecha;
var UMBRAL_ATRASO_DIAS=window.__app.UMBRAL_ATRASO_DIAS, KpiBar=window.__app.KpiBar, fmt=window.__app.fmt;
var exportToExcel=window.__app.exportToExcel;
var Modal=window.__app.Modal, FotosEntregaConRecarga=window.__app.FotosEntregaConRecarga, estadoBadge=window.__app.estadoBadge;
var fechaHoyCL=window.__app.fechaHoyCL;
var fetchEntregadosPorFechaReal=window.__app.fetchEntregadosPorFechaReal;

// Igual que canalInfo() en gestion-envios.js -- identifica el canal que registró cada
// entrada del historial (app del mensajero, panel admin, portal cliente o sistema).
function canalInfo(canal){
  if(canal==='app_mensajero')return{label:'📱 App Mensajero',bg:'rgba(46,125,79,0.12)',color:'#2e7d4f'};
  if(canal==='panel_admin')return{label:'🖥 Panel Admin',bg:'rgba(27,58,107,0.12)',color:'#1B3A6B'};
  if(canal==='cliente')return{label:'🌐 Cliente',bg:'rgba(200,168,75,0.15)',color:'#a0842a'};
  return{label:'⚙ Sistema',bg:'rgba(122,125,106,0.12)',color:'#7a7d6a'};
}

// ========================================================================
// Helpers compartidos (fechas, nombres, filtros de rango)
// ========================================================================
function normNombreLocal(s){ return (s||'').replace(/,\s*/g,' ').replace(/\s+/g,' ').trim().toLowerCase(); }
function nombreCanonico(s){ return (s||'').replace(/,/g,'').replace(/\s+/g,' ').trim(); }
function inicioDia(d){var x=new Date(d);x.setHours(0,0,0,0);return x;}
function finDia(d){var x=new Date(d);x.setHours(23,59,59,999);return x;}
function lunesDe(d){var x=new Date(d);x.setDate(x.getDate()-((x.getDay()+6)%7));x.setHours(0,0,0,0);return x;}
function filtrarPorRango(envios, filtro, fechaDesde, fechaHasta){
  var hoy=new Date();
  var ayer=new Date(hoy); ayer.setDate(ayer.getDate()-1);
  return envios.filter(function(e){
    var f=new Date((e.fecha||'')+'T12:00:00');
    if(isNaN(f.getTime()))f=new Date(e.fecha||hoy);
    if(filtro==='hoy'){return f>=inicioDia(hoy)&&f<=finDia(hoy);}
    if(filtro==='ayer'){return f>=inicioDia(ayer)&&f<=finDia(ayer);}
    if(filtro==='semana'){return f>=lunesDe(hoy);}
    if(filtro==='mes'){return f>=new Date(hoy.getFullYear(),hoy.getMonth(),1);}
    // 'personalizado' (Rango): antes, si faltaba alguna de las dos fechas, caia en el
    // 'return true' de mas abajo y mostraba TODO el historico sin avisar -- parecia que el
    // filtro traia fechas que el usuario no habia indicado. Ahora exige AMBAS fechas: mientras
    // no esten las dos elegidas, no muestra nada (en vez de mostrar de mas).
    if(filtro==='personalizado'){return !!fechaDesde&&!!fechaHasta&&f>=new Date(fechaDesde+'T00:00:00')&&f<=new Date(fechaHasta+'T23:59:59');}
    return true; // 'todo'
  });
}
function tieneFotoEntrega(raw){
  if(!raw)return false;
  try{
    var parsed=typeof raw==='string'?JSON.parse(raw):raw;
    if(!Array.isArray(parsed)||parsed.length===0)return false;
    if(typeof parsed[0]==='string')return true; // formato viejo: array plano de URLs
    return parsed.some(function(it){return it&&Array.isArray(it.fotos)&&it.fotos.length>0;});
  }catch(e){return false;}
}
function fmtHora(iso){try{return new Date(iso).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});}catch(e){return '—';}}
// created_at viene en UTC (ej. "...T00:30:00+00:00"). Una entrega hecha a las 20:30 hora de Chile
// queda guardada como 00:30 UTC del dia SIGUIENTE -- si se usara el string UTC tal cual (slice(0,10))
// para agrupar "por dia" o comparar contra la fecha de recepcion, cualquier entrega de tarde/noche
// (la mayoria) caeria en el dia equivocado. Esta funcion convierte a la fecha LOCAL real.
// Antes calculaba año/mes/día con getFullYear()/getMonth()/getDate(), que dependen de la zona
// horaria del dispositivo que mira la pantalla, no de Chile -- mismo problema que tenía
// fechaHoyCL en index.html (ver su comentario ahí): un evento ocurrido despues de las 20:00
// hora de Chile podia contarse en el dia SIGUIENTE si el dispositivo tenia el reloj en UTC.
// Ahora delega en fechaHoyCL, que ya fuerza America/Santiago sin importar el dispositivo.
function diaLocalDe(iso){try{if(!iso)return '';var d=new Date(iso);if(isNaN(d.getTime()))return '';return fechaHoyCL(d);}catch(e){return '';}}
// Formatea la fecha 'YYYY-MM-DD' de una ruta/turno a texto corto legible (dd/mm).
function fmtDiaCorto(dia){try{var p=(dia||'').split('-');if(p.length!==3)return dia||'—';return p[2]+'/'+p[1];}catch(e){return dia||'—';}}
function fmtHoras(h){if(h==null||!isFinite(h))return '—';if(h<1)return Math.round(h*60)+' min';return h.toFixed(1)+' h';}
function fmtMin(m){if(m==null||!isFinite(m))return '—';if(m<60)return Math.round(m)+' min';return (m/60).toFixed(1)+' h';}
// Regla unica de color para "efectividad" en toda Analitica: bajo 95% siempre rojo (antes habia
// una zona intermedia amarilla 60-80% que ocultaba problemas reales de efectividad).
function badgeColor(pct){return pct>=95?'var(--success)':'var(--danger)';}

// ========================================================================
// Mini gráfico de línea con hover (tendencia diaria / sparkline por mensajero)
// ========================================================================
function MiniLineChart(props){
  var data=props.data||[];
  var width=props.width||560, height=props.height||110, color=props.color||'#C8A84B';
  var valueFmt=props.valueFmt||function(v){return String(v);};
  var compact=!!props.compact;
  var _hov=useState(null), hoverIdx=_hov[0], setHoverIdx=_hov[1];
  var padding=compact?{t:6,r:4,b:6,l:4}:{t:10,r:10,b:10,l:10};
  var innerW=width-padding.l-padding.r, innerH=height-padding.t-padding.b;
  if(data.length===0){
    return React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',padding:'20px 0',textAlign:'center'}},'Sin datos suficientes');
  }
  var maxY=Math.max.apply(null,data.map(function(d){return d.y;}).concat([1]));
  function xAt(i){return padding.l+(data.length<=1?innerW/2:(i/(data.length-1))*innerW);}
  function yAt(v){return padding.t+innerH-(v/(maxY||1))*innerH;}
  var pathD=data.map(function(d,i){return (i===0?'M':'L')+xAt(i).toFixed(1)+' '+yAt(d.y).toFixed(1);}).join(' ');
  var areaD=pathD+' L'+xAt(data.length-1).toFixed(1)+' '+(padding.t+innerH)+' L'+xAt(0).toFixed(1)+' '+(padding.t+innerH)+' Z';
  function handleMove(ev){
    var rect=ev.currentTarget.getBoundingClientRect();
    var relX=(ev.clientX-rect.left)/rect.width*width;
    var ratio=Math.min(Math.max((relX-padding.l)/(innerW||1),0),1);
    var idx=Math.round(ratio*(data.length-1));
    setHoverIdx(idx);
  }
  var hov=hoverIdx!=null?data[hoverIdx]:null;
  var tipLeft=hoverIdx!=null?Math.min(Math.max(xAt(hoverIdx)-42,0),width-84):0;
  return React.createElement('div',{style:{position:'relative'}},
    React.createElement('svg',{width:'100%',viewBox:'0 0 '+width+' '+height,preserveAspectRatio:'none',style:{display:'block',overflow:'visible',cursor:'crosshair'},
      onMouseMove:handleMove, onMouseLeave:function(){setHoverIdx(null);}},
      React.createElement('path',{d:areaD,fill:color,opacity:0.12,stroke:'none'}),
      React.createElement('path',{d:pathD,fill:'none',stroke:color,strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'}),
      hov&&React.createElement('line',{x1:xAt(hoverIdx),x2:xAt(hoverIdx),y1:padding.t,y2:padding.t+innerH,stroke:color,strokeWidth:1,opacity:0.3}),
      hov&&React.createElement('circle',{cx:xAt(hoverIdx),cy:yAt(hov.y),r:compact?3:4,fill:color,stroke:'#fff',strokeWidth:1.5})
    ),
    hov&&React.createElement('div',{style:{position:'absolute',left:tipLeft,top:-4,transform:'translateY(-100%)',background:'var(--dark)',color:'#fff',fontSize:10,padding:'4px 8px',borderRadius:6,pointerEvents:'none',whiteSpace:'nowrap',fontFamily:'JetBrains Mono',zIndex:5}},
      (hov.label||hov.x)+': ', React.createElement('strong',null,valueFmt(hov.y))
    )
  );
}

// ========================================================================
// Cálculo de KPI por mensajero
// ========================================================================
function calcularKpiPorMensajero(enviosPeriodo, historial, mensajerosRoster, historialDisponible){
  var rosterActivo=mensajerosRoster.filter(function(m){return m.activo;});
  var rosterNorm={};
  rosterActivo.forEach(function(m){rosterNorm[normNombreLocal(m.nombre)]=m.nombre;});
  var nombresSet={};
  rosterActivo.forEach(function(m){nombresSet[normNombreLocal(m.nombre)]=m.nombre;});
  enviosPeriodo.forEach(function(e){
    var n=nombreCanonico(e.mensajero);
    if(!n)return;
    var k=normNombreLocal(n);
    if(!nombresSet[k])nombresSet[k]=n;
  });
  var histPorCodigo={};
  if(historialDisponible){
    historial.forEach(function(h){(histPorCodigo[h.codigo_envio]=histPorCodigo[h.codigo_envio]||[]).push(h);});
    Object.keys(histPorCodigo).forEach(function(c){histPorCodigo[c].sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at);});});
  }
  return Object.keys(nombresSet).map(function(norm){
    var nombre=nombresSet[norm];
    var enRosterActivo=!!rosterNorm[norm];
    var propios=enviosPeriodo.filter(function(e){return normNombreLocal(e.mensajero)===norm;});
    var total=propios.length;
    var porEstado={};
    ESTADOS_ENVIO.forEach(function(es){porEstado[es.val]=0;});
    propios.forEach(function(e){if(porEstado[e.estado]!=null)porEstado[e.estado]++;});
    var entregados=porEstado.entregado||0;
    var falla=(porEstado.reprogramado||0)+(porEstado.cancelado||0)+(porEstado.retorno||0);
    var efectividad=total>0?Math.round(entregados/total*100):0;
    var tasaFalla=total>0?Math.round(falla/total*100):0;
    var montoCobrado=propios.filter(function(e){return e.estado==='entregado';}).reduce(function(a,e){return a+(e.monto||0);},0);
    var montoPendiente=propios.filter(function(e){return e.estado==='en_ruta'||e.estado==='reprogramado';}).reduce(function(a,e){return a+(e.monto||0);},0);
    var comunas=new Set(propios.map(function(e){return (e.comuna||'').trim();}).filter(Boolean));
    var atrasados=propios.filter(function(e){return esEnvioAtrasado(e);}).length;
    // Pendientes atrasados: a diferencia de "atrasados" (arriba, que solo mira 'en_ruta' -- el
    // criterio historico usado en Gestion de Envios), esta lista es mas amplia: CUALQUIER paquete
    // de este mensajero que todavia no llega al cliente (en bodega, en ruta o reprogramado, es
    // decir, no entregado/cancelado/retorno/siniestro) y ya lleva UMBRAL_ATRASO_DIAS o mas dias
    // desde su fecha de RECEPCION sin entregarse -- para que se note el desfase (ej. recibido el
    // sabado y todavia sin entregar el martes), sin importar si ya salio a reparto o ni siquiera
    // ha salido de bodega. No depende del historial detallado, asi que esta disponible siempre.
    var ESTADOS_PENDIENTES_ENTREGA={en_bodega:true,en_ruta:true,reprogramado:true};
    var pendientesAtrasados=propios.filter(function(e){
      return ESTADOS_PENDIENTES_ENTREGA[e.estado]&&diasDesdeFecha(e.fecha)>=UMBRAL_ATRASO_DIAS;
    }).map(function(e){
      return{codigo:e.codigo,cliente:e.cliente,comuna:e.comuna,estado:e.estado,fecha:e.fecha,dias:diasDesdeFecha(e.fecha)};
    }).sort(function(a,b){return b.dias-a.dias;});
    var entregadosArr=propios.filter(function(e){return e.estado==='entregado';});
    var conFoto=entregadosArr.filter(function(e){return tieneFotoEntrega(e.fotos_entrega);}).length;
    var conNota=propios.filter(function(e){return (e.nota||'').trim().length>0;}).length;
    var pctFoto=entregadosArr.length>0?Math.round(conFoto/entregadosArr.length*100):null;
    var pctNota=total>0?Math.round(conNota/total*100):null;

    var reintentos=null, correccionesAdmin=null, rutas=null, horasActivas=null, ritmo=null, duracionRepartoProm=null, entregasConAtraso=null;
    if(historialDisponible){
      reintentos=0; correccionesAdmin=0;
      propios.forEach(function(e){
        var hs=histPorCodigo[e.codigo]||[];
        var enRutaCount=hs.filter(function(h){return h.estado==='en_ruta';}).length;
        if(enRutaCount>1)reintentos+=(enRutaCount-1);
        hs.forEach(function(h){if((h.nota||'').indexOf('Revertido desde')!==-1)correccionesAdmin++;});
      });
      // Deteccion de TURNOS: mensajeros que reparten en 2 tandas (ej. manana y tarde con una pausa
      // larga entre medio) antes contaban como "horas activas" el rango COMPLETO entre su primera y
      // su ultima accion del periodo, incluyendo la pausa -- eso inflaba las horas activas y por lo
      // tanto distorsionaba (hacia mas lento de lo real) el ritmo de entregas/h. Ahora se agrupan las
      // acciones por dia y se cortan en "turnos" cuando hay un hueco sin actividad de mas de 2.5h;
      // las horas activas son la SUMA de la duracion de cada turno, no el rango completo.
      var UMBRAL_GAP_TURNO_MS=150*60000; // 2.5h sin actividad = corte de turno (evita partir un turno lento/disperso por error)
      var historialDelRider=historial.filter(function(h){return h.canal==='app_mensajero'&&normNombreLocal(h.usuario)===norm;});
      var turnosRider=[]; // {dia, inicio, fin} — bloques de actividad continua del mensajero
      if(historialDelRider.length>0){
        var porDiaRider={};
        historialDelRider.forEach(function(h){
          var t=new Date(h.created_at).getTime();
          var dia=diaLocalDe(h.created_at);
          (porDiaRider[dia]=porDiaRider[dia]||[]).push(t);
        });
        Object.keys(porDiaRider).forEach(function(dia){
          var ts=porDiaRider[dia].sort(function(a,b){return a-b;});
          var turnoIni=ts[0],turnoFin=ts[0];
          for(var i=1;i<ts.length;i++){
            if(ts[i]-turnoFin>UMBRAL_GAP_TURNO_MS){
              turnosRider.push({dia:dia,inicio:turnoIni,fin:turnoFin});
              turnoIni=ts[i];
            }
            turnoFin=ts[i];
          }
          turnosRider.push({dia:dia,inicio:turnoIni,fin:turnoFin});
        });
        horasActivas=turnosRider.reduce(function(a,t){return a+(t.fin-t.inicio)/3600000;},0);
        if(horasActivas>0.15&&entregados>0)ritmo=entregados/horasActivas;
        // Rutas concretas: antes se promediaba (en minutos desde medianoche) la hora de inicio y de
        // termino entre todos los dias del periodo -- eso dejaba que una sola accion aislada (ej. 1
        // entrega suelta en la manana un dia distinto) distorsionara el numero mostrado, dando a
        // entender una "ruta" que no era representativa. Ahora se expone cada turno detectado como
        // una fila propia: dia, hora de inicio, hora de termino, duracion y piezas entregadas en ese
        // turno puntual -- datos concretos por ruta, no un promedio.
        rutas=turnosRider.map(function(t){
          var entregasTurno=entregadosArr.filter(function(e){
            var hs=histPorCodigo[e.codigo]||[];
            var entregadoEv=hs.find(function(h){return h.estado==='entregado';});
            if(!entregadoEv)return false;
            var tEnt=new Date(entregadoEv.created_at).getTime();
            return tEnt>=t.inicio&&tEnt<=t.fin;
          }).length;
          return{dia:t.dia,inicio:t.inicio,fin:t.fin,duracionH:(t.fin-t.inicio)/3600000,entregas:entregasTurno};
        }).sort(function(a,b){return a.inicio-b.inicio;});
      }
      var turnoDe=function(ts){
        for(var j=0;j<turnosRider.length;j++){if(ts>=turnosRider[j].inicio&&ts<=turnosRider[j].fin)return turnosRider[j];}
        return null;
      };
      var deltas=[];
      entregadosArr.forEach(function(e){
        var hs=histPorCodigo[e.codigo]||[];
        var enRutaEv=hs.find(function(h){return h.estado==='en_ruta';});
        var entregadoEv=hs.find(function(h){return h.estado==='entregado';});
        if(enRutaEv&&entregadoEv){
          var tEnRuta=new Date(enRutaEv.created_at).getTime(),tEntregado=new Date(entregadoEv.created_at).getTime();
          var delta=(tEntregado-tEnRuta)/60000;
          // Descarta el delta si cruza un hueco de turno del mensajero (pausa entre 2 tandas): si no,
          // un paquete que quedo en el vehiculo durante la pausa infla la duracion promedio de reparto.
          var turnoIni=turnoDe(tEnRuta);
          var cruzaHueco=turnoIni?tEntregado>turnoIni.fin:false;
          if(delta>0&&delta<1080&&!cruzaHueco)deltas.push(delta);
        }
      });
      if(deltas.length>0)duracionRepartoProm=deltas.reduce(function(a,b){return a+b;},0)/deltas.length;

      // Piezas entregadas cuya fecha de ENTREGA (real, segun historial) es DISTINTA a su fecha de
      // RECEPCION (e.fecha) -- es decir, la pieza llego un dia y se entrego en otro (no el mismo).
      entregasConAtraso=[];
      entregadosArr.forEach(function(e){
        var hs=histPorCodigo[e.codigo]||[];
        var entregadoEv=hs.find(function(h){return h.estado==='entregado';});
        if(!entregadoEv)return;
        var fechaEntrega=diaLocalDe(entregadoEv.created_at);
        var fechaRecepcion=(e.fecha||'').slice(0,10);
        if(fechaEntrega&&fechaRecepcion&&fechaEntrega!==fechaRecepcion){
          var dias=Math.abs(Math.round((new Date(fechaEntrega+'T12:00:00')-new Date(fechaRecepcion+'T12:00:00'))/86400000));
          entregasConAtraso.push({codigo:e.codigo,cliente:e.cliente,comuna:e.comuna,fechaRecepcion:fechaRecepcion,fechaEntrega:fechaEntrega,diasAtraso:dias});
        }
      });
      entregasConAtraso.sort(function(a,b){return b.diasAtraso-a.diasAtraso;});
    }

    return{
      nombre:nombre, norm:norm, enRosterActivo:enRosterActivo,
      total:total, entregados:entregados, porEstado:porEstado, efectividad:efectividad, tasaFalla:tasaFalla,
      montoCobrado:montoCobrado, montoPendiente:montoPendiente, comunas:comunas.size,
      atrasados:atrasados, pendientesAtrasados:pendientesAtrasados, pctFoto:pctFoto, pctNota:pctNota,
      reintentos:reintentos, correccionesAdmin:correccionesAdmin,
      rutas:rutas, horasActivas:horasActivas, ritmo:ritmo,
      duracionRepartoProm:duracionRepartoProm, entregasConAtraso:entregasConAtraso,
      propios:propios
    };
  }).sort(function(a,b){
    if((a.total>0)!==(b.total>0))return a.total>0?-1:1;
    if(b.efectividad!==a.efectividad)return b.efectividad-a.efectividad;
    return b.total-a.total;
  });
}

// ========================================================================
// Componente principal
// ========================================================================
function Analitica(){
  // Antes esta pantalla leia de localStorage('gestion_envios'), una copia que solo
  // se mantiene al dia si el navegador visito la pantalla de Gestion de Envios
  // recientemente. Si el admin entraba directo a Analitica (otro dispositivo, cache
  // vacio/viejo, incognito) los KPIs podian salir en cero o desactualizados sin
  // ningun aviso. Ahora se trae directo de Supabase, paginado, al entrar y con
  // boton de actualizar manual.
  var _en=useState([]),envios=_en[0],setEnvios=_en[1];
  var _cg=useState(true),cargando=_cg[0],setCargando=_cg[1];
  var _ua=useState(null),ultimaActualizacion=_ua[0],setUltimaActualizacion=_ua[1];
  function cargarEnvios(){
    setCargando(true);
    (async function(){
      try{
        var COLS='id,codigo,cliente,comuna,fecha,estado,mensajero,monto,nota,fotos_entrega,created_at,updated_at';
        var rows=[];
        // Acotado al periodo activo de la pestaña visible (Resumen o KPI Mensajeros) -- antes se
        // traia SIEMPRE la tabla completa de envios sin filtro de fecha, sin importar el periodo
        // que se estuviera viendo (mismo problema que ya se habia corregido en Gestion de Envios).
        // Ver limitesPeriodoAnalitica() mas abajo.
        var lim=limitesPeriodoAnalitica();
        // La compuerta de "Rango sin ambas fechas -> no traer nada" solo aplica en Resumen: en
        // KPI Mensajeros 'lim' siempre trae la ventana de 12 meses (ver limitesPeriodoAnalitica),
        // el 'kpiFiltro' puntual se sigue aplicando despues en el navegador via filtrarPorRango.
        if(subTab==='resumen'&&filtro==='personalizado'&&(!lim.desde||!lim.hasta)){
          // Igual que en Gestion de Envios: mientras no esten elegidas ambas fechas del Rango,
          // no se trae nada (antes caia en el fallback sin filtro y traia todo el historico).
          setEnvios([]);setUltimaActualizacion(new Date());setCargando(false);return;
        }
        // Paginado por cursor de 'id' (igual que el resto del sistema, ver fetchPaginadoParalelo
        // en index.html) en vez de .range(offset,...): con range/OFFSET cada pagina siguiente se
        // pone mas pesada a medida que crece el historico (Postgres tiene que escanear y
        // descartar todo lo anterior), y con miles de envios eso hacia que Analitica se sintiera
        // "colgada" varios segundos. Por 'id' cada pagina es igual de rapida sin importar cuantas
        // la precedan. Ademas se actualiza el estado EN CADA PAGINA (no solo al final) para que
        // se vea la info aparecer progresivamente en vez de una pantalla vacia varios segundos.
        var cursor='00000000-0000-0000-0000-000000000000';var BLOQUE=1000;
        while(true){
          var q=db.from('envios').select(COLS).neq('estado','eliminado');
          if(lim.desde)q=q.gte('fecha',lim.desde);
          if(lim.hasta)q=q.lte('fecha',lim.hasta);
          var r=await q.gt('id',cursor).order('id',{ascending:true}).limit(BLOQUE);
          if(r.error)throw r.error;
          var data=r.data||[];
          if(!data.length)break;
          rows=rows.concat(data);
          setEnvios(rows.slice());
          if(data.length<BLOQUE)break;
          cursor=data[data.length-1].id;
        }
        setUltimaActualizacion(new Date());
      }catch(e){
        console.warn('Analitica: error cargando envios desde Supabase:',e.message);
      }
      setCargando(false);
    })();
  }

  // Roster de mensajeros (para mostrar tambien a quienes NO tuvieron actividad en el período)
  var _mr=useState([]),mensajerosRoster=_mr[0],setMensajerosRoster=_mr[1];
  useEffect(function(){
    db.from('mensajeros').select('id,nombre,activo').order('nombre').then(function(res){
      if(res.data)setMensajerosRoster(res.data.map(function(m){return{id:m.id,nombre:nombreCanonico(m.nombre),activo:!!m.activo};}));
    }).catch(function(){});
  },[]);

  var _st=useState('resumen'),subTab=_st[0],setSubTab=_st[1];

  // ---- Filtros del panel "Resumen" (comportamiento sin cambios) ----
  var _f=useState('semana'),filtro=_f[0],setFiltro=_f[1];
  var _fd=useState(''),fechaDesde=_fd[0],setFechaDesde=_fd[1];
  var _fh=useState(''),fechaHasta=_fh[0],setFechaHasta=_fh[1];
  var filtrados=filtrarPorRango(envios,filtro,fechaDesde,fechaHasta);
  var total=filtrados.length;
  // 'Entregados' (aca y en Top Mensajeros) se calcula con la fecha REAL de entrega
  // (historial_envios), no con la fecha de despacho de 'filtrados' -- mismo criterio que ya usan
  // Pagos Mensajeros y la app del mensajero para calcular lo que se paga. Antes esta pantalla
  // mostraba "entregados" segun cuando se DESPACHO el paquete, lo que podia no calzar con el
  // numero real de entregas de la semana (un paquete despachado el sabado pero entregado el lunes
  // contaba en la semana de despacho, no en la de entrega real).
  var _uEntPerRealA=useState(null),entregadosPeriodoReal=_uEntPerRealA[0],setEntregadosPeriodoReal=_uEntPerRealA[1];
  var _uCargEntRealA=useState(false),cargandoEntregadosReal=_uCargEntRealA[0],setCargandoEntregadosReal=_uCargEntRealA[1];
  function limitesResumenReal(){
    var hoy=fechaHoyCL();
    if(filtro==='hoy')return{desde:hoy,hasta:hoy};
    if(filtro==='ayer'){var d=new Date(hoy+'T12:00:00');d.setDate(d.getDate()-1);var ay=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return{desde:ay,hasta:ay};}
    if(filtro==='semana'){var dd=new Date();dd.setDate(dd.getDate()-((dd.getDay()+6)%7));var lunes=dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0');return{desde:lunes,hasta:hoy};}
    if(filtro==='mes')return{desde:hoy.slice(0,7)+'-01',hasta:hoy};
    if(filtro==='personalizado')return{desde:fechaDesde||null,hasta:fechaHasta||null};
    return{desde:null,hasta:null}; // 'todo' -- sin acotar, se deja el criterio anterior (ver abajo)
  }
  useEffect(function(){
    if(subTab!=='resumen')return;
    var lim=limitesResumenReal();
    if(!lim.desde||!lim.hasta){setEntregadosPeriodoReal(null);return;} // null = 'todo', usa el criterio anterior
    var cancelado=false;
    (async function(){
      setCargandoEntregadosReal(true);
      try{
        var COLS_ENT='id,codigo,cliente,comuna,fecha,estado,mensajero,monto,nota,fotos_entrega,created_at,updated_at';
        var rows=await fetchEntregadosPorFechaReal(lim.desde,lim.hasta,COLS_ENT);
        if(!cancelado)setEntregadosPeriodoReal(rows);
      }catch(eReal){console.warn('Error cargando entregados por fecha real (Analitica):',eReal.message);}
      if(!cancelado)setCargandoEntregadosReal(false);
    })();
    return function(){cancelado=true;};
  },[subTab,filtro,fechaDesde,fechaHasta]);
  // Si aun no cargo (o el periodo es 'todo', sin acotar), se cae al criterio anterior por fecha
  // de despacho -- para no mostrar 0 mientras carga ni romper la opcion 'todo'.
  var entregadosReales=entregadosPeriodoReal===null?filtrados.filter(function(e){return e.estado==='entregado';}):entregadosPeriodoReal;
  var entregados=entregadosReales.length;
  var enRuta=filtrados.filter(function(e){return e.estado==='en_ruta';}).length;
  var reprog=filtrados.filter(function(e){return e.estado==='reprogramado';}).length;
  var cancelados=filtrados.filter(function(e){return e.estado==='cancelado';}).length;
  var efectividad=total>0?Math.round(entregados/total*100):0;
  var porCliente={};
  filtrados.forEach(function(e){var c=e.cliente||'Sin cliente';if(!porCliente[c])porCliente[c]={total:0,entregados:0};porCliente[c].total++;});
  entregadosReales.forEach(function(e){var c=e.cliente||'Sin cliente';if(!porCliente[c])porCliente[c]={total:0,entregados:0};porCliente[c].entregados++;});
  var clientesArr=Object.entries(porCliente).sort(function(a,b){return b[1].total-a[1].total;}).slice(0,10);
  var porMen={};
  filtrados.forEach(function(e){var m=e.mensajero||'Sin asignar';if(!porMen[m])porMen[m]={total:0,entregados:0};porMen[m].total++;});
  entregadosReales.forEach(function(e){var m=e.mensajero||'Sin asignar';if(!porMen[m])porMen[m]={total:0,entregados:0};porMen[m].entregados++;});
  var mensArr=Object.entries(porMen).filter(function(x){return x[0]!=='Sin asignar';}).sort(function(a,b){return b[1].entregados-a[1].entregados;}).slice(0,10);

  // ---- Filtros y datos del panel "KPI Mensajeros" ----
  var _kf=useState('hoy'),kpiFiltro=_kf[0],setKpiFiltro=_kf[1];
  var _kfd=useState(''),kpiFechaDesde=_kfd[0],setKpiFechaDesde=_kfd[1];
  var _kfh=useState(''),kpiFechaHasta=_kfh[0],setKpiFechaHasta=_kfh[1];

  // Calcula el rango de fechas a pedirle a Supabase segun la pestaña visible en este momento.
  // OJO: en KPI Mensajeros el grafico "Tendencia del mensajero" puede mostrar hasta 12 meses de
  // historial hacia atras (12 quincenas/meses) sin importar el filtro principal (kpiFiltro) que
  // se este viendo -- por eso ese caso siempre pide una ventana de 12 meses (antes se resolvia
  // trayendo TODO el historico completo, sin ningun tope). En Resumen, que no usa ese grafico,
  // se acota exactamente al filtro activo, igual que filtrarPorRango().
  function limitesPeriodoAnalitica(){
    var hoy=fechaHoyCL();
    if(subTab==='kpi'){
      var doce=new Date(hoy+'T12:00:00');doce.setMonth(doce.getMonth()-12);
      var doceStr=doce.getFullYear()+'-'+String(doce.getMonth()+1).padStart(2,'0')+'-'+String(doce.getDate()).padStart(2,'0');
      var fD=kpiFiltro==='personalizado'&&kpiFechaDesde?kpiFechaDesde:null;
      return{desde:(fD&&fD<doceStr)?fD:doceStr,hasta:null};
    }
    if(filtro==='hoy')return{desde:hoy,hasta:hoy};
    if(filtro==='ayer'){var d=new Date(hoy+'T12:00:00');d.setDate(d.getDate()-1);var ay=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return{desde:ay,hasta:ay};}
    if(filtro==='semana'){var dd=new Date();dd.setDate(dd.getDate()-((dd.getDay()+6)%7));var lunes=dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0');return{desde:lunes,hasta:null};}
    if(filtro==='mes')return{desde:hoy.slice(0,7)+'-01',hasta:null};
    if(filtro==='personalizado')return{desde:fechaDesde||null,hasta:fechaHasta||null};
    return{desde:null,hasta:null}; // 'todo' -- solo existe como opcion en Resumen
  }
  // Se re-ejecuta al cambiar de pestaña o de periodo (igual que sincronizarDesdeSupabase en
  // Gestion de Envios), no solo una vez al entrar -- asi cada fetch queda acotado al periodo
  // que el usuario esta viendo en ese momento, sin importar cual sea.
  useEffect(function(){cargarEnvios();},[subTab,filtro,fechaDesde,fechaHasta,kpiFiltro,kpiFechaDesde,kpiFechaHasta]);
  var _exp=useState(null),expandido=_exp[0],setExpandido=_exp[1];
  // Filtro de estado dentro del detalle del mensajero expandido -- al estilo del Portal de
  // Clientes (tarjetas de estado clickeables que filtran la tabla de abajo). 'todos' = sin filtro.
  var _fem=useState('todos'),filtroEstadoDetalle=_fem[0],setFiltroEstadoDetalle=_fem[1];
  // Texto de busqueda dentro de la tabla "Estados en el período" del mensajero expandido --
  // busca por código, cliente o comuna, combinado con el filtro de estado de arriba.
  var _besq=useState(''),buscarEnvioDetalle=_besq[0],setBuscarEnvioDetalle=_besq[1];
  // Granularidad de los mini-graficos "Entregas" / "Efectividad" dentro del detalle del
  // mensajero expandido -- dia (14 dias), semana (12 semanas), quincena (8 quincenas) o mes
  // (12 meses). Solo un mensajero puede estar expandido a la vez, asi que un unico estado
  // alcanza para los dos graficos de esa fila.
  var _tg=useState('dia'),tendGranularidad=_tg[0],setTendGranularidad=_tg[1];
  // Chip de mensajero expandido dentro del briefing "Requiere atención" de Cierre de Flota (tanto
  // en la lista general como en el corte de las 8pm) -- clic en un mensajero muestra debajo el
  // detalle de sus paquetes pendientes (no entregados) sin salir de la pantalla. null = ninguno.
  var _cex=useState(null),chipExpandido=_cex[0],setChipExpandido=_cex[1];
  // Envío seleccionado con el botón "Ver" dentro de la tabla "Estados en el período" -- abre
  // el mismo modal de detalle que Gestión de Envíos (fotos de entrega, historial, etc.), en
  // modo solo-lectura (sin editar cliente ni cambiar estado, para no interferir desde Analítica).
  var _ve=useState(null),verEnvio=_ve[0],setVerEnvio=_ve[1];
  var _vhr=useState([]),verHistorial=_vhr[0],setVerHistorial=_vhr[1];
  var _vch=useState(false),verCargandoHistorial=_vch[0],setVerCargandoHistorial=_vch[1];
  useEffect(function(){
    if(!verEnvio){setVerHistorial([]);return;}
    setVerCargandoHistorial(true);
    db.from('historial_envios').select('id,estado,nota,usuario,canal,created_at').eq('codigo_envio',verEnvio.codigo).order('created_at',{ascending:false}).then(function(res){
      setVerHistorial((res&&res.data)||[]);
      setVerCargandoHistorial(false);
    }).catch(function(){setVerHistorial([]);setVerCargandoHistorial(false);});
  },[verEnvio&&verEnvio.codigo]);
  var enviosPeriodoKpi=useMemo(function(){return filtrarPorRango(envios,kpiFiltro,kpiFechaDesde,kpiFechaHasta);},[envios,kpiFiltro,kpiFechaDesde,kpiFechaHasta]);

  var _hist=useState([]),historialKpi=_hist[0],setHistorialKpi=_hist[1];
  var _ch=useState(false),cargandoHistKpi=_ch[0],setCargandoHistKpi=_ch[1];
  var _hl=useState(false),historialLimitado=_hl[0],setHistorialLimitado=_hl[1];
  var LIMITE_HISTORIAL=4000;
  useEffect(function(){
    if(subTab!=='kpi')return;
    var codigos=Array.from(new Set(enviosPeriodoKpi.map(function(e){return e.codigo;}).filter(Boolean)));
    if(codigos.length===0){setHistorialKpi([]);setHistorialLimitado(false);return;}
    if(codigos.length>LIMITE_HISTORIAL){setHistorialKpi([]);setHistorialLimitado(true);return;}
    setHistorialLimitado(false);
    setCargandoHistKpi(true);
    (async function(){
      try{
        var BLOQUE=500;var lotes=[];
        for(var i=0;i<codigos.length;i+=BLOQUE)lotes.push(codigos.slice(i,i+BLOQUE));
        // Supabase/PostgREST corta cada consulta en un maximo fijo de filas (1000), incluso si se
        // pide mas de una vez con .range() -- y un solo lote de 500 codigos ya puede tener mas de
        // 1000 eventos de historial (asignado/en_ruta/entregado/correcciones, etc.). Antes se hacia
        // UNA sola consulta por lote: se quedaba corta SIN avisar (no da error, solo trae menos
        // filas), asi que cualquier calculo basado en historial (horas activas, ritmo, duracion de
        // reparto, piezas c/atraso, rutas del periodo) contaba de menos en periodos con muchos
        // envios (semana/mes/rango) -- confirmado: para 500 codigos de "esta semana" habia 1842
        // filas reales y la consulta unica solo traia 1000. Ahora se pagina cada lote con .range()
        // hasta que una pagina vuelve con menos filas que el tamano pedido (ya no queda mas).
        var PAGINA=1000;
        function fetchLoteCompleto(lote){
          return(async function(){
            var out=[];var offset=0;
            while(true){
              var r=await db.from('historial_envios').select('codigo_envio,estado,usuario,canal,nota,created_at').in('codigo_envio',lote).range(offset,offset+PAGINA-1);
              if(r.error)throw r.error;
              var data=r.data||[];
              out=out.concat(data);
              if(data.length<PAGINA)break;
              offset+=PAGINA;
            }
            return out;
          })();
        }
        var resultados=await Promise.all(lotes.map(function(lote){return fetchLoteCompleto(lote).catch(function(){return[];});}));
        var rows=[];resultados.forEach(function(r){rows=rows.concat(r);});
        setHistorialKpi(rows);
      }catch(e){console.warn('KPI Mensajeros: error cargando historial:',e.message);setHistorialKpi([]);}
      setCargandoHistKpi(false);
    })();
  },[subTab,kpiFiltro,kpiFechaDesde,kpiFechaHasta,envios]);

  var historialDisponible=!historialLimitado;
  var kpiPorMensajero=useMemo(function(){
    if(subTab!=='kpi')return [];
    return calcularKpiPorMensajero(enviosPeriodoKpi,historialKpi,mensajerosRoster,historialDisponible);
  },[subTab,enviosPeriodoKpi,historialKpi,mensajerosRoster,historialDisponible]);

  // Tendencia de flota — últimos 14 días, independiente del filtro elegido arriba
  var tendencia14=useMemo(function(){
    if(subTab!=='kpi')return [];
    var hoyD=new Date();var dias=[];
    for(var i=13;i>=0;i--){var d=new Date(hoyD);d.setDate(d.getDate()-i);dias.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'));}
    var porDia={};dias.forEach(function(d){porDia[d]={total:0,entregados:0};});
    envios.forEach(function(e){var f=(e.fecha||'').slice(0,10);if(porDia[f]){porDia[f].total++;if(e.estado==='entregado')porDia[f].entregados++;}});
    return dias.map(function(d){var x=porDia[d];var dd=d.slice(8,10)+'-'+d.slice(5,7);return{fecha:d,label:dd,total:x.total,entregados:x.entregados,efectividad:x.total>0?Math.round(x.entregados/x.total*100):0};});
  },[envios,subTab]);

  // Arma los "cajones" de tiempo (inicio/fin/etiqueta) para una granularidad dada, del mas
  // viejo al mas nuevo, terminando en hoy. Usado tanto por el grafico de tendencia por
  // mensajero como -- si se necesita mas adelante -- por cualquier otro grafico de periodo.
  var MESES_CORTOS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  function construirCajonesTiempo(granularidad){
    var hoyD=new Date();hoyD.setHours(0,0,0,0);
    var cajones=[];
    if(granularidad==='semana'){
      // 12 semanas (lunes a domingo), incluyendo la semana actual.
      var lunesActual=lunesDe(hoyD);
      for(var i=11;i>=0;i--){
        var ini=new Date(lunesActual);ini.setDate(ini.getDate()-7*i);
        var fin=new Date(ini);fin.setDate(fin.getDate()+6);
        cajones.push({ini:ini,fin:fin,label:String(ini.getDate()).padStart(2,'0')+'/'+String(ini.getMonth()+1).padStart(2,'0')});
      }
    }else if(granularidad==='quincena'){
      // 8 quincenas (bloques fijos de 15 dias) terminando hoy -- unos 4 meses hacia atras.
      for(var i=7;i>=0;i--){
        var fin2=new Date(hoyD);fin2.setDate(fin2.getDate()-15*i);
        var ini2=new Date(fin2);ini2.setDate(ini2.getDate()-14);
        cajones.push({ini:ini2,fin:fin2,label:String(ini2.getDate()).padStart(2,'0')+'/'+String(ini2.getMonth()+1).padStart(2,'0')+'–'+String(fin2.getDate()).padStart(2,'0')+'/'+String(fin2.getMonth()+1).padStart(2,'0')});
      }
    }else if(granularidad==='mes'){
      // 12 meses calendario, incluyendo el actual.
      for(var i=11;i>=0;i--){
        var iniM=new Date(hoyD.getFullYear(),hoyD.getMonth()-i,1);
        var finM=new Date(hoyD.getFullYear(),hoyD.getMonth()-i+1,0);
        cajones.push({ini:iniM,fin:finM,label:MESES_CORTOS[iniM.getMonth()]+' '+String(iniM.getFullYear()).slice(2)});
      }
    }else{
      // 'dia' (default): ultimos 14 dias, incluyendo hoy.
      for(var i=13;i>=0;i--){
        var d=new Date(hoyD);d.setDate(d.getDate()-i);
        cajones.push({ini:new Date(d),fin:new Date(d),label:String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')});
      }
    }
    cajones.forEach(function(c){c.ini.setHours(0,0,0,0);c.fin.setHours(23,59,59,999);});
    return cajones;
  }
  // Agrupa una lista de envios en los cajones de la granularidad elegida -- total/entregados/
  // efectividad por cajon. Cada envio cae en el primer cajon cuyo rango cubra su fecha.
  function agruparPorCajones(listaEnvios,granularidad){
    var cajones=construirCajonesTiempo(granularidad);
    var acumuladores=cajones.map(function(){return{total:0,entregados:0};});
    listaEnvios.forEach(function(e){
      var f=new Date((e.fecha||'')+'T12:00:00');
      if(isNaN(f.getTime()))return;
      for(var i=0;i<cajones.length;i++){
        if(f>=cajones[i].ini&&f<=cajones[i].fin){acumuladores[i].total++;if(e.estado==='entregado')acumuladores[i].entregados++;break;}
      }
    });
    return cajones.map(function(c,i){var x=acumuladores[i];return{fecha:c.label,label:c.label,total:x.total,entregados:x.entregados,efectividad:x.total>0?Math.round(x.entregados/x.total*100):0};});
  }
  function tendenciaDeMensajero(norm,granularidad){
    var propiosDelMen=envios.filter(function(e){return normNombreLocal(e.mensajero)===norm;});
    return agruparPorCajones(propiosDelMen,granularidad||'dia');
  }
  var TEND_GRANULARIDAD_LABEL={dia:'14 días',semana:'12 semanas',quincena:'8 quincenas',mes:'12 meses'};

  // Cierre de flota (resumen automático del período elegido en KPI)
  var fleetTotal=enviosPeriodoKpi.length;
  var fleetEntregados=enviosPeriodoKpi.filter(function(e){return e.estado==='entregado';}).length;
  var fleetEfectividad=fleetTotal>0?Math.round(fleetEntregados/fleetTotal*100):0;
  var fleetMonto=enviosPeriodoKpi.filter(function(e){return e.estado==='entregado';}).reduce(function(a,e){return a+(e.monto||0);},0);
  var fleetAtrasados=enviosPeriodoKpi.filter(function(e){return esEnvioAtrasado(e);}).length;
  var fleetPiezasAtraso=kpiPorMensajero.reduce(function(a,m){return a+(m.entregasConAtraso?m.entregasConAtraso.length:0);},0);
  // Restante pendiente: de todo lo gestionado en el período, cuánto todavía no llega a destino
  // (en bodega, en ruta o reprogramado -- no entregado/cancelado/retorno/siniestro).
  var fleetPendiente=enviosPeriodoKpi.filter(function(e){return e.estado==='en_bodega'||e.estado==='en_ruta'||e.estado==='reprogramado';}).length;
  // Lista unica de TODA la flota (no solo un mensajero) de paquetes que todavia no se entregan y
  // ya llevan UMBRAL_ATRASO_DIAS+ dias desde su recepcion -- junta el "pendientesAtrasados" que ya
  // se calcula por mensajero, agregando a quien pertenece cada paquete.
  var fleetPendientesAtrasados=[];
  kpiPorMensajero.forEach(function(m){
    (m.pendientesAtrasados||[]).forEach(function(x){
      fleetPendientesAtrasados.push({codigo:x.codigo,cliente:x.cliente,comuna:x.comuna,estado:x.estado,fecha:x.fecha,dias:x.dias,mensajero:m.nombre});
    });
  });
  fleetPendientesAtrasados.sort(function(a,b){return b.dias-a.dias;});
  var conActividad=kpiPorMensajero.filter(function(m){return m.total>0;});
  var sinActividad=kpiPorMensajero.filter(function(m){return m.total===0;});
  var rankeables=conActividad.filter(function(m){return m.total>=3;});
  var mejorMen=rankeables.length>0?rankeables[0]:null; // ya viene ordenado por efectividad desc
  var necesitanAtencion=rankeables.filter(function(m){return m.efectividad<70;});
  // Corte de las 8:00 PM (solo aplica viendo "Hoy"): mensajeros que a esta hora todavia no tienen
  // resuelto (entregado) al menos el 80% de lo que se les asigno hoy -- alerta de RITMO durante el
  // dia, distinta de "Necesitan atencion" (que mira el resultado final del periodo completo, sin
  // importar la hora). ANTES se usaba la hora local del dispositivo (new Date().getHours()),
  // asumiendo que el equipo ya estaba en hora de Chile -- mismo supuesto que resultó falso para
  // fechaHoyCL (ver su comentario en index.html). Ahora se fuerza America/Santiago explícitamente.
  var horaActualCL=+new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',hour:'2-digit',hourCycle:'h23'}).format(new Date());
  var corte8pmActivo=kpiFiltro==='hoy'&&horaActualCL>=20;
  var bajo80a8pm=corte8pmActivo?rankeables.filter(function(m){return m.efectividad<80;}):[];
  // Estado general de la flota para el indicador del panel (verde/amarillo/rojo).
  var fleetSinIncidentes=fleetAtrasados===0&&fleetPendientesAtrasados.length===0&&bajo80a8pm.length===0;
  var fleetEstado=(fleetEfectividad>=90&&fleetSinIncidentes)?'good':((fleetEfectividad<70||fleetAtrasados>0||bajo80a8pm.length>0)?'bad':'warn');
  var ESTADO_FLOTA_INFO={
    good:{icono:'🟢',texto:'Operación saludable',color:'var(--success)',bg:'rgba(46,125,79,0.08)',border:'rgba(46,125,79,0.35)'},
    warn:{icono:'🟡',texto:'Con novedades',color:'var(--warning)',bg:'rgba(176,125,16,0.08)',border:'rgba(176,125,16,0.35)'},
    bad:{icono:'🔴',texto:'Requiere atención',color:'var(--danger)',bg:'rgba(176,48,48,0.08)',border:'rgba(176,48,48,0.35)'}
  };
  var estadoInfoFlota=ESTADO_FLOTA_INFO[fleetEstado];

  var btnStyle=function(active){return{padding:'6px 16px',borderRadius:8,border:'1px solid '+(active?'var(--gold)':'var(--border)'),background:active?'rgba(200,168,75,0.12)':'#fff',color:active?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer'};};
  var subTabStyle=function(active){return{padding:'9px 20px',borderRadius:9,border:'1px solid '+(active?'var(--gold)':'var(--border)'),background:active?'linear-gradient(145deg,#fff,#f5eedc)':'#fff',color:active?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer',letterSpacing:0.5};};

  function statTile(label,val,cls){
    return React.createElement('div',{key:label,className:'stat-card'},React.createElement('div',{className:'stat-label'},label),React.createElement('div',{className:'stat-value '+(cls||'')},val));
  }

  // Pastilla compacta "nombre + metrica" usada en el briefing de Cierre de Flota (Destacados /
  // Requiere atencion), para reemplazar la lista de nombres en negrita dentro de una sola oracion
  // larga por algo mas legible y moderno.
  var CHIP_TONE_COLOR={good:'#2e7d4f',warn:'#b07d10',bad:'#b03030'};
  function chipPersona(nombre,detalle,tone){
    var c=CHIP_TONE_COLOR[tone]||CHIP_TONE_COLOR.warn;
    return React.createElement('span',{key:nombre+'_'+(detalle||''),style:{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:999,background:c+'14',border:'1px solid '+c+'40',fontSize:11.5,fontWeight:600,color:'var(--text)',lineHeight:1.3}},
      React.createElement('span',{style:{width:6,height:6,borderRadius:99,background:c,flexShrink:0}}),
      nombre,
      detalle?React.createElement('span',{style:{color:c,fontWeight:800}},detalle):null
    );
  }
  // Paquetes que un mensajero todavia no entrega (en bodega, en ruta o reprogramado) -- usado por
  // el chip clickeable de "Requiere atencion" para desplegar el detalle de lo pendiente.
  var ESTADOS_PENDIENTES_ENTREGA_MEN={en_bodega:true,en_ruta:true,reprogramado:true};
  function pendientesDeMensajero(m){
    return (m.propios||[]).filter(function(e){return ESTADOS_PENDIENTES_ENTREGA_MEN[e.estado];})
      .map(function(e){return{codigo:e.codigo,cliente:e.cliente,comuna:e.comuna,estado:e.estado,fecha:e.fecha,dias:diasDesdeFecha(e.fecha)};})
      .sort(function(a,b){return b.dias-a.dias;});
  }
  // Igual que chipPersona pero clickeable: representa a un mensajero concreto (no una cifra suelta)
  // dentro de "Requiere atencion" -- clic despliega/oculta su detalle de pendientes debajo.
  function chipMensajeroPendiente(m,detalle,tone){
    var c=CHIP_TONE_COLOR[tone]||CHIP_TONE_COLOR.warn;
    var activo=chipExpandido===m.norm;
    return React.createElement('span',{key:'chipmen_'+m.norm+'_'+(detalle||''),onClick:function(ev){ev.stopPropagation();setChipExpandido(activo?null:m.norm);},
      style:{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:999,background:activo?c+'26':c+'14',border:'1.5px solid '+(activo?c:c+'40'),fontSize:11.5,fontWeight:600,color:'var(--text)',lineHeight:1.3,cursor:'pointer'}},
      React.createElement('span',{style:{width:6,height:6,borderRadius:99,background:c,flexShrink:0}}),
      m.nombre,
      detalle?React.createElement('span',{style:{color:c,fontWeight:800}},detalle):null,
      React.createElement('span',{style:{fontSize:9,opacity:0.6,marginLeft:1}},activo?'▲':'▼')
    );
  }
  // Tarjeta de briefing (Destacados / Requiere atencion): titulo con acento de color a la izquierda
  // y una nube de chips (o un mensaje "sin novedades"). 'extra' es un bloque opcional debajo (usado
  // para el corte de las 8pm dentro de la tarjeta de "Requiere atencion").
  function briefCard(icon,titulo,tone,contenido,extra){
    var c=tone==='good'?CHIP_TONE_COLOR.good:CHIP_TONE_COLOR.bad;
    return React.createElement('div',{style:{flex:'1 1 320px',background:'#fff',borderRadius:12,border:'1px solid var(--border)',borderLeft:'4px solid '+c,padding:'14px 16px 16px',boxShadow:'0 2px 10px rgba(43,46,32,0.05)'}},
      React.createElement('div',{style:{display:'flex',alignItems:'center',gap:7,marginBottom:10,fontSize:11.5,fontWeight:800,letterSpacing:0.6,color:c,textTransform:'uppercase'}},icon,' ',titulo),
      contenido.length>0?React.createElement('div',{style:{display:'flex',flexWrap:'wrap',gap:7}},contenido):React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',fontStyle:'italic'}},'Sin novedades por ahora.'),
      extra||null
    );
  }

  // ---- Contenido del briefing "Destacados" (lo positivo) ----
  // Antes solo se mostraba UN mensajero (el "mejor" del período) y el resto de los que también
  // van con 100% de efectividad quedaban escondidos detrás de un conteo agregado ("4 mensajeros
  // con 100%"). Ahora se lista a CADA UNO de los que van con 100% (ya vienen ordenados por más
  // entregas primero, mismo criterio que el ranking general) -- así se ve quién específicamente
  // ya terminó su período sin fallar ni uno, no solo el más destacado. Si nadie llegó al 100% se
  // deja al menos el mejor del período como referencia, para que la tarjeta no quede vacía.
  var destacadosChips=[];
  var LIMITE_CHIPS_PERFECTOS=12; // tope visual -- si hay mas, se avisa cuantos quedan sin mostrar
  var mensajerosPerfectos=conActividad.filter(function(m){return m.total>=3&&m.efectividad===100;});
  if(mensajerosPerfectos.length>0){
    mensajerosPerfectos.slice(0,LIMITE_CHIPS_PERFECTOS).forEach(function(m){
      destacadosChips.push(chipPersona(m.nombre,m.efectividad+'% · '+m.entregados+' entregas','good'));
    });
    if(mensajerosPerfectos.length>LIMITE_CHIPS_PERFECTOS){
      destacadosChips.push(chipPersona('+'+(mensajerosPerfectos.length-LIMITE_CHIPS_PERFECTOS)+' más con 100%',null,'good'));
    }
  }else if(mejorMen){
    destacadosChips.push(chipPersona(mejorMen.nombre,mejorMen.efectividad+'% · '+mejorMen.entregados+' entregas','good'));
  }
  if(fleetEfectividad>=85)destacadosChips.push(chipPersona('Efectividad de flota',fleetEfectividad+'%','good'));
  if(fleetAtrasados===0)destacadosChips.push(chipPersona('Sin envíos atrasados en ruta',null,'good'));
  if(fleetPendientesAtrasados.length===0)destacadosChips.push(chipPersona('Sin pendientes atrasados',null,'good'));

  // ---- Contenido del briefing "Requiere atención" (lo urgente) ----
  // Los chips de mensajero (no las cifras sueltas de flota) son clickeables: clic despliega su
  // detalle de pendientes en el panel compartido mas abajo (chipDetallePanel).
  var urgentesChips=[];
  necesitanAtencion.forEach(function(m){urgentesChips.push(chipMensajeroPendiente(m,m.efectividad+'%','bad'));});
  if(fleetAtrasados>0)urgentesChips.push(chipPersona('Envíos atrasados en ruta',String(fleetAtrasados),'bad'));
  if(fleetPendientesAtrasados.length>0)urgentesChips.push(chipPersona('Pendientes sin entregar 2+ días',String(fleetPendientesAtrasados.length),'bad'));

  // Bloque aparte (con su propio titulo) dentro de la tarjeta "Requiere atencion": solo aparece
  // viendo "Hoy" y desde las 8:00 PM en adelante -- mensajeros bajo 80% de efectividad a esa hora.
  var corte8pmBlock=corte8pmActivo?React.createElement('div',{style:{marginTop:12,paddingTop:12,borderTop:'1px dashed rgba(176,48,48,0.3)'}},
    React.createElement('div',{style:{fontSize:11,fontWeight:800,color:'var(--danger)',marginBottom:7,display:'flex',alignItems:'center',gap:6}},'🕗 CORTE 8:00 PM — bajo 80% de efectividad'),
    bajo80a8pm.length>0?React.createElement('div',{style:{display:'flex',flexWrap:'wrap',gap:7}},bajo80a8pm.map(function(m){return chipMensajeroPendiente(m,m.efectividad+'% · faltan '+(m.total-m.entregados),'bad');})):React.createElement('div',{style:{fontSize:11.5,color:'var(--success)',fontWeight:600}},'✓ Todos sobre el 80% a esta hora.')
  ):null;

  // Panel compartido: se abre debajo de la tarjeta "Requiere atencion" al hacer clic en CUALQUIER
  // chip de mensajero (de la lista general o del corte 8pm) -- muestra el detalle concreto de sus
  // paquetes todavia pendientes por entregar.
  var mensajeroChipExpandido=chipExpandido?rankeables.find(function(m){return m.norm===chipExpandido;}):null;
  var chipDetallePanel=mensajeroChipExpandido?(function(){
    var pend=pendientesDeMensajero(mensajeroChipExpandido);
    return React.createElement('div',{style:{marginTop:12,paddingTop:12,borderTop:'1px dashed rgba(176,48,48,0.3)'}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,gap:8,flexWrap:'wrap'}},
        React.createElement('div',{style:{fontSize:11,fontWeight:800,color:'var(--danger)'}},'📦 Pendientes de '+mensajeroChipExpandido.nombre+' ('+pend.length+')'),
        React.createElement('button',{onClick:function(){setChipExpandido(null);},style:{border:'none',background:'none',color:'var(--text-soft)',fontSize:11,fontWeight:700,cursor:'pointer'}},'✕ Cerrar')
      ),
      pend.length===0?React.createElement('div',{style:{fontSize:11.5,color:'var(--success)',fontWeight:600}},'✓ No tiene paquetes pendientes por entregar en este período.'):
      React.createElement('div',{style:{maxHeight:220,overflowY:'auto',border:'1px solid rgba(176,48,48,0.2)',borderRadius:8,background:'#fff'}},
        React.createElement('table',{style:{width:'100%',fontSize:11}},
          React.createElement('thead',null,React.createElement('tr',{style:{background:'rgba(176,48,48,0.08)',position:'sticky',top:0}},
            React.createElement('th',{style:{textAlign:'left',padding:'6px 10px'}},'Código'),
            React.createElement('th',{style:{padding:'6px 10px'}},'Cliente'),
            React.createElement('th',{style:{padding:'6px 10px'}},'Comuna'),
            React.createElement('th',{style:{padding:'6px 10px'}},'Estado'),
            React.createElement('th',{style:{padding:'6px 10px'}},'Recepción'),
            React.createElement('th',{style:{padding:'6px 10px'}},'Días esperando')
          )),
          React.createElement('tbody',null,pend.slice(0,100).map(function(x,i){
            return React.createElement('tr',{key:x.codigo+'_'+i,style:{background:i%2===0?'rgba(176,48,48,0.04)':'#fff'}},
              React.createElement('td',{style:{padding:'5px 10px',fontFamily:'JetBrains Mono'}},x.codigo),
              React.createElement('td',{style:{padding:'5px 10px'}},x.cliente),
              React.createElement('td',{style:{padding:'5px 10px'}},x.comuna),
              React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},estadoInfo(x.estado).label),
              React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},x.fecha),
              React.createElement('td',{style:{padding:'5px 10px',textAlign:'center',fontWeight:700,color:x.dias>=UMBRAL_ATRASO_DIAS?'var(--danger)':'var(--text-soft)'}},x.dias+' día'+(x.dias!==1?'s':''))
            );
          }))
        )
      ),
      pend.length>100&&React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',padding:'6px 0'}},'Mostrando 100 de '+pend.length+'.')
    );
  })():null;

  // Reporte individual (por mensajero) de piezas entregadas con fecha de recepcion de dias
  // anteriores a su entrega -- formato "profesional" TransPgso SpA (mismo estilo de membrete/pie
  // de pagina usado en Manifiesto de Colecta y Recibo de Cobro: logo, marca, RUT y contacto).
  function periodoKpiLabelActual(){
    if(kpiFiltro==='hoy')return 'Hoy';
    if(kpiFiltro==='ayer')return 'Ayer';
    if(kpiFiltro==='semana')return 'Esta semana';
    if(kpiFiltro==='mes')return 'Este mes';
    if(kpiFiltro==='personalizado')return (kpiFechaDesde||'...')+' al '+(kpiFechaHasta||'...');
    return 'Período actual';
  }
  function exportarAtrasoPDF(m){
    var lista=(m.entregasConAtraso||[]).slice();
    if(lista.length===0)return;
    var logoEl=document.querySelector('.logo-img');
    var logoSrc=logoEl?logoEl.src:'';
    var win=window.open('','_blank','width=1000,height=700');
    if(!win)return;
    var filas=lista.map(function(x,i){
      return '<tr style="background:'+(i%2===0?'#fff':'#fdf9f2')+'">'
        +'<td style="padding:7px 10px;text-align:center;color:#7a7d6a;border-bottom:1px solid #f0e8d0">'+(i+1)+'</td>'
        +'<td style="padding:7px 10px;font-family:monospace;font-weight:700;border-bottom:1px solid #f0e8d0">'+x.codigo+'</td>'
        +'<td style="padding:7px 10px;border-bottom:1px solid #f0e8d0">'+(x.cliente||'—')+'</td>'
        +'<td style="padding:7px 10px;border-bottom:1px solid #f0e8d0">'+(x.comuna||'—')+'</td>'
        +'<td style="padding:7px 10px;text-align:center;border-bottom:1px solid #f0e8d0">'+x.fechaRecepcion+'</td>'
        +'<td style="padding:7px 10px;text-align:center;border-bottom:1px solid #f0e8d0">'+x.fechaEntrega+'</td>'
        +'<td style="padding:7px 10px;text-align:center;font-weight:700;border-bottom:1px solid #f0e8d0;color:'+(x.diasAtraso>=3?'#b03030':'#b07d10')+'">'+x.diasAtraso+' día'+(x.diasAtraso!==1?'s':'')+'</td>'
      +'</tr>';
    }).join('');
    var periodoLabel=periodoKpiLabelActual();
    var html='<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Reporte de Atrasos - '+m.nombre+'</title>'
      +'<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;background:#FEF8EA;padding:24px;font-size:11px;color:#2b2e20;}'
      +'.hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #C8A84B;padding-bottom:12px;margin-bottom:18px;flex-wrap:wrap;gap:10px;}'
      +'.logo{display:flex;align-items:center;gap:10px;}.logo img{width:50px;height:50px;object-fit:contain;border-radius:7px;}'
      +'.brand{font-size:18px;font-family:\'Bebas Neue\',sans-serif;font-weight:900;letter-spacing:2px;color:#A0842A;}'
      +'table{width:100%;border-collapse:collapse;margin-top:10px;}thead tr{background:#2b2e20;}thead th{color:#C8A84B;padding:8px 10px;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;text-align:left;}'
      +'.footer{text-align:center;padding:16px;font-size:10px;color:#888;border-top:2px solid #EDE3C8;margin-top:22px;}'
      +'@media print{body{padding:14px;background:#fff;}}</style></head><body>'
      +'<div class="hdr"><div class="logo">'+(logoSrc?'<img src="'+logoSrc+'" onerror="this.style.display=\'none\'"/>':'')+'<div><div class="brand">TRANSPGSO</div><div style="font-size:9px;color:#7a7d6a;letter-spacing:2px">REPORTE DE PIEZAS CON ATRASO EN ENTREGA</div></div></div>'
      +'<span style="background:#FDF8EC;border:1.5px solid #C8A84B;color:#A0842A;font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap">'+periodoLabel.toUpperCase()+'</span></div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px">'
      +'<div style="font-size:14px;font-weight:700;color:#2b2e20">Mensajero: '+m.nombre+'</div>'
      +'<div style="font-size:11px;color:#7a7d6a">Generado: '+new Date().toLocaleString('es-CL')+'</div></div>'
      +'<div style="font-size:12px;margin-bottom:6px;color:#4a4d3a">Se detectaron <strong>'+lista.length+'</strong> pieza'+(lista.length!==1?'s':'')+' entregada'+(lista.length!==1?'s':'')+' por este mensajero cuya fecha de entrega es posterior a su fecha de recepción (piezas retenidas de días anteriores antes de ser despachadas).</div>'
      +'<table><thead><tr><th>#</th><th>Código</th><th>Cliente</th><th>Comuna</th><th>Fecha Recepción</th><th>Fecha Entrega</th><th>Días de Atraso</th></tr></thead><tbody>'+filas+'</tbody></table>'
      +'<div class="footer">TransPgso SpA &nbsp;·&nbsp; RUT 78.143.701-8 &nbsp;·&nbsp; contacto@transpgso.cl &nbsp;·&nbsp; +56 9 4211 2940</div>'
      +'<script>window.onload=function(){window.print();}<\/script></body></html>';
    win.document.write(html);
    win.document.close();
  }

  function exportarKpiExcel(){
    var headers=['Mensajero','Total','Entregados','En Ruta','Reprogramados','Cancelados','Retorno','En Bodega Cancelado','Efectividad %','Tasa Falla %','$ Cobrado','$ Pendiente','Comunas','Atrasados','% Con Foto','% Con Nota','Reintentos','Correcciones Admin','Ritmo (entregas/h)','Duración Prom. Reparto (min)','Piezas c/Atraso en Entrega'];
    var rows=kpiPorMensajero.map(function(m){
      return[m.nombre,m.total,m.entregados,m.porEstado.en_ruta||0,m.porEstado.reprogramado||0,m.porEstado.cancelado||0,m.porEstado.retorno||0,m.porEstado.en_bodega_cancelado||0,
        m.efectividad,m.tasaFalla,m.montoCobrado,m.montoPendiente,m.comunas,m.atrasados,
        m.pctFoto==null?'—':m.pctFoto,m.pctNota==null?'—':m.pctNota,
        m.reintentos==null?'—':m.reintentos,m.correccionesAdmin==null?'—':m.correccionesAdmin,
        m.ritmo==null?'—':m.ritmo.toFixed(2),m.duracionRepartoProm==null?'—':Math.round(m.duracionRepartoProm),
        m.entregasConAtraso==null?'—':m.entregasConAtraso.length];
    });
    exportToExcel('KPI_Mensajeros_'+kpiFiltro+'_'+new Date().toISOString().slice(0,10),[{name:'KPI Mensajeros',headers:headers,rows:rows}]);
  }

  function exportarFleetPendientesAtrasadosExcel(){
    var headers=['Código','Cliente','Comuna','Mensajero','Estado','Recepción','Días esperando'];
    var rows=fleetPendientesAtrasados.map(function(x){
      return[x.codigo,x.cliente,x.comuna,x.mensajero,estadoInfo(x.estado).label,x.fecha,x.dias];
    });
    exportToExcel('Pendientes_Atrasados_'+kpiFiltro+'_'+new Date().toISOString().slice(0,10),[{name:'Pendientes Atrasados',headers:headers,rows:rows}]);
  }

  // Modal "Ver" del envío seleccionado en la tabla "Estados en el período" -- misma experiencia
  // que el botón "Ver" de Gestión de Envíos (info del envío, historial y fotos de entrega vía
  // FotosEntregaConRecarga), en modo solo-lectura: sin cambiar cliente, estado ni borrar nada.
  var verEnvioModal=verEnvio&&React.createElement(Modal,{title:'Envío '+verEnvio.codigo,onClose:function(){setVerEnvio(null);}},
    React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}},
      [['Código',verEnvio.codigo],['Cliente',verEnvio.cliente],['Comuna',verEnvio.comuna],['Mensajero',verEnvio.mensajero],['Fecha',verEnvio.fecha],['Monto',verEnvio.monto>0?'$'+Number(verEnvio.monto).toLocaleString('es-CL'):'—']].map(function(par){
        var l=par[0],v=par[1];
        return React.createElement('div',{key:l,style:{padding:'14px 16px',background:'linear-gradient(145deg,#ffffff,#f5eedc)',borderRadius:12,border:'1px solid rgba(200,168,75,0.25)',boxShadow:'5px 5px 10px rgba(43,46,32,0.12),-2px -2px 6px rgba(255,255,255,1),inset 0 1px 0 rgba(255,255,255,0.9)'}},
          React.createElement('div',{style:{fontSize:13,color:'#C8A84B',letterSpacing:3,textTransform:'uppercase',marginBottom:8,fontFamily:'Bebas Neue',fontWeight:700,textShadow:'0 1px 2px rgba(200,168,75,0.3)'}},l),
          React.createElement('div',{style:{fontSize:18,fontWeight:500,color:'#1a1d13',lineHeight:1.3}},v||'—')
        );
      })
    ),
    React.createElement('div',{style:{marginBottom:16}},estadoBadge(verEnvio.estado)),
    verEnvio.nota&&React.createElement('div',{className:'obs-box',style:{marginBottom:16}},'📌 '+verEnvio.nota),
    React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:14,letterSpacing:1.5,color:'var(--dark)',marginBottom:10}},'Historial'),
    React.createElement('div',{style:{maxHeight:260,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8,marginBottom:16}},
      verCargandoHistorial?React.createElement('div',{style:{padding:16,textAlign:'center',color:'var(--text-soft)',fontSize:12}},'Cargando historial...'):
      verHistorial.length===0?React.createElement('div',{style:{padding:16,textAlign:'center',color:'var(--text-soft)',fontSize:12}},'Sin registros de historial detallado para este envío (puede ser un paquete anterior a esta función).'):
      verHistorial.map(function(h,i){
        return React.createElement('div',{key:h.id||i,style:{padding:'8px 12px',borderBottom:'1px solid var(--border)',display:'flex',gap:10,alignItems:'flex-start'}},
          React.createElement('div',{style:{flex:1}},
            React.createElement('div',{style:{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}},
              React.createElement('span',{style:{fontSize:13,fontWeight:700,color:estadoInfo(h.estado).color}},estadoInfo(h.estado).label),
              React.createElement('span',{style:{fontSize:9,fontWeight:700,padding:'1px 7px',borderRadius:10,background:canalInfo(h.canal).bg,color:canalInfo(h.canal).color}},canalInfo(h.canal).label)
            ),
            React.createElement('div',{style:{fontSize:12,color:'var(--text-mid)',marginTop:3,fontWeight:600}},h.usuario||'Sistema'),
            h.nota&&React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',marginTop:2,fontStyle:'italic'}},h.nota)
          ),
          React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',fontFamily:'JetBrains Mono',whiteSpace:'nowrap',textAlign:'right'}},new Date(h.created_at).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}))
        );
      })
    ),
    React.createElement(FotosEntregaConRecarga,{key:verEnvio.codigo,codigo:verEnvio.codigo,fotoEtiquetaInicial:null,esAdmin:false}),
    React.createElement('div',{className:'modal-actions'},React.createElement('button',{className:'btn-secondary',onClick:function(){setVerEnvio(null);}},'Cerrar'))
  );

  return React.createElement('div',null,
    React.createElement('div',{className:'section-head'},
      React.createElement('div',{className:'section-title'},'Anal',React.createElement('span',null,'ítica')),
      React.createElement('div',{style:{display:'flex',gap:8}},
        React.createElement('button',{style:subTabStyle(subTab==='resumen'),onClick:function(){setSubTab('resumen');}},'Resumen'),
        React.createElement('button',{style:subTabStyle(subTab==='kpi'),onClick:function(){setSubTab('kpi');}},'📊 KPI Mensajeros')
      )
    ),

    subTab==='resumen'&&React.createElement(React.Fragment,null,
      React.createElement('div',{className:'section-head',style:{marginTop:0}},
        React.createElement('div',null),
        React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},
          React.createElement('button',{style:btnStyle(filtro==='hoy'),onClick:function(){setFiltro('hoy');}},'Hoy'),
          React.createElement('button',{style:btnStyle(filtro==='ayer'),onClick:function(){setFiltro('ayer');}},'Ayer'),
          React.createElement('button',{style:btnStyle(filtro==='semana'),onClick:function(){setFiltro('semana');}},'Esta semana'),
          React.createElement('button',{style:btnStyle(filtro==='mes'),onClick:function(){setFiltro('mes');}},'Este mes'),
          React.createElement('button',{style:btnStyle(filtro==='todo'),onClick:function(){setFiltro('todo');}},'Todo'),
          React.createElement('button',{style:btnStyle(filtro==='personalizado'),onClick:function(){setFiltro('personalizado');}},'Rango'),
          filtro==='personalizado'&&React.createElement(React.Fragment,null,
            React.createElement('input',{type:'date',value:fechaDesde,onChange:function(e){setFechaDesde(e.target.value);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12}}),
            React.createElement('span',{style:{color:'var(--text-soft)',fontSize:12}},'al'),
            React.createElement('input',{type:'date',value:fechaHasta,onChange:function(e){setFechaHasta(e.target.value);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12}})
          ),
          React.createElement('button',{style:btnStyle(false),disabled:cargando,onClick:cargarEnvios},cargando?'Actualizando...':'↺ Actualizar'),
          cargando&&React.createElement('span',{style:{fontSize:11,color:'var(--gold)',fontWeight:600}},'⏳ Cargando envíos...'),
          ultimaActualizacion&&React.createElement('span',{style:{fontSize:10,color:'var(--text-soft)'}},'Datos al '+ultimaActualizacion.toLocaleTimeString('es-CL'))
        )
      ),
      React.createElement('div',{className:'stats-grid',style:{marginBottom:20}},
        [{label:'Total',val:total,cls:''},{label:'Entregados (fecha real)',val:entregados,cls:'green'},{label:'En Ruta',val:enRuta,cls:'gold'},{label:'Reprogramados',val:reprog,cls:'red'},{label:'Cancelados',val:cancelados,cls:'red'},{label:'Efectividad',val:efectividad+'%',cls:efectividad>=95?'green':'red'}].map(function(s){
          return statTile(s.label,s.val,s.cls);
        })
      ),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}},
        React.createElement('div',{className:'panel'},
          React.createElement('div',{className:'panel-title'},'Top Clientes'),
          clientesArr.length===0?React.createElement('div',{className:'empty-state'},cargando?'⏳ Cargando...':'Sin datos'):
          React.createElement('div',{className:'table-wrap'},React.createElement('table',null,
            React.createElement('thead',null,React.createElement('tr',null,React.createElement('th',null,'Cliente'),React.createElement('th',{style:{textAlign:'center'}},'Envíos'),React.createElement('th',{style:{textAlign:'center'}},'Entregados'),React.createElement('th',{style:{textAlign:'center'}},'%'))),
            React.createElement('tbody',null,clientesArr.map(function(x,i){
              var ef=x[1].total>0?Math.round(x[1].entregados/x[1].total*100):0;
              return React.createElement('tr',{key:x[0],style:{background:i%2===0?'#fff':'var(--cream)'}},React.createElement('td',{style:{fontWeight:600}},x[0]),React.createElement('td',{className:'mono',style:{textAlign:'center'}},x[1].total),React.createElement('td',{className:'mono',style:{textAlign:'center',color:'var(--success)'}},x[1].entregados),React.createElement('td',{className:'mono',style:{textAlign:'center',fontWeight:700,color:badgeColor(ef)}},ef+'%'));
            }))
          ))
        ),
        React.createElement('div',{className:'panel'},
          React.createElement('div',{className:'panel-title'},'Top Mensajeros'),
          mensArr.length===0?React.createElement('div',{className:'empty-state'},cargando?'⏳ Cargando...':'Sin datos'):
          React.createElement('div',{className:'table-wrap'},React.createElement('table',null,
            React.createElement('thead',null,React.createElement('tr',null,React.createElement('th',null,'Mensajero'),React.createElement('th',{style:{textAlign:'center'}},'Envíos'),React.createElement('th',{style:{textAlign:'center'}},'Entregados'),React.createElement('th',{style:{textAlign:'center'}},'%'))),
            React.createElement('tbody',null,mensArr.map(function(x,i){
              var ef=x[1].total>0?Math.round(x[1].entregados/x[1].total*100):0;
              return React.createElement('tr',{key:x[0],style:{background:i%2===0?'#fff':'var(--cream)'}},React.createElement('td',{style:{fontWeight:600}},x[0].replace(/,\s*/g,' ')),React.createElement('td',{className:'mono',style:{textAlign:'center'}},x[1].total),React.createElement('td',{className:'mono',style:{textAlign:'center',color:'var(--success)'}},x[1].entregados),React.createElement('td',{className:'mono',style:{textAlign:'center',fontWeight:700,color:badgeColor(ef)}},ef+'%'));
            }))
          ))
        )
      ),
      React.createElement('div',{className:'panel'},
        React.createElement('div',{className:'panel-title'},'Distribución de Estados'),
        React.createElement('div',{style:{display:'flex',gap:12,flexWrap:'wrap',padding:'8px 0'}},
          [{label:'Entregados (fecha real)',val:entregados,color:'var(--success)'},{label:'En Ruta',val:enRuta,color:'var(--gold)'},{label:'Reprogramados',val:reprog,color:'var(--warning)'},{label:'Cancelados',val:cancelados,color:'var(--danger)'}].map(function(s){
            var pct=total>0?Math.round(s.val/total*100):0;
            return React.createElement('div',{key:s.label,style:{flex:'1 1 130px',background:'var(--cream)',borderRadius:10,padding:'12px 16px',border:'1px solid var(--border)'}},
              React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',marginBottom:4,textTransform:'uppercase',letterSpacing:1}},s.label),
              React.createElement('div',{style:{fontFamily:'JetBrains Mono',fontSize:24,fontWeight:700,color:s.color}},s.val),
              React.createElement('div',{style:{marginTop:6,height:4,borderRadius:2,background:'var(--border)'}},React.createElement('div',{style:{height:'100%',width:pct+'%',background:s.color,borderRadius:2}})),
              React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginTop:4}},pct+'% del total')
            );
          })
        )
      )
    ),

    subTab==='kpi'&&React.createElement(React.Fragment,null,
      React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:16}},
        React.createElement('button',{style:btnStyle(kpiFiltro==='hoy'),onClick:function(){setKpiFiltro('hoy');}},'Hoy'),
        React.createElement('button',{style:btnStyle(kpiFiltro==='ayer'),onClick:function(){setKpiFiltro('ayer');}},'Ayer'),
        React.createElement('button',{style:btnStyle(kpiFiltro==='semana'),onClick:function(){setKpiFiltro('semana');}},'Esta semana'),
        React.createElement('button',{style:btnStyle(kpiFiltro==='mes'),onClick:function(){setKpiFiltro('mes');}},'Este mes'),
        React.createElement('button',{style:btnStyle(kpiFiltro==='personalizado'),onClick:function(){setKpiFiltro('personalizado');}},'Rango'),
        kpiFiltro==='personalizado'&&React.createElement(React.Fragment,null,
          React.createElement('input',{type:'date',value:kpiFechaDesde,onChange:function(e){setKpiFechaDesde(e.target.value);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12}}),
          React.createElement('span',{style:{color:'var(--text-soft)',fontSize:12}},'al'),
          React.createElement('input',{type:'date',value:kpiFechaHasta,onChange:function(e){setKpiFechaHasta(e.target.value);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12}})
        ),
        React.createElement('button',{style:btnStyle(false),disabled:cargando,onClick:cargarEnvios},cargando?'Actualizando...':'↺ Actualizar'),
        React.createElement('button',{style:{marginLeft:'auto',padding:'6px 16px',borderRadius:8,border:'1px solid rgba(200,168,75,0.4)',background:'rgba(200,168,75,0.08)',color:'var(--gold)',fontWeight:700,fontSize:12,cursor:'pointer'},onClick:exportarKpiExcel},'📥 Exportar Excel'),
        ultimaActualizacion&&React.createElement('span',{style:{fontSize:10,color:'var(--text-soft)'}},'Datos al '+ultimaActualizacion.toLocaleTimeString('es-CL'))
      ),

      historialLimitado&&React.createElement('div',{className:'info-banner',style:{marginBottom:16,background:'rgba(200,168,75,0.1)'}},'⚠ El rango elegido tiene más de '+LIMITE_HISTORIAL.toLocaleString('es-CL')+' envíos — los datos de tiempos, reintentos y correcciones no se calculan para evitar sobrecargar el sistema. Producción, efectividad y geografía sí se muestran igual. Achica el rango para ver el detalle completo.'),
      cargandoHistKpi&&React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:12}},'⏳ Cargando historial detallado de tiempos y calidad...'),

      // ---- Cierre de flota ----
      // Rediseño "briefing ejecutivo": antes era una sola oración larga con nombres en negrita
      // mezclados -- ahora es un encabezado con indicador de estado + hora, una línea compacta de
      // cifras clave, y dos tarjetas separadas (Destacados / Requiere atención) con pastillas
      // legibles en vez de texto corrido. El corte de las 8:00 PM (mensajeros bajo 80% de
      // efectividad a esa hora, viendo "Hoy") vive dentro de la tarjeta de "Requiere atención".
      React.createElement('div',{className:'panel',style:{marginBottom:20,background:'linear-gradient(145deg,#ffffff,#f5eedc)',border:'1px solid rgba(200,168,75,0.3)'}},
        React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:2}},
          React.createElement('div',{className:'panel-title',style:{marginBottom:0}},'🏁 Cierre de Flota'),
          React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}},
            corte8pmActivo&&React.createElement('span',{style:{fontSize:10,fontWeight:800,letterSpacing:0.5,padding:'5px 12px',borderRadius:999,background:'rgba(176,48,48,0.1)',border:'1px solid rgba(176,48,48,0.35)',color:'var(--danger)'}},'🕗 CORTE 8:00 PM ACTIVO'),
            React.createElement('span',{style:{fontSize:10,fontWeight:800,letterSpacing:0.5,padding:'5px 12px',borderRadius:999,background:estadoInfoFlota.bg,border:'1px solid '+estadoInfoFlota.border,color:estadoInfoFlota.color}},estadoInfoFlota.icono+' '+estadoInfoFlota.texto.toUpperCase())
          )
        ),
        React.createElement('div',{style:{display:'flex',flexWrap:'wrap',gap:'6px 16px',alignItems:'baseline',fontSize:12.5,color:'var(--text-soft)',margin:'10px 0 16px',fontFamily:'JetBrains Mono'}},
          React.createElement('span',null,React.createElement('strong',{style:{color:'var(--text)',fontSize:15}},fleetTotal.toLocaleString('es-CL')),' gestionados'),
          React.createElement('span',{style:{opacity:0.4}},'·'),
          React.createElement('span',null,React.createElement('strong',{style:{color:'var(--success)',fontSize:15}},fleetEntregados.toLocaleString('es-CL')),' entregados ('+fleetEfectividad+'%)'),
          React.createElement('span',{style:{opacity:0.4}},'·'),
          React.createElement('span',null,React.createElement('strong',{style:{color:'var(--text)',fontSize:15}},conActividad.length+'/'+kpiPorMensajero.length),' mensajeros activos'),
          sinActividad.length>0&&React.createElement(React.Fragment,null,React.createElement('span',{style:{opacity:0.4}},'·'),React.createElement('span',null,sinActividad.length+' sin actividad registrada')),
          React.createElement('span',{style:{opacity:0.4}},'·'),
          React.createElement('span',null,React.createElement('strong',{style:{color:'var(--text)',fontSize:15}},fmt(fleetMonto)),' cobrado')
        ),
        React.createElement('div',{style:{display:'flex',flexWrap:'wrap',gap:14,marginBottom:18}},
          briefCard('✅','Destacados','good',destacadosChips,null),
          briefCard('⚠','Requiere atención','bad',urgentesChips,React.createElement(React.Fragment,null,corte8pmBlock,chipDetallePanel))
        ),
        React.createElement('div',{className:'stats-grid'},
          [{label:'Gestionados',val:fleetTotal,cls:''},{label:'Entregados',val:fleetEntregados,cls:'green'},{label:'Restante Pendiente',val:fleetPendiente,cls:fleetPendiente>0?'gold':''},{label:'Efectividad Flota',val:fleetEfectividad+'%',cls:fleetEfectividad>=95?'green':'red'},{label:'$ Cobrado',val:fmt(fleetMonto),cls:'green'},{label:'Atrasados',val:fleetAtrasados,cls:fleetAtrasados>0?'red':''},{label:'Mensajeros Activos',val:conActividad.length+'/'+kpiPorMensajero.length,cls:''},{label:'Piezas c/Atraso en Entrega',val:historialDisponible?fleetPiezasAtraso:'—',cls:historialDisponible&&fleetPiezasAtraso>0?'red':''}].map(function(s){return statTile(s.label,s.val,s.cls);})
        )
      ),

      // ---- Pendientes atrasados de toda la flota (agregado de todos los mensajeros) ----
      fleetPendientesAtrasados.length>0&&React.createElement('div',{style:{marginBottom:20,border:'2px solid var(--danger)',borderRadius:10,overflow:'hidden',boxShadow:'0 2px 10px rgba(176,48,48,0.25)'}},
        React.createElement('div',{style:{background:'var(--danger)',color:'#fff',padding:'12px 18px',fontSize:13,fontWeight:700,letterSpacing:0.3,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}},
          React.createElement('span',null,'🚨 PENDIENTES ATRASADOS DE LA FLOTA ('+fleetPendientesAtrasados.length+') — sin entregar hace '+UMBRAL_ATRASO_DIAS+'+ días desde su recepción'),
          React.createElement('button',{onClick:function(){exportarFleetPendientesAtrasadosExcel();},style:{padding:'5px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.15)',color:'#fff',fontWeight:700,fontSize:11,cursor:'pointer'}},'📥 Exportar Excel')
        ),
        React.createElement('div',{style:{maxHeight:320,overflowY:'auto',background:'#fff'}},
          React.createElement('table',{style:{width:'100%',fontSize:11}},
            React.createElement('thead',null,React.createElement('tr',{style:{background:'rgba(176,48,48,0.08)',position:'sticky',top:0}},
              React.createElement('th',{style:{textAlign:'left',padding:'6px 10px'}},'Código'),
              React.createElement('th',{style:{padding:'6px 10px'}},'Cliente'),
              React.createElement('th',{style:{padding:'6px 10px'}},'Comuna'),
              React.createElement('th',{style:{padding:'6px 10px'}},'Mensajero'),
              React.createElement('th',{style:{padding:'6px 10px'}},'Estado'),
              React.createElement('th',{style:{padding:'6px 10px'}},'Recepción'),
              React.createElement('th',{style:{padding:'6px 10px'}},'Días esperando')
            )),
            React.createElement('tbody',null,fleetPendientesAtrasados.slice(0,200).map(function(x,i){
              return React.createElement('tr',{key:x.codigo+'_'+i,style:{background:i%2===0?'rgba(176,48,48,0.04)':'#fff'}},
                React.createElement('td',{style:{padding:'5px 10px',fontFamily:'JetBrains Mono'}},x.codigo),
                React.createElement('td',{style:{padding:'5px 10px'}},x.cliente),
                React.createElement('td',{style:{padding:'5px 10px'}},x.comuna),
                React.createElement('td',{style:{padding:'5px 10px'}},x.mensajero),
                React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},estadoInfo(x.estado).label),
                React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},x.fecha),
                React.createElement('td',{style:{padding:'5px 10px',textAlign:'center',fontWeight:700,color:'var(--danger)'}},x.dias+' día'+(x.dias!==1?'s':''))
              );
            }))
          )
        ),
        fleetPendientesAtrasados.length>200&&React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',padding:'6px 10px',background:'#fff'}},'Mostrando 200 de '+fleetPendientesAtrasados.length+'.')
      ),

      // ---- Tendencia 14 días ----
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}},
        React.createElement('div',{className:'panel'},
          React.createElement('div',{className:'panel-title'},'Envíos gestionados por día (últimos 14 días)'),
          React.createElement(MiniLineChart,{data:tendencia14.map(function(d){return{x:d.fecha,label:d.label,y:d.total};}),color:'#2e7d4f',valueFmt:function(v){return v+' envíos';}})
        ),
        React.createElement('div',{className:'panel'},
          React.createElement('div',{className:'panel-title'},'Efectividad de la flota por día (últimos 14 días)'),
          React.createElement(MiniLineChart,{data:tendencia14.map(function(d){return{x:d.fecha,label:d.label,y:d.efectividad};}),color:'#C8A84B',valueFmt:function(v){return v+'%';}})
        )
      ),

      // ---- Ranking por mensajero ----
      React.createElement('div',{className:'panel'},
        React.createElement('div',{className:'panel-title'},'Detalle y ranking por mensajero'),
        kpiPorMensajero.length===0?React.createElement('div',{className:'empty-state'},cargando?'⏳ Cargando datos...':'Sin mensajeros registrados'):
        React.createElement('div',{className:'table-wrap'},React.createElement('table',null,
          React.createElement('thead',null,React.createElement('tr',null,
            React.createElement('th',null,'#'),React.createElement('th',null,'Mensajero'),
            React.createElement('th',{style:{textAlign:'center'}},'Total'),React.createElement('th',{style:{textAlign:'center'}},'Entregados'),
            React.createElement('th',{style:{textAlign:'center'}},'Efectividad'),React.createElement('th',{style:{textAlign:'center'}},'Falla %'),
            React.createElement('th',{style:{textAlign:'center'}},'Atrasados'),React.createElement('th',{style:{textAlign:'center'}},'$ Cobrado'),
            React.createElement('th',{style:{textAlign:'center'}},'Comunas'),React.createElement('th',null)
          )),
          React.createElement('tbody',null,[].concat.apply([],kpiPorMensajero.map(function(m,i){
            var posicion=(m.total>=3)?(rankeables.indexOf(m)+1):null;
            var isExp=expandido===m.norm;
            var filas=[React.createElement('tr',{key:m.norm,style:{background:isExp?'rgba(200,168,75,0.06)':(i%2===0?'#fff':'var(--cream)'),cursor:'pointer',opacity:m.total===0?0.6:1},onClick:function(){setExpandido(isExp?null:m.norm);setFiltroEstadoDetalle('todos');setBuscarEnvioDetalle('');setTendGranularidad('dia');}},
              React.createElement('td',{className:'mono',style:{textAlign:'center',color:'var(--text-soft)'}},posicion?('#'+posicion):'—'),
              React.createElement('td',{style:{fontWeight:700}},m.nombre,!m.enRosterActivo&&React.createElement('span',{style:{marginLeft:6,fontSize:9,color:'var(--text-soft)',fontWeight:400,fontStyle:'italic'}},'(inactivo/fuera de roster)')),
              React.createElement('td',{className:'mono',style:{textAlign:'center'}},m.total),
              React.createElement('td',{className:'mono',style:{textAlign:'center',color:'var(--success)'}},m.entregados),
              React.createElement('td',{style:{minWidth:110}},m.total>0?React.createElement(KpiBar,{value:m.efectividad/100}):React.createElement('span',{style:{fontSize:11,color:'var(--text-soft)'}},'—')),
              React.createElement('td',{className:'mono',style:{textAlign:'center',color:m.tasaFalla>20?'var(--danger)':'var(--text-soft)'}},m.total>0?m.tasaFalla+'%':'—'),
              React.createElement('td',{className:'mono',style:{textAlign:'center',color:m.atrasados>0?'var(--danger)':'var(--text-soft)',fontWeight:m.atrasados>0?700:400}},m.atrasados),
              React.createElement('td',{className:'mono',style:{textAlign:'center'}},fmt(m.montoCobrado)),
              React.createElement('td',{className:'mono',style:{textAlign:'center'}},m.comunas),
              React.createElement('td',{style:{textAlign:'center',color:'var(--gold)',fontSize:11}},isExp?'▲ Cerrar':'▼ Ver detalle')
            )];
            if(isExp){
              var tendM=tendenciaDeMensajero(m.norm,tendGranularidad);
              filas.push(React.createElement('tr',{key:m.norm+'_det'},React.createElement('td',{colSpan:10,style:{padding:0}},
                React.createElement('div',{style:{padding:'18px 20px',background:'var(--cream)',borderTop:'1px solid var(--border)',borderBottom:'2px solid var(--gold)'}},
                  React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:16}},
                    [{label:'Reintentos',val:m.reintentos==null?'—':m.reintentos},
                     {label:'Correcciones de admin',val:m.correccionesAdmin==null?'—':m.correccionesAdmin,warn:m.correccionesAdmin>0},
                     {label:'% Con foto evidencia',val:m.pctFoto==null?'—':m.pctFoto+'%',warn:m.pctFoto!=null&&m.pctFoto<80},
                     {label:'% Con nota',val:m.pctNota==null?'—':m.pctNota+'%'},
                     {label:'Horas activas',val:fmtHoras(m.horasActivas)},
                     {label:'Ritmo (entregas/h)',val:m.ritmo==null?'—':m.ritmo.toFixed(1)},
                     {label:'Duración prom. reparto',val:fmtMin(m.duracionRepartoProm)},
                     {label:'$ Pendiente en ruta',val:fmt(m.montoPendiente)},
                     {label:'Piezas c/atraso en entrega',val:m.entregasConAtraso==null?'—':m.entregasConAtraso.length,warn:m.entregasConAtraso&&m.entregasConAtraso.length>0},
                     {label:'Pendientes atrasados',val:m.pendientesAtrasados.length,warn:m.pendientesAtrasados.length>0}
                    ].map(function(x){return React.createElement('div',{key:x.label,style:{background:'#fff',borderRadius:8,padding:'10px 12px',border:'1px solid '+(x.warn?'rgba(176,48,48,0.3)':'var(--border)')}},
                      React.createElement('div',{style:{fontSize:9,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}},x.label),
                      React.createElement('div',{style:{fontFamily:'JetBrains Mono',fontSize:16,fontWeight:700,color:x.warn?'var(--danger)':'var(--dark)'}},x.val)
                    );})
                  ),
                  React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:10}},
                    React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:1}},'Tendencia del mensajero — '+TEND_GRANULARIDAD_LABEL[tendGranularidad]),
                    React.createElement('div',{style:{display:'flex',gap:6},onClick:function(ev){ev.stopPropagation();}},
                      [{val:'dia',label:'Día'},{val:'semana',label:'Semana'},{val:'quincena',label:'Quincena'},{val:'mes',label:'Mes'}].map(function(g){
                        var activo=tendGranularidad===g.val;
                        return React.createElement('button',{key:g.val,onClick:function(ev){ev.stopPropagation();setTendGranularidad(g.val);},style:{padding:'3px 10px',borderRadius:7,border:'1px solid '+(activo?'var(--gold)':'var(--border)'),background:activo?'rgba(200,168,75,0.14)':'#fff',color:activo?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:10.5,cursor:'pointer'}},g.label);
                      })
                    )
                  ),
                  React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}},
                    React.createElement('div',null,React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginBottom:6,textTransform:'uppercase',letterSpacing:1}},'Entregas por período'),React.createElement(MiniLineChart,{data:tendM.map(function(d){return{x:d.fecha,label:d.label,y:d.entregados};}),color:'#2e7d4f',compact:true,height:70,valueFmt:function(v){return v+' entregas';}})),
                    React.createElement('div',null,React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginBottom:6,textTransform:'uppercase',letterSpacing:1}},'Efectividad por período'),React.createElement(MiniLineChart,{data:tendM.map(function(d){return{x:d.fecha,label:d.label,y:d.efectividad};}),color:'#C8A84B',compact:true,height:70,valueFmt:function(v){return v+'%';}}))
                  ),
                  React.createElement('div',null,
                    React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginBottom:8,textTransform:'uppercase',letterSpacing:1}},'Estados en el período — clic en una tarjeta para filtrar la tabla de abajo'),
                    // Mismas tarjetas de estado que el Dashboard (clases .stat-card/.stat-value/.stat-sub,
                    // colores por estado), pero ademas clickeables como filtro -- al estilo del Portal de
                    // Clientes: clic activa el filtro (resaltado con borde de color), clic de nuevo lo quita.
                    React.createElement('div',{className:'stats-grid',style:{marginBottom:12}},
                      [{val:'todos',label:'Total',color:'var(--gold)',cls:'gold',cnt:m.total}].concat(
                        ESTADOS_ENVIO.filter(function(es){return (m.porEstado[es.val]||0)>0;}).map(function(es){
                          var cls=es.val==='en_bodega'?'teal':es.val==='en_ruta'?'gold':es.val==='entregado'?'green':es.val==='reprogramado'?'purple':es.val==='cancelado'?'red':es.val==='siniestro'?'orange':es.val==='retorno'?'brown':es.val==='en_bodega_cancelado'?'rust':'orange';
                          return{val:es.val,label:es.label,color:es.color,cls:cls,cnt:m.porEstado[es.val]||0};
                        })
                      ).map(function(s){
                        var activo=filtroEstadoDetalle===s.val;
                        return React.createElement('div',{
                          key:s.val,
                          className:'stat-card',
                          onClick:function(ev){ev.stopPropagation();setFiltroEstadoDetalle(activo?'todos':s.val);},
                          style:{cursor:'pointer','--card-accent':s.color,borderTop:'4px solid '+s.color,border:'2px solid '+(activo?s.color:'rgba(200,168,75,0.18)'),boxShadow:activo?'0 0 0 3px '+s.color+'22':undefined}
                        },
                          React.createElement('div',{className:'stat-label'},s.label),
                          React.createElement('div',{className:'stat-value '+s.cls},s.cnt.toLocaleString('es-CL')),
                          React.createElement('div',{className:'stat-sub'},m.total>0?(s.cnt/m.total*100).toFixed(1)+'%':'—')
                        );
                      })
                    ),
                    (function(){
                      var qEnvioDetalle=(buscarEnvioDetalle||'').trim().toLowerCase();
                      var listaFiltrada=m.propios.filter(function(e){
                        if(filtroEstadoDetalle!=='todos'&&e.estado!==filtroEstadoDetalle)return false;
                        if(qEnvioDetalle&&(String(e.codigo||'').toLowerCase().indexOf(qEnvioDetalle)===-1&&String(e.cliente||'').toLowerCase().indexOf(qEnvioDetalle)===-1&&String(e.comuna||'').toLowerCase().indexOf(qEnvioDetalle)===-1))return false;
                        return true;
                      });
                      return React.createElement(React.Fragment,null,
                        React.createElement('div',{onClick:function(ev){ev.stopPropagation();},style:{position:'relative',marginBottom:8,maxWidth:280}},
                          React.createElement('input',{type:'text',value:buscarEnvioDetalle,onChange:function(ev){setBuscarEnvioDetalle(ev.target.value);},placeholder:'🔎 Buscar por código, cliente o comuna...',style:{width:'100%',padding:'7px 12px',borderRadius:7,border:'1px solid var(--border)',fontSize:11.5,background:'#fff',boxSizing:'border-box'}}),
                          buscarEnvioDetalle&&React.createElement('button',{onClick:function(ev){ev.stopPropagation();setBuscarEnvioDetalle('');},title:'Limpiar búsqueda',style:{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',border:'none',background:'none',color:'var(--text-soft)',cursor:'pointer',fontSize:13,fontWeight:700,padding:'2px 4px'}},'✕')
                        ),
                        React.createElement('div',{style:{maxHeight:240,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8,background:'#fff'}},
                          React.createElement('table',{style:{width:'100%',fontSize:11}},
                            React.createElement('thead',null,React.createElement('tr',null,
                              React.createElement('th',{style:{textAlign:'left',padding:'6px 10px'}},'Código'),
                              React.createElement('th',{style:{padding:'6px 10px'}},'Cliente'),
                              React.createElement('th',{style:{padding:'6px 10px'}},'Comuna'),
                              React.createElement('th',{style:{padding:'6px 10px'}},'Estado'),
                              React.createElement('th',{style:{padding:'6px 10px'}},'Fecha'),
                              React.createElement('th',{style:{padding:'6px 10px'}},'Monto'),
                              React.createElement('th',{style:{padding:'6px 10px'}},'')
                            )),
                            React.createElement('tbody',null,
                              listaFiltrada.length===0?React.createElement('tr',null,React.createElement('td',{colSpan:7,style:{padding:'16px 10px',textAlign:'center',color:'var(--text-soft)',fontSize:11.5}},qEnvioDetalle?'Sin resultados para "'+buscarEnvioDetalle+'".':'Sin envíos para este filtro.')):
                              listaFiltrada.slice(0,200).map(function(e){
                                return React.createElement('tr',{key:e.id||e.codigo},
                                  React.createElement('td',{style:{padding:'5px 10px',fontFamily:'JetBrains Mono'}},e.codigo),
                                  React.createElement('td',{style:{padding:'5px 10px'}},e.cliente),
                                  React.createElement('td',{style:{padding:'5px 10px'}},e.comuna),
                                  React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},estadoInfo(e.estado).label),
                                  React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},e.fecha),
                                  React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},fmt(e.monto)),
                                  React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},
                                    React.createElement('button',{className:'action-btn btn-edit',onClick:function(ev){ev.stopPropagation();setVerEnvio(e);}},'Ver')
                                  )
                                );
                              })
                            )
                          )
                        ),
                        listaFiltrada.length>200&&React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginTop:4}},'Mostrando 200 de '+listaFiltrada.length+'.')
                      );
                    })()
                  ),
                  m.rutas&&m.rutas.length>0&&React.createElement('div',{style:{marginTop:16}},
                    React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginBottom:8,textTransform:'uppercase',letterSpacing:1,fontWeight:700}},'Rutas del período ('+m.rutas.length+') — turnos concretos detectados, no un promedio'),
                    React.createElement('div',{style:{maxHeight:220,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8,background:'#fff'}},
                      React.createElement('table',{style:{width:'100%',fontSize:11}},
                        React.createElement('thead',null,React.createElement('tr',null,
                          React.createElement('th',{style:{textAlign:'left',padding:'6px 10px'}},'Día'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Inicio'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Término'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Duración'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Entregas')
                        )),
                        React.createElement('tbody',null,m.rutas.map(function(r,ri){
                          return React.createElement('tr',{key:r.dia+'_'+ri},
                            React.createElement('td',{style:{padding:'5px 10px',fontFamily:'JetBrains Mono'}},fmtDiaCorto(r.dia)),
                            React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},fmtHora(r.inicio)),
                            React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},fmtHora(r.fin)),
                            React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},fmtHoras(r.duracionH)),
                            React.createElement('td',{style:{padding:'5px 10px',textAlign:'center',fontWeight:700}},r.entregas)
                          );
                        }))
                      )
                    )
                  ),
                  // Pendientes atrasados: a diferencia de "Piezas entregadas con atraso" (abajo, que es
                  // historico -- paquetes que YA se entregaron pero tarde), esta caja es la urgente: paquetes
                  // de este mensajero que TODAVIA no llegan al cliente y ya llevan dias de mas desde que se
                  // recibieron (en bodega, en ruta o reprogramados). El aviso equivalente en Gestion de Envios
                  // es muy discreto y pasa desapercibido -- aca se muestra con un banner solido bien notorio,
                  // no un simple borde de color.
                  m.pendientesAtrasados.length>0&&React.createElement('div',{style:{marginTop:16,marginBottom:16,border:'2px solid var(--danger)',borderRadius:10,overflow:'hidden',boxShadow:'0 2px 10px rgba(176,48,48,0.25)'}},
                    React.createElement('div',{style:{background:'var(--danger)',color:'#fff',padding:'10px 16px',fontSize:12,fontWeight:700,letterSpacing:0.3,display:'flex',alignItems:'center',gap:8}},
                      '🚨 PENDIENTES ATRASADOS ('+m.pendientesAtrasados.length+') — sin entregar hace '+UMBRAL_ATRASO_DIAS+'+ días desde su recepción'
                    ),
                    React.createElement('div',{style:{maxHeight:220,overflowY:'auto',background:'#fff'}},
                      React.createElement('table',{style:{width:'100%',fontSize:11}},
                        React.createElement('thead',null,React.createElement('tr',{style:{background:'rgba(176,48,48,0.08)'}},
                          React.createElement('th',{style:{textAlign:'left',padding:'6px 10px'}},'Código'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Cliente'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Comuna'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Estado'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Recepción'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Días esperando')
                        )),
                        React.createElement('tbody',null,m.pendientesAtrasados.slice(0,30).map(function(x){
                          return React.createElement('tr',{key:x.codigo,style:{background:'rgba(176,48,48,0.04)'}},
                            React.createElement('td',{style:{padding:'5px 10px',fontFamily:'JetBrains Mono'}},x.codigo),
                            React.createElement('td',{style:{padding:'5px 10px'}},x.cliente),
                            React.createElement('td',{style:{padding:'5px 10px'}},x.comuna),
                            React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},estadoInfo(x.estado).label),
                            React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},x.fecha),
                            React.createElement('td',{style:{padding:'5px 10px',textAlign:'center',fontWeight:700,color:'var(--danger)'}},x.dias+' día'+(x.dias!==1?'s':''))
                          );
                        }))
                      )
                    ),
                    m.pendientesAtrasados.length>30&&React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',padding:'6px 10px',background:'#fff'}},'Mostrando 30 de '+m.pendientesAtrasados.length+'.')
                  ),
                  m.entregasConAtraso&&m.entregasConAtraso.length>0&&React.createElement('div',{style:{marginTop:16}},
                    React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,flexWrap:'wrap',gap:8}},
                      React.createElement('div',{style:{fontSize:10,color:'var(--danger)',textTransform:'uppercase',letterSpacing:1,fontWeight:700}},'⚠ Piezas entregadas con atraso ('+m.entregasConAtraso.length+') — recibidas días antes de ser entregadas'),
                      React.createElement('button',{onClick:function(ev){ev.stopPropagation();exportarAtrasoPDF(m);},style:{padding:'5px 12px',borderRadius:8,border:'1px solid rgba(200,168,75,0.4)',background:'rgba(200,168,75,0.08)',color:'var(--gold)',fontWeight:700,fontSize:11,cursor:'pointer'}},'📄 Exportar reporte PDF')
                    ),
                    React.createElement('div',{style:{maxHeight:200,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8,background:'#fff'}},
                      React.createElement('table',{style:{width:'100%',fontSize:11}},
                        React.createElement('thead',null,React.createElement('tr',null,
                          React.createElement('th',{style:{textAlign:'left',padding:'6px 10px'}},'Código'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Cliente'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Recepción'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Entrega'),
                          React.createElement('th',{style:{padding:'6px 10px'}},'Días')
                        )),
                        React.createElement('tbody',null,m.entregasConAtraso.slice(0,20).map(function(x){
                          return React.createElement('tr',{key:x.codigo},
                            React.createElement('td',{style:{padding:'5px 10px',fontFamily:'JetBrains Mono'}},x.codigo),
                            React.createElement('td',{style:{padding:'5px 10px'}},x.cliente),
                            React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},x.fechaRecepcion),
                            React.createElement('td',{style:{padding:'5px 10px',textAlign:'center'}},x.fechaEntrega),
                            React.createElement('td',{style:{padding:'5px 10px',textAlign:'center',fontWeight:700,color:'var(--danger)'}},x.diasAtraso)
                          );
                        }))
                      )
                    ),
                    m.entregasConAtraso.length>20&&React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginTop:4}},'Mostrando 20 de '+m.entregasConAtraso.length+' — exporta el PDF para ver el listado completo.')
                  )
                )
              )));
            }
            return filas;
          })))
        ))
      )
    ),
    verEnvioModal
  );
}
window.Analitica = Analitica;
})();
