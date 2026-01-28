const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, DOC, DOCX, TXT
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT are allowed.'));
    }
  }
});

// Helper function to extract text from uploaded file
const extractTextFromFile = async (filePath, mimeType) => {
  try {
    if (mimeType === 'text/plain') {
      return await fs.readFile(filePath, 'utf8');
    }
    // For PDF and Office docs, you would use libraries like pdf-parse or mammoth
    // For now, return a placeholder - these would need to be implemented
    return `[Document content extraction for ${mimeType} not yet implemented]`;
  } catch (error) {
    console.error('Error extracting text:', error);
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
    if (!['cv', 'job_description'].includes(documentType)) {
      await fs.unlink(file.path);
      return res.status(400).json({ error: 'Invalid document type' });
    }

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract text content from file
    const content = await extractTextFromFile(file.path, file.mimetype);

    // Deactivate previous document of same type
    await query(
      'UPDATE user_documents SET is_active = false WHERE user_id = $1 AND document_type = $2',
      [userId, documentType]
    );

    // Insert new document
    const result = await query(
      `INSERT INTO user_documents (user_id, document_type, file_name, file_size, mime_type, content)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, file_name, file_size, created_at`,
      [userId, documentType, file.originalname, file.size, file.mimetype, content]
    );

    const document = result.rows[0];

    // Update user document references
    const columnName = documentType === 'cv' ? 'cv_document_id' : 'job_description_document_id';
    await query(
      `UPDATE users SET ${columnName} = $1 WHERE id = $2`,
      [document.id, userId]
    );

    // Log the upload action
    await query(
      `INSERT INTO document_audit_logs (user_id, action, document_id, document_type, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'upload', document.id, documentType, JSON.stringify({ fileName: file.originalname, size: file.size })]
    );

    res.json({
      success: true,
      document: {
        id: document.id,
        type: documentType,
        fileName: document.file_name,
        fileSize: document.file_size,
        uploadedAt: document.created_at
      }
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    next(error);
  }
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
