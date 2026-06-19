import React, { useState, useEffect } from "react";
import { 
  Flame, 
  MessageSquare, 
  Share2, 
  TrendingUp, 
  Sparkles, 
  ShieldAlert, 
  Send,
  ThumbsUp,
  Award,
  Vote,
  Target,
  Clock,
  Hourglass
} from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  addDoc,
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  increment
} from "firebase/firestore";

interface BattleComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  alliance: "A" | "B";
  createdAt: any;
}

interface BattleOption {
  id: string;
  name: string;
  color: string;
  tagline: string;
  alliance: "A" | "B";
}

interface Battle {
  id: string;
  title: string;
  desc: string;
  category: string;
  optionA: BattleOption;
  optionB: BattleOption;
  votesA: number;
  votesB: number;
  viralCount: number;
  deadlineAt?: any;
}

const PRESET_BATTLES: Battle[] = [
  {
    id: "firebase-vs-supabase",
    title: "Firebase vs Supabase",
    desc: "The ultimately polarized backend warfare. Proprietary Google architecture vs Open-source Postgres power. Who wins the cloud database throne?",
    category: "Backend Databases",
    optionA: {
      id: "firebase",
      name: "Firebase",
      color: "from-amber-500 to-orange-600 bg-orange-500 hover:bg-orange-600",
      tagline: "Proprietary, massive SDK, robust Google syncing",
      alliance: "A"
    },
    optionB: {
      id: "supabase",
      name: "Supabase",
      color: "from-emerald-500 to-green-600 bg-emerald-500 hover:bg-emerald-600",
      tagline: "Open-source, absolute database freedom, row-level security",
      alliance: "B"
    },
    votesA: 342,
    votesB: 418,
    viralCount: 68
  },
  {
    id: "react-vs-svelte",
    title: "React vs Svelte",
    desc: "Bloated virtual DOM rendering against compile-time surgical purity. Is Svelte the true heir, or does React's immense ecosystem rule forever?",
    category: "Frontend Frameworks",
    optionA: {
      id: "react",
      name: "React.js",
      color: "from-cyan-400 to-blue-600 bg-cyan-500 hover:bg-cyan-600",
      tagline: "Huge community support, industry dominant, Virtual DOM",
      alliance: "A"
    },
    optionB: {
      id: "svelte",
      name: "Svelte",
      color: "from-red-500 to-orange-500 bg-red-500 hover:bg-red-600",
      tagline: "Zero-runtime overhead, compiler-driven, ultra-lightweight",
      alliance: "B"
    },
    votesA: 521,
    votesB: 492,
    viralCount: 112
  },
  {
    id: "postgresql-vs-mongodb",
    title: "PostgreSQL vs MongoDB",
    desc: "Rigorous transactional integrity of SQL schemas against the chaos and scaling speed of JSON documents. Schema enforcement or dynamic schema freedom?",
    category: "Core Databases",
    optionA: {
      id: "postgres",
      name: "PostgreSQL",
      color: "from-blue-600 to-slate-800 bg-blue-700 hover:bg-blue-800",
      tagline: "Extremely extensible, robust ACID compliancy, powerful queries",
      alliance: "A"
    },
    optionB: {
      id: "mongodb",
      name: "MongoDB",
      color: "from-green-500 to-emerald-700 bg-green-600 hover:bg-green-700",
      tagline: "Frictionless JSON documents, high horizontal scaling, fast prototype",
      alliance: "B"
    },
    votesA: 409,
    votesB: 295,
    viralCount: 45
  },
  {
    id: "tailwind-vs-bootstrap",
    title: "Tailwind CSS vs Bootstrap",
    desc: "Pixel-perfect atomic utility classes vs pre-designed UI components. Speed of markup or structured responsive grid building?",
    category: "CSS Frameworks",
    optionA: {
      id: "tailwind",
      name: "Tailwind CSS",
      color: "from-cyan-400 to-teal-500 bg-cyan-400 hover:bg-cyan-500",
      tagline: "Atomic helper utility design, zero unused class bloat, rapid custom polish",
      alliance: "A"
    },
    optionB: {
      id: "bootstrap",
      name: "Bootstrap",
      color: "from-purple-600 to-indigo-700 bg-purple-600 hover:bg-purple-700",
      tagline: "Standard responsive boilerplate grids, styled buttons & inputs out-of-the-box",
      alliance: "B"
    },
    votesA: 622,
    votesB: 189,
    viralCount: 39
  },
  {
    id: "notion-vs-obsidian",
    title: "Notion vs Obsidian",
    desc: "Collaborative cloud block storage workspace vs markdown-first local directory graph layout. Who is the true king of second-brain productivity?",
    category: "Second-Brain Apps",
    optionA: {
      id: "notion",
      name: "Notion",
      color: "from-stone-900 to-stone-700 bg-stone-950 hover:bg-stone-900",
      tagline: "Sleek clouds, custom multi-relational spreadsheets, rich block media",
      alliance: "A"
    },
    optionB: {
      id: "obsidian",
      name: "Obsidian",
      color: "from-indigo-500 to-purple-600 bg-indigo-500 hover:bg-indigo-600",
      tagline: "Local markdown files, offline forever, full graph node linking",
      alliance: "B"
    },
    votesA: 310,
    votesB: 479,
    viralCount: 88
  }
];

