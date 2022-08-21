import * as vscode from 'vscode'
import Compressor from './Compressor'

export class App {
	static editor: vscode.TextEditor | undefined

	static compress(): "" | undefined {
		this.editor = vscode.window.activeTextEditor
		if (!this.editor) { return "" }

		const selection = this.editor.selection

		let text = ""
		if (selection.isEmpty) {
			text = this.editor.document.getText()
		} else {
			text = this.editor.document.getText(selection)
		}

		text = new Compressor().compressText(text)

		if (!this.editor) { return }
		this.editor.edit((editBuilder) => {
			if (selection.isEmpty) {
				const lineBegin = this.editor!.document.lineAt(0)
				const lineEnd = this.editor!.document.lineAt(this.editor!.document.lineCount - 1)
				const selRange = new vscode.Range(lineBegin.range.start, lineEnd.range.end)

				editBuilder.replace(selRange, text)
			} else {
				editBuilder.replace(selection, text)
			}
		})
	}
}

export function activate(context: vscode.ExtensionContext): void {
	const compress = vscode.commands.registerCommand('style-compressor.compress', () => { App.compress() })
	context.subscriptions.push(compress)
}

export function deactivate(): void { }
