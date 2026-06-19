import React, { useState } from "react";
import { 
  Compass, 
  MessageSquare, 
  ArrowLeftRight, 
  Star, 
  PlusCircle, 
  User, 
  LogOut, 
  Menu, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Sparkles,
  Terminal,
  Flame,
  BookOpen,
  DollarSign,
  Users,
  Home,
  ShieldAlert,
  Target
} from "lucide-react";
import { ViewType } from "../types";
import { User as FirebaseUser } from "firebase/auth";

interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  user: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  projects?: any[];
  userTier?: string;
  subscriptionStatus?: string;
  userCredits?: number;
}

export default function Sidebar({
  currentView,
  setView,
  user,
  onLogin,
  onLogout,
  isCollapsed,
  setIsCollapsed,
  projects = [],
  userTier = "free",
  subscriptionStatus = "",
  userCredits = 30
}: SidebarProps) {
  const menuItems = [
    { id: "discover" as ViewType, label: "Project Discovery", icon: Compass, description: "Explore repos & SaaS alternatives" },
    { id: "opensource" as ViewType, label: "Open Source Market", icon: Terminal, description: "Discover GitHub repositories" },
    { id: "trending" as ViewType, label: "Trending Rankings", icon: Star, description: "Hottest fresh alternative index" },
    { id: "battle" as ViewType, label: "Versus Battlegrounds", icon: ShieldAlert, description: "Tug-of-war tribal tech warfare" },
    { id: "communitysaas" as ViewType, label: "Community SaaS", icon: Users, description: "Submit & browse curated SaaS" },
    { id: "compare" as ViewType, label: "AI Comparison", icon: ArrowLeftRight, description: "Compare openalt technologies" },
    { id: "aiplanner" as ViewType, label: "AI SaaS Planner", icon: Sparkles, description: "Plan zero-dollar development" },
    { id: "community" as ViewType, label: "Community Hub", icon: MessageSquare, description: "Discuss, post & share ideas" },
    { id: "blogs" as ViewType, label: "Tech Blogs", icon: BookOpen, description: "Engineering & Migration guides" },
    { id: "pricing" as ViewType, label: "Pricing", icon: DollarSign, description: "Curated pricing options & plans" },
    { id: "submit" as ViewType, label: "Submit Personal SaaS", icon: PlusCircle, description: "Add your own SaaS projects" },
    { id: "ads" as ViewType, label: "Ad Campaigns", icon: Target, description: "Boost SaaS listing with prominent placements" },
  ];

  if (user) {
    menuItems.push({ id: "mysaas" as ViewType, label: "My SaaS Center", icon: User, description: "Manage your uploaded projects" });
  }

  const [collapsedSections, setCollapsedSections] = useState({
    explore: false,
    play: true,
    social: true
  });

  const toggleSection = (section: 'explore' | 'play' | 'social') => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  React.useEffect(() => {
    if (["battle", "compare", "aiplanner"].includes(currentView)) {
      setCollapsedSections(prev => ({ ...prev, play: false }));
    }
    if (["community", "blogs", "pricing", "submit", "mysaas", "ads"].includes(currentView)) {
      setCollapsedSections(prev => ({ ...prev, social: false }));
    }
    if (["discover", "opensource", "trending", "communitysaas"].includes(currentView)) {
      setCollapsedSections(prev => ({ ...prev, explore: false }));
    }
  }, [currentView]);

  // Sophisticated Daily Rotational Showcase Algorithm
  const showcased = React.useMemo(() => {
    if (!projects || projects.length === 0) return [];
    const dailySalt = new Date().getDate();

    const scoredList = projects.map((p) => {
      const upvotes = p.upvotes || 0;
      const rating = p.rating || 0;
      const stars = p.stars || 0;

      const charCodeSum = p.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const rotationFactor = Math.sin(charCodeSum + dailySalt) * 10;

      const baseScore = upvotes * 2 + rating * 6 + stars * 0.05;
      const finalScore = baseScore + rotationFactor;

      return { project: p, score: finalScore };
    });

    return scoredList
      .sort((a, b) => b.score - a.score)
      .slice(0, 1)
      .map(item => item.project);
  }, [projects]);

  return (
    <aside
      id="main-sidebar"
      className={`fixed top-0 left-0 z-40 h-screen border-r-4 transition-all duration-500 hidden md:flex flex-col justify-between select-none ${
        userTier === "test_1rs"
          ? "border-emerald-500 shadow-[3px_0_12px_rgba(16,185,129,0.18)]"
          : userTier === "pro"
          ? "border-orange-500 shadow-[3px_0_16px_rgba(249,115,22,0.2)]"
          : userTier === "enterprise"
          ? "border-purple-600 shadow-[4px_0_24px_rgba(124,58,237,0.35)] ring-2 ring-purple-500/10"
          : "border-black"
      } bg-[#fffdf5] ${
        isCollapsed ? "w-18" : "w-64"
      }`}
    >
      {/* Top Banner Header & Nav Panel */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between p-4 border-b-4 border-black bg-[#fde047] h-[69px] shrink-0">
          <div
            onClick={() => setView("discover")}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black text-white border-2 border-black shadow-[2px_2px_0_0_#000000]">
              <Terminal className="h-5 w-5 text-[#fde047]" />
            </div>
            {!isCollapsed && (
              <div>
                <span className="font-sans font-black text-base lg:text-lg tracking-tight text-black flex items-center gap-1">
                  OpenAlt
                  <span className="text-[9px] font-mono py-0.5 px-1.5 rounded border border-black bg-white text-black font-extrabold uppercase">
                    v1.0
                  </span>
                </span>
                <p className="text-[9px] font-mono text-stone-800 font-bold uppercase">Alternative Hub</p>
              </div>
            )}
          </div>

          <button
            id="sidebar-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded border-2 border-black bg-white p-1 text-black hover:bg-stone-100 shadow-[2px_2px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4 stroke-[3px]" /> : <ChevronLeft className="h-4 w-4 stroke-[3px]" />}
          </button>
        </div>

        {/* Scrollable Navigation section */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {/* Navigation Options List */}
          <nav className="space-y-3.5 p-3">
            {(() => {
              const exploreItems = menuItems.filter(item => ["discover", "opensource", "trending", "communitysaas"].includes(item.id));
              const playItems = menuItems.filter(item => ["battle", "compare", "aiplanner"].includes(item.id));
              const socialItems = menuItems.filter(item => ["community", "blogs", "pricing", "submit", "mysaas", "ads"].includes(item.id));

              const renderItem = (item: any) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                const activeColors = {
                  discover: "bg-[#fde047]",
                  opensource: "bg-[#ddd6fe]",
                  trending: "bg-[#fed7aa]",
                  battle: "bg-[#fbcfe8]",
                  communitysaas: "bg-[#86efac]",
                  compare: "bg-[#67e8f9]",
                  aiplanner: "bg-[#86efac]",
                  community: "bg-[#fbcfe8]",
                  blogs: "bg-[#67e8f9]",
                  pricing: "bg-[#ddd6fe]",
                  submit: "bg-[#fed7aa]",
                  mysaas: "bg-[#ccdffd]",
                  ads: "bg-[#86efac]"
                };

                const chosenBg = activeColors[item.id] || "bg-[#fde047]";

                return (
                  <button
                    key={item.id}
                    id={`btn-nav-${item.id}`}
                    onClick={() => setView(item.id)}
                    className={`w-full group relative flex items-center gap-2 rounded-lg border-2 border-black py-1.5 px-2 text-xs font-black transition-all ${
                      isActive
                        ? `${chosenBg} text-black shadow-[3px_3px_0_0_#000000] translate-x-[-1.5px] translate-y-[-1.5px]`
                        : "bg-white text-stone-750 hover:bg-stone-50 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[2px_2px_0_0_#000000] shadow-[1px_1px_0_0_#000000]"
                    }`}
                  >
                    <div className={`p-1 border-2 border-black rounded bg-white ${isActive ? "shadow-[1px_1px_0_0_#000000]" : "shadow-none"} flex items-center justify-center shrink-0`}>
                      <Icon className="h-3.5 w-3.5 shrink-0 stroke-[2.5px] text-black" />
                    </div>
                    {!isCollapsed && (
                      <div className="text-left min-w-0 flex-1">
                        <p className="font-black tracking-tight leading-none text-black truncate text-[11px]">{item.label}</p>
                      </div>
                    )}
                    {/* Floating Hover Description Panel */}
                    <div className="fixed left-20 z-50 rounded-xl border-3 border-black bg-white p-3 text-[10px] font-bold text-black shadow-[4px_4px_0_0_#000000] opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none group-hover:delay-100 w-52 max-w-xs break-words pointer-events-none transform -translate-y-2 select-none">
                      <p className="font-black text-xs text-black border-b border-black/15 pb-1 mb-1 flex items-center gap-1.5">
                        <span className="p-1 bg-[#fde047] rounded border border-black inline-block">
                          <Icon className="h-3.5 w-3.5 text-black" />
                        </span>
                        <span>{item.label}</span>
                      </p>
                      <p className="text-stone-600 font-semibold leading-relaxed text-[10px]">{item.description}</p>
                    </div>
                  </button>
                );
              };

              const renderGroupHeader = (label: string, isExpanded: boolean, onClick: () => void) => {
                if (isCollapsed) return <div className="border-b-2 border-stone-200/50 my-3" />;
                return (
                  <button
                    onClick={onClick}
                    type="button"
                    className="w-full flex items-center justify-between text-[9px] font-black tracking-widest text-stone-500 hover:text-black py-1 select-none cursor-pointer transition-all uppercase mb-1.5 border-b border-dashed border-stone-200/80"
                  >
                    <span>{label}</span>
                    <ChevronDown 
                      className={`h-3 w-3 text-stone-500 transition-transform duration-300 ${
                        isExpanded ? "rotate-0" : "-rotate-90"
                      }`} 
                    />
                  </button>
                );
              };

              return (
                <div className="space-y-4">
                  {/* Explore Section */}
                  <div>
                    {renderGroupHeader("Explore Alternate", !collapsedSections.explore, () => toggleSection("explore"))}
                    {(!collapsedSections.explore || isCollapsed) && (
                      <div className="space-y-1.5">
                        {exploreItems.map(renderItem)}
                      </div>
                    )}
                  </div>

                  {/* Playgrounds Section */}
                  <div>
                    {renderGroupHeader("Battle & AI Tools", !collapsedSections.play, () => toggleSection("play"))}
                    {(!collapsedSections.play || isCollapsed) && (
                      <div className="space-y-1.5">
                        {playItems.map(renderItem)}
                      </div>
                    )}
                  </div>

                  {/* Support & Community Section */}
                  <div>
                    {renderGroupHeader("Community & Plans", !collapsedSections.social, () => toggleSection("social"))}
                    {(!collapsedSections.social || isCollapsed) && (
                      <div className="space-y-1.5">
                        {socialItems.map(renderItem)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </nav>

          {/* Dynamic Brutalist Showcase Widget */}
          {!isCollapsed && showcased.length > 0 && (
            <div className="mx-3 my-2 p-3 bg-[#e0f2fe] border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000000] space-y-1.5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 border-b border-black/15 pb-1">
                <Sparkles className="h-3.5 w-3.5 text-black animate-pulse" />
                <span className="font-sans font-black text-[9px] tracking-tight uppercase text-black">Vetted Daily Feature</span>
              </div>
              <div onClick={() => setView("featured")} className="cursor-pointer group">
                <h4 className="font-sans font-black text-xs text-black leading-tight truncate group-hover:underline flex items-center justify-between gap-1">
                  <span>{showcased[0].name}</span>
                  <ChevronRight className="h-3 w-3 inline stroke-[2.5px] text-stone-600 group-hover:translate-x-0.5 transition-all" />
                </h4>
                <p className="text-[9.5px] text-stone-600 font-bold leading-normal mt-0.5 line-clamp-2">
                  {showcased[0].description}
                </p>
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono font-black pt-1">
                <span className="bg-[#67e8f9] text-black border border-black rounded px-1.5 py-0.5 uppercase font-black">
                  {showcased[0].type === "saas" ? "SaaS" : "Open Source"}
                </span>
                <span className="text-orange-600 flex items-center gap-0.5">
                  🔥 {showcased[0].upvotes || 0} votes
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Profile and Sessions */}
      <div className={`border-t-3 border-black p-3 transition-colors ${
        userTier === "test_1rs" ? "bg-emerald-50" :
        userTier === "pro" ? "bg-orange-50" :
        userTier === "enterprise" ? "bg-purple-100" :
        "bg-[#fbcfe8]"
      }`}>
        {user ? (
          <div className="space-y-3">
            <button
              id="btn-nav-profile"
              onClick={() => setView("profile")}
              className={`w-full group relative flex items-center gap-3 rounded-lg p-2.5 bg-white transition text-left border-2 ${
                userTier === "test_1rs"
                  ? "border-emerald-500 shadow-[3px_3px_0_0_#10b981] hover:bg-emerald-50/40"
                  : userTier === "pro"
                  ? "border-orange-500 shadow-[3px_3px_0_0_#f97316] hover:bg-orange-50/40 anim-pulse-border"
                  : userTier === "enterprise"
                  ? "border-purple-600 shadow-[4px_4px_0_0_#7c3aed] bg-purple-50 hover:bg-purple-100/30"
                  : "border-black shadow-[1.5px_1.5px_0_0_#000000] hover:bg-stone-50"
              } ${currentView === "profile" ? "bg-emerald-100/100 translate-x-[-1px] translate-y-[-1px]" : ""}`}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User Avatar"}
                  className={`h-8 w-8 rounded border-2 object-cover shrink-0 ${
                    userTier === "test_1rs" ? "border-emerald-500" :
                    userTier === "pro" ? "border-orange-500" :
                    userTier === "enterprise" ? "border-purple-500" :
                    "border-black"
                  }`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded font-black border-2 text-xs ${
                  userTier === "test_1rs" ? "border-emerald-500 bg-emerald-50 text-emerald-800" :
                  userTier === "pro" ? "border-orange-500 bg-orange-50 text-orange-800" :
                  userTier === "enterprise" ? "border-purple-500 bg-purple-50 text-purple-800" :
                  "border-black bg-white text-black"
                }`}>
                  {user.displayName?.charAt(0).toUpperCase() || <User className="h-3.5 w-3.5" />}
                </div>
              )}
              
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-xs font-black text-black leading-tight">
                      {user.displayName || "User"}
                    </p>
                    {userTier === "test_1rs" && <Flame className="h-3 w-3 text-emerald-500 shrink-0 fill-emerald-500" />}
                    {userTier === "pro" && <Sparkles className="h-3 w-3 text-orange-500 shrink-0 fill-orange-500" />}
                    {userTier === "enterprise" && <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0 fill-purple-500 animate-spin" />}
                  </div>
                  <p className="truncate text-[9px] font-mono text-stone-600 font-bold leading-none mt-0.5">
                    {user.email}
                  </p>

                  {/* current user plan badge inside sidebar bottom */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {userTier === "test_1rs" && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500 text-white border border-emerald-700 shadow-[1px_1px_0_0_#000000]">
                        ⚡ Live Tester Gate
                      </span>
                    )}
                    {userTier === "pro" && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-500 text-white border border-orange-700 shadow-[1px_1px_0_0_#000000]">
                        🔥 Alt Pro
                      </span>
                    )}
                    {userTier === "enterprise" && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-purple-600 text-white border-2 border-purple-800 shadow-[2px_2px_0_0_#000000] animate-pulse">
                        💎 Product Scale
                      </span>
                    )}
                    {userTier !== "test_1rs" && userTier !== "pro" && userTier !== "enterprise" && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-400">
                        🌱 Free Hobbyist
                      </span>
                    )}
                  </div>

                  {/* Credits balance presentation tracker */}
                  <div className="mt-2 text-left">
                    <div className="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 text-black border border-black rounded text-[9px] font-mono font-black flex items-center justify-between shadow-[2px_2px_0_0_#000000] cursor-pointer transition-all" onClick={() => setView("pricing")}>
                      <span>💰 Credits:</span>
                      <span className="font-extrabold bg-stone-900 text-[#fde047] py-0.5 px-1.5 rounded text-[10px]">
                        {userCredits}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {isCollapsed && (
                <div className="absolute left-16 z-50 rounded border-2 border-black bg-white p-2 text-[10px] font-black text-black shadow-[2px_2px_0_0_#000000] opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none space-y-1">
                  <p>My Profile ({userTier === "pro" ? "Alt Pro" : userTier === "enterprise" ? "Product Scale" : userTier === "test_1rs" ? "Tester" : "Hobbyist"})</p>
                  <p className="font-mono text-yellow-600 flex items-center gap-1 font-bold">💰 {userCredits} Credits</p>
                </div>
              )}
            </button>

            <button
              id="sidebar-signout"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border-2 border-black bg-white px-2 py-1.5 text-[10px] font-black text-black hover:bg-red-500 hover:text-white hover:shadow-[3px_3px_0_0_#000000] shadow-[1.5px_1.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all text-center uppercase tracking-wider"
            >
              <LogOut className="h-3.5 w-3.5 stroke-[2.5px]" />
              {!isCollapsed && <span>Log Out</span>}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {!isCollapsed && (
              <div className="rounded-lg border-2 border-black bg-white p-2 text-center shadow-[1.5px_1.5px_0_0_#000000]">
                <p className="text-[10px] font-bold leading-tight text-stone-850">
                  Connect profile to register alternative platforms and participate!
                </p>
              </div>
            )}
            <button
              id="sidebar-signin"
              onClick={onLogin}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#fde047] border-2 border-black px-3 py-2.5 text-xs font-black text-black hover:bg-white shadow-[3px_3px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase tracking-wider"
            >
              <Sparkles className="h-3.5 w-3.5 text-black animate-pulse" />
              {!isCollapsed && <span>Google Sign In</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
