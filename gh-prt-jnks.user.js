// ==UserScript==
// @name         gh-prt-jnks
// @namespace    http://tampermonkey.net/
// @version      2024-03-12
// @description  append jenkins PRT build links in respective PRT bot comments
// @author       rplevka@redhat.com
// @match        https://github.com/*/pull/*
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @connect      redhat.com
// @resource jnks-err.png     https://www.jenkins.io/images/logos/fire/fire.png
// @grant        GM_xmlhttpRequest
// @grant        GM_getResourceURL
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==


var sheet = window.document.styleSheets[0];
var chartCSSRules = [
    '.gh-prt-jnks-chart {float: left}',
    '.chart-item-bg {stroke: #ddd}',
    '.chart-item-0  {stroke: #f85149}', // failed 
    '.chart-item-1  {stroke: #8b949e}', // skipped
    '.chart-item-2  {stroke: #2ea043}'  // passed
]

function appendProgressBar(data, el) {
    /* append a primer progressbar element to a given parent

        <h2>Second Progress Bar</h2>
        <span class="Progress Progress--large">
            <span class="Progress-item 
                color-bg-success-emphasis" 
                style="width: 40%;">
              </span>
            <span class="Progress-item 
                color-bg-attention-emphasis" 
                style="width: 30%;">
              </span>
            <span class="Progress-item 
                color-bg-danger-emphasis" 
                style="width: 20%;">
              </span>
    */

    var totalCount = data.failCount + data.skipCount + data.passCount;
    
    var el_progressbar_cont = document.createElement('div');
    el_progressbar_cont.classList.add('mb-3');

    var el_progressbar_title = document.createElement('h3');
    var el_progressbar_title_text = document.createTextNode('Build test results');
    el_progressbar_title.appendChild(el_progressbar_title_text);
    el_progressbar_cont.appendChild(el_progressbar_title);

    var el_stats = document.createElement('span');
    el_stats.classList.add('text-small', 'color-fg-muted', 'mr-2');
    el_stats.innerHTML = `${data['passCount']} passed, ${data['failCount']} failed, ${data['skipCount']} skipped of ${totalCount}`;

    var el_progressbar = document.createElement('span');
    el_progressbar.classList.add('Progress');
    el_progressbar.classList.add('Progress--large');
    el_progressbar_cont.appendChild(el_stats);
    el_progressbar_cont.appendChild(el_progressbar);
    var el_progressbar_prg_failed = document.createElement('span');
    var el_progressbar_prg_success = document.createElement('span');
    var el_progressbar_prg_skipped = document.createElement('span');
    el_progressbar_prg_success.classList.add('Progress-item');
    el_progressbar_prg_success.classList.add('color-bg-success-emphasis');
    el_progressbar_prg_failed.classList.add('Progress-item');
    el_progressbar_prg_failed.classList.add('color-bg-danger-emphasis');
    el_progressbar_prg_skipped.classList.add('Progress-item');
    el_progressbar_prg_skipped.classList.add('color-bg-attention-emphasis');
    el_progressbar_prg_success.setAttribute('style', `width: ${(data.passCount / totalCount) * 100 }%`);
    el_progressbar_prg_failed.setAttribute('style', `width: ${(data.failCount / totalCount) * 100 }%`);
    el_progressbar_prg_skipped.setAttribute('style', `width: ${(data.skipCount / totalCount) * 100 }%`);

    el_progressbar.appendChild(el_progressbar_prg_success);
    el_progressbar.appendChild(el_progressbar_prg_failed);
    el_progressbar.appendChild(el_progressbar_prg_skipped);

    el.appendChild(el_progressbar_cont);
}

function appendResultContainer(data, el){
    data.suites[0].cases.forEach(function(c) {
        if (["FAILED", "ERROR", "REGRESSION"].includes(c.status)){
            var el_details = document.createElement('details');
            console.log(GM_getValue('resultsLoadExpanded'));
            if (GM_getValue('resultsLoadExpanded')) {
                el_details.setAttribute('open', '');
            }
            var el_summary = document.createElement('summary');
            el_summary.classList.add('color-fg-muted', 'merge-status-item');
            var el_err_pre = document.createElement('pre');
            var el_err = document.createElement('code');
            el_err.appendChild(document.createTextNode(c.errorDetails));
            el_err_pre.append(el_err);

            el_summary.appendChild(document.createTextNode(`${c.className} :: ${c.name}`));
            el_details.append(el_summary);
            el_details.append(el_err_pre);

            el.appendChild(el_details);
        }
    });
}

function injectErrData(data, el){
    // Inject the rendered data into given element

    appendProgressBar(data, el);
    appendResultContainer(data, el);
}

