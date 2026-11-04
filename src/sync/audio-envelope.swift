import Foundation
import AVFoundation
import AudioToolbox
if CommandLine.arguments.count != 5 { exit(2) }
let asset=AVURLAsset(url:URL(fileURLWithPath:CommandLine.arguments[1]))
let start=Double(CommandLine.arguments[2]) ?? 0, end=Double(CommandLine.arguments[3]) ?? 90
let destination=URL(fileURLWithPath:CommandLine.arguments[4])
do {
 guard let track=asset.tracks(withMediaType:.audio).first else { throw NSError(domain:"NoAudio",code:1) }
 let reader=try AVAssetReader(asset:asset)
 let output=AVAssetReaderTrackOutput(track:track,outputSettings:[AVFormatIDKey:kAudioFormatLinearPCM,AVSampleRateKey:4000,AVNumberOfChannelsKey:1,AVLinearPCMBitDepthKey:32,AVLinearPCMIsFloatKey:true,AVLinearPCMIsNonInterleaved:false,AVLinearPCMIsBigEndianKey:false])
 output.alwaysCopiesSampleData=false;reader.add(output)
 reader.timeRange=CMTimeRange(start:CMTime(seconds:start,preferredTimescale:48000),duration:CMTime(seconds:max(0,end-start),preferredTimescale:48000))
 guard reader.startReading() else { throw reader.error ?? NSError(domain:"Read",code:2) }
 var bands=[[Double](),[Double](),[Double]()], energies=[0.0,0.0,0.0], count=0
 var low=0.0,mid=0.0
 let alphaLow=1-exp(-2*Double.pi*250/4000),alphaMid=1-exp(-2*Double.pi*1000/4000)
 while let sample=output.copyNextSampleBuffer(){
  guard let block=CMSampleBufferGetDataBuffer(sample) else {continue}
  var size=0;var pointer:UnsafeMutablePointer<Int8>?
  guard CMBlockBufferGetDataPointer(block,atOffset:0,lengthAtOffsetOut:nil,totalLengthOut:&size,dataPointerOut:&pointer)==kCMBlockBufferNoErr,let ptr=pointer else {continue}
  ptr.withMemoryRebound(to:Float.self,capacity:size/4){samples in
   for i in 0..<(size/4){let x=Double(samples[i]);low += alphaLow*(x-low);mid += alphaMid*(x-mid);let v=[low,mid-low,x-mid]
    for b in 0..<3{energies[b] += v[b]*v[b]};count += 1
    if count==80{for b in 0..<3{bands[b].append(log(max(1e-12,energies[b]/80)));energies[b]=0};count=0}
   }
  }
 }
 guard reader.status == .completed, bands[0].count>=500 else { throw reader.error ?? NSError(domain:"TooShort",code:3) }
 try JSONSerialization.data(withJSONObject:["rate":50,"bands":bands]).write(to:destination,options:.atomic)
} catch { fputs("Audioanalyse fehlgeschlagen: \(error)\n",stderr);exit(1) }
