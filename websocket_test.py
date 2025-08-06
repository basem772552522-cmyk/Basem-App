import asyncio
import websockets
import json
import requests
from datetime import datetime

class WebSocketTester:
    def __init__(self, base_url="https://75fa55c5-4e13-48b1-b9ce-875df16baaa7.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.ws_url = base_url.replace("https://", "wss://").replace("http://", "ws://")
        self.token1 = None
        self.token2 = None
        self.user1_id = None
        self.user2_id = None
        self.chat_id = None

    def setup_users_and_chat(self):
        """Setup test users and chat for WebSocket testing"""
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Register users
        user1_data = {
            "username": f"wsuser1_{timestamp}",
            "email": f"wstest1_{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        user2_data = {
            "username": f"wsuser2_{timestamp}",
            "email": f"wstest2_{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        # Register user 1
        response1 = requests.post(f"{self.api_url}/auth/register", json=user1_data)
        if response1.status_code == 200:
            self.token1 = response1.json()['access_token']
            print(f"✅ User 1 registered successfully")
        else:
            print(f"❌ User 1 registration failed: {response1.status_code}")
            return False
            
        # Register user 2
        response2 = requests.post(f"{self.api_url}/auth/register", json=user2_data)
        if response2.status_code == 200:
            self.token2 = response2.json()['access_token']
            print(f"✅ User 2 registered successfully")
        else:
            print(f"❌ User 2 registration failed: {response2.status_code}")
            return False
        
        # Get user IDs
        headers1 = {'Authorization': f'Bearer {self.token1}'}
        headers2 = {'Authorization': f'Bearer {self.token2}'}
        
        user1_info = requests.get(f"{self.api_url}/auth/me", headers=headers1)
        user2_info = requests.get(f"{self.api_url}/auth/me", headers=headers2)
        
        if user1_info.status_code == 200 and user2_info.status_code == 200:
            self.user1_id = user1_info.json()['id']
            self.user2_id = user2_info.json()['id']
            print(f"✅ Got user IDs: {self.user1_id[:8]}... and {self.user2_id[:8]}...")
        else:
            print("❌ Failed to get user IDs")
            return False
        
        # Create chat
        chat_response = requests.post(
            f"{self.api_url}/chats",
            headers=headers1,
            params={"other_user_id": self.user2_id}
        )
        
        if chat_response.status_code == 200:
            self.chat_id = chat_response.json()['id']
            print(f"✅ Chat created: {self.chat_id[:8]}...")
            return True
        else:
            print(f"❌ Chat creation failed: {chat_response.status_code}")
            return False

    async def test_websocket_connection(self):
        """Test WebSocket connection and messaging"""
        if not self.user1_id or not self.user2_id or not self.chat_id:
            print("❌ Missing required data for WebSocket test")
            return False
        
        print("\n🔍 Testing WebSocket Connection and Messaging...")
        
        try:
            # Connect user 1
            ws1_url = f"{self.ws_url}/ws/{self.user1_id}"
            print(f"Connecting to: {ws1_url}")
            
            async with websockets.connect(ws1_url) as websocket1:
                print("✅ User 1 WebSocket connected")
                
                # Send a message
                message_data = {
                    "type": "send_message",
                    "chat_id": self.chat_id,
                    "content": "Hello from WebSocket test!",
                    "message_type": "text"
                }
                
                await websocket1.send(json.dumps(message_data))
                print("✅ Message sent via WebSocket")
                
                # Wait for confirmation
                try:
                    response = await asyncio.wait_for(websocket1.recv(), timeout=5.0)
                    response_data = json.loads(response)
                    
                    if response_data.get("type") == "message_sent":
                        print("✅ Message confirmation received")
                        print(f"   Message ID: {response_data['message']['id'][:8]}...")
                        return True
                    else:
                        print(f"❌ Unexpected response: {response_data}")
                        return False
                        
                except asyncio.TimeoutError:
                    print("❌ Timeout waiting for message confirmation")
                    return False
                    
        except Exception as e:
            print(f"❌ WebSocket test failed: {str(e)}")
            return False

    async def run_websocket_tests(self):
        """Run all WebSocket tests"""
        print("🚀 Starting WebSocket Tests")
        print("=" * 40)
        
        if not self.setup_users_and_chat():
            print("❌ Setup failed, cannot run WebSocket tests")
            return False
        
        success = await self.test_websocket_connection()
        
        print("\n" + "=" * 40)
        if success:
            print("✅ WebSocket tests passed!")
        else:
            print("❌ WebSocket tests failed!")
            
        return success

async def main():
    tester = WebSocketTester()
    success = await tester.run_websocket_tests()
    return 0 if success else 1

if __name__ == "__main__":
    import sys
    sys.exit(asyncio.run(main()))