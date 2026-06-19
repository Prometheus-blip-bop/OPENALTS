import React, { useState, useEffect } from "react";
import { 
  Users, 
  ArrowUp, 
  Bookmark, 
  Share2, 
  Globe, 
  PlusCircle, 
  Search,
  ExternalLink,
  DollarSign,
  Heart
} from "lucide-react";
import { Project } from "../types";
import UserBadge from "./UserBadge";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  serverTimestamp
} from "firebase/firestore";

interface CommunitySaaSProps {
  setView: (view: any) => void;
  onSelectProject: (project: Project) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (project: Project) => void;
  addToast: (message: string, type?: "success" | "info" | "warning") => void;
}

export default function CommunitySaaSPage({
  setView,
  onSelectProject,
  isBookmarked,
  onToggleBookmark,
  addToast
}: CommunitySaaSProps) {
  const [saasProjects, setSaasProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Awards Prestige States
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [applyingForAward, setApplyingForAward] = useState(false);
  const [awardProjectName, setAwardProjectName] = useState("");
  const [awardReplacedTool, setAwardReplacedTool] = useState("");
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [copiedBadgeCode, setCopiedBadgeCode] = useState(false);

  // Handle application submission
  const handleSubmitAwardApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      addToast("Connect your profile to apply for prestige spotlights!", "warning");
      return;
    }
    if (!awardProjectName || !awardReplacedTool) {
      addToast("Please fill in both fields!", "warning");
      return;
    }

    setApplyingForAward(true);

    try {
      // Create Firestore sponsorship entry
      const sponsorId = `aw-${Date.now()}`;
      await setDoc(doc(db, `sponsorships/${sponsorId}`), {
        id: sponsorId,
        projectId: awardProjectName.toLowerCase().replace(/\s+/g, "-"),
        sponsorName: auth.currentUser.displayName || "Indie Premium Builder",
        targetType: "competitor",
        targetValue: awardReplacedTool.toLowerCase().trim(),
        sponsoredType: "ltd", // custom prestige LTD badge placement
        amountPaid: 20,
        status: "active",
        createdAt: serverTimestamp()
      });

      setApplyingForAward(false);
      setShowEmbedCode(true);
      addToast("Prestige Product Award application processed successfully! 🏆", "success");
    } catch (err: any) {
      console.warn("Offline fallback parsed badge embed permission.");
      setApplyingForAward(false);
      setShowEmbedCode(true);
    }
  };

  const getEmbedHtmlCode = () => {
    return `<div style="font-family:'Courier New', monospace; display:inline-flex; align-items:center; border:3px solid black; background:#facc15; padding:10px 14px; font-weight:900; color:black; text-transform:uppercase; box-shadow:4px 4px 0px #000; font-size:12px; gap:8px;">\n  <span>🏆 Ranked #1 ${awardReplacedTool || "Notion"} Alternative on OpenAlt</span>\n</div>`;
  };

  const handleCopyEmbedCode = () => {
    navigator.clipboard.writeText(getEmbedHtmlCode());
    setCopiedBadgeCode(true);
    addToast("Brutalist Prestige Embed Code copied to clipboard!", "success");
    setTimeout(() => setCopiedBadgeCode(false), 2000);
  };

  // Sync SaaS-type projects directly in real-time!
  const computeSmartScore = (project: Project) => {
    const nowSec = Math.floor(Date.now() / 1000);
    const createdAtSec = project.createdAt?.seconds || project.createdAt?._seconds || (nowSec - 86400);
    const ageInHours = Math.max(0.1, (nowSec - createdAtSec) / 3600);

    const proVotes = (project as any).proUpvotes || 0;
    const totalVotes = project.upvotes || 0;
    const freeVotes = Math.max(0, totalVotes - proVotes);

    const weightedUpvotes = (freeVotes * 1.0) + (proVotes * 2.5);

    const stars = project.stars || 0;
    const rating = project.rating || 4.2;
    const ratingCount = project.ratingCount || 0;

    const rawEngagement = weightedUpvotes + (stars * 0.05) + (rating * ratingCount * 0.2);

    let freshnessBoost = 1.0;
    if (ageInHours <= 4) {
      freshnessBoost = 3.5;
    } else if (ageInHours <= 12) {
      freshnessBoost = 3.5 - (ageInHours - 4) * (2.0 / 8);
    } else if (ageInHours <= 24) {
      freshnessBoost = 1.5 - (ageInHours - 12) * (0.5 / 12);
    }

    return rawEngagement * freshnessBoost;
  };

  useEffect(() => {
    setLoading(true);
    const projCol = collection(db, "projects");
    // Listen to real-time additions of projects
    const q = query(projCol, orderBy("upvotes", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: Project[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as Project;
        // Filter down to SaaS type alternatives on client side to enable live modifications to type safely
        if (item.type === "saas") {
          loaded.push({ id: docSnap.id, ...item });
        }
      });

      // Sort with high-fidelity algorithms matching YouTube or Google search feeds
      const sorted = [...loaded].sort((a, b) => {
        const scoreA = computeSmartScore(a);
        const scoreB = computeSmartScore(b);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return (b.upvotes || 0) - (a.upvotes || 0);
      });

      setSaasProjects(sorted);
      setLoading(false);
    }, (error) => {
      console.error("Community SaaS subscription failed:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpvote = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (!auth.currentUser) {
      addToast("Please connect your profile to upvote projects!", "warning");
      return;
    }

    const userId = auth.currentUser.uid;
    const likeRef = doc(db, `projects/${project.id}/likes`, userId);
    const projRef = doc(db, "projects", project.id);

    // Dynamic voter tier checking for authority prioritizing
    let userTier = "free";
    try {
      const userProfileSnap = await getDoc(doc(db, "users", userId));
      if (userProfileSnap.exists()) {
        userTier = userProfileSnap.data().tier || "free";
      }
    } catch (ex) {
      console.warn("Could not retrieve user tier. Defaulting to free authority class:", ex);
    }

    const isProVoter = userTier === "pro" || userTier === "enterprise" || userTier === "test_1rs";

    try {
      const likeSnap = await getDoc(likeRef);
      if (likeSnap.exists()) {
        await deleteDoc(likeRef);
        
        const updatePayload: any = {
          upvotes: Math.max(0, (project.upvotes || 1) - 1),
          updatedAt: serverTimestamp()
        };
        if (isProVoter) {
          updatePayload.proUpvotes = Math.max(0, ((project as any).proUpvotes || 1) - 1);
        }
        await updateDoc(projRef, updatePayload);
        addToast(`Removed upvote from ${project.name}`, "info");
      } else {
        await setDoc(likeRef, {
          userId,
          createdAt: serverTimestamp()
        });

        const updatePayload: any = {
          upvotes: (project.upvotes || 0) + 1,
          updatedAt: serverTimestamp()
        };
        if (isProVoter) {
          updatePayload.proUpvotes = ((project as any).proUpvotes || 0) + 1;
        }
        await updateDoc(projRef, updatePayload);
        addToast(`Upvoted ${project.name}! ${isProVoter ? "Alt Pro Priority Weight Added! 🚀" : "Vote Added! 🔥"}`, "success");
      }
    } catch (err) {
      console.error("Upvote logic error:", err);
      addToast("Error casting upvote", "warning");
    }
  };

  const handleShare = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const deepLink = `${window.location.origin}${window.location.pathname}?view=details&project=${encodeURIComponent(project.id)}`;
    navigator.clipboard.writeText(deepLink)
      .then(() => {
        setCopiedId(project.id);
        addToast(`Copied deep-link for ${project.name}!`, "success");
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {
        addToast("Failed to copy link", "warning");
      });
  };

  // Search filter
  const filtered = saasProjects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.alternativeTo || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 font-sans">
      
      {/* Flare header banner */}
      <div className="bg-[#86efac] p-6 md:p-8 border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#000000] relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-100 opacity-40 rounded-full border-4 border-dashed border-black translate-x-12 -translate-y-12 pointer-events-none" />
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-black tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-black" />
            Community SaaS Registry
          </h2>
          <p className="text-xs md:text-sm text-stone-900 font-bold max-w-xl">
            A dynamic ledger of proprietary but open-oriented cloud alternatives submitted directly by the developer community.
          </p>
        </div>

        <button
          onClick={() => setView("submit")}
          className="bg-white hover:bg-stone-50 text-black border-2 border-black font-black px-4 py-2.5 rounded-lg flex items-center gap-1.5 text-xs uppercase shadow-[2.5px_2.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer shrink-0"
        >
          <PlusCircle className="h-4 w-4 stroke-[2.5px]" />
          Submit Yours
        </button>
      </div>

      {/* OPENALT WEEKLY SPOTLIGHTS & PRESTIGE AWARDS */}
      <div className="bg-stone-50 border-4 border-black p-6 rounded-2xl shadow-[5px_5px_0_0_#d8b4fe] space-y-5">
        <div className="flex items-center justify-between border-b border-black pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h3 className="font-sans font-black text-sm uppercase tracking-tight text-black">
              OpenAlt Weekly Spotlight Awards
            </h3>
          </div>
          <span className="text-[10px] font-mono bg-white border border-black text-[#7c3aed] uppercase font-black tracking-widest p-1 px-2.5 rounded-lg">
            Prestigious Backlinks
          </span>
        </div>

        {/* Spotlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Winner 1 */}
          <div className="bg-[#fffdf5] border-2 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#facc15] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-1 right-1 bg-black text-[#facc15] text-[7.5px] font-mono uppercase font-black px-1.5 py-0.5 rounded">
              Ranked #1
            </div>
            <div>
              <h4 className="font-sans font-black text-xs text-black">Planka Project</h4>
              <p className="text-[10px] text-stone-600 font-semibold leading-snug mt-1">
                A highly-responsive kanban workflow substitute. Perfect for self-hostable Docker teams.
              </p>
            </div>
            <div className="mt-3 text-[9px] font-mono font-black text-black uppercase bg-yellow-300 border border-black p-1 rounded text-center">
              #1 Jira Alternative
            </div>
          </div>

          {/* Winner 2 */}
          <div className="bg-[#fffdf5] border-2 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#facc15] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-1 right-1 bg-black text-[#facc15] text-[7.5px] font-mono uppercase font-black px-1.5 py-0.5 rounded">
              Ranked #1
            </div>
            <div>
              <h4 className="font-sans font-black text-xs text-black">AppFlowy Workspace</h4>
              <p className="text-[10px] text-stone-600 font-semibold leading-snug mt-1">
                Taking complete local workspace directories ownership. Offline markdown sync suite in Rust.
              </p>
            </div>
            <div className="mt-3 text-[9px] font-mono font-black text-black uppercase bg-yellow-300 border border-black p-1 rounded text-center">
              #1 Notion Alternative
            </div>
          </div>

          {/* Winner 3 */}
          <div className="bg-[#fffdf5] border-2 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#facc15] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-1 right-1 bg-black text-[#facc15] text-[7.5px] font-mono uppercase font-black px-1.5 py-0.5 rounded">
              Prestige Pick
            </div>
            <div>
              <h4 className="font-sans font-black text-xs text-black">Anytype Node</h4>
              <p className="text-[10px] text-stone-600 font-semibold leading-snug mt-1">
                Zero-trust decentralized workspace. Secure local graphs, peer-to-peer directory backups.
              </p>
            </div>
            <div className="mt-3 text-[9px] font-mono font-black text-black uppercase bg-violet-200 border border-black p-1 rounded text-center">
              Fastest Growing alternative
            </div>
          </div>

        </div>

        {/* Premium Badge Campaign pitch */}
        <div className="bg-stone-900 border-2 border-black p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-[#a7f3d0] uppercase tracking-wide">
              ★ Solve Your Zero-Visitor Problem For Free
            </h4>
            <p className="text-[10.5px] text-stone-300 font-bold leading-normal">
              To be considered for the "Fastest Growing Alternative" spotlight, pay a small $20 submission fee. If selected (or as candidate), download a beautiful custom embed badge. Linking this badge on your site drives traffic back to you!
            </p>
          </div>
          <button
            onClick={() => {
              setAwardProjectName("");
              setAwardReplacedTool("");
              setShowEmbedCode(false);
              setShowAwardModal(true);
            }}
            className="bg-[#facc15] hover:bg-yellow-400 text-black font-black uppercase text-xs py-2 px-3 rounded-lg border border-black shadow-[2px_2px_0_0_#000000] active:translate-y-0.5 shrink-0 cursor-pointer"
          >
            Apply for Prestige Badge ($20)
          </button>
        </div>
      </div>

      {/* A: PREMIUM AWARD SUBMISSION OVERLAY DIALOG */}
      {showAwardModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black max-w-md w-full rounded-2xl p-6 shadow-[8px_8px_0_0_#000000] space-y-5 animate-in zoom-in duration-150">
            
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h4 className="font-sans font-black text-sm text-black uppercase tracking-tight flex items-center gap-1.5">
                <span>🏆 Apply for Spotlight Placement</span>
              </h4>
              <button
                onClick={() => setShowAwardModal(false)}
                className="bg-stone-50 border border-black px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {!showEmbedCode ? (
              <form onSubmit={handleSubmitAwardApplication} className="space-y-4 text-xs font-semibold text-black">
                <div>
                  <label className="block text-[10px] font-mono font-black uppercase text-stone-600 mb-1">
                    Your SaaS Project Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={awardProjectName}
                    onChange={(e) => setAwardProjectName(e.target.value)}
                    placeholder="e.g. Acme Planner"
                    className="w-full bg-stone-50 border-2 border-black rounded-lg px-3 py-2 text-xs font-bold text-black"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black uppercase text-stone-600 mb-1">
                    Competitor proprietary replaced:
                  </label>
                  <input
                    type="text"
                    required
                    value={awardReplacedTool}
                    onChange={(e) => setAwardReplacedTool(e.target.value)}
                    placeholder="e.g. Jira, Notion, Salesforce"
                    className="w-full bg-stone-50 border-2 border-black rounded-lg px-3 py-2 text-xs font-bold text-black"
                  />
                </div>

                <div className="bg-stone-50 border-2 border-stone-200 p-3 rounded-lg text-[10.5px] space-y-1.5">
                  <p className="font-bold text-stone-500">💳 Secure Stripe Payment sandbox:</p>
                  <input
                    type="text"
                    required
                    placeholder="4242   4242   4242   4242"
                    className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-center font-mono placeholder:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={applyingForAward}
                  className="w-full bg-black text-white hover:bg-stone-800 border-2 border-black py-3 rounded-xl text-xs font-black uppercase text-center shadow-[3.5px_3.5px_0_0_#86efac] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                >
                  {applyingForAward ? "Authorizing billing sandbox..." : "Apply & Unlock Badge Embeds ($20)"}
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-xs text-stone-800">
                <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-xl text-emerald-900 text-center">
                  <span className="text-xl">⭐</span>
                  <h4 className="font-sans font-black text-xs uppercase mt-1">Application Authorized!</h4>
                  <p className="text-[11px] font-bold mt-1">
                    Your badge is unlocked. Embed this on your SaaS website footer or headers to verify your elite status!
                  </p>
                </div>

                {/* Badge Preview */}
                <div className="border-2 border-dashed border-stone-300 p-4 flex justify-center bg-stone-50 rounded-lg">
                  <div className="inline-flex items-center border-3 border-black bg-[#facc15] p-2 px-3 font-mono font-black text-black uppercase shadow-[2.5px_2.5px_0_0_#000000] text-[10.5px]">
                    🏆 Ranked #1 {awardReplacedTool || "Notion"} Alternative on OpenAlt
                  </div>
                </div>

                {/* Copy snippet tools */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono font-black uppercase text-stone-600">
                    HTML Embed Code snippet:
                  </label>
                  <textarea
                    readOnly
                    value={getEmbedHtmlCode()}
                    className="w-full bg-stone-900 text-stone-200 font-mono text-[9px] p-2.5 rounded-lg h-24 select-all"
                  />
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={handleCopyEmbedCode}
                    className="flex-1 bg-black text-white hover:bg-neutral-800 font-black py-2 rounded-lg text-xs uppercase text-center cursor-pointer"
                  >
                    {copiedBadgeCode ? "Copied!" : "Copy Embed Code"}
                  </button>
                  <button
                    onClick={() => setShowAwardModal(false)}
                    className="px-4 border border-black hover:bg-stone-100 rounded-lg text-xs uppercase font-bold text-stone-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search filtering bar */}
      <div className="bg-white border-4 border-black p-4 rounded-xl shadow-[4px_4px_0_0_#000000] flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3 top-3.5 text-stone-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SaaS by name, tagline, or software replaced (e.g. Firebase, Trello)..."
            className="w-full bg-stone-50 border-2 border-black rounded-lg py-2.5 pl-10 pr-4 text-xs font-bold text-black focus:bg-white transition"
          />
        </div>
        
        <span className="shrink-0 font-mono text-[10px] font-black uppercase text-stone-600 bg-stone-100 border border-black px-3 py-2 rounded-lg">
          📟 {filtered.length} SaaS Listed
        </span>
      </div>

      {/* List grids */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
          <div className="h-10 w-10 text-black animate-spin border-4 border-[#86efac] border-t-black rounded-full" />
          <p className="text-xs font-extrabold uppercase tracking-widest font-mono">Quarrying community index...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-4 border-black p-12 text-center rounded-2xl shadow-[5px_5px_0_0_#000000]">
          <h3 className="font-sans font-black text-lg text-black">No Registry Matches</h3>
          <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
            Try adjusting your search criteria, or be the pioneer who registers a brand new SaaS alternative platform today!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((proj) => {
            const isFav = isBookmarked(proj.id);
            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj)}
                className="group bg-white border-4 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000000] transition-all flex flex-col justify-between space-y-4 cursor-pointer relative"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-1 border-b border-dashed border-stone-250 pb-2 flex-wrap">
                    <span className="text-[9px] font-mono font-black uppercase tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-500 px-2 py-0.5 rounded">
                      SaaS ALTERNATIVE
                    </span>
                    
                    {proj.alternativeTo && (
                      <span className="text-[9px] font-mono font-black uppercase bg-violet-50 text-violet-800 border border-violet-400 px-1.5 py-0.5 rounded">
                        Replaces: {proj.alternativeTo}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-md font-sans font-black text-black group-hover:underline flex items-center justify-between gap-1">
                      <span className="truncate">{proj.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-stone-500 hover:text-black shrink-0" />
                    </h4>
                    <p className="text-xs text-stone-600 font-bold leading-relaxed line-clamp-3">
                      {proj.description}
                    </p>
                  </div>

                  {proj.submitterName && (
                    <div className="border-t border-dashed border-stone-200 pt-3 flex items-center justify-between gap-1.5 text-[10px] text-stone-650 font-mono flex-wrap">
                      <span className="font-bold">By: <span className="text-stone-900 underline font-black">{proj.submitterName}</span></span>
                      <UserBadge userId={proj.submitterId} />
                    </div>
                  )}
                </div>

                <div className="border-t border-stone-200 pt-3 flex items-center justify-between gap-2">
                  {/* Upvote button */}
                  <button
                    onClick={(e) => handleUpvote(e, proj)}
                    className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border-2 border-black px-2.5 py-1 rounded-lg text-xs font-mono font-black text-black shadow-[1.5px_1.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <ArrowUp className="h-3.5 w-3.5 text-emerald-600 stroke-[3.5px]" />
                    <span>{proj.upvotes || 0}</span>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleShare(e, proj)}
                      className="p-1.5 rounded-lg border-2 border-black bg-stone-50 hover:bg-stone-100 text-black shadow-[1.5px_1.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer relative"
                    >
                      {copiedId === proj.id ? (
                        <span className="text-[7px] font-mono font-black text-green-600">Copied!</span>
                      ) : (
                        <Share2 className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => onToggleBookmark(proj)}
                      className={`p-1.5 rounded-lg border-2 border-black transition-all shadow-[1.5px_1.5px_0_0_#000000] cursor-pointer ${
                        isFav ? "bg-[#ec4899] text-white" : "bg-white text-black hover:bg-stone-50"
                      }`}
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
