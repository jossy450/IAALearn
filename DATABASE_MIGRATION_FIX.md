# Fix Database Migration on Render

## Problem
The `user_documents` table doesn't exist in your Render PostgreSQL database, causing:
- Error: `relation "user_documents" does not exist`
- Document uploads failing with 500 error

## Solution
Run the pending migration script on Render.

---

## Option 1: Run Migration via Render Shell (RECOMMENDED)

### Steps:
1. Go to your Render Dashboard: https://dashboard.render.com
2. Click on your **IAALearn** web service
3. Click the **Shell** tab (top right)
4. In the shell, run:
   ```bash
   node database/run_pending_migrations.js
   ```
5. You should see:
   ```
   🔄 Starting database migrations...
   📁 Found 6 migration files
   🔧 Running 004_add_user_documents_table.sql...
   ✅ Successfully executed 004_add_user_documents_table.sql
   ✨ Database migrations completed successfully!
   ```

---

## Option 2: Add to Build Command (AUTOMATIC)

### Update your Render Build Command:
Go to Render Dashboard → IAALearn → Settings → Build & Deploy

Change Build Command from:
```
npm install && npm run build
```

To:
```
npm install && npm run build && node database/run_pending_migrations.js
```

This will automatically run migrations on every deployment.

---

## Option 3: Run Locally (If you have Render DB credentials)

If you have the Render PostgreSQL connection string:

```bash
# Set the DATABASE_URL environment variable
$env:DATABASE_URL="your-render-postgres-url"

# Run migration
node database/run_pending_migrations.js
```

---

## Verify Migration Success

After running the migration, test by:
1. Go to https://iaalearn.onrender.com
2. Create a new session
3. Upload a CV - should work without errors now

---

## What the Migration Creates

The `004_add_user_documents_table.sql` migration creates:
- `user_documents` table with columns:
  - id (UUID)
  - user_id (references users table)
  - session_id (references interview_sessions table)
  - document_type ('cv' or 'job_description')
  - file_name, file_path, file_size, mime_type
  - content (TEXT - extracted document text)
  - is_active (BOOLEAN)
  - created_at, updated_at timestamps
- Indexes for fast lookups
- Trigger to auto-delete documents when session ends

---

## Troubleshooting

### If migration fails with "already exists" error:
The table might be partially created. Drop it first:
```sql
DROP TABLE IF EXISTS user_documents CASCADE;
```
Then run the migration again.

### If you see "permission denied":
Your database user needs CREATE TABLE permissions. Contact Render support or use the database owner credentials.

---

## After Migration

Once complete:
1. Document upload will work ✅
2. Files will be stored per-session ✅
3. Auto-cleanup when session ends ✅
4. CV and Job Description can be used by AI for better answers ✅
