import React, { useState, useEffect } from "react";
import { 
  Check, 
  HelpCircle, 
  DollarSign, 
  Sparkles, 
  Shield, 
  Zap, 
  Flame,
  CreditCard,
  Users
} from "lucide-react";
import { API_BASE_URL } from "../config";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { logUserInteraction } from "../utils/logger";
import confetti from "canvas-confetti";
import PaymentHistory from "./PaymentHistory";

interface PricingPageProps {
  onLogin: () => void;
  addToast: (message: string, type?: "success" | "info" | "warning") => void;
  triggerProDirectly?: boolean;
  onClearTriggerProDirectly?: () => void;
}

// Dynamically load Razorpay standard scripts
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}



// Custom and highly beautiful multi-tier confetti celebrations
export function triggerPremiumConfetti(planId: string) {
  if (planId === "test_1rs") {
    // Elegant, bright emerald and mint green shower (Clean & lightweight for live testing gate)
    confetti({
      particleCount: 130,
      spread: 60,
      origin: { y: 0.65 },
      colors: ["#10b981", "#34d399", "#a7f3d0", "#ffffff"],
    });
  } else if (planId === "starter") {
    // Dynamic sky blue & cyan double side-cannons for Alt Starter builders
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.75 },
      colors: ["#0ea5e9", "#38bdf8", "#bae6fd", "#ffffff", "#0284c7"]
    });
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.75 },
      colors: ["#0ea5e9", "#38bdf8", "#bae6fd", "#ffffff", "#0284c7"]
    });
  } else if (planId === "pro") {
    // Explosive orange, gold and warm peach firework blossoms from both sides (Upgraded Pro Sparkler)
    const duration = 3.0 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 8,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.75 },
        colors: ["#f97316", "#fb923c", "#fed7aa", "#ffedd5", "#fbbf24", "#ea580c"],
      });
      confetti({
        particleCount: 8,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.75 },
        colors: ["#f97316", "#fb923c", "#fed7aa", "#ffedd5", "#fbbf24", "#ea580c"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  } else if (planId === "enterprise") {
    // Royal cosmic purple, glowing magenta, shimmer-gold, and electric blue fireworks bursts (Premium Enterprise Sparklers)
    const duration = 5.0 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 38, spread: 360, ticks: 70, zIndex: 9999, scalar: 1.15 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 70 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.12, 0.42), y: Math.random() - 0.2 },
        colors: ["#7c3aed", "#c084fc", "#ec4899", "#fbcfe8", "#2563eb", "#fbbf24"]
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.58, 0.88), y: Math.random() - 0.2 },
        colors: ["#7c3aed", "#c084fc", "#db2777", "#60a5fa", "#f59e0b", "#ffffff"]
      });
    }, 220);
  } else {
    // Fallback standard high energy confetti
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.55 },
      colors: ["#2563eb", "#3b82f6", "#60a5fa", "#f59e0b", "#10b981"]
    });
  }
}

