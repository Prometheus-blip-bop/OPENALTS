import React, { useState } from "react";
import { 
  PlusCircle, 
  Sparkles, 
  CheckCircle, 
  Loader, 
  AlertCircle, 
  HelpCircle,
  Tag,
  Link2,
  BookOpen,
  ArrowRight
} from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { logUserInteraction } from "../utils/logger";
import { Project } from "../types";

interface SubmitProjectProps {
  onLogin: () => void;
  setView: (view: any) => void;
  onConsumeCredits?: (feature: "submit") => Promise<boolean>;
}

export default function SubmitProject({ onLogin, setView, onConsumeCredits }: SubmitProjectProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"saas" | "open-source">("saas");
  const [language, setLanguage] = useState("TypeScript");
  const [license, setLicense] = useState("MIT");
  const [tags, setTags] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const programmingLanguages = [
    "TypeScript", "JavaScript", "Go", "Rust", "Python", 
    "Elixir", "Clojure", "Ruby", "Swift", "C++", 
    "C#", "PHP", "Kotlin", "Java"
  ];

  const licenseTypes = [
    "MIT", "Apache-2.0", "AGPL-3.0", "GPL-3.0", "BSD-3-Clause", 
    "Sustainable-Use", "Proprietary", "Free-Trial", "Freemium"
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) {
      onLogin();
      return;
    }

    if (!name.trim() || !url.trim() || !description.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    setError("");
    setIsLoading(true);
    setSuccess(false);

    if (onConsumeCredits) {
      const permitted = await onConsumeCredits("submit");
      if (!permitted) {
        setIsLoading(false);
        return;
      }
    }

    const projectId = "proj_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const path = `projects/${projectId}`;

    try {
      const formattedTags = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      // Add default SaaS classification tags for easier filtering on discovery list
      if (type === "saas") {
        formattedTags.unshift("indie-saas");
      } else {
        formattedTags.unshift("open-source-repo");
      }

      const projectDoc: Project = {
        id: projectId,
        name: name.trim(),
        description: description.trim(),
        url: url.trim(),
        tags: formattedTags.slice(0, 15), // Safe size
        language,
        stars: 0,
        forks: 0,
        license,
        type,
        submitterId: auth.currentUser.uid,
        submitterName: auth.currentUser.displayName || "Indie Builder",
        rating: 5.0,
        ratingCount: 1, // Start with 1 default self-rating of 5 stars
        upvotes: 1, // Start with creator's default 1 upvote
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. Save Project directly to firestore
      await setDoc(doc(db, "projects", projectId), {
        ...projectDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Automatically generate creator's starting self upvote association record
      await setDoc(doc(collection(db, `projects/${projectId}/likes`), auth.currentUser.uid), {
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
      setName("");
      setUrl("");
      setDescription("");
      setTags("");

      // 3. Durable audit logger interaction
      await logUserInteraction("submit_project", { projectId, name: projectDoc.name });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 font-sans text-xs">
      {/* Intro visual banner card */}
      <div className="bg-[#ddd6fe] border-4 border-black p-6 md:p-8 rounded-2xl shadow-[6px_6px_0_0_#000000] relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-white opacity-25 rounded-full border-4 border-black translate-x-8 -translate-y-8 pointer-events-none" />
        <h2 className="text-2xl font-sans font-black tracking-tight text-black mb-1 flex items-center gap-1.5 leading-none">
          <Sparkles className="h-6 w-6 text-black fill-yellow-300 stroke-[2.5px]" />
          SHOWCASE YOUR SAAS PRODUCT
        </h2>
        <div className="flex flex-wrap gap-2 mb-3 mt-1.5">
          <span className="bg-amber-100 text-amber-800 border-2 border-black font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000000]">
            ⚡ Costs 15 AI Credits
          </span>
          <span className="bg-emerald-100 text-emerald-800 border-2 border-black font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000000]">
            🎁 First 2 listings FREE!
          </span>
        </div>
        <p className="text-stone-800 font-bold leading-relaxed max-w-xl">
          List your personal SaaS app, indie projects, or unique code repositories. OpenAlt helps you get immediately discovered by thousands of developers inspecting alternative tools.
        </p>
      </div>

      <div className="bg-white border-4 border-black p-6 md:p-8 rounded-2xl shadow-[6px_6px_0_0_#000000]">
        {success ? (
          <div className="py-12 text-center space-y-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#86efac] border-3 border-black mx-auto shadow-[3px_3px_0_0_#000000] pointer-events-none">
              <CheckCircle className="h-7 w-7 text-black stroke-[3px] animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-sans font-black text-black">Product Successfully Registered!</h3>
              <p className="text-stone-700 font-bold leading-relaxed max-w-sm mx-auto font-sans">
                Your alternative has been indexed into the OpenAlt discovery dataset and is immediately browsable!
              </p>
            </div>
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3 font-mono">
              <button
                onClick={() => setSuccess(false)}
                className="w-full sm:w-auto rounded-xl border-2 border-black bg-white hover:bg-stone-50 px-5 py-3 font-black text-black uppercase shadow-[2.5px_2.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                Submit another project
              </button>
              <button
                id="btn-go-discovery"
                onClick={() => setView("discover")}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-[#ddd6fe] hover:bg-[#c084fc] font-black text-black px-5 py-3 border-2 border-black uppercase shadow-[2.5px_2.5px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3.5px_3.5px_0_0_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
              >
                <span>Browse Discovery Feed</span>
                <ArrowRight className="h-4 w-4 text-black stroke-[2.5px]" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div>
                <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-2">
                  Project or SaaS Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. TailwindGen or MailCore"
                  className="w-full bg-white border-2 border-black focus:outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] rounded-lg px-3.5 py-3.5 text-xs text-black font-black shadow-[2px_2px_0_0_#000000] focus:shadow-[3px_3px_0_0_#000000] transition-all placeholder-stone-400"
                />
              </div>

              {/* Product Direct Link */}
              <div>
                <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Link2 className="h-4 w-4 text-black stroke-[2.5px]" />
                  Live URL or GitHub Repository Link *
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/myusername/my-repo"
                  className="w-full bg-white border-2 border-black focus:outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] rounded-lg px-3.5 py-3.5 text-xs text-black font-bold shadow-[2px_2px_0_0_#000000] focus:shadow-[3px_3px_0_0_#000000] transition-all placeholder-stone-400"
                />
              </div>

              {/* Classification Type Tier */}
              <div>
                <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-2">
                  Product Discovery Category *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setType("saas")}
                    className={`rounded-lg border-2 border-black p-3.5 font-black uppercase text-xs transition-all pointer-events-auto cursor-pointer ${
                      type === "saas"
                        ? "bg-[#fed7aa] text-black border-3"
                        : "bg-white text-stone-700 hover:bg-stone-50 shadow-[2px_2px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    }`}
                  >
                    🚀 Indie SaaS
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("open-source")}
                    className={`rounded-lg border-2 border-black p-3.5 font-black uppercase text-xs transition-all pointer-events-auto cursor-pointer ${
                      type === "open-source"
                        ? "bg-[#86efac] text-black border-3"
                        : "bg-white text-stone-700 hover:bg-stone-50 shadow-[2px_2px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    }`}
                  >
                    🛠️ Open Source
                  </button>
                </div>
              </div>

              {/* Tech stack Lang */}
              <div>
                <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-2 flex items-center gap-1">
                  <BookOpen className="h-4 w-4 text-black stroke-[2px]" />
                  Primary Ecosystem/Language *
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-white border-2 border-black rounded-lg px-3.5 py-3.5 font-black text-black focus:outline-none"
                >
                  {programmingLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* License selection */}
              <div>
                <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-2">
                  Pricing Terms or Code License *
                </label>
                <select
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  className="w-full bg-white border-2 border-black rounded-lg px-3.5 py-3.5 font-black text-black focus:outline-none"
                >
                  {licenseTypes.map((lic) => (
                    <option key={lic} value={lic}>
                      {lic}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags Comma separated list */}
              <div>
                <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Tag className="h-4 w-4 text-black stroke-[2px]" />
                  Feature tags (Comma separated list)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. database, calendly-alternative, nextjs, docker"
                  className="w-full bg-white border-2 border-black focus:outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] rounded-lg px-3.5 py-3.5 text-xs text-black font-bold shadow-[2px_2px_0_0_#000000] focus:shadow-[3px_3px_0_0_#000000] transition-all placeholder-stone-400"
                />
              </div>
            </div>

            {/* Description Text block */}
            <div>
              <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-2">
                Detailed Product Description *
              </label>
              <textarea
                rows={5}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Give a rich 3-4 sentence detailed overview describing what your technology does, what it competes against, and its key features."
                className="w-full bg-white border-2 border-black focus:outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] rounded-lg px-4 py-3.5 text-xs text-black font-bold shadow-[2px_2px_0_0_#000000] focus:shadow-[3px_3px_0_0_#000000] transition-all placeholder-stone-400"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-black bg-[#fbcfe8] p-4 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000000] font-sans font-bold">
                <AlertCircle className="h-4 w-4 shrink-0 text-black stroke-[2.5px] mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                id="btn-saas-submit"
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 rounded-xl bg-[#fde047] text-black font-black border-3 border-black px-6 py-3.5 text-xs uppercase shadow-[4px_4px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0_0_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer h-12"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin text-black stroke-[3px]" />
                    <span>Indexing candidate...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 text-black stroke-[2.5px]" />
                    <span>Publish My Alternative</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
