import Foundation
import CoreGraphics
import ImageIO

// Restore rounded transparency lost when Quick Look renders the SVG on white.
let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let opaque = CommandLine.arguments[3] == "ios"
let source = CGImageSourceCreateImageAtIndex(CGImageSourceCreateWithURL(input as CFURL, nil)!, 0, nil)!
let alpha: CGImageAlphaInfo = opaque ? .noneSkipLast : .premultipliedLast
let context = CGContext(data: nil, width: 1024, height: 1024,
    bitsPerComponent: 8, bytesPerRow: 4096, space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: alpha.rawValue)!
let bounds = CGRect(x: 0, y: 0, width: 1024, height: 1024)
if opaque {
    context.setFillColor(CGColor(red: 16/255, green: 41/255, blue: 27/255, alpha: 1))
    context.fill(bounds)
} else {
    context.clear(bounds)
}
// Trim the two-pixel white antialias fringe left by the opaque SVG preview.
context.addPath(CGPath(roundedRect: bounds.insetBy(dx: 2, dy: 2), cornerWidth: 228, cornerHeight: 228, transform: nil))
context.clip()
context.draw(source, in: bounds)
if !opaque {
    let pixels = context.data!.assumingMemoryBound(to: UInt8.self)
    for (x, y) in [(0, 0), (1023, 0), (0, 1023), (1023, 1023)] {
        precondition(pixels[y * 4096 + x * 4 + 3] == 0, "Icon corners must be transparent")
    }
}
let destination = CGImageDestinationCreateWithURL(output as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(destination, context.makeImage()!, nil)
precondition(CGImageDestinationFinalize(destination))
