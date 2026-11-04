import Foundation
if CommandLine.arguments.count != 2 { exit(2) }
do {
 let url=URL(fileURLWithPath:CommandLine.arguments[1])
 try FileManager.default.trashItem(at:url,resultingItemURL:nil)
} catch { fputs("Datei konnte nicht in den Papierkorb verschoben werden.\n",stderr); exit(1) }
