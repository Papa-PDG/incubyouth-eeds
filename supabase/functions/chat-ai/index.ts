import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { conversationHistory } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY non configurée dans les secrets Supabase')
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

    const geminiMessages = (conversationHistory || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    if (geminiMessages.length === 0) {
      geminiMessages.push({ role: 'user', parts: [{ text: 'Bonjour' }] })
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7, topP: 0.9 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ]
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Erreur Gemini API:', data)
      throw new Error(data.error?.message || `Erreur HTTP ${response.status}`)
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      console.error('Réponse Gemini vide:', JSON.stringify(data))
      throw new Error("Incub'Youth n'a pas pu générer une réponse. Réessaie.")
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