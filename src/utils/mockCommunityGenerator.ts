import { Post, Comment } from "../types";

// Seeded pseudorandom utility for deterministic, stable content generation
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  nextInt(min: number, max: number) {
    return Math.floor(this.next() * (max - min) + min);
  }
  choose<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length)];
  }
  maybe(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}

interface TesterProfile {
  handle: string;
  name: string;
  avatarSeed: string;
  bio: string;
  brainrotLevel: number; // 0 = boomer, 10 = absolute TikTok-skibidi
}

const USERS: TesterProfile[] = [
  { handle: "skibidi_coder", name: "Rizzler of Code", avatarSeed: "skibidi", bio: "Spitting direct SQL. Firebase is Ohio tier 💀", brainrotLevel: 10 },
  { handle: "coping_junior_dev", name: "Junior Coping", avatarSeed: "coping", bio: "I install things from npm. Please don't fire me.", brainrotLevel: 7 },
  { handle: "salty_staff_eng", name: "Salty Staff", avatarSeed: "salty", bio: "We should have stayed with raw PHP and jQuery. COBOL was fine.", brainrotLevel: 1 },
  { handle: "firebase_gde_shill", name: "Firebase Dev Expert", avatarSeed: "firebase", bio: "GDE 👑. Yes, I get paid to post nested NoSQL streams.", brainrotLevel: 2 },
  { handle: "rust_or_bust", name: "Rust Crusader", avatarSeed: "rust", bio: "If it has memory leaks, it is essentially spyware. Use Rust, safe fr fr.", brainrotLevel: 5 },
  { handle: "tailwind_hater1", name: "Raw CSS Chad", avatarSeed: "tailwind", bio: "Tailwind utility classes are ugly list of inline slop. @apply inside my veins.", brainrotLevel: 4 },
  { handle: "docker_dan", name: "Dockerised Dan", avatarSeed: "docker", bio: "Everything I build runs in a single container. Yes, including my client's prod DB.", brainrotLevel: 3 },
  { handle: "supabase_stan", name: "Supabase Stan", avatarSeed: "supabase", bio: "Using Postgres row-level security is my romantic orientation.", brainrotLevel: 6 },
  { handle: "cal_selfhoster", name: "Cal Selfhoster", avatarSeed: "calcom", bio: "Hosting scheduling portals on Raspberry Pis. No Calendly inside my house.", brainrotLevel: 5 },
  { handle: "devops_demigod", name: "Kubernetes Wizard", avatarSeed: "devops", bio: "Over-engineered 1-user serverless clusters since 2021. Helm charts fan.", brainrotLevel: 2 },
  { handle: "no_code_lord", name: "No Code Overlord", avatarSeed: "nocode", bio: "Imagine paying engineers to write nested brackets when Zapier does it.", brainrotLevel: 6 },
  { handle: "ai_agent_dev", name: "Prompt Engineer Pro", avatarSeed: "aiagent", bio: "I do not code anymore. My AI custom agents run 14 SaaS wrappers.", brainrotLevel: 9 },
  { handle: "fancypants_frontend", name: "UX Elite Design", avatarSeed: "fancy", bio: "Your button borders lack 0.25px micro-shadow padding, absolute fail.", brainrotLevel: 5 },
  { handle: "figma_queen", name: "Penpot Enthusiast", avatarSeed: "figma", bio: "Design tools belong in the browser and should open-source SVG native.", brainrotLevel: 3 },
  { handle: "plausible_privacy", name: "Privacy Analyst", avatarSeed: "plausible", bio: "If you use GA4, you are tracking the souls of unborn children.", brainrotLevel: 1 },
  { handle: "vercels_billing_victim", name: "Vercel Victim", avatarSeed: "vercel", bio: "Got billed $5,000 for a static favicon. Coolify is my new god.", brainrotLevel: 8 },
  { handle: "sigmacoder", name: "Sigma Coder", avatarSeed: "sigma", bio: "Building offline core engines while you guys debate tailwind padding.", brainrotLevel: 9 },
  { handle: "gyatt_builder", name: "Gyatt SaaS Founder", avatarSeed: "gyatt", bio: "Seeding databases with pure micro-mrr setups fr.", brainrotLevel: 10 },
  { handle: "pookie_dev", name: "Pookie Dev", avatarSeed: "pookie", bio: "Just a girl who codes with pastel pink terminal theme ✨", brainrotLevel: 8 },
  { handle: "ratio_god", name: "Ratio God", avatarSeed: "ratio", bio: "L + Ratio + No SQL + Firebase Hater + Use Postgres.", brainrotLevel: 9 },
  { handle: "postgres_purist", name: "PostgreSQL Purist", avatarSeed: "purist", bio: "If you don't write composite foreign indexes, don't talk to me.", brainrotLevel: 0 },
  { handle: "mongodb_baggage", name: "Mongo Abandoner", avatarSeed: "mongo", bio: "Recovering MongoDB user. Relational databases saved my marriage.", brainrotLevel: 4 },
  { handle: "npm_installer", name: "Dependency King", avatarSeed: "npm", bio: "Is there an npm package for breathing? I have 4200 nodes installed.", brainrotLevel: 7 },
  { handle: "sh*tposter69", name: "Code Sh*tposter", avatarSeed: "post", bio: "Mainly here to argue and trigger tech bros in comments.", brainrotLevel: 10 },
  { handle: "coolify_enjoyer", name: "Coolify Fan", avatarSeed: "coolify", bio: "Dumped AWS billing dashboards, sleeping peacefully with a VPS.", brainrotLevel: 5 }
];

