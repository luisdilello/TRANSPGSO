// Pago Semanal · pestañas Resumen, Retiros y Consumo del local (08-11-2026).
// Resumen = hoja "RESUMEN POR CLIENTE" del archivo de pago semanal de Luis: envíos, cobrado, pagado a
// mensajeros, ganancia bruta, costos fijos de retiro, ganancia neta y márgenes; detalle por cliente y por
// mensajero; volumen por día. Tarifas cobradas (netas) y costos fijos de retiro se editan aquí y se guardan
// en configuracion.resumen_semanal_cfg.
// Retiros = registro diario de retiros (tabla retiros). Se pagan en la Semana 01 de cada mes de pago: la
// tarjeta de cada mensajero de esa semana suma solo el total de sus retiros del mes calendario anterior.
// Consumo = consumo en el local (pastelitos, bebidas) por día; se descuenta en la tarjeta de la semana.
(function(){
if(window.__pagoSemanalExtra)return;
var R=React,h=R.createElement,A=window.__app||{},db=A.db;
var fechaHoyCL=A.fechaHoyCL||function(){return new Date().toLocaleDateString('en-CA',{timeZone:'America/Santiago'});};
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function sumar(f,n){var d=new Date(f+'T12:00:00');d.setDate(d.getDate()+n);return iso(d);}
function dm(f){return f?f.slice(8,10)+'-'+f.slice(5,7):'';}
function dmy(f){return f?f.split('-').reverse().join('-'):'';}
function norm(n){return String(n||'').replace(/,\s*/g,' ').replace(/\s+/g,' ').trim().toUpperCase();}
function fmt(n){return (n<0?'-':'')+'$'+Math.abs(Math.round(n||0)).toLocaleString('es-CL');}
function pct(x){return (isFinite(x)?(x*100):0).toFixed(1).replace('.',',')+'%';}
function tit(s){return String(s||'').toLowerCase().replace(/(^|\s)\S/g,function(m){return m.toUpperCase();});}
var DIAS=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
var quien=function(){return (A.perfil&&(A.perfil.nombre||A.perfil.usuario))||'Administrador';};

// ── estilos comunes ──
function Panel(p){return h('div',{style:Object.assign({position:'relative',borderRadius:20,padding:'18px 20px',marginBottom:18,background:'radial-gradient(130% 90% at 0% 0%,#ffffff,#fbf6ea 60%,#f2e8cf)',border:'1px solid rgba(200,168,75,.35)',borderTop:'1px solid #fff',boxShadow:'0 1px 0 #fff inset,0 26px 44px -26px rgba(43,46,32,.4),0 6px 14px rgba(43,46,32,.06)'},p.style||{})},
  p.titulo?h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:12}},
    h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:22,letterSpacing:2,color:'var(--dark)',lineHeight:1}},p.titulo),p.sub?h('div',{style:{fontSize:12,color:'var(--text-soft)',marginTop:3}},p.sub):null),p.acciones||null):null,
  p.children);}
