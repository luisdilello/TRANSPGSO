(function(){
var h=React.createElement, useState=React.useState, useEffect=React.useEffect, useMemo=React.useMemo;
var db=window.__app.db, fechaHoyCL=window.__app.fechaHoyCL, exportToExcel=window.__app.exportToExcel;

// ══════════════════════════════════════════════════════════════════════════════════════
// SECCIÓN INFORMES (NUEVO 11-10-2026)
// Dos subsecciones:
//  1) Informe libre: el personal escribe y el sistema le da el formato TransPgso (mismo estilo
//     que los Recibos de Cobro / Cierre de Ruta). El texto queda tal cual lo escribieron; el
//     sistema NO lo reescribe. Se guarda en la tabla 'informes'.
//  2) Informe de cierre: 100% automático, por día / semana / mes / rango. Los números salen de
//     la función SQL public.informe_cierre_dia(p_dia) (ver su comentario en Supabase):
//       - Carga que llegó   = envíos con fecha = día (por cliente).
//       - Salió a ruta      = códigos con evento 'en_ruta' ese día (vale el último del día;
//                             el mensajero se toma de ese evento). NO cuenta FERNANDOCHECK
//                             (usuario de Fernando Zúñiga donde se apartan piezas de otras
//                             fechas o con tema de salida): va aparte como "retenidas".
//       - Cortes 19-23h     = de lo que salió a ruta, cuántos quedaron ENTREGADOS hasta esa hora.
//       - Final de ruta     = último estado registrado después de salir, hasta las 06:00 del día
//                             siguiente (entregado / reprogramado / cancelado / pendiente / otro).
//       - % de entrega      = entregados ÷ salió a ruta (pedido de Luis: base = lo que salió).
//       - % operacional     = entregados ÷ (entregados + reprogramados + cancelados), la misma
//                             "Efectividad Operativa" del resto del sistema.
//     Las notas del personal administrativo (tabla 'informe_cierre_notas') salen dentro del informe.
// ══════════════════════════════════════════════════════════════════════════════════════
var LOGO_B64='data:image/png;base64,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';
var HORAS_CORTE=[19,20,21,22,23];

function escHTML(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function estiloBaseHTML(titulo){
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5"/><meta name="theme-color" content="#C8A84B"/><title>'+escHTML(titulo)+'</title>'
    +'<style>*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}body{font-family:"DM Sans",system-ui,sans-serif;background:#F9F6EE;color:#444}'
    +'.barra-acciones{display:flex;gap:8px;justify-content:flex-end;max-width:980px;margin:12px auto 0;padding:0 16px}.barra-acciones button{background:#C8A84B;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;font-size:12px;cursor:pointer}'
    +'@media print{.barra-acciones{display:none}body{background:#fff}.encabezado{position:static!important;box-shadow:none!important}.tarjeta{break-inside:avoid;box-shadow:none!important}@page{margin:12mm}}</style></head><body>';
}
function barraAccionesHTML(){return '<div class="barra-acciones"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>';}
function headerReciboHTML(subtitulo,badge){
  return '<div class="encabezado" style="background:#fff;border-bottom:3px solid #C8A84B;padding:14px 16px;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(168,132,48,.15)"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;max-width:980px;margin:0 auto"><div style="display:flex;align-items:center;gap:10px"><img src="'+LOGO_B64+'" style="height:42px;width:auto;object-fit:contain"/><div><div style="font-weight:900;font-size:16px;color:#A0842A">TransPgso SpA</div><div style="font-size:10px;color:#888;letter-spacing:1.5px;text-transform:uppercase">'+escHTML(subtitulo)+'</div></div></div>'+(badge?'<span style="background:#FDF8EC;border:1.5px solid #C8A84B;color:#A0842A;font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap">'+escHTML(badge)+'</span>':'')+'</div></div>';
}
function tarjetaHTML(tituloSeccion,contenidoHTML){
  return '<div class="tarjeta" style="background:#fff;border-radius:14px;border:1.5px solid #EDE3C8;box-shadow:0 2px 12px rgba(168,132,48,.09);overflow:hidden;margin-bottom:16px"><div style="background:linear-gradient(135deg,#FDF8EC,#F5F0E0);padding:12px 18px;border-bottom:2px solid #C8A84B;display:flex;align-items:center;gap:8px"><span style="width:3px;height:16px;background:#C8A84B;border-radius:2px;flex-shrink:0;display:block"></span><span style="font-weight:700;font-size:14px;color:#A0842A">'+escHTML(tituloSeccion)+'</span></div><div style="padding:16px">'+contenidoHTML+'</div></div>';
}
function infoBoxHTML(label,valor,destacado){
  return '<div style="background:#FDF8EC;border-radius:8px;padding:10px 12px;border:1px solid #EDE3C8"><label style="display:block;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#A0842A;margin-bottom:2px">'+escHTML(label)+'</label><span style="font-size:'+(destacado?'20px':'13px')+';color:#333;font-weight:'+(destacado?'800':'500')+';white-space:pre-wrap">'+escHTML(valor==null||valor===''?'—':valor)+'</span></div>';
}
function gridHTML(cols,itemsHTML){return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax('+cols+'px,1fr));gap:8px">'+itemsHTML.join('')+'</div>';}
// columnas: [{key,label,num:true}] · filas: objetos · filaTotal opcional (se pinta en negrita)
function tablaHTML(columnas,filas,filaTotal,compacta){
  if(!filas||filas.length===0)return '<div style="font-size:12px;color:#999;padding:8px 0">Sin registros.</div>';
  var pad=compacta?'6px 5px':'7px 8px',fs=compacta?'11px':'12px';
  var th=function(c){return '<th style="text-align:'+(c.num?'right':'left')+';padding:'+pad+';font-size:'+(compacta?'9px':'10px')+';text-transform:uppercase;letter-spacing:1px;color:#A0842A;border-bottom:2px solid #EDE3C8;white-space:nowrap">'+escHTML(c.label)+'</th>';};
  var td=function(c,f,neg){return '<td style="padding:'+pad+';font-size:'+fs+';border-bottom:1px solid #F0EAD6;color:#444;text-align:'+(c.num?'right':'left')+';'+(c.num?'white-space:nowrap;font-variant-numeric:tabular-nums;':'')+(neg?'font-weight:800;background:#FDF8EC;':'')+'">'+(c.html?(f[c.key]==null?'':f[c.key]):escHTML(f[c.key]==null?'':f[c.key]))+'</td>';};
  var trs=filas.map(function(f){return '<tr>'+columnas.map(function(c){return td(c,f,false);}).join('')+'</tr>';}).join('');
  if(filaTotal)trs+='<tr>'+columnas.map(function(c){return td(c,filaTotal,true);}).join('')+'</tr>';
  return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">'+'<tr>'+columnas.map(th).join('')+'</tr>'+trs+'</table></div>';
}
function piePaginaHTML(texto){
  return '<div style="font-size:10px;color:#999;text-align:center;padding:10px 16px 24px;line-height:1.6">TransPgso SpA · RUT 78.143.701-8 · Exposición 902, Santiago · contacto@transpgso.cl'+(texto?'<br/>'+texto:'')+'</div>';
}
function abrirVentanaHTML(ventana,html){
  var w=ventana||window.open('','_blank');
  if(!w){descargarHTML('Informe.html',html);return;}
  w.document.open();w.document.write(html);w.document.close();
}
function descargarHTML(nombreArchivo,htmlContent){
  var blob=new Blob([htmlContent],{type:'text/html'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download=nombreArchivo;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},2000);
}

// ── Fechas ─────────────────────────────────────────────────────────────────────────────
function parseYMD(s){var p=String(s||'').split('-');return new Date(+p[0],(+p[1]||1)-1,+p[2]||1);}
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function lunesDe(s){var d=parseYMD(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return d;}
function sumarDias(s,n){var d=parseYMD(s);d.setDate(d.getDate()+n);return ymd(d);}
function fmtDMY(s){var p=String(s||'').split('-');return p.length===3?p[2]+'-'+p[1]+'-'+p[0]:String(s||'');}
function fmtDiaLargo(s){var d=parseYMD(s);var dia=d.toLocaleDateString('es-CL',{weekday:'long'});return dia.charAt(0).toUpperCase()+dia.slice(1)+' '+fmtDMY(s);}
function listaDias(desde,hasta){var out=[];var d=desde;var guard=0;while(d<=hasta&&guard<400){out.push(d);d=sumarDias(d,1);guard++;}return out;}
var MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function limitesPeriodo(modo,fechaDia,mes,desde,hasta){
  if(modo==='dia')return{desde:fechaDia,hasta:fechaDia,label:fmtDiaLargo(fechaDia)};
  if(modo==='semana'){var l=ymd(lunesDe(fechaDia));var dom=sumarDias(l,6);return{desde:l,hasta:dom,label:'Semana del '+fmtDMY(l)+' al '+fmtDMY(dom)};}
  if(modo==='mes'){var p=String(mes||'').split('-');var ini=p[0]+'-'+p[1]+'-01';var fin=ymd(new Date(+p[0],+p[1],0));return{desde:ini,hasta:fin,label:MESES[(+p[1])-1]+' '+p[0]};}
  return{desde:desde,hasta:hasta,label:'Del '+fmtDMY(desde)+' al '+fmtDMY(hasta)};
}
function pct(a,b){return b>0?(a/b*100).toFixed(1).replace('.',',')+'%':'—';}
function fmtN(n){return Number(n||0).toLocaleString('es-CL');}
function horaCL(iso){try{return new Date(iso).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'America/Santiago'});}catch(e){return '';}}
function fechaHoraCL(iso){try{return new Date(iso).toLocaleString('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});}catch(e){return '';}}
// ¿Ya pasó la hora de corte 'hora' del día 'dia' (hora de Chile)?
function cortePasado(dia,hora){
  var hoy=fechaHoyCL();
  if(dia<hoy)return true;
  if(dia>hoy)return false;
  var hNow=+new Intl.DateTimeFormat('en-GB',{timeZone:'America/Santiago',hour:'2-digit',hour12:false}).format(new Date());
  return hNow>=hora;
}

// ══════════════════════════════════════════════════════════════════════════════════════
// INFORME DE CIERRE — agregación (uno o varios días)
// ══════════════════════════════════════════════════════════════════════════════════════
function agregarDias(dias){
  var t={llegada:0,manual:0,salida:0,salidaDia:0,salidaAnt:0,cortes:HORAS_CORTE.map(function(){return 0;}),ent:0,rep:0,can:0,pen:0,otr:0,tardias:0,diaEnCurso:false,retenidas:0,retenidasDia:0,retenidasEnt:0,
    noSalio:0,noSalioRet:0,noSalioCodigos:[],cal:{ent:0,fotos2:0,sinFotos:0,panel:0,rep:0,repGps:0}};
  var men={},cli={},sin={},nsCli={},nsEst={},marc={};
  dias.forEach(function(d){
    (d.sin_salida||[]).forEach(function(x){var y=sin[x.mensajero]||(sin[x.mensajero]={mensajero:x.mensajero,dias:0,entregas:0});y.dias++;y.entregas+=+x.entregas_del_dia||0;});
    t.llegada+=+d.llegada.total||0;t.manual+=+d.llegada.manual||0;
    t.salida+=+d.salida.total||0;t.salidaDia+=+d.salida.del_dia||0;t.salidaAnt+=+d.salida.anteriores||0;
    (d.cortes||[]).forEach(function(c,i){t.cortes[i]+=+c.entregados||0;});
    var f=d.final||{};t.ent+=+f.entregados||0;t.rep+=+f.reprogramados||0;t.can+=+f.cancelados||0;t.pen+=+f.pendientes||0;t.otr+=+f.otros||0;t.tardias+=+f.tardias||0;
    if(!cortePasado(d.dia,23))t.diaEnCurso=true;
    var rt=d.retenidas||{};t.retenidas+=+rt.total||0;t.retenidasDia+=+rt.del_dia||0;t.retenidasEnt+=+rt.entregados_despues||0;
    var ns=d.no_salio||{};t.noSalio+=+ns.total||0;t.noSalioRet+=+ns.retenidas||0;
    (ns.por_cliente||[]).forEach(function(c){nsCli[c.cliente]=(nsCli[c.cliente]||0)+(+c.n||0);});
    (ns.por_estado||[]).forEach(function(c){nsEst[c.estado]=(nsEst[c.estado]||0)+(+c.n||0);});
    (ns.codigos||[]).forEach(function(c){t.noSalioCodigos.push(Object.assign({dia:d.dia},c));});
    var cq=d.calidad||{};t.cal.ent+=+cq.entregados||0;t.cal.fotos2+=+cq.con_2_fotos||0;t.cal.sinFotos+=+cq.sin_2_fotos||0;t.cal.panel+=+cq.desde_panel||0;t.cal.rep+=+cq.reprogramados||0;t.cal.repGps+=+cq.reprog_con_gps||0;
    (cq.marcadas_por||[]).forEach(function(u){marc[u.usuario]=(marc[u.usuario]||0)+(+u.n||0);});
    (d.mensajeros||[]).forEach(function(m){
      var x=men[m.mensajero]||(men[m.mensajero]={mensajero:m.mensajero,dias:0,salida:0,cortes:HORAS_CORTE.map(function(){return 0;}),ent:0,rep:0,can:0,pen:0,otr:0,primera:null,fotos2:0,sinFotos:0,panel:0,repGps:0});
      x.dias++;x.salida+=+m.salida||0;(m.cortes||[]).forEach(function(v,i){x.cortes[i]+=+v||0;});
      x.ent+=+m.entregados||0;x.rep+=+m.reprogramados||0;x.can+=+m.cancelados||0;x.pen+=+m.pendientes||0;x.otr+=+m.otros||0;
      x.fotos2+=+m.con_2_fotos||0;x.sinFotos+=+m.sin_2_fotos||0;x.panel+=+m.desde_panel||0;x.repGps+=+m.reprog_con_gps||0;
      if(dias.length===1)x.primera=m.primera_salida;
    });
    (d.clientes||[]).forEach(function(c){
      var y=cli[c.cliente]||(cli[c.cliente]={cliente:c.cliente,llegada:0,salida:0,ent:0,rep:0,can:0,pen:0,noSalio:0});y.noSalio+=+c.no_salio||0;
      y.llegada+=+c.llegada||0;y.salida+=+c.salida||0;y.ent+=+c.entregados||0;y.rep+=+c.reprogramados||0;y.can+=+c.cancelados||0;y.pen+=+c.pendientes||0;
    });
  });
  t.mensajeros=Object.keys(men).map(function(k){return men[k];}).sort(function(a,b){return b.salida-a.salida||a.mensajero.localeCompare(b.mensajero);});
  t.sinSalida=Object.keys(sin).map(function(k){return sin[k];}).sort(function(a,b){return b.dias-a.dias||a.mensajero.localeCompare(b.mensajero);});
  t.nDias=dias.length;
  t.noSalioPorCliente=Object.keys(nsCli).map(function(k){return{cliente:k,n:nsCli[k]};}).sort(function(a,b){return b.n-a.n;});
  t.noSalioPorEstado=Object.keys(nsEst).map(function(k){return{estado:k,n:nsEst[k]};}).sort(function(a,b){return b.n-a.n;});
  t.marcadasPor=Object.keys(marc).map(function(k){return{usuario:k,n:marc[k]};}).sort(function(a,b){return b.n-a.n;});
  t.clientes=Object.keys(cli).map(function(k){return cli[k];}).sort(function(a,b){return b.llegada-a.llegada||b.salida-a.salida;});
  return t;
}
function oper(ent,rep,can){return pct(ent,ent+rep+can);}
var NOMBRES_ESTADO={en_bodega:'En bodega',en_ruta:'En ruta',entregado:'Entregado',reprogramado:'Reprogramado',cancelado:'Cancelado',siniestro:'Siniestro',retorno:'Retorno',en_bodega_cancelado:'En bodega cancelado',en_bodega_fecha:'En bodega por fecha',sin_asignar:'Sin asignar'};
function nombreEstado(e){return NOMBRES_ESTADO[e]||e||'—';}
function pctNum(a,b){return b>0?a/b*100:null;}
function celdaCorte(n,base){return fmtN(n)+'<div style="font-size:9px;color:#A0842A;font-weight:700">'+pct(n,base)+'</div>';}

function construirFilasCierre(dias,t){
  var multi=dias.length>1;
  var cortes=HORAS_CORTE.map(function(hh,i){
    var pasado=multi?true:cortePasado(dias[0].dia,hh);
    return{corte:(i===HORAS_CORTE.length-1?'Corte final ':'Corte ')+hh+':00',entregados:pasado?fmtN(t.cortes[i]):'En curso',pct:pasado?pct(t.cortes[i],t.salida):'—',porEntregar:pasado?fmtN(t.salida-t.cortes[i]):'—'};
  });
  cortes.push({corte:'Final de ruta',entregados:fmtN(t.ent),pct:pct(t.ent,t.salida),porEntregar:fmtN(t.salida-t.ent)});
  var clientes=t.clientes.map(function(c){return{cliente:c.cliente,noSalio:c.noSalio?fmtN(c.noSalio):'—',llegada:fmtN(c.llegada),salida:fmtN(c.salida),ent:fmtN(c.ent),rep:fmtN(c.rep),can:fmtN(c.can),pen:fmtN(c.pen),pct:pct(c.ent,c.salida)};});
  var totCli={cliente:'TOTAL',noSalio:fmtN(t.noSalio),llegada:fmtN(t.llegada),salida:fmtN(t.salida),ent:fmtN(t.ent),rep:fmtN(t.rep),can:fmtN(t.can),pen:fmtN(t.pen),pct:pct(t.ent,t.salida)};
  var mens=t.mensajeros.map(function(m){
    var o={mensajero:m.mensajero,dias:m.dias,salida:fmtN(m.salida),ent:fmtN(m.ent),rep:fmtN(m.rep),can:fmtN(m.can),pen:fmtN(m.pen+m.otr),pct:pct(m.ent,m.salida),oper:oper(m.ent,m.rep,m.can),primera:m.primera?horaCL(m.primera):''};
    HORAS_CORTE.forEach(function(hh,i){o['c'+hh]=(multi||cortePasado(dias[0].dia,hh))?celdaCorte(m.cortes[i],m.salida):'—';});
    return o;
  });
  var totMen={mensajero:'TOTAL ('+t.mensajeros.length+' mensajeros)',dias:'',salida:fmtN(t.salida),ent:fmtN(t.ent),rep:fmtN(t.rep),can:fmtN(t.can),pen:fmtN(t.pen+t.otr),pct:pct(t.ent,t.salida),oper:oper(t.ent,t.rep,t.can),primera:''};
  HORAS_CORTE.forEach(function(hh,i){totMen['c'+hh]=(multi||cortePasado(dias[0].dia,hh))?celdaCorte(t.cortes[i],t.salida):'—';});
  var porDia=dias.map(function(d){
    var f=d.final||{};var sal=+d.salida.total||0;
    var o={fecha:fmtDiaLargo(d.dia),llegada:fmtN(d.llegada.total),salida:fmtN(sal),ent:fmtN(f.entregados),pct:pct(f.entregados,sal),oper:oper(+f.entregados||0,+f.reprogramados||0,+f.cancelados||0)};
    HORAS_CORTE.forEach(function(hh,i){o['c'+hh]=cortePasado(d.dia,hh)?pct((d.cortes[i]||{}).entregados||0,sal):'—';});
    return o;
  });
  var sinSalida=t.sinSalida.map(function(x){return{mensajero:x.mensajero,dias:x.dias+' de '+dias.length,entregas:x.entregas?fmtN(x.entregas):'—'};});
  var calidad=t.mensajeros.map(function(m){return{mensajero:m.mensajero,ent:fmtN(m.ent),fotos2:fmtN(m.fotos2)+' ('+pct(m.fotos2,m.ent)+')',sinFotos:m.sinFotos?fmtN(m.sinFotos):'—',panel:m.panel?fmtN(m.panel)+' ('+pct(m.panel,m.ent)+')':'—',rep:fmtN(m.rep),repGps:m.rep?fmtN(m.repGps)+' ('+pct(m.repGps,m.rep)+')':'—'};});
  var totCal={mensajero:'TOTAL',ent:fmtN(t.cal.ent),fotos2:fmtN(t.cal.fotos2)+' ('+pct(t.cal.fotos2,t.cal.ent)+')',sinFotos:fmtN(t.cal.sinFotos),panel:fmtN(t.cal.panel)+' ('+pct(t.cal.panel,t.cal.ent)+')',rep:fmtN(t.cal.rep),repGps:fmtN(t.cal.repGps)+' ('+pct(t.cal.repGps,t.cal.rep)+')'};
  var noSalio=t.noSalioCodigos.map(function(c){return{dia:fmtDMY(c.dia),codigo:c.codigo,cliente:c.cliente,comuna:c.comuna||'—',destinatario:c.destinatario||'—',estado:nombreEstado(c.estado)+(c.retenida?' · retenida FERNANDOCHECK':'')};});
  return{cortes:cortes,clientes:clientes,totCli:totCli,mens:mens,totMen:totMen,porDia:porDia,sinSalida:sinSalida,calidad:calidad,totCal:totCal,noSalio:noSalio};
}


// ══════════════════════════════════════════════════════════════════════════════════════
// ALERTAS (arriba del informe). Umbrales editables por un admin; se guardan en la tabla
// 'configuracion' (clave 'informe_cierre_alertas'), mismo mecanismo que otras pantallas.
// ══════════════════════════════════════════════════════════════════════════════════════
var CFG_ALERTAS_DEFAULT={entregaMinGlobal:90,entregaMinMensajero:85,entregaMinCliente:85,minPiezas:5,horaSalidaTarde:'16:00',caidaPuntos:5,maxNoSalio:0,maxPctOperador:0};
function calcularAlertas(dias,t,prevT,cfg){
  var c=Object.assign({},CFG_ALERTAS_DEFAULT,cfg||{});
  var A=[];var multi=dias.length>1;var cerrado=!t.diaEnCurso;
  var pFinal=pctNum(t.ent,t.salida),pOper=pctNum(t.ent,t.ent+t.rep+t.can);
  if(cerrado&&pFinal!=null&&pFinal<c.entregaMinGlobal)A.push({nivel:'alta',texto:'% de entrega final de '+pct(t.ent,t.salida)+', bajo la meta de '+c.entregaMinGlobal+'%.'});
  if(!multi&&prevT&&cerrado){
    var pPrev=pctNum(prevT.ent,prevT.salida),oPrev=pctNum(prevT.ent,prevT.ent+prevT.rep+prevT.can);
    if(pFinal!=null&&pPrev!=null&&pPrev-pFinal>=c.caidaPuntos)A.push({nivel:'alta',texto:'El % de entrega final cayó '+(pPrev-pFinal).toFixed(1).replace('.',',')+' puntos contra el día anterior ('+pct(prevT.ent,prevT.salida)+' → '+pct(t.ent,t.salida)+').'});
    if(pOper!=null&&oPrev!=null&&oPrev-pOper>=c.caidaPuntos)A.push({nivel:'alta',texto:'El % operacional cayó '+(oPrev-pOper).toFixed(1).replace('.',',')+' puntos contra el día anterior.'});
  }
  if(t.cal.sinFotos>0)A.push({nivel:'alta',texto:fmtN(t.cal.sinFotos)+' entrega'+(t.cal.sinFotos>1?'s':'')+' sin las 2 fotos de respaldo.'});
  if(cerrado){
    var mBajo=t.mensajeros.filter(function(m){return m.salida>=c.minPiezas&&pctNum(m.ent,m.salida)<c.entregaMinMensajero;});
    if(mBajo.length)A.push({nivel:'media',texto:mBajo.length+' mensajero'+(mBajo.length>1?'s':'')+' bajo '+c.entregaMinMensajero+'% de entrega: '+mBajo.map(function(m){return m.mensajero+' ('+pct(m.ent,m.salida)+')';}).join(', ')+'.'});
    var cBajo=t.clientes.filter(function(x){return x.salida>=c.minPiezas&&pctNum(x.ent,x.salida)<c.entregaMinCliente;});
    if(cBajo.length)A.push({nivel:'media',texto:cBajo.length+' cliente'+(cBajo.length>1?'s':'')+' bajo '+c.entregaMinCliente+'% de entrega: '+cBajo.map(function(x){return x.cliente+' ('+pct(x.ent,x.salida)+')';}).join(', ')+'.'});
    if(t.pen+t.otr>0)A.push({nivel:'media',texto:fmtN(t.pen+t.otr)+' pieza'+(t.pen+t.otr>1?'s':'')+' que salieron a ruta quedaron sin cierre (sin entrega, reagenda ni cancelación).'});
  }
  if(!multi){
    var hLim=String(c.horaSalidaTarde||'16:00');
    var tarde=t.mensajeros.filter(function(m){return m.primera&&horaCL(m.primera)>hLim;});
    if(tarde.length)A.push({nivel:'media',texto:tarde.length+' mensajero'+(tarde.length>1?'s':'')+' salió después de las '+hLim+': '+tarde.map(function(m){return m.mensajero+' ('+horaCL(m.primera)+')';}).join(', ')+'.'});
  }
  if(t.noSalio>c.maxNoSalio)A.push({nivel:'media',texto:fmtN(t.noSalio)+' pieza'+(t.noSalio>1?'s':'')+' llegaron y no salieron a ruta ('+t.noSalioPorCliente.slice(0,4).map(function(x){return x.cliente+': '+x.n;}).join(', ')+(t.noSalioPorCliente.length>4?'…':'')+').'});
  var pPanel=pctNum(t.cal.panel,t.cal.ent);
  if(c.maxPctOperador>0&&pPanel!=null&&pPanel>c.maxPctOperador)A.push({nivel:'media',texto:pct(t.cal.panel,t.cal.ent)+' de las entregas las marcó un operador y no el mensajero desde la app (límite '+c.maxPctOperador+'%).'});
  if(t.retenidas>0)A.push({nivel:'info',texto:fmtN(t.retenidas)+' pieza'+(t.retenidas>1?'s':'')+' retenida'+(t.retenidas>1?'s':'')+' por operación en FERNANDOCHECK.'});
  if(t.diaEnCurso)A.push({nivel:'info',texto:'Las alertas de % final, mensajeros, clientes y piezas sin cierre se activan cuando termina el día (después del corte de las 23:00).'});
  return A;
}
function alertasHTML(A){
  var reales=A.filter(function(a){return a.nivel!=='info';});
  var estilo={alta:['#FDECEC','#C62828','ALTA'],media:['#FFF4E5','#B26A00','MEDIA'],info:['#F3F1EA','#7a7d6a','INFO']};
  var items=A.map(function(a){var e=estilo[a.nivel];return '<div style="display:flex;gap:10px;align-items:flex-start;background:'+e[0]+';border-left:4px solid '+e[1]+';border-radius:8px;padding:9px 12px;margin-bottom:6px"><span style="font-size:9px;font-weight:800;letter-spacing:1px;color:'+e[1]+';min-width:42px;padding-top:2px">'+e[2]+'</span><span style="font-size:13px;color:#333;line-height:1.45">'+escHTML(a.texto)+'</span></div>';}).join('');
  if(!reales.length)items='<div style="background:#EAF6EC;border-left:4px solid #2E7D32;border-radius:8px;padding:9px 12px;margin-bottom:6px;font-size:13px;font-weight:700;color:#2E7D32">Sin alertas: todo dentro de las metas.</div>'+items;
  return tarjetaHTML('Alertas'+(reales.length?' ('+reales.length+')':''),items);
}
function htmlInformeCierre(dias,t,notas,periodo,generadoPor,alertas){
  var multi=dias.length>1;
  var F=construirFilasCierre(dias,t);
  var colsCortes=[{key:'corte',label:'Corte'},{key:'entregados',label:'Entregados acumulados',num:true},{key:'pct',label:'% sobre salida a ruta',num:true},{key:'porEntregar',label:'Sin entregar',num:true}];
  var colsCli=[{key:'cliente',label:'Cliente'},{key:'llegada',label:'Llegó',num:true},{key:'noSalio',label:'Llegó y no salió',num:true},{key:'salida',label:'Salió a ruta',num:true},{key:'ent',label:'Entregados',num:true},{key:'rep',label:'Reprog.',num:true},{key:'can',label:'Cancel.',num:true},{key:'pen',label:'Pend.',num:true},{key:'pct',label:'% entrega',num:true}];
  var colsMen=[{key:'mensajero',label:'Mensajero'}].concat(multi?[{key:'dias',label:'Días',num:true}]:[{key:'primera',label:'Salió',num:true}]).concat([{key:'salida',label:'Llevó',num:true}])
    .concat(HORAS_CORTE.map(function(hh){return{key:'c'+hh,label:hh+':00',num:true,html:true};}))
    .concat([{key:'ent',label:'Final',num:true},{key:'rep',label:'Reprog.',num:true},{key:'can',label:'Cancel.',num:true},{key:'pen',label:'Pend.',num:true},{key:'pct',label:'% entrega',num:true},{key:'oper',label:'% operac.',num:true}]);
  var colsDia=[{key:'fecha',label:'Día'},{key:'llegada',label:'Llegó',num:true},{key:'salida',label:'Salió',num:true}]
    .concat(HORAS_CORTE.map(function(hh){return{key:'c'+hh,label:hh+':00',num:true};}))
    .concat([{key:'ent',label:'Entregados',num:true},{key:'pct',label:'% final',num:true},{key:'oper',label:'% operac.',num:true}]);
  var notasHTML=notas.length===0?'<div style="font-size:12px;color:#999">Sin notas del personal para este período.</div>':notas.map(function(n){
    return '<div style="border-left:3px solid #C8A84B;background:#FDF8EC;border-radius:6px;padding:10px 12px;margin-bottom:8px"><div style="font-size:10px;color:#A0842A;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">'+escHTML(fmtDiaLargo(n.fecha))+' · '+escHTML(n.autor||'—')+' · '+escHTML(horaCL(n.created_at))+'</div><div style="font-size:13px;color:#333;white-space:pre-wrap;line-height:1.5">'+escHTML(n.texto)+'</div></div>';
  }).join('');
  var titulo='Informe de Cierre - '+periodo.label;
  return estiloBaseHTML(titulo)
    +headerReciboHTML('Informe de Cierre · Operaciones',periodo.label)
    +barraAccionesHTML()
    +'<div style="padding:16px;max-width:980px;margin:0 auto">'
    +(t.diaEnCurso?'<div style="background:#FFF4E5;border:1px solid #E8B04B;color:#8a5a00;border-radius:10px;padding:10px 14px;font-size:12px;font-weight:700;margin-bottom:16px">El día de hoy todavía está en curso: los cortes que aún no llegan su hora y el final de ruta se completarán solos al volver a generar el informe.</div>':'')
    +(alertas?alertasHTML(alertas):'')
    +tarjetaHTML('Resumen del '+(multi?'período':'día'),
       gridHTML(150,[infoBoxHTML('Período',periodo.label),infoBoxHTML('Días incluidos',String(dias.length)),infoBoxHTML('Generado por',generadoPor),infoBoxHTML('Generado el',fechaHoraCL(new Date().toISOString()))])
      +'<div style="height:10px"></div>'
      +gridHTML(150,[infoBoxHTML('Carga que llegó',fmtN(t.llegada),true),infoBoxHTML('Salió a ruta',fmtN(t.salida),true),infoBoxHTML('Entregados (final de ruta)',fmtN(t.ent),true),infoBoxHTML('% de entrega final',pct(t.ent,t.salida),true),infoBoxHTML('% operacional total',oper(t.ent,t.rep,t.can),true)])
      +'<div style="height:10px"></div>'
      +gridHTML(150,[infoBoxHTML('Salida: carga del día',fmtN(t.salidaDia)),infoBoxHTML('Salida: de días anteriores',fmtN(t.salidaAnt)),infoBoxHTML('Reprogramados',fmtN(t.rep)),infoBoxHTML('Cancelados',fmtN(t.can)),infoBoxHTML('Sin cierre (pendiente / otro)',fmtN(t.pen+t.otr)),infoBoxHTML('Entregados después de las 23:00',fmtN(t.tardias)),infoBoxHTML('Retenidas por operación (FERNANDOCHECK)',fmtN(t.retenidas)+(t.retenidas?' · '+fmtN(t.retenidasDia)+' del día · '+fmtN(t.retenidasEnt)+' entregadas después':''))]))
    +tarjetaHTML('Cortes horarios — avance de entrega sobre lo que salió a ruta',tablaHTML(colsCortes,F.cortes))
    +tarjetaHTML('Carga que llegó y no salió a ruta ('+fmtN(t.noSalio)+')',
       (t.noSalio===0?'<div style="font-size:12px;color:#2E7D32;font-weight:700">Toda la carga que llegó salió a ruta '+(multi?'el mismo día.':'ese día.')+'</div>':
        gridHTML(200,[infoBoxHTML('Llegó y no salió',fmtN(t.noSalio)+' de '+fmtN(t.llegada)+' ('+pct(t.noSalio,t.llegada)+')',true),infoBoxHTML('De esas, retenidas por operación',fmtN(t.noSalioRet)),infoBoxHTML('Por cliente',t.noSalioPorCliente.map(function(c){return c.cliente+': '+c.n;}).join('\n')),infoBoxHTML('Estado al cierre',t.noSalioPorEstado.map(function(c){return nombreEstado(c.estado)+': '+c.n;}).join('\n'))])
        +'<div style="height:10px"></div>'
        +tablaHTML((multi?[{key:'dia',label:'Día'}]:[]).concat([{key:'codigo',label:'Código'},{key:'cliente',label:'Cliente'},{key:'comuna',label:'Comuna'},{key:'destinatario',label:'Destinatario'},{key:'estado',label:'Estado al cierre'}]),F.noSalio.slice(0,300),null,true)
        +(F.noSalio.length>300?'<div style="font-size:11px;color:#888;margin-top:6px">Se muestran 300 de '+fmtN(F.noSalio.length)+'. La lista completa está en el Excel.</div>':'')))
    +tarjetaHTML('Carga por cliente',tablaHTML(colsCli,F.clientes,F.totCli))
    +tarjetaHTML('Mensajeros que salieron a ruta',tablaHTML(colsMen,F.mens,F.totMen,true))
    +tarjetaHTML('Calidad de entrega',
       gridHTML(170,[infoBoxHTML('Entregas con 2 o más fotos',pct(t.cal.fotos2,t.cal.ent),true),infoBoxHTML('Entregas sin 2 fotos',fmtN(t.cal.sinFotos),true),infoBoxHTML('Marcadas por operador (no desde la app)',fmtN(t.cal.panel)+' ('+pct(t.cal.panel,t.cal.ent)+')',true),infoBoxHTML('Reprogramados con GPS',fmtN(t.cal.repGps)+' de '+fmtN(t.cal.rep)+' ('+pct(t.cal.repGps,t.cal.rep)+')',true)])
       +(t.marcadasPor.length?'<div style="font-size:11px;color:#888;margin:8px 0 2px">Marcadas por: '+escHTML(t.marcadasPor.map(function(u){return u.usuario+' ('+fmtN(u.n)+')';}).join(' · '))+'</div>':'')
       +'<div style="height:8px"></div>'
       +tablaHTML([{key:'mensajero',label:'Mensajero'},{key:'ent',label:'Entregados',num:true},{key:'fotos2',label:'Con 2+ fotos',num:true},{key:'sinFotos',label:'Sin 2 fotos',num:true},{key:'panel',label:'Marcadas por operador',num:true},{key:'rep',label:'Reprog.',num:true},{key:'repGps',label:'Reprog. con GPS',num:true}],F.calidad,F.totCal,true))
    +tarjetaHTML('Mensajeros activos que no salieron a ruta ('+F.sinSalida.length+')',
       (F.sinSalida.length?'<div style="font-size:11px;color:#888;margin-bottom:8px">Mensajeros activos en el sistema sin ninguna salida a ruta registrada '+(multi?'en esos días':'ese día')+'. "Entregas registradas" = entregas marcadas con su usuario aunque no haya salido a ruta ese día.</div>':'')
       +tablaHTML([{key:'mensajero',label:'Mensajero'}].concat(multi?[{key:'dias',label:'Días sin salir',num:true}]:[]).concat([{key:'entregas',label:'Entregas registradas',num:true}]),F.sinSalida,null,true))
    +(multi?tarjetaHTML('Detalle por día (% de entrega en cada corte)',tablaHTML(colsDia,F.porDia,null,true)):'')
    +tarjetaHTML('Notas del personal administrativo',notasHTML)
    +'</div>'
    +piePaginaHTML('Informe generado automáticamente desde el sistema. Llegó = envíos recibidos con fecha del día. Salió a ruta = envíos asignados a un mensajero ese día (incluye carga de días anteriores; no incluye las piezas retenidas por operación en el usuario FERNANDOCHECK, que se informan aparte). Cortes = entregados hasta esa hora. Final de ruta = último estado hasta las 06:00 del día siguiente. % operacional = entregados ÷ (entregados + reprogramados + cancelados).')
    +'</body></html>';
}

function exportarCierreExcel(dias,t,notas,periodo){
  var multi=dias.length>1;
  var F=construirFilasCierre(dias,t);
  var hojas=[];
  hojas.push({name:'Resumen',headers:['Indicador','Valor'],rows:[
    ['Período',periodo.label],['Días incluidos',dias.length],['Carga que llegó',t.llegada],['Salió a ruta',t.salida],['Salida: carga del día',t.salidaDia],['Salida: de días anteriores',t.salidaAnt],
    ['Entregados (final de ruta)',t.ent],['Reprogramados',t.rep],['Cancelados',t.can],['Sin cierre (pendiente / otro)',t.pen+t.otr],['Entregados después de las 23:00',t.tardias],['Retenidas por operación (FERNANDOCHECK)',t.retenidas],['Retenidas: carga del día',t.retenidasDia],['Retenidas: entregadas después',t.retenidasEnt],['Llegó y no salió',t.noSalio],['Entregas con 2+ fotos',pct(t.cal.fotos2,t.cal.ent)],['Marcadas por operador',t.cal.panel],['Reprogramados con GPS',t.cal.repGps],
    ['% de entrega final',pct(t.ent,t.salida)],['% operacional total',oper(t.ent,t.rep,t.can)]]});
  hojas.push({name:'Cortes',headers:['Corte','Entregados acumulados','% sobre salida a ruta','Sin entregar'],rows:F.cortes.map(function(c){return[c.corte,c.entregados,c.pct,c.porEntregar];})});
  hojas.push({name:'Clientes',headers:['Cliente','Llegó','Salió a ruta','Entregados','Reprogramados','Cancelados','Pendientes','% entrega'],
    rows:t.clientes.map(function(c){return[c.cliente,c.llegada,c.salida,c.ent,c.rep,c.can,c.pen,pct(c.ent,c.salida)];}),totalsRow:['TOTAL',t.llegada,t.salida,t.ent,t.rep,t.can,t.pen,pct(t.ent,t.salida)]});
  hojas.push({name:'Mensajeros',headers:['Mensajero','Días','Llevó'].concat(HORAS_CORTE.map(function(hh){return 'Entregados '+hh+':00';})).concat(['Entregados final','Reprogramados','Cancelados','Pendientes','% entrega','% operacional']),
    rows:t.mensajeros.map(function(m){return[m.mensajero,m.dias,m.salida].concat(m.cortes).concat([m.ent,m.rep,m.can,m.pen+m.otr,pct(m.ent,m.salida),oper(m.ent,m.rep,m.can)]);}),
    totalsRow:['TOTAL','',t.salida].concat(t.cortes).concat([t.ent,t.rep,t.can,t.pen+t.otr,pct(t.ent,t.salida),oper(t.ent,t.rep,t.can)])});
  if(multi)hojas.push({name:'Por día',headers:['Día','Llegó','Salió a ruta'].concat(HORAS_CORTE.map(function(hh){return '% '+hh+':00';})).concat(['Entregados','% final','% operacional']),
    rows:F.porDia.map(function(d){return[d.fecha,d.llegada,d.salida].concat(HORAS_CORTE.map(function(hh){return d['c'+hh];})).concat([d.ent,d.pct,d.oper]);})});
  hojas.push({name:'Llegó y no salió',headers:['Día','Código','Cliente','Comuna','Destinatario','Estado al cierre','Retenida por operación'],rows:t.noSalioCodigos.map(function(c){return[fmtDMY(c.dia),c.codigo,c.cliente,c.comuna||'',c.destinatario||'',nombreEstado(c.estado),c.retenida?'Sí':''];})});
  hojas.push({name:'Calidad',headers:['Mensajero','Entregados','Con 2+ fotos','Sin 2 fotos','Marcadas por operador','Reprogramados','Reprog. con GPS'],rows:t.mensajeros.map(function(m){return[m.mensajero,m.ent,m.fotos2,m.sinFotos,m.panel,m.rep,m.repGps];}),totalsRow:['TOTAL',t.cal.ent,t.cal.fotos2,t.cal.sinFotos,t.cal.panel,t.cal.rep,t.cal.repGps]});
  hojas.push({name:'Sin salida',headers:['Mensajero','Días sin salir','Días del período','Entregas registradas'],rows:t.sinSalida.map(function(x){return[x.mensajero,x.dias,dias.length,x.entregas];})});
  hojas.push({name:'Notas',headers:['Día','Autor','Hora','Nota'],rows:notas.map(function(n){return[fmtDMY(n.fecha),n.autor||'',horaCL(n.created_at),n.texto];})});
  exportToExcel('Informe_Cierre_'+periodo.desde+(periodo.hasta!==periodo.desde?'_'+periodo.hasta:''),hojas);
}

// Trae los días en paralelo (de a 4 para no saturar la base). Cada día tarda ~0,5 s en el servidor.
async function traerDias(lista,onAvance){
  var resultados=new Array(lista.length);var i=0;var hechos=0;
  async function worker(){
    while(i<lista.length){
      var idx=i++;
      var r=await db.rpc('informe_cierre_dia',{p_dia:lista[idx]});
      if(r.error)throw r.error;
      resultados[idx]=r.data;hechos++;if(onAvance)onAvance(hechos,lista.length);
    }
  }
  var ws=[];for(var k=0;k<Math.min(4,lista.length);k++)ws.push(worker());
  await Promise.all(ws);
  return resultados;
}

function InformeCierre(props){
  var usuario=props.usuario, esAdmin=props.esAdmin||props.esSuperAdmin, toast=props.toast;
  var nombreUsuario=(usuario&&usuario.nombre)||'—';
  var hoy=fechaHoyCL();
  var _modo=useState('dia'),modo=_modo[0],setModo=_modo[1];
  var _fd=useState(hoy),fechaDia=_fd[0],setFechaDia=_fd[1];
  var _mes=useState(hoy.slice(0,7)),mes=_mes[0],setMes=_mes[1];
  var _d1=useState(sumarDias(hoy,-6)),desde=_d1[0],setDesde=_d1[1];
  var _d2=useState(hoy),hasta=_d2[0],setHasta=_d2[1];
  var _datos=useState(null),datos=_datos[0],setDatos=_datos[1];
  var _cargando=useState(false),cargando=_cargando[0],setCargando=_cargando[1];
  var _avance=useState(''),avance=_avance[0],setAvance=_avance[1];
  var _notas=useState([]),notas=_notas[0],setNotas=_notas[1];
  var _txt=useState(''),textoNota=_txt[0],setTextoNota=_txt[1];
  var _fn=useState(hoy),fechaNota=_fn[0],setFechaNota=_fn[1];
  var _guardandoNota=useState(false),guardandoNota=_guardandoNota[0],setGuardandoNota=_guardandoNota[1];

  var periodo=useMemo(function(){return limitesPeriodo(modo,fechaDia,mes,desde,hasta);},[modo,fechaDia,mes,desde,hasta]);

  async function cargarNotas(p){
    var r=await db.from('informe_cierre_notas').select('id,created_at,fecha,autor,texto,auth_uid').gte('fecha',p.desde).lte('fecha',p.hasta).order('fecha',{ascending:true}).order('created_at',{ascending:true});
    if(r.error){toast('No se pudieron cargar las notas: '+r.error.message);return;}
    setNotas(r.data||[]);
  }
  async function generar(){
    var p=periodo;
    if(!p.desde||!p.hasta||p.desde>p.hasta){toast('Revisa el rango de fechas');return;}
    var dias=listaDias(p.desde,p.hasta>hoy?hoy:p.hasta);
    if(dias.length===0){toast('El período elegido todavía no empieza');return;}
    if(dias.length>93){toast('El rango máximo es de 93 días');return;}
    setCargando(true);setAvance('');
    try{
      var conPrev=dias.length===1;
      var lista=conPrev?dias.concat([sumarDias(dias[0],-1)]):dias;
      var res=await traerDias(lista,function(a,b){if(b>2)setAvance(a+' de '+b+' días');});
      var prev=conPrev?res.pop():null;
      setDatos({periodo:p,dias:res,total:agregarDias(res),prevTotal:prev?agregarDias([prev]):null});
      setFechaNota(dias[dias.length-1]);
      await cargarNotas(p);
    }catch(err){toast('No se pudo generar el informe: '+(err&&err.message||err));}
    setCargando(false);setAvance('');
  }
  useEffect(function(){generar();},[]);// el día de hoy se genera solo al abrir

  async function agregarNota(){
    var texto=textoNota.trim();
    if(!texto){toast('Escribe la nota');return;}
    setGuardandoNota(true);
    var r=await db.from('informe_cierre_notas').insert({fecha:fechaNota,autor:nombreUsuario,texto:texto});
    setGuardandoNota(false);
    if(r.error){toast('No se pudo guardar la nota: '+r.error.message);return;}
    setTextoNota('');toast('Nota agregada al informe');
    if(datos)await cargarNotas(datos.periodo);
  }
  async function borrarNota(n){
    if(!window.confirm('¿Borrar esta nota?'))return;
    var r=await db.from('informe_cierre_notas').delete().eq('id',n.id);
    if(r.error){toast('No se pudo borrar: '+r.error.message);return;}
    if(datos)await cargarNotas(datos.periodo);
  }

  var _cfgA=useState(CFG_ALERTAS_DEFAULT),cfgAlertas=_cfgA[0],setCfgAlertas=_cfgA[1];
  var _cfgB=useState(null),cfgBorrador=_cfgB[0],setCfgBorrador=_cfgB[1];
  useEffect(function(){
    db.from('configuracion').select('valor').eq('clave','informe_cierre_alertas').maybeSingle().then(function(r){if(r&&r.data&&r.data.valor)setCfgAlertas(Object.assign({},CFG_ALERTAS_DEFAULT,r.data.valor));});
  },[]);
  async function guardarCfgAlertas(){
    var v=Object.assign({},cfgBorrador);
    ['entregaMinGlobal','entregaMinMensajero','entregaMinCliente','minPiezas','caidaPuntos','maxNoSalio','maxPctOperador'].forEach(function(k){v[k]=Number(v[k])||0;});
    var r=await db.from('configuracion').upsert({clave:'informe_cierre_alertas',valor:v,updated_at:new Date().toISOString()},{onConflict:'clave'});
    if(r.error){toast('No se pudo guardar: '+r.error.message);return;}
    setCfgAlertas(v);setCfgBorrador(null);toast('Metas de alertas guardadas');
  }
  var alertas=useMemo(function(){return datos?calcularAlertas(datos.dias,datos.total,datos.prevTotal,cfgAlertas):null;},[datos,cfgAlertas]);
  var html=useMemo(function(){return datos?htmlInformeCierre(datos.dias,datos.total,notas,datos.periodo,nombreUsuario,alertas):'';},[datos,notas,nombreUsuario,alertas]);
  var diasDatos=datos?datos.dias.map(function(d){return d.dia;}):[];

  var chip=function(v,label){return h('button',{key:v,className:'filter-btn',onClick:function(){setModo(v);},style:modo===v?{background:'var(--gold)',color:'var(--dark-deep)',borderColor:'var(--gold)',fontWeight:700}:{background:'#fff'}},label);};
  return h('div',null,
    h('div',{className:'panel',style:{marginBottom:14}},
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:12}},chip('dia','Día'),chip('semana','Semana'),chip('mes','Mes'),chip('rango','Rango de fechas')),
      h('div',{style:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}},
        (modo==='dia'||modo==='semana')&&h('div',null,h('label',{className:'form-label'},modo==='dia'?'Día':'Cualquier día de la semana'),h('input',{type:'date',className:'form-input',value:fechaDia,max:hoy,onChange:function(e){setFechaDia(e.target.value);}})),
        modo==='mes'&&h('div',null,h('label',{className:'form-label'},'Mes'),h('input',{type:'month',className:'form-input',value:mes,max:hoy.slice(0,7),onChange:function(e){setMes(e.target.value);}})),
        modo==='rango'&&h('div',null,h('label',{className:'form-label'},'Desde'),h('input',{type:'date',className:'form-input',value:desde,max:hoy,onChange:function(e){setDesde(e.target.value);}})),
        modo==='rango'&&h('div',null,h('label',{className:'form-label'},'Hasta'),h('input',{type:'date',className:'form-input',value:hasta,max:hoy,onChange:function(e){setHasta(e.target.value);}})),
        h('button',{className:'btn-primary',onClick:generar,disabled:cargando,style:{height:40}},cargando?('Generando'+(avance?' · '+avance:'…')):'Generar informe'),
        h('div',{style:{fontSize:12,color:'var(--text-soft)',paddingBottom:10}},periodo.label)
      )
    ),
    esAdmin&&h('div',{className:'panel',style:{marginBottom:14}},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}},
        h('div',null,h('div',{className:'panel-title',style:{marginBottom:4}},'Metas de las alertas'),
          h('div',{style:{fontSize:12,color:'var(--text-soft)'}},'Entrega mínima '+cfgAlertas.entregaMinGlobal+'% · mensajero '+cfgAlertas.entregaMinMensajero+'% · cliente '+cfgAlertas.entregaMinCliente+'% · salida tarde después de '+cfgAlertas.horaSalidaTarde+' · caída de '+cfgAlertas.caidaPuntos+' puntos')),
        !cfgBorrador&&h('button',{className:'btn-secondary',onClick:function(){setCfgBorrador(Object.assign({},cfgAlertas));}},'Editar metas')),
      cfgBorrador&&h('div',{style:{marginTop:12}},
        h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}},
          [['entregaMinGlobal','% de entrega mínimo del día','number'],['entregaMinMensajero','% mínimo por mensajero','number'],['entregaMinCliente','% mínimo por cliente','number'],['minPiezas','Evaluar solo con al menos (piezas)','number'],['horaSalidaTarde','Salida tarde después de','time'],['caidaPuntos','Caída contra el día anterior (puntos)','number'],['maxNoSalio','Avisar si "llegó y no salió" supera','number'],['maxPctOperador','% máx. marcadas por operador (0 = no avisar)','number']].map(function(f){
            return h('div',{key:f[0]},h('label',{className:'form-label'},f[1]),h('input',{type:f[2],className:'form-input',value:cfgBorrador[f[0]],onChange:function(e){var v=e.target.value;setCfgBorrador(function(p){var n=Object.assign({},p);n[f[0]]=v;return n;});}}));
          })),
        h('div',{style:{display:'flex',gap:8,marginTop:12}},
          h('button',{className:'btn-primary',onClick:guardarCfgAlertas},'Guardar metas'),
          h('button',{className:'btn-secondary',onClick:function(){setCfgBorrador(null);}},'Cancelar')))
    ),
    datos&&h('div',{className:'panel',style:{marginBottom:14}},
      h('div',{className:'panel-title'},'Notas del personal administrativo'),
      h('div',{style:{fontSize:12,color:'var(--text-soft)',marginBottom:10}},'Las notas salen dentro del informe, firmadas con tu nombre y la hora.'),
      h('div',{style:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-start'}},
        diasDatos.length>1&&h('div',null,h('label',{className:'form-label'},'Día de la nota'),h('select',{className:'form-input',value:fechaNota,onChange:function(e){setFechaNota(e.target.value);}},diasDatos.map(function(d){return h('option',{key:d,value:d},fmtDiaLargo(d));}))),
        h('textarea',{className:'form-input',value:textoNota,onChange:function(e){setTextoNota(e.target.value);},rows:3,placeholder:'Ej.: Ruta de La Florida salió tarde por retraso de colecta de MR SHENG; 2 mensajeros con falla mecánica.',style:{flex:1,minWidth:260,resize:'vertical',fontFamily:'inherit'}}),
        h('button',{className:'btn-primary',onClick:agregarNota,disabled:guardandoNota},guardandoNota?'Guardando…':'Agregar nota')
      ),
      notas.length>0&&h('div',{style:{marginTop:12,display:'flex',flexDirection:'column',gap:6}},notas.map(function(n){
        var puedeBorrar=esAdmin||n.autor===nombreUsuario;
        return h('div',{key:n.id,style:{display:'flex',gap:10,alignItems:'flex-start',background:'var(--cream)',borderLeft:'3px solid var(--gold)',borderRadius:6,padding:'8px 10px'}},
          h('div',{style:{flex:1}},h('div',{style:{fontSize:10,fontWeight:700,color:'var(--gold)',letterSpacing:1,textTransform:'uppercase'}},fmtDiaLargo(n.fecha)+' · '+(n.autor||'—')+' · '+horaCL(n.created_at)),h('div',{style:{fontSize:13,whiteSpace:'pre-wrap',marginTop:2}},n.texto)),
          puedeBorrar&&h('button',{className:'action-btn',onClick:function(){borrarNota(n);}},'Borrar'));
      }))
    ),
    datos&&h('div',{className:'panel'},
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',marginBottom:10}},
        h('div',{className:'panel-title',style:{margin:0}},'Informe de cierre · '+datos.periodo.label),
        h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
          h('button',{className:'btn-primary',onClick:function(){abrirVentanaHTML(null,html);}},'Imprimir / PDF'),
          h('button',{className:'btn-secondary',onClick:function(){descargarHTML('Informe_Cierre_'+datos.periodo.desde+(datos.periodo.hasta!==datos.periodo.desde?'_'+datos.periodo.hasta:'')+'.html',html);}},'Descargar HTML'),
          h('button',{className:'btn-secondary',onClick:function(){exportarCierreExcel(datos.dias,datos.total,notas,datos.periodo);}},'Excel'))),
      h('iframe',{title:'Vista previa del informe',srcDoc:html,style:{width:'100%',height:'78vh',border:'1px solid var(--border)',borderRadius:10,background:'#F9F6EE'}})
    )
  );
}

