import { renderHook } from '@testing-library/react-hooks';
import { IntervalHookCallback, IntervalHookFinishCallback, useInterval } from '../src';

describe('Check isolated hook calls', () => {
    let callback: IntervalHookCallback;
    let onFinish: IntervalHookFinishCallback;
    beforeEach(() => {
        jest.useFakeTimers();
        callback = jest.fn();
        onFinish = jest.fn();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.clearAllMocks();
    });

    test('Always return object with management methods as a result', () => {
        const resultTemplate = {
            start: expect.any(Function),
            stop: expect.any(Function),
            isActive: expect.any(Function),
        };
        expect(renderHook(() => useInterval(() => {})).result.current).toMatchObject(resultTemplate);
        expect(renderHook(() => useInterval(() => {}, 200)).result.current).toMatchObject(resultTemplate);
        expect(
            renderHook(() =>
                useInterval(() => {}, 1000, {
                    onFinish: () => {},
                    immediate: false,
                    autoStart: true,
                })
            ).result.current
        ).toMatchObject(resultTemplate);
    });

    test('Call interval callback regularly after started and before stopped', () => {
        const interval = 500;
        const manage = renderHook(() => useInterval(callback, interval, { autoStart: false, immediate: false }))
            .result.current;

        expect(callback).toBeCalledTimes(0);
        // Start interval
        manage.start();
        jest.runOnlyPendingTimers();
        expect(callback).toBeCalledTimes(1);
        jest.runOnlyPendingTimers();
        expect(callback).toBeCalledTimes(2);
        jest.runOnlyPendingTimers();
        expect(callback).toBeCalledTimes(3);
        manage.stop();
        jest.runOnlyPendingTimers();
        jest.runTimersToTime(interval);
        expect(callback).toBeCalledTimes(3);
    });

    test('Automatically starts timer when autoStart option is set to true', () => {
        renderHook(() => useInterval(callback, 1000, { autoStart: true }));

        jest.runOnlyPendingTimers();
        expect(callback).toBeCalledTimes(1);
    });

    test('Immediately call callback when immediate option and autoStart is set to true', () => {
        renderHook(() => useInterval(callback, 1000, { immediate: true, autoStart: true }));

        expect(callback).toBeCalledTimes(1);
        jest.runOnlyPendingTimers();
        expect(callback).toBeCalledTimes(2);
    });

    test('Call callback after using start method when immediate option is set to true and autoStart is set to false', () => {
        const { start } = renderHook(() =>
            useInterval(callback, 1000, { immediate: true, autoStart: false })
        ).result.current;

        start();
        expect(callback).toBeCalledTimes(1);
        jest.runOnlyPendingTimers();
        expect(callback).toBeCalledTimes(2);
    });

    test('Call onFinish callback after using stop method (accordingly to stop method argument)', () => {
        renderHook(() =>
            useInterval(callback, 1000, { immediate: true, autoStart: true, onFinish })
        ).result.current.stop();

        expect(onFinish).toBeCalledTimes(1);

        renderHook(() => useInterval(callback, 1000, { onFinish })).result.current.stop();

        expect(onFinish).toBeCalledTimes(2);

        renderHook(() => useInterval(callback, 1000, { onFinish })).result.current.stop(false);

        expect(onFinish).toBeCalledTimes(2);

        // Do not call stop if timer wasn't started
        renderHook(() =>
            useInterval(callback, 1000, { immediate: false, autoStart: false, onFinish })
        ).result.current.stop();

        expect(onFinish).toBeCalledTimes(2);

        renderHook(() =>
            useInterval(callback, 1000, { immediate: true, autoStart: false, onFinish })
        ).result.current.stop(false);

        expect(onFinish).toBeCalledTimes(2);
    });

    test('Properly return if interval is active using isActive method', () => {
        const { start, stop, isActive } = renderHook(() =>
            useInterval(callback, 1000, { autoStart: false, onFinish })
        ).result.current;

        expect(isActive()).toBe(false);

        start();
        expect(isActive()).toBe(true);
        jest.runOnlyPendingTimers();
        expect(isActive()).toBe(true);
        stop();

        expect(isActive()).toBe(false);
    });

    test('Interval is properly self-correcting and callback is called with correct amount of ticks', () => {
        const { start, stop } = renderHook(() => useInterval(callback, 1000, { autoStart: false })).result.current;

        jest.spyOn(Date, 'now')
            .mockReturnValue(0)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(2000)
            .mockReturnValueOnce(5000)
            .mockReturnValueOnce(10500)
            .mockReturnValueOnce(11000);

        start();
        jest.runOnlyPendingTimers();
        expect(callback).toHaveBeenLastCalledWith(2);

        jest.runOnlyPendingTimers();
        expect(callback).toHaveBeenLastCalledWith(3);

        jest.runOnlyPendingTimers();
        expect(callback).toHaveBeenLastCalledWith(5);

        jest.runOnlyPendingTimers();
        expect(callback).toHaveBeenLastCalledWith(1);

        stop();
    });

    test('Hook properly ignore duplicated managing method calls', () => {
        const { start, stop } = renderHook(() =>
            useInterval(callback, 1000, { autoStart: false, immediate: false, onFinish })
        ).result.current;

        expect(callback).toBeCalledTimes(0);
        start();
        expect(callback).toBeCalledTimes(0);
        start();
        jest.runOnlyPendingTimers();
        start();
        expect(callback).toBeCalledTimes(1);

        expect(onFinish).toBeCalledTimes(0);
        stop();
        expect(onFinish).toBeCalledTimes(1);
        jest.runOnlyPendingTimers();
        stop();
        stop();
        jest.runOnlyPendingTimers();
        expect(onFinish).toBeCalledTimes(1);

        expect(callback).toBeCalledTimes(1);

        start();
        stop();
        start();
        stop();
        start();
        stop();

        expect(callback).toBeCalledTimes(1);
        expect(onFinish).toBeCalledTimes(4);

        start();
        start();
        expect(callback).toBeCalledTimes(1);
        start();
        jest.runOnlyPendingTimers();
        expect(callback).toBeCalledTimes(2);
    });

    test('Hook properly ignore duplicated managing method calls when immediate option is set to true', () => {
        const { start, stop } = renderHook(() =>
            useInterval(callback, 1000, { autoStart: false, immediate: true })
        ).result.current;

        expect(callback).toBeCalledTimes(0);
        start();
        expect(callback).toBeCalledTimes(1);
        start();
        jest.runOnlyPendingTimers();
        start();
        expect(callback).toBeCalledTimes(2);

        stop();
        jest.runOnlyPendingTimers();
        stop();
        stop();
        jest.runOnlyPendingTimers();

        expect(callback).toBeCalledTimes(2);

        start();
        start();
        expect(callback).toBeCalledTimes(3);
        start();
        jest.runOnlyPendingTimers();
        expect(callback).toBeCalledTimes(4);
    });
});
