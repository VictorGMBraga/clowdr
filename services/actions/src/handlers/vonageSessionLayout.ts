import { gql } from "@apollo/client/core";
import assert from "assert";
import { VonageSession_RemoveInvalidStreamsDocument } from "../generated/graphql";
import { apolloClient } from "../graphqlClient";
import Vonage from "../lib/vonage/vonageClient";
import { applyVonageSessionLayout, convertLayout } from "../lib/vonage/vonageTools";
import { Payload, VonageSessionLayoutData_Record } from "../types/hasura/event";

async function removeInvalidEventParticipantStreams(validStreamIds: string[], vonageSessionId: string) {
    gql`
        mutation VonageSession_RemoveInvalidStreams($validStreamIds: [String!]!, $vonageSessionId: String!) {
            delete_video_VonageParticipantStream(
                where: { vonageStreamId: { _nin: $validStreamIds }, vonageSessionId: { _eq: $vonageSessionId } }
            ) {
                affected_rows
            }
        }
    `;

    console.log("Attempting to remove invalid VonageParticipantStreams", { vonageSessionId });

    await apolloClient.mutate({
        mutation: VonageSession_RemoveInvalidStreamsDocument,
        variables: {
            validStreamIds,
            vonageSessionId,
        },
    });
}

export async function handleVonageSessionLayoutCreated(
    payload: Payload<VonageSessionLayoutData_Record>
): Promise<void> {
    assert(payload.event.data.new, "Expected payload to have new row");

    const newRow = payload.event.data.new;
    const layoutData = newRow.layoutData;

    if (!layoutData) {
        return;
    }

    // At the moment, there seems to be no easy way to figure out who is publishing a stream if we didn't
    // record/receive the callback. So we'll just settle for removing invalid ones.
    const streams = await Vonage.listStreams(newRow.vonageSessionId);
    if (!streams) {
        console.error("Could not retrieve list of streams from Vonage", { vonageSessionId: newRow.vonageSessionId });
        throw new Error("Could not retrieve list of streams from Vonage");
    }
    await removeInvalidEventParticipantStreams(
        streams.map((x) => x.id),
        newRow.vonageSessionId
    );

    const layout = convertLayout(layoutData);
    try {
        await applyVonageSessionLayout(newRow.vonageSessionId, layout);
        await Vonage.signal(newRow.vonageSessionId, null, {
            data: layoutData,
            type: "layout-signal",
        });
    } catch (err) {
        console.error("Failed to apply Vonage layout", {
            err,
            vonageSessionId: newRow.vonageSessionId,
            vonageSessionLayoutId: newRow.id,
            type: layoutData.type,
        });
    }
}
