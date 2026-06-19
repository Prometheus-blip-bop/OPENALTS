import React, { useState, useEffect } from "react";
import { appCache } from "../utils/cache";
import { 
  AlertCircle, 
  ArrowLeft, 
  BarChart, 
  ExternalLink, 
  GitBranch, 
  GitCommit, 
  GitFork, 
  GitMerge, 
  GitPullRequest, 
  Github, 
  Globe, 
  Info, 
  MessageSquare, 
  Play, 
  Scale, 
  Server, 
  Shield, 
  Sparkles, 
  Star, 
  Terminal, 
  Users,
  Share2,
  Bookmark,
  RefreshCw,
  BookOpen,
  Code,
  CheckCircle2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { API_BASE_URL } from "../config";
import { motion } from "motion/react";

function sanitizeDescription(desc: string): string {
  if (!desc) return "";
  let cleaned = desc.replace(/<[^>]*>/g, "");
  cleaned = cleaned
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return cleaned;
}

function cleanAndResolveReadme(content: string, owner: string, repoName: string, defaultBranch: string = "master"): string {
  if (!content) return "";

  const branch = defaultBranch || "master";
  const rawBaseUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}`;

  // 1. Replace HTML img tags with Markdown images or resolve their src
  let resolved = content.replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi, (match, src) => {
    let absoluteSrc = src;
    if (src && !src.startsWith("http://") && !src.startsWith("https://") && !src.startsWith("data:") && !src.startsWith("//")) {
      const cleanSrc = src.startsWith("/") ? src.slice(1) : src;
      absoluteSrc = `${rawBaseUrl}/${cleanSrc}`;
    }
    return `![image](${absoluteSrc})`;
  });

  // 2. Resolve regular Markdown images with relative paths
  resolved = resolved.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    let absoluteSrc = src;
    if (src && !src.startsWith("http://") && !src.startsWith("https://") && !src.startsWith("data:") && !src.startsWith("//")) {
      const cleanSrc = src.startsWith("/") ? src.slice(1) : src;
      absoluteSrc = `${rawBaseUrl}/${cleanSrc}`;
    }
    return `![${alt}](${absoluteSrc})`;
  });

  // 3. Clean up other common block HTML wrappers that could cause rendering pollution
  resolved = resolved.replace(/<p[^>]*>/gi, "\n");
  resolved = resolved.replace(/<\/p>/gi, "\n");
  resolved = resolved.replace(/<br\s*\/?>/gi, "\n");
  resolved = resolved.replace(/<div[^>]*>/gi, "\n");
  resolved = resolved.replace(/<\/div>/gi, "\n");

  return resolved;
}

interface OpenSourceDetailsPageProps {
  owner: string;
  name: string;
  onBack: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (repo: any) => void;
}

export default function OpenSourceDetailsPage({
  owner,
  name,
  onBack,
  isBookmarked,
  onToggleBookmark
}: OpenSourceDetailsPageProps) {
  const [repo, setRepo] = useState<any>(null);
  const [readme, setReadme] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Suggestions states
  const [similarRepos, setSimilarRepos] = useState<any[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  // Fetch Repository Specs & README Details
  useEffect(() => {
    async function loadAllDetails() {
      // 1. Check local memory cache first
      const cached = appCache.getRepoDetails(owner, name);
      if (cached) {
        setRepo(cached.repo);
        setReadme(cached.readme);
        setSimilarRepos(cached.similarRepos);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fetch Details
        const repoRes = await fetch(`${API_BASE_URL}/api/github/repo?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}`);
        if (!repoRes.ok) {
          throw new Error("Could not load github repository criteria specs data");
        }
        const repoData = await repoRes.json();
        setRepo(repoData);

        // Fetch README
        let readmeText = "";
        const readmeRes = await fetch(`${API_BASE_URL}/api/github/readme?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}`);
        if (readmeRes.ok) {
          const readmeData = await readmeRes.json();
          readmeText = readmeData.content || "";
          setReadme(readmeText);
        }

        // Load similar suggestions and wait for it
        const loadedSimilar = await fetchAndSetSuggestions(repoData.language || "TypeScript", repoData.name);

        // Save to cache state
        appCache.setRepoDetails(owner, name, {
          repo: repoData,
          readme: readmeText,
          similarRepos: loadedSimilar
        });

      } catch (err: any) {
        setError(err.message || "Failed to load details");
      } finally {
        setLoading(false);
      }
    }
    loadAllDetails();
  }, [owner, name]);

  // Load Similar suggestions
  async function fetchAndSetSuggestions(lang: string, repoName: string): Promise<any[]> {
    setSimilarLoading(true);
    let items: any[] = [];
    try {
      const qStr = `language:${encodeURIComponent(lang)}`;
      const res = await fetch(`${API_BASE_URL}/api/github/search?category=All&q=${qStr}`);
      if (res.ok) {
        const searchData = await res.json();
        items = (searchData.items || [])
          .filter((item: any) => item.name.toLowerCase() !== repoName.toLowerCase())
          .slice(0, 5);
        setSimilarRepos(items);
      }
    } catch (err) {
      console.warn("Could not fetch similar suggestion repos:", err);
    } finally {
      setSimilarLoading(false);
    }
    return items;
  }

  // Copy shareable link
  function handleShare() {
    const shareUrl = `${window.location.origin}${window.location.pathname}?view=opensource_details&owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.warn("Could not copy link:", err);
      });
  }

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center space-y-4 font-sans">
        <RefreshCw className="h-10 w-10 text-black animate-spin stroke-[2.5px]" />
        <p className="text-xs font-mono text-stone-700 font-extrabold uppercase tracking-widest">
          Mining GitHub specs & Markdown documentation...
        </p>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="bg-white border-4 border-black p-12 text-center flex flex-col items-center justify-center space-y-4 rounded-2xl shadow-[6px_6px_0_0_#000000] font-sans">
        <AlertCircle className="h-10 w-10 text-red-500 stroke-[2.5px]" />
        <div>
          <p className="text-sm font-mono font-black text-black uppercase">Retrieval Issue Context</p>
          <p className="text-xs text-stone-600 font-bold max-w-sm mt-1">{error || "Could not retrieve repository criteria details."}</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#fde047] hover:bg-[#facc15] text-black border-2 border-black rounded-lg text-xs font-black uppercase shadow-[2px_2px_0_0_#000000] transition-all cursor-pointer"
        >
          Return to List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Upper Navigation Row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-black rounded-lg text-xs font-black uppercase shadow-[3px_3px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#000000] transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-black stroke-[3px]" />
          <span>Go Back</span>
        </button>

        {copied && (
          <div className="flex items-center gap-1 bg-[#86efac] border-2 border-black rounded-lg px-3 py-1.5 text-[10px] font-mono font-black text-black shadow-[2px_2px_0_0_#000000] animate-bounce">
            <CheckCircle2 className="h-3.5 w-3.5 text-black stroke-[2.5px]" />
            <span>DEEP-LINK COPIED TO CLIPBOARD</span>
          </div>
        )}
      </div>

      {/* Main Structural Twin Columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Repo Specifications and README */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-4 border-black p-6 rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-4">
            
            {/* Owner & Name Info */}
            <div className="flex items-start justify-between flex-wrap gap-4 border-b-2 border-black pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <img 
                    src={repo.owner?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50"} 
                    alt={repo.owner?.login} 
                    className="h-7 w-7 rounded-md border border-black" 
                  />
                  <span className="text-xs font-mono font-black text-stone-700 hover:underline">
                    <a href={repo.owner?.html_url} target="_blank" rel="noopener noreferrer">
                      {repo.owner?.login}
                    </a>
                  </span>
                </div>
                <h1 className="text-2xl font-sans font-black text-black leading-tight tracking-tight">
                  {repo.name}
                </h1>
                <p className="text-xs text-stone-600 font-bold leading-relaxed">{sanitizeDescription(repo.description)}</p>
              </div>

              {/* Functional Actions Frame */}
              <div className="flex items-center gap-2">
                {/* Share Button (copies link) */}
                <button
                  onClick={handleShare}
                  className="p-2 border-2 border-black rounded-lg bg-[#ddd6fe] hover:bg-[#c084fc] text-black shadow-[2px_2px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  title="Copy deep link to repo"
                >
                  <Share2 className="h-4 w-4 text-black stroke-[2.5px]" />
                </button>

                {/* Bookmark Toggle */}
                <button
                  onClick={() => onToggleBookmark(repo)}
                  className={`p-2 border-2 border-black rounded-lg transition-all shadow-[2px_2px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer ${
                    isBookmarked ? "bg-[#ec4899] text-white" : "bg-white text-black hover:bg-stone-50"
                  }`}
                  title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
                >
                  <Bookmark className={`h-4 w-4 stroke-[2.5px] ${isBookmarked ? "fill-white" : ""}`} />
                </button>

                {/* External URL Website */}
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#fde047] hover:bg-[#facc15] text-black border-2 border-black rounded-lg text-xs font-black uppercase shadow-[2.5px_2.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                >
                  <ExternalLink className="h-4 w-4 stroke-[2.5px]" />
                  <span>GitHub</span>
                </a>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 font-mono text-xs">
              
              <div className="border-2 border-black p-3 rounded-xl bg-[#fbcfe8] text-black shadow-[2.5px_2.5px_0_0_#000000] flex flex-col justify-between">
                <span className="text-[10px] font-black text-stone-700 uppercase">STARS</span>
                <span className="text-lg font-black flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 text-black fill-black shrink-0" />
                  {repo.stargazers_count?.toLocaleString() || 0}
                </span>
              </div>

              <div className="border-2 border-black p-3 rounded-xl bg-[#67e8f9] text-black shadow-[2.5px_2.5px_0_0_#000000] flex flex-col justify-between">
                <span className="text-[10px] font-black text-stone-700 uppercase">FORKS</span>
                <span className="text-lg font-black flex items-center gap-1 mt-1">
                  <GitFork className="h-4 w-4 text-black shrink-0" />
                  {repo.forks_count?.toLocaleString() || 0}
                </span>
              </div>

              <div className="border-2 border-black p-3 rounded-xl bg-[#86efac] text-black shadow-[2.5px_2.5px_0_0_#000000] flex flex-col justify-between">
                <span className="text-[10px] font-black text-stone-700 uppercase">PRIMARY LANG</span>
                <span className="text-xs font-black truncate flex items-center gap-1 mt-1">
                  <Code className="h-4 w-4 text-black shrink-0" />
                  {repo.language || "N/A"}
                </span>
              </div>

              <div className="border-2 border-black p-3 rounded-xl bg-[#fed7aa] text-black shadow-[2.5px_2.5px_0_0_#000000] flex flex-col justify-between">
                <span className="text-[10px] font-black text-stone-700 uppercase">LICENSE</span>
                <span className="text-xs font-black truncate flex items-center gap-1 mt-1">
                  <Shield className="h-4 w-4 text-black shrink-0" />
                  {repo.license?.name || repo.license?.spdx_id || "None declared"}
                </span>
              </div>

            </div>

            {/* Sub-header statistics details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs font-mono">
              <div className="border border-black bg-stone-50 p-2.5 rounded-lg">
                <span className="text-[9px] font-black text-stone-500 uppercase">Open Issues Counting</span>
                <p className="font-extrabold text-[#b91c1c] text-sm mt-0.5">{repo.open_issues_count || "0"} Active Issues</p>
              </div>
              <div className="border border-black bg-stone-50 p-2.5 rounded-lg">
                <span className="text-[9px] font-black text-stone-500 uppercase">Last Repository Push</span>
                <p className="font-extrabold text-stone-800 text-sm mt-0.5">
                  {repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>

          </div>

          {/* Large Readme panel rendering */}
          <div className="bg-white border-4 border-black p-6 rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-4">
            <h2 className="text-lg font-sans font-black text-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 border-black pb-2.5">
              <BookOpen className="h-5 w-5 text-black stroke-[2.5px]" />
              Repository README & Setup Manual
            </h2>
            
            <div className="prose max-w-none prose-stone prose-headings:font-sans prose-headings:font-black prose-headings:text-black prose-p:text-xs prose-p:font-semibold prose-p:leading-relaxed prose-a:text-[#8b5cf6] prose-a:underline font-sans text-xs overflow-wrap break-all select-text">
              <div className="markdown-body">
                <Markdown>{cleanAndResolveReadme(readme, owner, name, repo.default_branch)}</Markdown>
              </div>
            </div>
          </div>
        </div>

        {/* Right Corner Top Side: "Similar Repositories" Suggestions Window */}
        <div className="space-y-6">
          <div className="bg-[#fbcfe8] border-4 border-black p-5 rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-4">
            <div className="border-b-2 border-black pb-2">
              <span className="font-mono font-black text-[9px] uppercase text-stone-700 leading-none">Recommendation Engine</span>
              <h2 className="text-sm font-sans font-black text-black uppercase tracking-wider mt-0.5">
                Similar Repositories
              </h2>
            </div>

            {similarLoading ? (
              <div className="py-4 text-center space-y-2">
                <RefreshCw className="h-5 w-5 text-black animate-spin mx-auto" />
                <p className="text-[10px] font-mono text-stone-700 font-bold uppercase">Mining alternatives...</p>
              </div>
            ) : similarRepos.length === 0 ? (
              <p className="text-[11px] text-stone-700 italic font-bold py-2">
                No similar alternatives found in language segment.
              </p>
            ) : (
              <div className="space-y-3 font-sans text-xs">
                {similarRepos.map((item) => (
                  <a
                    key={item.id}
                    href={`?view=opensource_details&owner=${encodeURIComponent(item.owner.login)}&name=${encodeURIComponent(item.name)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      // reload with this repository
                      window.history.pushState(null, "", `?view=opensource_details&owner=${encodeURIComponent(item.owner.login)}&name=${encodeURIComponent(item.name)}`);
                      // trigger custom scroll to top and state hook
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      window.location.reload();
                    }}
                    className="block border-2 border-black bg-white rounded-xl p-3 shadow-[2px_2px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3.5px_3.5px_0_0_#000000] transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-1.5 mb-1.5">
                      <span className="font-mono text-[10px] font-black text-stone-600 truncate max-w-[140px]">
                        {item.owner?.login}
                      </span>
                      <div className="flex items-center gap-1 bg-yellow-200 border border-black px-1.5 py-0.5 rounded text-[9px] font-mono font-black">
                        <Star className="h-3 w-3 fill-black text-black shrink-0" />
                        <span>{item.stargazers_count >= 1000 ? (item.stargazers_count / 1000).toFixed(1) + "k" : item.stargazers_count}</span>
                      </div>
                    </div>
                    
                    <h3 className="font-black text-xs text-black group-hover:underline">
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-stone-600 font-bold leading-snug line-clamp-2 mt-1">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      <span className="bg-[#ddd6fe] text-black border border-black rounded px-1.5 py-0.5 text-[8px] font-mono font-black">
                        {item.language || "TypeScript"}
                      </span>
                      {item.license && (
                        <span className="bg-stone-50 text-stone-700 border border-black rounded px-1.5 py-0.5 text-[8px] font-mono font-black truncate max-w-[100px]">
                          {item.license.spdx_id || "MIT"}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
