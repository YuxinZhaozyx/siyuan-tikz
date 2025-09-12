let resolveEditorReady = null;
let editorReadyPromise = new Promise(resolve => {
    resolveEditorReady = resolve;
});
let first_load_editor = true;

// 获取editor的唯一方法
async function getEditor() {
    if (first_load_editor) {
        first_load_editor = false;

        require.config({ paths: { 'vs': 'libs/monaco/min/vs' } });
        require(['vs/editor/editor.main'], function () {
            fetch('src/latex.json')
                .then(response => response.json())
                .then(latexSyntax => {
                    // 注册LaTeX语言定义
                    monaco.languages.register({
                        id: latexSyntax.name,
                        displayName: latexSyntax.displayName,
                        extensions: latexSyntax.fileExtensions,
                        mimeTypes: latexSyntax.mimeTypes
                    });

                    // 定义LaTeX关键字
                    monaco.languages.setLanguageConfiguration(latexSyntax.name, {
                        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
                        brackets: [
                            ['{', '}']
                        ],
                        autoClosingPairs: [
                            { open: '{', close: '}' },
                            { open: '[', close: ']' },
                            { open: '(', close: ')' }
                        ],
                        comments: {
                            lineComment: latexSyntax.lineComment
                        }
                    });

                    monaco.languages.registerCompletionItemProvider(latexSyntax.name, {
                        provideCompletionItems: function (model, position) {
                            const wordUntilPosition = model.getWordUntilPosition(position);
                            const range = {
                                startLineNumber: position.lineNumber,
                                endLineNumber: position.lineNumber,
                                startColumn: wordUntilPosition.startColumn,
                                endColumn: wordUntilPosition.endColumn
                            };

                            // 辅助函数：创建 snippet 建议
                            function createSnippet(label, insertText, documentation = '') {
                                return {
                                    label: label,
                                    kind: monaco.languages.CompletionItemKind.Snippet,
                                    documentation: documentation,
                                    insertText: insertText,
                                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                    range: range,
                                    filterText: label, // 控制补全触发词
                                    preselect: true,
                                    additionalTextEdits: [{
                                        range: range,
                                        text: '' // 清除原始输入内容，避免重复插入
                                    }]
                                };
                            }

                            // 辅助函数：创建 关键字 建议
                            function createKeyword(label, documentation = '') {
                                return {
                                    label: label,
                                    kind: monaco.languages.CompletionItemKind.Keyword,
                                    documentation: documentation,
                                    insertText: label,
                                    range: range,
                                    filterText: label,
                                    preselect: true,
                                    additionalTextEdits: [{
                                        range: range,
                                        text: ''
                                    }]
                                };
                            }

                            const suggestions = [
                                // Blocks
                                createSnippet('\\begin', '\\begin{${1:env}}\n\t$0\n\\end{${1:env}}'),
                                createSnippet('\\usepackage', '\\usepackage{${1:package}}'),

                                // Environments
                                createSnippet('\\begin{document}', '\\begin{document}\n\t$0\n\\end{document}'),
                                createSnippet('\\begin{tikzpicture}', '\\begin{tikzpicture}\n\t$0\n\\end{tikzpicture}'),
                                createSnippet('\\begin{circuitikz}', '\\begin{circuitikz}\n\t$0\n\\end{circuitikz}'),
                                createSnippet('\\begin{tikzcd}', '\\begin{tikzcd}\n\t$0\n\\end{tikzcd}'),
                                createSnippet('\\begin{axis}', '\\begin{axis}\n\t$0\n\\end{axis}'),

                                // Packages
                                createKeyword('\\usepackage{circuitikz}'),
                                createKeyword('\\usepackage{chemfig}'),
                                createKeyword('\\usepackage{pgfplots}'),
                                createKeyword('\\usepackage{tikz-cd}'),

                                // Keywords
                                createKeyword('\\chemfig'),
                                createKeyword('\\draw'),
                                createKeyword('\\node'),
                            ];

                            return { suggestions };
                        }
                    });

                    // 定义LaTeX关键字颜色
                    const tokenizer = latexSyntax.tokenizer;
                    monaco.languages.setMonarchTokensProvider(latexSyntax.name, {
                        tokenizer: tokenizer
                    });

                    const placeholder = String.raw`
        \begin{document}
        \begin{tikzpicture}[domain=0:4]
            \draw[very thin,color=gray] (-0.1,-1.1) grid (3.9,3.9);
            \draw[->] (-0.2,0) -- (4.2,0) node[right] {$x$};
            \draw[->] (0,-1.2) -- (0,4.2) node[above] {$f(x)$};
            \draw[color=red]    plot (\x,\x)             node[right] {$f(x) =x$};
            \draw[color=blue]   plot (\x,{sin(\x r)})    node[right] {$f(x) = \sin x$};
            \draw[color=orange] plot (\x,{0.05*exp(\x)}) node[right] {$f(x) = \frac{1}{20} \mathrm e^x$};
        \end{tikzpicture}
        \end{document}`.trim();

                    const editor = monaco.editor.create(document.getElementById('editor-container'), {
                        value: '', // 初始内容
                        language: latexSyntax.name, // 设置语言为LaTeX
                        lineNumbers: 'on', // 开启行号显示
                        theme: 'vs-light', // 编辑器主题
                        minimap: {
                            enabled: false // 去掉代码缩略图
                        },
                        automaticLayout: true, // 自动根据容器大小调整布局
                        autoIndent: "full",
                        tabSize: 4,
                        // trimAutoWhitespace: true,
                        semanticHighlighting: {
                            enabled: true,
                        },
                        placeholder: placeholder,
                    });

                    resolveEditorReady(editor);
                })
                .catch(error => console.error('Error loading LaTeX syntax:', error));
        });
    }

    return editorReadyPromise;
}

export async function getValue() {
    const editor = await getEditor();
    return editor.getValue();
}

export async function setValue(value) {
    const editor = await getEditor();
    editor.setValue(value);
}
