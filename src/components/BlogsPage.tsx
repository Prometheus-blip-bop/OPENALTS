import React, { useState, useEffect } from "react";
import { 
  BookOpen, Calendar, User, Search, Clock, ChevronRight, Terminal, Award, 
  HelpCircle, Globe, Database, Sparkles, Cpu, Layers, Settings, Shuffle, 
  TrendingUp, Coins, Share2, Info, CheckCircle
} from "lucide-react";
import Markdown from "react-markdown";
import { db } from "../firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { 
  decodePSEOId, getRandomPSEO, searchPSEO, generatePSEOArticle, 
  PSEOItem, ALTERNATIVES, COUNTERPARTS, ANGLES, ENVIRONMENTS 
} from "../utils/pseoEngine";


interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  role: string;
  publishDate: string;
  readTime: string;
  category: string;
  tags: string[];
}

const ENGINE_BLOGS: BlogPost[] = [
  {
    id: "self-host-database",
    title: "The Ultimate Guide to Self-Hosting PostgreSQL on Cloud SQL with Scaled Ingress",
    excerpt: "Learn how we configured high-throughput PostgreSQL for 500,000 active devices with custom read-replicas, multi-tenant schemas, and auto-vacuuming optimizations.",
    content: `## The Self-Hosting Revolution

As SaaS products scale, database pricing under proprietary models can become astronomical. Moving to standard **PostgreSQL** or **Cloud SQL** is the single most effective way to secure absolute data sovereignty, reduce database overhead by up to **80%**, and establish total vendor independence.

### The Standard Architecture

For standard multi-tenant architectures, we configure high-performance replication pools using:
- **Primary Node**: Handles heavy write queries, transactional states, and batch upserts.
- **Read Replicas**: Decouples analytical dashboard telemetry and search listing filters from core operations.

\`\`\`sql
-- Sample highly tuned connection pooling strategy
ALTER SYSTEM SET max_connections = 500;
ALTER SYSTEM SET shared_buffers = '4GB'; -- Match 25% of memory allocation
ALTER SYSTEM SET work_mem = '32MB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
\`\`\`

### The Strategy for Multi-Tenant Partitioning
To guarantee zero-trust boundaries at the database level, implement **Row-Level Security (RLS)**:

\`\`\`sql
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON user_data
    USING (tenant_id = current_setting('app.current_tenant_id'));
\`\`\`

This guarantees that even if a server-side query is misconfigured, no data can leak across user segments. Keep building dynamically!`,
    author: "Elena Rostova",
    role: "Core Infra Systems Eng",
    publishDate: "June 10, 2026",
    readTime: "6 min read",
    category: "Infrastructure",
    tags: ["databases", "self-hosting", "postgres", "cloud-sql"]
  },
  {
    id: "firebase-to-raw-cloud",
    title: "Vaporizing the Vendor Lock-In: Migrating off Complex Proprietary BaaS Frameworks",
    excerpt: "A standard, concrete blueprint for moving real-time subscriptions, nested profiles, and complex asset blobs safely into self-consistent SQL tables.",
    content: `## Why Migrate Off Proprietary Backend-as-a-Service?

Proprietary BaaS backends excel at 24-hour hackathons, but they eventually present painful bottlenecks:
1. **Unpredictable Pricing**: O(N) operations can easily trigger massive unexpected billing cycles on deep collection reads.
2. **Brittle Queries**: Complex sorting, full-text operations, and joins are structurally limited in document-based document stores.
3. **Data Lock-In**: Having schemas defined solely on the client-side degrades backend validation over time.

### The Modern Modular Alternative
Instead, we recommend utilizing a **modular stack** combining:
- **Express / Node.js**: Type-safe REST and real-time WebSockets.
- **Drizzle ORM**: Transparent SQL generation with automated migrations.
- **PostgreSQL / Cloud SQL**: Solid-state relatory database with rich constraint guards.

### Step 1: Mapping NoSQL Documents to Consistent SQL Relations
NoSQL models are usually denormalized. Here is how we decompose a typical nested user-profile into safe SQL declarations:

\`\`\`typescript
export const usersRelation = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
\`\`\``,
    author: "Jake Wheelock",
    role: "Senior Solutions Architect",
    publishDate: "June 08, 2026",
    readTime: "9 min read",
    category: "Development",
    tags: ["migration", "firebase", "sql", "architecture"]
  },
  {
    id: "tailwind-v4-performance",
    title: "Mastering Tailwind v4: Brutalist Web Aesthetics and Sub-10ms Paint Benchmarks",
    excerpt: "How we leveraged compiled CSS-engine plugins, custom theme variables, and neo-minimalist contrast design to build pages that load instantly everywhere.",
    content: `## Brutalism & Extreme Performance

Brutalist web design is more than a creative aesthetic — it is a pledge to high accessibility, visual honesty, and extreme utility. By stripping unnecessary background gradients, deep drop shadows, and complex state charts, we create interfaces that load with **almost-zero latency**.

### Building with Tailwind v4 CSS Assets
Tailwind v4 comes with outstanding native performance enhancements by compiling styles directly inside Vite pipelines:

\`INCOMING CSS:\`
\`\`\`css
@import "tailwindcss";

@theme {
  --color-neo-pink: #fbcfe8;
  --color-neo-yellow: #fde047;
  --font-display: "Space Grotesk", sans-serif;
}
\`\`\`

### Implementing the Brutalist Button Accent
Achieve high-contrast tactile feel using clean black borders and hard shadow-offsets:

\`\`\`html
<button className="px-4 py-2 bg-neo-yellow border-4 border-black font-black uppercase text-xs rounded-xl shadow-[4px_4px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5.5px_5.5px_0_0_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-100">
  Tactile Widget
</button>
\`\`\`

By ensuring zero runtime layout shifts (CLS), users on mobile devices or low-bandwidth environments can discover and upvote alternatives with impeccable speed.`,
    author: "Maya Lin",
    role: "Brutalist Design Lead",
    publishDate: "May 25, 2026",
    readTime: "4 min read",
    category: "Design",
    tags: ["tailwind", "css", "brutalism", "performance"]
  }
];

