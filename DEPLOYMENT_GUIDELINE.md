# 🚢 Ottolearn Deployment Guide

This guide covers how to deploy the entire stack (Frontend, Backend, and Database) on your remote server using Docker.

---

## 🛠️ Prerequisites
- **Docker** and **Docker Compose** installed on your server.
- Port **6080**, **6081**, and **6082** must be open.

---

## 🚀 Quick Start (Deployment Steps)

### 1. Clone the Repository
Connect via PuTTY and run:
```bash
git clone <your-repo-url>
cd tutor-dashboard
```

### 2. Configure Environment
Create a `.env` file in the root directory:
```bash
# Backend Environment
DATABASE_URL=postgresql://admin:password123@db:5432/course_platform?schema=public
NODE_ENV=production
PORT=4000

# Add other backend secrets here (OpenAI keys, etc.)
OPENAI_API_KEY=your_key_here
```

### 3. Build and Start Services
Run the following command to build the images and start the containers in detached mode:
```bash
docker-compose up -d --build
```

---

## 🌐 Accessing the Application

| Component | Public URL | Internal Port |
| :--- | :--- | :--- |
| **Frontend UI** | `http://your-server-ip:6080` | `80` |
| **Backend API** | `http://your-server-ip:6081` | `4000` |
| **PostgreSQL** | `localhost:6082` | `5432` |

> [!IMPORTANT]
> Since the frontend is a Client-Side App, it communicates with the API via the visitor's browser. If you access the site via a public IP, the `VITE_API_BASE_URL` in `docker-compose.yml` should be updated to point to that public IP instead of `localhost`.

---

## 🔍 Verification & Logs

### Check Running Containers
```bash
docker ps
```

### View Logs
```bash
# All logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f api
```

### Run Database Migrations
The backend is configured to use Prisma. To ensure the database schema is up to date:
```bash
docker-compose exec api npx prisma migrate deploy
docker-compose exec api npm run db:seed
```

---

## 🔧 Managing Services
- **Stop**: `docker-compose stop`
- **Restart**: `docker-compose restart`
- **Down (Remove)**: `docker-compose down` (Add `-v` to also remove the database volume)
