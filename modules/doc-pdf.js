(function(){
// ══════════════════════════════════════════════════════════════════════════════════════
// DOCUMENTOS PDF TRANSPGSO (28-10-2026)
// Formato profesional único para:
//  - Informe libre (sección Informes)
//  - Comprobante de entrega / informe de estado de un envío (botón "Exportar PDF" en la ficha
//    del envío: Consulta Express y Gestión de Envíos)
// El documento se abre en una pestaña con dos botones: "Descargar PDF" (archivo .pdf directo,
// html2pdf.js) e "Imprimir". Tamaño carta/A4 vertical, encabezado con logo, pie con página.
// No muestra datos internos (nota_admin, valor de siniestro, descuentos).
// ══════════════════════════════════════════════════════════════════════════════════════
var db=window.__app.db, estadoInfo=window.__app.estadoInfo;
var LOGO='data:image/png;base64,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';
var EMPRESA={nombre:'TransPgso SpA',rut:'78.143.701-8',dir:'Exposición 902, Santiago Centro',mail:'contacto@transpgso.cl',web:'www.transpgso.cl',fono:'+56 9 4211 2940'};
var RE_IMG=/^\[imagen:(https?:\/\/[^\]\s]+)\]\s*(.*)$/;

function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
var TZ='America/Santiago';
// 24-11-2026: idioma del documento (es/en/zh). Por defecto español; comprobanteEnvio lo cambia
// mientras arma el documento. Los textos que escribe la gente (notas, observaciones) quedan como se escribieron.
var LG='es';var LOC={es:'es-CL',en:'en-GB',zh:'zh-CN'};
var I={
 es:{fecha:'Fecha',emitido:'Emitido',folio:'N°',btnPdf:'Descargar PDF',btnHtml:'Descargar HTML',btnPrint:'Imprimir',generando:'Generando PDF...',noGen:'No se pudo cargar el generador. Usa Imprimir > Guardar como PDF.',errGen:'Error al generar: usa Imprimir > Guardar como PDF',pagina:'Página',de:'de',pie:'Documento generado por el Sistema de Gestión TransPgso',
  preparando:'Preparando documento del envío',tComp:'COMPROBANTE DE ENTREGA',tInf:'INFORME DE ESTADO DE ENVÍO',tituloComp:'Comprobante de entrega',tituloInf:'Informe de estado',envio:'envío',cliente:'Cliente',destino:'Destino',
  entregadoEl:'Entregado el',alas:'a las',hrs:'hrs.',mensajero:'Mensajero',intentosEnt:'Intentos de entrega',vigente:'Estado vigente al',menAsig:'Mensajero asignado',intentosReg:'Intentos registrados',
  s1:'Datos del envío',codigo:'Código de envío',clienteRem:'Cliente / remitente',tipoServ:'Tipo de servicio',fechaDesp:'Fecha de despacho',ingreso:'Ingreso al sistema',peso:'Peso',cobro:'Cobro contra entrega',noAplica:'No aplica',estadoAct:'Estado actual',
  s2:'Destinatario y dirección de entrega',destinatario:'Destinatario',telefono:'Teléfono',direccion:'Dirección',comuna:'Comuna',referencia:'Referencia',
  s3:'Gestión de entrega y respaldo fotográfico',sinIntentos:'No hay intentos de entrega registrados para este envío.',intento:'Intento',resultado:'Resultado',fechaHora:'Fecha y hora',observacion:'Observación',sinObs:'Sin observaciones',
  corregido:'Resultado corregido por administración',motivo:'Motivo',fotoCorr:'Respaldo fotográfico corregido por administración',quito:'se quitó',agrego:'se agregó',foto:'foto',fotos:'fotos',figura:'Figura',respaldo:'Respaldo fotográfico',sinFotos:'Sin fotografías en este intento.',
  s4:'Trazabilidad del envío',detalle:'Detalle',estado:'Estado',responsable:'Responsable',sistema:'Sistema',sinMov:'Sin movimientos registrados.',ubicVer:'Ubicación verificada',delDestino:'m del destino',
  s5:'Etiqueta del envío',etiquetaPie:'Etiqueta registrada al ingreso del paquete.',flex:'Flex (Mercado Libre)',manual:'Envío Manual',archComp:'Comprobante_entrega_',archInf:'Informe_envio_',
  cierre:' certifica que la información de este documento corresponde a los registros de su sistema de gestión para el envío indicado, incluidos los respaldos fotográficos tomados por el mensajero al momento de la gestión. Horarios en hora de Chile continental. Para consultas: ',
  estadoCambiado:'Estado cambiado a'},
 en:{fecha:'Date',emitido:'Issued',folio:'No.',btnPdf:'Download PDF',btnHtml:'Download HTML',btnPrint:'Print',generando:'Generating PDF...',noGen:'The generator could not be loaded. Use Print > Save as PDF.',errGen:'Error generating: use Print > Save as PDF',pagina:'Page',de:'of',pie:'Document generated by the TransPgso Management System',
  preparando:'Preparing document for shipment',tComp:'PROOF OF DELIVERY',tInf:'SHIPMENT STATUS REPORT',tituloComp:'Proof of delivery',tituloInf:'Status report',envio:'shipment',cliente:'Client',destino:'Destination',
  entregadoEl:'Delivered on',alas:'at',hrs:'(Chile time).',mensajero:'Courier',intentosEnt:'Delivery attempts',vigente:'Current status as of',menAsig:'Assigned courier',intentosReg:'Recorded attempts',
  s1:'Shipment details',codigo:'Tracking code',clienteRem:'Client / sender',tipoServ:'Service type',fechaDesp:'Dispatch date',ingreso:'Received in system',peso:'Weight',cobro:'Cash on delivery',noAplica:'Not applicable',estadoAct:'Current status',
  s2:'Recipient and delivery address',destinatario:'Recipient',telefono:'Phone',direccion:'Address',comuna:'District (comuna)',referencia:'Reference',
  s3:'Delivery handling and photographic evidence',sinIntentos:'No delivery attempts recorded for this shipment.',intento:'Attempt',resultado:'Result',fechaHora:'Date and time',observacion:'Notes',sinObs:'No notes',
  corregido:'Result corrected by administration',motivo:'Reason',fotoCorr:'Photographic evidence corrected by administration',quito:'removed',agrego:'added',foto:'photo',fotos:'photos',figura:'Figure',respaldo:'Photographic evidence',sinFotos:'No photos for this attempt.',
  s4:'Shipment tracking history',detalle:'Detail',estado:'Status',responsable:'Handled by',sistema:'System',sinMov:'No movements recorded.',ubicVer:'Location verified',delDestino:'m from destination',
  s5:'Shipment label',etiquetaPie:'Label recorded when the package was received.',flex:'Flex (Mercado Libre)',manual:'Standard shipment',archComp:'Proof_of_delivery_',archInf:'Shipment_report_',
  cierre:' certifies that the information in this document matches the records of its management system for the indicated shipment, including the photographic evidence taken by the courier at the time of handling. Times are in mainland Chile time. Contact: ',
  estadoCambiado:'Status changed to'},
 zh:{fecha:'日期',emitido:'出具时间',folio:'编号',btnPdf:'下载 PDF',btnHtml:'下载 HTML',btnPrint:'打印',generando:'正在生成 PDF...',noGen:'无法加载生成器，请使用 打印 > 另存为 PDF。',errGen:'生成出错：请使用 打印 > 另存为 PDF',pagina:'第',de:'页，共',pie:'本文件由 TransPgso 管理系统生成',
  preparando:'正在准备运单文件',tComp:'签收证明',tInf:'运单状态报告',tituloComp:'签收证明',tituloInf:'状态报告',envio:'运单',cliente:'客户',destino:'目的地',
  entregadoEl:'送达日期',alas:'时间',hrs:'（智利时间）。',mensajero:'派送员',intentosEnt:'派送次数',vigente:'当前状态，截至',menAsig:'指派派送员',intentosReg:'已记录派送次数',
  s1:'运单信息',codigo:'运单号',clienteRem:'客户 / 寄件人',tipoServ:'服务类型',fechaDesp:'发货日期',ingreso:'入库时间',peso:'重量',cobro:'货到付款',noAplica:'不适用',estadoAct:'当前状态',
  s2:'收件人及派送地址',destinatario:'收件人',telefono:'电话',direccion:'地址',comuna:'区（comuna）',referencia:'备注',
  s3:'派送处理及照片凭证',sinIntentos:'该运单暂无派送记录。',intento:'第几次派送',resultado:'结果',fechaHora:'日期和时间',observacion:'说明',sinObs:'无说明',
  corregido:'结果已由管理员更正',motivo:'原因',fotoCorr:'照片凭证已由管理员更正',quito:'删除了',agrego:'添加了',foto:'张照片',fotos:'张照片',figura:'图',respaldo:'照片凭证',sinFotos:'本次派送无照片。',
  s4:'运单轨迹',detalle:'详情',estado:'状态',responsable:'处理人',sistema:'系统',sinMov:'暂无记录。',ubicVer:'位置已核实',delDestino:'米（距目的地）',
  s5:'运单标签',etiquetaPie:'包裹入库时登记的标签。',flex:'Flex（Mercado Libre）',manual:'普通快件',archComp:'签收证明_',archInf:'运单报告_',
  cierre:' 兹证明本文件信息与其管理系统中该运单的记录一致，包括派送员在处理时拍摄的照片凭证。时间为智利本土时间。咨询邮箱：',
  estadoCambiado:'状态变更为'}};
var EST_T={en:{en_bodega:'In warehouse',en_ruta:'Out for delivery',entregado:'Delivered',reprogramado:'Rescheduled',cancelado:'Cancelled',siniestro:'Lost / damaged',retorno:'Returned',en_bodega_cancelado:'Cancelled, in warehouse',en_bodega_fecha:'In warehouse, scheduled date'},
  zh:{en_bodega:'在仓库',en_ruta:'派送中',entregado:'已送达',reprogramado:'改期派送',cancelado:'已取消',siniestro:'丢失 / 损坏',retorno:'已退回',en_bodega_cancelado:'已取消（在仓库）',en_bodega_fecha:'在仓库（待指定日期派送）'}};
function t(k){return (I[LG]&&I[LG][k])||I.es[k]||k;}
function lblEstado(est){if(LG!=='es'&&EST_T[LG]&&EST_T[LG][est])return EST_T[LG][est];var i=estadoInfo(est)||{};return i.label||est||'—';}
function trNota(n){if(LG==='es'||!n)return n;var m=String(n).match(/^Estado cambiado a\s+(.+)$/i);if(m){var k=Object.keys(EST_T[LG]).find(function(x){var i=estadoInfo(x)||{};return String(i.label||'').toLowerCase()===m[1].trim().toLowerCase();});return t('estadoCambiado')+' '+(k?EST_T[LG][k]:m[1]);}return n;}
function fFecha(iso){if(!iso)return '—';try{var d=/^\d{4}-\d{2}-\d{2}$/.test(iso)?new Date(iso+'T12:00:00'):new Date(iso);return d.toLocaleDateString(LOC[LG]||'es-CL',{timeZone:TZ,day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return iso;}}
function fFechaLarga(iso){if(!iso)return '—';try{var d=/^\d{4}-\d{2}-\d{2}$/.test(iso)?new Date(iso+'T12:00:00'):new Date(iso);var t=d.toLocaleDateString(LOC[LG]||'es-CL',{timeZone:TZ,weekday:'long',day:'numeric',month:'long',year:'numeric'});return t.charAt(0).toUpperCase()+t.slice(1);}catch(e){return iso;}}
function fHora(iso){if(!iso)return '';try{return new Date(iso).toLocaleTimeString('es-CL',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:false});}catch(e){return '';}}
function fFH(iso){if(!iso)return '—';return fFecha(iso)+' '+fHora(iso);}
function clp(n){return '$'+Math.round(+n||0).toLocaleString('es-CL');}
function ahora(){var d=new Date();return fFecha(d.toISOString())+' '+fHora(d.toISOString());}

// ── Estilos del documento ─────────────────────────────────────────────────────────────
var CSS=''
+'*{box-sizing:border-box;margin:0;padding:0}'
+'html,body{background:#E9E6DD}'
+'body{font-family:"Inter","Helvetica Neue",Arial,sans-serif;color:#2B2E20;font-size:11.5px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
+'.acciones{position:sticky;top:0;z-index:10;display:flex;gap:8px;justify-content:center;padding:10px;background:#2B2E20}'
+'.acciones button{background:#C8A84B;color:#1d1f16;border:none;border-radius:6px;padding:9px 18px;font-weight:800;font-size:12px;letter-spacing:.5px;cursor:pointer}'
+'.acciones button.sec{background:transparent;color:#C8A84B;border:1px solid #C8A84B}'
+'.acciones span{color:#bbb;font-size:11px;align-self:center}'
+'#doc{width:794px;margin:18px auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.12)}'
+'.pag{padding:34px 44px 30px}'
+'.enc{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:3px solid #C8A84B}'
+'.enc .marca{display:flex;gap:12px;align-items:center}.enc img{height:54px;width:auto}'
+'.enc .emp{font-weight:900;font-size:17px;letter-spacing:.5px;color:#2B2E20}.enc .emp-d{font-size:9.5px;color:#6b6e5c;line-height:1.5}'
+'.enc .tipo{text-align:right}.enc .tipo .t{font-size:10px;font-weight:800;letter-spacing:2.5px;color:#A0842A}'
+'.enc .tipo .f{font-size:9.5px;color:#6b6e5c;margin-top:3px;line-height:1.5}.enc .tipo .folio{font-family:"JetBrains Mono",monospace;font-size:12px;font-weight:700;color:#2B2E20}'
+'h1.titulo{font-size:20px;font-weight:800;color:#2B2E20;margin:18px 0 4px;line-height:1.25}'
+'.subt{font-size:11px;color:#6b6e5c;margin-bottom:14px}'
+'table.meta{width:100%;border-collapse:collapse;margin-bottom:18px}'
+'table.meta td{border:1px solid #E4DCC5;padding:7px 10px;vertical-align:top;width:25%}'
+'table.meta .l{display:block;font-size:8.5px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:#A0842A;margin-bottom:2px}'
+'table.meta .v{font-size:11.5px;font-weight:600;color:#2B2E20;word-break:break-word}'
+'.sec{margin:0 0 16px}'
+'.sec h2{font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#2B2E20;padding:6px 10px;background:#F5F0E0;border-left:4px solid #C8A84B;margin-bottom:10px}'
+'.sec p{margin:0 0 9px;text-align:justify;white-space:pre-wrap}'
+'.sec ul{margin:0 0 9px 18px}.sec li{margin-bottom:3px}'
+'.sec h3{font-size:12px;font-weight:800;color:#A0842A;margin:12px 0 6px}'
+'.figs{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 12px;page-break-inside:avoid;break-inside:avoid}'
+'.figs.uno{grid-template-columns:1fr}'
+'figure{border:1px solid #E4DCC5;border-radius:4px;padding:6px;text-align:center;page-break-inside:avoid;break-inside:avoid;background:#FCFBF7}'
+'figure img{max-width:100%;height:250px;object-fit:contain;display:block;margin:0 auto}'
+'.figs.uno figure img{height:320px}'
+'figcaption{font-size:9.5px;color:#55584a;margin-top:5px;text-align:left}figcaption b{color:#2B2E20}'
+'table.tabla{width:100%;border-collapse:collapse;font-size:10.5px}'
+'table.tabla th{background:#2B2E20;color:#fff;text-align:left;padding:6px 8px;font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase}'
+'table.tabla td{padding:6px 8px;border-bottom:1px solid #EDE6D2;vertical-align:top}'
+'table.tabla tr:nth-child(even) td{background:#FBF8F0}'
+'table.tabla tr{page-break-inside:avoid;break-inside:avoid}'
+'.estado{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:800;color:#fff;white-space:nowrap}'
+'.resultado{display:flex;align-items:center;gap:16px;border:1.5px solid;border-radius:6px;padding:12px 16px;margin-bottom:18px;page-break-inside:avoid}'
+'.resultado .gr{font-size:20px;font-weight:900;letter-spacing:1px}.resultado .dt{font-size:11px;color:#2B2E20;line-height:1.6}'
+'.cierre{margin-top:22px;padding-top:12px;border-top:1px solid #E4DCC5;font-size:9.5px;color:#6b6e5c;line-height:1.6;page-break-inside:avoid}'
+'.firma{display:flex;justify-content:space-between;gap:30px;margin-top:34px;page-break-inside:avoid}'
+'.firma div{flex:1;border-top:1px solid #2B2E20;padding-top:5px;text-align:center;font-size:9.5px;color:#55584a}'
+'.pie{display:flex;justify-content:space-between;font-size:8.5px;color:#8a8d7a;border-top:1px solid #E4DCC5;margin-top:24px;padding-top:8px}'
+'@media print{html,body{background:#fff}.acciones{display:none}#doc{width:auto;margin:0;box-shadow:none}.pag{padding:0}'
+'@page{size:A4;margin:14mm 14mm 16mm 14mm;@bottom-right{content:"Página " counter(page) " de " counter(pages);font-size:8pt;color:#8a8d7a}}}';

function encabezadoHTML(tipo,folio,fechaDoc){
  return '<div class="enc"><div class="marca"><img src="'+LOGO+'"/><div><div class="emp">'+EMPRESA.nombre+'</div>'
    +'<div class="emp-d">RUT '+EMPRESA.rut+' · Last Mile Delivery<br/>'+EMPRESA.dir+'<br/>'+EMPRESA.mail+' · '+EMPRESA.web+'</div></div></div>'
    +'<div class="tipo"><div class="t">'+esc(tipo)+'</div>'+(folio?'<div class="folio">'+t('folio')+' '+esc(folio)+'</div>':'')
    +'<div class="f">'+t('fecha')+': '+esc(fechaDoc)+'<br/>'+t('emitido')+': '+esc(ahora())+'</div></div></div>';
}
function metaHTML(pares){
  var celdas=pares.map(function(p){return '<td'+(p[2]?' colspan="'+p[2]+'"':'')+'><span class="l">'+esc(p[0])+'</span><span class="v">'+(p[3]?p[1]:esc(p[1]==null||p[1]===''?'—':p[1]))+'</span></td>';});
  var filas=[],fila=[],ancho=0;
  pares.forEach(function(p,i){var w=p[2]||1;if(ancho+w>4){filas.push(fila);fila=[];ancho=0;}fila.push(celdas[i]);ancho+=w;});
  if(fila.length)filas.push(fila);
  return '<table class="meta">'+filas.map(function(f){return '<tr>'+f.join('')+'</tr>';}).join('')+'</table>';
}
function seccionHTML(n,titulo,html){return '<div class="sec"><h2>'+(n?n+'. ':'')+esc(titulo)+'</h2>'+html+'</div>';}
function figurasHTML(figs){ // figs: [{url,pie}]
  if(!figs.length)return '';
  // Filas de 2 (cada fila es un bloque que no se corta entre páginas).
  var una=function(f){return '<figure><img src="'+esc(f.url)+'" crossorigin="anonymous"/>'+(f.pie?'<figcaption>'+f.pie+'</figcaption>':'')+'</figure>';};
  if(figs.length===1)return '<div class="figs uno fila">'+una(figs[0])+'</div>';
  var out='';
  for(var i=0;i<figs.length;i+=2){out+='<div class="figs fila">'+una(figs[i])+(figs[i+1]?una(figs[i+1]):'<div></div>')+'</div>';}
  return out;
}

// Texto del informe libre → HTML (párrafos, "# subtítulo", "- lista", "[imagen:URL] pie").
// Imágenes seguidas se agrupan de a 2 por fila y se numeran como Figura N.
function cuerpoHTML(texto,contadorFig){
  var lineas=String(texto||'').replace(/\r/g,'').split('\n');
  var out=[],par=[],lista=[],figs=[];
  function cP(){if(par.length){out.push('<p>'+esc(par.join('\n'))+'</p>');par=[];}}
  function cL(){if(lista.length){out.push('<ul>'+lista.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul>');lista=[];}}
  function cF(){if(figs.length){out.push(figurasHTML(figs));figs=[];}}
  lineas.forEach(function(l){
    var t=l.trim();
    var m=t.match(RE_IMG);
    if(m){cP();cL();contadorFig.n++;figs.push({url:m[1],pie:'<b>Figura '+contadorFig.n+'.</b> '+esc((m[2]||'').trim())});return;}
    if(t===''){cP();cL();return;}
    cF();
    if(/^#\s+/.test(t)){cP();cL();out.push('<h3>'+esc(t.replace(/^#\s+/,''))+'</h3>');return;}
    if(/^[-•]\s+/.test(t)){cP();lista.push(t.replace(/^[-•]\s+/,''));return;}
    cL();par.push(l);
  });
  cP();cL();cF();
  return out.join('')||'<p style="color:#999">Sin contenido.</p>';
}

function documentoHTML(o){
  // o: {tipo, folio, fechaDoc, titulo, subtitulo, metaPares, cuerpo (html), cierre (html), firmas:[..], nombreArchivo}
  var html='<!DOCTYPE html><html lang="'+(LG==='zh'?'zh-CN':LG)+'"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>'
    +'<title>'+esc(o.nombreArchivo||o.titulo)+'</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@700'+(LG==='zh'?'&family=Noto+Sans+SC:wght@400;700;900':'')+'&display=swap" rel="stylesheet">'+(LG==='zh'?'<style>body{font-family:"Inter","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif!important}</style>':'')
    +'<style>'+CSS+'</style>'
    +'<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script></head><body>'
    +'<div class="acciones"><button id="btnPdf" onclick="descargarPDF()">'+t('btnPdf')+'</button><button class="sec" onclick="descargarHTMLDoc()">'+t('btnHtml')+'</button><button class="sec" onclick="window.print()">'+t('btnPrint')+'</button><span id="estadoPdf"></span></div>'
    +'<div id="doc"><div class="pag">'
    +encabezadoHTML(o.tipo,o.folio,o.fechaDoc)
    +'<h1 class="titulo">'+esc(o.titulo)+'</h1>'+(o.subtitulo?'<div class="subt">'+esc(o.subtitulo)+'</div>':'<div style="height:10px"></div>')
    +(o.metaPares?metaHTML(o.metaPares):'')
    +(o.cuerpo||'')
    +(o.firmas&&o.firmas.length?'<div class="firma">'+o.firmas.map(function(f){return '<div>'+esc(f)+'</div>';}).join('')+'</div>':'')
    +(o.cierre?'<div class="cierre">'+o.cierre+'</div>':'')
    +'<div class="pie"><span>'+EMPRESA.nombre+' · RUT '+EMPRESA.rut+' · '+EMPRESA.mail+'</span><span>'+t('pie')+'</span></div>'
    +'</div></div>'
    +'<script>'
    +'var CH=0,PS=null;var BASE='+JSON.stringify((o.nombreArchivo||'Documento TransPgso').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim())+';var NOMBRE=BASE+".pdf";'
    +'function descargarHTMLDoc(){var b=new Blob(["<!DOCTYPE html>"+document.documentElement.outerHTML],{type:"text/html"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=BASE+".html";document.body.appendChild(a);a.click();a.remove();}'
    +'function descargarPDF(){var b=document.getElementById("btnPdf"),e=document.getElementById("estadoPdf");'
    +'if(typeof html2pdf==="undefined"){e.textContent='+JSON.stringify(t('noGen'))+';return;}'
    +'b.disabled=true;e.textContent='+JSON.stringify(t('generando'))+';'
    +'var el=document.getElementById("doc");el.style.boxShadow="none";el.style.margin="0";window.scrollTo(0,0);'
    +'html2pdf().set({margin:[10,0,14,0],filename:NOMBRE,image:{type:"jpeg",quality:0.95},'
    +'html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff",scrollX:0,scrollY:0,x:0,y:0,windowWidth:794},'
    +'jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["css"],avoid:[".fila","tr",".resultado",".firma",".cierre",".enc","table.meta","h3"]}})'
    +'.from(el).toCanvas().get("canvas").then(function(c){CH=c.height;}).get("pageSize").then(function(ps){PS=ps;}).toPdf().get("pdf").then(function(pdf){var n=pdf.internal.getNumberOfPages();'
        +'if(PS&&CH&&n>1){var innerPx=Math.floor(PS.inner.px.height*2);var resto=CH-(n-1)*innerPx;if(resto<60){pdf.deletePage(n);n--;}}'
    +'for(var i=1;i<=n;i++){pdf.setPage(i);pdf.setFontSize(8);pdf.setTextColor(138,141,122);'
    +'pdf.text('+JSON.stringify(t('pagina'))+'+" "+i+" "+'+JSON.stringify(t('de'))+'+" "+n+'+JSON.stringify(LG==='zh'?' 页':'')+',pdf.internal.pageSize.getWidth()-14,pdf.internal.pageSize.getHeight()-6,{align:"right"});'
    +'pdf.text("'+EMPRESA.nombre+' · '+EMPRESA.web+'",14,pdf.internal.pageSize.getHeight()-6);}})'
    +'.save().then(function(){b.disabled=false;e.textContent="";el.style.boxShadow="";el.style.margin="";}).catch(function(err){b.disabled=false;e.textContent='+JSON.stringify(t('errGen'))+';});}'
    +'<\/script></body></html>';
  return html;
}
function abrir(w,html){
  var v=w||window.open('','_blank');
  if(!v){var blob=new Blob([html],{type:'text/html'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Documento_TransPgso.html';document.body.appendChild(a);a.click();a.remove();return;}
  v.document.open();v.document.write(html);v.document.close();
}

// ── 1) Informe libre ──────────────────────────────────────────────────────────────────
function informeLibreHTML(inf){
  var cont={n:0};
  var folio=inf.id?('INF-'+String(inf.id).padStart(5,'0')):'';
  return documentoHTML({
    tipo:'INFORME',folio:folio,fechaDoc:fFecha(inf.fecha_informe),
    titulo:inf.titulo||'Informe',
    metaPares:[['Fecha del informe',fFechaLarga(inf.fecha_informe),2],['Elaborado por',inf.autor||'—'],['Dirigido a',inf.destinatario||'—']],
    cuerpo:seccionHTML('', 'Desarrollo', cuerpoHTML(inf.cuerpo,cont)),
    firmas:[(inf.autor||'')+' — Elaborado por','Recibido por'],
    cierre:'Documento interno de '+EMPRESA.nombre+'. La información y las imágenes contenidas corresponden a los registros del sistema de gestión y a los respaldos aportados por el equipo a la fecha de emisión.',
    nombreArchivo:(inf.nombreArchivo||inf.titulo||'Informe')
  });
}

// ── 2) Comprobante de entrega / estado de un envío ────────────────────────────────────
function parseJSON(v){if(v==null)return null;if(typeof v!=='string')return v;try{var x=JSON.parse(v);return typeof x==='string'?parseJSON(x):x;}catch(e){return null;}}
function intentosDe(envio){
  var arr=parseJSON(envio.fotos_entrega);
  if(!Array.isArray(arr))return [];
  if(arr.length&&typeof arr[0]==='string')return [{intento:1,estado:envio.estado,fecha:null,mensajero:envio.mensajero,nota:'',fotos:arr}];
  return arr.filter(function(x){return x&&typeof x==='object';});
}
function tipoServicio(e){
  return e.fuente==='flex'?t('flex'):t('manual');
}
function badgeEstado(est){var i=estadoInfo(est)||{};return '<span class="estado" style="background:'+(i.color||'#777')+'">'+esc(lblEstado(est))+'</span>';}

async function comprobanteEnvio(codigo,ventana,idioma){
  var prev=LG;LG=(idioma==='en'||idioma==='zh')?idioma:'es';
  try{
  var w=ventana||window.open('','_blank');
  if(w){w.document.open();w.document.write('<meta charset="utf-8"><p style="font-family:Arial;padding:30px;color:#555">'+esc(t('preparando'))+' '+esc(codigo)+'…</p>');w.document.close();}
  var rE=await db.from('envios').select('codigo,cliente,destinatario,telefono,direccion,comuna,referencia,fecha,estado,mensajero,monto,en_un_cambio,nota,fuente,peso,created_at,updated_at,foto_etiqueta,fotos_entrega').eq('codigo',codigo).maybeSingle();
  if(rE.error||!rE.data){if(w)w.close();throw new Error(rE.error?rE.error.message:'Envío no encontrado');}
  var e=rE.data;
  var rH=await db.from('historial_envios').select('estado,nota,usuario,created_at,canal,gestion_distancia_m,gestion_verificada,gestion_fotos').eq('codigo_envio',codigo).order('created_at',{ascending:true});
  var hist=(rH.data||[]);
  var intentos=intentosDe(e);
  var evEntrega=hist.filter(function(h){return h.estado==='entregado';}).slice(-1)[0];
  var ent=e.estado==='entregado';
  var info=estadoInfo(e.estado)||{};
  var porCobrar=(+e.monto>0)||e.en_un_cambio;
  var nIntentos=intentos.length;
  var cuerpo='';
  var color=info.color||'#2B2E20';
  var detalleRes=ent
    ?(t('entregadoEl')+' <b>'+esc(fFechaLarga(evEntrega?evEntrega.created_at:e.updated_at))+'</b> '+t('alas')+' <b>'+esc(fHora(evEntrega?evEntrega.created_at:e.updated_at))+'</b> '+t('hrs')+'<br/>'+t('mensajero')+': <b>'+esc((evEntrega&&evEntrega.usuario)||e.mensajero||'—')+'</b>'+(nIntentos>1?' · '+t('intentosEnt')+': '+nIntentos:''))
    :(t('vigente')+' '+esc(ahora())+'.'+(e.mensajero?'<br/>'+t('menAsig')+': <b>'+esc(e.mensajero)+'</b>':'')+(nIntentos?' · '+t('intentosReg')+': '+nIntentos:''));
  cuerpo+='<div class="resultado" style="border-color:'+color+';background:'+color+'0d"><div class="gr" style="color:'+color+'">'+esc(lblEstado(e.estado).toUpperCase())+'</div><div class="dt">'+detalleRes+'</div></div>';
  var pares=[[t('codigo'),e.codigo],[t('clienteRem'),e.cliente],[t('tipoServ'),tipoServicio(e)],[t('fechaDesp'),fFecha(e.fecha)],
    [t('ingreso'),fFH(e.created_at)],[t('peso'),(+e.peso>0?(e.peso+' kg'):'—')],[t('cobro'),porCobrar?clp(e.monto):t('noAplica')],[t('estadoAct'),badgeEstado(e.estado),1,true]];
  cuerpo+=seccionHTML(1,t('s1'),metaHTML(pares));
  cuerpo+=seccionHTML(2,t('s2'),metaHTML([[t('destinatario'),e.destinatario,2],[t('telefono'),e.telefono,2],[t('direccion'),e.direccion,2],[t('comuna'),e.comuna],[t('referencia'),e.referencia||e.nota]]));
  var cont={n:0},g='';
  if(!intentos.length){g='<p>'+t('sinIntentos')+'</p>';}
  intentos.forEach(function(it0,ix){
    var it=Object.assign({},it0,{estado:it0.estado_final||(it0.correccion_estado&&it0.correccion_estado.a)||it0.estado});
    var fotos=(Array.isArray(it.fotos)?it.fotos:[]).filter(function(u){return typeof u==='string'&&u;});
    var nI=(it.intento||ix+1);
    g+='<h3>'+(LG==='zh'?'第 '+nI+' 次派送':t('intento')+' '+nI)+' · '+esc(lblEstado(it.estado))+(it.fecha?' · '+esc(fFH(it.fecha)):'')+'</h3>';
    g+=metaHTML([[t('resultado'),badgeEstado(it.estado),1,true],[t('fechaHora'),it.fecha?fFH(it.fecha):'—'],[t('mensajero'),it.mensajero||e.mensajero],[t('observacion'),it.nota||t('sinObs')]]);
    if(it.correccion_estado){var ce=it.correccion_estado;g+='<p style="background:#FBF3DC;border-left:3px solid #C8A84B;padding:6px 10px;font-size:10.5px"><b>'+t('corregido')+':</b> '+esc(lblEstado(ce.de))+' → '+esc(lblEstado(ce.a))+(ce.fecha?' ('+esc(fFH(ce.fecha))+')':'')+'. '+t('motivo')+': '+esc(ce.motivo||'—')+'</p>';}
    if(Array.isArray(it.correcciones)&&it.correcciones.length){g+='<p style="font-size:10px;color:#6b6e5c">'+it.correcciones.map(function(c){return t('fotoCorr')+' ('+esc(fFH(c.fecha))+'): '+(c.accion==='quitar'?t('quito'):t('agrego'))+' '+c.cantidad+' '+(c.cantidad!==1?t('fotos'):t('foto'))+'. '+t('motivo')+': '+esc(c.motivo||'—');}).join('<br/>')+'</p>';}
    if(fotos.length)g+=figurasHTML(fotos.map(function(u,k){cont.n++;return {url:u,pie:'<b>'+t('figura')+' '+cont.n+'.</b> '+t('respaldo')+' '+(k+1)+'/'+fotos.length+' — '+(LG==='zh'?'第 '+nI+' 次派送':t('intento').toLowerCase()+' '+nI)+'.'};}));
    else g+='<p style="color:#888">'+t('sinFotos')+'</p>';
  });
  cuerpo+=seccionHTML(3,t('s3'),g);
  var filas=hist.map(function(h){
    var extra=[];if(h.gestion_verificada===true)extra.push(t('ubicVer')+(h.gestion_distancia_m!=null?' ('+Math.round(h.gestion_distancia_m)+' '+t('delDestino')+')':''));
    return '<tr><td style="white-space:nowrap">'+esc(fFecha(h.created_at))+'<br/><span style="color:#888">'+esc(fHora(h.created_at))+'</span></td><td>'+badgeEstado(h.estado)+'</td><td>'+esc(trNota(h.nota)||'—')+(extra.length?'<br/><span style="color:#2e7d4f">'+esc(extra.join(' · '))+'</span>':'')+'</td><td>'+esc(h.usuario||t('sistema'))+'</td></tr>';
  }).join('');
  cuerpo+=seccionHTML(4,t('s4'),hist.length?'<table class="tabla"><tr><th style="width:90px">'+t('fecha')+'</th><th style="width:110px">'+t('estado')+'</th><th>'+t('detalle')+'</th><th style="width:140px">'+t('responsable')+'</th></tr>'+filas+'</table>':'<p>'+t('sinMov')+'</p>');
  if(e.foto_etiqueta&&/^(https?:|data:image)/.test(e.foto_etiqueta)){cont.n++;cuerpo+=seccionHTML(5,t('s5'),figurasHTML([{url:e.foto_etiqueta,pie:'<b>'+t('figura')+' '+cont.n+'.</b> '+t('etiquetaPie')}]));}
  var html=documentoHTML({
    tipo:ent?t('tComp'):t('tInf'),folio:e.codigo,fechaDoc:fFecha(new Date().toISOString()),
    titulo:(ent?t('tituloComp'):t('tituloInf'))+' — '+t('envio')+' '+e.codigo,
    subtitulo:t('cliente')+': '+(e.cliente||'—')+' · '+t('destino')+': '+(e.comuna||'—'),
    cuerpo:cuerpo,
    cierre:EMPRESA.nombre+t('cierre')+EMPRESA.mail+'.',
    nombreArchivo:(ent?t('archComp'):t('archInf'))+e.codigo+(LG!=='es'?'_'+LG.toUpperCase():'')
  });
  abrir(w,html);
  }finally{LG=prev;}
}

window.__docPDF={documentoHTML:documentoHTML,informeLibreHTML:informeLibreHTML,comprobanteEnvio:comprobanteEnvio,abrir:abrir,cuerpoHTML:cuerpoHTML};
})();
