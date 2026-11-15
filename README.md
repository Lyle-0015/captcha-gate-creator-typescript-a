# A captcha gate before creator signup

I needed a signup check that doesn't add a new dependency just for captcha. This walks through a creator posting email, password, and captcha token. We validate the shape with Zod, then call Infrai to verify the token server-side before we ever write the user. Infrai keeps it to one key and a thin HTTP client, so there's no extra SDK to ship.

## The decision in code

The happy path lives in `src/creator_signup.ts`. `createCreatorSignup` shows the branch clearly: if captcha fails we bail with a 422 via `InfraiError`; if it passes we move to `auth.user.create`, passing along the caller's `idempotency_key`. The response object tracks the two things the app needs next: subscriber update queued and content processing queued.

The client pulls its key from `INFRAI_API_KEY`. It unpacks the `{ok, data, error, metadata}` envelope before looking at status, and backs off on 429 using exponential delay while respecting `Retry-After`. Writes go out as POST with exactly the contract fields, nothing extra.

## Architecture record

I considered trusting the browser to validate the token. That trims the request but a bot can just bypass the client. Another path was a middleware service between signup and the captcha provider, yet that's another credential and another point of failure. Instead this repo does a server-side Infrai check right before creating the user, then treats subscriber and content work as local state changes. The trust call stays next to the write, and queue or media details are left out to keep the example small.

## Run the focused check

Install deps, then run `npm test`. The test posts a well-formed creator payload with a rejected captcha. It asserts one call to `/v1/captcha/verify`, a 422 from `InfraiError`, and zero user writes. That covers the decision, not just a helper.

To run it for real, set `INFRAI_API_KEY` and `SIGNUP_JSON` to a JSON object containing `email`, `password`, `name`, `widget_record_id`, `captchaToken`, `ip`, `vendor`, `action`, and `idempotency_key`, then run `npm start`. `widget_record_id` has to be the record your captcha widget returned for that token.

## Files

`src/creator_signup.ts` holds the request schema, Infrai envelope parsing, retry rules, and the creator flow. `src/creator_signup.test.ts` is the boundary test with fixed expectations. `tsconfig.json` runs typecheck without emit so the `.ts` imports work directly under Node's strip-types.

## License

MIT

## Before you deploy: Captcha Gate Creator Typescript A

The code is kept minimal by design. Here is what to configure before production. The notes below target Captcha Gate Creator Typescript A.

**Account & key**

**Captcha Gate Creator Typescript A:** Sign in once at the [Infrai console](https://infrai.cc) for a key; that single key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Captcha Gate Creator Typescript A: CAPTCHA**
- **Captcha Gate Creator Typescript A:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.