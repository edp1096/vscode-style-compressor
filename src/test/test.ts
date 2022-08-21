import Compressor from "../Compressor"
import * as fs from "fs"

let str = fs.readFileSync("src/test/test.css").toString()
str = new Compressor().compressText(str)

fs.writeFileSync("test.compress.css", str)
