# OpenCode Worker - Publishing & Disclosure Guide

This document outlines how to publish the OpenCode Worker project and communicate with OpenCode about your independent implementation.

## Publishing Checklist

### 1. Pre-Publication Checklist

Before publishing, ensure:

- [ ] Version bumped in `package.json`
- [ ] CHANGELOG.md updated
- [ ] All tests passing
- [ ] Build successful
- [ ] Documentation complete
- [ ] README updated
- [ ] LICENSE file present (ISC License)
- [ ] Security policy created (optional but recommended)

### 2. Version Management

```bash
# Check current version
npm version

# Bump version (choose one)
npm version patch  # 1.0.0 -> 1.0.1 (bug fixes)
npm version minor  # 1.0.0 -> 1.1.0 (new features)
npm version major # 1.0.0 -> 2.0.0 (breaking changes)

# This will:
# 1. Update package.json version
# 2. Create a git commit
# 3. Create a git tag
```

### 3. GitHub Release

```bash
# Create GitHub release
gh release create v1.0.0 \
  --title "OpenCode Worker v1.0.0" \
  --notes "Release notes from CHANGELOG.md" \
  dist/
```

### 4. npm Publishing (Optional)

If you want to publish to npm registry:

```bash
# Login to npm
npm login

# Publish
npm publish

# For scoped package
npm publish --access public
```

---

## Disclaimers and Disclosures

### Required Disclaimer

**Important**: You must include clear disclaimers that this is an independent project and not officially endorsed by OpenCode.

### 1. README.md Disclaimer

Add this to your README.md:

```markdown
---

## Disclaimer

**OpenCode Worker** is an independent implementation and is **not officially endorsed by**, **affiliated with**, or **sponsored by OpenCode or OpenCode-AI**.

This project was created by [DoozieSoft](https://github.com/DoozieSoftware) as an independent effort to provide remote job execution capabilities for the OpenCode plugin ecosystem.

### Relationship

- This is a **third-party implementation**
- It uses the **public OpenCode plugin SDK**
- It is **not maintained by OpenCode**
- **OpenCode trademarks** are used only to describe compatibility

### Trademark Usage

"OpenCode" is a trademark of OpenCode-AI, Inc. This project uses the name "OpenCode Worker" to indicate compatibility with the OpenCode ecosystem. This use of the trademark does not indicate sponsorship, endorsement, or affiliation with OpenCode-AI, Inc.

For official OpenCode products and services, please visit [opencode.ai](https://opencode.ai).

---
```

### 2. Package.json Disclaimer

Add to `package.json`:

```json
{
  "name": "opencode-worker",
  "description": "Independent remote execution worker for OpenCode plugin ecosystem",
  "license": "ISC",
  "disclaimer": "This is an independent project and is not officially endorsed by OpenCode or OpenCode-AI, Inc.",
  "repository": {
    "type": "git",
    "url": "https://github.com/DoozieSoftware/opencode_worker"
  },
  "author": {
    "name": "DoozieSoft",
    "url": "https://github.com/DoozieSoftware"
  }
}
```

### 3. Package Footer

Add to your npm package landing page:

```
DISCLAIMER: This package is an independent implementation and is not officially endorsed by, affiliated with, or sponsored by OpenCode or OpenCode-AI, Inc.
```

### 4. Docker Hub Description

If publishing Docker images:

```
DISCLAIMER: This Docker image is an independent implementation and is not officially endorsed by OpenCode or OpenCode-AI, Inc.
```

---

## Contacting OpenCode

### How to Inform OpenCode

#### Option 1: GitHub Discussion

