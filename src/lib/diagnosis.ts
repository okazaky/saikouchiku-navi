import industries from "@/data/industries.json";
import categories from "@/data/categories.json";
import patterns from "@/data/patterns.json";
import type {
  Industry,
  Category,
  Pattern,
  DiagnosisInput,
  DiagnosisResult,
} from "@/types";

export function getIndustries(): Industry[] {
  return industries as Industry[];
}

export function getCategories(): Category[] {
  return categories as Category[];
}

export function getPatterns(): Pattern[] {
  return patterns as Pattern[];
}

export function diagnose(input: DiagnosisInput): DiagnosisResult {
  const allIndustries = getIndustries();
  const allCategories = getCategories();
  const allPatterns = getPatterns();

  // 選択された業種を取得
  const selectedIndustry = allIndustries.find((i) => i.id === input.industryId);
  if (!selectedIndustry) {
    throw new Error("業種が見つかりません");
  }

  // おすすめの申請枠を取得
  const recommendedCategories = allCategories
    .filter((c) => selectedIndustry.recommendedCategories.includes(c.id))
    .sort((a, b) => b.adoptionRate - a.adoptionRate);

  // おすすめの事業転換パターンを取得
  let recommendedPatterns = allPatterns.filter((p) =>
    p.fromIndustry.includes(input.industryId)
  );

  // 保有資産に基づいてパターンをソート・フィルタ
  recommendedPatterns = recommendedPatterns.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // 不動産・遊休資産ありの場合、レンタルスペース・民泊系を優先
    if (input.assets.hasRealEstate) {
      if (
        a.toPattern.includes("レンタル") ||
        a.toPattern.includes("民泊") ||
        a.toPattern.includes("ワーケーション")
      ) {
        scoreA += 2;
      }
      if (
        b.toPattern.includes("レンタル") ||
        b.toPattern.includes("民泊") ||
        b.toPattern.includes("ワーケーション")
      ) {
        scoreB += 2;
      }
    }

    // EC・Web基盤ありの場合、EC系を優先
    if (input.assets.hasEcWeb) {
      if (a.toPattern.includes("EC") || a.toPattern.includes("オンライン")) {
        scoreA += 2;
      }
      if (b.toPattern.includes("EC") || b.toPattern.includes("オンライン")) {
        scoreB += 2;
      }
    }

    // 専門技術・資格ありの場合、技術活用系を優先
    if (input.assets.hasTechnology) {
      if (
        a.toPattern.includes("製造") ||
        a.toPattern.includes("加工") ||
        a.toPattern.includes("環境")
      ) {
        scoreA += 2;
      }
      if (
        b.toPattern.includes("製造") ||
        b.toPattern.includes("加工") ||
        b.toPattern.includes("環境")
      ) {
        scoreB += 2;
      }
    }

    // 採択率でソート
    const rateOrder = { 高: 3, "中〜高": 2, 中: 1, 低: 0 };
    scoreA += rateOrder[a.adoptionRate] || 0;
    scoreB += rateOrder[b.adoptionRate] || 0;

    return scoreB - scoreA;
  });

  // 追加のTips
  const additionalTips: string[] = [];
  if (input.assets.hasRealEstate) {
    additionalTips.push(
      "不動産・遊休資産の活用は採択率が高い傾向にあります"
    );
  }
  if (input.assets.hasEcWeb) {
    additionalTips.push(
      "既存のEC・Web基盤を活用した展開は実現可能性をアピールしやすいです"
    );
  }
  if (input.assets.hasTechnology) {
    additionalTips.push(
      "専門技術・資格を活かした事業転換は差別化ポイントになります"
    );
  }
  additionalTips.push("申請額は1,500〜3,000万円が採択されやすい傾向にあります");
  additionalTips.push("地方銀行を認定支援機関にすると採択率が約56%に上がります");

  return {
    industry: selectedIndustry,
    recommendedCategories,
    recommendedPatterns: recommendedPatterns.slice(0, 5), // 上位5件
    tips: [...selectedIndustry.tips, ...additionalTips],
    risks: selectedIndustry.risks,
  };
}
