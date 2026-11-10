(function(){
var useEffect=React.useEffect, useMemo=React.useMemo, useState=React.useState;
var Badge=window.__app.Badge, COMUNAS_RM_LIST=window.__app.COMUNAS_RM_LIST, KpiBar=window.__app.KpiBar, Modal=window.__app.Modal, PestanasMensajero=window.__app.PestanasMensajero, db=window.__app.db, enviarNotificacionPush=window.__app.enviarNotificacionPush, fmt=window.__app.fmt;
function GestionMensajeros(_ref15){let mensajerosProp=_ref15.mensajeros,setMensajeros=_ref15.setMensajeros,mensajerosDia=_ref15.mensajerosDia,toast=_ref15.toast,esAdmin=_ref15.esAdmin;
  const _usUsr=useState(null),usuariosRider=_usUsr[0],setUsuariosRider=_usUsr[1]; // null = aun cargando
  useEffect(()=>{
    db.from('usuarios_publico').select('mensajero_id,nombre,rol').eq('rol','rider').then(res=>{
      if(res.data)setUsuariosRider(res.data);
      else setUsuariosRider([]);
    }).catch(()=>setUsuariosRider([]));
  },[]);
  // idsConUsuario/nombresConUsuario: qué mensajeros están vinculados a una cuenta en
  // Gestión de Usuarios. Si lo están, el nombre se administra allá (no acá) — ver tieneUsuario().
  const _idsCU=useMemo(()=>new Set((usuariosRider||[]).map(u=>u.mensajero_id).filter(Boolean)),[usuariosRider]);
  const _nomCU=useMemo(()=>new Set((usuariosRider||[]).map(u=>(u.nombre||'').trim().toUpperCase())),[usuariosRider]);
  function tieneUsuario(m){
    if(usuariosRider===null)return false;
    return _idsCU.has(m.id)||_nomCU.has((m.nombre||'').trim().toUpperCase());
  }
  const mensajeros=useMemo(()=>{
    if(usuariosRider===null)return mensajerosProp; // mientras carga, no ocultar nada (evita parpadeo/perdida momentanea)
    return mensajerosProp.filter(m=>_idsCU.has(m.id)||_nomCU.has((m.nombre||'').trim().toUpperCase()));
  },[mensajerosProp,usuariosRider,_idsCU,_nomCU]);
  const sinUsuario=useMemo(()=>{
    if(usuariosRider===null)return[];
    return mensajerosProp.filter(m=>!_idsCU.has(m.id)&&!_nomCU.has((m.nombre||'').trim().toUpperCase()));
  },[mensajerosProp,usuariosRider,_idsCU,_nomCU]);
  const _useState25=useState(''),search=_useState25[0],setSearch=_useState25[1];const _useState26=useState('todos'),filtro=_useState26[0],setFiltro=_useState26[1];const _useState27=useState(null),modal=_useState27[0],setModal=_useState27[1];const _useState28=useState({nombre:'',tarifa:1200}),form=_useState28[0],setForm=_useState28[1];const _useState29=useState(null),confirmDel=_useState29[0],setConfirmDel=_useState29[1];
const _usVP=useState(false),verPausados=_usVP[0],setVerPausados=_usVP[1];const _usOrd=useState('nombre'),orden=_usOrd[0],setOrden=_usOrd[1];
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
const filtrados=mensajeros.filter(m=>m.nombre.toLowerCase().includes(search.toLowerCase())&&(filtro==='todos'||filtro==='activos'&&m.activo||filtro==='pausados'&&!m.activo)).sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));const normNombre=n=>(n||'').toUpperCase().replace(/,/g,'').replace(/\s+/g,' ').trim();const statsMap={};mensajerosDia.forEach(m=>{if(m.total>0)statsMap[normNombre(m.nombre)]={ef:m.entregados/m.total,total:m.total,entregados:m.entregados};});async function toggleEstado(id){const m=mensajeros.find(x=>x.id===id);const nuevoActivo=!m.activo;if(!nuevoActivo&&!window.confirm('¿Pausar a '+m.nombre+'? Dejará de aparecer en el sistema y no podrá entrar a su app hasta que lo actives.'))return;setMensajeros(prev=>prev.map(x=>x.id===id?{...x,activo:nuevoActivo}:x));toast(`${m.nombre} ${nuevoActivo?'activado: ya puede entrar a su app':'pausado: se cerró su acceso a la app'}`);try{const{error:errUpd}=await db.from('mensajeros').update({activo:nuevoActivo}).eq('id',id);if(errUpd)toast('⚠ Error guardando estado: '+errUpd.message);}catch(e){toast('⚠ '+e.message);}}async function save(){
  if(!form.nombre.trim())return;
  const nombreFinal=normNombre(form.nombre);
  // Sin restricción de cantidad de palabras ni de caracteres: se permite cualquier nombre o código
  // (ej. "TODO ENVIO", "BODEGA COLINA", apodos, un solo nombre, etc.). Solo se exige que no quede vacío.
  if(!nombreFinal){toast('⚠ Ingresa un nombre');return;}
  if(modal==='add'){
    try{
      const{data:inserted,error:errIns}=await db.from('mensajeros').insert({nombre:nombreFinal,activo:true,tarifa:+form.tarifa,tarifa_retiro:+form.tarifaRetiro||500,extra_periferia:+form.extraPeriferia||0,ver_ganancias:false,colecta_habilitada:false}).select().single();
      if(errIns){toast('⚠ Error: '+errIns.message);}
      else{
        setMensajeros(prev=>[...prev,{...inserted,id:inserted.id,nombre:nombreFinal,activo:true,tarifa:+form.tarifa,tarifaRetiro:+form.tarifaRetiro||500,extra_periferia:+form.extraPeriferia||0}].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es')));
        toast('✓ Mensajero '+nombreFinal+' agregado');
      }
    }catch(e){toast('⚠ '+e.message);}
  }else{
    setMensajeros(prev=>prev.map(m=>m.id===modal?{...m,nombre:nombreFinal,tarifa:+form.tarifa,tarifaRetiro:+form.tarifaRetiro||500,extra_periferia:+form.extraPeriferia||0}:m));
    try{
      const {error:errUpd}=await db.from('mensajeros').update({nombre:nombreFinal,tarifa:+form.tarifa,tarifa_retiro:+form.tarifaRetiro||500,extra_periferia:+form.extraPeriferia||0}).eq('id',modal);
      if(errUpd)toast('⚠ Error: '+errUpd.message);
      else toast('✓ '+nombreFinal+' · $'+Number(form.tarifa).toLocaleString('es-CL')+'/entrega');
    }catch(e){toast('⚠ '+e.message);}
  }
  setModal(null);
}async function toggleRutaIA(id){const m=mensajeros.find(x=>x.id===id);const nuevo=!m.optimizacionRutaActiva;setMensajeros(prev=>prev.map(x=>x.id===id?{...x,optimizacionRutaActiva:nuevo}:x));toast(`Ruta ${nuevo?'activada':'desactivada'} para ${m.nombre}`);try{const{error:errUpd}=await db.from('mensajeros').update({optimizacion_ruta_activa:nuevo}).eq('id',id);if(errUpd)toast('⚠ Error guardando: '+errUpd.message);}catch(e){toast('⚠ '+e.message);}}async function toggleVerGanancias(id){const m=mensajeros.find(x=>x.id===id);const nuevo=!m.verGanancias;setMensajeros(prev=>prev.map(x=>x.id===id?{...x,verGanancias:nuevo}:x));toast(`Ganancias ${nuevo?'visibles':'ocultas'} para ${m.nombre}`);try{const{error:errUpd}=await db.from('mensajeros').update({ver_ganancias:nuevo}).eq('id',id);if(errUpd)toast('⚠ Error guardando: '+errUpd.message);}catch(e){toast('⚠ '+e.message);}}async function toggleColectaHabilitada(id){const m=mensajeros.find(x=>x.id===id);const nuevo=!m.colectaHabilitada;setMensajeros(prev=>prev.map(x=>x.id===id?{...x,colectaHabilitada:nuevo}:x));toast(`Colecta ${nuevo?'activada':'desactivada'} para ${m.nombre}`);try{const{error:errUpd}=await db.from('mensajeros').update({colecta_habilitada:nuevo}).eq('id',id);if(errUpd)toast('⚠ Error guardando: '+errUpd.message);}catch(e){toast('⚠ '+e.message);}}async function toggleGananciasTodos(){const nuevo=!mensajeros.every(m=>m.verGanancias);const ids=mensajeros.map(m=>m.id);setMensajeros(prev=>prev.map(x=>ids.includes(x.id)?{...x,verGanancias:nuevo}:x));toast(nuevo?'💰 Ganancias visibles para todos los mensajeros':'🙈 Ganancias ocultas para todos los mensajeros');try{const{error:errUpd}=await db.from('mensajeros').update({ver_ganancias:nuevo}).in('id',ids);if(errUpd)toast('⚠ Error guardando: '+errUpd.message);}catch(e){toast('⚠ '+e.message);}}async function del(id){setMensajeros(prev=>prev.filter(m=>m.id!==id));toast('Mensajero eliminado');setConfirmDel(null);try{const{error:errDel}=await db.from('mensajeros').delete().eq('id',id);if(errDel)toast('⚠ No se pudo eliminar en la base: '+errDel.message);}catch(e){toast('⚠ '+e.message);}}return/*#__PURE__*/React.createElement("div",null,false&&/*#__PURE__*/React.createElement("div",{style:{background:'rgba(200,168,75,0.1)',border:'1px solid var(--gold-border)',borderRadius:10,padding:'12px 16px',marginBottom:14,fontSize:13,color:'var(--text)'}},"⚠ ",/*#__PURE__*/React.createElement("strong",null,sinUsuario.length)," mensajero",sinUsuario.length!==1?'s':''," no aparece",sinUsuario.length===1?'':'n'," aquí porque no tiene",sinUsuario.length===1?'':'n'," cuenta en Usuarios: ",sinUsuario.map(m=>m.nombre.replace(/,\s*/g,' ')).join(', '),". Crea su cuenta en Gestión de Usuarios (rol Rider) para que vuelva a aparecer."),(function(){
  // ── 10-11-2026: rediseño. Solo se listan mensajeros ACTIVOS; los pausados quedan en un acceso aparte para reactivarlos ──
  const h=React.createElement;
  const activosL=mensajeros.filter(m=>m.activo);
  const pausadosL=mensajeros.filter(m=>!m.activo).sort((x,y)=>(x.nombre||'').localeCompare(y.nombre||'','es'));
  const lista=activosL.filter(m=>(m.nombre||'').toLowerCase().includes(search.toLowerCase())).sort((x,y)=>{
    if(orden==='hoy'){const sx=statsMap[normNombre(x.nombre)],sy=statsMap[normNombre(y.nombre)];return (sy?sy.total:-1)-(sx?sx.total:-1);}
    if(orden==='ef'){const sx=statsMap[normNombre(x.nombre)],sy=statsMap[normNombre(y.nombre)];return (sy?sy.ef:-1)-(sx?sx.ef:-1);}
    return (x.nombre||'').localeCompare(y.nombre||'','es');});
  const conRuta=activosL.filter(m=>statsMap[normNombre(m.nombre)]).length;
  const totHoy=activosL.reduce((acc,m)=>{const st=statsMap[normNombre(m.nombre)];return st?{t:acc.t+st.total,e:acc.e+st.entregados}:acc;},{t:0,e:0});
  const efHoy=totHoy.t?totHoy.e/totHoy.t:null;
  const sinCuentaAct=sinUsuario.filter(m=>m.activo);
  const kpi=(lbl,val,col,sub)=>h('div',{key:lbl,style:{flex:'1 1 130px',minWidth:0,padding:'12px 14px',borderRadius:14,background:'linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.10)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.08)'}},
    h('div',{style:{fontSize:10,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(233,228,210,.66)',fontWeight:800}},lbl),
    h('div',{style:{fontFamily:'Bebas Neue',fontSize:34,lineHeight:1.05,color:col,textShadow:'0 0 16px '+col+'55'}},val),
    sub&&h('div',{style:{fontSize:11,color:'rgba(233,228,210,.66)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},sub));
  const btnOsc=(txt,fn,dis,gold)=>h('button',{type:'button',onClick:fn,disabled:dis,className:'gm-btn',style:{padding:'9px 14px',borderRadius:11,cursor:dis?'default':'pointer',fontWeight:800,fontSize:12,letterSpacing:.4,whiteSpace:'nowrap',border:'1px solid '+(gold?'#f7dd8c':'rgba(232,199,102,.35)'),background:gold?'linear-gradient(180deg,#f7dd8c,#d9b553 50%,#ae8829)':'linear-gradient(180deg,#43482f,#2b2e20 60%,#22251a)',color:gold?'#1a1d13':'#f0d27a',boxShadow:gold?'0 3px 0 #6d531a,0 8px 16px rgba(200,168,75,.3)':'0 3px 0 #0f110a,0 8px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.1)',opacity:dis?.6:1}},txt);
  const sw=(on,fn,titulo)=>h('button',{type:'button',onClick:fn,title:titulo,className:'gm-sw'+(on?' on':''),'aria-pressed':on},h('span',{className:'gm-knob'}));
  const ini=n=>String(n||'').replace(/,/g,' ').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('');
  const PALM=['#c8a84b','#4f8f6b','#4a78b8','#b8664a','#7f5fb8','#b84a7a','#3f9a96','#9a7a2f'];
  const colorDe=n=>{let x=0;String(n||'').split('').forEach(c=>{x=(x*31+c.charCodeAt(0))>>>0;});return PALM[x%PALM.length];};
  const ordBtn=(v,l)=>h('button',{type:'button',onClick:()=>setOrden(v),style:{padding:'7px 12px',borderRadius:10,cursor:'pointer',fontSize:11.5,fontWeight:800,border:'1px solid '+(orden===v?'#c8a84b':'rgba(43,46,32,.15)'),background:orden===v?'linear-gradient(180deg,#f7dd8c,#d9b553)':'#fff',color:orden===v?'#1a1d13':'#4a4d3a',boxShadow:orden===v?'0 2px 0 #8a6a20':'0 2px 0 rgba(43,46,32,.12)'}},l);
  const th={padding:'11px 12px',textAlign:'left',fontSize:10.5,letterSpacing:1.3,textTransform:'uppercase',color:'#e8c766',fontWeight:800,whiteSpace:'nowrap',background:'linear-gradient(180deg,#2f3322,#22251a)'};
  const td={padding:'10px 12px',borderBottom:'1px solid rgba(43,46,32,.08)',fontSize:13,verticalAlign:'middle'};
  return h('div',null,
    h('style',null,'.gm-btn{transition:transform .12s ease,filter .12s ease}.gm-btn:hover{transform:translateY(-1px);filter:brightness(1.08)}.gm-btn:active{transform:translateY(1px)}'+
      '.gm-sw{position:relative;width:46px;height:26px;border-radius:999px;border:1px solid rgba(43,46,32,.18);background:linear-gradient(180deg,#e6e1d2,#f4f0e4);box-shadow:inset 0 2px 4px rgba(0,0,0,.15);cursor:pointer;transition:all .18s ease;padding:0;flex-shrink:0}'+
      '.gm-sw .gm-knob{position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:linear-gradient(180deg,#fff,#e9e6dc);box-shadow:0 2px 4px rgba(0,0,0,.25);transition:left .18s ease}'+
      '.gm-sw.on{background:linear-gradient(180deg,#2fa868,#3fc27c);border-color:#2a9a5e;box-shadow:inset 0 2px 4px rgba(0,0,0,.18),0 0 10px rgba(63,194,124,.35)}.gm-sw.on .gm-knob{left:22px}'+
      '.gm-row{transition:background .12s ease}.gm-row:hover{background:rgba(232,199,102,.08)!important}'+
      '.gm-act{display:inline-flex;align-items:center;justify-content:center;height:32px;min-width:32px;padding:0 11px;border-radius:9px;cursor:pointer;font-size:11.5px;font-weight:800;letter-spacing:.3px;transition:transform .12s ease}.gm-act:hover{transform:translateY(-1px)}'),
    h('div',{style:{position:'relative',borderRadius:20,overflow:'hidden',background:'radial-gradient(120% 90% at 30% 0%,#3a3f2b 0%,#22261a 45%,#14170f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 24px 50px rgba(20,22,15,.30), inset 0 1px 0 rgba(255,255,255,.08)',color:'#e9e4d2',padding:'16px 20px 18px',marginBottom:16}},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap',marginBottom:14}},
        h('div',null,
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:2.2,color:'#fff',lineHeight:1}},'Gestión ',h('span',{style:{color:'#e8c766'}},'Mensajeros')),
          h('div',{style:{fontSize:12,color:'rgba(233,228,210,.7)',marginTop:4}},'Equipo activo, permisos de la app y desempeño de hoy')),
        esAdmin&&h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
          btnOsc(buscandoDup?'Buscando...':'Revisar duplicados',buscarDuplicados,buscandoDup),
          btnOsc('Aviso a todos',()=>setNotifTarget('all')),
          btnOsc(activosL.length&&activosL.every(m=>m.verGanancias)?'Ocultar ganancias a todos':'Mostrar ganancias a todos',toggleGananciasTodos),
          pausadosL.length>0&&btnOsc('Pausados ('+pausadosL.length+')',()=>setVerPausados(true),false,true))),
      h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
        kpi('Activos',activosL.length,'#e8c766','mensajeros habilitados'),
        kpi('Con ruta hoy',conRuta,'#5aa9ff',activosL.length?Math.round(conRuta/activosL.length*100)+'% del equipo':''),
        kpi('Paquetes hoy',totHoy.t.toLocaleString('es-CL'),'#f0b94a','asignados al equipo'),
        kpi('Entregados hoy',totHoy.e.toLocaleString('es-CL'),'#36c47f',efHoy!=null?'efectividad '+(efHoy*100).toFixed(1)+'%':'sin datos aún'),
        kpi('Con colecta',activosL.filter(m=>m.colectaHabilitada).length,'#b38bff','pueden usar Colecta'),
        kpi('Ven ganancias',activosL.filter(m=>m.verGanancias).length,'#ff8a5c','pestaña Ganancias'))),
    sinCuentaAct.length>0&&esAdmin&&h('div',{style:{display:'flex',gap:10,alignItems:'flex-start',padding:'11px 14px',marginBottom:14,borderRadius:12,background:'linear-gradient(135deg,rgba(240,185,74,.14),rgba(240,185,74,.05))',border:'1px solid rgba(240,185,74,.45)',fontSize:12.5,color:'#4a3a10'}},
      h('span',{style:{flexShrink:0,width:22,height:22,borderRadius:'50%',background:'#f0b94a',color:'#1a1d13',fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}},'!'),
      h('div',null,h('strong',null,sinCuentaAct.length+' activo'+(sinCuentaAct.length!==1?'s':'')+' sin cuenta de usuario: '),sinCuentaAct.map(m=>m.nombre.replace(/,\s*/g,' ')).join(', '),'. Créales cuenta en Gestión de Usuarios (rol Rider) para que aparezcan aquí.')),
    h('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:12}},
      h('input',{placeholder:'Buscar mensajero...',value:search,onChange:e=>setSearch(e.target.value),style:{flex:'1 1 240px',minWidth:0,padding:'11px 14px',borderRadius:12,border:'1px solid rgba(200,168,75,.35)',background:'linear-gradient(180deg,#fff,#fbf7ec)',boxShadow:'inset 0 1px 3px rgba(43,46,32,.08)',fontSize:13}}),
      h('span',{style:{fontSize:11,fontWeight:800,letterSpacing:1,textTransform:'uppercase',color:'var(--text-soft)'}},'Ordenar'),
      ordBtn('nombre','Nombre'),ordBtn('hoy','Paquetes hoy'),ordBtn('ef','Efectividad')),
    h('div',{style:{borderRadius:16,overflow:'auto',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 14px 30px rgba(43,46,32,0.10), 0 2px 6px rgba(43,46,32,0.06)',background:'#fff'}},
      h('table',{style:{width:'100%',borderCollapse:'collapse',minWidth:esAdmin?980:640}},
        h('thead',null,h('tr',null,
          h('th',{style:th},'Mensajero'),esAdmin&&h('th',{style:th},'Tarifa'),h('th',{style:th},'Hoy'),h('th',{style:Object.assign({},th,{minWidth:170})},'Efectividad hoy'),
          esAdmin&&h('th',{style:Object.assign({},th,{textAlign:'center'})},'Ruta'),esAdmin&&h('th',{style:Object.assign({},th,{textAlign:'center'})},'Ganancias'),esAdmin&&h('th',{style:Object.assign({},th,{textAlign:'center'})},'Colecta'),
          h('th',{style:Object.assign({},th,{textAlign:'right'})},'Acciones'))),
        h('tbody',null,lista.map((m,i)=>{const st=statsMap[normNombre(m.nombre)];const ef=st?st.ef:null;const efc=ef==null?'#b9b5a5':ef>=0.95?'#2e9d5f':ef>=0.85?'#d39a1c':'#c0392b';const c=colorDe(m.nombre);
          return h('tr',{key:m.id,className:'gm-row',style:{background:i%2?'#fcfaf4':'#fff'}},
            h('td',{style:td},h('div',{style:{display:'flex',alignItems:'center',gap:10}},
              h('div',{style:{width:36,height:36,borderRadius:11,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:13,color:'#fff',background:'linear-gradient(160deg,'+c+','+c+'bb)',boxShadow:'0 4px 10px '+c+'55, inset 0 1px 0 rgba(255,255,255,.35)'}},ini(m.nombre)),
              h('div',{style:{minWidth:0}},h('div',{style:{fontWeight:800,color:'#2b2e20',whiteSpace:'nowrap'}},m.nombre.replace(/,\s*/g,' ')),
                h('div',{style:{fontSize:11,color:st?'#2e7d4f':'var(--text-soft)',fontWeight:700}},st?'En ruta hoy':'Sin ruta hoy')))),
            esAdmin&&h('td',{style:Object.assign({},td,{fontFamily:'JetBrains Mono',fontWeight:700})},'$'+fmt(m.tarifa)),
            h('td',{style:Object.assign({},td,{whiteSpace:'nowrap'})},st?h('span',null,h('b',{style:{fontFamily:'Bebas Neue',fontSize:20,color:'#2e7d4f'}},st.entregados),h('span',{style:{color:'var(--text-soft)',fontWeight:700}},' / '+st.total)):h('span',{style:{color:'var(--text-soft)'}},'—')),
            h('td',{style:td},ef==null?h('span',{style:{color:'var(--text-soft)',fontSize:12}},'Sin datos'):h('div',{style:{display:'flex',alignItems:'center',gap:8}},
              h('div',{style:{flex:1,height:10,borderRadius:6,background:'rgba(43,46,32,.08)',overflow:'hidden',boxShadow:'inset 0 1px 2px rgba(0,0,0,.12)'}},h('div',{style:{width:Math.max(3,ef*100)+'%',height:'100%',borderRadius:6,background:'linear-gradient(180deg,'+efc+'cc,'+efc+')',boxShadow:'0 0 8px '+efc+'66'}})),
              h('span',{style:{fontFamily:'Bebas Neue',fontSize:18,color:efc,minWidth:48,textAlign:'right'}},(ef*100).toFixed(1)+'%'))),
            esAdmin&&h('td',{style:Object.assign({},td,{textAlign:'center'})},sw(!!m.optimizacionRutaActiva,()=>toggleRutaIA(m.id),'Optimizar ruta (cobrable por mensajero)')),
            esAdmin&&h('td',{style:Object.assign({},td,{textAlign:'center'})},sw(!!m.verGanancias,()=>toggleVerGanancias(m.id),'Puede ver la pestaña Ganancias en su app')),
            esAdmin&&h('td',{style:Object.assign({},td,{textAlign:'center'})},sw(!!m.colectaHabilitada,()=>toggleColectaHabilitada(m.id),'Puede usar Colecta en su app')),
            h('td',{style:Object.assign({},td,{textAlign:'right',whiteSpace:'nowrap'})},
              h('button',{className:'gm-act',onClick:()=>{setForm({nombre:m.nombre,tarifa:m.tarifa,tarifaRetiro:m.tarifaRetiro||500,extraPeriferia:m.extra_periferia||0,bloqueadoNombre:tieneUsuario(m)});setModal(m.id);},style:{border:'1px solid #f7dd8c',background:'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)',color:'#1a1d13',boxShadow:'0 2px 0 #6d531a',marginRight:6}},'Editar'),
              esAdmin&&h('button',{className:'gm-act',title:'Enviar aviso a este mensajero',onClick:()=>setNotifTarget(m),style:{border:'1px solid rgba(43,46,32,.18)',background:'#fff',color:'#4a4d3a',boxShadow:'0 2px 0 rgba(43,46,32,.15)',marginRight:6}},'Aviso'),
              h('button',{className:'gm-act',onClick:()=>toggleEstado(m.id),style:{border:'1px solid #c0392b',background:'linear-gradient(180deg,#e2574c,#b8352a)',color:'#fff',boxShadow:'0 2px 0 #7a2018',marginRight:6}},'Pausar'),
              h('button',{className:'gm-act',title:'Eliminar',onClick:()=>setConfirmDel(m.id),style:{border:'1px solid rgba(192,57,43,.35)',background:'#fff',color:'#c0392b',boxShadow:'0 2px 0 rgba(192,57,43,.2)',padding:0}},h('svg',{width:14,height:14,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2.4,strokeLinecap:'round'},h('path',{d:'M6 6l12 12M18 6L6 18'})))));
        }),
        lista.length===0&&h('tr',null,h('td',{colSpan:9,style:{padding:30,textAlign:'center',color:'var(--text-soft)'}},'Sin resultados'))))),
    verPausados&&h(Modal,{title:'Mensajeros pausados',sub:'No aparecen en ninguna lista del sistema y no pueden entrar a su app. Actívalos para devolverles el acceso.',onClose:()=>setVerPausados(false),wide:true},
      pausadosL.length===0?h('div',{className:'empty-state'},'No hay mensajeros pausados.'):
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:8,maxHeight:'60vh',overflowY:'auto'}},pausadosL.map(m=>h('div',{key:m.id,style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'9px 12px',borderRadius:10,border:'1px solid var(--border)',background:'var(--cream)'}},
        h('span',{style:{fontWeight:700,fontSize:12.5}},m.nombre.replace(/,\s*/g,' ')),
        h('button',{className:'gm-act',onClick:()=>toggleEstado(m.id),style:{border:'1px solid #2a9a5e',background:'linear-gradient(180deg,#3fc27c,#2a9a5e)',color:'#fff',boxShadow:'0 2px 0 #1d6b41'}},'Activar'))))),
modal&&/*#__PURE__*/React.createElement(Modal,{title:modal==='add'?'Nuevo Mensajero':'Editar Mensajero',onClose:()=>setModal(null)},
  /*#__PURE__*/React.createElement(PestanasMensajero,{
    form:form,setForm:setForm,modal:modal,esAdmin:esAdmin,
    save:save,onClose:()=>setModal(null),db:db,toast:toast,
    comunasRM:COMUNAS_RM_LIST
  })),confirmDel&&/*#__PURE__*/React.createElement(Modal,{title:"\xBFEliminar mensajero?",onClose:()=>setConfirmDel(null)},/*#__PURE__*/React.createElement("p",{style:{fontSize:13,color:'var(--text-mid)',marginBottom:24}},"Esta acci\xF3n no se puede deshacer. \xBFConfirmas eliminar este mensajero del sistema?"),/*#__PURE__*/React.createElement("div",{className:"modal-actions"},/*#__PURE__*/React.createElement("button",{className:"btn-secondary",onClick:()=>setConfirmDel(null)},"Cancelar"),/*#__PURE__*/React.createElement("button",{className:"btn-primary",style:{background:'var(--danger)',borderColor:'var(--danger)',color:'#fff'},onClick:()=>del(confirmDel)},"Eliminar"))),grupoDuplicados&&/*#__PURE__*/React.createElement(Modal,{title:`${grupoDuplicados.length} nombre${grupoDuplicados.length>1?'s':''} duplicado${grupoDuplicados.length>1?'s':''}`,sub:"Elige qu\xE9 fila mantener en cada grupo. Las dem\xE1s se eliminan de Supabase (no se puede deshacer).",onClose:()=>setGrupoDuplicados(null),wide:true},grupoDuplicados.map(g=>/*#__PURE__*/React.createElement("div",{key:g.clave,style:{marginBottom:18,padding:14,background:'var(--cream)',borderRadius:8,border:'1px solid var(--border)'}},
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
))})());}
window.GestionMensajeros = GestionMensajeros;
})();
