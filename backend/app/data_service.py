from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

DATASET_ID = "HHS-Official/nutrition-physical-activity-and-obesity-behavioral"
DEFAULT_QUESTION = "Percent of adults aged 18 years and older who have obesity"

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
PARQUET_FILE = DATA_DIR / "nutrition_obesity_clean.parquet"
CACHE_INFO_FILE = DATA_DIR / "cache_info.json"
HF_DATASETS_CACHE = DATA_DIR / "hf_datasets_cache"
NATIONAL_LOCATION = "National"

IMPORTANT_COLUMNS = [
    "YearStart",
    "LocationDesc",
    "Class",
    "Topic",
    "Question",
    "Data_Value",
    "Low_Confidence_Limit",
    "High_Confidence_Limit",
    "StratificationCategory1",
    "Stratification1",
]

STRING_COLUMNS = [
    "LocationDesc",
    "Class",
    "Topic",
    "Question",
    "StratificationCategory1",
    "Stratification1",
]

US_STATE_LOCATIONS = {
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "District of Columbia",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
}


@dataclass(frozen=True)
class DashboardFilters:
    year: int | None = None
    location: str | None = None
    class_name: str | None = None
    topic: str | None = None
    question: str | None = None
    stratification_category: str | None = None
    stratification: str | None = None


def _is_all(value: str | None) -> bool:
    return value is None or value.strip() in {"", "All", "Alle", "__all__"}


def _has_question(filters: DashboardFilters) -> bool:
    return not _is_all(filters.question)


def _json_number(value: Any) -> float | int | None:
    if value is None:
        return None
    if isinstance(value, (float, np.floating)) and np.isnan(value):
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    return value


def _unique_sorted(series: pd.Series) -> list[str]:
    values = series.dropna().astype(str).str.strip()
    return sorted(value for value in values.unique().tolist() if value and value != "nan")


