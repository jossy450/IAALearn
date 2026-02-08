const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
(async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create upload directory:', err);
  }
})();

// Secure file upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure filename to prevent directory traversal
    const uniqueName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueName}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Whitelist allowed MIME types
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    // Validate file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.pdf', '.doc', '.docx'];
    
    if (!validExtensions.includes(ext)) {
      return cb(new Error('INVALID_FORMAT'));
    }

    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('INVALID_FORMAT'));
    }

    cb(null, true);
  }
});

// Helper function to extract text from uploaded file
const extractTextFromFile = async (filePath, mimeType) => {
  try {
    if (mimeType === 'text/plain') {
      const content = await fs.readFile(filePath, 'utf8');
      return content.substring(0, 50000);
    }
    if (mimeType === 'application/pdf') {
      const data = await fs.readFile(filePath);
      const pdfData = await pdfParse(data);
      return pdfData.text.substring(0, 50000);
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const data = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: data });
      return result.value.substring(0, 50000);
    }
    // Fallback: return empty string
    return '';
  } catch (error) {
    return '';
  }
};

// Upload CV or Job Description
router.post('/upload/:documentType', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const { documentType } = req.params;
    const userId = req.user.id;
    const file = req.file;

    // Validate document type
    if (!['cv', 'job_description', 'person_specification'].includes(documentType)) {
      if (file?.path) await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ 
        error: 'Invalid document type',
        allowedFormats: ['pdf', 'doc', 'docx']
      });
    }

    if (!file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        allowedFormats: ['pdf', 'doc', 'docx']
      });
    }

    // Get or create active session for user
    let sessionResult = await query(
      `SELECT id FROM interview_sessions 
       WHERE user_id = $1 AND status = 'active' 
       ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );

    let sessionId = null;
    if (sessionResult.rows.length > 0) {
      sessionId = sessionResult.rows[0].id;
    } else {
      // Create a new session for document uploads
      const newSession = await query(
        `INSERT INTO interview_sessions (user_id, title, session_type, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, 'Document Upload Session', 'document_upload', 'active']
      );
      sessionId = newSession.rows[0].id;
    }

    // Extract text content from file
    const content = await extractTextFromFile(file.path, file.mimetype);

    // Deactivate previous documents of same type in this session
    await query(
      `UPDATE user_documents 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND session_id = $2 AND document_type = $3`,
      [userId, sessionId, documentType]
    );

    // Insert new document
    const result = await query(
      `INSERT INTO user_documents (user_id, session_id, document_type, file_name, file_path, file_size, mime_type, content)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, file_name, file_size, created_at`,
      [userId, sessionId, documentType, file.originalname, file.path, file.size, file.mimetype, content]
    );

    const document = result.rows[0];

    res.json({
      success: true,
      message: `${documentType === 'cv' ? 'CV' : 'Job Description'} uploaded successfully`,
      document: {
        id: document.id,
        type: documentType,
        fileName: document.file_name,
        fileSize: document.file_size,
        uploadedAt: document.created_at,
        sessionId: sessionId
      }
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    // Handle specific errors
    if (error.message === 'INVALID_FORMAT') {
      return res.status(400).json({ 
        error: 'Invalid file format. Please upload PDF, DOC, or DOCX files only.',
        allowedFormats: ['pdf', 'doc', 'docx']
      });
    }
    
    next(error);
  }
});

// Multer error handler
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File size too large. Maximum size is 5MB.',
        allowedFormats: ['pdf', 'doc', 'docx']
      });
    }
    return res.status(400).json({ 
      error: error.message,
      allowedFormats: ['pdf', 'doc', 'docx']
    });
  }
  
  if (error.message === 'INVALID_FORMAT') {
    return res.status(400).json({ 
      error: 'Invalid file format. Please upload PDF, DOC, or DOCX files only.',
      allowedFormats: ['pdf', 'doc', 'docx']
    });
  }
  
  next(error);
});

// Get user's documents
router.get('/documents', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, document_type, file_name, file_size, mime_type, created_at, updated_at
       FROM user_documents
       WHERE user_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [userId]
    );

    const documents = result.rows.reduce((acc, doc) => {
      acc[doc.document_type] = {
        id: doc.id,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        uploadedAt: doc.created_at,
        updatedAt: doc.updated_at
      };
      return acc;
    }, {});

    res.json({ documents });
  } catch (error) {
    next(error);
  }
});

// Get specific document details with content
router.get('/documents/:documentType', authenticate, async (req, res, next) => {
  try {
    const { documentType } = req.params;
    const userId = req.user.id;

    const result = await query(
      `SELECT id, document_type, file_name, file_size, content, created_at
       FROM user_documents
       WHERE user_id = $1 AND document_type = $2 AND is_active = true
       LIMIT 1`,
      [userId, documentType]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = result.rows[0];

    // Log the view action
    await query(
      `INSERT INTO document_audit_logs (user_id, action, document_id, document_type)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'view', document.id, documentType]
    );

    res.json({
      document: {
        id: document.id,
        type: document.document_type,
        fileName: document.file_name,
        fileSize: document.file_size,
        content: document.content,
        uploadedAt: document.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete document
router.delete('/documents/:documentId', authenticate, async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const docResult = await query(
      'SELECT id, document_type FROM user_documents WHERE id = $1 AND user_id = $2',
      [documentId, userId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docResult.rows[0];

    // Soft delete
    await query(
      'UPDATE user_documents SET is_active = false WHERE id = $1',
      [documentId]
    );

    // Clear user reference if needed
    const columnName = doc.document_type === 'cv' ? 'cv_document_id' : 'job_description_document_id';
    await query(
      `UPDATE users SET ${columnName} = NULL WHERE id = $1 AND ${columnName} = $2`,
      [userId, documentId]
    );

    // Log deletion
    await query(
      `INSERT INTO document_audit_logs (user_id, action, document_id, document_type)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'delete', documentId, doc.document_type]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get document upload status for user
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT 
        COUNT(CASE WHEN document_type = 'cv' AND is_active THEN 1 END) as has_cv,
        COUNT(CASE WHEN document_type = 'job_description' AND is_active THEN 1 END) as has_job_description
       FROM user_documents
       WHERE user_id = $1`,
      [userId]
    );

    const status = result.rows[0];

    res.json({
      documents: {
        cv: status.has_cv > 0,
        jobDescription: status.has_job_description > 0
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
