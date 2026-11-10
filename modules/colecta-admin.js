(function(){
var useState=React.useState;
var ImportarPDFColecta=window.__app.ImportarPDFColecta, db=window.__app.db, fechaHoyCL=window.__app.fechaHoyCL, lsLoad=window.__app.lsLoad;
function ColectaAdmin(_ref_ca){var clientes=_ref_ca.clientes,mensajeros=_ref_ca.mensajeros,toast=_ref_ca.toast,esAdmin=_ref_ca.esAdmin,usuarioAdmin=_ref_ca.usuario;var nombreAdmin=(usuarioAdmin&&usuarioAdmin.nombre)||'Admin';
  var hoy=fechaHoyCL();
  var _t=useState('lector'),subTab=_t[0],setSubTab=_t[1];
  var _f=useState(hoy),filtroFecha=_f[0],setFiltroFecha=_f[1];
  var _fc=useState('todos'),filtroCliente=_fc[0],setFiltroCliente=_fc[1];
  var _fm=useState('todos'),filtroMen=_fm[0],setFiltroMen=_fm[1];
  var _col=useState([]),colectas=_col[0],setColectas=_col[1];
  var _load=useState(true),loading=_load[0],setLoading=_load[1];
  // Form registro manual
  var _fc2=useState(''),formCliente=_fc2[0],setFormCliente=_fc2[1];
  var _fm2=useState(''),formMen=_fm2[0],setFormMen=_fm2[1];
  var _fp=useState(''),formPiezas=_fp[0],setFormPiezas=_fp[1];
  var _fnota=useState(''),formNota=_fnota[0],setFormNota=_fnota[1];
  var _guard=useState(false),guardando=_guard[0],setGuardando=_guard[1];
  // Estados lector/scanner
  var _scanCode=useState(''),scanCode=_scanCode[0],setScanCode=_scanCode[1];
  var _scanMen=useState(''),scanMensajero=_scanMen[0],setScanMensajero=_scanMen[1];
  var _scanCli=useState(''),scanCliente=_scanCli[0],setScanCliente=_scanCli[1];
  var _scanList=useState([]),scanList=_scanList[0],setScanList=_scanList[1];
  var _scanGuard=useState(false),scanGuardando=_scanGuard[0],setScanGuardando=_scanGuard[1];
  var _scanTotal=useState([]),scanTotal=_scanTotal[0],setScanTotal=_scanTotal[1];
  var scanInputRef=React.useRef(null);
  var _rm=useState(false),showRM=_rm[0],setShowRM=_rm[1];
  var _nr=useState(0),nNoReg=_nr[0],setNNoReg=_nr[1];
  var _ev=useState(true),enVivo=_ev[0],setEnVivo=_ev[1];
  var _ua=useState(null),ultimaAct=_ua[0],setUltimaAct=_ua[1];
  async function cargarNoReg(){try{var r=await db.from('codigos_no_registrados').select('codigo',{count:'exact',head:true}).eq('resuelto',false);setNNoReg(r.count||0);}catch(e){}}
  React.useEffect(function(){cargarNoReg();},[]);
  function refrescarTodo(){cargarScanHoy();cargarColectas();cargarNoReg();}
  React.useEffect(function(){
    if(!enVivo||filtroFecha!==hoy)return;
    var iv=window.__app&&window.__app.intervaloVisible;
    if(iv)return iv(function(){cargarScanHoy();cargarNoReg();},30000,['envios'],5000);
    var t=setInterval(function(){if(document.visibilityState==='visible'){cargarScanHoy();cargarNoReg();}},30000);
    return function(){clearInterval(t);};
  },[enVivo,filtroFecha]);
  var esTactil=typeof window!=='undefined'&&('ontouchstart' in window||navigator.maxTouchPoints>0);

  // Cargar envíos escaneados hoy desde Supabase
  React.useEffect(function(){
    cargarScanHoy();
  },[filtroFecha]);

  async function cargarScanHoy(){
    try{
      // Paginado: Supabase corta cada consulta en 1000 filas
      var todos=[],desde=0,PAG=1000;
      while(true){
        var r=await db.from('envios')
          .select('id,codigo,cliente,mensajero,fecha,estado,fuente,nota,updated_at,created_at')
          .eq('fecha',filtroFecha)
          .in('fuente',['flex','lector','manual','scanner'])
          .order('updated_at',{ascending:false})
          .order('id',{ascending:true})
          .range(desde,desde+PAG-1);
        if(r.error)throw r.error;
        var lote=r.data||[];
        todos=todos.concat(lote);
        if(lote.length<PAG)break;
        desde+=PAG;
      }
      setScanTotal(todos);setUltimaAct(new Date());
    }catch(e){setScanTotal([]);}
  }

  React.useEffect(function(){
    cargarColectas();
  },[filtroFecha,filtroCliente,filtroMen]);

  async function cargarColectas(){
    setLoading(true);
    try{
      var armarQ=function(){
        var q=db.from('colectas').select('*').eq('fecha',filtroFecha).order('created_at',{ascending:false}).order('id',{ascending:true});
        if(filtroCliente!=='todos')q=q.eq('cliente',filtroCliente);
        if(filtroMen!=='todos')q=q.eq('mensajero',filtroMen);
        return q;
      };
      var acum=[],ini=0;
      while(true){
        var res=await armarQ().range(ini,ini+999);
        if(res.error)throw res.error;
        var pag=res.data||[];
        acum=acum.concat(pag);
        if(pag.length<1000)break;
        ini+=1000;
      }
      setColectas(acum);
    }catch(e){
      // Fallback localStorage
      var local=lsLoad('transpgso_v2_colectas',[]);
      setColectas(local.filter(function(c){
        return c.fecha===filtroFecha&&
          (filtroCliente==='todos'||c.cliente===filtroCliente)&&
          (filtroMen==='todos'||(c.mensajero||'')===(filtroMen));
      }));
    }
    setLoading(false);
  }

  async function procesarScanLector(codigo){
  if(!codigo||!codigo.trim())return;
  var raw=codigo.trim().toUpperCase();

  // Reconocer etiqueta propia PGSO (formato: PGSO + 9 dígitos)
  var matchPGSO=raw.match(/PGSO\d{9}/);
  var cod;
  if(matchPGSO){
    cod=matchPGSO[0];
  } else {
    // Extraer código Flex del QR — formato: [id[Ñ[47364708748[,...
    var matchQR=raw.match(/id[^\d]+(\d{11})/);
    if(matchQR){
      cod=matchQR[1];
    } else {
      // Buscar una secuencia de exactamente 11 dígitos en el string
      var matchNum=raw.match(/(?<!\d)(\d{11})(?!\d)/);
      cod=matchNum?matchNum[1]:raw.replace(/[^\d]/g,'');
    }
  }

  // Validar que sea Flex (11 dígitos exactos) o etiqueta PGSO valida
  if(!cod||!(/^\d{11}$/.test(cod)||/^PGSO\d{9}$/.test(cod))){
    toast('⚠ Código inválido — debe ser Flex (11 dígitos) o etiqueta PGSO');
    setScanCode('');
    if(scanInputRef.current)scanInputRef.current.focus();
    return;
  }
  // Verificar duplicado en lista actual
  if(scanList.find(function(e){return e.codigo===cod;})){
    toast('⚠ '+cod+' ya está en la lista');
    setScanCode('');
    if(scanInputRef.current)scanInputRef.current.focus();
    return;
  }
  var nuevo={
    codigo:cod,
    cliente:scanCliente||'',
    mensajero:scanMensajero||'',
    fecha:hoy,
    hora:new Date().toLocaleTimeString('es-CL'),
    estado:'en_bodega'
  };
  setScanList(function(prev){return[nuevo,...prev];});
  setScanCode('');
  toast('✓ '+cod+' — '+(scanList.length+1)+' en lista');
  if(scanInputRef.current)scanInputRef.current.focus();
}

async function guardarLoteScanner(){
  if(scanList.length===0){toast('⚠ No hay códigos escaneados');return;}
  setScanGuardando(true);
  try{
    var ts=new Date().toISOString();
    // ANTES esto era un upsert por codigo que pisaba CIEGAMENTE cualquier envio que ya
    // existiera -- si un codigo escaneado aca ya estaba en el sistema (ej. ya Entregado,
    // con cliente/destinatario/direccion reales), el upsert lo reseteaba a 'en_bodega' y le
    // borraba esos datos (quedaban en blanco/0). Caso real detectado por Luis: un paquete de
    // DMT ya entregado la noche anterior volvio a pasar por Bodega->Ruta->Entregado dos veces
    // mas porque alguien volvio a escanear su codigo aca (probable etiqueta duplicada) --
    // 'Entregado' es un estado terminal, no deberia poder "revivirse" por un escaneo masivo de
    // bodega. Ahora se separan los codigos REALMENTE NUEVOS (se insertan igual que antes) de
    // los que YA EXISTEN (no se tocan en absoluto -- se avisa al admin con su estado actual
    // para que lo revise a mano, en vez de pisarlo en silencio).
    var codigosEscaneados=scanList.map(function(e){return e.codigo;});
    var mapaExistentes={};
    try{
      var rExist=await db.from('envios').select('codigo,estado').in('codigo',codigosEscaneados);
      (rExist.data||[]).forEach(function(e){mapaExistentes[e.codigo]=e;});
    }catch(eExist){}
    var scanNuevos=scanList.filter(function(e){return!mapaExistentes[e.codigo];});
    var scanOmitidos=scanList.filter(function(e){return!!mapaExistentes[e.codigo];});
    if(scanNuevos.length>0){
      var inserts=scanNuevos.map(function(e){
        return{
          codigo:e.codigo,
          cliente:e.cliente||scanCliente||'',
          mensajero:e.mensajero||scanMensajero||'',
          destinatario:'',
          telefono:'',
          direccion:'',
          comuna:'',
          referencia:'',
          fecha:hoy,
          estado:'en_bodega',
          monto:0,
          en_un_cambio:false,
          nota:'Ingresado por lector - '+hoy,
          fuente:'flex',
          updated_at:ts
        };
      });
      var r=await db.from('envios').insert(inserts);
      if(r.error)throw new Error(r.error.message);
      // También registrar en historial - quién y por qué medio (panel admin, lector fisico)
      var hist=scanNuevos.map(function(e){
        return{
          codigo_envio:e.codigo,
          estado:'en_bodega',
          nota:'Ingresado por lector en bodega',
          usuario:nombreAdmin,
          canal:'panel_admin',
          created_at:ts
        };
      });
      await db.from('historial_envios').insert(hist).then(function(){});
    }
    var msg=scanNuevos.length>0?('✓ '+scanNuevos.length+' envíos Flex registrados'):'';
    if(scanOmitidos.length>0){
      var detalleOmitidos=scanOmitidos.map(function(e){var ex=mapaExistentes[e.codigo];return e.codigo+' ('+(ex?ex.estado:'?')+')';}).join(', ');
      msg+=(msg?' · ':'')+'⚠ '+scanOmitidos.length+' YA existían y NO se tocaron: '+detalleOmitidos;
    }
    toast(msg||'Sin cambios');
    setScanList([]);
    setScanCode('');
    cargarScanHoy(); // Actualizar KPIs
    if(scanInputRef.current)scanInputRef.current.focus();
  }catch(e){
    toast('⚠ Error: '+e.message);
    console.error(e);
  }
  setScanGuardando(false);
}

async function guardarColecta(){
    if(!formCliente||!formMen||!formPiezas){toast('⚠ Completa todos los campos');return;}
    setGuardando(true);
    try{
      var nueva={cliente:formCliente,mensajero:formMen,piezas:parseInt(formPiezas)||0,nota:formNota,fecha:hoy,estado:'confirmado',created_at:new Date().toISOString()};
      await db.from('colectas').insert(nueva);
      toast('✓ Colecta registrada');
      setFormCliente('');setFormMen('');setFormPiezas('');setFormNota('');
      cargarColectas();
    }catch(e){
      toast('⚠ Error: '+e.message);
    }
    setGuardando(false);
  }

  var clientesActivos=(clientes||[]).filter(function(c){return c.activo!==false;});
  var mensajerosActivos=(mensajeros||[]).filter(function(m){return m.activo!==false;});
  var totalPiezas=colectas.reduce(function(a,c){return a+(parseInt(c.piezas)||0);},0);

  // ── Cabecera (10-11-2026): cockpit oscuro, pestañas visibles, KPIs y rankings en vivo ──
  var tabOsc=function(v,l,extra){var act=subTab===v;return React.createElement('button',{key:v,type:'button',onClick:function(){setSubTab(v);},className:'ca-tab',style:{padding:'10px 16px',borderRadius:12,cursor:'pointer',fontWeight:800,fontSize:12.5,letterSpacing:.5,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:8,border:'1px solid '+(act?'#e8c766':'rgba(255,255,255,.18)'),background:act?'linear-gradient(135deg,#f0d27a,#b08a2e)':'linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,.03))',color:act?'#1a1d13':'#f1ecda',boxShadow:act?'0 8px 18px rgba(200,168,75,.35), inset 0 1px 0 rgba(255,255,255,.5)':'inset 0 1px 0 rgba(255,255,255,.08)'}},l,extra||null);};
  var kpiC=function(lbl,val,col,sub){return React.createElement('div',{key:lbl,style:{flex:'1 1 118px',minWidth:0,padding:'12px 14px',borderRadius:14,background:'linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.10)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.08)'}},
    React.createElement('div',{style:{fontSize:10,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(233,228,210,.66)',fontWeight:800}},lbl),
    React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:34,lineHeight:1.05,color:col,textShadow:'0 0 16px '+col+'55',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},val),
    sub&&React.createElement('div',{style:{fontSize:11,color:'rgba(233,228,210,.66)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},sub));};
  var ctrlLbl=function(t){return React.createElement('div',{style:{fontSize:10,letterSpacing:1.4,textTransform:'uppercase',color:'rgba(233,228,210,.66)',fontWeight:800,marginBottom:4}},t);};
  var ctrlSt={padding:'8px 10px',borderRadius:10,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.94)',fontSize:12.5,color:'#1a1d13',minWidth:0};
  var normM=function(x){return String(x||'').replace(/,\s*/g,' ').trim();};
  var scanVista=scanTotal.filter(function(e){return (filtroCliente==='todos'||e.cliente===filtroCliente)&&(filtroMen==='todos'||normM(e.mensajero)===normM(filtroMen));});
  var agrupar=function(campo,vacio){var m={};scanVista.forEach(function(e){var k=e[campo]?normM(e[campo]):vacio;m[k]=(m[k]||0)+1;});return Object.keys(m).map(function(k){return {k:k,n:m[k]};}).sort(function(x,y){return y.n-x.n;});};
  var porCli=agrupar('cliente','Sin cliente'),porMen=agrupar('mensajero','Sin asignar');
  var porHora=(function(){var h={};scanVista.forEach(function(e){var t=e.created_at||e.updated_at;if(!t)return;var hh=new Date(t).toLocaleString('es-CL',{hour:'2-digit',hour12:false,timeZone:'America/Santiago'});h[hh]=(h[hh]||0)+1;});return Object.keys(h).sort().map(function(k){return {k:k,n:h[k]};});})();
  var sinMen=scanVista.filter(function(e){return !e.mensajero;}).length;
  var esHoy=filtroFecha===hoy;
  var piezasCol=colectas.reduce(function(a,c){return a+(parseInt(c.piezas)||0);},0);
  var PAL=['#e8c766','#36c47f','#5aa9ff','#ff8a5c','#b38bff','#ff5fa2','#4dd0c8','#f0b94a'];
  var tarjeta={background:'linear-gradient(160deg,#ffffff 0%,#fbf6ea 100%)',border:'1px solid rgba(200,168,75,0.35)',borderRadius:16,boxShadow:'0 14px 30px rgba(43,46,32,0.10), 0 2px 6px rgba(43,46,32,0.06), inset 0 1px 0 #fff',padding:'14px 16px'};
  var ranking=function(titulo,lista,vacio){var max=lista.length?lista[0].n:1;return React.createElement('div',{style:tarjeta},
    React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}},
      React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1.3,color:'#2b2e20'}},titulo),
      React.createElement('div',{style:{fontSize:11.5,fontWeight:800,color:'#8a7a45'}},lista.length+' · '+scanVista.length+' paquetes')),
    lista.length===0?React.createElement('div',{style:{fontSize:12.5,color:'var(--text-soft)',padding:'10px 0'}},vacio):
    React.createElement('div',{style:{maxHeight:260,overflowY:'auto',paddingRight:4}},lista.map(function(x,i){var c=x.k==='Sin asignar'||x.k==='Sin cliente'?'#c0392b':PAL[i%PAL.length];return React.createElement('div',{key:x.k,style:{marginBottom:8}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',fontSize:12.5,fontWeight:700,color:'#2b2e20',marginBottom:3}},React.createElement('span',{style:{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:8}},x.k),React.createElement('span',{style:{fontFamily:'Bebas Neue',fontSize:17,color:c==='#e8c766'?'#9a7a1f':c}},x.n)),
      React.createElement('div',{style:{height:10,borderRadius:6,background:'rgba(43,46,32,.07)',overflow:'hidden',boxShadow:'inset 0 1px 2px rgba(0,0,0,.12)'}},React.createElement('div',{style:{width:Math.max(3,x.n/max*100)+'%',height:'100%',borderRadius:6,background:'linear-gradient(180deg,'+c+'cc,'+c+')',boxShadow:'0 0 8px '+c+'66'}})));})));};
  var graficoHoras=function(){var max=porHora.reduce(function(a,x){return Math.max(a,x.n);},1);return React.createElement('div',{style:tarjeta},
    React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}},
      React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1.3,color:'#2b2e20'}},'Ingresos por hora'),
      porHora.length>0&&React.createElement('div',{style:{fontSize:11.5,fontWeight:800,color:'#8a7a45'}},'Peak '+porHora.reduce(function(a,x){return x.n>a.n?x:a;},porHora[0]).k+':00 h')),
    porHora.length===0?React.createElement('div',{style:{fontSize:12.5,color:'var(--text-soft)',padding:'10px 0'}},'Sin ingresos todavía.'):
    React.createElement('div',{style:{display:'flex',alignItems:'flex-end',gap:6,height:170,paddingTop:16}},porHora.map(function(x){return React.createElement('div',{key:x.k,style:{flex:1,minWidth:0,display:'flex',flexDirection:'column',alignItems:'center',height:'100%',justifyContent:'flex-end'}},
      React.createElement('div',{style:{fontSize:11,fontWeight:800,color:'#2b2e20',marginBottom:3}},x.n),
      React.createElement('div',{style:{width:'100%',maxWidth:38,height:Math.max(4,x.n/max*120),borderRadius:'7px 7px 3px 3px',background:'linear-gradient(180deg,#f0d27a,#b08a2e)',boxShadow:'0 6px 12px rgba(176,138,46,.35), inset 0 1px 0 rgba(255,255,255,.6)'}}),
      React.createElement('div',{style:{fontSize:10.5,color:'var(--text-soft)',marginTop:4,fontWeight:700}},x.k+'h'));})));};

  return React.createElement('div',null,
    React.createElement('style',null,'.ca-tab{transition:transform .12s ease,box-shadow .12s ease}.ca-tab:hover{transform:translateY(-1px)}@keyframes caPulse{0%,100%{opacity:1}50%{opacity:.35}}@media(max-width:900px){.ca-grid3{grid-template-columns:1fr!important}}'),
    React.createElement('div',{style:{position:'relative',borderRadius:20,overflow:'hidden',background:'radial-gradient(120% 90% at 30% 0%,#3a3f2b 0%,#22261a 45%,#14170f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 24px 50px rgba(20,22,15,.30), inset 0 1px 0 rgba(255,255,255,.08)',color:'#e9e4d2',padding:'16px 20px 18px',marginBottom:16}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:14,flexWrap:'wrap',marginBottom:14}},
        React.createElement('div',null,
          React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:2.2,color:'#fff',lineHeight:1}},'Colecta ',React.createElement('span',{style:{color:'#e8c766'}},'Admin')),
          React.createElement('div',{style:{fontSize:12,color:'rgba(233,228,210,.7)',marginTop:4,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}},
            React.createElement('span',null,'Ingreso de paquetes a bodega'),
            React.createElement('span',{style:{display:'inline-flex',alignItems:'center',gap:6,padding:'2px 9px',borderRadius:999,background:enVivo&&esHoy?'rgba(54,196,127,.15)':'rgba(255,255,255,.06)',border:'1px solid '+(enVivo&&esHoy?'rgba(54,196,127,.45)':'rgba(255,255,255,.14)'),fontWeight:700,fontSize:11}},
              React.createElement('span',{style:{width:7,height:7,borderRadius:'50%',background:enVivo&&esHoy?'#36c47f':'#888',boxShadow:enVivo&&esHoy?'0 0 8px #36c47f':'none',animation:enVivo&&esHoy?'caPulse 1.6s infinite':'none'}}),
              enVivo&&esHoy?'En vivo · cada 30 s':'Pausado'),
            ultimaAct&&React.createElement('span',{style:{fontSize:11}},'Actualizado '+ultimaAct.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'})))),
        React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}},
          React.createElement('div',null,ctrlLbl('Fecha'),React.createElement('input',{type:'date',value:filtroFecha,onChange:function(e){setFiltroFecha(e.target.value);},style:ctrlSt})),
          React.createElement('div',null,ctrlLbl('Cliente'),React.createElement('select',{value:filtroCliente,onChange:function(e){setFiltroCliente(e.target.value);},style:Object.assign({},ctrlSt,{maxWidth:190})},
            React.createElement('option',{value:'todos'},'Todos'),clientesActivos.map(function(c){return React.createElement('option',{key:c.id,value:c.nombre},c.nombre);}))),
          React.createElement('div',null,ctrlLbl('Mensajero'),React.createElement('select',{value:filtroMen,onChange:function(e){setFiltroMen(e.target.value);},style:Object.assign({},ctrlSt,{maxWidth:190})},
            React.createElement('option',{value:'todos'},'Todos'),mensajerosActivos.map(function(m){return React.createElement('option',{key:m.id,value:m.nombre},normM(m.nombre));}))),
          React.createElement('button',{type:'button',onClick:function(){setEnVivo(function(v){return !v;});},style:{padding:'9px 13px',borderRadius:10,cursor:'pointer',fontWeight:800,fontSize:12,border:'1px solid rgba(255,255,255,.18)',background:'rgba(255,255,255,.06)',color:'#e9e4d2'}},enVivo?'Pausar':'En vivo'),
          React.createElement('button',{type:'button',onClick:refrescarTodo,style:{padding:'9px 15px',borderRadius:10,cursor:'pointer',fontWeight:800,fontSize:12,border:'1px solid #e8c766',background:'linear-gradient(135deg,#f0d27a,#b08a2e)',color:'#1a1d13',boxShadow:'0 6px 14px rgba(200,168,75,.3)'}},'Actualizar'))),
      React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14,paddingBottom:14,borderBottom:'1px solid rgba(255,255,255,.08)'}},
        tabOsc('lector','Lector / Scanner'),
        tabOsc('historial','Historial',colectas.length>0&&React.createElement('span',{style:{padding:'1px 7px',borderRadius:10,background:subTab==='historial'?'rgba(0,0,0,.18)':'rgba(255,255,255,.12)',fontSize:11}},colectas.length)),
        tabOsc('excel','Importar Excel'),
        tabOsc('pdf','Importar PDF'),
        tabOsc('noreg','No registrados',nNoReg>0&&React.createElement('span',{style:{padding:'1px 8px',borderRadius:10,background:'#ff2fd0',color:'#fff',fontSize:11,fontWeight:900,boxShadow:'0 0 10px rgba(255,47,208,.6)'}},nNoReg))),
      React.createElement('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
        kpiC(esHoy?'Ingresados hoy':'Ingresados',scanVista.length.toLocaleString('es-CL'),'#e8c766',(filtroCliente!=='todos'||filtroMen!=='todos')?'con filtros aplicados':'escaneados en bodega'),
        kpiC('Clientes',porCli.length,'#5aa9ff',porCli[0]?'más: '+porCli[0].k+' ('+porCli[0].n+')':'sin ingresos'),
        kpiC('Mensajeros',porMen.filter(function(x){return x.k!=='Sin asignar';}).length,'#36c47f',porMen[0]?'más: '+porMen[0].k+' ('+porMen[0].n+')':'sin ingresos'),
        kpiC('Sin mensajero',sinMen,sinMen?'#ff8a5c':'#36c47f',sinMen?'ingresados sin asignar':'todo asignado'),
        kpiC('Colectas',colectas.length,'#b38bff',piezasCol.toLocaleString('es-CL')+' piezas registradas'),
        kpiC('No registrados',nNoReg,nNoReg?'#ff5fd8':'#36c47f',nNoReg?'pendientes de revisar':'sin pendientes'),
        scanList.length>0&&kpiC('En lista actual',scanList.length,'#f0b94a','sin guardar todavía'))
    ),
    subTab==='lector'&&React.createElement('div',{className:'ca-grid3',style:{display:'grid',gridTemplateColumns:'1fr 1fr 1.2fr',gap:14,marginBottom:16}},
      ranking('Por cliente',porCli,'Sin ingresos para esta fecha.'),
      ranking('Por mensajero',porMen,'Sin ingresos para esta fecha.'),
      graficoHoras()),

    // Tab registro
    subTab==='lector'&&React.createElement('div',{className:'panel'},
      // Header
      React.createElement('div',{className:'panel-title'},'Escaneo con Lector / Scanner'),
      React.createElement('div',{style:{background:'rgba(200,168,75,0.06)',border:'1px solid rgba(200,168,75,0.2)',borderRadius:8,padding:12,marginBottom:16,fontSize:12,color:'var(--text-soft)'}},
        'Conecta tu lector de código de barras o QR. Cada escaneo agrega el código automáticamente. Presiona Enter para confirmar manualmente.'
      ),
      // Config mensajero y cliente
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}},
        React.createElement('div',{className:'form-group',style:{marginBottom:0}},
          React.createElement('label',{className:'form-label'},'Mensajero'),
          React.createElement('select',{className:'form-input',value:scanMensajero,onChange:function(e){setScanMensajero(e.target.value);}},
            React.createElement('option',{value:''},'— Seleccionar —'),
            mensajeros.filter(function(m){return m.activo!==false;}).map(function(m){
              return React.createElement('option',{key:m.id,value:m.nombre},m.nombre);
            })
          )
        ),
        React.createElement('div',{className:'form-group',style:{marginBottom:0}},
          React.createElement('label',{className:'form-label'},'Cliente (opcional)'),
          React.createElement('select',{className:'form-input',value:scanCliente,onChange:function(e){setScanCliente(e.target.value);}},
            React.createElement('option',{value:''},'— Todos —'),
            clientes.filter(function(c){return c.activo!==false;}).map(function(c){
              return React.createElement('option',{key:c.id,value:c.nombre},c.nombre);
            })
          )
        )
      ),
      // Input de escaneo
      React.createElement('div',{style:{display:'flex',gap:8,marginBottom:16}},
        React.createElement('input',{
          ref:scanInputRef,
          type:'text',
          className:'form-input',
          placeholder:'Escanea o escribe el código...',
          value:scanCode,
          autoFocus:!esTactil,
          onChange:function(e){setScanCode(e.target.value);},
          onKeyDown:function(e){
            if(e.key==='Enter'&&scanCode.trim()){
              procesarScanLector(scanCode);
            }
          },
          style:{flex:1,fontFamily:'JetBrains Mono',fontSize:14,letterSpacing:1}
        }),
        React.createElement('button',{
          className:'btn-primary',
          onClick:function(){procesarScanLector(scanCode);},
          style:{whiteSpace:'nowrap'}
        },'+ Agregar')
      ),
      // Retiro masivo con cámara (mismo flujo que la app de mensajeros, a nombre del mensajero elegido)
      React.createElement('div',{style:{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',padding:'12px 14px',marginBottom:16,borderRadius:10,border:'1px solid rgba(200,168,75,0.35)',background:'linear-gradient(135deg,rgba(200,168,75,0.10),rgba(200,168,75,0.03))'}},
        React.createElement('div',{style:{flex:'1 1 220px',minWidth:0}},
          React.createElement('div',{style:{fontWeight:700,fontSize:13,letterSpacing:.3}},'Retiro masivo con cámara'),
          React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginTop:2}},scanMensajero?('Escanea con la cámara del teléfono y foto de etiqueta. Queda a nombre de '+scanMensajero+'.'):'Elige primero el mensajero que trajo los paquetes.')
        ),
        React.createElement('button',{
          disabled:!window.RetiroMasivoRider,
          onClick:function(){
            if(!scanMensajero){toast('Elige el mensajero primero');return;}
            if(!window.RetiroMasivoRider){toast('Retiro masivo no disponible, recarga la página');return;}
            setShowRM(true);
          },
          style:{whiteSpace:'nowrap',padding:'11px 18px',borderRadius:12,cursor:'pointer',fontWeight:800,fontSize:13,letterSpacing:.4,border:scanMensajero?'1px solid #e8c766':'1px solid #2b2e20',background:scanMensajero?'linear-gradient(135deg,#f0d27a,#b08a2e)':'linear-gradient(160deg,#3a3f2b,#1a1d13)',color:scanMensajero?'#1a1d13':'#f1ecda',boxShadow:scanMensajero?'0 8px 18px rgba(200,168,75,.35)':'0 6px 14px rgba(20,22,15,.25)'}
        },scanMensajero?'Abrir retiro masivo':'Elegir mensajero primero')
      ),
      showRM&&window.RetiroMasivoRider&&React.createElement(window.RetiroMasivoRider,{
        usuario:{nombre:scanMensajero,rol:'rider'},
        clientes:clientes,
        toast:toast,
        onClose:function(){setShowRM(false);cargarScanHoy();}
      }),
      // Lista escaneados
      scanList.length>0&&React.createElement('div',null,
        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}},
          React.createElement('div',{style:{fontWeight:700,fontSize:13}},scanList.length+' códigos escaneados'),
          React.createElement('div',{style:{display:'flex',gap:8}},
            React.createElement('button',{
              className:'btn-secondary',
              style:{fontSize:12,color:'var(--danger)'},
              onClick:function(){if(confirm('¿Limpiar lista?'))setScanList([]);}
            },'Limpiar'),
            React.createElement('button',{
              className:'btn-primary',
              disabled:scanGuardando||!scanMensajero,
              onClick:guardarLoteScanner,
              style:{fontSize:12}
            },scanGuardando?'Guardando...':'Guardar '+scanList.length+' envíos')
          )
        ),
        React.createElement('div',{style:{maxHeight:350,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8}},
          React.createElement('table',{style:{width:'100%',borderCollapse:'collapse'}},
            React.createElement('thead',null,
              React.createElement('tr',{style:{background:'var(--dark)'}},
                ['#','Código','Cliente','Hora',''].map(function(h){
                  return React.createElement('th',{key:h,style:{padding:'8px 12px',textAlign:'left',fontSize:11,color:'var(--gold)',fontFamily:'Bebas Neue',letterSpacing:1}},h);
                })
              )
            ),
            React.createElement('tbody',null,
              scanList.map(function(e,i){
                return React.createElement('tr',{key:e.codigo,style:{background:i%2===0?'#fff':'var(--cream)',borderBottom:'1px solid var(--border)'}},
                  React.createElement('td',{style:{padding:'6px 12px',fontSize:11,color:'var(--text-soft)'}},i+1),
                  React.createElement('td',{style:{padding:'6px 12px',fontFamily:'JetBrains Mono',fontSize:12,fontWeight:600}},e.codigo),
                  React.createElement('td',{style:{padding:'6px 12px',fontSize:12}},e.cliente||'—'),
                  React.createElement('td',{style:{padding:'6px 12px',fontSize:11,color:'var(--text-soft)'}},e.hora),
                  React.createElement('td',{style:{padding:'6px 12px'}},
                    React.createElement('button',{
                      onClick:function(){setScanList(function(prev){return prev.filter(function(x){return x.codigo!==e.codigo;});});},
                      style:{background:'transparent',border:'none',color:'var(--danger)',cursor:'pointer',fontSize:14}
                    },'✕')
                  )
                );
              })
            )
          )
        )
      ),
      scanList.length===0&&React.createElement('div',{style:{textAlign:'center',padding:'40px 20px',color:'var(--text-soft)'}},
        React.createElement('div',{style:{width:64,height:64,margin:'0 auto 12px',borderRadius:18,background:'linear-gradient(160deg,#f0d27a,#b08a2e)',boxShadow:'0 10px 22px rgba(176,138,46,.35), inset 0 1px 0 rgba(255,255,255,.6)',display:'flex',alignItems:'center',justifyContent:'center'}},React.createElement('div',{style:{width:30,height:22,border:'3px solid #1a1d13',borderRadius:5,position:'relative'}},React.createElement('div',{style:{position:'absolute',left:'50%',top:'50%',width:9,height:9,marginLeft:-4.5,marginTop:-4.5,borderRadius:'50%',border:'2.5px solid #1a1d13'}}))),
        React.createElement('div',{style:{fontSize:14,fontWeight:600,marginBottom:6}},'Listo para escanear'),
        React.createElement('div',{style:{fontSize:12}},'El cursor está en el campo de escaneo. Usa tu lector o escribe el código.')
      )
    ),
    subTab==='excel'&&/*#__PURE__*/React.createElement('div',{className:'panel',style:{maxWidth:700}},
      /*#__PURE__*/React.createElement('div',{className:'panel-title'},'Importar Excel de Envíos'),
      /*#__PURE__*/React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:16}},'Sube el archivo CARGA_PGSO o tu propio Excel. Los envíos se agregan al sistema automáticamente.'),
      /*#__PURE__*/React.createElement('div',{
        onDragOver:function(e){e.preventDefault();},
        onClick:function(){var i=document.getElementById('colecta-excel-inp');if(i)i.click();},
        style:{border:'2px dashed rgba(200,168,75,0.4)',borderRadius:14,padding:'40px 20px',textAlign:'center',cursor:'pointer',
          background:'linear-gradient(145deg,rgba(200,168,75,0.05),rgba(200,168,75,0.1))',
          boxShadow:'inset 2px 2px 8px rgba(43,46,32,0.06)',transition:'all 0.2s'}
      },
        /*#__PURE__*/React.createElement('div',{style:{fontSize:40,marginBottom:12}},'⬇'),
        /*#__PURE__*/React.createElement('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:2,color:'var(--dark)',marginBottom:6}},'Arrastra tu Excel aquí'),
        /*#__PURE__*/React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)'}},'o haz clic · Acepta .xlsx, .xls')
      ),
      /*#__PURE__*/React.createElement('input',{id:'colecta-excel-inp',type:'file',accept:'.xlsx,.xls,.htm,.html',style:{display:'none'},
        onChange:function(e){var f=e.target.files[0];if(!f)return;var name=f.name.toLowerCase();
          if(name.includes('carga_pgso')||name.includes('carga_p'))toast('Procesando archivo del sistema...');
          else toast('Procesando archivo propio...');
          e.target.value='';toast('Usa Gestión de Envíos para procesar este archivo');
        }
      })
    ),
    subTab==='pdf'&&/*#__PURE__*/React.createElement('div',{className:'panel',style:{maxWidth:700}},
      /*#__PURE__*/React.createElement('div',{className:'panel-title'},'Importar PDF Flex'),
      /*#__PURE__*/React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:16}},'Sube el PDF de MercadoLibre Flex. El sistema extrae los envíos automáticamente y los agrega a Gestión de Envíos.'),
      /*#__PURE__*/React.createElement(ImportarPDFColecta,{clientes:clientes,toast:toast,db:db,usuario:nombreAdmin})
    ),
    subTab==='noreg'&&React.createElement(NoRegistradosPanel,{toast:toast,fecha:filtroFecha,nombreAdmin:nombreAdmin,onCuenta:setNNoReg}),
    subTab==='historial'&&React.createElement('div',null,
      loading?React.createElement('div',{className:'empty-state'},'Cargando...'):
      colectas.length===0?React.createElement('div',{className:'info-banner'},'Sin colectas para la fecha seleccionada.'):
      React.createElement('div',{className:'table-wrap'},
        React.createElement('table',null,
          React.createElement('thead',null,
            React.createElement('tr',null,
              React.createElement('th',null,'#'),
              React.createElement('th',null,'Cliente'),
              React.createElement('th',null,'Mensajero'),
              React.createElement('th',{style:{textAlign:'center'}},'Piezas'),
              React.createElement('th',null,'Nota'),
              React.createElement('th',null,'Hora')
            )
          ),
          React.createElement('tbody',null,
            colectas.map(function(c,i){
              var hora=c.created_at?new Date(c.created_at).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}):'—';
              return React.createElement('tr',{key:c.id||i,style:{background:i%2===0?'#fff':'var(--cream)'}},
                React.createElement('td',{style:{textAlign:'center',color:'var(--text-soft)',fontFamily:'JetBrains Mono',fontSize:11}},i+1),
                React.createElement('td',{style:{fontWeight:600}},c.cliente||'—'),
                React.createElement('td',null,(c.mensajero||'—').replace(/,\s*/g,' ')),
                React.createElement('td',{className:'mono',style:{textAlign:'center',fontWeight:700,color:parseInt(c.piezas)>=5?'var(--success)':'var(--warning)'}},c.piezas||0),
                React.createElement('td',{style:{fontSize:11,color:'var(--text-soft)'}},c.nota||'—'),
                React.createElement('td',{className:'mono',style:{fontSize:11,color:'var(--text-soft)'}},hora)
              );
            })
          )
        )
      )
    )
  );
}

