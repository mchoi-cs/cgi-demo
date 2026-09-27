export type StockMonth = {
  month: string;
  opened: number;
  closed: number;
  net: number;
  openStock: number;
  avgDays: number;
  fcr: number;
  score: number;
  inboundCalls: number;
  costToServePerAccount: number;
};

export type RegionRow = {
  region: string;
  estate: "legacy" | "smart";
  accounts: number;
  systems: string;
  smartPenetrationFirst: number;
  smartPenetrationLatest: number;
  estimatedReadFirst: number;
  estimatedReadLatest: number;
  estNoReadComplaintsLast12: number;
  estNoReadPer1000: number;
};

export type PilotMonth = {
  month: string;
  sessions: number;
  containment: number;
  escalation: number;
  abandoned: number;
  repeat7d: number;
  csat: number;
  complaintAfterSession: number;
  impliedComplaints: number;
  complaintsOpenedThatMonth: number;
};

export type SystemNote = {
  id: string;
  name: string;
  purpose: string;
  yearInstalled: number;
  annualRunCost: number;
  notes: string;
};

export type Baseline = {
  sourceFiles: string[];
  stockFlow: StockMonth[];
  totals: {
    opened: number;
    closed: number;
    openBook: number;
    startStock: number;
  };
  latest: {
    month: string;
    openStock: number;
    avgDays: number;
    fcr: number;
    score: number;
    opened: number;
    closed: number;
    inboundCalls: number;
    costToServePerAccount: number;
  };
  recentNet: { last6: number[]; average: number };
  doNothing: {
    avgOpenedLast6: number;
    avgClosedLast6: number;
    netLast6: number;
    fcrMonthlySlope: number;
    daysMonthlySlope: number;
    scoreMonthlySlope: number;
  };
  scoreFit: {
    intercept: number;
    slope: number;
    r2: number;
    fcrForScore4: number;
  };
  littlesLaw: {
    impliedDays: number;
    reportedDays: number;
    closesLastMonth: number;
    daysPerMonth: number;
    calibration: number;
  };
  transferRate: number;
  transferRateLast12: number;
  openCases: {
    total: number;
    billingRelated: number;
    infoOnly: number;
    byCategory: Record<string, number>;
  };
  accountsTotal: number;
  regions: RegionRow[];
  legacy: {
    regions: string[];
    accounts: number;
    smartPenetration: number;
    estimatedReadLatestAvg: number;
    estNoReadPer1000: Record<string, number>;
    excessVsAshfordAnnual: number;
  };
  smartEstate: {
    regions: string[];
    smartPenetrationFirst: number;
    smartPenetrationLatest: number;
  };
  ashford: {
    estNoReadPer1000: number;
    estimatedReadFirst: number;
    estimatedReadLatest: number;
  };
  pilot: {
    months: PilotMonth[];
    impliedComplaintsMonthlyAvg: number;
    actualOpenedDuringPilotAvg: number;
    containmentMonthlySlope: number;
    caveat: string;
  };
  systems: Record<string, SystemNote>;
  unitCosts: {
    complaint: number;
    complaintTransferred: number;
    billCorrection: number;
    meterVisit: number;
    call: number;
    penaltyPerQuarter: number;
    askNorthwindAnnual: number;
    smartMeterInstall: number;
    costToServeFirst: number;
    costToServeLatest: number;
    costToServeRisePerAccount: number;
    costToServeRiseAnnual: number;
  };
  assumptions: {
    label: string;
    apiBuildPeople: number;
    apiBuildMonths: number;
    apiBuildRatePerPersonMonth: number;
    apiBuildCost: number;
    apiRunAnnual: number;
    smartMeterCount: number;
    smartMeterCapex: number;
    smartMeterMonths: number;
    transferTarget: number;
    fcrTarget: number;
  };
};

export type Levers = {
  restartAskNorthwind: boolean;
  readToBillApi: boolean;
  estimationFeedback: boolean;
  smartMeterCatchup: boolean;
  transferStart: number;
  transferTarget: number;
  fcrTarget: number;
  fcrRecoveryScale: number;
  penaltyPerQuarter: number;
  apiBuildCost: number;
  apiRunAnnual: number;
};

export type MonthCash = {
  complaintHandling: number;
  transferPremium: number;
  bot: number;
  apiBuild: number;
  apiRun: number;
  smartMeter: number;
  penalty: number;
  total: number;
};

export type ForecastMonth = {
  month: string;
  index: number;
  arrivals: number;
  closures: number;
  backlog: number;
  days: number;
  fcr: number;
  score: number;
  transferRate: number;
  arrivalReduction: number;
  inBreach: boolean;
  cash: MonthCash;
};

export type PathSummary = {
  month12Backlog: number;
  month12Days: number;
  month12Fcr: number;
  month12Score: number;
  year1Cost: number;
  year1Penalties: number;
  penaltyQuarters: number;
  year1ComplaintHandling: number;
  year1TransferPremium: number;
  year1Bot: number;
  year1Api: number;
  year1Smart: number;
};

export type Comparison = {
  year1Net: number;
  paybackMonths: number | null;
  paybackLabel: string;
  penaltyQuartersAvoided: number;
  avoidedComplaintHandling: number;
  avoidedTransferPremium: number;
  botSavings: number;
};

export type SensitivityCase = {
  id: "halfFcr" | "zeroPenalty";
  label: string;
  month12Score: number;
  year1Net: number;
  paybackMonths: number | null;
  paybackLabel: string;
  penaltyQuarters: number;
};

export type ScenarioResult = {
  levers: Levers;
  months: ForecastMonth[];
  months24: ForecastMonth[] | null;
  chosen: PathSummary;
  doNothing: PathSummary;
  vsDoNothing: Comparison;
  assumptions: string[];
  sensitivity: SensitivityCase[];
};
