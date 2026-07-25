"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { Wordmark } from "@/app/_components/ui";
import {
  GITHUB_URL,
  MAYA_COMMENTS,
  PITCH_SLIDE_COUNT,
  PITCH_SLIDES,
  PRODUCT_JOURNEY,
} from "@/app/pitch/pitch-content";
import {
  adjacentSlideIndex,
  directionForNavigationKey,
  slideHref,
} from "@/app/pitch/pitch-navigation";
import styles from "@/app/pitch/pitch.module.css";

const DOWNLOADS = {
  powerpoint: "/pitch/NextBestContent-Pitch.pptx",
  pdf: "/pitch/NextBestContent-Pitch.pdf",
} as const;

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={styles.arrowIcon}
    >
      <path
        d={direction === "left" ? "m12.5 4.5-5.5 5.5 5.5 5.5" : "m7.5 4.5 5.5 5.5-5.5 5.5"}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={styles.actionIcon}
    >
      <path
        d="M10 2.75v9.5m0 0 3.25-3.25M10 12.25 6.75 9M3.5 15.5h13"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function SyntheticBadge() {
  return (
    <span className={styles.syntheticBadge}>
      <span aria-hidden="true" className={styles.syntheticDot} />
      Fictional, synthetic demo
    </span>
  );
}

function SectionHeading({
  index,
  className = "",
}: {
  index: number;
  className?: string;
}) {
  const slide = PITCH_SLIDES[index];
  return (
    <div className={className}>
      <p className={styles.eyebrow}>
        <span>{slide.eyebrow}</span>
        <span aria-hidden="true">·</span>
        <span>{String(index + 1).padStart(2, "0")}</span>
      </p>
      <h2 id={`${slide.id}-title`} className={styles.slideTitle}>
        {slide.title}
      </h2>
    </div>
  );
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "a, button, input, textarea, select, summary, [contenteditable='true']",
    ),
  );
}

function subscribeToOrigin() {
  return () => undefined;
}

function getBrowserOrigin() {
  return window.location.origin;
}

function getServerOrigin() {
  return "This deployed app";
}

