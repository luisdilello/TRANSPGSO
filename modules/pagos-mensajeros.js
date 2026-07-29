(function(){
var useEffect=React.useEffect, useRef=React.useRef, useState=React.useState;
var ConteoAyudas=window.__app.ConteoAyudas, ExportBtn=window.__app.ExportBtn, HistorialCierres=window.__app.HistorialCierres, PlanillaRetiros=window.__app.PlanillaRetiros, db=window.__app.db, exportToExcel=window.__app.exportToExcel, fechaHoyCL=window.__app.fechaHoyCL, lsLoad=window.__app.lsLoad, lsSave=window.__app.lsSave;
function PagosMensajeros(_ref18){let mensajeros=_ref18.mensajeros,mensajerosDia=_ref18.mensajerosDia,esAdmin=_ref18.esAdmin,toast=_ref18.toast,clientes=_ref18.clientes||[];const semanaActual=()=>{const hoy=new Date();const lunes=new Date(hoy);lunes.setDate(hoy.getDate()-((hoy.getDay()+6)%7));const sabado=new Date(lunes);sabado.setDate(lunes.getDate()+5);const fmt=d=>d.toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'});return`${fmt(lunes)} al ${fmt(sabado)}`;};const _useState34=useState(semanaActual()),semana=_useState34[0],setSemana=_useState34[1];
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
const _usePagosTab=useState(()=>window._pagosTab||'pagos'),pagosTab=_usePagosTab[0],setPagosTab=_usePagosTab[1];
React.useEffect(()=>{window._pagosTab=pagosTab;},[pagosTab]);
const _useRetiros=useState([]),retirosDB=_useRetiros[0],setRetirosDB=_useRetiros[1];
const _useProds=useState(()=>lsLoad('productos_local',[{id:1,nombre:'Almuerzo',precio:3500,activo:true},{id:2,nombre:'Cafe',precio:800,activo:true},{id:3,nombre:'Cinta embalaje',precio:1200,activo:true}])),productosLocal=_useProds[0],setProductosLocal=_useProds[1];
const _prodsCargado=useRef(false);
React.useEffect(()=>{
  (async()=>{
    try{
      const{data}=await db.from('configuracion').select('valor').eq('clave','productos_venta').single();
      if(data&&Array.isArray(data.valor)&&data.valor.length>0)setProductosLocal(data.valor);
    }catch(e){}
    _prodsCargado.current=true;
  })();
},[]);
const [consumoDetalle,setConsumoDetalle]=useState({});
const _useRetiroFecha=useState(fechaHoyCL()),retiroFecha=_useRetiroFecha[0],setRetiroFecha=_useRetiroFecha[1];
const _useExtrasModal=useState(null),extrasModal=_useExtrasModal[0],setExtrasModal=_useExtrasModal[1];
const _useConsumoModal=useState(null),consumoModal=_useConsumoModal[0],setConsumoModal=_useConsumoModal[1];
const _useExpandido=useState({}),expandido=_useExpandido[0],setExpandido=_useExpandido[1];
/* Nota: la carga de retiros del dia para esta pantalla la hace PlanillaRetiros (con tiempo real
   + polling contra la tabla retiros). Antes habia aca un efecto duplicado que leia
   retiros_planilla_+fecha de localStorage y, si encontraba algo, jamas consultaba Supabase
   (cortaba con un return temprano) ademas de una confirmacion/cobro por cliente que se
   guardaba solo en el dispositivo y nunca se leia en ninguna pantalla. Se elimino: no aportaba
   datos reales y competia por pisar retirosDB con una copia local vieja. */const _useState35=useState(fechaHoyCL()),fechaPago=_useState35[0],setFechaPago=_useState35[1];const _useState36=useState(null),verComprobante=_useState36[0],setVerComprobante=_useState36[1];const _useState37=useState(false),importando=_useState37[0],setImportando=_useState37[1];const _useState38=useState(null),pagosFiltro=_useState38[0],setPagosFiltro=_useState38[1];const _useState39=useState(false),dragOver=_useState39[0],setDragOver=_useState39[1];const pagoFileRef=useRef();function importarExcelPagos(file){const reader=new FileReader();reader.onload=e=>{try{let wb;try{wb=XLSX.read(e.target.result,{type:'array',cellDates:true});}catch(e1){wb=XLSX.read(e.target.result,{type:'array'});}const sheetName=wb.SheetNames.find(n=>n.toUpperCase().includes('DETALLE'))||wb.SheetNames[0];const ws=wb.Sheets[sheetName];const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});let semanaExcel='';for(let i=0;i<5;i++){const row=raw[i]||[];for(let j=0;j<row.length;j++){const cell=String(row[j]||'').trim();const prev=String(row[j-1]||'').trim().toLowerCase();if(prev.includes('semana')&&cell&&cell!=='nan'){semanaExcel=cell;break;}}if(semanaExcel)break;}let headerRow=2;for(let i=0;i<Math.min(5,raw.length);i++){const row=raw[i]||[];for(let j=0;j<row.length;j++){if(String(row[j]||'').trim().toUpperCase()==='MENSAJEROS'){headerRow=i;break;}}}const toNum=v=>{const n=parseFloat(String(v||0).replace(/[^0-9.-]/g,''));return isNaN(n)?0:n;};const consumoMap={};for(let ci=0;ci<raw.length;ci++){const cr=raw[ci]||[];if(String(cr[14]||'').trim()==='NOMBRE'){for(let di=ci+1;di<Math.min(ci+30,raw.length);di++){const dr=raw[di]||[];const cn=String(dr[14]||'').trim().toUpperCase();if(!cn||cn==='nan')continue;const cm=parseFloat(String(dr[16]||'0').replace(/[^0-9.-]/g,''))||0;if(cm>0)consumoMap[cn]=cm;}break;}}function matchConsumo(nombre){const n=nombre.toUpperCase().replace(/,\s*/g,' ').replace(/\s+/g,' ');if(consumoMap[n])return consumoMap[n];for(const k of Object.keys(consumoMap)){const kn=k.replace(/,\s*/g,' ').replace(/\s+/g,' ');if(n.includes(kn)||kn.includes(n))return consumoMap[k];}return 0;}const datosImportados=[];let filasVaciasOmitidas=0;let filasSinMontoOmitidas=0;for(let i=headerRow+1;i<raw.length;i++){const row=raw[i]||[];const nombre=String(row[17]||'').trim();if(nombre.toUpperCase()==='MENSAJEROS'||nombre.toLowerCase().includes('total')||nombre.startsWith('Etiqueta'))break;if(!nombre||nombre==='nan'){filasVaciasOmitidas++;continue;}const brutoCheck=parseFloat(String(row[18]||'0').replace(/[^0-9.-]/g,''));if(!brutoCheck||brutoCheck<=0){filasSinMontoOmitidas++;continue;}const totalPagar=toNum(row[23]);const estado='PENDIENTE';const ivaVal=toNum(row[6]);const brutoVal=toNum(row[4]);let tipoIVADetected='ninguno';if(ivaVal>0&&brutoVal>0){const rate=ivaVal/brutoVal;if(Math.abs(rate-0.1525/1.1525)<0.01)tipoIVADetected='honorarios';else if(Math.abs(rate-0.19/1.19)<0.01)tipoIVADetected='factura';else tipoIVADetected='manual';}const enviosNum=toNum(row[15]);const brutoNum=toNum(row[18]);const tarifaCalc=enviosNum>0?Math.round(brutoNum/enviosNum):0;datosImportados.push({id:Date.now()+i,nombre:nombre.toUpperCase().replace(/,\s*/g,' '),envios:enviosNum,tarifa:tarifaCalc,bruto:brutoNum,ajuste:0,iva:ivaVal,tipoIVA:tipoIVADetected,totalBruto:brutoNum,adelanto:toNum(row[19]),extra:toNum(row[22]),prestamo:toNum(row[20]),consumo:matchConsumo(nombre),totalPagar:toNum(row[23]),estado:'PENDIENTE',obs:''});}if(datosImportados.length===0){toast('⚠ No se encontró la hoja "DETALLE DE PAGO"');return;}setPagos(datosImportados);if(semanaExcel)setSemana(semanaExcel);lsSave('pagos_semana',datosImportados);setImportando(false);if(filasVaciasOmitidas>0||filasSinMontoOmitidas>0){toast(`✓ Importados ${datosImportados.length} mensajeros. ⚠ Se omitieron ${filasVaciasOmitidas} filas vacías y ${filasSinMontoOmitidas} filas sin monto — revisa el Excel si esperabas más.`);}else{toast(`✓ Importados ${datosImportados.length} mensajeros desde Excel de pagos`);}}catch(err){toast('⚠ Error al leer el archivo: '+err.message);setImportando(false);}};reader.readAsArrayBuffer(file);}const buildPagos=()=>{
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
    return{id:i+1,nombre:m.nombre,envios:m.envios,tarifa,bruto,ajuste:0,iva:0,tipoIVA:'ninguno',totalBruto:bruto,adelanto:0,extra:savedPago.extra||0,prestamo:0,consumo:savedPago.consumo||0,totalPagar:bruto+(savedPago.extra||0)-(savedPago.consumo||0),estado:savedPago.estado||'PENDIENTE',obs:savedPago.obs||''};
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
        const bruto=p.envios*tarifa;
        const totalBruto=bruto+(p.ajuste||0)-(p.iva||0);
        const totalPagar=totalBruto+(p.extra||0)-(p.adelanto||0)-(p.prestamo||0)-(p.consumo||0);
        return{...p,nombre:menActual.nombre,tarifa,bruto,totalBruto,totalPagar};
      }
      return p;
    });
    // Agregar mensajeros nuevos que no estaban en pagos guardados
    const savedNames=new Set(updated.map(p=>p.nombre.replace(/,\s*/g,' ').toUpperCase().trim()));
    const nuevos=mensajeros.filter(m=>m.activo!==false&&!savedNames.has(m.nombre.replace(/,\s*/g,' ').toUpperCase().trim()))
      .map((m,i)=>({id:Date.now()+i,nombre:m.nombre,envios:0,tarifa:m.tarifa||1200,bruto:0,ajuste:0,iva:0,tipoIVA:'ninguno',totalBruto:0,adelanto:0,extra:0,prestamo:0,consumo:0,totalPagar:0,estado:'PENDIENTE',obs:''}));
    return updated.concat(nuevos);
  }
  return buildPagos();
}),pagos=_useState40[0],setPagos=_useState40[1];useEffect(()=>{lsSave('pagos_semana',pagos);},[pagos]);
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
  })();
  return()=>{cancelado=true;};
},[semana]);
useEffect(()=>{
  if(!_pagosCargados.current)return; // no pisar Supabase con datos vacíos antes de terminar de cargar
  const t=setTimeout(()=>{
    db.from('pagos_mensajeros_semanales').upsert({semana,data:{pagos,fechaPago},updated_at:new Date().toISOString()},{onConflict:'semana'}).then(function(r){if(r.error)console.warn('Pago Mensajeros: error guardando en Supabase:',r.error.message);});
    autoGuardarCierreSemanal();
  },2500);
  return()=>clearTimeout(t);
},[semana,pagos,fechaPago]);
const _autoCalc=useRef(false);
useEffect(()=>{
  if(_autoCalc.current)return;
  if(!mensajeros||mensajeros.length===0)return;
  _autoCalc.current=true;
  var t=setTimeout(function(){calcularEnviosSemana();},600);
  return function(){clearTimeout(t);};
},[mensajeros]);
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
},[mensajeros]);useEffect(()=>{if(mensajerosDia.length>0){const normNom2=n=>(n||'').replace(/,\s*/g,' ').replace(/\s+/g,' ').trim().toUpperCase();const tarifaMap={};mensajeros.forEach(m=>{tarifaMap[normNom2(m.nombre)]=m.tarifa||1200;});setPagos(prev=>{const prevMap={};prev.forEach(p=>{prevMap[normNom2(p.nombre)]=p;});return mensajerosDia.filter(m=>m.total>0).map((m,i)=>{const tarifa=tarifaMap[normNom2(m.nombre)]||1200;const bruto=m.entregados*tarifa;const existing=prevMap[normNom2(m.nombre)];if(existing)return{...existing,envios:m.entregados,tarifa,bruto,totalBruto:bruto+existing.ajuste-existing.iva,totalPagar:bruto+existing.ajuste-existing.iva+existing.extra-existing.adelanto-existing.prestamo-(existing.consumo||0)};return{id:m.id||i,nombre:m.nombre,envios:m.entregados,tarifa,bruto,ajuste:0,iva:0,totalBruto:bruto,adelanto:0,extra:0,prestamo:0,totalPagar:bruto,estado:'PENDIENTE',obs:''};});});}},[mensajerosDia]);function updatePago(id,field,val){setPagos(prev=>prev.map(p=>{if(p.id!==id)return p;const strFields=['estado','obs','tipoIVA'];const updated={...p,[field]:strFields.includes(field)?val:+val};if(field==='tipoIVA'){if(val==='ninguno'){updated.iva=0;}else if(val==='manual'){}else{const rate=val==='honorarios'?0.1525:val==='factura'?0.19:0;updated.iva=Math.round(updated.bruto*rate/(1+rate));}}if(field==='tarifa'){updated.bruto=updated.envios*+val;const rate=updated.tipoIVA==='honorarios'?0.1525:updated.tipoIVA==='factura'?0.19:0;if(rate>0)updated.iva=Math.round(updated.bruto*rate/(1+rate));}if(!strFields.includes(field)){updated.totalBruto=updated.bruto+updated.ajuste-updated.iva;updated.totalPagar=updated.totalBruto+updated.extra-updated.adelanto-updated.prestamo-updated.consumo;}if(field==='tipoIVA'){updated.totalBruto=updated.bruto+updated.ajuste-updated.iva;updated.totalPagar=updated.totalBruto+updated.extra-updated.adelanto-updated.prestamo-updated.consumo;}return updated;}));}async function calcularEnviosSemana(){
  if(!fechaInicio||!fechaFin){toast('Selecciona el rango de fechas');return;}
  setCalculando(true);
  toast('⏳ Calculando envíos...');
  try{
    // Consulta directa a envios con columnas correctas: mensajero, estado, fecha, comuna
    var r=await db.from('envios')
      .select('mensajero,estado,fecha,comuna')
      .eq('estado','entregado')
      .gte('fecha',fechaInicio)
      .lte('fecha',fechaFin);

    if(r.error){
      toast('⚠ Error: '+r.error.message);
      setCalculando(false);
      return;
    }

    var data=r.data||[];
    toast(''+data.length+' registros encontrados...');

    var conteo={};
    data.forEach(function(e){
      var n=(e.mensajero||'').replace(/,\s*/g,' ').toUpperCase().trim();
      if(!n||n==='SIN ASIGNAR'||n==='')return;
      conteo[n]=(conteo[n]||0)+1;
    });

    // Actualizar pagos con los conteos reales
    setPagos(function(prev){
      return prev.map(function(p){
        var key=p.nombre.replace(/,\s*/g,' ').toUpperCase().trim();
        var envios=conteo[key]||0;
        var bruto=envios*p.tarifa;
        var totalBruto=bruto+(p.ajuste||0)-(p.iva||0);
        var totalPagar=totalBruto+(p.extra||0)-(p.adelanto||0)-(p.prestamo||0)-(p.consumo||0);
        return Object.assign({},p,{envios:envios,bruto:bruto,totalBruto:totalBruto,totalPagar:totalPagar});
      });
    });

    // Cargar tarifas por comuna de todos los mensajeros
    // Normalizar nombres: quitar comas para comparar con envios
    var normNombre=function(n){return (n||'').replace(/,\s*/g,' ').toUpperCase().trim();};
    var mensajerosList=pagos.map(function(p){return p.nombre.toUpperCase().trim();});
    var mensajerosListNorm=pagos.map(function(p){return normNombre(p.nombre);});
    // Buscar tarifas con nombre exacto Y con nombre normalizado
    var rTar=await db.from('tarifas_comunas')
      .select('mensajero_nombre,comuna,tarifa');
    var tarifasComunaMap={};
    (rTar.data||[]).forEach(function(t){
      // Indexar por nombre normalizado (sin comas)
      var key=normNombre(t.mensajero_nombre);
      if(!tarifasComunaMap[key])tarifasComunaMap[key]={};
      tarifasComunaMap[key][t.comuna.toUpperCase().trim()]=t.tarifa;
    });

    // Construir conteo detallado por mensajero y comuna
    var conteoDetalle={};
    data.forEach(function(e){
      var n=normNombre(e.mensajero||'');
      var c=(e.comuna||'').toUpperCase().trim();
      if(!n||n==='SIN ASIGNAR'||n==='')return;
      if(!conteoDetalle[n])conteoDetalle[n]={};
      if(!conteoDetalle[n][c])conteoDetalle[n][c]=0;
      conteoDetalle[n][c]++;
    });

    // Actualizar pagos con cálculo por tarifa de comuna
    setPagos(function(prev){
      return prev.map(function(p){
        var key=normNombre(p.nombre);
        var enviosPorComuna=conteoDetalle[key]||{};
        var totalEnvios=Object.values(enviosPorComuna).reduce(function(a,b){return a+b;},0);
        var tarsCom=tarifasComunaMap[key]||tarifasComunaMap[normNombre(p.nombre)]||{};
        // Calcular bruto usando tarifa específica por comuna
        var bruto=Object.keys(enviosPorComuna).reduce(function(sum,com){
          var tar=tarsCom[com]!==undefined?tarsCom[com]:(p.tarifa||1200);
          return sum+(enviosPorComuna[com]*tar);
        },0);
        if(totalEnvios===0){bruto=0;}
        var totalBruto=bruto+(p.ajuste||0)-(p.iva||0);
        var totalPagar=totalBruto+(p.extra||0)-(p.adelanto||0)-(p.prestamo||0)-(p.consumo||0);
        return Object.assign({},p,{envios:totalEnvios,bruto:bruto,totalBruto:totalBruto,totalPagar:totalPagar});
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
        const bruto=p.envios*tarifa;
        const totalBruto=bruto+(p.ajuste||0)-(p.iva||0);
        const totalPagar=totalBruto+(p.extra||0)-(p.adelanto||0)-(p.prestamo||0)-(p.consumo||0);
        return{...p,nombre,tarifa,bruto,totalBruto,totalPagar};
      });
    // Agregar mensajeros activos nuevos que no estaban
    const updatedNames=new Set(updated.map(p=>p.nombre.replace(/,\s*/g,' ').toUpperCase().trim()));
    const nuevos=mensajeros.filter(m=>m.activo!==false&&!updatedNames.has(m.nombre.replace(/,\s*/g,' ').toUpperCase().trim()))
      .map((m,i)=>({id:Date.now()+i,nombre:m.nombre,envios:0,tarifa:m.tarifa||1200,bruto:0,ajuste:0,iva:0,tipoIVA:'ninguno',totalBruto:0,adelanto:0,extra:0,prestamo:0,consumo:0,totalPagar:0,estado:'PENDIENTE',obs:''}));
    return updated.concat(nuevos);
  });
  toast&&toast('✓ Recalculado con datos actualizados');
}const totales=pagos.reduce((a,p)=>({envios:a.envios+p.envios,bruto:a.bruto+p.bruto,adelanto:a.adelanto+p.adelanto,extra:a.extra+p.extra,prestamo:a.prestamo+p.prestamo,iva:a.iva+p.iva,consumo:a.consumo+(p.consumo||0),total:a.total+p.totalPagar,pendientes:a.pendientes+(p.estado==='PENDIENTE'?1:0),pagados:a.pagados+(p.estado==='PAGADO'?1:0)}),{envios:0,bruto:0,adelanto:0,extra:0,prestamo:0,iva:0,consumo:0,total:0,pendientes:0,pagados:0});const fmtCLP=n=>`$${Math.round(n).toLocaleString('es-CL')}`;function exportarComprobante(p){var _document$querySelect5;const win=window.open('','_blank','width=600,height=800');const logoSrc=((_document$querySelect5=document.querySelector('.logo-img'))==null?void 0:_document$querySelect5.src)||'';win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"/>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet"/>
    <title>Comprobante - ${p.nombre}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:Arial,sans-serif;padding:32px;background:#FEF8EA;color:#2b2e20;}
      .header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #C8A84B;padding-bottom:16px;margin-bottom:24px;}
      .logo{display:flex;align-items:center;gap:12px;}
      .logo img{width:60px;height:60px;object-fit:contain;border-radius:8px;}
      .brand{font-size:20px;font-family:'Bebas Neue',sans-serif;font-weight:900;letter-spacing:2px;color:#2b2e20;}
      .brand-sub{font-size:9px;color:#7a7d6a;letter-spacing:2px;text-transform:uppercase;}
      .titulo{font-size:18px;font-weight:900;color:#C8A84B;letter-spacing:1px;}
      .info-box{background:#fff;border:1px solid #e0d8c0;border-radius:8px;padding:16px;margin-bottom:16px;}
      .info-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0e8d0;font-size:13px;}
      .info-row:last-child{border-bottom:none;}
      .info-label{color:#7a7d6a;font-weight:600;}
      .info-val{font-weight:700;color:#2b2e20;}
      .section-title{font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#C8A84B;background:#2b2e20;padding:8px 14px;border-radius:6px;margin:16px 0 8px;}
      .total-box{background:#2b2e20;color:#C8A84B;border-radius:10px;padding:20px;text-align:center;margin:20px 0;}
      .total-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.7;}
      .total-val{font-size:36px;font-weight:900;margin-top:4px;}
      .firma-box{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:32px;}
      .firma-area{border-top:2px solid #C8A84B;padding-top:10px;text-align:center;font-size:11px;color:#7a7d6a;font-weight:600;letter-spacing:1px;}
      .badge-pagado{background:#1a6b3a;color:#fff;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:700;}
      .badge-pendiente{background:#b03030;color:#fff;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:700;}
      @media print{body{padding:20px;background:#fff;}}
    </style>
    </head><body>
    <div class="header">
      <div class="logo">
        <img src="${logoSrc}" onerror="this.style.display='none'"/>
        <div><div class="brand">TRANSPGSO</div><div class="brand-sub">Last Mile Delivery</div></div>
      </div>
      <div style="text-align:right">
        <div class="titulo">Comprobante de Pago</div>
        <div style="font-size:12px;color:#7a7d6a;margin-top:4px;">Semana: ${semana}</div>
        <div style="font-size:12px;color:#7a7d6a;">Fecha de pago: ${new Date(fechaPago+'T12:00:00').toLocaleDateString('es-CL')}</div>
      </div>
    </div>

    <div class="info-box">
      <div class="info-row"><span class="info-label">👤 Mensajero</span><span class="info-val">${p.nombre.replace(/,\s*/g,' ')}</span></div>
      <div class="info-row"><span class="info-label">Estado</span><span class="info-val"><span class="${p.estado==='PAGADO'?'badge-pagado':'badge-pendiente'}">${p.estado}</span></span></div>
    </div>

    <div class="section-title">Detalle de Entregas</div>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Paquetes entregados</span><span class="info-val">${p.envios}</span></div>
      <div class="info-row"><span class="info-label">Tarifa por paquete</span><span class="info-val">${fmtCLP(p.tarifa)}</span></div>
      <div class="info-row"><span class="info-label">Pago calculado</span><span class="info-val">${fmtCLP(p.bruto)}</span></div>
      ${p.ajuste!==0?`<div class="info-row"><span class="info-label">Ajuste</span><span class="info-val" style="color:${p.ajuste>0?'#1a6b3a':'#b03030'}">${fmtCLP(p.ajuste)}</span></div>`:''}
      ${p.iva>0?`<div class="info-row"><span class="info-label">IVA / Descuento</span><span class="info-val" style="color:#b03030">-${fmtCLP(p.iva)}</span></div>`:''}
      ${p.extra>0?`<div class="info-row"><span class="info-label">Extra / Bono</span><span class="info-val" style="color:#1a6b3a">+${fmtCLP(p.extra)}</span></div>`:''}
    </div>

    ${p.consumo>0?`
    <div class="section-title">🍽 Consumo Local</div>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Consumo en local</span><span class="info-val" style="color:#b03030">-${fmtCLP(p.consumo)}</span></div>
    </div>`:''}
    ${p.adelanto>0||p.prestamo>0?`
    <div class="section-title">Descuentos</div>
    <div class="info-box">
      ${p.adelanto>0?`<div class="info-row"><span class="info-label">Adelanto recibido</span><span class="info-val" style="color:#b03030">-${fmtCLP(p.adelanto)}</span></div>`:''}
      ${p.prestamo>0?`<div class="info-row"><span class="info-label">Préstamo pendiente</span><span class="info-val" style="color:#b03030">-${fmtCLP(p.prestamo)}</span></div>`:''}
    </div>`:''}

    ${p.obs?`<div class="info-box" style="background:#fff8e8;border-color:#e0c060"><div style="font-size:12px;color:#7a5500"><strong>Observaciones:</strong> ${p.obs}</div></div>`:''}

    <div class="total-box">
      <div class="total-label">Total Neto a Pagar</div>
      <div class="total-val">${fmtCLP(p.totalPagar)}</div>
    </div>

    <div class="firma-box">
      <div class="firma-area">👤 RECIBÍ CONFORME<br/><br/><br/>${p.nombre.replace(/,\s*/g,' ')}</div>
      <div class="firma-area">✍🏻 FIRMA RESPONSABLE<br/><br/><br/>TransPgso SpA</div>
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
    </body></html>`);win.document.close();}if(!esAdmin)return/*#__PURE__*/React.createElement("div",{style:{textAlign:'center',padding:'60px 20px'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:48,marginBottom:16}},"\uD83D\uDD10"),/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:24,color:'var(--dark)',letterSpacing:2}},"Acceso Restringido"),/*#__PURE__*/React.createElement("div",{style:{fontSize:13,color:'var(--text-soft)',marginTop:8}},"Solo los administradores pueden ver los pagos de mensajeros."));return/*#__PURE__*/React.createElement("div",{className:"pm-root tab-"+pagosTab},/*#__PURE__*/React.createElement("div",{className:"section-head"},
  /*#__PURE__*/React.createElement("div",{className:"section-title"},"Pagos ",/*#__PURE__*/React.createElement("span",null,"Mensajeros")),
  /*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:6}},
    [{val:'pagos',label:'Pagos'},{val:'retiros',label:'Planilla Retiros'},{val:'productos',label:'Productos'},{val:'ayudas',label:'Ayudas'},{val:'historial',label:'Historial'}].map(t=>
      /*#__PURE__*/React.createElement("button",{key:t.val,onClick:()=>setPagosTab(t.val),style:{padding:'7px 16px',borderRadius:8,border:`1px solid ${pagosTab===t.val?'var(--gold)':'var(--border)'}`,background:pagosTab===t.val?'rgba(200,168,75,0.12)':'#fff',color:pagosTab===t.val?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer'}},t.label)
    )
  ),pagosTab==='pagos'&&/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},/*#__PURE__*/React.createElement("button",{className:'btn-futurista btn-f-gold',onClick:()=>setImportando(v=>!v)},"\u2B07 Importar Excel Pagos"),/*#__PURE__*/React.createElement("button",{className:'btn-futurista btn-f-ghost',onClick:recalcAll},"↺ Recalcular"),/*#__PURE__*/React.createElement("button",{className:'btn-futurista btn-f-success',onClick:cerrarSemana},"\u2713 Cerrar Semana"),/*#__PURE__*/React.createElement(ExportBtn,{label:"Exportar",onPDF:exportarResumen,onExcel:()=>{const headers=['#','Mensajero','Envíos','Tarifa $','Pago Calc.','Ajuste','IVA/Desc.','Extra','Adelanto','Préstamo','Total a Pagar','Estado','Observaciones'];const rows=pagos.map((p,i)=>[i+1,p.nombre.replace(/,\s*/g,' '),p.envios,p.tarifa,Math.round(p.bruto),p.ajuste,p.iva,p.extra,p.adelanto,p.prestamo,Math.round(p.totalPagar),p.estado,p.obs]);const tots=pagos.reduce((a,p)=>({e:a.e+p.envios,b:a.b+p.bruto,t:a.t+p.totalPagar,ad:a.ad+p.adelanto,ex:a.ex+p.extra}),{e:0,b:0,t:0,ad:0,ex:0});const totRow=['','TOTALES',tots.e,'',Math.round(tots.b),'','',Math.round(tots.ex),Math.round(tots.ad),'',Math.round(tots.t),'',''];exportToExcel('Pagos_Mensajeros_'+semana.replace(/\s/g,'_'),[{name:'Pagos',headers,rows,totalsRow:totRow}]);}}))),/*#__PURE__*/React.createElement("div",{className:"pm-pagos-main"},importando&&/*#__PURE__*/React.createElement("div",{style:{background:'#fff',border:'1px solid var(--border)',borderTop:'3px solid var(--gold)',borderRadius:10,padding:20,marginBottom:16,boxShadow:'0 2px 10px rgba(43,46,32,0.07)'}},/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1.5,color:'var(--dark)',marginBottom:4}},"Importar Excel de Pagos"),/*#__PURE__*/React.createElement("div",{style:{fontSize:12,color:'var(--text-soft)',marginBottom:14}},"Sube tu archivo ",/*#__PURE__*/React.createElement("strong",null,"ARCHIVO_DE_PAGO_*.xlsx"),". El sistema leer\xE1 la hoja ",/*#__PURE__*/React.createElement("strong",null,"DETALLE DE PAGO")," y cargar\xE1 todos los datos autom\xE1ticamente."),/*#__PURE__*/React.createElement("div",{onDragOver:e=>{e.preventDefault();setDragOver(true);},onDragLeave:()=>setDragOver(false),onDrop:e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)importarExcelPagos(f);},onClick:()=>pagoFileRef.current.click(),style:{border:`2px dashed ${dragOver?'var(--gold)':'var(--border)'}`,borderRadius:10,padding:'28px 20px',textAlign:'center',cursor:'pointer',background:dragOver?'rgba(200,168,75,0.08)':'var(--cream)',transition:'all 0.2s'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:32,marginBottom:8}},"\uD83D\uDCC2"),/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:16,letterSpacing:1.5,color:'var(--dark)',marginBottom:4}},"Arrastra tu Excel aqu\xED o haz clic para seleccionar"),/*#__PURE__*/React.createElement("div",{style:{fontSize:11,color:'var(--text-soft)'}},"Acepta .xlsx \u2014 Hoja: DETALLE DE PAGO"),/*#__PURE__*/React.createElement("input",{ref:pagoFileRef,type:"file",accept:".xlsx,.xls,.htm,.html",style:{display:'none'},onChange:e=>{const f=e.target.files[0];if(f)importarExcelPagos(f);}})),/*#__PURE__*/React.createElement("div",{style:{marginTop:10,padding:'8px 12px',background:'rgba(200,168,75,0.08)',borderRadius:7,border:'1px solid var(--gold-border)',fontSize:11,color:'var(--text-mid)'}},"\uD83D\uDCA1 El sistema detecta autom\xE1ticamente: nombre, env\xEDos, tarifa, pago calculado, ajustes, adelantos, extras, pr\xE9stamos, total y estado de cada mensajero.")),/*#__PURE__*/React.createElement("div",{style:{background:'#fff',border:'1px solid var(--border)',borderTop:'3px solid var(--gold)',borderRadius:10,padding:20,marginBottom:20,boxShadow:'0 2px 10px rgba(43,46,32,0.07)'}},/*#__PURE__*/React.createElement("div",{className:"form-row"},/*#__PURE__*/React.createElement("div",{className:"form-group",style:{marginBottom:0}},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Período / Semana"),
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
)),/*#__PURE__*/React.createElement("div",{className:"form-group",style:{marginBottom:0}},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Fecha de Pago"),/*#__PURE__*/React.createElement("input",{className:"form-input",type:"date",value:fechaPago,onChange:e=>setFechaPago(e.target.value)})))),/*#__PURE__*/React.createElement("div",{className:"stats-grid",style:{marginBottom:20}},[{label:'Total Envíos',val:totales.envios.toLocaleString('es-CL'),cls:'',filtro:null},{label:'Pago Bruto',val:'$'+Math.round(totales.bruto).toLocaleString('es-CL'),cls:'green',filtro:null},{label:'Total Adelantos',val:'$'+Math.round(totales.adelanto).toLocaleString('es-CL'),cls:'red',filtro:null},{label:'Consumo Local',val:'$'+Math.round(totales.consumo).toLocaleString('es-CL'),cls:'red',filtro:'consumo'},{label:'Extras / Bonos',val:'$'+Math.round(totales.extra).toLocaleString('es-CL'),cls:'gold',filtro:'extra'},{label:'Total a Pagar',val:'$'+Math.round(totales.total).toLocaleString('es-CL'),cls:'green',filtro:null},{label:'Pendientes',val:totales.pendientes,cls:'red',filtro:'PENDIENTE'},{label:'Pagados',val:totales.pagados,cls:'green',filtro:'PAGADO'}].map(s=>/*#__PURE__*/React.createElement("div",{key:s.label,className:"stat-card",onClick:()=>s.filtro&&setPagosFiltro(pagosFiltro===s.filtro?null:s.filtro),style:{cursor:s.filtro?'pointer':'default',border:pagosFiltro===s.filtro?'2px solid var(--gold)':'1px solid var(--border)',transition:'all 0.2s'}},/*#__PURE__*/React.createElement("div",{className:"stat-label"},s.label),/*#__PURE__*/React.createElement("div",{className:`stat-value ${s.cls}`,style:{fontSize:s.val.toString().length>8?'20px':'28px'}},s.val),s.filtro&&/*#__PURE__*/React.createElement("div",{style:{marginTop:6,fontSize:10,color:'var(--gold)',fontWeight:700,letterSpacing:1}},pagosFiltro===s.filtro?'▲ Ocultar':'▼ Ver detalle')))),pagosFiltro&&(()=>{const filtrados=pagosFiltro==='PENDIENTE'||pagosFiltro==='PAGADO'?pagos.filter(p=>p.estado===pagosFiltro):pagosFiltro==='consumo'?pagos.filter(p=>(p.consumo||0)>0):pagosFiltro==='extra'?pagos.filter(p=>(p.extra||0)>0):pagos;const titulos={'PENDIENTE':'Mensajeros Pendientes de Pago','PAGADO':'Mensajeros Pagados','consumo':'Con Consumo Local','extra':'Con Extras / Bonos'};const colores={'PENDIENTE':'var(--danger)','PAGADO':'var(--success)','consumo':'var(--warning)','extra':'var(--success)'};if(!pagosListos){return/*#__PURE__*/React.createElement("div",{style:{textAlign:'center',padding:'60px 20px',color:'var(--text-soft)'}},"Cargando pagos...");}return/*#__PURE__*/React.createElement("div",{style:{background:'#fff',border:'1px solid var(--border)',borderTop:'3px solid '+colores[pagosFiltro],borderRadius:10,padding:20,marginBottom:20,boxShadow:'0 2px 10px rgba(43,46,32,0.07)'}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}},/*#__PURE__*/React.createElement("div",null,/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.5,color:'var(--dark)'}},titulos[pagosFiltro],/*#__PURE__*/React.createElement("span",{style:{fontFamily:'JetBrains Mono',fontSize:14,color:colores[pagosFiltro],marginLeft:12}},filtrados.length," mensajero",filtrados.length!==1?'s':'')),/*#__PURE__*/React.createElement("div",{style:{fontSize:12,color:'var(--text-soft)',marginTop:2}},semana&&'Período: '+semana)),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:8}},/*#__PURE__*/React.createElement(ExportBtn,{label:"Exportar",onPDF:()=>{var _document$querySelect7;const logoSrc=((_document$querySelect7=document.querySelector('.logo-img'))==null?void 0:_document$querySelect7.src)||'';const win=window.open('','_blank','width=900,height=700');const filas=filtrados.map((p,i)=>`
                      <tr style="background:${i%2===0?'#fff':'#fdf9f2'}">
                        <td style="text-align:center;color:#7a7d6a">${i+1}</td>
                        <td style="font-weight:700">${p.nombre.replace(/,\s*/g,' ')}</td>
                        <td style="text-align:center">${p.envios}</td>
                        <td style="text-align:right">$${Math.round(p.bruto).toLocaleString('es-CL')}</td>
                        ${pagosFiltro==='consumo'?`<td style="text-align:right;color:#b03030">$${Math.round(p.consumo||0).toLocaleString('es-CL')}</td>`:''}
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
                    ${pagosFiltro==='extra'?'<th>Extra/Bono</th>':''}
                    <th>Total a Pagar</th><th>Estado</th></tr></thead>
                    <tbody>${filas}</tbody>
                    <tfoot><tr><td></td><td>TOTALES</td><td></td>
                    <td style="text-align:right">$${Math.round(filtrados.reduce((a,p)=>a+p.bruto,0)).toLocaleString('es-CL')}</td>
                    ${pagosFiltro==='consumo'||pagosFiltro==='extra'?'<td></td>':''}
                    <td style="text-align:right">$${Math.round(totalFiltrado).toLocaleString('es-CL')}</td>
                    <td></td></tr></tfoot></table>
                    <script>window.onload=()=>{window.print()}<\/script>
                    </body></html>`);win.document.close();},onExcel:()=>{const headers=['#','Mensajero','Envíos','Pago Bruto',...(pagosFiltro==='consumo'?['Consumo Local']:[]),...(pagosFiltro==='extra'?['Extra/Bono']:[]),'Total a Pagar','Estado'];const rows=filtrados.map((p,i)=>[i+1,p.nombre.replace(/,\s*/g,' '),p.envios,Math.round(p.bruto),...(pagosFiltro==='consumo'?[Math.round(p.consumo||0)]:[]),...(pagosFiltro==='extra'?[Math.round(p.extra||0)]:[]),Math.round(p.totalPagar),p.estado]);exportToExcel(titulos[pagosFiltro].replace(/\s/g,'_')+'_'+semana.replace(/\s/g,'_'),[{name:titulos[pagosFiltro].slice(0,31),headers,rows}]);}}),/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setPagosFiltro(null)},"\u2715 Cerrar"))),/*#__PURE__*/React.createElement("div",{className:"table-wrap",style:{maxHeight:360,overflowY:'auto'}},/*#__PURE__*/React.createElement("table",null,/*#__PURE__*/React.createElement("thead",null,/*#__PURE__*/React.createElement("tr",null,
  /*#__PURE__*/React.createElement("th",{style:{width:36,textAlign:'center'}},"#"),
  /*#__PURE__*/React.createElement("th",null,"Mensajero"),
  /*#__PURE__*/React.createElement("th",{style:{textAlign:'center'}},"Envíos"),
  /*#__PURE__*/React.createElement("th",null,"Pago Calc."),
  /*#__PURE__*/React.createElement("th",{style:{color:'var(--danger)'}},"Consumo"),
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
    /*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'#2980b9',cursor:'pointer'},onClick:()=>setExtrasModal(p),title:'Clic para editar extras'},
      "$",Math.round(p.extra||0).toLocaleString('es-CL'),
      /*#__PURE__*/React.createElement('span',{style:{fontSize:9,marginLeft:3,color:'var(--gold)',opacity:0.7}},'✎')
    ),
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
    /*#__PURE__*/React.createElement("td",{className:"mono",style:{color:"#c0392b",cursor:"pointer",fontWeight:600},onClick:()=>setPrestamosModal(p.nombre),title:"Ver historial prestamos"},(()=>{var key=p.nombre.toUpperCase().trim();var s=(prestamosDB[key]&&prestamosDB[key].saldo)||0;return s>0?React.createElement("span",{style:{background:"rgba(192,57,43,0.1)",padding:"2px 6px",borderRadius:4}},"$"+Math.round(s).toLocaleString("es-CL")):"--";})()),/*#__PURE__*/React.createElement("td",{className:"mono",style:{fontWeight:700,color:p.totalPagar>=0?'var(--success)':'var(--danger)',fontSize:13}},"$",Math.round(p.totalPagar).toLocaleString('es-CL')),
    /*#__PURE__*/React.createElement("td",{style:{textAlign:'center'}},
      /*#__PURE__*/React.createElement('button',{
        onClick:async()=>{
          const nuevoEstado=p.estado==='PAGADO'?'PENDIENTE':'PAGADO';
          updatePago(p.id,'estado',nuevoEstado);
          if(nuevoEstado==='PAGADO'&&p.prestamo>0){
            const key=p.nombre.toUpperCase().trim();
            const saldoAnterior=(prestamosDB[key]?.saldo)||p.prestamo;
            await guardarPrestamo(p.nombre,p.prestamo,saldoAnterior,semana);
            toast('💾 Saldo préstamo actualizado: $'+Math.max(0,saldoAnterior-p.prestamo).toLocaleString('es-CL'));
          }
        },
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
  ))),filtrados.length===0&&/*#__PURE__*/React.createElement("tr",null,/*#__PURE__*/React.createElement("td",{colSpan:8,className:"empty-state"},"Sin resultados"))))));})(),pagos.length===0&&/*#__PURE__*/React.createElement("div",{className:"info-banner"},"\uD83D\uDCE5 Importa el archivo del d\xEDa primero para generar los pagos autom\xE1ticamente."),/*#__PURE__*/React.createElement("div",{className:"table-wrap"},/*#__PURE__*/React.createElement("table",null,/*#__PURE__*/React.createElement("thead",null,/*#__PURE__*/React.createElement("tr",null,React.createElement("th",{style:{width:36,textAlign:"center"}},"#"),React.createElement("th",null,"Mensajero"),React.createElement("th",{style:{textAlign:"center"}},"Envíos"),React.createElement("th",null,"Pago Calc."),React.createElement("th",{style:{color:"var(--danger)"}},"Consumo"),React.createElement("th",{style:{color:"#2980b9"}},"Extra"),React.createElement("th",{style:{color:"#e67e22"}},"Adelanto"),React.createElement("th",{style:{color:"#c0392b"}},"Préstamo"),React.createElement("th",{style:{color:"#c0392b"}},"Saldo Pend."),React.createElement("th",{style:{fontWeight:700}},"Total a Pagar"),React.createElement("th",null,"Estado"),React.createElement("th",{style:{width:60}},"Acc."))),/*#__PURE__*/React.createElement("tbody",null,pagos.map((p,i)=>/*#__PURE__*/React.createElement("tr",{key:p.id,style:{background:p.estado==='PAGADO'?'rgba(46,125,79,0.04)':''}},/*#__PURE__*/React.createElement("td",{style:{textAlign:'center',fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-soft)',background:'var(--cream)',fontWeight:700}},i+1),/*#__PURE__*/React.createElement("td",{style:{fontWeight:700,whiteSpace:'nowrap'}},p.nombre.replace(/,\s*/g,' ')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{textAlign:'center'}},p.envios),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{style:{width:72,padding:'4px 6px',background:'var(--cream)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text)',fontFamily:'JetBrains Mono',fontSize:11,textAlign:'right',outline:'none'},type:"number",value:p.tarifa,onChange:e=>updatePago(p.id,'tarifa',e.target.value),onFocus:e=>e.target.select()})),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--success)',fontWeight:600}},"$",Math.round(p.bruto).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{style:{width:82,padding:'4px 6px',background:'rgba(176,48,48,0.05)',border:'1px solid rgba(176,48,48,0.25)',borderRadius:6,color:'var(--danger)',fontFamily:'JetBrains Mono',fontSize:11,textAlign:'right',outline:'none'},type:"number",value:p.consumo||0,onChange:e=>updatePago(p.id,'consumo',e.target.value),onFocus:e=>e.target.select(),placeholder:"0"})),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{style:{width:72,padding:'4px 6px',background:'var(--cream)',border:'1px solid var(--border)',borderRadius:6,color:'var(--success)',fontFamily:'JetBrains Mono',fontSize:11,textAlign:'right',outline:'none'},type:"number",value:p.extra,onChange:e=>updatePago(p.id,'extra',e.target.value),onFocus:e=>e.target.select()})),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{style:{width:72,padding:'4px 6px',background:'var(--cream)',border:'1px solid rgba(176,48,48,0.3)',borderRadius:6,color:'var(--danger)',fontFamily:'JetBrains Mono',fontSize:11,textAlign:'right',outline:'none'},type:"number",value:p.adelanto,onChange:e=>updatePago(p.id,'adelanto',e.target.value),onFocus:e=>e.target.select()})),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{style:{width:72,padding:'4px 6px',background:'var(--cream)',border:'1px solid rgba(176,48,48,0.3)',borderRadius:6,color:'var(--danger)',fontFamily:'JetBrains Mono',fontSize:11,textAlign:'right',outline:'none'},type:"number",value:p.prestamo,onChange:e=>updatePago(p.id,'prestamo',e.target.value),onFocus:e=>e.target.select()})),/*#__PURE__*/React.createElement("td",{style:{fontFamily:'JetBrains Mono',fontWeight:700,fontSize:12,color:p.totalPagar>=0?'var(--success)':'var(--danger)',whiteSpace:'nowrap'}},"$",Math.round(p.totalPagar).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("select",{value:p.estado,onChange:e=>updatePago(p.id,'estado',e.target.value),style:{padding:'4px 8px',borderRadius:6,border:'1px solid var(--border)',background:p.estado==='PAGADO'?'rgba(46,125,79,0.1)':'rgba(176,48,48,0.06)',color:p.estado==='PAGADO'?'var(--success)':'var(--danger)',fontWeight:700,fontSize:11,cursor:'pointer',outline:'none'}},/*#__PURE__*/React.createElement("option",{value:"PENDIENTE"},"PENDIENTE"),/*#__PURE__*/React.createElement("option",{value:"PAGADO"},"PAGADO"))),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{style:{width:100,padding:'4px 6px',background:'var(--cream)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text)',fontSize:11,outline:'none'},placeholder:"Nota...",value:p.obs,onChange:e=>updatePago(p.id,'obs',e.target.value)})),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("button",{className:"action-btn btn-edit",onClick:()=>exportarComprobante(p),title:"Exportar comprobante"},"\uD83D\uDCC4")))),/*#__PURE__*/React.createElement("tr",{className:"totales-row"},/*#__PURE__*/React.createElement("td",null),/*#__PURE__*/React.createElement("td",{style:{fontFamily:'Bebas Neue',fontSize:13,letterSpacing:1}},"TOTALES"),/*#__PURE__*/React.createElement("td",{className:"mono",style:{textAlign:'center',fontWeight:700}},totales.envios.toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",null),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--success)',fontWeight:700}},"$",Math.round(totales.bruto).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",null),/*#__PURE__*/React.createElement("td",null),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--success)'}},"$",Math.round(totales.extra).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--danger)'}},"$",Math.round(totales.adelanto).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--danger)'}},"$",Math.round(totales.prestamo).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--danger)'}},"$",Math.round(totales.consumo).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",null),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--success)',fontWeight:700,fontSize:13}},"$",Math.round(totales.total).toLocaleString('es-CL')),/*#__PURE__*/React.createElement("td",{colSpan:3,style:{color:'var(--text-soft)',fontSize:12}},totales.pagados," pag. / ",totales.pendientes," pend.")))))),
  /*#__PURE__*/React.createElement("div",{className:"pm-tab-historial",style:{display:pagosTab==='historial'?'block':'none',padding:'0 20px 20px'}},/*#__PURE__*/React.createElement(HistorialCierres,{db:db})),/*#__PURE__*/React.createElement("div",{className:"pm-tab-ayudas",style:{padding:'0 20px 20px'}},pagosTab==='ayudas'&&/*#__PURE__*/React.createElement(ConteoAyudas,{mensajeros:mensajeros,toast:toast})),/*#__PURE__*/React.createElement("div",{className:"pm-tab-retiros"},
  /*#__PURE__*/React.createElement(PlanillaRetiros,{clientes:clientes,mensajeros:mensajeros,retirosDB:retirosDB,setRetirosDB:setRetirosDB,retiroFecha:retiroFecha,setRetiroFecha:setRetiroFecha,toast:toast})
),
  /*#__PURE__*/React.createElement("div",{className:"pm-tab-productos"},/*#__PURE__*/React.createElement("div",{className:"section-head"},/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:14,letterSpacing:1.5,color:'var(--dark)'}},"Productos en Venta"),/*#__PURE__*/React.createElement("button",{className:"btn-add",onClick:function(){var nid=Math.max.apply(null,[0].concat(productosLocal.map(function(p){return p.id;}))).valueOf()+1;setProductosLocal(function(prev){return prev.concat([{id:nid,nombre:'',precio:0,activo:true}]);});}},"+ Agregar")),/*#__PURE__*/React.createElement("div",{className:"table-wrap"},/*#__PURE__*/React.createElement("table",null,/*#__PURE__*/React.createElement("thead",null,/*#__PURE__*/React.createElement("tr",null,/*#__PURE__*/React.createElement("th",null,"Producto"),/*#__PURE__*/React.createElement("th",{style:{width:160}},"Precio ($)"),/*#__PURE__*/React.createElement("th",{style:{width:80,textAlign:"center"}},"Activo"),/*#__PURE__*/React.createElement("th",{style:{width:50}}))),/*#__PURE__*/React.createElement("tbody",null,productosLocal.map(function(p,i){return/*#__PURE__*/React.createElement("tr",{key:p.id,style:{background:i%2===0?"#fff":"var(--cream)"}},/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{className:"form-input",value:p.nombre,placeholder:"Ej: Almuerzo",onChange:function(e){var v=e.target.value;setProductosLocal(function(prev){return prev.map(function(x){return x.id===p.id?Object.assign({},x,{nombre:v}):x;});});},style:{margin:0}})),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("input",{className:"form-input",type:"number",value:p.precio,onChange:function(e){var v=parseInt(e.target.value)||0;setProductosLocal(function(prev){return prev.map(function(x){return x.id===p.id?Object.assign({},x,{precio:v}):x;});});},style:{margin:0}})),/*#__PURE__*/React.createElement("td",{style:{textAlign:"center"}},/*#__PURE__*/React.createElement("span",{style:{color:p.activo!==false?"var(--success)":"var(--text-soft)",fontWeight:700}},p.activo!==false?"✓":"○")),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("button",{onClick:function(){var pid=p.id;setProductosLocal(function(prev){return prev.filter(function(x){return x.id!==pid;});});},style:{padding:"4px 8px",borderRadius:6,border:"none",background:"rgba(176,48,48,0.1)",color:"#b03030",cursor:"pointer",fontSize:12}},"x")));}))))));}
window.PagosMensajeros = PagosMensajeros;
})();
