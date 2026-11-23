# TaskMask Management

A Team Task Management application built with the **MERN stack** (MongoDB, Express, React, Node.js) featuring user authentication (login/register) and team-based task management.

## Features

- **Authentication:** User registration, login, JWT-based session handling
- **Teams:** Create teams, join teams via invite code, view team members
- **Tasks:** Create, update, delete tasks; assign tasks to team members; track status (To Do, In Progress, Review, Done) and priority (Low, Medium, High)
- **Protected Routes:** Dashboard, teams, and tasks pages require authentication

## Project Structure

```
TaskMaskManagement/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Navbar, PrivateRoute
│   │   ├── context/        # AuthContext (JWT state management)
│   │   ├── pages/          # Login, Register, Dashboard, Teams, Tasks
│   │   ├── services/       # API client (axios with auth interceptor)
│   │   └── App.jsx
│   └── package.json
├── server/                 # Node.js + Express backend
│   ├── config/             # Database connection
│   ├── controllers/        # Auth, Team, Task controllers
│   ├── middleware/         # JWT auth middleware
│   ├── models/             # User, Team, Task Mongoose models
│   ├── routes/             # Auth, Team, Task routes
│   ├── utils/              # JWT token generator
│   ├── .env                # Environment variables
│   ├── server.js           # Entry point
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js (v16+)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## Getting Started

### 1. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file (already provided) or update the existing one:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/taskmaskmanagement
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
```

Start the backend:

```bash
npm run dev     # development (nodemon)
# or
npm start       # production
```

Server runs on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend runs on `http://localhost:3000` and proxies API requests to `http://localhost:5000`.

### 3. Use the App

1. Open `http://localhost:3000`
2. Register a new account or log in
3. Create a team (note the invite code)
4. Invite teammates to join using the invite code
5. Create and manage tasks within your team

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Teams
- `GET /api/teams` - Get user's teams (protected)
- `POST /api/teams` - Create team (protected)
- `GET /api/teams/:id` - Get team details (protected)
- `POST /api/teams/join` - Join team by invite code (protected)
- `PUT /api/teams/:id` - Update team (protected, owner only)
- `DELETE /api/teams/:id` - Delete team (protected, owner only)

### Tasks
- `GET /api/tasks?team=:teamId` - Get tasks for a team (protected)
- `POST /api/tasks` - Create task (protected)
- `PUT /api/tasks/:id` - Update task (protected)
- `DELETE /api/tasks/:id` - Delete task (protected)

## License

MIT
