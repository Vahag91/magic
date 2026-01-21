import { Platform, Image } from 'react-native';
import ImageResizer from 'react-native-image-resizer';
import * as utils from '../../utils';

// Default options for ImageResizer
const RESIZE_OPTIONS = {
  format: 'JPEG',
  quality: 90,
  rotation: 0,
};

// Function to normalize image orientation
export const normalizeImageOrientation = async ({ uri, mime }) => {
  if (Platform.OS !== 'ios' || !uri || !mime.startsWith('image/')) {
    return null;
  }

  try {
    const path = utils.stripFileScheme(uri);
    const size = await new Promise((resolve, reject) => {
      Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
    });

    const result = await ImageResizer.createResizedImage(
      path,
      size.width,
      size.height,
      RESIZE_OPTIONS.format,
      RESIZE_OPTIONS.quality,
      RESIZE_OPTIONS.rotation,
      undefined,
      false, // keepMeta
    );

    return result ? { ...result, type: 'image/jpeg' } : null;
  } catch (e) {
    console.error('Failed to normalize image orientation:', e);
    return null;
  }
};
