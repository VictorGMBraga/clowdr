import { Flex, Heading } from "@chakra-ui/react";
import React from "react";
import { Route, Switch, useRouteMatch } from "react-router-dom";
import { Permissions_Permission_Enum } from "../../../../../generated/graphql";
import PageNotFound from "../../../../Errors/PageNotFound";
import { useTitle } from "../../../../Utils/useTitle";
import RequireAtLeastOnePermissionWrapper from "../../../RequireAtLeastOnePermissionWrapper";
import { useConference } from "../../../useConference";
import RestrictedDashboardButton from "../../RestrictedDashboardButton";
import ImportContent from "./Content/Import";

// TODO: Select a file
// TODO: Parse the data (in a way that will be suitable for an idempotent result to the Export data)
// TODO: Make sure the parser is performant
// TODO: Merge data with existing data - make sure this is performant
// TODO: Produce a table of changes
// TODO: Save only the changes (in the most efficient way possible)
// TODO: Never delete - only add or update. Tell the user about this.

// TODO: Handle each kind of import:
// - Tags
// - Exhibitions
// - Content
// - People
// - Schedule

// TODO: Extend schedule importer to handle:
// - Shuffle periods
// - Continuations
// - Event People
// - Event Tags

export default function ManageImport(): JSX.Element {
    const { path } = useRouteMatch();
    return (
        <Switch>
            <Route path={`${path}/content`}>
                <ImportContent />
            </Route>
            <Route path={`${path}/tags`}>
                <>TODO: Tags</>
            </Route>
            <Route path={`${path}/exhibitions`}>
                <>TODO: Exhibitions</>
            </Route>
            <Route path={`${path}/people`}>
                <>TODO: People</>
            </Route>
            <Route path={`${path}/rooms`}>
                <>TODO: Rooms</>
            </Route>
            <Route path={`${path}/schedule`}>
                <>TODO: Schedule</>
            </Route>
            <Route path={`${path}/shuffle`}>
                <>TODO: Shuffle</>
            </Route>
            <Route path={`${path}/registrants`}>
                <>TODO: Registrants</>
            </Route>
            <Route path={`${path}/`}>
                <InnerManageImport />
            </Route>
        </Switch>
    );
}

function InnerManageImport(): JSX.Element {
    const conference = useConference();
    const title = useTitle(`Import to ${conference.shortName}`);

    return (
        <RequireAtLeastOnePermissionWrapper
            permissions={[
                Permissions_Permission_Enum.ConferenceManageContent,
                Permissions_Permission_Enum.ConferenceManageSchedule,
            ]}
            componentIfDenied={<PageNotFound />}
        >
            {title}
            <Heading as="h1" fontSize="2.3rem" lineHeight="3rem" mt={4}>
                Manage {conference.shortName}
            </Heading>
            <Heading id="page-heading" as="h2" fontSize="1.7rem" lineHeight="2.4rem" fontStyle="italic">
                Import
            </Heading>
            <Flex
                flexDirection="row"
                flexWrap="wrap"
                gridGap={["0.3rem", "0.3rem", "1rem"]}
                alignItems="stretch"
                justifyContent="center"
                maxW="60em"
            >
                <RestrictedDashboardButton
                    to="import/v2/content"
                    name="Content"
                    icon="align-left"
                    description="Import content, including any tags, exhibitions and program people that do not already exist."
                    permissions={[Permissions_Permission_Enum.ConferenceManageContent]}
                    colorScheme="purple"
                />
                <RestrictedDashboardButton
                    to="import/v2/tags"
                    name="Tags"
                    icon="tags"
                    description="Import tags."
                    permissions={[Permissions_Permission_Enum.ConferenceManageContent]}
                    colorScheme="purple"
                />
                <RestrictedDashboardButton
                    to="import/v2/exhibitions"
                    name="Exhibitions"
                    icon="puzzle-piece"
                    description="Import exhibitions."
                    permissions={[Permissions_Permission_Enum.ConferenceManageContent]}
                    colorScheme="purple"
                />
                <RestrictedDashboardButton
                    to="import/v2/rooms"
                    name="Rooms"
                    icon="coffee"
                    description="Import additional rooms."
                    permissions={[Permissions_Permission_Enum.ConferenceManageSchedule]}
                    colorScheme="purple"
                />
                <RestrictedDashboardButton
                    to="import/v2/schedule"
                    name="Schedule"
                    icon="calendar"
                    description="Import your schedule, including any rooms that do not already exist."
                    permissions={[Permissions_Permission_Enum.ConferenceManageSchedule]}
                    colorScheme="purple"
                />
                <RestrictedDashboardButton
                    to="import/v2/people"
                    name="Program People"
                    icon="people-arrows"
                    description="Import program people."
                    permissions={[Permissions_Permission_Enum.ConferenceManageContent]}
                    colorScheme="purple"
                />
                <RestrictedDashboardButton
                    to="import/v2/shuffle"
                    name="Shuffle"
                    icon="random"
                    description="Import shuffle queues."
                    permissions={[Permissions_Permission_Enum.ConferenceManageContent]}
                    colorScheme="purple"
                />
                <RestrictedDashboardButton
                    to="import/v2/registrants"
                    name="Registrants"
                    icon="users"
                    description="Import your registrants, organisers and other users."
                    permissions={[Permissions_Permission_Enum.ConferenceManageAttendees]}
                    colorScheme="purple"
                />
            </Flex>
        </RequireAtLeastOnePermissionWrapper>
    );
}
