import pandas as pd
from sqlalchemy.orm import sessionmaker
from database import engine
import models

models.Base.metadata.drop_all(bind=engine)
models.Base.metadata.create_all(bind=engine)

print("Rebuilding database schema...")
models.Base.metadata.drop_all(bind=engine)
models.Base.metadata.create_all(bind=engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
session = SessionLocal()

print("Loading CSV...")
df = pd.read_csv('Combined.csv')
df = df.rename(columns={'release_ye': 'release_year'})

text_cols = ['type', 'title', 'director', 'cast', 'country', 'genres', 'language', 'description']
df[text_cols] = df[text_cols].fillna("")
num_cols = ['release_year', 'rating', 'popularity', 'vote_count', 'budget', 'revenue']
df[num_cols] = df[num_cols].fillna(0)

print("Cleaning dirty data and injecting into PostgreSQL...")

genre_cache = {}
country_cache = {}
actor_cache = {}
director_cache = {} # NEW: Cache for directors

def get_or_create(cache, model_class, name):
    if not name: return None
    if name not in cache:
        new_obj = model_class(name=name)
        cache[name] = new_obj
    return cache[name]

for index, row in df.iterrows():
    movie = models.Movie(
        id=row['id'], type=row['type'], title=row['title'], 
        # director=row['director'] is removed from here!
        release_year=row['release_year'], rating=row['rating'], language=row['language'],
        description=row['description'], popularity=row['popularity'],
        vote_count=row['vote_count'], budget=row['budget'], revenue=row['revenue']
    )

    # 1. Map Genres
    unique_genres = set([g.strip() for g in row['genres'].split(',') if g.strip()])
    for g_name in unique_genres:
        g_obj = get_or_create(genre_cache, models.Genre, g_name)
        if g_obj: movie.genres.append(g_obj)

    # 2. Map Countries
    unique_countries = set([c.strip() for c in row['country'].split(',') if c.strip()])
    for c_name in unique_countries:
        c_obj = get_or_create(country_cache, models.Country, c_name)
        if c_obj: movie.countries.append(c_obj)

    # 3. Map Actors
    unique_actors = set([a.strip() for a in row['cast'].split(',') if a.strip()])
    for a_name in unique_actors:
        a_obj = get_or_create(actor_cache, models.Actor, a_name)
        if a_obj: movie.actors.append(a_obj)

    # 4. NEW: Map Directors
    unique_directors = set([d.strip() for d in row['director'].split(',') if d.strip()])
    for d_name in unique_directors:
        d_obj = get_or_create(director_cache, models.Director, d_name)
        if d_obj: movie.directors.append(d_obj)

    session.add(movie)

try:
    session.commit()
    print("Success! Fully normalized database populated.")
except Exception as e:
    session.rollback()
    print(f"An error occurred: {e}")
finally:
    session.close()