import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  ArrowUp,
  Award,
  CheckCircle2,
  Crown,
  Flame,
  Hash,
  HelpCircle,
  Medal,
  MessageSquare,
  Pin,
  Search,
  Send,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { TierBadge } from "@/components/community/TierBadge";
import {
  allBadges,
  authorLabel,
  channels,
  communityClass,
  currentUser,
  filterPosts,
  findEntry,
  getChannel,
  levelFor,
  levelTiers,
  lobbyStats,
  posts as initialPosts,
  relativeFromMinutes,
  risingStars,
  sortPosts,
  students,
  topN,
  uniqueTags,
  type CommunityAnswer,
  type CommunityBadge,
  type CommunityPost,
  type LeaderboardKind,
  type PostSort,
} from "@/data/community";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community - EcoLearn AI" },
      {
        name: "description",
        content:
          "Class lobby, leaderboard, and achievements. Ask questions, help classmates, climb the weekly ladder.",
      },
    ],
  }),
  component: CommunityPage,
});

type Tab = "lobby" | "leaderboard" | "achievements";

function CommunityPage() {
  const [tab, setTab] = useState<Tab>("lobby");
  const [posts, setPosts] = useState<CommunityPost[]>(() => initialPosts);
  const me = currentUser();
  const myLevel = levelFor(me.xp);

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
              Community
            </div>
            <h1 className="font-display text-3xl font-bold mt-1">{communityClass.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {communityClass.term} · {students.length} classmates · class lobby is read-only for
              other classes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <UserChip />
          </div>
        </header>

        <nav
          aria-label="Community sections"
          className="inline-flex rounded-2xl border border-border bg-card p-1 shadow-card"
        >
          <TabButton active={tab === "lobby"} onClick={() => setTab("lobby")} icon={MessageSquare}>
            Lobby
          </TabButton>
          <TabButton
            active={tab === "leaderboard"}
            onClick={() => setTab("leaderboard")}
            icon={Trophy}
          >
            Leaderboard
          </TabButton>
          <TabButton
            active={tab === "achievements"}
            onClick={() => setTab("achievements")}
            icon={Award}
          >
            Achievements
          </TabButton>
        </nav>

        {tab === "lobby" ? <LobbyView posts={posts} setPosts={setPosts} /> : null}
        {tab === "leaderboard" ? <LeaderboardView /> : null}
        {tab === "achievements" ? <AchievementsView level={myLevel} /> : null}
      </div>
    </AppLayout>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof MessageSquare;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-primary text-primary-foreground shadow-soft"
          : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function UserChip() {
  const me = currentUser();
  const { tier } = levelFor(me.xp);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-card">
      <TierBadge level={tier.level} size="sm" />
      <div className="leading-tight">
        <div className="text-sm font-semibold">{me.name}</div>
        <div className="text-[11px] text-muted-foreground">
          Lv {tier.level} · {tier.name}
        </div>
      </div>
    </div>
  );
}

function LobbyView({
  posts,
  setPosts,
}: {
  posts: CommunityPost[];
  setPosts: React.Dispatch<React.SetStateAction<CommunityPost[]>>;
}) {
  const [activeChannel, setActiveChannel] = useState<string>(channels[0]!.id);
  const [activePost, setActivePost] = useState<string | null>(null);
  const [sort, setSort] = useState<PostSort>("hot");
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);

  const channel = getChannel(activeChannel);
  const postsByChannel = useMemo(
    () => posts.filter((p) => p.channelId === activeChannel),
    [posts, activeChannel],
  );
  const channelTags = useMemo(() => uniqueTags(postsByChannel), [postsByChannel]);
  const visiblePosts = useMemo(
    () => sortPosts(filterPosts(postsByChannel, query, activeTags), sort),
    [postsByChannel, query, activeTags, sort],
  );
  const post = activePost ? (posts.find((p) => p.id === activePost) ?? null) : null;

  const switchChannel = (id: string) => {
    setActiveChannel(id);
    setActivePost(null);
    setActiveTags([]);
    setQuery("");
  };

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleCreatePost = (input: NewPostInput) => {
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      channelId: input.channelId,
      authorId: currentUser().id,
      title: input.title.trim(),
      body: input.body.trim(),
      createdAt: "just now",
      ageMinutes: 0,
      votes: 1,
      views: 1,
      tags: input.tags,
      answers: [],
    };
    setPosts((prev) => [newPost, ...prev]);
    setActiveChannel(input.channelId);
    setActivePost(newPost.id);
    setComposeOpen(false);
  };

  const handleAddAnswer = (postId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              answers: [
                ...p.answers,
                {
                  id: `ans-${postId}-${Date.now()}`,
                  authorId: currentUser().id,
                  body: trimmed,
                  createdAt: "just now",
                  ageMinutes: 0,
                  votes: 1,
                  isAccepted: false,
                },
              ],
            }
          : p,
      ),
    );
  };

  return (
    <>
      <section className="grid grid-cols-1 xl:grid-cols-[260px_1fr_360px] gap-5">
        <aside className="rounded-3xl border border-border bg-card p-3 shadow-card h-fit">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Channels
            </div>
            <span className="text-[10px] text-muted-foreground">
              {lobbyStats.channelCount} total
            </span>
          </div>
          <ul className="space-y-1">
            {channels.map((ch) => {
              const isActive = ch.id === activeChannel;
              const count = posts.filter((p) => p.channelId === ch.id).length;
              return (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => switchChannel(ch.id)}
                    className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {ch.pinned ? <Pin className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
                    <span className="flex-1 text-left truncate">{ch.name}</span>
                    <span className="text-[10px] tabular-nums">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 rounded-2xl border border-border p-3 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary inline-block mr-1" />
            Channels per chapter stay anchored to your course. Off-topic chat goes to{" "}
            <strong className="text-foreground">#general</strong>.
          </div>
        </aside>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Hash className="h-4 w-4" />
                <span className="font-semibold text-foreground">{channel?.name ?? "channel"}</span>
                {channel?.pinned ? (
                  <span className="text-[10px] uppercase tracking-widest font-bold text-primary">
                    Pinned
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{channel?.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary text-primary-foreground px-3 py-2 text-sm font-bold shadow-glow"
            >
              <Send className="h-4 w-4" />
              Ask a question
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="inline-flex rounded-xl bg-muted p-1">
              <SortPill active={sort === "hot"} onClick={() => setSort("hot")}>
                <Flame className="h-3.5 w-3.5" /> Hot
              </SortPill>
              <SortPill active={sort === "new"} onClick={() => setSort("new")}>
                <Sparkles className="h-3.5 w-3.5" /> New
              </SortPill>
              <SortPill active={sort === "top"} onClick={() => setSort("top")}>
                <ArrowUp className="h-3.5 w-3.5" /> Top
              </SortPill>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search this channel..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-muted/60 border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {channelTags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mr-1">
                Tags
              </span>
              {channelTags.map((tag) => {
                const active = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
              {activeTags.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveTags([])}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1"
                >
                  Clear
                </button>
              ) : null}
            </div>
          ) : null}

          {visiblePosts.length === 0 ? (
            <EmptyChannel
              hasFilters={query.length > 0 || activeTags.length > 0}
              onClear={() => {
                setQuery("");
                setActiveTags([]);
              }}
            />
          ) : (
            <ul className="space-y-3">
              {visiblePosts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setActivePost(activePost === p.id ? null : p.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition ${
                      activePost === p.id
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <PostSummary post={p} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card h-fit">
          {post ? (
            <PostThread
              post={post}
              onClose={() => setActivePost(null)}
              onAddAnswer={(body) => handleAddAnswer(post.id, body)}
            />
          ) : (
            <ThreadPlaceholder />
          )}
        </div>
      </section>

      {composeOpen ? (
        <ComposeQuestionModal
          defaultChannelId={activeChannel}
          onCancel={() => setComposeOpen(false)}
          onSubmit={handleCreatePost}
        />
      ) : null}
    </>
  );
}

type NewPostInput = {
  title: string;
  body: string;
  channelId: string;
  tags: string[];
};

function ComposeQuestionModal({
  defaultChannelId,
  onCancel,
  onSubmit,
}: {
  defaultChannelId: string;
  onCancel: () => void;
  onSubmit: (input: NewPostInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channelId, setChannelId] = useState(defaultChannelId);
  const [tagsRaw, setTagsRaw] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const titleOk = title.trim().length >= 5;
  const bodyOk = body.trim().length >= 10;
  const canSubmit = titleOk && bodyOk;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim().replace(/^#/, "").toLowerCase())
      .filter((t) => t.length > 0)
      .slice(0, 4);
    onSubmit({ title, body, channelId, tags });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close composer"
        onClick={onCancel}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-xl rounded-3xl bg-card border border-border shadow-card p-6"
      >
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
              Ask the class
            </div>
            <h2 className="font-display text-xl font-bold mt-1">New question</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Clear, specific questions get better answers. Avoid sharing graded-quiz content.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-xl p-2 hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="q-title" className="text-xs font-semibold">
              Title
            </label>
            <input
              id="q-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Be specific. Imagine asking a classmate."
              className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/40 border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm"
              maxLength={140}
              autoFocus
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{titleOk ? "Looks good." : "At least 5 characters."}</span>
              <span>{title.length}/140</span>
            </div>
          </div>

          <div>
            <label htmlFor="q-body" className="text-xs font-semibold">
              Details
            </label>
            <textarea
              id="q-body"
              rows={5}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What you tried, what you expected, what happened. Code snippets welcome."
              className="mt-1 w-full px-3 py-2 rounded-xl bg-muted/40 border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm leading-relaxed"
              maxLength={1200}
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{bodyOk ? "Ready to post." : "At least 10 characters."}</span>
              <span>{body.length}/1200</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="q-channel" className="text-xs font-semibold">
                Channel
              </label>
              <select
                id="q-channel"
                value={channelId}
                onChange={(event) => setChannelId(event.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/40 border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm"
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="q-tags" className="text-xs font-semibold">
                Tags <span className="text-muted-foreground">(comma separated, up to 4)</span>
              </label>
              <input
                id="q-tags"
                value={tagsRaw}
                onChange={(event) => setTagsRaw(event.target.value)}
                placeholder="e.g. loops, python"
                className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/40 border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary text-primary-foreground px-4 py-2 text-sm font-bold shadow-glow disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Post question
          </button>
        </div>
      </form>
    </div>
  );
}

function PostSummary({ post }: { post: CommunityPost }) {
  const author = authorLabel(post.authorId);
  const accepted = post.answers.some((a) => a.isAccepted);
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
        <ArrowUp className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-bold tabular-nums">{post.votes}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm truncate pr-2">{post.title}</h3>
          {accepted ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              Answered
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
              <HelpCircle className="h-3 w-3" />
              Open
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.body}</p>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{author.name}</span>
          <span>·</span>
          <span>{relativeFromMinutes(post.ageMinutes)}</span>
          <span>·</span>
          <span>
            {post.answers.length} {post.answers.length === 1 ? "answer" : "answers"}
          </span>
          <span>·</span>
          <span>{post.views} views</span>
          {post.tags.length > 0 ? (
            <span className="ml-auto flex gap-1">
              {post.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PostThread({
  post,
  onClose,
  onAddAnswer,
}: {
  post: CommunityPost;
  onClose: () => void;
  onAddAnswer: (body: string) => void;
}) {
  const author = authorLabel(post.authorId);
  const [draft, setDraft] = useState("");

  const handleSubmit = () => {
    if (draft.trim().length < 5) return;
    onAddAnswer(draft);
    setDraft("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
          Thread
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
      <div>
        <h3 className="font-display text-lg font-bold leading-tight">{post.title}</h3>
        <div className="text-xs text-muted-foreground mt-1">
          <strong className="text-foreground">{author.name}</strong> ·{" "}
          {relativeFromMinutes(post.ageMinutes)}
        </div>
        <p className="text-sm mt-3 leading-relaxed whitespace-pre-wrap">{post.body}</p>
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 hover:bg-muted"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            {post.votes}
          </button>
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">
          {post.answers.length} {post.answers.length === 1 ? "answer" : "answers"}
        </div>
        {post.answers.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No answers yet. Be the first to help.
          </p>
        ) : (
          <ul className="space-y-3">
            {post.answers.map((answer) => (
              <li key={answer.id}>
                <AnswerCard answer={answer} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <label
          htmlFor={`answer-${post.id}`}
          className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold"
        >
          Your answer
        </label>
        <textarea
          id={`answer-${post.id}`}
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a helpful answer..."
          className="mt-2 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm focus:bg-card focus:border-ring focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">
            {draft.trim().length < 5
              ? "Write at least 5 characters."
              : "Looks good. Be kind and specific."}
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={draft.trim().length < 5}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary text-primary-foreground px-3 py-2 text-sm font-bold shadow-glow disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Post answer
          </button>
        </div>
      </div>
    </div>
  );
}

function AnswerCard({ answer }: { answer: CommunityAnswer }) {
  const author = authorLabel(answer.authorId);
  return (
    <article
      className={`rounded-2xl border p-3 ${
        answer.isAccepted ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`h-9 w-9 rounded-xl grid place-items-center text-xs font-bold shrink-0 ${
            author.isAI ? "bg-warning/15 text-warning" : "gradient-primary text-primary-foreground"
          }`}
        >
          {author.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{author.name}</span>
            {author.isAI ? (
              <span className="text-[10px] font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                AI Tutor
              </span>
            ) : null}
            {answer.isAccepted ? (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Marked helpful
              </span>
            ) : null}
            <span className="text-[11px] text-muted-foreground ml-auto">{answer.createdAt}</span>
          </div>
          <p className="text-sm mt-2 leading-relaxed">{answer.body}</p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              {answer.votes}
            </button>
            {!answer.isAccepted ? (
              <button type="button" className="text-xs text-muted-foreground hover:text-primary">
                Mark helpful
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function ThreadPlaceholder() {
  return (
    <div className="text-center py-12">
      <div className="h-12 w-12 mx-auto rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">
        <MessageSquare className="h-6 w-6" />
      </div>
      <h3 className="font-semibold">Pick a question</h3>
      <p className="text-xs text-muted-foreground mt-1 px-4">
        Open a thread on the left to read the discussion or post your own answer.
      </p>
    </div>
  );
}

function EmptyChannel({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      {hasFilters ? (
        <>
          <p className="text-sm text-muted-foreground">No threads match your filters.</p>
          <button
            type="button"
            onClick={onClear}
            className="mt-3 text-xs font-semibold text-primary hover:underline"
          >
            Clear search and tags
          </button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No threads in this channel yet. Be the first to ask.
        </p>
      )}
    </div>
  );
}

function SortPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-card shadow-soft" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function LeaderboardView() {
  const [kind, setKind] = useState<LeaderboardKind>("weekly-xp");
  const me = currentUser();
  const top15 = useMemo(() => topN(kind, 15), [kind]);
  const myEntry = findEntry(kind, me.id);
  const isMeInTop = myEntry ? myEntry.rank <= 15 : false;
  const stars = useMemo(() => risingStars(3), []);

  const podium = top15.slice(0, 3);
  const rest = top15.slice(3);

  return (
    <section className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-warning/15 via-primary/5 to-transparent"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-warning font-bold">
                  Weekly ranking · resets Monday
                </div>
                <h2 className="font-display text-2xl font-bold flex items-center gap-2 mt-1">
                  <Trophy className="h-6 w-6 text-warning" />
                  Class podium
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {communityClass.name} · top 15 of {students.length}
                </p>
              </div>
              <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1">
                <Pill active={kind === "weekly-xp"} onClick={() => setKind("weekly-xp")}>
                  <Zap className="h-3.5 w-3.5" /> Weekly XP
                </Pill>
                <Pill active={kind === "improvement"} onClick={() => setKind("improvement")}>
                  <TrendingUp className="h-3.5 w-3.5" /> Most improved
                </Pill>
                <Pill active={kind === "helpful"} onClick={() => setKind("helpful")}>
                  <Star className="h-3.5 w-3.5" /> Most helpful
                </Pill>
                <Pill active={kind === "streak"} onClick={() => setKind("streak")}>
                  <Flame className="h-3.5 w-3.5" /> Longest streak
                </Pill>
              </div>
            </div>

            <LayoutGroup id="class-podium">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end">
                <AnimatePresence initial={false} mode="popLayout">
                  {podium.map((entry) => (
                    <motion.div
                      key={entry.student.id}
                      layout
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      className={
                        entry.rank === 1
                          ? "order-1 sm:order-2"
                          : entry.rank === 2
                            ? "order-2 sm:order-1"
                            : "order-3"
                      }
                    >
                      <PodiumPlace entry={entry} accent={accentForRank(entry.rank)} kind={kind} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </LayoutGroup>

            {myEntry ? (
              <YouBanner
                entry={myEntry}
                total={students.length}
                kind={kind}
                inTop={isMeInTop}
                gapToTop15={isMeInTop ? 0 : Math.max(1, top15[14]!.metric - myEntry.metric + 1)}
              />
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Ranks 4–15
              </div>
              <h3 className="font-display text-lg font-bold">Climbing the ladder</h3>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {rest.length} more
            </span>
          </div>
          {rest.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No further entries yet.</p>
          ) : (
            <ul className="space-y-2">
              {rest.map((entry) => (
                <li key={entry.student.id}>
                  <RankRow entry={entry} />
                </li>
              ))}
            </ul>
          )}

          {!isMeInTop && myEntry ? (
            <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2">
                Your rank
              </div>
              <RankRow entry={myEntry} />
            </div>
          ) : null}
        </div>
      </div>

      <aside className="space-y-5">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="text-[10px] uppercase tracking-widest text-warning font-bold">
            Rising stars
          </div>
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-warning" />
            Biggest weekly gain
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Celebrating the largest XP jumps vs last week — anyone can land here.
          </p>
          <ul className="space-y-2 mt-3">
            {stars.map((entry) => (
              <li
                key={entry.student.id}
                className="flex items-center gap-3 rounded-2xl border border-border p-3"
              >
                <div className="h-9 w-9 rounded-xl bg-warning/15 text-warning grid place-items-center text-xs font-bold shrink-0">
                  {entry.student.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">
                    {entry.student.name}
                    {entry.student.isYou ? (
                      <span className="ml-1 text-[10px] text-primary">(you)</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <TierBadge level={levelFor(entry.student.xp).tier.level} size="xs" />
                    <span>Lv {levelFor(entry.student.xp).tier.level}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-warning whitespace-nowrap">
                  {entry.metricLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
            How to climb
          </div>
          <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              Finish a chapter exercise: <strong className="text-foreground">+50 XP</strong>
            </li>
            <li className="flex gap-2">
              <Star className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              Answer marked helpful: <strong className="text-foreground">+30 XP</strong>
            </li>
            <li className="flex gap-2">
              <Flame className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              Daily streak bonus: <strong className="text-foreground">+10 XP / day</strong>
            </li>
            <li className="flex gap-2">
              <Trophy className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              Pass a chapter quiz: <strong className="text-foreground">+120 XP</strong>
            </li>
          </ul>
        </div>
      </aside>
    </section>
  );
}

type PodiumAccent = "gold" | "silver" | "bronze";

function accentForRank(rank: number): PodiumAccent {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  return "bronze";
}

function metricDisplay(kind: LeaderboardKind, metric: number): { value: string; unit: string } {
  if (kind === "weekly-xp") return { value: String(metric), unit: "XP this week" };
  if (kind === "improvement") {
    const sign = metric > 0 ? "+" : "";
    return { value: `${sign}${metric}`, unit: "XP gained" };
  }
  if (kind === "helpful")
    return { value: String(metric), unit: metric === 1 ? "helpful answer" : "helpful answers" };
  return { value: String(metric), unit: metric === 1 ? "day streak" : "day streak" };
}

function PodiumPlace({
  entry,
  accent,
  kind,
}: {
  entry: ReturnType<typeof topN>[number];
  accent: PodiumAccent;
  kind: LeaderboardKind;
}) {
  const isFirst = entry.rank === 1;
  const display = metricDisplay(kind, entry.metric);

  const accentTokens = {
    gold: {
      border: "border-warning/40",
      ring: "ring-warning/40",
      pedestal: "bg-warning/10",
      metricColor: "text-warning",
      chip: "bg-warning text-warning-foreground",
      glow: "shadow-glow",
      ordinal: "1st",
      Icon: Crown,
      iconBg: "bg-warning text-warning-foreground",
    },
    silver: {
      border: "border-border",
      ring: "ring-foreground/20",
      pedestal: "bg-muted/60",
      metricColor: "text-foreground",
      chip: "bg-foreground/10 text-foreground",
      glow: "shadow-card",
      ordinal: "2nd",
      Icon: Medal,
      iconBg: "bg-foreground/10 text-foreground",
    },
    bronze: {
      border: "border-amber-500/40",
      ring: "ring-amber-500/30",
      pedestal: "bg-amber-500/10",
      metricColor: "text-amber-600 dark:text-amber-400",
      chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      glow: "shadow-card",
      ordinal: "3rd",
      Icon: Medal,
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
  }[accent];

  const Icon = accentTokens.Icon;
  const isYou = entry.student.isYou;

  return (
    <article
      className={`relative rounded-3xl border bg-gradient-to-b from-card to-muted/30 text-center transition ${
        accentTokens.border
      } ${accentTokens.glow} ${isFirst ? "pt-10 pb-5 px-3 sm:px-5" : "pt-7 pb-4 px-3 sm:px-4"}`}
    >
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <div
          className={`grid place-items-center rounded-2xl shadow-soft ${
            accentTokens.iconBg
          } ${isFirst ? "h-10 w-10" : "h-8 w-8"}`}
        >
          <Icon className={isFirst ? "h-5 w-5" : "h-4 w-4"} />
        </div>
      </div>

      <span
        className={`absolute top-3 right-3 text-[10px] font-bold rounded-full px-2 py-0.5 ${accentTokens.chip}`}
      >
        {accentTokens.ordinal}
      </span>

      <div className="flex justify-center">
        <div
          className={`relative rounded-2xl gradient-primary text-primary-foreground grid place-items-center font-bold ring-4 ${
            accentTokens.ring
          } ${
            isFirst
              ? "h-16 w-16 sm:h-20 sm:w-20 text-xl sm:text-2xl shadow-glow"
              : "h-14 w-14 sm:h-16 sm:w-16 text-lg sm:text-xl shadow-soft"
          }`}
        >
          {entry.student.initials}
        </div>
      </div>

      <h3
        className={`mt-3 font-display font-bold truncate ${
          isFirst ? "text-base sm:text-lg" : "text-sm"
        }`}
        title={entry.student.name}
      >
        {entry.student.name}
        {isYou ? <span className="ml-1.5 text-[10px] text-primary">(you)</span> : null}
      </h3>
      <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 mt-1">
        <TierBadge level={levelFor(entry.student.xp).tier.level} size={isFirst ? "md" : "sm"} />
        <span>Lv {levelFor(entry.student.xp).tier.level}</span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <Flame className="h-3 w-3" />
          {entry.student.streakDays}d
        </span>
      </div>

      <div className={`mt-3 rounded-2xl ${accentTokens.pedestal} ${isFirst ? "py-3" : "py-2.5"}`}>
        <div
          className={`font-display font-bold tabular-nums ${accentTokens.metricColor} ${
            isFirst ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
          }`}
        >
          {display.value}
        </div>
        <div className="text-[10px] text-muted-foreground">{display.unit}</div>
      </div>
    </article>
  );
}

function YouBanner({
  entry,
  total,
  kind,
  inTop,
  gapToTop15,
}: {
  entry: ReturnType<typeof topN>[number];
  total: number;
  kind: LeaderboardKind;
  inTop: boolean;
  gapToTop15: number;
}) {
  const display = metricDisplay(kind, entry.metric);
  const subtitle = inTop
    ? "You're on the board this week — one helpful answer or quiz could move you up."
    : `${gapToTop15} more ${kind === "streak" ? "days" : kind === "helpful" ? "helpful answers" : "XP"} to break into the top 15.`;

  return (
    <div className="mt-5 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-4 flex flex-wrap items-center gap-3">
      <TierBadge level={levelFor(entry.student.xp).tier.level} size="md" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
          Your week · Lv {levelFor(entry.student.xp).tier.level}{" "}
          {levelFor(entry.student.xp).tier.name}
        </div>
        <div className="text-sm font-semibold">
          You ranked <strong>#{entry.rank}</strong> of {total} ·{" "}
          <span className="text-primary font-bold">
            {display.value} {display.unit}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <span
        className={`hidden sm:inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
          inTop ? "bg-primary text-primary-foreground" : "bg-warning/15 text-warning"
        }`}
      >
        {inTop ? <Trophy className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
        {inTop ? "On the board" : "Push for top 15"}
      </span>
    </div>
  );
}

function RankRow({ entry }: { entry: ReturnType<typeof topN>[number] }) {
  const isYou = entry.student.isYou;
  return (
    <article
      className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
        isYou ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20"
      }`}
    >
      <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground grid place-items-center text-sm font-bold tabular-nums shrink-0">
        {entry.rank}
      </div>
      <div className="h-10 w-10 rounded-xl gradient-primary text-primary-foreground grid place-items-center text-xs font-bold shrink-0">
        {entry.student.initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{entry.student.name}</span>
          {isYou ? (
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              you
            </span>
          ) : null}
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <TierBadge level={levelFor(entry.student.xp).tier.level} size="xs" />
          <span>Lv {levelFor(entry.student.xp).tier.level}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3 w-3" />
            {entry.student.streakDays}d
          </span>
        </div>
      </div>
      <span className="text-sm font-bold whitespace-nowrap">{entry.metricLabel}</span>
    </article>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-card shadow-soft" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function AchievementsView({ level }: { level: ReturnType<typeof levelFor> }) {
  const me = currentUser();
  const earned = new Set(me.badges);
  const earnedBadges = allBadges.filter((b) => earned.has(b.id));
  const lockedBadges = allBadges.filter((b) => !earned.has(b.id));

  return (
    <section className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-warning/10 blur-3xl"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
                {level.tier.group} rank · Your level
              </div>
              <h2 className="font-display text-3xl font-bold mt-1">
                Lv {level.tier.level} · {level.tier.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Perks: {level.tier.perks}</p>
            </div>
            <TierBadge level={level.tier.level} size="xl" float />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">{me.xp} XP</span>
              <span className="text-muted-foreground">
                {level.next ? `${level.next.xpRequired} XP → ${level.next.name}` : "Max tier"}
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full gradient-primary" style={{ width: `${level.progress}%` }} />
            </div>
            {level.next ? (
              <p className="text-xs text-muted-foreground mt-2">
                {level.next.xpRequired - me.xp} XP to next tier · {level.progress}% there
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
                Badges
              </div>
              <h3 className="font-display text-xl font-bold">
                {earnedBadges.length} of {allBadges.length} earned
              </h3>
            </div>
          </div>

          {earnedBadges.length > 0 ? (
            <>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Earned</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {earnedBadges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} earned />
                ))}
              </div>
            </>
          ) : null}

          {lockedBadges.length > 0 ? (
            <>
              <h4 className="text-xs font-semibold text-muted-foreground mt-5 mb-2">Locked</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {lockedBadges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} earned={false} />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <aside className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <StatTile icon={Flame} value={`${me.streakDays}d`} label="Current streak" tone="warn" />
          <StatTile icon={Zap} value={me.weeklyXp} label="XP this week" tone="primary" />
          <StatTile icon={Star} value={me.helpfulAnswers} label="Helpful answers" tone="primary" />
          <StatTile icon={Users} value={students.length} label="Classmates" />
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
            Path to next tier
          </div>
          <h3 className="font-display text-lg font-bold">Tier ladder</h3>
          <ul className="mt-3 space-y-2">
            {levelTiers.map((tier) => {
              const reached = me.xp >= tier.xpRequired;
              const current = tier.level === level.tier.level;
              return (
                <li
                  key={tier.level}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${
                    current ? "border-primary/40 bg-primary/5" : "border-border"
                  }`}
                >
                  <TierBadge level={tier.level} size="sm" locked={!reached} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{tier.name}</span>
                      {current ? (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          you
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{tier.perks}</div>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                    {tier.xpRequired} XP
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </section>
  );
}

function BadgeCard({ badge, earned }: { badge: CommunityBadge; earned: boolean }) {
  return (
    <article
      className={`rounded-2xl border p-3 text-center transition ${
        earned ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30 opacity-60"
      }`}
    >
      <div
        className={`h-12 w-12 mx-auto rounded-2xl grid place-items-center text-2xl ${
          earned ? "bg-card shadow-soft" : "bg-card/50"
        }`}
      >
        {earned ? badge.emoji : "🔒"}
      </div>
      <div className="text-xs font-semibold mt-2 truncate">{badge.name}</div>
      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>
    </article>
  );
}

function StatTile({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Flame;
  value: string | number;
  label: string;
  tone?: "primary" | "warn";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "warn"
        ? "bg-warning/15 text-warning"
        : "bg-muted text-muted-foreground";
  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-card">
      <div className={`h-9 w-9 rounded-xl grid place-items-center mb-2 ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </article>
  );
}
