# Conceptly

[![Vercel](https://vercel.com/button)](https://conceptly-gamma.vercel.app)

**Conceptly** is an AI-powered learning and project platform where users can track coding progress, complete challenges, and manage projects effectively. It combines modern frontend performance with intelligent backend systems to deliver a seamless developer experience.

---

## 🌐 Live Demo

- **Frontend (Vercel):** https://conceptly-gamma.vercel.app  
- **Backend (Render):** https://codiesss-conceptly.onrender.com

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
- [How to Run Locally](#how-to-run-locally)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## ✨ Features

- Multi-Agent Architecture with specialized agents for teaching, evaluation, content generation, and retrieval
- Checkpoint-based structured learning  
- AI-powered tutor with multiple modes (supportive, strict, motivational, exam)  
- RAG-based learning using uploaded notes (PDF/text)  
- Context-aware doubt solving  
- Adaptive quiz system with semantic evaluation  
- Feynman-style re-teaching for weak areas  
- Smart notes generation (cheat sheets, summaries, practice questions)  
- Weak topic tracking and analytics  
- Gamification (XP, levels, streaks, badges)  
- Modify checkpoints for personalized learning paths  
- Multi-API key LLM handling (rate limit safe)  

---

## Tech Stack

 - Frontend: React.js, Vite
 - Backend: FastAPI, Python
 - Database: Firestore
 - AI/LLM Integration: Groq LLM API (LLaMA 3.3 70B), LangChain, Langraph, Multi-Key API Handling
 - RAG (Retrieval-Augmented Generation): FAISS, Embeddings-based Retrieval
 - File Handling: PDF Processing, Text Parsing
 - Authentication & Security: Firebase Authentication
 - API & Integration: Tavily API, CORS Middleware
 - Development Tools: Git, GitHub
 - Deployment: Frontend - Vercel , Backend - Render

---

## Project Architecture


Frontend (React + Vite)
↓
Backend API (FastAPI)
↓
AI Layer (LangChain + Groq)
↓
Database (Firestore)

### Installation

Clone the repository:

```bash
git clone https://github.com/shailysahu1972006/conceptly.git
cd conceptly/frontend
cd frontend
npm install
cd ..
cd backend
pip install -r requirements.txt
```

### Start the frontend:
npm run dev

### Start the backend:
uvicorn app.main:app --reload

## Environment Variables

Create a .env file in both frontend and backend:

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://127.0.0.1:8000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Backend (`backend/.env`)
```env
GROQ_API_KEY=your_groq_api_key_1
GROQ_API_KEY2=your_groq_api_key_2
GROQ_API_KEY3=your_groq_api_key_3
GROQ_API_KEY4=your_groq_api_key_4
TAVILY_API_KEY=your_tavily_api_key
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langchain_api_key
LANGCHAIN_PROJECT=your_langchain_project_name
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"your_project_id","private_key_id":"your_private_key_id","private_key":"your_private_key","client_email":"your_client_email","client_id":"your_client_id","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"your_client_x509_cert_url","universe_domain":"googleapis.com"}
```

---

## Project Structure
root/
├─ frontend/         # React + Vite app
│  ├─ src/
│  │  ├─ components/
│  │  ├─ pages/
│  │  ├─ services/
│  │  └─ App.jsx
|  └─ .env  
├─ backend/          # FastAPI app
│  ├─ app/
│  │  ├─ main.py
│  │  ├─ routes/
│  │  └─ models/
│  ├─ requirements.txt  
|  └─ .env          
└─ README.md