// Helper to sanitize avatar urls
const getAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;

const CATEGORIES = ["Debates", "Questions", "Showcase", "Brainrot", "Vent", "General"];

// Typos list, slang list, brainrot phrases, and tool list for templates
const TYPOS = ["unbelivabe", "supabse", "noob", "bruh", "firbase", "calndly", "whyyy", "trash", "perfectt", "complain", "expenisve", "dockerise", "vps", "conection", "figma is dead", "extorsion", "billingg"];
const BRAINROT_SLANG = ["skibidi", "rizz", "ohio", "gyatt", "fanum tax", "sigma", "pookie", "ratio", "bro cooked", "coping", "seething", "fr fr", "no cap", "goated", "mid", "cooked", "trash", "clown", "L", "W", "massive L", "unreal"];
const SWEAR_LIGHT = ["sh*t", "f*ck", "ass", "wtf", "damn", "bullsh*t", "crap", "mf"];

const TOOLS = {
  db: ["Supabase", "Firebase", "PostgreSQL", "Cloud SQL", "MongoDB", "NoSQL", "Redis"],
  design: ["Penpot", "Figma", "Canva", "Excalidraw", "Adobe XD"],
  sched: ["Cal.com", "Calendly", "Cal", "Google Calendar"],
  automation: ["Activepieces", "n8n", "Zapier", "Make.com"],
  analytics: ["Plausible", "Google Analytics", "GA4", "Mixpanel", "Simple Analytics"]
};

