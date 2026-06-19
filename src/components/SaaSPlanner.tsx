import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  DollarSign, 
  Terminal, 
  Server, 
  Layers, 
  Send, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  Sliders,
  CheckCircle,
  HelpCircle,
  Cpu,
  GitFork,
  Star,
  Info
} from "lucide-react";
import { logUserInteraction } from "../utils/logger";
import { auth as firebaseAuth } from "../firebase";

interface ChatMessage {
  role: "user" | "model" | "assistant";
  content: string;
  sources?: Array<{ title: string; url: string }>;
}

interface SaaSPlannerProps {
  onConsumeCredits?: (feature: "planner") => Promise<boolean>;
}

export default function SaaSPlanner({ onConsumeCredits }: SaaSPlannerProps = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      content: `👋 **Salutations! I am your Zero-Cost SaaS Master Architect.**

I am trained directly on open-source repositories and cloud provider pricing margins. Ask me how to build **any software concept** at next to **$0** in development and upkeep!

*Try asking me:*
- *"How can I build an automated CRM at $0/mo using open-source tools?"*
- *"Help me orchestrate a serverless analytics system without paying Stripe, AWS, or Auth0."*
- *"Give me a tech stack blueprint to host an open-source alternative to Calendly."*`
    }
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab2] = useState<"chat" | "simulator">("chat");

  // Cost Simulator States
  const [hosting, setHosting] = useState("cloudflare"); // cloudflare, vercel, render
  const [database, setDatabase] = useState("neon"); // neon, supabase, fly
  const [auth, setAuth] = useState("supabase-auth"); // supabase-auth, clerk, custom
  const [email, setEmail] = useState("resend"); // resend, brevo, mailgun
  const [aiUsage, setAiUsage] = useState(3000); // monthly tokens / API calls

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!firebaseAuth.currentUser) {
      alert("Please sign in or connect your profile first to access the AI Zero-Cost SaaS Planner.");
      return;
    }
    const query = text.trim();
    if (!query || isLoading) return;

    if (onConsumeCredits) {
      const permitted = await onConsumeCredits("planner");
      if (!permitted) return;
    }

    const userMessage: ChatMessage = { role: "user", content: query };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Track interactions
    logUserInteraction("ai_planner_query", { query: query.substring(0, 50) });

    try {
      const res = await fetch("/api/ai/planner/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          chatHistory: messages
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      
      // Merge documents into citations if available
      const sourcesList = data.documents || [];
      
      setMessages(prev => [...prev, {
        role: "model",
        content: data.text || "I was unable to synthesize a plan. Please try again.",
        sources: sourcesList
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: "model",
        content: `⚠️ **Network Sync Disruption**\n\nI was unable to reach the AI Grounded Service. Let me outline a classic Zero-Cost stack for this requested feature:\n\n1. **Hosting**: Host your static web app on **Cloudflare Pages** (unlimited free bandwidth and static assets).\n2. **Database**: Use **Neon serverless PostgreSQL** ($0 plan supports 0.5 GB storage, fully scaled compute autoscaling).\n3. **Auth**: Integrate **Supabase Auth** ($0 up to 50k monthly active users).\n4. **Cron/Workers**: Use **Cloudflare Workers** (first 100k requests/day are fully free).\n\nFeel free to attempt sending your custom project details again!`,
        sources: [
          { title: "Supabase Free Scale", url: "https://supabase.com/pricing" },
          { title: "Cloudflare Pages Platform", url: "https://pages.cloudflare.com" }
        ]
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract domain from url
  const getDomain = (urlStr: string): string => {
    try {
      const url = new URL(urlStr);
      return url.hostname;
    } catch {
      return "";
    }
  };

  // Helper to get Google favicon URL
  const getFaviconUrl = (url: string) => {
    const domain = getDomain(url);
    if (!domain) return null;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  };

  // Custom high-fidelity text-to-elements formatter
  // Handles headers, lists, links, code blocks, company mentions, and custom font-size matching favicons
  const formatText = (text: string) => {
    const lines = text.split("\n");
    let inCodeBlock = false;
    let codeContent: string[] = [];

    return lines.map((line, idx) => {
      // Toggle Code Blocks
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          inCodeBlock = false;
          const content = codeContent.join("\n");
          codeContent = [];
          return (
            <div key={idx} className="my-3 font-mono text-xs bg-black text-emerald-400 p-4 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000000] overflow-x-auto relative group">
              <span className="absolute top-2 right-2 text-[8px] bg-emerald-950 text-emerald-300 px-1 rounded uppercase font-black">
                Terminal CLI / Code
              </span>
              <pre className="whitespace-pre-wrap">{content}</pre>
            </div>
          );
        } else {
          inCodeBlock = true;
          return null;
        }
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return null;
      }

      // Check for Headers
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-sm font-sans font-black text-black uppercase mt-4 mb-1.5 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-purple-600 stroke-[2.5px]" />
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="text-base font-sans font-black text-black uppercase mt-5 mb-2 border-b-2 border-black pb-1">
            {line.replace("## ", "")}
          </h3>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h2 key={idx} className="text-lg font-sans font-black text-black uppercase mt-6 mb-3">
            {line.replace("# ", "")}
          </h2>
        );
      }

      // Check for bullet items
      const isBullet = line.startsWith("- ") || line.startsWith("* ");
      const displayLine = isBullet ? line.substring(2) : line;

      // Inline formatter helper (handles bold **, wrapped links [text](url), angle links <url>, and bare URLs http/https)
      const parseInline = (chunk: string) => {
        const boldRegex = /\*\*([^*]+)\*\*/g;

        // We'll replace bold inline
        const textWithBoldReplaced = chunk.replace(boldRegex, "___BOLD___$1___BOLD___");
        
        // Split text using a robust regex to segment Markdown links, angle-bracket links, and bare URLs
        const items = textWithBoldReplaced.split(/((?:\[[^\]]+\]\(https?:\/\/[^\s)]+\))|(?:<https?:\/\/[^\s>]+>)|(?:\bhttps?:\/\/[^\s<>(),"“]+))/g);

        return items.map((sub, sidx) => {
          const isLinkMatch = sub.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          const isAngleMatch = sub.match(/^<(https?:\/\/[^\s>]+)>$/);
          const isBareUrlMatch = sub.match(/^(https?:\/\/[^\s<>(),"“]+)$/);

          if (isLinkMatch) {
            const label = isLinkMatch[1];
            const originalUrl = isLinkMatch[2];
            const favicon = getFaviconUrl(originalUrl);

            return (
              <a 
                key={sidx}
                href={originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold bg-blue-50 border border-blue-200 px-1 py-0.5 rounded text-[11px] align-baseline h-auto mx-0.5 font-sans"
              >
                {favicon && (
                  <img 
                    src={favicon} 
                    alt="" 
                    className="w-[1.25em] h-[1.25em] shrink-0 object-contain rounded-sm border border-black shadow-[0.5px_0.5px_0_0_#000000] inline-block align-middle bg-white" 
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <span>{label}</span>
                <ExternalLink className="h-2.5 w-2.5 shrink-0 stroke-[3px]" />
              </a>
            );
          } else if (isAngleMatch || isBareUrlMatch) {
            const originalUrl = isAngleMatch ? isAngleMatch[1] : isBareUrlMatch[1];
            const favicon = getFaviconUrl(originalUrl);
            const domain = getDomain(originalUrl);
            const label = domain || originalUrl;

            return (
              <a 
                key={sidx}
                href={originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold bg-blue-50 border border-blue-200 px-1 py-0.5 rounded text-[11px] align-baseline h-auto mx-0.5 font-sans"
              >
                {favicon && (
                  <img 
                    src={favicon} 
                    alt="" 
                    className="w-[1.25em] h-[1.25em] shrink-0 object-contain rounded-sm border border-black shadow-[0.5px_0.5px_0_0_#000000] inline-block align-middle bg-white" 
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <span>{label}</span>
                <ExternalLink className="h-2.5 w-2.5 shrink-0 stroke-[3px]" />
              </a>
            );
          } else {
            // Split by Bold marker
            const subParts = sub.split("___BOLD___");
            return subParts.map((part, pidx) => {
              if (pidx % 2 === 1) {
                // If it mentions typical enterprise brands, try to overlay a tiny favicon!
                const brandFavicons: { [key: string]: string } = {
                  "supabase": "supabase.com",
                  "neon": "neon.tech",
                  "cloudflare": "cloudflare.com",
                  "vercel": "vercel.com",
                  "clerk": "clerk.com",
                  "resend": "resend.com",
                  "github": "github.com",
                  "twenty": "twenty.com",
                  "render": "render.com",
                  "cal.com": "cal.com"
                };

                const lowerName = part.toLowerCase();
                let matchedDomain = "";
                for (const brand in brandFavicons) {
                  if (lowerName.includes(brand)) {
                    matchedDomain = brandFavicons[brand];
                    break;
                  }
                }

                return (
                  <strong key={pidx} className="font-extrabold text-black inline-flex items-center gap-1 font-sans">
                    {matchedDomain && (
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${matchedDomain}&sz=32`}
                        alt=""
                        className="w-[1.15em] h-[1.15em] shrink-0 object-contain rounded-sm border border-black inline-block align-middle bg-white"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    {part}
                  </strong>
                );
              }
              return part;
            });
          }
        });
      };

      if (isBullet) {
        return (
          <li key={idx} className="list-none flex items-start gap-2 text-stone-850 text-xs font-semibold leading-relaxed ml-2 my-1.5 font-sans">
            <span className="h-1.5 w-1.5 rounded-full bg-black shrink-0 mt-2" />
            <span>{parseInline(displayLine)}</span>
          </li>
        );
      }

      if (!line.trim()) return <div key={idx} className="h-2" />;

      return (
        <p key={idx} className="text-xs text-stone-800 leading-relaxed font-semibold my-2 font-sans">
          {parseInline(line)}
        </p>
      );
    });
  };

  // Cost simulator mathematical model
  const calculateCost = () => {
    let price = 0;
    
    // Hosting parameters pricing
    if (hosting === "render") price += 7; // Starter account
    
    // Database pricing
    if (database === "fly") price += 3; // minimal disk storage
    
    // Auth parameters
    if (auth === "clerk" && aiUsage > 10000) price += 15; // Pro pricing threshold
    
    // Email tiers
    if (email === "mailgun") price += 15; // Base api service

    // AI API calculation (estimating token API charges outside free limits)
    if (aiUsage > 5000) {
      price += Math.ceil((aiUsage - 5000) * 0.001);
    }

    return price;
  };

  const presetQueries = [
    { title: "Host a full ERP/CRM suite for $0", text: "How can I launch a full scale open-source CRM package similar to Salesforce for 0 dollars?" },
    { title: "Notion competitor stack details", text: "What open source repository gives me Notion notes and how to set it up on Neon and Cloudflare?" },
    { title: "Setup Calendly replacement easily", text: "I want to host Cal.com or a scheduling system on free tiers. Explain exactly where to host it." },
    { title: "No-cost real-time chat infrastructure", text: "Orchestrate a multiplayer chat SaaS with $0 hosting using Supabase realtime hooks." }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#bbf7d0] border-4 border-black p-6 rounded-2xl shadow-[6px_6px_0_0_#000000] relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-black text-[#86efac] border border-black font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000000]">
              Cohere Grounded Search Engine
            </span>
            <span className="bg-amber-100 text-amber-800 border-2 border-black font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000000]">
              ⚡ Requires 10 AI Credits
            </span>
          </div>
          <h2 className="text-2xl font-sans font-black text-black flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-black fill-yellow-300" />
            AI SaaS Planner Room
          </h2>
          <p className="text-xs text-stone-800 font-extrabold max-w-2xl leading-relaxed">
            Plan, scope, and budget your next software venture using live open-source indices. Learn how to mix free tiers (Postgre, CDN, Edge Compute) to achieve <strong>$0/month hosting</strong> indefinitely.
          </p>
        </div>
      </div>

      {/* Tabs Layout control */}
      <div className="flex border-4 border-black rounded-xl overflow-hidden bg-white shadow-[4px_4px_0_0_#000000] shrink-0">
        <button
          onClick={() => setActiveTab2("chat")}
          className={`flex-1 py-3 text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 border-r-3 border-black text-black transition-all cursor-pointer ${
            activeTab === "chat" ? "bg-[#ddd6fe]" : "bg-white hover:bg-stone-50"
          }`}
        >
          <Terminal className="h-4 w-4 text-black stroke-[2.5px]" />
          Planner Console Room
        </button>
        <button
          onClick={() => setActiveTab2("simulator")}
          className={`flex-1 py-3 text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 text-black transition-all cursor-pointer ${
            activeTab === "simulator" ? "bg-[#fbcfe8]" : "bg-white hover:bg-stone-50"
          }`}
        >
          <Sliders className="h-4 w-4 text-black stroke-[2.5px]" />
          Interactive Stack Estimator
        </button>
      </div>

      {activeTab === "chat" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Chat Interface Console (8 columns) */}
          <div className="lg:col-span-8 flex flex-col h-[580px] bg-[#fffdf5] border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#000000] overflow-hidden">
            
            {/* Header Status bar */}
            <div className="bg-black text-white p-3 flex items-center justify-between border-b-4 border-black font-semibold">
              <span className="font-mono text-xs uppercase tracking-wide flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse border border-black inline-block-middle" />
                Active Architecture Sandbox
              </span>
              <span className="text-[10px] font-mono text-yellow-300 font-semibold uppercase">Powered by Command-R</span>
            </div>

            {/* Conversational Screen Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/70">
              {messages.map((msg, idx) => {
                const isModel = msg.role === "model" || msg.role === "assistant";
                return (
                  <div key={idx} className={`flex ${isModel ? "justify-start" : "justify-end"} items-start gap-2.5`}>
                    
                    {isModel && (
                      <div className="h-8 w-8 rounded-lg border-2 border-black bg-[#ddd6fe] text-xs font-mono font-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0_0_#000000] uppercase text-black">
                        AI
                      </div>
                    )}

                    <div className={`p-4 rounded-xl border-3 border-black shadow-[3px_3px_0_0_#000000] max-w-[85%] text-left ${
                      isModel ? "bg-white" : "bg-[#fbcfe8] ml-auto"
                    }`}>
                      {/* Body section */}
                      <div className="space-y-1">
                        {formatText(msg.content)}
                      </div>

                      {/* Sources block nested */}
                      {isModel && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t-2 border-stone-100 font-mono text-[10px] text-stone-650">
                          <span className="font-black text-stone-500 uppercase tracking-widest block mb-2">
                             📚 Real-Time Verified Sources
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((source, sIdx) => {
                              const favicon = getFaviconUrl(source.url);
                              return (
                                <a
                                  key={sIdx}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 bg-[#fbfbf8] hover:bg-stone-100 border border-stone-300 px-2 py-1 rounded text-stone-900 font-bold hover:underline transition"
                                >
                                  {favicon && (
                                    <img 
                                      src={favicon} 
                                      alt="" 
                                      className="w-4 h-4 rounded-sm border border-stone-400 bg-white inline" 
                                      referrerPolicy="no-referrer"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  )}
                                  <span className="truncate max-w-[140px]">{source.title}</span>
                                  <ExternalLink className="h-3 w-3 inline text-stone-500" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start items-center gap-2">
                  <div className="h-8 w-8 rounded-lg border-2 border-black bg-[#ddd6fe] text-xs font-mono font-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0_0_#000000] uppercase text-black">
                    AI
                  </div>
                  <div className="p-3 rounded-lg border-2 border-black bg-white text-stone-500 text-xs font-black flex items-center gap-2 shadow-[2px_2px_0_0_#000000]">
                    <RefreshCw className="h-4 w-4 animate-spin text-black" />
                    <span>Analyzing openalt data and researching pricing metrics...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="p-3 bg-white border-t-4 border-black flex gap-2 shrink-0 font-mono"
            >
              <input
                type="text"
                value={firebaseAuth.currentUser ? input : ""}
                onChange={(e) => setInput(e.target.value)}
                placeholder={firebaseAuth.currentUser ? "Ask me how to plan a zero-cost CRM, SaaS boilerplate, or analytics system..." : "🔒 Please log in / sign in to use the Zero-Cost AI Planner"}
                disabled={isLoading || !firebaseAuth.currentUser}
                className="flex-1 bg-white border-2 border-black rounded-lg px-3 py-3 text-xs focus:outline-none focus:translate-y-[-1px] shadow-[2px_2px_0_0_#000000] focus:shadow-[3px_3px_0_0_#000000] transition-all font-sans font-bold"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !firebaseAuth.currentUser}
                className="px-5 py-3 bg-[#fde047] hover:bg-yellow-400 text-black border-2 border-black rounded-lg uppercase text-xs font-black shadow-[2px_2px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-40"
              >
                Assemble Map
              </button>
            </form>
          </div>

          {/* Quick preset side-rail (4 columns) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#eff6ff] border-4 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#000000] space-y-2">
              <h4 className="text-xs font-mono font-black uppercase text-blue-900 flex items-center gap-1">
                <Info className="h-4 w-4 text-blue-600 stroke-[2.5px]" />
                Preset SaaS Recipes
              </h4>
              <p className="text-[10px] text-stone-700 font-bold leading-normal">
                Click any recipe chip below to direct the Master AI to outline details, hosting paths, and openalternatives.
              </p>
            </div>

            <div className="space-y-2.5">
              {presetQueries.map((preset, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSend(preset.text)}
                  disabled={isLoading || !firebaseAuth.currentUser}
                  className="w-full text-left bg-white hover:bg-stone-50 border-2 border-black p-3.5 rounded-lg text-xs font-sans font-black shadow-[2.5px_2.5px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3.5px_3.5px_0_0_#000000] transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <span className="truncate pr-1 text-black font-extrabold">{preset.title}</span>
                  <ChevronRight className="h-4 w-4 text-stone-500 shrink-0" />
                </button>
              ))}
            </div>

            <div className="bg-[#fafaf6] border-2 border-dashed border-black/40 p-4 rounded-xl text-[10px] text-stone-600 font-semibold space-y-1">
              <p className="font-mono font-black text-black">💡 How Search Grounding Works:</p>
              <p className="leading-normal">
                When you input a request, Cohere performs a live search across current developer documentations, pricing pages, and repository listings, and injects validated sources with exact same-sized company logos.
              </p>
            </div>
          </div>

        </div>
      ) : (
        /* Cost Simulator Interface tab (Saves users tons of capital) */
        <div className="bg-white border-4 border-black p-5 md:p-6 rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-6">
          <div className="border-b-2 border-stone-200 pb-4">
            <h3 className="text-lg font-sans font-black text-black uppercase flex items-center gap-1.5">
              <Sliders className="h-5 w-5 text-pink-600" />
              SaaS Infrastructure Simulator
            </h3>
            <p className="text-xs text-stone-600 font-semibold mt-1">
              Check out how choosing serverless and cloud free tiers limits helps you establish a business on true $0/mo upkeep costs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Interactive sliders/input options */}
            <div className="space-y-5">
              
              {/* Option: Hosting provider */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-black uppercase text-stone-700 block">
                  🌐 Static App & Cloud Hosting
                </label>
                <div className="grid grid-cols-3 gap-2 font-black">
                  <button
                    onClick={() => setHosting("cloudflare")}
                    className={`py-2 px-1 border-2 border-black rounded text-[10px] cursor-pointer transition-all ${
                      hosting === "cloudflare" ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100 text-black"
                    }`}
                  >
                    Cloudflare ($0)
                  </button>
                  <button
                    onClick={() => setHosting("vercel")}
                    className={`py-2 px-1 border-2 border-black rounded text-[10px] cursor-pointer transition-all ${
                      hosting === "vercel" ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100 text-black"
                    }`}
                  >
                    Vercel ($0)
                  </button>
                  <button
                    onClick={() => setHosting("render")}
                    className={`py-2 px-1 border-2 border-black rounded text-[10px] cursor-pointer transition-all ${
                      hosting === "render" ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100 text-black"
                    }`}
                  >
                    Render ($7)
                  </button>
                </div>
              </div>

              {/* Option: Database */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-black uppercase text-stone-700 block">
                  🗄️ Database Backend Infrastructure
                </label>
                <div className="grid grid-cols-3 gap-2 font-black">
                  <button
                    onClick={() => setDatabase("neon")}
                    className={`py-2 px-1 border-2 border-black rounded text-[10px] cursor-pointer transition-all ${
                      database === "neon" ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100 text-black"
                    }`}
                  >
                    Neon PG ($0)
                  </button>
                  <button
                    onClick={() => setDatabase("supabase")}
                    className={`py-2 px-1 border-2 border-black rounded text-[10px] cursor-pointer transition-all ${
                      database === "supabase" ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100 text-black"
                    }`}
                  >
                    Supabase ($0)
                  </button>
                  <button
                    onClick={() => setDatabase("fly")}
                    className={`py-2 px-1 border-2 border-black rounded text-[10px] cursor-pointer transition-all ${
                      database === "fly" ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100 text-black"
                    }`}
                  >
                    Fly DB ($3)
                  </button>
                </div>
              </div>

              {/* Option: Auth services */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-black uppercase text-stone-700 block">
                  🔑 User Accounts & Identity Management
                </label>
                <div className="grid grid-cols-3 gap-2 font-black">
                  <button
                    onClick={() => setAuth("supabase-auth")}
                    className={`py-2 px-1 border-2 border-black rounded text-[10px] cursor-pointer transition-all ${
                      auth === "supabase-auth" ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100 text-black"
                    }`}
                  >
                    Supabase ($0)
                  </button>
                  <button
                    onClick={() => setAuth("clerk")}
                    className={`py-2 px-1 border-2 border-black rounded text-[10px] cursor-pointer transition-all ${
                      auth === "clerk" ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100 text-black"
                    }`}
                  >
                    Clerk Free ($0)
                  </button>
                  <button
                    onClick={() => setAuth("custom")}
                    className={`py-2 px-1 border-2 border-black rounded text-[10px] cursor-pointer transition-all ${
                      auth === "custom" ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100 text-black"
                    }`}
                  >
                    Custom ($0)
                  </button>
                </div>
              </div>

              {/* Option: Email Delivery provider */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-black uppercase text-stone-700 block">
                  ✉️ Transactional Email Service
                </label>
                <div className="grid grid-cols-3 gap-2 font-black">
                  <button
                    onClick={() => setEmail("resend")}
                    className={`py-2 px-1 border-2 border-black rounded text-[10px] cursor-pointer transition-all ${
                      email === "resend" ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100 text-black"
                    }`}
                  >
                    Resend ($0)
                  </button>
                  <button
                    onClick={() => setEmail("brevo")}
                    className={`py-2 px-1 border-2 border-black rounded text-[10px] cursor-pointer transition-all ${
                      email === "brevo" ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100 text-black"
                    }`}
                  >
                    Brevo ($0)
                  </button>
                  <button
                    onClick={() => setEmail("mailgun")}
                    className={`py-2 px-1 border-2 border-black rounded text-[10px] cursor-pointer transition-all ${
                      email === "mailgun" ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100 text-black"
                    }`}
                  >
                    Mailgun ($15)
                  </button>
                </div>
              </div>

              {/* Slider for projected Monthly Active API actions / LLM integration */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between font-mono text-xs text-stone-700 font-black">
                  <span>🚀 PROJECTED MONTHLY ACTIVE USERS / CALLS:</span>
                  <span className="bg-stone-100 px-2 py-0.5 border border-black rounded text-black font-mono">
                    {aiUsage.toLocaleString()} users
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="25000"
                  step="500"
                  value={aiUsage}
                  onChange={(e) => setAiUsage(parseInt(e.target.value))}
                  className="w-full accent-black cursor-ew-resize h-2 bg-stone-200 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[8px] font-mono font-bold text-stone-500 uppercase">
                  <span>500 (Small launch)</span>
                  <span>10,000 (Medium Scale)</span>
                  <span>25,000 (Sustained Scale)</span>
                </div>
              </div>

            </div>

            {/* Calculations and result cards */}
            <div className="bg-[#f2f2eb] border-4 border-black p-5 rounded-xl shadow-[4px_4px_0_0_#000000] flex flex-col justify-between">
              
              <div className="space-y-4">
                <span className="bg-purple-100 text-purple-800 border border-purple-200 font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000000] inline-block">
                  Live Overhead Matrix Result
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono font-black border-b border-black/10 pb-1.5">
                    <span className="text-stone-700 flex items-center gap-1">
                      <img src="https://www.google.com/s2/favicons?domain=cloudflare.com&sz=16" alt="" className="w-3.5 h-3.5" />
                      Client Assets CDN:
                    </span>
                    <span className="text-black font-sans uppercase">
                      {hosting === "render" ? "$7.00" : "Free Plan $0"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono font-black border-b border-black/10 pb-1.5">
                    <span className="text-stone-700 flex items-center gap-1">
                      <img src="https://www.google.com/s2/favicons?domain=neon.tech&sz=16" alt="" className="w-3.5 h-3.5" />
                      Database Storage:
                    </span>
                    <span className="text-black font-sans uppercase">
                      {database === "fly" ? "$3.00" : "Free Plan $0"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono font-black border-b border-black/10 pb-1.5">
                    <span className="text-stone-700 flex items-center gap-1">
                      <img src="https://www.google.com/s2/favicons?domain=clerk.com&sz=16" alt="" className="w-3.5 h-3.5" />
                      Identity Provider:
                    </span>
                    <span className="text-black font-sans uppercase">
                      {auth === "clerk" && aiUsage > 10000 ? "$15.00" : "Free Plan $0"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono font-black border-b border-black/10 pb-1.5">
                    <span className="text-stone-700 flex items-center gap-1">
                      <img src="https://www.google.com/s2/favicons?domain=resend.com&sz=16" alt="" className="w-3.5 h-3.5" />
                      Email Delivery API:
                    </span>
                    <span className="text-black font-sans uppercase">
                      {email === "mailgun" ? "$15.00" : "Free Plan $0"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono font-black border-b border-black/10 pb-1.5">
                    <span className="text-stone-700 flex items-center gap-1">
                      <Server className="h-3.5 w-3.5 inline mr-1 text-stone-600" />
                      Estimated API Excess:
                    </span>
                    <span className="text-black font-mono">
                      ${aiUsage > 5000 ? Math.ceil((aiUsage - 5000) * 0.001) : 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Card projection big numbers */}
              <div className="bg-[#bbf7d0] border-4 border-black p-4 rounded-lg shadow-[2.5px_2.5px_0_0_#000000] mt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-black text-black block leading-none uppercase">Cumulative Cost</span>
                  <span className="text-3xl font-sans font-black text-black mt-1 inline-block">
                    ${calculateCost()}<span className="text-base font-normal">/mo</span>
                  </span>
                </div>
                {calculateCost() === 0 ? (
                  <div className="flex h-10 w-10 items-center justify-center bg-black text-[#86efac] border-2 border-black rounded shadow-[1.5px_1.5px_0_0_#000000]">
                    <CheckCircle className="h-5 w-5 fill-[#86efac] text-black" />
                  </div>
                ) : (
                  <span className="text-[10px] font-mono font-black bg-stone-100 border border-black rounded px-1.5 py-0.5 text-black">
                     OPTIMIZED
                  </span>
                )}
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