export default function PricingPage({ 
  onLogin, 
  addToast, 
  triggerProDirectly, 
  onClearTriggerProDirectly 
}: PricingPageProps) {
  const [isAnnual, setIsAnnual] = useState(true);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [showPaymentChoiceModal, setShowPaymentChoiceModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [chosenMethod, setChosenMethod] = useState<"razorpay_upi" | "razorpay_card">("razorpay_upi");
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [celebratedPlan, setCelebratedPlan] = useState<any>(null);
  const [activeTier, setActiveTier] = useState<string>("free");

  // Automatically trigger Alt Pro checkout options if requested directly via credits exhaustion
  useEffect(() => {
    if (triggerProDirectly) {
      const proPlan = plans.find(p => p.id === "pro");
      if (proPlan) {
        setSelectedPlan(proPlan);
        setShowPaymentChoiceModal(true);
        if (onClearTriggerProDirectly) {
          onClearTriggerProDirectly();
        }
      }
    }
  }, [triggerProDirectly, onClearTriggerProDirectly]);

  // Load and listen to the current user's profile database node in real-time
  useEffect(() => {
    if (!auth.currentUser) {
      setActiveTier("free");
      return;
    }
    const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActiveTier(data.tier || "free");
      }
    }, (err) => {
      console.warn("Could not fetch user's live tier in PricingPage:", err);
    });
    return () => unsub();
  }, [auth.currentUser]);

  const plans = [
    {
      id: "free",
      name: "Free Hobbyist",
      description: "Perfect for builders finding open-source SaaS alternatives.",
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        "🎁 30 Active AI Credits balance",
        "Compare up to 3 options simultaneously",
        "2 Free SaaS showcase submissions",
        "Standard Community Hub posting",
        "Browse Open Source Market"
      ],
      cta: "Current Free Tier",
      popular: false,
      color: "bg-white",
      btnColor: "bg-stone-50 hover:bg-stone-100 font-bold"
    },
    {
      id: "test_1rs",
      name: "₹1 Live Tester Gate",
      description: "Quick ₹1 sandbox billing verification. Perfect for checking live integration.",
      monthlyPrice: 0.012,
      annualPrice: 0.012,
      features: [
        "🎁 50 Active AI Credits balance",
        "Durable ⚡ Tester Badge displayed everywhere",
        "Verify standard UPI, Cards, and Netbanking",
        "Instant live production status check"
      ],
      cta: "Verify Live with ₹1",
      popular: false,
      color: "bg-emerald-50 border-emerald-500",
      btnColor: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-[2px_2px_0_0_#000000]"
    },
    {
      id: "starter",
      name: "Alt Starter",
      description: "Low-friction starter tier. Best value to convert builders instantly!",
      monthlyPrice: 5,
      annualPrice: 3.5,
      features: [
        "🎁 150 Active AI Credits balance",
        "Verified Starter Developer badge",
        "Priority project queue listings",
        "Create polls & vote in Community Hub",
        "AI sandbox chat support"
      ],
      cta: "Upgrade to Alt Starter",
      popular: true,
      color: "bg-sky-50 border-sky-400",
      btnColor: "bg-sky-500 text-white hover:bg-sky-600 shadow-[2px_2px_0_0_#000000]"
    },
    {
      id: "pro",
      name: "Alt Pro",
      description: "For teams and serious builders scaling alternative software products.",
      monthlyPrice: 19,
      annualPrice: 14,
      features: [
        "🎁 800 Active AI Credits balance",
        "Priority project queue listings",
        "Deep AI smart comparison breakdown",
        "Unlock voting & create polls in Community",
        "Up to 20 cross-comparisons instantly",
        "Verified Professional Developer badge"
      ],
      cta: "Upgrade to Alt Pro",
      popular: false,
      color: "bg-[#fed7aa] border-[#f97316]",
      btnColor: "bg-[#f97316] text-white hover:bg-orange-600 shadow-[2px_2px_0_0_#000000]"
    },
    {
      id: "enterprise",
      name: "Product Scale",
      description: "Dedicated resources for large integrations, migration suites, and agencies.",
      monthlyPrice: 49,
      annualPrice: 39,
      features: [
        "🎁 2,500 Active AI Credits balance",
        "Unlimited search & crawler access",
        "Custom private tech stack audit suite",
        "Dedicated account technical lead",
        "Early beta access to automated migrations",
        "Custom contract agreements & SLA logs"
      ],
      cta: "Acquire Scale Tier",
      popular: false,
      color: "bg-[#ddd6fe] border-[#7c3aed]",
      btnColor: "bg-[#7c3aed] text-white hover:bg-indigo-700 shadow-[2px_2px_0_0_#000000]"
    }
  ];

  const handleCheckoutInit = async (plan: typeof plans[0]) => {
    if (!auth.currentUser) {
      addToast?.("Please connect your profile to upgrade plans!", "warning");
      onLogin();
      return;
    }

    if (plan.id === "free") {
      addToast?.("You are already on the current free plan", "info");
      return;
    }

    setSelectedPlan(plan);
    setShowPaymentChoiceModal(true);
  };



  const executePayment = async () => {
    if (!selectedPlan) return;
    const plan = selectedPlan;

    setShowPaymentChoiceModal(false);

    setLoadingTier(plan.id);

    const isUpi = chosenMethod === "razorpay_upi";
    
    let finalCurrency = isUpi ? "INR" : "USD";
    let finalPrice = 0;
    if (plan.id === "test_1rs") {
      finalCurrency = "INR";
      finalPrice = 1;
    } else {
      const usdPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
      finalPrice = isUpi ? Math.round(usdPrice * 84) : usdPrice;
    }
    const amountInSubunits = finalPrice * 100; // paise or cents

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        addToast?.("Failed to load Razorpay payment SDK.", "warning");
        setLoadingTier(null);
        return;
      }

      addToast?.(`Initiating checkout of ${finalCurrency} ${finalPrice}...`, "info");

      // 2. Call backend to create order (convert amount to paise/cents) using window.location.origin to prevent iframe sandbox domain errors
      const orderRes = await fetch(`${API_BASE_URL}/api/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: amountInSubunits,
          currency: finalCurrency,
          receipt: `rcpt_${Date.now()}_${plan.id}`
        })
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        const detailMsg = typeof errData.details === 'object' ? JSON.stringify(errData.details) : errData.details;
        const errMsg = detailMsg ? `${errData.error}: ${detailMsg}` : (errData.error || "Failed to create order on server");
        throw new Error(errMsg);
      }

      const orderData = await orderRes.json();
      const orderId = orderData.order_id;

      const razorpayKey = orderData.key_id || (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || "rzp_test_T1NgP63GLTYlc9";

      // 3. Open Razorpay checkout overlay with tailored payment options
      const options: any = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "OpenAlt Platform",
        description: `Upgrade to ${plan.name} (${isAnnual ? "Annual" : "Monthly"})`,
        image: "https://api.dicebear.com/7.x/identicon/svg?seed=openalt",
        order_id: orderId,
        prefill: {
          email: auth.currentUser?.email || "",
          contact: ""
        },
        theme: {
          color: "#7c3aed"
        },
        handler: async function (response: any) {
          setLoadingTier(plan.id);
          try {
            // Use window.location.origin for absolute resolution to prevent CORS errors during Razorpay modal success callbacks
            const verifyRes = await fetch(`${API_BASE_URL}/api/verify-payment`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (!verifyRes.ok) {
              const verifyErr = await verifyRes.json();
              throw new Error(verifyErr.error || "Signature validation failed");
            }

            // Save new premium Tier status inside user profile node with transactional verification metadata
            if (auth.currentUser) {
              const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
              const creditsMap: Record<string, number> = {
                free: 30,
                test_1rs: 50,
                starter: 150,
                pro: 800,
                enterprise: 2500
              };
              await updateDoc(doc(db, "users", auth.currentUser.uid), {
                tier: plan.id,
                subscriptionStatus: "active",
                credits: creditsMap[plan.id] !== undefined ? creditsMap[plan.id] : 30,
                updatedAt: serverTimestamp(),
                razorpayOrderId: response.razorpay_order_id || "",
                razorpayPaymentId: response.razorpay_payment_id || "",
                razorpaySignature: response.razorpay_signature || ""
              });
            }

            // Fire beautiful custom multi-tier confetti celebration
            triggerPremiumConfetti(plan.id);

            setCelebratedPlan(plan);
            setShowCongratsModal(true);

            addToast?.(`Upgrade to ${plan.name} completed successfully! Welcome aboard! ⚡`, "success");
            logUserInteraction("checkout_upgrade_success", { 
              tier: plan.name, 
              pricePaid: finalPrice, 
              currency: finalCurrency,
              billingPeriod: isAnnual ? "annual" : "monthly",
              paymentId: response.razorpay_payment_id
            });
          } catch (vErr: any) {
            console.error("Verification failed:", vErr);
            addToast?.(`Payment verification failed: ${vErr.message}`, "warning");
          } finally {
            setLoadingTier(null);
          }
        },
        modal: {
          ondismiss: function () {
            addToast?.("Payment session dismissed by user.", "info");
            setLoadingTier(null);
          }
        }
      };

      if (isUpi) {
        options.prefill.method = "upi";
        options.config = {
          display: {
            blocks: {
              upi: {
                name: "UPI App Payment (GPay, PhonePe, Paytm)",
                instruments: [
                  {
                    method: "upi"
                  }
                ]
              }
            },
            sequence: [
              "block.upi"
            ],
            preferences: {
              show_default_blocks: true
            }
          }
        };
      }

      const razorpayObject = new (window as any).Razorpay(options);
      
      razorpayObject.on("payment.failed", function (response: any) {
        addToast?.(`Payment failed: ${response.error.description}`, "warning");
        setLoadingTier(null);
      });

      razorpayObject.open();
    } catch (err: any) {
      console.error("Razorpay workflow failed:", err);
      addToast?.(`Payment preparation failed: ${err.message}`, "warning");
      setLoadingTier(null);
    }
  };

  const handleInstantBypassUpgrade = async (plan: typeof plans[0]) => {
    if (!auth.currentUser) {
      addToast?.("Please connect your profile to upgrade plans!", "warning");
      onLogin();
      return;
    }
    setLoadingTier(plan.id);
    try {
      const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      const creditsMap: Record<string, number> = {
        free: 30,
        test_1rs: 50,
        starter: 150,
        pro: 800,
        enterprise: 2500
      };
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        tier: plan.id,
        subscriptionStatus: "active",
        credits: creditsMap[plan.id] !== undefined ? creditsMap[plan.id] : 30,
        updatedAt: serverTimestamp(),
        razorpayOrderId: `demo_order_${Date.now()}`,
        razorpayPaymentId: `demo_pay_${Date.now()}`,
        razorpaySignature: `demo_sig_bypassed`
      });

      triggerPremiumConfetti(plan.id);

      setCelebratedPlan(plan);
      setShowCongratsModal(true);

      addToast?.(`Instantly upgraded to ${plan.name} (Simulation Bypass Mode)! 🎉`, "success");
      logUserInteraction("checkout_upgrade_success_bypass", {
        tier: plan.name,
        pricePaid: 0,
        currency: "USD",
        billingPeriod: isAnnual ? "annual" : "monthly"
      });
    } catch (error: any) {
      console.error("Instant bypass upgrade failed:", error);
      addToast?.(`Bypass upgrade failed: ${error.message}`, "warning");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="space-y-10 font-sans">
      {/* Flare header */}
      <div className="bg-[#ddd6fe] p-6 md:p-8 border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#000000] relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-purple-200 opacity-40 rounded-full border-4 border-dashed border-black translate-x-12 -translate-y-12 pointer-events-none" />
        <h2 className="text-3xl font-black text-black tracking-tight flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-black bg-[#a7f3d0] border-2 border-black p-0.5 rounded-lg shadow-[2px_2px_0_0_#000000]" />
          Choose Your OpenAlt Tier
        </h2>
        <p className="text-sm text-stone-900 font-sans mt-2 max-w-xl font-medium">
          Whether you are exploring personal dev setups or migration paths across enterprise environments, choose the perfect support level.
        </p>
      </div>

      {/* Switch monthly / annual toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border-4 border-black p-4 rounded-xl shadow-[4px_4px_0_0_#000000]">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500 fill-yellow-400 stroke-[2.5px] animate-pulse" />
          <span className="text-xs font-black text-black uppercase font-mono">Select Billing Cycle Type</span>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-black uppercase ${!isAnnual ? "text-[#7c3aed]" : "text-stone-500"}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="w-14 h-8 bg-black rounded-full p-1 transition-all duration-300 relative focus:outline-none cursor-pointer"
          >
            <div
              className={`w-5 h-5 bg-yellow-300 border-2 border-black rounded-full transition-all duration-300 absolute top-1 ${
                isAnnual ? "left-7" : "left-1"
              }`}
            />
          </button>
          <span className={`text-[11px] font-black uppercase flex items-center gap-1.5 ${isAnnual ? "text-[#7c3aed]" : "text-stone-500"}`}>
            Annual Billing
            <span className="text-[9px] font-mono font-black text-green-600 bg-green-150 border border-green-400 px-1.5 py-0.5 rounded uppercase">
              Save ~30%
            </span>
          </span>
        </div>
      </div>

      {/* Plans comparison cards matrix - Slider/Carousel on mobile, Grid on desktop */}
      <div className="flex sm:grid overflow-x-auto sm:overflow-visible pb-8 sm:pb-0 gap-6 snap-x snap-mandatory scrollbar-none sm:grid-cols-2 lg:grid-cols-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {plans.map((plan) => {
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
          
          return (
            <div
              key={plan.id}
              className={`border-4 border-black rounded-2xl p-6 shadow-[5px_5px_0_0_#000000] flex flex-col justify-between space-y-6 relative hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[7px_7px_0_0_#000000] transition-all shrink-0 w-[285px] sm:w-auto snap-center sm:snap-none ${plan.color}`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 right-4 bg-black text-yellow-300 border-2 border-black font-mono font-black text-[9px] uppercase px-2.5 py-1 rounded shadow-[1.5px_1.5px_0_0_#ea580c] tracking-widest animate-bounce">
                  ★ MOST POPULAR
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-extrabold text-black font-sans tracking-tight">{plan.name}</h3>
                  <p className="text-xs text-stone-600 font-bold mt-1 max-w-[210px] leading-snug">{plan.description}</p>
                </div>

                {/* Simulated Pricing badge */}
                <div className="border-y-2 border-dashed border-black/20 py-3 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-black tracking-tight font-mono">
                    {plan.id === "test_1rs" ? "₹1" : `$${price}`}
                  </span>
                  <span className="text-[10px] text-stone-600 font-mono font-bold uppercase">
                    {plan.id === "test_1rs" ? "one-time test price" : `/ ${isAnnual ? "month" : "month"}`}
                  </span>
                </div>

                {/* Features Checkbox column */}
                <div className="space-y-2 pt-2">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-semibold text-black">
                      <Check className="h-4 w-4 text-green-600 shrink-0 stroke-[3px] mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {/* Action purchase button */}
                <button
                  disabled={loadingTier !== null || activeTier === plan.id}
                  onClick={() => handleCheckoutInit(plan)}
                  className={`w-full text-center border-2 border-black py-2.5 rounded-lg text-xs font-black uppercase transition-all shadow-[2px_2px_0_0_#000000] hover:translate-y-[-0.5px] cursor-pointer disabled:opacity-75 ${
                    activeTier === plan.id 
                      ? "bg-emerald-100 text-emerald-800 hover:translate-y-0 shadow-none border-dashed border-emerald-500 cursor-default" 
                      : plan.btnColor
                  }`}
                >
                  {activeTier === plan.id ? (
                    <span className="flex items-center justify-center gap-1.5 font-extrabold text-emerald-800 normal-case">
                      ✓ Current Plan (Active)
                    </span>
                  ) : loadingTier === plan.id ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Preparing...
                    </span>
                  ) : (
                    plan.cta
                  )}
                </button>

                {/* Sandbox Bypass Upgrade Button requested by user to easily test all animations/badges */}
                {plan.id !== "free" && activeTier !== plan.id && (
                  <button
                    type="button"
                    disabled={loadingTier !== null}
                    onClick={() => handleInstantBypassUpgrade(plan)}
                    className="w-full text-center border-2 border-dashed border-[#7c3aed] bg-purple-50 hover:bg-purple-100 text-[#7c3aed] font-sans py-2.5 rounded-lg text-xs font-black uppercase transition-all shadow-[2px_2px_0_0_#7c3aed] hover:translate-y-[-0.5px] cursor-pointer disabled:opacity-75 flex items-center justify-center gap-1 mt-2 hover:scale-[1.01]"
                  >
                    ⚡ Take It! (Instant Demo Upgrade)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Swipe hints visual banner for mobile viewports */}
      <div className="flex sm:hidden items-center justify-center gap-2 mb-3 mt-[-6px]">
        <span className="text-[10px] font-mono font-bold text-stone-500 flex items-center gap-1 animate-pulse">
          ← Swiping Enabled to preview other options →
        </span>
        <div className="flex gap-1.5">
          {plans.map((p) => (
            <span
              key={p.id}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                activeTier === p.id ? "bg-amber-500" : "bg-stone-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Pricing policy details comparison checklist table */}
      <div className="bg-white border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0_0_#000000] space-y-4">
        <div className="flex items-center gap-1.5 border-b border-stone-200 pb-2">
          <Shield className="h-5 w-5 text-black" />
          <h3 className="font-sans font-black text-base text-black uppercase tracking-tight">Secure Payment & Money-Back Guarantee</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-stone-700">
          <div className="space-y-1">
            <h4 className="font-sans font-black text-black">Can I cancel anytime?</h4>
            <p className="leading-relaxed">
              Yes, absolutely. Canceling will immediately cease future automated renewals. Your Alt Pro access remains valid until the final expiration date of your current billing period.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-sans font-black text-black">What payment structures are supported?</h4>
            <p className="leading-relaxed">
              We accept standard debit cards, mastercards, visa credit lines, and mobile wallets. All transactions are securely routed through our PCI-DSS compliant sandbox proxy.
            </p>
          </div>
        </div>
      </div>

      {/* Render the payment history and invoice lists */}
      <PaymentHistory />

      {/* Real Checkout Payment Method Selection Modal */}
      {showPaymentChoiceModal && selectedPlan && (
        <div id="payment-choice-modal" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black max-w-md w-full rounded-2xl p-6 shadow-[8px_8px_0_0_#000000] space-y-5 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b-2 border-dashed border-stone-200 pb-3">
              <h3 className="text-md font-black text-black uppercase tracking-tight flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-[#7c3aed]" />
                Select Payment Pathway
              </h3>
              <button
                onClick={() => setShowPaymentChoiceModal(false)}
                className="bg-stone-100 hover:bg-stone-200 border border-black rounded-lg text-xs font-black p-1 px-2.5 cursor-pointer leading-none"
              >
                ✕ Close
              </button>
            </div>

            <div className="bg-[#fef3c7] p-3 border-2 border-black rounded-xl text-black space-y-1">
              <p className="text-[10px] font-mono uppercase font-black tracking-wider text-amber-800 leading-none">Your Selection:</p>
              <h4 className="text-base font-black leading-tight">{selectedPlan.name} Tier</h4>
              <p className="text-xs font-bold text-stone-800">
                Regular price: <span className="font-extrabold">{selectedPlan.id === "test_1rs" ? "₹1 INR" : `$${isAnnual ? selectedPlan.annualPrice : selectedPlan.monthlyPrice} USD`}</span> {selectedPlan.id === "test_1rs" ? "one-time" : (isAnnual ? "/ month" : "/ month")}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-black border-l-4 border-[#7c3aed] pl-2">
                Select Checkout Pathway:
              </p>

              {/* Razorpay UPI Option */}
              <div 
                onClick={() => setChosenMethod("razorpay_upi")}
                className={`border-2 border-black p-3 rounded-xl cursor-pointer transition-all flex items-start gap-3 relative ${chosenMethod === "razorpay_upi" ? "bg-[#e0e7ff] shadow-[2px_2px_0_0_#4f46e5]" : "bg-stone-50 hover:bg-stone-100"}`}
              >
                <div className="mt-0.5">
                  <div className={`w-5 h-5 rounded-full border-2 border-black flex items-center justify-center ${chosenMethod === "razorpay_upi" ? "bg-[#4f46e5]" : "bg-white"}`}>
                    {chosenMethod === "razorpay_upi" && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-black uppercase tracking-tight flex items-center gap-1.5">
                    🚀 UPI / GPay / PhonePe (via Razorpay)
                  </p>
                  <p className="text-[11px] text-stone-600 font-medium leading-relaxed">
                    Checkout using any Indian UPI application (GPay, PhonePe, Paytm, BHIM) or scanned QR code.
                  </p>
                  <p className="text-[10px] font-black font-mono text-indigo-700">
                    Billed as: {selectedPlan.id === "test_1rs" ? "₹1 INR" : `₹${Math.round((isAnnual ? selectedPlan.annualPrice : selectedPlan.monthlyPrice) * 84)} INR`}
                  </p>
                </div>
              </div>

              {/* Razorpay Card Option */}
              <div 
                onClick={() => setChosenMethod("razorpay_card")}
                className={`border-2 border-black p-3 rounded-xl cursor-pointer transition-all flex items-start gap-3 relative ${chosenMethod === "razorpay_card" ? "bg-[#e0e7ff] shadow-[2px_2px_0_0_#4f46e5]" : "bg-stone-50 hover:bg-stone-100"}`}
              >
                <div className="mt-0.5">
                  <div className={`w-5 h-5 rounded-full border-2 border-black flex items-center justify-center ${chosenMethod === "razorpay_card" ? "bg-[#4f46e5]" : "bg-white"}`}>
                    {chosenMethod === "razorpay_card" && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-black uppercase tracking-tight">
                    💳 Global Cards (via Razorpay)
                  </p>
                  <p className="text-[11px] text-stone-600 font-medium leading-relaxed">
                    Checkout using standard international debit/credit cards (Visa, Mastercard, AMEX).
                  </p>
                  <p className="text-[10px] font-black font-mono text-indigo-700">
                    Billed as: {selectedPlan.id === "test_1rs" ? "₹1 INR" : `$${isAnnual ? selectedPlan.annualPrice : selectedPlan.monthlyPrice} USD`}
                  </p>
                </div>
              </div>



            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setShowPaymentChoiceModal(false)}
                className="w-1/3 bg-stone-100 font-black hover:bg-stone-200 border-2 border-black py-2.5 rounded-xl text-xs uppercase text-center cursor-pointer transition-all"
              >
                Back
              </button>
              <button
                onClick={executePayment}
                className="w-2/3 bg-black text-white hover:bg-[#1e1e1e] font-black border-2 border-[#1e1e1e] py-2.5 rounded-xl text-xs uppercase text-center shadow-[3px_3px_0_0_#7c3aed] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all text-ellipsis overflow-hidden font-bold"
              >
                Confirm Pathway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 Upgraded Congrats Celebratory Modal */}
      {showCongratsModal && celebratedPlan && (
        <div id="congrats-success-modal" className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black max-w-lg w-full rounded-2xl p-6 shadow-[10px_10px_0_0_#000000] space-y-6 text-black animate-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="bg-yellow-105 border-2 border-black p-3.5 rounded-full shadow-[2px_2px_0_0_#000000]">
                <Sparkles className="h-10 w-10 text-yellow-600 fill-yellow-300 stroke-[2px]" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight font-sans">
                UPGRADE SUCCESSFUL! 🎉
              </h3>
              <p className="text-xs text-stone-650 font-bold max-w-sm">
                Thank you so much for upgrading to the <span className="text-violet-700 underline font-black">{celebratedPlan.name}</span>. Your billing profile and everywhere across the platform has been instantly updated to premium!
              </p>
            </div>

            <div className="bg-[#f5f3ff] p-4 border-2 border-black rounded-xl space-y-3.5">
              <h4 className="text-xs font-mono font-black text-[#5b21b6] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#ddd6fe] pb-1.5">
                🌟 PREMIUM BENEFITS INSTANTLY UNLOCKED:
              </h4>
              <ul className="space-y-2.5 text-xs text-stone-850 font-semibold pl-1">
                {celebratedPlan.id === "test_1rs" && (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-base leading-none">⚡</span>
                      <span><strong>Premium Tester Badge:</strong> Your exclusive <code>⚡ Tester</code> badge is active and visible next to your submissions and community posts immediately!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-base leading-none">📡</span>
                      <span><strong>Verified Sandbox Gateway:</strong> Verified transaction successfully validated through the live Razorpay API system.</span>
                    </li>
                  </>
                )}
                {celebratedPlan.id === "pro" && (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-base leading-none">🔹</span>
                      <span><strong>Community Blue Tick:</strong> A verified blue badge appears beside your username automatically whenever you post or comment on the hub!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-base leading-none">⭐</span>
                      <span><strong>Pro Builder Badge:</strong> Stands out in green next to your submitted SaaS items.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-base leading-none">📊</span>
                      <span><strong>Deep AI Benchmarks:</strong> Unlocked rich automatic comparison reports using native models.</span>
                    </li>
                  </>
                )}
                {celebratedPlan.id === "enterprise" && (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-base leading-none">👑</span>
                      <span><strong>Scale Elite Badge:</strong> Displayed as the top prestige indicator across the platform.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-base leading-none">🔹</span>
                      <span><strong>Community Blue Tick:</strong> Verified Check appears next to all forum submissions.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-base leading-none">🛠️</span>
                      <span><strong>Dedicated Account Support:</strong> SLA agreements and automated code migration previews unlocked.</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div className="text-center p-3 border-2 border-dashed border-emerald-400 bg-emerald-50 rounded-xl">
              <p className="text-[11px] text-emerald-950 font-black">
                ✨ Your live Firestore profile tier has been set to "{celebratedPlan.id}". Go build some outstanding SaaS alternative pages!
              </p>
            </div>

            <button
              onClick={() => {
                setShowCongratsModal(false);
                setCelebratedPlan(null);
              }}
              className="w-full bg-[#7c3aed] text-white hover:bg-indigo-700 font-extrabold border-2 border-black py-2.5 rounded-xl text-xs uppercase text-center shadow-[4px_4px_0_0_#000000] cursor-pointer active:translate-y-0.5 transition-all"
            >
              Let's Go! ⚡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
