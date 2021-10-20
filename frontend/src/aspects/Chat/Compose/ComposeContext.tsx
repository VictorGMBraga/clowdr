import type { UppyFile } from "@uppy/core";
import assert from "assert";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Chat_MessageType_Enum } from "../../../generated/graphql";
import type { ChatConfiguration} from "../Configuration";
import { useChatConfiguration } from "../Configuration";
import type { MinMax } from "../Types/Base";
import type { AnswerMessageData, MessageData, MessageMediaData, OrdinaryMessageData } from "../Types/Messages";
import { useSendMessageQueries } from "./SendMessageQueries";

interface ComposeCtx {
    newMessage: string;
    newMessageType: Chat_MessageType_Enum;
    newMessageData: MessageData;

    messageLengthRange: MinMax;

    lastSendTime: number;
    readyToSend: boolean;
    blockedReason: string | undefined;
    file: { file: UppyFile; data?: MessageMediaData } | null;
    setFile: (value: { file: UppyFile; data?: MessageMediaData } | null) => void;

    setNewMessage: (msg: string) => void;
    setNewMessageType: (type: Chat_MessageType_Enum) => void;
    setNewMessageData: (data: MessageData) => void;

    isSending: boolean;
    sendError: string | undefined;
    send: (data?: MessageData) => void;

    setAnsweringQuestionId: (ids: number[] | null) => void;
}

const ComposeContext = React.createContext<ComposeCtx | undefined>(undefined);

export function useComposeContext(): ComposeCtx {
    const ctx = React.useContext(ComposeContext);
    if (!ctx) {
        throw new Error("Context not available - are you outside the provider?");
    }
    return ctx;
}

export function defaultAvailableMessageType(config: ChatConfiguration): Chat_MessageType_Enum | undefined {
    if (config.permissions.canMessage) {
        return Chat_MessageType_Enum.Message;
    }
    if (config.permissions.canEmote) {
        return Chat_MessageType_Enum.Emote;
    }
    if (config.permissions.canQuestion) {
        return Chat_MessageType_Enum.Question;
    }
    if (config.permissions.canAnswer) {
        return Chat_MessageType_Enum.Answer;
    }
    if (config.permissions.canPoll) {
        return Chat_MessageType_Enum.Poll;
    }
}

