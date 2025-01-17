import assert from "assert";
import { Socket } from "socket.io";
import { is } from "typescript-is";
import { Room_ManagementMode_Enum } from "../../generated/graphql";
import { chatListenersKeyName, generateChatRoomName, socketChatsKeyName } from "../../lib/chat";
import { canSelectChat } from "../../lib/permissions";
import { redisClientP, redisClientPool } from "../../redis";

export function onSubscribe(
    conferenceSlugs: string[],
    userId: string,
    socketId: string,
    socket: Socket
): (chatId: any) => Promise<void> {
    return async (chatId) => {
        if (chatId) {
            try {
                assert(is<string>(chatId), "Data does not match expected type.");

                if (
                    await canSelectChat(
                        userId,
                        chatId,
                        conferenceSlugs,
                        false,
                        "chat.onSubscribe:test-registrant-id",
                        "chat.onSubscribe:test-conference-id",
                        "chat.onSubscribe:test-room-id",
                        "chat.onSubscribe:test-room-name",
                        Room_ManagementMode_Enum.Public,
                        []
                    )
                ) {
                    const client = await redisClientPool.acquire("socket-handlers/chat/chat/onSubscribe");
                    try {
                        // Always call join - a websocket re-establishing its connection to chat needs to rejoin the session
                        socket.join(generateChatRoomName(chatId));
                        socket.emit("chat.subscribe.ack", chatId);

                        // And these are harmless - doesn't matter if we're re-adding
                        await redisClientP.sadd(client)(chatListenersKeyName(chatId), `${socketId}¬${userId}`);
                        await redisClientP.sadd(client)(socketChatsKeyName(socketId), chatId);
                    } finally {
                        redisClientPool.release("socket-handlers/chat/chat/onSubscribe", client);
                    }
                }
            } catch (e) {
                console.error(`Error processing chat.subscribe (socket: ${socketId}, chatId: ${chatId})`, e);
            }
        }
    };
}

export function onUnsubscribe(
    conferenceSlugs: string[],
    userId: string,
    socketId: string,
    socket: Socket
): (chatId: any) => Promise<void> {
    return async (chatId) => {
        if (chatId) {
            try {
                assert(is<string>(chatId), "Data does not match expected type.");

                if (
                    await canSelectChat(
                        userId,
                        chatId,
                        conferenceSlugs,
                        false,
                        "chat.onSubscribe:test-registrant-id",
                        "chat.onSubscribe:test-conference-id",
                        "chat.onSubscribe:test-room-id",
                        "chat.onSubscribe:test-room-name",
                        Room_ManagementMode_Enum.Public,
                        []
                    )
                ) {
                    socket.leave(generateChatRoomName(chatId));
                    const client = await redisClientPool.acquire("socket-handlers/chat/chat/onUnsubscribe");
                    try {
                        await redisClientP.srem(client)(chatListenersKeyName(chatId), `${socketId}¬${userId}`);
                        await redisClientP.srem(client)(socketChatsKeyName(socketId), chatId);
                    } finally {
                        redisClientPool.release("socket-handlers/chat/chat/onUnsubscribe", client);
                    }
                }
            } catch (e) {
                console.error(`Error processing chat.unsubscribe (socket: ${socketId}, chatId: ${chatId})`, e);
            }
        }
    };
}
