export const bookmakers = [
  { id: "bk-pinnacle", name: "Pinnacle", country: "Curacao" },
  { id: "bk-bet365", name: "Bet365", country: "United Kingdom" },
  { id: "bk-betano", name: "Betano", country: "Greece" },
  { id: "bk-coolbet", name: "Coolbet", country: "Chile" }
];

export const leagues = [
  { id: "lg-wc-a", name: "World Cup Group A", country: "FIFA", tier: 1 },
  { id: "lg-wc-b", name: "World Cup Group B", country: "FIFA", tier: 1 },
  { id: "lg-wc-c", name: "World Cup Group C", country: "FIFA", tier: 1 },
  { id: "lg-wc-d", name: "World Cup Group D", country: "FIFA", tier: 1 },
  { id: "lg-wc-e", name: "World Cup Group E", country: "FIFA", tier: 1 },
  { id: "lg-wc-f", name: "World Cup Group F", country: "FIFA", tier: 1 },
  { id: "lg-wc-g", name: "World Cup Group G", country: "FIFA", tier: 1 }
];

export const teams = [
  ["Czechia", "Mexico", "South Africa", "Korea Republic"],
  ["Switzerland", "Canada", "Bosnia and Herzegovina", "Qatar"],
  ["Scotland", "Brazil", "Morocco", "Haiti"],
  ["United States", "Turkey", "Paraguay", "Australia"],
  ["Ecuador", "Germany", "Cote d'Ivoire", "Curacao"],
  ["Netherlands", "Japan", "Sweden", "Tunisia"],
  ["Belgium", "Egypt", "Iran", "New Zealand"]
];

export const markets = [
  { id: "mk-1x2", code: "1X2", name: "Match Winner", selections: ["Home", "Draw", "Away"] },
  { id: "mk-ou25", code: "OU25", name: "Over/Under 2.5", selections: ["Over 2.5", "Under 2.5"] },
  { id: "mk-btts", code: "BTTS", name: "Both Teams To Score", selections: ["Yes", "No"] },
  { id: "mk-ah", code: "AH", name: "Asian Handicap", selections: ["Home -0.5", "Away +0.5"] }
];

export const fixtures = [
  ["lg-wc-b", "Switzerland", "Canada", 45, "PRE", null],
  ["lg-wc-c", "Scotland", "Brazil", 120, "PRE", null],
  ["lg-wc-b", "Bosnia and Herzegovina", "Qatar", 165, "PRE", null],
  ["lg-wc-a", "Czechia", "Mexico", 210, "PRE", null],
  ["lg-wc-a", "South Africa", "Korea Republic", 255, "PRE", null],
  ["lg-wc-c", "Morocco", "Haiti", 300, "PRE", null],
  ["lg-wc-e", "Ecuador", "Germany", 1320, "PRE", null],
  ["lg-wc-d", "United States", "Turkey", 1410, "PRE", null],
  ["lg-wc-f", "Netherlands", "Tunisia", 1470, "PRE", null],
  ["lg-wc-f", "Japan", "Sweden", 1530, "PRE", null],
  ["lg-wc-g", "Belgium", "New Zealand", 1590, "PRE", null],
  ["lg-wc-g", "Egypt", "Iran", 1650, "PRE", null]
] as const;
