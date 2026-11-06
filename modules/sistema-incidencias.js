// Sistema → Listado de incidencias (06-11-2026)
// - Faltas del reglamento: catálogo editable (motivo, nivel, envíos de multa, activo). Se guarda en
//   configuracion.faltas_reglamento y reemplaza en caliente window.__app.CATALOGO_FALTAS_REGLAMENTO
//   (lo usan Reportar, Incidencias y Pagos Mensajeros). Solo Super Admin edita.
// - Motivos de reagenda (configuracion.motivos_reprogramacion) — antes en Gestión de Envíos.
// - Registro de acciones masivas (acciones_masivas_log) — antes en Gestión de Envíos.
(function(){
var A=window.__app||{};var db=A.db;var h=React.createElement,useState=React.useState,useEffect=React.useEffect;
var GRUPOS=['Leve','Grave','Crítica'];
var CG={'Leve':'#2e7d4f','Grave':'#d9822b','Crítica':'#b03030','Otro':'#5b5f4a'};
function fh(ts){try{return new Date(ts).toLocaleString('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});}catch(e){return '';}}
var card={background:'linear-gradient(160deg,#ffffff 0%,#fbf6ea 100%)',border:'1px solid rgba(200,168,75,0.35)',borderRadius:16,boxShadow:'0 14px 30px rgba(43,46,32,0.10), inset 0 1px 0 #fff',padding:'16px 18px'};
var inp={padding:'8px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,background:'#fff',boxSizing:'border-box'};
var btnOro={padding:'9px 18px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#c8a84b,#a87d2a)',color:'#1a1d13',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 6px 14px rgba(168,125,42,0.35)'};
var btnSec={padding:'7px 12px',borderRadius:8,border:'1px solid var(--border)',background:'#fff',color:'var(--text-mid)',fontWeight:700,fontSize:12,cursor:'pointer'};

// Aplica el catálogo guardado sobre el arreglo compartido (mismo objeto: todos los módulos lo ven).
function aplicarCatalogo(lista){
  var C=A.CATALOGO_FALTAS_REGLAMENTO;if(!C||!Array.isArray(lista)||!lista.length)return;
  var act=lista.filter(function(f){return f.activo!==false&&f.label;}).map(function(f){return {grupo:f.grupo,label:f.label,envios:+f.envios||0};});
  act.push({grupo:'Otro',label:'Otro (personalizado)',envios:0});
  C.splice.apply(C,[0,C.length].concat(act));
}
window.__aplicarCatalogoFaltas=aplicarCatalogo;

function Faltas(p){
  var _l=useState(null),lista=_l[0],setLista=_l[1];var _s=useState(false),sucio=_s[0],setSucio=_s[1];var _g=useState(false),guardando=_g[0],setGuardando=_g[1];
  useEffect(function(){db.from('configuracion').select('valor').eq('clave','faltas_reglamento').maybeSingle().then(function(r){
    var v=r&&r.data&&Array.isArray(r.data.valor)?r.data.valor:null;
    if(!v||!v.length){v=(A.CATALOGO_FALTAS_REGLAMENTO||[]).filter(function(f){return f.grupo!=='Otro';}).map(function(f,i){return {id:'f'+(i+1),grupo:f.grupo,label:f.label,envios:f.envios,activo:true};});}
    setLista(v);});},[]);
  function cambiar(id,campo,valor){setLista(function(L){return L.map(function(f){return f.id===id?Object.assign({},f,{[campo]:valor}):f;});});setSucio(true);}
  function agregar(g){setLista(function(L){return L.concat([{id:'f'+Date.now(),grupo:g,label:'',envios:g==='Leve'?1:g==='Grave'?5:15,activo:true,nuevo:true}]);});setSucio(true);}
  function mover(id,d){setLista(function(L){var i=L.findIndex(function(f){return f.id===id;});var j=i+d;if(i<0||j<0||j>=L.length)return L;var c=L.slice();var t=c[i];c[i]=c[j];c[j]=t;return c;});setSucio(true);}
  function guardar(){
    var limpia=lista.filter(function(f){return String(f.label||'').trim();}).map(function(f){return {id:f.id,grupo:f.grupo,label:String(f.label).trim(),envios:Math.max(0,+f.envios||0),activo:f.activo!==false};});
    var vistos={},dup=null;limpia.forEach(function(f){var k=f.label.toLowerCase();if(vistos[k])dup=f.label;vistos[k]=1;});
    if(dup){p.toast&&p.toast('El motivo "'+dup+'" está repetido');return;}
    setGuardando(true);
    db.from('configuracion').upsert({clave:'faltas_reglamento',valor:limpia,updated_at:new Date().toISOString()},{onConflict:'clave'}).then(function(r){
      setGuardando(false);if(r.error){p.toast&&p.toast('No se pudo guardar: '+r.error.message);return;}
      setLista(limpia);setSucio(false);aplicarCatalogo(limpia);p.toast&&p.toast('Listado de incidencias guardado');});
  }
  if(!lista)return h('div',{style:{padding:30,color:'var(--text-soft)'}},'Cargando…');
  var edit=p.esSuper;
  return h('div',null,
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:14}},
      h('div',{style:{fontSize:12.5,color:'var(--text-mid)',maxWidth:760,lineHeight:1.5}},'Estos son los motivos que aparecen al reportar una incidencia (Firmas en Vivo y ficha del envío), en la sección Incidencias y al aplicar multas en Pagos Mensajeros. "Envíos de multa" es la cantidad de envíos que se descuenta al multar. Un motivo desactivado deja de aparecer para reportar, pero los reportes antiguos lo conservan.'+(edit?'':' Solo el Super Admin puede modificarlos.')),
      edit&&h('button',{type:'button',onClick:guardar,disabled:!sucio||guardando,style:Object.assign({},btnOro,{opacity:(!sucio||guardando)?0.5:1})},guardando?'Guardando…':(sucio?'Guardar cambios':'Sin cambios'))),
    GRUPOS.map(function(g){var L=lista.filter(function(f){return f.grupo===g;});
      return h('div',{key:g,style:Object.assign({},card,{marginBottom:14,borderTop:'4px solid '+CG[g]})},
        h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}},
          h('div',{style:{display:'flex',alignItems:'center',gap:10}},h('span',{style:{fontSize:11,fontWeight:800,letterSpacing:1.2,textTransform:'uppercase',padding:'4px 10px',borderRadius:999,color:'#fff',background:CG[g]}},'Falta '+g),h('span',{style:{fontSize:12,color:'var(--text-soft)'}},L.filter(function(f){return f.activo!==false;}).length+' activos')),
          edit&&h('button',{type:'button',onClick:function(){agregar(g);},style:btnSec},'+ Agregar motivo '+g.toLowerCase())),
        h('div',{style:{display:'grid',gridTemplateColumns:'minmax(0,1fr) 150px 110px'+(edit?' 110px':''),gap:8,fontSize:11,fontWeight:800,letterSpacing:0.8,textTransform:'uppercase',color:'#7a6420',padding:'0 4px 6px'}},h('span',null,'Motivo'),h('span',null,'Nivel'),h('span',null,'Envíos de multa'),edit&&h('span',null,'')),
        L.length===0&&h('div',{style:{fontSize:12.5,color:'var(--text-soft)',padding:'6px 4px'}},'Sin motivos en este nivel.'),
        L.map(function(f){var off=f.activo===false;
          return h('div',{key:f.id,style:{display:'grid',gridTemplateColumns:'minmax(0,1fr) 150px 110px'+(edit?' 110px':''),gap:8,alignItems:'center',padding:'6px 4px',borderTop:'1px solid rgba(43,46,32,0.06)',opacity:off?0.5:1}},
            edit?h('input',{value:f.label,autoFocus:!!f.nuevo&&!f.label,placeholder:'Describe la falta',onChange:function(e){cambiar(f.id,'label',e.target.value);},style:Object.assign({},inp,{width:'100%',fontWeight:600})}):h('span',{style:{fontSize:13.5,fontWeight:600}},f.label),
            edit?h('select',{value:f.grupo,onChange:function(e){cambiar(f.id,'grupo',e.target.value);},style:inp},GRUPOS.map(function(x){return h('option',{key:x,value:x},x);})):h('span',null,f.grupo),
            edit?h('input',{type:'number',min:0,value:f.envios,onChange:function(e){cambiar(f.id,'envios',e.target.value);},style:Object.assign({},inp,{width:'100%'})}):h('span',{style:{fontWeight:800}},f.envios),
            edit&&h('div',{style:{display:'flex',gap:4,justifyContent:'flex-end'}},
              h('button',{type:'button',title:'Subir',onClick:function(){mover(f.id,-1);},style:Object.assign({},btnSec,{padding:'6px 8px'})},'↑'),
              h('button',{type:'button',title:off?'Activar':'Desactivar',onClick:function(){cambiar(f.id,'activo',off);},style:Object.assign({},btnSec,{padding:'6px 8px',color:off?'#2e7d4f':'#b03030'})},off?'Activar':'Quitar')));}));}),
    h('div',{style:{fontSize:11.5,color:'var(--text-soft)',marginTop:4}},'Siempre se ofrece además "Otro (personalizado)" para casos que no estén en la lista.'));
}

function MotivosReagenda(p){
  var _l=useState(null),lista=_l[0],setLista=_l[1];var _s=useState(false),sucio=_s[0],setSucio=_s[1];var _g=useState(false),guardando=_g[0],setGuardando=_g[1];
  useEffect(function(){db.from('configuracion').select('valor').eq('clave','motivos_reprogramacion').maybeSingle().then(function(r){setLista(r&&r.data&&Array.isArray(r.data.valor)?r.data.valor:[]);});},[]);
  function cambiar(id,campo,v){setLista(function(L){return L.map(function(m){return m.id===id?Object.assign({},m,{[campo]:v}):m;});});setSucio(true);}
  function guardar(){var limpia=lista.filter(function(m){return String(m.texto||'').trim();}).map(function(m){return {id:m.id,texto:String(m.texto).trim(),activo:m.activo!==false};});setGuardando(true);
    db.from('configuracion').upsert({clave:'motivos_reprogramacion',valor:limpia,updated_at:new Date().toISOString()},{onConflict:'clave'}).then(function(r){setGuardando(false);if(r.error){p.toast&&p.toast('No se pudo guardar: '+r.error.message);return;}setLista(limpia);setSucio(false);p.toast&&p.toast('Motivos de reagenda guardados');});}
  if(!lista)return h('div',{style:{padding:30,color:'var(--text-soft)'}},'Cargando…');
  return h('div',{style:card},
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:12}},
      h('div',{style:{fontSize:12.5,color:'var(--text-mid)',maxWidth:760,lineHeight:1.5}},'Estos motivos aparecen como lista en la app del mensajero al marcar un envío como Reprogramado. Si no queda ninguno activo, el mensajero ve el cuadro de texto libre de siempre.'),
      h('div',{style:{display:'flex',gap:8}},h('button',{type:'button',style:btnSec,onClick:function(){setLista(function(L){return L.concat([{id:Date.now(),texto:'',activo:true,nuevo:true}]);});setSucio(true);}},'+ Agregar motivo'),
        h('button',{type:'button',onClick:guardar,disabled:!sucio||guardando,style:Object.assign({},btnOro,{opacity:(!sucio||guardando)?0.5:1})},guardando?'Guardando…':(sucio?'Guardar cambios':'Sin cambios')))),
    lista.length===0&&h('div',{style:{fontSize:12.5,color:'var(--text-soft)'}},'Sin motivos cargados.'),
    lista.map(function(m){var off=m.activo===false;return h('div',{key:m.id,style:{display:'flex',gap:8,alignItems:'center',padding:'6px 0',borderTop:'1px solid rgba(43,46,32,0.06)',opacity:off?0.5:1}},
      h('input',{value:m.texto,autoFocus:!!m.nuevo&&!m.texto,placeholder:'Ej. Cliente no estaba en domicilio',onChange:function(e){cambiar(m.id,'texto',e.target.value);},style:Object.assign({},inp,{flex:1,fontWeight:600})}),
      h('button',{type:'button',onClick:function(){cambiar(m.id,'activo',off);},style:Object.assign({},btnSec,{color:off?'#2e7d4f':'#7a6420'})},off?'Activar':'Desactivar'),
      h('button',{type:'button',onClick:function(){setLista(function(L){return L.filter(function(x){return x.id!==m.id;});});setSucio(true);},style:Object.assign({},btnSec,{color:'#b03030'})},'Eliminar'));}));
}

