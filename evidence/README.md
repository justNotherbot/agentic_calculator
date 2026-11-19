# Visual and test evidence

Screenshots are generated from the working app at desktop (1280 x 800) and mobile (360 x 740) sizes by `npm run test:visual`. The save-pending and failed-save screens use controlled IndexedDB-compatible responses; successful calculation and initial screen use the real browser IndexedDB. The screenshots are static evidence; review the running app for keyboard focus and behavior.

| State | Screenshot |
| --- | --- |
| Empty history, desktop | [desktop-empty.png](./desktop-empty.png) |
| Calculation saved, desktop | [desktop-success.png](./desktop-success.png) |
| Calculation saved, mobile | [mobile-success.png](./mobile-success.png) |
| Saving in progress, desktop | [desktop-pending.png](./desktop-pending.png) |
| Save failed with retry, desktop | [desktop-error.png](./desktop-error.png) |
| Save failed with retry, mobile | [mobile-error.png](./mobile-error.png) |

The visual review checked that the CDN styles loaded, the desktop layout has two columns, the mobile layout has one column without horizontal overflow, all keypad buttons fit at 360 px width, and the result, history, pending indicator, and retry error are visible. The screenshot pixels have not been manually inspected in this environment.

## Final Test Run

Run on 19 November 2026:

```text
$ npm test
tests 11
pass 11
fail 0

$ npm run test:client
Running 20 tests using 2 workers
20 passed (7.6s)

$ npm run test:visual
Running 2 tests using 1 worker
2 passed (6.8s)
```

`npm run test:client` includes the two visual tests, so the 20-test result covers both browser behavior and layout checks. Regenerate screenshots and rerun tests with the commands above when reviewing a new commit.
