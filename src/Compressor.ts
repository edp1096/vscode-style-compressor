class CacheMd {
	text = ""
	start = 0
	newTextLen = 0
}

export default class Compressor {
	tabCount = 0
	endl = "\r\n"
	scssKeys = ["@import", "@mixin", "@function", "@extend", "@include", "@return"]
	atIdForSigleLine = ["@media", "supports", "@document", "@page", /*"@font-face",*/ "@keyframes", "@viewport", "@counter-style", "@font-feature-values"]
	atIdForMultiLine = ["@font-face"]

	mapInnerKey = {
		"@extend": null,
		"@include": null,
	}
	scssKeyMaxLen = 0

	constructor() {
		for (var i = 0; i < this.scssKeys.length; ++i) {
			this.scssKeyMaxLen = Math.max(this.scssKeyMaxLen, this.scssKeys[i].length)
		}
	}

	findNoUseKey(text: string) {
		var key = "@_vs_tag_"
		var rst = key
		var idx = 0
		do {
			rst = key + idx + "_"
			if (text.indexOf(rst) < 0) {
				return rst
			}
			++idx
		} while (true)
	}

	uncacheText(text: string, stackCache: CacheMd[]) {
		if (stackCache.length <= 0) { return }
		var md = stackCache.pop()
	}

	getTab(lvl: number) {
		var rst = ""
		var tab = "\t"
		if (this.tabCount > 0) {
			tab = ""
			for (var i = 0; i < this.tabCount; ++i) { tab += " " }
		}
		for (var i = 0; i < lvl; ++i) { rst += tab }
		return rst
	}

	lastChar(text: string) {
		if (text.length < 0) { return "" }
		return text.charAt(text.length - 1)
	}

	isHead(text: string) {
		return (text.length <= 0 || this.lastChar(text) == "\n")
	}

