# 食物吃下去以后去哪儿？ / Where does food go after we eat?

A bilingual, topic-owned exploration for ages 4–6, with child and academic reading modes. Original SVG artwork follows one symbolic food cohort continuously from mouth to esophagus, stomach, small intestine and colon/rectum. A local intestinal section shows a constriction behind the contents; a separate magnified villus contains a continuous tissue core, epithelial cells, capillary loop and lacteal. ViewBox cameras retain both drawings and move continuously between observation scales. Progress survives view, nutrient comparison and reading-mode changes.

The liver, gallbladder and pancreas supply fluids through a separate duct network; the food route never enters them. Nutrient particles cross epithelial cells before the illustrated vessel route. Glucose and most dietary long-chain lipid products have distinct persistent routes. Comparing them changes emphasis rather than moving one particle sideways from blood to lymph. Lipid products are repackaged during passage through the enterocyte before entering the lacteal. Blue water particles are shown at both the villus and colon; visible notes explicitly state that most water is absorbed in the small intestine and the colon continues absorption of remaining water and electrolytes.

Manual play, pause, scrub and six stage buttons share one model. All loops are finite and user-initiated. Native controls support keyboard and touch; the screen reader receives phase updates rather than per-frame announcements. Hiding pauses playback; pagehide cancels remaining transitions and settles presentation targets. Reduced-motion settings resolve transitions immediately. There is no audio synthesis or autoplay.

`model.ts` owns bounded explanatory stage ordering, uptake/processing/transport sequence and constriction geometry; `scene.ts` owns anatomy and symbolic trajectories; `main.ts` owns controls and lifetime. `learning.json` contains three academic sections and four narration segments per language, with visual directions separated from speech. Catalog proposal files belong to this topic; the coordinator handles shared registration.

## Scientific boundaries

The overview, tube section and villus use different scales. Particle count and disappearance do not measure mass, composition, absorption efficiency or time. Sequential staging does not imply real organs stop while others work. The model omits swallowing detail, villus microvilli, exact transporter proteins and full motility. Food does not pass through accessory digestive organs. Bile is not an enzyme. The lipid comparison is restricted to most dietary long-chain products, not all fats. Stool contains microbes and shed cells as well as unabsorbed contents. The page is neither a medical diagnostic nor a dietary prescription.

## Sources reviewed 2026-09-17

- NIH / NIDDK, [Your Digestive System & How It Works](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works): anatomy, peristalsis, digestion, absorption, accessory organ roles.
- NIH / NIDDK, [Story of Discovery—Intestinal Stem Cells](https://www.niddk.nih.gov/news/archive/2017/story-discovery-intestinal-stem-cells): villi, enterocytes, epithelial organization. Institution-authored text verified through the indexed source; direct page fetch timed out in the research tool.
- Endotext, hosted by NCBI Bookshelf, [Intestinal Triglyceride and Cholesterol Metabolism](https://www.ncbi.nlm.nih.gov/books/NBK343489/figure/lipid_athero.F9/): lipid digestion products, intracellular rebuilding and chylomicron packaging, lacteal/lymph entry. This is an authored reference text, not an NIH primary experiment; no figure is copied.

Focused tests cover organ ordering, breakdown before uptake, epithelial passage before transport, glucose/long-chain-lipid route differences, bounded/reversible input and a constriction behind the contents. Root owns final global build, 390px production-browser acceptance and local checkpoint commit. No push or deployment is performed by this topic task.
