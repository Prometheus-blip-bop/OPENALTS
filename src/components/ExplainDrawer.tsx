import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { API_BASE_URL } from "../config";
import { 
  X, 
  Sparkles, 
  HelpCircle, 
  Send, 
  Terminal, 
  Layers, 
  RefreshCw, 
  ExternalLink,
  Star,
  GitFork,
  BookOpen
} from "lucide-react";
import { logUserInteraction } from "../utils/logger";

interface ExplainDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  repo: {
    owner: string;
    name: string;
    description: string;
    stars?: number;
    forks?: number;
    language?: string;
    license?: string;
  } | null;
}

interface ChatMessage {
  role: "user" | "model" | "assistant";
  content: string;
}

export default function ExplainDrawer({ isOpen, onClose, repo }: ExplainDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Trigger initial explain prompt whenever a repo is loaded
  useEffect(() => {
    if (isOpen && repo) {
      setMessages([]);
      setIsLoading(true);
      logUserInteraction("ai_explain_drawer_opened", { repo: `${repo.owner}/${repo.name}` });
      
      const fetchInitialExplanation = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/ai/explain`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              repoOwner: repo.owner,
              repoName: repo.name,
              description: repo.description,
              chatHistory: []
            })
          });
          
          if (!res.ok) throw new Error("API returned error status");
          
          const data = await res.json();
          setMessages([
            {
              role: "model",
              content: data.text || "Unable to retrieve explanation metrics."
            }
          ]);
        } catch (err) {
          console.error(err);
          setMessages([
            {
              role: "model",
              content: `#### ⚠️ Active Service Interruption

I was unable to load live searches, but here is a structural architecture overview for **${repo.name}**:

- **Repository**: [${repo.owner}/${repo.name}](https://github.com/${repo.owner}/${repo.name})
- **Metadata**: Language **${repo.language || "TypeScript"}** | **${repo.license || "MIT"} License**
- **Default Architecture**: Typically standard node modules / packages or a compiled static framework.
- **Micro-hosting Plan**: Recommend deploying on **Cloudflare Pages** (frontend) coupled with **Neon serverless DB** if state is required.

*Feel free to ask me follow-up questions about this codebase setup directly below!*`
            }
          ]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchInitialExplanation();
    }
  }, [isOpen, repo]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || isLoading || !repo) return;

    const userMsg: ChatMessage = { role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoOwner: repo.owner,
          repoName: repo.name,
          description: repo.description,
          userMessage: query,
          chatHistory: messages
        })
      });

      if (!res.ok) throw new Error("API failed");

      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "model",
        content: data.text || "Thank you for your question. My search limits are cooling down, feel free to submit again in a few seconds."
      }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: "model",
        content: "⚠️ **Connection Error**: Unstable connection to our AI architecture analysis nodes. Please retry your inquiry."
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

  // Dynamic favicon matching font-size helper
  const renderFormattedMessageText = (text: string) => {
    const lines = text.split("\n");
    let inCodeBlock = false;
    let codeContent: string[] = [];

    return lines.map((line, idx) => {
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          inCodeBlock = false;
          const content = codeContent.join("\n");
          codeContent = [];
          return (
            <div key={idx} className="my-2.5 font-mono text-[10.5px] bg-black text-amber-300 p-3 rounded-lg border-2 border-black shadow-[2.5px_2.5px_0_0_#000000] overflow-x-auto relative">
              <span className="absolute top-1.5 right-1.5 text-[7px] bg-amber-950 text-amber-200 px-1 rounded uppercase font-black">
                Terminal CLI
              </span>
              <pre className="whitespace-pre-wrap leading-tight">{content}</pre>
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
      if (line.startsWith("### ") || line.startsWith("#### ")) {
        return (
          <h4 key={idx} className="text-[11px] font-mono font-black text-[#9333ea] uppercase mt-3 mb-1 flex items-center gap-1">
            <Layers className="h-3 w-3 text-purple-600 stroke-[2.5px]" />
            {line.replace(/#+ /, "")}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="text-xs font-sans font-black text-black uppercase mt-4 mb-2 border-b border-stone-200 pb-1">
            {line.replace("## ", "")}
          </h3>
        );
      }

      const isBullet = line.startsWith("- ") || line.startsWith("* ");
      const displayLine = isBullet ? line.substring(2) : line;

      const parseInlineText = (chunk: string) => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const boldRegex = /\*\*([^*]+)\*\*/g;

        const textWithBoldReplaced = chunk.replace(boldRegex, "___BOLD___$1___BOLD___");
        const items = textWithBoldReplaced.split(/(\[[^\]]+\]\([^)]+\))/g);

        return items.map((sub, sidx) => {
          const isLink = sub.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (isLink) {
            const label = isLink[1];
            const originalUrl = isLink[2];
            const domain = getDomain(originalUrl);
            const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null;

            return (
              <a 
                key={sidx}
                href={originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold bg-blue-50 border border-blue-200 px-1 py-0 rounded text-[10px] mx-0.5"
              >
                {favicon && (
                  <img 
                    src={favicon} 
                    alt="" 
                    className="w-[1.15em] h-[1.15em] shrink-0 object-contain rounded-sm border border-black inline" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <span>{label}</span>
                <ExternalLink className="h-2 w-2 stroke-[3px]" />
              </a>
            );
          } else {
            const parts = sub.split("___BOLD___");
            return parts.map((part, pidx) => {
              if (pidx % 2 === 1) {
                const brandFavs: { [key: string]: string } = {
                  "supabase": "supabase.com",
                  "neon": "neon.tech",
                  "cloudflare": "cloudflare.com",
                  "vercel": "vercel.com",
                  "clerk": "clerk.com",
                  "resend": "resend.com",
                  "github": "github.com",
                  "calendly": "calendly.com",
                  "twenty": "twenty.com",
                  "render": "render.com"
                };

                const lowerName = part.toLowerCase();
                let matchedDomain = "";
                for (const brand in brandFavs) {
                  if (lowerName.includes(brand)) {
                    matchedDomain = brandFavs[brand];
                    break;
                  }
                }

                return (
                  <strong key={pidx} className="font-extrabold text-stone-900 inline-flex items-center gap-1">
                    {matchedDomain && (
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${matchedDomain}&sz=32`}
                        alt=""
                        className="w-[1.1em] h-[1.1em] shrink-0 object-contain rounded-sm border border-black inline"
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
          <li key={idx} className="list-none flex items-start gap-1.5 text-stone-800 text-[11px] font-semibold leading-relaxed ml-2 my-1">
            <span className="h-1 w-1 rounded-full bg-black shrink-0 mt-1.5" />
            <span>{parseInlineText(displayLine)}</span>
          </li>
        );
      }

      if (!line.trim()) return <div key={idx} className="h-1.5" />;

      return (
        <p key={idx} className="text-stone-800 text-[11px] font-semibold leading-relaxed my-1.5">
          {parseInlineText(line)}
        </p>
      );
    });
  };

  if (!isOpen || !repo) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans">
      
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
      />

      {/* Drawer content panel */}
      <div className="relative w-full max-w-lg h-full bg-[#fffdf5] border-l-4 border-black flex flex-col justify-between shadow-[24px_0_0_0_#000000] z-10 transition-transform duration-300">
        
        {/* Header Block */}
        <div className="bg-black text-white p-4 flex items-center justify-between border-b-4 border-black shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#ddd6fe] border border-black text-black shadow-[1.5px_1.5px_0_0_#000000]">
              <Sparkles className="h-4.5 w-4.5 text-purple-700 fill-purple-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white leading-tight">AI Repository Explainer</h3>
              <p className="text-[9px] font-mono text-stone-300 uppercase mt-0.5 tracking-wider font-semibold">
                Grounding: {repo.owner}/{repo.name}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1 rounded border-2 border-black bg-[#fef08a] text-black hover:bg-yellow-400 shadow-[1.5px_1.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
            aria-label="Close Explainer Drawer"
          >
            <X className="h-4 w-4 stroke-[3px]" />
          </button>
        </div>

        {/* Quick Repo Card Header Context */}
        <div className="bg-[#eff6ff] p-3.5 border-b-2 border-black flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h4 className="text-xs font-black text-black truncate">{repo.owner}/{repo.name}</h4>
            <p className="text-[10px] text-stone-600 line-clamp-1 italic font-semibold leading-normal mt-0.5">{repo.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 font-mono text-[9px] font-black">
            {repo.stars !== undefined && (
              <span className="flex items-center gap-0.5 bg-yellow-300 border border-black px-1.5 py-0.5 rounded shadow-[1px_1px_0_0_#000000] text-black">
                <Star className="h-3 w-3 fill-black text-black" /> {repo.stars}
              </span>
            )}
            {repo.language && (
              <span className="bg-[#cbd5e1] border border-black px-1.5 py-0.5 rounded text-black font-extrabold">{repo.language}</span>
            )}
          </div>
        </div>

        {/* Conversation messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/70">
          {messages.map((msg, idx) => {
            const isModel = msg.role === "model" || msg.role === "assistant";
            return (
              <div key={idx} className={`flex ${isModel ? "justify-start" : "justify-end"} items-start gap-2.5`}>
                
                {isModel && (
                  <div className="h-6 w-6 rounded border border-black bg-purple-200 text-[10px] font-mono font-black flex items-center justify-center shrink-0 shadow-[0.5px_0.5px_0_0_#000000] text-black">
                    AI
                  </div>
                )}

                <div className={`p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000000] max-w-[85%] text-left ${
                  isModel ? "bg-white" : "bg-[#fbcfe8] ml-auto text-black"
                }`}>
                  <div className="space-y-1">
                    {renderFormattedMessageText(msg.content)}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-3 font-mono">
              <RefreshCw className="h-8 w-8 text-black animate-spin stroke-[2.5px]" />
              <div className="space-y-1">
                <p className="font-sans font-black text-xs text-black uppercase">Interrogating Repository...</p>
                <p className="text-[9.5px] text-stone-500 font-bold max-w-xs mx-auto">Evaluating architecture modules, tech stacks compromises, and zero-cost hosting potentials...</p>
              </div>
            </div>
          )}

          {isLoading && messages.length > 0 && (
            <div className="flex justify-start items-center gap-2">
              <div className="h-6 w-6 rounded border border-black bg-purple-200 text-[9px] font-mono font-black flex items-center justify-center shrink-0 shadow-[0.5px_0.5px_0_0_#000000] text-black">
                AI
              </div>
              <div className="p-2.5 rounded-lg border-2 border-black bg-white text-stone-500 text-[10px] font-bold flex items-center gap-1.5 shadow-[1px_1px_0_0_#000000]">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-black" /> Formulating response...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form console area */}
        <form 
          onSubmit={handleSendChatMessage}
          className="p-3 bg-white border-t-4 border-black flex gap-2 shrink-0 font-mono shadow-[0_-2px_0_0_#000000]"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about install docs, licensing, architecture compromises..."
            disabled={isLoading || !repo}
            className="flex-1 bg-white border-2 border-black rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:translate-y-[-0.5px] shadow-[1.5px_1.5px_0_0_#000000] focus:shadow-[2px_2px_0_0_#000000] transition-all font-sans font-bold"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !repo}
            className="p-2.5 bg-[#fde047] hover:bg-yellow-400 text-black border-2 border-black rounded-lg shadow-[1.5px_1.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-40"
            aria-label="Send Follow Up Question"
          >
            <Send className="h-3.5 w-3.5 stroke-[2.5px]" />
          </button>
        </form>

      </div>
    </div>
  );
}
