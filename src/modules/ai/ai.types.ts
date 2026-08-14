export interface AiAssistantInput {
  message: string;
  context?: {
    currentDate?: string;
    expenses?: any[];
    goals?: any[];
    categoryLimits?: Record<string, number>;
    income?: number;
  };
}

export interface AiAssistantResult {
  success: boolean;
  data?: {
    intent: string;
    amount?: number;
    currency?: string;
    category?: string;
    categoryName?: string;
    date?: string;
    note?: string;
    confidence?: number;
    explanation?: string;
    reply?: string;
  };
  fallbackToRule?: boolean;
  reason?: string;
}
