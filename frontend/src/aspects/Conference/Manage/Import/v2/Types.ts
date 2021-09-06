export type ErrorInfo = { error: string; rawValue: string };

export type PartialOrError<T> = {
    [P in keyof T]?: T[P] | ErrorInfo;
};

export type Updates<S> = S extends PartialOrError<infer T> ? _Updates<T> : _Updates<S>;

type _Updates<T> = {
    -readonly [K in keyof T]?:
        | T[K]
        | ErrorInfo
        | {
              old?: T[K];
              new: T[K];
          };
};

export function createUpdate<T>(
    oldData: T | ErrorInfo | undefined,
    newData: T | ErrorInfo,
    eq?: (oldData: T, newData: T) => boolean
):
    | T
    | ErrorInfo
    | {
          old?: T;
          new: T;
      } {
    if (oldData && "error" in oldData) {
        return oldData;
    }

    if ("error" in newData) {
        return newData;
    }

    if (oldData && ((!eq && oldData === newData) || (eq && eq(oldData, newData)))) {
        return oldData;
    }

    return { old: oldData, new: newData };
}