// ══════════════════════════════════════════════════════════════════════════════════════
// INFORME LIBRE
// Formato del texto (se explica en pantalla): una línea en blanco separa párrafos; una línea que
// empieza con "# " es un subtítulo; las líneas que empiezan con "- " forman una lista.
// ══════════════════════════════════════════════════════════════════════════════════════
function cuerpoAHTML(texto){
  var lineas=String(texto||'').replace(/\r/g,'').split('\n');
  var out=[];var parrafo=[];var lista=[];
  function cerrarParrafo(){if(parrafo.length){out.push('<p style="font-size:14px;line-height:1.7;color:#333;margin:0 0 12px;white-space:pre-wrap">'+escHTML(parrafo.join('\n'))+'</p>');parrafo=[];}}
  function cerrarLista(){if(lista.length){out.push('<ul style="margin:0 0 12px 20px;font-size:14px;line-height:1.7;color:#333">'+lista.map(function(l){return '<li>'+escHTML(l)+'</li>';}).join('')+'</ul>');lista=[];}}
  lineas.forEach(function(l){
    var t=l.trim();
    if(t===''){cerrarParrafo();cerrarLista();return;}
    if(/^#\s+/.test(t)){cerrarParrafo();cerrarLista();out.push('<div style="font-weight:800;font-size:15px;color:#A0842A;margin:18px 0 8px;padding-bottom:4px;border-bottom:1px solid #EDE3C8">'+escHTML(t.replace(/^#\s+/,''))+'</div>');return;}
    if(/^[-•]\s+/.test(t)){cerrarParrafo();lista.push(t.replace(/^[-•]\s+/,''));return;}
    cerrarLista();parrafo.push(l);
  });
  cerrarParrafo();cerrarLista();
  return out.join('')||'<div style="font-size:12px;color:#999">Sin contenido.</div>';
}
function htmlInformeLibre(inf){
  var titulo=inf.titulo||'Informe';
  return estiloBaseHTML(titulo)
    +headerReciboHTML('Informe',fmtDMY(inf.fecha_informe))
    +barraAccionesHTML()
    +'<div style="padding:16px;max-width:900px;margin:0 auto">'
    +tarjetaHTML(titulo,gridHTML(160,[infoBoxHTML('Fecha',fmtDiaLargo(inf.fecha_informe)),infoBoxHTML('Elaborado por',inf.autor),infoBoxHTML('Dirigido a',inf.destinatario||'—')])
      +'<div style="height:16px"></div>'+cuerpoAHTML(inf.cuerpo))
    +'</div>'+piePaginaHTML('')+'</body></html>';
}

function InformeLibre(props){
  var usuario=props.usuario, esAdmin=props.esAdmin||props.esSuperAdmin, toast=props.toast;
  var nombreUsuario=(usuario&&usuario.nombre)||'—';
  var vacio=function(){return{id:null,titulo:'',fecha_informe:fechaHoyCL(),destinatario:'',cuerpo:'',autor:nombreUsuario};};
  var _lista=useState([]),lista=_lista[0],setLista=_lista[1];
  var _ed=useState(vacio),ed=_ed[0],setEd=_ed[1];
  var _guardando=useState(false),guardando=_guardando[0],setGuardando=_guardando[1];
  var _busq=useState(''),busq=_busq[0],setBusq=_busq[1];

  async function cargar(){
    var r=await db.from('informes').select('id,created_at,updated_at,autor,titulo,fecha_informe,destinatario,cuerpo').order('fecha_informe',{ascending:false}).order('created_at',{ascending:false}).limit(200);
    if(r.error){toast('No se pudieron cargar los informes: '+r.error.message);return;}
    setLista(r.data||[]);
  }
  useEffect(function(){cargar();},[]);

  async function guardar(){
    if(!ed.titulo.trim()){toast('Ponle un título al informe');return null;}
    if(!ed.cuerpo.trim()){toast('El informe está vacío');return null;}
    setGuardando(true);
    var fila={titulo:ed.titulo.trim(),fecha_informe:ed.fecha_informe||fechaHoyCL(),destinatario:ed.destinatario.trim()||null,cuerpo:ed.cuerpo,updated_at:new Date().toISOString()};
    var r;
    if(ed.id)r=await db.from('informes').update(fila).eq('id',ed.id).select('*').single();
    else{fila.autor=nombreUsuario;r=await db.from('informes').insert(fila).select('*').single();}
    setGuardando(false);
    if(r.error||!r.data){toast('No se pudo guardar: '+(r.error&&r.error.message||''));return null;}
    setEd({id:r.data.id,titulo:r.data.titulo,fecha_informe:r.data.fecha_informe,destinatario:r.data.destinatario||'',cuerpo:r.data.cuerpo,autor:r.data.autor});
    cargar();
    return r.data;
  }
  async function generar(){
    var w=window.open('','_blank');// se abre antes del await para que el navegador no la bloquee
    var inf=await guardar();
    if(!inf){if(w)w.close();return;}
    abrirVentanaHTML(w,htmlInformeLibre(inf));
    toast('Informe guardado y generado');
  }
  async function eliminar(inf){
    if(!window.confirm('¿Eliminar el informe "'+inf.titulo+'"?'))return;
    var r=await db.from('informes').delete().eq('id',inf.id);
    if(r.error){toast('No se pudo eliminar: '+r.error.message);return;}
    if(ed.id===inf.id)setEd(vacio());
    cargar();
  }
  var filtrada=lista.filter(function(i){var q=busq.trim().toLowerCase();return !q||(i.titulo||'').toLowerCase().indexOf(q)>=0||(i.autor||'').toLowerCase().indexOf(q)>=0||(i.cuerpo||'').toLowerCase().indexOf(q)>=0;});
  var set=function(k){return function(e){var v=e.target.value;setEd(function(p){var n=Object.assign({},p);n[k]=v;return n;});};};

  return h('div',{style:{display:'grid',gridTemplateColumns:'minmax(0,2fr) minmax(260px,1fr)',gap:14,alignItems:'start'},className:'informes-grid'},
    h('div',{className:'panel'},
      h('div',{className:'panel-title'},ed.id?'Editando informe':'Nuevo informe'),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginBottom:10}},
        h('div',{style:{gridColumn:'1/-1'}},h('label',{className:'form-label'},'Título'),h('input',{className:'form-input',value:ed.titulo,onChange:set('titulo'),placeholder:'Ej.: Informe de incidencia ruta Maipú'})),
        h('div',null,h('label',{className:'form-label'},'Fecha'),h('input',{type:'date',className:'form-input',value:ed.fecha_informe,onChange:set('fecha_informe')})),
        h('div',null,h('label',{className:'form-label'},'Dirigido a (opcional)'),h('input',{className:'form-input',value:ed.destinatario,onChange:set('destinatario'),placeholder:'Ej.: Gerencia / Cliente ANDES'}))
      ),
      h('label',{className:'form-label'},'Contenido'),
      h('textarea',{className:'form-input',value:ed.cuerpo,onChange:set('cuerpo'),rows:18,placeholder:'Escribe el informe.\n\nUna línea en blanco separa párrafos.\n# Así se escribe un subtítulo\n- Así se escribe un punto de una lista',style:{width:'100%',resize:'vertical',fontFamily:'inherit',lineHeight:1.6}}),
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}},
        h('button',{className:'btn-primary',onClick:generar,disabled:guardando},'Generar informe'),
        h('button',{className:'btn-secondary',onClick:function(){guardar().then(function(r){if(r)toast('Informe guardado');});},disabled:guardando},guardando?'Guardando…':'Guardar'),
        ed.id&&h('button',{className:'btn-secondary',onClick:function(){descargarHTML((ed.titulo||'Informe').replace(/[^\wáéíóúñÁÉÍÓÚÑ -]/g,'').trim().replace(/\s+/g,'_')+'.html',htmlInformeLibre(ed));}},'Descargar HTML'),
        h('button',{className:'btn-secondary',onClick:function(){setEd(vacio());}},'Nuevo')
      )
    ),
    h('div',{className:'panel'},
      h('div',{className:'panel-title'},'Informes guardados'),
      h('input',{className:'form-input',value:busq,onChange:function(e){setBusq(e.target.value);},placeholder:'Buscar por título, autor o texto',style:{marginBottom:10}}),
      filtrada.length===0?h('div',{style:{fontSize:12,color:'var(--text-soft)',padding:'10px 0'}},'No hay informes.'):
      h('div',{style:{display:'flex',flexDirection:'column',gap:6,maxHeight:'70vh',overflowY:'auto'}},filtrada.map(function(i){
        var puede=esAdmin||i.autor===nombreUsuario;
        return h('div',{key:i.id,style:{border:'1px solid var(--border)',borderLeft:'3px solid '+(ed.id===i.id?'var(--gold)':'transparent'),borderRadius:8,padding:'8px 10px',background:'#fff'}},
          h('div',{style:{fontWeight:700,fontSize:13}},i.titulo),
          h('div',{style:{fontSize:11,color:'var(--text-soft)'}},fmtDMY(i.fecha_informe)+' · '+(i.autor||'—')),
          h('div',{style:{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}},
            h('button',{className:'action-btn btn-edit',onClick:function(){abrirVentanaHTML(null,htmlInformeLibre(i));}},'Ver'),
            puede&&h('button',{className:'action-btn',onClick:function(){setEd({id:i.id,titulo:i.titulo,fecha_informe:i.fecha_informe,destinatario:i.destinatario||'',cuerpo:i.cuerpo,autor:i.autor});window.scrollTo({top:0,behavior:'smooth'});}},'Editar'),
            puede&&h('button',{className:'action-btn',onClick:function(){eliminar(i);}},'Eliminar')));
      }))
    )
  );
}

