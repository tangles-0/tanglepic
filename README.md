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

## AWS Infrastructure and Deploy

- CDK app: `infra/cdk`
- Dev deploy:
  - `pnpm infra:cdk:install`
  - `aws sts get-caller-identity` (or set `AWS_PROFILE=latex-admin`)
  - `pnpm infra:cdk:bootstrap:dev`
  - `pnpm infra:cdk:deploy:all:dev` (first-time/full infra)
  - `pnpm infra:image:push:dev` (build and push app image tag)
  - `pnpm infra:cdk:deploy:dev` (app/runtime update only)
  - `pnpm infra:db:push:dev` (run schema push in one-off ECS task)
- Prod deploy:
  - `pnpm infra:cdk:bootstrap:prod`
  - `pnpm infra:cdk:deploy:all:prod` (first-time/full infra)
  - `pnpm infra:image:push:prod` (build and push app image tag)
  - `pnpm infra:cdk:deploy:prod` (app/runtime update only)
  - `pnpm infra:db:push:prod`

## Ops Docs

- Runtime env contract: `docs/runtime-environment.md`
- Source-host migration runbook: `docs/migration-source-host-runbook.md`
- Production cutover checklist: `docs/cutover-checklist.md`
- Local dev after AWS rollout: `docs/local-development-after-aws.md`
- Security review checklist: `docs/security-review-checklist.md`
- GitHub Actions CD/CD: `docs/cicd-github-actions.md`

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
- [x] add github link
- [x] add download button
- [x] ability to rotate images
- [x] ability to edit album display order - drag n drop 'up' / 'down' btns
- [x] ability to rename albums (just click on the title and start typing)
- [x] ability to caption images in an album (caption applies to the image in the context of the image-in-that-album, not to the image, as images can be in more than one album)
- [x] add landon's [ditherspace](https://landonjsmith.com/projects/ditherspace.html) to this app
- [x] keyboard shortcuts for img view
- [ ] alternative 'tiles' layout for 'guest' album view, button to switch between that and current fullwidth layout, and a slider to adjust tile size

### TODO LATERER:

- [ ] TUI
- [ ] support video formats
- [ ] support any file format
