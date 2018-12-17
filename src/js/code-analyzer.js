import * as esprima from 'esprima';
import * as escodegen from 'escodegen';

let globals = {};
let args = {};
let locals = {};
let inBlocks = [];
let colors = [];
let counter = 0;

const isInBlocks = (name) => {
    for (let i = inBlocks.length - 1; i >= 0; i--) {
        if (inBlocks[name] !== undefined) {
            return true;
        }
    }
    return false;
};

const findInBlocks = (name, val) => {
    for (let i = inBlocks.length - 1; i >= 0; i--) {
        if (inBlocks[name] !== undefined) {
            inBlocks[name] = val;
            return true;
        }
    }
    return false;
};

const findId = (init) => {
    let retFromEnv = inBlocks.map(arr => arr[init.name]).filter(x => x !== undefined);
    return retFromEnv.length !== 0 ? retFromEnv[retFromEnv.length - 1] :
        locals[init.name] !== undefined ? locals[init.name] :
            globals[init.name] !== undefined ? globals[init.name] :
                init;
};

const insertToMap = (name, val) => {
    if (findInBlocks(name, val))
        return;
    locals[name] !== undefined ?  locals[name] = val :
        globals[name] !== undefined ? globals[name] = val :
            args[name] !== undefined ? args[name] = val : inBlocks[length-1][name] = val;
};

const makeBinary = (op, left, right) => {
    return {'type': 'BinaryExpression',
        'operator': op,
        'left': left,
        'right': right};};

const IDret = (init) =>
    ((locals[init.name] === undefined) && (!isInBlocks(init.name) && (globals[init.name] === undefined)) ? init : findId(init));
const ArrExpret = (init) => {return {'type': 'ArrayExpression', 'elements': init.elements.map(retVal)};};
const Binret = (init) => makeBinary(init.operator, retVal(init.left), retVal(init.right));
const Memret = (init) => findId(init.object).elements[init.property.value];
const Litret = (init) => init;

let retHandlers = {
    'Identifier' : IDret,
    'ArrayExpression' : ArrExpret,
    'BinaryExpression' : Binret,
    'MemberExpression' : Memret,
    'Literal' : Litret
};

const retVal = (init) => {
    return retHandlers[init.type](init);
};

//
const varDeclGl = (rec) => {
    for (let i = 0; i < rec.declarations.length; i++) {
        let val = retVal(rec.declarations[i].init);
        globals[rec.declarations[i].id.name] = val;
        rec.declarations[i].init = val;
    }
    return rec;
};

const assStt = (exp) => {
    let val = retVal(exp.right);
    if (exp.left.type === 'MemberExpression')
        findId(exp.left.object).elements[exp.left.property.value] = val;
    else globals[exp.left.name] = val;
    exp.right = val;
    return exp;
};

const updStt = (exp) => {
    let sign = exp.operator === '++' ? '+' : '-';
    globals[exp.argument.name] = {
        'type': 'BinaryExpression',
        'operator': sign,
        'left': globals[exp.argument.name],
        'right': {'type': 'Literal',
            'value': 1,
            'raw': '1'}
    };
    return exp;
};

const seqStt = (exp) => {
    let arr = [];
    for (let i = 0; i <exp.expressions.length; i++) {
        exp.expressions[i].type === 'AssignmentExpression' ? arr.push(assStt(exp.expressions[i])):
            exp.expressions[i].type === 'UpdateExpression' ? arr.push(updStt(exp.expressions[i])) :
                arr.push(seqStt(exp.expressions[i]));
    }
    exp.expressions = arr;
    return exp;
};

const expSttGl = (rec) =>{
    rec.expression.type === 'AssignmentExpression' ? rec.expression = assStt(rec.expression):
        rec.expression.type === 'UpdateExpression' ? rec.expression = updStt(rec.expression) :
            rec.expression = seqStt(rec.expression);
    return rec;
};

const varDeclF = (rec) => {
    for (let i = 0; i < rec.declarations.length; i++)
        locals[rec.declarations[i].id.name] = retVal(rec.declarations[i].init);
    counter++;
    return null;
};

const retSttF = (rec) => {
    rec.argument = retVal(rec.argument);
    return rec;
};


const assExpF = (rec) => {
    let val = rec.right !== 'BinaryExpression' ? retVal(rec.right) : makeBinary(rec.right.operator, rec.right.right, rec.right.left);
    insertToMap(rec.left.name, val);
    if (locals[rec.left.name] === undefined) {
        rec.right = val;
        return rec;
    }
    else {
        counter++;
        return null;
    }
};

const seqExpF = (rec) => {
    let ret = rec;
    ret.expressions = rec.expressions.map(x => funcHandlers[x.type](x)).filter(y => y !== null);
    if (ret.expressions.length === 0)
        return null;
    return ret;
};


const updateExpF = (rec) => {
    let sign = rec.operator === '++' ? '+' : '-';
    insertToMap(rec.argument.name,
        {'type': 'BinaryExpression',
            'operator': sign,
            'left': findId(rec.argument),
            'right': {'type': 'Literal',
                'value': 1,
                'raw': '1'}
        });
    if (locals[rec.argument.name] === undefined)
        return rec;
    counter++;
    return null;

};

