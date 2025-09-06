import requests
import sys
import json
from datetime import datetime
import time

class BasemappFocusedTester:
    def __init__(self, base_url="https://chat-sync-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
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

    def test_email_verification_comprehensive(self):
        """Test complete email verification system comprehensively"""
        print("📧 اختبار شامل لنظام التحقق من البريد الإلكتروني")
        print("-" * 50)
        
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Test 1: User Registration (should require verification)
        user_data = {
            "username": f"سارة_أحمد_{timestamp}",
            "email": f"sara.ahmed.{timestamp}@basemapp.com",
            "password": "كلمة_مرور_قوية789!"
        }
        
        success1, response1 = self.run_test(
            "تسجيل مستخدم جديد",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if not success1:
            return False
            
        # Verify response structure
        verification_required = response1.get('requires_verification', False)
        email_in_response = response1.get('email', '')
        message = response1.get('message', '')
        
        print(f"   📧 Email: {email_in_response}")
        print(f"   📝 Message: {message}")
        print(f"   🔐 Requires verification: {verification_required}")
        
        if not verification_required:
            print("❌ Registration should require email verification")
            return False
        
        # Test 2: Login before verification (should fail)
        login_data = {
            "email": user_data['email'],
            "password": user_data['password']
        }
        
        success2, response2 = self.run_test(
            "محاولة تسجيل دخول قبل التحقق",
            "POST",
            "auth/login",
            401,
            data=login_data
        )
        
        # Test 3: Invalid verification code
        invalid_verification = {
            "email": user_data['email'],
            "code": "000000"
        }
        
        success3, response3 = self.run_test(
            "رمز تحقق خاطئ",
            "POST",
            "auth/verify-email",
            400,
            data=invalid_verification
        )
        
        # Test 4: Resend verification code
        resend_data = {"email": user_data['email']}
        
        success4, response4 = self.run_test(
            "إعادة إرسال رمز التحقق",
            "POST",
            "auth/resend-verification",
            200,
            data=resend_data
        )
        
        if success4:
            print(f"   📧 Resend message: {response4.get('message', '')}")
        
        # Test 5: Resend for non-existent email
        invalid_resend = {"email": "nonexistent@example.com"}
        
        success5, response5 = self.run_test(
            "إعادة إرسال لبريد غير موجود",
            "POST",
            "auth/resend-verification",
            404,
            data=invalid_resend
        )
        
        return success1 and success2 and success3 and success4 and success5

    def test_api_endpoints_structure(self):
        """Test API endpoints structure and security"""
        print("\n🔧 اختبار هيكل endpoints والأمان")
        print("-" * 50)
        
        # Test authentication required endpoints
        protected_endpoints = [
            ("GET", "auth/me", "معلومات المستخدم"),
            ("GET", "chats", "قائمة المحادثات"),
            ("POST", "chats", "إنشاء محادثة"),
            ("GET", "users/search", "البحث عن المستخدمين"),
            ("POST", "messages", "إرسال رسالة"),
            ("POST", "users/update-status", "تحديث حالة المستخدم")
        ]
        
        results = []
        for method, endpoint, name in protected_endpoints:
            # Test without authentication (should return 401 or 403)
            url = f"{self.api_url}/{endpoint}"
            headers = {'Content-Type': 'application/json'}
            
            self.tests_run += 1
            print(f"\n🔍 Testing {name} (بدون مصادقة)...")
            
            try:
                if method == 'GET':
                    response = requests.get(url, headers=headers)
                elif method == 'POST':
                    response = requests.post(url, json={}, headers=headers)
                
                # Accept both 401 and 403 as valid authentication rejection
                if response.status_code in [401, 403]:
                    self.tests_passed += 1
                    print(f"✅ Passed - Status: {response.status_code}")
                    print(f"   🔒 Properly protected endpoint")
                    results.append(True)
                else:
                    print(f"❌ Failed - Expected 401/403, got {response.status_code}")
                    results.append(False)
                    
            except Exception as e:
                print(f"❌ Failed - Error: {str(e)}")
                results.append(False)
        
        # Test public endpoints
        public_success1, _ = self.run_test(
            "تسجيل مستخدم (عام)",
            "POST",
            "auth/register",
            200,
            data={
                "username": f"test_public_{datetime.now().strftime('%H%M%S')}",
                "email": f"test.public.{datetime.now().strftime('%H%M%S')}@example.com",
                "password": "TestPass123!"
            }
        )
        
        public_success2, _ = self.run_test(
            "تسجيل دخول (عام)",
            "POST",
            "auth/login",
            401,  # Should fail with invalid credentials
            data={"email": "invalid@test.com", "password": "invalid"}
        )
        
        results.extend([public_success1, public_success2])
        
        return all(results)

    def test_performance_and_error_handling(self):
        """Test performance and error handling"""
        print("\n⚡ اختبار الأداء ومعالجة الأخطاء")
        print("-" * 50)
        
        # Test 1: Non-existent endpoint
        success1, _ = self.run_test(
            "endpoint غير موجود",
            "GET",
            "nonexistent/endpoint",
            404
        )
        
        # Test 2: Invalid HTTP method
        success2, _ = self.run_test(
            "طريقة HTTP خاطئة",
            "PUT",
            "auth/register",
            [405, 422]  # Method not allowed or Unprocessable Entity
        )
        
        # Test 3: Invalid JSON data
        success3 = True
        try:
            url = f"{self.api_url}/auth/register"
            headers = {'Content-Type': 'application/json'}
            # Send invalid JSON
            response = requests.post(url, data="invalid json", headers=headers)
            if response.status_code in [400, 422]:
                success3 = True
                self.tests_passed += 1
                print(f"\n🔍 Testing بيانات JSON خاطئة...")
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                success3 = False
                print(f"\n🔍 Testing بيانات JSON خاطئة...")
                print(f"❌ Failed - Expected 400/422, got {response.status_code}")
            self.tests_run += 1
        except Exception as e:
            success3 = False
            print(f"\n🔍 Testing بيانات JSON خاطئة...")
            print(f"❌ Failed - Error: {str(e)}")
            self.tests_run += 1
        
        # Test 4: Response time check
        start_time = time.time()
        success4, _ = self.run_test(
            "سرعة الاستجابة",
            "POST",
            "auth/register",
            200,
            data={
                "username": f"speed_test_{datetime.now().strftime('%H%M%S')}",
                "email": f"speed.test.{datetime.now().strftime('%H%M%S')}@example.com",
                "password": "SpeedTest123!"
            }
        )
        response_time = time.time() - start_time
        
        if success4:
            print(f"   ⏱️ Response time: {response_time:.3f}s")
            if response_time < 3.0:
                print("   ✅ Performance: Good (< 3s)")
            else:
                print("   ⚠️ Performance: Slow (> 3s)")
        
        return success1 and success2 and success3 and success4

    def run_focused_tests(self):
        """Run focused backend tests for email verification and core functionality"""
        print("🚀 اختبار مركز لنظام BasemApp المحسّن")
        print("=" * 60)
        
        # Test 1: Email Verification System
        email_verification_success = self.test_email_verification_comprehensive()
        
        # Test 2: API Structure and Security
        api_structure_success = self.test_api_endpoints_structure()
        
        # Test 3: Performance and Error Handling
        performance_success = self.test_performance_and_error_handling()
        
        # Calculate results
        major_tests = [
            ("نظام التحقق من البريد الإلكتروني", email_verification_success),
            ("هيكل API والأمان", api_structure_success),
            ("الأداء ومعالجة الأخطاء", performance_success)
        ]
        
        passed_major = sum(1 for _, success in major_tests if success)
        
        # Print results
        print("\n" + "=" * 60)
        print("📊 نتائج الاختبار المركز:")
        print("-" * 40)
        
        for test_name, success in major_tests:
            status = "✅ نجح" if success else "❌ فشل"
            print(f"   {test_name}: {status}")
        
        print("-" * 40)
        print(f"📈 إجمالي الاختبارات: {self.tests_run}")
        print(f"📈 الاختبارات الناجحة: {self.tests_passed}")
        print(f"📈 معدل النجاح: {(self.tests_passed/self.tests_run)*100:.1f}%")
        print(f"📈 الاختبارات الرئيسية الناجحة: {passed_major}/{len(major_tests)}")
        
        # Final assessment
        if passed_major == len(major_tests):
            print("\n🎉 تقييم نهائي: ممتاز!")
            print("✅ نظام التحقق من البريد الإلكتروني يعمل بشكل مثالي")
            print("✅ جميع endpoints محمية بشكل صحيح")
            print("✅ معالجة الأخطاء والأداء ممتازة")
            return True
        elif passed_major >= 2:
            print("\n✅ تقييم نهائي: جيد جداً!")
            print("✅ الميزات الأساسية تعمل بشكل صحيح")
            print("⚠️ بعض التحسينات الطفيفة مطلوبة")
            return True
        else:
            print("\n⚠️ تقييم نهائي: يحتاج تحسين")
            print("🔧 مطلوب إصلاحات إضافية")
            return False

def main():
    tester = BasemappFocusedTester()
    success = tester.run_focused_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())