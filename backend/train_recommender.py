import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
import joblib
from sqlalchemy.orm import joinedload
from database import SessionLocal
import models

def train_recommender():
    print("🕸️ Booting up OmniStream Plot-Focused AI Training...")
    db = SessionLocal()
    
    print("📥 Extracting 32,000 movies and rich text metadata...")
    movies = db.query(models.Movie).options(
        joinedload(models.Movie.genres),
        joinedload(models.Movie.actors),
        joinedload(models.Movie.directors)
    ).all()
    db.close()

    if not movies:
        print("❌ No movies found in the database!")
        return

    data = []
    id_to_idx = {} 
    idx_to_id = {}
    
    for idx, m in enumerate(movies):
        genres = [g.name.replace(" ", "") for g in m.genres]
        actors = [a.name.replace(" ", "") for a in m.actors]
        directors = [d.name.replace(" ", "") for d in m.directors]
        
        title = m.title if m.title else ""
        description = m.description if m.description else ""
        
        # --- THE GOLDILOCKS RECIPE (3:2 Ratio) ---
        # Description x3: Captures the deep plot and vibe.
        # Title x2: Captures franchises and sequels without dominating.
        # Genres x2: Acts as a strong guardrail to keep Action movies with Action movies.
        # Directors/Actors x1: Background flavor.
        
        soup = (
            f"{description} {description} {description} " + 
            f"{title} {title} " + 
            " ".join(genres * 2) + " " + 
            " ".join(directors) + " " + 
            " ".join(actors)
        )
        
        data.append(soup)
        id_to_idx[m.id] = idx  
        idx_to_id[idx] = m.id  

    print("🧠 Training NLP TF-IDF Vector Matrix...")
    # 'english' stop words will filter out useless words like "the", "and", "but" from the descriptions
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(data)

    print("🔍 Mapping the Cosine Similarity universe...")
    nn_model = NearestNeighbors(n_neighbors=12, metric='cosine', algorithm='brute')
    nn_model.fit(tfidf_matrix)

    print("💾 Saving the Plot-Focused ML Brain to disk...")
    joblib.dump(nn_model, "recommender_nn.pkl")
    joblib.dump({"id_to_idx": id_to_idx, "idx_to_id": idx_to_id}, "recommender_map.pkl")
    joblib.dump(tfidf_matrix, "recommender_matrix.pkl")
    
    print("🚀 Training Complete! Restart your FastAPI server.")

if __name__ == "__main__":
    train_recommender()