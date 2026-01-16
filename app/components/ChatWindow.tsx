"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, Menu, X, Play, Paperclip, Download, Phone, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import EvaluationModal from "./EvaluationModal";

interface Attachment {
    name: string;
    type: string;
    url: string;
}

interface Message {
    role: "user" | "assistant";
    content: string;
    options?: string[];
    related_questions?: string[];
    attachments?: Attachment[];
    timestamp?: string;
}

// Initial Menu Options based on JHF Screenshot
const DEFAULT_INITIAL_OPTIONS = [
    "【フラット３５】融資",
    "【フラット３５】返済",
    "【リ・バース６０】融資",
    "【リ・バース６０】返済",
    "【その他】融資（災害・団信など）",
    "【その他】返済（災害・団信など）",
    "【住・My Note】",
    "オペレーターに接続"
];

const DEFAULT_INITIAL_MESSAGE = "お問い合わせありがとうございます。\nお知りになりたい内容を選択してください。\n※ご利用にあたり注意事項をご確認ください。";

// Format current time
const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
};

interface ChatWindowProps {
    initialMessage?: string;
    initialOptions?: string[];
    mode?: "selection" | "conversation" | "hybrid";
    title?: string;
    // D365 Feature toggles
    enableAttachment?: boolean;
    enableDownload?: boolean;
    enableEscalation?: boolean;
    showTimestamp?: boolean;
}

