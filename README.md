# ⚡ CodeMind IDE

> An interactive, agentic Web IDE designed to review, explain, and autonomously fix your code. Backed by CodeBERT vulnerability pre screening and RAG memory, it lets you run code in secure sandboxes, search concepts semantically, and visualize program execution and algorithms step by step.

![CodeMind IDE](https://img.shields.io/badge/version-2.0.0-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688)
![Gemini](https://img.shields.io/badge/AI-Gemini_2.5_Flash-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Features

### 💻 IDE Workspace & Files
- **Semantic AST Search & Line-Jumping** — Concept-aware code search that supports direct line-jumping to matching target files.
- **Complexity Analyzer** — Detailed maintainability indexes, Halstead metrics, and cyclomatic complexity scoring.
- **Drag-and-Drop File System** — High-performance file tree navigation supporting instant drag-and-drop workspace uploads.

### 🤖 Intelligent AI Engine
- **AI Code Review** — Cognitive bug scanning, security audits, and performance analysis with custom scorecards.
- **Auto-Fix** — One-click autonomous in-editor code patching and patch applications.
- **Explain Code** — Natural language structural breakdowns, architectural explanations, and execution flow analysis.
- **Generate Tests** — Automated, high-coverage unit test suite generation for standard frameworks.
- **Fine-Tuned Bug Classifier** — Fine-tuned CodeBERT model pre-screening code vulnerabilities before LLM reviews, featuring a serverless Hugging Face Inference API fallback for lightweight production deployments.
- **Contextual RAG Memory** — Vector-retrieval pipeline that references historic reviews for consistent future recommendations.

### 📊 Runtime & Visualizations
- **Hybrid Code Execution** — Secure code execution sandbox utilizing local Docker containers with automatic fallback to OnlineCompiler.io API execution runner in production.
- **Line-by-Line Code Visualizer** — Safe tracing of Python code, dynamically rendering variable states and call stacks frame-by-frame.
- **Algorithm Visualizer** — Animated step-by-step visualizations of 14 key sorting, graph, and recursion algorithms.

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
| Backend | FastAPI, Python 3.11+, SQLite, Docker (Local), OnlineCompiler.io API (Cloud), Pydantic |
| AI | Google Gemini 2.5 Flash, CodeBERT (Local), Hugging Face Hub (Production), JSON Vector Store |
| Styling | Custom cyberpunk design system with dark mode |

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker *(required for secure sandbox execution)*
- Free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Run the Backend
```bash
cd backend
python -m venv venv

# Activate Virtual Environment (Windows)
venv\Scripts\activate
# Activate Virtual Environment (macOS/Linux)
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY

uvicorn backend.main:app --reload --port 8000
```

### 2. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔑 Environment Variables

### Backend (`backend/.env`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
MAX_EXECUTION_STEPS=500     # Limit for variable tracer steps (default: 500)
MAX_EXECUTION_TIMEOUT=5     # Execution timeout limit in seconds (default: 5)

# Production fallbacks (Render cloud environment)
ONLINE_COMPILER_KEY=your_onlinecompiler_io_api_key_here
HF_TOKEN=your_huggingface_inference_token_here
HF_MODEL_REPO=Monkey3770/Codebert-bug-classifier
```

### Frontend (`frontend/.env` - Optional):
```env
VITE_API_URL=http://localhost:8000  # Leave blank to automatically use local fallback
```

---

## 📁 Project Structure

```text
codemind-ide/
├── backend/
│   ├── data/                # SQLite DBs (Reviews, RAG Memory) & JSON vector store
│   ├── models/              # Local offline bug classifier ML models
│   ├── main.py              # FastAPI entry point
│   ├── models.py            # Pydantic schemas for requests/responses
│   ├── routers/ai.py        # API endpoints for AI and visualization
│   └── services/
│       ├── llm.py           # Gemini AI integration (Review, Fix, Explain)
│       ├── test.py          # Automated unit test generation framework
│       ├── code_tracer.py   # Safe Python execution and variable tracing
│       ├── code_executor.py # Dockerized secure code execution
│       ├── code_indexer.py  # Semantic search indexing (JSON Vector Store)
│       ├── rag_pipeline.py  # RAG retrieval and context building
│       ├── complexity_analyzer.py # Static code complexity analysis 
│       └── review_history.py # SQLite service for storing code reviews
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

---

## 🤝 Contributing
Contributions are welcome! Please feel free to open issues or submit pull requests for new features, bug reports, and enhancements.

---

## 📄 License
MIT