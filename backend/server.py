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
import random
import string

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

class EmailVerification(BaseModel):
    email: str
    code: str

class ResendVerificationRequest(BaseModel):
    email: str

class MessageStatusUpdate(BaseModel):
    message_ids: List[str]
    status: str  # 'delivered' or 'read'

class UserStatusUpdate(BaseModel):
    is_online: bool

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    avatar_url: Optional[str] = None
    is_online: bool = False
    last_seen: datetime

class ProfileUpdateRequest(BaseModel):
    avatar_url: Optional[str] = None
    remove_avatar: bool = False

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
    # Message status tracking
    status: str = "sent"  # sent, delivered, read
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None

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

def generate_verification_code():
    """توليد رمز تحقق مكون من 6 أرقام"""
    return ''.join(random.choices(string.digits, k=6))

async def send_verification_email(email: str, code: str):
    """إرسال بريد إلكتروني للتحقق (محاكاة)"""
    # في الإنتاج، يمكن استخدام خدمة مثل SendGrid أو AWS SES
    print(f"رمز التحقق لـ {email}: {code}")
    return True

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
@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    # Check if email exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل بالفعل")
    
    # Check if username exists
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل")
    
    # Generate verification code
    verification_code = generate_verification_code()
    
    # Create new user (but not verified yet)
    hashed_password = get_password_hash(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password
    )
    
    # Store user as unverified with verification code
    user_dict = user.dict()
    user_dict['is_verified'] = False
    user_dict['verification_code'] = verification_code
    user_dict['verification_expires'] = datetime.utcnow() + timedelta(minutes=15)  # 15 minutes
    
    await db.users_pending.insert_one(user_dict)
    
    # Send verification email (simulated)
    await send_verification_email(user_data.email, verification_code)
    
    return {
        "message": "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
        "email": user_data.email,
        "requires_verification": True
    }

@api_router.post("/auth/verify-email", response_model=Token)
async def verify_email(verification_data: EmailVerification):
    # Find pending user
    pending_user = await db.users_pending.find_one({
        "email": verification_data.email,
        "verification_code": verification_data.code
    })
    
    if not pending_user:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")
    
    # Check if verification code expired
    if datetime.utcnow() > pending_user['verification_expires']:
        raise HTTPException(status_code=400, detail="انتهت صلاحية رمز التحقق")
    
    # Move user to verified users collection
    user_data = pending_user.copy()
    del user_data['verification_code']
    del user_data['verification_expires']
    user_data['is_verified'] = True
    
    await db.users.insert_one(user_data)
    await db.users_pending.delete_one({"_id": pending_user["_id"]})
    
    # Create access token
    access_token = create_access_token(data={"sub": user_data["id"]})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/auth/resend-verification")
async def resend_verification(resend_data: ResendVerificationRequest):
    # Find pending user
    pending_user = await db.users_pending.find_one({"email": resend_data.email})
    
    if not pending_user:
        raise HTTPException(status_code=404, detail="لم يتم العثور على طلب التسجيل")
    
    # Generate new verification code
    verification_code = generate_verification_code()
    
    # Update verification code and expiry
    await db.users_pending.update_one(
        {"email": resend_data.email},
        {"$set": {
            "verification_code": verification_code,
            "verification_expires": datetime.utcnow() + timedelta(minutes=15)
        }}
    )
    
    # Send verification email
    await send_verification_email(resend_data.email, verification_code)
    
    return {"message": "تم إرسال رمز تحقق جديد"}

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

