"use client";

import React, { useState } from "react";
import { MessageCircle } from "lucide-react";

interface PreChatSurveyProps {
    onComplete: (data: { category: string; name: string }) => void;
    categories?: string[];
}

const DEFAULT_CATEGORIES = [
    "【フラット35】融資について",
    "【フラット35】返済について",
    "【リ・バース60】について",
    "その他のご質問",
];

export default function PreChatSurvey({
    onComplete,
    categories = DEFAULT_CATEGORIES
}: PreChatSurveyProps) {
    const [category, setCategory] = useState("");
    const [name, setName] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (category) {
            onComplete({ category, name });
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#E8F3F1]">
            {/* Header */}
            <header className="bg-[#00685E] text-white px-4 py-3 font-bold flex items-center gap-2 shadow-sm shrink-0">
                <MessageCircle size={20} />
                <span>チャットサポート</span>
            </header>

            {/* Survey Form */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                    <h2 className="text-lg font-bold text-[#00685E] mb-4 text-center">
                        チャットを開始する前に
                    </h2>
                    <p className="text-sm text-gray-600 mb-6 text-center">
                        お問い合わせ内容をお選びください
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Category Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                お問い合わせカテゴリ <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00685E] focus:border-transparent"
                            >
                                <option value="">選択してください</option>
                                {categories.map((cat, idx) => (
                                    <option key={idx} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Name Input (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                お名前（任意）
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例：山田太郎"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00685E] focus:border-transparent"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!category}
                            className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${category
                                    ? "bg-[#00685E] hover:bg-[#004d46]"
                                    : "bg-gray-300 cursor-not-allowed"
                                }`}
                        >
                            チャットを開始
                        </button>
                    </form>

                    <p className="text-xs text-gray-500 mt-4 text-center">
                        ※ 入力いただいた情報はお問い合わせ対応のみに使用します
                    </p>
                </div>
            </div>
        </div>
    );
}
