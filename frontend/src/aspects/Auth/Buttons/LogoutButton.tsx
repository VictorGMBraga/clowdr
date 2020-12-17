import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@chakra-ui/react";
import React from "react";

export default function LogoutButton(): JSX.Element {
    const { logout } = useAuth0();
    const returnTo = import.meta.env.SNOWPACK_PUBLIC_AUTH_LOGOUT_CALLBACK_URL;

    return (
        <Button margin={0} onClick={() => logout({ returnTo })} colorScheme="red">
            Log Out
        </Button>
    );
}
