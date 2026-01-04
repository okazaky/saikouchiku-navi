"use client";

import { useState } from "react";
import { getIndustries, diagnose } from "@/lib/diagnosis";
import type { DiagnosisInput, DiagnosisResult } from "@/types";

// フロー: input → register → result
type Step = "input" | "register" | "result";

interface RegisterForm {
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
}

export default function Home() {
  const industries = getIndustries();
  const [step, setStep] = useState<Step>("input");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [input, setInput] = useState<DiagnosisInput>({
    industryId: "",
    businessDescription: "",
    assets: {
      hasRealEstate: false,
      hasEcWeb: false,
      hasTechnology: false,
    },
  });
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    email: "",
    companyName: "",
    contactName: "",
    phone: "",
  });

  // 診断実行 → 登録フォームへ（結果はまだ見せない）
  const handleDiagnosis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.industryId) {
      alert("業種を選択してください");
      return;
    }
    const diagnosisResult = diagnose(input);
    setResult(diagnosisResult);
    setStep("register"); // 登録フォームへ
  };

  // 登録完了 → 結果表示
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.email || !registerForm.email.includes("@")) {
      alert("有効なメールアドレスを入力してください");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...registerForm,
          diagnosisResult: {
            industryName: result?.industry.name,
            recommendedCategories: result?.recommendedCategories.map((c) => ({
              name: c.name,
              adoptionRate: c.adoptionRate,
              maxAmount: c.maxAmount,
            })),
            recommendedPatterns: result?.recommendedPatterns.map((p) => ({
              toPattern: p.toPattern,
              adoptionRate: p.adoptionRate,
              recommendedAmount: p.recommendedAmount,
              points: p.points,
            })),
            tips: result?.tips,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "登録に失敗しました");
      }

      setStep("result"); // 結果表示へ
    } catch (error) {
      alert(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep("input");
    setResult(null);
    setInput({
      industryId: "",
      businessDescription: "",
      assets: {
        hasRealEstate: false,
        hasEcWeb: false,
        hasTechnology: false,
      },
    });
    setRegisterForm({
      email: "",
      companyName: "",
      contactName: "",
      phone: "",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-800">事業再構築ナビ</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Step: Input */}
        {step === "input" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                採択率の高い申請パターンを診断
              </h2>
              <p className="text-gray-600">
                あなたの業種と保有資産から、事業再構築補助金で
                <br className="hidden md:block" />
                採択されやすい事業転換の切り口を提案します
              </p>
            </div>

            <form onSubmit={handleDiagnosis} className="space-y-6">
              <div>
                <label
                  htmlFor="industry"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  業種を選択 <span className="text-red-500">*</span>
                </label>
                <select
                  id="industry"
                  value={input.industryId}
                  onChange={(e) =>
                    setInput({ ...input, industryId: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                >
                  <option value="">選択してください</option>
                  {industries.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.name}（採択率: {ind.adoptionRate}%）
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  現在の事業内容（任意）
                </label>
                <textarea
                  id="description"
                  value={input.businessDescription}
                  onChange={(e) =>
                    setInput({ ...input, businessDescription: e.target.value })
                  }
                  placeholder="例: 居酒屋を3店舗経営しています"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  保有資産・強み（該当するものをチェック）
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={input.assets.hasRealEstate}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          assets: {
                            ...input.assets,
                            hasRealEstate: e.target.checked,
                          },
                        })
                      }
                      className="mt-1 w-5 h-5 text-blue-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-800">
                        不動産・遊休資産あり
                      </span>
                      <p className="text-sm text-gray-500">
                        空きスペース、遊休設備、空き家など
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={input.assets.hasEcWeb}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          assets: {
                            ...input.assets,
                            hasEcWeb: e.target.checked,
                          },
                        })
                      }
                      className="mt-1 w-5 h-5 text-blue-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-800">
                        既存のEC・Web基盤あり
                      </span>
                      <p className="text-sm text-gray-500">
                        ECサイト、SNSフォロワー、顧客データベースなど
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={input.assets.hasTechnology}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          assets: {
                            ...input.assets,
                            hasTechnology: e.target.checked,
                          },
                        })
                      }
                      className="mt-1 w-5 h-5 text-blue-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-800">
                        専門技術・資格あり
                      </span>
                      <p className="text-sm text-gray-500">
                        特許、専門資格、独自技術、熟練技能者など
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-lg"
              >
                診断結果を見る
              </button>
            </form>
          </div>
        )}

        {/* Step: Register（診断後、結果を見る前に必須登録） */}
        {step === "register" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                診断が完了しました
              </h2>
              <p className="text-gray-600">
                診断結果を確認するには、メールアドレスをご登録ください。
                <br />
                結果の詳細レポートもメールでお届けします。
              </p>
            </div>

            {/* 診断結果のプレビュー */}
            {result && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-bold text-gray-800">{result.industry.name}</span>
                  の診断結果が準備できました
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    おすすめ申請枠: {result.recommendedCategories.length}件
                  </span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    おすすめ転換パターン: {result.recommendedPatterns.length}件
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, email: e.target.value })
                  }
                  placeholder="example@company.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="companyName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  会社名（任意）
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={registerForm.companyName}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      companyName: e.target.value,
                    })
                  }
                  placeholder="株式会社サンプル"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                />
              </div>

              <div>
                <label
                  htmlFor="contactName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  担当者名（任意）
                </label>
                <input
                  type="text"
                  id="contactName"
                  value={registerForm.contactName}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      contactName: e.target.value,
                    })
                  }
                  placeholder="山田 太郎"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  電話番号（任意）
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={registerForm.phone}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, phone: e.target.value })
                  }
                  placeholder="03-1234-5678"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                />
              </div>

              {/* LINE CTA */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 mb-3">
                  <span className="font-bold">LINE公式アカウントもご登録ください</span>
                  <br />
                  最新の補助金情報や採択のコツをお届けします
                </p>
                <a
                  href="https://line.me/R/ti/p/@example"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  LINE友だち追加
                </a>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg transition-colors text-lg"
              >
                {isSubmitting ? "送信中..." : "登録して診断結果を見る"}
              </button>
            </form>

            <p className="text-xs text-gray-500 mt-4 text-center">
              ご登録いただいた情報は、診断レポートの送信および関連情報のご案内に使用します。
            </p>
          </div>
        )}

        {/* Step: Result（登録後に表示） */}
        {step === "result" && result && (
          <div className="space-y-6">
            {/* 登録完了メッセージ */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-green-800 font-medium">
                登録が完了しました。診断結果の詳細レポートをメールでもお送りしました。
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">診断結果</h2>
                <button
                  onClick={handleReset}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  もう一度診断する
                </button>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <span className="font-bold">{result.industry.name}</span>
                  の事業者様向けの診断結果です
                </p>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  おすすめの申請枠
                </h3>
                <div className="grid gap-4">
                  {result.recommendedCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-gray-800">{cat.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {cat.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block bg-green-100 text-green-800 text-sm font-bold px-3 py-1 rounded-full">
                            採択率 {cat.adoptionRate}%
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            上限: {cat.maxAmount}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                おすすめの事業転換パターン
              </h3>
              <div className="space-y-6">
                {result.recommendedPatterns.map((pattern, index) => (
                  <div
                    key={pattern.id}
                    className="border-l-4 border-blue-500 pl-4"
                  >
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="bg-blue-600 text-white text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      <h4 className="font-bold text-gray-800 text-lg">
                        {pattern.toPattern}
                      </h4>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          pattern.adoptionRate === "高"
                            ? "bg-green-100 text-green-800"
                            : pattern.adoptionRate === "中〜高"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        採択率: {pattern.adoptionRate}
                      </span>
                      <span className="text-xs text-gray-500">
                        難易度: {pattern.difficulty}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      推奨申請額: {pattern.recommendedAmount}
                    </p>

                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        ポイント:
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {pattern.points.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        事例:
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {pattern.cases.map((c, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-blue-500">→</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {pattern.risks.length > 0 && (
                      <div className="bg-yellow-50 rounded p-3">
                        <p className="text-sm font-medium text-yellow-800 mb-1">
                          注意点:
                        </p>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {pattern.risks.map((risk, i) => (
                            <li key={i}>・{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                採択率を上げるポイント
              </h3>
              <ul className="space-y-3">
                {result.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span className="text-gray-700">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {result.risks && result.risks.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  注意すべきリスク
                </h3>
                <ul className="space-y-3">
                  {result.risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-yellow-500 mt-0.5">⚠</span>
                      <span className="text-gray-700">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* LINE CTA */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <h3 className="font-bold text-green-800 text-xl mb-2">
                LINE公式アカウントにもご登録ください
              </h3>
              <p className="text-sm text-green-700 mb-4">
                最新の補助金情報や採択のコツをLINEでお届けします
              </p>
              <a
                href="https://line.me/R/ti/p/@example"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINE友だち追加
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            ※
            本診断結果は参考情報です。実際の申請には認定支援機関への相談をお勧めします。
          </p>
        </div>
      </footer>
    </div>
  );
}
