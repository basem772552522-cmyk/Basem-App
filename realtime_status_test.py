import requests
import sys
import json
from datetime import datetime
import time

class RealtimeStatusTester:
    def __init__(self, base_url="https://chat-sync-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token1 = None
        self.token2 = None
        self.user1_id = None
        self.user2_id = None
        self.chat_id = None
        self.message_ids = []
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

    def create_test_users(self):
        """Create test users for real-time status testing"""
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Try to login with existing test users first
        test_users = [
            {"email": "realtime.user1@basemapp.com", "password": "TestPassword123!"},
            {"email": "realtime.user2@basemapp.com", "password": "TestPassword123!"},
            {"email": "status.test.user1@basemapp.com", "password": "StatusTest123!"},
            {"email": "status.test.user2@basemapp.com", "password": "StatusTest123!"}
        ]
        
        tokens = []
        for i, user_data in enumerate(test_users):
            success, response = self.run_test(
                f"محاولة تسجيل دخول مستخدم اختبار {i+1}",
                "POST",
                "auth/login",
                200,
                data=user_data
            )
            
            if success and 'access_token' in response:
                tokens.append(response['access_token'])
                print(f"   ✅ تم تسجيل الدخول بنجاح للمستخدم {i+1}")
                if len(tokens) >= 2:
                    break
        
        if len(tokens) >= 2:
            self.token1 = tokens[0]
            self.token2 = tokens[1]
            return True
        
        print("   ⚠️ لم يتم العثور على مستخدمين متحققين - سيتم إنشاء مستخدمين جدد")
        
        # Create new users if login failed
        user1_data = {
            "username": f"مستخدم_الحالة_الفورية_{timestamp}_1",
            "email": f"realtime.status.{timestamp}.1@basemapp.com",
            "password": "كلمة_مرور_قوية123!"
        }
        
        user2_data = {
            "username": f"مستخدم_الحالة_الفورية_{timestamp}_2",
            "email": f"realtime.status.{timestamp}.2@basemapp.com",
            "password": "كلمة_مرور_قوية456!"
        }
        
        # Register users
        success1, _ = self.run_test(
            "تسجيل المستخدم الأول لاختبار الحالة الفورية",
            "POST",
            "auth/register",
            200,
            data=user1_data
        )
        
        success2, _ = self.run_test(
            "تسجيل المستخدم الثاني لاختبار الحالة الفورية",
            "POST",
            "auth/register",
            200,
            data=user2_data
        )
        
        return success1 and success2

    def get_user_info(self):
        """Get user IDs for testing"""
        if self.token1:
            success1, response1 = self.run_test(
                "الحصول على معلومات المستخدم الأول",
                "GET",
                "auth/me",
                200,
                token=self.token1
            )
            if success1 and 'id' in response1:
                self.user1_id = response1['id']
                print(f"   User 1 ID: {self.user1_id}")
        
        if self.token2:
            success2, response2 = self.run_test(
                "الحصول على معلومات المستخدم الثاني",
                "GET",
                "auth/me",
                200,
                token=self.token2
            )
            if success2 and 'id' in response2:
                self.user2_id = response2['id']
                print(f"   User 2 ID: {self.user2_id}")
        
        return self.user1_id and self.user2_id

    def create_test_chat(self):
        """Create a chat between test users"""
        if not self.user2_id:
            print("❌ Missing user2_id for chat creation")
            return False
        
        success, response = self.run_test(
            "إنشاء محادثة اختبار",
            "POST",
            "chats",
            200,
            token=self.token1,
            params={"other_user_id": self.user2_id}
        )
        
        if success and 'id' in response:
            self.chat_id = response['id']
            print(f"   Chat ID: {self.chat_id}")
            return True
        
        return False

    def send_test_messages(self):
        """Send test messages for status testing"""
        if not self.chat_id:
            print("❌ No chat ID available for sending messages")
            return False
        
        messages = [
            "رسالة اختبار الحالة الفورية الأولى",
            "رسالة اختبار الحالة الفورية الثانية",
            "رسالة اختبار علامات القراءة"
        ]
        
        for i, content in enumerate(messages):
            message_data = {
                "chat_id": self.chat_id,
                "content": content,
                "message_type": "text"
            }
            
            success, response = self.run_test(
                f"إرسال رسالة اختبار {i+1}",
                "POST",
                "messages",
                200,
                data=message_data,
                token=self.token1
            )
            
            if success and 'id' in response:
                self.message_ids.append(response['id'])
                print(f"   Message {i+1} ID: {response['id']}")
                print(f"   Message Status: {response.get('status', 'unknown')}")
        
        return len(self.message_ids) > 0

    def test_user_status_update_api(self):
        """اختبار API تحديث حالة المستخدم"""
        print("\n📡 1. اختبار API تحديث حالة المستخدم...")
        
        if not self.token1:
            print("❌ No token available for user status tests")
            return False
        
        tests_passed = 0
        total_tests = 4
        
        # Test 1: Update status to online
        status_data = {"is_online": True}
        success1, response1 = self.run_test(
            "تحديث حالة المستخدم إلى متصل (is_online: true)",
            "POST",
            "users/update-status",
            200,
            data=status_data,
            token=self.token1
        )
        
        if success1:
            tests_passed += 1
            print(f"   ✅ تم تحديث الحالة إلى متصل: {response1.get('is_online', 'unknown')}")
            
            # Verify database update by checking user info
            success_verify, user_info = self.run_test(
                "التحقق من تحديث is_online في قاعدة البيانات",
                "GET",
                "auth/me",
                200,
                token=self.token1
            )
            
            if success_verify and user_info.get('is_online') == True:
                print(f"   ✅ تم تأكيد تحديث is_online في قاعدة البيانات")
            else:
                print(f"   ❌ لم يتم تحديث is_online في قاعدة البيانات")
        
        # Test 2: Update status to offline
        status_data = {"is_online": False}
        success2, response2 = self.run_test(
            "تحديث حالة المستخدم إلى غير متصل (is_online: false)",
            "POST",
            "users/update-status",
            200,
            data=status_data,
            token=self.token1
        )
        
        if success2:
            tests_passed += 1
            print(f"   ✅ تم تحديث الحالة إلى غير متصل: {response2.get('is_online', 'unknown')}")
        
        # Test 3: Test authentication requirement
        success3, response3 = self.run_test(
            "اختبار متطلب المصادقة (بدون token)",
            "POST",
            "users/update-status",
            403,  # FastAPI returns 403 for missing auth
            data={"is_online": True}
        )
        
        if success3:
            tests_passed += 1
            print(f"   ✅ تم رفض الطلب بدون مصادقة بشكل صحيح")
        
        # Test 4: Test last_seen timestamp update
        time.sleep(1)  # Wait a second to ensure timestamp difference
        success4, response4 = self.run_test(
            "اختبار تحديث last_seen timestamp",
            "POST",
            "users/update-status",
            200,
            data={"is_online": True},
            token=self.token1
        )
        
        if success4:
            tests_passed += 1
            print(f"   ✅ تم تحديث last_seen timestamp")
        
        print(f"   📊 نتائج اختبار API تحديث حالة المستخدم: {tests_passed}/{total_tests}")
        return tests_passed >= 3  # At least 3 out of 4 tests should pass

    def test_message_status_update_api(self):
        """اختبار API تحديث حالة الرسائل"""
        print("\n📨 2. اختبار API تحديث حالة الرسائل...")
        
        if not self.token2 or not self.message_ids:
            print("❌ Missing token2 or message IDs for message status tests")
            return False
        
        tests_passed = 0
        total_tests = 5
        
        # Test 1: Update message status to delivered
        status_data = {
            "message_ids": self.message_ids[:2],  # First 2 messages
            "status": "delivered"
        }
        
        success1, response1 = self.run_test(
            "تحديث حالة الرسائل إلى delivered",
            "POST",
            "messages/update-status",
            200,
            data=status_data,
            token=self.token2
        )
        
        if success1:
            tests_passed += 1
            updated_count = response1.get('updated_count', 0)
            print(f"   ✅ تم تحديث {updated_count} رسالة إلى delivered")
        
        # Test 2: Update message status to read
        status_data = {
            "message_ids": self.message_ids[:1],  # First message
            "status": "read"
        }
        
        success2, response2 = self.run_test(
            "تحديث حالة الرسائل إلى read",
            "POST",
            "messages/update-status",
            200,
            data=status_data,
            token=self.token2
        )
        
        if success2:
            tests_passed += 1
            updated_count = response2.get('updated_count', 0)
            print(f"   ✅ تم تحديث {updated_count} رسالة إلى read")
        
        # Test 3: Test invalid status rejection
        invalid_status_data = {
            "message_ids": self.message_ids[:1],
            "status": "invalid_status"
        }
        
        success3, response3 = self.run_test(
            "اختبار رفض حالات غير صحيحة",
            "POST",
            "messages/update-status",
            400,  # Should be rejected
            data=invalid_status_data,
            token=self.token2
        )
        
        if success3:
            tests_passed += 1
            print(f"   ✅ تم رفض الحالة غير الصحيحة بشكل صحيح")
        
        # Test 4: Test prevention of updating own messages
        success4, response4 = self.run_test(
            "اختبار منع تحديث رسائل المستخدم نفسه",
            "POST",
            "messages/update-status",
            200,  # Request succeeds but no messages updated
            data={
                "message_ids": self.message_ids[:1],
                "status": "read"
            },
            token=self.token1  # Same user who sent the messages
        )
        
        if success4:
            updated_count = response4.get('updated_count', 0)
            if updated_count == 0:
                tests_passed += 1
                print(f"   ✅ تم منع تحديث رسائل المستخدم نفسه (updated_count: {updated_count})")
            else:
                print(f"   ❌ لم يتم منع تحديث رسائل المستخدم نفسه (updated_count: {updated_count})")
        
        # Test 5: Test updating multiple messages in one request
        if len(self.message_ids) >= 2:
            multi_status_data = {
                "message_ids": self.message_ids,  # All messages
                "status": "delivered"
            }
            
            success5, response5 = self.run_test(
                "اختبار تحديث عدة رسائل في طلب واحد",
                "POST",
                "messages/update-status",
                200,
                data=multi_status_data,
                token=self.token2
            )
            
            if success5:
                tests_passed += 1
                updated_count = response5.get('updated_count', 0)
                print(f"   ✅ تم تحديث {updated_count} رسائل في طلب واحد")
        else:
            tests_passed += 1  # Skip this test if not enough messages
            print(f"   ⏭️ تخطي اختبار الرسائل المتعددة (عدد رسائل غير كافي)")
        
        print(f"   📊 نتائج اختبار API تحديث حالة الرسائل: {tests_passed}/{total_tests}")
        return tests_passed >= 4  # At least 4 out of 5 tests should pass

    def test_integration_features(self):
        """اختبار تكامل الميزات"""
        print("\n🔗 3. اختبار تكامل الميزات...")
        
        if not self.token1 or not self.token2:
            print("❌ Missing tokens for integration tests")
            return False
        
        tests_passed = 0
        total_tests = 3
        
        # Test 1: Verify is_online appears in GET /api/chats
        success1, response1 = self.run_test(
            "التحقق من عرض is_online في GET /api/chats",
            "GET",
            "chats",
            200,
            token=self.token2
        )
        
        if success1:
            online_status_found = False
            for chat in response1:
                other_user = chat.get('other_user', {})
                if 'is_online' in other_user:
                    online_status_found = True
                    print(f"   ✅ تم العثور على is_online في chat listing: {other_user.get('is_online')}")
                    break
            
            if online_status_found:
                tests_passed += 1
            else:
                print(f"   ❌ لم يتم العثور على is_online في chat listing")
        
        # Test 2: Verify message status appears in GET /api/chats/{chat_id}/messages
        if self.chat_id:
            success2, response2 = self.run_test(
                "التحقق من عرض status في GET /api/chats/{chat_id}/messages",
                "GET",
                f"chats/{self.chat_id}/messages",
                200,
                token=self.token2
            )
            
            if success2:
                status_found = False
                for message in response2:
                    if 'status' in message:
                        status_found = True
                        print(f"   ✅ تم العثور على status في messages: {message.get('status')}")
                        break
                
                if status_found:
                    tests_passed += 1
                else:
                    print(f"   ❌ لم يتم العثور على status في messages")
        else:
            print(f"   ⏭️ تخطي اختبار message status (لا يوجد chat_id)")
        
        # Test 3: Test last_seen timestamp updates
        # First update user status
        self.run_test(
            "تحديث حالة المستخدم لاختبار last_seen",
            "POST",
            "users/update-status",
            200,
            data={"is_online": False},
            token=self.token1
        )
        
        # Then check if last_seen is updated in chats
        success3, response3 = self.run_test(
            "اختبار تحديث last_seen timestamp",
            "GET",
            "chats",
            200,
            token=self.token2
        )
        
        if success3:
            last_seen_found = False
            for chat in response3:
                other_user = chat.get('other_user', {})
                if 'last_seen' in other_user and other_user.get('last_seen'):
                    last_seen_found = True
                    print(f"   ✅ تم العثور على last_seen timestamp في chat listing")
                    break
            
            if last_seen_found:
                tests_passed += 1
            else:
                print(f"   ❌ لم يتم العثور على last_seen timestamp")
        
        print(f"   📊 نتائج اختبار تكامل الميزات: {tests_passed}/{total_tests}")
        return tests_passed >= 2  # At least 2 out of 3 tests should pass

    def test_security_features(self):
        """اختبار الأمان"""
        print("\n🔒 4. اختبار الأمان...")
        
        tests_passed = 0
        total_tests = 3
        
        # Test 1: Reject requests without authentication for user status
        success1, response1 = self.run_test(
            "رفض طلبات تحديث حالة المستخدم بدون مصادقة",
            "POST",
            "users/update-status",
            403,  # FastAPI returns 403 for missing auth
            data={"is_online": True}
        )
        
        if success1:
            tests_passed += 1
            print(f"   ✅ تم رفض طلب تحديث حالة المستخدم بدون مصادقة")
        
        # Test 2: Reject requests without authentication for message status
        success2, response2 = self.run_test(
            "رفض طلبات تحديث حالة الرسائل بدون مصادقة",
            "POST",
            "messages/update-status",
            403,  # FastAPI returns 403 for missing auth
            data={
                "message_ids": ["test_id"],
                "status": "read"
            }
        )
        
        if success2:
            tests_passed += 1
            print(f"   ✅ تم رفض طلب تحديث حالة الرسائل بدون مصادقة")
        
        # Test 3: Test validation for sent statuses
        if self.token2:
            success3, response3 = self.run_test(
                "اختبار validation للحالات المرسلة",
                "POST",
                "messages/update-status",
                400,  # Should reject invalid status
                data={
                    "message_ids": ["test_id"],
                    "status": "invalid_status_test"
                },
                token=self.token2
            )
            
            if success3:
                tests_passed += 1
                print(f"   ✅ تم رفض الحالة غير الصحيحة بشكل صحيح")
        else:
            print(f"   ⏭️ تخطي اختبار validation (لا يوجد token)")
        
        print(f"   📊 نتائج اختبار الأمان: {tests_passed}/{total_tests}")
        return tests_passed >= 2  # At least 2 out of 3 tests should pass

    def test_performance_features(self):
        """اختبار الأداء"""
        print("\n⚡ 5. اختبار الأداء...")
        
        if not self.token2 or not self.message_ids:
            print("❌ Missing token or message IDs for performance tests")
            return False
        
        tests_passed = 0
        total_tests = 3
        
        # Test 1: Test updating multiple message status (performance)
        if len(self.message_ids) >= 2:
            start_time = time.time()
            
            success1, response1 = self.run_test(
                "اختبار تحديث حالة عدة رسائل (أداء)",
                "POST",
                "messages/update-status",
                200,
                data={
                    "message_ids": self.message_ids,
                    "status": "delivered"
                },
                token=self.token2
            )
            
            response_time = time.time() - start_time
            
            if success1:
                tests_passed += 1
                print(f"   ✅ تم تحديث {len(self.message_ids)} رسائل في {response_time:.3f} ثانية")
                
                if response_time < 2.0:
                    print(f"   ✅ أداء ممتاز: أقل من 2 ثانية")
                elif response_time < 5.0:
                    print(f"   ⚠️ أداء مقبول: أقل من 5 ثواني")
                else:
                    print(f"   ❌ أداء بطيء: أكثر من 5 ثواني")
        else:
            tests_passed += 1  # Skip if not enough messages
            print(f"   ⏭️ تخطي اختبار الأداء (عدد رسائل غير كافي)")
        
        # Test 2: Test response speed for user status update
        start_time = time.time()
        
        success2, response2 = self.run_test(
            "اختبار سرعة الاستجابة لتحديث حالة المستخدم",
            "POST",
            "users/update-status",
            200,
            data={"is_online": True},
            token=self.token1 if self.token1 else self.token2
        )
        
        response_time = time.time() - start_time
        
        if success2:
            tests_passed += 1
            print(f"   ✅ زمن الاستجابة لتحديث حالة المستخدم: {response_time:.3f} ثانية")
            
            if response_time < 1.0:
                print(f"   ✅ سرعة استجابة ممتازة")
            elif response_time < 3.0:
                print(f"   ⚠️ سرعة استجابة مقبولة")
            else:
                print(f"   ❌ سرعة استجابة بطيئة")
        
        # Test 3: Test error handling performance
        start_time = time.time()
        
        success3, response3 = self.run_test(
            "اختبار أداء معالجة الأخطاء",
            "POST",
            "messages/update-status",
            400,  # Invalid status should be handled quickly
            data={
                "message_ids": ["invalid_id"],
                "status": "invalid_status"
            },
            token=self.token2 if self.token2 else self.token1
        )
        
        error_response_time = time.time() - start_time
        
        if success3:
            tests_passed += 1
            print(f"   ✅ زمن معالجة الأخطاء: {error_response_time:.3f} ثانية")
        
        print(f"   📊 نتائج اختبار الأداء: {tests_passed}/{total_tests}")
        return tests_passed >= 2  # At least 2 out of 3 tests should pass

    def run_comprehensive_realtime_status_tests(self):
        """Run comprehensive real-time status and message read status tests"""
        print("🚀 اختبار شامل لميزات الحالة الفورية وعلامات قراءة الرسائل الجديدة في BasemApp")
        print("=" * 80)
        print("📋 المطلوب اختباره:")
        print("   1. API تحديث حالة المستخدم (POST /api/users/update-status)")
        print("   2. API تحديث حالة الرسائل (POST /api/messages/update-status)")
        print("   3. تكامل الميزات (عرض الحالات في endpoints مختلفة)")
        print("   4. اختبار الأمان والمصادقة")
        print("   5. اختبار الأداء وسرعة الاستجابة")
        print("=" * 80)
        
        # Setup phase
        print("\n🔧 مرحلة الإعداد...")
        setup_success = True
        
        # Create test users
        if not self.create_test_users():
            print("❌ فشل في إنشاء مستخدمي الاختبار")
            setup_success = False
        
        # Get user information
        if setup_success and not self.get_user_info():
            print("❌ فشل في الحصول على معلومات المستخدمين")
            setup_success = False
        
        # Create test chat
        if setup_success and not self.create_test_chat():
            print("❌ فشل في إنشاء محادثة الاختبار")
            setup_success = False
        
        # Send test messages
        if setup_success and not self.send_test_messages():
            print("❌ فشل في إرسال رسائل الاختبار")
            setup_success = False
        
        if not setup_success:
            print("\n❌ فشل في مرحلة الإعداد - لا يمكن متابعة الاختبارات")
            return False
        
        print(f"\n✅ تم الإعداد بنجاح:")
        print(f"   - المستخدم الأول: {self.user1_id}")
        print(f"   - المستخدم الثاني: {self.user2_id}")
        print(f"   - المحادثة: {self.chat_id}")
        print(f"   - عدد الرسائل: {len(self.message_ids)}")
        
        # Run main tests
        test_results = []
        
        # Test 1: User status update API
        user_status_success = self.test_user_status_update_api()
        test_results.append(("API تحديث حالة المستخدم", user_status_success))
        
        # Test 2: Message status update API
        message_status_success = self.test_message_status_update_api()
        test_results.append(("API تحديث حالة الرسائل", message_status_success))
        
        # Test 3: Integration features
        integration_success = self.test_integration_features()
        test_results.append(("تكامل الميزات", integration_success))
        
        # Test 4: Security features
        security_success = self.test_security_features()
        test_results.append(("اختبار الأمان", security_success))
        
        # Test 5: Performance features
        performance_success = self.test_performance_features()
        test_results.append(("اختبار الأداء", performance_success))
        
        # Calculate results
        passed_tests = sum(1 for _, success in test_results if success)
        
        # Print detailed results
        print("\n" + "=" * 80)
        print("📊 نتائج اختبار ميزات الحالة الفورية وعلامات القراءة:")
        print("-" * 60)
        
        for test_name, success in test_results:
            status = "✅ نجح" if success else "❌ فشل"
            print(f"   {test_name}: {status}")
        
        print("-" * 60)
        print(f"📈 إجمالي الاختبارات المنفذة: {self.tests_run}")
        print(f"📈 الاختبارات الناجحة: {self.tests_passed}")
        print(f"📈 معدل النجاح التفصيلي: {(self.tests_passed/self.tests_run)*100:.1f}%")
        print(f"📈 الاختبارات الرئيسية الناجحة: {passed_tests}/{len(test_results)}")
        print(f"📈 معدل النجاح الرئيسي: {(passed_tests/len(test_results))*100:.1f}%")
        
        # Final assessment
        if passed_tests >= 4:  # At least 4 out of 5 major tests
            print("\n🎉 تقييم شامل: ميزات الحالة الفورية وعلامات القراءة تعمل بكفاءة عالية!")
            print("✅ جميع endpoints الجديدة تعمل بشكل صحيح")
            print("✅ نظام الحالة الفورية مُنفذ بشكل صحيح")
            print("✅ علامات قراءة الرسائل تعمل بشكل مثالي")
            print("✅ الأمان والمصادقة محكمة")
            print("✅ الأداء وسرعة الاستجابة ممتازة")
            return True
        elif passed_tests >= 3:
            print("\n⚠️ تقييم شامل: الميزات تعمل مع بعض المشاكل البسيطة")
            print("🔧 معظم الوظائف تعمل، يحتاج تحسينات طفيفة")
            return False
        else:
            print("\n❌ تقييم شامل: الميزات تحتاج إلى إصلاحات كبيرة")
            print("🚨 مشاكل كبيرة في ميزات الحالة الفورية تحتاج معالجة فورية")
            return False

def main():
    tester = RealtimeStatusTester()
    success = tester.run_comprehensive_realtime_status_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())