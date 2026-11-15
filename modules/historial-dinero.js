// Administración → Historial de cambios (15-11-2026) — solo superadmin.
// Cada cambio en tarifas, préstamos, adelantos, consumos, descuentos, cierres de pago, cobros,
// siniestros, comisiones y configuración queda registrado por un trigger en la base
// (historial_dinero): quién, cuándo, qué campo y el valor antes y después.
(function(){
var A=window.__app||{};var db=A.db;var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo;
var ORO='#e8c766',TXT='#f1ecda',SUAVE='rgba(233,228,210,.65)',VERDE='#36c47f',ROJO='#ff5a5a',NAR='#ff9d5c',AZUL='#5b8def';
var caja={borderRadius:20,background:'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 50%,#15180f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 18px 38px rgba(20,22,15,.25), inset 0 1px 0 rgba(255,255,255,.07)',color:TXT};
var css='.hd-btn{transition:filter .12s;cursor:pointer}.hd-btn:hover{filter:brightness(1.1)}.hd-in{padding:7px 10px;border-radius:10px;border:1px solid rgba(232,199,102,.4);background:rgba(255,255,255,.95);font-size:13px;color:#1a1d13;outline:none}'+
 '.hd-tab{width:100%;border-collapse:collapse;font-size:12.5px}.hd-tab th{text-align:left;padding:8px 10px;font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:#e8c766;background:rgba(0,0,0,.25);white-space:nowrap;position:sticky;top:0}'+
 '.hd-tab tbody tr td{padding:8px 10px;border-top:1px solid rgba(255,255,255,.06);color:#f1ecda;background:transparent!important;vertical-align:top}.hd-tab tbody tr:hover td{background:rgba(232,199,102,.05)!important}';
var TABLAS={tarifas_comunas:'Tarifa por comuna',mensajeros:'Ficha mensajero',clientes:'Ficha cliente',prestamos_mensajeros:'Préstamo',adelantos_mensajeros:'Adelanto',consumos_mensajeros:'Consumo',
  movimientos_pago_mensajero:'Movimiento de pago',cierres_semanales:'Cierre semanal',pagos_mensajeros_semanales:'Pago semanal guardado',semanas_pagadas:'Semana pagada',siniestros:'Siniestro',
  recibos_cobro:'Recibo de cobro',soporte_firmas_pagos:'Pago de operadores',secciones_tarifa_cliente:'Tarifa sección cliente',secciones_tarifa_mensajero:'Tarifa sección mensajero',
  configuracion:'Configuración',reportes_operador:'Descuento por incidencia',retiros:'Retiro (pago/cobro)',conciliacion_meses:'Cierre de conciliación',cuentas_contraparte:'Directorio bancario'};
var CAMPOS={tarifa:'Tarifa',tarifa_retiro:'Tarifa retiro',extra_periferia:'Extra periferia',periferia_paga_a:'Periferia paga a',extra_comuna:'Extra comuna',extra_comuna_tarifa:'Tarifa extra comuna',
  activo:'Activo',paga_iva:'Paga IVA',tarifa_colecta:'Tarifa colecta',tarifa_10kg:'Tarifa >10 kg',tarifa_18kg:'Tarifa >18 kg',tarifa_colina:'Tarifa Colina',tarifa_ph:'Tarifa Padre Hurtado',
  ciclo_pago:'Ciclo de pago',dias_pago:'Días de pago',monto_prestado:'Monto prestado',monto_descontado:'Descontado',saldo_pendiente:'Saldo pendiente',monto_adelanto:'Adelanto',monto:'Monto',
  precio_unitario:'Precio unitario',cantidad:'Cantidad',pago_bruto:'Pago bruto',total_pagado:'Total pagado',prestamo_descontado:'Préstamo descontado',bono_efectividad:'Bono efectividad',
  descuento_efectividad:'Descuento efectividad',a_descuento:'Va a descuento',descuento_envios:'Envíos a descontar',descuento_monto:'Monto descuento',descontado:'Descontado',
  comision_operador:'Operador comisión',comision_monto:'Comisión',pago_mensajero:'Pago mensajero',cobro:'Cobro',piezas:'Piezas',ajuste_monto:'Ajuste',ajuste_nota:'Nota ajuste',valor:'Valor',estado:'Estado',nota:'Nota'};
function fh(s){return new Date(s).toLocaleString('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});}
function val(v){if(v==null)return '—';if(typeof v==='boolean')return v?'Sí':'No';if(typeof v==='number')return Math.abs(v)>=100?Math.round(v).toLocaleString('es-CL'):String(v);
  if(typeof v==='object')return JSON.stringify(v).slice(0,120);var s=String(v);if(/^\d{4}-\d{2}-\d{2}T/.test(s))return fh(s);return s.length>120?s.slice(0,120)+'…':s;}
var ACC={insert:['Creado',VERDE],update:['Modificado',ORO],delete:['Eliminado',ROJO]};

function HistorialDinero(props){
  var toast=props.toast||function(){};
  var _d=useState(30),dias=_d[0],setDias=_d[1];var _r=useState(null),rows=_r[0],setRows=_r[1];
  var _t=useState(''),fTab=_t[0],setFTab=_t[1];var _q=useState(''),q=_q[0],setQ=_q[1];var _u=useState(''),fUsr=_u[0],setFUsr=_u[1];
  async function cargar(){setRows(null);var desde=new Date(Date.now()-dias*864e5).toISOString(),out=[],from=0;
    try{for(;;){var qq=db.from('historial_dinero').select('*').gte('created_at',desde).order('created_at',{ascending:false});if(fTab)qq=qq.eq('tabla',fTab);
      var r=await qq.range(from,from+999);if(r.error)throw r.error;out=out.concat(r.data||[]);if(!r.data||r.data.length<1000||out.length>=10000)break;from+=1000;}setRows(out);}
    catch(e){toast('No se pudo cargar: '+(e.message||e));setRows([]);}}
  useEffect(function(){cargar();},[dias,fTab]);
  var usuarios=useMemo(function(){var o={};(rows||[]).forEach(function(r){if(r.usuario)o[r.usuario]=1;});return Object.keys(o).sort();},[rows]);
  var lista=(rows||[]).filter(function(r){if(fUsr&&r.usuario!==fUsr)return false;if(q){var s=q.toLowerCase();return ((r.referencia||'')+' '+(r.registro||'')+' '+JSON.stringify(r.cambios||{})).toLowerCase().indexOf(s)>=0;}return true;});
  function excel(){if(!window.XLSX){toast('El lector de Excel aún no carga');return;}
    var filas=[];lista.forEach(function(r){var c=r.cambios||{};var ks=Object.keys(c);if(!ks.length)ks=[''];ks.forEach(function(k){filas.push({Fecha:fh(r.created_at),Usuario:r.usuario||'',Área:TABLAS[r.tabla]||r.tabla,Acción:(ACC[r.accion]||[r.accion])[0],
      'Quién / qué':r.referencia||'',Registro:r.registro||'',Campo:CAMPOS[k]||k,Antes:k?val(c[k][0]):'',Después:k?val(c[k][1]):''});});});
    var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(filas),'Historial');XLSX.writeFile(wb,'historial_cambios_'+new Date().toISOString().slice(0,10)+'.xlsx');}
  return h('div',{style:{display:'flex',flexDirection:'column',gap:16}},h('style',null,css),
    h('div',{style:Object.assign({},caja,{padding:'18px 20px'})},
      h('div',{style:{fontFamily:'Bebas Neue',fontSize:32,letterSpacing:2.4,color:'#fff',lineHeight:1}},'Historial de cambios'),
      h('div',{style:{fontSize:12.5,color:SUAVE,marginTop:4}},'Quién cambió tarifas, préstamos, adelantos, consumos, descuentos, cierres de pago, cobros y configuración, cuándo, y el valor antes y después. Se registra solo desde la base.'),
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginTop:14}},
        [[7,'7 días'],[30,'30 días'],[90,'90 días']].map(function(o){var act=dias===o[0];return h('button',{key:o[0],type:'button',className:'hd-btn',onClick:function(){setDias(o[0]);},style:{padding:'6px 12px',borderRadius:999,border:'1px solid '+(act?'#f7dd8c':'rgba(255,255,255,.14)'),background:act?'rgba(232,199,102,.2)':'transparent',color:TXT,fontWeight:800,fontSize:12}},o[1]);}),
        h('select',{className:'hd-in',value:fTab,onChange:function(e){setFTab(e.target.value);}},h('option',{value:''},'Todas las áreas'),Object.keys(TABLAS).map(function(k){return h('option',{key:k,value:k},TABLAS[k]);})),
        h('select',{className:'hd-in',value:fUsr,onChange:function(e){setFUsr(e.target.value);}},h('option',{value:''},'Todos los usuarios'),usuarios.map(function(u){return h('option',{key:u,value:u},u);})),
        h('input',{className:'hd-in',placeholder:'Buscar mensajero, cliente, monto…',value:q,onChange:function(e){setQ(e.target.value);},style:{width:220}}),
        h('button',{type:'button',className:'hd-btn',onClick:excel,style:{marginLeft:'auto',padding:'8px 14px',borderRadius:10,border:'1px solid #f7dd8c',background:'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)',color:'#1a1d13',fontWeight:900,fontSize:12.5}},'Descargar Excel'))),
    h('div',{style:Object.assign({},caja,{padding:0,overflow:'hidden'})},
      rows==null?h('div',{style:{padding:'20px 18px',color:SUAVE}},'Cargando…'):lista.length===0?h('div',{style:{padding:'20px 18px',color:SUAVE}},'Sin cambios registrados en el período. El registro empezó el 15-11-2026.'):
      h('div',{style:{overflow:'auto',maxHeight:'70vh'}},h('table',{className:'hd-tab'},h('thead',null,h('tr',null,['Fecha','Usuario','Área','Quién / qué','Acción','Cambio'].map(function(c){return h('th',{key:c},c);}))),
        h('tbody',null,lista.slice(0,1500).map(function(r){var a=ACC[r.accion]||[r.accion,'#9aa08a'],c=r.cambios||{};var ks=Object.keys(c);
          return h('tr',{key:r.id},h('td',{style:{whiteSpace:'nowrap'}},fh(r.created_at)),h('td',{style:{fontWeight:800}},r.usuario||'—'),h('td',null,TABLAS[r.tabla]||r.tabla),
            h('td',null,r.referencia||'—',r.registro&&r.registro!==r.referencia&&h('div',{style:{fontSize:11,color:SUAVE}},'#'+r.registro)),
            h('td',null,h('span',{style:{color:a[1],fontWeight:900}},a[0])),
            h('td',null,r.accion==='update'?ks.map(function(k){return h('div',{key:k},h('span',{style:{color:SUAVE}},(CAMPOS[k]||k)+': '),h('span',{style:{textDecoration:'line-through',opacity:.6}},val(c[k][0])),' → ',h('b',{style:{color:ORO}},val(c[k][1])));}):
              h('div',{style:{fontSize:12,color:SUAVE}},ks.filter(function(k){return ['monto','monto_prestado','monto_adelanto','tarifa','total_pagado','valor','comuna','estado','nota','semana','producto','cobro','pago_mensajero'].indexOf(k)>=0;}).map(function(k){return (CAMPOS[k]||k)+' '+val(c[k][r.accion==='delete'?0:1]);}).join(' · ')||'—')));})))),
      lista.length>1500&&h('div',{style:{padding:'10px 18px',fontSize:12,color:SUAVE}},'Mostrando 1.500 de '+lista.length+'. Usa los filtros o descarga el Excel para ver todo.'))
  );
}
window.HistorialDinero=HistorialDinero;
})();
