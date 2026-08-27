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


export const OPPORTUNITY_OUTCOME_TYPES = [
  "Positive Reply",
  "Negative Reply",
  "Meeting Booked",
  "Qualified Opportunity",
  "Won",
  "Lost",
  "Disqualified"
];


export const DECISION_MAKER_VERIFICATION_STATUSES = [
  "VERIFIED",
  "PARTIAL",
  "UNVERIFIED",
  "UNKNOWN"
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


// =======================
// HELPERS
// =======================

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
      title:
        String(
          item?.title || ""
        )
          .trim()
          .slice(0, 240),

      summary:
        String(
          item?.summary || ""
        )
          .trim()
          .slice(0, 1000),

      sourceName:
        String(
          item?.sourceName || ""
        )
          .trim()
          .slice(0, 160),

      sourceUrl:
        String(
          item?.sourceUrl || ""
        )
          .trim()
          .slice(0, 1000),

      observedAt:
        String(
          item?.observedAt || ""
        )
          .trim()
          .slice(0, 64),

      evidenceLevel:
        [
          "VERIFIED FACT",
          "INFERENCE",
          "UNKNOWN"
        ].includes(
          item?.evidenceLevel
        )
          ? item.evidenceLevel
          : "UNKNOWN"
    }));
}


export function deriveEvidenceQuality(evidence) {
  const items =
    normalizeEvidence(
      evidence
    );

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
// OUTCOME
// =======================

export function normalizeOutcome(outcome) {
  if (!outcome) {
    return null;
  }

  /*
   * Backward compatibility:
   * older string outcomes are accepted
   * only when they match supported types.
   */
  if (
    typeof outcome ===
    "string"
  ) {
    const legacyType =
      String(
        outcome
      ).trim();

    if (
      !OPPORTUNITY_OUTCOME_TYPES.includes(
        legacyType
      )
    ) {
      return null;
    }

    return {
      type:
        legacyType,

      reason:
        "",

      notes:
        "",

      recordedAt:
        "",

      source:
        "LEGACY"
    };
  }

  if (
    typeof outcome !== "object" ||
    Array.isArray(outcome)
  ) {
    return null;
  }

  const type =
    String(
      outcome.type || ""
    ).trim();

  if (
    !OPPORTUNITY_OUTCOME_TYPES.includes(
      type
    )
  ) {
    return null;
  }

  const suppliedRecordedAt =
    String(
      outcome.recordedAt || ""
    ).trim();

  const parsedRecordedAt =
    Date.parse(
      suppliedRecordedAt
    );

  const recordedAt =
    Number.isFinite(
      parsedRecordedAt
    )
      ? new Date(
          parsedRecordedAt
        ).toISOString()
      : new Date()
          .toISOString();

  return {
    type,

    reason:
      String(
        outcome.reason || ""
      )
        .trim()
        .slice(0, 1000),

    notes:
      String(
        outcome.notes || ""
      )
        .trim()
        .slice(0, 3000),

    recordedAt,

    source:
      String(
        outcome.source ||
        "MANUAL"
      )
        .trim()
        .slice(0, 80)
  };
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
    normalizeEvidence(
      evidence
    ).filter(
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
    verified.some(
      (item) => {
        const timestamp =
          Date.parse(
            item.observedAt
          );

        if (
          !Number.isFinite(
            timestamp
          )
        ) {
          return false;
        }

        const age =
          now -
          timestamp;

        return (
          age >= 0 &&
          age <=
            1000 *
            60 *
            60 *
            24 *
            30
        );
      }
    );

  if (hasRecent) {
    return "HIGH";
  }

  return "MEDIUM";
}


// =======================
// DECISION MAKER
// =======================

export function normalizeDecisionMakerVerificationEvidence(
  evidence
) {
  if (
    !evidence ||
    typeof evidence !==
      "object" ||
    Array.isArray(
      evidence
    )
  ) {
    return null;
  }

  const sourceName =
    String(
      evidence.sourceName ||
      ""
    )
      .trim()
      .slice(0, 200);

  const sourceUrl =
    String(
      evidence.sourceUrl ||
      ""
    )
      .trim()
      .slice(0, 1000);

  const notes =
    String(
      evidence.notes ||
      ""
    )
      .trim()
      .slice(0, 2000);

  const suppliedVerifiedAt =
    String(
      evidence.verifiedAt ||
      ""
    ).trim();

  const parsedVerifiedAt =
    Date.parse(
      suppliedVerifiedAt
    );

  const verifiedAt =
    Number.isFinite(
      parsedVerifiedAt
    )
      ? new Date(
          parsedVerifiedAt
        ).toISOString()
      : "";

  if (
    !sourceName &&
    !sourceUrl &&
    !notes &&
    !verifiedAt
  ) {
    return null;
  }

  return {
    sourceName,
    sourceUrl,
    notes,
    verifiedAt
  };
}


function deriveDecisionMakerRoleReason(
  role
) {
  const value =
    String(
      role || ""
    )
      .trim()
      .toLowerCase();

  if (
    value.includes(
      "technical"
    ) ||
    value.includes(
      "engineer"
    ) ||
    value.includes(
      "engineering"
    ) ||
    value.includes(
      "superintendent"
    )
  ) {
    return (
      "The stated role suggests possible involvement in technical evaluation, " +
      "specification review, operational fit, or implementation decisions."
    );
  }

  if (
    value.includes(
      "procurement"
    ) ||
    value.includes(
      "purchasing"
    ) ||
    value.includes(
      "buyer"
    )
  ) {
    return (
      "The stated role suggests possible involvement in supplier evaluation, " +
      "commercial requirements, qualification, or purchasing workflow."
    );
  }

  if (
    value.includes(
      "fleet"
    ) ||
    value.includes(
      "operations"
    ) ||
    value.includes(
      "operation"
    )
  ) {
    return (
      "The stated role suggests possible involvement in fleet requirements, " +
      "operational suitability, deployment, or implementation."
    );
  }

  if (
    value.includes(
      "commercial"
    ) ||
    value.includes(
      "business development"
    )
  ) {
    return (
      "The stated role suggests possible involvement in commercial evaluation, " +
      "business relevance, supplier discussions, or deal progression."
    );
  }

  if (
    value.includes(
      "owner"
    ) ||
    value.includes(
      "chief"
    ) ||
    value.includes(
      "ceo"
    ) ||
    value.includes(
      "director"
    ) ||
    value.includes(
      "general manager"
    )
  ) {
    return (
      "The stated role suggests possible senior influence over priorities, " +
      "evaluation criteria, budget direction, or final approval."
    );
  }

  if (
    !value ||
    value ===
      "unknown"
  ) {
    return (
      "The person's role is not sufficiently known to infer decision relevance."
    );
  }

  return (
    "The stated role may be relevant, but its involvement in this specific buying decision " +
    "has not been independently verified."
  );
}


export function deriveDecisionMakerIntelligence({
  name = "",
  role = "UNKNOWN",
  relevance = 0,
  influence = 0,
  confidence = 0,
  verificationStatus = "",
  verificationEvidence = null
} = {}) {

  const normalizedName =
    String(
      name || ""
    ).trim();

  const normalizedRole =
    String(
      role ||
      "UNKNOWN"
    ).trim() ||
    "UNKNOWN";

  const relevanceScore =
    clampScore(
      relevance
    );

  const influenceScore =
    clampScore(
      influence
    );

  const confidenceScore =
    clampScore(
      confidence
    );

  const normalizedVerificationEvidence =
    normalizeDecisionMakerVerificationEvidence(
      verificationEvidence
    );

  const suppliedVerificationStatus =
    String(
      verificationStatus ||
      ""
    )
      .trim()
      .toUpperCase();

  const hasName =
    Boolean(
      normalizedName
    );

  const hasKnownRole =
    normalizedRole
      .toUpperCase() !==
      "UNKNOWN";

  const hasVerificationSource =
    Boolean(
      normalizedVerificationEvidence
        ?.sourceName ||
      normalizedVerificationEvidence
        ?.sourceUrl
    );

  const hasVerificationTime =
    Boolean(
      normalizedVerificationEvidence
        ?.verifiedAt
    );

  let resolvedVerificationStatus =
    hasName
      ? "UNVERIFIED"
      : "UNKNOWN";


  /*
   * Evidence-first verification rules:
   *
   * VERIFIED requires:
   * - person name
   * - known role
   * - verification source
   * - verification timestamp
   *
   * PARTIAL requires:
   * - person name
   * - at least some recorded verification evidence
   */

  if (
    suppliedVerificationStatus ===
    "UNKNOWN"
  ) {

    resolvedVerificationStatus =
      "UNKNOWN";

  } else if (
    suppliedVerificationStatus ===
    "UNVERIFIED"
  ) {

    resolvedVerificationStatus =
      hasName
        ? "UNVERIFIED"
        : "UNKNOWN";

  } else if (
    suppliedVerificationStatus ===
    "PARTIAL"
  ) {

    resolvedVerificationStatus =
      hasName &&
      (
        hasVerificationSource ||
        hasVerificationTime
      )
        ? "PARTIAL"
        : hasName
          ? "UNVERIFIED"
          : "UNKNOWN";

  } else if (
    suppliedVerificationStatus ===
    "VERIFIED"
  ) {

    if (
      hasName &&
      hasKnownRole &&
      hasVerificationSource &&
      hasVerificationTime
    ) {

      resolvedVerificationStatus =
        "VERIFIED";

    } else if (
      hasName &&
      (
        hasVerificationSource ||
        hasVerificationTime
      )
    ) {

      resolvedVerificationStatus =
        "PARTIAL";

    } else {

      resolvedVerificationStatus =
        hasName
          ? "UNVERIFIED"
          : "UNKNOWN";
    }
  }


  const priorityScore =
    Math.round(
      relevanceScore *
        0.4 +
      influenceScore *
        0.35 +
      confidenceScore *
        0.25
    );


  let contactPriority =
    "LOW";


  if (
    normalizedName &&
    hasKnownRole
  ) {

    if (
      priorityScore >=
      70
    ) {
      contactPriority =
        "HIGH";

    } else if (
      priorityScore >=
      45
    ) {
      contactPriority =
        "MEDIUM";
    }
  }


  /*
   * An unverified identity must not
   * become HIGH-priority outreach.
   */

  if (
    resolvedVerificationStatus ===
      "UNVERIFIED" &&
    contactPriority ===
      "HIGH"
  ) {

    contactPriority =
      "MEDIUM";
  }


  if (
    resolvedVerificationStatus ===
    "UNKNOWN"
  ) {

    contactPriority =
      "LOW";
  }


  const roleReason =
    deriveDecisionMakerRoleReason(
      normalizedRole
    );


  let verificationNote =
    "";


  if (
    resolvedVerificationStatus ===
    "VERIFIED"
  ) {

    verificationNote =
      " Identity and role are backed by recorded verification evidence.";

  } else if (
    resolvedVerificationStatus ===
    "PARTIAL"
  ) {

    verificationNote =
      " Verification evidence exists, but identity or role verification is incomplete.";

  } else if (
    resolvedVerificationStatus ===
    "UNVERIFIED"
  ) {

    verificationNote =
      " Identity and role do not yet have sufficient recorded verification evidence.";

  } else {

    verificationNote =
      " Decision-maker identity is currently unknown.";
  }


  return {
    verificationStatus:
      resolvedVerificationStatus,

    verificationEvidence:
      normalizedVerificationEvidence,

    contactPriority,

    priorityScore,

    whyThisPersonMatters:
      (
        roleReason +
        verificationNote
      )
        .trim()
        .slice(0, 2000),

    source:
      "SYSTEM_RULES"
  };
}


// =======================
// RECOMMENDED ACTION
// =======================

export function deriveRecommendedAction({
  opportunityScore = 0,
  whyNowConfidence = "LOW",
  decisionMakerConfidence = 0,
  decisionMakerVerificationStatus = "UNKNOWN",
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
    normalizeEvidence(
      evidence
    ).filter(
      (item) =>
        item.evidenceLevel ===
        "VERIFIED FACT"
    );


  if (
    !verifiedEvidence.length
  ) {
    return (
      "Verify the buying signal and source evidence before outreach."
    );
  }


  if (
    whyNowConfidence ===
    "LOW"
  ) {
    return (
      "Validate the timing and strengthen the Why Now case before outreach."
    );
  }


  if (
    decisionMakerVerificationStatus ===
      "UNKNOWN" ||
    decisionMakerVerificationStatus ===
      "UNVERIFIED"
  ) {
    return (
      "Verify the decision maker's identity and role before tailored outreach."
    );
  }


  if (
    dmConfidence <
    50
  ) {
    return (
      "Strengthen decision-maker confidence before direct outreach."
    );
  }


  if (
    score >= 75 &&
    whyNowConfidence ===
      "HIGH" &&
    dmConfidence >= 70
  ) {
    return (
      "Prioritize tailored outreach to the verified or partially verified decision maker. " +
      "Reference the verified recent signal and request a short discovery conversation."
    );
  }


  if (
    score >=
    60
  ) {
    return (
      "Review the verified signal with the identified decision maker " +
      "and prepare a targeted discovery message."
    );
  }


  return (
    "Keep this opportunity under review and gather stronger commercial evidence before outreach."
  );
}


// =======================
// SALES ANGLE
// =======================

function deriveRoleFocus(
  decisionMakerRole
) {

  const role =
    String(
      decisionMakerRole ||
      ""
    )
      .trim()
      .toLowerCase();


  if (
    role.includes(
      "technical"
    ) ||
    role.includes(
      "engineer"
    ) ||
    role.includes(
      "engineering"
    ) ||
    role.includes(
      "superintendent"
    )
  ) {
    return (
      "technical fit, operational requirements, integration constraints, " +
      "and implementation timing"
    );
  }


  if (
    role.includes(
      "procurement"
    ) ||
    role.includes(
      "purchasing"
    ) ||
    role.includes(
      "buyer"
    ) ||
    role.includes(
      "commercial"
    )
  ) {
    return (
      "specification fit, supplier qualification, commercial requirements, " +
      "and procurement timing"
    );
  }


  if (
    role.includes(
      "fleet"
    ) ||
    role.includes(
      "operations"
    ) ||
    role.includes(
      "operation"
    )
  ) {
    return (
      "operational fit, fleet requirements, deployment constraints, " +
      "and implementation timing"
    );
  }


  if (
    role.includes(
      "owner"
    ) ||
    role.includes(
      "chief"
    ) ||
    role.includes(
      "ceo"
    ) ||
    role.includes(
      "director"
    ) ||
    role.includes(
      "general manager"
    )
  ) {
    return (
      "business relevance, operational priority, evaluation criteria, " +
      "and decision timing"
    );
  }


  return (
    "current requirements, operational fit, evaluation criteria, " +
    "and decision timing"
  );
}


export function deriveSalesAngle({
  productName = "",
  decisionMakerRole = "UNKNOWN",
  decisionMakerVerificationStatus = "UNKNOWN",
  opportunityScore = 0,
  whyNowConfidence = "LOW",
  evidence = []
} = {}) {

  const product =
    String(
      productName ||
      ""
    ).trim() ||
    "the offering";

  const role =
    String(
      decisionMakerRole ||
      ""
    ).trim() ||
    "the identified decision maker";

  const score =
    clampScore(
      opportunityScore
    );

  const verifiedEvidence =
    normalizeEvidence(
      evidence
    ).filter(
      (item) =>
        item.evidenceLevel ===
        "VERIFIED FACT"
    );

  const roleFocus =
    deriveRoleFocus(
      role
    );


  if (
    !verifiedEvidence.length
  ) {
    return (
      `Do not make a direct sales claim for ${product} yet. ` +
      `Verify the buying signal and current need before commercial outreach.`
    );
  }


  if (
    decisionMakerVerificationStatus ===
      "UNKNOWN" ||
    decisionMakerVerificationStatus ===
      "UNVERIFIED"
  ) {
    return (
      `Use the verified opportunity evidence to guide research for ${product}, ` +
      `but verify the ${role}'s identity and decision relevance before tailoring outreach.`
    );
  }


  if (
    whyNowConfidence ===
    "LOW"
  ) {
    return (
      `Position ${product} around the verified evidence, but treat timing as unconfirmed. ` +
      `With the ${role}, focus on validating ${roleFocus}.`
    );
  }


  if (
    score >= 75 &&
    whyNowConfidence ===
      "HIGH"
  ) {
    return (
      `Position ${product} around the verified recent trigger. ` +
      `For the ${role}, focus on ${roleFocus}. ` +
      `Use the evidence as the reason for the conversation, not as proof of purchase intent.`
    );
  }


  if (
    score >=
    60
  ) {
    return (
      `Use the verified signal to open a discovery conversation about ${product}. ` +
      `With the ${role}, validate ${roleFocus} before making a stronger commercial proposition.`
    );
  }


  return (
    `Use a low-pressure discovery angle for ${product}. ` +
    `Reference only verified evidence and validate ${roleFocus} ` +
    `before treating this as an active buying opportunity.`
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
        (
          [
            key,
            weight
          ]
        ) => [
          key,

          Math.round(
            (
              components[key] *
              weight
            ) /
            100
          )
        ]
      )
    );


  const score =
    Object.values(
      breakdown
    ).reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
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
   * Preserve scoring inputs
   * during PATCH.
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


  const outcome =
    normalizeOutcome(
      input.outcome
    );


  const whyNow =
    String(
      input.whyNow ||
      ""
    )
      .trim()
      .slice(0, 2000);


  const whyNowConfidence =
    deriveWhyNowConfidence(
      evidence,
      whyNow
    );


  const decisionMakerName =
    String(
      input.decisionMaker
        ?.name ||
      ""
    )
      .trim()
      .slice(0, 200);


  const decisionMakerRole =
    String(
      input.decisionMaker
        ?.role ||
      "UNKNOWN"
    )
      .trim()
      .slice(0, 200);


  const decisionMakerRelevance =
    clampScore(
      input.decisionMaker
        ?.relevance
    );


  const decisionMakerInfluence =
    clampScore(
      input.decisionMaker
        ?.influence
    );


  const decisionMakerConfidence =
    scoring.components
      .decisionMakerConfidence;


  const decisionMakerIntelligence =
    deriveDecisionMakerIntelligence({
      name:
        decisionMakerName,

      role:
        decisionMakerRole,

      relevance:
        decisionMakerRelevance,

      influence:
        decisionMakerInfluence,

      confidence:
        decisionMakerConfidence,

      verificationStatus:
        input.decisionMaker
          ?.verificationStatus,

      verificationEvidence:
        input.decisionMaker
          ?.verificationEvidence
    });


  /*
   * Recommended Action:
   * manual values stay manual.
   * SYSTEM_RULES values
   * are recalculated.
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

          decisionMakerConfidence,

          decisionMakerVerificationStatus:
            decisionMakerIntelligence
              .verificationStatus,

          evidence
        });


  const recommendedActionSource =
    isManualRecommendedAction
      ? "MANUAL"
      : "SYSTEM_RULES";


  /*
   * Sales Angle:
   * manual values stay manual.
   * SYSTEM_RULES values
   * are recalculated.
   */

  const suppliedSalesAngle =
    String(
      input.salesAngle ||
      ""
    )
      .trim()
      .slice(0, 2000);


  const isManualSalesAngle =
    Boolean(
      suppliedSalesAngle
    ) &&
    input.salesAngleSource !==
      "SYSTEM_RULES";


  const salesAngle =
    isManualSalesAngle
      ? suppliedSalesAngle
      : deriveSalesAngle({
          productName:
            input.productName,

          decisionMakerRole,

          decisionMakerVerificationStatus:
            decisionMakerIntelligence
              .verificationStatus,

          opportunityScore:
            scoring.score,

          whyNowConfidence,

          evidence
        });


  const salesAngleSource =
    isManualSalesAngle
      ? "MANUAL"
      : "SYSTEM_RULES";


  return {

    companyId:
      String(
        input.companyId ||
        ""
      )
        .trim()
        .slice(0, 160),


    companyName:
      String(
        input.companyName ||
        ""
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
            .filter(
              Boolean
            )
            .slice(
              0,
              50
            )
        : [],


    productId:
      String(
        input.productId ||
        ""
      )
        .trim()
        .slice(0, 160),


    productName:
      String(
        input.productName ||
        ""
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
            .slice(
              0,
              20
            )
            .map(
              (value) =>
                String(
                  value
                ).trim()
            )
            .filter(
              Boolean
            )
        : [],


    signalRecency:
      scoring.components
        .signalRecency,


    decisionMaker: {

      name:
        decisionMakerName,

      role:
        decisionMakerRole,

      relevance:
        decisionMakerRelevance,

      confidence:
        decisionMakerConfidence,

      influence:
        decisionMakerInfluence,

      verificationStatus:
        decisionMakerIntelligence
          .verificationStatus,

      verificationEvidence:
        decisionMakerIntelligence
          .verificationEvidence,

      contactPriority:
        decisionMakerIntelligence
          .contactPriority,

      priorityScore:
        decisionMakerIntelligence
          .priorityScore,

      whyThisPersonMatters:
        decisionMakerIntelligence
          .whyThisPersonMatters,

      intelligenceSource:
        decisionMakerIntelligence
          .source
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


    salesAngle,


    salesAngleSource,


    outreachDraft:
      String(
        input.outreachDraft ||
        ""
      )
        .trim()
        .slice(0, 5000),


    outcome,


    status:
      OPPORTUNITY_STATUSES.includes(
        input.status
      )
        ? input.status
        : "New"
  };
}
