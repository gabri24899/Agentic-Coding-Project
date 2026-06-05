import { useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Check,
  ChevronsUpDown,
  Database,
  MapPin,
  Moon,
  RefreshCw,
  Search,
  Sun,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"
import { geoPath } from "d3-geo"
import { feature } from "topojson-client"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import statesAtlas from "us-atlas/states-albers-10m.json"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  translateLocation,
  translateQuestion,
  translateStratificationCategory,
  translateStratificationLabel,
  translateStratificationValue,
  translateTopic,
  translateUiLabel,
} from "@/lib/translations"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
const ALL_VALUE = "__all__"
const TOTAL_VALUE = "Total"
const THEME_STORAGE_KEY = "nutrition-dashboard-theme"

type Theme = "light" | "dark"

type SelectOption = {
  value: string
  label: string
}

type Metadata = {
  dataset_id: string
  rows: number
  columns: string[]
  years: number[]
  locations: string[]
  classes: string[]
  topics: string[]
  questions: string[]
  questions_by_topic: Record<string, string[]>
  stratification_categories: string[]
  stratifications_by_category: Record<string, string[]>
  default_filters: {
    latest_year: number | null
    question: string
    stratification_category: string
    stratification: string
  }
}

type Filters = {
  year: string
  location: string
  topic: string
  question: string
  stratification_category: string
  stratification: string
}

type Summary = {
  average: number | null
  first_value: number | null
  latest_value: number | null
  change: number | null
  record_count: number
}

type TrendItem = {
  year: number
  value: number
  low?: number | null
  high?: number | null
  records: number
}

type RankingItem = {
  rank: number
  location: string
  value: number
  records: number
}

type RankingPayload = {
  items: RankingItem[]
  chart_items: RankingItem[]
  year: number | null
  summary: Summary
  total_regions: number
  available_regions: number
  missing_regions: string[]
  excluded_locations: string[]
  chart_limit: number
  selected_location?: string | null
  message?: string | null
  requires_question?: boolean
}

type MapItem = {
  location: string
  value: number
  records: number
}

type MapPayload = {
  items: MapItem[]
  year?: number | null
  group?: string
  calculation?: string
  record_count: number
  min?: number | null
  max?: number | null
  message?: string
  requires_question?: boolean
  requires_group?: boolean
}

type StratificationItem = {
  category: string
  group: string
  value: number
  records: number
}

type ForecastPayload = {
  observed: TrendItem[]
  projected: Array<{ year: number; value: number }>
  method: string
  disclaimer: string
}

type CurrentKpi = {
  value: number | null
  year?: number | null
  region?: string
  group?: string
  calculation?: string
  calculation_type?: string
  record_count: number
  location_count?: number
  question?: string
  message?: string
  requires_question?: boolean
  requires_group?: boolean
}

type DashboardData = {
  kpi: CurrentKpi
  map: MapPayload
  trends: { items: TrendItem[]; summary: Summary }
  rankings: RankingPayload
  stratification: { items: StratificationItem[]; year: number | null; summary: Summary }
  forecast: ForecastPayload
}

type StateFeature = {
  type: "Feature"
  id?: string | number
  properties: {
    name?: string
  }
  geometry: unknown
}

const numberFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
})

const chartTick = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 12,
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
}

const US_STATE_NAMES = new Set([
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
])

const stateFeatures = (
  feature(
    statesAtlas as never,
    (statesAtlas as { objects: { states: unknown } }).objects.states as never,
  ) as unknown as { features: StateFeature[] }
).features.filter((state) => {
  const name = state.properties.name ?? ""
  return US_STATE_NAMES.has(name)
})

const mapPath = geoPath() as unknown as (state: StateFeature) => string | null

function formatValue(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-"
  }
  return `${numberFormatter.format(value)} %`
}

function formatPercentagePointChange(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-"
  }
  const sign = value > 0 ? "+" : ""
  return `${sign}${numberFormatter.format(value)} Prozentpunkte`
}

function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-"
  }
  return new Intl.NumberFormat("de-DE").format(value)
}

