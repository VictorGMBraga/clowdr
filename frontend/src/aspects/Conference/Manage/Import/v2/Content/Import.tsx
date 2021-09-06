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

export default function ImportContent(): JSX.Element {
    const conference = useConference();
    const title = useTitle(`Import content for ${conference.shortName}`);

    const [data, setData] = useState<ParsedData<any[]>[] | undefined>();

    return (
        <RequireAtLeastOnePermissionWrapper
            permissions={[Permissions_Permission_Enum.ConferenceManageContent]}
            componentIfDenied={<PageNotFound />}
        >
            {title}
            <Heading as="h1" fontSize="2.3rem" lineHeight="3rem" mt={4}>
                Import Content for {conference.shortName}
            </Heading>
            <HStack justifyContent="center" alignItems="flex-start" w="100%" spacing={4}>
                <VStack spacing={10}>
                    <DataPanel onData={setData} />
                    <Process data={data} />
                </VStack>
                <Explanation />
            </HStack>
        </RequireAtLeastOnePermissionWrapper>
    );
}
