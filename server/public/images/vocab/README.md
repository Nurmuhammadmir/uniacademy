# Vocab word images

Photos uploaded by the director in the Homework builder land here automatically, named after the
word (lowercase, spaces → hyphens), e.g. `pregnant.png`, `market-stall.png`.

They are served by the server at `/static/images/vocab/<file>` and stored on the Concept's `image`
field as that path. No Cloudinary, no DB blob — the file lives in code, in this folder.