export default function ChatWindow({
    initialMessage = DEFAULT_INITIAL_MESSAGE,
    initialOptions = DEFAULT_INITIAL_OPTIONS,
    mode = "hybrid",
    title = "チャットボットで質問する",
    enableAttachment = true,
    enableDownload = true,
    enableEscalation = true,
    showTimestamp = true
}: ChatWindowProps) {
    // Filter options based on enableEscalation
    const filteredOptions = enableEscalation
        ? initialOptions
        : initialOptions.filter(opt => opt !== "オペレーターに接続");

    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: initialMessage,
            options: mode !== "conversation" ? filteredOptions : [],
            timestamp: showTimestamp ? formatTime() : undefined
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Attachment state
    const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);

    // Escalation state
    const [isEscalating, setIsEscalating] = useState(false);
    const [waitTime, setWaitTime] = useState(0);

    // Evaluation modal state
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Create session on mount
    useEffect(() => {
        const createSession = async () => {
            try {
                const response = await fetch("http://localhost:8000/api/sessions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ source: "web" })
                });
                if (response.ok) {
                    const data = await response.json();
                    setSessionId(data.id);
                }
            } catch (e) {
                console.log("Session creation skipped (backend unavailable)");
            }
        };
        createSession();
    }, []);

    // Escalation timer
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isEscalating && waitTime > 0) {
            timer = setInterval(() => {
                setWaitTime(prev => {
                    if (prev <= 1) {
                        setIsEscalating(false);
                        // Simulate agent connection
                        setMessages(prev => [...prev, {
                            role: "assistant",
                            content: "オペレーターに接続されました。\n担当：田中（お客様サポート）\n\nお待たせいたしました。本日はどのようなご用件でしょうか？",
                            timestamp: formatTime()
                        }]);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isEscalating, waitTime]);

    const handleCloseClick = () => {
        setShowEvalModal(true);
    };

    const handleEvaluationSubmit = async (data: {
        is_helpful: boolean | null;
        rating: number | null;
        feedback_text: string;
    }) => {
        if (sessionId) {
            try {
                await fetch("http://localhost:8000/api/evaluations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        session_id: sessionId,
                        ...data
                    })
                });
            } catch (e) {
                console.log("Evaluation save skipped (backend unavailable)");
            }
        }
    };

    // ★ NEW: Download transcript function
    const downloadTranscript = () => {
        const transcript = messages.map(msg => {
            const role = msg.role === "user" ? "お客様" : "チャットボット";
            const time = msg.timestamp || "";
            let text = `[${time}] ${role}:\n${msg.content}`;
            if (msg.attachments && msg.attachments.length > 0) {
                text += `\n添付ファイル: ${msg.attachments.map(a => a.name).join(", ")}`;
            }
            return text;
        }).join("\n\n---\n\n");

        const header = `会話履歴\nダウンロード日時: ${new Date().toLocaleString('ja-JP')}\n\n${"=".repeat(50)}\n\n`;
        const content = header + transcript;

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat_transcript_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ★ NEW: Handle file attachment
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            // Validate file type and size
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
            const maxSize = 5 * 1024 * 1024; // 5MB

            if (!validTypes.includes(file.type)) {
                alert("対応していないファイル形式です。\n画像（JPEG, PNG, GIF）またはPDFをアップロードしてください。");
                return;
            }

            if (file.size > maxSize) {
                alert("ファイルサイズが大きすぎます。\n5MB以下のファイルをアップロードしてください。");
                return;
            }

            const url = URL.createObjectURL(file);
            setPendingAttachments(prev => [...prev, {
                name: file.name,
                type: file.type,
                url
            }]);
        });

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeAttachment = (index: number) => {
        setPendingAttachments(prev => {
            const newAttachments = [...prev];
            URL.revokeObjectURL(newAttachments[index].url);
            newAttachments.splice(index, 1);
            return newAttachments;
        });
    };

    // Scenario data for Selection Mode
    const MENU_SCENARIO: Record<string, { content: string; options?: string[] }> = {
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
        "最初のメニューに戻る": {
            content: "お問い合わせありがとうございます。\nお知りになりたい内容を選択してください。",
            options: DEFAULT_INITIAL_OPTIONS
        },
        // ★ NEW: Escalation option
        "オペレーターに接続": {
            content: "オペレーターへの接続をリクエストしました。\n少々お待ちください...",
            options: []
        }
    };

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const handleSendMessage = async (text: string) => {
        if ((!text.trim() && pendingAttachments.length === 0) || loading) return;

        const userText = text;
        const attachments = [...pendingAttachments];

        setMessages(prev => [...prev, {
            role: "user",
            content: userText,
            attachments: attachments.length > 0 ? attachments : undefined,
            timestamp: formatTime()
        }]);
        setInput("");
        setPendingAttachments([]);

        // ★ Handle escalation
        if (userText === "オペレーターに接続") {
            setLoading(true);
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: "オペレーターへの接続をリクエストしました。\n現在の待ち人数: 2名\n予想待ち時間: 約30秒",
                    timestamp: formatTime()
                }]);
                setIsEscalating(true);
                setWaitTime(30);
                setLoading(false);
            }, 500);
            return;
        }

        // Check if this is a Selection Mode action
        if (MENU_SCENARIO[userText]) {
            setLoading(true);
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: MENU_SCENARIO[userText].content,
                    options: MENU_SCENARIO[userText].options,
                    timestamp: formatTime()
                }]);
                setLoading(false);
            }, 500);
            return;
        }

        // Fallback to Conversation Mode (API)
        setLoading(true);

        try {
            // Mock mode for demo
            if (true || process.env.NEXT_PUBLIC_USE_MOCK === "true") {
                await new Promise(resolve => setTimeout(resolve, 1000));

                let responseText = `【デモモード】\n\nご質問ありがとうございます。「${userText}」に関する回答です。\n\n※現在はサーバーに接続されていないため、これは自動応答のサンプルです。\n実際のシステムでは、RAG（検索拡張生成）を用いて詳細な回答を生成します。`;

                if (attachments.length > 0) {
                    responseText += `\n\n添付ファイル（${attachments.length}件）を受け取りました。`;
                }

                const mockData = {
                    content: responseText,
                    options: ["デモ質問1", "デモ質問2", "オペレーターに接続", "最初のメニューに戻る"],
                    related_questions: ["リ・バース60とは？", "金利について"]
                };

                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: "",
                    options: mockData.options,
                    related_questions: mockData.related_questions,
                    timestamp: formatTime()
                }]);

                const fullText = mockData.content;
                let currentText = "";

                for (let i = 0; i < fullText.length; i++) {
                    currentText += fullText[i];
                    setMessages(prev => {
                        const newArr = [...prev];
                        newArr[newArr.length - 1].content = currentText;
                        return newArr;
                    });
                    await new Promise(resolve => setTimeout(resolve, 30));
                }
                setLoading(false);
                return;
            }

            const response = await fetch("http://localhost:8000/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, { role: "user", content: userText }]
                }),
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setMessages(prev => [...prev, {
                role: "assistant",
                content: "",
                options: data.options,
                related_questions: data.related_questions,
                timestamp: formatTime()
            }]);

            const fullText = data.content || "";
            let currentText = "";

            for (let i = 0; i < fullText.length; i++) {
                currentText += fullText[i];
                setMessages(prev => {
                    const newArr = [...prev];
                    newArr[newArr.length - 1].content = currentText;
                    return newArr;
                });
                await new Promise(resolve => setTimeout(resolve, 30));
            }

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "申し訳ありません。エラーが発生しました。",
                timestamp: formatTime()
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-[#E8F3F1] border border-gray-200">
            {/* JHF Style Header with Download Button */}
            <header className="bg-[#00685E] text-white px-4 py-3 font-bold flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <span>{title}</span>
                </div>
                <div className="flex items-center gap-1">
                    {/* ★ Download Button - conditional */}
                    {enableDownload && (
                        <button
                            onClick={downloadTranscript}
                            className="text-white hover:bg-[#004d46] p-1.5 rounded transition-colors"
                            title="会話履歴をダウンロード"
                        >
                            <Download size={20} />
                        </button>
                    )}
                    <button onClick={handleCloseClick} className="text-white hover:bg-[#004d46] p-1 rounded">
                        <X size={24} />
                    </button>
                </div>
            </header>

            {/* ★ NEW: Escalation Wait Time Banner */}
            {isEscalating && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2 text-sm text-yellow-800">
                    <Clock size={16} className="animate-pulse" />
                    <span>オペレーターに接続中... 残り約 {waitTime} 秒</span>
                </div>
            )}

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
                                        <Bot size={24} strokeWidth={1.5} />
                                    </div>
                                </div>
                            )}

                            {/* Text Content */}
                            <div className="flex flex-col gap-1">
                                {msg.content && (
                                    <div className={`px-5 py-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm relative ${msg.role === 'user'
                                        ? 'bg-[#E8F5E9] text-[#333333] rounded-tr-none'
                                        : 'bg-white text-[#333333] rounded-tl-none'
                                        }`}>
                                        {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                                    </div>
                                )}

                                {/* ★ NEW: Attachment Preview in Messages */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {msg.attachments.map((att, attIdx) => (
                                            <div key={attIdx} className="bg-gray-100 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                                                <Paperclip size={12} />
                                                <span className="truncate max-w-[150px]">{att.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Timestamp */}
                                {msg.timestamp && (
                                    <span className={`text-xs text-gray-400 ${msg.role === 'user' ? 'text-right' : 'ml-1'}`}>
                                        {msg.timestamp}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Options (Assistant only) */}
                        {msg.role === 'assistant' && msg.options && msg.options.length > 0 && (
                            <div className="flex flex-col w-full max-w-[85%] ml-[3.5rem] bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                                {msg.options.map((option, optIdx) => (
                                    <button
                                        key={optIdx}
                                        onClick={() => handleSendMessage(option)}
                                        className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 hover:bg-gray-50 flex items-center gap-3 transition-colors last:border-0 group ${option === "オペレーターに接続" ? "text-[#00685E] font-medium" : "text-[#333333]"
                                            }`}
                                    >
                                        {option === "オペレーターに接続" ? (
                                            <Phone size={14} className="text-[#00685E]" />
                                        ) : (
                                            <Play size={10} className="text-[#333333] fill-current group-hover:text-[#00685E]" />
                                        )}
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

            {/* ★ NEW: Pending Attachments Preview */}
            {pendingAttachments.length > 0 && (
                <div className="bg-gray-50 border-t border-gray-200 px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                        {pendingAttachments.map((att, idx) => (
                            <div key={idx} className="bg-white rounded-lg px-3 py-2 text-xs flex items-center gap-2 border border-gray-200">
                                <Paperclip size={12} className="text-gray-500" />
                                <span className="truncate max-w-[100px]">{att.name}</span>
                                <button
                                    onClick={() => removeAttachment(idx)}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area - Hidden in Selection Mode */}
            {mode !== "selection" && (
                <div className="bg-white p-3 border-t border-gray-200 shrink-0">
                    <div className="flex items-center gap-3">
                        {/* ★ File Attachment Button - conditional */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*,.pdf"
                            multiple
                            className="hidden"
                        />
                        {enableAttachment && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-gray-500 hover:text-[#00685E] p-1 transition-colors"
                                title="ファイルを添付"
                            >
                                <Paperclip size={24} />
                            </button>
                        )}
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
                            disabled={loading || (!input.trim() && pendingAttachments.length === 0)}
                            className={`p-2 rounded-full transition-colors ${loading || (!input.trim() && pendingAttachments.length === 0)
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-[#00685E] hover:bg-green-50'
                                }`}
                        >
                            <Send size={24} />
                        </button>
                    </div>
                </div>
            )}

            {/* Evaluation Modal */}
            <EvaluationModal
                isOpen={showEvalModal}
                onClose={() => setShowEvalModal(false)}
                onSubmit={handleEvaluationSubmit}
            />
        </div>
    );
}
