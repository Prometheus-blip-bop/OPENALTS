import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Star, 
  GitFork, 
  Users, 
  BookOpen, 
  Shield, 
  ExternalLink, 
  ThumbsUp, 
  Bookmark, 
  Send, 
  Loader, 
  Share2, 
  Terminal, 
  Copy, 
  Check,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Award,
  CircleAlert
} from "lucide-react";
import Markdown from "react-markdown";
import UserBadge from "./UserBadge";
import { Project, ProjectComment } from "../types";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  increment, 
  getDoc,
  query,
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { logUserInteraction } from "../utils/logger";

interface ProjectDetailPageProps {
  project: Project;
  onBack: () => void;
  onLogin: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (project: Project) => void;
}

export default function ProjectDetailPage({
  project,
  onBack,
  onLogin,
  isBookmarked,
  onToggleBookmark,
}: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState<"readme" | "install" | "tech" | "contributors">("readme");
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentSubmitLoading, setCommentSubmitLoading] = useState(false);
  const [postLikes, setPostLikes] = useState<Record<string, boolean>>({});
  
  // Rating state
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch comments
  useEffect(() => {
    async function loadProjectComments() {
      setCommentsLoading(true);
      const path = `projects/${project.id}/comments`;
      try {
        const q = query(collection(db, path), orderBy("createdAt", "desc"));
        const qSnap = await getDocs(q);
        const list: ProjectComment[] = [];
        qSnap.forEach((doc) => {
          list.push(doc.data() as ProjectComment);
        });
        setComments(list);
      } catch (err) {
        console.warn("Could not retrieve project comments:", err);
      } finally {
        setCommentsLoading(false);
      }
    }
    loadProjectComments();
  }, [project.id]);

  // Handle Comment Submission
  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) {
      onLogin();
      return;
    }

    if (!newComment.trim()) return;

    setCommentSubmitLoading(true);
    const commentId = "p_comment_" + Date.now();
    const commentPath = `projects/${project.id}/comments/${commentId}`;

    try {
      const commentObj: ProjectComment = {
        id: commentId,
        projectId: project.id,
        content: newComment.trim(),
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || "Anonymous Creator",
        authorAvatar: auth.currentUser.photoURL || "",
        createdAt: new Date().toISOString()
      };

      // 1. Save to project's comment subcollection
      await setDoc(doc(db, `projects/${project.id}/comments`, commentId), {
        ...commentObj,
        createdAt: serverTimestamp()
      });

      // 2. Clear state and refresh comments
      setNewComment("");
      setComments((prev) => [commentObj, ...prev]);

      // 3. Write live notification for the project submitter if they are another user
      if (project.submitterId && project.submitterId !== "system" && project.submitterId !== auth.currentUser.uid) {
        const notificationId = "notif_" + Date.now();
        const notificationMsg = `${auth.currentUser.displayName || "Someone"} commented on your submitted project "${project.name}"!`;
        await setDoc(doc(db, `users/${project.submitterId}/notifications`, notificationId), {
          id: notificationId,
          userId: project.submitterId,
          message: notificationMsg,
          type: "project",
          read: false,
          createdAt: serverTimestamp(),
          targetId: project.id
        });
      }

      await logUserInteraction("comment_project", { projectId: project.id, commentId });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, commentPath);
    } finally {
      setCommentSubmitLoading(false);
    }
  }

  // Handle rating inside detailed page
  async function handleRate(score: number) {
    if (!auth.currentUser) {
      onLogin();
      return;
    }

    setRatingLoading(true);
    const path = `projects/${project.id}`;
    try {
      const currentCount = project.ratingCount || 0;
      const currentVal = project.rating || 0;
      const newValCount = currentCount + 1;
      const newValRating = parseFloat(((currentVal * currentCount + score) / newValCount).toFixed(1));

      await updateDoc(doc(db, "projects", project.id), {
        rating: newValRating,
        ratingCount: newValCount,
        updatedAt: serverTimestamp(),
      });

      project.rating = newValRating;
      project.ratingCount = newValCount;
      setUserRating(score);
      await logUserInteraction("rate_project_detailed", { projectId: project.id, score });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setRatingLoading(false);
    }
  }

  // Copy share URL
  function handleCopyUrl() {
    const shareLink = `${window.location.origin}/?view=details&project=${project.id}`;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    logUserInteraction("share_project_link", { projectId: project.id });
  }

  // Auto generated contributors list (looks beautiful and fully detailed!)
  const mockContributors = [
    { name: "JakeWhat", roll: "Core Lead Architect", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop" },
    { name: "GigaDev", roll: "Ecosystem Maintainer", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&auto=format&fit=crop" },
    { name: "PixelCraft", roll: "UI Design Engineer", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop" },
    { name: "AlchemistOS", roll: "DevOps / Release Lead", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop" }
  ];

  // Auto generated README document markdown content
  const readmeMarkdown = `
# 🚀 ${project.name} Workspace Suite

Welcome to the official developer hub for **${project.name}**! 

${project.description}

---

## 🎯 Strategic Competitive Position

${project.name} is built to address the developer ergonomic issues of closed proprietary software, serving as a robust alternative.

| Metric | ${project.name} | Closed Counterparts |
| :--- | :--- | :--- |
| **Data Ownership** | 🔒 100% Control (Local or Private Cloud) | 🚫 Closed APIs / Third-Party Server |
| **Extensibility** | 🧩 Fully Modular / Multi-Language Hooks | 🚫 Out Of The Box Only |
| **Ecosystem Price** | 🆓 Open Source or Fair SaaS | 💳 Enterprise Licenses |

## ✨ Key Technical Advantages

- **Privacy-First Syncing**: Built with state-of-the-art encrypted layers.
- **Lightning Engine**: Optimized database structures and native execution pipelines.
- **Micro-Services Integration**: Supports immediate webhooks, Serverless execution, and containerized Docker environments.
- **Custom Visual Components**: Styled out of the box with accessible modern standards.

---

## 🛠️ Community & Development Status

Actively developed by developers around the world, this repository or project provides instant-bootstrap capabilities. Contributing guides are welcoming of pull requests, bug logs, and feature requests. Let's make alternative development collaborative!
`;

  // Auto-generated install notes
  function getInstallGuide() {
    if (project.type === "saas") {
      return `### 🚀 SaaS Immediate Activation Guide

You can immediately consume this software as a high-availability cloud host!

1. Navigate to the official domain: [${project.url}](${project.url})
2. Hit **Deploy/Sign-Up Free**
3. Create your builder account instantly (OAuth available)
4. Integrate your API tokens inside your \`.env\` workspace parameters:

\`\`\`bash
# Setup Workspace parameters
OPENALT_ORGANIZATION_ID="openalt_org_dev_55"
${project.name.toUpperCase()}_API_KEY="sk_openalt_test_workspace_99"
\`\`\`

5. Invoke cloud fetches within your code:
\`\`\`javascript
import { OpenAltSDK } from "openalt-dev-sdk";
const client = new OpenAltSDK({ apiKey: process.env.${project.name.toUpperCase()}_API_KEY });
\`\`\``;
    }

    switch (project.language.toLowerCase()) {
      case "typescript":
      case "javascript":
        return `### 📦 Node.js / NPM Module Installation

Install this package as a dependency inside your workspace:

\`\`\`bash
# Install via npm
npm install ${project.name.toLowerCase()} --save

# Or install via yarn
yarn add ${project.name.toLowerCase()}
\`\`\`

#### Import & Boot Application:
\`\`\`typescript
import { createServer } from '${project.name.toLowerCase()}';

const server = createServer({
  port: 8080,
  enableSync: true,
  storage: 'postgres'
});

await server.start();
console.log("🚀 ${project.name} initialized!");
\`\`\``;
      case "rust":
        return `### 🦀 Rust Cargo Crate Installation

Add this dependency to your \`Cargo.toml\` file:

\`\`\`toml
[dependencies]
${project.name.toLowerCase()} = "1.4.2"
tokio = { version = "1", features = ["full"] }
\`\`\`

#### Code Setup:
\`\`\`rust
use ${project.name.toLowerCase()}::Workspace;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut ws = Workspace::new("./config.json").await?;
    ws.run().await?;
    Ok(())
}
\`\`\``;
      case "python":
        return `### 🐍 Python pip installation

Run standard pip installation in your virtual environment:

\`\`\`bash
pip install ${project.name.toLowerCase()}-ecosystem
\`\`\`

#### Sample Execution:
\`\`\`python
from ${project.name.toLowerCase()} import HubService

service = HubService(token="my_token")
service.connect_to_postgres()
print("${project.name} Online!")
\`\`\``;
      case "go":
        return `### 🐹 Go Modules Installation

Fetch the repository code modules directly:

\`\`\`bash
go get -u github.com/${project.name.toLowerCase()}/${project.name.toLowerCase()}-go
\`\`\`

#### Simple Main:
\`\`\`go
package main

import (
  "context"
  "fmt"
  "${project.name.toLowerCase()}"
)

func main() {
  client := ${project.name.toLowerCase()}.NewClient()
  fmt.Println("${project.name} Go Package Active!")
}
\`\`\``;
      default:
        return `### 🛠️ Generic Source Build Instructions

Build and deploy from source repositories:

\`\`\`bash
# 1. Clone repositories mirror
git clone ${project.url}.git

# 2. Enter repository directory root
cd ${project.name.toLowerCase()}

# 3. Compile code
make build

# 4. Spin up containerized instances
docker-compose up -d
\`\`\``;
    }
  }

  return (
    <div className="space-y-6">
      {/* Back Button Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="bg-white text-black border-2 border-black font-mono font-black text-xs uppercase px-4 py-2.5 rounded shadow-[3px_3px_0_0_#000000] hover:translate-x-[-1.5px] hover:translate-y-[-1.5px] hover:shadow-[4.5px_4.5px_0_0_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4 stroke-[3px]" />
          <span>BACK TO DISCOVERY FEED</span>
        </button>

        <div className="flex items-center gap-2.5">
          {/* Share Trigger */}
          <button
            onClick={() => setShowShareModal(true)}
            className="p-2.5 border-2 border-black rounded-lg bg-white text-black hover:bg-stone-50 shadow-[2.5px_2.5px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3.5px_3.5px_0_0_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
            title="Share this project"
          >
            <Share2 className="h-4.5 w-4.5 stroke-[2.5px]" />
          </button>

          {/* Bookmarking Action */}
          <button
            onClick={() => onToggleBookmark(project)}
            className={`p-2.5 border-2 border-black rounded-lg transition-all shadow-[2.5px_2.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer ${
              isBookmarked
                ? "bg-[#ec4899] text-white"
                : "bg-white text-black hover:bg-stone-50 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3.5px_3.5px_0_0_#000000]"
            }`}
            title={isBookmarked ? "Remove from Favorites" : "Bookmark to Favorites"}
          >
            <Bookmark className={`h-4.5 w-4.5 stroke-[2.5px] ${isBookmarked ? "fill-white" : ""}`} />
          </button>
        </div>
      </div>

      {/* Hero Header Presentation card */}
      <div className="bg-[#ddd6fe] border-4 border-black p-6 md:p-8 rounded-2xl shadow-[6px_6px_0_0_#000000] relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 h-32 w-32 bg-white opacity-25 rounded-full border-4 border-black translate-x-8 -translate-y-8 pointer-events-none" />
        
        <div className="flex items-center gap-3.5 flex-wrap">
          {/* Simulated App Logo favicon */}
          <div className="h-14 w-14 rounded-xl border-3 border-black bg-black flex items-center justify-center text-[#ddd6fe] font-sans font-black text-2xl shadow-[3px_3px_0_0_#000000]">
            {project.name.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-sans font-black tracking-tight text-black leading-none">
                {project.name}
              </h1>
              <span className="text-[10px] font-mono font-black uppercase py-0.5 px-2 bg-white border-2 border-black text-black rounded-full shadow-[1.5px_1.5px_0_0_#000000]">
                {project.type === "open-source" ? "Open Source Repo" : "Indie SaaS"}
              </span>
            </div>
            <p className="text-xs font-mono font-extrabold text-stone-700 uppercase flex items-center gap-1.5 flex-wrap">
              <span>Registered by Submitter:</span>
              <span className="text-black font-black underline">{project.submitterName || "Core Platform"}</span>
              {project.submitterId && <UserBadge userId={project.submitterId} />}
            </p>
          </div>
        </div>

        <p className="text-sm md:text-base text-stone-900 font-bold leading-relaxed max-w-3xl">
          {project.description}
        </p>

        {/* Quantifiable parameters grid bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t-2 border-dashed border-black font-mono text-xs">
          <div className="bg-white border-2 border-black p-3 rounded-lg shadow-[2.5px_2.5px_0_0_#000000]">
            <span className="block text-[8px] font-bold text-stone-500 uppercase tracking-widest leading-none">Total stars</span>
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-4.5 w-4.5 text-black fill-yellow-300 stroke-[2px]" />
              <span className="font-black text-sm text-black">
                {project.stars > 0 ? project.stars.toLocaleString() : "N/A"}
              </span>
            </div>
          </div>

          <div className="bg-white border-2 border-black p-3 rounded-lg shadow-[2.5px_2.5px_0_0_#000000]">
            <span className="block text-[8px] font-bold text-stone-500 uppercase tracking-widest leading-none">Total upvotes</span>
            <div className="flex items-center gap-1 mt-1">
              <ThumbsUp className="h-4.5 w-4.5 text-black fill-cyan-200 stroke-[2.5px]" />
              <span className="font-black text-sm text-black">
                {project.upvotes}
              </span>
            </div>
          </div>

          <div className="bg-white border-2 border-black p-3 rounded-lg shadow-[2.5px_2.5px_0_0_#000000]">
            <span className="block text-[8px] font-bold text-stone-500 uppercase tracking-widest leading-none">Ratings index</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Star className="h-4.5 w-4.5 text-black fill-yellow-300 stroke-[2px]" />
              <span className="font-black text-sm text-black">
                {project.rating || "5.0"}
                <span className="text-[10px] text-stone-500 font-medium font-sans ml-1">({project.ratingCount || 1} rates)</span>
              </span>
            </div>
          </div>

          <div className="bg-white border-2 border-black p-3 rounded-lg shadow-[2.5px_2.5px_0_0_#000000]">
            <span className="block text-[8px] font-bold text-stone-500 uppercase tracking-widest leading-none">Language ecosystem</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Terminal className="h-4 w-4 text-black stroke-[3px]" />
              <span className="font-black text-sm text-black uppercase">
                {project.language || "TypeScript"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Direct Redirect Site Links */}
        <div className="pt-2 flex flex-wrap gap-3 font-mono">
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-black hover:bg-stone-900 font-black text-white px-5 py-3 border-2 border-black uppercase text-xs shadow-[3px_3px_0_0_#ec4899] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <span>Visit Platform Website</span>
            <ExternalLink className="h-4 w-4 text-white stroke-[2.5px]" />
          </a>

          {project.type === "open-source" && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-white hover:bg-stone-50 font-black text-black px-5 py-3 border-2 border-black uppercase text-xs shadow-[3px_3px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <GitFork className="h-4 w-4 text-black stroke-[2.5px]" />
              <span>Inspect Source Files</span>
            </a>
          )}
        </div>
      </div>

      {/* Main split grid: Tabs documents and Comments list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns containing Documentation details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0_0_#000000] min-h-[450px] flex flex-col">
            
            {/* Documentation Tab controls */}
            <div className="flex border-b-2 border-black pb-3 overflow-x-auto gap-2 text-xs font-mono">
              <button
                onClick={() => setActiveTab("readme")}
                className={`px-4 py-2.5 font-black border-2 border-black rounded-lg uppercase whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "readme" ? "bg-[#fde047] text-black shadow-none" : "bg-white text-stone-700 hover:bg-stone-50 shadow-[2px_2px_0_0_#000000]"
                }`}
              >
                <BookOpen className="h-4 w-4 stroke-[2.5px] inline mr-1" /> Readme.md Document
              </button>
              <button
                onClick={() => setActiveTab("install")}
                className={`px-4 py-2.5 font-black border-2 border-black rounded-lg uppercase whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "install" ? "bg-[#67e8f9] text-black shadow-none" : "bg-white text-stone-700 hover:bg-stone-50 shadow-[2px_2px_0_0_#000000]"
                }`}
              >
                <Terminal className="h-4 w-4 stroke-[2.5px] inline mr-1" /> Installation Note
              </button>
              <button
                onClick={() => setActiveTab("tech")}
                className={`px-4 py-2.5 font-black border-2 border-black rounded-lg uppercase whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "tech" ? "bg-[#fed7aa] text-black shadow-none" : "bg-white text-stone-700 hover:bg-stone-50 shadow-[2px_2px_0_0_#000000]"
                }`}
              >
                <Shield className="h-4 w-4 stroke-[2.5px] inline mr-1" /> Licensing details
              </button>
              <button
                onClick={() => setActiveTab("contributors")}
                className={`px-4 py-2.5 font-black border-2 border-black rounded-lg uppercase whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "contributors" ? "bg-[#86efac] text-black shadow-none" : "bg-white text-stone-700 hover:bg-stone-50 shadow-[2px_2px_0_0_#000000]"
                }`}
              >
                <Users className="h-4 w-4 stroke-[2.5px] inline mr-1" /> Contributors list
              </button>
            </div>

            {/* Tab content renderer */}
            <div className="flex-1 pt-6">
              {activeTab === "readme" && (
                <div className="markdown-body text-stone-800 leading-relaxed font-sans max-w-none text-sm space-y-4">
                  <Markdown>{readmeMarkdown}</Markdown>
                </div>
              )}

              {activeTab === "install" && (
                <div className="markdown-body space-y-4 text-sm font-mono text-stone-800 bg-stone-50 border-2 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#000000]">
                  <Markdown>{getInstallGuide()}</Markdown>
                </div>
              )}

              {activeTab === "tech" && (
                <div className="space-y-4 font-sans">
                  <h3 className="text-lg font-black text-black">Code Terms & Licensing</h3>
                  <p className="text-xs text-stone-700 font-bold leading-relaxed">
                    This project is offered under the terms of the <strong className="text-black italic bg-[#fed7aa] border border-black px-1.5 py-0.5 rounded shadow-[1px_1px_0_0_#000000]">{project.license || "MIT License"}</strong> standard.
                  </p>
                  <div className="border-2 border-black p-4 rounded-lg bg-yellow-50 shadow-[2px_2px_0_0_#000000] text-xs font-bold leading-normal text-stone-700">
                    <p className="font-extrabold text-black uppercase mb-1">💡 Licensing Note for builders:</p>
                    {project.license === "Proprietary" || project.license === "Freemium" ? (
                      <span>This is an independently commercial SaaS service. You can use standard public hosting under cloud terms. Self-hosted deployments might require commercial workspace authorization layers.</span>
                    ) : (
                      <span>This is fully recognized as secure, copy-left public developer intellectual property. You are welcome to fork, modify, self-host, distribute commercial alternatives, and embed this in proprietary services, keeping authorship notes original.</span>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "contributors" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-black flex items-center gap-2">
                      <Award className="h-5 w-5 text-black" />
                      Active Core Ecosystem Maintainers
                    </h3>
                    <p className="text-xs text-stone-600 font-sans mt-0.5 font-bold">The developers leading the daily code integrations and reviews</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {mockContributors.map((c) => (
                      <div key={c.name} className="flex items-center gap-3.5 p-3 bg-stone-50 border-2 border-black rounded-lg shadow-[2.5px_2.5px_0_0_#000000]">
                        <img src={c.avatar} alt={c.name} className="h-10 w-10 rounded-full border-2 border-black object-cover shrink-0 shadow-[1px_1px_0_0_#000000]" />
                        <div>
                          <p className="text-xs font-black text-black leading-none">{c.name}</p>
                          <p className="text-[10px] font-mono font-semibold text-stone-600 mt-1">{c.roll}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column containing Project comments discussion feed */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Rate Project Widget panel */}
          <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[5px_5px_0_0_#000000] space-y-4">
            <h3 className="text-xs font-mono font-black uppercase tracking-wider text-black bg-[#fbcfe8] border-2 border-black px-2.5 py-1 rounded inline-block shadow-[2px_2px_0_0_#000000]">
              Evaluate Alternative
            </h3>
            
            <p className="text-xs font-sans text-stone-700 font-bold leading-normal">
              Rate your developer experience on a scale of 1 to 5 stars! Evaluation scores instantly recalculate and updates the index dataset.
            </p>

            <div className="flex items-center justify-between border-2 border-black p-3.5 bg-stone-50 rounded-lg shadow-[2.5px_2.5px_0_0_#000000]">
              <span className="text-xs font-mono font-black text-black">
                {userRating ? `RATED: ${userRating}/5` : 'YOUR VOTE:'}
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    disabled={ratingLoading || userRating !== null}
                    onClick={() => handleRate(s)}
                    className="text-stone-300 hover:text-black focus:outline-none transition-transform hover:scale-125 disabled:opacity-55 cursor-pointer"
                  >
                    <Star
                      className={`h-5 w-5 stroke-[2px] ${
                        (userRating || 0) >= s
                          ? "text-black fill-yellow-300 stroke-black animate-pulse"
                          : "text-stone-300 hover:text-black"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Project Comment discussion card */}
          <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[5px_5px_0_0_#000000] space-y-4 flex flex-col justify-between min-h-[300px]">
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-black uppercase tracking-wider text-black bg-[#fde047] border-2 border-black px-2.5 py-1 rounded inline-block shadow-[2px_2px_0_0_#000000]">
                Platform Chatbox
              </h3>
              
              {commentsLoading ? (
                <div className="py-8 text-center flex items-center justify-center gap-2">
                  <Loader className="h-4 w-4 animate-spin text-black" />
                  <span className="text-xs font-black text-stone-600 font-mono">Loading discussions...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="py-8 text-center text-stone-500 italic font-bold">
                  No builder reviews posted yet. Be the first to start the alternative feedback!
                </div>
              ) : (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-stone-50 p-3 rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000000] space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full overflow-hidden border border-black bg-white">
                          {c.authorAvatar ? (
                            <img src={c.authorAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center font-black bg-[#ddd6fe] text-black text-[9px]">
                              {c.authorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="font-black text-black">{c.authorName}</span>
                      </div>
                      <p className="text-stone-700 font-sans font-bold pl-7 leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Project Comment form */}
            <form onSubmit={handleSubmitComment} className="pt-4 border-t-2 border-dashed border-black space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={commentSubmitLoading}
                placeholder="Submit your workspace feedback about custom configurations..."
                className="w-full bg-white border-2 border-black focus:outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] rounded-lg px-3 py-2.5 text-xs text-black font-semibold shadow-[2px_2px_0_0_#000000] placeholder-stone-400"
                rows={3}
              />
              <button
                type="submit"
                disabled={commentSubmitLoading || !newComment.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#ddd6fe] hover:bg-[#c084fc] border-2 border-black text-black font-black px-4 py-2.5 text-xs uppercase shadow-[2.5px_2.5px_0_0_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
              >
                {commentSubmitLoading ? (
                  <Loader className="h-4 w-4 animate-spin text-black" />
                ) : (
                  <>
                    <Send className="h-4 w-4 text-black stroke-[2.5px]" />
                    <span>Send Project Review</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* SHARE SCREEN PORTAL COMPILING OVERLAY MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fffdf5] border-4 border-black p-6 md:p-8 max-w-md w-full rounded-2xl shadow-[8px_8px_0_0_#000000] relative space-y-6 font-sans">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 border-2 border-black bg-white text-black hover:bg-stone-100 shadow-[2px_2px_0_0_#000000] transition-all cursor-pointer"
              aria-label="Close share panel"
            >
              &times;
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#ddd6fe] border-2 border-black text-black shadow-[3px_3px_0_0_#000000]">
                <Share2 className="h-5 w-5 text-black" />
              </div>
              <h3 className="text-2xl font-black text-black italic">SHARE {project.name.toUpperCase()}</h3>
              <p className="text-stone-700 text-xs font-bold font-sans">Let your developer peers discover this awesome alternative tool!</p>
            </div>

            {/* Input URL for copying */}
            <div className="bg-white border-2 border-black p-3.5 rounded-lg flex items-center justify-between shadow-[2px_2px_0_0_#000000] font-mono text-xs">
              <span className="truncate text-stone-600 select-all select-all font-bold pr-3">
                {`${window.location.origin}/?view=details&project=${project.id}`}
              </span>
              <button
                onClick={handleCopyUrl}
                className="h-9 w-9 shrink-0 flex items-center justify-center border-2 border-black rounded-lg bg-[#86efac] text-black hover:bg-[#22c55e] transition shadow-[1.5px_1.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none font-black cursor-pointer"
              >
                {copied ? <Check className="h-4.5 w-4.5 text-black stroke-[3px]" /> : <Copy className="h-4.5 w-4.5 text-black" />}
              </button>
            </div>

            {copied && (
              <p className="text-[10px] font-mono font-black text-[#5be083] uppercase tracking-wider text-center animate-bounce">
                Workspace redirect link copied to clipboard successfully!
              </p>
            )}

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full bg-black hover:bg-stone-900 border-2 border-black text-white px-4 py-3 text-xs font-black uppercase rounded-lg shadow-[2.5px_2.5px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              Close Share Channel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
