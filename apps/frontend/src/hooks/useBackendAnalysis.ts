import { useEffect, useRef, useState } from 'react';
import type { PoseSample, PostureAnalysis } from '@/types';
import { analyzePoseOnBackend } from '@/lib/backendApi';

export function useBackendAnalysis(sample: PoseSample | null, enabled: boolean) {
  const [analysis, setAnalysis] = useState<PostureAnalysis | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !sample) {
      setAnalysis(null);
      setStatus('idle');
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        const result = await analyzePoseOnBackend({
          keypoints: sample.keypoints,
          cameraAngle: sample.cameraAngle,
          analysisMode: sample.analysisMode,
          signal: controller.signal,
        });

        if (requestId === requestIdRef.current) {
          setAnalysis(result);
          setStatus('ready');
          setError(null);
        }
      } catch (caughtError) {
        if (requestId === requestIdRef.current && !controller.signal.aborted) {
          setAnalysis(null);
          setStatus('error');
          setError(caughtError instanceof Error ? caughtError.message : 'Backend analysis failed.');
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [enabled, sample?.timestamp]);

  return { analysis, status, error };
}