# 🎬 OmniStream AI

OmniStream AI is a modern, full-stack web application that combines a high-performance Python backend with a reactive frontend. It features secure user authentication, advanced movie cross-filtering, a simulated machine learning prediction pipeline, and a content-based recommendation engine.

## ✨ Features

* **🔐 Secure Authentication:** JWT-based user login and registration with secure `bcrypt` password hashing and strict Pydantic data validation.
* **🔎 Advanced Movie Filtering:** High-speed querying across multiple relational database tables allowing users to filter by search terms, genres, release years, and movie types simultaneously.
* **🤖 Prediction Pipeline:** An API endpoint designed to ingest movie metrics (budget, popularity, vote count) and output a simulated AI confidence score predicting if a movie will be a hit or a flop.
* **🎯 Smart Recommendations:** A content-based matching engine that queries the database for overlapping directors, cast members, and genres to serve contextual movie recommendations.

## 🛠️ Tech Stack

**Backend (Python):**
* [FastAPI](https://fastapi.tiangolo.com/) - High-performance web framework
* [SQLAlchemy](https://www.sqlalchemy.org/) - ORM for database interactions
* [PostgreSQL](https://www.postgresql.org/) - Relational database (via `psycopg2`)
* [Pydantic](https://docs.pydantic.dev/) - Data validation and schemas
* [Uvicorn](https://www.uvicorn.org/) - ASGI web server
* JWT & Passlib - For secure authentication and token generation

**Frontend (JavaScript):**
* [React](https://react.dev/) - UI Library
* [Vite](https://vitejs.dev/) - Next-generation frontend tooling

---

## 📂 Project Structure

```text
OMNISTREAM_PROJECT/
├── backend/
│   ├── .env               # Environment variables (Secrets & DB URL)
│   ├── requirements.txt   # Python dependencies
│   ├── database.py        # SQLAlchemy engine and session setup
│   ├── main.py            # FastAPI application and route definitions
│   ├── models.py          # Database schema definitions
│   └── schemas.py         # Pydantic validation models
└── frontend/
    ├── package.json       # Node.js dependencies
    ├── src/               # React components and assets
    └── vite.config.js     # Vite configuration
