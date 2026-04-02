from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

# --- AUTHENTICATION SCHEMAS ---
class UserCreate(BaseModel):
    name: str
    email: str
    # The fix to prevent the 72-byte bcrypt crash!
    password: str = Field(..., max_length=72, description="Password cannot exceed 72 bytes")

class UserLogin(BaseModel):
    email: str
    password: str

# --- MACHINE LEARNING SCHEMAS ---
class MoviePredictionRequest(BaseModel):
    title: str
    budget: int
    popularity: float
    vote_count: int

# --- NEW: USER FEATURE SCHEMAS ---

# What React sends to the backend when a user submits a review
class ReviewCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    rating: int = Field(..., ge=1, le=5)

# What the backend sends to React to display a review
class ReviewResponse(BaseModel):
    id: int
    content: str
    rating: int
    created_at: datetime
    user_id: int
    movie_id: int
    author_name: Optional[str] = None 

    class Config:
        from_attributes = True

# A lightweight movie object to show in the user's profile (so we don't load massive amounts of data)
class MiniMovieResponse(BaseModel):
    id: int
    title: str
    rating: Optional[float] = None

    class Config:
        from_attributes = True

# The massive payload for the "User Profile" page
class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    liked_movies: List[MiniMovieResponse] 
    watch_later_movies: List[MiniMovieResponse]
    reviews: List[ReviewResponse]

    class Config:
        from_attributes = True