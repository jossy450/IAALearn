# Document Upload Fixes - v2.4.0

## Overview
Fixed document upload system with session-based storage, proper file validation, and automatic cleanup.

## Changes Made

### 1. Database Schema
**File:** `server/database/schema.sql`
- ✅ Added `user_documents` table with session-based storage
- ✅ Documents linked to `session_id` for automatic cleanup
- ✅ Unique constraint per user/session/document_type
- ✅ Auto-delete trigger when session ends (status = 'completed')

**Migration:** `database/migrations/004_add_user_documents_table.sql`

### 2. File Upload Validation
**File:** `server/routes/documents.js`

#### Allowed Formats
- ✅ **PDF** (.pdf) - `application/pdf`
- ✅ **DOC** (.doc) - `application/msword`
- ✅ **DOCX** (.docx) - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- ❌ **TXT removed** (unreliable parsing)

#### File Size Limit
- **Maximum:** 5MB per file

#### Error Messages
- Invalid format: "Invalid file format. Please upload PDF, DOC, or DOCX files only."
- File too large: "File size too large. Maximum size is 5MB."
- With `allowedFormats` array in response for client reference

### 3. Session-Based Storage
**Behavior:**
1. Upload creates/uses active session automatically
2. Documents linked to current session
3. When session ends → documents marked inactive
4. Storage saved automatically

**Session Types:**
- `document_upload` - Auto-created for uploads
- Linked to existing `active` sessions when available

### 4. Frontend Updates
**File:** `client/src/pages/Settings.jsx`

#### Client-Side Validation
- ✅ File extension check before upload (`.pdf`, `.doc`, `.docx`)
- ✅ File size check (5MB max)
- ✅ Alert messages for validation errors
- ✅ Server error messages displayed to user

#### UI Improvements
- **Format Display:** "Accepted formats: PDF, DOC, DOCX (max 5MB)"
- **Status Messages:**
  - Uploading: "Uploading..."
  - Success: "✓ Uploaded"
  - Error: "✗ Failed - Try Again"
- **Info Text:** Explains session-based cleanup

**File:** `client/src/pages/Settings.css`
- Added `.upload-format` styling for format text
- Enhanced `.help-text` with proper paragraph spacing

### 5. Upload Directory
**File:** `server/routes/documents.js`
- Auto-creates `server/uploads/` directory if missing
- Prevents runtime errors on first upload

## Migration Instructions

### Run Migration
```bash
# Connect to your PostgreSQL database
psql -U postgres -d interview_assistant

# Run migration
\i database/migrations/004_add_user_documents_table.sql
```

### Or via npm
```bash
npm run migrate
```

## API Changes

### Upload Endpoint
**POST** `/api/documents/upload/:documentType`

**Parameters:**
- `documentType`: `cv` or `job_description`

**Request:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <PDF/DOC/DOCX file>
```

**Success Response:**
```json
{
  "success": true,
  "message": "CV uploaded successfully",
  "document": {
    "id": "uuid",
    "type": "cv",
    "fileName": "resume.pdf",
    "fileSize": 123456,
    "uploadedAt": "2026-01-28T16:30:00Z",
    "sessionId": "session-uuid"
  }
}
```

**Error Response:**
```json
{
  "error": "Invalid file format. Please upload PDF, DOC, or DOCX files only.",
  "allowedFormats": ["pdf", "doc", "docx"]
}
```

## User Experience

### Before Login
- ❌ Upload not available (requires authentication)

### After Login
1. Navigate to **Settings** page
2. Find **"Personalization Documents"** section
3. Upload CV/Resume (PDF, DOC, or DOCX)
4. Upload Job Description (PDF, DOC, or DOCX)
5. Documents saved to current session
6. When session ends → documents auto-deleted

### Storage Management
- **Automatic cleanup** when session completes
- **No manual deletion** needed by users
- **Storage optimized** automatically

## Technical Details

### Database Trigger
```sql
CREATE OR REPLACE FUNCTION delete_session_documents()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE user_documents 
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE session_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Security Features
- ✅ Secure random filenames (crypto-generated)
- ✅ MIME type validation
- ✅ Extension validation
- ✅ File size limit (5MB)
- ✅ User authentication required
- ✅ SQL injection protection (parameterized queries)

## Testing Checklist

- [ ] Upload PDF CV - should succeed
- [ ] Upload DOCX job description - should succeed
- [ ] Upload TXT file - should fail with format error
- [ ] Upload 6MB file - should fail with size error
- [ ] Upload without login - should fail with 401
- [ ] End session - documents should be marked inactive
- [ ] UI shows correct error messages
- [ ] UI shows format requirements

## Version
**2.4.0** - Document Upload Fixes

## Deployment Steps

1. **Update database schema:**
   ```bash
   npm run migrate
   # or manually run 004_add_user_documents_table.sql
   ```

2. **Deploy backend changes:**
   - Updated schema
   - Updated routes/documents.js
   - Uploads directory creation

3. **Deploy frontend changes:**
   - Updated Settings.jsx
   - Updated Settings.css
   - Version bump to 2.4.0

4. **Verify on production:**
   - Test document uploads
   - Check error messages
   - Verify session cleanup

## Notes

- Documents are session-scoped for privacy and storage efficiency
- Previous implementation referenced non-existent tables
- TXT format removed due to unreliable parsing
- Upload directory auto-created on server start
- Multer handles file uploads with security validation

## Related Files

- `server/database/schema.sql` - Main schema with user_documents table
- `database/migrations/004_add_user_documents_table.sql` - Migration script
- `server/routes/documents.js` - Upload endpoint and validation
- `client/src/pages/Settings.jsx` - Upload UI and client validation
- `client/src/pages/Settings.css` - Upload styling
- `package.json` - Version 2.4.0
- `client/package.json` - Version 2.4.0
- `client/index.html` - Build version 2.4.0
