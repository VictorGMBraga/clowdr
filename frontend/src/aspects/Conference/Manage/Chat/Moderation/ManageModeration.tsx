import { gql } from "@apollo/client";
import {
    Box,
    Button,
    chakra,
    Divider,
    Flex,
    FormControl,
    FormHelperText,
    FormLabel,
    Heading,
    HStack,
    Input,
    List,
    ListItem,
    Text,
    Textarea,
    useColorModeValue,
    VStack,
} from "@chakra-ui/react";
import * as R from "ramda";
import React, { Fragment, useMemo, useState } from "react";
import type {
    ManageModeration_ChatFlagFragment} from "../../../../../generated/graphql";
import {
    Permissions_Permission_Enum,
    useManageModeration_SelectFlagsQuery,
    useManageModeration_UpdateFlagMutation,
} from "../../../../../generated/graphql";
import CenteredSpinner from "../../../../Chakra/CenteredSpinner";
import { MessageState } from "../../../../Chat/ChatGlobalState";
import type { ChatConfiguration} from "../../../../Chat/Configuration";
import { ChatConfigurationProvider, ChatSpacing } from "../../../../Chat/Configuration";
import EmojiPickerProvider from "../../../../Chat/EmojiPickerProvider";
import ChatProfileModalProvider from "../../../../Chat/Frame/ChatProfileModalProvider";
import { useGlobalChatState } from "../../../../Chat/GlobalChatStateProvider";
import MessageBox from "../../../../Chat/Messages/MessageBox";
import PageNotFound from "../../../../Errors/PageNotFound";
import { useRestorableState } from "../../../../Generic/useRestorableState";
import { Markdown } from "../../../../Text/Markdown";
import { useTitle } from "../../../../Utils/useTitle";
import RequireAtLeastOnePermissionWrapper from "../../../RequireAtLeastOnePermissionWrapper";
import { useConference } from "../../../useConference";
import useCurrentRegistrant, { useMaybeCurrentRegistrant } from "../../../useCurrentRegistrant";

gql`
    fragment ManageModeration_ChatFlag on chat_Flag {
        ...ChatFlagData
        message {
            ...ChatMessageData
        }
    }

    query ManageModeration_SelectFlags($conferenceId: uuid!) {
        chat_Flag(where: { message: { chat: { conferenceId: { _eq: $conferenceId } } } }) {
            ...ManageModeration_ChatFlag
        }
    }

    mutation ManageModeration_UpdateFlag($flagId: Int!, $update: chat_Flag_set_input!) {
        update_chat_Flag_by_pk(pk_columns: { id: $flagId }, _set: $update) {
            ...ChatFlagData
        }
    }
`;

export default function ManageModeration(): JSX.Element {
    const conference = useConference();
    const title = useTitle(`Moderate chats for ${conference.shortName}`);

    return (
        <RequireAtLeastOnePermissionWrapper
            permissions={[Permissions_Permission_Enum.ConferenceModerateAttendees]}
            componentIfDenied={<PageNotFound />}
        >
            <Box w="100%">
                {title}
                <Heading mt={4} as="h1" size="xl">
                    Manage {conference.shortName}
                </Heading>
                <Heading id="page-heading" as="h2" size="lg" fontStyle="italic" mt={2}>
                    Chat Moderation
                </Heading>
                <ModerationList />
            </Box>
        </RequireAtLeastOnePermissionWrapper>
    );
}

function ModerationList(): JSX.Element {
    const conference = useConference();
    const flagsResponse = useManageModeration_SelectFlagsQuery({
        variables: {
            conferenceId: conference.id,
        },
    });
    const sortedFlags = useMemo(
        () =>
            flagsResponse.data &&
            R.sortWith(
                [
                    (x, y) => (!x.resolved_at ? (!y.resolved_at ? 0 : -1) : !y.resolved_at ? 1 : 0),
                    (x, y) => Date.parse(y.created_at) - Date.parse(x.created_at),
                ],
                flagsResponse.data.chat_Flag
            ),
        [flagsResponse.data]
    );
    const boundaryIndex = useMemo(() => sortedFlags?.findIndex((x) => !!x.resolved_at), [sortedFlags]);

    return (
        <>
            {flagsResponse.loading && sortedFlags === undefined ? <CenteredSpinner /> : undefined}
            <ModerationChatConfigurationProvider>
                <List spacing={8} mt={4} px={2} py={2}>
                    {sortedFlags?.map((flag, idx) =>
                        idx === boundaryIndex && idx > 0 ? (
                            <Fragment key={flag.id}>
                                <Box>
                                    <Divider />
                                    <Text w="100%" textAlign="center" mt={2} fontWeight="bold">
                                        Resolved
                                    </Text>
                                </Box>
                                <ModerationFlag flag={flag} />
                            </Fragment>
                        ) : (
                            <ModerationFlag key={flag.id} flag={flag} />
                        )
                    )}
                    {sortedFlags?.length === 0 ? <ListItem>No reports have been made.</ListItem> : undefined}
                </List>
            </ModerationChatConfigurationProvider>
        </>
    );
}

