(function(){
var useState=React.useState;
var ImportarPDFColecta=window.__app.ImportarPDFColecta, db=window.__app.db, fechaHoyCL=window.__app.fechaHoyCL, lsLoad=window.__app.lsLoad;
function ColectaAdmin(_ref_ca){var clientes=_ref_ca.clientes,mensajeros=_ref_ca.mensajeros,toast=_ref_ca.toast,esAdmin=_ref_ca.esAdmin;
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

  // Cargar envíos escaneados hoy desde Supabase
  React.useEffect(function(){
    cargarScanHoy();
  },[filtroFecha]);

  async function cargarScanHoy(){
    try{
      var r=await db.from('envios')
        .select('codigo,cliente,mensajero,fecha,estado,fuente,nota,updated_at')
        .eq('fecha',filtroFecha)
        .in('fuente',['flex','lector','manual','scanner'])
        .order('updated_at',{ascending:false});
      setScanTotal(r.data||[]);
    }catch(e){setScanTotal([]);}
  }

  React.useEffect(function(){
    cargarColectas();
  },[filtroFecha,filtroCliente,filtroMen]);

  async function cargarColectas(){
    setLoading(true);
    try{
      var q=db.from('colectas').select('*').eq('fecha',filtroFecha).order('created_at',{ascending:false});
      if(filtroCliente!=='todos')q=q.eq('cliente',filtroCliente);
      if(filtroMen!=='todos')q=q.eq('mensajero',filtroMen);
      var res=await q;
      if(res.data)setColectas(res.data);
      else setColectas([]);
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
    var inserts=scanList.map(function(e){
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
    var r=await db.from('envios').upsert(inserts,{onConflict:'codigo'});
    if(r.error)throw new Error(r.error.message);
    // También registrar en historial
    var hist=scanList.map(function(e){
      return{
        codigo_envio:e.codigo,
        estado:'en_bodega',
        nota:'Ingresado por lector en bodega',
        usuario:'Admin',
        fecha:ts
      };
    });
    await db.from('historial_envios').insert(hist).then(function(){});
    toast('✓ '+scanList.length+' envíos Flex registrados');
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

  var btnSub=function(v,l){return React.createElement('button',{
    onClick:function(){setSubTab(v);},
    style:{padding:'6px 16px',borderRadius:8,border:'1px solid '+(subTab===v?'var(--gold)':'var(--border)'),background:subTab===v?'rgba(200,168,75,0.12)':'#fff',color:subTab===v?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer'}
  },l);};

  return React.createElement('div',null,
    React.createElement('div',{className:'section-head'},
      React.createElement('div',{className:'section-title'},'Colecta ',React.createElement('span',null,'Admin')),
      React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},
        btnSub('lector','Lector/Scanner'),
        btnSub('historial','Historial'),
        btnSub('excel','Importar Excel'),
        btnSub('pdf','Importar PDF'),
        React.createElement('input',{type:'date',value:filtroFecha,onChange:function(e){setFiltroFecha(e.target.value);},style:{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:12}}),
        React.createElement('select',{value:filtroCliente,onChange:function(e){setFiltroCliente(e.target.value);},style:{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:12}},
          React.createElement('option',{value:'todos'},'Todos los clientes'),
          clientesActivos.map(function(c){return React.createElement('option',{key:c.id,value:c.nombre},c.nombre);})
        ),
        React.createElement('select',{value:filtroMen,onChange:function(e){setFiltroMen(e.target.value);},style:{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:12}},
          React.createElement('option',{value:'todos'},'Todos los mensajeros'),
          mensajerosActivos.map(function(m){return React.createElement('option',{key:m.id,value:m.nombre},m.nombre.replace(/,\s*/g,' '));})
        ),
        React.createElement('button',{className:'btn-secondary',onClick:cargarColectas},'↺ Actualizar')
      )
    ),

    // KPIs - datos de envíos escaneados del día
    React.createElement('div',{className:'stats-grid',style:{marginBottom:20}},
      React.createElement('div',{className:'stat-card'},
        React.createElement('div',{className:'stat-label'},'Envíos Escaneados Hoy'),
        React.createElement('div',{className:'stat-value'},scanTotal.length)
      ),
      React.createElement('div',{className:'stat-card'},
        React.createElement('div',{className:'stat-label'},'En Lista Actual'),
        React.createElement('div',{className:'stat-value gold'},scanList.length)
      ),
      React.createElement('div',{className:'stat-card'},
        React.createElement('div',{className:'stat-label'},'Clientes del día'),
        React.createElement('div',{style:{fontSize:12,marginTop:4}},
          (function(){
            var porCliente={};
            scanTotal.forEach(function(e){
              var c=e.cliente||'Sin cliente';
              porCliente[c]=(porCliente[c]||0)+1;
            });
            var keys=Object.keys(porCliente);
            if(keys.length===0)return React.createElement('span',{style:{color:'var(--text-soft)'}},'0');
            return React.createElement('div',null,
              keys.map(function(c){
                return React.createElement('div',{key:c,style:{display:'flex',justifyContent:'space-between',gap:8}},
                  React.createElement('span',{style:{fontWeight:600,fontSize:11}},c),
                  React.createElement('span',{style:{color:'var(--gold)',fontWeight:700}},porCliente[c])
                );
              })
            );
          })()
        )
      ),
      React.createElement('div',{className:'stat-card'},
        React.createElement('div',{className:'stat-label'},'Mensajeros del día'),
        React.createElement('div',{style:{fontSize:12,marginTop:4}},
          (function(){
            var porMen={};
            scanTotal.forEach(function(e){
              var m=e.mensajero||'Sin asignar';
              if(!porMen[m])porMen[m]={total:0,fuente:e.fuente||'lector'};
              porMen[m].total++;
            });
            var keys=Object.keys(porMen);
            if(keys.length===0)return React.createElement('span',{style:{color:'var(--text-soft)'}},'0');
            return React.createElement('div',null,
              keys.map(function(m){
                var fuente=porMen[m].fuente==='flex'?'Lector QR':porMen[m].fuente==='manual'?'Manual':'Scanner';
                return React.createElement('div',{key:m,style:{marginBottom:4}},
                  React.createElement('div',{style:{display:'flex',justifyContent:'space-between',gap:8}},
                    React.createElement('span',{style:{fontWeight:700,fontSize:12}},m),
                    React.createElement('span',{style:{color:'var(--gold)',fontWeight:700}},porMen[m].total)
                  ),
                  React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)'}},fuente)
                );
              })
            );
          })()
        )
      )
    ),

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
          autoFocus:true,
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
      // Lista escaneados
      scanList.length>0&&React.createElement('div',null,
        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}},
          React.createElement('div',{style:{fontWeight:700,fontSize:13}},scanList.length+' códigos escaneados'),
          React.createElement('div',{style:{display:'flex',gap:8}},
            React.createElement('button',{
              className:'btn-secondary',
              style:{fontSize:12,color:'var(--danger)'},
              onClick:function(){if(confirm('¿Limpiar lista?'))setScanList([]);}
            },'🗑 Limpiar'),
            React.createElement('button',{
              className:'btn-primary',
              disabled:scanGuardando||!scanMensajero,
              onClick:guardarLoteScanner,
              style:{fontSize:12}
            },scanGuardando?'Guardando...':'💾 Guardar '+scanList.length+' envíos')
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
        React.createElement('div',{style:{fontSize:48,marginBottom:12}},'📷'),
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
      /*#__PURE__*/React.createElement(ImportarPDFColecta,{clientes:clientes,toast:toast,db:db})
    ),
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
window.ColectaAdmin = ColectaAdmin;
})();
