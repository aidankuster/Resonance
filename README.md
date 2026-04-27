![Resonance](assets/logo-full.png)

# Resonance
Resonance is a music collaboration platform built to connect students at the University of North Carolina at Pembroke.

## Tech Stack
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)
![Javalin](https://img.shields.io/badge/Javalin-6-0B7285)
![jOOQ](https://img.shields.io/badge/jOOQ-3.20-CB3837)

## Showcase
Landing page:
![Landing Page](https://github.com/user-attachments/assets/432e7290-5fbf-4d82-a022-cf744eb57a85)

Dashboard:
![User Dashboard](https://github.com/user-attachments/assets/8107d81c-009c-4c52-8286-37f46112a6c3)

## Repository Layout
```text
resonance/
|- server/            # Java backend (Javalin, jOOQ, auth, API)
|- react-app/         # React frontend (Vite + TypeScript + Tailwind)
|- assets/            # README and branding assets
|- build.gradle       # Root Gradle config
`- settings.gradle
```
## Prerequisites
1. Java 21
2. Node.js 22.12+ (or 20.19+)
3. npm
4. Database:
   - MySQL
   - MariaDB
   - SQLite

## Local Development
1. Clone:
```bash
git clone https://github.com/aidankuster/Resonance.git
cd Resonance
```

2. Install frontend dependencies:
```bash
cd react-app
npm install
cd ..
```

3. Start backend (from repo root):
```bash
./gradlew :server:run
```

4. Start frontend dev server in a second terminal:
```bash
cd react-app
npm run dev
```

## Building
From the repository root:
```bash
./gradlew build
```

This creates a fat JAR at:
`server/build/libs/server-1.0-all.jar`

The frontend is bundled into that JAR during the build.

## Running the Server
```bash
java -jar server-1.0-all.jar
```

On first startup, the server auto-creates:
1. `config/` - stores config files
2. `resources/` - stores user-uploaded files

## Configuration
Configuration files are read from the current working directory under `config/`.

### `database.json`
```json
{
  "dialect": "MYSQL",
  "host": "localhost",
  "port": 3306,
  "username": "root",
  "password": "",
  "database": "resonance"
}
```

`dialect` values:
1. `MYSQL`
2. `MARIADB`
3. `SQLITE`

Notes:
1. For SQLite, `database` is the file name (without `.db`).
2. For MySQL/MariaDB, ensure the server is reachable using `host` + `port`.

### `webserver.json`
```json
{
  "port": 80,
  "secureCookies": false,
  "jwt": {
    "hashSecret": "replace-me",
    "expirationDuration": 86400000
  }
}
```

Key fields:
1. `port`: HTTP port for Resonance
2. `secureCookies`: set `true` if using HTTPS
3. `jwt.hashSecret`: set to a random string
4. `jwt.expirationDuration`: session token lifetime in milliseconds

## Testing
Run backend tests:
```bash
./gradlew :server:test
```

## Troubleshooting
1. If startup fails with database connection errors, verify `config/database.json` first.
2. If port `80` is blocked, change `webserver.json` to an open port (for example `7070`).
