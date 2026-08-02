# 🚀 TaskFlowPro — Enterprise AI Workforce & Project Intelligence Platform

[![Version](https://img.shields.io/badge/TaskFlowPro-v2.2-amber.svg)](https://github.com/suraj-9430/taskflow_repomangerfrontend)
[![Angular](https://img.shields.io/badge/Angular-20.3-red.svg)](https://angular.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%202.5%20Flash-purple.svg)](https://deepmind.google/technologies/gemini/)

**TaskFlowPro** is a state-of-the-art enterprise workforce management and project intelligence platform. It elevates traditional task dashboards into an AI-powered co-pilot ecosystem that evaluates operational data, predicts deadline risks, re-balances employee workloads, manages skill matrices, and executes application actions directly from natural language commands.

---

## 🌟 Key Modules & AI Features

### 📊 1. AI Project Health Center (v2.1)
- **Continuous AI Health Diagnostics**: Evaluates project health using historical task velocity, attendance logs, approval queues, and employee capacity instead of static percentages.
- **Health Score Categories**:
  - `90 - 100`: **Excellent** 🟢
  - `75 - 89`: **Healthy** 🔵
  - `60 - 74`: **Needs Attention** 🟡
  - `< 60`: **Critical** 🔴
- **Predictive Risk Analysis**: Identifies blocking tasks, root causes, probability, impact, and mitigation advice.
- **Deadline Velocity Forecasting**: Predicts completion dates vs target deadlines with confidence metrics.
- **Daily Executive Brief & Weekly Reports**: Morning summaries for managers and automated weekly performance reports.
- **Natural Language Q&A**: Interactive decision assistant answering project queries in real time.

### 🎯 2. AI Skills Matrix & Intelligent Resource Allocation (v2.2)
- **Technical & Soft Skill Profiles**: Tracks ⭐ 1-5 star proficiency ratings across *Languages, Frontend, Backend, Database, DevOps, Cloud, and Domain Skills*.
- **"Suggest Employee" AI Allocation Engine**: Gemini 2.5 Flash analyzes required task skills, past project experience, current task workload (utilization %), leave availability, and suggests the optimal employee with confidence percentage and detailed rationale.
- **Team Skill Gap Analysis**: Identifies missing skill coverage for active projects and suggests training programs.
- **Personalized AI Learning Roadmaps**: Recommends individual learning paths based on upcoming project demands.

### 🤖 3. AI Command Center — Natural Language Actions (v2.2)
- **Global `Ctrl+K` Command Palette**: Execute real application actions from plain English instructions (*"Create a high priority task for Login API due next Friday"*, *"Apply casual leave tomorrow"*, *"Mark me present"*).
- **Conversational Multi-Turn Handling**: Prompts choices for missing mandatory parameters (e.g. leave type, leave reason) before confirming execution.
- **RBAC Security Guard**: Enforces user role authorization (`admin`, `manager`, `employee`) before executing write operations.

### ⚡ 4. Enterprise Architecture & Operational Support
- **GPS-Based Attendance**: Geofenced check-ins with Spherical Law of Cosines calculation ($\le 10$ meters office threshold).
- **Asynchronous RabbitMQ Email Queues**: Non-blocking email notifications for task & project assignments.
- **Redis & In-Memory Caching**: 5-minute TTL caching layer for sub-second AI response times.
- **Live Websocket Channels**: Real-time project discussions, task comments, and mention notifications via Socket.IO.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Angular 20, TypeScript, RxJS, Vanilla CSS (Glassmorphism), FontAwesome |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | MongoDB (Mongoose Aggregation Pipelines) |
| **AI Co-Pilot** | Google Gemini 2.5 Flash API |
| **Real-Time Websockets** | Socket.IO |
| **Async Message Queue** | RabbitMQ (CloudAMQP + AMQP Worker) |
| **Caching Layer** | Redis / In-Memory TTL Cache |
| **Authentication** | JWT, HttpOnly Cookies, Bcrypt |

---

## 📂 Repository Structure

```text
TaskFlow-pro/
├── src/
│   ├── app/
│   │   ├── ai-project-health/    # AI Health Center Dashboard
│   │   ├── skills-matrix/        # Skills Matrix & Resource Allocation UI
│   │   ├── command-center/       # Global Ctrl+K Natural Language Palette
│   │   ├── analytics-dashboard/  # Operational Analytics & KPIs
│   │   ├── attendance/           # GPS Geofenced Attendance Module
│   │   ├── leave-management/     # Leave Requests & Approval Hub
│   │   ├── manager/              # Projects, Tasks, and Employee Management
│   │   ├── services/             # Angular API & Socket Service Layers
│   │   ├── layout/               # Main Sidebar, Header, & Co-Pilot Drawer
│   │   └── app.routes.ts         # Navigation Route Guards & Definitions
├── Project Updates/              # Feature Change Logs & Architectural Updates
└── README.md                     # Documentation
```

---

## 🏎️ Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Angular CLI**: `v20.0.0` or higher
- **MongoDB**: Local instance or MongoDB Atlas URL
- **Google Gemini API Key**: Obtain key from Google AI Studio

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables (.env)
PORT=5000
MONGODB_URI=mongodb+srv://your-cluster-uri
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_google_gemini_api_key
RABBITMQ_URL=amqps://your-cloudamqp-url

# Start development backend
npm run dev
```

---

### 2. Frontend Setup

```bash
# Navigate to frontend workspace root
cd TaskFlow-pro

# Install dependencies
npm install

# Start development frontend server
npm run dev
```

Navigate to `http://localhost:4200/` in your browser.

---

## ⌨️ Shortcuts & Hotkeys

- `Ctrl + K` / `Cmd + K`: Open **AI Command Center** natural language palette.
- Floating Sparkling Button: Toggle **TaskFlow Co-Pilot** side drawer.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