function Kpi(p){return h('div',{style:{flex:'1 1 180px',padding:'14px 16px',borderRadius:16,background:'linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03))',border:'1px solid rgba(255,255,255,.1)'}},
  h('div',{style:{fontSize:10.5,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(233,228,210,.65)'}},p.l),
  h('div',{style:{fontFamily:'Bebas Neue',fontSize:32,lineHeight:1.05,color:p.c||'#fff',textShadow:'0 0 16px '+(p.c||'#fff')+'44'}},p.v),
  p.s?h('div',{style:{fontSize:11.5,color:'rgba(233,228,210,.7)'}},p.s):null);}
function Oscuro(p){return h('div',{style:{borderRadius:20,padding:'18px 20px',marginBottom:18,background:'radial-gradient(120% 120% at 20% 0%,#3b402c,#1a1d13)',border:'1px solid rgba(200,168,75,.38)',boxShadow:'0 22px 40px -22px rgba(20,22,15,.7)'}},p.children);}
var thS={textAlign:'right'},tdR={textAlign:'right',fontFamily:'JetBrains Mono',fontSize:12.5};

// ════════════════════════ RESUMEN ════════════════════════
function Resumen(props){
  var sem=props.sem,toast=props.toast||function(){};
  var _d=R.useState(null),d=_d[0],setD=_d[1];
  var _e=R.useState(false),edit=_e[0],setEdit=_e[1];
  var _c=R.useState(null),cfgEd=_c[0],setCfgEd=_c[1];
  var _g=R.useState(0),gen=_g[0],setGen=_g[1];
  R.useEffect(function(){var vivo=true;setD(null);
    Promise.all([
      db.rpc('entregados_semana_detalle',{p_desde:sem.desde,p_hasta:sem.hasta}),
      db.from('mensajeros').select('nombre,tarifa,extra_periferia,periferia_paga_a,extra_comuna,extra_comuna_tarifa,activo'),
      db.from('configuracion').select('valor').eq('clave','resumen_semanal_cfg').maybeSingle(),
      db.from('clientes').select('nombre,tarifa,paga_iva,activo')
    ]).then(function(r){if(!vivo)return;if(r[0].error){toast('Error: '+r[0].error.message);setD({error:true});return;}
      var cfgM={};(r[1].data||[]).forEach(function(m){var k=norm(m.nombre);if(cfgM[k]&&cfgM[k].activo!==false&&m.activo===false)return;cfgM[k]=m;});
      var cfg=(r[2].data&&r[2].data.valor)||{tarifasCliente:{},costosRetiro:[],semanasMes:52/12};
      var cli={};(r[3].data||[]).forEach(function(c){cli[norm(c.nombre)]=c;});
      setD({rows:r[0].data||[],cfgM:cfgM,cfg:cfg,cli:cli});
    });return function(){vivo=false;};},[sem.desde,gen]);
  if(!d)return h('div',{className:'info-banner'},'Calculando resumen...');
  if(d.error)return h('div',{className:'info-banner'},'No se pudo cargar.');
  var cfg=d.cfg,tarC=cfg.tarifasCliente||{};
  function tarifaCliente(c){if(tarC[c]!=null)return +tarC[c];var x=d.cli[c];if(!x)return 0;return x.paga_iva?(+x.tarifa||0)/1.19:(+x.tarifa||0);}
  var porCli={},porMen={},porDia={},comunas={},totE=0,totC=0,totP=0,secPer={n:0,p:0};
  d.rows.forEach(function(x){var n=+x.n||0;var m=d.cfgM[x.mensajero]||{};var pu=+m.tarifa||0;var pc=tarifaCliente(x.cliente);
    totE+=n;totC+=n*pc;totP+=n*pu;comunas[x.comuna]=1;
    var c=porCli[x.cliente]||(porCli[x.cliente]={n:0,c:0,p:0,tar:pc});c.n+=n;c.c+=n*pc;c.p+=n*pu;
    var mm=porMen[x.mensajero]||(porMen[x.mensajero]={n:0,p:0,tar:pu,dias:{}});mm.n+=n;mm.p+=n*pu;mm.dias[x.dia]=1;
    var dd=porDia[x.dia]||(porDia[x.dia]={n:0,c:0,p:0});dd.n+=n;dd.c+=n*pc;dd.p+=n*pu;
    if(/PERIFERIA/.test(x.comuna)){secPer.n+=n;secPer.p+=n*(+m.extra_periferia||0);}});
  var bruta=totC-totP;var sm=+cfg.semanasMes||52/12;
  var costos=(cfg.costosRetiro||[]).map(function(g){var envG=(g.clientes||[]).reduce(function(a,c){return a+((porCli[norm(c)]||{}).n||0);},0);return Object.assign({},g,{semanal:(+g.mensual||0)/sm,envios:envG});});
  var costoSem=costos.reduce(function(a,g){return a+g.semanal;},0);var neta=bruta-costoSem;
  var clientes=Object.keys(porCli).map(function(k){var c=porCli[k];return Object.assign({k:k,g:c.c-c.p},c);}).sort(function(a,b){return b.n-a.n;});
  var rankG=clientes.slice().sort(function(a,b){return b.g-a.g;}).map(function(c){return c.k;});
  var mens=Object.keys(porMen).map(function(k){var m=porMen[k];return Object.assign({k:k,dt:Object.keys(m.dias).length},m);}).sort(function(a,b){return b.p-a.p;});
  var dias=[];for(var i=0;i<7;i++)dias.push(sumar(sem.desde,i));var maxD=Math.max.apply(null,dias.map(function(x){return (porDia[x]||{}).n||0;}).concat([1]));
  var diasOp=dias.filter(function(x){return porDia[x];}).length;
  // asignación de costo de retiro por cliente
  var asign=[];costos.forEach(function(g){(g.clientes||[]).forEach(function(c){var k=norm(c);var pc=porCli[k]||{n:0,c:0,p:0};var parte=g.envios?pc.n/g.envios:0;var ca=parte*g.semanal;asign.push({c:k,g:g.grupo,n:pc.n,parte:parte,costo:ca,gb:(pc.c||0)-(pc.p||0),gn:(pc.c||0)-(pc.p||0)-ca});});});

  function guardarCfg(){db.from('configuracion').upsert({clave:'resumen_semanal_cfg',valor:cfgEd},{onConflict:'clave'}).then(function(r){if(r.error){toast('Error: '+r.error.message);return;}toast('Configuración guardada');setEdit(false);setGen(function(g){return g+1;});});}
  function exportar(){A.exportToExcel('Resumen_semanal_'+sem.desde+'_al_'+sem.hasta,[
    {name:'Resumen',headers:['Indicador','Valor'],rows:[['Envíos totales',totE],['Ingreso cobrado (neto)',Math.round(totC)],['Pagado a mensajeros',Math.round(totP)],['Ganancia bruta',Math.round(bruta)],['Costos fijos de retiro (semana)',Math.round(costoSem)],['Ganancia neta final',Math.round(neta)],['Margen neto',totC?neta/totC:0],['Margen bruto',totC?bruta/totC:0],['Días operados',diasOp],['Comunas atendidas',Object.keys(comunas).length]]},
    {name:'Por cliente',headers:['Cliente','Envíos','Tarifa cobrada','Cobrado','Pagado a mensajeros','Ganancia','Margen','Ganancia por envío'],rows:clientes.map(function(c){return[c.k,c.n,Math.round(c.tar*100)/100,Math.round(c.c),Math.round(c.p),Math.round(c.g),c.c?c.g/c.c:0,c.n?Math.round(c.g/c.n):0];})},
    {name:'Por mensajero',headers:['Mensajero','Envíos','Tarifa','Producción','% del total','Días trabajados','Envíos por día'],rows:mens.map(function(m){return[m.k,m.n,m.tar,Math.round(m.p),totP?m.p/totP:0,m.dt,m.dt?Math.round(m.n/m.dt):0];})},
    {name:'Por día',headers:['Fecha','Envíos','Cobrado','Pagado','Ganancia'],rows:dias.map(function(x){var v=porDia[x]||{n:0,c:0,p:0};return[dmy(x),v.n,Math.round(v.c),Math.round(v.p),Math.round(v.c-v.p)];})}]);}

  var tabla=function(cols,filas,tot){return h('div',{className:'table-wrap',style:{maxHeight:460,overflow:'auto'}},h('table',null,
    h('thead',null,h('tr',null,cols.map(function(c,i){return h('th',{key:i,style:i?thS:null},c);}))),
    h('tbody',null,filas,tot||null)));};
  var neg={color:'#b03030'};
  return h('div',null,
    h(Oscuro,null,
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:14}},
        h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:2.2,color:'#fff',lineHeight:1}},'Resumen semanal de operación'),
          h('div',{style:{fontSize:13,color:'rgba(233,228,210,.75)',marginTop:4}},'Del '+dmy(sem.desde)+' al '+dmy(sem.hasta)+' · '+totE.toLocaleString('es-CL')+' envíos entregados')),
        h('div',{style:{display:'flex',gap:8}},
          h('button',{type:'button',className:'btn-futurista btn-f-ghost',onClick:function(){setCfgEd(JSON.parse(JSON.stringify(cfg)));setEdit(!edit);},style:{padding:'8px 14px'}},edit?'Cerrar tarifas':'Tarifas y costos'),
          h('button',{type:'button',className:'btn-futurista btn-f-gold',onClick:exportar,style:{padding:'8px 14px'}},'Exportar Excel'))),
      h('div',{style:{display:'flex',gap:10,flexWrap:'wrap',marginBottom:10}},
        h(Kpi,{l:'Envíos totales',v:totE.toLocaleString('es-CL'),c:'#9fd3ea',s:diasOp+' días operados · '+Math.round(totE/(diasOp||1))+' por día'}),
        h(Kpi,{l:'Ingreso cobrado',v:fmt(totC),c:'#ffe59a',s:'neto · ticket promedio '+fmt(totE?totC/totE:0)}),
        h(Kpi,{l:'Pagado a mensajeros',v:fmt(totP),c:'#ff8f86',s:'entregas × tarifa'}),
        h(Kpi,{l:'Ganancia bruta',v:fmt(bruta),c:'#7ee0ad',s:'margen bruto '+pct(totC?bruta/totC:0)})),
      h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
        h(Kpi,{l:'Costos fijos de retiro',v:'-'+fmt(costoSem),c:'#ffb27a',s:'semana ('+fmt(costos.reduce(function(a,g){return a+(+g.mensual||0);},0))+' al mes)'}),
        h(Kpi,{l:'Ganancia neta final',v:fmt(neta),c:'#36c47f',s:'bruta − costos fijos'}),
        h(Kpi,{l:'Margen neto',v:pct(totC?neta/totC:0),c:'#7ee0ad'}),
        h(Kpi,{l:'Clientes / mensajeros',v:clientes.length+' / '+mens.length,c:'#c9b7ff',s:Object.keys(comunas).length+' comunas atendidas'}))),
    edit&&cfgEd?h(Panel,{titulo:'Tarifas cobradas y costos fijos de retiro',sub:'Tarifa neta por envío que usa este resumen (si un cliente no está aquí, se usa la de su ficha sin IVA). Los costos fijos son mensuales y se reparten por semana ('+(Math.round((+cfgEd.semanasMes||0)*100)/100)+' semanas por mes).',acciones:h('button',{type:'button',className:'btn-futurista btn-f-success',onClick:guardarCfg,style:{padding:'8px 16px'}},'Guardar')},
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:8,marginBottom:16}},
        clientes.map(function(c){return c.k;}).concat(Object.keys(cfgEd.tarifasCliente||{}).filter(function(k){return !porCli[k];})).map(function(k){return h('label',{key:k,style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,fontSize:12.5,padding:'6px 10px',borderRadius:10,background:'#fff',border:'1px solid rgba(200,168,75,.25)'}},
          h('span',{style:{fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},k),
          h('input',{type:'number',step:'0.01',value:(cfgEd.tarifasCliente||{})[k]!=null?cfgEd.tarifasCliente[k]:'',placeholder:String(Math.round(tarifaCliente(k)*100)/100),onChange:function(e){var n=Object.assign({},cfgEd);n.tarifasCliente=Object.assign({},n.tarifasCliente);if(e.target.value==='')delete n.tarifasCliente[k];else n.tarifasCliente[k]=+e.target.value;setCfgEd(n);},style:{width:90,padding:'4px 6px',borderRadius:6,border:'1px solid var(--border)',fontFamily:'JetBrains Mono',fontSize:12,textAlign:'right'}}));})),
      h('div',{style:{fontWeight:800,fontSize:13,marginBottom:6}},'Costos fijos de retiro de carga'),
      (cfgEd.costosRetiro||[]).map(function(g,gi){var upd=function(campo,val){var n=Object.assign({},cfgEd);n.costosRetiro=n.costosRetiro.slice();n.costosRetiro[gi]=Object.assign({},g,{[campo]:val});setCfgEd(n);};
        return h('div',{key:gi,style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:6}},
          h('input',{className:'form-input',value:g.grupo,onChange:function(e){upd('grupo',e.target.value);},style:{margin:0,width:210}}),
          h('input',{className:'form-input',value:(g.clientes||[]).join(', '),onChange:function(e){upd('clientes',e.target.value.split(',').map(function(x){return x.trim().toUpperCase();}).filter(Boolean));},placeholder:'Clientes separados por coma',style:{margin:0,flex:'1 1 260px'}}),
          h('input',{className:'form-input',type:'number',value:g.mensual,onChange:function(e){upd('mensual',+e.target.value||0);},style:{margin:0,width:130,fontFamily:'JetBrains Mono'}}),
          h('span',{onClick:function(){var n=Object.assign({},cfgEd);n.costosRetiro=n.costosRetiro.filter(function(_,j){return j!==gi;});setCfgEd(n);},style:{cursor:'pointer',color:'#b03030',fontWeight:900}},'×'));}),
      h('button',{type:'button',className:'btn-futurista btn-f-ghost',onClick:function(){var n=Object.assign({},cfgEd);n.costosRetiro=(n.costosRetiro||[]).concat([{grupo:'NUEVO GRUPO',clientes:[],mensual:0}]);setCfgEd(n);},style:{padding:'6px 12px',marginTop:4}},'+ Agregar grupo')):null,
    // volumen por día
    h(Panel,{titulo:'Volumen por día',sub:'Envíos entregados, cobrado y pagado cada día de la semana'},
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:10,alignItems:'end',height:230,padding:'10px 4px 0'}},
        dias.map(function(x,i){var v=porDia[x]||{n:0,c:0,p:0};var H=Math.round(v.n/maxD*150);
          return h('div',{key:x,title:dmy(x)+': '+v.n+' envíos · cobrado '+fmt(v.c)+' · pagado '+fmt(v.p),style:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%'}},
            h('div',{style:{fontFamily:'Bebas Neue',fontSize:20,color:'var(--dark)'}},v.n||'—'),
            h('div',{className:'dx-rise',style:{position:'relative',width:'60%',maxWidth:70,height:Math.max(4,H),marginTop:4,borderRadius:'10px 10px 4px 4px',background:'linear-gradient(180deg,#f0d27a,#c8a84b 55%,#9c7a2b)',boxShadow:'0 10px 18px -8px rgba(168,132,46,.7), inset 0 2px 0 rgba(255,255,255,.5)',animationDelay:(i*0.05)+'s'}},
              v.n?h('div',{style:{position:'absolute',left:0,right:0,bottom:0,height:Math.round((v.c?((v.c-v.p)/v.c):0)*100)+'%',borderRadius:'0 0 4px 4px',background:'linear-gradient(180deg,rgba(54,196,127,.85),rgba(31,94,58,.9))'},title:'Ganancia '+fmt(v.c-v.p)}):null),
            h('div',{style:{fontSize:12,fontWeight:800,marginTop:6}},DIAS[i]+' '+dm(x)),
            h('div',{style:{fontSize:11,color:'#2e7d4f',fontFamily:'JetBrains Mono'}},v.n?fmt(v.c-v.p):''));})),
      h('div',{style:{fontSize:11.5,color:'var(--text-soft)',marginTop:8}},'La parte verde de cada columna es la proporción de ganancia sobre lo cobrado ese día.')),
    // por cliente
    h(Panel,{titulo:'Detalle por cliente',sub:'Tarifa cobrada neta × envíos entregados; pagado = lo que cuestan esos envíos en tarifas de mensajeros'},
      tabla(['Cliente','Envíos','Tarifa','Cobrado','Pagado','Ganancia','Margen','Gan./envío','Ranking'],
        clientes.map(function(c){return h('tr',{key:c.k},h('td',{style:{fontWeight:700}},c.k),h('td',{style:tdR},c.n.toLocaleString('es-CL')),h('td',{style:tdR},fmt(c.tar)),h('td',{style:tdR},fmt(c.c)),h('td',{style:tdR},fmt(c.p)),h('td',{style:Object.assign({},tdR,c.g<0?neg:{color:'#2e7d4f',fontWeight:700})},fmt(c.g)),h('td',{style:tdR},pct(c.c?c.g/c.c:0)),h('td',{style:tdR},fmt(c.n?c.g/c.n:0)),h('td',{style:tdR},rankG.indexOf(c.k)+1));}),
        h('tr',{style:{background:'var(--dark)'}},h('td',{style:{color:'#ffe59a',fontWeight:800}},'TOTAL'),h('td',{style:Object.assign({},tdR,{color:'#fff'})},totE.toLocaleString('es-CL')),h('td',null),h('td',{style:Object.assign({},tdR,{color:'#fff'})},fmt(totC)),h('td',{style:Object.assign({},tdR,{color:'#fff'})},fmt(totP)),h('td',{style:Object.assign({},tdR,{color:'#7ee0ad',fontWeight:800})},fmt(bruta)),h('td',{style:Object.assign({},tdR,{color:'#fff'})},pct(totC?bruta/totC:0)),h('td',{style:Object.assign({},tdR,{color:'#fff'})},fmt(totE?bruta/totE:0)),h('td',null)))),
    // costos de retiro asignados
    asign.length?h(Panel,{titulo:'Costos fijos de retiro por cliente',sub:'Costo semanal de cada grupo repartido según los envíos de cada cliente dentro del grupo'},
      tabla(['Cliente','Grupo','Envíos','% del grupo','Costo asignado','Ganancia bruta','Ganancia neta','Margen neto'],
        asign.map(function(a){var pc=porCli[a.c]||{c:0};return h('tr',{key:a.c+a.g},h('td',{style:{fontWeight:700}},a.c),h('td',null,a.g),h('td',{style:tdR},a.n),h('td',{style:tdR},pct(a.parte)),h('td',{style:Object.assign({},tdR,neg)},'-'+fmt(a.costo)),h('td',{style:tdR},fmt(a.gb)),h('td',{style:Object.assign({},tdR,{fontWeight:700,color:a.gn<0?'#b03030':'#2e7d4f'})},fmt(a.gn)),h('td',{style:tdR},pct(pc.c?a.gn/pc.c:0)));}))):null,
    // por mensajero
    h(Panel,{titulo:'Detalle por mensajero',sub:'Producción = entregas × tarifa (sin extras ni descuentos, que están en las tarjetas de pago)'},
      tabla(['#','Mensajero','Envíos','Tarifa','Producción','% del total','Días','Envíos/día'],
        mens.map(function(m,i){return h('tr',{key:m.k},h('td',{style:tdR},i+1),h('td',{style:{fontWeight:700}},m.k||'(sin mensajero)'),h('td',{style:tdR},m.n),h('td',{style:tdR},fmt(m.tar)),h('td',{style:Object.assign({},tdR,{fontWeight:700})},fmt(m.p)),
          h('td',{style:Object.assign({},tdR,{minWidth:130})},h('div',{style:{display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}},h('div',{className:'tubo',style:{width:70,height:8}},h('div',{className:'tubo-fill',style:{width:(totP?m.p/totP*100*4:0)+'%',maxWidth:'100%',background:'linear-gradient(180deg,#f0d27a,#c8a84b 60%,#a8842e)'}})),pct(totP?m.p/totP:0))),
          h('td',{style:tdR},m.dt),h('td',{style:tdR},m.dt?Math.round(m.n/m.dt):0));}))),
    secPer.n?h(Panel,{titulo:'Secciones especiales'},
      h('div',{style:{display:'flex',gap:12,flexWrap:'wrap'}},
        h('div',{style:{padding:'10px 14px',borderRadius:12,background:'#fff',border:'1px solid rgba(200,168,75,.3)'}},h('div',{style:{fontSize:11,fontWeight:800,letterSpacing:1.2,color:'var(--text-soft)'}},'PERIFERIA'),h('div',{style:{fontFamily:'Bebas Neue',fontSize:24}},secPer.n+' envíos'),h('div',{style:{fontSize:12}},'Extra pagado: ',h('b',null,fmt(secPer.p)))))):null);
}

