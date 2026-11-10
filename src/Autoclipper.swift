
import Cocoa
import WebKit
class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
 var window:NSWindow!;var web:WKWebView!;var task:Process?;var root:URL!;var port=18743
 func applicationDidFinishLaunching(_ n:Notification){
  let p=Process()
  let files=FileManager.default
  let resources=Bundle.main.resourceURL!
  let python=resources.appendingPathComponent("python/bin/python3")
  if files.isExecutableFile(atPath:python.path) {
   root=files.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0].appendingPathComponent("Autoclipper/Beta")
   try? files.createDirectory(at:root,withIntermediateDirectories:true)
   port=18744
   p.executableURL=python
   p.arguments=[resources.appendingPathComponent("templates/src/beta_bootstrap.py").path,resources.path,root.path]
   p.environment=ProcessInfo.processInfo.environment.merging(["AUTOCLIPPER_APP_PATH":Bundle.main.bundlePath]) { _, new in new }
  } else {
   root=Bundle.main.bundleURL.deletingLastPathComponent()
   p.executableURL=URL(fileURLWithPath:"/usr/bin/python3")
   p.arguments=[root.appendingPathComponent("src/server.py").path]
  }
  let log=root.appendingPathComponent("app.log");if !FileManager.default.fileExists(atPath:log.path){FileManager.default.createFile(atPath:log.path,contents:nil)}
  let handle=try? FileHandle(forWritingTo:log);handle?.seekToEndOfFile();p.standardOutput=handle;p.standardError=handle
  do{try p.run();task=p}catch{let a=NSAlert();a.messageText="Autoclipper konnte nicht starten";a.informativeText=error.localizedDescription;a.runModal()}
  let config=WKWebViewConfiguration();config.mediaTypesRequiringUserActionForPlayback=[];if #available(macOS 12.3, *){config.preferences.isElementFullscreenEnabled=true};web=WKWebView(frame:.zero,configuration:config);web.navigationDelegate=self
  window=NSWindow(contentRect:NSRect(x:0,y:0,width:940,height:860),styleMask:[.titled,.closable,.miniaturizable,.resizable],backing:.buffered,defer:false)
  window.title="Autoclipper · Status & Verwaltung";window.minSize=NSSize(width:650,height:650);window.contentView=web;window.center();window.makeKeyAndOrderFront(nil)
  NSApp.setActivationPolicy(.regular);NSApp.activate(ignoringOtherApps:true)
  let menu=NSMenu();let appItem=NSMenuItem();let sub=NSMenu();sub.addItem(withTitle:"Autoclipper beenden",action:#selector(NSApplication.terminate(_:)),keyEquivalent:"q");appItem.submenu=sub;menu.addItem(appItem)
  let editItem=NSMenuItem();let edit=NSMenu(title:"Bearbeiten");edit.addItem(withTitle:"Kopieren",action:Selector(("copy:")),keyEquivalent:"c");edit.addItem(withTitle:"Einfügen",action:Selector(("paste:")),keyEquivalent:"v");editItem.submenu=edit;menu.addItem(editItem);NSApp.mainMenu=menu
  load(attempt:0)
 }
 func load(attempt:Int){
  let url=URL(string:"http://127.0.0.1:\(port)/health")!
  URLSession.shared.dataTask(with:url){data,response,error in DispatchQueue.main.async{
   if let data=data,let text=String(data:data,encoding:.utf8),text.contains("Autoclipper"){self.web.load(URLRequest(url:URL(string:"http://127.0.0.1:\(self.port)/")!))}
   else if attempt<40{DispatchQueue.main.asyncAfter(deadline:.now()+0.25){self.load(attempt:attempt+1)}}
   else{self.web.loadHTMLString("<body style='background:#181820;color:white;font:18px system-ui;padding:40px'>Autoclipper konnte nicht starten. Details stehen in app.log im Auto-Clipper-Ordner.</body>",baseURL:nil)}
  }}.resume()
 }
 func webView(_ webView:WKWebView,decidePolicyFor navigationAction:WKNavigationAction,decisionHandler:@escaping(WKNavigationActionPolicy)->Void){
  guard let u=navigationAction.request.url else {decisionHandler(.cancel);return}
  if navigationAction.targetFrame?.isMainFrame == false {
   // Twitch's HTTPS player frames and their child frames may load independently.
   decisionHandler(u.scheme == "https" || u.scheme == "about" ? .allow : .cancel);return
  }
  if u.host == "127.0.0.1" || u.scheme == "about" {decisionHandler(.allow);return}
  decisionHandler(.cancel)

 }
 func application(_ application:NSApplication,open urls:[URL]){
  guard urls.contains(where:{($0.scheme=="autoclipper" || $0.scheme=="autoclipper-beta") && $0.host=="status"}) else{return}
  window?.deminiaturize(nil);window?.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true)
 }
 func applicationShouldHandleReopen(_ sender:NSApplication,hasVisibleWindows flag:Bool)->Bool{
  window?.deminiaturize(nil);window?.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true);return true
 }
 func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool{true}
 // Keep local service alive for unfinished downloads and Premiere. Reopening reuses it.
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
