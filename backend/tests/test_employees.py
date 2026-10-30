import pytest

from app.services import employee_service


def make_employee(code="EMP101", email="alex@example.com", **overrides):
    return {
        "employee_code": code,
        "name": "Alex Morgan",
        "department": "Engineering",
        "email": email,
        **overrides,
    }


def create(client, **kwargs):
    response = client.post("/api/employees", json=make_employee(**kwargs))
    assert response.status_code == 201, response.text
    return response.json()


# --- POST /api/employees ---


def test_create_returns_201_with_active_status(client):
    response = client.post("/api/employees", json=make_employee())

    assert response.status_code == 201
    assert response.json() == {
        "id": 1,
        "employee_code": "EMP101",
        "name": "Alex Morgan",
        "department": "Engineering",
        "email": "alex@example.com",
        "status": "Active",
    }


def test_create_trims_text_and_lowercases_email(client):
    body = create(client, email="  Alex.Morgan@Example.COM ", name="  Alex Morgan  ")

    assert body["email"] == "alex.morgan@example.com"
    assert body["name"] == "Alex Morgan"


def test_create_duplicate_code_returns_409_naming_field(client):
    create(client)

    response = client.post("/api/employees", json=make_employee(email="other@example.com"))

    assert response.status_code == 409
    assert "employee_code" in response.json()["detail"]


def test_create_duplicate_email_returns_409_naming_field(client):
    create(client)

    response = client.post("/api/employees", json=make_employee(code="EMP102"))

    assert response.status_code == 409
    assert "email" in response.json()["detail"]


def test_create_duplicate_email_differing_only_by_case_returns_409(client):
    create(client)

    response = client.post(
        "/api/employees", json=make_employee(code="EMP102", email="ALEX@example.com")
    )

    assert response.status_code == 409


@pytest.mark.parametrize(
    "overrides",
    [
        {"employee_code": "XYZ101"},
        {"employee_code": "EMP"},
        {"employee_code": "emp101"},
        {"employee_code": "EMP" + "1" * 18},  # 21 characters
        {"name": ""},
        {"name": "   "},
        {"department": "   "},
        {"email": ""},
        {"email": "   "},
        {"name": "x" * 101},
        {"email": "a" * 250 + "@x.com"},
        {"status": "Active"},  # status is not accepted on create
        {"unknown_field": "x"},
    ],
)
def test_create_invalid_input_returns_422(client, overrides):
    response = client.post("/api/employees", json=make_employee(**overrides))

    assert response.status_code == 422


@pytest.mark.parametrize("missing", ["employee_code", "name", "department", "email"])
def test_create_missing_field_returns_422(client, missing):
    body = make_employee()
    del body[missing]

    assert client.post("/api/employees", json=body).status_code == 422


def test_create_handles_race_where_database_rejects_duplicate(client, monkeypatch):
    """The pre-check passes, but the unique constraint still catches the duplicate."""
    create(client)
    real_find_conflict = employee_service._find_conflict
    calls = []

    def blind_first_call(*args, **kwargs):
        calls.append(1)
        return None if len(calls) == 1 else real_find_conflict(*args, **kwargs)

    monkeypatch.setattr(employee_service, "_find_conflict", blind_first_call)

    response = client.post("/api/employees", json=make_employee(email="other@example.com"))

    assert response.status_code == 409
    assert "employee_code" in response.json()["detail"]


# --- GET /api/employees ---


def test_list_empty(client):
    response = client.get("/api/employees")

    assert response.status_code == 200
    assert response.json() == []


def test_list_returns_all_ordered_by_id(client):
    create(client, code="EMP103", email="c@example.com")
    create(client, code="EMP101", email="a@example.com")
    create(client, code="EMP102", email="b@example.com")

    body = client.get("/api/employees").json()

    assert [e["id"] for e in body] == [1, 2, 3]
    assert [e["employee_code"] for e in body] == ["EMP103", "EMP101", "EMP102"]


def test_list_filters_by_status(client):
    create(client, code="EMP101", email="a@example.com")
    second = create(client, code="EMP102", email="b@example.com")
    client.patch(f"/api/employees/{second['id']}", json={"status": "Inactive"})

    active = client.get("/api/employees", params={"status": "Active"}).json()
    inactive = client.get("/api/employees", params={"status": "Inactive"}).json()

    assert [e["employee_code"] for e in active] == ["EMP101"]
    assert [e["employee_code"] for e in inactive] == ["EMP102"]


def test_list_invalid_status_returns_422(client):
    assert client.get("/api/employees", params={"status": "Retired"}).status_code == 422


# --- GET /api/employees/{id} ---


def test_get_by_id(client):
    created = create(client)

    response = client.get(f"/api/employees/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_missing_returns_404(client):
    response = client.get("/api/employees/999")

    assert response.status_code == 404
    assert "999" in response.json()["detail"]


def test_get_non_numeric_id_returns_422(client):
    assert client.get("/api/employees/abc").status_code == 422


# --- PATCH /api/employees/{id} ---


def test_patch_changes_only_the_fields_sent(client):
    created = create(client)

    response = client.patch(f"/api/employees/{created['id']}", json={"department": "Finance"})

    assert response.status_code == 200
    assert response.json() == {**created, "department": "Finance"}
    assert client.get(f"/api/employees/{created['id']}").json()["department"] == "Finance"


def test_patch_deactivates_and_reactivates(client):
    created = create(client)
    url = f"/api/employees/{created['id']}"

    assert client.patch(url, json={"status": "Inactive"}).json()["status"] == "Inactive"
    assert client.patch(url, json={"status": "Active"}).json()["status"] == "Active"


def test_patch_trims_and_lowercases_email(client):
    created = create(client)

    response = client.patch(f"/api/employees/{created['id']}", json={"email": " New@Example.com "})

    assert response.json()["email"] == "new@example.com"


def test_patch_keeping_own_email_is_not_a_conflict(client):
    created = create(client)

    response = client.patch(
        f"/api/employees/{created['id']}", json={"email": created["email"], "name": "Alex M."}
    )

    assert response.status_code == 200


def test_patch_duplicate_email_returns_409(client):
    create(client, code="EMP101", email="a@example.com")
    second = create(client, code="EMP102", email="b@example.com")

    response = client.patch(f"/api/employees/{second['id']}", json={"email": "a@example.com"})

    assert response.status_code == 409
    assert "email" in response.json()["detail"]


def test_patch_missing_employee_returns_404(client):
    assert client.patch("/api/employees/999", json={"name": "X"}).status_code == 404


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"employee_code": "EMP999"},  # immutable
        {"name": "New Name", "employee_code": "EMP999"},  # immutable, even beside a valid field
        {"name": "New Name", "unknown_field": "x"},
        {"name": None},
        {"status": None},
        {"name": "   "},
        {"status": "Retired"},
        {"email": ""},
        {"unknown_field": "x"},
    ],
)
def test_patch_invalid_body_returns_422_and_changes_nothing(client, body):
    created = create(client)
    url = f"/api/employees/{created['id']}"

    assert client.patch(url, json=body).status_code == 422
    assert client.get(url).json() == created
