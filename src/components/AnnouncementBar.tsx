import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";
import { Zap, Trophy, Rocket, Megaphone } from "lucide-react";

export interface ActivityEvent {
  id?: string;
  type: "submission" | "upgrade" | "battle";
  message: string;
  linkText: string;
  link: string;
  createdAt: any;
}

export default function AnnouncementBar() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "activities"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: ActivityEvent[] = [];
      snapshot.forEach((doc) => {
        loaded.push({ id: doc.id, ...doc.data() } as ActivityEvent);
      });
      setActivities(loaded);
    });

    return () => unsubscribe();
  }, []);

  if (activities.length === 0) {
    return (
      <div className="w-full bg-stone-900 border-b-2 border-black py-1.5 overflow-hidden flex items-center justify-center">
        <p className="text-xs font-sans font-black uppercase text-stone-300 tracking-wide">
          <span className="text-orange-500 mr-2">⚡</span>
          Post a SaaS, launch a comparison battle, or upgrade to a Pro tier to appear here and get more impressions!
        </p>
      </div>
    );
  }

  // Pick the latest activity or rotate through them
  // For simplicity and immediate impact, we just display the absolute latest one right now.
  const latest = activities[0];

  const getIcon = (type: string) => {
    if (type === "submission") return <Rocket className="h-3.5 w-3.5 text-blue-400" />;
    if (type === "upgrade") return <Trophy className="h-3.5 w-3.5 text-amber-400" />;
    if (type === "battle") return <Zap className="h-3.5 w-3.5 text-orange-400" />;
    return <Megaphone className="h-3.5 w-3.5 text-stone-300" />;
  };

  return (
    <div className="w-full bg-stone-900 border-b-2 border-black py-1.5 overflow-hidden flex items-center justify-center group hover:bg-black transition-colors cursor-pointer" onClick={() => window.location.href = latest.link}>
      <div className="flex items-center gap-2 text-xs font-sans font-bold text-stone-200 uppercase tracking-wide px-4">
        <span className="animate-pulse">{getIcon(latest.type)}</span>
        <span className="opacity-90">{latest.message}</span>
        <span className="text-blue-400 group-hover:text-blue-300 group-hover:underline underline-offset-2 ml-1">
          {latest.linkText}
        </span>
      </div>
    </div>
  );
}