const expSttF = (rec) => {
    let expression = funcHandlers[rec.expression.type](rec.expression);
    if (expression !== null){
        rec.expression = expression;
        return rec;
    }
    return null;
};

function copy(o) {
    let output, v, key;
    output = Array.isArray(o) ? [] : {};
    for (key in o) {
        v = o[key];
        output[key] = (typeof v === 'object') ? copy(v) : v;
    }
    return output;
}

const BlockBody = (body) => {
    let l = copy(locals); let a = copy(args); let g = copy(globals);
    inBlocks.push({});
    let ret = body.map(x => funcHandlers[x.type](x)).filter(x => x !== null);
    inBlocks.pop();
    locals = copy(l); args = copy(a); globals = copy(g);
    return ret;
};

const blkSttF = (blk) => {
    return {'type':'BlockStatement', 'body' : BlockBody(blk.body)};
};

const blkHelper = (blk) =>{
    return blk.type !== 'BlockStatement' ?
        blkSttF({'type':'BlockStatement', 'body':BlockBody([blk])}) :
        blkSttF(blk);
};

const testHelper = (test) => {
    if (test.type === 'Literal')
        return test;
    else if(test.type === 'Identifier')
        return retVal(test);
    return makeBinary(test.operator, testHelper(test.left), testHelper(test.right));
};

const findIdA = (init) => {
    let retFromEnv = inBlocks.map(arr => arr[init.name]).filter(x => x !== undefined);
    return retFromEnv.length !== 0 ? retFromEnv[retFromEnv.length - 1] :
        locals[init.name] !== undefined ? locals[init.name] :
            globals[init.name] !== undefined ? globals[init.name] :
                args[init.name];
};

const IDretA = (init) => findIdA(init);
const ArrExpretA = (init) => {return {'type': 'ArrayExpression', 'elements': init.elements.map(retVal)};};
const BinretA = (init) => makeBinary(init.operator, retVal(init.left), retVal(init.right));
const MemretA = (init) => findId(init.object).elements[init.property.value];
const LitretA = (init) => init;

let retHandlersA = {
    'Identifier' : IDretA,
    'ArrayExpression' : ArrExpretA,
    'BinaryExpression' : BinretA,
    'MemberExpression' : MemretA,
    'Literal' : LitretA
};

const retValA = (init) => {
    return retHandlersA[init.type](init);
};

const addArgsVal = (test) => {
    if (test.type === 'Literal')
        return test;
    else if(test.type === 'Identifier')
        return retValA(test);
    return makeBinary(test.operator, addArgsVal(test.left), addArgsVal(test.right));
};

const evalTest = (test, loca) => {
    test = addArgsVal(test);
    let color = eval(escodegen.generate(test)) === true ? 1 : 0;
    colors.push([loca - counter - 1, color]);
};

const ifSttF = (rec) => {
    rec.test = testHelper(rec.test);
    evalTest(rec.test, rec.loc.start.line);
    rec.consequent = blkHelper(rec.consequent);
    rec.alternate = rec.alternate === null ? null :
        rec.alternate.type === 'IfStatement'  ? ifSttF(rec.alternate) :
            blkHelper(rec.alternate) ;
    return rec;
};

const whileSttF = (rec) => {
    rec.test = testHelper(rec.test);
    rec.body = blkHelper(rec.body);
    return rec;
};

let funcHandlers = {
    'VariableDeclaration': varDeclF,
    'ExpressionStatement': expSttF,
    'WhileStatement': whileSttF,
    'IfStatement': ifSttF,
    'ReturnStatement': retSttF,
    'AssignmentExpression': assExpF,
    'UpdateExpression': updateExpF,
    'SequenceExpression' : seqExpF
};

const funcDeclGl = (func) => {
    let fbody = func.body.body;
    for (let i = 0; i <fbody.length; i++) {
        fbody[i] = funcHandlers[fbody[i].type](fbody[i]);
    }
    fbody = fbody.filter(x => x !== null);
    func.body.body = fbody;
    return func;
};

let HandlersGl = {
    'VariableDeclaration' : varDeclGl,
    'ExpressionStatement' : expSttGl,
    'FunctionDeclaration' : funcDeclGl
};

const mapArgs = (params) => {
    if (params.body.length === 0)
        return;
    let pBody = params.body[0].expression;
    if (pBody.type === 'SequenceExpression') {
        let exps = pBody.expressions;
        exps.map(x => {
            args[x.left.name] = {'type' : 'Literal', 'value':x.right.value, 'raw':x.right.value};
        });
    }
    else
        args[pBody.left.name] = {'type' : 'Literal', 'value':pBody.right.value, 'raw':pBody.right.value};
};

const parseCode = (codeToParse, paramsAss) => {
    globals = {};
    args = {};
    locals = {};
    colors = [];
    counter = 0;
    let code = escodegen.generate(codeToParse);
    let pBody = esprima.parseScript(code, {loc : true});
    mapArgs(esprima.parseScript(paramsAss));
    for (let i = 0; i < pBody.body.length; i++) {
        pBody.body[i] = HandlersGl[pBody.body[i].type](pBody.body[i]);
    }
    return escodegen.generate(pBody);
};

export {parseCode, colors};