const fs = require("fs");
const path = require("path");

// Simple base64 encoded 1x1 blue PNG that we can use as a template
const bluePngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==";

// Create a simple colored square PNG for each size
function createSimpleIcon(size) {
  // This is a minimal PNG header for a solid blue square
  // In a real implementation, you'd use a proper image library like sharp or canvas
  // For now, we'll create a simple placeholder

  const canvas = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#2563eb" rx="${size * 0.125}"/>
    <g fill="white" transform="translate(${size / 2}, ${size / 2})">
      <path d="M-${size * 0.1},-${size * 0.15} L-${size * 0.1},${
    size * 0.15
  } M-${size * 0.12},-${size * 0.15} L-${size * 0.12},-${size * 0.05} M-${
    size * 0.08
  },-${size * 0.15} L-${size * 0.08},-${
    size * 0.05
  }" stroke="white" stroke-width="${size * 0.01}" fill="none"/>
      <path d="M${size * 0.1},-${size * 0.15} L${size * 0.1},${size * 0.15} M${
    size * 0.08
  },-${size * 0.15} L${size * 0.12},-${
    size * 0.08
  }" stroke="white" stroke-width="${size * 0.01}" fill="none"/>
    </g>
  </svg>`;

  return canvas;
}

// Generate icons for different sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, "../public/icons");

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach((size) => {
  const svgContent = createSimpleIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);

  fs.writeFileSync(filepath, svgContent);
  console.log(`Created ${filename}`);
});

console.log("Icon generation complete!");
