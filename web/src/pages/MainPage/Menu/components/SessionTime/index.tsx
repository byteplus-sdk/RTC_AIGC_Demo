import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useLeave } from '@/lib/useCommon';

const configuredDuration = Number(import.meta.env.REACT_APP_SESSION_DURATION_SECONDS || 1800);
export const SESSION_DURATION =
  Number.isFinite(configuredDuration) && configuredDuration > 0
    ? Math.floor(configuredDuration)
    : 1800;

export default function SessionTime({ enforce = false }: { enforce?: boolean }) {
  const { isJoined, roomId, sessionStartedAt } = useSelector((state: RootState) => state.room);
  const [remaining, setRemaining] = useState(SESSION_DURATION);
  const leave = useLeave();
  const leaveRef = useRef(leave);
  leaveRef.current = leave;
  useEffect(() => {
    setRemaining(SESSION_DURATION);
    if (!isJoined) return;
    const deadline = (sessionStartedAt || Date.now()) + SESSION_DURATION * 1000;
    let expired = false;
    const tick = () => {
      const value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(value);
      if (!value && enforce && !expired) {
        expired = true;
        void leaveRef.current();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isJoined, roomId, sessionStartedAt, enforce]);
  if (enforce) return null;
  return (
    <span>
      Session time left:{' '}
      {Math.floor(remaining / 60)
        .toString()
        .padStart(2, '0')}
      :{(remaining % 60).toString().padStart(2, '0')}
    </span>
  );
}
