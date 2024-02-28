Description
====
Simple userscript that scans PR comments for the ones created by PRT bot and replaces the reported `build number` by the link to the actual jenkins build. 

Setting up
====
```
cp settings.js{.sample,}
```
Fill in the settings appropriately.

In your browser with `tampermonkey` extension enabled:
create a new user script in tampermonkey and add only the following header (do not forget to replace `{LOCAL_PATH_TO_THIS_REPO}` and `{JENKINS_DOMAIN}`):


```
// ==UserScript==
// @name         gh-prt-jnks
// @namespace    http://tampermonkey.net/
// @version      2024-02-27
// @description  append jenkins PRT build links in respective PRT bot comments
// @author       rplevka@redhat.com
// @match        https://github.com/SatelliteQE/*/pull/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @run-at       document-end
// @connect      {JENKINS_DOMAIN}
// @grant        GM_xmlhttpRequest
// @require      file:///{LOCAL_PATH_TO_THIS_REPO}/settings.js
// @require      file:///{LOCAL_PATH_TO_THIS_REPO}/gh-prt-jnks.user.js
// ==/UserScript==
```

```
sed -i 's/{JENKINS_DOMAIN}/your.jenkins.instance.domain/' gh-prt-jnks.user.js
```

Known bugs and todos
===
one needs to refresh the page for script to work (GH manipulates the existing DOM on navigation)
