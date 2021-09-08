export type ErrorInfo = { error: string; rawValue: string };

export type PartialOrError<T> = {
    [P in keyof T]?: T[P] | ErrorInfo;
};

export type Updates<S> = S extends PartialOrError<infer T> ? _Updates<T> : _Updates<S>;

type _Updates<T> = {
    -readonly [K in keyof T]?: T[K] extends ReadonlyArray<infer A> | ErrorInfo | undefined
        ? Array<Updates<A> | ErrorInfo> | ErrorInfo
        :
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
    if (oldData && typeof oldData === "object" && "error" in oldData) {
        return oldData;
    }

    if (typeof newData === "object" && "error" in newData) {
        return newData;
    }

    if (oldData && ((!eq && oldData === newData) || (eq && eq(oldData, newData)))) {
        return oldData;
    }

    if (oldData !== newData) {
        return { old: oldData, new: newData };
    }

    return oldData;
}

export type RenderableColumns<T> = {
    [K in keyof T]?: T[K] extends ReadonlyArray<infer S> | ErrorInfo | undefined
        ? { priority: number; columns: RenderableColumns<S> }
        : number;
};