// ════════════════════════ RETIROS ════════════════════════
function Retiros(props){
  var sem=props.sem,toast=props.toast||function(){};var hoy=fechaHoyCL();
  // mes calendario: por defecto el del día de hoy
  var _m=R.useState(hoy.slice(0,7)),mes=_m[0],setMes=_m[1];
  var _d=R.useState(null),d=_d[0],setD=_d[1];
  var _g=R.useState(0),gen=_g[0],setGen=_g[1];
  var _f=R.useState({fecha:hoy,mensajero:'',cliente:'',piezas:'',pago:'',cobro:'',direccion:''}),f=_f[0],setF=_f[1];
  var desde=mes+'-01',hastaD=new Date(+mes.slice(0,4),+mes.slice(5,7),0),hasta=iso(hastaD);
  R.useEffect(function(){var vivo=true;setD(null);
    Promise.all([
      db.from('retiros').select('*').gte('fecha',desde).lte('fecha',hasta).neq('mensajero','').order('fecha',{ascending:false}).order('created_at',{ascending:false}),
      db.from('mensajeros').select('nombre,tarifa_retiro,activo').eq('activo',true).order('nombre'),
      db.from('clientes').select('nombre,activo').order('nombre'),
      db.from('configuracion').select('valor').eq('clave','retiro_cobro_minimo').maybeSingle()
    ]).then(function(r){if(!vivo)return;if(r[0].error){toast('Error: '+r[0].error.message);setD({error:true});return;}
      setD({rows:r[0].data||[],mens:r[1].data||[],clis:(r[2].data||[]).filter(function(c){return c.activo!==false;}),regla:(r[3].data&&r[3].data.valor)||{min_piezas:5,tarifa_minima:1190}});});
    return function(){vivo=false;};},[mes,gen]);
  if(!d)return h('div',{className:'info-banner'},'Cargando retiros...');
  if(d.error)return h('div',{className:'info-banner'},'No se pudo cargar.');
  var tarifaRet=function(n){var m=d.mens.find(function(x){return norm(x.nombre)===norm(n);});return m?(+m.tarifa_retiro||0):0;};
  function agregar(){
    if(!f.mensajero||!f.cliente){toast('Elige mensajero y cliente');return;}
    var piezas=+f.piezas||0;var pago=f.pago===''?tarifaRet(f.mensajero):(+f.pago||0);
    var cobro=f.cobro===''?(piezas>0&&piezas<(+d.regla.min_piezas||5)?(+d.regla.tarifa_minima||0):0):(+f.cobro||0);
    db.from('retiros').insert({fecha:f.fecha,cliente:f.cliente,mensajero:norm(f.mensajero),piezas:piezas,pago_mensajero:pago,cobro:cobro,direccion:f.direccion||'',retirado:true,confirmado:true,en_bodega:false,respaldos:false}).then(function(r){
      if(r.error){toast('No se guardó: '+r.error.message);return;}toast('Retiro registrado');setF(Object.assign({},f,{cliente:'',piezas:'',pago:'',cobro:'',direccion:''}));setGen(function(g){return g+1;});});
  }
  function borrar(x){if(!window.confirm('¿Eliminar el retiro de '+x.cliente+' ('+tit(x.mensajero)+', '+dmy(x.fecha)+')?'))return;
    db.from('retiros').delete().eq('id',x.id).then(function(r){if(r.error){toast('No se eliminó: '+r.error.message);return;}setGen(function(g){return g+1;});});}
  function editarPago(x,v){db.from('retiros').update({pago_mensajero:+v||0}).eq('id',x.id).then(function(r){if(r.error)toast('Error: '+r.error.message);else setGen(function(g){return g+1;});});}
  var porMen={},porCli={},porDia={};d.rows.forEach(function(x){var m=norm(x.mensajero);var pm=porMen[m]||(porMen[m]={n:0,p:0});pm.n++;pm.p+=+x.pago_mensajero||0;
    var pc=porCli[x.cliente]||(porCli[x.cliente]={n:0,pz:0,c:0});pc.n++;pc.pz+=+x.piezas||0;pc.c+=+x.cobro||0;(porDia[x.fecha]=porDia[x.fecha]||[]).push(x);});
  var totP=Object.keys(porMen).reduce(function(a,k){return a+porMen[k].p;},0),totC=Object.keys(porCli).reduce(function(a,k){return a+porCli[k].c;},0);
  var mesNom=new Date(desde+'T12:00:00').toLocaleDateString('es-CL',{month:'long',year:'numeric'});
  var sig=new Date(hastaD);sig.setDate(sig.getDate()+1);
  var mesSig=new Date(iso(sig)+'T12:00:00').toLocaleDateString('es-CL',{month:'long'});
  var cambiarMes=function(n){var x=new Date(desde+'T12:00:00');x.setMonth(x.getMonth()+n);setMes(iso(x).slice(0,7));};
  var inp={margin:0};
  return h('div',null,
    h(Oscuro,null,
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:14}},
        h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:2.2,color:'#fff',lineHeight:1}},'Retiros de '+mesNom),
          h('div',{style:{fontSize:13,color:'rgba(233,228,210,.75)',marginTop:4}},'Se anotan día a día y se pagan en la Semana 01 del mes de pago de '+mesSig+'.')),
        h('div',{style:{display:'flex',gap:8,alignItems:'center'}},
          h('button',{type:'button',className:'btn-futurista btn-f-ghost',onClick:function(){cambiarMes(-1);},style:{padding:'8px 14px'}},'Mes anterior'),
          h('input',{type:'month',className:'form-input',value:mes,onChange:function(e){if(e.target.value)setMes(e.target.value);},style:{margin:0,width:160}}),
          h('button',{type:'button',className:'btn-futurista btn-f-ghost',onClick:function(){cambiarMes(1);},style:{padding:'8px 14px'}},'Mes siguiente'),
          h('button',{type:'button',className:'btn-futurista btn-f-gold',onClick:function(){A.exportToExcel('Retiros_'+mes,[{name:'Retiros',headers:['Fecha','Cliente','Mensajero','Piezas','Pago mensajero','Cobro cliente','Dirección'],rows:d.rows.map(function(x){return[dmy(x.fecha),x.cliente,x.mensajero,x.piezas,+x.pago_mensajero||0,+x.cobro||0,x.direccion||''];})},{name:'Por mensajero',headers:['Mensajero','Retiros','Total a pagar'],rows:Object.keys(porMen).sort().map(function(k){return[k,porMen[k].n,porMen[k].p];})},{name:'Por cliente',headers:['Cliente','Retiros','Piezas','Cobro'],rows:Object.keys(porCli).sort().map(function(k){return[k,porCli[k].n,porCli[k].pz,porCli[k].c];})}]);},style:{padding:'8px 14px'}},'Exportar Excel'))),
      h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
        h(Kpi,{l:'Retiros del mes',v:d.rows.length,c:'#9fd3ea',s:Object.keys(porMen).length+' mensajeros'}),
        h(Kpi,{l:'A pagar a mensajeros',v:fmt(totP),c:'#ffe59a',s:'en la Semana 01 de '+mesSig}),
        h(Kpi,{l:'A cobrar a clientes',v:fmt(totC),c:'#7ee0ad',s:'retiros con menos de '+(d.regla.min_piezas||5)+' piezas'}))),
    h(Panel,{titulo:'Registrar retiro',sub:'El pago se completa con la tarifa de retiro del mensajero y el cobro con la regla de menos de '+(d.regla.min_piezas||5)+' piezas; puedes cambiar ambos.'},
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},
        h('input',{type:'date',className:'form-input',value:f.fecha,onChange:function(e){setF(Object.assign({},f,{fecha:e.target.value}));},style:Object.assign({},inp,{width:150})}),
        h('select',{className:'form-input',value:f.mensajero,onChange:function(e){setF(Object.assign({},f,{mensajero:e.target.value}));},style:Object.assign({},inp,{width:210})},h('option',{value:''},'Mensajero'),d.mens.map(function(m){return h('option',{key:m.nombre,value:m.nombre},m.nombre);})),
        h('input',{className:'form-input',list:'ps-clientes',placeholder:'Cliente',value:f.cliente,onChange:function(e){setF(Object.assign({},f,{cliente:e.target.value.toUpperCase()}));},style:Object.assign({},inp,{width:200})}),
        h('datalist',{id:'ps-clientes'},d.clis.map(function(c){return h('option',{key:c.nombre,value:c.nombre});})),
        h('input',{className:'form-input',type:'number',placeholder:'Piezas',value:f.piezas,onChange:function(e){setF(Object.assign({},f,{piezas:e.target.value}));},style:Object.assign({},inp,{width:90})}),
        h('input',{className:'form-input',type:'number',placeholder:'Pago '+(f.mensajero?fmt(tarifaRet(f.mensajero)):''),value:f.pago,onChange:function(e){setF(Object.assign({},f,{pago:e.target.value}));},style:Object.assign({},inp,{width:120})}),
        h('input',{className:'form-input',type:'number',placeholder:'Cobro',value:f.cobro,onChange:function(e){setF(Object.assign({},f,{cobro:e.target.value}));},style:Object.assign({},inp,{width:110})}),
        h('input',{className:'form-input',placeholder:'Dirección / nota',value:f.direccion,onChange:function(e){setF(Object.assign({},f,{direccion:e.target.value}));},style:Object.assign({},inp,{flex:'1 1 160px'})}),
        h('button',{type:'button',className:'btn-futurista btn-f-success',onClick:agregar,style:{padding:'9px 16px'}},'Agregar'))),
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,420px),1fr))',gap:18}},
      h(Panel,{titulo:'Por mensajero',sub:'Total que se le suma en su tarjeta de la Semana 01 de '+mesSig},
        Object.keys(porMen).length?h('div',{className:'table-wrap'},h('table',null,h('thead',null,h('tr',null,h('th',null,'Mensajero'),h('th',{style:thS},'Retiros'),h('th',{style:thS},'A pagar'))),
          h('tbody',null,Object.keys(porMen).sort(function(a,b){return porMen[b].p-porMen[a].p;}).map(function(k){return h('tr',{key:k},h('td',{style:{fontWeight:700}},k),h('td',{style:tdR},porMen[k].n),h('td',{style:Object.assign({},tdR,{fontWeight:700})},fmt(porMen[k].p)));}),
            h('tr',{style:{background:'var(--dark)'}},h('td',{style:{color:'#ffe59a',fontWeight:800}},'TOTAL'),h('td',{style:Object.assign({},tdR,{color:'#fff'})},d.rows.length),h('td',{style:Object.assign({},tdR,{color:'#7ee0ad',fontWeight:800})},fmt(totP)))))):h('div',{style:{fontSize:13,color:'var(--text-soft)'}},'Sin retiros registrados este mes.')),
      h(Panel,{titulo:'Por cliente',sub:'Cobro de retiros del mes'},
        Object.keys(porCli).length?h('div',{className:'table-wrap'},h('table',null,h('thead',null,h('tr',null,h('th',null,'Cliente'),h('th',{style:thS},'Retiros'),h('th',{style:thS},'Piezas'),h('th',{style:thS},'Cobro'))),
          h('tbody',null,Object.keys(porCli).sort(function(a,b){return porCli[b].n-porCli[a].n;}).map(function(k){return h('tr',{key:k},h('td',{style:{fontWeight:700}},k),h('td',{style:tdR},porCli[k].n),h('td',{style:tdR},porCli[k].pz),h('td',{style:tdR},fmt(porCli[k].c)));})))):h('div',{style:{fontSize:13,color:'var(--text-soft)'}},'Sin retiros.'))),
    h(Panel,{titulo:'Registro diario'},
      Object.keys(porDia).length?Object.keys(porDia).sort().reverse().map(function(dia){var xs=porDia[dia];return h('div',{key:dia,style:{marginBottom:14}},
        h('div',{style:{fontWeight:800,fontSize:13.5,marginBottom:6}},tit(new Date(dia+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'2-digit',month:'2-digit'}))+' · '+xs.length+' retiros'),
        h('div',{className:'table-wrap'},h('table',null,h('thead',null,h('tr',null,h('th',null,'Cliente'),h('th',null,'Mensajero'),h('th',{style:thS},'Piezas'),h('th',{style:thS},'Pago'),h('th',{style:thS},'Cobro'),h('th',null,'Nota'),h('th',null,''))),
          h('tbody',null,xs.map(function(x){return h('tr',{key:x.id},h('td',{style:{fontWeight:700}},x.cliente),h('td',null,x.mensajero),h('td',{style:tdR},x.piezas),
            h('td',{style:tdR},h('input',{type:'number',defaultValue:+x.pago_mensajero||0,onBlur:function(e){if(+e.target.value!==(+x.pago_mensajero||0))editarPago(x,e.target.value);},style:{width:90,padding:'3px 6px',borderRadius:6,border:'1px solid var(--border)',fontFamily:'JetBrains Mono',fontSize:12,textAlign:'right'}})),
            h('td',{style:tdR},fmt(x.cobro)),h('td',{style:{fontSize:12,color:'var(--text-soft)'}},x.direccion||''),h('td',null,h('span',{onClick:function(){borrar(x);},style:{cursor:'pointer',color:'#b03030',fontWeight:900}},'×')));})))));}):h('div',{style:{fontSize:13,color:'var(--text-soft)'}},'Sin retiros registrados este mes.')));
}

