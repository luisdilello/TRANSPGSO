(function(){
var useState=React.useState;
var lsLoad=window.__app.lsLoad;
function Analitica(){
  var envios=lsLoad('gestion_envios',[]);
  var _f=useState('semana'),filtro=_f[0],setFiltro=_f[1];
  var _fd=useState(''),fechaDesde=_fd[0],setFechaDesde=_fd[1];
  var _fh=useState(''),fechaHasta=_fh[0],setFechaHasta=_fh[1];
  var hoy=new Date();
  function enRango(e){
    var f=new Date((e.historial&&e.historial[0]?e.historial[0].fecha:null)||e.fecha||hoy);
    if(filtro==='hoy'){var s=new Date(hoy);s.setHours(0,0,0,0);var fin=new Date(hoy);fin.setHours(23,59,59,999);return f>=s&&f<=fin;}
    if(filtro==='semana'){var lun=new Date(hoy);lun.setDate(hoy.getDate()-((hoy.getDay()+6)%7));lun.setHours(0,0,0,0);return f>=lun;}
    if(filtro==='mes'){var ini=new Date(hoy.getFullYear(),hoy.getMonth(),1);return f>=ini;}
    if(filtro==='personalizado'&&fechaDesde&&fechaHasta){var d=new Date(fechaDesde+'T00:00:00');var h=new Date(fechaHasta+'T23:59:59');return f>=d&&f<=h;}
    return true;
  }
  var filtrados=envios.filter(enRango);
  var total=filtrados.length;
  var entregados=filtrados.filter(function(e){return e.estado==='entregado';}).length;
  var enRuta=filtrados.filter(function(e){return e.estado==='en_ruta';}).length;
  var reprog=filtrados.filter(function(e){return e.estado==='reprogramado';}).length;
  var cancelados=filtrados.filter(function(e){return e.estado==='cancelado';}).length;
  var efectividad=total>0?Math.round(entregados/total*100):0;
  var porCliente={};
  filtrados.forEach(function(e){var c=e.cliente||'Sin cliente';if(!porCliente[c])porCliente[c]={total:0,entregados:0};porCliente[c].total++;if(e.estado==='entregado')porCliente[c].entregados++;});
  var clientesArr=Object.entries(porCliente).sort(function(a,b){return b[1].total-a[1].total;}).slice(0,10);
  var porMen={};
  filtrados.forEach(function(e){var m=e.mensajero||'Sin asignar';if(!porMen[m])porMen[m]={total:0,entregados:0};porMen[m].total++;if(e.estado==='entregado')porMen[m].entregados++;});
  var mensArr=Object.entries(porMen).filter(function(x){return x[0]!=='Sin asignar';}).sort(function(a,b){return b[1].entregados-a[1].entregados;}).slice(0,10);
  var btnStyle=function(active){return{padding:'6px 16px',borderRadius:8,border:'1px solid '+(active?'var(--gold)':'var(--border)'),background:active?'rgba(200,168,75,0.12)':'#fff',color:active?'var(--gold)':'var(--text-soft)',fontWeight:700,fontSize:12,cursor:'pointer'};};
  return React.createElement('div',null,
    React.createElement('div',{className:'section-head'},
      React.createElement('div',{className:'section-title'},'Anal',React.createElement('span',null,'ítica')),
      React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}},
        React.createElement('button',{style:btnStyle(filtro==='hoy'),onClick:function(){setFiltro('hoy');}},'Hoy'),
        React.createElement('button',{style:btnStyle(filtro==='semana'),onClick:function(){setFiltro('semana');}},'Esta semana'),
        React.createElement('button',{style:btnStyle(filtro==='mes'),onClick:function(){setFiltro('mes');}},'Este mes'),
        React.createElement('button',{style:btnStyle(filtro==='todo'),onClick:function(){setFiltro('todo');}},'Todo'),
        React.createElement('button',{style:btnStyle(filtro==='personalizado'),onClick:function(){setFiltro('personalizado');}},'Rango'),
        filtro==='personalizado'&&React.createElement(React.Fragment,null,
          React.createElement('input',{type:'date',value:fechaDesde,onChange:function(e){setFechaDesde(e.target.value);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12}}),
          React.createElement('span',{style:{color:'var(--text-soft)',fontSize:12}},'al'),
          React.createElement('input',{type:'date',value:fechaHasta,onChange:function(e){setFechaHasta(e.target.value);},style:{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:12}})
        )
      )
    ),
    React.createElement('div',{className:'stats-grid',style:{marginBottom:20}},
      [{label:'Total',val:total,cls:''},{label:'Entregados',val:entregados,cls:'green'},{label:'En Ruta',val:enRuta,cls:'gold'},{label:'Reprogramados',val:reprog,cls:'red'},{label:'Cancelados',val:cancelados,cls:'red'},{label:'Efectividad',val:efectividad+'%',cls:efectividad>=80?'green':efectividad>=60?'gold':'red'}].map(function(s){
        return React.createElement('div',{key:s.label,className:'stat-card'},React.createElement('div',{className:'stat-label'},s.label),React.createElement('div',{className:'stat-value '+s.cls},s.val));
      })
    ),
    React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}},
      React.createElement('div',{className:'panel'},
        React.createElement('div',{className:'panel-title'},'Top Clientes'),
        clientesArr.length===0?React.createElement('div',{className:'empty-state'},'Sin datos'):
        React.createElement('div',{className:'table-wrap'},React.createElement('table',null,
          React.createElement('thead',null,React.createElement('tr',null,React.createElement('th',null,'Cliente'),React.createElement('th',{style:{textAlign:'center'}},'Envíos'),React.createElement('th',{style:{textAlign:'center'}},'Entregados'),React.createElement('th',{style:{textAlign:'center'}},'%'))),
          React.createElement('tbody',null,clientesArr.map(function(x,i){
            var ef=x[1].total>0?Math.round(x[1].entregados/x[1].total*100):0;
            return React.createElement('tr',{key:x[0],style:{background:i%2===0?'#fff':'var(--cream)'}},React.createElement('td',{style:{fontWeight:600}},x[0]),React.createElement('td',{className:'mono',style:{textAlign:'center'}},x[1].total),React.createElement('td',{className:'mono',style:{textAlign:'center',color:'var(--success)'}},x[1].entregados),React.createElement('td',{className:'mono',style:{textAlign:'center',fontWeight:700,color:ef>=80?'var(--success)':ef>=60?'var(--warning)':'var(--danger)'}},ef+'%'));
          }))
        ))
      ),
      React.createElement('div',{className:'panel'},
        React.createElement('div',{className:'panel-title'},'Top Mensajeros'),
        mensArr.length===0?React.createElement('div',{className:'empty-state'},'Sin datos'):
        React.createElement('div',{className:'table-wrap'},React.createElement('table',null,
          React.createElement('thead',null,React.createElement('tr',null,React.createElement('th',null,'Mensajero'),React.createElement('th',{style:{textAlign:'center'}},'Envíos'),React.createElement('th',{style:{textAlign:'center'}},'Entregados'),React.createElement('th',{style:{textAlign:'center'}},'%'))),
          React.createElement('tbody',null,mensArr.map(function(x,i){
            var ef=x[1].total>0?Math.round(x[1].entregados/x[1].total*100):0;
            return React.createElement('tr',{key:x[0],style:{background:i%2===0?'#fff':'var(--cream)'}},React.createElement('td',{style:{fontWeight:600}},x[0].replace(/,\s*/g,' ')),React.createElement('td',{className:'mono',style:{textAlign:'center'}},x[1].total),React.createElement('td',{className:'mono',style:{textAlign:'center',color:'var(--success)'}},x[1].entregados),React.createElement('td',{className:'mono',style:{textAlign:'center',fontWeight:700,color:ef>=80?'var(--success)':ef>=60?'var(--warning)':'var(--danger)'}},ef+'%'));
          }))
        ))
      )
    ),
    React.createElement('div',{className:'panel'},
      React.createElement('div',{className:'panel-title'},'Distribución de Estados'),
      React.createElement('div',{style:{display:'flex',gap:12,flexWrap:'wrap',padding:'8px 0'}},
        [{label:'Entregados',val:entregados,color:'var(--success)'},{label:'En Ruta',val:enRuta,color:'var(--gold)'},{label:'Reprogramados',val:reprog,color:'var(--warning)'},{label:'Cancelados',val:cancelados,color:'var(--danger)'}].map(function(s){
          var pct=total>0?Math.round(s.val/total*100):0;
          return React.createElement('div',{key:s.label,style:{flex:'1 1 130px',background:'var(--cream)',borderRadius:10,padding:'12px 16px',border:'1px solid var(--border)'}},
            React.createElement('div',{style:{fontSize:11,color:'var(--text-soft)',marginBottom:4,textTransform:'uppercase',letterSpacing:1}},s.label),
            React.createElement('div',{style:{fontFamily:'JetBrains Mono',fontSize:24,fontWeight:700,color:s.color}},s.val),
            React.createElement('div',{style:{marginTop:6,height:4,borderRadius:2,background:'var(--border)'}},React.createElement('div',{style:{height:'100%',width:pct+'%',background:s.color,borderRadius:2}})),
            React.createElement('div',{style:{fontSize:10,color:'var(--text-soft)',marginTop:4}},pct+'% del total')
          );
        })
      )
    )
  );
}
window.Analitica = Analitica;
})();
