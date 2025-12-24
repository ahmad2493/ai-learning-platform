exports.validateEmail = (email) => {
  if (!email) return 'Email is required.';

  email = email.trim();

  // Length limits (RFC 5321 / 5322)
  if (email.length > 254) {
    return 'Email is too long.';
  }

  // No whitespace
  if (/\s/.test(email)) {
    return 'Email cannot contain spaces.';
  }

  // Exactly one @
  const atCount = (email.match(/@/g) || []).length;
  if (atCount !== 1) {
    return "Email must contain exactly one '@' symbol.";
  }

  const [local, domain] = email.split('@');

  if (!local || !domain) {
    return 'Invalid email format.';
  }

  // ================= LOCAL PART =================
  if (local.length > 64) {
    return 'Email local part is too long.';
  }

  if (local.startsWith('.') || local.endsWith('.')) {
    return 'Local part cannot start or end with a dot.';
  }

  if (local.includes('..')) {
    return 'Local part cannot contain consecutive dots.';
  }

  if (!/^[A-Za-z0-9._+-]+$/.test(local)) {
    return "Local part contains invalid characters.";
  }

  // ================= DOMAIN PART =================
  if (domain.length > 255) {
    return 'Domain name is too long.';
  }

  if (domain.startsWith('.') || domain.endsWith('.')) {
    return 'Domain cannot start or end with a dot.';
  }

  if (domain.includes('..')) {
    return 'Domain cannot contain consecutive dots.';
  }

  const domainLabels = domain.split('.');

  if (domainLabels.length < 2) {
    return 'Domain must contain a valid TLD.';
  }

  for (const label of domainLabels) {
    if (!label) return 'Invalid domain format.';

    if (label.length > 63) {
      return 'Domain label is too long.';
    }

    if (!/^[A-Za-z0-9-]+$/.test(label)) {
      return 'Domain labels can only contain letters, numbers, and hyphens.';
    }

    if (label.startsWith('-') || label.endsWith('-')) {
      return 'Domain labels cannot start or end with a hyphen.';
    }
  }

  // ================= TLD RULES =================
  const tld = domainLabels[domainLabels.length - 1];

  if (!/^[A-Za-z]{2,24}$/.test(tld)) {
    return 'Invalid top-level domain.';
  }

  // ================= COMMON USER ERRORS =================
  if (local.toLowerCase() === 'admin' || local.toLowerCase() === 'root') {
    return 'Reserved email address is not allowed.';
  }

  // ================= SECURITY =================
  if (/[<>()[\]\\,;:"]/g.test(email)) {
    return 'Email contains unsafe characters.';
  }

  return null; // ✅ VALID EMAIL
};
