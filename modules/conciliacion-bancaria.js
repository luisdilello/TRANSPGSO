// Administración → Conciliación Bancaria (13-11-2026) — solo superadmin.
// Cruza la cartola del banco (cuenta corriente) con lo que se debía pagar y cobrar:
//  - Mensajeros: lo transferido contra el ARCHIVO DE PAGO semanal de Luis (hoja "DETALLE DE PAGO").
//    Semana lunes→domingo; la nómina se paga el jueves siguiente al cierre (miércoles a viernes
//    cuentan como nómina). Un pago fuera de nómina es anticipo y se asigna a la nómina siguiente.
//  - Clientes: abonos contra la producción del período según el ciclo de pago de cada cliente.
//  - Socio: retiros de Luis con saldo arrastrado.
// El directorio de contrapartes (nombres, RUT, sueldos) vive SOLO en la base (cuentas_contraparte),
// nunca en este archivo: el repositorio es público.
(function(){
var A=window.__app||{};var db=A.db;var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo;
var ORO='#e8c766',TXT='#f1ecda',SUAVE='rgba(233,228,210,.65)',VERDE='#36c47f',ROJO='#ff5a5a',NAR='#ff9d5c',AZUL='#5b8def';
var CUENTA='0-000-9784496-8';
var caja={position:'relative',borderRadius:20,background:'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 50%,#15180f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 18px 38px rgba(20,22,15,.25), inset 0 1px 0 rgba(255,255,255,.07)',color:TXT};
var vid={borderRadius:14,background:'linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.1)'};
var css='.cb-btn{transition:transform .12s,filter .12s;cursor:pointer}.cb-btn:hover{filter:brightness(1.08)}.cb-btn:active{transform:translateY(1px)}.cb-btn:disabled{opacity:.45;cursor:default}'+
 '.cb-in{padding:8px 10px;border-radius:10px;border:1px solid rgba(232,199,102,.4);background:rgba(255,255,255,.95);font-size:13px;color:#1a1d13;outline:none}'+
 '.cb-tab{width:100%;border-collapse:collapse;font-size:12.5px;table-layout:auto}.cb-tab th{text-align:left;padding:8px 10px;font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:#e8c766;background:rgba(0,0,0,.25);white-space:nowrap}'+
 '.cb-tab tbody tr td{padding:8px 10px;border-top:1px solid rgba(255,255,255,.06);color:#f1ecda;background:transparent!important;vertical-align:top}.cb-tab tbody tr:hover td{background:rgba(232,199,102,.05)!important}'+
 '.cb-drop{border:2px dashed rgba(232,199,102,.45);border-radius:16px;padding:18px;text-align:center;cursor:pointer;transition:all .15s}.cb-drop:hover{border-color:#f7dd8c;background:rgba(232,199,102,.06)}'+
 '@media (max-width:760px){.cb-k{grid-template-columns:repeat(2,1fr)!important}.cb-2{grid-template-columns:1fr!important}}';

// ── utilidades ──
function money(n){var v=Math.round(+n||0);return (v<0?'-$':'$')+Math.abs(v).toLocaleString('es-CL');}
function pad(n){return (n<10?'0':'')+n;}
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function dmy(s){return s?String(s).slice(0,10).split('-').reverse().join('-'):'';}
function D(s){return new Date(String(s).slice(0,10)+'T12:00:00');}
function sumar(s,n){var d=D(s);d.setDate(d.getDate()+n);return iso(d);}
function norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/,/g,' ').replace(/\s+/g,' ').trim().toUpperCase();}
function mesDe(s){return String(s).slice(0,7);}
function nomMes(m){var M=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];var p=m.split('-');return M[+p[1]-1]+' '+p[0];}
function rutDe(desc){var m=String(desc||'').trim().match(/^0*(\d{7,9}[\dkK])\b/);return m?m[1].toUpperCase():null;}
function numero(v){if(typeof v==='number')return v;var s=String(v==null?'':v).trim();if(!s)return NaN;var neg=/^-|\(.*\)$/.test(s);s=s.replace(/[^\d,.-]/g,'');
  if(s.indexOf(',')>=0&&s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'');
  var n=parseFloat(s.replace(/-/g,''));return isNaN(n)?NaN:(neg?-n:n);}
function fecha(v){if(v instanceof Date)return iso(v);if(typeof v==='number'){var d=new Date(Math.round((v-25569)*86400000));return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate());}
  var s=String(v||'').trim();var m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);if(m){var y=+m[3];if(y<100)y+=2000;return y+'-'+pad(+m[2])+'-'+pad(+m[1]);}
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[0]:null;}
// Nómina: miércoles a viernes = nómina del jueves de esa semana; otro día = anticipo → jueves siguiente.
function nominaDe(f){var d=D(f),dow=d.getDay();var es=dow>=3&&dow<=5;var add=es?(4-dow):((4-dow+7)%7||7);d.setDate(d.getDate()+add);var N=iso(d);return {jueves:N,esNomina:es,inicio:sumar(N,-10),fin:sumar(N,-4)};}
async function todo(q){var out=[],from=0;for(;;){var r=await q().range(from,from+999);if(r.error)throw r.error;out=out.concat(r.data||[]);if(!r.data||r.data.length<1000)break;from+=1000;}return out;}

