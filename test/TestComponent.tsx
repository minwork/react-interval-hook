import React, { HTMLAttributes, useState } from 'react';
import { mount, ReactWrapper, shallow, ShallowWrapper } from 'enzyme';
import { IntervalHookCallback, IntervalHookOptions, useInterval } from '../src';

export interface TestComponentProps extends IntervalHookOptions {
    callback: IntervalHookCallback;
    interval?: 1000;
    triggerFinishCallback?: boolean;
}

export const TestComponent: React.FC<TestComponentProps> = ({
    callback,
    interval,
    triggerFinishCallback = true,
    children,
    ...options
}) => {
    const { start, stop, isActive } = useInterval(callback, interval, options);
    const [active, setActive] = useState<boolean>(isActive());

    return (
        <div>
            <button type="button" onClick={start} id="start">
                Start
            </button>
            <button type="button" onClick={(): void => stop(triggerFinishCallback)} id="stop">
                Stop
            </button>
            <button type="button" onClick={(): void => setActive(isActive())} id="checkActive">
                Check active
            </button>
            <div id="active">{active ? 1 : 0}</div>
        </div>
    );
};

export function createShallowTestComponent<Target = Element>(
    props: TestComponentProps
): ShallowWrapper<Required<TestComponentProps & HTMLAttributes<Target>>> {
    return shallow(<TestComponent {...props} />);
}

export function createMountedTestComponent<Target = Element>(
    props: TestComponentProps
): ReactWrapper<Required<TestComponentProps & HTMLAttributes<Target>>> {
    return mount(<TestComponent {...props} />);
}
