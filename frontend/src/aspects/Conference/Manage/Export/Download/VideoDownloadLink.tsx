import { HStack, Tooltip } from "@chakra-ui/react";
import type { ElementDataBlob } from "@clowdr-app/shared-types/build/content";
import React, { useContext, useMemo } from "react";
import { DownloadButton } from "../../../../Chakra/LinkButton";
import { FAIcon } from "../../../../Icons/FAIcon";
import { VideoDownloadContext } from "./VideoDownloadContext";

export function VideoDownloadLink({
    itemTitle,
    elementName,
    elementId,
    data,
    extractVideoUrl,
}: {
    itemTitle: string;
    elementName: string;
    elementId: string;
    data: ElementDataBlob;
    extractVideoUrl: (data: ElementDataBlob) => string | undefined;
}): JSX.Element {
    const { downloadedElementIds, addDownloadedElementId } = useContext(VideoDownloadContext);

    const downloaded = useMemo(() => downloadedElementIds.includes(elementId), [downloadedElementIds, elementId]);

    const videoURL = extractVideoUrl(data);

    return (
        <HStack>
            {downloaded ? (
                <Tooltip label="Downloaded">
                    <FAIcon icon="check-circle" iconStyle="s" aria-label="completed" color="green.500" />
                </Tooltip>
            ) : (
                <Tooltip label="Not yet downloaded">
                    <FAIcon icon="dot-circle" iconStyle="s" aria-label="error" color="blue.500" />
                </Tooltip>
            )}
            <DownloadButton
                size="sm"
                to={videoURL ?? "#"}
                isDisabled={!videoURL}
                onClick={() => addDownloadedElementId(elementId)}
                onContextMenu={() => addDownloadedElementId(elementId)}
                colorScheme={downloaded ? "gray" : "SecondaryActionButton"}
            >
                {itemTitle} ({elementName})
            </DownloadButton>
        </HStack>
    );
}
