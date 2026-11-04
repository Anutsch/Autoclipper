import Foundation
import AVFoundation
import ImageIO
import UniformTypeIdentifiers
if CommandLine.arguments.count != 3 { exit(2) }
let asset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: 192, height: 108)
do {
 let image = try generator.copyCGImage(at: CMTime(seconds: 1, preferredTimescale: 600), actualTime: nil)
 guard let output = CGImageDestinationCreateWithURL(URL(fileURLWithPath: CommandLine.arguments[2]) as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else { exit(3) }
 CGImageDestinationAddImage(output, image, [kCGImageDestinationLossyCompressionQuality:0.72] as CFDictionary)
 if !CGImageDestinationFinalize(output) { exit(4) }
} catch { exit(5) }
