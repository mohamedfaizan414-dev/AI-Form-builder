const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/forms — create a new form (owned by the logged-in user)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, schema, theme } = req.body;
    const result = await pool.query(
      `INSERT INTO forms (user_id, title, description, schema, theme)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        req.userId,
        title || 'Untitled Form',
        description || '',
        JSON.stringify(schema || []),
        JSON.stringify(theme || { primaryColor: '#10b981', mode: 'dark' }),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create form error:', err.message);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

// GET /api/forms — list the logged-in user's forms (dashboard)
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, theme, created_at, updated_at
       FROM forms WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List forms error:', err.message);
    res.status(500).json({ error: 'Failed to list forms' });
  }
});

// GET /api/forms/:id — fetch a single form
// Public on purpose: this powers both the public fill-out page and the
// builder preview. No sensitive data lives in `schema`/`theme`.
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM forms WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Form not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch form error:', err.message);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

// PUT /api/forms/:id — update schema/title/theme (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const owns = await pool.query('SELECT user_id FROM forms WHERE id = $1', [id]);
    if (owns.rows.length === 0) return res.status(404).json({ error: 'Form not found' });
    if (owns.rows[0].user_id !== req.userId) return res.status(403).json({ error: 'Not your form' });

    const { title, description, schema, theme } = req.body;
    const result = await pool.query(
      `UPDATE forms SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        schema = COALESCE($3, schema),
        theme = COALESCE($4, theme)
       WHERE id = $5 RETURNING *`,
      [
        title,
        description,
        schema ? JSON.stringify(schema) : null,
        theme ? JSON.stringify(theme) : null,
        id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update form error:', err.message);
    res.status(500).json({ error: 'Failed to update form' });
  }
});

// DELETE /api/forms/:id (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const owns = await pool.query('SELECT user_id FROM forms WHERE id = $1', [id]);
    if (owns.rows.length === 0) return res.status(404).json({ error: 'Form not found' });
    if (owns.rows[0].user_id !== req.userId) return res.status(403).json({ error: 'Not your form' });

    await pool.query('DELETE FROM forms WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete form error:', err.message);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

// POST /api/forms/:id/submit — public submission endpoint (no auth: anyone with the link can respond)
router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers object is required' });
    }
    const formCheck = await pool.query('SELECT id FROM forms WHERE id = $1', [id]);
    if (formCheck.rows.length === 0) return res.status(404).json({ error: 'Form not found' });

    const result = await pool.query(
      `INSERT INTO submissions (form_id, answers) VALUES ($1, $2) RETURNING *`,
      [id, JSON.stringify(answers)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Submit form error:', err.message);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

// GET /api/forms/:id/submissions — list submissions for a form (owner only)
router.get('/:id/submissions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const owns = await pool.query('SELECT user_id FROM forms WHERE id = $1', [id]);
    if (owns.rows.length === 0) return res.status(404).json({ error: 'Form not found' });
    if (owns.rows[0].user_id !== req.userId) return res.status(403).json({ error: 'Not your form' });

    const result = await pool.query(
      'SELECT * FROM submissions WHERE form_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List submissions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

module.exports = router;
