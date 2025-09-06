import requests
import sys
import json
from datetime import datetime
import time
import concurrent.futures
import threading

class BasemappPerformanceTester:
    def __init__(self, base_url="https://chat-sync-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, params=None):
        """Run a single API test with timing"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        start_time = time.time()
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            response_time = time.time() - start_time
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code} - Time: {response_time:.3f}s")
                try:
                    return success, response.json(), response_time
                except:
                    return success, {}, response_time
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code} - Time: {response_time:.3f}s")
                try:
                    error_detail = response.json()
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                return False, {}, response_time

        except Exception as e:
            response_time = time.time() - start_time
            print(f"❌ Failed - Error: {str(e)} - Time: {response_time:.3f}s")
            return False, {}, response_time

    def test_concurrent_registrations(self):
        """Test concurrent user registrations for performance"""
        print("🚀 اختبار التسجيل المتزامن للمستخدمين")
        print("-" * 50)
        
        def register_user(user_id):
            timestamp = datetime.now().strftime('%H%M%S')
            user_data = {
                "username": f"مستخدم_متزامن_{user_id}_{timestamp}",
                "email": f"concurrent.user.{user_id}.{timestamp}@basemapp.com",
                "password": f"كلمة_مرور_قوية{user_id}!"
            }
            
            start_time = time.time()
            try:
                response = requests.post(
                    f"{self.api_url}/auth/register",
                    json=user_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                response_time = time.time() - start_time
                return response.status_code == 200, response_time, user_id
            except Exception as e:
                response_time = time.time() - start_time
                return False, response_time, user_id
        
        # Test with 5 concurrent registrations
        num_concurrent = 5
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_concurrent) as executor:
            futures = [executor.submit(register_user, i) for i in range(num_concurrent)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        total_time = time.time() - start_time
        
        successful = sum(1 for success, _, _ in results if success)
        avg_response_time = sum(time for _, time, _ in results) / len(results)
        
        print(f"   📊 Concurrent registrations: {successful}/{num_concurrent}")
        print(f"   ⏱️ Total time: {total_time:.3f}s")
        print(f"   ⏱️ Average response time: {avg_response_time:.3f}s")
        print(f"   🚀 Throughput: {num_concurrent/total_time:.2f} requests/second")
        
        self.tests_run += 1
        if successful >= num_concurrent * 0.8:  # 80% success rate
            self.tests_passed += 1
            print("   ✅ Concurrent performance: Good")
            return True
        else:
            print("   ❌ Concurrent performance: Poor")
            return False

    def test_api_response_times(self):
        """Test API response times for different endpoints"""
        print("\n⚡ اختبار أوقات استجابة API")
        print("-" * 50)
        
        endpoints_to_test = [
            ("POST", "auth/register", "تسجيل مستخدم", {
                "username": f"speed_test_{datetime.now().strftime('%H%M%S')}",
                "email": f"speed.test.{datetime.now().strftime('%H%M%S')}@basemapp.com",
                "password": "SpeedTest123!"
            }),
            ("POST", "auth/login", "تسجيل دخول خاطئ", {
                "email": "invalid@test.com",
                "password": "invalid"
            }),
            ("POST", "auth/verify-email", "التحقق من البريد", {
                "email": "test@example.com",
                "code": "123456"
            }),
            ("POST", "auth/resend-verification", "إعادة إرسال التحقق", {
                "email": "nonexistent@example.com"
            })
        ]
        
        response_times = []
        successful_tests = 0
        
        for method, endpoint, name, data in endpoints_to_test:
            expected_status = 200 if "register" in endpoint else [400, 401, 404]
            
            start_time = time.time()
            try:
                response = requests.post(
                    f"{self.api_url}/{endpoint}",
                    json=data,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                response_time = time.time() - start_time
                response_times.append(response_time)
                
                # Check if response is as expected
                if isinstance(expected_status, list):
                    success = response.status_code in expected_status
                else:
                    success = response.status_code == expected_status
                
                if success:
                    successful_tests += 1
                    print(f"   ✅ {name}: {response_time:.3f}s (Status: {response.status_code})")
                else:
                    print(f"   ❌ {name}: {response_time:.3f}s (Status: {response.status_code})")
                    
            except Exception as e:
                response_time = time.time() - start_time
                response_times.append(response_time)
                print(f"   ❌ {name}: {response_time:.3f}s (Error: {str(e)})")
        
        avg_response_time = sum(response_times) / len(response_times)
        max_response_time = max(response_times)
        min_response_time = min(response_times)
        
        print(f"\n   📊 Performance Summary:")
        print(f"   ⏱️ Average response time: {avg_response_time:.3f}s")
        print(f"   ⏱️ Fastest response: {min_response_time:.3f}s")
        print(f"   ⏱️ Slowest response: {max_response_time:.3f}s")
        print(f"   ✅ Successful tests: {successful_tests}/{len(endpoints_to_test)}")
        
        self.tests_run += len(endpoints_to_test)
        self.tests_passed += successful_tests
        
        # Performance criteria: average < 2s, max < 5s
        if avg_response_time < 2.0 and max_response_time < 5.0:
            print("   🎉 Overall performance: Excellent")
            return True
        elif avg_response_time < 3.0 and max_response_time < 8.0:
            print("   ✅ Overall performance: Good")
            return True
        else:
            print("   ⚠️ Overall performance: Needs improvement")
            return False

    def test_error_handling_performance(self):
        """Test error handling and edge cases"""
        print("\n🛡️ اختبار معالجة الأخطاء والحالات الحدية")
        print("-" * 50)
        
        error_tests = [
            # Test malformed requests
            ("POST", "auth/register", "بيانات ناقصة", {"username": "test"}),
            ("POST", "auth/login", "بيانات فارغة", {}),
            ("POST", "auth/verify-email", "رمز فارغ", {"email": "test@test.com", "code": ""}),
            
            # Test invalid data types
            ("POST", "auth/register", "نوع بيانات خاطئ", {
                "username": 12345,
                "email": "test@test.com",
                "password": "test"
            }),
            
            # Test very long strings
            ("POST", "auth/register", "نص طويل جداً", {
                "username": "a" * 1000,
                "email": "test@test.com",
                "password": "test"
            })
        ]
        
        successful_error_handling = 0
        total_error_tests = len(error_tests)
        
        for method, endpoint, name, data in error_tests:
            start_time = time.time()
            try:
                response = requests.post(
                    f"{self.api_url}/{endpoint}",
                    json=data,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                # Error handling is good if it returns 400, 422, or similar client error
                if 400 <= response.status_code < 500:
                    successful_error_handling += 1
                    print(f"   ✅ {name}: {response_time:.3f}s (Status: {response.status_code})")
                else:
                    print(f"   ❌ {name}: {response_time:.3f}s (Status: {response.status_code})")
                    
            except Exception as e:
                response_time = time.time() - start_time
                print(f"   ❌ {name}: {response_time:.3f}s (Error: {str(e)})")
        
        print(f"\n   📊 Error Handling Summary:")
        print(f"   ✅ Proper error responses: {successful_error_handling}/{total_error_tests}")
        print(f"   📈 Error handling rate: {(successful_error_handling/total_error_tests)*100:.1f}%")
        
        self.tests_run += total_error_tests
        self.tests_passed += successful_error_handling
        
        return successful_error_handling >= total_error_tests * 0.8  # 80% success rate

    def run_performance_tests(self):
        """Run comprehensive performance tests"""
        print("🚀 اختبار شامل للأداء والتحسينات - BasemApp")
        print("=" * 60)
        
        # Test 1: Concurrent Performance
        concurrent_success = self.test_concurrent_registrations()
        
        # Test 2: API Response Times
        response_time_success = self.test_api_response_times()
        
        # Test 3: Error Handling Performance
        error_handling_success = self.test_error_handling_performance()
        
        # Calculate results
        performance_tests = [
            ("الأداء المتزامن", concurrent_success),
            ("أوقات الاستجابة", response_time_success),
            ("معالجة الأخطاء", error_handling_success)
        ]
        
        passed_performance = sum(1 for _, success in performance_tests if success)
        
        # Print results
        print("\n" + "=" * 60)
        print("📊 نتائج اختبار الأداء والتحسينات:")
        print("-" * 40)
        
        for test_name, success in performance_tests:
            status = "✅ ممتاز" if success else "⚠️ يحتاج تحسين"
            print(f"   {test_name}: {status}")
        
        print("-" * 40)
        print(f"📈 إجمالي الاختبارات: {self.tests_run}")
        print(f"📈 الاختبارات الناجحة: {self.tests_passed}")
        print(f"📈 معدل النجاح التفصيلي: {(self.tests_passed/self.tests_run)*100:.1f}%")
        print(f"📈 اختبارات الأداء الناجحة: {passed_performance}/{len(performance_tests)}")
        
        # Final assessment
        if passed_performance == len(performance_tests):
            print("\n🎉 تقييم الأداء: ممتاز!")
            print("✅ الأداء المتزامن ممتاز")
            print("✅ أوقات الاستجابة سريعة")
            print("✅ معالجة الأخطاء فعّالة")
            print("🚀 النظام جاهز للإنتاج بأداء عالي!")
            return True
        elif passed_performance >= 2:
            print("\n✅ تقييم الأداء: جيد جداً!")
            print("✅ معظم جوانب الأداء ممتازة")
            print("⚠️ بعض التحسينات الطفيفة مطلوبة")
            return True
        else:
            print("\n⚠️ تقييم الأداء: يحتاج تحسين")
            print("🔧 مطلوب تحسينات في الأداء")
            return False

def main():
    tester = BasemappPerformanceTester()
    success = tester.run_performance_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())