// TransPgso - proxy de IA en Cloudflare: DESACTIVADO (28-10-2026).
// La lectura de etiquetas ahora va por la función 'analizar-etiqueta' de Supabase, que exige
// sesión activa y fija el modelo en el servidor. El proxy anterior reenviaba cualquier pedido a la
// API de Anthropic con la clave de la empresa, sin verificar quién llamaba.
// Si este worker sigue publicado en Cloudflare, reemplazar su código por este (o eliminarlo).
export default {
  async fetch() {
    return new Response(JSON.stringify({ error: 'Servicio desactivado' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
  }
};