// ── lectura de la cartola (dos formatos del banco) ──
function leerCartola(wb){
  var mejor=null;
  wb.SheetNames.forEach(function(sn){
    var rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null});
    for(var i=0;i<Math.min(rows.length,60);i++){
      var r=(rows[i]||[]).map(function(c){return norm(c);});
      var iM=r.findIndex(function(c){return c==='MONTO';}),iD=r.findIndex(function(c){return c.indexOf('DESCRIP')===0;}),iF=r.findIndex(function(c){return c==='FECHA';});
      if(iM>=0&&iD>=0&&iF>=0){mejor={rows:rows,hi:i,cab:r,sheet:sn};break;}
    }
  });
  if(!mejor)throw new Error('No encontré las columnas MONTO, DESCRIPCIÓN y FECHA en el archivo.');
  var c=mejor.cab,col=function(f){return c.findIndex(f);};
  var iM=col(function(x){return x==='MONTO';}),iD=col(function(x){return x.indexOf('DESCRIP')===0;}),iF=col(function(x){return x==='FECHA';}),
      iS=col(function(x){return x==='SALDO';}),iDoc=col(function(x){return x.indexOf('DOCUMENTO')>=0;}),iSuc=col(function(x){return x.indexOf('SUCURSAL')>=0;}),
      iCA=col(function(x){return x.indexOf('CARGO')>=0;}),iMov=col(function(x){return x.indexOf('MOVIMIENTO')>=0;});
  var movs=[];
  for(var k=mejor.hi+1;k<mejor.rows.length;k++){
    var r=mejor.rows[k]||[];var f=fecha(r[iF]),m=numero(r[iM]);if(!f||isNaN(m)||!String(r[iD]==null?'':r[iD]).trim())continue;
    var ca=norm(iCA>=0?r[iCA]:'');var tipo=ca.indexOf('ABONO')===0||ca==='A'?'abono':(ca.indexOf('CARGO')===0||ca==='C'?'cargo':(m<0?'cargo':'abono'));
    movs.push({fecha:f,monto:Math.abs(m),tipo:tipo,descripcion:String(r[iD]).replace(/\s+/g,' ').trim(),n_documento:iDoc>=0&&r[iDoc]!=null?String(r[iDoc]).trim():null,
      sucursal:iSuc>=0&&r[iSuc]!=null?String(r[iSuc]).trim():null,n_movimiento:iMov>=0&&r[iMov]!=null?String(r[iMov]).trim():null,saldo:iS>=0?numero(r[iS]):null,_ord:k});
  }
  if(!movs.length)throw new Error('El archivo no tiene movimientos.');
  // saldos escritos en el encabezado (cartola histórica): "SALDO INICIAL/ANTERIOR" y "SALDO FINAL/DISPONIBLE/CONTABLE"
  var sIni=null,sFin=null;
  for(var a=0;a<mejor.hi;a++){var rr=mejor.rows[a]||[];for(var b=0;b<rr.length;b++){var t=norm(rr[b]);if(!t)continue;
    var val=null;for(var z=b+1;z<rr.length;z++){var n=numero(rr[z]);if(!isNaN(n)&&rr[z]!==''){val=n;break;}}
    if(val==null&&mejor.rows[a+1]){var n2=numero(mejor.rows[a+1][b]);if(!isNaN(n2))val=n2;}
    if(val==null)continue;if(/SALDO (INICIAL|ANTERIOR)/.test(t))sIni=val;else if(/SALDO (FINAL|DISPONIBLE|CONTABLE|ACTUAL)/.test(t))sFin=val;}}
  return {movs:movs,formato:iS>=0?'consulta':'historica',sIni:sIni,sFin:sFin};
}
// Valida saldos: con columna SALDO revisa movimiento a movimiento (el archivo puede venir en orden
// ascendente o descendente); sin ella usa saldo inicial/final del encabezado o los que ingrese Luis.
function validar(c,sIniMan,sFinMan){
  var mv=c.movs,ab=0,ca=0;mv.forEach(function(m){if(m.tipo==='abono')ab+=m.monto;else ca+=m.monto;});
  if(c.formato==='consulta'&&mv.every(function(m){return m.saldo!=null&&!isNaN(m.saldo);})){
    function prueba(lista){for(var i=1;i<lista.length;i++){var esp=lista[i-1].saldo+(lista[i].tipo==='abono'?lista[i].monto:-lista[i].monto);if(Math.abs(esp-lista[i].saldo)>1)return false;}return true;}
    var asc=mv.slice().sort(function(a,b){return a._ord-b._ord;}),desc=asc.slice().reverse();
    var ord=prueba(asc)?asc:(prueba(desc)?desc:null);
    if(!ord)return {ok:false,msg:'Los saldos de la cartola no cuadran movimiento a movimiento.',ab:ab,ca:ca};
    var ini=ord[0].saldo-(ord[0].tipo==='abono'?ord[0].monto:-ord[0].monto),fin=ord[ord.length-1].saldo;
    return {ok:Math.abs(ini+ab-ca-fin)<=1,ini:ini,fin:fin,ab:ab,ca:ca,msg:'Saldo inicial + abonos − cargos = saldo final'};
  }
  var si=sIniMan!=null&&sIniMan!==''?numero(sIniMan):c.sIni,sf=sFinMan!=null&&sFinMan!==''?numero(sFinMan):c.sFin;
  if(si==null||sf==null||isNaN(si)||isNaN(sf))return {ok:false,falta:true,ab:ab,ca:ca,msg:'Ingresa el saldo inicial y final que muestra la cartola para validar.'};
  var dif=si+ab-ca-sf;return {ok:Math.abs(dif)<=1,ini:si,fin:sf,ab:ab,ca:ca,msg:Math.abs(dif)<=1?'Saldo inicial + abonos − cargos = saldo final':'No cuadra por '+money(dif)+'. Revisa el archivo o los saldos.'};
}
function huellas(movs){var vistos={};return movs.map(function(m){var base=[m.fecha,Math.round(m.monto),m.tipo,norm(m.descripcion),m.n_documento||''].join('|');vistos[base]=(vistos[base]||0)+1;return base+'#'+vistos[base];});}

// ── lectura del ARCHIVO DE PAGO semanal (hoja DETALLE DE PAGO) ──
function leerArchivoPago(wb,nombre){
  var ws=wb.Sheets['DETALLE DE PAGO']||wb.Sheets[wb.SheetNames.find(function(s){return /DETALLE DE PAGO/i.test(s);})];
  if(!ws)throw new Error('No encontré la hoja "DETALLE DE PAGO".');
  var rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
  var hi=-1,cM=-1,cols={};
  for(var i=0;i<Math.min(rows.length,40)&&hi<0;i++){var r=(rows[i]||[]).map(norm);var m=r.indexOf('MENSAJEROS');
    if(m>=0&&r.slice(m).indexOf('TOTAL A PAGAR')>=0){hi=i;cM=m;['TOTAL SEMANA','TOTAL ADELANTO','DESCUENTO','PRESTAMO PENDIENTE','EXTRA','CONSUMO','TOTAL A PAGAR'].forEach(function(k){cols[k]=r.indexOf(k,m);});}}
  if(hi<0)throw new Error('No encontré la tabla MENSAJEROS / TOTAL A PAGAR en DETALLE DE PAGO.');
  var mf=String(nombre).match(/(\d{1,2})-(\d{1,2})\s*AL\s*(\d{1,2})-(\d{1,2})/i);if(!mf)throw new Error('El nombre del archivo debe traer las fechas, ej. "ARCHIVO DE PAGO 02-11 AL 08-11".');
  var hoy=new Date(),y=hoy.getFullYear();var mi=+mf[2],mfn=+mf[4];var yi=y,yf=y;if(mi>hoy.getMonth()+2){yi--;yf--;}if(mfn<mi)yf=yi+1;
  var ini=yi+'-'+pad(mi)+'-'+pad(+mf[1]),fin=yf+'-'+pad(mfn)+'-'+pad(+mf[3]);
  if(D(ini).getDay()!==1)throw new Error('La semana del archivo debe empezar un lunes ('+dmy(ini)+' no lo es).');
  var envios={};rows.forEach(function(r){if(r&&cM>=3&&typeof r[cM-3]==='string'&&typeof r[cM-2]==='number')envios[norm(r[cM-3])]=r[cM-2];});
  var out=[];
  for(var k=hi+1;k<rows.length;k++){var r2=rows[k]||[];var nm=norm(r2[cM]);if(!nm)break;if(nm.indexOf('TOTAL')===0)continue;
    var v=function(key){var n=numero(r2[cols[key]]);return isNaN(n)?0:n;};
    out.push({semana_inicio:ini,semana_fin:fin,mensajero:nm,envios:envios[nm]||null,total_semana:v('TOTAL SEMANA'),adelanto:v('TOTAL ADELANTO'),descuento:v('DESCUENTO'),
      prestamo_pendiente:v('PRESTAMO PENDIENTE'),extra:v('EXTRA'),consumo:v('CONSUMO'),total_pagar:v('TOTAL A PAGAR'),archivo:nombre});}
  if(!out.length)throw new Error('La tabla de mensajeros está vacía.');
  return out;
}

function Chip(p){return h('span',{style:{display:'inline-flex',alignItems:'center',gap:6,padding:'3px 10px',borderRadius:999,background:p.c+'26',border:'1px solid '+p.c+'90',color:'#fff',fontSize:11.5,fontWeight:800,whiteSpace:'nowrap'}},h('span',{style:{width:7,height:7,borderRadius:'50%',background:p.c,boxShadow:'0 0 6px '+p.c}}),p.t);}
function btnOro(t,on,dis,x){return h('button',{type:'button',className:'cb-btn',onClick:on,disabled:dis,style:Object.assign({padding:'9px 16px',borderRadius:11,border:'1px solid #f7dd8c',background:'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)',color:'#1a1d13',fontWeight:900,fontSize:13,boxShadow:'0 3px 0 #6d531a,0 6px 14px rgba(200,168,75,.3),inset 0 1px 0 rgba(255,255,255,.55)',whiteSpace:'nowrap'},x||{})},t);}
function btnVid(t,on,dis,x){return h('button',{type:'button',className:'cb-btn',onClick:on,disabled:dis,style:Object.assign({padding:'8px 14px',borderRadius:10,border:'1px solid rgba(232,199,102,.4)',background:'rgba(255,255,255,.06)',color:TXT,fontWeight:800,fontSize:12.5,whiteSpace:'nowrap'},x||{})},t);}
function Titulo(p){return h('div',{id:p.id,style:{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:10,flexWrap:'wrap',marginBottom:10,scrollMarginTop:90}},
  h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:1.8,color:'#fff'}},p.t),p.s&&h('div',{style:{fontSize:12,color:SUAVE}},p.s)),p.der||null);}

