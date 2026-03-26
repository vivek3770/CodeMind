# ⚡ CodeMind IDE

> AI-powered Web IDE with real-time code review, bug detection, algorithm visualization, and live code execution tracing.

![CodeMind IDE](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688)
![Gemini](https://img.shields.io/badge/AI-Gemini_2.5_Flash-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Features

- **Monaco Editor** — VS Code-quality editor with syntax highlighting for multiple languages.
- **AI Code Review** — Bug detection, security scanning, performance analysis, readability scoring, and overall code quality score.
- **Auto Fix** — AI rewrites your code with all issues fixed and applies it directly to the editor.
- **Explain Code** — Structured, natural language explanation of what your code does, highlighting key components and execution flow.
- **Generate Tests** — Automatic unit test generation for various frameworks (pytest, Jest, JUnit, etc.).
- **Code Visualizer** — Safely trace and visualize your actual Python code execution step by step, showing variable states, call stacks, and changes.
- **Algorithm Visualizer** — 14 pre-built algorithms animated step by step across sorting, searching, graphs, and data structures.
- **Resizable Panels** — Drag to resize the file explorer sidebar, main editor area, and right-hand AI/Visualization panels.

## 🧠 Algorithm Visualizer

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
| Frontend | React 18, Monaco Editor (`@monaco-editor/react`), CSS Modules, Vite |
| Backend | FastAPI, Python 3.11+, Pydantic, RestrictedPython (for safe tracing) |
| AI | Google Gemini 2.5 Flash (Free tier via `google-generativeai`) |
| Styling | Custom cyberpunk design system with dark mode |

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Backend
```bash
cd backend
python -m venv venv

# Activate Virtual Environment
venv\Scripts\activate       

pip install -r requirements.txt
cp .env.example .env
# Edit .env and set: GEMINI_API_KEY=your_key_here

# Start the server
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

```text
codemind-ide/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── models.py            # Pydantic schemas for requests/responses
│   ├── routers/ai.py        # API endpoints for AI and visualization
│   └── services/
│       ├── llm.py           # Gemini AI integration (Review, Fix, Explain, Tests)
│       └── code_tracer.py   # Safe Python execution and variable tracing
└── frontend/
    ├── package.json         # Vite and React dependencies
    ├── vite.config.js       # Vite configuration
    └── src/
        ├── App.jsx          # Main IDE application layout
        ├── components/      # React components (Editor, FileExplorer, Panels)
        ├── hooks/           # Custom React hooks (useAI, useEditor, useCodeVisualizer)
        ├── utils/           # Helper utilities (Monaco markers)
        └── styles/          # Global styles and themes
```

## 🔑 Environment Variables

Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
MAX_EXECUTION_STEPS=500     # Optional: Limit for code tracer steps
MAX_EXECUTION_TIMEOUT=5     # Optional: Timeout in seconds for code tracer
```

## 📸 Screenshots
*Coming soon*

## 🤝 Contributing
Pull requests are welcome! Feel free to open issues for new features, bug reports, and enhancements.

## 📄 License
MIT