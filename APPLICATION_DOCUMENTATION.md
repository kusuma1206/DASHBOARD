# Course Platform Tutor Application - Comprehensive Documentation

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Application Overview](#application-overview)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema](#database-schema)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [Core Features](#core-features)
8. [API Endpoints](#api-endpoints)
9. [Authentication & Authorization](#authentication--authorization)
10. [Integrations](#integrations)
11. [Data Flow](#data-flow)
12. [Deployment](#deployment)

---

## Executive Summary

The **Course Platform Tutor Application** is a comprehensive educational technology platform designed to facilitate online learning through tutor-led courses. The application provides tutors with powerful tools to manage courses, track learner progress, engage with students through AI-powered assistance, and monitor learner activity in real-time.

**Key Capabilities:**
- **Tutor Management**: Application system for tutors to join the platform
- **Course Management**: Create and manage courses with modules and topics
- **Learner Progress Tracking**: Monitor student progress across courses and cohorts
- **AI-Powered Chatbot**: RAG (Retrieval-Augmented Generation) based assistant for learners
- **Activity Monitoring**: Real-time tracking of learner engagement and friction points
- **Email Communication**: Direct communication with learners
- **Cohort Management**: Organize learners into cohorts with specific timelines

---

## Application Overview

### Purpose
The platform serves as a bridge between tutors (instructors) and learners (students), providing:
- A centralized dashboard for tutors to manage their courses and students
- AI-assisted learning experiences for students
- Data-driven insights into learner engagement and progress
- Scalable course delivery through cohort-based learning

### User Roles
1. **Tutor**: Course creators and instructors who manage content and monitor learners
2. **Learner**: Students enrolled in courses who consume content and interact with AI assistance
3. **Admin**: Platform administrators who approve tutor applications

### Application Type
- **Backend**: RESTful API built with Express.js and TypeScript
- **Frontend**: Single Page Application (SPA) built with React, TypeScript, and Vite
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: OpenAI GPT models for chat assistance and embeddings for semantic search

---

## Technical Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend - React SPA"
        A[Tutor Dashboard UI]
        B[Tutor Login Page]
        C[Become Tutor Page]
    end
    
    subgraph "Backend - Express API"
        D[API Routes]
        E[Authentication Middleware]
        F[RAG Service]
        G[Email Service]
        H[Activity Service]
    end
    
    subgraph "Data Layer"
        I[(PostgreSQL Database)]
        J[Prisma ORM]
    end
    
    subgraph "External Services"
        K[OpenAI API]
        L[Google OAuth]
        M[Email SMTP]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    D --> F
    D --> G
    D --> H
    E --> J
    F --> J
    G --> M
    H --> J
    J --> I
    F --> K
    E --> L
```

### Technology Stack

#### Backend
- **Runtime**: Node.js (v20+)
- **Framework**: Express.js 4.21.2
- **Language**: TypeScript 5.6.3
- **ORM**: Prisma 6.17.0
- **Database**: PostgreSQL (with vector extension for embeddings)
- **Authentication**: JWT (jsonwebtoken 9.0.2) + Google OAuth 2.0
- **AI/ML**: OpenAI API 6.9.0
- **Email**: Nodemailer 7.0.12
- **Validation**: Zod 3.24.2
- **Testing**: Vitest 4.0.14

#### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.6.3
- **Build Tool**: Vite 7.3.1
- **Routing**: Wouter 3.3.5
- **State Management**: TanStack Query (React Query) 5.60.5
- **UI Components**: Radix UI + Custom Components
- **Styling**: Tailwind CSS 3.4.17
- **Forms**: React Hook Form 7.55.0 + Zod validation
- **Animations**: Framer Motion 11.13.1
- **Icons**: Lucide React 0.453.0

---

## Database Schema

### Core Entities

#### User Management
```prisma
model User {
  userId: UUID (PK)
  email: String (unique)
  fullName: String
  passwordHash: String?
  googleId: String? (unique)
  role: UserRole (learner, tutor, admin)
  emailVerified: Boolean
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relations
  enrollments: Enrollment[]
  moduleProgress: ModuleProgress[]
  quizAttempts: QuizAttempt[]
  sessions: UserSession[]
  ragChatSessions: RagChatSession[]
  ragChatMessages: RagChatMessage[]
  activityEvents: LearnerActivityEvent[]
  tutor: Tutor?
}
```

#### Course Structure
```prisma
model Course {
  courseId: UUID (PK)
  slug: String (unique)
  title: String
  description: String?
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relations
  modules: Module[]
  enrollments: Enrollment[]
  cohorts: Cohort[]
  courseTutors: CourseTutor[]
  courseChunks: CourseChunk[]
}

model Module {
  moduleId: UUID (PK)
  courseId: UUID (FK)
  moduleNo: Int
  title: String
  description: String?
  
  // Relations
  topics: Topic[]
  course: Course
}

model Topic {
  topicId: UUID (PK)
  moduleId: UUID (FK)
  topicName: String
  topicType: TopicType (lesson, quiz, simulation)
  content: Json?
  videoUrl: String?
  
  // Relations
  module: Module
  lesson: Lesson?
  quiz: Quiz?
  simulationExercise: SimulationExercise?
}
```

#### Enrollment & Progress
```prisma
model Enrollment {
  enrollmentId: UUID (PK)
  userId: UUID (FK)
  courseId: UUID (FK)
  cohortId: UUID? (FK)
  enrolledAt: DateTime
  status: EnrollmentStatus
  
  // Relations
  user: User
  course: Course
  cohort: Cohort?
}

model ModuleProgress {
  progressId: UUID (PK)
  userId: UUID (FK)
  courseId: UUID (FK)
  moduleNo: Int
  completedAt: DateTime?
  
  // Relations
  user: User
  course: Course
}
```

#### Cohort Management
```prisma
model Cohort {
  cohortId: UUID (PK)
  courseId: UUID (FK)
  name: String
  description: String?
  isActive: Boolean
  startsAt: DateTime?
  endsAt: DateTime?
  createdAt: DateTime
  
  // Relations
  course: Course
  enrollments: Enrollment[]
  members: CohortMember[]
}

model CohortMember {
  memberId: UUID (PK)
  cohortId: UUID (FK)
  userId: UUID (FK)
  joinedAt: DateTime
  
  // Relations
  cohort: Cohort
  user: User
}
```

#### Tutor System
```prisma
model TutorApplication {
  applicationId: UUID (PK)
  fullName: String
  email: String
  phone: String?
  headline: String
  courseTitle: String
  courseDescription: String
  targetAudience: String
  expertiseArea: String
  experienceYears: Int?
  availability: String
  status: String (pending, approved, rejected)
  createdAt: DateTime
  updatedAt: DateTime
}

model Tutor {
  tutorId: UUID (PK)
  userId: UUID (FK, unique)
  displayName: String
  bio: String?
  createdAt: DateTime
  
  // Relations
  user: User
  courses: CourseTutor[]
}

model CourseTutor {
  courseTutorId: UUID (PK)
  courseId: UUID (FK)
  tutorId: UUID (FK)
  role: String (owner, assistant)
  isActive: Boolean
  
  // Relations
  course: Course
  tutor: Tutor
}
```

#### RAG & AI Chat
```prisma
model CourseChunk {
  chunkId: String (PK)
  courseId: String
  position: Int
  content: String
  embedding: Vector // PostgreSQL vector type for semantic search
}

model RagChatSession {
  sessionId: UUID (PK)
  userId: UUID (FK)
  courseId: UUID (FK)
  topicId: UUID (FK)
  summary: String?
  summaryMessageCount: Int
  lastMessageAt: DateTime?
  createdAt: DateTime
  
  // Relations
  user: User
  course: Course
  topic: Topic
  messages: RagChatMessage[]
}

model RagChatMessage {
  messageId: UUID (PK)
  sessionId: UUID (FK)
  userId: UUID (FK)
  role: RagChatRole (user, assistant, system)
  content: String
  createdAt: DateTime
  
  // Relations
  session: RagChatSession
  user: User
}
```

#### Activity Tracking
```prisma
model LearnerActivityEvent {
  eventId: UUID (PK)
  userId: UUID (FK)
  courseId: UUID (FK)
  moduleNo: Int?
  topicId: UUID? (FK)
  eventType: String (page_view, quiz_start, chat_message, etc.)
  payload: Json?
  derivedStatus: String? (engaged, attention_drift, content_friction)
  statusReason: String?
  createdAt: DateTime
  
  // Relations
  user: User
  course: Course
  topic: Topic?
}
```

### Key Database Features
- **UUID Primary Keys**: All entities use UUID for distributed system compatibility
- **Vector Embeddings**: PostgreSQL vector extension for semantic search in RAG
- **Soft Deletes**: Cascade deletes configured for data integrity
- **Indexes**: Strategic indexes on foreign keys and frequently queried fields
- **Timestamps**: Automatic `createdAt` and `updatedAt` tracking

---

## Backend Architecture

### Project Structure
```
backend-tutor/
├── src/
│   ├── config/
│   │   └── env.ts                 # Environment configuration
│   ├── middleware/
│   │   ├── requireAuth.ts         # JWT authentication middleware
│   │   └── requireRole.ts         # Role-based authorization
│   ├── routes/
│   │   ├── activity.ts            # Learner activity tracking
│   │   ├── admin.ts               # Admin operations
│   │   ├── auth.ts                # Authentication (Google OAuth, JWT)
│   │   ├── courses.ts             # Course management
│   │   ├── health.ts              # Health check endpoint
│   │   ├── lessons.ts             # Lesson content & RAG chat
│   │   ├── pages.ts               # CMS page content
│   │   ├── tutorApplications.ts   # Tutor application submission
│   │   ├── tutors.ts              # Tutor dashboard & operations
│   │   └── users.ts               # User profile management
│   ├── services/
│   │   ├── activityEventService.ts      # Activity event processing
│   │   ├── cohortAccess.ts              # Cohort access control
│   │   ├── emailService.ts              # Email sending
│   │   ├── enrollmentService.ts         # Enrollment logic
│   │   ├── googleOAuth.ts               # Google OAuth integration
│   │   ├── personaProfileService.ts     # Learner persona management
│   │   ├── prisma.ts                    # Prisma client singleton
│   │   ├── sessionService.ts            # JWT session management
│   │   ├── tutorInsights.ts             # Tutor analytics
│   │   └── userService.ts               # User CRUD operations
│   ├── rag/
│   │   ├── openAiClient.ts        # OpenAI API wrapper
│   │   ├── ragService.ts          # RAG orchestration
│   │   ├── textChunker.ts         # Content chunking for embeddings
│   │   ├── rateLimiter.ts         # API rate limiting
│   │   ├── pii.ts                 # PII detection/filtering
│   │   └── usageLogger.ts         # AI usage tracking
│   ├── utils/
│   │   ├── asyncHandler.ts        # Async error handling
│   │   ├── oauthState.ts          # OAuth state management
│   │   └── password.ts            # Password hashing utilities
│   ├── app.ts                     # Express app configuration
│   └── server.ts                  # Server entry point
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── seed.ts                    # Database seeding
│   └── migrations/                # Database migrations
├── scripts/
│   ├── ingestCourseContent.ts     # RAG content ingestion
│   └── importCourseChunks.ts      # Bulk chunk import
└── package.json
```

### Key Backend Components

#### 1. Authentication System
- **Google OAuth 2.0**: Primary authentication method
- **JWT Tokens**: 
  - Access tokens (15 min TTL)
  - Refresh tokens (30 day TTL)
- **Session Management**: Database-backed sessions with refresh token rotation
- **Cookie-based**: Secure, HTTP-only cookies for token storage

#### 2. RAG (Retrieval-Augmented Generation) Service
**Purpose**: Provide AI-powered assistance to learners based on course content

**Components**:
- **Text Chunker**: Splits course content into semantic chunks
- **Embedding Generation**: Uses OpenAI `text-embedding-3-small` to create vector embeddings
- **Semantic Search**: PostgreSQL vector similarity search to find relevant content
- **Context Assembly**: Retrieves top-K relevant chunks for context
- **LLM Generation**: Uses GPT-3.5-turbo to generate responses with retrieved context
- **PII Protection**: Filters personally identifiable information
- **Rate Limiting**: Prevents API abuse

**Flow**:
```
User Question → Embed Question → Vector Search → Retrieve Chunks → 
Assemble Context → LLM Prompt → Generate Response → Return to User
```

#### 3. Activity Tracking System
**Purpose**: Monitor learner engagement and identify friction points

**Event Types**:
- `page_view`: Topic/lesson views
- `quiz_start`, `quiz_submit`: Quiz interactions
- `chat_message`: AI assistant usage
- `video_play`, `video_pause`: Video engagement

**Derived Statuses**:
- `engaged`: Active learning behavior
- `attention_drift`: Repeated page views without progress
- `content_friction`: Multiple quiz failures, excessive chat usage

#### 4. Email Service
- **Provider**: Nodemailer with SMTP
- **Use Cases**: 
  - Tutor-to-learner communication
  - Course notifications
  - Application status updates

#### 5. Cohort Access Control
- Validates learner access to course content based on cohort membership
- Enforces cohort-specific timelines and restrictions

### API Route Structure

All routes are available under both `/` and `/api/` prefixes for flexibility.

**Example**:
- `/auth/login` and `/api/auth/login` both work

---

## Frontend Architecture

### Project Structure
```
frontend-tutor/
├── src/
│   ├── assets/                    # Images, icons
│   ├── components/
│   │   ├── ui/                    # Reusable UI components (Radix + custom)
│   │   ├── layout/                # Layout components
│   │   ├── ChatBot.tsx            # AI chatbot interface
│   │   ├── CohortProjectModal.tsx # Cohort project management
│   │   ├── CourseSidebar.tsx      # Course navigation
│   │   └── ...
│   ├── pages/
│   │   ├── BecomeTutorPage.tsx    # Tutor application form
│   │   ├── TutorLoginPage.tsx     # Tutor authentication
│   │   ├── TutorDashboardPage.tsx # Main tutor dashboard
│   │   └── not-found.tsx          # 404 page
│   ├── hooks/
│   │   ├── use-toast.ts           # Toast notifications
│   │   └── use-mobile.tsx         # Responsive breakpoint detection
│   ├── lib/
│   │   ├── api.ts                 # API client utilities
│   │   ├── queryClient.ts         # React Query configuration
│   │   └── utils.ts               # General utilities
│   ├── types/
│   │   ├── content.ts             # Content type definitions
│   │   ├── session.ts             # Session type definitions
│   │   └── cart.ts                # Cart type definitions
│   ├── utils/
│   │   ├── auth.ts                # Authentication utilities
│   │   ├── session.ts             # Session management
│   │   └── telemetry.ts           # Analytics tracking
│   ├── constants/
│   │   ├── routes.ts              # Route definitions
│   │   ├── navigation.ts          # Navigation configuration
│   │   └── theme.ts               # Theme constants
│   ├── App.tsx                    # Main app component
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── public/                        # Static assets
├── package.json
└── vite.config.ts                 # Vite configuration
```

### Key Frontend Components

#### 1. Tutor Dashboard (`TutorDashboardPage.tsx`)
**Main Features**:
- **Course Selection**: Dropdown to select from tutor's courses
- **Cohort Selection**: Filter learners by cohort
- **Learner Progress Table**: 
  - Shows enrolled learners
  - Displays completed modules vs total modules
  - Shows completion percentage
- **Activity Monitoring**:
  - Real-time activity feed
  - Status indicators (engaged, attention_drift, content_friction)
  - Learner-specific activity drill-down
- **AI Tutor Assistant**:
  - Chat interface for tutors to get insights
  - Powered by RAG service
  - Context-aware responses about learners and course
- **Email Communication**:
  - Send emails to individual learners
  - Direct from dashboard

#### 2. Become Tutor Page (`BecomeTutorPage.tsx`)
- Application form for prospective tutors
- Fields: name, email, expertise, course proposal, etc.
- Submits to `/tutor-applications` endpoint

#### 3. Tutor Login Page (`TutorLoginPage.tsx`)
- Google OAuth login button
- Redirects to dashboard after authentication

#### 4. Session Management (`utils/session.ts`)
- **Session Storage**: LocalStorage for session persistence
- **Heartbeat**: Periodic session validation
- **Auto-logout**: Expires sessions and redirects on token expiry
- **Visibility Handling**: Revalidates session when tab becomes visible

#### 5. API Client (`lib/api.ts`, `lib/queryClient.ts`)
- **React Query**: Caching and state management for server data
- **API Request Wrapper**: Handles authentication headers, error handling
- **Automatic Retries**: Configurable retry logic for failed requests

---

## Core Features

### 1. Tutor Application System
**Flow**:
1. Prospective tutor fills out application form
2. Application submitted to backend (`POST /tutor-applications`)
3. Admin reviews application (`GET /admin/tutor-applications`)
4. Admin approves/rejects (`PATCH /admin/tutor-applications/:id`)
5. On approval, tutor account created with `tutor` role

### 2. Course & Content Management
**Structure**:
- **Course** → **Modules** → **Topics**
- **Topic Types**: Lesson, Quiz, Simulation Exercise
- **Content**: JSON-based flexible content structure
- **Video Integration**: YouTube/Vimeo URLs

**Tutor Capabilities**:
- View all courses they're assigned to
- Access course content structure
- Monitor enrollment statistics

### 3. Cohort-Based Learning
**Concept**: Group learners into cohorts for structured learning

**Features**:
- Cohort creation with start/end dates
- Learner assignment to cohorts
- Cohort-specific progress tracking
- Cohort filtering in tutor dashboard

### 4. Learner Progress Tracking
**Metrics**:
- **Module Completion**: Number of modules completed out of total
- **Completion Percentage**: Overall course progress
- **Enrollment Status**: Active, completed, dropped

**Tutor View**:
- Table showing all enrolled learners
- Progress bars and percentages
- Sortable and filterable

### 5. AI-Powered Chatbot (RAG)
**For Learners**:
- Ask questions about course content
- Get contextual answers based on course materials
- Chat history preserved per topic

**For Tutors**:
- Ask about learner progress
- Get insights on course effectiveness
- Identify struggling learners

**Technology**:
- **Embeddings**: Course content chunked and embedded
- **Vector Search**: PostgreSQL pgvector extension
- **LLM**: GPT-3.5-turbo for response generation
- **Context Window**: Top 5 relevant chunks included in prompt

### 6. Activity Monitoring & Analytics
**Tracked Events**:
- Page views
- Video interactions
- Quiz attempts
- Chat messages
- Time spent on topics

**Derived Insights**:
- **Engaged**: Learner is actively progressing
- **Attention Drift**: Learner revisiting same content repeatedly
- **Content Friction**: Learner struggling (failed quizzes, excessive chat)

**Tutor Benefits**:
- Identify at-risk learners
- Understand content difficulty
- Optimize course materials

### 7. Email Communication
**Capabilities**:
- Tutor can email individual learners
- Direct from dashboard
- Uses configured SMTP server

### 8. Quiz & Assessment System
**Features**:
- Multiple choice quizzes
- Automatic grading
- Attempt tracking
- Score history

**Quiz Types**:
- Module quizzes
- Topic quizzes
- Final assessments

### 9. Simulation Exercises
**Purpose**: Interactive, scenario-based learning

**Structure**:
- JSON-based exercise definition
- Custom UI rendering
- Progress tracking

---

## API Endpoints

### Authentication (`/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/auth/google` | Initiate Google OAuth flow | No |
| GET | `/auth/google/callback` | OAuth callback handler | No |
| POST | `/auth/refresh` | Refresh access token | No (refresh token in cookie) |
| POST | `/auth/logout` | Logout and invalidate session | Yes |
| GET | `/auth/me` | Get current user info | Yes |

### Users (`/users`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/me` | Get current user profile | Yes |
| PATCH | `/users/me` | Update user profile | Yes |

### Courses (`/courses`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/courses` | List all courses | No |
| GET | `/courses/:slug` | Get course details | No |
| GET | `/courses/:courseId/modules` | Get course modules | Yes |
| GET | `/courses/:courseId/cohorts` | Get course cohorts | Yes |
| POST | `/courses/:courseId/enroll` | Enroll in course | Yes |

### Lessons (`/lessons`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/lessons/topics/:topicId` | Get topic content | Yes |
| POST | `/lessons/topics/:topicId/complete` | Mark topic complete | Yes |
| GET | `/lessons/topics/:topicId/chat` | Get chat history | Yes |
| POST | `/lessons/topics/:topicId/chat` | Send chat message (RAG) | Yes |

### Tutors (`/tutors`)
| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/tutors/dashboard/courses` | Get tutor's courses | Yes | Tutor |
| GET | `/tutors/dashboard/courses/:courseId/enrollments` | Get course enrollments | Yes | Tutor |
| GET | `/tutors/dashboard/courses/:courseId/progress` | Get learner progress | Yes | Tutor |
| GET | `/tutors/dashboard/courses/:courseId/activity` | Get activity events | Yes | Tutor |
| GET | `/tutors/dashboard/courses/:courseId/activity/summary` | Get activity summary | Yes | Tutor |
| GET | `/tutors/dashboard/courses/:courseId/activity/learner/:userId` | Get learner activity | Yes | Tutor |
| POST | `/tutors/dashboard/send-email` | Send email to learner | Yes | Tutor |
| POST | `/tutors/dashboard/assistant` | Chat with tutor assistant | Yes | Tutor |

### Tutor Applications (`/tutor-applications`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/tutor-applications` | Submit tutor application | No |

### Admin (`/admin`)
| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/admin/tutor-applications` | List all applications | Yes | Admin |
| PATCH | `/admin/tutor-applications/:id` | Approve/reject application | Yes | Admin |

### Activity (`/activity`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/activity/events` | Log activity event | Yes |

### Health (`/health`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |

---

## Authentication & Authorization

### Authentication Flow

#### Google OAuth Flow
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Google
    participant Database

    User->>Frontend: Click "Login with Google"
    Frontend->>Backend: GET /auth/google
    Backend->>Backend: Generate OAuth state
    Backend->>Frontend: Redirect to Google OAuth
    Frontend->>Google: OAuth consent screen
    Google->>User: Request permissions
    User->>Google: Grant permissions
    Google->>Backend: Redirect to /auth/google/callback?code=...
    Backend->>Google: Exchange code for tokens
    Google->>Backend: Return user info
    Backend->>Database: Find or create user
    Backend->>Database: Create session
    Backend->>Frontend: Set JWT cookies, redirect to dashboard
    Frontend->>Frontend: Store session in localStorage
    Frontend->>User: Show dashboard
```

### Authorization Levels

1. **Public**: No authentication required
   - Course catalog
   - Tutor application submission
   - Health check

2. **Authenticated**: Valid JWT required
   - User profile
   - Course enrollment
   - Lesson access
   - Chat with AI

3. **Role-Based**:
   - **Tutor**: Dashboard access, learner monitoring, email sending
   - **Admin**: Tutor application approval, platform management

### Middleware

#### `requireAuth`
- Validates JWT from `Authorization` header or cookies
- Attaches `req.user` with user info
- Returns 401 if invalid/missing

#### `requireRole(role)`
- Checks `req.user.role` matches required role
- Returns 403 if unauthorized

---

## Integrations

### 1. OpenAI API
**Purpose**: Power AI chatbot and semantic search

**Models Used**:
- **GPT-3.5-turbo**: Chat completions for RAG responses
- **text-embedding-3-small**: Generate embeddings for course content

**Configuration**:
- API key stored in environment variable `OPENAI_API_KEY`
- Configurable model names via env vars

**Rate Limiting**:
- Custom rate limiter to prevent abuse
- Per-user limits on chat messages

### 2. Google OAuth 2.0
**Purpose**: User authentication

**Configuration**:
- Client ID and Secret from Google Cloud Console
- Redirect URI configured in OAuth consent screen
- Scopes: `profile`, `email`

**Environment Variables**:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

### 3. PostgreSQL with pgvector
**Purpose**: Database with vector similarity search

**Extensions Required**:
- `uuid-ossp`: UUID generation
- `pgvector`: Vector embeddings and similarity search

**Vector Operations**:
- Cosine similarity for semantic search
- Indexed vector columns for performance

### 4. Email (SMTP)
**Purpose**: Send emails from tutors to learners

**Configuration**:
- SMTP server credentials in environment
- Nodemailer for email sending

---

## Data Flow

### Learner Learning Flow
```mermaid
sequenceDiagram
    participant Learner
    participant Frontend
    participant Backend
    participant Database
    participant OpenAI

    Learner->>Frontend: Login
    Frontend->>Backend: Authenticate
    Backend->>Database: Validate user
    Database->>Backend: User session
    Backend->>Frontend: JWT tokens
    
    Learner->>Frontend: Enroll in course
    Frontend->>Backend: POST /courses/:id/enroll
    Backend->>Database: Create enrollment
    
    Learner->>Frontend: View lesson
    Frontend->>Backend: GET /lessons/topics/:id
    Backend->>Database: Fetch topic content
    Database->>Backend: Topic data
    Backend->>Frontend: Lesson content
    
    Learner->>Frontend: Ask question in chat
    Frontend->>Backend: POST /lessons/topics/:id/chat
    Backend->>OpenAI: Generate embedding for question
    OpenAI->>Backend: Question embedding
    Backend->>Database: Vector similarity search
    Database->>Backend: Relevant course chunks
    Backend->>OpenAI: Generate response with context
    OpenAI->>Backend: AI response
    Backend->>Database: Save chat message
    Backend->>Frontend: Return response
    Frontend->>Learner: Display answer
    
    Learner->>Frontend: Complete topic
    Frontend->>Backend: POST /lessons/topics/:id/complete
    Backend->>Database: Update progress
    Backend->>Database: Log activity event
```

### Tutor Monitoring Flow
```mermaid
sequenceDiagram
    participant Tutor
    participant Frontend
    participant Backend
    participant Database

    Tutor->>Frontend: Login
    Frontend->>Backend: Authenticate
    Backend->>Database: Validate tutor role
    
    Tutor->>Frontend: Select course
    Frontend->>Backend: GET /tutors/dashboard/courses/:id/progress
    Backend->>Database: Query enrollments & progress
    Database->>Backend: Learner progress data
    Backend->>Frontend: Progress table data
    
    Tutor->>Frontend: View activity
    Frontend->>Backend: GET /tutors/dashboard/courses/:id/activity
    Backend->>Database: Query activity events
    Database->>Backend: Activity events with derived status
    Backend->>Frontend: Activity feed
    
    Tutor->>Frontend: Ask assistant about learner
    Frontend->>Backend: POST /tutors/dashboard/assistant
    Backend->>Database: Query learner data
    Backend->>Backend: Generate insights
    Backend->>Frontend: AI response with insights
```

---

## Deployment

### Backend Deployment

#### Environment Variables Required
```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:pass@host:port/dbname
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
JWT_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_APP_URLS=https://frontend.com,https://app.com
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-3.5-turbo
EMBEDDING_MODEL=text-embedding-3-small
```

#### Build & Run
```bash
# Install dependencies
npm install

# Run Prisma migrations
npx prisma migrate deploy

# Build TypeScript
npm run build

# Start server
npm start
```

#### Docker Support
- Dockerfile included
- docker-compose.yml for local development
- Supports containerized deployment

### Frontend Deployment

#### Environment Variables
```bash
VITE_API_BASE_URL=https://api.yourdomain.com
```

#### Build & Deploy
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Output in dist/ directory
# Deploy dist/ to static hosting (Vercel, Netlify, etc.)
```

#### Nginx Configuration
- nginx.conf included for serving SPA
- Handles client-side routing

---

## Key Workflows

### Workflow 1: Tutor Onboarding
1. Prospective tutor visits `/become-a-tutor`
2. Fills out application form
3. Application submitted to backend
4. Admin reviews in admin panel
5. Admin approves application
6. Backend creates tutor account
7. Tutor receives email notification
8. Tutor logs in via `/tutors/login`
9. Tutor accesses dashboard at `/tutors`

### Workflow 2: Course Content Ingestion (RAG)
1. Course content prepared (PDFs, text files)
2. Run ingestion script: `npm run rag:ingest`
3. Script chunks content into semantic segments
4. Generates embeddings via OpenAI API
5. Stores chunks and embeddings in `course_chunks` table
6. Content now searchable for RAG chatbot

### Workflow 3: Learner Asks Question
1. Learner viewing a topic
2. Types question in chatbot
3. Frontend sends to `POST /lessons/topics/:topicId/chat`
4. Backend generates embedding for question
5. Performs vector similarity search in `course_chunks`
6. Retrieves top 5 relevant chunks
7. Assembles prompt with context + question
8. Sends to OpenAI GPT-3.5-turbo
9. Returns AI-generated response
10. Saves message in `rag_chat_messages`
11. Frontend displays response to learner

### Workflow 4: Tutor Monitors Learner
1. Tutor selects course from dropdown
2. Tutor selects cohort (or "All Cohorts")
3. Dashboard loads learner progress table
4. Shows: Name, Email, Modules Completed, Percentage
5. Tutor clicks on learner name
6. Activity feed loads for that learner
7. Shows recent events with derived status
8. Tutor identifies struggling learner (content_friction)
9. Tutor clicks "Send Email"
10. Composes message and sends
11. Learner receives email

---

## Advanced Features

### 1. Persona-Based Learning
- **Persona Profiles**: Learners can set learning preferences
- **Adaptive Content**: AI adjusts responses based on persona
- **Prompt Templates**: Customized prompts for different learning styles

### 2. Cold Calling System
- **Random Learner Selection**: Simulate classroom cold calling
- **Engagement Tracking**: Monitor participation
- **Fairness Algorithm**: Ensure even distribution

### 3. Module Prompt Usage Tracking
- **Typed vs Suggested**: Track if learners type questions or use suggestions
- **Engagement Metric**: Measure active vs passive learning
- **Tutor Insights**: Understand how learners interact with AI

### 4. Session Summarization
- **Auto-Summarize**: RAG chat sessions auto-summarize after N messages
- **Context Preservation**: Summaries used for long-running conversations
- **Efficiency**: Reduces token usage for long chats

### 5. Content Friction Detection
**Algorithm**:
- Multiple failed quiz attempts → `content_friction`
- Excessive chat messages on same topic → `content_friction`
- Repeated page views without progress → `attention_drift`

**Tutor Action**:
- Receive alerts for struggling learners
- Proactively reach out
- Adjust content difficulty

---

## Testing & Quality Assurance

### Backend Testing
- **Framework**: Vitest
- **Test Types**: Unit tests, integration tests
- **Test Scripts**: 
  - `npm test`: Run all tests
  - Various diagnostic scripts (e.g., `diagnose-progress.ts`)

### Frontend Testing
- **Linting**: ESLint (configured but not enforced)
- **Type Safety**: TypeScript strict mode
- **Manual Testing**: Browser-based testing

### Diagnostic Tools
- `check-server.ts`: Verify server connectivity
- `verify-api.ts`: Test API endpoints
- `diagnose-progress.ts`: Debug progress tracking issues
- `test-login.ts`: Validate authentication flow

---

## Performance Considerations

### Backend Optimizations
1. **Database Indexing**: Strategic indexes on foreign keys and query fields
2. **Connection Pooling**: Prisma connection pooling
3. **Caching**: React Query caching on frontend
4. **Rate Limiting**: Prevent API abuse
5. **Async Operations**: Non-blocking I/O for all operations

### Frontend Optimizations
1. **Code Splitting**: Vite automatic code splitting
2. **Lazy Loading**: Route-based code splitting with Wouter
3. **React Query**: Automatic caching and background refetching
4. **Memoization**: Strategic use of `useMemo` and `useCallback`
5. **Optimistic Updates**: Immediate UI feedback before server confirmation

### RAG Performance
1. **Vector Indexing**: PostgreSQL vector indexes for fast similarity search
2. **Chunk Size Optimization**: Balanced chunk size for context quality
3. **Top-K Retrieval**: Limit to 5 most relevant chunks
4. **Embedding Caching**: Reuse embeddings for repeated content

---

## Security Measures

### Authentication Security
- **JWT**: Short-lived access tokens (15 min)
- **Refresh Tokens**: Secure, HTTP-only cookies
- **Token Rotation**: Refresh tokens rotated on use
- **Session Invalidation**: Database-backed session management

### Data Security
- **Password Hashing**: Bcrypt for password storage
- **PII Protection**: PII filtering in RAG responses
- **CORS**: Strict origin validation
- **SQL Injection**: Prisma ORM prevents SQL injection
- **XSS Protection**: React automatic escaping

### API Security
- **Rate Limiting**: Express rate limiter
- **Input Validation**: Zod schema validation
- **Error Handling**: No sensitive info in error messages
- **HTTPS**: Enforced in production

---

## Future Enhancement Opportunities

### Potential Features
1. **Real-Time Notifications**: WebSocket for live updates
2. **Advanced Analytics**: Predictive learner success models
3. **Multi-Language Support**: i18n for global reach
4. **Mobile Apps**: React Native for iOS/Android
5. **Video Conferencing**: Integrate Zoom/Teams for live sessions
6. **Gamification**: Badges, leaderboards, achievements
7. **Peer Learning**: Learner-to-learner chat and forums
8. **Content Authoring**: In-app course creation tools for tutors
9. **Payment Integration**: Stripe for paid courses
10. **Certificate Generation**: Automated certificate issuance

### Technical Improvements
1. **Microservices**: Split RAG service into separate microservice
2. **GraphQL**: Replace REST with GraphQL for flexible queries
3. **Redis Caching**: Add Redis for session and query caching
4. **Elasticsearch**: Full-text search for course content
5. **CI/CD Pipeline**: Automated testing and deployment
6. **Monitoring**: Application performance monitoring (APM)
7. **Logging**: Centralized logging with ELK stack
8. **Load Balancing**: Horizontal scaling with load balancer

---

## Glossary

- **RAG**: Retrieval-Augmented Generation - AI technique combining retrieval and generation
- **Cohort**: Group of learners enrolled in a course together
- **Module**: Major section of a course containing multiple topics
- **Topic**: Individual lesson, quiz, or exercise within a module
- **Embedding**: Vector representation of text for semantic search
- **JWT**: JSON Web Token - authentication token format
- **OAuth**: Open Authorization - delegated authentication protocol
- **Prisma**: Modern ORM for Node.js and TypeScript
- **pgvector**: PostgreSQL extension for vector similarity search
- **SPA**: Single Page Application - frontend architecture
- **CORS**: Cross-Origin Resource Sharing - security mechanism

---

## Conclusion

The **Course Platform Tutor Application** is a sophisticated, production-ready educational platform that combines modern web technologies with AI-powered features to deliver an exceptional learning experience. The architecture is scalable, secure, and designed for future enhancements.

**Key Strengths**:
- ✅ Comprehensive tutor dashboard with real-time insights
- ✅ AI-powered chatbot using RAG for contextual assistance
- ✅ Robust authentication and authorization
- ✅ Activity tracking and learner analytics
- ✅ Cohort-based learning management
- ✅ Modular, maintainable codebase
- ✅ Type-safe with TypeScript throughout
- ✅ Well-documented API and database schema

**Ready for**:
- Feature expansion and customization
- Integration with third-party services
- Scaling to thousands of concurrent users
- Multi-tenant deployments

This documentation provides a complete foundation for understanding the application and planning new features or enhancements.
