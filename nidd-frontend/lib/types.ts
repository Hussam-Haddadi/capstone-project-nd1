export type DetectionMethod = "ml" | "rules" | "ml+rules" | string;

export type PredictResult = {
  is_phishing: boolean;
  label?: string;
  label_ar: string;
  risk_score: number;
  confidence: number | string;
  flags: string[];
  detection_method: DetectionMethod;
};

export type PredictResponse = {
  result?: PredictResult;
} & Partial<PredictResult>;

export type HistoryEntry = {
  id: string;
  message: string;
  risk_score: number;
  is_phishing: boolean;
  label_ar: string;
  detection_method: DetectionMethod;
  timestamp: string;
};

export type StatsPayload = {
  total_scanned?: number;
  scanned?: number;
  phishing_count?: number;
  threats?: number;
  safe_count?: number;
  clear?: number;
  avg_risk?: number;
  average_risk?: number;
  category_distribution?: Record<string, number>;
  phishing_by_category?: Record<string, number>;
};

export type HistoryPayload = {
  items?: HistoryEntry[];
  history?: HistoryEntry[];
  scans?: HistoryEntry[];
};

export type BatchPredictResponse = {
  results?: PredictResult[];
  predictions?: PredictResult[];
  data?: PredictResult[];
};

export type TwilioRelayStatusPayload = {
  relay_active?: boolean;
  model_loaded?: boolean;
  latest_message_id?: string | null;
  twilio?: {
    twilio_configured?: boolean;
    missing_env?: string[];
    public_base_url_set?: boolean;
    sms_number_preview?: string;
    /** Masked E.164 — must be Twilio WhatsApp sender (sandbox), not your SMS number unless WA-enabled */
    whatsapp_from_preview?: string;
    whatsapp_from_same_as_sms?: boolean;
    target_whatsapp_preview?: string;
  };
};

export type TwilioRelayEvent = {
  id: string;
  source_phone: string;
  body: string;
  prediction: string | null;
  confidence: string | null;
  label: string | null;
  flags: string[];
  risk_score: number | null;
  detection_method: string | null;
  status: string;
  twilio_sid: string;
  forwarding_result: string | null;
  forwarding_error: string | null;
  created_at: string;
  updated_at: string;
};
