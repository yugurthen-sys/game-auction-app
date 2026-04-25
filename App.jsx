import React, { useState, useEffect } from "react";
import {
  Gavel,
  DollarSign,
  CheckCircle2,
  XCircle,
  Trophy,
  RefreshCcw,
  Info,
  Sparkles,
  Loader2,
} from "lucide-react";

// The environment provides the key at runtime
const apiKey = "AIzaSyDr8gPoNOBXwHkHrJ91g_eQrNh5KHdapc4";
const appId =
  typeof __app_id !== "undefined" ? __app_id : "grammar-auction-pro";

const INITIAL_BALANCE = 1000;

// Default fallback sentences
const DEFAULT_SENTENCES = [
  {
    text: "He go to school every day.",
    correct: false,
    correction: "He goes to school every day.",
    explanation: "In the Present Simple, we add 's' to the verb for he/she/it.",
    cost: 100,
  },
  { text: "There are many books on the shelf.", correct: true, cost: 150 },
  {
    text: "I doesn't like apples.",
    correct: false,
    correction: "I don't like apples.",
    explanation: "Use 'don't' for I/you/we/they.",
    cost: 120,
  },
  { text: "She is listening to music right now.", correct: true, cost: 200 },
];

const App = () => {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [gameState, setGameState] = useState("welcome"); // welcome, auction, results
  const [feedback, setFeedback] = useState(null);
  const [sentences, setSentences] = useState(DEFAULT_SENTENCES);
  const [isGenerating, setIsGenerating] = useState(false);
  const [unitTheme, setUnitTheme] = useState("General Review");

  const currentSentence = sentences[currentIndex];

  const calculateScore = () => {
    const correctCount = purchasedItems.filter((item) => item.correct).length;
    const incorrectCount = purchasedItems.filter(
      (item) => !item.correct,
    ).length;
    return correctCount * 100 - incorrectCount * 50 + balance / 10;
  };

  const callGemini = async (prompt, retryCount = 0) => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  sentences: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        text: { type: "STRING" },
                        correct: { type: "BOOLEAN" },
                        correction: { type: "STRING" },
                        explanation: { type: "STRING" },
                        cost: { type: "NUMBER" },
                      },
                    },
                  },
                },
              },
            },
          }),
        },
      );

      if (!response.ok) throw new Error("API request failed");
      const data = await response.json();
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (error) {
      if (retryCount < 5) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return callGemini(prompt, retryCount + 1);
      }
      throw error;
    }
  };

  const generateNewSentences = async () => {
    setIsGenerating(true);
    const prompt = `Generate 6 English sentences for an EFL Grammar Auction game based on the theme "${unitTheme}". 
    Some should be grammatically correct, some should have common learner errors. 
    Format as JSON with: text, correct (boolean), correction (string if wrong), explanation (short pedagogical tip), and cost (80-250).`;

    try {
      const result = await callGemini(prompt);
      if (result.sentences) {
        setSentences(result.sentences);
        setGameState("auction");
        setBalance(INITIAL_BALANCE);
        setPurchasedItems([]);
        setCurrentIndex(0);
        setFeedback(null);
      }
    } catch (error) {
      console.error("Failed to generate sentences", error);
      startAuction();
    } finally {
      setIsGenerating(false);
    }
  };

  const startAuction = () => {
    setGameState("auction");
    setBalance(INITIAL_BALANCE);
    setPurchasedItems([]);
    setCurrentIndex(0);
    setFeedback(null);
    setSentences(DEFAULT_SENTENCES);
  };

  const handleBid = (buy) => {
    if (buy) {
      if (balance >= currentSentence.cost) {
        const isCorrect = currentSentence.correct;
        setPurchasedItems([
          ...purchasedItems,
          { ...currentSentence, bought: true },
        ]);
        setBalance((prev) => prev - currentSentence.cost);
        setFeedback({
          type: isCorrect ? "success" : "error",
          msg: isCorrect
            ? "Great buy! This sentence is perfect."
            : `Bad investment!`,
          detail: !isCorrect ? currentSentence.explanation : null,
        });
      } else {
        setFeedback({ type: "warning", msg: "Not enough budget!" });
        setTimeout(() => setFeedback(null), 1500);
        return;
      }
    } else {
      setFeedback({ type: "info", msg: "You passed on this one." });
    }

    setTimeout(
      () => {
        setFeedback(null);
        if (currentIndex < sentences.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setGameState("results");
        }
      },
      buy && !currentSentence.correct ? 3500 : 2000,
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 flex flex-col items-center">
      <header className="max-w-2xl w-full mb-8 text-center">
        <h1 className="text-4xl font-black text-indigo-700 flex items-center justify-center gap-2 tracking-tight">
          <Gavel className="w-10 h-10" /> GRAMMAR AUCTION
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          ✨ Powered by Gemini AI
        </p>
      </header>

      {gameState === "welcome" && (
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-indigo-100">
          <div className="bg-indigo-50 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-3">
            <DollarSign className="w-12 h-12 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Ready to bid?</h2>

          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 text-left">
              Target Theme
            </label>
            <select
              className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all"
              value={unitTheme}
              onChange={(e) => setUnitTheme(e.target.value)}
            >
              <option>General Review</option>
              <option>Spotlight 1: Family & School</option>
              <option>Spotlight 2: Past Memories</option>
              <option>Spotlight 3: Future Plans</option>
              <option>Daily Routines</option>
            </select>
          </div>

          <div className="grid gap-3">
            <button
              onClick={generateNewSentences}
              disabled={isGenerating}
              className="group relative w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg flex items-center justify-center gap-2 overflow-hidden"
            >
              {isGenerating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isGenerating ? "Generating Items..." : "✨ Start AI Auction"}
            </button>
            <button
              onClick={startAuction}
              className="w-full bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-200 font-bold py-3 rounded-xl transition-all"
            >
              Play Standard Set
            </button>
          </div>
        </div>
      )}

      {gameState === "auction" && (
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">
                  Wallet
                </p>
                <p className="text-xl font-black text-slate-800">${balance}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">
                Auction Lot
              </p>
              <p className="text-lg font-bold text-indigo-600">
                {currentIndex + 1} / {sentences.length}
              </p>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-b-8 border-indigo-100 relative overflow-hidden min-h-[350px] flex flex-col justify-center text-center">
            {feedback && (
              <div
                className={`absolute inset-0 flex items-center justify-center z-20 animate-in fade-in zoom-in duration-300 backdrop-blur-md ${
                  feedback.type === "success"
                    ? "bg-green-50/95 text-green-700"
                    : feedback.type === "error"
                      ? "bg-red-50/95 text-red-700"
                      : "bg-slate-50/90 text-slate-700"
                }`}
              >
                <div className="text-center p-8 max-w-sm">
                  {feedback.type === "success" ? (
                    <CheckCircle2 className="w-20 h-20 mx-auto mb-4" />
                  ) : feedback.type === "error" ? (
                    <XCircle className="w-20 h-20 mx-auto mb-4" />
                  ) : (
                    <Info className="w-16 h-16 mx-auto mb-4" />
                  )}
                  <p className="text-2xl font-black mb-2">{feedback.msg}</p>
                  {feedback.detail && (
                    <div className="bg-white/50 p-4 rounded-2xl text-sm font-medium border border-red-200 mt-4 flex gap-2 items-start text-left">
                      <Sparkles className="w-4 h-4 mt-1 flex-shrink-0 text-red-500" />
                      <span>{feedback.detail}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-8">
              <div className="flex flex-col items-center gap-1">
                <span className="px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black tracking-widest uppercase border border-indigo-100">
                  Lot #{currentIndex + 101}
                </span>
                <h3 className="text-slate-400 text-sm font-medium">
                  Bidding starts at ${currentSentence.cost}
                </h3>
              </div>

              <blockquote className="text-3xl font-serif italic text-slate-800 leading-tight px-4">
                "{currentSentence.text}"
              </blockquote>
            </div>

            <div className="mt-12 flex gap-4">
              <button
                disabled={feedback}
                onClick={() => handleBid(false)}
                className="flex-1 py-5 rounded-2xl font-bold border-2 border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-0"
              >
                No Bid
              </button>
              <button
                disabled={feedback}
                onClick={() => handleBid(true)}
                className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-0"
              >
                <Gavel className="w-5 h-5" /> SOLD!
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === "results" && (
        <div className="w-full max-w-2xl space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl text-center border border-indigo-100">
            <div className="relative inline-block">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
            </div>
            <h2 className="text-3xl font-black mb-1">Auction Closed</h2>
            <p className="text-slate-500 mb-6">Total Educational Value</p>
            <div className="bg-slate-900 text-white py-4 px-8 rounded-2xl inline-block mb-8">
              <p className="text-5xl font-black tracking-tighter">
                {Math.round(calculateScore())} pts
              </p>
            </div>

            <div className="space-y-3 text-left mb-8">
              <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest flex items-center gap-2">
                <Info className="w-4 h-4" /> Final Audit
              </h3>
              <div className="grid gap-2">
                {purchasedItems.map((item, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl flex flex-col gap-1 border ${item.correct ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">
                        "{item.text}"
                      </span>
                      {item.correct ? (
                        <CheckCircle2 className="text-green-600 w-5 h-5" />
                      ) : (
                        <XCircle className="text-red-600 w-5 h-5" />
                      )}
                    </div>
                    {!item.correct && (
                      <p className="text-xs text-red-600 mt-1 font-medium italic">
                        ✨ Correction: {item.correction}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setGameState("welcome")}
              className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
            >
              <RefreshCcw className="w-5 h-5" /> New Auction
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
