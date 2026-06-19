import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Award, 
  CheckCircle2, 
  Globe, 
  Lock, 
  Unlock, 
  Send, 
  Share2, 
  Plus, 
  Target, 
  DollarSign, 
  Flame, 
  MessageSquare, 
  Loader2, 
  Sparkles, 
  Check, 
  ExternalLink, 
  AlertTriangle,
  FileText,
  MousePointerClick,
  Eye,
  Users
} from "lucide-react";
import { db, auth } from "../firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc,
  updateDoc 
} from "firebase/firestore";
import { Project } from "../types";

interface AdCampaignManagerProps {
  onLogin: () => void;
  setView: (view: any) => void;
  addToast: (message: string, type?: "success" | "info" | "warning") => void;
}

interface AdProgressState {
  invitedFounders: { email: string; timestamp: string }[];
  streakDays: number;
  streakTimestamps: string[];
  bypassed: boolean;
  adCredits: number;
  postsCount: number;
  commentsCount: number;
  updatedAt: string;
}

interface AdCampaign {
  id: string;
  userId: string;
  saasName: string;
  saasUrl: string;
  tagline: string;
  status: "draft" | "pending" | "active" | "expired";
  impressions: number;
  clicks: number;
  bypassedWithFee: boolean;
  xLink: string;
  linkedinLink: string;
  redditLink: string;
  favoriteSaaS: string;
  favoriteSaaSUrl: string;
  createdAt: string;
}

