import assert from 'assert';
import {parseCode} from '../src/js/code-analyzer';

describe('The javascript parser', () => {
    it('1. is parsing an empty function correctly', () => {assert.equal(parseCode('function foo(x, y, z){\n' + '    let a = x + 1;\n' + '    let b = a + y;\n' + '    let c = 0;\n' + '    \n' + '    if(true){\n' + 'c = 2\n' + 'return c + x;\n' + '}\n' + '    \n' + '    return z;\n' + '}', 'x = 3, z = 1, y = 9;'), 'function foo(x, y, z) {\n' + '    if (true) {\n' + '        return 2 + x;\n' + '    }\n' + '    return z;\n' + '}');});
    it('2. is parsing a var Decl correctly', () => {assert.equal((parseCode('let a = 1;', '')), 'let a = 1;');});
    it('3. is parsing a var Decl correctly', () => {assert.equal((parseCode('let a = 1;\n' + 'a = 2;', '')), 'let a = 1;\n' + 'a = 2;');});
    it('4. is parsing a var Decl correctly', () => {assert.equal((parseCode('let a = 1, z = 2;\n' + 'a = 2, z = a + 2, a++;', '')), 'let a = 1, z = 2;\n' + 'a = 2, z = 2 + 2, a++;');});

    it('5. is parsing a var Decl correctly', () => {assert.equal((parseCode('let a = 1, z = 2;\n' + 'a = 2, z = a + 2, a++;\n' + 'function f (p1) {\n' + 'let x = p1;\n' + '}', 'p1 = 2')), 'let a = 1, z = 2;\n' + 'a = 2, z = 2 + 2, a++;\n' + 'function f(p1) {\n' + '}');});

    it('6. is parsing a var Decl correctly', () => {assert.equal((parseCode('let a = 1, z = 2;\n' + 'a = 2, z = a + 2, a++;\n' + 'function f (p1) {\n' + 'let x = p1;\n' + 'return x;\n' + '}', 'p1 = 2')), 'let a = 1, z = 2;\n' + 'a = 2, z = 2 + 2, a++;\n' + 'function f(p1) {\n' + '    return p1;\n' + '}');});

    it('7. is parsing a var Decl correctly', () => {assert.equal((parseCode('let a = 1, b = 2;\n' + 'a = 2, b = a + 2;\n' + 'function f (p1) {\n' + 'let x = p1;\n' + 'a++;\n' + 'let y = 2, z = 9;\n' + 'y = a + p1;\n' + 'x = 2 * a + p1, z = b + a;\n' + 'return x + y + z;\n' + '}', 'p1 = 2')), 'let a = 1, b = 2;\n' + 'a = 2, b = 2 + 2;\n' + 'function f(p1) {\n' + '    a++;\n' + '    return 2 * (2 + 1) + p1 + (2 + 1 + p1) + (2 + 2 + (2 + 1));\n' + '}');});

    it('8. is parsing a var Decl correctly', () => {assert.equal((parseCode('let a = 1, b = 2;\n' + 'a = 2, b = a + 2;\n' + 'function f (p1) {\n' + 'let x = 3;\n' + 'a++;\n' + 'let y = 2, z = 9;\n' + 'y = a + p1;\n' + 'x = 2 * a + p1, z = b + a;\n' + 'if((x > 3 | true) & (a < 9)){\n' + 'return 2;\n' + '}\n' + '}', 'p1 = 2')), 'let a = 1, b = 2;\n' + 'a = 2, b = 2 + 2;\n' + 'function f(p1) {\n' + '    a++;\n' + '    if ((2 * (2 + 1) + p1 > 3 | true) & 2 + 1 < 9) {\n' + '        return 2;\n' + '    }\n' + '}');});

    it('9. is parsing a var Decl correctly', () => {assert.equal((parseCode('function foo(x, y, z){\n' + '    let a = x + 1;\n' + '    let b = a + y;\n' + '    let c = 0;\n' + '    \n' + '    if (b < z) {\n' + '        c = c + 5;\n' + '        return x + y + z + c;\n' + '    } else if (b < z * 2) {\n' + '        c = c + x + 5;\n' + '        return x + y + z + c;\n' + '    } else {\n' + '        c = c + z + 5;\n' + '        return x + y + z + c;\n' + '    }\n' + '}', 'x = 1, y = 2, z = 3;')), 'function foo(x, y, z) {\n' + '    if (x + 1 + y < z) {\n' + '        return x + y + z + (0 + 5);\n' + '    } else if (x + 1 + y < z * 2) {\n' + '        return x + y + z + (0 + x + 5);\n' + '    } else {\n' + '        return x + y + z + (0 + z + 5);\n' + '    }\n' + '}');});

    it('10. is parsing a var Decl correctly', () => {assert.equal((parseCode('function foo(x, y, z){\n' + '    let a = x + 1;\n' + '    let b = a + y;\n' + '    let c = 0;\n' + '    \n' + '    while (c + 2 < 10) {\n' + '        a = x * y;\n' + '        z = a * b * c;\n' + '    }\n' + '    \n' + '    return z;\n' + '}', 'x = 1, y = 2, z = 3;')), 'function foo(x, y, z) {\n' + '    while (0 + 2 < 10) {\n' + '        z = x * y * (x + 1 + y) * 0;\n' + '    }\n' + '    return z;\n' + '}');});

    it('11. is parsing a var Decl correctly', () => {assert.equal((parseCode('let arr = [1, 2, 3];\n' + 'let aaa = arr[1];\n' + 'function foo(x, y, z){\n' + '    let a = x + 1;\n' + '    let b = a + y;\n' + '    let c = 0;\n' + 'x = arr[2];\n' + '    \n' + '    if(true){\n' + 'c = 2\n' + 'return c + x;\n' + '}\n' + '    \n' + '    return z;\n' + '}\n', 'x = 1, y = 2, z = 3;')), 'let arr = [\n' + '    1,\n' + '    2,\n' + '    3\n' + '];\n' + 'let aaa = 2;\n' + 'function foo(x, y, z) {\n' + '    x = 3;\n' + '    if (true) {\n' + '        return 2 + x;\n' + '    }\n' + '    return z;\n' + '}');});
});
