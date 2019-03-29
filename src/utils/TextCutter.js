

function cut(str, maxChars, ellipsis = '...') {
    if (str === null || str === undefined) {
        return '';
    }
    if (str.length <= maxChars) {
        return str;
    }

    var parts = str.split(' ');

    var startParts = [];
    var endParts = [];

    var tmp;
    var bestCandidate = null;
    for (var i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            startParts.push(parts[i/2]);
        } else {
            endParts.unshift(parts[parts.length-((i-1)/2)-1]);
        }
        tmp = startParts.join(' ')+ellipsis+endParts.join(' ');
        if ((tmp.length-ellipsis.length) < maxChars) {
            bestCandidate = tmp;
        } else {
            break;
        }
    }
    return bestCandidate || parts.join(' ');

}

export { cut };