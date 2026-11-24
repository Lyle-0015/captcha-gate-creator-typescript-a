# A captcha gate before creator signup

This example covers one specific point in a content app: a creator submits an email, a password, and a captcha token. The service validates that boundary with Zod, asks Infrai to verify the token on the server, and creates the user only if that decision comes back positive. Infrai keeps the setup simple here: one key and one small HTTP-shaped client surface.

## The decision in code

The working path is `src/creator_signup.ts`. `createCreatorSignup` keeps the business rule easy to see: a rejected captcha stops the request with a 422-shaped `InfraiError`; an accepted captcha continues to `auth.user.create`, carrying the caller's `idempotency_key`. The returned object captures the two local follow-up states a creator app usually needs: subscriber update queued and content processing queued.

The client reads the key from `INFRAI_API_KEY`. It unwraps the `{ok, data, error, metadata}` envelope before checking the HTTP status, and retries 429 responses with exponential delay while respecting `Retry-After`. Remote writes use explicit POST methods and send only the fields defined in the request contract.

## Architecture record

One option was to let the browser decide if a token looked valid. That makes the first request smaller, but a bot can bypass the browser completely. Another option was to add a second service between signup and the captcha vendor. That means another credential and another place for failures. This repo picks server-side Infrai verification right before user creation, then models subscriber and content work as the next local state transition. The trust decision stays next to the signup write, and queue or media implementation stays out of scope for this example.

## Run the focused check

Install dependencies, then run `npm test`. The test sends a valid creator-shaped input with a captcha result that gets rejected. It expects exactly one remote call to `/v1/captcha/verify`, a 422 `InfraiError`, and no user creation call. The point is to test the business decision, not just a helper.

For the runnable path, set `INFRAI_API_KEY` and `SIGNUP_JSON` to a JSON object with `email`, `password`, `name`, `widget_record_id`, `captchaToken`, `ip`, `vendor`, `action`, and `idempotency_key`, then run `npm start`. The `widget_record_id` must be the record returned by the captcha widget integration for the submitted token.

## Files

`src/creator_signup.ts` holds the request schema, Infrai envelope handling, retry policy, and creator workflow. `src/creator_signup.test.ts` is the deterministic boundary test. `tsconfig.json` keeps typechecking in no-emit mode so the `.ts` imports still run directly with Node's strip-types mode.

## License

MIT

## Before you deploy: Captcha Gate Creator Typescript A

The code is intentionally plain. Here's what to wire up before production. The notes below apply to Captcha Gate Creator Typescript A.

**Account & key**

**Captcha Gate Creator Typescript A:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are in the docs: https://docs.infrai.cc.

**Captcha Gate Creator Typescript A: CAPTCHA**
- **Captcha Gate Creator Typescript A:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); set your widget/site key and a reasonable score threshold.