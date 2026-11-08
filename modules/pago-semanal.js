// Pago Semanal (08-11-2026) -- una tarjeta por mensajero, igual al archivo de pago semanal de Luis
// ("Semana NN - ARCHIVO DE PAGO dd-mm AL dd-mm"):
//   Total semana = entregas de la semana (lunes a domingo, fecha real de entrega) x tarifa del mensajero
//   + extra por periferia (piezas en comunas "... - PERIFERIA" x su extra; si tiene "paga a", se le abona a esa persona)
//   + extra por comuna (ej. Yosbel: $500 por pieza en Padre Hurtado)
//   + movimientos de la semana: extra (+), adelanto / consumo / descuento / siniestro / abono a préstamo (-).
// Un "préstamo" NO se descuenta solo: queda como saldo pendiente y se rebaja con "abono a préstamo".
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
var TIPOS={
  extra:{l:'Extra',s:1,c:'#2e7d4f'},
  adelanto:{l:'Adelanto',s:-1,c:'#c26a12'},
  consumo:{l:'Consumo',s:-1,c:'#8a5a2b'},
  descuento:{l:'Descuento',s:-1,c:'#b03030'},
  siniestro:{l:'Siniestro',s:-1,c:'#d32f2f'},
  prestamo:{l:'Préstamo',s:0,c:'#1565c0'},
  abono_prestamo:{l:'Abono préstamo',s:-1,c:'#5e35b1'}};
