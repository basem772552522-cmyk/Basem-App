from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
import json
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
JWT_SECRET = "basemapp_secret_key_2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, str] = {}  # user_id -> connection_id

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        self.active_connections[connection_id] = websocket
        self.user_connections[user_id] = connection_id
        
        # Update user online status
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_online": True, "last_seen": datetime.utcnow()}}
        )
        
        return connection_id

    async def disconnect(self, connection_id: str, user_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        if user_id in self.user_connections:
            del self.user_connections[user_id]
            
        # Update user offline status
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_online": False, "last_seen": datetime.utcnow()}}
        )

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.user_connections:
            connection_id = self.user_connections[user_id]
            if connection_id in self.active_connections:
                websocket = self.active_connections[connection_id]
                try:
                    await websocket.send_text(json.dumps(message))
                    return True
                except:
                    await self.disconnect(connection_id, user_id)
        return False

manager = ConnectionManager()

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    avatar_url: Optional[str] = None
    is_online: bool = False
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    avatar_url: Optional[str] = None
    is_online: bool = False
    last_seen: datetime

class Chat(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participants: List[str]  # user IDs
    chat_type: str = "private"  # private or group
    name: Optional[str] = None  # for group chats
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_at: datetime = Field(default_factory=datetime.utcnow)

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_id: str
    sender_id: str
    content: str
    message_type: str = "text"  # text, image, file
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = False
    replied_to: Optional[str] = None  # message ID if replying

class MessageCreate(BaseModel):
    chat_id: str
    content: str
    message_type: str = "text"
    replied_to: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

# Utility functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return UserResponse(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Authentication routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password
    )
    
    await db.users.insert_one(user.dict())
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["id"]})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user

# Chat routes
@api_router.get("/chats")
async def get_chats(current_user: UserResponse = Depends(get_current_user)):
    chats = await db.chats.find({"participants": current_user.id}).to_list(1000)
    
    # Populate chat info
    for chat in chats:
        # Remove MongoDB ObjectId
        if "_id" in chat:
            del chat["_id"]
            
        # Get other participants
        other_participants = [p for p in chat["participants"] if p != current_user.id]
        if other_participants:
            other_user = await db.users.find_one({"id": other_participants[0]})
            if other_user:
                chat["other_user"] = {
                    "id": other_user["id"],
                    "username": other_user["username"],
                    "is_online": other_user.get("is_online", False),
                    "avatar_url": other_user.get("avatar_url")
                }
        
        # Get last message
        last_message = await db.messages.find_one(
            {"chat_id": chat["id"]},
            sort=[("timestamp", -1)]
        )
        if last_message:
            # Remove MongoDB ObjectId from message
            if "_id" in last_message:
                del last_message["_id"]
            chat["last_message"] = last_message
    
    return chats

@api_router.post("/chats")
async def create_chat(other_user_id: str, current_user: UserResponse = Depends(get_current_user)):
    # Check if chat already exists
    existing_chat = await db.chats.find_one({
        "participants": {"$all": [current_user.id, other_user_id]},
        "chat_type": "private"
    })
    
    if existing_chat:
        return existing_chat
    
    # Create new chat
    chat = Chat(participants=[current_user.id, other_user_id])
    await db.chats.insert_one(chat.dict())
    return chat.dict()

@api_router.get("/chats/{chat_id}/messages")
async def get_messages(chat_id: str, current_user: UserResponse = Depends(get_current_user)):
    # Verify user is participant
    chat = await db.chats.find_one({"id": chat_id, "participants": current_user.id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    messages = await db.messages.find({"chat_id": chat_id}).sort("timestamp", 1).to_list(1000)
    
    # Mark messages as read
    await db.messages.update_many(
        {"chat_id": chat_id, "sender_id": {"$ne": current_user.id}},
        {"$set": {"is_read": True}}
    )
    
    return messages

@api_router.get("/users/search")
async def search_users(q: str, current_user: UserResponse = Depends(get_current_user)):
    users = await db.users.find({
        "$and": [
            {"id": {"$ne": current_user.id}},
            {"$or": [
                {"username": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}}
            ]}
        ]
    }).to_list(10)
    
    return [UserResponse(**user) for user in users]

# WebSocket endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    connection_id = await manager.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data["type"] == "send_message":
                # Create message
                message = Message(
                    chat_id=message_data["chat_id"],
                    sender_id=user_id,
                    content=message_data["content"],
                    message_type=message_data.get("message_type", "text"),
                    replied_to=message_data.get("replied_to")
                )
                
                # Save to database
                await db.messages.insert_one(message.dict())
                
                # Update chat last message time
                await db.chats.update_one(
                    {"id": message.chat_id},
                    {"$set": {"last_message_at": datetime.utcnow()}}
                )
                
                # Get chat participants
                chat = await db.chats.find_one({"id": message.chat_id})
                if chat:
                    # Send to all participants
                    for participant_id in chat["participants"]:
                        if participant_id != user_id:
                            await manager.send_personal_message({
                                "type": "new_message",
                                "message": message.dict()
                            }, participant_id)
                
                # Confirm message sent
                await websocket.send_text(json.dumps({
                    "type": "message_sent",
                    "message": message.dict()
                }))
                
    except WebSocketDisconnect:
        await manager.disconnect(connection_id, user_id)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()