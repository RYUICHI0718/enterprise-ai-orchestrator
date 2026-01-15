"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, Menu, X, Play } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
    role: "user" | "assistant";
    content: string;
    options?: string[];
    related_questions?: string[];
}

// Initial Menu Options based on JHF Screenshot
const DEFAULT_INITIAL_OPTIONS = [
    "【フラット３５】融資",
    "【フラット３５】返済",
    "【リ・バース６０】融資",
    "【リ・バース６０】返済",
    "【その他】融資（災害・団信など）",
    "【その他】返済（災害・団信など）",
    "【住・My Note】"
];

const DEFAULT_INITIAL_MESSAGE = "お問い合わせありがとうございます。\nお知りになりたい内容を選択してください。\n※ご利用にあたり注意事項をご確認ください。";

interface ChatWindowProps {
    initialMessage?: string;
    initialOptions?: string[];
    mode?: "selection" | "conversation" | "hybrid"; // New mode prop
    title?: string; // Customizable title
}

export default function ChatWindow({
    initialMessage = DEFAULT_INITIAL_MESSAGE,
    initialOptions = DEFAULT_INITIAL_OPTIONS,
    mode = "hybrid",
    title = "チャットボットで質問する"
}: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: initialMessage,
            options: mode !== "conversation" ? initialOptions : [] // Hide initial menu in purely conversation mode if desired, relying on text
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scenario data for Selection Mode (Client-side fast path)
    const MENU_SCENARIO: Record<string, { content: string; options?: string[] }> = {
        // --- Flat 35 ---
        "【フラット３５】融資": {
            content: "フラット３５の融資ついて、質問を承ります。\n以下の質問カテゴリから選択してください。",
            options: ["商品概要について", "金利・融資条件について", "手続きについて", "最初のメニューに戻る"]
        },
        "【フラット３５】返済": {
            content: "フラット３５の返済の内容について、質問を承ります。\n以下の質問カテゴリから選択してください。",
            options: ["住・My Noteについて", "繰上返済について", "返済方法の変更について", "最初のメニューに戻る"]
        },
        "住・My Noteについて": {
            content: "インターネットサービス「住・My Note」に関するよくある質問です。\n\n**Q. 『住･My Note』では、どのようなことができますか？**\n\n**A. 以下の手続きが可能です。**\n・一部繰上返済の申込み\n・融資残高の照会\n・返済予定表の確認\n・住所変更の届出\n\n※ご利用には利用者登録が必要です。",
            options: ["ログイン方法を教えてください", "最初のメニューに戻る"]
        },
        "繰上返済について": {
            content: "「繰上返済について」カテゴリのよくある質問です。\n\n**Q. 繰上返済をおこなうことはできますか？**\n\n**A. はい、可能です。**\n\n【金融機関の窓口で手続きする場合】\n返済の途中で融資金の一部または全部を繰り上げて返済することができます。\nただし、一部繰上返済の場合、繰り上げて返済できる額は100万円以上で、繰上返済日は毎月の口座振替日（引落日）※1となります。\n\n【住・My Noteを利用する場合】\nインターネットサービス「住・My Note」なら、10万円以上から手数料無料で繰上返済が可能です。",
            options: ["最初のメニューに戻る"]
        },

        // --- Reverse 60 ---
        "【リ・バース６０】融資": {
            content: "【リ・バース６０】（60歳からの住宅ローン）についてのご案内です。\n知りたい項目を選択してください。",
            options: ["商品概要・仕組み", "利用条件（年齢・収入）", "資金使途", "最初のメニューに戻る"]
        },
        "商品概要・仕組み": {
            content: "【リ・バース６０】は、満60歳以上の方を対象とした住宅ローンです。\n毎月のお支払いは利息のみで、元金はお客様が亡くなられた時などに、担保物件（住宅・土地）の売却代金等で一括返済していただく仕組みです。",
            options: ["最初のメニューに戻る"]
        },
        "利用条件（年齢・収入）": {
            content: "ご利用いただける方の主な条件は以下の通りです。\n\n・申込時の年齢が満60歳以上の方\n・公的年金等を含め、安定した収入がある方\n\n※具体的な基準は金融機関により異なります。",
            options: ["最初のメニューに戻る"]
        },

        // --- Navigation ---
        "最初のメニューに戻る": {
            content: "お問い合わせありがとうございます。\nお知りになりたい内容を選択してください。",
            options: DEFAULT_INITIAL_OPTIONS
        }
    };

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || loading) return;

        const userText = text;
        setMessages(prev => [...prev, { role: "user", content: userText }]);
        setInput("");

        // 1. Check if this is a Selection Mode action (Client-side)
        if (MENU_SCENARIO[userText]) {
            setLoading(true);
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: MENU_SCENARIO[userText].content,
                    options: MENU_SCENARIO[userText].options
                }]);
                setLoading(false);
            }, 500);
            return;
        }

        // 2. Fallback to Conversation Mode (API)
        setLoading(true);

        try {
            // --- MOCK MODE START ---
            // Force enabled for GitHub Pages deployment
            if (true || process.env.NEXT_PUBLIC_USE_MOCK === "true") {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

                const mockData = {
                    content: `【デモモード】\n\nご質問ありがとうございます。「${userText}」に関する回答です。\n\n※現在はサーバーに接続されていないため、これは自動応答のサンプルです。\n実際のシステムでは、RAG（検索拡張生成）を用いて詳細な回答を生成します。`,
                    options: ["デモ質問1", "デモ質問2", "最初のメニューに戻る"],
                    related_questions: ["リ・バース60とは？", "金利について"]
                };

                // Add empty assistant message for typewriter effect
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: "",
                    options: mockData.options,
                    related_questions: mockData.related_questions
                }]);

                const fullText = mockData.content;
                let currentText = "";

                // Client-side Typewriter Effect
                const typeWriter = async () => {
                    for (let i = 0; i < fullText.length; i++) {
                        currentText += fullText[i];
                        setMessages(prev => {
                            const newArr = [...prev];
                            newArr[newArr.length - 1].content = currentText;
                            return newArr;
                        });
                        await new Promise(resolve => setTimeout(resolve, 30));
                    }
                };
                await typeWriter();
                setLoading(false);
                return;
            }
            // --- MOCK MODE END ---

            const response = await fetch("http://localhost:8000/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, { role: "user", content: userText }]
                }),
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            // Add empty assistant message for typewriter effect
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "",
                options: data.options, // Store options but don't show yet if we want to sync with typing
                related_questions: data.related_questions
            }]);

            const fullText = data.content || "";
            let currentText = "";

            // Client-side Typewriter Effect
            const typeWriter = async () => {
                for (let i = 0; i < fullText.length; i++) {
                    currentText += fullText[i];
                    setMessages(prev => {
                        const newArr = [...prev];
                        newArr[newArr.length - 1].content = currentText;
                        return newArr;
                    });
                    await new Promise(resolve => setTimeout(resolve, 30)); // 30ms delay
                }
            };

            await typeWriter();

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: "assistant", content: "申し訳ありません。エラーが発生しました。" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-[#E8F3F1] border border-gray-200">
            {/* JHF Style Header */}
            <header className="bg-[#00685E] text-white px-4 py-3 font-bold flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    {/*  Icon hidden in header in target image, but we can keep or remove. Image only shows text. */}
                    <span>{title}</span>
                </div>
                <button className="text-white hover:bg-[#004d46] p-1 rounded">
                    <X size={24} />
                </button>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                        {/* Bubble Row */}
                        <div className={`flex gap-3 max-w-[95%] items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            {msg.role === 'assistant' && (
                                <div className="shrink-0">
                                    <div className="w-10 h-10 rounded-full border border-[#00685E] bg-white flex items-center justify-center text-[#00685E]">
                                        {/* Outline Bot Style */}
                                        <Bot size={24} strokeWidth={1.5} />
                                    </div>
                                </div>
                            )}

                            {/* Text Content */}
                            {msg.content && (
                                <div className={`px-5 py-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm relative ${msg.role === 'user'
                                    ? 'bg-[#E8F5E9] text-[#333333] rounded-tr-none' // User bubble
                                    : 'bg-white text-[#333333] rounded-tl-none'     // Bot bubble
                                    }`}>
                                    {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                                </div>
                            )}
                        </div>

                        {/* Options (Assistant only) */}
                        {msg.role === 'assistant' && msg.options && msg.options.length > 0 && (
                            <div className="flex flex-col w-full max-w-[85%] ml-[3.5rem] bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                                {msg.options.map((option, optIdx) => (
                                    <button
                                        key={optIdx}
                                        onClick={() => handleSendMessage(option)}
                                        className="w-full text-left px-4 py-3 text-sm text-[#333333] border-b border-gray-100 hover:bg-gray-50 flex items-center gap-3 transition-colors last:border-0 group"
                                    >
                                        <Play size={10} className="text-[#333333] fill-current group-hover:text-[#00685E]" />
                                        <span className="group-hover:text-[#00685E] font-medium">{option}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Related Questions (Assistant only) */}
                        {msg.role === 'assistant' && msg.related_questions && msg.related_questions.length > 0 && (
                            <div className="flex flex-col w-full max-w-[85%] ml-[3.5rem] mt-2">
                                <span className="text-xs text-gray-500 mb-1 ml-2">関連する質問:</span>
                                {msg.related_questions.map((q, qIdx) => (
                                    <button
                                        key={qIdx}
                                        onClick={() => handleSendMessage(q)}
                                        className="text-left text-xs text-[#00685E] hover:underline bg-white px-3 py-2 rounded-lg mb-1 shadow-sm border border-transparent hover:border-green-100"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading Indicator */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="flex gap-3 max-w-[80%] items-start">
                            <div className="shrink-0">
                                <div className="w-10 h-10 rounded-full border border-[#00685E] bg-white flex items-center justify-center text-[#00685E]">
                                    <Bot size={24} strokeWidth={1.5} />
                                </div>
                            </div>
                            <div className="flex items-center gap-1 p-3 bg-white rounded-xl rounded-tl-none shadow-sm mt-2">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area - Hidden in Selection Mode */}
            {mode !== "selection" && (
                <div className="bg-white p-3 border-t border-gray-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <button className="text-gray-500 hover:text-[#00685E] p-1">
                            <Menu size={24} />
                        </button>
                        <div className="flex-1 relative">
                            <input
                                className="w-full border-none px-2 py-2 text-sm focus:outline-none focus:ring-0 text-[#333333] placeholder:text-gray-400 bg-transparent"
                                placeholder="質問を文章で入力してください。"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                        handleSendMessage(input);
                                    }
                                }}
                            />
                        </div>
                        <button
                            onClick={() => handleSendMessage(input)}
                            disabled={loading || !input.trim()}
                            className={`p-2 rounded-full transition-colors ${loading || !input.trim()
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-[#00685E] hover:bg-green-50'
                                }`}
                        >
                            <Send size={24} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
