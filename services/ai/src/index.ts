import Fastify from 'fastify';
import { OpenAI } from 'openai';
import { AIResponseSchema } from '@sync/types';

// 🔑 YOUR OPENAI API KEY GOES HERE
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // <-- ADD YOUR API KEY TO .env FILE
});

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// AI Orchestrator endpoint
fastify.post('/orchestrate', {
  schema: {
    description: 'AI orchestration for couple chat reflection',
    tags: ['ai'],
    body: {
      type: 'object',
      required: ['partnerA', 'partnerB'],
      properties: {
        partnerA: { type: 'string', maxLength: 4000 },
        partnerB: { type: 'string', maxLength: 4000 },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          mirror: {
            type: 'object',
            properties: {
              partnerA: { type: 'string' },
              partnerB: { type: 'string' },
            },
          },
          clarify: { type: 'string' },
          micro_actions: { type: 'array', items: { type: 'string' } },
          check: { type: 'string' },
        },
      },
    },
  },
}, async (request, reply) => {
  const { partnerA, partnerB } = request.body as { partnerA: string; partnerB: string };

  try {
    // Pre-check: Tier-1 regex boundary detection (to be implemented in M4)
    // For now, we'll skip this and go directly to LLM

    const systemPrompt = `You are a neutral facilitator for couples' communication, not a therapist. 
Your role is to:
1. Mirror what each partner said in simple, clear language
2. Ask clarifying questions to help them understand each other
3. Suggest small, actionable steps they can take
4. Always end with "Did I get that right?" to confirm understanding

Guidelines:
- Stay neutral, don't take sides
- Keep responses short and plain
- No diagnoses or clinical language
- Focus on communication, not therapy
- Be supportive but not overly clinical`;

    const userPrompt = `Partner A said: "${partnerA}"
Partner B said: "${partnerB}"

Please provide a reflection following the exact JSON format:
{
  "mirror": {
    "partnerA": "Brief reflection of what Partner A said",
    "partnerB": "Brief reflection of what Partner B said"
  },
  "clarify": "A clarifying question to help them understand each other",
  "micro_actions": ["Small action 1", "Small action 2"],
  "check": "Did I get that right?"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate the response
    let aiResponse;
    try {
      const parsed = JSON.parse(responseText);
      aiResponse = AIResponseSchema.parse(parsed);
    } catch (error) {
      // Fallback response if parsing fails
      aiResponse = {
        mirror: {
          partnerA: "I heard you expressing your thoughts and feelings.",
          partnerB: "I heard you sharing your perspective as well.",
        },
        clarify: "Can you help me understand what's most important to each of you right now?",
        micro_actions: ["Take a moment to breathe", "Share one specific thing you appreciate about your partner"],
        check: "Did I get that right?",
      };
    }

    return aiResponse;
  } catch (error) {
    console.error('AI orchestration error:', error instanceof Error ? error.message : String(error));
    
    // Safe fallback response
    return {
      mirror: {
        partnerA: "I heard you expressing your thoughts and feelings.",
        partnerB: "I heard you sharing your perspective as well.",
      },
      clarify: "Can you help me understand what's most important to each of you right now?",
      micro_actions: ["Take a moment to breathe", "Share one specific thing you appreciate about your partner"],
      check: "Did I get that right?",
    };
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ai-orchestrator',
  };
});

// Start server
async function start() {
  try {
    const port = parseInt(process.env.PORT || '3002');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🤖 AI Orchestrator running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down AI service gracefully...');
  await fastify.close();
  process.exit(0);
});

start();
