const DEFAULT_SECRET = 'veravote_development_insecure_secret_change_me';

module.exports = {
  get jwtSecret() {
    return process.env.JWT_SECRET || process.env.VITE_JWT_SECRET || DEFAULT_SECRET;
  },
};