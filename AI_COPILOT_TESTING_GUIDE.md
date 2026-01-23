# AI Copilot Quick Testing Guide

## Quick Start

### 1. Start the Backend Server
```bash
cd c:\Users\pnawa\OneDrive\Desktop\dashboard2\backend-tutor\backend-tutor
npm run dev
```

### 2. Test Endpoint
**URL**: `http://localhost:4000/api/tutors/assistant/query`

**Method**: `POST`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body**:
```json
{
  "courseId": "your-course-id",
  "cohortId": "optional-cohort-id",
  "question": "Your question here"
}
```

---

## Sample Test Questions

### ✅ Test 1: Course-Wide Analytics
```json
{
  "courseId": "your-course-id",
  "question": "How many students are enrolled in this course?"
}
```
**Expected**: Total enrollment count across all cohorts

---

### ✅ Test 2: Individual Learner Progress
```json
{
  "courseId": "your-course-id",
  "question": "What is the progress of [Learner Name]?"
}
```
**Expected**: Exact percentage and module count (e.g., "12% and 1/8 modules")

---

### ✅ Test 3: "Why" Question (Behavior Analysis)
```json
{
  "courseId": "your-course-id",
  "question": "Why did [Learner Name] perform low?"
}
```
**Expected**: Analysis of signals field with specific events

---

### ✅ Test 4: Cross-Cohort Comparison
```json
{
  "courseId": "your-course-id",
  "question": "Compare learners in Cohort 1 and Cohort 2"
}
```
**Expected**: Side-by-side comparison with cohort averages

---

### ✅ Test 5: At-Risk Learners
```json
{
  "courseId": "your-course-id",
  "question": "Who are the at-risk learners?"
}
```
**Expected**: List of learners with < 50% completion

---

### ✅ Test 6: Cohort-Specific Query
```json
{
  "courseId": "your-course-id",
  "cohortId": "specific-cohort-id",
  "question": "How many students are in this cohort?"
}
```
**Expected**: Count for the specific cohort only

---

### ✅ Test 7: Top Performers
```json
{
  "courseId": "your-course-id",
  "question": "Who is the top performer?"
}
```
**Expected**: Learner with highest completion percentage

---

### ✅ Test 8: Recent Activity
```json
{
  "courseId": "your-course-id",
  "question": "Who has been active in the last 7 days?"
}
```
**Expected**: List of learners with recent activity

---

### ✅ Test 9: Module-Specific Progress
```json
{
  "courseId": "your-course-id",
  "question": "How many students have completed module 3?"
}
```
**Expected**: Count of learners who completed module 3

---

### ✅ Test 10: Ambiguous Query (Should Ask for Clarification)
```json
{
  "courseId": "your-course-id",
  "question": "How are students doing?"
}
```
**Expected**: Clarifying question OR course-wide summary

---

## Expected Response Format

### Success Response
```json
{
  "answer": "There are 27 students enrolled in this course across 2 cohorts."
}
```

### Error Responses

#### 400 - Missing courseId
```json
{
  "message": "courseId is required"
}
```

#### 400 - Missing question
```json
{
  "message": "question is required"
}
```

#### 401 - Unauthorized
```json
{
  "message": "Unauthorized"
}
```

#### 403 - Not Assigned to Course
```json
{
  "message": "Tutor is not assigned to this course"
}
```

#### 500 - AI Service Error
```json
{
  "message": "Tutor assistant is unavailable right now. Please try again."
}
```

---

## Debugging

### Check Console Logs
Look for these debug messages in the backend console:
```
[ASSISTANT DEBUG] Question: "..."
[ASSISTANT DEBUG] Course: ..., Cohort: ...
[ASSISTANT DEBUG] Snapshot Roster Check: [...]
[ASSISTANT DEBUG] Answer Length: ...
```

### Verify Snapshot Data
The snapshot should contain:
- Course details
- Cohort summaries
- Learner roster with `[RECORD]` format
- Stats (total enrollments, new this week, etc.)

### Check Roster Format
Each learner should appear as:
```
[RECORD] name="Learner Name" email="email@example.com" cohort="Cohort Name" progress="X%" count="Y/Z" enrolled="Date" last_active="Date" signals="event1 | event2"
```

---

## Common Issues

### Issue: AI returns "I don't have that information"
**Cause**: Learner name not found in roster
**Solution**: Verify the exact name in the database

### Issue: AI returns generic answer without specific numbers
**Cause**: Snapshot data may be incomplete
**Solution**: Check the debug logs for snapshot content

### Issue: AI invents data
**Cause**: Prompt may not be strict enough
**Solution**: Verify the system prompt is correctly applied

### Issue: Slow response
**Cause**: Large dataset or complex query
**Solution**: Limit roster to top 40 learners (already implemented)

---

## Success Criteria

✅ AI quotes exact percentages and module counts
✅ AI searches for `[RECORD]` format in roster
✅ AI analyzes `signals` field for "why" questions
✅ AI compares cohorts side-by-side when asked
✅ AI states when data is missing
✅ AI refuses cross-course requests
✅ AI asks for clarification when ambiguous
✅ AI never invents data

---

## Next Steps After Testing

1. ✅ Verify all test cases pass
2. ⏳ Test with real course data
3. ⏳ Test edge cases (empty cohorts, no signals, etc.)
4. ⏳ Monitor AI response quality
5. ⏳ Gather tutor feedback
6. ⏳ Iterate on prompt if needed

---

## Quick cURL Examples

### Login
```bash
curl -X POST http://localhost:4000/api/tutors/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tutor@example.com",
    "password": "your_password"
  }'
```

### Query AI Copilot
```bash
curl -X POST http://localhost:4000/api/tutors/assistant/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "courseId": "your-course-id",
    "question": "How many students are enrolled?"
  }'
```

---

## Resources

- **Full Documentation**: `AI_COPILOT_IMPLEMENTATION.md`
- **Update Summary**: `AI_COPILOT_UPDATE_SUMMARY.md`
- **Backend Code**: `backend-tutor/src/rag/openAiClient.ts`
- **API Routes**: `backend-tutor/src/routes/tutors.ts`
- **Data Service**: `backend-tutor/src/services/tutorInsights.ts`
