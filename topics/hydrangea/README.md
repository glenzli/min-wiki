# 绣球花为什么有不同颜色？ / Why do hydrangeas have different colors?

Independent bilingual botanical topic. Light Canvas macro portrait, detailed asymmetric sepals and veined leaves, a sepal-cell/vacuole view, soil pH and aluminum-supply controls, pigmented/white cultivar comparison and a 14-second new-bloom cycle. The colored structures are labeled sepals. All animation starts from user action.

## Scientific and interaction contract

The model concerns blue-capable colored Hydrangea macrophylla cultivars and related mechanisms in some H. serrata. Soil acidity affects aluminum availability; it does not directly paint flowers. Aluminum uptake and transport, anthocyanin, copigments and the vacuolar environment influence blue complex formation. Soil pH is not vacuolar pH. A white control lacks the pigment needed in this pathway. Other species/cultivars and age-related sepal changes are not predicted here.

Crucially, sliders configure the **next bloom**. The current flower retains a snapshot of its growing conditions until the user starts a new cycle. This avoids claiming that an already open flower instantly follows a soil-pH slider. Actual horticultural changes can take a future bloom cycle or longer. A logistic availability curve and interpolated color are qualitative teaching functions, not cultivar calibration or soil amendment advice. Uptake, phosphate, temperature and aging are not modeled individually. Molecular symbols are not chemical structures.

Naturalism comes from asymmetric sepals, overlapping florets, varied flower size and orientation, branched veins, soft shadows and botanical foliage. No photo or generated raster assets are used; the topic owns its vector cover and Canvas artwork.

## Sources / 依据

- UGA Cooperative Extension, *Growing Bigleaf Hydrangea*, Circular 973. https://secure.caes.uga.edu/extension/publications/files/pdf/C%20973_3.PDF — soil acidity, aluminum availability, color variation and delayed horticultural response.
- Ito et al. (2019), *Direct mapping of hydrangea blue-complex in sepal tissues of Hydrangea macrophylla*. https://pmc.ncbi.nlm.nih.gov/articles/PMC6443790/ — anthocyanin/aluminum/copigment complex in colored sepal tissue.
- Negishi et al. (2012), *Tonoplast- and Plasma Membrane-Localized Aquaporin-Family Transporters in Blue Hydrangea Sepals of Aluminum Hyperaccumulating Plant*. https://pmc.ncbi.nlm.nih.gov/articles/PMC3430636/ — cell/vacuolar transport and aluminum accumulation.
- UGA Extension (2024), *What’s That Plant: Hydrangeas*. https://site.extension.uga.edu/lincoln/whats-that-plant-hydrangeas-adding-beauty-to-your-landscape/ — cultivar and white-flower limits.

## Validation

`node --import tsx --test topics/hydrangea/tests/model.test.mjs`

Focused model tests passed (5/5 for this topic, including the absence of a false blue intermediate in aluminum-free pink blooms); scoped strict TypeScript and local English coverage/interpolation checks passed. Live desktop browser checks passed in Chinese and English at 1280 px: canvas rendering and labels, primary interactions, advanced explanations and no horizontal overflow; browser warning/error log was empty. Hydrangea current-bloom isolation and the acidic/aluminum-rich white control were verified. Root integration owns registration, bilingual platform metadata, packaged build and mobile checks. No commit, push or deployment is part of this topic work.
