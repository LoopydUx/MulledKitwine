import { lazy, Suspense, useCallback, useEffect } from 'react';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Journey } from './components/Journey';
import { KitSection } from './components/KitSection';
import { OrderSection } from './components/OrderSection';
import { StaticStory } from './components/StaticStory';
import { ANCHORS } from './config/story';
import { useStageMode, type StageMode } from './hooks/useStageMode';
import { LanguageProvider } from './i18n/LanguageContext';

const StageCanvas = lazy(() => import('./scene/StageCanvas'));

/** Dev tool: `/?capture=1` renders the still artwork used by the static fallbacks (see README). */
function CaptureStage() {
  return (
    <div className="capture">
      <div className="capture__stage">
        <Suspense fallback={null}>
          <StageCanvas active lowPower={false} capture onReady={() => undefined} onUnavailable={() => undefined} />
        </Suspense>
      </div>
      <p id="capture-log" className="capture__log">
        capturing…
      </p>
    </div>
  );
}

function Page() {
  const { mode, reason, canAnimate, choose } = useStageMode();

  // Content is rendered by script, so honour a deep link (#chapter-3, ...) once it exists.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, []);

  const onChoose = useCallback(
    (next: StageMode) => {
      choose(next);
      // the two versions have different heights; start the chosen one from the top
      requestAnimationFrame(() => window.scrollTo(0, 0));
    },
    [choose],
  );

  return (
    <div id={ANCHORS.top} className="page">
      <Header />
      <main id="main">
        {mode === 'animated' ? <Journey /> : <StaticStory reason={reason} canAnimate={canAnimate} onPlay={() => onChoose('animated')} />}
        <KitSection />
        <OrderSection />
      </main>
      <Footer mode={mode} canAnimate={canAnimate} onChoose={onChoose} />
    </div>
  );
}

export function App() {
  const capture = import.meta.env.DEV && new URLSearchParams(window.location.search).has('capture');
  if (capture) return <CaptureStage />;
  return (
    <LanguageProvider>
      <Page />
    </LanguageProvider>
  );
}