function AccionesMasivas(p){
  var _r=useState(null),rows=_r[0],setRows=_r[1];var estadoInfo=A.estadoInfo||function(e){return {label:e};};
  useEffect(function(){db.from('acciones_masivas_log').select('id,created_at,usuario,email,accion,valor_nuevo,cantidad,desglose,filtros,contexto,estado,procesados,fallidos,terminado_en').order('created_at',{ascending:false}).limit(300).then(function(r){setRows(r.error?[]:(r.data||[]));if(r.error)p.toast&&p.toast('No se pudo cargar: '+r.error.message);});},[]);
  function descargar(row){db.from('acciones_masivas_log').select('*').eq('id',row.id).single().then(function(r){if(r.error||!r.data){p.toast&&p.toast('No se pudo descargar el detalle');return;}var d=r.data;
    A.exportToExcel('Accion_masiva_'+d.id,[{name:'Resumen',headers:['Campo','Valor'],rows:[['ID',d.id],['Fecha',fh(d.created_at)],['Usuario',d.usuario||''],['Email',d.email||''],['Acción',d.accion],['Valor nuevo',d.valor_nuevo||''],['Cantidad',d.cantidad],['Procesados',d.procesados],['Fallidos',d.fallidos],['Estado',d.estado],['Terminó',d.terminado_en?fh(d.terminado_en):''],['Estados previos',JSON.stringify((d.desglose||{}).porEstado||{})],['Clientes',JSON.stringify((d.desglose||{}).porCliente||{})],['Filtros',JSON.stringify(d.filtros||{})],['Contexto',JSON.stringify(d.contexto||{})]]},{name:'Códigos',headers:['#','Código'],rows:(d.codigos||[]).map(function(c,i){return [i+1,c];})}]);});}
  if(!rows)return h('div',{style:{padding:30,color:'var(--text-soft)'}},'Cargando…');
  var NOM={cambiar_estado:'Cambio de estado',asignar_mensajero:'Asignación de mensajero',cambiar_cliente:'Cambio de cliente'};
  return h('div',null,
    h('div',{style:{fontSize:12.5,color:'var(--text-mid)',marginBottom:12,lineHeight:1.5}},'Cada acción que toca 2 o más envíos de una vez queda anotada acá antes de ejecutarse: quién, cuándo, cuántos envíos y con qué filtros. "Descargar detalle" baja la lista completa de códigos.'),
    rows.length===0?h('div',{style:{color:'var(--text-soft)'}},'Todavía no hay acciones masivas registradas.'):
    rows.map(function(row){var valor=row.accion==='cambiar_estado'?estadoInfo(row.valor_nuevo).label:(row.valor_nuevo||'');
      var colgada=row.estado==='iniciada'&&(Date.now()-new Date(row.created_at).getTime())>600000;
      var est=row.estado==='terminada'?'Terminada':row.estado==='terminada_con_fallas'?'Terminada con '+row.fallidos+' fallas':colgada?'Interrumpida: alcanzó '+row.procesados+' de '+row.cantidad:'En curso: '+row.procesados+' de '+row.cantidad;
      var col=row.estado==='terminada'?'#2e7d4f':'#b03030';var pe=(row.desglose||{}).porEstado||{},pc=(row.desglose||{}).porCliente||{};
      var c=row.contexto||{};var alerta=c.clickReal===false||c.navegadorAutomatizado||c.pestanaVisible==='hidden'||c.conFoco===false;
      return h('div',{key:row.id,style:Object.assign({},card,{padding:'12px 14px',marginBottom:10,borderLeft:'4px solid '+col})},
        h('div',{style:{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap',alignItems:'baseline'}},
          h('div',{style:{fontWeight:800,fontSize:14,color:'var(--dark)'}},(NOM[row.accion]||row.accion)+' → '+valor+' · '+Number(row.cantidad).toLocaleString('es-CL')+' envíos'),
          h('div',{style:{fontFamily:'JetBrains Mono',fontSize:11.5,color:'var(--text-soft)'}},fh(row.created_at))),
        h('div',{style:{fontSize:12.5,marginTop:4}},'Usuario: ',h('b',null,row.usuario||'—'),' · ',h('span',{style:{color:col,fontWeight:800}},est)),
        h('div',{style:{fontSize:12,color:'var(--text-soft)',marginTop:3}},'Estaban en: '+(Object.keys(pe).map(function(k){return pe[k]+' '+estadoInfo(k).label;}).join(' · ')||'—')+' · Clientes: '+(Object.keys(pc).slice(0,4).map(function(k){return (k||'Sin cliente')+' ('+pc[k]+')';}).join(' · ')||'—')),
        alerta&&h('div',{style:{fontSize:12,color:'#b03030',fontWeight:700,marginTop:3}},'Origen dudoso: '+(c.clickReal===false?'click generado por programa':c.navegadorAutomatizado?'navegador automatizado':'pestaña oculta o sin foco')),
        h('div',{style:{marginTop:8}},h('button',{type:'button',style:btnSec,onClick:function(){descargar(row);}},'Descargar detalle')));}));
}

function SistemaIncidencias(props){
  var esSuper=!!(A.perfil&&A.perfil.esSuperAdmin);
  var _t=useState('faltas'),t=_t[0],setT=_t[1];
  var TABS=[['faltas','Faltas del reglamento'],['reagenda','Motivos de reagenda'],['masivas','Acciones masivas']];
  return h('div',{style:{padding:'28px 32px'}},
    h('div',{className:'section-head'},h('div',{className:'section-title'},'Listado de ',h('span',null,'incidencias'))),
    h('div',{style:{display:'flex',gap:6,marginBottom:16,padding:5,borderRadius:14,background:'rgba(43,46,32,0.06)',width:'fit-content',boxShadow:'inset 0 1px 3px rgba(0,0,0,0.08)'}},
      TABS.map(function(x){var act=t===x[0];return h('button',{key:x[0],type:'button',onClick:function(){setT(x[0]);},style:{padding:'9px 16px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:800,fontSize:13,color:act?'#1a1d13':'var(--text-mid)',background:act?'linear-gradient(135deg,#f3d27a,#c8a84b)':'transparent',boxShadow:act?'0 6px 14px rgba(168,125,42,0.3)':'none'}},x[1]);})),
    t==='faltas'&&h(Faltas,{toast:props.toast,esSuper:esSuper}),
    t==='reagenda'&&h(MotivosReagenda,{toast:props.toast}),
    t==='masivas'&&h(AccionesMasivas,{toast:props.toast}));
}
window.__sistemaIncidencias={Panel:SistemaIncidencias,aplicarCatalogo:aplicarCatalogo};
})();
