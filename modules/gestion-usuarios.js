(function(){
var useEffect=React.useEffect, useState=React.useState;
var Badge=window.__app.Badge, Modal=window.__app.Modal, db=window.__app.db, normNombre=window.__app.normNombre, sbSelect=window.__app.sbSelect, DocumentosMensajero=window.__app.DocumentosMensajero;
function GestionUsuarios(_ref13){let toast=_ref13.toast,esAdmin=_ref13.esAdmin,esSuperAdmin=_ref13.esSuperAdmin;const _useState13=useState([]),usuarios=_useState13[0],setUsuarios=_useState13[1];const _useState14=useState(true),loading=_useState14[0],setLoading=_useState14[1];const _useState15=useState(false),showForm=_useState15[0],setShowForm=_useState15[1];const _useState16=useState(null),editando=_useState16[0],setEditando=_useState16[1];const _useState17=useState({nombre:'',email:'',clave:'123456',rol:'operador',activo:true,mensajero_id:''}),form=_useState17[0],setForm=_useState17[1];const _useState18=useState(false),guardando=_useState18[0],setGuardando=_useState18[1];const _useState19=useState(''),buscar=_useState19[0],setBuscar=_useState19[1];const _useFR=useState('todos'),filtroRol=_useFR[0],setFiltroRol=_useFR[1];useEffect(()=>{cargarUsuarios();},[]);async function cargarUsuarios(){setLoading(true);try{const{data,error}=await db.from('usuarios_publico').select('id,nombre,email,rol,activo,foto_url,mensajero_id,created_at,cliente_nombre');if(!error&&data)setUsuarios(data);}catch(e){console.warn(e);}setLoading(false);}function abrirNuevo(){setForm({nombre:'',email:'',clave:'123456',rol:'operador',activo:true,mensajero_id:''});setEditando(null);setShowForm(true);}
// Ficha de mensajero (pagos) vinculada al usuario — se usa para el selector del formulario
// de Rider y para saber que ficha de 'mensajeros' hay que mantener sincronizada con este nombre.
const _msjMen=useState([]),mensajerosDb=_msjMen[0],setMensajerosDb=_msjMen[1];
useEffect(()=>{db.from('mensajeros').select('id,nombre,activo').order('nombre').then(({data})=>{if(data)setMensajerosDb(data);});},[]);
const _usDocU=useState(null),docsUsuario=_usDocU[0],setDocsUsuario=_usDocU[1];
// Estado modal clave
var _vcState=React.useState(null);var verClaveUser=_vcState[0];var setVerClaveUser=_vcState[1];
var _ncState=React.useState('');var nuevaClave=_ncState[0];var setNuevaClave=_ncState[1];

// supabase-js solo expone un mensaje generico ('Edge Function returned a non-2xx
// status code') cuando una Edge Function responde con error - el motivo real (ej.
// 'ese email ya esta en uso') viene en el cuerpo JSON de la respuesta, en error.context.
async function extraerErrorEdge(error){
  try{
    if(error&&error.context&&typeof error.context.json==='function'){
      const body=await error.context.json();
      if(body&&body.error)return body.error;
    }
  }catch(_e){}
  return(error&&error.message)||'Error desconocido';
}
function verClave(u){setVerClaveUser(u);setNuevaClave('');}

async function guardarNuevaClave(){
  if(!nuevaClave||nuevaClave.length<4){toast('⚠ Clave debe tener al menos 4 caracteres');return;}
  try{
    // Antes esto solo pisaba la columna 'clave' (texto) y el usuario NUNCA podia entrar
    // con la clave nueva, porque la contraseña real vive en Supabase Auth. Ahora se llama
    // a la Edge Function admin-users (usa permisos de servicio) para cambiarla de verdad.
    const{data,error}=await db.functions.invoke('admin-users',{body:{action:'reset_password',usuarioId:verClaveUser.id,nuevaClave}});
    if(error||(data&&data.error))throw new Error((data&&data.error)||await extraerErrorEdge(error));
    setUsuarios(function(prev){return prev.map(function(u){
      return u.id===verClaveUser.id?Object.assign({},u,{clave:nuevaClave}):u;
    });});
    toast('✓ Clave actualizada para '+verClaveUser.nombre+' — ya puede entrar con la clave nueva');
    setVerClaveUser(null);
    setNuevaClave('');
  }catch(e){toast('⚠ Error: '+e.message);}
}

// Gestión de Usuarios es la única fuente de verdad para el nombre de un rider.
// El resto del sistema (ficha de mensajero para tarifas, y el historial guardado como
// texto libre en otras tablas) se sincroniza automáticamente cada vez que se guarda un
// cambio de nombre aquí — así el admin nunca tiene que ir a cambiarlo en varios lados.
async function sincronizarNombreMensajero(mensajeroId,nombreViejo,nombreNuevo){
  if(!mensajeroId) return;
  try{
    await db.from('mensajeros').update({nombre:nombreNuevo}).eq('id',mensajeroId);
    if(nombreViejo && nombreViejo!==nombreNuevo){
      const tablasTexto=[
        ['envios','mensajero'],
        ['colectas','mensajero'],
        ['notificaciones','mensajero'],
        ['retiros','mensajero'],
        ['ubicaciones_mensajeros','mensajero'],
        ['ayudas','mensajero'],
        ['cierres_semanales','mensajero_nombre'],
        ['prestamos_mensajeros','mensajero_nombre'],
        ['tarifas_comunas','mensajero_nombre'],
        ['asignaciones_mapa','mensajero_nombre']
      ];
      for(const[tabla,col]of tablasTexto){
        await db.from(tabla).update({[col]:nombreNuevo}).eq(col,nombreViejo);
      }
    }
  }catch(e){
    toast('⚠ El usuario se guardó, pero no se pudo sincronizar el nombre en el resto del sistema: '+e.message);
  }
}
function abrirEditar(u){if(u.rol==='superadmin'&&!esSuperAdmin){toast('Solo el Super Admin puede editar a otro Super Admin');return;}setForm({nombre:u.nombre,email:u.email,clave:'',rol:u.rol,activo:u.activo,mensajero_id:u.mensajero_id||''});setEditando(u);setShowForm(true);}async function guardar(){if(!form.nombre||!form.email||(!editando&&!form.clave)){toast('⚠ Completa nombre, email y clave');return;}if(!form.email.includes('@')){toast('⚠ Email inválido');return;}if(form.rol==='superadmin'&&!esSuperAdmin){toast('No puedes asignar el rol Super Admin');return;}if(editando&&editando.rol==='superadmin'&&!esSuperAdmin){toast('Solo el Super Admin puede modificar a otro Super Admin');return;}setGuardando(true);try{
  const emailNuevo=form.email.toLowerCase().trim();
  if(editando){
    // Si es Rider y el admin dejó el selector de ficha en blanco (por ej. la desvinculó a
    // propósito), se crea una ficha nueva automáticamente en vez de dejarlo sin tarifas.
    let mensajeroIdFinal=form.mensajero_id||null;
    if(form.rol==='rider'&&!mensajeroIdFinal){
      const{data:nuevoM,error:errM}=await db.from('mensajeros').insert({nombre:normNombre(form.nombre),activo:true,tarifa:1800,tarifa_retiro:500}).select().single();
      if(errM)throw errM;
      mensajeroIdFinal=nuevoM.id;
    }
    // Datos de perfil (no-credenciales) se siguen guardando directo en la tabla
    const datosUpdate={nombre:normNombre(form.nombre),email:emailNuevo,rol:form.rol,activo:form.activo,mensajero_id:mensajeroIdFinal,cliente_nombre:form.cliente_nombre||null};
    const{error}=await db.from('usuarios').update(datosUpdate).eq('id',editando.id);
    if(error)throw error;
    // Email y clave SI son credenciales de acceso real (Supabase Auth) — van por la Edge Function
    if(emailNuevo!==(editando.email||'').toLowerCase().trim()){
      const{data:d1,error:e1}=await db.functions.invoke('admin-users',{body:{action:'update_email',usuarioId:editando.id,nuevoEmail:emailNuevo}});
      if(e1||(d1&&d1.error))throw new Error((d1&&d1.error)||await extraerErrorEdge(e1));
    }
    if(form.clave){
      const{data:d2,error:e2}=await db.functions.invoke('admin-users',{body:{action:'reset_password',usuarioId:editando.id,nuevaClave:form.clave}});
      if(e2||(d2&&d2.error))throw new Error((d2&&d2.error)||await extraerErrorEdge(e2));
    }
    // Sincronizar nombre con la ficha de mensajero (pagos) y con el historial guardado como
    // texto libre en el resto del sistema — Gestión de Usuarios manda, el resto se alinea solo.
    // El historial solo se reescribe si es la MISMA ficha de siempre (rename real); si se
    // vinculó o creó una ficha distinta, no se toca el historial de la ficha anterior.
    if(mensajeroIdFinal){
      const mismaFicha=editando.mensajero_id&&String(editando.mensajero_id)===String(mensajeroIdFinal);
      await sincronizarNombreMensajero(mensajeroIdFinal, mismaFicha?editando.nombre:null, datosUpdate.nombre);
    }
    toast('✓ Usuario actualizado');
  }else{
    // Si es Rider y no se vinculó una ficha de mensajero existente, se crea una nueva
    // automáticamente — así el admin no tiene que ir después a Gestión de Mensajeros a darla
    // de alta a mano, y el nombre nace ya sincronizado.
    let mensajeroIdFinal=form.mensajero_id||null;
    if(form.rol==='rider'&&!mensajeroIdFinal){
      const{data:nuevoM,error:errM}=await db.from('mensajeros').insert({nombre:normNombre(form.nombre),activo:true,tarifa:1800,tarifa_retiro:500}).select().single();
      if(errM)throw errM;
      mensajeroIdFinal=nuevoM.id;
    }else if(form.rol==='rider'&&mensajeroIdFinal){
      // Se vinculó una ficha existente (ej. un mensajero que ya tenía tarifas cargadas
      // pero aún no tenía cuenta) — se renombra para que quede igual al usuario nuevo.
      await sincronizarNombreMensajero(mensajeroIdFinal, null, normNombre(form.nombre));
    }
    // Alta de usuario: la Edge Function crea la cuenta REAL en Supabase Auth ademas de
    // la fila en 'usuarios' — antes esto solo insertaba la fila y el usuario nuevo
    // nunca podia loguearse.
    const{data,error}=await db.functions.invoke('admin-users',{body:{action:'create',nombre:form.nombre,email:emailNuevo,clave:form.clave,rol:form.rol,mensajero_id:mensajeroIdFinal,cliente_nombre:form.cliente_nombre||null}});
    if(error||(data&&data.error))throw new Error((data&&data.error)||await extraerErrorEdge(error));
    toast('✓ Usuario creado — ya puede entrar con su email y clave');
  }
  setShowForm(false);cargarUsuarios();
}catch(e){toast('⚠ Error: '+e.message);}setGuardando(false);}async function toggleActivo(u){try{await db.from('usuarios').update({activo:!u.activo}).eq('id',u.id);setUsuarios(prev=>prev.map(x=>x.id===u.id?{...x,activo:!u.activo}:x));toast(`Usuario ${!u.activo?'activado':'pausado'}`);}catch(e){toast('⚠ Error: '+e.message);}}async function eliminar(u){if(!window.confirm(`¿Eliminar usuario ${u.nombre}?`))return;try{await db.from('usuarios').delete().eq('id',u.id);setUsuarios(prev=>prev.filter(x=>x.id!==u.id));toast('Usuario eliminado');}catch(e){toast('⚠ Error: '+e.message);}}const ROLES=[{val:'superadmin',label:'Super Admin',color:'#b03030',desc:'Acceso total + eliminar datos'},{val:'admin',label:'Admin',color:'#C8A84B',desc:'Gestión operacional'},{val:'operador',label:'Operador',color:'#2e7d4f',desc:'Sin acceso a finanzas'},{val:'rider',label:'Rider',color:'#b07d10',desc:'Solo sus envíos asignados'},{val:'cliente',label:'Cliente',color:'#1a6b8a',desc:'Solo sus envíos y analítica'}];const usuariosFiltrados=usuarios.filter(u=>(filtroRol==='todos'||u.rol===filtroRol)&&(!buscar||u.nombre.toLowerCase().includes(buscar.toLowerCase())||u.email.toLowerCase().includes(buscar.toLowerCase())));
const idsMensajeroVinculados=new Set(usuarios.filter(u=>u.mensajero_id&&(!editando||u.id!==editando.id)).map(u=>u.mensajero_id));
const mensajerosDisponibles=mensajerosDb.filter(m=>!idsMensajeroVinculados.has(m.id));if(!esAdmin)return/*#__PURE__*/React.createElement("div",{style:{textAlign:'center',padding:'60px 20px'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:48,marginBottom:16}},"\uD83D\uDD10"),/*#__PURE__*/React.createElement("div",{style:{fontFamily:'Bebas Neue',fontSize:24,color:'var(--dark)',letterSpacing:2}},"Acceso Restringido"));return/*#__PURE__*/React.createElement("div",null,/*#__PURE__*/React.createElement("div",{className:"section-head"},/*#__PURE__*/React.createElement("div",{className:"section-title"},"Gesti\xF3n de ",/*#__PURE__*/React.createElement("span",null,"Usuarios")),/*#__PURE__*/React.createElement("button",{className:"btn-add",onClick:abrirNuevo},"+ Nuevo Usuario")),/*#__PURE__*/React.createElement("div",{className:"stats-grid",style:{marginBottom:20}},ROLES.map(r=>/*#__PURE__*/React.createElement("div",{key:r.val,className:"stat-card",onClick:()=>setFiltroRol(prev=>prev===r.val?'todos':r.val),style:{cursor:'pointer',border:filtroRol===r.val?`2px solid ${r.color}`:undefined}},/*#__PURE__*/React.createElement("div",{className:"stat-label"},r.label,"s"),/*#__PURE__*/React.createElement("div",{className:"stat-value",style:{color:r.color,fontSize:32}},usuarios.filter(u=>u.rol===r.val).length),/*#__PURE__*/React.createElement("div",{className:"stat-sub"},r.desc))),/*#__PURE__*/React.createElement("div",{className:"stat-card",onClick:()=>setFiltroRol('todos'),style:{cursor:'pointer',border:filtroRol==='todos'?'2px solid var(--gold)':undefined}},/*#__PURE__*/React.createElement("div",{className:"stat-label"},"Total"),/*#__PURE__*/React.createElement("div",{className:"stat-value"},usuarios.length),/*#__PURE__*/React.createElement("div",{className:"stat-sub"},usuarios.filter(u=>u.activo).length," activos"))),/*#__PURE__*/React.createElement("div",{className:"toolbar",style:{marginBottom:16}},/*#__PURE__*/React.createElement("input",{className:"search-box",placeholder:"Buscar por nombre o email...",value:buscar,onChange:e=>setBuscar(e.target.value)}),/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:cargarUsuarios},"\u21BA Actualizar")),loading?/*#__PURE__*/React.createElement("div",{className:"empty-state"},"Cargando usuarios..."):/*#__PURE__*/React.createElement("div",{className:"table-wrap"},/*#__PURE__*/React.createElement("table",null,/*#__PURE__*/React.createElement("thead",null,/*#__PURE__*/React.createElement("tr",null,/*#__PURE__*/React.createElement("th",null,"#"),/*#__PURE__*/React.createElement("th",null,"Nombre"),/*#__PURE__*/React.createElement("th",null,"Email"),/*#__PURE__*/React.createElement("th",null,"Rol"),/*#__PURE__*/React.createElement("th",null,"Clave"),/*#__PURE__*/React.createElement("th",null,"Estado"),/*#__PURE__*/React.createElement("th",null,"Acciones"))),/*#__PURE__*/React.createElement("tbody",null,usuariosFiltrados.map((u,i)=>{const rol=ROLES.find(r=>r.val===u.rol)||{label:u.rol,color:'#7a7d6a'};return/*#__PURE__*/React.createElement("tr",{key:u.id},/*#__PURE__*/React.createElement("td",{style:{textAlign:'center',fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-soft)',background:'var(--cream)',fontWeight:700}},i+1),/*#__PURE__*/React.createElement("td",{style:{fontWeight:700}},u.nombre),/*#__PURE__*/React.createElement("td",{style:{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text-mid)'}},u.email),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("span",{style:{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:`${rol.color}22`,color:rol.color}},rol.label)),/*#__PURE__*/React.createElement("td",{style:{fontFamily:'JetBrains Mono',fontSize:12,letterSpacing:2}},'••••••'),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement(Badge,{type:u.activo?'active':'paused'},u.activo?'● Activo':'● Inactivo')),/*#__PURE__*/React.createElement("td",null,/*#__PURE__*/React.createElement("div",{style:{display:'flex',gap:6}},u.rol==='superadmin'&&!esSuperAdmin?/*#__PURE__*/React.createElement("span",{style:{fontSize:10,color:'rgba(176,48,48,0.6)',padding:'4px 8px',border:'1px solid rgba(176,48,48,0.2)',borderRadius:6}},"Solo Super Admin"):[/*#__PURE__*/React.createElement("button",{key:'e',className:"action-btn btn-edit",onClick:()=>abrirEditar(u)},"Editar"),u.rol==='rider'&&/*#__PURE__*/React.createElement("button",{key:'docs',style:{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(200,168,75,0.4)',background:u.mensajero_id?'rgba(200,168,75,0.08)':'rgba(0,0,0,0.03)',color:u.mensajero_id?'var(--gold)':'var(--text-soft)',cursor:u.mensajero_id?'pointer':'not-allowed',fontSize:11,fontWeight:700},title:u.mensajero_id?'':'Vincula una ficha de mensajero (Editar) para poder subir documentos',disabled:!u.mensajero_id,onClick:()=>u.mensajero_id&&setDocsUsuario(u)},"\uD83D\uDCC1 Docs"),esSuperAdmin&&/*#__PURE__*/React.createElement("button",{key:'c',className:"action-btn",style:{background:"rgba(200,168,75,0.15)",color:"var(--gold)",border:"1px solid rgba(200,168,75,0.4)"},onClick:()=>verClave(u)},"\uD83D\uDD11 Clave"),/*#__PURE__*/React.createElement("button",{key:'a',className:`action-btn ${u.activo?'btn-pause':'btn-edit'}`,onClick:()=>toggleActivo(u)},u.activo?'Pausar':'Activar'),/*#__PURE__*/React.createElement("button",{key:'d',className:"action-btn btn-delete",onClick:()=>eliminar(u)},"\u2715")])));}),usuariosFiltrados.length===0&&/*#__PURE__*/React.createElement("tr",null,/*#__PURE__*/React.createElement("td",{colSpan:7,className:"empty-state"},"No hay usuarios registrados"))))),verClaveUser&&/*#__PURE__*/React.createElement(Modal,{title:'\uD83D\uDD11 Restablecer clave de '+verClaveUser.nombre,onClose:()=>setVerClaveUser(null)},/*#__PURE__*/React.createElement('div',{style:{marginBottom:16}},/*#__PURE__*/React.createElement('div',{style:{background:'var(--cream)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 16px',marginBottom:12}},/*#__PURE__*/React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}},'Usuario'),/*#__PURE__*/React.createElement('div',{style:{fontWeight:700,fontSize:14}},verClaveUser.nombre),/*#__PURE__*/React.createElement('div',{style:{fontSize:12,color:'var(--text-soft)'}},verClaveUser.email)),/*#__PURE__*/React.createElement('div',{className:'form-group'},/*#__PURE__*/React.createElement('label',{className:'form-label'},'Nueva clave'),/*#__PURE__*/React.createElement('input',{className:'form-input',type:'text',placeholder:'Escribe la nueva clave...',value:nuevaClave,onChange:function(e){setNuevaClave(e.target.value);},style:{fontFamily:'JetBrains Mono',letterSpacing:2,fontSize:14}}))),/*#__PURE__*/React.createElement('div',{className:'modal-actions'},/*#__PURE__*/React.createElement('button',{className:'btn-secondary',onClick:function(){setNuevaClave('123456');},style:{color:'#e67e22',border:'1px solid rgba(230,126,34,0.3)'}},'\u21BA Resetear a 123456'),/*#__PURE__*/React.createElement('button',{className:'btn-secondary',onClick:()=>setVerClaveUser(null)},'Cancelar'),/*#__PURE__*/React.createElement('button',{className:'btn-primary',onClick:guardarNuevaClave},'\uD83D\uDCBE Guardar clave'))),docsUsuario&&/*#__PURE__*/React.createElement(DocumentosMensajero,{mensajero:{id:docsUsuario.mensajero_id,nombre:docsUsuario.nombre},toast:toast,onClose:()=>setDocsUsuario(null)}),showForm&&/*#__PURE__*/React.createElement(Modal,{title:editando?`Editar: ${editando.nombre}`:'Nuevo Usuario',onClose:()=>setShowForm(false)},/*#__PURE__*/React.createElement("div",{style:{marginBottom:20}},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Rol del Usuario"),/*#__PURE__*/React.createElement("div",{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}},[...ROLES,...(esSuperAdmin?[{val:'superadmin',label:'Super Admin',color:'#b03030',desc:'Acceso total + eliminar datos'}]:[])].map(r=>/*#__PURE__*/React.createElement("button",{key:r.val,onClick:()=>setForm(f=>({...f,rol:r.val})),style:{padding:'12px 8px',borderRadius:10,border:`2px solid ${form.rol===r.val?r.color:'var(--border)'}`,background:form.rol===r.val?`${r.color}15`:'#fff',cursor:'pointer',textAlign:'center',transition:'all 0.15s'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:20,marginBottom:4}},r.val==='admin'?'🔐':r.val==='superadmin'?'👑':r.val==='operador'?'💼':r.val==='cliente'?'🏢':'🚴'),/*#__PURE__*/React.createElement("div",{style:{fontSize:12,fontWeight:700,color:form.rol===r.val?r.color:'var(--text)'}},r.label),/*#__PURE__*/React.createElement("div",{style:{fontSize:10,color:'var(--text-soft)',marginTop:2}},r.desc))))),/*#__PURE__*/React.createElement("div",{className:"form-row"},/*#__PURE__*/React.createElement("div",{className:"form-group"},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Nombre completo"),/*#__PURE__*/React.createElement("div",null,
  /*#__PURE__*/React.createElement("input",{className:"form-input",
    placeholder:"JUAN PEREZ",
    value:form.nombre,
    onChange:e=>{var v=e.target.value.toUpperCase().replace(/,/g,'').replace(/[^A-ZÁÉÍÓÚÜÑ ]/g,'');setForm(f=>({...f,nombre:v}));}
  }),
  /*#__PURE__*/React.createElement("div",{style:{marginTop:5,fontSize:11,fontWeight:700,
    color:form.nombre.trim().split(' ').filter(Boolean).length===2?'#2e7d4f':'#b03030'}},
    form.nombre.trim()===''?'Escribe NOMBRE APELLIDO en mayúsculas':
    form.nombre.trim().split(' ').filter(Boolean).length===1?'⚠ Falta el apellido':
    form.nombre.trim().split(' ').filter(Boolean).length===2?'✓ Correcto':
    '⚠ Solo 1 nombre y 1 apellido, sin comas'
  )
))),/*#__PURE__*/React.createElement("div",{className:"form-group"},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Email (se usa para entrar)"),/*#__PURE__*/React.createElement("input",{className:"form-input",type:"email",placeholder:"usuario@transpgso.cl",value:form.email,onChange:e=>setForm(f=>({...f,email:e.target.value}))})),/*#__PURE__*/React.createElement("div",{className:"form-row"},/*#__PURE__*/React.createElement("div",{className:"form-group"},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Contrase\xF1a"),/*#__PURE__*/React.createElement("input",{className:"form-input",placeholder:editando?"Dejar en blanco para mantener la actual":"M\xEDnimo 6 caracteres",value:form.clave,onChange:e=>setForm(f=>({...f,clave:e.target.value}))})),/*#__PURE__*/React.createElement("div",{className:"form-group"},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Estado"),/*#__PURE__*/React.createElement("select",{className:"form-input",value:form.activo?'true':'false',onChange:e=>setForm(f=>({...f,activo:e.target.value==='true'}))},/*#__PURE__*/React.createElement("option",{value:"true"},"Activo"),/*#__PURE__*/React.createElement("option",{value:"false"},"Pausado")))),form.rol==='cliente'&&/*#__PURE__*/React.createElement("div",{className:"form-group",style:{marginBottom:16}},
  /*#__PURE__*/React.createElement("label",{className:"form-label"},"Nombre del Cliente (debe coincidir exactamente)"),
  /*#__PURE__*/React.createElement("input",{className:"form-input",placeholder:"Ej: PBCLIS EXPRESS",value:form.cliente_nombre||'',onChange:e=>setForm(f=>({...f,cliente_nombre:e.target.value.toUpperCase()}))}),
  /*#__PURE__*/React.createElement("div",{style:{fontSize:11,color:'var(--text-soft)',marginTop:4}},"Este nombre debe coincidir con el campo Cliente en los envíos para que pueda ver su carga.")
),
form.rol==='rider'&&/*#__PURE__*/React.createElement("div",{className:"form-group",style:{marginBottom:16}},/*#__PURE__*/React.createElement("label",{className:"form-label"},"Ficha de pagos (mensajero)"),/*#__PURE__*/React.createElement("select",{className:"form-input",value:form.mensajero_id||'',onChange:e=>setForm(f=>({...f,mensajero_id:e.target.value}))},/*#__PURE__*/React.createElement("option",{value:""},editando&&editando.mensajero_id?'— Crear una ficha nueva (se deja de usar la actual) —':'— Crear una ficha nueva automáticamente —'),mensajerosDisponibles.map(m=>/*#__PURE__*/React.createElement("option",{key:m.id,value:m.id},m.nombre+(m.activo?'':' (pausado)')))),/*#__PURE__*/React.createElement("div",{style:{fontSize:11,color:'var(--text-soft)',marginTop:4}},"Ahí se configuran sus tarifas por entrega, retiro y comuna. Si dejas esta opción vacía se crea una ficha nueva automáticamente con el mismo nombre.")),form.rol==='rider'&&/*#__PURE__*/React.createElement("div",{className:"info-banner",style:{marginBottom:16}},"El Rider entrará al sistema con este email y clave, y ver\xE1 directamente su app m\xF3vil con sus env\xEDos asignados."),/*#__PURE__*/React.createElement("div",{className:"modal-actions"},/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setShowForm(false)},"Cancelar"),/*#__PURE__*/React.createElement("button",{className:"btn-primary",onClick:guardar,disabled:guardando},guardando?'Guardando...':editando?'Guardar Cambios':'Crear Usuario'))));}
window.GestionUsuarios = GestionUsuarios;
})();
