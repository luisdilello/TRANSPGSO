// @ts-nocheck
// ═══════════════════════════════════════════════════════════════════════════════════════
// Edge Function 'enviar-informes' — envío automático por correo del Informe de cierre.
// El armado del informe NO se duplica aquí: se descarga modules/informes.js publicado en
// sistema.transpgso.cl y se ejecuta su bloque /*<NUCLEO_INFORME>*/ (funciones puras), así el
// correo es idéntico al informe del panel y cualquier cambio en informes.js aplica sin redeploy.
//
// Llamadas:
//  - pg_cron cada 10 min: {accion:'tick', secreto} → revisa public.informe_envios y manda los que
//    correspondan (hora de Chile). El secreto se valida contra Vault (informes_cron_secreto_ok).
//  - Panel (admin logueado, con su JWT): {accion:'enviar_ahora', id} → manda ese envío ya.
//  - {accion:'vista_previa', secreto, desde, hasta} → prueba sin enviar.
// Secretos: RESEND_API_KEY (obligatorio), RESEND_FROM (opcional).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL");
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANON = Deno.env.get("SUPABASE_ANON_KEY");
const RESEND = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("RESEND_FROM") || "TransPgso Informes <informes@transpgso.cl>";
const admin = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
const FUENTES = ["https://sistema.transpgso.cl/modules/informes.js", "https://transpgso.pages.dev/modules/informes.js"];

function fechaHoyCL(d) { d = d ? new Date(d) : new Date(); return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d); }