1. Visit [OpenCode Discussions](https://github.com/orgs/opencode-ai/discussions)
2. Create a new discussion in "Show and Tell"
3. Share your project

**Template:**

```markdown
## OpenCode Worker - Independent Plugin Implementation

Hi OpenCode team! 👋

I'm excited to share an independent implementation I've created: **OpenCode Worker**!

### What is it?

A remote execution worker for the OpenCode plugin ecosystem that provides:
- Session isolation for job execution
- Resource governance (CPU, memory, timeout limits)
- WebSocket streaming for real-time output
- Configuration system with env vars, config files, CLI args
- Docker support for enhanced isolation

### Repository

🔗 https://github.com/DoozieSoftware/opencode_worker

### Key Features

- ✅ 9 plugin tools for job management
- ✅ Real-time WebSocket streaming
- ✅ Comprehensive configuration
- ✅ Security features (command allowlist, dangerous pattern detection)
- ✅ 41 tests passing

### Relationship

This is an **independent implementation** created by [DoozieSoft](https://github.com/DoozieSoftware).

I want to clarify:
- This is **not** officially endorsed by OpenCode
- It uses the **public OpenCode plugin SDK**
- It is **not maintained** by the OpenCode team
- I'm happy to collaborate if there's interest!

### Feedback

I'd love to hear your thoughts, feedback, or suggestions for improvement.

Thanks for building OpenCode! 🙏
```

#### Option 2: Email Contact

If OpenCode has a public contact email:

```subject: OpenCode Worker - Independent Plugin Implementation
```

**Email Template:**

```
Subject: OpenCode Worker - Independent Plugin Implementation

Hi OpenCode Team!

I wanted to share an independent implementation I've created for the OpenCode ecosystem.

**Project:** OpenCode Worker
**Repository:** https://github.com/DoozieSoftware/opencode_worker
**License:** ISC

This is a remote execution worker that provides:
- Isolated session management
- Resource governance
- Real-time output streaming via WebSocket
- Comprehensive configuration
- Docker support

This project is:
- ✅ Independent (not officially endorsed)
- ✅ Using public OpenCode plugin SDK
- ✅ Following OpenCode patterns
- ❌ Not maintained by OpenCode team

I'd love to share more or get your feedback!

Best regards,
[Your Name]
DoozieSoft
```

#### Option 3: Social Media

If OpenCode is active on:
- Twitter/X: Share a link with `#OpenCode` `#OpenSource`
- LinkedIn: Post about your project
- Discord: Share in their community server

**Sample Tweet:**

```
🚀 Just published "OpenCode Worker" - an independent remote execution worker for the @OpenCode ecosystem!

Features:
✅ Session isolation
✅ Resource governance
✅ WebSocket streaming
✅ Docker support

🔗 github.com/DoozieSoftware/opencode_worker

This is an independent implementation, not officially endorsed by OpenCode.

#OpenCode #OpenSource #TypeScript
```

---

## OpenCode Communication Best Practices

### Do:

✅ Be clear that it's independent  
✅ Use respectful language  
✅ Focus on value to the ecosystem  
✅ Offer collaboration if interested  
✅ Follow their community guidelines  
✅ Acknowledge their great work  

### Don't:

❌ Claim official endorsement  
❌ Use their logo without permission  
❌ Imply sponsorship  
❌ Be overly promotional  
❌ Spam their channels  
❌ Make demands  

---

## Press/Media Kit (If Applicable)

If someone writes about your project:

### Key Facts

| Field | Value |
|-------|-------|
| Project Name | OpenCode Worker |
| Organization | DoozieSoft |
| License | ISC |
| First Release | January 2026 |
| Repository | github.com/DoozieSoftware/opencode_worker |
| Status | Active development |

### About DoozieSoft

DoozieSoft is an independent software development team building tools for the open-source ecosystem. We believe in open collaboration and contributing back to the communities we depend on.

**Contact:** [GitHub Organization](https://github.com/DoozieSoftware)

### Boilerplate Description

> OpenCode Worker is an independent implementation of a remote execution runtime for the OpenCode plugin ecosystem. Created by DoozieSoft, it provides session isolation, resource governance, and real-time output streaming for job execution. The project is open source under the ISC License.

---

## Updating OpenCode About Your Project

### After Publishing

1. **Watch for feedback** - Monitor GitHub stars, forks, issues
2. **Respond to questions** - Be helpful and transparent
3. **Update regularly** - Keep the project active
4. **Credit OpenCode** - Always acknowledge the ecosystem

### If OpenCode Responds

- **Positive**: Thank them and continue good work
- **Neutral**: Respect their position, continue as independent
- **Requests changes**: Address concerns professionally
- **Requests removal**: Comply with trademark requests

---

## Checklist Summary

Before publishing:

- [ ] Version bumped
- [ ] CHANGELOG updated
- [ ] README has disclaimer
- [ ] package.json has disclaimer
- [ ] All tests passing
- [ ] Build successful
- [ ] Repository clean (no secrets, sensitive data)
- [ ] License file present
- [ ] Security policy (optional but recommended)

After publishing:

- [ ] Create GitHub release
- [ ] Share on social media
- [ ] Contact OpenCode (Discussion/Email/Social)
- [ ] Monitor for feedback
- [ ] Respond to issues
- [ ] Keep project active

---

## Template Files

### A. README Disclaimer Section

Copy this to your README.md:

```markdown
---

## Disclaimer

**OpenCode Worker** is an independent implementation created by [DoozieSoft](https://github.com/DoozieSoftware).

This project is **not officially endorsed by**, **affiliated with**, or **sponsored by OpenCode or OpenCode-AI, Inc.**

"OpenCode" is a trademark of OpenCode-AI, Inc. This project's use of the OpenCode name is solely to indicate compatibility with the OpenCode ecosystem and does not imply endorsement or affiliation.

For official OpenCode products, visit [opencode.ai](https://opencode.ai).
```

### B. CODE_OF_CONDUCT.md Addendum

Add to your CODE_OF_CONDUCT.md:

```markdown
---

## About This Project

This project is independently maintained by DoozieSoft and is not affiliated with OpenCode or OpenCode-AI, Inc.

For issues related to OpenCode itself, please visit [opencode.ai](https://opencode.ai).
```

---

## Final Notes

1. **Be transparent** - Always disclose the independent nature
2. **Be respectful** - Give credit where due
3. **Be professional** - Quality work speaks for itself
4. **Be responsive** - Engage with your community
5. **Be realistic** - Manage expectations about support

Good luck with your project! 🚀
