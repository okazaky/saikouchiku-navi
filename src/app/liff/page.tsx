"use client";

import { useState, useEffect } from "react";
import liff from "@line/liff";
import { getIndustries, diagnose } from "@/lib/diagnosis";
import type { DiagnosisInput, DiagnosisResult } from "@/types";

type Step = "loading" | "input" | "result";

export default function LiffPage() {
  const industries = getIndustries();
  const [step, setStep] = useState<Step>("loading");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [input, setInput] = useState<DiagnosisInput>({
    industryId: "",
    businessDescription: "",
    assets: {
      hasRealEstate: false,
      hasEcWeb: false,
      hasTechnology: false,
    },
  });

  // LIFF初期化
  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || "" });

        // LINE内でない場合はログインを促す
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        setStep("input");
      } catch (error) {
        console.error("LIFF initialization failed", error);
        setLiffError("LINEアプリからアクセスしてください");
      }
    };

    initLiff();
  }, []);

  // 診断実行
  const handleDiagnosis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.industryId) {
      alert("業種を選択してください");
      return;
    }
    const diagnosisResult = diagnose(input);
    setResult(diagnosisResult);
    setStep("result");
  };

  // LINEに結果を送信
  const sendResultToLine = async () => {
    if (!result) return;

    setIsSending(true);

    try {
      // LINEにメッセージを送信
      if (liff.isInClient()) {
        // 結果のテキストを生成
        const categoriesText = result.recommendedCategories
          .slice(0, 3)
          .map((c) => `・${c.name}（採択率${c.adoptionRate}%）`)
          .join("\n");

        const patternsText = result.recommendedPatterns
          .slice(0, 3)
          .map((p) => `・${p.toPattern}（採択率${p.adoptionRate}）`)
          .join("\n");

        const message = `【事業再構築補助金 診断結果】

業種: ${result.industry.name}

▼ おすすめ申請枠
${categoriesText}

▼ おすすめ転換パターン
${patternsText}

▼ 採択率UPのポイント
${result.tips.slice(0, 3).map((t) => `・${t}`).join("\n")}

詳しいご相談は公式LINEでお気軽にどうぞ！`;

        await liff.sendMessages([
          {
            type: "text",
            text: message,
          },
        ]);
      }

      // UTAGEにも登録
      try {
        const profile = await liff.getProfile();
        await fetch("/api/liff-register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lineUserId: profile.userId,
            displayName: profile.displayName,
            diagnosisResult: {
              industryName: result.industry.name,
              recommendedCategories: result.recommendedCategories.map((c) => ({
                name: c.name,
                adoptionRate: c.adoptionRate,
                maxAmount: c.maxAmount,
              })),
              recommendedPatterns: result.recommendedPatterns.map((p) => ({
                toPattern: p.toPattern,
                adoptionRate: p.adoptionRate,
                recommendedAmount: p.recommendedAmount,
                points: p.points,
              })),
              tips: result.tips,
            },
          }),
        });
      } catch (error) {
        console.error("UTAGE registration error:", error);
      }

      // LIFFを閉じる
      if (liff.isInClient()) {
        liff.closeWindow();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("メッセージの送信に失敗しました");
    } finally {
      setIsSending(false);
    }
  };

  // ローディング中
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          {liffError ? (
            <p className="text-red-600">{liffError}</p>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">読み込み中...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-800">事業再構築ナビ</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Step: Input */}
        {step === "input" && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                採択パターン診断
              </h2>
              <p className="text-sm text-gray-600">
                業種を選択して診断結果を受け取りましょう
              </p>
            </div>

            <form onSubmit={handleDiagnosis} className="space-y-5">
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
                  className="w-full px-4 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                >
                  <option value="">選択してください</option>
                  {industries.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  保有資産・強み
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg">
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
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-gray-800">不動産・遊休資産あり</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg">
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
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-gray-800">既存のEC・Web基盤あり</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg">
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
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-gray-800">専門技術・資格あり</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-lg"
              >
                診断する
              </button>
            </form>
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && result && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                診断結果
              </h2>

              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <span className="font-bold">{result.industry.name}</span>
                  の診断結果
                </p>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-3">
                  おすすめ申請枠
                </h3>
                <div className="space-y-2">
                  {result.recommendedCategories.slice(0, 3).map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm text-gray-800 font-medium">
                        {cat.name}
                      </span>
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded font-bold">
                        {cat.adoptionRate}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-3">
                  おすすめ転換パターン
                </h3>
                <div className="space-y-2">
                  {result.recommendedPatterns.slice(0, 3).map((pattern) => (
                    <div
                      key={pattern.id}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-800 font-medium">
                          {pattern.toPattern}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded font-bold ${
                            pattern.adoptionRate === "高"
                              ? "bg-green-100 text-green-800"
                              : pattern.adoptionRate === "中〜高"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          採択率{pattern.adoptionRate}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={sendResultToLine}
                disabled={isSending}
                className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white font-bold rounded-lg transition-colors text-lg"
              >
                {isSending ? "送信中..." : "結果をトークに送信"}
              </button>
            </div>

            <button
              onClick={() => {
                setStep("input");
                setResult(null);
              }}
              className="w-full py-3 text-gray-600 font-medium"
            >
              もう一度診断する
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
