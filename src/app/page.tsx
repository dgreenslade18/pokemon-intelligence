"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import Script7Panel from "../components/Script7Panel";
import Header from "../components/Header";
import { Button } from "../components/Button";
import { CrossIcon } from "../components/CrossIcon";
import { AnimatePresence, LazyMotion, domMax, m } from "motion/react";
import clsx from "clsx";

export default function HomePage() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // If user is authenticated, redirect to the main app
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (session) {
    return (
      <main className="min-h-screen relative">
        {/* Background Images - Theme Specific */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat block dark:hidden"
          style={{ backgroundImage: "url(/lightBg2.png)" }}
        />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat dark:block hidden"
          style={{ backgroundImage: "url(/bg.jpg)" }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <Header />
          <div className="max-w-[1280px] mx-auto px-4 py-8">
            <Script7Panel onBack={() => {}} hideBackButton={true} />
          </div>
        </div>
      </main>
    );
  }

  // Landing page for non-authenticated users
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/email-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        setSubmitted(true);
        setEmail("");
      } else {
        console.error("Failed to submit email");
      }
    } catch (error) {
      console.error("Error submitting email:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen relative">
      {/* Background Images - Theme Specific */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat block dark:hidden"
        style={{ backgroundImage: "url(/lightBg2.png)" }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat dark:block hidden"
        style={{ backgroundImage: "url(/bg.jpg)" }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}

        <header
          className={`sticky top-0 left-0 right-0 z-50  px-6 transition-all duration-300 ${
            isScrolled
              ? "backdrop-blur-lg bg-white/10 dark:bg-black/10 border-b py-2 transition-all duration-300 border-black/20 dark:border-white/10"
              : "py-6 border-black/0"
          }`}
        >
          <div className="max-w-[1280px] mx-auto flex items-center justify-between">
            {/* Logo */}

            <h1 className="text-xl md:text-2xl font-semibold dark:text-white text-black">
              Card Intelligence
            </h1>

            <Button
              color="outline"
              size="medium"
              onClick={() => (window.location.href = "/auth/signin")}
            >
              Sign In
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6">
          <div className="max-w-2xl text-center">
            {/* Hero Section */}

            <div className="space-y-4 md:space-y-8 mb-8">
              <h1 className="text-[34px] md:text-[68px] font-medium leading-[1.05] text-center max-w-[882px] mx-auto tracking-[-0.63px] gradient-text pt-12">
                You're Invited
              </h1>
              <p className="text-black/60 dark:text-white/60 block text-l md:text-xl font-regular md:mx-0 mx-auto">
                Join the exclusive beta for Card Intelligence
              </p>

              <p className="text-black/60 dark:text-white/60 block text-md md:text-l font-regular md:mx-0 mx-auto mb-12">
                Get early access to advanced Pokemon UK card price analysis,
                market trends, and trading insights. Be among the first to
                experience the future of UK Pokemon card trading.
              </p>
            </div>

            {/* Email Collection Form */}
            {!submitted ? (
              <form
                onSubmit={handleEmailSubmit}
                className="max-w-none w-full md:max-w-xl mx-auto"
              >
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 px-6 py-4 text-[15px] rounded-full leading-[0.9] bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 w-full md:w-auto"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="large"
                    color="white"
                    className="w-full md:w-auto"
                  >
                    {isSubmitting ? "Submitting..." : "Get Early Access"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="max-w-md mx-auto">
                <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-6">
                  <h3 className="text-green-400 text-xl font-semibold mb-2">
                    Thank You!
                  </h3>
                  <p className="text-green-300">
                    We've received your interest. We'll be in touch soon with
                    your early access invitation.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="max-w-[1280px] mx-auto px-4 py-8">
            {/* Features */}
            <div className="mt-6 md:mt-12 grid md:grid-cols-3 gap-8 pb-8 md:pb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-white font-semibold mb-2">
                  Advanced Analytics
                </h3>
                <p className="text-gray-300 text-sm max-w-[60%] mx-auto">
                  Real-time price tracking and market analysis
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-white font-semibold mb-2">
                  Smart Insights
                </h3>
                <p className="text-gray-300 text-sm max-w-[60%] mx-auto">
                  AI-powered trading recommendations
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-white font-semibold mb-2">
                  Lightning Fast
                </h3>
                <p className="text-gray-300 text-sm max-w-[60%] mx-auto">
                  Instant price comparisons across multiple platforms
                </p>
              </div>
            </div>

            {/* FAQ Section */}
            <LazyMotion features={domMax}>
              <div className="pb-12 pt-8 max-w-4xl mx-auto md:max-w-[780px]">
                <h2 className="text-lg md:text-2xl font-medium text-white text-center mb-6 md:mb-12">
                  Frequently Asked Questions
                </h2>

                <div className="flex flex-1 flex-col justify-between md:max-w-[780px]">
                  {faqs?.map((faq, i) => (
                    <m.div
                      key={`question-${i}`}
                      onClick={() =>
                        setActiveQuestion(i === activeQuestion ? null : i)
                      }
                      layout
                      className={clsx(
                        "group relative flex cursor-pointer gap-4 overflow-hidden py-5 md:gap-7"
                      )}
                    >
                      <m.div
                        layout="position"
                        className="bg-white/20 absolute right-0 bottom-0 left-0 h-px"
                      />
                      <div className="flex-1">
                        <m.div
                          layout="position"
                          className="text-[16px]md:text-[18px] text-left font-medium"
                          dangerouslySetInnerHTML={{
                            __html: faq?.question,
                          }}
                        />

                        <AnimatePresence mode="popLayout">
                          {activeQuestion === i && (
                            <m.div
                              key={`feature-${i}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-left text-white text-[14px] md:text-[16px] mt-3"
                              layout="position"
                              dangerouslySetInnerHTML={{
                                __html: faq?.answer,
                              }}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                      <m.div
                        layout="position"
                        className={clsx("size-5 flex-none")}
                      >
                        <div
                          className={clsx(
                            "transition-transform duration-300",
                            activeQuestion === i ? "rotate-45" : "rotate-0"
                          )}
                        >
                          <CrossIcon className="size-5" />
                        </div>
                      </m.div>
                    </m.div>
                  ))}
                </div>
              </div>
            </LazyMotion>
          </div>
        </div>
      </div>
    </main>
  );
}

// FAQ Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="py-6 border-b border-white/10 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left flex justify-between items-center group"
      >
        <span className="text-white font-medium text-lg pr-4">{question}</span>
        <div className="flex-shrink-0">
          {isOpen ? (
            <svg
              className="w-6 h-6 text-white/70 group-hover:text-white transition-colors duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-white/70 group-hover:text-white transition-colors duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          )}
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pr-10 text-left">
          <p className="text-white/70 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

// FAQ Data
const faqs = [
  {
    question: "What is Card Intelligence?",
    answer:
      "Card Intelligence is an advanced platform designed specifically for UK Pokemon card traders and collectors. It provides real-time price analysis, market trends, and trading insights to help you make informed decisions about buying, selling, and trading Pokemon cards.",
  },
  {
    question: "How does the early access work?",
    answer:
      "Early access is currently limited to a select group of users. When you submit your email, you'll be added to our waitlist. We'll review your application and send you an invitation with login credentials when your access is ready. This helps us ensure a smooth experience for all users.",
  },
  {
    question: "What data sources do you use?",
    answer:
      "We aggregate data from multiple sources including eBay UK, TCG API, and other major UK Pokemon card marketplaces. Our system continuously monitors price changes, sales history, and market trends to provide you with the most accurate and up-to-date information.",
  },
  {
    question: "Is this only for UK raw Pokemon cards?",
    answer:
      "Yes, Card Intelligence is specifically designed for the UK raw Pokemon card market. We focus on UK-specific pricing, market conditions, and trading patterns to provide the most relevant insights for UK traders and collectors.",
  },
  {
    question: "How accurate are the price predictions?",
    answer:
      "Our price analysis uses advanced algorithms and machine learning to analyze market trends, but no prediction is 100% guaranteed. We provide confidence scores and market volatility indicators to help you understand the reliability of our insights. Always do your own research before making trading decisions.",
  },
  {
    question: "Can I track my collection?",
    answer:
      "Yes! You can create multiple lists to track different aspects of your collection - cards you own, cards you're watching, potential purchases, and more. Our system will monitor price changes for all cards in your lists and provide you with updates.",
  },
  {
    question: "How often is the data updated?",
    answer:
      "Our data is updated in real-time as new information becomes available. Price changes, new listings, and market movements are reflected immediately in our system. For historical data and trends, we maintain comprehensive records going back months.",
  },
  {
    question: "What makes this different from other card tracking tools?",
    answer:
      "Card Intelligence is specifically built for the UK Pokemon card market with advanced features like confidence scoring, market trend analysis, and volatility tracking. Unlike generic tools, we understand the unique dynamics of the UK Pokemon card trading scene.",
  },
  {
    question: "Will you support graded cards or other languages?",
    answer: "We are working on it as a phase 2 feature.",
  },
];
