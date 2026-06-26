// JSON schemas for OpenAI structured outputs (strict mode: every property is
// required and additionalProperties:false). Nullable fields use ["type","null"].
// These mirror expo/lib/ai/types.ts.

const str = { type: ["string", "null"] as const };
const strArr = { type: "array" as const, items: { type: "string" as const } };
const conf = { type: "string" as const, enum: ["low", "medium", "high"] };

export const vetReportRewriteSchema = {
  name: "vet_report_rewrite",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["vetSummary", "ownerSummary"],
    properties: {
      vetSummary: { type: "string" },
      ownerSummary: { type: "string" },
    },
  },
};

export const recordSummarySchema = {
  name: "record_summary",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "documentDate", "clinic", "veterinarian", "diagnosesOrAssessments", "symptoms",
      "medications", "labValues", "imaging", "procedures", "followUp", "ownerQuestions",
      "redFlags", "summaryForOwner", "summaryForVet", "confidence", "needsReview",
    ],
    properties: {
      documentDate: str,
      clinic: str,
      veterinarian: str,
      diagnosesOrAssessments: strArr,
      symptoms: strArr,
      medications: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "dose", "purpose"],
          properties: { name: { type: "string" }, dose: str, purpose: str },
        },
      },
      labValues: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "value", "unit", "flag"],
          properties: { name: { type: "string" }, value: { type: "string" }, unit: str, flag: str },
        },
      },
      imaging: strArr,
      procedures: strArr,
      followUp: strArr,
      ownerQuestions: strArr,
      redFlags: strArr,
      summaryForOwner: { type: "string" },
      summaryForVet: { type: "string" },
      confidence: conf,
      needsReview: { type: "boolean" },
    },
  },
};

export const coaExtractionSchema = {
  name: "coa_extraction",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "brand", "product", "batchLot", "labName", "testDate", "analytes",
      "sourceUrl", "evidenceLevel", "evidenceStatus", "confidence", "extractionNotes",
    ],
    properties: {
      brand: str,
      product: str,
      batchLot: str,
      labName: str,
      testDate: str,
      analytes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["substance", "category", "resultValue", "unit", "status", "detectionLimit"],
          properties: {
            substance: { type: "string" },
            category: str,
            resultValue: str,
            unit: str,
            status: { type: ["string", "null"], enum: ["pass", "elevated", "fail", "not_detected", "unknown", null] },
            detectionLimit: str,
          },
        },
      },
      sourceUrl: str,
      evidenceLevel: { type: "string", enum: ["product", "brand", "batch", "study", "claim_only"] },
      evidenceStatus: { type: "string", enum: ["needs_review", "brand_claim"] },
      confidence: conf,
      extractionNotes: str,
    },
  },
};

export const labelExtractionSchema = {
  name: "label_extraction",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "brand", "productName", "ingredientsText", "parsedIngredients", "guaranteedAnalysis",
      "aafcoStatement", "feedingStatement", "warnings", "confidence", "needsReview",
    ],
    properties: {
      brand: str,
      productName: str,
      ingredientsText: str,
      parsedIngredients: strArr,
      guaranteedAnalysis: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "value"],
          properties: { name: { type: "string" }, value: { type: "string" } },
        },
      },
      aafcoStatement: str,
      feedingStatement: str,
      warnings: strArr,
      confidence: conf,
      needsReview: { type: "boolean" },
    },
  },
};

export const carePlanSchema = {
  name: "care_plan_draft",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "summary", "trackAtHome", "askYourVet", "gentleOptions", "redFlagsSuppressed", "disclaimer"],
    properties: {
      title: { type: "string" },
      summary: { type: "string" },
      trackAtHome: strArr,
      askYourVet: strArr,
      gentleOptions: strArr,
      redFlagsSuppressed: { type: "boolean" },
      disclaimer: { type: "string" },
    },
  },
};

export const explainSchema = {
  name: "explanation",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["explanation"],
    properties: { explanation: { type: "string" } },
  },
};

export const chatSchema = {
  name: "chat_reply",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["reply", "suggestedVetReport"],
    properties: {
      reply: { type: "string" },
      suggestedVetReport: { type: "boolean" },
    },
  },
};