// 10-11-2026: códigos que un mensajero escaneó y no existen en el sistema (aviso a bodega).
function NoRegistradosPanel(props){
  var db=window.__app&&window.__app.db||window.db;var toast=props.toast;var fecha=props.fecha;var nombreAdmin=props.nombreAdmin;var onCuenta=props.onCuenta||function(){};
  var _v=React.useState('pendientes'),vista=_v[0],setVista=_v[1];
  var _f=React.useState([]),filas=_f[0],setFilas=_f[1];
  var _l=React.useState(true),cargando=_l[0],setCargando=_l[1];
  async function cargar(){
    setCargando(true);
    try{
      var q=db.from('codigos_no_registrados').select('*').order('ultimo_at',{ascending:false}).limit(1000);
      if(vista==='pendientes')q=q.eq('resuelto',false);else q=q.eq('fecha',fecha);
      var r=await q;if(r.error)throw r.error;
      var lista=r.data||[];
      var cods=Array.from(new Set(lista.map(function(x){return x.codigo;})));
      var existen={};
      for(var i=0;i<cods.length;i+=200){
        var r2=await db.from('envios').select('codigo,cliente,estado,mensajero').in('codigo',cods.slice(i,i+200));
        (r2.data||[]).forEach(function(e){existen[e.codigo]=e;});
      }
      // Los que ya fueron ingresados al sistema se cierran solos
      var ya=lista.filter(function(x){return !x.resuelto&&existen[x.codigo];}).map(function(x){return x.id;});
      if(ya.length){try{await db.from('codigos_no_registrados').update({resuelto:true,resuelto_por:'Ingresado al sistema',resuelto_at:new Date().toISOString()}).in('id',ya);}catch(e){}}
      lista=lista.map(function(x){var e=existen[x.codigo];return Object.assign({},x,{envio:e||null,resuelto:x.resuelto||!!e,resuelto_por:x.resuelto_por||(e?'Ingresado al sistema':null)});});
      if(vista==='pendientes')lista=lista.filter(function(x){return !x.resuelto;});
      setFilas(lista);
      if(vista==='pendientes')onCuenta(lista.length);
    }catch(e){toast('No se pudo cargar: '+(e.message||e));setFilas([]);}
    setCargando(false);
  }
  React.useEffect(function(){cargar();},[vista,fecha]);
  async function resolver(f){
    var nota=prompt('Qué se hizo con '+f.codigo+'? (opcional)')||'';
    var r=await db.from('codigos_no_registrados').update({resuelto:true,resuelto_por:nombreAdmin,resuelto_at:new Date().toISOString(),nota:nota||null}).eq('id',f.id);
    if(r.error){toast('Error: '+r.error.message);return;}
    toast('Marcado como resuelto');cargar();
  }
  var th={padding:'9px 10px',textAlign:'left',fontSize:11,color:'var(--gold)',fontFamily:'Bebas Neue',letterSpacing:1};
  var td={padding:'8px 10px',fontSize:12,borderBottom:'1px solid var(--border)'};
  var fmt=function(t){try{return new Date(t).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){return '';}};
  var btnV=function(v,l){return React.createElement('button',{onClick:function(){setVista(v);},style:{padding:'6px 14px',borderRadius:8,border:'1px solid '+(vista===v?'#c2189b':'var(--border)'),background:vista===v?'rgba(194,24,155,0.10)':'#fff',color:vista===v?'#c2189b':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer'}},l);};
  return React.createElement('div',{className:'panel'},
    React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:12}},
      React.createElement('div',null,
        React.createElement('div',{className:'panel-title',style:{marginBottom:2}},'Códigos no registrados'),
        React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)'}},'Paquetes que un mensajero escaneó y no existen en el sistema. Se cierran solos cuando el código se ingresa.')
      ),
      React.createElement('div',{style:{display:'flex',gap:6}},btnV('pendientes','Pendientes (todas las fechas)'),btnV('dia','Del '+fecha.split('-').reverse().join('-')),
        React.createElement('button',{onClick:cargar,className:'btn-secondary',style:{fontSize:12}},'Actualizar'))
    ),
    cargando?React.createElement('div',{className:'empty-state'},'Cargando...'):
    filas.length===0?React.createElement('div',{className:'info-banner'},vista==='pendientes'?'No hay códigos no registrados pendientes.':'Sin avisos para esta fecha.'):
    React.createElement('div',{style:{overflowX:'auto',border:'1px solid var(--border)',borderRadius:10}},
      React.createElement('table',{style:{width:'100%',borderCollapse:'collapse',minWidth:640}},
        React.createElement('thead',null,React.createElement('tr',{style:{background:'var(--dark)'}},['Código','Mensajero','Veces','Primer aviso','Último','Estado',''].map(function(h){return React.createElement('th',{key:h,style:th},h);}))),
        React.createElement('tbody',null,filas.map(function(f){
          return React.createElement('tr',{key:f.id,style:{background:f.resuelto?'#fff':'rgba(255,47,208,0.06)'}},
            React.createElement('td',{style:Object.assign({},td,{fontFamily:'JetBrains Mono',fontWeight:700})},f.codigo),
            React.createElement('td',{style:td},f.mensajero||'—'),
            React.createElement('td',{style:Object.assign({},td,{textAlign:'center',fontWeight:700})},f.veces),
            React.createElement('td',{style:td},fmt(f.created_at)),
            React.createElement('td',{style:td},fmt(f.ultimo_at)),
            React.createElement('td',{style:td},f.resuelto?React.createElement('span',{style:{color:'var(--success)',fontWeight:700}},(f.envio?'Ingresado · '+(f.envio.cliente||''):'Resuelto · '+(f.resuelto_por||''))+(f.nota?' · '+f.nota:'')):React.createElement('span',{style:{padding:'3px 8px',borderRadius:6,background:'#ff4fd8',color:'#fff',fontWeight:800,fontSize:11}},'PENDIENTE')),
            React.createElement('td',{style:td},!f.resuelto&&React.createElement('button',{className:'btn-secondary',style:{fontSize:11,padding:'4px 10px'},onClick:function(){resolver(f);}},'Marcar resuelto'))
          );
        }))
      )
    )
  );
}
window.ColectaAdmin = ColectaAdmin;
})();
