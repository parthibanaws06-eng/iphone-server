/**
 * Cloudinary AI Transformations & iOS Photographic Styles Service
 */

export interface TransformPreset {
  id: string;
  name: string;
  category: 'ai' | 'style';
  code: string;
  icon: string;
  badge?: string;
  description: string;
}

export const TRANSFORM_PRESETS: TransformPreset[] = [
  {
    id: 'original',
    name: 'Original',
    category: 'ai',
    code: '',
    icon: 'refresh-outline',
    description: 'Original cloud photo without edits',
  },
  {
    id: 'bg_remove',
    name: 'Remove BG',
    category: 'ai',
    code: 'e_background_removal',
    icon: 'person-outline',
    badge: 'AI',
    description: 'One-tap AI background isolation and transparency',
  },
  {
    id: 'face_zoom',
    name: 'Face Zoom',
    category: 'ai',
    code: 'c_thumb,g_face,w_1000,h_1000,z_0.8',
    icon: 'scan-outline',
    badge: 'AI',
    description: 'Smart AI face detection and centered portrait crop',
  },
  {
    id: 'gen_fill_sq',
    name: 'Gen Fill 1:1',
    category: 'ai',
    code: 'b_gen_fill,c_pad,ar_1:1',
    icon: 'expand-outline',
    badge: 'GEN',
    description: 'Generative AI expands image borders to square aspect',
  },
  {
    id: 'gen_fill_pt',
    name: 'Gen Fill 4:5',
    category: 'ai',
    code: 'b_gen_fill,c_pad,ar_4:5',
    icon: 'phone-portrait-outline',
    badge: 'GEN',
    description: 'Generative AI fills vertical margins for social feeds',
  },
  {
    id: 'gen_enhance',
    name: 'AI Restore',
    category: 'ai',
    code: 'e_gen_restore',
    icon: 'sparkles-outline',
    badge: 'AI',
    description: 'Generative AI clarity restoration and noise reduction',
  },
  // iOS Curated Photographic Styles
  {
    id: 'vivid',
    name: 'Vivid',
    category: 'style',
    code: 'e_vibrance:40,e_saturation:25',
    icon: 'color-palette-outline',
    description: 'Apple Vivid style with vibrant color pop',
  },
  {
    id: 'vivid_warm',
    name: 'Vivid Warm',
    category: 'style',
    code: 'e_vibrance:30,e_tint:equalize:sepia:20',
    icon: 'sunny-outline',
    description: 'Warm golden tones with enhanced vibrance',
  },
  {
    id: 'vivid_cool',
    name: 'Vivid Cool',
    category: 'style',
    code: 'e_vibrance:30,e_tint:equalize:blue:15',
    icon: 'snow-outline',
    description: 'Clean Scandinavian cool with saturated blues',
  },
  {
    id: 'dramatic',
    name: 'Dramatic',
    category: 'style',
    code: 'e_contrast:40,e_saturation:10',
    icon: 'contrast-outline',
    description: 'High contrast mood with deepened shadows',
  },
  {
    id: 'dramatic_warm',
    name: 'Dramatic Warm',
    category: 'style',
    code: 'e_contrast:35,e_tint:equalize:sepia:25',
    icon: 'flame-outline',
    description: 'Cinematic amber highlights with dark contrast',
  },
  {
    id: 'dramatic_mono',
    name: 'Dramatic Mono',
    category: 'style',
    code: 'e_grayscale,e_contrast:35',
    icon: 'moon-outline',
    description: 'Apple Dramatic Mono with sharp monochrome contrast',
  },
  {
    id: 'silvertone',
    name: 'Silvertone',
    category: 'style',
    code: 'e_grayscale,e_contrast:20,e_brightness:10',
    icon: 'film-outline',
    description: 'Classic silver gelatin fine-art photo print',
  },
  {
    id: 'noir',
    name: 'Noir',
    category: 'style',
    code: 'e_blackwhite:50,e_contrast:50',
    icon: 'aperture-outline',
    description: 'Film noir with pitch-black shadows and bright whites',
  },
];

export const CloudinaryTransformsService = {
  /**
   * Builds an on-the-fly Cloudinary transformed URL.
   */
  getTransformedUrl(uri: string, transformCode: string): string {
    if (!uri || !transformCode || !uri.includes('cloudinary.com')) {
      return uri;
    }

    // If already has transformation right after /upload/, replace it or insert
    if (uri.includes('/image/upload/')) {
      return uri.replace('/image/upload/', `/image/upload/${transformCode}/`);
    }

    if (uri.includes('/video/upload/')) {
      return uri.replace('/video/upload/', `/video/upload/${transformCode}/`);
    }

    return uri;
  },

  /**
   * Generates a mini thumbnail URL for previewing a specific preset.
   */
  getPresetPreviewUrl(uri: string, transformCode: string): string {
    if (!uri || !uri.includes('cloudinary.com')) {
      return uri;
    }
    const thumbSpec = 'w_160,h_160,c_fill,q_auto,f_auto';
    const combined = transformCode ? `${transformCode},${thumbSpec}` : thumbSpec;
    if (uri.includes('/image/upload/')) {
      return uri.replace('/image/upload/', `/image/upload/${combined}/`);
    }
    return uri;
  },
};
