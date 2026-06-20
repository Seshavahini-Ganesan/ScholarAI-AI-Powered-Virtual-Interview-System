# ScholarAI Interviewer

A complete full-stack AI-powered mock interview platform that generates tailored questions from your resume, monitors you via webcam with real-time emotion detection, and provides instant AI feedback.

## Features

- **AI Resume Parsing**: Claude analyzes your resume to extract skills and experience
- **Tailored Questions**: Mix of behavioral, technical, and experience-specific questions
- **Live Emotion Detection**: Real-time face and emotion tracking using AI
- **Answer Analysis**: Instant feedback with scores, strengths, and improvements
- **Performance Charts**: Beautiful visualizations of scores, emotions, and competencies
- **Downloadable Reports**: Export complete HTML reports

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express
- **Auth**: Clerk (Google + GitHub + Email)
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API
- **Charts**: Recharts
- **Face Detection**: face-api.js

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Anthropic API (get from https://console.anthropic.com/)
ANTHROPIC_API_KEY=your_key_here

# Clerk Auth (get from https://dashboard.clerk.com/)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (already configured for this project)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Optional Piston executor host
PISTON_API_URL=https://your-piston-instance.example/api/v2/piston/execute
PISTON_API_KEY=your_key_here

# Server Port (optional)
PORT=3001
```

### 3. Database Setup

The Supabase database schema has already been created with the following tables:

- `users` - User accounts with credit tracking
- `resumes` - Uploaded resumes with parsed data
- `interviews` - Completed interviews with full results

### 4. Run the Application

Start both client and server concurrently:

```bash
npm run dev
```

This will start:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
├── server/
│   └── index.js              # Express backend with API routes
├── src/
│   ├── components/
│   │   ├── CameraMonitor.tsx      # Webcam + emotion detection
│   │   ├── InterviewApp.tsx       # Main interview component
│   │   └── ProtectedRoute.tsx     # Auth wrapper
│   ├── pages/
│   │   ├── Landing.tsx            # Landing page
│   │   ├── Login.tsx              # Login page
│   │   ├── Signup.tsx             # Signup page
│   │   ├── Dashboard.tsx          # User dashboard
│   │   ├── Interview.tsx          # Interview session
│   │   ├── Reports.tsx            # View past interviews
│   │   └── Settings.tsx           # User settings
│   ├── lib/
│   │   └── api.ts                 # API client functions
│   ├── App.tsx                    # Main app with routing
│   └── main.tsx                   # Entry point
└── .env                           # Environment variables
```

## API Routes

All routes are under `/api`:

- `POST /api/resume/parse` - Parse uploaded resume
- `POST /api/interview/generate-questions` - Generate interview questions
- `POST /api/interview/analyse-answer` - Analyze user's answer
- `POST /api/interview/generate-report` - Generate final report
- `POST /api/interview/save` - Save completed interview
- `GET /api/interviews` - List user's interviews
- `GET /api/interviews/:id` - Get specific interview
- `GET /api/user/credits` - Get user's credit info

## Pages

1. **Landing** (`/`) - Hero, features, pricing, testimonials
2. **Login** (`/login`) - Clerk authentication
3. **Signup** (`/signup`) - Create account
4. **Dashboard** (`/dashboard`) - Stats, interview list, credits
5. **Interview** (`/interview`) - Main interview session
6. **Reports** (`/reports/:id`) - View past interview results
7. **Settings** (`/settings`) - Profile, preferences, subscription

## Features in Detail

### Interview Flow

1. Upload resume (PDF, DOCX, or TXT)
2. AI parses resume and generates tailored questions
3. Camera activates for emotion monitoring
4. Answer each question with AI analysis
5. View comprehensive report with charts
6. Download HTML report

### Credits System

- **Free Plan**: 3 interviews per month
- **Pro Plan**: 20 interviews per month ($9/mo)
- **Enterprise**: Unlimited interviews ($29/mo)

### Security

- All API calls to Anthropic happen server-side only
- Clerk handles authentication with JWT tokens
- Supabase Row Level Security (RLS) protects user data
- Camera access requires user permission

## Development

### Run Client Only

```bash
npm run dev:client
```

### Run Server Only

```bash
npm run dev:server
```

### Build for Production

```bash
npm run build
```

### Type Check

```bash
npm run typecheck
```

### Authentication Issues

- Verify your Clerk keys are correct
- Make sure you're using the correct environment (test vs production)

