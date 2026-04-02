from pydantic import BaseModel, Field

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