import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Check } from "lucide-react";

interface UserBadgeProps {
  userId: string;
  showBadge?: boolean;
  showBlueTick?: boolean;
}

export default function UserBadge({ userId, showBadge = true, showBlueTick = true }: UserBadgeProps) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!userId || userId === "system" || userId === "core_platform") return;
    const unsub = onSnapshot(doc(db, "users", userId), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    }, (err) => {
      console.warn("Could not load real-time badge for user:", userId, err);
    });
    return () => unsub();
  }, [userId]);

  if (!profile) return null;

  const tier = profile.tier;
  if (!tier || tier === "free") return null;

  return (
    <span className="inline-flex items-center gap-1 shrink-0 align-middle ml-1 select-none">
      {/* Blue Tick (Specifically for $14 Alt Pro plan or higher) */}
      {showBlueTick && (tier === "pro" || tier === "enterprise") && (
        <span 
          title="Verified Professional Developer"
          className="bg-[#2563eb] text-white rounded-full p-0.5 inline-flex items-center justify-center w-3.5 h-3.5 border border-black shadow-[0.5px_0.5px_0px_#000]"
        >
          <Check className="h-2 w-2 stroke-[4px]" />
        </span>
      )}

      {/* Specialty Badge Display */}
      {showBadge && (
        <>
          {tier === "test_1rs" && (
            <span 
              title="Verified platform feature tester"
              className="text-[8.5px] font-mono font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-500 px-1.5 py-0.2 rounded shadow-[1px_1px_0_0_#000000]"
            >
              ⚡ Tester
            </span>
          )}
          {tier === "pro" && (
            <span 
              title="Alt Pro Partner"
              className="text-[8.5px] font-mono font-black uppercase tracking-wider bg-orange-100 text-orange-850 border border-orange-500 px-1.5 py-0.2 rounded shadow-[1px_1px_0_0_#000000]"
            >
              ⭐ Pro
            </span>
          )}
          {tier === "enterprise" && (
            <span 
              title="Product Scale Elite"
              className="text-[8.5px] font-mono font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-500 px-1.5 py-0.2 rounded shadow-[1px_1px_0_0_#000000]"
            >
              👑 Scale Elite
            </span>
          )}
        </>
      )}
    </span>
  );
}
