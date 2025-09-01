// backend/Utills/CustomPricing.js
const GEM_TYPES = {
  diamond: 5000,
  sapphire: 3200,
  ruby: 3800,
  emerald: 3500,
  amethyst: 1200,
  topaz: 950,
};
const SHAPES = {
  round: 0,
  princess: 300,
  cushion: 250,
  oval: 200,
  pear: 350,
  emerald: 400,
};
function gradePrice(grade) {
  switch (grade) {
    case 'premium': return 1500;
    case 'excellent': return 800;
    case 'very-good': return 400;
    case 'good': return 0;
    default: return 0;
  }
}
function polishPrice(polish) {
  switch (polish) {
    case 'excellent': return 300;
    case 'very-good': return 150;
    case 'good': return 0;
    default: return 0;
  }
}
function symmetryPrice(symmetry) {
  switch (symmetry) {
    case 'excellent': return 250;
    case 'very-good': return 100;
    case 'good': return 0;
    default: return 0;
  }
}
function weightExtra(weight) {
  if (weight == null) return 0;
  return weight > 1 ? Math.round((weight - 1) * 1000) : 0;
}
function computePricing({ type, shape, weight, grade, polish, symmetry }) {
  const basePrice = GEM_TYPES[type] ?? 0;
  const shapeP = SHAPES[shape] ?? 0;
  const weightP = weightExtra(Number(weight));
  const gradeP = gradePrice(grade);
  const polishP = polishPrice(polish);
  const symmetryP = symmetryPrice(symmetry);
  const subtotal = basePrice + shapeP + weightP + gradeP + polishP + symmetryP;
  return {
    basePrice, shapePrice: shapeP, weightPrice: weightP,
    gradePrice: gradeP, polishPrice: polishP, symmetryPrice: symmetryP,
    subtotal,
  };
}
function plus3Days() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d;
}
module.exports = { computePricing, plus3Days };
