# Maptive

**Maptive** is an enterprise-grade, real-time campus infrastructure monitoring and architectural layout platform. It combines visual topology generation (via AI) with real-time fault tracking (via Firebase) into a seamless, high-end "Arctic Glass" interface.

## 🌟 The Core Idea
The goal is to build a highly interactive, dynamic "Digital Twin" for university IT admins and network engineers. 
- **AI-Powered Generation**: Upload physical architectural PDFs and have an AI automatically draw the network logic, or type a prompt like *"Build a star topology for the CS lab"* to generate the topology.
- **Real-Time Diagnostics**: A live monitoring system where if a router dies (simulated via Firebase), the interface instantly pulses red, lines snap, and Grok (an AI assistant) explains why the breakdown occurred based on historical logs.
- **"Arctic Glass" Aesthetic**: A premium interface featuring a floating, weightless feel with radial gradients, glass cards, and smooth animations using Framer Motion and React Flow.

## 🏗️ Architecture
- **Frontend**: React + Vite + TypeScript + Tailwind CSS. Uses Firebase for Auth/Firestore, and React Flow (`@xyflow/react`) for the interactive canvas.
- **Backend**: Python + FastAPI. Powers the simulation, graph engine, and AI integrations.

---

## 🚀 Getting Started

Follow these steps to run the application locally on your machine.

### Prerequisites
- **Node.js**: 18.0+
- **Python**: 3.9+
- **npm** or **yarn**
- **Git**

### 1. Frontend Setup

Open a terminal and navigate to the project root:

1. **Navigate to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the `frontend/` directory with your API keys:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # AI Integrations (Optional for mock topology)
   VITE_XAI_API_KEY=your_xai_key
   VITE_GEMINI_API_KEY=your_gemini_key
   ```

4. **Start the Frontend Development Server**
   ```bash
   npm run dev
   ```

### 2. Backend Setup

Open a **new** terminal tab/window:

1. **Navigate to the backend directory**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**
   ```bash
   # On Windows
   python -m venv venv
   venv\Scripts\activate

   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the Backend FastAPI Server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### 3. View the App
- **Frontend App**: Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend API & Docs**: Open [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 🛠️ Features
- **Network Topology Visualization**: Interactive canvas with drag-and-drop powered by React Flow.
- **AI Integration**: Use Mock (no API key needed), xAI Grok, or Google Gemini to generate networks from text or PDF floor plans.
- **Real-time Diagnostics**: Simulated hardware failure events triggered via Firebase push updates to the UI instantaneously.
- **Cisco CLI Overlay**: A simulated terminal overlay for running mock Cisco commands (e.g., `conf t`).
- **Self-Healing Simulation**: Visualizes auto-routing to redundant paths when a node goes down.
