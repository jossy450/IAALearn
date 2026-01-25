# Security Policy

## Supported Versions

We release security updates for the following versions of IAALearn:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by email to:

**Email: jossy450@gmail.com**

### What to Include

Please include the following information in your report:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: We aim to respond to security reports within 48 hours
- **Status Updates**: We will keep you informed about the progress of fixing the vulnerability
- **Fix Timeline**: We aim to release security fixes within 7-14 days, depending on severity
- **Disclosure**: We follow responsible disclosure practices and will coordinate with you on public disclosure

### Security Best Practices

When using IAALearn:

1. **Never commit sensitive data**: API keys, credentials, or personal information
2. **Use environment variables**: Store configuration in `.env` files (not committed to Git)
3. **Keep dependencies updated**: Regularly run `npm audit` and update packages
4. **Use HTTPS**: Always use secure connections in production
5. **Validate inputs**: Sanitize and validate all user inputs
6. **Follow authentication best practices**: Use strong passwords and secure session management

### Security Features

This project includes:

- JWT token-based authentication
- Bcrypt password hashing
- SQL injection protection via parameterized queries
- XSS protection with Helmet.js
- CSRF protection
- Rate limiting on API endpoints
- Input validation and sanitization

## Acknowledgments

We appreciate the security research community's efforts in keeping this project secure. Security researchers who responsibly disclose vulnerabilities will be acknowledged in our release notes (with their permission).

Thank you for helping keep IAALearn and its users safe!
