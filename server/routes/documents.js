const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Secure file upload configuration
const uploadDir = path.join(__dirname, '../uploads');
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
    fileSize: 5 * 1024 * 1024 // 5MB limit (reduced from 10MB)
  },
  fileFilter: (req, file, cb) => {
    // Whitelist allowed MIME types
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    // Validate document type parameter
    const { documentType } = req.params;
    if (!['cv', 'job_description'].includes(documentType)) {
      return cb(new Error('Invalid document type'));
    }
    
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT are allowed.'));
    }

    // Validate file extension matches MIME type
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    if (!validExtensions.includes(ext)) {
      return cb(new Error('Invalid file extension'));
    }

    cb(null, true);
  }
});

// Helper function to extract text from uploaded file
const extractTextFromFile = async (filePath, mimeType) => {
  try {
    if (mimeType === 'text/plain') {
      const content = await fs.readFile(filePath, 'utf8');
      // Limit extracted text to prevent DoS
      return content.substring(0, 50000);
    }
    // For PDF and Office docs, you would use libraries like pdf-parse or mammoth
    // For now, return a placeholder - these would need to be implemented
    return '[Document content extraction for this format not yet implemented]';
  } catch (error) {
    // Don't expose detailed error information
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