function ModerationChatConfigurationProvider({
    children,
}: {
    children: React.ReactChild | React.ReactChildren;
}): JSX.Element {
    const currentRegistrant = useMaybeCurrentRegistrant();
    const [spacing, setSpacing] = useRestorableState<ChatSpacing>(
        "clowdr-chatSpacing",
        ChatSpacing.COMFORTABLE,
        (x) => x.toString(),
        (x) => parseInt(x, 10) as ChatSpacing
    );
    const [fontSize, setFontSize] = useRestorableState<number>(
        "clowdr-chatFontSize",
        16,
        (x) => x.toString(),
        (x) => parseInt(x, 10) as ChatSpacing
    );
    const fontSizeMin = 10;
    const fontSizeMax = 28;
    const config = useMemo<ChatConfiguration>(
        () => ({
            customHeadingElements: undefined,
            state: null,
            fontSizeRange: {
                min: fontSizeMin,
                max: fontSizeMax,
                value: fontSize,
            },
            useTypingIndicators: false,
            permissions: {
                canMessage: false,
                canEmote: false,
                canReact: false,
                canQuestion: false,
                canAnswer: false,
                canPoll: false,
                canAnswerPoll: false,

                canPin: false,
                canUnpin: false,

                canSubscribe: false,
                canUnsubscribe: false,

                canEditMessage: false, // TODO
                canEditEmote: false, // TODO
                canEditReaction: false, // TODO
                canEditQuestion: false, // TODO
                canEditAnswer: false, // TODO
                canEditPoll: false, // TODO

                canDeleteMessage: true,
                canDeleteEmote: true,
                canDeleteReaction: true,
                canDeleteQuestion: true,
                canDeleteAnswer: true,
                canDeletePoll: true,

                canFlag: false,
            },
            messageConfig: {
                length: {
                    min: 1,
                    max: 1120,
                },
                sendCooloffPeriodMs: 0,
                editTimeoutSeconds: 60, // Allow 60s to start editing a sent message before locking out
                showProfilePictures: true,
                showPlaceholderProfilePictures: true,
                enableProfileModal: true,
            },
            emoteConfig: {
                sendCooloffPeriodMs: 3000,
                editTimeoutSeconds: 0, // Once an emote is sent, don't allow it to be edited
            },
            reactionConfig: {
                maxPerMessage: 3, // Max. 3 reactions per user per message
                sendCooloffPeriodMs: 0,
                editTimeoutSeconds: undefined, // Always permit retraction of reactions
                highlightNew: true, // Highlight new reactions for user's sent messages
            },
            questionConfig: {
                length: {
                    min: 10,
                    max: 1120,
                },
                sendCooloffPeriodMs: 5000,
                editTimeoutSeconds: 30, // Allow 30s to start editing a sent message before locking out
            },
            answerConfig: {
                length: {
                    min: 2,
                    max: 1120,
                },
                sendCooloffPeriodMs: 0,
                editTimeoutSeconds: 0, // Do not allow editing of answers
            },
            pollConfig: {
                sendCooloffPeriodMs: 10000,
                editTimeoutSeconds: 60, // Allow 60s to start editing a sent message before locking out
                questionLength: {
                    min: 10,
                    max: 240,
                },
                numberOfAnswers: {
                    min: 1,
                    max: 10,
                },
                answerLength: {
                    min: 1,
                    max: 20,
                },
            },
            currentRegistrantId: currentRegistrant?.id,
            currentRegistrantName: currentRegistrant?.displayName,
            spacing,
            setSpacing,
            setFontSize: (next) =>
                setFontSize((old) =>
                    Math.min(fontSizeMax, Math.max(fontSizeMin, typeof next === "function" ? next(old) : next))
                ),
            messageBatchSize: 30,
            onProfileModalOpened: undefined,
            onEmoteReceived: undefined,
        }),
        [currentRegistrant?.displayName, currentRegistrant?.id, fontSize, setFontSize, setSpacing, spacing]
    );

    return (
        <ChatConfigurationProvider config={config}>
            <EmojiPickerProvider>
                <ChatProfileModalProvider>{children}</ChatProfileModalProvider>
            </EmojiPickerProvider>
        </ChatConfigurationProvider>
    );
}

