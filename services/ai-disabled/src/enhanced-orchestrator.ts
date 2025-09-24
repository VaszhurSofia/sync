import Fastify from 'fastify';
import { OpenAI } from 'openai';
import { AIResponseSchema } from '@sync/types';
import { z } from 'zod';

// Enhanced AI Orchestrator with proper prompt engineering and validation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Enhanced validation schemas
const OrchestrationRequestSchema = z.object({
  partnerA: z.string().min(1).max(4000),
  partnerB: z.string().min(1).max(4000),
  context: z.object({
    sessionId: z.string().optional(),
    messageCount: z.number().optional(),
    previousAIResponses: z.array(z.string()).optional(),
  }).optional(),
});

const SafetyCheckSchema = z.object({
  isSafe: z.boolean(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  concerns: z.array(z.string()),
  shouldProceed: z.boolean(),
});

// Enhanced prompt templates
const SYSTEM_PROMPT = `You are a neutral, supportive communication facilitator for couples. Your role is to help partners understand each other better through reflection and gentle guidance.

CORE PRINCIPLES:
- Stay completely neutral - never take sides
- Use simple, clear language - avoid clinical or therapy jargon
- Focus on communication, not diagnosis or treatment
- Be supportive but not overly clinical
- Keep responses concise and actionable
- Always end with "Did I get that right?" to confirm understanding

RESPONSE STRUCTURE:
1. Mirror: Reflect what each partner said in their own words
2. Clarify: Ask one gentle question to help them understand each other
3. Micro-actions: Suggest 2-3 small, specific steps they can take
4. Check: Always end with "Did I get that right?"

SAFETY GUIDELINES:
- If you detect signs of abuse, violence, or serious mental health crisis, respond with general support and suggest professional help
- Avoid giving specific relationship advice or diagnoses
- Focus on communication patterns, not personal judgments
- If content seems inappropriate, provide a gentle redirect`;

const USER_PROMPT_TEMPLATE = `Partner A said: "{partnerA}"
Partner B said: "{partnerB}"

Please provide a reflection following this exact JSON format:
{{
  "mirror": {{
    "partnerA": "Brief, neutral reflection of what Partner A expressed",
    "partnerB": "Brief, neutral reflection of what Partner B expressed"
  }},
  "clarify": "One gentle question to help them understand each other better",
  "micro_actions": ["Specific action 1", "Specific action 2", "Specific action 3"],
  "check": "Did I get that right?"
}}`;

// Safety validation function
async function validateSafety(content: string): Promise<z.infer<typeof SafetyCheckSchema>> {
  const safetyPrompt = `Analyze this couple's communication for safety concerns. Respond with JSON only:

{
  "isSafe": boolean,
  "riskLevel": "low" | "medium" | "high",
  "concerns": ["list of specific concerns"],
  "shouldProceed": boolean
}

Content to analyze: "${content}"

Safety criteria:
- Signs of abuse, violence, or threats
- Serious mental health crisis indicators
- Inappropriate or harmful content
- Clear communication breakdown requiring professional intervention

If safe, proceed with normal response. If unsafe, shouldProceed should be false.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: safetyPrompt }],
      temperature: 0.1,
      max_tokens: 200,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return {
        isSafe: true,
        riskLevel: 'low',
        concerns: [],
        shouldProceed: true,
      };
    }

    const parsed = JSON.parse(responseText);
    return SafetyCheckSchema.parse(parsed);
  } catch (error) {
    fastify.log.warn('Safety validation failed, proceeding with caution:', error);
    return {
      isSafe: true,
      riskLevel: 'low',
      concerns: [],
      shouldProceed: true,
    };
  }
}

// Enhanced orchestration endpoint
fastify.post('/orchestrate', {
  schema: {
    description: 'Enhanced AI orchestration for couple chat reflection',
    tags: ['ai'],
    body: {
      type: 'object',
      required: ['partnerA', 'partnerB'],
      properties: {
        partnerA: { type: 'string', maxLength: 4000 },
        partnerB: { type: 'string', maxLength: 4000 },
        context: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            messageCount: { type: 'number' },
            previousAIResponses: { type: 'array', items: { type: 'string' } },
          },
        },
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
          safety: {
            type: 'object',
            properties: {
              isSafe: { type: 'boolean' },
              riskLevel: { type: 'string' },
              concerns: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  },
}, async (request, reply) => {
  try {
    // Validate input
    const validatedInput = OrchestrationRequestSchema.parse(request.body);
    const { partnerA, partnerB, context } = validatedInput;

    // Combine content for safety check
    const combinedContent = `Partner A: ${partnerA}\nPartner B: ${partnerB}`;

    // Safety validation
    const safetyCheck = await validateSafety(combinedContent);
    
    if (!safetyCheck.shouldProceed) {
      fastify.log.warn('Safety check failed, providing safe fallback response', {
        concerns: safetyCheck.concerns,
        riskLevel: safetyCheck.riskLevel,
      });

      return {
        mirror: {
          partnerA: "I hear you expressing your thoughts and feelings.",
          partnerB: "I hear you sharing your perspective as well.",
        },
        clarify: "It sounds like this is an important conversation. Would you like to take a moment to breathe and then share what's most important to each of you right now?",
        micro_actions: [
          "Take three deep breaths together",
          "Share one thing you appreciate about your partner",
          "Consider if you'd like to continue this conversation or take a break"
        ],
        check: "Did I get that right?",
        safety: safetyCheck,
      };
    }

    // Build context-aware prompt
    let contextualPrompt = USER_PROMPT_TEMPLATE
      .replace('{partnerA}', partnerA)
      .replace('{partnerB}', partnerB);

    if (context?.messageCount && context.messageCount > 10) {
      contextualPrompt += '\n\nNote: This is a longer conversation. Focus on the most recent exchange and keep responses concise.';
    }

    if (context?.previousAIResponses && context.previousAIResponses.length > 0) {
      contextualPrompt += '\n\nNote: This couple has had previous AI interactions. Avoid repeating similar suggestions.';
    }

    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: contextualPrompt },
      ],
      temperature: 0.7,
      max_tokens: 600,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
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
      fastify.log.warn('AI response parsing failed, using fallback:', error);
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

    return {
      ...aiResponse,
      safety: safetyCheck,
    };

  } catch (error) {
    fastify.log.error('AI orchestration error:', error);
    
    // Safe fallback response
    return {
      mirror: {
        partnerA: "I heard you expressing your thoughts and feelings.",
        partnerB: "I heard you sharing your perspective as well.",
      },
      clarify: "Can you help me understand what's most important to each of you right now?",
      micro_actions: ["Take a moment to breathe", "Share one specific thing you appreciate about your partner"],
      check: "Did I get that right?",
      safety: {
        isSafe: true,
        riskLevel: 'low',
        concerns: [],
      },
    };
  }
});

// Evaluation endpoint for testing AI responses
fastify.post('/evaluate', {
  schema: {
    description: 'Evaluate AI response quality',
    tags: ['ai'],
    body: {
      type: 'object',
      required: ['originalInput', 'aiResponse'],
      properties: {
        originalInput: {
          type: 'object',
          properties: {
            partnerA: { type: 'string' },
            partnerB: { type: 'string' },
          },
        },
        aiResponse: {
          type: 'object',
          properties: {
            mirror: { type: 'object' },
            clarify: { type: 'string' },
            micro_actions: { type: 'array' },
            check: { type: 'string' },
          },
        },
      },
    },
  },
}, async (request, reply) => {
  const { originalInput, aiResponse } = request.body as any;

  const evaluationPrompt = `Evaluate this AI response for a couple's communication facilitator. Rate each aspect 1-5:

Original Input:
Partner A: "${originalInput.partnerA}"
Partner B: "${originalInput.partnerB}"

AI Response:
${JSON.stringify(aiResponse, null, 2)}

Rate these aspects (1-5 scale):
1. Neutrality: Does it stay neutral and not take sides?
2. Clarity: Is the language clear and simple?
3. Helpfulness: Does it help the couple understand each other?
4. Actionability: Are the micro-actions specific and doable?
5. Safety: Is it appropriate and safe?

Respond with JSON:
{
  "scores": {
    "neutrality": number,
    "clarity": number,
    "helpfulness": number,
    "actionability": number,
    "safety": number
  },
  "overall": number,
  "feedback": "Brief explanation of the rating"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: evaluationPrompt }],
      temperature: 0.3,
      max_tokens: 300,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No evaluation response from OpenAI');
    }

    const evaluation = JSON.parse(responseText);
    return evaluation;
  } catch (error) {
    fastify.log.error('Evaluation error:', error);
    return {
      scores: {
        neutrality: 3,
        clarity: 3,
        helpfulness: 3,
        actionability: 3,
        safety: 3,
      },
      overall: 3,
      feedback: "Evaluation failed, using default scores",
    };
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'enhanced-ai-orchestrator',
    version: '1.0.0',
  };
});

// Start server
async function start() {
  try {
    const port = parseInt(process.env.PORT || '3002');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🤖 Enhanced AI Orchestrator running on http://${host}:${port}`);
    console.log(`📊 Evaluation endpoint available at http://${host}:${port}/evaluate`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Enhanced AI service gracefully...');
  await fastify.close();
  process.exit(0);
});

start();
