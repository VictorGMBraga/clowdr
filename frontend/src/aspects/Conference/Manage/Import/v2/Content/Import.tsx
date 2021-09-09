import { Heading, HStack, VStack } from "@chakra-ui/react";
import React, { useState } from "react";
import { Permissions_Permission_Enum } from "../../../../../../generated/graphql";
import PageNotFound from "../../../../../Errors/PageNotFound";
import type { ParsedData } from "../../../../../Files/useCSVJSONXMLParser";
import { useTitle } from "../../../../../Utils/useTitle";
import RequireAtLeastOnePermissionWrapper from "../../../../RequireAtLeastOnePermissionWrapper";
import { useConference } from "../../../../useConference";
import DataPanel from "../DataPanel";
import Explanation from "./Explanation";
import Process from "./Process";
import Save from "./Save";
import type { Content_UpdatesDbData } from "./Updates";

export default function ImportContent(): JSX.Element {
    const conference = useConference();
    const title = useTitle(`Import content for ${conference.shortName}`);

    const [data, setData] = useState<ParsedData<any[]>[] | undefined>();
    const [updates, setUpdates] = useState<Content_UpdatesDbData | undefined>();

    return (
        <RequireAtLeastOnePermissionWrapper
            permissions={[Permissions_Permission_Enum.ConferenceManageContent]}
            componentIfDenied={<PageNotFound />}
        >
            {title}
            <Heading as="h1" fontSize="2.3rem" lineHeight="3rem" mt={4}>
                Import Content for {conference.shortName}
            </Heading>
            <VStack spacing={10} w="100%" overflow="hidden">
                <HStack w="100%" spacing={4}>
                    <DataPanel onData={setData} />
                    <Explanation />
                </HStack>
                <Process data={data} onUpdates={setUpdates} />
                <Save updates={updates} />
            </VStack>
        </RequireAtLeastOnePermissionWrapper>
    );
}