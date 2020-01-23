# Authentication for web-embedded bots

This document outlines strategies for implementing user authentication/authorization for bots embedded into websites using WebChat. Specifically we're looking at scenarios where the user is already authenticated to the host page.

## Case 1: Token accessible from JavaScript

The existing access token may be directly accessible to JavaScript running on the host page. For example:
1. The developer owns the host page and stores access tokens in local browser storage (`localStorage` or `sessionStorage`) or non-HTTP-only cookies
1. The host page provides a mechanism for getting its access token

The overall strategy is to send the token from WebChat to the bot on every outgoing activity. The bot can then extract the token from incoming activities.

1. Client-side JavaScript gets the existing token.
1. Client-side JavaScript sends the token on every outgoing activity (see the [WebChat backchannel sample](https://github.com/microsoft/BotFramework-WebChat/tree/master/samples/15.a.backchannel-piggyback-on-outgoing-activities)).
1. When the bot receives an activity, it extracts the token and uses it as needed.

The client should acquire new tokens as needed, so the bot itself should NOT cache the token.

Pros
- simple for the developer
- transparent to the user

Cons
- token storage is not secure
- bot isn't the intended recipient/appid of the token?

The [existing WebChat sample for single sign-on](https://github.com/microsoft/BotFramework-WebChat/tree/master/samples/19.b.single-sign-on-for-intranet-apps) provides some guidance for this case.

## Case 2: Token not accessible from JavaScript (client-side flow)

The existing access token may not be accessible from JavaScript. This is often the case when the developer is given a slice of the host page in which to embed their content, but has no control over the host page.

The overall strategy is to retrieve an access token from AAD. Then send the token from WebChat to the bot on every outgoing activity (as in case #1). The user already signed into the host page, so they should have an existing session with AAD. The developer can take advantage of this existing session to acquire a token "silently" and avoid additional user interaction.

1. Client-side JavaScript gets the signed-in user's UPN.
1. Client-side JavaScript silently acquires an access token from AAD, using the UPN as a `login_hint` (see [SSO with MSAL.js](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-sso#sso-without-msaljs-login)), and caches the token.
1. Client-side JavaScript sends the token on every outgoing activity (see the [WebChat backchannel sample](https://github.com/microsoft/BotFramework-WebChat/tree/master/samples/15.a.backchannel-piggyback-on-outgoing-activities)).
1. When the bot receives an activity, it extracts the token and uses it as needed.

The client should acquire new tokens as needed, so the bot itself should NOT cache the token. MSAL.js can automatically get a new token from AAD when the cached token expires.

If the user's UPN is not readily available, the app could use a pop-up the first time. AAD may skip the sign-in step anyway if the user is only signed into one account, so the pop-up would open and close on its own.


Pros
- simple for the developer using MSAL
- transparent to the user

Cons
- token storage is not secure
- silent acquisition requires knowing the user's UPN

## Case 3: Token not accessible from JavaScript (server-side flow)

Alternatively developers can use the auth code flow and store tokens server-side, which is recommended over implicit flow and client-side storage.

The overall strategy is to initiate an auth code flow so that the server receives the token directly. The server stores the token (associated with the user) and returns a DirectLine token to the client. The DirectLine token should be strictly tied to a validated user ID. Then, every incoming activity to the bot will include that user ID, which the server can use to look up the stored token.

1. Client-side JavaScript gets the signed-in user's UPN
1. Client-side JavaScript creates a hidden iframe to silently initiate the auth code flow to AAD, using the UPN as a `login_hint` and setting `prompt=none`
1. The server receives the auth code and exchanges it for an ID token and access token
1. The server extracts the `sub` or `oid` claim from the ID token. This will serve as the user ID
1. The server stores the access token associated with the user ID
1. The server generates a DirectLine token that is tied to the user ID (see [Enhanced Direct Line Authentication Features](https://blog.botframework.com/2018/09/25/enhanced-direct-line-authentication-features/))
1. The server returns the DirectLine token to the client. Since this is still in the context of the hidden iframe, the server should return HTML/JS that sends the DirectLine token to the host page (for example, using the `postMessage` API).
1. The client renders WebChat using the DirectLine token
1. When the bot receives an activity, it extracts the user ID, which is "verified" because it was strictly tied to the DirectLine token
1. The bot retrieves the previously stored access token for that particular user ID and uses the token as needed

If the user's UPN is not readily available, the app could use a pop-up the first time. AAD may skip the sign-in step anyway if the user is only signed into one account, so the pop-up would open and close on its own.

> TODO: DirectLine tokens are typically stored client-side. Since we're tying the DirectLine token to the access token, this method is somewhat less secure than a typical auth code flow. Think about how to improve

Pros
- token storage is more secure
- transparent to the user
- able to get refresh tokens, which enables scenarios like delayed actions

Cons
- more complex for the developer
- more work to securely store tokens on the server
- silent acquisition requires knowing the user's UPN

## Other considerations

### Getting user consent

In cases 2 and 3, attempting to acquire a token silently will fail if the user has not provided consent to the application. There are 2 options for handling this:
1. Use a pop-up to get user consent the first time. Subsequent silent requests should succeed without user interaction.
1. In an enterprise use case, have an admin pre-consent the app for the entire tenant. Users will never have to provide consent themselves.

### iframes

The latest GA version of MSAL.js does not support all scenarios in iframes (see [GitHub issue #899](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/899)). If the content lives in an iframe, the strategies above for acquiring a token silently will not work. There is ongoing work to support iframe scenarios, which is available in recent beta versions of MSAL.

### SharePoint

Not yet investigated.

### Non-AAD auth

Not yet investigated.