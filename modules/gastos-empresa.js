// Gastos de la empresa (16-11-2026) — dentro de Conciliación Bancaria, solo superadmin.
// Cada gasto pagado con la cuenta de la empresa queda como una tarjeta con su respaldo: pantallazo o
// documento (bucket privado gastos-empresa), categoría, proveedor, documento tributario, medio de pago
// e imputación (gasto de la empresa o retiro del socio). Se puede enlazar al cargo de la cartola:
// el movimiento queda conciliado con la justificación del gasto.
(function(){
var A=window.__app||{};var db=A.db;var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo;
var ORO='#e8c766',TXT='#f1ecda',SUAVE='rgba(233,228,210,.65)',VERDE='#36c47f',ROJO='#ff5a5a',NAR='#ff9d5c';
var BUCKET='gastos-empresa';
var CAT_ADEL='Adelanto a mensajero';
var CATEGORIAS=['Adelanto a mensajero','Combustible','Peajes y TAG','Mantención de vehículos','Arriendo','Servicios básicos','Internet y telefonía','Insumos y materiales','Local y bodega','Alimentación','Software y suscripciones','Publicidad','Impuestos y SII','Remuneraciones y previsión','Honorarios y asesorías','Comisiones bancarias','Multas','Retiro del socio','Otro'];
var DOCS=[['factura','Factura'],['boleta','Boleta'],['comprobante','Comprobante de transferencia'],['sin_documento','Sin documento']];
var MEDIOS=[['transferencia','Transferencia'],['debito','Tarjeta de débito'],['credito','Tarjeta de crédito'],['efectivo','Efectivo (giro)'],['cheque','Cheque'],['pac','Cargo automático (PAC)']];
var IMPUT=[['empresa','Gasto de la empresa'],['socio','Retiro del socio']];
var COLCAT=['#e8c766','#5b8def','#36c47f','#ff9d5c','#c77dff','#4fd1c5','#f472b6','#a3e635','#fbbf24','#60a5fa','#f87171','#94a3b8'];
function money(n){var v=Math.round(+n||0);return (v<0?'-$':'$')+Math.abs(v).toLocaleString('es-CL');}
function dmy(s){return s?String(s).slice(0,10).split('-').reverse().join('-'):'';}
function hoyCL(){return A.fechaHoyCL?A.fechaHoyCL():new Date().toISOString().slice(0,10);}
function numero(s){var v=String(s==null?'':s).replace(/[^\d,-]/g,'').replace(',','.');return +v||0;}
function lbl(arr,k){var x=arr.find(function(a){return a[0]===k;});return x?x[1]:k;}
function colorCat(c){var i=CATEGORIAS.indexOf(c);return COLCAT[(i<0?11:i)%COLCAT.length];}
function diasEntre(a,b){return Math.abs((new Date(a+'T12:00:00')-new Date(b+'T12:00:00'))/86400000);}
function rutFmt(s){var r=String(s||'').replace(/[^0-9kK]/g,'').toUpperCase();if(r.length<2)return s||'';var dv=r.slice(-1),cu=r.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,'.');return cu+'-'+dv;}

function comprimir(file){return new Promise(function(res){
  if(!/^image\//.test(file.type)){res({blob:file,ext:(file.name.split('.').pop()||'pdf').toLowerCase(),tipo:file.type||'application/pdf'});return;}
  var img=new Image(),u=URL.createObjectURL(file);img.onload=function(){var M=1800,s=Math.min(1,M/Math.max(img.width,img.height));var c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(function(b){res({blob:b||file,ext:'jpg',tipo:'image/jpeg'});},'image/jpeg',0.85);};
  img.onerror=function(){URL.revokeObjectURL(u);res({blob:file,ext:'jpg',tipo:file.type});};img.src=u;});}
async function subir(file,fecha){var c=await comprimir(file);var path=String(fecha||hoyCL()).slice(0,7)+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+c.ext;
  var r=await db.storage.from(BUCKET).upload(path,c.blob,{contentType:c.tipo,upsert:false});if(r.error)throw r.error;return path;}
// Adelantos: el gasto con categoría "Adelanto a mensajero" queda también en adelantos_mensajeros
// (Pagos y Cobros → Adelantos) para descontarlo después. La tabla es un historial: cada fila trae el
// saldo resultante. codigo='GASTO-<id>' enlaza la fila con el gasto.
function semanaDe(f){var d=new Date(String(f).slice(0,10)+'T12:00:00');var l=new Date(d);l.setDate(d.getDate()-((d.getDay()+6)%7));var sa=new Date(l);sa.setDate(l.getDate()+5);
  var fm=function(x){return x.toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'});};return fm(l)+' al '+fm(sa);}
async function ultimoAdelanto(nombre){var r=await db.from('adelantos_mensajeros').select('id,saldo_pendiente,codigo').eq('mensajero_nombre',nombre).order('updated_at',{ascending:false}).order('id',{ascending:false}).limit(1);return (r.data&&r.data[0])||null;}
async function sumarAdelanto(nombre,monto,fecha,gastoId,detalle){var u=await ultimoAdelanto(nombre);var prev=u?(+u.saldo_pendiente||0):0;
  var r=await db.from('adelantos_mensajeros').insert({mensajero_nombre:nombre,semana:semanaDe(fecha),fecha:fecha,monto_adelanto:monto,monto_descontado:0,saldo_pendiente:prev+monto,tipo:'adelanto',codigo:'GASTO-'+gastoId,nota:'Adelanto pagado desde la cuenta'+(detalle?' · '+detalle:'')});if(r.error)throw r.error;}
async function revertirAdelanto(nombre,monto,fecha,gastoId){var u=await ultimoAdelanto(nombre);
  if(u&&u.codigo==='GASTO-'+gastoId){var d=await db.from('adelantos_mensajeros').delete().eq('id',u.id);if(d.error)throw d.error;return;}
  var prev=u?(+u.saldo_pendiente||0):0;var r=await db.from('adelantos_mensajeros').insert({mensajero_nombre:nombre,semana:semanaDe(fecha),fecha:hoyCL(),monto_adelanto:0,monto_descontado:monto,saldo_pendiente:Math.max(0,prev-monto),tipo:'otro',codigo:'GASTO-'+gastoId,nota:'Corrección: gasto de adelanto modificado o eliminado'});if(r.error)throw r.error;}
var urlCache={};
async function urlFirmada(path){if(urlCache[path]&&urlCache[path].t>Date.now())return urlCache[path].u;var r=await db.storage.from(BUCKET).createSignedUrl(path,3600);if(r.error)return null;urlCache[path]={u:r.data.signedUrl,t:Date.now()+3000000};return r.data.signedUrl;}
function Miniatura(p){var _u=useState(null),u=_u[0],setU=_u[1];useEffect(function(){var vivo=true;urlFirmada(p.path).then(function(x){if(vivo)setU(x);});return function(){vivo=false;};},[p.path]);
  var pdf=/\.pdf$/i.test(p.path);
  return h('button',{type:'button',onClick:function(){if(u)window.open(u,'_blank');},title:'Ver respaldo',style:{width:p.size||64,height:p.size||64,borderRadius:10,border:'1px solid rgba(232,199,102,.4)',background:'rgba(0,0,0,.25)',padding:0,overflow:'hidden',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}},
    pdf?h('span',{style:{fontFamily:'Bebas Neue',fontSize:18,color:ORO}},'PDF'):u?h('img',{src:u,style:{width:'100%',height:'100%',objectFit:'cover'}}):h('span',{style:{fontSize:10,color:SUAVE}},'…'),
    p.onQuitar&&h('span',{onClick:function(e){e.stopPropagation();p.onQuitar();},style:{position:'absolute',top:2,right:2,width:18,height:18,borderRadius:9,background:'#b03030',color:'#fff',fontSize:12,lineHeight:'18px',textAlign:'center',fontWeight:900}},'×'));}

var VACIO=function(){return {fecha:hoyCL(),monto:'',categoria:'',proveedor:'',rut_proveedor:'',tipo_doc:'comprobante',n_documento:'',medio:'transferencia',imputacion:'empresa',descripcion:'',comprobantes:[],movimiento_id:null};};

function GastosEmpresa(props){
  var mes=props.mes,toast=props.toast||function(m){alert(m);},movs=props.movs||[];
  var _l=useState(null),lista=_l[0],setLista=_l[1];
  var _e=useState(null),ed=_e[0],setEd=_e[1];
  var _b=useState(false),busy=_b[0],setBusy=_b[1];
  var _f=useState(''),fCat=_f[0],setFCat=_f[1];
  var _q=useState(''),q=_q[0],setQ=_q[1];
  var _up=useState(0),subiendo=_up[0],setSubiendo=_up[1];
  var esSuper=!!(A.perfil&&A.perfil.esSuperAdmin)||!!((window.__app||{}).perfil&&window.__app.perfil.esSuperAdmin);
  var CATS=esSuper?CATEGORIAS:CATEGORIAS.filter(function(c){return c!=='Retiro del socio';});var IMPS=esSuper?IMPUT:IMPUT.filter(function(o){return o[0]!=='socio';});
  var _mn=useState([]),mensajeros=_mn[0],setMensajeros=_mn[1];
  useEffect(function(){db.from('mensajeros').select('nombre').eq('activo',true).order('nombre').then(function(r){if(r&&r.data)setMensajeros(r.data.map(function(m){return String(m.nombre||'').replace(/,/g,'').replace(/\s+/g,' ').trim();}).filter(Boolean));});},[]);
  function cargar(){var p=mes.split('-');var fin=new Date(+p[0],+p[1],0).getDate();
    db.from('gastos_empresa').select('*').gte('fecha',mes+'-01').lte('fecha',mes+'-'+String(fin).padStart(2,'0')).order('fecha',{ascending:false}).order('id',{ascending:false})
      .then(function(r){if(r.error){toast('No se pudieron cargar los gastos: '+r.error.message);setLista([]);return;}setLista(r.data||[]);});}
  useEffect(function(){setLista(null);cargar();},[mes]);
  var L=lista||[];
  var usados=useMemo(function(){var o={};L.forEach(function(g){if(g.movimiento_id)o[g.movimiento_id]=g;});return o;},[lista]);
  var vis=L.filter(function(g){if(fCat&&g.categoria!==fCat)return false;if(q){var s=q.toLowerCase();if((g.proveedor+' '+g.descripcion+' '+g.n_documento+' '+g.categoria+' '+Math.round(g.monto)).toLowerCase().indexOf(s)<0)return false;}return true;});
  var tot=L.reduce(function(s,g){return s+(+g.monto||0);},0),totEmp=L.filter(function(g){return g.imputacion==='empresa';}).reduce(function(s,g){return s+(+g.monto||0);},0);
  var sinResp=L.filter(function(g){return !(g.comprobantes||[]).length;}).length,sinMov=L.filter(function(g){return !g.movimiento_id&&g.medio!=='efectivo';}).length;
  var porCat=useMemo(function(){var o={};L.forEach(function(g){o[g.categoria]=(o[g.categoria]||0)+(+g.monto||0);});return Object.keys(o).map(function(k){return [k,o[k]];}).sort(function(a,b){return b[1]-a[1];});},[lista]);
  // cargos de la cartola que calzan con el gasto en edición (mismo monto, ±5 días) y no tienen otro gasto
  var sugeridos=useMemo(function(){if(!ed)return [];var m=Math.round(numero(ed.monto));if(!m)return [];
    return movs.filter(function(x){return x.tipo==='cargo'&&Math.round(+x.monto)===m&&diasEntre(x.fecha,ed.fecha||hoyCL())<=5&&(!usados[x.id]||usados[x.id].id===ed.id);}).slice(0,6);},[ed&&ed.monto,ed&&ed.fecha,movs,usados]);
  var movEnlazado=ed&&ed.movimiento_id?movs.find(function(x){return x.id===ed.movimiento_id;}):null;

  // pegar un pantallazo (Ctrl+V) en cualquier parte mientras la tarjeta está abierta
  var abierta=!!ed;
  useEffect(function(){if(!abierta)return;function pegar(e){var it=Array.prototype.slice.call((e.clipboardData||{}).items||[]).filter(function(x){return x.kind==='file';}).map(function(x){return x.getAsFile();}).filter(Boolean);if(it.length){e.preventDefault();agregarArchivos(it);}}
    window.addEventListener('paste',pegar);return function(){window.removeEventListener('paste',pegar);};},[abierta]);
  function upd(k,v){setEd(function(p){var o=Object.assign({},p);o[k]=v;return o;});}
  async function agregarArchivos(files){if(!files||!files.length)return;setSubiendo(function(n){return n+files.length;});
    for(var i=0;i<files.length;i++){try{var path=await subir(files[i],ed&&ed.fecha);setEd(function(p){return Object.assign({},p,{comprobantes:(p.comprobantes||[]).concat([path])});});}catch(e){toast('No se pudo subir '+files[i].name+': '+(e.message||e));}
      setSubiendo(function(n){return n-1;});}}
  async function guardar(){var g=ed;var m=numero(g.monto);
    if(!g.fecha||!m||!g.categoria){toast('Completa fecha, monto y categoría.');return;}
    var esAdel=g.categoria===CAT_ADEL;if(esAdel&&!g.mensajero){toast('Elige a qué mensajero le diste el adelanto.');return;}
    if(!(g.comprobantes||[]).length&&!window.confirm('Este gasto no tiene pantallazo ni documento de respaldo. ¿Guardarlo igual?'))return;
    setBusy(true);
    var quien='';try{var u=await db.auth.getUser();quien=(u.data&&u.data.user&&u.data.user.email)||'';}catch(e){}
    var fila={fecha:g.fecha,monto:m,categoria:g.categoria,proveedor:esAdel?g.mensajero:((g.proveedor||'').trim()||null),rut_proveedor:g.rut_proveedor?rutFmt(g.rut_proveedor):null,tipo_doc:g.tipo_doc,n_documento:(g.n_documento||'').trim()||null,
      medio:g.medio,mensajero:esAdel?g.mensajero:null,imputacion:g.categoria==='Retiro del socio'?'socio':esAdel?'empresa':g.imputacion,descripcion:(g.descripcion||'').trim()||null,comprobantes:g.comprobantes||[],movimiento_id:g.movimiento_id||null,updated_at:new Date().toISOString()};
    var antes=g.id?L.find(function(x){return x.id===g.id;}):null;
    var r=g.id?await db.from('gastos_empresa').update(fila).eq('id',g.id).select().single():await db.from('gastos_empresa').insert(Object.assign({creado_por:quien},fila)).select().single();
    if(r.error){setBusy(false);toast('No se pudo guardar: '+r.error.message);return;}
    // adelanto al mensajero: queda pendiente en Pagos y Cobros → Adelantos
    try{var gid=r.data.id;var eraAdel=antes&&antes.categoria===CAT_ADEL&&antes.mensajero;
      var cambio=!antes||!eraAdel||!esAdel||antes.mensajero!==fila.mensajero||Math.round(+antes.monto)!==Math.round(m);
      if(cambio){if(eraAdel)await revertirAdelanto(antes.mensajero,Math.round(+antes.monto),antes.fecha,gid);if(esAdel)await sumarAdelanto(fila.mensajero,Math.round(m),fila.fecha,gid,fila.descripcion);}
    }catch(eA){toast('El gasto se guardó, pero no se pudo registrar el adelanto: '+(eA.message||eA));}
    // conciliación del cargo enlazado
    var just=(esAdel?'Adelanto: '+fila.mensajero:'Gasto: '+fila.categoria+(fila.proveedor?' · '+fila.proveedor:''))+(fila.n_documento?' · '+lbl(DOCS,fila.tipo_doc)+' '+fila.n_documento:'');
    if(antes&&antes.movimiento_id&&antes.movimiento_id!==fila.movimiento_id)await db.from('movimientos_banco').update({justificacion:null,conciliado:false}).eq('id',antes.movimiento_id).or('justificacion.like.Gasto:%,justificacion.like.Adelanto:%');
    if(fila.movimiento_id)await db.from('movimientos_banco').update({justificacion:just,conciliado:true}).eq('id',fila.movimiento_id);
    setBusy(false);setEd(null);toast(g.id?'Gasto actualizado':'Gasto registrado');cargar();if(props.onCambio&&(fila.movimiento_id||(antes&&antes.movimiento_id)))props.onCambio();}
  async function borrar(g){if(!window.confirm('¿Eliminar el gasto de '+money(g.monto)+' del '+dmy(g.fecha)+'? También se borra su respaldo.'))return;
    var r=await db.from('gastos_empresa').delete().eq('id',g.id);if(r.error){toast('No se pudo eliminar: '+r.error.message);return;}
    if((g.comprobantes||[]).length)await db.storage.from(BUCKET).remove(g.comprobantes);
    if(g.categoria===CAT_ADEL&&g.mensajero){try{await revertirAdelanto(g.mensajero,Math.round(+g.monto),g.fecha,g.id);}catch(eA){toast('No se pudo revertir el adelanto: '+(eA.message||eA));}}
    if(g.movimiento_id){await db.from('movimientos_banco').update({justificacion:null,conciliado:false}).eq('id',g.movimiento_id).or('justificacion.like.Gasto:%,justificacion.like.Adelanto:%');if(props.onCambio)props.onCambio();}
    setEd(null);toast('Gasto eliminado');cargar();}
  function exportar(){var rows=L.slice().reverse().map(function(g){return [dmy(g.fecha),g.categoria,g.proveedor||'',g.rut_proveedor||'',lbl(DOCS,g.tipo_doc),g.n_documento||'',lbl(MEDIOS,g.medio),lbl(IMPUT,g.imputacion),Math.round(g.monto),g.descripcion||'',g.movimiento_id?'Sí':'No',(g.comprobantes||[]).length];});
    A.exportToExcel('GASTOS EMPRESA '+mes,[{name:'Gastos '+mes,headers:['Fecha','Categoría','Proveedor','RUT','Documento','N° documento','Medio de pago','Imputación','Monto','Detalle','Conciliado con cartola','Respaldos'],rows:rows,totalsRow:['TOTAL','','','','','','','',Math.round(tot),'','','']}]);}

  var vid={borderRadius:14,background:'linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.1)'};
  var btn=function(t,on,prim,dis,st){return h('button',{type:'button',className:'cb-btn',onClick:on,disabled:!!dis,style:Object.assign({padding:'8px 14px',borderRadius:10,fontWeight:900,fontSize:12.5,whiteSpace:'nowrap',
    border:'1px solid '+(prim?'#f7dd8c':'rgba(232,199,102,.45)'),background:prim?'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)':'rgba(255,255,255,.06)',color:prim?'#1a1d13':TXT,boxShadow:prim?'0 3px 0 #6d531a':'none'},st||{})},t);};
  var chip=function(t,c){return h('span',{style:{display:'inline-block',padding:'2px 9px',borderRadius:999,fontSize:11,fontWeight:900,background:c+'22',color:c,border:'1px solid '+c+'55',whiteSpace:'nowrap'}},t);};
  var campo=function(l,el,full){return h('label',{style:{display:'flex',flexDirection:'column',gap:4,fontSize:10.5,fontWeight:900,letterSpacing:1.1,color:ORO,gridColumn:full?'1 / -1':'auto'}},l,el);};
  var inp={className:'cb-in',style:{width:'100%',boxSizing:'border-box'}};
  var kp=function(l,v,c,s){return h('div',{style:Object.assign({},vid,{padding:'10px 12px'})},h('div',{style:{fontSize:10,letterSpacing:1.4,textTransform:'uppercase',color:SUAVE,fontWeight:800}},l),
    h('div',{style:{fontFamily:'Bebas Neue',fontSize:26,lineHeight:1.05,color:c,whiteSpace:'nowrap'}},v),s&&h('div',{style:{fontSize:11,color:SUAVE}},s));};

  return h('div',null,
    h('style',null,'@media (max-width:640px){.ge-grid{grid-template-columns:1fr!important}.ge-grid>div:empty{display:none}.ge-modal{padding:14px 14px!important;border-radius:16px!important}.ge-ov{padding:10px 8px!important}.ge-grid input,.ge-grid select,.ge-grid textarea{font-size:16px!important}.ge-cards{grid-template-columns:1fr!important}}'),
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:10,flexWrap:'wrap',marginBottom:12}},
      h('div',null,h('div',{id:'cb-gastos',style:{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:1.6,color:'#fff',lineHeight:1}},'Gastos de la empresa'),
        h('div',{style:{fontSize:12,color:SUAVE,marginTop:4,maxWidth:760}},'Registra cada gasto pagado con la cuenta: sube el pantallazo o la boleta/factura y completa la tarjeta. Si lo enlazas al cargo de la cartola, ese movimiento queda conciliado.')),
      h('div',{style:{display:'flex',gap:8}},L.length>0&&btn('Excel',exportar),btn('Registrar gasto',function(){setEd(VACIO());},true))),
    h('div',{className:'cb-k',style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}},
      kp('Total gastos',money(tot),NAR,L.length+' registro'+(L.length===1?'':'s')),
      kp('De la empresa',money(totEmp),ORO,'retiros del socio '+money(tot-totEmp)),
      kp('Sin respaldo',sinResp,sinResp?ROJO:VERDE,sinResp?'falta pantallazo o documento':'todos con respaldo'),
      kp('Sin enlazar',sinMov,sinMov?NAR:VERDE,sinMov?'no enlazados a la cartola':'todos enlazados')),
    porCat.length>0&&h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}},
      h('button',{type:'button',onClick:function(){setFCat('');},style:{padding:'5px 11px',borderRadius:999,border:'1px solid '+(fCat?'rgba(255,255,255,.18)':ORO),background:fCat?'transparent':'rgba(232,199,102,.18)',color:fCat?TXT:ORO,fontWeight:800,fontSize:11.5,cursor:'pointer'}},'Todas'),
      porCat.map(function(x){var on=fCat===x[0],c=colorCat(x[0]);return h('button',{key:x[0],type:'button',onClick:function(){setFCat(on?'':x[0]);},style:{padding:'5px 11px',borderRadius:999,border:'1px solid '+(on?c:'rgba(255,255,255,.18)'),background:on?c+'26':'transparent',color:on?c:TXT,fontWeight:800,fontSize:11.5,cursor:'pointer'}},x[0]+' · '+money(x[1]));}),
      h('input',{className:'cb-in',placeholder:'Buscar',value:q,onChange:function(e){setQ(e.target.value);},style:{marginLeft:'auto',width:170,padding:'5px 10px'}})),
    lista==null?h('div',{style:{color:SUAVE,fontSize:13}},'Cargando…'):
    vis.length===0?h('div',{style:{color:SUAVE,fontSize:13,fontWeight:700}},L.length?'Ningún gasto con ese filtro.':'Sin gastos registrados este mes.'):
    h('div',{className:'ge-cards',style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:10}},vis.map(function(g){var c=colorCat(g.categoria);var mv=g.movimiento_id?movs.find(function(x){return x.id===g.movimiento_id;}):null;
      return h('div',{key:g.id,onClick:function(){setEd(Object.assign({},g,{monto:String(Math.round(g.monto)),comprobantes:g.comprobantes||[]}));},style:Object.assign({},vid,{padding:12,cursor:'pointer',borderLeft:'4px solid '+c,display:'flex',gap:12})},
        (g.comprobantes||[]).length?h(Miniatura,{path:g.comprobantes[0],size:70}):h('div',{style:{width:70,height:70,borderRadius:10,border:'1px dashed rgba(255,90,90,.6)',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',fontSize:10,fontWeight:800,color:'#ff8a8a',flexShrink:0}},'Sin respaldo'),
        h('div',{style:{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:4}},
          h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8}},
            h('div',{style:{fontFamily:'Bebas Neue',fontSize:24,lineHeight:1,color:'#fff'}},money(g.monto)),h('div',{style:{fontSize:12,color:SUAVE,fontWeight:700}},dmy(g.fecha))),
          h('div',{style:{fontWeight:800,fontSize:13.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},g.categoria===CAT_ADEL?'Adelanto a '+(g.mensajero||g.proveedor||'—'):(g.proveedor||'Sin proveedor')),
          h('div',{style:{display:'flex',gap:5,flexWrap:'wrap'}},chip(g.categoria,c),g.imputacion==='socio'&&g.categoria!=='Retiro del socio'&&chip('Retiro socio',NAR),chip(lbl(DOCS,g.tipo_doc)+(g.n_documento?' '+g.n_documento:''),'#9aa08a')),
          h('div',{style:{fontSize:11.5,color:SUAVE}},lbl(MEDIOS,g.medio)+((g.comprobantes||[]).length>1?' · '+g.comprobantes.length+' respaldos':''),' · ',
            g.movimiento_id?h('span',{style:{color:'#7fe3a8',fontWeight:800}},'Conciliado'+(mv?' '+dmy(mv.fecha):'')):g.medio==='efectivo'?'':h('span',{style:{color:NAR,fontWeight:800}},'Sin enlazar a cartola')),
          g.descripcion&&h('div',{style:{fontSize:11.5,color:TXT,opacity:.85,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},g.descripcion)));})),

    // ventana de la tarjeta
    ed&&h('div',{className:'ge-ov',style:{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.62)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'24px 16px',overflowY:'auto'},onClick:function(e){if(e.target===e.currentTarget&&!busy)setEd(null);}},
      h('div',{className:'ge-modal',style:{width:'100%',maxWidth:640,boxSizing:'border-box',borderRadius:20,background:'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 50%,#15180f 100%)',border:'1px solid rgba(200,168,75,.45)',boxShadow:'0 24px 60px rgba(0,0,0,.5)',padding:'18px 20px',color:TXT}},
        h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}},
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:24,letterSpacing:1.6,color:'#fff'}},ed.id?'Editar gasto':'Registrar gasto'),
          ed.id&&btn('Eliminar',function(){borrar(ed);},false,busy,{color:'#ff8a8a',borderColor:'rgba(255,90,90,.5)'})),
        // respaldo
        h('div',{style:{marginBottom:14}},
          h('div',{style:{fontSize:10.5,fontWeight:900,letterSpacing:1.1,color:ORO,marginBottom:6}},'RESPALDO (PANTALLAZO, BOLETA, FACTURA O PDF)'),
          h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},
            (ed.comprobantes||[]).map(function(p){return h(Miniatura,{key:p,path:p,size:76,onQuitar:function(){upd('comprobantes',ed.comprobantes.filter(function(x){return x!==p;}));}});}),
            h('label',{className:'cb-drop',style:{width:150,height:76,padding:8,boxSizing:'border-box',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'},
              onDragOver:function(e){e.preventDefault();},onDrop:function(e){e.preventDefault();agregarArchivos(Array.prototype.slice.call(e.dataTransfer.files));}},
              h('input',{type:'file',accept:'image/*,.pdf',multiple:true,style:{display:'none'},onChange:function(e){var fs=Array.prototype.slice.call(e.target.files);e.target.value='';agregarArchivos(fs);}}),
              h('div',{style:{fontFamily:'Bebas Neue',fontSize:16,letterSpacing:1.2,color:ORO}},subiendo?'Subiendo…':'Subir archivo'),h('div',{style:{fontSize:10.5,color:SUAVE}},'o arrástralo aquí')),
            h('div',{style:{fontSize:11,color:SUAVE,flex:'1 1 160px'}},'También puedes pegar un pantallazo con Ctrl+V mientras esta tarjeta está abierta.'))),
        h('div',{className:'ge-grid',style:{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}},
          campo('FECHA DEL GASTO',h('input',Object.assign({},inp,{type:'date',value:ed.fecha,onChange:function(e){upd('fecha',e.target.value);}}))),
          campo('MONTO ($)',h('input',Object.assign({},inp,{inputMode:'numeric',placeholder:'Ej.: 45.990',value:ed.monto?Math.round(numero(ed.monto)).toLocaleString('es-CL'):'',onChange:function(e){upd('monto',String(numero(e.target.value)));},style:Object.assign({},inp.style,{fontWeight:800,fontSize:15})}))),
          campo('CATEGORÍA',h('select',Object.assign({},inp,{value:ed.categoria,onChange:function(e){upd('categoria',e.target.value);if(e.target.value==='Retiro del socio')upd('imputacion','socio');}}),h('option',{value:''},'Elige una categoría'),CATS.map(function(c){return h('option',{key:c,value:c},c);}))),
          ed.categoria===CAT_ADEL?campo('MENSAJERO',h('select',Object.assign({},inp,{value:ed.mensajero||'',onChange:function(e){upd('mensajero',e.target.value);},style:Object.assign({},inp.style,{fontWeight:800})}),h('option',{value:''},'Elige el mensajero'),
            (ed.mensajero&&mensajeros.indexOf(ed.mensajero)<0?[ed.mensajero]:[]).concat(mensajeros).map(function(n){return h('option',{key:n,value:n},n);}))):
          campo('IMPUTACIÓN',h('select',Object.assign({},inp,{value:ed.categoria==='Retiro del socio'?'socio':ed.imputacion,disabled:ed.categoria==='Retiro del socio',onChange:function(e){upd('imputacion',e.target.value);}}),IMPS.map(function(o){return h('option',{key:o[0],value:o[0]},o[1]);}))),
          ed.categoria===CAT_ADEL?h('div',{style:{gridColumn:'1 / -1',fontSize:12,color:SUAVE,lineHeight:1.4,padding:'2px 2px 4px'}},'El adelanto queda registrado como pendiente en Pagos y Cobros → Adelantos para descontarlo en el pago del mensajero.'):null,
          ed.categoria!==CAT_ADEL&&campo('PROVEEDOR O A QUIÉN SE PAGÓ',h('input',Object.assign({},inp,{placeholder:'Ej.: Copec, Entel, arrendador…',value:ed.proveedor||'',onChange:function(e){upd('proveedor',e.target.value);}}))),
          ed.categoria!==CAT_ADEL&&campo('RUT DEL PROVEEDOR',h('input',Object.assign({},inp,{placeholder:'Opcional',value:ed.rut_proveedor||'',onChange:function(e){upd('rut_proveedor',e.target.value);},onBlur:function(e){if(e.target.value)upd('rut_proveedor',rutFmt(e.target.value));}}))),
          campo('DOCUMENTO',h('select',Object.assign({},inp,{value:ed.tipo_doc,onChange:function(e){upd('tipo_doc',e.target.value);}}),DOCS.map(function(o){return h('option',{key:o[0],value:o[0]},o[1]);}))),
          campo('N° DE DOCUMENTO',h('input',Object.assign({},inp,{placeholder:ed.tipo_doc==='factura'?'Folio de la factura':ed.tipo_doc==='comprobante'?'N° de operación':'Opcional',value:ed.n_documento||'',onChange:function(e){upd('n_documento',e.target.value);}}))),
          campo('MEDIO DE PAGO',h('select',Object.assign({},inp,{value:ed.medio,onChange:function(e){upd('medio',e.target.value);}}),MEDIOS.map(function(o){return h('option',{key:o[0],value:o[0]},o[1]);}))),
          h('div'),
          campo('DETALLE DEL GASTO',h('textarea',Object.assign({},inp,{rows:2,placeholder:'Qué se compró o pagó y para qué',value:ed.descripcion||'',onChange:function(e){upd('descripcion',e.target.value);}})),true)),
        // enlace a la cartola
        ed.medio!=='efectivo'&&h('div',{style:Object.assign({},vid,{padding:'10px 12px',marginTop:12})},
          h('div',{style:{fontSize:10.5,fontWeight:900,letterSpacing:1.1,color:ORO,marginBottom:6}},'CARGO EN LA CARTOLA'),
          movEnlazado?h('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}},
              h('span',{style:{color:'#7fe3a8',fontWeight:900,fontSize:13}},'Enlazado: '+dmy(movEnlazado.fecha)+' · '+money(movEnlazado.monto)),h('span',{style:{fontSize:12,color:SUAVE,flex:1}},movEnlazado.descripcion),
              btn('Quitar enlace',function(){upd('movimiento_id',null);},false,false,{padding:'5px 10px',fontSize:11.5})):
            ed.movimiento_id?h('div',{style:{fontSize:12.5,color:'#7fe3a8',fontWeight:800}},'Enlazado a un cargo de otro mes.',' ',btn('Quitar enlace',function(){upd('movimiento_id',null);},false,false,{padding:'4px 9px',fontSize:11})):
            sugeridos.length?h('div',{style:{display:'flex',flexDirection:'column',gap:6}},h('div',{style:{fontSize:12,color:SUAVE}},'Cargos con el mismo monto cerca de esa fecha. Elige el que corresponde:'),
              sugeridos.map(function(x){return h('button',{key:x.id,type:'button',className:'cb-btn',onClick:function(){upd('movimiento_id',x.id);},style:{display:'flex',gap:10,alignItems:'center',textAlign:'left',padding:'7px 10px',borderRadius:10,border:'1px solid rgba(232,199,102,.35)',background:'rgba(255,255,255,.04)',color:TXT}},
                h('b',{style:{whiteSpace:'nowrap'}},dmy(x.fecha)),h('span',{style:{color:NAR,fontWeight:900,whiteSpace:'nowrap'}},money(x.monto)),h('span',{style:{fontSize:12,color:SUAVE,flex:1}},x.descripcion),x.justificacion&&h('span',{style:{fontSize:11,color:ORO}},'ya justificado'));})):
            h('div',{style:{fontSize:12,color:SUAVE}},numero(ed.monto)?'No hay cargos de '+money(numero(ed.monto))+' en la cartola cerca de esa fecha. Si aún no subes la cartola, puedes enlazarlo después.':'Ingresa el monto para buscar el cargo en la cartola.')),
        h('div',{style:{display:'flex',gap:8,marginTop:16,justifyContent:'flex-end'}},btn('Cancelar',function(){setEd(null);},false,busy),btn(busy?'Guardando…':(ed.id?'Guardar cambios':'Registrar gasto'),guardar,true,busy||subiendo>0))))
  );
}
window.GastosEmpresa=GastosEmpresa;
})();
