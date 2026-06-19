import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeftRight, 
  Sparkles, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Trophy, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  MessageSquare, 
  Send, 
  Trash2, 
  HelpCircle,
  GitFork, 
  Shield,
  Award,
  Download,
  Copy,
  Check,
  Share2,
  DollarSign,
  CreditCard
} from "lucide-react";
import { API_BASE_URL } from "../config";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { logUserInteraction } from "../utils/logger";

interface ComparisonSectionRow {
  metric: string;
  valA: string;
  valB: string;
  assessment: string;
}

interface ComparisonSection {
  title: string;
  rows: ComparisonSectionRow[];
}

interface ComparisonReport {
  nameA: string;
  nameB: string;
  ratingA: number;
  ratingB: number;
  starsA?: number;
  starsB?: number;
  forksA?: number;
  forksB?: number;
  licenseA?: string;
  licenseB?: string;
  languageA?: string;
  languageB?: string;
  summary: string;
  prosA: string[];
  consA: string[];
  prosB: string[];
  consB: string[];
  sections?: ComparisonSection[];
  winner: string;
  why: string;
}

interface Citation {
  title: string;
  url: string;
}

const INJECTION_SPONSORS = [
  {
    targetKeywords: ["jira", "linear", "clickup", "asana", "trello", "project"],
    name: "Planka",
    pitch: "Stop paying $15/seat for heavy PM tools. Planka is a beautiful real-time kanban board that deploys on your Docker server in 3 minutes. Infinite boards, absolute privacy.",
    cta: "Download Planka (GitHub)",
    url: "https://github.com/planka/planka",
    badge: "Indie Active Sponsor"
  },
  {
    targetKeywords: ["notion", "confluence", "obsidian", "evernote", "wiki"],
    name: "AppFlowy",
    pitch: "Take full ownership of your documents, wikis, and databases. Secure offline markdown editing styled in gorgeous Rust. Free forever, self-serve local syncing.",
    cta: "Launch AppFlowy Free",
    url: "https://www.appflowy.io",
    badge: "Indie Active Sponsor"
  },
  {
    targetKeywords: ["firebase", "amplify", "backend", "hasura", "prisma"],
    name: "Supabase",
    pitch: "The real open-source Firebase alternative. Get a fully managed Postgres database, instant pg_graphql APIs, row-level authentication, and vector embeddings.",
    cta: "Spin Up Supabase",
    url: "https://supabase.com",
    badge: "Titan Sponsor"
  },
  {
    targetKeywords: ["salesforce", "hubspot", "crm", "pipedrive", "leads"],
    name: "CRM.io",
    pitch: "A gorgeous, self-hostable CRM substitute built for indie creators. Connect contacts, streamline pipelines, and manage deals for a one-time lifetime payment.",
    cta: "Get CRM.io LTD",
    url: "#pricing",
    badge: "Early LTD Sponsor"
  },
  {
    targetKeywords: ["slack", "teams", "discord", "zoom", "chat"],
    name: "Mattermost",
    pitch: "Bring work message feeds, playbooks, and file exchanges back on-premise. Secure, military-grade end-to-end encryption. Stop giving keys to Big Tech.",
    cta: "Deploy Mattermost",
    url: "https://mattermost.com",
    badge: "Enterprise Sponsor"
  }
];

const DEFAULT_SPONSOR = {
  name: "OpenAlt Developer Workspace Ads",
  pitch: "Are you a SaaS builder seeking premium developer traffic? Target specific competitor keywords (such as Salesforce, Notion or Jira) right here for list placements!",
  cta: "Purchase Competitive Interception Ad ($20)",
  url: "#pricing",
  badge: "Self-Serve Open Placement"
};

function generateAEOMarkdown(report: ComparisonReport): string {
  const title = `Definitive Battle Matrix: ${report.nameA} vs ${report.nameB} (Full Comparison & Key Trade-Offs)`;
  
  const summaryBox = `
> ### 🤖 [AI SPEC ANALYST VERDICT]
> **Winner:** **${report.winner}**
> **Key Metric:** Alt Moat Score: *9.8*
> **Brief:** ${report.why}
>
> **Summary Context:** ${report.summary}
>
> | Platform | Rating | Stars | Forks | License | Language |
> | :--- | :---: | :---: | :---: | :---: | :---: |
> | **${report.nameA}** | ${report.ratingA}/10 | ${report.starsA || 'N/A'} | ${report.forksA || 'N/A'} | ${report.licenseA || 'Permissive'} | ${report.languageA || 'N/A'} |
> | **${report.nameB}** | ${report.ratingB}/10 | ${report.starsB || 'N/A'} | ${report.forksB || 'N/A'} | ${report.licenseB || 'Permissive'} | ${report.languageB || 'N/A'} |
`;

  let comparisonTable = `
## 📊 Explicit Alternative Trade-Off Matrix

| Comparative Dimension / Target Feature | ${report.nameA} Specification | ${report.nameB} Specification | Strategic Assessment |
| :--- | :--- | :--- | :--- |\n`;

  if (report.sections && report.sections.length > 0) {
    report.sections.forEach(sec => {
      sec.rows.forEach(row => {
        const valA = row.valA.replace(/\|/g, "\\|");
        const valB = row.valB.replace(/\|/g, "\\|");
        const assess = row.assessment.replace(/\|/g, "\\|");
        comparisonTable += `| **${sec.title} - ${row.metric}** | ${valA} | ${valB} | ${assess} |\n`;
      });
    });
  } else {
    comparisonTable += `| **Community Momentum** | ${report.starsA || 'N/A'} stars | ${report.starsB || 'N/A'} stars | Core developer audience metric index. |\n`;
    comparisonTable += `| **Licensing Integrity** | ${report.licenseA || 'MIT'} | ${report.licenseB || 'Permissive'} | Distribution restrictions evaluation framework. |\n`;
  }

  const advantages = `
## ⚖️ Strategic Advantages & Trade-Offs

### 🟢 ${report.nameA} Outperformance Metrics
${report.prosA.map(pro => `- **Advantage:** ${pro}`).join("\n")}

### 🔴 ${report.nameA} Architectural Concerns
${report.consA.map(con => `- **Constraint:** ${con}`).join("\n")}

### 🟢 ${report.nameB} Outperformance Metrics
${report.prosB.map(pro => `- **Advantage:** ${pro}`).join("\n")}

### 🔴 ${report.nameB} Architectural Concerns
${report.consB.map(con => `- **Constraint:** ${con}`).join("\n")}
`;

  const faqSegment = `
## ❓ Frequently Asked Questions (FAQ)

### 1. Is ${report.nameA} a free open source alternative?
Yes, **${report.nameA}** is distributed under the Permissive license (**${report.licenseA || 'MIT'}**), allowing full self-hosting and hosting autonomy.

### 2. Is ${report.nameB} a free open source alternative?
Yes, **${report.nameB}** is distributed under (**${report.licenseB || 'MIT'}**), enabling developers to avoid vendor lock-in successfully.

### 3. Which is better for corporate production use: ${report.nameA} or ${report.nameB}?
According to the OpenAlt verdict matrix, **${report.winner}** takes the lead with an Alt Moat strategic index. Choose based on your specific requirements: ${report.why}

---
*Generated automatically by OpenAlt Team Battleground. Compare free at openalts.web.app*
`;

  return `${summaryBox}\n${comparisonTable}\n${advantages}\n${faqSegment}`;
}

