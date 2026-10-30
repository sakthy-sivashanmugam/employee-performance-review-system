from datetime import datetime
from decimal import Decimal
from itertools import product

import pytest

from app.services import review_service


def make_employee(client, number=101):
    response = client.post(
        "/api/employees",
        json={
            "employee_code": f"EMP{number}",
            "name": f"Employee {number}",
            "department": "Engineering",
            "email": f"employee{number}@example.com",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def make_period(client, name="2027 H1"):
    response = client.post(
        "/api/review-periods",
        json={"name": name, "start_date": "2027-01-01", "end_date": "2027-06-30"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def make_review(employee_id=1, period_id=1, q=4, d=5, t=4, comments="Strong quarter.", **extra):
    return {
        "employee_id": employee_id,
        "review_period_id": period_id,
        "quality_of_work": q,
        "delivery_ownership": d,
        "teamwork_collaboration": t,
        "comments": comments,
        **extra,
    }


def submit(client, **kwargs):
    response = client.post("/api/reviews", json=make_review(**kwargs))
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def ready(client):
    """One Active employee (id 1) and one Open review period (id 1)."""
    make_employee(client)
    make_period(client)
    return client


# --- POST /api/reviews: success ---


def test_submit_returns_201_with_calculated_average(ready):
    response = ready.post("/api/reviews", json=make_review())

    assert response.status_code == 201
    body = response.json()
    assert {k: v for k, v in body.items() if k != "submitted_at"} == {
        "id": 1,
        "employee_id": 1,
        "review_period_id": 1,
        "quality_of_work": 4,
        "delivery_ownership": 5,
        "teamwork_collaboration": 4,
        "average_rating": 4.33,
        "comments": "Strong quarter.",
    }
    assert isinstance(body["average_rating"], float)


def test_submit_sets_submission_time(ready):
    body = submit(ready)

    # Parses as an ISO timestamp; the exact value is set by the database.
    assert isinstance(datetime.fromisoformat(body["submitted_at"]), datetime)


def test_submit_trims_comments(ready):
    assert submit(ready, comments="  Good work.  \n")["comments"] == "Good work."


@pytest.mark.parametrize(
    "ratings, expected",
    [
        ((1, 1, 1), 1.0),
        ((5, 5, 5), 5.0),
        ((4, 5, 4), 4.33),
        ((1, 2, 2), 1.67),
        ((3, 3, 4), 3.33),
        ((1, 5, 3), 3.0),
    ],
)
def test_average_is_mean_of_the_three_ratings(ready, ratings, expected):
    q, d, t = ratings

    assert submit(ready, q=q, d=d, t=t)["average_rating"] == expected


def test_average_is_correct_for_every_possible_rating_combination(client):
    """All 125 combinations, checked against an independent integer calculation. The test
    database also enforces the average CHECK constraint, so a mismatch would fail with a 500."""
    make_period(client)
    for number, (q, d, t) in enumerate(product(range(1, 6), repeat=3), start=1):
        make_employee(client, number)
        body = submit(client, employee_id=number, q=q, d=d, t=t)

        cents = ((q + d + t) * 100 * 2 + 3) // 6  # (sum * 100 / 3), rounded half up
        assert Decimal(str(body["average_rating"])) == Decimal(cents) / 100, (q, d, t)


def test_calculate_average_returns_two_decimal_places():
    assert review_service.calculate_average(4, 5, 4) == Decimal("4.33")
    assert review_service.calculate_average(1, 1, 1) == Decimal("1.00")


def test_same_employee_can_be_reviewed_in_different_periods(ready):
    make_period(ready, "2027 H2")
    submit(ready, period_id=1)

    assert submit(ready, period_id=2)["id"] == 2


def test_different_employees_can_be_reviewed_in_the_same_period(ready):
    make_employee(ready, 102)
    submit(ready, employee_id=1)

    assert submit(ready, employee_id=2)["id"] == 2


# --- POST /api/reviews: validation (422) ---


@pytest.mark.parametrize(
    "overrides",
    [
        {"q": 0},
        {"q": 6},
        {"d": -1},
        {"t": 100},
        {"q": 4.5},
        {"q": 4.0},
        {"d": "4"},
        {"t": True},
        {"q": None},
        {"comments": ""},
        {"comments": "   \n\t "},
        {"comments": None},
        {"employee_id": 0},
        {"employee_id": -1},
        {"employee_id": "1"},
        {"employee_id": 1.5},
        {"period_id": 0},
        {"period_id": "1"},
        {"average_rating": 5},  # calculated by the backend, never submitted
        {"submitted_at": "2027-01-01T00:00:00"},
        {"reviewer_id": 1},
        {"unknown_field": "x"},
    ],
)
def test_submit_invalid_input_returns_422_and_stores_nothing(ready, overrides):
    response = ready.post("/api/reviews", json=make_review(**overrides))

    assert response.status_code == 422
    assert ready.get("/api/reviews/1").status_code == 404


@pytest.mark.parametrize(
    "missing",
    [
        "employee_id",
        "review_period_id",
        "quality_of_work",
        "delivery_ownership",
        "teamwork_collaboration",
        "comments",
    ],
)
def test_submit_missing_field_returns_422(ready, missing):
    body = make_review()
    del body[missing]

    assert ready.post("/api/reviews", json=body).status_code == 422


# --- POST /api/reviews: references and business rules (404 / 409) ---


def test_submit_for_missing_employee_returns_404(ready):
    response = ready.post("/api/reviews", json=make_review(employee_id=999))

    assert response.status_code == 404
    assert "Employee 999" in response.json()["detail"]
    assert ready.get("/api/reviews/1").status_code == 404


def test_submit_for_missing_period_returns_404(ready):
    response = ready.post("/api/reviews", json=make_review(period_id=999))

    assert response.status_code == 404
    assert "Review period 999" in response.json()["detail"]
    assert ready.get("/api/reviews/1").status_code == 404


def test_submit_for_inactive_employee_returns_409(ready):
    ready.patch("/api/employees/1", json={"status": "Inactive"})

    response = ready.post("/api/reviews", json=make_review())

    assert response.status_code == 409
    assert "EMP101" in response.json()["detail"]
    assert ready.get("/api/reviews/1").status_code == 404


def test_submit_for_closed_period_returns_409(ready):
    ready.patch("/api/review-periods/1", json={"status": "Closed"})

    response = ready.post("/api/reviews", json=make_review())

    assert response.status_code == 409
    assert "2027 H1" in response.json()["detail"]
    assert ready.get("/api/reviews/1").status_code == 404


def test_reactivated_employee_and_reopened_period_can_be_reviewed(ready):
    ready.patch("/api/employees/1", json={"status": "Inactive"})
    ready.patch("/api/review-periods/1", json={"status": "Closed"})
    ready.patch("/api/employees/1", json={"status": "Active"})
    ready.patch("/api/review-periods/1", json={"status": "Open"})

    assert ready.post("/api/reviews", json=make_review()).status_code == 201


def test_duplicate_review_returns_409_and_keeps_the_first(ready):
    first = submit(ready, q=5, d=5, t=5, comments="First review")

    response = ready.post("/api/reviews", json=make_review(q=1, d=1, t=1, comments="Second"))

    assert response.status_code == 409
    assert "EMP101" in response.json()["detail"]
    assert "2027 H1" in response.json()["detail"]
    assert ready.get("/api/reviews/1").json() == first
    assert ready.get("/api/reviews/2").status_code == 404


def test_duplicate_is_still_rejected_after_the_period_is_closed(ready):
    submit(ready)
    ready.patch("/api/review-periods/1", json={"status": "Closed"})

    assert ready.post("/api/reviews", json=make_review()).status_code == 409


def test_database_unique_constraint_catches_a_race(ready, monkeypatch):
    """The pre-check passes (another request has not committed yet), but the database refuses."""
    first = submit(ready)
    monkeypatch.setattr(review_service, "_review_exists", lambda *args, **kwargs: False)

    response = ready.post("/api/reviews", json=make_review(comments="Racing request"))

    assert response.status_code == 409
    assert "already has a review" in response.json()["detail"]
    assert ready.get("/api/reviews/1").json() == first
    assert ready.get("/api/reviews/2").status_code == 404


# --- GET /api/reviews/{id} ---


def test_get_returns_the_submitted_review(ready):
    submitted = submit(ready)

    response = ready.get(f"/api/reviews/{submitted['id']}")

    assert response.status_code == 200
    assert response.json() == submitted


def test_get_missing_returns_404(ready):
    response = ready.get("/api/reviews/999")

    assert response.status_code == 404
    assert "999" in response.json()["detail"]


def test_get_non_numeric_id_returns_422(ready):
    assert ready.get("/api/reviews/abc").status_code == 422


# --- Immutability: submitted reviews cannot be edited or deleted in the MVP ---


@pytest.mark.parametrize("method", ["patch", "put", "delete", "post"])
def test_submitted_reviews_cannot_be_changed_or_deleted(ready, method):
    submitted = submit(ready)

    response = getattr(ready, method)(
        f"/api/reviews/{submitted['id']}", **({"json": {"comments": "Edited"}} if method != "delete" else {})
    )

    assert response.status_code == 405
    assert ready.get(f"/api/reviews/{submitted['id']}").json() == submitted


def test_no_route_can_change_or_delete_a_submitted_review(ready):
    paths = ready.get("/openapi.json").json()["paths"]

    # The collection supports listing (the register) and submitting; a single review is read-only.
    assert sorted(paths["/api/reviews"]) == ["get", "post"]
    assert sorted(paths["/api/reviews/{review_id}"]) == ["get"]
