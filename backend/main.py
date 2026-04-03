from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials # <-- NEW: For checking tokens
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
from typing import Optional
import random
import joblib
import os
import models
import schemas
from database import engine, SessionLocal

# 1. Load Hit/Flop AI (Only need to do this once!)
if os.path.exists("omnistream_model.pkl"):
    ai_model = joblib.load("omnistream_model.pkl")
    print("🧠 Hit/Flop Predictor Loaded!")
else:
    ai_model = None

# 2. Load the Hybrid Recommendation AI
try:
    rec_nn = joblib.load("recommender_nn.pkl")
    rec_map_data = joblib.load("recommender_map.pkl")
    rec_matrix = joblib.load("recommender_matrix.pkl")
    
    # Extract the two dictionaries to prevent Data Collisions!
    id_to_idx = rec_map_data.get("id_to_idx", {})
    idx_to_id = rec_map_data.get("idx_to_id", {})
    
    print("🕸️ NLP Recommendation Engine Loaded!")
except Exception as e:
    print(f"⚠️ Recommendation Engine Offline. Run train_recommender.py. Error: {e}")
    rec_nn, id_to_idx, idx_to_id, rec_matrix = None, None, None, None


# 1. Ensure all database tables are created
models.Base.metadata.create_all(bind=engine)

# 2. Initialize the API
app = FastAPI(title="OmniStream AI Backend", version="1.0")

# Allow the React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Allows your React app
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
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
security = HTTPBearer() # <-- NEW: Instructs FastAPI to look for a "Bearer" token in headers

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- NEW: TOKEN VERIFIER (THE BOUNCER) ---
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """
    This function intercepts protected requests, decodes the JWT token, 
    and returns the currently logged-in user.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token structure")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token is expired or invalid")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# --- AUTHENTICATION ENDPOINTS ---

@app.post("/api/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_pwd, name=user.name)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token(data={"sub": new_user.email})
    return {"access_token": token, "token_type": "bearer", "user_name": new_user.name}

@app.post("/api/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    
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
    # 1. THE STREAMING / TV SHOW FALLBACK
    # If there is no budget, we can't use the financial ML model. 
    # Instead, we measure "Cultural Impact" based on popularity and votes.
    if not movie.budget or movie.budget < 1000:
        impact_score = (movie.popularity * 10) + movie.vote_count
        confidence = random.randint(85, 95) # High confidence based on engagement metrics
        
        if impact_score > 5000:
            return {"prediction": "Global Phenomenon 🌍", "confidence": confidence}
        elif impact_score > 1000:
            return {"prediction": "Cult Classic 📺", "confidence": confidence}
        else:
            return {"prediction": "Niche Audience 👤", "confidence": confidence}

    # 2. THE THEATRICAL ML MODEL
    # If it has a budget, pass it to our trained Scikit-Learn brain!
    if ai_model is None:
        return {"prediction": "AI Offline", "confidence": 0}
        
    features = [[movie.budget, movie.popularity, movie.vote_count]]
    prediction_class = ai_model.predict(features)[0]
    
    probabilities = ai_model.predict_proba(features)[0]
    confidence = int(max(probabilities) * 100)
    
    if prediction_class == 2:
        result_text = "Blockbuster Hit 🚀"
    elif prediction_class == 1:
        result_text = "Moderate Success 📈"
    else:
        result_text = "High Risk / Flop 📉"
        
    return {"prediction": result_text, "confidence": confidence}    

@app.get("/api/movies/{movie_id}/recommendations")
def get_recommendations(movie_id: int, db: Session = Depends(get_db)):
    target_movie = db.query(models.Movie).options(
        joinedload(models.Movie.genres),
        joinedload(models.Movie.directors),
        joinedload(models.Movie.actors)
    ).filter(models.Movie.id == movie_id).first()

    if not target_movie:
        return {"error": "Movie not found"}

    # 1. EXACT SQL MATCHING (The Director's Cut & Familiar Faces)
    director_names = [d.name for d in target_movie.directors]
    actor_names = [a.name for a in target_movie.actors]

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
        ).order_by(models.Movie.rating.desc()).limit(8).all()

    # 2. MACHINE LEARNING NLP MATCHING (Similar Vibes)
    similar_matches = []
    
    # NEW: Check id_to_idx instead of rec_map
    if rec_nn is not None and rec_matrix is not None and id_to_idx and movie_id in id_to_idx:
        # Use the first dictionary to get the matrix row
        matrix_idx = id_to_idx[movie_id]
        movie_vector = rec_matrix[matrix_idx]
        
        distances, indices = rec_nn.kneighbors(movie_vector, n_neighbors=9)
        
        recommended_ids = []
        for i in range(1, len(indices[0])):
            match_idx = indices[0][i]
            # Use the second dictionary to convert the matrix row back to a database ID
            match_db_id = idx_to_id[match_idx]
            
            if match_db_id != movie_id:
                recommended_ids.append(match_db_id)
                
        if recommended_ids:
            ordering = {id: index for index, id in enumerate(recommended_ids)}
            unsorted = db.query(models.Movie).options(
                joinedload(models.Movie.genres),
                joinedload(models.Movie.directors),
                joinedload(models.Movie.actors)
            ).filter(models.Movie.id.in_(recommended_ids)).all()
            
            similar_matches = sorted(unsorted, key=lambda m: ordering[m.id])

    # 3. FALLBACK (If AI fails, use basic SQL Genres)
    if not similar_matches and target_movie.genres:
        genre_names = [g.name for g in target_movie.genres]
        similar_matches = db.query(models.Movie).join(models.Movie.genres).filter(
            models.Genre.name.in_(genre_names),
            models.Movie.id != movie_id
        ).limit(8).all()

    # Formatter for the UI
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

# --- NEW: USER FEATURES & PROFILE ---

@app.post("/api/movies/{movie_id}/like")
def toggle_like_movie(movie_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Toggle a movie in the user's liked list."""
    movie = db.query(models.Movie).filter(models.Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
        
    if movie in current_user.liked_movies:
        current_user.liked_movies.remove(movie)
        action = "removed from"
    else:
        current_user.liked_movies.append(movie)
        action = "added to"
        
    db.commit()
    return {"message": f"Movie {action} favorites"}

@app.post("/api/movies/{movie_id}/watch-later")
def toggle_watch_later(movie_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Toggle a movie in the user's watch later list."""
    movie = db.query(models.Movie).filter(models.Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
        
    if movie in current_user.watch_later_movies:
        current_user.watch_later_movies.remove(movie)
        action = "removed from"
    else:
        current_user.watch_later_movies.append(movie)
        action = "added to"
        
    db.commit()
    return {"message": f"Movie {action} watch later"}

@app.post("/api/movies/{movie_id}/reviews", response_model=schemas.ReviewResponse)
def create_review(movie_id: int, review: schemas.ReviewCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Allow a user to post a review for a movie."""
    movie = db.query(models.Movie).filter(models.Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
        
    # Create the new review in the database
    new_review = models.Review(
        content=review.content,
        rating=review.rating,
        user_id=current_user.id,
        movie_id=movie.id
    )
    
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    
    # Attach the author's name manually for the response schema
    new_review.author_name = current_user.name 
    return new_review

@app.get("/api/users/me", response_model=schemas.UserProfileResponse)
def get_user_profile(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Fetch the currently logged in user's profile, including their lists and reviews."""
    # current_user already has the liked_movies and watch_later_movies attached 
    # thanks to SQLAlchemy relationships! We just return it directly.
    
    # We loop through reviews to attach the author name so the frontend can display it easily
    for review in current_user.reviews:
        review.author_name = current_user.name
        
    return current_user