function handleJenkinsTestResultResponse(r, el) {
    /* Parses the text into json and injects
       the details to the given element
    */

    var buildObj;
    if (r.status == 200){
        buildObj = JSON.parse(r.responseText);
        injectErrData(buildObj, el)
    }
    else {
        handleJenkinsRequestError(r, el);
    }
}

function handleJenkinsRequestError(r, el) {
    /* append element with error message
        regarding failure to fetch data from jenkins
    */
    el_err_msg = document.createElement('div');
    el_err_msg.classList.add('blankslate');

    el_err_msg_img = document.createElement('img');
    el_err_msg_img.setAttribute('src', GM_getResourceURL('jnks-err.png'));

    el_err_msg_img.classList.add('blankslate-image');

    el_err_msg_header = document.createElement('h3');
    el_err_msg_header.classList.add('blankslate-heading');
    el_err_msg_header.appendChild(document.createTextNode('Jenkins connection error'));
    el_err_msg_text = document.createElement('p');
    el_err_msg_text.appendChild(
        document.createTextNode(
            `The http request to the jenkins instance failed with status: ${r.status}, ${r.finalUrl}`
        )
    );
    el_err_msg_header.appendChild(el_err_msg_text);

    el_err_msg.appendChild(el_err_msg_img);
    el_err_msg.appendChild(el_err_msg_header);
    el.appendChild(el_err_msg);
}

function init(){

    /* maybe this is not necessary at all and we can use githubs css
    // <link href="https://unpkg.com/@primer/css@^20.2.4/dist/primer.css" rel="stylesheet" />
    var el_primer_link = document.createElement('link');
    el_primer_link.setAttribute('href', 'https://unpkg.com/@primer/css@^20.2.4/dist/primer.css');
    el_primer_link.setAttribute('rel', 'stlesheet');
    document.head.appendChild(el_primer_link);
    */


    console.debug("init executed");
    // get list of comment elements
    //var comments = document.getElementsByClassName("timeline-comment");
    var comments = document.querySelectorAll(".timeline-comment");
    comments.forEach(function(comment) {
        // locate the author element and filter those from our bot
        var el_author = comment.getElementsByClassName("author");
        if (el_author.length && el_author[0].innerHTML == GM_getValue("botUsername") && comment.innerHTML.includes(GM_getValue("commentMatches"))) {
            // we assume PRT bot comment contains `code` element
            var els_code = document.evaluate(
                ".//code",
                comment,
                null,
                XPathResult.ANY_TYPE,
                null
            );
            var el_code = els_code.iterateNext();
            if(el_code){
                /*  match code text against our pattern and optionally replace
                    it with the <a> node
                */
                el_markdown_body = el_code.parentElement.parentElement.parentElement;
                //console.log(el_code);
                console.log(el_markdown_body);
                commentPattern = new RegExp(GM_getValue("commentPattern"));
                console.log(commentPattern);
                var build_no = el_code.innerHTML.match(commentPattern)[2];
                var jenkinsJobUrlResolved = GM_getValue('jenkinsJobUrl').replace(
                    /\{PROJECT\}/,
                    `${location.href.split('/')[4]}`
                )
                var replacement = el_code.innerHTML.replace(
                    commentPattern,
                    `$1<a href='${jenkinsJobUrlResolved}/$2' target='_blank'>$2</a>`
                );
                el_code.innerHTML = replacement;
                var build_obj;
                (function(e){
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: `${jenkinsJobUrlResolved}/${build_no}/testReport/api/json?pretty=true`,
                        onload: function(r) {
                            build_obj = handleJenkinsTestResultResponse(r, e)
                        },
                        onerror: function(r) {
                            build_obj = handleJenkinsRequestError(r, e)
                        }
                    });
                })(el_markdown_body)
            }
        }
    })
}

function seedSettings(){
    /*
    one-shot function that should insert the default settings
    into the userscript storage if they are not set yet.
    It can eventually contain version migration logic as well
    */

    const defaultSettings = new Map([
        ["botUsername", "Satellite-QE"],
        ["commentMatches", "<strong>PRT Result</strong>"],
        ["commentPattern", "(Build Number: )(\\d+)"],
        ["jenkinsJobUrl", `{JENKINS_URL}/job/{PROJECT}-pr-testing`],
        ["resultsLoadExpanded", 1]
    
    ])
    
    defaultSettings.forEach(
      function(v,k){
        if (GM_getValue(k) == null){
          console.log(`setting "${k}" not set yet, setting to default`);
          GM_setValue(k, v);
        }
        else{
          console.log(`setting "${k}" already set (${GM_getValue(k)}), skipping`)
        }
      }
    )
}

(()=>{
    'use strict';
    seedSettings();
    init();

    // page load
    document.addEventListener("pjax:end", init);
})();
