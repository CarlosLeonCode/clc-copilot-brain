# Release Notes: v[X.Y.Z] - [Release Theme]

> **Release Date:** YYYY-MM-DD  
> **Target Audience:** All Users & Developers  
> **Git Tag:** `vX.Y.Z`

---

## Highlights & What's New
Brief summary of the primary value delivered in this release. Focus on customer outcomes rather than internal refactorings.

### Feature 1: [Feature Title]
- Detailed explanation of feature capabilities.
- Screenshot or ASCII terminal preview.
- How to enable or configure.

---

## Improvements & Bug Fixes
- **CLI**: Fixed schema path resolution when running in nested subdirectories.
- **Adapters**: Enhanced Windows fallback support for `.cursorrules` symlinks.
- **Performance**: Reduced cold-start audit time by 45%.

---

## Upgrade Guide & Breaking Changes
Steps required to safely upgrade from previous version:
```bash
npm install -g @clc/copilot-brain@latest
copilot-brain doctor
```