export default function BlogsPage() {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dynamicBlogs, setDynamicBlogs] = useState<BlogPost[]>([]);

  // Programmatic SEO (pSEO) Module States
  const [activeBlogMode, setActiveBlogMode] = useState<"editorial" | "pseo">("editorial");
  const [selectedPSEO, setSelectedPSEO] = useState<PSEOItem | null>(null);
  const [pseoQuery, setPseoQuery] = useState("");
  const [pseoList, setPseoList] = useState<PSEOItem[]>([]);
  const [calculatorMAU, setCalculatorMAU] = useState(25000);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [visiblePseoCount, setVisiblePseoCount] = useState(24);
  const [isInfiniteScrolling, setIsInfiniteScrolling] = useState(false);

  // Sync pagination count on query update
  useEffect(() => {
    setVisiblePseoCount(24);
  }, [pseoQuery]);

  // Sync pSEO matches list whenever the query resets or count increments
  useEffect(() => {
    const results = searchPSEO(pseoQuery, visiblePseoCount);
    setPseoList(results);
  }, [pseoQuery, visiblePseoCount]);

  // Auto-scroll loading loop
  useEffect(() => {
    if (activeBlogMode !== "pseo" || selectedPSEO) return;

    function handleScroll() {
      const threshold = 350; // px distance from bottom
      const totalHeight = document.documentElement.scrollHeight;
      const scrollPosition = window.innerHeight + window.scrollY;

      if (totalHeight - scrollPosition < threshold) {
        setIsInfiniteScrolling(true);
        // Load the next portion!
        setVisiblePseoCount((prev) => prev + 18);
        setTimeout(() => setIsInfiniteScrolling(false), 300);
      }
    }

    const opt = { passive: true };
    window.addEventListener("scroll", handleScroll, opt);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeBlogMode, selectedPSEO]);

  const categories = ["All", "Infrastructure", "Development", "Design", "AI Comparison"];

  useEffect(() => {
    async function loadComparisonBlogs() {
      try {
        const querySnapshot = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
        const posts: BlogPost[] = [];
        querySnapshot.forEach((docSnap) => {
          if (docSnap.id.startsWith("post_aeo_")) {
            const data = docSnap.data();
            const date = data.createdAt 
              ? (typeof data.createdAt.toDate === "function" ? data.createdAt.toDate().toLocaleDateString() : new Date(data.createdAt).toLocaleDateString()) 
              : "Recently";
            
            // Clean up content snippet for excerpt
            const cleanExcerpt = (data.content || "")
              .substring(0, 180)
              .replace(/[#*`>_\-]/g, "")
              .trim() + "...";

            posts.push({
              id: docSnap.id,
              title: data.title || "AI Comparison Duel",
              content: data.content || "",
              excerpt: cleanExcerpt,
              author: data.authorName || "OpenAlt AI Agent",
              role: "AI Spec Analyst",
              publishDate: date,
              readTime: "5 min read",
              category: "AI Comparison",
              tags: data.tags || ["AEO"]
            });
          }
        });
        setDynamicBlogs(posts);
      } catch (err) {
        console.warn("Failed to load dynamic comparison blogs:", err);
      }
    }
    loadComparisonBlogs();
  }, []);

  const allBlogs = [...ENGINE_BLOGS, ...dynamicBlogs];

  const filtered = allBlogs.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(search.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(search.toLowerCase()) ||
                          post.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === "All" || post.category === selectedCategory;
    return matchesSearch && matchesCat;
  });


  return (
    <div className="space-y-8 font-sans">
      
      {/* Header Flare banner */}
      <div className="bg-[#67e8f9] p-6 md:p-8 border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-cyan-200 opacity-40 rounded-full border-4 border-dashed border-black translate-x-12 -translate-y-12 pointer-events-none" />
        <h1 className="text-3xl font-black text-black tracking-tight flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-black fill-cyan-100 stroke-[2.5px]" />
          OpenAlt Engineering Blog
        </h1>
        <p className="text-sm text-stone-850 font-bold max-w-xl leading-relaxed">
          In-depth tutorials, self-hosting configurations, migration blueprints, and expert guidelines for taking back control of your developer data.
        </p>
      </div>

      {/* Mode Navigation Bar */}
      <div className="flex border-4 border-black rounded-xl p-1.5 bg-stone-100 gap-1.5 shadow-[3px_3px_0_0_#000000]">
        <button
          onClick={() => {
            setActiveBlogMode("editorial");
            setSelectedPost(null);
            setSelectedPSEO(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all select-none cursor-pointer ${
            activeBlogMode === "editorial"
              ? "bg-[#67e8f9] text-black border-2 border-black shadow-[2px_2px_0_0_#000000] translate-x-[-1px] translate-y-[-1px]"
              : "bg-white text-stone-600 hover:text-black hover:bg-stone-50 border-2 border-transparent"
          }`}
        >
          <BookOpen className="h-4 w-4 stroke-[2.5px]" />
          <span>Organic Editorial Guides</span>
        </button>

        <button
          onClick={() => {
            setActiveBlogMode("pseo");
            setSelectedPost(null);
            setSelectedPSEO(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all select-none cursor-pointer ${
            activeBlogMode === "pseo"
              ? "bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0_0_#000000] translate-x-[-1px] translate-y-[-1px]"
              : "bg-white text-stone-600 hover:text-black hover:bg-stone-50 border-2 border-transparent"
          }`}
        >
          <Globe className="h-4 w-4 stroke-[2.5px] text-purple-700" />
          <span className="flex items-center gap-1.5">
            977,500+ pSEO Knowledgebase
            <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase leading-none font-black animate-pulse">
              LIVE
            </span>
          </span>
        </button>
      </div>

      {/* RENDER MODE A: EDITORIAL ORGANIC BLOGS */}
      {activeBlogMode === "editorial" && (
        <>
          {selectedPost ? (
            <div className="space-y-6">
              <button
                onClick={() => setSelectedPost(null)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-black rounded-lg text-xs font-black uppercase shadow-[3px_3px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#000000] transition-all cursor-pointer"
              >
                &larr; Back to Articles
              </button>

              <div className="bg-white border-4 border-black p-6 md:p-8 rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-6">
                <div className="border-b-2 border-black pb-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-black text-stone-600">
                    <span className="bg-[#ccdffd] border border-black text-blue-900 px-2 py-0.5 rounded-md uppercase">
                      {selectedPost.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {selectedPost.publishDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {selectedPost.readTime}
                    </span>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-black text-black leading-tight tracking-tight">
                    {selectedPost.title}
                  </h1>

                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full border-2 border-black bg-[#ddd6fe] flex items-center justify-center font-black text-xs text-black shadow-[1px_1px_0_0_#000000]">
                      {selectedPost.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-black leading-none">{selectedPost.author}</p>
                      <p className="text-[9px] font-mono text-stone-500 mt-0.5 uppercase tracking-wide leading-none">{selectedPost.role}</p>
                    </div>
                  </div>
                </div>

                {/* Markdown rendering of body */}
                <div className="prose max-w-none prose-stone prose-headings:font-sans prose-headings:font-black prose-headings:text-black prose-p:text-xs prose-p:font-semibold prose-p:leading-relaxed prose-a:text-blue-600 prose-a:underline font-sans text-stone-850 text-xs overflow-wrap break-all select-text">
                  <Markdown>{selectedPost.content}</Markdown>
                </div>

                {/* Tags footer */}
                <div className="border-t border-dashed border-stone-300 pt-4 flex flex-wrap gap-2 text-[10px] font-mono font-bold">
                  {selectedPost.tags.map(t => (
                    <span key={t} className="bg-stone-150 border border-black rounded px-1.5 py-0.5">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Controls Bar */}
              <div className="bg-white border-4 border-black p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-[4px_4px_0_0_#000000]">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-black stroke-[3px]" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search articles, tags, authors..."
                    className="w-full bg-white border-2 border-black rounded-lg pl-10 pr-4 py-2 text-xs placeholder-stone-500 font-bold focus:outline-none"
                  />
                </div>

                {/* Category tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto font-mono text-[10px] font-black pb-1 md:pb-0 scrollbar-none">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`border-2 border-black rounded-full px-3 py-1.5 transition-all text-xs cursor-pointer ${
                        selectedCategory === cat 
                          ? "bg-black text-white shadow-none" 
                          : "bg-stone-50 hover:bg-stone-100 text-black shadow-[1.5px_1.5px_0_0_#000000]"
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* List layout */}
              {filtered.length === 0 ? (
                <div className="bg-white border-4 border-black p-12 text-center rounded-2xl shadow-[4px_4px_0_0_#000000] uppercase font-mono font-bold text-stone-500">
                  No engineering guides match your query parameters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filtered.map(post => (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="group bg-white border-4 border-black rounded-2xl p-5 shadow-[5px_5px_0_0_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_0_#000000] transition-all flex flex-col justify-between space-y-4 cursor-pointer"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between font-mono text-[9px] font-black text-stone-500 uppercase pb-1.5 border-b border-stone-200">
                          <span className="bg-[#ddd6fe] text-black border border-black px-1.5 py-0.5 rounded">
                            {post.category}
                          </span>
                          <span>{post.readTime}</span>
                        </div>

                        <h3 className="text-base font-black text-black group-hover:underline leading-tight tracking-tight">
                          {post.title}
                        </h3>
                        <p className="text-xs text-stone-650 leading-relaxed font-bold">
                          {post.excerpt}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-dashed border-stone-200 pt-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-6 w-6 rounded-full border border-black bg-stone-100 flex items-center justify-center font-black text-[10px] text-black shadow-[1px_1px_0_0_#000000]">
                            {post.author.charAt(0)}
                          </div>
                          <span className="text-[10px] font-extrabold text-stone-700">{post.author}</span>
                        </div>

                        <span className="text-[10px] font-mono font-extrabold text-[#7c3aed] group-hover:translate-x-1.5 transition-all flex items-center gap-0.5">
                          READ MANUAL <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* RENDER MODE B: PROGRAMMATIC SEO DIRECTORY */}
      {activeBlogMode === "pseo" && (
        <>
          {selectedPSEO ? (
            (() => {
              const article = generatePSEOArticle(selectedPSEO);
              
              // Dynamic cost equations
              const mainCost = Math.floor(calculatorMAU * 0.16 + 45);
              const altCost = calculatorMAU <= 10000 ? 15 : calculatorMAU <= 50000 ? 55 : calculatorMAU <= 250000 ? 120 : 350;
              const savedSum = Math.max(0, mainCost - altCost);

              return (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedPSEO(null);
                        setShowDiagnostics(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-black rounded-lg text-xs font-black uppercase shadow-[3px_3px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#000000] transition-all cursor-pointer"
                    >
                      &larr; Back to Directory
                    </button>

                    <button
                      onClick={() => {
                        // Pick a new random post to instantly pivot
                        const rand = getRandomPSEO();
                        setSelectedPSEO(rand);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#ddd6fe] border-2 border-black rounded-lg text-xs font-black uppercase shadow-[3px_3px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#000000] transition-all cursor-pointer"
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                      <span>Jump to Random Post</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left Column: Post details */}
                    <div className="lg:col-span-2 bg-white border-4 border-black p-6 md:p-8 rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-6">
                      <div className="border-b-2 border-black pb-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-black text-stone-600">
                          <span className="bg-[#fde047] border border-black text-black px-2 py-0.5 rounded-md uppercase text-[10px]">
                            pSEO Comparison Engine
                          </span>
                          <span className="bg-[#bbf7d0] border border-black text-black px-2 py-0.5 rounded-md uppercase text-[10px]">
                            {selectedPSEO.environment}
                          </span>
                          <span className="flex items-center gap-1 invisible sm:visible">
                            <Calendar className="h-3.5 w-3.5" />
                            {article.publishDate}
                          </span>
                        </div>

                        <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-black leading-tight tracking-tight">
                          {article.title}
                        </h1>

                        <p className="text-xs font-bold text-stone-500 italic bg-stone-50 border-l-4 border-black p-2.5">
                          "{article.excerpt}"
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-dashed border-stone-200">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full border border-black bg-purple-200 flex items-center justify-center font-black text-xs text-black">
                              🤖
                            </div>
                            <div>
                              <p className="font-extrabold text-[11px] text-black leading-none">OpenAlt pSEO Crawler</p>
                              <p className="text-[9px] font-mono text-stone-500 mt-0.5 uppercase tracking-wide leading-none">Automated Directory Analyst</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono font-black">
                            <span className="text-purple-700 bg-purple-50 px-2.5 py-1 border border-purple-200 rounded-md">
                              SEO Score: {article.seoRating}/100 🚀
                            </span>
                            <span className="text-stone-500 hidden sm:inline">
                              Word Count: {article.wordCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Markdown rendering of body */}
                      <div className="prose max-w-none prose-stone prose-headings:font-sans prose-headings:font-black prose-headings:text-black prose-p:text-xs prose-p:font-semibold prose-p:leading-relaxed prose-a:text-blue-600 prose-a:underline font-sans text-stone-850 text-xs overflow-wrap break-all select-text">
                        <Markdown>{article.content}</Markdown>
                      </div>

                      {/* Interactive FAQ / People Also Ask */}
                      <div className="border-t-2 border-black pt-6 mt-6 space-y-4">
                        <h4 className="text-sm font-black text-black uppercase tracking-tight flex items-center gap-2">
                          <HelpCircle className="h-4.5 w-4.5 text-purple-600" />
                          People Also Ask (SEO FAQ Integration)
                        </h4>
                        
                        <div className="space-y-3">
                          {article.paa.map((pa, idx) => (
                            <div key={idx} className="bg-stone-50 border-2 border-black rounded-xl p-4 space-y-2">
                              <h5 className="text-xs font-black text-black flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                  Q
                                </span>
                                {pa.q}
                              </h5>
                              <p className="text-stone-750 font-bold text-xs pl-7 leading-relaxed">
                                {pa.a}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Code Tag Footers */}
                      <div className="border-t border-dashed border-stone-300 pt-4 flex flex-wrap gap-2 text-[10px] font-mono font-bold">
                        {article.tags.map(t => (
                          <span key={t} className="bg-purple-50 text-purple-800 border border-purple-200 rounded px-1.5 py-0.5">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right Column: Dynamic Lock-in and SEO Diagnostics */}
                    <div className="space-y-6">
                      
                      {/* Interactive Sovereignty lock-in calculator */}
                      <div className="bg-white border-4 border-black p-5 rounded-2xl shadow-[4px_4px_0_0_#000000] space-y-4">
                        <div className="border-b-2 border-black pb-2 flex items-center gap-1.5">
                          <Coins className="h-5 w-5 text-yellow-500 shrink-0" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-black">Lock-In Cost Simulator</h4>
                        </div>
                        
                        <p className="text-[10px] text-stone-650 font-bold leading-relaxed">
                          Adjust your active workload volume to map the monthly bill of proprietary **{selectedPSEO.counterpart}** vs modular self-hosted **{selectedPSEO.alternative}**.
                        </p>

                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between items-center text-xs font-black">
                            <span className="text-stone-600">Workload / Users:</span>
                            <span className="bg-black text-[#fde047] px-2 py-0.5 rounded text-[11px] font-mono">
                              {calculatorMAU.toLocaleString()} MAU
                            </span>
                          </div>

                          <input
                            type="range"
                            min="2000"
                            max="500000"
                            step="5000"
                            value={calculatorMAU}
                            onChange={(e) => setCalculatorMAU(parseInt(e.target.value, 10))}
                            className="w-full accent-black h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer border border-black"
                          />
                          <div className="flex justify-between text-[8px] text-stone-400 font-mono">
                            <span>2,000</span>
                            <span>250,000</span>
                            <span>500,000 MAU</span>
                          </div>
                        </div>

                        <div className="space-y-2 bg-stone-50 p-2.5 border-2 border-black rounded-lg">
                          <div className="flex justify-between items-center text-xs font-bold text-stone-700">
                            <span>{selectedPSEO.counterpart} Bill (Proprietary API):</span>
                            <span className="text-red-650 font-black">${mainCost.toLocaleString()}/mo</span>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs font-bold text-stone-700">
                            <span>{selectedPSEO.alternative} (Self-Hosted Node):</span>
                            <span className="text-green-650 font-black">${altCost.toLocaleString()}/mo</span>
                          </div>

                          <div className="border-t border-dashed border-stone-300 my-2 pt-2 flex justify-between items-center">
                            <span className="text-xs font-black text-black">Monthly Cash Saved:</span>
                            <span className="bg-green-100 text-green-800 text-xs font-black px-2 py-0.5 rounded border border-green-300">
                              ${savedSum.toLocaleString()}/mo
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#bbf7d0] p-3 border-2 border-black rounded-xl text-center shadow-[2px_2px_0_0_#000000]">
                          <p className="text-[11px] font-black text-black leading-tight uppercase flex items-center justify-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-green-800 shrink-0" />
                            Save {Math.floor((savedSum / (mainCost || 1)) * 100)}% every month on infrastructure!
                          </p>
                        </div>
                      </div>

                      {/* SEO technical crawling parameters (Crawl diagnostics) */}
                      <div className="bg-white border-4 border-black p-5 rounded-2xl shadow-[4px_4px_0_0_#000000] space-y-4">
                        <div className="flex items-center justify-between border-b-2 border-black pb-2">
                          <div className="flex items-center gap-1.5">
                            <Settings className="h-5 w-5 text-purple-600 shrink-0" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-black">SEO Metadata Tags</h4>
                          </div>

                          <button
                            onClick={() => setShowDiagnostics(!showDiagnostics)}
                            className="bg-stone-50 border border-black hover:bg-stone-100 text-[9px] font-bold py-1 px-2 rounded uppercase"
                          >
                            {showDiagnostics ? "Hide JSON-LD" : "Show JSON-LD"}
                          </button>
                        </div>

                        <p className="text-[10px] text-stone-650 font-bold leading-relaxed">
                          These technical SEO variables are dynamically generated into the DOM head when custom spider-bots fetch this post.
                        </p>

                        <div className="space-y-2.5 font-mono text-[9px] font-bold text-stone-650 bg-stone-50 p-3 rounded-lg border border-stone-200">
                          <div>
                            <span className="text-purple-700 font-extrabold block uppercase tracking-wider text-[8px]">&lt;title tag&gt;</span>
                            <span className="text-black text-[9px] break-words block">{article.title}</span>
                          </div>

                          <div>
                            <span className="text-purple-700 font-extrabold block uppercase tracking-wider text-[8px]">&lt;meta description&gt;</span>
                            <span className="text-stone-700 text-[9px] break-words block">{article.excerpt}</span>
                          </div>

                          <div>
                            <span className="text-purple-700 font-extrabold block uppercase tracking-wider text-[8px]">&lt;link rel="canonical"&gt;</span>
                            <span className="text-blue-600 underline text-[8px] break-all block">{article.canonical}</span>
                          </div>

                          <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-stone-200">
                            <span className="text-[8px] uppercase tracking-wider text-purple-700">Robot Headers:</span>
                            <span className="bg-black text-white font-mono px-1 py-0.2 rounded text-[8px]">index, follow</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-[8px] uppercase tracking-wider text-purple-700">XML SItemap priority:</span>
                            <span className="text-black font-semibold">1.00 (Critical Nodes)</span>
                          </div>
                        </div>

                        {showDiagnostics && (
                          <div className="bg-stone-900 text-[#86efac] p-3 rounded-lg border-2 border-black max-h-56 overflow-y-auto font-mono text-[8.5px] space-y-1.5 scrollbar-none">
                            <p className="text-white border-b border-stone-700 pb-1 mb-1 font-sans text-[9px] uppercase tracking-wider font-bold">
                              &lt;script type="application/ld+json"&gt;
                            </p>
                            <pre className="whitespace-pre-wrap">
{`{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "${article.title}",
  "description": "${article.excerpt}",
  "url": "${article.canonical}",
  "author": {
    "@type": "Organization",
    "name": "OpenAlt pSEO Engine"
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "OpenAlt Alternatives",
    "url": "https://openalt.org"
  },
  "keywords": ["${selectedPSEO.alternative}", "${selectedPSEO.counterpart}", "selfhosted", "${selectedPSEO.environment}"]
}`}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="space-y-6">
              {/* pSEO Core Statistics Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border-4 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#000000] text-center space-y-1">
                  <p className="text-[9px] font-mono font-black text-stone-500 uppercase tracking-widest leading-none">pSEO Directories</p>
                  <p className="text-lg font-black text-purple-650 leading-none">977,500+</p>
                  <p className="text-[8px] font-bold text-stone-400">Permutations Cached</p>
                </div>
                <div className="bg-white border-4 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#000000] text-center space-y-1">
                  <p className="text-[9px] font-mono font-black text-stone-500 uppercase tracking-widest leading-none">Organic Index Scope</p>
                  <p className="text-lg font-black text-blue-650 leading-none">100% Valid</p>
                  <p className="text-[8px] font-bold text-stone-400">Canonical Structured</p>
                </div>
                <div className="bg-white border-4 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#000000] text-center space-y-1">
                  <p className="text-[9px] font-mono font-black text-stone-500 uppercase tracking-widest leading-none">Crawler Speed</p>
                  <p className="text-lg font-black text-green-650 leading-none">&lt; 3.2ms</p>
                  <p className="text-[8px] font-bold text-stone-400">Client Paint Overhead</p>
                </div>
                <div className="bg-white border-4 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#000000] text-center space-y-1">
                  <p className="text-[9px] font-mono font-black text-stone-500 uppercase tracking-widest leading-none">Schema Status</p>
                  <p className="text-lg font-black text-orange-650 leading-none">LD+JSON 200</p>
                  <p className="text-[8px] font-bold text-stone-400">Validated via SDTT</p>
                </div>
              </div>

              {/* Controls Bar for pSEO */}
              <div className="bg-white border-4 border-black p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-[4px_4px_0_0_#000000]">
                <div className="relative w-full md:max-w-xl">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-black stroke-[3px]" />
                  <input
                    type="text"
                    value={pseoQuery}
                    onChange={e => setPseoQuery(e.target.value)}
                    placeholder="Search 977,500 software comparisons (e.g. Supabase vs Firebase, Postgres, Coolify)..."
                    className="w-full bg-white border-2 border-black rounded-lg pl-10 pr-4 py-3 text-xs placeholder-stone-500 font-bold focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => {
                      // Trigger a purely randomized alternative matchup out of 977,500 combinations!
                      const randItem = getRandomPSEO();
                      setSelectedPSEO(randItem);
                    }}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-3 bg-[#fde047] hover:bg-yellow-450 border-2 border-black rounded-lg text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
                  >
                    <Shuffle className="h-4 w-4 stroke-[2.5px]" />
                    <span>Shuffle Random Pairing</span>
                  </button>
                </div>
              </div>

              {/* Informative Assistive Banner explaining pSEO */}
              <div className="bg-purple-50 p-4 border-2 border-black rounded-xl text-stone-750 font-bold text-xs leading-relaxed flex items-start gap-2.5">
                <Info className="h-5 w-5 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-extrabold text-black uppercase text-[11px] mb-0.5">Programmatic SEO Rendering Strategy Active</h5>
                  Currently simulating a dynamic, crawlable pool of <strong>977,500 highly specific search queries</strong> ("People Also Ask"). Every possible combination of open-source alternatives, closed-source competitors, high-density environments, and compliance editorial angles are mapped to deterministic nodes!
                </div>
              </div>

              {/* pSEO Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pseoList.map((item) => {
                  // Precompute some visual seeds
                  const seoRating = 91 + (item.altIndex + item.mainIndex) % 8;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedPSEO(item)}
                      className="group bg-white border-4 border-black rounded-2xl p-5 shadow-[5px_5px_0_0_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_0_#000000] transition-all flex flex-col justify-between space-y-4 cursor-pointer"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between font-mono text-[9px] font-black uppercase pb-1.5 border-b border-stone-200">
                          <span className="bg-[#fbcfe8] text-black border border-black px-1.5 py-0.5 rounded">
                            pSEO Directory
                          </span>
                          <span className="text-purple-600 font-extrabold">
                            {seoRating}/100 SEO Grade
                          </span>
                        </div>

                        <p className="text-[10px] uppercase font-mono font-black text-stone-400">
                          {item.alternative} vs {item.counterpart}
                        </p>

                        <h3 className="text-sm font-black text-black group-hover:underline leading-snug tracking-tight">
                          How to deploy {item.alternative} instead of {item.counterpart} on {item.environment}
                        </h3>

                        <p className="text-[11px] text-stone-600 leading-relaxed font-bold">
                          Trace the comprehensive developer checklist and cost delta analysis regarding {item.angle}...
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-dashed border-stone-200 pt-3">
                        <span className="text-[9px] font-mono font-semibold text-stone-400">
                          ID: {item.id.slice(0, 18)}...
                        </span>

                        <span className="text-[10px] font-mono font-extrabold text-purple-700 group-hover:translate-x-1.5 transition-all flex items-center gap-0.5">
                          EXPLORE INDEX <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Infinite Scroll Indicator & Click Trap Trigger */}
              <div className="mt-8 pt-4 pb-12 border-t-4 border-dashed border-black flex flex-col items-center justify-center gap-4 bg-stone-50 p-6 rounded-2xl">
                <p className="text-stone-500 font-mono text-[10px] uppercase tracking-wider font-extrabold text-center">
                  Showing {visiblePseoCount} of 977,500 active directory permutations
                </p>
                
                <div className="flex items-center gap-2.5">
                  <div className={`h-2.5 w-2.5 rounded-full bg-purple-600 ${isInfiniteScrolling ? "animate-ping" : ""}`} />
                  <span className="text-[11px] font-black uppercase tracking-wider text-black font-mono">
                    {isInfiniteScrolling ? "Synthesizing next batch query structures..." : "Autonomous Infinite Scroll Active"}
                  </span>
                </div>

                {/* Safe click-based loader for iframe environments when touchpads or dynamic scroll handlers are partially sandboxed */}
                <button
                  onClick={() => setVisiblePseoCount((prev) => prev + 24)}
                  className="px-5 py-2.5 bg-white border-2 border-black rounded-lg text-[10px] font-black uppercase hover:bg-stone-100 transition-all shadow-[2px_2px_0_0_#000000] cursor-pointer"
                >
                  Manually Expand Next 24 Directories
                </button>
              </div>
            </div>
          )}
        </>
      )}


    </div>
  );
}
