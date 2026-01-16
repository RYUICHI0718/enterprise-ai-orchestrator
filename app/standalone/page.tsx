"use client";

import { useState } from 'react';
import ChatWindow from "../components/ChatWindow";
import PreChatSurvey from "../components/PreChatSurvey";

export default function StandalonePage() {
    const [surveyComplete, setSurveyComplete] = useState(false);
    const [surveyData, setSurveyData] = useState<{ category: string; name: string } | null>(null);

    const handleSurveyComplete = (data: { category: string; name: string }) => {
        setSurveyData(data);
        setSurveyComplete(true);
    };

    // Generate initial message based on survey data
    const getInitialMessage = () => {
        if (surveyData?.name) {
            return `${surveyData.name}様、お問い合わせありがとうございます。\n「${surveyData.category}」についてのご質問ですね。\nお知りになりたい内容を入力してください。`;
        }
        return `お問い合わせありがとうございます。\n「${surveyData?.category}」についてのご質問ですね。\nお知りになりたい内容を入力してください。`;
    };

    return (
        <div className="min-h-screen bg-[#E8F3F1] flex items-center justify-center p-4">
            <div className="w-full max-w-lg h-[700px] max-h-[90vh] rounded-xl overflow-hidden shadow-xl">
                {!surveyComplete ? (
                    <PreChatSurvey onComplete={handleSurveyComplete} />
                ) : (
                    <ChatWindow
                        mode="conversation"
                        title="チャットサポート"
                        initialMessage={getInitialMessage()}
                        initialOptions={[]}
                    />
                )}
            </div>
        </div>
    );
}