var ORDEN_TIPOS=['adelanto','consumo','extra','descuento','siniestro','prestamo','abono_prestamo'];
var AYUDA={adelanto:'Dinero entregado en la semana; se descuenta completo de este pago.',consumo:'Consumo de productos; se descuenta de este pago.',extra:'Pago adicional (retiros, apoyo, bonos); se suma.',descuento:'Descuento manual (penalización u otro); se resta.',siniestro:'Descuento por un paquete siniestrado; indica el código.',prestamo:'Préstamo entregado; NO se descuenta solo, queda como saldo pendiente.',abono_prestamo:'Cuota que se descuenta del préstamo pendiente en este pago.'};

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
  var descuentos=t.adelanto+t.consumo+t.descuento+t.siniestro+t.abono_prestamo;
  var total=totalSemana+t.extra-descuentos;
  var saldoPrestamo=(saldoPrevio||0)+t.prestamo-t.abono_prestamo;
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
  var v=props.vista,ops=[];if(props.puedePagos!==false)ops.push(['pagos','Tarjetas de pago']);if(props.puedeSiniestros!==false)ops.push(['siniestros','Siniestros']);
  if(ops.length<2)return null;
  return h('div',{style:{display:'inline-flex',gap:4,padding:4,marginBottom:16,borderRadius:14,background:'linear-gradient(180deg,#2f3325,#1c1f15)',boxShadow:'0 10px 20px -12px rgba(20,22,15,.6)'}},
    ops.map(function(o){var a=v===o[0];return h('button',{key:o[0],type:'button',onClick:function(){props.onVista(o[0]);},style:{padding:'10px 20px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:800,fontSize:13,letterSpacing:.4,background:a?'linear-gradient(135deg,#e8c766,#b08a2e)':'transparent',color:a?'#1a1d13':'#e9e4d2',boxShadow:a?'0 6px 14px rgba(200,168,75,.35)':'none'}},o[1]);}));
}
function PagoSemanalRaiz(props){
  var _v=R.useState(props.vista||(props.puedePagos===false?'siniestros':'pagos')),vista=_v[0],setVista=_v[1];
  R.useEffect(function(){if(props.vista)setVista(props.vista);},[props.vista]);
  function cambiar(v){setVista(v);props.onVista&&props.onVista(v);}
  if(props.puedePagos===false)vista='siniestros';
  return h('div',null,
    h('div',{style:{padding:'0 20px'}},h(Vistas,{vista:vista,onVista:cambiar,puedePagos:props.puedePagos,puedeSiniestros:props.puedeSiniestros})),
    vista==='siniestros'?h(SiniestrosEmbebido,props):h(PagoSemanal,props));
}
function PagoSemanal(props){
  var toast=props.toast||function(){};
  var hoy=fechaHoyCL();
  var _l=R.useState(lunesDe(hoy)),lunes=_l[0],setLunes=_l[1];
  var _d=R.useState(null),data=_d[0],setData=_d[1];
  var _q=R.useState(''),q=_q[0],setQ=_q[1];
  var _o=R.useState('total'),orden=_o[0],setOrden=_o[1];
  var _f=R.useState({}),forms=_f[0],setForms=_f[1];
  var _g=R.useState(0),gen=_g[0],setGen=_g[1];
  var _ab=R.useState(null),abierto=_ab[0],setAbierto=_ab[1];
  var sem=infoSemana(lunes);
  var quien=(A.perfil&&(A.perfil.nombre||A.perfil.usuario))||'Administrador';

  R.useEffect(function(){
    var vivo=true;setData(null);
    Promise.all([
      db.rpc('entregados_por_mensajero_comuna',{p_desde:sem.desde,p_hasta:sem.hasta}),
      db.from('mensajeros').select('nombre,tarifa,extra_periferia,periferia_paga_a,extra_comuna,extra_comuna_tarifa,activo'),
      db.from('movimientos_pago_mensajero').select('*').lte('semana',sem.desde).order('created_at',{ascending:true}),
      db.from('siniestros').select('id,codigo,mensajero,fecha_siniestro,nota,descontado_mensajero,descartado').or('descontado_mensajero.is.null,descontado_mensajero.eq.false').order('fecha_siniestro',{ascending:false}).limit(500),
      db.from('configuracion').select('valor').eq('clave','pago_semanal_excluidos').maybeSingle(),
      db.from('siniestros').select('id,codigo,mensajero,descontado_mensajero_valor,descontado_mensajero_fecha,descontado_mensajero_por').eq('descontado_mensajero',true).like('descontado_mensajero_semana',dmy(sem.desde)+'%')
    ]).then(function(r){
      if(!vivo)return;
      var err=r.slice(0,3).find(function(x){return x.error;});if(err){toast('Error cargando pago semanal: '+err.error.message);setData({error:true});return;}
      var porComuna={};(r[0].data||[]).forEach(function(x){var n=norm(x.mensajero);if(!n)return;(porComuna[n]=porComuna[n]||{})[x.comuna||'']=(+x.n||0);});
      var cfg={};(r[1].data||[]).forEach(function(m){var k=norm(m.nombre);if(cfg[k]&&cfg[k].activo!==false&&m.activo===false)return;cfg[k]=m;}); // si hay filas duplicadas manda la activa
      var movsSem={},saldo={};
      (r[2].data||[]).forEach(function(m){var n=norm(m.mensajero);
        if(m.semana===sem.desde){(movsSem[n]=movsSem[n]||[]).push(m);}
        else{saldo[n]=(saldo[n]||0)+(m.tipo==='prestamo'?(+m.monto||0):m.tipo==='abono_prestamo'?-(+m.monto||0):0);}});
      var sinP={};(r[3].data||[]).forEach(function(s){if(s.descartado)return;var n=norm(s.mensajero);if(!n)return;(sinP[n]=sinP[n]||[]).push(s);});
      // siniestros descontados desde la sección Siniestros para esta semana (si no tienen ya su movimiento)
      (r[5]&&r[5].data||[]).forEach(function(s){var n=norm(s.mensajero);if(!n)return;var ya=(movsSem[n]||[]).some(function(m){return m.codigo===s.codigo;});if(ya)return;(movsSem[n]=movsSem[n]||[]).push({id:'s'+s.id,virtual:true,semana:sem.desde,mensajero:n,tipo:'siniestro',monto:+s.descontado_mensajero_valor||0,codigo:s.codigo,nota:'desde Siniestros',fecha:s.descontado_mensajero_fecha?String(s.descontado_mensajero_fecha).slice(0,10):sem.desde,creado_por:s.descontado_mensajero_por||''});});
      var excl=((r[4]&&r[4].data&&r[4].data.valor)||['ELY MENSAJERO','FERNANDOCHECK','FERNANDO CHECK']).map(norm);
      setData({porComuna:porComuna,cfg:cfg,movs:movsSem,saldo:saldo,siniestros:sinP,excluidos:excl});
    }).catch(function(e){if(vivo){toast('Error: '+(e&&e.message||e));setData({error:true});}});
    return function(){vivo=false;};
  },[lunes,gen]);

  function recargar(){setGen(function(g){return g+1;});}
  function setForm(n,o){setForms(function(p){var x=Object.assign({},p);x[n]=Object.assign({tipo:'adelanto',monto:'',nota:'',codigo:''},p[n]||{},o);return x;});}
  function agregar(nombre){
    var f=forms[nombre]||{};var monto=Math.round(+String(f.monto||'').replace(/[^\d]/g,'')||0);
    if(!monto){toast('Ingresa un monto');return;}
    if(f.tipo==='siniestro'&&!f.codigo){toast('Indica el código del paquete siniestrado');return;}
    db.from('movimientos_pago_mensajero').insert({semana:sem.desde,mensajero:nombre,tipo:f.tipo||'adelanto',monto:monto,nota:(f.nota||'').trim()||null,codigo:(f.codigo||'').trim()||null,fecha:hoy,creado_por:quien}).then(function(r){
      if(r.error){toast('No se guardó: '+r.error.message);return;}
      if(f.tipo==='siniestro'&&f.sinId){db.from('siniestros').update({descontado_mensajero:true,descontado_mensajero_fecha:hoy,descontado_mensajero_semana:dmy(sem.desde)+' al '+dmy(sem.hasta),descontado_mensajero_valor:monto,descontado_mensajero_por:quien}).eq('id',f.sinId).then(function(){});}
      toast(TIPOS[f.tipo||'adelanto'].l+' registrado a '+tit(nombre));setForm(nombre,{monto:'',nota:'',codigo:'',sinId:null});recargar();
    });
  }
  function borrar(m){
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
    Object.keys(nombres).forEach(function(n){var c=calcular(n,data.cfg[n],data.porComuna,data.movs[n],data.cfg,data.saldo[n]);c.nombre=n;c.movs=data.movs[n]||[];c.sin=data.siniestros[n]||[];
      if(!c.entregas&&!c.movs.length&&!c.saldoPrestamo&&!c.perRecibidas)return;
      (data.excluidos.indexOf(n)>=0?excluidas:filas).push(c);});
    filas.sort(function(a,b){return orden==='nombre'?a.nombre.localeCompare(b.nombre):b.total-a.total;});
  }
  var vis=filas.filter(function(c){return !q||c.nombre.indexOf(norm(q))>=0;});
  var T=filas.reduce(function(a,c){a.ent+=c.entregas;a.sem+=c.totalSemana;a.ex+=c.t.extra;a.de+=c.descuentos;a.tot+=c.total;a.pr+=c.saldoPrestamo;a.ade+=c.t.adelanto+c.t.abono_prestamo;return a;},{ent:0,sem:0,ex:0,de:0,tot:0,pr:0,ade:0});

  function exportar(){
    var rows=filas.slice().sort(function(a,b){return a.nombre.localeCompare(b.nombre);}).map(function(c){return[c.nombre,c.entregas,c.tarifa,c.base,c.extraPer+c.perRecibidas,c.extraComuna,c.t.extra,c.t.adelanto,c.t.consumo,c.t.descuento+c.t.siniestro,c.t.abono_prestamo,c.saldoPrestamo,c.total];});
    var det=[];filas.forEach(function(c){c.movs.forEach(function(m){det.push([c.nombre,dmy(m.fecha),TIPOS[m.tipo].l,(TIPOS[m.tipo].s<0?-1:1)*m.monto,m.codigo||'',m.nota||'',m.creado_por||'']);});});
    A.exportToExcel('Pago_semanal_'+sem.desde+'_al_'+sem.hasta,[
      {name:'Pago semanal',headers:['Mensajero','Entregas','Tarifa','Total semana','Periferia','Extra comuna','Extra','Adelanto','Consumo','Descuento/Siniestro','Abono préstamo','Préstamo pendiente','Total a pagar'],rows:rows,totalsRow:['TOTAL',T.ent,'',filas.reduce(function(a,c){return a+c.base;},0),filas.reduce(function(a,c){return a+c.extraPer+c.perRecibidas;},0),filas.reduce(function(a,c){return a+c.extraComuna;},0),T.ex,filas.reduce(function(a,c){return a+c.t.adelanto;},0),filas.reduce(function(a,c){return a+c.t.consumo;},0),filas.reduce(function(a,c){return a+c.t.descuento+c.t.siniestro;},0),filas.reduce(function(a,c){return a+c.t.abono_prestamo;},0),T.pr,T.tot]},
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
    c.movs.forEach(function(m){if(m.tipo==='prestamo')return;lin+=fila(TIPOS[m.tipo].l+(m.codigo?' · '+e(m.codigo):'')+(m.nota?' <span style="color:#888">('+e(m.nota)+')</span>':''),dmy(m.fecha),m.monto,TIPOS[m.tipo].s<0);});
    var cuerpo='<div class="sec"><h2>1. Detalle del pago</h2><table class="tabla"><thead><tr><th>Concepto</th><th style="text-align:right">Detalle</th><th style="text-align:right">Monto</th></tr></thead><tbody>'+lin
      +'<tr><td style="font-weight:800;background:#F5F0E0;border-top:2px solid #C8A84B">Total a pagar</td><td style="background:#F5F0E0;border-top:2px solid #C8A84B"></td><td style="text-align:right;font-weight:800;background:#F5F0E0;border-top:2px solid #C8A84B;font-family:JetBrains Mono,monospace">'+fmt(c.total)+'</td></tr></tbody></table></div>';
    if(c.saldoPrestamo||c.t.prestamo)cuerpo+='<div class="sec"><h2>2. Préstamo</h2><table class="tabla"><tbody>'+fila('Saldo anterior','',c.saldoPrevio)+fila('Préstamos nuevos esta semana','',c.t.prestamo)+fila('Abonado esta semana','',c.t.abono_prestamo,true)+fila('<b>Saldo pendiente</b>','',c.saldoPrestamo)+'</tbody></table></div>';
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
        kpi('Descuentos',fmt(T.de),'#ff8f86','adelantos, consumos, descuentos'),
        kpi('Total a pagar',fmt(T.tot),'#7ee0ad','con descuentos'),
        kpi('Préstamos pendientes',fmt(T.pr),'#b39ddb'))),
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
              h('b',{className:'mono',style:{fontSize:13,color:T0.s>0?'#2e7d4f':T0.s<0?'#b03030':'#1565c0'}},(T0.s>0?'+':T0.s<0?'-':'')+fmt(m.monto)),
              h('span',{onClick:function(){borrar(m);},title:'Eliminar',style:{cursor:'pointer',color:'#b03030',fontWeight:900,padding:'0 4px'}},'×'));})):null,
          (c.saldoPrestamo||c.saldoPrevio)?h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,margin:'6px 0',padding:'8px 10px',borderRadius:10,background:'rgba(21,101,192,.07)',border:'1px solid rgba(21,101,192,.25)',fontSize:12.5}},
            h('span',null,'Préstamo pendiente',c.saldoPrevio!==c.saldoPrestamo?h('span',{style:{color:'var(--text-soft)',marginLeft:6}},'(antes '+fmt(c.saldoPrevio)+')'):null),
            h('b',{className:'mono',style:{color:'#1565c0'}},fmt(c.saldoPrestamo))):null,
          // siniestros pendientes de descontar
          c.sin.length?h('div',{style:{margin:'6px 0',padding:'8px 10px',borderRadius:10,background:'rgba(211,47,47,.06)',border:'1px solid rgba(211,47,47,.25)'}},
            h('div',{style:{fontSize:11.5,fontWeight:800,color:'#b03030',marginBottom:4}},c.sin.length+' siniestro(s) sin descontar'),
            c.sin.slice(0,4).map(function(s){return h('div',{key:s.id,style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,fontSize:12,padding:'2px 0'}},
              h('span',{className:'mono'},s.codigo,h('span',{style:{color:'var(--text-soft)',marginLeft:6,fontFamily:'DM Sans'}},s.fecha_siniestro?dm(String(s.fecha_siniestro).slice(0,10)):'')),
              h('a',{href:'#',onClick:function(ev){ev.preventDefault();setAbierto(c.nombre);setForm(c.nombre,{tipo:'siniestro',codigo:s.codigo,sinId:s.id,nota:'Siniestro '+s.codigo});},style:{color:'#b03030',fontWeight:800}},'Descontar'));})):null,
          // agregar movimiento
          ab?h('div',{style:{margin:'10px 0 4px',padding:12,borderRadius:14,background:'#fff',border:'1px solid rgba(200,168,75,.4)'}},
            h('div',{style:{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}},ORDEN_TIPOS.map(function(k){var a=(f.tipo||'adelanto')===k;var T0=TIPOS[k];return h('button',{key:k,type:'button',onClick:function(){setForm(c.nombre,{tipo:k});},style:{padding:'5px 10px',borderRadius:999,border:'1px solid '+(a?T0.c:'var(--border)'),background:a?T0.c:'#fff',color:a?'#fff':'var(--dark)',fontSize:11.5,fontWeight:800,cursor:'pointer'}},T0.l);})),
            h('div',{style:{fontSize:11.5,color:'var(--text-soft)',marginBottom:8}},AYUDA[f.tipo||'adelanto']),
            h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
              h('input',{className:'form-input',inputMode:'numeric',placeholder:'Monto',value:f.monto,onChange:function(e){setForm(c.nombre,{monto:e.target.value});},onKeyDown:function(e){if(e.key==='Enter')agregar(c.nombre);},style:{margin:0,width:120,fontFamily:'JetBrains Mono'}}),
              (f.tipo==='siniestro')?h('input',{className:'form-input',placeholder:'Código',value:f.codigo,onChange:function(e){setForm(c.nombre,{codigo:e.target.value});},style:{margin:0,width:140}}):null,
              h('input',{className:'form-input',placeholder:'Nota (opcional)',value:f.nota,onChange:function(e){setForm(c.nombre,{nota:e.target.value});},onKeyDown:function(e){if(e.key==='Enter')agregar(c.nombre);},style:{margin:0,flex:'1 1 140px'}}),
              h('button',{type:'button',className:'btn-futurista btn-f-success',onClick:function(){agregar(c.nombre);},style:{padding:'8px 14px'}},'Agregar'),
              h('button',{type:'button',className:'btn-futurista btn-f-ghost',onClick:function(){setAbierto(null);},style:{padding:'8px 12px'}},'Cerrar'))):
          h('div',{style:{display:'flex',gap:8,margin:'10px 0 4px'}},
            h('button',{type:'button',className:'btn-futurista btn-f-ghost',onClick:function(){setAbierto(c.nombre);},style:{flex:1,padding:'9px 12px'}},'+ Adelanto, consumo, extra o descuento'),
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
