const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer memory storage for multi-part parsing
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Helper function to handle Cloudinary streaming uploads
const uploadToCloudinary = (fileBuffer, fieldId) => {
  return new Promise((resolve, reject) => {
    const cld_upload_stream = cloudinary.uploader.upload_stream(
      {
        folder: 'formix_submissions',
        resource_type: 'auto',
        public_id: `${fieldId}_${Date.now()}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          name: result.original_filename,
          size: result.bytes,
          format: result.format,
          resource_type: result.resource_type
        });
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(cld_upload_stream);
  });
};

// POST /api/forms — create a new form
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

// GET /api/forms — list the logged-in user's forms
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

// PUT /api/forms/:id — update form (owner only)
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

// POST /api/forms/:id/submit — supports public multi-part form payloads with asset streaming files to Cloudinary
router.post('/:id/submit', upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if form exists
    const formCheck = await pool.query('SELECT id, schema FROM forms WHERE id = $1', [id]);
    if (formCheck.rows.length === 0) return res.status(404).json({ error: 'Form not found' });

    // Parse text answers object from incoming structure
    let parsedAnswers = {};
    if (req.body.answers && typeof req.body.answers === 'string') {
      parsedAnswers = JSON.parse(req.body.answers);
    } else if (req.body.answers && typeof req.body.answers === 'object') {
      parsedAnswers = req.body.answers;
    } else if (req.body) {
      parsedAnswers = { ...req.body };
    }

    // Upload files to Cloudinary and append meta payloads directly inside answers
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Multer appends fieldname using the distinct field slug configured in form schema layout
        const uploadDetails = await uploadToCloudinary(file.buffer, file.fieldname);
        parsedAnswers[file.fieldname] = uploadDetails;
      }
    }

    const result = await pool.query(
      `INSERT INTO submissions (form_id, answers) VALUES ($1, $2) RETURNING *`,
      [id, JSON.stringify(parsedAnswers)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Submit form error:', err.message);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

// GET /api/forms/:id/submissions — list responses
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