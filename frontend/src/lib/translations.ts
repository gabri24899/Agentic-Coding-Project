const topicTranslations: Record<string, string> = {
  "Fruits and Vegetables - Behavior": "Obst und Gemuese",
  "Obesity / Weight Status": "Adipositas / Gewichtsstatus",
  "Physical Activity - Behavior": "Koerperliche Aktivitaet",
  "Sugar Drinks - Behavior": "Zuckerhaltige Getraenke",
}

const stratificationCategoryTranslations: Record<string, string> = {
  "Age (years)": "Alter",
  Education: "Bildung",
  Gender: "Geschlecht",
  Income: "Einkommen",
  "Race/Ethnicity": "Ethnie/Herkunft",
  Sex: "Geschlecht",
  Total: "Gesamtwert",
}

const stratificationValueTranslations: Record<string, string> = {
  Total: "Gesamtwert",
  Male: "Maenner",
  Female: "Frauen",
  "Less than high school": "Weniger als Highschool-Abschluss",
  "High school graduate": "Highschool-Abschluss",
  "Some college or technical school": "College oder technische Ausbildung",
  "College graduate": "Hochschulabschluss",
  "Data not reported": "Keine Angabe",
  "18 - 24": "18-24 Jahre",
  "25 - 34": "25-34 Jahre",
  "35 - 44": "35-44 Jahre",
  "45 - 54": "45-54 Jahre",
  "55 - 64": "55-64 Jahre",
  "65 or older": "65 Jahre oder aelter",
  "Less than $15,000": "Unter 15.000 USD",
  "$15,000 - $24,999": "15.000-24.999 USD",
  "$25,000 - $34,999": "25.000-34.999 USD",
  "$35,000 - $49,999": "35.000-49.999 USD",
  "$50,000 - $74,999": "50.000-74.999 USD",
  "$75,000 or greater": "75.000 USD oder mehr",
  "2 or more races": "Zwei oder mehr Herkunftsgruppen",
  "American Indian/Alaska Native": "American Indian/Alaska Native",
  Asian: "Asiatisch",
  "Hawaiian/Pacific Islander": "Hawaiian/Pacific Islander",
  Hispanic: "Hispanisch/Latino",
  "Non-Hispanic Black": "Nicht-hispanisch Schwarz",
  "Non-Hispanic White": "Nicht-hispanisch Weiss",
  Other: "Andere",
}

const questionTranslations: Record<string, string> = {
  "Percent of adults aged 18 years and older who have obesity":
    "Anteil der Erwachsenen ab 18 Jahren mit Adipositas",
  "Percent of adults aged 18 years and older who have an overweight classification":
    "Anteil der Erwachsenen ab 18 Jahren mit Uebergewicht",
  "Percent of adults who achieve at least 150 minutes a week of moderate-intensity aerobic physical activity or 75 minutes a week of vigorous-intensity aerobic activity (or an equivalent combination)":
    "Anteil der Erwachsenen, die mindestens 150 Minuten moderate oder 75 Minuten intensive aerobe Aktivitaet pro Woche erreichen",
  "Percent of adults who achieve at least 300 minutes a week of moderate-intensity aerobic physical activity or 150 minutes a week of vigorous-intensity aerobic activity (or an equivalent combination)":
    "Anteil der Erwachsenen, die mindestens 300 Minuten moderate oder 150 Minuten intensive aerobe Aktivitaet pro Woche erreichen",
  "Percent of adults who achieve at least 150 minutes a week of moderate-intensity aerobic physical activity or 75 minutes a week of vigorous-intensity aerobic physical activity and engage in muscle-strengthening activities on 2 or more days a week":
    "Anteil der Erwachsenen, die die Ausdauerempfehlung erreichen und an mindestens 2 Tagen pro Woche Muskeltraining machen",
  "Percent of adults who engage in muscle-strengthening activities on 2 or more days a week":
    "Anteil der Erwachsenen, die an mindestens 2 Tagen pro Woche Muskeltraining machen",
  "Percent of adults who engage in no leisure-time physical activity":
    "Anteil der Erwachsenen ohne koerperliche Aktivitaet in der Freizeit",
  "Percent of adults who report consuming fruit less than one time daily":
    "Anteil der Erwachsenen, die weniger als einmal taeglich Obst konsumieren",
  "Percent of adults who report consuming vegetables less than one time daily":
    "Anteil der Erwachsenen, die weniger als einmal taeglich Gemuese konsumieren",
  "Percent of adults who report consuming sugar-sweetened beverages 1 or more times daily":
    "Anteil der Erwachsenen, die mindestens einmal taeglich zuckerhaltige Getraenke konsumieren",
}

