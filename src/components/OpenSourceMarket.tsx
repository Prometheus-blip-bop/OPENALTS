import React, { useState, useEffect } from "react";
import { appCache } from "../utils/cache";
import { API_BASE_URL } from "../config";
import { 
  Search, 
  RefreshCw, 
  Star, 
  GitFork, 
  Shield, 
  Share2, 
  ExternalLink, 
  Bookmark, 
  Sparkles,
  Database,
  Briefcase,
  PlayCircle,
  HelpCircle,
  Code,
  Sliders,
  Check,
  ChevronRight,
  Terminal,
  ArrowLeftRight
} from "lucide-react";
import { motion } from "motion/react";

interface OpenSourceMarketProps {
  onSelectRepo: (owner: string, name: string) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (repo: any) => void;
  onTriggerCompare: (repo: any) => void;
  isRepoSelectedForCompare: (slug: string) => boolean;
  onExplainRepo?: (repo: any) => void;
}

// Use Case Search database mapping exact tasks to specific open-source software queries
interface UseCaseMapping {
  task: string;
  query: string;
  icon: string;
  solution: string;
  exampleRepo: string;
}

const USE_CASES: UseCaseMapping[] = [
  {
    task: "clean audio background noise",
    query: "deepfilternet OR rnnoise OR noise-reduction audio",
    icon: "🔊",
    solution: "DeepFilterNet, RNNoise, noise-suppression utilities",
    exampleRepo: "Rinnakk/DeepFilterNet"
  },
  {
    task: "calculate real estate ROI",
    query: "mortgage-calculator OR financial-modeling OR real-estate-calculator",
    icon: "🏠",
    solution: "Real Estate ROI Calculators & Mortgage Analyzers",
    exampleRepo: "leandrovb/real-estate-calculator"
  },
  {
    task: "scrape websites automatically",
    query: "crawlee OR puppeteer-extra OR scrapers crawl",
    icon: "🕸️",
    solution: "Crawlee, Puppeteer, Scrapy - Intelligent web scraping",
    exampleRepo: "apify/crawlee"
  },
  {
    task: "generate text-to-speech speak voices",
    query: "coqui-tts OR bark OR piper speech",
    icon: "🗣️",
    solution: "Coqui TTS, Suno Bark, Piper rapid speech synthesizer",
    exampleRepo: "coqui-ai/TTS"
  },
  {
    task: "self-hosted database spreadsheet",
    query: "nocodb OR baserow OR directus database",
    icon: "📊",
    solution: "NocoDB, Baserow, Directus - Airtable/Notion SQL wrappers",
    exampleRepo: "nocodb/nocodb"
  },
  {
    task: "convert scanned PDF to structured text",
    query: "paddleocr OR tesseract OR pdf-extractor",
    icon: "📄",
    solution: "PaddleOCR, Tesseract OCR, dynamic document layout parsers",
    exampleRepo: "PaddlePaddle/PaddleOCR"
  },
  {
    task: "build visual system flowcharts",
    icon: "🎨",
    query: "excalidraw OR tldraw OR mermaid diagram",
    solution: "Excalidraw, Tldraw, Mermaid.js sketches & diagramming",
    exampleRepo: "excalidraw/excalidraw"
  },
  {
    task: "automatically orchestrate cron pipelines",
    icon: "🔄",
    query: "n8n OR temporal-io OR prefect workflows",
    solution: "n8n, Temporal.io, Prefect Workflow Automation Engines",
    exampleRepo: "n8n-io/n8n"
  },
  {
    task: "monitor server up-times and status page",
    icon: "👑",
    query: "uptime-kuma OR netdata status monitor",
    solution: "Uptime Kuma, Netdata, monitor engines",
    exampleRepo: "louislam/uptime-kuma"
  },
  {
    task: "build fast local full-text search backend",
    icon: "🔍",
    query: "meilisearch OR typesense OR zincsearch search",
    solution: "Meilisearch, Typesense, ZincSearch - Inverted indexed indices",
    exampleRepo: "meilisearch/meilisearch"
  }
];

