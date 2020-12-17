import { gql } from "@apollo/client";
import React from "react";
import { useSelectCurrentUserQuery } from "../../../generated/graphql";
import useUserId from "../../Auth/useUserId";
import useQueryErrorToast from "../../GQL/useQueryErrorToast";
import { CurrentUserContext, defaultCurrentUserContext } from "./useMaybeCurrentUser";

gql`
    query selectCurrentUser($userId: String!) {
        User(where: { id: { _eq: $userId } }) {
            id
            email
            lastName
            firstName
            onlineStatus {
                id
                lastSeen
                isIncognito
            }
        }
    }
`;

export default function CurrentUserProvider({
    children,
}: {
    children: string | JSX.Element | Array<JSX.Element>;
}): JSX.Element {
    const userId = useUserId();

    if (userId) {
        return <CurrentUserProvider_IsAuthenticated userId={userId}>{children}</CurrentUserProvider_IsAuthenticated>;
    } else {
        return (
            <CurrentUserContext.Provider
                value={{
                    ...defaultCurrentUserContext,
                    loading: false,
                }}
            >
                {children}
            </CurrentUserContext.Provider>
        );
    }
}

function CurrentUserProvider_IsAuthenticated({
    children,
    userId,
}: {
    children: string | JSX.Element | Array<JSX.Element>;
    userId: string;
}) {
    const { loading, error, data, refetch } = useSelectCurrentUserQuery({
        variables: {
            userId,
        },
    });
    useQueryErrorToast(error);

    // TODO: Split out fetch of onlineStatus and use polling (and provider separate refetch function)

    // TODO: Split out subscription to pinned chats, followed chats, unread indices

    const value = loading ? undefined : error ? false : data;

    return (
        <CurrentUserContext.Provider
            value={{
                loading,
                user: value,
                refetchUser: refetch,
            }}
        >
            {children}
        </CurrentUserContext.Provider>
    );
}