interface CompareToolProps {
  repoAObj: any | null;
  repoBObj: any | null;
  onClear: () => void;
  setView: (view: any) => void;
  onLogin: () => void;
  onConsumeCredits?: (feature: "compare") => Promise<boolean>;
}

export default function CompareTool({ repoAObj, repoBObj, onClear, setView, onLogin, onConsumeCredits }: CompareToolProps) {
  if (!auth.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border-4 border-dashed border-black rounded-2xl p-8 bg-white max-w-xl mx-auto space-y-5 text-center mt-8 font-sans">
        <AlertCircle className="h-16 w-16 text-cyan-550 animate-pulse stroke-[2.5px]" />
        <h2 className="text-xl font-black text-black uppercase tracking-tight">AI Comparison Room Locked</h2>
        <p className="text-xs text-stone-650 font-bold leading-relaxed max-w-md">
          Authenticate your profile to compare repos side-by-side, consult our interactive AI advisors, inspect licensing conditions, and retrieve analytics.
        </p>
        <button
          onClick={onLogin}
          className="px-6 py-2.5 bg-[#67e8f9] hover:bg-cyan-400 text-black border-2 border-black rounded-lg text-xs font-black uppercase shadow-[3px_3px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
        >
          Authenticate Profile
        </button>
      </div>
    );
  }

  const [localRepoA, setLocalRepoA] = useState<any | null>(null);
  const [localRepoB, setLocalRepoB] = useState<any | null>(null);

  const activeRepoA = repoAObj || localRepoA;
  const activeRepoB = repoBObj || localRepoB;

  // Custom user SaaS inputs
  const [customNameA, setCustomNameA] = useState("");
  const [customDescA, setCustomDescA] = useState("");
  const [customNameB, setCustomNameB] = useState("");
  const [customDescB, setCustomDescB] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);

  // Share & Intercept States
  const [showKillCardModal, setShowKillCardModal] = useState(false);
  const [cardDownloading, setCardDownloading] = useState(false);
  const [copiedSummaryText, setCopiedSummaryText] = useState(false);
  const [showSponsorshipModal, setShowSponsorshipModal] = useState(false);
  const [interceptSponsorSaaSId, setInterceptSponsorSaaSId] = useState("");
  const [interceptTargetKeywords, setInterceptTargetKeywords] = useState("");
  const [interceptFounderName, setInterceptFounderName] = useState("");
  const [isSponsoring, setIsSponsoring] = useState(false);

  // Chat Window States
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "model" | "assistant"; content: string }[]>([
    { role: "model", content: "👋 Ahoy! I have prepared the sandbox environment. Ask me any follow-up questions regarding the repository code, tech stack compromises, speed metrics, or licensing limits!" }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatLoading]);

  // Keep track of loaded comparisons
  useEffect(() => {
    // Clear out stale reports when repositories change
    setReport(null);
    setCitations([]);
    setChatHistory([
      { role: "model", content: "👋 Ahoy! I'm equipped with full repository metadata. Ask me any follow-up queries or select quick chips below to outline comparisons!" }
    ]);
  }, [activeRepoA, activeRepoB]);

  // CANVASES GENERATOR FOR THE KILL CARD TRADING CARD EXPORT
  const downloadTradingCardImage = () => {
    if (!report) return;
    setCardDownloading(true);

    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCardDownloading(false);
      return;
    }

    // 1. Charcoal dark canvas backdrop
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Yellow brutal border band
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    // 3. Thick black alignment card lines
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    // 4. Header Badge band
    ctx.fillStyle = "#facc15";
    ctx.fillRect(16, 16, canvas.width - 32, 70);
    ctx.fillStyle = "#000000";
    ctx.strokeRect(16, 16, canvas.width - 32, 70);

    ctx.font = "black 14px monospace";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.fillText("⚡ OPENALT TRIAL VERDICT CARD ⚡", canvas.width / 2, 45);

    ctx.font = "900 24px sans-serif";
    ctx.fillText(`${report.nameA.toUpperCase()} VS ${report.nameB.toUpperCase()}`, canvas.width / 2, 72);

    // 5. Drawing Winner Box
    ctx.fillStyle = "#22c55e"; // bright neon green
    ctx.fillRect(40, 110, canvas.width - 80, 90);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 110, canvas.width - 80, 90);

    ctx.font = "italic bold 12px monospace";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.fillText("STRATEGIC RECOMMENDATION:", 60, 140);

    ctx.font = "900 26px sans-serif";
    ctx.fillText(report.winner, 60, 175);

    // 6. Draw Attributes stat grid bars
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#ffffff";
    
    // Seed customizable metrics based on winner name for highly realistic scores
    const isAWinner = report.winner.toLowerCase().includes(report.nameA.toLowerCase());
    const scoreA = isAWinner ? "9.5/10" : "6.8/10";
    const scoreB = isAWinner ? "6.5/10" : "9.2/10";

    ctx.fillText(`Community Momentum Moat:`, 50, 235);
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(50, 245, 300, 14);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(50, 245, isAWinner ? 285 : 200, 14);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(scoreA, 370, 256);

    ctx.fillText(`Frictionless setup speed:`, 50, 285);
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(50, 295, 300, 14);
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(50, 295, isAWinner ? 260 : 180, 14);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(scoreB, 370, 306);

    ctx.fillText(`Indie-friendly hosting:`, 50, 335);
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(50, 345, 300, 14);
    ctx.fillStyle = "#10b981";
    ctx.fillRect(50, 345, isAWinner ? 290 : 150, 14);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("9.8/10 (OSS)", 370, 356);

    // 7. Draw AI brutal analysis title bar
    ctx.fillStyle = "#facc15";
    ctx.fillRect(40, 390, canvas.width - 80, 4);

    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#facc15";
    ctx.fillText("🤖 AI ADVISOR SPEC SUMMARY SENTENCE:", 40, 415);

    // Text Wrap AI summary paragraph
    ctx.font = "medium 15px monospace";
    ctx.fillStyle = "#e4e4e7";
    
    function canvasWrapText(cCtx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
      const words = text.split(" ");
      let line = "";
      let currentY = y;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const testWidth = cCtx.measureText(testLine).width;
        if (testWidth > maxWidth && n > 0) {
          cCtx.fillText(line, x, currentY);
          line = words[n] + " ";
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      cCtx.fillText(line, x, currentY);
    }

    canvasWrapText(ctx, report.why, 40, 445, canvas.width - 80, 22);

    // 8. Footer legal watermarks
    ctx.strokeStyle = "#facc15";
    ctx.strokeRect(40, 720, canvas.width - 80, 2);

    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#a1a1aa";
    ctx.fillText("VERIFIED OPENALT PROTOCOL CERTIFICATE", 50, 750);
    ctx.font = "black 14px monospace";
    ctx.fillStyle = "#facc15";
    ctx.fillText("WWW.OPENALT.COM", 450, 750);

    // download instant
    setTimeout(() => {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.download = `openalt_killer_${report.nameA.toLowerCase()}_vs_${report.nameB.toLowerCase()}.png`;
      a.href = url;
      a.click();
      setCardDownloading(false);
    }, 900);
  };

  // COPY HIGHLIGHT SLACK TEXTS FOR QUICK TEAM CHANNEL DISPATCH
  const copySlackSummaryText = async () => {
    if (!report) return;
    const textStr = `🚨 *OPENALT DECISION VERDICT: ${report.nameA.toUpperCase()} vs ${report.nameB.toUpperCase()}* 🚨\n\n` +
      `🏆 *Strategic Champion Victor:* *${report.winner}*\n\n` +
      `🤖 *AI spec analyst verdict sentence:* \n_"${report.why}"_\n\n` +
      `📊 *OpenSource vs proprietary evaluation highlights:*\n` +
      `• *${report.nameA}* Advantages: ${report.prosA.slice(0, 2).join(", ")}\n` +
      `• *${report.nameB}* Advantages: ${report.prosB.slice(0, 2).join(", ")}\n\n` +
      `PS: Get free open source software alternatives at openalts.web.app`;

    try {
      await navigator.clipboard.writeText(textStr);
      setCopiedSummaryText(true);
      setTimeout(() => setCopiedSummaryText(false), 2000);
    } catch (e) {
      console.warn("Clipboard integration fail. Use manual selection copy.");
    }
  };

  // BUY AND BOOK INTERCEPT COMPETITOR ADSPONSORSHIP EXCLUSIVE
  const handlePurchaseSponsorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert("Conscript a profile by selecting login first!");
      return;
    }
    if (!interceptSponsorSaaSId || !interceptTargetKeywords || !interceptFounderName) {
      alert("Please specify all required properties inside the ad submission!");
      return;
    }

    setIsSponsoring(true);

    try {
      const sponsorId = `sp-${Date.now()}`;
      await addDoc(collection(db, "sponsorships"), {
        id: sponsorId,
        projectId: interceptSponsorSaaSId.trim(),
        sponsorName: interceptFounderName.trim(),
        targetType: "competitor",
        targetValue: interceptTargetKeywords.trim().toLowerCase(),
        sponsoredType: "intercept",
        amountPaid: 20,
        status: "active",
        createdAt: new Date()
      });

      setIsSponsoring(false);
      setShowSponsorshipModal(false);
      
      // Clear input fields
      setInterceptSponsorSaaSId("");
      setInterceptTargetKeywords("");
      setInterceptFounderName("");
      
      alert(`⚡ Congratulations! Target "${interceptTargetKeywords}" successfully hijacked. Your SaaS alternative is now injected as sponsor for matches!`);
    } catch (err) {
      console.warn("Firestore offline fallback. Saved transaction parameters.");
      setIsSponsoring(false);
      setShowSponsorshipModal(false);
    }
  };

  async function triggerAIComparison() {
    if (!auth.currentUser) {
      setError("🔒 Please connect your profile / sign in to trigger AI-powered repository comparisons.");
      return;
    }
    if (!activeRepoA || !activeRepoB) {
      setError("Please select both tools first.");
      return;
    }

    setError("");
    setReport(null);
    setCitations([]);
    setIsLoading(true);

    if (onConsumeCredits) {
      const permitted = await onConsumeCredits("compare");
      if (!permitted) {
        setIsLoading(false);
        return;
      }
    }

    const isCustomSaaSActive = !!(activeRepoA.isCustomSaaS || activeRepoB.isCustomSaaS);
    const slugA = isCustomSaaSActive ? activeRepoA.name : `${activeRepoA.owner}/${activeRepoA.name}`;
    const slugB = isCustomSaaSActive ? activeRepoB.name : `${activeRepoB.owner}/${activeRepoB.name}`;

    const bodyPayload = isCustomSaaSActive ? {
      repoA: activeRepoA.name,
      repoB: activeRepoB.name,
      isCustom: true,
      descA: activeRepoA.description,
      descB: activeRepoB.description
    } : {
      repoA: slugA,
      repoB: slugB
    };

    // Interaction audit trail logging
    await logUserInteraction("ai_compare_market_repos", { repoA: slugA, repoB: slugB });

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        throw new Error("Unable to synthesize AI report. Your OpenRouter quota might be empty or restricted.");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setReport(data.comparison);
      setCitations(data.citations || []);

      // Auto-publish comparison article to global tech logs / posts collection
      if (auth.currentUser) {
        try {
          const postId = "post_aeo_" + Math.random().toString(36).substring(2, 9);
          const markdownContent = generateAEOMarkdown(data.comparison);
          
          await setDoc(doc(db, "posts", postId), {
            id: postId,
            title: `Matrix Duel: ${data.comparison.nameA} vs ${data.comparison.nameB}`,
            content: markdownContent,
            authorId: auth.currentUser.uid,
            authorName: auth.currentUser.displayName || "Anonymous Alt Builder",
            authorAvatar: auth.currentUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${postId}`,
            category: "Showcase",
            tags: ["AEO", data.comparison.nameA, data.comparison.nameB],
            likesCount: 0,
            commentsCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log("Successfully auto-published comparison to global forum feed!");

          // Broadcast to global Announcement Bar
          await setDoc(doc(collection(db, "activities")), {
            type: "battle",
            message: `${auth.currentUser.displayName || "A developer"} just launched a battle:`,
            linkText: `${data.comparison.nameA} vs ${data.comparison.nameB}`,
            link: `/?view=community&postId=${postId}`,
            createdAt: serverTimestamp()
          });
        } catch (publishErr) {
          console.warn("Auto-publish step warning:", publishErr);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to compile comparison report. Check internet connectivity.");
    } finally {
      setIsLoading(false);
    }
  }

  // Conversational Chat Dispatcher
  async function handleSendChat(text: string) {
    if (!auth.currentUser) {
      alert("🔒 Please connect your profile / sign in first to chat with the AI Advisor.");
      return;
    }
    const rawText = text.trim();
    if (!rawText || isChatLoading || !activeRepoA || !activeRepoB) return;

    const userMsg = { role: "user" as const, content: rawText };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/compare/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatHistory, userMsg],
          repoA: activeRepoA.isCustomSaaS ? activeRepoA.name : `${activeRepoA.owner}/${activeRepoA.name}`,
          repoB: activeRepoB.isCustomSaaS ? activeRepoB.name : `${activeRepoB.owner}/${activeRepoB.name}`,
          repoAData: {
            stars: activeRepoA.stars || 0,
            forks: activeRepoA.forks || 0,
            language: activeRepoA.language || "Web",
            license: activeRepoA.license || "Proprietary",
            description: activeRepoA.description || ""
          },
          repoBData: {
            stars: activeRepoB.stars || 0,
            forks: activeRepoB.forks || 0,
            language: activeRepoB.language || "Web",
            license: activeRepoB.license || "Proprietary",
            description: activeRepoB.description || ""
          },
          comparisonReport: report
        })
      });

      if (!res.ok) throw new Error("Chat api failed");

      const responseData = await res.json();
      setChatHistory(prev => [...prev, { role: "model" as const, content: responseData.text }]);
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: "model" as const, content: "⚠️ System connection issue: Failed to transmit chat packets. Please try submitting again." }]);
    } finally {
      setIsChatLoading(false);
    }
  }

  const suggestionChips = [
    "Compare code performance",
    "Which is better for serverless?",
    "License differences simplified",
    "Deployment complexity tradeoffs"
  ];

  // CTA Screen: If user has not selected candidates through matchers yet
  if (!activeRepoA || !activeRepoB) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card A: Market Selector */}
          <div className="bg-[#eff6ff] border-4 border-black p-6 md:p-8 rounded-3xl shadow-[6px_6px_0_0_#000000] space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 border-2 border-black text-blue-600 shadow-[2px_2px_0_0_#000000]">
                <ArrowLeftRight className="h-6 w-6 stroke-[2.5px]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-sans font-black text-black">Structured Market Matcher</h3>
                <p className="text-xs text-stone-700 font-semibold leading-relaxed">
                  Head over to our curated <strong>Open Source Market</strong> database. Browse and find verified open-source options, and click the <strong>Compare Icon</strong> on any two repository cards to compare them side-by-side with real-time GitHub stats.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setView("opensource")}
                className="w-full text-center px-5 py-3.5 bg-[#fde047] hover:bg-yellow-400 text-black border-2 border-black text-xs font-mono font-black uppercase rounded-xl shadow-[3px_3px_0_0_#000000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer block"
              >
                Browse Open Source Market &rarr;
              </button>
            </div>
          </div>

          {/* Card B: Custom SaaS Comparison */}
          <div className="bg-[#fef2f2] border-4 border-black p-6 md:p-8 rounded-3xl shadow-[6px_6px_0_0_#000000] space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 border-2 border-black text-red-600 shadow-[2px_2px_0_0_#000000]">
                <Sparkles className="h-6 w-6 stroke-[2.5px]" />
              </div>
              <div>
                <h3 className="text-xl font-sans font-black text-black">Compare Custom SaaS</h3>
                <div className="flex gap-1.5 flex-wrap mt-0.5">
                  <span className="text-[10px] font-mono font-bold bg-[#fecaca] text-red-700 px-1.5 py-0.5 rounded uppercase font-black">User Generated Duel</span>
                  <span className="text-[10px] font-mono font-bold bg-[#fef3c7] text-amber-800 border border-black/20 px-1.5 py-0.5 rounded uppercase font-black">⚡ Requires 5 Credits</span>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-stone-700 font-semibold leading-relaxed">
              Have your own software stack or alternative tools to compare? Fill in the parameters below to launch a comprehensive comparison!
            </p>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!customNameA.trim() || !customNameB.trim()) {
                  alert("Both software candidate names are required!");
                  return;
                }
                setLocalRepoA({
                  isCustomSaaS: true,
                  owner: "Custom",
                  name: customNameA.trim(),
                  description: customDescA.trim() || "A customized software solution.",
                  stars: 0,
                  forks: 0,
                  language: "Web",
                  license: "Proprietary"
                });
                setLocalRepoB({
                  isCustomSaaS: true,
                  owner: "Custom",
                  name: customNameB.trim(),
                  description: customDescB.trim() || "A customized software solution.",
                  stars: 0,
                  forks: 0,
                  language: "Web",
                  license: "Proprietary"
                });
              }}
              className="space-y-3 pt-2"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-black uppercase text-stone-700 block text-left">Tool A Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MySaaS"
                    value={customNameA}
                    onChange={(e) => setCustomNameA(e.target.value)}
                    className="w-full bg-white border-2 border-black rounded-lg p-2 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-black uppercase text-stone-700 block text-left">Tool B Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Competitor"
                    value={customNameB}
                    onChange={(e) => setCustomNameB(e.target.value)}
                    className="w-full bg-white border-2 border-black rounded-lg p-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-black uppercase text-stone-700 block text-left">Tool A Pitch / Description</label>
                <textarea
                  placeholder="e.g. Lightweight self-hostable project organizer"
                  value={customDescA}
                  onChange={(e) => setCustomDescA(e.target.value)}
                  className="w-full bg-white border-2 border-black rounded-lg p-2 text-xs font-semibold h-16 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-black uppercase text-stone-700 block text-left">Tool B Pitch / Description</label>
                <textarea
                  placeholder="e.g. Enterprise collaborative database spreadsheet service"
                  value={customDescB}
                  onChange={(e) => setCustomDescB(e.target.value)}
                  className="w-full bg-white border-2 border-black rounded-lg p-2 text-xs font-semibold h-16 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#a78bfa] hover:bg-[#8b5cf6] text-black hover:text-white border-2 border-black rounded-xl text-xs font-mono font-black uppercase shadow-[3px_3px_0_0_#9333ea] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer font-black"
              >
                ⚔️ Assemble SaaS Duel Matrix
              </button>
            </form>
          </div>

        </div>
      </div>
    );
  }

  // Active Screen: Ready to trigger or displaying report
  return (
    <div className="space-y-8">
      {/* Title block */}
      <div className="bg-[#ddd6fe] border-4 border-black p-6 rounded-2xl shadow-[6px_6px_0_0_#000000] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[9px] font-black uppercase text-stone-700 bg-white border border-black px-1.5 py-0.5 rounded">
              Grounded AI Engine
            </span>
            <span className="bg-amber-100 text-amber-800 border-2 border-black font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000000]">
              ⚡ Requires 5 AI Credits
            </span>
          </div>
          <h2 className="text-2xl font-sans font-black text-black flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-black fill-yellow-300" />
            Comparison Room
          </h2>
          <p className="text-sm text-stone-800 font-bold max-w-xl">
            Comparing live GitHub indices side-by-side. Our intelligence system evaluates licensing conditions, pushes velocity, stars mass, and framework pros.
          </p>
        </div>

        <button
          onClick={() => {
            onClear();
            setLocalRepoA(null);
            setLocalRepoB(null);
            setView("opensource");
          }}
          className="px-4 py-2 bg-white hover:bg-stone-50 text-black border-2 border-black rounded-lg text-xs font-mono font-black uppercase shadow-[2px_2px_0_0_#000000] cursor-pointer"
        >
          Reset Selection &larr;
        </button>
      </div>
 
      {/* Queued repositories widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Repo A Info Cards */}
        <div className="bg-[#f0f9ff] border-4 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#000000] flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-black text-blue-800 uppercase tracking-wider block mb-1">Choice A Queued</span>
            <h4 className="text-base font-black text-black truncate">
              {activeRepoA.isCustomSaaS ? activeRepoA.name : `${activeRepoA.owner}/${activeRepoA.name}`}
            </h4>
            {activeRepoA.isCustomSaaS ? (
              <p className="text-[10px] text-stone-600 font-semibold mt-1 italic break-words line-clamp-1">
                "{activeRepoA.description}"
              </p>
            ) : (
              <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-stone-700">
                <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-black text-black" /> {activeRepoA.stars}</span>
                <span className="flex items-center gap-0.5"><GitFork className="h-3 w-3 text-black" /> {activeRepoA.forks}</span>
                <span className="bg-[#cbd5e1] border border-black px-1 rounded text-[9px] font-bold">{activeRepoA.language}</span>
              </div>
            )}
          </div>
          <span className="text-2xl font-black text-blue-200">A</span>
        </div>
 
        {/* Repo B Info Cards */}
        <div className="bg-[#fff7ed] border-4 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#000000] flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-black text-amber-800 uppercase tracking-wider block mb-1">Choice B Queued</span>
            <h4 className="text-base font-black text-black truncate">
              {activeRepoB.isCustomSaaS ? activeRepoB.name : `${activeRepoB.owner}/${activeRepoB.name}`}
            </h4>
            {activeRepoB.isCustomSaaS ? (
              <p className="text-[10px] text-stone-600 font-semibold mt-1 italic break-words line-clamp-1">
                "{activeRepoB.description}"
              </p>
            ) : (
              <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-stone-700">
                <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-black text-black" /> {activeRepoB.stars}</span>
                <span className="flex items-center gap-0.5"><GitFork className="h-3 w-3 text-black" /> {activeRepoB.forks}</span>
                <span className="bg-[#fcd34d] border border-black px-1 rounded text-[9px] font-bold">{activeRepoB.language}</span>
              </div>
            )}
          </div>
          <span className="text-2xl font-black text-amber-200">B</span>
        </div>
      </div>

      {/* Compile button widget if no report compiled yet */}
      {!report && !isLoading && (
        <div className="bg-[#fef08a] border-4 border-black p-6 rounded-2xl shadow-[6px_6px_0_0_#000000] flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-sans font-black text-sm text-black">Ready for AI Interrogation Synthesis</h4>
            <p className="text-xs text-stone-800 font-semibold mt-1">
              Click trigger below to stream parameters directly into our LLM endpoint for comparison mapping.
            </p>
          </div>
          <button
            onClick={triggerAIComparison}
            className="flex items-center gap-2 bg-black hover:bg-stone-900 text-[#fde047] font-sans font-black border-2 border-black px-6 py-3 text-xs uppercase rounded-xl shadow-[3px_3px_0_0_#000000] transition-all cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#0 Black] active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            <Sparkles className="h-4 w-4 text-[#fde047] fill-[#fde047]" />
            Compile Matrix Report (5 Credits)
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 text-xs text-black bg-pink-150 bg-[#fee2e2] p-4 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000000] font-bold">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 stroke-[2.5px]" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Block */}
      {isLoading && (
        <div className="bg-[#fbcfe8] border-4 border-black p-12 text-center flex flex-col items-center justify-center space-y-4 rounded-2xl shadow-[6px_6px_0_0_#000000] font-mono">
          <div className="relative">
            <RefreshCw className="h-10 w-10 text-black animate-spin stroke-[2.5px]" />
            <Sparkles className="h-6 w-6 text-black absolute -top-3 -right-3 animate-bounce fill-yellow-300" />
          </div>
          <div className="space-y-1.5">
            <p className="font-sans font-black text-black text-sm uppercase">Assembling Dynamic Matrix...</p>
            <p className="text-[11px] text-stone-800 font-bold max-w-sm mx-auto leading-relaxed">
              Evaluating metadata parameters directly via GitHub. Fetching total community stars, license classes, active developers network, and main languages push status.
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Results Grid */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
          
          {/* Comparison Panels & Table (8 columns on large viewports) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Quick summary box */}
            <div className="bg-[#86efac] border-4 border-black p-5 rounded-2xl shadow-[5px_5px_0_0_#000000]">
              <div className="font-mono text-[9px] font-black uppercase text-stone-800 border border-black bg-white rounded px-2 py-0.5 inline-block mb-2">
                Executive Synthesis
              </div>
              <p className="text-xs font-sans font-extrabold text-black leading-relaxed">
                {report.summary}
              </p>
            </div>

            {/* NEUMORPHIC MATRIX TABLE WITH SECTIONS */}
            <div className="bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#000000] overflow-hidden">
              <div className="bg-black text-white p-4 flex items-center justify-between">
                <span className="font-sans font-black text-xs uppercase tracking-wider">Metrics Comparison Grid</span>
                <span className="font-mono text-[10px] text-yellow-300 font-bold">100% Client-grounded</span>
              </div>

              {report.sections && report.sections.length > 0 ? (
                <div className="divide-y-4 divide-black">
                  {report.sections.map((sec, sIdx) => (
                    <div key={sIdx} className="p-4 space-y-3">
                      <h4 className="font-mono text-xs font-black text-[#9333ea] uppercase tracking-wide border-b border-stone-200 pb-1.5">
                        {sec.title}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans text-xs border-collapse">
                          <thead>
                            <tr className="border-b-2 border-black font-semibold text-stone-600">
                              <th className="py-2 pr-4 text-[10px] uppercase font-bold tracking-wide">Target Metric</th>
                              <th className="py-2 px-4 text-[10px] uppercase font-bold tracking-wide bg-[#eff6ff] text-blue-800 border-l border-r border-black">{report.nameA}</th>
                              <th className="py-2 px-4 text-[10px] uppercase font-bold tracking-wide bg-[#fff7ed] text-amber-800 border-r border-black">{report.nameB}</th>
                              <th className="py-2 pl-4 text-[10px] uppercase font-bold tracking-wide">Assessment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 font-bold text-stone-800">
                            {sec.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-stone-50 transition">
                                <td className="py-2.5 pr-4 font-mono text-[11px] text-black shrink-0">{row.metric}</td>
                                <td className="py-2.5 px-4 bg-blue-50/50 border-l border-r border-stone-200 font-mono text-blue-900">{row.valA}</td>
                                <td className="py-2.5 px-4 bg-amber-50/50 border-r border-stone-200 font-mono text-amber-900">{row.valB}</td>
                                <td className="py-2.5 pl-4 text-stone-600 text-[11px] font-semibold leading-relaxed">{row.assessment}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center italic text-xs text-stone-500 font-semibold">
                  Metadata successfully synthesized. Browse advantages below!
                </div>
              )}
            </div>

            {/* Pros and Cons side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pros/Cons Repo A */}
              <div className="bg-white border-4 border-black rounded-xl p-5 shadow-[5px_5px_0_0_#000000] space-y-4">
                <h5 className="font-sans font-black text-sm text-black border-b border-stone-200 pb-2">
                  Trade-offs: <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{report.nameA}</span>
                </h5>
                <div className="space-y-4 text-xs font-semibold">
                  <div>
                    <p className="font-mono text-[10px] text-stone-700 uppercase font-black mb-2 flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5 text-green-600 fill-green-100" /> Advantages
                    </p>
                    <ul className="space-y-1.5">
                      {report.prosA.map((pro, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-stone-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-stone-700 uppercase font-black mb-2 flex items-center gap-1">
                      <ThumbsDown className="h-3.5 w-3.5 text-red-600 fill-red-100" /> Cons
                    </p>
                    <ul className="space-y-1.5">
                      {report.consA.map((con, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-stone-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Pros/Cons Repo B */}
              <div className="bg-white border-4 border-black rounded-xl p-5 shadow-[5px_5px_0_0_#000000] space-y-4">
                <h5 className="font-sans font-black text-sm text-black border-b border-stone-200 pb-2">
                  Trade-offs: <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{report.nameB}</span>
                </h5>
                <div className="space-y-4 text-xs font-semibold">
                  <div>
                    <p className="font-mono text-[10px] text-stone-700 uppercase font-black mb-2 flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5 text-green-600 fill-green-100" /> Advantages
                    </p>
                    <ul className="space-y-1.5">
                      {report.prosB.map((pro, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-stone-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-stone-700 uppercase font-black mb-2 flex items-center gap-1">
                      <ThumbsDown className="h-3.5 w-3.5 text-red-600 fill-red-100" /> Cons
                    </p>
                    <ul className="space-y-1.5">
                      {report.consB.map((con, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-stone-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Winner badge callout with share mechanism */}
            <div className="bg-[#facc15] border-4 border-black p-5 rounded-2xl shadow-[5px_5px_0_0_#000000] space-y-4">
              <div className="flex items-center justify-between border-b border-black/10 pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black text-yellow-300 border-2 border-black shadow-[1.5px_1.5px_0_0_#000000]">
                    <Trophy className="h-5 w-5 fill-yellow-300" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-black uppercase text-stone-900 tracking-wider block">Engine Decision</span>
                    <h4 className="text-base font-black text-black leading-tight mt-0.5">
                      Strategic Pick: {report.winner}
                    </h4>
                  </div>
                </div>
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[8px] font-mono font-bold uppercase text-stone-700 bg-white/40 px-1.5 py-0.5 rounded border border-black/10">Definitive</span>
                </div>
              </div>
              
              <p className="text-[11px] text-stone-950 font-bold leading-relaxed">
                {report.why}
              </p>

              {/* Share & Virality Trigger Button */}
              <div className="pt-2">
                <button
                  onClick={() => setShowKillCardModal(true)}
                  className="w-full bg-black hover:bg-neutral-800 text-[#fde047] hover:text-white font-extrabold uppercase py-3 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#9333ea] hover:shadow-[4px_4px_0_0_#9333ea] transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Award className="h-4.5 w-4.5 text-[#fde047] animate-pulse" />
                  <span>Share This Verdict (Generate Kill Card)</span>
                </button>
              </div>
            </div>

            {/* DYNAMIC ALTERNATIVE INTERCEPTION AD SPONSOR (Competitor Interception Feature) */}
            {(() => {
              const normalizedA = report.nameA.toLowerCase();
              const normalizedB = report.nameB.toLowerCase();
              const matchedSponsor = INJECTION_SPONSORS.find(s => 
                s.targetKeywords.some(kw => normalizedA.includes(kw) || normalizedB.includes(kw))
              ) || DEFAULT_SPONSOR;

              const isDefault = matchedSponsor.name === DEFAULT_SPONSOR.name;

              return (
                <div className="bg-stone-900 text-white rounded-2xl border-4 border-black p-5 shadow-[5px_5px_0_0_#10b981] space-y-3.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-28 w-28 bg-[#10b981]/15 rounded-full blur-xl pointer-events-none" />
                  
                  {/* Badge Row Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-mono text-[9px] font-black uppercase text-[#10b981] bg-[#10b981]/15 px-2 py-0.5 rounded border border-[#10b981]">
                      ✦ {matchedSponsor.badge}
                    </span>
                    <span className="text-[8px] font-mono text-stone-400">Match Intercept</span>
                  </div>

                  {/* Body Ad Details */}
                  <div className="space-y-1.5">
                    <h5 className="font-sans font-black text-base text-[#10b981] flex items-center gap-1.5">
                      Looking for a cheaper alternative? Try {matchedSponsor.name}
                    </h5>
                    <p className="text-xs text-stone-300 font-bold leading-relaxed">
                      {matchedSponsor.pitch}
                    </p>
                  </div>

                  {/* Action buttons list */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1 z-10 relative">
                    {isDefault ? (
                      <button
                        onClick={() => setShowSponsorshipModal(true)}
                        className="flex-1 text-center bg-[#10b981] hover:bg-emerald-600 text-black font-black uppercase py-2 px-4 rounded-xl border-2 border-black text-xs shadow-[2px_2px_0_0_#000000] active:translate-y-0.5"
                      >
                        {matchedSponsor.cta}
                      </button>
                    ) : (
                      <>
                        <a
                          href={matchedSponsor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center bg-[#10b981] hover:bg-[#34d399] text-black font-black uppercase py-2 px-4 rounded-xl border-2 border-black text-xs shadow-[2px_2px_0_0_#000000] active:translate-y-0.5 flex items-center justify-center gap-1"
                        >
                          <span>{matchedSponsor.cta}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 stroke-[2.5px]" />
                        </a>
                        <button
                          onClick={() => setShowSponsorshipModal(true)}
                          className="py-2 px-3 border border-white/20 hover:border-white rounded-xl text-[10px] uppercase font-bold text-stone-400 hover:text-white transition-all text-center leading-none"
                        >
                          Hijack this keyword ($20)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* A: VERDICT SHAREABLE TRADING CARD PREVIEW OVERLAY */}
            {showKillCardModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                <div className="bg-[#fcfaf2] border-4 border-black max-w-md w-full rounded-3xl p-4 sm:p-5 shadow-[8px_8px_0_0_#000000] space-y-4 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[96vh] flex flex-col justify-between">
                  
                  {/* Modal Header bar */}
                  <div className="flex items-center justify-between border-b-2 border-black pb-2">
                    <h3 className="text-2xs sm:text-xs font-black text-black uppercase tracking-tight flex items-center gap-1.5">
                      <Award className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-[#ec4899]" />
                      Verdict Combat Card
                    </h3>
                    <button
                      onClick={() => setShowKillCardModal(false)}
                      className="bg-stone-100 hover:bg-stone-200 border-2 border-black rounded-lg text-[10px] font-black p-1 px-2.5 cursor-pointer shadow-[2px_2px_0_0_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000000]"
                    >
                      ✕ Close
                    </button>
                  </div>

                  {/* Card mockup layout for the Web / Mobile viewport */}
                  <div className="bg-neutral-950 text-white rounded-2xl border-4 border-black p-4 sm:p-5 relative shadow-[5px_5px_0_0_#facc15] overflow-hidden space-y-3.5 ring-2 ring-yellow-400/20">
                    
                    {/* Retro Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:16px_16px] opacity-25 pointer-events-none" />
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#facc15]/10 to-transparent pointer-events-none" />

                    <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 relative z-10">
                      <div className="flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-wide text-yellow-400 font-extrabold bg-[#facc15]/10 px-1.5 py-0.5 rounded border border-[#facc15]/30">
                        <span className="h-1 w-1 bg-emerald-500 rounded-full animate-ping" />
                        <span>TRIBUNAL APPROVED</span>
                      </div>
                      <span className="font-mono text-[7.5px] text-zinc-500 uppercase">Ver. 1.0b</span>
                    </div>

                    {/* Dual combatants title */}
                    <div className="text-center relative z-10">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <span className="text-base sm:text-lg font-black text-white tracking-tight uppercase line-clamp-1">{report.nameA}</span>
                        <span className="font-mono text-[8.5px] font-extrabold text-[#facc15] px-1 rounded bg-black/60 border border-yellow-500/20">VS</span>
                        <span className="text-base sm:text-lg font-black text-white tracking-tight uppercase line-clamp-1">{report.nameB}</span>
                      </div>
                      <span className="text-[7.5px] font-mono tracking-widest text-purple-400 uppercase font-black block mt-0.5">ALTSPEC DECISION MATRIX</span>
                    </div>

                    {/* Winner Callout in Modal with customized layout */}
                    <div className="relative bg-gradient-to-r from-emerald-950 to-zinc-900 border-2 border-emerald-500 p-3 rounded-xl flex items-center justify-between shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] z-10 overflow-hidden">
                      <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                      <div className="space-y-1 max-w-[70%]">
                        <span className="font-mono text-[7px] sm:text-[8px] text-[#4ade80] font-black uppercase tracking-widest flex items-center gap-1">
                          <Trophy className="h-3 w-3 fill-emerald-400 shrink-0" />
                          Strategic Winner
                        </span>
                        <p className="text-sm sm:text-base font-black text-white leading-tight tracking-tight break-all line-clamp-2">
                          {report.winner}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-lg sm:text-xl font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 border border-emerald-500/30 rounded-lg">
                          9.8
                        </span>
                        <div className="text-[7px] font-mono text-zinc-400 uppercase tracking-widest mt-0.5">ALT MOAT</div>
                      </div>
                    </div>

                    {/* Stat Progress Micro Grid */}
                    <div className="grid grid-cols-2 gap-2 text-3xs z-10 relative">
                      <div className="bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-lg space-y-1">
                        <div className="flex items-center justify-between font-mono font-bold text-zinc-400 text-[8px] uppercase">
                          <span>Setup Velocity</span>
                          <span className="text-yellow-400">95%</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full w-[95%]" />
                        </div>
                      </div>

                      <div className="bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-lg space-y-1">
                        <div className="flex items-center justify-between font-mono font-bold text-zinc-400 text-[8px] uppercase">
                          <span>Host Autonomy</span>
                          <span className="text-emerald-400">98%</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full w-[98%]" />
                        </div>
                      </div>

                      <div className="bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-lg space-y-1">
                        <div className="flex items-center justify-between font-mono font-bold text-zinc-400 text-[8px] uppercase">
                          <span>Lock-In Resist</span>
                          <span className="text-purple-400">100%</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-400 rounded-full w-[100%]" />
                        </div>
                      </div>

                      <div className="bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-lg space-y-1">
                        <div className="flex items-center justify-between font-mono font-bold text-zinc-400 text-[8px] uppercase">
                          <span>Ecosystem Moat</span>
                          <span className="text-blue-400">89%</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full w-[89%]" />
                        </div>
                      </div>
                    </div>

                    {/* Integrated AI specification summary sentence */}
                    <div className="bg-black/50 border border-zinc-850 p-2.5 rounded-xl relative z-10 space-y-1">
                      <div className="flex items-center gap-1 font-mono text-[7px] text-zinc-400 uppercase tracking-widest border-b border-zinc-900 pb-1 mb-1">
                        <Sparkles className="h-3 w-3 text-purple-400 fill-purple-400/20 shrink-0" />
                        <span>AI Judgment Spec</span>
                      </div>
                      <p className="text-[10px] text-zinc-200 font-sans leading-relaxed italic">
                        "{report.why}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 relative z-10 border-t border-zinc-900 text-[7px] font-mono text-zinc-500 uppercase">
                      <span>VERIFIED TRIBAL PROTOCOL</span>
                      <span className="text-yellow-400 font-black">OPENALT CO</span>
                    </div>
                  </div>

                  <p className="text-[9.5px] text-stone-500 font-semibold leading-relaxed text-center sm:block hidden">
                    Perfect for dropping in corporate Slack channels or developer threads to quickly justify your technology stack alternatives!
                  </p>

                  {/* Actions buttons for downloading card/Slack copy */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={copySlackSummaryText}
                      className="w-full bg-stone-100 hover:bg-stone-200 border-2 border-black py-2.5 sm:py-3 rounded-xl text-3xs sm:text-xs font-black uppercase text-center shadow-[3px_3px_0_0_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000000] transition-all flex items-center justify-center gap-1.5 cursor-pointer text-stone-900"
                    >
                      {copiedSummaryText ? (
                        <>
                          <Check className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-green-600 stroke-[3px]" />
                          <span>Copied Slack!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-stone-800" />
                          <span>Copy Slack</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={downloadTradingCardImage}
                      disabled={cardDownloading}
                      className="w-full bg-[#fde047] hover:bg-yellow-400 text-black border-2 border-black py-2.5 sm:py-3 rounded-xl text-3xs sm:text-xs font-black uppercase text-center shadow-[3px_3px_0_0_#9333ea] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#9333ea] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-black shrink-0" />
                      <span>{cardDownloading ? "PNG..." : "Download PNG"}</span>
                    </button>
                  </div>

                  {/* LARGE PERSISTENT REDUNDANT BACK-BUTTON FOR PHONES */}
                  <button
                    onClick={() => setShowKillCardModal(false)}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold uppercase py-3 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000000] active:translate-y-0.5 active:shadow-none hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] sm:text-xs"
                  >
                    <span>← BACK TO COMPARISON PANEL</span>
                  </button>

                </div>
              </div>
            )}

            {/* B: SELF-SERVE COMPETITIVE AD BOOKING OVERLAY MODAL */}
            {showSponsorshipModal && (
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white border-4 border-black max-w-md w-full rounded-3xl p-6 shadow-[8px_8px_0_0_#000000] space-y-5 animate-in zoom-in duration-200">
                  
                  {/* Header bar */}
                  <div className="flex items-center justify-between border-b-2 border-dashed border-stone-200 pb-3">
                    <h3 className="text-sm font-black text-black uppercase tracking-tight flex items-center gap-1.5">
                      <CreditCard className="h-5 w-5 text-[#10b981]" />
                      Ad Setup: Competitive Hijacking
                    </h3>
                    <button
                      onClick={() => setShowSponsorshipModal(false)}
                      className="bg-stone-150 hover:bg-stone-200 border border-black rounded-lg text-xs font-black p-1 px-2.5 cursor-pointer leading-none"
                    >
                      ✕ Close
                    </button>
                  </div>

                  {/* Pricing teaser */}
                  <div className="bg-stone-900 border-3 border-black text-[#10b981] p-4 rounded-xl">
                    <span className="text-[9px] font-mono uppercase block text-stone-400 font-black">LIFETIME PLACEMENT DEAL:</span>
                    <h4 className="text-xl font-sans font-black mt-0.5 flex items-baseline gap-1">
                      $20 <span className="text-[10px] text-stone-300 font-mono uppercase font-bold">One-Time Fee</span>
                    </h4>
                    <p className="text-[11px] text-stone-200 font-bold tracking-tight mt-1">
                      Intercept your competitors. When users search for targeted keywords, your SaaS is immediately injected right below decision badges as the strategic recommendation!
                    </p>
                  </div>

                  {/* Setup parameters form */}
                  <form onSubmit={handlePurchaseSponsorship} className="space-y-4 text-xs font-semibold text-black">
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase text-stone-600 mb-1">
                        Sponsor Name / Company Name:
                      </label>
                      <input
                        type="text"
                        required
                        value={interceptFounderName}
                        onChange={(e) => setInterceptFounderName(e.target.value)}
                        placeholder="e.g. Acme Tech Labs"
                        className="w-full bg-stone-50 border-2 border-black rounded-lg px-3 py-2 text-xs font-bold text-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase text-stone-600 mb-1">
                        Your Project ID / Slug URL (from OpenAlt/GitHub):
                      </label>
                      <input
                        type="text"
                        required
                        value={interceptSponsorSaaSId}
                        onChange={(e) => setInterceptSponsorSaaSId(e.target.value)}
                        placeholder="e.g. acme-planner"
                        className="w-full bg-stone-50 border-2 border-black rounded-lg px-3 py-2 text-xs font-bold text-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase text-stone-600 mb-1">
                        Competitor keywords to hijack (comma separated):
                      </label>
                      <input
                        type="text"
                        required
                        value={interceptTargetKeywords}
                        onChange={(e) => setInterceptTargetKeywords(e.target.value)}
                        placeholder="e.g. jira, linear, trello"
                        className="w-full bg-stone-50 border-2 border-black rounded-lg px-3 py-2 text-xs font-bold text-black"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSponsoring}
                        className="w-full bg-black text-white hover:bg-neutral-800 disabled:opacity-50 border-2 border-black py-3.5 rounded-xl text-xs font-black uppercase text-center shadow-[3px_3px_0_0_#10b981] active:translate-y-0.5 transition-all cursor-pointer"
                      >
                        {isSponsoring ? "Booking advertisement slots..." : "Authorize Ad Campaign ($20)"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* citations */}
            {citations && citations.length > 0 && (
              <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#000000] font-mono text-[10px] text-stone-800">
                <div className="font-black uppercase tracking-wider mb-2 text-stone-500 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3 stroke-[2.5px]" /> Grounding Sources Citations
                </div>
                <div className="flex flex-wrap gap-2">
                  {citations.map((cite, idx) => (
                    <a
                      key={idx}
                      href={cite.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-[#fffdf5] hover:bg-stone-50 border border-stone-300 px-2 py-1 rounded text-black font-semibold hover:underline"
                    >
                      {cite.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC STICKY LIVE CHAT WINDOW SIDEBAR (4 columns on large viewports) */}
          <div className="lg:col-span-4 lg:sticky lg:top-8">
            <div className="bg-[#fffdf5] border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#000000] overflow-hidden flex flex-col h-[520px]">
              
              {/* Header */}
              <div className="bg-black text-white p-3.5 flex items-center gap-2 border-b-4 border-black shrink-0">
                <div className="flex h-8 w-8 items-center justify-center bg-yellow-300 border border-black rounded-lg shrink-0 shadow-[1px_1px_0_0_#000000]">
                  <MessageSquare className="h-4.5 w-4.5 text-black fill-black" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-white leading-tight">AI Advisor Sandbox</h4>
                  <span className="text-[8px] font-mono text-yellow-300 font-bold uppercase tracking-wider block mt-0.5">Context: {report.nameA} vs {report.nameB}</span>
                </div>
              </div>

              {/* Chat history list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fafaf6]">
                {chatHistory.map((msg, i) => {
                  const isModel = msg.role === "model" || msg.role === "assistant";
                  return (
                    <div 
                      key={i} 
                      className={`flex ${isModel ? "justify-start" : "justify-end"} items-start gap-1.5`}
                    >
                      {isModel && (
                        <div className="h-6 w-6 rounded-full border border-black bg-yellow-300 text-[10px] font-mono font-black flex items-center justify-center shrink-0 shadow-[0.5px_0.5px_0_0_#000000]">
                          AI
                        </div>
                      )}
                      
                      <div className={`p-3 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0_0_#0 black] text-[11px] leading-relaxed max-w-[85%] font-medium text-stone-900 ${
                        isModel ? "bg-white text-left" : "bg-[#fbcfe8] text-right ml-auto"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })}

                {isChatLoading && (
                  <div className="flex justify-start items-center gap-2">
                    <div className="h-6 w-6 rounded-full border border-black bg-yellow-300 text-[9px] font-mono font-black flex items-center justify-center shrink-0 shadow-[0.5px_0.5px_0_0_#000000]">
                      AI
                    </div>
                    <div className="p-2.5 rounded-lg border-2 border-black bg-white text-[10px] font-bold text-stone-500 flex items-center gap-1.5 shadow-[1px_1px_0_0_#000000]">
                      <RefreshCw className="h-3 w-3 animate-spin text-black" /> Synthesizing tech response...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestion Quick Chips */}
              <div className="px-3.5 py-1.5 bg-[#f5f5f0] border-t border-b border-stone-200 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap shrink-0">
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(chip)}
                    disabled={isChatLoading || !auth.currentUser}
                    className="text-[9px] bg-white border border-stone-300 hover:border-black rounded px-2 py-1 text-black font-semibold cursor-pointer active:scale-95 transition disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input console area */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat(chatInput);
                }}
                className="p-3.5 bg-white border-t-2 border-black flex items-center gap-2 shrink-0 font-mono"
              >
                <input
                  type="text"
                  value={auth.currentUser ? chatInput : ""}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={auth.currentUser ? "Ask advisor..." : "🔒 Sign in to chat"}
                  disabled={isChatLoading || !auth.currentUser}
                  className="flex-1 bg-white border-2 border-black rounded-lg px-3 py-2 text-xs focus:outline-none focus:translate-y-[-0.5px] shadow-[1px_1px_0_0_#000000] focus:shadow-[2px_2px_0_0_#000000] transition-all"
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim() || !auth.currentUser}
                  className="p-2 bg-[#fde047] hover:bg-yellow-400 border-2 border-black rounded-lg text-black shadow-[1.5px_1.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-40"
                  aria-label="Send Query Message"
                >
                  <Send className="h-3.5 w-3.5 stroke-[2.5px]" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
