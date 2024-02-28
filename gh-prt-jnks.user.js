// ==UserScript==
// @name         gh-prt-jnks
// @namespace    http://tampermonkey.net/
// @version      2024-02-27
// @description  append jenkins PRT build links in respective PRT bot comments
// @author       rplevka@redhat.com
// @match        https://github.com/SatelliteQE/*/pull/*
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @connect      {JENKINS_DOMAIN}
// @grant        GM_xmlhttpRequest
// ==/UserScript==


function injectErrData(data, el){
    // Inject the rendered data into given element
    markdown_body_el = el.parentElement.parentElement.parentElement;
    el = markdown_body_el;
    cases = data.suites[0].cases;
    if (cases.length > 0){
        let table = "<table>";
            table += "<tr>";
            table += "<th>test name</th>";
            table += "<th>error details</th>";
            table += "</tr>";
        for (var c in cases) {
            table += "<tr>";
            table += "<td style='word-wrap: break-word;'>";
            table += `<p>${cases[c].className} :: ${cases[c].name}</p>`;
            table += "</td>";
            table += "<td style='word-wrap: break-word;'>";
            table += `${cases[c].errorDetails ? cases[c].errorDetails : '-'}`;
            table += "</td>";
            table += "</tr>";
        }
        table += "</table>";
        el.innerHTML += table;
    }
}

function handleJenkinsTestResultResponse(r, el) {
    /* Parses the text into json and injects
       the details to the given element
    */

    var buildObj;
    if (r.status == 200){
        buildObj = JSON.parse(r.responseText);
    }
    else {
        console.log("failed to fetch data from jenkins")
        console.log(`status: ${r.status}`);
        console.log(`response text: ${r.responseText}`);
    }
    injectErrData(buildObj, el)
}


(async ()=>{
    'use strict';
    // get list of comment elements
    var comments = document.getElementsByClassName("timeline-comment");
    for (let i = 0; i < comments.length; i++) {
        // locate the author element and filter those from our bot
        var el_author = comments[i].getElementsByClassName("author");
        if (el_author.length && el_author[0].innerHTML == botUsername) {
            // we assume PRT bot comment contains `code`
            var els_code = document.evaluate(
                ".//code",
                comments[i],
                null,
                XPathResult.ANY_TYPE,
                null
            );
            var el_code = els_code.iterateNext();
            if(el_code){
                /*  match code text against our pattern and optionally replace
                    it with the <a> node
                */
                var build_no = el_code.innerHTML.match(comment_pattern)[2];
                var replacement = el_code.innerHTML.replace(
                    comment_pattern,
                    `$1<a href='${jnks_job_url}/$2' target='_blank'>$2</a>`
                );
                el_code.innerHTML = replacement;
                var build_obj;
                GM_xmlhttpRequest({
                    method: "GET",
                    url: `${jnks_job_url}/${build_no}/testReport/api/json?pretty=true`,
                    onload: function(r) {
                        build_obj = handleJenkinsTestResultResponse(r, el_code)
                    }
                });
            }
        }
    }
})();
