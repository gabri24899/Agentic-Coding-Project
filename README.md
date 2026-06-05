# Nutrition, Physical Activity & Obesity Dashboard

Lokales Hochschulprojekt mit FastAPI-Backend und React-Dashboard fuer den
Hugging-Face-Datensatz:

`HHS-Official/nutrition-physical-activity-and-obesity-behavioral`

## Was gebaut wurde

- `backend/`: FastAPI-API, Datenbereinigung, lokaler Parquet-Cache
- `frontend/`: React + TypeScript + Vite + Tailwind CSS + shadcn/ui-Stilkomponenten
- `AGENT_LOG.md`: Arbeitsprotokoll

## Backend starten

Im Projektordner:

```powershell
cd "D:\studium\Agent Coding Projekt"
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir backend
```

Danach ist die API erreichbar unter:

`http://localhost:8000/api/health`

Beim ersten Aufruf von `/api/metadata` laedt das Backend den Datensatz und
speichert die bereinigten Daten lokal als Parquet-Datei in `backend/data/`.

## Frontend starten

In einem zweiten Terminal:

```powershell
cd "D:\studium\Agent Coding Projekt\frontend"
npm.cmd run dev
```

Danach ist das Dashboard erreichbar unter:

`http://localhost:5173`

## Tests ausfuehren

Backend:

```powershell
cd "D:\studium\Agent Coding Projekt"
.\backend\.venv\Scripts\python.exe -m pytest backend
```

Frontend-Build:

```powershell
cd "D:\studium\Agent Coding Projekt\frontend"
npm.cmd run build
```

## API-Endpunkte

- `/api/health`
- `/api/metadata`
- `/api/kpi`
- `/api/map`
- `/api/trends`
- `/api/rankings`
- `/api/stratification`
- `/api/forecast`

## Was das Dashboard zeigt

Das Dashboard zeigt eine interaktive USA-Karte, Trends, Bundesstaatenvergleiche
und Gruppenvergleiche fuer ausgewaehlte Indikatoren zu Ernaehrung, Bewegung und
Gewichtstatus. Die Forecast-Ansicht ist nur eine einfache lineare Projektion
fuer die Hochschulabgabe und keine medizinische Aussage.

## UX- und Logikregeln

- Eine konkrete Frage bzw. ein Indikator ist Pflicht. Ohne Question werden keine KPI-Werte, Trends, Rankings, Forecasts oder Tabellen berechnet.
- Beim Laden wird standardmaessig der Obesity-Indikator ausgewaehlt.
- Der KPI `Aktueller Wert` wird separat ueber `/api/kpi` berechnet:
  - immer mit konkreter `Question`
  - immer fuer genau ein Jahr, standardmaessig das neueste verfuegbare Jahr
  - standardmaessig mit `StratificationCategory1 = Total` und `Stratification1 = Total`
  - wenn moeglich als Nationalwert aus `LocationDesc = National`
  - falls kein Nationalwert existiert, als klar gekennzeichneter ungewichteter Durchschnitt ueber Regionen
  - niemals still ueber mehrere Jahre oder mehrere Stratifikationsgruppen
- Der KPI `Aenderung zum Vorjahr` vergleicht den Wert des aktiven Jahres mit dem naechsten verfuegbaren Vorjahr. Er ist kein Gesamttrend ueber alle Jahre.
- `Topic` dient als thematische Vorauswahl, `Question` ist der eigentliche Pflichtindikator.
- Der Question-Filter ist als kompakte suchbare Combobox umgesetzt. Lange Fragen werden in der Ergebnisliste auf zwei Zeilen begrenzt; der Volltext steht im Bereich `Aktiver Indikator`.
- Sichtbare Dataset-Werte werden im Frontend deutsch angezeigt. Intern bleiben die originalen englischen Hugging-Face-Werte erhalten und werden unveraendert an die API geschickt.
  - Zentrale Frontend-Uebersetzungen liegen in `frontend/src/lib/translations.ts`.
  - Uebersetzt werden u. a. Topic, Question, Stratifikation, Gruppenwerte, USA-Labels und Backend-Hinweistexte.
- Der fruehere Klassenfilter ist in der UI ausgeblendet, weil er fuer dieses Dashboard gegenueber Topic/Question keinen klaren Mehrwert bot.
- Stratifikation und Gruppe sind gekoppelt: Bei `Gesamtwert` gibt es keine Gruppenauswahl; bei z. B. `Age (years)` werden passende Altersgruppen angeboten.
- Der Bundesstaatenvergleich filtert leere oder unbekannte Locations aus. `National` und Territories werden nicht als Bundesstaaten gezaehlt.
- `/api/rankings` liefert alle verfuegbaren US-Bundesstaaten/DC fuer die Filterkombination. Das Balkendiagramm zeigt aus Lesbarkeitsgruenden nur die Top 10, die Ranking-Tabelle darunter zeigt alle verfuegbaren Regionen und nennt fehlende Regionen transparent.
- Die interaktive Karte nutzt `us-atlas`, `topojson-client` und `d3-geo`.
  - Jeder sichtbare Bundesstaat ist anklickbar.
  - Ein Klick setzt den Region-/Bundesstaat-Filter.
  - Der Reset-Button setzt die Kartenauswahl wieder auf `USA gesamt / alle Bundesstaaten`.
  - Hover und Tastaturfokus zeigen den aktuellen Wert der gewaehlten Question fuer den Bundesstaat.
- Oben rechts kann zwischen Light Mode und Dark Mode gewechselt werden. Die Auswahl wird im Browser gespeichert.