function ConciliacionBancaria(props){
  var toast=props.toast||function(){};
  var hoy=iso(new Date());
  var _m=useState(hoy.slice(0,7)),mes=_m[0],setMes=_m[1];
  var _d=useState(null),dat=_d[0],setDat=_d[1];
  var _c=useState(false),cargando=_c[0],setCargando=_c[1];
  var _pend=useState(null),pend=_pend[0],setPend=_pend[1]; // cartola leída esperando validación/confirmación
  var _si=useState(''),sIni=_si[0],setSIni=_si[1];var _sf=useState(''),sFin=_sf[0],setSFin=_sf[1];
  var _busy=useState(false),busy=_busy[0],setBusy=_busy[1];
  var _asig=useState(null),asig=_asig[0],setAsig=_asig[1]; // {mov, tipo, vinculo, modo, patron}
  var _just=useState(null),just=_just[0],setJust=_just[1];
  var _fm=useState('pendientes'),fMov=_fm[0],setFMov=_fm[1];
  var _q=useState(''),q=_q[0],setQ=_q[1];
  var _dirN=useState(null),dirEd=_dirN[0],setDirEd=_dirN[1];

  async function cargar(){
    setCargando(true);
    try{
      var r=await Promise.all([
        todo(function(){return db.from('movimientos_banco').select('*').order('fecha',{ascending:true}).order('id',{ascending:true});}),
        db.from('cuentas_contraparte').select('*').order('tipo').order('vinculo'),
        todo(function(){return db.from('pagos_excel_semana').select('*').order('semana_inicio');}),
        db.from('prestamos_mensajeros').select('mensajero_nombre,monto_prestado,created_at,nota'),
        db.from('clientes').select('id,nombre,activo,tarifa,paga_iva,ciclo_pago').order('nombre'),
        db.from('conciliacion_meses').select('*'),
        db.from('cargas_cartola').select('*').order('created_at',{ascending:false}).limit(20),
        db.from('semanas_pagadas').select('*')]);
      setDat({movs:r[0],dir:(r[1].data||[]),excel:r[2],prest:(r[3].data||[]),clientes:(r[4].data||[]),meses:(r[5].data||[]),cargas:(r[6].data||[]),pagadas:(r[7].data||[])});
    }catch(e){toast('No se pudo cargar: '+(e.message||e));}
    setCargando(false);
  }
  useEffect(function(){cargar();},[]);

  // producción por cliente para el cálculo de cobro esperado (según ciclo)
  var _prod=useState({}),prod=_prod[0],setProd=_prod[1];
  useEffect(function(){
    var p=mes.split('-'),y=+p[0],mm=+p[1];var ini=mes+'-01',fin=iso(new Date(y,mm,0));var antI=iso(new Date(y,mm-2,1)),antF=iso(new Date(y,mm-1,0));
    Promise.all([db.rpc('conc_produccion_clientes',{p_desde:antI,p_hasta:antF}),db.rpc('conc_produccion_clientes',{p_desde:ini,p_hasta:fin}),
      db.rpc('conc_produccion_clientes',{p_desde:sumar(antF,-14),p_hasta:antF}),db.rpc('conc_produccion_clientes',{p_desde:ini,p_hasta:sumar(ini,14)})])
      .then(function(rs){var mapa=function(r){var o={};((r&&r.data)||[]).forEach(function(x){o[x.cliente]=+x.entregados;});return o;};setProd({ant:mapa(rs[0]),act:mapa(rs[1]),antQ2:mapa(rs[2]),actQ1:mapa(rs[3])});});
  },[mes]);

  // ── clasificación ──
  var dir=(dat&&dat.dir)||[];
  var exactas={},contiene=[];dir.forEach(function(d){if(!d.activo)return;if(d.modo==='exacta')exactas[norm(d.patron)]=d;else contiene.push(d);});
  contiene.sort(function(a,b){return b.patron.length-a.patron.length;});
  function contraparte(m){var k=norm(m.descripcion);if(exactas[k])return exactas[k];var ku=k;for(var i=0;i<contiene.length;i++){if(ku.indexOf(norm(contiene[i].patron))>=0)return contiene[i];}return null;}

  var movs=useMemo(function(){if(!dat)return [];return dat.movs.map(function(m){var c=contraparte(m);var o=Object.assign({},m,{_c:c,_rut:rutDe(m.descripcion)});
    if(c&&c.tipo==='mensajero'&&m.tipo==='cargo')o._nom=nominaDe(m.fecha);return o;});},[dat]);
  var delMes=movs.filter(function(m){return mesDe(m.fecha)===mes;});

  // saldo corrido (para alerta de saldo bajo): usa la columna saldo si viene; si no, arrastra desde la última carga validada
  var saldoDia=useMemo(function(){var o={},s=null;var cargas=((dat&&dat.cargas)||[]).slice().sort(function(a,b){return a.desde<b.desde?-1:1;});
    if(cargas.length)s=+cargas[0].saldo_inicial;var primer=cargas.length?cargas[0].desde:null;
    movs.forEach(function(m){if(primer&&m.fecha<primer)return;if(m.saldo!=null){s=+m.saldo;}else if(s!=null){s+=m.tipo==='abono'?+m.monto:-m.monto;}if(s!=null)o[m.fecha]=s;});return o;},[movs,dat]);
  function saldoAntesDe(f){var keys=Object.keys(saldoDia).filter(function(k){return k<f;}).sort();return keys.length?saldoDia[keys[keys.length-1]]:null;}

  // ── mensajeros por semana ──
  var excelPorSem={};((dat&&dat.excel)||[]).forEach(function(x){(excelPorSem[x.semana_inicio]=excelPorSem[x.semana_inicio]||{})[norm(x.mensajero)]=x;});
  var nominasMes={};movs.forEach(function(m){if(m._nom&&mesDe(m._nom.jueves)===mes)nominasMes[m._nom.jueves]=m._nom;});
  // también las semanas con archivo de pago cuyo jueves cae en el mes, aunque aún no haya pagos
  Object.keys(excelPorSem).forEach(function(ini){var N=sumar(ini,10);if(mesDe(N)===mes&&!nominasMes[N])nominasMes[N]={jueves:N,inicio:ini,fin:sumar(ini,6)};});
  var semanas=Object.keys(nominasMes).sort().map(function(N){var nm=nominasMes[N];var ex=excelPorSem[nm.inicio]||{};var filas={};
    Object.keys(ex).forEach(function(k){filas[k]={men:k,debia:+ex[k].total_pagar||0,adelantoEx:(+ex[k].descuento||0),nomina:0,anticipos:0,pagos:[],ex:ex[k]};});
    movs.forEach(function(m){if(!m._nom||m._nom.jueves!==N)return;var k=norm(m._c.vinculo);var f=filas[k]=filas[k]||{men:k,debia:null,adelantoEx:0,nomina:0,anticipos:0,pagos:[]};
      if(m._nom.esNomina)f.nomina+=+m.monto;else f.anticipos+=+m.monto;f.pagos.push(m);});
    var lista=Object.keys(filas).map(function(k){var f=filas[k];f.dif=f.debia==null?null:f.nomina-f.debia;
      f.nPagosNomina=f.pagos.filter(function(p){return p._nom.esNomina;}).length;
      f.anticipoSinPrest=f.pagos.filter(function(p){if(p._nom.esNomina)return false;return !((dat.prest||[]).some(function(x){return norm(x.mensajero_nombre)===k&&Math.abs(D(String(x.created_at).slice(0,10))-D(p.fecha))<=15*864e5;}))&&!(f.adelantoEx>0);});
      f.estado=f.debia==null?(f.nomina?'sin_archivo':'—'):(Math.abs(f.dif)<=1?'ok':(f.dif>0?'sobrepago':'falta'));return f;}).sort(function(a,b){return a.men.localeCompare(b.men);});
    var tot=lista.reduce(function(a,f){a.debia+=f.debia||0;a.nom+=f.nomina;a.ant+=f.anticipos;return a;},{debia:0,nom:0,ant:0});
    var saldoPrev=saldoAntesDe(N);
    return {N:N,ini:nm.inicio,fin:nm.fin,filas:lista,tot:tot,tieneExcel:!!Object.keys(ex).length,saldoPrev:saldoPrev,pagada:((dat&&dat.pagadas)||[]).some(function(p){return p.semana_inicio===nm.inicio;})};});

  // ── clientes ──
  var abonosCli={};delMes.forEach(function(m){if(m.tipo==='abono'&&m._c&&m._c.tipo==='cliente'){var k=norm(m._c.vinculo);(abonosCli[k]=abonosCli[k]||[]).push(m);}});
  var cliRows=((dat&&dat.clientes)||[]).filter(function(c){return c.activo||abonosCli[norm(c.nombre)];}).map(function(c){var k=norm(c.nombre),ci=c.ciclo_pago||'mensual';
    var ent=ci==='semanal'?(prod.act||{})[k]:ci==='quincenal'?(((prod.antQ2||{})[k]||0)+((prod.actQ1||{})[k]||0)):(prod.ant||{})[k];ent=ent||0;
    var neto=ent*(+c.tarifa||0),esp=Math.round(neto*(c.paga_iva?1.19:1));var ab=(abonosCli[k]||[]).reduce(function(a,m){return a+(+m.monto);},0);
    var est=esp<=0?(ab>0?'pagado':'—'):(ab>=esp*0.99?'pagado':(ab>0?'parcial':'pendiente'));return {c:c,ent:ent,esp:esp,ab:ab,est:est,ci:ci};}).filter(function(x){return x.esp>0||x.ab>0;})
    .sort(function(a,b){return b.esp-a.esp;});
  // abonos de alias sin cliente en la tabla
  Object.keys(abonosCli).forEach(function(k){if(!cliRows.some(function(x){return norm(x.c.nombre)===k;})){var ab=abonosCli[k].reduce(function(a,m){return a+(+m.monto);},0);cliRows.push({c:{nombre:k,tarifa:0},ent:0,esp:0,ab:ab,est:'pagado',ci:'—'});}});

  // ── socio ──
  var socio=useMemo(function(){var porMes={},acum=0,orden=[];movs.forEach(function(m){if(!m._c||m._c.tipo!=='socio')return;var k=mesDe(m.fecha);if(!porMes[k]){porMes[k]={ret:0,apo:0};orden.push(k);}
    if(m.tipo==='cargo')porMes[k].ret+=+m.monto;else porMes[k].apo+=+m.monto;});
    return orden.sort().map(function(k){acum+=porMes[k].ret-porMes[k].apo;return {mes:k,ret:porMes[k].ret,apo:porMes[k].apo,saldo:acum};});},[movs]);

  // ── alertas ──
  var alertas=useMemo(function(){var al=[];
    var cargos=movs.filter(function(m){return m.tipo==='cargo';});
    for(var i=0;i<cargos.length;i++){var a=cargos[i];if(!a._rut||mesDe(a.fecha)!==mes)continue;for(var j=0;j<cargos.length;j++){var b=cargos[j];if(j===i||b._rut!==a._rut||Math.round(b.monto)!==Math.round(a.monto))continue;var dd=(D(a.fecha)-D(b.fecha))/864e5;if(dd>0&&dd<=7){al.push({t:'dup',c:ROJO,m:a,txt:'Mismo RUT '+a._rut+' y mismo monto '+money(a.monto)+' el '+dmy(b.fecha)+' y el '+dmy(a.fecha)});break;}}}
    semanas.forEach(function(s){s.filas.forEach(function(f){if(f.nPagosNomina>1)al.push({t:'multi',c:NAR,txt:f.men+' recibió '+f.nPagosNomina+' pagos en la nómina del '+dmy(s.N)});
      f.anticipoSinPrest.forEach(function(p){al.push({t:'anticipo',c:ROJO,m:p,txt:'Anticipo de '+money(p.monto)+' a '+f.men+' el '+dmy(p.fecha)+' sin préstamo registrado'});});});
      if(s.saldoPrev!=null&&s.tot.debia>0&&s.saldoPrev<s.tot.debia)al.push({t:'saldo',c:ROJO,txt:'Saldo '+money(s.saldoPrev)+' antes de la nómina del '+dmy(s.N)+', que suma '+money(s.tot.debia)+' (la cuenta no tiene línea de crédito)'});});
    delMes.forEach(function(m){if(m._c||m.justificacion)return;if(m.tipo==='cargo'&&/TRANSF/i.test(m.descripcion))al.push({t:'nodir',c:NAR,m:m,txt:'Transferencia a alguien fuera del directorio: '+m.descripcion+' ('+money(m.monto)+')'});
      else if(m.tipo==='abono')al.push({t:'noab',c:NAR,m:m,txt:'Abono sin identificar: '+m.descripcion+' ('+money(m.monto)+')'});});
    return al;},[movs,mes,dat,semanas.length]);

  // ── estado del mes ──
  var conc=delMes.filter(function(m){return m._c||m.justificacion;}).length;
  var pct=delMes.length?conc/delMes.length*100:0;
  var mesInfo=((dat&&dat.meses)||[]).find(function(x){return x.mes===mes;})||{estado:'abierto'};
  var cargaMes=((dat&&dat.cargas)||[]).filter(function(c){return c.hasta&&mesDe(c.hasta)>=mes&&mesDe(c.desde)<=mes;});
  var saldoOk=cargaMes.length>0;
  var abMes=delMes.filter(function(m){return m.tipo==='abono';}).reduce(function(a,m){return a+(+m.monto);},0),caMes=delMes.filter(function(m){return m.tipo==='cargo';}).reduce(function(a,m){return a+(+m.monto);},0);

  async function cerrarMes(){
    if(pct<100){toast('Faltan '+(delMes.length-conc)+' movimientos por conciliar o justificar');return;}
    if(!saldoOk){toast('Sube una cartola validada que cubra el mes');return;}
    var u=(A.perfil&&A.perfil.nombre)||'';var r=await db.from('conciliacion_meses').upsert({mes:mes,estado:'cerrado',cerrado_por:u,cerrado_at:new Date().toISOString(),updated_at:new Date().toISOString()});
    if(r.error)toast('Error: '+r.error.message);else{toast(nomMes(mes)+' cerrado');cargar();}
  }
  async function reabrirMes(){if(!window.confirm('¿Reabrir '+nomMes(mes)+'? Podrás corregir y volver a cerrarlo.'))return;
    var r=await db.from('conciliacion_meses').upsert({mes:mes,estado:'abierto',updated_at:new Date().toISOString()});if(r.error)toast('Error: '+r.error.message);else{toast(nomMes(mes)+' reabierto');cargar();}}
  async function marcarSemana(s,pagada){
    if(pagada){var r=await db.from('semanas_pagadas').upsert({semana_inicio:s.ini,estado:'pagada',marcado_por:(A.perfil&&A.perfil.nombre)||'',marcado_at:new Date().toISOString()});if(r.error){toast('Error: '+r.error.message);return;}toast('Semana '+dmy(s.ini)+' marcada como pagada');}
    else{if(!window.confirm('¿Quitar la marca de pagada a la semana '+dmy(s.ini)+'?'))return;var r2=await db.from('semanas_pagadas').delete().eq('semana_inicio',s.ini);if(r2.error){toast('Error: '+r2.error.message);return;}toast('Semana reabierta');}
    cargar();
  }

  // ── carga de archivos ──
  function leerArchivo(file){return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(e){try{res(XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true}));}catch(x){rej(x);}};fr.onerror=rej;fr.readAsArrayBuffer(file);});}
  async function subirCartola(file){
    if(!window.XLSX){toast('No se pudo cargar el lector de Excel');return;}
    try{var wb=await leerArchivo(file);var c=leerCartola(wb);c.archivo=file.name;setSIni(c.sIni!=null?String(c.sIni):'');setSFin(c.sFin!=null?String(c.sFin):'');setPend(c);}
    catch(e){toast('Cartola: '+(e.message||e));}
  }
  async function confirmarCartola(){
    var v=validar(pend,sIni,sFin);if(!v.ok){toast(v.msg);return;}
    setBusy(true);
    try{
      var hs=huellas(pend.movs);var fechas=pend.movs.map(function(m){return m.fecha;}).sort();
      var ca=await db.from('cargas_cartola').insert({archivo:pend.archivo,formato:pend.formato,cuenta:CUENTA,desde:fechas[0],hasta:fechas[fechas.length-1],saldo_inicial:v.ini,saldo_final:v.fin,abonos:v.ab,cargos:v.ca,n_mov:pend.movs.length,usuario:(A.perfil&&A.perfil.nombre)||''}).select('id').single();
      if(ca.error)throw ca.error;
      var filas=pend.movs.map(function(m,i){return {cuenta:CUENTA,fecha:m.fecha,monto:m.monto,tipo:m.tipo,descripcion:m.descripcion,n_documento:m.n_documento,sucursal:m.sucursal,n_movimiento:m.n_movimiento,saldo:isNaN(m.saldo)?null:m.saldo,huella:hs[i],carga_id:ca.data.id};});
      var nuevos=0;for(var i=0;i<filas.length;i+=500){var r=await db.from('movimientos_banco').upsert(filas.slice(i,i+500),{onConflict:'huella',ignoreDuplicates:true}).select('id');if(r.error)throw r.error;nuevos+=(r.data||[]).length;}
      await db.from('cargas_cartola').update({n_nuevos:nuevos}).eq('id',ca.data.id);
      toast('Cartola cargada: '+nuevos+' movimientos nuevos de '+filas.length+(filas.length-nuevos?' ('+(filas.length-nuevos)+' ya estaban)':''));
      setPend(null);cargar();
    }catch(e){toast('No se pudo guardar: '+(e.message||e));}
    setBusy(false);
  }
  async function subirPago(files){
    if(!window.XLSX){toast('No se pudo cargar el lector de Excel');return;}
    setBusy(true);var ok=0,err=[];
    for(var i=0;i<files.length;i++){var f=files[i];try{var wb=await leerArchivo(f);var filas=leerArchivoPago(wb,f.name);
      var r=await db.from('pagos_excel_semana').upsert(filas,{onConflict:'semana_inicio,mensajero'});if(r.error)throw r.error;ok++;}catch(e){err.push(f.name+': '+(e.message||e));}}
    setBusy(false);if(ok)toast(ok+' archivo'+(ok!==1?'s':'')+' de pago cargado'+(ok!==1?'s':''));if(err.length)window.alert(err.join('\n'));cargar();
  }

  async function guardarAsignacion(){
    var a=asig;if(!a.tipo||!a.vinculo){toast('Elige el tipo y a quién corresponde');return;}
    var r=await db.from('cuentas_contraparte').insert({patron:a.patron.trim(),modo:a.modo,rut:rutDe(a.patron),tipo:a.tipo,vinculo:norm(a.vinculo),concepto:a.concepto||null});
    if(r.error){toast('Error: '+r.error.message);return;}toast('Agregado al directorio');setAsig(null);cargar();
  }
  async function guardarJust(){var r=await db.from('movimientos_banco').update({justificacion:just.texto||null,conciliado:!!just.texto}).eq('id',just.mov.id);if(r.error){toast('Error: '+r.error.message);return;}setJust(null);cargar();}
  async function guardarDir(){var d=dirEd;var fila={patron:d.patron.trim(),modo:d.modo,rut:d.rut||rutDe(d.patron),tipo:d.tipo,vinculo:norm(d.vinculo),concepto:d.concepto||null,monto_fijo:d.monto_fijo?numero(d.monto_fijo):null,activo:d.activo!==false};
    var r=d.id?await db.from('cuentas_contraparte').update(fila).eq('id',d.id):await db.from('cuentas_contraparte').insert(fila);if(r.error){toast('Error: '+r.error.message);return;}setDirEd(null);cargar();}
  async function borrarDir(d){if(!window.confirm('¿Quitar "'+d.patron+'" del directorio?'))return;var r=await db.from('cuentas_contraparte').delete().eq('id',d.id);if(r.error)toast('Error: '+r.error.message);else cargar();}
  async function cambiarCiclo(c,ci){var r=await db.from('clientes').update({ciclo_pago:ci}).eq('id',c.id);if(r.error)toast('Error: '+r.error.message);else cargar();}

  if(!dat)return h('div',{style:Object.assign({},caja,{padding:30,textAlign:'center'})},cargando?'Cargando conciliación…':'Sin datos');
  var mensajerosNombres=Object.keys(excelPorSem).reduce(function(a,k){Object.keys(excelPorSem[k]).forEach(function(n){if(a.indexOf(n)<0)a.push(n);});return a;},[]).sort();
  var vinculosSug={mensajero:mensajerosNombres,cliente:((dat.clientes||[]).map(function(c){return norm(c.nombre);})),trabajador:[],proveedor:[],socio:['LUIS DI LELLO'],otro:[]};
  var movLista=delMes.filter(function(m){if(fMov==='pendientes'&&(m._c||m.justificacion))return false;if(fMov==='abonos'&&m.tipo!=='abono')return false;if(fMov==='cargos'&&m.tipo!=='cargo')return false;
    if(q){var s=norm(q);if((norm(m.descripcion)+' '+norm(m._c&&m._c.vinculo)+' '+Math.round(m.monto)).indexOf(s)<0)return false;}return true;}).slice().reverse();
  var mp=mes.split('-');var mesPrev=iso(new Date(+mp[0],+mp[1]-2,1)).slice(0,7),mesNext=iso(new Date(+mp[0],+mp[1],1)).slice(0,7);
  var cerrado=mesInfo.estado==='cerrado';
  var kp=function(l,v,c,s){return h('div',{key:l,style:Object.assign({},vid,{padding:'12px 14px'})},h('div',{style:{fontSize:10.5,letterSpacing:1.5,textTransform:'uppercase',color:SUAVE,fontWeight:800}},l),
    h('div',{style:{fontFamily:'Bebas Neue',fontSize:30,lineHeight:1.05,color:c,textShadow:'0 0 14px '+c+'55',whiteSpace:'nowrap'}},v),s&&h('div',{style:{fontSize:11.5,color:SUAVE}},s));};
  var TIPOS=[['mensajero','Mensajero'],['cliente','Cliente'],['trabajador','Trabajador'],['proveedor','Proveedor'],['socio','Socio'],['otro','Otro']];
  var colTipo={mensajero:ORO,cliente:VERDE,trabajador:AZUL,proveedor:'#c77dff',socio:NAR,otro:'#9aa08a'};
  var vPend=pend?validar(pend,sIni,sFin):null;

  return h('div',{style:{display:'flex',flexDirection:'column',gap:16}},
    h('style',null,css),
    // cabecera
    h('div',{style:Object.assign({},caja,{padding:'18px 20px'})},
      h('div',{style:{display:'flex',justifyContent:'space-between',gap:14,flexWrap:'wrap',alignItems:'flex-start'}},
        h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:32,letterSpacing:2.4,color:'#fff',lineHeight:1}},'Conciliación bancaria'),
          h('div',{style:{fontSize:12.5,color:SUAVE,marginTop:4}},'Cuenta corriente '+CUENTA+' · lo que salió y entró del banco contra lo que se debía pagar y cobrar')),
        h('div',{style:{display:'flex',alignItems:'center',gap:8}},btnVid('‹',function(){setMes(mesPrev);}),
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:24,letterSpacing:1.5,color:ORO,minWidth:150,textAlign:'center'}},nomMes(mes)),btnVid('›',function(){setMes(mesNext);}),
          h(Chip,{t:cerrado?'Mes cerrado':'Mes abierto',c:cerrado?VERDE:'#9aa08a'}),
          cerrado?btnVid('Reabrir',reabrirMes):btnOro('Cerrar mes',cerrarMes,pct<100||!saldoOk))),
      h('div',{className:'cb-k',style:{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginTop:14}},
        kp('Movimientos',delMes.length,ORO,conc+' conciliados'),
        kp('Conciliado',Math.round(pct)+'%',pct>=100?VERDE:pct>=80?ORO:ROJO,delMes.length-conc+' por revisar'),
        kp('Abonos',money(abMes),VERDE,delMes.filter(function(m){return m.tipo==='abono';}).length+' ingresos'),
        kp('Cargos',money(caMes),NAR,delMes.filter(function(m){return m.tipo==='cargo';}).length+' egresos'),
        kp('Alertas',alertas.length,alertas.length?ROJO:VERDE,alertas.length?'requieren revisión':'sin alertas')),
      h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:12}},
        [['cb-carga','Carga'],['cb-alertas','Alertas'],['cb-men','Mensajeros'],['cb-cli','Clientes'],['cb-socio','Socio'],['cb-movs','Movimientos'],['cb-dir','Directorio']].map(function(x){
          return h('a',{key:x[0],href:'#'+x[0],onClick:function(e){e.preventDefault();var el=document.getElementById(x[0]);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},style:{padding:'6px 12px',borderRadius:999,border:'1px solid rgba(255,255,255,.14)',background:'rgba(255,255,255,.04)',color:TXT,fontSize:12,fontWeight:800,textDecoration:'none'}},x[1]);}))),

    // carga
    h('div',{style:Object.assign({},caja,{padding:'16px 18px'})},
      h(Titulo,{id:'cb-carga',t:'Carga de archivos',s:'La cartola se valida antes de guardar y nunca duplica movimientos. El archivo de pago semanal se lee de la hoja DETALLE DE PAGO.'}),
      h('div',{className:'cb-2',style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}},
        h('label',{className:'cb-drop'},h('input',{type:'file',accept:'.xls,.xlsx',style:{display:'none'},onChange:function(e){var f=e.target.files[0];e.target.value='';if(f)subirCartola(f);}}),
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.4,color:ORO}},'Cartola del banco'),h('div',{style:{fontSize:12,color:SUAVE,marginTop:4}},'"Cartola histórica" o "Consulta de movimientos" (.xlsx)')),
        h('label',{className:'cb-drop'},h('input',{type:'file',accept:'.xls,.xlsx',multiple:true,style:{display:'none'},onChange:function(e){var fs=Array.prototype.slice.call(e.target.files);e.target.value='';if(fs.length)subirPago(fs);}}),
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.4,color:ORO}},'Archivos de pago semanal'),h('div',{style:{fontSize:12,color:SUAVE,marginTop:4}},'"Semana NN - ARCHIVO DE PAGO dd-mm AL dd-mm" · puedes subir varios'))),
      pend&&h('div',{style:Object.assign({},vid,{padding:'14px 16px',marginTop:12,borderLeft:'4px solid '+(vPend.ok?VERDE:ROJO)})},
        h('div',{style:{fontWeight:900,fontSize:14,color:'#fff'}},pend.archivo+' · '+(pend.formato==='consulta'?'Consulta de movimientos':'Cartola histórica')+' · '+pend.movs.length+' movimientos'),
        h('div',{style:{fontSize:12.5,color:SUAVE,marginTop:4}},'Abonos '+money(vPend.ab)+' · Cargos '+money(vPend.ca)+(vPend.ini!=null?' · Saldo inicial '+money(vPend.ini)+' · Saldo final '+money(vPend.fin):'')),
        (pend.formato!=='consulta'||vPend.falta)&&h('div',{style:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',marginTop:10}},
          h('span',{style:{fontSize:12,color:SUAVE,fontWeight:700}},'Saldos de la cartola:'),
          h('input',{className:'cb-in',placeholder:'Saldo inicial',value:sIni,onChange:function(e){setSIni(e.target.value);},style:{width:150}}),
          h('input',{className:'cb-in',placeholder:'Saldo final',value:sFin,onChange:function(e){setSFin(e.target.value);},style:{width:150}})),
        h('div',{style:{marginTop:10,fontSize:13,fontWeight:800,color:vPend.ok?'#7fe3a8':'#ff8a8a'}},vPend.ok?'Cuadra: '+vPend.msg:vPend.msg),
        h('div',{style:{display:'flex',gap:8,marginTop:10}},btnOro(busy?'Guardando…':'Guardar movimientos',confirmarCartola,busy||!vPend.ok),btnVid('Descartar',function(){setPend(null);}))),
      dat.cargas.length>0&&h('div',{style:{marginTop:12,fontSize:12,color:SUAVE}},'Últimas cargas: ',dat.cargas.slice(0,4).map(function(c){return h('span',{key:c.id,style:{marginRight:12}},dmy(c.desde)+' al '+dmy(c.hasta)+' ('+(c.n_nuevos!=null?c.n_nuevos+' nuevos':c.n_mov+' mov.')+')');}))),

    // alertas
    h('div',{style:Object.assign({},caja,{padding:'16px 18px'})},
      h(Titulo,{id:'cb-alertas',t:'Alertas ('+alertas.length+')',s:'Pagos repetidos, varios pagos en una nómina, anticipos sin préstamo, contrapartes desconocidas y saldo bajo antes de la nómina.'}),
      alertas.length===0?h('div',{style:{color:'#7fe3a8',fontWeight:800,fontSize:13}},'Sin alertas este mes.'):
      h('div',{style:{display:'flex',flexDirection:'column',gap:6}},alertas.map(function(a,i){return h('div',{key:i,style:{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:10,background:a.c+'14',borderLeft:'3px solid '+a.c,fontSize:12.5}},
        h('span',{style:{flex:1}},a.txt),a.m&&(a.t==='nodir'||a.t==='noab')&&btnVid('Asignar',function(){setAsig({mov:a.m,patron:a.m.descripcion,modo:'exacta',tipo:a.m.tipo==='abono'?'cliente':'mensajero',vinculo:''});},false,{padding:'5px 10px',fontSize:11.5}));}))),

    // mensajeros
    h('div',{style:Object.assign({},caja,{padding:'16px 18px'})},
      h(Titulo,{id:'cb-men',t:'Mensajeros por semana',s:'Semana lunes a domingo, pagada el jueves siguiente. Debía = TOTAL A PAGAR del archivo de pago; Pagado = transferencias de miércoles a viernes de esa semana; los pagos de otros días son anticipos y se suman a la nómina siguiente.'}),
      semanas.length===0?h('div',{style:{color:SUAVE,fontSize:13}},'No hay nóminas este mes todavía. Sube la cartola y los archivos de pago.'):
      semanas.map(function(s){return h('div',{key:s.N,style:Object.assign({},vid,{padding:0,marginBottom:12,overflow:'hidden'})},
        h('div',{style:{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,.08)'}},
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:19,letterSpacing:1.2,color:'#fff'}},'Semana '+dmy(s.ini)+' al '+dmy(s.fin)),
          h('span',{style:{fontSize:12,color:SUAVE}},'Nómina jueves '+dmy(s.N)),
          !s.tieneExcel&&h(Chip,{t:'Falta archivo de pago',c:NAR}),
          h('span',{style:{marginLeft:'auto',fontSize:12.5,fontWeight:800}},'Debía '+money(s.tot.debia)+' · Pagado '+money(s.tot.nom)+(s.tot.ant?' · Anticipos '+money(s.tot.ant):'')+' · ',h('span',{style:{color:Math.abs(s.tot.nom-s.tot.debia)<=1?'#7fe3a8':NAR}},'Dif. '+money(s.tot.nom-s.tot.debia))),
          s.pagada?h(React.Fragment,null,h(Chip,{t:'Pagada',c:VERDE}),btnVid('Quitar marca',function(){marcarSemana(s,false);},false,{padding:'5px 10px',fontSize:11.5})):btnVid('Marcar pagada',function(){marcarSemana(s,true);},false,{padding:'5px 10px',fontSize:11.5})),
        h('div',{style:{overflowX:'auto'}},h('table',{className:'cb-tab'},h('thead',null,h('tr',null,['Mensajero','Debía','Pagado nómina','Anticipos','Diferencia','Estado'].map(function(c){return h('th',{key:c},c);}))),
          h('tbody',null,s.filas.map(function(f){var E={ok:['Cuadra',VERDE],sobrepago:['Sobrepago',NAR],falta:['Falta pagar',ROJO],sin_archivo:['Sin archivo',NAR],'—':['Sin pago','#9aa08a']}[f.estado];
            return h('tr',{key:f.men},h('td',{style:{fontWeight:800}},f.men,f.ex&&(f.ex.descuento||f.ex.consumo)?h('div',{style:{fontSize:11,color:SUAVE,fontWeight:600}},'Bruto '+money(f.ex.total_semana)+(f.ex.descuento?' · desc. adelanto '+money(f.ex.descuento):'')+(f.ex.consumo?' · consumo '+money(f.ex.consumo):'')+(f.ex.extra?' · extra '+money(f.ex.extra):'')):null),
              h('td',null,f.debia==null?'—':money(f.debia)),h('td',null,money(f.nomina),f.nPagosNomina>1&&h('div',{style:{fontSize:11,color:NAR}},f.nPagosNomina+' pagos')),
              h('td',{style:{color:f.anticipoSinPrest.length?ROJO:TXT,fontWeight:f.anticipoSinPrest.length?800:400}},f.anticipos?money(f.anticipos):'—',f.anticipoSinPrest.length?h('div',{style:{fontSize:11}},'sin préstamo'):null),
              h('td',{style:{fontWeight:800,color:f.dif==null?SUAVE:Math.abs(f.dif)<=1?'#7fe3a8':f.dif>0?NAR:'#ff8a8a'}},f.dif==null?'—':money(f.dif)),h('td',null,h(Chip,{t:E[0],c:E[1]})));})))));})),

    // clientes
    h('div',{style:Object.assign({},caja,{padding:'16px 18px'})},
      h(Titulo,{id:'cb-cli',t:'Clientes',s:'Abonos del mes contra la producción del período según el ciclo de pago de cada cliente (mensual = mes anterior · quincenal = 2ª quincena anterior + 1ª del mes · semanal = mes en curso). Monto esperado = entregados × tarifa (+IVA si corresponde), referencial.'}),
      cliRows.length===0?h('div',{style:{color:SUAVE,fontSize:13}},'Sin cobros ni abonos de clientes en '+nomMes(mes)+'.'):
      h('div',{style:{overflowX:'auto'}},h('table',{className:'cb-tab'},h('thead',null,h('tr',null,['Cliente','Ciclo','Entregados','Esperado','Abonado','Diferencia','Estado'].map(function(c){return h('th',{key:c},c);}))),
        h('tbody',null,cliRows.map(function(x){var E={pagado:['Pagado',VERDE],parcial:['Parcial',ORO],pendiente:['Pendiente',ROJO],'—':['—','#9aa08a']}[x.est];
          return h('tr',{key:x.c.nombre},h('td',{style:{fontWeight:800}},x.c.nombre),
            h('td',null,x.c.id?h('select',{className:'cb-in',value:x.ci,onChange:function(e){cambiarCiclo(x.c,e.target.value);},style:{padding:'4px 6px',fontSize:12}},[['mensual','Mensual'],['quincenal','Quincenal'],['semanal','Semanal']].map(function(o){return h('option',{key:o[0],value:o[0]},o[1]);})):'—'),
            h('td',null,x.ent.toLocaleString('es-CL')),h('td',null,money(x.esp)),h('td',null,money(x.ab)),h('td',{style:{fontWeight:800,color:x.ab-x.esp>=0?'#7fe3a8':'#ff8a8a'}},money(x.ab-x.esp)),h('td',null,h(Chip,{t:E[0],c:E[1]})));}))))),

    // socio
    h('div',{style:Object.assign({},caja,{padding:'16px 18px'})},
      h(Titulo,{id:'cb-socio',t:'Cuenta corriente socio',s:'Retiros de Luis desde la cuenta de la empresa, con el saldo arrastrado mes a mes (retiros − aportes).'}),
      socio.length===0?h('div',{style:{color:SUAVE,fontSize:13}},'Sin retiros registrados.'):
      h('table',{className:'cb-tab'},h('thead',null,h('tr',null,['Mes','Retiros','Aportes','Saldo arrastrado'].map(function(c){return h('th',{key:c},c);}))),
        h('tbody',null,socio.map(function(s){return h('tr',{key:s.mes,style:{outline:s.mes===mes?'1px solid rgba(232,199,102,.5)':'none'}},h('td',{style:{fontWeight:800}},nomMes(s.mes)),h('td',null,money(s.ret)),h('td',null,money(s.apo)),h('td',{style:{fontWeight:900,color:ORO}},money(s.saldo)));})))),

    // movimientos
    h('div',{style:Object.assign({},caja,{padding:0,overflow:'hidden'})},
      h('div',{style:{padding:'16px 18px 8px'}},h(Titulo,{id:'cb-movs',t:'Movimientos de '+nomMes(mes),s:'Asigna cada movimiento desconocido al directorio (queda para siempre) o justifícalo.',
        der:h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}},[['pendientes','Por revisar'],['todos','Todos'],['abonos','Abonos'],['cargos','Cargos']].map(function(o){var act=fMov===o[0];return h('button',{key:o[0],type:'button',className:'cb-btn',onClick:function(){setFMov(o[0]);},style:{padding:'6px 12px',borderRadius:999,border:'1px solid '+(act?'#f7dd8c':'rgba(255,255,255,.14)'),background:act?'rgba(232,199,102,.2)':'transparent',color:TXT,fontWeight:800,fontSize:12}},o[1]);}),
          h('input',{className:'cb-in',placeholder:'Buscar',value:q,onChange:function(e){setQ(e.target.value);},style:{width:160,padding:'6px 10px'}}))})),
      movLista.length===0?h('div',{style:{padding:'14px 18px',color:fMov==='pendientes'?'#7fe3a8':SUAVE,fontWeight:800,fontSize:13}},fMov==='pendientes'?'Todo conciliado.':'Sin movimientos.'):
      h('div',{style:{overflowX:'auto',maxHeight:560,overflowY:'auto'}},h('table',{className:'cb-tab'},h('thead',null,h('tr',null,['Fecha','Descripción','Cargo','Abono','Contraparte','Acción'].map(function(c){return h('th',{key:c},c);}))),
        h('tbody',null,movLista.map(function(m){var c=m._c;return h('tr',{key:m.id},h('td',{style:{whiteSpace:'nowrap'}},dmy(m.fecha)),
          h('td',null,m.descripcion,m.n_documento&&h('div',{style:{fontSize:11,color:SUAVE}},'Doc. '+m.n_documento)),
          h('td',{style:{color:NAR,fontWeight:800,whiteSpace:'nowrap'}},m.tipo==='cargo'?money(m.monto):''),h('td',{style:{color:'#7fe3a8',fontWeight:800,whiteSpace:'nowrap'}},m.tipo==='abono'?money(m.monto):''),
          h('td',null,c?h('div',null,h(Chip,{t:c.tipo,c:colTipo[c.tipo]||ORO}),h('div',{style:{fontSize:12,fontWeight:800,marginTop:3}},c.vinculo),c.concepto&&h('div',{style:{fontSize:11,color:SUAVE}},c.concepto),m._nom&&h('div',{style:{fontSize:11,color:SUAVE}},(m._nom.esNomina?'Nómina ':'Anticipo → nómina ')+dmy(m._nom.jueves))):
            m.justificacion?h('div',{style:{fontSize:12,color:'#7fe3a8'}},'Justificado: '+m.justificacion):h(Chip,{t:'Sin identificar',c:ROJO})),
          h('td',{style:{whiteSpace:'nowrap'}},!c&&btnVid('Asignar',function(){setAsig({mov:m,patron:m.descripcion,modo:'exacta',tipo:m.tipo==='abono'?'cliente':'mensajero',vinculo:''});},false,{padding:'5px 10px',fontSize:11.5,marginRight:6}),
            btnVid(m.justificacion?'Editar nota':'Justificar',function(){setJust({mov:m,texto:m.justificacion||''});},false,{padding:'5px 10px',fontSize:11.5})));}))))),

    // directorio
    h('div',{style:Object.assign({},caja,{padding:'16px 18px'})},
      h(Titulo,{id:'cb-dir',t:'Directorio de contrapartes ('+dir.length+')',s:'La clave es la descripción del banco: exacta (recomendado, un mismo RUT puede ser dos personas) o "contiene" para nombres de empresa.',der:btnOro('Agregar',function(){setDirEd({patron:'',modo:'exacta',tipo:'mensajero',vinculo:'',concepto:''});})}),
      h('div',{style:{overflowX:'auto',maxHeight:420,overflowY:'auto'}},h('table',{className:'cb-tab'},h('thead',null,h('tr',null,['Descripción en el banco','Modo','Tipo','Corresponde a','Concepto','Monto fijo',''].map(function(c,i){return h('th',{key:i},c);}))),
        h('tbody',null,dir.map(function(d){return h('tr',{key:d.id,style:{opacity:d.activo?1:.5}},h('td',{style:{fontFamily:'JetBrains Mono',fontSize:12}},d.patron),h('td',null,d.modo),h('td',null,h(Chip,{t:d.tipo,c:colTipo[d.tipo]||ORO})),
          h('td',{style:{fontWeight:800}},d.vinculo),h('td',null,d.concepto||'—'),h('td',null,d.monto_fijo?money(d.monto_fijo):'—'),
          h('td',{style:{whiteSpace:'nowrap'}},btnVid('Editar',function(){setDirEd(Object.assign({},d));},false,{padding:'4px 9px',fontSize:11.5,marginRight:6}),btnVid('Quitar',function(){borrarDir(d);},false,{padding:'4px 9px',fontSize:11.5})));}))))),

    // ventanas
    (asig||dirEd||just)&&h('div',{style:{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:16},onClick:function(e){if(e.target===e.currentTarget){setAsig(null);setDirEd(null);setJust(null);}}},
      h('div',{style:Object.assign({},caja,{padding:'18px 20px',width:'100%',maxWidth:520})},
        just?h(React.Fragment,null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:1.6,color:'#fff'}},'Justificar movimiento'),
          h('div',{style:{fontSize:12.5,color:SUAVE,margin:'4px 0 10px'}},dmy(just.mov.fecha)+' · '+just.mov.descripcion+' · '+money(just.mov.monto)),
          h('textarea',{className:'cb-in',rows:3,style:{width:'100%',boxSizing:'border-box'},placeholder:'Ej.: comisión bancaria, devolución, error del banco…',value:just.texto,onChange:function(e){var v=e.target.value;setJust(function(p){return Object.assign({},p,{texto:v});});}}),
          h('div',{style:{display:'flex',gap:8,marginTop:12,justifyContent:'flex-end'}},btnVid('Cancelar',function(){setJust(null);}),btnOro('Guardar',guardarJust))):
        (function(){var a=asig||dirEd;var set=asig?setAsig:setDirEd;var upd=function(k,v){set(function(p){var o=Object.assign({},p);o[k]=v;return o;});};
          return h(React.Fragment,null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:1.6,color:'#fff'}},asig?'Asignar al directorio':(a.id?'Editar contraparte':'Nueva contraparte')),
            asig&&h('div',{style:{fontSize:12.5,color:SUAVE,margin:'4px 0 6px'}},dmy(a.mov.fecha)+' · '+money(a.mov.monto)+' · '+a.mov.tipo),
            h('div',{style:{display:'grid',gap:10,marginTop:10}},
              h('label',{style:{fontSize:11,fontWeight:900,letterSpacing:1.2,color:ORO}},'DESCRIPCIÓN EN EL BANCO',h('input',{className:'cb-in',style:{width:'100%',boxSizing:'border-box',marginTop:4},value:a.patron,onChange:function(e){upd('patron',e.target.value);}})),
              h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
                h('label',{style:{fontSize:11,fontWeight:900,letterSpacing:1.2,color:ORO}},'MODO',h('select',{className:'cb-in',style:{display:'block',marginTop:4},value:a.modo,onChange:function(e){upd('modo',e.target.value);}},h('option',{value:'exacta'},'Exacta'),h('option',{value:'contiene'},'Contiene'))),
                h('label',{style:{fontSize:11,fontWeight:900,letterSpacing:1.2,color:ORO}},'TIPO',h('select',{className:'cb-in',style:{display:'block',marginTop:4},value:a.tipo,onChange:function(e){upd('tipo',e.target.value);}},TIPOS.map(function(t){return h('option',{key:t[0],value:t[0]},t[1]);})))),
              h('label',{style:{fontSize:11,fontWeight:900,letterSpacing:1.2,color:ORO}},'CORRESPONDE A',h('input',{className:'cb-in',list:'cb-vin',style:{width:'100%',boxSizing:'border-box',marginTop:4},placeholder:'Nombre del mensajero, cliente, persona…',value:a.vinculo,onChange:function(e){upd('vinculo',e.target.value);}}),
                h('datalist',{id:'cb-vin'},(vinculosSug[a.tipo]||[]).map(function(v){return h('option',{key:v,value:v});}))),
              h('label',{style:{fontSize:11,fontWeight:900,letterSpacing:1.2,color:ORO}},'CONCEPTO',h('input',{className:'cb-in',style:{width:'100%',boxSizing:'border-box',marginTop:4},placeholder:'Nómina, sueldo, arriendo, pago cliente…',value:a.concepto||'',onChange:function(e){upd('concepto',e.target.value);}})),
              dirEd&&h('label',{style:{fontSize:11,fontWeight:900,letterSpacing:1.2,color:ORO}},'MONTO FIJO (opcional)',h('input',{className:'cb-in',style:{width:'100%',boxSizing:'border-box',marginTop:4},value:a.monto_fijo||'',onChange:function(e){upd('monto_fijo',e.target.value);}}))),
            h('div',{style:{display:'flex',gap:8,marginTop:14,justifyContent:'flex-end'}},btnVid('Cancelar',function(){set(null);}),btnOro('Guardar',asig?guardarAsignacion:guardarDir)));})()))
  );
}
window.ConciliacionBancaria=ConciliacionBancaria;
})();