function ModerationFlag({ flag }: { flag: ManageModeration_ChatFlagFragment }): JSX.Element {
    const borderColour = useColorModeValue("gray.300", "gray.600");
    const dividerColour = useColorModeValue("gray.400", "gray.500");
    const bgColor = useColorModeValue("gray.100", "gray.800");
    const shadow = useColorModeValue("0px 0px 4px 0px rgba(0,0,0,0.25)", "0px 0px 4px 0px rgba(255,255,255,0.6)");
    const createdAt = useMemo(() => new Date(flag.created_at), [flag.created_at]);
    const updatedAt = useMemo(() => new Date(flag.updated_at), [flag.updated_at]);
    const resolvedAt = useMemo(() => flag.resolved_at && new Date(flag.resolved_at), [flag.resolved_at]);
    const chatState = useGlobalChatState();
    const messageState = useMemo(() => new MessageState(chatState, flag.message), [chatState, flag.message]);
    const registrant = useCurrentRegistrant();

    const [update, updateResponse] = useManageModeration_UpdateFlagMutation();

    const [newNote, setNewNote] = useState<string>("");
    const [resolution, setResolution] = useState<string>("");

    return (
        <ListItem bgColor={bgColor} shadow={shadow} p={4} w="100%">
            <VStack spacing={3} alignItems="flex-start" w="100%">
                <Flex fontSize="xs" w="100%" flexWrap="wrap">
                    <Button
                        size="xs"
                        colorScheme="purple"
                        onClick={() => {
                            chatState.showSidebar?.();
                            chatState.openChatInSidebar?.(flag.message.chatId);
                        }}
                    >
                        Open chat
                    </Button>
                    <HStack mt={1} ml="auto" mr="auto">
                        <Text whiteSpace="normal">Reported at: {createdAt.toLocaleString()}</Text>
                        <Text>&middot;</Text>
                        <Text whiteSpace="normal">Last updated: {updatedAt.toLocaleString()}</Text>
                        {resolvedAt && (
                            <>
                                <Text>&middot;</Text>
                                <Text whiteSpace="normal">Resolved at: {resolvedAt.toLocaleString()}</Text>
                            </>
                        )}
                    </HStack>
                </Flex>
                <Text fontSize="sm">
                    <chakra.span fontWeight="bold">Reason:</chakra.span> {flag.type.replace(/_/g, " ")}
                </Text>
                <Box
                    w="100%"
                    flexDir="column"
                    justifyContent="stretch"
                    border="1px solid"
                    borderColor={borderColour}
                    pl={1}
                    borderRadius="lg"
                    maxW={450}
                >
                    <MessageBox message={messageState} />
                </Box>
                <VStack spacing={1} alignItems="flex-start" w="100%">
                    <Text fontWeight="bold">Notes</Text>
                    <Markdown>{flag.notes ?? "No notes provided."}</Markdown>
                </VStack>
                <Divider borderColor={dividerColour} />
                {!resolvedAt ? (
                    <>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="bold" fontStyle="italic">
                                Add a note
                            </FormLabel>
                            <Textarea value={newNote} onChange={(ev) => setNewNote(ev.target.value)} />
                            <FormHelperText>Notes are formatted using Markdown</FormHelperText>
                        </FormControl>
                        <Button
                            colorScheme="purple"
                            size="sm"
                            isDisabled={newNote.trim().length === 0}
                            isLoading={updateResponse.loading}
                            onClick={() => {
                                update({
                                    variables: {
                                        flagId: flag.id,
                                        update: {
                                            notes:
                                                (flag.notes?.length ? flag.notes + "\n\n----\n\n" : "") +
                                                registrant.displayName +
                                                ", " +
                                                new Date().toUTCString() +
                                                "\n\n" +
                                                newNote.trim(),
                                        },
                                    },
                                });
                            }}
                        >
                            Add note
                        </Button>
                        <Divider borderColor={dividerColour} />
                    </>
                ) : undefined}
                {flag.resolution ? (
                    <Text>
                        <chakra.span fontWeight="bold">Resolution:</chakra.span> {flag.resolution}
                    </Text>
                ) : (
                    <>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="bold" fontStyle="italic">
                                Resolve this report
                            </FormLabel>
                            <Input value={resolution} onChange={(ev) => setResolution(ev.target.value)} />
                            <FormHelperText>Provide a summary of your conclusion.</FormHelperText>
                        </FormControl>
                        <Button
                            colorScheme="purple"
                            size="sm"
                            isDisabled={resolution.trim().length === 0}
                            isLoading={updateResponse.loading}
                            onClick={() => {
                                update({
                                    variables: {
                                        flagId: flag.id,
                                        update: {
                                            resolution: resolution.trim(),
                                            resolved_at: new Date().toISOString(),
                                        },
                                    },
                                });
                            }}
                        >
                            Resolve
                        </Button>
                    </>
                )}
            </VStack>
        </ListItem>
    );
}
