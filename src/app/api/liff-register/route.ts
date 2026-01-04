import { NextRequest, NextResponse } from "next/server";

interface LiffRegisterRequest {
  lineUserId: string;
  displayName?: string;
  diagnosisResult: {
    industryName: string;
    recommendedCategories: Array<{
      name: string;
      adoptionRate: number;
      maxAmount: string;
    }>;
    recommendedPatterns: Array<{
      toPattern: string;
      adoptionRate: string;
      recommendedAmount: string;
      points: string[];
    }>;
    tips: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: LiffRegisterRequest = await request.json();

    // UTAGEに登録（設定されている場合）
    const utageStoreUrl = process.env.UTAGE_WEBHOOK_URL;
    if (utageStoreUrl) {
      try {
        // 診断結果のテキスト要約を生成
        const diagnosisSummary = generateDiagnosisSummary(body.diagnosisResult);

        // UTAGEはform-urlencoded形式でデータを受け付ける
        const formData = new URLSearchParams();
        formData.append("line_id", body.lineUserId);
        formData.append("rid", ""); // UTAGEの必須フィールド
        formData.append("free1", body.diagnosisResult.industryName); // 業種
        formData.append("free2", diagnosisSummary); // 診断結果
        if (body.displayName) {
          formData.append("name1", body.displayName); // LINE表示名
        }

        await fetch(utageStoreUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });
        console.log(
          "UTAGE LIFF registration sent:",
          body.lineUserId,
          "industry:",
          body.diagnosisResult.industryName
        );
      } catch (error) {
        console.error("UTAGE LIFF registration error:", error);
        // UTAGEへの送信失敗はエラーにしない
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LIFF Register API error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// UTAGE用の診断結果テキスト要約を生成
function generateDiagnosisSummary(
  diagnosisResult: LiffRegisterRequest["diagnosisResult"]
): string {
  const categories = diagnosisResult.recommendedCategories
    .map((cat) => `${cat.name}（採択率${cat.adoptionRate}%）`)
    .join("、");

  const patterns = diagnosisResult.recommendedPatterns
    .map((p) => `${p.toPattern}（採択率${p.adoptionRate}）`)
    .join("、");

  const tips = diagnosisResult.tips.slice(0, 3).join("、");

  return `【おすすめ申請枠】${categories}\n【おすすめ転換パターン】${patterns}\n【採択ポイント】${tips}`;
}
