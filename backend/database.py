from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# The Connection String format: postgresql://username:password@server:port/database_name
# CRITICAL: Replace 'your_password' with the master password you created during PostgreSQL installation!
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin1392@localhost:5433/omnistream_db"

# Create the engine that drives the connection
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create a session maker to talk to the database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class that our database models will inherit from
Base = declarative_base()