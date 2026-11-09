// Pago Semanal (08-11-2026) -- una tarjeta por mensajero, igual al archivo de pago semanal de Luis
// ("Semana NN - ARCHIVO DE PAGO dd-mm AL dd-mm"):
//   Total semana = entregas de la semana (lunes a domingo, fecha real de entrega) x tarifa del mensajero
//   + extra por periferia (piezas en comunas "... - PERIFERIA" x su extra; si tiene "paga a", se le abona a esa persona)
//   + extra por comuna (ej. Yosbel: $500 por pieza en Padre Hurtado)
//   + movimientos de la semana: extra (+), consumo / descuento / siniestro / descuento de adelanto (-).
// Un adelanto NO se descuenta solo: queda como adelanto pendiente y se rebaja con "Descuento de adelanto".
// Nada se descuenta automáticamente: todo descuento lo ingresa un administrador en la tarjeta.
// Los movimientos viven en la tabla movimientos_pago_mensajero (RLS: solo administradores).
(function(){
if(window.__pagoSemanal)return;
var R=React,h=R.createElement,A=window.__app||{},db=A.db;
var fechaHoyCL=A.fechaHoyCL||function(){return new Date().toLocaleDateString('en-CA',{timeZone:'America/Santiago'});};
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function lunesDe(f){var d=new Date(f+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d);}
function sumar(f,n){var d=new Date(f+'T12:00:00');d.setDate(d.getDate()+n);return iso(d);}
function dm(f){return f?f.slice(8,10)+'-'+f.slice(5,7):'';}
function dmy(f){return f?f.split('-').reverse().join('-'):'';}
function norm(n){return String(n||'').replace(/,\s*/g,' ').replace(/\s+/g,' ').trim().toUpperCase();}
function fmt(n){return (n<0?'-':'')+'$'+Math.abs(Math.round(n||0)).toLocaleString('es-CL');}
function tit(s){return String(s||'').toLowerCase().replace(/(^|\s)\S/g,function(m){return m.toUpperCase();});}
// Número de semana dentro del mes de pago (la semana pertenece al mes donde termina su domingo).
function infoSemana(lunes){var dom=sumar(lunes,6);var d=new Date(dom+'T12:00:00');var y=d.getFullYear(),m=d.getMonth();
  var p=new Date(y,m,1);p.setDate(1+((7-p.getDay())%7));var n=Math.round((d-p)/(7*864e5))+1;
  return{num:n,mes:d.toLocaleDateString('es-CL',{month:'long'}),desde:lunes,hasta:dom};}
// Las funciones RPC devuelven como máximo 1000 filas por llamada: se piden en páginas hasta traer todo.
function rpcTodo(nombre,args){var out=[];function pag(desde){return db.rpc(nombre,args).range(desde,desde+999).then(function(r){if(r.error)return r;out=out.concat(r.data||[]);if((r.data||[]).length===1000)return pag(desde+1000);return{data:out};});}return pag(0);}
var TIPOS={
  extra:{l:'Extra',s:1,c:'#2e7d4f'},
  adelanto:{l:'Adelanto',s:0,c:'#c26a12'},
  consumo:{l:'Consumo',s:-1,c:'#8a5a2b'},
  descuento:{l:'Descuento',s:-1,c:'#b03030'},
  siniestro:{l:'Siniestro',s:-1,c:'#d32f2f'},
  prestamo:{l:'Adelanto',s:0,c:'#c26a12'},
  abono_prestamo:{l:'Descuento de adelanto',s:-1,c:'#9a4d0c'}};
// 08-11-2026 (pedido de Luis): el adelanto ya no se descuenta completo en la semana. Queda como saldo
// pendiente en la tarjeta y se descuenta cuando y cuanto se quiera con "Descuento de adelanto"
// (todo, la mitad o una parte); el resto sigue pendiente semana a semana. "Préstamo" y "Abono préstamo"
// se fusionaron con esto (las filas antiguas tipo 'prestamo' se leen como adelanto).
var FALTAS=(A.CATALOGO_FALTAS_REGLAMENTO||[]).map(function(x){return x&&x.label;}).filter(function(x){return x&&!/^Otro/.test(x);});
var TIPOS_UI=['adelanto','abono_prestamo','consumo','extra','siniestro','descuento'];
var ORDEN_TIPOS=['adelanto','consumo','extra','descuento','siniestro','prestamo','abono_prestamo'];
var AYUDA={abono_prestamo:'Se resta de este pago y baja el adelanto pendiente. Puedes descontar todo o solo una parte.',adelanto:'Dinero entregado al mensajero. NO se descuenta solo: queda como adelanto pendiente en la tarjeta hasta que lo descuentes.',consumo:'Consumo de productos; se descuenta de este pago.',extra:'Pago adicional (retiros, apoyo, bonos); se suma.',descuento:'Descuento manual (penalización u otro); se resta.',siniestro:'Descuento por un paquete siniestrado; indica el código.',prestamo:'Préstamo entregado; NO se descuenta solo, queda como saldo pendiente.',abono_prestamo:'Cuota que se descuenta del préstamo pendiente en este pago.'};

function calcular(nombre,cfg,porComuna,movs,cfgAll,saldoPrevio){
  var c=cfg||{},ent=0,per=0,exC=0;var rows=porComuna[nombre]||{};
  Object.keys(rows).forEach(function(com){var n=rows[com];ent+=n;if(/PERIFERIA/.test(com))per+=n;if(c.extra_comuna&&com.indexOf(norm(c.extra_comuna))===0)exC+=n;});
  var tarifa=+c.tarifa||0,base=ent*tarifa;
  var extraPer=(c.periferia_paga_a?0:per*(+c.extra_periferia||0));
  // periferias de otros que se le abonan a este mensajero
  var perRecibidas=0,detRecib=[];
  Object.keys(cfgAll).forEach(function(k){var o=cfgAll[k];if(o.periferia_paga_a&&norm(o.periferia_paga_a)===nombre&&k!==nombre){var rr=porComuna[k]||{};var pn=0;Object.keys(rr).forEach(function(cm){if(/PERIFERIA/.test(cm))pn+=rr[cm];});if(pn){perRecibidas+=pn*(+o.extra_periferia||0);detRecib.push(tit(k)+': '+pn);}}});
  var extraCom=exC*(+c.extra_comuna_tarifa||0);
  var t={};ORDEN_TIPOS.forEach(function(k){t[k]=0;});(movs||[]).forEach(function(m){t[m.tipo]=(t[m.tipo]||0)+(+m.monto||0);});
  var totalSemana=base+extraPer+perRecibidas+extraCom;
  var descuentos=t.consumo+t.descuento+t.siniestro+t.abono_prestamo;
  var total=totalSemana+t.extra-descuentos;
  var saldoPrestamo=(saldoPrevio||0)+t.adelanto+t.prestamo-t.abono_prestamo;
  return{entregas:ent,tarifa:tarifa,base:base,periferias:per,extraPer:extraPer,perRecibidas:perRecibidas,detRecib:detRecib,extraComuna:extraCom,nComuna:exC,
    comunaExtra:c.extra_comuna||'',tarifaComuna:+c.extra_comuna_tarifa||0,tarifaPer:+c.extra_periferia||0,pagaA:c.periferia_paga_a||'',
    t:t,totalSemana:totalSemana,descuentos:descuentos,total:total,saldoPrestamo:saldoPrestamo,saldoPrevio:saldoPrevio||0};
}

function SiniestrosEmbebido(props){
  var _r=R.useState(!!window.Siniestros),listo=_r[0],setListo=_r[1];
  R.useEffect(function(){if(!listo)loadScriptOnce('siniestros','modules/siniestros.js').then(function(){setListo(true);}).catch(function(){});},[]);
  if(!listo)return h('div',{className:'info-banner'},'Cargando siniestros...');
  var perfil=A.perfil||{};
  return h('div',{className:'ps-siniestros'},h(window.Siniestros,{mensajeros:props.mensajeros||[],clientes:props.clientes||[],toast:props.toast,usuario:{nombre:perfil.nombre||'Admin'},esAdmin:props.esAdmin!=null?props.esAdmin:perfil.esAdmin,esSuperAdmin:props.esSuperAdmin!=null?props.esSuperAdmin:perfil.esSuperAdmin}));
}
function Vistas(props){
  var v=props.vista,ops=[];
  if(props.puedePagos!==false){ops.push(['resumen','Resumen']);ops.push(['pagos','Tarjetas de pago']);}
  if(props.puedeRetiros!==false)ops.push(['retiros','Retiros']);
  if(props.puedeConsumo!==false)ops.push(['consumo','Consumo del local']);
  if(props.puedeSiniestros!==false)ops.push(['siniestros','Siniestros']);
  if(ops.length<2)return null;
  return h('div',{style:{display:'flex',flexWrap:'wrap',gap:4,padding:4,marginBottom:16,borderRadius:14,background:'linear-gradient(180deg,#2f3325,#1c1f15)',boxShadow:'0 10px 20px -12px rgba(20,22,15,.6)',width:'fit-content',maxWidth:'100%'}},
    ops.map(function(o){var a=v===o[0];return h('button',{key:o[0],type:'button',onClick:function(){props.onVista(o[0]);},style:{padding:'10px 18px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:800,fontSize:13,letterSpacing:.4,background:a?'linear-gradient(135deg,#e8c766,#b08a2e)':'transparent',color:a?'#1a1d13':'#e9e4d2',boxShadow:a?'0 6px 14px rgba(200,168,75,.35)':'none'}},o[1]);}));
}
function BarraSemana(props){
  var sem=infoSemana(props.lunes),hoy=fechaHoyCL();
  var b=function(t,on){return h('button',{type:'button',className:'btn-futurista btn-f-ghost',onClick:on,style:{padding:'7px 12px'}},t);};
  return h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:14}},
    h('div',{style:{fontWeight:800,fontSize:14,marginRight:6}},'Semana '+String(sem.num).padStart(2,'0')+' · '+dm(sem.desde)+' al '+dm(sem.hasta)),
    b('Anterior',function(){props.setLunes(sumar(props.lunes,-7));}),
    h('input',{type:'date',className:'form-input',value:props.lunes,onChange:function(e){if(e.target.value)props.setLunes(lunesDe(e.target.value));},style:{margin:0,width:150}}),
    b('Siguiente',function(){props.setLunes(sumar(props.lunes,7));}),
    b('Actual',function(){props.setLunes(lunesDe(hoy));}));
}
function ExtraLazy(props){
  var _r=R.useState(!!window.__pagoSemanalExtra),listo=_r[0],setListo=_r[1];
  R.useEffect(function(){if(!listo)loadScriptOnce('pago-semanal-extra','modules/pago-semanal-extra.js').then(function(){setListo(true);}).catch(function(){});},[]);
  if(!listo)return h('div',{className:'info-banner'},'Cargando...');
  return h(window.__pagoSemanalExtra[props.comp],props);
}
function PagoSemanalRaiz(props){
  var primera=props.puedePagos!==false?'pagos':props.puedeRetiros!==false?'retiros':props.puedeConsumo!==false?'consumo':'siniestros';
  var VALIDAS={resumen:1,pagos:1,retiros:1,consumo:1,siniestros:1};
  var _v=R.useState(VALIDAS[props.vista]?props.vista:primera),vista=_v[0],setVista=_v[1];
  var _l=R.useState(lunesDe(fechaHoyCL())),lunes=_l[0],setLunes=_l[1];
  R.useEffect(function(){if(VALIDAS[props.vista]&&props.vista!==vista)setVista(props.vista);},[props.vista]);
  function cambiar(v){setVista(v);props.onVista&&props.onVista(v);}
  var permitido={resumen:props.puedePagos!==false,pagos:props.puedePagos!==false,retiros:props.puedeRetiros!==false,consumo:props.puedeConsumo!==false,siniestros:props.puedeSiniestros!==false};
  if(!permitido[vista])vista=primera;
  var sem=infoSemana(lunes);
  var cuerpo;
  if(vista==='siniestros')cuerpo=h(SiniestrosEmbebido,props);
  else if(vista==='pagos')cuerpo=h(PagoSemanal,Object.assign({},props,{lunes:lunes,setLunes:setLunes}));
  else if(vista==='retiros')cuerpo=h('div',{style:{padding:'0 20px 24px'}},h(ExtraLazy,Object.assign({},props,{comp:'Retiros',sem:sem})));
  else cuerpo=h('div',{style:{padding:'0 20px 24px'}},h(BarraSemana,{lunes:lunes,setLunes:setLunes}),h(ExtraLazy,Object.assign({},props,{comp:vista==='resumen'?'Resumen':'Consumo',sem:sem,key:vista+sem.desde})));
  var btnProd=vista==='consumo'&&props.puedeProductos!==false&&props.onProductos?h('button',{type:'button',onClick:props.onProductos,style:{padding:'10px 16px',borderRadius:10,cursor:'pointer',fontWeight:800,fontSize:12.5,letterSpacing:.4,border:'1px solid '+(props.verProductos?'#b08a2e':'rgba(200,168,75,.5)'),background:props.verProductos?'linear-gradient(135deg,#e8c766,#b08a2e)':'#fff',color:'#1a1d13',marginBottom:16}},props.verProductos?'Ocultar productos':'Administrar productos'):null;
  return h('div',null,
    h('div',{style:{padding:'0 20px',display:'flex',gap:10,alignItems:'flex-start',flexWrap:'wrap'}},h(Vistas,{vista:vista,onVista:cambiar,puedePagos:props.puedePagos,puedeRetiros:props.puedeRetiros,puedeConsumo:props.puedeConsumo,puedeSiniestros:props.puedeSiniestros}),btnProd),
    cuerpo);
}
function PagoSemanal(props){
  var toast=props.toast||function(){};
  var hoy=fechaHoyCL();
  var _l=R.useState(lunesDe(hoy)),lunesL=_l[0],setLunesL=_l[1];
  var lunes=props.lunes||lunesL,setLunes=props.setLunes||setLunesL;
  var _d=R.useState(null),data=_d[0],setData=_d[1];
  var _q=R.useState(''),q=_q[0],setQ=_q[1];
  var _o=R.useState('total'),orden=_o[0],setOrden=_o[1];
  var _f=R.useState({}),forms=_f[0],setForms=_f[1];
  var _g=R.useState(0),gen=_g[0],setGen=_g[1];
  var _ab=R.useState(null),abierto=_ab[0],setAbierto=_ab[1];
  var sem=infoSemana(lunes);
  var mesAnt=(function(){var d=new Date(sem.hasta+'T12:00:00');var a=new Date(d.getFullYear(),d.getMonth()-1,1),b=new Date(d.getFullYear(),d.getMonth(),0);return{desde:iso(a),hasta:iso(b),nombre:a.toLocaleDateString('es-CL',{month:'long'})};})();
  var quien=(A.perfil&&(A.perfil.nombre||A.perfil.usuario))||'Administrador';

  R.useEffect(function(){
    var vivo=true;setData(null);
    Promise.all([
      rpcTodo('entregados_por_mensajero_comuna',{p_desde:sem.desde,p_hasta:sem.hasta}),
      db.from('mensajeros').select('nombre,tarifa,extra_periferia,periferia_paga_a,extra_comuna,extra_comuna_tarifa,activo'),
      db.from('movimientos_pago_mensajero').select('*').lte('semana',sem.desde).order('created_at',{ascending:true}),
      db.from('siniestros').select('id,codigo,mensajero,fecha_siniestro,nota,descontado_mensajero,descartado').or('descontado_mensajero.is.null,descontado_mensajero.eq.false').order('fecha_siniestro',{ascending:false}).limit(500),
      db.from('configuracion').select('valor').eq('clave','pago_semanal_excluidos').maybeSingle(),
      db.from('siniestros').select('id,codigo,mensajero,descontado_mensajero_valor,descontado_mensajero_fecha,descontado_mensajero_por').eq('descontado_mensajero',true).like('descontado_mensajero_semana',dmy(sem.desde)+'%'),
      db.from('consumos_mensajeros').select('mensajero_nombre,producto,cantidad,monto,fecha').gte('fecha',sem.desde).lte('fecha',sem.hasta),
      sem.num===1?db.from('retiros').select('mensajero,pago_mensajero,fecha').gte('fecha',mesAnt.desde).lte('fecha',mesAnt.hasta).neq('mensajero',''):Promise.resolve({data:[]}),
      // Todos los mensajeros activos (Gestión de Usuarios: rol rider, activo), aunque no tengan entregas en la semana.
      db.from('usuarios').select('nombre').eq('rol','rider').eq('activo',true)
    ]).then(function(r){
      if(!vivo)return;
      var err=r.slice(0,3).find(function(x){return x.error;});if(err){toast('Error cargando pago semanal: '+err.error.message);setData({error:true});return;}
      var porComuna={};(r[0].data||[]).forEach(function(x){var n=norm(x.mensajero);if(!n)return;(porComuna[n]=porComuna[n]||{})[x.comuna||'']=(+x.n||0);});
      var cfg={};(r[1].data||[]).forEach(function(m){var k=norm(m.nombre);if(cfg[k]&&cfg[k].activo!==false&&m.activo===false)return;cfg[k]=m;}); // si hay filas duplicadas manda la activa
      var movsSem={},saldo={};
      (r[2].data||[]).forEach(function(m){var n=norm(m.mensajero);
        if(m.semana===sem.desde){(movsSem[n]=movsSem[n]||[]).push(m);}
        else{saldo[n]=(saldo[n]||0)+((m.tipo==='prestamo'||m.tipo==='adelanto')?(+m.monto||0):m.tipo==='abono_prestamo'?-(+m.monto||0):0);}});
      var sinP={};(r[3].data||[]).forEach(function(s){if(s.descartado)return;var n=norm(s.mensajero);if(!n)return;(sinP[n]=sinP[n]||[]).push(s);});
      // siniestros descontados desde la sección Siniestros para esta semana (si no tienen ya su movimiento)
      (r[5]&&r[5].data||[]).forEach(function(s){var n=norm(s.mensajero);if(!n)return;var ya=(movsSem[n]||[]).some(function(m){return m.codigo===s.codigo;});if(ya)return;(movsSem[n]=movsSem[n]||[]).push({id:'s'+s.id,virtual:true,semana:sem.desde,mensajero:n,tipo:'siniestro',monto:+s.descontado_mensajero_valor||0,codigo:s.codigo,nota:'desde Siniestros',fecha:s.descontado_mensajero_fecha?String(s.descontado_mensajero_fecha).slice(0,10):sem.desde,creado_por:s.descontado_mensajero_por||''});});
      // consumo del local (pestaña Consumo): un movimiento por persona con el detalle
      var cons={};(r[6]&&r[6].data||[]).forEach(function(x){var n=norm(x.mensajero_nombre);var c=cons[n]||(cons[n]={m:0,p:{}});c.m+=+x.monto||0;c.p[x.producto]=(c.p[x.producto]||0)+(+x.cantidad||0);});
      Object.keys(cons).forEach(function(n){var c=cons[n];if(!c.m)return;(movsSem[n]=movsSem[n]||[]).push({id:'c'+n,virtual:true,fuente:'consumo',semana:sem.desde,mensajero:n,tipo:'consumo',monto:c.m,nota:'Local: '+Object.keys(c.p).map(function(k){return c.p[k]+' '+tit(k);}).join(', '),fecha:sem.hasta,creado_por:''});});
      // retiros del mes anterior: se pagan en la Semana 01
      var ret={};(r[7]&&r[7].data||[]).forEach(function(x){var n=norm(x.mensajero);if(!n)return;var t=ret[n]||(ret[n]={n:0,p:0});t.n++;t.p+=+x.pago_mensajero||0;});
      Object.keys(ret).forEach(function(n){var t=ret[n];if(!t.p)return;(movsSem[n]=movsSem[n]||[]).push({id:'r'+n,virtual:true,fuente:'retiros',semana:sem.desde,mensajero:n,tipo:'extra',monto:t.p,nota:'Retiros de '+mesAnt.nombre+' ('+t.n+')',fecha:sem.desde,creado_por:''});});
      var excl=((r[4]&&r[4].data&&r[4].data.valor)||['ELY MENSAJERO','FERNANDOCHECK','FERNANDO CHECK']).map(norm);
      var activos=((r[8]&&r[8].data)||[]).map(function(u){return norm(u.nombre);}).filter(Boolean);
      setData({porComuna:porComuna,cfg:cfg,movs:movsSem,saldo:saldo,siniestros:sinP,excluidos:excl,activos:activos});
    }).catch(function(e){if(vivo){toast('Error: '+(e&&e.message||e));setData({error:true});}});
    return function(){vivo=false;};
  },[lunes,gen]);

  function recargar(){setGen(function(g){return g+1;});}
  // Productos del local (mismo catálogo de "Administrar productos"): en el tipo Consumo se eligen con
  // un toque y el monto y la nota se completan solos (08-11-2026).
  // Valor y cliente de cada siniestro pendiente (vienen del envío: envios.valor_siniestro / cliente).
  var _is=R.useState({}),infoSin=_is[0],setInfoSin=_is[1];
  R.useEffect(function(){
    if(!data||data.error)return;var cods=[];Object.keys(data.siniestros||{}).forEach(function(n){(data.siniestros[n]||[]).forEach(function(x){if(x.codigo)cods.push(x.codigo);});});
    if(!cods.length){setInfoSin({});return;}
    var lotes=[];for(var i=0;i<cods.length;i+=150)lotes.push(cods.slice(i,i+150));
    Promise.all(lotes.map(function(l){return db.from('envios').select('codigo,cliente,valor_siniestro').in('codigo',l);})).then(function(rs){var m={};rs.forEach(function(r){(r.data||[]).forEach(function(e){m[e.codigo]={cliente:e.cliente||'',valor:e.valor_siniestro!=null?+e.valor_siniestro:null};});});setInfoSin(m);}).catch(function(){});
  },[data]);
  // Busca el envío del código ingresado en el formulario de siniestro (debe existir en el sistema).
  function buscarEnvio(nombre,cod){
    cod=String(cod||'').trim();if(cod.length<5){setForm(nombre,{envio:null,envioMsg:''});return;}
    setForm(nombre,{envioMsg:'Buscando…'});
    Promise.all([db.from('envios').select('codigo,cliente,estado,mensajero,destinatario,comuna,valor_siniestro').eq('codigo',cod).limit(1),
      db.from('siniestros').select('id,descontado_mensajero').eq('codigo',cod).eq('descartado',false).limit(1)]).then(function(rr){var r=rr[0];
      var e=(r&&r.data||[])[0];var sx=(rr[1]&&rr[1].data||[])[0];if(e)e.yaReg=sx?(sx.descontado_mensajero?'descontado':'pendiente'):null;
      setForms(function(p){var cur=p[nombre]||{};if(String(cur.codigo||'').trim()!==cod)return p;var x=Object.assign({},p);
        x[nombre]=Object.assign({},cur,{envio:e||null,envioMsg:e?'':'Este código no existe en el sistema',cliente:e?(e.cliente||cur.cliente||''):cur.cliente,monto:(e&&e.valor_siniestro&&!cur.monto)?String(Math.round(+e.valor_siniestro)):cur.monto});return x;});
    }).catch(function(){setForm(nombre,{envioMsg:'No se pudo verificar el código'});});
  }
  var _pv=R.useState([]),prodsVenta=_pv[0],setProdsVenta=_pv[1];
  R.useEffect(function(){db.from('configuracion').select('valor').eq('clave','productos_venta').maybeSingle().then(function(r){var v=(r&&r.data&&r.data.valor)||[];setProdsVenta((Array.isArray(v)?v:[]).filter(function(p){return p.activo!==false&&(+p.precio||0)>0;}));}).catch(function(){});},[]);
  function itemsConsumo(nombre,prod,delta){
    var f=forms[nombre]||{};var it=Object.assign({},f.items||{});
    it[prod.nombre]=Math.max(0,(it[prod.nombre]||0)+delta);if(!it[prod.nombre])delete it[prod.nombre];
    var total=0,partes=[];Object.keys(it).forEach(function(k){var p=prodsVenta.find(function(x){return x.nombre===k;});var pr=p?(+p.precio||0):0;total+=it[k]*pr;partes.push(it[k]+' × '+tit(k));});
    setForm(nombre,{items:it,monto:total?String(total):'',nota:partes.join(', ')});
  }
  function setForm(n,o){setForms(function(p){var x=Object.assign({},p);x[n]=Object.assign({tipo:'adelanto',monto:'',nota:'',codigo:''},p[n]||{},o);return x;});}
  // Siniestro anotado desde la tarjeta: queda en la hoja de Siniestros (confirmado) y en la tarjeta
  // como pendiente hasta descontarlo. Devuelve el id del siniestro (existente o nuevo).
  function asegurarSiniestro(nombre,codigo,nota,valor,cliente,envio){
    var cod=String(codigo||'').trim(),ts=new Date().toISOString();
    var upd={tuvo_siniestro:true,estado:'siniestro',updated_at:ts};
    if(valor)upd.valor_siniestro=valor;
    if(cliente&&envio&&!envio.cliente)upd.cliente=cliente;
    return db.from('siniestros').select('id').eq('codigo',cod).eq('descartado',false).order('id',{ascending:false}).limit(1).then(function(r){
      var ex=(r&&r.data||[])[0];
      var paso=ex?Promise.resolve(ex.id):db.from('siniestros').insert({codigo:cod,mensajero:nombre,nota:nota||'Registrado desde Pago Semanal',fecha_siniestro:hoy,confirmado:true,confirmado_fecha:ts,confirmado_por:quien}).select('id').single().then(function(x){if(x.error)throw x.error;return x.data.id;});
      return paso.then(function(id){
        return db.from('envios').update(upd).eq('codigo',cod).then(function(){
          if(!ex)db.from('historial_envios').insert({envio_id:null,codigo_envio:cod,estado:'siniestro',nota:'Siniestro registrado desde Pago Semanal por '+quien+' (mensajero '+nombre+')'+(valor?' · valor '+fmt(valor):' · falta el valor'),usuario:quien,canal:'panel_admin',created_at:ts}).then(function(){});
          return id;});
      });
    });
  }
  function validarSiniestro(nombre){
    var f=forms[nombre]||{};var cod=String(f.codigo||'').trim();
    if(!cod){toast('Indica el código del paquete siniestrado');return null;}
    if(!f.sinId&&!f.envio){toast(f.envioMsg==='Buscando…'?'Espera a que se verifique el código':'El código '+cod+' no existe en el sistema');return null;}
    if(!f.sinId&&!(f.cliente||(f.envio&&f.envio.cliente))){toast('Indica el cliente al que pertenece el paquete');return null;}
    return cod;
  }
  function soloAnotarSiniestro(nombre){
    var f=forms[nombre]||{};var cod=validarSiniestro(nombre);if(!cod)return;
    var valor=Math.round(+String(f.monto||'').replace(/[^\d]/g,'')||0);
    asegurarSiniestro(nombre,cod,(f.nota||'').trim(),valor,f.cliente,f.envio).then(function(){toast('Siniestro '+cod+' anotado en la hoja de Siniestros'+(valor?'.':'. Falta el valor: complétalo para poder descontarlo.'));setForm(nombre,{monto:'',nota:'',codigo:'',sinId:null,envio:null,envioMsg:'',cliente:''});recargar();})
      .catch(function(e){toast('No se pudo anotar: '+(e&&e.message||e));});
  }
  function agregar(nombre){
    var f=forms[nombre]||{};var monto=Math.round(+String(f.monto||'').replace(/[^\d]/g,'')||0);
    if(f.tipo==='siniestro'&&!validarSiniestro(nombre))return;
    if(!monto){toast(f.tipo==='siniestro'?'Ingresa el valor a descontar, o usa "Solo anotar" si aún no lo sabes':'Ingresa un monto');return;}
    if(f.tipo==='descuento'&&!(f.nota||'').trim()){toast('Indica el motivo del descuento');return;}
    if(f.tipo==='abono_prestamo'){var cc=filas.find(function(x){return x.nombre===nombre;});var pend=cc?cc.saldoPrestamo:0;
      if(pend<=0){toast(tit(nombre)+' no tiene adelanto pendiente');return;}
      if(monto>pend){toast('El adelanto pendiente es '+fmt(pend)+'; no puedes descontar más');return;}}
    if(f.tipo==='siniestro'&&!f.sinId){var cod0=String(f.codigo).trim();
      asegurarSiniestro(nombre,cod0,(f.nota||'').trim(),monto,f.cliente,f.envio).then(function(id){var ff=Object.assign({},f,{sinId:id,codigo:cod0});setForm(nombre,{sinId:id,codigo:cod0});guardarMov(nombre,ff,monto);}).catch(function(e){toast('No se pudo registrar el siniestro: '+(e&&e.message||e));});
      return;}
    guardarMov(nombre,f,monto);
  }
  function guardarMov(nombre,f,monto){
    db.from('movimientos_pago_mensajero').insert({semana:sem.desde,mensajero:nombre,tipo:f.tipo||'adelanto',monto:monto,nota:(f.nota||'').trim()||null,codigo:(f.codigo||'').trim()||null,fecha:hoy,creado_por:quien}).then(function(r){
      if(r.error){toast('No se guardó: '+r.error.message);return;}
      if(f.tipo==='siniestro'&&f.codigo){var inf0=infoSin[f.codigo];if(!inf0||!inf0.valor)db.from('envios').update({valor_siniestro:monto}).eq('codigo',f.codigo).then(function(){});}
      if(f.tipo==='siniestro'&&f.sinId){db.from('siniestros').update({descontado_mensajero:true,descontado_mensajero_fecha:hoy,descontado_mensajero_semana:dmy(sem.desde)+' al '+dmy(sem.hasta),descontado_mensajero_valor:monto,descontado_mensajero_por:quien}).eq('id',f.sinId).then(function(){});}
      toast(TIPOS[f.tipo||'adelanto'].l+' registrado a '+tit(nombre));setForm(nombre,{monto:'',nota:'',codigo:'',sinId:null,items:{},envio:null,envioMsg:'',cliente:''});recargar();
    });
  }
  function borrar(m){
    if(m.virtual&&m.fuente){toast(m.fuente==='consumo'?'El consumo del local se edita en la pestaña Consumo del local':'Los retiros se editan en la pestaña Retiros');return;}
    if(!window.confirm('¿Eliminar '+TIPOS[m.tipo].l.toLowerCase()+' de '+fmt(m.monto)+' a '+tit(m.mensajero)+'?'))return;
    if(m.virtual){db.from('siniestros').update({descontado_mensajero:false,descontado_mensajero_fecha:null,descontado_mensajero_semana:null,descontado_mensajero_valor:null,descontado_mensajero_por:null}).eq('codigo',m.codigo).then(function(r){if(r.error){toast('No se pudo: '+r.error.message);return;}recargar();});return;}
    db.from('movimientos_pago_mensajero').delete().eq('id',m.id).then(function(r){if(r.error){toast('No se eliminó: '+r.error.message);return;}
      if(m.tipo==='siniestro'&&m.codigo){db.from('siniestros').update({descontado_mensajero:false,descontado_mensajero_fecha:null,descontado_mensajero_semana:null,descontado_mensajero_valor:null,descontado_mensajero_por:null}).eq('codigo',m.codigo).then(function(){});}
      recargar();});
  }
  function excluir(nombre,si){
    var lista=(data.excluidos||[]).filter(function(x){return x!==nombre;});if(si)lista.push(nombre);
    db.from('configuracion').upsert({clave:'pago_semanal_excluidos',valor:lista},{onConflict:'clave'}).then(function(r){if(r.error){toast('Error: '+r.error.message);return;}recargar();});
  }

  // ---- filas ----
  var filas=[],excluidas=[];
  if(data&&!data.error){
    var nombres={};Object.keys(data.porComuna).forEach(function(n){nombres[n]=1;});Object.keys(data.movs).forEach(function(n){nombres[n]=1;});
    Object.keys(data.saldo).forEach(function(n){if(data.saldo[n])nombres[n]=1;});
    (data.activos||[]).forEach(function(n){nombres[n]=1;});
    Object.keys(nombres).forEach(function(n){var c=calcular(n,data.cfg[n],data.porComuna,data.movs[n],data.cfg,data.saldo[n]);c.nombre=n;c.movs=data.movs[n]||[];c.sin=data.siniestros[n]||[];
      if(!c.entregas&&!c.movs.length&&!c.saldoPrestamo&&!c.perRecibidas&&!c.sin.length&&(data.activos||[]).indexOf(n)<0)return;
      (data.excluidos.indexOf(n)>=0?excluidas:filas).push(c);});
    filas.sort(function(a,b){return orden==='nombre'?a.nombre.localeCompare(b.nombre):b.total-a.total;});
  }
  var vis=filas.filter(function(c){return !q||c.nombre.indexOf(norm(q))>=0;});
  var T=filas.reduce(function(a,c){a.ent+=c.entregas;a.sem+=c.totalSemana;a.ex+=c.t.extra;a.de+=c.descuentos;a.tot+=c.total;a.pr+=c.saldoPrestamo;a.ade+=c.t.adelanto+c.t.abono_prestamo;return a;},{ent:0,sem:0,ex:0,de:0,tot:0,pr:0,ade:0});

  function exportar(){
    var rows=filas.slice().sort(function(a,b){return a.nombre.localeCompare(b.nombre);}).map(function(c){return[c.nombre,c.entregas,c.tarifa,c.base,c.extraPer+c.perRecibidas,c.extraComuna,c.t.extra,c.t.adelanto+c.t.prestamo,c.t.consumo,c.t.descuento+c.t.siniestro,c.t.abono_prestamo,c.saldoPrestamo,c.total];});
    var det=[];filas.forEach(function(c){c.movs.forEach(function(m){det.push([c.nombre,dmy(m.fecha),TIPOS[m.tipo].l,(TIPOS[m.tipo].s<0?-1:1)*m.monto,m.codigo||'',m.nota||'',m.creado_por||'']);});});
    A.exportToExcel('Pago_semanal_'+sem.desde+'_al_'+sem.hasta,[
      {name:'Pago semanal',headers:['Mensajero','Entregas','Tarifa','Total semana','Periferia','Extra comuna','Extra','Adelanto entregado','Consumo','Descuento/Siniestro','Descuento de adelanto','Adelanto pendiente','Total a pagar'],rows:rows,totalsRow:['TOTAL',T.ent,'',filas.reduce(function(a,c){return a+c.base;},0),filas.reduce(function(a,c){return a+c.extraPer+c.perRecibidas;},0),filas.reduce(function(a,c){return a+c.extraComuna;},0),T.ex,filas.reduce(function(a,c){return a+c.t.adelanto;},0),filas.reduce(function(a,c){return a+c.t.consumo;},0),filas.reduce(function(a,c){return a+c.t.descuento+c.t.siniestro;},0),filas.reduce(function(a,c){return a+c.t.abono_prestamo;},0),T.pr,T.tot]},
      {name:'Movimientos',headers:['Mensajero','Fecha','Tipo','Monto','Código','Nota','Ingresado por'],rows:det}]);
  }
  function recibo(c){
    var w=window.open('','_blank');
    var e=function(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
    var fila=function(a,b,m,neg){return '<tr><td>'+a+'</td><td style="text-align:right">'+e(b)+'</td><td style="text-align:right;font-family:JetBrains Mono,monospace'+(neg?';color:#b03030':'')+'">'+(neg?'-':'')+fmt(m)+'</td></tr>';};
    var lin=fila('Entregas de la semana',c.entregas+' × '+fmt(c.tarifa),c.base);
    if(c.extraPer)lin+=fila('Extra periferia',c.periferias+' × '+fmt(c.tarifaPer),c.extraPer);
    if(c.perRecibidas)lin+=fila('Periferia abonada',c.detRecib.join(', '),c.perRecibidas);
    if(c.extraComuna)lin+=fila('Extra '+tit(c.comunaExtra),c.nComuna+' × '+fmt(c.tarifaComuna),c.extraComuna);
    c.movs.forEach(function(m){if((TIPOS[m.tipo]||{}).s===0)return;lin+=fila(TIPOS[m.tipo].l+(m.codigo?' · '+e(m.codigo):'')+(m.nota?' <span style="color:#888">('+e(m.nota)+')</span>':''),dmy(m.fecha),m.monto,TIPOS[m.tipo].s<0);});
    var cuerpo='<div class="sec"><h2>1. Detalle del pago</h2><table class="tabla"><thead><tr><th>Concepto</th><th style="text-align:right">Detalle</th><th style="text-align:right">Monto</th></tr></thead><tbody>'+lin
      +'<tr><td style="font-weight:800;background:#F5F0E0;border-top:2px solid #C8A84B">Total a pagar</td><td style="background:#F5F0E0;border-top:2px solid #C8A84B"></td><td style="text-align:right;font-weight:800;background:#F5F0E0;border-top:2px solid #C8A84B;font-family:JetBrains Mono,monospace">'+fmt(c.total)+'</td></tr></tbody></table></div>';
    if(c.saldoPrestamo||c.saldoPrevio||c.t.adelanto||c.t.prestamo)cuerpo+='<div class="sec"><h2>2. Adelantos</h2><table class="tabla"><tbody>'+fila('Adelanto pendiente anterior','',c.saldoPrevio)+fila('Adelantos entregados esta semana','',c.t.adelanto+c.t.prestamo)+fila('Descontado esta semana','',c.t.abono_prestamo,true)+fila('<b>Adelanto pendiente</b>','',c.saldoPrestamo)+'</tbody></table></div>';
    cuerpo+='<div class="resultado" style="border-color:#2E7D32;background:#F1F8F2"><div class="gr" style="color:#2E7D32">'+fmt(c.total)+'</div><div class="dt"><b>Total a pagar a '+e(tit(c.nombre))+'</b><br>Semana '+String(sem.num).padStart(2,'0')+' de '+sem.mes+' · del '+dmy(sem.desde)+' al '+dmy(sem.hasta)+'</div></div>';
    loadScriptOnce('doc-pdf','modules/doc-pdf.js').then(function(){var D=window.__docPDF;
      D.abrir(w,D.documentoHTML({tipo:'RECIBO DE PAGO',folio:'PS-'+sem.desde.replace(/-/g,'').slice(2)+'-'+c.nombre.replace(/[^A-Z]/g,'').slice(0,6),fechaDoc:dmy(hoy),
        titulo:'Recibo de pago semanal',subtitulo:'Semana '+String(sem.num).padStart(2,'0')+' · del '+dmy(sem.desde)+' al '+dmy(sem.hasta),
        metaPares:[['Mensajero',tit(c.nombre)],['Entregas',String(c.entregas)],['Tarifa por entrega',fmt(c.tarifa)],['Período','Lunes '+dmy(sem.desde)+' a domingo '+dmy(sem.hasta),2]],
        cuerpo:cuerpo,firmas:['TransPgso SpA · Empleador',tit(c.nombre)+' · Recibí conforme'],
        cierre:'Entregas = piezas con estado Entregado y fecha real de entrega dentro de la semana. Adelantos, consumos, extras y descuentos según lo registrado en el sistema.',
        nombreArchivo:'Recibo_pago_'+c.nombre.replace(/\s+/g,'_')+'_'+sem.desde}));
    }).catch(function(){try{w&&w.close();}catch(x){}toast('No se pudo generar el recibo');});
  }

  // ---- UI ----
  var kpi=function(l,v,col,sub){return h('div',{style:{flex:'1 1 170px',padding:'14px 16px',borderRadius:16,background:'linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.1)'}},
    h('div',{style:{fontSize:10.5,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(233,228,210,.65)'}},l),
    h('div',{style:{fontFamily:'Bebas Neue',fontSize:32,lineHeight:1.05,color:col||'#fff',textShadow:'0 0 16px '+(col||'#fff')+'44'}},v),
    sub?h('div',{style:{fontSize:11.5,color:'rgba(233,228,210,.7)'}},sub):null);};
  var btn=function(txt,on,extra){return h('button',{type:'button',className:'btn-futurista btn-f-ghost',onClick:on,style:Object.assign({padding:'8px 14px'},extra||{})},txt);};

  return h('div',{style:{padding:'0 20px 24px'}},
    // barra superior
    h('div',{style:{position:'relative',borderRadius:20,padding:'18px 20px',marginBottom:18,background:'radial-gradient(120% 120% at 20% 0%,#3b402c,#1a1d13)',border:'1px solid rgba(200,168,75,.38)',boxShadow:'0 22px 40px -22px rgba(20,22,15,.7)'}},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:14}},
        h('div',null,
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:30,letterSpacing:2.2,color:'#fff',lineHeight:1}},'Semana '+String(sem.num).padStart(2,'0')+' · Archivo de pago'),
          h('div',{style:{fontSize:13,color:'rgba(233,228,210,.75)',marginTop:4}},'Del lunes '+dmy(sem.desde)+' al domingo '+dmy(sem.hasta)+' · mes de pago '+sem.mes)),
        h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},
          btn('Semana anterior',function(){setLunes(sumar(lunes,-7));}),
          h('input',{type:'date',className:'form-input',value:lunes,onChange:function(e){if(e.target.value)setLunes(lunesDe(e.target.value));},style:{margin:0,width:150}}),
          btn('Semana siguiente',function(){setLunes(sumar(lunes,7));}),
          btn('Semana actual',function(){setLunes(lunesDe(hoy));}),
          h('button',{type:'button',className:'btn-futurista btn-f-gold',onClick:exportar,disabled:!filas.length,style:{padding:'8px 14px'}},'Exportar Excel'))),
      h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
        kpi('Entregas',T.ent.toLocaleString('es-CL'),'#9fd3ea',filas.length+' mensajeros'),
        kpi('Pago total semana',fmt(T.sem),'#ffe59a','entregas × tarifa + periferias'),
        kpi('Extras',fmt(T.ex),'#7ee0ad'),
        kpi('Descuentos',fmt(T.de),'#ff8f86','adelantos descontados, consumos, siniestros'),
        kpi('Total a pagar',fmt(T.tot),'#7ee0ad','con descuentos'),
        kpi('Adelantos pendientes',fmt(T.pr),'#f0b467','quedan para próximas semanas'))),
    h('div',{style:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:16}},
      h('input',{className:'form-input',placeholder:'Buscar mensajero',value:q,onChange:function(e){setQ(e.target.value);},style:{margin:0,maxWidth:280}}),
      h('div',{style:{display:'flex',gap:6}},[['total','Mayor pago'],['nombre','Nombre']].map(function(o){var a=orden===o[0];return h('button',{key:o[0],type:'button',onClick:function(){setOrden(o[0]);},style:{padding:'7px 12px',borderRadius:999,border:'1px solid '+(a?'#c8a84b':'var(--border)'),background:a?'rgba(200,168,75,.18)':'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}},o[1]);})),
      excluidas.length?h('span',{style:{fontSize:12,color:'var(--text-soft)'}},'Fuera del pago: '+excluidas.map(function(c){return tit(c.nombre)+' ('+c.entregas+')';}).join(', ')+' · ',excluidas.map(function(c){return h('a',{key:c.nombre,href:'#',onClick:function(ev){ev.preventDefault();excluir(c.nombre,false);},style:{marginRight:8,color:'#a0842a',fontWeight:700}},'incluir '+tit(c.nombre));})):null),
    !data?h('div',{className:'info-banner'},'Calculando la semana...'):data.error?h('div',{className:'info-banner'},'No se pudo cargar.'):
    !vis.length?h('div',{className:'info-banner'},'Sin entregas ni movimientos en esta semana.'):
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,400px),1fr))',gap:18}},
      vis.map(function(c){
        var f=forms[c.nombre]||{tipo:'adelanto',monto:'',nota:'',codigo:''};var ab=abierto===c.nombre;
        var linea=function(l,v,col,sub,k){return h('div',{key:k||l,style:{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:10,padding:'6px 0',borderBottom:'1px dashed rgba(200,168,75,.22)'}},
          h('span',{style:{fontSize:13.5}},l,sub?h('span',{style:{fontSize:11.5,color:'var(--text-soft)',marginLeft:6}},sub):null),h('b',{className:'mono',style:{fontSize:13.5,color:col||'var(--dark)'}},v));};
        return h('div',{key:c.nombre,style:{position:'relative',display:'flex',flexDirection:'column',padding:'18px 18px 16px',borderRadius:20,background:'radial-gradient(130% 90% at 0% 0%,#ffffff,#fbf6ea 60%,#f2e8cf)',border:'1px solid rgba(200,168,75,.35)',borderTop:'1px solid #fff',boxShadow:'0 1px 0 #fff inset,0 -4px 0 '+(c.total<0?'#b03030':'#c8a84b')+' inset,0 26px 44px -26px rgba(43,46,32,.45),0 6px 14px rgba(43,46,32,.07)'}},
          h('div',{style:{display:'flex',alignItems:'center',gap:12,marginBottom:12}},
            h('div',{style:{width:44,height:44,borderRadius:'50%',flex:'none',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:20,color:'#2b2e20',background:'radial-gradient(circle at 32% 28%,#fff6cf,#f0cd62 40%,#b8902e 85%)',boxShadow:'0 6px 12px rgba(168,132,46,.3),inset 0 -3px 6px rgba(0,0,0,.2),inset 0 3px 6px rgba(255,255,255,.7)'}},c.nombre.split(' ').map(function(x){return x[0];}).slice(0,2).join('')),
            h('div',{style:{flex:1,minWidth:0}},
              h('div',{style:{fontWeight:800,fontSize:16,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},c.nombre),
              h('div',{style:{fontSize:12,color:'var(--text-soft)'}},c.entregas+' entregas × '+fmt(c.tarifa)+(c.tarifa?'':' · sin tarifa'))),
            h('button',{type:'button',className:'btn-futurista btn-f-gold',onClick:function(){recibo(c);},style:{padding:'7px 12px',fontSize:11.5}},'Recibo')),
          linea('Total semana',fmt(c.base),null,c.entregas+' × '+fmt(c.tarifa),'base'),
          c.extraPer?linea('Extra periferia',fmt(c.extraPer),'#2e7d4f',c.periferias+' × '+fmt(c.tarifaPer),'per'):null,
          c.pagaA&&c.periferias?linea('Periferia',fmt(0),'var(--text-soft)',c.periferias+' piezas · se abonan a '+tit(c.pagaA),'pera'):null,
          c.perRecibidas?linea('Periferia abonada',fmt(c.perRecibidas),'#2e7d4f',c.detRecib.join(', '),'perr'):null,
          c.extraComuna?linea('Extra '+tit(c.comunaExtra),fmt(c.extraComuna),'#2e7d4f',c.nComuna+' × '+fmt(c.tarifaComuna),'exc'):null,
          // movimientos
          c.movs.length?h('div',{style:{margin:'10px 0 4px'}},
            h('div',{style:{fontSize:10.5,fontWeight:800,letterSpacing:1.4,textTransform:'uppercase',color:'var(--text-soft)',marginBottom:6}},'Movimientos de la semana'),
            c.movs.map(function(m){var T0=TIPOS[m.tipo]||TIPOS.descuento;return h('div',{key:m.id,style:{display:'grid',gridTemplateColumns:'auto 1fr auto auto',alignItems:'center',gap:8,padding:'7px 10px',marginBottom:6,borderRadius:10,background:'#fff',border:'1px solid rgba(200,168,75,.22)',borderLeft:'4px solid '+T0.c}},
              h('span',{style:{fontSize:10.5,fontWeight:800,color:T0.c,background:T0.c+'14',border:'1px solid '+T0.c+'55',borderRadius:999,padding:'2px 8px',whiteSpace:'nowrap'}},T0.l),
              h('span',{style:{fontSize:11.5,color:'var(--text-soft)',minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},title:(m.nota||'')+' · '+(m.creado_por||'')},dm(m.fecha)+(m.codigo?' · '+m.codigo:'')+(m.nota?' · '+m.nota:'')+(m.creado_por?' · '+m.creado_por:'')),
              h('b',{className:'mono',style:{fontSize:13,color:T0.s>0?'#2e7d4f':T0.s<0?'#b03030':'#c26a12'}},(T0.s>0?'+':T0.s<0?'-':'')+fmt(m.monto)),
              h('span',{onClick:function(){borrar(m);},title:'Eliminar',style:{cursor:'pointer',color:'#b03030',fontWeight:900,padding:'0 4px'}},'×'));})):null,
          (c.saldoPrestamo||c.saldoPrevio)?h('div',{style:{margin:'6px 0',padding:'9px 11px',borderRadius:12,background:'linear-gradient(135deg,rgba(194,106,18,.10),rgba(194,106,18,.04))',border:'1px solid rgba(194,106,18,.35)'}},
            h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}},
              h('span',{style:{fontSize:12,fontWeight:800,color:'#9a4d0c',letterSpacing:.3}},'Adelanto pendiente'),
              h('b',{className:'mono',style:{fontSize:15,color:c.saldoPrestamo>0?'#9a4d0c':'#2e7d4f'}},c.saldoPrestamo>0?fmt(c.saldoPrestamo):'Saldado')),
            h('div',{style:{fontSize:11.5,color:'var(--text-soft)',marginTop:2}},'Venía '+fmt(c.saldoPrevio)+((c.t.adelanto+c.t.prestamo)?' · entregado esta semana '+fmt(c.t.adelanto+c.t.prestamo):'')+(c.t.abono_prestamo?' · descontado esta semana '+fmt(c.t.abono_prestamo):'')),
            c.saldoPrestamo>0?h('div',{style:{display:'flex',gap:6,marginTop:7,flexWrap:'wrap'}},
              [['Descontar todo',c.saldoPrestamo],['Descontar la mitad',Math.round(c.saldoPrestamo/2)],['Descontar otro monto',null]].map(function(o){return h('button',{key:o[0],type:'button',onClick:function(){setAbierto(c.nombre);setForm(c.nombre,{tipo:'abono_prestamo',monto:o[1]!=null?String(o[1]):'',items:{},nota:''});},style:{padding:'4px 10px',borderRadius:999,border:'1px solid #c26a12',background:o[1]===c.saldoPrestamo?'#c26a12':'#fff',color:o[1]===c.saldoPrestamo?'#fff':'#9a4d0c',fontSize:11,fontWeight:800,cursor:'pointer'}},o[0]);})):null):null,
          // siniestros pendientes de descontar
          c.sin.length?h('div',{style:{margin:'6px 0',padding:'8px 10px',borderRadius:10,background:'rgba(211,47,47,.06)',border:'1px solid rgba(211,47,47,.25)'}},
            (function(){var tot=0,sinV=0;c.sin.forEach(function(x){var v=(infoSin[x.codigo]||{}).valor;if(v)tot+=v;else sinV++;});
              return h('div',{style:{display:'flex',justifyContent:'space-between',gap:6,fontSize:11.5,fontWeight:800,color:'#b03030',marginBottom:4}},h('span',null,c.sin.length+' siniestro(s) sin descontar'),h('span',{className:'mono'},fmt(tot)+(sinV?' · '+sinV+' sin valor':'')));})(),
            h('div',{style:{maxHeight:150,overflowY:'auto',paddingRight:2}},c.sin.map(function(s){var inf=infoSin[s.codigo]||{};return h('div',{key:s.id,style:{display:'grid',gridTemplateColumns:'1fr auto auto',alignItems:'center',gap:8,fontSize:12,padding:'3px 0',borderBottom:'1px dashed rgba(211,47,47,.15)'}},
              h('span',{style:{minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},h('span',{className:'mono'},s.codigo),h('span',{style:{color:'var(--text-soft)',marginLeft:6}},(s.fecha_siniestro?dm(String(s.fecha_siniestro).slice(0,10)):'')+(inf.cliente?' · '+inf.cliente:''))),
              inf.valor?h('b',{className:'mono',style:{color:'#8a1f1f'}},fmt(inf.valor)):h('span',{title:'Este siniestro no tiene valor registrado',style:{fontSize:10.5,fontWeight:800,color:'#a15c00',background:'rgba(240,185,74,.18)',border:'1px solid rgba(240,185,74,.6)',borderRadius:999,padding:'1px 7px'}},'Falta valor'),
              h('a',{href:'#',onClick:function(ev){ev.preventDefault();setAbierto(c.nombre);setForm(c.nombre,{tipo:'siniestro',codigo:s.codigo,sinId:s.id,nota:'Siniestro '+s.codigo,items:{},monto:inf.valor?String(Math.round(inf.valor)):'',envio:{codigo:s.codigo,cliente:inf.cliente},envioMsg:'',cliente:inf.cliente||''});},style:{color:'#b03030',fontWeight:800}},'Descontar'));}))):null,
          // agregar movimiento
          ab?h('div',{style:{margin:'10px 0 4px',padding:12,borderRadius:14,background:'#fff',border:'1px solid rgba(200,168,75,.4)'}},
            h('div',{style:{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}},TIPOS_UI.map(function(k){var a=(f.tipo||'adelanto')===k;var T0=TIPOS[k];return h('button',{key:k,type:'button',onClick:function(){var o=k==='consumo'?{tipo:k}:{tipo:k,items:{}};if(k==='abono_prestamo'&&c.saldoPrestamo>0)o.monto=String(c.saldoPrestamo);setForm(c.nombre,o);},style:{padding:'5px 10px',borderRadius:999,border:'1px solid '+(a?T0.c:'var(--border)'),background:a?T0.c:'#fff',color:a?'#fff':'var(--dark)',fontSize:11.5,fontWeight:800,cursor:'pointer'}},T0.l);})),
            h('div',{style:{fontSize:11.5,color:'var(--text-soft)',marginBottom:8}},AYUDA[f.tipo||'adelanto']),
            (f.tipo==='consumo')?h('div',{style:{marginBottom:10}},
              prodsVenta.length===0?h('div',{style:{fontSize:11.5,color:'var(--text-soft)'}},'No hay productos con precio. Agrégalos en Consumo del local › Administrar productos.'):
              h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(118px,1fr))',gap:6}},prodsVenta.map(function(pv){var n=(f.items||{})[pv.nombre]||0;
                return h('div',{key:pv.nombre,style:{position:'relative',borderRadius:12,border:'1px solid '+(n?'#8a5a2b':'rgba(200,168,75,.4)'),background:n?'linear-gradient(135deg,#fff3e2,#f3dcc0)':'radial-gradient(130% 90% at 20% 0%,#fff 0%,#faf5e8 70%)',boxShadow:n?'0 6px 14px -8px rgba(138,90,43,.6)':'0 4px 10px -8px rgba(110,84,20,.4)',overflow:'hidden'}},
                  h('button',{type:'button',onClick:function(){itemsConsumo(c.nombre,pv,1);},style:{display:'block',width:'100%',textAlign:'left',padding:'8px 10px',border:'none',background:'transparent',cursor:'pointer'}},
                    h('div',{style:{fontSize:11.5,fontWeight:800,color:'var(--dark)',lineHeight:1.2}},tit(pv.nombre)),
                    h('div',{style:{fontFamily:'JetBrains Mono',fontSize:12,fontWeight:700,color:'#8a5a2b',marginTop:2}},fmt(+pv.precio||0))),
                  n?h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'3px 6px',background:'rgba(138,90,43,.12)'}},
                    h('button',{type:'button',onClick:function(){itemsConsumo(c.nombre,pv,-1);},style:{width:22,height:22,borderRadius:6,border:'1px solid #8a5a2b',background:'#fff',color:'#8a5a2b',fontWeight:900,cursor:'pointer',lineHeight:1}},'−'),
                    h('b',{style:{fontSize:12,color:'#8a5a2b'}},n+' × '),
                    h('button',{type:'button',onClick:function(){itemsConsumo(c.nombre,pv,1);},style:{width:22,height:22,borderRadius:6,border:'1px solid #8a5a2b',background:'#8a5a2b',color:'#fff',fontWeight:900,cursor:'pointer',lineHeight:1}},'+')):null);})),
              Object.keys(f.items||{}).length?h('div',{style:{marginTop:6,fontSize:12,fontWeight:700,color:'#8a5a2b'}},'Total consumo: '+fmt(+f.monto||0)):null):null,
            h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
              (f.tipo==='siniestro')?h('input',{className:'form-input',placeholder:'Código del paquete',value:f.codigo,disabled:!!f.sinId,onChange:function(e){var v=e.target.value;setForm(c.nombre,{codigo:v,sinId:null,envio:null,envioMsg:''});clearTimeout(window.__tmBusq);window.__tmBusq=setTimeout(function(){buscarEnvio(c.nombre,v);},450);},onBlur:function(e){if(!f.sinId)buscarEnvio(c.nombre,e.target.value);},style:{margin:0,flex:'1 1 100%',fontFamily:'JetBrains Mono'}}):null,
              (f.tipo==='siniestro'&&(f.envio||f.envioMsg))?h('div',{style:{flex:'1 1 100%',fontSize:11.5,padding:'6px 9px',borderRadius:8,background:f.envio?'rgba(46,125,79,.08)':'rgba(176,48,48,.08)',border:'1px solid '+(f.envio?'rgba(46,125,79,.3)':'rgba(176,48,48,.3)'),color:f.envio?'#1f6b40':'#a02828'}},
                f.envio?((f.sinId?'Siniestro ya registrado':f.envio.yaReg==='descontado'?'Ya está en la hoja de Siniestros y ya fue descontado':f.envio.yaReg==='pendiente'?'Ya está en la hoja de Siniestros (pendiente de descontar)':'Envío encontrado')+(f.envio.estado?' · '+f.envio.estado:'')+(f.envio.destinatario?' · '+f.envio.destinatario:'')+(f.envio.comuna?' · '+f.envio.comuna:'')+(f.envio.mensajero&&norm(f.envio.mensajero)!==c.nombre?' · asignado a '+tit(f.envio.mensajero):'')):f.envioMsg):null,
              (f.tipo==='siniestro'&&f.envio&&!f.sinId)?h('select',{className:'form-input',value:f.cliente||'',disabled:!!(f.envio.cliente),onChange:function(e){setForm(c.nombre,{cliente:e.target.value});},style:{margin:0,flex:'1 1 100%'}},
                h('option',{value:''},'Cliente del paquete'),(f.envio.cliente&&!(props.clientes||[]).some(function(x){return x.nombre===f.envio.cliente;}))?h('option',{value:f.envio.cliente},f.envio.cliente):null,
                (props.clientes||[]).filter(function(x){return x.activo!==false;}).map(function(x){return h('option',{key:x.nombre,value:x.nombre},x.nombre);})):null,
              (f.tipo==='descuento'&&FALTAS.length)?h('select',{className:'form-input',value:'',onChange:function(e){if(e.target.value)setForm(c.nombre,{nota:e.target.value});},style:{margin:0,flex:'1 1 100%'}},h('option',{value:''},'Elegir motivo del reglamento (opcional)'),FALTAS.map(function(x){return h('option',{key:x,value:x},x);})):null,
              h('input',{className:'form-input',inputMode:'numeric',placeholder:f.tipo==='siniestro'?'Valor (opcional para anotar)':'Monto',value:f.monto,onChange:function(e){setForm(c.nombre,{monto:e.target.value});},onKeyDown:function(e){if(e.key==='Enter')agregar(c.nombre);},style:{margin:0,width:f.tipo==='siniestro'?170:120,fontFamily:'JetBrains Mono'}}),
              h('input',{className:'form-input',placeholder:f.tipo==='descuento'?'Motivo (obligatorio)':'Nota (opcional)',value:f.nota,onChange:function(e){setForm(c.nombre,{nota:e.target.value});},onKeyDown:function(e){if(e.key==='Enter')agregar(c.nombre);},style:{margin:0,flex:'1 1 140px'}}),
              h('button',{type:'button',className:'btn-futurista btn-f-success',onClick:function(){agregar(c.nombre);},style:{padding:'8px 14px'}},f.tipo==='siniestro'?'Descontar':'Agregar'),
              (f.tipo==='siniestro')?h('button',{type:'button',className:'btn-futurista btn-f-ghost',title:'Lo deja en la hoja de Siniestros y en la tarjeta, sin descontar todavía',onClick:function(){soloAnotarSiniestro(c.nombre);},style:{padding:'8px 12px'}},'Solo anotar'):null,
              h('button',{type:'button',className:'btn-futurista btn-f-ghost',onClick:function(){setAbierto(null);},style:{padding:'8px 12px'}},'Cerrar'))):
          h('div',{style:{display:'flex',gap:8,margin:'10px 0 4px'}},
            h('button',{type:'button',className:'btn-futurista btn-f-ghost',onClick:function(){setAbierto(c.nombre);},style:{flex:1,padding:'9px 12px'}},'+ Adelanto, consumo, extra, siniestro o descuento'),
            h('button',{type:'button',className:'btn-futurista btn-f-ghost',title:'Dejar fuera del pago (cuentas internas o de prueba)',onClick:function(){if(window.confirm('¿Dejar a '+tit(c.nombre)+' fuera del pago semanal?'))excluir(c.nombre,true);},style:{padding:'9px 10px'}},'Excluir')),
          h('div',{style:{flex:1}}),
          h('div',{style:{marginTop:10,borderRadius:14,padding:'12px 14px',background:'linear-gradient(160deg,#2f3325,#1c1f15)',color:'#f3ecd6',boxShadow:'inset 0 1px 0 rgba(255,255,255,.08)'}},
            h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:12.5,opacity:.9}},h('span',null,'Total semana + extras'),h('b',{className:'mono'},fmt(c.totalSemana+c.t.extra))),
            c.descuentos?h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:12.5,opacity:.9,marginTop:2}},h('span',null,'Descuentos'),h('b',{className:'mono',style:{color:'#ff9d94'}},'-'+fmt(c.descuentos))):null,
            h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8,paddingTop:8,borderTop:'1px solid rgba(232,199,102,.35)'}},
              h('span',{style:{fontSize:11.5,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#e8c766'}},'Total a pagar'),
              h('span',{style:{fontFamily:'Bebas Neue',fontSize:34,lineHeight:1,color:c.total<0?'#ff8f86':'#7ee0ad'}},fmt(c.total)))));
      })));
}
window.__pagoSemanal={PagoSemanal:PagoSemanalRaiz,Tarjetas:PagoSemanal,calcular:calcular};
})();