	compressText(text: string) {
		if (text.indexOf("\r\n") >= 0) {
			this.endl = "\r\n"
		} else if (text.indexOf("\n") >= 0) {
			this.endl = "\n"
		}

		text = text.replace(/\r\n/g, "\n")
		text = text.replace(/\n+/g, "\n")

		if (text.indexOf("\t") >= 0) {
			this.tabCount = 0
		} else if (/(^|\n)[ ]{2}[^ ]/.test(text)) {
			this.tabCount = 2
		} else if (/(^|\n)[ ]{4}[^ ]/.test(text)) {
			this.tabCount = 4
		}
		var mat1 = null
		if (this.tabCount == 0) {
			mat1 = text.match(/(?:^|\n)([\t]*)[^\s]/)
		} else {
			mat1 = text.match(/(?:^|\n)([ ]*)[^\s]/)
		}
		var baseLvl = 0
		if (mat1) {
			var str = mat1[1]
			if (this.tabCount == 0) {
				baseLvl = str.length
			} else {
				baseLvl = Math.floor(str.length / this.tabCount)
			}
		}

		var key = this.findNoUseKey(text)

		var keyEndl = key + "\n"
		var keySpace = key + " "

		var endl = "\n"

		let rst = ""
		var esc = false
		var markStart = ""
		var com1Start = false
		var com2Start = false
		var lvl = baseLvl
		var strTab = this.getTab(lvl)
		var lastCh = ""
		var isAddEndlAuto = false
		var isAttrVal = false
		// var isImport = false
		var isRtn = false
		var isFunc = false
		var isScssKey = false
		var isInnerKey = false

		var isAtIdSigleLine = false
		var isAtIdMultiLine = false

		for (var i = 0; i < text.length; ++i) {
			var ch = text.charAt(i)
			if (esc) {
				if (this.isHead(rst)) {
					rst += strTab
				}
				rst += ch
				esc = false

				continue
			}
			if (markStart) {
				if (this.isHead(rst)) { rst += strTab }
				rst += ch
				if (ch == markStart) { markStart = "" }

				continue
			}
			if (com1Start) {
				if (this.isHead(rst)) { rst += strTab }
				rst += ch
				if (ch == "\n") { com1Start = false }

				continue
			}
			if (com2Start) {
				rst += ch
				if (ch == "*" && text.charAt(i + 1) == "/") {
					rst += "/"
					com2Start = false
					++i
					if (text.charAt(i + 1) == "\n") {
						rst += endl
						isAddEndlAuto = true
					}
				}

				continue
			}
			switch (ch) {
				case "{":
					isAttrVal = false

					rst = rst.replace(new RegExp(keyEndl, "ig"), endl)
					if (isScssKey) {
						rst = rst.replace(new RegExp(keySpace, "ig"), " ")
					} else {
						rst = rst.replace(new RegExp(keySpace, "ig"), "")
					}

					if (isAtIdSigleLine || isScssKey) {
						rst += ch + endl
						isAtIdSigleLine = false
					} else {
						if (isAtIdMultiLine) {
							rst += ch + endl
						} else {
							rst += ch
						}
					}

					isScssKey = false
					isInnerKey = false
					isRtn = false

					// pre line is attr line, end with ';'
					// start in new line
					var mat = rst.match(/; [^{\n;]+\{$/i)
					if (mat) {
						rst = rst.substr(0, rst.length - mat[0].length + 1)
						rst += endl + endl + strTab + mat[0].substring(2)
					}
					if (lastCh != "\n") {
						if (isFunc) {
							rst += endl
						} else {
							rst += keyEndl
						}
						isAddEndlAuto = true
					}
					strTab = this.getTab(++lvl)

					break
				case "}":
					isAttrVal = false
					// isImport = false
					isScssKey = false
					isInnerKey = false
					isRtn = false
					isFunc = false
					rst = rst.replace(new RegExp(keySpace, "ig"), " ")
					// isBody = false
					var hasChild = (rst.indexOf(keyEndl) < 0)
					if (!hasChild) { rst = rst.replace(new RegExp(keyEndl + strTab, "ig"), " ") }

					strTab = this.getTab(--lvl)
					if (lvl < 0) { lvl = 0 }
					if (hasChild) { rst += strTab }
					if (this.lastChar(rst) == ";") { rst += " " }

					if (isAtIdMultiLine) {
						rst += endl + keySpace + ch + endl
						isAtIdMultiLine = false
					} else {
						if (this.lastChar(rst) == "\n" || this.lastChar(rst) == "}") {
							rst += ch + endl
						} else {
							rst += ch + endl
						}
						// rst += endl
					}

					isAddEndlAuto = true

					break
				case "\n":
					// pre line is end with '}'
					// // remove empty line
					// if (!isAddEndlAuto && this.isHead(rst) && !/\}\n$/i.test(rst)) {
					// 	// rst += endl
					// } else {
					// 	// if (lvl == baseLvl && this.lastChar(rst) != "\n") { rst += endl }
					// }

					isAddEndlAuto = false

					break
				case '"':
				case "'":
					rst += ch
					markStart = ch

					break
				case "/":
					var isHeadTmp = this.isHead(rst)
					if (isHeadTmp) { rst += strTab }
					if (text.charAt(i - 1) != ":" && text.charAt(i + 1) == "/") {
						// note start with "//"
						if (this.lastChar(rst) == ";") { rst += keySpace }
						rst += "//"
						com1Start = true
						++i
					} else if (text.charAt(i + 1) == "*") {
						// note start with "/*"
						var idx2 = text.indexOf("*/", i + 2)
						var isMulti = false

						if (idx2 > 0) {
							isMulti = (text.substring(i, idx2).indexOf("\n") >= 2)
						}

						if (isMulti && !isHeadTmp) { rst += endl + strTab }
						if (rst.length <= 0 || (text.charAt(i - 2) == "/" && text.charAt(i - 1) == "\n")) {
							rst += "/*"
						} else {
							if (isAttrVal) {
								rst += "/*"
							} else {
								rst += "\n/*"
							}
						}

						com2Start = true
						++i
					} else {
						rst += ch
					}

					break
				case "\t": {
					if (isAttrVal || isScssKey || isRtn) {
						if (this.lastChar(rst) == " ") { break }
						if (isRtn) {
							rst += " "
						} else {
							rst += keySpace
						}

						continue
					}
					break
				}
				case " ": {
					const lastChar = this.lastChar(rst)
					if (lastChar == " " || lastChar == ":") { break }

					rst += ch

					break
				}
				case ";":
					isAttrVal = false
					rst = rst.replace(new RegExp(keySpace, "ig"), " ")
					rst += ch
					if (isAtIdMultiLine) {
						if (text.charAt(i + 1) != "\n" && text.charAt(i + 2) != "}") { rst += endl }
					}
					if (isScssKey && !isInnerKey) {
						rst += endl
						isAddEndlAuto = true
						// isImport = false
					}

					// keep in new line, if attr is variable and it is in new line
					if (/\$[^$:;]+:[^$:;]+;$/.test(rst)) {
						for (var j = i + 1; j < text.length; ++j) {
							var ch2 = text.charAt(j)
							if (ch2 == "\t" || ch2 == " ") { continue }
							if (ch2 == "\n") {
								rst += endl
								isAddEndlAuto = true

								break
							}

							break
						}
					}

					isScssKey = false
					isInnerKey = false
					isRtn = false

					break
				case ":":
					isAttrVal = true
					if (text.charAt(i + 1) == "/" && text.charAt(i + 2) == "/") {
						rst += ch
					} else {
						rst += ch + keySpace
					}

					break
				case ",":
					if (isAtIdMultiLine) {
						rst += ch + "\n"
					} else {
						rst += ch + keySpace
					}
					// rst += ch + keySpace

					break
				default:
					if (ch == "@") {
						for (var j = 0; j < this.scssKeys.length; ++j) {
							var len = this.scssKeys[j].length
							if (text.substring(i, i + len) == this.scssKeys[j]) {
								isScssKey = true
								isAttrVal = true
								if (this.scssKeys[j] == "@return") {
									isRtn = true
								} else if (this.scssKeys[j] == "@function") {
									isFunc = true
								}
								if (this.scssKeys[j] in this.mapInnerKey) { isInnerKey = true }

								break
							}
						}
						// if(text.substr(i, 7) == "@import") {	isImport = true }

						for (let j = 0; j < this.atIdForSigleLine.length; j++) {
							const len = this.atIdForSigleLine[j].length
							if (text.substring(i, i + len) == this.atIdForSigleLine[j]) {
								isAtIdSigleLine = true
								break
							}
						}

						for (let j = 0; j < this.atIdForMultiLine.length; j++) {
							const len = this.atIdForMultiLine[j].length
							if (text.substring(i, i + len) == this.atIdForMultiLine[j]) {
								isAtIdMultiLine = true
								// rst += endl
								break
							}
						}
					}

					// console.info(ch, this.isHead(rst), rst)
					if (this.isHead(rst)) { rst += strTab }
					if (this.lastChar(rst) == ";") { rst += " " }

					rst += ch

					break
			}

			lastCh = ch
		}

		rst = rst.replace(new RegExp(keyEndl, "ig"), "")
		rst = rst.replace(new RegExp(keySpace, "ig"), "")
		// rst = rst.replace(/( )+/g, " ")
		rst = rst.replace(/\{\n/g, "{")
		if (lastCh != "\n") { rst = rst.replace(/( )+}\n$/i, "}") }
		if (endl != this.endl) { rst = rst.replace(/\n/i, this.endl) }
		// if(!this.isHead(rst)) {
		// 	rst += endl
		// }

		return rst
	}
}