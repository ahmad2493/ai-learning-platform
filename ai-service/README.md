# AI Service

FastAPI service implementing RAG (Retrieval-Augmented Generation) for intelligent question answering based on physics textbook content.

## Authors
- **Sajeela Safdar (BCSF22M001)** - AI Development, RAG Implementation
- **Muhammad Ahmad (BCSF22M002)** - AI Development, DevOps, Deployment

## Features

### RAG System
- Dual vector store architecture (MathBERT + OpenAI embeddings)
- Semantic and keyword-based retrieval
- Context-aware question answering
- Reference query parsing (MCQ, Short Questions, Examples, etc.)

### Question Answering
- Physics textbook-based answers
- Mathematical formula handling
- LaTeX to Unicode conversion
- Step-by-step solution generation

### Vector Database
- ChromaDB for persistent storage
- Azure File Share integration
- Automatic vector store creation and loading

## Directory Structure

```
ai-service/
├── app.py                    # FastAPI application entry point
├── BookRAG.py                # Main RAG implementation
├── mathbert_embeddings.py    # MathBERT embedding model
├── pdf_reader.py             # PDF processing utilities
├── PhysicsBook_docling.md    # Processed textbook content
├── requirements.txt          # Python dependencies
├── Dockerfile               # Docker container configuration
└── startup.sh               # Container startup script
```

## Setup

### Installation
```bash
pip install -r requirements.txt
```

### Environment Variables
Create a `.env` file:
```
OPENAI_API_KEY=your_openai_api_key
```

### Run Locally
```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

### Run with Docker
```bash
docker build -t darsgah-rag .
docker run -p 8000:8000 -e OPENAI_API_KEY=your_key darsgah-rag
```

## API Endpoints

### Health Check
- `GET /` - Service status

### Question Answering
- `POST /api/ask` - Ask a physics question
  ```json
  {
    "question": "What is Newton's first law?"
  }
  ```

## RAG Architecture

### Dual Vector Stores
1. **MathBERT Vector Store**: For mathematical content and formulas
2. **OpenAI Vector Store**: For textual content and explanations

### Retrieval Strategy
- **Keyword-based**: For reference queries (e.g., "Example 1.2", "MCQ 2.3")
- **Semantic-based**: For conceptual questions
- **Hybrid**: Combines both strategies for optimal results

### Processing Pipeline
1. Load and chunk markdown content
2. Separate math and text chunks
3. Create/load vector stores
4. Setup QA chain with LLM
5. Process queries with context retrieval

## Content Processing

- **Input**: Physics textbook in markdown format
- **Chunking**: Recursive text splitting with overlap
- **Separation**: Math content (with LaTeX) vs. text content
- **Storage**: ChromaDB with persistent storage in Azure File Share

## Query Types Supported

- Short Questions (SQ)
- Multiple Choice Questions (MCQ)
- Examples
- Exercises
- Numerical Problems
- Tables and Figures
- Topics and Chapters

## Deployment

Deployed on Azure Web App (Darsgah-Rag) via GitHub Actions.
- Container: Docker
- Storage: Azure File Share for ChromaDB
- See `.github/workflows/deploy-ai-service.yml` for deployment configuration

## Key Technologies

- **FastAPI**: Web framework
- **LangChain**: LLM framework
- **ChromaDB**: Vector database
- **OpenAI**: LLM and embeddings
- **MathBERT**: Mathematical embeddings
- **Transformers**: Hugging Face models

## Notes

- First run creates ChromaDB from markdown file
- Subsequent runs load existing ChromaDB from Azure File Share
- ChromaDB path: `/mnt/chroma` (mounted to Azure File Share)

