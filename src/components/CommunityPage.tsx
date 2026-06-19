import React, { useState, useEffect } from "react";
import { appCache } from "../utils/cache";
import { 
  MessageSquare, 
  User, 
  Send, 
  ThumbsUp, 
  PlusCircle, 
  ArrowLeft, 
  Tags, 
  Globe, 
  Calendar, 
  ShieldCheck, 
  Save, 
  Loader, 
  Sparkles,
  Link,
  ChevronRight,
  ExternalLink,
  Bookmark,
  Share2,
  CornerDownRight,
  BarChart3
} from "lucide-react";
import Markdown from "react-markdown";
import UserBadge from "./UserBadge";
import { Post, Comment, UserProfile, Project, Poll, PollOption, PollVote } from "../types";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  updateDoc, 
  increment, 
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { logUserInteraction } from "../utils/logger";
import { generateMockCommunity } from "../utils/mockCommunityGenerator";

const { posts: MOCK_POSTS, commentsMap: MOCK_COMMENTS_MAP } = generateMockCommunity();

interface CommunityPageProps {
  onLogin: () => void;
  onSelectProject?: (project: Project) => void;
  addToast?: (message: string, type?: "success" | "info" | "warning") => void;
  currentUserCredits?: number;
}

export default function CommunityPage({ onLogin, onSelectProject, addToast, currentUserCredits = 30 }: CommunityPageProps) {
  const [activeTab, setActiveTab] = useState<"forum" | "polls" | "profile">("forum");
  
  // Polls feature state
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]); // start with 2 options
  const [pollSubmitLoading, setPollSubmitLoading] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({}); // pollId -> optionId

  // Forum list state
  const [posts, setPosts] = useState<Post[]>([]);
  const [forumLoading, setForumLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postLikes, setPostLikes] = useState<Record<string, boolean>>({});

  // Replies states
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContents, setReplyContents] = useState<Record<string, string>>({});

  // Creation forms state
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("General");
  const [newPostTags, setNewPostTags] = useState("");
  const [postSubmitLoading, setPostSubmitLoading] = useState(false);

  const [commentContent, setCommentContent] = useState("");
  const [commentSubmitLoading, setCommentSubmitLoading] = useState(false);

  // Profile customization state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customBio, setCustomBio] = useState("");
  const [customWeb, setCustomWeb] = useState("");
  const [customAvatar, setCustomAvatar] = useState("");
  const [userSubmittedProjects, setUserSubmittedProjects] = useState<Project[]>([]);
  const [userBookmarkedProjects, setUserBookmarkedProjects] = useState<Project[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"creations" | "bookmarks">("creations");

  // 1. Fetch Forum Posts
  async function fetchPosts() {
    const cachedPosts = appCache.getCommunityPosts();
    if (cachedPosts) {
      setPosts(cachedPosts);
      setForumLoading(false);
    } else {
      setForumLoading(true);
    }
    const path = "posts";
    try {
      const postsQuery = query(collection(db, path), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(postsQuery);
      let loadedPosts: Post[] = [];
      querySnapshot.forEach((doc) => {
        const postData = doc.data() as Post;
        if (!doc.id.startsWith("post_aeo_")) {
          loadedPosts.push(postData);
        }
      });

      // Combine database posts with procedural realistic mock posts
      const dbPostIds = new Set(loadedPosts.map(p => p.id));
      const filteredMock = MOCK_POSTS.filter(p => !dbPostIds.has(p.id));
      loadedPosts = [...loadedPosts, ...filteredMock];

      // Sort loaded posts by date descending
      loadedPosts.sort((a, b) => {
        const dateA = new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt).getTime();
        const dateB = new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt).getTime();
        return dateB - dateA;
      });

      setPosts(loadedPosts);
      appCache.setCommunityPosts(loadedPosts);

      // Check URLSearchParams for deep-linked thread postId
      try {
        const params = new URLSearchParams(window.location.search);
        const urlPostId = params.get("postId");
        if (urlPostId) {
          const matching = loadedPosts.find((p) => p.id === urlPostId);
          if (matching) {
            setSelectedPost(matching);
          }
        }
      } catch (deepLinkErr) {
        console.warn("Could not parse deep linked post ID from URL:", deepLinkErr);
      }

      // Check liked status
      if (auth.currentUser) {
        const likesMap: Record<string, boolean> = {};
        const dbPosts = loadedPosts.filter(p => !p.id.startsWith("mock_"));
        
        await Promise.all(
          dbPosts.map(async (p) => {
            try {
              const lDoc = await getDoc(
                doc(db, `posts/${p.id}/likes`, auth.currentUser!.uid)
              );
              if (lDoc.exists()) {
                likesMap[p.id] = true;
              }
            } catch (e) {
              console.warn("Could not check like status for post:", p.id, e);
            }
          })
        );
        setPostLikes(likesMap);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    } finally {
      setForumLoading(false);
    }
  }

  useEffect(() => {
    fetchPosts();
  }, [auth.currentUser]);

  // Restore scroll position when returning to the forum list from a detail page
  useEffect(() => {
    if (!selectedPost && activeTab === "forum") {
      const savedScroll = appCache.getScrollPosition("community_forum_scroll");
      if (savedScroll > 0) {
        // Safe timeout to let paint render the cached elements
        setTimeout(() => {
          window.scrollTo({ top: savedScroll, behavior: "auto" });
        }, 120);
      }
    }
  }, [selectedPost, activeTab]);

  // Polls synchronization with real-time updates
  useEffect(() => {
    setPollsLoading(true);
    const pollsCol = collection(db, "polls");
    const q = query(pollsCol, orderBy("createdAt", "desc"));
    
    const unsubscribePolls = onSnapshot(q, (snapshot) => {
      const loadedPolls: Poll[] = [];
      snapshot.forEach((doc) => {
        loadedPolls.push({ id: doc.id, ...doc.data() } as Poll);
      });
      setPolls(loadedPolls);
      setPollsLoading(false);
    }, (error) => {
      console.error("Realtime Polls subscription error:", error);
      setPollsLoading(false);
    });

    return () => unsubscribePolls();
  }, []);

  // Listen to current user's votes on active polls in real-time
  useEffect(() => {
    if (!auth.currentUser || polls.length === 0) {
      setUserVotes({});
      return;
    }

    const unsubscribers: (() => void)[] = [];

    polls.forEach((poll) => {
      const voteRef = doc(db, `polls/${poll.id}/votes/${auth.currentUser?.uid}`);
      const unsub = onSnapshot(voteRef, (docSnap) => {
        if (docSnap.exists()) {
          const voteData = docSnap.data();
          setUserVotes((prev) => ({
            ...prev,
            [poll.id]: voteData.optionId
          }));
        }
      }, (error) => {
        console.error("User Vote subscription error for poll:", poll.id, error);
      });
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach((u) => u());
    };
  }, [polls, auth.currentUser]);

  // Create simple question poll
  async function handleCreatePoll(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) {
      onLogin();
      return;
    }

    const cleanedOptions = pollOptions.map(opt => opt.trim()).filter(Boolean);
    if (!pollQuestion.trim() || cleanedOptions.length < 2) {
      addToast?.("Please supply a valid question and at least 2 distinct options", "warning");
      return;
    }

    setPollSubmitLoading(true);
    const pollId = "poll-" + Date.now();
    
    const optionsArray: PollOption[] = cleanedOptions.map((opt, idx) => ({
      id: "opt_" + idx,
      text: opt,
      votes: 0
    }));

    const pollData = {
      id: pollId,
      question: pollQuestion.trim(),
      options: optionsArray,
      creatorId: auth.currentUser.uid,
      creatorName: auth.currentUser.displayName || "Anonymous Creator",
      creatorAvatar: auth.currentUser.photoURL || "",
      totalVotes: 0,
      createdAt: new Date()
    };

    try {
      await setDoc(doc(db, "polls", pollId), pollData);
      
      setPollQuestion("");
      setPollOptions(["", ""]);
      setShowCreatePoll(false);
      addToast?.("Poll published successfully!", "success");

      logUserInteraction("create_poll", { pollId, question: pollData.question });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `polls/${pollId}`);
      } catch (formattedError: any) {
        addToast?.("Could not create poll: " + formattedError.message, "warning");
      }
    } finally {
      setPollSubmitLoading(false);
    }
  }

  // Cast vote atomically using writeBatch to meet existsAfter rule
  async function handleCastVote(pollId: string, optionId: string) {
    if (!auth.currentUser) {
      onLogin();
      return;
    }

    if (userVotes[pollId]) {
      addToast?.("You have already voted on this poll!", "info");
      return;
    }

    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;

    try {
      const batch = writeBatch(db);
      
      // 1. Write the Vote record
      const voteRef = doc(db, `polls/${pollId}/votes/${auth.currentUser.uid}`);
      batch.set(voteRef, {
        userId: auth.currentUser.uid,
        optionId: optionId,
        createdAt: new Date()
      });

      // 2. Increment option vote count and totalVotes on the Poll itself
      const pollRef = doc(db, "polls", pollId);
      const updatedOptions = poll.options.map((opt) => {
        if (opt.id === optionId) {
          return { ...opt, votes: opt.votes + 1 };
        }
        return opt;
      });

      batch.update(pollRef, {
        totalVotes: poll.totalVotes + 1,
        options: updatedOptions
      });

      await batch.commit();
      addToast?.("Vote registered successfully!", "success");

      logUserInteraction("cast_poll_vote", { pollId, optionId });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `polls/${pollId}`);
      } catch (formattedError: any) {
        addToast?.("Could not cast vote: " + formattedError.message, "warning");
      }
    }
  }

  // Delete poll (only creator)
  async function handleDeletePoll(pollId: string) {
    if (!auth.currentUser) return;
    const poll = polls.find(p => p.id === pollId);
    if (!poll || poll.creatorId !== auth.currentUser.uid) {
      addToast?.("You are not authorized to delete this poll", "warning");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this poll? Your users' votes will be lost.")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "polls", pollId));
      addToast?.("Poll deleted successfully", "success");
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `polls/${pollId}`);
      } catch (formattedError: any) {
        addToast?.("Error deleting poll: " + formattedError.message, "warning");
      }
    }
  }

  // 2. Fetch Comments for Selected Post
  async function fetchComments(postId: string) {
    const cachedComments = appCache.getPostComments(postId);
    if (cachedComments) {
      setComments(cachedComments);
      setCommentsLoading(false);
    } else {
      setCommentsLoading(true);
    }
    const path = `posts/${postId}/comments`;
    try {
      const commQuery = query(collection(db, path), orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(commQuery);
      let loaded: Comment[] = [];
      querySnapshot.forEach((doc) => {
        loaded.push(doc.data() as Comment);
      });

      // Merge database comments with procedural mock comments for mock posts
      if (loaded.length === 0 && MOCK_COMMENTS_MAP[postId]) {
        loaded = MOCK_COMMENTS_MAP[postId];
      } else if (MOCK_COMMENTS_MAP[postId]) {
        const dbCommIds = new Set(loaded.map(c => c.id));
        const filteredMockComm = MOCK_COMMENTS_MAP[postId].filter(c => !dbCommIds.has(c.id));
        loaded = [...loaded, ...filteredMockComm];
        loaded.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateA - dateB;
        });
      }

      setComments(loaded);
      appCache.setPostComments(postId, loaded);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    } finally {
      setCommentsLoading(false);
    }
  }

  useEffect(() => {
    if (selectedPost) {
      fetchComments(selectedPost.id);
    }
  }, [selectedPost]);

  // 3. Create Forum Post
  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) {
      onLogin();
      return;
    }

    if (!newPostTitle.trim() || !newPostContent.trim()) {
      return;
    }

    setPostSubmitLoading(true);
    const postId = "post_" + Date.now();
    const path = `posts/${postId}`;

    try {
      const textTags = newPostTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const postObj: Post = {
        id: postId,
        title: newPostTitle,
        content: newPostContent,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || "User",
        authorAvatar: auth.currentUser.photoURL || "",
        category: newPostCategory,
        tags: textTags.slice(0, 10), // Limit array
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(), // Fallback before saving
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "posts", postId), {
        ...postObj,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setNewPostTitle("");
      setNewPostContent("");
      setNewPostTags("");
      setShowCreatePost(false);
      fetchPosts();

      await logUserInteraction("create_forum_post", { postId, title: postObj.title });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setPostSubmitLoading(false);
    }
  }

  // 4. Submit Forum Comment
  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser || !selectedPost) {
      onLogin();
      return;
    }

    if (!commentContent.trim()) return;

    setCommentSubmitLoading(true);
    const commentId = "comment_" + Date.now();
    const commentPath = `posts/${selectedPost.id}/comments/${commentId}`;

    try {
      // Ensure mock posts exist in Firestore before nested comment writes are created
      if (selectedPost.id.startsWith("mock_")) {
        const postRef = doc(db, "posts", selectedPost.id);
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) {
          const dbPost = {
            ...selectedPost,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(postRef, dbPost);
        }
      }

      const commentObj: Comment = {
        id: commentId,
        postId: selectedPost.id,
        content: commentContent.trim(),
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || "Anonymous",
        authorAvatar: auth.currentUser.photoURL || "",
        createdAt: new Date().toISOString(),
        likes: []
      };

      // Set comment
      await setDoc(doc(db, `posts/${selectedPost.id}/comments`, commentId), {
        ...commentObj,
        createdAt: serverTimestamp()
      });

      // Increment post's counter
      await updateDoc(doc(db, "posts", selectedPost.id), {
        commentsCount: increment(1),
        updatedAt: serverTimestamp()
      });

      // Send live notification to structural post creator
      if (selectedPost.authorId && selectedPost.authorId !== "system" && selectedPost.authorId !== auth.currentUser.uid) {
        const notificationId = "notif_" + Date.now();
        const notificationMsg = `${auth.currentUser.displayName || "Someone"} commented on your forum post "${selectedPost.title}"!`;
        await setDoc(doc(db, `users/${selectedPost.authorId}/notifications`, notificationId), {
          id: notificationId,
          userId: selectedPost.authorId,
          message: notificationMsg,
          type: "forum",
          read: false,
          createdAt: serverTimestamp(),
          targetId: selectedPost.id
        });
      }

      // Update local card count
      setSelectedPost((prev) => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);
      setPosts((prev) =>
        prev.map((p) => (p.id === selectedPost.id ? { ...p, commentsCount: p.commentsCount + 1 } : p))
      );

      setCommentContent("");
      addToast?.("Comment posted!", "success");
      fetchComments(selectedPost.id);

      await logUserInteraction("comment_forum_post", { postId: selectedPost.id, commentId });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, commentPath);
    } finally {
      setCommentSubmitLoading(false);
    }
  }

  // 4b. Submit Reply to Comment
  async function handleAddReply(e: React.FormEvent, parentCommentId: string) {
    e.preventDefault();
    const contentText = replyContents[parentCommentId] || "";
    if (!contentText.trim()) return;
    if (!auth.currentUser || !selectedPost) {
      onLogin();
      return;
    }

    setCommentSubmitLoading(true);
    const commentId = "comment_" + Date.now();
    const commentPath = `posts/${selectedPost.id}/comments/${commentId}`;

    try {
      const commentObj: Comment = {
        id: commentId,
        postId: selectedPost.id,
        content: contentText.trim(),
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || "Anonymous",
        authorAvatar: auth.currentUser.photoURL || "",
        createdAt: new Date().toISOString(),
        parentId: parentCommentId,
        likes: []
      };

      await setDoc(doc(db, `posts/${selectedPost.id}/comments`, commentId), {
        ...commentObj,
        createdAt: serverTimestamp()
      });

      // Increment post's counter
      await updateDoc(doc(db, "posts", selectedPost.id), {
        commentsCount: increment(1),
        updatedAt: serverTimestamp()
      });

      // Update local card count
      setSelectedPost((prev) => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);
      setPosts((prev) =>
        prev.map((p) => (p.id === selectedPost.id ? { ...p, commentsCount: p.commentsCount + 1 } : p))
      );

      // Clean inputs
      setReplyContents(prev => ({ ...prev, [parentCommentId]: "" }));
      setReplyingToCommentId(null);
      
      addToast?.("Reply posted successfully!", "success");
      fetchComments(selectedPost.id);

      await logUserInteraction("reply_forum_comment", { postId: selectedPost.id, parentCommentId, commentId });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, commentPath);
    } finally {
      setCommentSubmitLoading(false);
    }
  }

  // 4c. Toggle Like on a Comment
  async function handleLikeComment(comment: Comment) {
    if (!auth.currentUser || !selectedPost) {
      onLogin();
      return;
    }

    const currentLikes = comment.likes || [];
    const likedIndex = currentLikes.indexOf(auth.currentUser.uid);
    let updatedLikes = [...currentLikes];

    if (likedIndex >= 0) {
      updatedLikes.splice(likedIndex, 1);
    } else {
      updatedLikes.push(auth.currentUser.uid);
    }

    try {
      // Optimistic update
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likes: updatedLikes } : c));

      await updateDoc(doc(db, `posts/${selectedPost.id}/comments`, comment.id), {
        likes: updatedLikes
      });

      if (addToast) {
        if (likedIndex >= 0) {
          addToast("Comment unliked.", "info");
        } else {
          addToast("Liked comment!", "success");
        }
      }
    } catch (err) {
      console.warn("Could not save comment like option:", err);
      // Revert optimism
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likes: currentLikes } : c));
    }
  }

  // 4d. Share Post Link
  function handleSharePost(e: React.MouseEvent, post: Post) {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}?view=community&postId=${post.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        if (addToast) {
          addToast(`Copied shareable link for "${post.title}" to clipboard!`, "success");
        } else {
          alert(`Copied link to clipboard: ${shareUrl}`);
        }
      })
      .catch((err) => {
        console.warn("Could not copy post link:", err);
      });
  }

  // 5. Like Forum Post
  async function handleLikePost(post: Post) {
    if (!auth.currentUser) {
      onLogin();
      return;
    }

    if (postLikes[post.id]) return; // Already liked

    const path = `posts/${post.id}/likes/${auth.currentUser.uid}`;
    try {
      // For mock posts, make sure the root post exists in the Firestore DB first so we can track upvotes
      if (post.id.startsWith("mock_")) {
        const postRef = doc(db, "posts", post.id);
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) {
          const dbPost = {
            ...post,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(postRef, dbPost);
        }
      }

      await setDoc(doc(db, `posts/${post.id}/likes`, auth.currentUser.uid), {
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "posts", post.id), {
        likesCount: increment(1),
        updatedAt: serverTimestamp()
      });

      setPostLikes((prev) => ({ ...prev, [post.id]: true }));
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likesCount: p.likesCount + 1 } : p))
      );
      if (selectedPost && selectedPost.id === post.id) {
        setSelectedPost((prev) => prev ? { ...prev, likesCount: prev.likesCount + 1 } : null);
      }

      await logUserInteraction("like_forum_post", { postId: post.id });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // 6. Fetch / Load User Profile & their Submissions
  async function loadUserProfile() {
    if (!auth.currentUser) return;
    setProfileLoading(true);
    const userPath = `users/${auth.currentUser.uid}`;

    try {
      // Fetch public profile record
      const profileSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      
      let profileData: UserProfile;
      if (profileSnap.exists()) {
        profileData = profileSnap.data() as UserProfile;
      } else {
        // Create initial default public profile matching Firebase Auth details
        profileData = {
          uid: auth.currentUser.uid,
          displayName: auth.currentUser.displayName || "Novice Creator",
          username: auth.currentUser.displayName ? auth.currentUser.displayName.toLowerCase().replace(/\s+/g, "") : "novicecreator",
          referralSource: "Other",
          avatarUrl: auth.currentUser.photoURL || "",
          bio: "",
          website: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, "users", auth.currentUser.uid), {
          ...profileData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setProfile(profileData);
      setCustomName(profileData.displayName);
      setCustomBio(profileData.bio);
      setCustomWeb(profileData.website);
      setCustomAvatar(profileData.avatarUrl);

      // Fetch projects submitted by this specific user
      const projPath = "projects";
      const q = query(collection(db, projPath), where("submitterId", "==", auth.currentUser.uid));
      const qSnap = await getDocs(q);
      const userProjects: Project[] = [];
      qSnap.forEach((item) => {
        userProjects.push(item.data() as Project);
      });
      setUserSubmittedProjects(userProjects);

      // Fetch user bookmarks
      const bookmarksPath = `users/${auth.currentUser.uid}/bookmarks`;
      const qB = query(collection(db, bookmarksPath));
      const bSnap = await getDocs(qB);
      const bkProjects: Project[] = [];
      bSnap.forEach((item) => {
        bkProjects.push(item.data() as Project);
      });
      setUserBookmarkedProjects(bkProjects);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, userPath);
    } finally {
      setProfileLoading(true);
    }
  }

  useEffect(() => {
    if (activeTab === "profile" && auth.currentUser) {
      loadUserProfile();
    }
  }, [activeTab, auth.currentUser]);

  // 7. Save User Profile edits
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) return;

    setProfileSaving(true);
    const userPath = `users/${auth.currentUser.uid}`;

    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        displayName: customName,
        bio: customBio,
        website: customWeb,
        avatarUrl: customAvatar,
        updatedAt: serverTimestamp()
      });

      setProfile((prev) => prev ? { 
        ...prev, 
        displayName: customName, 
        bio: customBio, 
        website: customWeb,
        avatarUrl: customAvatar 
      } : null);

      await logUserInteraction("update_user_profile", { displayName: customName });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, userPath);
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Sub Header Navigation */}
      <div className="bg-[#86efac] border-4 border-black p-4 shadow-[5px_5px_0_0_#000000] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2.5 text-xs">
          <button
            onClick={() => { setSelectedPost(null); setActiveTab("forum"); }}
            className={`rounded-xl px-4 py-3 font-black transition flex items-center gap-1.5 border-2 border-black uppercase text-xs cursor-pointer ${
              activeTab === "forum"
                ? "bg-black text-white shadow-none"
                : "text-black bg-white hover:bg-stone-50 shadow-[2px_2px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            }`}
          >
            <MessageSquare className="h-4 w-4 stroke-[2.5px]" />
            <span>Discussion Board</span>
          </button>
          <button
            onClick={() => { setSelectedPost(null); setActiveTab("polls"); }}
            className={`rounded-xl px-4 py-3 font-black transition flex items-center gap-1.5 border-2 border-black uppercase text-xs cursor-pointer ${
              activeTab === "polls"
                ? "bg-black text-white shadow-none"
                : "text-black bg-white hover:bg-stone-50 shadow-[2px_2px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            }`}
          >
            <BarChart3 className="h-4 w-4 stroke-[2.5px]" />
            <span>Opinion Polls</span>
          </button>
          <button
            onClick={() => { setSelectedPost(null); setActiveTab("profile"); }}
            className={`rounded-xl px-4 py-3 font-black transition flex items-center gap-1.5 border-2 border-black uppercase text-xs cursor-pointer ${
              activeTab === "profile"
                ? "bg-black text-white shadow-none"
                : "text-black bg-white hover:bg-stone-50 shadow-[2px_2px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            }`}
          >
            <User className="h-4 w-4 stroke-[2.5px]" />
            <span>My Profile & Projects</span>
          </button>
        </div>
        <div className="text-[11px] uppercase tracking-widest font-black text-black font-mono bg-white border-2 border-black px-3 py-1.5 rounded-lg shadow-[2px_2px_0_0_#000000]">
          COMMUNITY CENTRAL HUB
        </div>
      </div>

      {/* TABS CONTAINER */}
      {activeTab === "forum" && (
        <div>
          {/* Post Selection detail view */}
          {selectedPost ? (
            <div className="bg-white border-4 border-black p-6 md:p-8 space-y-6 rounded-2xl shadow-[6px_6px_0_0_#000000]">
              {/* Back Button */}
              <button
                onClick={() => setSelectedPost(null)}
                className="bg-[#fbcfe8] text-black border-2 border-black font-black px-4 py-2 rounded-lg inline-flex items-center gap-1.5 text-xs uppercase shadow-[2.5px_2.5px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4 stroke-[2.5px]" /> Back to Board
              </button>

              {/* Main Post Render */}
              <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black bg-[#ddd6fe] border-2 border-black px-3 py-1 rounded shadow-[2px_2px_0_0_#000000]">
                    {selectedPost.category}
                  </span>
                  <p className="text-[10px] font-mono font-black text-stone-700 uppercase flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-black" />
                    Posted: {new Date(selectedPost.createdAt?.toDate ? selectedPost.createdAt.toDate() : selectedPost.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <h1 className="text-2xl md:text-3xl font-sans font-black text-black tracking-tight leading-tight">
                  {selectedPost.title}
                </h1>

                {/* Profile Author Badge */}
                <div className="flex items-center gap-3 p-3 bg-stone-50 border-2 border-black rounded-xl inline-flex shadow-[3px_3px_0_0_#000000]">
                  <div className="h-9 w-9 rounded-full bg-white border-2 border-black overflow-hidden shrink-0">
                    {selectedPost.authorAvatar ? (
                      <img src={selectedPost.authorAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center font-black bg-[#fed7aa] text-black text-xs">
                        {selectedPost.authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black text-black leading-none flex items-center gap-1.5 flex-wrap">
                      <span>{selectedPost.authorName}</span>
                      <UserBadge userId={selectedPost.authorId} />
                    </p>
                    <p className="text-[9px] font-mono font-black text-stone-500 uppercase tracking-tight mt-1">SaaS Launchpad Contributor</p>
                  </div>
                </div>

                {/* Post Markdown Content block */}
                <div className="markdown-body text-sm font-sans text-stone-900 leading-relaxed pt-5 border-t-2 border-dashed border-black">
                  <Markdown>{selectedPost.content}</Markdown>
                </div>

                {/* Subtag pills */}
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-3">
                    {selectedPost.tags.map((tag) => (
                      <span key={tag} className="bg-white border-2 border-black text-black text-[10px] font-black uppercase py-0.5 px-2 rounded shadow-[1px_1px_0_0_#000000]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Operations */}
                <div className="flex items-center justify-between gap-3 pt-5 border-t-2 border-black flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={() => handleLikePost(selectedPost)}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 border-2 border-black text-xs font-black uppercase active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shadow-[3px_3px_0_0_#000000] cursor-pointer ${
                        postLikes[selectedPost.id]
                          ? "bg-[#ec4899] text-white"
                          : "bg-[#fed7aa] text-black hover:bg-[#ffedd5]"
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4 stroke-[2.5px]" />
                      <span>{selectedPost.likesCount} UPVOTES</span>
                    </button>

                    <button
                      onClick={(e) => handleSharePost(e, selectedPost)}
                      className="flex items-center gap-2 rounded-xl px-4 py-2.5 border-2 border-black text-xs font-black uppercase bg-[#86efac] text-black hover:bg-[#bbf7d0] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shadow-[3px_3px_0_0_#000000] cursor-pointer"
                      title="Copy Shareable Link"
                    >
                      <Share2 className="h-4 w-4 stroke-[2.5px]" />
                      <span>Share Post</span>
                    </button>
                  </div>
                  
                  <span className="text-xs text-stone-700 font-mono font-black bg-stone-100 border-2 border-black px-3 py-1.5 rounded-lg shadow-[2px_2px_0_0_#000000]">
                    Total feedback thread: {selectedPost.commentsCount} opinions
                  </span>
                </div>
              </div>

              {/* COMMENTS THREAD FEED MODULE */}
              <div className="pt-6 border-t-2 border-black space-y-4">
                <h3 className="text-xs font-mono font-black uppercase tracking-wider text-black bg-[#fde047] border-2 border-black px-2.5 py-1 rounded inline-block">Comments Thread</h3>

                {commentsLoading ? (
                  <div className="py-8 text-center flex items-center justify-center gap-2">
                    <Loader className="h-4 w-4 text-black animate-spin" />
                    <span className="text-xs font-black text-stone-600">Retrieving user responses...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-stone-500 italic font-medium p-4 border-2 border-dashed border-stone-200 rounded-xl">No opinions submitted yet. Express yours to start of discussion!</p>
                ) : (() => {
                  const mainComments = comments.filter((c) => !c.parentId);
                  const replyCommentsMap: Record<string, Comment[]> = {};
                  comments.forEach((c) => {
                    if (c.parentId) {
                      if (!replyCommentsMap[c.parentId]) {
                        replyCommentsMap[c.parentId] = [];
                      }
                      replyCommentsMap[c.parentId].push(c);
                    }
                  });

                  return (
                    <div className="space-y-6">
                      {mainComments.map((comment) => {
                        const isLiked = auth.currentUser ? (comment.likes || []).includes(auth.currentUser.uid) : false;
                        const likesCount = (comment.likes || []).length;
                        const replies = replyCommentsMap[comment.id] || [];
                        const isReplying = replyingToCommentId === comment.id;

                        return (
                          <div key={comment.id} className="space-y-3 border-b-2 border-dashed border-stone-100 pb-4 last:border-b-0 last:pb-0">
                            {/* Main Parent Comment */}
                            <div className="bg-stone-50 rounded-xl p-4 border-2 border-black space-y-2.5 shadow-[2.5px_2.5px_0_0_#000000]">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full overflow-hidden border border-black bg-white shrink-0">
                                    {comment.authorAvatar ? (
                                      <img src={comment.authorAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center font-black bg-[#ddd6fe] text-black text-[10px]">
                                        {comment.authorName.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-black text-black">{comment.authorName}</span>
                                    <UserBadge userId={comment.authorId} />
                                  </div>
                                </div>
                              </div>
                              
                              <p className="text-xs font-sans font-bold text-stone-800 pl-8 leading-relaxed">
                                {comment.content}
                              </p>

                              {/* Comment Actions: Like and Reply */}
                              <div className="pl-8 pt-1 flex items-center gap-3">
                                {/* Like comment button */}
                                <button
                                  onClick={() => handleLikeComment(comment)}
                                  className={`flex items-center gap-1 text-[10px] font-mono font-black uppercase px-2 py-1 rounded border border-black shadow-[1px_1px_0_0_#000000] cursor-pointer transition-all hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] active:translate-x-0 active:translate-y-0 active:shadow-none ${
                                    isLiked ? "bg-[#ec4899] text-white" : "bg-white text-stone-700 hover:bg-stone-50"
                                  }`}
                                >
                                  <ThumbsUp className={`h-3 w-3 ${isLiked ? "fill-white text-white" : "text-black"}`} />
                                  <span>{likesCount} likes</span>
                                </button>

                                {/* Reply comment trigger */}
                                <button
                                  onClick={() => setReplyingToCommentId(isReplying ? null : comment.id)}
                                  className={`flex items-center gap-1 text-[10px] font-mono font-black uppercase px-2 py-1 rounded border border-black shadow-[1px_1px_0_0_#000000] cursor-pointer transition-all hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] ${
                                    isReplying ? "bg-black text-white" : "bg-white text-stone-750 hover:bg-stone-50"
                                  }`}
                                >
                                  <CornerDownRight className="h-3 w-3" />
                                  <span>Reply</span>
                                </button>
                              </div>
                            </div>

                            {/* Reply Input Form under the comment */}
                            {isReplying && (
                              <form onSubmit={(e) => handleAddReply(e, comment.id)} className="pl-8 pt-1 flex gap-2 font-mono">
                                <input
                                  type="text"
                                  value={replyContents[comment.id] || ""}
                                  onChange={(e) => setReplyContents({ ...replyContents, [comment.id]: e.target.value })}
                                  placeholder={`Reply to @${comment.authorName}...`}
                                  className="flex-1 bg-white border-2 border-black rounded-lg px-3 py-2 text-xs text-black font-bold focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  className="px-3.5 py-2 rounded-lg bg-[#ddd6fe] hover:bg-[#c084fc] border-2 border-black text-black font-black text-xs shadow-[2px_2px_0_0_#000000] cursor-pointer"
                                >
                                  Send
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReplyingToCommentId(null)}
                                  className="px-2.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 border border-black text-black font-black text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </form>
                            )}

                            {/* Nested Replies lists */}
                            {replies.length > 0 && (
                              <div className="pl-6 border-l-4 border-black border-dashed space-y-3 ml-4 mt-2">
                                {replies.map((reply) => {
                                  const replyLiked = auth.currentUser ? (reply.likes || []).includes(auth.currentUser.uid) : false;
                                  const replyLikesCount = (reply.likes || []).length;
                                  return (
                                    <div key={reply.id} className="bg-amber-50/20 rounded-xl p-3 border-2 border-black space-y-2 shadow-[1.5px_1.5px_0_0_#000000]">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <div className="h-5 w-5 rounded-full overflow-hidden border border-black bg-white shrink-0">
                                            {reply.authorAvatar ? (
                                              <img src={reply.authorAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                              <div className="h-full w-full flex items-center justify-center font-black bg-[#fed7aa] text-black text-[9px]">
                                                {reply.authorName.charAt(0).toUpperCase()}
                                              </div>
                                            )}
                                          </div>
                                          <span className="text-[11px] font-black text-black">{reply.authorName}</span>
                                          <UserBadge userId={reply.authorId} />
                                          <span className="text-[9px] font-mono text-stone-500 bg-stone-150 border border-stone-300 px-1 rounded uppercase">Reply</span>
                                        </div>
                                      </div>
                                      
                                      <p className="text-xs font-sans font-bold text-stone-800 pl-6 leading-relaxed">
                                        {reply.content}
                                      </p>

                                      <div className="pl-6">
                                        <button
                                          onClick={() => handleLikeComment(reply)}
                                          className={`flex items-center gap-1 text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded border border-black shadow-[1px_1px_0_0_#0 Black] cursor-pointer transition-all hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] ${
                                            replyLiked ? "bg-[#ec4899] text-white" : "bg-white text-stone-700 hover:bg-stone-50"
                                          }`}
                                        >
                                          <ThumbsUp className={`h-2.5 w-2.5 ${replyLiked ? "fill-white text-white" : "text-black"}`} />
                                          <span>{replyLikesCount} likes</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Comment Submission Form */}
                <form onSubmit={handleSubmitComment} className="pt-4 flex gap-2 font-mono">
                  <input
                    type="text"
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    disabled={commentSubmitLoading}
                    placeholder="Submit positive comments or questions here..."
                    className="flex-1 bg-white border-2 border-black focus:outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] rounded-lg px-4 py-3 text-xs text-black font-bold shadow-[2px_2px_0_0_#000000] focus:shadow-[3px_3px_0_0_#000000]"
                  />
                  <button
                    id="btn-comment-submit"
                    type="submit"
                    disabled={commentSubmitLoading || !commentContent.trim()}
                    className="flex h-11 px-4 items-center gap-1.5 rounded-lg bg-[#ddd6fe] hover:bg-[#c084fc] border-2 border-black text-black font-black hover:translate-x-[-1px] hover:translate-y-[-1px] text-xs shadow-[2px_2px_0_0_#000000] hover:shadow-[3px_3px_0_0_#000000] transition-all active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-45"
                  >
                    {commentSubmitLoading ? (
                      <Loader className="h-4 w-4 animate-spin text-black" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 text-black stroke-[2.5px]" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            // Forum list flow
            <div className="space-y-6">
              {/* Form creation drawer trigger */}
              <div className="bg-white border-4 border-black p-6 rounded-2xl shadow-[6px_6px_0_0_#000000] flex items-center justify-between gap-6 flex-wrap">
                <div>
                  <h2 className="text-lg font-sans font-black text-black flex items-center gap-1.5">
                    <Sparkles className="h-5 w-5 text-black fill-yellow-300" />
                    Open Source Discussion Forum
                  </h2>
                  <p className="text-xs text-stone-700 font-bold leading-relaxed mt-1">
                    Converse with developers, share system configs, advertise repository metrics, and upvote migration workflows.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreatePost(!showCreatePost)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#67e8f9] border-3 border-black px-4 py-2.5 text-xs font-black text-black uppercase hover:translate-x-[-1px] hover:translate-y-[-1px] shadow-[3px_3px_0_0_#000000] hover:shadow-[4px_4px_0_0_#000000] transition-all cursor-pointer active:translate-x-0 active:translate-y-0 active:shadow-none"
                >
                  <PlusCircle className="h-4 w-4 text-black stroke-[2.5px]" />
                  <span>{showCreatePost ? "Collapse drafts" : "Draft New Post"}</span>
                </button>
              </div>

              {/* POST CREATION FORM GRAPHICS */}
              {showCreatePost && (
                <form onSubmit={handleCreatePost} className="bg-[#fbcfe8] border-4 border-black p-6 rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-4">
                  <h3 className="text-sm font-sans font-black text-black uppercase tracking-wider bg-white border border-black inline-block px-2.5 py-1 rounded">Draft New Alternative Hub Topic</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-1.5">
                        Post Title
                      </label>
                      <input
                        type="text"
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                        placeholder="e.g. Migrated off Firebase to Supabase yesterday, notes inside!"
                        className="w-full bg-white border-2 border-black focus:outline-none rounded-lg px-3 py-2.5 text-xs text-black placeholder-stone-500 font-bold transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-1.5">
                        Category Area
                      </label>
                      <select
                        value={newPostCategory}
                        onChange={(e) => setNewPostCategory(e.target.value)}
                        className="w-full bg-white border-2 border-black rounded-lg px-3 py-2.5 font-bold text-black focus:outline-none"
                      >
                        <option value="General">General Talk</option>
                        <option value="Showcase">SaaS Showcase (Advertise my product)</option>
                        <option value="Feedback">Request App feedback</option>
                        <option value="Questions">Troubleshooting Questions</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-1.5">
                      Tags (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={newPostTags}
                      onChange={(e) => setNewPostTags(e.target.value)}
                      placeholder="e.g. migration, supabase, serverless, nodejs"
                      className="w-full bg-white border-2 border-black focus:outline-none rounded-lg px-3 py-2.5 text-xs text-black placeholder-stone-500 font-bold transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-1.5">
                      Markdown Content Body
                    </label>
                    <textarea
                      rows={5}
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Express your ideas, copy-paste snippets or details. Supports full markdown!"
                      className="w-full bg-white border-2 border-black focus:outline-none rounded-lg px-3 py-3 text-xs text-black placeholder-stone-500 font-bold transition"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      id="btn-post-submit"
                      type="submit"
                      disabled={postSubmitLoading || !newPostTitle.trim() || !newPostContent.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-[#86efac] text-black font-black border-2 border-black px-5 py-2.5 text-xs uppercase shadow-[2px_2px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#000000] transition-all disabled:opacity-45 cursor-pointer"
                    >
                      {postSubmitLoading ? (
                        <Loader className="h-4 w-4 animate-spin text-black" />
                      ) : (
                        <span>Publish Forum Post</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Forum search and filter box */}
              <div className="bg-white border-4 border-black p-4 rounded-xl flex items-center justify-between shadow-[4px_4px_0_0_#000000]">
                <div className="relative w-full">
                  <span className="absolute left-3.5 top-3 text-black font-black uppercase font-mono text-xs">
                    SEARCH TOPICS &rarr;
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter posts by title, body content, author, tags..."
                    className="w-full bg-white border-2 border-black rounded-lg pl-36 pr-4 py-2.5 text-xs text-black font-bold focus:outline-none placeholder-stone-500"
                  />
                </div>
              </div>

              {/* Forum thread listing */}
              {forumLoading ? (
                <div className="bg-white border-4 border-black p-20 text-center flex flex-col items-center justify-center space-y-3 rounded-2xl shadow-[6px_6px_0_0_#000000] font-mono">
                  <Loader className="h-8 w-8 text-black animate-spin stroke-[2.5px]" />
                  <p className="text-[10px] text-stone-700 font-black uppercase tracking-wider">Syncing forum boards payload...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts
                    .filter((post) => {
                      const lower = search.toLowerCase();
                      return (
                        post.title.toLowerCase().includes(lower) ||
                        post.content.toLowerCase().includes(lower) ||
                        post.authorName.toLowerCase().includes(lower) ||
                        (post.tags && post.tags.some(t => t.toLowerCase().includes(lower)))
                      );
                    })
                    .map((post) => {
                    const liked = !!postLikes[post.id];
                    return (
                      <div
                        key={post.id}
                        id={`post-list-item-${post.id}`}
                        onClick={() => {
                          appCache.setScrollPosition("community_forum_scroll", window.scrollY);
                          setSelectedPost(post);
                        }}
                        className="group bg-white border-4 border-black hover:bg-[#fffbeb] cursor-pointer rounded-2xl p-5 md:p-6 shadow-[5px_5px_0_0_#000000] hover:shadow-[7px_7px_0_0_#000000] transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-black uppercase tracking-wider text-black bg-[#ddd6fe] border-2 border-black px-2.5 py-0.5 rounded shadow-[1px_1px_0_0_#000000]">
                              {post.category}
                            </span>
                            <span className="text-[10px] font-mono text-stone-550 font-black uppercase bg-stone-100 border border-black px-2 py-0.5 rounded">
                              {new Date(post.createdAt?.toDate ? post.createdAt.toDate() : post.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="text-lg font-sans font-black text-black tracking-tight group-hover:text-violet-700 group-hover:underline transition truncate">
                            {post.title}
                          </h3>

                          <p className="text-xs text-stone-700 font-bold line-clamp-2 leading-relaxed">
                            {post.content}
                          </p>
                        </div>

                        {/* bottom profile details tags and like/comment counts */}
                        <div className="pt-3.5 border-t-2 border-dashed border-black flex items-center justify-between text-xs flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 text-black font-black font-mono">
                            <User className="h-4 w-4 text-black stroke-[2.5px]" />
                            <span>{post.authorName}</span>
                            <UserBadge userId={post.authorId} />
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikePost(post);
                              }}
                              className={`flex items-center gap-1.5 border-2 border-black px-2.5 py-1 rounded-md text-xs font-black shadow-[1.5px_1.5px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all active:translate-x-0 active:translate-y-0 active:shadow-none ${
                                liked ? "bg-[#ec4899] text-white" : "bg-[#fed7aa] text-black"
                              }`}
                            >
                              <ThumbsUp className="h-3.5 w-3.5 shrink-0 stroke-[2.5px]" />
                              <span className="font-mono text-[10px] font-black">{post.likesCount}</span>
                            </button>
                            <span className="flex items-center gap-1.5 bg-stone-100 border-2 border-black px-2.5 py-1 rounded-md text-black font-black font-mono shadow-[1.5px_1.5px_0_0_#000000]">
                              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                              <span className="text-[10px]">{post.commentsCount}</span>
                            </span>
                            <button
                              onClick={(e) => handleSharePost(e, post)}
                              className="flex items-center gap-1.5 bg-[#86efac] border-2 border-black px-2.5 py-1 rounded-md text-black font-black font-mono shadow-[1.5px_1.5px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all active:translate-x-0 active:translate-y-0 active:shadow-none cursor-pointer"
                              title="Copy post share link"
                            >
                              <Share2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="text-[10px]">Share</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TABS CONTAINER: POLLS */}
      {activeTab === "polls" && (
        <div className="space-y-6">
          {/* Header section with Create Poll button */}
          <div className="bg-white border-4 border-black p-6 rounded-2xl shadow-[5px_5px_0_0_#000000] flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-sans font-black text-black">SaaS Alternative Polls</h2>
              <p className="text-xs text-stone-600 mt-1 font-sans">
                Vote, discuss, and gain real-time community insight into SaaS software options.
              </p>
            </div>
            <button
              onClick={() => {
                if (!auth.currentUser) {
                  onLogin();
                } else {
                  setShowCreatePoll(!showCreatePoll);
                }
              }}
              className="bg-[#fed7aa] text-black border-2 border-black font-black px-4 py-3 rounded-lg flex items-center gap-1.5 text-xs uppercase shadow-[2.5px_2.5px_0_0_#000000] hover:translate-x-[-1.5px] hover:translate-y-[-1.5px] hover:shadow-[3px_3px_0_0_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none cursor-pointer transition-all"
            >
              <PlusCircle className="h-4 w-4 stroke-[2.5px]" />
              {showCreatePoll ? "Cancel Form" : "Create New Poll"}
            </button>
          </div>

          {/* Creation Form block */}
          {showCreatePoll && (
            <div id="create-poll-card" className="bg-white border-4 border-black p-6 rounded-2xl shadow-[6px_6px_0_0_#000000] space-y-4 animate-in fade-in duration-300">
              <h3 className="text-sm font-black text-black uppercase tracking-wider bg-[#86efac] border-2 border-black px-2.5 py-1 rounded inline-block shadow-[2px_2px_0_0_#000000]">
                🚀 Frame a New Community Poll
              </h3>
              <form onSubmit={handleCreatePoll} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-1.5">
                    What SaaS alternative question is on your mind? (min 3 chars)
                  </label>
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    required
                    placeholder="e.g., Which Firebase alternative are you actively using for mobile apps?"
                    className="w-full bg-stone-50 border-2 border-black rounded-lg px-3 py-2.5 text-xs text-black font-bold focus:bg-white transition"
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider">
                    Poll Answer Options (min 2, max 6 options)
                  </label>
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                       <span className="font-mono text-[10px] font-black bg-stone-100 border-2 border-black h-8 w-8 rounded flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const copy = [...pollOptions];
                          copy[i] = e.target.value;
                          setPollOptions(copy);
                        }}
                        required
                        placeholder={`Option ${i + 1} text`}
                        className="flex-1 bg-stone-50 border-2 border-black rounded-lg px-3 py-1.5 text-xs text-black font-semibold focus:bg-white transition"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...pollOptions];
                            copy.splice(i, 1);
                            setPollOptions(copy);
                          }}
                          className="bg-white border-2 border-black font-black p-1.5 rounded hover:bg-red-100 text-red-600 shadow-[1px_1px_0_0_#000000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition-all cursor-pointer font-bold leading-none align-middle"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  {pollOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions([...pollOptions, ""])}
                      className="bg-stone-50 border-2 border-black hover:bg-stone-100 px-3 py-1.5 rounded text-[10px] font-bold text-black flex items-center gap-1 cursor-pointer transition-all active:translate-y-[0.5px] uppercase font-black tracking-wide"
                    >
                      + Add Option Field
                    </button>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={pollSubmitLoading}
                    className="bg-[#86efac] text-black border-2 border-black font-black px-4 py-2.5 rounded-lg text-xs uppercase shadow-[2px_2px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {pollSubmitLoading ? "Publishing..." : "Publish Poll"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPollQuestion("");
                      setPollOptions(["", ""]);
                      setShowCreatePoll(false);
                    }}
                    className="bg-white text-black border-2 border-black font-black px-4 py-2.5 rounded-lg text-xs uppercase hover:bg-stone-100 transition-all cursor-pointer font-extrabold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Loader or Polls list */}
          {pollsLoading ? (
            <div className="py-12 text-center flex items-center justify-center gap-1.5">
              <Loader className="h-4 w-4 animate-spin text-black" />
              <span className="text-xs text-stone-600 font-extrabold font-mono uppercase tracking-widest animate-pulse">
                Synchronizing Polls...
              </span>
            </div>
          ) : polls.length === 0 ? (
            <div className="bg-white border-4 border-black p-12 rounded-2xl text-center shadow-[4px_4px_0_0_#000000]">
              <BarChart3 className="mx-auto h-12 w-12 text-black mb-4 stroke-[2]" />
              <h3 className="font-sans font-black text-lg text-black">No Active Polls Yet</h3>
              <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
                Be the first to challenge the scene! Frame a SaaS Alternative poll to gather votes from the community.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {polls.map((poll) => {
                const votedOptionId = userVotes[poll.id];
                const hasVoted = !!votedOptionId;
                const totalPollVotes = poll.totalVotes || 0;

                return (
                  <div
                    key={poll.id}
                    id={`poll-card-${poll.id}`}
                    className="bg-white border-4 border-black p-5 md:p-6 rounded-2xl shadow-[5px_5px_0_0_#000000] flex flex-col justify-between space-y-4 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0_0_#000000] transition-all"
                  >
                    <div className="space-y-3.5">
                      {/* Poll card header */}
                      <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full border border-black overflow-hidden bg-[#ddd6fe] flex items-center justify-center font-black text-[9px]">
                            {poll.creatorAvatar ? (
                              <img src={poll.creatorAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              poll.creatorName ? poll.creatorName.charAt(0).toUpperCase() : "P"
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-black leading-none">{poll.creatorName}</p>
                            <span className="text-[8px] font-mono font-bold text-stone-500 uppercase leading-none">
                              {new Date(poll.createdAt?.toDate ? poll.createdAt.toDate() : poll.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <span className="font-mono text-[9px] font-black uppercase text-black bg-[#86efac] border border-black px-2 py-0.5 rounded shadow-[1px_1px_0_0_#000000]">
                          🗳️ {totalPollVotes} {totalPollVotes === 1 ? "vote" : "votes"}
                        </span>
                      </div>

                      {/* Question */}
                      <h4 className="font-sans font-black text-sm text-black leading-snug">
                        {poll.question}
                      </h4>

                      {/* Options list */}
                      <div className="space-y-2.5 pt-1">
                        {poll.options.map((option) => {
                          const optionVoteCount = option.votes || 0;
                          const percent = totalPollVotes > 0 ? Math.round((optionVoteCount / totalPollVotes) * 100) : 0;
                          const isOptionSelectedByMe = votedOptionId === option.id;

                          if (hasVoted) {
                            return (
                              <div key={option.id} className="space-y-1">
                                <div className="flex justify-between items-center text-xs font-bold text-black gap-2">
                                  <span className="truncate flex items-center gap-1.5">
                                    {option.text}
                                    {isOptionSelectedByMe && (
                                      <span className="text-[8px] uppercase font-black bg-black text-white px-1.5 py-0.5 rounded border border-neutral-800">
                                        Selected
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-mono text-[10px] font-black">
                                    {optionVoteCount} ({percent}%)
                                  </span>
                                </div>
                                <div className="w-full bg-stone-100 border border-black h-4 rounded overflow-hidden p-[1px]">
                                  <div
                                    style={{ width: `${percent}%` }}
                                    className={`h-full border border-black rounded transition-all duration-500 ${
                                      isOptionSelectedByMe ? "bg-[#a855f7] border-purple-950" : "bg-[#fbcfe8]"
                                    }`}
                                  />
                                </div>
                              </div>
                            );
                          }

                          // Interactive Option button
                          return (
                            <button
                              key={option.id}
                              onClick={() => handleCastVote(poll.id, option.id)}
                              className="w-full group text-left flex items-center justify-between border-2 border-black bg-stone-50 hover:bg-stone-100 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[2px_2px_0_0_#000000] focus:ring-1 focus:ring-black px-3.5 py-2.5 rounded-xl font-bold text-xs text-black cursor-pointer shadow-[1px_1px_0_0_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
                            >
                              <span className="truncate leading-none font-bold">{option.text}</span>
                              <span className="font-mono text-[9px] uppercase font-black text-stone-500 opacity-0 group-hover:opacity-100 transition-all">
                                Vote ⚡
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footeractions */}
                    {auth.currentUser && poll.creatorId === auth.currentUser.uid && (
                      <div className="flex justify-end pt-2 border-t border-stone-100">
                        <button
                          onClick={() => handleDeletePoll(poll.id)}
                          className="bg-white hover:bg-red-50 text-red-600 border border-black font-bold text-[9px] uppercase px-2 py-1 rounded shadow-[1px_1px_0_0_#000000] hover:translate-y-[-0.5px] cursor-pointer"
                        >
                          ✕ Delete Poll
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TABS CONTAINER: USER PROFILE */}
      {activeTab === "profile" && (
        // Profile and creations management flow
        <div id="profile-management-panel" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile form section */}
          <div className={`lg:col-span-1 bg-white border-4 p-6 space-y-6 rounded-2xl transition-all duration-500 ${
            profile?.tier === "test_1rs"
              ? "border-emerald-500 shadow-[6px_6px_0_0_#10b981]"
              : profile?.tier === "pro"
              ? "border-orange-500 shadow-[6px_6px_0_0_#f97316]"
              : profile?.tier === "enterprise"
              ? "border-purple-600 shadow-[8px_8px_0_0_#7c3aed] ring-4 ring-purple-400/30 shadow-[0_0_15px_rgba(124,58,237,0.35)]"
              : "border-black shadow-[6px_6px_0_0_#000000]"
          }`}>
            <h3 className="text-sm font-sans font-black text-black uppercase tracking-wider bg-[#86efac] border-2 border-black px-2.5 py-1 rounded inline-block flex items-center gap-1.5 max-w-max shadow-[2px_2px_0_0_#000000]">
              <ShieldCheck className="h-4 w-4 text-black stroke-[2.5px]" /> Public Profile
            </h3>

            {profileLoading && !profile ? (
              <div className="py-8 text-center flex items-center justify-center gap-1.5">
                <Loader className="h-4 w-4 animate-spin text-black" />
                <span className="text-xs text-stone-600 font-extrabold font-mono uppercase tracking-widest">Loading stats...</span>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4 font-sans text-xs">
                {profile?.tier && profile.tier !== "free" && (
                  <div className="bg-[#f0fdf4] border-2 border-emerald-500 rounded-xl p-3 flex flex-col gap-1 shadow-[2.5px_2.5px_0_0_#10b981]">
                    <span className="text-[9px] font-mono font-black uppercase text-emerald-800">Your Active Upgrade Tier:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <UserBadge userId={auth.currentUser?.uid || ""} />
                      <span className="text-xs font-black text-black">
                        {profile.tier === "test_1rs" && "₹1 Premier Tester"}
                        {profile.tier === "pro" && "Alt Pro Supporter"}
                        {profile.tier === "enterprise" && "Product Scale Executive"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Gamification Badges Section */}
                <div className="border-t-2 border-dashed border-black/20 pt-4 mt-2">
                  <div className="flex items-center justify-between mb-2 pb-1">
                    <span className="text-[10px] font-mono font-black text-stone-900 uppercase tracking-wider flex items-center gap-1">
                      🏆 Lifetime Medals & Badges
                    </span>
                    <span className="text-[9.5px] font-mono font-black text-blue-800 bg-blue-50 border-2 border-blue-400 px-2 rounded">
                      Rank Lvl: {userSubmittedProjects.length >= 2 ? "Gold Master" : userSubmittedProjects.length >= 1 ? "Elite Miner" : "Base Builder"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 font-sans">
                    {/* Achievement badge 1: Joined */}
                    <div className="bg-orange-50 border-2 border-stone-800 rounded-lg p-2.5 flex flex-col items-center justify-center text-center shadow-[1.5px_1.5px_0_0_#1c1917] hover:scale-[1.03] transition-all">
                      <span className="text-lg">🛡️</span>
                      <span className="text-[9.5px] font-black leading-tight text-stone-900 mt-1">Alt Crusader</span>
                      <span className="text-[8px] text-stone-500 font-bold leading-tight mt-0.5">Joined alternative software directory</span>
                    </div>

                    {/* Achievement badge 2: Submitter */}
                    <div className={`border-2 rounded-lg p-2.5 flex flex-col items-center justify-center text-center transition-all ${
                      userSubmittedProjects && userSubmittedProjects.length > 0 
                        ? "bg-amber-100 border-amber-500 shadow-[1.5px_1.5px_0_0_#b45309] hover:scale-[1.03]" 
                        : "bg-stone-50 border-dashed border-stone-400 opacity-60"
                    }`}>
                      <span className="text-lg">🌿</span>
                      <span className="text-[9.5px] font-black leading-tight text-stone-900 mt-1">Seed Sower</span>
                      <span className="text-[8px] text-stone-500 font-bold leading-tight mt-0.5">
                        {userSubmittedProjects && userSubmittedProjects.length > 0 ? `Showcased ${userSubmittedProjects.length} Custom SaaS` : "List first SaaS to unlock"}
                      </span>
                    </div>

                    {/* Achievement badge 3: Credit Baron */}
                    <div className={`border-2 rounded-lg p-2.5 flex flex-col items-center justify-center text-center transition-all ${
                      currentUserCredits && currentUserCredits >= 50 
                        ? "bg-yellow-100 border-yellow-500 shadow-[1.5px_1.5px_0_0_#ca8a04] hover:scale-[1.03]" 
                        : "bg-stone-50 border-dashed border-stone-400 opacity-60"
                    }`}>
                      <span className="text-lg">💎</span>
                      <span className="text-[9.5px] font-black leading-tight text-stone-900 mt-1">Credit Baron</span>
                      <span className="text-[8px] text-stone-500 font-bold leading-tight mt-0.5">
                        {currentUserCredits && currentUserCredits >= 50 ? `Active balance is ${currentUserCredits} credits` : "Unlocks at 50+ credits balance"}
                      </span>
                    </div>

                    {/* Achievement badge 4: Elite Supporter */}
                    <div className={`border-2 rounded-lg p-2.5 flex flex-col items-center justify-center text-center transition-all ${
                      profile?.tier && profile?.tier !== "free"
                        ? "bg-purple-150 border-purple-500 shadow-[1.5px_1.5px_0_0_#7c3aed] hover:scale-[1.03]" 
                        : "bg-stone-50 border-dashed border-stone-400 opacity-60"
                    }`}>
                      <span className="text-lg">🌟</span>
                      <span className="text-[9.5px] font-black leading-tight text-stone-900 mt-1">Sponsoring Patron</span>
                      <span className="text-[8px] text-stone-500 font-bold leading-tight mt-0.5">
                        {profile?.tier && profile?.tier !== "free" ? "Unlocked Premium VIP Supporter Badge" : "Unlock by backing any upgrade plan"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-1.5">
                    Screen Display Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    required
                    className="w-full bg-white border-2 border-black rounded-lg px-3 py-2.5 text-xs text-black font-bold transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-1.5">
                    Custom Avatar URL
                  </label>
                  <input
                    type="text"
                    value={customAvatar}
                    onChange={(e) => setCustomAvatar(e.target.value)}
                    placeholder="Place custom avatar PNG/JPG link"
                    className="w-full bg-white border-2 border-black rounded-lg px-3 py-2.5 text-xs text-black font-semibold transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-1.5">
                    Personal Site / Portfolio URL
                  </label>
                  <div className="relative">
                    <Link className="absolute left-3 top-3 h-4 w-4 text-black stroke-[2.5px]" />
                    <input
                      type="url"
                      value={customWeb}
                      onChange={(e) => setCustomWeb(e.target.value)}
                      placeholder="https://myportfolio.com"
                      className="w-full bg-white border-2 border-black rounded-lg pl-9 pr-3 py-2.5 text-xs text-black font-semibold transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black text-black uppercase tracking-wider mb-1.5">
                    Biographical / Workspace Bio String
                  </label>
                  <textarea
                    rows={4}
                    value={customBio}
                    onChange={(e) => setCustomBio(e.target.value)}
                    placeholder="I build developer engines and open source alternatives..."
                    className="w-full bg-white border-2 border-black rounded-lg px-3 py-2.5 text-xs text-black leading-relaxed font-semibold transition"
                  />
                </div>

                <div className="pt-2">
                  <button
                    id="btn-profile-save"
                    type="submit"
                    disabled={profileSaving}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-black hover:bg-stone-900 border-2 border-black text-white font-black px-4 py-3.5 text-xs uppercase shadow-[3px_3px_0_0_#90e0ef] hover:shadow-[4px_4px_0_0_#90e0ef] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000000] cursor-pointer transition-all"
                  >
                    {profileSaving ? (
                      <Loader className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 text-green-300 stroke-[2.5px]" />
                        <span>Save Profile Edits</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* User's SaaS projects listings */}
          <div className="lg:col-span-2 bg-white border-4 border-black p-6 space-y-6 rounded-2xl shadow-[6px_6px_0_0_#000000]">
            <div className="border-b-2 border-black pb-3.5 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-base font-sans font-black text-black uppercase tracking-wider">My Profile Hub</h3>
                <p className="text-[10px] text-stone-700 font-bold leading-relaxed font-sans mt-0.5">Manage your submitted products and bookmarked favorites</p>
              </div>
              <div className="flex bg-stone-100 border-2 border-black rounded-lg p-1 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveSubTab("creations")}
                  className={`px-3 py-1.5 font-black uppercase rounded-md transition-all cursor-pointer ${
                    activeSubTab === "creations" ? "bg-black text-white shadow-none" : "hover:bg-stone-200 text-black"
                  }`}
                >
                  My Creations ({userSubmittedProjects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("bookmarks")}
                  className={`px-3 py-1.5 font-black uppercase rounded-md transition-all cursor-pointer ${
                    activeSubTab === "bookmarks" ? "bg-black text-white shadow-none" : "hover:bg-stone-200 text-black"
                  }`}
                >
                  Bookmarked Favorites ({userBookmarkedProjects.length})
                </button>
              </div>
            </div>

            {activeSubTab === "creations" ? (
              userSubmittedProjects.length === 0 ? (
                <div className="border-4 border-dashed border-stone-300 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <PlusCircle className="h-8 w-8 text-black stroke-[1.5px]" />
                  <div>
                    <p className="text-xs font-black text-black uppercase">No Submitted Projects Yet</p>
                    <p className="text-[11px] text-stone-600 font-bold max-w-sm leading-relaxed mt-1 font-sans">
                      Showcase your indie SaaS, code setups, or utilities! Navigate to "Submit Personal SaaS" now to submit your discovery candidate.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userSubmittedProjects.map((p) => (
                    <div key={p.id} className="border-2 border-black rounded-xl p-4 flex items-center justify-between gap-4 font-sans text-xs bg-stone-50 shadow-[3px_3px_0_0_#000000]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 
                            onClick={() => onSelectProject?.(p)}
                            className="font-black text-black text-sm leading-normal hover:underline cursor-pointer flex items-center gap-1"
                          >
                            {p.name}
                            <ChevronRight className="h-4.5 w-4.5 stroke-[2.5px]" />
                          </h4>
                          <span className="text-[9px] font-mono font-black bg-[#fed7aa] text-black px-2 py-0.5 border border-black rounded uppercase">
                            {p.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-700 font-bold leading-normal max-w-md line-clamp-2 mt-1">{p.description}</p>
                      </div>

                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ddd6fe] text-black hover:bg-[#c084fc] border-2 border-black shadow-[2px_2px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                        aria-label="Visit project url"
                      >
                        <ExternalLink className="h-4 w-4 text-black stroke-[2.5px]" />
                      </a>
                    </div>
                  ))}
                </div>
              )
            ) : (
              userBookmarkedProjects.length === 0 ? (
                <div className="border-4 border-dashed border-stone-300 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <Bookmark className="h-8 w-8 text-black stroke-[1.5px]" />
                  <div>
                    <p className="text-xs font-black text-black uppercase">No Bookmarks Saved Yet</p>
                    <p className="text-[11px] text-stone-600 font-bold max-w-sm leading-relaxed mt-1 font-sans">
                      Keep track of strategic alternative tools and modular setups! Star and Bookmark candidates inside the Discovery feed.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userBookmarkedProjects.map((p) => (
                    <div key={p.id} className="border-2 border-black rounded-xl p-4 flex items-center justify-between gap-4 font-sans text-xs bg-stone-50 shadow-[3px_3px_0_0_#000000]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 
                            onClick={() => onSelectProject?.(p)}
                            className="font-black text-black text-sm leading-normal hover:underline cursor-pointer flex items-center gap-1"
                          >
                            {p.name}
                            <ChevronRight className="h-4.5 w-4.5 stroke-[2.5px]" />
                          </h4>
                          <span className="text-[9px] font-mono font-black bg-[#86efac] text-black px-2 py-0.5 border border-black rounded uppercase">
                            {p.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-700 font-bold leading-normal max-w-md line-clamp-2 mt-1">{p.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectProject?.(p)}
                          className="px-3 py-2 border-2 border-black rounded bg-[#fbcfe8] hover:bg-[#f472b6] text-black font-black uppercase text-[10px] shadow-[2px_2px_0_0_#000000] cursor-pointer"
                        >
                          Specs & Specs
                        </button>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-black hover:bg-stone-100 border-2 border-black shadow-[2px_2px_0_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                          aria-label="Visit project url"
                        >
                          <ExternalLink className="h-4 w-4 text-black stroke-[2.5px]" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
