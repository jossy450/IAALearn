# API Documentation

## Base URL

```
Development: http://localhost:3001/api
Production: https://yourdomain.com/api
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register

Create a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2026-01-19T10:00:00Z"
  },
  "token": "jwt_token_here"
}
```

### Login

Authenticate and receive access token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe"
  },
  "token": "jwt_token_here"
}
```

### Get Current User

Get authenticated user information.

**Endpoint:** `GET /auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2026-01-19T10:00:00Z",
    "last_login": "2026-01-19T11:00:00Z"
  }
}
```

---

## Session Endpoints

### Create Session

Start a new interview session.

**Endpoint:** `POST /sessions`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Frontend Developer Interview",
  "companyName": "Tech Corp",
  "position": "Senior Developer",
  "sessionType": "technical",
  "metadata": {
    "interviewer": "Jane Smith",
    "notes": "Focus on React and TypeScript"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Frontend Developer Interview",
    "company_name": "Tech Corp",
    "position": "Senior Developer",
    "session_type": "technical",
    "started_at": "2026-01-19T11:00:00Z",
    "status": "active",
    "total_questions": 0
  }
}
```

### Get All Sessions

Retrieve user's interview sessions.

**Endpoint:** `GET /sessions`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status (active, completed)

**Response:** `200 OK`
```json
{
  "sessions": [
    {
      "id": "uuid",
      "title": "Frontend Developer Interview",
      "company_name": "Tech Corp",
      "position": "Senior Developer",
      "started_at": "2026-01-19T11:00:00Z",
      "status": "active",
      "question_count": 5
    }
  ],
  "count": 1
}
```

### Get Session Details

Get detailed information about a specific session.

**Endpoint:** `GET /sessions/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "session": {
    "id": "uuid",
    "title": "Frontend Developer Interview",
    "company_name": "Tech Corp",
    "started_at": "2026-01-19T11:00:00Z",
    "status": "active",
    "questions": [
      {
        "id": "uuid",
        "question_text": "Tell me about yourself",
        "asked_at": "2026-01-19T11:05:00Z",
        "response_time_ms": 250
      }
    ]
  }
}
```

### End Session

Mark a session as completed.

**Endpoint:** `PATCH /sessions/:id/end`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "status": "completed",
    "ended_at": "2026-01-19T12:00:00Z",
    "duration_seconds": 3600
  }
}
```

### Delete Session

Permanently delete a session.

**Endpoint:** `DELETE /sessions/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Session deleted"
}
```

---

## Transcription Endpoints

### Transcribe Audio

Convert audio to text using OpenAI Whisper.

**Endpoint:** `POST /transcription/transcribe`

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body (Form Data):**
- `audio`: Audio file (webm, wav, mp3, ogg)
- `format`: Audio format (default: webm)

**Response:** `200 OK`
```json
{
  "success": true,
  "text": "Tell me about your experience with React",
  "duration": 1200,
  "timestamp": "2026-01-19T11:05:00Z"
}
```

### Check Transcription Status

Verify transcription service availability.

**Endpoint:** `GET /transcription/status`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "status": "operational",
  "service": "OpenAI Whisper",
  "timestamp": "2026-01-19T11:00:00Z"
}
```

---

## Answer Endpoints

### Generate Answer

Generate AI-powered answer for a question.

**Endpoint:** `POST /answers/generate`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "question": "What is your greatest strength?",
  "sessionId": "uuid",
  "research": false,
  "context": {
    "position": "Senior Developer",
    "company": "Tech Corp",
    "industry": "Software"
  }
}
```

**Response:** `200 OK`
```json
{
  "answer": "My greatest strength is my ability to quickly learn and adapt...",
  "cached": false,
  "responseTime": 2340,
  "source": "fast"
}
```

### Pre-Generate Answers

Generate answers for common interview questions.

**Endpoint:** `POST /answers/pre-generate`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "context": {
    "position": "Senior Developer",
    "company": "Tech Corp"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "generated": 10,
  "total": 10,
  "results": [
    {
      "question": "Tell me about yourself",
      "generated": true
    }
  ]
}
```

### Get Pre-Generated Answers

Retrieve user's pre-generated answers.

**Endpoint:** `GET /answers/pre-generated`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "answers": [
    {
      "id": "uuid",
      "category": "common",
      "question_pattern": "Tell me about yourself",
      "generated_answer": "I am a passionate software developer...",
      "usage_count": 3,
      "created_at": "2026-01-19T10:00:00Z"
    }
  ],
  "count": 10
}
```

### Search Cached Answers

Search for similar questions in cache.

**Endpoint:** `POST /answers/search`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "query": "strengths",
  "limit": 10
}
```

**Response:** `200 OK`
```json
{
  "results": [
    {
      "question_text": "What are your strengths?",
      "answer_text": "My strengths include...",
      "category": "behavioral",
      "hit_count": 15
    }
  ],
  "count": 3
}
```

---

## Cache Endpoints

### Get Cache Statistics

Retrieve cache performance metrics.

**Endpoint:** `GET /cache/stats`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "stats": {
    "total_entries": 150,
    "total_hits": 450,
    "avg_quality": "4.25",
    "used_entries": 120,
    "active_entries": 145
  },
  "topQuestions": [
    {
      "question_text": "Tell me about yourself",
      "hit_count": 45,
      "category": "common",
      "last_used_at": "2026-01-19T11:00:00Z"
    }
  ]
}
```

### Clear Expired Cache

Remove expired cache entries.

**Endpoint:** `POST /cache/clear-expired`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "cleared": 15
}
```

