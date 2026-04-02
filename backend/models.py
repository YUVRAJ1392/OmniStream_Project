from sqlalchemy import Column, Integer, String, Float, Text, BigInteger, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base

# --- 1. THE JUNCTION TABLES ---
movie_genres = Table('movie_genres', Base.metadata,
    Column('movie_id', Integer, ForeignKey('movies.id'), primary_key=True),
    Column('genre_id', Integer, ForeignKey('genres.id'), primary_key=True)
)

movie_countries = Table('movie_countries', Base.metadata,
    Column('movie_id', Integer, ForeignKey('movies.id'), primary_key=True),
    Column('country_id', Integer, ForeignKey('countries.id'), primary_key=True)
)

movie_actors = Table('movie_actors', Base.metadata,
    Column('movie_id', Integer, ForeignKey('movies.id'), primary_key=True),
    Column('actor_id', Integer, ForeignKey('actors.id'), primary_key=True)
)

# NEW: The junction table for Directors
movie_directors = Table('movie_directors', Base.metadata,
    Column('movie_id', Integer, ForeignKey('movies.id'), primary_key=True),
    Column('director_id', Integer, ForeignKey('directors.id'), primary_key=True)
)

# --- 2. THE CORE TABLES ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)

class Movie(Base):
    __tablename__ = "movies"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    title = Column(String, index=True)
    release_year = Column(Integer)
    rating = Column(Float)
    language = Column(String)
    description = Column(Text)
    popularity = Column(Float)
    vote_count = Column(Integer)
    budget = Column(BigInteger)
    revenue = Column(BigInteger)

    # Relationships
    genres = relationship("Genre", secondary=movie_genres, back_populates="movies")
    countries = relationship("Country", secondary=movie_countries, back_populates="movies")
    actors = relationship("Actor", secondary=movie_actors, back_populates="movies")
    directors = relationship("Director", secondary=movie_directors, back_populates="movies")

# --- 3. THE NORMALIZED ENTITY TABLES ---
class Genre(Base):
    __tablename__ = "genres"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    movies = relationship("Movie", secondary=movie_genres, back_populates="genres")

class Country(Base):
    __tablename__ = "countries"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    movies = relationship("Movie", secondary=movie_countries, back_populates="countries")

class Actor(Base):
    __tablename__ = "actors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    movies = relationship("Movie", secondary=movie_actors, back_populates="actors")

# NEW: The Director Table
class Director(Base):
    __tablename__ = "directors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    movies = relationship("Movie", secondary=movie_directors, back_populates="directors")