export default function OpenSourceMarket({
  onSelectRepo,
  isBookmarked,
  onToggleBookmark,
  onTriggerCompare,
  isRepoSelectedForCompare,
  onExplainRepo
}: OpenSourceMarketProps) {
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selectedUseCase, setSelectedUseCase] = useState<UseCaseMapping | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [currentSort, setCurrentSort] = useState<"stars" | "updated">("stars");

  // Categories configuration list
  const categoryCards = [
    { id: "All", label: "All Repos", icon: Terminal, color: "bg-[#fde047]", desc: "All popular software repos" },
    { id: "AI", label: "AI Models", icon: Sparkles, color: "bg-[#c084fc]", desc: "LLMs, ML, & prompt models" },
    { id: "TTS", label: "Speech & Audio", icon: PlayCircle, color: "bg-[#86efac]", desc: "Speech, voice synth & cloning" },
    { id: "Database", label: "Databases", icon: Database, color: "bg-[#67e8f9]", desc: "SQL, NoSQL client, caches" },
    { id: "Finance", label: "Finance Tech", icon: Briefcase, color: "bg-[#fed7aa]", desc: "Trading, token ledgers, finance" },
    { id: "DevOps", label: "DevOps & Cloud", icon: Sliders, color: "bg-[#fbcfe8]", desc: "Kubernetes, Docker tools" }
  ];

  // Load Repositories from secure Server Proxy Route
  async function fetchGitHubRepos(reset: boolean = false, targetPage: number = 1, customQuery?: string, activeSort?: "stars" | "updated") {
    const activePage = reset ? 1 : targetPage;
    const queryParam = customQuery !== undefined ? customQuery : (selectedUseCase ? selectedUseCase.query : search);
    const sorting = activeSort || currentSort;
    const url = `${API_BASE_URL}/api/github/search?category=${encodeURIComponent(category)}&q=${encodeURIComponent(queryParam)}&page=${activePage}&sort=${sorting}`;

    // Use cached response if available
    if (appCache.has(url)) {
      const cachedData = appCache.get(url);
      if (reset) {
        setRepos(cachedData.items);
        setPage(1);
      } else {
        setRepos(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNew = cachedData.items.filter((r: any) => !existingIds.has(r.id));
          return [...prev, ...uniqueNew];
        });
      }
      setTotalCount(cachedData.total_count);
      setLoading(false);
      setLoadMoreLoading(false);
      return;
    }

    if (reset) {
      setLoading(true);
    } else {
      setLoadMoreLoading(true);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        appCache.set(url, { items, total_count: data.total_count || 0 });

        if (reset) {
          setRepos(items);
          setPage(1);
        } else {
          setRepos(prev => {
            const existingIds = new Set(prev.map(r => r.id));
            const uniqueNew = items.filter((r: any) => !existingIds.has(r.id));
            return [...prev, ...uniqueNew];
          });
        }
        setTotalCount(data.total_count || 0);
      } else {
        console.warn("GitHub API error received");
      }
    } catch (err) {
      console.error("Could not fetch github openalt search data:", err);
    } finally {
      setLoading(false);
      setLoadMoreLoading(false);
    }
  }

  // Reload when category shifts
  useEffect(() => {
    fetchGitHubRepos(true, 1);
  }, [category]);

  // Infinite scroll: dynamically fetch subsequent pages as user scrolls down
  useEffect(() => {
    function handleScroll() {
      if (loading || loadMoreLoading) return;
      if (repos.length === 0) return;
      if (totalCount > 0 && repos.length >= totalCount) return;

      const threshold = 350; // Increased threshold for a smoother experience
      const totalHeight = document.documentElement.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      if (totalHeight - windowHeight - scrollTop < threshold) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchGitHubRepos(false, nextPage);
      }
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, loadMoreLoading, repos.length, page, totalCount]);

  // Handle Copy shareable deep link
  function handleCopyShare(e: React.MouseEvent, item: any) {
    e.stopPropagation();
    const deepLink = `${window.location.origin}${window.location.pathname}?view=opensource_details&owner=${encodeURIComponent(item.owner.login)}&name=${encodeURIComponent(item.name)}`;
    navigator.clipboard.writeText(deepLink)
      .then(() => {
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch((err) => {
        console.warn("Failed to copy link:", err);
      });
  }

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header Panel */}
      <div className="bg-[#ddd6fe] p-6 md:p-8 border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-white opacity-20 rounded-full border-4 border-black translate-x-8 -translate-y-8 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-sans font-black tracking-tight text-black flex items-center gap-2">
              <Code className="h-7 w-7 text-black fill-[#a78bfa]" />
              Open Source Marketplace
            </h1>
            <p className="text-sm text-stone-800 font-bold max-w-2xl leading-relaxed">
              Find open replacements and sovereign community repositories matching proprietary tech. "There is an open source replacement for everything."
            </p>
          </div>
          
          <button
            onClick={() => {
              const nextSort = currentSort === "stars" ? "updated" : "stars";
              setCurrentSort(nextSort);
              fetchGitHubRepos(true, 1, undefined, nextSort);
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-50 text-black border-3 border-black rounded-xl text-xs font-black uppercase shadow-[3px_3px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 stroke-[3px] text-black ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search tool block */}
        <div className="relative">
          <Search className="absolute left-4 top-4 h-5 w-5 text-black stroke-[3px]" />
          <input
            id="repo-marketplace-search"
            type="text"
            value={search}
            onChange={(e) => {
              const val = e.target.value;
              setSearch(val);
              if (!val) {
                setSelectedUseCase(null);
                return;
              }
              // Active fuzzy matchmaking to map custom inputs to smart technical queries
              const matched = USE_CASES.find(uc => 
                uc.task.toLowerCase().includes(val.toLowerCase()) || 
                val.toLowerCase().includes(uc.task.toLowerCase())
              );
              if (matched) {
                setSelectedUseCase(matched);
              } else {
                setSelectedUseCase(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                fetchGitHubRepos(true, 1);
              }
            }}
            placeholder="Search tasks, problems, or tools (e.g. 'clean audio', 'real estate', 'database client')..."
            className="w-full bg-white border-4 border-black rounded-xl pl-12 pr-4 py-3.5 text-black text-sm placeholder-stone-600 font-bold focus:outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] shadow-[4px_4px_0_0_#000000] focus:shadow-[6px_6px_0_0_#000000] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono font-black text-black gap-2 pt-1 border-t border-black/10">
          <span>
            CATALOG SORT:{" "}
            <span className={`px-2 py-0.5 rounded border border-black ${currentSort === "stars" ? "bg-amber-100 text-black" : "bg-emerald-100 text-black"}`}>
              {currentSort === "stars" ? "⭐ MOST STARRED" : "🆕 RECENTLY UPDATED / FRESH"}
            </span>
          </span>
          <span className="text-stone-700 italic">
            Click "Refresh" to toggle stars vs. recently updated / newly created repos!
          </span>
        </div>

        {/* Dynamic Category card sliders */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-2 font-sans">
          {categoryCards.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`p-3 border-2 border-black rounded-xl transition-all text-left flex flex-col justify-between text-xs cursor-pointer ${cat.color} ${
                  isSelected 
                    ? "shadow-none translate-x-[1.5px] translate-y-[1.5px] ring-2 ring-black" 
                    : "hover:translate-x-[-1px] hover:translate-y-[-1px] shadow-[3px_3px_0_0_#000000] hover:shadow-[4.5px_4.5px_0_0_#000000]"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded bg-white border border-black shadow-[1px_1px_0_0_#000000]">
                  <Icon className="h-4 w-4 text-black stroke-[2.5px]" />
                </div>
                <div className="mt-3">
                  <h4 className="font-sans font-black text-black leading-tight truncate uppercase tracking-tight">{cat.label}</h4>
                  <p className="text-[9px] text-stone-700 font-bold mt-0.5 leading-none truncate">{cat.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task Use-Case Search Philosophy section */}
      <div className="bg-[#fffbeb] p-5 md:p-6 border-4 border-black rounded-2xl shadow-[5px_5px_0_0_#000000] space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600 fill-amber-300 animate-pulse shrink-0" />
            <h3 className="text-sm font-black uppercase text-black tracking-wider">
              The "Use Case" Search Philosophy
            </h3>
          </div>
          <p className="text-xs text-stone-800 font-bold mt-1 max-w-4xl">
            Sovereign open source code should be mapped to the actual human problems they solve. Instead of searching by software brand names, click any exact task below to let our smart database map it directly to high-quality matching repositories:
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {USE_CASES.map((uc, idx) => {
            const isChosen = selectedUseCase?.task === uc.task;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (isChosen) {
                    setSelectedUseCase(null);
                    setSearch("");
                    fetchGitHubRepos(true, 1, "");
                  } else {
                    setSelectedUseCase(uc);
                    setSearch(uc.task);
                    fetchGitHubRepos(true, 1, uc.query);
                  }
                }}
                className={`py-1.5 px-3 rounded-lg border-2 border-black text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[2px_2px_0_0_#000000] active:translate-y-0.5 active:shadow-none hover:-translate-y-0.5 cursor-pointer ${
                  isChosen
                    ? "bg-[#10b981] text-white shadow-none translate-y-0.5"
                    : "bg-white text-stone-800 hover:bg-stone-50"
                }`}
              >
                <span>{uc.icon}</span>
                <span>{uc.task}</span>
                {isChosen && <Check className="h-3.5 w-3.5 shrink-0 stroke-[3px]" />}
              </button>
            );
          })}
        </div>

        {selectedUseCase && (
          <div className="bg-[#f0f9ff] border-3 border-black p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-bold text-stone-800">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase font-black text-blue-600">Smart Resolution Map:</span>
                <span className="bg-blue-100 text-blue-800 text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-blue-200">
                  {selectedUseCase.task}
                </span>
                <span className="text-[10px] text-stone-500 font-medium">mapped to &rarr;</span>
                <span className="bg-sky-100 text-sky-800 text-[10px] font-mono px-2 py-0.5 rounded border border-sky-200 max-w-xs truncate" title={selectedUseCase.query}>
                  {selectedUseCase.query}
                </span>
              </div>
              <p className="font-bold text-stone-700 text-xs">
                Maps directly to solutions like <span className="text-black underline">{selectedUseCase.solution}</span> (e.g. <span className="font-mono text-black font-extrabold">{selectedUseCase.exampleRepo}</span>)
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedUseCase(null);
                setSearch("");
                fetchGitHubRepos(true, 1, "");
              }}
              className="px-3 py-1.5 bg-white hover:bg-stone-100 border-2 border-black rounded-lg text-[10px] font-black uppercase text-stone-800 self-start sm:self-center cursor-pointer shadow-[2px_2px_0_0_#000000] active:translate-y-0.5 active:shadow-none transition-all shrink-0"
            >
              Reset Use Case
            </button>
          </div>
        )}
      </div>

      {/* Main Stream list of items fetched */}
      {loading ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-2 border-dashed border-stone-200 pb-2">
            <div className="h-4 w-48 bg-stone-300 animate-pulse rounded"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border-4 border-black rounded-2xl p-4 shadow-[5px_5px_0_0_#000000] animate-pulse flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top line skeleton */}
                  <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 bg-stone-300 rounded border border-black shrink-0"></div>
                      <div className="h-3 w-20 bg-stone-200 rounded"></div>
                    </div>
                    <div className="h-4 w-12 bg-amber-100 border border-black rounded shadow-[1px_1px_0_0_#000000]"></div>
                  </div>

                  {/* Title & description skeleton */}
                  <div className="space-y-2.5">
                    <div className="h-5 w-3/4 bg-stone-300 rounded"></div>
                    <div className="space-y-1.5">
                      <div className="h-3 w-full bg-stone-200 rounded"></div>
                      <div className="h-3 w-11/12 bg-stone-200 rounded"></div>
                      <div className="h-3 w-4/5 bg-stone-200 rounded"></div>
                    </div>
                  </div>

                  {/* Tags skeleton */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <div className="h-4.5 w-14 bg-purple-100 border border-black rounded-md"></div>
                    <div className="h-4.5 w-16 bg-stone-100 border border-black rounded-md"></div>
                    <div className="h-4.5 w-10 bg-green-100 border border-black rounded-md"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <div className="h-3.5 w-24 bg-stone-200 rounded"></div>
                  <div className="h-5 w-5 bg-stone-200 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : repos.length === 0 ? (
        <div className="bg-white border-4 border-black p-12 text-center flex flex-col items-center justify-center space-y-4 rounded-2xl shadow-[6px_6px_0_0_#000000]">
          <div className="p-3 border border-black rounded-lg bg-[#ddd6fe]">
            <HelpCircle className="h-8 w-8 text-black" />
          </div>
          <div>
            <p className="font-sans font-black text-black text-lg uppercase leading-normal">No Open Source Alternatives Matched</p>
            <p className="text-xs text-stone-700 max-w-sm font-bold leading-relaxed mt-1">
              Try adjusting your query terms, selecting another high-level topic category, or resetting filters!
            </p>
          </div>
          <button
            onClick={() => { setSearch(""); setCategory("All"); }}
            className="px-4 py-2 bg-[#fde047] hover:bg-[#facc15] text-black border-2 border-black rounded-lg text-xs font-black uppercase shadow-[2px_2px_0_0_#000000] cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-2 border-dashed border-stone-300 pb-2">
            <span className="font-mono text-xs font-black uppercase text-stone-700">
              Discovered Match Counts ({totalCount > 1000 ? "1000+" : totalCount})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {repos.map((item) => {
              const uniqueSlug = `${item.owner.login}/${item.name}`;
              const isFav = isBookmarked(uniqueSlug);
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectRepo(item.owner.login, item.name)}
                  className="group bg-white border-4 border-black rounded-2xl p-4 shadow-[5px_5px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[7px_7px_0_0_#000000] transition-all flex flex-col justify-between space-y-4 cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img 
                          src={item.owner?.avatar_url} 
                          alt="" 
                          className="h-5 w-5 rounded border border-black shrink-0" 
                        />
                        <span className="text-[10px] font-mono font-black text-stone-600 truncate max-w-[120px]">
                          {item.owner?.login}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 bg-yellow-300 border border-black px-1.5 py-0.5 rounded text-[10px] font-mono font-black text-black shadow-[1px_1px_0_0_#000000]">
                        <Star className="h-3 w-3 text-black fill-black shrink-0" />
                        <span>{item.stargazers_count >= 1000 ? (item.stargazers_count / 1000).toFixed(1) + "k" : item.stargazers_count}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-sans font-black text-black group-hover:underline flex items-center justify-between gap-2">
                        <span className="truncate">{item.name}</span>
                        <ChevronRight className="h-4 w-4 stroke-[2.5px] scale-0 group-hover:scale-100 transition-all text-black shrink-0" />
                      </h4>
                      <p className="text-[11px] text-stone-600 font-semibold leading-relaxed line-clamp-3 mt-1.5">
                        {item.description || "No descriptions submitted for this openalt candidate index."}
                      </p>
                    </div>

                    {/* Language and License tags */}
                    <div className="flex flex-wrap gap-2 pt-1 font-mono text-[9px] font-black">
                      {item.language && (
                        <span className="bg-[#ddd6fe] text-black border border-black rounded-md px-1.5 py-0.5">
                          {item.language}
                        </span>
                      )}
                      
                      {item.license && (
                        <span className="bg-stone-100 text-stone-800 border border-black rounded-md px-1.5 py-0.5 flex items-center gap-1 truncate max-w-[150px]">
                          <Shield className="h-3 w-3 stroke-[2.5px] text-black" />
                          {item.license.spdx_id || "MIT"}
                        </span>
                      )}

                      <span className="bg-[#86efac] text-black border border-black rounded-md px-1.5 py-0.5 flex items-center gap-1">
                        <GitFork className="h-3 w-3 text-black" />
                        {item.forks_count}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t-2 border-dashed border-stone-200 flex items-center justify-between">
                    <span className="text-[9px] font-mono font-black uppercase text-[#9333ea] group-hover:underline">
                      SPEC & CODE DETAILS &rarr;
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Compare Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTriggerCompare({
                            id: uniqueSlug,
                            name: item.name,
                            owner: item.owner.login,
                            description: item.description || "",
                            url: item.html_url,
                            stars: item.stargazers_count,
                            forks: item.forks_count,
                            language: item.language || "TypeScript",
                            license: item.license?.spdx_id || "MIT"
                          });
                        }}
                        className={`p-1.5 rounded-lg border-2 border-black transition-all shadow-[1.5px_1.5px_0_0_#000000] cursor-pointer ${
                          isRepoSelectedForCompare(uniqueSlug) ? "bg-[#fde047] text-black ring-2 ring-black" : "bg-[#eff6ff] text-[#2563eb] hover:bg-blue-50"
                        }`}
                        title="Add to Comparison Matcher"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 stroke-[2.5px]" />
                      </button>

                      {/* Copy Shareable deep link Button */}
                      <button
                        onClick={(e) => handleCopyShare(e, item)}
                        className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-stone-50 text-black shadow-[1.5px_1.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer relative"
                        title="Copy Repo Shareable Link"
                      >
                        {copiedId === item.id ? (
                          <span className="text-[8px] font-mono font-black text-green-600">Copied!</span>
                        ) : (
                          <Share2 className="h-3.5 w-3.5 stroke-[2.5px]" />
                        )}
                      </button>

                      {/* AI Repo Explainer Button */}
                      {onExplainRepo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExplainRepo({
                              owner: item.owner.login,
                              name: item.name,
                              description: item.description || "",
                              stars: item.stargazers_count,
                              forks: item.forks_count,
                              language: item.language || "TypeScript",
                              license: item.license?.spdx_id || "MIT"
                            });
                          }}
                          className="p-1.5 rounded-lg border-2 border-black bg-[#ddd6fe] text-[#7c3aed] hover:bg-purple-100 transition-all shadow-[1.5px_1.5px_0_0_#000000] cursor-pointer"
                          title="Ask AI to Explain Repo"
                        >
                          <Sparkles className="h-3.5 w-3.5 stroke-[2.5px] fill-purple-200" />
                        </button>
                      )}

                      {/* Bookmark Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark({
                            id: `${item.owner.login}/${item.name}`,
                            name: item.name,
                            description: item.description || "",
                            url: item.html_url,
                            stars: item.stargazers_count,
                            forks: item.forks_count,
                            language: item.language || "TypeScript",
                            license: item.license?.spdx_id || "MIT",
                            type: "open-source"
                          });
                        }}
                        className={`p-1.5 rounded-lg border-2 border-black transition-all shadow-[1.5px_1.5px_0_0_#000000] cursor-pointer ${
                          isFav ? "bg-[#ec4899] text-white" : "bg-white text-black hover:bg-stone-50"
                        }`}
                        title="Bookmark alternative tool"
                      >
                        <Bookmark className={`h-3.5 w-3.5 stroke-[2px] ${isFav ? "fill-white" : ""}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {loadMoreLoading && (
            <div className="py-8 text-center flex items-center justify-center gap-2 bg-stone-50 border-4 border-black border-dashed rounded-2xl">
              <RefreshCw className="h-4 w-4 animate-spin text-black" />
              <span className="font-mono text-xs font-black uppercase text-stone-700">Streaming page {page}...</span>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
