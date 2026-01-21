# OpenCode Discussion Template

This document provides templates for discussing OpenCode Worker with the OpenCode community.

---

## Option 1: GitHub Discussion (Recommended)

**Post on:** https://github.com/orgs/opencode-ai/discussions/categories/show-and-tell

**Title:** OpenCode Worker - Independent Remote Execution Plugin

**Content:**

```markdown
Hi OpenCode team and community! 👋

I'm excited to share an independent implementation I've been working on: **OpenCode Worker**!

## What is it?

🔗 Repository: https://github.com/DoozieSoftware/opencode_worker

A remote execution worker for the OpenCode plugin ecosystem that provides:
- ✅ Session isolation for job execution
- ✅ Resource governance (CPU, memory, timeout limits)
- ✅ WebSocket streaming for real-time output
- ✅ Comprehensive configuration system
- ✅ Docker support for enhanced isolation
- ✅ 9 plugin tools for job management
- ✅ 41 tests passing

## Relationship to OpenCode

This is an **independent implementation** created by [DoozieSoft](https://github.com/DoozieSoftware).

Important clarifications:
- ❌ **Not officially endorsed** by OpenCode or OpenCode-AI, Inc.
- ✅ Uses the **public OpenCode plugin SDK**
- ❌ **Not maintained** by the OpenCode team
- ✅ Follows OpenCode patterns and conventions

## Key Features

### Session Management
- INIT → PREPARE → EXECUTE → COLLECT → DESTROY lifecycle
- Isolated filesystem and environment per session
- Automatic cleanup after completion

### Security
- Command allowlist (50+ safe commands)
- Dangerous pattern detection (rm -rf, pipe-to-shell, command substitution)
- Resource limits enforcement

### Real-time Streaming
- WebSocket-based output streaming
- Job status broadcasts
- Subscribe to specific job updates

### Configuration
- JSON config files (`opencode-worker.json`)
- Environment variables (`OPENCODE_WORKER_*`)
- CLI arguments (`--key=value`)
- Validation with error messages

## Quick Start

```bash
git clone https://github.com/DoozieSoftware/opencode_worker.git
cd opencode_worker
npm install
npm run build
npm test
```

## Why I Built This

I needed a remote execution solution that:
1. Provides strong session isolation
2. Supports real-time output streaming
3. Offers flexible configuration
4. Integrates with the OpenCode plugin system

The OpenCode plugin architecture made this possible!

## Feedback Welcome

I'd love to hear:
- Suggestions for improvement
- Feature requests
- Bug reports
- Contributions from the community

## Resources

- 📖 README: https://github.com/DoozieSoftware/opencode_worker#readme
- 🐛 Issues: https://github.com/DoozieSoftware/opencode_worker/issues
- 📝 Contributing: https://github.com/DoozieSoftware/opencode_worker/blob/main/CONTRIBUTING.md

Thanks for building OpenCode! 🙏 I'm excited to be part of this ecosystem.
```

---

## Option 2: Direct Issue (Alternative)

**Issue URL:** https://github.com/opencode-ai/opencode/issues/new/choose

**Title:** [SHOW AND TELL] OpenCode Worker - Independent Remote Execution Plugin

**Use the template above as the body.**

---

## Option 3: Email (If Available)

**Subject:** OpenCode Worker - Independent Plugin Implementation

**Body:**

```
Hi OpenCode Team!

I wanted to share an independent implementation I've created for the OpenCode ecosystem.

Project: OpenCode Worker
Repository: https://github.com/DoozieSoftware/opencode_worker
License: ISC

This is an independent project that:
- Uses the public OpenCode plugin SDK
- Provides remote execution capabilities
- Is NOT officially endorsed by OpenCode

I'd love to share more or get your feedback!

Best regards,
[Your Name]
DoozieSoft
```

---

## Option 4: Social Media

### Twitter/X Post

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

### LinkedIn Post

```
I'm excited to announce the release of OpenCode Worker! 🚀

An independent remote execution plugin for the OpenCode ecosystem that provides:

• Session isolation for secure job execution
• Resource governance (CPU, memory, timeout limits)
• Real-time WebSocket streaming
• Comprehensive configuration system
• Docker support for enhanced isolation

🔗 https://github.com/DoozieSoftware/opencode_worker

This is an independent implementation using the public OpenCode plugin SDK. It's not officially endorsed by OpenCode-AI, Inc., but built to extend the OpenCode ecosystem.

#OpenSource #TypeScript #PluginArchitecture #DevTools
```

---

## Discussion Do's and Don'ts

### ✅ Do

- Be clear about the independent nature
- Acknowledge the OpenCode team
- Focus on value to the ecosystem
- Be respectful and professional
- Offer collaboration if interested
- Follow community guidelines

### ❌ Don't

- Claim official endorsement
- Use OpenCode logo without permission
- Imply sponsorship
- Be overly promotional
- Spam multiple channels
- Make demands

---

## Follow-Up Responses

### If OpenCode Responds Positively

"Thank you so much for the kind words! I'm happy to contribute more to the ecosystem and would love to collaborate."

### If OpenCode Asks for Changes

"We appreciate the feedback and will address these concerns promptly."

### If No Response

That's okay! Continue maintaining the project independently and focus on providing value to users.

---

## Metrics to Track

After posting, monitor:

- [ ] Stars on GitHub
- [ ] Forks
- [ ] Issues opened
- [ ] Pull requests
- [ ] Discussion responses
- [ ] Website traffic (if you have analytics)

---

## Questions to Anticipate

**Q: Is this official?**
A: No, this is an independent implementation by DoozieSoft.

**Q: Will it continue to be maintained?**
A: Yes, we plan to maintain and improve it based on community feedback.

**Q: Can I contribute?**
A: Absolutely! See CONTRIBUTING.md for guidelines.

**Q: How is this different from built-in features?**
A: This provides additional capabilities like WebSocket streaming and Docker support that extend the core functionality.

**Q: Is it compatible with my existing setup?**
A: Yes, it uses the standard OpenCode plugin SDK and should work with any OpenCode installation.

---

## Final Notes

1. **Be patient** - OpenCode team may be busy
2. **Be responsive** - Monitor for comments and respond quickly
3. **Be professional** - Represent DoozieSoft well
4. **Be helpful** - Offer assistance to users who have questions
5. **Be grateful** - Thank everyone who shows interest

Good luck! 🚀