function Informes(props){
  var puedeLibre=props.puedeVerLibre!==false, puedeCierre=props.puedeVerCierre!==false;
  var _sub=useState(function(){return puedeCierre?'cierre':'libre';}),sub=_sub[0],setSub=_sub[1];
  var chipStyle=function(active){return active?{background:'rgba(200,168,75,0.18)',borderColor:'var(--gold)',color:'var(--gold)'}:undefined;};
  return h('div',null,
    h('style',null,'@media (max-width:820px){.informes-grid{grid-template-columns:1fr!important}}'),
    h('div',{className:'section-head'},
      h('div',{className:'section-title'},'Informes'),
      h('div',{style:{display:'flex',gap:8}},
        puedeCierre&&h('button',{className:'btn-secondary',style:chipStyle(sub==='cierre'),onClick:function(){setSub('cierre');}},'Informe de cierre'),
        puedeLibre&&h('button',{className:'btn-secondary',style:chipStyle(sub==='libre'),onClick:function(){setSub('libre');}},'Informe libre'))
    ),
    sub==='cierre'&&puedeCierre&&h(InformeCierre,props),
    sub==='libre'&&puedeLibre&&h(InformeLibre,props),
    !puedeLibre&&!puedeCierre&&h('div',{style:{textAlign:'center',padding:'40px 20px',color:'var(--text-soft)'}},'No tienes acceso a ninguna subsección de Informes. Pídele a un administrador que te habilite el permiso desde Permisos.')
  );
}

window.Informes=Informes;
})();