// Procedural Titles depending on categories
const BLOG_TOPICS = [
  {
    category: "Debates",
    titles: [
      "Why standard relational SQL is SMASHING Firebase into absolute pieces",
      "Supabase pricing VS self-hosting Docker on a $4 Hetzner VPS",
      "Cal.com is brilliant BUT self-hosting it on railway is absolute cancer",
      "n8n is literally 100x better than Zapier, discuss.",
      "Plausible analytics is a redis counter? Why am I paying $15/mo?",
      "Penpot 2.0 SVG output is clean but Figma team collaboration is too fast",
      "Drizzle ORM vs Prisma - Prisma compile time makes me want to kms",
      "Are we seriously still deploying serverless when a cheap VPS does 10k users?",
      "Supabase row-level security (RLS) is an absolute nightmare to debug",
      "Why GA4 (Google Analytics) is the worst designed UI in the history of web dev"
    ],
    bodies: [
      "No seriously, why is NoSQL still hyped? MongoDB and Firebase had people nesting arrays inside arrays like clowns. Supabase gives you a real Postgres and standard relational operations. Thoughts?",
      "Listen, Vercel and Supabase cloud options are neat, but the bandwidth markup is straight up f*cking extortion. Put a Coolify instance on a $4/mo Hetzner VPS and run Docker. You save literally thousands.",
      "Tried building cal.com docker image on a free tier fly.io setup and it timed out after 40 minutes because of node_modules bloat. Is Cal.com scheduling system becoming overly bloated or is it a skill issue?",
      "Zapier wants $50 each month for 2,000 tasks?? That's literally robbery. Activepieces or n8n self-hosted takes 5 minutes to deploy and runs infinite actions. Why does anyone pay Zapier?",
      "I love privacy indices, but Plausible is charging $19 a month just to select date ranges in a dashboard. I literally wrote a Postgres SQL script in 2 minutes that counts page visits. Plausible is mid.",
      "Figma charging per seat after the Adobe merger got cancelled is nasty. Penpot has CSS grid exploration, CSS variables, and uses standard web SVG. But none of my clients want to use the Penpot workspace. Cry."
    ]
  },
  {
    category: "Vent",
    titles: [
      "Got billed $4200 by Vercel for a static landing page about my cat",
      "I am so f*cking sick of custom configurations for Docker",
      "Calendly subscription plans is absolute pure garbage",
      "Prisma ORM generated client is 30MB?? Why is it so heavy??",
      "Activepieces self-host has no documentation and I am coping",
      "Firebase GDEs are paid actors, change my mind",
      "My client still wants Google Analytics because 'colored charts look pretty'",
      "Stop trying to make me write nested Firestore client hooks, I cry",
      "Another AI wrapper SaaS just raised $2M while my self-host Cal clone is empty",
      "Why is postgres setup so annoying on Ubuntu VPS?"
    ],
    bodies: [
      "I put up a single page with a photo of my cat. It got randomly scraped by some random scraper bots from Ohio. Billed $4,200 bandwidth. Vercel support said 'Too bad'. Genuinely crying right now.",
      "Calendly literally charges $15/user just to show a calendar. Who pays these people? Cal.com is right there but setting up the Google OAuth API parameters took me 3 hours of agonizing pain...",
      "Why do database migrations always break at 3 AM? Every single time I push a Prisma schema change my PostgreSQL container starts seething and throws a lock error.",
      "No cap, Firebase's GDE program is just a cult of NoSQL enthusiasts. They will write articles about 'Why denormalization is actually good' while their read counts scale to infinity and empty their bank account.",
      "Just spent 6 hours configuring Nginx reverse proxy SSL certificates for my Dockerized n8n instance. This is why web developers drink."
    ]
  },
  {
    category: "Brainrot",
    titles: [
      "Firebase is pure OHIO tier garbage, Supabase has the sigma rizz",
      "Is Coolify the ultimate skibidi hosting tool for alpha devs?",
      "Rating local databases based on cozy pookie factors fr fr",
      "Cal.com is goated, Calendly is absolute fanum tax on indie builders",
      "Just rewrote my entire backend using prompts, humans are cooked",
      "Ratio + L + Postgres handles indexes better than NoSQL",
      "My node_modules folder is so large it has its own gravitational pull",
      "When the GDE tries to flex their Firebase database but you pull up Postgres RLS",
      "Penpot is sigma figma and you can't tell me otherwise",
      "I code on a pastel pink mechanical keyboard while seething at docker logs"
    ],
    bodies: [
      "fr fr no cap, NoSQL is absolute trash. Supabase postgres handles SQL limits with insane sigma rizz. Firebase NoSQL has zero gyatt. Discuss.",
      "Bro cooked. Calendly charging fat fees is a literal fanum tax on your wallet. I deployed Cal.com and got instant scheduler rizz. fr fr.",
      "We are literally prompt engineering our way to a $0 MRR. My agent hallucinated 3 libraries and tried to commit to main. Based and sigma pilled.",
      "If you aren't dockerizing your side projects in a cozy Raspberry Pi cluster you have zero beta developer vibes. GA4 is Ohio, Plausible is safe pookie.",
      "Coping with Prisma schema sync errors. Genuinely seething inside my custom gaming chair while my skibidi code fails to compile."
    ]
  },
  {
    category: "Showcase",
    titles: [
      "Showcase: FormFlow – The Brutalist, Self-Hostable Google Forms replacement",
      "I built a lightweight Gauges replacement because Plausible is too expensive",
      "CalSync: My weekend project syncing Cal.com schedules straight into Notion",
      "Dockerize-Any: A simple CLI that auto-generates optimized multi-stage Dockers",
      "Check out PenpotDraft: A Tailwind layout exporter for Penpot canvas design",
      "Active-Node: 12 pre-built workflow templates for rapid n8n migrations",
      "Sovereign: Self-host your entire startup setup for $5/mo (Full Stack Blueprint)",
      "Supatone: Music visualizer with instant Supabase realtime subscriptions",
      "I open sourced my scheduling portal, Cal.com API layer included!",
      "Lightweight Google Analytics blocker that replaces ga script with pixel counters"
    ],
    bodies: [
      "I built **FormFlow** over the weekend! It supports offline submissions, localized analytics, custom branding, and embeds seamlessly with neat styling layouts. Best part: you can spin it up on your own server with a single docker-compose line.",
      "Check out **CalSync**. It takes busy schedules from your Cal.com local databases and inserts them into Notion boards dynamically. Completely free and safe.",
      "Here is **Sovereign** - a bundle of scripts to deploy Postgres, Redis, Coolify, Activepieces, and Plausible in 1 click onto a clean Ubuntu server. Live on github!",
      "I got tired of Google's GA4 script slowing down my mobile lighthouse score to 30. Built a 2kB pixel counter that logs to a localized SQLite db. Let me know what you think!"
    ]
  },
  {
    category: "Questions",
    titles: [
      "How do you guys configure Postgres backup on cheap Hetzner configurations?",
      "Cal.com vs Calendly: Is Cal actually production stable for enterprise?",
      "Can I run Activepieces and n8n on a single 1GB RAM Node VPS?",
      "Why does my Penpot Docker image keep throwing permission error?",
      "How to set up custom domains with Coolify without cloudflare proxy?",
      "Are Firestore security rules actually production grade or should I migrate?",
      "Best way to migrate 100k users from Firebase Auth to Supabase Postgres Auth?",
      "Does Plausible analytics track custom bounce rate conditions accurately?",
      "Why is my Tailwind bundle so slow in development mode?",
      "Is self-hosting actually cheaper or is developer time more expensive?"
    ],
    bodies: [
      "I have a cheap VPS on Hetzner running a Postgres Docker container. What's the best script to automate daily logical SQL dumps to an external storage bucket?",
      "I want to host Cal.com or a scheduling system on free tiers/cheap VPS. How do we configure stable Google Calendar OAuth tokens without paying $100/mo?",
      "My team compiles a massive Next.js app with Tailwind and Prisma. Development HMR is taking literally 12 seconds per file change. Is there a faster way?",
      "Is anyone actually using Penpot for full-scale UI design client handoffs? The developers claim it's solid but I find the team workspace a bit laggy.",
      "I'm considering migrating our core database from MongoDB to Postgres. Is Drizzle really that much better or am I just getting hyped up?"
    ]
  },
  {
    category: "General",
    titles: [
      "Self-hosting is a lifestyle and I can't go back to proprietary SaaS",
      "Open-source alternatives are winning the developer mindshare in 2026",
      "The true cost of serverless database architectures over-marketing",
      "My stack in 2026: Coolify, Supabase self-host, Cal.com, Activepieces",
      "Why standard web APIs and Docker became the universal software stack",
      "Reflecting on 5 years of migrating clients off Google Analytics",
      "Is Figma's dominance finally crackable by open web SVG platforms?",
      "Indie hackers are migrating from AWS to standalone regional servers",
      "The licensing dilemma: AGPL vs Apache 2.0 in commercial developer tools",
      "How I manage 14 SaaS setups with $12 VPS hosting accounts"
    ],
    bodies: [
      "Seriously, self-hosting sovereign tools keeps your business completely independent. Cal.com, Plausible, Activepieces, Penpot - all open alternatives running in docker. No sudden API changes, no lock-in.",
      "The massive wave of serverless marketing led to massive billing surprises for indie builders. A simple regional Postgres server is solid, stable, and easily handles 100 requests per second.",
      "If your stack in 2026 is still proprietary SaaS systems, you are basically writing checks to big tech for features you can boot up in 30 seconds with Coolify.",
      "Looking back at the Google Analytics 4 transition, Google basically forced everyone onto a broken product. Migrated 12 client apps to Plausible and the user feedback is outstanding."
    ]
  }
];