export function ComposeContextProvider({
    children,
    setAnsweringQuestionSIdRef,
}: {
    children: React.ReactNode | React.ReactNodeArray;
    setAnsweringQuestionSIdRef: React.RefObject<{ f: (sIds: string[] | null) => void; answeringSIds: string[] | null }>;
}): JSX.Element {
    const config = useChatConfiguration();
    const defaultType = defaultAvailableMessageType(config);
    assert(defaultType !== undefined, "No available message types to send!");
    const [newMessage, setNewMessage] = useState<string>("");
    const [newMessageType, setNewMessageType] = useState<Chat_MessageType_Enum>(defaultType);
    const [newMessageData, setNewMessageData] = useState<MessageData>({});
    const [lastSendTime, setLastSendTime] = useState<number>(0);
    const [file, setFile] = useState<{ file: UppyFile; data?: MessageMediaData } | null>(null);
    // const now = useRealTime(250);
    const sendQueries = useSendMessageQueries();

    const minLength =
        useMemo(() => {
            switch (newMessageType) {
                case Chat_MessageType_Enum.Message:
                    return config.messageConfig.length?.min;
                case Chat_MessageType_Enum.Emote:
                    return 1;
                case Chat_MessageType_Enum.Question:
                    return config.questionConfig.length?.min;
                case Chat_MessageType_Enum.Answer:
                    return config.answerConfig.length?.min;
                case Chat_MessageType_Enum.Poll:
                    return config.pollConfig.questionLength?.min;
            }
        }, [
            newMessageType,
            config.answerConfig.length?.min,
            config.messageConfig.length?.min,
            config.pollConfig.questionLength?.min,
            config.questionConfig.length?.min,
        ]) ?? 0;

    const maxLength = useMemo(() => {
        switch (newMessageType) {
            case Chat_MessageType_Enum.Message:
                return config.messageConfig.length?.max;
            case Chat_MessageType_Enum.Emote:
                return 1;
            case Chat_MessageType_Enum.Question:
                return config.questionConfig.length?.max;
            case Chat_MessageType_Enum.Answer:
                return config.answerConfig.length?.max;
            case Chat_MessageType_Enum.Poll:
                return config.pollConfig.questionLength?.max;
        }
    }, [
        newMessageType,
        config.answerConfig.length?.max,
        config.messageConfig.length?.max,
        config.pollConfig.questionLength?.max,
        config.questionConfig.length?.max,
    ]);

    // const lockoutTimeMs = useMemo(() => {
    //     switch (newMessageType) {
    //         case Chat_MessageType_Enum.Message:
    //             return config.messageConfig.sendCooloffPeriodMs;
    //         case Chat_MessageType_Enum.Emote:
    //             return config.emoteConfig.sendCooloffPeriodMs;
    //         case Chat_MessageType_Enum.Question:
    //             return config.questionConfig.sendCooloffPeriodMs;
    //         case Chat_MessageType_Enum.Answer:
    //             return config.answerConfig.sendCooloffPeriodMs;
    //         case Chat_MessageType_Enum.Poll:
    //             return config.pollConfig.sendCooloffPeriodMs;
    //     }
    // }, [
    //     newMessageType,
    //     config.answerConfig.sendCooloffPeriodMs,
    //     config.emoteConfig.sendCooloffPeriodMs,
    //     config.messageConfig.sendCooloffPeriodMs,
    //     config.pollConfig.sendCooloffPeriodMs,
    //     config.questionConfig.sendCooloffPeriodMs,
    // ]);

    const newMessageComparisonV = newMessage.replace(/\s+/gi, " ").trim();

    const blockedReason =
        newMessageComparisonV.length < minLength
            ? `Minimum length ${minLength} character${minLength !== 1 ? "s" : ""}`
            : maxLength !== undefined && newMessageComparisonV.length > maxLength
            ? `${newMessageComparisonV.length} / ${maxLength} character${maxLength !== 1 ? "s" : ""}`
            : // : newMessageType === Chat_MessageType_Enum.Question && !newMessageComparisonV.includes("?")
            // ? "Question mark required."
            newMessageType === Chat_MessageType_Enum.Answer && !("questionMessagesIds" in newMessageData)
            ? "Please select the question you are answering."
            : file && !file?.data
            ? "Please wait for file to finish uploading."
            : undefined;

    const setAnsweringQuestionId = useCallback(
        (ids) => {
            if (ids !== null) {
                if (newMessageType !== Chat_MessageType_Enum.Answer) {
                    setNewMessageType(Chat_MessageType_Enum.Answer);
                }
                const data: AnswerMessageData = {
                    questionMessagesIds: ids,
                    media: file?.data,
                };
                setNewMessageData(data);
            } else {
                if (newMessageType === Chat_MessageType_Enum.Answer) {
                    setNewMessageType(Chat_MessageType_Enum.Message);
                    const data: OrdinaryMessageData = {
                        media: file?.data,
                    };
                    setNewMessageData(data);
                }
            }
        },
        [newMessageType, file]
    );

    useEffect(() => {
        if (setAnsweringQuestionSIdRef?.current) {
            setAnsweringQuestionSIdRef.current.f = setAnsweringQuestionId;
            setAnsweringQuestionSIdRef.current.answeringSIds =
                newMessageType === Chat_MessageType_Enum.Answer
                    ? (newMessageData as AnswerMessageData).questionMessagesSIds ?? null
                    : null;
        }
    }, [newMessageData, newMessageType, setAnsweringQuestionId, setAnsweringQuestionSIdRef]);

    const send = useCallback(
        (data?: MessageData) => {
            (async () => {
                if (!config.currentRegistrantId) {
                    throw new Error("Not authorized.");
                }

                try {
                    assert(
                        config.state?.Id,
                        "config.state is null. Chat state is not available in the current context."
                    );
                    const isEmote = /^\p{Emoji}$/iu.test(newMessage);
                    sendQueries.send(
                        config.state.Id,
                        newMessageType === Chat_MessageType_Enum.Message && isEmote
                            ? Chat_MessageType_Enum.Emote
                            : newMessageType,
                        newMessage,
                        data ?? newMessageData,
                        false
                    );

                    setFile(null);
                    setNewMessage("");
                    setNewMessageData({});
                    setNewMessageType(Chat_MessageType_Enum.Message);
                } catch (e) {
                    console.error(`${new Date().toLocaleString()}: Failed to send message`, e);
                } finally {
                    setLastSendTime(Date.now());
                }
            })();
        },
        [config.currentRegistrantId, newMessage, newMessageData, newMessageType, config.state?.Id, sendQueries]
    );
    const messageLengthRange = useMemo(
        () => ({
            min: minLength,
            max: maxLength,
        }),
        [maxLength, minLength]
    );
    const setNewMessageTypeF = useCallback(
        (type: Chat_MessageType_Enum) => {
            if (type !== newMessageType) {
                setNewMessageType(type);
                setNewMessageData({
                    media: file?.data,
                });
            }
        },
        [newMessageType, file]
    );

    useEffect(() => {
        setNewMessageData((old) => ({
            ...old,
            media: file?.data,
        }));
    }, [file]);

    const ctx = useMemo(
        () => ({
            newMessage,
            setNewMessage,
            newMessageType,
            setNewMessageType: setNewMessageTypeF,
            newMessageData,
            setNewMessageData,
            messageLengthRange,
            lastSendTime,
            blockedReason,

            file,
            setFile,

            isSending: sendQueries.isSending,
            sendError: undefined,
            send,

            setAnsweringQuestionId,
            readyToSend: blockedReason === undefined, // && (!lockoutTimeMs || now - lastSendTime > lockoutTimeMs),
        }),
        [
            blockedReason,
            lastSendTime,
            messageLengthRange,
            newMessage,
            newMessageData,
            newMessageType,
            send,
            sendQueries.isSending,
            setAnsweringQuestionId,
            setNewMessageTypeF,
            file,
            setFile,
        ]
    );

    return <ComposeContext.Provider value={ctx}>{children}</ComposeContext.Provider>;
}
