import $ from 'jquery';
import * as esprima from 'esprima';
import {parseCode, colors} from './code-analyzer';

let conts = (arr2) => {
    let out = false;
    for (let i = 0; i < colors.length; i++) {
        if(colors[i][0] === arr2[0] && colors[i][1] === arr2[1])
            out = true;
    }
    return out;
};

const paint = (l) => {
    let res = '';
    let arr = l.split('\n');
    for (let i = 0; i < arr.length; i++) {
        let prop = conts([i, 0]) ? 'red'
            : conts([i, 1]) ? 'green' : 'white';
        res += '<div style="background-color: ' + prop + '">' + arr[i] + '</div>';
    }
    document.body.innerHTML = res;
    // return res;
};

$(document).ready(function () {
    $('#Button').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let paramsAss = $('#paramsAssignment').val();
        let parsedCode = parseCode(esprima.parseScript(codeToParse), paramsAss);
        // $('#parsedCode').val(JSON.stringify(parsedCode,0,2));
        //$('#parsedCode').val(parsedCode);
        paint(parsedCode);
    });
});