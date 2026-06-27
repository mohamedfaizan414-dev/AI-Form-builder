const express = require('express');
const Groq = require('groq-sdk');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

if (!process.env.GROQ_API_KEY) {
  console.warn('WARNING: GROQ_API_KEY is not set. AI routes will fail.');
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

const FIELD_SCHEMA_INSTRUCTIONS = `
You are a form-schema generation engine. You MUST respond with ONLY a raw JSON object, no markdown fences, no prose, no explanation.

The JSON object must have this exact shape:
{
  "title": string,
  "description": string,
  "theme": { "primaryColor": "#hexcode", "mode": "dark" | "light" },
  "fields": [
    {
      "id": string (kebab-case unique slug),
      "type": "text" | "email" | "phone" | "number" | "textarea" | "select" | "radio" | "checkbox" | "date" | "rating",
      "label": string,
      "placeholder": string,
      "required": boolean,
      "options": string[] (only for select/radio/checkbox; omit otherwise)
    }
  ]
}

Rules:
- Always include at least 3 relevant fields based on the user's intent.
- "id" values must be unique, lowercase, hyphen-separated.
- Choose a sensible primaryColor hex matching any requested theme/mood.
- Never include comments, trailing commas, or text outside the JSON object.
`;

function extractJSON(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in AI response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

// POST /api/ai/generate  { prompt }
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: FIELD_SCHEMA_INSTRUCTIONS },
        { role: 'user', content: `Build a form for: ${prompt}` },
      ],
    });

    const text = completion.choices[0]?.message?.content || '';
    const schema = extractJSON(text);
    res.json({ schema });
  } catch (err) {
    console.error('AI generate error:', err.message);
    res.status(500).json({ error: 'Failed to generate form schema' });
  }
});

// POST /api/ai/refine  { currentSchema, instruction }
router.post('/refine', requireAuth, async (req, res) => {
  try {
    const { currentSchema, instruction } = req.body;
    if (!currentSchema || !instruction) {
      return res.status(400).json({ error: 'currentSchema and instruction are required' });
    }

    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: FIELD_SCHEMA_INSTRUCTIONS },
        {
          role: 'user',
          content: `Here is the current form schema JSON:\n${JSON.stringify(
            currentSchema
          )}\n\nApply this change and return the FULL updated schema JSON: "${instruction}"`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || '';
    const schema = extractJSON(text);
    res.json({ schema });
  } catch (err) {
    console.error('AI refine error:', err.message);
    res.status(500).json({ error: 'Failed to refine form schema' });
  }
});

// GET /api/ai/summarize/:formId — executive summary of submissions
router.get('/summarize/:formId', requireAuth, async (req, res) => {
  try {
    const { formId } = req.params;
    const formResult = await pool.query('SELECT title, schema, user_id FROM forms WHERE id = $1', [formId]);
    if (formResult.rows.length === 0) return res.status(404).json({ error: 'Form not found' });
    if (formResult.rows[0].user_id !== req.userId) return res.status(403).json({ error: 'Not your form' });

    const subsResult = await pool.query(
      'SELECT answers, created_at FROM submissions WHERE form_id = $1 ORDER BY created_at DESC LIMIT 200',
      [formId]
    );

    if (subsResult.rows.length === 0) {
      return res.json({ summary: 'No submissions yet for this form.' });
    }

    const { title } = formResult.rows[0];
    const dataset = subsResult.rows.map((r) => r.answers);

    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content:
            'You are an analytics assistant. Produce a concise executive summary (markdown, no JSON) of form submission data: key trends, common answers, sentiment if present, and notable outliers. Keep it under 300 words.',
        },
        {
          role: 'user',
          content: `Form title: ${title}\nSubmissions (JSON array):\n${JSON.stringify(dataset)}\n\nGenerate the executive summary.`,
        },
      ],
    });

    const summary = completion.choices[0]?.message?.content || '';
    res.json({ summary, totalSubmissions: subsResult.rows.length });
  } catch (err) {
    console.error('AI summarize error:', err.message);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

module.exports = router;
