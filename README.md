# LATEX

### cloud app for self-hosting and sharing images

_Also for videos and other files (later)_

---

### Storage backends supported:

- Local disk (default)
  - .env: `STORAGE_BACKEND=local`
  - Files stored under `data/uploads/...`
- Amazon S3
  - .env: `STORAGE_BACKEND=s3`
  - .env: `S3_BUCKET=your-bucket`
  - .env: `S3_REGION=us-east-1`
  - Optional: `S3_ENDPOINT=https://s3.your-provider.com` for S3-compatible storage

## Installation

### Docker

`docker compose up -d`

## Features

- user accounts & user groups
- per group limits
- albums
- sharing hashed links to images and albums with all metadata stripped
- rad themes
- donation banner

## TODO:

- [x] give album view the same controls / layout as gallery view
- [x] next / prev buttons when viewing image in modal on a gallery / album
- [x] support .gifs
- [ ] add github link
- [ ] add download button
- [ ] ability to rotate images
- [ ] ability to edit album display order - drag n drop 'up' / 'down' btns
- [ ] ability to rename albums (just click on the title and start typing)
- [ ] ability to caption images in an album (caption applies to the image in the context of the image-in-that-album, not to the image, as images can be in more than one album)
- [ ] alternative 'tiles' layout for 'guest' album view, button to switch between that and current fullwidth layout, and a slider to adjust tile size

### TODO LATERER:

- [ ] add [landon's ditherspace](https://landonjsmith.com/projects/ditherspace.html)
- [ ] keyboard shortcuts
- [ ] TUI
- [ ] support video formats
- [ ] support any file format
