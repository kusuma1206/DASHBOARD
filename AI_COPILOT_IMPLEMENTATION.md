# AI Copilot Implementation Guide

## Overview

The **AI Copilot** is an intelligent chatbot embedded inside the Tutor Dashboard. It serves as a **course-wide intelligent assistant** that helps tutors understand their learners' progress, engagement, and behavior patterns by analyzing data from the database.

## Core Principles

### 1. **READ-ONLY Operations**
- The AI Copilot performs **ONLY** `SELECT` queries
- **NEVER** performs `INSERT`, `UPDATE`, `DELETE`, or schema changes
- This is purely an analytics and reasoning tool

### 2. **Course-Scoped Data Access**
- `course_id` is **MANDATORY** for every query
- Can fetch data across **ALL COHORTS** within the same course
- **NEVER** accesses or infers data from other courses
- Learners may belong to different cohorts but must belong to the same course

### 3. **Data-Driven Reasoning**
- Uses ONLY provided data from the database
- Never invents or assumes data
- Provides specific, evidence-based answers
- Clearly states when data is insufficient

---

## Architecture

### Backend Components

#### 1. **API Endpoint**
**File**: `backend-tutor/src/routes/tutors.ts`

**Endpoint**: `POST /api/tutors/assistant/query`

**Request Body**:
```json
{
  "courseId": "string (required)",
  "cohortId": "string (optional)",
  "question": "string (required)"
}
```

**Response**:
```json
{
  "answer": "string"
}
```

**Authentication**: Requires tutor authentication via `requireAuth` and `requireTutor` middleware

**Authorization**: Verifies tutor is assigned to the course via `isTutorForCourse()`

#### 2. **Data Snapshot Builder**
**File**: `backend-tutor/src/services/tutorInsights.ts`

**Function**: `buildTutorCourseSnapshot(courseId: string, cohortId?: string)`

**What it fetches**:
- Course details (title, slug, description)
- All cohorts for the course
- All enrollments (course-wide or cohort-specific)
- Module progress for all learners
- Recent telemetry/activity events
- Cohort summaries with average completion rates

**Returns**: `TutorCourseSnapshot` object containing:
```typescript
{
  course: {
    courseId: string;
    title: string;
    slug: string;
    description?: string | null;
  };
  cohorts: CohortSummary[];
  selectedCohort?: {
    cohortId: string;
    name: string;
    memberCount: number;
  };
  stats: {
    totalEnrollments: number;
    newThisWeek: number;
    averageCompletion: number;
    activeThisWeek: number;
    atRiskLearners: number;
  };
  learners: TutorLearnerSnapshot[];
  allCohortLearners: Map<string, TutorLearnerSnapshot[]>;
}
```

#### 3. **Data Formatter**
**File**: `backend-tutor/src/services/tutorInsights.ts`

**Function**: `formatTutorSnapshot(snapshot: TutorCourseSnapshot)`

**Purpose**: Converts the snapshot into a structured text format optimized for AI processing

**Format**:
```
Course: [Course Title] (slug: [slug])
Description: [description]

Cohorts (X total):
1. [COHORT] Cohort Name (active) – X members, Y% COHORT AVERAGE completion. Starts: Date.
   Student Names in this cohort: Name1, Name2, Name3...

Currently viewing: [Cohort Name or "all enrollments"]

Stats for [context]: total learners X, new this week Y, GROUP AVERAGE completion Z%, active in last 7 days A, at risk B.

Detailed roster for [context] (top 40):
[RECORD] name="Learner Name" email="email@example.com" cohort="Cohort Name" progress="X%" count="Y/Z" enrolled="Date" last_active="Date" signals="event1 | event2 | event3"
```

#### 4. **AI Processing**
**File**: `backend-tutor/src/rag/openAiClient.ts`

**Function**: `generateTutorCopilotAnswer(prompt: string)`

**Model**: Uses OpenAI's GPT model (configured via `LLM_MODEL` env variable)

**Temperature**: 0.15 (low temperature for consistent, factual responses)

**System Prompt**: Comprehensive instructions for the AI (see below)

---

## AI Copilot Workflow

The AI follows a **5-step workflow** for every question:

### Step 1: Understand Intent
Identifies the tutor's intent:
- Course analytics (overall course performance)
- Cohort analytics (specific cohort or cross-cohort comparison)
- Learner progress (individual or group progress)
- Learner comparison (comparing learners across cohorts)
- Live monitoring (recent activity, engagement)
- Behavior analysis ("why" questions, friction points)

### Step 2: Extract Context
Extracts from the question:
- **Mandatory**: `course_id`
- **Optional**: learner name(s), cohort name(s), module name(s)

### Step 3: Fetch Data (READ-ONLY)
Fetches only required data:
- Module completion
- Course and cohort analytics
- Learner progress
- Live monitoring data
- Alerts and behavior indicators

All queries are scoped by `course_id`.

### Step 4: Reason and Analyze
- For **normal questions**: Answers using fetched data
- For **cross-cohort comparisons**: Fetches each learner's data separately and compares side-by-side
- For **"why" questions**: Analyzes learner behavior, monitoring data, and signals to explain reasons
- Never guesses; states clearly if data is insufficient