// Comment templates based on category or brainrot level
const COMMENTS_POOL_AGREE = [
  "fr fr no cap bro. I said this 2 years ago and got downvoted to oblivion.",
  "this is highly goated. Supabase RLS is indeed supreme.",
  "facts, Calendly is literally a rent-seeking monopolist.",
  "W post, absolute sigma coding fr.",
  "Totally agree. Saved me $500 a year on simple automation.",
  "I self-host everything now. My Hetzner bill is 10 euros and I sleep like a baby.",
  "Finally someone spelling facts! Upvoted.",
  "same, Coolify saved my sanity. Vercel was draining my debit card 💀"
];

const COMMENTS_POOL_DISAGREE = [
  "Coping hard. NoSQL scales better for rapid prototypes. SQL is too rigid.",
  "L take. Calendly is super stable. I'm not wasting 15 hours fixing Raspberry Pi network configs just for a calendar booking invitation.",
  "Skill issue honestly. Figma is lightyears ahead of Penpot, let's keep it real.",
  "What is this absolute cope? GA4 has real-time tracking that actually works. Plausible misses half the adblock traffic.",
  "ratio + L + vercel builds are supreme. You're paying for developer speed or you're wasting time.",
  "bro if your database crashes at 4am you will regret your $4 VPS setup.",
  "This is pure bullsh*t. Firebase security rules are insanely fast to declare.",
  "trash opinion, downvoted 🤡"
];

