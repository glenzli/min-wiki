# Buoyancy specimen surface assets

Retrieved and checked: 2026-10-22.

## Photographed timber

- Source asset: [Wood Table 001, Poly Haven](https://polyhaven.com/a/wood_table_001).
- Photography: Dimitrios Savva. Processing: Rico Cilliers, as credited on the asset page.
- Asset license: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), confirmed by [Poly Haven's asset license](https://polyhaven.com/license).
- Metadata: [the public file manifest](https://api.polyhaven.com/files/wood_table_001).
- Only the downloadable texture maps were used. Poly Haven's example renders, thumbnails, logos and website graphics are not bundled.
- These photographs supply decorative wood structure. The depicted sample is not a calibrated material scan, a claim about a particular wood species, or a source of the experiment's density or mass.

| Local file | Source map and exact original download URL | Original SHA-256 |
| --- | --- | --- |
| `wood-table-001-color.webp` | [Diffuse, 1K JPEG](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_table_001/wood_table_001_diff_1k.jpg) | `460dd08d240f4a1f02982415048c3c5c200f385db212da18dc7e2df68bf4d0be` |
| `wood-table-001-height.webp` | [Displacement, 1K JPEG](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_table_001/wood_table_001_disp_1k.jpg) | `c89e5e29620cb784fcef4081baf224f014940c4a0cd7daf025d0e9255f52c9f0` |
| `wood-table-001-roughness.webp` | [Roughness, 1K JPEG](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_table_001/wood_table_001_rough_1k.jpg) | `a2ca9ae89dfe7b8e2e5e92f0aa43467845417de8a50205b5852ef0d57c7624f9` |

Preparation used Sharp 0.35.4. The original maps are 1024 × 1024. The diffuse map retains that resolution and its photographed grain. To adapt the original dark stained surface to a warm illustrative timber sample, its sRGB luminance `Y = .2126 R + .7152 G + .0722 B` (channels normalized to 0–1) is remapped with `t = Y^.48`, then `RGB = (.40 + .65t, .245 + .55t, .11 + .43t)`, clamped to 0–1. It is encoded as WebP at quality 84, effort 6, with source metadata removed. The displacement and roughness maps are resized to 512 × 512 using Lanczos3, converted to grayscale and encoded as WebP at quality 90, effort 6.

| Prepared asset | Dimensions | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `wood-table-001-color.webp` | 1024 × 1024 | 101070 | `334b77053a5cf5b5e1229cbfc12efa8aca5e695b0487fbe6bc47e5d2ae7255ec` |
| `wood-table-001-height.webp` | 512 × 512 | 61600 | `cdc075475a81e77627c3c558e6656d4d08cb7343e3415f697c2bdf0549e12811` |
| `wood-table-001-roughness.webp` | 512 × 512 | 54586 | `f8720eb63cc64f122084023c6d2708662a1c4f6fff3d63d408284bd97f58531b` |

The runtime treats colour as sRGB and height/roughness as data. Its continuous object-local radial projection aligns long fibres along the sample's X axis and gives corresponding rings on the cut ends, without separate face decals. The photographed tabletop's gloss is deliberately remapped to a matte sample finish; the height map only changes shading, never silhouette, mass, displaced volume or force readings. The existing procedural timber remains the complete fallback until all three local images load. Leaving the scene disposes all returned texture/material resources and prevents late image callbacks from changing the material. There are no runtime requests to Poly Haven or other external services.

## Experimental reference

[Arbor Scientific, “6 Experiments for Fluid Dynamics”, Figure 9](https://www.arborsci.com/blogs/cool/6-experiments-fluid-dynamics) is a visual reference for an ordinary wood specimen meeting a clear water surface. Its image is not a bundled asset, and no reproduction license is claimed. The visual reference does not change Mini Wiki's existing scientific model or measurements.
