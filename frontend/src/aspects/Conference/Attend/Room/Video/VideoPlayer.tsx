import { gql } from "@apollo/client";
import {
    Alert,
    AlertIcon,
    AspectRatio,
    Button,
    CloseButton,
    Skeleton,
    Text,
    useFocusOnShow,
    useId,
    VStack,
} from "@chakra-ui/react";
import { contains, getRelatedTarget } from "@chakra-ui/utils";
import type {
    ElementDataBlob,
    VideoElementBlob} from "@clowdr-app/shared-types/build/content";
import {
    Content_ElementType_Enum,
    ElementBaseType,
    isElementDataBlob
} from "@clowdr-app/shared-types/build/content";
import * as R from "ramda";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useVideoPlayer_GetElementQuery } from "../../../../../generated/graphql";
import { LinkButton } from "../../../../Chakra/LinkButton";
import { FAIcon } from "../../../../Icons/FAIcon";
import { useConference } from "../../../useConference";
import { VideoElement } from "../../Content/Element/VideoElement";

export function VideoPlayer({
    elementId,
    mode = "USER_DRIVEN",
    onPlay,
    onPause,
}: {
    elementId: string;
    mode?: "USER_DRIVEN" | "CONTROLLED";
    onPlay?: () => void;
    onPause?: () => void;
}): JSX.Element {
    gql`
        query VideoPlayer_GetElement($elementId: uuid!) {
            content_Element_by_pk(id: $elementId) {
                id
                typeName
                isHidden
                data
                name
                item {
                    id
                    title
                }
            }
        }
    `;

    const { data, error, loading } = useVideoPlayer_GetElementQuery({
        variables: {
            elementId,
        },
    });

    const videoElementBlob = useMemo((): VideoElementBlob | null => {
        if (
            !data?.content_Element_by_pk ||
            ![
                Content_ElementType_Enum.VideoBroadcast,
                Content_ElementType_Enum.VideoFile,
                Content_ElementType_Enum.VideoPrepublish,
            ].includes(data.content_Element_by_pk.typeName)
        ) {
            return null;
        }

        const blob: ElementDataBlob = data.content_Element_by_pk.data;

        if (!isElementDataBlob(blob)) {
            return null;
        }

        const latestVersion = R.last(blob)?.data;

        if (!latestVersion || latestVersion.baseType !== ElementBaseType.Video) {
            return null;
        }

        return latestVersion;
    }, [data?.content_Element_by_pk]);

    const conference = useConference();
    const itemPath = data?.content_Element_by_pk?.item
        ? `/conference/${conference.slug}/item/${data.content_Element_by_pk.item.id}`
        : undefined;

    const popoverRef = useRef<HTMLDivElement>(null);
    const [finished, setFinished] = useState<boolean>(false);
    useFocusOnShow(popoverRef, {
        shouldFocus: true,
        visible: finished,
    });
    const id = useId();

    useEffect(() => {
        setFinished(false);
    }, [elementId]);

    const popoverEl = useMemo(
        () =>
            mode === "USER_DRIVEN" ? (
                <VStack
                    bgColor="rgba(0, 0, 0, 0.7)"
                    position="absolute"
                    p={4}
                    ref={popoverRef}
                    id={id}
                    onBlur={(event) => {
                        const relatedTarget = getRelatedTarget(event);
                        const targetIsPopover = contains(popoverRef.current, relatedTarget);
                        const isValidBlur = !targetIsPopover;

                        if (finished && isValidBlur) {
                            setFinished(false);
                        }
                    }}
                >
                    <CloseButton onClick={() => setFinished(false)} aria-controls={id} />
                    <Text fontSize="2xl">Select another video below</Text>
                    <FAIcon icon="hand-point-down" aria-hidden="true" iconStyle="r" fontSize="6xl" />
                </VStack>
            ) : undefined,
        [finished, id, mode]
    );

    const [hidePlayer, setHidePlayer] = useState<boolean>(false);
    useEffect(() => {
        setHidePlayer(false);
    }, [elementId]);

    return (
        <>
            {mode === "USER_DRIVEN" && data?.content_Element_by_pk?.item && itemPath ? (
                <LinkButton to={itemPath} my={2}>
                    {data.content_Element_by_pk.item.title}
                    <FAIcon icon="external-link-alt" iconStyle="s" ml={3} />
                </LinkButton>
            ) : !finished ? (
                hidePlayer ? (
                    <Button
                        colorScheme="PrimaryActionButton"
                        my={1}
                        size="xs"
                        onClick={() => {
                            setHidePlayer(false);
                        }}
                    >
                        Show video player
                    </Button>
                ) : (
                    <Button
                        colorScheme="PrimaryActionButton"
                        my={1}
                        size="xs"
                        onClick={() => {
                            setHidePlayer(true);
                        }}
                    >
                        Hide video player
                    </Button>
                )
            ) : undefined}
            {!hidePlayer && (mode === "USER_DRIVEN" || !finished) ? (
                <AspectRatio w="min(100%, 90vh * (16 / 9))" maxW="100%" ratio={16 / 9}>
                    <>
                        <Skeleton isLoaded={!loading} position="relative">
                            {videoElementBlob ? (
                                <>
                                    {mode === "USER_DRIVEN" && finished ? popoverEl : undefined}
                                    <VideoElement
                                        elementId={elementId}
                                        elementData={videoElementBlob}
                                        onPause={() => {
                                            onPause?.();
                                        }}
                                        onFinish={() => {
                                            onPause?.();
                                            setFinished(true);
                                        }}
                                        onPlay={() => {
                                            onPlay?.();
                                            setFinished(false);
                                        }}
                                    />
                                </>
                            ) : undefined}
                            {error ? (
                                <Alert status="error">
                                    <AlertIcon />
                                    Could not load video
                                </Alert>
                            ) : undefined}
                        </Skeleton>
                    </>
                </AspectRatio>
            ) : undefined}
        </>
    );
}
