import { Player } from '@remotion/player';
import { Chrono, CHRONO_FPS, CHRONO_H, CHRONO_W } from './Chrono';
import { moves } from './moves';
import { exerciseById } from '../data/exercises';

/** Зацикленная анимация упражнения (Remotion Player как часы кадров). */
export function ExerciseAnimation({ id, playing = true, ghosts, traces, className, style }: {
  id: string;
  playing?: boolean;
  ghosts?: number;
  traces?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const m = moves[id];
  const cycle = Math.round((m?.period ?? 2) * CHRONO_FPS);
  const frames = cycle * 4;
  // при «уменьшить движение» не крутим сами: стоп-кадр в середине движения, запуск по клику
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <Player
      key={id + String(playing) + String(reduce)}
      component={Chrono}
      inputProps={{ moveId: id, ghosts, traces, muscles: exerciseById[id]?.muscles ?? [] }}
      durationInFrames={frames}
      compositionWidth={CHRONO_W}
      compositionHeight={CHRONO_H}
      fps={CHRONO_FPS}
      loop
      autoPlay={playing && !reduce}
      initialFrame={reduce ? Math.round(cycle * 0.45) : 0}
      controls={false}
      clickToPlay={Boolean(reduce)}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      acknowledgeRemotionLicense
      numberOfSharedAudioTags={0}
      className={className}
      style={{ width: '100%', aspectRatio: `${CHRONO_W} / ${CHRONO_H}`, ...style }}
    />
  );
}

export const hasAnimation = (id: string) => Boolean(moves[id]);
