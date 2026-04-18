const MomentumMeter = (() => {
  let momentum = parseInt(localStorage.getItem("momentum_level")) || 0;
  const MAX = 10;

  return {
    reset() {
      momentum = 0;
      localStorage.removeItem("momentum_level");
    },
    increase() {
      if (momentum < MAX) momentum++;
      localStorage.setItem("momentum_level", momentum);
    },
    decrease() {
      if (momentum > 0) momentum--;
      localStorage.setItem("momentum_level", momentum);
    },
    get() {
      return momentum;
    },
    getMultiplier() {
      return 1 + momentum * 0.25;
    },
    isMaxed() {
      return momentum === MAX;
    },
  };
})();
