import requests
import json
import uuid

BASE_URL = "http://localhost:8000"

# Generate unique emails
unique_id = str(uuid.uuid4())[:8]
drawer_email = f"drawer_{unique_id}@test.com"
payee_email = f"payee_{unique_id}@test.com"
password = "TestPass123!"

# 1. Register drawer
print("=== Registering drawer ===")
drawer_data = {
    "email": drawer_email,
    "full_name": "Test Drawer",
    "mobile": "9876543210",
    "password": password,
    "role": "INDIVIDUAL"
}
r = requests.post(f"{BASE_URL}/auth/register", json=drawer_data)
print(f"Status: {r.status_code}")
drawer_resp = r.json()
print(f"Response: {drawer_resp}")
drawer_account = drawer_resp["account"]["account_number"]

# 2. Register payee
print("\n=== Registering payee ===")
payee_data = {
    "email": payee_email,
    "full_name": "Test Payee",
    "mobile": "9876543211",
    "password": password,
    "role": "INDIVIDUAL"
}
r = requests.post(f"{BASE_URL}/auth/register", json=payee_data)
print(f"Status: {r.status_code}")
payee_resp = r.json()
print(f"Response: {payee_resp}")
payee_account = payee_resp["account"]["account_number"]

# 3. Login drawer
print("\n=== Logging in drawer ===")
r = requests.post(f"{BASE_URL}/auth/login", json={"email": drawer_email, "password": password})
print(f"Status: {r.status_code}")
drawer_token = r.json()["access_token"]
print(f"Token: {drawer_token[:30]}...")

# 4. Login payee
print("\n=== Logging in payee ===")
r = requests.post(f"{BASE_URL}/auth/login", json={"email": payee_email, "password": password})
print(f"Status: {r.status_code}")
payee_token = r.json()["access_token"]
print(f"Token: {payee_token[:30]}...")

# 5. Create cheque (cheque book is auto-created)
print("\n=== Creating cheque ===")
headers = {"Authorization": f"Bearer {drawer_token}"}
r = requests.post(f"{BASE_URL}/cheques/create", headers=headers, json={
    "payee_account_number": payee_account,  # Use payee's account number
    "payee_name": "Test Payee",
    "ifsc_code": "SMTC0000001",
    "branch": "Test Branch",
    "bank_name": "Smart Cheque Bank",
    "drawer_name": "Test Drawer",
    "amount_rupees": "5000.00",
    "expanded_crores": 0,
    "expanded_lakhs": 0,
    "expanded_thousands": 5,
    "expanded_hundreds": 0,
    "expanded_tens": 0,
    "expanded_ones": 0,
    "expanded_paise": 0,
    "cheque_date": "2026-06-24",
    "amount_confirmation": "5000.00"
})
print(f"Status: {r.status_code}")
cheque = r.json()
print(f"Response: {json.dumps(cheque, indent=2)}")
cheque_id = cheque["cheque_id"]

# 6. Present cheque as payee
print("\n=== Presenting cheque as payee ===")
headers_payee = {"Authorization": f"Bearer {payee_token}"}
r = requests.post(f"{BASE_URL}/cheques/{cheque_id}/present", headers=headers_payee)
print(f"Status: {r.status_code}")
present_result = r.json()
print(f"Response: {json.dumps(present_result, indent=2)}")

# 7. Check risk details
print("\n=== Getting risk details ===")
r = requests.get(f"{BASE_URL}/cheques/{cheque_id}/risk-details", headers=headers_payee)
print(f"Status: {r.status_code}")
risk_details = r.json()
print(f"Response: {json.dumps(risk_details, indent=2)}")

# 8. Also test with higher amount to trigger OTP_REQUIRED
print("\n\n=== TEST 2: Higher amount cheque (should trigger OTP_REQUIRED) ===")
r = requests.post(f"{BASE_URL}/cheques/create", headers=headers, json={
    "payee_account_number": payee_account,
    "payee_name": "Test Payee",
    "ifsc_code": "SMTC0000001",
    "branch": "Test Branch",
    "bank_name": "Smart Cheque Bank",
    "drawer_name": "Test Drawer",
    "amount_rupees": "15000.00",
    "expanded_crores": 0,
    "expanded_lakhs": 0,
    "expanded_thousands": 15,
    "expanded_hundreds": 0,
    "expanded_tens": 0,
    "expanded_ones": 0,
    "expanded_paise": 0,
    "cheque_date": "2026-06-24",
    "amount_confirmation": "15000.00"
})
print(f"Status: {r.status_code}")
cheque2 = r.json()
print(f"Response: {json.dumps(cheque2, indent=2)}")
cheque_id2 = cheque2["cheque_id"]

r = requests.post(f"{BASE_URL}/cheques/{cheque_id2}/present", headers=headers_payee)
print(f"\n=== Presenting higher amount cheque ===")
print(f"Status: {r.status_code}")
present_result2 = r.json()
print(f"Response: {json.dumps(present_result2, indent=2)}")

r = requests.get(f"{BASE_URL}/cheques/{cheque_id2}/risk-details", headers=headers_payee)
print(f"\n=== Getting risk details for higher amount ===")
print(f"Status: {r.status_code}")
risk_details2 = r.json()
print(f"Response: {json.dumps(risk_details2, indent=2)}")