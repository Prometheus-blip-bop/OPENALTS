import React, { useState, useEffect } from "react";
import { 
  Trash2, 
  ExternalLink, 
  Globe, 
  Tag, 
  AlertCircle,
  Loader2, 
  PlusCircle, 
  CheckCircle, 
  Sparkles,
  Award,
  Star
} from "lucide-react";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { Project } from "../types";

interface MySaaSPageProps {
  onLogin: () => void;
  setView: (view: any) => void;
  addToast: (message: string, type?: "success" | "info" | "warning") => void;
}

export default function MySaaSPage({ onLogin, setView, addToast }: MySaaSPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadUserProjects() {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, "projects"),
        where("submitterId", "==", auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const list: Project[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Project);
      });
      // Sort newest first
      list.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setProjects(list);
    } catch (error) {
      console.error("Failed to load user projects:", error);
      addToast("Failed to fetch your projects list.", "warning");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUserProjects();
  }, []);

  const handleDeleteProject = async (projectId: string) => {
    setDeletingId(projectId);
    try {
      await deleteDoc(doc(db, "projects", projectId));
      addToast("SaaS project permanently deleted globally for everyone! ⚡", "success");
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error("Failed to delete project:", err);
      addToast(err.message || "Failed to delete project completely from database.", "warning");
    } finally {
      setDeletingId(null);
    }
  };

  if (!auth.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border-4 border-dashed border-black rounded-2xl p-8 bg-white max-w-xl mx-auto space-y-5 text-center mt-8">
        <AlertCircle className="h-16 w-16 text-yellow-500 animate-pulse stroke-[2.5px]" />
        <h2 className="text-xl font-black text-black uppercase tracking-tight">Access Locked</h2>
        <p className="text-xs text-stone-650 font-bold leading-relaxed max-w-md">
          Please connect your builder token/profile to view, audit, promote, and globally delete your uploaded SaaS projects.
        </p>
        <button
          onClick={onLogin}
          className="px-6 py-2.5 bg-[#fde047] hover:bg-yellow-400 text-black border-2 border-black rounded-lg text-xs font-black uppercase shadow-[3px_3px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
        >
          Authenticate Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header Flare banner */}
      <div className="bg-[#ccdffd] p-6 md:p-8 border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-blue-100 opacity-40 rounded-full border-4 border-dashed border-black translate-x-12 -translate-y-12 pointer-events-none" />
        <h1 className="text-3xl font-black text-black tracking-tight flex items-center gap-2">
          <Globe className="h-8 w-8 text-black" />
          My SaaS Projects Hub
        </h1>
        <p className="text-sm text-stone-850 font-bold max-w-xl leading-relaxed">
          Audit, manage, and distribute products you own on OpenAlt. You have total authority to retract, delete, and erase your SaaS globally.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 font-mono text-xs font-black text-stone-500 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#000000]">
          <Loader2 className="h-10 w-10 animate-spin text-black" />
          <span>SYNCHRONIZING USER DATABASE LOGS...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border-4 border-black p-10 text-center rounded-2xl shadow-[5px_5px_0_0_#000000] space-y-5 max-w-2xl mx-auto">
          <div className="flex justify-center">
            <PlusCircle className="h-16 w-16 text-stone-300 stroke-[1.5px]" />
          </div>
          <h2 className="text-lg font-black text-black uppercase tracking-tight">No Uploaded SaaS Found</h2>
          <p className="text-xs text-stone-600 font-bold leading-normal max-w-md mx-auto">
            You haven't listed any of your custom SaaS alternatives on OpenAlt yet. Add your project and get target intersections now!
          </p>
          <button
            onClick={() => setView("submit")}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#86efac] hover:bg-green-400 text-black border-2 border-black rounded-lg text-xs font-black uppercase shadow-[3px_3px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            Submit First SaaS Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((proj) => {
            const dateStr = proj.createdAt 
              ? new Date(proj.createdAt).toLocaleDateString()
              : "Ongoing";

            return (
              <div
                key={proj.id}
                className="bg-white border-4 border-black rounded-2xl p-5 shadow-[5px_5px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0_0_#000000] transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="bg-[#ddd6fe] text-black border border-black px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider">
                      {proj.type === "saas" ? "SaaS Product" : "Open Source Alternative"}
                    </span>
                    <span className="text-[10px] font-mono font-extrabold text-stone-500">
                      Listed: {dateStr}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-black leading-none">
                    {proj.name}
                  </h3>
                  
                  <p className="text-xs text-stone-650 font-bold leading-relaxed">
                    {proj.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {proj.tags.slice(0, 5).map((t) => (
                      <span
                        key={t}
                        className="bg-stone-100 border border-black text-[#5b21b6] text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 border border-black p-2 rounded-lg bg-stone-50 font-mono text-[10px] text-stone-600 font-extrabold">
                    <div>
                      <p className="text-stone-400">Upvotes</p>
                      <p className="text-xs text-black font-black">{proj.upvotes || 0}</p>
                    </div>
                    <div>
                      <p className="text-stone-400">License</p>
                      <p className="text-xs text-black font-black truncate">{proj.license || "Proprietary"}</p>
                    </div>
                    <div>
                      <p className="text-stone-400">Rating</p>
                      <p className="text-xs text-black font-black">⭐ {(proj.rating || 5.0).toFixed(1)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-dashed border-stone-200">
                  <a
                    href={proj.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] font-mono font-black text-blue-700 hover:underline"
                  >
                    LAUNCH LINK <ExternalLink className="h-3 w-3 stroke-[3px]" />
                  </a>

                  {deleteConfirmId === proj.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2.5 py-1.5 bg-stone-100 border-2 border-black rounded-lg text-[9px] font-black uppercase hover:bg-stone-200 cursor-pointer active:scale-95 transition"
                      >
                        Keep It
                      </button>
                      <button
                        onClick={() => handleDeleteProject(proj.id)}
                        disabled={deletingId === proj.id}
                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white border-2 border-black rounded-lg text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer active:scale-95 transition disabled:opacity-40"
                      >
                        {deletingId === proj.id ? "Erasing..." : "Confirm Delete"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(proj.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-900 border-2 border-black rounded-lg text-[9px] font-black uppercase cursor-pointer transition active:scale-95 duration-100"
                    >
                      <Trash2 className="h-3 w-3" />
                      Global Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