function App() {
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [filters, setFilters] = useState<Filters | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(true)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    loadMetadata()
  }, [])

  useEffect(() => {
    if (!filters) {
      return
    }
    if (!hasSelectedQuestion(filters)) {
      setDashboardData(null)
      setDashboardLoading(false)
      return
    }
    loadDashboard(filters)
  }, [filters])

  async function fetchJson<T>(path: string, params?: URLSearchParams): Promise<T> {
    const url = new URL(path, API_BASE_URL)
    if (params) {
      params.forEach((value, key) => url.searchParams.set(key, value))
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`API-Anfrage fehlgeschlagen: ${response.status}`)
    }
    return response.json() as Promise<T>
  }

  async function loadMetadata() {
    try {
      setMetadataLoading(true)
      setError(null)
      const payload = await fetchJson<Metadata>("/api/metadata")
      const defaultQuestion = payload.default_filters.question || payload.questions[0] || ""
      const defaultTopic = findTopicForQuestion(payload, defaultQuestion) ?? ALL_VALUE

      setMetadata(payload)
      setFilters({
        year: payload.default_filters.latest_year
          ? String(payload.default_filters.latest_year)
          : ALL_VALUE,
        location: ALL_VALUE,
        topic: defaultTopic,
        question: defaultQuestion,
        stratification_category: TOTAL_VALUE,
        stratification: TOTAL_VALUE,
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Die Metadaten konnten nicht geladen werden.",
      )
    } finally {
      setMetadataLoading(false)
    }
  }

  async function loadDashboard(nextFilters: Filters) {
    try {
      setDashboardLoading(true)
      setError(null)
      const trendParams = paramsFromFilters(nextFilters, { includeYear: false })
      const yearParams = paramsFromFilters(nextFilters, { includeYear: true })
      const mapParams = paramsFromFilters({ ...nextFilters, location: ALL_VALUE }, { includeYear: true })
      const forecastParams = paramsFromFilters(nextFilters, { includeYear: false })
      const rankingParams = new URLSearchParams(yearParams)
      const stratificationParams = new URLSearchParams(yearParams)
      rankingParams.set("limit", "10")
      stratificationParams.set("limit", "12")

      const [kpi, map, trends, rankings, stratification, forecast] = await Promise.all([
        fetchJson<CurrentKpi>("/api/kpi", yearParams),
        fetchJson<MapPayload>("/api/map", mapParams),
        fetchJson<DashboardData["trends"]>("/api/trends", trendParams),
        fetchJson<DashboardData["rankings"]>("/api/rankings", rankingParams),
        fetchJson<DashboardData["stratification"]>("/api/stratification", stratificationParams),
        fetchJson<ForecastPayload>("/api/forecast", forecastParams),
      ])
      setDashboardData({ kpi, map, trends, rankings, stratification, forecast })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Die Dashboard-Daten konnten nicht geladen werden.",
      )
    } finally {
      setDashboardLoading(false)
    }
  }

  const questionOptions = useMemo(() => {
    if (!metadata || !filters) {
      return []
    }
    if (filters.topic === ALL_VALUE) {
      return metadata.questions
    }
    return metadata.questions_by_topic[filters.topic] ?? []
  }, [filters, metadata])

  const groupOptions = useMemo(() => {
    if (!metadata || !filters || filters.stratification_category === TOTAL_VALUE) {
      return []
    }
    return metadata.stratifications_by_category[filters.stratification_category] ?? []
  }, [filters, metadata])

  const forecastChartData = useMemo(() => {
    if (!dashboardData) {
      return []
    }
    return [
      ...dashboardData.forecast.observed.map((item) => ({
        year: item.year,
        observed: item.value,
        projection: null,
      })),
      ...dashboardData.forecast.projected.map((item) => ({
        year: item.year,
        observed: null,
        projection: item.value,
      })),
    ]
  }, [dashboardData])

  const yearComparison = useMemo(() => {
    if (!dashboardData) {
      return null
    }

    const items = [...dashboardData.trends.items].sort((a, b) => a.year - b.year)
    if (!items.length) {
      return {
        change: null,
        description: "Keine Trenddaten fuer einen Jahresvergleich.",
      }
    }

    const selectedYear =
      filters?.year && filters.year !== ALL_VALUE
        ? Number(filters.year)
        : dashboardData.kpi.year ?? items[items.length - 1]?.year

    if (!Number.isFinite(selectedYear)) {
      return {
        change: null,
        description: "Kein eindeutiges Jahr fuer den Vergleich.",
      }
    }

    const currentItem = items.find((item) => item.year === selectedYear)
    if (!currentItem) {
      return {
        change: null,
        description: `Keine Trenddaten fuer Jahr ${selectedYear}.`,
      }
    }

    const previousItem = [...items].reverse().find((item) => item.year < selectedYear)
    if (!previousItem) {
      return {
        change: null,
        description: `Kein Vorjahr vor ${selectedYear} in den Daten.`,
      }
    }

    return {
      change: Number((currentItem.value - previousItem.value).toFixed(2)),
      description: `Jahr ${selectedYear} gegenueber ${previousItem.year}`,
    }
  }, [dashboardData, filters?.year])

  function updateFilter<Key extends keyof Filters>(key: Key, value: Filters[Key]) {
    setFilters((current) => {
      if (!current || !metadata) {
        return current
      }
      const next = { ...current, [key]: value }

      if (key === "topic") {
        const nextQuestions =
          value === ALL_VALUE ? metadata.questions : metadata.questions_by_topic[value] ?? []
        next.question = nextQuestions.includes(current.question)
          ? current.question
          : nextQuestions[0] ?? ""
      }

      if (key === "question") {
        const topicForQuestion = findTopicForQuestion(metadata, value)
        if (topicForQuestion && current.topic !== ALL_VALUE && topicForQuestion !== current.topic) {
          next.topic = topicForQuestion
        }
      }

      if (key === "stratification_category") {
        next.stratification = value === TOTAL_VALUE ? TOTAL_VALUE : ALL_VALUE
      }

      return next
    })
  }

  const hasQuestion = Boolean(filters && hasSelectedQuestion(filters))
  const selectedQuestion = translateQuestion(filters?.question ?? "")
  const selectedTopic =
    filters?.topic && filters.topic !== ALL_VALUE ? translateTopic(filters.topic) : "Alle Themen"
  const selectedLocationLabel =
    filters?.location && filters.location !== ALL_VALUE ? translateLocation(filters.location) : "USA gesamt"
  const aggregationContext = filters ? buildAggregationContext(filters) : ""
  const kpiSubtitle = dashboardData?.kpi
    ? buildKpiSubtitle(dashboardData.kpi)
    : "Jahr, Region, Gruppe und Berechnung werden nach dem Laden angezeigt."
  const kpiDebugInfo = dashboardData?.kpi
    ? `KPI-Datensaetze: ${formatCount(dashboardData.kpi.record_count)}${
        dashboardData.kpi.location_count ? ` | Regionen: ${formatCount(dashboardData.kpi.location_count)}` : ""
      }`
    : undefined

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 rounded-lg border bg-card px-6 py-6 shadow-soft lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-4xl flex-col gap-3">
            <Badge variant="secondary" className="w-fit">
              Lokales Hochschulprojekt
            </Badge>
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                Dashboard zu Ernaehrung, Bewegung und Adipositas
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Interaktives BI-Dashboard fuer CDC/HHS-Daten zu Ernaehrung, Bewegung
                und Gewichtstatus in den USA.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="icon"
              aria-label={theme === "dark" ? "Hellen Modus aktivieren" : "Dunklen Modus aktivieren"}
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? <Sun data-icon="inline-start" /> : <Moon data-icon="inline-start" />}
            </Button>
            <div className="flex items-center gap-3 rounded-md border bg-background px-4 py-3">
              <Database className="text-primary" />
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Bereinigte Zeilen</span>
                <strong className="text-xl">{metadata ? formatCount(metadata.rows) : "-"}</strong>
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Es ist ein Fehler aufgetreten</AlertTitle>
            <AlertDescription>
              {error} Bitte pruefe, ob das Backend unter {API_BASE_URL} laeuft.
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(300px,340px)_minmax(0,1fr)]">
          <Card className="min-w-0 lg:sticky lg:top-6 lg:w-[340px] lg:max-w-[340px] lg:self-start">
            <CardHeader>
              <CardTitle>Indikator und Filter</CardTitle>
              <CardDescription>
                Die Frage ist der Pflichtindikator. Weitere Filter schraenken die Auswertung ein.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metadataLoading || !metadata || !filters ? (
                <div className="grid gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-10" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  <QuestionCombobox
                    value={filters.question}
                    questions={questionOptions}
                    metadata={metadata}
                    onChange={(value) => updateFilter("question", value)}
                  />
                  <DashboardSelect
                    label="Thema"
                    value={filters.topic}
                    options={[
                      { value: ALL_VALUE, label: "Alle Themen" },
                      ...metadata.topics.map((topic) => ({ value: topic, label: translateTopic(topic) })),
                    ]}
                    onChange={(value) => updateFilter("topic", value)}
                  />
                  <DashboardSelect
                    label="Jahr"
                    value={filters.year}
                    options={[
                      { value: ALL_VALUE, label: "Alle Jahre" },
                      ...metadata.years.map(String).reverse().map((year) => ({ value: year, label: year })),
                    ]}
                    onChange={(value) => updateFilter("year", value)}
                  />
                  <DashboardSelect
                    label="Region / Bundesstaat"
                    value={filters.location}
                    options={[
                      { value: ALL_VALUE, label: "USA gesamt / alle Bundesstaaten" },
                      ...metadata.locations.map((location) => ({
                        value: location,
                        label: translateLocation(location),
                      })),
                    ]}
                    onChange={(value) => updateFilter("location", value)}
                  />
                  <DashboardSelect
                    label="Stratifikation"
                    value={filters.stratification_category}
                    options={[
                      { value: TOTAL_VALUE, label: "Gesamtwert" },
                      ...metadata.stratification_categories
                        .filter((category) => category !== TOTAL_VALUE)
                        .map((category) => ({
                          value: category,
                          label: translateStratificationCategory(category),
                        })),
                    ]}
                    onChange={(value) => updateFilter("stratification_category", value)}
                  />
                  {filters.stratification_category === TOTAL_VALUE ? (
                    <div className="flex min-h-20 flex-col justify-end gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Gruppe</span>
                      <span>Bei Gesamtwert wird keine Gruppe ausgewaehlt.</span>
                    </div>
                  ) : (
                    <DashboardSelect
                      label="Gruppe"
                      value={filters.stratification}
                      options={[
                        { value: ALL_VALUE, label: "Alle Gruppen" },
                        ...groupOptions.map((group) => ({
                          value: group,
                          label: translateStratificationValue(group),
                        })),
                      ]}
                      onChange={(value) => updateFilter("stratification", value)}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex min-w-0 max-w-full flex-col gap-6 overflow-hidden">
            {!hasQuestion ? (
              <QuestionEmptyState />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex flex-col gap-2">
                        <CardTitle>Aktiver Indikator</CardTitle>
                        <CardDescription>{selectedQuestion}</CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{selectedTopic}</Badge>
                        <Badge variant="secondary" className="gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {selectedLocationLabel}
                        </Badge>
                        <Badge variant="outline">{aggregationContext}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <section className="grid gap-5">
                  <UsMapCard
                    payload={dashboardData?.map}
                    currentKpi={dashboardData?.kpi}
                    loading={dashboardLoading || !dashboardData}
                    selectedLocation={filters?.location ?? ALL_VALUE}
                    selectedQuestion={selectedQuestion}
                    onSelect={(location) => updateFilter("location", location)}
                    onReset={() => updateFilter("location", ALL_VALUE)}
                  />

                  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard
                      icon={Activity}
                      title="Aktueller Wert"
                      value={formatValue(dashboardData?.kpi.value)}
                      description={
                        dashboardData?.kpi.message ? translateUiLabel(dashboardData.kpi.message) : kpiSubtitle
                      }
                      info={kpiDebugInfo}
                      loading={dashboardLoading || !dashboardData}
                    />
                    <KpiCard
                      icon={TrendingUp}
                      title="Aenderung zum Vorjahr"
                      value={formatPercentagePointChange(yearComparison?.change)}
                      description={
                        yearComparison?.description ?? "Vergleich nur mit mindestens zwei Jahren moeglich."
                      }
                      loading={dashboardLoading || !dashboardData}
                    />
                    <KpiCard
                      icon={BarChart3}
                      title="Hoechster Bundesstaat"
                      value={dashboardData?.rankings.items[0]?.location ?? "-"}
                      description={formatValue(dashboardData?.rankings.items[0]?.value)}
                      loading={dashboardLoading || !dashboardData}
                    />
                    <KpiCard
                      icon={Users}
                      title="Datensaetze"
                      value={formatCount(dashboardData?.trends.summary.record_count)}
                      description="Nur fuer den gewaehlten Indikator"
                      loading={dashboardLoading || !dashboardData}
                    />
                  </section>
                </section>

                <section className="grid gap-6 xl:grid-cols-5">
              <Card className="xl:col-span-3">
                <CardHeader>
                  <CardTitle>Entwicklung ueber die Jahre</CardTitle>
                  <CardDescription>{aggregationContext}</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {dashboardLoading || !dashboardData ? (
                    <Skeleton className="h-full" />
                  ) : dashboardData.trends.items.length === 0 ? (
                    <ChartEmptyState text="Keine Trenddaten fuer diese Filterauswahl." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboardData.trends.items} margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="year" tick={chartTick} />
                        <YAxis tickFormatter={(value) => `${value}%`} tick={chartTick} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatValue(Number(value))} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name="Durchschnitt"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={3}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>10 hoechste Bundesstaaten</CardTitle>
                  <CardDescription>
                    {dashboardData?.rankings
                      ? `${dashboardData.rankings.available_regions} von ${dashboardData.rankings.total_regions} Regionen mit Daten fuer ${dashboardData.rankings.year ?? filters?.year}.`
                      : "Das Diagramm zeigt nur die 10 hoechsten Werte; die Tabelle darunter zeigt alle verfuegbaren Regionen."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex h-[28rem] flex-col gap-3">
                  {dashboardLoading || !dashboardData ? (
                    <Skeleton className="h-full" />
                  ) : dashboardData.rankings.chart_items.length === 0 ? (
                    <ChartEmptyState text="Keine Bundesstaaten fuer diese Filterauswahl." />
                  ) : (
                    <>
                      <div className="min-h-0 flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={dashboardData.rankings.chart_items}
                            layout="vertical"
                            margin={{ left: 28, right: 16 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" tickFormatter={(value) => `${value}%`} tick={chartTick} />
                            <YAxis
                              dataKey="location"
                              type="category"
                              width={136}
                              interval={0}
                              tick={chartTick}
                            />
                            <Tooltip
                              contentStyle={tooltipStyle}
                              formatter={(value) => formatValue(Number(value))}
                              labelFormatter={(label) => String(label)}
                            />
                            <Bar dataKey="value" name="Wert" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <RankingCoverageNote rankings={dashboardData.rankings} />
                    </>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Vergleich nach Stratifikation</CardTitle>
                  <CardDescription>
                    Gruppenvergleich fuer{" "}
                    {filters?.stratification_category === TOTAL_VALUE
                      ? "Gesamtwert"
                      : translateStratificationCategory(filters?.stratification_category)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {dashboardLoading || !dashboardData ? (
                    <Skeleton className="h-full" />
                  ) : dashboardData.stratification.items.length === 0 ? (
                    <ChartEmptyState text="Keine Gruppendaten fuer diese Filterauswahl." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardData.stratification.items.map((item) => ({
                          ...item,
                          category: translateStratificationCategory(item.category),
                          group: translateStratificationValue(item.group),
                        }))}
                        margin={{ left: 8, right: 16 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="group" interval={0} angle={-20} textAnchor="end" height={72} tick={chartTick} />
                        <YAxis tickFormatter={(value) => `${value}%`} tick={chartTick} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatValue(Number(value))} />
                        <Bar dataKey="value" name="Wert" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-1.5">
                      <CardTitle>Einfache Prognose</CardTitle>
                      <CardDescription>Lineare Projektion fuer den gewaehlten Indikator.</CardDescription>
                    </div>
                    <Badge variant="outline">Projektion</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {dashboardLoading || !dashboardData ? (
                    <Skeleton className="h-80" />
                  ) : forecastChartData.length === 0 ? (
                    <ChartEmptyState text="Keine Projektion fuer diese Filterauswahl." />
                  ) : (
                    <>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={forecastChartData} margin={{ left: 8, right: 16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="year" tick={chartTick} />
                            <YAxis tickFormatter={(value) => `${value}%`} tick={chartTick} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatValue(Number(value))} />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="observed"
                              name="Historisch"
                              stroke="hsl(var(--chart-1))"
                              strokeWidth={3}
                              connectNulls
                            />
                            <Line
                              type="monotone"
                              dataKey="projection"
                              name="Projektion"
                              stroke="hsl(var(--chart-4))"
                              strokeDasharray="6 4"
                              strokeWidth={3}
                              connectNulls
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {translateUiLabel(dashboardData.forecast.method)}{" "}
                        {translateUiLabel(dashboardData.forecast.disclaimer)}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-1.5">
                    <CardTitle>Vollstaendige Rangliste</CardTitle>
                    <CardDescription>
                      {dashboardData?.rankings
                        ? buildRankingCoverageText(dashboardData.rankings)
                        : "Alle verfuegbaren Bundesstaaten/DC fuer den aktiven Indikator."}
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => filters && loadDashboard(filters)}>
                    <RefreshCw data-icon="inline-start" />
                    Aktualisieren
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dashboardLoading || !dashboardData ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-11" />
                    ))}
                  </div>
                ) : dashboardData.rankings.items.length === 0 ? (
                  <ChartEmptyState text="Keine Tabellendaten fuer diese Filterauswahl." />
                ) : (
                  <div className="max-h-[520px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rang</TableHead>
                          <TableHead>Bundesstaat</TableHead>
                          <TableHead>Wert</TableHead>
                          <TableHead>Datensaetze</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardData.rankings.items.map((item) => (
                          <TableRow
                            key={`${item.rank}-${item.location}`}
                            className={cn(filters?.location === item.location && "bg-muted/70")}
                          >
                            <TableCell>{item.rank}</TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span>{item.location}</span>
                                {filters?.location === item.location ? (
                                  <Badge variant="secondary">aktiv</Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>{formatValue(item.value)}</TableCell>
                            <TableCell>{formatCount(item.records)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
        </div>
        </section>
      </div>
    </main>
  )
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light"
  }
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (saved === "dark" || saved === "light") {
    return saved
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function hasSelectedQuestion(filters: Filters) {
  return Boolean(filters.question && filters.question !== ALL_VALUE)
}

function findTopicForQuestion(metadata: Metadata, question: string) {
  return metadata.topics.find((topic) => metadata.questions_by_topic[topic]?.includes(question))
}

function buildAggregationContext(filters: Filters) {
  const parts = [
    filters.location === ALL_VALUE ? "USA gesamt / alle Bundesstaaten" : translateLocation(filters.location),
    filters.year === ALL_VALUE ? "alle Jahre im Trend" : `Jahr ${filters.year}`,
  ]

  if (filters.stratification_category === TOTAL_VALUE) {
    parts.push("Gesamtwert")
  } else if (filters.stratification === ALL_VALUE) {
    parts.push(`aggregiert ueber ${translateStratificationCategory(filters.stratification_category)}`)
  } else {
    parts.push(
      `${translateStratificationCategory(filters.stratification_category)}: ${translateStratificationValue(
        filters.stratification,
      )}`,
    )
  }

  return parts.join(" | ")
}

function buildKpiSubtitle(kpi: CurrentKpi) {
  if (kpi.requires_group) {
    return "Bitte eine konkrete Gruppe waehlen, damit keine Stratifikationen gemischt werden."
  }
  if (kpi.value === null || kpi.value === undefined) {
    return kpi.message ? translateUiLabel(kpi.message) : "Kein KPI-Wert fuer diese Filterauswahl."
  }
  return `Jahr: ${kpi.year ?? "-"} | Region: ${translateLocation(kpi.region) || "-"} | Gruppe: ${
    kpi.group ? translateStratificationLabel(kpi.group) : "-"
  } | Berechnung: ${kpi.calculation ? translateUiLabel(kpi.calculation) : "-"}`
}

function buildRankingCoverageText(rankings: RankingPayload) {
  const base = `${rankings.available_regions} von ${rankings.total_regions} Regionen mit Daten`
  if (!rankings.missing_regions.length) {
    return `${base}.`
  }
  return `${base}. Einige Staaten haben fuer diese Filterkombination keine Daten.`
}

function buildQuestionPreview(question: string) {
  const translated = translateQuestion(question)
  const normalized = translated === question ? question.replace(/^Percent of\s+/i, "") : translated
  return normalized.length > 68 ? `${normalized.slice(0, 68)}...` : normalized
}

function paramsFromFilters(filters: Filters, options: { includeYear: boolean }) {
  const params = new URLSearchParams()
  const add = (key: keyof Filters, apiKey = key) => {
    const value = filters[key]
    if (value && value !== ALL_VALUE) {
      params.set(String(apiKey), value)
    }
  }
  if (options.includeYear) {
    add("year")
  }
  add("location")
  add("topic")
  add("question")
  add("stratification_category")
  add("stratification")
  return params
}

function QuestionCombobox({
  value,
  questions,
  metadata,
  onChange,
}: {
  value: string
  questions: string[]
  metadata: Metadata
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const selectedTopic = findTopicForQuestion(metadata, value) ?? "Frage"
  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return questions
    }

    return questions.filter((question) => {
      const topic = findTopicForQuestion(metadata, question) ?? ""
      const translatedTopic = topic ? translateTopic(topic) : ""
      return `${question} ${translateQuestion(question)} ${topic} ${translatedTopic}`
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [metadata, query, questions])

  return (
    <div ref={containerRef} className="flex min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm font-medium">
      <span>Frage / Pflichtindikator</span>
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full justify-between gap-3 px-3 py-2 text-left font-normal"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        title={translateQuestion(value)}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {value ? buildQuestionPreview(value) : "Bitte zuerst eine Frage auswaehlen"}
        </span>
        <ChevronsUpDown data-icon="inline-end" />
      </Button>

      <p className="truncate text-xs leading-5 text-muted-foreground" title={translateQuestion(value)}>
        Ausgewaehlt: {value ? buildQuestionPreview(value) : "Noch keine Frage"}
      </p>

      {open ? (
        <div className="w-full max-w-full overflow-hidden rounded-md border bg-card text-card-foreground shadow-md">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search data-icon="inline-start" className="text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false)
                }
              }}
              placeholder="Suche nach Adipositas, Bewegung, Obst, Muskeltraining ..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2" role="listbox">
            {filteredQuestions.length === 0 ? (
              <div className="px-3 py-6 text-sm text-muted-foreground">
                Keine passende Frage gefunden.
              </div>
            ) : (
              filteredQuestions.map((question) => {
                const topic = findTopicForQuestion(metadata, question)
                const selected = question === value

                return (
                  <button
                    key={question}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    title={translateQuestion(question)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-muted focus:bg-muted",
                      selected && "bg-muted",
                    )}
                    onClick={() => {
                      onChange(question)
                      setQuery("")
                      setOpen(false)
                    }}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <Badge variant="secondary" className="w-fit">
                        {topic ? translateTopic(topic) : selectedTopic}
                      </Badge>
                      <span className="line-clamp-2 whitespace-normal break-words font-medium leading-5">
                        {buildQuestionPreview(question)}
                      </span>
                    </span>
                    {selected ? <Check className="text-primary" /> : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DashboardSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Auswaehlen",
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
      <span>{label}</span>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled || options.length === 0}>
        <SelectTrigger className="min-w-0">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="block max-w-[calc(var(--radix-select-trigger-width)-3rem)] truncate">
                  {option.label}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  )
}

function KpiCard({
  icon: Icon,
  title,
  value,
  description,
  info,
  loading,
}: {
  icon: LucideIcon
  title: string
  value: string
  description: string
  info?: string
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="text-primary" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="truncate text-2xl font-semibold">{value}</div>
            <p className="text-sm leading-5 text-muted-foreground">{description}</p>
            {info ? (
              <p className="rounded-md bg-muted px-2 py-1 text-xs leading-5 text-muted-foreground">
                {info}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RankingCoverageNote({ rankings }: { rankings: RankingPayload }) {
  const missingText = rankings.missing_regions.length
    ? `Fehlend: ${rankings.missing_regions.slice(0, 4).map(translateLocation).join(", ")}${
        rankings.missing_regions.length > 4 ? " ..." : ""
      }`
    : "Alle erwarteten Regionen haben Daten."
  const excludedText = rankings.excluded_locations.length
    ? `Ausgeschlossen: ${rankings.excluded_locations.map(translateLocation).join(", ")}`
    : "Nationalwerte und Territorien werden nicht als Bundesstaaten gezaehlt."

  return (
    <div className="rounded-md bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
      <span className="font-medium text-foreground">
        {rankings.available_regions} von {rankings.total_regions} Regionen mit Daten.
      </span>{" "}
      Das Diagramm zeigt die {rankings.chart_items.length} hoechsten Werte; die Tabelle zeigt alle verfuegbaren
      Regionen. {missingText} {excludedText}
    </div>
  )
}

function UsMapCard({
  payload,
  currentKpi,
  loading,
  selectedLocation,
  selectedQuestion,
  onSelect,
  onReset,
}: {
  payload?: MapPayload
  currentKpi?: CurrentKpi
  loading: boolean
  selectedLocation: string
  selectedQuestion: string
  onSelect: (location: string) => void
  onReset: () => void
}) {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null)
  const valueByLocation = useMemo(() => {
    return new Map((payload?.items ?? []).map((item) => [item.location, item]))
  }, [payload])

  const activeLocation = selectedLocation !== ALL_VALUE ? selectedLocation : null
  const activeItem = activeLocation ? valueByLocation.get(activeLocation) : undefined
  const hoveredItem = hoveredLocation ? valueByLocation.get(hoveredLocation) : undefined
  const valueMin = payload?.min ?? null
  const valueMax = payload?.max ?? null
  const selectedRank = useMemo(() => {
    if (!activeLocation || !payload?.items.length) {
      return null
    }

    const sortedItems = [...payload.items].sort((left, right) => right.value - left.value)
    const rankIndex = sortedItems.findIndex((item) => item.location === activeLocation)
    return rankIndex >= 0 ? { rank: rankIndex + 1, total: sortedItems.length } : null
  }, [activeLocation, payload])
  const activeRegionValue = activeLocation ? activeItem?.value ?? currentKpi?.value : currentKpi?.value
  const activeRecords = activeLocation ? activeItem?.records ?? currentKpi?.record_count : currentKpi?.record_count
  const activeRankLabel = activeLocation
    ? selectedRank
      ? `${selectedRank.rank} von ${selectedRank.total}`
      : "Nicht in Kartenwerten"
    : "Kein Bundesstaat"

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <CardTitle>Interaktive USA-Karte</CardTitle>
            <CardDescription>
              {payload?.year ? `Jahr ${payload.year}` : "Neuestes Jahr"} | Gruppe:{" "}
              {payload?.group ? translateStratificationLabel(payload.group) : "Gesamtwert"} |{" "}
              {payload?.calculation ? translateUiLabel(payload.calculation) : "Wert je Bundesstaat"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={activeLocation ? "secondary" : "outline"}>
              {activeLocation ? translateLocation(activeLocation) : "USA gesamt"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={!activeLocation}
              aria-label="Kartenauswahl zuruecksetzen"
            >
              <RefreshCw data-icon="inline-start" />
              Zuruecksetzen
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <Skeleton className="aspect-[1.6] w-full" />
        ) : !payload || payload.items.length === 0 ? (
          <ChartEmptyState text={payload?.message ?? "Keine Kartenwerte fuer diese Filterauswahl."} />
        ) : (
          <>
            <div className="relative rounded-md border bg-muted/20 p-2 sm:p-4">
              <svg
                viewBox="0 0 975 610"
                role="img"
                aria-label={`USA-Karte fuer ${selectedQuestion}`}
                className="h-auto w-full"
              >
                {stateFeatures.map((state) => {
                  const name = state.properties.name ?? ""
                  const item = valueByLocation.get(name)
                  const isSelected = activeLocation === name
                  const path = mapPath(state)

                  if (!path) {
                    return null
                  }

                  return (
                    <path
                      key={name}
                      d={path}
                      role="button"
                      tabIndex={0}
                      aria-label={`${translateLocation(name)} auswaehlen, aktueller Wert ${formatValue(item?.value)}`}
                      fill={getStateFill(item?.value, valueMin, valueMax, isSelected)}
                      stroke={isSelected ? "hsl(var(--foreground))" : "hsl(var(--border))"}
                      strokeWidth={isSelected ? 2 : 0.75}
                      strokeLinejoin="round"
                      className="cursor-pointer outline-none transition-colors hover:brightness-95 focus-visible:stroke-ring"
                      onClick={() => onSelect(name)}
                      onMouseEnter={() => setHoveredLocation(name)}
                      onMouseLeave={() => setHoveredLocation(null)}
                      onFocus={() => setHoveredLocation(name)}
                      onBlur={() => setHoveredLocation(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          onSelect(name)
                        }
                      }}
                    >
                      <title>{`${translateLocation(name)}: ${formatValue(item?.value)}`}</title>
                    </path>
                  )
                })}
              </svg>

              <div className="pointer-events-none absolute left-4 top-4 max-w-64 rounded-md border bg-card/95 px-3 py-2 text-sm shadow-soft backdrop-blur">
                {hoveredLocation ? (
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">{translateLocation(hoveredLocation)}</span>
                    <span className="text-muted-foreground">
                      {formatValue(hoveredItem?.value)} | {formatCount(hoveredItem?.records)} Datensaetze
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Mit der Maus ueber einen Bundesstaat fahren oder klicken.</span>
                )}
              </div>
            </div>

            <div className="grid gap-2 rounded-md border bg-background/80 px-3 py-2 text-sm sm:grid-cols-3">
              <MapSummaryItem
                label="Aktive Region"
                value={activeLocation ? translateLocation(activeLocation) : "USA gesamt"}
              />
              <MapSummaryItem
                label="Wert"
                value={formatValue(activeRegionValue)}
                detail={
                  activeRecords !== undefined
                    ? `${formatCount(activeRecords)} Datensaetze`
                    : "Fuer den aktuellen Indikator"
                }
              />
              <MapSummaryItem label="Rang nach Wert" value={activeRankLabel} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MapSummaryItem({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs uppercase tracking-normal text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
      {detail ? <span className="truncate text-xs text-muted-foreground">{detail}</span> : null}
    </div>
  )
}

function getStateFill(
  value: number | null | undefined,
  min: number | null,
  max: number | null,
  selected: boolean,
) {
  if (selected) {
    return "hsl(var(--primary))"
  }
  if (value === null || value === undefined || min === null || max === null) {
    return "hsl(var(--muted))"
  }
  if (max <= min) {
    return "hsl(var(--chart-1))"
  }

  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const lightness = 84 - ratio * 42
  const saturation = 50 + ratio * 12
  return `hsl(176 ${saturation}% ${lightness}%)`
}

function QuestionEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Bitte zuerst eine Frage auswaehlen</EmptyTitle>
        <EmptyDescription>
          Kennzahlen, Entwicklungen, Ranglisten und Prognosen werden erst berechnet, wenn ein konkreter
          Indikator ausgewaehlt ist.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Badge variant="secondary">Frage ist Pflicht</Badge>
      </EmptyContent>
    </Empty>
  )
}

function ChartEmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <Empty className="border-0 bg-transparent shadow-none">
        <EmptyHeader>
          <EmptyTitle>Keine Daten</EmptyTitle>
          <EmptyDescription>{text}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}

export default App
