import assert from "assert";
import type { ReactNode, ReactNodeArray} from "react";
import React, { useMemo } from "react";
import type { Maybe } from "../../generated/graphql";
import type { BadgeData } from "../Badges/ProfileBadge";
import { useConference } from "./useConference";

export type Profile = {
    readonly registrantId: string;
    readonly realName?: Maybe<string>;
    readonly badges?: Maybe<BadgeData[]>;
    readonly affiliation?: Maybe<string>;
    readonly affiliationURL?: Maybe<string>;
    readonly country?: Maybe<string>;
    readonly timezoneUTCOffset?: Maybe<number>;
    readonly bio?: Maybe<string>;
    readonly website?: Maybe<string>;
    readonly github?: Maybe<string>;
    readonly twitter?: Maybe<string>;
    readonly pronouns?: Maybe<string[]>;
    readonly photoURL_50x50?: Maybe<string>;
    readonly photoURL_350x350?: Maybe<string>;
    readonly hasBeenEdited: boolean;
};

export type Registrant = {
    readonly id: any;
    readonly userId?: Maybe<string>;
    readonly displayName: string;
    readonly profile: Profile;
};

export type RegistrantContextT = Registrant;

const CurrentRegistrantContext = React.createContext<RegistrantContextT | undefined>(undefined);

export default function useCurrentRegistrant(): RegistrantContextT {
    const ctx = React.useContext(CurrentRegistrantContext);
    assert(ctx, "useCurrentRegistrant: Context not available");
    return ctx;
}

export function useMaybeCurrentRegistrant(): RegistrantContextT | undefined {
    return React.useContext(CurrentRegistrantContext);
}

export function CurrentRegistrantProvider({ children }: { children: ReactNode | ReactNodeArray }): JSX.Element {
    const conference = useConference();

    const ctx = useMemo(() => {
        if (!("registrants" in conference)) {
            return undefined;
        }
        // Annoyingly, GraphQL CodeGen mistakenly types `conference.registrants`
        // as a single object rather than an array. Arguably, it is correct, on
        // the basis of the primary key. But Hasura still returns it as an array.
        return conference.registrants.length > 0 ? (conference.registrants[0] as Registrant) : undefined;
    }, [conference]);

    return <CurrentRegistrantContext.Provider value={ctx}>{children}</CurrentRegistrantContext.Provider>;
}
