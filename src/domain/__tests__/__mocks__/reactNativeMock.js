module.exports = {
  Platform: {
    OS: 'ios',
    select: (objs) => objs.ios || objs.default,
  },
  AppState: {
    currentState: 'active',
    addEventListener: () => ({ remove: () => {} }),
  },
};
