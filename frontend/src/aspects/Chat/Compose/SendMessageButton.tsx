import type { ButtonProps} from "@chakra-ui/react";
import { useColorModeValue } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import FAIcon from "../../Icons/FAIcon";
import { useChatConfiguration } from "../Configuration";
import SendLockoutButton from "./SendLockoutButton";

export function SendMessageButton({ sendFailed, ...props }: { sendFailed: boolean } & ButtonProps): JSX.Element {
    const colour = useColorModeValue("ChatSendMessageButton.color-light", "ChatSendMessageButton.color-dark");
    const focusColour = useColorModeValue(
        "ChatSendMessageButton.focusColor-light",
        "ChatSendMessageButton.focusColor-dark"
    );
    const activeColour = useColorModeValue(
        "ChatSendMessageButton.activeColor-light",
        "ChatSendMessageButton.activeColor-dark"
    );
    const finishingTransform = "translate(100%, -50%) rotate(50deg) scale(0%)";
    const [wasJustClicked, setWasJustClicked] = useState<boolean>(false);

    const config = useChatConfiguration();

    useEffect(() => {
        let tId: number | undefined;
        if (wasJustClicked) {
            tId = setTimeout(
                (() => {
                    setWasJustClicked(false);
                }) as TimerHandler,
                1000
            );
        }
        return () => {
            if (tId) {
                clearTimeout(tId);
            }
        };
    }, [wasJustClicked]);

    return (
        <SendLockoutButton
            sendFailed={sendFailed}
            aria-label="Send"
            colorScheme="ChatSendMessageButton"
            background="none"
            color={colour}
            _hover={{}}
            _active={{}}
            p={config.spacing}
            w="100%"
            h="3ex"
            isDisabled={props.isDisabled || wasJustClicked}
            fontSize={config.fontSizeRange.value}
            {...props}
            onClick={(ev) => {
                setWasJustClicked(true);
                setTimeout(() => {
                    props.onClick?.(ev);
                }, 500);
            }}
            overflow="hidden"
        >
            <FAIcon
                iconStyle="s"
                icon="paper-plane"
                _focus={{
                    color: focusColour,
                    transform: props.isDisabled
                        ? "none"
                        : wasJustClicked
                        ? finishingTransform
                        : "translate(10%, -10%) rotate(10deg)",
                }}
                _hover={{
                    color: focusColour,
                    transform: props.isDisabled
                        ? "none"
                        : wasJustClicked
                        ? finishingTransform
                        : "translate(10%, -10%) rotate(10deg)",
                }}
                _active={{
                    color: activeColour,
                    transform: props.isDisabled ? "none" : finishingTransform,
                }}
                transform={props.isDisabled ? "none" : wasJustClicked ? finishingTransform : undefined}
                transition="all 0.3s ease-in"
            />
        </SendLockoutButton>
    );
}