let NUC = null, NUC_TS = 0;
async function nucleo() {
  if (NUC && Date.now() - NUC_TS < 15 * 60 * 1000) return NUC;
  let ultimoError = null;
  for (const url of FUENTES) {
    try {
      const r = await fetch(url + "?v=" + Date.now());
      if (!r.ok) throw new Error(url + " respondió " + r.status);
      const src = await r.text();
      const m = src.match(/\/\*<NUCLEO_INFORME>\*\/([\s\S]*?)\/\*<\/NUCLEO_INFORME>\*\//);
      if (!m) throw new Error("No se encontró el bloque NUCLEO_INFORME en " + url);
      const fabrica = new Function("LOGO_B64", "HORAS_CORTE", "fechaHoyCL",
        m[1] + "\nreturn {agregarDias:agregarDias,calcularAlertas:calcularAlertas,htmlInformeCierre:htmlInformeCierre,barraAccionesHTML:barraAccionesHTML,pct:pct,listaDias:listaDias,sumarDias:sumarDias,ymd:ymd,lunesDe:lunesDe,parseYMD:parseYMD,fmtDMY:fmtDMY,fmtDiaLargo:fmtDiaLargo,MESES:MESES};");
      // En un correo las imágenes en base64 se bloquean: el logo va como URL pública.
      NUC = fabrica("https://sistema.transpgso.cl/logo.jpg", [19, 20, 21, 22, 23], fechaHoyCL);
      NUC_TS = Date.now();
      return NUC;
    } catch (e) { ultimoError = e; }
  }
  throw ultimoError || new Error("No se pudo cargar el núcleo del informe");
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function resp(obj, status) { return new Response(JSON.stringify(obj), { status: status || 200, headers: { ...CORS, "Content-Type": "application/json" } }); }

function ahoraCL(N) {
  const d = new Date();
  const fecha = fechaHoyCL(d);
  const hora = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  const dow = ((N.parseYMD(fecha).getDay() + 6) % 7) + 1; // 1 = lunes … 7 = domingo
  return { fecha, hora, dow };
}
// Período que corresponde informar para una fila, "ahora". forzar=true ignora día/hora (envío manual).
//  diario : a la hora indicada; si la hora es 23:00 o más informa el mismo día, si no el día anterior.
//  semanal: el día de semana indicado (1=lunes) a la hora; informa la semana anterior lun-dom
//           (domingo desde las 23:00 informa la semana que termina).
//  mensual: el día 1 a la hora; informa el mes anterior.
function periodoPara(N, row, now, forzar) {
  if (row.tipo === "diario") {
    if (!forzar && now.hora < row.hora) return null;
    const mismoDia = forzar ? now.hora >= "23:00" : row.hora >= "23:00";
    const dia = mismoDia ? now.fecha : N.sumarDias(now.fecha, -1);
    return { clave: "diario:" + dia, desde: dia, hasta: dia, label: N.fmtDiaLargo(dia) };
  }
  if (row.tipo === "semanal") {
    if (!forzar && (now.dow !== row.dia_semana || now.hora < row.hora)) return null;
    const lunesActual = N.ymd(N.lunesDe(now.fecha));
    const desde = (now.dow === 7 && now.hora >= "23:00") ? lunesActual : N.sumarDias(lunesActual, -7);
    const fin = N.sumarDias(desde, 6);
    return { clave: "semanal:" + desde, desde, hasta: fin > now.fecha ? now.fecha : fin, label: "Semana del " + N.fmtDMY(desde) + " al " + N.fmtDMY(fin) };
  }
  if (row.tipo === "mensual") {
    if (!forzar && (now.fecha.slice(8) !== "01" || now.hora < row.hora)) return null;
    const p = now.fecha.split("-");
    const ini = N.ymd(new Date(+p[0], +p[1] - 2, 1));
    const fin = N.ymd(new Date(+p[0], +p[1] - 1, 0));
    const mm = ini.slice(0, 7).split("-");
    return { clave: "mensual:" + ini.slice(0, 7), desde: ini, hasta: fin, label: N.MESES[+mm[1] - 1] + " " + mm[0] };
  }
  return null;
}

async function construirInforme(N, per) {
  const lista = N.listaDias(per.desde, per.hasta);
  const conPrev = lista.length === 1;
  const todos = conPrev ? lista.concat([N.sumarDias(lista[0], -1)]) : lista;
  const res = new Array(todos.length); let i = 0;
  async function worker() { while (i < todos.length) { const k = i++; const r = await admin.rpc("informe_cierre_dia", { p_dia: todos[k] }); if (r.error) throw r.error; res[k] = r.data; } }
  await Promise.all([worker(), worker(), worker(), worker()]);
  const prev = conPrev ? res.pop() : null;
  const t = N.agregarDias(res);
  const prevT = prev ? N.agregarDias([prev]) : null;
  const n = await admin.from("informe_cierre_notas").select("id,created_at,fecha,autor,texto").gte("fecha", per.desde).lte("fecha", per.hasta).order("fecha").order("created_at");
  const c = await admin.from("configuracion").select("valor").eq("clave", "informe_cierre_alertas").maybeSingle();
  const alertas = N.calcularAlertas(res, t, prevT, (c.data && c.data.valor) || {});
  const periodo = { desde: per.desde, hasta: per.hasta, label: per.label };
  // Adjunto = informe completo (igual al del panel). Cuerpo del correo = versión compacta
  // (Gmail recorta los mensajes de más de ~100 KB).
  const html = N.htmlInformeCierre(res, t, n.data || [], periodo, "Envío automático", alertas).replace(N.barraAccionesHTML(), "");
  const cuerpo = N.htmlInformeCierre(res, t, n.data || [], periodo, "Envío automático", alertas, { compacto: true }).replace("position:sticky;top:0;z-index:100;", "");
  const reales = alertas.filter((a) => a.nivel !== "info").length;
  return { html, cuerpo, t, reales };
}

async function enviarCorreo(N, row, per, manual) {
  const dest = (row.destinatarios || []).map((x) => String(x).trim()).filter(Boolean);
  if (!dest.length) throw new Error("El envío no tiene destinatarios.");
  if (!RESEND) throw new Error("Falta configurar RESEND_API_KEY en Supabase.");
  const inf = await construirInforme(N, per);
  const asunto = "Informe de cierre · " + per.label + " · entrega " + N.pct(inf.t.ent, inf.t.salida) + (inf.reales ? " · " + inf.reales + " alerta" + (inf.reales > 1 ? "s" : "") : "");
  const nombreArchivo = "Informe_Cierre_" + per.desde + (per.hasta !== per.desde ? "_" + per.hasta : "") + ".html";
  const bytes = new TextEncoder().encode(inf.html);
  let bin = ""; for (let k = 0; k < bytes.length; k += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(k, k + 8192));
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + RESEND, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: dest, subject: asunto, html: inf.cuerpo, attachments: [{ filename: nombreArchivo, content: btoa(bin) }] }),
  });
  const body = await r.text();
  await admin.from("informe_envios_log").insert({ envio_id: row.id, nombre: row.nombre, periodo: per.clave, destinatarios: dest, ok: r.ok, detalle: r.ok ? asunto : ("Resend " + r.status + ": " + body.slice(0, 500)), manual: !!manual });
  if (!r.ok) throw new Error("Resend " + r.status + ": " + body.slice(0, 300));
  return asunto;
}