interface BattlePageProps {
  onLogin: () => void;
  addToast: (message: string, type?: "success" | "info" | "warning") => void;
}

export default function BattlePage({ onLogin, addToast }: BattlePageProps) {
  const [battles, setBattles] = useState<Battle[]>(PRESET_BATTLES);
  const [selectedBattleId, setSelectedBattleId] = useState<string>("firebase-vs-supabase");
  const [comments, setComments] = useState<BattleComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [selectedAlliance, setSelectedAlliance] = useState<"A" | "B">("A");
  const [loadingComments, setLoadingComments] = useState(false);
  const [votedMap, setVotedMap] = useState<Record<string, "A" | "B">>({});

  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isEnded, setIsEnded] = useState<boolean>(false);

  // Custom battle creation form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [catInput, setCatInput] = useState("Developer Utilities");
  const [optAName, setOptAName] = useState("");
  const [optATag, setOptATag] = useState("");
  const [optBName, setOptBName] = useState("");
  const [optBTag, setOptBTag] = useState("");
  const [chooseDeadlineDays, setChooseDeadlineDays] = useState<number>(3); // default 3 days

  const activeBattle = battles.find(b => b.id === selectedBattleId) || battles[0];

  // 1. Recover local voting records to prevent spam double-voting
  useEffect(() => {
    const records = localStorage.getItem("openalt_voted_battles");
    if (records) {
      try {
        setVotedMap(JSON.parse(records));
      } catch (e) {
        console.warn("Could not load local votes storage map", e);
      }
    }
  }, []);

  // 1b. Live ticking Countdown effect
  useEffect(() => {
    if (!activeBattle || !activeBattle.deadlineAt) {
      setTimeLeft("");
      setIsEnded(false);
      return;
    }

    function calculateTime() {
      const targetTime = new Date(activeBattle.deadlineAt).getTime();
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft("CONTEST ENDED");
        setIsEnded(true);
      } else {
        setIsEnded(false);
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        let finalStr = "";
        if (days > 0) finalStr += `${days}d `;
        finalStr += `${hours}h ${minutes}m ${seconds}s`;
        setTimeLeft(finalStr);
      }
    }

    calculateTime();
    const ticker = setInterval(calculateTime, 1000);
    return () => clearInterval(ticker);
  }, [activeBattle?.deadlineAt]);

  // 1c. Load all battles from Firestore, merge with presets
  useEffect(() => {
    const q = query(collection(db, "battles"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbBattles: Battle[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        dbBattles.push({
          id: docSnap.id,
          title: data.title || "Custom Battle",
          desc: data.desc || "A custom-created comparison battleground.",
          category: data.category || "General Tech",
          optionA: data.optionA || {
            id: "choiceA",
            name: "Option A",
            color: "from-blue-500 to-indigo-600 bg-blue-500 hover:bg-blue-600",
            tagline: "Alternative Choice A",
            alliance: "A"
          },
          optionB: data.optionB || {
            id: "choiceB",
            name: "Option B",
            color: "from-red-500 to-pink-600 bg-red-500 hover:bg-red-600",
            tagline: "Alternative Choice B",
            alliance: "B"
          },
          votesA: data.votesA || 0,
          votesB: data.votesB || 0,
          viralCount: data.viralCount || 0,
          deadlineAt: data.deadlineAt ? (data.deadlineAt.toDate ? data.deadlineAt.toDate() : new Date(data.deadlineAt)) : undefined
        });
      });

      setBattles(prev => {
        const merged = [...dbBattles];
        PRESET_BATTLES.forEach(p => {
          if (!merged.some(m => m.id === p.id)) {
            merged.push(p);
          }
        });
        return merged;
      });
    }, (err) => {
      console.warn("Could not load database battles feed, using offline cache:", err);
    });

    return () => unsubscribe();
  }, []);

  // 1d. Handle query parameter preset selector read
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const battleIdParam = params.get("battleId");
    if (battleIdParam) {
      setSelectedBattleId(battleIdParam);
    }
  }, []);

  // 2. Bootstrap selected preset battle in Firestore on click if missing
  useEffect(() => {
    const path = `battles/${selectedBattleId}`;
    const unsubscribe = onSnapshot(doc(db, path), (snapshot) => {
      if (!snapshot.exists()) {
        const preset = PRESET_BATTLES.find(b => b.id === selectedBattleId);
        if (preset) {
          setDoc(doc(db, path), {
            id: preset.id,
            title: preset.title,
            desc: preset.desc,
            category: preset.category,
            optionA: preset.optionA,
            optionB: preset.optionB,
            votesA: preset.votesA,
            votesB: preset.votesB,
            viralCount: preset.viralCount,
            createdAt: serverTimestamp()
          }).catch(err => console.warn("Firestore Battle bootstrap offline/fail:", err));
        }
      }
    }, (error) => {
      console.error("Battle bootstrap check subscription error:", error);
    });

    return () => unsubscribe();
  }, [selectedBattleId]);

  // 3. Fetch and update commentary feedback feed in real-time
  useEffect(() => {
    setLoadingComments(true);
    const commentsPath = `battles/${selectedBattleId}/comments`;
    const q = query(
      collection(db, commentsPath),
      orderBy("createdAt", "desc"),
      limit(25)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatArr: BattleComment[] = [];
      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        chatArr.push({
          id: docSnap.id,
          authorName: item.authorName || "Anonymous Builder",
          authorAvatar: item.authorAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${docSnap.id}`,
          content: item.content || "",
          alliance: item.alliance || "A",
          createdAt: item.createdAt?.toDate() || new Date()
        });
      });
      setComments(chatArr);
      setLoadingComments(false);
    }, (error) => {
      console.warn("Comments real-time failed, falling back to mock:", error);
      // Fallback comments
      setComments([
        {
          id: "m1",
          authorName: "SvelteMaster",
          authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop",
          content: "React is a giant dinosaur. The compiler model is obviously the future. Svelte wins easily!",
          alliance: "B",
          createdAt: new Date(Date.now() - 3600000)
        },
        {
          id: "m2",
          authorName: "EnterpriseGiant",
          authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop",
          content: "Good luck hiring 200 developers who know Svelte when you scale. React ecosystem wins the business debate every single time.",
          alliance: "A",
          createdAt: new Date(Date.now() - 7200000)
        }
      ]);
      setLoadingComments(false);
    });

    return () => unsubscribe();
  }, [selectedBattleId]);

  // 4. Casting of votes logic
  const handleCastVote = async (alliance: "A" | "B") => {
    if (!auth.currentUser) {
      addToast("You must connect your profile or sign in to participate in the Tug of War battlegrounds! ⚔️", "warning");
      onLogin();
      return;
    }

    if (isEnded) {
      addToast("This grand tribal war campaign of repository tugs is now closed! Winner is classified! 🏁", "warning");
      return;
    }

    if (votedMap[selectedBattleId]) {
      addToast("You've already defended your side in this war battleground today! ⚔️", "info");
      return;
    }

    const path = `battles/${selectedBattleId}`;
    try {
      const docRef = doc(db, path);
      if (alliance === "A") {
        await updateDoc(docRef, { votesA: increment(1) });
      } else {
        await updateDoc(docRef, { votesB: increment(1) });
      }

      const updatedMap = { ...votedMap, [selectedBattleId]: alliance };
      setVotedMap(updatedMap);
      localStorage.setItem("openalt_voted_battles", JSON.stringify(updatedMap));

      addToast(`Defense submitted for ${alliance === "A" ? activeBattle.optionA.name : activeBattle.optionB.name}! Keep fighting! ✊`, "success");
    } catch (err) {
      console.warn("Could not save vote securely to Firebase:", err);
      // local optimistic update if firebase rule fails / offline
      setBattles(prev => prev.map(b => b.id === selectedBattleId ? {
        ...b,
        votesA: alliance === "A" ? b.votesA + 1 : b.votesA,
        votesB: alliance === "B" ? b.votesB + 1 : b.votesB
      } : b));
      const updatedMap = { ...votedMap, [selectedBattleId]: alliance };
      setVotedMap(updatedMap);
      localStorage.setItem("openalt_voted_battles", JSON.stringify(updatedMap));
      addToast("Vote parsed locally. Database synchronization completed.", "success");
    }
  };

  // 4b. Set dynamic battle campaign deadlines
  const handleSetDeadline = async (days: number) => {
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const path = `battles/${selectedBattleId}`;
    try {
      await updateDoc(doc(db, path), {
        deadlineAt: futureDate
      });
      addToast(`Tug of War showdown deadline successfully synced to ${days} day(s)! ⏳`, "success");
    } catch (err) {
      console.warn("Could not set firebase deadline on battles:", err);
      // Fallback local update
      setBattles(prev => prev.map(b => b.id === selectedBattleId ? {
        ...b,
        deadlineAt: futureDate
      } : b));
      addToast(`Showdown deadline scheduled locally for ${days} days.`, "success");
    }
  };

  // 5. Sending trash-talk comments
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!auth.currentUser) {
      addToast("Conscript into the Tech War by signing in first!", "warning");
      onLogin();
      return;
    }

    const usernameStr = auth.currentUser.displayName || "Indie Conscript";
    const avatarStr = auth.currentUser.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${auth.currentUser.uid}`;
    
    const commentPayload = {
      authorName: usernameStr,
      authorAvatar: avatarStr,
      content: commentText.trim().substring(0, 300),
      alliance: selectedAlliance,
      createdAt: serverTimestamp()
    };

    const commentsPath = `battles/${selectedBattleId}/comments`;

    try {
      await addDoc(collection(db, commentsPath), commentPayload);
      setCommentText("");
      addToast("Fired verbal bullet into battleground comments feed! 💬", "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, commentsPath);
    }
  };

  // 6. Sharing war results
  const handleShareBattle = async () => {
    const total = activeBattle.votesA + activeBattle.votesB;
    const pctA = Math.round((activeBattle.votesA / (total || 1)) * 100);
    const pctB = 100 - pctA;
    
    const inviteText = `🔥 TECH WARZONE: ${activeBattle.optionA.name} (${pctA}%) vs ${activeBattle.optionB.name} (${pctB}%)\n\nCast your vote and defend your custom software stack now:\n👉 ${window.location.origin}${window.location.pathname}?view=battles&battleId=${selectedBattleId}\n\nPS: Get free open source software alternatives at openalts.web.app`;
    
    try {
      await navigator.clipboard.writeText(inviteText);
      addToast("Viral recruitment message copied to clipboard! Share it in your channels, Reddit, or Discord! 📣", "success");
      
      // Update viral count in Firebase
      await updateDoc(doc(db, `battles/${selectedBattleId}`), { viralCount: increment(1) });
    } catch (e) {
      addToast("Copied search link. Distribute the battlefield parameters!", "info");
    }
  };

  const handleCreateCustomBattle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !descInput.trim() || !optAName.trim() || !optBName.trim()) {
      addToast("Please fill all required showdown fields!", "warning");
      return;
    }

    if (!auth.currentUser) {
      addToast("Conscript onto the Tech War by signing in first!", "warning");
      onLogin();
      return;
    }

    const docId = "custom-" + Math.random().toString(36).substring(2, 9);
    let deadlineAt: Date | null = null;
    if (chooseDeadlineDays > 0) {
      deadlineAt = new Date(Date.now() + chooseDeadlineDays * 24 * 60 * 60 * 1000);
    }

    const newBattleData = {
      id: docId,
      title: titleInput.trim(),
      desc: descInput.trim(),
      category: catInput.trim() || "Developer Utilities",
      optionA: {
        id: "choiceA",
        name: optAName.trim(),
        color: "from-blue-500 to-cyan-600 bg-blue-500 hover:bg-blue-600",
        tagline: optATag.trim() || "Proprietary heavyweight candidate",
        alliance: "A" as const
      },
      optionB: {
        id: "choiceB",
        name: optBName.trim(),
        color: "from-red-500 to-pink-600 bg-red-500 hover:bg-red-600",
        tagline: optBTag.trim() || "Flexible alternative option",
        alliance: "B" as const
      },
      votesA: 0,
      votesB: 0,
      viralCount: 0,
      deadlineAt: deadlineAt,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, "battles", docId), newBattleData);
      
      // Select the newly built custom battle arena!
      setSelectedBattleId(docId);
      setShowCreateModal(false);

      // Clean inputs
      setTitleInput("");
      setDescInput("");
      setOptAName("");
      setOptATag("");
      setOptBName("");
      setOptBTag("");

      addToast("⚔️ New Versus Showdown successfully built! Share it to start the Tug of War!", "success");
    } catch (err) {
      console.error("Could not write battle arena document:", err);
      addToast("Could not build Battlegrounds securely. Check Firestore credentials.", "warning");
    }
  };

  // Calculations for bar rendering
  const totalVotes = activeBattle.votesA + activeBattle.votesB;
  const pctA = totalVotes === 0 ? 50 : Math.round((activeBattle.votesA / totalVotes) * 100);
  const pctB = 100 - pctA;

  return (
    <div className="space-y-10 font-sans max-w-6xl mx-auto">
      
      {/* Mega Jumbotron Billboard */}
      <div className="bg-[#fff3c4] border-4 border-black p-6 md:p-8 rounded-3xl shadow-[6px_6px_0_0_#000000] space-y-4 relative overflow-hidden">
        <div className="absolute top-2 right-2 flex gap-1 font-mono text-[9px] bg-black text-[#fde047] border border-black p-1 px-2 rounded-lg font-black uppercase">
          <span className="animate-pulse text-red-500">●</span> Live Tribunal Grid Active
        </div>
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Flame className="h-9 w-9 text-red-500 fill-yellow-300 animate-bounce cursor-pointer shrink-0" />
            <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight leading-none text-left">
              The VERSUS Battlegrounds
            </h2>
          </div>
          
          <button
            onClick={() => {
              if (!auth.currentUser) {
                addToast("Please login first to build custom battle arenas!", "warning");
                onLogin();
                return;
              }
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-[#8b5cf6] hover:bg-purple-700 text-white border-2 border-black font-mono text-xs font-black uppercase rounded-xl shadow-[3px_3px_0_0_#000000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer block"
          >
            ➕ Create Custom Showdown
          </button>
        </div>

        <p className="text-sm text-stone-900 font-sans max-w-3xl leading-relaxed font-bold text-left">
          Developer communities are incredibly tribal. We weaponize this tribalism to find the ultimate truth! Vote on active battles, cast your defense bullets, read hot trash-talk, and share battlefield updates with your Discord, Slack, and Reddit communities to secure victory!
        </p>

        {/* Horizontal scroll selector of preset tech showdowns */}
        <div className="flex gap-2.5 overflow-x-auto pt-2 pb-1 pr-2 no-scrollbar border-t-2 border-black/10">
          {battles.map((b) => {
            const isActive = b.id === selectedBattleId;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBattleId(b.id)}
                className={`py-2 px-4 rounded-xl border-2 border-black text-xs font-black uppercase tracking-wider shrink-0 transition-all shadow-[2px_2px_0_0_#000000] active:translate-y-0.5 active:shadow-none hover:-translate-y-0.5 ${
                  isActive 
                    ? "bg-[#fde047] text-black shadow-[4px_4px_0_0_#000000] scale-102"
                    : "bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {b.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Duel Screen Area layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column: TUG OF WAR VOTE & CONTROLS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border-4 border-black rounded-3xl p-6 md:p-8 shadow-[6px_6px_0_0_#000000] space-y-6">
            
            {/* Battle category & description */}
            <div className="space-y-2 border-b-2 border-black pb-4 text-center">
              <span className="font-mono text-[10px] uppercase font-black tracking-widest text-[#7c3aed] bg-[#f3e8ff] px-2 py-1 rounded-md border border-[#c084fc]">
                {activeBattle.category} Showdown
              </span>
              <h3 className="text-2xl font-black text-black pt-1">{activeBattle.title}</h3>
              <p className="text-xs text-stone-600 font-semibold leading-relaxed max-w-xl mx-auto pt-1">
                {activeBattle.desc}
              </p>
            </div>

            {/* Countdown / Deadline management panel */}
            <div className="bg-[#f8fafc] border-3 border-black p-4 rounded-2xl shadow-[3px_3px_0_0_#000000] space-y-3 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-dashed border-stone-200 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-stone-750 stroke-[2.5px]" />
                  <span className="text-xs font-black uppercase text-stone-800 tracking-wider">Showdown Timeline</span>
                </div>
                {timeLeft ? (
                  <div className={`px-2.5 py-1 text-2xs font-mono font-black uppercase rounded-md border border-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0_0_#000000] ${
                    isEnded ? "bg-[#ef4444] text-white" : "bg-[#fde047] text-black animate-pulse"
                  }`}>
                    <Hourglass className="h-3 w-3 animate-spin duration-[5s] shrink-0" />
                    <span>{timeLeft}</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-stone-500 font-black uppercase bg-stone-100 px-2 py-0.5 rounded border border-stone-300">No active deadline set</span>
                )}
              </div>

              {/* Display Winners Badge if contest ended */}
              {isEnded ? (
                <div className="bg-yellow-105 border-2 border-black p-3 rounded-xl flex items-center justify-center gap-2 text-center animate-bounce">
                  <Award className="h-5 w-5 text-amber-500 fill-amber-300 shrink-0" />
                  <p className="text-xs font-sans font-black text-stone-900 uppercase">
                    VICTORIA CLASSIFIED: {activeBattle.votesA > activeBattle.votesB ? activeBattle.optionA.name : activeBattle.optionB.name} won the tug of war! 🏆
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <span className="text-[10px] text-stone-700 font-bold leading-tight">
                    {activeBattle.deadlineAt 
                      ? "Extend or adjust this campaign finish line:" 
                      : "Set a custom countdown timer to finalize this war:"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => handleSetDeadline(1)}
                      className="px-2 py-1 bg-white hover:bg-stone-50 text-[9px] font-black uppercase text-stone-800 border-2 border-black rounded-lg transition-all shadow-[1.5px_1.5px_0_0_#000000] active:translate-y-0.5 cursor-pointer"
                    >
                      1 Day
                    </button>
                    <button
                      onClick={() => handleSetDeadline(3)}
                      className="px-2 py-1 bg-white hover:bg-stone-50 text-[9px] font-black uppercase text-stone-800 border-2 border-black rounded-lg transition-all shadow-[1.5px_1.5px_0_0_#000000] active:translate-y-0.5 cursor-pointer"
                    >
                      3 Days
                    </button>
                    <button
                      onClick={() => handleSetDeadline(7)}
                      className="px-2 py-1 bg-white hover:bg-stone-50 text-[9px] font-black uppercase text-stone-800 border-2 border-black rounded-lg transition-all shadow-[1.5px_1.5px_0_0_#000000] active:translate-y-0.5 cursor-pointer"
                    >
                      1 Week
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Duelists Info Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Option A */}
              <div className="bg-[#f0f9ff] border-3 border-black p-4 rounded-2xl flex flex-col justify-between text-center space-y-3 shadow-[3px_3px_0_0_#000000]">
                <div>
                  <div className="h-6 w-6 mx-auto rounded-full bg-blue-500 border border-black flex items-center justify-center text-white font-mono text-[9px] font-black">A</div>
                  <h4 className="font-sans font-black text-md text-black pt-1">{activeBattle.optionA.name}</h4>
                  <p className="text-[10px] text-stone-500 font-bold mt-1 line-clamp-2 leading-tight">
                    {activeBattle.optionA.tagline}
                  </p>
                </div>
                <button
                  onClick={() => handleCastVote("A")}
                  className={`w-full py-2 px-3 text-2xs font-extrabold uppercase rounded-lg border-2 border-black text-white shadow-[2px_2px_0_0_#000000] active:translate-y-0.5 active:shadow-none hover:-translate-y-0.5 transition-all ${activeBattle.optionA.color}`}
                >
                  Defend {activeBattle.optionA.name}
                </button>
              </div>

              {/* Option B */}
              <div className="bg-[#fef2f2] border-3 border-black p-4 rounded-2xl flex flex-col justify-between text-center space-y-3 shadow-[3px_3px_0_0_#000000]">
                <div>
                  <div className="h-6 w-6 mx-auto rounded-full bg-red-500 border border-black flex items-center justify-center text-white font-mono text-[9px] font-black">B</div>
                  <h4 className="font-sans font-black text-md text-black pt-1">{activeBattle.optionB.name}</h4>
                  <p className="text-[10px] text-stone-500 font-bold mt-1 line-clamp-2 leading-tight">
                    {activeBattle.optionB.tagline}
                  </p>
                </div>
                <button
                  onClick={() => handleCastVote("B")}
                  className={`w-full py-2 px-3 text-2xs font-extrabold uppercase rounded-lg border-2 border-black text-white shadow-[2px_2px_0_0_#000000] active:translate-y-0.5 active:shadow-none hover:-translate-y-0.5 transition-all ${activeBattle.optionB.color}`}
                >
                  Defend {activeBattle.optionB.name}
                </button>
              </div>

            </div>

            {/* NEOBRUTAL TUG-OF-WAR PROGRESS SLIDER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-black border-b border-dashed border-stone-200 pb-1">
                <span className="text-blue-800">{activeBattle.optionA.name} Alliance: {pctA}%</span>
                <span className="text-red-800">{pctB}% :Alliance {activeBattle.optionB.name}</span>
              </div>
              
              <div className="h-10 border-4 border-black rounded-xl overflow-hidden shadow-[4px_4px_0_0_#000000] flex relative">
                {/* Team A Slide */}
                <div 
                  className="bg-sky-400 h-full border-r-2 border-black flex items-center font-mono text-[10px] pl-4 font-black text-black select-none transition-all duration-500"
                  style={{ width: `${pctA}%` }}
                >
                  {pctA >= 15 && `${activeBattle.votesA} votes`}
                </div>
                {/* Tug of war marker */}
                <div className="absolute top-0 bottom-0 w-1 bg-black z-10" style={{ left: `${pctA}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full h-8 w-8 bg-yellow-300 border-4 border-black z-20 flex items-center justify-center text-xs font-extrabold" style={{ left: `${pctA}%` }}>
                  VS
                </div>
                {/* Team B Slide */}
                <div 
                  className="bg-red-400 h-full flex items-center justify-end font-mono text-[10px] pr-4 font-black text-black select-none transition-all duration-500"
                  style={{ width: `${pctB}%` }}
                >
                  {pctB >= 15 && `${activeBattle.votesB} votes`}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono font-bold leading-none">
                <span>{totalVotes} total responses cast</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Real-time active polling
                </span>
              </div>
            </div>

            {/* Share viral trigger recruitment button */}
            <div className="pt-2">
              <button
                onClick={handleShareBattle}
                className="w-full bg-[#fde047] hover:bg-yellow-400 text-black font-extrabold uppercase tracking-wider text-xs border-4 border-black py-4 rounded-xl shadow-[4px_4px_0_0_#10b981] active:translate-y-0.5 active:shadow-none hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                <span>Enlist Reinforcements (Share Battle & Invite Friends!)</span>
              </button>
              <span className="block text-center text-[10px] text-stone-500 font-bold mt-2">
                Recruited alliances have shared this battle <span className="font-mono text-black font-black">{activeBattle.viralCount}</span> times in external message feeds!
              </span>
            </div>

          </div>
        </div>

        {/* Right column: TRASH TALK COMMENT SECTION */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[6px_6px_0_0_#000000] flex flex-col h-[525px] justify-between">
            
            {/* Section Header */}
            <div>
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-5 w-5 text-black shrink-0" />
                  <h4 className="font-sans font-black text-sm text-black uppercase tracking-tight">Active Trash-Talk Feed</h4>
                </div>
                <span className="bg-rose-100 text-rose-800 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border border-rose-300">
                  Uncensored Opinion
                </span>
              </div>
              <p className="text-[10px] text-stone-500 font-semibold leading-relaxed pt-2">
                Builder talk is brutal. Add your comment. Choose your team's badge to highlight of which alliance you fight for!
              </p>
            </div>

            {/* Bubble Messages stream container */}
            <div className="flex-1 my-4 overflow-y-auto pr-1 space-y-3.5 max-h-[300px] min-h-[220px]">
              {loadingComments ? (
                <div className="py-12 text-center text-xs text-stone-500 font-bold animate-pulse">
                  Deploying comment streams...
                </div>
              ) : comments.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-400 italic font-medium">
                  The battlefield is quiet. Fire the first opinion below!
                </div>
              ) : (
                comments.map((comm) => {
                  const isAllianceA = comm.alliance === "A";
                  return (
                    <div 
                      key={comm.id} 
                      className={`p-3 rounded-xl border-2 border-black text-xs space-y-1.5 shadow-[2px_2px_0_0_#000000] relative ${
                        isAllianceA ? "bg-[#f0f9ff]" : "bg-[#fef2f2]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img 
                            src={comm.authorAvatar} 
                            alt={comm.authorName} 
                            className="h-5 w-5 rounded-full border border-black shrink-0"
                          />
                          <span className="font-extrabold text-black truncate max-w-[120px]">{comm.authorName}</span>
                        </div>
                        <span 
                          className={`font-mono text-[8px] font-bold uppercase border-2 p-0.5 px-1.5 rounded-full ${
                            isAllianceA 
                              ? "bg-blue-100 text-blue-800 border-blue-300"
                              : "bg-red-100 text-red-800 border-red-300"
                          }`}
                        >
                          Team {isAllianceA ? activeBattle.optionA.name : activeBattle.optionB.name}
                        </span>
                      </div>
                      <p className="text-stone-700 leading-snug font-bold">
                        {comm.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form submit input tools */}
            <form onSubmit={handleSendComment} className="border-t-2 border-dashed border-stone-200 pt-4 space-y-3">
              
              {/* Alliance alliance selection helper */}
              <div className="flex items-center justify-between gap-2 bg-stone-50 border-2 border-black p-1.5 rounded-xl text-2xs">
                <span className="font-mono text-stone-500 font-bold uppercase pl-1 shrink-0">Declare Loyalty:</span>
                <div className="flex gap-1 flex-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedAlliance("A")}
                    className={`py-1 px-2.5 rounded-lg border text-2xs font-bold uppercase transition-all truncate max-w-[100px] ${
                      selectedAlliance === "A"
                        ? "bg-sky-400 text-black border-black font-black"
                        : "bg-white text-stone-500 border-stone-200"
                    }`}
                  >
                    {activeBattle.optionA.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAlliance("B")}
                    className={`py-1 px-2.5 rounded-lg border text-2xs font-bold uppercase transition-all truncate max-w-[100px] ${
                      selectedAlliance === "B"
                        ? "bg-red-400 text-black border-black font-black"
                        : "bg-white text-stone-500 border-stone-200"
                    }`}
                  >
                    {activeBattle.optionB.name}
                  </button>
                </div>
              </div>

              {/* Chat Text Input field */}
              <div className="relative">
                <input
                  type="text"
                  maxLength={300}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={`Defend your team, e.g. "@${activeBattle.optionA.id} is clearly superior because..."`}
                  className="w-full bg-stone-50 border-3 border-black rounded-xl pl-3 pr-10 py-3.5 text-xs font-bold text-black focus:outline-none focus:ring-4 focus:ring-yellow-300"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="absolute right-2 top-2 p-2 rounded-lg bg-black text-[#fde047] hover:bg-neutral-800 transition-all border border-black cursor-pointer disabled:opacity-50"
                  aria-label="Send bullet comment text"
                >
                  <Send className="h-3.5 w-3.5 stroke-[2.5px]" />
                </button>
              </div>

            </form>

          </div>
        </div>

      </div>

      {/* Dynamic Battle Showdown Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black p-6 rounded-3xl max-w-xl w-full shadow-[8px_8px_0_0_#000000] space-y-4 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 h-8 w-8 bg-[#fef2f2] hover:bg-red-100 border-2 border-black rounded-lg flex items-center justify-center text-xs font-black cursor-pointer text-red-650 shadow-[1.5px_1.5px_0_0_#000000]"
            >
              ✕
            </button>

            <div className="border-b-4 border-black pb-3 text-left">
              <span className="text-[10px] font-mono font-black uppercase text-purple-600 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded inline-block">Arena Architect Mode</span>
              <h3 className="text-xl font-sans font-black text-black pt-1">Build Custom Versus Showdown</h3>
              <p className="text-xs text-stone-600 font-semibold leading-relaxed">
                Forge a customized war arena for alternative libraries, code solutions, or products. Spread the recruitment link to secure community input!
              </p>
            </div>

            <form onSubmit={handleCreateCustomBattle} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-black uppercase text-stone-700 block text-left">Showdown Topic Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bun vs Node.js"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="w-full bg-stone-50 border-2 border-black rounded-xl p-3 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-yellow-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-black uppercase text-stone-700 block text-left">Category / Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Runtime Engines"
                    value={catInput}
                    onChange={(e) => setCatInput(e.target.value)}
                    className="w-full bg-stone-50 border-2 border-black rounded-xl p-3 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-yellow-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-black uppercase text-stone-700 block text-left">Showdown Sub-pitch Context Description *</label>
                <textarea
                  required
                  placeholder="e.g. Bleeding-edge fast runtime engine with native bundler, or the rock-solid battle-tested grandfather of modern JS servers..."
                  maxLength={250}
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="w-full bg-stone-50 border-2 border-black rounded-xl p-3 text-xs font-semibold h-20 resize-none focus:outline-none focus:ring-4 focus:ring-yellow-300"
                />
              </div>

              {/* Side-by-Side Candidates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-2 border-dashed border-stone-200 p-3 rounded-2xl bg-stone-50">
                
                {/* Team Option A */}
                <div className="space-y-3">
                  <h5 className="font-sans font-black text-xs text-blue-750 border-b border-stone-200 pb-1 text-left">🛡️ Candidate Option A</h5>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono font-bold text-stone-500 block text-left">Option name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bun"
                      value={optAName}
                      onChange={(e) => setOptAName(e.target.value)}
                      className="w-full bg-white border-2 border-black rounded-lg p-2 text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono font-bold text-stone-500 block text-left">Option Tagline / Punchline *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Instant startup times, built-in sqlite"
                      value={optATag}
                      onChange={(e) => setOptATag(e.target.value)}
                      className="w-full bg-white border-2 border-black rounded-lg p-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Team Option B */}
                <div className="space-y-3">
                  <h5 className="font-sans font-black text-xs text-red-655 border-b border-stone-200 pb-1 text-left">🔥 Candidate Option B</h5>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono font-bold text-stone-500 block text-left">Option name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NodeJS"
                      value={optBName}
                      onChange={(e) => setOptBName(e.target.value)}
                      className="w-full bg-white border-2 border-black rounded-lg p-2 text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono font-bold text-stone-500 block text-left">Option Tagline / Punchline *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. IMMENSE package ecosystem, enterprise standard"
                      value={optBTag}
                      onChange={(e) => setOptBTag(e.target.value)}
                      className="w-full bg-white border-2 border-black rounded-lg p-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

              </div>

              {/* Deadline constraint selector */}
              <div className="space-y-2 border-t-2 border-dashed border-stone-200 pt-3">
                <label className="text-[10px] font-mono font-black uppercase text-stone-700 block text-left font-bold">Arena Deadline Duration Countdown</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { days: 1, label: "1 Day Campaign" },
                    { days: 3, label: "3 Day Trial" },
                    { days: 7, label: "1 Week Showdown" },
                    { days: 0, label: "No Deadline (Eternal)" }
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setChooseDeadlineDays(preset.days)}
                      className={`p-2 rounded-xl border-2 text-[9px] font-black uppercase text-center transition-all cursor-pointer ${
                        chooseDeadlineDays === preset.days
                          ? "bg-yellow-300 text-black border-black shadow-[1.5px_1.5px_0_0_#111111]"
                          : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-[#10b981] hover:bg-[#059669] text-black hover:text-white border-3 border-black rounded-2xl text-xs font-mono font-black uppercase shadow-[3px_3px_0_0_#000000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer font-black"
                >
                  🚀 Build Battle Arena & Enter Playground
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
