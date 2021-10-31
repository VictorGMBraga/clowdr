import { Alert, AlertDescription, AlertTitle, Button, Text } from "@chakra-ui/react";
import React from "react";
import { gql } from "urql";
import { useInitialiseSuperUserMutation } from "../../generated/graphql";
import { useShieldedHeaders } from "../GQL/useShieldedHeaders";

gql`
    mutation InitialiseSuperUser {
        initialiseSuperUser {
            success
            error
        }
    }
`;

export default function SuperUserInitialise(): JSX.Element {
    const context = useShieldedHeaders({
        "X-Auth-Role": "superuser",
    });
    const [initialiseResponse, initialiseMutation] = useInitialiseSuperUserMutation();

    // TODO: System initialisation (when there's only a single user)
    return (
        <>
            {initialiseResponse.data?.initialiseSuperUser?.error ? (
                <Alert status="error">
                    <AlertTitle>Error initialising superuser.</AlertTitle>
                    <AlertDescription>{initialiseResponse.data.initialiseSuperUser.error}</AlertDescription>
                </Alert>
            ) : undefined}
            {initialiseResponse.data?.initialiseSuperUser?.success ? (
                <Alert status="success">
                    <AlertTitle>Superuser initialised!</AlertTitle>
                    <AlertDescription>Please refresh the page.</AlertDescription>
                </Alert>
            ) : initialiseResponse.data?.initialiseSuperUser?.success === false ? (
                <Alert status="error">
                    <AlertTitle>Superuser not initialised.</AlertTitle>
                    <AlertDescription>Please refresh the page.</AlertDescription>
                </Alert>
            ) : undefined}
            <Text>Superuser is not yet initialised. One-click initialisation is available.</Text>
            <Button
                isLoading={initialiseResponse.fetching}
                isDisabled={!!initialiseResponse.data?.initialiseSuperUser?.success}
                onClick={() => {
                    initialiseMutation({}, context);
                }}
            >
                Initialise superuser
            </Button>
        </>
    );
}