const locationTranslations: Record<string, string> = {
  National: "USA gesamt",
  Unknown: "Unbekannt",
  Multiple: "Mehrere Regionen",
}

const uiTranslations: Record<string, string> = {
  "Select a question before calculating the current KPI.":
    "Bitte zuerst eine Frage auswaehlen, bevor der aktuelle Wert berechnet wird.",
  "Select a group before calculating a stratified KPI.":
    "Bitte eine konkrete Gruppe auswaehlen, bevor ein stratifizierter KPI berechnet wird.",
  "No KPI calculated because multiple groups would be mixed.":
    "Kein KPI berechnet, weil sonst mehrere Gruppen vermischt wuerden.",
  "No matching rows found.": "Keine passenden Datensaetze gefunden.",
  "Nationalwert aus LocationDesc = National": "Nationalwert fuer USA gesamt",
  "Durchschnitt ueber Bundesstaaten/Regionen, ungewichtet":
    "Ungewichteter Durchschnitt ueber Bundesstaaten/Regionen",
  "Einzelwert fuer die ausgewaehlte Region": "Einzelwert fuer die ausgewaehlte Region",
  "Einzelwert je Bundesstaat/Region": "Einzelwert je Bundesstaat/Region",
  "Wert je Bundesstaat": "Wert je Bundesstaat",
  "Linear trend projection based on historical average values.":
    "Lineare Trendprojektion auf Basis historischer Durchschnittswerte.",
  "Flat projection because only one historical point is available.":
    "Konstante Projektion, weil nur ein historischer Datenpunkt verfuegbar ist.",
  "No projection possible because no matching rows were found.":
    "Keine Prognose moeglich, weil keine passenden Datensaetze gefunden wurden.",
  "Select a question before creating a projection.":
    "Bitte zuerst eine Frage auswaehlen, bevor eine Prognose erstellt wird.",
  "This is a simple mathematical trend projection for coursework. It is not medical advice and should not be interpreted as a health prediction.":
    "Dies ist eine einfache mathematische Trendprojektion fuer die Hochschulabgabe. Sie ist keine medizinische Aussage und keine Gesundheitsprognose.",
}

const missingTranslations = new Set<string>()

function fallback(kind: string, value: string) {
  if (import.meta.env.DEV) {
    const key = `${kind}:${value}`
    if (!missingTranslations.has(key)) {
      missingTranslations.add(key)
      console.warn(`Fehlende Uebersetzung (${kind}): ${value}`)
    }
  }

  return value
}

function translateFromMap(kind: string, value: string | null | undefined, map: Record<string, string>) {
  if (!value) {
    return ""
  }
  return map[value] ?? fallback(kind, value)
}

export function translateTopic(value: string | null | undefined) {
  return translateFromMap("topic", value, topicTranslations)
}

export function translateQuestion(value: string | null | undefined) {
  return translateFromMap("question", value, questionTranslations)
}

export function translateStratificationCategory(value: string | null | undefined) {
  return translateFromMap("stratificationCategory", value, stratificationCategoryTranslations)
}

export function translateStratificationValue(value: string | null | undefined) {
  return translateFromMap("stratificationValue", value, stratificationValueTranslations)
}

export function translateLocation(value: string | null | undefined) {
  if (!value) {
    return ""
  }
  return locationTranslations[value] ?? value
}

export function translateUiLabel(value: string | null | undefined) {
  return translateFromMap("ui", value, uiTranslations)
}

export function translateStratificationLabel(value: string | null | undefined) {
  if (!value) {
    return ""
  }
  const [category, ...rest] = value.split(":")
  if (!rest.length) {
    return translateStratificationValue(category.trim())
  }
  return `${translateStratificationCategory(category.trim())}: ${translateStratificationValue(
    rest.join(":").trim(),
  )}`
}
