# ⚡ CodeMind IDE

> AI-powered Web IDE with real-time code review, bug detection, security scanning, and algorithm visualization.

![CodeMind IDE](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688)
![Gemini](https://img.shields.io/badge/AI-Gemini_2.5_Flash-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Features

# Current
- **Monaco Editor** — VS Code-quality editor with syntax highlighting for 7 languages
- **AI Code Review** — Bug detection, security scanning, performance analysis, quality scoring
- **Auto Fix** — AI rewrites your code with all issues fixed
- **Explain Code** — Natural language explanation of what your code does
- **Generate Tests** — Automatic unit test generation (pytest, Jest, JUnit)

# Coming Soon
- **Algorithm Visualizer** — 14 algorithms animated step by step
- **Resizable Panels** — Drag to resize sidebar, editor, and AI panel

## 🧠 Algorithm Visualizer (Coming Soon)

| Category | Algorithms |
|---|---|
| Sorting | Bubble, Insertion, Selection, Merge, Quick Sort |
| Searching | Linear Search, Binary Search |
| Graph | BFS, DFS |
| Recursion | Fibonacci, Factorial |
| Data Structures | Stack, Queue, Linked List |

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Monaco Editor, CSS Modules, Vite |
| Backend | FastAPI, Python 3.11, Pydantic |
| AI | Google Gemini 2.5 Flash (Free tier) |
| Styling | Custom cyberpunk design system |

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Free Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env: GEMINI_API_KEY=your_key_here
uvicorn backend.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run build
cd dist
python -m http.server 8080
```

Open **http://127.0.0.1:8080**

## 📁 Project Structure
```
codemind-ide/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── models.py            # Pydantic schemas
│   ├── routers/ai.py        # API endpoints
│   └── services/llm.py      # Gemini AI integration
└── frontend/
    └── src/
        ├── components/      # React components
        ├── hooks/           # Custom hooks
        ├── utils/           # Helper functions
        └── styles/          # Global CSS
```

## 🔑 Environment Variables
```
GEMINI_API_KEY=your_gemini_api_key
```

## 📸 Screenshots
*Coming soon*

## 🤝 Contributing
Pull requests are welcome!

## 📄 License
MIT