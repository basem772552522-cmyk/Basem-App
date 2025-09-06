import requests
import sys
import json
from datetime import datetime
import time

class BasemappAPITester:
    def __init__(self, base_url="https://chat-sync-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token1 = None
        self.token2 = None
        self.user1_id = None
        self.user2_id = None
        self.chat_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Register first user
        user1_data = {
            "username": f"testuser1_{timestamp}",
            "email": f"test1_{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User 1 Registration",
            "POST",
            "auth/register",
            200,
            data=user1_data
        )
        
        if success and 'access_token' in response:
            self.token1 = response['access_token']
            print(f"   User 1 token obtained: {self.token1[:20]}...")
        
        # Register second user for chat testing
        user2_data = {
            "username": f"testuser2_{timestamp}",
            "email": f"test2_{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success2, response2 = self.run_test(
            "User 2 Registration",
            "POST",
            "auth/register",
            200,
            data=user2_data
        )
        
        if success2 and 'access_token' in response2:
            self.token2 = response2['access_token']
            print(f"   User 2 token obtained: {self.token2[:20]}...")
        
        return success and success2

    def test_user_login(self):
        """Test user login with existing credentials"""
        # Try to login with user1 credentials
        timestamp = datetime.now().strftime('%H%M%S')
        login_data = {
            "email": f"test1_{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.token1:
            print("❌ No token available for user info test")
            return False
            
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            token=self.token1
        )
        
        if success and 'id' in response:
            self.user1_id = response['id']
            print(f"   User 1 ID: {self.user1_id}")
        
        # Get user2 info as well
        success2, response2 = self.run_test(
            "Get User 2 Info",
            "GET",
            "auth/me",
            200,
            token=self.token2
        )
        
        if success2 and 'id' in response2:
            self.user2_id = response2['id']
            print(f"   User 2 ID: {self.user2_id}")
        
        return success and success2

    def test_user_search(self):
        """Test user search functionality"""
        if not self.token1:
            print("❌ No token available for user search test")
            return False
            
        success, response = self.run_test(
            "Search Users",
            "GET",
            "users/search",
            200,
            token=self.token1,
            params={"q": "testuser2"}
        )
        
        if success:
            print(f"   Found {len(response)} users")
            
        return success

    def test_create_chat(self):
        """Test creating a chat between two users"""
        if not self.token1 or not self.user2_id:
            print("❌ Missing token or user2 ID for chat creation test")
            return False
            
        success, response = self.run_test(
            "Create Chat",
            "POST",
            "chats",
            200,
            token=self.token1,
            params={"other_user_id": self.user2_id}
        )
        
        if success and 'id' in response:
            self.chat_id = response['id']
            print(f"   Chat ID: {self.chat_id}")
        
        return success

    def test_get_chats(self):
        """Test getting user's chats"""
        if not self.token1:
            print("❌ No token available for get chats test")
            return False
            
        success, response = self.run_test(
            "Get User Chats",
            "GET",
            "chats",
            200,
            token=self.token1
        )
        
        if success:
            print(f"   Found {len(response)} chats")
            
        return success

    def test_get_messages(self):
        """Test getting messages from a chat"""
        if not self.token1 or not self.chat_id:
            print("❌ Missing token or chat ID for get messages test")
            return False
            
        success, response = self.run_test(
            "Get Chat Messages",
            "GET",
            f"chats/{self.chat_id}/messages",
            200,
            token=self.token1
        )
        
        if success:
            print(f"   Found {len(response)} messages")
            
        return success

    def test_send_message(self):
        """Test sending a message to a chat"""
        if not self.token1 or not self.chat_id:
            print("❌ Missing token or chat ID for send message test")
            return False
            
        message_data = {
            "chat_id": self.chat_id,
            "content": "مرحبا! هذه رسالة تجريبية من BasemApp",
            "message_type": "text"
        }
        
        success, response = self.run_test(
            "Send Message",
            "POST",
            "messages",
            200,
            data=message_data,
            token=self.token1
        )
        
        if success and 'id' in response:
            self.message_id = response['id']
            print(f"   Message ID: {self.message_id}")
            print(f"   Message Status: {response.get('status', 'unknown')}")
            
        return success

    def test_message_status_tracking(self):
        """Test message delivery status tracking"""
        if not hasattr(self, 'message_id') or not self.message_id:
            print("❌ No message ID available for status tracking test")
            return False
            
        # Test marking message as read
        success, response = self.run_test(
            "Mark Message as Read",
            "PUT",
            f"messages/{self.message_id}/read",
            200,
            token=self.token2  # Use token2 to mark user1's message as read
        )
        
        if success:
            print(f"   Message marked as read successfully")
            
        return success

    def test_user_status_management(self):
        """Test user online status management"""
        if not self.token1:
            print("❌ No token available for user status test")
            return False
            
        # Test updating user status to online
        status_data = {"is_online": True}
        
        success, response = self.run_test(
            "Update User Status (Online)",
            "POST",
            "users/update-status",
            200,
            data=status_data,
            token=self.token1
        )
        
        if success:
            print(f"   User status updated: {response.get('is_online', 'unknown')}")
            
        # Test updating user status to offline
        status_data = {"is_online": False}
        
        success2, response2 = self.run_test(
            "Update User Status (Offline)",
            "POST",
            "users/update-status",
            200,
            data=status_data,
            token=self.token1
        )
        
        return success and success2

    def test_comprehensive_chat_flow(self):
        """Test complete chat flow with message status tracking"""
        if not self.token1 or not self.token2 or not self.chat_id:
            print("❌ Missing required data for comprehensive chat flow test")
            return False
            
        # Send message from user1
        message_data = {
            "chat_id": self.chat_id,
            "content": "رسالة شاملة لاختبار حالة التسليم",
            "message_type": "text"
        }
        
        success1, response1 = self.run_test(
            "Send Message (User 1)",
            "POST",
            "messages",
            200,
            data=message_data,
            token=self.token1
        )
        
        if not success1:
            return False
            
        message_id = response1.get('id')
        print(f"   Message sent with status: {response1.get('status', 'unknown')}")
        
        # Get messages as user2 (should mark as read)
        success2, response2 = self.run_test(
            "Get Messages (User 2)",
            "GET",
            f"chats/{self.chat_id}/messages",
            200,
            token=self.token2
        )
        
        if success2:
            print(f"   User 2 retrieved {len(response2)} messages")
            
        # Send reply from user2
        reply_data = {
            "chat_id": self.chat_id,
            "content": "تم استلام الرسالة بنجاح!",
            "message_type": "text"
        }
        
        success3, response3 = self.run_test(
            "Send Reply (User 2)",
            "POST",
            "messages",
            200,
            data=reply_data,
            token=self.token2
        )
        
        return success1 and success2 and success3

    def test_invalid_auth(self):
        """Test invalid authentication scenarios"""
        # Test with invalid token
        success, _ = self.run_test(
            "Invalid Token Test",
            "GET",
            "auth/me",
            401,
            token="invalid_token_123"
        )
        
        # Test login with wrong credentials
        success2, _ = self.run_test(
            "Invalid Login Test",
            "POST",
            "auth/login",
            401,
            data={"email": "wrong@email.com", "password": "wrongpass"}
        )
        
        return success and success2

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Basemapp Backend API Tests")
        print("=" * 50)
        
        # Test authentication flow
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return False
            
        if not self.test_get_current_user():
            print("❌ Get user info failed, stopping tests")
            return False
            
        # Test user search
        self.test_user_search()
        
        # Test chat functionality
        if not self.test_create_chat():
            print("❌ Chat creation failed")
            return False
            
        self.test_get_chats()
        self.test_get_messages()
        
        # Test invalid scenarios
        self.test_invalid_auth()
        
        # Print final results
        print("\n" + "=" * 50)
        print(f"📊 Backend API Test Results:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("✅ All backend API tests passed!")
            return True
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = BasemappAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())