import React, { useState, useEffect, useRef } from "react";
import flow from "/src/assets/background.jpg";

const Home = () => {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [detector, setDetector] = useState(null);
  const [translator, setTranslator] = useState(null);
  const [summarizer, setSummarizer] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("es"); // Default: Spanish
  const [loading, setLoading] = useState(false); // Loading state
  const lastMessageRef = useRef(null);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [messages]);

  const languageOptions = {
    en: "English",
    pt: "Portuguese",
    es: "Spanish",
    ru: "Russian",
    tr: "Turkish",
  };

  useEffect(() => {
    const initAI = async () => {
      if (
        !self.ai ||
        !self.ai.languageDetector ||
        !self.ai.translator ||
        !self.ai.summarizer
      ) {
        console.error("AI APIs are not available.");
        setError("AI APIs are not available.");
        return;
      }

      try {
        // Initialize Language Detector
        const detectorInstance = await self.ai.languageDetector.create();
        setDetector(detectorInstance);
        console.log("✅ AI Language Detector Ready!");

        // Initialize Translators
        const translators = {};
        for (const lang of Object.keys(languageOptions)) {
          try {
            translators[lang] = await self.ai.translator.create({
              model: "default",
              sourceLanguage: "en",
              targetLanguage: lang,
            });
            console.log(`✅ Translator Ready for en → ${lang}`);
          } catch (error) {
            console.error(`❌ Translator Failed for en → ${lang}:`, error);
          }

          try {
            translators[`${lang}-to-en`] = await self.ai.translator.create({
              model: "default",
              sourceLanguage: lang,
              targetLanguage: "en",
            });
            console.log(`✅ Translator Ready for ${lang} → en`);
          } catch (error) {
            console.error(`❌ Translator Failed for ${lang} → en:`, error);
          }
        }

        setTranslator(translators);
        console.log("✅ All AI Translators Ready!", translators);

        // Initialize AI Summarizer
        const summarizerInstance = await self.ai.summarizer.create();
        setSummarizer(summarizerInstance);
        console.log("✅ AI Summarizer Ready!");
      } catch (err) {
        console.error("Error initializing AI APIs:", err);
        setError("Error initializing AI APIs.");
      }
    };

    initAI();
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text.");
      return;
    }
    setError("");

    try {
      if (!detector) throw new Error("Language Detector is not available.");

      const detectedLanguage = await detector.detect(inputText);
      const detectedLang = detectedLanguage[0]?.detectedLanguage || "Unknown";

      setMessages((prev) => [
        ...prev,
        {
          text: inputText,
          type: "user",
          language: detectedLang,
          detectedLang: languageOptions[detectedLang] || "Unknown",
          showTranslation: false,
        },
      ]);
    } catch (err) {
      setError(`Error detecting language: ${err.message}`);
      console.error("Detection Error:", err);
    }

    setInputText("");
  };

  const handleTranslate = async (text, fromLang, index) => {
    if (!translator) {
      setError("Translator is not available.");
      return;
    }

    const translatorKey =
      fromLang === "en" ? selectedLanguage : `${fromLang}-to-en`;

    if (!translator[translatorKey]) {
      setError(
        `Translator instance missing for: ${fromLang} → ${selectedLanguage}`
      );
      return;
    }

    setLoading(true); // Start loading

    try {
      console.log(
        `Translating from ${fromLang} to ${selectedLanguage}: ${text}`
      );
      const translationResult = await translator[translatorKey].translate(text);
      const translatedText = translationResult || "Translation failed.";

      setMessages((prev) =>
        prev.map((msg, i) =>
          i === index
            ? { ...msg, translation: translatedText, showTranslation: true }
            : msg
        )
      );
    } catch (err) {
      setError(`Error translating text: ${err.message}`);
      console.error("Translation Error:", err);
    } finally {
      setLoading(false); // End loading
    }
  };

  const handleSummarize = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text.");
      return;
    }

    const wordCount = inputText.trim().split(/\s+/).length;
    if (wordCount < 150) {
      setError(
        "Summarization is available only for texts with more than 150 words."
      );
      return;
    }

    if (!summarizer) {
      setError("Summarizer is not available.");
      return;
    }

    setLoading(true); // Start loading

    try {
      console.log("Summarizing text...");
      const summaryResult = await summarizer.summarize(inputText);

      if (!summaryResult || summaryResult.length === 0) {
        setError("Summarization failed.");
        return;
      }

      // Detect the language of the input text
      const detectedLanguage = await detector.detect(inputText);
      const detectedLang = detectedLanguage[0]?.detectedLanguage || "Unknown";

      setMessages((prev) => [
        ...prev,
        {
          text: inputText,
          type: "user",
          language: detectedLang,
          detectedLang: languageOptions[detectedLang] || "Unknown",
          showTranslation: false,
        },
        {
          text: summaryResult,
          type: "bot",
          language: detectedLang,
          detectedLang: languageOptions[detectedLang] || "Unknown",
          showTranslation: false,
        },
      ]);
    } catch (err) {
      setError(`Error summarizing text: ${err.message}`);
      console.error("Summarization Error:", err);
    } finally {
      setLoading(false); // End loading
    }
    setInputText("");
  };

  return (
    <div
      style={{ backgroundImage: `url(${flow})` }}
      className=" flex flex-col items-center justify-center bg-cover"
    >
      <div className="box  w-[100vw] sm:w-[70vw] mx-auto px-4 py-1 sm:py-2 bg-gray-900 text-white rounded-lg shadow-md h-[100vh]  ">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div>
            <h2 className="text-2xl text-center sm:text-left font-bold mb-1 text-blue-400">
              LegendaryAI
            </h2>
            <p className="text-center mb-1 sm:mb-3">
              Translate and Summarize with me...
            </p>
          </div>
          <div className="flex flex-col-reverse items-center sm:items-end">
            {error && <p className="text-red-400 text-sm text-center sm:tet end">{error}</p>}
            {detector && translator && summarizer ? (
              <p className="text-green-400">✅ AI Services Ready</p>
            ) : (
              <p className="text-yellow-400">⏳ Initializing...</p>
            )}
          </div>
        </div>

        <div className="h-[405px] sm:h-[450px]  overflow-y-auto bg-gray-800 p-4 rounded-lg shadow-sm">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.type === "user" ? "justify-end" : "justify-start"
              } my-2`}
            >
              <div
                className={` w-[80vw] sm:w-[40vw] p-3 rounded-lg ${
                  msg.type === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-500 text-gray-300"
                }`}
              >
                <p className="text-lg">{msg.text}</p>
                {msg.detectedLang && (
                  <p className="text-sm text-gray-300 mt-1">
                    Detected: {msg.detectedLang}
                  </p>
                )}
                {msg.showTranslation && (
                  <p className="text-md italic text-black mt-1">
                    <span className="font-bold text-amber-900">
                      Translated:
                    </span>{" "}
                    {msg.translation}
                  </p>
                )}
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className=" h-10 mt-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                >
                  {Object.entries(languageOptions).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  className="mt-2 bg-yellow-500 text-black py-2 px-4 rounded-lg hover:bg-yellow-600"
                  onClick={() => handleTranslate(msg.text, msg.language, index)}
                >
                  Translate
                </button>
              </div>
            </div>
          ))}
          <div ref={lastMessageRef} />
        </div>

        {loading && (
          <div className="text-center mt-4">
            <p className="text-yellow-400">Loading...</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 ">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="w-full h-32 p-3 border bg-gray-800 rounded-lg text-white"
          ></textarea>
          <div className="flex flex-col items-center justify-center">
            <button
              className="w-[80vw] sm:w-full bg-blue-500 text-white py-2 mt-2 rounded-lg hover:bg-blue-600  gap-1 sm:gap-0"
              onClick={handleSend}
            >
              Detect Language
            </button>
            <button
              className=" w-[80vw] sm:w-full bg-green-500 text-white py-2 mt-2 rounded-lg hover:bg-green-600"
              onClick={handleSummarize}
            >
              Summarize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