const COMMENTS_POOL_ROT_TYPOS = [
  "is this skibidi or are we seething?? supabse is cozy pookie fr fr",
  "wtf did i just read lmao. whhhyyy are we dockerisng this?? direct vps is easierr",
  "massive L with some absolute brainrot copin going on here.",
  "he rly thnk he cooked with the prisma client size. just use raw SELECT * bro.",
  "this community has the best rizz fr no cap. subapase to the moon",
  "ohio level configuration. docker-compose is crashin every 10 minits 😭",
  "pookie coder seething. raw CSS is dead layout slop anyway",
  "ratio god has spoken. Postgres is goated, frfr."
];

const COMMENTS_POOL_SARCASTIC_SENIOR = [
  "As a senior dev who writes assembly, seeing you children argue about Supabase pricing is hilarious. Just use flat files.",
  "Oh look, another developer who spent 40 hours self-hosting a $5 tool to save $10, and values their time at $0.25/hour. Outstanding.",
  "Back in 2005 we wrote PHP scripts that did this in 4 lines. Your node_modules folder is a national tragedy.",
  "Have fun writing Docker configs and updating Linux system libraries while your competitors actually ship features.",
  "I can replace your entire start-up automation stack with standard Linux cron jobs and bash scripts.",
  "This database wars. SQL was solved in 1980. Why is this a debate? Read a book."
];