export default function AdCampaignManager({ onLogin, setView, addToast }: AdCampaignManagerProps) {
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [submittingCampaign, setSubmittingCampaign] = useState(false);
  
  // App-wide SaaS projects list (used for choosing favorite SaaS)
  const [saasDirectory, setSaasDirectory] = useState<Project[]>([]);
  // Current user's uploaded SaaS options
  const [userSaaSProjects, setUserSaaSProjects] = useState<Project[]>([]);

  // States
  const [progress, setProgress] = useState<AdProgressState>({
    invitedFounders: [],
    streakDays: 1,
    streakTimestamps: [new Date().toLocaleDateString()],
    bypassed: false,
    adCredits: 0,
    postsCount: 0,
    commentsCount: 0,
    updatedAt: new Date().toISOString()
  });

  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);

  // Form states for creating a Campaign
  const [customSaaSName, setCustomSaaSName] = useState("");
  const [customSaaSUrl, setCustomSaaSUrl] = useState("");
  const [customSaaSTagline, setCustomSaaSTagline] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("custom");

  // Form states for verifying the Link Box tasks
  const [xPostLink, setXPostLink] = useState("");
  const [linkedinPostLink, setLinkedinPostLink] = useState("");
  const [redditPostLink, setRedditPostLink] = useState("");
  const [favSaaSProjectName, setFavSaaSProjectName] = useState("");
  const [favSaaSProjectUrl, setFavSaaSProjectUrl] = useState("");

  // Email input for founder referral simulation
  const [founderEmail, setFounderEmail] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Toggle checkout modal
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Load user progress, campaigns, and directory SaaS
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      await Promise.all([
        fetchDirectorySaaS(),
        fetchUserAdProgress(),
        fetchUserCampaigns()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      addToast("Failed to sync some dashboard records.", "warning");
    } finally {
      setLoading(false);
    }
  }

  // Fetch all SaaS projects across directory
  async function fetchDirectorySaaS() {
    try {
      const q = query(collection(db, "projects"), where("type", "==", "saas"));
      const snap = await getDocs(q);
      const list: Project[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Project);
      });
      setSaasDirectory(list);
    } catch (e) {
      console.error("Error fetching SaaS directory:", e);
    }
  }

  // Fetch user ad progress status
  async function fetchUserAdProgress() {
    if (!auth.currentUser) return;
    try {
      // Fetch user profile details to retrieve their verified referral/username code
      try {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setCurrentUsername(userDoc.data().username || "");
        }
      } catch (err) {
        console.warn("Could not retrieve user details inside campaign manager:", err);
      }

      const progressDocRef = doc(db, "users", auth.currentUser.uid, "adProgress", "mainProgress");
      const snap = await getDoc(progressDocRef);
      
      // Let's check real community posts count in the database
      let realPostsCount = 0;
      try {
        const postsQuery = query(
          collection(db, "posts"),
          where("authorId", "==", auth.currentUser.uid)
        );
        const postsSnap = await getDocs(postsQuery);
        realPostsCount = postsSnap.size;
      } catch (err) {
        console.error("Error fetching real posts count:", err);
      }

      // Query real referred founders who signed up under this user's referrer code
      let realReferralInvites: { email: string; timestamp: string }[] = [];
      try {
        const referralsQuery = query(
          collection(db, "referrals"),
          where("referrerUid", "==", auth.currentUser.uid)
        );
        const referralsSnap = await getDocs(referralsQuery);
        referralsSnap.forEach((docSnap) => {
          const rData = docSnap.data();
          realReferralInvites.push({
            email: rData.refereeEmail,
            timestamp: rData.createdAt ? new Date(rData.createdAt).toLocaleDateString() : new Date().toLocaleDateString()
          });
        });
      } catch (err) {
        console.error("Error fetching real referrals inside campaign manager:", err);
      }

      if (snap.exists()) {
        const data = snap.data();
        const dbInvites = data.invitedFounders || [];
        
        // Merge real and db-saved invites uniquely by email
        const mergedInvites = [...realReferralInvites];
        dbInvites.forEach((invite: any) => {
          if (!mergedInvites.some(item => item.email.toLowerCase() === invite.email.toLowerCase())) {
            mergedInvites.push(invite);
          }
        });

        setProgress({
          invitedFounders: mergedInvites,
          streakDays: data.streakDays || 1,
          streakTimestamps: data.streakTimestamps || [new Date().toLocaleDateString()],
          bypassed: data.bypassed || false,
          adCredits: data.adCredits || 0,
          postsCount: Math.max(data.postsCount || 0, realPostsCount),
          commentsCount: data.commentsCount || 0,
          updatedAt: data.updatedAt || new Date().toISOString()
        });
      } else {
        // Initialize if not present
        const initialProgress: AdProgressState = {
          invitedFounders: realReferralInvites,
          streakDays: 1,
          streakTimestamps: [new Date().toLocaleDateString()],
          bypassed: false,
          adCredits: 0,
          postsCount: realPostsCount,
          commentsCount: 0,
          updatedAt: new Date().toISOString()
        };
        await setDoc(progressDocRef, initialProgress);
        setProgress(initialProgress);
      }
    } catch (e) {
      console.error("Error getting user ad progress:", e);
    }
  }

  // Fetch user campaigns
  async function fetchUserCampaigns() {
    if (!auth.currentUser) return;
    try {
      const campaignsColRef = collection(db, "users", auth.currentUser.uid, "adCampaigns");
      const snap = await getDocs(campaignsColRef);
      const list: AdCampaign[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AdCampaign);
      });
      setCampaigns(list);

      // Extract user uploaded SaaS projects to pre-populate custom name selects
      const userProjectsQuery = query(
        collection(db, "projects"),
        where("submitterId", "==", auth.currentUser.uid),
        where("type", "==", "saas")
      );
      const upSnap = await getDocs(userProjectsQuery);
      const uList: Project[] = [];
      upSnap.forEach((docSnap) => {
        uList.push({ id: docSnap.id, ...docSnap.data() } as Project);
      });
      setUserSaaSProjects(uList);
    } catch (e) {
      console.error("Error loading user campaigns:", e);
    }
  }

  // Helper helper to parse and format URL domain for Vemetric/Google favicon endpoints
  function getDomain(urlString: string): string {
    if (!urlString) return "";
    try {
      // Check if it looks like flat domain
      if (!urlString.startsWith("http")) {
        urlString = "https://" + urlString;
      }
      const url = new URL(urlString);
      return url.hostname.replace("www.", "");
    } catch (_) {
      const match = urlString.trim().split("/")[0];
      return match || "example.com";
    }
  }

  // Invite founder referral simulation handler
  async function handleInviteFounder(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) {
      addToast("Please connect your Google Account profile first.", "warning");
      return;
    }
    if (!founderEmail.trim()) return;

    setSavingProgress(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(founderEmail)) {
        addToast("Please enter a valid email address.", "warning");
        setSavingProgress(false);
        return;
      }

      // Check if already invited
      if (progress.invitedFounders.some(f => f.email.toLowerCase() === founderEmail.toLowerCase())) {
        addToast("This founder email has already been invited!", "info");
        setSavingProgress(false);
        return;
      }

      const updatedInvites = [
        ...progress.invitedFounders,
        { email: founderEmail.toLowerCase(), timestamp: new Date().toLocaleDateString() }
      ];

      const progressDocRef = doc(db, "users", auth.currentUser.uid, "adProgress", "mainProgress");
      await updateDoc(progressDocRef, {
        invitedFounders: updatedInvites,
        updatedAt: new Date().toISOString()
      });

      setProgress(prev => ({
        ...prev,
        invitedFounders: updatedInvites
      }));

      // Grant ad credit if this invite brings total to exactly 3 or unlocks all tasks
      let extraToast = "";
      if (updatedInvites.length === 3) {
        extraToast = " 🎉 Requirement Unlocked: Invited 3 founders!";
      }

      addToast(`Invitation successfully dispatched to ${founderEmail}!${extraToast}`, "success");
      setFounderEmail("");
    } catch (error) {
      console.error("Error inviting founder:", error);
      addToast("Failed to save invitation.", "warning");
    } finally {
      setSavingProgress(false);
    }
  }

  function handleCopyInviteCode() {
    if (!currentUsername) {
      addToast("Set up your profile username first to generate a referral code!", "warning");
      return;
    }
    const finalCode = currentUsername.toUpperCase();
    const shareMessage = `Join the OpenAlt SaaS directory with my invite code "${finalCode}" to unlock traffic campaigns and list your platform! https://openalt.saas/`;
    navigator.clipboard.writeText(shareMessage);
    setCopiedReferral(true);
    addToast("Referral invitation message copied to clipboard!", "success");
    setTimeout(() => setCopiedReferral(false), 2000);
  }

  // Daily Check-In streak manual simulation helper
  async function handleSimulateCheckIn() {
    if (!auth.currentUser) return;
    setSavingProgress(true);
    try {
      const today = new Date().toLocaleDateString();
      if (progress.streakTimestamps.includes(today)) {
        addToast("You have already checked-in for today! Come back tomorrow to continue your streak.", "info");
        setSavingProgress(false);
        return;
      }

      // Format current streak
      const newStreakTimestamps = [...progress.streakTimestamps, today];
      const newStreakDays = Math.min(3, progress.streakDays + 1);

      const progressDocRef = doc(db, "users", auth.currentUser.uid, "adProgress", "mainProgress");
      await updateDoc(progressDocRef, {
        streakDays: newStreakDays,
        streakTimestamps: newStreakTimestamps,
        updatedAt: new Date().toISOString()
      });

      setProgress(prev => ({
        ...prev,
        streakDays: newStreakDays,
        streakTimestamps: newStreakTimestamps
      }));

      addToast(`Consecutive check-in registered! Current Streak: Day ${newStreakDays}/3.`, "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to log check-in.", "warning");
    } finally {
      setSavingProgress(false);
    }
  }

  // Simulation controls to boost core metrics easily
  async function handleSimulateQuests() {
    if (!auth.currentUser) return;
    setSavingProgress(true);
    try {
      const progressDocRef = doc(db, "users", auth.currentUser.uid, "adProgress", "mainProgress");
      
      const boosted = {
        postsCount: 5,
        commentsCount: 5,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(progressDocRef, boosted);
      setProgress(prev => ({
        ...prev,
        ...boosted
      }));

      addToast("Community Hub interactions fast-tracked! (5 Posts + 5 Comments unlocked).", "success");
    } catch (e) {
      console.error(e);
      addToast("Fast track failed.", "warning");
    } finally {
      setSavingProgress(false);
    }
  }

  // Instant flat-fee checkout handler
  async function handleBypassFeePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) return;
    setProcessingPayment(true);
    
    try {
      // Simulate Razorpay or Stripe capture for the $15 flat-fee
      const paymentId = "ad_flat_fee_" + Math.random().toString(36).substring(2, 11);
      
      const paymentsRef = collection(db, "users", auth.currentUser.uid, "payments");
      await setDoc(doc(paymentsRef, paymentId), {
        id: paymentId,
        amount: 15,
        currency: "USD",
        status: "completed",
        plan: "SaaS Ad Campaign Bypass",
        gateway: "Stripe",
        createdAt: new Date().toISOString()
      });

      // Update progress state as bypassed with 3-day credits rewarded
      const progressDocRef = doc(db, "users", auth.currentUser.uid, "adProgress", "mainProgress");
      
      const updatedCredits = progress.adCredits + 3; // Grants 3 Days free ad slot
      await updateDoc(progressDocRef, {
        bypassed: true,
        adCredits: updatedCredits,
        updatedAt: new Date().toISOString()
      });

      setProgress(prev => ({
        ...prev,
        bypassed: true,
        adCredits: updatedCredits
      }));

      addToast("Payment authorized successfully! Your 3-Day Ad Credit is instantly unlocked.", "success");
      setShowBypassModal(false);
    } catch (err) {
      console.error("Payment error:", err);
      addToast("Payment authorization failed.", "warning");
    } finally {
      setProcessingPayment(false);
    }
  }

  // Submit social media links & verify and automatically unlock credits after submission simulation
  async function handleSubmitLinkBox(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (!xPostLink.trim() || !linkedinPostLink.trim() || !redditPostLink.trim()) {
      addToast("Please fill in links for all 3 social platforms (X, LinkedIn, and Reddit).", "warning");
      return;
    }

    if (!favSaaSProjectName.trim()) {
      addToast("Please select or nominate which favorite SaaS you endorsed.", "warning");
      return;
    }

    setSubmittingCampaign(true);
    try {
      const campaignId = "camp_" + Math.random().toString(36).substring(2, 9);
      
      // Save campaign submission in user subcollection
      const campaignDocRef = doc(db, "users", auth.currentUser.uid, "adCampaigns", campaignId);
      const campaignData: AdCampaign = {
        id: campaignId,
        userId: auth.currentUser.uid,
        saasName: favSaaSProjectName,
        saasUrl: favSaaSProjectUrl || "https://" + getDomain(favSaaSProjectName) + ".com",
        tagline: `Alternative promotion of ${favSaaSProjectName}!`,
        status: "pending", // Waiting 2 hr verification
        impressions: 0,
        clicks: 0,
        bypassedWithFee: false,
        xLink: xPostLink,
        linkedinLink: linkedinPostLink,
        redditLink: redditPostLink,
        favoriteSaaS: favSaaSProjectName,
        favoriteSaaSUrl: favSaaSProjectUrl,
        createdAt: new Date().toISOString()
      };

      await setDoc(campaignDocRef, campaignData);

      // Increase credit immediately in state but flag for 2 hours validation schedule
      const updatedCredits = progress.adCredits + 3;
      const progressDocRef = doc(db, "users", auth.currentUser.uid, "adProgress", "mainProgress");
      await updateDoc(progressDocRef, {
        adCredits: updatedCredits,
        updatedAt: new Date().toISOString()
      });

      setProgress(prev => ({
        ...prev,
        adCredits: updatedCredits
      }));

      // Refresh campaigns
      await fetchUserCampaigns();

      addToast("Social Endorsement links logged! We are verifying the links. 3 Days ad credits are provisioned and active as pending.", "success");
      
      // Reset inputs
      setXPostLink("");
      setLinkedinPostLink("");
      setRedditPostLink("");
      setFavSaaSProjectName("");
      setFavSaaSProjectUrl("");
    } catch (e) {
      console.error(e);
      addToast("Failed to submit verification links.", "warning");
    } finally {
      setSubmittingCampaign(false);
    }
  }

  // Launch live campaign with earned credits
  async function handleLaunchCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) return;

    let targetName = customSaaSName;
    let targetUrl = customSaaSUrl;

    if (selectedProjectId !== "custom") {
      const foundMatch = userSaaSProjects.find(p => p.id === selectedProjectId);
      if (foundMatch) {
        targetName = foundMatch.name;
        targetUrl = foundMatch.url;
      }
    }

    if (!targetName.trim() || !targetUrl.trim() || !customSaaSTagline.trim()) {
      addToast("Please fill in target SaaS Name, URL, and Promo Tagline.", "warning");
      return;
    }

    if (progress.adCredits <= 0) {
      addToast("You don't have remaining unused Ad Credits. complete missions or bypass with fee first!", "warning");
      return;
    }

    setSubmittingCampaign(true);
    try {
      const campaignId = "camp_" + Math.random().toString(36).substring(2, 9);
      const campaignDocRef = doc(db, "users", auth.currentUser.uid, "adCampaigns", campaignId);
      
      const newCampaign: AdCampaign = {
        id: campaignId,
        userId: auth.currentUser.uid,
        saasName: targetName,
        saasUrl: targetUrl,
        tagline: customSaaSTagline,
        status: "active",
        impressions: 42, // Start with real impression simulation
        clicks: 3,
        bypassedWithFee: progress.bypassed,
        xLink: "",
        linkedinLink: "",
        redditLink: "",
        favoriteSaaS: targetName,
        favoriteSaaSUrl: targetUrl,
        createdAt: new Date().toISOString()
      };

      await setDoc(campaignDocRef, newCampaign);

      // Decrement credits
      const progressDocRef = doc(db, "users", auth.currentUser.uid, "adProgress", "mainProgress");
      const nextCredits = Math.max(0, progress.adCredits - 3);
      await updateDoc(progressDocRef, {
        adCredits: nextCredits,
        updatedAt: new Date().toISOString()
      });

      setProgress(prev => ({
        ...prev,
        adCredits: nextCredits
      }));

      setSelectedProjectId("custom");
      setCustomSaaSName("");
      setCustomSaaSUrl("");
      setCustomSaaSTagline("");

      await fetchUserCampaigns();
      addToast("Your 3-Day Campaign Alternative Ad goes LIVE instantly! Rotating to users.", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to launch campaign.", "warning");
    } finally {
      setSubmittingCampaign(false);
    }
  }

  // Simulate extra traffic impressions and clicks for creative feedback
  async function handleSimulateTraffic(campaignId: string) {
    if (!auth.currentUser) return;
    try {
      const campRef = doc(db, "users", auth.currentUser.uid, "adCampaigns", campaignId);
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      const randomViews = Math.floor(Math.random() * 8) + 4;
      const randomClicks = Math.floor(Math.random() * 2) + 1;

      const nextViews = campaign.impressions + randomViews;
      const nextClicks = campaign.clicks + randomClicks;

      await updateDoc(campRef, {
        impressions: nextViews,
        clicks: nextClicks
      });

      addToast(`Simulated traffic loop! Placed ad received +${randomViews} views and +${randomClicks} clicks.`, "success");
      await fetchUserCampaigns();
    } catch (err) {
      console.error(err);
    }
  }

  // Progress metrics calculation
  const founderMissionsComplete = progress.invitedFounders.length >= 3;
  const streakMissionComplete = progress.streakDays >= 3;
  const postsMissionComplete = progress.postsCount >= 5;
  const commentsMissionComplete = progress.commentsCount >= 5;

  const totalTasksCompleted = 
    (founderMissionsComplete ? 1 : 0) + 
    (streakMissionComplete ? 1 : 0) + 
    (postsMissionComplete ? 1 : 0) + 
    (commentsMissionComplete ? 1 : 0);

  const canUnlockFreeCredits = totalTasksCompleted === 4;

  if (!auth.currentUser) {
    return (
      <div className="min-h-screen bg-[#fffdf5] py-12 px-6 flex flex-col items-center justify-center text-center">
        <div className="max-w-md bg-white border-4 border-black p-8 rounded-xl shadow-[6px_6px_0_0_#000000] space-y-6">
          <div className="bg-[#fef08a] p-4 border-2 border-black rounded-lg inline-block">
            <Lock className="h-10 w-10 text-black stroke-[2.5px] animate-pulse" />
          </div>
          <h2 className="font-sans font-black text-2xl tracking-tight text-stone-900 uppercase">
            Ad Campaign Terminal
          </h2>
          <p className="font-sans font-semibold text-stone-600 text-sm leading-relaxed">
            Gain immediate traction by promoting your SaaS as a vetted alternative to giants. Acquire qualified views directly from visiting founders!
          </p>
          <div className="bg-orange-50 border-2 border-dashed border-orange-300 p-4 rounded text-xs text-orange-950 font-medium leading-relaxed">
            🌿 To ensure anti-spam, users must connect a Google Profile and sync verified SaaS records to access placements.
          </div>
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#fde047] border-3 border-black py-3 px-4 font-sans font-black text-xs text-stone-900 uppercase shadow-[4px_4px_0_0_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            Connect Google Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffdf5] py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-20 select-none">
      {/* Visual Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-4 border-black bg-[#fde047] p-6 rounded-xl shadow-[4px_4px_0_0_#000000]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-black rounded border border-black inline-block text-white">
              <Plus className="h-4 w-4 text-[#fde047]" />
            </span>
            <span className="text-[10px] uppercase font-mono font-black text-stone-800 bg-white border border-black rounded px-1.5 py-0.5 shadow-[1px_1px_0_0_#000000]">
              Traffic Acquisition Engine
            </span>
          </div>
          <h1 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-black uppercase">
            Ad Placement Center
          </h1>
          <p className="font-sans text-xs font-semibold text-stone-800 max-w-2xl leading-relaxed">
            Pitch the community directly! Rank your platform as a native sponsored alternative instantly. Complete community milestones or unlock ad-tokens instantly for a flat fee.
          </p>
        </div>
        
        {/* Ad Balance State Card */}
        <div className="bg-white border-3 border-black p-4 rounded-lg shadow-[3px_3px_0_0_#000000] flex items-center gap-4">
          <div className="p-2.5 rounded border border-black bg-emerald-50 text-emerald-800">
            <Award className="h-7 w-7 stroke-[2.5px]" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase font-black text-stone-500">Available Slot Tokens</p>
            <p className="text-xl font-sans font-black text-black">
              {progress.adCredits} Days <span className="text-stone-500 text-xs font-bold">Credits</span>
            </p>
            <span className="inline-block mt-0.5 text-[9px] font-bold bg-[#ddd6fe] text-black border border-black rounded px-1">
              {progress.bypassed ? "💡 Instantly Unlocked" : `⌛ Quests complete (${totalTasksCompleted}/4)`}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="max-w-md mx-auto text-center py-20">
          <Loader2 className="h-10 w-10 text-black animate-spin mx-auto" />
          <p className="text-xs font-mono font-bold text-stone-600 mt-2">Connecting Campaign Streams...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Tasks & Quests (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Quest Progress Tracker Card */}
            <div className="bg-white border-4 border-black p-6 rounded-xl shadow-[4px_4px_0_0_#000000] space-y-6">
              <div className="flex items-center justify-between border-b-2 border-black pb-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <h3 className="font-sans font-black text-lg tracking-tight text-black uppercase">
                    Free Tier: Quest Board
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSimulateQuests}
                    disabled={savingProgress}
                    className="text-[9px] font-mono font-black border border-black bg-stone-100 hover:bg-[#fed7aa] px-2 py-0.5 rounded transition shadow-[1px_1px_0_0_#000000]"
                  >
                    ⚡ Fast Track Community Tasks
                  </button>
                  <button 
                    onClick={() => setShowBypassModal(true)}
                    className="text-[9px] font-mono font-black border border-black bg-[#fbcfe8] hover:bg-[#f472b6] text-black px-2.5 py-0.5 rounded transition shadow-[1.5px_1.5px_0_0_#000000]"
                  >
                    💰 Or Bypass All for $15
                  </button>
                </div>
              </div>

              <p className="font-sans text-xs font-semibold text-stone-600 leading-relaxed">
                Complete the daily activity loops on OpenAlt to claim <strong>3 Days free ad placement</strong>. Credits earned expire in 2 weeks unless placed.
              </p>

              {/* Progress Bar Grid */}
              <div className="bg-[#fffdf5] border-2 border-black rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between text-xs font-black">
                  <span>Missions Unlocked:</span>
                  <span className="bg-[#fde047] text-black border border-black px-2 py-0.5 rounded font-mono">
                    {totalTasksCompleted}/4 Complete
                  </span>
                </div>
                <div className="w-full bg-stone-200 rounded border-2 border-black h-4 overflow-hidden flex">
                  <div 
                    className="bg-emerald-500 h-full border-r border-black transition-all duration-500" 
                    style={{ width: `${(totalTasksCompleted / 4) * 100}%` }}
                  />
                </div>
                {canUnlockFreeCredits && progress.adCredits === 0 && (
                  <div className="bg-emerald-50 border-2 border-emerald-400 p-3 rounded text-xs text-emerald-900 font-bold flex items-center justify-between">
                    <span>🎉 All community milestones reached! Claim 3-Day custom placement.</span>
                    <button
                      onClick={async () => {
                        setSavingProgress(true);
                        try {
                          const progressDocRef = doc(db, "users", auth.currentUser!.uid, "adProgress", "mainProgress");
                          const nextCredits = progress.adCredits + 3;
                          await updateDoc(progressDocRef, {
                            adCredits: nextCredits,
                            updatedAt: new Date().toISOString()
                          });
                          setProgress(prev => ({ ...prev, adCredits: nextCredits }));
                          addToast("Free 3-Day Ad Placement Token granted! Build your placement campaign now.", "success");
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setSavingProgress(false);
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border border-black font-black uppercase text-[10px] px-3 py-1.5 rounded shadow-[1px_1px_0_0_#000000]"
                    >
                      Redeem Token
                    </button>
                  </div>
                )}
              </div>

              {/* Individual Goals List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Task 1: Invite Founders */}
                <div className={`p-4 border-2 border-black rounded-lg ${founderMissionsComplete ? "bg-emerald-50/55" : "bg-white"} flex flex-col justify-between space-y-3`}>
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-stone-600" />
                          <h4 className="font-sans font-black text-xs text-black uppercase">1. Invite 3 Founders</h4>
                        </div>
                        <p className="text-[10px] text-stone-500 font-bold leading-tight">Share your verified invite code with other builders.</p>
                      </div>
                      {founderMissionsComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 stroke-[2.5px] shrink-0" />
                      ) : (
                        <span className="text-[9.5px] font-mono bg-amber-100 text-amber-800 border border-amber-300 rounded px-1.5 py-0.5 font-bold shrink-0">
                          {progress.invitedFounders.length}/3
                        </span>
                      )}
                    </div>
                  </div>

                  {/* High Quality Referral Code Copy Panel */}
                  <div className="bg-stone-50 border-2 border-black rounded-lg p-2.5 space-y-1.5 shadow-[1.5px_1.5px_0_0_#000000]">
                    <div className="flex justify-between items-center">
                      <span className="text-[8.5px] font-mono font-black text-stone-500 uppercase">Your Share Invite Code:</span>
                      {currentUsername && (
                        <span className="text-[9px] font-mono font-black text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1 bg-white border border-stone-300 rounded font-mono text-[11px] font-extrabold px-2 py-1.5 text-stone-800 truncate">
                        {currentUsername ? `@${currentUsername.toUpperCase()}` : "LOADING_CODE..."}
                      </div>
                      <button
                        onClick={handleCopyInviteCode}
                        className="bg-black hover:bg-stone-800 text-white border border-black font-semibold text-[10px] px-2.5 py-1.5 rounded transition uppercase flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedReferral ? "Copied! ✓" : "Copy Shared Code"}
                      </button>
                    </div>
                    <p className="text-[9px] font-semibold text-stone-500 leading-tight">
                      When a new founder enters your username code during onboarding, you both get connected securely!
                    </p>
                  </div>

                  {/* Sandboxed Simulation tool */}
                  <div className="border-t border-dashed border-stone-200 pt-2.5">
                    <span className="text-[8.5px] font-mono font-black text-stone-400 uppercase tracking-widest block mb-1">
                      🧪 Local Sandboxed Invite dispatch Tool:
                    </span>
                    <form onSubmit={handleInviteFounder} className="flex items-center gap-1">
                      <input
                        type="email"
                        placeholder="testfounder@saas.com"
                        value={founderEmail}
                        onChange={(e) => setFounderEmail(e.target.value)}
                        className="flex-1 min-w-0 font-sans text-[10.5px] border border-stone-300 rounded bg-white py-1 px-1.5 tracking-tight"
                      />
                      <button 
                        type="submit"
                        disabled={savingProgress || founderMissionsComplete}
                        className="bg-[#fde047] hover:bg-black hover:text-white border border-black font-black text-[9.5px] px-2 py-1 rounded transition uppercase shrink-0 cursor-pointer"
                      >
                        {savingProgress ? "..." : "Simulate"}
                      </button>
                    </form>
                  </div>

                  {progress.invitedFounders.length > 0 && (
                    <div className="mt-2 space-y-1 bg-emerald-50/20 border border-emerald-100 p-2 rounded-lg">
                      <p className="text-[8.5px] font-mono font-black text-emerald-800 uppercase tracking-wider">Verified referred founders ({progress.invitedFounders.length}):</p>
                      <div className="max-h-[80px] overflow-y-auto space-y-1 pr-1">
                        {progress.invitedFounders.map((f, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[9px] font-semibold text-stone-600 truncate border-b border-stone-100 pb-0.5">
                            <span className="truncate">{f.email}</span>
                            <span className="text-[8px] font-mono font-bold text-stone-400">{f.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Task 2: Attendance Streak */}
                <div className={`p-4 border-2 border-black rounded-lg ${streakMissionComplete ? "bg-emerald-50/55" : "bg-white"} flex flex-col justify-between`}>
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-stone-600" />
                          <h4 className="font-sans font-black text-xs text-black uppercase">2. 3 Consecutive Days</h4>
                        </div>
                        <p className="text-[10px] text-stone-500 font-bold">Come to our platform for straight 3 days.</p>
                      </div>
                      {streakMissionComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 stroke-[2.5px] shrink-0" />
                      ) : (
                        <span className="text-[9px] font-mono bg-amber-100 text-amber-800 border border-amber-300 rounded px-1.5 py-0.5 font-bold shrink-0">
                          Day {progress.streakDays}/3
                        </span>
                      )}
                    </div>

                    {/* Streak bar layout */}
                    <div className="flex items-center gap-1 border border-black bg-stone-100 p-1.5 rounded">
                      {[1, 2, 3].map((day) => (
                        <div 
                          key={day} 
                          className={`flex-1 text-center py-0.5 text-[9px] font-mono border rounded ${
                            progress.streakDays >= day 
                              ? "bg-amber-400 border-black text-black font-black" 
                              : "bg-white border-stone-300 text-stone-400 font-bold"
                          }`}
                        >
                          Day {day} {progress.streakDays >= day ? "✓" : ""}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSimulateCheckIn}
                    disabled={savingProgress || streakMissionComplete}
                    className="mt-3 w-full bg-stone-150 hover:bg-black hover:text-white border border-black font-black text-[10px] py-1 rounded transition uppercase"
                  >
                    Simulate Daily Check-In
                  </button>
                </div>

                {/* Task 3: Forums Posts */}
                <div className={`p-4 border-2 border-black rounded-lg ${postsMissionComplete ? "bg-emerald-50/55" : "bg-white"} flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-stone-600" />
                          <h4 className="font-sans font-black text-xs text-black uppercase">3. Post in Community</h4>
                        </div>
                        <p className="text-[10px] text-stone-500 font-bold">Publish at least 5 posts in the hub.</p>
                      </div>
                      {postsMissionComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 stroke-[2.5px] shrink-0" />
                      ) : (
                        <span className="text-[9px] font-mono bg-amber-100 text-amber-800 border border-amber-300 rounded px-1.5 py-0.5 font-bold shrink-0">
                          {progress.postsCount}/5
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-semibold text-stone-500 mt-2">
                      💡 Real community postings are crawled automatically from database match records!
                    </p>
                  </div>

                  <button
                    onClick={() => setView("community")}
                    className="mt-3 w-full bg-stone-100 hover:bg-[#86efac] border border-black font-black text-[10px] py-1 rounded transition uppercase flex items-center justify-center gap-1"
                  >
                    <span>Go to Community Hub</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

                {/* Task 4: forum comments */}
                <div className={`p-4 border-2 border-black rounded-lg ${commentsMissionComplete ? "bg-emerald-50/55" : "bg-white"} flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4 text-stone-600" />
                          <h4 className="font-sans font-black text-xs text-black uppercase">4. Reply to Comments</h4>
                        </div>
                        <p className="text-[10px] text-stone-500 font-bold">Post at least 5 comments in threads.</p>
                      </div>
                      {commentsMissionComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 stroke-[2.5px] shrink-0" />
                      ) : (
                        <span className="text-[9px] font-mono bg-amber-100 text-amber-800 border border-amber-300 rounded px-1.5 py-0.5 font-bold shrink-0">
                          {progress.commentsCount}/5
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-semibold text-stone-500 mt-2">
                      💬 Engage with developers and leave comments inside hot topics.
                    </p>
                  </div>

                  <button
                    onClick={() => setView("community")}
                    className="mt-3 w-full bg-stone-100 hover:bg-[#86efac] border border-black font-black text-[10px] py-1 rounded transition uppercase flex items-center justify-center gap-1"
                  >
                    <span>Participate in Discussions</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

              </div>
            </div>

            {/* Social Task link Submission Box */}
            <div className="bg-white border-4 border-black p-6 rounded-xl shadow-[4px_4px_0_0_#000000] space-y-6">
              <div className="flex items-center gap-2 border-b-2 border-black pb-4">
                <Share2 className="h-5 w-5 text-indigo-600" />
                <h3 className="font-sans font-black text-lg tracking-tight text-black uppercase">
                  Social Endorsement verification
                </h3>
              </div>

              <div className="bg-indigo-50 border-2 border-indigo-400 p-4 rounded-lg space-y-3">
                <p className="text-xs font-black text-indigo-950 uppercase tracking-tight flex items-center gap-1">
                  <Award className="h-4 w-4 text-indigo-600" />
                  <span>The Task Definition (Guaranteed 3-Days Free Ad Placement):</span>
                </p>
                <blockquote className="border-l-4 border-indigo-600 pl-3 text-xs italic font-semibold text-stone-700 leading-relaxed bg-white/60 p-2.5 rounded">
                  "Publish a custom public post on <strong>X (Twitter)</strong>, <strong>LinkedIn</strong>, and <strong>Reddit subreddits</strong> praising your favorite SaaS alternative listed on the OpenAlt directory, with a link back to OpenAlt."
                </blockquote>
                <p className="text-[10px] font-semibold text-indigo-800">
                  ⚠️ It is a MUST to submit validation links to all <strong>three (3)</strong> platforms. Once posted, submit the URLs below. After human verification (within 2 hours), you will receive 3 Days placement credit!
                </p>
              </div>

              <form onSubmit={handleSubmitLinkBox} className="space-y-4">
                
                {/* Select favorite SaaS being promoted */}
                <div>
                  <label className="block text-xs font-black text-stone-800 uppercase mb-1">
                    Favorite SaaS Nominated in Posts:
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={favSaaSProjectName}
                      onChange={(e) => {
                        const targetVal = e.target.value;
                        setFavSaaSProjectName(targetVal);
                        const match = saasDirectory.find(p => p.name === targetVal);
                        if (match) {
                          setFavSaaSProjectUrl(match.url);
                        }
                      }}
                      className="flex-1 block font-sans text-xs border-2 border-black rounded bg-white py-1.5 px-2 font-semibold shadow-[2px_2px_0_0_#000000]"
                    >
                      <option value="">-- Choose SaaS Alternative --</option>
                      {saasDirectory.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} ({getDomain(p.url)})
                        </option>
                      ))}
                    </select>

                    {favSaaSProjectName && (
                      <div className="flex items-center gap-1.5 bg-stone-100 border-2 border-black py-1 px-2.5 rounded-lg shadow-[2px_2px_0_0_#000500]">
                        <img
                          src={`https://favicons.vemetric.com/${getDomain(favSaaSProjectUrl)}`}
                          alt=""
                          className="h-4.5 w-4.5 object-contain rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?sz=64&domain=${getDomain(favSaaSProjectUrl)}`;
                          }}
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[10px] font-mono font-black">{favSaaSProjectName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3 Link boxes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Twitter */}
                  <div>
                    <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">
                      X (Twitter) Link:
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://x.com/user/status/..."
                      value={xPostLink}
                      onChange={(e) => setXPostLink(e.target.value)}
                      className="w-full font-sans text-xs border border-stone-300 rounded bg-white p-2"
                    />
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">
                      LinkedIn Post URL:
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://linkedin.com/posts/..."
                      value={linkedinPostLink}
                      onChange={(e) => setLinkedinPostLink(e.target.value)}
                      className="w-full font-sans text-xs border border-stone-300 rounded bg-white p-2"
                    />
                  </div>

                  {/* Reddit */}
                  <div>
                    <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">
                      Reddit Post URL:
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://reddit.com/r/SaaS/comments/..."
                      value={redditPostLink}
                      onChange={(e) => setRedditPostLink(e.target.value)}
                      className="w-full font-sans text-xs border border-stone-300 rounded bg-white p-2"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingCampaign}
                  className="w-full bg-indigo-600 hover:bg-black text-white font-sans font-black text-xs py-3 rounded-lg border-2 border-black shadow-[3px_3px_0_0_#000000] hover:shadow-none transition uppercase tracking-wider cursor-pointer"
                >
                  {submittingCampaign ? <Loader2 className="h-4.5 w-4.5 animate-spin mx-auto" /> : "Submit Post URLs for Human Verification"}
                </button>
              </form>
            </div>

          </div>

          {/* RIGHT PANEL: Live Promotions Campaigns & Launch (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Launch Campaign promo */}
            <div className="bg-white border-4 border-black p-6 rounded-xl shadow-[4px_4px_0_0_#000000] space-y-6">
              <div className="flex items-center gap-2 border-b-2 border-black pb-4">
                <Target className="h-5 w-5 text-[#86efac]" />
                <h3 className="font-sans font-black text-lg tracking-tight text-white bg-black border-2 border-black px-2 py-0.5 rounded shadow-[2px_2px_0_0_#000000] uppercase">
                  Launch Placement Ad
                </h3>
              </div>

              <form onSubmit={handleLaunchCampaign} className="space-y-4">
                
                {/* Select from uploaded SaaS or choose custom */}
                <div>
                  <label className="block text-xs font-black text-stone-800 uppercase mb-1">
                    Select Advertised Product:
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full font-sans text-xs border-2 border-black rounded bg-white p-2 font-bold shadow-[2px_2px_0_0_#000000]"
                  >
                    <option value="custom">-- Custom Product Definition --</option>
                    {userSaaSProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({getDomain(p.url)})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProjectId === "custom" && (
                  <div className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-300">
                    <div>
                      <label className="block text-[10px] font-black text-stone-700 uppercase mb-0.5">
                        SaaS Product Name:
                      </label>
                      <input
                        type="text"
                        placeholder="Supabase alternate, Appsmith..."
                        value={customSaaSName}
                        onChange={(e) => setCustomSaaSName(e.target.value)}
                        className="w-full font-sans text-xs border border-stone-300 rounded bg-white p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-700 uppercase mb-0.5">
                        Live Destination Link URL:
                      </label>
                      <input
                        type="url"
                        placeholder="https://mycoolsaas.com"
                        value={customSaaSUrl}
                        onChange={(e) => setCustomSaaSUrl(e.target.value)}
                        className="w-full font-sans text-xs border border-stone-300 rounded bg-white p-2"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-stone-800 uppercase mb-1">
                    Brutalist Accent Ad Tagline:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="E.g. Supreme openalt alternative to Firebase and PostgreSQL. Built for lightweight setups."
                    value={customSaaSTagline}
                    onChange={(e) => setCustomSaaSTagline(e.target.value)}
                    className="w-full font-sans text-xs border-2 border-black rounded bg-white p-2 shadow-[2px_2px_0_0_#000000]"
                  />
                </div>

                {/* Ad Card Live preview */}
                <div className="space-y-1.5 border-t border-dashed border-stone-200 pt-4">
                  <p className="text-[10px] font-mono font-black text-stone-400 uppercase">Live Preview rendering:</p>
                  <div className="border-3 border-black p-4 rounded-lg bg-[#fffbec] shadow-[4px_4px_0_0_#000000] relative overflow-hidden group">
                    <span className="absolute top-2 right-2 bg-yellow-300 text-[8px] font-mono font-black border border-black rounded px-1 uppercase scale-90">
                      Promoted Alternative
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-white border border-stone-300 rounded flex items-center justify-center shrink-0">
                        {selectedProjectId !== "custom" && userSaaSProjects.find(p => p.id === selectedProjectId) ? (
                          <img
                            src={`https://favicons.vemetric.com/${getDomain(userSaaSProjects.find(p => p.id === selectedProjectId)!.url)}`}
                            alt=""
                            className="h-6 w-6 object-contain"
                            onError={(e) => {
                              const match = userSaaSProjects.find(p => p.id === selectedProjectId);
                              (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?sz=64&domain=${getDomain(match ? match.url : "example")}`;
                            }}
                            referrerPolicy="no-referrer"
                          />
                        ) : customSaaSUrl ? (
                          <img
                            src={`https://favicons.vemetric.com/${getDomain(customSaaSUrl)}`}
                            alt=""
                            className="h-6 w-6 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?sz=64&domain=${getDomain(customSaaSUrl)}`;
                            }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Globe className="h-4 w-4 text-stone-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-sans font-black text-sm text-black truncate leading-tight">
                          {selectedProjectId !== "custom" && userSaaSProjects.find(p => p.id === selectedProjectId)
                            ? userSaaSProjects.find(p => p.id === selectedProjectId)!.name
                            : customSaaSName || "SaaS Name"}
                        </h4>
                        <p className="text-[9.5px] font-mono font-black text-stone-500 leading-none mt-0.5 truncate">
                          {selectedProjectId !== "custom" && userSaaSProjects.find(p => p.id === selectedProjectId)
                            ? getDomain(userSaaSProjects.find(p => p.id === selectedProjectId)!.url)
                            : getDomain(customSaaSUrl) || "saasdomain.app"}
                        </p>
                      </div>
                    </div>
                    <p className="text-stone-800 text-[11px] font-semibold mt-2.5 leading-normal italic line-clamp-2">
                      {customSaaSTagline || "Accents the perfect pitch of your software right at the top index."}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={progress.adCredits <= 0 || submittingCampaign}
                  className="w-full bg-[#86efac] hover:bg-black hover:text-white font-sans font-black text-xs py-3 rounded-lg border-2 border-black shadow-[3px_3px_0_0_#000000] hover:shadow-none transition uppercase tracking-wider cursor-pointer disabled:bg-stone-100 disabled:text-stone-400 disabled:border-stone-300 disabled:shadow-none"
                >
                  {submittingCampaign ? <Loader2 className="h-4.5 w-4.5 animate-spin mx-auto" /> : `Spend 3-Day Token & Launch Live Ad`}
                </button>
              </form>
            </div>

            {/* Campaign Ledger List */}
            <div className="bg-white border-4 border-black p-6 rounded-xl shadow-[4px_4px_0_0_#000000] space-y-4">
              <h3 className="font-sans font-black text-lg tracking-tight text-black uppercase border-b-2 border-black pb-2">
                Active & Archive Spends
              </h3>

              {campaigns.length === 0 ? (
                <div className="text-center py-6 bg-[#fffdf5] border-2 border-dashed border-stone-300 p-4 rounded-lg">
                  <p className="text-xs font-bold text-stone-500">No ad records submitted yet. Complete quests to launch!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((camp) => (
                    <div key={camp.id} className="bg-stone-50 border-2 border-black p-4 rounded-lg space-y-3 shadow-[2px_2px_0_0_#000000] relative">
                      
                      {/* Badge status */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[8.5px] font-mono font-black border border-black rounded px-2 py-0.5 uppercase shadow-[1px_1px_0_0_#000000] ${
                          camp.status === "active" ? "bg-emerald-400 text-black" :
                          camp.status === "pending" ? "bg-amber-300 text-black animate-pulse" :
                          "bg-stone-300 text-stone-600"
                        }`}>
                          {camp.status}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-stone-400">
                          {new Date(camp.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Header details */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="h-6 w-6 rounded bg-white border border-stone-300 flex items-center justify-center">
                          <img
                            src={`https://favicons.vemetric.com/${getDomain(camp.saasUrl)}`}
                            alt=""
                            className="h-4.5 w-4.5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?sz=64&domain=${getDomain(camp.saasUrl)}`;
                            }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <h4 className="font-sans font-black text-xs text-black leading-tight flex items-center gap-1.5">
                            <span>{camp.saasName}</span>
                            <a href={camp.saasUrl} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-black">
                              <ExternalLink className="h-3 w-3 stroke-[3px]" />
                            </a>
                          </h4>
                          <p className="text-[9px] font-mono text-stone-500 font-bold">{camp.saasUrl}</p>
                        </div>
                      </div>

                      <p className="text-[10.5px] font-semibold text-stone-700 italic border-l-2 border-stone-300 pl-2 leading-relaxed">
                        "{camp.tagline}"
                      </p>

                      {/* Traffic Simulation Metrics */}
                      <div className="border-t border-stone-200 pt-2 flex items-center justify-between">
                        <div className="flex gap-4 text-[10px] font-mono">
                          <span className="font-extrabold text-stone-600 flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5 inline text-stone-500" /> Views: <strong>{camp.impressions}</strong>
                          </span>
                          <span className="font-extrabold text-stone-600 flex items-center gap-1">
                            <MousePointerClick className="h-3.5 w-3.5 inline text-stone-500" /> Clicks: <strong>{camp.clicks}</strong>
                          </span>
                        </div>
                        
                        <button
                          onClick={() => handleSimulateTraffic(camp.id)}
                          className="text-[8px] font-mono font-black border border-black bg-[#ddd6fe] hover:bg-black hover:text-white px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase"
                        >
                          Simulate Placement Link Visit
                        </button>
                      </div>

                      {camp.status === "pending" && (
                        <div className="bg-amber-50 border border-amber-300 p-2 rounded text-[9.5px] leading-relaxed text-amber-900 font-semibold space-y-1">
                          <p className="font-black uppercase tracking-wider text-amber-950">Pending platform Crawl Verification</p>
                          <p>URLs checked: X, LinkedIn, Reddit. Ad Credits released & active. Pending confirmation finishes in within 2 hours!</p>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Instant Unlock Flat-Fee Bypass Check-out Dialog Modal */}
      {showBypassModal && (
        <div id="bypass-confirm-dialog" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-black p-6 rounded-xl shadow-[8px_8px_0_0_#000000] max-w-sm w-full space-y-6">
            <div className="flex items-center gap-2 border-b-2 border-black pb-3">
              <DollarSign className="h-6 w-6 text-emerald-600 font-black border-2 border-black rounded bg-emerald-50 shadow-[1.5px_1.5px_0_0_#000]" />
              <div>
                <h3 className="font-sans font-black text-base text-black uppercase">
                  Bypass Tasks Instantly
                </h3>
                <p className="text-[10px] font-mono text-stone-400 font-bold">Fast-Track Ad Tokens</p>
              </div>
            </div>

            <p className="font-sans text-xs text-stone-600 leading-relaxed font-semibold">
              Bypass the social endorsement, user invitations, consecutive login check-ins, and forum tasks immediately for a small flat fee.
            </p>

            <div className="bg-amber-50 border-2 border-dashed border-amber-300 p-3 rounded-lg text-center space-y-1">
              <p className="text-[10px] font-mono font-black text-amber-800 uppercase">Single Reasonable Investment</p>
              <p className="text-2xl font-sans font-black text-black">$15.00 <span className="text-xs font-medium text-stone-500">Flat Fee</span></p>
              <p className="text-[9px] text-stone-500 font-bold">Includes 3 Days Premium Sponsored Alternative Top-Placement</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleBypassFeePayment}
                disabled={processingPayment}
                className="w-full bg-[#86efac] hover:bg-black hover:text-white font-sans font-black text-xs py-3 rounded-lg border-2 border-black shadow-[3px_3px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase tracking-wider cursor-pointer"
              >
                {processingPayment ? <Loader2 className="h-4.5 w-4.5 animate-spin mx-auto" /> : "Authorize and Sync Payment ($15.00)"}
              </button>
              <button
                onClick={() => setShowBypassModal(false)}
                disabled={processingPayment}
                className="w-full bg-stone-100 hover:bg-stone-250 font-sans font-black text-xs py-2 rounded-lg border border-stone-300 transition-all uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
