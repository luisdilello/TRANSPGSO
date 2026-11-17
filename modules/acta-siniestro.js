// Actas de siniestro (17-11-2026). Informes → Actas de siniestro.
// Se ingresan los códigos, el mensajero, a quién va dirigido y la situación (pieza perdida, robada, etc.).
// El sistema completa los datos de cada pieza y redacta el informe; queda guardado con número correlativo
// (tabla actas_siniestro, RPC crear_acta_siniestro) con una copia fija del detalle para poder reimprimirlo igual.
(function(){
var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo;
var A=window.__app||{};var db=A.db;
var EMPRESA={nombre:'TransPgso SpA',rut:'78.143.701-8',dir:'Exposición 902, Santiago Centro',correo:'contacto@transpgso.cl',fono:'+56 9 4211 2940',web:'www.transpgso.cl'};
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function dmy(s){if(!s)return '—';var p=String(s).slice(0,10).split('-');return p[2]+'-'+p[1]+'-'+p[0];}
function largo(s){if(!s)return '—';var p=String(s).slice(0,10).split('-');return (+p[2])+' de '+MESES[+p[1]-1]+' de '+p[0];}
function tit(s){return String(s||'').toLowerCase().replace(/(^|[\s(])\S/g,function(m){return m.toUpperCase();});}
function money(n){return '$'+Math.round(+n||0).toLocaleString('es-CL');}
function plural(n,s,p){return n+' '+(n===1?s:(p||s+'s'));}
function hoyCL(){return A.fechaHoyCL?A.fechaHoyCL():new Date().toLocaleDateString('en-CA',{timeZone:'America/Santiago'});}
var ESTADOS={entregado:'Entregado',en_ruta:'En ruta',en_bodega:'En bodega',siniestro:'Siniestro',retorno:'Retorno',reprogramado:'Reprogramado',cancelado:'Cancelado',en_bodega_cancelado:'En bodega cancelado',en_bodega_fecha:'En bodega (fecha)'};
function est(e){return ESTADOS[e]||tit(String(e||'').replace(/_/g,' '))||'—';}
// En un siniestro, 'entregado' es el reenvío del cliente y 'retorno/cancelado' la pieza cancelada (regla de Luis 17-11-2026).
function estSin(e){return e==='entregado'?'Siniestro · reenvío entregado':(e==='retorno'||e==='cancelado'||e==='en_bodega_cancelado')?'Siniestro · cancelada':e?'Siniestro':'—';}

// Situaciones de siniestro: texto para la redacción y medidas sugeridas.
var SIT=[
  {k:'perdida',t:'Pieza perdida',
    txt:function(d){return d.pz+' que se encontraba'+d.s_n+' bajo la custodia de '+d.men+' no '+(d.n>1?'pudieron':'pudo')+' ser '+(d.n>1?'ubicadas':'ubicada')+' para completar su entrega. Pese a la búsqueda realizada en ruta y en bodega, no fue posible dar con '+(d.n>1?'ellas':'ella')+', por lo que '+(d.n>1?'quedan':'queda')+' en estado de siniestro por pérdida.';},
    med:'Se realizó la búsqueda de la pieza en ruta y en bodega.\nSe revisó el historial de escaneos, fotos y movimientos registrados en el sistema.\nEl caso queda registrado en el módulo de siniestros y se aplicará el procedimiento de compensación acordado con el cliente.'},
  {k:'robada',t:'Pieza robada (asalto)',
    txt:function(d){return d.men+' fue víctima de un robo durante su ruta de reparto'+d.lugar+', en el cual le '+(d.n>1?'fueron sustraídas':'fue sustraída')+' '+d.pzMin+'. '+(d.n>1?'Las piezas no pudieron ser recuperadas y quedan':'La pieza no pudo ser recuperada y queda')+' en estado de siniestro por robo.';},
    med:'Se verificó el estado del mensajero y se le dio el apoyo correspondiente.\nSe instruyó realizar la denuncia ante Carabineros o PDI.\nEl caso queda registrado en el módulo de siniestros y se aplicará el procedimiento de compensación acordado con el cliente.'},
  {k:'hurtada',t:'Pieza hurtada (sin violencia)',
    txt:function(d){return 'se produjo el hurto de '+d.pzMin+' que estaba'+d.s_n+' a cargo de '+d.men+d.lugar+', sin que mediara violencia contra el mensajero. '+(d.n>1?'Las piezas no pudieron ser recuperadas y quedan':'La pieza no pudo ser recuperada y queda')+' en estado de siniestro.';},
    med:'Se revisó con el mensajero la forma en que ocurrió el hurto y los resguardos de la carga.\nSe instruyó realizar la denuncia correspondiente.\nSe reforzó el protocolo de resguardo de piezas en el vehículo.'},
  {k:'danada',t:'Pieza dañada',
    txt:function(d){return d.pzMin+' a cargo de '+d.men+' '+(d.n>1?'resultaron dañadas':'resultó dañada')+' durante su manipulación o transporte'+d.lugar+', quedando en condiciones que impiden su entrega al destinatario.';},
    med:'Se dejó registro fotográfico del daño.\nSe revisaron las condiciones de embalaje y manipulación.\nEl caso queda registrado en el módulo de siniestros.'},
  {k:'bodega',t:'Extravío en bodega',
    txt:function(d){return 'se constató el extravío de '+d.pzMin+' al interior de nuestra bodega. La pieza registra su ingreso en el sistema, pero no fue posible ubicarla físicamente tras la revisión de estantes y zonas de despacho.';},
    med:'Se revisaron todos los estantes, zonas de despacho y retornos de la bodega.\nSe revisó el historial de escaneos de ingreso y salida.\nSe reforzó el control de ingreso y salida de piezas.'},
  {k:'tercero',t:'Entregada a persona no autorizada',
    txt:function(d){return d.pzMin+' a cargo de '+d.men+' '+(d.n>1?'fueron entregadas':'fue entregada')+' a una persona distinta del destinatario o no autorizada para recibirla, por lo que no '+(d.n>1?'llegaron':'llegó')+' a su destino final.';},
    med:'Se revisaron las fotos y datos de entrega registrados por el mensajero.\nSe intentó contactar al receptor para recuperar la pieza.\nSe reforzó con el mensajero el protocolo de validación de identidad del receptor.'},
  {k:'otro',t:'Otro',
    txt:function(d){return d.pzMin+' a cargo de '+d.men+' '+(d.n>1?'quedaron':'quedó')+' en situación de siniestro'+(d.otro?' por el siguiente motivo: '+d.otro:'')+'.';},
    med:''}
];
function sitDe(k){for(var i=0;i<SIT.length;i++)if(SIT[i].k===k)return SIT[i];return SIT[SIT.length-1];}
function nombreSit(a){return a.situacion&&a.situacion.indexOf('otro:')===0?tit(a.situacion.slice(5)):sitDe(a.situacion).t;}

function redactar(f){
  var F=f.filas||[],n=F.length||1,s=sitDe(f.sit);
  var cli={};F.forEach(function(x){if(x.cliente)cli[x.cliente]=1;});var clis=Object.keys(cli);
  var d={n:n,s_n:n>1?'n':'',men:f.mensajero?'el mensajero '+tit(f.mensajero):'nuestro mensajero',lugar:f.lugar?' en '+f.lugar:'',otro:(f.otro||'').trim(),
    pz:(n>1?'Las '+n+' piezas detalladas':'La pieza detallada')+' en este informe',pzMin:n>1?'las '+n+' piezas detalladas en este informe':'la pieza detallada en este informe'};
  var cuerpo=s.txt(d);cuerpo=cuerpo.charAt(0).toLowerCase()+cuerpo.slice(1);
  var t='Con fecha '+largo(f.fecha_hecho||hoyCL())+', '+cuerpo;
  if(clis.length)t+=' '+(n>1?'Las piezas corresponden':'La pieza corresponde')+' a envíos de '+(clis.length>1?'los clientes ':'')+clis.join(', ').replace(/, ([^,]*)$/,' y $1')+'.';
  return t;
}

function htmlActa(a,borrador){
  var F=a.detalle||[];var origen=location.origin;
  var total=F.reduce(function(s,x){return s+(+x.valor||0);},0),hayValor=F.some(function(x){return +x.valor>0;});
  var emitido=a.created_at?new Date(a.created_at).toLocaleString('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Borrador';
  var dato=function(l,v){return '<div class="dato"><span>'+esc(l)+'</span><b>'+(v?esc(v):'—')+'</b></div>';};
  var parr=function(t){return String(t||'').split(/\n+/).filter(function(x){return x.trim();}).map(function(x){return '<p>'+esc(x.trim())+'</p>';}).join('');};
  var lista=function(t){var L=String(t||'').split(/\n+/).filter(function(x){return x.trim();});return L.length?'<ul>'+L.map(function(x){return '<li>'+esc(x.trim().replace(/^[-•]\s*/,''))+'</li>';}).join('')+'</ul>':'';};
  var filas=F.map(function(x,i){return '<tr><td class="n">'+(i+1)+'</td><td class="mono">'+esc(x.codigo)+'</td><td>'+esc(x.direccion||'—')+'</td><td>'+esc(tit(x.comuna)||'—')+'</td><td class="c">'+dmy(x.fecha)+'</td><td class="c"><span class="est">'+esc(estSin(x.estado))+'</span></td>'+(hayValor?'<td class="r">'+(+x.valor?money(x.valor):'—')+'</td>':'')+'</tr>';}).join('');
  var sello=a.anulada?'<div class="sello">ANULADA</div>':borrador?'<div class="sello b">BORRADOR</div>':'';
  return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  +'<title>Informe de siniestro '+esc(a.numero||'borrador')+'</title>'
  +'<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">'
  +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"DM Sans",Arial,sans-serif;color:#2b2e20;background:#e9e5d8;font-size:12px;line-height:1.5}'
  +'.acc{position:sticky;top:0;z-index:5;display:flex;gap:8px;justify-content:center;padding:10px;background:#2b2e20}.acc button{font:800 13px "DM Sans",Arial;padding:9px 18px;border-radius:9px;border:1px solid #f7dd8c;background:linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829);color:#1a1d13;cursor:pointer}.acc button.sec{background:transparent;color:#f1ecda;border-color:rgba(241,236,218,.4)}'
  +'.hoja{width:210mm;min-height:297mm;margin:16px auto;background:#fff;padding:16mm 15mm 14mm;box-shadow:0 10px 30px rgba(0,0,0,.18);position:relative;overflow:hidden}'
  +'.sello{position:absolute;top:120mm;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:"Bebas Neue";font-size:120px;letter-spacing:10px;color:rgba(176,48,48,.13);border:8px solid rgba(176,48,48,.13);padding:0 30px;pointer-events:none}.sello.b{color:rgba(138,109,31,.13);border-color:rgba(138,109,31,.13)}'
  +'.cab{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:12px;border-bottom:3px solid #C8A84B}'
  +'.marca{display:flex;gap:12px;align-items:center}.marca img{width:62px;height:62px;border-radius:12px;object-fit:cover;border:2px solid #C8A84B}.marca h1{font-family:"Bebas Neue";font-size:28px;letter-spacing:2px;color:#3A3D2E;line-height:1}.marca p{font-size:10.5px;color:#5f5e4c;line-height:1.4}'
  +'.doc{text-align:right}.doc .tipo{font-family:"Bebas Neue";font-size:30px;letter-spacing:2px;color:#3A3D2E;line-height:1}.doc .num{display:inline-block;margin-top:6px;padding:5px 12px;border-radius:8px;background:#3A3D2E;color:#e8c766;font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:700}.doc p{margin-top:6px;font-size:10.5px;color:#5f5e4c}'
  +'.dest{margin-top:14px;padding:12px 14px;border:1px solid #e3dbc4;border-radius:10px;background:#fbf8f0}.dest span{font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;color:#7a7766}.dest b{display:block;font-size:14px}.dest i{font-style:normal;color:#5f5e4c}'
  +'.ref{margin-top:10px;font-size:12.5px}.ref b{color:#8a6d1f}'
  +'.bloque{margin-top:14px}.bloque h2{font-family:"Bebas Neue";font-size:15px;letter-spacing:1.6px;color:#8a6d1f;margin-bottom:6px}.bloque p{margin-bottom:7px;text-align:justify;font-size:12.5px}.bloque ul{padding-left:18px}.bloque li{margin-bottom:4px;font-size:12.5px}'
  +'.datos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;padding:12px 14px;border:1px solid #e3dbc4;border-radius:10px}.dato span{display:block;font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;color:#7a7766}.dato b{font-size:12px}'
  +'.alerta{display:inline-block;padding:3px 10px;border-radius:999px;background:#fde3df;color:#b03030;font-weight:800;font-size:11px}'
  +'table{width:100%;border-collapse:collapse}thead{display:table-header-group}th{background:#3A3D2E;color:#f1ecda;font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;text-align:left;padding:7px 8px}td{padding:6px 8px;border-bottom:1px solid #ece6d4;vertical-align:top;font-size:11px}tr{page-break-inside:avoid}tfoot td{font-weight:800;background:#fbf8f0}'
  +'table.pz{table-layout:fixed}table.pz td{vertical-align:middle;padding:7px 8px}table.pz tbody tr:nth-child(even) td{background:#fbf8f0}.mono{white-space:nowrap}.est{display:inline-block;padding:2px 8px;border-radius:999px;background:#fde3df;color:#9a2a2a;font-size:10px;font-weight:700;white-space:nowrap}td.n{color:#9a9684;width:24px}td.c{text-align:center;white-space:nowrap}td.r{text-align:right;white-space:nowrap}.mono{font-family:"JetBrains Mono",monospace;font-size:10.5px}'
  +'.decl{margin-top:16px;padding:12px 14px;border-left:4px solid #C8A84B;background:#fbf8f0;font-size:11.5px;color:#3d3f32}'
  +'.firmas{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:40px;page-break-inside:avoid}.firma .linea{height:56px;border-bottom:1.5px solid #3A3D2E}.firma h3{font-family:"Bebas Neue";font-size:15px;letter-spacing:1.4px;color:#3A3D2E;margin-top:6px}.firma p{font-size:10.5px;color:#5f5e4c}'
  +'.pie{margin-top:22px;padding-top:8px;border-top:1px solid #e3dbc4;display:flex;justify-content:space-between;font-size:9.5px;color:#8a8775}'
  +'@page{size:A4;margin:12mm}@media print{body{background:#fff}.acc{display:none}.hoja{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}}'
  +'@media screen and (max-width:820px){.hoja{width:auto;margin:0;padding:18px 14px}.datos{grid-template-columns:1fr 1fr}.cab{flex-direction:column}.doc{text-align:left}}'
  +'</style></head><body>'
  +'<div class="acc"><button onclick="window.print()">Descargar PDF / Imprimir</button><button class="sec" onclick="window.close()">Cerrar</button></div>'
  +'<div class="hoja">'+sello
  +'<div class="cab"><div class="marca"><img src="'+origen+'/logo.jpg" alt="TransPgso"><div><h1>TRANSPGSO</h1><p>'+esc(EMPRESA.nombre)+' · RUT '+EMPRESA.rut+'<br>'+esc(EMPRESA.dir)+'<br>'+EMPRESA.correo+' · '+EMPRESA.fono+'</p></div></div>'
  +'<div class="doc"><div class="tipo">Informe de siniestro</div><div class="num">N° '+esc(a.numero||'BORRADOR')+'</div><p>Santiago, '+largo(a.fecha||hoyCL())+'<br>Emitido: '+emitido+'</p></div></div>'
  +'<div class="dest"><span>Dirigido a</span><b>'+esc(a.dirigido_a||'—')+'</b>'+(a.dirigido_cargo?'<i>'+esc(a.dirigido_cargo)+'</i>':'')+'</div>'
  +'<div class="ref"><b>Referencia:</b> informe de siniestro de '+plural(F.length,'pieza')+' · '+esc(nombreSit(a))+'</div>'
  +'<div class="bloque"><h2>1. Datos del siniestro</h2><div class="datos">'+dato('Situación',nombreSit(a))+dato('Fecha del hecho',a.fecha_hecho?largo(a.fecha_hecho):'')+dato('Lugar',a.lugar)+dato('Mensajero a cargo',a.mensajero?tit(a.mensajero):'')+dato('Piezas involucradas',String(F.length))+dato('Valor declarado',hayValor?money(total):'')+'</div></div>'
  +'<div class="bloque"><h2>2. Descripción de los hechos</h2>'+(parr(a.relato)||'<p>—</p>')+'</div>'
  +'<div class="bloque"><h2>3. Piezas involucradas</h2><table class="pz"><colgroup><col style="width:26px"><col style="width:118px"><col><col style="width:110px"><col style="width:78px"><col style="width:150px">'+(hayValor?'<col style="width:82px">':'')+'</colgroup><thead><tr><th>#</th><th>Código</th><th>Dirección</th><th>Comuna</th><th style="text-align:center">Recibido</th><th style="text-align:center">Estado</th>'+(hayValor?'<th style="text-align:right">Valor</th>':'')+'</tr></thead><tbody>'+filas+'</tbody>'
  +(hayValor?'<tfoot><tr><td colspan="6">Total valor declarado</td><td class="r">'+money(total)+'</td></tr></tfoot>':'')+'</table></div>'
  +(a.medidas?'<div class="bloque"><h2>4. Medidas adoptadas</h2>'+lista(a.medidas)+'</div>':'')
  +'<div class="decl">TransPgso SpA deja constancia de los hechos descritos en este informe, elaborado con la información registrada en nuestro sistema de gestión (ingresos, escaneos, fotografías y movimientos de cada pieza). Quedamos atentos a cualquier consulta o antecedente adicional que se requiera.</div>'
  +'<div class="firmas"><div class="firma"><div class="linea"></div><h3>Emitido por TransPgso SpA</h3><p>'+esc(a.emitida_por?tit(a.emitida_por):'')+'</p></div><div class="firma"><div class="linea"></div><h3>Recibido por</h3><p>'+esc(a.dirigido_a||'')+'</p></div></div>'
  +'<div class="pie"><span>'+esc(EMPRESA.nombre)+' · '+EMPRESA.web+'</span><span>Informe '+esc(a.numero||'borrador')+'</span></div>'
  +'</div></body></html>';
}
function abrirHtml(html){var w=window.open('','_blank');if(w){w.document.open();w.document.write(html);w.document.close();}else{var u=URL.createObjectURL(new Blob([html],{type:'text/html'}));window.open(u,'_blank');}}
function excel(a){var ex=A.exportToExcel;if(!ex)return;var F=a.detalle||[];
  ex('Informe_siniestro_'+(a.numero||'borrador'),[
    {name:'Piezas',headers:['Código','Cliente','Destinatario','Dirección','Comuna','Recibido','Estado','Valor'],rows:F.map(function(x){return [x.codigo,x.cliente||'',tit(x.destinatario),x.direccion||'',tit(x.comuna),dmy(x.fecha),estSin(x.estado),+x.valor||''];})},
    {name:'Informe',headers:['Campo','Valor'],rows:[['Número',a.numero||''],['Fecha',dmy(a.fecha)],['Dirigido a',a.dirigido_a||''],['Cargo / empresa',a.dirigido_cargo||''],['Situación',nombreSit(a)],['Fecha del hecho',dmy(a.fecha_hecho)],['Lugar',a.lugar||''],['Mensajero',a.mensajero||''],['Descripción',a.relato||''],['Medidas',a.medidas||''],['Emitido por',a.emitida_por||'']]}]);}

var C={txt:'#f1ecda',sub:'rgba(233,228,210,.7)',fila:'rgba(255,255,255,.05)',bd:'rgba(255,255,255,.1)',
  caja:{borderRadius:20,background:'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 50%,#15180f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 18px 38px rgba(20,22,15,.25), inset 0 1px 0 rgba(255,255,255,.07)',color:'#f1ecda',padding:'18px 20px'}};
function boton(t,on,tipo,dis){var prim=tipo==='prim',peligro=tipo==='peligro';
  return h('button',{type:'button',onClick:on,disabled:!!dis,style:{padding:'8px 14px',borderRadius:10,border:'1px solid '+(prim?'#f7dd8c':peligro?'rgba(176,48,48,.6)':'rgba(200,168,75,.5)'),
    background:prim?'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)':peligro?'rgba(176,48,48,.15)':'rgba(255,255,255,.06)',
    color:prim?'#1a1d13':peligro?'#ff9b9b':C.txt,fontWeight:800,fontSize:12.5,cursor:dis?'default':'pointer',opacity:dis?.5:1,whiteSpace:'nowrap',boxShadow:prim?'0 3px 0 #6d531a':'none'}},t);}
var inp={padding:'9px 11px',borderRadius:10,border:'1px solid rgba(232,199,102,.4)',fontSize:13,width:'100%',boxSizing:'border-box',background:'#fff',color:'#2b2e20',fontFamily:'inherit'};
function campo(l,el,ancho){return h('label',{style:{display:'flex',flexDirection:'column',gap:5,flex:ancho||'1 1 220px',minWidth:0}},h('span',{style:{fontSize:10.5,fontWeight:900,letterSpacing:1,textTransform:'uppercase',color:'#e8c766'}},l),el);}
function parseCodigos(t){var o=[],v={};String(t||'').split(/[\s,;]+/).forEach(function(x){x=x.trim().toUpperCase();if(x.length>=4&&!v[x]){v[x]=1;o.push(x);}});return o;}

function ActasSiniestro(props){
  var toast=props.toast||function(m){alert(m);};
  var esAdmin=!!(A.perfil&&(A.perfil.esAdmin||A.perfil.esSuperAdmin));
  var _t=useState('nueva'),tab=_t[0],setTab=_t[1];
  var _l=useState(null),actas=_l[0],setActas=_l[1];
  var vacio={codigosTxt:'',filas:[],noEncontrados:[],mensajero:'',dirigido_a:'',dirigido_cargo:'',sit:'',otro:'',fecha_hecho:hoyCL(),lugar:'',relato:'',medidas:'',relatoTocado:false,medTocado:false};
  var _f=useState(vacio),f=_f[0],setF=_f[1];
  var _b=useState(false),buscando=_b[0],setBuscando=_b[1];
  var _g=useState(false),gen=_g[0],setGen=_g[1];
  var _q=useState(''),q=_q[0],setQ=_q[1];
  function set(o){setF(function(p){return Object.assign({},p,o);});}
  function cargar(){db.from('actas_siniestro').select('*').eq('anulada',false).order('id',{ascending:false}).limit(500).then(function(r){setActas(r.error?[]:(r.data||[]));});}
  useEffect(cargar,[]);
  var nombresMen=useMemo(function(){return (props.mensajeros||[]).filter(function(m){return m.activo!==false;}).map(function(m){return m.nombre;}).filter(Boolean).sort();},[props.mensajeros]);
  var nombresCli=useMemo(function(){var o={};(f.filas||[]).forEach(function(x){if(x.cliente)o[x.cliente]=1;});(props.clientes||[]).forEach(function(c){var n=c&&(c.nombre||c);if(typeof n==='string')o[n]=1;});return Object.keys(o).sort();},[f.filas,props.clientes]);

  // Al cambiar datos, la redacción se rehace sola mientras no se haya editado a mano.
  useEffect(function(){if(!f.sit)return;var o={};if(!f.relatoTocado)o.relato=redactar(f);if(!f.medTocado)o.medidas=sitDe(f.sit).med;set(o);},[f.sit,f.otro,f.mensajero,f.lugar,f.fecha_hecho,f.filas]);

  async function buscar(){var cods=parseCodigos(f.codigosTxt);if(!cods.length){toast('Pega al menos un código');return;}setBuscando(true);
    try{var env=[],sin=[];
      for(var i=0;i<cods.length;i+=150){var part=cods.slice(i,i+150);
        var r=await db.from('envios').select('codigo,cliente,destinatario,direccion,comuna,fecha,estado,mensajero,valor_siniestro').in('codigo',part);if(r.error)throw r.error;env=env.concat(r.data||[]);
        var s=await db.from('siniestros').select('codigo,mensajero,fecha_siniestro').in('codigo',part);if(!s.error)sin=sin.concat(s.data||[]);}
      var porC={};env.forEach(function(e){porC[String(e.codigo).toUpperCase()]=e;});var sC={};sin.forEach(function(x){sC[String(x.codigo).toUpperCase()]=x;});
      var previas={};(f.filas||[]).forEach(function(x){previas[x.codigo]=x;});
      var filas=cods.map(function(c){var e=porC[c]||{},s=sC[c]||{},p=previas[c];
        return {codigo:e.codigo||c,cliente:e.cliente||'',destinatario:e.destinatario||'',direccion:e.direccion||'',comuna:e.comuna||'',fecha:e.fecha||'',estado:e.estado||'',
          mensajero:e.mensajero||s.mensajero||'',menSin:(s.mensajero&&e.mensajero&&String(s.mensajero).toUpperCase()!==String(e.mensajero).toUpperCase())?s.mensajero:'',fecha_siniestro:s.fecha_siniestro||'',valor:p?p.valor:(+e.valor_siniestro||''),existe:!!porC[c]};});
      var mens={};filas.forEach(function(x){if(x.mensajero)mens[x.mensajero]=1;});var mk=Object.keys(mens);
      var fs=filas.map(function(x){return x.fecha_siniestro;}).filter(Boolean).sort();
      var cl={};filas.forEach(function(x){if(x.cliente)cl[x.cliente]=1;});var ck=Object.keys(cl);
      set({filas:filas,noEncontrados:filas.filter(function(x){return !x.existe;}).map(function(x){return x.codigo;}),
        mensajero:f.mensajero||(mk.length===1?mk[0]:''),fecha_hecho:fs.length?fs[0]:f.fecha_hecho,dirigido_a:f.dirigido_a||(ck.length===1?ck[0]:'')});
      toast(plural(filas.length,'código')+' cargado'+(filas.length===1?'':'s'));
    }catch(e){toast('No se pudieron buscar los códigos: '+(e.message||e));}
    setBuscando(false);}
  function quitar(c){set({filas:f.filas.filter(function(x){return x.codigo!==c;}),noEncontrados:f.noEncontrados.filter(function(x){return x!==c;})});}
  function valor(c,v){set({filas:f.filas.map(function(x){return x.codigo===c?Object.assign({},x,{valor:v.replace(/\D/g,'')}):x;})});}
  function armar(){return {situacion:f.sit==='otro'?('otro:'+(f.otro||'Otro').trim()):f.sit,fecha_hecho:f.fecha_hecho,mensajero:f.mensajero,dirigido_a:f.dirigido_a,dirigido_cargo:f.dirigido_cargo,lugar:f.lugar,relato:f.relato,medidas:f.medidas,
    codigos:f.filas.map(function(x){return x.codigo;}),detalle:f.filas.map(function(x){return {codigo:x.codigo,cliente:x.cliente,destinatario:x.destinatario,direccion:x.direccion,comuna:x.comuna,fecha:x.fecha,estado:x.estado,valor:+x.valor||0};})};}
  var falta=!f.filas.length?'Agrega y busca los códigos':!f.sit?'Elige la situación del siniestro':!f.dirigido_a.trim()?'Indica a quién va dirigido':!f.relato.trim()?'Falta la descripción de los hechos':'';
  function vistaPrevia(){var a=armar();a.emitida_por=A.perfil&&A.perfil.nombre;abrirHtml(htmlActa(a,true));}
  async function emitir(){if(falta){toast(falta);return;}setGen(true);var w=window.open('','_blank');
    try{var a=armar();var r=await db.rpc('crear_acta_siniestro',{p:a});if(r.error)throw r.error;
      var g=await db.from('actas_siniestro').select('*').eq('id',r.data).single();if(g.error)throw g.error;
      var html=htmlActa(g.data);if(w&&!w.closed){w.document.open();w.document.write(html);w.document.close();}else abrirHtml(html);
      toast('Informe '+g.data.numero+' emitido');setF(vacio);setTab('emitidas');cargar();
    }catch(e){if(w&&!w.closed)w.close();toast('No se pudo emitir: '+(e.message||e));}
    setGen(false);}
  function anular(a){if(!window.confirm('Eliminar el informe '+a.numero+'? Se borra del sistema y no se puede recuperar.'))return;
    db.rpc('eliminar_acta_siniestro',{p_id:a.id}).then(function(r){if(r.error){toast('No se pudo eliminar: '+r.error.message);return;}toast('Informe '+a.numero+' eliminado');cargar();});}

  var tabB=function(k,t){var on=tab===k;return h('button',{type:'button',onClick:function(){setTab(k);},style:{padding:'8px 14px',border:'none',borderBottom:'3px solid '+(on?'#e8c766':'transparent'),background:'transparent',color:on?'#ffe59a':C.sub,fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1.2,cursor:'pointer'}},t);};
  var th={textAlign:'left',padding:'8px 10px',fontSize:10.5,letterSpacing:.8,textTransform:'uppercase',color:'rgba(233,228,210,.65)',borderBottom:'1px solid rgba(255,255,255,.12)',whiteSpace:'nowrap'};
  var td={padding:'8px 10px',borderBottom:'1px solid rgba(255,255,255,.06)',fontSize:13,verticalAlign:'top',color:C.txt,background:'transparent'};
  var total=f.filas.reduce(function(s,x){return s+(+x.valor||0);},0);

  var cabecera=h('div',{style:{marginBottom:12}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:2,lineHeight:1,color:'#fff'}},'Actas de siniestro'),
    h('div',{style:{fontSize:12.5,color:C.sub,marginTop:4}},'Ingresa los códigos, el mensajero, a quién va dirigido y la situación. El informe se redacta solo con los datos de cada pieza; puedes ajustar el texto antes de emitirlo.'));
  var tabs=h('div',{style:{display:'flex',gap:4,borderBottom:'1px solid rgba(255,255,255,.1)',marginBottom:14}},tabB('nueva','Nueva acta'),tabB('emitidas','Emitidas ('+((actas||[]).filter(function(a){return !a.anulada;}).length)+')'));

  if(tab==='emitidas'){var vis=(actas||[]).filter(function(a){if(!q)return true;var s=q.toLowerCase();return [a.numero,a.dirigido_a,a.mensajero,nombreSit(a),(a.codigos||[]).join(' ')].join(' ').toLowerCase().indexOf(s)>=0;});
    return h('div',{style:C.caja},cabecera,tabs,
      h('input',{placeholder:'Buscar número, código, mensajero o destinatario',value:q,onChange:function(e){setQ(e.target.value);},style:Object.assign({},inp,{maxWidth:360,marginBottom:12})}),
      actas==null?h('div',{style:{color:C.sub}},'Cargando…'):vis.length===0?h('div',{style:{color:C.sub,fontWeight:700,padding:10}},'Aún no hay actas de siniestro.'):
      h('div',{style:{display:'flex',flexDirection:'column',gap:8}},vis.map(function(a){var n=(a.codigos||[]).length;
        return h('div',{key:a.id,style:{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',padding:'12px 14px',borderRadius:14,background:C.fila,border:'1px solid '+C.bd,opacity:a.anulada?.5:1}},
          h('div',{style:{fontFamily:'JetBrains Mono, monospace',fontWeight:700,fontSize:13,padding:'5px 10px',borderRadius:8,background:'#3A3D2E',color:'#e8c766',whiteSpace:'nowrap'}},a.numero),
          h('div',{style:{flex:'1 1 260px',minWidth:0}},h('div',{style:{fontWeight:800,fontSize:14}},nombreSit(a)+' · '+plural(n,'pieza')+(a.anulada?' · ANULADA':'')),
            h('div',{style:{fontSize:12,color:C.sub}},'Para '+(a.dirigido_a||'—')+(a.mensajero?' · '+tit(a.mensajero):'')+' · '+dmy(a.fecha)+(a.emitida_por?' · emitida por '+tit(a.emitida_por):''))),
          h('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},boton('Ver informe / PDF',function(){abrirHtml(htmlActa(a));},'prim'),boton('Excel',function(){excel(a);}),esAdmin&&!a.anulada&&boton('Eliminar',function(){anular(a);},'peligro')));})));}

  var sitBtn=function(s){var on=f.sit===s.k;return h('button',{key:s.k,type:'button',onClick:function(){set({sit:s.k});},style:{padding:'8px 13px',borderRadius:999,border:'1px solid '+(on?'#e8c766':'rgba(255,255,255,.2)'),background:on?'linear-gradient(180deg,rgba(247,221,140,.35),rgba(174,136,41,.25))':'rgba(255,255,255,.04)',color:on?'#ffe59a':C.txt,fontWeight:800,fontSize:12.5,cursor:'pointer'}},s.t);};
  var sec=function(n,t,el){return h('div',{style:{marginBottom:16}},h('div',{style:{fontFamily:'Bebas Neue',fontSize:18,letterSpacing:1.4,color:'#ffe59a',marginBottom:8}},n+'. '+t),el);};
  return h('div',{style:C.caja},cabecera,tabs,
    sec(1,'Códigos de las piezas',h('div',null,
      h('div',{style:{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}},
        h('textarea',{rows:3,placeholder:'Pega los códigos (uno por línea, o separados por espacio o coma)',value:f.codigosTxt,onChange:function(e){set({codigosTxt:e.target.value});},style:Object.assign({},inp,{flex:'1 1 320px',fontFamily:'JetBrains Mono, monospace',fontSize:12.5})}),
        boton(buscando?'Buscando…':'Buscar códigos',buscar,'prim',buscando)),
      f.noEncontrados.length>0&&h('div',{style:{marginTop:8,fontSize:12.5,color:'#ffb3a6',fontWeight:700}},'No están en el sistema: '+f.noEncontrados.join(', ')+'. Van en el informe solo con el código.'),
      f.filas.length>0&&h('div',{style:{overflowX:'auto',marginTop:10,borderRadius:12,border:'1px solid rgba(255,255,255,.08)'}},h('table',{style:{width:'100%',borderCollapse:'collapse'}},
        h('thead',null,h('tr',null,['Código','Cliente','Destinatario','Comuna','Recibido','Estado','Mensajero','Valor declarado',''].map(function(c,i){return h('th',{key:i,style:th},c);}))),
        h('tbody',null,f.filas.map(function(x){return h('tr',{key:x.codigo},
          h('td',{style:Object.assign({},td,{fontFamily:'JetBrains Mono, monospace',fontSize:12.5})},x.codigo),h('td',{style:td},x.cliente||'—'),h('td',{style:td},tit(x.destinatario)||'—'),h('td',{style:td},tit(x.comuna)||'—'),
          h('td',{style:Object.assign({},td,{whiteSpace:'nowrap'})},dmy(x.fecha)),h('td',{style:td},x.existe?estSin(x.estado):'—'),h('td',{style:td},tit(x.mensajero)||'—',x.menSin?h('div',{style:{fontSize:11,color:'#ffb3a6',fontWeight:700,marginTop:2}},'En Siniestros figura '+tit(x.menSin)):null),
          h('td',{style:td},h('input',{value:x.valor===''||x.valor==null?'':String(x.valor),placeholder:'$',onChange:function(e){valor(x.codigo,e.target.value);},style:Object.assign({},inp,{width:110,padding:'6px 8px'})})),
          h('td',{style:td},h('button',{type:'button',onClick:function(){quitar(x.codigo);},title:'Quitar',style:{border:'none',background:'none',color:'#ff9b9b',fontWeight:900,cursor:'pointer',fontSize:15}},'×')));})),
        total>0&&h('tfoot',null,h('tr',null,h('td',{colSpan:7,style:Object.assign({},td,{fontWeight:800})},'Total valor declarado'),h('td',{colSpan:2,style:Object.assign({},td,{fontWeight:800,color:'#ffe59a'})},money(total)))))))),
    sec(2,'Datos del informe',h('div',{style:{display:'flex',gap:12,flexWrap:'wrap'}},
      campo('Dirigido a',h('div',null,h('input',{list:'as-cli',value:f.dirigido_a,placeholder:'Nombre o empresa',onChange:function(e){set({dirigido_a:e.target.value});},style:inp}),h('datalist',{id:'as-cli'},nombresCli.map(function(n){return h('option',{key:n,value:n});})))),
      campo('Cargo / área (opcional)',h('input',{value:f.dirigido_cargo,placeholder:'Ej: Encargado de logística',onChange:function(e){set({dirigido_cargo:e.target.value});},style:inp})),
      campo('Mensajero a cargo',h('div',null,h('input',{list:'as-men',value:f.mensajero,placeholder:'Nombre del mensajero',onChange:function(e){set({mensajero:e.target.value});},style:inp}),h('datalist',{id:'as-men'},nombresMen.map(function(n){return h('option',{key:n,value:n});})))),
      campo('Fecha del hecho',h('input',{type:'date',value:f.fecha_hecho,onChange:function(e){set({fecha_hecho:e.target.value});},style:inp}),'0 1 170px'),
      campo('Lugar (opcional)',h('input',{value:f.lugar,placeholder:'Ej: Av. Pajaritos con Las Torres, Maipú',onChange:function(e){set({lugar:e.target.value});},style:inp})))),
    sec(3,'Situación del siniestro',h('div',null,h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},SIT.map(sitBtn)),
      f.sit==='otro'&&h('input',{value:f.otro,placeholder:'Describe la situación (ej: pieza retenida por el destinatario)',onChange:function(e){set({otro:e.target.value});},style:Object.assign({},inp,{marginTop:10})}))),
    sec(4,'Redacción del informe',h('div',{style:{display:'flex',gap:12,flexWrap:'wrap'}},
      campo('Descripción de los hechos',h('textarea',{rows:6,value:f.relato,placeholder:'Elige la situación y se redacta sola. Agrega los detalles que conozcas.',onChange:function(e){set({relato:e.target.value,relatoTocado:true});},style:Object.assign({},inp,{lineHeight:1.5})}),'1 1 420px'),
      campo('Medidas adoptadas (una por línea)',h('textarea',{rows:6,value:f.medidas,onChange:function(e){set({medidas:e.target.value,medTocado:true});},style:Object.assign({},inp,{lineHeight:1.5})}),'1 1 320px'),
      (f.relatoTocado||f.medTocado)&&f.sit&&h('div',{style:{flexBasis:'100%'}},boton('Volver a redactar automáticamente',function(){set({relato:redactar(f),medidas:sitDe(f.sit).med,relatoTocado:false,medTocado:false});})))),
    h('div',{style:{position:'sticky',bottom:0,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'12px 14px',borderRadius:14,background:'rgba(20,22,15,.92)',border:'1px solid rgba(232,199,102,.35)',backdropFilter:'blur(6px)'}},
      h('div',{style:{fontWeight:800,color:falta?'#ffd27a':'#8fd3a8'}},falta||('Listo: '+plural(f.filas.length,'pieza')+' · '+sitDe(f.sit).t)),
      h('div',{style:{marginLeft:'auto',display:'flex',gap:8,flexWrap:'wrap'}},boton('Limpiar',function(){if(window.confirm('Borrar todo lo ingresado?'))setF(vacio);}),boton('Vista previa',vistaPrevia,null,!f.filas.length),boton(gen?'Emitiendo…':'Emitir acta',emitir,'prim',!!falta||gen))));
}
window.ActasSiniestro=ActasSiniestro;
})();
