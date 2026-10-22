import { createHash } from "node:crypto";
import { SHIPPED_HASHES } from "./shipped-hashes.js";

// SHA-256 hashes (LF line endings) of every file this package ever shipped as a Claude Code command
// (.claude/commands/*.md) or a flat agent skill (.agents/skills/*.md). Upgrades delete an old file only
// when its hash is listed here, so a file a person changed is never removed.
// Regenerate from git history only when a release ships a new version of one of these legacy files (none expected).

export const LEGACY_COMMAND_HASHES = Object.freeze({
  "battlecard.md": [
    "c9ae35bc98ed7a9c7cdc4239fed7766e4d0590e03f1502d5f13593b568b7d58a"
  ],
  "brain.md": [
    "52c817bda5180faf783257d4fbd38ed2954c54d0dbc9bd9a31f31c67aee674f7",
    "c72f43f56b6f57046546956ba3c8b52e2e4c68a3aef1384e5563d597bd9c8e3b",
    "eb41cf506dfbe162c00e6f21f39ebc84444732a37273c3a77886dd06ac80107e"
  ],
  "brain:add-area.md": [
    "341ae575f905ceff528dd2d769573a9287a1d1a5858060dfacdcca39f5096920"
  ],
  "brain:doctor.md": [
    "5d792513d2e38dab587dbf582ba95c768e5bb61533a6dbd9a17ffda05a5b39be"
  ],
  "brain:onboarding.md": [
    "5a30f4d68c24e834e60725331ccbb9decdb1a4818a8f8e725b5573b2d9cadef3",
    "655180b5ceadd62b88d7956f971c4d357e6dbc4e3e8bcd4855afdddb8bb09db1",
    "cc8afb88b99fbcfb06225bd0dbbe8273c91c2126dbdb13306665ee33dc6139da",
    "f831cc2b3be9d447fc251e9054471d84b2b7ef788e26597622a30412babdd1c9"
  ],
  "brain:sales.md": [
    "a10ea260bfbdb93840e18146b4b6d5dbfdb2c2a7159db627ebfc1c55b21afbcd"
  ],
  "call.md": [
    "24d193faa4fea9f86190a8d90c300407c6afdd8f569a937277e94fe04179d883",
    "2b60bfc6d634eb9b1caa02b959e75f8c78617702bb789fba7c212079d10342ac",
    "6ba1a783e6fd5bffb61a27e32b8c059d0d9e5184b6ae57cfb5ddab26e8c97092",
    "983bacb1d9f881321c8c28f5fd524a4f341f77562209244bfd2cb176275e76e4"
  ],
  "flow.md": [
    "06e262c279a84458118907a02deb2c5bcad8cf4fb0d98615132c85de6bcc3245",
    "237f1872ff99b269ef6de47415d30c2c584957b94e56a1f74cc6e700f7786ccd",
    "2578e349ffb6df2412d44e8111df466cb90c46b4daa128c0eedc55afecaee046",
    "3266facb4325f60d1e991b9d6a720af70869ebb1760af361c7745f0a602196b3",
    "cfdfc8cd6f383d12eeeb417cdda6a3e2fc4a5b35ce1bd177045c6aa9f20023c2",
    "e34626e54bf7924a2124021200182ec7d0ff7d0237df8301b74d01f603e51747"
  ],
  "objection.md": [
    "d9c4ec5702d2c7280a9934879ca5a8e090b9def41901298d14b96d32dd7580f7"
  ],
  "retro.md": [
    "3d80072bac8184bdfbf51b6b7741da4d996d7582914bf7a33ca36dd07e23e4b5",
    "4672d7b6ee7cdd54234952ce8e788ddac8bb05ecac905bc9c1c2e7fc9825ac48",
    "858596aecabfc0f70a9f3081c4c72a959e636a86e33a00ec8cf4e98dde6da8dc",
    "cd15758b41d84ac379dcbe5182431d1b71b20066aae15486600ab03b236c7561",
    "d0f89d770a867d8bd19e637464ef1a27f682084203cf4fd1fbf8ceeb2b15e951",
    "dfef8d3be5572605e3bc7ad5e9bf87c0bfefcd515e4fd51d2366bda3fbd6645a"
  ]
});

export const LEGACY_FLAT_SKILL_HASHES = Object.freeze({
  "brain-search.md": [
    "3f13f3893b6ccd848c6a51cccc71ee9dfce5751872415372a3936d9f8bfbd957",
    "73a83a53d3d359739492c81f42419ea451b0e48e4b0c95247030190782c33529",
    "b8cb1ab5646daa68aa0c6fc7701f7c8dc5062a2b4c7576e0ea261a1de17ec427"
  ],
  "sales-assist.md": [
    "37cf3bc4444314124034957d616ed22c5dfdc998ab3871f28f4d27ec442bbb19",
    "7c03bc3cefcb55b5de246a6dcb414725a186d6d087c4001273e88d763961c295",
    "85f76201879d2633b16a823c61f65792e7cd419b33fba04dcb2e341ff7a81846",
    "a18838ea2c0da0cd2ebf50768f47b94e3d0538c72b9063c5888d21627e6630a2"
  ],
  "sop-auditor.md": [
    "a87e34adcf169abce60f56d065d7c51aa30477f2c7b21e119dcc787cc0e05ba6",
    "bf108202a9c265716a5c3ab8c178d060451b6ccbf1bc2d34bef38e9b326c4b8d"
  ]
});

// Old command file name -> skill that replaces it (names with ":" became hyphenated).
export const LEGACY_COMMAND_RENAMES = Object.freeze(Object.fromEntries(
  Object.keys(LEGACY_COMMAND_HASHES).map((file) => [file, file.replace(/\.md$/, "").replaceAll(":", "-")])
));

// Old English starter scripts removed from the templates (sales/scripts/). Doctor only warns about a copy
// whose hash is listed; the assistant removes it after the person says yes. Edited copies never match.
// One entry per committed version in git history (a single commit shipped each file).
export const LEGACY_STARTER_SCRIPT_HASHES = Object.freeze({
  "cold-outreach-email.md": [
    "6d105bfc046d62d809b90a08230a6a6e0a6873cdbc20be4d030bbee44e1a5c25"
  ],
  "discovery-call-framework.md": [
    "258ae9a01b2ae5007db71e7d2592d5256afed7ea71844a84be109f688ffb43cb"
  ]
});

/** True when `text` is byte-for-byte (ignoring CRLF) a starter script this package used to ship under `fileName`. */
export function isLegacyStarterScript(fileName, text) {
  const hashes = LEGACY_STARTER_SCRIPT_HASHES[fileName];
  if (!hashes) return false;
  return hashes.includes(contentHash(text));
}

/** SHA-256 of `text` with CRLF line endings normalized to LF (the form every hash list here uses). */
export function contentHash(text) {
  return createHash('sha256').update(String(text).replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

/**
 * True when `text` is byte-for-byte (ignoring CRLF) a version this package shipped for the brain path `rel`
 * (see shipped-hashes.js). Anything else was edited by a person and must not be replaced silently.
 */
export function isShippedVersion(rel, text, hashes = SHIPPED_HASHES) {
  return Boolean(hashes[rel]?.includes(contentHash(text)));
}