async function secretoOk(s) {
  const chk = await admin.rpc("informes_cron_secreto_ok", { p_secreto: String(s || "") });
  return !chk.error && chk.data === true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body = {};
  try { body = await req.json(); } catch (_e) {}
  try {
    if (body.accion === "tick") {
      if (!(await secretoOk(body.secreto))) return resp({ error: "no autorizado" }, 401);
      const { data: filas } = await admin.from("informe_envios").select("*").eq("activo", true);
      if (!filas || !filas.length) return resp({ ok: true, hechos: [] });
      const N = await nucleo();
      const now = ahoraCL(N);
      const hechos = [];
      for (const row of filas) {
        const per = periodoPara(N, row, now, false);
        if (!per || per.clave === row.ultimo_periodo) continue;
        try {
          const asunto = await enviarCorreo(N, row, per, false);
          await admin.from("informe_envios").update({ ultimo_periodo: per.clave, ultimo_envio_at: new Date().toISOString(), ultimo_error: null }).eq("id", row.id);
          hechos.push({ id: row.id, ok: true, asunto });
        } catch (e) {
          // Se marca el período igual para no reintentar cada 10 minutos; el error queda visible en el panel.
          await admin.from("informe_envios").update({ ultimo_periodo: per.clave, ultimo_error: String(e && e.message || e).slice(0, 500) }).eq("id", row.id);
          hechos.push({ id: row.id, ok: false, error: String(e && e.message || e) });
        }
      }
      return resp({ ok: true, ahora: now, hechos });
    }
    if (body.accion === "enviar_ahora") {
      const auth = req.headers.get("Authorization") || "";
      const userClient = createClient(SB_URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
      const esAdm = await userClient.rpc("es_admin_activo");
      if (esAdm.error || esAdm.data !== true) return resp({ error: "Solo un administrador puede enviar informes." }, 403);
      const { data: row, error } = await admin.from("informe_envios").select("*").eq("id", body.id).single();
      if (error || !row) return resp({ error: "Envío no encontrado." }, 404);
      const N = await nucleo();
      const per = periodoPara(N, row, ahoraCL(N), true);
      try {
        const asunto = await enviarCorreo(N, row, per, true);
        return resp({ ok: true, asunto, periodo: per.label });
      } catch (e) {
        return resp({ error: String(e && e.message || e) }, 500);
      }
    }
    if (body.accion === "vista_previa") {
      if (!(await secretoOk(body.secreto))) return resp({ error: "no autorizado" }, 401);
      const N = await nucleo();
      const inf = await construirInforme(N, { clave: "prueba", desde: body.desde, hasta: body.hasta || body.desde, label: body.desde });
      return resp({ ok: true, largo_adjunto: inf.html.length, largo_cuerpo: inf.cuerpo.length, entrega: N.pct(inf.t.ent, inf.t.salida), alertas: inf.reales });
    }
    return resp({ error: "acción desconocida" }, 400);
  } catch (e) {
    return resp({ error: String(e && e.message || e) }, 500);
  }
});
