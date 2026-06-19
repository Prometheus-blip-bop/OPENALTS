import React, { useState, useEffect } from "react";
import { 
  Search, 
  Sparkles, 
  Star, 
  ArrowUp, 
  ExternalLink, 
  SlidersHorizontal, 
  GitFork, 
  Shield, 
  User, 
  MessageSquare,
  Globe,
  RefreshCw,
  FolderSync,
  Bookmark,
  Share2,
  Flame,
  CheckCircle2
} from "lucide-react";
import { Project } from "../types";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  increment, 
  getDoc,
  serverTimestamp 
} from "firebase/firestore";
import { INITIAL_PROJECTS, ALTERNATIVE_MAP } from "../initialData";
import { logUserInteraction } from "../utils/logger";

interface DiscoverPageProps {
  onLogin: () => void;
  setView: (view: any) => void;
  onSelectProject: (project: Project) => void;
  isBookmarked: (projectId: string) => boolean;
  onToggleBookmark: (project: Project) => void;
}

export default function DiscoverPage({ 
  onLogin, 
  setView,
  onSelectProject,
  isBookmarked,
  onToggleBookmark
}: DiscoverPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [selectedLicense, setSelectedLicense] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [sortBy, setSortBy] = useState("popularity");
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [ratingLoading, setRatingLoading] = useState<Record<string, boolean>>({});

  // Infinite scroll and copy states
  const [visibleCount, setVisibleCount] = useState(6);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch or Seed Projects
  useEffect(() => {
    async function initProjects() {
      setLoading(true);
      const path = "projects";
      try {
        const querySnapshot = await getDocs(collection(db, path));
        let loadedProjects: Project[] = [];
        
        querySnapshot.forEach((doc) => {
          loadedProjects.push(doc.data() as Project);
        });

        // Seed with INITIAL_PROJECTS if Database is brand new & empty
        if (loadedProjects.length === 0) {
          console.log("Firestore empty. Showing initial open-source pairs dataset in-memory...");
          loadedProjects = [...INITIAL_PROJECTS];
          
          if (auth.currentUser) {
            try {
              for (const proj of INITIAL_PROJECTS) {
                await setDoc(doc(db, "projects", proj.id), {
                  ...proj,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              }
              await logUserInteraction("seed_initial_projects", { count: INITIAL_PROJECTS.length });
            } catch (seedErr) {
              console.warn("Gracefully ignored initial project database seeding error:", seedErr);
            }
          }
        }

        setProjects(loadedProjects);

        // Fetch User upvote mapping if logged in
        if (auth.currentUser) {
          const likesMap: Record<string, boolean> = {};
          for (const proj of loadedProjects) {
            const likeDoc = await getDoc(
              doc(db, `projects/${proj.id}/likes`, auth.currentUser.uid)
            );
            if (likeDoc.exists()) {
              likesMap[proj.id] = true;
            }
          }
          setUserLikes(likesMap);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      } finally {
        setLoading(false);
      }
    }
    initProjects();
  }, [auth.currentUser]);

  // Infinite Scroll Trigger and Reset listeners
  useEffect(() => {
    setVisibleCount(6);
  }, [search, selectedCategory, selectedLanguage, selectedLicense, selectedType, sortBy]);

  useEffect(() => {
    const sentinel = document.getElementById("infinite-scroll-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) {
        setVisibleCount((prev) => prev + 6);
      }
    }, { threshold: 0.1 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, projects]);

  // Handle Share link copy
  function handleShareProject(e: React.MouseEvent, proj: Project) {
    e.stopPropagation();
    const deepLink = `${window.location.origin}${window.location.pathname}?view=details&project=${proj.id}`;
    navigator.clipboard.writeText(deepLink)
      .then(() => {
        setCopiedId(proj.id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch((err) => {
        console.warn("Could not copy link:", err);
      });
  }

  // Handle Project Upvote (Atomically logs, creates doc and increments count)
  async function handleUpvote(project: Project) {
    if (!auth.currentUser) {
      onLogin();
      return;
    }

    const projectId = project.id;
    const userId = auth.currentUser.uid;
    const likePath = `projects/${projectId}/likes/${userId}`;

    if (userLikes[projectId]) {
      return; // Already upvoted
    }

    try {
      // 1. Create subcollection association
      await setDoc(doc(collection(db, `projects/${projectId}/likes`), userId), {
        userId,
        createdAt: serverTimestamp(),
      });

      // 2. Increment counters
      await updateDoc(doc(db, "projects", projectId), {
        upvotes: increment(1),
        updatedAt: serverTimestamp(),
      });

      // 3. Update local state
      setUserLikes((prev) => ({ ...prev, [projectId]: true }));
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, upvotes: p.upvotes + 1 } : p))
      );

      // Audit Interaction logger
      await logUserInteraction("upvote_project", { projectId, projectName: project.name });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, likePath);
    }
  }

  // Handle Project Rating (Simulate simple scaling for interactive feedback)
  async function handleRate(projectId: string, score: number) {
    if (!auth.currentUser) {
      onLogin();
      return;
    }

    setRatingLoading((prev) => ({ ...prev, [projectId]: true }));
    const projPath = `projects/${projectId}`;

    try {
      const match = projects.find((p) => p.id === projectId);
      if (!match) return;

      const currentCount = match.ratingCount || 0;
      const currentVal = match.rating || 0;
      const newValCount = currentCount + 1;
      const newValRating = parseFloat(((currentVal * currentCount + score) / newValCount).toFixed(1));

      await updateDoc(doc(db, "projects", projectId), {
        rating: newValRating,
        ratingCount: newValCount,
        updatedAt: serverTimestamp(),
      });

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, rating: newValRating, ratingCount: newValCount }
            : p
        )
      );

      await logUserInteraction("rate_project", { projectId, score, currentRating: newValRating });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, projPath);
    } finally {
      setRatingLoading((prev) => ({ ...prev, [projectId]: false }));
    }
  }

  // Extract filter categories dynamically
  const languages = ["All", ...Array.from(new Set(projects.map((p) => p.language).filter(Boolean)))];
  const licenses = ["All", ...Array.from(new Set(projects.map((p) => p.license).filter(Boolean)))];
  
  // Custom smart categories mapped via alt search mappings or tags
  const categories = ["All", "Developer Tooling", "Automation", "Workspace", "Analytics", "SaaS-Alternative"];

  // Filtering + Sorting Core Logic
  const filteredProjects = projects
    .filter((proj) => {
      // 1. Search text mapping
      const query = search.toLowerCase();
      const matchesSearch =
        proj.name.toLowerCase().includes(query) ||
        proj.description.toLowerCase().includes(query) ||
        proj.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        proj.language.toLowerCase().includes(query);

      // Check alternative mapping, e.g. typing "notion" matches "appflowy"
      const matchesAlternative = Object.keys(ALTERNATIVE_MAP).some((key) => {
        if (key.includes(query) || query.includes(key)) {
          const alternateList = ALTERNATIVE_MAP[key];
          return alternateList.includes(proj.id);
        }
        return false;
      });

      const textPass = matchesSearch || matchesAlternative;

      // 2. Language filter
      const langPass = selectedLanguage === "All" || proj.language === selectedLanguage;

      // 3. License filter
      const licensePass = selectedLicense === "All" || proj.license === selectedLicense;

      // 4. Type (SaaS vs open source) filter
      const typePass =
        selectedType === "All" ||
        (selectedType === "open-source" && proj.type === "open-source") ||
        (selectedType === "saas" && proj.type === "saas");

      // 5. Categorisation filter
      let categoryPass = true;
      if (selectedCategory !== "All") {
        if (selectedCategory === "SaaS-Alternative") {
          categoryPass = proj.tags.some((t) => t.startsWith("SaaS-Alternative"));
        } else {
          categoryPass = proj.tags.some((t) => t.toLowerCase().includes(selectedCategory.toLowerCase()));
        }
      }

      return textPass && langPass && licensePass && typePass && categoryPass;
    })
    .sort((a, b) => {
      if (sortBy === "stars") return b.stars - a.stars;
      if (sortBy === "upvotes") return b.upvotes - a.upvotes;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "recency") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "alphabetical") return a.name.localeCompare(b.name);
      return b.upvotes - a.upvotes; // default relevance sorting via upvoting triggers
    });

  return (
    <div className="space-y-8">
      {/* Search and Navigation Landing Dashboard */}
      <div className="bg-[#86efac] p-6 md:p-8 border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-white opacity-20 rounded-full border-4 border-black translate-x-8 -translate-y-8 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-sans font-black tracking-tight text-black flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-black fill-[#fde047]" />
              Discover Alternatives
            </h1>
            <p className="text-sm text-stone-800 font-bold max-w-2xl leading-relaxed">
              Find open replacements and independent SaaS technologies, matched with live developer ratings.
            </p>
          </div>
          <button
            onClick={() => setView("submit")}
            className="neo-btn neo-btn-yellow bg-[#fde047] hover:bg-[#facc15] font-black border-3 border-black rounded-xl shadow-[4px_4px_0_0_#000000]"
          >
            <span>Submit Your SaaS</span>
          </button>
        </div>

        {/* Dynamic Search Box */}
        <div className="relative">
          <Search className="absolute left-4 top-4 h-5 w-5 text-black stroke-[3px]" />
          <input
            id="main-discovery-search"
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.length > 2) {
                logUserInteraction("type_search", { query: e.target.value });
              }
            }}
            placeholder="Search alternative databases or competitors (e.g. 'notion', 'figma', 'zapier', 'typescript')..."
            className="w-full bg-white border-4 border-black rounded-xl pl-12 pr-4 py-3.5 text-black text-sm placeholder-stone-600 font-bold focus:outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] shadow-[4px_4px_0_0_#000000] focus:shadow-[6px_6px_0_0_#000000] transition-all"
          />
        </div>

        {/* Inline Category Buttons Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none font-mono">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`neo-badge text-xs font-black px-4 py-2 border-2 border-black rounded-full transition-all cursor-pointer ${
                  isSelected
                    ? "bg-black text-white shadow-none translate-x-[1.5px] translate-y-[1.5px]"
                    : "bg-white text-black hover:bg-stone-50 shadow-[3px_3px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trending Section of the Day (Hottest Open Alt Alternatives & Community SaaS of the Day) */}
      <div className="bg-[#fbcfe8] border-4 border-black p-5 rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-4">
        <div className="flex items-center justify-between border-b-2 border-black pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5/2">
            <Flame className="h-5 w-5 text-black fill-yellow-400 stroke-[2.5px] shrink-0 animate-pulse" />
            <span className="font-sans font-black text-black text-sm uppercase tracking-wider">
              Trending Candidates of the Day
            </span>
          </div>
          <span className="font-mono text-[9px] font-extrabold uppercase bg-white border border-black px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000000]">
            COMMUNITY SUBMISSIONS INCLUDED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...projects]
            .sort((a, b) => b.upvotes - a.upvotes)
            .slice(0, 3)
            .map((proj) => {
              const isFav = isBookmarked(proj.id);
              return (
                <div
                  key={`trending-${proj.id}`}
                  onClick={() => onSelectProject(proj)}
                  className="bg-white border-2 border-black rounded-xl p-3 shadow-[3px_3px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4.5px_4.5px_0_0_#000000] transition-all flex flex-col justify-between space-y-3 cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[8px] font-mono font-black uppercase tracking-wider bg-yellow-200 border border-black px-1.5 py-0.5 rounded-full">
                        {proj.type === "saas" ? "🎯 Community SaaS" : "⚡ HOT ALTERNATIVE"}
                      </span>
                      <div className="flex items-center gap-0.5 text-stone-700 font-mono text-[10px] font-bold">
                        <ArrowUp className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <span>{proj.upvotes}</span>
                      </div>
                    </div>

                    <h4 className="font-sans font-black text-sm text-black group-hover:underline truncate pt-1">
                      {proj.name}
                    </h4>
                    <p className="text-[10px] text-stone-600 font-bold leading-relaxed line-clamp-2">
                      {proj.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-stone-200 pt-2 text-[10px]">
                    <span className="font-mono font-extrabold text-stone-500 uppercase truncate text-[9px]">
                      {proj.language || "TypeScript"}
                    </span>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Copy Share deep link code */}
                      <button
                        onClick={(e) => handleShareProject(e, proj)}
                        className="p-1 border border-black rounded bg-stone-50 hover:bg-[#ddd6fe] text-black cursor-pointer shadow-[1px_1px_0_0_#000000]"
                        title="Copy Share Link"
                      >
                        {copiedId === proj.id ? (
                          <span className="text-[8px] font-black text-green-600">Copied!</span>
                        ) : (
                          <Share2 className="h-3 w-3" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => onToggleBookmark(proj)}
                        className={`p-1 border border-black rounded cursor-pointer shadow-[1px_1px_0_0_#000000] ${
                          isFav ? "bg-[#ec4899] text-white" : "bg-white text-black hover:bg-stone-55"
                        }`}
                        title="Bookmark"
                      >
                        <Bookmark className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Advanced Filter Action Drawer */}
      <div className="bg-[#fed7aa] border-4 border-black p-5 rounded-2xl shadow-[6px_6px_0_0_#000000]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 font-mono font-black text-xs text-black border-2 border-black bg-white px-3 py-2 rounded shadow-[3px_3px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#000000] transition-all"
          >
            <SlidersHorizontal className="h-4 w-4 text-black stroke-[2.5px]" />
            <span>{showFilters ? "CLOSE ADVANCED FILTERS" : "OPEN ADVANCED FILTERS"}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-black font-mono">SORT BY:</span>
            <select
              id="sort-selector"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border-2 border-black rounded-lg text-xs font-bold text-black px-3 py-2 focus:outline-none shadow-[2px_2px_0_0_#000000] cursor-pointer"
            >
              <option value="popularity">Relevance (Upvotes)</option>
              <option value="stars">GitHub Stars</option>
              <option value="rating">User Rating</option>
              <option value="recency">Recency</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Filter Selection Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5 font-mono text-xs">
            {/* Programming Language */}
            <div>
              <label className="block text-[10px] font-black text-stone-900 uppercase tracking-wider mb-2">
                Programming Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 font-bold text-black focus:outline-none shadow-[2px_2px_0_0_#000000]"
              >
                {languages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {/* License Code */}
            <div>
              <label className="block text-[10px] font-black text-stone-900 uppercase tracking-wider mb-2">
                Open Source License
              </label>
              <select
                value={selectedLicense}
                onChange={(e) => setSelectedLicense(e.target.value)}
                className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 font-bold text-black focus:outline-none shadow-[2px_2px_0_0_#000000]"
              >
                {licenses.map((lic) => (
                  <option key={lic} value={lic}>
                    {lic}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Type */}
            <div>
              <label className="block text-[10px] font-black text-stone-900 uppercase tracking-wider mb-2">
                Discovery Tier
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 font-bold text-black focus:outline-none shadow-[2px_2px_0_0_#000000]"
              >
                <option value="All">All Projects</option>
                <option value="open-source">Open-Source Repos</option>
                <option value="saas">Independent SaaS</option>
              </select>
            </div>
          </div>
        )}
      </div>



      {/* Loading list state */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="h-10 w-10 text-black animate-spin stroke-[2.5px]" />
          <p className="text-xs font-mono text-black font-extrabold uppercase tracking-widest">
            Synchronizing Cloud Alternatives Index Database...
          </p>
        </div>
      ) : (
        <div>
          {/* Main List Stream */}
          <div className="flex items-center justify-between mt-8 mb-4">
            <h3 className="text-xs font-mono font-black uppercase tracking-widest text-stone-700 bg-white border-2 border-black px-2.5 py-1 rounded shadow-[2px_2px_0_0_#000000]">
              Indices Matched &bull; {filteredProjects.length}
            </h3>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="bg-white border-4 border-black p-12 text-center flex flex-col items-center justify-center space-y-4 rounded-2xl shadow-[6px_6px_0_0_#000000]">
              <div className="p-3 border-2 border-black rounded-full bg-[#fbcfe8] shadow-[2.5px_2.5px_0_0_#000000]">
                <FolderSync className="h-8 w-8 text-black stroke-[2.5px]" />
              </div>
              <div>
                <p className="text-lg font-black text-black uppercase">No Alternatives Found</p>
                <p className="text-xs text-stone-700 font-bold max-w-sm mt-1 leading-relaxed">
                  Try clearing some keyword terms, using general phrases, or selecting another discovery tier!
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredProjects.slice(0, visibleCount).map((proj) => {
                const alreadyLiked = !!userLikes[proj.id];
                return (
                  <div
                    key={proj.id}
                    id={`project-card-${proj.id}`}
                    className="group bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0_0_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_#000000] transition-all flex flex-col justify-between space-y-5 relative"
                  >
                    {/* Share alert badge toast */}
                    {copiedId === proj.id && (
                      <div className="absolute inset-0 bg-[#ddd6fe] bg-opacity-[0.97] border-2 border-black flex flex-col items-center justify-center space-y-2 z-10 rounded-xl">
                        <CheckCircle2 className="h-8 w-8 text-black stroke-[3px]" />
                        <span className="font-mono text-xs font-black text-black">DEEP LINK COPIED!</span>
                      </div>
                    )}

                    {/* Upper Section */}
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <h4 className="text-xl font-sans font-black text-black tracking-tight leading-tight">
                              {proj.name}
                            </h4>
                            <span
                              className={`text-[9px] font-mono font-extrabold uppercase py-0.5 px-2 rounded-full border-2 border-black ${
                                proj.type === "open-source"
                                  ? "bg-[#86efac] text-black shadow-[1.5px_1.5px_0_0_#000000]"
                                  : "bg-[#67e8f9] text-black shadow-[1.5px_1.5px_0_0_#000000]"
                              }`}
                            >
                              {proj.type === "open-source" ? "Open Source" : "SaaS"}
                            </span>
                          </div>
                          {/* Alternative target helper label */}
                          {proj.tags.some((t) => t.startsWith("SaaS-Alternative:")) && (
                            <p className="text-[10px] font-bold text-stone-700 mt-2 flex items-center gap-1.5 font-sans">
                              <Globe className="h-3.5 w-3.5 text-black" />
                              Replaces:{" "}
                              <span className="text-black bg-[#fed7aa] border border-black rounded px-1.5 py-0.5 text-[9px] font-black uppercase shadow-[1px_1px_0_0_#000000]">
                                {proj.tags
                                  .find((t) => t.startsWith("SaaS-Alternative:"))
                                  ?.split(":")[1] || "Proprietary tool"}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Stargazers displays if applicable */}
                        {proj.type === "open-source" && proj.stars > 0 && (
                          <div className="flex items-center gap-1.5 bg-yellow-300 border-2 border-black px-2 py-1 rounded text-xs font-mono font-black text-black shadow-[2px_2px_0_0_#000000]">
                            <Star className="h-3.5 w-3.5 text-black fill-black" />
                            <span>{proj.stars >= 1000 ? (proj.stars / 1000).toFixed(1) + "k" : proj.stars}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-stone-600 leading-relaxed font-semibold">
                        {proj.description}
                      </p>

                      {/* Tags block */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {proj.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="bg-white text-stone-900 border-2 border-black rounded px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide font-mono shadow-[1.5px_1.5px_0_0_#000000]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Operational Actions section */}
                    <div className="pt-4 border-t-2 border-dashed border-black flex items-center justify-between flex-wrap gap-4 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        {proj.language && (
                          <span className="bg-[#ddd6fe] text-black border-2 border-black rounded px-2 py-0.5 font-bold shadow-[1.5px_1.5px_0_0_#000000]">
                            {proj.language}
                          </span>
                        )}
                        {proj.license && (
                          <span className="flex items-center gap-1 font-bold text-[10px] text-stone-800 bg-stone-100 border border-black rounded px-1.5 shadow-[1px_1px_0_0_#000000]">
                            <Shield className="h-3.5 w-3.5 text-black stroke-[2.5px]" />
                            {proj.license}
                          </span>
                        )}
                      </div>

                      {/* Upvoting and Rating Actions buttons details */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Specifications link button */}
                        <button
                          onClick={() => onSelectProject(proj)}
                          className="flex items-center gap-1 rounded-lg border-2 border-black bg-[#fbcfe8] hover:bg-[#f472b6] text-black px-3 py-1.5 text-[10px] font-black uppercase transition-all shadow-[2px_2px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                        >
                          <span>Specs & Reviews</span>
                        </button>

                        {/* Star Rating Panel Slider */}
                        <div className="flex items-center gap-0.5 border-2 border-black bg-white rounded-lg px-2.5 py-1 shadow-[2px_2px_0_0_#000000]">
                          <span className="text-[11px] font-mono font-black text-black mr-1.5">
                            {proj.rating || "N/A"}
                          </span>
                          {[1, 2, 3, 4, 5].map((starsCell) => (
                            <button
                              key={starsCell}
                              disabled={ratingLoading[proj.id]}
                              onClick={() => handleRate(proj.id, starsCell)}
                              className="text-stone-300 hover:text-black focus:outline-none transition-transform hover:scale-125 active:scale-95 disabled:opacity-55 animate-none"
                              aria-label={`Rate ${starsCell} Stars`}
                            >
                              <Star
                                className={`h-3.5 w-3.5 stroke-[2px] ${
                                  Math.round(proj.rating || 0) >= starsCell
                                    ? "text-black fill-yellow-300 stroke-black"
                                    : "text-stone-300"
                                }`}
                              />
                            </button>
                          ))}
                        </div>

                        {/* Upvote Button */}
                        <button
                          id={`upvote-btn-${proj.id}`}
                          onClick={() => handleUpvote(proj)}
                          disabled={alreadyLiked}
                          className={`flex items-center gap-1.5 rounded-lg border-2 border-black px-3 py-1.5 text-xs font-black uppercase transition-all shadow-[2.5px_2.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                            alreadyLiked
                              ? "bg-[#67e8f9] text-black"
                              : "bg-white text-black hover:bg-stone-55 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3.5px_3.5px_0_0_#000000]"
                          }`}
                        >
                          <ArrowUp className={`h-4 w-4 stroke-[3px] ${alreadyLiked ? "text-black animate-bounce" : ""}`} />
                          <span>{proj.upvotes}</span>
                        </button>

                        {/* Direct Deep Link Share Button */}
                        <button
                          onClick={(e) => handleShareProject(e, proj)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-white text-black hover:bg-[#ddd6fe] shadow-[2px_2px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                          title="Copy Share Link"
                        >
                          <Share2 className="h-4 w-4 stroke-[2.5px]" />
                        </button>

                        {/* Bookmark Button */}
                        <button
                          onClick={() => onToggleBookmark(proj)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black transition-all shadow-[2px_2px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer ${
                            isBookmarked(proj.id) ? "bg-[#ec4899] text-white" : "bg-white text-black hover:bg-stone-50 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#000000]"
                          }`}
                          title={isBookmarked(proj.id) ? "Remove Bookmark" : "Add Bookmark"}
                        >
                          <Bookmark className={`h-4 w-4 stroke-[2.5px] ${isBookmarked(proj.id) ? "fill-white" : ""}`} />
                        </button>

                        <a
                          href={proj.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-white text-black hover:bg-stone-100 shadow-[2px_2px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                          aria-label="Visit site"
                        >
                          <ExternalLink className="h-4 w-4 stroke-[2.5px]" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Infinite Scroll sentinel tracker element */}
            {filteredProjects.length > visibleCount && (
              <div 
                id="infinite-scroll-sentinel" 
                className="h-16 w-full flex items-center justify-center font-mono text-[10px] font-black text-stone-700 uppercase border-2 border-dashed border-black rounded-xl bg-stone-50 mt-8 animate-pulse"
              >
                📜 Scroll down to keep exploring more candidates...
              </div>
            )}
          </>
        )}
        </div>
      )}
    </div>
  );
}
