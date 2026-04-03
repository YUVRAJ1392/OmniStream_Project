# 🎬 OmniStream: AI-Powered Movie Intelligence Platform

OmniStream is an enterprise-grade, full-stack movie catalog and analytics platform. It goes beyond simple browsing by integrating cutting-edge Machine Learning and Deep Learning models to provide users with live sentiment analysis, intelligent recommendations, and box-office success predictions.

---

## ✨ Key Features

- **🧠 Deep Learning Sentiment Analysis:** Live NLP analysis of user reviews using Hugging Face Transformers (`distilbert`). Automatically categorizes community pulse as positive or negative.
- **📈 Hit/Flop Predictor:** A scikit-learn machine learning model that predicts a movie's commercial success based on budget, popularity, and engagement metrics.
- **🕸️ Hybrid Recommendation Engine:** A K-Nearest Neighbors (KNN) matrix combined with relational database mapping to suggest movies based on "Similar Vibes," shared directors, and familiar cast members.
- **🔐 Secure User Ecosystem:** Full JWT authentication with hashed passwords (bcrypt). Users can create profiles, leave reviews, and maintain "Liked" and "Watch Later" lists.
- **⚡ Lightning Fast UI:** A fully optimized React frontend built with Vite and Tailwind CSS, featuring optimistic UI updates for a seamless, app-like experience.

---

## 🛠️ Tech Stack

| Layer        | Technologies                                                    |
| ------------ | --------------------------------------------------------------- |
| **Frontend** | React.js (Vite), Tailwind CSS, Custom JWT Fetch Wrapper         |
| **Backend**  | Python (FastAPI), SQLAlchemy (ORM), JWT & Passlib               |
| **ML / AI**  | Hugging Face `transformers` (PyTorch), `scikit-learn`, `joblib` |

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- Python 3.10+
- Node.js v18+

### 1. Backend Setup (The AI Brain)

Navigate to the backend directory and set up your virtual environment:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder and add your environment variables:

```env
DATABASE_URL=sqlite:///./sql_app.db
SECRET_KEY=generate_a_random_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

> **Note:** The first time you boot the server, it will download the ~250MB Hugging Face transformer model.

### 2. Frontend Setup (The User Interface)

Open a new terminal window, navigate to the frontend directory, and install dependencies:

```bash
cd frontend
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 📁 Project Structure

```text
OMNISTREAM_PROJECT/
├── backend/
│   ├── main.py                 # FastAPI endpoints & AI initialization
│   ├── models.py               # SQLAlchemy Database schemas
│   ├── schemas.py              # Pydantic validation models
│   ├── database.py             # Database connection setup
│   ├── requirements.txt        # Python dependencies
│   └── *.pkl                   # Trained ML models
└── frontend/
    ├── src/
    │   ├── components/         # Reusable UI components (MovieCard, Modal, etc.)
    │   ├── utils/api.js        # JWT-authenticated fetch wrapper
    │   ├── App.jsx             # Main routing and state management
    │   └── index.css           # Tailwind configuration
    ├── package.json
    └── tailwind.config.js
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](../../issues).
