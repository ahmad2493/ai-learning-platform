const validateEmail = (email) => {
  if (!email) {
    return 'Email is required.';
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email address.';
  }
  return null; // No error
};

module.exports = { validateEmail };