### Step 5: Respond
- Answers only what the tutor asked
- Uses clear, concise language
- Labels learners, cohorts, and metrics when comparing
- Uses bullet points and structured format for complex answers
- Always cites specific numbers, names, and percentages

---

## Guardrails

The AI Copilot enforces strict guardrails:

1. **No Assumptions**: Does not assume a cohort unless explicitly mentioned
2. **Clarification**: Asks clarifying questions if the request is ambiguous
3. **Course Boundary**: Refuses if a learner does not belong to the active course
4. **Read-Only**: Never modifies data
5. **Data Fidelity**: Uses ONLY provided data; never invents or assumes
6. **Exact Matching**: Searches for `[RECORD] name="Learner Name"` in the roster
7. **Precise Quoting**: Quotes exact percentages and module counts
8. **Signal Analysis**: For "why" questions, analyzes the `signals` field
9. **Transparency**: States when signals or data are missing

---

## Example Use Cases

### Example 1: Individual Learner Progress
**Question**: "What is the progress of Brave Browser?"

**AI Process**:
1. Intent: Learner progress
2. Context: learner_name = "Brave Browser"
3. Data: Searches roster for `[RECORD] name="Brave Browser"`
4. Analysis: Extracts `progress="12%" count="1/8"`
5. Response: "Brave Browser has completed 1 out of 8 modules (12% progress)."

### Example 2: Behavior Analysis ("Why" Question)
**Question**: "Why did Brave Browser perform low?"

**AI Process**:
1. Intent: Behavior analysis
2. Context: learner_name = "Brave Browser"
3. Data: Finds `[RECORD] name="Brave Browser"` with `signals="tab_hidden after lesson view | quiz_failed"`
4. Analysis: Identifies friction points from signals
5. Response: "Brave Browser has a completion rate of 12% (1/8 modules). Recent signals show: 'tab_hidden after lesson view' and 'quiz_failed', suggesting they may be distracted during lessons and struggling with quiz content."

### Example 3: Cross-Cohort Comparison
**Question**: "Compare learners in Cohort 1 and Cohort 2"

**AI Process**:
1. Intent: Cohort analytics (cross-cohort comparison)
2. Context: cohort_names = ["Cohort 1", "Cohort 2"]
3. Data: Fetches data for both cohorts separately
4. Analysis: Compares cohort averages and individual learner details
5. Response:
   ```
   **Cohort 1** (15 members):
   - Average completion: 65%
   - At-risk learners: 3 (20%)
   - Top performer: John Doe (95%)

   **Cohort 2** (12 members):
   - Average completion: 48%
   - At-risk learners: 7 (58%)
   - Top performer: Jane Smith (82%)

   Cohort 1 is performing significantly better with a 17% higher average completion rate.
   ```

### Example 4: Course-Wide Analytics
**Question**: "How many students are enrolled in this course?"

**AI Process**:
1. Intent: Course analytics
2. Context: course_id (from request)
3. Data: Fetches total enrollments from stats
4. Analysis: Reads `stats.totalEnrollments`
5. Response: "There are 27 students enrolled in this course across 2 cohorts."

### Example 5: At-Risk Learners
**Question**: "Who are the at-risk learners?"

**AI Process**:
1. Intent: Live monitoring
2. Context: course_id
3. Data: Filters learners with `progress < 50%`
4. Analysis: Identifies at-risk learners
5. Response:
   ```
   There are 5 at-risk learners (< 50% completion):
   - Brave Browser: 12% (1/8 modules)
   - Alice Johnson: 25% (2/8 modules)
   - Bob Smith: 37% (3/8 modules)
   - Carol White: 43% (3/8 modules)
   - David Brown: 50% (4/8 modules)
   ```

---

## Database Schema (Read-Only Access)

The AI Copilot reads from the following tables:

### 1. **courses**
- `course_id` (UUID, primary key)
- `course_name` (string)
- `slug` (string)
- `description` (text, nullable)

### 2. **cohorts**
- `cohort_id` (UUID, primary key)
- `course_id` (UUID, foreign key)
- `name` (string)
- `is_active` (boolean)
- `starts_at` (timestamp, nullable)
- `ends_at` (timestamp, nullable)
- `created_at` (timestamp)

### 3. **cohort_members**
- `member_id` (UUID, primary key)
- `cohort_id` (UUID, foreign key)
- `user_id` (UUID, nullable, foreign key)
- `email` (string)
- `added_at` (timestamp)
- `status` (string)

### 4. **enrollments**
- `enrollment_id` (UUID, primary key)
- `course_id` (UUID, foreign key)
- `user_id` (UUID, foreign key)
- `enrolled_at` (timestamp)
- `status` (string)

### 5. **users**
- `user_id` (UUID, primary key)
- `full_name` (string)
- `email` (string)

### 6. **module_progress**
- `user_id` (UUID)
- `course_id` (UUID)
- `module_no` (integer)
- `quiz_passed` (boolean)
- `updated_at` (timestamp, nullable)

