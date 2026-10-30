from sqlalchemy import text
from sqlalchemy.orm import Session

import pytest


def make_employee(client, number, department="Engineering", name=None):
    response = client.post(
        "/api/employees",
        json={
            "employee_code": f"EMP{number}",
            "name": name or f"Employee {number}",
            "department": department,
            "email": f"employee{number}@example.com",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def make_period(client, name):
    response = client.post(
        "/api/review-periods",
        json={"name": name, "start_date": "2027-01-01", "end_date": "2027-06-30"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def submit(client, employee_id, period_id, q=4, d=5, t=4, comments="Good work."):
    response = client.post(
        "/api/reviews",
        json={
            "employee_id": employee_id,
            "review_period_id": period_id,
            "quality_of_work": q,
            "delivery_ownership": d,
            "teamwork_collaboration": t,
            "comments": comments,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def set_submitted_at(engine, review_id, timestamp):
    with Session(engine) as session, session.begin():
        session.execute(
            text("update performance_reviews set submitted_at = :t where id = :i"),
            {"t": timestamp, "i": review_id},
        )


def ids(response):
    assert response.status_code == 200, response.text
    return [row["id"] for row in response.json()]


@pytest.fixture
def register(client):
    """Three employees, two periods and four reviews:
    id 1: EMP1 Engineering, P1   id 2: EMP1, P2   id 3: EMP2 Marketing, P1   id 4: EMP3 engineering, P2
    """
    make_employee(client, 1, "Engineering", "Alex Morgan")
    make_employee(client, 2, "Marketing", "Priya Nair")
    make_employee(client, 3, "engineering", "Sam Carter")  # lower-case department on purpose
    make_period(client, "2027 H1")
    make_period(client, "2027 H2")
    submit(client, 1, 1, q=4, d=5, t=4, comments="Alex H1")
    submit(client, 1, 2, q=3, d=3, t=3, comments="Alex H2")
    submit(client, 2, 1, q=5, d=5, t=5, comments="Priya H1")
    submit(client, 3, 2, q=1, d=2, t=2, comments="Sam H2")
    return client


# --- the register itself ---


def test_empty_register_returns_empty_list(client):
    response = client.get("/api/reviews")

    assert response.status_code == 200
    assert response.json() == []


def test_register_row_contains_review_employee_and_period_details(client):
    make_employee(client, 1, "Engineering", "Alex Morgan")
    make_period(client, "2027 H1")
    submitted = submit(client, 1, 1, comments="Strong quarter.")

    rows = client.get("/api/reviews").json()

    assert rows == [
        {
            "id": 1,
            "employee_id": 1,
            "employee_code": "EMP1",
            "employee_name": "Alex Morgan",
            "department": "Engineering",
            "review_period_id": 1,
            "review_period_name": "2027 H1",
            "quality_of_work": 4,
            "delivery_ownership": 5,
            "teamwork_collaboration": 4,
            "average_rating": 4.33,
            "comments": "Strong quarter.",
            "submitted_at": submitted["submitted_at"],
        }
    ]


def test_register_returns_every_review(register):
    assert sorted(ids(register.get("/api/reviews"))) == [1, 2, 3, 4]


# --- ordering ---


def test_register_is_ordered_newest_first(register, engine):
    set_submitted_at(engine, 1, "2027-03-01 10:00:00")
    set_submitted_at(engine, 2, "2027-05-01 10:00:00")
    set_submitted_at(engine, 3, "2027-01-01 10:00:00")
    set_submitted_at(engine, 4, "2027-04-01 10:00:00")

    assert ids(register.get("/api/reviews")) == [2, 4, 1, 3]


def test_register_breaks_ties_with_the_highest_id_first(register, engine):
    for review_id in (1, 2, 3, 4):
        set_submitted_at(engine, review_id, "2027-03-01 10:00:00")

    assert ids(register.get("/api/reviews")) == [4, 3, 2, 1]


# --- filters ---


def test_filter_by_employee(register):
    assert ids(register.get("/api/reviews", params={"employee_id": 1})) == [2, 1]


def test_filter_by_review_period(register):
    assert ids(register.get("/api/reviews", params={"review_period_id": 2})) == [4, 2]


def test_filter_by_department_ignores_case(register):
    # EMP1 is "Engineering" and EMP3 is "engineering"; both match either spelling.
    assert sorted(ids(register.get("/api/reviews", params={"department": "ENGINEERING"}))) == [1, 2, 4]
    assert ids(register.get("/api/reviews", params={"department": "marketing"})) == [3]


def test_filter_by_department_ignores_surrounding_spaces(register):
    assert ids(register.get("/api/reviews", params={"department": "  Marketing  "})) == [3]


def test_filters_combine_with_and(register):
    assert ids(register.get("/api/reviews", params={"employee_id": 1, "review_period_id": 2})) == [2]
    assert ids(register.get("/api/reviews", params={"department": "engineering", "review_period_id": 2})) == [4, 2]
    assert ids(register.get("/api/reviews", params={"department": "marketing", "review_period_id": 2})) == []


def test_filter_that_matches_nothing_returns_empty_list(register):
    for params in (
        {"employee_id": 999},
        {"review_period_id": 999},
        {"department": "Legal"},
        {"employee_id": 2, "review_period_id": 2},
    ):
        response = register.get("/api/reviews", params=params)

        assert response.status_code == 200
        assert response.json() == [], params


@pytest.mark.parametrize(
    "params",
    [
        {"employee_id": 0},
        {"employee_id": -1},
        {"employee_id": "abc"},
        {"employee_id": 1.5},
        {"review_period_id": 0},
        {"review_period_id": "abc"},
        {"department": ""},
        {"department": "   "},
        {"department": "x" * 101},
    ],
)
def test_invalid_filter_returns_422(register, params):
    assert register.get("/api/reviews", params=params).status_code == 422


def test_unknown_query_parameters_are_ignored(register):
    assert sorted(ids(register.get("/api/reviews", params={"colour": "red"}))) == [1, 2, 3, 4]


# --- what the register includes ---


def test_register_includes_reviews_of_inactive_employees_and_closed_periods(register):
    register.patch("/api/employees/1", json={"status": "Inactive"})
    register.patch("/api/review-periods/1", json={"status": "Closed"})

    assert sorted(ids(register.get("/api/reviews"))) == [1, 2, 3, 4]


def test_register_shows_current_employee_and_period_names(register):
    register.patch("/api/employees/1", json={"name": "Alexandra Morgan", "department": "Finance"})
    register.patch("/api/review-periods/1", json={"name": "Renamed period"})

    rows = {row["id"]: row for row in register.get("/api/reviews").json()}

    assert rows[1]["employee_name"] == "Alexandra Morgan"
    assert rows[1]["department"] == "Finance"
    assert rows[1]["review_period_name"] == "Renamed period"
    assert ids(register.get("/api/reviews", params={"department": "finance"})) == [2, 1]


def test_reading_the_register_changes_nothing(register):
    before = register.get("/api/reviews").json()

    register.get("/api/reviews", params={"employee_id": 1})
    register.get("/api/reviews", params={"department": "marketing"})

    assert register.get("/api/reviews").json() == before
    assert register.get("/api/reviews/1").status_code == 200


def test_single_review_endpoint_still_returns_the_flat_review(register):
    body = register.get("/api/reviews/1").json()

    assert body["id"] == 1
    assert "employee_name" not in body
    assert body["average_rating"] == 4.33
