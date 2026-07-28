(function(){
var useEffect=React.useEffect, useMemo=React.useMemo, useRef=React.useRef, useState=React.useState;
var AdminEditarEnvio=window.__app.AdminEditarEnvio, COMUNAS_CHILE=window.__app.COMUNAS_CHILE, ESTADOS_ENVIO=window.__app.ESTADOS_ENVIO, EtiquetaPreview=window.__app.EtiquetaPreview, ExportBtn=window.__app.ExportBtn, FotosEntregaConRecarga=window.__app.FotosEntregaConRecarga, Modal=window.__app.Modal, confirmarCodigo=window.__app.confirmarCodigo, crearEntradaHistorial=window.__app.crearEntradaHistorial, db=window.__app.db, diasDesdeFecha=window.__app.diasDesdeFecha, esEnvioAtrasado=window.__app.esEnvioAtrasado, estadoBadge=window.__app.estadoBadge, estadoInfo=window.__app.estadoInfo, exportToExcel=window.__app.exportToExcel, fechaHoyCL=window.__app.fechaHoyCL, imprimirFotoEtiqueta=window.__app.imprimirFotoEtiqueta, lsLoad=window.__app.lsLoad, lsSave=window.__app.lsSave, normalizarNombre=window.__app.normalizarNombre, perfil=window.__app.perfil, playSound=window.__app.playSound, subirFotoStorage=window.__app.subirFotoStorage;
function GestionEnvios(_ref26){var _detalleEnvio$mensaje;let mensajeros=_ref26.mensajeros,clientes=_ref26.clientes,toast=_ref26.toast,esSuperAdmin=_ref26.esSuperAdmin,esAdmin=_ref26.esAdmin,usuario=_ref26.usuario;const _useState60=useState(()=>lsLoad('gestion_envios',[])),envios=_useState60[0],setEnvios=_useState60[1];const _useState61=useState('lista'),subTab=_useState61[0],setSubTab=_useState61[1];const _useState62=useState(''),search=_useState62[0],setSearch=_useState62[1];const _useState63=useState('todos'),filtroEst=_useState63[0],setFiltroEst=_useState63[1];const _useState64=useState('todos'),filtroCli=_useState64[0],setFiltroCli=_useState64[1];const _useState65=useState('todos'),filtroMen=_useState65[0],setFiltroMen=_useState65[1];const _useState66=useState(new Set()),selected=_useState66[0],setSelected=_useState66[1];const _useState67=useState(false),asignarModal=_useState67[0],setAsignarModal=_useState67[1];const _useState68=useState(''),mensajeroAsignar=_useState68[0],setMensajeroAsignar=_useState68[1];const _useState69=useState(null),detalleEnvio=_useState69[0],setDetalleEnvio=_useState69[1];const _useState70=useState(1),page=_useState70[0],setPage=_useState70[1];const _useState71=useState(false),sincronizando=_useState71[0],setSincronizando=_useState71[1];const _useState71b=useState(false),showListaNegra=_useState71b[0],setShowListaNegra=_useState71b[1];const _useState71cc=useState(false),cambiarClienteModal=_useState71cc[0],setCambiarClienteModal=_useState71cc[1];const _useState71dd=useState(''),clienteCambio=_useState71dd[0],setClienteCambio=_useState71dd[1];
const _useState71c=useState(false),showPDFModal=_useState71c[0],setShowPDFModal=_useState71c[1];
const _useState71d=useState(''),clientePDF=_useState71d[0],setClientePDF=_useState71d[1];
const _useState71e=useState(null),pdfPreview=_useState71e[0],setPdfPreview=_useState71e[1];
const _useState71f=useState(false),procesandoPDF=_useState71f[0],setProcesandoPDF=_useState71f[1];
const _useState71g=useState(''),progresoPDF=_useState71g[0],setProgresoPDF=_useState71g[1];
const _uPerGE=useState('semana'),periodo=_uPerGE[0],setPeriodo=_uPerGE[1];
const _uMesGE=useState(new Date().toISOString().slice(0,7)),mesFiltro=_uMesGE[0],setMesFiltro=_uMesGE[1];
const _uD1GE=useState(''),desde=_uD1GE[0],setDesde=_uD1GE[1];
const _uD2GE=useState(''),hasta=_uD2GE[0],setHasta=_uD2GE[1];
const pdfRef=useRef();const _usePS=useState(50),PAGE_SIZE=_usePS[0],setPageSize=_usePS[1];const fileRef=useRef();const edicionesRecientesRef=useRef({});useEffect(()=>{lsSave('gestion_envios',envios);},[envios]);useEffect(()=>{sincronizarDesdeSupabase();const _autoSyncInterval=setInterval(sincronizarDesdeSupabase,60000);return()=>clearInterval(_autoSyncInterval);},[]);async function sincronizarDesdeSupabase(){setSincronizando(true);try{
  // Trae TODO el historial (no solo hoy/en_bodega/en_ruta), paginado en bloques de 1000
  // para no chocar con el tope de fila de Supabase. A pedido de Luis: Gestion de Envios
  // debe mostrar siempre el historial completo, igual que Consulta Express y el Dashboard.
  const COLS='codigo,cliente,destinatario,telefono,direccion,comuna,referencia,fecha,estado,mensajero,monto,en_un_cambio,nota,nota_admin,fuente,peso,valor_siniestro,updated_at,created_at';
  let rows=[];let offset=0;const BLOQUE=1000;
  while(true){
    const _r=await db.from('envios').select(COLS).neq('estado','eliminado').order('updated_at',{ascending:false}).range(offset,offset+BLOQUE-1);
    if(_r.error)throw _r.error;
    const data=_r.data||[];
    rows=rows.concat(data);
    if(data.length<BLOQUE)break;
    offset+=BLOQUE;
  }
  setEnvios(prev=>{const mapaLocal={};prev.forEach(e=>{mapaLocal[e.codigo]=e;});const ahora=Date.now();const merged=rows.map(sb=>{var _mapaLocal$sb$codigo,_mapaLocal$sb$codigo2;const local=mapaLocal[sb.codigo];const edicionReciente=edicionesRecientesRef.current[sb.codigo];const usarLocalReciente=edicionReciente&&(ahora-edicionReciente.ts)<10000;return{id:((_mapaLocal$sb$codigo=mapaLocal[sb.codigo])==null?void 0:_mapaLocal$sb$codigo.id)||sb.id,codigo:sb.codigo,cliente:sb.cliente||'',destinatario:sb.destinatario||'',telefono:sb.telefono||'',direccion:sb.direccion||'',comuna:sb.comuna||'',referencia:sb.referencia||'',fecha:sb.fecha||fechaHoyCL(),estado:usarLocalReciente?edicionReciente.estado:(sb.estado||'en_bodega'),mensajero:usarLocalReciente?edicionReciente.mensajero:(sb.mensajero||''),monto:sb.monto||0,enUnCambio:sb.en_un_cambio||false,nota:sb.nota||'',nota_admin:sb.nota_admin||'',fuente:sb.fuente||'propio',peso:sb.peso||null,valor_siniestro:sb.valor_siniestro||null,historial:((_mapaLocal$sb$codigo2=mapaLocal[sb.codigo])==null?void 0:_mapaLocal$sb$codigo2.historial)||[{fecha:sb.created_at,estado:sb.estado,nota:'Desde Supabase'}],_synced:true};});const codigosSupabase=new Set(rows.map(e=>e.codigo));const eliminados=new Set(lsLoad('envios_eliminados',[]));const soloLocal=prev.filter(e=>!codigosSupabase.has(e.codigo)&&!eliminados.has(e.codigo)&&e._synced!==true);const mergedFiltrado=merged.filter(e=>!eliminados.has(e.codigo));return[...mergedFiltrado,...soloLocal];});toast(rows.length>0?`✓ Sincronizado: ${rows.length} envíos desde la nube`:'✓ Sincronizado: 0 envíos activos en la nube');}catch(e){toast('⚠ Error de sincronización: '+e.message);}setSincronizando(false);}useEffect(()=>{const channel=db.channel('admin-envios').on('postgres_changes',{event:'UPDATE',schema:'public',table:'envios',filter:'fecha=eq.'+fechaHoyCL()},payload=>{const sb=payload.new;const edicionReciente=edicionesRecientesRef.current[sb.codigo];const esPropio=edicionReciente&&(Date.now()-edicionReciente.ts)<10000;setEnvios(prev=>prev.map(e=>{if(e.codigo!==sb.codigo)return e;if(esPropio)return{...e,estado:sb.estado,mensajero:sb.mensajero||e.mensajero,nota:sb.nota||e.nota};if(e.historial.length>0&&e.historial[e.historial.length-1].estado===sb.estado&&e.historial[e.historial.length-1].nota==='Actualizado por Rider')return e;return{...e,estado:sb.estado,mensajero:sb.mensajero||e.mensajero,nota:sb.nota||e.nota,historial:[...e.historial,{fecha:new Date().toISOString(),estado:sb.estado,nota:'Actualizado por Rider'}]};}));}).subscribe();return()=>{db.removeChannel(channel);};},[]);const mensajerosActivos=mensajeros.filter(m=>m.activo);const clientesActivos=clientes.filter(c=>c.activo);function importarExcelSistema(file){const reader=new FileReader();reader.onload=e=>{try{let wb;try{wb=XLSX.read(e.target.result,{type:'array',cellDates:true});}catch(e1){wb=XLSX.read(e.target.result,{type:'array'});}const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});if(!rows.length){toast('⚠ Archivo vacío');return;}const nuevos=rows.map((r,i)=>{const codigo=String(r['Envio']||r['Código']||r['codigo']||'').replace(/^'/,'').trim();const est=parseEstadoSistema(r['Estatus de Envio']||r['Estado']||'');return{id:Date.now()+i,codigo:codigo||'IMP-'+String(i+1).padStart(6,'0'),cliente:(r['Cliente']||'').toString().trim().toUpperCase(),despachador:(r['Despachador']||'').toString().trim(),destinatario:(r['Destinatario']||'').toString().trim(),telefono:(r['Telefono']||r['Teléfono']||'').toString().trim(),direccion:(r['Direccion']||r['Dirección']||'').toString().trim(),comuna:(r['Comuna']||'').toString().trim(),fecha:fechaHoyCL(),estado:est,mensajero:normalizarNombre(r['Despachador']||''),monto:parseFloat(String(r['Cobrar/Monto']||0).replace(/[^0-9.]/g,''))||0,nota:(r['Nota']||'').toString().trim(),fuente:'sistema',historial:[{fecha:new Date().toISOString(),estado:est,nota:'Importado desde sistema'}]};}).filter(e=>e.codigo);const syncToSupabase=async enviosNuevos=>{const BATCH=50;const mapear=e=>({codigo:e.codigo,cliente:e.cliente||'',destinatario:e.destinatario||'',telefono:e.telefono||'',direccion:e.direccion||'',comuna:e.comuna||'',referencia:e.referencia||'',fecha:fechaHoyCL(),estado:e.estado||'en_bodega',mensajero:e.mensajero||'',monto:e.monto||0,en_un_cambio:e.enUnCambio||false,nota:e.nota||'',fuente:e.fuente||'sistema'});for(let i=0;i<enviosNuevos.length;i+=BATCH){const lote=enviosNuevos.slice(i,i+BATCH).map(mapear);try{await db.from('envios').upsert(lote,{onConflict:'codigo'});}catch(err){console.warn('Sync lote error:',err.message);}}};setEnvios(prev=>{
  const mapaExist={};
  prev.forEach(e=>{mapaExist[e.codigo]=e;});
  // Para cada envío del Excel: si existe → actualizar solo estado/datos; si no → crear
  const actualizados=nuevos.map(n=>{
    if(mapaExist[n.codigo]){
      const exist=mapaExist[n.codigo];
      const cambios={};
      // Solo actualizar campos que vengan del Excel y sean mejores
      if(n.estado&&n.estado!==exist.estado)cambios.estado=n.estado;
      if(n.mensajero&&!exist.mensajero)cambios.mensajero=n.mensajero;
      if(n.destinatario&&!exist.destinatario)cambios.destinatario=n.destinatario;
      if(n.direccion&&!exist.direccion)cambios.direccion=n.direccion;
      if(n.comuna&&!exist.comuna)cambios.comuna=n.comuna;
      if(n.cliente&&!exist.cliente)cambios.cliente=n.cliente;
      if(n.telefono&&!exist.telefono)cambios.telefono=n.telefono;
      const tieneCambios=Object.keys(cambios).length>0;
      if(!tieneCambios)return exist;
      const historialExtra=cambios.estado?[{fecha:new Date().toISOString(),estado:cambios.estado,nota:'Actualizado desde Excel del sistema',usuario:'Sistema'}]:[];
      return{...exist,...cambios,historial:[...exist.historial,...historialExtra]};
    }
    return n; // nuevo
  });
  // Códigos ya procesados (existentes + nuevos del Excel)
  const codigosExcel=new Set(nuevos.map(n=>n.codigo));
  // Envíos locales que NO están en el Excel (otros días, otros clientes)
  const soloLocales=prev.filter(e=>!codigosExcel.has(e.codigo));
  syncToSupabase(actualizados);
  return[...soloLocales,...actualizados];
});const nuevosCount=nuevos.filter(n=>{const local=lsLoad('gestion_envios',[]);return!local.find(e=>e.codigo===n.codigo);}).length;const actualizadosCount=nuevos.length-nuevosCount;toast(`✓ ${nuevos.length} envíos procesados · ${actualizadosCount} actualizados · ${nuevosCount} nuevos`);}catch(err){toast('⚠ Error: '+err.message);}};reader.readAsArrayBuffer(file);}function importarExcelPropio(file){const reader=new FileReader();reader.onload=e=>{try{let wb;try{wb=XLSX.read(e.target.result,{type:'array',cellDates:true});}catch(e1){wb=XLSX.read(e.target.result,{type:'array'});}const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{defval:''});if(!rows.length){toast('⚠ Archivo vacío');return;}const nuevos=rows.map((r,i)=>{const codigoExcel=String(r['Codigo']||r['Código']||r['codigo']||r['N° Envío']||r['Envio']||r['Número de Envío']||r['numero_envio']||r['tracking']||r['Tracking']||'').replace(/^'/,'').trim();const codigo=codigoExcel||confirmarCodigo();const fuente=codigoExcel?'externo':'propio';return{id:Date.now()+i,codigo,cliente:(r['Cliente']||r['cliente']||r['Remitente']||'').toString().trim().toUpperCase(),despachador:'',destinatario:(r['Destinatario']||r['destinatario']||r['Nombre']||r['nombre']||'').toString().trim(),telefono:(r['Telefono']||r['Teléfono']||r['telefono']||r['Celular']||'').toString().trim(),direccion:(r['Direccion']||r['Dirección']||r['direccion']||r['Calle']||'').toString().trim(),comuna:(r['Comuna']||r['comuna']||'').toString().trim(),fecha:fechaHoyCL(),estado:'en_bodega',mensajero:'',monto:parseFloat(String(r['Monto']||r['monto']||r['Cobrar']||0).replace(/[^0-9.]/g,''))||0,nota:(r['Nota']||r['nota']||r['Referencia']||r['referencia']||'').toString().trim(),fuente,historial:[{fecha:new Date().toISOString(),estado:'en_bodega',nota:codigoExcel?`Importado con código externo ${codigoExcel}`:'Importado desde Excel propio — código PGSO asignado'}]};}).filter(e=>e.destinatario||e.direccion||e.codigo);setEnvios(prev=>{
  const mapaExist={};
  prev.forEach(e=>{mapaExist[e.codigo]=e;});
  // Upsert: actualizar si ya existe, agregar si es nuevo
  const procesados=nuevos.map(n=>{
    if(mapaExist[n.codigo]){
      const exist=mapaExist[n.codigo];
      return{...exist,
        destinatario:n.destinatario||exist.destinatario,
        telefono:n.telefono||exist.telefono,
        direccion:n.direccion||exist.direccion,
        comuna:n.comuna||exist.comuna,
        cliente:n.cliente||exist.cliente,
        monto:n.monto||exist.monto,
        nota:n.nota||exist.nota,
      };
    }
    return n;
  });
  const codigosExcel=new Set(nuevos.map(n=>n.codigo));
  const soloLocales=prev.filter(e=>!codigosExcel.has(e.codigo));
  return[...soloLocales,...procesados];
});
const conCodigo=nuevos.filter(e=>e.fuente==='externo').length;
const sinCodigo=nuevos.filter(e=>e.fuente==='propio').length;
const msg=conCodigo>0&&sinCodigo>0?`✓ ${nuevos.length} envíos cargados · ${conCodigo} con código externo · ${sinCodigo} con código PGSO`:conCodigo>0?`✓ ${nuevos.length} envíos cargados con códigos externos (ML/Falabella/Shopify)`:`✓ ${nuevos.length} envíos cargados con códigos PGSO`;toast(msg);}catch(err){toast('⚠ Error: '+err.message);}};reader.readAsArrayBuffer(file);}function importarPDF(file,cliente){
  if(!cliente){toast('⚠ Selecciona un cliente primero');return;}
  setProcesandoPDF(true);
  setProgresoPDF('📄 Leyendo PDF...');
  const reader=new FileReader();
  reader.onload=async e=>{
    try{
      const arrayBuffer=e.target.result;
      if(!window.pdfjsLib){throw new Error('pdf.js no cargado. Recarga la página.');}
      window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdfDoc=await window.pdfjsLib.getDocument({data:arrayBuffer}).promise;
      const totalPags=pdfDoc.numPages;
      setProgresoPDF('📄 PDF cargado · '+totalPags+' páginas · Extrayendo datos...');
      const envios=[];
      for(let i=1;i<=totalPags;i++){
        if(i%10===0||i===1){
            setProgresoPDF('⚙ Procesando página '+i+' / '+totalPags+'...');
            await new Promise(r=>setTimeout(r,0)); // yield al browser para re-render
          }
        try{
          const page=await pdfDoc.getPage(i);
          // Extraer texto
          const tc=await page.getTextContent();
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
              await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
              foto_etiqueta=cv.toDataURL('image/jpeg',0.72);
              cv.width=0;cv.height=0; // liberar memoria
              foto_etiqueta=await subirFotoStorage(foto_etiqueta,codigo,'etq','etiquetas');
            }catch(re){console.warn('Error render pág '+i,re);}
          }
          envios.push({
            id:Date.now()+i,
            codigo,cliente,destinatario,direccion,referencia,
            comuna:comuna.toUpperCase(),zona,telefono:'',fecha,
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
      for(const e of procesados.slice(0,500)){
        try{
          const upsertData={codigo:e.codigo,cliente:e.cliente||'',destinatario:e.destinatario||'',telefono:e.telefono||'',direccion:e.direccion||'',comuna:e.comuna||'',referencia:e.referencia||'',fecha:fechaHoyCL(),estado:e.estado||'en_bodega',mensajero:e.mensajero||'',monto:0,en_un_cambio:false,nota:e.nota||'',fuente:'externo'};
          if(e.foto_etiqueta)upsertData.foto_etiqueta=e.foto_etiqueta;
          await db.from('envios').upsert(upsertData,{onConflict:'codigo'});
        }catch(err){}
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
async function cambiarEstado(ids,nuevoEstado,nota){if(nota===void 0){nota='';}const enviosAfectados=envios.filter(e=>ids.has(e.id));setEnvios(prev=>prev.map(e=>{if(!ids.has(e.id))return e;const notaFinal=nota||`Estado cambiado a ${estadoInfo(nuevoEstado).label}`+(e.mensajero?` (mensajero: ${e.mensajero.replace(/,\s*/g,' ')})`:'');return{...e,estado:nuevoEstado,mensajero:nuevoEstado==='sin_asignar'?'':e.mensajero,historial:[...e.historial,crearEntradaHistorial(nuevoEstado,notaFinal,usuario?.nombre||'Admin')]};}));setSelected(new Set());toast(`✓ ${ids.size} envío${ids.size>1?'s':''} → ${estadoInfo(nuevoEstado).label}`);for(const e of enviosAfectados){try{await db.from('envios').upsert({codigo:e.codigo,cliente:e.cliente||'',destinatario:e.destinatario||'',telefono:e.telefono||'',direccion:e.direccion||'',comuna:e.comuna||'',referencia:e.referencia||'',fecha:fechaHoyCL(),estado:nuevoEstado,mensajero:nuevoEstado==='sin_asignar'?'':e.mensajero,monto:e.monto||0,en_un_cambio:e.enUnCambio||false,nota:nota||e.nota||'',fuente:e.fuente||'propio'},{onConflict:'codigo'});}catch(err){console.warn('Supabase sync error:',err.message);}}}async function asignarMensajero(){if(!mensajeroAsignar){toast('Selecciona un mensajero');return;}const ids=selected;const enviosSeleccionados=envios.filter(e=>ids.has(e.id));enviosSeleccionados.forEach(e=>{edicionesRecientesRef.current[e.codigo]={estado:'en_ruta',mensajero:mensajeroAsignar,ts:Date.now()};});setEnvios(prev=>prev.map(e=>{if(!ids.has(e.id))return e;return{...e,mensajero:mensajeroAsignar,estado:'en_ruta',historial:[...e.historial,crearEntradaHistorial('asignado',`Asignado a ${mensajeroAsignar}`,usuario?.nombre||'Admin')]};}));for(const e of enviosSeleccionados){try{await db.from('envios').upsert({codigo:e.codigo,cliente:e.cliente||'',destinatario:e.destinatario||'',telefono:e.telefono||'',direccion:e.direccion||'',comuna:e.comuna||'',referencia:e.referencia||'',fecha:fechaHoyCL(),estado:'en_ruta',mensajero:mensajeroAsignar,monto:e.monto||0,en_un_cambio:e.enUnCambio||false,nota:e.nota||'',fuente:e.fuente||'propio'},{onConflict:'codigo'});}catch(err){console.warn('Supabase sync error:',err.message);}}setSelected(new Set());setAsignarModal(false);playSound('ruta');toast(`✓ ${ids.size} envío${ids.size>1?'s':''} asignado${ids.size>1?'s':''} a ${mensajeroAsignar} · Sincronizado`);}async function eliminarSeleccionados(){
  if(!esSuperAdmin){toast('Solo el Super Admin puede eliminar envíos');return;}
  const count=selected.size;
  if(!window.confirm(`¿Eliminar PERMANENTEMENTE ${count} envío${count>1?'s':''} de Supabase? Esta acción NO SE PUEDE DESHACER.`))return;
  
  const enviosElim=envios.filter(e=>selected.has(e.id));
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
}const hoyGE=fechaHoyCL();
const lunesStrGE=(()=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
function enPeriodoGE(e){
  const fi=(e.fecha||'').slice(0,10);
  if(periodo==='hoy')return fi===hoyGE;
  if(periodo==='semana')return fi>=lunesStrGE&&fi<=hoyGE;
  if(periodo==='mes')return fi.startsWith(mesFiltro||hoyGE.slice(0,7));
  if(periodo==='rango')return(!desde||fi>=desde)&&(!hasta||fi<=hasta);
  return true;
}
const enviosPeriodo=useMemo(()=>envios.filter(enPeriodoGE),[envios,periodo,mesFiltro,desde,hasta]);
const clientesUnicos=[...new Set(envios.map(e=>e.cliente).filter(Boolean))].sort();const mensajerosUnicos=[...new Set(envios.map(e=>e.mensajero).filter(Boolean))].sort();const filtrados=useMemo(()=>{const q=search.trim().toLowerCase();return enviosPeriodo.filter(e=>{const qTerms=q.split(/[\n,;\s]+/).map(t=>t.trim().toLowerCase()).filter(Boolean);
      const esMultiple=qTerms.length>1;
      const matchQ=!q||(esMultiple
        ?qTerms.some(t=>e.codigo.toLowerCase()===t||e.codigo.toLowerCase().includes(t))
        :e.codigo.toLowerCase().includes(q)||e.destinatario.toLowerCase().includes(q)||e.direccion.toLowerCase().includes(q)||e.comuna.toLowerCase().includes(q)||e.cliente.toLowerCase().includes(q)||(e.mensajero||'').toLowerCase().includes(q)||estadoInfo(e.estado).label.toLowerCase().includes(q)||(e.fecha||'').toLowerCase().includes(q));const matchEst=filtroEst==='todos'||e.estado===filtroEst;const matchCli=filtroCli==='todos'||e.cliente===filtroCli;const matchMen=filtroMen==='todos'||e.mensajero===filtroMen;return matchQ&&matchEst&&matchCli&&matchMen;});},[envios,search,filtroEst,filtroCli,filtroMen]);const totalPags=Math.max(1,Math.ceil(filtrados.length/PAGE_SIZE));const paginado=filtrados.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);const stats=useMemo(()=>{const s={};ESTADOS_ENVIO.forEach(est=>{s[est.val]=enviosPeriodo.filter(e=>e.estado===est.val).length;});return s;},[enviosPeriodo]);function toggleSelect(id){setSelected(prev=>{const s=new Set(prev);if(s.has(id))s.delete(id);else s.add(id);return s;});}function toggleAll(){const todosIds=new Set(filtrados.map(e=>e.id));if(selected.size===filtrados.length&&filtrados.every(e=>selected.has(e.id)))setSelected(new Set());else setSelected(todosIds);}async function imprimirEtiquetasSeleccionadas(){
  const codigos=envios.filter(e=>selected.has(e.id)).map(e=>e.codigo);
  if(codigos.length===0)return;
  toast('Buscando etiquetas...');
  try{
    const CHUNK=200;
    let filas=[];
    for(let i=0;i<codigos.length;i+=CHUNK){
      const lote=codigos.slice(i,i+CHUNK);
      const {data,error}=await db.from('envios').select('codigo,foto_etiqueta').in('codigo',lote);
      if(error)throw error;
      filas=filas.concat(data||[]);
    }
    const urls=filas.filter(f=>f.foto_etiqueta).map(f=>f.foto_etiqueta);
    const sinEtiqueta=codigos.length-urls.length;
    if(urls.length===0){toast('⚠ Ninguno de los seleccionados tiene foto de etiqueta cargada');return;}
    if(sinEtiqueta>0)toast('⚠ '+sinEtiqueta+' de '+codigos.length+' no tienen foto de etiqueta, se imprimirán '+urls.length);
    imprimirFotoEtiqueta(urls);
  }catch(e){toast('⚠ Error buscando etiquetas: '+e.message);}
}const fmtFecha=f=>{try{return new Date(f+'T12:00:00').toLocaleDateString('es-CL');}catch(e){return f;}};const fechaEntregaDe=e=>{if(e.historial&&e.historial.length>0){const ent=[...e.historial].reverse().find(h=>h.estado==='entregado');if(ent&&ent.fecha)return ent.fecha;}if(e.estado==='entregado'&&e.updated_at)return e.updated_at;return'';};const fmtFechaHora=iso=>{try{return new Date(iso).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){return iso||'';}};return/*#__PURE__*/React.createElement("div",null,/*#__PURE__*/React.createElement("div",{className:"section-head",style:{flexWrap:'wrap',gap:10}},/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',gap:12}},/*#__PURE__*/React.createElement("div",{className:"section-title"},"Gesti\xF3n de ",/*#__PURE__*/React.createElement("span",null,"Env\xEDos")),/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',gap:6,background:'rgba(46,125,79,0.1)',border:'1px solid rgba(46,125,79,0.2)',borderRadius:20,padding:'4px 10px'}},/*#__PURE__*/React.createElement("div",{style:{width:8,height:8,borderRadius:'50%',background:'#2e7d4f',animation:'pulse 2s infinite'}}),/*#__PURE__*/React.createElement("span",{style:{fontSize:10,color:'#2e7d4f',fontWeight:700,letterSpacing:1}},"TIEMPO REAL"))),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:8,flexWrap:'wrap'}},/*#__PURE__*/React.createElement("button",{onClick:sincronizarDesdeSupabase,disabled:sincronizando,className:'btn-futurista btn-f-dark',style:{display:'flex',alignItems:'center',gap:6,opacity:sincronizando?0.7:1}},sincronizando?'↺ Sincronizando...':'↺ Sincronizar Riders'),
  (()=>{const listaNegraCount=lsLoad('envios_eliminados',[]).length;return/*#__PURE__*/React.createElement("button",{onClick:()=>setShowListaNegra(v=>!v),style:{padding:'8px 14px',borderRadius:8,border:'1px solid '+(listaNegraCount>0?'rgba(176,48,48,0.8)':'rgba(100,100,100,0.4)'),background:showListaNegra?'rgba(176,48,48,0.25)':(listaNegraCount>0?'rgba(176,48,48,0.15)':'rgba(80,80,80,0.12)'),color:'#ffffff',cursor:'pointer',fontWeight:700,fontSize:12,display:'flex',alignItems:'center',gap:6}},"⊘ Lista negra",(listaNegraCount>0&&/*#__PURE__*/React.createElement("span",{style:{background:'rgba(176,48,48,0.3)',borderRadius:10,padding:'1px 7px',fontSize:11}},listaNegraCount)));})(),/*#__PURE__*/React.createElement("input",{ref:fileRef,type:"file",accept:".xlsx,.xls,.htm,.html",style:{display:'none'},onChange:e=>{const f=e.target.files[0];if(!f)return;const name=f.name.toLowerCase();if(name.includes('carga_pgso')||name.includes('carga_p'))importarExcelSistema(f);else importarExcelPropio(f);e.target.value='';}}),
/*#__PURE__*/React.createElement("input",{id:"gestion-pdf-inp",ref:pdfRef,type:"file",accept:"application/pdf",style:{display:'none'},onChange:e=>{const f=e.target.files[0];if(!f)return;importarPDF(f,window._colecta_pdf_cliente||clientePDF);e.target.value='';}})  ,/*#__PURE__*/React.createElement("button",{onClick:()=>setSubTab('nuevo'),className:'btn-futurista btn-f-gold'},"+ Nuevo Env\xEDo"))),showPDFModal&&/*#__PURE__*/React.createElement(Modal,{title:'📄 Importar PDF Flex',onClose:()=>{setShowPDFModal(false);setPdfPreview(null);setClientePDF('');}},
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
  [{val:'hoy',label:'Hoy'},{val:'semana',label:'Esta semana'},{val:'mes',label:'Mes'},{val:'rango',label:'Rango'}].map(function(p){return/*#__PURE__*/React.createElement('button',{key:p.val,onClick:function(){setPeriodo(p.val);setPage(1);},style:{padding:'6px 16px',borderRadius:20,border:'1px solid '+(periodo===p.val?'var(--gold)':'var(--border)'),background:periodo===p.val?'rgba(200,168,75,0.12)':'#fff',color:periodo===p.val?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer',transition:'all 0.15s'}},p.label);}),
  periodo==='mes'&&/*#__PURE__*/React.createElement('input',{type:'month',value:mesFiltro,onChange:function(e){setMesFiltro(e.target.value);setPage(1);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--gold)',fontSize:12,outline:'none',color:'var(--dark)'}}),
  periodo==='rango'&&/*#__PURE__*/React.createElement(React.Fragment,null,
    /*#__PURE__*/React.createElement('input',{type:'date',value:desde,onChange:function(e){setDesde(e.target.value);setPage(1);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12,outline:'none'}}),
    /*#__PURE__*/React.createElement('span',{style:{color:'var(--text-soft)',fontSize:12}},'al'),
    /*#__PURE__*/React.createElement('input',{type:'date',value:hasta,onChange:function(e){setHasta(e.target.value);setPage(1);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12,outline:'none'}})
  ),
  /*#__PURE__*/React.createElement('span',{style:{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1,color:'var(--dark)',background:'linear-gradient(145deg,#fff,#f5eedc)',border:'1.5px solid var(--gold)',borderRadius:12,padding:'6px 16px',boxShadow:'3px 3px 8px rgba(43,46,32,0.1)'}},
    /*#__PURE__*/React.createElement('span',{style:{color:'var(--gold)',fontSize:22}},enviosPeriodo.length.toLocaleString('es-CL')),
    /*#__PURE__*/React.createElement('span',{style:{fontSize:11,fontFamily:'DM Sans',color:'var(--text-soft)',letterSpacing:0,textTransform:'none'}},'envíos en período')
  )
),
/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:10,flexWrap:'wrap',marginBottom:20,paddingTop:14,overflowX:'auto'}},[{val:'todos',label:'Todos',color:'var(--gold)'},...ESTADOS_ENVIO].map(est=>{const count=est.val==='todos'?enviosPeriodo.length:stats[est.val]||0;const active=filtroEst===est.val;const accentColor=est.color||'var(--gold)';return/*#__PURE__*/React.createElement("div",{key:est.val,onClick:()=>{setFiltroEst(est.val);setPage(1);},style:{
  padding:'16px 18px',borderRadius:14,cursor:'pointer',minWidth:100,textAlign:'center',
  background:active?'linear-gradient(145deg,#ffffff,#f0e8d0)':'linear-gradient(145deg,#fff,#faf3e0)',
  border:'2px solid '+(active?accentColor:'rgba(200,168,75,0.12)'),
  borderTop:'4px solid '+(active?accentColor:'rgba(200,168,75,0.08)'),
  boxShadow:active?'8px 8px 16px rgba(43,46,32,0.15),-3px -3px 8px rgba(255,255,255,0.95),0 0 20px '+accentColor+'33':'4px 4px 8px rgba(43,46,32,0.08),-2px -2px 6px rgba(255,255,255,0.9)',
  transform:active?'perspective(600px) rotateX(-2deg) translateY(-5px)':'perspective(600px) rotateX(0deg)',
  transition:'all 0.25s cubic-bezier(0.34,1.56,0.64,1)'}},
  /*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:42,lineHeight:1,
    color:active?accentColor:'#9a9d8a',
    textShadow:active?'0 0 12px '+accentColor+'88':'none',
    filter:active?'drop-shadow(0 2px 2px rgba(43,46,32,0.2))':'none',
    transition:'all 0.25s'}},count),
  /*#__PURE__*/React.createElement("div",{style:{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:active?accentColor:'#b0b3a0',marginTop:8,transition:'all 0.25s'}},est.label));})),selected.size>0&&/*#__PURE__*/React.createElement("div",{style:{background:'linear-gradient(145deg,#ffffff,#f5eedc)',border:'1px solid rgba(200,168,75,0.3)',borderTop:'3px solid var(--gold)',borderRadius:14,padding:'16px 20px',marginBottom:16,boxShadow:'6px 6px 16px rgba(43,46,32,0.12),-2px -2px 8px rgba(255,255,255,0.9)'}},
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
    ESTADOS_ENVIO.map(est=>React.createElement("button",{key:est.val,onClick:()=>cambiarEstado(selected,est.val),style:{padding:'10px 18px',borderRadius:10,border:'2px solid '+est.color,background:'linear-gradient(145deg,'+est.color+'25,'+est.color+'0a)',color:est.color,fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:1.5,whiteSpace:'nowrap',fontFamily:'Bebas Neue',boxShadow:'4px 4px 10px '+est.color+'33,-2px -2px 6px rgba(255,255,255,0.9),inset 0 1px 0 rgba(255,255,255,0.3)',transition:'all 0.2s'}},est.icon||'→',' ',est.label)),
    esSuperAdmin&&React.createElement("button",{onClick:eliminarSeleccionados,className:'btn-futurista btn-f-danger',style:{marginLeft:'auto'}},"Eliminar permanente")
  )
),/*#__PURE__*/React.createElement("div",{className:"toolbar",style:{marginBottom:12}},/*#__PURE__*/React.createElement("textarea",{className:"search-box",placeholder:"Buscar por código, destinatario, dirección...\nPega múltiples códigos (uno por línea) para búsqueda masiva",value:search,onChange:function(e){setSearch(e.target.value);setPage(1);},rows:search.split("\n").length>1?Math.min(search.split("\n").length,4):1,style:{resize:"vertical",minHeight:38,fontFamily:"inherit",fontSize:13,lineHeight:1.4}}),/*#__PURE__*/React.createElement("select",{className:"filter-btn",style:{background:'#fff'},value:filtroCli,onChange:e=>{setFiltroCli(e.target.value);setPage(1);}},/*#__PURE__*/React.createElement("option",{value:"todos"},"Todos los clientes"),clientesUnicos.map(c=>/*#__PURE__*/React.createElement("option",{key:c,value:c},c))),/*#__PURE__*/React.createElement("select",{className:"filter-btn",style:{background:'#fff'},value:filtroMen,onChange:e=>{setFiltroMen(e.target.value);setPage(1);}},/*#__PURE__*/React.createElement("option",{value:"todos"},"Todos los mensajeros"),mensajerosUnicos.map(m=>/*#__PURE__*/React.createElement("option",{key:m,value:m},m.replace(/,\s*/g,' '))))),envios.length===0&&/*#__PURE__*/React.createElement("div",{className:"info-banner"},"\uD83D\uDCE5 Importa el archivo del sistema (CARGA_PGSO) o un Excel propio. Si tu Excel ya tiene c\xF3digos (ML, Falabella, Shopify) se respetan tal cual. Si no tiene c\xF3digo, se genera uno PGSO autom\xE1ticamente."),filtrados.length>0&&/*#__PURE__*/React.createElement("div",{style:{fontSize:12,color:'var(--text-soft)',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0'}},/*#__PURE__*/React.createElement("span",null,/*#__PURE__*/React.createElement("strong",{style:{color:'var(--gold)'}},filtrados.length.toLocaleString('es-CL'))," env\xEDos",filtroEst!=='todos'?` · ${estadoInfo(filtroEst).label}`:''),/*#__PURE__*/React.createElement(ExportBtn,{label:"Exportar",onPDF:()=>{var _document$querySelect10;const logoSrc=((_document$querySelect10=document.querySelector('.logo-img'))==null?void 0:_document$querySelect10.src)||'';const win=window.open('','_blank','width=1000,height=700');const filas=filtrados.slice(0,500).map((e,i)=>`
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
              <script>window.onload=()=>{window.print()}<\/script></body></html>`);win.document.close();},onExcel:()=>{const headers=['#','Código','Cliente','Destinatario','Teléfono','Dirección','Comuna','Mensajero','Estado','Monto','Fecha Recepción','Fecha Entrega','Colecta','Nota'];const rows=filtrados.map((e,i)=>{const fe=fechaEntregaDe(e);return[i+1,e.codigo,e.cliente,e.destinatario,e.telefono,e.direccion,e.comuna,e.mensajero.replace(/,\s*/g,' '),estadoInfo(e.estado).label,e.monto,e.fecha,fe?fmtFecha(fe.slice(0,10)):'—',e.nota||'',e.nota_admin||''];});exportToExcel('Envios_TransPgso_'+fechaHoyCL(),[{name:'Envíos',headers,rows}]);}})),paginado.length>0&&/*#__PURE__*/React.createElement("div",{className:"table-wrap"},/*#__PURE__*/React.createElement("table",null,/*#__PURE__*/React.createElement("thead",null,/*#__PURE__*/React.createElement("tr",null,/*#__PURE__*/React.createElement("th",{style:{width:32,textAlign:'center'}},/*#__PURE__*/React.createElement("input",{type:"checkbox",checked:selected.size===paginado.length&&paginado.length>0,onChange:toggleAll,style:{cursor:'pointer'}})),/*#__PURE__*/React.createElement("th",null,"#"),/*#__PURE__*/React.createElement("th",null,"C\xF3digo"),/*#__PURE__*/React.createElement("th",null,"Cliente"),/*#__PURE__*/React.createElement("th",null,"Destinatario"),/*#__PURE__*/React.createElement("th",null,"Direcci\xF3n"),/*#__PURE__*/React.createElement("th",null,"Comuna"),/*#__PURE__*/React.createElement("th",null,"Mensajero"),/*#__PURE__*/React.createElement("th",null,"Estado"),/*#__PURE__*/React.createElement("th",null,"Fecha"),/*#__PURE__*/React.createElement("th",null,"Monto"),/*#__PURE__*/React.createElement("th",null))),/*#__PURE__*/React.createElement("tbody",null,paginado.map((e,i)=>{const rowNum=(page-1)*PAGE_SIZE+i+1;const sel=selected.has(e.id);return/*#__PURE__*/React.createElement("tr",{key:e.id,style:{background:sel?'rgba(200,168,75,0.06)':(esEnvioAtrasado(e)?'rgba(176,48,48,0.06)':''),borderLeft:esEnvioAtrasado(e)?'3px solid var(--danger)':'3px solid transparent',cursor:'pointer'},onClick:()=>toggleSelect(e.id)},/*#__PURE__*/React.createElement("td",{style:{textAlign:'center'},onClick:ev=>ev.stopPropagation()},/*#__PURE__*/React.createElement("input",{type:"checkbox",checked:sel,onChange:()=>toggleSelect(e.id),style:{cursor:'pointer'}})),/*#__PURE__*/React.createElement("td",{style:{textAlign:'center',fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-soft)',background:'var(--cream)',fontWeight:700}},rowNum),/*#__PURE__*/React.createElement("td",{style:{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700,color:'var(--dark)'}},e.codigo,e.fuente==='externo'&&/*#__PURE__*/React.createElement("span",{style:{marginLeft:6,fontSize:9,background:'rgba(27,58,107,0.1)',color:'#1B3A6B',padding:'1px 6px',borderRadius:4,fontWeight:700,letterSpacing:0.5}},"ML")),/*#__PURE__*/React.createElement("td",{onClick:ev=>ev.stopPropagation()},/*#__PURE__*/React.createElement("select",{className:"td-select",value:e.cliente||'',style:{fontWeight:700},onChange:async ev=>{const val=ev.target.value;const entrada=crearEntradaHistorial(e.estado,`Cliente cambiado a ${val||'Sin cliente'}`,usuario?.nombre||'Admin');setEnvios(prev=>prev.map(x=>x.id===e.id?{...x,cliente:val,historial:[...x.historial,entrada]}:x));await db.from('envios').update({cliente:val}).eq('codigo',e.codigo);toast('✓ Cliente → '+val);}},/*#__PURE__*/React.createElement("option",{value:''},"Sin cliente"),clientesActivos.map(c=>/*#__PURE__*/React.createElement("option",{key:c.id,value:c.nombre},c.nombre)))),/*#__PURE__*/React.createElement("td",{style:{fontSize:12,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},title:e.destinatario||''},e.destinatario||'—'),/*#__PURE__*/React.createElement("td",{style:{fontSize:11,color:'var(--text-mid)',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},title:e.direccion||''},e.direccion||'—'),/*#__PURE__*/React.createElement("td",{onClick:ev=>ev.stopPropagation()},/*#__PURE__*/React.createElement("select",{className:"td-select",value:e.comuna||'',style:{fontFamily:'Bebas Neue',letterSpacing:1,fontSize:11},onChange:async ev=>{const val=ev.target.value;const entrada=crearEntradaHistorial(e.estado,`Comuna cambiada a ${val||'Sin comuna'}`,usuario?.nombre||'Admin');setEnvios(prev=>prev.map(x=>x.id===e.id?{...x,comuna:val,historial:[...x.historial,entrada]}:x));await db.from('envios').update({comuna:val}).eq('codigo',e.codigo);toast('✓ Comuna actualizada');}},/*#__PURE__*/React.createElement("option",{value:''},"Sin comuna"),COMUNAS_CHILE.map(c=>/*#__PURE__*/React.createElement("option",{key:c,value:c},c)))),/*#__PURE__*/React.createElement("td",{onClick:ev=>ev.stopPropagation()},/*#__PURE__*/React.createElement("select",{className:"td-select",value:e.mensajero||'',onChange:async ev=>{const val=ev.target.value;const nuevoEstado=val?'en_ruta':e.estado;edicionesRecientesRef.current[e.codigo]={estado:nuevoEstado,mensajero:val,ts:Date.now()};setEnvios(prev=>prev.map(x=>x.id===e.id?{...x,mensajero:val,estado:nuevoEstado}:x));await db.from('envios').update({mensajero:val,estado:nuevoEstado}).eq('codigo',e.codigo);toast('✓ Mensajero actualizado');}},/*#__PURE__*/React.createElement("option",{value:''},"Sin asignar"),mensajerosActivos.map(m=>/*#__PURE__*/React.createElement("option",{key:m.id,value:m.nombre},m.nombre.replace(/,\s*/g,' '))))),/*#__PURE__*/React.createElement("td",{onClick:ev=>ev.stopPropagation()},/*#__PURE__*/React.createElement("select",{className:"td-select",value:e.estado,style:{borderColor:estadoInfo(e.estado).color||'rgba(200,168,75,0.2)',color:estadoInfo(e.estado).color||'var(--dark)',fontWeight:700},onChange:async ev=>{const val=ev.target.value;edicionesRecientesRef.current[e.codigo]={estado:val,mensajero:e.mensajero,ts:Date.now()};cambiarEstado(new Set([e.id]),val);setEnvios(prev=>prev.map(x=>x.id===e.id?{...x,estado:val}:x));}},ESTADOS_ENVIO.map(est=>/*#__PURE__*/React.createElement("option",{key:est.val,value:est.val},est.label))),esEnvioAtrasado(e)&&/*#__PURE__*/React.createElement("span",{title:'Sin entregar hace '+diasDesdeFecha(e.fecha)+' día(s)',style:{marginLeft:6,fontSize:10,fontWeight:700,color:'var(--danger)',whiteSpace:'nowrap'}},'⚠ '+diasDesdeFecha(e.fecha)+'d')),/*#__PURE__*/React.createElement("td",{style:{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-soft)'}},React.createElement("div",null,fmtFecha(e.fecha)),e.estado==='entregado'&&fechaEntregaDe(e)?React.createElement("div",{style:{color:'var(--success)',marginTop:2}},fmtFechaHora(fechaEntregaDe(e))):null),/*#__PURE__*/React.createElement("td",{style:{fontFamily:'JetBrains Mono',fontSize:11,color:e.monto>0?'var(--success)':'var(--text-soft)'}},e.monto>0?'$'+e.monto.toLocaleString('es-CL'):'—'),/*#__PURE__*/React.createElement("td",{style:{whiteSpace:'nowrap',minWidth:50},onClick:ev=>ev.stopPropagation()},/*#__PURE__*/React.createElement("button",{className:"action-btn btn-edit",onClick:()=>setDetalleEnvio(e)},"Ver")));})))),/*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:14,flexWrap:'wrap',gap:10}},
  /*#__PURE__*/React.createElement("div",{style:{display:'flex',alignItems:'center',gap:8}},
    /*#__PURE__*/React.createElement("span",{style:{fontSize:11,color:'var(--text-soft)'}},"Ver"),
    /*#__PURE__*/React.createElement("select",{value:PAGE_SIZE,onChange:e=>{setPageSize(+e.target.value);setPage(1);},style:{padding:'5px 8px',borderRadius:7,border:'1px solid var(--border)',fontSize:12,background:'var(--cream)',color:'var(--text)',cursor:'pointer',outline:'none'}},
      [25,50,100].map(n=>/*#__PURE__*/React.createElement("option",{key:n,value:n},n))
    ),
    /*#__PURE__*/React.createElement("span",{style:{fontSize:11,color:'var(--text-soft)'}},"por página")
  ),
  totalPags>1&&/*#__PURE__*/React.createElement("div",{className:"pagination",style:{margin:0}},/*#__PURE__*/React.createElement("button",{className:"page-btn",disabled:page===1,onClick:()=>setPage(p=>p-1)},"\u2039"),Array.from({length:Math.min(totalPags,7)},(_,i)=>i+1).map(p=>/*#__PURE__*/React.createElement("button",{key:p,className:'page-btn'+(page===p?' active':''),onClick:()=>setPage(p)},p)),totalPags>7&&/*#__PURE__*/React.createElement("span",{className:"page-info"},"...",totalPags),/*#__PURE__*/React.createElement("button",{className:"page-btn",disabled:page===totalPags,onClick:()=>setPage(p=>p+1)},"\u203A")),
  /*#__PURE__*/React.createElement("span",{className:"page-info",style:{margin:0}},(page-1)*PAGE_SIZE+1,"-",Math.min(page*PAGE_SIZE,filtrados.length)," de ",filtrados.length.toLocaleString('es-CL'))
),cambiarClienteModal&&/*#__PURE__*/React.createElement(Modal,{title:'Cambiar cliente · '+selected.size+' envío'+(selected.size>1?'s':''),onClose:()=>setCambiarClienteModal(false)},
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
asignarModal&&/*#__PURE__*/React.createElement(Modal,{title:'Asignar '+selected.size+' envío'+(selected.size>1?'s':''),onClose:()=>setAsignarModal(false)},/*#__PURE__*/React.createElement("div",{className:"form-group"},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Selecciona el mensajero"),/*#__PURE__*/React.createElement("select",{className:"form-input",value:mensajeroAsignar,onChange:e=>setMensajeroAsignar(e.target.value),autoFocus:true},/*#__PURE__*/React.createElement("option",{value:""},"Seleccionar..."),mensajerosActivos.map(m=>/*#__PURE__*/React.createElement("option",{key:m.id,value:m.nombre},m.nombre.replace(/,\s*/g,' '))))),/*#__PURE__*/React.createElement("div",{style:{padding:'10px 14px',background:'var(--gold-dim)',borderRadius:8,border:'1px solid var(--gold-border)',fontSize:12,color:'var(--text-mid)',marginBottom:16}},"Los env\xEDos pasar\xE1n autom\xE1ticamente a estado ",/*#__PURE__*/React.createElement("strong",null,"Asignado"),"."),/*#__PURE__*/React.createElement("div",{className:"modal-actions"},/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setAsignarModal(false)},"Cancelar"),/*#__PURE__*/React.createElement("button",{className:"btn-primary",onClick:asignarMensajero},"Asignar"))),detalleEnvio&&/*#__PURE__*/React.createElement(Modal,{title:'Envío '+detalleEnvio.codigo,onClose:()=>setDetalleEnvio(null)},
  /*#__PURE__*/detalleEnvio.fuente==='etiqueta'&&React.createElement("div",{style:{display:'flex',justifyContent:'center',marginBottom:16}},/*#__PURE__*/React.createElement(EtiquetaPreview,{envio:detalleEnvio,logoSrc:(document.querySelector('.logo-img')||{}).src||''})),
  // ── Cambiar cliente ──
  /*#__PURE__*/React.createElement("div",{style:{background:'linear-gradient(145deg,rgba(200,168,75,0.1),rgba(200,168,75,0.04))',border:'1px solid rgba(200,168,75,0.3)',borderRadius:12,padding:'14px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12,boxShadow:'inset 0 1px 0 rgba(255,255,255,0.5),3px 3px 8px rgba(43,46,32,0.08)'}},
    /*#__PURE__*/React.createElement("div",{style:{flex:1}},
      /*#__PURE__*/React.createElement("div",{style:{fontSize:9,color:'rgba(200,168,75,0.8)',letterSpacing:3,textTransform:'uppercase',fontFamily:'Bebas Neue',fontSize:11,marginBottom:6}},'Cliente'),
      /*#__PURE__*/React.createElement("select",{value:detalleEnvio.cliente||'',
        onChange:async e=>{const nc=e.target.value;setDetalleEnvio(prev=>({...prev,cliente:nc}));setEnvios(prev=>prev.map(ev=>ev.codigo===detalleEnvio.codigo?{...ev,cliente:nc}:ev));await db.from('envios').update({cliente:nc}).eq('codigo',detalleEnvio.codigo);toast('✓ Cliente → '+nc);},
        style:{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid rgba(200,168,75,0.35)',background:'linear-gradient(145deg,#fff,#fdf6e8)',color:'var(--dark)',fontSize:14,fontWeight:700,fontFamily:'DM Sans',outline:'none',cursor:'pointer',boxShadow:'inset 2px 2px 4px rgba(43,46,32,0.08)'}},
        /*#__PURE__*/React.createElement("option",{value:''},'— Sin cliente —'),
        clientesActivos.map(c=>/*#__PURE__*/React.createElement("option",{key:c.id,value:c.nombre},c.nombre))
      )
    ),
    /*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:'rgba(200,168,75,0.5)',textAlign:'right',maxWidth:100,lineHeight:1.5,fontStyle:'italic'}},'Cambia el cliente de este envío')
  ),
  // ── Datos grid ──
  /*#__PURE__*/React.createElement("div",{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}},[['Código',detalleEnvio.codigo],['Destinatario',detalleEnvio.destinatario],['Teléfono',detalleEnvio.telefono],['Dirección',detalleEnvio.direccion],['Comuna',detalleEnvio.comuna],['Mensajero',((_detalleEnvio$mensaje=detalleEnvio.mensajero)==null?void 0:_detalleEnvio$mensaje.replace(/,\s*/g,' '))||'Sin asignar'],['Fecha',fmtFecha(detalleEnvio.fecha)],['Monto',detalleEnvio.monto>0?'$'+detalleEnvio.monto.toLocaleString('es-CL'):'—']].map(_ref27=>{let l=_ref27[0],v=_ref27[1];return/*#__PURE__*/React.createElement("div",{key:l,style:{padding:'14px 16px',background:'linear-gradient(145deg,#ffffff,#f5eedc)',borderRadius:12,border:'1px solid rgba(200,168,75,0.25)',boxShadow:'5px 5px 10px rgba(43,46,32,0.12),-2px -2px 6px rgba(255,255,255,1),inset 0 1px 0 rgba(255,255,255,0.9)'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:13,color:'#C8A84B',letterSpacing:3,textTransform:'uppercase',marginBottom:8,fontFamily:'Bebas Neue',fontWeight:700,textShadow:'0 1px 2px rgba(200,168,75,0.3)'}},l),/*#__PURE__*/React.createElement("div",{style:{fontSize:18,fontWeight:500,color:'#1a1d13',lineHeight:1.3,filter:'drop-shadow(0 1px 1px rgba(43,46,32,0.1))'}},v||'—'));})),/*#__PURE__*/React.createElement("div",{style:{marginBottom:16}},estadoBadge(detalleEnvio.estado)),detalleEnvio.nota&&/*#__PURE__*/React.createElement("div",{className:"obs-box",style:{marginBottom:16}},"\uD83D\uDCCC ",detalleEnvio.nota),/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:14,letterSpacing:1.5,color:'var(--dark)',marginBottom:10}},"Historial"),/*#__PURE__*/React.createElement("div",{style:{maxHeight:220,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8,marginBottom:16}},[...detalleEnvio.historial].reverse().map((h,i)=>/*#__PURE__*/React.createElement("div",{key:i,style:{padding:'8px 12px',borderBottom:'1px solid var(--border)',display:'flex',gap:10,alignItems:'flex-start'}},/*#__PURE__*/React.createElement("div",{style:{flex:1}},/*#__PURE__*/React.createElement("div",{style:{fontSize:13,fontWeight:700,color:estadoInfo(h.estado).color}},estadoInfo(h.estado).label),/*#__PURE__*/React.createElement("div",{style:{fontSize:12,color:'var(--text-mid)',marginTop:3,fontWeight:600}},h.usuario||'Sistema'),h.nota&&/*#__PURE__*/React.createElement("div",{style:{fontSize:11,color:'var(--text-soft)',marginTop:2,fontStyle:'italic'}},h.nota)),/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:'var(--text-soft)',fontFamily:'JetBrains Mono',whiteSpace:'nowrap',textAlign:'right'}},new Date(h.fecha).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})),(esAdmin||esSuperAdmin)&&React.createElement("button",{onClick:()=>{if(!window.confirm('¿Borrar esta entrada del historial? No se puede deshacer.'))return;const idxOriginal=detalleEnvio.historial.length-1-i;setDetalleEnvio(prev=>({...prev,historial:prev.historial.filter((_,idx)=>idx!==idxOriginal)}));setEnvios(prev=>prev.map(en=>en.id===detalleEnvio.id?{...en,historial:en.historial.filter((_,idx)=>idx!==idxOriginal)}:en));toast('✓ Entrada de historial borrada');},title:'Borrar entrada',style:{background:'none',border:'none',color:'var(--danger)',cursor:'pointer',fontSize:14,fontWeight:700,padding:'0 4px',lineHeight:1,flexShrink:0}},'✕')))),/*#__PURE__*/React.createElement(FotosEntregaConRecarga,{codigo:detalleEnvio.codigo,fotoEtiquetaInicial:detalleEnvio.foto_etiqueta}),/*#__PURE__*/React.createElement("div",{style:{marginTop:16,display:'flex',gap:8,flexWrap:'wrap'}},ESTADOS_ENVIO.map(est=>/*#__PURE__*/React.createElement("button",{key:est.val,onClick:()=>{cambiarEstado(new Set([detalleEnvio.id]),est.val);setDetalleEnvio(prev=>({...prev,estado:est.val,historial:[...prev.historial,crearEntradaHistorial(est.val,'Cambio manual por admin',(perfil&&perfil.nombre?perfil.nombre:'Admin'))]}));},style:{padding:'6px 12px',borderRadius:7,border:'1px solid '+est.color,background:detalleEnvio.estado===est.val?est.bg:'transparent',color:est.color,fontSize:11,fontWeight:700,cursor:'pointer',opacity:detalleEnvio.estado===est.val?1:0.7}},detalleEnvio.estado===est.val?'✓ ':'',est.label))),/*#__PURE__*/React.createElement(AdminEditarEnvio,{envio:detalleEnvio,onSave:async(campo,valor)=>{const entrada=crearEntradaHistorial(detalleEnvio.estado,`${campo} cambiado a "${valor}"`,usuario?.nombre||'Admin');setDetalleEnvio(prev=>({...prev,[campo]:valor,historial:[...prev.historial,entrada]}));setEnvios(prev=>prev.map(e=>e.id===detalleEnvio.id?{...e,[campo]:valor,historial:[...e.historial,entrada]}:e));try{await db.from('envios').update({[campo]:valor}).eq('codigo',detalleEnvio.codigo);toast('✓ '+campo+' actualizado');}catch(e){toast('⚠ Error al guardar: '+e.message);}}}),/*#__PURE__*/React.createElement("div",{className:"modal-actions"},/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setDetalleEnvio(null)},"Cerrar"))));}
window.GestionEnvios = GestionEnvios;
})();
