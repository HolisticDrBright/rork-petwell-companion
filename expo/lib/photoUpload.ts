import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Platform } from "react-native";

/** Re-encode locally to remove photo metadata and handle formats such as HEIC. */
export async function photoJpeg(uri: string): Promise<ArrayBuffer> {
  const context = ImageManipulator.manipulate(uri);
  const original = await context.renderAsync();
  const maxEdge = 1600;
  const needsResize = Math.max(original.width, original.height) > maxEdge;
  if (needsResize) {
    context.resize(original.width >= original.height ? { width: maxEdge } : { height: maxEdge });
  }
  const image = needsResize ? await context.renderAsync() : original;
  const jpeg = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  if (Platform.OS !== "web") return new File(jpeg.uri).arrayBuffer();
  const response = await fetch(jpeg.uri);
  if (!response.ok) throw new Error("Could not read the photo.");
  return response.arrayBuffer();
}
