export interface Industry {
  id: string;
  name: string;
  adoptionRate: number;
  recommendedCategories: string[];
  tips: string[];
  risks: string[];
}

export interface Category {
  id: string;
  name: string;
  adoptionRate: number;
  description: string;
  maxAmount: string;
  requirements: string[];
}

export interface Pattern {
  id: string;
  fromIndustry: string[];
  toPattern: string;
  difficulty: "低" | "中" | "高";
  adoptionRate: "低" | "中" | "中〜高" | "高";
  recommendedAmount: string;
  points: string[];
  risks: string[];
  cases: string[];
}

export interface DiagnosisInput {
  industryId: string;
  businessDescription?: string;
  assets: {
    hasRealEstate: boolean;
    hasEcWeb: boolean;
    hasTechnology: boolean;
  };
}

export interface DiagnosisResult {
  industry: Industry;
  recommendedCategories: Category[];
  recommendedPatterns: Pattern[];
  tips: string[];
  risks: string[];
}
