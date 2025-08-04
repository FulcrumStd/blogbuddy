import * as vscode from 'vscode';

export async function convertSelectedTextToUpper() {
    const editor = vscode.window.activeTextEditor;  
    if (!editor) {  
        vscode.window.showWarningMessage('请先打开一个文件');  
        return;  
    }   

    // 1. 使用 Selection
    const selection = editor.selection;  
    const selectedText = editor.document.getText(selection);  

    // 2. 使用 Range 创建相同效果  
    // const range = new vscode.Range(selection.start, selection.end);  
    // const rangeText = editor.document.getText(range);

    
    if (!selectedText) {  
        vscode.window.showWarningMessage('请先选中要转换的文本');  
        return;  
    }
    
    await editor.edit((editBuilder) => {  
        editBuilder.replace(selection, selectedText.toUpperCase());  
    });  

    vscode.window.showInformationMessage('文本已转换为大写');  
}

export async function convertLineToUpper(){
    const editor = vscode.window.activeTextEditor;  
    if (!editor) {  
        vscode.window.showWarningMessage('请先打开一个文件');  
        return;  
    }

    const position = editor.selection.active; // 当前光标位置  
    const line = editor.document.lineAt(position.line);  
    
    // 使用 Range 创建整行范围  
    const wholeLineRange = new vscode.Range(  
        new vscode.Position(line.lineNumber, 0),  
        new vscode.Position(line.lineNumber, line.text.length)  
    );  

    const rangeText = editor.document.getText(wholeLineRange);


    
    if (!rangeText) {  
        vscode.window.showWarningMessage('光标所在行没有文本');  
        return;  
    }
    
    await editor.edit((editBuilder) => {  
        editBuilder.replace(wholeLineRange, rangeText.toUpperCase());  
    });  

    vscode.window.showInformationMessage('文本已转换为大写');  
}