@api_router.post("/users/update-status")
async def update_user_status(status_data: UserStatusUpdate, current_user: UserResponse = Depends(get_current_user)):
    """تحديث حالة المستخدم (متصل/غير متصل) مع timestamp دقيق"""
    try:
        current_time = datetime.utcnow()
        update_fields = {
            "is_online": status_data.is_online,
            "last_seen": current_time
        }
        
        # إذا كان المستخدم غير متصل، تحديث last_seen بشكل دقيق
        if not status_data.is_online:
            update_fields["is_online"] = False
            # إضافة timestamp إضافي للدقة
            update_fields["offline_timestamp"] = current_time
        
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_fields}
        )
        
        return {
            "message": "تم تحديث الحالة بنجاح", 
            "is_online": status_data.is_online,
            "last_seen": current_time.isoformat(),
            "timestamp": current_time.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@api_router.put("/users/profile", response_model=UserResponse)
async def update_profile(profile_data: ProfileUpdateRequest, current_user: UserResponse = Depends(get_current_user)):
    """تحديث الملف الشخصي"""
    try:
        update_fields = {}
        
        # Handle avatar removal
        if profile_data.remove_avatar:
            update_fields['avatar_url'] = None
        
        # Handle avatar update
        elif profile_data.avatar_url:
            avatar_url = profile_data.avatar_url
            # Validate base64 image (basic validation)
            if avatar_url.startswith('data:image/'):
                # Check image size (max 2MB base64)
                if len(avatar_url) > 2 * 1024 * 1024 * 1.37:  # 1.37 is base64 overhead
                    raise HTTPException(status_code=400, detail="حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت")
                
                # Check image format
                if not any(format in avatar_url for format in ['jpeg', 'jpg', 'png', 'gif', 'webp']):
                    raise HTTPException(status_code=400, detail="نوع الصورة غير مدعوم. استخدم JPEG، PNG، GIF أو WebP")
                
                update_fields['avatar_url'] = avatar_url
            else:
                raise HTTPException(status_code=400, detail="تنسيق الصورة غير صحيح")
        
        if update_fields:
            # Update user in database
            await db.users.update_one(
                {"id": current_user.id},
                {"$set": update_fields}
            )
            
            # Get updated user
            updated_user = await db.users.find_one({"id": current_user.id})
            if updated_user:
                return UserResponse(**updated_user)
        
        return current_user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/messages/update-status")
async def update_message_status(status_data: MessageStatusUpdate, current_user: UserResponse = Depends(get_current_user)):
    """تحديث حالة الرسائل (delivered/read)"""
    try:
        # التحقق من أن الحالة صحيحة
        if status_data.status not in ['delivered', 'read']:
            raise HTTPException(status_code=400, detail="حالة غير صحيحة. استخدم 'delivered' أو 'read'")
        
        # تحديث حالة الرسائل
        result = await db.messages.update_many(
            {
                "id": {"$in": status_data.message_ids},
                "sender_id": {"$ne": current_user.id}  # لا يمكن تحديث حالة رسائل المستخدم نفسه
            },
            {"$set": {"status": status_data.status, "updated_at": datetime.utcnow()}}
        )
        
        return {
            "message": f"تم تحديث حالة {result.modified_count} رسالة إلى {status_data.status}",
            "updated_count": result.modified_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
                # Format last seen time with Gregorian calendar
                last_seen_text = "منذ فترة"
                if other_user.get("is_online"):
                    last_seen_text = "متصل"
                elif other_user.get("last_seen"):
                    try:
                        last_seen = other_user["last_seen"]
                        if isinstance(last_seen, str):
                            # Parse ISO format datetime string
                            last_seen = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                        elif not isinstance(last_seen, datetime):
                            # If it's not a datetime object, convert it
                            last_seen = datetime.fromisoformat(str(last_seen))
                        
                        now = datetime.utcnow()
                        diff = now - last_seen
                        
                        if diff.days > 30:
                            # Use Gregorian date format for older dates
                            last_seen_text = f"آخر ظهور في {last_seen.strftime('%d %B %Y')}"
                        elif diff.days > 7:
                            last_seen_text = f"منذ {diff.days} يوم"
                        elif diff.days > 0:
                            last_seen_text = f"منذ {diff.days} يوم"
                        elif diff.seconds > 3600:
                            hours = diff.seconds // 3600
                            last_seen_text = f"منذ {hours} ساعة"
                        elif diff.seconds > 60:
                            minutes = diff.seconds // 60
                            last_seen_text = f"منذ {minutes} دقيقة"
                        else:
                            last_seen_text = "منذ قليل"
                    except Exception as e:
                        print(f"Error parsing last_seen: {e}")
                        last_seen_text = "منذ فترة"
                
                chat["other_user"] = {
                    "id": other_user["id"],
                    "username": other_user["username"],
                    "is_online": other_user.get("is_online", False),
                    "last_seen": other_user.get("last_seen"),
                    "last_seen_text": last_seen_text,
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
        # Remove MongoDB ObjectId
        if "_id" in existing_chat:
            del existing_chat["_id"]
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
    
    # Remove MongoDB ObjectId from messages
    for message in messages:
        if "_id" in message:
            del message["_id"]
    
    # Mark messages as read
    await db.messages.update_many(
        {"chat_id": chat_id, "sender_id": {"$ne": current_user.id}},
        {"$set": {"is_read": True}}
    )
    
    return messages

@api_router.post("/messages")
async def send_message(message_data: MessageCreate, current_user: UserResponse = Depends(get_current_user)):
    # Verify user is participant in the chat
    chat = await db.chats.find_one({"id": message_data.chat_id, "participants": current_user.id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Create message
    message = Message(
        chat_id=message_data.chat_id,
        sender_id=current_user.id,
        content=message_data.content,
        message_type=message_data.message_type,
        replied_to=message_data.replied_to,
        status="sent",
        timestamp=datetime.utcnow()  # Explicitly set UTC timestamp
    )
    
    # Save to database
    await db.messages.insert_one(message.dict())
    
    # Update chat last message time
    await db.chats.update_one(
        {"id": message.chat_id},
        {"$set": {"last_message_at": datetime.utcnow()}}
    )
    
    # Try to send via WebSocket to other participants (if connected)
    message_delivered = False
    for participant_id in chat["participants"]:
        if participant_id != current_user.id:
            delivered = await manager.send_personal_message({
                "type": "new_message",
                "message": message.dict()
            }, participant_id)
            
            if delivered:
                message_delivered = True
    
    # Update message status to delivered if successfully sent via WebSocket
    if message_delivered:
        await db.messages.update_one(
            {"id": message.id},
            {"$set": {
                "status": "delivered",
                "delivered_at": datetime.utcnow()
            }}
        )
        message.status = "delivered"
        message.delivered_at = datetime.utcnow()
    
    # Remove MongoDB ObjectId
    message_dict = message.dict()
    if "_id" in message_dict:
        del message_dict["_id"]
    
    return message_dict

@api_router.put("/messages/{message_id}/read")
async def mark_message_as_read(message_id: str, current_user: UserResponse = Depends(get_current_user)):
    # Find the message and verify user has access
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if user is participant in the chat
    chat = await db.chats.find_one({"id": message["chat_id"], "participants": current_user.id})
    if not chat:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Don't update if it's the sender's own message
    if message["sender_id"] == current_user.id:
        return {"status": "success", "message": "Cannot mark own message as read"}
    
    # Update message status to read
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {
            "status": "read",
            "is_read": True,
            "read_at": datetime.utcnow()
        }}
    )
    
    # Notify sender via WebSocket if connected
    await manager.send_personal_message({
        "type": "message_read",
        "message_id": message_id,
        "read_by": current_user.id,
        "read_at": datetime.utcnow().isoformat()
    }, message["sender_id"])
    
    return {"status": "success"}

@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str, current_user: UserResponse = Depends(get_current_user)):
    try:
        # Find the message
        message = await db.messages.find_one({"id": message_id})
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Check if user is the sender
        if message["sender_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Can only delete your own messages")
        
        # Delete the message
        await db.messages.delete_one({"id": message_id})
        
        # Notify other participants via WebSocket
        chat = await db.chats.find_one({"id": message["chat_id"]})
        if chat:
            for participant_id in chat["participants"]:
                if participant_id != current_user.id:
                    await manager.send_personal_message({
                        "type": "message_deleted",
                        "message_id": message_id,
                        "chat_id": message["chat_id"]
                    }, participant_id)
        
        return {"status": "success", "message": "Message deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/users", response_model=List[UserResponse])
async def get_all_users(current_user: UserResponse = Depends(get_current_user)):
    try:
        # Get all users except current user
        users = await db.users.find(
            {"id": {"$ne": current_user.id}},
            {"password_hash": 0}  # Exclude password hash
        ).to_list(100)
        
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# User search functionality
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
                    replied_to=message_data.get("replied_to"),
                    timestamp=datetime.utcnow(),  # Explicitly set UTC timestamp
                    status="sent"
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