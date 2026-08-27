export const OPPORTUNITY_STATUSES = [
  "New",
  "Reviewed",
  "Qualified",
  "Outreach Ready",
  "Contacted",
  "Replied",
  "Meeting",
  "Opportunity",
  "Won",
  "Lost",
  "Disqualified"
];

export const SCORE_WEIGHTS = Object.freeze({
  companyFit: 15,
  productFit: 15,
  fleetFit: 10,
  buyingSignalStrength: 15,
  signalRecency: 10,
  decisionMakerConfidence: 10,
  evidenceQuality: 10,
  commercialRelevance: 10,
  timingUrgency: 5
});

function clampScore(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, number)
  );
}


// =======================
// EVIDENCE
// =======================

export function normalizeEvidence(evidence) {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence
    .slice(0, 20)
    .map((item) => ({
      title: String(
        item?.title || ""
      )
        .trim()
        .slice(0, 240),

      summary: String(
        item?.summary || ""
      )
        .trim()
        .slice(0, 1000),

      sourceName: String(
        item?.sourceName || ""
      )
        .trim()
        .slice(0, 160),

      sourceUrl: String(
        item?.sourceUrl || ""
      )
        .trim()
        .slice(0, 1000),

      observedAt: String(
        item?.observedAt || ""
      )
        .trim()
        .slice(0, 64),

      evidenceLevel: [
        "VERIFIED FACT",
        "INFERENCE",
        "UNKNOWN"
      ].includes(item?.evidenceLevel)
        ? item.evidenceLevel
        : "UNKNOWN"
    }));
}


export function deriveEvidenceQuality(evidence) {
  const items =
    normalizeEvidence(evidence);

  if (!items.length) {
    return 0;
  }

  const verified =
    items.filter(
      (item) =>
        item.evidenceLevel ===
        "VERIFIED FACT"
    ).length;

  const inference =
    items.filter(
      (item) =>
        item.evidenceLevel ===
        "INFERENCE"
    ).length;

  if (verified >= 3) {
    return 100;
  }

  if (verified === 2) {
    return 85;
  }

  if (verified === 1) {
    return inference > 0
      ? 65
      : 60;
  }

  if (inference > 0) {
    return 30;
  }

  return 0;
}


// =======================
// WHY NOW
// =======================

export function deriveWhyNowConfidence(
  evidence,
  whyNowSummary
) {
  const summary =
    String(
      whyNowSummary || ""
    ).trim();

  if (!summary) {
    return "LOW";
  }

  const verified =
    normalizeEvidence(evidence)
      .filter(
        (item) =>
          item.evidenceLevel ===
          "VERIFIED FACT"
      );

  if (!verified.length) {
    return "LOW";
  }

  const now =
    Date.now();

  const hasRecent =
    verified.some((item) => {
      const timestamp =
        Date.parse(
          item.observedAt
        );

      if (
        !Number.isFinite(timestamp)
      ) {
        return false;
      }

      const age =
        now - timestamp;

      return (
        age >= 0 &&
        age <=
          1000 *
          60 *
          60 *
          24 *
          30
      );
    });

  if (hasRecent) {
    return "HIGH";
  }

  return "MEDIUM";
}


// =======================
// RECOMMENDED ACTION
// =======================

export function deriveRecommendedAction({
  opportunityScore = 0,
  whyNowConfidence = "LOW",
  decisionMakerConfidence = 0,
  evidence = []
} = {}) {
  const score =
    clampScore(
      opportunityScore
    );

  const dmConfidence =
    clampScore(
      decisionMakerConfidence
    );

  const verifiedEvidence =
    normalizeEvidence(evidence)
      .filter(
        (item) =>
          item.evidenceLevel ===
          "VERIFIED FACT"
      );

  if (!verifiedEvidence.length) {
    return (
      "Verify the buying signal and source evidence before outreach."
    );
  }

  if (
    whyNowConfidence === "LOW"
  ) {
    return (
      "Validate the timing and strengthen the Why Now case before outreach."
    );
  }

  if (
    dmConfidence < 50
  ) {
    return (
      "Identify and verify the relevant decision maker before outreach."
    );
  }

  if (
    score >= 75 &&
    whyNowConfidence === "HIGH" &&
    dmConfidence >= 70
  ) {
    return (
      "Prioritize tailored outreach to the identified decision maker. " +
      "Reference the verified recent signal and request a short discovery conversation."
    );
  }

  if (score >= 60) {
    return (
      "Review the verified signal with the identified decision maker " +
      "and prepare a targeted outreach message."
    );
  }

  return (
    "Keep this opportunity under review and gather stronger commercial evidence before outreach."
  );
}


// =======================
// OPPORTUNITY SCORE
// =======================

export function calculateOpportunityScore(
  input = {}
) {
  const evidence =
    normalizeEvidence(
      input.evidence
    );

  const evidenceQuality =
    deriveEvidenceQuality(
      evidence
    );

  const components = {
    companyFit:
      clampScore(
        input.companyFit
      ),

    productFit:
      clampScore(
        input.productFit
      ),

    fleetFit:
      clampScore(
        input.fleetFit
      ),

    buyingSignalStrength:
      clampScore(
        input.buyingSignalStrength
      ),

    signalRecency:
      clampScore(
        input.signalRecency
      ),

    decisionMakerConfidence:
      clampScore(
        input.decisionMakerConfidence
      ),

    evidenceQuality,

    commercialRelevance:
      clampScore(
        input.commercialRelevance
      ),

    timingUrgency:
      clampScore(
        input.timingUrgency
      )
  };

  const breakdown =
    Object.fromEntries(
      Object.entries(
        SCORE_WEIGHTS
      ).map(
        ([key, weight]) => [
          key,
          Math.round(
            (
              components[key] *
              weight
            ) / 100
          )
        ]
      )
    );

  const score =
    Object.values(
      breakdown
    ).reduce(
      (sum, value) =>
        sum + value,
      0
    );

  return {
    score,
    breakdown,
    components,
    evidenceQuality
  };
}


