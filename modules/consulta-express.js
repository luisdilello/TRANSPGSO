(function(){
var useMemo=React.useMemo, useState=React.useState;
var ESTADOS_ENVIO=window.__app.ESTADOS_ENVIO, EnvioDetalleCard=window.__app.EnvioDetalleCard, UMBRAL_ATRASO_DIAS=window.__app.UMBRAL_ATRASO_DIAS, db=window.__app.db, diasDesdeFecha=window.__app.diasDesdeFecha, esEnvioAtrasado=window.__app.esEnvioAtrasado, estadoInfo=window.__app.estadoInfo, exportToExcel=window.__app.exportToExcel, fechaHoyCL=window.__app.fechaHoyCL;
function ConsultaExpress(_ref_ce){
  const toast=_ref_ce&&_ref_ce.toast;
  const [modo,setModo]=useState('individual'); // 'individual' | 'masivo'
  const [terminoInput,setTerminoInput]=useState('');
  const [buscando,setBuscando]=useState(false);
  const [envio,setEnvio]=useState(null);
  const [multiples,setMultiples]=useState([]);
  const [errorMsg,setErrorMsg]=useState('');
  // Masivo
  const [codigosBulkInput,setCodigosBulkInput]=useState('');
  const [buscandoBulk,setBuscandoBulk]=useState(false);
  const [resultadosBulk,setResultadosBulk]=useState([]);
  const [noEncontrados,setNoEncontrados]=useState([]);
  const [filtroEstadoBulk,setFiltroEstadoBulk]=useState('todos');
  const [fechaDesde,setFechaDesde]=useState('');
  const [fechaHasta,setFechaHasta]=useState('');
  const [excedente,setExcedente]=useState(false);
  const [vistaBulk,setVistaBulk]=useState('detalle'); // 'detalle' | 'tabla'
  const MAX_BULK=500;

  const fmtFH=iso=>{if(!iso)return'—';try{return new Date(iso).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){return iso;}};

  // Busca por código exacto; si no hay match, busca por destinatario o teléfono (puede haber varios resultados)
  async function buscar(term){
    term=(term||'').trim();
    if(!term)return;
    setBuscando(true);setErrorMsg('');setEnvio(null);setMultiples([]);
    try{
      const rCod=await db.from('envios').select('*').eq('codigo',term.toUpperCase()).maybeSingle();
      if(rCod.error)throw rCod.error;
      if(rCod.data){setEnvio(rCod.data);setBuscando(false);return;}
      const rBusq=await db.from('envios').select('codigo,cliente,destinatario,telefono,direccion,comuna,mensajero,estado,fecha')
        .or('destinatario.ilike.%'+term+'%,telefono.ilike.%'+term+'%')
        .order('fecha',{ascending:false}).limit(30);
      if(rBusq.error)throw rBusq.error;
      const data=rBusq.data||[];
      if(data.length===0){
        setErrorMsg('No se encontró ningún envío con código, destinatario o teléfono "'+term+'".');
      }else if(data.length===1){
        const rFull=await db.from('envios').select('*').eq('codigo',data[0].codigo).maybeSingle();
        if(rFull.data)setEnvio(rFull.data);
      }else{
        setMultiples(data);
      }
    }catch(e){
      setErrorMsg('Error al buscar: '+e.message);
    }finally{
      setBuscando(false);
    }
  }

  async function elegirMultiple(cod){
    setBuscando(true);
    try{
      const rFull=await db.from('envios').select('*').eq('codigo',cod).maybeSingle();
      if(rFull.data){setEnvio(rFull.data);setMultiples([]);}
    }catch(e){setErrorMsg('Error al cargar el envío: '+e.message);}
    finally{setBuscando(false);}
  }

  async function buscarMasivo(){
    let lista=codigosBulkInput.split(/[\s,;]+/).map(s=>s.trim().toUpperCase()).filter(Boolean);
    lista=Array.from(new Set(lista));
    if(lista.length===0)return;
    let huboExcedente=false;
    if(lista.length>MAX_BULK){huboExcedente=true;lista=lista.slice(0,MAX_BULK);}
    setExcedente(huboExcedente);
    setBuscandoBulk(true);setResultadosBulk([]);setNoEncontrados([]);setErrorMsg('');setFiltroEstadoBulk('todos');
    try{
      const CHUNK=150;
      const chunks=[];
      for(let k=0;k<lista.length;k+=CHUNK)chunks.push(lista.slice(k,k+CHUNK));
      const respuestas=await Promise.all(chunks.map(ch=>db.from('envios').select('codigo,cliente,destinatario,telefono,direccion,comuna,mensajero,estado,monto,foto_etiqueta,updated_at,fecha').in('codigo',ch)));
      const conError=respuestas.find(r=>r.error);
      if(conError)throw conError.error;
      const mapa={};
      respuestas.forEach(r=>(r.data||[]).forEach(e=>{mapa[e.codigo]=e;}));
      const encontrados=lista.map(c=>mapa[c]).filter(Boolean);
      const faltantes=lista.filter(c=>!mapa[c]);
      setResultadosBulk(encontrados);
      setNoEncontrados(faltantes);
      if(toast)toast('✓ '+encontrados.length+' de '+lista.length+' códigos encontrados'+(huboExcedente?' (se tomaron los primeros '+MAX_BULK+')':''));
    }catch(e){
      setErrorMsg('Error al buscar en lote: '+e.message);
    }finally{
      setBuscandoBulk(false);
    }
  }

  const conteosPorEstado=useMemo(function(){
    const m={};
    resultadosBulk.forEach(e=>{m[e.estado]=(m[e.estado]||0)+1;});
    return m;
  },[resultadosBulk]);

  const resultadosFiltrados=useMemo(function(){
    return resultadosBulk.filter(function(e){
      if(filtroEstadoBulk!=='todos'&&e.estado!==filtroEstadoBulk)return false;
      if(fechaDesde&&e.fecha&&e.fecha<fechaDesde)return false;
      if(fechaHasta&&e.fecha&&e.fecha>fechaHasta)return false;
      return true;
    });
  },[resultadosBulk,filtroEstadoBulk,fechaDesde,fechaHasta]);

  function exportarBulkExcel(){
    const headers=['Código','Cliente','Destinatario','Comuna','Mensajero','Estado','Monto','Actualizado','Atrasado'];
    const rows=resultadosFiltrados.map(e=>[e.codigo,e.cliente||'',e.destinatario||'',e.comuna||'',(e.mensajero||'').replace(/,\s*/g,' '),estadoInfo(e.estado).label,e.monto||0,fmtFH(e.updated_at||e.fecha),esEnvioAtrasado(e)?diasDesdeFecha(e.fecha)+' días':'']);
    exportToExcel('ConsultaExpress_'+fechaHoyCL(),[{name:'Resultados',headers,rows}]);
  }

  return/*#__PURE__*/React.createElement('div',{className:'panel'},
    /*#__PURE__*/React.createElement('div',{className:'panel-title'},'🔍 Consulta Express'),
    /*#__PURE__*/React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:16}},'Busca por código, destinatario o teléfono, o consulta hasta '+MAX_BULK+' códigos a la vez. Los envíos en ruta hace '+UMBRAL_ATRASO_DIAS+'+ días se marcan como atrasados.'),
    /*#__PURE__*/React.createElement('div',{style:{display:'flex',gap:2,background:'var(--dark)',borderRadius:10,padding:4,marginBottom:20,width:'fit-content'}},
      ['individual','masivo'].map(function(m){return/*#__PURE__*/React.createElement('button',{key:m,onClick:()=>setModo(m),style:{padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',background:modo===m?'var(--gold)':'transparent',color:modo===m?'var(--dark-deep)':'rgba(255,255,255,0.5)'}},m==='individual'?'Un código':'Varios códigos');})
    ),

    modo==='individual'&&/*#__PURE__*/React.createElement('div',{style:{display:'flex',gap:8,marginBottom:20,maxWidth:460}},
      /*#__PURE__*/React.createElement('input',{className:'form-input',placeholder:'Código, destinatario o teléfono...',value:terminoInput,
        onChange:e=>setTerminoInput(e.target.value),
        onKeyDown:e=>{if(e.key==='Enter')buscar(terminoInput);},autoFocus:true}),
      /*#__PURE__*/React.createElement('button',{className:'btn-primary',onClick:()=>buscar(terminoInput),disabled:buscando},buscando?'Buscando...':'Buscar')
    ),

    modo==='masivo'&&/*#__PURE__*/React.createElement('div',{style:{marginBottom:20}},
      /*#__PURE__*/React.createElement('textarea',{className:'form-input',rows:5,style:{width:'100%',maxWidth:600,fontFamily:'JetBrains Mono',fontSize:12,resize:'vertical'},
        placeholder:'Pega hasta '+MAX_BULK+' códigos, separados por espacio, coma o salto de línea...',
        value:codigosBulkInput,onChange:e=>setCodigosBulkInput(e.target.value)}),
      /*#__PURE__*/React.createElement('div',{style:{display:'flex',alignItems:'center',gap:12,marginTop:8,flexWrap:'wrap'}},
        /*#__PURE__*/React.createElement('button',{className:'btn-primary',onClick:buscarMasivo,disabled:buscandoBulk},buscandoBulk?'Buscando...':'Buscar todos'),
        resultadosBulk.length>0&&/*#__PURE__*/React.createElement('button',{className:'btn-secondary',onClick:exportarBulkExcel},'⬇ Exportar Excel'),
        excedente&&/*#__PURE__*/React.createElement('span',{style:{fontSize:11,color:'var(--danger)'}},'Se tomaron solo los primeros '+MAX_BULK+' códigos.')
      ),
      resultadosBulk.length>0&&/*#__PURE__*/React.createElement('div',{style:{display:'flex',gap:12,alignItems:'center',marginTop:12,flexWrap:'wrap'}},
        /*#__PURE__*/React.createElement('div',null,
          /*#__PURE__*/React.createElement('label',{className:'form-label'},'Desde'),
          /*#__PURE__*/React.createElement('input',{type:'date',className:'form-input',value:fechaDesde,onChange:e=>setFechaDesde(e.target.value)})
        ),
        /*#__PURE__*/React.createElement('div',null,
          /*#__PURE__*/React.createElement('label',{className:'form-label'},'Hasta'),
          /*#__PURE__*/React.createElement('input',{type:'date',className:'form-input',value:fechaHasta,onChange:e=>setFechaHasta(e.target.value)})
        ),
        (fechaDesde||fechaHasta)&&/*#__PURE__*/React.createElement('button',{className:'btn-secondary',style:{marginTop:18},onClick:()=>{setFechaDesde('');setFechaHasta('');}},'Limpiar fechas'),
        /*#__PURE__*/React.createElement('div',{style:{marginLeft:'auto',display:'flex',gap:2,background:'var(--dark)',borderRadius:10,padding:4}},
          ['detalle','tabla'].map(function(v){return/*#__PURE__*/React.createElement('button',{key:v,onClick:()=>setVistaBulk(v),style:{padding:'6px 12px',borderRadius:8,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',background:vistaBulk===v?'var(--gold)':'transparent',color:vistaBulk===v?'var(--dark-deep)':'rgba(255,255,255,0.5)'}},v==='detalle'?'Ver detalle completo':'Ver tabla');})
        )
      )
    ),

    errorMsg&&/*#__PURE__*/React.createElement('div',{className:'info-banner',style:{borderColor:'var(--danger)',color:'var(--danger)'}},errorMsg),

    modo==='individual'&&multiples.length>0&&/*#__PURE__*/React.createElement('div',{className:'table-wrap',style:{marginBottom:20}},
      /*#__PURE__*/React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',padding:'8px 4px'}},multiples.length+' envíos coinciden. Elige uno:'),
      /*#__PURE__*/React.createElement('table',null,
        /*#__PURE__*/React.createElement('thead',null,/*#__PURE__*/React.createElement('tr',null,
          /*#__PURE__*/React.createElement('th',null,'Código'),/*#__PURE__*/React.createElement('th',null,'Destinatario'),/*#__PURE__*/React.createElement('th',null,'Teléfono'),/*#__PURE__*/React.createElement('th',null,'Comuna'),/*#__PURE__*/React.createElement('th',null,'Estado'),/*#__PURE__*/React.createElement('th',null)
        )),
        /*#__PURE__*/React.createElement('tbody',null,multiples.map(function(e){return/*#__PURE__*/React.createElement('tr',{key:e.codigo,style:{cursor:'pointer'},onClick:()=>elegirMultiple(e.codigo)},
          /*#__PURE__*/React.createElement('td',{style:{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700}},e.codigo),
          /*#__PURE__*/React.createElement('td',{style:{fontSize:12}},e.destinatario||'—'),
          /*#__PURE__*/React.createElement('td',{style:{fontSize:12}},e.telefono||'—'),
          /*#__PURE__*/React.createElement('td',{style:{fontSize:11}},e.comuna||'—'),
          /*#__PURE__*/React.createElement('td',null,/*#__PURE__*/React.createElement('span',{style:{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:12,background:estadoInfo(e.estado).bg,color:estadoInfo(e.estado).color}},estadoInfo(e.estado).label)),
          /*#__PURE__*/React.createElement('td',null,/*#__PURE__*/React.createElement('button',{className:'action-btn btn-edit'},'Ver'))
        );}))
      )
    ),

    modo==='masivo'&&resultadosBulk.length>0&&/*#__PURE__*/React.createElement('div',null,
      /*#__PURE__*/React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}},
        /*#__PURE__*/React.createElement('button',{onClick:()=>setFiltroEstadoBulk('todos'),style:{padding:'6px 14px',borderRadius:20,border:'2px solid '+(filtroEstadoBulk==='todos'?'var(--gold)':'var(--border)'),background:filtroEstadoBulk==='todos'?'var(--gold-dim)':'#fff',cursor:'pointer',fontSize:11,fontWeight:700}},'Todos ('+resultadosBulk.length+')'),
        ESTADOS_ENVIO.filter(function(est){return conteosPorEstado[est.val];}).map(function(est){return/*#__PURE__*/React.createElement('button',{key:est.val,onClick:()=>setFiltroEstadoBulk(est.val),style:{padding:'6px 14px',borderRadius:20,border:'2px solid '+(filtroEstadoBulk===est.val?est.color:'var(--border)'),background:filtroEstadoBulk===est.val?est.bg:'#fff',color:est.color,cursor:'pointer',fontSize:11,fontWeight:700}},'→ '+est.label.toUpperCase()+' ('+conteosPorEstado[est.val]+')');})
      ),
      noEncontrados.length>0&&/*#__PURE__*/React.createElement('div',{className:'info-banner',style:{marginBottom:14}},noEncontrados.length+' código'+(noEncontrados.length>1?'s':'')+' no encontrado'+(noEncontrados.length>1?'s':'')+': '+noEncontrados.slice(0,15).join(', ')+(noEncontrados.length>15?'…':'')),

      vistaBulk==='tabla'&&/*#__PURE__*/React.createElement('div',{className:'table-wrap'},
        /*#__PURE__*/React.createElement('table',null,
          /*#__PURE__*/React.createElement('thead',null,/*#__PURE__*/React.createElement('tr',null,
            /*#__PURE__*/React.createElement('th',null,'Código'),/*#__PURE__*/React.createElement('th',null,'Cliente'),/*#__PURE__*/React.createElement('th',null,'Destinatario'),/*#__PURE__*/React.createElement('th',null,'Comuna'),/*#__PURE__*/React.createElement('th',null,'Mensajero'),/*#__PURE__*/React.createElement('th',null,'Estado'),/*#__PURE__*/React.createElement('th',null,'Actualizado')
          )),
          /*#__PURE__*/React.createElement('tbody',null,resultadosFiltrados.map(function(e){return/*#__PURE__*/React.createElement('tr',{key:e.codigo,style:{background:esEnvioAtrasado(e)?'rgba(176,48,48,0.06)':'',borderLeft:esEnvioAtrasado(e)?'3px solid var(--danger)':'3px solid transparent'}},
            /*#__PURE__*/React.createElement('td',{style:{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700}},e.codigo),
            /*#__PURE__*/React.createElement('td',{style:{fontSize:12}},e.cliente||'—'),
            /*#__PURE__*/React.createElement('td',{style:{fontSize:12}},e.destinatario||'—'),
            /*#__PURE__*/React.createElement('td',{style:{fontSize:11}},e.comuna||'—'),
            /*#__PURE__*/React.createElement('td',{style:{fontSize:11}},(e.mensajero||'—').replace(/,\s*/g,' ')),
            /*#__PURE__*/React.createElement('td',null,
              /*#__PURE__*/React.createElement('span',{style:{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:12,background:estadoInfo(e.estado).bg,color:estadoInfo(e.estado).color}},estadoInfo(e.estado).label),
              esEnvioAtrasado(e)&&/*#__PURE__*/React.createElement('span',{title:'Sin entregar hace '+diasDesdeFecha(e.fecha)+' día(s)',style:{marginLeft:6,fontSize:10,fontWeight:700,color:'var(--danger)'}},'⚠ '+diasDesdeFecha(e.fecha)+'d')
            ),
            /*#__PURE__*/React.createElement('td',{style:{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-soft)'}},fmtFH(e.updated_at||e.fecha))
          );}))
        )
      ),

      vistaBulk==='detalle'&&resultadosFiltrados.map(function(e){return/*#__PURE__*/React.createElement('div',{key:e.codigo,style:{marginBottom:24,paddingBottom:24,borderBottom:'2px solid var(--border)'}},
        /*#__PURE__*/React.createElement(EnvioDetalleCard,{envio:e})
      );})
    ),

    modo==='individual'&&envio&&/*#__PURE__*/React.createElement(EnvioDetalleCard,{envio:envio})
  );
}
window.ConsultaExpress = ConsultaExpress;
})();
