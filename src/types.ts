import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  website: string;
  createdAt: any; // Timestamp or date
  updatedAt: any;
  username: string;
  referralSource: string;
  tier?: string;
  credits?: number;
}

export interface PrivateInfo {
  uid: string;
  email: string;
  updatedAt: any;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  tags: string[];
  language: string;
  stars: number;
  forks: number;
  license: string;
  type: "open-source" | "saas";
  alternativeTo?: string;
  submitterId: string;
  submitterName: string;
  rating: number;
  ratingCount: number;
  upvotes: number;
  createdAt: any;
  updatedAt: any;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  category: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: any;
  updatedAt: any;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  createdAt: any;
  parentId?: string;
  likes?: string[];
}

export interface Interaction {
  id: string;
  userId: string;
  userEmail: string;
  actionType: string;
  details: string;
  timestamp: any;
}

export type ViewType =
  | "discover"
  | "community"
  | "compare"
  | "featured"
  | "profile"
  | "submit"
  | "details"
  | "opensource"
  | "opensourcedetails"
  | "trending"
  | "blogs"
  | "pricing"
  | "communitysaas"
  | "aiplanner"
  | "mysaas"
  | "ads"
  | "battle";

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  type: "comment" | "forum" | "project" | "activity";
  read: boolean;
  createdAt: any;
  targetId?: string; // id of post or project
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  totalVotes: number;
  createdAt: any;
}

export interface PollVote {
  userId: string;
  optionId: string;
  createdAt: any;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  createdAt: any;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  plan?: string;
  gateway?: string;
  orderId?: string;
  createdAt: any;
}

