import postcss from 'postcss';
import valueParser, {stringify} from 'postcss-value-parser';
import sort from 'alphanum-sort';
import uniqs from 'uniqs';
import getArguments from 'lerna:cssnano-util-get-arguments';

/**
 * Return the greatest common divisor
 * of two numbers.
 */

function gcd (a, b) {
    return b ? gcd(b, a % b) : a;
}

function aspectRatio (a, b) {
    const divisor = gcd(a, b);

    return [a / divisor, b / divisor];
}

function split (args) {
    return args.map(arg => stringify(arg)).join('');
}

function removeNode (node) {
    node.value = '';
    node.type = 'word';
}

function transform (rule) {
    if (!rule.params) {
        return;
    }

    const params = valueParser(rule.params);

    params.walk((node, index) => {
        if (node.type === 'div' || node.type === 'function') {
            node.before = node.after = '';
            if (
                node.type === 'function' &&
                node.nodes[4] &&
                node.nodes[0].value.indexOf('-aspect-ratio') === 3
            ) {
                const [a, b] = aspectRatio(
                    node.nodes[2].value,
                    node.nodes[4].value
                );
                node.nodes[2].value = a;
                node.nodes[4].value = b;
            }
        } else if (node.type === 'space') {
            node.value = ' ';
        } else {
            const prevWord = params.nodes[index - 2];
            if (
                node.value === 'all' &&
                rule.name === 'media' &&
                !prevWord
            ) {
                const nextSpace = params.nodes[index + 1];
                const nextWord = params.nodes[index + 2];
                const secondSpace = params.nodes[index + 3];
                if (nextWord && nextWord.value === 'and') {
                    removeNode(nextWord);
                    removeNode(nextSpace);
                    removeNode(secondSpace);
                }
                removeNode(node);
            }
        }
    }, true);

    rule.params = sort(uniqs(getArguments(params).map(split)), {
        insensitive: true,
    }).join();

    if (!rule.params.length) {
        rule.raws.afterName = '';
    }
}

export default postcss.plugin('postcss-minify-params', () => {
    return css => css.walkAtRules(transform);
});
