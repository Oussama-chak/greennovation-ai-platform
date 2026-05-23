# 🌿 greenNovation

**AI-powered student support platform** designed to enhance well-being, learning, and productivity through intelligent agents, personalized insights, and gamified experiences.

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/fastapi-0.115+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/react-19+-61dafb.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🎯 Features

### 🤖 AI-Powered Agents
- **Learning Agent**: Personalized learning assistance with knowledge retrieval
- **Readiness Agent**: Student readiness scoring and well-being assessment
- **Energy Agent**: Track and optimize energy levels throughout the day
- **Profile Agent**: Build and manage student learning profiles
- **Planner Agent**: Intelligent project and task planning
- **RAG Agent**: Retrieval-Augmented Generation for knowledge corpus queries
- **Orchestrator**: Unified multi-agent coordination and context management

### 📚 Core Features
- **Conversational AI Chat**: Real-time learning support via intelligent agents
- **Project Management**: Create, track, and manage academic projects with milestones
- **Well-Being Dashboard**: Monitor mood, sleep, focus, and readiness scores
- **Forest Gamification**: Earn rewards and plant digital trees for achievements
- **Learning Corpus**: Upload and query educational materials with semantic search
- **User Profile**: Personalized learning profiles with preference inference
- **Session Management**: Persistent conversation history and context

### 📊 Analytics & Insights
- **Readiness Scoring**: AI-driven assessment of student preparedness
- **Emotional Timeline**: Track mood and well-being patterns over time
- **Smart Recommendations**: Personalized insights based on check-in data
- **Progress Tracking**: Real-time milestone and project completion metrics

---

## 🏗️ Project Structure

```
greenNovation/
├── ai/                              # AI agents and orchestration
│   ├── agents/
│   │   ├── energy/                  # Energy tracking agent
│   │   ├── learning/                # Learning support agent
│   │   ├── profile/                 # User profile inference
│   │   ├── readiness/               # Readiness & well-being scoring
│   │   ├── planner/                 # Task planning agent
│   │   ├── rag/                     # RAG with semantic search
│   │   └── orchestrator/            # Multi-agent coordination
│   ├── graph/                       # LangGraph workflow definitions
│   └── state/                       # Shared agent context
│
├── backend/                         # FastAPI application
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point
│   │   ├── config.py                # Configuration & bootstrap
│   │   ├── api/routes/              # API endpoints
│   │   ├── db/                      # Database schemas
│   │   ├── schemas/                 # Pydantic models
│   │   └── services/                # Business logic services
│   └── routes/                      # Router definitions
│
├── frontend/                        # React/TanStack Start application
│   ├── src/
│   │   ├── routes/                  # Page routes & layouts
│   │   ├── components/              # React components
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/                     # Utilities (API client, etc.)
│   │   ├── context/                 # React context providers
│   │   ├── data/                    # Type definitions & constants
│   │   └── styles/                  # Global styles
│   ├── vite.config.ts               # Vite build configuration
│   └── package.json                 # Dependencies
│
├── data/                            # Local data storage
│   ├── projects.json                # Stored projects
│   └── index.faiss                  # FAISS vector index for RAG
│
├── pyproject.toml                   # Python project metadata
├── requirements.txt                 # Python dependencies
└── README.md                        # Project documentation
```

---

## 🚀 Quick Start

### Prerequisites
- **Python**: 3.10+
- **Node.js**: 18+ (for frontend)
- **API Keys**: 
  - `GROQ_API_KEY` (for LLM inference)
  - `MISTRAL_API_KEY` (optional, for additional AI features)

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/greenNovation.git
cd greenNovation

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install backend dependencies
pip install -e ".[api]"

# Set environment variables
export GROQ_API_KEY="your-groq-key"
export GREENNOVATION_DATA_DIR="./data"
# Optional:
# export MISTRAL_API_KEY="your-mistral-key"
# export CORS_ORIGINS="http://localhost:5173"

# Run the backend server
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend will be available at: **http://127.0.0.1:8000**

API Documentation: **http://127.0.0.1:8000/docs**

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
bun install  # Or use npm/yarn: npm install

# Run development server
bun dev  # Or: npm run dev

# Build for production
bun build
```

Frontend will be available at: **http://localhost:5173**

---

## 📖 API Endpoints

### Chat
- `POST /api/chat/send` - Send message and get AI response

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/{project_id}` - Update project
- `DELETE /api/projects/{project_id}` - Delete project

### Well-Being & Readiness
- `POST /api/readiness/checkin` - Submit daily well-being check-in
- `GET /api/readiness/today` - Get today's readiness score
- `GET /api/readiness/history` - Get readiness history
- `GET /api/readiness/dashboard` - Get dashboard data

### Learning Corpus
- `POST /api/corpus/upload` - Upload learning materials
- `GET /api/corpus/search` - Semantic search in corpus
- `GET /api/corpus/documents` - List uploaded documents

### Forest
- `GET /api/forest/inventory` - Get earned trees and rewards
- `POST /api/forest/plant` - Plant tree after achievement

### Health
- `GET /api/health` - Server health check

**Full API docs available at**: `http://127.0.0.1:8000/docs`

---

## 🔧 Configuration

### Environment Variables

```env
# Required
GROQ_API_KEY=sk_xxxxxxxxxxxx

# Optional
GREENNOVATION_DATA_DIR=./data
MISTRAL_API_KEY=sk_xxxxxxxxxxxx
CORS_ORIGINS=http://localhost:5173,http://localhost:5501
```

