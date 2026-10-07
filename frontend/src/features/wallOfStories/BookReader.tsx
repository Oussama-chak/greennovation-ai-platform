import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { ArrowRight, CalendarDays, Check, Feather, LockKeyhole, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import openStorybook from "@/assets/library-open-storybook.png";
import type { WallBook } from "./types";
import "./bookReader.css";

export type BookOrigin = { x: number; y: number; width: number; height: number };
type BookReaderProps = {
  book: WallBook;
  origin: BookOrigin;
  cover: string;
  spine: string;
  subject: string;
  onClose: () => void;
  onComplete: () => void;
};
const ease = [0.5, 0.1, 0.2, 1] as const;

export function BookReader({ book, origin, cover, spine, subject, onClose, onComplete }: BookReaderProps) {
  const reducedMotion = useReducedMotion();
  const [closing, setClosing] = useState(false);
  const [phase, setPhase] = useState("lifting");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const completion = useRef(false);
  const flight = useAnimationControls();
  const spineMotion = useAnimationControls();
  const coverMotion = useAnimationControls();
  const leftPage = useAnimationControls();
  const rightPage = useAnimationControls();
  const content = useAnimationControls();
  const callbacks = useRef({ onClose, onComplete });
  callbacks.current = { onClose, onComplete };
  const ready = phase === "reading" && !closing;

  const dismiss = (complete = false) => {
    if (closing) return;
    completion.current = complete;
    setClosing(true);
  };

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    let active = true;
    const seconds = (value: number) => reducedMotion ? 0.01 : value;
    const spread = dialogRef.current?.querySelector(".book-reader-spread")?.getBoundingClientRect();
    if (!spread) return;
    const target = {
      left: spread.x + spread.width / 2,
      top: spread.y + spread.height * 0.065,
      width: spread.width * 0.43,
      height: spread.height * 0.85,
      rotate: 0,
    };
    const transition = (duration: number) => ({ duration: seconds(duration), ease });
    async function sequence() {
      if (closing) {
        setPhase("closing");
        await content.start({ opacity: 0, y: 12, transition: transition(0.8) });
        if (!active) return;
        await Promise.all([
          leftPage.start({ rotateY: 88, transition: transition(2.5) }),
          rightPage.start({ rotateY: -88, transition: transition(2.5) }),
          coverMotion.start({ opacity: 1, rotateY: 0, transition: { ...transition(2.5), delay: seconds(0.5) } }),
          flight.start({ opacity: 1, ...target, transition: { ...transition(1), delay: seconds(1) } }),
        ]);
        if (!active) return;
        setPhase("returning");
        await Promise.all([
          leftPage.start({ opacity: 0, transition: transition(0.7) }),
          rightPage.start({ opacity: 0, transition: transition(0.7) }),
          flight.start({ left: origin.x, top: origin.y - 72, width: origin.width, height: origin.height, rotate: -6, transition: transition(2.15) }),
          coverMotion.start({ opacity: 0, transition: transition(2) }),
          spineMotion.start({ opacity: 1, transition: transition(2) }),
        ]);
        if (!active) return;
        await flight.start({ top: origin.y, rotate: 0, transition: transition(1.5) });
        if (active) {
          if (completion.current) callbacks.current.onComplete();
          else callbacks.current.onClose();
        }
        return;
      }
      await flight.start({ top: origin.y - 96, rotate: -8, transition: transition(1.5) });
      if (!active) return;
      setPhase("traveling");
      await Promise.all([
        flight.start({ ...target, transition: { ...transition(2.2), delay: seconds(0.12) } }),
        spineMotion.start({ opacity: 0, transition: { ...transition(1.7), delay: seconds(0.35) } }),
        coverMotion.start({ opacity: 1, transition: { ...transition(1.7), delay: seconds(0.35) } }),
      ]);
      if (!active) return;
      setPhase("opening");
      await Promise.all([
        coverMotion.start({ rotateY: -170, transition: transition(3) }),
        leftPage.start({ opacity: 1, rotateY: 0, transition: transition(3) }),
        rightPage.start({ opacity: 1, rotateY: 0, transition: transition(3) }),
      ]);
      if (!active) return;
      await flight.start({ opacity: 0, transition: transition(1) });
      if (!active) return;
      setPhase("reading");
      await content.start({ opacity: 1, y: 0, transition: transition(1) });
    }
    void sequence();
    return () => {
      active = false;
      [flight, spineMotion, coverMotion, leftPage, rightPage, content].forEach((control) => control.stop());
    };
  }, [closing, reducedMotion, origin, flight, spineMotion, coverMotion, leftPage, rightPage, content]);

  const title = book.mystery ? "The mystery within" : book.title;
  const reward = book.mystery
    ? book.awake ? "A brass reading lamp for your wall. Rare find!" : `Awaken ${book.th} chapters to discover the story within.`
    : book.awake ? book.reward?.text : "Complete this task to awaken its chapter and reveal your discovery.";
  const rewardLabel = book.awake ? book.reward?.kind ?? "Rare discovery" : book.mystery ? "Unlock this story" : "Your discovery";

  return createPortal(
    <div className="book-reader" data-phase={phase} ref={dialogRef} role="dialog" aria-modal="true" aria-label={title}
      onKeyDown={(event) => {
        if (event.key === "Escape") dismiss();
        if (event.key !== "Tab") return;
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]:not([tabindex="-1"])');
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <motion.div className="book-reader-backdrop" initial={{ opacity: 0 }} animate={{ opacity: phase === "returning" ? 0 : 1 }} transition={{ duration: reducedMotion ? 0.01 : 1.5, ease }} onClick={() => dismiss()} />
      <motion.div className="book-reader-chrome" initial={{ opacity: 0 }} animate={{ opacity: closing ? 0 : 1 }} transition={{ duration: reducedMotion ? 0.01 : 0.7, ease }}>
        <span><Feather /> WALL OF STORIES</span>
        <Button ref={closeRef} variant="ghost" size="icon" className="book-reader-close" aria-label="Close book" title="Return to shelf" disabled={closing} onClick={() => dismiss()}><X /></Button>
      </motion.div>
      <motion.div className="book-reader-flying-book" initial={{ left: origin.x, top: origin.y, width: origin.width, height: origin.height, opacity: 1 }} animate={flight} aria-hidden="true">
        <motion.img className="book-reader-flying-spine" src={spine} alt="" initial={{ opacity: 1 }} animate={spineMotion} draggable={false} />
        <motion.img className="book-reader-flying-cover" src={cover} alt="" initial={{ opacity: 0, rotateY: 0 }} animate={coverMotion} draggable={false} />
      </motion.div>
      <div className="book-reader-spread">
        <motion.div className="book-reader-art-half book-reader-art-left" initial={{ rotateY: 88, opacity: 0 }} animate={leftPage} aria-hidden="true">
          <img src={openStorybook} alt="" draggable={false} />
        </motion.div>
        <motion.div className="book-reader-art-half book-reader-art-right" initial={{ rotateY: -88, opacity: 0 }} animate={rightPage} aria-hidden="true">
          <img src={openStorybook} alt="" draggable={false} />
        </motion.div>
        <motion.div className="book-reader-pages" initial={{ opacity: 0, y: 8 }} animate={content} inert={!ready}>
          <section className="book-reader-page book-reader-left">
            <header className="book-reader-page-heading"><Feather /><span className="book-reader-eyebrow">{subject}</span></header>
            <div className="book-reader-page-body">
              <span className="book-reader-chapter">CHAPTER {String(book.id + 1).padStart(2, "0")}</span>
              <h2>{title}</h2>
              <div className="book-reader-rule" />
              <p className="book-reader-intro">{book.mystery ? "A hidden chapter in your learning journey." : "A chapter in your learning journey."}</p>
              <dl className="book-reader-details">
                <div><dt>Status</dt><dd><span className="book-reader-status">{book.awake ? "Awakened" : book.mystery ? "Locked" : "To complete"}</span></dd></div>
                {!book.mystery && book.due && <div><dt><CalendarDays /> Due</dt><dd>{book.due}</dd></div>}
                {book.mystery && !book.awake && <div><dt>Unlock at</dt><dd>{book.th} chapters</dd></div>}
              </dl>
            </div>
            <footer className="book-reader-page-footer"><span>{subject}</span><span>{String(book.id + 1).padStart(2, "0")}</span></footer>
          </section>
          <section className="book-reader-page book-reader-right">
            <header className="book-reader-page-heading">{book.awake ? <Sparkles /> : <LockKeyhole />}<span className="book-reader-eyebrow">{rewardLabel}</span></header>
            <div className="book-reader-page-body">
              <h3>{book.awake ? "A chapter revealed" : book.mystery ? "A story worth waiting for" : "The next page awaits"}</h3>
              <p className={`book-reader-story${book.reward?.kind === "quote" && book.awake ? " is-quote" : ""}`}>{reward}</p>
              {book.awake ? <span className="book-reader-seal"><Check /> Chapter awakened</span> : book.mystery ? <span className="book-reader-seal"><LockKeyhole /> {book.th} chapters to unlock</span> : null}
            </div>
            {!book.awake && !book.mystery && <div className="book-reader-actions">
              <Button asChild variant="storybook"><Link to="/projects" tabIndex={ready ? 0 : -1}>Start this task <ArrowRight /></Link></Button>
              <Button variant="storybookQuiet" disabled={!ready} onClick={() => dismiss(true)}><Check /> Mark done (demo)</Button>
            </div>}
            <footer className="book-reader-page-footer"><span>{book.awake ? "Discovered" : "Unwritten"}</span><span>{String(book.id + 2).padStart(2, "0")}</span></footer>
          </section>
        </motion.div>
      </div>
    </div>, document.body,
  );
}
