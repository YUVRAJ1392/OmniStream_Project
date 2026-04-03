from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
from typing import Optional
import random
import joblib
import os
from transformers import pipeline

import models
import schemas
from database import engine, SessionLocal

# ==========================================
# --- LOAD AI MODELS & BRAINS ---
# ==========================================

# 1. Deep Learning Sentiment Transformer
print("🧠 Booting up Deep Learning Sentiment Transformer...")
sentiment_pipeline = pipeline(
    "sentiment-analysis", 
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

# 2. Hit/Flop Predictor
if os.path.exists("omnistream_model.pkl"):
    ai_model = joblib.load("omnistream_model.pkl")
    print("🧠 Hit/Flop Predictor Loaded!")
else:
    ai_model = None

# 3. Hybrid Recommendation AI
try:
    rec_nn = joblib.load("recommender_nn.pkl")
    rec_map_data = joblib.load("recommender_map.pkl")
    rec_matrix = joblib.load("recommender_matrix.pkl")
    
    # Extract the two dictionaries to prevent Data Collisions
    id_to_idx = rec_map_data.get("id_to_idx", {})
    idx_to_id = rec_map_data.get("idx_to_id", {})
    
    print("🕸️ NLP Recommendation Engine Loaded!")
except Exception as e:
    print(f"⚠️ Recommendation Engine Offline. Run train_recommender.py. Error: {e}")
    rec_nn, id_to_idx, idx_to_id, rec_matrix = None, None, None, None

# ==========================================
# --- APP INITIALIZATION & DATABASE ---
# ==========================================

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="OmniStream AI Backend", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# --- SECURITY CONFIGURATION ---
# ==========================================

SECRET_KEY = "omnistream-super-secret-key" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer() 

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
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

# ==========================================
# --- AUTHENTICATION ENDPOINTS ---
# ==========================================

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

# ==========================================
# --- MOVIE ENDPOINTS ---
# ==========================================

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

# ==========================================
# --- MACHINE LEARNING PIPELINE ---
# ==========================================

@app.post("/api/predict")
def predict_hit_flop(movie: schemas.MoviePredictionRequest):
    if not movie.budget or movie.budget < 1000:
        impact_score = (movie.popularity * 10) + movie.vote_count
        confidence = random.randint(85, 95) 
        
        if impact_score > 5000:
            return {"prediction": "Global Phenomenon 🌍", "confidence": confidence}
        elif impact_score > 1000:
            return {"prediction": "Cult Classic 📺", "confidence": confidence}
        else:
            return {"prediction": "Niche Audience 👤", "confidence": confidence}

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

    similar_matches = []
    if rec_nn is not None and rec_matrix is not None and id_to_idx and movie_id in id_to_idx:
        matrix_idx = id_to_idx[movie_id]
        movie_vector = rec_matrix[matrix_idx]
        distances, indices = rec_nn.kneighbors(movie_vector, n_neighbors=9)
        
        recommended_ids = [idx_to_id[indices[0][i]] for i in range(1, len(indices[0])) if idx_to_id[indices[0][i]] != movie_id]
                
        if recommended_ids:
            ordering = {id: index for index, id in enumerate(recommended_ids)}
            unsorted = db.query(models.Movie).options(
                joinedload(models.Movie.genres),
                joinedload(models.Movie.directors),
                joinedload(models.Movie.actors)
            ).filter(models.Movie.id.in_(recommended_ids)).all()
            similar_matches = sorted(unsorted, key=lambda m: ordering[m.id])

    if not similar_matches and target_movie.genres:
        genre_names = [g.name for g in target_movie.genres]
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

# ==========================================
# --- USER FEATURES & PROFILE ---
# ==========================================

@app.delete("/api/reviews/{review_id}")
def delete_review(review_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")
        
    db.delete(review)
    db.commit()
    return {"message": "Review deleted successfully"}

@app.post("/api/movies/{movie_id}/like")
def toggle_like_movie(movie_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
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
    movie = db.query(models.Movie).filter(models.Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
        
    new_review = models.Review(
        content=review.content,
        rating=review.rating,
        user_id=current_user.id,
        movie_id=movie.id
    )
    
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    new_review.author_name = current_user.name 
    return new_review

@app.get("/api/movies/{movie_id}/reviews")
def get_movie_reviews(movie_id: int, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(models.Review.movie_id == movie_id).order_by(models.Review.id.desc()).all()

    if not reviews:
        return {"overall_sentiment": "No data yet", "reviews": []}

    review_data = []
    total_polarity = 0.0

    for r in reviews:
        try:
            ai_result = sentiment_pipeline(r.content)[0]
            label = ai_result['label'] 
            confidence = ai_result['score'] 

            if label == 'POSITIVE':
                compound_score = confidence
                sentiment_badge = "POSITIVE 😊"
                color = "emerald"
            else:
                compound_score = -confidence
                sentiment_badge = "NEGATIVE 😡"
                color = "red"
                
        except Exception as e:
            print(f"⚠️ Transformer failed: {e}")
            compound_score = 0.0
            sentiment_badge = "NEUTRAL 😐"
            color = "zinc"

        total_polarity += compound_score
        author_name = r.user.name if hasattr(r, 'user') and r.user else f"U{r.user_id}"

        review_data.append({
            "id": r.id,
            "content": r.content,
            "rating": r.rating,
            "user_id": r.user_id, 
            "author_name": author_name,
            "sentiment_badge": sentiment_badge, 
            "color": color
        })

    if len(reviews) > 0:
        avg_polarity = total_polarity / len(reviews)
        overall_sentiment = f"{avg_polarity:+.2f} Avg"
    else:
        overall_sentiment = "No data"

    return {
        "overall_sentiment": overall_sentiment,
        "reviews": review_data
    }

@app.get("/api/users/me", response_model=schemas.UserProfileResponse)
def get_user_profile(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    for review in current_user.reviews:
        review.author_name = current_user.name
    return current_user