# TaskFlow Pro — Complete Product Documentation

> **Full-stack Enterprise Workforce Management Platform**
> Angular 20 Frontend · Express/TypeScript Backend · MongoDB · RabbitMQ · Capacitor (Android)

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Tech Stack](#tech-stack)
4. [Frontend (Angular)](#frontend-angular)
5. [Backend (Express / Node.js)](#backend-express--nodejs)
6. [Data Models (MongoDB)](#data-models-mongodb)
7. [API Reference](#api-reference)
8. [Authentication & Authorization](#authentication--authorization)
9. [Email Worker (RabbitMQ)](#email-worker-rabbitmq)
10. [Environment Setup](#environment-setup)
11. [Scripts & Commands](#scripts--commands)
12. [Project File Map](#project-file-map)

---

## Product Overview

**TaskFlow Pro** is an enterprise-grade workforce management platform that combines **task tracking**, **project management**, **employee management**, **attendance tracking**, **leave management**, **real-time notifications**, and an **AI assistant** — all in a single full-stack application.

### Core Capabilities

| Feature | Description |
|---------|-------------|
| 🔐 **Role-Based Access** | Three user roles — **Admin**, **Manager**, **Employee** — each with a dedicated dashboard and permissions |
| 📋 **Task Management** | Create, assign, track, and comment on tasks with priority levels and status workflows |
| 📁 **Project Management** | Create projects with deadlines, progress tracking, and team assignment |
| 👥 **Employee Management** | Full CRUD for employees with status management (active/inactive/hold) |
| ⏰ **Attendance Tracking** | GPS-based clock-in/out with Office & Remote presence, admin approval for remote work |
| 📅 **Leave Management** | Apply for leaves, track balances, audit logs, and approve/reject leave requests |
| 🔔 **Notifications** | In-app notification system with read/unread tracking |
| 📧 **Email Alerts** | Background email notifications via RabbitMQ + Nodemailer (Gmail SMTP) |
| 🤖 **AI Assistant** | Built-in AI co-pilot powered by **Google Gemini 2.5 Flash** for task breakdown, workload summaries, and productivity tips |
| 📱 **Mobile App** | Android APK via Capacitor |
| 🔑 **Password Reset** | OTP-based password recovery via email |

---

## Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend - Angular 20"
        A["Login Page"] --> B["Auth Guard"]
        B --> C["Admin Dashboard"]
        B --> D["Manager Dashboard"]
        B --> E["Employee Dashboard"]
        C --> F["Create & Manage Users"]
        C --> G["Settings / Notifications"]
        D --> H["Projects / Tasks / Employees"]
        E --> I["My Tasks / My Projects"]
        C & D & E --> J["Attendance Module"]
        C & D & E --> K["AI Assistant Service"]
        C & D & E --> Z["Leave Module"]
    end

    subgraph "Backend - Express + TypeScript"
        L["Express App"] --> M["Auth Middleware (JWT)"]
        M --> N["User Controller"]
        M --> O["Task Controller"]
        M --> P["Project Controller"]
        M --> Q["Attendance Controller"]
        M --> R["Leave Controller"]
        M --> S["Notification Controller"]
        M --> Y["AI Controller (Gemini API)"]
        O --> T["RabbitMQ Publisher"]
    end

    subgraph "Infrastructure"
        U["MongoDB Atlas"]
        V["RabbitMQ (CloudAMQP)"]
        W["Gmail SMTP"]
        T --> V
        V --> X["Email Worker"]
        X --> W
        L --> U
    end

    K -->|HTTP API| L
    A -->|POST /api/users/login| N
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 20.x | SPA framework |
| TypeScript | 5.9 | Type-safe JavaScript |
| Bootstrap | 5.3 | UI component library |
| ng-bootstrap | 20.x | Angular-native Bootstrap widgets |
| RxJS | 7.8 | Reactive state management |
| Capacitor | 8.x | Native Android wrapper |
| Hash Routing | — | `withHashLocation()` for Capacitor compatibility |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js + Express | 4.21 | REST API server |
| TypeScript | 6.x | Type-safe backend |
| Mongoose | 8.5 | MongoDB ODM |
| bcryptjs | 3.x | Password hashing |
| jsonwebtoken | 9.x | JWT authentication |
| Nodemailer | 8.x | SMTP email delivery |
| amqplib | 2.x | RabbitMQ client |
| cookie-parser | 1.4 | HTTP cookie handling |
| cors | 2.8 | Cross-origin resource sharing |
| dotenv | 16.x | Environment variables |
| Google Gemini API | 2.5-flash | Large Language Model integrations |

---

## Frontend (Angular)

### Routing & Navigation

The app uses **three role-specific dashboard layouts**, each protected by the [authGuard](file:///c:/Users/rajsu/OneDrive/Desktop/TaskMS/TaskFlow-pro/src/app/guards/auth.guard.ts):

| Route Path | Role Required | Component | Description |
|------------|---------------|-----------|-------------|
| `/` | None | `LoginPage` | Login screen |
| `/dashboard` | `admin` | `AdminDashboard` | Admin home with stats |
| `/dashboard/action` | `admin` | `Createandmanage` | User creation & management |
| `/dashboard/settings` | `admin` | `Settings` | Profile & app settings |
| `/dashboard/notifications` | `admin` | `Notifications` | Notification center |
| `/dashboard/attendance` | `admin` | `AttendanceComponent` | Attendance overview |
| `/dashboard/leave-management` | `admin` | `LeaveManagement` | Leave history & management |
| `/manager-dashboard` | `manager` | `ManagerDashboard` | Manager home |
| `/manager-dashboard/projects` | `manager` | `Projects` | Project management |
| `/manager-dashboard/tasks` | `manager` | `Tasks` | Task management |
| `/manager-dashboard/employees` | `manager` | `Employees` | Team view |
| `/manager-dashboard/settings` | `manager` | `Settings` | Settings |
| `/manager-dashboard/notifications` | `manager` | `Notifications` | Notifications |
| `/manager-dashboard/attendance` | `manager` | `Attendance` | Attendance |
| `/employee-dashboard` | `employee` | `EmployeeDashboard` | Employee home |
| `/employee-dashboard/my-tasks` | `employee` | `MyTasks` | Personal task list |
| `/employee-dashboard/my-projects` | `employee` | `MyProjects` | Assigned projects |
| `/employee-dashboard/settings` | `employee` | `Settings` | Settings |
| `/employee-dashboard/notifications` | `employee` | `Notifications` | Notifications |
| `/employee-dashboard/attendance` | `employee` | `Attendance` | Attendance |

### Auth Guard Logic

The [authGuard](file:///c:/Users/rajsu/OneDrive/Desktop/TaskMS/TaskFlow-pro/src/app/guards/auth.guard.ts) performs:
1. Checks `localStorage` for a `user` JSON object
2. Parses the user's role
3. Validates that the role matches the route prefix (`/dashboard` → admin, `/manager-dashboard` → manager, `/employee-dashboard` → employee)
4. Redirects unauthorized users to the login page

### AI Assistant Service

The [AiService](file:///c:/Users/rajsu/OneDrive/Desktop/TaskMS/TaskFlow-pro/src/app/services/ai.service.ts) provides two main features:

1. **`generateBreakdown(title, description)`** — Returns an AI-generated subtask checklist based on keyword analysis of the task title.
2. **`chatWithAssistant(message)`** — An AI co-pilot chat that reads from `localStorage` to provide context-aware responses.

Both functions query the backend, which interacts with the **Google Gemini 2.5 Flash** models via native fetch requests.

### Environment Configuration

The [environment.ts](file:///c:/Users/rajsu/OneDrive/Desktop/TaskMS/TaskFlow-pro/src/environments/environment.ts) is auto-generated by `set-env.js`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api'  // Points to the backend
};
```

---

## Backend (Express / Node.js)

### Server Entry Point

[server.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/server.ts):
1. Connects to MongoDB
2. Starts Express on configured port (default `5000`)
3. In **production mode**, auto-starts the email worker inline

### App Configuration

[app.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/app.ts) sets up:
- **CORS**: Allows target origins.
- **Body parsing**: JSON + URL-encoded
- **Cookie parsing**: For JWT token in cookies
- **Health check**: `GET /health` returns server status
- **404 handler**: Catches unmatched routes
- **Global error handler**: Logs stack traces, returns sanitized errors

### API Route Registration

| Base Path | Route File | Auth Required |
|-----------|------------|---------------|
| `/api/users` | [user.routes.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/routes/user.routes.ts) | **Yes** (except login, logout, recovery) |
| `/api/leaves` | [leave.routes.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/routes/leave.routes.ts) | **Yes** (all routes) |
| `/api/projects` | [project.routes.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/routes/project.routes.ts) | **Yes** (all routes) |
| `/api/tasks` | [task.routes.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/routes/task.routes.ts) | **Yes** (all routes) |
| `/api/notifications` | [notification.routes.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/routes/notification.routes.ts) | **Yes** (all routes) |
| `/api/attendance` | [attendance.routes.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/routes/attendance.routes.ts) | **Yes** (all routes) |
| `/api/ai` | [ai.routes.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/routes/ai.routes.ts) | **Yes** (all routes) |

---

## Data Models (MongoDB)

### User Model — [user.model.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/models/user.model.ts)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | String | Auto-gen | Format: `{YYYY}{2-digit random}`, unique |
| `firstName` | String | ✅ | 2–50 chars |
| `lastName` | String | ✅ | 2–50 chars |
| `email` | String | ✅ | Unique, lowercase, validated |
| `password` | String | ✅ | Min 6 chars, `select: false` (hidden by default) |
| `role` | Enum | No | `admin` · `employee` · `manager` |
| `contactNumber` | String | ✅ | 10–15 digits |
| `empStatus` | Enum | No | `active` · `inactive` · `hold` |

---

### Task Model — [task.model.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/models/task.model.ts)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `taskId` | String | Auto-gen | Format: `TSK-{YYYY}-{4-char random}` |
| `title` | String | ✅ | |
| `description` | String | No | |
| `projectId` | ObjectId → Project | ✅ | |
| `assignedTo` | ObjectId → User | No | |
| `status` | Enum | No | `To Do` · `In Progress` · `Completed` |
| `priority` | Enum | No | `Low` · `Medium` · `High` |
| `dueDate` | Date | No | |
| `createdBy` | ObjectId → User | ✅ | |

---

### Project Model — [project.model.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/models/project.model.ts)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `projectId` | String | Auto-gen | Format: `PRJ-{YYYY}-{4-char random}` |
| `projectName` | String | ✅ | |
| `description` | String | ✅ | |
| `startDate` | Date | ✅ | |
| `deadline` | Date | ✅ | |
| `status` | Enum | No | `In Progress` · `Completed` · `On Hold` |
| `priority` | Enum | No | `Low` · `Medium` · `High` |
| `progress` | Number | No | 0–100 |
| `assignees` | ObjectId[] → User | No | Array of assigned users |
| `createdBy` | ObjectId → User | ✅ | |

---

### Leave Model — [leave.model.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/models/leave.model.ts)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | ObjectId → User | ✅ | Employee requesting leave |
| `leaveType` | Enum | ✅ | `sick` · `casual` · `earned` |
| `startDate` | Date | ✅ | |
| `endDate` | Date | ✅ | |
| `reason` | String | ✅ | Reason details |
| `status` | Enum | No | `Pending` · `Approved` · `Rejected` |
| `appliedAt` | Date | No | Auto default: now |

---

### Attendance Model — [attendance.model.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/models/attendance.model.ts)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `user` | ObjectId → User | ✅ | |
| `timestamp` | Date | No | Default: now |
| `type` | Enum | ✅ | `Office Present` · `Remote Present` · `Clocked Out` |
| `coordinates` | String | ✅ | GPS coordinates |
| `distanceMeters` | Number | ✅ | Distance from office |
| `status` | Enum | No | `Approved` · `Pending` · `Rejected` |

---

### Notification Model — [notification.model.ts](file:///c:/Users/rajsu/OneDrive/Desktop/Suraj%20Tradefinance/backend/src/models/notification.model.ts)

| Field | Type | Required |
|-------|------|----------|
| `userId` | ObjectId → User | ✅ |
| `title` | String | ✅ |
| `message` | String | ✅ |
| `time` | Date | Default: now |
| `type` | Enum | `task` · `project` · `alert` · `system` |
| `isRead` | Boolean | Default: false |

---

## API Reference

### 🔐 Users — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/users` | ✅ Bearer | Get all users |
| `GET` | `/api/users/fetchuserlimit?page=1&limit=5` | ✅ Bearer | Paginated user listing |
| `GET` | `/api/users/countuserbyrole?role=employee` | ✅ Bearer | Count users by role |
| `GET` | `/api/users/countactiveusers?empStatus=active` | ✅ Bearer | Count active users |
| `GET` | `/api/users/employees` | ✅ Bearer | Get active employees only |
| `GET` | `/api/users/profile` | ✅ Bearer | Get current user's full profile |
| `PUT` | `/api/users/profile` | ✅ Bearer | Update current user's profile |
| `GET` | `/api/users/:id` | ✅ Bearer | Get user by MongoDB `_id` |
| `POST` | `/api/users` | ✅ Bearer | Create new user |
| `POST` | `/api/users/login` | ❌ | Login user |
| `POST` | `/api/users/logout` | ❌ | Logout user |
| `POST` | `/api/users/forgot-password` | ❌ | Send OTP to email |
| `POST` | `/api/users/reset-password` | ❌ | Reset password with OTP |
| `PUT` | `/api/users/:id` | ✅ Bearer | Update user details |

---

### 📅 Leaves — `/api/leaves` (🔒 All routes require JWT)

| Method | Endpoint | Auth | Role Required | Description |
|--------|----------|------|---------------|-------------|
| `POST` | `/api/leaves/apply` | ✅ | `employee` | Apply for leave |
| `GET` | `/api/leaves/my-leaves` | ✅ | `employee` | Get logged-in employee leaves history |
| `GET` | `/api/leaves/balance` | ✅ | `employee` | Get leave balances |
| `GET` | `/api/leaves/all` | ✅ | `admin`, `manager` | Get all employees' leaves |
| `GET` | `/api/leaves/pending` | ✅ | `admin`, `manager` | Get pending leave requests |
| `PUT` | `/api/leaves/:id/approve` | ✅ | `admin`, `manager` | Approve leave request |
| `PUT` | `/api/leaves/:id/reject` | ✅ | `admin`, `manager` | Reject leave request |

---

### 📋 Tasks — `/api/tasks` (🔒 All routes require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | Get all tasks |
| `GET` | `/api/tasks/:id` | Get single task by ID |
| `POST` | `/api/tasks` | Create task |
| `PUT` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Delete task |
| `GET` | `/api/tasks/:id/comments` | Get all comments on a task |
| `POST` | `/api/tasks/:id/comments` | Add comment |

---

### 📁 Projects — `/api/projects` (🔒 All routes require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | Get all projects |
| `GET` | `/api/projects/:id` | Get project by ID |
| `POST` | `/api/projects` | Create project |
| `PUT` | `/api/projects/:id` | Update project |
| `DELETE` | `/api/projects/:id` | Delete project |

---

### ⏰ Attendance — `/api/attendance` (🔒 All routes require JWT)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/attendance/clock-in` | ✅ | Record clock-in |
| `POST` | `/api/attendance/clock-out` | ✅ | Record clock-out |
| `GET` | `/api/attendance/history` | ✅ | Get own attendance history |
| `GET` | `/api/attendance/all` | ✅ Admin | Get ALL users' attendance |
| `GET` | `/api/attendance/user/:userId` | ✅ | Get user history |
| `GET` | `/api/attendance/pending` | ✅ Admin | Get pending remote approvals |
| `PUT` | `/api/attendance/approve/:id` | ✅ Admin | Approve remote check-in |
| `PUT` | `/api/attendance/reject/:id` | ✅ Admin | Reject remote check-in |

---

## Authentication & Authorization

### JWT Flow

1. Client logins: `POST /api/users/login` → returns JWT + sets cookie
2. Protected routes verified: `protect` middleware checks header/cookie token
3. Role restrictions: `authorize('admin')` restricts route to administrative user

---

## Email Worker (RabbitMQ)

Background Nodemailer service consumes tasks to deliver assignment alerts asynchronously.

---

## Environment Setup

Configure `.env` in backend:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tradefinance
JWT_SECRET=your_jwt_secret_here
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-app-password
RABBITMQ_URL=amqps://...
GEMINI_API_KEY=your_google_gemini_api_key_here
```

---

## Project File Map

### Frontend — `TaskFlow-pro/src/app/`
```
src/app/
├── app.routes.ts
├── guards/auth.guard.ts
├── services/ai.service.ts
├── leave-management/                # Leave management interface
├── error-page/                      # Catch-all routing errors
└── ...
```

### Backend — `backend/src/`
```
src/
├── app.ts
├── server.ts
├── middleware/auth.middleware.ts
├── models/
│   ├── user.model.ts
│   ├── task.model.ts
│   ├── project.model.ts
│   ├── leave.model.ts
│   ├── attendance.model.ts
│   └── notification.model.ts
├── controllers/
│   ├── user.controller.ts
│   ├── task.controller.ts
│   ├── project.controller.ts
│   ├── leave.controller.ts
│   ├── attendance.controller.ts
│   └── ai.controller.ts
├── routes/
│   ├── user.routes.ts
│   ├── task.routes.ts
│   ├── project.routes.ts
│   ├── leave.routes.ts
│   ├── attendance.routes.ts
│   └── ai.routes.ts
├── seed.ts                          # Seed 40 test users
└── seedProjects.ts                  # Seed sample projects
```

---

> [!TIP]
> **For testing APIs**, use tools like Postman or Thunder Client. First call `POST /api/users/login` to get a JWT token, then include it as `Authorization: Bearer <token>` in all protected routes.
