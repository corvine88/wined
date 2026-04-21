"""Backend API tests for Vini App (wine tasting journal)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://tasting-map.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@viniapp.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data and data["access_token"]
    assert data["user"]["email"] == ADMIN_EMAIL
    return data["access_token"]


@pytest.fixture(scope="module")
def user_b_token():
    email = f"TEST_userb_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass12345", "name": "User B"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Auth ----------
class TestAuth:
    def test_register_new_user(self):
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pw12345", "name": "Reg"})
        assert r.status_code == 200
        data = r.json()
        assert data["access_token"]
        assert data["user"]["email"] == email.lower()
        assert data["user"]["auth_provider"] == "email"

    def test_register_duplicate(self):
        email = f"TEST_dup_{uuid.uuid4().hex[:8]}@example.com"
        requests.post(f"{API}/auth/register", json={"email": email, "password": "pw12345"})
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pw12345"})
        assert r.status_code == 400

    def test_login_admin(self, admin_token):
        assert admin_token

    def test_login_bad(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=h(admin_token))
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout(self, admin_token):
        r = requests.post(f"{API}/auth/logout", headers=h(admin_token))
        assert r.status_code == 200

    def test_emergent_session_invalid(self):
        r = requests.post(f"{API}/auth/session", json={"session_id": "invalid_sid_xyz"})
        assert r.status_code in (401, 500)


# ---------- Wine Types ----------
class TestWineTypes:
    def test_get_wine_types(self, admin_token):
        r = requests.get(f"{API}/wine-types", headers=h(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert set(data["defaults"]) == {"Rosso", "Bianco", "Rosato", "Spumante", "Dolce", "Altro"}
        assert isinstance(data["custom"], list)

    def test_get_wine_types_unauth(self):
        r = requests.get(f"{API}/wine-types")
        assert r.status_code == 401

    def test_create_custom_type(self, admin_token):
        name = f"TEST_Tipo_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/wine-types", json={"name": name}, headers=h(admin_token))
        assert r.status_code == 200
        assert r.json()["name"] == name
        # verify in GET
        r2 = requests.get(f"{API}/wine-types", headers=h(admin_token))
        names = [c["name"] for c in r2.json()["custom"]]
        assert name in names

    def test_reject_duplicate_default(self, admin_token):
        r = requests.post(f"{API}/wine-types", json={"name": "Rosso"}, headers=h(admin_token))
        assert r.status_code == 400


# ---------- Wines CRUD ----------
class TestWines:
    def test_wines_unauth(self):
        r = requests.get(f"{API}/wines")
        assert r.status_code == 401

    def test_create_get_list(self, admin_token):
        payload = {
            "name": "TEST_Barolo 2018",
            "wine_type": "Rosso",
            "location_name": "Roma",
            "latitude": 41.9028,
            "longitude": 12.4964,
            "rating": 4,
            "notes": "Ottimo",
            "front_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
            "back_photo": "",
        }
        r = requests.post(f"{API}/wines", json=payload, headers=h(admin_token))
        assert r.status_code == 200, r.text
        w = r.json()
        assert w["name"] == payload["name"]
        assert w["wine_type"] == "Rosso"
        assert w["rating"] == 4
        assert w["latitude"] == 41.9028
        wine_id = w["wine_id"]

        # GET single
        r2 = requests.get(f"{API}/wines/{wine_id}", headers=h(admin_token))
        assert r2.status_code == 200
        assert r2.json()["wine_id"] == wine_id

        # List
        r3 = requests.get(f"{API}/wines", headers=h(admin_token))
        assert r3.status_code == 200
        ids = [x["wine_id"] for x in r3.json()]
        assert wine_id in ids
        # newest-first: first item has a created_at >= others
        if len(r3.json()) >= 2:
            assert r3.json()[0]["created_at"] >= r3.json()[-1]["created_at"]

        # Filter by type
        r4 = requests.get(f"{API}/wines?wine_type=Rosso", headers=h(admin_token))
        assert r4.status_code == 200
        assert all(x["wine_type"] == "Rosso" for x in r4.json())

        # Filter by location (case-insensitive)
        r5 = requests.get(f"{API}/wines?location=roma", headers=h(admin_token))
        assert r5.status_code == 200
        assert any(x["wine_id"] == wine_id for x in r5.json())

        # Update
        upd = {**payload, "name": "TEST_Barolo 2018 Updated", "rating": 5, "notes": "Eccellente"}
        r6 = requests.put(f"{API}/wines/{wine_id}", json=upd, headers=h(admin_token))
        assert r6.status_code == 200
        assert r6.json()["rating"] == 5
        # verify persisted
        r6b = requests.get(f"{API}/wines/{wine_id}", headers=h(admin_token))
        assert r6b.json()["name"] == "TEST_Barolo 2018 Updated"

        # Delete
        r7 = requests.delete(f"{API}/wines/{wine_id}", headers=h(admin_token))
        assert r7.status_code == 200
        r8 = requests.get(f"{API}/wines/{wine_id}", headers=h(admin_token))
        assert r8.status_code == 404

    def test_get_unknown_wine(self, admin_token):
        r = requests.get(f"{API}/wines/wine_nonexistent", headers=h(admin_token))
        assert r.status_code == 404

    def test_user_isolation(self, admin_token, user_b_token):
        # admin creates
        payload = {"name": "TEST_Isol", "wine_type": "Bianco", "location_name": "Milano", "rating": 3}
        r = requests.post(f"{API}/wines", json=payload, headers=h(admin_token))
        wid = r.json()["wine_id"]
        # user B should not see it in list
        rb = requests.get(f"{API}/wines", headers=h(user_b_token))
        assert rb.status_code == 200
        assert all(x["wine_id"] != wid for x in rb.json())
        # user B cannot GET by id (treated as not found)
        rb2 = requests.get(f"{API}/wines/{wid}", headers=h(user_b_token))
        assert rb2.status_code == 404
        # cleanup
        requests.delete(f"{API}/wines/{wid}", headers=h(admin_token))