### 7. **learner_activity_events**
- `user_id` (UUID)
- `course_id` (UUID)
- `event_type` (string)
- `status_reason` (string, nullable)
- `created_at` (timestamp)

### 8. **topics**
- `course_id` (UUID)
- `module_no` (integer)

---

## Configuration

### Environment Variables

**File**: `backend-tutor/.env`

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...
LLM_MODEL=gpt-3.5-turbo
EMBEDDING_MODEL=text-embedding-3-small

# Database
DATABASE_URL=postgresql://...

# Server
PORT=4000
NODE_ENV=development
```

### Rate Limiting

The AI Copilot endpoint does **NOT** have rate limiting by default (unlike the email endpoint).

If you need to add rate limiting:

```typescript
import { rateLimit } from "express-rate-limit";

const copilotRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: { message: "Too many AI copilot requests, please try again later" },
});

tutorsRouter.post(
  "/assistant/query",
  requireAuth,
  requireTutor,
  copilotRateLimiter, // Add this middleware
  asyncHandler(async (req, res) => {
    // ... existing code
  })
);
```

---

## Testing the AI Copilot

### 1. **Start the Backend Server**

```bash
cd backend-tutor/backend-tutor
npm install
npm run dev
```

### 2. **Test with cURL**

```bash
# Login as tutor
curl -X POST http://localhost:4000/api/tutors/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tutor@example.com",
    "password": "your_password"
  }'

# Copy the accessToken from the response

# Query the AI Copilot
curl -X POST http://localhost:4000/api/tutors/assistant/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "courseId": "your-course-id",
    "question": "How many students are enrolled?"
  }'
```

### 3. **Test from Frontend**

```javascript
// Example API call from frontend
const response = await fetch('http://localhost:4000/api/tutors/assistant/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    courseId: selectedCourseId,
    cohortId: selectedCohortId, // optional
    question: userQuestion
  })
});

const data = await response.json();
console.log(data.answer);
```

---

## Troubleshooting

### Issue 1: "Tutor is not assigned to this course"
**Cause**: The authenticated tutor is not assigned to the requested course.

**Solution**: Verify the tutor-course assignment in the `course_tutors` table:
```sql
SELECT * FROM course_tutors 
WHERE tutor_id = (SELECT tutor_id FROM tutors WHERE user_id = 'USER_ID')
AND course_id = 'COURSE_ID'
AND is_active = true;
```

### Issue 2: AI returns generic answers
**Cause**: The snapshot data may be incomplete or the AI is not finding the specific data.

**Solution**: 
1. Check the console logs for `[ASSISTANT DEBUG]` messages
2. Verify the snapshot contains the expected data
3. Ensure the roster format matches the expected `[RECORD]` format

### Issue 3: "OpenAI did not return a chat completion"
**Cause**: OpenAI API error or invalid API key.

**Solution**:
1. Verify `OPENAI_API_KEY` in `.env` is valid
2. Check OpenAI API status
3. Review OpenAI API usage limits

### Issue 4: Slow response times
**Cause**: Large datasets or complex queries.

**Solution**:
1. Limit the roster to top 40 learners (already implemented)
2. Consider caching snapshots for frequently accessed courses
3. Optimize database queries with proper indexes

---

## Future Enhancements

### 1. **Conversation History**
Store conversation history to enable multi-turn conversations:
```typescript
{
  "courseId": "...",
  "question": "...",
  "conversationHistory": [
    { "role": "user", "content": "How many students?" },
    { "role": "assistant", "content": "There are 27 students." },
    { "role": "user", "content": "How many are at risk?" }
  ]
}
```

### 2. **Proactive Insights**
Generate weekly summaries and alerts:
- "5 new learners joined this week"
- "3 learners have been inactive for 7+ days"
- "Cohort 2's average completion dropped by 10%"

### 3. **Predictive Analytics**
Use machine learning to predict:
- Learners at risk of dropping out
- Estimated completion dates
- Optimal intervention timing

### 4. **Natural Language to SQL**
Allow tutors to ask complex queries:
- "Show me learners who completed module 3 but failed module 4"
- "Which cohort has the highest quiz pass rate?"

### 5. **Export Reports**
Generate downloadable reports:
- PDF summaries
- CSV exports
- Charts and visualizations

---

## Security Considerations

1. **Authentication**: All requests require valid JWT tokens
2. **Authorization**: Tutors can only access courses they're assigned to
3. **Data Isolation**: Strict `course_id` scoping prevents cross-course data leaks
4. **Read-Only**: No write operations prevent accidental data modification
5. **Input Sanitization**: Questions are trimmed and validated
6. **Rate Limiting**: Consider adding rate limiting for production

---

## Conclusion

The AI Copilot is a powerful, intelligent assistant that helps tutors understand their learners' progress and behavior patterns. By following strict READ-ONLY principles and course-scoped data access, it provides accurate, data-driven insights while maintaining data integrity and security.

For questions or issues, please refer to the conversation history or contact the development team.
