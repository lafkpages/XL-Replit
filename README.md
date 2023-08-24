# XL Replit

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-5-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

An enhanced version of Replit.

## WARNING

Recently, rules regarding automation and Replit's API usage have been changing a lot. Now it appears that using **read-only invites can get your Replit account banned**, so use at your own risk.

## Features

- Account switcher
- Custom tips
- User's email addresses
- Shows a user's known alt accounts
- Easily download a user's profile picture
- Read-only invites for private Repls
- Monaco :eyes:
- Replit search provider

## Installation

Since this isn't on the Chrome Webstore yet, you must build it yourself.

Clone the repository:

```sh
git clone https://github.com/lafkpages/XL-Replit.git
cd XL-Replit
```

Install dependencies:

```sh
pnpm i
```

When building, you must specify the browser you want to build for. For example, to build for Chrome:

```sh
pnpm build:chrome
```

For Firefox, just replace `chrome` with `firefox`.

**Note:** when building for the first time, it might take a while since it has to copy over modules and minify them.
It will cache this in `dist/.cache` so the next time you build it will be much faster.
If you want to rebuild everything, run `pnpm clean:cache` and rebuild.

### Loading extension in Chrome

Go to the [Chrome extensions page](chrome://extensions) and enable developer mode.
Click on Load unpacked and select the `dist/chrome` folder.

### Loading extension in Firefox

Go to the [Firefox debugging page](about:debugging#/runtime/this-firefox) and click on Load Temporary Add-on, then select the `dist/firefox/manifest.json` file.

Also, note that on Firefox you must have enabled the `layout.css.has-selector.enabled` flag in the [`about:config` page](about:config).

## Suggest data

If you have some relevant data for someone's profile, please fill out [this form](https://xl-replit.lafkpages.tech/suggestData) with the data and it will be reviewed by a moderator.

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://luisafk.repl.co"><img src="https://avatars.githubusercontent.com/u/62298468?v=4?s=100" width="100px;" alt="LuisAFK"/><br /><sub><b>LuisAFK</b></sub></a><br /><a href="https://github.com/lafkpages/XL-Replit/commits?author=lafkpages" title="Code">💻</a> <a href="#data-lafkpages" title="Data">🔣</a> <a href="#content-lafkpages" title="Content">🖋</a> <a href="#ideas-lafkpages" title="Ideas, Planning, & Feedback">🤔</a> <a href="#maintenance-lafkpages" title="Maintenance">🚧</a> <a href="#translation-lafkpages" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://dillonb07.is-a.dev"><img src="https://avatars.githubusercontent.com/u/83948303?v=4?s=100" width="100px;" alt="Dillon Barnes"/><br /><sub><b>Dillon Barnes</b></sub></a><br /><a href="#data-DillonB07" title="Data">🔣</a> <a href="#ideas-DillonB07" title="Ideas, Planning, & Feedback">🤔</a> <a href="#userTesting-DillonB07" title="User Testing">📓</a> <a href="https://github.com/lafkpages/XL-Replit/commits?author=DillonB07" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/DaInfLoop"><img src="https://avatars.githubusercontent.com/u/92693892?v=4?s=100" width="100px;" alt="DaInfLoop"/><br /><sub><b>DaInfLoop</b></sub></a><br /><a href="#data-DaInfLoop" title="Data">🔣</a> <a href="#ideas-DaInfLoop" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://eriko.dev"><img src="https://avatars.githubusercontent.com/u/54033728?v=4?s=100" width="100px;" alt="Erik Ga."/><br /><sub><b>Erik Ga.</b></sub></a><br /><a href="#ideas-ErikoXDev" title="Ideas, Planning, & Feedback">🤔</a> <a href="#data-ErikoXDev" title="Data">🔣</a> <a href="#translation-ErikoXDev" title="Translation">🌍</a> <a href="https://github.com/lafkpages/XL-Replit/commits?author=ErikoXDev" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Firepup6500"><img src="https://avatars.githubusercontent.com/u/70233190?v=4?s=100" width="100px;" alt="Firepup650"/><br /><sub><b>Firepup650</b></sub></a><br /><a href="https://github.com/lafkpages/XL-Replit/commits?author=Firepup6500" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
