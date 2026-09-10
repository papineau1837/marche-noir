import sys
sys.path.insert(0, r"C:\MARCHENOIR\backend")
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

# Test root
resp = client.get("/")
print(f"GET /: {resp.status_code} - {resp.json()}")

# Test assets
resp = client.get("/api/assets")
data = resp.json()
print(f"GET /api/assets: {resp.status_code} - Nb actifs: {len(data.get('assets', []))}")

# Test rumors
resp = client.get("/api/rumors")
print(f"GET /api/rumors: {resp.status_code} - Nb rumeurs: {len(resp.json().get('rumors', []))}")

# Test create order with integer quantity
resp = client.post("/api/orders", json={
    "user_id": "user-test-123",
    "asset_id": "14295cc9-6fbc-434f-b4da-5796d80db9ee",
    "order_type": "BUY",
    "price": 50000.0,
    "quantity": 1
})
print(f"POST /api/orders: {resp.status_code} - {resp.json()}")