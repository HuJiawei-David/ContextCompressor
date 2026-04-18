# ContextCompressor

**ContextCompressor** is a high-performance developer tool designed to solve "context fatigue" in LLM-assisted workflows. By leveraging the **Entropy Squeezer** engine, it distills complex Jupyter Notebooks (`.ipynb`) and dense codebases into high-density, semantic "Context Recovery Packages," significantly reducing token costs and improving model attention.

---

## 🚀 The Core Problem

Modern LLMs (like Gemini 1.5 Pro/Flash) have massive context windows, but their "effective attention" degrades as noise increases. Jupyter Notebooks are particularly problematic due to:
* **Redundant JSON Metadata:** Non-functional execution counts and cell IDs.
* **Binary Bloat:** Massive Base64-encoded image strings in outputs.
* **Token Entropy:** Low-density boilerplate code that consumes expensive context space.

**ContextCompressor** "squeezes" this entropy out, preserving only the essential logic and state.

---

## 🛠 Technology Stack

### **Frontend / Orchestration**
* **Framework:** Next.js 14+ (App Router)
* **Styling:** Tailwind CSS + Framer Motion (State-aware UI)
* **AI Integration:** Google Gemini 1.5 Flash API

### **Optimization Engine: Entropy Squeezer**
A distributed system designed for token-level classification and pruning.
* **Backend Orchestrator:** Java 21 / Spring Boot 3.2 (gRPC Scheduler).
* **Inference Engine:** Python 3.12 / PyTorch.
* **Model:** Microsoft’s **LLMLingua-2** for task-agnostic prompt compression.
* **Hardware Acceleration:** Apple Silicon **MPS (Metal Performance Shaders)** optimization.

---

## 🏗 System Architecture

The project utilizes a decoupled microservices architecture to balance high-concurrency scheduling with heavy ML inference:

1.  **Local Parser:** Client-side processing extracts `source` code from `.ipynb` cells, ensuring privacy and reducing payload size.
2.  **gRPC Communication:** Low-latency, type-safe data transfer between the Java scheduler and the Python inference layer.
3.  **Hardware-Aware Inference:** The engine automatically detects MPS/GPU backends for near-instant compression.

---

## 📊 Performance Benchmark

Real-world testing on standard data science notebooks demonstrates:

| Metric | Result |
| :--- | :--- |
| **Compression Rate** | **~52%** (Token reduction without semantic loss) |
| **Cold Start Latency** | ~14.6s (Model loading) |
| **Warm Start Latency** | **~1.6s** (10x performance boost via weight caching) |
| **Semantic Integrity** | Zero loss in core instructional logic |

---

## 📦 Quick Start

### 1. Python Inference Engine (Port 50051)
```bash
cd compression-service
pip install -r requirements.txt
python server.py
```

### 2. Java Scheduler Service (Port 8080)
```bash
cd scheduler-service
mvn clean compile spring-boot:run
```

### 3. Test the Compression API
```bash
curl -X POST http://localhost:8080/api/v1/compress \
-H "Content-Type: application/json" \
-d '{
  "query": "Summarize this notebook.",
  "documents": ["import torch\nmodel = torch.load('model.pth')..."],
  "targetCompressionRate": 0.5
}'
```

---

## ✨ Key Features

* **Intelligent Pruning:** Uses token-level classification (LLMLingua-2) rather than random truncation.
* **Vibe Coding Workflow:** Built for speed and rapid iteration using AI-assisted prototyping.
* **Production Ready:** Implements robust error handling, modern Java 21 `records`, and hardware-aware optimizations.
