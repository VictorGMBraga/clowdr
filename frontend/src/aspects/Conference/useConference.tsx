import { gql } from "@apollo/client";
import { Button, chakra, Code, Text, VStack } from "@chakra-ui/react";
import assert from "assert";
import React, { useState } from "react";
import {
    AuthdConferenceInfoFragment,
    PublicConferenceInfoFragment,
    useConferenceBySlug_WithoutUserQuery,
    useConferenceBySlug_WithUserQuery,
} from "../../generated/graphql";
import CenteredSpinner from "../Chakra/CenteredSpinner";
import GenericErrorPage from "../Errors/GenericErrorPage";
import PageNotFound from "../Errors/PageNotFound";
import useMaybeCurrentUser from "../Users/CurrentUser/useMaybeCurrentUser";

gql`
    query ConferenceBySlug_WithUser($slug: String!, $userId: String!) {
        conference_Conference(where: { slug: { _eq: $slug } }) {
            ...PublicConferenceInfo
            ...AuthdConferenceInfo
        }
    }

    query ConferenceBySlug_WithoutUser($slug: String!) {
        conference_Conference(where: { slug: { _eq: $slug } }) {
            ...PublicConferenceInfo
        }
    }

    fragment AuthdConferenceInfo on conference_Conference {
        registrants(where: { userId: { _eq: $userId } }) {
            ...RegistrantData

            groupRegistrants {
                group {
                    ...GroupData
                }
                id
                groupId
                registrantId
            }
        }

        myBackstagesNotice: configurations(where: { key: { _eq: MY_BACKSTAGES_NOTICE } }) {
            conferenceId
            key
            value
        }
    }

    fragment PublicConferenceInfo on conference_Conference {
        id
        name
        shortName
        slug
        createdBy

        supportAddress: configurations(where: { key: { _eq: SUPPORT_ADDRESS } }) {
            conferenceId
            key
            value
        }
        registrationURL: configurations(where: { key: { _eq: REGISTRATION_URL } }) {
            conferenceId
            key
            value
        }
        scheduleViewVersion: configurations(where: { key: { _eq: SCHEDULE_VIEW_VERSION } }) {
            conferenceId
            key
            value
        }

        sponsorsLabel: configurations(where: { key: { _eq: SPONSORS_LABEL } }) {
            conferenceId
            key
            value
        }
        disableAllTimesForThisItem: configurations(where: { key: { _eq: DISABLE_ALL_EVENTS_FOR_ITEM } }) {
            conferenceId
            key
            value
        }
        disableNearbyEvents: configurations(where: { key: { _eq: DISABLE_NEARBY_EVENTS } }) {
            conferenceId
            key
            value
        }
        themeComponentColors: configurations(where: { key: { _eq: THEME_COMPONENT_COLORS } }) {
            conferenceId
            key
            value
        }

        visibleExhibitionsLabel: configurations(where: { key: { _eq: VISIBLE_EXHIBITIONS_LABEL } }) {
            conferenceId
            key
            value
        }
        hiddenExhibitionsLabel: configurations(where: { key: { _eq: HIDDEN_EXHIBITIONS_LABEL } }) {
            conferenceId
            key
            value
        }

        publicGroups: groups(where: { enabled: { _eq: true }, includeUnauthenticated: { _eq: true } }) {
            ...GroupData
        }
    }

    fragment GroupData on permissions_Group {
        groupRoles {
            role {
                rolePermissions {
                    permissionName
                    id
                    roleId
                }
                id
                name
                conferenceId
            }
            id
            roleId
            groupId
        }
        enabled
        id
        includeUnauthenticated
        name
        conferenceId
    }

    fragment ProfileData on registrant_Profile {
        registrantId
        badges
        affiliation
        affiliationURL
        country
        timezoneUTCOffset
        bio
        website
        github
        twitter
        pronouns
        photoURL_50x50
        photoURL_350x350
        hasBeenEdited
    }

    fragment RegistrantData on registrant_Registrant {
        id
        userId
        conferenceId
        displayName
        profile {
            ...ProfileData
        }
    }
`;

export type ConferenceInfoFragment =
    | PublicConferenceInfoFragment
    | (PublicConferenceInfoFragment & AuthdConferenceInfoFragment);

const ConferenceContext = React.createContext<ConferenceInfoFragment | undefined>(undefined);

export function useConference(): ConferenceInfoFragment {
    const conf = React.useContext(ConferenceContext);
    assert(conf, "useConference: Context not available");
    return conf;
}

export function useMaybeConference(): ConferenceInfoFragment | undefined {
    return React.useContext(ConferenceContext);
}

function ConferenceProvider_WithoutUser({
    confSlug,
    children,
}: {
    confSlug: string;
    children: string | JSX.Element | JSX.Element[];
}): JSX.Element {
    const { loading, error, data } = useConferenceBySlug_WithoutUserQuery({
        variables: {
            slug: confSlug,
        },
    });

    if (loading && !data) {
        return <CenteredSpinner />;
    }

    if (error) {
        return (
            <VStack>
                <PageNotFound />
            </VStack>
        );
    }

    if (!data || data.conference_Conference.length === 0) {
        return (
            <VStack>
                <PageNotFound />
            </VStack>
        );
    }

    return <ConferenceContext.Provider value={data.conference_Conference[0]}>{children}</ConferenceContext.Provider>;
}

function ConferenceProvider_WithUser({
    confSlug,
    children,
    userId,
}: {
    confSlug: string;
    children: string | JSX.Element | JSX.Element[];
    userId: string;
}): JSX.Element {
    const { loading, error, data } = useConferenceBySlug_WithUserQuery({
        variables: {
            slug: confSlug,
            userId,
        },
    });
    const [now] = useState(Date.now());

    if (loading && !data) {
        return <CenteredSpinner />;
    }

    if (error) {
        return (
            <VStack>
                <GenericErrorPage heading="Sorry, Midspace ran into a problem.">
                    <Text pb="6px">If you report this error, please include the following details:</Text>
                    <VStack alignItems="left" p="8px" bgColor="#eee" maxH="80vh" overflowY="auto" maxWidth="80%">
                        <Code>{JSON.stringify(error)}</Code>
                        <Code>Time: {now}</Code>
                        <Code>Location: {window.location.href}</Code>
                    </VStack>
                    <Button
                        onClick={() => window.location.reload(false)}
                        bgColor="#eee"
                        p="12px"
                        border="1px solid black"
                        borderRadius="4px"
                        fontSize="1.2em"
                    >
                        Refresh
                    </Button>
                    <chakra.a href="/">Return to home</chakra.a>
                </GenericErrorPage>
            </VStack>
        );
    }

    if (!data || data.conference_Conference.length === 0) {
        return (
            <VStack>
                <PageNotFound />
            </VStack>
        );
    }

    return <ConferenceContext.Provider value={data.conference_Conference[0]}>{children}</ConferenceContext.Provider>;
}

export default function ConferenceProvider({
    confSlug,
    children,
}: {
    confSlug: string;
    children: string | JSX.Element | JSX.Element[];
}): JSX.Element {
    const user = useMaybeCurrentUser();

    if (user.loading) {
        return <CenteredSpinner />;
    }

    if (user.user) {
        return (
            <ConferenceProvider_WithUser userId={user.user.id} confSlug={confSlug}>
                {children}
            </ConferenceProvider_WithUser>
        );
    } else {
        return <ConferenceProvider_WithoutUser confSlug={confSlug}>{children}</ConferenceProvider_WithoutUser>;
    }
}
