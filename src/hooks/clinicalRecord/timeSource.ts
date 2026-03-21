export interface TimeSource {
    now: () => number;
}

export const systemTimeSource: TimeSource = {
    now: () => Date.now(),
};
