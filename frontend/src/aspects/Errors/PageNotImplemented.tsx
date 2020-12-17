import { Link, Text } from "@chakra-ui/react";
import React from "react";
import LinkButton from "../Chakra/LinkButton";
import GenericErrorPage from "./GenericErrorPage";

export default function PageNotImplemented(): JSX.Element {
    return (
        <GenericErrorPage heading="This page is coming soon!">
            <>
                <Text fontSize="xl" lineHeight="revert" fontWeight="light">
                    <Link isExternal href="https://github.com/clowdr-app/">
                        Our team
                    </Link>{" "}
                    is working as hard as they can to deliver features on a continuous rolling basis. Please check back
                    soon!
                </Text>
                <LinkButton to="/">Go to home page</LinkButton>
            </>
        </GenericErrorPage>
    );
}
