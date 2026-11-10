import AVFoundation
import Vision
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data(message.utf8))
    exit(1)
}
guard args.count >= 6, let start = Double(args[3]), let end = Double(args[4]), end > start else {
    fail("Invalid camera range.")
}
let asset = AVURLAsset(url: URL(fileURLWithPath: args[2]))
let time: (Double) -> CMTime = { CMTime(seconds: $0, preferredTimescale: 60000) }
guard let source = asset.tracks(withMediaType: .video).first else { fail("No video track.") }

do {
    if args[1] == "inspect" {
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.maximumSize = CGSize(width: 640, height: 640)
        generator.requestedTimeToleranceBefore = time(0.3)
        generator.requestedTimeToleranceAfter = time(0.3)
        var samples: [[String: Any]] = []
        for fraction in [0.12, 0.30, 0.50, 0.70, 0.88] {
            guard let image = try? generator.copyCGImage(at: time(start + (end - start) * fraction), actualTime: nil) else { continue }
            let w = image.width, h = image.height
            guard let gray = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8,
                                       bytesPerRow: w, space: CGColorSpaceCreateDeviceGray(),
                                       bitmapInfo: CGImageAlphaInfo.none.rawValue) else { continue }
            gray.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
            let request = VNDetectFaceRectanglesRequest()
            try VNImageRequestHandler(cgImage: image).perform([request])
            let faces = (request.results ?? []).map { observation -> [Double] in
                let b = observation.boundingBox
                return [b.minX, 1 - b.maxY, b.width, b.height]
            }
            let pixels = Data(bytes: gray.data!, count: w * h).base64EncodedString()
            if samples.isEmpty {
                let preview = URL(fileURLWithPath: args[5])
                let output = CGImageDestinationCreateWithURL(preview as CFURL, UTType.jpeg.identifier as CFString, 1, nil)!
                CGImageDestinationAddImage(output, image, nil)
                guard CGImageDestinationFinalize(output) else { fail("Could not write camera preview.") }
            }
            samples.append(["width": w, "height": h, "pixels": pixels, "faces": faces])
        }
        guard !samples.isEmpty else { fail("Could not read camera frames.") }
        print(String(data: try JSONSerialization.data(withJSONObject: samples), encoding: .utf8)!)
    } else {
        guard args.count == 10, let x = Double(args[5]), let y = Double(args[6]),
              let w = Double(args[7]), let h = Double(args[8]) else { fail("Invalid camera crop.") }
        let bounds = CGRect(origin: .zero, size: source.naturalSize).applying(source.preferredTransform)
        let width = abs(bounds.width), height = abs(bounds.height)
        let crop = CGRect(x: x * width, y: y * height, width: w * width, height: h * height)
        let scale = min(1, 540 / crop.width)
        let render = CGSize(width: max(2, floor(crop.width * scale / 2) * 2),
                            height: max(2, floor(crop.height * scale / 2) * 2))
        let composition = AVMutableComposition()
        guard let video = composition.addMutableTrack(withMediaType: .video,
                 preferredTrackID: kCMPersistentTrackID_Invalid) else { fail("Could not create camera track.") }
        let duration = CMTimeMinimum(time(end), asset.duration) - time(start)
        let range = CMTimeRange(start: .zero, duration: duration)
        try video.insertTimeRange(CMTimeRange(start: time(start), duration: duration), of: source, at: .zero)
        let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: video)
        let transform = source.preferredTransform
            .concatenating(CGAffineTransform(translationX: -bounds.minX - crop.minX, y: -bounds.minY - crop.minY))
            .concatenating(CGAffineTransform(scaleX: render.width / crop.width, y: render.height / crop.height))
        layer.setTransform(transform, at: .zero)
        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = range
        instruction.layerInstructions = [layer]
        let layout = AVMutableVideoComposition()
        layout.renderSize = render
        layout.frameDuration = CMTime(value: 1, timescale: 30)
        layout.instructions = [instruction]
        guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
            fail("Could not create camera exporter.")
        }
        exporter.outputURL = URL(fileURLWithPath: args[9])
        exporter.outputFileType = .mp4
        exporter.videoComposition = layout
        let complete = DispatchSemaphore(value: 0)
        exporter.exportAsynchronously { complete.signal() }
        complete.wait()
        guard exporter.status == .completed else { fail(exporter.error?.localizedDescription ?? "Camera export failed.") }
    }
} catch { fail(error.localizedDescription) }
