from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="ECommerce Store API")

# Trap 3: Safe CORS configuration without wildcard credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mystore.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "healthy", "service": "ecommerce-api"}
