import Anthropic from "@anthropic-ai/sdk";
import { HttpError } from "@/lib/errors";

// Cliente de IA (Anthropic Claude). El módulo es opcional: si no hay
// ANTHROPIC_API_KEY configurada, las funciones lanzan un error claro (503) en
// vez de tumbar la app.
//
// Modelo: la spec especifica Sonnet; usamos el ID actual `claude-sonnet-4-6`.

const MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new HttpError(
      503,
      "El módulo de IA no está configurado. Define ANTHROPIC_API_KEY en el entorno.",
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Extrae el texto del primer bloque de tipo "text" de la respuesta.
function firstText(message: Anthropic.Message): string {
  for (const block of message.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

const SUMMARY_SYSTEM = `Eres un asistente especializado en gobierno corporativo colombiano.
Tu tarea es generar resúmenes ejecutivos de actas de reuniones de junta directiva y comités.
El resumen debe incluir:
1. Principales temas tratados (máximo 5 puntos)
2. Decisiones tomadas y resultados de votaciones
3. Compromisos y responsables con fecha si se mencionan
4. Próximos pasos acordados
Responde siempre en español formal. Sé conciso y preciso.`;

export async function summarizeMinutes(minutesContent: string): Promise<string> {
  const anthropic = getClient();
  // El acta puede venir como HTML (Tiptap); la enviamos tal cual, Claude la interpreta.
  // Nota: el system prompt es estable entre llamadas. Para system prompts
  // grandes conviene activar prompt caching (cache_control: ephemeral) con un
  // SDK reciente; aquí el prompt es corto (por debajo del mínimo cacheable),
  // así que se envía como string.
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SUMMARY_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Resume el siguiente acta:\n\n${minutesContent}`,
      },
    ],
  });
  return firstText(response).trim();
}

const SEARCH_SYSTEM = `Eres un asistente de búsqueda documental para una empresa.
Dado un conjunto de extractos de documentos y una consulta del usuario,
identifica cuáles documentos responden mejor a la consulta y explica brevemente por qué.
Responde ÚNICAMENTE en JSON válido con el formato:
{ "results": [{ "documentId": "...", "relevance": "alta|media|baja", "reason": "..." }] }
No incluyas texto fuera del JSON.`;

export type SearchResult = {
  documentId: string;
  relevance: "alta" | "media" | "baja";
  reason: string;
};

export async function searchDocuments(
  query: string,
  documentExcerpts: string,
): Promise<SearchResult[]> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: SEARCH_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Consulta: "${query}"\n\nDocumentos disponibles:\n${documentExcerpts}`,
      },
    ],
  });

  const text = firstText(response).trim();
  // Extraer el primer bloque JSON aunque venga con texto envolvente.
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) return [];
  try {
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    return Array.isArray(parsed.results) ? parsed.results : [];
  } catch {
    return [];
  }
}
