#!/bin/bash
# Run database migrations

echo "Running database migrations..."

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL not installed. Skipping migration."
    exit 0
fi

# Run migration
psql -U postgres -d interview_assistant -f migrations/003_add_session_transfers.sql

if [ $? -eq 0 ]; then
    echo "✅ Session transfers migration completed successfully!"
else
    echo "❌ Migration failed. Database may not be running."
    echo "Run this manually later: psql -U postgres -d interview_assistant -f database/migrations/003_add_session_transfers.sql"
fi
