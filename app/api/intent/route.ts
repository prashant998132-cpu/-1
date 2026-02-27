import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are JARVIS - an AI tool selector assistant.
Analyze the user's request and return ONLY a JSON object.

Categories: image, video, writing, code, audio, chat, design, 3d, search, productivity, avatar

Return ONLY this JSON:
{
  "intent": "brief-description",
  "category": "one-category",
  "confidence": 0.0-1.0,
  "keywords": ["key1", "key2"],
  "mode": "tool-finder|chat|code|translate|summary"
}

Mode rules:
- tool-finder: user wants a tool
- chat: user wants explanation/info
- code: user wants code written
- translate: user wants translation
- summary: user wants something summarized

Support Hindi/Hinglish. Return ONLY JSON.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, context } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Input required' }, { status: 400 });
    }

    const contextText = context?.length
      ? `\n\nConversation context:\n${context.map((m: {role:string, content:string}) =>
          `${m.role}: ${m.content}`).join('\n')}`
      : '';

    // TRY OPENAI FIRST (since we have the key)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const client = new OpenAI({ apiKey: openaiKey });
        const response = await client.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `${contextText}\n\nUser: "${input}"` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 200,
        });

        const content = response.choices[0].message.content;
        if (content) {
          const parsed = JSON.parse(content);
          const validCats = ['image','video','writing','code','audio','chat','design','3d','search','productivity','avatar'];
          if (!validCats.includes(parsed.category)) { parsed.category = 'chat'; parsed.confidence = 0.5; }

          return NextResponse.json({
            intent: parsed.intent || `${parsed.category}-task`,
            category: parsed.category,
            confidence: parsed.confidence || 0.7,
            keywords: parsed.keywords || [],
            mode: parsed.mode || 'tool-finder',
            model: 'openai',
          });
        }
      } catch (e) {
        console.warn('[JARVIS] OpenAI failed, trying Gemini:', e);
      }
    }

    // TRY GEMINI SECOND
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [{ text: `${SYSTEM_PROMPT}${contextText}\n\nUser: "${input}"` }],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200, responseMimeType: 'application/json' },
        });

        const parsed = JSON.parse(result.response.text());
        const validCats = ['image','video','writing','code','audio','chat','design','3d','search','productivity','avatar'];
        if (!validCats.includes(parsed.category)) { parsed.category = 'chat'; parsed.confidence = 0.5; }

        return NextResponse.json({
          intent: parsed.intent || `${parsed.category}-task`,
          category: parsed.category,
          confidence: parsed.confidence || 0.7,
          keywords: parsed.keywords || [],
          mode: parsed.mode || 'tool-finder',
          model: 'gemini',
        });
      } catch (e) {
        console.warn('[JARVIS] Gemini failed, trying Groq:', e);
      }
    }

    // TRY GROQ THIRD
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: `${contextText}\n\nUser: "${input}"\n\nReturn ONLY JSON.` }
            ],
            temperature: 0.1,
            max_tokens: 200,
          }),
        });

        const groqData = await groqRes.json();
        const text = groqData.choices?.[0]?.message?.content || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return NextResponse.json({
            intent: parsed.intent || `${parsed.category}-task`,
            category: parsed.category || 'chat',
            confidence: parsed.confidence || 0.7,
            keywords: parsed.keywords || [],
            mode: parsed.mode || 'tool-finder',
            model: 'groq',
          });
        }
      } catch (e) {
        console.warn('[JARVIS] Groq failed:', e);
      }
    }

    return NextResponse.json({ error: 'All AI unavailable', useKeywordFallback: true }, { status: 503 });

  } catch (error) {
    console.error('[JARVIS Intent API] Error:', error);
    return NextResponse.json({ error: 'Failed', useKeywordFallback: true }, { status: 500 });
  }
}

export const runtime = "nodejs";
