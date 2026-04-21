from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
import requests as httpreq
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---- MongoDB ----
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ---- App ----
app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
EMERGENT_AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---- Helpers ----
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    # Try Authorization Bearer first (mobile), then cookie (web)
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        # Try session_token (Emergent auth)
        session_token = request.cookies.get("session_token") or request.headers.get("X-Session-Token")
        if session_token:
            session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
            if session:
                expires_at = session.get("expires_at")
                if isinstance(expires_at, str):
                    expires_at = datetime.fromisoformat(expires_at)
                if expires_at and expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at and expires_at >= datetime.now(timezone.utc):
                    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
                    if user:
                        return user
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---- Models ----
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class EmergentSessionIn(BaseModel):
    session_id: str


class User(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = ""
    picture: Optional[str] = ""
    auth_provider: str = "email"


class AuthResponse(BaseModel):
    user: User
    access_token: Optional[str] = None


class WineIn(BaseModel):
    name: str
    wine_type: str
    location_name: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rating: int = Field(ge=0, le=5, default=0)
    notes: Optional[str] = ""
    front_photo: Optional[str] = ""  # base64
    back_photo: Optional[str] = ""   # base64


class Wine(WineIn):
    wine_id: str
    user_id: str
    created_at: datetime


class WineTypeIn(BaseModel):
    name: str


class WineType(BaseModel):
    wine_type_id: str
    user_id: str
    name: str


# ---- Auth endpoints ----
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "name": body.name or email.split("@")[0],
        "picture": "",
        "password_hash": hash_password(body.password),
        "auth_provider": "email",
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    user = User(user_id=user_id, email=email, name=doc["name"], picture="", auth_provider="email")
    return AuthResponse(user=user, access_token=token)


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    token = create_access_token(user["user_id"], email)
    u = User(
        user_id=user["user_id"],
        email=user["email"],
        name=user.get("name", ""),
        picture=user.get("picture", ""),
        auth_provider=user.get("auth_provider", "email"),
    )
    return AuthResponse(user=u, access_token=token)


@api_router.post("/auth/session", response_model=AuthResponse)
async def emergent_session(body: EmergentSessionIn, response: Response):
    # Call Emergent Auth
    try:
        r = httpreq.get(
            EMERGENT_AUTH_SESSION_URL,
            headers={"X-Session-ID": body.session_id},
            timeout=15,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Sessione Google non valida")
        data = r.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Emergent session error")
        raise HTTPException(status_code=500, detail=f"Errore OAuth: {e}")

    email = (data.get("email") or "").lower().strip()
    name = data.get("name", "")
    picture = data.get("picture", "")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=500, detail="Risposta OAuth incompleta")

    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name or existing.get("name", ""), "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc),
        })

    # Store session
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })

    # Set cookie for web
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )

    u = User(user_id=user_id, email=email, name=name, picture=picture, auth_provider="google")
    # Return session_token as access_token so mobile can pass as Bearer
    return AuthResponse(user=u, access_token=session_token)


@api_router.get("/auth/me", response_model=User)
async def me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)


@api_router.post("/auth/logout")
async def logout(response: Response, request: Request):
    session_token = request.cookies.get("session_token") or request.headers.get("X-Session-Token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


# ---- Wine endpoints ----
DEFAULT_WINE_TYPES = ["Rosso", "Bianco", "Rosato", "Spumante", "Dolce", "Altro"]


@api_router.get("/wine-types")
async def get_wine_types(current_user: dict = Depends(get_current_user)):
    custom = await db.wine_types.find(
        {"user_id": current_user["user_id"]}, {"_id": 0}
    ).to_list(1000)
    return {"defaults": DEFAULT_WINE_TYPES, "custom": custom}


@api_router.post("/wine-types", response_model=WineType)
async def create_wine_type(body: WineTypeIn, current_user: dict = Depends(get_current_user)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nome richiesto")
    if name in DEFAULT_WINE_TYPES:
        raise HTTPException(status_code=400, detail="Tipologia già esistente")
    existing = await db.wine_types.find_one({"user_id": current_user["user_id"], "name": name})
    if existing:
        return WineType(**{k: v for k, v in existing.items() if k != "_id"})
    wt_id = f"wt_{uuid.uuid4().hex[:12]}"
    doc = {"wine_type_id": wt_id, "user_id": current_user["user_id"], "name": name}
    await db.wine_types.insert_one(doc.copy())
    return WineType(**doc)


@api_router.post("/wines", response_model=Wine)
async def create_wine(body: WineIn, current_user: dict = Depends(get_current_user)):
    wine_id = f"wine_{uuid.uuid4().hex[:12]}"
    doc = {
        "wine_id": wine_id,
        "user_id": current_user["user_id"],
        "name": body.name,
        "wine_type": body.wine_type,
        "location_name": body.location_name or "",
        "latitude": body.latitude,
        "longitude": body.longitude,
        "rating": body.rating,
        "notes": body.notes or "",
        "front_photo": body.front_photo or "",
        "back_photo": body.back_photo or "",
        "created_at": datetime.now(timezone.utc),
    }
    await db.wines.insert_one(doc.copy())
    return Wine(**doc)


@api_router.get("/wines", response_model=List[Wine])
async def list_wines(
    wine_type: Optional[str] = None,
    location: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    q: dict = {"user_id": current_user["user_id"]}
    if wine_type:
        q["wine_type"] = wine_type
    if location:
        q["location_name"] = {"$regex": location, "$options": "i"}
    cursor = db.wines.find(q, {"_id": 0}).sort("created_at", -1)
    wines = await cursor.to_list(1000)
    return [Wine(**w) for w in wines]


@api_router.get("/wines/{wine_id}", response_model=Wine)
async def get_wine(wine_id: str, current_user: dict = Depends(get_current_user)):
    wine = await db.wines.find_one(
        {"wine_id": wine_id, "user_id": current_user["user_id"]}, {"_id": 0}
    )
    if not wine:
        raise HTTPException(status_code=404, detail="Vino non trovato")
    return Wine(**wine)


@api_router.delete("/wines/{wine_id}")
async def delete_wine(wine_id: str, current_user: dict = Depends(get_current_user)):
    res = await db.wines.delete_one({"wine_id": wine_id, "user_id": current_user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vino non trovato")
    return {"ok": True}


@api_router.put("/wines/{wine_id}", response_model=Wine)
async def update_wine(wine_id: str, body: WineIn, current_user: dict = Depends(get_current_user)):
    update = {
        "name": body.name,
        "wine_type": body.wine_type,
        "location_name": body.location_name or "",
        "latitude": body.latitude,
        "longitude": body.longitude,
        "rating": body.rating,
        "notes": body.notes or "",
    }
    if body.front_photo:
        update["front_photo"] = body.front_photo
    if body.back_photo:
        update["back_photo"] = body.back_photo
    res = await db.wines.update_one(
        {"wine_id": wine_id, "user_id": current_user["user_id"]}, {"$set": update}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vino non trovato")
    wine = await db.wines.find_one(
        {"wine_id": wine_id, "user_id": current_user["user_id"]}, {"_id": 0}
    )
    return Wine(**wine)


@api_router.get("/")
async def root():
    return {"message": "Diario del Vino API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token")
    await db.wines.create_index([("user_id", 1), ("created_at", -1)])
    await db.wine_types.create_index([("user_id", 1), ("name", 1)], unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@viniapp.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": admin_email,
            "name": "Admin",
            "picture": "",
            "password_hash": hash_password(admin_password),
            "auth_provider": "email",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
