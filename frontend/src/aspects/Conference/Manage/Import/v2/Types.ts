export type ErrorInfo = { error: string; rawValue: string };

export type PartialOrError<T> = {
    [P in keyof T]?: T[P] | ErrorInfo;
};
