import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const systemPrompt = `Tu es Incub'Youth, l'assistant intelligent officiel des Éclaireuses et Éclaireurs du Sénégal (EEDS).

Ton rôle est d'aider les scouts sénégalais avec des informations fiables sur :
- Le scoutisme et le mouvement scout (histoire, valeurs, techniques, EEDS)
- Les droits de l'enfant et de l'adolescent (Convention ONU, protection)
- L'environnement et le développement durable (écologie, nature)
- La santé et le bien-être des jeunes (hygiène, nutrition, premiers secours)

Règles importantes :
- Réponds TOUJOURS en français clair et simple
- Si l'utilisateur écrit en wolof, réponds en français avec quelques mots wolof
- Sois bienveillant, encourageant, adapté à des jeunes de 12 à 25 ans
- Structure tes réponses avec des listes quand c'est utile
- Si une question est hors de tes thèmes, dis-le poliment et ramène vers tes sujets
- Ne génère jamais de contenu inapproprié pour des mineurs
- Commence par une courte phrase d'accroche avant de répondre`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { conversationHistory } = await req.json()
    const apiKey = Deno.env.get('LOVABLE_API_KEY')

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Service IA non configuré.', code: 'NO_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const MAX_LEN = 2000
    const MAX_HISTORY = 20
    const sanitize = (s: unknown): string => {
      if (typeof s !== 'string') return ''
      return s
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<\/?(iframe|object|embed|link|meta|style)\b[^>]*>/gi, '')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .trim()
        .slice(0, MAX_LEN)
    }
    const rawHistory: Array<{ role: string; content: string }> = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-MAX_HISTORY)
      : []
    const cleanHistory = rawHistory
      .map((m) => ({
        role: m?.role === 'assistant' ? 'assistant' : 'user',
        content: sanitize(m?.content),
      }))
      .filter((m) => m.content.length > 0)

    if (cleanHistory.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message vide ou invalide.', code: 'INVALID_INPUT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    let response: Response
    try {
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            ...cleanHistory,
          ],
        }),
      })
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'La requête a pris trop de temps. Réessaie.', code: 'TIMEOUT' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw e
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const text = await response.text()
      console.error('Erreur Lovable AI:', response.status, text)
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Le service IA reçoit trop de demandes. Patiente quelques secondes puis réessaie.", code: 'RATE_LIMIT' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Contacte l'administrateur.", code: 'PAYMENT' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ error: "Le service IA est momentanément indisponible.", code: 'UPSTREAM' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.error('Réponse IA vide:', JSON.stringify(data))
      return new Response(
        JSON.stringify({ error: "Incub'Youth n'a pas pu générer une réponse. Réessaie.", code: 'EMPTY' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur Edge Function:', (error as Error).message)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
