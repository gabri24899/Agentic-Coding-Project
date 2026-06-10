# AGENTS.md

## Projektziel
Baue ein lokales Dashboard für den Hugging-Face-Datensatz:
HHS-Official/nutrition-physical-activity-and-obesity-behavioral

## Tech-Stack
- Backend: Python, FastAPI, pandas, datasets
- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts
- Alles lokal über localhost
- Kein Docker
- Kein Deployment
- Keine Cloudflare-App

## Projektstruktur
Erstelle selbstständig diese Struktur:
- backend/
- frontend/
- README.md
- AGENT_LOG.md

## Daten
- Lade den Datensatz mit datasets.load_dataset()
- Cache die Daten lokal als Parquet-Datei
- Nutze wichtige Spalten wie YearStart, LocationDesc, Class, Topic, Question, Data_Value, StratificationCategory1 und Stratification1
- Bereinige fehlende Werte in Data_Value

## Dashboard-Funktionen
- Filter für Jahr, Bundesstaat, Frage/Indikator und Stratifikation
- KPI-Karten
- Trend-Liniendiagramm
- Balkendiagramm für Bundesstaatenvergleich
- Gruppenvergleich nach Stratifikation
- einfacher Forecast
- Datentabelle

## Arbeitsweise
- Plane zuerst
- Erstelle dann Backend und Frontend
- Installiere fehlende Pakete selbstständig
- Teste Backend und Frontend
- Behebe Fehler selbstständig
- Dokumentiere deine Schritte in AGENT_LOG.md

## UI-Design-Regeln

Das Dashboard soll modern, übersichtlich und professionell aussehen.

Design-Stil:

* Sauberes Analytics-Dashboard
* Heller Hintergrund
* Karten mit abgerundeten Ecken
* Dezente Schatten
* Viel Abstand zwischen Elementen
* Keine überladene Optik
* Gut lesbare Schriftgrößen
* Einheitliches Spacing

Layout:

* Header oben mit Projekttitel und kurzer Beschreibung
* Filterbereich direkt unter dem Header oder links als Sidebar
* KPI-Karten oben im Dashboard
* Danach Diagramme in einem responsiven Grid
* Datentabelle im unteren Bereich
* Auf kleinen Bildschirmen sollen die Elemente untereinander angezeigt werden

Komponenten:

* Verwende shadcn/ui für Cards, Buttons, Selects, Inputs, Tabs, Table, Badge und Skeletons
* Verwende Recharts für Diagramme
* Verwende lucide-react für Icons
* Baue Loading-States und Error-States ein

Diagramme:

* Trend als LineChart
* Bundesstaatenvergleich als BarChart
* Stratifikationsvergleich als BarChart oder grouped view
* Forecast klar als einfache Projektion kennzeichnen

Wichtig:

* Die Oberfläche soll wie ein echtes Data-/BI-Dashboard wirken.