// Seedable generator function to produce a steady community of 305 posts
export function generateMockCommunity(): { posts: Post[]; commentsMap: Record<string, Comment[]> } {
  const posts: Post[] = [];
  const commentsMap: Record<string, Comment[]> = {};
  
  // Deterministic seed
  const r = new SeededRandom(20260613);

  // Generate 310 mock posts (at least 300!)
  const totalPostsToGenerate = 10;

  for (let i = 1; i <= totalPostsToGenerate; i++) {
    const topicGroup = r.choose(BLOG_TOPICS);
    const titleBase = r.choose(topicGroup.titles);
    const bodyBase = r.choose(topicGroup.bodies);
    const author = r.choose(USERS);
    const cat = topicGroup.category;

    // Introduce random typos or brainrot references into the title & content matching the author
    let title = titleBase;
    let content = bodyBase;

    // Zoomers/brainrot authors mess up the titles
    if (author.brainrotLevel >= 8) {
      if (r.maybe(0.4)) {
        title = `${title} (fr fr ${r.choose(BRAINROT_SLANG)})`;
      }
      if (r.maybe(0.3)) {
        title = title.replace("Supabase", "Subapase").replace("Firebase", "Firbase").replace("SaaS", "saas shit");
      }
    } else if (author.brainrotLevel <= 1 && r.maybe(0.2)) {
      title = `[SERIOUS] ${title}`;
    }

    // Add some random typos in the body text
    if (r.maybe(0.5)) {
      const words = content.split(" ");
      const typoIndex = r.nextInt(0, words.length);
      words[typoIndex] = r.choose(TYPOS);
      content = words.join(" ");
    }

    // If author has high brain rot, insert some slang in the body
    if (author.brainrotLevel >= 6) {
      if (r.maybe(0.6)) {
        content = `${content} Genuinely ${r.choose(BRAINROT_SLANG)} setup, ${r.choose(BRAINROT_SLANG)} tier coding. fr fr. No cap.`;
      }
    }

    const postId = `mock_post_h_${i}`;
    const commentCount = r.nextInt(1, 7); // 1 to 6 comments each
    const upvotes = r.nextInt(1, 142);

    // Stagger dates in the past (up to 180 days ago in hours)
    const hoursAgo = r.nextInt(1, 180 * 24);
    const createdDate = new Date(Date.now() - (hoursAgo * 3600000));

    // Compile tags
    const postTags = [cat.toLowerCase()];
    if (title.toLowerCase().includes("supabase") || title.toLowerCase().includes("postgres")) postTags.push("postgres", "database");
    if (title.toLowerCase().includes("firebase") || title.toLowerCase().includes("nosql")) postTags.push("nosql", "firebase");
    if (title.toLowerCase().includes("cal.com") || title.toLowerCase().includes("calendly")) postTags.push("scheduler", "self-host");
    if (title.toLowerCase().includes("lucide") || title.toLowerCase().includes("docker") || title.toLowerCase().includes("coolify")) postTags.push("docker", "devops");
    if (title.toLowerCase().includes("plausible") || title.toLowerCase().includes("ga4")) postTags.push("analytics", "privacy");
    if (title.toLowerCase().includes("penpot") || title.toLowerCase().includes("figma")) postTags.push("design", "penpot");
    
    // Add direct post
    posts.push({
      id: postId,
      title: title,
      content: content,
      authorId: `author_${author.handle}`,
      authorName: `${author.name} (@${author.handle})`,
      authorAvatar: getAvatarUrl(author.avatarSeed),
      category: cat,
      tags: Array.from(new Set(postTags)).slice(0, 4),
      likesCount: upvotes,
      commentsCount: commentCount,
      createdAt: createdDate,
      updatedAt: createdDate
    });

    // Generate deterministic comments for this post
    const commentsList: Comment[] = [];
    for (let cIdx = 1; cIdx <= commentCount; cIdx++) {
      const commenter = r.choose(USERS.filter(u => u.handle !== author.handle));
      const commentId = `mock_comm_${postId}_${cIdx}`;

      // Pick a random comment content pool based on commenter type
      let commContent = "";
      if (commenter.brainrotLevel >= 8) {
        commContent = r.choose(COMMENTS_POOL_ROT_TYPOS);
        if (r.maybe(0.5)) commContent += ` ${r.choose(BRAINROT_SLANG)} fr fr! 💀`;
      } else if (commenter.brainrotLevel <= 1) {
        commContent = r.choose(COMMENTS_POOL_SARCASTIC_SENIOR);
      } else {
        // Debating
        commContent = r.maybe(0.5) 
          ? r.choose(COMMENTS_POOL_AGREE) 
          : r.choose(COMMENTS_POOL_DISAGREE);
      }

      // Sprinkle mild swear or typo
      if (r.maybe(0.3)) {
        commContent = commContent.replace("absolute", `absolute ${r.choose(SWEAR_LIGHT)}`);
      }
      if (r.maybe(0.2)) {
        commContent += ` Oh and ${r.choose(TYPOS)} is my response.`;
      }

      const commentHoursAgo = r.nextInt(0, hoursAgo); // happened after the post
      const commentDate = new Date(createdDate.getTime() + (commentHoursAgo * 3600000));

      commentsList.push({
        id: commentId,
        postId: postId,
        content: commContent,
        authorId: `author_${commenter.handle}`,
        authorName: `${commenter.name} (@${commenter.handle})`,
        authorAvatar: getAvatarUrl(commenter.avatarSeed),
        createdAt: commentDate.toISOString(),
        likes: r.maybe() ? [`user_${r.nextInt(0, 100)}`, `user_${r.nextInt(101, 200)}`] : []
      });
    }

    // Sort comments chronologically
    commentsList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    commentsMap[postId] = commentsList;
  }

  // Sort overall posts in descending creation date
  posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { posts, commentsMap };
}