// ════════════════════════ CONSUMO DEL LOCAL ════════════════════════
function Consumo(props){
  var sem=props.sem,toast=props.toast||function(){};var hoy=fechaHoyCL();
  var _d=R.useState(null),d=_d[0],setD=_d[1];
  var _g=R.useState(0),gen=_g[0],setGen=_g[1];
  var _f=R.useState({fecha:(hoy>=sem.desde&&hoy<=sem.hasta)?hoy:sem.desde,mensajero:'',cantidad:1}),f=_f[0],setF=_f[1];
  R.useEffect(function(){setF(function(p){return Object.assign({},p,{fecha:(hoy>=sem.desde&&hoy<=sem.hasta)?hoy:sem.desde});});},[sem.desde]);
  R.useEffect(function(){var vivo=true;setD(null);
    Promise.all([
      db.from('consumos_mensajeros').select('*').gte('fecha',sem.desde).lte('fecha',sem.hasta).order('created_at',{ascending:false}),
      db.from('mensajeros').select('nombre,activo').eq('activo',true).order('nombre'),
      db.from('configuracion').select('valor').eq('clave','productos_venta').maybeSingle()
    ]).then(function(r){if(!vivo)return;if(r[0].error){toast('Error: '+r[0].error.message);setD({error:true});return;}
      setD({rows:r[0].data||[],mens:(r[1].data||[]).map(function(m){return m.nombre;}),prods:((r[2].data&&r[2].data.valor)||[]).filter(function(p){return p.activo!==false;})});});
    return function(){vivo=false;};},[sem.desde,gen]);
  if(!d)return h('div',{className:'info-banner'},'Cargando consumo...');
  if(d.error)return h('div',{className:'info-banner'},'No se pudo cargar.');
  function agregar(p){
    if(!f.mensajero){toast('Elige quién consume');return;}
    var cant=Math.max(1,+f.cantidad||1);
    db.from('consumos_mensajeros').insert({semana:dmy(sem.desde)+' al '+dmy(sem.hasta),fecha:f.fecha,mensajero_nombre:norm(f.mensajero),producto:p.nombre,cantidad:cant,precio_unitario:+p.precio||0,monto:cant*(+p.precio||0)}).then(function(r){
      if(r.error){toast('No se guardó: '+r.error.message);return;}toast(cant+' × '+tit(p.nombre)+' a '+tit(f.mensajero));setF(Object.assign({},f,{cantidad:1}));setGen(function(g){return g+1;});});
  }
  function borrar(x){if(!window.confirm('¿Eliminar '+x.cantidad+' × '+x.producto+' de '+tit(x.mensajero_nombre)+'?'))return;
    db.from('consumos_mensajeros').delete().eq('id',x.id).then(function(r){if(r.error){toast('No se eliminó: '+r.error.message);return;}setGen(function(g){return g+1;});});}
  var dias=[];for(var i=0;i<7;i++)dias.push(sumar(sem.desde,i));
  var esPast=function(p){return /PASTEL/i.test(p||'');};
  var grid={};d.rows.forEach(function(x){var m=norm(x.mensajero_nombre);var g=grid[m]||(grid[m]={past:{},beb:{},tp:0,tb:0});var k=esPast(x.producto)?'past':'beb';g[k][x.fecha]=(g[k][x.fecha]||0)+(+x.monto||0);if(k==='past')g.tp+=+x.monto||0;else g.tb+=+x.monto||0;});
  var personas=Object.keys(grid).sort();var total=personas.reduce(function(a,k){return a+grid[k].tp+grid[k].tb;},0);
  var totP=personas.reduce(function(a,k){return a+grid[k].tp;},0);
  var delDia=d.rows.filter(function(x){return x.fecha===f.fecha;});
  var opts=d.mens.slice();['LUIS DI LELLO','FERNANDO ZUÑIGA'].forEach(function(n){if(opts.indexOf(n)<0)opts.push(n);});
  var cel={textAlign:'right',fontFamily:'JetBrains Mono',fontSize:12,padding:'8px 8px'};
  return h('div',null,
    h(Oscuro,null,
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:14}},
        h('div',null,h('div',{style:{fontFamily:'Bebas Neue',fontSize:28,letterSpacing:2.2,color:'#fff',lineHeight:1}},'Consumo en el local'),
          h('div',{style:{fontSize:13,color:'rgba(233,228,210,.75)',marginTop:4}},'Semana del '+dmy(sem.desde)+' al '+dmy(sem.hasta)+' · se descuenta en la tarjeta de pago de cada mensajero')),
        h('button',{type:'button',className:'btn-futurista btn-f-gold',onClick:function(){A.exportToExcel('Consumo_local_'+sem.desde,[{name:'Consumo',headers:['Persona'].concat(dias.map(function(x){return 'Past. '+dm(x);})).concat(['Total pastelitos']).concat(dias.map(function(x){return 'Beb. '+dm(x);})).concat(['Total bebidas','TOTAL']),rows:personas.map(function(k){var g=grid[k];return[k].concat(dias.map(function(x){return g.past[x]||0;})).concat([g.tp]).concat(dias.map(function(x){return g.beb[x]||0;})).concat([g.tb,g.tp+g.tb]);})},{name:'Detalle',headers:['Fecha','Persona','Producto','Cantidad','Precio','Monto'],rows:d.rows.map(function(x){return[dmy(x.fecha),x.mensajero_nombre,x.producto,x.cantidad,+x.precio_unitario||0,+x.monto||0];})}]);},style:{padding:'8px 14px'}},'Exportar Excel')),
      h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
        h(Kpi,{l:'Total consumo semana',v:fmt(total),c:'#ffe59a',s:personas.length+' personas'}),
        h(Kpi,{l:'Pastelitos',v:fmt(totP),c:'#ffb27a'}),
        h(Kpi,{l:'Bebidas',v:fmt(total-totP),c:'#9fd3ea'}))),
    h(Panel,{titulo:'Anotar consumo',sub:'Elige el día y la persona, y toca el producto (la cantidad se multiplica).'},
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:12}},
        h('select',{className:'form-input',value:f.fecha,onChange:function(e){setF(Object.assign({},f,{fecha:e.target.value}));},style:{margin:0,width:170}},dias.map(function(x,i){return h('option',{key:x,value:x},DIAS[i]+' '+dmy(x));})),
        h('input',{className:'form-input',list:'ps-personas',placeholder:'Persona',value:f.mensajero,onChange:function(e){setF(Object.assign({},f,{mensajero:e.target.value.toUpperCase()}));},style:{margin:0,width:240}}),
        h('datalist',{id:'ps-personas'},opts.map(function(n){return h('option',{key:n,value:n});})),
        h('div',{style:{display:'flex',alignItems:'center',gap:4}},h('button',{type:'button',className:'btn-futurista btn-f-ghost',onClick:function(){setF(Object.assign({},f,{cantidad:Math.max(1,(+f.cantidad||1)-1)}));},style:{padding:'6px 12px'}},'−'),
          h('input',{className:'form-input',type:'number',value:f.cantidad,onChange:function(e){setF(Object.assign({},f,{cantidad:e.target.value}));},style:{margin:0,width:64,textAlign:'center'}}),
          h('button',{type:'button',className:'btn-futurista btn-f-ghost',onClick:function(){setF(Object.assign({},f,{cantidad:(+f.cantidad||0)+1}));},style:{padding:'6px 12px'}},'+'))),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}},
        d.prods.map(function(p){return h('button',{key:p.id||p.nombre,type:'button',className:'dx-card',onClick:function(){agregar(p);},style:{textAlign:'left',padding:'14px 16px',borderRadius:16,cursor:'pointer',border:'1px solid rgba(200,168,75,.35)',borderTop:'1px solid #fff',background:'radial-gradient(130% 100% at 15% 0%,#ffffff,#f8f2e2 70%,#efe5cb)',boxShadow:'0 1px 0 #fff inset,0 -4px 0 '+(esPast(p.nombre)?'#c26a12':'#1565c0')+' inset,0 16px 26px -14px rgba(43,46,32,.35)'}},
          h('div',{style:{fontWeight:800,fontSize:13.5}},tit(p.nombre)),h('div',{style:{fontFamily:'Bebas Neue',fontSize:26,color:esPast(p.nombre)?'#c26a12':'#1565c0'}},fmt(p.precio)));})),
      delDia.length?h('div',{style:{marginTop:14}},
        h('div',{style:{fontSize:11,fontWeight:800,letterSpacing:1.3,textTransform:'uppercase',color:'var(--text-soft)',marginBottom:6}},'Anotado el '+dmy(f.fecha)),
        h('div',{style:{display:'flex',flexWrap:'wrap',gap:6}},delDia.map(function(x){return h('span',{key:x.id,style:{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:999,background:'#fff',border:'1px solid rgba(200,168,75,.3)',fontSize:12}},
          h('b',null,tit(x.mensajero_nombre)),x.cantidad+' × '+tit(x.producto),h('span',{className:'mono'},fmt(x.monto)),h('span',{onClick:function(){borrar(x);},style:{cursor:'pointer',color:'#b03030',fontWeight:900}},'×'));}))):null),
    h(Panel,{titulo:'Resumen de la semana',sub:'Pastelitos y bebidas por día, igual que la planilla'},
      personas.length?h('div',{className:'table-wrap',style:{overflowX:'auto'}},h('table',null,
        h('thead',null,
          h('tr',null,h('th',{rowSpan:2},'Persona'),h('th',{colSpan:8,style:{textAlign:'center',borderLeft:'1px solid rgba(255,255,255,.1)'}},'Pastelitos'),h('th',{colSpan:8,style:{textAlign:'center',borderLeft:'1px solid rgba(255,255,255,.1)'}},'Bebidas'),h('th',{rowSpan:2,style:thS},'Total')),
          h('tr',null,dias.map(function(x,i){return h('th',{key:'p'+x,style:Object.assign({},thS,i===0?{borderLeft:'1px solid rgba(255,255,255,.1)'}:null)},DIAS[i]);}).concat([h('th',{key:'tp',style:thS},'Total')]).concat(dias.map(function(x,i){return h('th',{key:'b'+x,style:Object.assign({},thS,i===0?{borderLeft:'1px solid rgba(255,255,255,.1)'}:null)},DIAS[i]);})).concat([h('th',{key:'tb',style:thS},'Total')]))),
        h('tbody',null,personas.map(function(k){var g=grid[k];return h('tr',{key:k},h('td',{style:{fontWeight:700,whiteSpace:'nowrap'}},k),
          dias.map(function(x){return h('td',{key:'p'+x,style:cel},g.past[x]?fmt(g.past[x]):'');}),h('td',{style:Object.assign({},cel,{fontWeight:800})},fmt(g.tp)),
          dias.map(function(x){return h('td',{key:'b'+x,style:cel},g.beb[x]?fmt(g.beb[x]):'');}),h('td',{style:Object.assign({},cel,{fontWeight:800})},fmt(g.tb)),
          h('td',{style:Object.assign({},cel,{fontWeight:800,color:'#b03030'})},fmt(g.tp+g.tb)));})))):h('div',{style:{fontSize:13,color:'var(--text-soft)'}},'Sin consumo anotado esta semana.')));
}

window.__pagoSemanalExtra={Resumen:Resumen,Retiros:Retiros,Consumo:Consumo};
})();