export function PitchDeck() {
  const [activeIndex, setActiveIndex] = useState(0);
  const publicOrigin = useSyncExternalStore(
    subscribeToOrigin,
    getBrowserOrigin,
    getServerOrigin,
  );
  const activeIndexRef = useRef(0);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const intersectionRatios = useRef(new Map<Element, number>());
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const navigateTo = useCallback((index: number, addHistory = true) => {
    const targetIndex = Math.min(
      Math.max(index, 0),
      PITCH_SLIDE_COUNT - 1,
    );
    const target = sectionRefs.current[targetIndex];
    if (!target) return;

    const href = slideHref(targetIndex);
    if (addHistory) {
      window.history.pushState(null, "", href);
    } else {
      window.history.replaceState(null, "", href);
    }
    setActiveIndex(targetIndex);
    target.scrollIntoView({
      behavior: prefersReducedMotion.current ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      prefersReducedMotion.current = motionQuery.matches;
    };
    updateMotionPreference();
    motionQuery.addEventListener("change", updateMotionPreference);

    return () => {
      motionQuery.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersectionRatios.current.set(
            entry.target,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }

        let bestIndex = activeIndexRef.current;
        let bestRatio = -1;
        sectionRefs.current.forEach((section, index) => {
          if (!section) return;
          const ratio = intersectionRatios.current.get(section) ?? 0;
          if (ratio > bestRatio) {
            bestIndex = index;
            bestRatio = ratio;
          }
        });

        if (bestRatio > 0 && bestIndex !== activeIndexRef.current) {
          activeIndexRef.current = bestIndex;
          setActiveIndex(bestIndex);
          window.history.replaceState(null, "", slideHref(bestIndex));
        }
      },
      {
        rootMargin: "-16% 0px -24%",
        threshold: [0, 0.15, 0.3, 0.5, 0.7],
      },
    );

    sectionRefs.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      const direction = directionForNavigationKey(event.key);
      if (direction === null) return;

      event.preventDefault();
      navigateTo(
        adjacentSlideIndex(
          activeIndexRef.current,
          direction,
          PITCH_SLIDE_COUNT,
        ),
      );
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigateTo]);

  function handleAnchorKeyDown(event: ReactKeyboardEvent<HTMLAnchorElement>) {
    if (event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
    }
  }

  return (
    <div className={styles.page}>
      <a href="#pitch-content" className={styles.skipLink}>
        Skip to pitch
      </a>

      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link href="/" aria-label="NextBestContent home">
            <Wordmark compact />
          </Link>
          <div className={styles.topbarMeta}>
            <span className={styles.deckLabel}>Jury pitch</span>
            <span className={styles.deckLabel}>6 slides · 5 minutes</span>
          </div>
        </div>
      </header>

      <main id="pitch-content" className={styles.deck}>
        <section
          id="slide-1"
          ref={(node) => {
            sectionRefs.current[0] = node;
          }}
          aria-labelledby="slide-1-title"
          className={`${styles.slide} ${styles.heroSlide}`}
        >
          <div className={`${styles.slideInner} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                <span>The one-line idea</span>
                <span aria-hidden="true">·</span>
                <span>01</span>
              </p>
              <h1 id="slide-1-title" className={styles.heroTitle}>
                Your audience already wrote your next{" "}
                <span className={styles.signalText}>content brief.</span>
              </h1>
              <p className={styles.heroLede}>
                Turn audience comments into evidence-backed YouTube Shorts and
                LinkedIn documents.
              </p>
              <div className={styles.actionRow}>
                <Link href="/demo" className={styles.primaryAction}>
                  Try the synthetic demo
                  <span aria-hidden="true">→</span>
                </Link>
                <a
                  href={DOWNLOADS.pdf}
                  download
                  className={styles.secondaryAction}
                >
                  <DownloadIcon />
                  Download PDF
                </a>
              </div>
              <p className={styles.teamCredit}>Built by Tripods</p>
            </div>

            <figure className={styles.heroMedia}>
              <Image
                src="/pitch/images/maya-balcony-hero.png"
                alt="Fictional creator Maya tending herbs in a compact balcony garden"
                fill
                priority
                sizes="(max-width: 800px) 100vw, 46vw"
                className={styles.coverImage}
              />
              <figcaption className={styles.imageCaption}>
                Maya Makes Space · generated demo imagery
              </figcaption>
            </figure>
          </div>
        </section>

        <section
          id="slide-2"
          ref={(node) => {
            sectionRefs.current[1] = node;
          }}
          aria-labelledby="slide-2-title"
          className={styles.slide}
        >
          <div className={styles.slideInner}>
            <SectionHeading index={1} className={styles.headingNarrow} />
            <p className={styles.lede}>
              Comments contain the requests, questions, and reactions that
              should shape the next story. But the evidence arrives as a noisy
              feed—not a production decision.
            </p>

            <div className={styles.commentsLayout}>
              <div className={styles.commentsGrid}>
                {MAYA_COMMENTS.map((comment, index) => (
                  <article key={comment.type} className={styles.commentCard}>
                    <div className={styles.commentMeta}>
                      <span className={styles.commentAvatar} aria-hidden="true">
                        {["L", "N", "R"][index]}
                      </span>
                      <span>{comment.type}</span>
                      <span className={styles.syntheticWord}>Synthetic</span>
                    </div>
                    <blockquote>“{comment.quote}”</blockquote>
                  </article>
                ))}
              </div>
              <figure className={styles.evidenceMedia}>
                <Image
                  src="/pitch/images/maya-comment-evidence.png"
                  alt="Close view of a small balcony garden with planters at different stages of growth"
                  fill
                  loading="eager"
                  sizes="(max-width: 900px) 100vw, 34vw"
                  className={styles.coverImage}
                />
                <figcaption className={styles.imageCaption}>
                  Generated imagery · fictional comments
                </figcaption>
              </figure>
            </div>

            <ul className={styles.problemRow} aria-label="What raw comments lack">
              <li>Abundant</li>
              <li>Unranked</li>
              <li>Disconnected</li>
              <li>Not production-ready</li>
            </ul>
          </div>
        </section>

        <section
          id="slide-3"
          ref={(node) => {
            sectionRefs.current[2] = node;
          }}
          aria-labelledby="slide-3-title"
          className={styles.slide}
        >
          <div className={styles.slideInner}>
            <SectionHeading index={2} />
            <div className={styles.journeyGrid}>
              {PRODUCT_JOURNEY.map((step, index) => (
                <article key={step.name} className={styles.journeyCard}>
                  <div className={styles.journeyTopline}>
                    <span>{step.number}</span>
                    {index < PRODUCT_JOURNEY.length - 1 && (
                      <span aria-hidden="true" className={styles.journeyArrow}>
                        →
                      </span>
                    )}
                  </div>
                  <h3>{step.name}</h3>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
            <div className={styles.proofStrip}>
              <p>
                <strong>3</strong>
                <span>scored opportunities</span>
              </p>
              <p>
                <strong>2</strong>
                <span>independent destinations</span>
              </p>
              <p>
                <strong>7</strong>
                <span>transparent checks</span>
              </p>
              <p>
                <strong>Real</strong>
                <span>local exports</span>
              </p>
            </div>
            <p className={styles.honestyNote}>
              No silent live-to-demo fallback. No plausible fake publishing.
            </p>
          </div>
        </section>

        <section
          id="slide-4"
          ref={(node) => {
            sectionRefs.current[3] = node;
          }}
          aria-labelledby="slide-4-title"
          className={styles.slide}
        >
          <div className={styles.slideInner}>
            <div className={styles.headingWithBadge}>
              <SectionHeading index={3} />
              <SyntheticBadge />
            </div>

            <div className={styles.caseReceipt}>
              <div>
                <span>Source video</span>
                <strong>
                  I Turned a 2m² Balcony Into a Food Garden
                </strong>
              </div>
              <div>
                <span>Selected signal</span>
                <strong>
                  “Show the mistakes and fixes—not only the reveal.”
                </strong>
              </div>
            </div>

            <div className={styles.outputGrid}>
              <article className={styles.outputCard}>
                <figure className={styles.outputMedia}>
                  <Image
                    src="/pitch/images/product-youtube-studio.png"
                    alt="Final product capture of Maya's synthetic YouTube Short in the NextBestContent studio"
                    fill
                    loading="eager"
                    sizes="(max-width: 760px) 100vw, 42vw"
                    className={styles.productScreenshot}
                  />
                  <figcaption className={styles.productCaptureLabel}>
                    Final product capture
                  </figcaption>
                </figure>
                <div className={styles.outputCopy}>
                  <p className={styles.platformLabel}>YouTube Short</p>
                  <h3>
                    3 mistakes that nearly killed my balcony garden.
                  </h3>
                  <p>Six editable scenes · hook · CTA · storyboard export</p>
                </div>
              </article>

              <article className={styles.outputCard}>
                <figure className={styles.outputMedia}>
                  <Image
                    src="/pitch/images/product-linkedin-studio.png"
                    alt="Final product capture of Maya's synthetic LinkedIn document in the NextBestContent studio"
                    fill
                    loading="eager"
                    sizes="(max-width: 760px) 100vw, 42vw"
                    className={styles.productScreenshot}
                  />
                  <figcaption className={styles.productCaptureLabel}>
                    Final product capture
                  </figcaption>
                </figure>
                <div className={styles.outputCopy}>
                  <p className={styles.platformLabel}>LinkedIn document</p>
                  <h3>6 decisions behind a 2m² food garden.</h3>
                  <p>Carousel story · caption · CTA · document-ready export</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          id="slide-5"
          ref={(node) => {
            sectionRefs.current[4] = node;
          }}
          aria-labelledby="slide-5-title"
          className={styles.slide}
        >
          <div className={styles.slideInner}>
            <SectionHeading index={4} />
            <p className={styles.lede}>
              One codebase, two explicit capability profiles. The public
              experience stays safe for a jury; real creator work stays under
              the creator&rsquo;s control.
            </p>

            <div className={styles.profileGrid}>
              <article className={styles.profileCard}>
                <p className={styles.profileTag}>Public Vercel</p>
                <h3>Proof without secrets</h3>
                <ul>
                  <li>Synthetic Maya journey only</li>
                  <li>No credentials or paid model calls</li>
                  <li>No fake publishing or silent fallback</li>
                  <li>Static, API-independent jury experience</li>
                </ul>
              </article>
              <article
                className={`${styles.profileCard} ${styles.profileCardSignal}`}
              >
                <p className={styles.profileTag}>Local Docker / self-hosted</p>
                <h3>Private creator workspace</h3>
                <ul>
                  <li>Creator-supplied comment imports</li>
                  <li>User-owned, server-side OpenAI key</li>
                  <li>Policy-gated YouTube access</li>
                  <li>Real copy and download fallbacks</li>
                </ul>
              </article>
            </div>

            <aside className={styles.keyNote}>
              <span aria-hidden="true">↳</span>
              <p>
                Keys remain with the creator. Model-bound comment content goes
                directly from their container to their configured provider.
              </p>
            </aside>
            <p className={styles.qaNote}>
              Release evidence: 298 tests passing · lint · typecheck ·
              production build green.
            </p>
          </div>
        </section>

        <section
          id="slide-6"
          ref={(node) => {
            sectionRefs.current[5] = node;
          }}
          aria-labelledby="slide-6-title"
          className={`${styles.slide} ${styles.finalSlide}`}
        >
          <div className={`${styles.slideInner} ${styles.finalGrid}`}>
            <div>
              <SectionHeading index={5} />
              <p className={styles.finalLede}>
                The strongest next idea is not hiding in a blank document.
                It&rsquo;s waiting in the audience evidence you already have.
              </p>
              <p className={styles.publicUrl}>{publicOrigin}</p>
              <div className={styles.actionRow}>
                <Link href="/demo" className={styles.primaryAction}>
                  Try the synthetic demo
                  <span aria-hidden="true">→</span>
                </Link>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.secondaryAction}
                >
                  GitHub + self-host
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
              <div className={styles.downloadRow}>
                <a href={DOWNLOADS.pdf} download>
                  <DownloadIcon />
                  PDF
                </a>
                <a href={DOWNLOADS.powerpoint} download>
                  <DownloadIcon />
                  PowerPoint
                </a>
              </div>
            </div>

            <aside className={styles.roadmapCard}>
              <p>Product horizon</p>
              <ol>
                <li>
                  <span>Now</span>
                  <strong>YouTube + LinkedIn creation</strong>
                </li>
                <li>
                  <span>Next</span>
                  <strong>X + Facebook destinations</strong>
                </li>
                <li>
                  <span>Later</span>
                  <strong>Approved direct connections</strong>
                </li>
              </ol>
              <p className={styles.roadmapFineprint}>
                Direct connections ship only with real platform approval and
                explicit capability gates.
              </p>
            </aside>

            <p className={styles.finalCredit}>NextBestContent · Built by Tripods</p>
          </div>
        </section>
      </main>

      <nav className={styles.controls} aria-label="Pitch slide navigation">
        <button
          type="button"
          onClick={() =>
            navigateTo(
              adjacentSlideIndex(activeIndex, -1, PITCH_SLIDE_COUNT),
            )
          }
          disabled={activeIndex === 0}
          aria-label="Previous slide"
          className={styles.controlButton}
        >
          <Arrow direction="left" />
        </button>

        <p className={styles.counter} aria-live="polite" aria-atomic="true">
          <span className={styles.counterCurrent}>{activeIndex + 1}</span>
          <span aria-hidden="true"> / </span>
          <span className="sr-only"> of </span>
          <span>{PITCH_SLIDE_COUNT}</span>
        </p>

        <ol className={styles.dots}>
          {PITCH_SLIDES.map((slide, index) => (
            <li key={slide.id}>
              <a
                href={slideHref(index)}
                aria-label={`Go to slide ${index + 1}: ${slide.title}`}
                aria-current={activeIndex === index ? "page" : undefined}
                className={styles.dot}
                onClick={(event) => {
                  event.preventDefault();
                  navigateTo(index);
                }}
                onKeyDown={handleAnchorKeyDown}
              >
                <span className="sr-only">{slide.title}</span>
              </a>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() =>
            navigateTo(adjacentSlideIndex(activeIndex, 1, PITCH_SLIDE_COUNT))
          }
          disabled={activeIndex === PITCH_SLIDE_COUNT - 1}
          aria-label="Next slide"
          className={styles.controlButton}
        >
          <Arrow direction="right" />
        </button>
      </nav>
    </div>
  );
}
