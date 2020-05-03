import { useCallback, useEffect, useRef } from 'react';

const noop = (): void => {};

type EmptyCallback = () => void;

export type IntervalHookCallback = (ticks?: number) => void;
export type IntervalHookFinishCallback = () => void;
export type IntervalHookStartMethod = EmptyCallback;
export type IntervalHookStopMethod = (triggerFinishCallback?: boolean) => void;
export type IntervalHookIsActiveMethod = () => boolean;
export interface IntervalHookOptions {
    onFinish?: IntervalHookFinishCallback;
    autoStart?: boolean;
    immediate?: boolean;
}

export type IntervalHookResult = {
    start: IntervalHookStartMethod;
    stop: IntervalHookStopMethod;
    isActive: IntervalHookIsActiveMethod;
};

export function useInterval(
    callback: IntervalHookCallback,
    interval = 1000,
    { onFinish = noop, autoStart = true, immediate = false }: IntervalHookOptions = {}
): IntervalHookResult {
    const timer = useRef<NodeJS.Timeout>();
    const active = useRef<boolean>(false);
    const expected = useRef<number | null>(null);
    const savedCallback = useRef<IntervalHookCallback>(callback);

    const tick = useCallback(() => {
        /* istanbul ignore next */
        const expectedTimestamp = expected.current || 0;

        // If timer has more delay than it's interval
        const delay = Date.now() - expectedTimestamp;
        const ticks = 1 + (delay > 0 ? Math.floor(delay / interval) : 0);
        // Set new timeout
        expected.current = expectedTimestamp + interval * ticks;
        // Save timeout id
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        set(Math.max(interval - delay, 1));
        // Call callback function with amount of ticks passed
        savedCallback.current(ticks);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interval]);

    const set = useCallback(
        ms => {
            if (timer.current !== undefined) {
                clearTimeout(timer.current);
            }
            // Failsafe: Set new timeout only if timer is active
            /* istanbul ignore else */
            if (active.current) {
                timer.current = setTimeout(tick, ms);
            } else {
                // eslint-disable-next-line no-console
                console.debug(
                    'Trying to set interval timeout on inactive timer, this is no-op and probably indicates bug in your code.'
                );
            }
        },
        [tick, active]
    );

    const start = useCallback(() => {
        // Save current active value
        const isActive = active.current;
        // Switch to active
        active.current = true;

        if (expected.current === null) {
            expected.current = Date.now() + interval;
        }

        if (immediate && !isActive) {
            expected.current -= interval;
            tick();
        }

        set(interval);
    }, [tick, interval, immediate, set]);

    const stop = useCallback(
        (triggerFinish = true) => {
            if (timer.current !== undefined) {
                clearTimeout(timer.current);
            }

            active.current = false;
            timer.current = undefined;
            expected.current = null;

            triggerFinish && onFinish();
        },
        [onFinish]
    );

    const isActive = useCallback(() => active.current, []);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        autoStart && start();

        return stop;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { start, stop, isActive };
}
