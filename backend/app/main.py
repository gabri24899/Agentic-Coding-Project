from __future__ import annotations

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .data_service import DATASET_ID, PARQUET_FILE, DashboardFilters, get_data_service

app = FastAPI(
    title="Nutrition, Physical Activity and Obesity Dashboard API",
    description="Local FastAPI backend for the Hugging Face nutrition dashboard.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _filters(
    year: int | None = Query(default=None),
    location: str | None = Query(default=None),
    class_name: str | None = Query(default=None),
    topic: str | None = Query(default=None),
    question: str | None = Query(default=None),
    stratification_category: str | None = Query(default=None),
    stratification: str | None = Query(default=None),
) -> DashboardFilters:
    return DashboardFilters(
        year=year,
        location=location,
        class_name=class_name,
        topic=topic,
        question=question,
        stratification_category=stratification_category,
        stratification=stratification,
    )


@app.get("/api/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "dataset_id": DATASET_ID,
        "cache_file_exists": PARQUET_FILE.exists(),
    }


@app.get("/api/metadata")
def metadata() -> dict[str, object]:
    return get_data_service().metadata()


@app.get("/api/trends")
def trends(filters: DashboardFilters = Depends(_filters)) -> dict[str, object]:
    return get_data_service().trends(filters)


@app.get("/api/kpi")
def kpi(filters: DashboardFilters = Depends(_filters)) -> dict[str, object]:
    return get_data_service().current_kpi(filters)


@app.get("/api/map")
def map_values(filters: DashboardFilters = Depends(_filters)) -> dict[str, object]:
    return get_data_service().map_values(filters)


@app.get("/api/rankings")
def rankings(
    filters: DashboardFilters = Depends(_filters),
    limit: int = Query(default=10, ge=1, le=51),
) -> dict[str, object]:
    return get_data_service().rankings(filters, limit=limit)


@app.get("/api/stratification")
def stratification(
    filters: DashboardFilters = Depends(_filters),
    limit: int = Query(default=20, ge=1, le=50),
) -> dict[str, object]:
    return get_data_service().stratification(filters, limit=limit)


@app.get("/api/forecast")
def forecast(
    filters: DashboardFilters = Depends(_filters),
    horizon: int = Query(default=3, ge=1, le=5),
) -> dict[str, object]:
    return get_data_service().forecast(filters, horizon=horizon)
