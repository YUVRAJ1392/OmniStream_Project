import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib

# Import your local database setup
from database import SessionLocal
import models

def train_omnistream_ai():
    print("🧠 Booting up OmniStream AI Training Sequence...")
    db = SessionLocal()
    
    # 1. Fetch data: We only want movies that have actual budget and revenue data
    print("📥 Extracting historical data from 32,000 records...")
    movies = db.query(models.Movie).filter(
        models.Movie.budget > 100000, 
        models.Movie.revenue > 100000
    ).all()
    db.close()

    if not movies:
        print("❌ Not enough data with budgets/revenues to train the model!")
        return

    # 2. Convert to a Pandas DataFrame
    data = []
    for m in movies:
        # Calculate Return on Investment (ROI)
        roi = m.revenue / m.budget
        
        # Define what a "Hit" is (Let's say making 2x the budget is a Hit)
        # 2 = Blockbuster, 1 = Moderate, 0 = Flop
        if roi >= 2.5:
            classification = 2 
        elif roi >= 1.2:
            classification = 1
        else:
            classification = 0
            
        data.append({
            "budget": m.budget,
            "popularity": m.popularity,
            "vote_count": m.vote_count,
            "target": classification
        })
        
    df = pd.DataFrame(data)
    print(f"✅ Successfully loaded {len(df)} valid training records.")

    # 3. Split into Features (X) and Answers (y)
    X = df[['budget', 'popularity', 'vote_count']]
    y = df['target']

    # Set aside 20% of the data to test the AI later
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 4. Train the Random Forest Model
    print("🌲 Growing the Random Forest (Training Model)...")
    model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
    model.fit(X_train, y_train)

    # 5. Grade the AI
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    print(f"🎯 Model Accuracy on unseen data: {accuracy * 100:.2f}%")

    # 6. Save the Brain to a file
    print("💾 Saving the AI brain to omnistream_model.pkl...")
    joblib.dump(model, "omnistream_model.pkl")
    print("🚀 Training Complete!")

if __name__ == "__main__":
    train_omnistream_ai()