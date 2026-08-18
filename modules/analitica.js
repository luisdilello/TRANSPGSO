(function(){
var useState=React.useState, useEffect=React.useEffect, useMemo=React.useMemo;
var db=window.__app.db;
var estadoInfo=window.__app.estadoInfo, ESTADOS_ENVIO=window.__app.ESTADOS_ENVIO;
var esEnvioAtrasado=window.__app.esEnvioAtrasado, diasDesdeFecha=window.__app.diasDesdeFecha;
var UMBRAL_ATRASO_DIAS=window.__app.UMBRAL_ATRASO_DIAS, KpiBar=window.__app.KpiBar, fmt=window.__app.fmt;
var exportToExcel=window.__app.exportToExcel;

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
  return envios.filter(function(e){
    var f=new Date((e.fecha||'')+'T12:00:00');
    if(isNaN(f.getTime()))f=new Date(e.fecha||hoy);
    if(filtro==='hoy'){return f>=inicioDia(hoy)&&f<=finDia(hoy);}
    if(filtro==='semana'){return f>=lunesDe(hoy);}
    if(filtro==='mes'){return f>=new Date(hoy.getFullYear(),hoy.getMonth(),1);}
    if(filtro==='personalizado'&&fechaDesde&&fechaHasta){return f>=new Date(fechaDesde+'T00:00:00')&&f<=new Date(fechaHasta+'T23:59:59');}
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
function fmtHoras(h){if(h==null||!isFinite(h))return '—';if(h<1)return Math.round(h*60)+' min';return h.toFixed(1)+' h';}
function fmtMin(m){if(m==null||!isFinite(m))return '—';if(m<60)return Math.round(m)+' min';return (m/60).toFixed(1)+' h';}
function badgeColor(pct){return pct>=80?'var(--success)':pct>=60?'var(--warning)':'var(--danger)';}

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
    var entregadosArr=propios.filter(function(e){return e.estado==='entregado';});
    var conFoto=entregadosArr.filter(function(e){return tieneFotoEntrega(e.fotos_entrega);}).length;
    var conNota=propios.filter(function(e){return (e.nota||'').trim().length>0;}).length;
    var pctFoto=entregadosArr.length>0?Math.round(conFoto/entregadosArr.length*100):null;
    var pctNota=total>0?Math.round(conNota/total*100):null;

    var reintentos=null, correccionesAdmin=null, primeraAccion=null, ultimaAccion=null, horasActivas=null, ritmo=null, duracionRepartoProm=null;
    if(historialDisponible){
      reintentos=0; correccionesAdmin=0;
      propios.forEach(function(e){
        var hs=histPorCodigo[e.codigo]||[];
        var enRutaCount=hs.filter(function(h){return h.estado==='en_ruta';}).length;
        if(enRutaCount>1)reintentos+=(enRutaCount-1);
        hs.forEach(function(h){if((h.nota||'').indexOf('Revertido desde')!==-1)correccionesAdmin++;});
      });
      var historialDelRider=historial.filter(function(h){return h.canal==='app_mensajero'&&normNombreLocal(h.usuario)===norm;});
      if(historialDelRider.length>0){
        var tiempos=historialDelRider.map(function(h){return new Date(h.created_at).getTime();}).sort(function(a,b){return a-b;});
        primeraAccion=tiempos[0]; ultimaAccion=tiempos[tiempos.length-1];
        if(historialDelRider.length>=2){
          horasActivas=(ultimaAccion-primeraAccion)/3600000;
          if(horasActivas>0.15&&entregados>0)ritmo=entregados/horasActivas;
        }
      }
      var deltas=[];
      entregadosArr.forEach(function(e){
        var hs=histPorCodigo[e.codigo]||[];
        var enRutaEv=hs.find(function(h){return h.estado==='en_ruta';});
        var entregadoEv=hs.find(function(h){return h.estado==='entregado';});
        if(enRutaEv&&entregadoEv){
          var delta=(new Date(entregadoEv.created_at)-new Date(enRutaEv.created_at))/60000;
          if(delta>0&&delta<1080)deltas.push(delta);
        }
      });
      if(deltas.length>0)duracionRepartoProm=deltas.reduce(function(a,b){return a+b;},0)/deltas.length;
    }

    return{
      nombre:nombre, norm:norm, enRosterActivo:enRosterActivo,
      total:total, entregados:entregados, porEstado:porEstado, efectividad:efectividad, tasaFalla:tasaFalla,
      montoCobrado:montoCobrado, montoPendiente:montoPendiente, comunas:comunas.size,
      atrasados:atrasados, pctFoto:pctFoto, pctNota:pctNota,
      reintentos:reintentos, correccionesAdmin:correccionesAdmin,
      primeraAccion:primeraAccion, ultimaAccion:ultimaAccion, horasActivas:horasActivas, ritmo:ritmo,
      duracionRepartoProm:duracionRepartoProm
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
        var rows=[];var offset=0;var BLOQUE=1000;
        while(true){
          var r=await db.from('envios').select(COLS).neq('estado','eliminado').range(offset,offset+BLOQUE-1);
          if(r.error)throw r.error;
          var data=r.data||[];
          rows=rows.concat(data);
          if(data.length<BLOQUE)break;
          offset+=BLOQUE;
        }
        setEnvios(rows);
        setUltimaActualizacion(new Date());
      }catch(e){
        console.warn('Analitica: error cargando envios desde Supabase:',e.message);
      }
      setCargando(false);
    })();
  }
  useEffect(function(){cargarEnvios();},[]);

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
  var entregados=filtrados.filter(function(e){return e.estado==='entregado';}).length;
  var enRuta=filtrados.filter(function(e){return e.estado==='en_ruta';}).length;
  var reprog=filtrados.filter(function(e){return e.estado==='reprogramado';}).length;
  var cancelados=filtrados.filter(function(e){return e.estado==='cancelado';}).length;
  var efectividad=total>0?Math.round(entregados/total*100):0;
  var porCliente={};
  filtrados.forEach(function(e){var c=e.cliente||'Sin cliente';if(!porCliente[c])porCliente[c]={total:0,entregados:0};porCliente[c].total++;if(e.estado==='entregado')porCliente[c].entregados++;});
  var clientesArr=Object.entries(porCliente).sort(function(a,b){return b[1].total-a[1].total;}).slice(0,10);
  var porMen={};
  filtrados.forEach(function(e){var m=e.mensajero||'Sin asignar';if(!porMen[m])porMen[m]={total:0,entregados:0};porMen[m].total++;if(e.estado==='entregado')porMen[m].entregados++;});
  var mensArr=Object.entries(porMen).filter(function(x){return x[0]!=='Sin asignar';}).sort(function(a,b){return b[1].entregados-a[1].entregados;}).slice(0,10);

  // ---- Filtros y datos del panel "KPI Mensajeros" ----
  var _kf=useState('hoy'),kpiFiltro=_kf[0],setKpiFiltro=_kf[1];
  var _kfd=useState(''),kpiFechaDesde=_kfd[0],setKpiFechaDesde=_kfd[1];
  var _kfh=useState(''),kpiFechaHasta=_kfh[0],setKpiFechaHasta=_kfh[1];
  var _exp=useState(null),expandido=_exp[0],setExpandido=_exp[1];
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
        var resultados=await Promise.all(lotes.map(function(lote){
          return db.from('historial_envios').select('codigo_envio,estado,usuario,canal,nota,created_at').in('codigo_envio',lote);
        }));
        var rows=[];resultados.forEach(function(r){if(!r.error)rows=rows.concat(r.data||[]);});
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

  function tendenciaDeMensajero(norm){
    var hoyD=new Date();var dias=[];
    for(var i=13;i>=0;i--){var d=new Date(hoyD);d.setDate(d.getDate()-i);dias.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'));}
    var porDia={};dias.forEach(function(d){porDia[d]={total:0,entregados:0};});
    envios.forEach(function(e){if(normNombreLocal(e.mensajero)!==norm)return;var f=(e.fecha||'').slice(0,10);if(porDia[f]){porDia[f].total++;if(e.estado==='entregado')porDia[f].entregados++;}});
    return dias.map(function(d){var x=porDia[d];var dd=d.slice(8,10)+'-'+d.slice(5,7);return{fecha:d,label:dd,total:x.total,entregados:x.entregados,efectividad:x.total>0?Math.round(x.entregados/x.total*100):0};});
  }

  // Cierre de flota (resumen automático del período elegido en KPI)
  var fleetTotal=enviosPeriodoKpi.length;
  var fleetEntregados=enviosPeriodoKpi.filter(function(e){return e.estado==='entregado';}).length;
  var fleetEfectividad=fleetTotal>0?Math.round(fleetEntregados/fleetTotal*100):0;
  var fleetMonto=enviosPeriodoKpi.filter(function(e){return e.estado==='entregado';}).reduce(function(a,e){return a+(e.monto||0);},0);
  var fleetAtrasados=enviosPeriodoKpi.filter(function(e){return esEnvioAtrasado(e);}).length;
  var conActividad=kpiPorMensajero.filter(function(m){return m.total>0;});
  var sinActividad=kpiPorMensajero.filter(function(m){return m.total===0;});
  var rankeables=conActividad.filter(function(m){return m.total>=3;});
  var mejorMen=rankeables.length>0?rankeables[0]:null; // ya viene ordenado por efectividad desc
  var necesitanAtencion=rankeables.filter(function(m){return m.efectividad<70;});

  var btnStyle=function(active){return{padding:'6px 16px',borderRadius:8,border:'1px solid '+(active?'var(--gold)':'var(--border)'),background:active?'rgba(200,168,75,0.12)':'#fff',color:active?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer'};};
  var subTabStyle=function(active){return{padding:'9px 20px',borderRadius:9,border:'1px solid '+(active?'var(--gold)':'var(--border)'),background:active?'linear-gradient(145deg,#fff,#f5eedc)':'#fff',color:active?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer',letterSpacing:0.5};};

  function statTile(label,val,cls){
    return React.createElement('div',{key:label,className:'stat-card'},React.createElement('div',{className:'stat-label'},label),React.createElement('div',{className:'stat-value '+(cls||'')},val));
  }

  function exportarKpiExcel(){
    var headers=['Mensajero','Total','Entregados','En Ruta','Reprogramados','Cancelados','Retorno','En Bodega Cancelado','Efectividad %','Tasa Falla %','$ Cobrado','$ Pendiente','Comunas','Atrasados','% Con Foto','% Con Nota','Reintentos','Correcciones Admin','Ritmo (entregas/h)','Duración Prom. Reparto (min)'];
    var rows=kpiPorMensajero.map(function(m){
      return[m.nombre,m.total,m.entregados,m.porEstado.en_ruta||0,m.porEstado.reprogramado||0,m.porEstado.cancelado||0,m.porEstado.retorno||0,m.porEstado.en_bodega_cancelado||0,
        m.efectividad,m.tasaFalla,m.montoCobrado,m.montoPendiente,m.comunas,m.atrasados,
        m.pctFoto==null?'—':m.pctFoto,m.pctNota==null?'—':m.pctNota,
        m.reintentos==null?'—':m.reintentos,m.correccionesAdmin==null?'—':m.correccionesAdmin,
        m.ritmo==null?'—':m.ritmo.toFixed(2),m.duracionRepartoProm==null?'—':Math.round(m.duracionRepartoProm)];
    });
    exportToExcel('KPI_Mensajeros_'+kpiFiltro+'_'+new Date().toISOString().slice(0,10),[{name:'KPI Mensajeros',headers:headers,rows:rows}]);
  }

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
          ultimaActualizacion&&React.createElement('span',{style:{fontSize:10,color:'var(--text-soft)'}},'Datos al '+ultimaActualizacion.toLocaleTimeString('es-CL'))
        )
      ),
      React.createElement('div',{className:'stats-grid',style:{marginBottom:20}},
        [{label:'Total',val:total,cls:''},{label:'Entregados',val:entregados,cls:'green'},{label:'En Ruta',val:enRuta,cls:'gold'},{label:'Reprogramados',val:reprog,cls:'red'},{label:'Cancelados',val:cancelados,cls:'red'},{label:'Efectividad',val:efectividad+'%',cls:efectividad>=80?'green':efectividad>=60?'gold':'red'}].map(function(s){
          return statTile(s.label,s.val,s.cls);
        })
      ),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}},
        React.createElement('div',{className:'panel'},
          React.createElement('div',{className:'panel-title'},'Top Clientes'),
          clientesArr.length===0?React.createElement('div',{className:'empty-state'},'Sin datos'):
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
          mensArr.length===0?React.createElement('div',{className:'empty-state'},'Sin datos'):
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
          [{label:'Entregados',val:entregados,color:'var(--success)'},{label:'En Ruta',val:enRuta,color:'var(--gold)'},{label:'Reprogramados',val:reprog,color:'var(--warning)'},{label:'Cancelados',val:cancelados,color:'var(--danger)'}].map(function(s){
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
      React.createElement('div',{className:'panel',style:{marginBottom:20,background:'linear-gradient(145deg,#ffffff,#f5eedc)',border:'1px solid rgba(200,168,75,0.3)'}},
        React.createElement('div',{className:'panel-title'},'🏁 Cierre de Flota'),
        React.createElement('div',{style:{fontSize:13,color:'var(--text-mid)',lineHeight:1.6,marginBottom:14}},
          'En este período se gestionaron ',React.createElement('strong',null,fleetTotal.toLocaleString('es-CL')),' envíos entre ',React.createElement('strong',null,conActividad.length),' mensajero'+(conActividad.length!==1?'s':'')+' con actividad',
          sinActividad.length>0?(' (y '+sinActividad.length+' sin actividad registrada)'):'',
          '. Se entregaron ',React.createElement('strong',{style:{color:badgeColor(fleetEfectividad)}},fleetEntregados+' ('+fleetEfectividad+'%)'),
          ', se cobraron ',React.createElement('strong',null,fmt(fleetMonto)),' en contraentrega',
          fleetAtrasados>0?React.createElement(React.Fragment,null,' y hay ',React.createElement('strong',{style:{color:'var(--danger)'}},fleetAtrasados),' envío'+(fleetAtrasados!==1?'s':'')+' atrasado'+(fleetAtrasados!==1?'s':'')+' (más de '+UMBRAL_ATRASO_DIAS+' días en ruta)'):'',
          '. ',
          mejorMen?React.createElement(React.Fragment,null,'Mejor desempeño: ',React.createElement('strong',{style:{color:'var(--success)'}},mejorMen.nombre),' ('+mejorMen.efectividad+'% efectividad, '+mejorMen.entregados+' entregas). '):'',
          necesitanAtencion.length>0?React.createElement(React.Fragment,null,'Necesitan atención: ',React.createElement('strong',{style:{color:'var(--danger)'}},necesitanAtencion.map(function(m){return m.nombre;}).join(', ')),' (efectividad bajo 70%).'):''
        ),
        React.createElement('div',{className:'stats-grid'},
          [{label:'Gestionados',val:fleetTotal,cls:''},{label:'Entregados',val:fleetEntregados,cls:'green'},{label:'Efectividad Flota',val:fleetEfectividad+'%',cls:fleetEfectividad>=80?'green':fleetEfectividad>=60?'gold':'red'},{label:'$ Cobrado',val:fmt(fleetMonto),cls:'green'},{label:'Atrasados',val:fleetAtrasados,cls:fleetAtrasados>0?'red':''},{label:'Mensajeros Activos',val:conActividad.length+'/'+kpiPorMensajero.length,cls:''}].map(function(s){return statTile(s.label,s.val,s.cls);})
        )
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
        kpiPorMensajero.length===0?React.createElement('div',{className:'empty-state'},'Sin mensajeros registrados'):
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
            var filas=[React.createElement('tr',{key:m.norm,style:{background:isExp?'rgba(200,168,75,0.06)':(i%2===0?'#fff':'var(--cream)'),cursor:'pointer',opacity:m.total===0?0.6:1},onClick:function(){setExpandido(isExp?null:m.norm);}},
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
              var tendM=tendenciaDeMensajero(m.norm);
              filas.push(React.createElement('tr',{key:m.norm+'_det'},React.createElement('td',{colSpan:10,style:{padding:0}},
                React.createElement('div',{style:{padding:'18px 20px',background:'var(--cream)',borderTop:'1px solid var(--border)',borderBottom:'2px solid var(--gold)'}},
                  React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:16}},
                    [{label:'Reintentos',val:m.reintentos==null?'—':m.reintentos},
                     {label:'Correcciones de admin',val:m.correccionesAdmin==null?'—':m.correccionesAdmin,warn:m.correccionesAdmin>0},
                     {label:'% Con foto evidencia',val:m.pctFoto==null?'—':m.pctFoto+'%',warn:m.pctFoto!=null&&m.pctFoto<80},
                     {label:'% Con nota',val:m.pctNota==null?'—':m.pctNota+'%'},
                     {label:'Primera acción',val:m.primeraAccion?fmtHora(m.primeraAccion):'—'},
                     {label:'Última acción',val:m.ultimaAccion?fmtHora(m.ultimaAccion):'—'},
                     {label:'Horas activas',val:fmtHoras(m.horasActivas)},
                     {label:'Ritmo (entregas/h)',val:m.ritmo==null?'—':m.ritmo.toFixed(1)},
                     {label:'Duración prom. reparto',val:fmtMin(m.duracionRepartoProm)},
                     {label:'$ Pendiente en ruta',val:fmt(m.montoPendiente)}
                    ].map(function(x){return React.createElement('div',{key:x.label,style:{background:'#fff',borderRadius:8,padding:'10px 12px',border:'1px solid '+(x.warn?'rgba(176,48,48,0.3)':'var(--border)')}},
                      React.createElement('div',{style:{fontSize:9,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}},x.label),
                      React.createElement('div',{style:{fontFamily:'JetBrains Mono',fontSize:16,fontWeight:700,color:x.warn?'var(--danger)':'var(--dark)'}},x.val)
                    );})
                  ),
                  React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}},
                    React.createElement('div',null,React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginBottom:6,textTransform:'uppercase',letterSpacing:1}},'Entregas por día (14 días)'),React.createElement(MiniLineChart,{data:tendM.map(function(d){return{x:d.fecha,label:d.label,y:d.entregados};}),color:'#2e7d4f',compact:true,height:70,valueFmt:function(v){return v+' entregas';}})),
                    React.createElement('div',null,React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginBottom:6,textTransform:'uppercase',letterSpacing:1}},'Efectividad por día (14 días)'),React.createElement(MiniLineChart,{data:tendM.map(function(d){return{x:d.fecha,label:d.label,y:d.efectividad};}),color:'#C8A84B',compact:true,height:70,valueFmt:function(v){return v+'%';}}))
                  ),
                  React.createElement('div',null,
                    React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginBottom:8,textTransform:'uppercase',letterSpacing:1}},'Estados en el período'),
                    React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
                      ESTADOS_ENVIO.map(function(es){
                        var v=m.porEstado[es.val]||0;
                        if(v===0)return null;
                        return React.createElement('div',{key:es.val,style:{padding:'6px 12px',borderRadius:20,background:es.bg||'rgba(0,0,0,0.05)',border:'1px solid '+es.color,color:es.color,fontSize:11,fontWeight:700}},es.label+': '+v);
                      })
                    )
                  )
                )
              )));
            }
            return filas;
          })))
        ))
      )
    )
  );
}
window.Analitica = Analitica;
})();
