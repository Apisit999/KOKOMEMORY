import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(file) : /\.tsx?$/.test(file) ? [file] : [];
    });
}
for (const file of walk('src')) {
    const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const operations = [], unreachable = [];
    function visit(node) {
        if (ts.isCallExpression(node) && /^(getDoc|getDocs|addDoc|setDoc|updateDoc|deleteDoc|runTransaction|onSnapshot|writeBatch)$/.test(node.expression.getText(source))) {
            operations.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, operation: node.expression.getText(source) });
        }
        if (ts.isIfStatement(node) && node.expression.kind === ts.SyntaxKind.FalseKeyword) unreachable.push([node.getStart(source), node.end]);
        if (ts.isBlock(node)) {
            const statements = node.statements;
            const index = statements.findIndex(ts.isReturnStatement);
            if (index >= 0 && index < statements.length - 1) unreachable.push([statements[index + 1].getStart(source), statements[statements.length - 1].end]);
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
    if (operations.length || unreachable.length) console.log(JSON.stringify({ file: file.replaceAll('\\', '/'), operations, unreachable }));
}