### Data Directory

By default, projects and search indices are stored in `./data/`:
```
data/
├── projects.json          # Saved projects
└── index.faiss           # Vector search index
```

To use a custom data directory:
```bash
export GREENNOVATION_DATA_DIR="/path/to/data"
```

---

## 🧠 AI Agents Architecture

The platform uses **LangGraph** for multi-agent orchestration with a state graph pattern:

### Agent Types

| Agent | Purpose | Model |
|-------|---------|-------|
| **Learning Agent** | Provide personalized learning support | Groq LLM |
| **Readiness Agent** | Calculate well-being and readiness scores | Rules + LLM |
| **Energy Agent** | Track daily energy patterns | LLM |
| **Profile Agent** | Build user learning profiles | LLM + Embedding |
| **Planner Agent** | Plan and prioritize tasks | LLM |
| **RAG Agent** | Query learning corpus | Embedding + LLM |
| **Orchestrator** | Route and coordinate all agents | LangGraph |

### Workflow

```
User Message
    ↓
Orchestrator (agent routing)
    ├→ Learning Agent (if learning question)
    ├→ RAG Agent (if corpus query)
    ├→ Readiness Agent (if well-being check)
    └→ Planner Agent (if planning needed)
    ↓
Response Generation
    ↓
User
```

---

## 🗄️ Database Schemas

### Project
```python
{
  "id": "p-xxxxxxxx",
  "name": "Project name",
  "tag": "AI/CS/Humanities",
  "due": "May 12",
  "dueISO": "2026-05-12",
  "nextStep": "Next action",
  "notes": 0,
  "milestones": [
    {"id": "m-xxxxxxxx", "name": "Milestone 1", "done": true}
  ]
}
```

### Readiness Check-in
```python
{
  "date": "2026-04-22",
  "sleep": "good",      # 'poor' | 'okay' | 'great'
  "focus": "high",      # 'low' | 'medium' | 'high'
  "mood": "happy",      # 'sad' | 'neutral' | 'happy'
  "journal": "Optional notes",
  "readinessScore": 75
}
```

---

## 📝 Development

### Project Dependencies

**Core AI/ML:**
- `langgraph>=0.2.55` - Multi-agent orchestration
- `langchain-groq>=0.2.0` - Groq LLM integration
- `langchain-community>=0.2.0` - LangChain ecosystem
- `sentence-transformers>=2.2.0` - Embeddings
- `faiss-cpu` - Vector search

**Backend API:**
- `fastapi>=0.115.0` - Web framework
- `uvicorn[standard]>=0.32.0` - ASGI server
- `pydantic>=2.0` - Data validation

**Frontend:**
- `react>=19` - UI library
- `vite>=6` - Build tool
- `@tanstack/react-router` - Routing
- `typescript` - Type safety

### Running Tests

```bash
# Run Python tests
pytest ai/test/

# Run specific test
pytest ai/test/test_readiness.py -v
```

### Code Style

Format with:
```bash
# Frontend
npm run format

# Python (recommended: black, isort)
black .
isort .
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** your changes: `git commit -m 'Add feature'`
4. **Push** to the branch: `git push origin feature/your-feature`
5. **Open** a Pull Request

### Development Guidelines
- Write tests for new features
- Follow existing code style
- Update documentation for API changes
- Test both frontend and backend changes

---

## 🐛 Troubleshooting

### Backend Issues

**"GROQ_API_KEY not set"**
```bash
export GROQ_API_KEY="your-key"
```

**"ModuleNotFoundError: No module named 'backend'"**
```bash
# Make sure you're in the repo root
cd greenNovation
pip install -e ".[api]"
```

**CORS errors in frontend**
```bash
export CORS_ORIGINS="http://localhost:5173,http://localhost:5501"
```

### Frontend Issues

**Vite port already in use**
```bash
# Change port in vite.config.ts or run on different port
PORT=5174 npm run dev
```

**Module resolution errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules bun.lockb
bun install
```

---

## 📊 Project Status

### ✅ Completed
- [x] Multi-agent AI orchestration
- [x] FastAPI backend with core endpoints
- [x] React frontend with UI components
- [x] Project management system
- [x] Forest gamification
- [x] Basic readiness scoring
- [x] Learning corpus with FAISS indexing

### 🚧 In Progress
- [ ] Enhanced well-being dashboard
- [ ] Real-time notifications
- [ ] Advanced analytics
- [ ] Mobile app support

### 📋 Planned
- [ ] User authentication & multi-user support
- [ ] Database integration (PostgreSQL)
- [ ] Advanced RAG with hybrid search
- [ ] Social features (leaderboards, peer support)

---

## 📞 Support & Contact

- **Issues**: Report bugs on [GitHub Issues](https://github.com/yourusername/greenNovation/issues)
- **Discussions**: Ask questions on [GitHub Discussions](https://github.com/yourusername/greenNovation/discussions)
- **Email**: contact@greennovation.dev

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/), [React](https://react.dev/), and [LangGraph](https://langchain.com/docs/langgraph)
- AI powered by [Groq](https://groq.com/) and [LangChain](https://langchain.com/)
- UI components by [Radix UI](https://www.radix-ui.com/)

---

## 🌟 Show Your Support

If you find greenNovation helpful, please consider:
- ⭐ Starring the repository
- 🔄 Sharing with others
- 🐛 Reporting issues and bugs
- 💡 Contributing features and improvements

**Made with 💚 for students everywhere.**
