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
drawer_resp = r.json()
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
payee_account = payee_resp["account"]["account_number"]

# 3. Login drawer
print("\n=== Logging in drawer ===")
r = requests.post(f"{BASE_URL}/auth/login", json={"email": drawer_email, "password": password})
drawer_token = r.json()["access_token"]

# 4. Login payee
print("\n=== Logging in payee ===")
r = requests.post(f"{BASE_URL}/auth/login", json={"email": payee_email, "password": password})
payee_token = r.json()["access_token"]

headers = {"Authorization": f"Bearer {drawer_token}"}
headers_payee = {"Authorization": f"Bearer {payee_token}"}

# 5. Create high amount cheque (1 crore = 10,000,000 rupees)
print("\n=== Creating HIGH AMOUNT cheque (1 crore) ===")
r = requests.post(f"{BASE_URL}/cheques/create", headers=headers, json={
    "payee_account_number": payee_account,
    "payee_name": "Test Payee",
    "ifsc_code": "SMTC0000001",
    "branch": "Test Branch",
    "bank_name": "Smart Cheque Bank",
    "drawer_name": "Test Drawer",
    "amount_rupees": "10000000.00",
    "expanded_crores": 1,
    "expanded_lakhs": 0,
    "expanded_thousands": 0,
    "expanded_hundreds": 0,
    "expanded_tens": 0,
    "expanded_ones": 0,
    "expanded_paise": 0,
    "cheque_date": "2026-06-24",
    "amount_confirmation": "10000000.00"
})
print(f"Status: {r.status_code}")
cheque = r.json()
print(f"Response: {json.dumps(cheque, indent=2)}")
cheque_id = cheque["cheque_id"]

# 6. Present cheque as payee
print("\n=== Presenting HIGH AMOUNT cheque ===")
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