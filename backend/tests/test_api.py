from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_metadata_contains_required_columns() -> None:
    response = client.get("/api/metadata")
    assert response.status_code == 200
    payload = response.json()
    assert "YearStart" in payload["columns"]
    assert "Data_Value" in payload["columns"]
    assert payload["rows"] > 0


def test_trends_endpoint_returns_items() -> None:
    metadata = client.get("/api/metadata").json()
    params = {
        "question": metadata["default_filters"]["question"],
        "stratification_category": metadata["default_filters"]["stratification_category"],
        "stratification": metadata["default_filters"]["stratification"],
    }
    response = client.get("/api/trends", params=params)
    assert response.status_code == 200
    payload = response.json()
    assert "items" in payload
    assert len(payload["items"]) > 0


def test_kpi_requires_question() -> None:
    response = client.get("/api/kpi")
    assert response.status_code == 200
    payload = response.json()
    assert payload["value"] is None
    assert payload["requires_question"] is True


def test_map_requires_question() -> None:
    response = client.get("/api/map")
    assert response.status_code == 200
    payload = response.json()
    assert payload["items"] == []
    assert payload["requires_question"] is True


def test_kpi_uses_latest_total_national_value() -> None:
    metadata = client.get("/api/metadata").json()
    params = {
        "question": metadata["default_filters"]["question"],
        "stratification_category": "Total",
        "stratification": "Total",
    }
    response = client.get("/api/kpi", params=params)
    assert response.status_code == 200
    payload = response.json()
    assert payload["year"] == metadata["default_filters"]["latest_year"]
    assert payload["region"] == "USA gesamt"
    assert payload["group"] == "Total"
    assert payload["calculation_type"] == "national"
    assert payload["record_count"] == 1


def test_map_values_use_state_locations_only() -> None:
    metadata = client.get("/api/metadata").json()
    params = {
        "question": metadata["default_filters"]["question"],
        "stratification_category": "Total",
        "stratification": "Total",
    }
    response = client.get("/api/map", params=params)
    assert response.status_code == 200
    payload = response.json()
    locations = {item["location"] for item in payload["items"]}
    assert len(locations) >= 45
    assert "National" not in locations
    assert "Puerto Rico" not in locations
    assert "Guam" not in locations
    assert "" not in locations


def test_rankings_return_all_available_state_locations_and_chart_subset() -> None:
    metadata = client.get("/api/metadata").json()
    params = {
        "question": metadata["default_filters"]["question"],
        "stratification_category": "Total",
        "stratification": "Total",
        "limit": 10,
    }
    response = client.get("/api/rankings", params=params)
    assert response.status_code == 200
    payload = response.json()
    locations = {item["location"] for item in payload["items"]}
    assert payload["total_regions"] == 51
    assert payload["available_regions"] == len(payload["items"])
    assert len(payload["chart_items"]) == 10
    assert payload["available_regions"] >= 45
    assert "National" not in locations
    assert "Puerto Rico" not in locations
    assert "Guam" not in locations
    assert "" not in locations


def test_rankings_age_group_keeps_state_location_metadata() -> None:
    metadata = client.get("/api/metadata").json()
    params = {
        "question": metadata["default_filters"]["question"],
        "stratification_category": "Age (years)",
        "stratification": "55 - 64",
        "limit": 10,
    }
    response = client.get("/api/rankings", params=params)
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_regions"] == 51
    assert payload["available_regions"] == len(payload["items"])
    assert len(payload["chart_items"]) <= 10
    assert "National" in payload["excluded_locations"]
    assert all(item["location"] != "National" for item in payload["items"])


def test_physical_activity_kpi_order() -> None:
    metadata = client.get("/api/metadata").json()

    def find_question(fragment: str) -> str:
        return next(question for question in metadata["questions"] if fragment in question)

    moderate_150 = find_question(
        "150 minutes a week of moderate-intensity aerobic physical activity or 75 minutes"
    )
    moderate_300 = find_question(
        "300 minutes a week of moderate-intensity aerobic physical activity or 150 minutes"
    )
    combined = find_question(
        "engage in muscle-strengthening activities on 2 or more days a week"
    )

    def kpi_value(question: str) -> float:
        response = client.get(
            "/api/kpi",
            params={
                "question": question,
                "stratification_category": "Total",
                "stratification": "Total",
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["calculation_type"] == "national"
        return payload["value"]

    assert kpi_value(moderate_150) > kpi_value(moderate_300) > kpi_value(combined)
