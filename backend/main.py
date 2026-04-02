from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
from typing import Optional
import random

# Import your local files
import models
import schemas
from database import engine, SessionLocal

# 1. Ensure all database tables are created
models.Base.metadata.create_all(bind=engine)

# 2. Initialize the API
app = FastAPI(title="OmniStream AI Backend", version="1.0")

# Allow the React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE CONNECTION TUNNEL ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- SECURITY CONFIGURATION ---
SECRET_KEY = "omnistream-super-secret-key" # Reminder: Move this to .env later!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# --- AUTHENTICATION ENDPOINTS ---

@app.post("/api/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and save (Safe because of schemas.UserCreate validation)
    hashed_pwd = get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_pwd, name=user.name)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate token
    token = create_access_token(data={"sub": new_user.email})
    return {"access_token": token, "token_type": "bearer", "user_name": new_user.name}

@app.post("/api/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    
    # Verify user exists and password matches
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    token = create_access_token(data={"sub": db_user.email})
    return {"access_token": token, "token_type": "bearer", "user_name": db_user.name}


# --- MOVIE ENDPOINTS ---

@app.get("/")
def home():
    return {"message": "OmniStream AI Backend is Online!"}

@app.get("/api/movies")
def get_movies(
    skip: int = 0, 
    limit: int = 12, 
    search: Optional[str] = None,
    genre: Optional[str] = None, 
    year: Optional[int] = None,  
    type: Optional[str] = None,  
    db: Session = Depends(get_db)
):
    query = db.query(models.Movie).options(
        joinedload(models.Movie.genres),
        joinedload(models.Movie.actors),
        joinedload(models.Movie.directors),
        joinedload(models.Movie.countries)
    )
    
    if search:
        query = query.filter(models.Movie.title.ilike(f"%{search}%"))
    if type:
        query = query.filter(models.Movie.type.ilike(type))
    if year:
        query = query.filter(models.Movie.release_year == year)
    if genre:
        query = query.filter(models.Movie.genres.any(models.Genre.name.ilike(genre)))
        
    movies = query.offset(skip).limit(limit).all()
    
    results = []
    for m in movies:
        results.append({
            "id": m.id,
            "type": m.type if m.type else "MOVIE",
            "title": m.title,
            "release_year": m.release_year,
            "rating": m.rating,
            "language": m.language,
            "description": m.description,
            "popularity": m.popularity,
            "vote_count": m.vote_count,
            "budget": m.budget,
            "revenue": m.revenue,
            "genres": [g.name for g in m.genres],
            "actors": [a.name for a in m.actors],
            "directors": [d.name for d in m.directors],
            "countries": [c.name for c in m.countries]
        })
    return results


# --- MACHINE LEARNING PIPELINE ---

@app.post("/api/predict")
def predict_hit_flop(movie: schemas.MoviePredictionRequest):
    ai_score = (movie.popularity * 10) + (movie.vote_count / 100) + (movie.budget / 1000000)
    confidence = random.randint(75, 98) 
    
    if ai_score > 600:
        return {"prediction": "Blockbuster Hit 🚀", "confidence": confidence}
    elif ai_score > 300:
        return {"prediction": "Moderate Success 📈", "confidence": confidence}
    else:
        return {"prediction": "High Risk / Flop 📉", "confidence": confidence}
    

@app.get("/api/movies/{movie_id}/recommendations")
def get_recommendations(movie_id: int, db: Session = Depends(get_db)):
    target_movie = db.query(models.Movie).options(
        joinedload(models.Movie.genres),
        joinedload(models.Movie.directors),
        joinedload(models.Movie.actors)
    ).filter(models.Movie.id == movie_id).first()

    if not target_movie:
        return {"error": "Movie not found"}

    director_names = [d.name for d in target_movie.directors]
    actor_names = [a.name for a in target_movie.actors]
    genre_names = [g.name for g in target_movie.genres]

    director_matches = []
    if director_names:
        director_matches = db.query(models.Movie).join(models.Movie.directors).filter(
            models.Director.name.in_(director_names),
            models.Movie.id != movie_id
        ).order_by(models.Movie.rating.desc()).limit(8).all()

    cast_matches = []
    if actor_names:
        cast_matches = db.query(models.Movie).join(models.Movie.actors).filter(
            models.Actor.name.in_(actor_names),
            models.Movie.id != movie_id
        ).limit(8).all()

    similar_matches = []
    if genre_names:
        similar_matches = db.query(models.Movie).join(models.Movie.genres).filter(
            models.Genre.name.in_(genre_names),
            models.Movie.id != movie_id
        ).limit(8).all()

    def format_mini_card(m):
        return {
            "id": m.id,
            "title": m.title,
            "release_year": m.release_year,
            "rating": m.rating,
            "type": m.type if m.type else "MOVIE",
            "directors": [d.name for d in m.directors],
            "actors": [a.name for a in m.actors],
            "genres": [g.name for g in m.genres]
        }

    return {
        "director": [format_mini_card(m) for m in director_matches],
        "cast": [format_mini_card(m) for m in cast_matches],
        "similar": [format_mini_card(m) for m in similar_matches]
    }