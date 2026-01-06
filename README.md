# chatbot-fyp

#run DB locally

## Run locally

### Requirements

- Node.js
- MySQL (server running)

### 1) Install dependencies

```bash
npm install
cd server && npm install


2) set up database

mysql -u root -p < db/schema.sql


3) configure the env variables

cp server/.env.example server/.env


4)start the backend server

cd server
node index.js

5) start the frontend

npm run dev

6) verify

USE chatbot_app;
SELECT * FROM sessions ORDER BY created_at DESC;
```

USE chatbot_app;

SELECT \* FROM sessions ORDER BY created_at DESC;

SELECT session_id, role, content, created_at
FROM messages
ORDER BY created_at DESC
LIMIT 20;
