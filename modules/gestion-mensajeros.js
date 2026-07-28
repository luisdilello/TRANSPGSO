(function(){
var useEffect=React.useEffect, useMemo=React.useMemo, useState=React.useState;
var Badge=window.__app.Badge, COMUNAS_RM_LIST=window.__app.COMUNAS_RM_LIST, DocumentosMensajero=window.__app.DocumentosMensajero, KpiBar=window.__app.KpiBar, Modal=window.__app.Modal, PestanasMensajero=window.__app.PestanasMensajero, db=window.__app.db, enviarNotificacionPush=window.__app.enviarNotificacionPush, fmt=window.__app.fmt;
function GestionMensajeros(_ref15){let mensajerosProp=_ref15.mensajeros,setMensajeros=_ref15.setMensajeros,mensajerosDia=_ref15.mensajerosDia,toast=_ref15.toast,esAdmin=_ref15.esAdmin;
  const _usUsr=useState(null),usuariosRider=_usUsr[0],setUsuariosRider=_usUsr[1]; // null = aun cargando
  useEffect(()=>{
    db.from('usuarios_publico').select('mensajero_id,nombre,rol').eq('rol','rider').then(res=>{
      if(res.data)setUsuariosRider(res.data);
      else setUsuariosRider([]);
    }).catch(()=>setUsuariosRider([]));
  },[]);
  const mensajeros=useMemo(()=>{
    if(usuariosRider===null)return mensajerosProp; // mientras carga, no ocultar nada (evita parpadeo/perdida momentanea)
    const idsConUsuario=new Set(usuariosRider.map(u=>u.mensajero_id).filter(Boolean));
    const nombresConUsuario=new Set(usuariosRider.map(u=>(u.nombre||'').trim().toUpperCase()));
    return mensajerosProp.filter(m=>idsConUsuario.has(m.id)||nombresConUsuario.has((m.nombre||'').trim().toUpperCase()));
  },[mensajerosProp,usuariosRider]);
  const sinUsuario=useMemo(()=>{
    if(usuariosRider===null)return[];
    const idsConUsuario=new Set(usuariosRider.map(u=>u.mensajero_id).filter(Boolean));
    const nombresConUsuario=new Set(usuariosRider.map(u=>(u.nombre||'').trim().toUpperCase()));
    return mensajerosProp.filter(m=>!idsConUsuario.has(m.id)&&!nombresConUsuario.has((m.nombre||'').trim().toUpperCase()));
  },[mensajerosProp,usuariosRider]);
  const _useState25=useState(''),search=_useState25[0],setSearch=_useState25[1];const _useState26=useState('todos'),filtro=_useState26[0],setFiltro=_useState26[1];const _useState27=useState(null),modal=_useState27[0],setModal=_useState27[1];const _useState28=useState({nombre:'',tarifa:1200}),form=_useState28[0],setForm=_useState28[1];const _useState29=useState(null),confirmDel=_useState29[0],setConfirmDel=_useState29[1];const _usDocM=useState(null),docsMensajero=_usDocM[0],setDocsMensajero=_usDocM[1];
const _usDup=useState(null),grupoDuplicados=_usDup[0],setGrupoDuplicados=_usDup[1]; // [{clave, filas:[...], keepId}]
const _usDupL=useState(false),buscandoDup=_usDupL[0],setBuscandoDup=_usDupL[1];
const _usDupProc=useState(false),procesandoDup=_usDupProc[0],setProcesandoDup=_usDupProc[1];
const _usNotif=useState(null),notifTarget=_usNotif[0],setNotifTarget=_usNotif[1]; // null | 'all' | mensajero obj
const _usNotifForm=useState({title:'',message:''}),notifForm=_usNotifForm[0],setNotifForm=_usNotifForm[1];
const _usNotifSend=useState(false),enviandoNotif=_usNotifSend[0],setEnviandoNotif=_usNotifSend[1];
async function confirmarEnvioNotif(){
  if(!notifForm.title.trim()||!notifForm.message.trim())return;
  setEnviandoNotif(true);
  const destino=notifTarget==='all'?'all':notifTarget.nombre;
  const res=await enviarNotificacionPush(destino,notifForm.title.trim(),notifForm.message.trim());
  setEnviandoNotif(false);
  if(res.ok){
    if(res.guardado===false)toast('⚠ Se envió pero el guardado del mensaje falló: '+(res.guardadoError||''));
    else toast(`✓ Notificación enviada a ${res.enviados} celular${res.enviados!==1?'es':''}`);
    setNotifTarget(null);setNotifForm({title:'',message:''});
  }
  else toast('⚠ '+(res.error||'No se pudo enviar'));
}
async function buscarDuplicados(){
  setBuscandoDup(true);
  try{
    const{data,error}=await db.from('mensajeros').select('*').order('id');
    if(error){toast('⚠ '+error.message);setBuscandoDup(false);return;}
    const grupos={};
    (data||[]).forEach(m=>{
      const clave=normNombre(m.nombre);
      if(!grupos[clave])grupos[clave]=[];
      grupos[clave].push(m);
    });
    const dups=Object.entries(grupos).filter(([,filas])=>filas.length>1).map(([clave,filas])=>({
      clave,filas,
      keepId:filas.find(f=>f.activo)?.id||filas[filas.length-1].id // por defecto: el más reciente y activo
    }));
    if(dups.length===0){toast('✓ No se encontraron duplicados');}
    else{setGrupoDuplicados(dups);}
  }catch(e){toast('⚠ '+e.message);}
  setBuscandoDup(false);
}
function elegirKeep(clave,id){
  setGrupoDuplicados(prev=>prev.map(g=>g.clave===clave?{...g,keepId:id}:g));
}
async function confirmarLimpiezaDuplicados(){
  setProcesandoDup(true);
  const idsEliminados=[];
  try{
    for(const g of grupoDuplicados){
      const aBorrar=g.filas.filter(f=>f.id!==g.keepId);
      for(const f of aBorrar){
        const{error}=await db.from('mensajeros').delete().eq('id',f.id);
        if(!error)idsEliminados.push(f.id);
      }
    }
    setMensajeros(prev=>prev.filter(m=>!idsEliminados.includes(m.id)));
    toast(`✓ ${idsEliminados.length} duplicado${idsEliminados.length>1?'s':''} eliminado${idsEliminados.length>1?'s':''}`);
    setGrupoDuplicados(null);
  }catch(e){toast('⚠ '+e.message);}
  setProcesandoDup(false);
}
const filtrados=mensajeros.filter(m=>m.nombre.toLowerCase().includes(search.toLowerCase())&&(filtro==='todos'||filtro==='activos'&&m.activo||filtro==='pausados'&&!m.activo));const normNombre=n=>(n||'').toUpperCase().replace(/,/g,'').replace(/\s+/g,' ').trim();const statsMap={};mensajerosDia.forEach(m=>{if(m.total>0)statsMap[normNombre(m.nombre)]={ef:m.entregados/m.total,total:m.total,entregados:m.entregados};});async function toggleEstado(id){const m=mensajeros.find(x=>x.id===id);const nuevoActivo=!m.activo;setMensajeros(prev=>prev.map(x=>x.id===id?{...x,activo:nuevoActivo}:x));toast(`${m.nombre} ${nuevoActivo?'activado':'pausado'}`);try{const nombreActual=(m.nombre||'').replace(/,/g,'').replace(/\s+/g,' ').trim();const{data:rows}=await db.from('mensajeros').select('id').ilike('nombre','%'+nombreActual.split(' ')[0]+'%');const sbId=rows&&rows.length>0?rows[0].id:id;const{error:errUpd}=await db.from('mensajeros').update({activo:nuevoActivo}).eq('id',sbId);if(errUpd)toast('⚠ Error guardando estado: '+errUpd.message);}catch(e){toast('⚠ '+e.message);}}async function save(){
  if(!form.nombre.trim())return;
  const nombreFinal=normNombre(form.nombre);
  const partes=nombreFinal.split(' ').filter(Boolean);
  // Validar: exactamente 2 palabras, solo letras y espacios
  if(partes.length<2){toast('⚠ Ingresa NOMBRE y APELLIDO — dos palabras en mayúsculas');return;}
  if(partes.length>2){toast('⚠ Solo 1 nombre y 1 apellido — sin segundos nombres');return;}
  if(!/^[A-ZÁÉÍÓÚÜÑ ]+$/.test(nombreFinal)){toast('⚠ Solo letras mayúsculas, sin comas ni símbolos');return;}
  if(modal==='add'){
    const nid=Math.max(...mensajeros.map(m=>m.id))+1;
    setMensajeros(prev=>[...prev,{id:nid,nombre:nombreFinal,activo:true,tarifa:+form.tarifa,tarifaRetiro:+form.tarifaRetiro||500}]);
    try{await db.from('mensajeros').insert({nombre:nombreFinal,activo:true,tarifa:+form.tarifa,tarifa_retiro:+form.tarifaRetiro||500});}catch(e){}
    toast('✓ Mensajero '+nombreFinal+' agregado');
  }else{
    setMensajeros(prev=>prev.map(m=>m.id===modal?{...m,nombre:nombreFinal,tarifa:+form.tarifa,tarifaRetiro:+form.tarifaRetiro||500}:m));
    try{
      // Buscar en Supabase por nombre actual para obtener el id real
      const nombreActual=(mensajeros.find(m=>m.id===modal)?.nombre||'').replace(/,/g,'').replace(/\s+/g,' ').trim();
      const {data:rows}=await db.from('mensajeros').select('id').ilike('nombre','%'+nombreActual.split(' ')[0]+'%');
      const sbId=rows&&rows.length>0?rows[0].id:modal;
      const {error:errUpd}=await db.from('mensajeros').update({nombre:nombreFinal,tarifa:+form.tarifa,tarifa_retiro:+form.tarifaRetiro||500}).eq('id',sbId);
      if(errUpd)toast('⚠ Error: '+errUpd.message);
      else toast('✓ '+nombreFinal+' · $'+Number(form.tarifa).toLocaleString('es-CL')+'/entrega');
    }catch(e){toast('⚠ '+e.message);}
  }
  setModal(null);
}async function toggleRutaIA(id){const m=mensajeros.find(x=>x.id===id);const nuevo=!m.optimizacionRutaActiva;setMensajeros(prev=>prev.map(x=>x.id===id?{...x,optimizacionRutaActiva:nuevo}:x));toast(`Ruta ${nuevo?'activada':'desactivada'} para ${m.nombre}`);try{const nombreActual=(m.nombre||'').replace(/,/g,'').replace(/\s+/g,' ').trim();const{data:rows}=await db.from('mensajeros').select('id').ilike('nombre','%'+nombreActual.split(' ')[0]+'%');const sbId=rows&&rows.length>0?rows[0].id:id;const{error:errUpd}=await db.from('mensajeros').update({optimizacion_ruta_activa:nuevo}).eq('id',sbId);if(errUpd)toast('⚠ Error guardando: '+errUpd.message);}catch(e){toast('⚠ '+e.message);}}function del(id){setMensajeros(prev=>prev.filter(m=>m.id!==id));toast('Mensajero eliminado');setConfirmDel(null);}return/*#__PURE__*/React.createElement("div",null,sinUsuario.length>0&&esAdmin&&/*#__PURE__*/React.createElement("div",{style:{background:'rgba(200,168,75,0.1)',border:'1px solid var(--gold-border)',borderRadius:10,padding:'12px 16px',marginBottom:14,fontSize:13,color:'var(--text)'}},"⚠ ",/*#__PURE__*/React.createElement("strong",null,sinUsuario.length)," mensajero",sinUsuario.length!==1?'s':''," no aparece",sinUsuario.length===1?'':'n'," aquí porque no tiene",sinUsuario.length===1?'':'n'," cuenta en Usuarios: ",sinUsuario.map(m=>m.nombre.replace(/,\s*/g,' ')).join(', '),". Crea su cuenta en Gestión de Usuarios (rol Rider) para que vuelva a aparecer."),/*#__PURE__*/React.createElement("div",{className:"section-head"},/*#__PURE__*/React.createElement("div",{className:"section-title"},"Gesti\xF3n ",/*#__PURE__*/React.createElement("span",null,"Mensajeros")),/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:8}},esAdmin&&/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:buscarDuplicados,disabled:buscandoDup},buscandoDup?'Buscando...':'Revisar Duplicados'),esAdmin&&/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setNotifTarget('all')},"📢 Aviso a Todos"),/*#__PURE__*/React.createElement("button",{className:"btn-add",onClick:()=>{setForm({nombre:'',tarifa:1800,tarifaRetiro:500});setModal('add');}},"+ Nuevo"))),/*#__PURE__*/React.createElement("div",{className:"stats-grid",style:{marginBottom:20}},[{label:'Total',val:mensajeros.length,cls:''},{label:'Activos',val:mensajeros.filter(m=>m.activo).length,cls:'green'},{label:'Pausados',val:mensajeros.filter(m=>!m.activo).length,cls:'red'}].map(s=>/*#__PURE__*/React.createElement("div",{key:s.label,className:"stat-card"},/*#__PURE__*/React.createElement("div",{className:"stat-label"},s.label),/*#__PURE__*/React.createElement("div",{className:`stat-value ${s.cls}`},s.val)))),/*#__PURE__*/React.createElement("div",{className:"toolbar"},/*#__PURE__*/React.createElement("input",{className:"search-box",placeholder:"Buscar mensajero...",value:search,onChange:e=>setSearch(e.target.value)}),['todos','activos','pausados'].map(f=>/*#__PURE__*/React.createElement("button",{key:f,className:`filter-btn ${filtro===f?'active':''}`,onClick:()=>setFiltro(f)},f.charAt(0).toUpperCase()+f.slice(1)))),/*#__PURE__*/React.createElement("div",{className:"table-wrap"},/*#__PURE__*/React.createElement("table",null,/*#__PURE__*/React.createElement("thead",null,/*#__PURE__*/React.createElement("tr",null,/*#__PURE__*/React.createElement("th",null,"Mensajero"),esAdmin&&/*#__PURE__*/React.createElement("th",null,"Tarifa"),/*#__PURE__*/React.createElement("th",null,"Hoy: Total"),/*#__PURE__*/React.createElement("th",null,"Hoy: Entregas"),/*#__PURE__*/React.createElement("th",null,"Efectividad"),/*#__PURE__*/React.createElement("th",null,"Estado"),esAdmin&&/*#__PURE__*/React.createElement("th",null,"Ruta"),/*#__PURE__*/React.createElement("th",null,"Acciones"))),/*#__PURE__*/React.createElement("tbody",null,filtrados.map(m=>{const s=statsMap[normNombre(m.nombre)];return/*#__PURE__*/React.createElement("tr",{key:m.id,className:m.activo?'':'paused'},/*#__PURE__*/React.createElement("td",{style:{fontWeight:600}},m.nombre,),esAdmin&&/*#__PURE__*/React.createElement("td",{className:"mono"},"$",fmt(m.tarifa)),/*#__PURE__*/React.createElement("td",{className:"mono"},s?s.total:'—'),/*#__PURE__*/React.createElement("td",{className:"mono",style:{color:'var(--success)'}},s?s.entregados:'—'),/*#__PURE__*/React.createElement("td",null,s?/*#__PURE__*/React.createElement(KpiBar,{value:s.ef}):/*#__PURE__*/React.createElement("span",{style:{color:'var(--text-soft)',fontSize:12}},"Sin datos")),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement(Badge,{type:m.activo?'active':'paused'},m.activo?'● Activo':'● Pausado')),esAdmin&&/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("button",{onClick:()=>toggleRutaIA(m.id),title:"Cobrable por mensajero",style:{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:20,border:'1px solid '+(m.optimizacionRutaActiva?'var(--success)':'var(--border)'),background:m.optimizacionRutaActiva?'rgba(46,125,79,0.1)':'#fff',cursor:'pointer',fontSize:11,fontWeight:700,color:m.optimizacionRutaActiva?'var(--success)':'var(--text-soft)'}},m.optimizacionRutaActiva?'● ON':'○ OFF')),/*#__PURE__*/React.createElement("td",{style:{display:'flex',gap:5}},/*#__PURE__*/React.createElement("button",{className:"action-btn btn-edit",onClick:()=>{setForm({nombre:m.nombre,tarifa:m.tarifa,tarifaRetiro:m.tarifaRetiro||500});setModal(m.id);}},"Editar"),/*#__PURE__*/React.createElement("button",{style:{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(200,168,75,0.4)',background:'rgba(200,168,75,0.08)',color:'var(--gold)',cursor:'pointer',fontSize:11,fontWeight:700},onClick:()=>setDocsMensajero(m)},"\uD83D\uDCC1 Docs"),esAdmin&&/*#__PURE__*/React.createElement("button",{style:{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(200,168,75,0.4)',background:'transparent',color:'var(--gold)',cursor:'pointer',fontSize:11,fontWeight:700},onClick:()=>setNotifTarget(m)},"📢"),/*#__PURE__*/React.createElement("button",{className:`action-btn ${m.activo?'btn-pause':'btn-resume'}`,onClick:()=>toggleEstado(m.id)},m.activo?'Pausar':'Activar'),/*#__PURE__*/React.createElement("button",{className:"action-btn btn-delete",onClick:()=>setConfirmDel(m.id)},"\u2715")));}),filtrados.length===0&&/*#__PURE__*/React.createElement("tr",null,/*#__PURE__*/React.createElement("td",{colSpan:7,className:"empty-state"},"Sin resultados"))))),modal&&/*#__PURE__*/React.createElement(Modal,{title:modal==='add'?'Nuevo Mensajero':'Editar Mensajero',onClose:()=>setModal(null)},
  /*#__PURE__*/React.createElement(PestanasMensajero,{
    form:form,setForm:setForm,modal:modal,esAdmin:esAdmin,
    save:save,onClose:()=>setModal(null),db:db,toast:toast,
    comunasRM:COMUNAS_RM_LIST
  })),confirmDel&&/*#__PURE__*/React.createElement(Modal,{title:"\xBFEliminar mensajero?",onClose:()=>setConfirmDel(null)},/*#__PURE__*/React.createElement("p",{style:{fontSize:13,color:'var(--text-mid)',marginBottom:24}},"Esta acci\xF3n no se puede deshacer. \xBFConfirmas eliminar este mensajero del sistema?"),/*#__PURE__*/React.createElement("div",{className:"modal-actions"},/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setConfirmDel(null)},"Cancelar"),/*#__PURE__*/React.createElement("button",{className:"btn-primary",style:{background:'var(--danger)',borderColor:'var(--danger)',color:'#fff'},onClick:()=>del(confirmDel)},"Eliminar"))),docsMensajero&&/*#__PURE__*/React.createElement(DocumentosMensajero,{mensajero:docsMensajero,toast:toast,onClose:()=>setDocsMensajero(null)}),grupoDuplicados&&/*#__PURE__*/React.createElement(Modal,{title:`${grupoDuplicados.length} nombre${grupoDuplicados.length>1?'s':''} duplicado${grupoDuplicados.length>1?'s':''}`,sub:"Elige qu\xE9 fila mantener en cada grupo. Las dem\xE1s se eliminan de Supabase (no se puede deshacer).",onClose:()=>setGrupoDuplicados(null),wide:true},grupoDuplicados.map(g=>/*#__PURE__*/React.createElement("div",{key:g.clave,style:{marginBottom:18,padding:14,background:'var(--cream)',borderRadius:8,border:'1px solid var(--border)'}},
    /*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:15,letterSpacing:1,color:'var(--dark)',marginBottom:8}},g.clave),
    g.filas.map(f=>/*#__PURE__*/React.createElement("label",{key:f.id,style:{display:'flex',alignItems:'center',gap:10,padding:'6px 8px',cursor:'pointer',borderRadius:6,background:g.keepId===f.id?'rgba(46,125,79,0.08)':'transparent'}},
      /*#__PURE__*/React.createElement("input",{type:"radio",name:'dup_'+g.clave,checked:g.keepId===f.id,onChange:()=>elegirKeep(g.clave,f.id)}),
      /*#__PURE__*/React.createElement("span",{style:{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-soft)'}},'id:',f.id),
      /*#__PURE__*/React.createElement("span",{style:{fontSize:13}},'Tarifa $',(f.tarifa||0).toLocaleString('es-CL')),
      /*#__PURE__*/React.createElement("span",{style:{fontSize:11,color:f.activo?'var(--success)':'var(--danger)'}},f.activo?'\u25CF Activo':'\u25CF Pausado'),
      g.keepId===f.id?/*#__PURE__*/React.createElement("span",{style:{fontSize:11,color:'var(--success)',fontWeight:700,marginLeft:'auto'}},'\u2713 Se mantiene'):/*#__PURE__*/React.createElement("span",{style:{fontSize:11,color:'var(--danger)',marginLeft:'auto'}},'Se elimina')
    ))
  )),/*#__PURE__*/React.createElement("div",{className:"modal-actions"},/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setGrupoDuplicados(null)},"Cancelar"),/*#__PURE__*/React.createElement("button",{className:"btn-primary",style:{background:'var(--danger)',borderColor:'var(--danger)',color:'#fff'},disabled:procesandoDup,onClick:confirmarLimpiezaDuplicados},procesandoDup?'Eliminando...':'Confirmar y Eliminar Duplicados'))),notifTarget&&/*#__PURE__*/React.createElement(Modal,{title:'📢 Enviar Notificación',sub:notifTarget==='all'?'Se enviará a todos los mensajeros con notificaciones activadas.':`Se enviará solo a ${notifTarget.nombre.replace(/,\s*/g,' ')}.`,onClose:()=>{setNotifTarget(null);setNotifForm({title:'',message:''});}},
  /*#__PURE__*/React.createElement("div",{className:"form-group"},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Título"),/*#__PURE__*/React.createElement("input",{className:"form-input",placeholder:"Ej: Corte de colecta hoy",value:notifForm.title,onChange:e=>setNotifForm(f=>({...f,title:e.target.value}))})),
  /*#__PURE__*/React.createElement("div",{className:"form-group"},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Mensaje"),/*#__PURE__*/React.createElement("input",{className:"form-input",placeholder:"Ej: Se corta la colecta a las 15:00 por feria",value:notifForm.message,onChange:e=>setNotifForm(f=>({...f,message:e.target.value}))})),
  /*#__PURE__*/React.createElement("div",{className:"modal-actions"},/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>{setNotifTarget(null);setNotifForm({title:'',message:''});}},"Cancelar"),/*#__PURE__*/React.createElement("button",{className:"btn-primary",disabled:enviandoNotif||!notifForm.title.trim()||!notifForm.message.trim(),onClick:confirmarEnvioNotif},enviandoNotif?'Enviando...':'Enviar'))
));}
window.GestionMensajeros = GestionMensajeros;
})();
