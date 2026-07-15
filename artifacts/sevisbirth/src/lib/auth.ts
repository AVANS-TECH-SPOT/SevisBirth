import { setAuthTokenGetter } from "@workspace/api-client-react";

export const getAuthToken = () => localStorage.getItem("sevisbirth_token");
export const setAuthToken = (token: string) => localStorage.setItem("sevisbirth_token", token);
export const clearAuthToken = () => localStorage.removeItem("sevisbirth_token");

// Wire it up to the API client
setAuthTokenGetter(getAuthToken);
