# Visual Assets & Licensing

The site-wide visual system currently references a small set of Wikimedia Commons images as remote development assets. They replace emoji-heavy decoration with editorial photography while the project does not yet have a managed Media Library UI.

## Current assets

### Open Qur'an

- Purpose: Quran/review/games/Tafsir hero backgrounds.
- File: `Opened Qur'an.jpg`
- Creator: Flickr user `el7bara`.
- Source page: https://commons.wikimedia.org/wiki/File:Opened_Qur%27an.jpg
- License: Creative Commons Attribution 2.0 Generic (CC BY 2.0).
- License URL: https://creativecommons.org/licenses/by/2.0/
- Changes in UI: cropped responsively and displayed behind a color overlay; source file itself is not modified in the repository.

### Children learning Qur'an together

- Purpose: homepage, family, child and teacher learning-oriented hero surfaces.
- File: `Sundanese Muslim children reading the Al-Qur'an together at a mosque in Purwakarta, West Java, Indonesia.jpg`
- Creator: Historian128.
- Source: own work on Wikimedia Commons.
- Source page: https://commons.wikimedia.org/wiki/File:Sundanese_Muslim_children_reading_the_Al-Qur%27an_together_at_a_mosque_in_Purwakarta,_West_Java,_Indonesia.jpg
- License: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0).
- License URL: https://creativecommons.org/licenses/by-sa/4.0/
- Changes in UI: cropped responsively and displayed behind gradients/overlays.

### Mosque-Madrassa of Sultan Hassan exterior

- Purpose: optional Islamic architectural background surface and future editorial sections.
- File: `Mosque-Madrassa of Sultan Hassan - Exterior.jpg`
- Creator: Ahmedalbadawy.
- Source: own work on Wikimedia Commons.
- Source page: https://commons.wikimedia.org/wiki/File:Mosque-Madrassa_of_Sultan_Hassan_-_Exterior.jpg
- License: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0).
- License URL: https://creativecommons.org/licenses/by-sa/4.0/
- Changes in UI: responsive crop/overlay only.

## Production media policy

Remote URLs are acceptable as an interim development asset source, but production should migrate approved assets to managed storage (or a future WordPress Media Library) and retain:

- source page URL;
- creator/credit;
- license name and license URL;
- alt text;
- title/caption;
- original dimensions and MIME type;
- whether the image was cropped, color-adjusted or otherwise transformed.

The `cms_media` compatibility table contains fields for all of these values so the media can be imported later into WordPress attachments without losing attribution.

## UI policy

- Prefer consistent SVG icons for actions, navigation and status.
- Use photography/illustration only where it adds meaning: hero banners, editorial cards and major content areas.
- Do not use emoji as a primary navigation icon or decorative system.
- Do not depict prophets or use imagery that implies a physical depiction of God.
- Religious content images must not alter or generate Quran text.
