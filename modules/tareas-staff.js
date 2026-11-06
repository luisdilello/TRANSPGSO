// Tareas asignadas desde Supervisión (06-11-2026). Se carga solo en el panel de admin/operador
// (no super admin, no mensajeros). Muestra un botón "Mis tareas (n)" abajo a la izquierda cuando
// hay tareas pendientes; desde ahí se marcan como hechas (con comentario opcional).
(function(){
if(window.__tareasStaff)return;
var db=window.__app&&window.__app.db;if(!db)return;
var vistas={},abierto=false,lista=[];
var PR={urgente:['Urgente','#d32f2f'],alta:['Alta','#f57c00'],normal:['Normal','#1565c0']};
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function dmy(f){return f?String(f).slice(0,10).split('-').reverse().join('-'):'';}
var btn=document.createElement('button');
btn.type='button';
btn.style.cssText='position:fixed;left:16px;bottom:16px;z-index:99990;display:none;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;border:1px solid #ffe59a;background:linear-gradient(135deg,#c8a84b,#a87d2a);color:#1a1d13;font-weight:800;font-size:13px;font-family:DM Sans,system-ui,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.3);cursor:pointer';
document.body.appendChild(btn);
var panel=document.createElement('div');
panel.style.cssText='position:fixed;left:16px;bottom:70px;z-index:99991;width:min(420px,calc(100vw - 32px));max-height:70vh;overflow:auto;display:none;background:#fff;border-radius:16px;border:1px solid rgba(200,168,75,.5);box-shadow:0 24px 60px rgba(0,0,0,.35);font-family:DM Sans,system-ui,sans-serif;color:#1a1d13';
document.body.appendChild(panel);
btn.onclick=function(){abierto=!abierto;panel.style.display=abierto?'block':'none';if(abierto)pintar();};
function pintar(){
  var h='<div style="padding:14px 16px;border-bottom:2px solid #c8a84b;display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">Mis tareas</b><span data-cerrar style="cursor:pointer;font-weight:800;color:#777;padding:2px 8px">Cerrar</span></div>';
  if(!lista.length)h+='<div style="padding:16px;color:#777;font-size:13px">No tienes tareas pendientes.</div>';
  lista.forEach(function(t){var p=PR[t.prioridad]||PR.normal;var venc=t.vence&&t.vence<new Date().toLocaleDateString('en-CA',{timeZone:'America/Santiago'});
    h+='<div style="padding:12px 16px;border-bottom:1px solid #f0ead6;border-left:4px solid '+p[1]+'"><div style="font-weight:700;font-size:13.5px">'+esc(t.titulo)+'</div>'
      +(t.detalle?'<div style="font-size:12px;color:#666;margin-top:2px">'+esc(t.detalle)+'</div>':'')
      +'<div style="font-size:11.5px;color:#888;margin-top:3px"><b style="color:'+p[1]+'">'+p[0]+'</b>'+(t.vence?' · vence '+dmy(t.vence)+(venc?' <b style="color:#d32f2f">(vencida)</b>':''):'')+(t.creado_por?' · de '+esc(t.creado_por):'')+'</div>'
      +'<textarea data-nota="'+t.id+'" rows="2" placeholder="Comentario (opcional)" style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid #ddd;font-size:12.5px;box-sizing:border-box"></textarea>'
      +'<button data-hecha="'+t.id+'" style="margin-top:6px;padding:7px 14px;border-radius:8px;border:none;background:#2e7d4f;color:#fff;font-weight:800;font-size:12.5px;cursor:pointer">Marcar hecha</button></div>';});
  panel.innerHTML=h;
  panel.querySelector('[data-cerrar]').onclick=function(){abierto=false;panel.style.display='none';};
  panel.querySelectorAll('[data-hecha]').forEach(function(b){b.onclick=function(){var id=+b.getAttribute('data-hecha');var ta=panel.querySelector('[data-nota="'+id+'"]');b.disabled=true;b.textContent='Guardando…';
    db.rpc('completar_tarea_staff',{p_id:id,p_nota:ta?ta.value:null}).then(function(r){if(r.error){b.disabled=false;b.textContent='Reintentar';return;}cargar();});};});
}
function cargar(){
  db.from('tareas_staff').select('*').eq('estado','pendiente').order('created_at',{ascending:false}).then(function(r){
    if(r.error)return;lista=r.data||[];var nuevas=lista.filter(function(t){return !vistas[t.id];});lista.forEach(function(t){vistas[t.id]=1;});
    btn.style.display=lista.length?'flex':'none';
    btn.innerHTML='Mis tareas <span style="background:#1a1d13;color:#ffe59a;border-radius:999px;padding:1px 8px;font-size:12px">'+lista.length+'</span>';
    if(nuevas.length&&cargado){btn.animate&&btn.animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:500,iterations:4});}
    cargado=true;if(abierto)pintar();
  });
}
var cargado=false;
cargar();setInterval(cargar,90000);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')cargar();});
window.__tareasStaff={recargar:cargar};
})();
