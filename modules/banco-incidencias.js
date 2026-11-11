// Operaciones → Banco de incidencias (11-11-2026)
// Todas las incidencias reportadas (tabla reportes_operador) con su solución, filtrables por día,
// semana, mes, rango, mensajero y tipo. Cada incidencia revisada se marca "a descuento" (con los
// envíos del reglamento) o "sin descuento". Las que van a descuento se aplican al pago semanal del
// mensajero (Pagos Mensajeros → penalizaciones, misma función aplicarMultaExterna que usa Firmas en
// Vivo), en la semana de la fecha de la incidencia. Antes de aplicar se reserva la incidencia en la
// base (registrar_descuento_reporte) para que nunca se descuente dos veces; si la multa falla se revierte.
(function(){
var A=window.__app||{};var db=A.db;var h=React.createElement,useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo;
var CG={'Leve':'#3fae6e','Grave':'#e0933a','Crítica':'#e0473f','Otro':'#8d8f7a'};
var ORO='#e8c766',TXT='#f1ecda',SUAVE='rgba(233,228,210,.65)';

function hoyCL(){return A.fechaHoyCL?A.fechaHoyCL():new Date().toISOString().slice(0,10);}
function sumarDias(f,n){var d=new Date(f+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function lunesDe(f){var d=new Date(f+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return d.toISOString().slice(0,10);}
function dmy(f){return f?String(f).slice(0,10).split('-').reverse().join('-'):'';}
function nm(s){return String(s||'').replace(/,\s*/g,' ').replace(/\s+/g,' ').trim();}
function fh(ts){try{return new Date(ts).toLocaleString('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});}catch(e){return '';}}
function money(n){return '$'+Math.round(n||0).toLocaleString('es-CL');}
function semanaPago(f){var l=lunesDe(f),s=sumarDias(l,5);return dmy(l).replace(/-/g,'/')+' al '+dmy(s).replace(/-/g,'/');}
function infoFalta(motivo){
  var C=A.CATALOGO_FALTAS_REGLAMENTO||[];var m=String(motivo||'').toLowerCase();
  var f=C.find(function(x){return String(x.label).toLowerCase()===m;})||C.find(function(x){var l=String(x.label).toLowerCase();return l.indexOf(m)>=0||m.indexOf(l)>=0;});
  if(!f&&/fuera de tiempo/.test(m))f=C.find(function(x){return /fuera de tiempo/i.test(x.label);});
  return f?{grupo:f.grupo,envios:+f.envios||0}:{grupo:'Otro',envios:0};
}
function estadoDe(r){if(!r.resuelto)return 'sin_revisar';if(r.descontado)return 'descontada';if(r.a_descuento===true)return 'por_descontar';if(r.a_descuento===false)return 'sin_descuento';return 'por_decidir';}
var EST={sin_revisar:['Sin revisar','#e8b84a'],por_decidir:['Revisada · sin decidir','#5b8def'],por_descontar:['Por descontar','#ff8a3d'],descontada:['Descontada','#36c47f'],sin_descuento:['Sin descuento','#9aa08a']};

var css='.bi-seg{transition:transform .12s,color .12s}.bi-seg:hover{color:#fff}.bi-seg:active{transform:translateY(1px)}'+
 '.bi-chip{transition:all .15s;cursor:pointer}.bi-chip:hover{transform:translateY(-1px)}'+
 '.bi-tab{table-layout:fixed}.bi-tab th,.bi-tab td{white-space:normal;overflow-wrap:anywhere;word-break:normal;vertical-align:top;line-height:1.35}.bi-tab tbody tr td{color:#f1ecda;background:transparent!important}.bi-row:hover{background:rgba(232,199,102,.06)!important}'+
 '.bi-in{padding:8px 10px;border-radius:10px;border:1px solid rgba(232,199,102,.4);background:rgba(255,255,255,.95);font-size:13px;color:#1a1d13;outline:none}'+
 '.bi-btn{transition:transform .12s,filter .12s;cursor:pointer}.bi-btn:hover{filter:brightness(1.08)}.bi-btn:active{transform:translateY(1px)}.bi-btn:disabled{opacity:.5;cursor:default}'+
 '@media (max-width:760px){.bi-kpis{grid-template-columns:repeat(2,1fr)!important}.bi-hide-m{display:none}}';
var caja={position:'relative',borderRadius:20,background:'radial-gradient(120% 160% at 15% 0%,#3a3f2b 0%,#23271a 50%,#15180f 100%)',border:'1px solid rgba(200,168,75,.35)',boxShadow:'0 18px 38px rgba(20,22,15,.25), inset 0 1px 0 rgba(255,255,255,.07)',color:TXT};
var vidrio={borderRadius:14,background:'linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.1)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.06)'};
function btnOro(txt,on,dis,extra){return h('button',{className:'bi-btn',onClick:on,disabled:dis,style:Object.assign({padding:'9px 16px',borderRadius:11,border:'1px solid #f7dd8c',background:'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)',color:'#1a1d13',fontWeight:900,fontSize:13,boxShadow:'0 3px 0 #6d531a,0 6px 14px rgba(200,168,75,.3),inset 0 1px 0 rgba(255,255,255,.55)',whiteSpace:'nowrap'},extra||{})},txt);}
function btnVid(txt,on,dis,extra){return h('button',{className:'bi-btn',onClick:on,disabled:dis,style:Object.assign({padding:'8px 14px',borderRadius:10,border:'1px solid rgba(232,199,102,.4)',background:'rgba(255,255,255,.06)',color:TXT,fontWeight:800,fontSize:12.5,whiteSpace:'nowrap'},extra||{})},txt);}
function chip(txt,n,act,col,on){return h('span',{className:'bi-chip',onClick:on,style:{display:'inline-flex',alignItems:'center',gap:7,padding:'7px 12px',borderRadius:999,fontSize:12.5,fontWeight:800,border:'1px solid '+(act?col:'rgba(255,255,255,.12)'),background:act?col+'2e':'rgba(255,255,255,.04)',color:act?'#fff':'rgba(241,236,218,.85)',boxShadow:act?'0 0 14px '+col+'40':'none'}},
  h('span',{style:{width:8,height:8,borderRadius:'50%',background:col,boxShadow:'0 0 6px '+col}}),txt,n!=null&&h('span',{style:{fontFamily:'Bebas Neue',fontSize:15,letterSpacing:.5,color:act?'#fff':ORO}},n));}

function BancoIncidencias(props){
  var toast=props.toast||function(){};
  var mensajeros=props.mensajeros||[];
  var hoy=hoyCL();
  var _per=useState('semana'),per=_per[0],setPer=_per[1];
  var _dia=useState(hoy),dia=_dia[0],setDia=_dia[1];
  var _rd=useState(sumarDias(hoy,-29)),rD=_rd[0],setRD=_rd[1];
  var _rh=useState(hoy),rH=_rh[0],setRH=_rh[1];
  var _rows=useState([]),rows=_rows[0],setRows=_rows[1];
  var _c=useState(true),cargando=_c[0],setCargando=_c[1];
  var _fm=useState(''),fMen=_fm[0],setFMen=_fm[1];
  var _ft=useState(''),fTipo=_ft[0],setFTipo=_ft[1];
  var _fe=useState('todas'),fEst=_fe[0],setFEst=_fe[1];
  var _q=useState(''),q=_q[0],setQ=_q[1];
  var _rev=useState(null),rev=_rev[0],setRev=_rev[1]; // {id,texto,desc,envios}
  var _busy=useState(false),busy=_busy[0],setBusy=_busy[1];
  var _sel=useState({}),sel=_sel[0],setSel=_sel[1];

  var lim=(function(){
    if(per==='hoy')return [hoy,hoy];
    if(per==='ayer'){var a=sumarDias(hoy,-1);return [a,a];}
    if(per==='semana')return [lunesDe(hoy),sumarDias(lunesDe(hoy),6)];
    if(per==='semana_ant'){var l=sumarDias(lunesDe(hoy),-7);return [l,sumarDias(l,6)];}
    if(per==='mes')return [hoy.slice(0,7)+'-01',hoy];
    if(per==='dia')return [dia,dia];
    return [rD,rH];
  })();
  var desde=lim[0],hasta=lim[1];

  function cargar(silencio){
    if(!silencio)setCargando(true);
    db.from('reportes_operador').select('*').gte('fecha',desde).lte('fecha',hasta).order('fecha',{ascending:false}).order('created_at',{ascending:false}).limit(5000)
      .then(function(r){if(r.error)toast('No se pudo cargar el banco: '+r.error.message);setRows((r&&r.data)||[]);setCargando(false);},function(){setCargando(false);});
  }
  useEffect(function(){cargar();setSel({});},[desde,hasta]);
  useEffect(function(){var iv=setInterval(function(){if(!document.hidden)cargar(true);},60000);return function(){clearInterval(iv);};},[desde,hasta]);

  var tarifaDe=useMemo(function(){var m={};mensajeros.forEach(function(x){m[nm(x.nombre).toUpperCase()]=+x.tarifa||1200;});return function(n){return m[nm(n).toUpperCase()]||1200;};},[mensajeros]);
  // Cada fila enriquecida con tipo/grupo, envíos de descuento y monto estimado.
  var datos=useMemo(function(){return rows.map(function(r){var f=infoFalta(r.motivo);var env=r.descuento_envios!=null?r.descuento_envios:f.envios;
    return Object.assign({},r,{_grupo:f.grupo,_envios:env,_monto:r.descontado&&r.descuento_monto!=null?r.descuento_monto:env*tarifaDe(r.mensajero),_est:estadoDe(r),_men:nm(r.mensajero)||'Sin mensajero'});});},[rows,tarifaDe]);

  var base=datos.filter(function(r){
    if(q){var s=q.toLowerCase();if((String(r.codigo)+' '+r._men+' '+(r.cliente||'')+' '+(r.comentario||'')+' '+(r.resolucion||'')).toLowerCase().indexOf(s)<0)return false;}
    return true;});
  var porMen={},porTipo={},porEst={};
  base.forEach(function(r){porMen[r._men]=(porMen[r._men]||0)+1;});
  base.filter(function(r){return !fMen||r._men===fMen;}).forEach(function(r){porTipo[r.motivo]=(porTipo[r.motivo]||0)+1;});
  base.filter(function(r){return (!fMen||r._men===fMen)&&(!fTipo||r.motivo===fTipo);}).forEach(function(r){porEst[r._est]=(porEst[r._est]||0)+1;});
  var lista=base.filter(function(r){return (!fMen||r._men===fMen)&&(!fTipo||r.motivo===fTipo)&&(fEst==='todas'||r._est===fEst);});
  var tiposOrd=Object.keys(porTipo).sort(function(a,b){return porTipo[b]-porTipo[a];});
  var mensOrd=Object.keys(porMen).sort(function(a,b){return a.localeCompare(b);});

  var alcance=base.filter(function(r){return (!fMen||r._men===fMen)&&(!fTipo||r.motivo===fTipo);});
  var k={tot:alcance.length,rev:alcance.filter(function(r){return r.resuelto;}).length};
  var pd=alcance.filter(function(r){return r._est==='por_descontar';}),dd=alcance.filter(function(r){return r._est==='descontada';});
  k.pdN=pd.length;k.pdEnv=pd.reduce(function(a,r){return a+r._envios;},0);k.pdM=pd.reduce(function(a,r){return a+r._monto;},0);
  k.ddN=dd.length;k.ddM=dd.reduce(function(a,r){return a+r._monto;},0);

  // Resumen por mensajero de lo que está por descontar
  var resMen={};pd.forEach(function(r){var x=resMen[r._men]=resMen[r._men]||{n:0,env:0,m:0,ids:[]};x.n++;x.env+=r._envios;x.m+=r._monto;x.ids.push(r.id);});
  var resMenOrd=Object.keys(resMen).sort(function(a,b){return resMen[b].m-resMen[a].m;});

  async function guardarRevision(){
    var r=datos.find(function(x){return x.id===rev.id;});if(!r)return;
    setBusy(true);
    try{
      if(!r.resuelto){
        if(String(rev.texto||'').trim().length<3){toast('Escribe la solución (mínimo 3 letras)');setBusy(false);return;}
        var a=await db.rpc('resolver_reporte_operador',{p_id:r.id,p_resolucion:rev.texto});if(a.error)throw a.error;
      }
      var b=await db.rpc('marcar_descuento_reporte',{p_id:r.id,p_a_descuento:!!rev.desc,p_envios:rev.desc?(+rev.envios||0):0});if(b.error)throw b.error;
      toast(rev.desc?'Incidencia revisada: va a descuento':'Incidencia revisada: sin descuento');
      setRev(null);cargar(true);
    }catch(e){toast('No se pudo guardar: '+(e.message||e));}
    setBusy(false);
  }

  async function descontar(ids){
    var items=datos.filter(function(r){return ids.indexOf(r.id)>=0&&r._est==='por_descontar';});
    if(!items.length){toast('No hay incidencias por descontar en la selección');return;}
    var totalM=items.reduce(function(a,r){return a+r._monto;},0);
    if(!window.confirm('Se descontarán '+items.length+' incidencia'+(items.length!==1?'s':'')+' (≈ '+money(totalM)+') en Pagos Mensajeros, en la semana de pago de cada incidencia. ¿Continuar?'))return;
    setBusy(true);
    try{if(typeof loadScriptOnce==='function')await loadScriptOnce('pagos-mensajeros','modules/pagos-mensajeros.js');}catch(e){}
    if(!A.aplicarMultaExterna){setBusy(false);toast('No se pudo cargar Pagos Mensajeros');return;}
    var ok=0,errores=[];
    for(var i=0;i<items.length;i++){var r=items[i];var sem=semanaPago(r.fecha);
      var c=await db.rpc('registrar_descuento_reporte',{p_id:r.id,p_monto:Math.round(r._monto),p_semana:sem});
      if(c.error){errores.push(r.codigo+': '+c.error.message);continue;}
      var nota='Banco de incidencias'+(r.resolucion?' · '+r.resolucion:'');
      var m=await A.aplicarMultaExterna(r.mensajero,r.motivo,r._envios,nota,r.fecha,r.codigo);
      if(m&&m.ok){ok++;if(m.monto!=null&&m.monto!==Math.round(r._monto))await db.rpc('confirmar_monto_descuento',{p_id:r.id,p_monto:m.monto});}
      else{await db.rpc('revertir_descuento_reporte',{p_id:r.id});
        errores.push(r.codigo+': '+(m&&m.motivo==='sin_semana'?'la semana '+sem+' no está calculada en Pagos Mensajeros':m&&m.motivo==='sin_mensajero'?r._men+' no aparece en los pagos de la semana '+sem:(m&&m.mensaje)||'error'));}
    }
    setBusy(false);setSel({});cargar(true);
    if(ok)toast(ok+' descuento'+(ok!==1?'s':'')+' aplicado'+(ok!==1?'s':'')+' en Pagos Mensajeros');
    if(errores.length)window.alert('No se pudieron descontar '+errores.length+':\n\n'+errores.slice(0,12).join('\n'));
  }
  async function revertir(r){
    if(!window.confirm('Esto solo vuelve la incidencia a "Por descontar" en el banco. Si ya se aplicó en Pagos Mensajeros, quita esa línea allá a mano. ¿Continuar?'))return;
    var x=await db.rpc('revertir_descuento_reporte',{p_id:r.id});if(x.error)toast('Error: '+x.error.message);else{toast('Incidencia vuelta a Por descontar');cargar(true);}
  }

  function excel(){
    var ex=A.exportToExcel;if(!ex){toast('Excel no disponible');return;}
    ex('Banco_incidencias_'+desde+'_a_'+hasta,[
      {name:'Incidencias',headers:['Fecha','Código','Mensajero','Cliente','Comuna','Tipo','Nivel','Comentario','Reportó','Estado','Solución','Revisó','Descuento','Envíos','Monto','Semana de pago','Descontó'],
       rows:lista.map(function(r){return [dmy(r.fecha),r.codigo,r._men,r.cliente||'',r.comuna||'',r.motivo,r._grupo,r.comentario||'',r.reportado_por||'',EST[r._est][0],r.resolucion||'',r.resuelto_por||'',r.a_descuento===true?'Sí':r.a_descuento===false?'No':'',r.a_descuento?r._envios:'',r.a_descuento?Math.round(r._monto):'',r.semana_pago||'',r.descontado_por||''];})},
      {name:'Por mensajero',headers:['Mensajero','Incidencias','Por descontar','Envíos','Monto estimado'],
       rows:Object.keys(porMen).sort().map(function(m){var x=resMen[m]||{n:0,env:0,m:0};return [m,porMen[m],x.n,x.env,Math.round(x.m)];})}
    ]);
  }

  // PDF con el formato de documentos TransPgso (modules/doc-pdf.js), mismo estilo del comprobante de entrega.
  function pdf(){
    if(!lista.length){toast('No hay incidencias para el PDF con estos filtros');return;}
    var w=window.open('','_blank');
    var cargar=typeof loadScriptOnce==='function'?loadScriptOnce('doc-pdf','modules/doc-pdf.js'):Promise.resolve();
    cargar.then(function(){
      var D=window.__docPDF;if(!D)throw new Error('módulo de documentos no disponible');
      var e=function(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
      var tabla=function(cabs,filas,anchos){return '<table class="tabla">'+(anchos?'<colgroup>'+anchos.map(function(a){return '<col style="width:'+a+'"/>';}).join('')+'</colgroup>':'')+'<tr>'+cabs.map(function(c){return '<th>'+e(c)+'</th>';}).join('')+'</tr>'+filas.map(function(f){return '<tr>'+f.map(function(v){return '<td>'+v+'</td>';}).join('')+'</tr>';}).join('')+'</table>';};
      var sec=function(n,t,hh){return '<div class="sec"><h2>'+n+'. '+e(t)+'</h2>'+hh+'</div>';};
      var tot={n:lista.length,rev:0,pdN:0,pdM:0,ddN:0,ddM:0,sdN:0};
      var men={},tip={};
      lista.forEach(function(r){if(r.resuelto)tot.rev++;
        var x=men[r._men]=men[r._men]||{n:0,pd:0,pdM:0,dd:0,ddM:0,env:0};x.n++;
        var t=tip[r.motivo]=tip[r.motivo]||{n:0,g:r._grupo};t.n++;
        if(r._est==='por_descontar'){tot.pdN++;tot.pdM+=r._monto;x.pd++;x.pdM+=r._monto;x.env+=r._envios;}
        if(r._est==='descontada'){tot.ddN++;tot.ddM+=r._monto;x.dd++;x.ddM+=r._monto;x.env+=r._envios;}
        if(r._est==='sin_descuento')tot.sdN++;});
      var menO=Object.keys(men).sort(function(a,b){return (men[b].pdM+men[b].ddM)-(men[a].pdM+men[a].ddM)||men[b].n-men[a].n;});
      var tipO=Object.keys(tip).sort(function(a,b){return tip[b].n-tip[a].n;});
      var cuerpo='',n=1;
      cuerpo+=sec(n++,'Resumen por mensajero',tabla(['Mensajero','Incidencias','Por descontar','Descontadas','Envíos','Monto'],
        menO.map(function(m){var x=men[m];return ['<b>'+e(m)+'</b>',x.n,x.pd+(x.pd?' ('+money(x.pdM)+')':''),x.dd+(x.dd?' ('+money(x.ddM)+')':''),x.env||'—','<b>'+money(x.pdM+x.ddM)+'</b>'];})
        .concat([['<b>TOTAL</b>','<b>'+tot.n+'</b>','<b>'+tot.pdN+'</b>','<b>'+tot.ddN+'</b>','','<b>'+money(tot.pdM+tot.ddM)+'</b>']])));
      cuerpo+=sec(n++,'Resumen por tipo de incidencia',tabla(['Tipo','Nivel','Incidencias','%'],tipO.map(function(t){return [e(t),e(tip[t].g),tip[t].n,Math.round(tip[t].n/tot.n*100)+'%'];}),['56%','14%','15%','15%']));
      var det='';
      menO.forEach(function(m){var rs=lista.filter(function(r){return r._men===m;});
        det+='<h3>'+e(m)+' ('+rs.length+')</h3>'+tabla(['Fecha','Código','Tipo','Comentario','Solución','Descuento','Estado'],
          rs.map(function(r){return ['<span style="white-space:nowrap">'+dmy(r.fecha)+'</span>','<span style="font-family:JetBrains Mono,monospace;font-weight:700">'+e(r.codigo)+'</span>'+(r.cliente?'<br/><span style="color:#6b6e5c;font-size:9px">'+e(r.cliente)+'</span>':''),
            '<b style="color:'+(r._grupo==='Crítica'?'#b03030':r._grupo==='Grave'?'#c06a12':'#2e7d4f')+'">'+e(r._grupo)+'</b><br/>'+e(r.motivo),e(r.comentario||'—'),
            r.resuelto?e(r.resolucion||'')+'<br/><span style="color:#6b6e5c;font-size:9px">'+e(r.resuelto_por||'')+'</span>':'<span style="color:#a8650a;font-weight:700">Sin solución aún</span>',
            r.a_descuento?('<b>'+money(r._monto)+'</b><br/><span style="color:#6b6e5c;font-size:9px">'+r._envios+' envíos'+(r.semana_pago?' · sem. '+e(r.semana_pago):'')+'</span>'):(r.a_descuento===false?'No aplica':'—'),
            e(EST[r._est][0])];}),['12%','14%','19%','17%','17%','11%','10%']);});
      cuerpo+=sec(n++,'Detalle de incidencias',det);
      var filtros=[fMen?'Mensajero: '+fMen:'',fTipo?'Tipo: '+fTipo:'',fEst!=='todas'?'Estado: '+EST[fEst][0]:'',q?'Búsqueda: '+q:''].filter(Boolean).join(' · ');
      var per=desde===hasta?dmy(desde):dmy(desde)+' al '+dmy(hasta);
      D.abrir(w,D.documentoHTML({
        tipo:'BANCO DE INCIDENCIAS',folio:'',fechaDoc:dmy(hasta),
        titulo:'Banco de incidencias — '+per,
        subtitulo:filtros,
        metaPares:[['Período',per,2],['Incidencias',String(tot.n)],['Revisadas',tot.rev+' de '+tot.n],['Por descontar',tot.pdN+' · '+money(tot.pdM)],['Descontado',tot.ddN+' · '+money(tot.ddM)],['Sin descuento',String(tot.sdN)],['Mensajeros',String(menO.length)]],
        cuerpo:cuerpo,
        cierre:'Registro de incidencias reportadas por el equipo de operadores, con la solución aplicada y la decisión de descuento según el Reglamento Operativo. Montos calculados con la tarifa vigente de cada mensajero. Generado desde el sistema de gestión TransPgso.',
        nombreArchivo:'Banco_incidencias_'+desde+(desde!==hasta?'_a_'+hasta:'')+(fMen?'_'+fMen.replace(/\s+/g,'_'):'')
      }));
    }).catch(function(err){try{w&&w.close();}catch(x){}toast('No se pudo generar el PDF: '+(err&&err.message||''));});
  }
  // Formulario de revisión (se usa en la fila y dentro del modal Ver envío)
  function formRev(r){
    return h('div',{style:Object.assign({},vidrio,{padding:'12px 14px',display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'})},
                  !r.resuelto&&h('div',{style:{flex:'2 1 320px'}},h('div',{style:{fontSize:11,fontWeight:900,letterSpacing:1.2,color:ORO,marginBottom:5}},'SOLUCIÓN'),
                    h('input',{className:'bi-in',autoFocus:true,style:{width:'100%',boxSizing:'border-box'},placeholder:'Cómo se resolvió (se guarda en el banco)',value:rev.texto,onChange:function(e){var v=e.target.value;setRev(function(p){return Object.assign({},p,{texto:v});});}})),
                  h('div',null,h('div',{style:{fontSize:11,fontWeight:900,letterSpacing:1.2,color:ORO,marginBottom:5}},'¿VA A DESCUENTO?'),
                    h('div',{style:{display:'inline-flex',gap:4,padding:3,borderRadius:11,background:'rgba(0,0,0,.35)'}},
                      [[true,'Sí, descontar'],[false,'No']].map(function(o){var act=rev.desc===o[0];return h('button',{key:String(o[0]),className:'bi-seg',onClick:function(){setRev(function(p){return Object.assign({},p,{desc:o[0]});});},style:{padding:'7px 13px',borderRadius:9,border:'none',background:act?(o[0]?'#ff8a3d':'#6f7560'):'transparent',color:'#fff',fontWeight:800,fontSize:12.5,cursor:'pointer'}},o[1]);}))),
                  rev.desc&&h('div',null,h('div',{style:{fontSize:11,fontWeight:900,letterSpacing:1.2,color:ORO,marginBottom:5}},'ENVÍOS A DESCONTAR'),
                    h('input',{type:'number',min:0,className:'bi-in',style:{width:90},value:rev.envios,onChange:function(e){var v=e.target.value;setRev(function(p){return Object.assign({},p,{envios:v});});}}),
                    h('span',{style:{fontSize:12,color:SUAVE,marginLeft:8}},'≈ '+money((+rev.envios||0)*tarifaDe(r.mensajero)))),
                  h('div',{style:{display:'flex',gap:8,marginLeft:'auto'}},btnVid('Ver envío',function(){abrirVer(r);}),btnVid('Cancelar',function(){setRev(null);}),btnOro(busy?'Guardando…':'Guardar',guardarRevision,busy)));
  }
  // Ver envío: mismo detalle que el modal de Gestión de Envíos (EnvioDetalleCard), con Anterior/Siguiente.
  var _ver=useState(null),ver=_ver[0],setVer=_ver[1];
  var _venv=useState(null),verEnv=_venv[0],setVerEnv=_venv[1];
  var verRow=ver?(datos.find(function(x){return x.id===ver.ids[ver.i];})||null):null;
  useEffect(function(){
    if(!verRow){setVerEnv(null);return;}
    var vivo=true;setVerEnv('cargando');
    db.from('envios').select('*').eq('codigo',verRow.codigo).maybeSingle().then(function(q){if(vivo)setVerEnv(q&&q.data?q.data:{codigo:verRow.codigo,_noExiste:true});});
    return function(){vivo=false;};
  },[verRow&&verRow.codigo]);
  useEffect(function(){
    if(!ver)return;
    function k(e){if(document.querySelector('textarea:focus,input:focus'))return;if(e.key==='ArrowRight')mover(1);else if(e.key==='ArrowLeft')mover(-1);else if(e.key==='Escape')setVer(null);}
    window.addEventListener('keydown',k);return function(){window.removeEventListener('keydown',k);};
  },[ver]);
  function abrirVer(r){var ids=lista.map(function(x){return x.id;});if(ids.indexOf(r.id)<0)ids=[r.id];setVer({ids:ids,i:Math.max(0,ids.indexOf(r.id))});}
  function mover(d){setVer(function(v){if(!v)return v;var ni=v.i+d;if(ni<0||ni>=v.ids.length)return v;return {ids:v.ids,i:ni};});}
  function modalVer(){
    if(!ver||!verRow)return null;
    var M=A.Modal,Card=A.EnvioDetalleCard,r=verRow,col=CG[r._grupo]||'#c8a84b',es=EST[r._est];
    var nb=function(lbl,d,dis){return h('button',{type:'button',className:'btn-secondary',disabled:dis,onClick:function(){mover(d);},style:{padding:'6px 14px',fontSize:12,opacity:dis?0.4:1}},lbl);};
    var editando=rev&&rev.id===r.id;
    return h(M,{title:'Incidencia · '+r.codigo,sub:(ver.i+1)+' de '+ver.ids.length+' en la lista · usa ← → para avanzar',wide:true,onClose:function(){setVer(null);}},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:12,flexWrap:'wrap'}},
        h('div',{style:{display:'flex',gap:6}},nb('← Anterior',-1,ver.i===0),nb('Siguiente →',1,ver.i>=ver.ids.length-1)),
        h('div',{style:{display:'flex',gap:6}},
          !r.descontado&&!editando&&h('button',{type:'button',onClick:function(){setRev({id:r.id,texto:r.resolucion||'',desc:r.a_descuento!==false,envios:r._envios});},style:{padding:'7px 14px',borderRadius:8,border:'1px solid #ae8829',background:'linear-gradient(180deg,#f7dd8c,#d9b553)',color:'#1a1d13',fontWeight:800,fontSize:12,cursor:'pointer'}},r.resuelto?'Editar revisión':'Revisar'),
          r._est==='por_descontar'&&h('button',{type:'button',disabled:busy,onClick:function(){descontar([r.id]);},style:{padding:'7px 14px',borderRadius:8,border:'1px solid #c0601a',background:'#ff8a3d',color:'#fff',fontWeight:800,fontSize:12,cursor:'pointer'}},'Descontar'),
          h('button',{type:'button',className:'btn-secondary',style:{padding:'7px 14px',fontSize:12},onClick:function(){setVer(null);}},'Cerrar'))),
      h('div',{style:{padding:'14px 16px',borderRadius:12,marginBottom:14,background:'linear-gradient(160deg,#ffffff,#fbf6ea)',border:'1px solid rgba(200,168,75,0.35)',borderLeft:'5px solid '+col,boxShadow:'0 8px 18px rgba(43,46,32,0.08)'}},
        h('div',{style:{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}},
          h('div',{style:{fontSize:10.5,letterSpacing:2,textTransform:'uppercase',color:'var(--text-soft)',fontWeight:700,marginBottom:4}},'Lo que se reportó'),
          h('span',{style:{display:'inline-flex',alignItems:'center',gap:6,padding:'3px 10px',borderRadius:999,background:es[1]+'22',border:'1px solid '+es[1],color:'var(--dark)',fontSize:11.5,fontWeight:800}},h('span',{style:{width:7,height:7,borderRadius:'50%',background:es[1]}}),es[0])),
        h('div',{style:{fontWeight:800,fontSize:15,color:'var(--dark)',marginBottom:4}},h('span',{style:{display:'inline-block',padding:'1px 8px',borderRadius:8,fontSize:10,fontWeight:800,letterSpacing:1,textTransform:'uppercase',color:'#fff',background:col,marginRight:8,verticalAlign:'2px'}},r._grupo),r.motivo),
        r.comentario&&h('div',{style:{fontSize:13,color:'var(--text-mid)',marginBottom:6}},'“'+r.comentario+'”'),
        h('div',{style:{fontSize:12,color:'var(--text-soft)'}},'Reportó ',h('b',{style:{color:'var(--dark)'}},r.reportado_por||'—'),' · '+dmy(r.fecha)+' '+(fh(r.created_at).split(' ')[1]||'')+' · Mensajero ',h('b',{style:{color:'var(--dark)'}},r._men)),
        h('div',{style:{marginTop:6,fontSize:12}},r.resuelto?h('span',{style:{color:'#2e7d4f',fontWeight:800}},'Solución: '+(r.resolucion||'')+(r.resuelto_por?' ('+r.resuelto_por+')':'')):h('span',{style:{color:'#c98a1f',fontWeight:800}},'Sin solución aún'),
          r.a_descuento&&h('span',{style:{marginLeft:10,color:r.descontado?'#2e7d4f':'#c0601a',fontWeight:800}},'Descuento: '+money(r._monto)+' ('+r._envios+' envíos)'+(r.semana_pago?' · sem. '+r.semana_pago:'')))),
      editando&&h('div',{style:Object.assign({},caja,{padding:10,marginBottom:14})},formRev(r)),
      verEnv==='cargando'||!verEnv?h('div',{style:{padding:30,textAlign:'center',color:'var(--text-soft)'}},'Cargando envío…'):
      verEnv._noExiste?h('div',{style:{padding:20,textAlign:'center',color:'var(--text-soft)'}},'Este código ya no existe en Envíos.'):
      (Card?h(Card,{key:verEnv.codigo,envio:verEnv}):h('div',null,'No disponible')));
  }
  var PER=[['hoy','Hoy'],['ayer','Ayer'],['semana','Esta semana'],['semana_ant','Semana pasada'],['mes','Este mes'],['dia','Día'],['rango','Rango']];
  var idsSel=Object.keys(sel).filter(function(k){return sel[k];}).map(Number);

  return h('div',{style:{display:'flex',flexDirection:'column',gap:16}},
    h('style',null,css),
    modalVer(),
    // Cabecera + período
    h('div',{style:Object.assign({},caja,{padding:'18px 20px'})},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:14,flexWrap:'wrap'}},
        h('div',null,
          h('div',{style:{fontFamily:'Bebas Neue',fontSize:30,letterSpacing:2.4,color:'#fff',lineHeight:1}},'Banco de incidencias'),
          h('div',{style:{fontSize:12.5,color:SUAVE,marginTop:4,maxWidth:640}},'Todas las incidencias con su solución. Las revisadas que van a descuento se aplican al pago semanal del mensajero.')),
        h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},btnOro('Descargar PDF',pdf,!lista.length),btnVid('Excel',excel,!lista.length),btnVid('Actualizar',function(){cargar();},cargando))),
      h('div',{style:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginTop:14}},
        h('div',{style:{display:'inline-flex',gap:4,padding:4,borderRadius:14,background:'rgba(0,0,0,.35)',border:'1px solid rgba(255,255,255,.08)',boxShadow:'inset 0 2px 6px rgba(0,0,0,.45)',flexWrap:'wrap'}},
          PER.map(function(p){var act=per===p[0];return h('button',{key:p[0],className:'bi-seg',onClick:function(){setPer(p[0]);},style:{padding:'9px 15px',borderRadius:11,border:'1px solid '+(act?'#f7dd8c':'transparent'),background:act?'linear-gradient(180deg,#f7dd8c,#d9b553 55%,#ae8829)':'transparent',color:act?'#1a1d13':'rgba(241,236,218,.82)',fontWeight:800,fontSize:13.5,cursor:'pointer',boxShadow:act?'0 3px 0 #6d531a,inset 0 1px 0 rgba(255,255,255,.55)':'none',whiteSpace:'nowrap'}},p[1]);})),
        per==='dia'&&h('input',{type:'date',className:'bi-in',value:dia,onChange:function(e){setDia(e.target.value);}}),
        per==='rango'&&h('div',{style:{display:'flex',alignItems:'center',gap:6}},h('input',{type:'date',className:'bi-in',value:rD,onChange:function(e){setRD(e.target.value);}}),h('span',{style:{color:SUAVE,fontSize:12,fontWeight:700}},'al'),h('input',{type:'date',className:'bi-in',value:rH,onChange:function(e){setRH(e.target.value);}})),
        h('div',{style:{marginLeft:'auto',fontSize:12.5,color:SUAVE,fontWeight:700}},desde===hasta?dmy(desde):dmy(desde)+' al '+dmy(hasta))),
      // KPIs
      h('div',{className:'bi-kpis',style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:14}},
        [['Incidencias',k.tot,(k.tot?Math.round(k.rev/k.tot*100):0)+'% revisadas',ORO],
         ['Sin revisar',k.tot-k.rev,'esperan solución','#e8b84a'],
         ['Por descontar',money(k.pdM),k.pdN+' incidencias · '+k.pdEnv+' envíos','#ff8a3d'],
         ['Descontado',money(k.ddM),k.ddN+' incidencias aplicadas','#36c47f']].map(function(x){
          return h('div',{key:x[0],style:Object.assign({},vidrio,{padding:'12px 14px'})},
            h('div',{style:{fontSize:10.5,letterSpacing:1.6,textTransform:'uppercase',color:SUAVE,fontWeight:800}},x[0]),
            h('div',{style:{fontFamily:'Bebas Neue',fontSize:32,lineHeight:1.05,color:x[3],textShadow:'0 0 14px '+x[3]+'55',marginTop:2}},x[1]),
            h('div',{style:{fontSize:11.5,color:SUAVE}},x[2]));}))),

    // Filtros
    h('div',{style:Object.assign({},caja,{padding:'14px 18px',display:'flex',flexDirection:'column',gap:10})},
      h('div',{style:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}},
        h('span',{style:{fontSize:11,letterSpacing:1.5,fontWeight:900,color:ORO,minWidth:80}},'MENSAJERO'),
        h('select',{className:'bi-in',value:fMen,onChange:function(e){setFMen(e.target.value);},style:{minWidth:240}},
          h('option',{value:''},'Todos ('+base.length+')'),mensOrd.map(function(m){return h('option',{key:m,value:m},m+' ('+porMen[m]+')');})),
        h('input',{className:'bi-in',placeholder:'Buscar código, cliente, comentario o solución',value:q,onChange:function(e){setQ(e.target.value);},style:{flex:'1 1 240px',minWidth:200}})),
      h('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}},
        h('span',{style:{fontSize:11,letterSpacing:1.5,fontWeight:900,color:ORO,minWidth:80}},'TIPO'),
        chip('Todos',Object.keys(porTipo).reduce(function(a,t){return a+porTipo[t];},0),!fTipo,ORO,function(){setFTipo('');}),
        tiposOrd.map(function(t){return h(React.Fragment,{key:t},chip(t,porTipo[t],fTipo===t,CG[infoFalta(t).grupo]||ORO,function(){setFTipo(fTipo===t?'':t);}));})),
      h('div',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}},
        h('span',{style:{fontSize:11,letterSpacing:1.5,fontWeight:900,color:ORO,minWidth:80}},'ESTADO'),
        chip('Todas',null,fEst==='todas',ORO,function(){setFEst('todas');}),
        ['sin_revisar','por_decidir','por_descontar','descontada','sin_descuento'].map(function(e){return h(React.Fragment,{key:e},chip(EST[e][0],porEst[e]||0,fEst===e,EST[e][1],function(){setFEst(fEst===e?'todas':e);}));}))),

    // Resumen por mensajero (por descontar)
    resMenOrd.length>0&&h('div',{style:Object.assign({},caja,{padding:'14px 18px'})},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:10}},
        h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:21,letterSpacing:1.8,color:'#fff'}},'Por descontar, por mensajero'),
          h('div',{style:{fontSize:12,color:SUAVE}},'Monto estimado con la tarifa del mensajero. Se aplica en la semana de pago de cada incidencia.')),
        btnOro('Descontar todo ('+k.pdN+')',function(){descontar(pd.map(function(r){return r.id;}));},busy)),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:10}},
        resMenOrd.map(function(m){var x=resMen[m];return h('div',{key:m,style:Object.assign({},vidrio,{padding:'12px 14px',borderLeft:'3px solid #ff8a3d'})},
          h('div',{style:{fontWeight:900,fontSize:13.5,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},m),
          h('div',{style:{display:'flex',alignItems:'baseline',gap:10,marginTop:4}},
            h('span',{style:{fontFamily:'Bebas Neue',fontSize:28,color:'#ff9d5c',lineHeight:1}},money(x.m)),
            h('span',{style:{fontSize:12,color:SUAVE}},x.n+' inc. · '+x.env+' envíos')),
          h('div',{style:{display:'flex',gap:6,marginTop:8}},
            btnVid('Ver',function(){setFMen(m);setFEst('por_descontar');},false,{padding:'6px 10px',fontSize:12}),
            btnOro('Descontar',function(){descontar(x.ids);},busy,{padding:'6px 12px',fontSize:12})));}))),

    // Tabla
    h('div',{style:Object.assign({},caja,{padding:0,overflow:'hidden'})},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,padding:'12px 18px',borderBottom:'1px solid rgba(255,255,255,.08)',flexWrap:'wrap'}},
        h('div',{style:{fontFamily:'Bebas Neue',fontSize:21,letterSpacing:1.8,color:'#fff'}},'Incidencias ',h('span',{style:{color:ORO}},'('+lista.length+')')),
        idsSel.length>0&&btnOro('Descontar seleccionadas ('+idsSel.length+')',function(){descontar(idsSel);},busy)),
      cargando?h('div',{style:{padding:30,textAlign:'center',color:SUAVE}},'Cargando…'):
      lista.length===0?h('div',{style:{padding:30,textAlign:'center',color:SUAVE}},'Sin incidencias con estos filtros.'):
      h('div',{style:{overflowX:'auto'}},
        h('table',{className:'bi-tab',style:{width:'100%',borderCollapse:'collapse',fontSize:12.5,color:TXT,minWidth:1320}},
          h('colgroup',null,[34,96,150,170,250,230,250,140,150].map(function(w,i){return h('col',{key:i,style:{width:w}});})),
          h('thead',null,h('tr',{style:{background:'rgba(0,0,0,.25)'}},['','Fecha','Código','Mensajero','Tipo','Comentario','Solución','Descuento','Estado'].map(function(c,i){return h('th',{key:i,style:{textAlign:'left',padding:'9px 10px',fontSize:10.5,letterSpacing:1.3,textTransform:'uppercase',color:ORO,fontWeight:900,whiteSpace:'nowrap'}},c);}))),
          h('tbody',null,lista.map(function(r){var col=CG[r._grupo]||ORO;var es=EST[r._est];var editando=rev&&rev.id===r.id;var puedeSel=r._est==='por_descontar';
            return h(React.Fragment,{key:r.id},
              h('tr',{className:'bi-row',style:{borderTop:'1px solid rgba(255,255,255,.06)',background:editando?'rgba(232,199,102,.08)':'transparent'}},
                h('td',{style:{padding:'9px 10px',width:24}},puedeSel&&h('input',{type:'checkbox',checked:!!sel[r.id],onChange:function(e){var v=e.target.checked;setSel(function(s){var n=Object.assign({},s);n[r.id]=v;return n;});}})),
                h('td',{style:{padding:'9px 10px',whiteSpace:'nowrap'}},h('div',{style:{fontWeight:800}},dmy(r.fecha)),h('div',{style:{fontSize:11,color:SUAVE}},fh(r.created_at).split(' ')[1]||'')),
                h('td',{style:{padding:'9px 10px',fontFamily:'JetBrains Mono',fontSize:12,whiteSpace:'nowrap'}},r.codigo,h('div',{style:{fontFamily:'DM Sans',fontSize:11,color:SUAVE}},[r.cliente,r.comuna].filter(Boolean).join(' · '))),
                h('td',{style:{padding:'9px 10px',fontWeight:800,whiteSpace:'nowrap'}},r._men,r.reportado_por&&h('div',{style:{fontSize:11,color:SUAVE,fontWeight:600}},'Reportó '+r.reportado_por)),
                h('td',{style:{padding:'9px 10px',maxWidth:260}},h('span',{style:{display:'inline-block',padding:'2px 8px',borderRadius:999,fontSize:10,fontWeight:900,letterSpacing:1,background:col+'30',color:col,border:'1px solid '+col+'80',marginBottom:3}},r._grupo.toUpperCase()),h('div',{style:{fontSize:12,lineHeight:1.3}},r.motivo)),
                h('td',{style:{padding:'9px 10px',maxWidth:220,color:'rgba(241,236,218,.85)'}},r.comentario||h('span',{style:{color:SUAVE}},'—')),
                h('td',{style:{padding:'9px 10px',maxWidth:260}},r.resuelto?h('div',null,h('div',{style:{lineHeight:1.3}},r.resolucion),h('div',{style:{fontSize:11,color:SUAVE,marginTop:2}},(r.resuelto_por||'')+(r.resuelto_at?' · '+fh(r.resuelto_at):''))):h('span',{style:{color:'#e8b84a',fontWeight:800}},'Sin solución aún')),
                h('td',{style:{padding:'9px 10px',whiteSpace:'nowrap'}},r.a_descuento?h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,color:r.descontado?'#36c47f':'#ff9d5c',lineHeight:1}},money(r._monto)),h('div',{style:{fontSize:11,color:SUAVE}},r._envios+' envíos'+(r.semana_pago?' · sem. '+r.semana_pago:''))):r.a_descuento===false?h('span',{style:{color:SUAVE}},'No aplica'):h('span',{style:{color:SUAVE}},'—')),
                h('td',{style:{padding:'9px 10px',whiteSpace:'nowrap'}},
                  h('div',{style:{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:999,background:es[1]+'26',border:'1px solid '+es[1]+'80',color:'#fff',fontSize:11.5,fontWeight:800}},h('span',{style:{width:7,height:7,borderRadius:'50%',background:es[1]}}),es[0]),
                  h('div',{style:{display:'flex',gap:6,marginTop:6}},
                    btnVid('Ver',function(){abrirVer(r);},false,{padding:'5px 10px',fontSize:11.5}),
                    !r.descontado&&btnVid(r.resuelto?'Editar':'Revisar',function(){setRev(editando?null:{id:r.id,texto:r.resolucion||'',desc:r.a_descuento!==false,envios:r._envios});},false,{padding:'5px 10px',fontSize:11.5}),
                    r._est==='por_descontar'&&btnOro('Descontar',function(){descontar([r.id]);},busy,{padding:'5px 10px',fontSize:11.5}),
                    r.descontado&&btnVid('Revertir',function(){revertir(r);},busy,{padding:'5px 10px',fontSize:11.5})))),
              editando&&h('tr',null,h('td',{colSpan:9,style:{padding:'4px 18px 14px',background:'rgba(232,199,102,.08)'}},
                formRev(r))));})))))
  );
}
window.BancoIncidencias=BancoIncidencias;
})();