class NutritionDataService:
    def __init__(self) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._data = self._load_or_create_cache()
        self._cache_info = self._load_cache_info()

    @property
    def data(self) -> pd.DataFrame:
        return self._data

    def _load_or_create_cache(self) -> pd.DataFrame:
        if PARQUET_FILE.exists():
            return pd.read_parquet(PARQUET_FILE)

        HF_DATASETS_CACHE.mkdir(parents=True, exist_ok=True)
        os.environ.setdefault("HF_HOME", str(DATA_DIR / "hf_home"))
        os.environ.setdefault("HF_DATASETS_CACHE", str(HF_DATASETS_CACHE))
        os.environ.setdefault("HF_HUB_CACHE", str(DATA_DIR / "hf_hub_cache"))
        os.environ.setdefault("HF_XET_CACHE", str(DATA_DIR / "hf_xet_cache"))
        from datasets import load_dataset

        dataset = load_dataset(DATASET_ID, split="train", cache_dir=str(HF_DATASETS_CACHE))
        raw_df = dataset.to_pandas()
        raw_df.columns = [str(column).strip() for column in raw_df.columns]

        original_rows = len(raw_df)
        missing_before = int(pd.to_numeric(raw_df["Data_Value"], errors="coerce").isna().sum())
        cleaned = self._clean_dataframe(raw_df)

        cleaned.to_parquet(PARQUET_FILE, index=False)
        cache_info = {
            "dataset_id": DATASET_ID,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "original_rows": original_rows,
            "clean_rows": len(cleaned),
            "removed_missing_data_value_rows": original_rows - len(cleaned),
            "missing_data_value_rows_before_cleaning": missing_before,
            "parquet_file": str(PARQUET_FILE),
        }
        CACHE_INFO_FILE.write_text(json.dumps(cache_info, indent=2), encoding="utf-8")
        return cleaned

    def _load_cache_info(self) -> dict[str, Any]:
        if CACHE_INFO_FILE.exists():
            return json.loads(CACHE_INFO_FILE.read_text(encoding="utf-8"))
        return {
            "dataset_id": DATASET_ID,
            "created_at": None,
            "original_rows": len(self._data),
            "clean_rows": len(self._data),
            "removed_missing_data_value_rows": 0,
            "missing_data_value_rows_before_cleaning": 0,
            "parquet_file": str(PARQUET_FILE),
        }

    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        missing_columns = [column for column in IMPORTANT_COLUMNS if column not in df.columns]
        if missing_columns:
            missing = ", ".join(missing_columns)
            raise ValueError(f"Dataset is missing required columns: {missing}")

        cleaned = df.copy()
        cleaned["Data_Value"] = pd.to_numeric(cleaned["Data_Value"], errors="coerce")
        cleaned["Low_Confidence_Limit"] = pd.to_numeric(
            cleaned["Low_Confidence_Limit"], errors="coerce"
        )
        cleaned["High_Confidence_Limit"] = pd.to_numeric(
            cleaned["High_Confidence_Limit"], errors="coerce"
        )
        cleaned["YearStart"] = pd.to_numeric(cleaned["YearStart"], errors="coerce")

        cleaned = cleaned.dropna(subset=["YearStart", "Data_Value"])
        cleaned["YearStart"] = cleaned["YearStart"].astype(int)

        for column in STRING_COLUMNS:
            cleaned[column] = cleaned[column].fillna("Unknown").astype(str).str.strip()
            cleaned.loc[cleaned[column] == "", column] = "Unknown"

        return cleaned[IMPORTANT_COLUMNS].reset_index(drop=True)

    def metadata(self) -> dict[str, Any]:
        df = self.data
        questions = _unique_sorted(df["Question"])
        categories = _unique_sorted(df["StratificationCategory1"])
        years = sorted(int(year) for year in df["YearStart"].dropna().unique().tolist())

        default_question = DEFAULT_QUESTION if DEFAULT_QUESTION in questions else questions[0]
        default_category = "Total" if "Total" in categories else categories[0]
        category_rows = df[df["StratificationCategory1"] == default_category]
        category_values = _unique_sorted(category_rows["Stratification1"])
        default_stratification = "Total" if "Total" in category_values else "All"

        stratifications_by_category = {
            category: _unique_sorted(
                df.loc[df["StratificationCategory1"] == category, "Stratification1"]
            )
            for category in categories
        }
        questions_by_topic = {
            topic: _unique_sorted(df.loc[df["Topic"] == topic, "Question"])
            for topic in _unique_sorted(df["Topic"])
        }

        return {
            "dataset_id": DATASET_ID,
            "rows": int(len(df)),
            "columns": IMPORTANT_COLUMNS,
            "cache": self._cache_info,
            "years": years,
            "locations": _unique_sorted(df["LocationDesc"]),
            "classes": _unique_sorted(df["Class"]),
            "topics": _unique_sorted(df["Topic"]),
            "questions": questions,
            "questions_by_topic": questions_by_topic,
            "stratification_categories": categories,
            "stratifications_by_category": stratifications_by_category,
            "default_filters": {
                "latest_year": years[-1] if years else None,
                "question": default_question,
                "stratification_category": default_category,
                "stratification": default_stratification,
            },
        }

    def _apply_filters(
        self,
        filters: DashboardFilters,
        *,
        include_year: bool = True,
        include_stratification: bool = True,
    ) -> pd.DataFrame:
        df = self.data
        if include_year and filters.year is not None:
            df = df[df["YearStart"] == filters.year]
        if not _is_all(filters.location):
            df = df[df["LocationDesc"] == filters.location]
        if not _is_all(filters.class_name):
            df = df[df["Class"] == filters.class_name]
        if not _is_all(filters.topic):
            df = df[df["Topic"] == filters.topic]
        if not _is_all(filters.question):
            df = df[df["Question"] == filters.question]
        if include_stratification and not _is_all(filters.stratification_category):
            df = df[df["StratificationCategory1"] == filters.stratification_category]
        if include_stratification and not _is_all(filters.stratification):
            df = df[df["Stratification1"] == filters.stratification]
        return df

    def trends(self, filters: DashboardFilters) -> dict[str, Any]:
        if not _has_question(filters):
            return {"items": [], "summary": self._empty_summary(), "requires_question": True}

        df = self._apply_filters(filters, include_year=False)
        if df.empty:
            return {"items": [], "summary": self._empty_summary()}

        grouped = (
            df.groupby("YearStart", as_index=False)
            .agg(
                value=("Data_Value", "mean"),
                low=("Low_Confidence_Limit", "mean"),
                high=("High_Confidence_Limit", "mean"),
                records=("Data_Value", "size"),
            )
            .sort_values("YearStart")
        )
        items = [
            {
                "year": int(row.YearStart),
                "value": round(float(row.value), 2),
                "low": _json_number(round(float(row.low), 2)) if pd.notna(row.low) else None,
                "high": _json_number(round(float(row.high), 2)) if pd.notna(row.high) else None,
                "records": int(row.records),
            }
            for row in grouped.itertuples(index=False)
        ]
        return {"items": items, "summary": self._summary_from_items(items)}

    def current_kpi(self, filters: DashboardFilters) -> dict[str, Any]:
        if not _has_question(filters):
            return {
                "value": None,
                "requires_question": True,
                "message": "Select a question before calculating the current KPI.",
                "record_count": 0,
            }

        df = self.data
        if not _is_all(filters.topic):
            df = df[df["Topic"] == filters.topic]
        if not _is_all(filters.class_name):
            df = df[df["Class"] == filters.class_name]
        df = df[df["Question"] == filters.question]

        if not _is_all(filters.location):
            df = df[df["LocationDesc"] == filters.location]

        stratification_category = (
            "Total" if _is_all(filters.stratification_category) else filters.stratification_category
        )
        if stratification_category == "Total":
            stratification = "Total"
        elif _is_all(filters.stratification):
            return {
                "value": None,
                "requires_group": True,
                "message": "Select a group before calculating a stratified KPI.",
                "year": filters.year,
                "region": self._region_label(filters.location),
                "group": stratification_category,
                "calculation": "No KPI calculated because multiple groups would be mixed.",
                "record_count": 0,
            }
        else:
            stratification = filters.stratification

        df = df[
            (df["StratificationCategory1"] == stratification_category)
            & (df["Stratification1"] == stratification)
        ]

        year = filters.year
        if year is None and not df.empty:
            year = int(df["YearStart"].max())
        if year is not None:
            df = df[df["YearStart"] == year]

        if df.empty:
            return {
                "value": None,
                "year": year,
                "region": self._region_label(filters.location),
                "group": self._group_label(stratification_category, stratification),
                "calculation": "No matching rows found.",
                "record_count": 0,
            }

        if _is_all(filters.location):
            national_rows = df[df["LocationDesc"] == NATIONAL_LOCATION]
            if not national_rows.empty:
                source_rows = national_rows
                region = "USA gesamt"
                calculation = "Nationalwert aus LocationDesc = National"
                calculation_type = "national"
                location_count = int(source_rows["LocationDesc"].nunique())
                value = round(float(source_rows["Data_Value"].mean()), 2)
            else:
                valid_locations = df["LocationDesc"].fillna("").astype(str).str.strip()
                source_rows = df[
                    valid_locations.ne("")
                    & ~valid_locations.isin(["Unknown", "nan", "None", NATIONAL_LOCATION])
                ]
                location_means = source_rows.groupby("LocationDesc")["Data_Value"].mean()
                value = round(float(location_means.mean()), 2) if not location_means.empty else None
                region = "Alle Bundesstaaten"
                calculation = "Durchschnitt ueber Bundesstaaten/Regionen, ungewichtet"
                calculation_type = "unweighted_location_average"
                location_count = int(location_means.count())
        else:
            source_rows = df
            region = self._region_label(filters.location)
            calculation = "Einzelwert fuer die ausgewaehlte Region"
            calculation_type = "selected_location"
            location_count = int(source_rows["LocationDesc"].nunique())
            value = round(float(source_rows["Data_Value"].mean()), 2)

        return {
            "value": value,
            "year": int(year) if year is not None else None,
            "region": region,
            "location_desc": (
                filters.location
                if not _is_all(filters.location)
                else NATIONAL_LOCATION
                if calculation_type == "national"
                else "Multiple"
            ),
            "group": self._group_label(stratification_category, stratification),
            "stratification_category": stratification_category,
            "stratification": stratification,
            "calculation": calculation,
            "calculation_type": calculation_type,
            "record_count": int(len(source_rows)),
            "location_count": location_count,
            "question": filters.question,
        }

    def map_values(self, filters: DashboardFilters) -> dict[str, Any]:
        if not _has_question(filters):
            return {"items": [], "requires_question": True, "record_count": 0}

        df = self.data
        if not _is_all(filters.topic):
            df = df[df["Topic"] == filters.topic]
        if not _is_all(filters.class_name):
            df = df[df["Class"] == filters.class_name]
        df = df[df["Question"] == filters.question]

        stratification_category = (
            "Total" if _is_all(filters.stratification_category) else filters.stratification_category
        )
        if stratification_category == "Total":
            stratification = "Total"
        elif _is_all(filters.stratification):
            return {
                "items": [],
                "requires_group": True,
                "message": "Select a group before calculating map values.",
                "record_count": 0,
            }
        else:
            stratification = filters.stratification

        df = df[
            (df["StratificationCategory1"] == stratification_category)
            & (df["Stratification1"] == stratification)
        ]

        year = filters.year
        if year is None and not df.empty:
            year = int(df["YearStart"].max())
        if year is not None:
            df = df[df["YearStart"] == year]

        location_values = df["LocationDesc"].fillna("").astype(str).str.strip()
        df = df[
            location_values.ne("")
            & ~location_values.isin(["Unknown", "nan", "None", NATIONAL_LOCATION])
            & location_values.isin(US_STATE_LOCATIONS)
        ]

        if df.empty:
            return {
                "items": [],
                "year": int(year) if year is not None else None,
                "group": self._group_label(stratification_category, stratification),
                "record_count": 0,
            }

        grouped = (
            df.groupby("LocationDesc", as_index=False)
            .agg(value=("Data_Value", "mean"), records=("Data_Value", "size"))
            .sort_values("LocationDesc")
        )
        items = [
            {
                "location": str(row.LocationDesc),
                "value": round(float(row.value), 2),
                "records": int(row.records),
            }
            for row in grouped.itertuples(index=False)
        ]
        values = [item["value"] for item in items]
        return {
            "items": items,
            "year": int(year) if year is not None else None,
            "group": self._group_label(stratification_category, stratification),
            "calculation": "Einzelwert je Bundesstaat/Region",
            "record_count": int(len(df)),
            "min": min(values) if values else None,
            "max": max(values) if values else None,
        }

    def rankings(self, filters: DashboardFilters, limit: int = 10) -> dict[str, Any]:
        total_regions = len(US_STATE_LOCATIONS)
        if not _has_question(filters):
            return {
                "items": [],
                "chart_items": [],
                "year": filters.year,
                "summary": self._empty_summary(),
                "requires_question": True,
                "total_regions": total_regions,
                "available_regions": 0,
                "missing_regions": sorted(US_STATE_LOCATIONS),
                "excluded_locations": [],
                "chart_limit": limit,
            }

        ranking_filters = DashboardFilters(
            year=filters.year,
            location=None,
            class_name=filters.class_name,
            topic=filters.topic,
            question=filters.question,
            stratification_category=filters.stratification_category,
            stratification=filters.stratification,
        )

        df = self._apply_filters(ranking_filters)
        if df.empty and filters.year is None:
            df = self._apply_filters(ranking_filters, include_year=False)
        if filters.year is None and not df.empty:
            latest_year = int(df["YearStart"].max())
            df = df[df["YearStart"] == latest_year]
        if df.empty:
            return {
                "items": [],
                "chart_items": [],
                "year": filters.year,
                "summary": self._empty_summary(),
                "total_regions": total_regions,
                "available_regions": 0,
                "missing_regions": sorted(US_STATE_LOCATIONS),
                "excluded_locations": [],
                "chart_limit": limit,
                "message": "Keine passenden Ranking-Daten fuer diese Filterkombination.",
            }

        location_values = df["LocationDesc"].fillna("").astype(str).str.strip()
        excluded_locations = sorted(
            value
            for value in location_values.unique().tolist()
            if value and value not in US_STATE_LOCATIONS
        )
        df = df[
            location_values.ne("")
            & location_values.isin(US_STATE_LOCATIONS)
        ]
        if df.empty:
            return {
                "items": [],
                "chart_items": [],
                "year": filters.year,
                "summary": self._empty_summary(),
                "total_regions": total_regions,
                "available_regions": 0,
                "missing_regions": sorted(US_STATE_LOCATIONS),
                "excluded_locations": excluded_locations,
                "chart_limit": limit,
                "message": "Keine US-Bundesstaaten/DC fuer diese Filterkombination gefunden.",
            }

        grouped = (
            df.groupby("LocationDesc", as_index=False)
            .agg(value=("Data_Value", "mean"), records=("Data_Value", "size"))
            .sort_values("value", ascending=False)
            .reset_index(drop=True)
        )
        items = [
            {
                "rank": index + 1,
                "location": str(row.LocationDesc),
                "value": round(float(row.value), 2),
                "records": int(row.records),
            }
            for index, row in enumerate(grouped.itertuples(index=False))
        ]
        available_locations = {item["location"] for item in items}
        missing_regions = sorted(US_STATE_LOCATIONS - available_locations)
        chart_limit = max(1, min(limit, total_regions))
        message = None
        if missing_regions:
            message = "Einige Staaten haben fuer diese Filterkombination keine Daten."

        return {
            "items": items,
            "chart_items": items[:chart_limit],
            "year": int(df["YearStart"].max()),
            "summary": self._summary_from_items(items),
            "total_regions": total_regions,
            "available_regions": len(items),
            "missing_regions": missing_regions,
            "excluded_locations": excluded_locations,
            "chart_limit": chart_limit,
            "selected_location": None if _is_all(filters.location) else filters.location,
            "message": message,
        }

    def stratification(self, filters: DashboardFilters, limit: int = 20) -> dict[str, Any]:
        if not _has_question(filters):
            return {
                "items": [],
                "year": filters.year,
                "summary": self._empty_summary(),
                "requires_question": True,
            }

        df = self._apply_filters(filters, include_stratification=False)
        if filters.year is None and not df.empty:
            df = df[df["YearStart"] == int(df["YearStart"].max())]
        if not _is_all(filters.stratification_category):
            df = df[df["StratificationCategory1"] == filters.stratification_category]
        if df.empty:
            return {"items": [], "year": filters.year, "summary": self._empty_summary()}

        grouped = (
            df.groupby(["StratificationCategory1", "Stratification1"], as_index=False)
            .agg(value=("Data_Value", "mean"), records=("Data_Value", "size"))
            .sort_values("value", ascending=False)
            .head(max(1, min(limit, 50)))
            .reset_index(drop=True)
        )
        items = [
            {
                "category": str(row.StratificationCategory1),
                "group": str(row.Stratification1),
                "value": round(float(row.value), 2),
                "records": int(row.records),
            }
            for row in grouped.itertuples(index=False)
        ]
        return {
            "items": items,
            "year": int(df["YearStart"].max()),
            "summary": self._summary_from_items(items),
        }

    def forecast(self, filters: DashboardFilters, horizon: int = 3) -> dict[str, Any]:
        if not _has_question(filters):
            return {
                "observed": [],
                "projected": [],
                "method": "Select a question before creating a projection.",
                "disclaimer": self._forecast_disclaimer(),
                "requires_question": True,
            }

        trend_items = self.trends(filters)["items"]
        if not trend_items:
            return {
                "observed": [],
                "projected": [],
                "method": "No projection possible because no matching rows were found.",
                "disclaimer": self._forecast_disclaimer(),
            }

        years = np.array([item["year"] for item in trend_items], dtype=float)
        values = np.array([item["value"] for item in trend_items], dtype=float)
        last_year = int(years.max())
        horizon = max(1, min(horizon, 5))

        if len(trend_items) >= 2 and len(np.unique(years)) >= 2:
            slope, intercept = np.polyfit(years, values, 1)
            projected = []
            for year in range(last_year + 1, last_year + horizon + 1):
                value = float((slope * year) + intercept)
                projected.append(
                    {"year": year, "value": round(max(0.0, min(100.0, value)), 2)}
                )
            method = "Linear trend projection based on historical average values."
        else:
            latest_value = float(values[-1])
            projected = [
                {"year": year, "value": round(latest_value, 2)}
                for year in range(last_year + 1, last_year + horizon + 1)
            ]
            method = "Flat projection because only one historical point is available."

        return {
            "observed": trend_items,
            "projected": projected,
            "method": method,
            "disclaimer": self._forecast_disclaimer(),
        }

    def _summary_from_items(self, items: list[dict[str, Any]]) -> dict[str, Any]:
        if not items:
            return self._empty_summary()
        values = [float(item["value"]) for item in items if item.get("value") is not None]
        records = sum(int(item.get("records", 0)) for item in items)
        first = values[0]
        latest = values[-1]
        return {
            "average": round(float(np.mean(values)), 2),
            "first_value": round(first, 2),
            "latest_value": round(latest, 2),
            "change": round(latest - first, 2),
            "record_count": records,
        }

    def _empty_summary(self) -> dict[str, Any]:
        return {
            "average": None,
            "first_value": None,
            "latest_value": None,
            "change": None,
            "record_count": 0,
        }

    def _forecast_disclaimer(self) -> str:
        return (
            "This is a simple mathematical trend projection for coursework. "
            "It is not medical advice and should not be interpreted as a health prediction."
        )

    def _region_label(self, location: str | None) -> str:
        return "USA gesamt" if _is_all(location) else str(location)

    def _group_label(self, category: str | None, stratification: str | None) -> str:
        if category == "Total" and stratification == "Total":
            return "Total"
        if _is_all(stratification):
            return str(category)
        return f"{category}: {stratification}"


@lru_cache(maxsize=1)
def get_data_service() -> NutritionDataService:
    return NutritionDataService()