// =======================
// NORMALIZE OPPORTUNITY
// =======================

export function normalizeOpportunityPayload(
  input = {}
) {
  const evidence =
    normalizeEvidence(
      input.evidence
    );

  /*
   * Important:
   * These fallback mappings preserve scoring inputs
   * when an existing Opportunity is PATCHed.
   *
   * Without these fallbacks, changing only Status
   * could accidentally reset parts of the Score.
   */
  const scoring =
    calculateOpportunityScore({
      ...input,

      companyFit:
        input.companyFit ??
        input.segmentFit ??
        input.scoringComponents
          ?.companyFit ??
        0,

      productFit:
        input.productFit ??
        input.scoringComponents
          ?.productFit ??
        0,

      fleetFit:
        input.fleetFit ??
        input.scoringComponents
          ?.fleetFit ??
        0,

      buyingSignalStrength:
        input.buyingSignalStrength ??
        input.scoringComponents
          ?.buyingSignalStrength ??
        0,

      signalRecency:
        input.signalRecency ??
        input.scoringComponents
          ?.signalRecency ??
        0,

      decisionMakerConfidence:
        input.decisionMakerConfidence ??
        input.decisionMaker
          ?.confidence ??
        input.scoringComponents
          ?.decisionMakerConfidence ??
        0,

      commercialRelevance:
        input.commercialRelevance ??
        input.scoringComponents
          ?.commercialRelevance ??
        0,

      timingUrgency:
        input.timingUrgency ??
        input.scoringComponents
          ?.timingUrgency ??
        0,

      evidence
    });

  const whyNow =
    String(
      input.whyNow || ""
    )
      .trim()
      .slice(0, 2000);

  const whyNowConfidence =
    deriveWhyNowConfidence(
      evidence,
      whyNow
    );

  /*
   * Recommended Action rules:
   *
   * - A manually entered recommendation is preserved.
   * - A SYSTEM_RULES recommendation is recalculated
   *   whenever the Opportunity changes.
   * - Empty recommendations are generated automatically.
   */
  const suppliedRecommendedAction =
    String(
      input.recommendedAction ||
      ""
    )
      .trim()
      .slice(0, 2000);

  const isManualRecommendedAction =
    Boolean(
      suppliedRecommendedAction
    ) &&
    input.recommendedActionSource !==
      "SYSTEM_RULES";

  const recommendedAction =
    isManualRecommendedAction
      ? suppliedRecommendedAction
      : deriveRecommendedAction({
          opportunityScore:
            scoring.score,

          whyNowConfidence,

          decisionMakerConfidence:
            scoring.components
              .decisionMakerConfidence,

          evidence
        });

  const recommendedActionSource =
    isManualRecommendedAction
      ? "MANUAL"
      : "SYSTEM_RULES";

  return {
    companyId:
      String(
        input.companyId || ""
      )
        .trim()
        .slice(0, 160),

    companyName:
      String(
        input.companyName || ""
      )
        .trim()
        .slice(0, 240),

    vesselIds:
      Array.isArray(
        input.vesselIds
      )
        ? input.vesselIds
            .map(
              (value) =>
                String(
                  value
                ).trim()
            )
            .filter(Boolean)
            .slice(0, 50)
        : [],

    productId:
      String(
        input.productId || ""
      )
        .trim()
        .slice(0, 160),

    productName:
      String(
        input.productName || ""
      )
        .trim()
        .slice(0, 240),

    productFit:
      scoring.components
        .productFit,

    segmentFit:
      scoring.components
        .companyFit,

    fleetFit:
      scoring.components
        .fleetFit,

    buyingSignals:
      Array.isArray(
        input.buyingSignals
      )
        ? input.buyingSignals
            .slice(0, 20)
            .map(
              (value) =>
                String(
                  value
                ).trim()
            )
            .filter(Boolean)
        : [],

    signalRecency:
      scoring.components
        .signalRecency,

    decisionMaker: {
      name:
        String(
          input.decisionMaker
            ?.name || ""
        )
          .trim()
          .slice(0, 200),

      role:
        String(
          input.decisionMaker
            ?.role ||
          "UNKNOWN"
        )
          .trim()
          .slice(0, 200),

      relevance:
        clampScore(
          input.decisionMaker
            ?.relevance
        ),

      confidence:
        scoring.components
          .decisionMakerConfidence,

      influence:
        clampScore(
          input.decisionMaker
            ?.influence
        )
    },

    whyNow,

    whyNowConfidence,

    evidence,

    opportunityScore:
      scoring.score,

    scoreBreakdown:
      scoring.breakdown,

    scoringComponents:
      scoring.components,

    commercialRelevance:
      scoring.components
        .commercialRelevance,

    timingUrgency:
      scoring.components
        .timingUrgency,

    recommendedAction,

    recommendedActionSource,

    salesAngle:
      String(
        input.salesAngle || ""
      )
        .trim()
        .slice(0, 2000),

    outreachDraft:
      String(
        input.outreachDraft || ""
      )
        .trim()
        .slice(0, 5000),

    status:
      OPPORTUNITY_STATUSES.includes(
        input.status
      )
        ? input.status
        : "New"
  };
}
