// ==UserScript==
// @name         gh-prt-jnks
// @namespace    http://tampermonkey.net/
// @version      2024-02-27
// @description  append jenkins PRT build links in respective PRT bot comments
// @author       rplevka@redhat.com
// @match        https://github.com/SatelliteQE/*/pull/*
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var comments = document.getElementsByClassName("timeline-comment");
    for (let i = 0; i < comments.length; i++) {
        var el_author = comments[i].getElementsByClassName("author");
        if (el_author.length && el_author[0].innerHTML == botUsername) {
            var els_code = document.evaluate(
                ".//code",
                comments[i],
                null,
                XPathResult.ANY_TYPE,
                null
            );
            var el_code = els_code.iterateNext();
            if(el_code){
                var replacement = el_code.innerHTML.replace(
                    comment_pattern,
                    `$1<a href='${jnks_job_url}/$2' target='_blank'>$2</a>`
                );
                el_code.innerHTML = replacement;
            }
        }
    }
})();
