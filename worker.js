// TransPgso - Cloudflare Worker proxy para Anthropic API
// Deploy en: https://workers.cloudflare.com
// La API key se guarda como SECRET en Cloudflare (nunca visible en el código)

export default {
  async fetch(request, env) {
    // Solo permitir POST desde el dominio de TransPgso
    const origin = request.headers.get('Origin') || '';
    const allowed = ['https://luisdilello.github.io', 'http://localhost'];
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json();
      
      // Llamar a Anthropic con la key guardada como secret
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY, // Secret de Cloudflare
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }
};
