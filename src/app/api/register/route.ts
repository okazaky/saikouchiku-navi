import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Resendは実行時に初期化（ビルド時のエラーを回避）
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
};

interface RegisterRequest {
  email: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
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
    const body: RegisterRequest = await request.json();

    // バリデーション
    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    // 1. UTAGEに登録（設定されている場合）
    const utageStoreUrl = process.env.UTAGE_WEBHOOK_URL;
    if (utageStoreUrl) {
      try {
        // 診断結果のテキスト要約を生成
        const diagnosisSummary = generateDiagnosisSummary(body.diagnosisResult);

        // UTAGEはform-urlencoded形式でデータを受け付ける
        const formData = new URLSearchParams();
        formData.append("mail", body.email);
        formData.append("rid", ""); // UTAGEの必須フィールド
        formData.append("free1", body.diagnosisResult.industryName); // 業種
        formData.append("free2", diagnosisSummary); // 診断結果

        await fetch(utageStoreUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });
        console.log("UTAGE registration sent:", body.email, "industry:", body.diagnosisResult.industryName);
      } catch (error) {
        console.error("UTAGE registration error:", error);
        // UTAGEへの送信失敗はエラーにしない
      }
    }

    // 2. Resendでメール送信
    const resend = getResend();
    if (resend) {
      const emailHtml = generateEmailHtml(body);

      const { error: resendError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: body.email,
        subject: "【事業再構築ナビ】診断結果レポート",
        html: emailHtml,
      });

      if (resendError) {
        console.error("Resend error:", resendError);
        return NextResponse.json(
          { error: "メール送信に失敗しました" },
          { status: 500 }
        );
      }
    } else {
      console.log("Resend API key not configured, skipping email");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// UTAGE用の診断結果テキスト要約を生成
function generateDiagnosisSummary(diagnosisResult: RegisterRequest["diagnosisResult"]): string {
  const categories = diagnosisResult.recommendedCategories
    .map((cat) => `${cat.name}（採択率${cat.adoptionRate}%）`)
    .join("、");

  const patterns = diagnosisResult.recommendedPatterns
    .map((p) => `${p.toPattern}（採択率${p.adoptionRate}）`)
    .join("、");

  const tips = diagnosisResult.tips.slice(0, 3).join("、");

  return `【おすすめ申請枠】${categories}\n【おすすめ転換パターン】${patterns}\n【採択ポイント】${tips}`;
}

function generateEmailHtml(data: RegisterRequest): string {
  const { diagnosisResult } = data;

  const categoriesHtml = diagnosisResult.recommendedCategories
    .map(
      (cat) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${cat.name}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-weight: bold;">
            ${cat.adoptionRate}%
          </span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${cat.maxAmount}
        </td>
      </tr>
    `
    )
    .join("");

  const patternsHtml = diagnosisResult.recommendedPatterns
    .map(
      (pattern, index) => `
      <div style="margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <h4 style="margin: 0 0 8px 0; color: #1f2937;">
          ${index + 1}. ${pattern.toPattern}
          <span style="font-size: 12px; background: ${
            pattern.adoptionRate === "高"
              ? "#dcfce7"
              : pattern.adoptionRate === "中〜高"
              ? "#fef9c3"
              : "#f3f4f6"
          }; color: ${
        pattern.adoptionRate === "高"
          ? "#166534"
          : pattern.adoptionRate === "中〜高"
          ? "#854d0e"
          : "#4b5563"
      }; padding: 2px 8px; border-radius: 4px; margin-left: 8px;">
            採択率: ${pattern.adoptionRate}
          </span>
        </h4>
        <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
          推奨申請額: ${pattern.recommendedAmount}
        </p>
        <p style="margin: 0; font-size: 14px; color: #4b5563;">
          <strong>ポイント:</strong><br>
          ${pattern.points.map((p) => `・${p}`).join("<br>")}
        </p>
      </div>
    `
    )
    .join("");

  const tipsHtml = diagnosisResult.tips
    .map(
      (tip) => `
      <li style="margin-bottom: 8px; color: #374151;">
        <span style="color: #22c55e;">✓</span> ${tip}
      </li>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px;">事業再構築ナビ</h1>
        <p style="margin: 8px 0 0 0; color: #bfdbfe; font-size: 14px;">診断結果レポート</p>
      </div>

      <!-- Content -->
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

        ${data.contactName ? `<p style="margin: 0 0 24px 0;">${data.contactName} 様</p>` : ""}

        <p style="margin: 0 0 24px 0;">
          この度は事業再構築ナビをご利用いただき、ありがとうございます。<br>
          <strong>${diagnosisResult.industryName}</strong>の事業者様向けの診断結果をお送りします。
        </p>

        <!-- Recommended Categories -->
        <h2 style="color: #1f2937; font-size: 18px; margin: 32px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">
          おすすめの申請枠
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; font-size: 14px;">申請枠</th>
              <th style="padding: 12px; text-align: center; font-size: 14px;">採択率</th>
              <th style="padding: 12px; text-align: right; font-size: 14px;">上限額</th>
            </tr>
          </thead>
          <tbody>
            ${categoriesHtml}
          </tbody>
        </table>

        <!-- Recommended Patterns -->
        <h2 style="color: #1f2937; font-size: 18px; margin: 32px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">
          おすすめの事業転換パターン
        </h2>
        ${patternsHtml}

        <!-- Tips -->
        <h2 style="color: #1f2937; font-size: 18px; margin: 32px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">
          採択率を上げるポイント
        </h2>
        <ul style="padding-left: 20px; margin: 0;">
          ${tipsHtml}
        </ul>

        <!-- CTA -->
        <div style="margin-top: 40px; padding: 24px; background: #eff6ff; border-radius: 12px; text-align: center;">
          <h3 style="margin: 0 0 12px 0; color: #1e40af;">より詳しいご相談をご希望の方へ</h3>
          <p style="margin: 0 0 16px 0; color: #3b82f6; font-size: 14px;">
            認定支援機関による無料相談を承っております
          </p>
          <a href="https://example.com/contact" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            無料相談を申し込む
          </a>
        </div>

      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">
          ※ 本診断結果は参考情報です。実際の申請には認定支援機関への相談をお勧めします。
        </p>
        <p style="margin: 8px 0 0 0;">
          事業再構築ナビ
        </p>
      </div>

    </body>
    </html>
  `;
}
