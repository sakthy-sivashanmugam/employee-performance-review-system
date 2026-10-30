import pytest


def make_period(name="2027 H1", start="2027-01-01", end="2027-06-30", **overrides):
    return {"name": name, "start_date": start, "end_date": end, **overrides}


def create(client, **kwargs):
    response = client.post("/api/review-periods", json=make_period(**kwargs))
    assert response.status_code == 201, response.text
    return response.json()


# --- POST /api/review-periods ---


def test_create_returns_201_and_is_open(client):
    response = client.post("/api/review-periods", json=make_period())

    assert response.status_code == 201
    assert response.json() == {
        "id": 1,
        "name": "2027 H1",
        "start_date": "2027-01-01",
        "end_date": "2027-06-30",
        "status": "Open",
    }


def test_create_trims_name(client):
    assert create(client, name="  2027 H1  ")["name"] == "2027 H1"


def test_create_allows_single_day_period(client):
    body = create(client, start="2027-03-01", end="2027-03-01")

    assert body["start_date"] == body["end_date"] == "2027-03-01"


def test_create_allows_overlapping_periods_and_repeated_names(client):
    create(client, name="Q1", start="2027-01-01", end="2027-03-31")
    second = create(client, name="Q1", start="2027-02-01", end="2027-04-30")

    assert second["id"] == 2
    assert len(client.get("/api/review-periods").json()) == 2


@pytest.mark.parametrize(
    "overrides",
    [
        {"name": ""},
        {"name": "   "},
        {"name": "x" * 101},
        {"start": "01/01/2027"},
        {"start": "2027-13-01"},
        {"end": "not a date"},
        {"start": 1798761600},  # numbers are not accepted as dates
        {"start": "2027-07-01", "end": "2027-06-30"},  # end before start
        {"status": "Open"},  # status is not accepted on create
        {"unknown_field": "x"},
    ],
)
def test_create_invalid_input_returns_422(client, overrides):
    response = client.post("/api/review-periods", json=make_period(**overrides))

    assert response.status_code == 422


@pytest.mark.parametrize("missing", ["name", "start_date", "end_date"])
def test_create_missing_field_returns_422(client, missing):
    body = make_period()
    del body[missing]

    assert client.post("/api/review-periods", json=body).status_code == 422


# --- GET /api/review-periods ---


def test_list_empty(client):
    response = client.get("/api/review-periods")

    assert response.status_code == 200
    assert response.json() == []


def test_list_returns_all_ordered_by_id(client):
    create(client, name="C")
    create(client, name="A")
    create(client, name="B")

    body = client.get("/api/review-periods").json()

    assert [p["id"] for p in body] == [1, 2, 3]
    assert [p["name"] for p in body] == ["C", "A", "B"]


def test_list_filters_by_status(client):
    create(client, name="Open one")
    closed = create(client, name="Closed one")
    client.patch(f"/api/review-periods/{closed['id']}", json={"status": "Closed"})

    open_ = client.get("/api/review-periods", params={"status": "Open"}).json()
    closed_ = client.get("/api/review-periods", params={"status": "Closed"}).json()

    assert [p["name"] for p in open_] == ["Open one"]
    assert [p["name"] for p in closed_] == ["Closed one"]


def test_list_invalid_status_returns_422(client):
    assert client.get("/api/review-periods", params={"status": "Pending"}).status_code == 422


# --- GET /api/review-periods/{id} ---


def test_get_by_id(client):
    created = create(client)

    response = client.get(f"/api/review-periods/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_missing_returns_404(client):
    response = client.get("/api/review-periods/999")

    assert response.status_code == 404
    assert "999" in response.json()["detail"]


def test_get_non_numeric_id_returns_422(client):
    assert client.get("/api/review-periods/abc").status_code == 422


# --- PATCH /api/review-periods/{id} ---


def test_patch_changes_only_the_fields_sent(client):
    created = create(client)

    response = client.patch(f"/api/review-periods/{created['id']}", json={"name": "Renamed"})

    assert response.status_code == 200
    assert response.json() == {**created, "name": "Renamed"}
    assert client.get(f"/api/review-periods/{created['id']}").json()["name"] == "Renamed"


def test_patch_closes_and_reopens(client):
    created = create(client)
    url = f"/api/review-periods/{created['id']}"

    assert client.patch(url, json={"status": "Closed"}).json()["status"] == "Closed"
    assert client.patch(url, json={"status": "Open"}).json()["status"] == "Open"


def test_patch_closed_period_can_still_be_edited(client):
    created = create(client)
    url = f"/api/review-periods/{created['id']}"
    client.patch(url, json={"status": "Closed"})

    response = client.patch(url, json={"name": "Edited while closed"})

    assert response.status_code == 200
    assert response.json()["status"] == "Closed"


def test_patch_both_dates_together(client):
    created = create(client, start="2027-01-01", end="2027-06-30")

    response = client.patch(
        f"/api/review-periods/{created['id']}",
        json={"start_date": "2028-01-01", "end_date": "2028-12-31"},
    )

    assert response.status_code == 200
    assert response.json()["start_date"] == "2028-01-01"
    assert response.json()["end_date"] == "2028-12-31"


def test_patch_single_date_is_checked_against_the_stored_date(client):
    created = create(client, start="2027-01-01", end="2027-06-30")
    url = f"/api/review-periods/{created['id']}"

    # New end before the stored start, and new start after the stored end.
    assert client.patch(url, json={"end_date": "2026-12-31"}).status_code == 422
    assert client.patch(url, json={"start_date": "2027-07-01"}).status_code == 422
    assert client.get(url).json() == created

    # Still valid relative to the stored dates.
    assert client.patch(url, json={"end_date": "2027-01-01"}).status_code == 200
    assert client.patch(url, json={"start_date": "2027-01-01"}).status_code == 200


def test_patch_missing_period_returns_404(client):
    assert client.patch("/api/review-periods/999", json={"name": "X"}).status_code == 404


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"id": 5},
        {"name": "New", "id": 5},
        {"name": "New", "unknown_field": "x"},
        {"name": None},
        {"start_date": None},
        {"status": None},
        {"name": "   "},
        {"status": "Pending"},
        {"start_date": "yesterday"},
        {"start_date": 1798761600},
        {"start_date": "2027-07-01", "end_date": "2027-06-30"},  # both sent, wrong order
    ],
)
def test_patch_invalid_body_returns_422_and_changes_nothing(client, body):
    created = create(client)
    url = f"/api/review-periods/{created['id']}"

    assert client.patch(url, json=body).status_code == 422
    assert client.get(url).json() == created
