// Control de Por cobrar (18-11-2026). Administración → Por cobrar.
// Flujo: el mensajero cobra al entregar (efectivo o transferencia, informando a qué cuenta) →
// RINDE a diario lo que quedó en su poder (efectivo + transferencias a su cuenta) → acta REN-AAAA-NNNN →
// TransPgso LIQUIDA al cliente (semanal o mensual) lo cobrado → acta LIQ-AAAA-NNNN → se marca pagada.
// Transferencias a la cuenta del cliente no pasan por nosotros: se informan en la liquidación como "pagado directo".
(function(){
var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo;
var A=window.__app||{};var db=A.db;
var EMP={n:'TransPgso SpA',rut:'78.143.701-8',dir:'Exposición 902, Santiago Centro',mail:'contacto@transpgso.cl',fono:'+56 9 4211 2940',web:'www.transpgso.cl'};
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function money(n){return '$'+Math.round(+n||0).toLocaleString('es-CL');}
function dmy(s){if(!s)return '—';var p=String(s).slice(0,10).split('-');return p[2]+'-'+p[1]+'-'+p[0];}
function largo(s){var p=String(s).slice(0,10).split('-');return (+p[2])+' de '+MESES[+p[1]-1]+' de '+p[0];}
function tit(s){return String(s||'').toLowerCase().replace(/(^|\s)\S/g,function(m){return m.toUpperCase();});}
function hoyCL(){return A.fechaHoyCL?A.fechaHoyCL():new Date().toLocaleDateString('en-CA',{timeZone:'America/Santiago'});}
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function addD(s,n){var d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return ymd(d);}
function lunes(s){var d=new Date(s+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return ymd(d);}
function diasDesde(ts){if(!ts)return null;return Math.floor((Date.now()-new Date(ts).getTime())/86400000);}
var DEST={mensajero:['En poder del mensajero','#8a5a00','#fbefd2'],transpgso:['Transferido a TransPgso','#1f5fa8','#e3eefb'],cliente:['Transferido al cliente','#1f6b40','#dff3e7']};
function destinoDe(x){return x.cobro_destino||'mensajero';}
function formaTxt(x){return x.cobro_forma==='transferencia'?'Transferencia':x.cobro_forma==='efectivo'?'Efectivo':'Sin informar';}
function valor(x){return +(x.cobro_monto||x.monto)||0;}

var C={card:{borderRadius:20,background:'#fff',border:'1px solid #e9e1ca',boxShadow:'0 5px 0 #e2d8bb',padding:'16px 18px',color:'#2b2e20'}};
function boton(t,on,tipo,dis){var p=tipo==='prim',d=tipo==='peligro';return h('button',{type:'button',onClick:on,disabled:!!dis,style:{padding:'8px 14px',borderRadius:10,border:'1px solid '+(p?'#ae8829':d?'#e0a7a0':'#e3dbc4'),background:p?'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)':d?'#fff4f1':'#fff',color:p?'#1a1d13':d?'#b03030':'#2b2e20',fontWeight:800,fontSize:12.5,cursor:dis?'default':'pointer',opacity:dis?.5:1,boxShadow:p?'0 3px 0 #6d531a':'none',whiteSpace:'nowrap'}},t);}
function tile(l,v,d,col,dark){return h('div',{style:{borderRadius:18,padding:'14px 16px',background:dark?'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 55%,#15180f 100%)':'#fff',border:'1px solid '+(dark?'rgba(200,168,75,.45)':'#e9e1ca'),boxShadow:'0 4px 0 '+(dark?'#0b0c07':'#e2d8bb'),color:dark?'#f1ecda':'#2b2e20',minWidth:0}},
  h('div',{style:{fontSize:10.5,fontWeight:900,letterSpacing:1.3,color:dark?'#e8c766':'#8a8775',textTransform:'uppercase'}},l),h('div',{style:{fontFamily:'Bebas Neue',fontSize:38,lineHeight:1,marginTop:6,color:col||'inherit'}},v),h('div',{style:{fontSize:12,fontWeight:700,color:dark?'#cfc9b2':'#7a7766',marginTop:3}},d));}

// ── Actas (HTML imprimible) ──────────────────────────────────────────
function htmlActa(tipo,a){
  var F=a.detalle||[],ren=tipo==='ren';var o=location.origin;
  var filas=F.map(function(x,i){return '<tr><td class="n">'+(i+1)+'</td><td class="m">'+esc(x.codigo)+'</td><td>'+dmy(x.fecha)+'</td><td>'+esc(ren?(x.cliente||'—'):tit(x.mensajero||'—'))+'</td><td>'+esc(tit(x.destinatario||'—'))+'</td><td>'+esc(formaTxt(x))+'</td><td>'+esc((DEST[destinoDe(x)]||['—'])[0])+'</td><td class="r">'+money(valor(x))+'</td></tr>';}).join('');
  var resumen=ren?[['Mensajero',tit(a.mensajero)],['Paquetes',String(F.length)],['Total a rendir',money(a.total_esperado)],['Monto recibido',money(a.monto_recibido)],['Forma de recibo',a.forma_recibo||'—'],['Diferencia',money((+a.monto_recibido||0)-(+a.total_esperado||0))]]
    :[['Cliente',a.cliente],['Período',(a.desde?dmy(a.desde):'—')+' al '+(a.hasta?dmy(a.hasta):'—')],['Paquetes',String(F.length)],['Total cobrado a destinatarios',money(a.total_cobrado)],['Pagado directo al cliente',money(a.directo_cliente)],['A transferir por TransPgso',money(a.a_transferir)]];
  var dif=ren?(+a.monto_recibido||0)-(+a.total_esperado||0):0;
  return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+(ren?'Acta de rendición ':'Liquidación ')+esc(a.numero)+'</title>'
  +'<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">'
  +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"DM Sans",Arial,sans-serif;color:#2b2e20;background:#e9e5d8;font-size:12px}.acc{position:sticky;top:0;display:flex;gap:8px;justify-content:center;padding:10px;background:#2b2e20}.acc button{font:800 13px "DM Sans",Arial;padding:9px 18px;border-radius:9px;border:1px solid #f7dd8c;background:linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829);cursor:pointer}.acc .s{background:transparent;color:#f1ecda}'
  +'.hoja{width:210mm;min-height:297mm;margin:16px auto;background:#fff;padding:15mm;box-shadow:0 10px 30px rgba(0,0,0,.18)}.cab{display:flex;justify-content:space-between;gap:20px;padding:14px 18px;border-radius:12px;background:#2b2e20;color:#f1ecda}.cab img{height:58px}.cab p{font-size:10.5px;color:#cfc9b2;margin-top:4px}.tipo{font-family:"Bebas Neue";font-size:30px;letter-spacing:2px;color:#e8c766;text-align:right;line-height:1}.num{display:inline-block;margin-top:6px;padding:4px 10px;border-radius:7px;background:#e8c766;color:#2b2e20;font-family:"JetBrains Mono",monospace;font-weight:700}'
  +'.res{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;margin-top:14px;padding:12px 14px;border:1px solid #e3dbc4;border-radius:10px}.res span{display:block;font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;color:#7a7766}.res b{font-size:13px}.tot{margin-top:12px;padding:14px 16px;border-radius:12px;background:#fbf2d6;border:1px solid #e8c766;display:flex;justify-content:space-between;align-items:center}.tot b{font-family:"Bebas Neue";font-size:32px;letter-spacing:1px}'
  +'h2{font-family:"Bebas Neue";font-size:15px;letter-spacing:1.5px;color:#8a6d1f;margin:16px 0 6px}table{width:100%;border-collapse:collapse}th{background:#3A3D2E;color:#f1ecda;font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;text-align:left;padding:7px 8px}td{padding:6px 8px;border-bottom:1px solid #ece6d4;font-size:11px}tr:nth-child(even) td{background:#fbf8f0}td.n{color:#9a9684;width:22px}td.r{text-align:right;font-weight:700}td.m{font-family:"JetBrains Mono",monospace;font-size:10.5px}'
  +'.decl{margin-top:16px;padding:12px 14px;border-left:4px solid #C8A84B;background:#fbf8f0;font-size:11.5px}.firmas{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:46px}.firmas div{border-top:1.5px solid #2b2e20;padding-top:6px;font-size:11px}.firmas b{display:block;font-family:"Bebas Neue";font-size:15px;letter-spacing:1.2px}.dif{color:'+(dif<0?'#b03030':'#2e7d4f')+'}'
  +'@page{size:A4;margin:12mm}@media print{body{background:#fff}.acc{display:none}.hoja{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}}</style></head><body>'
  +'<div class="acc"><button onclick="window.print()">Descargar PDF / Imprimir</button><button class="s" onclick="window.close()">Cerrar</button></div><div class="hoja">'
  +'<div class="cab"><div><img src="'+o+'/logo.jpg" alt="TransPgso" style="border-radius:10px"><p>'+EMP.n+' · RUT '+EMP.rut+'<br>'+EMP.dir+' · '+EMP.mail+'</p></div><div><div class="tipo">'+(ren?'Acta de rendición':'Liquidación de cobros')+'</div><div style="text-align:right"><span class="num">N° '+esc(a.numero)+'</span></div><p style="text-align:right">Santiago, '+largo(a.fecha||hoyCL())+'</p></div></div>'
  +'<div class="res">'+resumen.map(function(r,i){return '<div><span>'+r[0]+'</span><b'+(ren&&i===5?' class="dif"':'')+'>'+esc(r[1])+'</b></div>';}).join('')+'</div>'
  +'<div class="tot"><span style="font-weight:800">'+(ren?'Recibido por TransPgso':'Monto a transferir al cliente')+'</span><b>'+money(ren?a.monto_recibido:a.a_transferir)+'</b></div>'
  +(!ren&&a.estado==='pagada'?'<div class="tot" style="background:#dff3e7;border-color:#57c98a"><span style="font-weight:800">PAGADA el '+dmy(a.pagada_fecha)+(a.pagada_ref?' · Ref. '+esc(a.pagada_ref):'')+'</span></div>':'')
  +'<h2>Detalle de paquetes por cobrar</h2><table><thead><tr><th>#</th><th>Código</th><th>Fecha</th><th>'+(ren?'Cliente':'Mensajero')+'</th><th>Destinatario</th><th>Forma</th><th>Destino del pago</th><th style="text-align:right">Monto</th></tr></thead><tbody>'+filas+'</tbody></table>'
  +(a.nota?'<div class="decl"><b>Observaciones:</b> '+esc(a.nota)+'</div>':'')
  +'<div class="decl">'+(ren?'El mensajero entrega a TransPgso SpA los montos cobrados a destinatarios en los paquetes detallados, que quedaron en su poder (efectivo o transferencias a su cuenta). Ambas partes firman en conformidad.':'TransPgso SpA informa al cliente los montos cobrados a sus destinatarios en el período. El monto a transferir excluye los pagos que los destinatarios hicieron directamente a la cuenta del cliente.')+'</div>'
  +'<div class="firmas"><div><b>'+(ren?'Entrega: '+esc(tit(a.mensajero)):'Emite: TransPgso SpA')+'</b>'+(ren?'Mensajero':esc(tit(a.emitida_por||'')))+'</div><div><b>'+(ren?'Recibe: TransPgso SpA':'Recibe: '+esc(a.cliente))+'</b>'+(ren?esc(tit(a.recibido_por||'')):'Cliente')+'</div></div>'
  +'</div></body></html>';}
function abrir(html){var w=window.open('','_blank');if(w){w.document.open();w.document.write(html);w.document.close();}}
function excelActa(tipo,a){var ex=A.exportToExcel;if(!ex)return;var F=a.detalle||[];ex((tipo==='ren'?'Rendicion_':'Liquidacion_')+a.numero,[{name:'Detalle',headers:['Código','Fecha','Cliente','Mensajero','Destinatario','Forma','Destino del pago','Monto'],rows:F.map(function(x){return [x.codigo,dmy(x.fecha),x.cliente||'',x.mensajero||'',x.destinatario||'',formaTxt(x),(DEST[destinoDe(x)]||[''])[0],valor(x)];})}]);}

function PorCobrar(props){
  var toast=props.toast||function(m){alert(m);};var esAdmin=!!(A.perfil&&(A.perfil.esAdmin||A.perfil.esSuperAdmin));
  var _t=useState('panel'),tab=_t[0],setTab=_t[1];var _p=useState(null),pend=_p[0],setPend=_p[1];
  var _r=useState(null),rens=_r[0],setRens=_r[1];var _l=useState(null),liqs=_l[0],setLiqs=_l[1];
  var _sm=useState(''),selMen=_sm[0],setSelMen=_sm[1];var _sc=useState(''),selCli=_sc[0],setSelCli=_sc[1];
  var _sel=useState({}),sel=_sel[0],setSel=_sel[1];var _rec=useState(''),recibido=_rec[0],setRecibido=_rec[1];var _fr=useState('Efectivo'),formaRec=_fr[0],setFormaRec=_fr[1];var _nt=useState(''),nota=_nt[0],setNota=_nt[1];
  var _per=useState('semana_ant'),per=_per[0],setPer=_per[1];var _busy=useState(false),busy=_busy[0],setBusy=_busy[1];var _mes=useState(hoyCL().slice(0,7)),mes=_mes[0],setMes=_mes[1];
  function cargar(){db.rpc('por_cobrar_pendientes',{p_desde:'2026-11-01'}).then(function(r){if(r.error){toast('No se pudo cargar: '+r.error.message);setPend([]);return;}setPend(r.data||[]);});
    db.from('rendiciones_cobro').select('*').order('id',{ascending:false}).limit(500).then(function(r){setRens(r.data||[]);});
    db.from('liquidaciones_cobro').select('*').order('id',{ascending:false}).limit(500).then(function(r){setLiqs(r.data||[]);});}
  useEffect(cargar,[]);
  var P=pend||[];
  var porRendir=P.filter(function(x){return !x.rendicion_id&&destinoDe(x)==='mensajero';});
  var porLiquidar=P.filter(function(x){return !x.liquidacion_id;});
  var porMen=useMemo(function(){var o={};porRendir.forEach(function(x){var k=x.mensajero||'SIN MENSAJERO';var m=o[k]=o[k]||{men:k,n:0,total:0,maxDias:0,items:[]};m.n++;m.total+=valor(x);var d=diasDesde(x.cobro_at);if(d!=null&&d>m.maxDias)m.maxDias=d;m.items.push(x);});return Object.keys(o).map(function(k){return o[k];}).sort(function(a,b){return b.maxDias-a.maxDias||b.total-a.total;});},[pend]);
  var porCli=useMemo(function(){var o={};porLiquidar.forEach(function(x){var k=x.cliente||'—';var m=o[k]=o[k]||{cli:k,n:0,total:0,directo:0,sinRendir:0};m.n++;m.total+=valor(x);if(destinoDe(x)==='cliente')m.directo+=valor(x);if(!x.rendicion_id&&destinoDe(x)==='mensajero')m.sinRendir++;});return Object.keys(o).map(function(k){return o[k];}).sort(function(a,b){return b.total-a.total;});},[pend]);
  var tot=function(L){return L.reduce(function(s,x){return s+valor(x);},0);};
  var atrasados=porMen.filter(function(m){return m.maxDias>=1;});
  var liqPend=(liqs||[]).filter(function(l){return l.estado!=='pagada';});

  function rangoPer(){var hoy=hoyCL();if(per==='semana_ant'){var l=addD(lunes(hoy),-7);return [l,addD(l,6)];}if(per==='semana'){var l2=lunes(hoy);return [l2,addD(l2,6)];}if(per==='mes_ant'){var d=new Date(hoy.slice(0,4),+hoy.slice(5,7)-2,1);var f=new Date(d.getFullYear(),d.getMonth()+1,0);return [ymd(d),ymd(f)];}var d2=new Date(hoy.slice(0,4),+hoy.slice(5,7)-1,1);return [ymd(d2),hoy];}
  async function rendir(){var items=porRendir.filter(function(x){return x.mensajero===selMen&&sel[x.codigo];});if(!items.length){toast('Selecciona los paquetes que está rindiendo');return;}
    var esp=tot(items),rec=recibido===''?esp:+String(recibido).replace(/\D/g,'');setBusy(true);var w=window.open('','_blank');
    var r=await db.rpc('crear_rendicion_cobro',{p:{mensajero:selMen,codigos:items.map(function(x){return x.codigo;}),total_esperado:esp,monto_recibido:rec,forma_recibo:formaRec,nota:nota,detalle:items}});
    setBusy(false);if(r.error){if(w)w.close();toast('No se pudo registrar: '+r.error.message);return;}
    var g=await db.from('rendiciones_cobro').select('*').eq('id',r.data).single();if(g.data&&w){w.document.open();w.document.write(htmlActa('ren',g.data));w.document.close();}
    toast('Rendición '+(g.data&&g.data.numero)+' registrada');setSel({});setRecibido('');setNota('');cargar();}
  async function liquidar(){var rg=rangoPer();var items=porLiquidar.filter(function(x){return x.cliente===selCli&&sel[x.codigo];});if(!items.length){toast('Selecciona los paquetes a liquidar');return;}
    var total=tot(items),directo=tot(items.filter(function(x){return destinoDe(x)==='cliente';}));setBusy(true);var w=window.open('','_blank');
    var r=await db.rpc('crear_liquidacion_cobro',{p:{cliente:selCli,desde:rg[0],hasta:rg[1],codigos:items.map(function(x){return x.codigo;}),total_cobrado:total,directo_cliente:directo,a_transferir:total-directo,nota:nota,detalle:items}});
    setBusy(false);if(r.error){if(w)w.close();toast('No se pudo emitir: '+r.error.message);return;}
    var g=await db.from('liquidaciones_cobro').select('*').eq('id',r.data).single();if(g.data&&w){w.document.open();w.document.write(htmlActa('liq',g.data));w.document.close();}
    toast('Liquidación '+(g.data&&g.data.numero)+' emitida');setSel({});setNota('');cargar();}
  function pagar(l){var ref=window.prompt('Liquidación '+l.numero+' · '+money(l.a_transferir)+' a '+l.cliente+'\nN° de operación o referencia de la transferencia (opcional):','');if(ref===null)return;
    db.rpc('pagar_liquidacion_cobro',{p_id:l.id,p_fecha:hoyCL(),p_ref:ref}).then(function(r){if(r.error){toast('No se pudo marcar: '+r.error.message);return;}toast(l.numero+' marcada como pagada');cargar();});}
  function eliminar(tipo,a){if(!window.confirm('Eliminar '+a.numero+'? Los paquetes vuelven a quedar pendientes.'))return;db.rpc('eliminar_acta_cobro',{p_tipo:tipo,p_id:a.id}).then(function(r){if(r.error){toast(r.error.message);return;}toast(a.numero+' eliminada');cargar();});}

  var tabB=function(k,t,n){var on=tab===k;return h('button',{key:k,type:'button',onClick:function(){setTab(k);setSel({});},style:{padding:'9px 15px',border:'none',borderBottom:'3px solid '+(on?'#C8A84B':'transparent'),background:'transparent',fontFamily:'Bebas Neue',fontSize:19,letterSpacing:1.2,color:on?'#2b2e20':'#8a8775',cursor:'pointer'}},t+(n?' ('+n+')':''));};
  var th={textAlign:'left',padding:'8px 10px',fontSize:10.5,letterSpacing:.8,textTransform:'uppercase',color:'#8a8775',borderBottom:'1px solid #e9e1ca',whiteSpace:'nowrap'};
  var td={padding:'8px 10px',borderBottom:'1px solid #f1ead6',fontSize:13,verticalAlign:'middle'};
  function chipDest(x){var d=DEST[destinoDe(x)];return h('span',{style:{padding:'2px 9px',borderRadius:999,fontSize:11,fontWeight:800,color:d[1],background:d[2],whiteSpace:'nowrap'}},d[0]);}
  function tabla(items,col3){var todos=items.length&&items.every(function(x){return sel[x.codigo];});
    return h('div',{style:{overflowX:'auto'}},h('table',{style:{width:'100%',borderCollapse:'collapse'}},
      h('thead',null,h('tr',null,h('th',{style:th},h('input',{type:'checkbox',checked:!!todos,onChange:function(){var o=Object.assign({},sel);items.forEach(function(x){o[x.codigo]=!todos;});setSel(o);}})),['Código','Fecha','Entregado',col3,'Destinatario','Forma','Destino','Monto'].map(function(c,i){return h('th',{key:i,style:i===7?Object.assign({},th,{textAlign:'right'}):th},c);}))),
      h('tbody',null,items.map(function(x){var d=diasDesde(x.cobro_at);return h('tr',{key:x.codigo,onClick:function(){var o=Object.assign({},sel);o[x.codigo]=!sel[x.codigo];setSel(o);},style:{cursor:'pointer',background:sel[x.codigo]?'#fbf2d6':'transparent'}},
        h('td',{style:td},h('input',{type:'checkbox',checked:!!sel[x.codigo],readOnly:true})),h('td',{style:Object.assign({},td,{fontFamily:'monospace',fontWeight:700})},x.codigo),h('td',{style:td},dmy(x.fecha)),
        h('td',{style:Object.assign({},td,{color:d>=1?'#b03030':'#5f5e4c',fontWeight:d>=1?800:600})},d==null?'—':d===0?'hoy':'hace '+d+' día'+(d>1?'s':'')),
        h('td',{style:td},col3==='Cliente'?(x.cliente||'—'):tit(x.mensajero)),h('td',{style:td},tit(x.destinatario)),h('td',{style:td},formaTxt(x)),h('td',{style:td},chipDest(x)),h('td',{style:Object.assign({},td,{textAlign:'right',fontWeight:800})},money(valor(x))));}))));}

  if(pend==null)return h('div',{style:{padding:30,textAlign:'center',color:'#7a7766'}},'Cargando…');
  var cabecera=h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:12,flexWrap:'wrap',marginBottom:12}},
    h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:36,letterSpacing:2,lineHeight:1}},'CONTROL ',h('span',{style:{color:'#C8A84B'}},'POR COBRAR')),
      h('div',{style:{fontSize:12.5,fontWeight:700,color:'#7a7766',marginTop:4}},'El mensajero cobra y rinde a diario · TransPgso liquida al cliente semanal o mensual · todo con acta numerada')),
    boton('Actualizar',cargar));
  var tabs=h('div',{style:{display:'flex',gap:4,borderBottom:'1px solid #e3dbc4',marginBottom:14,flexWrap:'wrap'}},tabB('panel','Panel'),tabB('rendir','Rendición mensajeros',porMen.length),tabB('liquidar','Liquidación clientes',porCli.length),tabB('actas','Actas e informe mensual'));

  var cuerpo;
  if(tab==='panel'){cuerpo=h('div',null,
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,marginBottom:14}},
      tile('En poder de mensajeros',money(tot(porRendir)),porRendir.length+' paquetes por rendir','#f7dd8c',true),
      tile('Rendición atrasada',atrasados.length,atrasados.length?'mensajeros con cobros de días anteriores':'todos al día',atrasados.length?'#b03030':'#2e7d4f'),
      tile('Por liquidar a clientes',money(tot(porLiquidar)),porLiquidar.length+' paquetes · '+porCli.length+' clientes','#8a6d1f'),
      tile('Liquidaciones sin pagar',liqPend.length,money(liqPend.reduce(function(s,l){return s+(+l.a_transferir||0);},0))+' por transferir',liqPend.length?'#b03030':'#2e7d4f'),
      tile('Transferencias sin destino',P.filter(function(x){return x.cobro_forma==='transferencia'&&!x.cobro_destino;}).length,'cobradas antes de que el mensajero informara la cuenta')),
    atrasados.length>0&&h('div',{style:{padding:'11px 15px',borderRadius:14,background:'#fff4f1',border:'1px solid #f3cfc6',marginBottom:14,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},h('span',{style:{fontWeight:900,color:'#b03030',fontSize:11,letterSpacing:1}},'COBRAR HOY'),
      atrasados.map(function(m){return h('button',{key:m.men,type:'button',onClick:function(){setSelMen(m.men);setTab('rendir');setSel({});},style:{padding:'5px 11px',borderRadius:999,background:'#fff',border:'1px solid #f0c7bd',color:'#8e2414',fontWeight:800,fontSize:12,cursor:'pointer'}},tit(m.men)+' · '+money(m.total)+' · '+m.maxDias+' día'+(m.maxDias>1?'s':''));})),
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(420px,1fr))',gap:14}},
      h('div',{style:C.card},h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.2,marginBottom:8}},'Por rendir, por mensajero'),porMen.length===0?h('div',{style:{color:'#7a7766',fontWeight:700}},'Nadie tiene cobros pendientes de rendir.'):
        porMen.map(function(m){return h('div',{key:m.men,onClick:function(){setSelMen(m.men);setTab('rendir');setSel({});},style:{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid #f1ead6',cursor:'pointer'}},h('b',{style:{flex:1}},tit(m.men)),h('span',{style:{fontSize:12,color:'#7a7766',fontWeight:700}},m.n+' paq.'),h('span',{style:{fontSize:12,fontWeight:800,color:m.maxDias>=1?'#b03030':'#2e7d4f',width:90,textAlign:'right'}},m.maxDias>=1?m.maxDias+' día'+(m.maxDias>1?'s':''):'de hoy'),h('b',{style:{width:100,textAlign:'right'}},money(m.total)));})),
      h('div',{style:C.card},h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.2,marginBottom:8}},'Por liquidar, por cliente'),porCli.length===0?h('div',{style:{color:'#7a7766',fontWeight:700}},'No hay cobros pendientes de liquidar.'):
        porCli.map(function(c){return h('div',{key:c.cli,onClick:function(){setSelCli(c.cli);setTab('liquidar');setSel({});},style:{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid #f1ead6',cursor:'pointer'}},h('b',{style:{flex:1}},c.cli),h('span',{style:{fontSize:12,color:'#7a7766',fontWeight:700}},c.n+' paq.'+(c.sinRendir?' · '+c.sinRendir+' sin rendir':'')),h('b',{style:{width:110,textAlign:'right'}},money(c.total-c.directo)));}))));}
  else if(tab==='rendir'){var itemsM=porRendir.filter(function(x){return x.mensajero===selMen;});var selItems=itemsM.filter(function(x){return sel[x.codigo];});var esp=tot(selItems);
    cuerpo=h('div',{style:C.card},
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}},porMen.map(function(m){var on=m.men===selMen;return h('button',{key:m.men,type:'button',onClick:function(){setSelMen(m.men);setSel({});},style:{padding:'7px 12px',borderRadius:999,border:'1px solid '+(on?'#C8A84B':'#e3dbc4'),background:on?'#fbf2d6':'#fff',fontWeight:800,fontSize:12.5,cursor:'pointer',color:m.maxDias>=1?'#b03030':'#2b2e20'}},tit(m.men)+' · '+money(m.total));}),porMen.length===0&&h('span',{style:{color:'#7a7766',fontWeight:700}},'Nadie tiene cobros pendientes de rendir.')),
      selMen?h('div',null,tabla(itemsM,'Cliente'),
        h('div',{style:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end',marginTop:14,padding:'12px 14px',borderRadius:14,background:'#faf6ea',border:'1px solid #efe6cc'}},
          h('div',null,h('div',{style:{fontSize:10.5,fontWeight:900,color:'#8a8775',letterSpacing:1}},'A RENDIR'),h('div',{style:{fontFamily:'Bebas Neue',fontSize:30}},money(esp))),
          h('label',{style:{display:'flex',flexDirection:'column',gap:4,fontSize:11,fontWeight:900,color:'#8a8775'}},'MONTO RECIBIDO',h('input',{value:recibido,placeholder:String(Math.round(esp)),onChange:function(e){setRecibido(e.target.value.replace(/\D/g,''));},style:{padding:'8px 10px',borderRadius:10,border:'1px solid #e3dbc4',width:130}})),
          h('label',{style:{display:'flex',flexDirection:'column',gap:4,fontSize:11,fontWeight:900,color:'#8a8775'}},'CÓMO LO ENTREGA',h('select',{value:formaRec,onChange:function(e){setFormaRec(e.target.value);},style:{padding:'8px 10px',borderRadius:10,border:'1px solid #e3dbc4'}},['Efectivo','Transferencia a TransPgso','Descuento en su pago'].map(function(o){return h('option',{key:o},o);}))),
          h('label',{style:{display:'flex',flexDirection:'column',gap:4,fontSize:11,fontWeight:900,color:'#8a8775',flex:'1 1 200px'}},'OBSERVACIÓN',h('input',{value:nota,onChange:function(e){setNota(e.target.value);},placeholder:'Opcional',style:{padding:'8px 10px',borderRadius:10,border:'1px solid #e3dbc4'}})),
          recibido!==''&&+recibido!==Math.round(esp)&&h('div',{style:{fontWeight:900,color:+recibido<esp?'#b03030':'#2e7d4f'}},'Diferencia '+money(+recibido-esp)),
          boton(busy?'Registrando…':'Registrar rendición y emitir acta',rendir,'prim',busy||!selItems.length))):h('div',{style:{color:'#7a7766',fontWeight:700,padding:10}},'Elige un mensajero.'));}
  else if(tab==='liquidar'){var itemsC=porLiquidar.filter(function(x){return x.cliente===selCli;});var rg=rangoPer();var enRango=itemsC.filter(function(x){return x.fecha>=rg[0]&&x.fecha<=rg[1];});var selL=itemsC.filter(function(x){return sel[x.codigo];});var totL=tot(selL),dirL=tot(selL.filter(function(x){return destinoDe(x)==='cliente';}));var sinRen=selL.filter(function(x){return !x.rendicion_id&&destinoDe(x)==='mensajero';}).length;
    cuerpo=h('div',{style:C.card},
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}},porCli.map(function(c){var on=c.cli===selCli;return h('button',{key:c.cli,type:'button',onClick:function(){setSelCli(c.cli);setSel({});},style:{padding:'7px 12px',borderRadius:999,border:'1px solid '+(on?'#C8A84B':'#e3dbc4'),background:on?'#fbf2d6':'#fff',fontWeight:800,fontSize:12.5,cursor:'pointer'}},c.cli+' · '+money(c.total-c.directo));}),porCli.length===0&&h('span',{style:{color:'#7a7766',fontWeight:700}},'No hay cobros pendientes de liquidar.')),
      selCli&&h('div',null,
        h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',marginBottom:10}},h('span',{style:{fontSize:12,fontWeight:800,color:'#7a7766'}},'Período:'),[['semana_ant','Semana pasada'],['semana','Esta semana'],['mes_ant','Mes pasado'],['mes','Este mes']].map(function(o){var on=per===o[0];return h('button',{key:o[0],type:'button',onClick:function(){setPer(o[0]);setSel({});},style:{padding:'6px 11px',borderRadius:999,border:'1px solid '+(on?'#2b2e20':'#e3dbc4'),background:on?'#2b2e20':'#fff',color:on?'#f7dd8c':'#5f5e4c',fontWeight:800,fontSize:12,cursor:'pointer'}},o[1]);}),
          h('span',{style:{fontSize:12,color:'#7a7766',fontWeight:700}},dmy(rg[0])+' al '+dmy(rg[1])),boton('Marcar los del período ('+enRango.length+')',function(){var o={};enRango.forEach(function(x){o[x.codigo]=true;});setSel(o);})),
        tabla(itemsC,'Mensajero'),
        h('div',{style:{display:'flex',gap:14,flexWrap:'wrap',alignItems:'flex-end',marginTop:14,padding:'12px 14px',borderRadius:14,background:'#faf6ea',border:'1px solid #efe6cc'}},
          [['COBRADO',totL],['PAGADO DIRECTO AL CLIENTE',dirL],['A TRANSFERIR',totL-dirL]].map(function(x,i){return h('div',{key:i},h('div',{style:{fontSize:10.5,fontWeight:900,color:'#8a8775',letterSpacing:1}},x[0]),h('div',{style:{fontFamily:'Bebas Neue',fontSize:i===2?34:26,color:i===2?'#8a6d1f':'#2b2e20'}},money(x[1])));}),
          h('label',{style:{display:'flex',flexDirection:'column',gap:4,fontSize:11,fontWeight:900,color:'#8a8775',flex:'1 1 200px'}},'OBSERVACIÓN',h('input',{value:nota,onChange:function(e){setNota(e.target.value);},placeholder:'Opcional',style:{padding:'8px 10px',borderRadius:10,border:'1px solid #e3dbc4'}})),
          sinRen>0&&h('div',{style:{fontWeight:800,color:'#b03030',fontSize:12.5}},sinRen+' aún sin rendir por el mensajero'),
          boton(busy?'Emitiendo…':'Emitir liquidación',liquidar,'prim',busy||!selL.length))));}
  else{var resumenMes=(function(){var R={};(rens||[]).filter(function(r){return String(r.fecha).slice(0,7)===mes;}).forEach(function(r){var k=r.mensajero;var o=R[k]=R[k]||{men:k,n:0,esp:0,rec:0};o.n+=(r.codigos||[]).length;o.esp+=+r.total_esperado;o.rec+=+r.monto_recibido;});return Object.keys(R).map(function(k){return R[k];});})();
    var liqMes=(liqs||[]).filter(function(l){return String(l.fecha).slice(0,7)===mes;});
    cuerpo=h('div',{style:{display:'flex',flexDirection:'column',gap:14}},
      h('div',{style:{display:'flex',gap:8,alignItems:'center'}},h('span',{style:{fontWeight:800,fontSize:12.5,color:'#7a7766'}},'Mes:'),h('input',{type:'month',value:mes,onChange:function(e){setMes(e.target.value);},style:{padding:'7px 9px',borderRadius:10,border:'1px solid #e3dbc4'}}),
        boton('Excel del mes',function(){var ex=A.exportToExcel;if(!ex)return;ex('Por_cobrar_'+mes,[{name:'Rendiciones',headers:['Número','Fecha','Mensajero','Paquetes','A rendir','Recibido','Diferencia','Forma','Recibió'],rows:(rens||[]).filter(function(r){return String(r.fecha).slice(0,7)===mes;}).map(function(r){return [r.numero,dmy(r.fecha),r.mensajero,(r.codigos||[]).length,+r.total_esperado,+r.monto_recibido,(+r.monto_recibido)-(+r.total_esperado),r.forma_recibo||'',r.recibido_por||''];})},
          {name:'Liquidaciones',headers:['Número','Fecha','Cliente','Desde','Hasta','Paquetes','Cobrado','Directo al cliente','A transferir','Estado','Pagada','Referencia'],rows:liqMes.map(function(l){return [l.numero,dmy(l.fecha),l.cliente,dmy(l.desde),dmy(l.hasta),(l.codigos||[]).length,+l.total_cobrado,+l.directo_cliente,+l.a_transferir,l.estado,l.pagada_fecha?dmy(l.pagada_fecha):'',l.pagada_ref||''];})}]);})),
      h('div',{style:C.card},h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.2,marginBottom:8}},'Resumen del mes por mensajero'),resumenMes.length===0?h('div',{style:{color:'#7a7766'}},'Sin rendiciones este mes.'):
        resumenMes.map(function(r){var d=r.rec-r.esp;return h('div',{key:r.men,style:{display:'flex',gap:10,padding:'7px 0',borderBottom:'1px solid #f1ead6',fontSize:13}},h('b',{style:{flex:1}},tit(r.men)),h('span',null,r.n+' paq.'),h('span',{style:{width:120,textAlign:'right'}},'rindió '+money(r.rec)),h('span',{style:{width:120,textAlign:'right',fontWeight:800,color:d<0?'#b03030':'#2e7d4f'}},d===0?'cuadra':'dif. '+money(d)));})),
      [['Liquidaciones a clientes','liq',liqs],['Actas de rendición','ren',rens]].map(function(s){var L=(s[2]||[]).filter(function(a){return String(a.fecha).slice(0,7)===mes;});return h('div',{key:s[1],style:C.card},h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,letterSpacing:1.2,marginBottom:8}},s[0]+' ('+L.length+')'),L.length===0?h('div',{style:{color:'#7a7766'}},'Ninguna este mes.'):
        L.map(function(a){var liq=s[1]==='liq';return h('div',{key:a.id,style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'9px 0',borderBottom:'1px solid #f1ead6'}},
          h('span',{style:{fontFamily:'monospace',fontWeight:800,padding:'3px 8px',borderRadius:7,background:'#2b2e20',color:'#e8c766'}},a.numero),
          h('div',{style:{flex:1,minWidth:200,fontSize:13}},h('b',null,liq?a.cliente:tit(a.mensajero)),' · '+(a.codigos||[]).length+' paq. · '+dmy(a.fecha)+(liq?' · período '+dmy(a.desde)+' al '+dmy(a.hasta):'')),
          h('b',null,money(liq?a.a_transferir:a.monto_recibido)),
          liq&&h('span',{style:{padding:'3px 10px',borderRadius:999,fontSize:11,fontWeight:900,background:a.estado==='pagada'?'#dff3e7':'#fbefd2',color:a.estado==='pagada'?'#1f6b40':'#8a5a00'}},a.estado==='pagada'?'PAGADA '+dmy(a.pagada_fecha):'POR PAGAR'),
          boton('Ver / PDF',function(){abrir(htmlActa(s[1],a));},'prim'),boton('Excel',function(){excelActa(s[1],a);}),
          liq&&a.estado!=='pagada'&&boton('Marcar pagada',function(){pagar(a);}),
          esAdmin&&!(liq&&a.estado==='pagada')&&boton('Eliminar',function(){eliminar(liq?'liquidacion':'rendicion',a);},'peligro'));}));}));}
  return h('div',{style:{color:'#2b2e20'}},cabecera,tabs,cuerpo);
}
window.PorCobrar=PorCobrar;
})();
