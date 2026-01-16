"use client";

import React, { useState } from "react";
import { X, ThumbsUp, ThumbsDown, Star } from "lucide-react";

interface EvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        is_helpful: boolean | null;
        rating: number | null;
        feedback_text: string;
    }) => void;
}

export default function EvaluationModal({ isOpen, onClose, onSubmit }: EvaluationModalProps) {
    const [isHelpful, setIsHelpful] = useState<boolean | null>(null);
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [feedback, setFeedback] = useState("");
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit({
            is_helpful: isHelpful,
            rating: rating > 0 ? rating : null,
            feedback_text: feedback
        });
        setSubmitted(true);
        setTimeout(() => {
            onClose();
            // Reset state for next time
            setIsHelpful(null);
            setRating(0);
            setFeedback("");
            setSubmitted(false);
        }, 1500);
    };

    const handleSkip = () => {
        onClose();
        setIsHelpful(null);
        setRating(0);
        setFeedback("");
    };

    if (submitted) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ThumbsUp className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                        ご協力ありがとうございます！
                    </h3>
                    <p className="text-gray-600">
                        ご意見はサービス改善に活用させていただきます。
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">
                        ご利用ありがとうございました
                    </h3>
                    <button
                        onClick={handleSkip}
                        className="text-gray-400 hover:text-gray-600 p-1"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Helpful Question */}
                <div className="mb-6">
                    <p className="text-gray-700 mb-3 font-medium">
                        この回答は役に立ちましたか？
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsHelpful(true)}
                            className={`flex-1 py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${isHelpful === true
                                    ? "border-green-500 bg-green-50 text-green-700"
                                    : "border-gray-200 hover:border-green-300 text-gray-600"
                                }`}
                        >
                            <ThumbsUp size={20} />
                            <span>はい</span>
                        </button>
                        <button
                            onClick={() => setIsHelpful(false)}
                            className={`flex-1 py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${isHelpful === false
                                    ? "border-red-500 bg-red-50 text-red-700"
                                    : "border-gray-200 hover:border-red-300 text-gray-600"
                                }`}
                        >
                            <ThumbsDown size={20} />
                            <span>いいえ</span>
                        </button>
                    </div>
                </div>

                {/* Star Rating */}
                <div className="mb-6">
                    <p className="text-gray-700 mb-3 font-medium">
                        使い勝手はいかがでしたか？（5段階評価）
                    </p>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="p-1 transition-transform hover:scale-110"
                            >
                                <Star
                                    size={32}
                                    className={`transition-colors ${star <= (hoverRating || rating)
                                            ? "text-yellow-400 fill-yellow-400"
                                            : "text-gray-300"
                                        }`}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Feedback Text */}
                <div className="mb-6">
                    <p className="text-gray-700 mb-3 font-medium">
                        ご意見・ご要望（任意）
                    </p>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="改善点やご要望をお聞かせください..."
                        className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00685E]/30 focus:border-[#00685E]"
                        rows={3}
                    />
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSkip}
                        className="flex-1 py-3 px-4 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        スキップ
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-3 px-4 rounded-lg bg-[#00685E] text-white font-medium hover:bg-[#005048] transition-colors"
                    >
                        送信する
                    </button>
                </div>
            </div>
        </div>
    );
}