### Clear All Cache

Remove all cache entries.

**Endpoint:** `POST /cache/clear-all`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "cleared": 150
}
```

### Get Cache Performance

View cache performance over time.

**Endpoint:** `GET /cache/performance`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `days`: Number of days to retrieve (default: 7)

**Response:** `200 OK`
```json
{
  "performance": [
    {
      "date": "2026-01-19",
      "total_entries": 150,
      "total_hits": 450,
      "avg_quality": "4.25"
    }
  ]
}
```

---

## Analytics Endpoints

### Get User Analytics

Retrieve user's interview analytics.

**Endpoint:** `GET /analytics/user`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `period`: Days to analyze (7, 30, 90)

**Response:** `200 OK`
```json
{
  "sessionStats": {
    "total_sessions": 15,
    "avg_duration": 2400,
    "total_questions": 75,
    "completed_sessions": 12
  },
  "trends": [
    {
      "date": "2026-01-19",
      "sessions": 2,
      "avg_duration": 3000,
      "questions": 10
    }
  ],
  "responseStats": {
    "avg_response_time": 1500,
    "min_response_time": 250,
    "max_response_time": 4500,
    "p95_response_time": 3200
  }
}
```

### Get Session Analytics

Detailed analytics for specific session.

**Endpoint:** `GET /analytics/session/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "analytics": {
    "id": "uuid",
    "total_questions": 10,
    "avg_response_time": 1500,
    "actual_questions_count": 10,
    "metrics_count": 25
  },
  "questionDistribution": [
    {
      "minute": "2026-01-19T11:00:00Z",
      "question_count": 2,
      "avg_response_time": 1200
    }
  ]
}
```

### Export Session Data

Export session data for external use.

**Endpoint:** `GET /analytics/export/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "exportData": {
    "id": "uuid",
    "title": "Frontend Developer Interview",
    "started_at": "2026-01-19T11:00:00Z",
    "questions": [
      {
        "question": "Tell me about yourself",
        "asked_at": "2026-01-19T11:05:00Z",
        "response_time": 1500
      }
    ]
  },
  "exportedAt": "2026-01-19T12:00:00Z"
}
```

---

## Privacy Endpoints

### Get Privacy Settings

Retrieve user's privacy settings.

**Endpoint:** `GET /privacy`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "settings": {
    "id": "uuid",
    "user_id": "uuid",
    "disguise_mode": false,
    "disguise_theme": "productivity",
    "quick_hide_enabled": true,
    "quick_hide_key": "Escape",
    "auto_clear_history": false,
    "encryption_enabled": true
  }
}
```

### Update Privacy Settings

Modify privacy preferences.

**Endpoint:** `PATCH /privacy`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "disguiseMode": true,
  "disguiseTheme": "calendar",
  "quickHideEnabled": true,
  "autoClearHistory": true,
  "autoClearDays": 30
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "settings": {
    "disguise_mode": true,
    "disguise_theme": "calendar",
    "updated_at": "2026-01-19T12:00:00Z"
  }
}
```

### Clear History

Delete old session data.

**Endpoint:** `POST /privacy/clear-history`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "days": 30
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "cleared": 5
}
```

### Get Disguise Themes

List available disguise themes.

**Endpoint:** `GET /privacy/themes`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "themes": [
    {
      "id": "productivity",
      "name": "Productivity Dashboard",
      "description": "Looks like a task management app",
      "icon": "clipboard-list"
    }
  ]
}
```

---

## Mobile Endpoints

### Generate Connection Code

Create code for mobile pairing.

**Endpoint:** `POST /mobile/generate-code`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "sessionId": "uuid",
  "deviceType": "mobile"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "connectionCode": "123456",
  "expiresIn": 300,
  "mobileSession": {
    "id": "uuid",
    "connection_code": "123456",
    "connected_at": "2026-01-19T11:00:00Z"
  }
}
```

### Connect Mobile Device

Pair mobile device using code.

**Endpoint:** `POST /mobile/connect`

**Request Body:**
```json
{
  "connectionCode": "123456"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "session_id": "uuid",
    "title": "Frontend Developer Interview",
    "is_active": true
  }
}
```

### Disconnect Mobile Device

End mobile session.

**Endpoint:** `POST /mobile/disconnect`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "sessionId": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Disconnected successfully"
}
```

### Heartbeat

Keep mobile connection alive.

**Endpoint:** `POST /mobile/heartbeat`

**Request Body:**
```json
{
  "sessionId": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "last_heartbeat": "2026-01-19T11:05:00Z"
  }
}
```

### Get Mobile Sessions

List active mobile sessions.

**Endpoint:** `GET /mobile/sessions`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "sessions": [
    {
      "id": "uuid",
      "device_type": "mobile",
      "connected_at": "2026-01-19T11:00:00Z",
      "is_active": true
    }
  ]
}
```

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "Invalid input data"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Resource already exists"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

- **Window:** 15 minutes
- **Max Requests:** 100 per IP
- **Headers Returned:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `limit`: Number of results per page (default: 20, max: 100)
- `offset`: Number of results to skip (default: 0)

**Response includes:**
```json
{
  "data": [...],
  "count": 50,
  "limit": 20,
  "offset": 0
}
```

---

For more information, see the [main documentation](README.md).
