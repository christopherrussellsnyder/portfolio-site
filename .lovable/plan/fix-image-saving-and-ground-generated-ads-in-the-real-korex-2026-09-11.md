# Fix image saving and ground generated ads in the real Korex interface

## What will change

1. **Save every generated image into Media automatically**
   - Keep uploading the finished PNG to the existing Media storage area.
   - Create the matching Media Library record with filename, URL, dimensions, size, prompt, and generated-image tags.
   - Treat a failed library record as a visible save error instead of claiming the image was saved.

2. **Add an authentic product-screen reference to Image Generation**
   - Add an optional “Product screen reference” image input in the Images section.
   - When a strategy brief describes Korex, users can supply an actual Korex screenshot rather than asking the model to invent an interface.
   - Send the screenshot as a true image reference to the image model and explicitly require its layout, branding, and visible interface to remain recognizable.
   - Use the supported reference-image generation path automatically when a reference is present; keep the current flagship path for scenes without one.

3. **Preserve the complete strategy brief**
   - Increase the concept limit so long strategy handoffs are not cut off.
   - Strengthen prompt construction so labeled instructions such as split-screen layout, headline, palette, emotion, and CTA are retained rather than compressed away.
   - Separate scene direction from caption context so the model prioritizes the actual visual instructions and does not attempt to place the entire caption inside the image.

## Technical details

- Update the image function to validate the reference image, use Gemini’s multimodal image request shape when one is supplied, and insert the successful result into `media_library`.
- Update Image Studio to accept and preview a screenshot reference, pass it securely for that generation request, and report media-save failures accurately.
- No database schema change is needed; this uses the existing media table and storage area.

## Verification

- Generate an image without a reference and confirm it appears immediately in Media.
- Generate the supplied split-screen concept with a real Korex screenshot reference and confirm the product screen follows that reference.
- Confirm the complete long-form brief reaches the function and that errors remain clear.
